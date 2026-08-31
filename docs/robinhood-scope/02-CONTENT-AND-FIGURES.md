# 02 — Content, figures, and authored read-through

## 0. Voice and content rules

The page speaks like an engineering instrument operated by a careful market
structure researcher: vivid enough to remember, exact enough to implement.

- Lead with mechanisms, not marketing adjectives.
- Prefer `orders`, `executes`, `posts`, `finalizes`, and `challenges` over
  ambiguous words such as `confirms` and `secures`.
- When `confirmation` is unavoidable, qualify it as `soft`, `L1-posted`, or
  `Ethereum-final`.
- Use `Robinhood Chain` in full and `Stock Tokens` exactly.
- Use `Ethereum` for the parent/settlement layer and `ETH` for the gas asset.
- Use `first come, first served` on first mention; `FCFS` is allowed only after
  expansion within the same reading surface.
- `Typically`, `about`, and `~` remain visible on documented timing estimates.
- State architectural implications as inference, not measured behavior.
- Never use `trustless`, `decentralized`, `instant`, `MEV-free`, `deep
  liquidity`, or `institutional-grade` without a narrow, source-backed object.
- Partner names identify documented surfaces; they do not confer endorsement.

Each chapter follows the existing formula:

```text
channel tag → memorable heading → 70–120 word thesis → primary figure
→ adjacent readout or second figure → comparator dock → three short cards
```

## 1. Persistent clock bar

The fixed bar replaces Solana's slot counter with a four-clock selector:

```text
SCOPE//ROBINHOOD CHAIN | SOFT <1 s | ━━━━━ sweep | chapter nav
```

The visible clock cycles only on explicit user selection:

| State | Readout | Accent | Meaning |
|---|---|---|---|
| `soft` | `SOFT · <1 s typ.` | Robin Neon | sequencer receipt |
| `posted` | `POSTED · minutes typ.` | cyan | batch included on Ethereum |
| `final` | `FINAL · ~13 min after post` | violet | containing Ethereum block finalized |
| `withdrawal` | `EXIT · ~7 d + L1 claim` | amber | canonical L2→L1 withdrawal process |

Default is `soft`. The control is a real button labeled `Inspect confirmation
clocks`; its menu explains that withdrawal is a separate process. The sweep
duration must not literally animate for 13 minutes or seven days. Use a
normalized one-time trace whose label, not speed, carries the duration.

## 2. Hero

### 2.1 Proposed copy

Kicker:

```text
ENGINEERING READOUT · RESEARCH SNAPSHOT 2026-08-31
```

Heading:

```text
Robinhood Chain,
between two clocks.
```

The phrase is intentionally followed by prose that expands the simplified
headline into four clocks:

> A transaction can feel complete in under a second while its strongest
> guarantee is still minutes away. One Robinhood-operated sequencer fixes the
> accepted order first come, first served; Nitro executes it; compressed data
> descends into Ethereum; and Ethereum makes that order hard. A canonical exit
> waits on a fourth clock. This page follows all four—then compares the same
> race across five other chains.

The copy must termify `sequencer`, `first come, first served`, `Nitro`,
`Ethereum finality`, and `canonical exit`.

### 2.2 Hero trace

Label:

```text
TRACE · ACCEPTANCE TO SETTLEMENT
```

Desktop viewBox: `0 0 1140 260`. Mobile viewBox: `0 0 570 260`, showing one
complete lifecycle rather than shrinking two.

Trace sequence:

```text
SUBMIT ─┐
        ├─ sharp Robin-Neon pulse at SOFT
        ├──────── cyan pulse at POSTED
        └──────────────── violet lock at FINAL

EXIT ───────────────────────────────── detached amber lane · ~7 d + claim
```

The horizontal distances are logarithmically suggestive, not proportional.
The caption must say `CONCEPTUAL LOG TRACE · NOT LIVE TELEMETRY`. The figure's
screen-reader description states all four labels and timings.

Animation, if allowed:

1. one signed-transaction dot enters;
2. the soft node pulses immediately;
3. a compressed batch packet travels toward the Ethereum lane;
4. posted and final nodes activate in sequence using a normalized 2.4-second
   teaching timeline; and
5. the exit lane appears without completing an artificial seven-day sweep.

No loop is required. Replay is explicit.

### 2.3 Hero readouts

