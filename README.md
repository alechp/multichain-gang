# SOLANA//SCOPE

An interactive engineering instrument for Solana: five oscilloscope-styled
channels cover consensus topology, transaction flow, MEV, low-latency
infrastructure, and a cross-chain bench. The core instrument remains one HTML
file, with local interaction assets; a separate local journal collects
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
    scripts/chain-index.js          chain atlas, six routed hubs, shared Link Veil
    styles/chain-index.css          responsive chain/article index surfaces
    scripts/global-chrome.js        persistent navigation + universal Link Veil controller
    styles/global-chrome.css        measured global/route chrome geometry
    scripts/audit-global-chrome.mjs route, focus, responsive, and Veil regression matrix
    scripts/audit-chain-tools.mjs   Chain Tools data, route, interaction, and viewport gate
    scripts/command-palette.js      command channel, search index, keyboard bridge
    styles/command-palette.css      responsive command-channel surface
    scripts/reader-dock.js          persisted top/bottom reading-bar dock
    styles/reader-dock.css          dock placement and temporarily hidden Notes UI
    vendor/fuse.basic.min.js        pinned local Fuse.js 7.5.0 basic build
    scripts/audit-*.mjs             page fit, contrast, foundation, degradation QA
    journal/                        local SQLite collector, CLI, workbench, simulators
    docs/v3/                        implemented v3 specification and execution ledger
    docs/solana-scope-v2-spec.md    implemented v2 baseline
    docs/robinhood-chain-integration-spec.md
                                    implemented comparison, journal, and launch playbook

## v3 highlights

- 56-term hover/tap documentation with primary links and keyboard-accessible
  pinned REF cards.
- A 26-cue read-through transport with titled authored takeaways, a target
  spotlight, persisted reading scale and top/bottom docking, desktop Escape
  exit, reduced-motion stepping, and CDN-independent autoplay.
- Engaged-reader Left/Right focus traversal—including when an arrow control
  has focus—and Space autoplay/pause, plus a `⌘K` /
  `Ctrl+K` command channel with five-section jumps and fuzzy local search across
  section, cue, entity, tool, chain, and glossary records.
- A static, motion-free top navigation reference; diagram motion stays in the
  teaching surfaces and remains optional. The same header persists above every
  chain, tooling, and article route, with route-local controls directly below.
- One site-wide Link Veil preference controls root, chain, tools, and article
  Hoverdocs. Its compact switch exposes a settings dialog for `CTRL`, `ALT`,
  `SHIFT`, or `META` reveal chords; touch retains a visible disabled status
  control and directly usable links.
- Target-linked technique, glossary, and tooling surfaces share
  fixed-header-aware above/below geometry; document-layer popups cannot be
  clipped by panels, tables, or route containers.
- Field-note controls are temporarily hidden while their interaction model is
  repaired; existing local note data is left intact.
- A full-screen chain atlas at `#/chains`, plus six chain indexes at
  `#/c/<slug>` with three featured reads,
  topic filters, comparative lenses, official source rails, direct article
  routes, Back/Forward scroll restoration, footer deep links, and an opt-in
  hover + hold configurable-modifier Link Veil.
- A 177-record command index that exposes the chain directory, all six chain
  hubs, and every published reader as an explicitly labeled article page.
- 79 unique hash-routed entity channels spanning techniques, tools, chains, and
  term targets, plus an exact JavaScript-off ENTITY INDEX mirror.
- 69 chain-page placements across 68 distinct published articles, including
  complete Gasper, PoSA, Bitcoin finality/mempool, Orchard, Stock Token, and
  15-step Robinhood Chain launch-playbook readers.
- A five-comparator/six-bench-chain Robinhood Chain extension with FCFS,
  three-stage finality, launch/liquidity guidance, and exact static mirrors.
- Parallel read-only Solana and Robinhood Chain observation records, paper
  simulators, a localhost-only workbench, and an 80-column CLI.

## Verification

    node scripts/audit-foundation.mjs
    node scripts/audit-svg-fit.mjs
    node scripts/audit-contrast.mjs
    node scripts/audit-readability.mjs
    node scripts/audit-degradation.mjs
    node scripts/audit-command-channel.mjs
    node scripts/audit-robinhood-chain.mjs
    node scripts/audit-chain-index.mjs
    node scripts/audit-chain-tools.mjs
    node scripts/audit-global-chrome.mjs
    cd journal && bun test && bun run check:tokens

## Status

v3.0 shipped on 2026-08-14; the Robinhood Chain extension was implemented on
2026-08-28, the six chain indexes on 2026-08-29, and persistent v5 route chrome
on 2026-08-29. The figures are illustrative orders of magnitude dated 2026-08,
not live telemetry; live observations remain local to the journal.
