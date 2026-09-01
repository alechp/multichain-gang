#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "multichain/robinhood/source/data");
const CACHE_DIR = process.env.RH_SOURCE_GIT_CACHE || path.join(os.tmpdir(), "multichain-gang-rh-source-cache-v1");
const SCHEMA_VERSION = 1;
const GENERATOR_VERSION = "1.0.0";
const CUTOFF = "2026-09-01";
const NITRO_COMMIT = "3599acae1ad2fab4059fc46453c9cd3294126641";
const SHARD_TARGET_BYTES = 60 * 1024;
const SHARD_HARD_BYTES = 128 * 1024;

const GROUPS = [
  { id: "robinhood-contributions", label: "ROBINHOOD-PUBLISHED CONTRIBUTIONS", order: 0 },
  { id: "pinned-runtime", label: "PINNED RUNTIME SOURCE", order: 1 },
  { id: "runtime-dependencies", label: "PINNED RUNTIME DEPENDENCIES", order: 2 },
  { id: "integrations", label: "OFFICIAL INTEGRATION SOURCE", order: 3 },
];

function repository(input) {
  const [owner, name] = input.slug.split("/");
  const record = {
    owner,
    name,
    canonicalUrl: `https://github.com/${input.slug}`,
    sourceCheckedAt: CUTOFF,
    defaultHiddenGroups: ["test", "generated", "vendor", "asset"],
    status: { fork: false, archived: false, private: false },
    ...input,
  };
  delete record.slug;
  return record;
}

const REPOSITORIES = [
  repository({ id: "rh-chains", slug: "robinhoodmarkets/chains", commit: "dbbb502f2c7f7a59b16c18c57255c35a5d9e0ebb", groupId: "robinhood-contributions", evidenceTier: "A", evidenceState: "confirmed", deploymentEquivalence: "robinhood-contribution", inclusionBasis: "Robinhood Markets EIP-155 chain 4663 contribution.", license: { spdx: "MIT", path: "LICENSE", excerptAllowed: true }, status: { fork: true, archived: false, private: false } }),
  repository({ id: "rh-viem", slug: "robinhoodmarkets/viem", commit: "836ab6a2cd3169797736072429b793557394e6e9", groupId: "robinhood-contributions", evidenceTier: "A", evidenceState: "confirmed", deploymentEquivalence: "robinhood-contribution", inclusionBasis: "Robinhood Markets chain definitions and token-address contribution.", license: { spdx: "MIT", path: "LICENSE", excerptAllowed: true }, status: { fork: true, archived: false, private: false } }),
  repository({ id: "rh-forge-std", slug: "robinhoodmarkets/forge-std", commit: "860965334c22aa1933e2e0c1de0cbedcbf5daa19", groupId: "robinhood-contributions", evidenceTier: "A", evidenceState: "confirmed", deploymentEquivalence: "robinhood-contribution", inclusionBasis: "Robinhood Markets Foundry StdChains contribution.", license: { spdx: "Apache-2.0", path: "LICENSE-APACHE", excerptAllowed: true }, status: { fork: true, archived: false, private: false } }),
  repository({ id: "rh-chainlist-mainnet", slug: "robinhoodmarkets/chainlist", commit: "0fc6cee323d0f2fd7d67a654e32d58d1a911336c", groupId: "robinhood-contributions", evidenceTier: "A", evidenceState: "confirmed", deploymentEquivalence: "robinhood-contribution", inclusionBasis: "Robinhood mainnet Chainlist contribution commit.", license: { spdx: "GPL-3.0", path: "LICENCE.md", excerptAllowed: true }, status: { fork: true, archived: false, private: false } }),
  repository({ id: "rh-chainlist-testnet", slug: "robinhoodmarkets/chainlist", commit: "74fcf54e9b5754cfa2f1afae08dda673b908d016", groupId: "robinhood-contributions", evidenceTier: "A", evidenceState: "confirmed", deploymentEquivalence: "robinhood-contribution", inclusionBasis: "Robinhood testnet Chainlist contribution commit; kept separate from mainnet.", license: { spdx: "GPL-3.0", path: "LICENCE.md", excerptAllowed: true }, status: { fork: true, archived: false, private: false } }),
  repository({ id: "rh-l2beat", slug: "robinhoodmarkets/l2beat", commit: "17edbcfa4857adc07d72e412803a567d484b2e9b", groupId: "robinhood-contributions", evidenceTier: "A", evidenceState: "confirmed", deploymentEquivalence: "robinhood-contribution", inclusionBasis: "Robinhood protocol discovery/config proposal.", license: { spdx: "MIT", path: "LICENSE", excerptAllowed: true }, status: { fork: true, archived: false, private: false } }),

  repository({ id: "nitro", slug: "OffchainLabs/nitro", commit: NITRO_COMMIT, tag: "v3.11.2", groupId: "pinned-runtime", evidenceTier: "B", evidenceState: "version-pinned", deploymentEquivalence: "public-node-build-pin", inclusionBasis: "Robinhood full-node guide pins offchainlabs/nitro-node:v3.11.2-3599aca.", license: { spdx: "BUSL-1.1", path: "LICENSE.md", excerptAllowed: true } }),
  repository({ id: "nitro-go-ethereum", slug: "OffchainLabs/go-ethereum", commit: "f3a977ddf30b138da2fe673ac5cbff2bc6dd4c88", groupId: "runtime-dependencies", evidenceTier: "B", evidenceState: "version-pinned", deploymentEquivalence: "reference-only", inclusionBasis: "Direct gitlink go-ethereum in pinned Nitro.", license: { spdx: "LGPL-3.0", path: "COPYING.LESSER", excerptAllowed: true } }),
  repository({ id: "nitro-contracts-current", slug: "OffchainLabs/nitro-contracts", commit: "4341b132cfbdcc980ead03765ca5224ff6cb5d97", groupId: "runtime-dependencies", evidenceTier: "B", evidenceState: "version-pinned", deploymentEquivalence: "reference-only", inclusionBasis: "Direct gitlink contracts in pinned Nitro.", license: { spdx: "BUSL-1.1", path: "LICENSE.md", excerptAllowed: true } }),
  repository({ id: "nitro-contracts-legacy", slug: "OffchainLabs/nitro-contracts", commit: "68a8efc587e51813755d746f53d2cda9a4c16311", groupId: "runtime-dependencies", evidenceTier: "B", evidenceState: "version-pinned", deploymentEquivalence: "reference-only", inclusionBasis: "Distinct direct gitlink contracts-legacy in pinned Nitro.", license: { spdx: "BUSL-1.1", path: "LICENSE.md", excerptAllowed: true } }),
  repository({ id: "nitro-precompile-interfaces", slug: "OffchainLabs/nitro-precompile-interfaces", commit: "7e88c8cc53c2e96201a23c638f1536557b9cb68b", groupId: "runtime-dependencies", evidenceTier: "B", evidenceState: "version-pinned", deploymentEquivalence: "reference-only", inclusionBasis: "Direct gitlink contracts-local/src/precompiles in pinned Nitro.", license: { spdx: "BUSL-1.1", path: "LICENSE.md", excerptAllowed: true } }),
  repository({ id: "openzeppelin-contracts", slug: "OpenZeppelin/openzeppelin-contracts", commit: "b438cb695a1ac520cee6678610b161b1d5df4d9c", groupId: "runtime-dependencies", evidenceTier: "B", evidenceState: "version-pinned", deploymentEquivalence: "reference-only", inclusionBasis: "Direct gitlink contracts-local/lib/openzeppelin-contracts in pinned Nitro.", license: { spdx: "MIT", path: "LICENSE", excerptAllowed: true } }),
  repository({ id: "brotli", slug: "google/brotli", commit: "f4153a09f87cbb9c826d8fc12c74642bb2d879ea", groupId: "runtime-dependencies", evidenceTier: "B", evidenceState: "version-pinned", deploymentEquivalence: "reference-only", inclusionBasis: "Direct gitlink brotli in pinned Nitro.", license: { spdx: "MIT", path: "LICENSE", excerptAllowed: true } }),
  repository({ id: "nitro-testnode", slug: "OffchainLabs/nitro-testnode", commit: "14c703d909d1242f8a67b031cbe62ef747539b64", groupId: "runtime-dependencies", evidenceTier: "B", evidenceState: "version-pinned", deploymentEquivalence: "reference-only", inclusionBasis: "Direct gitlink nitro-testnode in pinned Nitro.", license: { spdx: "Apache-2.0", path: "LICENSE", excerptAllowed: true } }),
  repository({ id: "wasmer", slug: "OffchainLabs/wasmer", commit: "63c981919d5a5598cdafb197841fa784b5cde955", groupId: "runtime-dependencies", evidenceTier: "B", evidenceState: "version-pinned", deploymentEquivalence: "reference-only", inclusionBasis: "Direct gitlink crates/tools/wasmer in pinned Nitro.", license: { spdx: "MIT", path: "LICENSE", excerptAllowed: true } }),
  repository({ id: "softfloat", slug: "OffchainLabs/SoftFloat", commit: "7bf03222ad094ec3441f5c3935eeb1b41ee470ba", groupId: "runtime-dependencies", evidenceTier: "B", evidenceState: "version-pinned", deploymentEquivalence: "reference-only", inclusionBasis: "Direct gitlink SoftFloat in pinned Nitro.", license: { spdx: null, excerptAllowed: false } }),
  repository({ id: "wasm-testsuite", slug: "WebAssembly/testsuite", commit: "e25ae159357c055b3a6fac99043644e208d26d2a", groupId: "runtime-dependencies", evidenceTier: "B", evidenceState: "version-pinned", deploymentEquivalence: "reference-only", inclusionBasis: "Direct gitlink WebAssembly testsuite in pinned Nitro.", license: { spdx: "Apache-2.0", path: "LICENSE", excerptAllowed: true } }),
  repository({ id: "stylus-sdk-rs", slug: "OffchainLabs/stylus-sdk-rs", commit: "974ff14fe600c6be79fa87ecf8950c131e046a29", groupId: "runtime-dependencies", evidenceTier: "B", evidenceState: "version-pinned", deploymentEquivalence: "reference-only", inclusionBasis: "Direct gitlink Rust Stylus SDK in pinned Nitro.", license: { spdx: null, excerptAllowed: false } }),
  repository({ id: "stylus-sdk-c", slug: "OffchainLabs/stylus-sdk-c", commit: "46ef0fccb60222ee6b1e7cdb440b2f8dcb9e0a33", groupId: "runtime-dependencies", evidenceTier: "B", evidenceState: "version-pinned", deploymentEquivalence: "reference-only", inclusionBasis: "Direct gitlink C Stylus SDK in pinned Nitro.", license: { spdx: null, excerptAllowed: false } }),
  repository({ id: "stylus-sdk-bf", slug: "OffchainLabs/stylus-sdk-bf", commit: "398b522785aaa475757aeaa3ed447529732da061", groupId: "runtime-dependencies", evidenceTier: "B", evidenceState: "version-pinned", deploymentEquivalence: "reference-only", inclusionBasis: "Direct gitlink Brainfuck Stylus SDK in pinned Nitro.", license: { spdx: null, excerptAllowed: false } }),
  repository({ id: "safe-smart-account", slug: "safe-fndn/safe-smart-account", commit: "dc437e8fba8b4805d76bcbd1c668c9fd3d1e83be", groupId: "runtime-dependencies", evidenceTier: "B", evidenceState: "version-pinned", deploymentEquivalence: "reference-only", inclusionBasis: "Direct gitlink safe-smart-account in pinned Nitro; declared owner redirects from safe-global.", declaredUrl: "https://github.com/safe-global/safe-smart-account", license: { spdx: "LGPL-3.0", path: "LICENSE", excerptAllowed: true } }),

  repository({ id: "arb-sdk", slug: "OffchainLabs/arbitrum-sdk", commit: "7948889f97bdbb01ef0ba03a98507027ff5586fa", groupId: "integrations", evidenceTier: "C", evidenceState: "integration-reference", deploymentEquivalence: "integration-source", inclusionBasis: "Robinhood cross-chain guide recommends @arbitrum/sdk.", license: { spdx: "Apache-2.0", path: "LICENSE", excerptAllowed: true } }),
  repository({ id: "data-streams-sdk", slug: "smartcontractkit/data-streams-sdk", commit: "24ba34ddd55cab9f8074ef13d79e968c12c00e5c", groupId: "integrations", evidenceTier: "C", evidenceState: "integration-reference", deploymentEquivalence: "integration-source", inclusionBasis: "Robinhood Data Streams guide names the official SDKs in this repository.", license: { spdx: "MIT", path: "LICENSE", excerptAllowed: true } }),
  repository({ id: "uniswap-contracts", slug: "Uniswap/contracts", commit: "4cfc406c8e34da3ce04e60657a7825075b64fd22", groupId: "integrations", evidenceTier: "C", evidenceState: "integration-reference", deploymentEquivalence: "integration-source", inclusionBasis: "Official deployment registry includes chain 4663.", license: { spdx: null, excerptAllowed: false } }),
  repository({ id: "uniswapx", slug: "Uniswap/UniswapX", commit: "fd6022568ebeb761008fcc68d5b5a417e0e0a815", groupId: "integrations", evidenceTier: "C", evidenceState: "integration-reference", deploymentEquivalence: "integration-source", inclusionBasis: "Official Robinhood playbook and chain-specific block clock.", license: { spdx: "GPL-3.0", path: "LICENSE", excerptAllowed: true } }),
  repository({ id: "liquidity-launcher", slug: "Uniswap/liquidity-launcher", commit: "1eda9f0c0243e2fdc0cbe0d665200ffa8c2ba53a", groupId: "integrations", evidenceTier: "C", evidenceState: "integration-reference", deploymentEquivalence: "integration-source", inclusionBasis: "Official repository lists Robinhood deployments.", license: { spdx: "MIT", path: "LICENSE", excerptAllowed: true } }),
  repository({ id: "uniswap-sdks", slug: "Uniswap/sdks", commit: "48dea05c1800598a31005c333c08344e53e2b9c6", groupId: "integrations", evidenceTier: "C", evidenceState: "integration-reference", deploymentEquivalence: "integration-source", inclusionBasis: "Official monorepo has explicit chain 4663 constants and tests.", license: { spdx: null, excerptAllowed: true } }),
  repository({ id: "ercs", slug: "ethereum/ERCs", commit: "94c80fab6e0a40f658e947b57f7f0b581cd3f081", groupId: "integrations", evidenceTier: "C", evidenceState: "upstream-reference", deploymentEquivalence: "reference-only", inclusionBasis: "Robinhood Stock Token docs require draft ERC-8056; this is its reference repository.", license: { spdx: "CC0-1.0", path: "LICENSE.md", excerptAllowed: true } }),
];

