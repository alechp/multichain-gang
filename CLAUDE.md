# SOLANA//SCOPE — project context

Single-file static site: an oscilloscope-styled engineering readout of Solana
(architecture, tx flow, MEV, low-latency trading infra, cross-chain bench),
animated with anime.js 3.2.2. v2 is implemented and live at
https://alechp.github.io/solana/ (GitHub Pages, main / root).

## Files
- `index.html` — v2, self-contained (CH-01…CH-05). No build step.
- `docs/solana-scope-v2-spec.md` — the v2 spec (implemented; authoritative on intent).

## Conventions
- Stay single-file: inline CSS/JS, fonts via Google Fonts, anime.js via cdnjs. No bundler, no framework.
- Design system: channel colors (cyan/amber/red/green/violet) + chain colors
  (--btc/--eth/--bnb/--zec), Chakra Petch display + IBM Plex Sans/Mono,
  graph-paper substrate. All new UI derives from the tokens in `:root`; each
  section sets `--ch` (section tint) which panels, headings, and docks inherit.
- Every animation must degrade: `prefers-reduced-motion` and anime-CDN-failure
  render full static content (`reduced` flag → `.no-motion`); hidden-until-reveal
  styles are gated on `body.js` so JS-off shows everything.
- All v2 data (chain comparators, technique grid, tool bench) lives in ONE inline
  `<script type="application/json" id="chainData">` block — content edits must
  never require layout edits. The per-section `<noscript>` fallback tables mirror
  this data for JS-off parity: when you edit the JSON, update the matching
  `<noscript>` table text too (they are the only intentional duplication).
- Looping anime timelines must be registered via `registerLoop(el, inst)` so the
  viewport-pause observer can pause them offscreen (battery rule: ≤2 concurrent).
- Figures are illustrative orders of magnitude dated 2026-08; volatile numbers
  carry `~` in the UI.
- Commit messages: `v2(specN): summary` for spec work, conventional prefixes otherwise.

## QA gate for any change
360/390/430/768/1200 px widths × {motion on, reduced motion, CDN blocked, JS off}.
No horizontal page scroll on mobile except intentional inner scrollers
(the ≥700px pipeline pan is the only one). JS-off and CDN-blocked must still
show all content statically.
