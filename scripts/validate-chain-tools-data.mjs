import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { checkGenerated, chainFiles, readSourceData, root } from "./build-chain-tools-catalog.mjs";

const expectedCategories = [
  ["CT-01", "Launch and issuance"],
  ["CT-02", "Spot DEX and liquidity"],
  ["CT-03", "Aggregation, routing, and intents"],
  ["CT-04", "Derivatives and prediction"],
  ["CT-05", "Lending, borrowing, and stablecoins"],
  ["CT-06", "Yield, vaults, and strategy"],
  ["CT-07", "Staking, restaking, and validation"],
  ["CT-08", "Pricing, oracles, and market data"],
  ["CT-09", "Analytics, indexing, and exploration"],
  ["CT-10", "Charting, portfolio, and discovery"],
  ["CT-11", "Wallets, accounts, and custody"],
  ["CT-12", "Bridges and interoperability"],
  ["CT-13", "MEV, order flow, and execution"],
  ["CT-14", "Security, risk, and compliance"],
  ["CT-15", "SocialFi, identity, and consumer"],
  ["CT-16", "Developer infrastructure"],
  ["CT-17", "Collectibles and marketplaces"],
];

const expectedChains = {
  solana: { chainId: "sol", count: 61 },
  ethereum: { chainId: "eth", count: 67 },
  "bnb-chain": { chainId: "bnb", count: 55 },
  bitcoin: { chainId: "btc", count: 49 },
  zcash: { chainId: "zec", count: 31 },
  "robinhood-chain": { chainId: "robinhood_chain", count: 37 },
};

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const prohibitedRuntimePatterns = [
  /ethereum\.request/i,
  /signTransaction/i,
  /sendTransaction/i,
  /wallet[_-]?connect/i,
  /secret\s*key/i,
  /private\s*key/i,
];

function fail(message) {
  throw new Error(message);
}

function requireString(value, field) {
  if (typeof value !== "string" || !value.trim()) fail(`${field} must be a non-empty string`);
}

function requireEnum(value, allowed, field) {
  if (!allowed.includes(value)) fail(`${field} has unsupported value ${JSON.stringify(value)}`);
}

function safeHttps(value, field) {
  requireString(value, field);
  let parsed;
  try { parsed = new URL(value); } catch { fail(`${field} is not a valid URL: ${value}`); }
  if (parsed.protocol !== "https:") fail(`${field} must use https: ${value}`);
  if (!parsed.hostname || parsed.username || parsed.password) fail(`${field} is not a safe public URL: ${value}`);
}

function dateValue(value, field) {
  if (!isoDatePattern.test(value)) fail(`${field} must be an ISO calendar date`);
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) fail(`${field} is not a real calendar date`);
  return parsed;
}

