# 03 — Cross-chain comparison specification

## 0. Comparison contract

Robinhood Chain is the fixed reference column. The comparison set is exactly:

```text
Robinhood Chain · Solana · Bitcoin · Ethereum · BNB Chain · Zcash
```

The dock selector order is `Solana · Bitcoin · Ethereum · BNB Chain ·
Zcash`, matching the rebased root comparator order. CH-05 preserves the root
bench grouping after moving the new baseline first: `Robinhood Chain · Solana
· Ethereum · BNB Chain · Bitcoin · Zcash`. These are intentionally two
different presentation orders, represented by `chainOrder` and `benchCols` in
`04-DATA-ROUTES-AND-ENTITIES.md`; they contain the same six systems.

Arbitrum One remains a contextual/inherited-protocol reference inside
Robinhood Chain entity pages. It does not become a seventh main-page column;
that would break exact parity with the existing six-system formula.

The four comparator docks use the same normalized axes as the Solana edition:

| Dock | Axes |
|---|---|
| Topology | consensus/security model; cadence; orderer/proposer; verification/validator set; propagation/data path; node hardware/dependencies |
| Transaction flow | pre-block staging; fee model; execution; inclusion/soft latency; finality; expiry/replay |
| MEV | pending-intent visibility; ordering market; dominant architectural plays; user protection |
| Latency | decision window; importance of proximity; fast-data rails; preconfirmation/early assurance; frontier |

No dock shows a composite score, winner, medal, ranking, or “best for” verdict.
Advantage colors from the Solana implementation should be removed from the new
page unless they merely indicate the selected baseline. Each row is a
tradeoff, not a contest.

## 1. Evidence and volatility rules

- Robinhood-specific facts follow `01-RESEARCH-AND-SOURCE-LEDGER.md`.
- Comparison facts use the existing Scope primary-source corpus and must be
  refreshed against official chain/protocol documentation at implementation.
- Exact validator/node counts, hardware, cadence after upgrades, finality
  estimates, service availability, and tool deployment are volatile.
- A `~` value includes `AS OF YYYY-MM-DD` in its Hoverdoc.
- Architecture-level values may remain undated only when the underlying
  protocol rule is stable and the source is versioned.
- Provider/tool presence is not evidence of dominant usage.
- `none` means the base protocol/application model makes the technique
  unavailable; `not documented` and `not measured` remain separate values.
- “Finality” must name whether it is probabilistic, protocol finality, L1
  posting, Ethereum finality, or a product-specific acceptance policy.

Primary comparison anchors:

- [Solana developer documentation](https://solana.com/docs)
- [Ethereum developer documentation](https://ethereum.org/developers/docs/)
- [BNB Smart Chain documentation](https://docs.bnbchain.org/bnb-smart-chain/)
- [Bitcoin developer guide](https://developer.bitcoin.org/devguide/)
- [Zcash protocol documentation](https://zcash.readthedocs.io/)

## 2. Interaction and layout

Each dock appears after its Robinhood-first figure/readout and before the three
closing cards.

Collapsed row:

```text
COMPARE · <AXIS>  [SOL] [BTC] [ETH] [BNB] [ZEC]        OPEN ▾
```

The baseline is not a chip because it is always visible. Opening a comparator
shows:

```text
┌ Robinhood Chain baseline ─────────────────────────────┐
│ baseline mini diagram + baseline metric column        │
├ selected chain ───────────────────────────────────────┤
│ selected mini diagram + selected metric column        │
├ exact-field matrix / delta strip / source dates ──────┤
└───────────────────────────────────────────────────────┘
```

Desktop uses side-by-side mini diagrams and a two-column exact-field table.
Mobile stacks baseline then selected system and keeps row labels visible. The
full six-column semantic table exists in `<noscript>` and the methodology
route; it is not forced into a 360 px viewport.

Keyboard:

- Tab enters the chain tablist;
- Left/Right change focus, Home/End move first/last;
- Enter/Space selects;
- Escape collapses and returns focus to the dock toggle; and
- opening via a read-through cue selects the named chain but never steals
  focus while autoplay is running.

URL state:

```text
#ch1?compare=sol
#ch2?compare=eth
```

Because query text after an ordinary fragment is awkward for existing routing,
the actual implementation should serialize dock state through
`history.replaceState` while preserving `#ch1`/`#ch2` anchors, or use the
project's established cue route. Do not invent a route that breaks entity
hashes.

## 3. CH-01 topology matrix

These are target teaching values, not a substitute for release-time research.
Any exact volatile count shown here must be refreshed and dated before render.

| Metric | Robinhood Chain baseline | Solana | Bitcoin | Ethereum | BNB Chain | Zcash |
|---|---|---|---|---|---|---|
| security / consensus shape | Nitro optimistic rollup; Ethereum data/settlement; BoLD fraud proofs | PoS with PoH clock and Tower BFT | proof of work, Nakamoto longest/heaviest chain | PoS Gasper: LMD-GHOST + Casper FFG | Proof of Staked Authority with compact elected set | Equihash proof of work, Nakamoto-style chain |
| cadence | on-demand Nitro L2 blocks; sub-second sequencer soft confirmation | ~400 ms target slots | ~10 min blocks | 12 s slots | sub-second blocks after current timing upgrades; verify exact target | 75 s target blocks |
| who orders/proposes | one Robinhood-operated sequencer; FCFS arrival | published, stake-weighted scheduled leader | any miner winning hash race | RANDAO-selected proposer | elected validator rotation | any miner winning hash race |
| who verifies/challenges | anyone may run full node; currently ~2 allowlisted BoLD validators | permissionless validator set; stake-weighted voting | permissionless full nodes; mining concentrated in pools | permissionless node/validator participation under protocol rules | compact active validator set plus full nodes | permissionless full nodes; pooled miners |
| propagation/data | sequencer feed → Nitro nodes; compressed batches → Ethereum blobs | Turbine shred tree plus gossip plane | gossip + compact blocks; miner relays such as FIBRE | gossip, attestations, and blob sidecars | geth-derived p2p propagation | Bitcoin-like gossip with shielded transaction payloads |
| node floor/dependencies | 8+ cores, 64 GB RAM (128 recommended), NVMe/several TB, L1 execution + beacon | high CPU/RAM/NVMe; refresh current validator recommendations | laptop-class full node possible | consumer-plus execution + consensus clients | mid/high server profile; refresh | low/mid full-node profile |

### 3.1 Topology deltas

| Comparator | Required delta strip |
|---|---|
| Solana | `Solana rotates ordering among scheduled stake-weighted leaders; Robinhood Chain fixes ordering at one sequencer and moves hard settlement to Ethereum.` |
| Bitcoin | `Bitcoin minimizes permission to validate and accepts probabilistic time; Robinhood Chain makes local acknowledgement fast but adds a sequencer, allowlisted challengers, and a parent settlement layer.` |
| Ethereum | `Ethereum is Robinhood Chain's settlement anchor: the L2 borrows its data availability and finality while centralizing the first ordering decision.` |
| BNB Chain | `Both can feel sub-second locally; BNB's validator set reaches its own chain finality, while Robinhood Chain separates one sequencer receipt from later Ethereum finality.` |
| Zcash | `Zcash spends protocol complexity on shielded value transfer; Robinhood Chain spends it on fast EVM execution and parent-chain settlement.` |

### 3.2 Topology mini diagrams

- `sol-tree`: scheduled leader → Turbine relay tree → votes.
- `btc-miners`: four miners hash race → winning block → node gossip.
- `eth-gasper`: proposer slot → attestations → justified/finalized checkpoints.
- `bnb-ring`: compact validator ring with one rotating producer.
- `zec-shielded-pow`: miner race plus shielded transaction payload.

Each is ≤8 shapes and one bounded animation. The Robinhood baseline diagram is
always the full `rollup-stack`; the mini is not allowed to collapse the stack
into a generic L2 box.

## 4. CH-02 transaction-flow matrix

| Metric | Robinhood Chain baseline | Solana | Bitcoin | Ethereum | BNB Chain | Zcash |
|---|---|---|---|---|---|---|
| pre-block staging | provider/direct sequencer submission; no canonical public mempool documented | leader-forwarding path; no public canonical mempool | node-local public mempools, fee-rate/package selection | public mempool plus private builder/order-flow paths | public mempool, drained by fast blocks; private routes may exist | public mempool, but shielded transfer details hide graph/value |
| fee model | ETH gas bundles L2 execution + L1 data; fee does not buy earlier FCFS order | base/signature costs + compute-unit priority fee; optional Jito tip/position market | sat/vB/package fee market | EIP-1559 base fee + priority tip; builder value separate | EVM gas/tips and validator-adjacent private markets | Bitcoin-like fee model, typically low; verify current policy |
| execution | sequential EVM/Nitro; internal multicalls atomic | account-aware parallel Sealevel execution | UTXO validation/script | sequential EVM | sequential EVM | UTXO plus shielded proving/verification; no general EVM |
| first useful acknowledgement | sub-second sequencer soft receipt | typically sub-second processed/confirmed boundary; define commitment | next-block probability depends on fees and block discovery | usually next one/two slots | often ~1–2 s; verify current network | usually one to several minutes |
| stronger finality | L1 posted in minutes; Ethereum final ~13 min after post | rooted/finalized commitment, historically ~13 s teaching value; refresh | probabilistic confirmations, often six-block convention | protocol finality around two epochs | protocol fast finality in seconds after upgrades; refresh | probabilistic confirmations; conservative applications may wait longer |
| expiry/replay | EVM nonce + chain ID; app/order deadline separate | recent blockhash lifetime plus durable nonce options | UTXO conflicts and opt-in RBF policy | account nonce/replacement + chain ID | account nonce/replacement + chain ID | UTXO conflict rules |

### 4.1 Transaction-flow deltas

| Comparator | Required delta strip |
|---|---|
| Solana | `Both target fast user feedback; Solana forwards toward changing leaders and executes account-declared work in parallel, while Robinhood Chain funnels a sequential EVM lane through one sequencer and settles later on Ethereum.` |
| Bitcoin | `Bitcoin holds transactions in public node-local waiting rooms and prices bytes; Robinhood Chain sends accepted flow toward one FCFS orderer and prices execution plus Ethereum data.` |
| Ethereum | `The transaction language is familiar, but Robinhood Chain inserts a sequencer receipt and batch-publication stage before inheriting Ethereum's finality.` |
| BNB Chain | `Both use EVM nonces and sequential execution; BNB finalizes within its own validator protocol while Robinhood Chain exposes distinct soft, posted, and Ethereum-final states.` |
| Zcash | `Zcash reveals less about shielded flow but offers less contract composability; Robinhood Chain exposes general EVM state while relying on route-level intent privacy.` |

### 4.2 Finality field rule

The Robinhood baseline cell is never shortened to `~13 min`. It must render:

```text
SOFT <1 s typ. → POSTED minutes typ. → ETHEREUM FINAL ~13 min after post
```

The dock detail separately renders:

```text
CANONICAL EXIT ~7 d + L1 claim · NOT TRANSACTION FINALITY
```

## 5. CH-03 MEV matrix

| Metric | Robinhood Chain baseline | Solana | Bitcoin | Ethereum | BNB Chain | Zcash |
|---|---|---|---|---|---|---|
| pending intent visibility | sequencer/provider sees submitted flow; no canonical public mempool documented; RFQ intent may remain offchain | no public canonical mempool; infrastructure/private flow can expose intent | broadly visible node-local mempool | public mempool plus private builder/solver channels | public mempool with short window plus private/validator-adjacent rails | shielded transaction details opaque; transparent flow remains visible |
| ordering market | centralized FCFS sequencer; no priority gas auction or documented public bundle auction | scheduled leaders plus Jito bundle/tip market | fee rate/package selection plus accelerators | builder/relay/proposer supply chain and private order flow | validator rotation plus gas/private/builder rails | mining fee selection; limited application ordering market |
| architectural plays | latency arb, backruns, liquidations, venue arb, launch races; sandwich requires visible/leaked intent | atomic arb, private-flow sandwich, liquidation/backrun, spam race, launch sniping | fee sniping, replacement/package games, accelerator deals | sandwich, backrun, liquidation, CEX–DEX arb, JIT, builder internalization | EVM arb/sandwich/backrun/liquidation with short windows | minimal base-layer application MEV; shielded graph limits targeting |
| user protection | RFQ/intents, limit/slippage/deadline, trusted route; no official protection RPC documented | protected/private endpoints, slippage, routing, bundle mechanics | fee/RBF/package hygiene; confirmation policy | private RPC, Flashbots Protect/MEV Blocker, CoW/intents | private transaction RPCs, slippage, route selection | shielded protocol plus wallet privacy behavior |

### 5.1 MEV deltas

| Comparator | Required delta strip |
|---|---|
| Solana | `Both reward low-latency infrastructure; Solana exposes a tip-backed bundle market, while Robinhood Chain documents FCFS and shifts the contest toward arrival and intent visibility.` |
| Bitcoin | `Bitcoin's base-layer ordering value is mostly a fee/package story; Robinhood Chain's general EVM state creates composable arbitrage and keeper races even without priority gas.` |
| Ethereum | `Ethereum industrializes ordering through builders and proposers; Robinhood Chain narrows the first ordering gate to one FCFS sequencer, then inherits Ethereum settlement.` |
| BNB Chain | `Both support EVM extraction, but BNB's public gas/validator-adjacent rails differ from Robinhood Chain's documented no-priority FCFS rule.` |
| Zcash | `Zcash attacks extraction by hiding transaction graph/value at the protocol layer; Robinhood Chain relies on application routes and limited pre-trade visibility instead.` |

The phrase `dominant plays` from the old schema is renamed `architectural
plays` unless dated activity evidence demonstrates dominance.

## 6. CH-04 latency matrix

| Metric | Robinhood Chain baseline | Solana | Bitcoin | Ethereum | BNB Chain | Zcash |
|---|---|---|---|---|---|---|
| decision window | sub-second sequencer soft confirmation; no fixed user-facing block interval | ~400 ms target slot | ~10 min target block | 12 s slot | sub-second block interval; verify current target | 75 s target block |
| does proximity matter? | yes; FCFS rewards low/low-variance sequencer arrival | decisive near leader/data paths | mostly miner relay/pool infrastructure rather than retail tx microseconds | yes for builders, relays, proposers, and order flow | yes near validators/builders | generally not for application trading on base layer |
| fast-data rails | sequencer feed, managed WebSockets, full-node feed input; Chainlink Data Streams for market data | ShredStream, Geyser, SWQoS/DoubleZero-related paths | compact blocks/FIBRE for miners; mempool telemetry | BDN/relay/mempool streams | BDN/private validator-adjacent feeds | standard p2p/wallet scanning; privacy changes observability |
| preconfirmation / early assurance | sequencer receipt; explicitly soft until L1 posting/finality | processed/confirmed commitments and leader/shred observations; label exact commitment | zero-conf policy only; Lightning supplies separate offchain commitment | active preconfirmation research/products; protocol finality later | fast-finality protocol, no separate generic preconfirmation market | no general trading preconfirmation surface |
| frontier | market data → decision → sequencer; gap recovery; L1 promotion; hedge latency | mid-slot data and leader path | mining/pool relay and payment-channel UX | proposer/builder commitments and client/relay performance | propagation/finality tuning | privacy-preserving wallet sync and proof performance |

### 6.1 Latency deltas

| Comparator | Required delta strip |
|---|---|
| Solana | `Solana's race is leader-local and shred-driven; Robinhood Chain's is sequencer-local, then waits for Ethereum anchoring.` |
| Bitcoin | `Bitcoin turns time into probabilistic work; Robinhood Chain acknowledges quickly, but its strongest guarantee still advances on Ethereum time.` |
| Ethereum | `Robinhood Chain compresses the user-facing first step below an Ethereum slot but cannot compress the parent finality it inherits.` |
| BNB Chain | `Similar local speed does not mean similar finality: BNB uses its own fast validator protocol, while Robinhood Chain stages assurance through one sequencer and Ethereum.` |
| Zcash | `Zcash's base layer has little sub-block trading race; its engineering frontier is privacy and proof/wallet performance rather than sequencer arrival.` |

## 7. CH-05 technique grid

Target editorial states, rebased to Robinhood first:

| Technique | Robinhood Chain | Solana | Ethereum | BNB Chain | Bitcoin | Zcash |
|---|---|---|---|---|---|---|
| Atomic arbitrage | active | hot | hot | active | none | none |
| Sandwiching | limited | active | hot | active | none | none |
| Liquidations | active | hot | hot | active | limited | none |
| Backrunning | active | active | hot | active | none | none |
| JIT liquidity | active | active | hot | limited | none | none |
| CEX–DEX arbitrage | active | hot | hot | active | limited | limited |
| Spam / probabilistic racing | active | hot | limited | active | none | none |
| Mint / launch sniping | active | hot | active | active | limited | none |

Release rule: every `hot` cell must point to a dated activity source and method.
If that evidence is not refreshed, downgrade to `active` rather than reusing a
legacy heat label. Robinhood Chain remains `active`/`limited` until a separate
empirical dataset justifies `hot`.

### 7.1 Robinhood cell explanations

| Technique | Required explanation |
|---|---|
| Atomic arbitrage | `Multiple EVM liquidity surfaces can be called atomically inside one transaction. FCFS replaces a public priority-gas contest with an arrival race.` |
| Sandwiching | `No canonical public mempool is documented and RFQ can keep quoting offchain, but visible or leaked AMM intent can still be bracketed.` |
| Liquidations | `Lending/perps and Chainlink data create keeper races; feed freshness, sequencer status, grace period, and session state define safe eligibility.` |
| Backrunning | `A bot may react after a swap, oracle report, or state update; ordered-state feed latency and sequencer arrival determine the first safe reaction.` |
| JIT liquidity | `Concentrated-liquidity deployments make short-lived LP placement possible; the page does not claim observed prevalence.` |
| CEX–DEX arbitrage | `AMM, RFQ, propAMM, and book prices can diverge from external venues; Stock Token 24/5 reference sessions add closed-market risk.` |
| Spam / racing | `Redundant submission of the same signed transaction may improve path resilience; conflicting nonce replacements create failures and a higher fee does not jump the queue.` |
| Launch sniping | `Permissionless ERC-20/public-pool launch surfaces make first-fill races possible. A distribution auction changes the opening mechanism but does not remove execution risk.` |

## 8. CH-05 function bench

| Function | Robinhood Chain | Solana | Ethereum | BNB Chain | Bitcoin | Zcash |
|---|---|---|---|---|---|---|
| Ordering / sequencing | FCFS Robinhood-operated sequencer | Jito Block Engine; scheduled leaders | MEV-Boost / builders / relays / proposers | validator rotation plus bloXroute/48Club rails | miner package selection + accelerators | miner selection; no application ordering product in baseline |
| Protection RPC / private submission | `NO OFFICIAL PROTECTION RPC DOCUMENTED` | Jito/protected endpoints; current status verify | Flashbots Protect / MEV Blocker | privacy RPCs/private transaction routes | not analogous; RBF/package hygiene | protocol-level shielded pool, wallet-dependent |
| Order-flow auction / intents | UniswapX · 0x RFQ · 1inch Fusion · LI.FI; exact current support verify | Jupiter routing/limit/DCA and related intent surfaces | CoW Swap · UniswapX · 1inch Fusion | 1inch · KyberSwap; current support verify | not a base-layer intent market | not a base-layer intent market |
| Fast data feed | sequencer feed/WebSockets; Chainlink Data Streams is market data | ShredStream · Geyser plugins | BDN · relay/mempool streams | BDN / validator-adjacent streams | compact block/FIBRE + mempool APIs | standard p2p/light-wallet data |
| Priority / fee market | execution + L1 data; no priority queue | CU priority fees + Jito tips | EIP-1559 tips + builder bids | gas tips + private bids | sat/vB/package market | minimal Bitcoin-like fee market |
| Node / client edge | Nitro full node · ArbOS · L1 execution/beacon/blob | Firedancer/Agave · SWQoS · DoubleZero | Reth/Erigon and PBS/preconfirmation work | fast-finality client tuning | Stratum v2 and miner relay stack | node/wallet/proving performance |
| Launch & bootstrap | Liquidity Launcher / Uniswap public pools; resolve current deployment | ecosystem launchpads and AMM bootstraps; selected entries source-linked | auction/AMM launch tooling; selected entries source-linked | launchpads/AMM bootstrap; selected entries source-linked | inscriptions/token overlays are adjacent, not native contracts | native gap |

The current Solana page leaves non-Robinhood launch rows blank because the row
was introduced for one integration. A standalone cross-chain edition should
either research and populate comparable, precisely scoped entries for all
chains or label them `NOT CURATED IN V1`. It must not use an em dash that could
be misread as “no launch mechanism exists.” The recommended first-release
choice is `NOT CURATED IN V1` plus a link to the verified chain-tools route.

## 9. Comparison detail schema

Every metric cell is a structured datum:

```json
{
  "value": "sub-second sequencer soft confirmation",
  "kind": "typical-latency",
  "confidence": "confirmed",
  "asOf": "2026-08-31",
  "sourceIds": ["rh-finality"],
  "caveat": "Not Ethereum finality and not a fixed block interval."
}
```

Every delta is separately labeled:

```json
{
  "text": "Robinhood Chain compresses the first step below an Ethereum slot but cannot compress the parent finality it inherits.",
  "kind": "editorial-inference",
  "sourceMetricKeys": ["latency.decisionWindow", "txflow.finality"]
}
```

The renderer never infers an advantage from numeric magnitude. Missing values
render `NOT DOCUMENTED`, `NOT MEASURED`, `NOT APPLICABLE`, or `NATIVE GAP`—not
zero.

## 10. No-JavaScript tables

The no-JavaScript mirror contains, in this order:

1. the four full six-column matrices above;
2. a delta list for each dock;
3. the eight-row technique grid;
4. the seven-row tool bench;
5. a vocabulary legend; and
6. one official source link per chain plus the methodology anchor.

Full names are mandatory in table headers. Visual shorthands such as `SOL`,
`ETH`, `BNB`, `BTC`, and `ZEC` may appear in parenthetical secondary text, but
the accessible header is the chain's full name.

## 11. Acceptance

- All four docks use `chainOrder`; CH-05 uses `benchCols`; no renderer silently
  sorts either array.
- All four docks compare the same exact field set; no per-chain field drift.
- Robinhood Chain remains visible as the baseline while the selected chain
  changes.
- Switching a chain updates text, mini diagram, delta, source dates, and
  document title/announcement in one atomic render.
- All values have a source ID or an explicit `inferred/not-documented` state.
- No finality row contains an unqualified duration.
- No `windowMs` value is used to compute throughput or fixed block cadence.
- Technique states and tool rows never imply profitability, endorsement, or
  market share.
- At 360/390/430/768/1200 px, the document never scrolls horizontally; only an
  explicitly labeled inner matrix may scroll.
- Keyboard selection, focus restoration, reduced motion, and no-JavaScript
  semantics match the existing Scope behavior.
