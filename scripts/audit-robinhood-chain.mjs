#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { launchAuditBrowser, openAuditPage } from './audit-helpers.mjs';

const source = readFileSync('index.html', 'utf8');
const failures = [];
const RH = 'robinhood_chain';
const DISPLAY = 'Robinhood Chain';
const EXPECTED = {
  comparisonChains: 5,
  benchColumns: 6,
  techniques: 8,
  tools: 30,
  terms: 56,
  cues: 26,
  entities: 68
};

const comparator = {
  topology: {
    metrics: [
      'Arbitrum Nitro optimistic rollup; Ethereum DA/settlement; BoLD fraud proofs',
      'on-demand Nitro L2 blocks; sub-second sequencer soft confirmation',
      'single Robinhood-operated sequencer, FCFS by arrival',
      'anyone may run a full node; ~2 allowlisted BoLD validators (2026-08)',
      'sequencer WebSocket feed; compressed batches posted in Ethereum blobs',
      '8+ CPU cores, 64 GB RAM (128 GB recommended), NVMe, several TB, plus L1 execution + beacon endpoints'
    ],
    delta: 'Solana rotates ordering through scheduled leaders; Robinhood Chain compresses ordering into one sequencer and pushes hard settlement to Ethereum.'
  },
  txflow: {
    metrics: [
      'direct/provider submission to sequencer; no canonical public mempool documented',
      'ETH gas = L2 execution + L1 data; higher fee does not buy earlier order',
      'sequential EVM semantics on Nitro; one transaction may call/multicall atomically',
      'sub-second soft receipt',
      'batch posting in minutes; Ethereum finality ~13 min after posting',
      'EVM account nonce + chain ID; deadline is application-defined, no recent-blockhash expiry'
    ],
    delta: 'Solana prices urgency around hot accounts; Robinhood Chain charges for execution and Ethereum data while arrival time fixes the queue.'
  },
  mev: {
    metrics: [
      'sequencer/provider sees submitted order flow; no canonical public mempool documented; RFQ intent may remain offchain',
      'FCFS centralized sequencer; no priority gas auction or documented public bundle auction',
      'latency arb, backruns, liquidations, CEX–DEX arb, launch sniping; sandwiches require visible/leaked intent',
      'RFQ/intents, tight slippage and deadlines, limit prices, trusted submission paths; no official protection RPC documented'
    ],
    delta: 'Robinhood Chain removes the public gas auction, not ordering value: the edge moves to who reaches the sequencer—and who keeps intent private—first.'
  },
  latency: {
    metrics: [
      'sub-second sequencer soft confirmation; no fixed user-facing block interval',
      'yes—FCFS rewards low and low-variance arrival latency to sequencer/provider',
      'sequencer feed, managed WebSockets, full-node feed input, Chainlink Data Streams for market data',
      'sequencer receipt is the native soft confirmation; hard guarantee arrives after L1 publication/finality',
      'market-data → decision → sequencer path, feed gap recovery, and offchain hedge latency'
    ],
    delta: 'Solana’s race is leader-local and shred-driven; Robinhood Chain’s is sequencer-local, then waits minutes for Ethereum anchoring.'
  }
};

const techniqueContract = {
  'atomic-arb': {
    state: 'active', tool: 'robinhood-sequencer',
    note: 'Multiple EVM liquidity surfaces can be composed in one transaction. FCFS replaces the public gas auction with an arrival race.'
  },
  sandwich: {
    state: 'limited', tool: 'robinhood-orderflow',
    note: 'No canonical public mempool is documented and RFQ keeps quoting offchain, but leaked provider/solver flow or visible AMM intent can still be bracketed.'
  },
  liquidations: {
    state: 'active', tool: 'robinhood-streams',
    note: 'Lending/perps plus Chainlink feeds create keeper races; stale-feed and sequencer-up guards are part of the opportunity boundary.'
  },
  backrun: {
    state: 'active', tool: 'robinhood-feed',
    note: 'Bots can react after oracle updates or swaps; low-latency feed and sequencer arrival determine the first safe reaction.'
  },
  jit: {
    state: 'active', tool: 'robinhood-orderflow',
    note: 'Uniswap concentrated-liquidity deployments make short-lived LP placement possible; actual prevalence must be measured.'
  },
  cexdex: {
    state: 'active', tool: 'robinhood-orderflow',
    note: 'RWA/crypto venue divergence can be hedged against AMM, RFQ, propAMM, or order-book liquidity; 24/5 underlier feeds create session boundaries.'
  },
  spam: {
    state: 'active', tool: 'robinhood-sequencer',
    note: 'FCFS rewards transport speed; duplicate raw-tx submission may improve path redundancy, but fee bidding does not jump the queue and nonce conflicts can hurt reliability.'
  },
  snipe: {
    state: 'active', tool: 'uniswap-launcher',
    note: 'Permissionless ERC-20 and Uniswap launch infrastructure make launches possible; FCFS makes initialization/first-fill arrival time decisive unless an auction distributes first.'
  }
};

