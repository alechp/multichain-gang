import { readFileSync } from "node:fs";
import {
  defaultSleep,
  type FetchLike,
  type RawBalances,
  type RawTransaction,
  type SigInfo,
  type SignatureOptions,
  type Sleep,
  type Source,
  type SourceHealth,
} from "./types";

const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

interface RpcSourceOptions {
  fetch?: FetchLike;
  sleep?: Sleep;
  maxAttempts?: number;
  pageSize?: number;
}

interface RpcEnvelope<T> {
  jsonrpc?: string;
  id?: number;
  result?: T;
  error?: { code?: number; message?: string };
}

interface RpcSignature {
  signature?: unknown;
  slot?: unknown;
  blockTime?: unknown;
  err?: unknown;
}

interface FixtureAddress {
  signatures: SigInfo[];
  balances: RawBalances;
}

export interface RpcFixture {
  collectedAt?: number;
  addresses: Record<string, FixtureAddress>;
  transactions: Record<string, RawTransaction>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`RPC response has invalid ${field}`);
  }
  return value;
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  }
  return Math.min(8_000, 250 * (2 ** attempt));
}

export class RpcSource implements Source {
  readonly id = "rpc" as const;
  private readonly fetcher: FetchLike;
  private readonly sleep: Sleep;
  private readonly maxAttempts: number;
  private readonly pageSize: number;
  private requestId = 0;

  constructor(readonly endpoint: string, options: RpcSourceOptions = {}) {
    this.fetcher = options.fetch ?? fetch;
    this.sleep = options.sleep ?? defaultSleep;
    this.maxAttempts = options.maxAttempts ?? 4;
    this.pageSize = options.pageSize ?? 100;
  }

  private async post(payload: unknown): Promise<unknown> {
    for (let attempt = 0; attempt < this.maxAttempts; attempt += 1) {
      const response = await this.fetcher(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 429 || response.status >= 500) {
        if (attempt + 1 === this.maxAttempts) {
          throw new Error(`RPC unavailable after ${this.maxAttempts} attempts (${response.status})`);
        }
        await this.sleep(retryDelay(response, attempt));
        continue;
      }
      if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
      return response.json();
    }
    throw new Error("RPC retry loop exhausted");
  }

  private async request<T>(method: string, params: unknown[]): Promise<T> {
    const payload = {
      jsonrpc: "2.0",
      id: ++this.requestId,
      method,
      params,
    };
    const envelope = await this.post(payload) as RpcEnvelope<T>;
    if (envelope.error !== undefined) {
      throw new Error(`RPC ${method}: ${envelope.error.message ?? envelope.error.code ?? "error"}`);
    }
    if (!("result" in envelope)) throw new Error(`RPC ${method}: missing result`);
    return envelope.result as T;
  }

  private async batch<T>(calls: Array<{ method: string; params: unknown[] }>): Promise<T[]> {
    const payload = calls.map((call) => ({
      jsonrpc: "2.0",
      id: ++this.requestId,
      method: call.method,
      params: call.params,
    }));
    const ids = payload.map((call) => call.id);
    const envelopes = await this.post(payload) as Array<RpcEnvelope<T>>;
    const byId = new Map(envelopes.map((entry) => [entry.id, entry]));
    return ids.map((id, index) => {
      const envelope = byId.get(id);
      if (envelope?.error !== undefined) {
        throw new Error(
          `RPC ${calls[index]?.method}: ${envelope.error.message ?? envelope.error.code ?? "error"}`,
        );
      }
      if (envelope === undefined || !("result" in envelope)) {
        throw new Error(`RPC ${calls[index]?.method}: missing result`);
      }
      return envelope.result as T;
    });
  }

  async *signatures(
    address: string,
    cursor: string | null,
    options: SignatureOptions = {},
  ): AsyncIterable<SigInfo> {
    const mode = options.mode ?? "new";
    const limit = options.limit ?? 1_000;
    let before = mode === "backfill" ? cursor : null;
    let remaining = limit;

    while (remaining > 0) {
      const pageLimit = Math.min(this.pageSize, remaining);
      const config: Record<string, unknown> = { limit: pageLimit, commitment: "confirmed" };
      if (before !== null) config.before = before;
      if (mode === "new" && cursor !== null) config.until = cursor;
      const page = await this.request<RpcSignature[]>(
        "getSignaturesForAddress",
        [address, config],
      );
      if (!Array.isArray(page)) throw new Error("RPC signatures result is not an array");

      for (const row of page) {
        const signature = typeof row.signature === "string" ? row.signature : "";
        if (signature === "") throw new Error("RPC signature is missing");
        yield {
          signature,
          slot: requiredNumber(row.slot, "signature slot"),
          blockTime: row.blockTime === null ? null : requiredNumber(row.blockTime, "blockTime"),
          err: row.err !== null,
        };
        remaining -= 1;
        if (remaining === 0) return;
      }

      if (page.length < pageLimit || page.length === 0) return;
      const tail = page.at(-1)?.signature;
      if (typeof tail !== "string" || tail === before) return;
      before = tail;
    }
  }

