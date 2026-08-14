# 06 — JOURNAL DATA PLANE: address tracking, collectors, local timeseries store

> **Status:** specified, not started
> **Owner lane:** `J1` (schema+store) and `J2` (collectors) — see `08-ORCHESTRATION.md`
> **Location:** `journal/` in this repo — a separate local app; never deployed,
> never referenced by `index.html`
> **Safety posture (non-negotiable):** read-only against public data.
> No private keys, no signing, no transaction construction or submission,
> anywhere under `journal/`. This is an observation and paper-journal tool.

---

## 0. Objective

A local data plane that watches a set of Solana addresses (and later, venue
metrics), pulls their public activity on a schedule, and lands it in a local
timeseries store the workbench (`07-JOURNAL-WORKBENCH.md`) can query fast.

## 1. Stack

- **Runtime:** Bun ≥ 1.3 + TypeScript, zero-framework. Installs via
  `sfw bun install` per workspace supply-chain policy (`~/Code/CLAUDE.md`),
  exact-pinned versions.
- **Store:** SQLite via built-in `bun:sqlite` (no native dep). WAL mode.
  Timeseries semantics via schema + indexes, not an extension; documented
  upgrade path: export to DuckDB/parquet for heavy analytics
  (`scripts/export-parquet.ts`, stretch).
- **No ORM.** A thin typed query layer (`journal/src/db.ts`) with migration
  runner (`migrations/NNN-*.sql`, applied by version table).

## 2. Directory layout

```
journal/
  package.json  bunfig.toml  .env.example  README.md
  migrations/0001-init.sql …
  src/
    db.ts            # open, migrate, typed queries
    config.ts        # env + journal.config.json loader
    sources/         # one adapter per source (see §4)
      rpc.ts  solscan.ts  jito.ts  scrape.ts  types.ts
    collect.ts       # scheduler + pipeline (see §5)
    normalize.ts     # raw → rows
    cli.ts           # `journal` CLI entry (shared with 07)
  test/
    fixtures/        # recorded JSON responses (golden)
    *.test.ts
  data/              # gitignored: journal.db, cache/
```

## 3. Schema (migration 0001)

```sql
-- watched addresses
CREATE TABLE addresses (
  address TEXT PRIMARY KEY, label TEXT, tags TEXT DEFAULT '[]',  -- JSON array
  added_at INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1);

-- balance / holdings snapshots (point-in-time)
CREATE TABLE snapshots (
  ts INTEGER NOT NULL, address TEXT NOT NULL REFERENCES addresses(address),
  sol_lamports INTEGER NOT NULL, token_balances TEXT NOT NULL DEFAULT '{}', -- JSON {mint: uiAmount}
  source TEXT NOT NULL, PRIMARY KEY (address, ts));

-- observed transactions (append-only)
CREATE TABLE txs (
  sig TEXT PRIMARY KEY, ts INTEGER NOT NULL, slot INTEGER NOT NULL,
  address TEXT NOT NULL REFERENCES addresses(address),  -- the watched addr it was collected for
  fee_lamports INTEGER, priority_fee_lamports INTEGER, jito_tip_lamports INTEGER,
  program_ids TEXT NOT NULL DEFAULT '[]',   -- JSON array
  kind TEXT,          -- classified: swap | transfer | vote | arb-suspect | liquidation | unknown
  err INTEGER NOT NULL DEFAULT 0, raw_path TEXT);  -- raw JSON on disk cache, not in DB

-- derived metric series (the tsdb surface the UI reads)
CREATE TABLE metrics (
  ts INTEGER NOT NULL, series TEXT NOT NULL,  -- e.g. balance.sol | fees.paid | tips.paid | tx.rate
  key TEXT NOT NULL,                          -- usually the address; venue name for venue series
  value REAL NOT NULL, PRIMARY KEY (series, key, ts));
CREATE INDEX metrics_key_ts ON metrics(key, ts);

-- collector bookkeeping
CREATE TABLE cursor (source TEXT NOT NULL, key TEXT NOT NULL, position TEXT,
  updated_at INTEGER, PRIMARY KEY (source, key));
CREATE TABLE collect_log (ts INTEGER, source TEXT, key TEXT, ok INTEGER,
  items INTEGER, ms INTEGER, note TEXT);
```

Rollup views: `v_daily_fees`, `v_daily_tx_counts`, `v_balance_series`
(1h buckets via `ts/3600`). Raw tx JSON goes to `data/cache/txs/<sig>.json`
(content-addressed, dedup-safe), path recorded — keeps the DB lean.

## 4. Source adapters (priority-ordered; uniform interface)

