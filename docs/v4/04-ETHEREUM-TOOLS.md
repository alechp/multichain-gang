# 04 — Ethereum tooling landscape

- Route: `#/tools/ethereum`
- Related chain hub: `#/c/ethereum`
- Evidence snapshot: 2026-08-29

![Abstract Ethereum tooling topology with layered settlement planes](../../assets/chain-tools/ethereum-landscape.png)

## Landscape thesis

Ethereum has the broadest mature tool surface in the set, but “Ethereum ecosystem” can conceal a major scope error: many high-volume applications execute on an L2 or app chain rather than Ethereum mainnet. This page defaults to Ethereum L1 placements. Explicitly named L2 and off-chain services are discoverable through scope filters and never counted as L1-native coverage.

The generated visual shows a heavy settlement plane, composable protocol layers, and routes above them. It is an editorial model, not a live dependency graph.

## Category coverage

| Category | Coverage | Editorial note |
|---|---|---|
| Launch and issuance | established | auctions, community funding, and liquidity-launch mechanisms; some are not yet production |
| Spot DEX and liquidity | dense | multiple AMM designs plus solver-driven exchange |
| Aggregation, routing, and intents | dense | API, RFQ, solver, and meta-routing choices |
| Derivatives and prediction | adjacent | much current execution lives on L2s or app chains; name the execution chain |
| Lending, borrowing, and stablecoins | dense | deep general and permissionless market infrastructure |
| Yield, vaults, and strategy | dense | mature vault, fixed-yield, and LP-management layer |
| Staking, restaking, and validation | dense | native staking, liquid staking, and restaking are distinct risk planes |
| Pricing, oracles, and market data | dense | many contract-consumable oracle designs |
| Analytics, indexing, and exploration | dense | explorer, SQL, subgraph, simulation, and labeled-data layers |
| Charting, portfolio, and discovery | dense | mature cross-protocol portfolio and pool discovery |
| Wallets, accounts, and custody | dense | EOAs, smart accounts, multisig, embedded, and institutional custody |
| Bridges and interoperability | dense | canonical L2 bridges plus generalized messaging and intent layers |
| MEV, order flow, and execution | dense | builders, relays, private RPC, solver auctions, and protected submission |
| Security, risk, and compliance | dense | libraries, monitoring, simulation, and transaction-risk services |
| SocialFi, identity, and consumer | established | Ethereum identity is native; several social networks execute elsewhere |
| Developer infrastructure | dense | the reference EVM tool ecosystem |
| Collectibles and marketplaces | established | mature standards and markets, with newer activity spread across L2s |

## Normalized inventory

