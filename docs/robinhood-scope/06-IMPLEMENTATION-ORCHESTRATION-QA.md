# 06 — Implementation, orchestration, verification, and release

> **Status:** executed 2026-08-31; release candidate implemented
>
> **Research baseline:** 2026-08-31 (America/Los_Angeles)
>
> **Depends on:** specifications `00`–`05` in this directory
>
> **Release ledger:** [releases/2026-08-31/README.md](releases/2026-08-31/README.md)

## 0. Delivery decision

Build the Robinhood edition as a standalone static page at:

```text
/multichain/robinhood/
```

The public artifact is `multichain/robinhood/index.html`. It may reuse proven local
foundations from the Solana edition, but it must own its authored content,
figures, baseline data, no-JavaScript mirrors, source ledger, and regression
audit. The existing root `index.html` remains the Solana edition.

The page is complete only when a reader can use either edition independently.
The Robinhood page must not depend on visiting the Solana page first, loading
live RPC data, accepting cookies, connecting a wallet, or reaching a CDN.

This implementation is an educational, read-only instrument. No phase in this
plan authorizes wallet discovery, signing, transaction construction,
simulation-to-submit behavior, API keys, brokerage data, or order entry.

## 1. Governing decisions

The following are frozen for the first release:

| Decision | Contract |
|---|---|
| Public path | `/multichain/robinhood/` |
| Public title | `SCOPE//ROBINHOOD CHAIN` |
| Baseline | Robinhood Chain |
| Comparators | Solana, Bitcoin, Ethereum, BNB Chain, Zcash |
| Context-only inherited system | Arbitrum One; use only when explaining Nitro inheritance, never as a seventh dock column |
| Channels | CH-01 topology, CH-02 transaction flow, CH-03 MEV/order flow, CH-04 latency, CH-05 cross-chain bench |
| Authored transport | 26 cues |
| Baseline time model | soft, posted, final, withdrawal |
| Evidence model | `confirmed`, `derived`, `inferred`, `documented-absence`, `not-documented`, `conflicted`, `volatile` |
| Runtime model | static files; no application server or required build step |
| Content source | inline `#chainData`, with exact static mirrors |
| Network dependency | none for core teaching content |
| User-write behavior | none in release 1 |

Changes to these decisions require a written entry in the release ledger and a
corresponding update to every affected topical spec before code changes merge.

## 2. Proposed file layout and ownership

```text
robinhood/
├── index.html                         standalone semantic document and #chainData
├── styles/
│   └── scope.css                      page, figures, routes, responsive, print
├── scripts/
│   ├── runtime.js                     overlays, router, storage-safe preferences
│   ├── figures.js                     clock/trace/figure progressive enhancement
│   ├── compare.js                     comparison docks, grid, tool bench
│   ├── reader.js                      26-cue authored transport
│   ├── references.js                  Hoverdocs, sources, entity routes
│   └── command.js                     local command/search channel
└── assets/
    └── README.md                      provenance for any approved local asset

scripts/
├── audit-robinhood-scope.mjs          content, data, route, source, and mirror gate
├── audit-robinhood-scope-fit.mjs      viewport, SVG, overflow, and overlay gate
└── audit-robinhood-scope-degrade.mjs  JS-off/CDN/storage/motion failure gate
```

The implementation may consolidate the local JavaScript files after profiling,
but ownership boundaries must remain explicit in source comments and tests.
Do not put Robinhood-first records into the root page's `#chainData` merely to
avoid creating the standalone dataset.

### 2.1 Reuse policy

Reuse is preferred for mechanisms that already satisfy the contract:

- overlay focus management;
- hash routing and history restoration;
- safe storage wrapper;
- reader transport keyboard rules;
- local Fuse.js build and its license;
- command-palette interaction grammar;
- source-card positioning;
- chain atlas route contract; and
- static global navigation geometry.

Rebase rather than copy for:

- all hero markup and copy;
- channel figures;
- comparison data and baseline ordering;
- entity/source records;
- cue targets and authored takeaways;
- semantic fallback tables; and
- visual tokens that encode Robinhood-specific clocks and control planes.

