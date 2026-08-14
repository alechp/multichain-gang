export type SourceId = "rpc" | "solscan" | "jito" | "scrape";

export interface SigInfo {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: boolean;
}

export interface SignatureOptions {
  mode?: "new" | "backfill";
  limit?: number;
}

export interface RawBalances {
  slot: number;
  solLamports: number;
  tokenBalances: Record<string, number | null>;
}

export interface RawInstruction {
  programId?: string;
  programIdIndex?: number;
  program?: string;
  data?: string;
  accounts?: Array<number | string>;
  parsed?: {
    type?: string;
    info?: Record<string, unknown>;
  };
}

export interface RawTransaction {
  slot: number;
  blockTime: number | null;
  meta: {
    fee: number;
    err: unknown;
    computeUnitsConsumed?: number;
    innerInstructions?: Array<{ instructions?: RawInstruction[] }>;
  } | null;
  transaction: {
    message: {
      accountKeys?: Array<string | { pubkey?: string }>;
      instructions?: RawInstruction[];
    };
  };
}

export interface SourceHealth {
  ok: boolean;
  latencyMs: number;
  note?: string;
}

export interface MetricObservation {
  ts: number;
  series: string;
  key: string;
  value: number;
}

/** Every implementation observes public data only. */
export interface Source {
  readonly id: SourceId;
  signatures(
    address: string,
    cursor: string | null,
    options?: SignatureOptions,
  ): AsyncIterable<SigInfo>;
  transaction(signature: string): Promise<RawTransaction | null>;
  balances(address: string): Promise<RawBalances | null>;
  health(): Promise<SourceHealth>;
}

export interface VenueMetricSource {
  readonly id: SourceId;
  metrics(): Promise<MetricObservation[]>;
  health(): Promise<SourceHealth>;
}

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type Sleep = (milliseconds: number) => Promise<void>;

export const defaultSleep: Sleep = (milliseconds) => Bun.sleep(milliseconds);
