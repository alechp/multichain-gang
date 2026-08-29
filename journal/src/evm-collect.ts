import type {
  EvmBalanceInput,
  EvmBlockInput,
  EvmJournalBatch,
  EvmLogInput,
  EvmObservationInput,
  EvmTransactionInput,
  JournalDatabase,
} from "./db";
import { decimalString, safeEvmInteger, type EvmBlock, type EvmSource } from "./evm-types";

const NETWORK = "robinhood_chain" as const;

export interface EvmCollectResult {
  network: typeof NETWORK;
  fromBlock: string | null;
  toBlock: string | null;
  blocks: number;
  transactions: number;
  logs: number;
  balances: number;
  observations: number;
  rewoundFrom: string | null;
  providerHeads: Record<string, string | null>;
  ms: number;
}

export interface EvmCollectorOptions {
  database: JournalDatabase;
  source: EvmSource;
  comparisonSources?: EvmSource[];
  maxBlocksPerCycle?: number;
  maxRewindBlocks?: number;
  now?: () => number;
  monotonicNow?: () => number;
  beforeCommit?: (block: bigint, batch: EvmJournalBatch) => void | Promise<void>;
}

interface ProviderHealthSummary {
  observations: EvmObservationInput[];
  heads: Record<string, bigint | null>;
  highest: bigint;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sourceKey(source: EvmSource, index: number): string {
  return `${source.id}:${index}:${providerLabel(source.endpoint)}`;
}

function providerLabel(endpoint: string): string {
  const url = new URL(endpoint);
  return url.host || url.protocol.replace(":", "");
}

function inputSelector(input: string): string | null {
  return input.length >= 10 ? input.slice(0, 10) : null;
}

export class EvmCollector {
  private readonly database: JournalDatabase;
  private readonly source: EvmSource;
  private readonly sources: EvmSource[];
  private readonly maxBlocksPerCycle: number;
  private readonly maxRewindBlocks: number;
  private readonly now: () => number;
  private readonly monotonicNow: () => number;
  private readonly beforeCommit?: EvmCollectorOptions["beforeCommit"];
  private readonly cursorSource: string;
  private readonly cursorKey = NETWORK;

  constructor(options: EvmCollectorOptions) {
    this.database = options.database;
    this.source = options.source;
    this.sources = [options.source, ...(options.comparisonSources ?? [])];
    this.maxBlocksPerCycle = options.maxBlocksPerCycle ?? 25;
    this.maxRewindBlocks = options.maxRewindBlocks ?? 64;
    if (!Number.isSafeInteger(this.maxBlocksPerCycle) || this.maxBlocksPerCycle < 1) {
      throw new Error("maxBlocksPerCycle must be positive");
    }
    if (!Number.isSafeInteger(this.maxRewindBlocks) || this.maxRewindBlocks < 1) {
      throw new Error("maxRewindBlocks must be positive");
    }
    this.now = options.now ?? (() => Math.floor(Date.now() / 1_000));
    this.monotonicNow = options.monotonicNow ?? (() => performance.now());
    this.beforeCommit = options.beforeCommit;
    this.cursorSource = `${this.source.id}:evm-blocks`;
  }

