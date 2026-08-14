import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";
import type {
  CollectLogInput,
  JournalBatch,
  JournalDatabase,
  MetricInput,
  TransactionInput,
} from "./db";
import { normalizeTransaction } from "./normalize";
import type {
  RawBalances,
  RawTransaction,
  SigInfo,
  SignatureOptions,
  Source,
  SourceHealth,
  SourceId,
  VenueMetricSource,
} from "./sources/types";

const SIGNATURE_FILE = /^[1-9A-HJ-NP-Za-km-z]{32,128}$/;

export interface AddressCollectResult {
  address: string;
  signatures: number;
  transactions: number;
  snapshots: number;
  metrics: number;
  cursor: string | null;
  ms: number;
}

export interface CollectFailure {
  source: string;
  key: string;
  error: string;
}

export interface CollectSummary {
  addresses: AddressCollectResult[];
  venueMetrics: number;
  failures: CollectFailure[];
}

export interface CollectorOptions {
  database: JournalDatabase;
  source: Source;
  dataDir: string;
  venueSources?: VenueMetricSource[];
  concurrency?: number;
  now?: () => number;
  monotonicNow?: () => number;
  beforeCommit?: (address: string, batch: JournalBatch) => void | Promise<void>;
}

interface PreparedTransactions {
  rows: TransactionInput[];
  newestCursor: string | null;
  oldestCursor: string | null;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function mapConcurrent<T, U>(
  values: T[],
  concurrency: number,
  operation: (value: T, index: number) => Promise<U>,
): Promise<U[]> {
  const output = new Array<U>(values.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (index < values.length) {
      const selected = index;
      index += 1;
      output[selected] = await operation(values[selected] as T, selected);
    }
  });
  await Promise.all(workers);
  return output;
}

function addMetric(target: Map<string, MetricInput>, metric: MetricInput, sum = false): void {
  const identity = `${metric.series}\u0000${metric.key}\u0000${metric.ts}`;
  const existing = target.get(identity);
  target.set(identity, existing === undefined || !sum
    ? metric
    : { ...metric, value: existing.value + metric.value });
}

export class SourceChain implements Source {
  readonly id: SourceId;

  constructor(readonly sources: Source[]) {
    if (sources.length === 0) throw new Error("source chain must not be empty");
    this.id = sources[0]?.id as SourceId;
  }

  async *signatures(
    address: string,
    cursor: string | null,
    options?: SignatureOptions,
  ): AsyncIterable<SigInfo> {
    const errors: string[] = [];
    for (const source of this.sources) {
      try {
        const rows: SigInfo[] = [];
        for await (const row of source.signatures(address, cursor, options)) rows.push(row);
        for (const row of rows) yield row;
        return;
      } catch (error) {
        errors.push(`${source.id}: ${errorText(error)}`);
      }
    }
    throw new Error(`all signature sources failed (${errors.join("; ")})`);
  }

  async transaction(signature: string): Promise<RawTransaction | null> {
    const errors: string[] = [];
    for (const source of this.sources) {
      try {
        const row = await source.transaction(signature);
        if (row !== null) return row;
      } catch (error) {
        errors.push(`${source.id}: ${errorText(error)}`);
      }
    }
    if (errors.length === this.sources.length) {
      throw new Error(`all transaction sources failed (${errors.join("; ")})`);
    }
    return null;
  }

  async balances(address: string): Promise<RawBalances | null> {
    const errors: string[] = [];
    for (const source of this.sources) {
      try {
        const row = await source.balances(address);
        if (row !== null) return row;
      } catch (error) {
        errors.push(`${source.id}: ${errorText(error)}`);
      }
    }
    if (errors.length === this.sources.length) {
      throw new Error(`all balance sources failed (${errors.join("; ")})`);
    }
    return null;
  }

  async health(): Promise<SourceHealth> {
    const health = await Promise.all(this.sources.map((source) => source.health()));
    const available = health.find((entry) => entry.ok);
    return available ?? health[0] as SourceHealth;
  }
}

export class Collector {
  private readonly database: JournalDatabase;
  private readonly source: Source;
  private readonly dataDir: string;
  private readonly venueSources: VenueMetricSource[];
  private readonly concurrency: number;
  private readonly now: () => number;
  private readonly monotonicNow: () => number;
  private readonly beforeCommit?: CollectorOptions["beforeCommit"];

