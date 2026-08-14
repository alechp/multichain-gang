import {
  type FetchLike,
  type MetricObservation,
  type RawBalances,
  type RawTransaction,
  type SigInfo,
  type Source,
  type SourceHealth,
  type VenueMetricSource,
} from "./types";

export interface JitoTipFloor {
  time: string;
  landedTips25thPercentile: number;
  landedTips50thPercentile: number;
  landedTips75thPercentile: number;
  landedTips95thPercentile: number;
  landedTips99thPercentile: number;
  emaLandedTips50thPercentile: number;
}

interface JitoOptions {
  baseUrl?: string;
  fetch?: FetchLike;
}

function finite(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Jito tip floor has invalid ${field}`);
  }
  return value;
}

export class JitoSource implements Source, VenueMetricSource {
  readonly id = "jito" as const;
  private readonly baseUrl: string;
  private readonly fetcher: FetchLike;

  constructor(options: JitoOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://bundles.jito.wtf").replace(/\/$/, "");
    this.fetcher = options.fetch ?? fetch;
  }

  async tipFloor(): Promise<JitoTipFloor> {
    const response = await this.fetcher(`${this.baseUrl}/api/v1/bundles/tip_floor`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Jito HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) {
      throw new Error("Jito tip floor response is empty");
    }
    const row = payload[0] as Record<string, unknown>;
    if (typeof row.time !== "string" || Number.isNaN(Date.parse(row.time))) {
      throw new Error("Jito tip floor has invalid time");
    }
    return {
      time: row.time,
      landedTips25thPercentile: finite(row.landed_tips_25th_percentile, "p25"),
      landedTips50thPercentile: finite(row.landed_tips_50th_percentile, "p50"),
      landedTips75thPercentile: finite(row.landed_tips_75th_percentile, "p75"),
      landedTips95thPercentile: finite(row.landed_tips_95th_percentile, "p95"),
      landedTips99thPercentile: finite(row.landed_tips_99th_percentile, "p99"),
      emaLandedTips50thPercentile: finite(row.ema_landed_tips_50th_percentile, "ema-p50"),
    };
  }

  async metrics(): Promise<MetricObservation[]> {
    const floor = await this.tipFloor();
    const ts = Math.floor(Date.parse(floor.time) / 1_000);
    return [
      ["p25", floor.landedTips25thPercentile],
      ["p50", floor.landedTips50thPercentile],
      ["p75", floor.landedTips75thPercentile],
      ["p95", floor.landedTips95thPercentile],
      ["p99", floor.landedTips99thPercentile],
      ["ema-p50", floor.emaLandedTips50thPercentile],
    ].map(([key, value]) => ({
      ts,
      series: "venue.jito.tip_floor",
      key: key as string,
      value: value as number,
    }));
  }

  async *signatures(): AsyncIterable<SigInfo> {
    // Jito's public tip surface has no address-history capability.
  }

  async transaction(): Promise<RawTransaction | null> {
    return null;
  }

  async balances(): Promise<RawBalances | null> {
    return null;
  }

  async health(): Promise<SourceHealth> {
    const started = performance.now();
    try {
      await this.tipFloor();
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
