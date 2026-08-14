# Scope Journal

Scope Journal is a local, read-only store for public Solana observations. J1
provides the SQLite schema, migrations, configuration loader, and typed query
surface. Collectors and the workbench land in later lanes.

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
