import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { normalizeEvmAddress } from "./evm-types";

export interface WatchAddressConfig {
  address: string;
  label: string | null;
  tags: string[];
  active: boolean;
}

export interface EvmWatchAddressConfig {
  network: "robinhood_chain";
  address: string;
  checksumAddress: string;
  label: string | null;
  tags: string[];
  active: boolean;
}

export interface EvmConfirmationsConfig {
  display: "soft";
  accounting: "l1-posted";
  irreversible: "l1-final";
}

export interface EvmNetworkConfig {
  id: "robinhood_chain";
  chainId: 4663;
  rpcUrl: string;
  rpcUrlEnv: string;
  rpcUrlIsPublic: boolean;
  comparisonRpcUrls: string[];
  comparisonRpcUrlsEnv: string;
  wsUrl: string | null;
  wsUrlEnv: string;
  confirmations: EvmConfirmationsConfig;
  maxBlocksPerCycle: number;
  maxRewindBlocks: number;
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
  networks: { robinhood_chain: EvmNetworkConfig };
  evmWatchlist: EvmWatchAddressConfig[];
}

interface ConfigFile {
  databasePath?: unknown;
  rpcUrl?: unknown;
  solscanApiKey?: unknown;
  jitoApiUrl?: unknown;
  collectIntervalMs?: unknown;
  scrapeEnabled?: unknown;
  watchlist?: unknown;
  networks?: unknown;
  evmWatchlist?: unknown;
}

export interface LoadConfigOptions {
  configPath?: string;
  env?: Record<string, string | undefined>;
}

const DEFAULT_CONFIG_PATH = resolve(import.meta.dir, "..", "journal.config.json");
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const PUBLIC_ROBINHOOD_RPC = "https://rpc.mainnet.chain.robinhood.com";

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

function optionalWebSocketUrl(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  const text = requiredString(value, field);
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    throw new Error(`${field} must be a valid URL`);
  }
  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    throw new Error(`${field} must use ws or wss`);
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

function positiveInteger(value: unknown, field: string, fallback: number): number {
  const parsed = value === undefined ? fallback : typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${field} must be a positive integer`);
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

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function confirmationsValue(value: unknown): EvmConfirmationsConfig {
  const selected = value === undefined ? {} : record(value, "networks.robinhood_chain.confirmations");
  const confirmations = {
    display: selected.display ?? "soft",
    accounting: selected.accounting ?? "l1-posted",
    irreversible: selected.irreversible ?? "l1-final",
  };
  if (
    confirmations.display !== "soft"
    || confirmations.accounting !== "l1-posted"
    || confirmations.irreversible !== "l1-final"
  ) {
    throw new Error("Robinhood Chain confirmations must be soft/l1-posted/l1-final");
  }
  return confirmations as EvmConfirmationsConfig;
}

function networkValue(value: unknown, env: Record<string, string | undefined>): EvmNetworkConfig {
  const networks = value === undefined ? {} : record(value, "networks");
  const selected = networks.robinhood_chain === undefined
    ? {}
    : record(networks.robinhood_chain, "networks.robinhood_chain");
  const chainId = selected.chainId ?? 4663;
  if (chainId !== 4663) throw new Error("networks.robinhood_chain.chainId must be 4663");
  const rpcUrlEnv = requiredString(
    selected.rpcUrlEnv ?? "ROBINHOOD_CHAIN_RPC_URL",
    "networks.robinhood_chain.rpcUrlEnv",
  );
  const wsUrlEnv = requiredString(
    selected.wsUrlEnv ?? "ROBINHOOD_CHAIN_WS_URL",
    "networks.robinhood_chain.wsUrlEnv",
  );
  const comparisonRpcUrlsEnv = requiredString(
    selected.comparisonRpcUrlsEnv ?? "ROBINHOOD_CHAIN_COMPARISON_RPC_URLS",
    "networks.robinhood_chain.comparisonRpcUrlsEnv",
  );
  const publicRpcUrl = publicHttpUrl(
    selected.publicRpcUrl ?? PUBLIC_ROBINHOOD_RPC,
    "networks.robinhood_chain.publicRpcUrl",
  );
  const rpcUrl = publicHttpUrl(env[rpcUrlEnv] ?? publicRpcUrl, rpcUrlEnv);
  const comparisonRpcUrls = [...new Set((env[comparisonRpcUrlsEnv] ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
    .map((entry, index) => publicHttpUrl(entry, `${comparisonRpcUrlsEnv}[${index}]`)))]
    .filter((entry) => entry !== rpcUrl);
  return {
    id: "robinhood_chain",
    chainId: 4663,
    rpcUrl,
    rpcUrlEnv,
    rpcUrlIsPublic: rpcUrl === publicRpcUrl,
    comparisonRpcUrls,
    comparisonRpcUrlsEnv,
    wsUrl: optionalWebSocketUrl(env[wsUrlEnv], wsUrlEnv),
    wsUrlEnv,
    confirmations: confirmationsValue(selected.confirmations),
    maxBlocksPerCycle: positiveInteger(
      selected.maxBlocksPerCycle,
      "networks.robinhood_chain.maxBlocksPerCycle",
      25,
    ),
    maxRewindBlocks: positiveInteger(
      selected.maxRewindBlocks,
      "networks.robinhood_chain.maxRewindBlocks",
      64,
    ),
  };
}

function evmWatchlistValue(value: unknown): EvmWatchAddressConfig[] {
  if (!Array.isArray(value)) throw new Error("evmWatchlist must be an array");
  const seen = new Set<string>();
  return value.map((entry, index) => {
    const candidate = record(entry, `evmWatchlist[${index}]`);
    if (candidate.network !== "robinhood_chain") {
      throw new Error(`evmWatchlist[${index}].network must be robinhood_chain`);
    }
    const normalized = normalizeEvmAddress(requiredString(candidate.address, `evmWatchlist[${index}].address`));
    const identity = `robinhood_chain:${normalized.address}`;
    if (seen.has(identity)) throw new Error(`evmWatchlist contains duplicate address ${normalized.address}`);
    seen.add(identity);
    const tags = candidate.tags ?? [];
    if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string" || tag === "")) {
      throw new Error(`evmWatchlist[${index}].tags must be an array of non-empty strings`);
    }
    return {
      network: "robinhood_chain",
      address: normalized.address,
      checksumAddress: normalized.checksumAddress,
      label: optionalString(candidate.label, `evmWatchlist[${index}].label`),
      tags: [...new Set(tags as string[])],
      active: candidate.active === undefined
        ? true
        : booleanValue(candidate.active, `evmWatchlist[${index}].active`),
    };
  });
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
  const networks = { robinhood_chain: networkValue(file.networks, env) };
  const evmWatchlist = evmWatchlistValue(file.evmWatchlist ?? []);

  return {
    configPath,
    databasePath,
    rpcUrl,
    solscanApiKey: optionalString(env.SOLSCAN_API_KEY ?? file.solscanApiKey, "solscanApiKey"),
    jitoApiUrl,
    collectIntervalMs,
    scrapeEnabled,
    watchlist,
    networks,
    evmWatchlist,
  };
}
