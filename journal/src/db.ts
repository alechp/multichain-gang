import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadConfig, type EvmWatchAddressConfig, type WatchAddressConfig } from "./config";
import {
  decimalString,
  normalizeEvmAddress,
  normalizeEvmHash,
  normalizeHexData,
  safeEvmInteger,
  type EvmFinalityStage,
  type EvmTransactionKind,
} from "./evm-types";

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

export interface SimRunInput {
  id?: string;
  ts?: number;
  sim: string;
  address: string;
  params: Record<string, unknown>;
  result: unknown;
}

export interface SimRunRecord {
  id: string;
  ts: number;
  sim: string;
  address: string;
  params: Record<string, unknown>;
  result: unknown;
}

export interface JournalEntryInput {
  id?: string;
  ts?: number;
  body: string;
  address?: string | null;
  simRun?: string | null;
  tags?: string[];
}

export interface JournalEntryRecord {
  id: string;
  ts: number;
  body: string;
  address: string | null;
  simRun: string | null;
  tags: string[];
}

export interface JournalEntryFilter {
  address?: string;
  tag?: string;
}

export interface JournalBatch {
  snapshots?: SnapshotInput[];
  transactions?: TransactionInput[];
  metrics?: MetricInput[];
  cursors?: CursorInput[];
  logs?: CollectLogInput[];
}

export interface EvmAddressInput {
  network: "robinhood_chain";
  address: string;
  label?: string | null;
  tags?: string[];
  addedAt?: number;
  active?: boolean;
}

export interface EvmAddressRecord {
  network: "robinhood_chain";
  address: string;
  checksumAddress: string;
  label: string | null;
  tags: string[];
  addedAt: number;
  active: boolean;
}

export interface EvmBlockInput {
  network: "robinhood_chain";
  blockNumber: bigint;
  blockHash: string;
  parentHash: string;
  ts: number;
  l1BlockNumber?: bigint | null;
  txCount: number;
  gasUsed: bigint;
  baseFeeWei?: bigint | null;
  observedAt: number;
}

export interface EvmBlockRecord extends Omit<EvmBlockInput, "l1BlockNumber" | "baseFeeWei"> {
  l1BlockNumber: bigint | null;
  baseFeeWei: bigint | null;
}

export interface EvmTransactionInput {
  network: "robinhood_chain";
  txHash: string;
  blockNumber: bigint;
  txIndex: number;
  ts: number;
  fromAddress: string;
  toAddress: string | null;
  nonce: bigint;
  valueWei: bigint;
  gasUsed?: bigint | null;
  effectiveGasPriceWei?: bigint | null;
  status?: number | null;
  inputSelector?: string | null;
  kind: EvmTransactionKind;
  observedAt: number;
}

export interface EvmTransactionRecord extends EvmTransactionInput {
  gasUsed: bigint | null;
  effectiveGasPriceWei: bigint | null;
  feeWei: bigint | null;
  status: number | null;
  inputSelector: string | null;
}

export interface EvmLogInput {
  network: "robinhood_chain";
  txHash: string;
  logIndex: number;
  blockNumber: bigint;
  blockHash: string;
  txIndex: number;
  contractAddress: string;
  topics: string[];
  data: string;
  removed?: boolean;
  observedAt: number;
}

export interface EvmLogRecord extends EvmLogInput {
  removed: boolean;
}

export interface EvmFinalityInput {
  network: "robinhood_chain";
  blockNumber: bigint;
  stage: EvmFinalityStage;
  stageTs: number;
  l1TxHash?: string | null;
  evidence: Record<string, unknown>;
}

export interface EvmFinalityRecord extends EvmFinalityInput {
  l1TxHash: string | null;
}

export interface EvmBalanceInput {
  network: "robinhood_chain";
  address: string;
  assetId: string;
  rawAmount: bigint;
  decimals: number;
  blockNumber: bigint;
  ts: number;
  observedAt: number;
}

export interface EvmBalanceRecord extends EvmBalanceInput {}

export interface EvmObservationInput {
  network: "robinhood_chain";
  ts: number;
  series: string;
  key: string;
  value?: number | null;
  textValue?: string | null;
  blockNumber?: bigint | null;
  provider?: string | null;
  evidence?: Record<string, unknown>;
}

export interface EvmObservationRecord extends Required<Omit<EvmObservationInput, "blockNumber" | "provider" | "evidence">> {
  blockNumber: bigint | null;
  provider: string | null;
  evidence: Record<string, unknown>;
}

