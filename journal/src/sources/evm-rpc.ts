import { readFileSync } from "node:fs";
import {
  decimalString,
  hexQuantity,
  normalizeEvmAddress,
  normalizeEvmHash,
  normalizeHexData,
  safeEvmInteger,
  uint256,
  type EvmBlock,
  type EvmHealth,
  type EvmLog,
  type EvmLogFilter,
  type EvmReceipt,
  type EvmSource,
  type EvmTransaction,
  type EvmTransactionKind,
} from "../evm-types";
import { defaultSleep, type FetchLike, type Sleep } from "./types";

const ROBINHOOD_CHAIN_ID = 4_663n;

interface EvmRpcSourceOptions {
  fetch?: FetchLike;
  sleep?: Sleep;
  maxAttempts?: number;
  maxLogRange?: number;
  id?: EvmSource["id"];
}

interface RpcEnvelope<T> {
  jsonrpc?: string;
  id?: number;
  result?: T;
  error?: { code?: number; message?: string; data?: unknown };
}

interface FixtureBlock {
  number: string;
  hash: string;
  parentHash: string;
  timestamp: number;
  l1BlockNumber?: string | null;
  gasUsed: string;
  baseFeePerGas?: string | null;
  transactions: Array<{
    hash: string;
    transactionIndex: number;
    from: string;
    to: string | null;
    nonce: string;
    value: string;
    input: string;
    kind?: EvmTransactionKind;
  }>;
}

interface FixtureReceipt {
  transactionHash: string;
  blockNumber: string;
  transactionIndex: number;
  gasUsed: string;
  effectiveGasPrice?: string | null;
  status?: number | null;
  logs: Array<{
    transactionHash: string;
    transactionIndex: number;
    logIndex: number;
    blockNumber: string;
    blockHash: string;
    address: string;
    topics: string[];
    data: string;
    removed?: boolean;
  }>;
}

export interface EvmRpcFixture {
  collectedAt?: number;
  chainId: string;
  head: string;
  blocks: Record<string, FixtureBlock>;
  receipts: Record<string, FixtureReceipt>;
  balances?: Record<string, string>;
  calls?: Record<string, string>;
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`RPC response has invalid ${field}`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`RPC response has invalid ${field}`);
  return value;
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  }
  return Math.min(8_000, 250 * (2 ** attempt));
}

function blockTag(value: bigint): string {
  return `0x${value.toString(16)}`;
}

function transactionKind(to: string | null, input: string): EvmTransactionKind {
  if (to === null) return "contract-create";
  if (input === "0x") return "transfer";
  return "contract-call";
}

function parseTransaction(value: unknown, blockNumber: bigint): EvmTransaction {
  const row = asRecord(value, "transaction");
  const toValue = row.to;
  const to = toValue === null ? null : normalizeEvmAddress(requiredString(toValue, "tx.to")).address;
  const input = normalizeHexData(requiredString(row.input, "tx.input"), "transaction input");
  return {
    hash: normalizeEvmHash(requiredString(row.hash, "tx.hash"), "transaction hash"),
    blockNumber,
    transactionIndex: safeEvmInteger(hexQuantity(row.transactionIndex, "tx.transactionIndex"), "transaction index"),
    from: normalizeEvmAddress(requiredString(row.from, "tx.from")).address,
    to,
    nonce: hexQuantity(row.nonce, "tx.nonce"),
    value: hexQuantity(row.value, "tx.value"),
    input,
    kind: transactionKind(to, input),
  };
}

