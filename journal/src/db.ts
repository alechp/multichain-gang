import { Database } from "bun:sqlite";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadConfig, type WatchAddressConfig } from "./config";

export type TransactionKind =
  | "swap"
  | "transfer"
  | "vote"
  | "arb-suspect"
  | "liquidation"
  | "unknown";

export interface AddressInput {
  address: string;
  label?: string | null;
  tags?: string[];
  addedAt?: number;
  active?: boolean;
}

export interface AddressRecord {
  address: string;
  label: string | null;
  tags: string[];
  addedAt: number;
  active: boolean;
}

export interface SnapshotInput {
  ts: number;
  address: string;
  solLamports: number;
  tokenBalances?: Record<string, number | null>;
  source: string;
}

export interface SnapshotRecord extends SnapshotInput {
  tokenBalances: Record<string, number | null>;
}

export interface TransactionInput {
  signature: string;
  ts: number;
  slot: number;
  address: string;
  feeLamports?: number | null;
  priorityFeeLamports?: number | null;
  jitoTipLamports?: number | null;
  programIds?: string[];
  kind?: TransactionKind | null;
  error?: boolean;
  rawPath?: string | null;
}

export interface TransactionRecord {
  signature: string;
  ts: number;
  slot: number;
  address: string;
  feeLamports: number | null;
  priorityFeeLamports: number | null;
  jitoTipLamports: number | null;
  programIds: string[];
  kind: TransactionKind | null;
  error: boolean;
  rawPath: string | null;
}

export interface MetricInput {
  ts: number;
  series: string;
  key: string;
  value: number;
}

export interface CursorInput {
  source: string;
  key: string;
  position: string | null;
  updatedAt?: number;
}

export interface CursorRecord {
  source: string;
  key: string;
  position: string | null;
  updatedAt: number | null;
}

export interface CollectLogInput {
  ts?: number;
  source: string;
  key: string;
  ok: boolean;
  items?: number;
  ms?: number;
  note?: string | null;
}

export interface CollectLogRecord {
  ts: number;
  source: string;
  key: string;
  ok: boolean;
  items: number;
  ms: number;
  note: string | null;
}

export interface MetricRecord {
  ts: number;
  series: string;
  key: string;
  value: number;
}

export interface JournalBatch {
  snapshots?: SnapshotInput[];
  transactions?: TransactionInput[];
  metrics?: MetricInput[];
  cursors?: CursorInput[];
  logs?: CollectLogInput[];
}

export interface MigrationResult {
  applied: string[];
  currentVersion: number;
}

interface Migration {
  version: number;
  name: string;
  sql: string;
}

interface RawAddressRow {
  address: string;
  label: string | null;
  tags: string;
  added_at: number;
  active: number;
}

interface RawCursorRow {
  source: string;
  key: string;
  position: string | null;
  updated_at: number | null;
}

interface RawMetricRow {
  ts: number;
  series: string;
  key: string;
  value: number;
}

interface RawSnapshotRow {
  ts: number;
  address: string;
  sol_lamports: number;
  token_balances: string;
  source: string;
}

interface RawTransactionRow {
  sig: string;
  ts: number;
  slot: number;
  address: string;
  fee_lamports: number | null;
  priority_fee_lamports: number | null;
  jito_tip_lamports: number | null;
  program_ids: string;
  kind: TransactionKind | null;
  err: number;
  raw_path: string | null;
}

interface RawCollectLogRow {
  ts: number;
  source: string;
  key: string;
  ok: number;
  items: number;
  ms: number;
  note: string | null;
}

const DEFAULT_MIGRATIONS_DIR = resolve(import.meta.dir, "..", "migrations");

