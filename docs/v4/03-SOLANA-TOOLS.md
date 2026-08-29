# 03 — Solana tooling landscape

- Route: `#/tools/solana`
- Related chain hub: `#/c/solana`
- Evidence snapshot: 2026-08-29

![Abstract Solana tooling topology with parallel execution lanes](../../assets/chain-tools/solana-landscape.png)

## Landscape thesis

Solana’s tooling is densest where low-latency shared state matters: token launch and liquidity graduation, spot routing, transaction landing, real-time market data, and integrated wallets. The important distinction is no longer whether a category exists, but which execution surface, pool model, validator path, and data freshness guarantee an integration uses.

Generated visual direction: parallel lanes enter a dense routing and liquidity fabric. It is illustrative context, not a protocol map; the table below is authoritative.

## Category coverage

| Category | Coverage | Editorial note |
|---|---|---|
| Launch and issuance | dense | several current bonding-curve, auction, and launch-liquidity systems |
| Spot DEX and liquidity | dense | CPMM, CLMM, DLMM, CLOB, and orderbook-style primitives coexist |
| Aggregation, routing, and intents | dense | Jupiter is the main reference surface; competing smart routers exist |
| Derivatives and prediction | established | perpetuals are active; options/prediction coverage is narrower |
| Lending, borrowing, and stablecoins | established | multiple production money markets and integrated vaults |
| Yield, vaults, and strategy | dense | liquidity managers, rate markets, and vault routers overlap |
| Staking, restaking, and validation | dense | native delegation plus several liquid-staking and validator markets |
| Pricing, oracles, and market data | dense | pull/push oracle and API market-data choices |
| Analytics, indexing, and exploration | dense | explorer, decoded RPC, SQL, and institutional data layers |
| Charting, portfolio, and discovery | dense | retail screeners and portfolio surfaces are highly developed |
| Wallets, accounts, and custody | dense | mobile, browser, embedded, and multisig surfaces |
| Bridges and interoperability | established | several message/asset routes; route and token provenance still matter |
| MEV, order flow, and execution | dense | block engine, private paths, senders, and staked connections |
| Security, risk, and compliance | established | token-risk and institutional monitoring layers |
| SocialFi, identity, and consumer | established | names, messaging, commerce, and collectible distribution |
| Developer infrastructure | dense | strong RPC, framework, indexing, and asset SDK coverage |
| Collectibles and marketplaces | dense | mature NFT standards, marketplaces, and creator tooling |

## Normalized inventory

The same product may have several category IDs; it is still one canonical record. `Native` means the relevant program or transaction path runs on Solana. `Service` means the product analyzes or submits Solana activity off-chain.

