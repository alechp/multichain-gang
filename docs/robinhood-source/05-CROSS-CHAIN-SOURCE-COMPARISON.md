# 05 — Cross-chain source comparison

> **Systems:** Robinhood, Solana, Bitcoin, Ethereum, BNB Chain, Zcash  
> **Rule:** compare source mechanisms and measurement consequences, never rank

## 1. Comparison repository pins

Robinhood remains fixed to the public Nitro build pin from `01`. Other systems
use official maintained client repositories at immutable research-cutoff SHAs:

| System | Repository | Commit | Role |
|---|---|---|---|
| Robinhood | [`OffchainLabs/nitro`](https://github.com/OffchainLabs/nitro/tree/3599acae1ad2fab4059fc46453c9cd3294126641) | `3599acae1ad2fab4059fc46453c9cd3294126641` | Robinhood-documented public node build; fixed baseline |
| Solana | [`anza-xyz/agave`](https://github.com/anza-xyz/agave/tree/e9a73cd39f5da553a4693fd14914a8b5a34fec63) | `e9a73cd39f5da553a4693fd14914a8b5a34fec63` | official maintained validator client |
| Bitcoin | [`bitcoin/bitcoin`](https://github.com/bitcoin/bitcoin/tree/dc0395c5858a1d55239b82a834e5075cf2069219) | `dc0395c5858a1d55239b82a834e5075cf2069219` | Bitcoin Core |
| Ethereum | [`ethereum/go-ethereum`](https://github.com/ethereum/go-ethereum/tree/64006a1e1c6281ad570d80129493d602fe081407) | `64006a1e1c6281ad570d80129493d602fe081407` | Geth execution client |
| BNB Chain | [`bnb-chain/bsc`](https://github.com/bnb-chain/bsc/tree/c5533ab5b7244dc474add10740834417a2c605d7) | `c5533ab5b7244dc474add10740834417a2c605d7` | BSC execution/consensus client |
| Zcash | [`zcash/zcash`](https://github.com/zcash/zcash/tree/558f686599586f55def3db86955d74d3be44605e) | `558f686599586f55def3db86955d74d3be44605e` | zcashd reference client |

These are comparison-only records. Do not ingest their full trees into the
Robinhood explorer. The refresh job validates exact path existence at each SHA
and records license/commit metadata before release.

## 2. Five normalized axes

| Axis ID | Normalized question | Required measurement consequence |
|---|---|---|
| `ingress-ordering` | Where does a candidate transaction enter, wait, get ordered, rejected, replaced, or deferred? | Divide client signing, transport, admission, queue/mempool, construction, and observation. |
| `fast-propagation` | Which fast path carries pending or soft information, and how are gaps, duplicates, and peers/origins handled? | Track source identity, sequence/inventory continuity, receive/validate/insert timestamps, and recovery. |
| `execution-contention` | How is work scheduled against shared state, dependencies, nonce/order constraints, or conflicts? | Measure queue dependency, retry/replay, lock/state contention, and construction saturation. |
| `fee-data-cost` | Which bytes/resources influence admission and total execution/data cost? | Record encoded size/compressibility, declared resource limits, realized units, and fee components. |
| `assurance-reorg` | Which local states can reverse, and how does the client promote them toward confidence/finality? | Persist named assurance stages and rollback/reconciliation events; do not use one confirmation field. |

## 3. Source-path matrix

Path families are discovery anchors, not excerpt approval. The implementation
must resolve exact files at the pinned SHA and mark an unavailable analogy
`not-analogous` rather than forcing a match.

| System | Ingress / ordering | Fast propagation | Execution / contention | Fee / data cost | Assurance / reorg |
|---|---|---|---|---|---|
| Robinhood | `execution/gethexec/{forwarder,sequencer,tx_pre_checker}.go` | `broadcastclient/`, `broadcastclients/`, `arbnode/transaction_streamer.go` | `sequencer.go`, OffchainLabs geth execution/state paths | `arbos/l1pricing/l1pricing.go`, gas/data limit paths | `arbnode/{inbox_reader,sync_monitor,transaction_streamer}.go`, `util/headerreader/` |
| Solana | `core/src/banking_stage/`, send-transaction service | Turbine/retransmit, gossip, TPU/QUIC paths | banking stage, scheduler, account-locking/execution paths | compute budget, prioritization fee, packet/transaction size paths | fork choice, replay stage, commitment/root paths |
| Bitcoin | mempool admission/policy and validation interface | `src/net_processing.cpp`, inventory/compact-block relay | validation/mempool dependency and script-validation queues | feerate, weight, ancestor/descendant policy | chainstate activation, validation, block index/reorg paths |
| Ethereum | `core/txpool/` admission and replacement | `eth/fetcher/tx_fetcher.go`, peer transaction broadcast | block/state processor and transaction application | intrinsic gas, EIP-1559 fee, blob/data accounting | `core/blockchain.go`, fork choice and safe/finalized head handling |
| BNB Chain | inherited/custom `core/txpool/` | transaction fetcher/peer propagation | `consensus/parlia/`, execution and producer paths | inherited gas/fee plus BSC-specific policy paths | Parlia snapshot/finality and blockchain reorg paths |
| Zcash | mempool admission and policy | `src/net_processing.cpp`, inventory relay | validation/script checks and shielded proof verification queues | conventional/ZIP fee and transaction-size/action accounting | chain activation, validation, block index/reorg paths |

## 4. Authored axis content

Each axis needs one concise comparative statement per system with four fields:

```ts
interface ComparisonCell {
  systemId: "robinhood" | "solana" | "bitcoin" | "ethereum" | "bnb" | "zcash";
  axisId: string;
  analogy: "direct" | "partial" | "not-analogous" | "not-documented";
  mechanism: string;
  repositoryId: string;
  commit: string;
  paths: { path: string; lineRange?: string; permalink: string }[];
  measure: string[];
  caveat: string;
  checkedAt: string;
}
```

Cross-chain prose must distinguish protocol design, a particular client's
implementation, deployed network configuration, and provider behavior. Use
“in this client at this revision” for source observations.

## 5. Axis-specific editorial guidance

### 5.1 Ingress and ordering

Do not flatten a sequencer queue, leader pipeline, public mempool, validator
transaction pool, and miner template into “the mempool.” Compare visibility,
admission/replacement, explicit ordering keys, construction ownership, and
which timestamp an operator can observe. For Robinhood, lead with documented
FCFS sequencer arrival and show Nitro queue code only as the pinned build path.

### 5.2 Fast propagation

Compare Robinhood's ordered feed sequence with peer/inventory, leader/TPU, or
gossip paths without calling them equivalent. Required fields: source count,
ordering identifier, duplicate key, validation before insertion, gap recovery,
and whether the state is executable, merely pending, or soft.

### 5.3 Execution and contention

Compare nonce/deferred queues and serial state transitions with Solana account
conflict scheduling and validation-worker pipelines. Identify the actual
bottleneck named by source—queue, account lock, script/proof work, gas/data
limit, or producer deadline. A missing parallel scheduler is not a defect.

### 5.4 Fee and data cost

Show non-fungible resource models rather than one “fee” column: Robinhood L2
execution plus compressed L1 data estimate; Solana compute/priority/resource
limits; Bitcoin/Zcash size/weight/action policy; Ethereum gas/base fee/blob
components; BSC inherited gas plus current client policy. Do not publish a
live-cost number from source code.

### 5.5 Assurance and reorg

Use each system's own named states. Do not translate everything into block
counts. Robinhood must show soft feed, posted batch, parent safe, and finalized;
other systems show the specific client concepts supported by pinned code and
primary protocol documentation. State what can reverse and what triggers
rollback.

## 6. Interaction contract

- Matrix is the default semantic table.
- Selecting an axis routes to `#/compare/<axis-id>`.
- Robinhood remains the left baseline; a system selector controls the right.
- Each side shows mechanism, source path(s), measurement implication, analogy
  state, and caveat.
- `OPEN SOURCE` links to immutable commits.
- A `NOT ANALOGOUS` cell includes an explanation, never an empty dash.
- Switching systems retains the axis and focus.
- Mobile renders one axis as stacked definition lists with Robinhood repeated
  before each counterpart; the semantic table remains available.

## 7. Forbidden comparison patterns

- No “fastest,” “best,” “most decentralized,” “safest,” or score/rank.
- No direct TPS, block-time, or finality-number comparison without definitions,
  activity conditions, and first-party evidence.
- No inference that a repository default is production configuration.
- No claim that similar filenames imply similar topology or trust.
- No stale copy of facts already normalized in
  `docs/robinhood-scope/03-CROSS-CHAIN-COMPARISON.md`; source cells link to or
  transform that reviewed fact set rather than contradict it.

## 8. Acceptance criteria

- Exactly six systems and five axes are present.
- Every non-`not-analogous` cell has an immutable official-repository link.
- All paths exist at the recorded commit and pass the validator.
- Robinhood is visibly fixed as baseline.
- Every cell has a measurement consequence and caveat.
- Keyboard, mobile, and static table representations convey the same content.
- No score, recommendation, or universal performance claim appears.
