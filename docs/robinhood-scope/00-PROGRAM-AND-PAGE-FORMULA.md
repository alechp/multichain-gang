# 00 — Program and exact page formula

## 0. Outcome

Create a standalone, static `SCOPE//ROBINHOOD CHAIN` instrument with the same
editorial and interaction formula as the implemented Solana Scope page. The
new page explains Robinhood Chain from first principles, makes the distinction
between fast local acknowledgement and Ethereum-backed settlement impossible
to miss, and compares the chain against Solana, Bitcoin, Ethereum, BNB Chain,
and Zcash without producing a synthetic winner score.

The implemented artifact is `../../multichain/robinhood/index.html`. The root
`index.html` is now the Multichain Gang portal; the Solana instrument remains
at `../../multichain/solana/index.html`. The migration adds no transaction,
wallet, key, signing, or submission behavior. Publication was explicitly
authorized on 2026-08-31 and remains governed by the evidence gate in
`06-IMPLEMENTATION-ORCHESTRATION-QA.md`.

## 1. Product name and independence

### 1.1 Public title

The implemented Multichain Gang shell uses:

```text
SCOPE//ROBINHOOD CHAIN
```

Do not publish `ROBINHOOD//SCOPE`, `HOOD//SCOPE`, `HOOD CHAIN`, `RHC`, or any
invented abbreviation. `robinhood_chain` is acceptable only as a private data
key.

The document title is:

```text
SCOPE//ROBINHOOD CHAIN — sequencing, settlement, and onchain markets
```

Entity pages use:

```text
<Entity> — SCOPE//ROBINHOOD CHAIN
```

### 1.2 Required independence notice

Place this near the footer and in the About/Methodology overlay:

> SCOPE is an independent educational project. It is not affiliated with,
> endorsed by, sponsored by, or officially connected with Robinhood Markets,
> Inc. or its affiliates. Robinhood Chain and Stock Tokens are described from
> public documentation; inclusion of a protocol or service is not an
> endorsement or investment recommendation.

Legal/brand review must approve the final notice and presentation before
publication. The page may factually identify Robinhood Chain in educational
content, but the project's own `SCOPE` identity must remain the primary visual
identifier.

### 1.3 Mark policy

- Prefer a text-only masthead using the project's existing typography.
- Do not use the Robinhood master logo.
- Do not recreate, trace, animate, recolor, glow, crop, or combine the
  Robinhood Chain logo with the Scope wordmark.
- If an official logo is later approved, load the supplied asset unchanged,
  honor clearspace, keep the minimum symbol height at 20 px, and use only
  approved black/white/Robin Neon pairings.
- Robin Neon `#CCFF00` may be used as a non-logo interface signal after
  contrast testing; it must not make a hand-built graphic resemble an official
  mark.
- Never reference Robinhood's public-company ticker in chain content.
- Every external claim about chain growth, volume, addresses, or adoption must
  state metric, method, exact period, and source, and must remain separate from
  brokerage or Robinhood Crypto statistics.

## 2. Audience and jobs to be done

Primary readers:

- engineers deciding whether or how to build on Robinhood Chain;
- protocol and market-structure researchers comparing execution environments;
- infrastructure operators separating sequencer, node, oracle, bridge, and
  Ethereum dependencies;
- product teams integrating Stock Tokens, DeFi, wallets, or account
  abstraction; and
- sophisticated readers who need to understand what a fast receipt does—and
  does not—guarantee.

The page must let a reader answer:

1. Who orders transactions, who verifies execution, who can challenge state,
   and who upgrades the protocol?
2. What exactly has happened at soft confirmation, L1 posting, and L1
   finality?
3. Why can arrival latency matter when a higher fee cannot buy position?
4. How do EVM execution, L1 data fees, and Arbitrum-specific block semantics
   affect an application?
5. How do Stock Tokens differ from ordinary ERC-20s in economic meaning,
   display units, oracle behavior, sessions, and legal eligibility?
6. Where do bridges, RFQ, public AMMs, propAMMs, order books, lending, perps,
   and data services fit—and which claims are merely documented support?
7. How does the system differ from Solana, Ethereum, BNB Chain, Bitcoin, and
   Zcash on the same normalized axes?

## 3. Exact Solana-to-Robinhood formula

