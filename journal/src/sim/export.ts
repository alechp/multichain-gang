import type {
  AddressRecord,
  JournalDatabase,
  JournalEntryRecord,
  SimRunRecord,
} from "../db";
import { validateSimResult, type SimResult } from "./types";

export interface JournalExport {
  version: 1;
  exportedAt: string;
  addresses: AddressRecord[];
  simRuns: SimRunRecord[];
  entries: JournalEntryRecord[];
}

export function exportBundle(database: JournalDatabase, exportedAt = new Date()): JournalExport {
  return {
    version: 1,
    exportedAt: exportedAt.toISOString(),
    addresses: database.listAddresses(false),
    simRuns: database.listSimRuns().reverse(),
    entries: database.listJournalEntries().reverse(),
  };
}

export function exportJson(database: JournalDatabase, exportedAt = new Date()): string {
  return `${JSON.stringify(exportBundle(database, exportedAt), null, 2)}\n`;
}

function date(ts: number): string {
  return new Date(ts * 1_000).toISOString();
}

function simMarkdown(run: SimRunRecord): string {
  validateSimResult(run.result);
  const result = run.result as SimResult;
  return [
    `## ${date(run.ts)} · SIM · ${run.sim}`,
    "",
    `**${result.stamp}**`,
    "",
    result.summary,
    "",
    `Address: \`${run.address}\`  `,
    `Run: \`${run.id}\``,
    "",
    "### Metrics",
    "",
    ...result.metrics.map((metric) => `- ${metric.k}: ${metric.v}`),
    "",
    "### Assumptions",
    "",
    ...result.assumptions.map((assumption) => `- ${assumption}`),
    "",
    "### Caveats",
    "",
    ...result.caveats.map((caveat) => `- ${caveat}`),
  ].join("\n");
}

function entryMarkdown(entry: JournalEntryRecord): string {
  const metadata = [
    entry.address === null ? null : `Address: \`${entry.address}\``,
    entry.simRun === null ? null : `Sim run: \`${entry.simRun}\``,
    entry.tags.length === 0 ? null : `Tags: ${entry.tags.map((tag) => `\`${tag}\``).join(", ")}`,
  ].filter((value): value is string => value !== null);
  return [
    `## ${date(entry.ts)} · NOTE`,
    "",
    entry.body,
    ...(metadata.length === 0 ? [] : ["", metadata.join("  \n")]),
  ].join("\n");
}

export function exportMarkdown(database: JournalDatabase, exportedAt = new Date()): string {
  const bundle = exportBundle(database, exportedAt);
  const events = [
    ...bundle.simRuns.map((run) => ({ ts: run.ts, id: run.id, markdown: simMarkdown(run) })),
    ...bundle.entries.map((entry) => ({
      ts: entry.ts,
      id: entry.id,
      markdown: entryMarkdown(entry),
    })),
  ].sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
  return [
    "# Scope Journal Export",
    "",
    `Generated: ${bundle.exportedAt}`,
    "",
    "All simulator sections are paper-only historical estimates.",
    ...(events.length === 0
      ? ["", "_No notes or simulator runs yet._"]
      : events.flatMap((event) => ["", "---", "", event.markdown])),
    "",
  ].join("\n");
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function importBundle(database: JournalDatabase, value: unknown): JournalExport {
  const input = object(value, "export");
  if (input.version !== 1) throw new Error("unsupported journal export version");
  if (!Array.isArray(input.addresses) || !Array.isArray(input.simRuns) || !Array.isArray(input.entries)) {
    throw new Error("journal export arrays are missing");
  }
  database.transaction((journal) => {
    for (const raw of input.addresses) {
      const address = object(raw, "address") as unknown as AddressRecord;
      journal.upsertAddress({
        address: address.address,
        label: address.label,
        tags: address.tags,
        addedAt: address.addedAt,
        active: address.active,
      });
    }
    for (const raw of input.simRuns) {
      const run = object(raw, "sim run") as unknown as SimRunRecord;
      validateSimResult(run.result);
      journal.saveSimRun(run);
    }
    for (const raw of input.entries) {
      const entry = object(raw, "journal entry") as unknown as JournalEntryRecord;
      journal.addJournalEntry({
        id: entry.id,
        ts: entry.ts,
        body: entry.body,
        address: entry.address,
        simRun: entry.simRun,
        tags: entry.tags,
      });
    }
  });
  return input as unknown as JournalExport;
}

export function importJson(database: JournalDatabase, json: string): JournalExport {
  return importBundle(database, JSON.parse(json) as unknown);
}
