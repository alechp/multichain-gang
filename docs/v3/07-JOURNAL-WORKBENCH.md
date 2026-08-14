# 07 — JOURNAL WORKBENCH: UI, technique simulators, CLI

> **Status:** specified, not started
> **Owner lane:** `J3` (see `08-ORCHESTRATION.md`)
> **Depends on:** `06-JOURNAL-DATA.md` (store + collectors must exist first)
> **Location:** `journal/` (UI under `journal/web/`, simulators under
> `journal/src/sim/`, CLI shared with 06)
> **Safety:** paper-only. Simulators compute *hypothetical* outcomes over
> historical data. Nothing signs, submits, or advises trading. Every simulator
> output carries a `PAPER · HYPOTHETICAL` stamp.

---

## 0. Objective

The place you sit and work: watch tracked addresses' timelines, mock-apply the
techniques taught on the main page against real collected data, and keep a
dated journal of what you observed and concluded. It turns the readout's
concepts into a hands-on (but risk-free) bench.

## 1. Surfaces

### 1.1 CLI (`journal`, shared entry with 06)

```
journal watch add <address> [--label] [--tag]     # manage watchlist
journal watch ls | rm <address>
journal collect [--once|--watch]                   # (from 06)
journal show <address>                             # ascii timeline + latest signals
journal sim <technique> --address <a> [--window 30d] [--params k=v]
journal note add "<text>" [--address] [--sim <runId>] [--tag]
journal note ls [--tag] [--address]
journal export [--md|--json] [--out FILE]          # journal + sim runs
journal serve [--port 7817]                        # launch web workbench
```

Output is scope-styled ASCII (box-drawing, the same mono microtype voice),
so the CLI feels like the page.

### 1.2 Web workbench (`journal/web/`, `journal serve`)

Local-only Bun HTTP server + a single-page UI that **reuses the main site's
design tokens** (imported from a shared `journal/web/tokens.css` copied from
`index.html`'s `:root`, kept in sync by a check script). Panels, mono
microtype, channel colors — the bench is visibly the same instrument family.
Views:

- **Watchlist rail** — addresses with sparkline of `balance.sol`, last-seen,
  tags; add/remove; click → detail.
- **Address detail** — stacked timeseries (balance, fees paid, tips paid, tx
  rate) rendered as the page's oscilloscope traces (SVG, same trace/afterglow
  filters); tx table (kind-filtered); "OPEN ON SOLSCAN ↗" per tx.
- **Simulator bench** — pick a technique, an address/window, params; run;
  see the hypothetical result panel + a chart overlaying the modeled action
  on the real series. Runs are saved (`sim_runs` table) and journal-linkable.
- **Journal** — dated entries (markdown), each optionally linked to an address
  and/or a sim run; filter by tag; export.

No external network from the web layer except tile-free SVG (all self-drawn);
Solscan links open the public site in a new tab.

## 2. Technique simulators (`journal/src/sim/`)

Each simulator implements:

```ts
interface Simulator {
  id: string;               // matches a main-page technique id where applicable
  label: string;
  params: ParamSpec[];      // typed, with defaults + ranges
  run(ctx: SimContext): SimResult;   // pure over historical rows; no I/O beyond db reads
}
interface SimResult {
  stamp: 'PAPER · HYPOTHETICAL';
  summary: string;          // one honest sentence
  series: {name: string; points: [ts, value][]}[];   // for overlay charts
  metrics: {k: string; v: string}[];
  assumptions: string[];    // every simplifying assumption, listed
  caveats: string[];        // why real results would differ (adverse selection, latency, comp)
}
```

Ship at least these two (acceptance requires ≥ 2 producing entries from live
data), design for more:

- **`priority-fee-sweep`** — over an address's historical txs, model outcomes
  under alternative priority-fee levels: "at +N µlamports/CU, M of these txs
  would have plausibly landed one slot earlier" using observed slot/inclusion
  gaps. Honest: assumptions list includes "no competitor reaction modeled".
- **`cexdex-gap-watch`** — for a watched market-maker-like address, align its
  swap timestamps against a public reference price series (collected as a
  venue metric) and flag windows where an on-chain vs reference gap exceeded a
  threshold — a *detector*, not an executor; output is "observed opportunities
  count + total notional gap", stamped hypothetical.
- (backlog, same interface) `sandwich-exposure` (were *your* swaps bracketed?
  detector over neighbors in the same block), `spam-cost` (duplicate-submit
  fee burn model), `liquidation-race` (keeper timing over a lending program).

Simulators are **detectors/estimators over the past**; none place or plan live
orders. The `caveats` field is mandatory and reviewed — a simulator that
undersells its limitations fails review.

## 3. Journal model (migration adds tables)

```sql
CREATE TABLE journal_entries (id TEXT PRIMARY KEY, ts INTEGER, body TEXT,
  address TEXT, sim_run TEXT, tags TEXT DEFAULT '[]');
CREATE TABLE sim_runs (id TEXT PRIMARY KEY, ts INTEGER, sim TEXT, address TEXT,
  params TEXT, result TEXT);   -- result = SimResult JSON
```

Cross-links: an entry can cite a sim run and an address; export weaves them
into one dated markdown log (`journal export --md`), each sim run rendered with
its stamp, summary, metrics, assumptions, and caveats.

## 4. Degradation / robustness

- Empty store: every view shows a "collect first" empty state with the exact
  command. No crashes on zero rows.
- Web server binds localhost only; refuses `0.0.0.0`. No auth because no
  network exposure — documented.
- Token-sync check (`scripts/check-tokens.mjs`) fails CI-style if
  `journal/web/tokens.css` drifts from `index.html`'s `:root`.

## 5. Acceptance criteria

- `journal serve` on a collected DB renders the watchlist with real
  sparklines; address detail shows real balance/fee/tip/tx-rate traces
  matching `journal show`'s ASCII to the same numbers.
- `journal sim priority-fee-sweep --address <a> --window 30d` returns a
  SimResult with populated series, ≥ 3 assumptions, ≥ 2 caveats, the PAPER
  stamp; the web bench overlays it on the real fee series; the run is saved
  and appears in `journal note` linking.
- ≥ 2 simulators produce journal entries end-to-end from data collected by
  06's pipeline (not fixtures).
- `journal export --md` yields a dated log interleaving notes and sim runs,
  every sim run showing its caveats; JSON export round-trips.
- Grep audit passes: no signing/submitting/keypair anywhere in
  `journal/src/sim` or `journal/web`; every SimResult carries the stamp.
- CLI ASCII output renders cleanly at 80 cols; web bench passes the page's own
  360/768/1200 no-horizontal-scroll rule for its panels.