Shared code must not reach into a page-specific lexical variable. Expose only
small documented primitives under `window.SCOPE`; page-specific controllers
must work when optional shared assets are absent.

### 2.2 One-writer rule

During implementation, assign one writer to each path or byte-unique zone.
The most collision-prone file is `multichain/robinhood/index.html`; stamp these zones
before parallel feature work begins:

```text
RS-FOUNDATION: CSS / HTML / JS
RS-CONTENT:    HTML / JSON
RS-COMPARE:    HTML / JSON / JS
RS-ROUTES:     HTML / JSON / JS
RS-NOSCRIPT:   HTML
```

Only the integration owner edits the document shell, closes JSON boundaries,
updates the release ledger, or changes shared files outside `robinhood/`.

## 3. Dependency graph

```text
R0 source refresh + contract freeze
 └─► R1 semantic shell + tokens + inline schema
      ├─► R2 authored channels + eight figures ─┐
      ├─► R3 comparator docks + bench data ─├─► R5 integrate + exact mirrors
      └─► R4 routes + references + reader ───┘       │
                                                       └─► R6 QA + release
```

R0 and R1 are serial. R2, R3, and R4 may proceed in parallel only after the
schema, tokens, stable IDs, and empty mount points from R1 are integrated. R5
is serial because it joins one semantic document and certifies that the static
and enhanced representations are the same publication.

## 4. Implementation waves

### R0 — Source refresh and contract freeze

Tasks:

1. Re-open every first-party Robinhood source in `01`.
2. Record response state, current page title, checked date, and substantive
   changes in the source ledger.
3. Re-fetch the published chain configuration and verify chain ID, parent
   chain, gas token, and official endpoints.
4. Reconcile any change to finality language, governance thresholds, validator
   policy, public RPC limitations, current bridges, Stock Token mechanics,
   oracle handling, terms, and brand rules.
5. Check load-bearing inherited behavior against primary Arbitrum, Uniswap,
   Chainlink, and EIP sources.
6. Resolve or retain the documented ecosystem conflict; do not choose a venue
   name from convenience.
7. Freeze IDs, titles, 26 cues, comparator order, eight technique rows, seven
   tool functions, 24 Hoverdocs terms, and the entity minimum.

Gate `G0` evidence:

- dated source ledger diff;
- zero unlabelled conflicts;
- a list of volatile records requiring `AS OF` labels;
- approved public title and independence notice; and
- a content freeze checksum or reviewed snapshot of `#chainData` inputs.

If a load-bearing first-party source is unavailable or materially conflicts
with another, the associated headline claim fails closed. It may appear only
on the methodology route as `conflicted` until reconciled.

### R1 — Foundation and semantic shell

Tasks:

1. Create the `/multichain/robinhood/` static document with skip link, landmarks, chapter
   navigation, hero, five channel sections, methodology/footer, overlays, and
   empty route mount.
2. Define stable IDs for every section, figure, cue target, comparator, term,
   source, and entity.
3. Add design tokens and static first paint. The HTML must be understandable
   before any JavaScript executes.
4. Add the complete top-level `#chainData` schema with valid placeholder arrays
   and schema revision.
5. Add safe runtime primitives: focus-managed overlay, hash router, storage
   wrapper, overlay positioning, termification hook, and optional animation
   registry.
6. Vendor no new dependency unless its license, exact version, local fallback,
   and removal path are documented.

Gate `G1`:

- HTML parses without duplicate IDs;
- all five ordinary section anchors work with JavaScript disabled;
- no console errors with optional scripts and fonts blocked;
- page has no wallet or transaction surface;
- foundation primitives are keyboard testable; and
- `#chainData` parses and passes a schema-only audit.

### R2 — Robinhood-first authored content and figures

Tasks:

1. Implement the hero copy, four-clock bar, hero trace, and four dated
   readouts from `02`.
