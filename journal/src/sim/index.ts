import type { JournalDatabase, SimRunRecord } from "../db";
import { cexdexGapWatch } from "./cexdex-gap-watch";
import { jitoTipBand } from "./jito-tip-band";
import { priorityFeeSweep } from "./priority-fee-sweep";
import {
  resolveParams,
  validateSimResult,
  type SimContext,
  type Simulator,
} from "./types";

export const simulators: Simulator[] = [priorityFeeSweep, jitoTipBand, cexdexGapWatch];

export function simulatorById(id: string): Simulator {
  const simulator = simulators.find((candidate) => candidate.id === id);
  if (simulator === undefined) throw new Error(`unknown simulator ${id}`);
  return simulator;
}

export interface ExecuteSimulatorOptions {
  database: JournalDatabase;
  id: string;
  address: string;
  rawParams?: Record<string, unknown>;
  windowSeconds?: number;
  runTs?: number;
}

export function executeSimulator(options: ExecuteSimulatorOptions): SimRunRecord {
  const simulator = simulatorById(options.id);
  if (options.database.getAddress(options.address) === null) {
    throw new Error(`watched address not found: ${options.address}`);
  }
  const params = resolveParams(simulator.params, options.rawParams ?? {});
  const requests = simulator.metricRequests(params, options.address);
  const addressToTs = options.database.latestObservationTs(options.address);
  const metricToTs = simulator.metricScope === "global"
    ? requests.flatMap((request) => (
        options.database.queryMetrics(request.series, request.key, 0, Number.MAX_SAFE_INTEGER)
      )).reduce<number | null>((latest, row) => (
        latest === null || row.ts > latest ? row.ts : latest
      ), null)
    : null;
  const observedToTs = Math.max(addressToTs ?? 0, metricToTs ?? 0);
  const toTs = observedToTs > 0
    ? observedToTs
    : options.runTs ?? Math.floor(Date.now() / 1_000);
  const windowSeconds = options.windowSeconds ?? 30 * 86_400;
  const fromTs = Math.max(0, toTs - windowSeconds);
  const metrics = requests.flatMap((request) => (
    options.database.queryMetrics(request.series, request.key, fromTs, toTs)
  ));
  const context: SimContext = {
    address: options.address,
    fromTs,
    toTs,
    params,
    transactions: options.database.queryTransactions(options.address, fromTs, toTs),
    metrics,
  };
  const result = simulator.run(context);
  validateSimResult(result);
  return options.database.saveSimRun({
    ts: options.runTs,
    sim: simulator.id,
    address: options.address,
    params,
    result,
  });
}

export * from "./types";