| Display | Label | Source policy |
|---|---|---|
| `4663` | MAINNET CHAIN ID | configuration/connect docs |
| `<1 s` | SOFT CONFIRMATION · TYPICAL | finality docs |
| `~13 min` | ETHEREUM FINALITY · AFTER POST | finality docs |
| `~7 d` | CANONICAL WITHDRAWAL · PLUS CLAIM | bridge docs |

Do not use a blocks-per-second, TPS, TVL, volume, address count, customer count,
or brokerage statistic in the hero.

## 3. CH-01 · Topology

### 3.1 Header and thesis

Tag:

```text
CH-01 · TOPOLOGY
```

Heading:

```text
One sequencer, several control planes
```

Proposed thesis:

> “Permissionless” describes who may use Robinhood Chain and deploy contracts;
> it does not turn every part of the system into one open committee. A single
> Robinhood-operated sequencer orders accepted transactions by arrival. Nitro
> full nodes can replay the result. A currently allowlisted BoLD validator set
> can challenge invalid state assertions. Ethereum carries the data and final
> settlement, while an eight-seat Security Council controls upgrades. The
> topology is a stack of different authorities, not one validator cloud.

### 3.2 FIG 1.1 — Rollup stack

Panel label:

```text
FIG 1.1 · ORDERING, VERIFICATION, DISPUTE, SETTLEMENT, GOVERNANCE
```

Desktop viewBox: `0 0 900 520`. Mobile gets a vertical `0 0 390 880` variant.

Required nodes:

```text
WALLETS / SMART ACCOUNTS
            ↓ signed tx / UserOperation
PUBLIC + MANAGED RPCS
            ↓
ROBINHOOD-OPERATED SEQUENCER
  FCFS ARRIVAL · SCREENING · SOFT RECEIPT
            ↓ ordered L2 feed
NITRO FULL NODES / ARBOS EXECUTION
       ↙                       ↘
BOLD VALIDATOR A       BOLD VALIDATOR B
  OFFCHAIN LABS              ALCHEMY
            ↓ assertion / challenge path
ETHEREUM BLOBS + INBOX + SETTLEMENT

SECURITY COUNCIL ────────────────┐
8 seats · routine 6/8 + 7 d      ├─ upgrade control
emergency 7/8                     ┘
```

Visual semantics:

- a solid Robin-Neon line means fast L2 order flow;
- a cyan dashed line means batch/data publication;
- a red side line means dispute/challenge capability;
- a violet baseline means Ethereum settlement; and
- an amber bracket means governance authority.

Do not draw the two validators as block producers. Do not draw the Security
Council on the transaction data path. Do not imply that all full nodes can
currently initiate a BoLD challenge.

One-time motion phases:

1. three users converge on one sequencer;
2. one ordered lane fans to full nodes;
3. a batch descends to Ethereum;
4. validator challenge paths illuminate; and
5. the governance bracket appears last, explicitly outside ordinary flow.

Static fallback is the same labeled topology with every lane visible.

### 3.3 Readout — network constants

| Label | Display copy |
|---|---|
| ORDERING | `ONE ROBINHOOD-OPERATED SEQUENCER · FCFS BY ARRIVAL` |
| EXECUTION | `ARBITRUM NITRO / ARBOS · EVM-COMPATIBLE` |
| DATA | `COMPRESSED BATCHES · ETHEREUM BLOBS` |
| DISPUTES | `BOLD · 2 ALLOWLISTED VALIDATORS · AS OF 2026-08-31` |
| GOVERNANCE | `8 SEATS · ROUTINE 6/8 + 7-DAY TIMELOCK · EMERGENCY 7/8` |
| NODE FLOOR | `8+ CORES · 64 GB RAM · NVME · L1 EXECUTION + BEACON` |

Every volatile row opens its source Hoverdoc and checked date.

### 3.4 Comparator and cards

Place the topology comparator dock immediately after the split figure/readout.
Default opened comparator in the guided read is Solana because “scheduled
rotating leader vs single fixed operator” is the sharpest contrast.

Cards:

1. `ROLE / ORDERER — Sequencer`: accepts, screens, orders, executes, and emits
   the first receipt; no uptime guarantee.
2. `ROLE / VERIFIER — Full node`: consumes feed/batches, replays state, serves
   reads; requires Ethereum execution and beacon/blob access.
3. `ROLE / CHALLENGER + GOVERNOR`: allowlisted BoLD validators challenge state;
   the Security Council separately changes protocol configuration.

## 4. CH-02 · Transaction flow

### 4.1 Header and thesis

Tag:

```text
CH-02 · SIGNAL PATH
```

