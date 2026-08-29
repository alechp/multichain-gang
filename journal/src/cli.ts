import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { acquireCollectorLock, Collector, SourceChain, watchCollector } from "./collect";
import { loadConfig, type JournalConfig } from "./config";
import { openJournalDatabase, type JournalDatabase } from "./db";
import { EvmCollector } from "./evm-collect";
import { normalizeEvmAddress } from "./evm-types";
import { addressDetail, EMPTY_COMMAND, parseWindow } from "./sim/data";
import { exportJson, exportMarkdown, importJson } from "./sim/export";
import { executeSimulator, type SimResult } from "./sim";
import { JitoSource } from "./sources/jito";
import { FixtureRpcSource, RpcSource } from "./sources/rpc";
import { EvmRpcSource, FixtureEvmSource } from "./sources/evm-rpc";
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
    "  journal evm-watch add <address> [--label text] [--tag tag]",
    "  journal evm-watch ls | rm <address>",
    "  journal evm-collect --once | --watch [--fixtures path]",
    "  journal evm-backfill --from block --to block [--fixtures path]",
    "  journal evm-show",
    "  journal cross-show",
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

function showEvm(database: JournalDatabase): string {
  const overview = database.evmNetworkOverview("robinhood_chain");
  if (overview.head === null) {
    return panel("Robinhood Chain · empty", [
      "No Robinhood Chain observations stored.",
      "Run: bun run journal -- evm-collect --once",
      "Soft state only; L1 stages require explicit evidence.",
    ]);
  }
  const headFinality = overview.finality.filter((row) => row.blockNumber === overview.head?.blockNumber);
  return panel("Robinhood Chain readout", [
    `HEAD        block ${overview.head.blockNumber} · ${new Date(overview.head.ts * 1_000).toISOString()}`,
    `HASH        ${overview.head.blockHash.slice(0, 18)}…`,
    `TX / GAS    ${overview.head.txCount} / ${overview.head.gasUsed}`,
    `FINALITY    ${headFinality.map((row) => row.stage).join(" → ") || "soft evidence pending"}`,
    `WATCHES     ${overview.addresses.length}`,
    "",
    "RECENT ROBINHOOD CHAIN ACTIVITY",
    ...(overview.activity.length === 0
      ? ["— no transactions in collected blocks —"]
      : overview.activity.slice(0, 8).map((row) => (
          `${row.txId.slice(0, 14)}…  ${row.chainPosition.padEnd(16)} ${row.status.padEnd(8)} ${row.kind}`
        ))),
    "",
    "LATEST OBSERVATION SURFACES",
    ...(overview.observations.length === 0
      ? ["— none —"]
      : overview.observations.slice(0, 8).map((row) => (
          `${row.series.padEnd(25)} ${String(row.value ?? row.textValue ?? "—")}`
        ))),
  ]);
}

function showCrossChain(database: JournalDatabase): string {
  const rows = database.queryCrossChainActivity(0, Number.MAX_SAFE_INTEGER, 50);
  return panel("cross-chain activity", rows.length === 0
    ? ["No Solana or Robinhood Chain activity stored."]
    : rows.flatMap((row) => [
        `${new Date(row.ts * 1_000).toISOString()} · ${row.network === "robinhood_chain" ? "Robinhood Chain" : "Solana"}`,
        `  ${row.chainPosition.padEnd(18)} ${row.status.padEnd(10)} ${row.kind.padEnd(14)} ${row.txId.slice(0, 18)}…`,
      ]));
}

function evmJson(value: unknown): string {
  return JSON.stringify(value, (key, item) => (
    key === "network" && item === "robinhood_chain" ? "Robinhood Chain" : item
  ));
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

function bigintFlag(arguments_: ParsedArguments, name: string): bigint {
  const value = stringFlag(arguments_, name);
  if (value === null || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`--${name} requires an unsigned decimal block number`);
  }
  return BigInt(value);
}