const toolContract = {
  'robinhood-sequencer': ['Ordering / sequencing', 'Robinhood Chain FCFS sequencer', 'neutral', 'One operator orders accepted transactions by arrival; gas does not buy position.'],
  'robinhood-orderflow': ['Order-flow auction / intents', 'UniswapX · 0x RFQ · 1inch Fusion · LiFi', 'protect', 'Quotes/intents stay offchain until settlement, reducing public preview while adding solver and route dependencies.'],
  'robinhood-feed': ['Fast data feed', 'Robinhood Chain sequencer feed · WebSockets', 'neutral', 'Ordered L2 updates arrive before a conventional indexer; consumers must detect gaps and backfill.'],
  'robinhood-fees': ['Priority market', 'FCFS gas policy', 'neutral', 'ETH pays L2 execution plus Ethereum data; a larger tip does not move the transaction ahead.'],
  'robinhood-node': ['Node/client edge', 'Nitro full node · ArbOS · L1 blob reader', 'neutral', 'Independent reads require L2 state plus Ethereum execution and beacon/blob access.'],
  'robinhood-streams': ['Fast data feed', 'Chainlink Data Streams', 'neutral', 'Signed sub-second offchain market reports can be verified onchain for perps, options, and liquidations.'],
  'uniswap-launcher': ['Launch & bootstrap', 'Uniswap Liquidity Launcher', 'neutral', 'A continuous-clearing auction distributes tokens, then migrates proceeds and inventory into a Uniswap v4 pool.']
};

const termIds = [
  'arbitrum-nitro',
  'sequencer-soft-confirmation',
  'bold-fraud-proofs',
  'l1-data-fee',
  'erc-8056',
  'corporate-action-multiplier',
  'sequencer-uptime-feed'
];

const entityContract = {
  'robinhood-chain': 'chain',
  'robinhood-sequencer': 'tool',
  'robinhood-feed': 'tool',
  'robinhood-orderflow': 'tool',
  'robinhood-fees': 'tool',
  'robinhood-node': 'tool',
  'robinhood-streams': 'tool',
  'uniswap-launcher': 'tool',
  ...Object.fromEntries(termIds.map(id => [id, 'term']))
};

const finalityContract = [
  { id: 'soft', label: 'SOFT', timing: '<1000 ms typ.' },
  { id: 'posted', label: 'POSTED', timing: 'minutes typ.' },
  { id: 'final', label: 'FINAL', timing: '~13 min after post · 2026-08' }
];

const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const withoutMarkup = value => normalize(String(value ?? '').replace(/<[^>]*>/g, ''));
const withoutArrow = value => normalize(value).replace(/\s*↗$/, '');
const same = (actual, expected, label) => {
  if (normalize(actual) !== normalize(expected)) failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};
const hasExactKeys = (object, expected, label) => {
  const actual = Object.keys(object || {}).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) failures.push(`${label}: keys ${actual.join(', ') || '(none)'}; expected ${wanted.join(', ')}`);
};
const unique = (items, label) => {
  const duplicates = items.filter((item, index) => items.indexOf(item) !== index);
  if (duplicates.length) failures.push(`${label}: duplicate IDs ${[...new Set(duplicates)].join(', ')}`);
};
const validHttpUrl = value => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
};

let data = null;
const dataMatch = source.match(/<script\s+type="application\/json"\s+id="chainData">([\s\S]*?)<\/script>/);
if (!dataMatch) failures.push('#chainData script is missing');
else {
  try { data = JSON.parse(dataMatch[1]); } catch (error) { failures.push(`#chainData JSON does not parse: ${error.message}`); }
}

