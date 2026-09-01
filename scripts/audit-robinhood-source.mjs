#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync
} from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(process.cwd());
const SOURCE_ROOT = join(ROOT, 'multichain/robinhood/source');
const DATA_ROOT = join(SOURCE_ROOT, 'data');
const PAGE_PATH = join(SOURCE_ROOT, 'index.html');
const EXPECTED = Object.freeze({
  featured: Object.freeze(['H01', 'H02', 'H03', 'H04', 'H05', 'H06', 'H07', 'H08']),
  secondary: Object.freeze(['H09', 'H10', 'H11', 'H12', 'H13']),
  systems: Object.freeze(['robinhood', 'solana', 'bitcoin', 'ethereum', 'bnb', 'zcash']),
  axes: Object.freeze(['ingress-ordering', 'fast-propagation', 'execution-contention', 'fee-data-cost', 'assurance-reorg']),
  unavailable: Object.freeze([
    'Robinhood sequencer customization / production configuration',
    'Stock Token deployed contract source repository',
    'Stock Token API backend',
    'Data Streams oracle publisher and Robinhood verifier implementation',
    'Compliance and transaction-screening rules'
  ])
});
const NITRO_COMMIT = '3599acae1ad2fab4059fc46453c9cd3294126641';
const ACCESS_KEY = 'scope.access.v1';
const ACCESS_DIGEST = '29e5686dacf7ef28c84317644bf7c395f9b11873f6732d0d0a20985f2c09f002';

function parseArgs(argv) {
  const options = { browser: true, selfTest: false, fixtures: false, baseSha: process.env.RH_SOURCE_BASE_SHA || '', url: process.env.RH_SOURCE_URL || '' };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--self-test') options.selfTest = true;
    else if (arg === '--fixtures') options.fixtures = true;
    else if (arg === '--static' || arg === '--skip-browser') options.browser = false;
    else if (arg === '--base-sha') options.baseSha = argv[++index] || '';
    else if (arg.startsWith('--base-sha=')) options.baseSha = arg.slice(11);
    else if (arg === '--url') options.url = argv[++index] || '';
    else if (arg.startsWith('--url=')) options.url = arg.slice(6);
    else if (arg === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

class Audit {
  constructor(label = 'audit') {
    this.label = label;
    this.failures = [];
    this.warnings = [];
    this.checks = 0;
    this.metrics = new Map();
  }
  check(condition, message) {
    this.checks += 1;
    if (!condition) this.failures.push(message);
    return Boolean(condition);
  }
  fail(message) { this.checks += 1; this.failures.push(message); }
  warn(message) { this.warnings.push(message); }
  metric(key, value) { this.metrics.set(key, value); }
}

const read = path => readFileSync(path, 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const uniq = values => [...new Set(values)];
const sorted = values => [...values].sort((a, b) => a.localeCompare(b));
const sameMembers = (actual, expected) => JSON.stringify(sorted(uniq(actual))) === JSON.stringify(sorted(expected));
const relativePath = path => relative(ROOT, path).split(sep).join('/');

function walkFiles(root, predicate = () => true) {
  if (!existsSync(root)) return [];
  const files = [];
  const visit = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && predicate(path)) files.push(path);
    }
  };
  visit(root);
  return files.sort();
}

function allObjects(value, seen = new Set()) {
  const output = [];
  const visit = item => {
    if (!item || typeof item !== 'object' || seen.has(item)) return;
    seen.add(item);
    output.push(item);
    if (Array.isArray(item)) item.forEach(visit);
    else Object.values(item).forEach(visit);
  };
  visit(value);
  return output;
}

function safeRepositoryPath(value) {
  if (typeof value !== 'string' || !value || value.includes('\0') || value.includes('\\')) return false;
  if (value.startsWith('/') || /^[A-Za-z]:/.test(value)) return false;
  try {
    const decoded = decodeURIComponent(value);
    return !decoded.split('/').includes('..') && !decoded.includes('\0');
  } catch {
    return false;
  }
}

function safeReviewedUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function scanRuntimeSource(source, label, audit) {
  const rules = [
    [/\.innerHTML\s*=/, 'innerHTML assignment'],
    [/\.outerHTML\s*=/, 'outerHTML assignment'],
    [/\.insertAdjacentHTML\s*\(/, 'insertAdjacentHTML'],
    [/\bdocument\.write(?:ln)?\s*\(/, 'document.write'],
    [/(?:^|[^\w.])eval\s*\(/m, 'eval'],
    [/\bnew\s+Function\s*\(/, 'Function constructor'],
    [/\bfetch\s*\(/, 'runtime fetch'],
    [/\bXMLHttpRequest\b/, 'XMLHttpRequest'],
    [/\bWebSocket\s*\(/, 'WebSocket'],
    [/\bEventSource\s*\(/, 'EventSource'],
    [/\bnavigator\.credentials\b/, 'Credential Management API'],
    [/\b(?:window\.)?ethereum\b/, 'wallet provider'],
    [/\b(?:eth_sendRawTransaction|eth_sendTransaction|personal_sign|wallet_requestPermissions|signTransaction|signTypedData|privateKeyToAccount)\b/i, 'signing/submission API'],
    [/\b(?:sendBundle|sendTransaction)\s*\(/, 'transaction/bundle submission'],
    [/\bjavascript\s*:/i, 'javascript URL'],
    [/\bdata\s*:\s*text\/html/i, 'HTML data URL']
  ];
  for (const [pattern, name] of rules) audit.check(!pattern.test(source), `${label}: prohibited ${name}`);
}

function scanHtmlSource(source, audit) {
  audit.check(/<html\b[^>]*\blang=["']en["']/i.test(source), 'page: html lang must be en');
  audit.check((source.match(/<h1\b/gi) || []).length === 1, 'page: exactly one h1 required');
  for (const landmark of ['header', 'nav', 'main', 'section', 'aside', 'footer']) {
    audit.check(new RegExp(`<${landmark}\\b`, 'i').test(source), `page: semantic <${landmark}> landmark missing`);
  }
  audit.check(/<a\b[^>]*href=["']#[^"']+["'][^>]*>[^<]*(?:skip|Skip)/.test(source), 'page: skip-to-main link missing');
  audit.check(/<body\b[^>]*data-auth-scope=["']ROBINHOOD \/ SOURCE["']/i.test(source), 'page: data-auth-scope must be ROBINHOOD / SOURCE');
  audit.check(/<body\b[^>]*data-chain=["']robinhood["']/i.test(source), 'page: data-chain must be robinhood');
  for (const asset of ['../../auth.css', '../../auth.js', '../../site.css', '../styles/select-ui.css']) {
    audit.check(source.includes(asset), `page: required relative asset missing: ${asset}`);
  }
  audit.check(/<noscript>[\s\S]*JavaScript is required to verify the access code/i.test(source), 'page: no-JavaScript fail-closed warning missing');
  audit.check(source.includes('COMPLETE FOR THE PINNED REPOSITORY SET') && source.includes('NOT A CLAIM OF PRIVATE DEPLOYED CODE'), 'page: public/private source boundary stamp missing');
  audit.check(source.includes(NITRO_COMMIT), `page: pinned Nitro commit ${NITRO_COMMIT} missing`);
  audit.check(source.includes('2026-09-01'), 'page: research cutoff 2026-09-01 missing');
  for (const label of EXPECTED.unavailable) audit.check(source.includes(label), `page: unavailable-source boundary missing: ${label}`);
  audit.check(/<table\b[\s\S]*<caption\b/i.test(source), 'page: semantic comparison table/caption missing');
  audit.check(/<th\b[^>]*(?:scope=["'](?:col|row)["']|id=["'][^"']+["'])/i.test(source), 'page: table header scope/id missing');
  audit.check(!/<script\b[^>]*src=["']https?:/i.test(source), 'page: remote script is prohibited');
  audit.check(!/<script\b[^>]*src=["'](?:[^"']*\/)?data\//i.test(source), 'page: source data must not load before authentication via static script tags');
  audit.check(!/\son[a-z]+\s*=/i.test(source), 'page: inline event handler is prohibited');
  audit.check(!/(?:href|src)=["'](?:javascript:|data:text\/html)/i.test(source), 'page: unsafe navigation URL found');

  const externalAnchors = [...source.matchAll(/<a\b([^>]*\bhref=["']https:[^"']+["'][^>]*)>/gi)];
  for (const match of externalAnchors) {
    audit.check(/\brel=["'][^"']*noopener[^"']*noreferrer[^"']*["']/i.test(match[1]) || /\brel=["'][^"']*noreferrer[^"']*noopener[^"']*["']/i.test(match[1]), 'page: external HTTPS link lacks rel="noopener noreferrer"');
  }
}

function registrationFiles(dataRoot) {
  if (!existsSync(dataRoot)) return [];
  const preferred = ['catalog.js', 'highlights.js', 'comparisons.js', 'artifacts.js']
    .map(name => join(dataRoot, name))
    .filter(existsSync);
  const manifests = walkFiles(join(dataRoot, 'trees'), path => basename(path) === 'manifest.js');
  return uniq(preferred.concat(manifests));
}

function evaluateRegistrations(files, audit) {
  const registrations = [];
  for (const path of files) {
    const label = relativePath(path);
    const source = read(path);
    scanRuntimeSource(source, label, audit);
    const sandbox = {};
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    try {
      const context = vm.createContext(sandbox, { name: label, codeGeneration: { strings: false, wasm: false } });
      new vm.Script(source, { filename: label, timeout: 2_000 }).runInContext(context, { timeout: 2_000 });
      const pending = sandbox.RH_SOURCE?.pending;
      audit.check(Array.isArray(pending), `${label}: must register through window.RH_SOURCE.pending`);
      for (const item of pending || []) registrations.push({ file: label, ...item });
    } catch (error) {
      audit.fail(`${label}: data registration failed safely: ${error.message}`);
    }
  }
  return registrations;
}

function payloadsFor(registrations, pattern) {
  const matched = registrations.filter(item => pattern.test(String(item.type || ''))).map(item => item.payload);
  return matched.length ? matched : registrations.map(item => item.payload);
}

function validateHighlights(registrations, audit) {
  const objects = payloadsFor(registrations, /highlight/i).flatMap(value => allObjects(value));
  const records = objects.filter(value => /^H(?:0[1-9]|1[0-3])$/.test(String(value.id || '')) && ('selection' in value || 'measurements' in value));
  const byId = new Map();
  for (const record of records) if (!byId.has(record.id)) byId.set(record.id, record);
  const ids = [...byId.keys()];
  audit.check(sameMembers(ids, EXPECTED.featured.concat(EXPECTED.secondary)), `data: hotspot IDs differ; got ${sorted(ids).join(', ') || 'none'}`);
  audit.metric('hotspots', ids.length);
  for (const id of EXPECTED.featured.concat(EXPECTED.secondary)) {
    const record = byId.get(id);
    if (!record) continue;
    audit.check(typeof record.chapterId === 'string' && /^src-0[1-6]$/.test(record.chapterId), `${id}: invalid/missing chapterId`);
    audit.check(/^[0-9a-f]{40}$/.test(record.commit || ''), `${id}: immutable 40-character commit missing`);
    audit.check(safeRepositoryPath(record.path), `${id}: unsafe repository path`);
    audit.check(Number.isInteger(record.selection?.startLine) && Number.isInteger(record.selection?.endLine) && record.selection.startLine > 0 && record.selection.endLine >= record.selection.startLine, `${id}: invalid source line range`);
    audit.check(/^[0-9a-f]{64}$/.test(record.selection?.sourceSha256 || ''), `${id}: invalid source digest`);
    audit.check(safeReviewedUrl(record.permalink) && record.permalink.includes(record.commit), `${id}: permalink must be HTTPS and contain immutable commit`);
    audit.check(Array.isArray(record.measurements) && record.measurements.length > 0, `${id}: measurement list missing`);
    audit.check(Array.isArray(record.caveats) && record.caveats.length > 0, `${id}: caveat list missing`);
    audit.check(typeof record.license?.spdx === 'string' || record.license?.spdx === null, `${id}: license signal missing`);
  }
}

function validateComparisons(registrations, audit) {
  const roots = payloadsFor(registrations, /comparison/i);
  const objects = roots.flatMap(value => allObjects(value));
  const declaredSystems = roots.flatMap(value => Array.isArray(value?.systems) ? value.systems.map(item => typeof item === 'string' ? item : item?.id) : []);
  const declaredAxes = roots.flatMap(value => Array.isArray(value?.axes) ? value.axes.map(item => typeof item === 'string' ? item : item?.id) : []);
  const discoveredSystems = uniq(declaredSystems.concat(objects.map(item => item.systemId)).filter(Boolean));
  const discoveredAxes = uniq(declaredAxes.concat(objects.map(item => item.axisId)).filter(Boolean));
  audit.check(sameMembers(discoveredSystems, EXPECTED.systems), `data: comparison systems differ; got ${sorted(discoveredSystems).join(', ') || 'none'}`);
  audit.check(sameMembers(discoveredAxes, EXPECTED.axes), `data: comparison axes differ; got ${sorted(discoveredAxes).join(', ') || 'none'}`);
  const cells = objects.filter(item => EXPECTED.systems.includes(item.systemId) && EXPECTED.axes.includes(item.axisId) && ('mechanism' in item || 'analogy' in item));
  const pairs = uniq(cells.map(cell => `${cell.axisId}/${cell.systemId}`));
  const expectedPairs = EXPECTED.axes.flatMap(axis => EXPECTED.systems.map(system => `${axis}/${system}`));
  audit.check(sameMembers(pairs, expectedPairs), `data: comparison cell matrix incomplete (${pairs.length}/30 unique cells)`);
  audit.metric('systems', discoveredSystems.length);
  audit.metric('axes', discoveredAxes.length);
  audit.metric('comparisonCells', pairs.length);
  for (const cell of cells) {
    audit.check(['direct', 'partial', 'not-analogous', 'not-documented'].includes(cell.analogy), `${cell.axisId}/${cell.systemId}: invalid analogy`);
    audit.check(Array.isArray(cell.measure) && cell.measure.length > 0, `${cell.axisId}/${cell.systemId}: measurement consequence missing`);
    audit.check(typeof cell.caveat === 'string' && cell.caveat.trim().length > 0, `${cell.axisId}/${cell.systemId}: caveat missing`);
    if (!['not-analogous', 'not-documented'].includes(cell.analogy)) {
      audit.check(Array.isArray(cell.paths) && cell.paths.length > 0, `${cell.axisId}/${cell.systemId}: source paths missing`);
      for (const sourcePath of cell.paths || []) {
        audit.check(safeRepositoryPath(sourcePath.path), `${cell.axisId}/${cell.systemId}: unsafe comparison path`);
        audit.check(safeReviewedUrl(sourcePath.permalink) && sourcePath.permalink.includes(cell.commit), `${cell.axisId}/${cell.systemId}: comparison permalink is not immutable HTTPS`);
      }
    }
  }
}

function validateDataSafety(registrations, audit) {
  for (const item of registrations) for (const object of allObjects(item.payload)) {
    for (const [key, value] of Object.entries(object)) {
      if (typeof value !== 'string') continue;
      if (/(?:url|permalink)$/i.test(key)) audit.check(safeReviewedUrl(value), `${item.file}: unsafe/non-HTTPS URL in ${key}`);
      if (key === 'path' || key === 'directoryPath') audit.check(safeRepositoryPath(value), `${item.file}: unsafe path in ${key}`);
      audit.check(!/<\/?(?:script|iframe|object|embed|style)\b|onerror\s*=|javascript\s*:/i.test(value), `${item.file}: active HTML/script content in ${key}`);
    }
  }
}

function validateBuildManifest(audit) {
  const path = join(DATA_ROOT, 'BUILD-MANIFEST.json');
  audit.check(existsSync(path), 'data: BUILD-MANIFEST.json missing');
  if (!existsSync(path)) return;
  let manifest;
  try { manifest = JSON.parse(read(path)); } catch (error) { audit.fail(`data: BUILD-MANIFEST.json parse failed: ${error.message}`); return; }
  audit.check(manifest.schemaVersion === 1, 'data: build manifest schemaVersion must be 1');
  const serialized = JSON.stringify(manifest);
  audit.check(!/"truncated"\s*:\s*true/.test(serialized), 'data: build manifest contains a truncated tree');
  audit.check(!/"(?:unresolvedGitlinks|invalidHotspotDigests|missingComparisonPaths)"\s*:\s*[1-9]/.test(serialized), 'data: build manifest records unresolved source errors');
  const digest = allObjects(manifest).map(item => item.releaseDigest).find(value => typeof value === 'string');
  audit.check(/^[0-9a-f]{64}$/.test(digest || ''), 'data: build manifest releaseDigest missing/invalid');
  const objects = allObjects(manifest);
  const repoCount = objects.map(item => item.repositories ?? item.repositoryCount).find(Number.isFinite);
  if (repoCount != null) {
    audit.check(repoCount >= 27, `data: repository census unexpectedly small (${repoCount}; expected at least 27)`);
    audit.metric('repositories', repoCount);
  } else audit.warn('data: repository total is not schema-visible in BUILD-MANIFEST.json');
}

function validatePayloadBudgets(source, audit) {
  const localRefs = [...source.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)]
    .map(match => match[1])
    .filter(value => !/^(?:https?:|#|data:|javascript:)/i.test(value));
  const initialFiles = uniq([PAGE_PATH, ...localRefs.map(value => resolve(dirname(PAGE_PATH), value.split(/[?#]/)[0])).filter(existsSync)]);
  const initialBytes = initialFiles.reduce((sum, path) => sum + statSync(path).size, 0);
  audit.metric('initialBytes', initialBytes);
  audit.check(initialBytes <= 250 * 1024, `budget: initial authored payload ${initialBytes} bytes exceeds 250 KiB hard gate`);
  if (initialBytes > 180 * 1024) audit.warn(`budget: initial authored payload ${initialBytes} bytes exceeds 180 KiB target`);

  const catalogPath = join(DATA_ROOT, 'catalog.js');
  if (existsSync(catalogPath)) {
    const bytes = statSync(catalogPath).size;
    audit.metric('catalogBytes', bytes);
    audit.check(bytes <= 100 * 1024, `budget: catalog ${bytes} bytes exceeds 100 KiB hard gate`);
    if (bytes > 80 * 1024) audit.warn(`budget: catalog ${bytes} bytes exceeds 80 KiB target`);
  }
  const shards = walkFiles(join(DATA_ROOT, 'trees'), path => extname(path) === '.js' && path.includes(`${sep}directories${sep}`));
  let maximum = 0;
  for (const path of shards) {
    const bytes = statSync(path).size;
    maximum = Math.max(maximum, bytes);
    audit.check(bytes <= 128 * 1024, `budget: directory shard ${relativePath(path)} is ${bytes} bytes (>128 KiB hard gate)`);
  }
  if (maximum > 64 * 1024) audit.warn(`budget: largest directory shard is ${maximum} bytes (>64 KiB target)`);
  audit.metric('directoryShards', shards.length);
  audit.metric('largestShardBytes', maximum);
}

function auditNavigationAndSolana(options, audit) {
  const robinhoodPages = [
    ['multichain/robinhood/index.html', /href=["']source\/["']/],
    ['multichain/robinhood/chains/index.html', /href=["']\.\.\/source\/["']/],
    ['multichain/robinhood/tools/index.html', /href=["']\.\.\/source\/["']/]
  ];
  for (const [name, pattern] of robinhoodPages) {
    const path = join(ROOT, name);
    audit.check(existsSync(path) && pattern.test(read(path)), `${name}: Robinhood Source navigation link missing`);
  }
  for (const path of walkFiles(join(ROOT, 'multichain/solana'), item => extname(item) === '.html')) {
    audit.check(!/href=["'][^"']*source\/?["']/i.test(read(path)), `${relativePath(path)}: Solana must not gain a Source route`);
  }
  audit.check(!existsSync(join(ROOT, 'multichain/solana/source')), 'protected boundary: multichain/solana/source must not exist');

  const solanaIndex = join(ROOT, 'multichain/solana/index.html');
  const baseline = join(ROOT, 'multichain/robinhood/.solana-baseline.sha256');
  if (existsSync(solanaIndex) && existsSync(baseline)) {
    const expected = read(baseline).trim().split(/\s+/)[0];
    const actual = sha256(readFileSync(solanaIndex));
    audit.check(actual === expected, `protected boundary: Solana Scope checksum ${actual} differs from ${expected}`);
    audit.metric('solanaChecksum', actual);
  } else audit.fail('protected boundary: Solana index or baseline checksum missing');

  try {
    const dirty = execFileSync('git', ['diff', '--name-only', '--', 'multichain/solana'], { cwd: ROOT, encoding: 'utf8' }).trim();
    audit.check(dirty === '', `protected boundary: working-tree Solana changes: ${dirty || 'none'}`);
    if (options.baseSha) {
      const committed = execFileSync('git', ['diff', '--name-only', `${options.baseSha}..HEAD`, '--', 'multichain/solana'], { cwd: ROOT, encoding: 'utf8' }).trim();
      audit.check(committed === '', `protected boundary: committed Solana changes since ${options.baseSha}: ${committed || 'none'}`);
      const baselineChanged = execFileSync('git', ['diff', '--name-only', `${options.baseSha}..HEAD`, '--', 'multichain/robinhood/.solana-baseline.sha256'], { cwd: ROOT, encoding: 'utf8' }).trim();
      audit.check(baselineChanged === '', 'protected boundary: .solana-baseline.sha256 changed');
    } else audit.warn('protected boundary: pass --base-sha <integration-base> to check committed Solana history');
  } catch (error) {
    audit.fail(`protected boundary: git diff failed: ${error.message}`);
  }
}

function runStaticAudit(options, audit) {
  audit.check(existsSync(PAGE_PATH), 'page: multichain/robinhood/source/index.html missing');
  if (!existsSync(PAGE_PATH)) {
    auditNavigationAndSolana(options, audit);
    return;
  }
  const source = read(PAGE_PATH);
  scanHtmlSource(source, audit);
  const scripts = walkFiles(join(SOURCE_ROOT, 'scripts'), path => extname(path) === '.js');
  audit.check(scripts.length >= 4, `runtime: expected at least four local source scripts; found ${scripts.length}`);
  for (const path of scripts) scanRuntimeSource(read(path), relativePath(path), audit);
  const dataFiles = registrationFiles(DATA_ROOT);
  audit.check(dataFiles.some(path => basename(path) === 'catalog.js'), 'data: catalog.js missing');
  audit.check(dataFiles.some(path => basename(path) === 'highlights.js'), 'data: highlights.js missing');
  audit.check(dataFiles.some(path => basename(path) === 'comparisons.js'), 'data: comparisons.js missing');
  const registrations = evaluateRegistrations(dataFiles, audit);
  audit.check(registrations.length > 0, 'data: no local registrations found');
  validateHighlights(registrations, audit);
  validateComparisons(registrations, audit);
  validateDataSafety(registrations, audit);
  validateBuildManifest(audit);
  validatePayloadBudgets(source, audit);
  auditNavigationAndSolana(options, audit);
}

async function importPlaywright() {
  try { return await import('playwright'); } catch (firstError) {
    const explicit = process.env.PLAYWRIGHT_MODULE;
    if (explicit) return import(pathToFileURL(resolve(explicit)).href);
    throw new Error(`Playwright is required for browser mode (${firstError.code || firstError.message}). Install it or set PLAYWRIGHT_MODULE; use --static only for a deliberately static-only pass.`);
  }
}

async function launchBrowser(chromium) {
  const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(macChrome) ? macChrome : undefined);
  return chromium.launch({ headless: true, executablePath });
}

function pageUrl(options, unlocked = true) {
  const target = options.url ? new URL(options.url) : new URL(pathToFileURL(PAGE_PATH).href);
  if (unlocked) target.searchParams.set('scope-audit', '1');
  else target.searchParams.delete('scope-audit');
  return target.href;
}

async function blockExternalRequests(page, targetHref, requests) {
  const target = new URL(targetHref);
  page.on('request', request => {
    const url = request.url();
    if (/^https?:/i.test(url) && new URL(url).origin !== target.origin) requests.push(url);
  });
  await page.route('**/*', route => {
    const url = route.request().url();
    if (!/^https?:/i.test(url)) return route.continue();
    const parsed = new URL(url);
    if (/^https?:$/.test(target.protocol) && parsed.origin === target.origin) return route.continue();
    return route.abort('blockedbyclient');
  });
}

async function openPage(browser, options, config = {}) {
  const context = await browser.newContext({
    viewport: { width: config.width || 1200, height: config.height || 900 },
    javaScriptEnabled: config.javaScriptEnabled !== false,
    reducedMotion: config.reducedMotion || 'reduce',
    forcedColors: config.forcedColors || 'none',
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  const target = pageUrl(options, config.unlocked !== false);
  await blockExternalRequests(page, target, requests);
  if (config.routeSetup) await config.routeSetup(page);
  await page.goto(target, { waitUntil: 'load' });
  if (config.javaScriptEnabled !== false) await page.waitForTimeout(config.settleMs || 120);
  return { context, page, errors, requests, target };
}

async function browserAuthAudit(browser, options, audit) {
  const { context, page, errors } = await openPage(browser, options, { width: 390, height: 844, unlocked: false });
  try {
    const locked = await page.evaluate(() => ({
      gateVisible: Boolean(document.getElementById('mgAccessGate')?.getClientRects().length),
      unlocked: document.documentElement.hasAttribute('data-scope-unlocked'),
      contentVisible: Boolean(document.querySelector('main')?.getClientRects().length),
      pending: window.RH_SOURCE?.pending?.length || 0
    }));
    audit.check(locked.gateVisible && !locked.unlocked && !locked.contentVisible, `auth: initial request does not fail closed ${JSON.stringify(locked)}`);
    audit.check(locked.pending === 0, `auth: ${locked.pending} source-data registrations loaded before grant`);

    const input = page.locator('#mgAccessCode');
    if (await input.count()) {
      await input.fill('DEFINITELY-WRONG');
      await page.locator('#mgAccessForm button[type="submit"]').click();
      await page.waitForTimeout(40);
      audit.check(/CODE REJECTED/i.test(await page.locator('#mgAccessStatus').innerText()), 'auth: wrong code did not produce rejection state');
    } else audit.fail('auth: shared access-code input missing');

    try {
      await page.evaluate(({ key, digest }) => sessionStorage.setItem(key, digest), { key: ACCESS_KEY, digest: ACCESS_DIGEST });
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(100);
      const session = await page.evaluate(() => ({ unlocked: document.documentElement.dataset.scopeUnlocked, mainVisible: Boolean(document.querySelector('main')?.getClientRects().length) }));
      audit.check(session.unlocked === 'session' && session.mainVisible, `auth: seeded correct session did not survive reload ${JSON.stringify(session)}`);
    } catch (error) {
      audit.fail(`auth: session reload test failed: ${error.message}`);
    }

    const logout = page.locator('[data-auth-logout], #sourceLogout');
    audit.check(await logout.count() === 1, 'auth: Source logout control missing or ambiguous');
    if (await logout.count() === 1) {
      await logout.click();
      await page.waitForTimeout(50);
      const result = await page.evaluate(() => ({ unlocked: document.documentElement.hasAttribute('data-scope-unlocked'), locked: Boolean(document.getElementById('mgAccessGate')?.getClientRects().length) }));
      audit.check(!result.unlocked && result.locked, `auth: logout did not restore locked gate ${JSON.stringify(result)}`);
    }
    errors.forEach(error => audit.fail(`auth page error: ${error}`));
  } finally { await context.close(); }

  const noJs = await openPage(browser, options, { width: 390, height: 844, unlocked: false, javaScriptEnabled: false });
  try {
    const result = await noJs.page.evaluate(() => ({
      mainVisible: Boolean(document.querySelector('main')?.getClientRects().length),
      warning: [...document.querySelectorAll('noscript')].some(node => node.getClientRects().length && /JavaScript is required to verify the access code/i.test(node.textContent || '')),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    }));
    audit.check(!result.mainVisible && result.warning, `auth: JavaScript-off gate did not fail closed ${JSON.stringify(result)}`);
    audit.check(result.overflow <= 1, `auth: JavaScript-off page has ${result.overflow}px horizontal overflow`);
  } finally { await noJs.context.close(); }
}

async function visibleTreeItems(page) {
  return page.locator('[role="tree"] [role="treeitem"]:visible');
}

async function browserTreeAudit(page, audit) {
  const tree = page.locator('[data-source-tree], [role="tree"]').first();
  audit.check(await tree.count() === 1, 'tree: exactly one source tree required');
  if (await tree.count() !== 1) return;
  audit.check(await tree.getAttribute('aria-label') || await tree.getAttribute('aria-labelledby'), 'tree: accessible name missing');
  let items = await visibleTreeItems(page);
  const count = await items.count();
  audit.check(count > 0, 'tree: no visible treeitems');
  audit.check(count <= 2_000, `tree: ${count} rendered rows exceeds 2,000 hard gate`);
  if (!count) return;
  const roving = await items.evaluateAll(nodes => nodes.filter(node => node.getAttribute('tabindex') === '0').length);
  audit.check(roving === 1, `tree: expected one roving tabindex=0 item; found ${roving}`);
  await items.first().focus();
  await page.keyboard.press('End');
  audit.check(await items.last().evaluate(node => node === document.activeElement), 'tree: End did not focus last visible item');
  await page.keyboard.press('Home');
  audit.check(await items.first().evaluate(node => node === document.activeElement), 'tree: Home did not focus first visible item');
  if (count > 1) {
    await page.keyboard.press('ArrowDown');
    audit.check(await items.nth(1).evaluate(node => node === document.activeElement), 'tree: ArrowDown did not focus next visible item');
    await page.keyboard.press('ArrowUp');
    audit.check(await items.first().evaluate(node => node === document.activeElement), 'tree: ArrowUp did not focus previous visible item');
  }
  const directory = page.locator('[role="treeitem"][aria-expanded]').first();
  audit.check(await directory.count() > 0, 'tree: no expandable directory treeitem');
  if (await directory.count()) {
    await directory.focus();
    const before = await directory.getAttribute('aria-expanded');
    await page.keyboard.press(before === 'true' ? 'ArrowLeft' : 'ArrowRight');
    await page.waitForTimeout(20);
    const after = await directory.getAttribute('aria-expanded');
    audit.check(after !== before || await page.locator('[role="treeitem"]:focus').count() === 1, `tree: ${before === 'true' ? 'Left' : 'Right'} had no semantic effect`);
    await directory.focus();
    await page.keyboard.press(' ');
    await page.waitForTimeout(20);
    audit.check(await directory.getAttribute('aria-expanded') !== after, 'tree: Space did not toggle directory');
  }
  const live = page.locator('[aria-live="polite"]');
  audit.check(await live.count() > 0, 'tree: polite loading/status live region missing');
}

async function browserSearchAndPathAudit(page, audit) {
  const search = page.locator('input[type="search"], [data-source-search]').first();
  audit.check(await search.count() === 1, 'search: one local source search control required');
  if (await search.count() !== 1) return;
  audit.check(Boolean(await search.getAttribute('aria-label') || await search.getAttribute('aria-labelledby') || await search.getAttribute('placeholder')), 'search: accessible name missing');

  const results = page.locator('[data-source-search-results] [role="option"], [data-search-result]');
  await search.fill('sequencer.go');
  await page.waitForTimeout(30);
  audit.check(await results.count() > 0, 'search: exact sequencer.go query returned no results');
  if (await results.count()) {
    await results.first().click();
    await page.waitForTimeout(30);
    audit.check(await page.locator('[role="treeitem"]:focus, [role="treeitem"][aria-selected="true"]').count() > 0, 'search: selecting result did not focus/select its tree item');
  }
  await search.fill('seqncr');
  await page.waitForTimeout(30);
  audit.check(await results.count() > 0, 'search: fuzzy seqncr query returned no results');
  await search.fill('__NO_SUCH_SOURCE_PATH_7f9e__');
  await page.waitForTimeout(30);
  audit.check(/NO SEARCH RESULTS/i.test(await page.locator('body').innerText()), 'search: no-result query lacks authored NO SEARCH RESULTS state');
  await search.fill('');

  const showAll = page.locator('[data-show-all-categories], button').filter({ hasText: /SHOW ALL CATEGORIES/i }).first();
  audit.check(await showAll.count() === 1, 'tree: SHOW ALL CATEGORIES control missing');
  if (await showAll.count()) {
    await showAll.click();
    const state = await showAll.getAttribute('aria-pressed');
    audit.check(state === null || state === 'true', 'tree: SHOW ALL CATEGORIES did not enter active state');
  }

  const paths = [
    ['execution/gethexec/sequencer.go', /sequencer\.go/i],
    ['README.md', /README\.md/i],
    ['go-ethereum', /gitlink|go-ethereum/i]
  ];
  for (const [path, pattern] of paths) {
    await page.evaluate(hash => { location.hash = hash; }, `#/repo/nitro/path/${encodeURIComponent(path)}`);
    await page.waitForTimeout(30);
    const text = await page.locator('body').innerText();
    audit.check(pattern.test(text) && !/UNKNOWN ROUTE/i.test(text), `path: ${path} did not resolve to an authored inspector state`);
  }
}

async function browserSemanticAudit(page, audit) {
  const result = await page.evaluate(() => {
    const visible = node => Boolean(node.getClientRects().length) && getComputedStyle(node).visibility !== 'hidden';
    const label = node => {
      const aria = node.getAttribute('aria-label');
      if (aria?.trim()) return aria.trim();
      const labelledBy = node.getAttribute('aria-labelledby');
      if (labelledBy) {
        const copy = labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
        if (copy) return copy;
      }
      if (node.id) {
        const explicit = document.querySelector(`label[for="${CSS.escape(node.id)}"]`);
        if (explicit?.textContent.trim()) return explicit.textContent.trim();
      }
      return node.textContent?.trim() || node.getAttribute('title') || '';
    };
    const controls = [...document.querySelectorAll('button, input, select, textarea, [role="button"], [role="option"]')].filter(visible);
    const dialogs = [...document.querySelectorAll('[role="dialog"]')];
    const popupTriggers = [...document.querySelectorAll('[aria-haspopup]')].filter(visible);
    const headingLevels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map(node => Number(node.tagName.slice(1)));
    return {
      unnamedControls: controls.filter(node => !label(node)).map(node => node.outerHTML.slice(0, 160)),
      unnamedDialogs: dialogs.filter(node => !node.getAttribute('aria-label') && !node.getAttribute('aria-labelledby')).map(node => node.id || node.className),
      brokenPopups: popupTriggers.filter(node => {
        const controlsId = node.getAttribute('aria-controls');
        return !controlsId || !document.getElementById(controlsId);
      }).map(node => node.outerHTML.slice(0, 160)),
      h1: headingLevels.filter(level => level === 1).length,
      headingSkips: headingLevels.slice(1).filter((level, index) => level > headingLevels[index] + 1).length,
      tablesWithoutCaption: [...document.querySelectorAll('table')].filter(table => !table.querySelector('caption')).length,
      tablesWithoutHeaders: [...document.querySelectorAll('table')].filter(table => !table.querySelector('th')).length,
      duplicateIds: [...document.querySelectorAll('[id]')].map(node => node.id).filter((id, index, ids) => ids.indexOf(id) !== index),
      codeLineNumbersExposed: [...document.querySelectorAll('[data-line-number], .source-line-number')].filter(node => node.getAttribute('aria-hidden') !== 'true').length,
      assertiveErrors: [...document.querySelectorAll('[data-source-error]')].filter(node => /AUTH REQUIRED|SOURCE CHANGED|SHARD UNAVAILABLE/i.test(node.textContent || '') && node.getAttribute('aria-live') !== 'assertive' && node.getAttribute('role') !== 'alert').length
    };
  });
  audit.check(result.unnamedControls.length === 0, `accessibility: unnamed visible controls ${JSON.stringify(result.unnamedControls.slice(0, 3))}`);
  audit.check(result.unnamedDialogs.length === 0, `accessibility: unnamed dialogs ${result.unnamedDialogs.join(', ')}`);
  audit.check(result.brokenPopups.length === 0, `accessibility: popup triggers lack valid aria-controls ${JSON.stringify(result.brokenPopups.slice(0, 3))}`);
  audit.check(result.h1 === 1 && result.headingSkips === 0, `accessibility: heading structure invalid ${JSON.stringify({ h1: result.h1, skips: result.headingSkips })}`);
  audit.check(result.tablesWithoutCaption === 0 && result.tablesWithoutHeaders === 0, `accessibility: semantic table caption/header incomplete ${JSON.stringify(result)}`);
  audit.check(result.duplicateIds.length === 0, `accessibility: duplicate IDs ${uniq(result.duplicateIds).join(', ')}`);
  audit.check(result.codeLineNumbersExposed === 0, `accessibility: ${result.codeLineNumbersExposed} decorative code line numbers exposed to screen readers`);
  audit.check(result.assertiveErrors === 0, `accessibility: ${result.assertiveErrors} action-required error states are not assertive`);
}

async function browserRouteComparisonAudit(page, audit) {
  for (const id of EXPECTED.featured) {
    await page.evaluate(hash => { location.hash = hash; }, `#/hotspot/${id}`);
    await page.waitForTimeout(20);
    const result = await page.evaluate(id => ({ hash: location.hash, visible: document.body.innerText.includes(id), errors: [...document.querySelectorAll('[data-source-error]:not([hidden])')].map(node => node.textContent) }), id);
    audit.check(result.hash === `#/hotspot/${id}` && result.visible, `route: hotspot ${id} did not resolve`);
  }
  for (const axis of EXPECTED.axes) {
    await page.evaluate(hash => { location.hash = hash; }, `#/compare/${axis}`);
    await page.waitForTimeout(20);
    const result = await page.evaluate(axis => {
      const active = [...document.querySelectorAll(`[data-axis-id="${CSS.escape(axis)}"]`)].some(node => node.getClientRects().length && (node.getAttribute('aria-selected') === 'true' || node.getAttribute('aria-current') || node.hasAttribute('data-active')));
      const readable = axis.split('-').every(part => document.body.innerText.toLowerCase().includes(part));
      return { hash: location.hash, active, readable };
    }, axis);
    audit.check(result.hash === `#/compare/${axis}` && (result.active || result.readable), `route: comparison axis ${axis} did not resolve ${JSON.stringify(result)}`);
  }
  await page.evaluate(() => { location.hash = '#/hotspot/H01'; });
  await page.waitForTimeout(20);
  await page.evaluate(() => { location.hash = '#/compare/fee-data-cost'; });
  await page.waitForTimeout(20);
  await page.goBack();
  await page.waitForTimeout(20);
  audit.check(await page.evaluate(() => location.hash) === '#/hotspot/H01', 'route: Back did not restore prior hotspot');
  await page.goForward();
  await page.waitForTimeout(20);
  audit.check(await page.evaluate(() => location.hash) === '#/compare/fee-data-cost', 'route: Forward did not restore comparison');
  await page.evaluate(() => { location.hash = '#/hotspot/NOT-A-REAL-HOTSPOT'; });
  await page.waitForTimeout(20);
  audit.check(/UNKNOWN ROUTE/i.test(await page.locator('body').innerText()), 'route: unknown ID lacks authored UNKNOWN ROUTE state');

  const nativeSystem = page.locator('select[data-comparison-system], [data-source-comparison] select').first();
  audit.check(await nativeSystem.count() === 1, 'comparison: alternate-system selector missing');
  if (await nativeSystem.count() === 1) {
    const options = await nativeSystem.locator('option').evaluateAll(nodes => nodes.map(node => node.value));
    for (const system of EXPECTED.systems.filter(id => id !== 'robinhood')) audit.check(options.includes(system), `comparison: selector missing ${system}`);
    for (const system of EXPECTED.systems.filter(id => id !== 'robinhood')) {
      await nativeSystem.selectOption(system);
      await page.waitForTimeout(10);
      audit.check(await nativeSystem.inputValue() === system, `comparison: failed to select ${system}`);
    }
  }
}

async function browserOverlayAudit(page, audit) {
  const selectTrigger = page.locator('.mg-select-trigger').first();
  audit.check(await selectTrigger.count() > 0, 'overlay: site-styled custom select trigger missing');
  if (await selectTrigger.count()) {
    await selectTrigger.focus();
    await selectTrigger.click();
    const menu = page.locator('.mg-select-menu:not([hidden])').first();
    audit.check(await menu.count() === 1 && await menu.isVisible(), 'overlay: custom select did not open');
    await page.keyboard.press('Escape');
    audit.check(await menu.isHidden(), 'overlay: Escape did not close custom select');
    audit.check(await selectTrigger.evaluate(node => node === document.activeElement), 'overlay: custom select Escape did not restore focus');
    await selectTrigger.click();
    await page.mouse.click(4, 4);
    audit.check(await menu.isHidden(), 'overlay: outside click did not close custom select');
  }

  const trigger = page.locator('[data-source-overlay-trigger], button[aria-haspopup="dialog"]').first();
  audit.check(await trigger.count() > 0, 'overlay: mobile drawer/dialog trigger missing');
  if (await trigger.count()) {
    await trigger.focus();
    await trigger.click();
    const id = await trigger.getAttribute('aria-controls');
    const actualOverlay = id ? page.locator(`[id="${id.replaceAll('"', '\\"')}"]`) : page.locator('[data-source-overlay]:visible, [role="dialog"]:visible').last();
    audit.check(await actualOverlay.count() === 1 && await actualOverlay.isVisible(), 'overlay: drawer/dialog did not open');
    if (await actualOverlay.count()) {
      await page.keyboard.press('Escape');
      audit.check(await actualOverlay.isHidden(), 'overlay: Escape did not close drawer/dialog');
      audit.check(await trigger.evaluate(node => node === document.activeElement), 'overlay: drawer/dialog Escape did not restore focus');
      await trigger.click();
      const backdrop = page.locator('[data-source-backdrop]:visible, .source-backdrop:visible').last();
      if (await backdrop.count()) await backdrop.click({ position: { x: 2, y: 2 } });
      else await page.mouse.click(2, 2);
      audit.check(await actualOverlay.isHidden(), 'overlay: backdrop/outside click did not close drawer/dialog');
    }
  }
}

async function browserResponsiveAudit(browser, options, audit) {
  const widths = [320, 360, 390, 430, 768, 1200, 1440];
  for (const width of widths) {
    const opened = await openPage(browser, options, { width, height: width < 768 ? 844 : 900, reducedMotion: 'reduce' });
    try {
      const result = await opened.page.evaluate(() => {
        const visibleControls = [...document.querySelectorAll('[data-source-control], .source-action, .drawer-trigger, .mg-select-trigger')].filter(node => node.getClientRects().length);
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          main: Boolean(document.querySelector('main')?.getClientRects().length),
          h1: document.querySelectorAll('h1').length,
          treeRows: document.querySelectorAll('[role="tree"] [role="treeitem"]').length,
          undersized: visibleControls.map(node => ({ label: node.getAttribute('aria-label') || node.textContent.trim(), rect: node.getBoundingClientRect().toJSON() })).filter(item => item.rect.width < 44 || item.rect.height < 44),
          clipped: visibleControls.map(node => node.getBoundingClientRect().toJSON()).filter(rect => rect.left < -1 || rect.right > innerWidth + 1),
          reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
          authoredErrors: ['AUTH REQUIRED', 'SHARD UNAVAILABLE', 'UNKNOWN ROUTE', 'SOURCE CHANGED', 'NO SEARCH RESULTS', 'OFFLINE EXTERNAL LINK'].filter(label => document.documentElement.innerHTML.includes(label))
        };
      });
      audit.check(result.main && result.h1 === 1, `${width}px: authenticated main/h1 missing`);
      audit.check(result.overflow <= 1, `${width}px: ${result.overflow}px document horizontal overflow`);
      audit.check(result.treeRows <= 2_000, `${width}px: ${result.treeRows} rendered tree rows exceeds hard gate`);
      audit.check(result.undersized.length === 0, `${width}px: undersized Source controls ${JSON.stringify(result.undersized.slice(0, 4))}`);
      audit.check(result.clipped.length === 0, `${width}px: ${result.clipped.length} Source controls clip horizontally`);
      audit.check(result.reduced, `${width}px: reduced-motion media state not active`);
      audit.check(result.authoredErrors.length === 6, `${width}px: authored error-state labels incomplete (${result.authoredErrors.join(', ')})`);
      audit.check(opened.requests.length === 0, `${width}px: runtime HTTP(S) dependency observed: ${uniq(opened.requests).join(', ')}`);
      opened.errors.forEach(error => audit.fail(`${width}px page error: ${error}`));

      if (width === 390) {
        await browserTreeAudit(opened.page, audit);
        await browserSearchAndPathAudit(opened.page, audit);
        await browserRouteComparisonAudit(opened.page, audit);
        await browserOverlayAudit(opened.page, audit);
      }
      if (width === 1200) {
        await browserSemanticAudit(opened.page, audit);
        const timings = await opened.page.evaluate(async () => {
          const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));
          const result = {};
          const search = document.querySelector('input[type="search"], [data-source-search]');
          if (search) {
            const start = performance.now(); search.value = 'sequencer.go'; search.dispatchEvent(new Event('input', { bubbles: true })); await waitFrame(); result.search = performance.now() - start;
          }
          const directory = document.querySelector('[role="treeitem"][aria-expanded]');
          if (directory) {
            const start = performance.now(); directory.dispatchEvent(new MouseEvent('click', { bubbles: true })); await waitFrame(); result.expand = performance.now() - start;
          }
          const start = performance.now(); location.hash = '#/hotspot/H02'; await waitFrame(); result.route = performance.now() - start;
          return result;
        });
        for (const [name, value] of Object.entries(timings)) audit.check(value <= 100, `performance: ${name} update ${value.toFixed(1)}ms exceeds 100ms hard gate`);
        audit.metric('browserTimingsMs', timings);
      }
    } finally { await opened.context.close(); }
  }

  const forced = await openPage(browser, options, { width: 1200, height: 900, forcedColors: 'active' });
  try {
    const result = await forced.page.evaluate(() => {
      const target = document.querySelector('[role="treeitem"], button, a[href]');
      target?.focus();
      const style = target ? getComputedStyle(target) : null;
      return { active: matchMedia('(forced-colors: active)').matches, outline: style?.outlineStyle, outlineWidth: style?.outlineWidth };
    });
    audit.check(result.active, 'forced-colors: emulation did not activate');
    audit.check(result.outline !== 'none' && result.outlineWidth !== '0px', `forced-colors: focused control lacks outline (${JSON.stringify(result)})`);
  } finally { await forced.context.close(); }

  const zoomed = await openPage(browser, options, { width: 390, height: 844 });
  try {
    const result = await zoomed.page.evaluate(async () => {
      document.documentElement.style.fontSize = '200%';
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    audit.check(result.overflow <= 1, `200% text zoom: ${result.overflow}px document horizontal overflow`);
  } finally { await zoomed.context.close(); }
}

async function fulfillMutatedScript(route, mutate) {
  const url = route.request().url();
  if (url.startsWith('file:')) {
    const body = mutate(read(fileURLToPath(url)));
    await route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body });
    return;
  }
  const response = await route.fetch();
  const body = mutate(await response.text());
  await route.fulfill({ response, body, contentType: 'text/javascript; charset=utf-8' });
}

async function browserFaultAudit(browser, options, audit) {
  let aborted = 0;
  const missing = await openPage(browser, options, {
    width: 1200,
    height: 900,
    routeSetup: page => page.route('**/data/trees/**/*.js', route => { aborted += 1; return route.abort('failed'); })
  });
  try {
    await missing.page.evaluate(() => { location.hash = '#/repo/nitro/path/execution%2Fgethexec%2Fsequencer.go'; });
    await missing.page.waitForTimeout(80);
    if (!aborted) {
      const directory = missing.page.locator('[role="treeitem"][aria-expanded="false"]').first();
      if (await directory.count()) await directory.click();
      await missing.page.waitForTimeout(80);
    }
    audit.check(aborted > 0, 'fault: missing-shard probe intercepted no on-demand tree script');
    audit.check(/SHARD UNAVAILABLE/i.test(await missing.page.locator('body').innerText()), 'fault: missing tree shard lacks authored SHARD UNAVAILABLE state');
  } finally { await missing.context.close(); }

  let hostileMutated = false;
  const hostileToken = '<img src=x onerror=window.__RH_SOURCE_XSS__=1>';
  const hostile = await openPage(browser, options, {
    width: 1200,
    height: 900,
    routeSetup: page => page.route('**/data/highlights.js', route => fulfillMutatedScript(route, body => {
      const exact = body.replace(/Feed reconnect cursor/i, () => { hostileMutated = true; return hostileToken; });
      if (hostileMutated) return exact;
      return body.replace(/(\btitle\s*:\s*)(["'])([^"']*)(\2)/, (match, prefix, quote) => { hostileMutated = true; return `${prefix}${quote}${hostileToken}${quote}`; });
    }))
  });
  try {
    await hostile.page.evaluate(() => { location.hash = '#/hotspot/H01'; });
    await hostile.page.waitForTimeout(80);
    const result = await hostile.page.evaluate(token => ({
      executed: window.__RH_SOURCE_XSS__ === 1,
      injectedNode: Boolean(document.querySelector('img[src="x"]')),
      literal: document.body.innerText.includes(token),
      rejected: /SOURCE CHANGED/i.test(document.body.innerText)
    }), hostileToken);
    audit.check(hostileMutated, 'fault: hostile highlight probe could not mutate highlights.js');
    audit.check(!result.executed && !result.injectedNode && (result.literal || result.rejected), `fault: hostile source title was not escaped or safely rejected ${JSON.stringify(result)}`);
  } finally { await hostile.context.close(); }

  let digestMutated = false;
  const corrupt = await openPage(browser, options, {
    width: 1200,
    height: 900,
    routeSetup: page => page.route('**/data/trees/**/*.js', route => fulfillMutatedScript(route, body => body.replace(/(\bdigest\s*:\s*["'])[0-9a-f]{64}(["'])/i, (match, prefix, suffix) => {
      if (digestMutated) return match;
      digestMutated = true;
      return `${prefix}${'0'.repeat(64)}${suffix}`;
    })))
  });
  try {
    await corrupt.page.evaluate(() => { location.hash = '#/repo/nitro/path/execution'; });
    await corrupt.page.waitForTimeout(80);
    if (!digestMutated) {
      const directory = corrupt.page.locator('[role="treeitem"][aria-expanded="false"]').first();
      if (await directory.count()) await directory.click();
      await corrupt.page.waitForTimeout(80);
    }
    audit.check(digestMutated, 'fault: corrupt-shard probe found no digest-bearing tree script');
    audit.check(/SOURCE CHANGED/i.test(await corrupt.page.locator('body').innerText()), 'fault: corrupt shard digest lacks authored SOURCE CHANGED state');
  } finally { await corrupt.context.close(); }
}

async function runBrowserAudit(options, audit) {
  let playwright;
  try { playwright = await importPlaywright(); } catch (error) { audit.fail(`browser: ${error.message}`); return; }
  const browser = await launchBrowser(playwright.chromium);
  try {
    await browserAuthAudit(browser, options, audit);
    await browserResponsiveAudit(browser, options, audit);
    await browserFaultAudit(browser, options, audit);
  } finally { await browser.close(); }
}

async function runSelfTest() {
  const fixtures = await import(pathToFileURL(join(ROOT, 'tests/robinhood-source/fixture-contract.mjs')).href);
  const cases = [];
  const test = (name, fn) => cases.push([name, fn]);
  const expectsFailure = (name, run, fragment) => test(name, () => {
    const audit = new Audit(name); run(audit); assert(audit.failures.some(message => message.includes(fragment)), `expected failure containing ${fragment}; got ${audit.failures.join(' | ')}`);
  });

  test('valid static HTML contract', () => { const audit = new Audit(); scanHtmlSource(fixtures.validPageSource, audit); assert.deepEqual(audit.failures, []); });
  test('valid runtime safety contract', () => { const audit = new Audit(); scanRuntimeSource(fixtures.validRuntimeSource, 'fixture-runtime.js', audit); assert.deepEqual(audit.failures, []); });
  test('valid hotspot contract', () => { const audit = new Audit(); validateHighlights([{ type: 'highlights', payload: fixtures.validPayloads.highlights }], audit); assert.deepEqual(audit.failures, []); });
  test('valid comparison contract', () => { const audit = new Audit(); validateComparisons([{ type: 'comparisons', payload: fixtures.validPayloads.comparisons }], audit); assert.deepEqual(audit.failures, []); });
  test('safe path accepts nested source path', () => assert.equal(safeRepositoryPath('execution/gethexec/sequencer.go'), true));
  for (const path of ['/etc/passwd', '../secret', 'src/%2e%2e/secret', 'C:/secret', 'src\\secret']) test(`unsafe path rejected: ${path}`, () => assert.equal(safeRepositoryPath(path), false));
  test('reviewed HTTPS URL accepted', () => assert.equal(safeReviewedUrl(`https://github.com/OffchainLabs/nitro/blob/${NITRO_COMMIT}/README.md`), true));
  for (const url of ['http://github.com/example', 'javascript:alert(1)', 'https://user:pass@example.test/x', 'data:text/html,bad']) test(`unsafe URL rejected: ${url}`, () => assert.equal(safeReviewedUrl(url), false));
  for (const [name, mutation] of fixtures.unsafeRuntimeMutations) expectsFailure(`runtime rejects ${name}`, audit => scanRuntimeSource(`${fixtures.validRuntimeSource}\n${mutation}`, 'mutated.js', audit), 'prohibited');
  expectsFailure('missing secondary hotspot rejected', audit => validateHighlights([{ type: 'highlights', payload: fixtures.validPayloads.highlights.filter(item => item.id !== 'H13') }], audit), 'hotspot IDs differ');
  expectsFailure('extra comparison system rejected', audit => validateComparisons([{ type: 'comparisons', payload: { ...fixtures.validPayloads.comparisons, systems: fixtures.validPayloads.comparisons.systems.concat({ id: 'extra' }) } }], audit), 'comparison systems differ');
  expectsFailure('missing comparison cell rejected', audit => validateComparisons([{ type: 'comparisons', payload: { ...fixtures.validPayloads.comparisons, cells: fixtures.validPayloads.comparisons.cells.slice(1) } }], audit), 'cell matrix incomplete');
  expectsFailure('hostile data markup rejected', audit => validateDataSafety([{ file: 'fixture-data.js', type: 'catalog', payload: { id: 'bad', label: '<script>alert(1)</script>' } }], audit), 'active HTML/script');
  expectsFailure('unsafe data path rejected', audit => validateDataSafety([{ file: 'fixture-data.js', type: 'catalog', payload: { id: 'bad', path: '../private' } }], audit), 'unsafe path');
  expectsFailure('credential-bearing data URL rejected', audit => validateDataSafety([{ file: 'fixture-data.js', type: 'catalog', payload: { id: 'bad', url: 'https://user:secret@example.test/source' } }], audit), 'unsafe/non-HTTPS URL');
  expectsFailure('missing auth scope rejected', audit => scanHtmlSource(fixtures.validPageSource.replace('data-auth-scope="ROBINHOOD / SOURCE"', ''), audit), 'data-auth-scope');
  expectsFailure('early static data load rejected', audit => scanHtmlSource(fixtures.validPageSource.replace('<script src="scripts/runtime.js">', '<script src="data/catalog.js"></script><script src="scripts/runtime.js">'), audit), 'before authentication');

  let passed = 0;
  const failures = [];
  for (const [name, fn] of cases) {
    try { await fn(); passed += 1; }
    catch (error) { failures.push(`${name}: ${error.message}`); }
  }
  if (failures.length) {
    console.error(`ROBINHOOD SOURCE AUDIT SELF-TEST FAIL (${failures.length}/${cases.length})`);
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else console.log(`ROBINHOOD SOURCE AUDIT SELF-TEST PASS — ${passed}/${cases.length} positive and adversarial fixture cases.`);
}

function printHelp() {
  console.log(`Usage: node scripts/audit-robinhood-source.mjs [options]\n\n` +
    `  --self-test           Run dependency-free synthetic contract tests\n` +
    `  --fixtures            Label the run as fixture-backed (same gates)\n` +
    `  --static              Run static/data/Solana gates without Playwright\n` +
    `  --base-sha <sha>      Enforce protected Solana diff from integration base\n` +
    `  --url <url>           Audit a served Source page instead of the local file URL\n` +
    `\nEnvironment: RH_SOURCE_BASE_SHA, RH_SOURCE_URL, PLAYWRIGHT_MODULE, PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.`);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) printHelp();
else if (options.selfTest) await runSelfTest();
else {
  const audit = new Audit(options.fixtures ? 'fixtures' : 'full');
  runStaticAudit(options, audit);
  if (options.browser && existsSync(PAGE_PATH)) await runBrowserAudit(options, audit);
  for (const warning of audit.warnings) console.warn(`WARN — ${warning}`);
  if (audit.failures.length) {
    console.error(`ROBINHOOD SOURCE AUDIT FAIL (${audit.failures.length} failures; ${audit.checks} checks)`);
    audit.failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    const metrics = Object.fromEntries(audit.metrics);
    console.log(`ROBINHOOD SOURCE AUDIT PASS — ${audit.checks} checks; ${metrics.hotspots || 0} hotspots; ${metrics.systems || 0} systems; ${metrics.axes || 0} axes; ${metrics.comparisonCells || 0} comparison cells; ${metrics.directoryShards || 0} tree shards; protected Solana diff empty.`);
  }
}