const NITRO_GITLINKS = new Map([
  ["go-ethereum", "nitro-go-ethereum"], ["contracts", "nitro-contracts-current"], ["contracts-legacy", "nitro-contracts-legacy"],
  ["contracts-local/src/precompiles", "nitro-precompile-interfaces"], ["contracts-local/lib/openzeppelin-contracts", "openzeppelin-contracts"],
  ["brotli", "brotli"], ["nitro-testnode", "nitro-testnode"], ["crates/tools/wasmer", "wasmer"],
  ["crates/wasm-libraries/soft-float/SoftFloat", "softfloat"], ["crates/wasm-testsuite/testsuite", "wasm-testsuite"],
  ["crates/langs/rust", "stylus-sdk-rs"], ["crates/langs/c", "stylus-sdk-c"], ["crates/langs/bf", "stylus-sdk-bf"],
  ["safe-smart-account", "safe-smart-account"],
]);

const HIGHLIGHTS = [
  { id: "H01", chapterId: "src-01", title: "Feed reconnect cursor", repoId: "nitro", path: "broadcastclient/broadcastclient.go", startLine: 225, endLine: 234, language: "go", relationship: "PINNED NODE BUILD", mechanism: "A reconnect handshake asks for the next expected message sequence rather than deriving a cursor from block height.", quantInsight: "Persist the feed sequence cursor independently from block numbers and time the reconnect-to-first-valid-frame interval.", measurements: ["connect_to_first_valid_frame_ms", "requested_sequence_gap", "catch_up_messages_per_second"], failureModes: ["stale resume cursor", "sequence gap", "validation failure after reconnect"], caveats: ["Pinned upstream behavior is not proof of Robinhood production timeout or backoff configuration.", "Do not disable chain, version, TLS, or signature validation for latency."], evidenceUrl: "https://docs.robinhood.com/chain/run-a-full-node/", license: { spdx: "BUSL-1.1", notice: "Excerpt from the Robinhood-documented Nitro node revision; repository additional-use grant applies." } },
  { id: "H02", chapterId: "src-03", title: "Continuity, duplicates, and soft-state replacement", repoId: "nitro", path: "arbnode/transaction_streamer.go", startLine: 655, endLine: 672, language: "go", relationship: "PINNED NODE BUILD", mechanism: "The streamer distinguishes contiguous arrivals, older duplicates, and jumps while maintaining a feed-ahead soft view.", quantInsight: "Journal soft feed state and later confirmation as separate promotion events instead of mutating one latest value.", measurements: ["feed_pending_depth", "duplicate_message_count", "sequence_jump_count", "soft_to_confirmed_ms"], failureModes: ["feed jump", "duplicate delivery", "soft-state rollback"], caveats: ["Feed state is not final and can be replaced during reconciliation."], evidenceUrl: "https://docs.robinhood.com/chain/transaction-finality/", license: { spdx: "BUSL-1.1", notice: "Pinned Nitro source." } },
  { id: "H03", chapterId: "src-02", title: "RPC forwarding and classified failover", repoId: "nitro", path: "execution/gethexec/forwarder.go", startLine: 126, endLine: 143, language: "go", relationship: "PINNED NODE BUILD", mechanism: "Forwarding tries configured targets in priority order and advances on classified errors rather than blindly hedging every request.", quantInsight: "Separate warm-connection latency from failure-detection and backup-acceptance latency.", measurements: ["cold_vs_warm_submit_ms", "failure_classification_ms", "backup_accept_ms", "duplicate_hash_outcome"], failureModes: ["slow primary without classified failure", "stale health signal", "duplicate submission ambiguity"], caveats: ["Robinhood documents endpoints, not the provider topology or these upstream defaults."], evidenceUrl: "https://docs.robinhood.com/chain/connecting/", license: { spdx: "BUSL-1.1", notice: "Pinned Nitro source." } },
  { id: "H04", chapterId: "src-02", title: "Sequencer queue and first appearance", repoId: "nitro", path: "execution/gethexec/sequencer.go", startLine: 677, endLine: 694, language: "go", relationship: "PINNED NODE BUILD", mechanism: "A queue item records first appearance before channel-backed assembly and nonce/gas constraints are applied.", quantInsight: "Measure acceptance, queue wait, construction, and receipt as distinct intervals.", measurements: ["edge_to_queue_ms", "queue_wait_ms", "assembly_ms", "nonce_retry_count"], failureModes: ["bounded queue saturation", "nonce deferral", "gas or data-limit exhaustion"], caveats: ["Robinhood documents FCFS and no priority-gas auction; Timeboost code presence does not show deployment."], evidenceUrl: "https://docs.robinhood.com/chain/differences-from-ethereum/", license: { spdx: "BUSL-1.1", notice: "Pinned Nitro source." } },
  { id: "H05", chapterId: "src-03", title: "Independent confidence watermarks", repoId: "nitro", path: "arbnode/sync_monitor.go", startLine: 135, endLine: 152, language: "go", relationship: "PINNED NODE BUILD", mechanism: "The sync monitor exposes message, feed-pending, batch-seen, and batch-processed watermarks rather than one head.", quantInsight: "Persist each confidence stage and its rollback/reconciliation events.", measurements: ["feed_to_posted_ms", "posted_to_safe_ms", "safe_to_finalized_ms", "batch_processing_lag"], failureModes: ["feed ahead of durable state", "batch processing lag", "parent-chain reorg"], caveats: ["Reader modes and upstream defaults do not establish Robinhood operator settings."], evidenceUrl: "https://docs.robinhood.com/chain/transaction-finality/", license: { spdx: "BUSL-1.1", notice: "Pinned Nitro source." } },
  { id: "H06", chapterId: "src-06", title: "Robinhood-specific UniswapX block clock", repoId: "uniswapx", sourceCommit: "3f5019cf206bc2b37a47c7653f039914f93ad60d", path: "src/base/BlockNumberish.sol", startLine: 18, endLine: 31, language: "solidity", relationship: "DEPLOYED INTEGRATION", mechanism: "The Robinhood branch selects the ArbSys L2 block height instead of EVM block.number for block-based order boundaries.", quantInsight: "Offchain builders must use the same clock as the contract or compute a different decay/exclusivity boundary.", measurements: ["arbsys_vs_evm_height", "quote_to_fill_blocks", "idle_height_stall_ms"], failureModes: ["wrong clock selection", "static block-time assumption", "boundary disagreement"], caveats: ["Confirm current live address and bytecode before claiming this revision remains deployed."], evidenceUrl: "https://github.com/Uniswap/UniswapX/blob/3f5019cf206bc2b37a47c7653f039914f93ad60d/playbook/chains/robinhood.md", license: { spdx: "GPL-3.0", notice: "Focused excerpt from UniswapX." } },
  { id: "H07", chapterId: "src-06", title: "Static block-clock model", repoId: "uniswap-sdks", path: "sdks/liquidity-launcher-sdk/src/constants.ts", startLine: 67, endLine: 82, language: "typescript", relationship: "AUTHORITATIVE REFERENCE", mechanism: "Application constants encode a Robinhood block-time approximation used for translating wall duration into block counts.", quantInsight: "Recompute rolling height-per-wall-time error instead of treating an application constant as a protocol guarantee.", measurements: ["l2_height_per_second", "predicted_boundary_error_ms", "idle_gap_ms"], failureModes: ["activity-dependent cadence", "stale constant", "cross-package model disagreement"], caveats: ["Application approximations are not Robinhood protocol guarantees."], evidenceUrl: "https://docs.robinhood.com/chain/differences-from-ethereum/", license: { spdx: null, notice: "Package-specific license must be reviewed with the monorepo path." } },
  { id: "H08", chapterId: "src-05", title: "RWA report freshness and market state", repoId: "data-streams-sdk", path: "go/report/v10/data.go", startLine: 15, endLine: 32, language: "go", relationship: "AUTHORITATIVE REFERENCE", mechanism: "The report schema separates validity, observation, expiry, market status, multiplier transition, and tokenized price.", quantInsight: "A signed report still needs freshness, session, schema, and multiplier-transition checks.", measurements: ["observation_to_receive_ms", "receive_to_verify_ms", "report_age_ms", "market_status_rejections"], failureModes: ["stale or expired report", "closed market", "schema or feed-ID mismatch", "multiplier boundary error"], caveats: ["This SDK schema is not Robinhood verifier source; match the deployed report schema."], evidenceUrl: "https://docs.robinhood.com/chain/data-streams/", license: { spdx: "MIT", notice: "Chainlink Data Streams SDK." } },
  { id: "H09", chapterId: "src-02", title: "Transaction pre-check state", repoId: "nitro", path: "execution/gethexec/tx_pre_checker.go", startLine: 139, endLine: 156, language: "go", relationship: "PINNED NODE BUILD", mechanism: "Pre-checking evaluates transaction constraints against a chosen state view before forwarding or sequencing.", quantInsight: "Attach node-state age and rejection taxonomy to every client-side or intermediary preflight result.", measurements: ["state_age_at_rejection_ms", "nonce_rejection_count", "independent_retry_success"], failureModes: ["lagging state false negative", "nonce race", "conditional transaction mismatch"], caveats: ["Strictness and filter configuration are not public Robinhood settings."], evidenceUrl: "https://docs.robinhood.com/chain/run-a-full-node/", license: { spdx: "BUSL-1.1", notice: "Pinned Nitro source." } },
  { id: "H10", chapterId: "src-04", title: "Execution cache configuration", repoId: "nitro", path: "execution/gethexec/blockchain.go", startLine: 93, endLine: 109, language: "go", relationship: "PINNED NODE BUILD", mechanism: "Execution storage exposes explicit cache, snapshot, retention, and state-scheme controls.", quantInsight: "Correlate RPC tails with cache misses, compaction, index lag, I/O stalls, and garbage collection.", measurements: ["rpc_p99_ms", "cache_hit_ratio", "compaction_stall_ms", "index_lag_blocks"], failureModes: ["cache churn", "disk saturation", "retention mismatch"], caveats: ["Defaults are not universal recommendations or Robinhood production settings."], evidenceUrl: "https://docs.robinhood.com/chain/run-a-full-node/", license: { spdx: "BUSL-1.1", notice: "Pinned Nitro source." } },
  { id: "H11", chapterId: "src-05", title: "Bounded stream deduplication", repoId: "data-streams-sdk", path: "typescript/src/stream/deduplication.ts", startLine: 34, endLine: 51, language: "typescript", relationship: "AUTHORITATIVE REFERENCE", mechanism: "A bounded timestamp set and watermark classify duplicate and out-of-order stream observations.", quantInsight: "Record origin, observation timestamp, decision, and eviction so high availability does not silently become data loss.", measurements: ["duplicate_count", "out_of_order_count", "origin_skew_ms", "watermark_age_ms"], failureModes: ["dedupe-window eviction", "out-of-order drop", "origin reconnect skew"], caveats: ["SDK connection behavior does not prove Robinhood oracle topology."], evidenceUrl: "https://docs.robinhood.com/chain/data-streams/", license: { spdx: "MIT", notice: "Chainlink Data Streams SDK." } },
  { id: "H12", chapterId: "src-06", title: "Liquidity migration boundary", repoId: "liquidity-launcher", path: "src/strategies/lbp/LBPStrategy.sol", startLine: 146, endLine: 163, language: "solidity", relationship: "AUTHORITATIVE REFERENCE", mechanism: "The launch strategy gates migration from an auction phase into pool-readable liquidity.", quantInsight: "Measure eligibility, transaction inclusion, and first reliable pool state as separate boundaries.", measurements: ["eligibility_to_migration_ms", "migration_to_pool_read_ms", "last_auction_to_first_pool_price_delta"], failureModes: ["migration transaction failure", "pool read lag", "boundary price mismatch"], caveats: ["Resolve the live address and bytecode before treating this current repository path as deployed code."], evidenceUrl: "https://github.com/Uniswap/liquidity-launcher/blob/1eda9f0c0243e2fdc0cbe0d665200ffa8c2ba53a/README.md", license: { spdx: "MIT", notice: "Uniswap liquidity-launcher." } },
  { id: "H13", chapterId: "src-05", title: "ERC-8056 multiplier transition", repoId: "ercs", path: "ERCS/erc-8056.md", startLine: 147, endLine: 164, language: "markdown", relationship: "AUTHORITATIVE REFERENCE", mechanism: "The draft reference separates raw token accounting from a display multiplier and scheduled effective time.", quantInsight: "Reconcile raw balance, current/new multiplier, activation time, and historical block timestamp without double adjustment.", measurements: ["multiplier_schedule_lead_ms", "api_onchain_multiplier_mismatch", "boundary_revaluation"], failureModes: ["double multiplier application", "effective-time disagreement", "historical display error"], caveats: ["ERC-8056 is a draft reference, not public Robinhood Stock Token contract source."], evidenceUrl: "https://docs.robinhood.com/chain/stock-tokens/", license: { spdx: "CC0-1.0", notice: "Ethereum ERCs reference text; focused excerpt." } },
];

