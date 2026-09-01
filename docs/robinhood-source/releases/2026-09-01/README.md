# Robinhood Source release record — 2026-09-01

> **Result:** release gates passed
> **Research cutoff:** 2026-09-01 (America/Los_Angeles)
> **Route:** `/multichain/robinhood/source/`
> **Local URL:** `http://127.0.0.1:4173/multichain/robinhood/source/`

## Release identity

| Field | Value |
|---|---|
| Frozen base | `e10c41046ca177993d80efad6771856ad5fc785c` |
| Final implementation candidate | `0c0e7daa56c1071ffa4c880f733b44e80fc49665` |
| Generator | `scripts/refresh-robinhood-source.mjs`, schema `1`, generator `1.0.0` |
| Release digest | `025aa5cc1e74a62a02f9479b0da5b586cb2e2c83b72109d9f396964f5bd2b9ed` |
| Protected boundary | `multichain/solana/**` unchanged from the frozen base |

The final implementation candidate is the reviewed application/data commit.
This evidence record is a documentation-only descendant of that candidate.

## Generated snapshot

The explorer is complete for the admitted, immutable repository set. It is not
a claim that any public repository is the private Robinhood production build.

| Measure | Result |
|---|---:|
| Repository tree instances | 28 |
| Addressable entries | 37,711 |
| Trees | 6,139 |
| Blobs | 31,494 |
| Gitlinks | 78 |
| Resolved / unresolved gitlinks | 78 / 0 |
| Directory shards | 258 |
| Truncated GitHub trees accepted | 0 |
| Featured / secondary highlights | 8 / 5 |
| Comparison systems / axes / cells | 6 / 5 / 30 |
| Robinhood CDN artifacts | 3 |

## Immutable source pins

Robinhood-published contribution pins:

| Repository | Commit |
|---|---|
| `robinhoodmarkets/chains` | `dbbb502f2c7f7a59b16c18c57255c35a5d9e0ebb` |
| `robinhoodmarkets/viem` | `836ab6a2cd3169797736072429b793557394e6e9` |
| `robinhoodmarkets/forge-std` | `860965334c22aa1933e2e0c1de0cbedcbf5daa19` |
| `robinhoodmarkets/chainlist` (mainnet contribution) | `0fc6cee323d0f2fd7d67a654e32d58d1a911336c` |
| `robinhoodmarkets/chainlist` (testnet contribution) | `74fcf54e9b5754cfa2f1afae08dda673b908d016` |
| `robinhoodmarkets/l2beat` | `17edbcfa4857adc07d72e412803a567d484b2e9b` |

Robinhood's public full-node documentation pins the Nitro image corresponding
to `OffchainLabs/nitro` tag `v3.11.2`, commit
`3599acae1ad2fab4059fc46453c9cd3294126641`. Its directly resolved runtime
dependency tree is:

| Repository | Commit |
|---|---|
| `OffchainLabs/go-ethereum` | `f3a977ddf30b138da2fe673ac5cbff2bc6dd4c88` |
| `OffchainLabs/nitro-contracts` (current gitlink) | `4341b132cfbdcc980ead03765ca5224ff6cb5d97` |
| `OffchainLabs/nitro-contracts` (legacy gitlink) | `68a8efc587e51813755d746f53d2cda9a4c16311` |
| `OffchainLabs/nitro-precompile-interfaces` | `7e88c8cc53c2e96201a23c638f1536557b9cb68b` |
| `OpenZeppelin/openzeppelin-contracts` | `b438cb695a1ac520cee6678610b161b1d5df4d9c` |
| `google/brotli` | `f4153a09f87cbb9c826d8fc12c74642bb2d879ea` |
| `OffchainLabs/nitro-testnode` | `14c703d909d1242f8a67b031cbe62ef747539b64` |
| `OffchainLabs/wasmer` | `63c981919d5a5598cdafb197841fa784b5cde955` |
| `OffchainLabs/SoftFloat` | `7bf03222ad094ec3441f5c3935eeb1b41ee470ba` |
| `WebAssembly/testsuite` | `e25ae159357c055b3a6fac99043644e208d26d2a` |
| `OffchainLabs/stylus-sdk-rs` | `974ff14fe600c6be79fa87ecf8950c131e046a29` |
| `OffchainLabs/stylus-sdk-c` | `46ef0fccb60222ee6b1e7cdb440b2f8dcb9e0a33` |
| `OffchainLabs/stylus-sdk-bf` | `398b522785aaa475757aeaa3ed447529732da061` |
| `safe-fndn/safe-smart-account` | `dc437e8fba8b4805d76bcbd1c668c9fd3d1e83be` |

