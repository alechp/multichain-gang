# 03 — Performance hotspots

> **Purpose:** focused, source-backed explanations for quant infrastructure  
> **Default:** eight featured records plus five secondary operator notes

## 1. Selection rubric

A highlight is eligible only when it exposes a measurable mechanism between
observation, decision, submission, sequencing, execution, or confidence
promotion. It needs an immutable commit, exact path/range, excerpt digest,
primary evidence, measurement plan, and deployment caveat.

Label source relationships precisely: `PINNED NODE BUILD`, `DEPLOYED
INTEGRATION`, `AUTHORITATIVE REFERENCE`, or `NOT PUBLIC`. Source defaults are
hypotheses to test, not Robinhood production values.

## 2. Featured highlights

### H01 — Feed reconnect cursor

- Source: `OffchainLabs/nitro@3599acae1ad2fab4059fc46453c9cd3294126641`,
  `broadcastclient/broadcastclient.go` `L67-L107`, `L225-L234`, `L391-L438`,
  `L455-L490`.
- Excerpt: smallest complete fragment around `RequestedSequenceNumber` and
  `nextSeqNum`, one contiguous excerpt at a time.
- Mechanism: reconnect requests the next expected **message sequence**;
  decode/decompression, chain/version checks, and signature validation precede
  streamer insertion.
- Quant insight: block number cannot faithfully resume or measure this feed.
- `MEASURE THIS`: connect→first valid frame; receive→verified→inserted; gap
  duration; retries; catch-up throughput; compressed/uncompressed CPU/network.
- Caveat: timeout/backoff defaults are not live Robinhood configuration. Never
  recommend disabling validation.

### H02 — Continuity, duplicates, and soft-state replacement

- Source: pinned Nitro, `arbnode/transaction_streamer.go` `L97-L132`,
  `L639-L737`, `L1004-L1013`.
- Excerpt: continuity branch around `expectedMsgIdx` and the guard preventing
  feed updates from rewriting confirmed messages.
- Mechanism: contiguous messages advance; duplicates drop; a jump replaces the
  pending queue; L1-confirmed messages later reconcile the soft view.
- Quant insight: keep a promotion ledger, not one mutable “latest” position.
- `MEASURE THIS`: feed head−persisted count; pending depth; duplicate/jump
  counts; soft→confirmed time; rollback work after feed reorg.
- Caveat: feed state is explicitly not final.

### H03 — RPC forwarding and failover

- Source: pinned Nitro, `execution/gethexec/forwarder.go` `L31-L151`.
- Excerpt: HTTP transport pool and sequential backup selection.
- Mechanism: warm connections reduce setup cost; backups follow classified
  failures rather than a blind concurrent hedge.
- Quant insight: several RPC URLs do not imply concurrent delivery; failure
  detection can dominate failover.
- `MEASURE THIS`: cold/warm DNS/connect/TLS/server/accept components;
  primary/backup time-to-accept; direct-sequencer delta; duplicate-hash outcome.
- Caveat: Robinhood documents a direct endpoint, not provider topology. The
  page never submits transactions.

### H04 — Sequencer queue and block assembly

- Source: pinned Nitro, `execution/gethexec/sequencer.go` `L169-L190`,
  `L548-L735`, `L1247-L1439`, `L1445-L1557`.
- Excerpt: `firstAppearance`, channel-backed queue read, and block timer/limits.
- Mechanism: accepted transactions enter a bounded queue; nonce checks can
  defer items; an aggregation window precedes assembly with gas/data caps.
- Quant insight: decompose arrival, queue, assembly, and receipt rather than
  calling the entire interval “RPC latency.”
- `MEASURE THIS`: signed→edge→queue→receipt; occupancy/wait; nonce reject/retry;
  assembly p50/p99; gas/data/exhaustion ratios; active/idle L2 cadence.
- Caveat: Robinhood documents FCFS and no priority-gas auction. Nitro Timeboost
  code is not evidence that Timeboost is enabled.

### H05 — Confidence ladder and reorg handling

- Source: pinned Nitro, `arbnode/inbox_reader.go` `L35-L68`, `L236-L249`,
  `L374-L445`; `arbnode/sync_monitor.go` `L135-L202`.
- Excerpt: `latest`, `safe`, `finalized`, batch, and
  `feedPendingMessageCount` watermarks.
- Mechanism: local feed, batch processing, parent safe head, and finality move
  independently; accumulator mismatch triggers reconciliation.
- Quant insight: journal feed sequence, L2 execution, batch seen/processed, L1
  safe, and L1 finalized separately.
- `MEASURE THIS`: soft→posted→safe→finalized; batch lag; mismatch/reorg count;
  unwind time after a soft reversal.
- Caveat: safe/finalized reader modes trade freshness for assurance.

### H06 — Robinhood-specific UniswapX block clock

- Source: `Uniswap/UniswapX@3f5019cf206bc2b37a47c7653f039914f93ad60d`,
  `src/base/BlockNumberish.sol` `L13-L31` and
  `src/reactors/V3DutchOrderReactor.sol` `L50-L79`; pair with the Robinhood
  deployment playbook.
- Excerpt: `ROBINHOOD_CHAIN_ID` and `_getBlockNumberish` choosing
  `ArbSys.arbBlockNumber()`.
- Mechanism: order decay/exclusivity uses L2 height while EVM `block.number` is
  an estimated parent height.
- Quant insight: offchain builders need the contract's clock or will compute a
  different price/boundary.
