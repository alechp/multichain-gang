# 04 — STYLE & READABILITY: defect burn-down, distinctiveness pass, v3 foundations

> **Status:** implemented 2026-08-14 — foundation merged first; physical 4× CPU profile skipped
> **Owner lane:** `D` (see `08-ORCHESTRATION.md`)
> **Depends on:** nothing. Everything else depends on it.
> **Defects below were measured on v2 HEAD (`4514fbb`) on 2026-08-13 —
> numbers are from the live DOM, not estimates.**

---

## 0. Objective

Three jobs, one lane: (1) fix the measured readability defects (text overflow,
contrast, occlusion); (2) push the visual system from "nice dark dashboard"
to unmistakably *this instrument*; (3) land the shared v3 primitives and the
file zone map every other lane builds on.

## 1. Measured defects (fix all; each becomes a regression audit)

### 1.1 SVG text overflows its box (user-reported, confirmed by measurement)

`getBBox()` vs parent rect at v2 HEAD:

| Figure | Label | Box w | Text w | Overflow |
|---|---|---|---|---|
| FIG 1.1 turbine | `slot n · builds block` | 104 | 143 | **39 units** |
| FIG 2.1 pipeline | `sign + blockhash` | 90 | 109 | 19 |
| FIG 2.1 pipeline | `sendTransaction` | 90 | 102 | 12 |
| FIG 2.1 pipeline | `forward to leaders` | 110 | 122 | 12 |
| FIG 2.1 pipeline | `Sealevel · parallel` | 100 | 129 | **29** |

Also visible in review screenshots: `ordered in time` and `shred broadcast`
clip against their box borders at wide renders.

**Fix policy (in order of preference):** widen boxes to fit text + 12 units of
padding (pipeline horizontal has slack: stage boxes can grow to 120–130 wide
with spine intact); shorten labels only where widening breaks composition
(`sendTransaction` → `sendTx` is acceptable; prefer widening). Apply to BOTH
pipeline variants (horizontal + vertical), turbine (incl. the <700px 12/13px
font bump — re-measure at mobile sizes), jito, sandwich, hero, and every
Spec-2 mini template.

**Audit (automated, permanent):** `scripts/audit-svg-fit.mjs` — headless run
(or DevTools paste) that, for every `<text>` with a sibling/ancestor `rect` in
the same labeled group, asserts
`textBBox ⊆ rectBBox` inflated by 2 units, at 360/700/1200 emulated widths and
with the mobile font bumps active. Exits nonzero listing offenders in the §1.1
table format. Wire into the QA gate.

### 1.2 Dark-on-dark text (user-reported, confirmed by computation)

`--faint` #4A5570 on `--panel` #10141D = **2.48:1** — fails WCAG AA (4.5:1)
and it is used for *load-bearing* figure sub-labels (`.lbl-f`), panel labels,
and legend text. `--dim` #7A87A0 = 5.08:1 (passes).

**Fix:** introduce `--lbl: #75829B` (≥4.6:1 on both `--panel` and `--panel-2`)
and move ALL text at ≤ 12px SVG / ≤ .7rem HTML from `--faint` to `--lbl`.
`--faint` remains legal only for decorative strokes (corners, ruler, rules) and
type ≥ 14px used as texture (watermark). Recompute and record ratios for every
(text-token × ground-token) pair in a comment block beside the tokens.

### 1.3 Occlusion

The pipeline packet dot travels **over** stage sub-labels (screenshot: dot on
`ordered in time`). Fixes: (a) give all figure text
`paint-order: stroke; stroke: var(--panel-2); stroke-width: 3px` halos so any
crossing element stays legible; (b) route packets in a dedicated layer group
*below* text groups in DOM order. Apply to hero dot, turbine shreds, jito
dots, and all mini-diagram loops. The boot letter-spacing settle must also
never cause h1 line-wrap jitter at 700–900px (clamp check at 04 QA).

### 1.4 Fit-on-screen rule for animations

Every animated figure must be fully visible in an 800px-tall viewport at its
breakpoint's design width when its animation triggers (the reveal threshold
already centers it; verify hero scope, sandwich split, jito at 360×640 too).
The CH-04 watermark must never overlap `.lval` values (currently close at
1100–1200px — add `max-width` guard or drop watermark below 1250px).

## 2. Distinctiveness pass ("less generic")

The v2 additions (docks, bench cards, chips) read as competent-generic. Give
each surface a signature. Keep the restraint rule: **one flourish per
surface**; if it's noticeable at a glance from arm's length, it's too loud.