| Tool | Categories | Scope | State | Surfaces | Placement evidence / integration note |
|---|---|---|---|---|---|
| [Uniswap Liquidity Launchpad](https://docs.uniswap.org/assets/files/whitepaper_cca-fc8b989c3a5b11f6fcd199f6c6837a77.pdf) | CT-01, CT-02 | Native design | announced | contracts/design | E1 — public mechanism specification; do not label production without deployed-address evidence |
| [Fjord Foundry](https://help.fjordfoundry.com/) | CT-01 | Native / cross-chain | production | UI, contracts | E1 — token sale and liquidity bootstrapping surface; deployment chain shown per sale |
| [Juicebox](https://docs.juicebox.money/) | CT-01, CT-15 | Native | production | UI, SDK, contracts | E1 — programmable project funding and treasury issuance on Ethereum deployments |
| [Uniswap](https://developers.uniswap.org/docs/protocols/overview) | CT-02, CT-03, CT-16 | Native / cross-chain | production | UI, SDK, contracts, API | E1 — Ethereum deployments and developer surfaces; versions remain distinct |
| [Curve](https://docs.curve.finance/) | CT-02, CT-06 | Native / cross-chain | production | UI, API, contracts | E1 — stableswap, pools, gauges, and lending-related product surfaces |
| [Balancer](https://docs.balancer.fi/) | CT-02, CT-06, CT-16 | Native / cross-chain | production | UI, SDK, contracts, API | E1 — weighted/composable pools and vault architecture |
| [CoW Protocol](https://docs.cow.fi/cow-protocol) | CT-02, CT-03, CT-13 | Native / offchain service | production | UI, API, SDK, contracts | E1 — batch auctions, solvers, intents, and MEV-aware execution |
| [1inch](https://portal.1inch.dev/documentation/overview) | CT-03 | Cross-chain service | production | UI, API, SDK, contracts | E1 — aggregation and intent APIs; chain support must come from current portal configuration |
| [0x / Matcha](https://0x.org/docs/) | CT-03, CT-16 | Cross-chain service | production | UI, API, SDK, contracts | E1 — swap and RFQ aggregation on Ethereum |
| [Odos](https://docs.odos.xyz/) | CT-03 | Cross-chain service | production | UI, API, SDK, contracts | E1 — smart-order routing and multi-asset paths |
| [Polymarket](https://docs.polymarket.com/) | CT-04 | Adjacent: Polygon | production | UI, API, contracts | E1 — Ethereum-compatible ecosystem tool, but execution is not Ethereum L1; excluded from native count |
| [GMX](https://docs.gmx.io/) | CT-04 | Adjacent: Arbitrum/Avalanche | production | UI, SDK, contracts | E1 — derivatives venue shown only in adjacent scope |
| [Aave](https://aave.com/docs) | CT-05 | Native / cross-chain | production | UI, API, SDK, contracts | E1 — Ethereum lending deployment and current developer documentation |
| [Morpho](https://docs.morpho.org/get-started/) | CT-05, CT-06, CT-16 | Native / cross-chain | production | UI, API, SDK, contracts | E1 — permissionless markets, vaults, and Ethereum Chain ID 1 API coverage |
| [Compound](https://docs.compound.finance/) | CT-05 | Native / cross-chain | production | UI, API, SDK, contracts | E1 — Ethereum lending markets and contract documentation |
| [Spark](https://docs.spark.fi/) | CT-05, CT-06 | Native / cross-chain | production | UI, contracts | E1 — lending and savings surfaces; chain/deployment shown per product |
| [Sky Protocol](https://developers.sky.money/) | CT-05, CT-06 | Native / cross-chain | production | UI, SDK, contracts | E1 — USDS/Sky Savings and protocol developer surfaces; keep Maker alias searchable |
| [Liquity](https://docs.liquity.org/) | CT-05 | Native | production | UI, SDK, contracts | E1 — ETH-backed stablecoin/borrowing protocol; version and frontend are material |
| [Yearn](https://docs.yearn.fi/) | CT-06 | Native / cross-chain | production | UI, API, SDK, contracts | E1 — strategy vaults and developer integration |
| [Pendle](https://docs.pendle.finance/) | CT-06, CT-02 | Native / cross-chain | production | UI, SDK, contracts, API | E1 — tokenized yield and AMM markets |
| [Convex](https://docs.convexfinance.com/) | CT-06 | Native | production | UI, contracts | E1 — Curve/Prisma-aligned yield and voting layer |
| [Ethereum native staking](https://ethereum.org/staking/) | CT-07 | Native | production | node, CLI, protocol | E1 — solo staking baseline; not a vendor record |
| [Lido](https://docs.lido.fi/) | CT-07 | Native / cross-chain | production | UI, SDK, contracts | E1 — liquid staking protocol and stETH integrations |
| [Rocket Pool](https://docs.rocketpool.net/) | CT-07 | Native | production | UI, node, CLI, contracts | E1 — decentralized node operator and liquid-staking surfaces |
| [StakeWise](https://docs.stakewise.io/) | CT-07 | Native | production | UI, SDK, contracts | E1 — staking vaults and operator tooling |
| [EigenLayer](https://docs.eigenlayer.xyz/) | CT-07 | Native / adjacent services | production | UI, SDK, contracts, CLI | E1 — restaking and AVS tooling; risk is not equivalent to protocol staking |
| [Symbiotic](https://docs.symbiotic.fi/) | CT-07 | Native / cross-chain | production | SDK, contracts | E1 — shared-security/restaking infrastructure |
| [Chainlink](https://docs.chain.link/) | CT-08, CT-12, CT-16 | Native / cross-chain | production | API, contracts | E1 — feeds, streams, CCIP, automation, and developer products |
| [RedStone](https://docs.redstone.finance/) | CT-08 | Native / cross-chain | production | API, SDK, contracts | E1 — modular oracle delivery models and Ethereum support |
| [Chronicle](https://docs.chroniclelabs.org/) | CT-08 | Native / cross-chain | production | API, contracts | E1 — oracle feeds and validator architecture |
| [API3](https://docs.api3.org/) | CT-08 | Native / cross-chain | production | API, SDK, contracts | E1 — first-party oracle and OEV surfaces |
| [Pyth Network](https://docs.pyth.network/price-feeds) | CT-08 | Cross-chain | production | API, SDK, contracts | E1 — pull price feeds available to Ethereum integrations |
| [Etherscan](https://docs.etherscan.io/) | CT-09, CT-16 | Service | production | UI, API | E1 — Ethereum explorer and API |
| [Dune](https://docs.dune.com/data-catalog/evm/ethereum/overview) | CT-09, CT-08 | Service | production | UI, API, SQL | E1 — raw, decoded, and curated Ethereum datasets |
| [The Graph](https://thegraph.com/docs/) | CT-09, CT-16 | Native / service | production | API, SDK | E1 — subgraphs and decentralized data-query infrastructure |
| [Allium](https://docs.allium.so/) | CT-09, CT-08 | Service | production | API, SQL | E1 — institutional indexed blockchain data |
| [Tenderly](https://docs.tenderly.co/) | CT-09, CT-14, CT-16 | Service | production | UI, API, SDK | E1 — simulation, debugging, monitoring, and virtual testnets |
| [Nansen](https://docs.nansen.ai/) | CT-09, CT-10 | Service | production | UI, API | E1 — labeled-wallet analytics and portfolio surfaces |
| [DeFiLlama](https://defillama.com/docs/api) | CT-10, CT-08 | Service | production | UI, API | E1 — protocol and market discovery; methodology labels required |
| [DEX Screener](https://docs.dexscreener.com/) | CT-10, CT-08 | Service | production | UI, API | E1 — pair charts and API |
| [GeckoTerminal](https://apiguide.geckoterminal.com/) | CT-10, CT-08 | Service | production | UI, API | E1 — on-chain pool charts and API |
| [Zerion](https://developers.zerion.io/) | CT-10, CT-11 | Service / app | production | UI, API, wallet | E1 — portfolio data and wallet surfaces |
| [Zapper](https://protocol.zapper.xyz/) | CT-10, CT-09 | Service | production | UI, API | E1 — portfolio and protocol-position decoding |
| [MetaMask](https://docs.metamask.io/) | CT-11, CT-16 | App / service | production | UI, SDK, API | E1 — wallet, SDK, embedded-wallet, and developer surfaces |
| [Rabby](https://rabby.io/) | CT-11, CT-14 | App | production | UI | E2 — EVM wallet with simulation/security UI; official app evidence |
| [Safe](https://docs.safe.global/) | CT-11, CT-16 | Native / cross-chain | production | UI, API, SDK, contracts | E1 — smart accounts, multisig, modules, and transaction service |
| [Rainbow](https://rainbow.me/) | CT-11 | App | production | UI | E2 — Ethereum wallet; browser/mobile features checked on official app |
| [Across](https://docs.across.to/) | CT-12, CT-03 | Cross-chain | production | UI, API, SDK, contracts | E1 — intent-based bridge and interoperability APIs |
| [LI.FI](https://docs.li.fi/) | CT-12, CT-03 | Cross-chain service | production | UI, API, SDK, contracts | E1 — bridge/swap aggregation; route trust model exposed per route |
| [LayerZero](https://docs.layerzero.network/) | CT-12 | Cross-chain | production | SDK, contracts | E1 — omnichain messaging and token tooling |
| [Wormhole](https://wormhole.com/docs/) | CT-12 | Cross-chain | production | UI, API, SDK, contracts | E1 — messaging and token-transfer products |
| [Flashbots](https://docs.flashbots.net/) | CT-13, CT-16 | Native / service | production | RPC, API, SDK | E1 — MEV-Boost, Protect, builder/relay, and research tooling |
| [MEV Blocker](https://docs.mevblocker.io/) | CT-13 | Service | production | RPC, API | E1 — protected transaction submission and order-flow auction |
| [OpenZeppelin](https://docs.openzeppelin.com/) | CT-14, CT-16 | Developer / service | production | SDK, contracts, UI | E1 — contract libraries, upgrades, monitor, and defender tooling |
| [Forta](https://docs.forta.network/) | CT-14, CT-16 | Native / service | production | API, SDK, node | E1 — decentralized monitoring/detection network |
| [Chainalysis](https://www.chainalysis.com/chainalysis-kyt/) | CT-14 | Service | production | UI, API | E2 — compliance monitoring; not a protocol risk rating |
| [ENS](https://docs.ens.domains/) | CT-15 | Native | production | UI, SDK, contracts | E1 — naming, resolution, and identity primitives |
| [Farcaster](https://docs.farcaster.xyz/) | CT-15 | Adjacent: OP Stack hubs | production | UI, API, SDK | E1 — Ethereum accounts/assets are relevant, but social data is not Ethereum L1 execution |
| [Status](https://status.app/help/) | CT-15, CT-11 | App | production | UI, wallet | E1 — messaging and Ethereum wallet surface |
| [POAP](https://documentation.poap.tech/) | CT-15, CT-17 | Native / adjacent | production | UI, API, SDK | E1 — attendance/identity collectibles; mint chain is shown per drop |
| [Infura](https://docs.metamask.io/services/) | CT-16 | Service | production | RPC, API | E1 — Ethereum RPC and developer APIs |
| [Alchemy](https://www.alchemy.com/docs/chains/ethereum/ethereum-api-quickstart) | CT-16 | Service | production | RPC, API, SDK | E1 — Ethereum node and enhanced APIs |
| [Foundry](https://getfoundry.sh/) | CT-16 | Developer | production | CLI, framework | E1 — Ethereum smart-contract build/test/deploy toolchain |
| [Hardhat](https://hardhat.org/docs) | CT-16 | Developer | production | CLI, framework | E1 — EVM development and testing environment |
| [viem](https://viem.sh/docs/introduction) | CT-16 | Developer | production | SDK | E1 — typed TypeScript interface to Ethereum |
| [OpenSea](https://docs.opensea.io/) | CT-17 | App / service | production | UI, API | E1 — marketplace and NFT APIs; chain shown per collection/order |
| [Blur](https://docs.blur.foundation/) | CT-17 | Native / app | production | UI, contracts | E1 — Ethereum NFT marketplace and lending-adjacent product; verify version surfaces |

## Native gaps and category traps

- “Runs in the Ethereum ecosystem” does not mean Ethereum L1. Every L2/app-chain row must display its execution chain beside the name.
- Restaking is not ordinary staking. It adds service, slashing, operator, and contract dependencies; the UI must keep CT-07 subtypes visible.
- Solver/RFQ products combine on-chain settlement with off-chain competition. Scope should show both rather than force a false native/off-chain binary.
- An oracle brand may expose feeds, streams, automation, VRF, and bridge products. The drawer must identify the exact product used.
- Versioned protocols are not interchangeable. Uniswap v2/v3/v4, Compound versions, and vault versions need version/deployment fields at integration time.

## Primary research anchors

- [Ethereum.org DeFi](https://ethereum.org/defi/)
- [Ethereum.org staking](https://ethereum.org/staking/)
- [Ethereum.org pooled staking](https://ethereum.org/staking/pools/)
- [Ethereum.org restaking](https://ethereum.org/restaking/)
- [Ethereum.org oracle guide](https://ethereum.org/developers/docs/oracles/)
- [Ethereum.org decentralized social networks](https://ethereum.org/social-networks/)
- first-party product documentation linked in each row

## Page-specific acceptance criteria

- Default results are Ethereum L1; an obvious `Include L2/adjacent` toggle expands the map.
- Any adjacent record displays its execution chain in both row and accessible name.
- Uniswap Liquidity Launchpad is `announced` until deployed-address evidence is supplied.
- `staking` and `restaking` subfilters do not return identical results.
- Multi-product brands open to exact product tabs rather than one vague definition.
- The generated visual is captioned as a conceptual settlement stack and never as live dependency data.
