# 07 — Zcash tooling landscape

- Route: `#/tools/zcash`
- Related chain hub: `#/c/zcash`
- Evidence snapshot: 2026-08-29

![Abstract Zcash tooling topology with shielded pools and selective outputs](../../assets/chain-tools/zcash-landscape.png)

## Landscape thesis

Zcash’s production landscape is smaller and more specialized than the other five. Its center is shielded wallet UX, node and light-client infrastructure, viewing/signing tools, explorers, payments, and privacy-preserving consumer applications. Cross-chain swaps now materially improve access, but many routes accept only transparent Zcash addresses. Native DEX, lending, yield, staking, and fungible-asset launch categories remain gaps in the verified snapshot.

The generated visual shows observable inputs entering a mathematically structured shielded region and only minimal outputs emerging. It deliberately includes fewer peripheral modules. It is not a representation of real transaction flows.

## Category coverage

| Category | Coverage | Editorial note |
|---|---|---|
| Launch and issuance | announced / project funding | ZSAs remain draft with deployment TBD; grants fund projects but do not issue assets |
| Spot DEX and liquidity | adjacent | MAYAChain supports transparent ZEC swaps/liquidity; no native shielded DEX |
| Aggregation, routing, and intents | adjacent | Zashi/NEAR Intents adds routes; transparent-address boundaries matter |
| Derivatives and prediction | native gap | no qualifying production native tool |
| Lending, borrowing, and stablecoins | native gap | no qualifying production native market |
| Yield, vaults, and strategy | adjacent | external liquidity pools exist; no native Zcash vault system |
| Staking, restaking, and validation | native gap | Zcash is proof of work; mining is not staking |
| Pricing, oracles, and market data | service | market-price and network-data APIs exist; no native oracle contracts |
| Analytics, indexing, and exploration | established | several community and commercial explorers, with inherent shielded-data limits |
| Charting, portfolio, and discovery | emerging service | market charts exist; shielded positions cannot be inferred without viewing capability |
| Wallets, accounts, and custody | dense | the ecosystem’s strongest application category; shielded-pool support varies |
| Bridges and interoperability | emerging / adjacent | NEAR Intents and MAYAChain routes exist with explicit transparent-only constraints |
| MEV, order flow, and execution | native gap | fee/transaction construction exists; no comparable public builder market |
| Security, risk, and compliance | established specialized | FROST, privacy guidance, conformance tests, and viewing-key workflows |
| SocialFi, identity, and consumer | established niche | private publishing, tipping, education, and payments |
| Developer infrastructure | established | two node implementations, Rust libraries, mobile SDKs, lightwalletd, and RPC |
| Collectibles and marketplaces | native gap | ZSAs are not deployed; no qualifying native marketplace |

## Normalized inventory