2. Implement CH-01 stack/control-plane figure and constants readout.
3. Implement CH-02 receipt-to-Ethereum signal path and EVM/Nitro readout.
4. Implement both CH-03 figures: the FCFS transport race and the visibility /
   protection map.
5. Implement the CH-04 log-scale ladder and data-to-execution field notes.
6. Implement the CH-05 technique grid and function bench shells; R3 owns their
   comparison records.
7. Author all context cards, caveats, source affordances, and screen-reader
   figure summaries.

Gate `G2`:

- eight primary surfaces are present: hero, CH-01, CH-02, CH-03 ×2, CH-04,
  CH-05 grid, and CH-05 bench;
- the four clocks never collapse into one label or scale mark;
- withdrawal appears as a related but separate lane;
- every visual fact resolves to a source/fact record;
- all diagrams survive 200% zoom and reduced motion; and
- each figure has a static semantic equivalent that is meaningful on its own.

### R3 — Cross-chain comparison and bench

Tasks:

1. Implement four comparison docks with Robinhood Chain pinned as baseline.
2. Use dock `chainOrder` and CH-05 `benchCols` exactly as defined in `04`;
   they intentionally preserve two different orders from the existing page.
3. Populate topology, transaction-flow, MEV, and latency matrices using
   normalized axes rather than chain marketing labels.
4. Populate all 48 technique cells: eight rows by six systems.
5. Populate the seven-function tool bench without implying partnership,
   deployment, volume, safety, or endorsement from a documentation listing.
6. Add cell/delta detail panels with state, rationale, source, checked date,
   and uncertainty.
7. Add explicit `NOT DOCUMENTED`, `DOCUMENTED ABSENCE`, `CONFLICTED`, and
   `N/A` states. Empty cells are invalid.

Gate `G3`:

- four docks contain exactly six systems each;
- every baseline delta is Robinhood-first;
- 48 technique cells and seven tool functions validate;
- Arbitrum One never becomes an implicit seventh comparator;
- latency rows compare equivalent milestones or state the mismatch;
- no score, rank, trophy, aggregate winner, or throughput-only conclusion is
  present; and
- the enhanced grids and static tables have identical labels and state values.

### R4 — References, routes, search, and authored transport

Tasks:

1. Implement all required Hoverdocs terms and source cards.
2. Implement entity routes, Robinhood Chain hub route, tool route,
   methodology route, sources route, and shared chains route behavior.
3. Build the local command index from records, not hand-maintained duplicate
   arrays.
4. Implement all 26 read-through cues with stable targets and authored
   takeaways.
5. Restore focus and scroll position correctly across hash route navigation.
6. Preserve ordinary `#ch1`–`#ch5` behavior and deep-link startup.
7. Ensure every external link exposes a human-readable source title and host.

Gate `G4`:

- 26 cues resolve to visible, unique targets;
- required term and entity minimums pass;
- every source/fact/entity/relation ID resolves;
- browser Back/Forward restores route, focus destination, and useful scroll;
- command results distinguish section, cue, entity, tool, chain, term, and
  source records;
- prohibited aliases never render; and
- all routes have standalone page titles and a path back to the main document.

### R5 — Static mirrors and integration

Tasks:

1. Generate or author the no-JavaScript topology, flow, MEV, latency,
   technique, tool, glossary, source, and entity-index mirrors.
2. Integrate R2–R4 against the same frozen dataset.
3. Remove all placeholder records, empty routes, duplicate IDs, orphaned CSS,
   and unreachable command results.
4. Confirm the independence notice, research snapshot, methodology link, and
   last-checked state are visible without opening an overlay.
5. Run the root page's existing audits to prove the new directory has not
   regressed the Solana edition or shared navigation.

Gate `G5`:

- static/enhanced parity audit is exact;
- all local links resolve under both a server and direct-file viewing where
  supported by the current site contract;
- the new path does not intercept root hash routes;
- no root-page count or search-index assertion changes accidentally; and
- the production artifact contains no draft label, source conflict hidden as
  fact, or future implementation note.

### R6 — Release candidate and publication

Tasks:

