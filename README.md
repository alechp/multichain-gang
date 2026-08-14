# SOLANA//SCOPE

An interactive engineering instrument for Solana: five oscilloscope-styled
channels cover consensus topology, transaction flow, MEV, low-latency
infrastructure, and a cross-chain bench. The public page remains one
self-contained HTML file; a separate local journal collects public observations
and runs paper-only historical simulators.

**Live:** https://alechp.github.io/solana/

## Run the page

Open `index.html` directly, or serve the repository root:

    npx serve .

There is no page build step. anime.js and the web fonts are optional network
enhancements; reduced motion, a blocked CDN, and JavaScript-off all preserve the
teaching content.

## Run the local journal

The journal requires Bun and never deploys to GitHub Pages:

    cd journal
    bun run migrate
    bun run collect -- --once
    bun run serve

Use `bun run journal -- --help` for watchlist, backfill, simulator, note,
import, and export commands. It is read-only against public data and every
simulator result is stamped `PAPER · HYPOTHETICAL`.

## Layout

    index.html                      v3 public instrument (CH-01 … CH-05)
    scripts/audit-*.mjs             page fit, contrast, foundation, degradation QA
    journal/                        local SQLite collector, CLI, workbench, simulators
    docs/v3/                        implemented v3 specification and execution ledger
    docs/solana-scope-v2-spec.md    implemented v2 baseline

## v3 highlights

- 49-term hover/tap documentation with primary links and keyboard-accessible
  pinned REF cards.
- A 24-cue read-through transport, persisted reading scale, and complete manual,
  reduced-motion, and CDN-failure modes.
- In-place field notes with stable anchors, local persistence, Markdown/JSON
  export, import, orphan recovery, and private-mode fallback.
- 53 unique hash-routed entity channels spanning techniques, tools, chains, and
  term targets, plus an exact JavaScript-off ENTITY INDEX mirror.
- Local SQLite collection for three seeded addresses, public RPC/Solscan/Jito
  adapters, paper simulators, a localhost-only workbench, and an 80-column CLI.

## Verification

    node scripts/audit-foundation.mjs
    node scripts/audit-svg-fit.mjs
    node scripts/audit-contrast.mjs
    node scripts/audit-degradation.mjs
    cd journal && bun test && bun run check:tokens

## Status

v3.0 shipped on 2026-08-14. The public figures are illustrative orders of
magnitude dated 2026-08, not live telemetry; live observations remain local to
the journal.
