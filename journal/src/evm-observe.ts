import type {
  EvmFinalityInput,
  EvmObservationInput,
  JournalDatabase,
} from "./db";
import { callSelector, normalizeEvmAddress, normalizeEvmHash, type EvmSource } from "./evm-types";

const NETWORK = "robinhood_chain" as const;
const LATEST_ROUND_DATA = callSelector("latestRoundData()");
const ORACLE_PAUSED = callSelector("oraclePaused()");
const UI_MULTIPLIER = callSelector("uiMultiplier()");

function providerLabel(endpoint: string): string {
  const url = new URL(endpoint);
  return url.host || url.protocol.replace(":", "");
}

function words(data: string): bigint[] {
  if (!/^0x(?:[0-9a-f]{64})+$/.test(data)) throw new Error("ABI result must contain 32-byte words");
  const body = data.slice(2);
  return Array.from({ length: body.length / 64 }, (_, index) => (
    BigInt(`0x${body.slice(index * 64, (index + 1) * 64)}`)
  ));
}

function signed(value: bigint): bigint {
  return value >= (1n << 255n) ? value - (1n << 256n) : value;
}

function finiteNonNegative(value: number | undefined, field: string): number | null {
  if (value === undefined) return null;
  if (!Number.isFinite(value) || value < 0) throw new Error(`${field} must be finite and non-negative`);
  return value;
}

export interface ChainlinkObservationConfig {
  feed: string;
  key: string;
  pausedContract?: string;
  sequencerUptimeFeed?: string;
  gracePeriodSeconds?: number;
}

/** Reads Chainlink-style state at one explicit block; it never treats the feed as L2 finality. */
export async function observeChainlink(
  database: JournalDatabase,
  source: EvmSource,
  blockNumber: bigint,
  blockTs: number,
  config: ChainlinkObservationConfig,
  observedAt = Math.floor(Date.now() / 1_000),
): Promise<EvmObservationInput[]> {
  const feed = normalizeEvmAddress(config.feed).address;
  const round = words(await source.call(feed, LATEST_ROUND_DATA, blockNumber));
  if (round.length < 5) throw new Error("latestRoundData returned fewer than five words");
  const updatedAt = Number(round[3]);
  if (!Number.isSafeInteger(updatedAt) || updatedAt < 0 || updatedAt > blockTs) {
    throw new Error("oracle updatedAt is invalid for the observed block");
  }
  const observations: EvmObservationInput[] = [{
    network: NETWORK,
    ts: observedAt,
    series: "oracle.age_ms",
    key: config.key,
    value: (blockTs - updatedAt) * 1_000,
    blockNumber,
    provider: providerLabel(source.endpoint),
    evidence: {
      feed,
      roundId: round[0]?.toString(),
      answer: signed(round[1]!).toString(),
      updatedAt,
      observedBlockTs: blockTs,
    },
  }];

  if (config.pausedContract !== undefined) {
    const pausedAddress = normalizeEvmAddress(config.pausedContract).address;
    const paused = words(await source.call(pausedAddress, ORACLE_PAUSED, blockNumber))[0];
    if (paused !== 0n && paused !== 1n) throw new Error("oraclePaused returned a non-boolean word");
    observations.push({
      network: NETWORK,
      ts: observedAt,
      series: "oracle.paused",
      key: config.key,
      value: Number(paused),
      blockNumber,
      provider: providerLabel(source.endpoint),
      evidence: { contract: pausedAddress },
    });
  }

  if (config.sequencerUptimeFeed !== undefined) {
    const uptimeFeed = normalizeEvmAddress(config.sequencerUptimeFeed).address;
    const uptime = words(await source.call(uptimeFeed, LATEST_ROUND_DATA, blockNumber));
    if (uptime.length < 5) throw new Error("sequencer uptime feed returned fewer than five words");
    const answer = signed(uptime[1]!);
    const startedAt = Number(uptime[2]);
    const grace = config.gracePeriodSeconds ?? 0;
    if (!Number.isSafeInteger(grace) || grace < 0) throw new Error("grace period must be non-negative");
    const up = answer === 0n;
    observations.push({
      network: NETWORK,
      ts: observedAt,
      series: "sequencer.uptime",
      key: config.key,
      value: up ? 1 : 0,
      blockNumber,
      provider: providerLabel(source.endpoint),
      evidence: {
        feed: uptimeFeed,
        rawAnswer: answer.toString(),
        startedAt,
        gracePeriodSeconds: grace,
        graceElapsed: up && blockTs - startedAt >= grace,
      },
    });
  }
  database.writeEvmBatch({ observations });
  return observations;
}

