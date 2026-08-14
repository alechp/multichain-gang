import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SourceChain } from "../src/collect";
import { JitoSource } from "../src/sources/jito";
import { FixtureRpcSource, RpcSource, type RpcFixture } from "../src/sources/rpc";
import { ScrapeSource, robotsAllows } from "../src/sources/scrape";
import { SolscanSource } from "../src/sources/solscan";
import type { FetchLike, Source } from "../src/sources/types";

const ADDRESS = "11111111111111111111111111111111";
const tempRoots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "scope-journal-sources-"));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root !== undefined) rmSync(root, { recursive: true, force: true });
  }
});

describe("RPC source", () => {
  test("backs off on 429 and requests only signatures newer than its cursor", async () => {
    const delays: number[] = [];
    const bodies: Array<Record<string, unknown>> = [];
    let calls = 0;
    const fetcher: FetchLike = async (_input, init) => {
      calls += 1;
      bodies.push(JSON.parse(init?.body as string) as Record<string, unknown>);
      if (calls === 1) {
        return new Response("busy", { status: 429, headers: { "retry-after": "0" } });
      }
      return Response.json({
        jsonrpc: "2.0",
        id: 1,
        result: [{ signature: "3".repeat(64), slot: 10, blockTime: 20, err: null }],
      });
    };
    const source = new RpcSource("https://rpc.example.test", {
      fetch: fetcher,
      sleep: async (ms) => { delays.push(ms); },
      pageSize: 10,
    });
    const rows = [];
    for await (const row of source.signatures(ADDRESS, "4".repeat(64))) rows.push(row);
    expect(rows).toEqual([{
      signature: "3".repeat(64),
      slot: 10,
      blockTime: 20,
      err: false,
    }]);
    expect(delays).toEqual([0]);
    expect((bodies[1]?.params as [string, Record<string, unknown>])[1]).toMatchObject({
      until: "4".repeat(64),
      limit: 10,
    });
  });

  test("batches native and token balance reads and reorders responses by id", async () => {
    const fetcher: FetchLike = async (_input, init) => {
      const calls = JSON.parse(init?.body as string) as Array<{
        id: number;
        method: string;
      }>;
      const responses = calls.map((call) => ({
        jsonrpc: "2.0",
        id: call.id,
        result: call.method === "getBalance"
          ? { context: { slot: 10 }, value: 2_000_000_000 }
          : {
              context: { slot: 11 },
              value: [{
                account: {
                  data: {
                    parsed: {
                      info: {
                        mint: "So11111111111111111111111111111111111111112",
                        tokenAmount: { uiAmount: 1.5 },
                      },
                    },
                  },
                },
              }],
            },
      })).reverse();
      return Response.json(responses);
    };
    const source = new RpcSource("https://rpc.example.test", { fetch: fetcher });
    expect(await source.balances(ADDRESS)).toEqual({
      slot: 11,
      solLamports: 2_000_000_000,
      tokenBalances: { So11111111111111111111111111111111111111112: 1.5 },
    });
  });
});

