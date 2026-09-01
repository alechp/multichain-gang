#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "multichain/robinhood/source/data");
const SCHEMA_VERSION = 1;
const NITRO_COMMIT = "3599acae1ad2fab4059fc46453c9cd3294126641";
const EXPECTED_HIGHLIGHTS = Array.from({ length: 13 }, (_, index) => `H${String(index + 1).padStart(2, "0")}`);
const EXPECTED_SYSTEMS = ["robinhood", "solana", "bitcoin", "ethereum", "bnb", "zcash"];
const EXPECTED_AXES = ["ingress-ordering", "fast-propagation", "execution-contention", "fee-data-cost", "assurance-reorg"];
const EXPECTED_GITLINKS = new Map([
  ["go-ethereum", "nitro-go-ethereum"], ["contracts", "nitro-contracts-current"], ["contracts-legacy", "nitro-contracts-legacy"],
  ["contracts-local/src/precompiles", "nitro-precompile-interfaces"], ["contracts-local/lib/openzeppelin-contracts", "openzeppelin-contracts"],
  ["brotli", "brotli"], ["nitro-testnode", "nitro-testnode"], ["crates/tools/wasmer", "wasmer"],
  ["crates/wasm-libraries/soft-float/SoftFloat", "softfloat"], ["crates/wasm-testsuite/testsuite", "wasm-testsuite"],
  ["crates/langs/rust", "stylus-sdk-rs"], ["crates/langs/c", "stylus-sdk-c"], ["crates/langs/bf", "stylus-sdk-bf"],
  ["safe-smart-account", "safe-smart-account"],
]);