function parseBlock(value: unknown): EvmBlock {
  const row = asRecord(value, "block");
  const number = hexQuantity(row.number, "block.number");
  const transactions = row.transactions;
  if (!Array.isArray(transactions)) throw new Error("RPC response has invalid block.transactions");
  const l1Value = row.l1BlockNumber;
  return {
    number,
    hash: normalizeEvmHash(requiredString(row.hash, "block.hash"), "block hash"),
    parentHash: normalizeEvmHash(requiredString(row.parentHash, "block.parentHash"), "parent hash"),
    timestamp: safeEvmInteger(hexQuantity(row.timestamp, "block.timestamp"), "block timestamp"),
    l1BlockNumber: l1Value === undefined || l1Value === null
      ? null
      : hexQuantity(l1Value, "block.l1BlockNumber"),
    gasUsed: hexQuantity(row.gasUsed, "block.gasUsed"),
    baseFeePerGas: row.baseFeePerGas === undefined || row.baseFeePerGas === null
      ? null
      : hexQuantity(row.baseFeePerGas, "block.baseFeePerGas"),
    transactions: transactions.map((transaction) => parseTransaction(transaction, number)),
  };
}

function parseLog(value: unknown): EvmLog {
  const row = asRecord(value, "log");
  const topics = row.topics;
  if (!Array.isArray(topics) || topics.some((topic) => typeof topic !== "string")) {
    throw new Error("RPC response has invalid log.topics");
  }
  return {
    transactionHash: normalizeEvmHash(requiredString(row.transactionHash, "log.transactionHash"), "transaction hash"),
    transactionIndex: safeEvmInteger(hexQuantity(row.transactionIndex, "log.transactionIndex"), "transaction index"),
    logIndex: safeEvmInteger(hexQuantity(row.logIndex, "log.logIndex"), "log index"),
    blockNumber: hexQuantity(row.blockNumber, "log.blockNumber"),
    blockHash: normalizeEvmHash(requiredString(row.blockHash, "log.blockHash"), "block hash"),
    address: normalizeEvmAddress(requiredString(row.address, "log.address")).address,
    topics: (topics as string[]).map((topic) => normalizeEvmHash(topic, "log topic")),
    data: normalizeHexData(requiredString(row.data, "log.data"), "log data"),
    removed: row.removed === true,
  };
}

function parseReceipt(value: unknown): EvmReceipt {
  const row = asRecord(value, "receipt");
  if (!Array.isArray(row.logs)) throw new Error("RPC response has invalid receipt.logs");
  const status = row.status === undefined || row.status === null
    ? null
    : safeEvmInteger(hexQuantity(row.status, "receipt.status"), "receipt status");
  if (status !== null && status !== 0 && status !== 1) {
    throw new Error("RPC response has invalid receipt.status");
  }
  return {
    transactionHash: normalizeEvmHash(requiredString(row.transactionHash, "receipt.transactionHash"), "transaction hash"),
    blockNumber: hexQuantity(row.blockNumber, "receipt.blockNumber"),
    transactionIndex: safeEvmInteger(hexQuantity(row.transactionIndex, "receipt.transactionIndex"), "transaction index"),
    gasUsed: hexQuantity(row.gasUsed, "receipt.gasUsed"),
    effectiveGasPrice: row.effectiveGasPrice === undefined || row.effectiveGasPrice === null
      ? null
      : hexQuantity(row.effectiveGasPrice, "receipt.effectiveGasPrice"),
    status,
    logs: row.logs.map(parseLog),
  };
}

function validateFilter(filter: EvmLogFilter): void {
  uint256(filter.fromBlock, "fromBlock");
  uint256(filter.toBlock, "toBlock");
  if (filter.toBlock < filter.fromBlock) throw new Error("log filter toBlock precedes fromBlock");
  for (const address of filter.addresses ?? []) normalizeEvmAddress(address);
  for (const topic of filter.topics ?? []) {
    if (topic === null) continue;
    for (const selected of Array.isArray(topic) ? topic : [topic]) normalizeEvmHash(selected, "log topic");
  }
}

function isRangeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { rpcCode?: number }).rpcCode;
  return code === -32_005 || code === -32_602
    || /range|block span|too many|response size|limit exceeded/i.test(error.message);
}