Heading:

```text
A receipt is not a settlement
```

Proposed thesis:

> A Robinhood Chain transaction begins like an Ethereum transaction and ends
> on two ledgers. An EOA signs for chain 4663—or a smart account submits a
> UserOperation—then an RPC carries it to the sequencer. Arrival fixes its
> place. Nitro executes the ordered EVM lane and returns a soft receipt. Later,
> compressed batch data reaches Ethereum, and later still that Ethereum block
> finalizes. Applications choose which of those boundaries is sufficient for
> each action; the chain does not make the risk decision for them.

### 4.2 FIG 2.1 — Signal path

Panel label:

```text
FIG 2.1 · SIGNED INTENT → SOFT RECEIPT → ETHEREUM FINALITY
```

Desktop stages, left to right:

1. `EOA / SMART ACCOUNT` — sign EIP-155 transaction or construct UserOperation;
2. `RPC / BUNDLER` — transport, optional sponsorship/policy;
3. `SEQUENCER` — screening + FCFS arrival order;
4. `ARBOS / EVM` — sequential state transition; atomic internal calls;
5. `SOFT` — receipt returned to application;
6. `BATCH / COMPRESS` — L1 data cost and blob payload;
7. `POSTED` — Ethereum Inbox records the batch;
8. `FINAL` — containing Ethereum block finalizes.

The figure includes two branches:

- an `ERC-4337` branch from smart account to bundler/paymaster and back into
  the same sequencer path; and
- an `L1 DELAYED INBOX` branch shown as `SLOW FALLBACK · PARAMETERS VERIFY`
  rather than a normal submission path.

Mobile is a true vertical pipeline (`0 0 390 1120`), not a horizontal scroller.
Soft receipt branches right at the execution stage; batch/finality continues
down. The separation must be visible without motion.

Packet animation pauses at each stage, flashes the soft branch, then continues
to posted/final. A deliberately higher-fee packet that arrives second must
remain behind an earlier packet in the sequencer inset.

### 4.3 Engineering readout

Use a five-row `EVM DIFFERENCES` panel:

| Signal | Teaching copy |
|---|---|
| BLOCK NUMBER | `block.number ≈ Ethereum estimate · ArbSys.arbBlockNumber() = L2 height` |
| RANDOMNESS | `prevrandao / difficulty is constant · use a dedicated source` |
| FEES | `L2 execution + compressed L1 data share` |
| L1 CALLER | `L1 contract addresses are aliased on L2` |
| CODE SIZE | `96 KB runtime · 192 KB init · portability still matters` |

Cards after comparator:

1. `REPLAY — nonce + chain ID`: EVM replay protection; application deadlines
   are separate.
2. `ATOMICITY — one transaction`: multicall/internal calls can be atomic;
   separately submitted transactions are not a bundle.
3. `ACCOUNT ABSTRACTION — service stack`: batching, sponsorship, and session
   keys add bundler/paymaster/policy dependencies.

Default guided comparator: Ethereum, because it shares EVM semantics while
splitting order/execution from parent settlement differently.

## 5. CH-03 · MEV and order flow

### 5.1 Header and thesis

Tag:

```text
CH-03 · ORDER FLOW
```

Heading:

```text
MEV after the gas auction
```

Proposed thesis:

> Robinhood Chain removes one familiar auction: paying more gas does not let a
> later transaction jump an earlier arrival. It does not remove the value of
> position. The edge moves into transport latency, provider topology, private
> intent, solver selection, and the first safe reaction to a state or oracle
> update. Public AMMs expose different information than RFQ or intent routes;
> a propAMM or order book adds another visibility and inventory model. The
> question is no longer only “what did you bid?” but “who saw it, and when did
> it reach the sequencer?”

### 5.2 FIG 3.1 — FCFS race

Panel label:

```text
FIG 3.1 · ARRIVAL, NOT GAS PRICE, FIXES POSITION
```

Diagram:

```text
TX A · 0.10 gwei · route 18 ms ──────────┐ arrival 01
TX B · 5.00 gwei · route 42 ms ──────────┼ arrival 03
TX C · 0.10 gwei · route 27 ms ──────────┘ arrival 02
                                           ↓
                                FCFS SEQUENCER QUEUE
                                  A → C → B
```

Gas values are illustrative labels, not current fee observations. The caption
says `ILLUSTRATIVE ROUTE LATENCY · NOT A PROVIDER BENCHMARK`.

