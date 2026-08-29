# SOLANA//SCOPE — Robinhood Chain research and integration specification

> **Status:** proposed research/content specification; no production page or
> journal behavior is changed by this document
>
> **Research date:** 2026-08-28 (America/Los_Angeles)
>
> **Target:** the implemented v3 instrument in `index.html`, its JavaScript-off
> mirror, entity/search/read-through systems, and the read-only `journal/`
>
> **Brand rule:** external copy must always say **Robinhood Chain** in full. The
> implementation may use `robinhood_chain` as a private data key, but it must
> never render that key or an invented abbreviation.

---

## 0. Decision summary

Robinhood Chain should be added as a sixth chain, but it must not be presented
as merely “another fast EVM.” It adds a comparison shape the current instrument
does not have:

- a Robinhood-operated, first-come-first-served sequencer gives sub-second soft
  confirmations;
- Arbitrum Nitro executes EVM transactions and posts data to Ethereum blobs;
- Ethereum provides data availability and the hard-finality anchor;
- BoLD fraud proofs currently use an allowlisted validator set;
- a Security Council controls routine and emergency protocol upgrades;
- the network is permissionless for users and contract deployment, while the
  sequencer applies sanctions screening; and
- the initial application/liquidity stack is unusually RWA-oriented: Stock
  Tokens, Chainlink feeds and Data Streams, RFQ liquidity, Uniswap, a propAMM,
  lending, and perpetuals.

The page should therefore teach **three clocks** rather than publishing one
misleading “block time”:

1. sequencer acceptance and soft confirmation: typically sub-second;
2. batch publication to Ethereum: typically minutes; and
3. Ethereum finality: approximately 13 minutes after publication.

The separate canonical-bridge withdrawal delay is approximately seven days. It
is a fraud-proof challenge window, not transaction-finality latency.

### Recommended scope

| Surface | Recommendation | Why |
|---|---|---|
| CH-01…CH-04 Compare Docks | Add Robinhood Chain | Its sequencer/settlement split is directly comparable on every current axis. |
| CH-05 technique grid | Add one Robinhood Chain column | FCFS sequencing changes MEV mechanics without removing ordering value. |
| CH-05 tool bench | Add six Robinhood Chain entries and a launch/bootstrap function | The official stack has concrete sequencing, feed, intent, node, and launch surfaces. |
| Entity pages | Add one chain, seven tools, and seven term entities | The concepts do not fit cleanly in tooltip-only prose. |
| Read-through cues | Add one topology/settlement cue and one launch/liquidity cue | Readers must see both the fast receipt and slow hard-settlement ladder. |
| JavaScript-off appendix | Extend all matching tables exactly | Existing no-JavaScript completeness is non-negotiable. |
| Journal | Add a parallel EVM observation adapter and tables in a later implementation phase | Reusing Solana `slot`, `sig`, and lamport fields would corrupt semantics. |

### Non-goals

- Do not imply that deploying on Robinhood Chain lists a token in any Robinhood
  brokerage or crypto product. The chain operates independently of those
  accounts and products.
- Do not call an arbitrary ERC-20 a Robinhood Stock Token. Canonical Stock
  Tokens are issued by Robinhood Assets (Jersey) Limited, have registry-backed
  addresses, and have a restricted primary issuance/redemption path.
- Do not characterize the sequencer receipt as Ethereum finality.
- Do not call transaction ordering an auction. Robinhood Chain documentation
  explicitly says priority gas auctions do not exist and higher fees do not
  move a transaction ahead of earlier arrivals.
- Do not treat a public RPC round trip, an indexer update, an oracle update, and
  settlement finality as the same latency.
- Do not add signing, key custody, transaction construction, or submission to
  `journal/`. Its read-only and paper-only posture remains unchanged.

---

## 1. Research posture and confidence

### 1.1 Source policy

Load-bearing statements in this specification use first-party Robinhood Chain
documentation, Robinhood’s mainnet announcement, onchain/public-RPC evidence,
or the primary repositories for Arbitrum/Uniswap integrations. Partner claims
are treated as “documented ecosystem support,” not proof of volume, depth,
uptime, decentralization, or production quality.

Every volatile figure rendered in the instrument must retain the project’s
existing `~` marker and `2026-08` date. Re-check all endpoint URLs, contract
addresses, validator counts, ArbOS/Nitro versions, bridge routes, DEX support,
and oracle heartbeats during implementation and again before release.

### 1.2 Confirmed, inferred, and unknown

| Claim | Confidence | Treatment in content |
|---|---|---|
| Public mainnet launched July 1, 2026 | Confirmed by Robinhood announcement and live docs | State as fact with date. |
| Chain IDs 4663 / 46630; ETH gas; Ethereum blobs; Arbitrum Nitro | Confirmed by docs and chain config | State as fact. |
| Robinhood operates the sequencer | Confirmed by Chain Terms | State as fact. |
| FCFS ordering; fees do not buy position | Confirmed by core-concepts docs | State as fact. |
| Soft confirmation sub-second; L1 posting minutes; Ethereum finality ~13 minutes after posting | Confirmed as documented typical latency | Preserve “typically” / `~`; never promise an SLA. |
| Two allowlisted BoLD validators, operated by Offchain Labs and Alchemy | Confirmed as of research date | Mark `~2 · 2026-08`; re-check before publication. |
| No canonical public mempool is documented | Confirmed absence in official integration docs, not proof no provider exposes pending flow | Say “no canonical public mempool documented,” not “private by construction.” |
| Atomic arbitrage, backruns, liquidations, and launch sniping are possible | Inference from EVM composability, deployed venues, and ordering model | Label as architectural capability; do not imply measured prevalence. |
| Sandwiching is structurally constrained by non-public submission/RFQ, but still possible if intent leaks | Inference | Use `limited`, not `none`. |
| Liquidity is deep | Not established | Never claim it. Measure per pair and venue. |
| Robinhood customer count or brokerage volume predicts chain usage | Unsupported and prohibited by brand guidance | Never blend those metrics. |

### 1.3 Reproducible network observation

This observation is supporting context, not a protocol guarantee:

- Source: public mainnet JSON-RPC at
  `https://rpc.mainnet.chain.robinhood.com`.
- Query time: `2026-08-29T01:16:47Z` (`2026-08-28 18:16:47 PDT`).
- Method: `eth_getBlockByNumber` for L2 blocks `48,755,371` and
  `48,754,371`, exactly 1,000 blocks apart.
- The reported timestamps were 101 seconds apart, or approximately 9.90 L2
  blocks per second across that sample. The last ten sampled blocks occupied
  two timestamp seconds.
- The sampled base fees were approximately `0.0646 gwei`; this is not the total
  transaction fee because Robinhood Chain also charges an L1 data component.

Interpretation: Nitro may emit multiple L2 blocks per second under activity and
may behave differently when idle. Block-count deadlines are therefore the
wrong abstraction for user-facing wall-clock guarantees. The page should use
the official “sub-second soft confirmation” language and show the three-stage
finality ladder. If a future version publishes observed cadence, it must include
the exact sample period, method, endpoint, and percentile distribution.

---

## 2. Robinhood Chain technical profile

### 2.1 Identity and endpoints

| Property | Mainnet | Testnet |
|---|---|---|
| Display name | Robinhood Chain | Robinhood Chain Testnet |
| EIP-155 chain ID | `4663` (`0x1237`) | `46630` |
| Parent | Ethereum mainnet (`1`) | Ethereum Sepolia |
| Native gas asset | ETH | Test ETH |
| Public RPC | `https://rpc.mainnet.chain.robinhood.com` | `https://rpc.testnet.chain.robinhood.com` |
| Sequencer feed | `wss://feed.mainnet.chain.robinhood.com` | `wss://feed.testnet.chain.robinhood.com` |
| Sequencer endpoint | `https://sequencer.mainnet.chain.robinhood.com` | `https://sequencer.testnet.chain.robinhood.com` |
| Explorer | `https://robinhoodchain.blockscout.com` | `https://explorer.testnet.chain.robinhood.com` |

Public endpoints are rate-limited and are not recommended for production,
high-throughput, or latency-sensitive systems. Production designs should use
at least two independent managed providers or one managed provider plus a
self-hosted full node. Sending through multiple RPC façades that all converge
on the same sequencer is transport redundancy, not sequencer decentralization.

