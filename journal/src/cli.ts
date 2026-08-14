import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { acquireCollectorLock, Collector, SourceChain, watchCollector } from "./collect";
import { loadConfig, type JournalConfig } from "./config";
import { openJournalDatabase, type JournalDatabase } from "./db";
import { addressDetail, EMPTY_COMMAND, parseWindow } from "./sim/data";
import { exportJson, exportMarkdown, importJson } from "./sim/export";
import { executeSimulator, type SimResult } from "./sim";
import { JitoSource } from "./sources/jito";
import { FixtureRpcSource, RpcSource } from "./sources/rpc";
import { SolscanSource } from "./sources/solscan";
import type { Source, VenueMetricSource } from "./sources/types";

interface ParsedArguments {
  command: string;
  positionals: string[];
  flags: Map<string, string | true>;
}

const ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const INNER_WIDTH = 78;

function parseArguments(argv: string[]): ParsedArguments {
  const command = argv[0] ?? "help";
  const positionals: string[] = [];
  const flags = new Map<string, string | true>();
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index] as string;
    if (!argument.startsWith("--")) {
      positionals.push(argument);
      continue;
    }
    const key = argument.slice(2);
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags.set(key, next);
      index += 1;
    } else {
      flags.set(key, true);
    }
  }
  return { command, positionals, flags };
}

function stringFlag(arguments_: ParsedArguments, name: string): string | null {
  const value = arguments_.flags.get(name);
  if (value === undefined) return null;
  if (value === true) throw new Error(`--${name} requires a value`);
  return value;
}

function positiveInteger(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error("value must be positive");
  return parsed;
}

function validateAddress(value: string): string {
  if (!ADDRESS_PATTERN.test(value)) throw new Error(`invalid Solana address: ${value}`);
  return value;
}

function sources(
  fixturePath: string | null,
  config: JournalConfig,
): { source: Source; venues: VenueMetricSource[]; now?: () => number } {
  if (fixturePath !== null) {
    const source = FixtureRpcSource.fromFile(resolve(fixturePath));
    return {
      source,
      venues: [],
      now: source.collectedAt === undefined ? undefined : () => source.collectedAt as number,
    };
  }
  const fallbacks: Source[] = [new RpcSource(config.rpcUrl)];
  if (config.solscanApiKey !== null) {
    fallbacks.push(new SolscanSource({ apiKey: config.solscanApiKey }));
  }
  return {
    source: new SourceChain(fallbacks),
    venues: [new JitoSource({ baseUrl: config.jitoApiUrl })],
  };
}

function usage(): string {
  return [
    "usage:",
    "  journal watch add <address> [--label text] [--tag tag]",
    "  journal watch ls | rm <address>",
    "  journal collect --once | --watch [--fixtures path]",
    "  journal backfill <address> [--limit 1000] [--fixtures path]",
    "  journal show <address> [--window 30d]",
    "  journal sim <technique> --address <address> [--window 30d] [--params k=v]",
    "  journal note add <text> [--address addr] [--sim run-id] [--tag tag]",
    "  journal note ls [--address addr] [--tag tag]",
    "  journal export --md | --json [--out file]",
    "  journal import <file>",
    "  journal serve [--port 7817]",
    "  journal migrate",
  ].join("\n");
}

function characters(value: string): string[] {
  return Array.from(value);
}

function fit(value: string, width = INNER_WIDTH): string {
  const chars = characters(value.replaceAll("\n", " "));
  const clipped = chars.length <= width ? chars.join("") : `${chars.slice(0, width - 1).join("")}…`;
  return clipped.padEnd(width, " ");
}

