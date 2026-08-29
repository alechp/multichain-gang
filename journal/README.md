# Scope Journal

Scope Journal is a local, read-only store and workbench for public Solana and
Robinhood Chain observations. It includes parallel Solana and EVM SQLite data
planes, fixture-driven tests, public-data source adapters, deterministic
collection/backfill commands, paper-only historical simulators,
journal/export tools, normalized cross-chain views, and a local web bench.

It deliberately has no wallet-key, instruction-building, signing, or network
submission capability. Runtime state lives under `data/` and is ignored by
Git.

## Requirements

- Bun 1.3 or newer (the workspace runtime is pinned in `package.json`)
- No external package dependencies

## Configure and migrate

Defaults and three public seed addresses are checked into
`journal.config.json`. Copy `.env.example` to `.env` only when local overrides
are needed. Environment variables take precedence over the JSON file.

```sh
bun run migrate
bun test
```

`bun run migrate` creates the configured database, applies every numbered SQL
migration transactionally, and idempotently seeds the configured watchlist.
It is safe to run repeatedly. To use another config file, set
`JOURNAL_CONFIG`; to change only the database location, set
`JOURNAL_DB_PATH`.

The store uses SQLite WAL mode, foreign keys, and indexed time-series tables.
For analysis beyond local SQLite workloads, the intended future escape hatch
is an explicit export to Parquet for DuckDB rather than an ORM or database
extension.

Migration `0003-evm-observation.sql` is append-only. It leaves all Solana
tables and APIs intact and adds `networks`, `evm_addresses`, `evm_blocks`,
`evm_txs`, `evm_logs`, `evm_finality`, `evm_balances`, and typed
`evm_observations`. EVM uint256 quantities are validated and stored as decimal
text, then returned as TypeScript `bigint`; they are never routed through a
JavaScript `number`. The normalized views are:

- `v_activity` — UTC activity with textual `slot:N` or `block:N` positions;
- `v_fees` — raw native-unit fees without unsafe cross-unit arithmetic;
- `v_balances` — raw amount plus explicit decimals; and
- `v_latency` — independently nullable RPC, soft, index, L1-post, and L1-final
  measurements.

`chain_position` is a display cursor, not a sortable cross-chain clock. Sort
cross-chain series by UTC time and retain the source network/finality fields.

## Collect and backfill

The primary source is Solana JSON-RPC. Its adapter batches balance reads,
limits transaction fetch concurrency to four, and backs off after throttling
or server errors. An optional Solscan API token enables account-data fallback;
Jito's public tip-floor feed supplies venue metrics.

```sh
# Deterministic, socket-free smoke against the checked-in golden fixture
JOURNAL_DB_PATH=/tmp/scope-journal.db \
  bun run collect -- --once --fixtures test/fixtures/collector.json

# Public read-only collection using journal.config.json/.env
bun run collect -- --once
bun run collect -- --watch
bun run backfill -- <address> --limit 1000
```

Every address batch writes observations and advances its cursor in one SQLite
transaction. Raw public transaction responses are deduplicated under
`data/cache/txs/`. Watch mode adds jitter, handles Ctrl-C, and holds
`data/collect.lock` so only one process owns a cursor at a time.

HTML fallback is a separate last-resort adapter and remains inert unless
`SCRAPE_OK=1`. When enabled it checks `robots.txt`, identifies itself, limits
all requests to one per two seconds per host, caches responses for 24 hours,
and opens a 30-minute circuit after refusal, throttling, or server failure.
Site terms still apply; opt in only after confirming the intended use is
permitted.

## Observe Robinhood Chain

Robinhood Chain is configured as chain ID `4663` and uses ETH as its native
asset. The checked-in default is the rate-limited public HTTP RPC, suitable for
manual smoke reads and deterministic fixture tests—not production watch load.
Set `ROBINHOOD_CHAIN_RPC_URL` to a managed provider or local Nitro node before
continuous collection. `ROBINHOOD_CHAIN_WS_URL` is optional configuration for
a standard provider `newHeads` wake-up feed; feed events only trigger HTTP
reconciliation and never establish canonical state or L1 finality.
Set comma-separated `ROBINHOOD_CHAIN_COMPARISON_RPC_URLS` to independently
measure provider head/latency span; URL credentials and paths are never copied
into observation rows.
The CLI also caps each public-RPC cycle to one block to avoid a receipt burst;
configured provider/node cycles use `maxBlocksPerCycle`.

