# Scope Journal

Scope Journal is a local, read-only store for public Solana observations. It
includes the SQLite data plane, fixture-driven tests, public-data source
adapters, normalization, collection/backfill commands, and watch scheduler.
The workbench lands in a later lane.

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
