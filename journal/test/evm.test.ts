import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { EvmCollector, recoverFromHeadFeed } from "../src/evm-collect";
import {
  checksumEvmAddress,
  normalizeEvmAddress,
  normalizeEvmHash,
  uint256,
  type EvmSource,
} from "../src/evm-types";
import {
  observeChainlink,
  observeUiMultiplier,
  recordBridgeObservation,
  recordFinalityEvidence,
  recordPoolObservation,
} from "../src/evm-observe";
import { openJournalDatabase, type JournalDatabase } from "../src/db";
import {
  EvmRpcSource,
  FixtureEvmSource,
  type EvmRpcFixture,
} from "../src/sources/evm-rpc";
import type { FetchLike } from "../src/sources/types";
import { EvmNewHeadFeed, type WebSocketLike } from "../src/sources/evm-heads";
import { handleWorkbenchRequest } from "../web/server";

const JOURNAL_ROOT = resolve(import.meta.dir, "..");
const FIXTURE_PATH = resolve(import.meta.dir, "fixtures", "robinhood-chain.json");
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as EvmRpcFixture;
const WATCH = "0x1111111111111111111111111111111111111111";
const MAX_UINT256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
const tempRoots: string[] = [];
const databases: JournalDatabase[] = [];

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "scope-journal-evm-"));
  tempRoots.push(root);
  return root;
}

function database(root: string): JournalDatabase {
  const journal = openJournalDatabase(join(root, "journal.db"));
  databases.push(journal);
  journal.migrate();
  return journal;
}

function seedWatch(journal: JournalDatabase): void {
  journal.upsertEvmAddress({
    network: "robinhood_chain",
    address: WATCH,
    label: "fixture observer",
    tags: ["fixture"],
    addedAt: 1,
  });
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root !== undefined) rmSync(root, { recursive: true, force: true });
  }
});

describe("bigint-safe EVM validation", () => {
  test("normalizes storage keys and computes EIP-55 display checksums", () => {
    const lower = "0x52908400098527886e0f7030069857d2e4169ee7";
    const checksum = "0x52908400098527886E0F7030069857D2E4169EE7";
    expect(checksumEvmAddress(lower)).toBe(checksum);
    expect(normalizeEvmAddress(checksum)).toEqual({ address: lower, checksumAddress: checksum });
    expect(() => normalizeEvmAddress("0x52908400098527886E0F7030069857D2E4169Ee7"))
      .toThrow("checksum");
    expect(() => normalizeEvmAddress("0x1234")).toThrow("invalid EVM address");
    expect(() => normalizeEvmHash("0x1234", "transaction hash")).toThrow("transaction hash");
  });

  test("round-trips uint256 without JavaScript number conversion", () => {
    expect(uint256(MAX_UINT256).toString()).toBe(MAX_UINT256);
    expect(() => uint256(`${BigInt(MAX_UINT256) + 1n}`)).toThrow("outside uint256");
    expect(() => uint256("01")).toThrow("unsigned decimal");
  });
});

describe("Robinhood Chain HTTP JSON-RPC", () => {
  test("verifies chain 4663 and implements every read method with adaptive log splitting", async () => {
    const methods: string[] = [];
    const fetcher: FetchLike = async (_input, init) => {
      const call = JSON.parse(init?.body as string) as {
        id: number;
        method: string;
        params: Array<Record<string, string> | string | boolean>;
      };
      methods.push(call.method);
      let result: unknown;
      if (call.method === "eth_chainId") result = "0x1237";
      else if (call.method === "eth_blockNumber") result = "0x64";
      else if (call.method === "eth_getBlockByNumber") {
        result = {
          number: "0x64",
          hash: `0x${"1".repeat(64)}`,
          parentHash: `0x${"a".repeat(64)}`,
          timestamp: "0x6553f164",
          l1BlockNumber: "0x1220a80",
          gasUsed: "0x5208",
          baseFeePerGas: "0x3d9b080",
          transactions: [],
        };
      } else if (call.method === "eth_getTransactionReceipt") result = null;
      else if (call.method === "eth_getBalance") result = `0x${"f".repeat(64)}`;
      else if (call.method === "eth_call") result = `0x${"0".repeat(63)}1`;
      else if (call.method === "eth_getLogs") {
        const filter = call.params[0] as Record<string, string>;
        if (filter.fromBlock !== filter.toBlock) {
          return Response.json({ jsonrpc: "2.0", id: call.id, error: { code: -32005, message: "range" } });
        }
        result = [];
      } else throw new Error(`unexpected ${call.method}`);
      return Response.json({ jsonrpc: "2.0", id: call.id, result });
    };
    const source = new EvmRpcSource("https://rpc.example.test", { fetch: fetcher, maxLogRange: 4 });
    expect(await source.chainId()).toBe(4663n);
    expect(await source.blockNumber()).toBe(100n);
    expect((await source.block(100n))?.gasUsed).toBe(21_000n);
    expect(await source.receipt(`0x${"4".repeat(64)}`)).toBeNull();
    expect(await source.balance(WATCH, 100n)).toBe(BigInt(`0x${"f".repeat(64)}`));
    expect(await source.call(WATCH, "0x1234", 100n)).toEndWith("1");
    const logs = [];
    for await (const row of source.logs({ fromBlock: 1n, toBlock: 4n })) logs.push(row);
    expect(logs).toEqual([]);
    expect(methods.filter((method) => method === "eth_getLogs")).toHaveLength(7);
    expect((await source.health()).head).toBe(100n);
  });

  test("hard-fails a provider on the wrong chain", async () => {
    const source = new EvmRpcSource("https://wrong.example.test", {
      fetch: async (_input, init) => {
        const call = JSON.parse(init?.body as string) as { id: number };
        return Response.json({ jsonrpc: "2.0", id: call.id, result: "0x1" });
      },
    });
    await expect(source.blockNumber()).rejects.toThrow("expected 4663");
  });
});