  private async providerHealth(ts: number): Promise<ProviderHealthSummary> {
    const rows = await Promise.all(this.sources.map(async (source, index) => ({
      source,
      key: sourceKey(source, index),
      health: await source.health(),
    })));
    const heads = Object.fromEntries(rows.map((row) => [row.key, row.health.head]));
    const healthyRows = rows.filter((row) => row.health.ok && row.health.head !== null) as Array<{
      source: EvmSource;
      key: string;
      health: { ok: boolean; latencyMs: number; head: bigint; note?: string };
    }>;
    const healthyHeads = healthyRows.flatMap((row) => row.health.ok && row.health.head !== null
      ? [row.health.head]
      : []);
    if (healthyHeads.length === 0) {
      throw new Error(`all Robinhood Chain RPC reads failed (${rows.map((row) => (
        `${row.key}: ${row.health.note ?? "unhealthy"}`
      )).join("; ")})`);
    }
    const highest = healthyHeads.reduce((left, right) => left > right ? left : right);
    const lowest = healthyHeads.reduce((left, right) => left < right ? left : right);
    const observations: EvmObservationInput[] = rows.map((row) => ({
      network: NETWORK,
      ts,
      series: "rpc.latency_ms",
      key: row.key,
      value: row.health.latencyMs,
      provider: providerLabel(row.source.endpoint),
      evidence: { ok: row.health.ok, note: row.health.note ?? null },
    }));
    observations.push({
      network: NETWORK,
      ts,
      series: "head.lag_blocks",
      key: "provider-span",
      value: safeEvmInteger(highest - lowest, "provider head lag"),
      evidence: Object.fromEntries(
        Object.entries(heads).map(([key, head]) => [key, head?.toString() ?? null]),
      ),
    });

    if (healthyHeads.length > 1) {
      const headBlocks = await Promise.all(healthyRows.map((row) => row.source.block(row.health.head)));
      const timestamps = headBlocks.flatMap((block) => block === null ? [] : [block.timestamp]);
      if (timestamps.length > 1) {
        observations.push({
          network: NETWORK,
          ts,
          series: "head.lag_ms",
          key: "provider-span",
          value: (Math.max(...timestamps) - Math.min(...timestamps)) * 1_000,
          evidence: { source: "provider head block timestamps" },
        });
      }
    }
    return { observations, heads, highest };
  }

  private async commonAncestor(cursor: bigint): Promise<bigint> {
    for (let depth = 0n; depth <= BigInt(this.maxRewindBlocks) && depth <= cursor; depth += 1n) {
      const candidate = cursor - depth;
      const [stored, observed] = await Promise.all([
        Promise.resolve(this.database.getEvmBlock(NETWORK, candidate)),
        this.source.block(candidate),
      ]);
      if (stored !== null && observed !== null && stored.blockHash === observed.hash) return candidate;
    }
    throw new Error(`parent mismatch exceeds bounded rewind of ${this.maxRewindBlocks} blocks`);
  }

  private async reconcileStart(
    start: bigint,
    cursorSource: string,
  ): Promise<{ start: bigint; rewoundFrom: bigint | null }> {
    if (start === 0n) return { start, rewoundFrom: null };
    const prior = this.database.getEvmBlock(NETWORK, start - 1n);
    if (prior === null) return { start, rewoundFrom: null };
    const next = await this.source.block(start);
    if (next === null) throw new Error(`Robinhood Chain block ${start} is unavailable`);
    if (next.parentHash === prior.blockHash) return { start, rewoundFrom: null };
    const ancestor = await this.commonAncestor(start - 1n);
    const rewind = ancestor + 1n;
    this.database.rewindEvm(
      NETWORK,
      rewind,
      cursorSource,
      this.cursorKey,
      ancestor.toString(),
      this.now(),
    );
    return { start: rewind, rewoundFrom: rewind };
  }

