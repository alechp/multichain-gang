import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadConfig } from "../src/config";
import { openJournalDatabase, type JournalDatabase } from "../src/db";

const ADDRESS = "11111111111111111111111111111111";
const CONFIG_PATH = resolve(import.meta.dir, "..", "journal.config.json");
const tempRoots: string[] = [];
const openDatabases: JournalDatabase[] = [];

function tempDatabase(name = "journal.db"): { root: string; path: string } {
  const root = mkdtempSync(join(tmpdir(), "scope-journal-j1-"));
  tempRoots.push(root);
  return { root, path: join(root, "nested", name) };
}

function openMigrated(path: string): JournalDatabase {
  const journal = openJournalDatabase(path);
  openDatabases.push(journal);
  journal.migrate();
  return journal;
}

afterEach(() => {
  while (openDatabases.length > 0) openDatabases.pop()?.close();
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root !== undefined) rmSync(root, { recursive: true, force: true });
  }
});

describe("SQLite migrations", () => {
  test("create the J1 schema and are idempotent", () => {
    const { path } = tempDatabase();
    const journal = openJournalDatabase(path);
    openDatabases.push(journal);

    expect(journal.migrate()).toEqual({
      applied: ["0001-init.sql", "0002-workbench.sql", "0003-evm-observation.sql"],
      currentVersion: 3,
    });
    expect(journal.migrate()).toEqual({ applied: [], currentVersion: 3 });

    expect(journal.schemaObjects("table")).toEqual([
      "addresses",
      "collect_log",
      "cursor",
      "evm_addresses",
      "evm_balances",
      "evm_blocks",
      "evm_finality",
      "evm_logs",
      "evm_observations",
      "evm_txs",
      "journal_entries",
      "metrics",
      "networks",
      "schema_migrations",
      "sim_runs",
      "snapshots",
      "txs",
    ]);
    expect(journal.schemaObjects("view")).toEqual([
      "v_activity",
      "v_balance_series",
      "v_balances",
      "v_daily_fees",
      "v_daily_tx_counts",
      "v_fees",
      "v_latency",
    ]);
    expect(journal.schemaObjects("index")).toEqual([
      "collect_log_source_key_ts",
      "evm_balances_ts",
      "evm_blocks_ts",
      "evm_finality_stage_ts",
      "evm_logs_block",
      "evm_logs_contract",
      "evm_observations_series_ts",
      "evm_txs_block",
      "evm_txs_ts",
      "journal_entries_address_ts",
      "journal_entries_sim_run",
      "journal_entries_ts",
      "metrics_key_ts",
      "metrics_series_ts",
      "sim_runs_address_ts",
      "sim_runs_sim_ts",
      "snapshots_ts",
      "txs_address_ts",
      "txs_ts",
    ]);
  });

  test("creates parent directories for a fresh database path", () => {
    const { path } = tempDatabase("fresh.db");
    const journal = openMigrated(path);
    expect(journal.count("addresses")).toBe(0);
  });
});

describe("typed journal operations", () => {
  test("upserts observations idempotently and keeps transactions append-only", () => {
    const { path } = tempDatabase();
    const journal = openMigrated(path);

    journal.upsertAddress({
      address: ADDRESS,
      label: "first",
      tags: ["seed"],
      addedAt: 1_700_000_000,
    });
    journal.upsertAddress({
      address: ADDRESS,
      label: "updated",
      tags: ["seed", "program"],
      addedAt: 1_800_000_000,
    });
    expect(journal.count("addresses")).toBe(1);
    expect(journal.getAddress(ADDRESS)).toEqual({
      address: ADDRESS,
      label: "updated",
      tags: ["seed", "program"],
      addedAt: 1_700_000_000,
      active: true,
    });

    journal.upsertSnapshot({
      ts: 1_700_000_100,
      address: ADDRESS,
      solLamports: 10,
      source: "rpc",
    });
    journal.upsertSnapshot({
      ts: 1_700_000_100,
      address: ADDRESS,
      solLamports: 20,
      tokenBalances: { mint: 1.5 },
      source: "rpc",
    });
    expect(journal.count("snapshots")).toBe(1);
    expect(journal.querySnapshots(ADDRESS, 0, 2_000_000_000)).toEqual([{
      ts: 1_700_000_100,
      address: ADDRESS,
      solLamports: 20,
      tokenBalances: { mint: 1.5 },
      source: "rpc",
    }]);

    const transaction = {
      signature: "fixture-signature",
      ts: 1_700_000_200,
      slot: 200,
      address: ADDRESS,
      feeLamports: 5_000,
      priorityFeeLamports: 1_000,
      jitoTipLamports: 500,
      programIds: ["program"],
      kind: "swap" as const,
    };
    expect(journal.insertTransaction(transaction)).toBe(true);
    expect(journal.insertTransaction({ ...transaction, feeLamports: 99_999 })).toBe(false);
    expect(journal.count("txs")).toBe(1);
    expect(journal.getTransaction("fixture-signature")).toEqual({
      ...transaction,
      error: false,
      rawPath: null,
    });
    expect(journal.queryTransactions(ADDRESS, 0, 2_000_000_000)).toHaveLength(1);

    const metric = {
      ts: 1_700_000_200,
      series: "balance.sol",
      key: ADDRESS,
      value: 1,
    };
    journal.upsertMetric(metric);
    journal.upsertMetric({ ...metric, value: 2 });
    expect(journal.count("metrics")).toBe(1);
    expect(journal.queryMetrics("balance.sol", ADDRESS, 0, 2_000_000_000)).toEqual([
      { ...metric, value: 2 },
    ]);

    journal.setCursor({ source: "rpc", key: ADDRESS, position: "old", updatedAt: 10 });
    journal.setCursor({ source: "rpc", key: ADDRESS, position: "new", updatedAt: 20 });
    expect(journal.count("cursor")).toBe(1);
    expect(journal.getCursor("rpc", ADDRESS)).toEqual({
      source: "rpc",
      key: ADDRESS,
      position: "new",
      updatedAt: 20,
    });

    journal.appendCollectLog({
      ts: 1_700_000_300,
      source: "rpc",
      key: ADDRESS,
      ok: true,
      items: 1,
      ms: 12,
    });
    expect(journal.count("collect_log")).toBe(1);
    expect(journal.queryCollectLog("rpc", ADDRESS, 0, 2_000_000_000)).toEqual([{
      ts: 1_700_000_300,
      source: "rpc",
      key: ADDRESS,
      ok: true,
      items: 1,
      ms: 12,
      note: null,
    }]);
  });

  test("rolls back a full batch before advancing its cursor", () => {
    const { path } = tempDatabase();
    const journal = openMigrated(path);
    journal.upsertAddress({ address: ADDRESS, addedAt: 1 });

    expect(() => journal.writeBatch({
      metrics: [{ ts: 10, series: "tx.rate", key: ADDRESS, value: 1 }],
      cursors: [{ source: "rpc", key: ADDRESS, position: "advanced", updatedAt: 10 }],
      logs: [{ ts: 10, source: "rpc", key: ADDRESS, ok: true, ms: -1 }],
    })).toThrow();

    expect(journal.count("metrics")).toBe(0);
    expect(journal.count("cursor")).toBe(0);
    expect(journal.count("collect_log")).toBe(0);
  });

  test("seeds the configured watchlist idempotently", () => {
    const { path } = tempDatabase();
    const journal = openMigrated(path);
    const config = loadConfig({ configPath: CONFIG_PATH, env: {} });

    journal.seedWatchlist(config.watchlist);
    journal.seedWatchlist(config.watchlist);
    expect(journal.count("addresses")).toBe(3);
    expect(journal.listAddresses(true)).toHaveLength(3);
  });
});

