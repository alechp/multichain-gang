import type { TransactionInput, TransactionKind } from "./db";
import type { RawInstruction, RawTransaction, SigInfo } from "./sources/types";

export const COMPUTE_BUDGET_PROGRAM = "ComputeBudget111111111111111111111111111111";
export const SYSTEM_PROGRAM = "11111111111111111111111111111111";
export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const VOTE_PROGRAM = "Vote111111111111111111111111111111111111111";

export const JITO_TIP_ACCOUNTS = new Set([
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
]);

export const SWAP_PROGRAMS = new Set([
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB",
  "675kPX9MHTjS2zt1qfr1NYHuzef9w3YqPV1Mp8sdqZ",
  "whirLbMiicVdio4qvUfM5KAg6CtRAXk1TgYG35QQcZ",
]);

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function accountKeys(raw: RawTransaction): string[] {
  return (raw.transaction.message.accountKeys ?? []).map((key) => (
    typeof key === "string" ? key : key.pubkey ?? ""
  ));
}

function instructions(raw: RawTransaction): RawInstruction[] {
  return [
    ...(raw.transaction.message.instructions ?? []),
    ...(raw.meta?.innerInstructions ?? []).flatMap((group) => group.instructions ?? []),
  ];
}

function instructionProgram(instruction: RawInstruction, keys: string[]): string | null {
  if (typeof instruction.programId === "string") return instruction.programId;
  if (typeof instruction.programIdIndex === "number") {
    return keys[instruction.programIdIndex] ?? null;
  }
  return null;
}

function decodeBase58(value: string): Uint8Array | null {
  let numeric = 0n;
  for (const character of value) {
    const digit = BASE58_ALPHABET.indexOf(character);
    if (digit < 0) return null;
    numeric = numeric * 58n + BigInt(digit);
  }
  const bytes: number[] = [];
  while (numeric > 0n) {
    bytes.push(Number(numeric & 0xffn));
    numeric >>= 8n;
  }
  for (const character of value) {
    if (character !== "1") break;
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
}

function littleEndian(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let index = bytes.length - 1; index >= 0; index -= 1) {
    result = (result << 8n) | BigInt(bytes[index] ?? 0);
  }
  return result;
}

function parsedComputeBudget(instruction: RawInstruction): {
  limit?: number;
  microLamports?: number;
} {
  const type = instruction.parsed?.type?.toLowerCase().replaceAll("_", "") ?? "";
  const info = instruction.parsed?.info ?? {};
  if (type === "setcomputeunitlimit") {
    const limit = finiteNumber(info.units ?? info.computeUnitLimit);
    return limit === null ? {} : { limit };
  }
  if (type === "setcomputeunitprice") {
    const microLamports = finiteNumber(info.microLamports ?? info.micro_lamports);
    return microLamports === null ? {} : { microLamports };
  }
  if (instruction.data === undefined) return {};
  const data = decodeBase58(instruction.data);
  if (data === null || data.length < 5) return {};
  if (data[0] === 2 && data.length >= 5) {
    return { limit: Number(littleEndian(data.slice(1, 5))) };
  }
  if (data[0] === 3 && data.length >= 9) {
    const value = littleEndian(data.slice(1, 9));
    return value <= BigInt(Number.MAX_SAFE_INTEGER) ? { microLamports: Number(value) } : {};
  }
  return {};
}

export function priorityFeeLamports(raw: RawTransaction): number {
  const keys = accountKeys(raw);
  let limit: number | null = null;
  let microLamports: number | null = null;
  for (const instruction of instructions(raw)) {
    if (instructionProgram(instruction, keys) !== COMPUTE_BUDGET_PROGRAM) continue;
    const parsed = parsedComputeBudget(instruction);
    if (parsed.limit !== undefined) limit = parsed.limit;
    if (parsed.microLamports !== undefined) microLamports = parsed.microLamports;
  }
  if (microLamports === null) return 0;
  const billedUnits = limit ?? raw.meta?.computeUnitsConsumed ?? 0;
  return Math.ceil((billedUnits * microLamports) / 1_000_000);
}

export function jitoTipLamports(raw: RawTransaction): number {
  let total = 0;
  for (const instruction of instructions(raw)) {
    const type = instruction.parsed?.type?.toLowerCase() ?? "";
    const info = object(instruction.parsed?.info);
    const destination = typeof info.destination === "string" ? info.destination : null;
    const lamports = finiteNumber(info.lamports);
    if (type === "transfer" && destination !== null && JITO_TIP_ACCOUNTS.has(destination)) {
      total += lamports ?? 0;
    }
  }
  return total;
}

export function transactionProgramIds(raw: RawTransaction): string[] {
  const keys = accountKeys(raw);
  return [...new Set(instructions(raw)
    .map((instruction) => instructionProgram(instruction, keys))
    .filter((program): program is string => program !== null && program !== ""))];
}

export function classifyTransaction(raw: RawTransaction): TransactionKind {
  const keys = accountKeys(raw);
  const allInstructions = instructions(raw);
  const programs = transactionProgramIds(raw);
  if (programs.includes(VOTE_PROGRAM)) return "vote";

  const parsedTypes = allInstructions
    .map((instruction) => instruction.parsed?.type?.toLowerCase() ?? "");
  if (parsedTypes.some((type) => type.includes("liquidat"))) return "liquidation";

  const swapPrograms = programs.filter((program) => SWAP_PROGRAMS.has(program));
  if (new Set(swapPrograms).size > 1) return "arb-suspect";
  if (swapPrograms.length > 0) return "swap";

  const transfer = allInstructions.some((instruction) => {
    const program = instructionProgram(instruction, keys);
    const type = instruction.parsed?.type?.toLowerCase() ?? "";
    return (program === SYSTEM_PROGRAM || program === TOKEN_PROGRAM)
      && (type === "transfer" || type === "transferchecked");
  });
  return transfer ? "transfer" : "unknown";
}

export interface NormalizeOptions {
  signature: SigInfo;
  address: string;
  rawPath?: string | null;
}

export function normalizeTransaction(
  raw: RawTransaction,
  options: NormalizeOptions,
): TransactionInput {
  const timestamp = raw.blockTime ?? options.signature.blockTime;
  if (timestamp === null) {
    throw new Error(`transaction ${options.signature.signature} has no block time`);
  }
  return {
    signature: options.signature.signature,
    ts: timestamp,
    slot: raw.slot || options.signature.slot,
    address: options.address,
    feeLamports: raw.meta?.fee ?? null,
    priorityFeeLamports: priorityFeeLamports(raw),
    jitoTipLamports: jitoTipLamports(raw),
    programIds: transactionProgramIds(raw),
    kind: classifyTransaction(raw),
    error: raw.meta?.err != null || options.signature.err,
    rawPath: options.rawPath ?? null,
  };
}
