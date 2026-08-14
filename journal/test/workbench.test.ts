import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Collector } from "../src/collect";
import { loadConfig } from "../src/config";
import { openJournalDatabase, type JournalDatabase } from "../src/db";
import { addressDetail, EMPTY_COMMAND, workbenchState } from "../src/sim/data";
import { exportJson, exportMarkdown, importJson } from "../src/sim/export";
import { executeSimulator, PAPER_STAMP, validateSimResult } from "../src/sim";
import { FixtureRpcSource, type RpcFixture } from "../src/sources/rpc";
import { handleWorkbenchRequest, startWorkbenchServer } from "../web/server";

const JOURNAL_ROOT = resolve(import.meta.dir, "..");
const REPO_ROOT = resolve(JOURNAL_ROOT, "..");
const CONFIG_PATH = resolve(JOURNAL_ROOT, "journal.config.json");
const COLLECTOR_FIXTURE_PATH = resolve(import.meta.dir, "fixtures", "collector.json");
const VENUE_FIXTURE_PATH = resolve(import.meta.dir, "fixtures", "workbench-venue.json");
const ADDRESS = "11111111111111111111111111111111";
const fixture = JSON.parse(readFileSync(COLLECTOR_FIXTURE_PATH, "utf8")) as RpcFixture;
const venue = JSON.parse(readFileSync(VENUE_FIXTURE_PATH, "utf8")) as {
  series: Array<{ ts: number; series: string; key: string; value: number }>;
};
const tempRoots: string[] = [];
const databases: JournalDatabase[] = [];

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "scope-journal-j3-"));
  tempRoots.push(root);
  return root;
}

function openDatabase(path: string): JournalDatabase {
  const database = openJournalDatabase(path);
  databases.push(database);
  database.migrate();
  return database;
}

async function collectedDatabase(root: string): Promise<JournalDatabase> {
  const database = openDatabase(join(root, "journal.db"));
  const config = loadConfig({ configPath: CONFIG_PATH, env: {} });
  database.seedWatchlist(config.watchlist);
  const collector = new Collector({
    database,
    source: new FixtureRpcSource(fixture),
    dataDir: root,
    now: () => fixture.collectedAt as number,
  });
  const summary = await collector.collectOnce();
  if (summary.failures.length > 0) throw new Error(JSON.stringify(summary.failures));
  for (const metric of venue.series) database.upsertMetric(metric);
  return database;
}

async function runCli(databasePath: string, args: string[]): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
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
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root !== undefined) rmSync(root, { recursive: true, force: true });
  }
});

describe("paper simulators and journal export", () => {
  test("runs two models on collected fixture data and links notes", async () => {
    const root = tempRoot();
    const database = await collectedDatabase(root);
    const priority = executeSimulator({
      database,
      id: "priority-fee-sweep",
      address: ADDRESS,
      windowSeconds: 30 * 86_400,
      runTs: 1_700_005_000,
    });
    const gap = executeSimulator({
      database,
      id: "cexdex-gap-watch",
      address: ADDRESS,
      windowSeconds: 30 * 86_400,
      rawParams: { thresholdBps: 35 },
      runTs: 1_700_005_100,
    });

    for (const run of [priority, gap]) {
      validateSimResult(run.result);
      const result = run.result as ReturnType<typeof JSON.parse>;
      expect(result.stamp).toBe(PAPER_STAMP);
      expect(result.assumptions.length).toBeGreaterThanOrEqual(3);
      expect(result.caveats.length).toBeGreaterThanOrEqual(2);
      expect(result.series.some((series: { points: unknown[] }) => series.points.length > 0)).toBe(true);
    }
    expect((gap.result as { metrics: Array<{ k: string; v: string }> }).metrics).toContainEqual({
      k: "FLAGS",
      v: "2",
    });
    const entry = database.addJournalEntry({
      ts: 1_700_005_200,
      body: "Fixture trace crossed the paper detector threshold.",
      address: ADDRESS,
      simRun: gap.id,
      tags: ["fixture", "review"],
    });
    expect(database.listJournalEntries({ tag: "review" })[0]?.simRun).toBe(gap.id);

    const markdown = exportMarkdown(database, new Date("2026-08-14T00:00:00Z"));
    expect(markdown).toContain(PAPER_STAMP);
    expect(markdown).toContain("### Caveats");
    expect(markdown).toContain(entry.body);
    const json = exportJson(database, new Date("2026-08-14T00:00:00Z"));
    const imported = openDatabase(join(root, "roundtrip.db"));
    importJson(imported, json);
    expect(imported.count("addresses")).toBe(3);
    expect(imported.count("sim_runs")).toBe(2);
    expect(imported.count("journal_entries")).toBe(1);
    expect(exportJson(imported, new Date("2026-08-14T00:00:00Z"))).toBe(json);
  });

  test("keeps an empty store instructive and stable", () => {
    const root = tempRoot();
    const database = openDatabase(join(root, "empty.db"));
    const state = workbenchState(database);
    expect(state.empty).toBe(true);
    expect(state.selected).toBeNull();
    expect(state.emptyCommand).toBe(EMPTY_COMMAND);
    expect(exportMarkdown(database)).toContain("No notes or simulator runs yet");
  });
});