if (data) {
  const counts = {
    comparisonChains: data.chainOrder?.length,
    benchColumns: data.benchCols?.length,
    techniques: data.techniques?.length,
    tools: data.tools?.length,
    terms: Object.keys(data.terms || {}).length,
    cues: data.cues?.length,
    entities: Object.keys(data.entities || {}).length
  };
  for (const [key, expected] of Object.entries(EXPECTED)) {
    if (counts[key] !== expected) failures.push(`${key} count is ${counts[key] ?? 'missing'}; expected ${expected}`);
  }

  unique(data.chainOrder || [], 'chainOrder');
  unique(data.benchCols || [], 'benchCols');
  unique((data.techniques || []).map(item => item.id), 'techniques');
  unique((data.tools || []).map(item => item.id), 'tools');
  unique((data.cues || []).map(item => item.id), 'cues');
  if (data.chainOrder?.at(-1) !== RH) failures.push(`chainOrder must end with the internal key ${RH}`);
  if (data.benchCols?.at(-1) !== RH) failures.push(`benchCols must end with the internal key ${RH}`);
  for (const chain of data.chainOrder || []) if (!data.chains?.[chain]) failures.push(`chainOrder references missing chain ${chain}`);
  for (const chain of data.benchCols || []) if (chain !== 'sol' && !data.chains?.[chain]) failures.push(`benchCols references missing chain ${chain}`);

  const chain = data.chains?.[RH];
  if (!chain) failures.push(`${RH} chain record is missing`);
  else {
    same(chain.name, DISPLAY, `${RH}.name`);
    same(chain.label, DISPLAY, `${RH}.label`);
    same(chain.color, '#CCFF00', `${RH}.color`);
    if (chain.glyph !== null) failures.push(`${RH}.glyph must be null; invented compact glyphs are prohibited`);
    same(chain.windowKind, 'soft-confirmation', `${RH}.windowKind`);
    if (chain.windowMs !== 1000) failures.push(`${RH}.windowMs must remain the 1000 ms visualization ceiling`);
    if (chain.observed !== false) failures.push(`${RH}.observed must be false until a measured dataset exists`);
    same(chain.dated, '2026-08', `${RH}.dated`);
    const diagrams = { topology: 'rollup-stack', txflow: 'sequencer-ladder', mev: 'fcfs-race', latency: 'finality-ladder' };
    for (const [section, diagram] of Object.entries(diagrams)) same(chain.diagrams?.[section], diagram, `${RH}.diagrams.${section}`);
    for (const [section, expected] of Object.entries(comparator)) {
      const record = chain[section];
      if (!record) { failures.push(`${RH}.${section} is missing`); continue; }
      if (record.metrics?.length !== data.metricKeys?.[section]?.length) failures.push(`${RH}.${section}.metrics length does not match metricKeys`);
      expected.metrics.forEach((metric, index) => same(record.metrics?.[index], metric, `${RH}.${section}.${data.metricKeys?.[section]?.[index] || index}`));
      same(record.delta, expected.delta, `${RH}.${section}.delta`);
      if (!Array.isArray(record.adv) || record.adv.length !== expected.metrics.length || record.adv.some(value => !['', 'sol', 'chain'].includes(value))) {
        failures.push(`${RH}.${section}.adv must align with every metric and use only sol/chain/empty states`);
      }
    }
    if (JSON.stringify(chain.latency?.finalityStages) !== JSON.stringify(finalityContract)) failures.push(`${RH}.latency.finalityStages must preserve distinct SOFT/POSTED/FINAL stages and timing labels`);
    same(chain.latency?.bridgeWithdrawal, '~7 days · 2026-08', `${RH}.latency.bridgeWithdrawal`);
  }

  const toolsById = new Map((data.tools || []).map(tool => [tool.id, tool]));
  const techniquesById = new Map((data.techniques || []).map(technique => [technique.id, technique]));
  for (const technique of data.techniques || []) {
    hasExactKeys(technique.cells, data.benchCols || [], `technique ${technique.id}.cells`);
    hasExactKeys(technique.notes, data.benchCols || [], `technique ${technique.id}.notes`);
    for (const [chainId, state] of Object.entries(technique.cells || {})) if (!['hot', 'active', 'limited', 'none'].includes(state)) failures.push(`technique ${technique.id}.cells.${chainId} has invalid state ${state}`);
    for (const [chainId, note] of Object.entries(technique.notes || {})) if (!normalize(note)) failures.push(`technique ${technique.id}.notes.${chainId} is empty`);
    for (const [chainId, toolId] of Object.entries(technique.tools || {})) {
      if (!data.benchCols?.includes(chainId)) failures.push(`technique ${technique.id} has tool link for unknown chain ${chainId}`);
      if (!toolsById.has(toolId)) failures.push(`technique ${technique.id}.${chainId} references missing tool ${toolId}`);
    }
    const expected = techniqueContract[technique.id];
    if (!expected) failures.push(`unexpected technique ID ${technique.id}`);
    else {
      same(technique.cells?.[RH], expected.state, `technique ${technique.id}.${RH} state`);
      same(technique.notes?.[RH], expected.note, `technique ${technique.id}.${RH} note`);
      same(technique.tools?.[RH], expected.tool, `technique ${technique.id}.${RH} tool link`);
    }
  }
  for (const id of Object.keys(techniqueContract)) if (!techniquesById.has(id)) failures.push(`required technique ${id} is missing`);

  if (data.toolFns?.includes('Ordering auction')) failures.push('legacy tool function “Ordering auction” was not renamed');
  for (const fn of ['Ordering / sequencing', 'Launch & bootstrap']) if (!data.toolFns?.includes(fn)) failures.push(`toolFns is missing ${fn}`);
  for (const tool of data.tools || []) {
    if (!data.toolFns?.includes(tool.fn)) failures.push(`tool ${tool.id} references missing function ${tool.fn}`);
    for (const chainId of tool.chains || []) if (!data.benchCols?.includes(chainId)) failures.push(`tool ${tool.id} references missing chain ${chainId}`);
    for (const techniqueId of tool.links_technique || []) if (!techniquesById.has(techniqueId)) failures.push(`tool ${tool.id} references missing technique ${techniqueId}`);
  }
  for (const [id, [fn, name, stance, blurb]] of Object.entries(toolContract)) {
    const tool = toolsById.get(id);
    if (!tool) { failures.push(`required tool ${id} is missing`); continue; }
    same(tool.fn, fn, `tool ${id}.fn`);
    same(tool.name, name, `tool ${id}.name`);
    same(tool.stance, stance, `tool ${id}.stance`);
    same(tool.blurb, blurb, `tool ${id}.blurb`);
    if (!tool.chains?.includes(RH)) failures.push(`tool ${id} is not tagged for ${RH}`);
  }

  for (const [id, term] of Object.entries(data.terms || {})) {
    if (!term.term || !Array.isArray(term.aliases) || !term.aliases.length || !term.def || !term.purpose) failures.push(`term ${id} is structurally incomplete`);
    if (!term.links?.length || term.links.some(link => !validHttpUrl(link.url))) failures.push(`term ${id} needs valid primary links`);
    if (term.entity && !data.entities?.[term.entity]) failures.push(`term ${id} references missing entity ${term.entity}`);
  }
  for (const id of termIds) {
    const term = data.terms?.[id];
    if (!term) failures.push(`required Robinhood Chain term ${id} is missing`);
    else same(term.entity, id, `term ${id}.entity`);
  }

  for (const [id, entity] of Object.entries(data.entities || {})) {
    if (!entity.name || !entity.kind || !entity.tagline || !entity.links?.length || !validHttpUrl(entity.links[0].url)) failures.push(`entity ${id} is structurally incomplete`);
    for (const chainId of entity.chains || []) if (chainId !== 'all' && !data.benchCols?.includes(chainId)) failures.push(`entity ${id} references missing chain ${chainId}`);
    for (const relatedId of entity.related || []) if (!data.entities?.[relatedId]) failures.push(`entity ${id} has dangling related entity ${relatedId}`);
    if (entity.term && !data.terms?.[entity.term]) failures.push(`entity ${id} references missing term ${entity.term}`);
  }
  for (const [id, kind] of Object.entries(entityContract)) {
    const entity = data.entities?.[id];
    if (!entity) { failures.push(`required entity ${id} is missing`); continue; }
    same(entity.kind, kind, `entity ${id}.kind`);
    if (kind === 'term') same(entity.term, id, `entity ${id}.term`);
  }
  same(data.entities?.['robinhood-chain']?.name, DISPLAY, 'robinhood-chain entity name');

  const cueContract = {
    'ch1-robinhood-finality': {
      ch: 'ch1', anchor: ".dock-mount[data-ch='ch1']", action: `open-dock:${RH}`,
      note: 'Fast receipt, slow anchor: the sequencer commits first; Ethereum makes the order hard later.'
    },
    'ch5-robinhood-launch': {
      ch: 'ch5', anchor: `#gridPanel .tcell[data-tech='snipe'][data-chain='${RH}']`, action: 'cascade',
      note: 'FCFS makes a fixed first fill a network race; an auction distributes before the pool becomes the price.'
    }
  };
  for (const [id, expected] of Object.entries(cueContract)) {
    const cue = (data.cues || []).find(item => item.id === id);
    if (!cue) { failures.push(`required cue ${id} is missing`); continue; }
    for (const field of ['ch', 'anchor', 'action', 'note']) same(cue[field], expected[field], `cue ${id}.${field}`);
    if (id === 'ch5-robinhood-launch' && cue.activate !== true) failures.push(`${id} must activate its launch cell`);
  }
}