| Tool | Categories | Scope | State | Surfaces | Placement evidence / integration note |
|---|---|---|---|---|---|
| [Zcash Shielded Assets / ZIP 227](https://zips.z.cash/zip-0227) | CT-01, CT-16 | Native proposal | announced | specification | E1 — status is `Draft`, reference implementation and deployment are `TBD`; never show as usable issuance |
| [Zcash Community Grants](https://zcashcommunitygrants.org/) | CT-01, CT-15 | Ecosystem funding service | production | UI | E2 — funds project launches and public goods; explicitly not a token launchpad |
| [MAYA Protocol](https://docs.mayaprotocol.com/introduction/readme/getting-started) | CT-02, CT-06, CT-12 | Adjacent cross-chain network | production | UI-dependent, API, SDK | E1 — native ZEC pool is supported, but transparent addresses only and MAYAChain supplies execution/security |
| [Zashi / Zodl](https://electriccoin.co/) | CT-03, CT-11, CT-12 | Native wallet / cross-chain service | production | UI, SDK-derived | E1 — shielded ZEC wallet with NEAR Intents swaps and CrossPay; preserve both names as aliases during rebrand |
| [NEAR Intents](https://docs.near-intents.org/resources/chain-support) | CT-03, CT-12 | Adjacent cross-chain network | production | API, SDK | E1 — ZEC asset/routes are supported, but Zcash integration is transparent-address-only |
| [CoinGecko](https://docs.coingecko.com/) | CT-08, CT-10 | Service | production | UI, API | E1 — ZEC market-price and chart data; not shielded chain analytics |
| [Coin Metrics](https://docs.coinmetrics.io/) | CT-08, CT-09, CT-10 | Service | production | UI, API | E1 — Zcash network/market metrics where listed; definitions shown per metric |
| [Nighthawk Zcash Explorer](https://mainnet.zcashexplorer.app/) | CT-09 | Community service | production | UI | E3 — current official app check; privacy policy and node backend shown in details |
| [zec.rocks Explorer](https://explorer.zec.rocks/) | CT-09, CT-16 | Community service | production | UI, API | E2 — community explorer and lightwallet infrastructure; exact backend shown |
| [CipherScan](https://cipherscan.app/) | CT-09, CT-10 | Community service | production | UI | E3 — Zcash explorer app; public data cannot reveal shielded sender, receiver, or value |
| [3xpl Zcash](https://3xpl.com/zcash) | CT-09, CT-10 | Service | production | UI, API | E2 — explorer/API and exports; tracking/privacy behavior labeled |
| [Zashi SDKs](https://zcash.readthedocs.io/en/latest/rtd_pages/mobile_sdk.html) | CT-11, CT-16 | Native developer | production | SDK | E1 — official mobile SDK resources for shielded wallet integration |
| [Zingo!](https://zingolabs.org/) | CT-11, CT-16 | Native app | production | UI, SDK | E2 — open-source shielded wallet and ecosystem tooling |
| [Zkool / YWallet](https://github.com/hhanh00/zwallet) | CT-11 | Native app | production | UI | E2 — current wallet repository/releases; preserve YWallet alias and show compatibility caveats |
| [Edge Wallet](https://support.edge.app/support/solutions/articles/8000096295-zcash-zec-) | CT-11 | App / service | production | UI | E1 — ZEC wallet support; shielded-pool features shown explicitly |
| [Unstoppable Wallet](https://unstoppable.money/) | CT-11 | App / service | production | UI | E2 — multi-coin wallet with Zcash support; shielded support verified from official feature surface |
| [Zcash wallet ecosystem guide](https://www.zcashcommunity.com/wallets/) | CT-11, CT-10 | Community service | production | UI | E2 — community-maintained wallet discovery with a warning that not every wallet supports private transactions |
| [Zebra](https://zfnd.org/zebra/download/) | CT-16, CT-09 | Native | production | node, RPC, CLI | E1 — independent consensus-compatible Rust node implementation |
| [zcashd / zcash-cli](https://zcash.readthedocs.io/en/latest/) | CT-16, CT-09, CT-11 | Native | production | node, RPC, CLI | E1 — reference node/RPC and legacy wallet tooling; deprecation/migration status tracked per release |
| [librustzcash](https://github.com/zcash/librustzcash) | CT-16 | Native developer | production | SDK | E2 — core Rust libraries for Zcash transaction and wallet functionality |
| [lightwalletd](https://github.com/zcash/lightwalletd) | CT-16 | Native service / self-hostable | production | node, API | E2 — compact-block service for light clients; server trust/availability caveats required |
| [Zcash RPC documentation](https://zcash.github.io/rpc/) | CT-16, CT-09 | Native developer | production | RPC | E1 — generated command reference for node integration |
| [FROST for Zcash](https://frost.zfnd.org/zcash/) | CT-14, CT-16, CT-11 | Native cryptographic tooling | production | SDK, CLI | E1 — threshold signatures with privacy-preserving re-randomization; workflow is not a consumer wallet by itself |
| [zcash-devtool](https://frost.zfnd.org/zcash/devtool-demo.html) | CT-14, CT-16 | Native developer | production | CLI | E1 — transaction construction/signing tutorial and PCZT tooling |
| [Ziggurat](https://zcash.readthedocs.io/en/master/rtd_pages/dev_tools.html) | CT-14, CT-16 | Native developer | production | CLI, test suite | E1 — network conformance, performance, and resilience testing for node implementations |
| [Zcash privacy best practices](https://zcash.readthedocs.io/en/master/rtd_pages/privacy_recommendations_best_practices.html) | CT-14 | Documentation | production | guide | E1 — operational privacy guidance; shown as a resource, not a security product |
| [ZecPages](https://zecpages.com/) | CT-15 | Native / app | production | UI | E2 — anonymous message board using Zcash payments/identity conventions |
| [Free2Z](https://free2z.com/) | CT-15, CT-01 | Native / service | production | UI | E2 — private publishing, tipping, and project-funding surface |
| [ZecHub](https://zechub.wiki/) | CT-15, CT-10 | Community service | production | UI | E2 — community education and ecosystem discovery |
| [ZGo](https://zgo.cash/) | CT-15, CT-16 | Native / service | production | UI, API | E2 — non-custodial shielded ZEC point-of-sale, invoicing, WooCommerce, and API |
| [Pay with Zcash](https://paywithz.cash/) | CT-15, CT-10 | Community service | production | UI | E2 — merchant discovery; listing is not merchant verification |

## Native gaps and category traps

- ZIP 227 is a draft proposal with deployment TBD. ZSAs must not create a production launch, DEX, stablecoin, or collectible count.
- Zcash is proof of work. CT-07 must say `no native staking`; mining belongs in network/developer context.
- MAYA Protocol and NEAR Intents currently document transparent-address-only Zcash paths. Those transfers do not preserve Zcash shielded sender/receiver/value privacy end to end.
- An explorer’s inability to display shielded details is correct protocol behavior, not incomplete indexing.
- Wallet compatibility varies by pool, Unified Address handling, seed/account derivation, sync strategy, and fee support. A simple “supports ZEC” badge is inadequate.
- Full Viewing Keys enable scoped visibility; they are not spending authority. Tool drawers must use precise key language.
- Market-price APIs know the exchange price of ZEC, not the value or ownership of shielded notes.

## Primary research anchors

- [Zcash documentation](https://zcash.readthedocs.io/en/latest/)
- [Zcash developer tools](https://zcash.readthedocs.io/en/master/rtd_pages/dev_tools.html)
- [Zcash Shielded Assets ZIP status](https://zips.z.cash/zip-0227)
- [Zcash Foundation engineering work](https://zfnd.org/our-work/)
- [Zcash community ecosystem](https://www.zcashcommunity.com/)
- [Electric Coin Company / Zashi cross-chain updates](https://electriccoin.co/)
- [NEAR Intents supported chains](https://docs.near-intents.org/resources/chain-support)
- [MAYA Protocol Zcash integration](https://docs.mayaprotocol.com/mayachain-dev-docs/protocol-development/chain-clients/zcash)
- first-party product documentation linked in each row

## Page-specific acceptance criteria

- CT-01 shows `ZSA proposal: draft; deployment TBD` and a separate ecosystem-funding placement.
- CT-04, CT-05, CT-07, CT-13, and CT-17 visibly render native gaps.
- A `Shielded support` column appears for wallet, swap, bridge, payment, and explorer filters.
- `Transparent only` is text, not a tooltip-only warning, for MAYA and NEAR Intents.
- Search aliases connect Zashi, Zodl, YWallet, and Zkool without pretending the products are identical.
- The generated visual’s caption says “conceptual privacy topology” and avoids claiming that pictured inputs/outputs are observable on-chain.
