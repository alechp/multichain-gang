# 01 — Robinhood Chain research and source ledger

> **Research cutoff:** 2026-08-31
>
> **Source rule:** first-party Robinhood documentation for Robinhood-specific
> facts; primary protocol documentation/repositories for inherited Arbitrum,
> Ethereum, Chainlink, Uniswap, and other integration mechanics

## 0. Research coverage

The research pass reviewed every substantive page in the current Robinhood
Chain documentation navigation:

- About Robinhood Chain;
- Connecting and wallet configuration;
- Bridging;
- Stock Tokens overview, integration guide, and read-only APIs;
- Differences from Ethereum, gas/fees, finality, token contracts, and protocol
  contracts;
- contract deployment, account abstraction, cross-chain messaging, oracles,
  Data Streams, full-node operation, and governance;
- brand guidelines, notices/upgrades, and Terms of Service; and
- the July 1, 2026 mainnet announcement and published chain configuration.

The pass also reviewed primary Arbitrum/Nitro and Uniswap material where the
Robinhood docs defer to inherited behavior or list an integration without
enough implementation detail.

This ledger is deliberately broader than the facts that fit on the main page.
The main page is an authored teaching instrument; `#/sources` and entity routes
carry the deeper evidence.

## 1. Confirmed network profile

| Property | Current documented value | Treatment |
|---|---|---|
| Public mainnet | launched 2026-07-01 | Stable historical date; cite the [official announcement](https://robinhood.com/us/en/newsroom/robinhood-accelerates-global-expansion-robinhood-chain-mainnet-stock-tokens-agentic-trading/). |
| Mainnet chain ID | `4663` (`0x1237`) | Confirmed by [Connecting](https://docs.robinhood.com/chain/connecting/) and the [published chain configuration](https://cdn.robinhood.com/assets/generated_assets/hoodchain_docsite/chain-node-configs/robinhood-chain-info.json). |
| Testnet chain ID | `46630` | Volatile operational datum; refresh before release. |
| Parent/settlement | Ethereum mainnet, chain ID `1` | Confirmed by chain configuration and [Connecting](https://docs.robinhood.com/chain/connecting/). |
| Execution stack | Arbitrum Nitro / ArbOS, EVM-compatible | Explain Robinhood-specific configuration separately from generic Nitro behavior. |
| Data availability | Ethereum blobs; no DAC in published chain config | `DataAvailabilityCommittee: false` is configuration evidence, not a timeless promise. |
| Native gas asset | ETH | Do not imply a Robinhood-branded gas token. |
| Mainnet explorer | Blockscout | Operational link; refresh. |
| Public RPC | `https://rpc.mainnet.chain.robinhood.com` | Rate-limited; not suitable for production/high-throughput/latency-sensitive use. |
| Sequencer feed | `wss://feed.mainnet.chain.robinhood.com` | Low-lag soft state; not L1 finality evidence. |
| Sequencer endpoint | `https://sequencer.mainnet.chain.robinhood.com` | Operational endpoint; no uptime guarantee. |
| Ordering | first come, first served by sequencer arrival | Higher fees do not move later arrivals ahead. |
| Sequencer operator | Robinhood | Confirmed by the [Terms](https://docs.robinhood.com/chain/terms-of-service/). |
| Dispute system | BoLD fraud proofs | Current validator participation is permissioned. |
| Validators | two, operated by Offchain Labs and Alchemy | Volatile count as of 2026-08-31; cite [Governance](https://docs.robinhood.com/chain/governance/). |
| Governance | 8-seat Security Council | Routine `6/8` + 7-day timelock; emergency `7/8` without timelock. Robinhood holds two seats. |

## 2. The correct architecture model

Robinhood Chain is not one consensus set. The page must separate these planes:

| Plane | Actor/mechanism | What it establishes | What it does not establish |
|---|---|---|---|
| User submission | wallets, bundlers, public/managed RPCs, direct sequencer path | a signed transaction or UserOperation reaches an ingress | inclusion, order, or Ethereum settlement |
| Ordering | one Robinhood-operated sequencer, FCFS by arrival | order of accepted transactions and a soft receipt | Ethereum-backed irreversibility |
| Execution/read verification | ArbOS/Nitro execution; independently runnable full nodes | deterministic L2 state transition and independently replayable reads | permissionless right to challenge an invalid assertion |
| Dispute validation | BoLD with a currently allowlisted validator set | ability of approved validators to challenge invalid state assertions | an open validator set or retail staking product |
| Data availability/settlement | compressed batches in Ethereum blobs and Ethereum consensus | published transaction data, fixed ordering after L1 post, later L1 finality | sequencer availability or rapid L2→L1 withdrawal |
| Protocol governance | eight-seat Security Council | upgrades and emergency actions under threshold/timelock rules | day-to-day transaction ordering |
| Compliance filtering | sequencer-level screening | exclusion of transactions associated with sanctioned addresses | privacy, user eligibility for third-party apps, or contract-level compliance |

The page may call the user/contract surface permissionless because the official
docs say anyone can interact and deploy. It must immediately qualify that the
sequencer, dispute validator, and upgrade planes have different participation
models.

## 3. Transaction lifecycle and four clocks

### 3.1 Lifecycle

1. An EOA signs an EIP-155 transaction for chain `4663`, or an ERC-4337 smart
   account sends a UserOperation through a bundler.
2. A public or managed RPC forwards the request toward the sequencer.
3. The sequencer applies screening and orders accepted transactions by arrival.
   Robinhood Chain does not provide a priority gas auction that lets a later
   transaction jump an earlier one.
4. Nitro executes the ordered EVM lane. The receipt is a sequencer-backed soft
   confirmation.
5. The sequencer compresses transactions into a batch and posts the batch to
   the Ethereum Inbox using blob data.
6. After posting, ordering can only change if Ethereum itself reorganizes.
7. The Ethereum block containing the batch later finalizes.

The [Nitro whitepaper](https://docs.arbitrum.io/nitro-whitepaper.pdf) describes
the Delayed Inbox as the censorship-resistance/liveness fallback for messages
that bypass the sequencer. The main page may teach that inherited mechanism,
but Robinhood Chain-specific force-inclusion parameters and operational support
must be verified before rendering a duration or instructing users to rely on
it.

### 3.2 Clocks

| Clock | Official typical timing | Guarantee | UI label |
|---|---:|---|---|
| Sequencer soft confirmation | sub-second | sequencer accepted, ordered, executed, and returned a receipt | `SOFT · <1 s typ.` |
| Posted to Ethereum | minutes | order is fixed unless Ethereum reorganizes | `POSTED · minutes typ.` |
| Ethereum finality | about 13 minutes after posting | transaction inherits Ethereum finality | `FINAL · ~13 min after post` |
| Canonical L2→L1 withdrawal | about 7 days, then L1 claim | challenge period and final claim for canonical exit | `WITHDRAWAL · ~7 d + claim` |

The first three stages come from [Transaction Finality](https://docs.robinhood.com/chain/transaction-finality/).
The fourth comes from [Bridging](https://docs.robinhood.com/chain/bridging/) and
must never be placed inside a “transaction finality” sequence.

## 4. Fees, ordering, and MEV implications

The documented fee model is:

```text
total transaction fee ≈ L2 execution component + L1 data component
```

Wallet estimation and `eth_estimateGas` include both components. Calldata size
therefore affects total cost even when L2 execution is inexpensive. Batching
can reduce repeated overhead but can also enlarge atomic revert blast radius.
See [Gas & Fees](https://docs.robinhood.com/chain/gas-and-fees/).

The fee model and ordering model are separate:

- gas pays for execution and Ethereum data;
- arrival fixes queue position;
- a higher gas price does not buy earlier order; and
- lack of a priority gas auction does not eliminate order value.

Supported inference, labeled as inference on the page:

- low and low-variance transport latency can matter under FCFS;
- a provider, sequencer, or solver can have visibility unavailable in a public
  mempool model;
- public AMM intent, leaked submissions, oracle updates, and downstream state
  changes can still support arbitrage, backruns, liquidations, launch races,
  and—in the presence of visible intent—sandwiches; and
- RFQ and intent routes can reduce public preview while introducing maker,
  solver, route, rejection, and service dependencies.

The official docs do not document a canonical public mempool, public bundle
auction, or official MEV-protection RPC. Render each as `NOT DOCUMENTED`, not
as proof that it cannot exist.

## 5. EVM and Arbitrum-specific behavior

The following differences are load-bearing for developer content and come from
[Differences from Ethereum](https://docs.robinhood.com/chain/differences-from-ethereum/):

- `block.number` is an estimate of the parent Ethereum block number, not the
  Robinhood Chain L2 height;
- `ArbSys.arbBlockNumber()` at precompile `0x64` exposes L2 block number;
- `block.prevrandao` / `block.difficulty` is constant and is not randomness;
- `blockhash(n)` is reliable only for recent blocks and not a randomness
  source;
- `block.coinbase` is a network fee account, not a miner/validator;
- L1→L2 calls apply Arbitrum address aliasing to the L2 `msg.sender`;
- the maximum runtime code size is 96 KB and init-code size is 192 KB; and
- Arbitrum precompiles expose L2-specific functions.

Consequences for the page:

- never derive a fixed wall-clock auction duration from an L2 block count;
- distinguish Ethereum block estimate from L2 block height in every example;
- never present block variables as safe randomness;
- show address aliasing in the cross-chain messaging entity; and
- treat larger contract limits as compatibility/audit tradeoffs, not a blanket
  advantage.

## 6. Nodes and infrastructure

The [full-node guide](https://docs.robinhood.com/chain/run-a-full-node/) currently
documents:

| Component | Requirement/current pin | Volatility |
|---|---|---|
| CPU | modern 8+ core with strong single-core performance | requirement may change |
| RAM | 64 GB; 128 GB recommended | requirement may change |
| Storage | local NVMe; roughly 2× current chain size + 20%; several TB | highly volatile |
| L1 dependencies | Ethereum execution RPC and beacon endpoint for blobs | architectural |
| Container image | `offchainlabs/nitro-node:v3.11.2-3599aca` | refresh on every release |
| ArbOS | 61 | refresh on every release |
| Mainnet initialization | chain info + custom genesis | operational |
| Feed input | optional mainnet/testnet sequencer WebSocket | operational |
| Validator eligibility | allowlist + 1 WETH bond | policy/parameter; refresh |

The page must say that managed provider diversity improves RPC availability,
history, and transport resilience but all write paths still converge on the
single sequencer. Public RPC and snapshot data carry no completeness or uptime
guarantee under the current [Terms](https://docs.robinhood.com/chain/terms-of-service/).

## 7. Account abstraction and developer surface

Robinhood Chain documents first-class ERC-4337 support and EIP-7702 support.
The current [Account Abstraction](https://docs.robinhood.com/chain/account-abstraction/)
page lists Alchemy, ZeroDev, Privy, and Dynamic and publishes EntryPoint
versions `0.6`, `0.7`, and `0.8` plus related contracts.

The main page should teach capabilities, not vendor setup:

- batched calls;
- gas sponsorship through paymasters;
- programmable policies and spending controls;
- session keys and automation; and
- service dependencies across bundler, paymaster, wallet, and RPC.

EntryPoint addresses and SDK versions belong in a dated entity signal table,
not timeless chapter prose.

The [deployment guide](https://docs.robinhood.com/chain/deploy-smart-contracts/)
confirms standard Foundry and Hardhat flows. The Scope page must remain
read-only: examples may explain deployment concepts but must not solicit keys,
connect a wallet, or expose a deploy button.

## 8. Bridges and messaging

### 8.1 Documented bridge routes

| Route | Documented type/timing | Required caveat |
|---|---|---|
| Arbitrum canonical bridge | Ethereum↔Robinhood Chain; ~10-minute deposit, ~7-day withdrawal | retryable-ticket handling, challenge period, final L1 claim, L1 gas |
| LayerZero/Stargate | messaging/OFT; minutes, source-finality dependent | route/token standard and endpoint assumptions |
| Chainlink CCIP/Transporter | messaging/token transfer; minutes | lane-specific support and risk model |
| Relay | intents bridge; seconds | relayer/solver liquidity and destination execution |
| Across | intents bridge; seconds | relayer inventory, route support, fill/fallback behavior |
| LI.FI/0x | aggregation; seconds to minutes | reveal the chosen underlying route, not only aggregator brand |

The source is [Bridging](https://docs.robinhood.com/chain/bridging/). Speeds are
documented typical categories, not SLAs.

### 8.2 Native messaging

[Cross-Chain Messaging](https://docs.robinhood.com/chain/cross-chain-messaging/)
documents:

- L1→L2 retryable tickets through the Delayed Inbox, typically minutes;
- L2→L1 messages through `ArbSys`, subject to the challenge period;
- use of the Arbitrum SDK for the custom chain;
- a `confirmPeriodBlocks` configuration of `45818` in its example; and
- L1→L2 address aliasing.

Contract addresses and `confirmPeriodBlocks` are volatile operational data.
Pull them into source-linked entity details and test them at release; do not
copy them into static explanatory sentences.

## 9. Assets, Stock Tokens, and oracle correctness

### 9.1 Canonical assets

The [Token Contracts](https://docs.robinhood.com/chain/contracts/) page lists
WETH and USDG and loads Stock Token addresses from an onchain asset registry.
Every asset must be identified by chain ID and contract address. A matching
name or symbol is not proof of canonical identity.

### 9.2 What a Stock Token is

According to the [Stock Tokens overview](https://docs.robinhood.com/chain/stock-tokens/):

- it is a tokenised debt security issued by Robinhood Assets (Jersey) Limited;
- it provides economic exposure but no legal or beneficial rights in or
  against the issuer of the underlying security;
- it is an 18-decimal ERC-20;
- primary-market mint/burn is restricted to authorized participants after KYB;
  and
- ordinary developers integrate circulating tokens on secondary venues.

The page must use the exact public term `Stock Tokens`. It must not call them
“tokenized stocks” or “tokenized equities.” Jurisdiction and eligibility
restrictions belong next to product examples, not in a distant generic footer.

### 9.3 Multiplier model

Stock Tokens implement ERC-8056-style scaled UI amounts:

```text
underlying-share equivalent = raw token amount × uiMultiplier / 1e18
```

- raw `balanceOf()` and `totalSupply()` do not rebase;
- `uiMultiplier()` expresses shares per token;
- `newUIMultiplier()` and `effectiveAt()` expose pending changes;
- `balanceOfUI()` and `totalSupplyUI()` expose adjusted views; and
- `UIMultiplierUpdated` and `TransferWithScaledUI` support event-driven
  integrations.

The details come from [Building with Stock Tokens](https://docs.robinhood.com/chain/building-with-stock-tokens/).

### 9.4 Price surfaces are not interchangeable

| Surface | Unit/behavior | Correct use |
|---|---|---|
| Onchain Chainlink feed | per-token price, already multiplier-adjusted | value a raw token balance; do not multiply again |
| REST `/prices` | raw underlying-equity bid/ask, not multiplier-adjusted | offchain quote/reference; multiply by current multiplier for token-equivalent value |
| `uiMultiplier()` | shares-per-token ratio scaled by `1e18` | convert between token and share-equivalent display units |

The read-only API base is `https://api.robinhood.com/rhj/`; current docs state a
60 requests/second limit, cached responses, a 15-second price cache, and a
one-hour corporate-action cache. See [Stock Token APIs](https://docs.robinhood.com/chain/stock-token-apis/).

### 9.5 Oracle/session guardrails

[Oracles & Price Feeds](https://docs.robinhood.com/chain/oracles-and-price-feeds/)
requires the page to teach:

- validate answer, decimals, update time, and heartbeat;
- check the L2 sequencer uptime feed and enforce a post-recovery grace period;
- Stock Token feeds update 24/5, following market hours;
- the feed incorporates the current multiplier;
- `oraclePaused()` is advisory during corporate actions and does not replace a
  staleness check; and
- a paused or stale price is unavailable, not zero.

[Data Streams](https://docs.robinhood.com/chain/data-streams/) adds sub-second,
pull-based, signed reports with an onchain Verifier Proxy. The current verifier
address is an entity signal with a checked date, never an unqualified constant.

## 10. Liquidity and documented ecosystem

The official documentation/announcement currently describes these classes:

- public AMM: Uniswap;
- RFQ/intents: 0x RFQ, 1inch Fusion, LI.FI, and UniswapX-related surfaces;
- propAMM/aggregator: current docs name Rialto, while the launch announcement
  names Pleiades as the initial proprietary AMM;
- order book/perps: Lighter and Arcus;
- lending: Morpho;
- stablecoin: Paxos USDG;
- oracles: Chainlink;
- analytics/data: Entropy/arbdata, Allium, CoinGecko, Zerion, Blockscout;
- custody: Fireblocks and BitGo;
- infrastructure/account abstraction: Alchemy and additional RPC providers;
  and
- compliance/risk: TRM Labs.

The Rialto/Pleiades name difference is a first-party-source conflict/change,
not permission to assume they are equivalent. At implementation time, show the
current docs entry and record the historical announcement in the source route.

The [Uniswap deployment registry](https://github.com/Uniswap/contracts/blob/main/deployments/4663.md)
and [UniswapX repository](https://github.com/Uniswap/UniswapX) are primary
evidence for deployed contract families. The [Liquidity Launcher](https://github.com/Uniswap/liquidity-launcher)
and SDK have changed chain-4663 deployments repeatedly; implementation must
resolve current addresses from the maintained SDK and verify onchain rather
than copying an address into this specification.

No ecosystem row may imply pair-level depth, trading volume, uptime, audit
coverage, safety, or endorsement. The official directory itself disclaims
endorsement and warranty.

## 11. Governance and operational change

The [Governance](https://docs.robinhood.com/chain/governance/) page currently
specifies:

- eight Security Council seats;
- one each for BitGo, Chainlink Labs, Fireblocks, Offchain Labs, Paxos, and
  Talos, and two for Robinhood;
- routine actions at `6/8` plus a seven-day onchain timelock;
- emergency actions at `7/8` with no timelock; and
- two allowlisted BoLD validators, Offchain Labs and Alchemy.

The [Notices & Upgrades](https://docs.robinhood.com/chain/notices-and-upgrades/)
page says ArbOS upgrades activate onchain at a scheduled time and un-upgraded
nodes stop cleanly at activation. Its notice table was empty at the research
cutoff. An empty table means no listed notice, not “the chain never upgrades.”

## 12. Brand and legal constraints that affect product design

Current [Brand Guidelines](https://docs.robinhood.com/chain/brand-guidelines/)
and [Terms](https://docs.robinhood.com/chain/terms-of-service/) require:

- use `Robinhood Chain` in full;
- do not use `Hood Chain` or another shorthand;
- keep the third-party project's identity more prominent;
- avoid any suggestion of Robinhood endorsement, sponsorship, certification,
  or affiliation;
- use official marks only, without modifications, effects, combinations, or
  synthetic/AI-generated versions;
- use `Stock Tokens`, not prohibited substitute terminology;
- do not blend Robinhood Chain statistics with brokerage/Robinhood Crypto
  metrics;
- give method, period, and source for any chain statistic; and
- do not reference Robinhood's public-company ticker in Robinhood Chain
  content.

These are release-blocking constraints. They are not optional style advice.

## 13. Confidence and unknown ledger

| Topic | Current state | Page treatment |
|---|---|---|
| Sequencer geography/topology | not documented | do not draw regions or provider-to-sequencer routes as fact |
| Queue limits, throttling, throughput, outage behavior | not documented | no capacity/SLA claims |
| Canonical public pending-transaction surface | not documented | say exactly that; do not claim private mempool |
| Batch publication distribution under load/idle | only typical “minutes” documented | show range category, not fixed cadence |
| Force-inclusion delay/operations specific to Robinhood Chain | inherited mechanism; exact parameters need verification | entity detail only after source/onchain check |
| Permissionless BoLD validation roadmap | not documented | show current allowlisted state only |
| MEV/searcher prevalence | unmeasured | architecture/capability labels, never volume/profit claims |
| Pair depth, maker count, venue share | unmeasured in official docs | do not rank or call liquidity deep |
| Screening false positives/appeal path | not documented | do not invent support or bypass behavior |
| Stock Token jurisdiction availability | dynamic legal/product state | link current disclosures; no static country list on main page |
| Current Stock Token/price-feed registry | dynamic | load/read only in source entity or resolve at build time |
| Current Nitro/ArbOS/launcher deployments | dynamic | checked-date signal, release refresh |
| Rialto vs Pleiades propAMM naming | conflicting/historical first-party references | current docs in main page; conflict disclosed in source route |

## 14. First-party source ledger

### 14.1 Robinhood Chain sources

| ID | Source | Claims/fields authorized | Refresh |
|---|---|---|---|
| `rh-about` | [About Robinhood Chain](https://docs.robinhood.com/chain/) | permissionless/EVM positioning, FCFS, ecosystem directory | 30 days; release day |
| `rh-mainnet` | [Mainnet announcement](https://robinhood.com/us/en/newsroom/robinhood-accelerates-global-expansion-robinhood-chain-mainnet-stock-tokens-agentic-trading/) | launch date, launch-day integrations and disclosures | historical; check corrections |
| `rh-connect` | [Connecting](https://docs.robinhood.com/chain/connecting/) | chain IDs, endpoints, providers, blobs, ETH gas | 7 days; release day |
| `rh-wallet` | [Add network to wallet](https://docs.robinhood.com/chain/add-network-to-wallet/) | Robinhood Wallet support and manual EVM configuration | 30 days |
| `rh-bridge` | [Bridging](https://docs.robinhood.com/chain/bridging/) | route list, canonical deposit/withdrawal stages and timings | 7 days; release day |
| `rh-stock` | [Stock Tokens overview](https://docs.robinhood.com/chain/stock-tokens/) | issuer, legal/economic meaning, ERC-20 basics, AP restriction | 7 days; legal review |
| `rh-stock-build` | [Building with Stock Tokens](https://docs.robinhood.com/chain/building-with-stock-tokens/) | venue classes, ERC-8056, multiplier, adjusted views/events | 7 days |
| `rh-stock-api` | [Stock Token APIs](https://docs.robinhood.com/chain/stock-token-apis/) | endpoint schemas, units, cache/rate limits, corporate actions | 7 days |
| `rh-eth-diff` | [Differences from Ethereum](https://docs.robinhood.com/chain/differences-from-ethereum/) | block semantics, randomness, aliasing, sizes, screening, FCFS | 30 days; ArbOS upgrade |
| `rh-fees` | [Gas & Fees](https://docs.robinhood.com/chain/gas-and-fees/) | two fee components and calldata optimization | 30 days |
| `rh-finality` | [Transaction Finality](https://docs.robinhood.com/chain/transaction-finality/) | three stages, typical timings, reorg boundary | 7 days; release day |
| `rh-token-contracts` | [Token Contracts](https://docs.robinhood.com/chain/contracts/) | canonical WETH/USDG and live Stock Token registry | release day |
| `rh-protocol-contracts` | [Protocol Contracts](https://docs.robinhood.com/chain/protocol-contracts/) | L1/L2 bridge contracts and precompiles | release day |
| `rh-deploy` | [Deploy a Contract](https://docs.robinhood.com/chain/deploy-smart-contracts/) | Foundry/Hardhat compatibility and verification surface | 30 days |
| `rh-aa` | [Account Abstraction](https://docs.robinhood.com/chain/account-abstraction/) | ERC-4337/EIP-7702, providers, EntryPoint deployments | 7 days |
| `rh-message` | [Cross-Chain Messaging](https://docs.robinhood.com/chain/cross-chain-messaging/) | retryables, ArbSys L2→L1, aliasing, SDK config | 7 days |
| `rh-oracle` | [Oracles & Price Feeds](https://docs.robinhood.com/chain/oracles-and-price-feeds/) | feed units, 24/5, multiplier, staleness, uptime, pauses | 7 days |
| `rh-streams` | [Data Streams](https://docs.robinhood.com/chain/data-streams/) | pull-based signed reports and current verifier | 7 days |
| `rh-node` | [Run a full node](https://docs.robinhood.com/chain/run-a-full-node/) | hardware, L1 dependencies, versions, snapshots, feed input | 7 days; every upgrade |
| `rh-governance` | [Governance](https://docs.robinhood.com/chain/governance/) | Council, thresholds, validators | 7 days; release day |
| `rh-brand` | [Brand Guidelines](https://docs.robinhood.com/chain/brand-guidelines/) | name, logo, color, terminology, metrics | release day |
| `rh-upgrades` | [Notices & Upgrades](https://docs.robinhood.com/chain/notices-and-upgrades/) | scheduled changes and required operator action | daily during build/release |
| `rh-terms` | [Terms of Service](https://docs.robinhood.com/chain/terms-of-service/) | operator, RPC/sequence disclaimers, mark license, independence | release day; legal review |
| `rh-config` | [Published mainnet chain configuration](https://cdn.robinhood.com/assets/generated_assets/hoodchain_docsite/chain-node-configs/robinhood-chain-info.json) | chain/parent IDs, no DAC, sizes, rollup contract roots | release day |
| `rh-status` | [Network status](https://status.robinhoodchain.offchain.io/) | current incidents only | never use historic uptime without exact export/method |

### 14.2 Primary inherited/integration sources

| ID | Source | Use |
|---|---|---|
| `arb-nitro-paper` | [Nitro whitepaper](https://docs.arbitrum.io/nitro-whitepaper.pdf) | Inbox, Delayed Inbox, retryable, execution architecture |
| `arb-nitro` | [Offchain Labs Nitro repository](https://github.com/OffchainLabs/nitro) | client/runtime implementation and releases |
| `arb-lifecycle` | [Arbitrum transaction lifecycle](https://docs.arbitrum.io/how-arbitrum-works/inside-arbitrum-nitro) | inherited lifecycle details after Robinhood-specific checks |
| `uni-4663` | [Uniswap chain-4663 deployments](https://github.com/Uniswap/contracts/blob/main/deployments/4663.md) | deployed Uniswap contract families |
| `unix-4663` | [UniswapX Robinhood Chain playbook](https://github.com/Uniswap/UniswapX/blob/main/playbook/chains/robinhood.md) | block-number semantics, deployment and operational caveats |
| `uni-launcher` | [Liquidity Launcher repository](https://github.com/Uniswap/liquidity-launcher) | launch mechanism, code, audits, deployment model |
| `uni-launcher-sdk` | [Liquidity Launcher SDK](https://github.com/Uniswap/sdks/tree/main/sdks/liquidity-launcher-sdk) | current addresses; resolve at implementation/release time |
| `uni-cca-paper` | [CCA whitepaper](https://docs.uniswap.org/assets/files/whitepaper_cca-fc8b989c3a5b11f6fcd199f6c6837a77.pdf) | continuous clearing auction mechanics |
| `chainlink-feeds` | [Chainlink data feeds](https://docs.chain.link/data-feeds) | feed interface, heartbeat/deviation and uptime patterns |
| `chainlink-streams` | [Chainlink Data Streams](https://docs.chain.link/data-streams) | signed report verification and delivery mechanics |
| `erc8056` | [ERC-8056](https://eips.ethereum.org/EIPS/eip-8056) | scaled UI amount interface |
| `erc4337` | [ERC-4337 documentation](https://docs.erc4337.io/) | smart-account roles and trust boundaries |

Partner marketing or third-party aggregators may help discovery, but they may
not support load-bearing technical claims when a primary source is available.

## 15. Release-time research procedure

1. Re-open every source marked `release day` and record HTTP status, page title,
   retrieval time, and a digest of the relevant fact block.
2. Compare chain ID, parent ID, rollup contract, public endpoints, protocol
   contracts, current ArbOS/Nitro versions, Council/validator list, and bridge
   route list against the previous snapshot.
3. Resolve current Stock Token registry, WETH/USDG records, price-feed
   directory, sequencer uptime feed, and Data Streams verifier from first-party
   sources.
4. Resolve current Uniswap/UniswapX/Liquidity Launcher contracts from primary
   registries and verify code/chain on the explorer. Never promote an old SDK
   address because it still has bytecode.
5. Reconcile the official ecosystem table with primary protocol support. Label
   `announced`, `deployed`, `UI-supported`, `API-supported`, and `routable`
   separately.
6. Recheck Terms and Brand Guidelines after all copy and art are final.
7. If any load-bearing claim is conflicted or missing, remove it from the hero
   and main chapter copy; preserve the conflict in `#/sources`.

