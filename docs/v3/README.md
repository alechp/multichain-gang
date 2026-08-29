# SOLANA//SCOPE v3 — specification set

Interactive-instrument + journal program. Read in this order:

| # | Doc | What it specs |
|---|-----|---------------|
| 00 | [00-V3-PROGRAM.md](00-V3-PROGRAM.md) | Program overview, invariants, shared primitives, done criteria |
| 01 | [01-HOVERDOCS.md](01-HOVERDOCS.md) | Hover/tap term documentation with aesthetic tooltips + remote links |
| 02 | [02-PLAYBAR.md](02-PLAYBAR.md) | Read/play-through transport bar + cue system + reading scale |
| 03 | [03-NOTES.md](03-NOTES.md) | Click-in-place field notes with local persistence + export |
| 04 | [04-STYLE-READABILITY.md](04-STYLE-READABILITY.md) | Readability/fit defect fixes, distinctiveness pass, shared foundations |
| 05 | [05-ENTITY-PAGES.md](05-ENTITY-PAGES.md) | Hash-routed deep-dive sub-pages for every technique/vendor/chain/term |
| 06 | [06-JOURNAL-DATA.md](06-JOURNAL-DATA.md) | `journal/` collectors + local SQLite timeseries store (address tracking) |
| 07 | [07-JOURNAL-WORKBENCH.md](07-JOURNAL-WORKBENCH.md) | Journal UI, technique simulators (paper-only), CLI |
| 08 | [08-ORCHESTRATION.md](08-ORCHESTRATION.md) | Parallelization plan: lanes, worktrees, zones, waves, merge order |
| 09 | [09-CHAIN-INDEX-PAGES.md](09-CHAIN-INDEX-PAGES.md) | Proposed per-chain hubs, curated article registers, and optional Link Veil |

Specifications 00–08 describe the implemented v3 release. Specification 09 is
a post-release proposal and is not represented as shipped behavior.

**Conventions** follow `~/Code/frauthy/root/specs/` (numbered spine, blockquote
metadata header, numbered H2s, explicit precedence, acceptance section per doc,
worker-card + digest templates, hard conflict-avoidance rules).

**Two hard rules across the whole set:**
1. The page stays one self-contained `index.html`; sub-pages are hash-routed
   overlays; the journal is a separate never-deployed local app.
2. The journal is read-only and paper-only — no keys, no signing, no submission.

Status: **implemented and released as `v3.0` on 2026-08-14.** The append-only
execution record and explicitly skipped external/profile gates are in
`08-ORCHESTRATION.md` §16.

Post-release hardening adds a session access-code console, structural text
containment for termified grid/flex copy, and a 24-note guided-playthrough layer
that spotlights the active target. The access console is a client-side gate for
the static public artifact, not server-side authentication.

The subsequent interaction extensions add pinned Fuse.js 7.5.0, command-channel
behavior/styles, and reader-dock behavior/styles outside the single-file core.
The command channel indexes 135 local records, integrates all five sections, and exposes
global Left/Right cue traversal plus Space autoplay/pause without capturing keys
inside editors, interactive controls, or overlays.

Release snapshot: the page is 403,622 raw bytes, exposes 49 hoverdoc terms, 24
cues, field notes, and 53 unique entity routes. The journal suite passes 36
tests / 332 assertions and its live acceptance database contains three watched
addresses, two public-data paper simulator runs, and two linked journal notes.