const walkFiles = directory => readdirSync(directory).flatMap(name => {
  const path = join(directory, name);
  return statSync(path).isDirectory() ? walkFiles(path) : [path];
});
const prohibitedProductionTerms = [
  'eth_sendRawTransaction',
  'walletClient',
  'privateKeyToAccount',
  'signTransaction',
  'sendTransaction',
  'createWalletClient',
  'writeContract',
  'deployContract',
  'sendRawTransaction',
  'privateKey',
  'mnemonic',
  'signer'
];
for (const path of walkFiles('journal/src')) {
  const content = readFileSync(path, 'utf8');
  for (const term of prohibitedProductionTerms) if (content.includes(term)) failures.push(`${path} contains prohibited wallet/submission term ${term}`);
}

const shorthandPatterns = [
  [/\brobinhood_chain\b/i, 'internal key robinhood_chain'],
  [/\bRHC\b/, 'RHC'],
  [/\bRH\s*Chain\b/i, 'RH Chain'],
  [/\bHood\s*Chain\b/i, 'Hood Chain'],
  [/\$HOOD\b|\bHOOD\s+ticker\b/i, 'public-company ticker shorthand']
];
const auditRenderedLanguage = (text, label) => {
  for (const [pattern, name] of shorthandPatterns) if (pattern.test(text)) failures.push(`${label} renders prohibited shorthand: ${name}`);
};