### 2.2 Topology, trust, and control planes

```text
wallet / bot / dapp
        │ signed EVM transaction
        ▼
RPC provider(s) ───────► Robinhood-operated sequencer
        │                         │
        │ read/submit             ├─ FCFS arrival ordering
        │                         ├─ sequencer-level screening
        │                         └─ sub-second soft receipt + feed
        │                                      │
        ▼                                      ▼
Nitro full nodes ◄──────── ordered L2 feed / batches
        │                                      │
        ├─ re-execute EVM state                └─ compressed data in Ethereum blobs
        │                                                        │
        ▼                                                        ▼
allowlisted BoLD validators ── challenge invalid assertion ── Ethereum
                                                                 │
                                              minutes to post; ~13 min to finalize
```

This is not one consensus set. The instrument must distinguish:

- **Ordering:** one Robinhood-operated sequencer chooses the order by arrival.
- **Execution verification:** Nitro full nodes can be run independently and
  replay the ordered state transition.
- **Dispute resolution:** BoLD fraud proofs currently use a permissioned set;
  official docs listed two validators on the research date.
- **Data availability and settlement:** batches use Ethereum blobs and inherit
  Ethereum finality after publication/finalization.
- **Protocol governance:** an eight-seat Security Council controls upgrades.
  Routine actions require 6/8 approval plus a seven-day onchain timelock;
  emergency actions require 7/8 and bypass the timelock. Robinhood holds two
  seats.

The network is permissionless at the user/contract layer, but that does not
mean every control plane is permissionless. This distinction is central to the
CH-01 comparison.

### 2.3 Transaction lifecycle

1. A user signs an EIP-155 transaction for chain ID 4663, or a smart account
   submits an ERC-4337 UserOperation.
2. The transaction reaches the sequencer through an RPC/sequencer path.
3. The sequencer screens it and orders accepted transactions by arrival time.
   Paying more gas does not move it ahead of already-arrived transactions.
4. Nitro executes transactions with EVM semantics. A receipt is a soft
   confirmation backed by the sequencer’s commitment, not Ethereum finality.
5. The sequencer compresses a batch and posts its data to Ethereum.
6. After publication, ordering is fixed unless Ethereum reorganizes.
7. The containing Ethereum block later finalizes, approximately 13 minutes
   after posting under the documented typical case.

Standard Nitro also provides a censorship-resistance fallback through the
Delayed Inbox on Ethereum: a transaction can bypass the fast sequencer path and
eventually be force-included after the protocol delay. This is an expensive,
slow escape hatch, not a low-latency production path. Verify Robinhood
Chain-specific delay parameters and operational support before depending on it.

Canonical L2→L1 withdrawals add a separate approximately seven-day challenge
period and a final L1 claim transaction. Faster bridges replace some of that
latency with relayer/solver liquidity and their own trust, inventory, and
failure assumptions.

### 2.4 Execution and Solidity differences that affect products

- `block.number` returns an estimate of the Ethereum block number, not the L2
  block height. Read the actual L2 count through `ArbSys.arbBlockNumber()`.
- `block.prevrandao` / `block.difficulty` is constant and must never be used as
  randomness.
- `block.coinbase` is the network fee account, not a miner or validator.
- L1→L2 contract calls apply Arbitrum address aliasing to `msg.sender`.
- Transaction fees combine L2 execution gas with an L1 data fee based on
  calldata and Ethereum conditions.
- Contract code may be up to 96 KB and init code up to 192 KB, but deploying a
  contract that large reduces portability and expands audit surface.
- Robinhood Chain supports ERC-4337 and EIP-7702 account-abstraction patterns.
  Gas sponsorship improves onboarding but introduces bundler, paymaster,
  policy, and denial-of-service dependencies.
- The official node guide listed ArbOS 61 and Nitro image
  `v3.11.2-3599aca` on the research date. These are operational pins, not
  timeless chain properties.

### 2.5 Fees and ordering

The fee equation is conceptually:

```text
total paid ≈ L2 execution gas + compressed L1 data share
```

`eth_estimateGas` and wallet estimates bundle both components. Calldata size
therefore matters even when L2 execution is cheap. Batching can save overhead,
but a larger atomic batch increases revert blast radius and calldata cost.

The key contrast for CH-02 and CH-03 is:

```text
Solana: priority fee per compute unit + local account contention + optional Jito tip
Robinhood Chain: EVM gas pays execution/data; sequencer arrival fixes order
```

There is no documented Robinhood Chain analogue to Jito’s bundle/tip auction.
One EVM transaction or smart-account multicall can still make multiple calls
atomically, but separate transactions do not become an atomic bundle merely
because they are submitted together.

### 2.6 Assets, bridges, and liquidity surfaces

- Canonical bridge: Ethereum↔Robinhood Chain, approximately 10-minute deposits
  and seven-day withdrawals.
- Faster routes documented by Robinhood Chain: LayerZero/Stargate,
  Chainlink CCIP/Transporter, Relay, Across, and LiFi/0x aggregation.
- Canonical mainnet assets documented by Robinhood Chain include WETH at
  `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` and USDG at
  `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`.
- Uniswap v2, v3, v4, Universal Router, Permit2, and UniswapX contracts have
  primary deployment records for chain ID 4663.
- The documented application stack includes Uniswap, Rialto propAMM, Morpho,
  Lighter, Arcus, USDG, Chainlink, and cross-chain providers. Presence is not
  proof that a particular asset has routable depth.

Every bridged ERC-20 has a chain-specific address. The same symbol across two
addresses is not evidence of canonical identity. Resolve canonical bridge
addresses from the gateway or verified registry and maintain an explicit
`(origin chain, origin address) → (destination chain, destination address)`
mapping.

### 2.7 Stock Tokens are a distinct integration track

Robinhood Stock Tokens are 18-decimal ERC-20 tokenised debt securities issued
by Robinhood Assets (Jersey) Limited. They provide economic exposure to an
underlying security but do not grant ownership rights in that underlying.
Only authorized participants can mint/burn with the issuer in the primary
market; ordinary developers compose with circulating tokens on secondary
venues.

Stock Token integrations must additionally handle:

- the onchain asset registry and canonical contract address;
- ERC-8056 `uiMultiplier()` and UI-adjusted balances;
- scheduled multiplier changes for dividends/splits;
- Chainlink per-token feeds whose value already includes the multiplier;
- a 24/5 feed schedule despite 24/7 token transfer/trading surfaces;
- sequencer-up checks, heartbeat/staleness checks, and a post-outage grace
  period;
- advisory `oraclePaused()` state during corporate actions; and
- jurisdiction and eligibility restrictions.

The read-only REST API exposes asset metadata, raw-underlier bid/ask prices,
corporate actions, and multiplier state. Its price and the onchain feed are not
the same unit: the REST price is raw underlier bid/ask, while the Chainlink feed
is multiplier-adjusted. Mixing them without conversion is a valuation bug.

---

## 3. Exact mapping to current SOLANA//SCOPE content

The existing data model has four comparator axes, eight techniques, six tool
functions, five bench columns, 49 terms, 24 cues, 53 entities, and a
JavaScript-off mirror. Robinhood Chain touches all of these systems.

### 3.1 CH-01 · topology comparator

Use these six metric values for `chains.robinhood_chain.topology.metrics`:

| Existing key | Robinhood Chain value |
|---|---|
| consensus | Arbitrum Nitro optimistic rollup; Ethereum DA/settlement; BoLD fraud proofs |
| block / slot cadence | on-demand Nitro L2 blocks; sub-second sequencer soft confirmation |
| who proposes | single Robinhood-operated sequencer, FCFS by arrival |
| validating set | anyone may run a full node; `~2` allowlisted BoLD validators (`2026-08`) |
| block propagation | sequencer WebSocket feed; compressed batches posted in Ethereum blobs |
| hardware floor | `8+` CPU cores, `64 GB` RAM (`128 GB` recommended), NVMe, several TB, plus L1 execution + beacon endpoints |

Delta strip:

> Solana rotates ordering through scheduled leaders; Robinhood Chain compresses
> ordering into one sequencer and pushes hard settlement to Ethereum.