describe("deterministic EVM collection and recovery", () => {
  test("parses standard provider new-head wakeups without promoting feed state", async () => {
    const listeners = new Map<string, Array<(event: Event) => void>>();
    let closed = false;
    const emit = (type: string, event: Event): void => {
      for (const listener of listeners.get(type) ?? []) listener(event);
    };
    const socket: WebSocketLike = {
      readyState: 1,
      send() {
        queueMicrotask(() => emit("message", new MessageEvent("message", {
          data: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_subscription",
            params: {
              result: {
                number: "0x66",
                hash: `0x${"3".repeat(64)}`,
                parentHash: `0x${"2".repeat(64)}`,
              },
            },
          }),
        })));
      },
      close() {
        if (closed) return;
        closed = true;
        emit("close", new Event("close"));
      },
      addEventListener(type, listener) {
        listeners.set(type, [...(listeners.get(type) ?? []), listener]);
        if (type === "open") queueMicrotask(() => listener(new Event("open")));
      },
    };
    const controller = new AbortController();
    const rows: Array<{ number: bigint }> = [];
    const feed = new EvmNewHeadFeed("wss://provider.example.test", {
      socket: () => socket,
      reconnectMs: 1,
    });
    await feed.follow((head) => {
      rows.push(head);
      controller.abort();
    }, controller.signal);
    expect(rows).toMatchObject([{ number: 102n }]);
  });

  test("preserves same-second blocks, removed logs, uint256, provider lag, and finality stages", async () => {
    const root = tempRoot();
    const journal = database(root);
    seedWatch(journal);
    const lagFixture = structuredClone(fixture);
    lagFixture.head = "101";
    const collector = new EvmCollector({
      database: journal,
      source: new FixtureEvmSource(fixture),
      comparisonSources: [new FixtureEvmSource(lagFixture)],
      maxBlocksPerCycle: 3,
      now: () => fixture.collectedAt as number,
    });

    const first = await collector.collectThrough();
    expect(first).toMatchObject({ blocks: 3, transactions: 2, logs: 1, balances: 3 });
    expect(journal.count("evm_blocks")).toBe(3);
    expect(journal.count("evm_txs")).toBe(2);
    expect(journal.getEvmTransaction("robinhood_chain", `0x${"4".repeat(64)}`)?.valueWei)
      .toBe(BigInt(MAX_UINT256));
    expect(journal.queryEvmLogs("robinhood_chain", 100n, 102n)).toMatchObject([{ removed: true }]);
    expect(journal.queryEvmObservations("robinhood_chain", "block.interval_ms")
      .map((row) => row.value).sort()).toEqual([0, 1_000]);
    expect(journal.queryEvmObservations("robinhood_chain", "head.lag_blocks")[0]?.value).toBe(1);
    expect(journal.queryEvmBalances("robinhood_chain", WATCH)[0]?.rawAmount)
      .toBe(99_999_999_999_999_999_999_999_999_999_999_999_997n);
    expect(journal.queryEvmFinality("robinhood_chain").filter((row) => row.stage === "soft"))
      .toHaveLength(3);

    recordFinalityEvidence(journal, {
      network: "robinhood_chain",
      blockNumber: 102n,
      stage: "l1-posted",
      stageTs: (fixture.collectedAt as number) + 60,
      l1TxHash: `0x${"b".repeat(64)}`,
      evidence: { l1Block: 19_000_002 },
    });
    recordFinalityEvidence(journal, {
      network: "robinhood_chain",
      blockNumber: 102n,
      stage: "l1-final",
      stageTs: (fixture.collectedAt as number) + 840,
      evidence: { finalizedL1Block: 19_000_002 },
    });
    expect(journal.queryEvmFinality("robinhood_chain", 102n).map((row) => row.stage))
      .toEqual(["l1-final", "l1-posted", "soft"]);
    expect(journal.queryEvmObservations("robinhood_chain", "finality.l1_final_ms")[0]?.value)
      .toBe(840_000);

    const counts = {
      blocks: journal.count("evm_blocks"),
      txs: journal.count("evm_txs"),
      logs: journal.count("evm_logs"),
      balances: journal.count("evm_balances"),
    };
    expect((await collector.collectThrough()).blocks).toBe(0);
    expect({
      blocks: journal.count("evm_blocks"),
      txs: journal.count("evm_txs"),
      logs: journal.count("evm_logs"),
      balances: journal.count("evm_balances"),
    }).toEqual(counts);
    expect(journal.queryCrossChainActivity(0, 2_000_000_000)
      .every((row) => row.chainPosition.startsWith("block:"))).toBe(true);
  });

  test("keeps each block and cursor atomic, then resumes through feed hints", async () => {
    const root = tempRoot();
    const journal = database(root);
    const crashing = new EvmCollector({
      database: journal,
      source: new FixtureEvmSource(fixture),
      maxBlocksPerCycle: 3,
      now: () => fixture.collectedAt as number,
      beforeCommit: () => { throw new Error("fixture crash"); },
    });
    await expect(crashing.collectThrough()).rejects.toThrow("fixture crash");
    expect(journal.count("evm_blocks")).toBe(0);
    expect(journal.getCursor("robinhood-rpc:evm-blocks", "robinhood_chain")).toBeNull();

    const resumed = new EvmCollector({
      database: journal,
      source: new FixtureEvmSource(fixture),
      maxBlocksPerCycle: 3,
      now: () => fixture.collectedAt as number,
    });
    async function* heads() {
      yield {
        number: 102n,
        hash: `0x${"3".repeat(64)}`,
        parentHash: `0x${"2".repeat(64)}`,
      };
      yield {
        number: 102n,
        hash: `0x${"3".repeat(64)}`,
        parentHash: `0x${"2".repeat(64)}`,
      };
    }
    const results = await recoverFromHeadFeed(heads(), resumed);
    expect(results.map((result) => result.blocks)).toEqual([3, 0]);
    expect(journal.getCursor("robinhood-rpc:evm-blocks", "robinhood_chain")?.position).toBe("102");
  });

  test("rewinds to a bounded common ancestor and replays over HTTP", async () => {
    const root = tempRoot();
    const journal = database(root);
    const first = new EvmCollector({
      database: journal,
      source: new FixtureEvmSource(fixture),
      maxBlocksPerCycle: 3,
      now: () => fixture.collectedAt as number,
    });
    await first.collectThrough();
    journal.setCursor({
      source: "robinhood-rpc:evm-blocks:backfill:102:103",
      key: "robinhood_chain",
      position: "103",
      updatedAt: fixture.collectedAt,
    });

    const reorg = structuredClone(fixture);
    reorg.head = "103";
    const block102 = reorg.blocks["102"]!;
    block102.hash = `0x${"c".repeat(64)}`;
    reorg.blocks["103"] = {
      number: "103",
      hash: `0x${"d".repeat(64)}`,
      parentHash: block102.hash,
      timestamp: 1_700_000_102,
      l1BlockNumber: "19000001",
      gasUsed: "0",
      baseFeePerGas: "64600000",
      transactions: [],
    };
    const replay = new EvmCollector({
      database: journal,
      source: new FixtureEvmSource(reorg),
      maxBlocksPerCycle: 3,
      maxRewindBlocks: 8,
      now: () => (fixture.collectedAt as number) + 1,
    });
    const result = await replay.collectThrough();
    expect(result.rewoundFrom).toBe("102");
    expect(result.blocks).toBe(2);
    expect(journal.getEvmBlock("robinhood_chain", 102n)?.blockHash).toBe(block102.hash);
    expect(journal.latestEvmBlock("robinhood_chain")?.blockNumber).toBe(103n);
    expect(journal.getCursor(
      "robinhood-rpc:evm-blocks:backfill:102:103",
      "robinhood_chain",
    )?.position).toBe("101");
  });
});