function sameSet(left, right) {
  return left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

const source = readSourceData();
const { taxonomy, canonical, chains } = source;

assert.equal(taxonomy.schemaVersion, 1, "taxonomy schemaVersion");
dateValue(taxonomy.verified, "taxonomy.verified");
assert.deepEqual(taxonomy.categories.map(({ id, name }) => [id, name]), expectedCategories, "17 exact category IDs and labels");
assert.deepEqual(chainFiles, Object.keys(expectedChains), "canonical chain order");

const categoryIds = new Set(taxonomy.categories.map((category) => category.id));
const coverageLevels = taxonomy.enums.coverage;
const statusValues = taxonomy.enums.status;
const scopeValues = taxonomy.enums.scope;
const accessValues = taxonomy.enums.access;
const surfaceValues = taxonomy.enums.surface;
const custodyValues = taxonomy.enums.custody;
const gradeValues = taxonomy.enums.evidenceGrade;
const riskValues = new Set(Object.keys(taxonomy.riskFlags));

for (const category of taxonomy.categories) {
  requireString(category.shortName, `${category.id}.shortName`);
  requireString(category.include, `${category.id}.include`);
  requireString(category.exclude, `${category.id}.exclude`);
}

assert.equal(canonical.schemaVersion, 1, "canonical schemaVersion");
assert.equal(canonical.verified, taxonomy.verified, "canonical verification date matches taxonomy");
assert.equal(canonical.tools.length, 260, "exact canonical tool count");

const tools = new Map();
const normalizedIdentity = new Map();
for (const tool of canonical.tools) {
  requireString(tool.id, "tool.id");
  if (!idPattern.test(tool.id)) fail(`tool.id is not stable kebab-case: ${tool.id}`);
  if (tools.has(tool.id)) fail(`duplicate canonical tool ID: ${tool.id}`);
  requireString(tool.name, `${tool.id}.name`);
  requireString(tool.summary, `${tool.id}.summary`);
  if ([...tool.summary].length > 160) fail(`${tool.id}.summary exceeds 160 characters`);
  if (!Array.isArray(tool.categories) || !tool.categories.length) fail(`${tool.id}.categories must be non-empty`);
  if (new Set(tool.categories).size !== tool.categories.length) fail(`${tool.id}.categories contains duplicates`);
  tool.categories.forEach((id) => { if (!categoryIds.has(id)) fail(`${tool.id} references unknown category ${id}`); });
  if (!Array.isArray(tool.aliases) || tool.aliases.some((alias) => typeof alias !== "string" || !alias.trim())) fail(`${tool.id}.aliases is invalid`);
  safeHttps(tool.officialUrl, `${tool.id}.officialUrl`);
  if (tool.docsUrl) safeHttps(tool.docsUrl, `${tool.id}.docsUrl`);
  const identity = `${tool.name.toLowerCase()}\n${tool.officialUrl.toLowerCase()}`;
  if (normalizedIdentity.has(identity)) fail(`duplicate canonical identity: ${tool.id} and ${normalizedIdentity.get(identity)}`);
  normalizedIdentity.set(identity, tool.id);
  tools.set(tool.id, tool);
}

const placementIds = new Set();
const categoryUnion = new Map([...tools].map(([id]) => [id, new Set()]));
const usedTools = new Set();
let placementCount = 0;

for (const slug of chainFiles) {
  const chain = chains[slug];
  const expected = expectedChains[slug];
  assert.equal(chain.schemaVersion, 1, `${slug} schemaVersion`);
  assert.equal(chain.slug, slug, `${slug} slug`);
  assert.equal(chain.chainId, expected.chainId, `${slug} chainId`);
  assert.equal(chain.route, `#/tools/${slug}`, `${slug} route`);
  assert.equal(chain.hubRoute, `#/c/${slug}`, `${slug} hubRoute`);
  assert.equal(chain.verified, taxonomy.verified, `${slug} verified date`);
  requireString(chain.name, `${slug}.name`);
  requireString(chain.shorthand, `${slug}.shorthand`);
  requireString(chain.scopeStatement, `${slug}.scopeStatement`);
  requireString(chain.thesis, `${slug}.thesis`);
  requireString(chain.visual.src, `${slug}.visual.src`);
  requireString(chain.visual.alt, `${slug}.visual.alt`);
  requireString(chain.visual.caption, `${slug}.visual.caption`);
  if (!chain.visual.src.startsWith("assets/chain-tools/") || path.isAbsolute(chain.visual.src) || chain.visual.src.includes("..")) fail(`${slug}.visual.src is unsafe`);

  assert.equal(chain.coverage.length, 17, `${slug} has all 17 coverage rows`);
  assert.deepEqual(chain.coverage.map((entry) => entry.categoryId), expectedCategories.map(([id]) => id), `${slug} coverage uses canonical order`);
  for (const coverage of chain.coverage) {
    requireEnum(coverage.level, coverageLevels, `${slug}.${coverage.categoryId}.coverage.level`);
    requireString(coverage.label, `${slug}.${coverage.categoryId}.coverage.label`);
    requireString(coverage.note, `${slug}.${coverage.categoryId}.coverage.note`);
  }

  assert.equal(chain.placements.length, expected.count, `${slug} exact placement count`);
  const localTools = new Set();
  for (const placement of chain.placements) {
    placementCount += 1;
    if (placement.id !== `${chain.chainId}:${placement.toolId}`) fail(`${slug} placement ID is not chainId:toolId: ${placement.id}`);
    if (placementIds.has(placement.id)) fail(`duplicate placement ID: ${placement.id}`);
    placementIds.add(placement.id);
    if (localTools.has(placement.toolId)) fail(`${slug} contains duplicate canonical tool ${placement.toolId}`);
    localTools.add(placement.toolId);
    const tool = tools.get(placement.toolId);
    if (!tool) fail(`${placement.id} references missing canonical tool`);
    requireString(placement.displayName, `${placement.id}.displayName`);
    usedTools.add(placement.toolId);
    if (placement.chainId !== chain.chainId) fail(`${placement.id}.chainId does not match file`);
    if (!Array.isArray(placement.categories) || !placement.categories.length) fail(`${placement.id}.categories must be non-empty`);
    if (new Set(placement.categories).size !== placement.categories.length) fail(`${placement.id}.categories contains duplicates`);
    placement.categories.forEach((id) => {
      if (!categoryIds.has(id)) fail(`${placement.id} references unknown category ${id}`);
      categoryUnion.get(placement.toolId).add(id);
    });
    if (placement.primaryCategory !== placement.categories[0]) fail(`${placement.id}.primaryCategory must be the first category`);
    requireEnum(placement.scope, scopeValues, `${placement.id}.scope`);
    requireString(placement.scopeLabel, `${placement.id}.scopeLabel`);
    requireEnum(placement.status, statusValues, `${placement.id}.status`);
    requireString(placement.statusLabel, `${placement.id}.statusLabel`);
    requireEnum(placement.access, accessValues, `${placement.id}.access`);
    requireEnum(placement.custody, custodyValues, `${placement.id}.custody`);
    if (!Array.isArray(placement.surfaces) || !placement.surfaces.length) fail(`${placement.id}.surfaces must be non-empty`);
    if (new Set(placement.surfaces).size !== placement.surfaces.length) fail(`${placement.id}.surfaces contains duplicates`);
    placement.surfaces.forEach((surface) => requireEnum(surface, surfaceValues, `${placement.id}.surface`));
    if (!Array.isArray(placement.surfaceLabels) || !placement.surfaceLabels.length) fail(`${placement.id}.surfaceLabels must preserve source language`);
    if (!Array.isArray(placement.evidence) || !placement.evidence.length) fail(`${placement.id} requires evidence`);
    const snapshot = dateValue(chain.verified, `${slug}.verified`);
    for (const [index, evidence] of placement.evidence.entries()) {
      requireEnum(evidence.grade, gradeValues, `${placement.id}.evidence[${index}].grade`);
      safeHttps(evidence.url, `${placement.id}.evidence[${index}].url`);
      const checked = dateValue(evidence.checked, `${placement.id}.evidence[${index}].checked`);
      if (checked > snapshot) fail(`${placement.id} evidence is dated after the snapshot`);
      const ageDays = Math.round((snapshot - checked) / 86_400_000);
      const maximumAge = taxonomy.evidencePolicy.maximumAgeDays[placement.status];
      if (ageDays > maximumAge) fail(`${placement.id} evidence is stale (${ageDays}d > ${maximumAge}d)`);
      requireString(evidence.note, `${placement.id}.evidence[${index}].note`);
    }
    if (!Array.isArray(placement.riskFlags)) fail(`${placement.id}.riskFlags must be an array`);
    placement.riskFlags.forEach((risk) => { if (!riskValues.has(risk)) fail(`${placement.id} uses unknown risk flag ${risk}`); });
    assert.deepEqual(placement.chainRole.categoryIds, placement.categories, `${placement.id} chain-role categories`);
    assert.equal(placement.chainRole.primaryCategory, placement.primaryCategory, `${placement.id} chain-role primary category`);
    requireString(placement.chainRole.relationship, `${placement.id}.chainRole.relationship`);
    requireString(placement.chainRole.reason, `${placement.id}.chainRole.reason`);
    assert.equal(placement.overlap.categoryCount, placement.categories.length, `${placement.id} overlap count`);
    assert.deepEqual(placement.overlap.additionalCategoryIds, placement.categories.slice(1), `${placement.id} overlap categories`);
    if (!placement.chainFields || typeof placement.chainFields !== "object") fail(`${placement.id}.chainFields is required`);
    requireString(placement.chainFields.relationshipLabel, `${placement.id}.chainFields.relationshipLabel`);
    requireString(placement.chainFields.trustModel, `${placement.id}.chainFields.trustModel`);
    if (chain.chainId === "robinhood_chain") {
      assert.deepEqual(placement.chainFields.finalityClocks, ["soft", "l1-posted", "l1-final"], `${placement.id} finality clocks`);
    }
    requireString(placement.chainNote, `${placement.id}.chainNote`);
  }

  if (!Array.isArray(chain.gaps) || !chain.gaps.length || chain.gaps.some((note) => typeof note !== "string" || !note.trim())) fail(`${slug}.gaps must be a non-empty editorial list`);
  if (!Array.isArray(chain.sources) || !chain.sources.length) fail(`${slug}.sources must be non-empty`);
  chain.sources.forEach((sourceEntry, index) => {
    requireString(sourceEntry.label, `${slug}.sources[${index}].label`);
    safeHttps(sourceEntry.url, `${slug}.sources[${index}].url`);
  });
}

assert.equal(placementCount, 300, "exact total placement count");
assert.equal(usedTools.size, tools.size, "every canonical tool has at least one placement");
for (const [toolId, tool] of tools) {
  const union = [...categoryUnion.get(toolId)];
  if (!sameSet(tool.categories, union)) fail(`${toolId}.categories does not equal its placement category union`);
}

const stale = checkGenerated(source);
if (stale.length) fail(`generated outputs are stale: ${stale.join(", ")}; run node scripts/build-chain-tools-catalog.mjs`);

for (const relativePath of [
  "data/chain-tools/taxonomy.json",
  "data/chain-tools/canonical-tools.json",
  ...chainFiles.map((slug) => `data/chain-tools/${slug}.json`),
  "data/chain-tools/catalog.js",
]) {
  const text = fs.readFileSync(path.join(root, relativePath), "utf8");
  for (const pattern of prohibitedRuntimePatterns) {
    if (pattern.test(text)) fail(`${relativePath} contains prohibited wallet/signing/submission pattern ${pattern}`);
  }
}

console.log(`Chain Tools data valid: ${tools.size} canonical tools, ${placementCount} placements, ${categoryIds.size} categories, ${chainFiles.length} chains.`);