export interface EvmJournalBatch {
  blocks?: EvmBlockInput[];
  transactions?: EvmTransactionInput[];
  logs?: EvmLogInput[];
  finality?: EvmFinalityInput[];
  balances?: EvmBalanceInput[];
  observations?: EvmObservationInput[];
  cursors?: CursorInput[];
  collectLogs?: CollectLogInput[];
}

export interface CrossChainActivityRecord {
  network: string;
  txId: string;
  chainPosition: string;
  ts: number;
  status: string;
  kind: string;
}

export interface EvmNetworkOverview {
  network: "robinhood_chain";
  head: EvmBlockRecord | null;
  addresses: EvmAddressRecord[];
  activity: CrossChainActivityRecord[];
  finality: EvmFinalityRecord[];
  balances: EvmBalanceRecord[];
  observations: EvmObservationRecord[];
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

interface RawSimRunRow {
  id: string;
  ts: number;
  sim: string;
  address: string;
  params: string;
  result: string;
}

interface RawJournalEntryRow {
  id: string;
  ts: number;
  body: string;
  address: string | null;
  sim_run: string | null;
  tags: string;
}

interface RawEvmAddressRow {
  network: "robinhood_chain";
  address: string;
  checksum_address: string;
  label: string | null;
  tags: string;
  added_at: number;
  active: number;
}

interface RawEvmBlockRow {
  network: "robinhood_chain";
  block_number: number;
  block_hash: string;
  parent_hash: string;
  ts: number;
  l1_block_number: number | null;
  tx_count: number;
  gas_used: string;
  base_fee_wei: string | null;
  observed_at: number;
}

interface RawEvmTransactionRow {
  network: "robinhood_chain";
  tx_hash: string;
  block_number: number;
  tx_index: number;
  ts: number;
  from_address: string;
  to_address: string | null;
  nonce: string;
  value_wei: string;
  gas_used: string | null;
  effective_gas_price_wei: string | null;
  fee_wei: string | null;
  status: number | null;
  input_selector: string | null;
  kind: EvmTransactionKind;
  observed_at: number;
}

interface RawEvmLogRow {
  network: "robinhood_chain";
  tx_hash: string;
  log_index: number;
  block_number: number;
  block_hash: string;
  tx_index: number;
  contract_address: string;
  topics: string;
  data: string;
  removed: number;
  observed_at: number;
}

interface RawEvmFinalityRow {
  network: "robinhood_chain";
  block_number: number;
  stage: EvmFinalityStage;
  stage_ts: number;
  l1_tx_hash: string | null;
  evidence: string;
}

interface RawEvmBalanceRow {
  network: "robinhood_chain";
  address: string;
  asset_id: string;
  raw_amount: string;
  decimals: number;
  block_number: number;
  ts: number;
  observed_at: number;
}

interface RawEvmObservationRow {
  network: "robinhood_chain";
  ts: number;
  series: string;
  key: string;
  value: number | null;
  text_value: string | null;
  block_number: number | null;
  provider: string | null;
  evidence: string;
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

function parseSimRun(row: RawSimRunRow): SimRunRecord {
  return {
    id: row.id,
    ts: row.ts,
    sim: row.sim,
    address: row.address,
    params: JSON.parse(row.params) as Record<string, unknown>,
    result: JSON.parse(row.result) as unknown,
  };
}

function parseJournalEntry(row: RawJournalEntryRow): JournalEntryRecord {
  return {
    id: row.id,
    ts: row.ts,
    body: row.body,
    address: row.address,
    simRun: row.sim_run,
    tags: JSON.parse(row.tags) as string[],
  };
}

function parseEvmAddress(row: RawEvmAddressRow): EvmAddressRecord {
  return {
    network: row.network,
    address: row.address,
    checksumAddress: row.checksum_address,
    label: row.label,
    tags: JSON.parse(row.tags) as string[],
    addedAt: row.added_at,
    active: row.active === 1,
  };
}

function parseEvmBlock(row: RawEvmBlockRow): EvmBlockRecord {
  return {
    network: row.network,
    blockNumber: BigInt(row.block_number),
    blockHash: row.block_hash,
    parentHash: row.parent_hash,
    ts: row.ts,
    l1BlockNumber: row.l1_block_number === null ? null : BigInt(row.l1_block_number),
    txCount: row.tx_count,
    gasUsed: BigInt(row.gas_used),
    baseFeeWei: row.base_fee_wei === null ? null : BigInt(row.base_fee_wei),
    observedAt: row.observed_at,
  };
}

function parseEvmTransaction(row: RawEvmTransactionRow): EvmTransactionRecord {
  return {
    network: row.network,
    txHash: row.tx_hash,
    blockNumber: BigInt(row.block_number),
    txIndex: row.tx_index,
    ts: row.ts,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    nonce: BigInt(row.nonce),
    valueWei: BigInt(row.value_wei),
    gasUsed: row.gas_used === null ? null : BigInt(row.gas_used),
    effectiveGasPriceWei: row.effective_gas_price_wei === null
      ? null
      : BigInt(row.effective_gas_price_wei),
    feeWei: row.fee_wei === null ? null : BigInt(row.fee_wei),
    status: row.status,
    inputSelector: row.input_selector,
    kind: row.kind,
    observedAt: row.observed_at,
  };
}

function parseEvmLog(row: RawEvmLogRow): EvmLogRecord {
  return {
    network: row.network,
    txHash: row.tx_hash,
    logIndex: row.log_index,
    blockNumber: BigInt(row.block_number),
    blockHash: row.block_hash,
    txIndex: row.tx_index,
    contractAddress: row.contract_address,
    topics: JSON.parse(row.topics) as string[],
    data: row.data,
    removed: row.removed === 1,
    observedAt: row.observed_at,
  };
}

function parseEvmFinality(row: RawEvmFinalityRow): EvmFinalityRecord {
  return {
    network: row.network,
    blockNumber: BigInt(row.block_number),
    stage: row.stage,
    stageTs: row.stage_ts,
    l1TxHash: row.l1_tx_hash,
    evidence: JSON.parse(row.evidence) as Record<string, unknown>,
  };
}

function parseEvmBalance(row: RawEvmBalanceRow): EvmBalanceRecord {
  return {
    network: row.network,
    address: row.address,
    assetId: row.asset_id,
    rawAmount: BigInt(row.raw_amount),
    decimals: row.decimals,
    blockNumber: BigInt(row.block_number),
    ts: row.ts,
    observedAt: row.observed_at,
  };
}

function parseEvmObservation(row: RawEvmObservationRow): EvmObservationRecord {
  return {
    network: row.network,
    ts: row.ts,
    series: row.series,
    key: row.key,
    value: row.value,
    textValue: row.text_value,
    blockNumber: row.block_number === null ? null : BigInt(row.block_number),
    provider: row.provider,
    evidence: JSON.parse(row.evidence) as Record<string, unknown>,
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
        journal.sqlite.query(`
          INSERT OR IGNORE INTO addresses (address, label, tags, added_at, active)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          entry.address,
          entry.label,
          json(entry.tags),
          unixNow(),
          entry.active ? 1 : 0,
        );
      }
    });
  }

  upsertEvmAddress(input: EvmAddressInput): void {
    const selected = normalizeEvmAddress(input.address);
    this.sqlite.query(`
      INSERT INTO evm_addresses
        (network, address, checksum_address, label, tags, added_at, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(network, address) DO UPDATE SET
        checksum_address = excluded.checksum_address,
        label = excluded.label,
        tags = excluded.tags,
        active = excluded.active
    `).run(
      input.network,
      selected.address,
      selected.checksumAddress,
      input.label ?? null,
      json(input.tags ?? []),
      input.addedAt ?? unixNow(),
      input.active === false ? 0 : 1,
    );
  }

  seedEvmWatchlist(watchlist: EvmWatchAddressConfig[]): void {
    this.transaction((journal) => {
      for (const entry of watchlist) {
        journal.sqlite.query(`
          INSERT OR IGNORE INTO evm_addresses
            (network, address, checksum_address, label, tags, added_at, active)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          entry.network,
          entry.address,
          entry.checksumAddress,
          entry.label,
          json(entry.tags),
          unixNow(),
          entry.active ? 1 : 0,
        );
      }
    });
  }

