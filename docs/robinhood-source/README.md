# Robinhood Source Explorer specifications

> **Status:** implementation-ready specification package  
> **Research cutoff:** 2026-09-01 (America/Los_Angeles)  
> **Target route:** `/multichain/robinhood/source/`  
> **Product:** Multichain Gang  
> **Protected boundary:** `multichain/solana/**` remains byte-for-byte untouched

## Objective

Add an authenticated, read-only Robinhood Source page that lets a reader:

1. understand what Robinhood Chain source is and is not publicly available;
2. explore every path in the qualified, commit-pinned GitHub source set;
3. inspect a small, reviewed set of syntax-highlighted code excerpts;
4. translate those excerpts into measurable infrastructure questions for
   latency-sensitive quantitative systems; and
5. compare equivalent source-path concerns across the six Multichain Gang
   systems without declaring a winner.

The publication must never imply that a public upstream repository proves the
exact code or configuration running Robinhood's sequencer. Robinhood publishes
chain artifacts and a Nitro node image pin, but no public Robinhood Chain
implementation repository was found in the verified `robinhoodmarkets` or
legacy `robinhood` GitHub organizations at the research cutoff.

## Specification map

| Document | Contract |
|---|---|
| [00 — Program and source boundary](00-PROGRAM-AND-SOURCE-BOUNDARY.md) | Product goal, route, evidence tiers, safety rules, scope, and frozen decisions. |
| [01 — Repository research ledger](01-REPOSITORY-RESEARCH-LEDGER.md) | Exhaustive search method, qualifying repository graph, pinned revisions, exclusions, and refresh rules. |
| [02 — Tree snapshot and data contract](02-TREE-SNAPSHOT-AND-DATA-CONTRACT.md) | Deterministic Git tree capture, sharding, schemas, integrity checks, and offline delivery. |
| [03 — Performance hotspots](03-PERFORMANCE-HOTSPOTS.md) | Focused files, exact source selections, quant-performance interpretation, measurements, and caveats. |
| [04 — Page, interaction, and visual specification](04-PAGE-INTERACTION-AND-VISUAL.md) | Information architecture, explorer behavior, syntax treatment, responsive layout, accessibility, and auth. |
| [05 — Cross-chain source comparison](05-CROSS-CHAIN-SOURCE-COMPARISON.md) | Normalized source-path matrix and comparison data contract for Robinhood, Solana, Bitcoin, Ethereum, BNB Chain, and Zcash. |
| [06 — QA, security, performance, and release](06-QA-SECURITY-PERFORMANCE-RELEASE.md) | Automated gates, browser matrix, budgets, failure modes, release evidence, and maintenance. |
| [07 — Implementation orchestrator](07-IMPLEMENTATION-ORCHESTRATOR.md) | Four-slot, dependency-aware implementation plan with isolated worktrees, file ownership, integration gates, and handoff cards. |

## Frozen first-release decisions

- Route: `/multichain/robinhood/source/`.
- Robinhood navigation becomes `Scope · Chains · Tools · Source`; Solana remains
  `Scope · Chains · Tools`.
- The page uses the existing `multichain/auth.js` and `multichain/auth.css`
  gate. It does not claim that static GitHub Pages authentication protects the
  bytes from a determined direct fetch.
- Core reading works without a live GitHub API, CDN, wallet, RPC endpoint,
  brokerage session, telemetry service, or build server.
- Tree data is generated offline from immutable Git commit SHAs and shipped as
  local JavaScript registration shards so it works over both `https:` and
  direct `file:` access.
- Every file and directory in the qualified repository snapshot remains
  addressable. Generated, vendored, test, and documentation paths may be hidden
  by default, but are never deleted from the catalog.
- Ordinary files expose metadata and a commit permalink. Source text is stored
  only for reviewed highlights.
- Highlight excerpts explain infrastructure behavior. They do not provide
  trading signals, recommend trades, automate order entry, solicit credentials,
  or enable wallet/signing/transaction-submission behavior on the page.

## Definition of complete

The implementation is complete only when:

- the source ledger records every qualifying repository and every explicit
  exclusion with an evidence-backed reason;
- every included repository tree is complete at its recorded revision and no
  GitHub `truncated: true` response is accepted as complete;
- all included submodules resolve to the exact gitlink SHAs in Nitro `v3.11.2`;
- all highlighted excerpts resolve to immutable permalinks and pass line-range,
  digest, license, and editorial review;
- search, keyboard tree navigation, deep links, comparison, and mobile details
  work without network access after the static files load;
- JavaScript-off access fails closed at the existing authentication gate;
- Escape and outside-click dismissal follow the site-wide popup contract;
- the full automated and visual QA matrix in `06` passes; and
- `git diff --name-only <base>..HEAD -- multichain/solana` is empty and the
  existing Solana checksum audit still passes.

## Non-goals

- Mirroring all source blobs from all repositories.
- Treating GitHub topic matches as official source.
- Reverse-engineering a private Robinhood sequencer build.
- Claiming that Nitro defaults are Robinhood production settings.
- Live source editing, cloning, issue filing, wallet connection, API key input,
  order entry, brokerage integration, or transaction construction.
- Adding a Solana Source route in this release.