Diagram template: `rollup-stack`.

- Top lane: wallets/RPCs converge on one sequencer.
- Middle lane: sequencer fans ordered blocks to full nodes and the feed.
- Bottom lane: batches descend to Ethereum blobs; two challenger nodes flank
  the assertion path.
- One animation: a transaction receives an immediate soft pulse, then a slower
  batch pulse reaches Ethereum.
- Static/reduced-motion labels must show `SOFT`, `POSTED`, and `FINAL`, not just
  a moving dot.

### 3.2 CH-02 · transaction-flow comparator

| Existing key | Robinhood Chain value |
|---|---|
| pre-block staging | direct/provider submission to sequencer; no canonical public mempool documented |
| fee model | ETH gas = L2 execution + L1 data; higher fee does not buy earlier order |
| execution | sequential EVM semantics on Nitro; one transaction may call/multicall atomically |
| inclusion latency (typ.) | sub-second soft receipt |
| finality | batch posting in minutes; Ethereum finality `~13 min` after posting |
| expiry / replay | EVM account nonce + chain ID; deadline is application-defined, no recent-blockhash expiry |

Delta strip:

> Solana prices urgency around hot accounts; Robinhood Chain charges for
> execution and Ethereum data while arrival time fixes the queue.

Diagram template: `sequencer-ladder`.

- Three RPC arrows race to one sequencer ingress.
- Accepted calls form one ordered EVM lane.
- A receipt branches immediately to the user; a batch continues to Ethereum.
- A deliberately higher-fee transaction arriving second must remain second.

### 3.3 CH-03 · MEV comparator

| Existing key | Robinhood Chain value |
|---|---|
| visibility of pending txs | sequencer/provider sees submitted order flow; no canonical public mempool documented; RFQ intent may remain offchain |
| ordering market | FCFS centralized sequencer; no priority gas auction or documented public bundle auction |
| dominant plays | latency arb, backruns, liquidations, CEX–DEX arb, launch sniping; sandwiches require visible/leaked intent |
| user protection | RFQ/intents, tight slippage and deadlines, limit prices, trusted submission paths; no official protection RPC documented |

Delta strip:

> Robinhood Chain removes the public gas auction, not ordering value: the edge
> moves to who reaches the sequencer—and who keeps intent private—first.

Diagram template: `fcfs-race`.

- Two transactions take routes with different network delay.
- Arrival order, not gas-price label, fixes placement.
- An RFQ route reveals only the signed fill to the settlement path.
- Never depict “MEV-free.”

### 3.4 CH-04 · latency comparator

| Existing key | Robinhood Chain value |
|---|---|
| decision window | sub-second sequencer soft confirmation; no fixed user-facing block interval |
| does colocation matter | yes—FCFS rewards low and low-variance arrival latency to sequencer/provider |
| fast-data rails | sequencer feed, managed WebSockets, full-node feed input, Chainlink Data Streams for market data |
| preconfirmations | sequencer receipt is the native soft confirmation; hard guarantee arrives after L1 publication/finality |
| frontier | market-data → decision → sequencer path, feed gap recovery, and offchain hedge latency |

Delta strip:

> Solana’s race is leader-local and shred-driven; Robinhood Chain’s is
> sequencer-local, then waits minutes for Ethereum anchoring.

`windowMs` must not pretend to be a protocol block time. Add a comparator field
`windowKind: "soft-confirmation"` and render `<1000 ms typ.` on the log ladder.
The detail panel then shows `minutes to L1 post` and `~13 min after post to L1
finality` as two secondary markers.

### 3.5 CH-05 · technique grid

Add `robinhood_chain` to `benchCols`. Do not assign a `hot` state without a
measured, cited activity dataset. For this chain, `active` means the capability
and a relevant production venue are verified; `limited` means the market
structure constrains the play; it does not measure profit or volume.

| Technique | State | Robinhood Chain note | Link target |
|---|---:|---|---|
| Atomic arbitrage | active | Multiple EVM liquidity surfaces can be composed in one transaction. FCFS replaces the public gas auction with an arrival race. | `robinhood-sequencer` |
| Sandwiching | limited | No canonical public mempool is documented and RFQ keeps quoting offchain, but leaked provider/solver flow or visible AMM intent can still be bracketed. | `robinhood-orderflow` |
| Liquidations | active | Lending/perps plus Chainlink feeds create keeper races; stale-feed and sequencer-up guards are part of the opportunity boundary. | `robinhood-streams` |
| Backrunning | active | Bots can react after oracle updates or swaps; low-latency feed and sequencer arrival determine the first safe reaction. | `robinhood-feed` |
| JIT liquidity | active | Uniswap concentrated-liquidity deployments make short-lived LP placement possible; actual prevalence must be measured. | `uniswap-robinhood` |
| CEX–DEX arb | active | RWA/crypto venue divergence can be hedged against AMM, RFQ, propAMM, or order-book liquidity; 24/5 underlier feeds create session boundaries. | `robinhood-orderflow` |
| Spam / probabilistic racing | active | FCFS rewards transport speed; duplicate raw-tx submission may improve path redundancy, but fee bidding does not jump the queue and nonce conflicts can hurt reliability. | `robinhood-sequencer` |
| Mint / launch sniping | active | Permissionless ERC-20 and Uniswap launch infrastructure make launches possible; FCFS makes initialization/first-fill arrival time decisive unless an auction distributes first. | `uniswap-launcher` |

### 3.6 CH-05 · tool bench

Rename the current function label `Ordering auction` to
`Ordering / sequencing`. Several existing entries—including BTC accelerators
and Robinhood Chain FCFS—are not auctions in the same sense as Jito or PBS.

Add these records:

| ID | Function | Display name | Stance | Teaching blurb |
|---|---|---|---|---|
| `robinhood-sequencer` | Ordering / sequencing | Robinhood Chain FCFS sequencer | neutral | One operator orders accepted transactions by arrival; gas does not buy position. |
| `robinhood-orderflow` | Order-flow auction / intents | UniswapX · 0x RFQ · 1inch Fusion · LiFi | protect | Quotes/intents stay offchain until settlement, reducing public preview while adding solver and route dependencies. |
| `robinhood-feed` | Fast data feed | Robinhood Chain sequencer feed · WebSockets | neutral | Ordered L2 updates arrive before a conventional indexer; consumers must detect gaps and backfill. |
| `robinhood-fees` | Priority market | FCFS gas policy | neutral | ETH pays L2 execution plus Ethereum data; a larger tip does not move the transaction ahead. |
| `robinhood-node` | Node/client edge | Nitro full node · ArbOS · L1 blob reader | neutral | Independent reads require L2 state plus Ethereum execution and beacon/blob access. |
| `robinhood-streams` | Fast data feed | Chainlink Data Streams | neutral | Signed sub-second offchain market reports can be verified onchain for perps, options, and liquidations. |

Add a seventh function, `Launch & bootstrap`, and this record:

| ID | Function | Display name | Stance | Teaching blurb |
|---|---|---|---|---|
| `uniswap-launcher` | Launch & bootstrap | Uniswap Liquidity Launcher | neutral | A continuous-clearing auction distributes tokens, then migrates proceeds and inventory into a Uniswap v4 pool. |

Do not hardcode mutable Liquidity Launcher addresses into teaching prose. The
primary SDK recorded several Robinhood Chain-specific redeployments during
July/August 2026. Render “resolve from current SDK + verify onchain” as an
operational signal; keep addresses in a dated implementation ledger only.

### 3.7 Entity and term additions

Add these entity routes:

| ID | Kind | Required content |
|---|---|---|
| `robinhood-chain` | chain | topology, three-stage finality, governance, bridges, transaction screening, RWA focus |
| `robinhood-sequencer` | tool | FCFS ordering, operator, screening, soft receipts, outage/centralization risks |
| `robinhood-feed` | tool | WebSocket feed, full-node input, gap recovery, not an oracle |
| `robinhood-orderflow` | tool | RFQ/intents/propAMM/AMM tradeoffs and visibility |
| `robinhood-fees` | tool | L2 execution vs L1 data charges and why fees do not buy ordering priority |
| `robinhood-node` | tool | Nitro/ArbOS, L1 execution + beacon dependencies, feed input, and operational cost |
| `robinhood-streams` | tool | pull-based signed reports, verifier, staleness and sequencer checks |
| `uniswap-launcher` | tool | CCA, token acquisition/creation, graduation to v4, current-SDK warning |