| Existing Solana Scope element | Robinhood Chain edition |
|---|---|
| Fixed slot bar showing `400 ms` | Fixed clock bar showing `SOFT <1 s`, with a control to inspect `POSTED`, `FINAL`, and `WITHDRAWAL` clocks. |
| Hero continuous slot trace | Four-stage trace: `SUBMIT → SOFT → POSTED → FINAL`, with withdrawal shown as a detached lane. |
| Hero statement “Solana, on the wire.” | “Robinhood Chain, between two clocks.” The prose immediately explains that the page actually tracks four user-facing clocks. |
| CH-01 scheduled leader + Turbine | CH-01 single sequencer + Nitro full nodes + BoLD challengers + Ethereum + Security Council. |
| CH-02 wallet-to-finality pipeline | CH-02 signed EVM transaction through RPC/sequencer, Nitro execution, receipt, batch, and Ethereum finality. |
| CH-03 sandwich + Jito auction | CH-03 FCFS transport race + visibility/protection map across public AMM, RFQ/intents, propAMM, and order book. |
| CH-04 latency ladder | CH-04 log-scale four-clock ladder plus market-data-to-execution path. |
| CH-05 eight-technique grid | Same eight rows and six chains, rebased so Robinhood Chain is the first/sticky baseline column. |
| CH-05 function-grouped bench | Same bench functions, with `Ordering / sequencing` instead of assuming every ordering mechanism is an auction. |
| SOL reference plus five comparators | Robinhood Chain reference plus SOL, BTC, ETH, BNB, and ZEC comparators. |
| 26 authored read-through cues | 26 new cues following the same hero → channels → bench → footer rhythm. |
| Deep entity channels | Robinhood-first entity corpus, reusing shared cross-chain entities rather than duplicating conflicting copies. |
| No-JavaScript tables/index | Exact Robinhood-first mirrors with full names and source links. |

“Same exact formula” does not mean copying Solana metaphors into an EVM
rollup. It means preserving the teaching cadence, information density,
interaction grammar, and evidence discipline while replacing the technical
model completely.

## 4. Information architecture

### 4.1 Main page

```text
HERO    Robinhood Chain, between two clocks
CH-01   One sequencer, several control planes
CH-02   Life of a transaction: receipt to Ethereum
CH-03   MEV after the gas auction
CH-04   Four clocks, one user action
CH-05   Same game, different ordering rules
FOOTER  Methodology · independent-project notice · source date
```

Desktop chapter navigation:

```text
CH-01 TOPOLOGY · CH-02 TX FLOW · CH-03 MEV · CH-04 LATENCY · CH-05 BENCH
```

Mobile uses the same labels in a horizontal, snap-assisted chip row. No chapter
is hidden behind a menu.

### 4.2 Supporting routes

| Route | Purpose |
|---|---|
| `#/e/<entity-id>` | Full-screen entity/deep-dive channel. |
| `#/c/robinhood-chain` | Robinhood Chain article index, reusing the existing shared chain atlas contract. |
| `#/tools/robinhood-chain` | Verified Robinhood Chain tool landscape using the existing 17-category taxonomy. |
| `#/chains` | Shared six-chain reading-path atlas. |
| `#/methodology` | Evidence, freshness, comparison, independence, and terminology rules. |
| `#/sources` | Searchable source ledger with checked dates and claim mappings. |

Section anchors remain ordinary `#ch1`…`#ch5` links. The router must not break
them.

### 4.3 Command/search index

Search indexes:

- the five main channels;
- all authored cues;
- Robinhood Chain entity pages and terms;
- the five comparison chain pages;
- CH-05 techniques and tool functions;
- source titles and exact documented phrases such as `soft confirmation`,
  `posted to Ethereum`, `BoLD`, `FCFS`, `ERC-8056`, `uiMultiplier`, and
  `sequencer uptime`; and
- permitted aliases such as `Arbitrum Nitro`, `chain 4663`, `L2 data fee`, and
  `Stock Token API`.

Aliases may improve retrieval but prohibited shorthand must never render as a
visible suggestion, title, chip, or breadcrumb.

## 5. Editorial thesis and progression

The hero establishes the first tension: a transaction can feel finished before
its strongest guarantee exists.

CH-01 decomposes the word “network” into orderer, executors/readers,
challengers, settlement layer, and governance. CH-02 follows one transaction
through those components. CH-03 asks who can see intent and who can influence
position after priority gas auctions are removed. CH-04 lays all clocks on a
single scale. CH-05 shows that the same economic techniques survive across
very different mechanisms.

The progression must prevent four common misconceptions:

- “permissionless” does not mean every control plane is permissionless;
- “sub-second” does not mean Ethereum-final;
- “FCFS” does not mean MEV-free; and
- “Stock Token” does not mean direct ownership of an underlying share.