  private async prepareBlock(
    block: EvmBlock,
    providerObservations: EvmObservationInput[],
    cursorSource: string,
  ): Promise<EvmJournalBatch> {
    const observedAt = this.now();
    const receipts = await Promise.all(block.transactions.map(async (transaction) => {
      const receipt = await this.source.receipt(transaction.hash);
      if (receipt === null) throw new Error(`missing receipt ${transaction.hash}`);
      if (receipt.blockNumber !== block.number || receipt.transactionIndex !== transaction.transactionIndex) {
        throw new Error(`receipt position mismatch ${transaction.hash}`);
      }
      return receipt;
    }));
    const transactions: EvmTransactionInput[] = block.transactions.map((transaction, index) => {
      const receipt = receipts[index]!;
      return {
        network: NETWORK,
        txHash: transaction.hash,
        blockNumber: block.number,
        txIndex: transaction.transactionIndex,
        ts: block.timestamp,
        fromAddress: transaction.from,
        toAddress: transaction.to,
        nonce: transaction.nonce,
        valueWei: transaction.value,
        gasUsed: receipt.gasUsed,
        effectiveGasPriceWei: receipt.effectiveGasPrice,
        status: receipt.status,
        inputSelector: inputSelector(transaction.input),
        kind: transaction.kind,
        observedAt,
      };
    });
    const logs: EvmLogInput[] = receipts.flatMap((receipt) => receipt.logs.map((log) => ({
      network: NETWORK,
      txHash: log.transactionHash,
      logIndex: log.logIndex,
      blockNumber: log.blockNumber,
      blockHash: log.blockHash,
      txIndex: log.transactionIndex,
      contractAddress: log.address,
      topics: log.topics,
      data: log.data,
      removed: log.removed,
      observedAt,
    })));
    const balances: EvmBalanceInput[] = await Promise.all(
      this.database.listEvmAddresses(NETWORK, true).map(async (address) => ({
        network: NETWORK,
        address: address.address,
        assetId: "ETH",
        rawAmount: await this.source.balance(address.address, block.number),
        decimals: 18,
        blockNumber: block.number,
        ts: block.timestamp,
        observedAt,
      })),
    );
    const observations: EvmObservationInput[] = [...providerObservations];
    const prior = block.number === 0n ? null : this.database.getEvmBlock(NETWORK, block.number - 1n);
    if (prior !== null) {
      observations.push({
        network: NETWORK,
        ts: observedAt,
        series: "block.interval_ms",
        key: `canonical:block:${block.number}`,
        value: (block.timestamp - prior.ts) * 1_000,
        blockNumber: block.number,
        evidence: { priorBlock: prior.blockNumber.toString(), timestampsHaveSecondResolution: true },
      });
    }
    observations.push(
      {
        network: NETWORK,
        ts: observedAt,
        series: "block.tx_count",
        key: `canonical:block:${block.number}`,
        value: block.transactions.length,
        blockNumber: block.number,
        evidence: {},
      },
      {
        network: NETWORK,
        ts: observedAt,
        series: "block.gas_used",
        key: `canonical:block:${block.number}`,
        textValue: decimalString(block.gasUsed),
        blockNumber: block.number,
        evidence: { bigint: true },
      },
    );
    const row: EvmBlockInput = {
      network: NETWORK,
      blockNumber: block.number,
      blockHash: block.hash,
      parentHash: block.parentHash,
      ts: block.timestamp,
      l1BlockNumber: block.l1BlockNumber,
      txCount: block.transactions.length,
      gasUsed: block.gasUsed,
      baseFeeWei: block.baseFeePerGas,
      observedAt,
    };
    return {
      blocks: [row],
      transactions,
      logs,
      finality: [{
        network: NETWORK,
        blockNumber: block.number,
        stage: "soft",
        stageTs: observedAt,
        evidence: { source: this.source.id, blockHash: block.hash, transport: "http" },
      }],
      balances,
      observations,
      cursors: [{
        source: cursorSource,
        key: this.cursorKey,
        position: block.number.toString(),
        updatedAt: observedAt,
      }],
      collectLogs: [{
        ts: observedAt,
        source: this.source.id,
        key: `${NETWORK}:block:${block.number}`,
        ok: true,
        items: 1 + transactions.length + logs.length + balances.length,
        ms: 0,
        note: "soft observation; no L1 finality inferred",
      }],
    };
  }

  private async collectRange(
    requestedStart: bigint,
    target: bigint,
    providerObservations: EvmObservationInput[] = [],
    cursorSource = this.cursorSource,
  ): Promise<Omit<EvmCollectResult, "providerHeads" | "ms">> {
    if (requestedStart > target) {
      return {
        network: NETWORK,
        fromBlock: null,
        toBlock: null,
        blocks: 0,
        transactions: 0,
        logs: 0,
        balances: 0,
        observations: 0,
        rewoundFrom: null,
      };
    }
    const reconciled = await this.reconcileStart(requestedStart, cursorSource);
    const summary = {
      network: NETWORK,
      fromBlock: reconciled.start.toString(),
      toBlock: target.toString(),
      blocks: 0,
      transactions: 0,
      logs: 0,
      balances: 0,
      observations: 0,
      rewoundFrom: reconciled.rewoundFrom?.toString() ?? null,
    };
    for (let number = reconciled.start; number <= target; number += 1n) {
      const block = await this.source.block(number);
      if (block === null) throw new Error(`Robinhood Chain block ${number} is unavailable`);
      if (block.number !== number) throw new Error(`RPC returned block ${block.number} for ${number}`);
      const prior = number === 0n ? null : this.database.getEvmBlock(NETWORK, number - 1n);
      if (prior !== null && prior.blockHash !== block.parentHash) {
        throw new Error(`non-contiguous parent at block ${number} after reconciliation`);
      }
      const batch = await this.prepareBlock(
        block,
        number === reconciled.start ? providerObservations : [],
        cursorSource,
      );
      await this.beforeCommit?.(number, batch);
      this.database.writeEvmBatch(batch);
      summary.blocks += 1;
      summary.transactions += batch.transactions?.length ?? 0;
      summary.logs += batch.logs?.length ?? 0;
      summary.balances += batch.balances?.length ?? 0;
      summary.observations += batch.observations?.length ?? 0;
    }
    return summary;
  }