// These final contiguous ranges were mechanically inspected at their immutable
// revisions after the first extraction pass. Keeping the editorial selection
// separate makes a range change conspicuous in review and in the build digest.
const REVIEWED_SELECTIONS = {
  H02: [667, 684],
  H03: [132, 149],
  H04: [720, 736],
  H05: [157, 174],
  H07: [83, 100],
  H08: [24, 39],
  H11: [71, 88],
  H12: [211, 221],
};
for (const highlight of HIGHLIGHTS) {
  const reviewed = REVIEWED_SELECTIONS[highlight.id];
  if (reviewed) [highlight.startLine, highlight.endLine] = reviewed;
}

const COMPARISON_PINS = [
  { systemId: "robinhood", label: "Robinhood", repoId: "nitro", slug: "OffchainLabs/nitro", commit: NITRO_COMMIT, role: "Robinhood-documented public node build; fixed baseline" },
  { systemId: "solana", label: "Solana", repoId: "cmp-agave", slug: "anza-xyz/agave", commit: "e9a73cd39f5da553a4693fd14914a8b5a34fec63", role: "official maintained validator client" },
  { systemId: "bitcoin", label: "Bitcoin", repoId: "cmp-bitcoin", slug: "bitcoin/bitcoin", commit: "dc0395c5858a1d55239b82a834e5075cf2069219", role: "Bitcoin Core" },
  { systemId: "ethereum", label: "Ethereum", repoId: "cmp-geth", slug: "ethereum/go-ethereum", commit: "64006a1e1c6281ad570d80129493d602fe081407", role: "Geth execution client" },
  { systemId: "bnb", label: "BNB Chain", repoId: "cmp-bsc", slug: "bnb-chain/bsc", commit: "c5533ab5b7244dc474add10740834417a2c605d7", role: "BSC execution/consensus client" },
  { systemId: "zcash", label: "Zcash", repoId: "cmp-zcash", slug: "zcash/zcash", commit: "558f686599586f55def3db86955d74d3be44605e", role: "zcashd reference client" },
];