- `MEASURE THIS`: RPC height, ArbSys height, EVM `block.number` skew;
  quote→fill delta; decay/exclusivity failures; idle stalls.
- Caveat: confirm current live address and bytecode before deployment claims.

### H07 — Quantified static-clock failure

- Source: `Uniswap/sdks@48dea05c1800598a31005c333c08344e53e2b9c6`,
  `sdks/liquidity-launcher-sdk/src/constants.ts` `L67-L100`,
  `sdks/liquidity-launcher-sdk/src/config/blocks.ts` `L14-L64`, and
  `sdks/uniswapx-sdk/src/builder/V3DutchOrderBuilder.test.ts` `L668-L713`.
- Mechanism: a generic 12-second model can compress a nominal 14-hour
  Robinhood auction to roughly seven minutes; one monorepo uses distinct 100 ms
  and ~250 ms approximations in different contexts.
- Quant insight: cadence is activity-dependent, not a fixed wall clock.
- `MEASURE THIS`: rolling `ΔL2 height / Δwall time`; predicted/realized
  boundaries; idle gaps; static-model error.
- Caveat: 100/250 ms are Uniswap models, not protocol guarantees.

### H08 — RWA report freshness and market status

- Source: `smartcontractkit/data-streams-sdk@24ba34ddd55cab9f8074ef13d79e968c12c00e5c`,
  `go/report/v10/data.go` `L15-L39`, `L81-L110`; pair with Robinhood's Data
  Streams verifier documentation.
- Excerpt: validity, observation, expiry, market status, current/new multiplier,
  activation, and tokenized-price fields.
- Mechanism: signature validity, freshness, expiry, market session, and
  corporate-action state are separate gates.
- Quant insight: a cryptographically valid report may still be stale or not
  tradeable.
- `MEASURE THIS`: observation→receive→decision→submit→verify age; stale/expired/
  closed rejection; schema/feed-ID mismatch; single/bulk verification.
- Caveat: SDK schema is not Robinhood verifier source; match deployed schema.

## 3. Secondary operator notes

| ID | Source | Performance question | Mandatory caveat |
|---|---|---|---|
| `H09` | Nitro `execution/gethexec/tx_pre_checker.go` `L41-L65`, `L139-L254` | Do nonce, fee cap, intrinsic/data gas, balance, or conditional checks on a lagging intermediary cause false-negative submission? Measure node lag at rejection, state age, taxonomy, and independent retry success. | Strictness/filter configuration is undisclosed. |
| `H10` | Nitro `execution/gethexec/blockchain.go` `L34-L117`; `node.go` `L125-L143` | How do trie/database caches, snapshots, retention, state scheme, and indexer threads affect `eth_call`, logs, receipts, I/O stalls, index lag, cache hit, and GC? | Defaults are not recommendations. |
| `H11` | Data Streams SDK `typescript/src/stream/deduplication.ts` `L1-L151`; `typescript/src/stream/connection-manager.ts` `L101-L145`, `L462-L550`, `L590-L650` | How do bounded timestamp dedupe, out-of-order policy, multiple origins, and reconnect affect duplicate/drop counts, origin skew, catch-up, and pong age? | SDK topology is not proof of Robinhood topology. |
| `H12` | `Uniswap/liquidity-launcher@1eda9f0c0243e2fdc0cbe0d665200ffa8c2ba53a`, `src/strategies/lbp/LBPStrategy.sol` `L146-L265`; `Uniswap/blocknumberish@38fe20bc0341d5bc2780d41f90dadb70e10f8cea` `src/BlockNumberish.sol` `L20-L56` | Measure eligibility→migration→pool-readable time, final-auction vs first-pool price, depth, and failure recovery. | Resolve live address/bytecode first. |
| `H13` | `ethereum/ERCs@94c80fab6e0a40f658e947b57f7f0b581cd3f081`, `ERCS/erc-8056.md` `L76-L88`, `L147-L215` | Reconcile raw balance, multiplier, effective time, and historical block timestamp; measure schedule lead time, API/onchain mismatch, and boundary revaluation. | Draft reference, not Robinhood contract source; never multiply an already adjusted onchain price twice. |

## 4. Visible unavailable-source records

Render five locked rows labeled `NOT PUBLIC AT RESEARCH CUTOFF`:

```text
Robinhood sequencer customization / production configuration
Stock Token deployed contract source repository
Stock Token API backend
Data Streams oracle publisher and Robinhood verifier implementation
Compliance and transaction-screening rules
```

Each links to relevant official docs. Absence of public source is not evidence
of absence or behavior.

## 5. Inspector order

1. relationship badge and immutable `owner/repo@short-sha`;
2. path, exact range, language, and copyable permalink;
3. syntax-highlighted excerpt with stable line numbers;
4. `WHAT THE CODE DOES`;
5. `WHY IT MATTERS`;
6. `MEASURE THIS`, with clocks/boundaries and units;
7. `FAILURE MODES`;
8. `DO NOT INFER`; and
9. evidence and license links.

## 6. Editorial and legal gates

- Mechanically extract every excerpt at the recorded commit.
- Keep excerpts minimal; do not reproduce full files.
- Preserve notice metadata and link repository licenses.
- Repositories without confirmed excerpt-compatible licenses stay metadata-only.
- Label code interpretation `Inference from pinned source`; deployment facts
  need separate first-party/deployment evidence.
- Robinhood docs outrank generic Nitro defaults for ordering, finality,
  endpoint behavior, and feature availability.
