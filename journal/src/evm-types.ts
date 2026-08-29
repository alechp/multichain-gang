const UINT = /^(0|[1-9][0-9]*)$/;
const HEX_QUANTITY = /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/;
const HEX_DATA = /^0x(?:[0-9a-fA-F]{2})*$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;
const UINT256_MAX = (1n << 256n) - 1n;
const MASK_64 = (1n << 64n) - 1n;

const ROTATION = [
  0, 1, 62, 28, 27,
  36, 44, 6, 55, 20,
  3, 10, 43, 25, 39,
  41, 45, 15, 21, 8,
  18, 2, 61, 56, 14,
] as const;

const ROUND_CONSTANTS = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an,
  0x8000000080008000n, 0x000000000000808bn, 0x0000000080000001n,
  0x8000000080008081n, 0x8000000000008009n, 0x000000000000008an,
  0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n,
  0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n,
  0x000000000000800an, 0x800000008000000an, 0x8000000080008081n,
  0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
] as const;

function rotate64(value: bigint, bits: number): bigint {
  if (bits === 0) return value & MASK_64;
  const shift = BigInt(bits);
  return ((value << shift) | (value >> (64n - shift))) & MASK_64;
}

function keccakPermutation(state: bigint[]): void {
  for (const roundConstant of ROUND_CONSTANTS) {
    const c = Array.from({ length: 5 }, (_, x) => (
      state[x]! ^ state[x + 5]! ^ state[x + 10]! ^ state[x + 15]! ^ state[x + 20]!
    ));
    const d = Array.from({ length: 5 }, (_, x) => (
      c[(x + 4) % 5]! ^ rotate64(c[(x + 1) % 5]!, 1)
    ));
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        const index = x + 5 * y;
        state[index] = (state[index]! ^ d[x]!) & MASK_64;
      }
    }

    const b = Array<bigint>(25).fill(0n);
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        b[y + 5 * ((2 * x + 3 * y) % 5)] = rotate64(
          state[x + 5 * y]!,
          ROTATION[x + 5 * y]!,
        );
      }
    }
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        state[x + 5 * y] = (
          b[x + 5 * y]!
          ^ ((~b[((x + 1) % 5) + 5 * y]!) & b[((x + 2) % 5) + 5 * y]!)
        ) & MASK_64;
      }
    }
    state[0] = (state[0]! ^ roundConstant) & MASK_64;
  }
}

/** Keccak-256, used only for EIP-55 display checksums and call selectors. */
export function keccak256(value: string): string {
  const rate = 136;
  const source = new TextEncoder().encode(value);
  const paddedLength = Math.ceil((source.length + 1) / rate) * rate;
  const padded = new Uint8Array(paddedLength);
  padded.set(source);
  padded[source.length] ^= 0x01;
  padded[padded.length - 1] ^= 0x80;
  const state = Array<bigint>(25).fill(0n);
  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let index = 0; index < rate; index += 1) {
      const lane = Math.floor(index / 8);
      const shift = BigInt((index % 8) * 8);
      state[lane] = state[lane]! ^ (BigInt(padded[offset + index]!) << shift);
    }
    keccakPermutation(state);
  }
  const output = new Uint8Array(32);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number((state[Math.floor(index / 8)]! >> BigInt((index % 8) * 8)) & 0xffn);
  }
  return [...output].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function checksumEvmAddress(value: string): string {
  if (!ADDRESS.test(value)) throw new Error(`invalid EVM address: ${value}`);
  const lower = value.slice(2).toLowerCase();
  const digest = keccak256(lower);
  return `0x${[...lower].map((character, index) => (
    /[a-f]/.test(character) && Number.parseInt(digest[index]!, 16) >= 8
      ? character.toUpperCase()
      : character
  )).join("")}`;
}

export interface NormalizedEvmAddress {
  address: string;
  checksumAddress: string;
}