Add hoverdoc terms with matching `kind: "term"` entity routes and primary links:

- `arbitrum-nitro`
- `sequencer-soft-confirmation`
- `bold-fraud-proofs`
- `l1-data-fee`
- `erc-8056`
- `corporate-action-multiplier`
- `sequencer-uptime-feed`

Expected post-integration content counts, assuming no removals or intentional
ID overlaps:

| Collection | Current | Add | Expected |
|---|---:|---:|---:|
| comparison chains (excluding SOL reference) | 4 | 1 | 5 |
| bench columns (including SOL) | 5 | 1 | 6 |
| techniques | 8 | 0 | 8 |
| tools | 23 | 7 | 30 |
| hoverdoc terms | 49 | 7 | 56 |
| cues | 24 | 2 | 26 |
| entities | 53 | 15 | 68 |

The Robinhood Chain entity diagram uses `rollup-stack`. The sequencer and feed
entities use `fcfs-race` and `sequencer-ladder`. The Liquidity Launcher entity
needs a new `cca-graduation` diagram:

```text
TOKEN SUPPLY → CONTINUOUS-CLEARING AUCTION → CLEARING PRICE
                         │
                         └──────── proceeds + remaining inventory
                                           ↓
                                      UNISWAP V4 POOL
```

### 3.8 Cues and search

Add two cues:

1. `ch1-robinhood-finality` opens the Robinhood Chain topology dock and says:
   “Fast receipt, slow anchor: the sequencer commits first; Ethereum makes the
   order hard later.”
2. `ch5-robinhood-launch` opens the launch technique/tool path and says:
   “FCFS makes a fixed first fill a network race; an auction distributes before
   the pool becomes the price.”

Search must index the full display name, aliases such as `Arbitrum L2`, `Nitro`,
`FCFS sequencer`, `Stock Tokens`, and `Liquidity Launcher`, but must not render
or encourage prohibited Robinhood Chain abbreviations.

### 3.9 UI and brand constraints

- Use `robinhood_chain` only as an internal JSON key. Display
  `Robinhood Chain` everywhere.
- Do not use the standard Robinhood master logo, invent a text glyph, recolor a
  logo, or combine it with the instrument’s decorations.
- A normal text label is sufficient in comparator chips. If the narrow CH-05
  column needs an icon, use the official Robinhood Chain feather asset exactly
  as supplied, at least 20 px high, with `aria-label="Robinhood Chain"`.
- `#CCFF00` (Robin Neon) may be a non-logo signal accent after contrast testing.
  The official logo may only use its approved black/white/Robin Neon pairings.
- Keep chain metrics distinct from Robinhood brokerage or Robinhood Crypto
  figures. Every activity statistic needs method, period, and source.
- Use the approved `Stock Tokens` wording; avoid unapproved substitute names.
- Do not reference a similarly named public-company ticker in chain content.
- The six-chain mobile technique grid must remain within the viewport. At
  360 px, target a 104 px row-label column plus six 32 px state cells and gaps;
  if that cannot pass fit QA, use an inner horizontal scroller with explicit
  edge affordances—never document-level overflow.

### 3.10 `#chainData` schema extension

The current fixed shapes need two small generalizations:

```json
{
  "chainOrder": ["btc", "eth", "bnb", "zec", "robinhood_chain"],
  "benchCols": ["sol", "eth", "bnb", "btc", "zec", "robinhood_chain"],
  "chains": {
    "robinhood_chain": {
      "name": "Robinhood Chain",
      "label": "Robinhood Chain",
      "color": "#CCFF00",
      "glyph": null,
      "windowKind": "soft-confirmation",
      "windowMs": 1000,
      "observed": false,
      "dated": "2026-08",
      "diagrams": {
        "topology": "rollup-stack",
        "txflow": "sequencer-ladder",
        "mev": "fcfs-race",
        "latency": "finality-ladder"
      }
    }
  }
}
```

`windowMs: 1000` is a visualization ceiling for “sub-second,” not an asserted
block time. The renderer must inspect `windowKind`; a tooltip must say
`typical soft-confirmation bound shown`, and the data source must not feed a
“blocks per second” calculation.

Add optional tool properties:

```json
{
  "absence": false,
  "confidence": "confirmed | inferred",
  "dated": "2026-08"
}
```

Use `absence: true` only for an explicit row such as “no documented protection
RPC” or “no priority ordering market.” An absence card must render as an
outlined informational state, not a product or a negative score.

### 3.11 JavaScript-off mirror

Update, in the same change:

- all four static compare tables;
- all four delta lists;
- the CH-05 six-chain technique grid;
- the tool matrix and launch/bootstrap row;
- glossary rows for every new term; and
- entity-index rows matching name, kind, tagline, and primary link exactly.

The no-JavaScript table should spell out Robinhood Chain even if the interactive
grid uses the official compact symbol.

---

## 4. Journal integration specification

### 4.1 Design decision

Do not force EVM records into the existing Solana-specific tables. A Solana
signature/slot/lamport record and an EVM transaction-hash/block/wei/log record
are not interchangeable. Add parallel EVM tables and normalized cross-chain
views. Preserve every existing table and API until consumers migrate.

### 4.2 Proposed migration

Create append-only migration `0003-evm-observation.sql`:

```sql
CREATE TABLE networks (
  id TEXT PRIMARY KEY,                 -- solana | robinhood_chain
  family TEXT NOT NULL,                -- solana | evm
  chain_id INTEGER,                    -- NULL for Solana, 4663 here
  native_symbol TEXT NOT NULL,
  finality_model TEXT NOT NULL
);

CREATE TABLE evm_addresses (
  network TEXT NOT NULL REFERENCES networks(id),
  address TEXT NOT NULL,               -- lowercase 0x form for keys
  checksum_address TEXT NOT NULL,
  label TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  added_at INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (network, address)
);

CREATE TABLE evm_blocks (
  network TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  block_hash TEXT NOT NULL,
  parent_hash TEXT NOT NULL,
  ts INTEGER NOT NULL,
  l1_block_number INTEGER,
  tx_count INTEGER NOT NULL,
  gas_used TEXT NOT NULL,              -- decimal string; avoid JS integer loss
  base_fee_wei TEXT,
  observed_at INTEGER NOT NULL,
  PRIMARY KEY (network, block_number),
  UNIQUE (network, block_hash)
);

CREATE TABLE evm_txs (
  network TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  tx_index INTEGER NOT NULL,
  ts INTEGER NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT,
  nonce TEXT NOT NULL,
  value_wei TEXT NOT NULL,
  gas_used TEXT,
  effective_gas_price_wei TEXT,
  status INTEGER,
  input_selector TEXT,
  kind TEXT,
  observed_at INTEGER NOT NULL,
  PRIMARY KEY (network, tx_hash)
);

CREATE TABLE evm_logs (
  network TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  block_number INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  topic0 TEXT,
  topics TEXT NOT NULL DEFAULT '[]',
  data TEXT NOT NULL,
  removed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (network, tx_hash, log_index)
);

CREATE TABLE evm_finality (
  network TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  stage TEXT NOT NULL,                 -- soft | l1-posted | l1-final
  stage_ts INTEGER NOT NULL,
  l1_tx_hash TEXT,
  evidence TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (network, block_number, stage)
);
```

Keep big EVM integer quantities as validated decimal strings in storage and
convert with `bigint` in TypeScript. SQLite `INTEGER` cannot safely represent
every uint256 and JavaScript `number` cannot safely represent wei balances.

### 4.3 Source adapter

Add `journal/src/sources/evm-rpc.ts` behind this interface:

```ts
interface EvmSource {
  id: "robinhood-rpc" | "robinhood-node";
  chainId(): Promise<bigint>;
  blockNumber(): Promise<bigint>;
  block(n: bigint): Promise<EvmBlock | null>;
  receipt(hash: string): Promise<EvmReceipt | null>;
  logs(filter: EvmLogFilter): AsyncIterable<EvmLog>;
  balance(address: string, block: bigint): Promise<bigint>;
  health(): Promise<{ ok: boolean; latencyMs: number; head: bigint | null }>;
}
```

