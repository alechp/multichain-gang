# 08 — ORCHESTRATION: parallelizing v3 across agents and worktrees

> **Status:** authoritative execution plan — owns scheduling, file ownership,
> conflict prevention, integration order, and wave gates
> **Date:** 2026-08-13
> **Companion program:** `00-V3-PROGRAM.md`; feature specs `01`–`07`
> **Convention source:** `~/Code/frauthy/root/specs/07-FRONTEND-SDK-ORCHESTRATION.md`
> (waves, file-ownership partition, worktree protocol, worker-card + digest
> templates) and `06-GAP-CLOSURE-ORCHESTRATION.md` (the eight hard-won
> conflict-avoidance rules)

**Precedence:** if this doc conflicts with a feature spec on *what* to build,
the feature spec wins. On *sequencing, file ownership, and git protocol*, this
doc wins.

---

## 0. Objective & invariants

Ship all of v3 with maximum safe parallelism. Three invariants:

1. **`index.html` is one file with many owners — made safe by zones, not luck.**
   Every page lane writes only inside its own uniquely-bannered zone (§4).
   No lane edits another lane's zone. The foundation lane (D) creates all
   zones empty before any consumer starts.
2. **One writer per worktree; one integrator owns merges.** Workers never
   push, merge, rebase, or tag. Integration is a single serialized step (§10).
3. **The journal is a different blast radius.** `journal/` and `index.html`
   never appear in the same worktree; the two tracks run fully independently
   and only meet at the final tag.

## 1. Dependency graph & critical path

```
                 ┌─────────────────────────── PAGE TRACK ───────────────────────────┐
   D (foundation: tokens, primitives, zones, readability fixes)   ← merges FIRST, gates all page lanes
        │
        ├── A (hoverdocs) ─────────┐
        ├── B (playbar) ───────────┤
        ├── C (notes) ─────────────┤──► integrate ► PAGE QA gate ► tag
        └── E-runtime (entity shell)┤
              └── E-c1 / E-c2 / E-c3 (entity content, JSON-only) ─┘

                 ┌───────────────────────── JOURNAL TRACK (independent) ────────────┐
   J1 (schema+store) ──► J2 (collectors) ──► J3 (workbench+sims) ──► JOURNAL QA gate ─┘
```

**Critical path:** D → E-runtime → E-content → integrate (page track); and
J1 → J2 → J3 (journal track). The two tracks are concurrent; the tag waits on
both. D is the tallest early pole — start it alone, merge it, *then* fan out.

## 2. Roles

- **Orchestrator** (you, next session): owns waves, records base SHAs, spawns
  workers, is the **only** actor that commits/merges/pushes. Never writes
  feature code directly except trivial integration glue.
- **Lane worker** (subagent, usually in a worktree): implements one lane inside
  its writable paths/zones; returns a digest; does no git beyond committing on
  its own worker branch when isolation=worktree, else hands back a diff.
- **Read-only verifier** (subagent): runs a lane's acceptance script; never
  edits lane files.

## 3. Concurrency policy

- **Wave-gated fan-out.** Within a wave, run lanes in parallel up to a 4-slot
  scheduler. A lane may not start until its dependency's gate passes.
- **One writer per file region.** Page lanes are disjoint by zone (§4);
  journal lanes are disjoint by directory. E-content lanes are disjoint by
  entity-id range inside the same JSON object → they use **worktrees** (§5)
  because they touch the same file, and the integrator concatenates their JSON
  fragments (§10). No two workers share a git index (frauthy rule).
- **Verification honesty** (frauthy rule, enforced): "should work" is not done;
  a skipped check is reported as skipped, never passed; every digest states
  exact commands + results.

## 4. `index.html` zone map (conflict prevention)

D inserts these empty, uniquely-bannered blocks. Each lane appends ONLY within
its zones. Banners are byte-unique so two branches appending to different zones
never textually conflict.

| Zone banner | Owner | Contents |
|---|---|---|
| `/* ==V3D:CSS== */ … /* ==/V3D:CSS== */` | D | foundation CSS (tokens, primitives, flourishes, readability) |
| `/* ==V3A:CSS== */ …` | A | hoverdoc tooltip styles |
| `/* ==V3B:CSS== */ …` | B | playbar styles |
| `/* ==V3C:CSS== */ …` | C | notes styles |
| `/* ==V3E:CSS== */ …` | E-rt | entity page styles |
| `// ==V3D:JS==` … | D | Overlay/Router/Store/positionOverlay/termify on `window.SCOPE` |
| `// ==V3A:JS==` … | A | termify config + tooltip controller |
| `// ==V3B:JS==` … | B | playbar controller |
| `// ==V3C:JS==` … | C | notes controller |
| `// ==V3E:JS==` … | E-rt | entity router+renderer |
| `<!-- ==V3*:HTML== -->` mount points | resp. lane | bar/drawer/overlay roots (empty divs D stamps) |
| `#chainData` keys | see below | JSON — partitioned by key |

