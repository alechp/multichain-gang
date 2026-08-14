import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyTransaction,
  jitoTipLamports,
  normalizeTransaction,
  priorityFeeLamports,
} from "../src/normalize";
import type { RpcFixture } from "../src/sources/rpc";

const FIXTURE_PATH = resolve(import.meta.dir, "fixtures", "collector.json");
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as RpcFixture;

describe("transaction normalization", () => {
  test("classifies the Jupiter fixture and splits its fee surfaces", () => {
    const address = "11111111111111111111111111111111";
    const signature = fixture.addresses[address]?.signatures[0];
    const raw = signature === undefined ? undefined : fixture.transactions[signature.signature];
    expect(signature).toBeDefined();
    expect(raw).toBeDefined();
    if (signature === undefined || raw === undefined) return;

    expect(classifyTransaction(raw)).toBe("swap");
    expect(priorityFeeLamports(raw)).toBe(2_000);
    expect(jitoTipLamports(raw)).toBe(2_000);
    expect(normalizeTransaction(raw, { signature, address })).toMatchObject({
      signature: signature.signature,
      address,
      feeLamports: 7_000,
      priorityFeeLamports: 2_000,
      jitoTipLamports: 2_000,
      kind: "swap",
      error: false,
    });
  });

  test("recognizes transfer and vote fixtures", () => {
    const tokenAddress = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const voteAddress = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
    const transferSignature = fixture.addresses[tokenAddress]?.signatures[0]?.signature;
    const voteSignature = fixture.addresses[voteAddress]?.signatures[0]?.signature;
    expect(classifyTransaction(fixture.transactions[transferSignature as string] as never)).toBe(
      "transfer",
    );
    expect(classifyTransaction(fixture.transactions[voteSignature as string] as never)).toBe("vote");
  });

  test("requires an observed block time", () => {
    const address = "11111111111111111111111111111111";
    const signature = fixture.addresses[address]?.signatures[0];
    const raw = structuredClone(fixture.transactions[signature?.signature as string]);
    if (signature === undefined || raw === undefined) throw new Error("fixture missing");
    raw.blockTime = null;
    expect(() => normalizeTransaction(raw, {
      signature: { ...signature, blockTime: null },
      address,
    })).toThrow("no block time");
  });
});