Minimum JSON-RPC methods:

- `eth_chainId`—hard fail unless `4663`;
- `eth_blockNumber`;
- `eth_getBlockByNumber`;
- `eth_getTransactionReceipt`;
- `eth_getLogs` with bounded ranges and adaptive splitting;
- `eth_getBalance`; and
- `eth_call` for ERC-20 metadata/balances and optional oracle/multiplier reads.

WebSocket/new-head and sequencer-feed listeners are optimization sources, not
the source of truth. Every disconnect must resume from the last committed
block, compare the stored parent hash, mark removed logs if necessary, and
backfill over HTTP. A feed event is never enough to mark `l1-final`.

### 4.4 Configuration

Extend config without breaking the current Solana watchlist:

```json
{
  "networks": {
    "robinhood_chain": {
      "chainId": 4663,
      "rpcUrlEnv": "ROBINHOOD_CHAIN_RPC_URL",
      "wsUrlEnv": "ROBINHOOD_CHAIN_WS_URL",
      "confirmations": {
        "display": "soft",
        "accounting": "l1-posted",
        "irreversible": "l1-final"
      }
    }
  },
  "evmWatchlist": [
    { "network": "robinhood_chain", "address": "0x…", "label": "…" }
  ]
}
```

Never commit provider keys. The public RPC is a default for a manual smoke test,
not for watch mode. Watch mode should refuse a high-frequency interval against
the public endpoint unless the user explicitly opts in.

### 4.5 Cross-chain normalized views

Expose views rather than erasing chain-specific meaning:

```text
v_activity(network, tx_id, chain_position, ts, status, kind)
v_fees(network, tx_id, native_fee, usd_fee_nullable, ts)
v_balances(network, address, asset_id, raw_amount, decimals, ts)
v_latency(network, sample, rpc_ms, soft_ms, index_ms, l1_post_ms, l1_final_ms)
```

`chain_position` is a textual union (`slot:123` or `block:456`) for display,
not a sortable cross-chain clock. A cross-chain time series sorts by UTC
timestamp and retains network-specific cursor/finality metadata.

### 4.6 Journal metrics for Robinhood Chain

Collect, when observable:

- `rpc.latency_ms` by provider and method;
- `head.lag_blocks` and `head.lag_ms` between providers;
- `block.interval_ms`, preserving zero/same-second timestamp observations;
- `block.tx_count` and `block.gas_used`;
- `receipt.soft_ms` from local submission telemetry only—never infer it from
  block timestamps in the read-only journal;
- `indexer.lag_ms`;
- `oracle.age_ms`, `oracle.paused`, and `sequencer.uptime` for configured feeds;
- `pool.depth_1pct_usd`, `pool.depth_2pct_usd`, spread, and realized slippage;
- `bridge.deposit_age_ms` and `bridge.withdrawal_stage`; and
- `finality.l1_post_ms` / `finality.l1_final_ms` when the required L1 evidence
  adapter exists.

All trading or launch simulations remain `PAPER · HYPOTHETICAL` and must list
gas, L1 data fees, spread, hedge latency, sequencer risk, bridge risk, adverse
selection, and market-maker inventory assumptions.

### 4.7 Journal safety acceptance

- No `eth_sendRawTransaction`, wallet client, signer, mnemonic, private key,
  account creation, approval, or contract deployment code exists under
  `journal/src`.
- EVM address and hash validators reject malformed inputs; checksum form is
  display-only and lowercase form is the storage key.
- Cursor and rows commit atomically; restart creates no gaps or duplicates.
- Parent-hash mismatch triggers bounded rewind and replay.
- A test fixture exercises same-second blocks, a removed log, a provider head
  lag, a large uint256, and the three finality stages.
- Existing Solana tests, CLI behavior, and data remain unchanged.

---

## 5. Follow-up: coin-launch playbook

This section covers an ordinary permissionless ERC-20 launch and the optional
Uniswap Liquidity Launcher path. It is an engineering/operations checklist, not
legal, tax, listing, market-making, or investment advice. A launch involving
securities, RWAs, revenue share, redemption rights, stable value, or restricted
jurisdictions needs specialized counsel before code or marketing is finalized.

### 5.1 First choose which product exists

| Question | Decision |
|---|---|
| Is this an ordinary crypto token or an RWA/security-like instrument? | Do not copy the Stock Token model for an ordinary coin. Escalate regulated-asset design to counsel and service providers. |
| Is Robinhood Chain the canonical home or one deployment of a multichain supply? | Choose one canonical issuance ledger. Never permit independent uncapped minting on multiple chains. |
| Fixed supply, capped mint, or policy-controlled mint? | Encode the smallest authority set the product truly needs. Publish the answer. |
| Immutable or upgradeable? | Prefer immutable for a simple token. If upgradeable, disclose proxy/admin/timelock controls and test upgrade failure paths. |
| Fair auction, instant fixed-price pool, presale, airdrop, or treasury distribution? | Choose before contract implementation because allocation, anti-snipe behavior, custody, and disclosures differ. |
| Quote asset WETH or USDG? | WETH carries crypto beta; USDG gives simpler dollar accounting but introduces stablecoin/issuer and bridge liquidity risk. |
| AMM, RFQ, propAMM, order book, or hybrid? | Early/thin markets usually need at least one inventory-backed quote path plus transparent public liquidity. |

An ERC-20 deployed on Robinhood Chain still requires ETH for gas. The project
token cannot silently become the chain’s native gas asset. Deployment also does
not create a Robinhood product listing, distribution agreement, or endorsement.

### 5.2 Solana-to-Robinhood Chain launch translation

| Solana-centric concept | Robinhood Chain equivalent / difference |
|---|---|
| SPL mint account | ERC-20 contract address |
| Mint authority | `Ownable`/`AccessControl` minter role or immutable fixed supply |
| Freeze authority | Pausable/transfer-policy contract role, if intentionally added |
| Token-2022 extensions | Explicit ERC interfaces/hooks; compatibility must be tested per venue |
| Associated token account | Address balance inside the ERC-20; spending uses allowances/Permit2 |
| Recent blockhash expiry | Nonce + chain ID; application/permit/order deadlines are separate |
| Compute units + priority fee | EVM gas + L1 data fee; higher gas does not buy FCFS position |
| Jito atomic bundle | One EVM transaction/multicall is atomic; no documented public bundle auction |
| Parallel account execution | Sequential EVM state-transition semantics |
| Leader/shred latency race | Provider/network path to one sequencer + sequencer feed |
| Raydium/Meteora/launchpad liquidity | Uniswap v2/v3/v4, Liquidity Launcher, RFQ, propAMM/order-book partners |
| Confirmed/finalized commitment | Sequencer soft → L1 posted → Ethereum finalized |

### 5.3 Step-by-step launch procedure

#### Step 0 — establish authority and go/no-go gates

1. Name one accountable launch owner, security owner, treasury owner, liquidity
   owner, compliance owner, and incident commander.
2. Obtain a written asset-classification and jurisdiction memo where required.
3. Document distribution, insider/treasury allocations, vesting, unlocks,
   mint/burn authority, upgrade authority, pause/blocklist powers, and the
   conditions under which each can be used.
4. Confirm branding does not imply Robinhood sponsorship/listing and does not
   use Robinhood Chain marks inside token artwork or metadata.
5. Define launch abort criteria: critical audit issue, incorrect bytecode,
   stale oracle, insufficient quote inventory, missing explorer verification,
   provider divergence, sequencer incident, or bridge incident.

Exit evidence: signed launch brief, authority matrix, risk acceptance, and
incident contacts.

#### Step 1 — choose token and distribution architecture

For a simple coin, prefer a standard audited ERC-20 implementation with:

- explicit name, symbol, decimals, and total/capped supply;
- no hidden tax, blacklist, rebasing, reflection, or transfer callback;
- `ERC20Permit` only if required and tested against chain ID 4663;
- roles held by a multisig, not an individual externally owned account;
- role changes behind a timelock when operationally possible;
- separate vesting contracts for team/investor allocations; and
- a published contract/control manifest.

