import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Collector } from "../src/collect";
import { loadConfig } from "../src/config";
import { openJournalDatabase, type JournalDatabase } from "../src/db";
import {
  FixtureRpcSource,
  type RpcFixture,
} from "../src/sources/rpc";
import type {
  RawBalances,
  RawTransaction,
  SigInfo,
  Source,
  SourceHealth,
} from "../src/sources/types";

const CONFIG_PATH = resolve(import.meta.dir, "..", "journal.config.json");
const FIXTURE_PATH = resolve(import.meta.dir, "fixtures", "collector.json");
const ADDRESS = "11111111111111111111111111111111";
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as RpcFixture;
const tempRoots: string[] = [];
const databases: JournalDatabase[] = [];

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "scope-journal-j2-"));
  tempRoots.push(root);
  return root;
}

function database(root: string): JournalDatabase {
  const journal = openJournalDatabase(join(root, "journal.db"));
  databases.push(journal);
  journal.migrate();
  return journal;
}

function seed(journal: JournalDatabase): void {
  const config = loadConfig({ configPath: CONFIG_PATH, env: {} });
  journal.seedWatchlist(config.watchlist);
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root !== undefined) rmSync(root, { recursive: true, force: true });
  }
});

describe("collector pipeline", () => {
  test("collects three seeds offline and reruns without observation duplicates", async () => {
    const root = tempRoot();
    const journal = database(root);
    seed(journal);
    const source = new FixtureRpcSource(fixture);
    const collector = new Collector({
      database: journal,
      source,
      dataDir: root,
      now: () => fixture.collectedAt as number,
    });

    const first = await collector.collectOnce();
    expect(first.failures).toEqual([]);
    expect(first.addresses).toHaveLength(3);
    expect(journal.count("addresses")).toBe(3);
    expect(journal.count("snapshots")).toBe(3);
    expect(journal.count("txs")).toBe(3);
    expect(journal.count("metrics")).toBe(14);
    expect(journal.count("cursor")).toBe(3);
    for (const address of journal.listAddresses(true)) {
      expect(journal.queryMetrics("balance.sol", address.address, 0, 2_000_000_000)).toHaveLength(1);
      expect(journal.queryMetrics("fees.paid", address.address, 0, 2_000_000_000)).toHaveLength(1);
      expect(journal.queryMetrics("tips.paid", address.address, 0, 2_000_000_000)).toHaveLength(1);
    }
    expect(journal.queryMetrics("tx.rate", "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", 0, 2_000_000_000)).toEqual([]);
    expect(readdirSync(join(root, "cache", "txs"))).toHaveLength(3);

    const dataCounts = {
      snapshots: journal.count("snapshots"),
      txs: journal.count("txs"),
      metrics: journal.count("metrics"),
      cursor: journal.count("cursor"),
    };
    const second = await collector.collectOnce();
    expect(second.failures).toEqual([]);
    expect(second.addresses.every((row) => row.signatures === 0)).toBe(true);
    expect({
      snapshots: journal.count("snapshots"),
      txs: journal.count("txs"),
      metrics: journal.count("metrics"),
      cursor: journal.count("cursor"),
    }).toEqual(dataCounts);
    expect(journal.count("collect_log")).toBe(6);

    const swap = journal.getTransaction(
      "3333333333333333333333333333333333333333333333333333333333333333",
    );
    expect(swap).toMatchObject({
      kind: "swap",
      feeLamports: 7_000,
      priorityFeeLamports: 2_000,
      jitoTipLamports: 2_000,
    });
  });

  test("does not advance a cursor when a batch crashes, then resumes cleanly", async () => {
    const root = tempRoot();
    const journal = database(root);
    journal.upsertAddress({ address: ADDRESS, addedAt: 1 });
    const source = new FixtureRpcSource(fixture);
    const crashing = new Collector({
      database: journal,
      source,
      dataDir: root,
      now: () => fixture.collectedAt as number,
      beforeCommit: () => {
        throw new Error("fixture crash before SQLite commit");
      },
    });

    const failed = await crashing.collectOnce();
    expect(failed.failures).toHaveLength(1);
    expect(journal.count("txs")).toBe(0);
    expect(journal.getCursor("rpc", ADDRESS)).toBeNull();
    expect(readdirSync(join(root, "cache", "txs"))).toHaveLength(1);

    const resumed = new Collector({
      database: journal,
      source,
      dataDir: root,
      now: () => fixture.collectedAt as number,
    });
    expect((await resumed.collectOnce()).failures).toEqual([]);
    expect(journal.count("txs")).toBe(1);
    expect(journal.getCursor("rpc", ADDRESS)?.position).toBe(
      fixture.addresses[ADDRESS]?.signatures[0]?.signature,
    );
    expect(readdirSync(join(root, "cache", "txs"))).toHaveLength(1);
  });

  test("backfill persists its oldest cursor and resumes without gaps", async () => {
    const root = tempRoot();
    const journal = database(root);
    journal.upsertAddress({ address: ADDRESS, addedAt: 1 });
    const baseRaw = fixture.transactions[
      "3333333333333333333333333333333333333333333333333333333333333333"
    ] as RawTransaction;
    const signatures: SigInfo[] = ["6", "7", "8"].map((digit, index) => ({
      signature: digit.repeat(64),
      slot: 200 - index,
      blockTime: 1_700_001_000 - index,
      err: false,
    }));
    const historicalFixture: RpcFixture = {
      collectedAt: 1_700_002_000,
      addresses: {
        [ADDRESS]: {
          signatures,
          balances: { slot: 201, solLamports: 1, tokenBalances: {} },
        },
      },
      transactions: Object.fromEntries(signatures.map((signature) => [
        signature.signature,
        { ...structuredClone(baseRaw), slot: signature.slot, blockTime: signature.blockTime },
      ])),
    };
    const collector = new Collector({
      database: journal,
      source: new FixtureRpcSource(historicalFixture),
      dataDir: root,
      now: () => historicalFixture.collectedAt as number,
    });

    expect((await collector.backfill(ADDRESS, 2)).transactions).toBe(2);
    expect(journal.getCursor("rpc:backfill", ADDRESS)?.position).toBe(signatures[1]?.signature);
    expect((await collector.backfill(ADDRESS, 2)).transactions).toBe(1);
    expect(journal.getCursor("rpc:backfill", ADDRESS)?.position).toBe(signatures[2]?.signature);
    expect(journal.count("txs")).toBe(3);
  });

  test("caps public transaction fetches at four", async () => {
    const root = tempRoot();
    const journal = database(root);
    journal.upsertAddress({ address: ADDRESS, addedAt: 1 });
    const baseRaw = fixture.transactions[
      "3333333333333333333333333333333333333333333333333333333333333333"
    ] as RawTransaction;
    let active = 0;
    let maximum = 0;
    const signatures = ["2", "3", "4", "5", "6", "7", "8", "9"].map((digit, index) => ({
      signature: digit.repeat(64),
      slot: index + 1,
      blockTime: 1_700_003_000 + index,
      err: false,
    }));
    const source: Source = {
      id: "rpc",
      async *signatures() {
        for (const signature of signatures) yield signature;
      },
      async transaction(signature) {
        active += 1;
        maximum = Math.max(maximum, active);
        await Bun.sleep(2);
        active -= 1;
        const info = signatures.find((row) => row.signature === signature) as SigInfo;
        return { ...structuredClone(baseRaw), slot: info.slot, blockTime: info.blockTime };
      },
      async balances(): Promise<RawBalances> {
        return { slot: 1, solLamports: 1, tokenBalances: {} };
      },
      async health(): Promise<SourceHealth> {
        return { ok: true, latencyMs: 0 };
      },
    };
    const collector = new Collector({ database: journal, source, dataDir: root, now: () => 1_700_004_000 });
    expect((await collector.collectOnce()).failures).toEqual([]);
    expect(maximum).toBe(4);
  });
});

