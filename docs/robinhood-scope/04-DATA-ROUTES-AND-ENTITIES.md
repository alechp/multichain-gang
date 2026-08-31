# 04 — Data, evidence, routes, Hoverdocs, and entity channels

## 0. Data decision

The standalone page remains a static document with no runtime content API.
All authored page data lives in one inline block:

```html
<script type="application/json" id="chainData">…</script>
```

Using the same ID lets the proven Scope primitives—compare docks, playbar,
Hoverdocs, entity renderer, command index, and audits—operate without parallel
implementations. The Robinhood page has its own document and therefore no ID
collision with `index.html`.

Runtime code may read the existing verified chain-tools catalog for the
`#/tools/robinhood-chain` route, but the five main chapters do not depend on a
network request or an external JSON fetch.

## 1. Top-level schema

```json
{
  "schemaVersion": 1,
  "page": {},
  "sources": {},
  "facts": {},
  "sectionOrder": [],
  "sectionOf": {},
  "sections": {},
  "sectionMetrics": {},
  "baseline": {},
  "chainOrder": [],
  "chains": {},
  "benchCols": [],
  "techniques": [],
  "tools": [],
  "terms": {},
  "entities": {},
  "articles": {},
  "cues": []
}
```

Required page metadata:

```json
{
  "page": {
    "id": "scope-robinhood-chain",
    "title": "SCOPE//ROBINHOOD CHAIN",
    "revision": "2026-08-31",
    "researchCutoff": "2026-08-31T23:59:59-07:00",
    "baselineChainId": "robinhood_chain",
    "independent": true,
    "telemetry": false,
    "legalReviewRequired": true,
    "editorialNotice": "Independent educational research; not an endorsement, investment recommendation, or completeness guarantee."
  }
}
```

`revision` identifies content; it is not current time. The UI never displays a
fake live clock or increments a block/transaction counter without telemetry.

## 2. Source records

Every load-bearing fact points to one or more source records:

```json
{
  "sources": {
    "rh-finality": {
      "title": "Transaction Finality",
      "publisher": "Robinhood Chain",
      "url": "https://docs.robinhood.com/chain/transaction-finality/",
      "kind": "official-docs",
      "retrievedAt": "2026-08-31T18:00:00-07:00",
      "publishedOrUpdated": null,
      "https": true,
      "primary": true,
      "volatility": "high",
      "refreshDays": 7,
      "claims": ["fact-rh-soft", "fact-rh-posted", "fact-rh-final"]
    }
  }
}
```

Allowed `kind` values:

```text
official-docs · official-announcement · official-terms · official-config
primary-repository · primary-standard · explorer · status
```

Rules:

- only HTTPS URLs pass unless a legal source itself publishes HTTP and the
  page clearly labels it;
- redirects are resolved and the final canonical URL stored at verification;
- source pages are linked, never iframe-embedded;
- `status` pages authorize current incident state only, not historical uptime
  claims without exported/methodological evidence;
- one source cannot silently authorize a claim outside its `claims` list; and
- partner documentation may confirm its own deployment/surface but cannot
  override Robinhood's chain-level configuration.

## 3. Fact records

Fact record:

```json
{
  "facts": {
    "fact-rh-soft": {
      "claim": "The sequencer soft-confirmation stage is typically sub-second.",
      "display": "<1 s typ.",
      "value": 1000,
      "unit": "ms-upper-bound-for-visualization",
      "kind": "typical-latency",
      "status": "confirmed",
      "asOf": "2026-08-31",
      "sourceIds": ["rh-finality"],
      "caveat": "Not a fixed block interval, SLA, L1 posting, or Ethereum finality.",
      "volatile": true
    }
  }
}
```

Allowed `status`:

```text
confirmed · derived · inferred · documented-absence · not-documented
conflicted · deprecated
```

Allowed `kind` includes:

```text
identity · endpoint · contract · version · count · protocol-rule
typical-latency · legal-definition · integration-support · editorial-inference
```

Rules:

- `derived` includes `formula` and `inputFactIds`;
- `inferred` includes `reasoning` and never supplies an exact number unless the
  number is separately derived;
- `documented-absence` requires a source that explicitly states absence;
- `not-documented` records the researched scope and date;
- `conflicted` facts are excluded from hero/chapter prose and appear only in
  the source/methodology route;
- `value: 0` is never a substitute for missing data; and
- a stale high-volatility fact fails release validation rather than rendering
  with its old date.

## 4. Baseline chain record

```json
{
  "baseline": {
    "id": "robinhood_chain",
    "name": "Robinhood Chain",
    "label": "Robinhood Chain",
    "internalAliasOnly": "robinhood_chain",
    "color": "#CCFF00",
    "glyph": null,
    "chainId": 4663,
    "parentChainId": 1,
    "gasAsset": "ETH",
    "windowKind": "soft-confirmation",
    "windowMs": 1000,
    "windowObserved": false,
    "sourceFactIds": [
      "fact-rh-chain-id",
      "fact-rh-parent",
      "fact-rh-gas",
      "fact-rh-soft"
    ],
    "clocks": [
      {"id": "soft", "label": "SOFT", "factId": "fact-rh-soft"},
      {"id": "posted", "label": "POSTED", "factId": "fact-rh-posted"},
      {"id": "final", "label": "FINAL", "factId": "fact-rh-final"},
      {"id": "withdrawal", "label": "WITHDRAWAL", "factId": "fact-rh-withdrawal"}
    ]
  }
}
```

`windowMs` is a rendering ceiling for a sub-second statement. It may control a
log-bar endpoint only. It must not feed block frequency, TPS, deadline, auction
duration, or throughput calculations.

## 5. Section and comparator schema

```json
{
  "sectionOrder": ["topology", "txflow", "mev", "latency"],
  "sectionOf": {
    "ch1": "topology",
    "ch2": "txflow",
    "ch3": "mev",
    "ch4": "latency"
  },
  "sections": {
    "topology": {
      "title": "TOPOLOGY",
      "baselineDiagram": "rollup-stack"
    },
    "txflow": {
      "title": "TX FLOW",
      "baselineDiagram": "receipt-to-ethereum"
    },
    "mev": {
      "title": "MEV",
      "baselineDiagram": "fcfs-race"
    },
    "latency": {
      "title": "LATENCY",
      "baselineDiagram": "four-clock-ladder"
    }
  },
  "sectionMetrics": {
    "topology": [
      "security / consensus shape",
      "cadence",
      "who orders / proposes",
      "who verifies / challenges",
      "propagation / data path",
      "node floor / dependencies"
    ]
  }
}
```

Chain record:

```json
{
  "chains": {
    "sol": {
      "name": "SOL",
      "label": "Solana",
      "color": "#5BD7E8",
      "glyph": "◎",
      "diagrams": {
        "topology": "sol-tree",
        "txflow": "sol-pipeline",
        "mev": "sol-bundle",
        "latency": "window"
      },
      "topology": {
        "metrics": [
          {"factId": "fact-sol-consensus"},
          {"factId": "fact-sol-cadence"}
        ],
        "delta": {
          "text": "Solana rotates ordering among scheduled stake-weighted leaders; Robinhood Chain fixes ordering at one sequencer and moves hard settlement to Ethereum.",
          "status": "inferred",
          "sourceFactIds": ["fact-sol-leaders", "fact-rh-sequencer", "fact-rh-final"]
        }
      }
    }
  }
}
```

`chainOrder` for docks:

```json
["sol", "btc", "eth", "bnb", "zec"]
```

`benchCols`:

```json
["robinhood_chain", "sol", "eth", "bnb", "btc", "zec"]
```

Every section metric array length must exactly match `sectionMetrics` for that
section. The audit rejects padding, truncation, duplicate labels, or implicit
field order.

## 6. Techniques and tools

Technique record:

```json
{
  "id": "sandwich",
  "name": "Sandwiching",
  "short": "Sandwich",
  "definition": "Bracketing a victim swap with transactions before and after it.",
  "cells": {
    "robinhood_chain": "limited",
    "sol": "active",
    "eth": "hot",
    "bnb": "active",
    "btc": "none",
    "zec": "none"
  },
  "notes": {
    "robinhood_chain": {
      "text": "No canonical public mempool is documented and RFQ can keep quoting offchain, but visible or leaked AMM intent can still be bracketed.",
      "status": "inferred",
      "sourceFactIds": ["fact-rh-no-mempool-doc", "fact-rh-rfq", "fact-rh-amm"]
    }
  },
  "tools": {
    "robinhood_chain": ["robinhood-orderflow"]
  }
}
```

Tool record:

```json
{
  "id": "robinhood-feed",
  "function": "Fast data feed",
  "name": "Robinhood Chain sequencer feed",
  "chains": ["robinhood_chain"],
  "stance": "neutral",
  "status": "production",
  "scope": "native-l2",
  "confidence": "confirmed",
  "asOf": "2026-08-31",
  "blurb": "Low-lag ordered L2 updates; consumers must detect gaps and backfill before treating them as durable evidence.",
  "sourceFactIds": ["fact-rh-feed"],
  "riskFlags": ["soft-state", "sequencer-dependency", "gap-recovery"],
  "linksTechnique": ["backrun"]
}
```

Absence tool:

```json
{
  "id": "robinhood-no-protection-rpc",
  "function": "Protection RPC / private submission",
  "name": "No official protection RPC documented",
  "chains": ["robinhood_chain"],
  "absence": true,
  "status": "not-documented",
  "asOf": "2026-08-31",
  "researchedSourceIds": ["rh-about", "rh-connect", "rh-eth-diff", "rh-terms"]
}
```

An absence row is not a product, score, recommendation, or proof that third
parties expose no private path.

## 7. Required Hoverdocs terms

Minimum first-release term set:

| ID | Visible term | Essential definition/source |
|---|---|---|
| `robinhood-chain-term` | Robinhood Chain | chain 4663, Nitro L2, Ethereum parent, FCFS |
| `arbitrum-nitro` | Arbitrum Nitro | execution/rollup stack |
| `arbos` | ArbOS | L2 operating system/execution environment |
| `arbsys` | ArbSys | precompile including actual L2 block number |
| `sequencer` | sequencer | receives/orders accepted L2 transactions |
| `fcfs` | first come, first served | arrival-based queue rule; no priority gas jump |
| `sequencer-soft-confirmation` | soft confirmation | sequencer-backed receipt before L1 post |
| `l1-posted` | posted to Ethereum | batch in Ethereum Inbox; order fixed absent Ethereum reorg |
| `ethereum-finality` | Ethereum finality | parent block finalized |
| `canonical-withdrawal` | canonical withdrawal | L2 initiate → challenge period → L1 claim |
| `bold-fraud-proofs` | BoLD | dispute/challenge system; current validator set permissioned |
| `security-council` | Security Council | upgrade thresholds/timelock |
| `ethereum-blobs` | Ethereum blobs | batch data availability surface |
| `l1-data-fee` | L1 data fee | publication component bundled in transaction gas |
| `address-aliasing` | address aliasing | altered L2 sender for L1 contract messages |
| `retryable-ticket` | retryable ticket | asynchronous L1→L2 message/redeem mechanism |
| `erc-4337` | ERC-4337 | UserOperation/bundler/paymaster smart-account flow |
| `eip-7702` | EIP-7702 | EOA delegation to smart-account code |
| `stock-tokens` | Stock Tokens | issuer-created tokenised debt securities, not underlying shares |
| `erc-8056` | ERC-8056 | scaled UI amount interface |
| `ui-multiplier` | `uiMultiplier()` | shares-per-token display ratio scaled by `1e18` |
| `sequencer-uptime-feed` | sequencer uptime feed | outage/recovery signal with grace-period use |
| `oracle-paused` | `oraclePaused()` | advisory corporate-action pause flag |
| `data-streams` | Data Streams | pull-based signed market reports verified onchain |

Each term includes:

```json
{
  "term": "Sequencer soft confirmation",
  "aliases": ["soft confirmation", "soft receipt"],
  "definition": "…",
  "purpose": "…",
  "sourceIds": ["rh-finality"],
  "entity": "sequencer-soft-confirmation"
}
```

Aliases are matched case-insensitively in prose but are never substituted into
the original authored text. The termifier skips links, buttons, code, SVG text,
headings, form controls, and already termified content.

## 8. Entity channels

### 8.1 Minimum entity corpus

| ID | Kind | Required scope |
|---|---|---|
| `robinhood-chain` | chain | topology, control planes, endpoints, clocks, governance, ecosystem caveat |
| `arbitrum-nitro` | term | Nitro execution, Inbox/batch path, inherited vs chain-specific behavior |
| `robinhood-sequencer` | tool | operator, FCFS, screening, soft receipt, uptime/centralization |
| `sequencer-soft-confirmation` | term | guarantee and non-guarantees |
| `bold-fraud-proofs` | term | assertion challenges and current permissioning |
| `security-council` | term | seats, thresholds, timelock, emergency path |
| `robinhood-fees` | tool | L2 execution + L1 data; fee/order separation |
| `l1-data-fee` | term | calldata/data publication consequences |
| `robinhood-node` | tool | hardware, Nitro/ArbOS, L1 execution/beacon/blob, snapshots |
| `robinhood-feed` | tool | WebSocket/feed, gap recovery, soft state |
| `robinhood-streams` | tool | market data, verifier, staleness/availability |
| `sequencer-uptime-feed` | term | status, grace period, safe resumption |
| `robinhood-orderflow` | tool | AMM/RFQ/intents/propAMM/book visibility and dependencies |
| `canonical-bridge` | tool | deposit, retryable, withdrawal/challenge/claim, address mapping |
| `robinhood-account-abstraction` | tool | ERC-4337/EIP-7702 and service roles |
| `robinhood-stock-tokens` | term | issuer/legal meaning, canonical identity, 18 decimals, AP boundary |
| `erc-8056` | term | multiplier and adjusted views/events |
| `corporate-action-multiplier` | term | scheduled changes, display/valuation behavior |
| `stock-token-api` | tool | assets/prices/corporate actions, units/cache/rate limits |
| `oracle-paused` | term | advisory pause plus primary staleness guard |
| `uniswap-launcher` | tool | auction/strategy/graduation; current deployment warning |
| `robinhood-coin-launch-playbook` | technique | testnet, authorities, pool/auction, clocks, liquidity, monitoring |

This expands beyond the existing 17 Robinhood article routes where the
standalone narrative needs governance, bridge, account abstraction, API, and
oracle-pause concepts as first-class doors.

### 8.2 Entity schema

```json
{
  "entities": {
    "robinhood-chain": {
      "kind": "chain",
      "name": "Robinhood Chain",
      "tagline": "A first-come-first-served Nitro rollup with a fast sequencer receipt and Ethereum-anchored hard settlement.",
      "chains": ["robinhood_chain"],
      "body": ["…", "…"],
      "how": {
        "diagram": "rollup-stack",
        "steps": ["…", "…"]
      },
      "signals": [
        {"label": "chain ID", "factId": "fact-rh-chain-id"},
        {"label": "soft confirmation", "factId": "fact-rh-soft"}
      ],
      "sourceIds": ["rh-about", "rh-finality", "rh-governance"],
      "related": ["robinhood-sequencer", "arbitrum-nitro", "canonical-bridge"],
      "appearsOn": []
    }
  }
}
```

Rendered anatomy stays identical to the Solana entity system:

1. masthead/kind/tagline/chain badge;
2. What it is;
3. How it works + diagram + steps;
4. Signals, with source date and confidence;
5. Links, ordered official → docs → standard/repository → explorer;
6. Related doors;
7. Appears on, computed from data references; and
8. More on Robinhood Chain/article-index return.

Entity prose supports only the existing markdown-lite subset. Source URLs are
safe-filtered; unknown schemes render as text and fail the audit.