Animation runs once and makes B visibly arrive last despite the largest fee.
Reduced motion shows final routes and queue order immediately. The figure must
not suggest that the official public endpoint or a named provider is the
fastest path.

### 5.3 FIG 3.2 — Visibility map

Panel label:

```text
FIG 3.2 · WHAT BECOMES VISIBLE BEFORE SETTLEMENT
```

Four equal lanes with no vendor logos:

| Lane | Before fill | At/after fill | Primary risk labels |
|---|---|---|---|
| Public AMM | calldata may reveal path, limits, and intent at submission surfaces | swap and state change public | leaked/public intent, slippage, JIT, sandwich/backrun |
| RFQ / intents | quote competition and intent may remain offchain | signed fill settles onchain | maker/solver availability, rejection, route/spender policy |
| PropAMM | pricing logic/inventory managed by operator; exact pre-trade view product-specific | onchain composable fill | model/operator/inventory dependency |
| Order book | visible/cancelable limit liquidity according to venue rules | matched settlement | cancellation race, maker concentration, venue-specific ordering |

An `OBSERVERS` rail names only roles: user, RPC, sequencer, solver/maker,
contract, public node. Use `may see` labels; never imply access without a
source.

### 5.4 Comparator and cards

Default guided comparator: Solana. Both systems make sub-second ordering
economically meaningful, but one rotates scheduled leaders and has an explicit
bundle/tip market while the other documents FCFS at a single operator.

Cards:

1. `NO PRIORITY GAS AUCTION`: an explicit documented absence; execution/data
   fees remain.
2. `NO CANONICAL PUBLIC MEMPOOL DOCUMENTED`: an evidence boundary, not a
   privacy guarantee.
3. `PROTECTION IS A ROUTE`: limit price, slippage/deadline, RFQ/intent, trusted
   submission, oracle/sequencer checks; no official protection RPC documented.

## 6. CH-04 · Latency

### 6.1 Header and thesis

Tag:

```text
CH-04 · LATENCY
```

Heading:

```text
Four clocks, one user action
```

Proposed thesis:

> “Latency” changes meaning at every boundary. A market report can reach a bot
> in sub-second time. A transaction can receive a sequencer receipt in the same
> order of magnitude. An indexer may lag both. Ethereum posting arrives in
> minutes; Ethereum finality follows about thirteen minutes later; a canonical
> withdrawal takes roughly seven days and a final L1 claim. Product safety
> comes from naming the clock used for each decision, not from choosing the
> smallest number on the page.

### 6.2 FIG 4.1 — Four-clock ladder

Panel label:

```text
FIG 4.1 · OBSERVATION TO EXIT · CONCEPTUAL LOG SCALE
```

Ladder points:

```text
<1 ms       local decode / in-process decision             illustrative
1–100 ms    network/provider path                           measured per operator
<1 s        sequencer soft confirmation                     documented typical
sub-second  Chainlink Data Streams delivery                 product claim; verify
seconds+    ordinary indexer/API visibility                 provider-specific
minutes     batch posted to Ethereum                        documented typical
~13 min     Ethereum finality after posting                 documented typical
~7 days     canonical withdrawal challenge + L1 claim       documented typical
```

Only Robinhood-documented protocol timings receive the Robin Neon main trace.
Illustrative/operator-specific rows use neutral gray and state their status.

The visual has two vertical rails:

- `EXECUTION RAIL`: data → decision → RPC → soft receipt → index visibility;
- `SETTLEMENT RAIL`: batch post → Ethereum finality → optional canonical exit.

A connector at soft receipt says `APPLICATION POLICY CHOOSES WHEN TO ACT`.

### 6.3 Field notes panel

Label:

```text
FIELD NOTES · WHAT LOW-LATENCY CORRECTNESS LOOKS LIKE
```

Rows:

- `PERSISTENT PATHS`: reuse connections and measure each provider/region;
- `MONOTONIC CLOCKS`: timestamp market input, decision, send, receipt, feed,
  index, L1 post, and L1 final separately;
- `GAP RECOVERY`: sequence/hash continuity, HTTP backfill, duplicate and parent
  mismatch handling;
- `REDUNDANCY`: provider diversity improves transport, not sequencer
  decentralization;
- `ORACLE GUARDS`: heartbeat, staleness, sequencer status, recovery grace,
  corporate-action pause, and 24/5 session;
- `TAILS`: report p50/p95/p99 and failures, not one average; and
- `IRREVERSIBLE ACTIONS`: explicitly require soft, posted, or final evidence by
  value at risk.

