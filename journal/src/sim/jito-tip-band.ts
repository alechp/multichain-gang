import { PAPER_STAMP, type SimContext, type SimResult, type Simulator } from "./types";

const SERIES = "venue.jito.tip_floor";
const KEYS = ["p25", "p50", "p75", "p95", "ema-p50"] as const;

function points(ctx: SimContext, key: (typeof KEYS)[number]): Array<[number, number]> {
  return ctx.metrics
    .filter((row) => row.series === SERIES && row.key === key)
    .map((row) => [row.ts, row.value]);
}

function tip(value: number | undefined): string {
  if (value === undefined) return "n/a";
  return `${value.toFixed(9).replace(/0+$/, "").replace(/\.$/, "")} SOL/tip`;
}

export const jitoTipBand: Simulator = {
  id: "jito-tip-band",
  label: "Jito tip band",
  description: "Historical landed-tip percentile band over collected public Jito observations.",
  params: [],
  metricScope: "global",
  metricRequests: () => KEYS.map((key) => ({ series: SERIES, key })),
  run(ctx: SimContext): SimResult {
    const byKey = Object.fromEntries(KEYS.map((key) => [key, points(ctx, key)])) as Record<
      (typeof KEYS)[number],
      Array<[number, number]>
    >;
    const timestamps = new Set(KEYS.flatMap((key) => byKey[key].map(([ts]) => ts)));
    const p25 = new Map(byKey.p25);
    const widths = byKey.p75.flatMap<[number, number]>(([ts, high]) => {
      const low = p25.get(ts);
      return low === undefined ? [] : [[ts, Math.max(0, high - low)]];
    });
    const latestP50 = byKey.p50.at(-1)?.[1];
    const peakP95 = byKey.p95.reduce<number | undefined>((peak, [, value]) => (
      peak === undefined || value > peak ? value : peak
    ), undefined);
    const maxWidth = widths.reduce<number | undefined>((peak, [, value]) => (
      peak === undefined || value > peak ? value : peak
    ), undefined);
    const count = timestamps.size;
    const summary = count === 0
      ? "No collected Jito tip-floor observations fall inside this historical window."
      : count === 1
        ? "One collected Jito tip-floor snapshot describes a point-in-time band; no trend is inferred."
        : `${count} collected Jito tip-floor snapshots describe the historical landed-tip percentile band.`;

    return {
      stamp: PAPER_STAMP,
      summary,
      series: [
        { name: "Jito landed tip · p25 · SOL/tip", points: byKey.p25 },
        { name: "Jito landed tip · p50 · SOL/tip", points: byKey.p50 },
        { name: "Jito landed tip · p75 · SOL/tip", points: byKey.p75 },
        { name: "Jito landed tip · p95 · SOL/tip", points: byKey.p95 },
        { name: "Jito landed tip · EMA p50 · SOL/tip", points: byKey["ema-p50"] },
        { name: "historical p25–p75 width · SOL/tip", points: widths },
      ],
      metrics: [
        { k: "OBSERVED SNAPSHOTS", v: String(count) },
        { k: "LATEST P50", v: tip(latestP50) },
        { k: "MAX P25–P75 WIDTH", v: tip(maxWidth) },
        { k: "PEAK P95", v: tip(peakP95) },
      ],
      assumptions: [
        "Public Jito endpoint values are interpreted in SOL per landed tip as reported by the source.",
        "Percentile rows sharing an exact timestamp are treated as one historical snapshot.",
        "The p25–p75 difference is used only as a descriptive historical band width.",
        "Missing percentile keys remain missing and are not interpolated.",
      ],
      caveats: [
        "Historical landed-tip percentiles do not guarantee future inclusion or define a suggested tip.",
        "Endpoint methodology, bundle composition, and validator conditions can change between samples.",
        "Collection cadence and outages can hide short-lived movements inside the displayed window.",
      ],
    };
  },
};
