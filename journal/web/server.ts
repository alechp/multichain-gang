import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { JournalDatabase } from "../src/db";
import { normalizeEvmAddress } from "../src/evm-types";
import { EMPTY_COMMAND, parseWindow, workbenchState } from "../src/sim/data";
import { exportJson, exportMarkdown } from "../src/sim/export";
import { executeSimulator } from "../src/sim";

const ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const STATIC_FILES = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/tokens.css", ["tokens.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
] as const);

export interface StartWorkbenchOptions {
  database: JournalDatabase;
  port?: number;
  hostname?: string;
}

export interface WorkbenchServer {
  hostname: string;
  port: number;
  stop(): void;
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value, (_key, item) => (
    typeof item === "bigint" ? item.toString() : item
  )), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function errorResponse(error: unknown, status = 400): Response {
  return json({ error: error instanceof Error ? error.message : String(error) }, status);
}

async function body(request: Request): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 64 * 1_024) throw new Error("request body is too large");
  const value = await request.json();
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("request body must be an object");
  }
  return value as Record<string, unknown>;
}

function address(value: unknown): string {
  if (typeof value !== "string" || !ADDRESS_PATTERN.test(value)) {
    throw new Error("a valid watched Solana address is required");
  }
  return value;
}

function tags(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((tag) => typeof tag !== "string" || tag === "")) {
    throw new Error("tags must be an array of non-empty strings");
  }
  return [...new Set(value as string[])];
}

function staticResponse(pathname: string): Response | null {
  const item = STATIC_FILES.get(pathname as keyof typeof STATIC_FILES);
  if (item === undefined) return null;
  const [file, contentType] = item;
  return new Response(readFileSync(resolve(import.meta.dir, file)), {
    headers: {
      "content-type": contentType,
      "cache-control": "no-cache",
      "content-security-policy": "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

export async function handleWorkbenchRequest(
  request: Request,
  database: JournalDatabase,
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/health") {
    return json({ ok: true, localOnly: true });
  }
  if (request.method === "GET" && url.pathname === "/api/state") {
    const selected = url.searchParams.get("address") ?? undefined;
    const window = parseWindow(url.searchParams.get("window") ?? "30d");
    return json(workbenchState(database, selected, window));
  }
  if (request.method === "GET" && url.pathname === "/api/evm/state") {
    return json(database.evmNetworkOverview("robinhood_chain"));
  }
  if (request.method === "POST" && url.pathname === "/api/evm/watch") {
    const input = await body(request);
    const selected = normalizeEvmAddress(typeof input.address === "string" ? input.address : "");
    database.upsertEvmAddress({
      network: "robinhood_chain",
      address: selected.address,
      label: typeof input.label === "string" && input.label.trim() !== "" ? input.label.trim() : null,
      tags: tags(input.tags),
      active: true,
    });
    return json(database.getEvmAddress("robinhood_chain", selected.address), 201);
  }
  if (request.method === "DELETE" && url.pathname.startsWith("/api/evm/watch/")) {
    const selected = normalizeEvmAddress(decodeURIComponent(url.pathname.slice("/api/evm/watch/".length)));
    if (!database.setEvmAddressActive("robinhood_chain", selected.address, false)) {
      return errorResponse("Robinhood Chain address not found", 404);
    }
    return json({ ok: true, retainedHistory: true });
  }
  if (request.method === "POST" && url.pathname === "/api/watch") {
    const input = await body(request);
    const selected = address(input.address);
    database.upsertAddress({
      address: selected,
      label: typeof input.label === "string" && input.label.trim() !== "" ? input.label.trim() : null,
      tags: tags(input.tags),
      active: true,
    });
    return json(database.getAddress(selected), 201);
  }
  if (request.method === "DELETE" && url.pathname.startsWith("/api/watch/")) {
    const selected = address(decodeURIComponent(url.pathname.slice("/api/watch/".length)));
    if (!database.setAddressActive(selected, false)) return errorResponse("address not found", 404);
    return json({ ok: true, retainedHistory: true });
  }
  if (request.method === "POST" && url.pathname === "/api/sim") {
    const input = await body(request);
    const run = executeSimulator({
      database,
      id: typeof input.id === "string" ? input.id : "",
      address: address(input.address),
      rawParams: typeof input.params === "object" && input.params !== null && !Array.isArray(input.params)
        ? input.params as Record<string, unknown>
        : {},
      windowSeconds: parseWindow(typeof input.window === "string" ? input.window : "30d"),
    });
    return json(run, 201);
  }
  if (request.method === "POST" && url.pathname === "/api/notes") {
    const input = await body(request);
    if (typeof input.body !== "string" || input.body.trim() === "") {
      throw new Error("note body is required");
    }
    const selectedAddress = input.address === null || input.address === undefined
      ? null
      : address(input.address);
    const entry = database.addJournalEntry({
      body: input.body,
      address: selectedAddress,
      simRun: typeof input.simRun === "string" && input.simRun !== "" ? input.simRun : null,
      tags: tags(input.tags),
    });
    return json(entry, 201);
  }
  if (request.method === "GET" && url.pathname === "/api/export") {
    const format = url.searchParams.get("format") ?? "md";
    if (format === "json") {
      return new Response(exportJson(database), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": "attachment; filename=scope-journal.json",
        },
      });
    }
    if (format !== "md") return errorResponse("format must be md or json");
    return new Response(exportMarkdown(database), {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": "attachment; filename=scope-journal.md",
      },
    });
  }
  if (request.method === "GET") {
    const response = staticResponse(url.pathname);
    if (response !== null) return response;
  }
  if (url.pathname.startsWith("/api/")) return errorResponse("not found", 404);
  return new Response("Not found", { status: 404 });
}

export function startWorkbenchServer(options: StartWorkbenchOptions): WorkbenchServer {
  const hostname = options.hostname ?? "127.0.0.1";
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`workbench refuses non-local bind ${hostname}; use 127.0.0.1`);
  }
  const port = options.port ?? 7_817;
  if (!Number.isSafeInteger(port) || port < 0 || port > 65_535) {
    throw new Error("port must be an integer from 0 through 65535");
  }
  const server = Bun.serve({
    hostname,
    port,
    async fetch(request) {
      try {
        return await handleWorkbenchRequest(request, options.database);
      } catch (error) {
        return errorResponse(error);
      }
    },
    error(error) {
      return errorResponse(error, 500);
    },
  });
  return {
    hostname,
    port: server.port,
    stop(): void {
      server.stop(true);
    },
  };
}

export { EMPTY_COMMAND };