Default guided comparator: BNB Chain, because both advertise sub-second local
cadence while their consensus/control and settlement guarantees differ.

Cards:

1. `SOFT STATE`: fast, useful, and sequencer-dependent.
2. `DURABLE EVIDENCE`: L1-posted and L1-final are separately observable.
3. `MARKET SESSION`: 24/5 Stock Token feeds on a continuously transferable
   asset require closed-market policy.

## 7. CH-05 · Cross-chain bench

### 7.1 Header and thesis

Tag:

```text
CH-05 · BENCH
```

Heading:

```text
Same game, different ordering rules
```

Proposed thesis:

> Arbitrage, backruns, liquidations, and launch races do not disappear when a
> chain changes its consensus or hides a mempool. They change shape. Solana
> sells bundle position around scheduled leaders. Ethereum routes value through
> builders and proposers. Bitcoin auctions bytes. Zcash hides the graph.
> Robinhood Chain supplies the useful counterexample: its sequencer does not
> sell position through priority gas, so arrival latency becomes the bid. The
> bench compares capabilities and tools—not profitability, safety, or rank.

### 7.2 FIG 5.1 — Technique grid

Keep the existing eight techniques:

1. atomic arbitrage;
2. sandwiching;
3. liquidations;
4. backrunning;
5. JIT liquidity;
6. CEX–DEX arbitrage;
7. spam/probabilistic racing; and
8. mint/launch sniping.

Column order:

```text
ROBINHOOD CHAIN | SOL | ETH | BNB | BTC | ZEC
```

The baseline column is sticky and uses the full accessible name. At small
widths the visual cell may show `BASE`, but the column header and accessible
name remain `Robinhood Chain`; never render an unofficial short name.

Cell vocabulary remains `hot / active / limited / none`, with these rules:

- `hot` requires a dated activity dataset and exact method;
- `active` means architecture plus a current production surface supports the
  technique, not that it is common or profitable;
- `limited` means protocol/visibility/application constraints materially narrow
  it; and
- `none` requires a protocol-level incompatibility, while missing evidence is
  `NOT MEASURED` in the detail card rather than a fabricated zero.

Grid selection opens a sourced explanation and linked tool/entity. The full
matrix is specified in `03-CROSS-CHAIN-COMPARISON.md`.

### 7.3 FIG 5.2 — Tool bench

Functions, in order:

1. Ordering / sequencing;
2. Protection RPC / private submission;
3. Order-flow auction / intents;
4. Fast data feed;
5. Priority / fee market;
6. Node / client edge; and
7. Launch & bootstrap.

The wording `Ordering / sequencing` is mandatory because FCFS, miner
accelerators, Jito bundles, and proposer-builder markets are not the same kind
of auction.

Robinhood-first cards:

| Function | Primary entry | Required distinction |
|---|---|---|
| Ordering / sequencing | Robinhood Chain FCFS sequencer | operator, screening, arrival order, soft receipt |
| Protection | `NO OFFICIAL PROTECTION RPC DOCUMENTED` | absence state, not a vendor gap score |
| Order-flow / intents | UniswapX · 0x RFQ · 1inch Fusion · LI.FI | exact route/product support and maker/solver dependencies |
| Fast data | sequencer feed · managed WebSockets · Chainlink Data Streams | ordered-state feed vs market-data feed |
| Fee market | ETH execution + L1 data; no priority queue | cost is not position |
| Node/client | Nitro full node · ArbOS · L1 blob reader | L1 execution + beacon dependencies |
| Launch/bootstrap | Uniswap Liquidity Launcher / public pool surfaces | resolve current deployment; auction vs instant pool |

The existing verified 17-category Robinhood Chain tool landscape remains a
separate deep route. The CH-05 bench is a teaching subset organized by market
function, not a duplicate inventory.

## 8. Footer/methodology content

Visible closing statement:

> The fast number is not the whole guarantee. Every figure is a sourced model,
> not live telemetry; volatile values are dated; documented integrations are
> not endorsements or liquidity claims. Open Methodology for evidence grades,
> refresh dates, unknowns, and exact source mappings.

Required footer links:

- `METHODOLOGY` → `#/methodology`;
- `SOURCE LEDGER` → `#/sources`;
- `ROBINHOOD CHAIN ARTICLES` → `#/c/robinhood-chain`;
- `VERIFIED ROBINHOOD CHAIN TOOLS` → `#/tools/robinhood-chain`;
- `ALL CHAIN PATHS` → `#/chains`; and
- direct link to official Robinhood Chain documentation.

