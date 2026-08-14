#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const page = readFileSync(resolve(root, "index.html"), "utf8");
const tokens = readFileSync(resolve(root, "journal", "web", "tokens.css"), "utf8");
const match = /:root\{[\s\S]*?\n\}/.exec(page);

if (match === null) {
  console.error("token sync: index.html has no :root block");
  process.exitCode = 1;
} else {
  const expected = `${match[0]}\n`;
  if (tokens !== expected) {
    console.error("token sync: journal/web/tokens.css differs from index.html :root");
    process.exitCode = 1;
  } else {
    console.log("token sync: pass");
  }
}