## 6. Fact, inference, and absence policy

Every load-bearing datum is one of:

| State | Meaning | UI treatment |
|---|---|---|
| `confirmed` | Directly stated in a current first-party source or observed in an official registry/configuration. | Normal text plus source and checked date. |
| `derived` | Deterministic calculation from confirmed inputs. | Show formula/method and inputs. |
| `inferred` | Architectural consequence or analytical interpretation. | Prefix detail with `INFERENCE`; never render as a protocol guarantee. |
| `documented-absence` | Official docs explicitly say a feature does not exist. | Outlined `NOT PROVIDED` state with source. |
| `not-documented` | Research found no official statement. | `NOT DOCUMENTED`; never collapse to `none`. |
| `conflicted` | Current first-party sources disagree. | Suppress headline claim; show conflict in methodology/source route. |
| `volatile` | Deployment, count, version, provider, address, or latency likely to change. | `~` where appropriate, `AS OF YYYY-MM-DD`, mandatory refresh. |

Absence of a canonical public mempool in official integration docs is
`not-documented`, not proof of technical privacy. A documented partner is
`documented support`, not proof of production liquidity or safety.

## 7. Required visible caveats

The page must state, in context rather than only in a footer:

- the public RPC is rate-limited and unsuitable for production-grade,
  high-throughput, or latency-sensitive use;
- the sequencer feed is soft ordered-state data, not evidence of L1 posting or
  finality;
- multi-provider RPC redundancy does not decentralize the single sequencer;
- canonical bridge withdrawal time is not transaction finality;
- fast bridges replace time with solver/relayer liquidity and route-specific
  assumptions;
- Stock Token primary issuance/redemption is restricted to authorized
  participants, while ordinary applications compose with circulating tokens;
- onchain Stock Token feeds are multiplier-adjusted, while the read-only REST
  price endpoint returns raw underlying bid/ask;
- Stock Token feeds update on a 24/5 schedule even though token transfers and
  some onchain venues are available continuously; and
- an ecosystem listing is not an endorsement, audit, availability guarantee,
  or liquidity measurement.

## 8. Non-goals

- No wallet connection, balance display, signing, transaction construction,
  simulation-to-submit bridge, contract deployment, or trading controls.
- No live brokerage, Robinhood Crypto, customer, revenue, stock-price, or
  corporate metric.
- No token promotion, token launch marketing, price forecast, yield ranking,
  or “best chain” score.
- No claim that deploying on Robinhood Chain creates a Robinhood listing,
  partnership, distribution channel, or endorsement.
- No hardcoded Stock Token list, oracle address list, partner volume, Uniswap
  Liquidity Launcher deployment address, Nitro version, ArbOS version, or
  validator count in timeless prose.
- No equation that turns `windowMs` into blocks per second for an on-demand
  Nitro chain.
- No claim that one soft receipt, WebSocket head, explorer row, or indexer
  update proves Ethereum settlement.
- No generic copy of the existing Robinhood comparator extension presented as
  the finished standalone page. The baseline narrative, figures, deltas,
  source model, and no-JavaScript order must all be rebased.

## 9. Content inventory target

The first release should contain:

| Collection | Target |
|---|---:|
| Main channels | 5 |
| Primary figures | 8: hero, CH-01, CH-02, CH-03 ×2, CH-04, and CH-05 ×2 |
| Comparator docks | 4 |
| Chains per dock | 6 total: Robinhood Chain baseline + 5 comparators |
| Technique rows | 8 |
| Tool functions | 7 |
| Authored cues | 26 |
| Required Robinhood-first entity routes | 17 minimum |
| Required Hoverdoc terms | 24 minimum |
| Source records | every official Robinhood documentation page plus load-bearing primary protocol sources |

Counts are audit targets, not a reason to merge concepts that deserve separate
records. Any count change is recorded in the release ledger with the reason.

## 10. Definition of product success

A technically sophisticated reader can complete the guided read-through and
accurately explain:

1. the five control planes—submission, ordering, execution/read verification,
   dispute validation, and governance/settlement;
2. the three finality stages and separate withdrawal delay;
3. how FCFS changes the bid from gas price to transport latency without
   eliminating order-flow value;
4. why a Stock Token application must combine canonical identity, multiplier,
   feed, session, pause, and eligibility handling; and
5. how Robinhood Chain differs from each comparison chain without reducing
   the differences to throughput or a winner badge.