  constructor(options: CollectorOptions) {
    this.database = options.database;
    this.source = options.source;
    this.dataDir = resolve(options.dataDir);
    this.venueSources = options.venueSources ?? [];
    this.concurrency = options.concurrency ?? 4;
    if (!Number.isSafeInteger(this.concurrency) || this.concurrency < 1 || this.concurrency > 4) {
      throw new Error("collector concurrency must be an integer from 1 through 4");
    }
    this.now = options.now ?? (() => Math.floor(Date.now() / 1_000));
    this.monotonicNow = options.monotonicNow ?? (() => performance.now());
    this.beforeCommit = options.beforeCommit;
  }

  private cacheRaw(signature: string, raw: RawTransaction): string {
    if (!SIGNATURE_FILE.test(signature)) throw new Error(`unsafe signature cache key: ${signature}`);
    const directory = resolve(this.dataDir, "cache", "txs");
    mkdirSync(directory, { recursive: true });
    const target = resolve(directory, `${signature}.json`);
    if (existsSync(target)) {
      JSON.parse(readFileSync(target, "utf8"));
      return relative(this.dataDir, target);
    }

    const temporary = resolve(directory, `.${signature}.${randomUUID()}.tmp`);
    try {
      writeFileSync(temporary, `${JSON.stringify(raw)}\n`, { flag: "wx" });
      renameSync(temporary, target);
    } catch (error) {
      if (existsSync(temporary)) unlinkSync(temporary);
      throw error;
    }
    return relative(this.dataDir, target);
  }

  private async signatures(
    address: string,
    cursor: string | null,
    options: SignatureOptions,
  ): Promise<SigInfo[]> {
    const rows: SigInfo[] = [];
    for await (const row of this.source.signatures(address, cursor, options)) rows.push(row);
    return rows;
  }

  private async prepareTransactions(
    address: string,
    signatures: SigInfo[],
  ): Promise<PreparedTransactions> {
    const rows = await mapConcurrent(signatures, this.concurrency, async (signature) => {
      const raw = await this.source.transaction(signature.signature);
      if (raw === null) throw new Error(`missing public transaction ${signature.signature}`);
      const rawPath = this.cacheRaw(signature.signature, raw);
      return normalizeTransaction(raw, { signature, address, rawPath });
    });
    return {
      rows,
      newestCursor: signatures[0]?.signature ?? null,
      oldestCursor: signatures.at(-1)?.signature ?? null,
    };
  }

  private transactionMetrics(address: string, rows: TransactionInput[]): MetricInput[] {
    const metrics = new Map<string, MetricInput>();
    const rateBuckets = new Set<number>();
    for (const row of rows) {
      addMetric(metrics, {
        ts: row.ts,
        series: "fees.paid",
        key: address,
        value: row.feeLamports ?? 0,
      }, true);
      addMetric(metrics, {
        ts: row.ts,
        series: "priority_fees.paid",
        key: address,
        value: row.priorityFeeLamports ?? 0,
      }, true);
      addMetric(metrics, {
        ts: row.ts,
        series: "tips.paid",
        key: address,
        value: row.jitoTipLamports ?? 0,
      }, true);
      if (row.kind !== "vote") rateBuckets.add(Math.floor(row.ts / 3_600) * 3_600);
    }

    for (const bucket of rateBuckets) {
      const existing = this.database
        .queryTransactions(address, bucket, bucket + 3_599)
        .filter((row) => row.kind !== "vote");
      const known = new Set(existing.map((row) => row.signature));
      const additions = rows.filter((row) => (
        row.kind !== "vote"
        && row.ts >= bucket
        && row.ts <= bucket + 3_599
        && !known.has(row.signature)
      ));
      addMetric(metrics, {
        ts: bucket,
        series: "tx.rate",
        key: address,
        value: existing.length + additions.length,
      });
    }
    return [...metrics.values()];
  }

  private async commitAddress(
    address: string,
    signatures: SigInfo[],
    prepared: PreparedTransactions,
    balance: RawBalances | null,
    cursorSource: string,
    cursor: string | null,
    started: number,
  ): Promise<AddressCollectResult> {
    const ts = this.now();
    const metrics = new Map<string, MetricInput>();
    for (const metric of this.transactionMetrics(address, prepared.rows)) addMetric(metrics, metric);
    const snapshots = balance === null ? [] : [{
      ts,
      address,
      solLamports: balance.solLamports,
      tokenBalances: balance.tokenBalances,
      source: this.source.id,
    }];
    if (balance !== null) {
      addMetric(metrics, {
        ts,
        series: "balance.sol",
        key: address,
        value: balance.solLamports / 1_000_000_000,
      });
    }
    const elapsed = Math.max(0, Math.round(this.monotonicNow() - started));
    const log: CollectLogInput = {
      ts,
      source: this.source.id,
      key: address,
      ok: true,
      items: prepared.rows.length,
      ms: elapsed,
      note: prepared.rows.length === 0 ? "no new signatures" : null,
    };
    const batch: JournalBatch = {
      snapshots,
      transactions: prepared.rows,
      metrics: [...metrics.values()],
      cursors: cursor === null ? [] : [{
        source: cursorSource,
        key: address,
        position: cursor,
        updatedAt: ts,
      }],
      logs: [log],
    };
    await this.beforeCommit?.(address, batch);
    this.database.writeBatch(batch);
    return {
      address,
      signatures: signatures.length,
      transactions: prepared.rows.length,
      snapshots: snapshots.length,
      metrics: batch.metrics?.length ?? 0,
      cursor,
      ms: elapsed,
    };
  }