function wrap(value: string, width = INNER_WIDTH): string[] {
  const words = value.trim().split(/\s+/);
  if (words.length === 1 && words[0] === "") return [""];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (characters(word).length > width) {
      if (line !== "") lines.push(line);
      lines.push(fit(word, width).trimEnd());
      line = "";
    } else if (line === "") {
      line = word;
    } else if (characters(`${line} ${word}`).length <= width) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

function panel(title: string, lines: string[]): string {
  return [
    `┌${"─".repeat(INNER_WIDTH)}┐`,
    `│${fit(`SCOPE JOURNAL · ${title.toUpperCase()}`)}│`,
    `├${"─".repeat(INNER_WIDTH)}┤`,
    ...lines.map((line) => `│${fit(line)}│`),
    `└${"─".repeat(INNER_WIDTH)}┘`,
  ].join("\n");
}

function sparkline(points: Array<[number, number]>, width = 28): string {
  if (points.length === 0) return "·".repeat(width);
  const sample = points.length <= width
    ? points
    : Array.from({ length: width }, (_, index) => (
        points[Math.floor(index * (points.length - 1) / (width - 1))] as [number, number]
      ));
  const values = sample.map((point) => point[1]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const bars = "▁▂▃▄▅▆▇█";
  return values.map((value) => {
    const level = max === min ? 3 : Math.round(((value - min) / (max - min)) * 7);
    return bars[level] ?? "▄";
  }).join("").padEnd(width, "·");
}

function number(value: number | null, digits = 4): string {
  return value === null ? "—" : new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
}

function showAddress(database: JournalDatabase, address: string, windowSeconds: number): string {
  const detail = addressDetail(database, address, windowSeconds);
  if (detail === null) throw new Error(`watched address not found: ${address}`);
  if (detail.lastSeen === null) {
    return panel("address · empty", [
      detail.label ?? detail.address,
      "No observations stored. Collect public data first:",
      EMPTY_COMMAND,
    ]);
  }
  const lines = [
    `${detail.label ?? "unlabeled"} · ${detail.address}`,
    `LAST SEEN  ${new Date(detail.lastSeen * 1_000).toISOString()}`,
    `BALANCE    ${number(detail.latest["balance.sol"])} SOL  ${sparkline(detail.balance)}`,
    `FEES       ${number(detail.latest["fees.paid"], 0)} lamports`,
    `TIPS       ${number(detail.latest["tips.paid"], 0)} lamports`,
    `TX RATE    ${number(detail.latest["tx.rate"], 0)} / hour`,
    "",
    "RECENT PUBLIC TRANSACTIONS",
    ...(detail.transactions.length === 0
      ? ["— none in selected window —"]
      : detail.transactions.slice(0, 8).map((tx) => (
          `${tx.signature.slice(0, 12)}…  slot ${String(tx.slot).padStart(8)}  ${(tx.kind ?? "unknown").padEnd(12)}  fee ${number(tx.feeLamports, 0)}`
        ))),
  ];
  return panel("address readout", lines);
}

function parseParams(value: string | null): Record<string, unknown> {
  if (value === null || value.trim() === "") return {};
  return Object.fromEntries(value.split(",").map((pair) => {
    const separator = pair.indexOf("=");
    if (separator < 1) throw new Error(`invalid simulator parameter ${pair}`);
    return [pair.slice(0, separator).trim(), pair.slice(separator + 1).trim()];
  }));
}

function formatSim(result: SimResult, id: string): string {
  const lines = [
    result.stamp,
    `RUN ${id}`,
    "",
    ...wrap(result.summary),
    "",
    "METRICS",
    ...result.metrics.map((metric) => `${metric.k.padEnd(24)} ${metric.v}`),
    "",
    "ASSUMPTIONS",
    ...result.assumptions.flatMap((value, index) => wrap(`${index + 1}. ${value}`)),
    "",
    "CAVEATS",
    ...result.caveats.flatMap((value, index) => wrap(`${index + 1}. ${value}`)),
  ];
  return panel("simulator result", lines);
}

async function collectionCommand(
  arguments_: ParsedArguments,
  config: JournalConfig,
  database: JournalDatabase,
): Promise<number> {
  const fixturePath = stringFlag(arguments_, "fixtures") ?? process.env.JOURNAL_FIXTURES ?? null;
  const selected = sources(fixturePath, config);
  const dataDir = dirname(config.databasePath);
  const collector = new Collector({
    database,
    source: selected.source,
    dataDir,
    venueSources: selected.venues,
    now: selected.now,
  });
  const lock = acquireCollectorLock(resolve(dataDir, "collect.lock"));
  try {
    if (arguments_.command === "backfill") {
      const address = arguments_.positionals[0];
      if (address === undefined) throw new Error("backfill requires an address");
      const result = await collector.backfill(
        validateAddress(address),
        positiveInteger(stringFlag(arguments_, "limit"), 1_000),
      );
      console.log(JSON.stringify(result));
      return 0;
    }

    const watch = arguments_.flags.has("watch");
    if (!watch && !arguments_.flags.has("once")) throw new Error("collect requires --once or --watch");
    if (watch && arguments_.flags.has("once")) throw new Error("choose only one of --once or --watch");
    if (!watch) {
      const summary = await collector.collectOnce();
      console.log(JSON.stringify(summary));
      return summary.failures.length === 0 ? 0 : 1;
    }
    const controller = new AbortController();
    const stop = (): void => controller.abort();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    const summaries = await watchCollector(collector, config.collectIntervalMs, controller.signal);
    const failures = summaries.reduce((total, summary) => total + summary.failures.length, 0);
    return failures === 0 ? 0 : 1;
  } finally {
    lock.release();
  }
}

async function serveCommand(arguments_: ParsedArguments, database: JournalDatabase): Promise<number> {
  const port = positiveInteger(stringFlag(arguments_, "port"), 7_817);
  if (port > 65_535) throw new Error("port must be at most 65535");
  const { startWorkbenchServer } = await import("../web/server");
  const workbench = startWorkbenchServer({ database, port, hostname: "127.0.0.1" });
  console.log(`SCOPE JOURNAL · LOCAL ONLY · http://127.0.0.1:${workbench.port}`);
  await new Promise<void>((resolveStop) => {
    const stop = (): void => resolveStop();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
  workbench.stop();
  return 0;
}

async function main(argv = process.argv.slice(2)): Promise<number> {
  const arguments_ = parseArguments(argv);
  if (arguments_.command === "help" || arguments_.flags.has("help")) {
    console.log(usage());
    return 0;
  }
  const config = loadConfig();
  const database = openJournalDatabase(config.databasePath);
  let closeDatabase = true;
  try {
    const migration = database.migrate();
    database.seedWatchlist(config.watchlist);
    if (arguments_.command === "migrate") {
      console.log(JSON.stringify({ migration, seeded: config.watchlist.length }));
      return 0;
    }
    if (arguments_.command === "collect" || arguments_.command === "backfill") {
      return await collectionCommand(arguments_, config, database);
    }

    if (arguments_.command === "watch") {
      const action = arguments_.positionals[0];
      if (action === "add") {
        const address = validateAddress(arguments_.positionals[1] ?? "");
        database.upsertAddress({
          address,
          label: stringFlag(arguments_, "label"),
          tags: stringFlag(arguments_, "tag") === null ? [] : [stringFlag(arguments_, "tag") as string],
          active: true,
        });
        console.log(panel("watch added", [address]));
        return 0;
      }
      if (action === "rm") {
        const address = validateAddress(arguments_.positionals[1] ?? "");
        if (!database.setAddressActive(address, false)) throw new Error(`watched address not found: ${address}`);
        console.log(panel("watch paused", [address, "Historical observations were retained."]));
        return 0;
      }
      if (action === "ls") {
        const rows = database.listAddresses(true);
        console.log(panel("watchlist", rows.length === 0
          ? ["No watched addresses.", EMPTY_COMMAND]
          : rows.map((row) => `${(row.label ?? "unlabeled").padEnd(20)} ${row.address}`)));
        return 0;
      }
      throw new Error("watch requires add, ls, or rm");
    }

    if (arguments_.command === "show") {
      const address = validateAddress(arguments_.positionals[0] ?? "");
      console.log(showAddress(database, address, parseWindow(stringFlag(arguments_, "window") ?? "30d")));
      return 0;
    }

    if (arguments_.command === "sim") {
      const id = arguments_.positionals[0];
      if (id === undefined) throw new Error("sim requires a technique id");
      const address = validateAddress(stringFlag(arguments_, "address") ?? "");
      const run = executeSimulator({
        database,
        id,
        address,
        rawParams: parseParams(stringFlag(arguments_, "params")),
        windowSeconds: parseWindow(stringFlag(arguments_, "window") ?? "30d"),
      });
      console.log(formatSim(run.result as SimResult, run.id));
      return 0;
    }

    if (arguments_.command === "note") {
      const action = arguments_.positionals[0];
      if (action === "add") {
        const body = arguments_.positionals[1];
        if (body === undefined) throw new Error("note add requires text");
        const address = stringFlag(arguments_, "address");
        const entry = database.addJournalEntry({
          body,
          address: address === null ? null : validateAddress(address),
          simRun: stringFlag(arguments_, "sim"),
          tags: stringFlag(arguments_, "tag") === null ? [] : [stringFlag(arguments_, "tag") as string],
        });
        console.log(panel("note saved", [entry.id, ...wrap(entry.body)]));
        return 0;
      }
      if (action === "ls") {
        const address = stringFlag(arguments_, "address");
        const entries = database.listJournalEntries({
          address: address === null ? undefined : validateAddress(address),
          tag: stringFlag(arguments_, "tag") ?? undefined,
        });
        console.log(panel("journal", entries.length === 0
          ? ["No journal entries yet."]
          : entries.flatMap((entry) => [
              `${new Date(entry.ts * 1_000).toISOString()} · ${entry.id}`,
              ...wrap(entry.body, INNER_WIDTH - 2).map((line) => `  ${line}`),
            ])));
        return 0;
      }
      throw new Error("note requires add or ls");
    }

    if (arguments_.command === "export") {
      const json = arguments_.flags.has("json");
      if (json && arguments_.flags.has("md")) throw new Error("choose only one export format");
      const output = json ? exportJson(database) : exportMarkdown(database);
      const path = stringFlag(arguments_, "out");
      if (path === null) console.log(output.trimEnd());
      else writeFileSync(resolve(path), output);
      return 0;
    }

    if (arguments_.command === "import") {
      const path = arguments_.positionals[0];
      if (path === undefined) throw new Error("import requires a JSON file");
      const imported = importJson(database, readFileSync(resolve(path), "utf8"));
      console.log(panel("import complete", [
        `${imported.simRuns.length} simulator runs`,
        `${imported.entries.length} journal entries`,
      ]));
      return 0;
    }

    if (arguments_.command === "serve") {
      closeDatabase = false;
      try {
        return await serveCommand(arguments_, database);
      } finally {
        closeDatabase = true;
      }
    }
    throw new Error(`unknown command ${arguments_.command}\n${usage()}`);
  } finally {
    if (closeDatabase) database.close();
  }
}

if (import.meta.main) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

export { main };
