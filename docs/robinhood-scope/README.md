# Robinhood Scope · Multichain Gang — specification suite

> **Status:** implemented release candidate at `../../multichain/robinhood/`
>
> **Research snapshot:** 2026-08-31 (America/Los_Angeles)
>
> **Reference implementation:** Solana Scope at
> `../../multichain/solana/index.html`
>
> **Public naming:** `Robinhood Scope · Multichain Gang`

> **Release evidence:** [2026-08-31](releases/2026-08-31/README.md)

This directory specifies—and now records the implementation of—a standalone Robinhood Chain edition of the existing
Scope instrument. It preserves the Solana page's exact editorial formula while
changing the point of view: Robinhood Chain becomes the primary system under
the scope, and Solana joins Bitcoin, Ethereum, BNB Chain, and Zcash as the five
comparison systems.

The published title puts the project's own `Multichain Gang` identity first. This is
intentional. Robinhood permits accurate educational references to Robinhood
Chain, but its current brand terms require third-party identity to remain
primary and prohibit unofficial abbreviations, misleading affiliation, and
modified marks. The page must carry a conspicuous independent-project
disclaimer and should use plain text rather than a Robinhood Chain logo unless
the official asset is used exactly as supplied.

## Documents

| File | Purpose |
|---|---|
| [00-PROGRAM-AND-PAGE-FORMULA.md](00-PROGRAM-AND-PAGE-FORMULA.md) | Product decision, exact Solana-to-Robinhood formula, scope, page map, and editorial rules. |
| [01-RESEARCH-AND-SOURCE-LEDGER.md](01-RESEARCH-AND-SOURCE-LEDGER.md) | Exhaustive first-party Robinhood documentation synthesis, confidence labels, unresolved facts, and refresh ledger. |
| [02-CONTENT-AND-FIGURES.md](02-CONTENT-AND-FIGURES.md) | Hero, five channels, proposed teaching copy, figures, readouts, cards, and 26-cue authored walkthrough. |
| [03-CROSS-CHAIN-COMPARISON.md](03-CROSS-CHAIN-COMPARISON.md) | Four comparator docks, five comparison chains, technique grid, tool bench, and comparison methodology. |
| [04-DATA-ROUTES-AND-ENTITIES.md](04-DATA-ROUTES-AND-ENTITIES.md) | Inline JSON contract, evidence records, routes, search, Hoverdocs, entity pages, and no-JavaScript parity. |
| [05-INTERACTION-VISUAL-ACCESSIBILITY.md](05-INTERACTION-VISUAL-ACCESSIBILITY.md) | Instrument aesthetic, Robinhood-specific visual grammar, responsive behavior, motion, controls, and accessibility. |
| [06-IMPLEMENTATION-ORCHESTRATION-QA.md](06-IMPLEMENTATION-ORCHESTRATION-QA.md) | File ownership, build sequence, audits, release checks, and definition of done. |

## Core decision

The page should not read as “a fast EVM chain.” Its defining teaching model is
the separation of control planes and clocks:

```text
submit → Robinhood-operated sequencer → soft receipt
                                   ↓
                         batch posted to Ethereum
                                   ↓
                           Ethereum finality

canonical L2→L1 withdrawal → separate challenge-period clock
```

That structure produces the page's main thesis:

> When fees cannot buy the front, latency becomes the bid. Robinhood Chain
> makes the first receipt fast by centralizing sequence, then borrows its
> hardest guarantee from Ethereum.

## Exact-formula invariants

The standalone edition is not a generic documentation portal. It must retain
all of these traits from `SOLANA//SCOPE`:

- one high-concept instrument hero with four dated readouts;
- five authored channels in the same order: topology, transaction flow, MEV,
  latency, and cross-chain bench;
- one primary explanatory figure in CH-01, CH-02, and CH-04, two figures in
  CH-03, and the heat grid plus tool bench in CH-05;
- one per-section comparison dock across the baseline plus five other chains;
- the same eight technique rows and function-grouped tool bench;
- a structured inline `#chainData` source rather than facts embedded in
  rendering code;
- source-linked Hoverdocs, full-screen entity routes, local search, and an
  authored read-through transport;
- reduced-motion, CDN-failure, storage-failure, and JavaScript-off paths;
- exact semantic no-JavaScript mirrors for every teaching table;
- the same mobile QA widths and no document-level horizontal overflow; and
- evidence and audit gates that fail closed when a source, route, label, or
  mirror becomes inconsistent.

## Research conclusions that shape the page

- Robinhood Chain mainnet is chain ID `4663`, settles to Ethereum, uses ETH for
  gas, and publishes data through Ethereum blobs.
- A single Robinhood-operated sequencer orders accepted transactions first
  come, first served. Higher fees do not move a later arrival ahead.
- Finality has three documented stages: sub-second soft confirmation, posting
  to Ethereum in minutes, and Ethereum finality about 13 minutes after posting.
- The canonical withdrawal's roughly seven-day challenge period is a fourth
  user-facing duration, not a fourth transaction-finality stage.
- Anyone may use the chain or run a full node, while the sequencer, allowlisted
  BoLD validator set, and Security Council remain distinct control planes.
- Stock Tokens are issuer-created tokenised debt securities, not ownership of
  underlying shares. They require multiplier, oracle, market-session,
  eligibility, and canonical-address context.
- The official ecosystem directory demonstrates integration availability, not
  volume, liquidity, safety, uptime, decentralization, or endorsement.

## Specification precedence

1. Current Robinhood Chain terms and brand guidelines control all naming and
   mark usage.
2. Current first-party protocol documentation controls technical claims.
3. `00-PROGRAM-AND-PAGE-FORMULA.md` controls the standalone page's product
   shape.
4. The topical specification controls implementation details for its surface.
5. `06-IMPLEMENTATION-ORCHESTRATION-QA.md` controls sequence, validation, and
   release evidence.

When a volatile value changes, update the research ledger and data record; do
not silently rewrite the teaching model. When a source disappears or conflicts
with another first-party source, label the conflict and remove the claim from
the rendered page until reconciled.