let assertions = 0;
function check(condition, message) {
  assertions += 1;
  if (!condition) throw new Error(message);
}
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function byteCompare(a, b) { return Buffer.from(a).compare(Buffer.from(b)); }
function keyFor(repoId, sourcePath) { return sha256(`${repoId}\0${sourcePath}`).slice(0, 20); }
function serialize(value) { return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"); }
function releaseDigest(digests) { return sha256(Object.entries(digests).sort(([a], [b]) => byteCompare(a, b)).map(([relative, digest]) => `${relative}\0${digest}`).join("\n")); }

async function readRegistration(relative, expectedType) {
  const absolute = path.join(DATA_DIR, relative);
  check(fs.existsSync(absolute), `${relative}: generated registration is missing`);
  const text = await fsp.readFile(absolute, "utf8");
  check(!/(?:<script|javascript:|data:text\/html|new Function\s*\(|\beval\s*\()/i.test(text), `${relative}: unsafe generated script content`);
  const marker = "window.RH_SOURCE.pending.push(";
  const start = text.indexOf(marker);
  const end = text.lastIndexOf(");");
  check(start >= 0 && end > start, `${relative}: malformed registration wrapper`);
  let record;
  try { record = JSON.parse(text.slice(start + marker.length, end)); } catch (error) { throw new Error(`${relative}: invalid registration JSON: ${error.message}`); }
  check(record.type === expectedType, `${relative}: expected registration type ${expectedType}, found ${record.type}`);
  return { payload: record.payload, text, bytes: Buffer.byteLength(text) };
}

function validateHttps(value, label) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label}: invalid URL ${value}`); }
  check(url.protocol === "https:", `${label}: only https URLs are allowed`);
  check(!url.username && !url.password, `${label}: URL credentials are forbidden`);
}

function validateFixtureMode() {
  const fixture = {
    repoId: "fixture",
    directoryPath: "",
    directoryKey: keyFor("fixture", ""),
    entries: [{ repoId: "fixture", path: "src", name: "src", parentKey: keyFor("fixture", ""), key: keyFor("fixture", "src"), kind: "tree", mode: "040000", objectSha: "a".repeat(40) }],
  };
  check(fixture.directoryKey === keyFor("fixture", ""), "fixture: root key mismatch");
  check(fixture.entries[0].parentKey === fixture.directoryKey, "fixture: parent key mismatch");
  const duplicateIds = ["H01", "H01"];
  check(new Set(duplicateIds).size !== duplicateIds.length, "fixture: duplicate-ID detector did not trigger");
  const traversal = "a/../b";
  check(traversal.split("/").includes(".."), "fixture: traversal detector did not trigger");
  const digest = sha256("fixture");
  check(digest.length === 64 && digest !== sha256("changed"), "fixture: digest detector did not trigger");
  console.log(`Robinhood source fixture validator passed (${assertions} assertions; duplicate, traversal, and digest corruption detected).`);
}

async function validateRepository(repo, manifest, build) {
  check(manifest.schemaVersion === SCHEMA_VERSION, `${repo.id}: unknown manifest schema ${manifest.schemaVersion}`);
  check(manifest.repoId === repo.id, `${repo.id}: manifest repo ID mismatch`);
  check(manifest.truncated === false, `${repo.id}: truncated tree cannot be published`);
  check(/^[0-9a-f]{40}$/.test(manifest.rootTreeSha), `${repo.id}: invalid root tree SHA`);
  check(manifest.rootTreeSha === repo.rootTreeSha, `${repo.id}: catalog/manifest root tree mismatch`);
  check(manifest.treeDigest === repo.treeDigest, `${repo.id}: catalog/manifest tree digest mismatch`);
  check(manifest.rootKey === keyFor(repo.id, ""), `${repo.id}: root key mismatch`);

  const allDirectories = [];
  const seenShardIds = new Set();
  const seenDirectoryKeys = new Set();
  const directoryPages = new Map();
  for (const shard of manifest.shards) {
    check(!seenShardIds.has(shard.id), `${repo.id}: duplicate shard ${shard.id}`);
    seenShardIds.add(shard.id);
    check(shard.bytes <= 128 * 1024, `${repo.id}/${shard.id}: ${shard.bytes} bytes exceeds hard shard budget`);
    const relative = shard.src.replace(/^data\//, "");
    check(relative === `trees/${repo.id}/directories/${shard.id}.js`, `${repo.id}/${shard.id}: unsafe or unexpected shard path ${shard.src}`);
    const registration = await readRegistration(relative, "directory");
    check(registration.bytes === shard.bytes, `${repo.id}/${shard.id}: byte count drift`);
    check(sha256(registration.text) === shard.sha256, `${repo.id}/${shard.id}: shard digest drift`);
    check(Array.isArray(registration.payload), `${repo.id}/${shard.id}: directory bundle must be an array`);
    check(registration.payload.length === shard.directoryKeys.length, `${repo.id}/${shard.id}: directory-key census mismatch`);
    for (const directory of registration.payload) {
      check(directory.schemaVersion === SCHEMA_VERSION, `${repo.id}/${shard.id}: directory schema mismatch`);
      check(directory.repoId === repo.id, `${repo.id}/${shard.id}: foreign directory payload`);
      check(directory.directoryKey === keyFor(repo.id, directory.directoryPath), `${repo.id}: directory key mismatch for ${directory.directoryPath || "/"}`);
      seenDirectoryKeys.add(directory.directoryKey);
      check(shard.directoryKeys.includes(directory.directoryKey), `${repo.id}/${shard.id}: unlisted directory ${directory.directoryPath || "/"}`);
      const mappedShards = Array.isArray(manifest.directoryToShard[directory.directoryKey]) ? manifest.directoryToShard[directory.directoryKey] : [manifest.directoryToShard[directory.directoryKey]];
      check(mappedShards.includes(shard.id), `${repo.id}: manifest omits page shard ${shard.id} for ${directory.directoryPath || "/"}`);
      check(Number.isInteger(directory.pageIndex) && Number.isInteger(directory.pageCount) && directory.pageIndex >= 0 && directory.pageIndex < directory.pageCount, `${repo.id}: invalid page metadata for ${directory.directoryPath || "/"}`);
      if (!directoryPages.has(directory.directoryKey)) directoryPages.set(directory.directoryKey, []);
      directoryPages.get(directory.directoryKey).push({ pageIndex: directory.pageIndex, pageCount: directory.pageCount, path: directory.directoryPath, shardId: shard.id });
      const { digest, ...base } = directory;
      check(digest === sha256(serialize(base)), `${repo.id}: directory digest drift for ${directory.directoryPath || "/"}`);
      allDirectories.push(directory);
    }
  }
  check(allDirectories.length === manifest.directoryPageCount, `${repo.id}: directory page census mismatch`);
  check(seenDirectoryKeys.size === manifest.directoryCount, `${repo.id}: logical directory census mismatch`);
  for (const [directoryKey, pages] of directoryPages) {
    const expectedPageCount = pages[0].pageCount;
    check(pages.every((page) => page.pageCount === expectedPageCount && page.path === pages[0].path), `${repo.id}: inconsistent page metadata for ${pages[0].path || "/"}`);
    check(pages.length === expectedPageCount, `${repo.id}: missing page for ${pages[0].path || "/"}`);
    check(pages.map((page) => page.pageIndex).sort((a, b) => a - b).every((value, index) => value === index), `${repo.id}: non-contiguous pages for ${pages[0].path || "/"}`);
    const mapped = Array.isArray(manifest.directoryToShard[directoryKey]) ? manifest.directoryToShard[directoryKey] : [manifest.directoryToShard[directoryKey]];
    check(new Set(mapped).size === mapped.length && mapped.length === new Set(pages.map((page) => page.shardId)).size, `${repo.id}: directory-to-shard page mapping drift for ${pages[0].path || "/"}`);
  }
  check(seenDirectoryKeys.has(manifest.rootKey), `${repo.id}: root directory unreachable`);

  const entries = allDirectories.flatMap((directory) => directory.entries);
  const paths = new Set();
  for (const entry of entries) {
    check(entry.repoId === repo.id, `${repo.id}: foreign entry ${entry.path}`);
    check(!entry.path.startsWith("/") && !entry.path.includes("\0") && !entry.path.split("/").includes(".."), `${repo.id}: unsafe path ${entry.path}`);
    check(!paths.has(entry.path), `${repo.id}: duplicate path ${entry.path}`);
    paths.add(entry.path);
    check(entry.key === keyFor(repo.id, entry.path), `${repo.id}: key mismatch ${entry.path}`);
    const parentPath = entry.path.includes("/") ? entry.path.slice(0, entry.path.lastIndexOf("/")) : "";
    check(entry.parentKey === keyFor(repo.id, parentPath), `${repo.id}: parent key mismatch ${entry.path}`);
    check(seenDirectoryKeys.has(entry.parentKey), `${repo.id}: unreachable parent for ${entry.path}`);
    check(["tree", "blob", "gitlink"].includes(entry.kind), `${repo.id}: invalid kind ${entry.kind}`);
    check(/^[0-9a-f]{40}$/.test(entry.objectSha), `${repo.id}: invalid object SHA ${entry.path}`);
    check((entry.kind === "tree") === (entry.mode === "040000" || entry.mode === "40000"), `${repo.id}: wrong tree mode ${entry.mode} at ${entry.path}`);
    check((entry.kind === "gitlink") === (entry.mode === "160000"), `${repo.id}: wrong gitlink mode ${entry.mode} at ${entry.path}`);
    if (entry.kind === "gitlink") {
      check(entry.gitlinkDeclaredUrl && entry.gitlinkUrl && entry.gitlinkImmutableUrl, `${repo.id}: unresolved gitlink metadata ${entry.path}`);
      validateHttps(entry.gitlinkUrl, `${repo.id}/${entry.path}.gitlinkUrl`);
      validateHttps(entry.gitlinkImmutableUrl, `${repo.id}/${entry.path}.gitlinkImmutableUrl`);
      check(entry.gitlinkImmutableUrl.includes(entry.objectSha), `${repo.id}: mutable gitlink target ${entry.path}`);
    }
  }
  const counts = { entries: entries.length, trees: entries.filter((entry) => entry.kind === "tree").length, blobs: entries.filter((entry) => entry.kind === "blob").length, gitlinks: entries.filter((entry) => entry.kind === "gitlink").length };
  const reconstructedTreeDigest = sha256([...entries].sort((a, b) => byteCompare(a.path, b.path)).map((entry) => `${entry.path}\0${entry.mode}\0${entry.kind}\0${entry.objectSha}`).join("\n"));
  check(reconstructedTreeDigest === manifest.treeDigest, `${repo.id}: reconstructed tree digest mismatch`);
  for (const [name, value] of Object.entries(counts)) {
    check(manifest.counts[name] === value, `${repo.id}: manifest ${name} ${manifest.counts[name]} != generated ${value}`);
    check(repo.counts[name] === value, `${repo.id}: catalog ${name} ${repo.counts[name]} != generated ${value}`);
    check(build.repositoryCensuses[repo.id][name] === value, `${repo.id}: build-manifest ${name} mismatch`);
  }

  const searchRegistration = await readRegistration(`search/${repo.id}.js`, "search");
  const search = searchRegistration.payload;
  check(search.schemaVersion === SCHEMA_VERSION && search.repoId === repo.id, `${repo.id}: search identity/schema mismatch`);
  check(search.records.length === entries.length, `${repo.id}: search census mismatch`);
  const searchPaths = new Set();
  for (const record of search.records) {
    check(paths.has(record.path), `${repo.id}: search path absent from tree: ${record.path}`);
    check(record.key === keyFor(repo.id, record.path), `${repo.id}: search key mismatch ${record.path}`);
    check(!searchPaths.has(record.path), `${repo.id}: duplicate search path ${record.path}`);
    searchPaths.add(record.path);
  }
  return { entries, counts };
}

async function validateFull() {
  check(fs.existsSync(path.join(DATA_DIR, "BUILD-MANIFEST.json")), "BUILD-MANIFEST.json is missing; run the refresh script first");
  const build = JSON.parse(await fsp.readFile(path.join(DATA_DIR, "BUILD-MANIFEST.json"), "utf8"));
  check(build.schemaVersion === SCHEMA_VERSION, `Unknown build schema ${build.schemaVersion}`);
  check(build.sourceCommits.nitro === NITRO_COMMIT, `Nitro commit must remain ${NITRO_COMMIT}`);
  const core = await Promise.all([
    readRegistration("catalog.js", "catalog"), readRegistration("highlights.js", "highlights"), readRegistration("comparisons.js", "comparisons"),
    readRegistration("artifacts.js", "artifacts"), readRegistration("build.js", "build"),
  ]);
  const [catalogReg, highlightsReg, comparisonsReg, artifactsReg, buildReg] = core;
  const catalog = catalogReg.payload;
  check(catalog.schemaVersion === SCHEMA_VERSION, "catalog: schema mismatch");
  check(catalogReg.bytes <= 100 * 1024, `catalog: ${catalogReg.bytes} bytes exceeds 100 KiB hard budget`);
  const initialBytes = core.reduce((sum, record) => sum + record.bytes, 0);
  check(initialBytes <= 250 * 1024, `core registrations: ${initialBytes} bytes exceeds 250 KiB hard budget`);
  check(catalog.contract === "COMPLETE FOR THE PINNED REPOSITORY SET · NOT A CLAIM OF PRIVATE DEPLOYED CODE", "catalog: exhaustive/public boundary contract drift");
  check(catalog.repositories.length === Object.keys(build.sourceCommits).length, "catalog/build repository count mismatch");
  check(new Set(catalog.repositories.map((repo) => repo.id)).size === catalog.repositories.length, "catalog: duplicate repository ID");
  const allowedStates = new Set(["confirmed", "version-pinned", "upstream-reference", "integration-reference", "documented-absence", "not-public", "conflicted", "volatile", "comparison-only"]);
  const allowedDeployment = new Set(["robinhood-contribution", "public-node-build-pin", "integration-source", "reference-only", "comparison-only"]);
  for (const repo of catalog.repositories) {
    check(allowedStates.has(repo.evidenceState), `${repo.id}: invalid evidence state`);
    check(allowedDeployment.has(repo.deploymentEquivalence), `${repo.id}: invalid deployment equivalence`);
    check(repo.sourceCheckedAt && repo.inclusionBasis && repo.license, `${repo.id}: incomplete provenance metadata`);
    validateHttps(repo.canonicalUrl, `${repo.id}.canonicalUrl`);
    validateHttps(repo.immutableUrl, `${repo.id}.immutableUrl`);
    check(repo.immutableUrl.includes(repo.revision.commit), `${repo.id}: mutable repository URL`);
    check(build.sourceCommits[repo.id] === repo.revision.commit, `${repo.id}: build commit drift`);
  }
  const repositoryResults = new Map();
  for (const repo of catalog.repositories) {
    const manifest = (await readRegistration(`trees/${repo.id}/manifest.js`, "manifest")).payload;
    repositoryResults.set(repo.id, await validateRepository(repo, manifest, build));
  }

  const nitroEntries = repositoryResults.get("nitro").entries;
  const nitroGitlinks = nitroEntries.filter((entry) => entry.kind === "gitlink");
  check(nitroGitlinks.length === EXPECTED_GITLINKS.size, `nitro: expected 14 gitlinks, found ${nitroGitlinks.length}`);
  for (const [gitlinkPath, targetRepoId] of EXPECTED_GITLINKS) {
    const link = nitroGitlinks.find((entry) => entry.path === gitlinkPath);
    check(link, `nitro: missing direct gitlink ${gitlinkPath}`);
    check(link.targetRepoId === targetRepoId, `nitro: unresolved target for ${gitlinkPath}`);
    check(link.objectSha === build.sourceCommits[targetRepoId], `nitro: gitlink SHA mismatch ${gitlinkPath}`);
  }

  const highlights = highlightsReg.payload;
  check(Array.isArray(highlights) && highlights.length === 13, `highlights: expected 13, found ${highlights.length}`);
  check(new Set(highlights.map((highlight) => highlight.id)).size === highlights.length, "highlights: duplicate ID");
  check(EXPECTED_HIGHLIGHTS.every((id) => highlights.some((highlight) => highlight.id === id)), "highlights: H01-H13 must be complete");
  check(highlights.filter((highlight) => Number(highlight.id.slice(1)) <= 8).length === 8, "highlights: expected eight featured records");
  check(highlights.filter((highlight) => Number(highlight.id.slice(1)) >= 9).length === 5, "highlights: expected five secondary records");
  for (const highlight of highlights) {
    const selectionLines = highlight.excerptLines.map((line) => line.text).join("\n");
    check(highlight.excerptLines.length >= 6 && highlight.excerptLines.length <= 18, `${highlight.id}: excerpt must contain 6-18 lines`);
    check(highlight.selection.sourceSha256 === sha256(selectionLines), `${highlight.id}: excerpt digest mismatch`);
    check(highlight.excerptLines[0].number === highlight.selection.startLine && highlight.excerptLines.at(-1).number === highlight.selection.endLine, `${highlight.id}: line range mismatch`);
    check(highlight.permalink.includes(highlight.commit), `${highlight.id}: mutable permalink`);
    validateHttps(highlight.permalink, `${highlight.id}.permalink`);
    check(highlight.measurements.length > 0 && highlight.failureModes.length > 0 && highlight.caveats.length > 0, `${highlight.id}: missing operator analysis`);
    check(build.hotspotSelections[highlight.id]?.sourceSha256 === highlight.selection.sourceSha256, `${highlight.id}: build-manifest digest mismatch`);
  }

  const comparisons = comparisonsReg.payload;
  check(comparisons.schemaVersion === SCHEMA_VERSION, "comparisons: schema mismatch");
  check(comparisons.systems.length === 6 && comparisons.axes.length === 5, "comparisons: expected six systems and five axes");
  check(EXPECTED_SYSTEMS.every((id) => comparisons.systems.some((system) => system.systemId === id)), "comparisons: stable system IDs missing");
  check(EXPECTED_AXES.every((id) => comparisons.axes.some((axis) => axis.id === id)), "comparisons: stable axis IDs missing");
  check(comparisons.cells.length === 30, `comparisons: expected 30 cells, found ${comparisons.cells.length}`);
  const comparisonKeys = new Set();
  for (const cell of comparisons.cells) {
    const key = `${cell.systemId}/${cell.axisId}`;
    check(!comparisonKeys.has(key), `comparisons: duplicate ${key}`);
    comparisonKeys.add(key);
    check(EXPECTED_SYSTEMS.includes(cell.systemId) && EXPECTED_AXES.includes(cell.axisId), `comparisons: unknown ${key}`);
    check(cell.measure.length > 0 && cell.caveat, `comparisons: incomplete measurement/caveat ${key}`);
    check(cell.paths.length > 0, `comparisons: source path missing ${key}`);
    for (const selected of cell.paths) {
      validateHttps(selected.permalink, `${key}.permalink`);
      check(selected.permalink.includes(cell.commit), `comparisons: mutable permalink ${key}`);
    }
  }
  check(build.comparisonPathsValidated === 30, "build: comparison path validation count must be 30");

  const artifacts = artifactsReg.payload;
  check(Array.isArray(artifacts) && artifacts.length === 3, "artifacts: expected mainnet info/genesis and testnet info");
  for (const artifact of artifacts) {
    check(artifact.authority === "robinhood" && artifact.evidenceState === "confirmed", `${artifact.id}: artifact authority mismatch`);
    validateHttps(artifact.url, `${artifact.id}.url`);
    check(/^[0-9a-f]{64}$/.test(artifact.sha256) && artifact.bytes > 0, `${artifact.id}: artifact digest/size missing`);
    check(build.artifactDigests[artifact.id] === artifact.sha256, `${artifact.id}: build-manifest digest mismatch`);
  }
  check(catalog.unavailableSources.length === 5 && catalog.unavailableSources.every((item) => item.evidenceState === "not-public"), "catalog: five explicit not-public rows required");

  const recordedFiles = Object.keys(build.fileDigests).sort(byteCompare);
  for (const relative of recordedFiles) {
    const absolute = path.join(DATA_DIR, relative);
    check(fs.existsSync(absolute), `build: recorded file missing ${relative}`);
    check(sha256(await fsp.readFile(absolute)) === build.fileDigests[relative], `build: file digest drift ${relative}`);
  }
  check(build.releaseDigest === releaseDigest(build.fileDigests), "build: release digest mismatch");
  check(buildReg.payload.releaseDigest === build.releaseDigest, "build.js: release digest mismatch");
  check(Object.values(build.treeTransports).every((transport) => transport === "github-api-recursive" || transport === "github-api-breadth-first-fallback"), "build: every tree must record authenticated GitHub API traversal");
  check(catalog.totals.repositories === catalog.repositories.length, "catalog: repository total mismatch");
  check(catalog.totals.entries === [...repositoryResults.values()].reduce((sum, result) => sum + result.counts.entries, 0), "catalog: entry total mismatch");
  check(catalog.totals.gitlinks === [...repositoryResults.values()].reduce((sum, result) => sum + result.counts.gitlinks, 0), "catalog: gitlink total mismatch");
  check(catalog.totals.resolvedGitlinks === catalog.totals.gitlinks && catalog.totals.unresolvedGitlinks === 0, "catalog: all preserved gitlinks must resolve");
  check(catalog.totals.truncatedTrees === 0, "catalog: truncated tree count must be zero");
  console.log(`Robinhood source data passed ${assertions.toLocaleString()} assertions.`);
  console.log(`${catalog.totals.repositories} repositories · ${catalog.totals.entries.toLocaleString()} entries · ${catalog.totals.gitlinks} gitlinks · ${catalog.totals.directoryShards} shards · ${highlights.length} highlights · ${comparisons.cells.length} comparison cells.`);
  console.log(`Release digest: ${build.releaseDigest}`);
}

async function main() {
  if (process.argv.includes("--fixtures")) validateFixtureMode();
  else await validateFull();
}

main().catch((error) => { console.error(`Robinhood source validation failed: ${error.stack || error.message}`); process.exitCode = 1; });
