import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface WatchAddressConfig {
  address: string;
  label: string | null;
  tags: string[];
  active: boolean;
}

export interface JournalConfig {
  configPath: string;
  databasePath: string;
  rpcUrl: string;
  solscanApiKey: string | null;
  jitoApiUrl: string;
  collectIntervalMs: number;
  scrapeEnabled: boolean;
  watchlist: WatchAddressConfig[];
}

interface ConfigFile {
  databasePath?: unknown;
  rpcUrl?: unknown;
  solscanApiKey?: unknown;
  jitoApiUrl?: unknown;
  collectIntervalMs?: unknown;
  scrapeEnabled?: unknown;
  watchlist?: unknown;
}

export interface LoadConfigOptions {
  configPath?: string;
  env?: Record<string, string | undefined>;
}

const DEFAULT_CONFIG_PATH = resolve(import.meta.dir, "..", "journal.config.json");
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  return requiredString(value, field);
}

function publicHttpUrl(value: unknown, field: string): string {
  const text = requiredString(value, field);
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    throw new Error(`${field} must be a valid URL`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${field} must use http or https`);
  }
  return parsed.toString().replace(/\/$/, "");
}

function positiveInterval(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1_000) {
    throw new Error("collectIntervalMs must be an integer of at least 1000");
  }
  return parsed;
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  throw new Error(`${field} must be true/false or 1/0`);
}

function watchlistValue(value: unknown): WatchAddressConfig[] {
  if (!Array.isArray(value)) throw new Error("watchlist must be an array");

  const seen = new Set<string>();
  return value.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`watchlist[${index}] must be an object`);
    }
    const candidate = entry as Record<string, unknown>;
    const address = requiredString(candidate.address, `watchlist[${index}].address`);
    if (!SOLANA_ADDRESS.test(address)) {
      throw new Error(`watchlist[${index}].address is not a Solana base58 address`);
    }
    if (seen.has(address)) throw new Error(`watchlist contains duplicate address ${address}`);
    seen.add(address);

    const tags = candidate.tags ?? [];
    if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string" || tag === "")) {
      throw new Error(`watchlist[${index}].tags must be an array of non-empty strings`);
    }

    return {
      address,
      label: optionalString(candidate.label, `watchlist[${index}].label`),
      tags: [...new Set(tags as string[])],
      active: candidate.active === undefined
        ? true
        : booleanValue(candidate.active, `watchlist[${index}].active`),
    };
  });
}

function parseWatchlistOverride(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("JOURNAL_WATCHLIST must be valid JSON");
  }
}

export function loadConfig(options: LoadConfigOptions = {}): JournalConfig {
  const env = options.env ?? process.env;
  const selectedPath = options.configPath ?? env.JOURNAL_CONFIG ?? DEFAULT_CONFIG_PATH;
  const configPath = resolve(selectedPath);
  if (!existsSync(configPath)) throw new Error(`journal config not found: ${configPath}`);

  let file: ConfigFile;
  try {
    file = JSON.parse(readFileSync(configPath, "utf8")) as ConfigFile;
  } catch (error) {
    throw new Error(`unable to parse journal config ${configPath}: ${String(error)}`);
  }

  const databaseValue = env.JOURNAL_DB_PATH ?? file.databasePath ?? "data/journal.db";
  const databaseText = requiredString(databaseValue, "databasePath");
  const databasePath = databaseText === ":memory:"
    ? databaseText
    : resolve(dirname(configPath), databaseText);
  const rpcUrl = publicHttpUrl(
    env.SOLANA_RPC_URL ?? file.rpcUrl ?? "https://api.mainnet-beta.solana.com",
    "rpcUrl",
  );
  const jitoApiUrl = publicHttpUrl(
    env.JITO_API_URL ?? file.jitoApiUrl ?? "https://bundles.jito.wtf",
    "jitoApiUrl",
  );
  const collectIntervalMs = positiveInterval(
    env.COLLECT_INTERVAL_MS ?? file.collectIntervalMs ?? 120_000,
  );
  const scrapeEnabled = booleanValue(
    env.SCRAPE_OK ?? file.scrapeEnabled ?? false,
    "scrapeEnabled",
  );
  const watchlist = watchlistValue(
    env.JOURNAL_WATCHLIST === undefined
      ? (file.watchlist ?? [])
      : parseWatchlistOverride(env.JOURNAL_WATCHLIST),
  );

  return {
    configPath,
    databasePath,
    rpcUrl,
    solscanApiKey: optionalString(env.SOLSCAN_API_KEY ?? file.solscanApiKey, "solscanApiKey"),
    jitoApiUrl,
    collectIntervalMs,
    scrapeEnabled,
    watchlist,
  };
}