export class EvmRpcSource implements EvmSource {
  readonly id: EvmSource["id"];
  private readonly fetcher: FetchLike;
  private readonly sleep: Sleep;
  private readonly maxAttempts: number;
  private readonly maxLogRange: bigint;
  private requestId = 0;
  private chainVerification: Promise<void> | null = null;

  constructor(readonly endpoint: string, options: EvmRpcSourceOptions = {}) {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("EVM RPC endpoint must use http or https");
    }
    this.id = options.id ?? "robinhood-rpc";
    this.fetcher = options.fetch ?? fetch;
    this.sleep = options.sleep ?? defaultSleep;
    this.maxAttempts = options.maxAttempts ?? 4;
    const range = options.maxLogRange ?? 2_000;
    if (!Number.isSafeInteger(range) || range < 1) throw new Error("maxLogRange must be positive");
    this.maxLogRange = BigInt(range);
  }

  private async post(payload: unknown): Promise<unknown> {
    for (let attempt = 0; attempt < this.maxAttempts; attempt += 1) {
      const response = await this.fetcher(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 429 || response.status >= 500) {
        if (attempt + 1 === this.maxAttempts) {
          throw new Error(`EVM RPC unavailable after ${this.maxAttempts} attempts (${response.status})`);
        }
        await this.sleep(retryDelay(response, attempt));
        continue;
      }
      if (!response.ok) throw new Error(`EVM RPC HTTP ${response.status}`);
      return response.json();
    }
    throw new Error("EVM RPC retry loop exhausted");
  }

  private async request<T>(method: string, params: unknown[]): Promise<T> {
    const envelope = await this.post({
      jsonrpc: "2.0",
      id: ++this.requestId,
      method,
      params,
    }) as RpcEnvelope<T>;
    if (envelope.error !== undefined) {
      const error = new Error(`EVM RPC ${method}: ${envelope.error.message ?? envelope.error.code ?? "error"}`);
      (error as Error & { rpcCode?: number }).rpcCode = envelope.error.code;
      throw error;
    }
    if (!("result" in envelope)) throw new Error(`EVM RPC ${method}: missing result`);
    return envelope.result as T;
  }

  private async verifyChain(): Promise<void> {
    if (this.chainVerification === null) {
      this.chainVerification = (async () => {
        const selected = await this.chainId();
        if (selected !== ROBINHOOD_CHAIN_ID) {
          throw new Error(`Robinhood Chain RPC chain ID mismatch: expected 4663, received ${selected}`);
        }
      })();
    }
    try {
      await this.chainVerification;
    } catch (error) {
      this.chainVerification = null;
      throw error;
    }
  }

  async chainId(): Promise<bigint> {
    return hexQuantity(await this.request<unknown>("eth_chainId", []), "chain ID");
  }

  async blockNumber(): Promise<bigint> {
    await this.verifyChain();
    return hexQuantity(await this.request<unknown>("eth_blockNumber", []), "block number");
  }

  async block(number: bigint): Promise<EvmBlock | null> {
    await this.verifyChain();
    const result = await this.request<unknown>("eth_getBlockByNumber", [blockTag(number), true]);
    return result === null ? null : parseBlock(result);
  }

  async receipt(hash: string): Promise<EvmReceipt | null> {
    await this.verifyChain();
    const result = await this.request<unknown>("eth_getTransactionReceipt", [normalizeEvmHash(hash, "transaction hash")]);
    return result === null ? null : parseReceipt(result);
  }

  private async logRange(filter: EvmLogFilter, fromBlock: bigint, toBlock: bigint): Promise<EvmLog[]> {
    const params: Record<string, unknown> = {
      fromBlock: blockTag(fromBlock),
      toBlock: blockTag(toBlock),
    };
    if (filter.addresses?.length === 1) params.address = normalizeEvmAddress(filter.addresses[0]!).address;
    else if ((filter.addresses?.length ?? 0) > 1) {
      params.address = filter.addresses?.map((address) => normalizeEvmAddress(address).address);
    }
    if (filter.topics !== undefined) params.topics = filter.topics;
    try {
      const result = await this.request<unknown>("eth_getLogs", [params]);
      if (!Array.isArray(result)) throw new Error("RPC response has invalid logs result");
      return result.map(parseLog);
    } catch (error) {
      if (fromBlock === toBlock || !isRangeError(error)) throw error;
      const midpoint = fromBlock + ((toBlock - fromBlock) / 2n);
      const [left, right] = await Promise.all([
        this.logRange(filter, fromBlock, midpoint),
        this.logRange(filter, midpoint + 1n, toBlock),
      ]);
      return [...left, ...right];
    }
  }

  async *logs(filter: EvmLogFilter): AsyncIterable<EvmLog> {
    await this.verifyChain();
    validateFilter(filter);
    for (let start = filter.fromBlock; start <= filter.toBlock; start += this.maxLogRange) {
      const end = start + this.maxLogRange - 1n > filter.toBlock
        ? filter.toBlock
        : start + this.maxLogRange - 1n;
      const rows = await this.logRange(filter, start, end);
      rows.sort((left, right) => (
        Number(left.blockNumber - right.blockNumber)
        || left.transactionIndex - right.transactionIndex
        || left.logIndex - right.logIndex
      ));
      for (const row of rows) yield row;
    }
  }

  async balance(address: string, block: bigint): Promise<bigint> {
    await this.verifyChain();
    const selected = normalizeEvmAddress(address).address;
    return hexQuantity(
      await this.request<unknown>("eth_getBalance", [selected, blockTag(block)]),
      "balance",
    );
  }

  async call(address: string, data: string, block: bigint): Promise<string> {
    await this.verifyChain();
    const selected = normalizeEvmAddress(address).address;
    return normalizeHexData(
      await this.request<string>("eth_call", [{ to: selected, data: normalizeHexData(data) }, blockTag(block)]),
      "call result",
    );
  }

  async health(): Promise<EvmHealth> {
    const started = performance.now();
    try {
      const head = await this.blockNumber();
      return { ok: true, latencyMs: Math.round(performance.now() - started), head };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - started),
        head: null,
        note: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

function fixtureTransaction(row: FixtureBlock["transactions"][number], blockNumber: bigint): EvmTransaction {
  const to = row.to === null ? null : normalizeEvmAddress(row.to).address;
  const input = normalizeHexData(row.input, "transaction input");
  return {
    hash: normalizeEvmHash(row.hash, "transaction hash"),
    blockNumber,
    transactionIndex: row.transactionIndex,
    from: normalizeEvmAddress(row.from).address,
    to,
    nonce: uint256(row.nonce, "transaction nonce"),
    value: uint256(row.value, "transaction value"),
    input,
    kind: row.kind ?? transactionKind(to, input),
  };
}

function fixtureBlock(row: FixtureBlock): EvmBlock {
  const number = uint256(row.number, "block number");
  return {
    number,
    hash: normalizeEvmHash(row.hash, "block hash"),
    parentHash: normalizeEvmHash(row.parentHash, "parent hash"),
    timestamp: row.timestamp,
    l1BlockNumber: row.l1BlockNumber === undefined || row.l1BlockNumber === null
      ? null
      : uint256(row.l1BlockNumber, "L1 block number"),
    gasUsed: uint256(row.gasUsed, "block gas used"),
    baseFeePerGas: row.baseFeePerGas === undefined || row.baseFeePerGas === null
      ? null
      : uint256(row.baseFeePerGas, "base fee"),
    transactions: row.transactions.map((transaction) => fixtureTransaction(transaction, number)),
  };
}

function fixtureLog(row: FixtureReceipt["logs"][number]): EvmLog {
  return {
    transactionHash: normalizeEvmHash(row.transactionHash, "transaction hash"),
    transactionIndex: row.transactionIndex,
    logIndex: row.logIndex,
    blockNumber: uint256(row.blockNumber, "block number"),
    blockHash: normalizeEvmHash(row.blockHash, "block hash"),
    address: normalizeEvmAddress(row.address).address,
    topics: row.topics.map((topic) => normalizeEvmHash(topic, "log topic")),
    data: normalizeHexData(row.data, "log data"),
    removed: row.removed === true,
  };
}

function fixtureReceipt(row: FixtureReceipt): EvmReceipt {
  return {
    transactionHash: normalizeEvmHash(row.transactionHash, "transaction hash"),
    blockNumber: uint256(row.blockNumber, "block number"),
    transactionIndex: row.transactionIndex,
    gasUsed: uint256(row.gasUsed, "gas used"),
    effectiveGasPrice: row.effectiveGasPrice === undefined || row.effectiveGasPrice === null
      ? null
      : uint256(row.effectiveGasPrice, "effective gas price"),
    status: row.status ?? null,
    logs: row.logs.map(fixtureLog),
  };
}

export class FixtureEvmSource implements EvmSource {
  readonly id = "robinhood-rpc" as const;
  readonly endpoint = "fixture://robinhood-chain";

  constructor(readonly fixture: EvmRpcFixture) {
    if (uint256(fixture.chainId, "fixture chain ID") !== ROBINHOOD_CHAIN_ID) {
      throw new Error("Robinhood Chain fixture chain ID must be 4663");
    }
  }

  static fromFile(path: string): FixtureEvmSource {
    return new FixtureEvmSource(JSON.parse(readFileSync(path, "utf8")) as EvmRpcFixture);
  }

  get collectedAt(): number | undefined {
    return this.fixture.collectedAt;
  }

  async chainId(): Promise<bigint> {
    return uint256(this.fixture.chainId, "fixture chain ID");
  }

  async blockNumber(): Promise<bigint> {
    return uint256(this.fixture.head, "fixture head");
  }

  async block(number: bigint): Promise<EvmBlock | null> {
    const row = this.fixture.blocks[decimalString(number)];
    return row === undefined ? null : structuredClone(fixtureBlock(row));
  }

  async receipt(hash: string): Promise<EvmReceipt | null> {
    const row = this.fixture.receipts[normalizeEvmHash(hash, "transaction hash")];
    return row === undefined ? null : structuredClone(fixtureReceipt(row));
  }

  async *logs(filter: EvmLogFilter): AsyncIterable<EvmLog> {
    validateFilter(filter);
    const rows = Object.values(this.fixture.receipts)
      .flatMap((receipt) => receipt.logs.map(fixtureLog))
      .filter((log) => (
        log.blockNumber >= filter.fromBlock
        && log.blockNumber <= filter.toBlock
        && (filter.addresses === undefined || filter.addresses.some((address) => (
          normalizeEvmAddress(address).address === log.address
        )))
      ))
      .sort((left, right) => (
        Number(left.blockNumber - right.blockNumber)
        || left.transactionIndex - right.transactionIndex
        || left.logIndex - right.logIndex
      ));
    for (const row of rows) yield structuredClone(row);
  }

  async balance(address: string, block: bigint): Promise<bigint> {
    const key = `${normalizeEvmAddress(address).address}@${decimalString(block)}`;
    return uint256(this.fixture.balances?.[key] ?? "0", "fixture balance");
  }

  async call(address: string, data: string, block: bigint): Promise<string> {
    const key = `${normalizeEvmAddress(address).address}@${normalizeHexData(data)}@${decimalString(block)}`;
    const result = this.fixture.calls?.[key];
    if (result === undefined) throw new Error(`fixture call not found: ${key}`);
    return normalizeHexData(result, "fixture call result");
  }

  async health(): Promise<EvmHealth> {
    return { ok: true, latencyMs: 0, head: await this.blockNumber(), note: "fixture" };
  }
}
