# 07 — Implementation orchestrator

> **Execution model:** one root integrator + three parallel workers  
> **Repository:** `github.com/alechp/multichain-gang`  
> **Local root:** `/Users/alechp/Code/alechp/multichain-gang`

## 1. Mission and hard constraints

Implement `00`–`06` completely at `/multichain/robinhood/source/`, including
exhaustive commit-pinned trees, reviewed excerpts, five-axis comparison, auth,
responsive/accessibility behavior, and automated release gates.

Every agent must obey:

```text
DO NOT EDIT multichain/solana/**
DO NOT EDIT multichain/robinhood/.solana-baseline.sha256
NO live browser dependency on GitHub, RPC, wallet, or brokerage APIs
NO claim that upstream Nitro defaults are Robinhood production configuration
NO push, deploy, force operation, destructive reset, or history rewrite by a worker
ONE file owner at a time
```

The root integrator alone edits shared navigation/audit surfaces, integrates
commits, runs the final suite, pushes, and deploys when authorized.

## 2. Roles and file ownership

| Role | Branch | Exclusive writable paths |
|---|---|---|
| Root integrator | `feature/robinhood-source` | existing Robinhood navigation pages; `scripts/audit-multichain-gang.mjs`; `./run`; orchestration notes; conflict resolution only |
| Worker A — source data | `agent/rh-source-data` | `scripts/refresh-robinhood-source.mjs`; `scripts/validate-robinhood-source.mjs`; `multichain/robinhood/source/data/**` |
| Worker B — page/runtime | `agent/rh-source-ui` | `multichain/robinhood/source/index.html`; `styles/**`; `scripts/**` below that source directory |
| Worker C — QA/adversarial | `agent/rh-source-qa` | `scripts/audit-robinhood-source.mjs`; new source-specific test fixtures/reports only |

Workers may read everything. They may not “help” by editing another owner's
files. If a change is needed, send a handoff request naming file, proposed
change, reason, and acceptance test. Root either assigns it to the owner or
applies it during serial integration.

Existing shared files are root-only:

```text
multichain/robinhood/index.html
multichain/robinhood/chains/index.html
multichain/robinhood/tools/index.html
scripts/audit-multichain-gang.mjs
scripts/audit-robinhood-scope.mjs
scripts/audit-global-chrome.mjs
run
```

Avoid edits to shared `multichain/site.css`, `multichain/auth.*`, and global
chrome unless a proven cross-site defect makes them necessary. Prefer local
Source CSS/runtime.

## 3. Serial wave 0 — freeze inputs

Root performs this before spawning workers:

1. Confirm clean working tree or inventory user-owned changes without touching
   them.
2. `git fetch origin` and record `BASE_SHA=$(git rev-parse HEAD)` in the run log.
3. Confirm `origin` is `https://github.com/alechp/multichain-gang.git`.
4. Run existing audits and record the protected Solana checksum result.
5. Re-open current Robinhood full-node docs and confirm Nitro image
   `v3.11.2-3599aca`; if changed, pause data generation and update research.
6. Freeze data schema version `1`, repository ledger, featured IDs H01–H08,
   secondary IDs H09–H13, six systems, and five axis IDs.
7. Create integration branch and worktrees:

```sh
git switch -c feature/robinhood-source
git worktree add /private/tmp/mg-rh-source-data -b agent/rh-source-data "$BASE_SHA"
git worktree add /private/tmp/mg-rh-source-ui -b agent/rh-source-ui "$BASE_SHA"
git worktree add /private/tmp/mg-rh-source-qa -b agent/rh-source-qa "$BASE_SHA"
```

No agent begins until root sends the frozen schema contract from `02` and the
exclusive file list.

## 4. Parallel wave 1 — foundations

Run three agents concurrently.

### Worker A card — deterministic source pipeline

Read `00`, `01`, `02`, `03`, `05`, and `06`. Implement:

- ledger-as-code input inside the refresh script or a generated manifest;
- GitHub tree traversal with explicit `truncated` fallback;
- complete census, gitlink resolution, path validation, deterministic sharding,
  local registration format, digests, search-path indexes, artifacts, and build
  manifest;
- highlight extraction/digest validation and comparison-path validation;
- fixtures sufficient for UI development before the full remote refresh;
- validator with actionable repo/path/hotspot failure messages.

Wave-1 exit:

```sh
node --check scripts/refresh-robinhood-source.mjs
node --check scripts/validate-robinhood-source.mjs
node scripts/validate-robinhood-source.mjs --fixtures
```

Commit only owned files and return commit SHA, generated schema example, test
output, open questions, and counts. Do not push.

### Worker B card — semantic source workbench

Read `00`, `02`, `03`, `04`, `05`, and `06`. Implement against the frozen
fixture contract:

- authenticated semantic page shell and static authored chapter fallbacks;
- industrial code-cartography styling at all breakpoints;
- local registration loader, repository groups, incremental accessible tree,
  local path/symbol search, filters, breadcrumbs, inspector, syntax treatment,
  notebook, hash router, and comparison view;
- source-local overlay controller; reuse standalone `select-ui.js`, not Scope's
  element-coupled runtime;
- all Escape/outside-click/focus-return/reduced-motion contracts;
- authored loading/error/unavailable-source states.

Wave-1 exit:

```sh
node --check multichain/robinhood/source/scripts/runtime.js
node --check multichain/robinhood/source/scripts/tree.js
node --check multichain/robinhood/source/scripts/inspector.js
node --check multichain/robinhood/source/scripts/compare.js
```

Serve the worktree and manually smoke 390/1200 px with fixtures. Commit owned
files and return SHA, test output, screenshots/notes, and data-contract issues.
Do not edit navigation or push.

### Worker C card — independent audit harness

Read every spec, existing audit helpers, and current auth/global overlay audits.
Implement a source-specific Playwright/static audit that initially fails
against the base and can consume fixtures. Cover `06` without copying product
logic into tests. Include safe-sink checks, exact counts/IDs, auth, file mode,
tree keyboard behavior, routes/history, overlay dismissal/focus, comparison,
responsive overflow, missing shards, reduced motion, and Solana boundary input.

Wave-1 exit:

```sh
node --check scripts/audit-robinhood-source.mjs
node scripts/audit-robinhood-source.mjs --self-test
```

Commit owned files and return SHA, expected pre-integration failures, test
matrix, and any ambiguous acceptance criteria. Do not weaken a test to fit the
implementation and do not push.

## 5. Serial integration gate 1

Root waits for all three cards, reviews ownership, then cherry-picks in order:

1. Worker A schema/pipeline;
2. Worker B page/runtime;
3. Worker C audit.

Resolve contract mismatches explicitly; do not edit generated data by hand.
Run fixture mode. Root then adds Source navigation to the three Robinhood pages,
adds the Source page to `audit-multichain-gang.mjs`, and optionally prints its
local URL from `./run`. Root runs:

```sh
node scripts/validate-robinhood-source.mjs --fixtures
node scripts/audit-robinhood-source.mjs --fixtures
node scripts/audit-multichain-gang.mjs
git diff --name-only "$BASE_SHA"..HEAD -- multichain/solana
```

Do not start remote generation until the diff is empty and fixture contracts
pass. Rebase each worker branch onto the integration head before wave 2.

## 6. Parallel wave 2 — full content

### Worker A — exhaustive generation

- Reconfirm documented Nitro pin and resolve every ledger SHA.
- Generate all included repository trees, including every Nitro direct gitlink.
- Fail/expand any truncated tree; record final entries/blobs/trees/gitlinks.
- Populate all H01–H13 records and verify exact line digests/licenses.
- Add exact comparison paths at all six pinned client SHAs.
- Capture Robinhood CDN artifact digests separately from GitHub trees.
- Run generator twice and prove identical release digest.

