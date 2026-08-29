# 10 — Chain Tools multi-agent implementation orchestration

## 1. Objective

Implement [the v4 Chain Tools specification set](./README.md) with parallel agents in isolated Git worktrees, integrate through one release coordinator, pass all existing and new regression gates, push `main`, and verify the GitHub Pages deployment.

This is an execution document, not permission to loosen project constraints. `journal/` remains local-only and out of scope. No wallet, signing, construction, or transaction-submission feature is authorized.

## 2. Concurrency model

Assume four active-agent slots: one root integrator plus three workers. Run work in waves of at most three concurrent worker lanes. A worker may be reassigned in the next wave only after its prior branch is committed and clean.

Principles:

- one worktree per branch;
- one owner per file in a wave;
- workers do not push, deploy, merge, rebase shared branches, or edit `main`;
- the root integrator owns cross-cutting files and all final Git/network actions;
- worker commits are small, named, and self-tested;
- no agent changes `journal/**`;
- unrelated user changes are preserved.

## 3. Preflight and base freeze

Release coordinator from the primary worktree:

```sh
git status --short
git branch --show-current
git fetch origin
git pull --ff-only origin main
git rev-parse HEAD
git worktree list
```

Stop if the primary tree has unexplained edits, if `main` cannot fast-forward, or if a worktree target already exists with unknown content. Record the base SHA in the release ledger at the end of this document.

Before agents start, confirm the v4 specs and all six PNG masters are present. They are the frozen product contract. A worker may flag a contradiction but may not silently rewrite the contract to fit an implementation shortcut.

## 4. Worktree creation

Use sibling directories so generated files and test servers cannot collide with the primary tree:

```sh
git worktree add ../solana-wt-tools-data -b feat/chain-tools-data main
git worktree add ../solana-wt-tools-ui -b feat/chain-tools-ui main
git worktree add ../solana-wt-tools-qa -b test/chain-tools-audit main
```

Later waves add or reuse branches only after the preceding worktree is clean. If reusing agents but not branches, create:

```sh
git worktree add ../solana-wt-tools-sol -b feat/chain-tools-solana main
git worktree add ../solana-wt-tools-eth -b feat/chain-tools-ethereum main
git worktree add ../solana-wt-tools-bnb -b feat/chain-tools-bnb main
```

Bitcoin, Zcash, and Robinhood Chain use equivalent `btc`, `zec`, and `rhc` names in the next batch. Never use `git reset --hard` to recycle a worktree. Remove a completed worktree only after its commit is integrated and its clean state is verified.

## 5. Worker handoff card

Every assignment message includes:

```text
Goal:
Spec inputs:
Worktree:
Branch:
Owned files:
Forbidden files:
Required tests:
Acceptance evidence:
Commit message:
Stop conditions:
```

Every worker response includes:

```text
Outcome:
Commit SHA:
Files changed:
Tests run and exact result:
Spec decisions/deviations:
Known follow-ups:
Worktree clean: yes/no
```

“Looks good” is not acceptance evidence. Give counts, routes, assertions, or screenshots.

## 6. Wave 1 — foundations

Run three lanes concurrently.

### Lane 1A — taxonomy and canonical data

- Worktree/branch: `../solana-wt-tools-data`, `feat/chain-tools-data`
- Owner: data architect

Owned files:

```text
data/chain-tools/taxonomy.json
data/chain-tools/canonical-tools.json
scripts/validate-chain-tools-data.mjs
```

Tasks:

1. Encode the exact 17 categories from [01](./01-TAXONOMY-AND-EVIDENCE.md).
2. Create stable canonical IDs for every tool named in specs 03–08.
3. Normalize definitions, categories, official/docs links, and aliases.
4. Reject duplicate IDs, unsafe URLs, unknown categories, and summaries over 160 characters.
5. Allow chain placement files to be absent during this foundation commit but validate them when present.

Forbidden: `index.html`, chain placement JSON, `scripts/chain-tools.js`, styles, command palette, existing audits.

Required gate:

```sh
node scripts/validate-chain-tools-data.mjs --allow-missing-placements
node --check scripts/validate-chain-tools-data.mjs
git diff --check
```

Commit: `feat(chain-tools): add taxonomy and canonical catalog`

### Lane 1B — renderer and interaction shell

- Worktree/branch: `../solana-wt-tools-ui`, `feat/chain-tools-ui`
- Owner: frontend systems engineer

Owned files:

```text
scripts/chain-tools.js
styles/chain-tools.css
```

Tasks:

1. Implement wrapper and chain renderer behind a mount API, using fixture data local to the module during this wave.
2. Implement semantic table, filtering, sorting, URL state, row details, Hoverdocs, compare tray, and existing Link Veil preference integration.
3. Reuse `SCOPE.Overlay`, `SCOPE.Store`, `SCOPE.positionOverlay`, and router lifecycle primitives; do not redefine them.
4. Implement reduced-motion, touch, keyboard, no-image, and narrow-width behavior.
5. Expose a narrow integration API for the root integrator; do not edit `index.html`.

Forbidden: `index.html`, data catalog, assets, command palette, chain-index files, audits.

Required gate:

```sh
node --check scripts/chain-tools.js
git diff --check
rg -n "ethereum\.request|signTransaction|sendTransaction|sendRawTransaction" scripts/chain-tools.js
```

The prohibited-API search must return no actionable wallet/submission code.

Commit: `feat(chain-tools): add landscape renderer and tables`

### Lane 1C — asset derivatives and visual manifest

- Worktree/branch: `../solana-wt-tools-qa`, `test/chain-tools-audit` for this wave only, or a dedicated `feat/chain-tools-assets` branch if a fourth worker is available later.
- Owner: visual asset engineer

Owned files:

```text
assets/chain-tools/*-960.webp
assets/chain-tools/*-1440.webp
assets/chain-tools/manifest.json
scripts/check-chain-tools-assets.mjs
```

Tasks:

1. Derive 960px and 1440px WebP files from the supplied PNG masters without modifying masters.
2. Preserve aspect ratio and verify all six crops.
3. Target <=220 KB per derivative; record dimensions, byte size, source, and SHA-256 in manifest.
4. Add a script that fails on missing masters/derivatives, bad dimensions, excessive byte size, or manifest mismatch.

Forbidden: page code, data files, existing assets, `index.html`.

Required gate:

```sh
node scripts/check-chain-tools-assets.mjs
git diff --check
```

Commit: `feat(chain-tools): add responsive topology assets`

## 7. Foundation gate and merge

The integrator reviews the three commits, then merges them in order: data, assets, UI. Use non-fast-forward merges to preserve lane history:

```sh
git merge --no-ff feat/chain-tools-data
git merge --no-ff feat/chain-tools-assets
git merge --no-ff feat/chain-tools-ui
```

If Lane 1C used `test/chain-tools-audit`, rename or create a clean asset branch before merge; do not mix incomplete audit fixtures into the asset commit.

Run:

```sh
node scripts/validate-chain-tools-data.mjs --allow-missing-placements
node scripts/check-chain-tools-assets.mjs
node --check scripts/chain-tools.js
git diff --check
```

Only after this gate should chain placement workers branch from the new integrated SHA.

## 8. Wave 2A — Solana, Ethereum, BNB Chain data

Create three branches/worktrees from the integrated foundation SHA. Run concurrently.

| Lane | Owned file | Spec | Commit |
|---|---|---|---|
| 2A-SOL | `data/chain-tools/solana.json` | [03](./03-SOLANA-TOOLS.md) | `data(chain-tools): add Solana landscape` |
| 2A-ETH | `data/chain-tools/ethereum.json` | [04](./04-ETHEREUM-TOOLS.md) | `data(chain-tools): add Ethereum landscape` |
| 2A-BNB | `data/chain-tools/bnb-chain.json` | [05](./05-BNB-CHAIN-TOOLS.md) | `data(chain-tools): add BNB Chain landscape` |

Each worker:

1. Transcribes every inventory row and every native gap.
2. Uses canonical IDs; if one is missing, reports it instead of editing `canonical-tools.json`.
3. Preserves exact scope/status/evidence distinctions.
4. Runs the validator scoped to its chain.
5. Adds no “best,” sponsored, or quantitative ranking.

Required gate:

```sh
node scripts/validate-chain-tools-data.mjs --chain <slug>
git diff --check
```

Merge order: Solana, Ethereum, BNB Chain. Resolve missing canonical IDs through one follow-up commit owned by the data architect, never ad hoc in three branches.

## 9. Wave 2B — Bitcoin, Zcash, Robinhood Chain data

Run the next three lanes concurrently from the integrated Wave 2A SHA.

| Lane | Owned file | Spec | Commit |
|---|---|---|---|
| 2B-BTC | `data/chain-tools/bitcoin.json` | [06](./06-BITCOIN-TOOLS.md) | `data(chain-tools): add Bitcoin landscape` |
| 2B-ZEC | `data/chain-tools/zcash.json` | [07](./07-ZCASH-TOOLS.md) | `data(chain-tools): add Zcash landscape` |
| 2B-RHC | `data/chain-tools/robinhood-chain.json` | [08](./08-ROBINHOOD-CHAIN-TOOLS.md) | `data(chain-tools): add Robinhood Chain landscape` |

Extra stop conditions:

- BTC: do not label Babylon, THORChain, sidechains, or wrapped BTC as native Bitcoin DeFi.
- ZEC: do not label draft ZSAs production; `transparent only` must be structured data on MAYA/NEAR placements.
- RHC: do not fabricate L1-posted/final observations from sequencer evidence; do not turn partner rows into unverified deployments.

Merge order: Bitcoin, Zcash, Robinhood Chain, then one full data validation.

```sh
node scripts/validate-chain-tools-data.mjs
```

## 10. Wave 3 — integration, static mirror, and audit

Run three carefully separated lanes.

### Lane 3A — root route and static integration

Owner: root integrator only

Owned files:

```text
index.html
```

Tasks:

- add `#/tools` and six chain-tool mount points;
- load local CSS/JS/data safely;
- add global nav and footer anchors;
- add exact JavaScript-off compact tables and gap statements;
- register data with existing `#chainData` without destabilizing entity counts;
- keep the access gate and static navbar behavior unchanged.

Commit: `feat(chain-tools): integrate routes and static mirrors`

### Lane 3B — command palette and chain-hub links

Worktree/branch: dedicated `feat/chain-tools-navigation`

Owned files:

```text
scripts/command-palette.js
scripts/chain-index.js
styles/chain-index.css    # only if a visible action needs styling
```

Tasks:

- index wrapper, six pages, categories, aliases, and tools;
- add `Tool landscape` anchor to every existing chain hub;
- preserve current command shortcuts and index-size assertions through computed counts;
- reuse existing Link Veil state rather than adding another toggle.

Commit: `feat(chain-tools): connect navigation and search`

### Lane 3C — audit suite

Worktree/branch: `test/chain-tools-audit`

Owned files:

```text
scripts/audit-chain-tools.mjs
```

Tasks:

- implement every automated contract in [09 §17](./09-DATA-INTERACTION-VISUALS.md#17-automated-audit-contract);
- use Playwright at 360/390/430/768/1200 plus 200% zoom, reduced motion, CDN blocked, and JS-off;
- keep exact counts computed from source files, not stale literals;
- test ordinary visible links before Link Veil states;
- prohibit wallet/signing/submission APIs in Chain Tools sources.

Commit: `test(chain-tools): add landscape regression matrix`

Integration order: root route/static, navigation, audit. The audit branch may require a final rebase onto the fully integrated code, performed by its owner or the integrator with no behavior changes hidden in the test commit.

## 11. Wave 4 — independent review

Assign three review roles with read-only-first instructions:

1. **Data reviewer** — compares every rendered count/row/gap against specs 01 and 03–08; checks source URLs and scope/status traps.
2. **UX/accessibility reviewer** — keyboard, screen reader semantics, touch, Hoverdocs, Link Veil, comparison, 200% zoom, contrast, and motion.
3. **Regression reviewer** — existing chains/readers/command palette/access gate/no-JS behavior and prohibited API scan.

Reviewers report findings before editing. Fixes return to the owning lane where practical. Cross-cutting fixes are isolated commits with the issue named.

## 12. Full release gate

From the primary integrated tree:

```sh
node scripts/validate-chain-tools-data.mjs
node scripts/check-chain-tools-assets.mjs
node scripts/audit-foundation.mjs
node scripts/audit-svg-fit.mjs
node scripts/audit-contrast.mjs
node scripts/audit-readability.mjs
node scripts/audit-degradation.mjs
node scripts/audit-command-channel.mjs
node scripts/audit-robinhood-chain.mjs
node scripts/audit-chain-index.mjs
node scripts/audit-chain-tools.mjs
git diff --check
git status --short
```

Also manually inspect:

- `#/tools` and all six routes at 360, 390, 430, 768, and 1200px;
- every generated visual crop;
- keyboard-only search/filter/sort/details/compare flow;
- Hoverdoc with mouse, keyboard, and touch emulation;
- Link Veil off, on, Control-held, focus bypass, and blur cleanup;
- back/forward restoration with filters and `?tool=` deep links;
- JavaScript off and blocked CDN;
- no document-level horizontal overflow;
- every footer/command/chain-hub route.

Any skipped check is recorded `SKIPPED` with reason, never `PASS`.

## 13. Stage, commit, push, and deploy

Only the release coordinator performs these actions after the full gate.

```sh
git status --short
git add index.html data/chain-tools scripts/chain-tools.js scripts/command-palette.js scripts/chain-index.js scripts/audit-chain-tools.mjs scripts/validate-chain-tools-data.mjs scripts/check-chain-tools-assets.mjs styles/chain-tools.css styles/chain-index.css assets/chain-tools docs/v4 README.md CLAUDE.md
git diff --cached --check
git diff --cached --stat
git commit -m "feat: publish chain tooling landscapes"
git push origin main
```

Do not use `git add .` in a dirty tree. Do not stage `journal/data`, credentials, generated caches, unrelated changes, or worktree metadata.

GitHub Pages publishes the repository root from `main`. Deployment verification:

```sh
gh api repos/alechp/solana/pages
gh run list --limit 10
curl -I -L https://alechp.github.io/solana/
```

Then open the live site with cache busting and verify `#/tools`, one dense chain (Solana), one scope-sensitive chain (Bitcoin), one gap-heavy chain (Zcash), and Robinhood Chain. Compare the deployed commit SHA/source against local `HEAD`. A successful push is not a successful deployment until the live asset and routes are verified.

If Pages is delayed, monitor the deployment rather than issuing duplicate commits. If live behavior differs, stop and diagnose before declaring complete.

## 14. Stop conditions

Stop a lane and notify the integrator when:

- a source no longer supports a spec placement;
- canonical IDs or category semantics conflict;
- a product’s current state cannot be established from first-party evidence;
- a requested edit crosses another lane’s owned file;
- existing uncommitted user changes overlap the target;
- a responsive derivative visibly corrupts or crops the subject incorrectly;
- test success requires weakening an existing assertion;
- an implementation would add signing/submission behavior;
- the release branch is not a fast-forward of current remote `main`;
- deployment target or source branch differs from the recorded Pages configuration.

## 15. Release ledger template

Append after implementation:

```text
Base SHA:
Foundation merges:
Chain data merges:
Integration merges:
Final release commit:
Remote main SHA:
Pages source/config:
Deployment run/status:
Live verification timestamp:
Live routes checked:
Automated gates:
Manual viewports/modes:
Skipped checks and reasons:
Known follow-ups:
```

Completion means the data is sourced, the pages are navigable and accessible, the full regression suite passes, `main` is pushed, and the live GitHub Pages site serves the verified release.
