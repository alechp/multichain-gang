# Scope Journal

Scope Journal is a local, read-only store and workbench for public Solana
observations. It includes the SQLite data plane, fixture-driven tests,
public-data source adapters, normalization, collection/backfill commands,
paper-only historical simulators, journal/export tools, and a local web bench.

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
links to the public Solscan site; opening one is an explicit browser action.

The workbench reuses the main page's design tokens. Run
`bun run check:tokens` after page token changes. Empty databases remain usable
and show the exact collection command instead of failing.