1. Run the automated gate in section 8.
2. Complete the manual viewport/failure matrix in section 9.
3. Perform technical, editorial, brand, legal, accessibility, and security
   reviews using the sign-off matrix in section 11.
4. Capture release evidence and record every skipped external check as
   `SKIPPED`, never `PASS`.
5. Publish the static path, smoke-test the deployed URL, then repeat critical
   deep-link, no-JavaScript, and blocked-CDN checks against production.

Gate `G6` is the definition of done in section 12.

## 5. Stable IDs and invariants

Stable IDs are public API. Use kebab-case and never derive them from display
copy at runtime.

Required prefixes:

| Record | Prefix/example |
|---|---|
| Section | `ch1`, `ch2`, `ch3`, `ch4`, `ch5` |
| Figure | `fig-hero`, `fig-1-1`, `fig-3-2` |
| Cue | `cue-01` through `cue-26` |
| Source | `src-rh-finality`, `src-arb-nitro` |
| Fact | `fact-rh-soft-confirmation` |
| Entity | semantic slug, e.g. `bold`, `ui-multiplier` |
| Term | semantic slug, e.g. `soft-confirmation` |
| Comparator detail | `<section>-<chain>-<axis>` |
| Technique | existing shared technique slug |
| Tool function | existing shared function slug |

Renaming display text must not break bookmarked entity routes, cue targets, or
fact/source relationships. Removed IDs remain as redirect aliases for at least
one release unless the ID itself violated the brand rules.

These assertions are non-negotiable:

```text
channels === 5
primarySurfaces === 8
compareDocks === 4
systemsPerDock === 6
techniques === 8
techniqueCells === 48
toolFunctions === 7
cues === 26
requiredTerms >= 24
requiredRobinhoodEntities >= 17
unresolvedReferences === 0
duplicateIds === 0
```

Counts measure structural completeness, not factual truth. Source state and
claim validation remain independent gates.

## 6. Content and evidence lint rules

The Robinhood audit must fail on:

- visible `Hood Chain`, `HOOD Chain`, `RHC`, or other invented shorthand;
- a title that puts an apparent Robinhood mark ahead of the project's identity;
- a Stock Token sentence that implies equity ownership or unrestricted primary
  issuance/redemption;
- `sub-second finality` without the word `soft` in the same semantic unit;
- treating the canonical withdrawal delay as a transaction-finality stage;
- saying FCFS, screening, a private endpoint, or no documented public mempool
  eliminates MEV;
- saying higher gas buys earlier placement on the documented FCFS sequencer;
- claiming multiple RPC providers decentralize sequencing;
- treating an ecosystem listing as evidence of deployment, liquidity, safety,
  volume, or endorsement;
- multiplying a multiplier-adjusted onchain Stock Token feed again;
- conflating a raw underlier REST price with multiplier-adjusted token value;
- an undated volatile count, address, version, provider list, or performance
  number;
- a fact record with no source, checked date, state, and rendering rule;
- an inferred claim rendered without an inference label; or
- a comparison milestone that silently changes meaning across systems.

The following strings are prohibited from production code except inside tests
that assert their absence or prose explaining the non-goal:

```text
eth_sendRawTransaction
sendTransaction
signTransaction
signTypedData
privateKeyToAccount
walletClient
window.ethereum.request
```

Also scan for secret-shaped assignments, embedded API keys, wallet connectors,
transaction calldata builders, and forms whose action can reach an external
service. The page does not need a content-security exception for a feature it
does not have.

## 7. Test fixtures

Automated tests must use deterministic fixtures that cover:

1. a fully confirmed, stable fact;
2. a volatile deployment/version fact with checked date;
3. a derived value with formula and inputs;
4. an inference with required label;
5. a documented absence;
6. an undocumented capability;
7. a first-party conflict suppressed from headline use;
8. a missing or unreachable optional CDN asset;
9. blocked local storage and corrupt saved preferences;
10. a route loaded directly before runtime initialization;
11. a long source title and an unbroken contract address;
12. a screen-reader figure summary with motion disabled;
13. a comparator record whose milestones are not equivalent; and
14. a venue that is documented but has no liquidity measurement.

