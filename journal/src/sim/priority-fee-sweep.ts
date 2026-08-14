import { PAPER_STAMP, type SimContext, type SimResult, type Simulator } from "./types";

function numeric(ctx: SimContext, key: string): number {
  return ctx.params[key] as number;
}

export const priorityFeeSweep: Simulator = {
  id: "priority-fee-sweep",
  label: "Priority fee sweep",
  description: "Retrospective sensitivity estimate over observed inclusion gaps.",
  params: [
    {
      id: "targetMicroLamports",
      label: "Alternative CU price",
      type: "number",
      default: 10_000,
      min: 0,
      max: 10_000_000,
      unit: "µlamports/CU",
      description: "Hypothetical compute-unit price used for the comparison.",
    },
    {
      id: "assumedComputeUnits",
      label: "Assumed compute units",
      type: "number",
      default: 200_000,
      min: 1,
      max: 1_400_000,
      unit: "CU",
      description: "Fixed CU estimate used when raw instruction detail is unavailable.",
    },
    {
      id: "gapSlots",
      label: "Observed gap threshold",
      type: "number",
      default: 1,
      min: 1,
      max: 100,
      unit: "slots",
      description: "Minimum adjacent observed slot gap considered plausibly improvable.",
    },
  ],
  metricRequests: () => [],
  run(ctx: SimContext): SimResult {
    const target = numeric(ctx, "targetMicroLamports");
    const units = numeric(ctx, "assumedComputeUnits");
    const gapThreshold = numeric(ctx, "gapSlots");
    const alternativeFee = Math.ceil((target * units) / 1_000_000);
    const rows = [...ctx.transactions].sort((a, b) => a.slot - b.slot || a.ts - b.ts);
    let plausible = 0;
    const modeled: Array<[number, number]> = [];
    const observed: Array<[number, number]> = [];
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (row === undefined) continue;
      const observedFee = row.priorityFeeLamports ?? 0;
      const previous = rows[index - 1];
      const observedGap = previous === undefined ? 0 : row.slot - previous.slot;
      if (previous !== undefined && observedGap >= gapThreshold && observedFee < alternativeFee) {
        plausible += 1;
      }
      observed.push([row.ts, observedFee]);
      modeled.push([row.ts, alternativeFee]);
    }
    return {
      stamp: PAPER_STAMP,
      summary: `${plausible} of ${rows.length} observed transactions met this retrospective earlier-inclusion proxy.`,
      series: [
        { name: "observed priority fee · lamports", points: observed },
        { name: "modeled priority fee · lamports", points: modeled },
      ],
      metrics: [
        { k: "OBSERVED TX", v: String(rows.length) },
        { k: "PROXY MATCHES", v: String(plausible) },
        { k: "MODELED FEE", v: `${alternativeFee.toLocaleString()} lamports` },
      ],
      assumptions: [
        `Each transaction is modeled at ${units.toLocaleString()} compute units.`,
        `An adjacent observed gap of at least ${gapThreshold} slot(s) is treated as inclusion pressure.`,
        "No competitor reaction is modeled.",
        "Observed account activity is treated as a comparable sample despite differing instructions.",
      ],
      caveats: [
        "Slot gaps do not establish that a larger fee would have changed ordering.",
        "Leader policy, account locks, retries, and network latency are not observable here.",
        "The estimate ignores fee-market changes between historical observations.",
      ],
    };
  },
};