if (data) {
  const structuredDisplayCopy = [
    data.sol?.name,
    ...Object.values(data.chains || {}).flatMap(chain => [
      chain.name, chain.label,
      ...['topology', 'txflow', 'mev', 'latency'].flatMap(section => [chain[section]?.delta, ...(chain[section]?.metrics || [])])
    ]),
    ...(data.techniques || []).flatMap(technique => [technique.name, technique.short, technique.def, ...Object.values(technique.notes || {})]),
    ...(data.tools || []).flatMap(tool => [tool.fn, tool.name, tool.blurb]),
    ...Object.values(data.terms || {}).flatMap(term => [term.term, ...(term.aliases || []), term.def, term.purpose, ...(term.links || []).map(link => link.label)]),
    ...(data.cues || []).flatMap(cue => [cue.title, cue.note]),
    ...Object.values(data.entities || {}).flatMap(entity => [
      entity.name, entity.tagline, ...(entity.body || []), ...(entity.how?.steps || []),
      ...(entity.signals || []).flatMap(signal => [signal.k, signal.v]),
      ...(entity.links || []).map(link => link.label)
    ])
  ].filter(Boolean).join('\n');
  auditRenderedLanguage(structuredDisplayCopy, '#chainData display copy');
}

async function auditBrowser() {
  let browser;
  try { browser = await launchAuditBrowser(); }
  catch (error) { failures.push(`browser audit could not launch: ${normalize(error.message).slice(0, 240)}`); return; }
  try {
    const { context, page, errors } = await openAuditPage(browser, 1200);
    const runtime = await page.evaluate(({ rh, display }) => {
      const norm = value => String(value ?? '').replace(/\s+/g, ' ').trim();
      const accessible = Array.from(document.querySelectorAll('[aria-label],[title],[alt],[placeholder]'))
        .flatMap(element => ['aria-label', 'title', 'alt', 'placeholder'].map(attribute => element.getAttribute(attribute)).filter(Boolean));
      const docks = ['ch1', 'ch2', 'ch3', 'ch4'].map(ch => {
        const root = document.getElementById(ch);
        const chip = root?.querySelector(`.chip[data-chain="${rh}"]`);
        chip?.click();
        const dock = root?.querySelector('.dock');
        return {
          ch,
          chipText: norm(chip?.textContent),
          chipCount: dock?.querySelectorAll('.dock-chips .chip').length,
          active: dock?.dataset.active,
          metrics: Array.from(dock?.querySelectorAll('.dock-col-chain .dm-v') || [], element => norm(element.textContent)),
          delta: norm(dock?.querySelector('.dock-delta')?.textContent),
          miniText: norm(dock?.querySelector(`.chain-minis [data-chain="${rh}"]:not([hidden])`)?.textContent),
          panelText: norm(dock?.querySelector('.dock-col-chain')?.textContent),
          titles: Array.from(dock?.querySelectorAll('[title],[aria-label]') || [], element => element.getAttribute('title') || element.getAttribute('aria-label'))
        };
      });
      const techniquePopovers = Array.from(document.querySelectorAll(`.tcell[data-chain="${rh}"]`), button => {
        button.click();
        const pop = document.querySelector('.tpop');
        return {
          id: button.dataset.tech,
          note: norm(Array.from(pop?.querySelectorAll('p') || []).find(p => !p.classList.contains('tp-def'))?.textContent),
          tool: pop?.querySelector('.tp-tool')?.dataset.tool || null
        };
      });
      const data = JSON.parse(document.getElementById('chainData').textContent);
      const cueAnchors = (data.cues || []).filter(cue => cue.id.includes('robinhood')).map(cue => ({ id: cue.id, resolves: !!document.querySelector(cue.anchor) }));
      return {
        rendered: `${document.body.innerText}\n${accessible.join('\n')}`,
        docks,
        techniquePopovers,
        cueAnchors,
        toolCards: document.querySelectorAll('.tool-card').length,
        rhToolCards: document.querySelectorAll(`.tool-card[data-chains~="${rh}"]`).length,
        rhFilter: norm(document.querySelector(`.chip-f[data-v="${rh}"]`)?.textContent),
        gridHeaders: document.querySelectorAll('.tgrid thead th').length,
        gridRows: Array.from(document.querySelectorAll('.tgrid tbody tr'), row => row.querySelectorAll('.tcell').length),
        rhHeader: {
          text: norm(document.querySelector(`.tgrid thead [data-chain="${rh}"]`)?.textContent || Array.from(document.querySelectorAll('.tgrid thead th')).find(th => norm(th.textContent).includes(display))?.textContent),
          glyph: norm(document.querySelector(`.tgrid thead [data-chain="${rh}"] .th-g`)?.textContent),
          signalLabel: document.querySelector(`.tgrid thead [data-chain="${rh}"] .th-signal`)?.getAttribute('aria-label') || ''
        },
        invalidDoors: Array.from(document.querySelectorAll('[data-entity-id]'), element => element.dataset.entityId).filter(id => id && !data.entities[id])
      };
    }, { rh: RH, display: DISPLAY });

    auditRenderedLanguage(runtime.rendered, 'JavaScript-on page');
    for (const result of runtime.docks) {
      const section = data?.sectionOf?.[result.ch];
      if (result.chipCount !== EXPECTED.comparisonChains) failures.push(`${result.ch} renders ${result.chipCount} comparator chips; expected ${EXPECTED.comparisonChains}`);
      same(result.chipText.replace(/^vs\s*/i, ''), DISPLAY, `${result.ch} comparator chip display name`);
      same(result.active, RH, `${result.ch} active comparator key`);
      (comparator[section]?.metrics || []).forEach((metric, index) => same(result.metrics[index], metric, `${result.ch} rendered metric ${index}`));
      same(result.delta, comparator[section]?.delta, `${result.ch} rendered delta`);
    }
    const latencyDock = runtime.docks.find(dock => dock.ch === 'ch4');
    for (const marker of ['SOFT', 'POSTED', 'FINAL']) if (!latencyDock?.miniText.includes(marker) && !latencyDock?.panelText.includes(marker)) failures.push(`CH-04 finality ladder does not render ${marker}`);
    const finalityText = `${latencyDock?.miniText} ${latencyDock?.panelText}`;
    if (!/\b(BRIDGE|WITHDRAWAL)\b/i.test(finalityText) || !/~?7\s*days/i.test(finalityText)) failures.push('CH-04 finality ladder does not render the distinct ~7-day bridge withdrawal clock');
    if (!latencyDock?.titles.some(title => /typical soft-confirmation bound shown/i.test(title))) failures.push('CH-04 soft-confirmation visualization lacks its required semantics tooltip');
    if (/blocks?\s*per\s*second|\bbps\b/i.test(finalityText)) failures.push('Robinhood Chain soft-confirmation ceiling is rendered as block throughput');

    for (const popover of runtime.techniquePopovers) {
      const expected = techniqueContract[popover.id];
      if (!expected) failures.push(`rendered unexpected Robinhood Chain technique ${popover.id}`);
      else {
        same(popover.note, expected.note, `rendered technique ${popover.id} note`);
        same(popover.tool, expected.tool, `rendered technique ${popover.id} tool link`);
      }
    }
    if (runtime.techniquePopovers.length !== EXPECTED.techniques) failures.push(`only ${runtime.techniquePopovers.length}/${EXPECTED.techniques} Robinhood Chain technique popovers render`);
    if (runtime.toolCards !== EXPECTED.tools) failures.push(`runtime tool bench renders ${runtime.toolCards}/${EXPECTED.tools} cards`);
    if (runtime.rhToolCards !== Object.keys(toolContract).length) failures.push(`runtime tool bench renders ${runtime.rhToolCards}/${Object.keys(toolContract).length} Robinhood Chain cards`);
    same(runtime.rhFilter, DISPLAY, 'Robinhood Chain tool filter display name');
    if (runtime.gridHeaders !== EXPECTED.benchColumns + 1 || runtime.gridRows.some(count => count !== EXPECTED.benchColumns)) failures.push(`runtime technique grid is not one label plus ${EXPECTED.benchColumns} chain columns`);
    same(runtime.rhHeader.text, DISPLAY, 'technique-grid Robinhood Chain header');
    if (runtime.rhHeader.glyph) failures.push(`technique-grid Robinhood Chain header renders invented glyph ${JSON.stringify(runtime.rhHeader.glyph)}`);
    same(runtime.rhHeader.signalLabel, DISPLAY, 'technique-grid Robinhood Chain signal aria-label');
    for (const cue of runtime.cueAnchors) if (!cue.resolves) failures.push(`cue ${cue.id} anchor does not resolve after rendering`);
    if (runtime.invalidDoors.length) failures.push(`rendered entity doors have dangling IDs: ${[...new Set(runtime.invalidDoors)].join(', ')}`);
    errors.forEach(error => failures.push(`1200px page error: ${error}`));
    await context.close();

    for (const width of [360, 390, 430, 768, 1200]) {
      const { context: responsiveContext, page: responsivePage, errors: responsiveErrors } = await openAuditPage(browser, width);
      const layout = await responsivePage.evaluate(({ expectedCols, rh }) => {
        const table = document.querySelector('.tgrid');
        const panel = document.getElementById('gridPanel');
        const firstRow = table?.querySelector('tbody tr');
        const rowLabelWidth = firstRow?.querySelector('.th-label')?.getBoundingClientRect().width || 0;
        const chainWidths = Array.from(firstRow?.querySelectorAll('.tcell') || [], cell => cell.getBoundingClientRect().width);
        const rhHeader = table ? Array.from(table.querySelectorAll('thead th')).find(th => th.querySelector(`[data-chain="${rh}"]`) || th.textContent.includes('Robinhood Chain')) : null;
        return {
          documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          panelOverflow: panel ? panel.scrollWidth - panel.clientWidth : 0,
          columns: firstRow?.querySelectorAll('.tcell').length || 0,
          rowLabelWidth,
          maxChainWidth: Math.max(0, ...chainWidths),
          rhHeaderVisible: !!rhHeader?.getClientRects().length,
          expectedCols
        };
      }, { expectedCols: EXPECTED.benchColumns, rh: RH });
      if (layout.documentOverflow > 1) failures.push(`${width}px Robinhood layout has ${layout.documentOverflow}px document overflow`);
      if (layout.columns !== layout.expectedCols) failures.push(`${width}px technique grid renders ${layout.columns}/${layout.expectedCols} chain cells`);
      if (!layout.rhHeaderVisible) failures.push(`${width}px Robinhood Chain grid header is not visible`);
      if (width <= 430 && layout.panelOverflow > 1) failures.push(`${width}px technique grid overflows its panel by ${layout.panelOverflow}px`);
      if (width <= 480 && layout.rowLabelWidth > 106) failures.push(`${width}px technique row label is ${layout.rowLabelWidth.toFixed(1)}px; mobile hook target is 104px`);
      if (width <= 480 && layout.maxChainWidth > 34) failures.push(`${width}px technique state cell is ${layout.maxChainWidth.toFixed(1)}px; mobile hook target is 32px`);
      responsiveErrors.forEach(error => failures.push(`${width}px page error: ${error}`));
      await responsiveContext.close();
    }

    const { context: noJsContext, page: noJsPage, errors: noJsErrors } = await openAuditPage(browser, 1200, { javaScriptEnabled: false });
    const noJs = await noJsPage.evaluate(({ rh, display }) => {
      const norm = value => String(value ?? '').replace(/\s+/g, ' ').trim();
      const table = element => {
        const rows = Array.from(element?.querySelectorAll('tr') || []);
        return {
          headers: Array.from(rows[0]?.querySelectorAll('th,td') || [], cell => norm(cell.textContent)),
          rows: rows.slice(1).map(row => Array.from(row.querySelectorAll('th,td'), cell => norm(cell.textContent)))
        };
      };
      const docks = ['ch1', 'ch2', 'ch3', 'ch4'].map(ch => {
        const fallback = document.querySelector(`#${ch} .dock-fallback`);
        return { ch, heading: norm(fallback?.querySelector('h3')?.textContent), comparison: table(fallback?.querySelector('table')), deltas: Array.from(fallback?.querySelectorAll('li') || [], li => norm(li.textContent)) };
      });
      const ch5Tables = Array.from(document.querySelectorAll('#ch5 .dock-fallback table'), table);
      const glossary = Array.from(document.querySelectorAll('.glossary-noscript tbody tr'), row => {
        const cells = row.querySelectorAll('td'); const link = cells[2]?.querySelector('a');
        return { term: norm(cells[0]?.textContent), def: norm(cells[1]?.textContent), linkText: norm(link?.textContent), href: link?.href || '' };
      });
      const entities = Array.from(document.querySelectorAll('.entity-noscript tbody tr'), row => {
        const cells = row.querySelectorAll('td'); const link = cells[3]?.querySelector('a');
        return { name: norm(cells[0]?.textContent), kind: norm(cells[1]?.textContent), tagline: norm(cells[2]?.textContent), linkText: norm(link?.textContent), href: link?.href || '' };
      });
      const accessible = Array.from(document.querySelectorAll('[aria-label],[title],[alt]')).flatMap(element => ['aria-label', 'title', 'alt'].map(attribute => element.getAttribute(attribute)).filter(Boolean));
      return { rendered: `${document.body.innerText}\n${accessible.join('\n')}`, docks, ch5Tables, glossary, entities, rh, display };
    }, { rh: RH, display: DISPLAY });
    auditRenderedLanguage(noJs.rendered, 'JavaScript-off page');

    for (const fallback of noJs.docks) {
      const section = data?.sectionOf?.[fallback.ch];
      const rhIndex = fallback.comparison.headers.indexOf(DISPLAY);
      if (rhIndex < 0) { failures.push(`${fallback.ch} no-JavaScript table omits ${DISPLAY}`); continue; }
      if (!fallback.heading.includes(DISPLAY)) failures.push(`${fallback.ch} no-JavaScript heading omits ${DISPLAY}`);
      const expectedKeys = data?.metricKeys?.[section] || [];
      expectedKeys.forEach((key, index) => {
        const row = fallback.comparison.rows[index];
        same(row?.[0], key, `${fallback.ch} no-JavaScript metric key ${index}`);
        same(row?.[rhIndex], comparator[section]?.metrics[index], `${fallback.ch} no-JavaScript Robinhood metric ${key}`);
      });
      const delta = fallback.deltas.find(item => item.startsWith(DISPLAY));
      same(delta?.replace(/^Robinhood Chain\s*[—-]\s*/, ''), comparator[section]?.delta, `${fallback.ch} no-JavaScript Robinhood delta`);
    }

    const [techniqueTable, toolTable] = noJs.ch5Tables;
    const techniqueRhIndex = techniqueTable?.headers.indexOf(DISPLAY) ?? -1;
    if (techniqueRhIndex < 0) failures.push(`no-JavaScript technique table omits ${DISPLAY}`);
    else (data?.techniques || []).forEach((technique, index) => same(techniqueTable.rows[index]?.[techniqueRhIndex], techniqueContract[technique.id]?.state, `no-JavaScript technique ${technique.id}`));
    if (techniqueTable?.headers.length !== EXPECTED.benchColumns + 1 || techniqueTable?.rows.length !== EXPECTED.techniques) failures.push('no-JavaScript technique table does not have the expected six-chain/eight-technique shape');

    const toolRhIndex = toolTable?.headers.indexOf(DISPLAY) ?? -1;
    if (toolRhIndex < 0) failures.push(`no-JavaScript tool table omits ${DISPLAY}`);
    if (toolTable?.rows.length !== data?.toolFns?.length) failures.push(`no-JavaScript tool table has ${toolTable?.rows.length || 0}/${data?.toolFns?.length || 0} function rows`);
    for (const [id, [fn, name]] of Object.entries(toolContract)) {
      const row = toolTable?.rows.find(candidate => candidate[0] === fn);
      if (!row) failures.push(`no-JavaScript tool table omits function ${fn}`);
      else if (toolRhIndex >= 0 && !row[toolRhIndex]?.includes(name)) failures.push(`no-JavaScript ${fn} cell omits tool ${id} (${name})`);
    }

    if (noJs.glossary.length !== EXPECTED.terms) failures.push(`no-JavaScript glossary has ${noJs.glossary.length}/${EXPECTED.terms} rows`);
    const glossaryByName = new Map(noJs.glossary.map(row => [row.term, row]));
    for (const [id, term] of Object.entries(data?.terms || {})) {
      const row = glossaryByName.get(normalize(term.term));
      if (!row) { failures.push(`no-JavaScript glossary omits term ${id}`); continue; }
      same(row.def, term.def, `no-JavaScript term ${id} definition`);
      same(row.href, term.links?.[0]?.url, `no-JavaScript term ${id} primary URL`);
      if (termIds.includes(id)) same(withoutArrow(row.linkText), term.links?.[0]?.label, `no-JavaScript term ${id} primary label`);
    }

    if (noJs.entities.length !== EXPECTED.entities) failures.push(`no-JavaScript entity index has ${noJs.entities.length}/${EXPECTED.entities} rows`);
    for (const [[id, entity], row] of Object.entries(data?.entities || {}).map((entry, index) => [entry, noJs.entities[index]])) {
      if (!row) { failures.push(`no-JavaScript entity index omits ${id}`); continue; }
      same(row.name, entity.name, `no-JavaScript entity ${id} name/order`);
      same(row.kind, entity.kind, `no-JavaScript entity ${id} kind`);
      same(row.tagline, withoutMarkup(entity.tagline), `no-JavaScript entity ${id} tagline`);
      same(row.href, entity.links?.[0]?.url, `no-JavaScript entity ${id} primary URL`);
      same(withoutArrow(row.linkText), entity.links?.[0]?.label, `no-JavaScript entity ${id} primary label`);
    }
    noJsErrors.forEach(error => failures.push(`JavaScript-off page error: ${error}`));
    await noJsContext.close();
  } finally {
    await browser.close();
  }
}

await auditBrowser();

if (failures.length) {
  console.error(`ROBINHOOD CHAIN FAIL (${failures.length})`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('ROBINHOOD CHAIN PASS — 5 comparator chains / 6 bench columns / 8 techniques / 30 tools / 56 terms / 26 cues / 68 entities; comparator, finality, window semantics, brand, mirrors, responsive hooks, relations, and journal read-only safety pass.');