const AXES = [
  { id: "ingress-ordering", label: "Ingress / ordering", question: "Where does a candidate transaction enter, wait, get ordered, rejected, replaced, or deferred?", measurementConsequence: "Separate signing, transport, admission, queue or mempool, construction, and observation." },
  { id: "fast-propagation", label: "Fast propagation", question: "Which fast path carries pending or soft information, and how are gaps, duplicates, and origins handled?", measurementConsequence: "Track source identity, continuity, receive, validation, insertion, and recovery." },
  { id: "execution-contention", label: "Execution / contention", question: "How is work scheduled against state, dependencies, ordering constraints, or conflicts?", measurementConsequence: "Measure queue dependency, retry, locks or state contention, and construction saturation." },
  { id: "fee-data-cost", label: "Fee / data cost", question: "Which bytes and resources influence admission and total execution or data cost?", measurementConsequence: "Record encoding, resource limits, realized units, and distinct fee components." },
  { id: "assurance-reorg", label: "Assurance / reorg", question: "Which local states can reverse, and how are they promoted toward confidence or finality?", measurementConsequence: "Persist named assurance stages and rollback or reconciliation events." },
];

const COMPARISON_PATHS = {
  robinhood: { "ingress-ordering": "execution/gethexec/sequencer.go", "fast-propagation": "broadcastclient/broadcastclient.go", "execution-contention": "execution/gethexec/tx_pre_checker.go", "fee-data-cost": "arbos/l1pricing/l1pricing.go", "assurance-reorg": "arbnode/transaction_streamer.go" },
  solana: { "ingress-ordering": "core/src/banking_stage.rs", "fast-propagation": "turbine/src/retransmit_stage.rs", "execution-contention": "core/src/banking_stage/transaction_scheduler/scheduler_controller.rs", "fee-data-cost": "compute-budget/src/compute_budget.rs", "assurance-reorg": "core/src/replay_stage.rs" },
  bitcoin: { "ingress-ordering": "src/txmempool.cpp", "fast-propagation": "src/net_processing.cpp", "execution-contention": "src/validation.cpp", "fee-data-cost": "src/policy/feerate.cpp", "assurance-reorg": "src/validation.cpp" },
  ethereum: { "ingress-ordering": "core/txpool/legacypool/legacypool.go", "fast-propagation": "eth/fetcher/tx_fetcher.go", "execution-contention": "core/state_processor.go", "fee-data-cost": "core/state_transition.go", "assurance-reorg": "core/blockchain.go" },
  bnb: { "ingress-ordering": "core/txpool/legacypool/legacypool.go", "fast-propagation": "eth/fetcher/tx_fetcher.go", "execution-contention": "consensus/parlia/parlia.go", "fee-data-cost": "core/state_transition.go", "assurance-reorg": "consensus/parlia/snapshot.go" },
  zcash: { "ingress-ordering": "src/txmempool.cpp", "fast-propagation": "src/main.cpp", "execution-contention": "src/main.cpp", "fee-data-cost": "src/miner.cpp", "assurance-reorg": "src/main.cpp" },
};

const MECHANISMS = {
  robinhood: ["A sequencer-facing queue performs admission, nonce handling, and ordered block construction.", "An ordered feed carries soft messages with sequence cursors and validation before insertion.", "The pinned client checks nonce and state constraints before serial EVM execution and construction.", "Execution gas and Brotli-compressed L1 data estimates are separate resource components.", "Feed-pending messages reconcile with posted batches and parent safe/finalized state."],
  solana: ["A leader pipeline verifies and schedules transactions through banking-stage queues rather than a public miner mempool.", "TPU, gossip, and retransmit paths propagate leader- and shred-oriented data with different identities and recovery behavior.", "The scheduler reasons about account access conflicts and work queues before execution.", "Compute budget, prioritization fees, and packet or transaction limits are distinct resources.", "Replay, fork choice, commitment, and rooted state name different confidence stages."],
  bitcoin: ["Bitcoin Core mempool admission applies policy, fee, dependency, and replacement rules before template selection.", "Peer inventory and compact-block relay are unordered peer protocols, not a sequencer feed.", "Validation and script-check queues process dependency-constrained transactions and blocks.", "Weight, feerate, and ancestor or descendant policy influence admission and mining selection.", "Chainstate activation can disconnect and connect blocks during a reorganization."],
  ethereum: ["Geth transaction pools apply validation, nonce ordering, pricing, and replacement policy before builder or producer selection.", "Peer transaction announcements and the fetcher recover unknown transaction bodies without a global sequence.", "The state processor applies ordered EVM transactions against shared state.", "Intrinsic gas, EIP-1559 fields, calldata, and blob accounting are distinct cost inputs.", "The blockchain manager tracks canonical, safe, and finalized heads and reorganizes canonical state."],
  bnb: ["The BSC client inherits and customizes a Geth-style transaction pool before validator production.", "Peer announcements and transaction fetching propagate pending transactions without a sequencer cursor.", "Parlia validator scheduling combines consensus turns with serial EVM state application.", "EVM gas accounting combines with current BSC client and validator policy.", "Parlia snapshots and blockchain reorganization paths maintain validator and canonical-chain state."],
  zcash: ["zcashd mempool admission applies consensus and policy checks before block selection.", "Peer inventory relay advertises transactions and blocks without one ordered global stream.", "Validation includes script and shielded-proof work with transaction dependencies.", "Transaction size, conventional fee rules, and shielded action structure influence policy and cost.", "Chain activation disconnects and reconnects blocks when the best chain changes."],
};

const MEASURES = [
  ["client_to_admission_ms", "admission_to_construction_ms", "rejection_or_replacement_reason"],
  ["origin_id", "receive_to_validate_ms", "gap_or_missing_object_recovery_ms"],
  ["queue_wait_ms", "retry_or_conflict_count", "construction_saturation"],
  ["encoded_bytes", "declared_resource_limit", "realized_fee_components"],
  ["local_assurance_state", "promotion_ms", "rollback_or_reorg_count"],
];

const UNAVAILABLE_SOURCES = [
  ["unavailable-sequencer", "Robinhood sequencer customization / production configuration", "https://docs.robinhood.com/chain/differences-from-ethereum/"],
  ["unavailable-stock-token-contracts", "Stock Token deployed contract source repository", "https://docs.robinhood.com/chain/contracts/"],
  ["unavailable-stock-token-api", "Stock Token API backend", "https://docs.robinhood.com/chain/stock-token-apis/"],
  ["unavailable-data-streams-publisher", "Data Streams oracle publisher and Robinhood verifier implementation", "https://docs.robinhood.com/chain/data-streams/"],
  ["unavailable-screening-rules", "Compliance and transaction-screening rules", "https://docs.robinhood.com/chain/terms-of-service/"],
].map(([id, label, evidenceUrl]) => ({ id, label, evidenceState: "not-public", statusLabel: "NOT PUBLIC AT RESEARCH CUTOFF", checkedAt: CUTOFF, evidenceUrl, caveat: "No qualifying public source was found; this is not evidence that the system or behavior does not exist." }));

const ARTIFACT_CONFIG = [
  { id: "robinhood-mainnet-chain-info", label: "Robinhood mainnet chain info", network: "mainnet", url: "https://cdn.robinhood.com/assets/generated_assets/hoodchain_docsite/chain-node-configs/robinhood-chain-info.json" },
  { id: "robinhood-mainnet-genesis", label: "Robinhood mainnet genesis", network: "mainnet", url: "https://cdn.robinhood.com/assets/generated_assets/hoodchain_docsite/chain-node-configs/robinhood-genesis.json" },
  { id: "robinhood-testnet-chain-info", label: "Robinhood testnet chain info", network: "testnet", url: "https://cdn.robinhood.com/assets/generated_assets/hoodchain_docsite/chain-node-configs/robinhood-chain-testnet-info.json" },
];