describe("fallback and enrichment sources", () => {
  test("falls through a failed RPC capability to the next source", async () => {
    const fixture: RpcFixture = {
      addresses: {
        [ADDRESS]: {
          signatures: [{ signature: "3".repeat(64), slot: 1, blockTime: 2, err: false }],
          balances: { slot: 1, solLamports: 10, tokenBalances: {} },
        },
      },
      transactions: {},
    };
    const failed: Source = {
      id: "rpc",
      async *signatures() { throw new Error("offline"); },
      async transaction() { throw new Error("offline"); },
      async balances() { throw new Error("offline"); },
      async health() { return { ok: false, latencyMs: 0 }; },
    };
    const chain = new SourceChain([failed, new FixtureRpcSource(fixture)]);
    const rows = [];
    for await (const row of chain.signatures(ADDRESS, null)) rows.push(row);
    expect(rows).toHaveLength(1);
    expect(await chain.balances(ADDRESS)).toEqual({ slot: 1, solLamports: 10, tokenBalances: {} });
  });

  test("uses Solscan v2 account history with the token header", async () => {
    let token = "";
    const source = new SolscanSource({
      apiKey: "fixture-token",
      fetch: async (input, init) => {
        token = new Headers(init?.headers).get("token") ?? "";
        expect(new URL(String(input)).pathname).toBe("/v2.0/account/transactions");
        return Response.json({
          success: true,
          data: [{
            tx_hash: "3".repeat(64),
            slot: 10,
            block_time: 20,
            status: "Success",
          }],
        });
      },
    });
    const rows = [];
    for await (const row of source.signatures(ADDRESS, null)) rows.push(row);
    expect(token).toBe("fixture-token");
    expect(rows).toEqual([{
      signature: "3".repeat(64),
      slot: 10,
      blockTime: 20,
      err: false,
    }]);
  });

  test("normalizes Jito's public tip floor into venue metrics", async () => {
    const source = new JitoSource({
      fetch: async () => Response.json([{
        time: "2026-08-14T12:00:00Z",
        landed_tips_25th_percentile: 0.000001,
        landed_tips_50th_percentile: 0.000002,
        landed_tips_75th_percentile: 0.000003,
        landed_tips_95th_percentile: 0.000004,
        landed_tips_99th_percentile: 0.000005,
        ema_landed_tips_50th_percentile: 0.0000025,
      }]),
    });
    const metrics = await source.metrics();
    expect(metrics).toHaveLength(6);
    expect(metrics.every((row) => row.series === "venue.jito.tip_floor")).toBe(true);
    expect(metrics.find((row) => row.key === "p50")?.value).toBe(0.000002);
  });
});

describe("HTML fallback etiquette", () => {
  test("never opens a socket while disabled", async () => {
    let calls = 0;
    const source = new ScrapeSource({
      enabled: false,
      cacheDir: tempRoot(),
      fetch: async () => {
        calls += 1;
        return new Response("unexpected");
      },
    });
    expect(source.fetchText("https://example.test/page")).rejects.toThrow("disabled");
    expect(calls).toBe(0);
  });

  test("obeys robots, spaces every host request by two seconds, and caches", async () => {
    let now = 0;
    const times: number[] = [];
    const agents: string[] = [];
    const sleeps: number[] = [];
    const source = new ScrapeSource({
      enabled: true,
      cacheDir: tempRoot(),
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
      fetch: async (input, init) => {
        times.push(now);
        agents.push(new Headers(init?.headers).get("user-agent") ?? "");
        const url = new URL(String(input));
        return url.pathname === "/robots.txt"
          ? new Response("User-agent: *\nDisallow: /private\nAllow: /public")
          : new Response(`body:${url.pathname}`);
      },
    });

    expect(await source.fetchText("https://example.test/public/a")).toBe("body:/public/a");
    expect(await source.fetchText("https://example.test/public/b")).toBe("body:/public/b");
    expect(await source.fetchText("https://example.test/public/a")).toBe("body:/public/a");
    expect(times).toEqual([0, 2_000, 4_000]);
    expect(sleeps).toEqual([2_000, 2_000]);
    expect(agents.every((agent) => agent.startsWith("scope-journal/"))).toBe(true);
    expect(source.fetchText("https://example.test/private/a")).rejects.toThrow("robots.txt");
  });

  test("opens a thirty-minute circuit on refusal or throttling", async () => {
    let now = 0;
    let calls = 0;
    const source = new ScrapeSource({
      enabled: true,
      cacheDir: tempRoot(),
      now: () => now,
      sleep: async (ms) => { now += ms; },
      fetch: async (input) => {
        calls += 1;
        return new URL(String(input)).pathname === "/robots.txt"
          ? new Response("User-agent: *\nAllow: /")
          : new Response("slow down", { status: 429 });
      },
    });
    expect(source.fetchText("https://circuit.example.test/a")).rejects.toThrow("HTTP 429");
    expect(source.fetchText("https://circuit.example.test/b")).rejects.toThrow("circuit open");
    expect(calls).toBe(2);
  });

  test("applies longest-match robots rules", () => {
    const robots = "User-agent: *\nDisallow: /private\nAllow: /private/status";
    expect(robotsAllows(robots, "/private/data")).toBe(false);
    expect(robotsAllows(robots, "/private/status")).toBe(true);
    expect(robotsAllows(robots, "/public")).toBe(true);
    expect(robotsAllows(
      "User-agent: *\nDisallow: /\nUser-agent: scope-journal\nAllow: /public",
      "/public",
    )).toBe(true);
  });
});
