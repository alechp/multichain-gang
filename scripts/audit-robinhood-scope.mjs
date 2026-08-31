#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const source = readFileSync('robinhood/index.html', 'utf8');
const rootSource = readFileSync('index.html');
const failures = [];
const expectedRoot = readFileSync('robinhood/.solana-baseline.sha256', 'utf8').trim().split(/\s+/)[0];
const actualRoot = createHash('sha256').update(rootSource).digest('hex');
if (actualRoot !== expectedRoot) failures.push(`Solana index.html changed: ${actualRoot}; expected protected baseline ${expectedRoot}`);

const dataMatch = source.match(/<script type="application\/json" id="chainData">([\s\S]*?)<\/script>/);
let data;
try { data = JSON.parse(dataMatch?.[1] || ''); } catch (error) { failures.push(`chainData does not parse: ${error.message}`); }
const expect = (condition, message) => { if (!condition) failures.push(message); };
const unique = (values, label) => {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) failures.push(`${label} duplicates: ${[...new Set(duplicates)].join(', ')}`);
};

if (data) {
  expect(data.schemaVersion === 1, 'schemaVersion must be 1');
  expect(data.page?.baselineChainId === 'robinhood_chain', 'Robinhood Chain must be the baseline');
  expect(data.sectionOrder?.length === 4, 'four comparator sections required');
  expect(data.chainOrder?.join(',') === 'sol,btc,eth,bnb,zec', 'dock chainOrder mismatch');
  expect(data.benchCols?.join(',') === 'robinhood_chain,sol,eth,bnb,btc,zec', 'benchCols mismatch');
  expect(Object.keys(data.chains || {}).length === 6, 'six systems required');
  expect(data.techniques?.length === 8, 'eight techniques required');
  expect(new Set(data.tools?.map(tool => tool.function)).size === 7, 'seven tool functions required');
  expect(data.tools?.length === 7, 'seven Robinhood-first tool records required');
  expect(Object.keys(data.terms || {}).length === 24, '24 Hoverdocs terms required');
  expect(Object.keys(data.entities || {}).length === 22, '22 Robinhood-first entities required');
  expect(data.cues?.length === 26, '26 authored cues required');
  expect(Object.keys(data.sources || {}).length >= 34, 'complete source ledger is missing records');
  expect(Object.keys(data.facts || {}).length >= 20, 'load-bearing fact ledger is incomplete');
  unique(data.chainOrder, 'chainOrder'); unique(data.benchCols, 'benchCols');
  unique(data.techniques.map(item => item.id), 'techniques'); unique(data.tools.map(item => item.id), 'tools'); unique(data.cues.map(item => item.id), 'cues');

  for (const section of data.sectionOrder) {
    const count = data.sectionMetrics[section]?.length;
    for (const [id, chain] of Object.entries(data.chains)) expect(chain[section]?.length === count, `${id}.${section} metric count mismatch`);
    for (const id of data.chainOrder) expect(typeof data.deltas[section]?.[id] === 'string', `${section}/${id} delta missing`);
  }
  for (const technique of data.techniques) {
    expect(Object.keys(technique.cells).join(',') === data.benchCols.join(','), `${technique.id} cell order/keys mismatch`);
    for (const state of Object.values(technique.cells)) expect(['hot','active','limited','none'].includes(state), `${technique.id} invalid state ${state}`);
    expect(Boolean(data.entities[technique.entity]), `${technique.id} entity does not resolve`);
  }
  for (const tool of data.tools) {
    expect(Boolean(data.chains[tool.chain]), `${tool.id} chain does not resolve`);
    expect(Boolean(data.sources[tool.sourceId]), `${tool.id} source does not resolve`);
    expect(Boolean(data.entities[tool.entity]), `${tool.id} entity does not resolve`);
  }
  for (const [id, term] of Object.entries(data.terms)) {
    expect(Boolean(data.sources[term.sourceId]), `${id} term source does not resolve`);
    expect(Boolean(data.entities[term.entity]), `${id} term entity does not resolve`);
  }
  for (const [id, entity] of Object.entries(data.entities)) for (const sourceId of entity.sourceIds) expect(Boolean(data.sources[sourceId]), `${id} entity source ${sourceId} does not resolve`);
  for (const [id, fact] of Object.entries(data.facts)) {
    expect(['confirmed','derived','inferred','documented-absence','not-documented','conflicted','volatile'].includes(fact.state), `${id} has invalid evidence state`);
    expect(Array.isArray(fact.sourceIds) && fact.sourceIds.length > 0, `${id} has no source`);
    if (fact.state === 'volatile') expect(/^\d{4}-\d{2}-\d{2}$/.test(fact.asOf || ''), `${id} volatile fact lacks asOf`);
    for (const sourceId of fact.sourceIds || []) {
      expect(Boolean(data.sources[sourceId]), `${id} source ${sourceId} does not resolve`);
      expect(data.sources[sourceId]?.claims?.includes(id), `${sourceId} reverse claims missing ${id}`);
    }
  }
  for (const [id, sourceRecord] of Object.entries(data.sources)) {
    let url;
    try { url = new URL(sourceRecord.url); } catch { failures.push(`${id} has invalid URL`); continue; }
    expect(url.protocol === 'https:', `${id} must use HTTPS`);
    for (const factId of sourceRecord.claims || []) expect(data.facts[factId]?.sourceIds?.includes(id), `${id} reverse claim ${factId} mismatches fact`);
  }
  const anchors = [...source.matchAll(/data-cue-anchor="([^"]+)"/g)].map(match => match[1]);
  for (const cue of data.cues) expect(anchors.includes(cue.anchor), `${cue.id} target ${cue.anchor} missing`);
}