  setEvmAddressActive(network: "robinhood_chain", address: string, active: boolean): boolean {
    const selected = normalizeEvmAddress(address).address;
    const result = this.sqlite.query(`
      UPDATE evm_addresses SET active = ? WHERE network = ? AND address = ?
    `).run(active ? 1 : 0, network, selected);
    return result.changes === 1;
  }

  getEvmAddress(network: "robinhood_chain", address: string): EvmAddressRecord | null {
    const selected = normalizeEvmAddress(address).address;
    const row = this.sqlite.query(`
      SELECT network, address, checksum_address, label, tags, added_at, active
      FROM evm_addresses WHERE network = ? AND address = ?
    `).get(network, selected) as RawEvmAddressRow | null;
    return row === null ? null : parseEvmAddress(row);
  }

  listEvmAddresses(network: "robinhood_chain", activeOnly = false): EvmAddressRecord[] {
    const rows = this.sqlite.query(`
      SELECT network, address, checksum_address, label, tags, added_at, active
      FROM evm_addresses
      WHERE network = ? AND (? = 0 OR active = 1)
      ORDER BY added_at, address
    `).all(network, activeOnly ? 1 : 0) as RawEvmAddressRow[];
    return rows.map(parseEvmAddress);
  }

  insertEvmBlock(input: EvmBlockInput): boolean {
    const result = this.sqlite.query(`
      INSERT OR IGNORE INTO evm_blocks (
        network, block_number, block_hash, parent_hash, ts, l1_block_number,
        tx_count, gas_used, base_fee_wei, observed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.network,
      safeEvmInteger(input.blockNumber, "block number"),
      normalizeEvmHash(input.blockHash, "block hash"),
      normalizeEvmHash(input.parentHash, "parent hash"),
      input.ts,
      input.l1BlockNumber === undefined || input.l1BlockNumber === null
        ? null
        : safeEvmInteger(input.l1BlockNumber, "L1 block number"),
      input.txCount,
      decimalString(input.gasUsed, "block gas used"),
      input.baseFeeWei === undefined || input.baseFeeWei === null
        ? null
        : decimalString(input.baseFeeWei, "base fee"),
      input.observedAt,
    );
    return result.changes === 1;
  }

  getEvmBlock(network: "robinhood_chain", blockNumber: bigint): EvmBlockRecord | null {
    const row = this.sqlite.query(`
      SELECT network, block_number, block_hash, parent_hash, ts, l1_block_number,
        tx_count, gas_used, base_fee_wei, observed_at
      FROM evm_blocks WHERE network = ? AND block_number = ?
    `).get(network, safeEvmInteger(blockNumber, "block number")) as RawEvmBlockRow | null;
    return row === null ? null : parseEvmBlock(row);
  }

  latestEvmBlock(network: "robinhood_chain"): EvmBlockRecord | null {
    const row = this.sqlite.query(`
      SELECT network, block_number, block_hash, parent_hash, ts, l1_block_number,
        tx_count, gas_used, base_fee_wei, observed_at
      FROM evm_blocks WHERE network = ? ORDER BY block_number DESC LIMIT 1
    `).get(network) as RawEvmBlockRow | null;
    return row === null ? null : parseEvmBlock(row);
  }

  insertEvmTransaction(input: EvmTransactionInput): boolean {
    if (input.status !== undefined && input.status !== null && input.status !== 0 && input.status !== 1) {
      throw new Error("EVM transaction status must be 0, 1, or null");
    }
    const selector = input.inputSelector === undefined || input.inputSelector === null
      ? null
      : normalizeHexData(input.inputSelector, "input selector");
    if (selector !== null && selector.length !== 10) throw new Error("input selector must be four bytes");
    const gasUsed = input.gasUsed === undefined || input.gasUsed === null
      ? null
      : decimalString(input.gasUsed, "gas used");
    const gasPrice = input.effectiveGasPriceWei === undefined || input.effectiveGasPriceWei === null
      ? null
      : decimalString(input.effectiveGasPriceWei, "effective gas price");
    const fee = input.gasUsed === undefined || input.gasUsed === null
      || input.effectiveGasPriceWei === undefined || input.effectiveGasPriceWei === null
      ? null
      : decimalString(input.gasUsed * input.effectiveGasPriceWei, "transaction fee");
    const result = this.sqlite.query(`
      INSERT OR IGNORE INTO evm_txs (
        network, tx_hash, block_number, tx_index, ts, from_address, to_address,
        nonce, value_wei, gas_used, effective_gas_price_wei, fee_wei, status,
        input_selector, kind, observed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.network,
      normalizeEvmHash(input.txHash, "transaction hash"),
      safeEvmInteger(input.blockNumber, "block number"),
      input.txIndex,
      input.ts,
      normalizeEvmAddress(input.fromAddress).address,
      input.toAddress === null ? null : normalizeEvmAddress(input.toAddress).address,
      decimalString(input.nonce, "nonce"),
      decimalString(input.valueWei, "value"),
      gasUsed,
      gasPrice,
      fee,
      input.status ?? null,
      selector,
      input.kind,
      input.observedAt,
    );
    return result.changes === 1;
  }

  getEvmTransaction(network: "robinhood_chain", hash: string): EvmTransactionRecord | null {
    const row = this.sqlite.query(`
      SELECT network, tx_hash, block_number, tx_index, ts, from_address, to_address,
        nonce, value_wei, gas_used, effective_gas_price_wei, fee_wei, status,
        input_selector, kind, observed_at
      FROM evm_txs WHERE network = ? AND tx_hash = ?
    `).get(network, normalizeEvmHash(hash, "transaction hash")) as RawEvmTransactionRow | null;
    return row === null ? null : parseEvmTransaction(row);
  }

  queryEvmTransactions(
    network: "robinhood_chain",
    fromTs: number,
    toTs: number,
    limit = 100,
  ): EvmTransactionRecord[] {
    const rows = this.sqlite.query(`
      SELECT network, tx_hash, block_number, tx_index, ts, from_address, to_address,
        nonce, value_wei, gas_used, effective_gas_price_wei, fee_wei, status,
        input_selector, kind, observed_at
      FROM evm_txs
      WHERE network = ? AND ts BETWEEN ? AND ?
      ORDER BY block_number DESC, tx_index DESC LIMIT ?
    `).all(network, fromTs, toTs, limit) as RawEvmTransactionRow[];
    return rows.map(parseEvmTransaction);
  }

  upsertEvmLog(input: EvmLogInput): void {
    const topics = input.topics.map((topic) => normalizeEvmHash(topic, "log topic"));
    this.sqlite.query(`
      INSERT INTO evm_logs (
        network, tx_hash, log_index, block_number, block_hash, tx_index,
        contract_address, topic0, topics, data, removed, observed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(network, tx_hash, log_index) DO UPDATE SET
        block_number = excluded.block_number,
        block_hash = excluded.block_hash,
        tx_index = excluded.tx_index,
        contract_address = excluded.contract_address,
        topic0 = excluded.topic0,
        topics = excluded.topics,
        data = excluded.data,
        removed = excluded.removed,
        observed_at = excluded.observed_at
    `).run(
      input.network,
      normalizeEvmHash(input.txHash, "transaction hash"),
      input.logIndex,
      safeEvmInteger(input.blockNumber, "block number"),
      normalizeEvmHash(input.blockHash, "block hash"),
      input.txIndex,
      normalizeEvmAddress(input.contractAddress).address,
      topics[0] ?? null,
      json(topics),
      normalizeHexData(input.data, "log data"),
      input.removed === true ? 1 : 0,
      input.observedAt,
    );
  }

  queryEvmLogs(
    network: "robinhood_chain",
    fromBlock: bigint,
    toBlock: bigint,
    includeRemoved = true,
  ): EvmLogRecord[] {
    const rows = this.sqlite.query(`
      SELECT network, tx_hash, log_index, block_number, block_hash, tx_index,
        contract_address, topics, data, removed, observed_at
      FROM evm_logs
      WHERE network = ? AND block_number BETWEEN ? AND ? AND (? = 1 OR removed = 0)
      ORDER BY block_number, tx_index, log_index
    `).all(
      network,
      safeEvmInteger(fromBlock, "from block"),
      safeEvmInteger(toBlock, "to block"),
      includeRemoved ? 1 : 0,
    ) as RawEvmLogRow[];
    return rows.map(parseEvmLog);
  }

  upsertEvmFinality(input: EvmFinalityInput): void {
    const blockNumber = safeEvmInteger(input.blockNumber, "block number");
    if (input.stage !== "soft") {
      const prerequisite = input.stage === "l1-posted" ? "soft" : "l1-posted";
      const prior = this.sqlite.query(`
        SELECT stage_ts FROM evm_finality
        WHERE network = ? AND block_number = ? AND stage = ?
      `).get(input.network, blockNumber, prerequisite) as { stage_ts: number } | null;
      if (prior === null) throw new Error(`${input.stage} requires ${prerequisite} evidence first`);
      if (input.stageTs < prior.stage_ts) throw new Error(`${input.stage} timestamp precedes ${prerequisite}`);
      if (Object.keys(input.evidence).length === 0) throw new Error(`${input.stage} requires evidence`);
    }
    this.sqlite.query(`
      INSERT INTO evm_finality
        (network, block_number, stage, stage_ts, l1_tx_hash, evidence)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(network, block_number, stage) DO UPDATE SET
        stage_ts = excluded.stage_ts,
        l1_tx_hash = excluded.l1_tx_hash,
        evidence = excluded.evidence
    `).run(
      input.network,
      blockNumber,
      input.stage,
      input.stageTs,
      input.l1TxHash === undefined || input.l1TxHash === null
        ? null
        : normalizeEvmHash(input.l1TxHash, "L1 transaction hash"),
      json(input.evidence),
    );
  }

  queryEvmFinality(
    network: "robinhood_chain",
    blockNumber?: bigint,
    limit = 100,
  ): EvmFinalityRecord[] {
    const selected = blockNumber === undefined ? null : safeEvmInteger(blockNumber, "block number");
    const rows = this.sqlite.query(`
      SELECT network, block_number, stage, stage_ts, l1_tx_hash, evidence
      FROM evm_finality
      WHERE network = ? AND (? IS NULL OR block_number = ?)
      ORDER BY block_number DESC,
        CASE stage WHEN 'soft' THEN 1 WHEN 'l1-posted' THEN 2 ELSE 3 END DESC
      LIMIT ?
    `).all(network, selected, selected, limit) as RawEvmFinalityRow[];
    return rows.map(parseEvmFinality);
  }

  upsertEvmBalance(input: EvmBalanceInput): void {
    if (!Number.isSafeInteger(input.decimals) || input.decimals < 0 || input.decimals > 255) {
      throw new Error("asset decimals must be an integer from 0 through 255");
    }
    if (input.assetId.trim() === "") throw new Error("asset ID must not be empty");
    this.sqlite.query(`
      INSERT INTO evm_balances (
        network, address, asset_id, raw_amount, decimals, block_number, ts, observed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(network, address, asset_id, block_number) DO UPDATE SET
        raw_amount = excluded.raw_amount,
        decimals = excluded.decimals,
        ts = excluded.ts,
        observed_at = excluded.observed_at
    `).run(
      input.network,
      normalizeEvmAddress(input.address).address,
      input.assetId,
      decimalString(input.rawAmount, "balance"),
      input.decimals,
      safeEvmInteger(input.blockNumber, "block number"),
      input.ts,
      input.observedAt,
    );
  }

  queryEvmBalances(
    network: "robinhood_chain",
    address?: string,
    limit = 100,
  ): EvmBalanceRecord[] {
    const selected = address === undefined ? null : normalizeEvmAddress(address).address;
    const rows = this.sqlite.query(`
      SELECT network, address, asset_id, raw_amount, decimals, block_number, ts, observed_at
      FROM evm_balances
      WHERE network = ? AND (? IS NULL OR address = ?)
      ORDER BY block_number DESC, address, asset_id LIMIT ?
    `).all(network, selected, selected, limit) as RawEvmBalanceRow[];
    return rows.map(parseEvmBalance);
  }

  upsertEvmObservation(input: EvmObservationInput): void {
    if (input.series.trim() === "" || input.key.trim() === "") {
      throw new Error("observation series and key must not be empty");
    }
    const value = input.value ?? null;
    const textValue = input.textValue ?? null;
    if (value === null && textValue === null) throw new Error("observation requires a value");
    if (value !== null && !Number.isFinite(value)) throw new Error("observation value must be finite");
    this.sqlite.query(`
      INSERT INTO evm_observations (
        network, ts, series, key, value, text_value, block_number, provider, evidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(network, series, key, ts) DO UPDATE SET
        value = excluded.value,
        text_value = excluded.text_value,
        block_number = excluded.block_number,
        provider = excluded.provider,
        evidence = excluded.evidence
    `).run(
      input.network,
      input.ts,
      input.series,
      input.key,
      value,
      textValue,
      input.blockNumber === undefined || input.blockNumber === null
        ? null
        : safeEvmInteger(input.blockNumber, "block number"),
      input.provider ?? null,
      json(input.evidence ?? {}),
    );
  }

  queryEvmObservations(
    network: "robinhood_chain",
    series?: string,
    key?: string,
    fromTs = 0,
    toTs = Number.MAX_SAFE_INTEGER,
    limit = 250,
  ): EvmObservationRecord[] {
    const rows = this.sqlite.query(`
      SELECT network, ts, series, key, value, text_value, block_number, provider, evidence
      FROM evm_observations
      WHERE network = ?
        AND (? IS NULL OR series = ?)
        AND (? IS NULL OR key = ?)
        AND ts BETWEEN ? AND ?
      ORDER BY ts DESC, series, key LIMIT ?
    `).all(
      network,
      series ?? null,
      series ?? null,
      key ?? null,
      key ?? null,
      fromTs,
      toTs,
      limit,
    ) as RawEvmObservationRow[];
    return rows.map(parseEvmObservation);
  }

  setAddressActive(address: string, active: boolean): boolean {
    const result = this.sqlite.query(
      "UPDATE addresses SET active = ? WHERE address = ?",
    ).run(active ? 1 : 0, address);
    return result.changes === 1;
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

  latestObservationTs(address: string): number | null {
    const row = this.sqlite.query(`
      SELECT MAX(ts) AS ts FROM (
        SELECT ts FROM snapshots WHERE address = ?
        UNION ALL SELECT ts FROM txs WHERE address = ?
        UNION ALL SELECT ts FROM metrics WHERE key = ?
      )
    `).get(address, address, address) as { ts: number | null };
    return row.ts;
  }

  saveSimRun(input: SimRunInput): SimRunRecord {
    const record: SimRunRecord = {
      id: input.id ?? randomUUID(),
      ts: input.ts ?? unixNow(),
      sim: input.sim,
      address: input.address,
      params: input.params,
      result: input.result,
    };
    this.sqlite.query(`
      INSERT INTO sim_runs (id, ts, sim, address, params, result)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        ts = excluded.ts,
        sim = excluded.sim,
        address = excluded.address,
        params = excluded.params,
        result = excluded.result
    `).run(
      record.id,
      record.ts,
      record.sim,
      record.address,
      json(record.params),
      json(record.result),
    );
    return record;
  }

  getSimRun(id: string): SimRunRecord | null {
    const row = this.sqlite.query(`
      SELECT id, ts, sim, address, params, result
      FROM sim_runs WHERE id = ?
    `).get(id) as RawSimRunRow | null;
    return row === null ? null : parseSimRun(row);
  }

  listSimRuns(address?: string): SimRunRecord[] {
    const rows = this.sqlite.query(`
      SELECT id, ts, sim, address, params, result
      FROM sim_runs
      WHERE (? IS NULL OR address = ?)
      ORDER BY ts DESC, id
    `).all(address ?? null, address ?? null) as RawSimRunRow[];
    return rows.map(parseSimRun);
  }

  addJournalEntry(input: JournalEntryInput): JournalEntryRecord {
    const record: JournalEntryRecord = {
      id: input.id ?? randomUUID(),
      ts: input.ts ?? unixNow(),
      body: input.body.trim(),
      address: input.address ?? null,
      simRun: input.simRun ?? null,
      tags: [...new Set(input.tags ?? [])],
    };
    this.sqlite.query(`
      INSERT INTO journal_entries (id, ts, body, address, sim_run, tags)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        ts = excluded.ts,
        body = excluded.body,
        address = excluded.address,
        sim_run = excluded.sim_run,
        tags = excluded.tags
    `).run(
      record.id,
      record.ts,
      record.body,
      record.address,
      record.simRun,
      json(record.tags),
    );
    return record;
  }

  listJournalEntries(filter: JournalEntryFilter = {}): JournalEntryRecord[] {
    const rows = this.sqlite.query(`
      SELECT id, ts, body, address, sim_run, tags
      FROM journal_entries
      WHERE (? IS NULL OR address = ?)
      ORDER BY ts DESC, id
    `).all(filter.address ?? null, filter.address ?? null) as RawJournalEntryRow[];
    const entries = rows.map(parseJournalEntry);
    return filter.tag === undefined
      ? entries
      : entries.filter((entry) => entry.tags.includes(filter.tag as string));
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

  writeEvmBatch(batch: EvmJournalBatch): void {
    this.transaction((journal) => {
      for (const block of batch.blocks ?? []) journal.insertEvmBlock(block);
      for (const transaction of batch.transactions ?? []) journal.insertEvmTransaction(transaction);
      for (const log of batch.logs ?? []) journal.upsertEvmLog(log);
      for (const finality of batch.finality ?? []) journal.upsertEvmFinality(finality);
      for (const balance of batch.balances ?? []) journal.upsertEvmBalance(balance);
      for (const observation of batch.observations ?? []) journal.upsertEvmObservation(observation);
      for (const cursor of batch.cursors ?? []) journal.setCursor(cursor);
      for (const log of batch.collectLogs ?? []) journal.appendCollectLog(log);
    });
  }

  rewindEvm(
    network: "robinhood_chain",
    fromBlock: bigint,
    cursorSource: string,
    cursorKey: string,
    cursorPosition: string | null,
    updatedAt = unixNow(),
  ): void {
    const selected = safeEvmInteger(fromBlock, "rewind block");
    this.transaction((journal) => {
      journal.sqlite.query(`
        UPDATE evm_logs SET removed = 1, observed_at = ?
        WHERE network = ? AND block_number >= ?
      `).run(updatedAt, network, selected);
      journal.sqlite.query(`DELETE FROM evm_finality WHERE network = ? AND block_number >= ?`)
        .run(network, selected);
      journal.sqlite.query(`DELETE FROM evm_balances WHERE network = ? AND block_number >= ?`)
        .run(network, selected);
      journal.sqlite.query(`DELETE FROM evm_observations WHERE network = ? AND block_number >= ?`)
        .run(network, selected);
      journal.sqlite.query(`DELETE FROM evm_txs WHERE network = ? AND block_number >= ?`)
        .run(network, selected);
      journal.sqlite.query(`DELETE FROM evm_blocks WHERE network = ? AND block_number >= ?`)
        .run(network, selected);
      journal.sqlite.query(`
        UPDATE cursor SET position = ?, updated_at = ?
        WHERE key = ? AND source LIKE '%:evm-blocks%'
          AND position IS NOT NULL AND CAST(position AS INTEGER) >= ?
      `).run(cursorPosition, updatedAt, network, selected);
      journal.setCursor({
        source: cursorSource,
        key: cursorKey,
        position: cursorPosition,
        updatedAt,
      });
    });
  }

  queryCrossChainActivity(fromTs: number, toTs: number, limit = 250): CrossChainActivityRecord[] {
    const rows = this.sqlite.query(`
      SELECT network, tx_id, chain_position, ts, status, kind
      FROM v_activity WHERE ts BETWEEN ? AND ?
      ORDER BY ts DESC, network, chain_position LIMIT ?
    `).all(fromTs, toTs, limit) as Array<{
      network: string;
      tx_id: string;
      chain_position: string;
      ts: number;
      status: string;
      kind: string;
    }>;
    return rows.map((row) => ({
      network: row.network,
      txId: row.tx_id,
      chainPosition: row.chain_position,
      ts: row.ts,
      status: row.status,
      kind: row.kind,
    }));
  }

  evmNetworkOverview(network: "robinhood_chain"): EvmNetworkOverview {
    const activity = this.sqlite.query(`
      SELECT network, tx_id, chain_position, ts, status, kind
      FROM v_activity WHERE network = ?
      ORDER BY ts DESC, chain_position DESC LIMIT 25
    `).all(network) as Array<{
      network: string;
      tx_id: string;
      chain_position: string;
      ts: number;
      status: string;
      kind: string;
    }>;
    return {
      network,
      head: this.latestEvmBlock(network),
      addresses: this.listEvmAddresses(network, true),
      activity: activity.map((row) => ({
        network: row.network,
        txId: row.tx_id,
        chainPosition: row.chain_position,
        ts: row.ts,
        status: row.status,
        kind: row.kind,
      })),
      finality: this.queryEvmFinality(network, undefined, 25),
      balances: this.queryEvmBalances(network, undefined, 25),
      observations: this.queryEvmObservations(network, undefined, undefined, 0, Number.MAX_SAFE_INTEGER, 50),
    };
  }

  count(table:
    | "addresses"
    | "snapshots"
    | "txs"
    | "metrics"
    | "cursor"
    | "collect_log"
    | "journal_entries"
    | "sim_runs"
    | "networks"
    | "evm_addresses"
    | "evm_blocks"
    | "evm_txs"
    | "evm_logs"
    | "evm_finality"
    | "evm_balances"
    | "evm_observations"
  ): number {
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
    journal.seedEvmWatchlist(config.evmWatchlist);
    console.log(
      `journal schema v${result.currentVersion}; applied ${result.applied.length}; seeded ${config.watchlist.length + config.evmWatchlist.length}`,
    );
  } finally {
    journal.close();
  }
}

if (import.meta.main) {
  await runMain();
}