**`#chainData` key ownership** (each lane edits only its keys; keys are
non-overlapping so a merge is a union): `terms` → A; `cues` → B;
(notes needs no data); `entities` → E-content (id-range partitioned: E-c1
techniques+chains, E-c2 tools, E-c3 terms); D may add `_rev`. The integrator
resolves the single `}` boundary if two branches append sibling keys (trivial,
documented in §10).

**Forbidden edits** (frauthy §4.4 analog): no page lane edits journal/; no
journal lane edits index.html; no lane edits another lane's zone or JSON keys;
no worker edits `.gitignore`, README, CLAUDE.md, or docs/ (orchestrator-only,
between waves).

## 5. Git & worktree protocol

This is a **single-repo** project (unlike frauthy's nested repos) — simpler,
but the worktree discipline still applies when lanes touch the same file
concurrently.

1. Record clean base SHA. Create integration branch `feat/v3-<date>` off main.
2. Lanes that touch **disjoint files** (J1/J2/J3 among themselves vs page;
   D alone in wave 0) may run as in-process subagents on the integration
   branch, handing back diffs the orchestrator commits — no worktree needed.
3. Lanes that touch the **same file concurrently** (A/B/C/E-rt all append to
   index.html; E-c1/2/3 all append to `#chainData`) run in **git worktrees**,
   one branch each: `feat/v3-<lane>-<date>`, e.g. `feat/v3-A-hoverdocs`.
   Provision with `git worktree add ../solana-wt-<lane> -b feat/v3-<lane> feat/v3-<date>`.
4. Fingerprint every worktree with `git status --porcelain` before and after;
   abort a lane if it dirtied files outside its zones (frauthy safety property).
5. Workers commit only within their zones, on their own branch. They **do not**
   push, merge, rebase, tag, or touch another worktree.
6. Worktrees live under `~/Code/alechp/` siblings (durable, never `/tmp`).
7. Remove a worktree only after its lane integrates and verifies.
8. Preserve user work: no reset/stash/force-clean without confirming ownership.

## 6. Wave plan

Each wave ends at a **gate** the orchestrator must pass before the next starts.

- **W0 · Foundation (lane D, solo).** Tokens, readability fixes, five
  primitives on `window.SCOPE`, all zones stamped empty, grid popover migrated
  to Overlay. **Gate G0:** `audit-svg-fit.mjs` green; contrast table committed;
  v2 QA matrix re-passes; a two-branch zone-append merge rehearsal produces no
  conflict. Merge D into `feat/v3-<date>`. *Nothing else has started yet.*
- **W1 · Page features (A, B, C, E-runtime in parallel; 4 worktrees).**
  Each builds its zone against the D-merged base. E-runtime ships the shell +
  ~6 new diagram templates + renders from a stub `entities` with 3 seed ids.
  **Gate G1:** each lane's acceptance criteria pass in isolation on its branch
  (verifier runs them); no zone bleed (porcelain fingerprint clean).
- **W1J · Journal data (J1 → J2, sequential; no worktree, disjoint dir).**
  Runs concurrently with W1. **Gate G1J:** 06 acceptance (collect --once on 3
  seed addresses, idempotent rerun, no-signing grep).
- **W2 · Entity content (E-c1, E-c2, E-c3 in parallel; 3 worktrees on
  `#chainData`).** Author all ~56 entities + verify links. Depends on
  E-runtime merged. **Gate G2:** every door resolves; link check 2xx/3xx;
  entity budget ≤ 200 KB.
- **W2J · Workbench (J3).** Depends on J2 gate. **Gate G2J:** 07 acceptance
  (≥2 sims produce entries from live-collected data; export round-trips).
- **W3 · Integration + program QA (orchestrator, serial).** Merge order §10;
  run the full matrix; update docs. **Gate G3:** `00-V3-PROGRAM.md` §4
  definition of done. Tag `v3.0`, push, verify Pages.

## 7. Lane ledger (writable paths / deps / isolation)

| Lane | Writable | Read-only | Isolation | Depends |
|---|---|---|---|---|
| D | index.html (V3D zones + token block), scripts/audit-*.mjs | all else | in-process | — |
| A | index.html (V3A zones, `terms` key) | D zones | worktree | D |
| B | index.html (V3B zones, `cues` key) | D zones | worktree | D |
| C | index.html (V3C zones) | D zones | worktree | D |
| E-rt | index.html (V3E zones, entity shell/router) | D zones | worktree | D |
| E-c1 | `#chainData.entities` (techniques+chains) | E-rt shell | worktree | E-rt |
| E-c2 | `#chainData.entities` (tools) | E-rt shell | worktree | E-rt |
| E-c3 | `#chainData.entities` (terms) | E-rt shell | worktree | E-rt |
| J1 | journal/ (db, migrations, schema) | — | in-process | — |
| J2 | journal/src/sources, collect, normalize | J1 db.ts | in-process | J1 |
| J3 | journal/web, journal/src/sim, cli | J1/J2 | in-process | J2 |

## 8. Worker card template (hand each lane exactly this)

```
LANE: <id>            WAVE: <W#>            BASE SHA: <sha>
Worktree: <path or "in-process on feat/v3-<date>">
Branch:   <feat/v3-<lane> or n/a>
Objective: <one sentence>
Authoritative spec: docs/v3/<NN>-<NAME>.md  (sections: <list>)
Writable paths/zones: <exact zone banners and/or JSON keys and/or dirs>
Read-only paths: <list>
Forbidden: any file/zone/key not listed writable; git push/merge/rebase/tag;
           another lane's worktree or index
Shared primitives to CONSUME (never redefine): window.SCOPE.{Overlay,Router,
           Store,positionOverlay,termify}
Commands to run before handoff: <acceptance script(s)>
Definition of done: <spec's acceptance section, pasted>
Stop conditions: ZONE_MISSING (D hasn't stamped it) · PRIMITIVE_MISSING ·
           SCOPE_BLEED (would need to edit outside writable) · LINK_DEAD (E-c) —
           on any, stop and report, do not improvise across the boundary
```

## 9. Worker completion digest (every lane returns this)

```
## <lane> · <wave>
- base/head: <sha>..<sha or "diff attached">
- implemented: <spec sections + zones/keys touched>
- files/zones written: <exact list>
- zones/keys intentionally untouched: <list proving no bleed>
- porcelain before/after: <clean/clean + any expected paths>
- acceptance: <script name → pass/fail/skip with counts>
- degradation checked: <reduced-motion / cdn-blocked / js-off results>
- budget: <KB added to index.html or journal>
- blockers/follow-ups: <explicit or "none">
```

The orchestrator rejects a digest that says only "works", omits commands, or
can't show zone isolation.

## 10. Integration & merge order

Serial, orchestrator-only:

1. **D** already merged (W0).
2. **E-runtime** → integration branch (entity shell before its content).
3. **A, B, C** in any order — disjoint zones, each merge is a clean zone-append.
   Resolve the one `#chainData` closing-brace hunk by hand if two added sibling
   keys (`terms`, `cues`): the union is mechanical.
4. **E-c1, E-c2, E-c3** → merge the three `entities` fragments; since ids are
   partitioned, the merged object is a key union (no id collisions by design —
   verify with a dup-id check before committing).
5. Run `termify()` idempotence + full QA matrix after each page merge, not just
   at the end (catch bleed early).
6. **Journal track** merges as a unit once J3's gate passes (own directory,
   no interleave with page merges).
