#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const widths = [360, 390, 430, 768, 1200];
const modes = [
  { name: 'reduced-motion', reducedMotion: 'reduce' },
  { name: 'cdn-blocked', reducedMotion: 'no-preference' },
  { name: 'storage-denied', reducedMotion: 'reduce', init: 'denied' },
  { name: 'corrupt-storage', reducedMotion: 'reduce', init: 'corrupt' },
  { name: 'js-off', reducedMotion: 'reduce', javaScriptEnabled: false }
];
const failures = [];
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(macChrome) ? macChrome : undefined) });
const targetUrl = new URL(pathToFileURL(resolve('multichain/robinhood/index.html')).href);
targetUrl.searchParams.set('scope-audit', '1');
const target = targetUrl.href;

try {
  for (const width of widths) for (const mode of modes) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: mode.reducedMotion, javaScriptEnabled: mode.javaScriptEnabled !== false });
    if (mode.init === 'denied') await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } });
    });
    if (mode.init === 'corrupt') await context.addInitScript(() => {
      const original = Storage.prototype.getItem;
      Storage.prototype.getItem = function(key) { return key.startsWith('scope.robinhood') ? '{bad-json' : original.call(this, key); };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https?:\/\//, route => route.abort('blockedbyclient'));
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForTimeout(100);
    if (mode.javaScriptEnabled !== false) await page.evaluate(async () => {
      for (const node of document.querySelectorAll('.reveal')) {
        node.scrollIntoView({ block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      scrollTo(0, 0);
    });
    if (mode.name === 'cdn-blocked') await page.waitForTimeout(950);
    const result = await page.evaluate(({ jsOff }) => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      visibleMain: [...document.querySelectorAll('.hero,.channel')].filter(node => node.getClientRects().length).length,
      hiddenReveal: [...document.querySelectorAll('.reveal')].filter(node => node.getClientRects().length && Number(getComputedStyle(node).opacity) === 0).length,
      clocks: ['SOFT','POSTED','FINAL','EXIT'].every(label => document.body.innerText.includes(label)),
      notice: document.body.innerText.includes('SCOPE is an independent educational project.'),
      staticTables: [...document.querySelectorAll('.static-mirrors table')].filter(node => node.getClientRects().length).length,
      staticGlossary: Boolean(document.querySelector('#noscriptGlossary')?.getClientRects().length),
      dynamicGrid: document.querySelectorAll('.technique-grid tbody tr').length,
      dynamicTools: document.querySelectorAll('.tool-card').length,
      authWarning: document.body.innerText.toLowerCase().includes('javascript is required to verify the access code'),
      jsOff
    }), { jsOff: mode.javaScriptEnabled === false });
    if (result.overflow > 1) failures.push(`${width}px ${mode.name}: ${result.overflow}px document overflow`);
    if (mode.javaScriptEnabled === false) {
      if (!result.authWarning || result.visibleMain !== 0 || result.staticTables !== 0) failures.push(`${width}px js-off: access gate did not fail closed ${JSON.stringify(result)}`);
    } else {
      if (result.visibleMain !== 6) failures.push(`${width}px ${mode.name}: ${result.visibleMain}/6 main sections visible`);
      if (result.hiddenReveal) failures.push(`${width}px ${mode.name}: ${result.hiddenReveal} authored blocks hidden`);
      if (!result.clocks || !result.notice) failures.push(`${width}px ${mode.name}: clocks or independence notice missing`);
      if (result.dynamicGrid !== 8 || result.dynamicTools !== 7) failures.push(`${width}px ${mode.name}: enhanced grid/bench incomplete`);
      if (mode.reducedMotion === 'reduce') {
        await page.locator('#readerToggle').click();
        const autoplay = await page.locator('#readerToggle').getAttribute('aria-pressed');
        if (autoplay !== 'false') failures.push(`${width}px ${mode.name}: reader autoplay active under reduced motion`);
      }
    }
    errors.forEach(error => failures.push(`${width}px ${mode.name} page error: ${error}`));
    await context.close();
  }
} finally { await browser.close(); }

if (failures.length) {
  console.error(`ROBINHOOD SCOPE DEGRADATION FAIL (${failures.length})`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exitCode = 1;
} else console.log(`ROBINHOOD SCOPE DEGRADATION PASS — ${widths.length * modes.length} cases across reduced motion, blocked CDN, denied/corrupt storage, and JavaScript-off locked failure.`);