If the launch needs transfer restrictions, fees, rebasing, upgradeability, or
cross-chain mint/burn, treat it as a bespoke protocol: threat-model each role,
hook, oracle, bridge, and upgrade. “EVM-compatible” does not make a nonstandard
token compatible with routers, Permit2, pools, custodians, or indexers.

Choose one distribution path:

- **Continuous-clearing auction → v4 pool:** strongest default for open price
  discovery and reduced first-fill advantage. Use the current Uniswap Liquidity
  Launcher SDK and contracts after verifying the deployment registry onchain.
- **Instant pool:** simplest, but the first initialization/fill becomes an FCFS
  latency contest. Appropriate only if that behavior is deliberate and
  disclosed.
- **RFQ/market-maker opening:** controlled early spread/depth, but users depend
  on maker availability and signed-quote policies.
- **Hybrid:** auction or initial distribution, public AMM at graduation, and RFQ
  as supplemental depth.

Exit evidence: contract architecture diagram, supply invariant, role table,
and selected launch mechanism.

#### Step 2 — implement and test chain-specific correctness

1. Use current audited dependencies with exact version/commit pins.
2. Assert chain ID 4663 in deploy configuration and 46630 in testnet
   configuration.
3. Never use `block.number` as L2 elapsed time. Use absolute timestamps for
   user-facing deadlines, test timestamp boundary behavior, and remember that
   the sequencer supplies L2 timestamps within protocol constraints.
4. Never use `block.prevrandao` or `block.difficulty` for allocation/randomness.
   Use a suitable verifiable randomness service or a commit/reveal design.
5. If L1 contracts call L2 contracts, account for Arbitrum address aliasing in
   authorization checks.
6. Test standard ERC-20 operations, Permit2/allowances if supported, zero and
   maximum amounts, role rotation, pause/unpause if present, mint cap, vesting
   boundaries, rescue functions, and reentrancy around any callbacks.
7. Fuzz the supply invariant:

   ```text
   circulating + treasury + vesting + launcher inventory + burned
   = authorized total supply
   ```

8. Test explorer source verification from a clean build and verify compiler,
   optimizer, constructor arguments, libraries, proxy implementation, and
   admin addresses.

Exit evidence: reproducible build, unit/fuzz/invariant report, testnet contract,
and verified source.

#### Step 3 — stage on Robinhood Chain Testnet

1. Add chain ID 46630 and the official testnet RPC/explorer.
2. Fund throwaway test accounts from the official faucet.
3. Deploy the exact release candidate with production-like roles, vesting,
   launcher/pool parameters, and metadata.
4. Run at least two independent RPC providers and compare heads, receipts,
   logs, gas estimates, and WebSocket delivery.
5. Exercise same-nonce duplicate submission of the identical raw transaction
   through redundant paths. Do not race different replacements and assume a
   higher fee buys priority—it does not.
6. Simulate WebSocket loss and backfill with `eth_getLogs`.
7. Simulate sequencer downtime: disable writes, mark UI state degraded, check
   oracle uptime/staleness, and recover only after the defined grace period.
8. Exercise a sharp Ethereum-data-fee increase and a reverted multicall.
9. Rehearse the full launch and abort procedure twice with a timestamped runbook.

Exit evidence: testnet rehearsal log, measured p50/p95/p99 latencies, provider
failover proof, and zero unresolved severity-1/2 defects.

#### Step 4 — security review and operational hardening

1. Freeze the source commit and dependency lock.
2. Obtain independent review proportionate to value at risk; a bespoke token,
   bridge, auction, or vesting system warrants a formal audit.
3. Verify multisig membership, threshold, hardware-backed signing, recovery,
   and timelock execution on the actual chain.
4. Pre-create transaction simulations for deploy, role transfer, pool creation,
   liquidity deposit, unpause, and emergency actions.
5. Cap approvals; never grant an unlimited treasury approval unless explicitly
   required, revocable, and monitored.
6. Establish monitoring for admin events, implementation changes, mint/burn,
   abnormal transfers, LP withdrawal, oracle pause/staleness, sequencer uptime,
   provider head divergence, and bridge health.
7. Publish a security contact and incident disclosure process.

Exit evidence: audit/review closure, multisig test, monitoring screenshots or
fixtures, and signed release artifact hashes.

#### Step 5 — provision infrastructure and capital

1. Use two independent production RPC providers or managed RPC plus a full
   node; never use the public RPC as the sole launch path.
2. Subscribe to the sequencer feed for the lowest-lag ordered-state view and an
   ordinary WebSocket/new-head source for cross-checking.
3. Place execution workers near provider/sequencer ingress based on measured
   p95/p99 latency, not geographic assumption.
4. Fund deployer and operational wallets with ETH. Include L1 data-fee spikes,
   retries, bridge delay, and emergency transactions in the buffer.
5. Pre-position quote asset and token inventory. A bridge promise is not launch
   inventory until finalized under the project’s credit policy.
6. Confirm the exact WETH/USDG/token addresses and decimals from primary
   registries. Reject symbol-only configuration.
7. Establish market-maker inventory limits, maximum spread, minimum depth,
   quote liveness, hedge venue, and kill-switch rules.

Exit evidence: funded wallets, provider health dashboard, inventory attestation,
and dry-run gas/fee budget.

#### Step 6 — deploy and verify before liquidity opens

1. Recompute bytecode and expected address from the frozen source.
2. Simulate the deployment at the current head.
3. Deploy with the multisig-controlled production role plan.
4. Verify source on Robinhood Chain Blockscout immediately.
5. Confirm onchain bytecode, total supply, roles, proxy slots if any, vesting,
   treasury allocations, and token metadata from two RPC providers.
6. Publish one canonical announcement containing chain ID 4663, contract
   address, explorer link, supply/control disclosure, and explicit scam warning.
7. Keep transfers/liquidity gated only if the disclosed design requires it;
   otherwise avoid an undisclosed privileged trading window.

Exit evidence: verified explorer page and independent post-deploy manifest.

#### Step 7A — launch through Uniswap Liquidity Launcher

Use the maintained `@uniswap/liquidity-launcher-sdk` rather than copying
addresses or ABIs from a blog/spec:

1. Resolve the current chain-4663 launcher, strategies, token factory, pool
   manager, router, fee recipients, and supported launch types from the SDK.
2. Read those contracts onchain and compare bytecode/owner/launcher pointers
   to the SDK release. Robinhood Chain-specific redeploy history makes this a
   hard gate.
3. Choose existing-token deposit or deterministic token creation.
4. Configure auction supply, start/end timestamps, price bounds, proceeds
   recipient, unsold-token treatment, creator-fee choice, and graduation pool.
5. Model all decimal/tick conversions and run the SDK’s quote/configuration
   math against forked/live read state.
6. Simulate the complete launcher multicall from the real caller and balances.
7. Publish the auction address, schedule, allocation, clearing mechanism,
   cancellation/abort policy, and pool-graduation behavior.
8. Start the auction at an absolute UTC time. Monitor bid inclusion,
   concentration, clearing trajectory, and provider divergence.
9. On graduation, confirm auction settlement and v4 pool creation/inventory
   before directing users to trade.

The launch should not assume a duration expressed as `N × 250 ms blocks` is a
wall-clock duration. Use timestamp deadlines and current SDK behavior.

#### Step 7B — launch an instant AMM pool

If choosing an instant pool:

1. Select Uniswap v3 or v4 and verify the current official factory/router/pool
   manager addresses for chain ID 4663.
2. Select WETH or USDG as quote asset and compute the initial square-root price
   using both tokens’ decimals. Have a second implementation independently
   reproduce the price.
3. Choose fee tier/tick spacing based on expected volatility and flow, not a
   default copied from another chain.
4. Choose a concentrated range wide enough to keep two-sided depth through the
   expected opening move; prepare rebalancing inventory and policy.
5. Create/initialize and fund atomically if the router supports the intended
   path. A publicly initialized empty pool exposes the opening price to an FCFS
   race.
6. Set user-facing slippage and deadlines defensively. Do not rely on a higher
   gas price to outrun a sniper.
7. Confirm pool address, balances, active liquidity, current tick, router quote,
   and a small two-way canary trade before enabling broad traffic.

Exit evidence: verified pool, two-way canary, expected price/depth, and no
undisclosed privileged fill.