function unixNow(): number {
  return Math.floor(Date.now() / 1_000);
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

function readMigrations(migrationsDir: string): Migration[] {
  const migrations = readdirSync(migrationsDir)
    .filter((name) => /^\d{4}-[a-z0-9-]+\.sql$/i.test(name))
    .sort()
    .map((name) => ({
      version: Number(name.slice(0, 4)),
      name,
      sql: readFileSync(resolve(migrationsDir, name), "utf8"),
    }));

  if (migrations.length === 0) throw new Error(`no migrations found in ${migrationsDir}`);
  const versions = new Set<number>();
  for (const migration of migrations) {
    if (versions.has(migration.version)) {
      throw new Error(`duplicate migration version ${migration.version}`);
    }
    versions.add(migration.version);
  }
  return migrations;
}

function parseAddress(row: RawAddressRow): AddressRecord {
  return {
    address: row.address,
    label: row.label,
    tags: JSON.parse(row.tags) as string[],
    addedAt: row.added_at,
    active: row.active === 1,
  };
}

function parseSnapshot(row: RawSnapshotRow): SnapshotRecord {
  return {
    ts: row.ts,
    address: row.address,
    solLamports: row.sol_lamports,
    tokenBalances: JSON.parse(row.token_balances) as Record<string, number | null>,
    source: row.source,
  };
}

function parseTransaction(row: RawTransactionRow): TransactionRecord {
  return {
    signature: row.sig,
    ts: row.ts,
    slot: row.slot,
    address: row.address,
    feeLamports: row.fee_lamports,
    priorityFeeLamports: row.priority_fee_lamports,
    jitoTipLamports: row.jito_tip_lamports,
    programIds: JSON.parse(row.program_ids) as string[],
    kind: row.kind,
    error: row.err === 1,
    rawPath: row.raw_path,
  };
}

export class JournalDatabase {
  readonly path: string;
  private readonly sqlite: Database;

  constructor(path: string) {
    this.path = path;
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.sqlite = new Database(path, { create: true, strict: true });
    this.sqlite.exec("PRAGMA foreign_keys = ON");
    this.sqlite.exec("PRAGMA busy_timeout = 5000");
    this.sqlite.exec("PRAGMA journal_mode = WAL");
  }

  close(): void {
    this.sqlite.close(false);
  }

  migrate(migrationsDir = DEFAULT_MIGRATIONS_DIR): MigrationResult {
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at INTEGER NOT NULL
      )
    `);
    const known = this.sqlite
      .query("SELECT version, name FROM schema_migrations ORDER BY version")
      .all() as Array<{ version: number; name: string }>;
    const knownByVersion = new Map(known.map((row) => [row.version, row.name]));
    const applied: string[] = [];

    for (const migration of readMigrations(migrationsDir)) {
      const existingName = knownByVersion.get(migration.version);
      if (existingName !== undefined) {
        if (existingName !== migration.name) {
          throw new Error(
            `migration ${migration.version} was applied as ${existingName}, not ${migration.name}`,
          );
        }
        continue;
      }

      this.sqlite.transaction(() => {
        this.sqlite.exec(migration.sql);
        this.sqlite.query(
          "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
        ).run(migration.version, migration.name, unixNow());
      })();
      knownByVersion.set(migration.version, migration.name);
      applied.push(migration.name);
    }

    return {
      applied,
      currentVersion: Math.max(0, ...knownByVersion.keys()),
    };
  }

  transaction<T>(operation: (journal: JournalDatabase) => T): T {
    return this.sqlite.transaction(() => operation(this))();
  }

  upsertAddress(input: AddressInput): void {
    this.sqlite.query(`
      INSERT INTO addresses (address, label, tags, added_at, active)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(address) DO UPDATE SET
        label = excluded.label,
        tags = excluded.tags,
        active = excluded.active
    `).run(
      input.address,
      input.label ?? null,
      json(input.tags ?? []),
      input.addedAt ?? unixNow(),
      input.active === false ? 0 : 1,
    );
  }

  seedWatchlist(watchlist: WatchAddressConfig[]): void {
    this.transaction((journal) => {
      for (const entry of watchlist) {
        journal.upsertAddress({
          address: entry.address,
          label: entry.label,
          tags: entry.tags,
          active: entry.active,
        });
      }
    });
  }

  getAddress(address: string): AddressRecord | null {
    const row = this.sqlite.query(`
      SELECT address, label, tags, added_at, active
      FROM addresses WHERE address = ?
    `).get(address) as RawAddressRow | null;
    return row === null ? null : parseAddress(row);
  }

  listAddresses(activeOnly = false): AddressRecord[] {
    const rows = this.sqlite.query(`
      SELECT address, label, tags, added_at, active
      FROM addresses
      WHERE (? = 0 OR active = 1)
      ORDER BY added_at, address
    `).all(activeOnly ? 1 : 0) as RawAddressRow[];
    return rows.map(parseAddress);
  }

  upsertSnapshot(input: SnapshotInput): void {
    this.sqlite.query(`
      INSERT INTO snapshots
        (ts, address, sol_lamports, token_balances, source)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(address, ts) DO UPDATE SET
        sol_lamports = excluded.sol_lamports,
        token_balances = excluded.token_balances,
        source = excluded.source
    `).run(
      input.ts,
      input.address,
      input.solLamports,
      json(input.tokenBalances ?? {}),
      input.source,
    );
  }

  querySnapshots(address: string, fromTs: number, toTs: number): SnapshotRecord[] {
    const rows = this.sqlite.query(`
      SELECT ts, address, sol_lamports, token_balances, source
      FROM snapshots
      WHERE address = ? AND ts BETWEEN ? AND ?
      ORDER BY ts
    `).all(address, fromTs, toTs) as RawSnapshotRow[];
    return rows.map(parseSnapshot);
  }

  insertTransaction(input: TransactionInput): boolean {
    const result = this.sqlite.query(`
      INSERT OR IGNORE INTO txs (
        sig, ts, slot, address, fee_lamports, priority_fee_lamports,
        jito_tip_lamports, program_ids, kind, err, raw_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.signature,
      input.ts,
      input.slot,
      input.address,
      input.feeLamports ?? null,
      input.priorityFeeLamports ?? null,
      input.jitoTipLamports ?? null,
      json(input.programIds ?? []),
      input.kind ?? null,
      input.error === true ? 1 : 0,
      input.rawPath ?? null,
    );
    return result.changes === 1;
  }

  getTransaction(signature: string): TransactionRecord | null {
    const row = this.sqlite.query(`
      SELECT sig, ts, slot, address, fee_lamports, priority_fee_lamports,
        jito_tip_lamports, program_ids, kind, err, raw_path
      FROM txs WHERE sig = ?
    `).get(signature) as RawTransactionRow | null;
    return row === null ? null : parseTransaction(row);
  }

  queryTransactions(address: string, fromTs: number, toTs: number): TransactionRecord[] {
    const rows = this.sqlite.query(`
      SELECT sig, ts, slot, address, fee_lamports, priority_fee_lamports,
        jito_tip_lamports, program_ids, kind, err, raw_path
      FROM txs
      WHERE address = ? AND ts BETWEEN ? AND ?
      ORDER BY ts, sig
    `).all(address, fromTs, toTs) as RawTransactionRow[];
    return rows.map(parseTransaction);
  }

  upsertMetric(input: MetricInput): void {
    this.sqlite.query(`
      INSERT INTO metrics (ts, series, key, value)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(series, key, ts) DO UPDATE SET value = excluded.value
    `).run(input.ts, input.series, input.key, input.value);
  }

  queryMetrics(series: string, key: string, fromTs: number, toTs: number): MetricRecord[] {
    return this.sqlite.query(`
      SELECT ts, series, key, value
      FROM metrics
      WHERE series = ? AND key = ? AND ts BETWEEN ? AND ?
      ORDER BY ts
    `).all(series, key, fromTs, toTs) as RawMetricRow[];
  }

  setCursor(input: CursorInput): void {
    this.sqlite.query(`
      INSERT INTO cursor (source, key, position, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(source, key) DO UPDATE SET
        position = excluded.position,
        updated_at = excluded.updated_at
    `).run(input.source, input.key, input.position, input.updatedAt ?? unixNow());
  }

  getCursor(source: string, key: string): CursorRecord | null {
    const row = this.sqlite.query(`
      SELECT source, key, position, updated_at
      FROM cursor WHERE source = ? AND key = ?
    `).get(source, key) as RawCursorRow | null;
    if (row === null) return null;
    return {
      source: row.source,
      key: row.key,
      position: row.position,
      updatedAt: row.updated_at,
    };
  }

  appendCollectLog(input: CollectLogInput): number {
    const result = this.sqlite.query(`
      INSERT INTO collect_log (ts, source, key, ok, items, ms, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.ts ?? unixNow(),
      input.source,
      input.key,
      input.ok ? 1 : 0,
      input.items ?? 0,
      input.ms ?? 0,
      input.note ?? null,
    );
    return Number(result.lastInsertRowid);
  }

  queryCollectLog(source: string, key: string, fromTs: number, toTs: number): CollectLogRecord[] {
    const rows = this.sqlite.query(`
      SELECT ts, source, key, ok, items, ms, note
      FROM collect_log
      WHERE source = ? AND key = ? AND ts BETWEEN ? AND ?
      ORDER BY ts, rowid
    `).all(source, key, fromTs, toTs) as RawCollectLogRow[];
    return rows.map((row) => ({
      ts: row.ts,
      source: row.source,
      key: row.key,
      ok: row.ok === 1,
      items: row.items,
      ms: row.ms,
      note: row.note,
    }));
  }

  writeBatch(batch: JournalBatch): void {
    this.transaction((journal) => {
      for (const snapshot of batch.snapshots ?? []) journal.upsertSnapshot(snapshot);
      for (const transaction of batch.transactions ?? []) journal.insertTransaction(transaction);
      for (const metric of batch.metrics ?? []) journal.upsertMetric(metric);
      for (const cursor of batch.cursors ?? []) journal.setCursor(cursor);
      for (const log of batch.logs ?? []) journal.appendCollectLog(log);
    });
  }

  count(table: "addresses" | "snapshots" | "txs" | "metrics" | "cursor" | "collect_log"): number {
    const row = this.sqlite.query(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
    return row.count;
  }

  schemaObjects(type: "table" | "view" | "index"): string[] {
    const rows = this.sqlite.query(`
      SELECT name FROM sqlite_master
      WHERE type = ? AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all(type) as Array<{ name: string }>;
    return rows.map((row) => row.name);
  }
}

export function openJournalDatabase(path: string): JournalDatabase {
  return new JournalDatabase(path);
}

async function runMain(): Promise<void> {
  const command = process.argv[2];
  if (command !== "migrate") {
    throw new Error("usage: bun src/db.ts migrate");
  }
  const config = loadConfig();
  const journal = openJournalDatabase(config.databasePath);
  try {
    const result = journal.migrate();
    journal.seedWatchlist(config.watchlist);
    console.log(
      `journal schema v${result.currentVersion}; applied ${result.applied.length}; seeded ${config.watchlist.length}`,
    );
  } finally {
    journal.close();
  }
}

if (import.meta.main) {
  await runMain();
}
