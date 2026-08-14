import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  defaultSleep,
  type FetchLike,
  type RawBalances,
  type RawTransaction,
  type SigInfo,
  type Sleep,
  type Source,
  type SourceHealth,
} from "./types";

const USER_AGENT = "scope-journal/0.1 (personal research)";
const CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const CIRCUIT_MS = 30 * 60 * 1_000;
const HOST_INTERVAL_MS = 2_000;
const GLOBAL_NEXT_ALLOWED_AT = new Map<string, number>();

interface ScrapeOptions {
  enabled: boolean;
  cacheDir: string;
  fetch?: FetchLike;
  sleep?: Sleep;
  now?: () => number;
}

interface CachedPage {
  url: string;
  fetchedAt: number;
  body: string;
}

interface RobotsEntry {
  fetchedAt: number;
  body: string;
}

function cacheName(url: string): string {
  return `${createHash("sha256").update(url).digest("hex")}.json`;
}

function pathMatches(pathname: string, rule: string): boolean {
  if (rule === "") return false;
  const normalized = rule.endsWith("$") ? rule.slice(0, -1) : rule;
  const matches = pathname.startsWith(normalized);
  return rule.endsWith("$") ? matches && pathname.length === normalized.length : matches;
}

export function robotsAllows(body: string, pathname: string): boolean {
  const groups: Array<{ agents: string[]; rules: Array<{ allow: boolean; path: string }> }> = [];
  let current: (typeof groups)[number] | null = null;
  let rulesStarted = false;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (line === "") continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (current === null || rulesStarted) {
        current = { agents: [], rules: [] };
        groups.push(current);
        rulesStarted = false;
      }
      current.agents.push(value.toLowerCase());
    } else if ((field === "allow" || field === "disallow") && current !== null) {
      current.rules.push({ allow: field === "allow", path: value });
      rulesStarted = true;
    }
  }

  const agent = USER_AGENT.toLowerCase();
  const candidates = groups.map((group) => ({
    group,
    specificity: Math.max(...group.agents.map((candidate) => (
      candidate !== "*" && agent.startsWith(candidate) ? candidate.length : candidate === "*" ? 0 : -1
    ))),
  })).filter((candidate) => candidate.specificity >= 0);
  const specificity = Math.max(-1, ...candidates.map((candidate) => candidate.specificity));
  const matching = candidates
    .filter((candidate) => candidate.specificity === specificity)
    .map((candidate) => candidate.group);
  const rules = matching.flatMap((group) => group.rules)
    .filter((rule) => pathMatches(pathname, rule.path))
    .sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
  return rules[0]?.allow ?? true;
}

export class ScrapeSource implements Source {
  readonly id = "scrape" as const;
  private readonly enabled: boolean;
  private readonly cacheDir: string;
  private readonly fetcher: FetchLike;
  private readonly sleep: Sleep;
  private readonly now: () => number;
  private readonly circuitUntil = new Map<string, number>();
  private readonly robots = new Map<string, RobotsEntry>();

  constructor(options: ScrapeOptions) {
    this.enabled = options.enabled;
    this.cacheDir = resolve(options.cacheDir);
    this.fetcher = options.fetch ?? fetch;
    this.sleep = options.sleep ?? defaultSleep;
    this.now = options.now ?? Date.now;
  }

  private ensureEnabled(): void {
    if (!this.enabled) throw new Error("HTML fallback is disabled; set SCRAPE_OK=1 to opt in");
  }

  private async fetchLimited(url: URL): Promise<Response> {
    const host = url.host;
    const circuit = this.circuitUntil.get(host) ?? 0;
    if (circuit > this.now()) throw new Error(`HTML fallback circuit open for ${host}`);

    const wait = Math.max(0, (GLOBAL_NEXT_ALLOWED_AT.get(host) ?? 0) - this.now());
    if (wait > 0) await this.sleep(wait);
    GLOBAL_NEXT_ALLOWED_AT.set(host, this.now() + HOST_INTERVAL_MS);

    const response = await this.fetcher(url, { headers: { "user-agent": USER_AGENT } });
    if (response.status === 403 || response.status === 429 || response.status >= 500) {
      this.circuitUntil.set(host, this.now() + CIRCUIT_MS);
    }
    return response;
  }

  private async robotsBody(url: URL): Promise<string> {
    const origin = url.origin;
    const cached = this.robots.get(origin);
    if (cached !== undefined && this.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.body;
    const response = await this.fetchLimited(new URL("/robots.txt", origin));
    const body = response.status === 404 ? "" : await response.text();
    if (!response.ok && response.status !== 404) {
      throw new Error(`robots.txt HTTP ${response.status} for ${origin}`);
    }
    this.robots.set(origin, { fetchedAt: this.now(), body });
    return body;
  }

  async fetchText(input: string): Promise<string> {
    this.ensureEnabled();
    const url = new URL(input);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("HTML fallback URL must use http or https");
    }

    const path = resolve(this.cacheDir, cacheName(url.toString()));
    if (existsSync(path)) {
      const cached = JSON.parse(readFileSync(path, "utf8")) as CachedPage;
      if (cached.url === url.toString() && this.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.body;
      }
    }

    const robots = await this.robotsBody(url);
    if (!robotsAllows(robots, `${url.pathname}${url.search}`)) {
      throw new Error(`robots.txt disallows ${url.pathname}`);
    }
    const response = await this.fetchLimited(url);
    if (!response.ok) throw new Error(`HTML fallback HTTP ${response.status}`);
    const body = await response.text();
    mkdirSync(this.cacheDir, { recursive: true });
    writeFileSync(path, JSON.stringify({ url: url.toString(), fetchedAt: this.now(), body }));
    return body;
  }

  async *signatures(): AsyncIterable<SigInfo> {
    // Generic HTML has no safe normalized address-history contract.
  }

  async transaction(): Promise<RawTransaction | null> {
    return null;
  }

  async balances(): Promise<RawBalances | null> {
    return null;
  }

  async health(): Promise<SourceHealth> {
    return this.enabled
      ? { ok: true, latencyMs: 0, note: "enabled; host health checked on demand" }
      : { ok: false, latencyMs: 0, note: "disabled" };
  }
}