  async collectAddress(address: string): Promise<AddressCollectResult> {
    const started = this.monotonicNow();
    const cursor = this.database.getCursor(this.source.id, address)?.position ?? null;
    const [signatures, balance] = await Promise.all([
      this.signatures(address, cursor, { mode: "new", limit: 1_000 }),
      this.source.balances(address),
    ]);
    const prepared = await this.prepareTransactions(address, signatures);
    return this.commitAddress(
      address,
      signatures,
      prepared,
      balance,
      this.source.id,
      prepared.newestCursor,
      started,
    );
  }

  async backfill(address: string, limit: number): Promise<AddressCollectResult> {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("backfill limit must be positive");
    const started = this.monotonicNow();
    const cursorSource = `${this.source.id}:backfill`;
    const cursor = this.database.getCursor(cursorSource, address)?.position ?? null;
    const signatures = await this.signatures(address, cursor, { mode: "backfill", limit });
    const prepared = await this.prepareTransactions(address, signatures);
    return this.commitAddress(
      address,
      signatures,
      prepared,
      null,
      cursorSource,
      prepared.oldestCursor,
      started,
    );
  }

  async collectOnce(): Promise<CollectSummary> {
    const summary: CollectSummary = { addresses: [], venueMetrics: 0, failures: [] };
    for (const address of this.database.listAddresses(true)) {
      try {
        summary.addresses.push(await this.collectAddress(address.address));
      } catch (error) {
        const message = errorText(error);
        summary.failures.push({ source: this.source.id, key: address.address, error: message });
        this.database.appendCollectLog({
          ts: this.now(),
          source: this.source.id,
          key: address.address,
          ok: false,
          items: 0,
          ms: 0,
          note: message,
        });
      }
    }

    for (const venue of this.venueSources) {
      const started = this.monotonicNow();
      try {
        const metrics = await venue.metrics();
        this.database.writeBatch({
          metrics,
          logs: [{
            ts: this.now(),
            source: venue.id,
            key: "global",
            ok: true,
            items: metrics.length,
            ms: Math.max(0, Math.round(this.monotonicNow() - started)),
          }],
        });
        summary.venueMetrics += metrics.length;
      } catch (error) {
        const message = errorText(error);
        summary.failures.push({ source: venue.id, key: "global", error: message });
        this.database.appendCollectLog({
          ts: this.now(),
          source: venue.id,
          key: "global",
          ok: false,
          items: 0,
          ms: Math.max(0, Math.round(this.monotonicNow() - started)),
          note: message,
        });
      }
    }
    return summary;
  }
}

export interface CollectorLock {
  release(): void;
}

export function acquireCollectorLock(path: string): CollectorLock {
  mkdirSync(resolve(path, ".."), { recursive: true });
  let descriptor: number;
  try {
    descriptor = openSync(path, "wx");
  } catch (error) {
    throw new Error(`another journal collector may be running (${path}): ${errorText(error)}`);
  }
  writeFileSync(descriptor, `${process.pid}\n`);
  closeSync(descriptor);
  let released = false;
  return {
    release(): void {
      if (released) return;
      released = true;
      if (existsSync(path)) unlinkSync(path);
    },
  };
}

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolveDelay) => {
    if (signal.aborted) return resolveDelay();
    const timer = setTimeout(resolveDelay, milliseconds);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolveDelay();
    }, { once: true });
  });
}

export async function watchCollector(
  collector: Collector,
  intervalMs: number,
  signal: AbortSignal,
  random: () => number = Math.random,
): Promise<CollectSummary[]> {
  const summaries: CollectSummary[] = [];
  while (!signal.aborted) {
    summaries.push(await collector.collectOnce());
    if (signal.aborted) break;
    const jitter = Math.round(intervalMs * 0.1 * ((random() * 2) - 1));
    await delay(Math.max(1_000, intervalMs + jitter), signal);
  }
  return summaries;
}
