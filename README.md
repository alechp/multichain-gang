# SOLANA//SCOPE

An interactive engineering instrument for Solana: five oscilloscope-styled
channels cover consensus topology, transaction flow, MEV, low-latency
infrastructure, and a cross-chain bench. The core instrument remains one HTML
file, with local command-channel assets; a separate local journal collects
public observations and runs paper-only historical simulators.

**Live:** https://alechp.github.io/solana/

## Run the page

Open `index.html` directly, or serve the repository root:

    npx serve .

There is no page build step. Fuse.js 7.5.0 is vendored locally for the command
palette; anime.js and the web fonts are optional network enhancements. Reduced
motion, a blocked CDN, and JavaScript-off all preserve the teaching content.

The live page opens behind a session-only access-code console. This is a casual
access gate, not a security boundary: GitHub Pages still serves the HTML and
source publicly. True confidentiality requires authenticated hosting (or an
eligible organization-owned private Pages site).

To rotate the code, hash a new normalized value and replace the `digest` in the
head access bootstrap; never commit the plaintext code:

    node -e "const{createHash}=require('node:crypto');console.log(createHash('sha256').update('NEW-CODE'.trim().toUpperCase()).digest('hex'))"

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

    index.html                      v3 instrument core (CH-01 … CH-05)
    scripts/command-palette.js      command channel, search index, keyboard bridge
    styles/command-palette.css      responsive command-channel surface
    vendor/fuse.basic.min.js        pinned local Fuse.js 7.5.0 basic build
    scripts/audit-*.mjs             page fit, contrast, foundation, degradation QA
    journal/                        local SQLite collector, CLI, workbench, simulators
    docs/v3/                        implemented v3 specification and execution ledger
    docs/solana-scope-v2-spec.md    implemented v2 baseline

## v3 highlights

- 49-term hover/tap documentation with primary links and keyboard-accessible
  pinned REF cards.
- A 24-cue read-through transport with titled authored takeaways, a target
  spotlight, persisted reading scale, desktop Escape exit, reduced-motion
  stepping, and CDN-independent autoplay.
- Global Left/Right focus traversal and Space autoplay/pause, plus a `⌘K` /
  `Ctrl+K` command channel with five-section jumps and fuzzy local search across
  136 section, cue, entity, tool, chain, and glossary records.
- A static, motion-free top navigation reference; diagram motion stays in the
  teaching surfaces and remains optional.
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
    node scripts/audit-command-channel.mjs
    cd journal && bun test && bun run check:tokens

## Status

v3.0 shipped on 2026-08-14. The figures are illustrative orders of
magnitude dated 2026-08, not live telemetry; live observations remain local to
the journal.
