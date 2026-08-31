#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const widths = [320, 360, 390, 430, 768, 1200, 1440];
const failures = [];
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(macChrome) ? macChrome : undefined) });
const target = pathToFileURL(resolve('robinhood/index.html')).href;

try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https?:\/\//, route => route.abort('blockedbyclient'));
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForTimeout(100);
    const initial = await page.evaluate(() => {
      const controls = [...document.querySelectorAll('button:not([hidden]), select:not([hidden]), .primary-action, .text-action, .route-link')].filter(node => node.getClientRects().length);
      const small = controls.map(node => ({ label: node.getAttribute('aria-label') || node.textContent.trim().slice(0,40), rect: node.getBoundingClientRect().toJSON() })).filter(item => item.rect.width < 43 || item.rect.height < 43);
      const sections = [...document.querySelectorAll('.hero,.channel')].filter(node => node.getClientRects().length).length;
      const figures = [...document.querySelectorAll('figure')].filter(node => node.getClientRects().length).map(node => ({ id: node.id, left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right }));
      const oversizedChrome = [...document.querySelectorAll('.clockbar button')].filter(node => node.getClientRects().length && node.getBoundingClientRect().width > 240).map(node => ({ label: node.textContent.trim(), width: node.getBoundingClientRect().width }));
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, small, sections, figures, oversizedChrome };
    });
    if (initial.overflow > 1) failures.push(`${width}px: ${initial.overflow}px document overflow`);
    if (initial.sections !== 6) failures.push(`${width}px: ${initial.sections}/6 main sections visible`);
    initial.small.forEach(item => failures.push(`${width}px: undersized control ${item.label} (${item.rect.width.toFixed(1)}×${item.rect.height.toFixed(1)})`));
    initial.oversizedChrome.forEach(item => failures.push(`${width}px: oversized fixed-header control ${item.label} (${item.width.toFixed(1)}px)`));
    initial.figures.filter(figure => figure.left < -1 || figure.right > width + 1).forEach(figure => failures.push(`${width}px: ${figure.id} escapes viewport (${figure.left.toFixed(1)}..${figure.right.toFixed(1)})`));

    await page.locator('.compare-dock[data-section="latency"] .dock-toggle').click();
    const dockOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (dockOverflow > 1) failures.push(`${width}px: open compare dock causes ${dockOverflow}px overflow`);
    await page.locator('.technique-grid [data-technique="atomic-arb"][data-chain="robinhood_chain"]').click();
    const detail = await page.locator('#detailPop').boundingBox();
    if (!detail || detail.x < -1 || detail.x + detail.width > width + 1 || detail.y < -1 || detail.y + detail.height > (width < 700 ? 844 : 900) + 1) failures.push(`${width}px: evidence detail outside viewport ${JSON.stringify(detail)}`);
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.SCOPE.Router.open('sources'));
    const routeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (routeOverflow > 1) failures.push(`${width}px: sources route causes ${routeOverflow}px overflow`);
    errors.forEach(error => failures.push(`${width}px page error: ${error}`));
    await context.close();
  }
} finally { await browser.close(); }

if (failures.length) {
  console.error(`ROBINHOOD SCOPE FIT FAIL (${failures.length})`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exitCode = 1;
} else console.log(`ROBINHOOD SCOPE FIT PASS — ${widths.join('/')}px; no document overflow, escaped figure, undersized primary control, dock overflow, route overflow, or offscreen evidence sheet.`);
