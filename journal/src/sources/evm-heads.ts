import { hexQuantity, normalizeEvmHash } from "../evm-types";
import type { RecoverableHead } from "../evm-collect";

export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(type: "open" | "message" | "close" | "error", listener: (event: Event) => void): void;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

export interface EvmNewHeadFeedOptions {
  socket?: WebSocketFactory;
  reconnectMs?: number;
}

function parseHead(value: unknown): RecoverableHead {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("new-head event is not an object");
  }
  const row = value as Record<string, unknown>;
  return {
    number: hexQuantity(row.number, "new-head number"),
    hash: normalizeEvmHash(String(row.hash ?? ""), "new-head hash"),
    parentHash: normalizeEvmHash(String(row.parentHash ?? ""), "new-head parent hash"),
  };
}

function headFromMessage(event: Event): RecoverableHead | null {
  const data = (event as MessageEvent).data;
  const decoded = JSON.parse(typeof data === "string" ? data : String(data)) as Record<string, unknown>;
  if (decoded.method !== "eth_subscription") return null;
  const params = decoded.params;
  if (typeof params !== "object" || params === null || Array.isArray(params)) return null;
  return parseHead((params as Record<string, unknown>).result);
}

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

/** Standard provider `newHeads` wake-up feed. HTTP remains the recovery and truth path. */
export class EvmNewHeadFeed {
  private readonly factory: WebSocketFactory;
  private readonly reconnectMs: number;

  constructor(readonly endpoint: string, options: EvmNewHeadFeedOptions = {}) {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
      throw new Error("EVM head feed must use ws or wss");
    }
    this.factory = options.socket ?? ((url) => new WebSocket(url));
    this.reconnectMs = options.reconnectMs ?? 1_000;
  }

  async follow(
    onHead: (head: RecoverableHead) => void | Promise<void>,
    signal: AbortSignal,
  ): Promise<void> {
    while (!signal.aborted) {
      await new Promise<void>((resolveConnection) => {
        const socket = this.factory(this.endpoint);
        let pending = Promise.resolve();
        const finish = (): void => {
          void pending.then(resolveConnection, resolveConnection);
        };
        socket.addEventListener("open", () => {
          socket.send(JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_subscribe",
            params: ["newHeads"],
          }));
        });
        socket.addEventListener("message", (event) => {
          pending = pending.then(async () => {
            const head = headFromMessage(event);
            if (head !== null) await onHead(head);
          }).catch(() => undefined);
        });
        socket.addEventListener("close", finish);
        socket.addEventListener("error", finish);
        signal.addEventListener("abort", () => socket.close(), { once: true });
      });
      if (!signal.aborted) await wait(this.reconnectMs, signal);
    }
  }
}
