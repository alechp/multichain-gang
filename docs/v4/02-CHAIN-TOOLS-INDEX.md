# 02 — Chain Tools wrapper index

## Page contract

- Display name: **Chain Tools**
- Route: `#/tools`
- Document title: `Chain Tools — SOLANA//SCOPE`
- Purpose: compare tooling shape, not chain performance.

## Hero

- Eyebrow: `CHAIN TOOLS // VERIFIED LANDSCAPES`
- Title: `Find the right surface before you ship.`
- Deck: `Six ecosystems. One evidence model. Search launch, liquidity, data, execution, custody, and developer tooling without mistaking adjacency for native support.`

The hero uses no chain logo collage. It renders a CSS-only 17-column category signal rail and the current verification date. Motion is a single sweep across the rail on initial view, then stops. Under `prefers-reduced-motion`, the final state is immediate.

## Chain atlas

The atlas is a two-column industrial card grid on desktop and one column on mobile. Each card contains:

- chain name and shorthand;
- one-sentence landscape thesis;
- counts for current native, adjacent/cross-chain, beta/testnet, and native-gap categories;
- a 17-cell coverage strip using words in accessible text and color only as reinforcement;
- direct links to `Explore tools` and `Read chain articles`;
- no market cap, token price, TVL rank, or promotional superlative.

| Chain | Card thesis | Categories to foreground |
|---|---|---|
| Solana | Dense transaction, liquidity, launch, and data tooling around one high-throughput state machine. | launch, DEX, aggregation, execution, analytics |
| Ethereum | The broadest composable base-layer toolset, with material activity distributed into explicitly named L2s. | DEX, lending, staking/restaking, security, developer infrastructure |
| BNB Chain | Retail-oriented issuance and DeFi density across BSC, with opBNB and Greenfield shown as separate scopes. | launch, DEX, yield, wallets, SocialFi |
| Bitcoin | Base-layer settlement plus Lightning, Ordinals/Runes, analytics, and adjacent financial rails—not EVM-style DeFi. | wallets, execution, analytics, collectibles, developer infrastructure |
| Zcash | A smaller, privacy-specialized stack centered on shielded wallets, node infrastructure, explorers, and swap rails. | wallets, developer infrastructure, analytics, interoperability, consumer |
| Robinhood Chain | A live but emerging EVM rollup with strong infrastructure, oracle, bridge, custody, and RWA-oriented rails. | infrastructure, market data, bridges, custody, lending |

Counts must be computed from data at build/runtime. Specs must not freeze a number in page copy.

## Shared search

Above the atlas, add one input labeled `Search all chain tools`. Results group by canonical tool, then show chain-placement chips. A query for `oracle` returns category matches and aliases; a query for `Chainlink` returns one result with all qualifying chains.

Keyboard behavior:

- `/` focuses search when the user is not typing in another control;
- `ArrowDown` enters results;
- `Enter` opens the highlighted canonical tool drawer;
- `Escape` clears results first, then blurs the input;
- no single-letter shortcut fires inside a form control.

The site command palette must index `Chain Tools`, all six tooling pages, all canonical tool names, category names, and aliases. Palette results for a cross-chain tool show the selected chain route rather than opening an ambiguous global result.

## Navigation integration

- Global navigation: `CHAINS` continues to open `#/chains`; add `CHAIN TOOLS` linking to `#/tools`.
- Every existing chain hub receives a `Tool landscape` action.
- The footer receives a `CHAIN TOOLS` group containing the wrapper plus all six chain pages.
- Each tooling page contains previous/next sibling links in the canonical chain order: Solana, Ethereum, BNB Chain, Bitcoin, Zcash, Robinhood Chain.
- A direct tooling-page load must not require visiting `#/chains` first.

## No-JavaScript contract

The initial HTML must expose:

- the wrapper heading and explanation;
- six real chain anchors;
- the verification/methodology note;
- a compact static category legend.

Interactive search and computed counts may enhance after hydration. They may not be the only navigation path.

## Responsive contract

- `>= 1000px`: two-column card grid, persistent category legend.
- `700–999px`: two columns with shorter thesis measure; count cluster wraps.
- `< 700px`: one column; every card action is at least 44px high; the 17-cell strip horizontally scrolls only inside its own labeled region.
- At 360px, no page-level horizontal overflow.

## Acceptance tests

- `#/tools` remains selected in nav and never redirects to Solana.
- Six chain cards and twelve primary actions are present as real anchors.
- Search can find a tool by name, alias, category, or chain.
- Counts equal the normalized inventories, excluding `deprecated`/`unknown` from current totals.
- Every category color has a text/ARIA equivalent.
- Footer and command palette include wrapper plus all six pages.
- JavaScript-off navigation can reach every chain tooling page.