- **Docks:** column heads gain a 24×10 live micro-sparkline of the chain's
  cadence (one bar per second of block time, static SVG, no loop); the dock
  border-top becomes a **notched** edge (clip-path corner notch, 8px) — docks
  stop being another rounded rectangle.
- **Chips → segmented switch:** the chip row (dock + bench filters) restyles
  as a single segmented instrument switch: shared 1px housing, interior
  dividers, the active segment's tick glows with a 1px inner shadow. Chip
  geometry/behavior/ARIA unchanged.
- **Cards:** each bench function family gets a 12×12 etched glyph (auction
  gavel-wave, shield, intent arrow, feed burst, fee stack, wrench-wave) in the
  mono-tag row; card hover ring becomes a corner-bracket draw (the `.corner`
  marks animate in 120ms) instead of a plain ring.
- **Sections:** one bespoke ambient per channel, all ≤ 2% opacity, all static
  under reduced motion, none looping (bloom stays the only per-panel glow):
  CH-01 constellation micro-dots in panel grounds; CH-02 1px flow-direction
  hatching behind the pipeline; CH-03 a single scanline "interference bar"
  that parks at a random y per page load (no loop — placed once); CH-04 a
  µs/ms/s log-ruler etched along the ladder's left edge; CH-05 hairline
  circuit traces connecting the grid panel corner to the bench label.
- **Type:** panel labels step up to a two-tier lockup (`FIG 2.1` bold /
  descriptor light); `.mono-tag` gets the `//` house separator. The reading-
  scale variable from `02-PLAYBAR.md` §4 lands here: body-copy sizes become
  `calc(size × var(--reading-scale, 1))`; display/SVG sizes stay fixed.
- **Legend:** the footer gains the channel legend line (frauthy's on-page
  color key move): `CYAN NETWORK · AMBER TX · RED ADVERSARIAL · GREEN
  PROTECTION · VIOLET CROSS-CHAIN · ◉ AMBER YOUR NOTES`.

## 3. v3 foundations (shared primitives — built here, consumed by lanes A/B/C/E)

Per `00-V3-PROGRAM.md` §2, implemented in this lane so exactly one writer
touches shared runtime:

1. **Overlay** — layer manager (stack, scrim opt, focus trap, Esc, focus
   return, scroll lock, bottom-sheet <700px). Migrate the v2 grid popover
   (`.tpop`) onto it as the proving consumer; dock behavior untouched.
2. **Router** — hash routes `#/e/:id`, `#/cue/:n`; ignores unknown/absent
   routes; plays nicely with section anchors; `popstate`-driven close.
3. **Store** — namespaced/versioned localStorage with in-memory fallback.
4. **`positionOverlay()`** — the ported pure geometry function
   (flip/shift/clamp/beam-offset) from frauthy `overlay-position.ts`.
5. **`termify()`** — scanner shell (01 supplies config; the walker, reject
   list, idempotence guard, and first-occurrence bookkeeping live here).
6. **Anchor stamps + `data-rev`** — `data-note-anchor` ids per `03-NOTES.md`
   §1 and the body `data-rev` content stamp.
7. **Zone map** — delimited insertion zones in `index.html` (empty, uniquely
   bannered): `V3A-CSS/JS/JSON`, `V3B-…`, `V3C-…`, `V3E-…` per
   `08-ORCHESTRATION.md` §4. Foundation code itself lives in `V3D-…` zones.

## 4. Degradation

All §2 flourishes are CSS-only or one-shot; reduced motion renders them
static; JS-off unaffected (foundations are inert without consumers). The
audits themselves run in all four QA modes.

## 5. Acceptance criteria

- `audit-svg-fit.mjs` passes at 360/700/1200 with zero offenders; the §1.1
  table reproduces as all-green.
- Every ≤12px text token computes ≥ 4.5:1 on its actual ground; ratio table
  committed beside the tokens.
- No moving element crosses un-haloed text in any looping figure (visual
  sweep + DOM-order assertion for packet/text layers).
- Watermark/value overlap impossible at any width (bounding-box check).
- All five section ambients present, none animated in a loop, page still
  paints < 16ms/frame during hero boot on a mid-range phone profile
  (devtools 4× CPU throttle sanity run).
- Overlay/Router/Store/positionOverlay/termify exported on a single
  `window.SCOPE` namespace object, each with a 5-line usage comment; grid
  popover runs on Overlay with v2 behavior preserved (its Spec-3 acceptance
  re-run passes).
- Zone banners present, empty, and byte-unique; `git merge` of two branches
  each appending to a different zone produces no conflict (rehearsed once in
  the lane, recorded in the orchestration ledger).
- v2 QA matrix re-passes in full.