describe("collector CLI", () => {
  test("runs deterministic --once twice without data row growth", async () => {
    const root = tempRoot();
    const databasePath = join(root, "cli.db");
    const command = [
      process.execPath,
      "src/cli.ts",
      "collect",
      "--once",
      "--fixtures",
      FIXTURE_PATH,
    ];
    const run = async (): Promise<string> => {
      const child = Bun.spawn(command, {
        cwd: resolve(import.meta.dir, ".."),
        env: { ...process.env, JOURNAL_DB_PATH: databasePath },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      expect(stderr).toBe("");
      expect(exitCode).toBe(0);
      return stdout;
    };

    expect(JSON.parse(await run()).failures).toEqual([]);
    const journal = openJournalDatabase(databasePath);
    databases.push(journal);
    const counts = {
      snapshots: journal.count("snapshots"),
      txs: journal.count("txs"),
      metrics: journal.count("metrics"),
      cursor: journal.count("cursor"),
    };
    journal.close();
    databases.pop();
    expect(JSON.parse(await run()).failures).toEqual([]);
    const rerun = openJournalDatabase(databasePath);
    databases.push(rerun);
    expect({
      snapshots: rerun.count("snapshots"),
      txs: rerun.count("txs"),
      metrics: rerun.count("metrics"),
      cursor: rerun.count("cursor"),
    }).toEqual(counts);
  });
});
