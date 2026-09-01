#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const pages = [
  { id: 'portal', path: 'index.html', h1: 'Multichain', nav: ['Scopes', 'Chains', 'Tools'] },
  { id: 'solana-scope', path: 'multichain/solana/index.html', h1: 'Solana,', nav: ['SCOPE', 'CHAINS', 'TOOLS'] },
  { id: 'solana-chains', path: 'multichain/solana/chains/index.html', h1: 'Solana', nav: ['Scope', 'Chains', 'Tools'] },
  { id: 'solana-tools', path: 'multichain/solana/tools/index.html', h1: 'Solana', nav: ['Scope', 'Chains', 'Tools'] },
  { id: 'robinhood-scope', path: 'multichain/robinhood/index.html', h1: 'Robinhood Chain', nav: ['SCOPE', 'CHAINS', 'TOOLS'] },
  { id: 'robinhood-chains', path: 'multichain/robinhood/chains/index.html', h1: 'Robinhood', nav: ['Scope', 'Chains', 'Tools'] },
  { id: 'robinhood-tools', path: 'multichain/robinhood/tools/index.html', h1: 'Robinhood', nav: ['Scope', 'Chains', 'Tools'] }
];

for (const page of pages) {
  check(existsSync(page.path), `${page.path} missing`);
  if (!existsSync(page.path)) continue;
  const source = readFileSync(page.path, 'utf8');
  check(/MULTICHAIN GANG|Multichain Gang|MULTICHAIN <b>GANG<\/b>/.test(source), `${page.id}: Multichain Gang identity missing`);
  check((source.match(/<h1\b/g) || []).length === 1, `${page.id}: exactly one authored h1 required`);
  check(source.includes('scope.access.v1') || source.includes('auth.js'), `${page.id}: access gate bootstrap missing`);
  for (const label of page.nav) check(source.includes(`>${label}<`) || source.includes(`>${label.toUpperCase()}<`), `${page.id}: ${label} route missing`);
}

const authSource = readFileSync('multichain/auth.js', 'utf8');
const solanaSource = readFileSync('multichain/solana/index.html', 'utf8');
const digest = '29e5686dacf7ef28c84317644bf7c395f9b11873f6732d0d0a20985f2c09f002';
check(authSource.includes(digest) && solanaSource.includes(digest), 'shared access digest differs between site shell and Solana Scope');
check(authSource.includes("location.protocol === 'file:'") && authSource.includes("location.hostname === 'localhost'"), 'shared audit bypass is not local-only');
check(readFileSync('index.html', 'utf8').includes('multichain/solana/') && readFileSync('index.html', 'utf8').includes('multichain/robinhood/'), 'portal does not link both instruments');
check(solanaSource.includes('href="chains/"') && solanaSource.includes('href="tools/"'), 'Solana Scope mode navigation incomplete');
const robinhoodSource = readFileSync('multichain/robinhood/index.html', 'utf8');
check(robinhoodSource.includes('href="chains/"') && robinhoodSource.includes('href="tools/"'), 'Robinhood Scope mode navigation incomplete');

const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(macChrome) ? macChrome : undefined) });
try {
  const lockedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const lockedPage = await lockedContext.newPage();
  await lockedPage.route(/^https?:\/\//, route => route.abort('blockedbyclient'));
  await lockedPage.goto(pathToFileURL(resolve('index.html')).href, { waitUntil: 'load' });
  const locked = await lockedPage.evaluate(() => ({ gate: document.getElementById('mgAccessGate')?.getClientRects().length > 0, unlocked: document.documentElement.hasAttribute('data-scope-unlocked'), portalVisible: getComputedStyle(document.querySelector('.portal-main')).visibility !== 'hidden' }));
  check(locked.gate && !locked.unlocked && !locked.portalVisible, `portal does not fail closed before unlock: ${JSON.stringify(locked)}`);
  await lockedContext.close();

  for (const width of [360, 768, 1200]) for (const spec of pages) {
    const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https?:\/\//, route => route.abort('blockedbyclient'));
    const target = new URL(pathToFileURL(resolve(spec.path)).href);
    target.searchParams.set('scope-audit', '1');
    await page.goto(target.href, { waitUntil: 'load' });
    await page.waitForTimeout(spec.id.endsWith('scope') ? 140 : 50);
    const result = await page.evaluate(({ heading, labels }) => {
      const navText = [...document.querySelectorAll('nav a')].filter(node => node.getClientRects().length).map(node => node.textContent.trim());
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        h1: document.querySelector('h1')?.innerText || '',
        labels: labels.filter(label => navText.some(text => text.toUpperCase() === label.toUpperCase() || text.toUpperCase().includes(label.toUpperCase()))),
        gateVisible: Boolean(document.querySelector('#mgAccessGate,#scopeAccessGate')?.getClientRects().length),
        unlocked: document.documentElement.hasAttribute('data-scope-unlocked'),
        heading
      };
    }, { heading: spec.h1, labels: spec.nav });
    check(result.overflow <= 1, `${width}px ${spec.id}: ${result.overflow}px horizontal overflow`);
    check(result.h1.toUpperCase().includes(spec.h1.toUpperCase()), `${width}px ${spec.id}: authored h1 mismatch (${result.h1.slice(0, 60)})`);
    check(result.labels.length === spec.nav.length, `${width}px ${spec.id}: visible mode navigation incomplete (${result.labels.join(', ')})`);
    check(result.unlocked, `${width}px ${spec.id}: local audit unlock failed`);
    errors.forEach(error => failures.push(`${width}px ${spec.id}: ${error}`));
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`MULTICHAIN GANG FAIL (${failures.length})`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`MULTICHAIN GANG PASS — ${pages.length} access-code-gated pages, two Scope instruments, four chain/tool directories, shared session gate, and 360/768/1200px route fit.`);
}