#### Step 8 — activate routing and market making gradually

1. Start with capped order size and conservative slippage.
2. Enable one public venue, validate quotes/fills/indexing, then add RFQ,
   propAMM, aggregator, or order-book routes one at a time.
3. Verify every aggregator route settles against the canonical token address
   and approved spender/router.
4. Set circuit breakers for oracle age, sequencer downtime/grace period,
   price divergence, spread, depth, inventory, revert rate, and RPC head lag.
5. Credit deposits/bridge arrivals according to value-at-risk policy: soft for
   low-risk UX, L1-posted or L1-final for irreversible/high-value actions.
6. Keep canonical-bridge withdrawals and fast-bridge exits separate in the UI;
   their time and trust assumptions differ.

Exit evidence: controlled ramp dashboard and signed go/no-go at each cap.

#### Step 9 — operate the first 24 hours and first 30 days

Watch in real time:

- p50/p95/p99 sign→RPC, RPC→receipt, receipt→feed, feed→index, L1-post, and
  L1-final latency;
- rejection, revert, replacement, duplicate, and nonce-gap rates;
- best bid/ask, 1%/2% depth, realized slippage, LP range utilization, and
  inventory skew by venue;
- price divergence from external references and oracle age/pause state;
- top-holder/flow concentration, mint/burn/admin events, and LP withdrawals;
- sequencer/provider status and head divergence;
- bridge inventory, delayed deposits, withdrawal stage, and relayer failure;
- market-maker/RFQ quote liveness and hedge completion; and
- support/scam reports and incorrect token-address propagation.

Run a post-launch review at 1 hour, 24 hours, 7 days, and 30 days. Publish any
material control, supply, contract, venue, or bridge change with an onchain
reference.

---

## 6. Latency engineering considerations

### 6.1 Measure the whole path

Instrument these monotonic timestamps:

```text
t0 market/input observed
t1 decision complete
t2 signature complete
t3 RPC accepted request
t4 sequencer receipt observed (soft)
t5 sequencer feed event observed
t6 ordinary node/WebSocket head observed
t7 indexer/API visible
t8 batch proven posted to Ethereum
t9 Ethereum block finalized
t10 hedge confirmed on external venue
```

Report distributions and tails, not just averages:

```text
decision       = t1 - t0
signing        = t2 - t1
submission     = t3 - t2
soft inclusion = t4 - t3
feed lag       = t5 - t4
node lag       = t6 - t5
index lag      = t7 - t4
L1 post        = t8 - t4
hard finality  = t9 - t4
hedge exposure = t10 - t4
```

Synchronize clocks, record region/provider/connection reuse, and tag every
sample with transaction type, calldata size, gas estimate, receipt status, and
chain head. An explorer timestamp is not a substitute for local send/receive
telemetry.

### 6.2 FCFS consequences

- Lower and more predictable network latency matters more than bidding a higher
  priority fee.
- Persistent HTTP/2/WebSocket connections, TLS reuse, DNS stability, and
  provider-to-sequencer topology matter.
- Sending the exact same signed raw transaction through redundant providers can
  improve transport resilience; sending conflicting nonce replacements can
  create self-inflicted failure and does not guarantee queue priority.
- A single sequencer means every provider shares a terminal dependency.
  Multi-provider architecture mitigates provider outages, not sequencer outage.
- No public priority auction does not mean no MEV. Ordering value migrates to
  arrival latency, exclusive/order-flow routing, solver selection, and the
  sequencer control plane.

### 6.3 Feed and index correctness

- Treat sequencer feed data as low-latency/soft state.
- Persist the last contiguous block and hash.
- Detect gaps, duplicate messages, parent mismatch, and provider head drift.
- Backfill HTTP logs by bounded block ranges after reconnect.
- Keep a soft-state overlay in the UI and promote records to L1-posted/final as
  evidence arrives.
- Do not trigger irreversible offchain settlement solely from an indexer row or
  a soft receipt without an explicit risk policy.

### 6.4 Oracle-to-execution latency

For liquidations, perps, and RWA markets, the race begins at market-data
observation—not at L2 block production. Record data-source time, report-sign
time, local receipt time, verification time, transaction receipt, and hedge
completion. Chainlink Data Streams can supply sub-second signed reports, but
the application still owns staleness bounds, verifier calls, sequencer status,
grace periods, and market-closed behavior.

For Stock Tokens, the 24/5 feed schedule creates weekend/holiday risk on a 24/7
transfer surface. Protocols should pause price-dependent openings or use a
clearly governed alternate risk model when fresh reference markets are closed;
they must never treat Friday’s last price as indefinitely current.

---

## 7. Liquidity engineering considerations

### 7.1 “Liquidity exists” is pair-specific

Venue deployment is not asset liquidity. For every launch pair and route,
measure:

- executable bid/ask for target sizes;
- depth within 0.5%, 1%, 2%, 5%, and 10%;
- realized vs quoted slippage;
- fee and gas-inclusive execution price;
- LP active range and distance to range edge;
- RFQ maker count, quote age, fill rate, and rejection rate;
- inventory/hedge capacity by session; and
- bridgeable quote inventory and replenishment time.

For a small trade against roughly constant-product liquidity, a useful first
order planning bound is:

```text
usable quote-side reserve ≳ target trade size / tolerated price impact
```

Thus a `$10,000` trade with a `2%` impact target suggests at least `$500,000`
of usable quote-side reserve near the current price before fees and adverse
selection. Concentrated liquidity can provide the same near-price depth with
less capital but can disappear rapidly as price exits the active range. Always
validate with venue-specific quote simulation.

### 7.2 AMM vs RFQ vs propAMM/order book

| Surface | Strength | Failure/risk mode | Best early use |
|---|---|---|---|
| Public AMM | Permissionless, composable, always inspectable | LP adverse selection, thin ranges, sandwich/JIT risk, inventory imbalance | Transparent baseline and composability |
| RFQ / intents | Hides quote formation, can deliver firm size with low visible impact | Maker/solver availability, rejection, route policy, centralization | RWA and larger trades with professional inventory |
| propAMM | Onchain composability with maker-managed pricing | Operator/model dependency and opaque inventory policy | Supplemental depth where public LPs are thin |
| Order book | Visible limit liquidity and price-time rules | Fragmentation, cancellation races, maker concentration | Active markets with continuous makers |
| Launch auction | Broad price discovery before pool graduation | Auction configuration, contract, concentration, and graduation risk | Fairer initial distribution |

A robust opening generally combines an auction or deliberate distribution,
public pool, and inventory-backed quoting. Routing must compare all-in execution
after gas, bridge/hedge cost, and failure probability—not just displayed price.

### 7.3 RWA-specific liquidity controls

- Separate 24/5 reference-market hours from 24/7 token transfer/trading.
- Increase haircuts, reduce size, or pause openings when the underlier is closed
  or the feed is stale/paused.
- Model corporate-action pause and multiplier changes before accepting the
  asset as collateral.
- Use the multiplier-adjusted onchain feed for token value; do not multiply it
  again.
- Direct issuer mint/burn is available only to authorized participants, so
  ordinary LPs cannot assume instant primary-market arbitrage.
- Respect jurisdiction/eligibility constraints independently from what the
  permissionless contract technically allows.

### 7.4 Cross-chain fragmentation

If the asset is multichain:

1. designate a canonical issuance chain and global supply invariant;
2. choose lock-and-mint or burn-and-mint messaging with explicit rate limits;
3. publish canonical addresses and bridge routes per chain;
4. cap outstanding bridge exposure by route;
5. maintain destination gas and quote inventory;
6. measure bridge time and failure separately from L2 receipt time; and
7. avoid simultaneously bootstrapping many shallow pools that fragment price
   discovery.

Canonical and fast bridges have different settlement assumptions. A fast
bridge’s seconds-scale UX is supplied by third-party capital; it does not erase
the canonical challenge period.

---

## 8. Implementation sequence

### Phase A — content and data model

1. Add `robinhood_chain` comparator/bench data and source links.
2. Add the new diagrams and optional `windowKind` / confidence fields.
3. Add entities and hoverdocs.
4. Extend the JavaScript-off mirror in the same commit.
5. Update search index/count assertions and entity-door audits.