```ts
interface Source {
  id: 'rpc' | 'solscan' | 'jito' | 'scrape';
  signatures(addr, cursor): AsyncIterable<SigInfo>;   // where supported
  transaction(sig): Promise<RawTx | null>;
  balances(addr): Promise<RawBalances | null>;
  health(): Promise<{ok: boolean; latencyMs: number}>;
}
```

1. **`rpc.ts` (primary)** — Solana public JSON-RPC: `getSignaturesForAddress`
   (cursor = before-signature), `getTransaction` (jsonParsed,
   maxSupportedTransactionVersion), `getBalance`,
   `getTokenAccountsByOwner`. Endpoint from `SOLANA_RPC_URL`
   (default a public mainnet endpoint; document Helius/Triton free tiers in
   `.env.example`). Batch where the endpoint allows; 429/backoff aware.
2. **`solscan.ts` (enrichment)** — Solscan's **public API** (documented
   endpoints; `SOLSCAN_API_KEY` optional) for labels/token metadata the RPC
   lacks. API first — this satisfies the "scrape public sites like solscan"
   requirement via its sanctioned surface.
3. **`jito.ts`** — Jito public APIs for tip floor / bundle stats → venue
   metrics series (`venue.jito.tip_floor`).
4. **`scrape.ts` (last resort, off by default)** — HTML fallback for data
   with no API. Hard etiquette, enforced in code, not by convention:
   checks `robots.txt` per host and obeys it; global limiter **1 request /
   2s / host**; identifying UA `scope-journal/0.x (personal research)`;
   response cache in `data/cache/html/` with 24h TTL; circuit-breaks on 403/
   429/5xx (30-min cooloff); enabled only by `SCRAPE_OK=1`. README notes ToS
   caution plainly.

Adapter selection is per-capability with fallback chain and per-source
`collect_log` accounting.

## 5. Collector pipeline (`collect.ts`)

- `journal collect [--once | --watch]` — for each active address:
  new signatures since cursor → fetch txs (bounded concurrency 4; raw to
  cache) → `normalize.ts` classifies (`kind` heuristics: vote filter, swap
  detection by program id set — Jupiter/Raydium/Orca/Pump ids shipped as
  data —, priority fee from compute-budget instructions, Jito tip by known
  tip accounts) → insert rows → derive metric points (balance from
  post-balances, `fees.paid`, `tips.paid`, `tx.rate` per hour bucket).
- `--watch`: interval loop (default 120s; per-source min intervals; jittered)
  with graceful Ctrl-C; single-instance lock (`data/collect.lock`).
- Idempotent by construction: `txs.sig` PK + `INSERT OR IGNORE`; metrics PK
  upsert; cursors advance only after a batch commits (one transaction per
  address batch).
- Backfill: `journal backfill <addr> --limit 1000` walks history with the
  same pipeline, rate-limit aware.

## 6. Configuration

`journal.config.json` (checked in with sane defaults) + `.env` (secrets,
gitignored): RPC url, API keys (all optional), intervals, scrape opt-in,
watchlist seed (addresses can also be managed via CLI in 07).

## 7. Testing

- Golden fixtures: recorded RPC/solscan responses under `test/fixtures/`;
  adapters run against fixtures by default (`JOURNAL_LIVE=1` for live).
- `normalize.test.ts`: classification table-driven (fixture tx → expected
  kind/fees/tip); `db.test.ts`: migrations idempotent, upserts idempotent
  (run pipeline twice → identical row counts); `collect.test.ts`: cursor
  advance + crash-mid-batch resume (kill between fetch and commit → rerun →
  no gaps, no dupes).

## 8. Acceptance criteria

- `sfw bun install && bun run migrate && bun run collect -- --once` on a fresh
  clone with 3 seeded addresses produces: rows in all tables, ≥ 3 metric
  series per address, raw tx JSONs in cache, `collect_log` entries with
  timings; second run inserts zero duplicates.
- `--watch` sustains 30 min against a public RPC without a 429 storm
  (backoff visible in log) and survives network drop (circuit-break + resume).
- Vote transactions excluded from `tx.rate` by default; a known Jupiter swap
  fixture classifies `swap` with correct priority fee and tip split.
- Scrape adapter: with `SCRAPE_OK` unset it never opens a socket (test
  asserts); with it set, limiter provably spaces requests ≥ 2s (test clock).
- All tests green offline (fixtures only); `JOURNAL_LIVE=1` smoke passes.
- Zero write paths that construct or submit transactions (grep-audited:
  no `sendTransaction`, `signTransaction`, `Keypair` imports — enforced by a
  test that scans `journal/src`).