Official integration/reference pins:

| Repository | Commit |
|---|---|
| `OffchainLabs/arbitrum-sdk` | `7948889f97bdbb01ef0ba03a98507027ff5586fa` |
| `smartcontractkit/data-streams-sdk` | `24ba34ddd55cab9f8074ef13d79e968c12c00e5c` |
| `Uniswap/contracts` | `4cfc406c8e34da3ce04e60657a7825075b64fd22` |
| `Uniswap/UniswapX` | `fd6022568ebeb761008fcc68d5b5a417e0e0a815` |
| `Uniswap/liquidity-launcher` | `1eda9f0c0243e2fdc0cbe0d665200ffa8c2ba53a` |
| `Uniswap/sdks` | `48dea05c1800598a31005c333c08344e53e2b9c6` |
| `ethereum/ERCs` | `94c80fab6e0a40f658e947b57f7f0b581cd3f081` |

## Measured budgets

Measurements were taken after authenticated reveal with the complete local
dataset loaded. Ten-sample p95 values use the slowest observation for the
small sample, making the record conservative.

| Budget | Result | Target / hard gate | Status |
|---|---:|---:|---|
| Initial authored Source payload | 127,507 bytes | 180 / 250 KiB | Pass |
| Catalog | 32,328 bytes | 80 / 100 KiB | Pass |
| Largest directory shard | 61,428 bytes | 64 / 128 KiB | Pass |
| Cached directory expansion p95 | 35.2 ms | 50 / 100 ms | Pass |
| Search input to visible results p95 | 36.2 ms | 50 / 100 ms | Pass |
| Route/selection update p95 | 34.4 ms | 50 / 100 ms | Pass |
| Document overflow at 390 / 768 / 1440 px | 0 / 0 / 0 px | 0 px | Pass |
| External runtime requests | 0 | 0 | Pass |

The 768×900 notebook resolves to three readable columns; every section's
`clientWidth` equals its `scrollWidth`. No normal-exploration task above 50 ms
or authenticated-reveal layout shift above 0.05 was observed.

## Verification evidence

The integration root ran these release commands:

```sh
node scripts/validate-robinhood-source.mjs

PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/Users/alechp/Library/Caches/ms-playwright/chromium_headless_shell-1169/chrome-mac/headless_shell \
  node scripts/audit-robinhood-source.mjs \
  --base-sha e10c41046ca177993d80efad6771856ad5fc785c

PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/Users/alechp/Library/Caches/ms-playwright/chromium_headless_shell-1169/chrome-mac/headless_shell \
  RH_SOURCE_BASE_SHA=e10c41046ca177993d80efad6771856ad5fc785c \
  ./run check

git diff --check
git diff --name-only e10c41046ca177993d80efad6771856ad5fc785c..HEAD -- multichain/solana
git diff --exit-code e10c41046ca177993d80efad6771856ad5fc785c..HEAD -- .solana-baseline.sha256
```

Results:

- data validation: 563,872 assertions passed;
- explicit-base Source audit: 16,724 checks passed;
- 28 repositories, 37,711 entries, 78 resolved gitlinks, 258 shards;
- 13 highlights and 30 comparison cells;
- authenticated page suite: eight pages passed;
- degradation suite: 15 cases passed;
- responsive, keyboard, Escape, outside-click, focus restoration, forced-color,
  exact-shard mutation, offline/file-mode, and safe-rendering probes passed;
- protected Solana diff: empty; and
- Solana baseline checksum: unchanged.

Three independent read-only wave-three reviews reproduced the data digest,
responsive/performance result, and full release gate after integration.

## Public-source gaps and caveats

No qualifying public source was found by the cutoff for:

- Robinhood's production sequencer customization or configuration;
- a Robinhood-authored node or ArbOS fork;
- deployed Stock Token contract source;
- the Stock Token API backend;
- the Data Streams publisher or Robinhood verifier implementation; or
- compliance and transaction-screening rules.

Absence from the admitted public set is not evidence that a component or
behavior does not exist. The Nitro pin identifies a documented public full-node
image; it does not prove sequencer configuration, private patches, deployment
topology, or production equivalence. Generic Chainlink and Arbitrum upstreams
without Robinhood-specific pins remain references rather than deployed-source
claims. The unaffiliated `chainstacklabs/robinhood-chain-sequencer-feed` record
is volatile and remains ledger-only.

The page has no live GitHub, RPC, wallet, brokerage, telemetry, service-worker,
or third-party font dependency. Authentication is the repository's existing
static presentation/session gate, not server-enforced protection of published
GitHub Pages bytes.
