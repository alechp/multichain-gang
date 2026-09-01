# 00 — Program and source boundary

> **Depends on:** existing Robinhood Scope specs in `docs/robinhood-scope/`  
> **Route:** `/multichain/robinhood/source/`  
> **Page label:** `SOURCE//ROBINHOOD CHAIN`

## 1. Product contract

The Source page is a code cartography instrument, not a conventional GitHub
mirror. The exhaustive tree answers **where is the relevant source?** The
reviewed excerpts answer **what does this code teach an engineer measuring
latency, freshness, execution certainty, and infrastructure cost?**

The page follows the Multichain Gang formula:

1. Robinhood is the fixed baseline;
2. evidence and uncertainty are visible, not buried in footnotes;
3. a dense hero introduces the system model;
4. authored chapters isolate one engineering plane at a time;
5. focused interactive readouts supplement semantic static content;
6. normalized cross-chain comparison uses equivalent fields; and
7. every material claim resolves to a dated primary source.

## 2. Why the boundary matters

There are four different things a reader may incorrectly call “Robinhood
source.” The UI and data model must keep them separate.

| Tier | Label in UI | Meaning | Deployment claim allowed? |
|---|---|---|---|
| A | `ROBINHOOD-PUBLISHED ARTIFACT` | First-party docs, chain-info/genesis files, endpoints, addresses, and the documented Nitro image/version pin. | Only the fact Robinhood published or documented it. |
| B | `PINNED RUNTIME SOURCE` | The exact public Nitro tag and gitlink revisions corresponding to the documented node image. | It is source for the public node build; it is not proof of private sequencer configuration or patches. |
| C | `OFFICIAL INTEGRATION SOURCE` | Public code from the protocol organization for a Robinhood-relevant integration, such as UniswapX, Chainlink Data Streams, or ERC-8056. | Only when the primary source separately records deployment; otherwise “implementation/reference.” |
| D | `COMPARISON SOURCE` | Official client repositories used only to explain analogous code paths on other systems. | Never a Robinhood deployment claim. |

Community repositories may appear only in the research ledger as excluded or
as a separately reviewed `COMMUNITY REFERENCE` record. They are not included in
the first-release explorer tree, no matter how polished or popular they look.

## 3. Research universe and exhaustiveness

“Exhaustive” has two precise meanings in this program:

### 3.1 Exhaustive repository search

The research pass must cover:

- all public repositories in the verified `robinhoodmarkets` and legacy
  `robinhood` GitHub organizations;
- every GitHub URL on every current Robinhood Chain documentation route;
- the versioned source attached to the Nitro image Robinhood documents;
- every git submodule in that exact Nitro revision, including duplicate
  repository pins at distinct SHAs;
- official integration repositories directly required to explain Stock Token
  multipliers, low-latency price streams, and Robinhood-specific execution
  clocks;
- official client repositories used by the cross-chain source comparison; and
- the complete GitHub `robinhood-chain` topic census as a candidate universe,
  with unaffiliated projects excluded by policy rather than silently ignored.

This does **not** mean every repository returned by a keyword search is safe or
authoritative. Search completeness and publication inclusion are separate.

### 3.2 Exhaustive tree coverage

For every repository admitted to the explorer tree, every Git tree entry at
the pinned revision is cataloged. Hidden-by-default categories remain
searchable and can be revealed. Completeness ends at repository contents and
gitlinks; dependency-manager transitive repositories are represented by their
lockfile/module records, not recursively cloned into an unbounded universe.

The page must render its exact contract near the tree:

```text
COMPLETE FOR THE PINNED REPOSITORY SET · NOT A CLAIM OF PRIVATE DEPLOYED CODE
```

## 4. Required page chapters

| ID | Chapter | Core question |
|---|---|---|
| `src-00` | Provenance | What source is public, who owns it, and what can it prove? |
| `src-01` | Feed edge | How do feed replay, sequence continuity, reconnects, redundant origins, and relays affect freshness? |
| `src-02` | Ingress and ordering | Where do connection reuse, forwarding, queueing, nonces, filtering, and block assembly create latency or rejection? |
| `src-03` | State confidence | How does a node distinguish feed-ahead soft state, L1-confirmed messages, safe/finalized parent state, and reorgs? |
| `src-04` | Fees and execution | How do compressed bytes, L1 poster cost, gas estimation, caches, and database behavior affect performance and cost? |
| `src-05` | Market-data clock | How should observations, validity, expiry, market state, and Stock Token multipliers be reconciled? |
| `src-06` | Application clock | Why can L2 block height, parent block estimate, and wall time disagree, and what does that do to block-decay orders? |
| `src-07` | Cross-chain lens | Which source paths express the analogous constraint on the other five systems? |

