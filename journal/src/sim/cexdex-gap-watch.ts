import { PAPER_STAMP, type MetricRequest, type SimContext, type SimResult, type Simulator } from "./types";

function text(ctx: SimContext, key: string): string {
  return ctx.params[key] as string;
}

function numeric(ctx: SimContext, key: string): number {
  return ctx.params[key] as number;
}

function requests(params: SimContext["params"]): MetricRequest[] {
  const key = params.marketKey as string;
  return [
    { series: params.dexSeries as string, key },
    { series: params.referenceSeries as string, key },
  ];
}

export const cexdexGapWatch: Simulator = {
  id: "cexdex-gap-watch",
  label: "CEX/DEX gap watch",
  description: "Historical price-gap detector over two already-collected public series.",
  metricScope: "global",
  params: [
    {
      id: "dexSeries",
      label: "On-chain series",
      type: "string",
      default: "venue.dex.price",
      description: "Collected series used as the on-chain observation.",
    },
    {
      id: "referenceSeries",
      label: "Reference series",
      type: "string",
      default: "venue.cex.price",
      description: "Collected public reference-price series.",
    },
    {
      id: "marketKey",
      label: "Market key",
      type: "string",
      default: "SOL/USD",
      description: "Metric key shared by both collected price series.",
    },
    {
      id: "thresholdBps",
      label: "Gap threshold",
      type: "number",
      default: 35,
      min: 1,
      max: 10_000,
      unit: "bps",
      description: "Absolute historical gap required to flag an observation.",
    },
    {
      id: "maxLagSeconds",
      label: "Maximum alignment lag",
      type: "number",
      default: 60,
      min: 1,
      max: 3_600,
      unit: "seconds",
      description: "Maximum timestamp distance allowed when aligning observations.",
    },
    {
      id: "modeledNotionalUsd",
      label: "Modeled notional",
      type: "number",
      default: 1_000,
      min: 1,
      max: 100_000_000,
      unit: "USD",
      description: "Fixed paper notional used only to scale detected gap magnitude.",
    },
  ],
  metricRequests: (params) => requests(params),
  run(ctx: SimContext): SimResult {
    const dexSeries = text(ctx, "dexSeries");
    const referenceSeries = text(ctx, "referenceSeries");
    const marketKey = text(ctx, "marketKey");
    const threshold = numeric(ctx, "thresholdBps");
    const maxLag = numeric(ctx, "maxLagSeconds");
    const notional = numeric(ctx, "modeledNotionalUsd");
    const dex = ctx.metrics.filter((row) => row.series === dexSeries && row.key === marketKey);
    const reference = ctx.metrics.filter((row) => (
      row.series === referenceSeries && row.key === marketKey
    ));
    const gaps: Array<[number, number]> = [];
    let modeledGapValue = 0;
    for (const point of dex) {
      const nearest = reference.reduce<(typeof reference)[number] | null>((best, candidate) => {
        if (Math.abs(candidate.ts - point.ts) > maxLag) return best;
        if (best === null || Math.abs(candidate.ts - point.ts) < Math.abs(best.ts - point.ts)) {
          return candidate;
        }
        return best;
      }, null);
      if (nearest === null || nearest.value === 0) continue;
      const gapBps = ((point.value - nearest.value) / nearest.value) * 10_000;
      if (Math.abs(gapBps) >= threshold) {
        gaps.push([point.ts, gapBps]);
        modeledGapValue += notional * Math.abs(gapBps) / 10_000;
      }
    }
    return {
      stamp: PAPER_STAMP,
      summary: `${gaps.length} historical price observations crossed the ${threshold} bps detector threshold.`,
      series: [
        { name: `${dexSeries} · ${marketKey}`, points: dex.map((row) => [row.ts, row.value]) },
        {
          name: `${referenceSeries} · ${marketKey}`,
          points: reference.map((row) => [row.ts, row.value]),
        },
        { name: "flagged absolute gap · bps", points: gaps.map(([ts, gap]) => [ts, Math.abs(gap)]) },
      ],
      metrics: [
        { k: "ALIGNED DEX POINTS", v: String(dex.length) },
        { k: "FLAGS", v: String(gaps.length) },
        { k: "MODELED GAP VALUE", v: `$${modeledGapValue.toFixed(2)}` },
      ],
      assumptions: [
        `The two collected series represent the same ${marketKey} market and units.`,
        `Observations within ${maxLag} seconds are treated as simultaneous.`,
        `Each flag is scaled by a fixed paper notional of $${notional.toLocaleString()}.`,
        "Missing observations are ignored rather than interpolated.",
      ],
      caveats: [
        "A displayed gap is a detector output, not an executable opportunity or order plan.",
        "Fees, spread, inventory, latency, adverse selection, and competition are excluded.",
        "Reference feeds can differ in venue composition, clock, and methodology.",
      ],
    };
  },
};