Do not use live RPC or API availability as a deterministic release test. Live
checks are a separate dated observation and may be `SKIPPED` without converting
architectural facts into test failures.

## 8. Automated verification

Add a single umbrella command for the standalone page:

```sh
node scripts/audit-robinhood-scope.mjs
```

It must run or import focused assertions for:

- HTML validity relevant to the static contract, unique IDs, landmarks, and
  heading order;
- `#chainData` JSON parsing and schema revision;
- all counts in section 5;
- source/fact/entity/term/relation referential integrity;
- source checked dates and volatile labels;
- four-clock terminology and separation;
- comparator order, matrices, technique cells, and tool functions;
- 26 cue IDs, targets, titles, and takeaways;
- route and command-index completeness;
- exact static/enhanced mirror values;
- full-name and prohibited-shorthand checks;
- prohibited wallet/signing/submission API scan;
- local asset existence and dependency licenses; and
- independence notice and methodology/source affordances.

Run the standalone visual/degradation gates:

```sh
node scripts/audit-robinhood-scope-fit.mjs
node scripts/audit-robinhood-scope-degrade.mjs
```

Then run the existing root regression suite documented in the repository
README. At minimum:

```sh
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
```

Any audit that requires an unavailable browser, network, profile, or external
service reports the prerequisite and `SKIPPED`. It must not silently exit zero
with a success label.

## 9. Manual QA matrix

Test each viewport in normal motion and reduced motion:

```text
360 × 800
390 × 844
430 × 932
768 × 1024
1200 × 900
1440 × 1000
```

At 360, 390, 430, 768, and 1200, also test:

| Mode | Required result |
|---|---|
| JavaScript enabled | all enhancements usable; semantic source remains visible |
| JavaScript disabled | all teaching tables, glossary, sources, and entity index available |
| CDN blocked | local content/search fallback and static figures remain usable |
| Storage denied | no crash; preference changes remain session-local |
| Corrupt storage | bad value discarded; default behavior restored |
| Reduced motion | no autoplay; manual cue stepping and static states work |
| 200% zoom | no loss of content, focus, or control labels |
| Keyboard only | logical order, visible focus, trapped modal focus, reliable Escape return |
| Touch only | no hover-only fact/source access |
| High contrast/forced colors | state is not encoded by color alone |

For every mode, verify:

- no document-level horizontal overflow;
- any intentional inner grid scroller is labeled and keyboard reachable;
- fixed chrome does not cover headings, focus targets, source cards, or route
  close controls;
- four clock labels remain adjacent to their meanings;
- baseline/compare state is announced, not just recolored;
- source cards stay within the visual viewport;
- Back/Forward preserves useful reading position;
- a deep entity or methodology URL is understandable on first load; and
- the independence notice and source snapshot are discoverable without search.

## 10. Editorial and technical review scripts

### 10.1 Technical walkthrough

A reviewer should be able to answer from the page, with the source cards:

1. Who currently orders accepted transactions?
2. What can a full node independently verify?
3. What is the current validator participation policy for BoLD?
4. Which guarantee exists at soft receipt, L1 posting, and Ethereum finality?
5. Why is canonical withdrawal a separate clock?
6. Why can transport latency matter under FCFS?
7. Which EVM assumptions change under Nitro/ArbOS?
8. Which Stock Token price surface is multiplier-adjusted?
9. What happens when the sequencer uptime feed is down or recovering?
10. Which ecosystem claims are known, unknown, or merely documented support?

Any answer that requires guessing exposes a content or interaction defect.

### 10.2 Cross-chain review

For each comparator, have a second reviewer inspect one row from every matrix
and answer:

- Are the milestones actually comparable?
- Does the delta start from Robinhood Chain rather than from an implicit
  Ethereum/Solana default?
- Is mechanism separated from outcome?
- Is an absence correctly distinguished from missing documentation?
- Is the source primary and current enough for the claim?
- Would the same evidence rule be applied if the comparison favored another
  chain?