| Tool | Categories | Scope | State | Surfaces | Placement evidence / integration note |
|---|---|---|---|---|---|
| [Metaplex Genesis](https://developers.metaplex.com/smart-contracts/genesis) | CT-01, CT-16 | Native | production | CLI, SDK, contracts, API | E1 — launch pools, fixed sales, auctions, and Raydium graduation are documented for Solana |
| [Raydium LaunchLab](https://docs.raydium.io/user-flows/launchlab-overview) | CT-01, CT-02 | Native | production | UI, SDK, contracts | E1 — permissionless curve launch with automatic CPMM migration |
| [Meteora](https://docs.meteora.ag/) | CT-01, CT-02, CT-06 | Native | production | UI, SDK, contracts | E1 — DAMM, DLMM, DBC, launch pools, vaults, and anti-bot launch mechanisms |
| [pump.fun](https://pump.fun/) | CT-01, CT-02 | Native | production | UI, contracts | E3 — official app check; bonding-curve launch surface, exact migration settings must be inspected per launch |
| [Raydium](https://docs.raydium.io/) | CT-02, CT-06 | Native | production | UI, SDK, contracts, API | E1 — CPMM, CLMM, routing, farms, and pools |
| [Orca](https://docs.orca.so/) | CT-02, CT-16 | Native | production | UI, SDK, contracts | E1 — Whirlpool concentrated-liquidity protocol and SDK |
| [Phoenix](https://docs.ellipsis-labs.xyz/) | CT-02, CT-13, CT-16 | Native | production | SDK, contracts | E1 — fully on-chain order book program and client tooling |
| [OpenBook](https://github.com/openbook-dex/openbook-v2) | CT-02, CT-16 | Native | production | SDK, contracts | E2 — open-source Solana CLOB program; integrators must verify active market depth |
| [Jupiter](https://dev.jup.ag/) | CT-03, CT-08, CT-16 | Native | production | UI, API, SDK, contracts | E1 — swap routing, token/price APIs, and developer integration surface |
| [Titan](https://titan-exchange.gitbook.io/titan) | CT-03 | Native | production | UI, API | E1 — Solana swap/meta-aggregation; include only while current docs confirm production |
| [Drift](https://docs.drift.trade/) | CT-04, CT-05, CT-06 | Native | production | UI, SDK, contracts, API | E1 — perpetuals, spot, borrow/lend, and vault surfaces |
| [Flash.Trade](https://docs.flash.trade/) | CT-04 | Native | production | UI, SDK, contracts | E1 — perpetual trading and liquidity-pool architecture |
| [Adrena](https://docs.adrena.trade/about-adrena/what-is-adrena) | CT-04 | Native | production | UI, contracts | E1 — Solana perpetuals surface; leverage and oracle risk flags required |
| [Kamino](https://docs.kamino.finance/) | CT-05, CT-06 | Native | production | UI, API, SDK, contracts | E1 — lending markets, liquidity vaults, and automated strategies |
| [marginfi](https://docs.marginfi.com/) | CT-05 | Native | production | UI, SDK, contracts | E1 — overcollateralized lending and borrowing |
| [Save](https://docs.save.finance/) | CT-05 | Native | production | UI, SDK, contracts | E1 — current successor surface to Solend; preserve historical alias for search |
| [Loopscale](https://docs.loopscale.com/) | CT-05 | Native | production | UI, API, SDK, contracts | E1 — orderbook-based lending; position and maturity mechanics need tool details |
| [Exponent](https://docs.exponent.finance/) | CT-06 | Native | production | UI, contracts | E1 — fixed-yield and yield-market surface |
| [Lulo](https://docs.lulo.fi/) | CT-06, CT-03 | Native | production | UI, API | E1 — yield routing across integrated Solana protocols |
| [Solana native staking](https://solana.com/staking) | CT-07 | Native | production | UI-dependent, CLI, contracts | E1 — protocol delegation baseline; never describe as a third-party product |
| [Marinade](https://docs.marinade.finance/) | CT-07, CT-06 | Native | production | UI, SDK, contracts | E1 — native and liquid staking surfaces |
| [Jito](https://www.jito.network/docs/) | CT-07, CT-13 | Native | production | UI, API, SDK, contracts | E1 — liquid staking plus block-engine/execution infrastructure |
| [Sanctum](https://learn.sanctum.so/) | CT-07, CT-03 | Native | production | UI, API, SDK, contracts | E1 — liquid-staking-token liquidity, routing, and validator LST tooling |
| [BlazeStake](https://stake-docs.solblaze.org/) | CT-07 | Native | production | UI, SDK, contracts | E1 — stake pool and liquid-staking token |
| [Pyth Network](https://docs.pyth.network/price-feeds) | CT-08, CT-16 | Native / cross-chain | production | API, SDK, contracts | E1 — Solana-origin market-data network with pull oracle integrations |
| [Switchboard](https://docs.switchboard.xyz/) | CT-08, CT-16 | Native / cross-chain | production | API, SDK, contracts | E1 — oracle feeds, randomness, and custom data surfaces |
| [Chainlink](https://docs.chain.link/data-feeds) | CT-08, CT-12 | Cross-chain | production | contracts, API | E1 — include only feeds/services whose directory explicitly lists Solana |
| [Solana Explorer](https://explorer.solana.com/) | CT-09 | Native service | production | UI | E1 — official account, transaction, program, and cluster explorer |
| [Solscan](https://docs.solscan.io/) | CT-09, CT-08 | Service | production | UI, API | E1 — explorer and API; included in the Foundation source catalog |
| [Helius Orb](https://www.helius.dev/orb) | CT-09, CT-10 | Service | production | UI | E2 — human-readable explorer built on Helius data |
| [Dune](https://docs.dune.com/data-catalog/solana/overview) | CT-09, CT-08 | Service | production | UI, API, SQL | E1 — raw/decoded Solana data, curated DEX/price datasets |
| [Allium](https://docs.allium.so/) | CT-09, CT-08 | Service | production | API, SQL | E1 — indexed institutional Solana datasets; also used on the official Solana data page |
| [Birdeye](https://docs.birdeye.so/) | CT-08, CT-10 | Service | production | UI, API | E1 — token market data, charts, trades, and discovery |
| [DEX Screener](https://docs.dexscreener.com/) | CT-10, CT-08 | Service | production | UI, API | E1 — pair discovery/charting; official Solana source catalog placement |
| [GeckoTerminal](https://apiguide.geckoterminal.com/) | CT-10, CT-08 | Service | production | UI, API | E1 — on-chain pool data and charts |
| [DeFiLlama](https://defillama.com/docs/api) | CT-10, CT-08 | Service | production | UI, API | E1 — protocol discovery and aggregated metrics; metric methodology is not chain truth |
| [Step Finance](https://docs.step.finance/) | CT-10 | Native / service | production | UI, API | E1 — Solana portfolio and transaction view |
| [Phantom](https://docs.phantom.com/) | CT-11, CT-16 | App / service | production | UI, SDK | E1 — wallet and embedded/in-app integration surfaces |
| [Solflare](https://docs.solflare.com/) | CT-11, CT-10 | App / service | production | UI, SDK | E1 — Solana wallet plus token/pricing surfaces |
| [Backpack](https://docs.backpack.app/) | CT-11 | App / service | production | UI | E1 — Solana wallet; exchange functionality is not categorized as on-chain DEX |
| [Squads](https://docs.squads.so/) | CT-11, CT-16 | Native / app | production | UI, SDK, contracts | E1 — multisig and smart-account infrastructure |
| [Wormhole](https://wormhole.com/docs/products/connect/overview/) | CT-12 | Cross-chain | production | UI, SDK, contracts, API | E1 — messaging and token-transfer products with Solana support |
| [deBridge](https://docs.debridge.com/) | CT-12, CT-03 | Cross-chain | production | UI, API, SDK, contracts | E1 — DLN intents and cross-chain transfer routing |
| [Mayan](https://docs.mayan.finance/) | CT-12, CT-03 | Cross-chain | production | UI, SDK, contracts | E1 — auction-based cross-chain swap surface using Solana liquidity |
| [Allbridge](https://docs.allbridge.io/) | CT-12 | Cross-chain | production | UI, SDK, contracts | E1 — cross-chain bridge with Solana routes |
| [Jito Block Engine](https://docs.jito.wtf/lowlatencytxnsend/) | CT-13 | Native / service | production | API, SDK | E1 — bundles and low-latency transaction sending; separate from JitoSOL |
| [Helius Sender](https://www.helius.dev/docs/sending-transactions/sender) | CT-13, CT-16 | Service | production | API, SDK | E1 — transaction landing and protected send path |
| [bloXroute](https://docs.bloxroute.com/solana) | CT-13 | Service | production | API, SDK | E1 — Solana transaction and data streams |
| [RugCheck](https://rugcheck.xyz/) | CT-14, CT-10 | Service | production | UI, API | E2 — automated token-risk surface referenced by official token verification docs |
| [Blowfish](https://docs.blowfish.xyz/) | CT-14, CT-16 | Service | production | API, SDK | E1 — transaction simulation and wallet security integrations |
| [Range](https://www.range.org/) | CT-14 | Service | production | UI, API | E2 — compliance and risk partner in Solana Developer Platform |
| [Dialect](https://docs.dialect.to/) | CT-15, CT-16 | Native / service | production | SDK, API, contracts | E1 — messaging, notifications, and Solana Actions/Blinks tooling |
| [Solana Name Service](https://docs.sns.id/) | CT-15 | Native | production | UI, SDK, contracts | E1 — names and identity resolution |
| [Helius](https://www.helius.dev/docs) | CT-16, CT-09, CT-13 | Service | production | RPC, API, SDK | E1 — RPC, enhanced transactions, DAS, webhooks, and sender infrastructure |
| [Triton One](https://docs.triton.one/) | CT-16, CT-13 | Service | production | RPC, API | E1 — RPC and transaction infrastructure; official SDP provider |
| [QuickNode](https://www.quicknode.com/docs/solana) | CT-16 | Service | production | RPC, API | E1 — Solana RPC and add-on APIs |
| [Alchemy](https://www.alchemy.com/docs/reference/solana-api-quickstart) | CT-16 | Service | production | RPC, API, SDK | E1 — Solana RPC/API surface |
| [Anchor](https://www.anchor-lang.com/docs) | CT-16 | Native developer | production | framework, CLI | E1 — Solana program framework and test workflow |
| [Metaplex](https://developers.metaplex.com/) | CT-16, CT-17, CT-01 | Native developer | production | SDK, CLI, contracts, API | E1 — asset standards, compressed assets, Candy Machine, and Genesis |
| [Magic Eden](https://docs.magiceden.io/) | CT-17, CT-10 | App / service | production | UI, API | E1 — Solana marketplace APIs plus multi-chain surfaces |
| [Tensor](https://docs.tensor.trade/) | CT-17 | Native / app | production | UI, API, contracts | E1 — Solana NFT marketplace and trading APIs |

## Native gaps and category traps

- “Fast RPC” is not automatically “better landing.” RPC reads, transaction senders, staked connections, and block-engine paths must remain distinct records/surfaces.
- A launchpad’s graduation destination is part of the launch model. Do not categorize the destination pool as proof that every launch has durable liquidity.
- A token verification badge confirms identity, not safety or quality. The official [token verification guide](https://solana.com/docs/tokens/how-to-verify-a-token) explicitly separates verification from endorsement.
- Market-data providers often compute materially different volume, trader, or DEX-count definitions. The official [Solana Data](https://solana.com/data?tab=defi) page already presents provider medians; the tools page must not silently merge them into one “truth.”
- Cross-chain wrapped or canonical assets need provenance in the tool drawer. A bridge logo alone is insufficient.

## Primary research anchors

- [Solana Foundation official MCP source catalog](https://github.com/solana-foundation/solana-mcp-official/blob/main/ingestion/sources.yaml)
- [Solana Data — DeFi and provider methodology](https://solana.com/data?tab=defi)
- [Solana network explorers and operational resources](https://solana.com/network)
- [Solana token verification](https://solana.com/docs/tokens/how-to-verify-a-token)
- [Solana Developer Platform partner map](https://solana.com/news/solana-developer-platform)
- first-party product documentation linked in each row

## Page-specific acceptance criteria

- Default view groups launch/liquidity, execution, and data tools without implying a ranking.
- `RPC`, `transaction sender`, `block engine`, and `oracle` filters yield different sets.
- Search alias `Solend` resolves to Save with a migration/historical note.
- A tool such as Meteora expands once and shows all category placements.
- The visual crops from the left at desktop and remains decorative at mobile; its alt text does not claim exact topology.
- All native and cross-chain bridge records expose token provenance and trust-model fields in expanded details.