7. One integration commit per lane with its digest in the message; no lockfile
   for the page (no deps); `journal/bun.lock` regenerated once by the
   integrator, never by a worker.

## 11. Verification matrix

- **Fast lane (every merge):** `audit-svg-fit.mjs`, contrast check, termify
  idempotence, console-error scan.
- **Page final:** 360/390/430/768/1200 × {motion, reduced-motion, CDN-blocked,
  JS-off}; deep-link a random `#/e/<id>` on a cold load; play the full cue run;
  place+export+reimport a note; open a dock and confirm terms bind once.
- **Journal final:** 06 + 07 acceptance end to end on live-collected data;
  no-signing grep; token-sync check.
- **Cross-product:** page weight ≤ 420 KB; Pages deploy byte-matches HEAD.

## 12. Efficiency & conflict rules (frauthy §12 + §5, adapted — the hard-won set)

1. One writer per zone/key/dir, ever. 2. Freeze primitives (D) before fan-out;
consumers never redefine them. 3. Generate shared/JSON-boundary files once, by
the integrator. 4. No worker runs git beyond committing its own branch.
5. Interface before consumer (E-runtime before E-content; D before all).
6. No shared build/`node_modules`/`data/` dir between concurrent worktrees;
journal worktrees (if any) get their own `data/`. 7. Ephemeral localhost ports
only (`journal serve` default 7817; pick free). 8. Verification honesty:
skipped ≠ passed; report exact results. 9. Preserve user work: no reset/stash/
force-clean/worktree-remove without confirming ownership.

## 13. Stop conditions & escalation

A worker hitting `ZONE_MISSING`, `PRIMITIVE_MISSING`, `SCOPE_BLEED`, or
`LINK_DEAD` posts its digest with the blocker and stops — it does not reach
across a boundary to "just fix it". The orchestrator resolves (usually: the
dependency wave wasn't actually gated) and re-dispatches. Two failed attempts
on the same lane → orchestrator takes the lane in-process.

## 14. Program definition of done

`00-V3-PROGRAM.md` §4, plus: this doc's §16 ledger has one record per lane;
worktrees removed; both tracks tagged into `v3.0`.

## 15. If run by a single session instead of a fleet

Collapse to sequential waves, same order, no worktrees (one branch, commit per
lane): D → E-rt → {A,B,C} → {E-c1,2,3} → integrate/QA → tag; J1 → J2 → J3 in
between page waves when blocked on QA. The zone map still prevents you from
tangling features in one commit. This is the realistic default for the next
session (see the handoff in the chat response).

## 16. Execution ledger (append-only; one record per lane as it lands)

```
## <lane> · <wave> · <date>
- base..head: <sha>..<sha>
- digest: <path or inline>
- gates passed: <G#>
- follow-ups: <...>
```
_(empty until execution begins)_