  async transaction(signature: string): Promise<RawTransaction | null> {
    const result = await this.request<RawTransaction | null>("getTransaction", [
      signature,
      {
        encoding: "jsonParsed",
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      },
    ]);
    return result;
  }

  async balances(address: string): Promise<RawBalances | null> {
    const [balanceValue, tokenValue] = await this.batch<unknown>([
      { method: "getBalance", params: [address, { commitment: "confirmed" }] },
      {
        method: "getTokenAccountsByOwner",
        params: [
          address,
          { programId: TOKEN_PROGRAM },
          { encoding: "jsonParsed", commitment: "confirmed" },
        ],
      },
    ]);
    const balance = asRecord(balanceValue);
    const token = asRecord(tokenValue);
    const balanceContext = asRecord(balance.context);
    const tokenContext = asRecord(token.context);
    const accounts = Array.isArray(token.value) ? token.value : [];
    const tokenBalances: Record<string, number | null> = {};

    for (const account of accounts) {
      const accountRecord = asRecord(account);
      const accountValue = asRecord(accountRecord.account);
      const data = asRecord(accountValue.data);
      const parsed = asRecord(data.parsed);
      const info = asRecord(parsed.info);
      const mint = typeof info.mint === "string" ? info.mint : null;
      const tokenAmount = asRecord(info.tokenAmount);
      const uiAmount = tokenAmount.uiAmount === null
        ? null
        : typeof tokenAmount.uiAmount === "number"
          ? tokenAmount.uiAmount
          : typeof tokenAmount.uiAmountString === "string"
            ? Number(tokenAmount.uiAmountString)
            : null;
      if (mint !== null) tokenBalances[mint] = uiAmount;
    }

    return {
      slot: Math.max(
        requiredNumber(balanceContext.slot, "balance context slot"),
        requiredNumber(tokenContext.slot, "token context slot"),
      ),
      solLamports: requiredNumber(balance.value, "balance"),
      tokenBalances,
    };
  }

  async health(): Promise<SourceHealth> {
    const started = performance.now();
    try {
      await this.request<string>("getHealth", []);
      return { ok: true, latencyMs: Math.round(performance.now() - started) };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - started),
        note: String(error),
      };
    }
  }
}

export class FixtureRpcSource implements Source {
  readonly id = "rpc" as const;

  constructor(readonly fixture: RpcFixture) {}

  get collectedAt(): number | undefined {
    return this.fixture.collectedAt;
  }

  static fromFile(path: string): FixtureRpcSource {
    return new FixtureRpcSource(JSON.parse(readFileSync(path, "utf8")) as RpcFixture);
  }

  async *signatures(
    address: string,
    cursor: string | null,
    options: SignatureOptions = {},
  ): AsyncIterable<SigInfo> {
    const rows = this.fixture.addresses[address]?.signatures ?? [];
    const mode = options.mode ?? "new";
    const limit = options.limit ?? rows.length;
    const cursorIndex = cursor === null
      ? -1
      : rows.findIndex((row) => row.signature === cursor);
    const selected = mode === "backfill"
      ? rows.slice(cursorIndex < 0 ? 0 : cursorIndex + 1)
      : cursorIndex < 0
        ? rows
        : rows.slice(0, cursorIndex);
    for (const row of selected.slice(0, limit)) yield structuredClone(row);
  }

  async transaction(signature: string): Promise<RawTransaction | null> {
    const row = this.fixture.transactions[signature];
    return row === undefined ? null : structuredClone(row);
  }

  async balances(address: string): Promise<RawBalances | null> {
    const row = this.fixture.addresses[address]?.balances;
    return row === undefined ? null : structuredClone(row);
  }

  async health(): Promise<SourceHealth> {
    return { ok: true, latencyMs: 0, note: "fixture" };
  }
}
