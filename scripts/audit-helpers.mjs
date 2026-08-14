import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const localAuditUrl = new URL(pathToFileURL(resolve('index.html')).href);
localAuditUrl.searchParams.set('scope-audit', '1');
export const targetUrl = process.env.SCOPE_URL || localAuditUrl.href;

export async function launchAuditBrowser() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    (existsSync(macChrome) ? macChrome : undefined);
  return chromium.launch({ headless: true, executablePath });
}

export async function openAuditPage(browser, width, options = {}) {
  const context = await browser.newContext({
    viewport: { width, height: options.height || 800 },
    reducedMotion: options.reducedMotion || 'reduce',
    javaScriptEnabled: options.javaScriptEnabled !== false,
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  if (options.blockExternal !== false) {
    await page.route(/^https?:\/\//, route => route.abort('blockedbyclient'));
  }
  await page.goto(targetUrl, { waitUntil: 'load' });
  if (new URL(targetUrl).searchParams.has('scope-audit')) {
    await page.evaluate(() => { document.documentElement.dataset.scopeUnlocked = 'audit'; });
  }
  await page.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve());
  await page.waitForTimeout(options.settleMs || 80);
  return { context, page, errors };
}

export function printTable(rows, columns) {
  const widths = columns.map(column => Math.max(column.label.length, ...rows.map(row => String(row[column.key] ?? '').length)));
  const line = row => columns.map((column, index) => String(row[column.key] ?? '').padEnd(widths[index])).join(' | ');
  console.log(line(Object.fromEntries(columns.map(column => [column.key, column.label]))));
  console.log(widths.map(width => '-'.repeat(width)).join('-|-'));
  rows.forEach(row => console.log(line(row)));
}
