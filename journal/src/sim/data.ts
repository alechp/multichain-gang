import type {
  AddressRecord,
  JournalDatabase,
  JournalEntryRecord,
  MetricRecord,
  SimRunRecord,
  TransactionRecord,
} from "../db";
import { simulators } from "./index";

export const EMPTY_COMMAND = "bun run collect -- --once";
export const SERIES = ["balance.sol", "fees.paid", "tips.paid", "tx.rate"] as const;

export interface AddressSummary {
  address: string;
  label: string | null;
  tags: string[];
  active: boolean;
  lastSeen: number | null;
  balance: Array<[number, number]>;
}

export interface AddressDetail extends AddressSummary {
  fromTs: number;
  toTs: number;
  series: Record<(typeof SERIES)[number], MetricRecord[]>;
  latest: Record<(typeof SERIES)[number], number | null>;
  transactions: TransactionRecord[];
}

export interface WorkbenchState {
  empty: boolean;
  emptyCommand: typeof EMPTY_COMMAND;
  addresses: AddressSummary[];
  selected: AddressDetail | null;
  simRuns: SimRunRecord[];
  entries: JournalEntryRecord[];
  simulators: Array<{
    id: string;
    label: string;
    description: string;
    params: (typeof simulators)[number]["params"];
  }>;
}

export function parseWindow(value: string): number {
  const match = /^(\d+)([mhdw])$/.exec(value.trim().toLowerCase());
  if (match === null) throw new Error("window must look like 30m, 12h, 7d, or 4w");
  const amount = Number(match[1]);
  if (!Number.isSafeInteger(amount) || amount < 1) throw new Error("window must be positive");
  const unit = match[2] as "m" | "h" | "d" | "w";
  return amount * { m: 60, h: 3_600, d: 86_400, w: 604_800 }[unit];
}

function metricPoints(rows: MetricRecord[]): Array<[number, number]> {
  return rows.map((row) => [row.ts, row.value]);
}

function summary(database: JournalDatabase, address: AddressRecord): AddressSummary {
  const lastSeen = database.latestObservationTs(address.address);
  return {
    address: address.address,
    label: address.label,
    tags: address.tags,
    active: address.active,
    lastSeen,
    balance: metricPoints(database.queryMetrics(
      "balance.sol",
      address.address,
      0,
      Number.MAX_SAFE_INTEGER,
    )),
  };
}

export function addressDetail(
  database: JournalDatabase,
  address: string,
  windowSeconds = 30 * 86_400,
): AddressDetail | null {
  const record = database.getAddress(address);
  if (record === null) return null;
  const base = summary(database, record);
  const toTs = base.lastSeen ?? Math.floor(Date.now() / 1_000);
  const fromTs = Math.max(0, toTs - windowSeconds);
  const series = Object.fromEntries(SERIES.map((name) => [
    name,
    database.queryMetrics(name, address, fromTs, toTs),
  ])) as AddressDetail["series"];
  const latest = Object.fromEntries(SERIES.map((name) => [
    name,
    series[name].at(-1)?.value ?? null,
  ])) as AddressDetail["latest"];
  return {
    ...base,
    fromTs,
    toTs,
    series,
    latest,
    transactions: database.queryTransactions(address, fromTs, toTs).slice(-100).reverse(),
  };
}

export function workbenchState(
  database: JournalDatabase,
  selectedAddress?: string,
  windowSeconds = 30 * 86_400,
): WorkbenchState {
  const addresses = database.listAddresses(true).map((address) => summary(database, address));
  const selected = selectedAddress === undefined
    ? addresses[0] === undefined ? null : addressDetail(database, addresses[0].address, windowSeconds)
    : addressDetail(database, selectedAddress, windowSeconds);
  return {
    empty: addresses.length === 0 || addresses.every((address) => address.lastSeen === null),
    emptyCommand: EMPTY_COMMAND,
    addresses,
    selected,
    simRuns: database.listSimRuns(),
    entries: database.listJournalEntries(),
    simulators: simulators.map((simulator) => ({
      id: simulator.id,
      label: simulator.label,
      description: simulator.description,
      params: simulator.params,
    })),
  };
}