## 9. Routes and history

Supported hash routes:

```text
#/e/<entity-id>
#/c/robinhood-chain
#/tools/robinhood-chain
#/chains
#/methodology
#/sources
```

Requirements:

- direct load opens the requested route after data validation;
- Back closes the current overlay/route and restores underlying scroll;
- forward reopens it;
- Escape closes the top route layer before exiting engaged reader mode;
- closing restores focus to the invoking door when one exists;
- unknown/unsafe IDs render a quiet not-found route with links to Home and
  Search; they never interpolate into HTML;
- document title and canonical description update and restore; and
- route changes clear transient Hoverdocs, comparison trays, and modifier-key
  reveal state.

## 10. Search and command palette

Command record:

```json
{
  "id": "entity:sequencer-soft-confirmation",
  "type": "entity",
  "title": "Sequencer soft confirmation",
  "label": "ROBINHOOD CHAIN · TERM",
  "summary": "Fast sequencer acceptance before Ethereum posting and finality.",
  "aliases": ["soft receipt"],
  "target": "#/e/sequencer-soft-confirmation"
}
```

Search index order:

1. exact full title;
2. exact alias;
3. prefix title;
4. fuzzy title;
5. body/source match.

Visible results always show type and chain context. A search for `Robinhood`
must not mix brokerage/API products into chain results. Prohibited shorthand
may be accepted as a hidden typo-recovery alias only if legal/brand review
approves; it must never echo back visibly. The safer default is not to index it.

## 11. Source and methodology routes

`#/sources` renders a semantic table:

| Source | Publisher/type | Checked | Freshness | Authorized claims | Status |
|---|---|---|---|---|---|

Selecting a source expands the exact fact IDs and every page surface that uses
them. Selecting a fact from a Hoverdoc deep-links back to this expansion.

`#/methodology` renders:

- source priority;
- confidence/absence vocabulary;
- volatility/refresh schedule;
- comparison field definitions;
- technique heat definitions;
- distinction among architecture, integration, deployment, usage, and
  liquidity;
- independent-project and non-endorsement notice;
- Stock Token terminology/legal boundary; and
- known unknown/conflict ledger.

Neither route requires Hoverdocs or animation to be understandable.

## 12. JavaScript-off parity

The standalone document includes a `<noscript>` section with:

1. hero lifecycle and four-clock list;
2. semantic text/figure description for CH-01…CH-04;
3. all four six-system comparison tables and deltas;
4. CH-05 technique grid and function bench;
5. the 24-term glossary;
6. entity index: exact name, kind, tagline, first source;
7. Robinhood Chain article index;
8. compact source ledger with checked dates; and
9. independent-project notice.

Interactive and static mirrors are generated/verified from the same data
contract. The repository should add an audit that normalizes text and checks:

```text
interactive metric label/value/source == no-script metric label/value/source
interactive entity name/kind/tagline/first link == no-script entity row
interactive technique/tool matrix == no-script matrix
```

JavaScript-off content uses ordinary anchors and in-document headings. It does
not pretend hash-routed overlays work.

## 13. Data validation acceptance

- Top-level schema version is recognized before any renderer mounts.
- Every fact references at least one valid source unless it is explicitly
  inferred with valid input facts.
- Every source's reverse `claims` list matches fact `sourceIds`.
- Every section metric count/order is exact for every chain.
- `chainOrder`, `benchCols`, technique cells/notes/tools, related entities,
  term entity IDs, cue anchors, and article IDs resolve without dangling keys.
- Rendered text contains no private key `robinhood_chain` and no prohibited
  shorthand.
- All official names are full and current; `Stock Tokens` terminology passes a
  case-sensitive audit.
- Every volatile fact is within its refresh window at release.
- Conflicted facts cannot appear in hero/chapter slots.
- `windowMs` has no consumer outside the conceptual latency renderer.
- No source URL uses an unsafe scheme or a search-results URL.
- Entity and no-JavaScript mirrors are exact.
- Malformed data fails development/release audits and produces a readable
  static page in production rather than partially wrong interactive content.