The independent-project notice follows immediately, without low-contrast or
collapsed treatment.

## 9. Authored read-through — 26 cues

| # | ID | Anchor/action | Author note |
|---:|---|---|---|
| 1 | `hero-trace` | hero SVG · restart | “The first pulse is useful before it is final.” |
| 2 | `hero-clocks` | hero stats | “Four clocks; only three belong to transaction finality.” |
| 3 | `ch1-thesis` | CH-01 intro | “Permissionless users do not imply permissionless control planes.” |
| 4 | `ch1-stack` | FIG 1.1 · restart | “Ordering, replay, challenge, settlement, and upgrades are different jobs.” |
| 5 | `ch1-orderer` | sequencer node · spotlight | “One operator fixes accepted order by arrival.” |
| 6 | `ch1-ethereum` | Ethereum lane · spotlight | “The hardest guarantee arrives from the parent.” |
| 7 | `ch1-compare-sol` | topology dock · `open-dock:sol` | “Rotating leaders versus one fixed sequencer.” |
| 8 | `ch2-thesis` | CH-02 intro | “A receipt is an application boundary, not a universal settlement boundary.” |
| 9 | `ch2-pipeline` | FIG 2.1 · restart | “Follow the packet past the point where the wallet spinner stops.” |
| 10 | `ch2-aa` | ERC-4337 branch | “Better UX adds bundler, paymaster, and policy dependencies.” |
| 11 | `ch2-soft` | soft branch | “Soft is fast and explicitly sequencer-backed.” |
| 12 | `ch2-compare-eth` | tx dock · `open-dock:eth` | “Same EVM language; different path to hard settlement.” |
| 13 | `ch3-thesis` | CH-03 intro | “Removing a gas auction moves the bid into arrival.” |
| 14 | `ch3-fcfs` | FIG 3.1 · restart | “The high-fee packet still loses when it arrives last.” |
| 15 | `ch3-visibility` | FIG 3.2 · cascade | “Public AMM, RFQ, propAMM, and book expose different pre-trade surfaces.” |
| 16 | `ch3-absence` | evidence cards | “Not documented is a boundary—not proof of privacy.” |
| 17 | `ch3-compare-sol` | MEV dock · `open-dock:sol` | “Solana prices bundle position; Robinhood Chain documents FCFS.” |
| 18 | `ch4-thesis` | CH-04 intro | “Every boundary needs its own timestamp.” |
| 19 | `ch4-ladder` | FIG 4.1 · restart | “The user action crosses nine orders of magnitude.” |
| 20 | `ch4-soft-post-final` | three settlement markers | “Soft, posted, and final are not synonyms.” |
| 21 | `ch4-exit` | withdrawal marker | “Seven days is an exit mechanism, not a block-finality claim.” |
| 22 | `ch4-compare-bnb` | latency dock · `open-dock:bnb` | “Similar local cadence can sit on very different guarantees.” |
| 23 | `ch5-thesis` | CH-05 intro | “Economic techniques survive; their rails change.” |
| 24 | `ch5-grid` | grid · cascade to Robinhood launch cell | “A fixed first fill is a network race; an auction distributes first.” |
| 25 | `ch5-bench` | bench · filter baseline | “Separate ordering data from market data, and cost from position.” |
| 26 | `methodology` | footer/methodology | “Every volatile fact carries a source, date, and reason to refresh.” |

Cues with missing anchors are dropped safely, but the audit must fail in
development. The public player uses the same stop conditions as the existing
Solana read-through: wheel, touch move, keyboard scroll, document hidden, or
focus entering an outside interactive control pauses playback.

## 10. Figure-wide requirements

Every figure has:

- an authored `FIG n.n` label;
- a plain-language `<figcaption>` that distinguishes protocol fact,
  illustrative timing, and inference;
- a complete `role="img"` accessible name or an adjacent structured
  description referenced with `aria-describedby`;
- static end state present before animation starts;
- explicit replay, never an essential infinite loop;
- an equivalent semantic table/list in the no-JavaScript section;
- no vendor or official mark embedded in generated SVG art;
- a checked-date source door for each volatile label; and
- mobile art that is redrawn/cropped for legibility rather than uniformly
  shrunk.

Animation may show sequence, state, or causality. It may not manufacture
throughput, geographic topology, queue behavior, partner relationships, live
health, or finality evidence.