describe("configuration", () => {
  test("merges environment values over checked-in JSON and validates them", () => {
    const config = loadConfig({
      configPath: CONFIG_PATH,
      env: {
        JOURNAL_DB_PATH: ":memory:",
        SOLANA_RPC_URL: "https://rpc.example.test/",
        COLLECT_INTERVAL_MS: "9000",
        SCRAPE_OK: "1",
        SOLSCAN_API_KEY: "fixture-key",
        ROBINHOOD_CHAIN_RPC_URL: "https://robinhood-rpc.example.test/",
        ROBINHOOD_CHAIN_COMPARISON_RPC_URLS: "https://read-a.example.test/, https://read-b.example.test",
        ROBINHOOD_CHAIN_WS_URL: "wss://robinhood-ws.example.test/",
        JOURNAL_WATCHLIST: JSON.stringify([
          { address: ADDRESS, label: "override", tags: ["one", "one"] },
        ]),
      },
    });

    expect(config.databasePath).toBe(":memory:");
    expect(config.rpcUrl).toBe("https://rpc.example.test");
    expect(config.collectIntervalMs).toBe(9_000);
    expect(config.scrapeEnabled).toBe(true);
    expect(config.solscanApiKey).toBe("fixture-key");
    expect(config.networks.robinhood_chain).toMatchObject({
      chainId: 4663,
      rpcUrl: "https://robinhood-rpc.example.test",
      rpcUrlIsPublic: false,
      comparisonRpcUrls: ["https://read-a.example.test", "https://read-b.example.test"],
      wsUrl: "wss://robinhood-ws.example.test",
      confirmations: {
        display: "soft",
        accounting: "l1-posted",
        irreversible: "l1-final",
      },
    });
    expect(config.watchlist).toEqual([
      { address: ADDRESS, label: "override", tags: ["one"], active: true },
    ]);
  });

  test("rejects malformed environment overrides", () => {
    expect(() => loadConfig({
      configPath: CONFIG_PATH,
      env: { COLLECT_INTERVAL_MS: "fast" },
    })).toThrow("collectIntervalMs");
    expect(() => loadConfig({
      configPath: CONFIG_PATH,
      env: { JOURNAL_WATCHLIST: "not json" },
    })).toThrow("JOURNAL_WATCHLIST");
  });
});

describe("read-only safety posture", () => {
  test("contains none of the prohibited wallet-action APIs", () => {
    const srcRoot = resolve(import.meta.dir, "..", "src");
    const sourceFiles: string[] = [];
    const visit = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) visit(path);
        else if (entry.isFile() && entry.name.endsWith(".ts")) sourceFiles.push(path);
      }
    };
    visit(srcRoot);

    const prohibited = [
      "eth_" + "sendRawTransaction",
      "wallet" + "Client",
      "create" + "WalletClient",
      "private" + "KeyToAccount",
      "sign" + "Transaction",
      "send" + "Transaction",
      "send" + "RawTransaction",
      "write" + "Contract",
      "deploy" + "Contract",
      "private" + "Key",
      "mne" + "monic",
      "sign" + "er",
      "Key" + "pair",
    ];
    for (const path of sourceFiles) {
      const source = readFileSync(path, "utf8");
      for (const term of prohibited) expect(source).not.toContain(term);
    }
  });
});
