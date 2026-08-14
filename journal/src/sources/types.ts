export type SourceId = "rpc" | "solscan" | "jito" | "scrape";

export interface SigInfo {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: boolean;
}

export interface RawBalances {
  slot: number;
  solLamports: number;
  tokenBalances: Record<string, number | null>;
}

export type RawTx = unknown;

export interface SourceHealth {
  ok: boolean;
  latencyMs: number;
}

/** Public-observation adapter contract. Implementations arrive in lane J2. */
export interface Source {
  readonly id: SourceId;
  signatures(address: string, cursor: string | null): AsyncIterable<SigInfo>;
  transaction(signature: string): Promise<RawTx | null>;
  balances(address: string): Promise<RawBalances | null>;
  health(): Promise<SourceHealth>;
}