describe("oracle, pool, bridge, CLI, and local workbench surfaces", () => {
  function abi(...values: bigint[]): string {
    return `0x${values.map((value) => value.toString(16).padStart(64, "0")).join("")}`;
  }

  test("records explicit oracle, multiplier, pool, and bridge observations", async () => {
    const root = tempRoot();
    const journal = database(root);
    const calls = structuredClone(fixture);
    const feed = "0x2222222222222222222222222222222222222222";
    const paused = "0x3333333333333333333333333333333333333333";
    const uptime = "0x4444444444444444444444444444444444444444";
    const token = "0x5555555555555555555555555555555555555555";
    calls.calls = {
      [`${feed}@0xfeaf968c@102`]: abi(1n, 123n, 1_700_000_000n, 1_700_000_090n, 1n),
      [`${paused}@0x7706ba52@102`]: abi(0n),
      [`${uptime}@0xfeaf968c@102`]: abi(1n, 0n, 1_700_000_000n, 1_700_000_090n, 1n),
      [`${token}@0xa60bf13d@102`]: abi(BigInt(MAX_UINT256)),
    };
    const source = new FixtureEvmSource(calls);
    const oracle = await observeChainlink(journal, source, 102n, 1_700_000_101, {
      feed,
      key: "fixture-feed",
      pausedContract: paused,
      sequencerUptimeFeed: uptime,
      gracePeriodSeconds: 60,
    }, 1_700_000_200);
    expect(oracle.map((row) => row.series)).toEqual([
      "oracle.age_ms", "oracle.paused", "sequencer.uptime",
    ]);
    expect((await observeUiMultiplier(
      journal, source, token, 102n, "fixture-token", 1_700_000_200,
    )).textValue).toBe(MAX_UINT256);
    expect(recordPoolObservation(journal, {
      pool: paused,
      ts: 1_700_000_201,
      blockNumber: 102n,
      depth1PctUsd: 500_000,
      depth2PctUsd: 750_000,
      spreadBps: 12,
      realizedSlippageBps: 18,
      evidence: { method: "fixture quote simulation" },
    })).toHaveLength(4);
    expect(recordBridgeObservation(journal, {
      route: "canonical",
      ts: 1_700_000_202,
      depositAgeMs: 600_000,
      withdrawalStage: "challenge-window",
      evidence: { source: "fixture L1 read" },
    })).toHaveLength(2);
  });

  test("runs the deterministic Robinhood Chain CLI and exposes local-only state", async () => {
    const root = tempRoot();
    const databasePath = join(root, "cli.db");
    const run = async (args: string[]) => {
      const child = Bun.spawn([process.execPath, "src/cli.ts", ...args], {
        cwd: JOURNAL_ROOT,
        env: { ...process.env, JOURNAL_DB_PATH: databasePath },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      return { stdout, stderr, exitCode };
    };
    expect((await run(["evm-watch", "add", WATCH, "--label", "fixture"])).exitCode).toBe(0);
    const collected = await run(["evm-collect", "--once", "--fixtures", FIXTURE_PATH]);
    expect(collected.stderr).toBe("");
    expect(JSON.parse(collected.stdout).blocks).toBe(3);
    const shown = await run(["evm-show"]);
    expect(shown.stdout).toContain("ROBINHOOD CHAIN READOUT");
    expect(shown.stdout.split("\n").every((line) => Array.from(line).length <= 80)).toBe(true);
    const cross = await run(["cross-show"]);
    expect(cross.stdout).toContain("Robinhood Chain");
    expect(cross.stdout).not.toContain("robinhood_chain");
    expect(cross.stdout).toContain("block:100");

    const journal = openJournalDatabase(databasePath);
    databases.push(journal);
    const response = await handleWorkbenchRequest(
      new Request("http://127.0.0.1/api/evm/state"),
      journal,
    );
    expect(response.status).toBe(200);
    const state = await response.json() as { network: string; head: { blockNumber: string } };
    expect(state.network).toBe("robinhood_chain");
    expect(state.head.blockNumber).toBe("102");
    expect(await handleWorkbenchRequest(new Request("http://127.0.0.1/"), journal)
      .then((item) => item.text())).toContain("ROBINHOOD CHAIN OBSERVATION");

    const guarded = Bun.spawn([process.execPath, "src/cli.ts", "evm-collect", "--watch"], {
      cwd: JOURNAL_ROOT,
      env: {
        ...process.env,
        JOURNAL_DB_PATH: join(root, "guard.db"),
        COLLECT_INTERVAL_MS: "1000",
        ROBINHOOD_CHAIN_RPC_URL: "https://rpc.mainnet.chain.robinhood.com",
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await guarded.exited).toBe(1);
    expect(await new Response(guarded.stderr).text()).toContain("refuses the public Robinhood Chain RPC");
  });
});