### Phase B — presentation and interaction

1. Add the sixth chip and sixth bench column.
2. Implement the three-stage finality ladder.
3. Add official compact brand asset only if full text cannot fit.
4. Add cues and cross-links.
5. Test keyboard, touch, reduced motion, CDN failure, JS-off, and deep links.

### Phase C — read-only journal

1. Add the EVM migration and fixtures.
2. Add HTTP adapter and deterministic backfill first.
3. Add WebSocket/sequencer feed as a recoverable optimization.
4. Add finality/oracle/pool observations.
5. Add paper-only Robinhood Chain simulations only after observation coverage is
   adequate.

### Phase D — empirical refresh

1. Run a dated 24-hour public-data observation.
2. Replace no capability state with `hot` unless measured evidence supports it.
3. Publish exact metric method/period/source footnotes.
4. Re-check governance, validators, contracts, providers, ArbOS/Nitro, bridge,
   oracle feeds, and Liquidity Launcher registry.

---

## 9. Acceptance criteria

### Content correctness

- Every rendered occurrence uses `Robinhood Chain` in full.
- Content says `Stock Tokens`; it never implies direct ownership of underlying
  shares or general public primary mint/redemption.
- FCFS is never called a priority auction; higher gas is never said to buy
  placement.
- Soft confirmation, L1 posting, L1 finality, and bridge withdrawal delay are
  four distinct labels.
- “No canonical public mempool documented” is not simplified to “no MEV.”
- Capability states are not presented as volume/profit measurements.
- Volatile counts and latencies are marked `~` and dated `2026-08`.

### Data integrity

- Expected totals are five comparison chains, six bench columns, eight
  techniques, 30 tools, 56 hoverdoc terms, 26 cues, and 68 entities; any
  intentional overlap or scope change is recorded in the release ledger.
- `chainOrder`, `benchCols`, every technique cell/note/tool link, and every
  entity relation resolve with no missing keys.
- Interactive data and no-JavaScript mirror match exactly.
- Entity names/kinds/taglines/primary links match the entity index.
- No dangling term/entity/tool links.
- No invented compact glyph or prohibited abbreviation reaches rendered text.

### UX and degradation

- Compare Docks work at 360/390/430/768/1200 widths.
- Six-chain technique grid causes no document-level horizontal overflow.
- Official logo asset, if used, is unmodified, at least 20 px high, and has an
  accessible full-name label.
- Three finality stages remain understandable with reduced motion, CDN blocked,
  and JavaScript off.
- New animation loops pause offscreen and when overlays close.

### QA commands

Run the existing gates after implementation:

```sh
node scripts/audit-foundation.mjs
node scripts/audit-svg-fit.mjs
node scripts/audit-contrast.mjs
node scripts/audit-degradation.mjs
node scripts/audit-command-channel.mjs
cd journal
bun test
bun build src/cli.ts --target=bun
bun run check:tokens
```

Extend the prohibited-wallet API audit to include:

```text
eth_sendRawTransaction
walletClient
privateKeyToAccount
signTransaction
sendTransaction
```

Allow the strings only in tests that assert their absence, not production
source.

---

## 10. Known unknowns and release-time checks

The following must remain explicit unknowns until measured or documented:

- sequencer geographic topology and endpoint-to-sequencer routing;
- sequencer capacity, queue limits, throttling, and outage behavior;
- exact batch publication cadence under congestion and idle periods;
- pending-transaction visibility at each RPC/provider path;
- production MEV/searcher prevalence by technique;
- pair-level depth, volume, maker concentration, and bridge inventory;
- transaction-screening false-positive/appeal behavior;
- future permissioning of BoLD validators;
- upgrade history and emergency-action use;
- Stock Token availability and legal eligibility by jurisdiction;
- exact oracle feed addresses, heartbeats, and market schedules;
- current Liquidity Launcher generation/addresses and front-end/indexer support;
  and
- whether a third-party venue is deployed, integrated in routing, or merely
  announced.

If an unknown is not resolved, phrase the page at the architecture level and
label it. Do not fill a gap with an Arbitrum One default or a partner marketing
claim.

---

## 11. Primary source ledger

### Robinhood Chain

- [About Robinhood Chain](https://docs.robinhood.com/chain/)
- [Mainnet announcement — July 1, 2026](https://robinhood.com/us/en/newsroom/robinhood-accelerates-global-expansion-robinhood-chain-mainnet-stock-tokens-agentic-trading/)
- [Connecting: chain IDs, endpoints, Ethereum blobs, providers](https://docs.robinhood.com/chain/connecting/)
- [Differences from Ethereum: block semantics, screening, FCFS ordering](https://docs.robinhood.com/chain/differences-from-ethereum/)
- [Gas and fees](https://docs.robinhood.com/chain/gas-and-fees/)
- [Transaction finality](https://docs.robinhood.com/chain/transaction-finality/)
- [Governance and BoLD validators](https://docs.robinhood.com/chain/governance/)
- [Full-node requirements and Nitro/ArbOS operation](https://docs.robinhood.com/chain/run-a-full-node/)
- [Canonical and partner bridging](https://docs.robinhood.com/chain/bridging/)
- [Protocol contracts](https://docs.robinhood.com/chain/protocol-contracts/)
- [Token contracts and canonical asset registry](https://docs.robinhood.com/chain/contracts/)
- [Account abstraction](https://docs.robinhood.com/chain/account-abstraction/)
- [Cross-chain messaging](https://docs.robinhood.com/chain/cross-chain-messaging/)
- [Oracles and price feeds](https://docs.robinhood.com/chain/oracles-and-price-feeds/)
- [Chainlink Data Streams on Robinhood Chain](https://docs.robinhood.com/chain/data-streams/)
- [Stock Tokens overview and disclosures](https://docs.robinhood.com/chain/stock-tokens/)
- [Building with Stock Tokens: venues, multiplier, integration](https://docs.robinhood.com/chain/building-with-stock-tokens/)
- [Stock Token read-only APIs](https://docs.robinhood.com/chain/stock-token-apis/)
- [Robinhood Chain Terms: sequencer operator and public-RPC limitations](https://docs.robinhood.com/chain/terms-of-service/)
- [Robinhood Chain brand guidelines](https://docs.robinhood.com/chain/brand-guidelines/)
- [Published mainnet chain configuration](https://cdn.robinhood.com/assets/generated_assets/hoodchain_docsite/chain-node-configs/robinhood-chain-info.json)
- [Network status](https://status.robinhoodchain.offchain.io/)

### Primary protocol/application repositories

- [Uniswap deployment registry for chain ID 4663](https://github.com/Uniswap/contracts/blob/main/deployments/4663.md)
- [UniswapX Robinhood Chain deployment and block-number handling](https://github.com/Uniswap/UniswapX/blob/main/deployments.md)
- [UniswapX Robinhood Chain integration playbook](https://github.com/Uniswap/UniswapX/blob/main/playbook/chains/robinhood.md)
- [Uniswap Liquidity Launcher](https://github.com/Uniswap/liquidity-launcher)
- [Liquidity Launcher SDK usage](https://github.com/Uniswap/sdks/blob/main/sdks/liquidity-launcher-sdk/README.md)
- [Liquidity Launcher SDK deployment/change history](https://github.com/Uniswap/sdks/blob/main/sdks/liquidity-launcher-sdk/CHANGELOG.md)
- [Arbitrum Nitro repository](https://github.com/OffchainLabs/nitro)
- [Arbitrum transaction lifecycle](https://docs.arbitrum.io/how-arbitrum-works/inside-arbitrum-nitro)

---

## 12. Final editorial thesis

The page’s current cross-chain thesis is that every valuable ordering surface
grows an auction, a shield, and a fast-data rail. Robinhood Chain sharpens that
thesis by supplying a counterexample to the word “auction”:

> When fees cannot buy the front, latency becomes the bid. Robinhood Chain makes
> the first receipt fast by centralizing sequence, then borrows its hardest
> guarantee from Ethereum. Its RWA opportunity lives in the gap between those
> clocks—and its operational risk does too.

That is the comparison worth adding: not “faster Ethereum,” and not “Solana in
the EVM,” but a sequencer-local market whose execution, liquidity, data, and
settlement clocks must be modeled separately.