function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function serialize(value, space = 0) {
  return JSON.stringify(value, null, space).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
function registration(type, payload) {
  return `/* Generated by scripts/refresh-robinhood-source.mjs. Do not edit. */\nwindow.RH_SOURCE = window.RH_SOURCE || { pending: [] };\nwindow.RH_SOURCE.pending.push(${serialize({ type, payload })});\n`;
}
function byteCompare(a, b) { return Buffer.from(a).compare(Buffer.from(b)); }
function keyFor(repoId, sourcePath) { return sha256(`${repoId}\0${sourcePath}`).slice(0, 20); }
function safeName(value) { return value.replace(/[^a-zA-Z0-9_.-]+/g, "-").toLowerCase(); }
function assert(condition, message) { if (!condition) throw new Error(message); }

async function runGit(args, options = {}) {
  const result = await execFileAsync("git", args, { encoding: options.encoding ?? "utf8", maxBuffer: 256 * 1024 * 1024, ...options });
  return result.stdout;
}

async function ensureGitRepository(slug, commits) {
  await fsp.mkdir(CACHE_DIR, { recursive: true });
  const repoDir = path.join(CACHE_DIR, safeName(slug) + ".git");
  if (!fs.existsSync(repoDir)) {
    await runGit(["init", "--bare", repoDir]);
    await runGit(["-C", repoDir, "remote", "add", "origin", `https://github.com/${slug}.git`]);
    await runGit(["-C", repoDir, "config", "remote.origin.promisor", "true"]);
    await runGit(["-C", repoDir, "config", "remote.origin.partialclonefilter", "blob:none"]);
  }
  for (const commit of [...new Set(commits)]) {
    let present = true;
    try { await runGit(["-C", repoDir, "cat-file", "-e", `${commit}^{commit}`]); } catch { present = false; }
    if (!present) await runGit(["-C", repoDir, "fetch", "--no-tags", "--depth=1", "--filter=blob:none", "origin", commit]);
    const resolved = (await runGit(["-C", repoDir, "rev-parse", `${commit}^{commit}`])).trim();
    assert(resolved === commit, `${slug}: requested ${commit}, resolved ${resolved}`);
  }
  return repoDir;
}

function parseLsTree(buffer) {
  const records = buffer.toString("utf8").split("\0").filter(Boolean);
  return records.map((record) => {
    const tab = record.indexOf("\t");
    assert(tab > 0, `Malformed git ls-tree record: ${record.slice(0, 80)}`);
    const [mode, type, objectSha] = record.slice(0, tab).split(" ");
    const sourcePath = record.slice(tab + 1);
    return { mode, type: mode === "160000" ? "gitlink" : type, objectSha, path: sourcePath, size: null };
  });
}

async function gitTreeSnapshot(repo, repoDir) {
  const stdout = await runGit(["-C", repoDir, "ls-tree", "-r", "-t", "--full-tree", "-z", repo.commit], { encoding: "buffer" });
  const entries = parseLsTree(stdout);
  const rootTreeSha = (await runGit(["-C", repoDir, "rev-parse", `${repo.commit}^{tree}`])).trim();
  return { rootTreeSha, entries, truncated: false, transport: "github-api+git-ls-tree" };
}

async function githubJson(slug, route) {
  const stdout = await execFileAsync("gh", ["api", `repos/${slug}${route}`], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  return JSON.parse(stdout.stdout);
}

async function apiTreeSnapshot(repo) {
  const slug = `${repo.owner}/${repo.name}`;
  const recursive = await githubJson(slug, `/git/trees/${repo.commit}?recursive=1`);
  let tree = recursive.tree;
  let transport = "github-api-recursive";
  if (recursive.truncated) {
    transport = "github-api-breadth-first-fallback";
    const root = await githubJson(slug, `/git/trees/${repo.commit}`);
    const queue = [{ prefix: "", sha: root.sha, response: root }];
    tree = [];
    while (queue.length) {
      const current = queue.shift();
      const response = current.response || await githubJson(slug, `/git/trees/${current.sha}`);
      assert(!response.truncated, `${repo.id}: non-recursive tree unexpectedly truncated at ${current.prefix || "/"}`);
      for (const entry of response.tree) {
        const sourcePath = current.prefix ? `${current.prefix}/${entry.path}` : entry.path;
        tree.push({ ...entry, path: sourcePath });
        if (entry.type === "tree") queue.push({ prefix: sourcePath, sha: entry.sha });
      }
    }
  }
  return {
    rootTreeSha: recursive.sha,
    entries: tree.map((entry) => ({ mode: entry.mode, type: entry.mode === "160000" ? "gitlink" : entry.type, objectSha: entry.sha, path: entry.path, size: entry.size ?? null })),
    truncated: false,
    transport,
  };
}

function validateRawEntries(repo, rawEntries) {
  const seen = new Set();
  for (const entry of rawEntries) {
    assert(["tree", "blob", "gitlink"].includes(entry.type), `${repo.id}: unsupported tree type ${entry.type} at ${entry.path}`);
    assert(!entry.path.startsWith("/") && !entry.path.includes("\0"), `${repo.id}: unsafe path ${JSON.stringify(entry.path)}`);
    assert(!entry.path.split("/").includes(".."), `${repo.id}: parent traversal path ${entry.path}`);
    assert(!seen.has(entry.path), `${repo.id}: duplicate path ${entry.path}`);
    seen.add(entry.path);
  }
  for (const entry of rawEntries) {
    const parts = entry.path.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      const ancestor = parts.slice(0, index).join("/");
      assert(seen.has(ancestor), `${repo.id}: unreachable ${entry.path}; missing ${ancestor}`);
    }
  }
}

function normalizeSubmoduleUrl(repo, declaredUrl) {
  const cleaned = declaredUrl.trim().replace(/\.git$/, "");
  if (/^https:\/\//i.test(cleaned)) return cleaned.replace(/^https:\/\/github\.com\//i, "https://github.com/");
  if (/^http:\/\/github\.com\//i.test(cleaned)) return cleaned.replace(/^http:\/\/github\.com\//i, "https://github.com/");
  if (/^git:\/\/github\.com\//i.test(cleaned)) return cleaned.replace(/^git:\/\/github\.com\//i, "https://github.com/");
  if (/^git@github\.com:/i.test(cleaned)) return `https://github.com/${cleaned.replace(/^git@github\.com:/i, "")}`;
  if (/^ssh:\/\/git@github\.com\//i.test(cleaned)) return `https://github.com/${cleaned.replace(/^ssh:\/\/git@github\.com\//i, "")}`;
  if (cleaned.startsWith("../")) return new URL(cleaned, `${repo.canonicalUrl}/`).href.replace(/\/$/, "");
  throw new Error(`${repo.id}: unsupported submodule URL ${declaredUrl}`);
}

function parseGitmodules(repo, text) {
  const records = [];
  let current = null;
  for (const rawLine of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    const section = line.match(/^\[submodule\s+"([^"]+)"\]$/);
    if (section) {
      if (current) records.push(current);
      current = { name: section[1] };
      continue;
    }
    if (!current || !line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key === "path") current.path = value;
    if (key === "url") current.declaredUrl = value;
  }
  if (current) records.push(current);
  const output = new Map();
  for (const record of records) {
    assert(record.path && record.declaredUrl, `${repo.id}: incomplete .gitmodules entry ${record.name}`);
    output.set(record.path, { declaredUrl: record.declaredUrl, canonicalUrl: normalizeSubmoduleUrl(repo, record.declaredUrl) });
  }
  return output;
}

async function attachGitlinkMetadata(repo, repoDir, snapshot) {
  const gitlinks = snapshot.entries.filter((entry) => entry.type === "gitlink");
  if (!gitlinks.length) return snapshot;
  const gitmodulesEntry = snapshot.entries.find((entry) => entry.path === ".gitmodules" && entry.type === "blob");
  assert(gitmodulesEntry, `${repo.id}: ${gitlinks.length} gitlinks but no .gitmodules file`);
  const modules = parseGitmodules(repo, (await readBlob(repoDir, repo.commit, ".gitmodules")).toString("utf8"));
  const entries = snapshot.entries.map((entry) => {
    if (entry.type !== "gitlink") return entry;
    const metadata = modules.get(entry.path);
    assert(metadata, `${repo.id}: unresolved .gitmodules path ${entry.path}`);
    return { ...entry, gitlinkDeclaredUrl: metadata.declaredUrl, gitlinkUrl: metadata.canonicalUrl, gitlinkImmutableUrl: `${metadata.canonicalUrl}/tree/${entry.objectSha}` };
  });
  return { ...snapshot, entries };
}

function languageFor(sourcePath) {
  const name = path.posix.basename(sourcePath).toLowerCase();
  const ext = path.posix.extname(name);
  const map = { ".go": "go", ".rs": "rust", ".sol": "solidity", ".ts": "typescript", ".tsx": "tsx", ".js": "javascript", ".mjs": "javascript", ".cjs": "javascript", ".py": "python", ".cpp": "cpp", ".cc": "cpp", ".c": "c", ".h": "c", ".hpp": "cpp", ".java": "java", ".kt": "kotlin", ".swift": "swift", ".rb": "ruby", ".sh": "shell", ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".toml": "toml", ".md": "markdown", ".mdx": "markdown", ".html": "html", ".css": "css", ".scss": "scss", ".xml": "xml", ".proto": "protobuf", ".sql": "sql", ".move": "move" };
  if (map[ext]) return map[ext];
  if (["dockerfile", "makefile", "justfile"].includes(name)) return name;
  return null;
}

function categoryFor(sourcePath) {
  const lower = sourcePath.toLowerCase();
  const segments = lower.split("/");
  if (segments.some((value) => ["vendor", "vendors", "third_party", "third-party", "external", "node_modules"].includes(value))) return "vendor";
  if (segments.some((value) => ["generated", "dist", "coverage", "snapshots", "snapshot"].includes(value)) || /(?:^|\/).*\.gen\.[^/]+$/.test(lower)) return "generated";
  if (segments.some((value) => ["test", "tests", "testdata", "testing", "fixtures", "fixture", "mocks", "e2e"].includes(value)) || /(?:^|\/)[^/]*(?:_test\.|\.test\.|\.spec\.)/.test(lower)) return "test";
  if (segments.some((value) => ["docs", "doc", "documentation"].includes(value)) || /(?:^|\/)(?:readme|changelog|contributing|security)(?:\.[^/]*)?$/.test(lower) || /\.mdx?$/.test(lower)) return "docs";
  if (segments.some((value) => ["assets", "images", "image", "fonts"].includes(value)) || /\.(?:png|jpe?g|gif|webp|ico|svg|woff2?|ttf|eot|pdf)$/.test(lower)) return "asset";
  return "source";
}

function normalizedEntries(repo, rawEntries) {
  const childCounts = new Map();
  for (const raw of rawEntries) {
    const parent = raw.path.includes("/") ? raw.path.slice(0, raw.path.lastIndexOf("/")) : "";
    childCounts.set(parent, (childCounts.get(parent) || 0) + 1);
  }
  return rawEntries.map((raw) => {
    const parentPath = raw.path.includes("/") ? raw.path.slice(0, raw.path.lastIndexOf("/")) : "";
    const category = categoryFor(raw.path);
    const targetRepoId = repo.id === "nitro" && raw.type === "gitlink" ? NITRO_GITLINKS.get(raw.path) : undefined;
    const entry = {
      repoId: repo.id,
      path: raw.path,
      name: path.posix.basename(raw.path),
      parentKey: keyFor(repo.id, parentPath),
      key: keyFor(repo.id, raw.path),
      kind: raw.type,
      mode: raw.mode,
      objectSha: raw.objectSha,
      size: raw.size,
      language: raw.type === "blob" ? languageFor(raw.path) : null,
      category,
      hiddenByDefault: ["test", "generated", "vendor", "asset"].includes(category),
    };
    if (raw.type === "tree") entry.childCount = childCounts.get(raw.path) || 0;
    if (raw.type === "gitlink") {
      entry.gitlinkDeclaredUrl = raw.gitlinkDeclaredUrl;
      entry.gitlinkUrl = raw.gitlinkUrl;
      entry.gitlinkImmutableUrl = raw.gitlinkImmutableUrl;
    }
    if (targetRepoId) entry.targetRepoId = targetRepoId;
    return entry;
  });
}

function makeDirectoryShards(repo, entries) {
  const byParent = new Map([["", []]]);
  for (const entry of entries) {
    const parentPath = entry.path.includes("/") ? entry.path.slice(0, entry.path.lastIndexOf("/")) : "";
    if (!byParent.has(parentPath)) byParent.set(parentPath, []);
    byParent.get(parentPath).push(entry);
    if (entry.kind === "tree" && !byParent.has(entry.path)) byParent.set(entry.path, []);
  }
  const logicalDirectories = [...byParent.entries()].sort(([a], [b]) => byteCompare(a, b)).map(([directoryPath, children]) => {
    children.sort((a, b) => (a.kind === "tree" ? 0 : 1) - (b.kind === "tree" ? 0 : 1) || byteCompare(a.name, b.name));
    return { schemaVersion: SCHEMA_VERSION, repoId: repo.id, directoryPath, directoryKey: keyFor(repo.id, directoryPath), entries: children };
  });
  const directories = [];
  for (const logical of logicalDirectories) {
    const entryPages = [];
    let currentEntries = [];
    for (const entry of logical.entries) {
      const candidate = [...currentEntries, entry];
      const estimate = { ...logical, entries: candidate, pageIndex: 9999, pageCount: 9999 };
      if (currentEntries.length && Buffer.byteLength(registration("directory", [{ ...estimate, digest: sha256(serialize(estimate)) }])) > SHARD_TARGET_BYTES) {
        entryPages.push(currentEntries);
        currentEntries = [entry];
      } else currentEntries = candidate;
    }
    entryPages.push(currentEntries);
    entryPages.forEach((pageEntries, pageIndex) => {
      const base = { ...logical, entries: pageEntries, pageIndex, pageCount: entryPages.length };
      directories.push({ ...base, digest: sha256(serialize(base)) });
    });
  }
  const bundles = [];
  let current = [];
  for (const directory of directories) {
    const candidate = [...current, directory];
    if (current.length && Buffer.byteLength(registration("directory", candidate)) > SHARD_TARGET_BYTES) {
      bundles.push(current);
      current = [directory];
    } else current = candidate;
  }
  if (current.length) bundles.push(current);
  return { logicalDirectoryCount: logicalDirectories.length, directories, bundles };
}

function symbolHints(sourcePath) {
  const name = path.posix.basename(sourcePath, path.posix.extname(sourcePath));
  const pieces = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).filter((value) => value.length > 1);
  return [...new Set(pieces.map((value) => value.toLowerCase()))].slice(0, 8);
}

async function writeFile(target, contents) {
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.writeFile(target, contents);
}

async function materializeRepository(outputDir, repo, snapshot) {
  validateRawEntries(repo, snapshot.entries);
  const entries = normalizedEntries(repo, snapshot.entries);
  const { logicalDirectoryCount, directories, bundles } = makeDirectoryShards(repo, entries);
  const shardRecords = [];
  const directoryToShard = {};
  for (let index = 0; index < bundles.length; index += 1) {
    const id = `part-${String(index).padStart(4, "0")}`;
    const relative = `data/trees/${repo.id}/directories/${id}.js`;
    const contents = registration("directory", bundles[index]);
    const bytes = Buffer.byteLength(contents);
    assert(bytes <= SHARD_HARD_BYTES, `${repo.id}: ${id} is ${bytes} bytes, above ${SHARD_HARD_BYTES}`);
    await writeFile(path.join(outputDir, "trees", repo.id, "directories", `${id}.js`), contents);
    const directoryKeys = bundles[index].map((directory) => directory.directoryKey);
    for (const directoryKey of directoryKeys) {
      const current = directoryToShard[directoryKey];
      if (!current) directoryToShard[directoryKey] = id;
      else if (Array.isArray(current)) {
        if (!current.includes(id)) current.push(id);
      } else if (current !== id) directoryToShard[directoryKey] = [current, id];
    }
    shardRecords.push({ id, src: relative, sha256: sha256(contents), bytes, directoryKeys });
  }
  const counts = { entries: entries.length, trees: entries.filter((entry) => entry.kind === "tree").length, blobs: entries.filter((entry) => entry.kind === "blob").length, gitlinks: entries.filter((entry) => entry.kind === "gitlink").length };
  const treeDigest = sha256([...snapshot.entries].sort((a, b) => byteCompare(a.path, b.path)).map((entry) => `${entry.path}\0${entry.mode}\0${entry.type}\0${entry.objectSha}`).join("\n"));
  const manifest = { schemaVersion: SCHEMA_VERSION, repoId: repo.id, rootKey: keyFor(repo.id, ""), rootTreeSha: snapshot.rootTreeSha, counts, treeDigest, truncated: false, transport: snapshot.transport, directoryCount: logicalDirectoryCount, directoryPageCount: directories.length, shards: shardRecords, directoryToShard };
  await writeFile(path.join(outputDir, "trees", repo.id, "manifest.js"), registration("manifest", manifest));
  const search = { schemaVersion: SCHEMA_VERSION, repoId: repo.id, records: entries.map((entry) => ({ path: entry.path, key: entry.key, kind: entry.kind, language: entry.language, category: entry.category, hiddenByDefault: entry.hiddenByDefault, symbols: symbolHints(entry.path) })) };
  await writeFile(path.join(outputDir, "search", `${repo.id}.js`), registration("search", search));
  return { counts, treeDigest, rootTreeSha: snapshot.rootTreeSha, manifest, entries, transport: snapshot.transport };
}

async function readBlob(repoDir, commit, sourcePath) {
  assert(!sourcePath.startsWith("/") && !sourcePath.split("/").includes(".."), `Unsafe blob path ${sourcePath}`);
  return runGit(["-C", repoDir, "show", `${commit}:${sourcePath}`], { encoding: "buffer" });
}

async function buildHighlights(repoDirs) {
  const output = [];
  for (const config of HIGHLIGHTS) {
    const repo = REPOSITORIES.find((candidate) => candidate.id === config.repoId);
    assert(repo, `${config.id}: unknown repo ${config.repoId}`);
    const sourceCommit = config.sourceCommit || repo.commit;
    const slug = `${repo.owner}/${repo.name}`;
    const repoDir = repoDirs.get(slug) || await ensureGitRepository(slug, [sourceCommit]);
    const blob = await readBlob(repoDir, sourceCommit, config.path);
    const text = blob.toString("utf8").replace(/\r\n/g, "\n");
    const lines = text.split("\n");
    assert(config.startLine >= 1 && config.endLine <= lines.length && config.startLine <= config.endLine, `${config.id}: invalid ${config.path} L${config.startLine}-L${config.endLine}; file has ${lines.length} lines`);
    const selected = lines.slice(config.startLine - 1, config.endLine);
    const excerptText = selected.join("\n");
    const permalink = `https://github.com/${slug}/blob/${sourceCommit}/${config.path}#L${config.startLine}-L${config.endLine}`;
    output.push({
      id: config.id, chapterId: config.chapterId, title: config.title, repoId: config.repoId, commit: sourceCommit, relationship: config.relationship,
      path: config.path, language: config.language, selection: { startLine: config.startLine, endLine: config.endLine, sourceSha256: sha256(excerptText), blobSha256: sha256(blob) }, permalink,
      excerptLines: selected.map((line, index) => ({ number: config.startLine + index, text: line })),
      evidenceState: config.relationship === "PINNED NODE BUILD" ? "version-pinned" : config.relationship === "DEPLOYED INTEGRATION" ? "confirmed" : "integration-reference",
      evidence: [{ label: "Primary evidence", url: config.evidenceUrl, checkedAt: CUTOFF }, { label: "Immutable source", url: permalink, checkedAt: CUTOFF }],
      mechanism: config.mechanism, quantInsight: config.quantInsight, measurements: config.measurements, failureModes: config.failureModes, caveats: config.caveats, license: config.license,
    });
  }
  return output;
}

function buildComparisonCells() {
  const cells = [];
  for (const system of COMPARISON_PINS) {
    AXES.forEach((axis, axisIndex) => {
      const sourcePath = COMPARISON_PATHS[system.systemId][axis.id];
      cells.push({
        systemId: system.systemId, axisId: axis.id, analogy: system.systemId === "robinhood" ? "direct" : "partial",
        mechanism: MECHANISMS[system.systemId][axisIndex], repositoryId: system.repoId, commit: system.commit,
        paths: [{ path: sourcePath, permalink: `https://github.com/${system.slug}/blob/${system.commit}/${sourcePath}` }],
        measure: MEASURES[axisIndex],
        caveat: system.systemId === "robinhood" ? "Pinned public-node source does not disclose private sequencer configuration." : `This describes ${system.label}'s named client at the pinned revision, not every client or provider deployment.`,
        checkedAt: CUTOFF,
      });
    });
  }
  return cells;
}

async function validateComparisonPaths(repoDirs, cells) {
  for (const pin of COMPARISON_PINS) {
    const repoDir = repoDirs.get(pin.slug) || await ensureGitRepository(pin.slug, [pin.commit]);
    repoDirs.set(pin.slug, repoDir);
    const treeBuffer = await runGit(["-C", repoDir, "ls-tree", "-r", "--full-tree", "-z", pin.commit], { encoding: "buffer" });
    const available = new Set(parseLsTree(treeBuffer).map((entry) => entry.path));
    for (const cell of cells.filter((candidate) => candidate.systemId === pin.systemId)) {
      for (const selected of cell.paths) assert(available.has(selected.path), `${pin.systemId}/${cell.axisId}: comparison path missing at ${pin.commit}: ${selected.path}`);
    }
  }
}

function parsedArtifactFacts(id, parsed) {
  if (id.endsWith("chain-info") && Array.isArray(parsed) && parsed[0]) {
    const record = parsed[0];
    const facts = [
      ["chainId", record["chain-id"], "/0/chain-id"], ["parentChainId", record["parent-chain-id"], "/0/parent-chain-id"], ["chainName", record["chain-name"], "/0/chain-name"],
      ["arbOsEnabled", record["chain-config"]?.arbitrum?.EnableArbOS, "/0/chain-config/arbitrum/EnableArbOS"], ["dataAvailabilityCommittee", record["chain-config"]?.arbitrum?.DataAvailabilityCommittee, "/0/chain-config/arbitrum/DataAvailabilityCommittee"],
      ["rollup", record.rollup?.rollup, "/0/rollup/rollup"], ["inbox", record.rollup?.inbox, "/0/rollup/inbox"], ["sequencerInbox", record.rollup?.["sequencer-inbox"], "/0/rollup/sequencer-inbox"],
    ];
    return facts.filter(([, value]) => value !== undefined).map(([key, value, sourcePointer]) => ({ key, value: String(value), sourcePointer }));
  }
  if (id.endsWith("genesis") && parsed && typeof parsed === "object") return [{ key: "allocationCount", value: String(Object.keys(parsed.alloc || {}).length), sourcePointer: "/alloc" }];
  return [];
}

async function buildArtifacts() {
  const artifacts = [];
  for (const config of ARTIFACT_CONFIG) {
    const response = await fetch(config.url, { headers: { "User-Agent": "multichain-gang-source-generator" } });
    assert(response.ok, `${config.id}: artifact fetch ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    let parsed;
    try { parsed = JSON.parse(bytes.toString("utf8")); } catch (error) { throw new Error(`${config.id}: invalid JSON: ${error.message}`); }
    artifacts.push({ id: config.id, label: config.label, authority: "robinhood", evidenceState: "confirmed", url: config.url, network: config.network, mime: (response.headers.get("content-type") || "application/json").split(";")[0], bytes: bytes.length, sha256: sha256(bytes), checkedAt: CUTOFF, parsedFacts: parsedArtifactFacts(config.id, parsed) });
  }
  return artifacts;
}

async function listFiles(directory, prefix = "") {
  const output = [];
  for (const name of (await fsp.readdir(directory)).sort(byteCompare)) {
    const absolute = path.join(directory, name);
    const relative = prefix ? `${prefix}/${name}` : name;
    const stat = await fsp.stat(absolute);
    if (stat.isDirectory()) output.push(...await listFiles(absolute, relative));
    else output.push(relative);
  }
  return output;
}

async function fileDigestMap(directory, exclusions = new Set()) {
  const map = {};
  for (const relative of await listFiles(directory)) if (!exclusions.has(relative)) map[relative] = sha256(await fsp.readFile(path.join(directory, relative)));
  return map;
}

function releaseDigest(digests) {
  return sha256(Object.entries(digests).sort(([a], [b]) => byteCompare(a, b)).map(([relative, digest]) => `${relative}\0${digest}`).join("\n"));
}

async function generate(outputDir, options) {
  await fsp.rm(outputDir, { recursive: true, force: true });
  await fsp.mkdir(outputDir, { recursive: true });
  const repoDirs = new Map();
  const slugCommits = new Map();
  for (const repo of REPOSITORIES) {
    const slug = `${repo.owner}/${repo.name}`;
    if (!slugCommits.has(slug)) slugCommits.set(slug, []);
    slugCommits.get(slug).push(repo.commit);
  }
  for (const highlight of HIGHLIGHTS.filter((item) => item.sourceCommit)) {
    const repo = REPOSITORIES.find((candidate) => candidate.id === highlight.repoId);
    slugCommits.get(`${repo.owner}/${repo.name}`).push(highlight.sourceCommit);
  }
  for (const pin of COMPARISON_PINS) {
    if (!slugCommits.has(pin.slug)) slugCommits.set(pin.slug, []);
    slugCommits.get(pin.slug).push(pin.commit);
  }
  for (const [slug, commits] of slugCommits) {
    process.stdout.write(`Resolving ${slug} (${new Set(commits).size} commit${new Set(commits).size === 1 ? "" : "s"})...\n`);
    repoDirs.set(slug, await ensureGitRepository(slug, commits));
  }

  const generatedRepos = [];
  for (const repo of REPOSITORIES) {
    const slug = `${repo.owner}/${repo.name}`;
    let snapshot;
    if (options.transport === "api") {
      snapshot = await apiTreeSnapshot(repo);
      const gitSnapshot = await gitTreeSnapshot(repo, repoDirs.get(slug));
      const apiSet = new Set(snapshot.entries.map((entry) => `${entry.path}\0${entry.mode}\0${entry.type}\0${entry.objectSha}`));
      const gitSet = new Set(gitSnapshot.entries.map((entry) => `${entry.path}\0${entry.mode}\0${entry.type}\0${entry.objectSha}`));
      assert(apiSet.size === gitSet.size && [...apiSet].every((entry) => gitSet.has(entry)), `${repo.id}: GitHub API tree disagrees with git ls-tree census`);
    } else snapshot = await gitTreeSnapshot(repo, repoDirs.get(slug));
    assert(!snapshot.truncated, `${repo.id}: partial tree cannot be published`);
    snapshot = await attachGitlinkMetadata(repo, repoDirs.get(slug), snapshot);
    process.stdout.write(`Generating ${repo.id}: ${snapshot.entries.length.toLocaleString()} entries...\n`);
    const built = await materializeRepository(outputDir, repo, snapshot);
    generatedRepos.push({ repo, built });
  }

  const nitroBuilt = generatedRepos.find(({ repo }) => repo.id === "nitro").built;
  const nitroGitlinks = nitroBuilt.entries.filter((entry) => entry.kind === "gitlink");
  assert(nitroGitlinks.length === 14, `nitro: expected 14 gitlinks, found ${nitroGitlinks.length}`);
  for (const [gitlinkPath, targetRepoId] of NITRO_GITLINKS) {
    const entry = nitroGitlinks.find((candidate) => candidate.path === gitlinkPath);
    const target = REPOSITORIES.find((candidate) => candidate.id === targetRepoId);
    assert(entry, `nitro: missing reviewed gitlink ${gitlinkPath}`);
    assert(target && entry.objectSha === target.commit, `nitro: gitlink ${gitlinkPath} is ${entry.objectSha}, expected ${target?.commit}`);
  }
  for (const { repo, built } of generatedRepos) if (repo.license.path) assert(built.entries.some((entry) => entry.path === repo.license.path), `${repo.id}: license path missing at pinned revision: ${repo.license.path}`);

  const highlights = await buildHighlights(repoDirs);
  const cells = buildComparisonCells();
  await validateComparisonPaths(repoDirs, cells);
  const artifacts = await buildArtifacts();
  const totals = generatedRepos.reduce((sum, { built }) => ({ repositories: sum.repositories + 1, entries: sum.entries + built.counts.entries, trees: sum.trees + built.counts.trees, blobs: sum.blobs + built.counts.blobs, gitlinks: sum.gitlinks + built.counts.gitlinks, directoryShards: sum.directoryShards + built.manifest.shards.length, searchRecords: sum.searchRecords + built.counts.entries }), { repositories: 0, entries: 0, trees: 0, blobs: 0, gitlinks: 0, directoryShards: 0, searchRecords: 0 });
  const catalogRepos = generatedRepos.map(({ repo, built }) => ({
    id: repo.id, owner: repo.owner, name: repo.name, groupId: repo.groupId, canonicalUrl: repo.canonicalUrl, ...(repo.declaredUrl ? { declaredUrl: repo.declaredUrl } : {}),
    revision: { commit: repo.commit, ...(repo.tag ? { tag: repo.tag } : {}) }, rootTreeSha: built.rootTreeSha, evidenceTier: repo.evidenceTier, evidenceState: repo.evidenceState,
    inclusionBasis: repo.inclusionBasis, deploymentEquivalence: repo.deploymentEquivalence, license: repo.license, status: repo.status, counts: built.counts,
    sourceCheckedAt: repo.sourceCheckedAt, treeDigest: built.treeDigest, defaultHiddenGroups: repo.defaultHiddenGroups,
    manifestSrc: `data/trees/${repo.id}/manifest.js`, searchSrc: `data/search/${repo.id}.js`, immutableUrl: `${repo.canonicalUrl}/tree/${repo.commit}`,
  }));
  const catalog = {
    schemaVersion: SCHEMA_VERSION, cutoff: CUTOFF, generatorVersion: GENERATOR_VERSION,
    contract: "COMPLETE FOR THE PINNED REPOSITORY SET · NOT A CLAIM OF PRIVATE DEPLOYED CODE",
    researchSummary: "No public Robinhood-authored node, sequencer, ArbOS fork, Stock Token contract repository, oracle publisher, or API backend was found at the cutoff. The runtime tree is the exact public Nitro node build pin plus its direct gitlinks.",
    repositoryGroups: GROUPS, repositories: catalogRepos, unavailableSources: UNAVAILABLE_SOURCES,
    relatedUpstream: [
      { id: "related-arbitrum-chain-sdk", url: "https://github.com/OffchainLabs/arbitrum-chain-sdk", evidenceState: "upstream-reference", reason: "Generic upstream without a Robinhood-specific version pin." },
      { id: "related-chainlink", url: "https://github.com/smartcontractkit/chainlink", evidenceState: "upstream-reference", reason: "Generic upstream without a Robinhood-specific deployment pin." },
      { id: "community-chainstack-feed", url: "https://github.com/chainstacklabs/robinhood-chain-sequencer-feed", evidenceState: "volatile", reason: "Unaffiliated and not named in current Robinhood docs; ledger-only." },
    ],
    totals: { ...totals, resolvedGitlinks: totals.gitlinks, unresolvedGitlinks: 0, truncatedTrees: 0, featuredHighlights: 8, secondaryHighlights: 5, systems: 6, axes: 5, comparisonCells: cells.length, artifacts: artifacts.length },
    paths: { highlights: "data/highlights.js", comparisons: "data/comparisons.js", artifacts: "data/artifacts.js", build: "data/build.js" },
  };
  const comparisons = { schemaVersion: SCHEMA_VERSION, systems: COMPARISON_PINS.map((pin) => ({ ...pin, canonicalUrl: `https://github.com/${pin.slug}`, immutableUrl: `https://github.com/${pin.slug}/tree/${pin.commit}`, evidenceState: pin.systemId === "robinhood" ? "version-pinned" : "comparison-only", checkedAt: CUTOFF })), axes: AXES, cells };
  await writeFile(path.join(outputDir, "catalog.js"), registration("catalog", catalog));
  await writeFile(path.join(outputDir, "highlights.js"), registration("highlights", highlights));
  await writeFile(path.join(outputDir, "comparisons.js"), registration("comparisons", comparisons));
  await writeFile(path.join(outputDir, "artifacts.js"), registration("artifacts", artifacts));

  const digests = await fileDigestMap(outputDir, new Set(["BUILD-MANIFEST.json", "build.js"]));
  const digest = releaseDigest(digests);
  const buildManifest = {
    schemaVersion: SCHEMA_VERSION, generatorVersion: GENERATOR_VERSION, cutoff: CUTOFF, releaseDigest: digest, generatedDeterministicallyAtCutoff: CUTOFF,
    sourceCommits: Object.fromEntries(catalogRepos.map((repo) => [repo.id, repo.revision.commit])), comparisonCommits: Object.fromEntries(COMPARISON_PINS.map((pin) => [pin.systemId, pin.commit])), totals: catalog.totals,
    treeTransports: Object.fromEntries(generatedRepos.map(({ repo, built }) => [repo.id, built.transport])),
    repositoryCensuses: Object.fromEntries(catalogRepos.map((repo) => [repo.id, { ...repo.counts, rootTreeSha: repo.rootTreeSha, treeDigest: repo.treeDigest }])), fileDigests: digests,
    hotspotSelections: Object.fromEntries(highlights.map((item) => [item.id, { repoId: item.repoId, commit: item.commit, path: item.path, startLine: item.selection.startLine, endLine: item.selection.endLine, sourceSha256: item.selection.sourceSha256, blobSha256: item.selection.blobSha256 }])),
    artifactDigests: Object.fromEntries(artifacts.map((artifact) => [artifact.id, artifact.sha256])), comparisonPathsValidated: cells.length,
  };
  await writeFile(path.join(outputDir, "BUILD-MANIFEST.json"), `${serialize(buildManifest, 2)}\n`);
  await writeFile(path.join(outputDir, "build.js"), registration("build", { schemaVersion: SCHEMA_VERSION, generatorVersion: GENERATOR_VERSION, cutoff: CUTOFF, releaseDigest: digest, totals: catalog.totals }));
  return buildManifest;
}

async function compareDirectories(expected, actual) {
  const expectedFiles = await listFiles(expected);
  const actualFiles = fs.existsSync(actual) ? await listFiles(actual) : [];
  const missing = expectedFiles.filter((file) => !actualFiles.includes(file));
  const extra = actualFiles.filter((file) => !expectedFiles.includes(file));
  const changed = [];
  for (const relative of expectedFiles.filter((file) => actualFiles.includes(file))) {
    const [a, b] = await Promise.all([fsp.readFile(path.join(expected, relative)), fsp.readFile(path.join(actual, relative))]);
    if (!a.equals(b)) changed.push(relative);
  }
  return { missing, extra, changed };
}

function parseArgs(argv) {
  const args = { check: false, fixtures: false, transport: "api" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--check") args.check = true;
    else if (value === "--fixtures") args.fixtures = true;
    else if (value === "--transport") args.transport = argv[++index];
    else if (value === "--ledger") args.ledger = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  assert(["api", "git"].includes(args.transport), `Unknown transport ${args.transport}`);
  if (args.ledger) assert(fs.existsSync(path.resolve(ROOT, args.ledger)), `Ledger not found: ${args.ledger}`);
  return args;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.fixtures) {
    console.log("Fixture generation uses validator self-tests; full source data is never replaced by a partial fixture tree.");
    return;
  }
  const temporary = await fsp.mkdtemp(path.join(os.tmpdir(), "rh-source-generate-"));
  const output = path.join(temporary, "data");
  try {
    const manifest = await generate(output, options);
    if (options.check) {
      const delta = await compareDirectories(output, DATA_DIR);
      assert(!delta.missing.length && !delta.extra.length && !delta.changed.length, `Generated data drift:\nmissing: ${delta.missing.join(", ") || "none"}\nextra: ${delta.extra.join(", ") || "none"}\nchanged: ${delta.changed.join(", ") || "none"}`);
      console.log(`Robinhood source data is deterministic and current (${manifest.releaseDigest}).`);
    } else {
      await fsp.mkdir(path.dirname(DATA_DIR), { recursive: true });
      await fsp.rm(DATA_DIR, { recursive: true, force: true });
      await fsp.rename(output, DATA_DIR);
      console.log(`Generated ${manifest.totals.repositories} complete repositories, ${manifest.totals.entries} entries, ${manifest.totals.gitlinks} gitlinks, ${manifest.totals.directoryShards} directory shards.`);
      console.log(`Release digest: ${manifest.releaseDigest}`);
    }
  } finally {
    await fsp.rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`Robinhood source refresh failed: ${error.stack || error.message}`); process.exitCode = 1; });
}

export { AXES, COMPARISON_PINS, HIGHLIGHTS, NITRO_COMMIT, REPOSITORIES, SCHEMA_VERSION, buildComparisonCells, categoryFor, keyFor, languageFor, parseLsTree, releaseDigest, sha256 };