Do not promote an integration to deployed without its independent evidence.
For H06, preserve the deployed UniswapX commit separately from the current
full-tree integration commit. If remote rate limits prevent completion, report
the exact repository/cursor; never check in partial data as exhaustive.

### Worker B — real-data integration

- Consume generated manifests without changing their schema.
- Verify huge-tree incremental behavior, gitlink transitions, hidden categories,
  ordinary metadata-only blobs, all hotspot routes, and all comparison cells.
- Tune virtualized/pruned DOM and payload loading to `06` budgets.
- Finish static authored text and evidence legend using the verified records.
- Complete keyboard, screen-reader, forced-colors, and responsive polish.

Do not duplicate generated content into HTML except the required semantic
fallback/featured summaries.

### Worker C — adversarial full-data QA

- Run full static/browser/data tests on each worker's integration candidate.
- Corrupt a copied shard, remove a route, inject hostile path text, force a
  missing comparison path, and confirm failures are authored/safe.
- Test 320/360/390/430/768/1200/1440, JS-off, file mode, network blocked,
  reduced motion, forced colors, and 200% zoom.
- Record budget measurements and accessibility findings without editing product
  files. Send defect cards to root and the owning worker.

Each worker commits only owned paths and sends a final handoff. Root does not
integrate until all blockers are either fixed by their owner or documented as
release-stopping.

## 7. Defect card protocol

```text
ID:
SEVERITY: blocker | high | normal
OWNER:
SPEC / ACCEPTANCE:
REPRO COMMANDS:
OBSERVED:
EXPECTED:
FILES REQUESTED:
EVIDENCE:
```

The file owner fixes and adds a regression test when within owned paths.
Cross-owner changes are two commits, one per owner. Root resolves genuine
shared-file issues serially.

## 8. Serial integration gate 2

Root cherry-picks data, UI, and QA commits; regenerates from source rather than
resolving generated conflicts manually; then runs every command in `06`.
Required final facts:

```text
tree responses truncated: 0
unresolved gitlinks: 0
invalid hotspot digests: 0
comparison paths missing: 0
featured / secondary highlights: 8 / 5
systems / axes: 6 / 5
runtime network dependencies for core content: 0
Solana changed files: 0
```

Root reviews the diff for unsafe `innerHTML`, source/license over-copying,
deployment overclaims, Timeboost implication, double multiplier application,
and `block.number` misuse. Root runs `git status --short` and confirms every
file belongs to the task.

## 9. Parallel wave 3 — independent release verification

After integration, the three workers perform read-only final reviews in
parallel:

- A: reproduce source counts/digests from the build manifest.
- B: visual/accessibility review and responsive screenshots.
- C: clean-clone full audit with network-blocked browser pass.

They return `PASS` or a defect card—never edits. Root is the only writer during
this wave.

## 10. Release and handoff

Root produces a concise release record containing:

- base/final commit and generated release digest;
- repository/tree/path/gitlink counts;
- all source pins and research cutoff;
- excerpt and comparison totals;
- exact test commands/results and measured budgets;
- known public-source gaps and stale/volatile records;
- the empty protected Solana diff;
- local URL: `http://127.0.0.1:4173/multichain/robinhood/source/`.

Only after all gates pass may root commit, push to `origin`, and run the existing
production deployment workflow under the user's established authorization.
Workers never push/deploy. If deployment is not part of the active request,
stop after the verified local handoff.

## 11. Completion checklist

- [ ] Every spec `00`–`06` is implemented or a blocker is reported.
- [ ] Exhaustive means all entries in every admitted pinned repository.
- [ ] Private/unpublished boundaries are visible.
- [ ] Eight featured excerpts are focused, immutable, licensed, and measured.
- [ ] Five secondary notes are accessible.
- [ ] Cross-chain view has six systems/five axes/no ranking.
- [ ] Auth, Escape, outside click, focus, responsive, and offline behavior pass.
- [ ] Existing Robinhood pages link Source.
- [ ] Solana Scope and all `multichain/solana/**` files are untouched.
- [ ] Root alone integrates and, when authorized, releases.
