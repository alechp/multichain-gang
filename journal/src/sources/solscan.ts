import {
  type FetchLike,
  type RawBalances,
  type RawTransaction,
  type SigInfo,
  type SignatureOptions,
  type Source,
  type SourceHealth,
} from "./types";

interface SolscanOptions {
  apiKey?: string | null;
  baseUrl?: string;
  fetch?: FetchLike;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export class SolscanSource implements Source {
  readonly id = "solscan" as const;
  private readonly apiKey: string | null;
  private readonly baseUrl: string;
  private readonly fetcher: FetchLike;

  constructor(options: SolscanOptions = {}) {
    this.apiKey = options.apiKey ?? null;
    this.baseUrl = (options.baseUrl ?? "https://pro-api.solscan.io").replace(/\/$/, "");
    this.fetcher = options.fetch ?? fetch;
  }

  private async get(path: string, params: Record<string, string>): Promise<unknown> {
    const url = new URL(path, `${this.baseUrl}/`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const headers = new Headers({ accept: "application/json" });
    if (this.apiKey !== null) headers.set("token", this.apiKey);
    const response = await this.fetcher(url, { headers });
    if (!response.ok) throw new Error(`Solscan HTTP ${response.status}`);
    const payload = record(await response.json());
    if (payload.success === false) throw new Error("Solscan response reported failure");
    return payload.data;
  }

  async *signatures(
    address: string,
    cursor: string | null,
    options: SignatureOptions = {},
  ): AsyncIterable<SigInfo> {
    const limit = Math.min(40, options.limit ?? 40);
    const params: Record<string, string> = { address, limit: String(limit) };
    if (options.mode === "backfill" && cursor !== null) params.before = cursor;
    const data = await this.get("/v2.0/account/transactions", params);
    if (!Array.isArray(data)) return;
    for (const item of data) {
      const row = record(item);
      const signature = typeof row.tx_hash === "string" ? row.tx_hash : null;
      if (signature === null || (options.mode !== "backfill" && signature === cursor)) return;
      if (typeof row.slot !== "number") continue;
      yield {
        signature,
        slot: row.slot,
        blockTime: typeof row.block_time === "number" ? row.block_time : null,
        err: row.status !== "Success",
      };
    }
  }

  async transaction(signature: string): Promise<RawTransaction | null> {
    const data = await this.get("/v2.0/transaction/detail", { tx: signature });
    const candidate = record(data);
    if (typeof candidate.slot !== "number" || !("transaction" in candidate)) return null;
    return candidate as unknown as RawTransaction;
  }

  async balances(address: string): Promise<RawBalances | null> {
    const data = record(await this.get("/v2.0/account/portfolio", {
      address,
      exclude_low_score_tokens: "true",
    }));
    const native = record(data.native_balance);
    const tokens = Array.isArray(data.tokens) ? data.tokens : [];
    const tokenBalances: Record<string, number | null> = {};
    for (const item of tokens) {
      const row = record(item);
      if (typeof row.token_address !== "string") continue;
      tokenBalances[row.token_address] = typeof row.balance === "number" ? row.balance : null;
    }
    if (typeof native.amount !== "number") return null;
    return { slot: 0, solLamports: native.amount, tokenBalances };
  }

  async accountMetadata(address: string): Promise<Record<string, unknown> | null> {
    const data = await this.get("/v2.0/account/metadata", { address });
    const metadata = record(data);
    return Object.keys(metadata).length === 0 ? null : metadata;
  }

  async health(): Promise<SourceHealth> {
    const started = performance.now();
    try {
      await this.get("/v2.0/transaction/last", { limit: "10" });
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
