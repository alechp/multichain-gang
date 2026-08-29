# 01 — Shared tool taxonomy and evidence model

## Canonical categories

Categories describe jobs, not company identity. A tool may occupy several categories.

| ID | Category | Include | Do not confuse with |
|---|---|---|---|
| `CT-01` | Launch and issuance | token creation, fair launch, auction, sale, liquidity graduation, project funding rails | a DEX that only lists an already-issued asset |
| `CT-02` | Spot DEX and liquidity | AMMs, CLOBs, RFQ pools, LP management | centralized exchange spot markets |
| `CT-03` | Aggregation, routing, and intents | route optimization, solvers, meta-aggregation, chain intents | a single-venue swap router |
| `CT-04` | Derivatives and prediction | perpetuals, options, futures, prediction markets | spot margin that does not create a derivative |
| `CT-05` | Lending, borrowing, and stablecoins | money markets, collateralized credit, CDPs, stablecoin issuance | simple wallet credit or centralized loans |
| `CT-06` | Yield, vaults, and strategy | managed vaults, LP strategy, yield routing, automated farms | protocol-native staking alone |
| `CT-07` | Staking, restaking, and validation | native delegation, liquid staking, restaking, validator operations | proof-of-work mining or generic yield |
| `CT-08` | Pricing, oracles, and market data | contract-consumable or API pricing, reference data, fee markets | a chart UI without a reusable data surface |
| `CT-09` | Analytics, indexing, and exploration | explorers, decoded data, SQL analytics, indexing, dashboards | trading chart frontends |
| `CT-10` | Charting, portfolio, and discovery | screeners, candles, portfolio views, protocol discovery | raw indexers with no reader-facing view |
| `CT-11` | Wallets, accounts, and custody | self-custody, smart accounts, multisig, institutional custody | connection libraries alone |
| `CT-12` | Bridges and interoperability | canonical bridges, messaging, atomic/cross-chain swaps | centralized exchange deposit/withdrawal |
| `CT-13` | MEV, order flow, and execution | block building, private order flow, protected RPC, transaction landing | generic RPC reads |
| `CT-14` | Security, risk, and compliance | simulation, audits, token risk, monitoring, KYT/compliance | an explorer warning with no distinct risk product |
| `CT-15` | SocialFi, identity, and consumer | social graphs, names, tipping, creator markets, payments/commerce | ordinary marketing communities |
| `CT-16` | Developer infrastructure | RPC, SDK, framework, node client, test tooling, APIs | a consumer-only application |
| `CT-17` | Collectibles and marketplaces | NFT/inscription creation, discovery, sale, marketplace APIs | fungible-token DEX trading |

## Two-layer data model

Use a canonical record for identity and a placement record for chain-specific truth. Do not embed this inventory as ad hoc HTML.

```ts
type ToolStatus = "production" | "beta" | "testnet" | "announced" | "deprecated" | "unknown";
type ToolScope =
  | "native-l1"
  | "native-l2"
  | "app-layer"
  | "cross-chain"
  | "adjacent-layer"
  | "offchain-service";
type Access = "permissionless" | "gated" | "mixed" | "not-applicable";
type Surface = "ui" | "api" | "sdk" | "contracts" | "rpc" | "cli" | "node";
type EvidenceGrade = "E1" | "E2" | "E3";

interface CanonicalTool {
  id: string;                 // stable kebab-case ID
  name: string;
  summary: string;            // 160 characters maximum
  categories: string[];       // one or more CT IDs
  officialUrl: string;
  docsUrl?: string;
}

interface ChainPlacement {
  toolId: string;
  chainId: "sol" | "eth" | "bnb" | "btc" | "zec" | "robinhood_chain";
  scope: ToolScope;
  status: ToolStatus;
  access: Access;
  surfaces: Surface[];
  custody?: "self" | "smart-contract" | "custodial" | "mixed" | "not-applicable";
  evidence: {
    grade: EvidenceGrade;
    url: string;
    checked: string;          // ISO date
    note: string;
  }[];
  riskFlags?: string[];
  chainNote: string;          // why this belongs on this page
}
```

The implementation should store taxonomy and each chain inventory as separate JSON files so six research lanes can work without touching the same file.

## Evidence grades

| Grade | Requirement | Display |
|---|---|---|
| `E1` | official chain documentation or official product documentation explicitly names the chain/deployment | `DOCS` |
| `E2` | official project site, repository, contract-address page, or first-party announcement supports the relationship | `PRIMARY` |
| `E3` | official application visibly offers the chain, but no durable documentation was found | `APP-CHECK` |

Third-party articles can explain context but cannot be the sole evidence for a placement. A community-governed official ecosystem directory may be used as E2 and labeled `COMMUNITY`.

## State rules

- `production`: an official source exposes or documents a current mainnet product.
- `beta`: available to users but explicitly labeled beta/preview.
- `testnet`: only a test network or sandbox is documented.
- `announced`: first-party intent exists without a usable surface.
- `deprecated`: first-party retirement or a trustworthy migration notice exists.
- `unknown`: evidence proves identity but not current availability; hide by default.

Never convert `announced` into `production` from marketing language alone. Never infer mainnet from an SDK package existing.

## Scope rules

Scope is the main protection against misleading Bitcoin, Ethereum, and Zcash pages.

- `native-l1`: the primary contracts, node, or transaction path operate on the named base chain.
- `native-l2`: the tool is on a named L2 that is part of the chain family; show the L2 name.
- `app-layer`: overlay such as Lightning, Ordinals, or an application protocol using the base chain.
- `cross-chain`: explicitly spans the named chain and at least one other network.
- `adjacent-layer`: derives security, collateral, identity, or assets from the chain but executes elsewhere.
- `offchain-service`: analyzes, stores, routes, or secures chain activity without being a protocol deployment.

Default filters show `production`, `beta`, and `native-l1`/`app-layer`; other scopes remain one click away and are counted separately.

## Coverage levels

Coverage is editorial, not a score:

| Level | Meaning |
|---|---|
| `dense` | several current native tools and distinct approaches |
| `established` | at least two current native tools or one protocol plus robust supporting tools |
| `emerging` | usable but young, narrow, or thinly evidenced |
| `adjacent` | useful tools exist, but execution primarily occurs off-chain or on another layer |
| `native gap` | no qualifying native tool in the verified snapshot |

The wrapper may show counts but must never roll these labels into an overall chain ranking.

## Update protocol

1. Re-open the first-party evidence URL.
2. Confirm the exact chain and product surface.
3. Record `checked` and any deployment change.
4. If evidence disappears, set `unknown`; do not silently delete until a second review.
5. If deprecated, preserve the record only when migration/history helps the reader.
6. Re-run link, schema, duplicate, accessible-name, and no-JS audits.

Every table displays `Verified 2026-08-29` at page level and exposes the row-level evidence date in the expanded details.
