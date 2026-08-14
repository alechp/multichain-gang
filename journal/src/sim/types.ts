import type { MetricRecord, TransactionRecord } from "../db";

export const PAPER_STAMP = "PAPER · HYPOTHETICAL" as const;

export interface ParamSpec {
  id: string;
  label: string;
  type: "number" | "string" | "boolean";
  default: string | number | boolean;
  min?: number;
  max?: number;
  unit?: string;
  description: string;
}

export type SimParams = Record<string, string | number | boolean>;

export interface SimSeries {
  name: string;
  points: Array<[number, number]>;
}

export interface SimResult {
  stamp: typeof PAPER_STAMP;
  summary: string;
  series: SimSeries[];
  metrics: Array<{ k: string; v: string }>;
  assumptions: string[];
  caveats: string[];
}

export interface SimContext {
  address: string;
  fromTs: number;
  toTs: number;
  params: SimParams;
  transactions: TransactionRecord[];
  metrics: MetricRecord[];
}

export interface MetricRequest {
  series: string;
  key: string;
}

export interface Simulator {
  id: string;
  label: string;
  description: string;
  params: ParamSpec[];
  metricScope?: "address" | "global";
  metricRequests(params: SimParams, address: string): MetricRequest[];
  run(ctx: SimContext): SimResult;
}

function resolveOne(spec: ParamSpec, raw: unknown): string | number | boolean {
  const value = raw ?? spec.default;
  if (spec.type === "string") {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`${spec.id} must be a non-empty string`);
    }
    return value.trim();
  }
  if (spec.type === "boolean") {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
    throw new Error(`${spec.id} must be true or false`);
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) throw new Error(`${spec.id} must be a number`);
  if (spec.min !== undefined && number < spec.min) {
    throw new Error(`${spec.id} must be at least ${spec.min}`);
  }
  if (spec.max !== undefined && number > spec.max) {
    throw new Error(`${spec.id} must be at most ${spec.max}`);
  }
  return number;
}

export function resolveParams(
  specs: ParamSpec[],
  raw: Record<string, unknown>,
): SimParams {
  const known = new Set(specs.map((spec) => spec.id));
  const unknown = Object.keys(raw).find((key) => !known.has(key));
  if (unknown !== undefined) throw new Error(`unknown simulator parameter ${unknown}`);
  return Object.fromEntries(specs.map((spec) => [spec.id, resolveOne(spec, raw[spec.id])]));
}

export function validateSimResult(value: unknown): asserts value is SimResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("simulator result must be an object");
  }
  const result = value as Partial<SimResult>;
  if (result.stamp !== PAPER_STAMP) throw new Error(`simulator result must carry ${PAPER_STAMP}`);
  if (typeof result.summary !== "string" || result.summary.trim() === "") {
    throw new Error("simulator result needs an honest summary");
  }
  if (!Array.isArray(result.series) || !Array.isArray(result.metrics)) {
    throw new Error("simulator result needs series and metrics arrays");
  }
  if (!Array.isArray(result.assumptions) || result.assumptions.length < 3) {
    throw new Error("simulator result needs at least three assumptions");
  }
  if (!Array.isArray(result.caveats) || result.caveats.length < 2) {
    throw new Error("simulator result needs at least two caveats");
  }
  for (const series of result.series) {
    if (typeof series.name !== "string" || !Array.isArray(series.points)) {
      throw new Error("simulator series is malformed");
    }
    if (series.points.some((point) => (
      !Array.isArray(point)
      || point.length !== 2
      || !Number.isFinite(point[0])
      || !Number.isFinite(point[1])
    ))) throw new Error("simulator series contains a non-finite point");
  }
}
