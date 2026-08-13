# SOLANA//SCOPE

An engineering readout of Solana, styled as a five-channel oscilloscope: consensus
topology, transaction signal path, MEV, the low-latency trading stack, and a
cross-chain bench — diagrammed in SVG and animated with anime.js. Single
self-contained HTML file.

**Live:** https://alechp.github.io/solana/

## Run

Open `index.html` in a browser, or serve locally:

    npx serve .

## Layout

    index.html                      v2 page (CH-01 … CH-05)
    docs/solana-scope-v2-spec.md    v2 specification (implemented)

## v2 highlights

- **Compare docks** — every channel section carries a SOL vs BTC / ETH / BNB / ZEC
  comparator with per-chain mini-diagrams, metric deltas, and a one-line takeaway.
- **CH-05 · Cross-chain bench** — an 8-technique × 5-chain heat grid with cell
  popovers, and a filterable tool bench (auction / protection / data-feed /
  priority / client tooling) cross-linked from the grid.
- **Single data source** — all comparator, grid, and bench content lives in one
  inline `#chainData` JSON block; content edits never require layout edits.
- **Graceful degradation** — reduced motion, anime-CDN failure, and JS-off all
  render the full content statically (`<noscript>` mirrors the data as tables).
- Full mobile pass: vertical pipeline rebuild, 2-slot hero scope, stacked
  sandwich figure, 44px tap targets, safe-area insets, viewport-paused loops.

## Status

v2 shipped. Figures on the page are illustrative orders of magnitude dated
2026-08, not live telemetry.