  async collectThrough(target?: bigint): Promise<EvmCollectResult> {
    const started = this.monotonicNow();
    const ts = this.now();
    const health = await this.providerHealth(ts);
    const selectedTarget = target === undefined || target > health.highest ? health.highest : target;
    const cursorText = this.database.getCursor(this.cursorSource, this.cursorKey)?.position ?? null;
    const cursor = cursorText === null ? null : BigInt(cursorText);
    const earliest = selectedTarget >= BigInt(this.maxBlocksPerCycle - 1)
      ? selectedTarget - BigInt(this.maxBlocksPerCycle - 1)
      : 0n;
    const start = cursor === null ? earliest : cursor + 1n;
    const boundedTarget = start + BigInt(this.maxBlocksPerCycle - 1) < selectedTarget
      ? start + BigInt(this.maxBlocksPerCycle - 1)
      : selectedTarget;
    const range = await this.collectRange(start, boundedTarget, health.observations);
    if (range.blocks === 0) {
      this.database.writeEvmBatch({ observations: health.observations });
    }
    return {
      ...range,
      providerHeads: Object.fromEntries(
        Object.entries(health.heads).map(([key, head]) => [key, head?.toString() ?? null]),
      ),
      ms: Math.max(0, Math.round(this.monotonicNow() - started)),
    };
  }

  async backfill(fromBlock: bigint, toBlock: bigint): Promise<EvmCollectResult> {
    if (toBlock < fromBlock) throw new Error("backfill end precedes start");
    const started = this.monotonicNow();
    const source = `${this.cursorSource}:backfill:${fromBlock}:${toBlock}`;
    const cursorText = this.database.getCursor(source, this.cursorKey)?.position ?? null;
    const start = cursorText === null ? fromBlock : BigInt(cursorText) + 1n;
    const boundedTarget = start + BigInt(this.maxBlocksPerCycle - 1) < toBlock
      ? start + BigInt(this.maxBlocksPerCycle - 1)
      : toBlock;
    const range = await this.collectRange(start, boundedTarget, [], source);
    return {
      ...range,
      providerHeads: {},
      ms: Math.max(0, Math.round(this.monotonicNow() - started)),
    };
  }

  async collectSafe(): Promise<EvmCollectResult | { error: string }> {
    try {
      return await this.collectThrough();
    } catch (error) {
      this.database.appendCollectLog({
        ts: this.now(),
        source: this.source.id,
        key: NETWORK,
        ok: false,
        items: 0,
        ms: 0,
        note: errorText(error),
      });
      return { error: errorText(error) };
    }
  }
}

export interface RecoverableHead {
  number: bigint;
  hash: string;
  parentHash: string;
}

/** Feed heads only wake the HTTP collector; they never become canonical rows or finality evidence. */
export async function recoverFromHeadFeed(
  heads: AsyncIterable<RecoverableHead>,
  collector: EvmCollector,
  signal?: AbortSignal,
): Promise<EvmCollectResult[]> {
  const results: EvmCollectResult[] = [];
  for await (const head of heads) {
    if (signal?.aborted === true) break;
    results.push(await collector.collectThrough(head.number));
  }
  return results;
}
