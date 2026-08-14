import { dirname, resolve } from "node:path";
import { acquireCollectorLock, Collector, SourceChain, watchCollector } from "./collect";
import { loadConfig } from "./config";
import { openJournalDatabase } from "./db";
import { JitoSource } from "./sources/jito";
import { FixtureRpcSource, RpcSource } from "./sources/rpc";
import { SolscanSource } from "./sources/solscan";
import type { Source, VenueMetricSource } from "./sources/types";

interface ParsedArguments {
  command: string;
  positionals: string[];
  flags: Map<string, string | true>;
}

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
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error("limit must be positive");
  return parsed;
}

function sources(
  fixturePath: string | null,
  rpcUrl: string,
  solscanApiKey: string | null,
  jitoApiUrl: string,
): { source: Source; venues: VenueMetricSource[]; now?: () => number } {
  if (fixturePath !== null) {
    const source = FixtureRpcSource.fromFile(resolve(fixturePath));
    return {
      source,
      venues: [],
      now: source.collectedAt === undefined ? undefined : () => source.collectedAt as number,
    };
  }
  const fallbacks: Source[] = [new RpcSource(rpcUrl)];
  if (solscanApiKey !== null) fallbacks.push(new SolscanSource({ apiKey: solscanApiKey }));
  return {
    source: new SourceChain(fallbacks),
    venues: [new JitoSource({ baseUrl: jitoApiUrl })],
  };
}

function usage(): string {
  return [
    "usage:",
    "  journal collect --once [--fixtures path]",
    "  journal collect --watch [--fixtures path]",
    "  journal backfill <address> [--limit 1000] [--fixtures path]",
    "  journal migrate",
  ].join("\n");
}

async function main(argv = process.argv.slice(2)): Promise<number> {
  const arguments_ = parseArguments(argv);
  if (arguments_.command === "help" || arguments_.flags.has("help")) {
    console.log(usage());
    return 0;
  }
  const config = loadConfig();
  const database = openJournalDatabase(config.databasePath);
  try {
    const migration = database.migrate();
    database.seedWatchlist(config.watchlist);
    if (arguments_.command === "migrate") {
      console.log(JSON.stringify({ migration, seeded: config.watchlist.length }));
      return 0;
    }

    const fixturePath = stringFlag(arguments_, "fixtures") ?? process.env.JOURNAL_FIXTURES ?? null;
    const selected = sources(
      fixturePath,
      config.rpcUrl,
      config.solscanApiKey,
      config.jitoApiUrl,
    );
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
      if (arguments_.command === "collect") {
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
        const summaries = await watchCollector(
          collector,
          config.collectIntervalMs,
          controller.signal,
        );
        const failures = summaries.reduce((total, summary) => total + summary.failures.length, 0);
        return failures === 0 ? 0 : 1;
      }

      if (arguments_.command === "backfill") {
        const address = arguments_.positionals[0];
        if (address === undefined) throw new Error("backfill requires an address");
        const limit = positiveInteger(stringFlag(arguments_, "limit"), 1_000);
        const result = await collector.backfill(address, limit);
        console.log(JSON.stringify(result));
        return 0;
      }
      throw new Error(`unknown command ${arguments_.command}\n${usage()}`);
    } finally {
      lock.release();
    }
  } finally {
    database.close();
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
