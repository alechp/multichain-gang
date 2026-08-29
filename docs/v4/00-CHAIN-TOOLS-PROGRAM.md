# 00 — Chain Tools program

## Outcome

Add a new **Chain Tools** section that lets a reader answer four questions without decoding a logo poster:

1. Which tools are usable on this chain now?
2. Which job does each tool perform?
3. Is the integration native, adjacent, cross-chain, testnet, announced, or deprecated?
4. What official evidence supports that classification, and when was it checked?

The section consists of one wrapper index and six chain-specific landscape pages. It complements, rather than replaces, the existing `#/chains` and `#/c/<chain>` architecture.

## Why the old landscape pattern fails

The supplied 2021 Solana landscape screenshot is a useful historical artifact but an unsuitable information architecture:

- logo size and placement imply importance without defining a metric;
- protocols are duplicated across concentric category bands;
- categories mix primitives, user applications, infrastructure, and assets;
- the poster cannot show whether a tool is live, retired, testnet-only, or merely chain-adjacent;
- no source, checked date, custody model, or integration surface is visible;
- logos are unreadable on mobile and inaccessible without a parallel text inventory;
- there is no stable URL for a filtered view or a specific tool.

The replacement is an evidence-backed data table with a topology visual as editorial context. The visual attracts and explains; the table carries the facts.

## Supported routes

| Surface | Route | Purpose |
|---|---|---|
| Chain Tools wrapper | `#/tools` | compare all six landscapes and enter a chain |
| Solana Tools | `#/tools/solana` | Solana-native and Solana-integrated tooling |
| Ethereum Tools | `#/tools/ethereum` | Ethereum mainnet first; L2-adjacent placements marked |
| BNB Chain Tools | `#/tools/bnb-chain` | BSC first; opBNB/Greenfield placements marked |
| Bitcoin Tools | `#/tools/bitcoin` | Bitcoin base layer, Lightning, Ordinals/Runes, adjacent rails |
| Zcash Tools | `#/tools/zcash` | shielded wallets, infrastructure, explorers, cross-chain rails |
| Robinhood Chain Tools | `#/tools/robinhood-chain` | production RHC tools plus explicit emerging-category gaps |

Every chain page must include a breadcrumb to `#/tools` and a sibling link to the existing chain article hub, for example `#/c/solana`.

## Research scope

The snapshot is a curated production tooling landscape checked on 2026-08-29. It is intentionally not a claim that every protocol ever deployed is included. Inclusion requires:

- a current official product, documentation, deployment, repository, or chain ecosystem source;
- a user or developer job that fits the shared taxonomy;
- an identifiable relationship to the chain;
- enough information to assign state and scope without guessing.

Excluded by default:

- abandoned projects with no useful historical role;
- tokens with no distinct tooling surface;
- centralized exchanges unless they expose a chain-specific developer, custody, pricing, or wallet surface relevant to the map;
- unsourced directory entries and affiliate listicles;
- a protocol copied from another chain merely to fill a category.

Deprecated products may be included only when the deprecation itself is useful context and is visibly labeled.

## Editorial posture

Chain Tools is documentation, not a ranking, endorsement, investment recommendation, or completeness guarantee. The default sort is category then name, never TVL, token price, or sponsored priority. The site must not compute or display an unsourced “best tool” score.

## Shared page anatomy

Each chain page contains, in order:

1. chain breadcrumb and page identity;
2. generated topology visual with a short “how to read this” caption;
3. evidence timestamp, scope statement, and landscape thesis;
4. category coverage rail showing `dense`, `established`, `emerging`, `adjacent`, or `native gap`;
5. interactive tooling table;
6. pinned comparison tray for up to three tools;
7. “native gaps and category traps” editorial section;
8. methodology and primary sources;
9. update/contribution instructions;
10. links to the chain article hub and the other five tool landscapes.

## Success criteria

- All 17 categories are rendered consistently on all six pages.
- A tool with three jobs is one canonical record with three category placements, not three copied records.
- Every visible tool has at least one current first-party source and a checked date.
- Every placement shows chain scope and product state.
- Empty categories are explicit and explanatory.
- Table controls work by keyboard, pointer, touch, and with reduced motion.
- The primary source link remains a real anchor when JavaScript is disabled.
- The six provided visuals load locally and never substitute for the data table.
- The wrapper, six pages, command palette, chain hubs, and footer cross-link without dead ends.