describe("workbench CLI", () => {
  test("show, sim, note, and export remain coherent at 80 columns", async () => {
    const root = tempRoot();
    const databasePath = join(root, "journal.db");
    const database = await collectedDatabase(root);
    database.close();
    databases.pop();

    const show = await runCli(databasePath, ["show", ADDRESS, "--window", "30d"]);
    expect(show.exitCode).toBe(0);
    expect(show.stderr).toBe("");
    expect(show.stdout).toContain("2.5 SOL");
    expect(show.stdout.split("\n").every((line) => Array.from(line).length <= 80)).toBe(true);

    const priority = await runCli(databasePath, [
      "sim", "priority-fee-sweep", "--address", ADDRESS, "--window", "30d",
    ]);
    expect(priority.exitCode).toBe(0);
    expect(priority.stdout).toContain(PAPER_STAMP);
    expect(priority.stdout.split("\n").every((line) => Array.from(line).length <= 80)).toBe(true);
    const gap = await runCli(databasePath, [
      "sim", "cexdex-gap-watch", "--address", ADDRESS, "--window", "30d",
      "--params", "thresholdBps=35",
    ]);
    expect(gap.exitCode).toBe(0);
    expect(gap.stdout).toContain(PAPER_STAMP);

    const inspect = openJournalDatabase(databasePath);
    const runId = inspect.listSimRuns()[0]?.id;
    inspect.close();
    expect(runId).toBeDefined();
    const note = await runCli(databasePath, [
      "note", "add", "CLI-linked paper observation", "--address", ADDRESS,
      "--sim", runId as string, "--tag", "cli",
    ]);
    expect(note.exitCode).toBe(0);
    const notes = await runCli(databasePath, ["note", "ls", "--tag", "cli"]);
    expect(notes.stdout).toContain("CLI-linked paper observation");
    expect(notes.stdout.split("\n").every((line) => Array.from(line).length <= 80)).toBe(true);

    const markdownPath = join(root, "journal.md");
    const jsonPath = join(root, "journal.json");
    expect((await runCli(databasePath, ["export", "--md", "--out", markdownPath])).exitCode).toBe(0);
    expect((await runCli(databasePath, ["export", "--json", "--out", jsonPath])).exitCode).toBe(0);
    expect(readFileSync(markdownPath, "utf8")).toContain("### Caveats");
    expect(JSON.parse(readFileSync(jsonPath, "utf8")).simRuns).toHaveLength(2);
    const importedPath = join(root, "cli-import.db");
    expect((await runCli(importedPath, ["import", jsonPath])).exitCode).toBe(0);
    const imported = openJournalDatabase(importedPath);
    expect(imported.count("sim_runs")).toBe(2);
    expect(imported.count("journal_entries")).toBe(1);
    imported.close();
  });

  test("adds, lists, and pauses watches without losing their rows", async () => {
    const root = tempRoot();
    const databasePath = join(root, "watch.db");
    const custom = "6".repeat(44);
    const added = await runCli(databasePath, [
      "watch", "add", custom, "--label", "fixture-watch", "--tag", "paper",
    ]);
    expect(added.exitCode).toBe(0);
    expect((await runCli(databasePath, ["watch", "ls"])).stdout).toContain(custom);
    expect((await runCli(databasePath, ["watch", "rm", custom])).exitCode).toBe(0);
    expect((await runCli(databasePath, ["watch", "ls"])).stdout).not.toContain(custom);
    const database = openJournalDatabase(databasePath);
    expect(database.getAddress(custom)?.active).toBe(false);
    database.close();
  });
});

describe("local HTTP workbench", () => {
  test("serves local state and persists paper runs and linked notes", async () => {
    const root = tempRoot();
    const database = await collectedDatabase(root);
    const request = (path: string, init?: RequestInit) =>
      handleWorkbenchRequest(new Request(`http://127.0.0.1${path}`, init), database);
    const health = await request("/api/health").then((response) => response.json());
    expect(health).toEqual({ ok: true, localOnly: true });
    const state = await request(`/api/state?address=${ADDRESS}&window=30d`)
      .then((response) => response.json()) as ReturnType<typeof workbenchState>;
    expect(state.selected?.latest["balance.sol"]).toBe(
      addressDetail(database, ADDRESS)?.latest["balance.sol"],
    );
    const simResponse = await request("/api/sim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "cexdex-gap-watch", address: ADDRESS, window: "30d" }),
    });
    expect(simResponse.status).toBe(201);
    const run = await simResponse.json() as { id: string; result: { stamp: string } };
    expect(run.result.stamp).toBe(PAPER_STAMP);
    const noteResponse = await request("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: "Workbench-linked observation",
          address: ADDRESS,
          simRun: run.id,
          tags: ["web"],
        }),
    });
    expect(noteResponse.status).toBe(201);
    expect(await request("/").then((response) => response.text())).toContain("SCOPE <span>JOURNAL");
    const styles = await request("/styles.css");
    expect(styles.headers.get("content-security-policy")).toContain("connect-src 'self'");
  });

  test("refuses non-local host binding", () => {
    const root = tempRoot();
    const database = openDatabase(join(root, "local.db"));
    expect(() => startWorkbenchServer({ database, hostname: "0.0.0.0", port: 0 })).toThrow(
      "refuses non-local bind",
    );
  });

  test("keeps copied design tokens in exact sync", async () => {
    const child = Bun.spawn([process.execPath, "scripts/check-tokens.mjs"], {
      cwd: REPO_ROOT,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await child.exited).toBe(0);
    expect(await new Response(child.stdout).text()).toContain("token sync: pass");
  });
});
