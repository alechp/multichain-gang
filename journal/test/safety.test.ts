import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

describe("read-only collector posture", () => {
  test("keeps wallet-action APIs out of every journal source file", () => {
    const sourceRoot = resolve(import.meta.dir, "..", "src");
    const files: string[] = [];
    const walk = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(path);
      }
    };
    walk(sourceRoot);
    const prohibited = ["send" + "Transaction", "sign" + "Transaction", "Key" + "pair"];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const term of prohibited) expect(source).not.toContain(term);
    }
  });
});