async function evmCollectionCommand(
  arguments_: ParsedArguments,
  config: JournalConfig,
  database: JournalDatabase,
): Promise<number> {
  const fixturePath = stringFlag(arguments_, "fixtures") ?? process.env.JOURNAL_EVM_FIXTURES ?? null;
  const fixture = fixturePath === null ? null : FixtureEvmSource.fromFile(resolve(fixturePath));
  const source = fixture ?? new EvmRpcSource(config.networks.robinhood_chain.rpcUrl);
  const fixtureBlocks = fixture === null ? null : Object.keys(fixture.fixture.blocks).length;
  const collector = new EvmCollector({
    database,
    source,
    comparisonSources: fixture === null
      ? config.networks.robinhood_chain.comparisonRpcUrls.map((endpoint) => (
          new EvmRpcSource(endpoint, { id: "robinhood-node" })
        ))
      : [],
    maxBlocksPerCycle: fixtureBlocks
      ?? (config.networks.robinhood_chain.rpcUrlIsPublic
        ? 1
        : config.networks.robinhood_chain.maxBlocksPerCycle),
    maxRewindBlocks: config.networks.robinhood_chain.maxRewindBlocks,
    now: fixture?.collectedAt === undefined ? undefined : () => fixture.collectedAt as number,
  });
  const lock = acquireCollectorLock(resolve(dirname(config.databasePath), "evm-collect.lock"));
  try {
    if (arguments_.command === "evm-backfill") {
      const result = await collector.backfill(
        bigintFlag(arguments_, "from"),
        bigintFlag(arguments_, "to"),
      );
      console.log(evmJson(result));
      return 0;
    }

    const watch = arguments_.flags.has("watch");
    if (!watch && !arguments_.flags.has("once")) throw new Error("evm-collect requires --once or --watch");
    if (watch && arguments_.flags.has("once")) throw new Error("choose only one of --once or --watch");
    if (!watch) {
      console.log(evmJson(await collector.collectThrough()));
      return 0;
    }
    if (
      fixture === null
      && config.networks.robinhood_chain.rpcUrlIsPublic
      && config.collectIntervalMs < 60_000
      && !arguments_.flags.has("allow-public-rpc-watch")
    ) {
      throw new Error(
        "high-frequency watch refuses the public Robinhood Chain RPC; configure a provider or pass --allow-public-rpc-watch",
      );
    }
    const controller = new AbortController();
    const stop = (): void => controller.abort();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    let failed = false;
    while (!controller.signal.aborted) {
      const result = await collector.collectSafe();
      console.log(evmJson(result));
      failed ||= "error" in result;
      if (controller.signal.aborted) break;
      await Bun.sleep(config.collectIntervalMs);
    }
    return failed ? 1 : 0;
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
    database.seedEvmWatchlist(config.evmWatchlist);
    if (arguments_.command === "migrate") {
      console.log(JSON.stringify({
        migration,
        seeded: config.watchlist.length,
        evmSeeded: config.evmWatchlist.length,
      }));
      return 0;
    }
    if (arguments_.command === "collect" || arguments_.command === "backfill") {
      return await collectionCommand(arguments_, config, database);
    }
    if (arguments_.command === "evm-collect" || arguments_.command === "evm-backfill") {
      return await evmCollectionCommand(arguments_, config, database);
    }

    if (arguments_.command === "evm-watch") {
      const action = arguments_.positionals[0];
      if (action === "add") {
        const selected = normalizeEvmAddress(arguments_.positionals[1] ?? "");
        database.upsertEvmAddress({
          network: "robinhood_chain",
          address: selected.address,
          label: stringFlag(arguments_, "label"),
          tags: stringFlag(arguments_, "tag") === null ? [] : [stringFlag(arguments_, "tag") as string],
          active: true,
        });
        console.log(panel("Robinhood Chain watch added", [selected.checksumAddress]));
        return 0;
      }
      if (action === "rm") {
        const selected = normalizeEvmAddress(arguments_.positionals[1] ?? "");
        if (!database.setEvmAddressActive("robinhood_chain", selected.address, false)) {
          throw new Error(`Robinhood Chain watch not found: ${selected.checksumAddress}`);
        }
        console.log(panel("Robinhood Chain watch paused", [
          selected.checksumAddress,
          "Historical observations were retained.",
        ]));
        return 0;
      }
      if (action === "ls") {
        const rows = database.listEvmAddresses("robinhood_chain", true);
        console.log(panel("Robinhood Chain watchlist", rows.length === 0
          ? ["No watched EVM addresses."]
          : rows.map((row) => `${(row.label ?? "unlabeled").padEnd(20)} ${row.checksumAddress}`)));
        return 0;
      }
      throw new Error("evm-watch requires add, ls, or rm");
    }

    if (arguments_.command === "evm-show") {
      console.log(showEvm(database));
      return 0;
    }

    if (arguments_.command === "cross-show") {
      console.log(showCrossChain(database));
      return 0;
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
