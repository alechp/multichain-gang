# SOLANA//SCOPE v4 — Chain Tools

- Status: implementation-ready specification set
- Research snapshot: 2026-08-29
- Product name: **Chain Tools**
- Canonical wrapper route: `#/tools`
- Canonical chain route: `#/tools/<chain-slug>`

This program replaces static logo landscapes with sourced, searchable tooling maps for every chain already represented by SOLANA//SCOPE. It covers Solana, Ethereum, BNB Chain, Bitcoin, Zcash, and Robinhood Chain.

## Reading order

1. [00 — Program](./00-CHAIN-TOOLS-PROGRAM.md)
2. [01 — Taxonomy and evidence](./01-TAXONOMY-AND-EVIDENCE.md)
3. [02 — Wrapper index](./02-CHAIN-TOOLS-INDEX.md)
4. [03 — Solana](./03-SOLANA-TOOLS.md)
5. [04 — Ethereum](./04-ETHEREUM-TOOLS.md)
6. [05 — BNB Chain](./05-BNB-CHAIN-TOOLS.md)
7. [06 — Bitcoin](./06-BITCOIN-TOOLS.md)
8. [07 — Zcash](./07-ZCASH-TOOLS.md)
9. [08 — Robinhood Chain](./08-ROBINHOOD-CHAIN-TOOLS.md)
10. [09 — Data, interaction, and visual system](./09-DATA-INTERACTION-VISUALS.md)
11. [10 — Multi-agent implementation orchestration](./10-ORCHESTRATION.md)

## Program boundary

These documents specify the implementation and provide the six production visual assets. They do not add the runtime pages themselves. The execution plan in [10-ORCHESTRATION.md](./10-ORCHESTRATION.md) is the handoff for that implementation.

## Generated visual assets

| Chain | Asset | Intended metaphor |
|---|---|---|
| Solana | [`assets/chain-tools/solana-landscape.png`](../../assets/chain-tools/solana-landscape.png) | parallel execution and dense routing |
| Ethereum | [`assets/chain-tools/ethereum-landscape.png`](../../assets/chain-tools/ethereum-landscape.png) | layered settlement and composability |
| BNB Chain | [`assets/chain-tools/bnb-chain-landscape.png`](../../assets/chain-tools/bnb-chain-landscape.png) | compact retail DeFi and issuance ring |
| Bitcoin | [`assets/chain-tools/bitcoin-landscape.png`](../../assets/chain-tools/bitcoin-landscape.png) | conservative settlement with Lightning above |
| Zcash | [`assets/chain-tools/zcash-landscape.png`](../../assets/chain-tools/zcash-landscape.png) | shielded topology and privacy tooling |
| Robinhood Chain | [`assets/chain-tools/robinhood-chain-landscape.png`](../../assets/chain-tools/robinhood-chain-landscape.png) | sequencer spine, institutional rails, open sockets |

All images are text-free, logo-free raster assets. Product names, evidence, counts, and accessibility text must remain HTML/data, never baked into an image.