export function normalizeEvmAddress(value: string): NormalizedEvmAddress {
  if (!ADDRESS.test(value)) throw new Error(`invalid EVM address: ${value}`);
  const checksumAddress = checksumEvmAddress(value);
  const body = value.slice(2);
  const mixedCase = body !== body.toLowerCase() && body !== body.toUpperCase();
  if (mixedCase && value !== checksumAddress) {
    throw new Error(`invalid EVM address checksum: ${value}`);
  }
  return { address: value.toLowerCase(), checksumAddress };
}

export function normalizeEvmHash(value: string, field = "hash"): string {
  if (!HASH.test(value)) throw new Error(`invalid EVM ${field}: ${value}`);
  return value.toLowerCase();
}

export function normalizeHexData(value: string, field = "data"): string {
  if (!HEX_DATA.test(value)) throw new Error(`invalid EVM ${field}`);
  return value.toLowerCase();
}

export function uint256(value: string | bigint, field = "quantity"): bigint {
  const parsed = typeof value === "bigint"
    ? value
    : UINT.test(value)
      ? BigInt(value)
      : (() => { throw new Error(`${field} must be an unsigned decimal string`); })();
  if (parsed < 0n || parsed > UINT256_MAX) throw new Error(`${field} is outside uint256`);
  return parsed;
}

export function decimalString(value: string | bigint, field = "quantity"): string {
  return uint256(value, field).toString(10);
}

export function hexQuantity(value: unknown, field = "quantity"): bigint {
  if (typeof value !== "string" || !HEX_QUANTITY.test(value)) {
    throw new Error(`RPC response has invalid ${field}`);
  }
  return uint256(BigInt(value), field);
}

export function safeEvmInteger(value: bigint, field: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`${field} exceeds safe integer storage`);
  return Number(value);
}

export function callSelector(signature: string): string {
  return `0x${keccak256(signature).slice(0, 8)}`;
}

export type EvmFinalityStage = "soft" | "l1-posted" | "l1-final";

export type EvmTransactionKind =
  | "transfer"
  | "contract-call"
  | "contract-create"
  | "unknown";

export interface EvmTransaction {
  hash: string;
  blockNumber: bigint;
  transactionIndex: number;
  from: string;
  to: string | null;
  nonce: bigint;
  value: bigint;
  input: string;
  kind: EvmTransactionKind;
}

export interface EvmBlock {
  number: bigint;
  hash: string;
  parentHash: string;
  timestamp: number;
  l1BlockNumber: bigint | null;
  gasUsed: bigint;
  baseFeePerGas: bigint | null;
  transactions: EvmTransaction[];
}

export interface EvmLog {
  transactionHash: string;
  transactionIndex: number;
  logIndex: number;
  blockNumber: bigint;
  blockHash: string;
  address: string;
  topics: string[];
  data: string;
  removed: boolean;
}

export interface EvmReceipt {
  transactionHash: string;
  blockNumber: bigint;
  transactionIndex: number;
  gasUsed: bigint;
  effectiveGasPrice: bigint | null;
  status: number | null;
  logs: EvmLog[];
}

export interface EvmLogFilter {
  fromBlock: bigint;
  toBlock: bigint;
  addresses?: string[];
  topics?: Array<string | string[] | null>;
}

export interface EvmHealth {
  ok: boolean;
  latencyMs: number;
  head: bigint | null;
  note?: string;
}

/** Every implementation observes public state only. */
export interface EvmSource {
  readonly id: "robinhood-rpc" | "robinhood-node";
  readonly endpoint: string;
  chainId(): Promise<bigint>;
  blockNumber(): Promise<bigint>;
  block(number: bigint): Promise<EvmBlock | null>;
  receipt(hash: string): Promise<EvmReceipt | null>;
  logs(filter: EvmLogFilter): AsyncIterable<EvmLog>;
  balance(address: string, block: bigint): Promise<bigint>;
  call(address: string, data: string, block: bigint): Promise<string>;
  health(): Promise<EvmHealth>;
}