Each chapter contains:

- a one-sentence engineering claim;
- one compact mechanism diagram or readout;
- one to three reviewed excerpts;
- a `MEASURE THIS` card;
- an evidence/caveat strip;
- a deep link to the selected file and hotspot; and
- a semantic text/table equivalent.

## 5. Quant-performance editorial rules

The page is for engineers building measurement and execution infrastructure.
It may explain:

- transport latency, variance, packet/connection loss, queue delay, and
  redundant reads;
- nonce serialization, idempotency, retry classification, and replacement
  hazards;
- soft-state versus posted/finalized-state promotion;
- feed gaps, duplicate/out-of-order records, and data freshness watermarks;
- RPC batching, cache hit rates, disk I/O, archive-state tradeoffs, and
  observability;
- calldata size/compressibility and the L1 data component of fees;
- timestamp, L1 block estimate, L2 height, and market-session boundaries; and
- the correctness consequences of Stock Token multiplier transitions.

It must not:

- promise profit or execution priority;
- describe exploit procedures, sandwich victims, sanctions evasion, or ways to
  bypass sequencer screening;
- tell users to disable signature, chain-ID, TLS, or source validation to gain
  speed;
- present upstream defaults as production settings;
- treat a provider response timestamp as exchange time, oracle observation
  time, sequencing time, or finality time without labeling it; or
- turn a code excerpt into an order-entry control.

Use “optimization question,” “measurement,” “failure mode,” and “engineering
tradeoff,” not “alpha,” “winning,” or “guaranteed edge.”

## 6. Authentication and read-only safety

The document body must include:

```html
data-auth-scope="ROBINHOOD / SOURCE" data-chain="robinhood"
```

Load `../../auth.css` and `../../auth.js` using paths correct for the new
directory. Match the current fail-closed no-JavaScript access warning. The
source data, excerpts, search index, and comparison data do not load before the
auth controller grants the session in normal browser use.

The page contains no form that accepts a private key, seed phrase, brokerage
credential, RPC API key, wallet address for action, or signed transaction.
External GitHub links use the existing Link Veil behavior when applicable and
always show their destination domain.

## 7. Protected Solana boundary

Implementation may read Solana pages and existing comparison data but may not
edit:

```text
multichain/solana/**
multichain/robinhood/.solana-baseline.sha256
```

Do not add `Source` to Solana navigation, do not create
`/multichain/solana/source/`, and do not rewrite shared CSS merely for aesthetic
parity if a Robinhood-local rule suffices.

Release requires both:

```sh
node scripts/audit-robinhood-scope.mjs
git diff --name-only <base-sha>..HEAD -- multichain/solana
```

The second command must print nothing.

## 8. Frozen route and deep-link contract

Canonical page:

```text
/multichain/robinhood/source/
```

Deep links:

```text
#/repo/<repo-id>
#/repo/<repo-id>/path/<percent-encoded-path>
#/hotspot/<hotspot-id>
#/compare/<axis-id>
```

Unknown or removed IDs render a local not-found state with links to the tree
root and research ledger; they never throw or redirect away. Back/Forward
restores selection, expanded ancestors, active filters, and inspector scroll
where feasible. Search text is serialized only when shorter than 120
characters and contains no secrets.

## 9. Evidence states

Every repository, artifact, excerpt, and comparison record has one state:

```text
confirmed · version-pinned · upstream-reference · integration-reference
documented-absence · not-public · conflicted · volatile · comparison-only
```

`documented-absence` means the reviewed primary material explicitly says a
feature is absent. `not-public` means no qualifying public source was found.
`not-documented` is used for behavioral claims not addressed by docs. These
states must never be collapsed into a blank cell or a generic “N/A.”

## 10. Acceptance summary

- One new Robinhood-only authenticated route.
- Complete, immutable repository trees for the frozen included set.
- At least 12 and no more than 18 reviewed hotspot records.
- At least one hotspot for each chapter `src-01` through `src-06`.
- Six-system comparison across exactly five normalized axes.
- No live GitHub dependency for core reading.
- No unqualified deployment claim.
- No Solana file change.