export async function observeUiMultiplier(
  database: JournalDatabase,
  source: EvmSource,
  token: string,
  blockNumber: bigint,
  key: string,
  observedAt = Math.floor(Date.now() / 1_000),
): Promise<EvmObservationInput> {
  const address = normalizeEvmAddress(token).address;
  const multiplier = words(await source.call(address, UI_MULTIPLIER, blockNumber))[0];
  if (multiplier === undefined) throw new Error("uiMultiplier returned no value");
  const observation: EvmObservationInput = {
    network: NETWORK,
    ts: observedAt,
    series: "token.ui_multiplier",
    key,
    textValue: multiplier.toString(),
    blockNumber,
    provider: providerLabel(source.endpoint),
    evidence: { contract: address, bigint: true },
  };
  database.writeEvmBatch({ observations: [observation] });
  return observation;
}

export interface PoolObservationSample {
  pool: string;
  ts: number;
  blockNumber: bigint;
  depth1PctUsd?: number;
  depth2PctUsd?: number;
  spreadBps?: number;
  realizedSlippageBps?: number;
  evidence: Record<string, unknown>;
}

export function recordPoolObservation(
  database: JournalDatabase,
  sample: PoolObservationSample,
): EvmObservationInput[] {
  const pool = normalizeEvmAddress(sample.pool).address;
  const values = [
    ["pool.depth_1pct_usd", finiteNonNegative(sample.depth1PctUsd, "1% depth")],
    ["pool.depth_2pct_usd", finiteNonNegative(sample.depth2PctUsd, "2% depth")],
    ["pool.spread_bps", finiteNonNegative(sample.spreadBps, "spread")],
    ["pool.realized_slippage_bps", finiteNonNegative(sample.realizedSlippageBps, "slippage")],
  ] as const;
  const observations = values.flatMap(([series, value]) => value === null ? [] : [{
    network: NETWORK,
    ts: sample.ts,
    series,
    key: pool,
    value,
    blockNumber: sample.blockNumber,
    evidence: sample.evidence,
  } satisfies EvmObservationInput]);
  if (observations.length === 0) throw new Error("pool observation has no measured values");
  database.writeEvmBatch({ observations });
  return observations;
}

export interface BridgeObservationSample {
  route: string;
  ts: number;
  depositAgeMs?: number;
  withdrawalStage?: string;
  evidence: Record<string, unknown>;
}

export function recordBridgeObservation(
  database: JournalDatabase,
  sample: BridgeObservationSample,
): EvmObservationInput[] {
  const observations: EvmObservationInput[] = [];
  const age = finiteNonNegative(sample.depositAgeMs, "deposit age");
  if (age !== null) observations.push({
    network: NETWORK,
    ts: sample.ts,
    series: "bridge.deposit_age_ms",
    key: sample.route,
    value: age,
    evidence: sample.evidence,
  });
  if (sample.withdrawalStage !== undefined) {
    if (sample.withdrawalStage.trim() === "") throw new Error("withdrawal stage must not be empty");
    observations.push({
      network: NETWORK,
      ts: sample.ts,
      series: "bridge.withdrawal_stage",
      key: sample.route,
      textValue: sample.withdrawalStage,
      evidence: sample.evidence,
    });
  }
  if (observations.length === 0) throw new Error("bridge observation has no measured values");
  database.writeEvmBatch({ observations });
  return observations;
}

export function recordFinalityEvidence(
  database: JournalDatabase,
  input: EvmFinalityInput,
): void {
  if (input.stage === "soft") throw new Error("soft finality is recorded by the HTTP block collector");
  const soft = database.queryEvmFinality(NETWORK, input.blockNumber)
    .find((row) => row.stage === "soft");
  if (soft === undefined) throw new Error("finality evidence requires a stored soft observation");
  const series = input.stage === "l1-posted" ? "finality.l1_post_ms" : "finality.l1_final_ms";
  database.writeEvmBatch({
    finality: [{
      ...input,
      l1TxHash: input.l1TxHash === undefined || input.l1TxHash === null
        ? null
        : normalizeEvmHash(input.l1TxHash, "L1 transaction hash"),
    }],
    observations: [{
      network: NETWORK,
      ts: input.stageTs,
      series,
      key: `block:${input.blockNumber}`,
      value: (input.stageTs - soft.stageTs) * 1_000,
      blockNumber: input.blockNumber,
      evidence: input.evidence,
    }],
  });
}
