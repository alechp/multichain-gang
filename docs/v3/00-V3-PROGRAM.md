# SOLANA//SCOPE v3 — Interactive Instrument Program

> **Status:** implemented — released as `v3.0` on 2026-08-14
> **Date:** 2026-08-13
> **Base:** `index.html` at v2 (commit `4514fbb`), live at https://alechp.github.io/solana/
> **Companion orchestration:** `08-ORCHESTRATION.md` owns scheduling, file ownership, and merge order
> **Convention source:** spec/orchestration structure follows `~/Code/frauthy/root/specs/` conventions

---

## 0. Objective

v2 made the page a five-channel readout. v3 makes it an **instrument you operate
and a bench you work at**: hover any term and the scope explains it; press play
and it reads itself; click anywhere and leave a note; open any technique or
vendor and get a dedicated deep-dive channel; and alongside the page, a local
**journal** application where techniques are mock-applied against real public
chain data pulled into a local timeseries store.

Three invariants carry over from v2 and bind every v3 spec:

1. **The page stays a single self-contained HTML file.** Sub-pages are
   hash-routed overlay views, not files. The journal is a separate local app in
   `journal/` and never ships to Pages.
2. **All content lives in the `#chainData` JSON block** (terms, entities, cues
   included). Content edits never require layout edits. `<noscript>` mirrors
   grow in lockstep.
3. **Every feature degrades**: reduced motion, anime-CDN failure, and JS-off
   keep all *content* reachable (interactive affordances may vanish; information
   may not).

## 1. Spec map

| # | Spec | Deliverable | Depends on |
|---|------|-------------|------------|
| 01 | `01-HOVERDOCS.md` | Hover/tap documentation system: term tooltips, remote links | 04 (tokens), shared overlay primitive |
| 02 | `02-PLAYBAR.md` | Read/play-through transport bar with cue system | 04 |
| 03 | `03-NOTES.md` | Click-in-place notes with local persistence + export | 04 |
| 04 | `04-STYLE-READABILITY.md` | Readability/fit defect burn-down + distinctiveness pass; shared v3 primitives | — (foundation) |
| 05 | `05-ENTITY-PAGES.md` | Hash-routed entity sub-pages (techniques, tools, chains, terms) | 04; 01 links into it |
| 06 | `06-JOURNAL-DATA.md` | `journal/` data plane: collector + local tsdb (SQLite) | — (independent of page) |
| 07 | `07-JOURNAL-WORKBENCH.md` | Journal UI, technique simulators (mock-apply), CLI | 06 |
| 08 | `08-ORCHESTRATION.md` | Parallelization plan: lanes, worktrees, ownership, merge order | all above |

**Precedence:** these specs are authoritative for v3 scope. Where a v3 spec
conflicts with `docs/solana-scope-v2-spec.md`, the v3 spec wins for v3 features
and the v2 spec continues to govern v2 behavior it does not touch. Where any
spec conflicts with `08-ORCHESTRATION.md` on *what* to build, the feature spec
wins; on *sequencing and file ownership*, the orchestration doc wins.

## 2. Shared v3 runtime primitives (built once, in the 04 foundation lane)

Every interactive spec (01/02/03/05) consumes these; none may re-implement them:

- **`Overlay`** — one focus-trapped layer manager used by tooltips-as-toggletips
  (01), entity pages (05), and the notes drawer (03). Owns: open/close stack,
  Esc handling, focus restore, scroll lock, bottom-sheet variant under 700px.
  Grid popovers (v2 `.tpop`) migrate onto it.
- **`Router`** — `location.hash` routes: `#/e/<entity-id>` (05), `#/cue/<n>`
  (02 deep links). History-aware close. No route → no-op. Unknown route →
  silent ignore (never breaks section anchors like `#ch3`).
- **`Store`** — namespaced localStorage wrapper with in-memory fallback
  (private-mode safe), versioned keys (`scope.v3.<ns>`), JSON schema guard.
  Used by 02 (resume point), 03 (notes).
- **`termify()`** — text-node scanner that wraps known term aliases in
  `<button class="term">` bindings (01) inside JS-rendered content; explicit
  `data-term` markup wins over the scanner; scanner never touches `<a>`,
  `<code>`, headings, or SVG text.
- **Zone map** — `index.html` gains delimited, uniquely-bannered CSS/JS/JSON
  insertion zones per spec (see `08-ORCHESTRATION.md` §4) so parallel lanes
  merge without textual conflicts.

## 3. Fact and safety policy

- Page figures remain illustrative, dated, `~`-marked when volatile (v2 policy).
- Entity pages cite **primary sources** (official docs, explorers, research
  posts); every external link is `rel="noopener noreferrer"`, opens a new tab,
  and is visibly marked `↗`.
- The journal is **read-only against public data and paper-only**: no private
  keys, no signing, no transaction submission, anywhere in `journal/`. Sources
  prefer public JSON-RPC and documented public APIs; HTML scraping is a
  last-resort adapter that respects robots.txt and a global politeness rate
  limit (`06-JOURNAL-DATA.md` §5).

## 4. Program definition of done

- All eight specs implemented; each spec's own acceptance section passes.
- v2 QA gate still passes on the page: 360/390/430/768/1200 ×
  {motion, reduced motion, CDN blocked, JS off} — now including the 04
  automated fit + contrast audits at every width.
- Page weight budget: `index.html` ≤ 420 KB raw (v2 is 150 KB; 01+02+03 ≤ 40 KB
  combined, 05 ≤ 200 KB with all entity content, 04 ≤ 30 KB).
- `journal/` runs end-to-end locally: `bun run collect` populates the tsdb for
  at least 3 watched addresses; workbench UI renders their timelines; at least
  2 technique simulators produce journal entries from live-collected data.
- Live Pages deploy byte-matches local HEAD; README and CLAUDE.md updated;
  execution ledger in `08-ORCHESTRATION.md` §16 records every lane.

## 5. Release record

The final integrated page is 403,622 raw bytes and passes the foundation,
SVG-fit, contrast, and 15-case degradation audits. A cold-load sweep covered all
53 unique entity ids at 390 and 1200 pixels with the CDN blocked; route anatomy,
focus return, console cleanliness, no-script parity, and document overflow pass.

The journal passes 36 tests / 332 assertions, token synchronization, CLI build,
and prohibited-wallet-API scans. Live public collection populated three seeded
addresses plus Jito tip-floor metrics. `priority-fee-sweep` and
`jito-tip-band` produced two saved `PAPER · HYPOTHETICAL` runs with linked notes
and a Markdown export.

Three specification arithmetic/external-profile exceptions are recorded rather
than disguised as passes:

- the 53-entity unique union is the specified 56 category entries minus three
  intentional term/tool id overlaps (`mev-boost`, `shredstream`, `firedancer`);
- the 01+02+03 40 KB sub-budget is incompatible with the required 49-entry term
  corpus plus the two individually capped 12 KB controls; the hard 420 KB page
  budget passes with 16,378 bytes to spare;
- the physical mid-range 4× CPU paint profile and a continuous 30-minute public
  RPC watch were skipped. Public RPC throttling/backoff and recovery are covered
  deterministically; the live run recorded successful backfills and Jito data,
  plus upstream RPC 429s without any write-path or safety failure.
