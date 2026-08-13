# SOLANA//SCOPE — project context

Single-file static site: an oscilloscope-styled engineering readout of Solana
(architecture, tx flow, MEV, low-latency trading infra), animated with anime.js 3.2.2.

## Files
- `index.html` — v1, self-contained (CH-01…CH-04). No build step.
- `docs/solana-scope-v2-spec.md` — authoritative v2 spec. Read it fully before touching index.html.
- `docs/HANDOFF.md` — immediate next actions for this session.

## Conventions
- Stay single-file: inline CSS/JS, fonts via Google Fonts, anime.js via cdnjs. No bundler, no framework.
- Design system: channel colors (cyan/amber/red/green/violet), Chakra Petch display + IBM Plex Sans/Mono, graph-paper substrate. All new UI derives from the tokens in `:root`.
- Every animation must degrade: `prefers-reduced-motion` and anime-CDN-failure paths render full static content (`.no-motion` class pattern already in index.html).
- v2 data (chain comparators, technique grid, tool bench) lives in ONE inline `<script type="application/json" id="chainData">` block — content edits must never require layout edits.
- Figures are illustrative orders of magnitude; volatile numbers carry `~` in the UI.

## Immediate task (see docs/HANDOFF.md)
1. Publish: `gh repo create alechp/solana --public --source=. --remote=origin --push`
   (remote `origin` is already configured to https://github.com/alechp/solana.git)
2. Optionally enable GitHub Pages (main / root) → alechp.github.io/solana
3. Then execute the v2 spec in its stated build order (Spec 1 → 2 → 3).

## QA gate for any change
360/390/430/768/1200 px widths × {motion on, reduced motion, CDN blocked, JS off}.
No horizontal page scroll on mobile except intentional inner scrollers.