### 10.3 Brand and legal review

Review every title, masthead, metadata string, social preview, favicon, asset,
disclaimer, Stock Token description, venue mention, and metric. Confirm:

- `Multichain Gang` remains the primary identity;
- Robinhood Chain is written in full;
- no Robinhood or synthetic logo was created or modified;
- the independence notice is conspicuous;
- Stock Tokens are accurately described as tokenised debt securities giving
  economic exposure rather than ownership of underlying shares;
- public-company ticker references are absent; and
- metrics have method, period, source, and appropriate separation from other
  Robinhood businesses.

## 11. Sign-off and release evidence

Required reviewers and evidence:

| Review | Required evidence |
|---|---|
| Protocol correctness | Reviewed claim/source export; all conflicts and unknowns dispositioned |
| Cross-chain methodology | Four matrices and 48 cells reviewed by normalized axis |
| Editorial | Full 26-cue read-through and all visible caveats approved |
| Accessibility | Automated results plus completed keyboard/touch/zoom/motion matrix |
| Visual QA | Screenshots at six target viewports and overflow report |
| Brand/legal | Title, notice, marks, terminology, Stock Token language, and metric treatment approved |
| Security/privacy | Prohibited API scan; dependency/license report; no keys, wallet, telemetry, or external form |
| Regression | Standalone audits and root Solana audit suite results |
| Production smoke | Deployed root, five anchors, representative entity, methodology, sources, JS-off, CDN-blocked |

Store the release record in this document or a dated companion under
`docs/robinhood-scope/releases/`. It must include:

```text
release:
commit:
published_at:
research_checked_at:
reviewers:
commands_and_results:
manual_matrix:
skipped_checks_and_reasons:
known_unknowns:
volatile_records_next_review:
production_urls:
rollback_commit:
```

## 12. Definition of done

The Robinhood Scope page is done only when all of the following are true:

- `/multichain/robinhood/` is a standalone, source-linked, Robinhood-first publication;
- the five-channel and 26-cue formula matches the Solana Scope instrument;
- all eight primary surfaces teach the correct Robinhood Chain mechanism;
- soft confirmation, posting, Ethereum finality, and withdrawal are visibly
  distinct everywhere;
- four comparator docks and the CH-05 bench contain exactly the approved six
  systems with no synthetic winner;
- every load-bearing rendered claim has a current evidence record and state;
- every known conflict or unknown is labelled or suppressed, never guessed;
- entity, source, methodology, search, deep-link, and history behavior passes;
- JavaScript-off fails closed with an access warning because the static gate
  cannot verify the operator code without JavaScript;
- accessibility, responsive, motion, storage, and CDN-failure gates pass;
- the page contains no wallet, signing, submission, secret, brokerage, or
  trading behavior;
- Robinhood naming, mark, metric, and independence rules pass review;
- the existing Solana edition and shared routes pass their regression suite;
- production smoke tests pass; and
- the release ledger contains exact evidence, skips, unknowns, and rollback.

Passing the visual review without the evidence gates is not done. Passing the
data audits with an unreadable mobile or no-JavaScript experience is also not
done. The release is one coherent instrument in every supported mode.

## 13. Rollback and maintenance

Because publication is static, rollback is a redeploy of the last verified
commit. Preserve the prior `/multichain/robinhood/` artifact until the production smoke
test passes. Do not patch live copy outside version control.

After release:

- re-check volatile records monthly for the first three months, then quarterly
  unless documentation cadence warrants more frequent review;
- re-check terms and brand guidelines before every material redesign;
- re-check finality, governance, validator policy, node requirements, Stock
  Token APIs, oracle guidance, official provider/bridge lists, and chain
  configuration before every release;
- open a correction immediately for a safety-relevant documentation change;
- retain checked dates and previous values in release history; and
- never replace a stale sourced value with an unsourced live observation.

If a critical claim becomes conflicted after publication, remove it from the
headline/figure, mark it conflicted in methodology, and republish. If the
independence notice or brand presentation becomes noncompliant, unpublish the
standalone path until corrected.