```sh
# Add a public address. Lowercase is the storage key; EIP-55 is display-only.
bun run journal -- evm-watch add 0x1111111111111111111111111111111111111111 \
  --label "fixture observer"
bun run journal -- evm-watch ls

# Deterministic, socket-free three-block fixture.
JOURNAL_DB_PATH=/tmp/scope-robinhood.db \
  bun run evm:collect -- --once --fixtures test/fixtures/robinhood-chain.json

# Public/provider read-only collection and bounded historical replay.
bun run evm:collect -- --once
bun run evm:collect -- --watch
bun run evm:backfill -- --from 48750000 --to 48751000
bun run journal -- evm-show
bun run journal -- cross-show
```

Each block, its receipts/logs/balances/observations, and its cursor commit in
one transaction. Restarting is gap-free and idempotent. A parent-hash mismatch
searches backward to a bounded common ancestor (64 blocks by default), marks
orphaned logs removed, rewinds dependent rows, and replays through HTTP. Log
queries use bounded ranges and split adaptively when a provider rejects a
range. Same-second block timestamps remain separate samples and may produce a
real `block.interval_ms = 0` observation.

Health collection records `rpc.latency_ms`, provider `head.lag_blocks` and
`head.lag_ms`, `block.interval_ms`, transaction count, gas used, and watched
ETH balances. Receipt timing is never inferred from block timestamps: the
read-only journal has no local submission telemetry, so `receipt.soft_ms`
remains absent unless an external observation source explicitly supplies it.

### Three finality stages

HTTP block collection records only `soft`, backed by the observed block hash.
`l1-posted` and `l1-final` require explicit L1 evidence through the typed
finality observation surface. The journal never promotes a WebSocket event,
sequencer-feed item, explorer row, or elapsed timer into a hard-finality stage.
Canonical bridge withdrawal state is a separate bridge observation and must
not be labeled transaction finality.

The typed read-only observers also support:

- Chainlink-style oracle age, advisory `oraclePaused()` state, sequencer
  uptime/grace evidence, and ERC-8056 `uiMultiplier()` reads at an explicit
  block;
- pool depth at 1%/2%, spread, and realized-slippage samples with method
  evidence; and
- bridge deposit age and withdrawal-stage samples.

Pool and bridge measurements must come from an independently documented quote
or L1 evidence adapter. Their recorders do not construct state-changing calls,
orders, transactions, or launch actions. Robinhood Stock Tokens require
canonical registry addresses, multiplier-aware units, feed-session controls,
and jurisdiction checks; an arbitrary ERC-20 must never be labeled a Stock
Token.

## Work at the bench

```sh
bun run journal -- watch ls
bun run journal -- show <address>
bun run journal -- sim priority-fee-sweep --address <address> --window 30d
bun run journal -- sim jito-tip-band --address <address> --window 30d
bun run journal -- sim cexdex-gap-watch --address <address> --window 30d
bun run journal -- note add "reviewed the historical trace" --address <address>
bun run journal -- export --md --out journal.md
bun run journal -- export --json --out journal.json
bun run journal -- import journal.json
bun run serve
```

Every simulator result is stamped `PAPER · HYPOTHETICAL`, lists at least three
assumptions and two caveats, and is saved for note linkage. These are
retrospective detectors and estimators—not live planning or advice. The
`jito-tip-band` model describes the collected public Jito landed-tip
percentiles; its address is watch-context only because those metrics are
global. It does not recommend a tip or predict inclusion. The
`cexdex-gap-watch` model requires two already-collected price series
(`venue.dex.price` and `venue.cex.price`, keyed to the same market).

The web server binds `127.0.0.1` only and refuses non-local hostnames. It has
no authentication because it is never exposed to the network, and its browser
layer makes no external data requests. Transaction rows may offer ordinary
links to the public Solscan or Robinhood Chain Blockscout sites; opening one is
an explicit browser action. The Robinhood Chain panel exposes the current
HTTP-reconciled head, the three finality clocks, watch balances, recent
activity, and latency/oracle/pool/bridge observation surfaces.

The workbench reuses the main page's design tokens. Run
`bun run check:tokens` after page token changes. Empty databases remain usable
and show the exact collection command instead of failing.

Run the complete journal gate before release:

```sh
bun test
bun build src/cli.ts --target=bun
bun run check:tokens
bun run check:safety
```