const ids = [...source.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
unique(ids, 'HTML IDs');
expect((source.match(/<h1\b/g) || []).length === 1, 'exactly one h1 required');
expect((source.match(/class="compare-dock"/g) || []).length === 4, 'four compare docks required');
expect((source.match(/<noscript>/g) || []).length >= 2, 'head safety and semantic no-JavaScript mirrors required');
expect(source.includes('SCOPE is an independent educational project.'), 'independence notice missing');
expect(source.includes('OPEN THE ORIGINAL SOLANA//SCOPE'), 'return path to original Solana Scope missing');
const visibleSource = source.replace(dataMatch?.[0] || '', '');
for (const [label, pattern] of [['ROBINHOOD//SCOPE', /ROBINHOOD\/\/SCOPE/], ['HOOD//SCOPE', /(^|[^A-Z])HOOD\/\/SCOPE/], ['HOOD CHAIN', /(^|[^A-Z])HOOD CHAIN/], ['RHC', /\bRHC\b/]]) expect(!pattern.test(visibleSource), `prohibited visible shorthand ${label}`);
for (const banned of ['eth_sendRawTransaction','sendTransaction','signTransaction','signTypedData','privateKeyToAccount','walletClient','window.ethereum.request']) expect(!visibleSource.includes(banned), `prohibited wallet/submission API ${banned}`);
expect(!/sub-second finality/i.test(visibleSource), 'unqualified sub-second finality language found');

const target = new URL(pathToFileURL(resolve('robinhood/index.html')).href);
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(macChrome) ? macChrome : undefined) });
try {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:\/\//, route => route.abort('blockedbyclient'));
  await page.goto(target.href, { waitUntil: 'load' });
  await page.waitForTimeout(120);
  const initial = await page.evaluate(() => ({
    gridRows: document.querySelectorAll('.technique-grid tbody tr').length,
    toolCards: document.querySelectorAll('.tool-card').length,
    innerKeyVisible: document.body.innerText.includes('robinhood_chain'),
    runtime: ['openDock','closeDock','openGridCell','filterBench','restartFigure'].every(key => typeof window.SCOPE?.Runtime?.[key] === 'function'),
    terms: Object.keys(window.SCOPE?.data?.terms || {}).length,
    commandRecords: window.SCOPE?.Command?.records?.length || 0
  }));
  expect(initial.gridRows === 8, `browser grid has ${initial.gridRows}/8 rows`);
  expect(initial.toolCards === 7, `browser bench has ${initial.toolCards}/7 records`);
  expect(!initial.innerKeyVisible, 'private data key rendered into visible text');
  expect(initial.runtime, 'runtime bridge incomplete');
  expect(initial.terms === 24, 'runtime term count mismatch');
  expect(initial.commandRecords >= 100, `command index unexpectedly small: ${initial.commandRecords}`);

  await page.locator('.compare-dock[data-section="topology"] .dock-toggle').click();
  expect(await page.locator('.compare-dock[data-section="topology"] [role="tab"]').count() === 5, 'topology dock tab count mismatch');
  expect(await page.locator('.compare-dock[data-section="topology"] .compare-table tr').count() === 6, 'topology dock metric count mismatch');
  await page.locator('.technique-grid [data-technique="launch"][data-chain="robinhood_chain"]').click();
  expect(await page.locator('#detailPop').isVisible(), 'technique evidence detail did not open');
  await page.locator('#detailPop .detail-close').click();
  await page.evaluate(() => window.SCOPE.Router.open('methodology'));
  expect(await page.locator('#routeShell').isVisible(), 'methodology route did not open');
  expect((await page.locator('#routeTitle').textContent()) === 'What the instrument knows', 'methodology route title mismatch');
  await page.keyboard.press('Control+k');
  expect(await page.locator('#commandShell').isVisible(), 'command palette did not open');
  await page.locator('#commandInput').fill('Stock Tokens');
  expect(await page.locator('#commandResults [role="option"]').count() > 0, 'command search returned no Stock Token result');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  errors.forEach(error => failures.push(`page error: ${error}`));
  await context.close();
} finally { await browser.close(); }

if (failures.length) {
  console.error(`ROBINHOOD SCOPE FAIL (${failures.length})`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`ROBINHOOD SCOPE PASS — protected Solana checksum ${actualRoot.slice(0,12)}…; 5 channels, 8 surfaces, 4 docks, 6 systems, 8 techniques, 7 functions, 24 terms, 22 entities, 26 cues, and ${Object.keys(data.sources).length} sources validated.`);
}
