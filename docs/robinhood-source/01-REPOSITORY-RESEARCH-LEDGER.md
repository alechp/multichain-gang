# 01 — Repository research ledger

> **Checked:** 2026-09-01 (America/Los_Angeles)  
> **Primary-source rule:** official Robinhood material for Robinhood-specific
> facts; owning protocol organizations and immutable GitHub revisions for
> source claims

## 1. Principal finding

No public Robinhood-authored node, sequencer, ArbOS fork, Stock Token contract
repository, or Robinhood Chain documentation repository was found.

The public source boundary is instead:

1. Robinhood's [full-node guide](https://docs.robinhood.com/chain/run-a-full-node/)
   pins `offchainlabs/nitro-node:v3.11.2-3599aca`.
2. Nitro tag `v3.11.2` resolves to
   [`3599acae1ad2fab4059fc46453c9cd3294126641`](https://github.com/OffchainLabs/nitro/tree/3599acae1ad2fab4059fc46453c9cd3294126641).
3. Robinhood supplies chain-specific configuration and genesis through its CDN,
   not GitHub.
4. The verified `robinhoodmarkets` organization publishes chain metadata and
   tooling contributions as forks/branches, not a canonical runtime.
5. Arbitrum, Chainlink, Uniswap, and Ethereum standards repositories expose
   authoritative upstream or integration source, but are not
   Robinhood-controlled and do not attest private operator configuration.

This distinction is a release-blocking editorial rule.

## 2. Search method and coverage

The research pass performed the following checks:

1. Enumerated every public repository in GitHub organizations
   [`robinhoodmarkets`](https://github.com/robinhoodmarkets) and
   [`robinhood`](https://github.com/robinhood).
2. Enumerated all 23 substantive routes in the current Robinhood Chain docs
   navigation and scanned their rendered links for GitHub destinations.
3. Resolved the node image suffix in the first-party full-node guide to the
   exact Nitro release tag and commit.
4. Read Nitro's `.gitmodules` and recursive Git tree at that revision; resolved
   all 14 gitlinks to immutable SHAs.
5. Checked primary protocol repositories for explicit chain `4663`,
   `Robinhood`, documented SDK, deployment, clock, or registry evidence.
6. Queried the complete GitHub `robinhood-chain` topic census. It returned 199
   public repositories at the cutoff. Topic membership alone was rejected as
   an authority signal.
7. Verified repository owner, fork/archive state, default branch, revision,
   commit date, license metadata, and recursive-tree truncation for every
   proposed primary tree.

The official docs routes reviewed were:

```text
/chain/
/chain/account-abstraction
/chain/add-network-to-wallet
/chain/brand-guidelines
/chain/bridging
/chain/building-with-stock-tokens
/chain/connecting
/chain/contracts
/chain/cross-chain-messaging
/chain/data-streams
/chain/deploy-smart-contracts
/chain/differences-from-ethereum
/chain/gas-and-fees
/chain/governance
/chain/notices-and-upgrades
/chain/oracles-and-price-feeds
/chain/protocol-contracts
/chain/report-issue
/chain/run-a-full-node
/chain/stock-token-apis
/chain/stock-tokens
/chain/terms-of-service
/chain/transaction-finality
```

## 3. Robinhood-published contribution forks

These repositories belong to the verified organization but are not the chain
runtime. Render the group as `ROBINHOOD-PUBLISHED CONTRIBUTIONS`.

| ID | Repository and immutable Robinhood ref | Purpose | Status / license |
|---|---|---|---|
| `rh-chains` | [`robinhoodmarkets/chains@dbbb502`](https://github.com/robinhoodmarkets/chains/tree/dbbb502f2c7f7a59b16c18c57255c35a5d9e0ebb) | EIP-155 registry contribution for chain `4663`; relevant path `_data/chains/eip155-4663.json`. | Public fork, active; MIT. |
| `rh-viem` | [`robinhoodmarkets/viem@836ab6a`](https://github.com/robinhoodmarkets/viem/tree/836ab6a2cd3169797736072429b793557394e6e9) | Robinhood mainnet/testnet chain definitions and token-address additions. | Public fork, active; repository file says MIT, GitHub API reports `NOASSERTION`. |
| `rh-forge-std` | [`robinhoodmarkets/forge-std@8609653`](https://github.com/robinhoodmarkets/forge-std/tree/860965334c22aa1933e2e0c1de0cbedcbf5daa19) | Foundry `StdChains` constants. | Public fork, active; Apache-2.0. |
| `rh-chainlist` | [`robinhoodmarkets/chainlist@0fc6cee`](https://github.com/robinhoodmarkets/chainlist/tree/0fc6cee323d0f2fd7d67a654e32d58d1a911336c) | DeFiLlama chain-list mainnet configuration. A second pinned record must capture testnet commit `74fcf54e9b5754cfa2f1afae08dda673b908d016`. | Public fork, active; GPL-3.0. |
| `rh-l2beat` | [`robinhoodmarkets/l2beat@17edbcf`](https://github.com/robinhoodmarkets/l2beat/tree/17edbcfa4857adc07d72e412803a567d484b2e9b) | Discovery/config proposal with Robinhood protocol addresses and metadata. | Public fork, active; MIT. |

The branch commit, not the fork's default-branch HEAD, is the source snapshot
when the Robinhood work lives on a contribution branch. Branches can be
rebased/deleted; the immutable SHA is mandatory.

### 3.1 Official-org exclusion ledger

`robinhoodmarkets/frederik-bolding-chainlist` is a public MIT fork, but no
remaining Robinhood branch, path, or discoverable reference was found. Keep it
as `excluded-no-relevant-content`.

The following public organization repositories are unrelated legacy or
general engineering projects and remain ledger-only exclusions:

```text
arcanist · phabricator · cassowary · pyreBloom · hive · Stencil
django-rest-framework · py-spy · fabric · jaeger-ui · jaeger-client-python
engine · redis · cvxpy · zookeeper_exporter · slider · raven-python
svg-react-loader · sockit · bazel-remote
```

The separate `robinhood` organization was also reviewed; its public projects
are older general engineering libraries and are not Robinhood Chain source.

## 4. Exact public runtime graph

### 4.1 Root runtime

| Field | Value |
|---|---|
| Repository | [`OffchainLabs/nitro`](https://github.com/OffchainLabs/nitro) |
| Robinhood inclusion evidence | The first-party node guide names `v3.11.2-3599aca`. |
| Release tag | `v3.11.2` |
| Immutable commit | `3599acae1ad2fab4059fc46453c9cd3294126641` |
| Commit date | 2026-07-01 |
| Status | Public, non-fork, non-archived |
| License | [Business Source License 1.1 plus repository-specific additional-use grant](https://github.com/OffchainLabs/nitro/blob/3599acae1ad2fab4059fc46453c9cd3294126641/LICENSE.md) |
| Deployment equivalence | `public-node-build-pin`; not `sequencer-attested` |

Do not refresh this record to `master`. A later Nitro release becomes eligible
only when Robinhood's current node guide changes its documented image pin.

### 4.2 Direct gitlinks at the pinned revision

Every row is included as an expandable dependency repository at the exact
gitlink SHA. `nitro-contracts` appears twice because the two paths intentionally
pin different revisions.

| Nitro path | Repository | Pinned SHA | License signal |
|---|---|---|---|
| `go-ethereum` | [`OffchainLabs/go-ethereum`](https://github.com/OffchainLabs/go-ethereum/tree/f3a977ddf30b138da2fe673ac5cbff2bc6dd4c88) | `f3a977ddf30b138da2fe673ac5cbff2bc6dd4c88` | LGPL-3.0 |
| `contracts` | [`OffchainLabs/nitro-contracts`](https://github.com/OffchainLabs/nitro-contracts/tree/4341b132cfbdcc980ead03765ca5224ff6cb5d97) | `4341b132cfbdcc980ead03765ca5224ff6cb5d97` | BSL-1.1 |
| `contracts-legacy` | [`OffchainLabs/nitro-contracts`](https://github.com/OffchainLabs/nitro-contracts/tree/68a8efc587e51813755d746f53d2cda9a4c16311) | `68a8efc587e51813755d746f53d2cda9a4c16311` | BSL-1.1 |
| `contracts-local/src/precompiles` | [`OffchainLabs/nitro-precompile-interfaces`](https://github.com/OffchainLabs/nitro-precompile-interfaces/tree/7e88c8cc53c2e96201a23c638f1536557b9cb68b) | `7e88c8cc53c2e96201a23c638f1536557b9cb68b` | BSL-1.1 |
| `contracts-local/lib/openzeppelin-contracts` | [`OpenZeppelin/openzeppelin-contracts`](https://github.com/OpenZeppelin/openzeppelin-contracts/tree/b438cb695a1ac520cee6678610b161b1d5df4d9c) | `b438cb695a1ac520cee6678610b161b1d5df4d9c` | MIT |
| `brotli` | [`google/brotli`](https://github.com/google/brotli/tree/f4153a09f87cbb9c826d8fc12c74642bb2d879ea) | `f4153a09f87cbb9c826d8fc12c74642bb2d879ea` | MIT |
| `nitro-testnode` | [`OffchainLabs/nitro-testnode`](https://github.com/OffchainLabs/nitro-testnode/tree/14c703d909d1242f8a67b031cbe62ef747539b64) | `14c703d909d1242f8a67b031cbe62ef747539b64` | Apache-2.0 |
| `crates/tools/wasmer` | [`OffchainLabs/wasmer`](https://github.com/OffchainLabs/wasmer/tree/63c981919d5a5598cdafb197841fa784b5cde955) | `63c981919d5a5598cdafb197841fa784b5cde955` | MIT |
| `crates/wasm-libraries/soft-float/SoftFloat` | [`OffchainLabs/SoftFloat`](https://github.com/OffchainLabs/SoftFloat/tree/7bf03222ad094ec3441f5c3935eeb1b41ee470ba) | `7bf03222ad094ec3441f5c3935eeb1b41ee470ba` | `NOASSERTION`; inspect notice before excerpting |
| `crates/wasm-testsuite/testsuite` | [`WebAssembly/testsuite`](https://github.com/WebAssembly/testsuite/tree/e25ae159357c055b3a6fac99043644e208d26d2a) | `e25ae159357c055b3a6fac99043644e208d26d2a` | Apache-2.0 |
| `crates/langs/rust` | [`OffchainLabs/stylus-sdk-rs`](https://github.com/OffchainLabs/stylus-sdk-rs/tree/974ff14fe600c6be79fa87ecf8950c131e046a29) | `974ff14fe600c6be79fa87ecf8950c131e046a29` | No license detected; metadata-only until reviewed |
| `crates/langs/c` | [`OffchainLabs/stylus-sdk-c`](https://github.com/OffchainLabs/stylus-sdk-c/tree/46ef0fccb60222ee6b1e7cdb440b2f8dcb9e0a33) | `46ef0fccb60222ee6b1e7cdb440b2f8dcb9e0a33` | No license detected; metadata-only until reviewed |
| `crates/langs/bf` | [`OffchainLabs/stylus-sdk-bf`](https://github.com/OffchainLabs/stylus-sdk-bf/tree/398b522785aaa475757aeaa3ed447529732da061) | `398b522785aaa475757aeaa3ed447529732da061` | No license detected; metadata-only until reviewed |
| `safe-smart-account` | [`safe-fndn/safe-smart-account`](https://github.com/safe-fndn/safe-smart-account/tree/dc437e8fba8b4805d76bcbd1c668c9fd3d1e83be) | `dc437e8fba8b4805d76bcbd1c668c9fd3d1e83be` | LGPL-3.0 |

The `.gitmodules` URL uses the former `safe-global` owner; GitHub currently
redirects it to `safe-fndn`. Preserve both `declaredUrl` and `resolvedUrl`.

## 5. Authoritative integration repositories

These are full explorer trees in a separate group. Their inclusion is based on
explicit Robinhood documentation, chain `4663` source, or an official
deployment registry—not keyword popularity.

| ID | Repository revision | Inclusion basis | License |
|---|---|---|---|
| `arb-sdk` | [`OffchainLabs/arbitrum-sdk@7948889`](https://github.com/OffchainLabs/arbitrum-sdk/tree/7948889f97bdbb01ef0ba03a98507027ff5586fa) | Robinhood's [cross-chain guide](https://docs.robinhood.com/chain/cross-chain-messaging/) recommends `@arbitrum/sdk` for the custom chain. | Apache-2.0 |
| `data-streams-sdk` | [`smartcontractkit/data-streams-sdk@24ba34d`](https://github.com/smartcontractkit/data-streams-sdk/tree/24ba34ddd55cab9f8074ef13d79e968c12c00e5c) | Robinhood's [Data Streams guide](https://docs.robinhood.com/chain/data-streams/) names Go, TypeScript, and Rust SDKs; repo contains all three. | MIT |
| `uniswap-contracts` | [`Uniswap/contracts@4cfc406`](https://github.com/Uniswap/contracts/tree/4cfc406c8e34da3ce04e60657a7825075b64fd22) | Official deployment registry has `deployments/4663.md` and `deployments/json/4663.json`. | Mixed/component; root license unresolved |
| `uniswapx` | [`Uniswap/UniswapX@fd60225`](https://github.com/Uniswap/UniswapX/tree/fd6022568ebeb761008fcc68d5b5a417e0e0a815) | Official `playbook/chains/robinhood.md` and chain-specific `BlockNumberish.sol`. | GPL-3.0 |
| `liquidity-launcher` | [`Uniswap/liquidity-launcher@1eda9f0`](https://github.com/Uniswap/liquidity-launcher/tree/1eda9f0c0243e2fdc0cbe0d665200ffa8c2ba53a) | README lists Robinhood deployments; first-party announcement names Uniswap as a launch integration. | MIT |
| `uniswap-sdks` | [`Uniswap/sdks@48dea05`](https://github.com/Uniswap/sdks/tree/48dea05c1800598a31005c333c08344e53e2b9c6) | Explicit `4663` constants, addresses, and tests across launcher, sdk-core, and UniswapX packages. | Mixed/package-specific |
| `ercs` | [`ethereum/ERCs@94c80fa`](https://github.com/ethereum/ERCs/tree/94c80fab6e0a40f658e947b57f7f0b581cd3f081) | Robinhood Stock Token docs require draft [ERC-8056](https://eips.ethereum.org/EIPS/eip-8056); the standard includes a Robinhood author and reference implementation. | CC0-1.0 |

Where a deployment manifest records a distinct deployed-code commit, the
hotspot must pin that commit. Repository HEAD is only the current integration
view.

## 6. Robinhood artifacts outside GitHub

Render these under a virtual `PUBLISHED CONFIGURATION` root; do not pretend they
are repository paths.

| Artifact | Authority | Treatment |
|---|---|---|
| [Mainnet chain info](https://cdn.robinhood.com/assets/generated_assets/hoodchain_docsite/chain-node-configs/robinhood-chain-info.json) | Robinhood CDN | Store URL, fetch digest, checked date, and parsed chain/rollup fields. |
| Mainnet genesis | Link from current full-node guide | Store URL/digest/size; do not inline the entire genesis in first paint. |
| Testnet chain info | Link from current full-node guide | Separate network record; never mix chain IDs. |
| Verified protocol contracts | Robinhood protocol-contracts docs + explorers | Optional virtual tree; source availability and verification status per address. |
| Stock Token contracts | Robinhood token registry + Blockscout | Record address and verified-source link; do not assert a GitHub match without bytecode/build evidence. |

The current chain info confirms chain ID `4663`, Ethereum parent chain `1`,
ArbOS enabled, no DAC in the published config, and rollup/inbox/sequencer-inbox
addresses. Those are configuration facts, not source-ownership facts.

## 7. Verified primary-tree census

GitHub returned `truncated: false` at the checked revisions:

| Repository | Entries | Blobs | Directories | Gitlinks |
|---|---:|---:|---:|---:|
| `robinhoodmarkets/chains` | 4,595 | 4,525 | 69 | 1 |
| `robinhoodmarkets/viem` | 3,292 | 3,028 | 256 | 8 |
| `robinhoodmarkets/forge-std` | 76 | 68 | 8 | 0 |
| `robinhoodmarkets/chainlist` | 537 | 502 | 35 | 0 |
| `robinhoodmarkets/l2beat` | 11,724 | 8,998 | 2,726 | 0 |
| `OffchainLabs/nitro` | 1,857 | 1,466 | 377 | 14 |
| `OffchainLabs/arbitrum-sdk` | 141 | 114 | 27 | 0 |
| `smartcontractkit/data-streams-sdk` | 263 | 207 | 56 | 0 |
| `Uniswap/contracts` | 1,446 | 1,121 | 303 | 22 |
| `Uniswap/UniswapX` | 293 | 229 | 56 | 8 |
| `Uniswap/liquidity-launcher` | 234 | 173 | 52 | 9 |
| `Uniswap/sdks` | 763 | 657 | 98 | 8 |
| `ethereum/ERCs` | 2,477 | refresh gate records exact split | refresh gate records exact split | refresh gate records exact split |

The first 12 repositories total 25,221 entries before expanding Nitro's direct
dependency repositories. The generator must compute and publish the final
included-entry count; the spec does not freeze a count before generation.

## 8. Explicit exclusions and unresolved boundaries

- GitHub cannot reveal private Robinhood repositories. Say “not publicly
  found,” not “does not exist.”
- Topic repositories, trading bots, MCP servers, sniper tools, unofficial SDKs,
  and `awesome-*` lists are excluded from the primary tree regardless of stars.
- `chainstacklabs/robinhood-chain-sequencer-feed` is a notable independent feed
  decoder, but is not first-party, not named in current Robinhood docs, and not
  required to explain the canonical Nitro feed client. Keep it ledger-only.
- `OffchainLabs/arbitrum-chain-sdk`, `smartcontractkit/chainlink`, and
  `OffchainLabs/token-bridge-contracts` are relevant generic upstream projects
  but lack a Robinhood-specific version/deployment pin. Keep them under
  `relatedUpstream`, not the default source tree.
- Independent ecosystem repositories are not authoritative merely because the
  official docs list a service or the repo uses the topic.
- Explorer-verified source is valuable but is not a GitHub repository. It needs
  a separate provenance and bytecode-match pipeline.
- Default branches are volatile. Every released tree and excerpt uses an
  immutable SHA.

## 9. Refresh protocol

On every source-page release:

1. Re-open the full-node guide and record the current image pin.
2. Re-enumerate both Robinhood GitHub organizations.
3. Re-scan every current docs route for GitHub links.
4. Re-run the topic census and record only the count plus review exceptions;
   never ingest topic results automatically.
5. Resolve mutable integration branches to immutable SHAs.
6. Fetch all trees and apply the truncation fallback in `02`.
7. Reconcile licenses, redirects, fork/archive status, and deleted branches.
8. Diff repository paths and hotspot source selections.
9. Require editorial approval for any new repository or changed evidence tier.
10. Leave the last known-good release intact if a critical source disappears;
    mark the source stale and document the failed refresh.
