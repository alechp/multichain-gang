#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { launchAuditBrowser, openAuditPage, printTable } from './audit-helpers.mjs';

const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const failures = [];
const rows = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(source.includes('ANIMATED SIGNAL'), 'mini diagrams do not identify their animated signal layer');
expect(source.includes("querySelectorAll('.fst circle')"), 'finality animation still targets a text-bearing group');
expect(!source.includes("closest('.term:not(.term-muted)')"), 'some visible reference terms still route through the dead-link selector');

const browser = await launchAuditBrowser();
try {
  for (const width of [390, 1200]) {
    const { context, page, errors } = await openAuditPage(browser, width);
    await page.waitForSelector('.tool-card h4 .entity-door');

    const tool = await page.locator('.tool-card h4 .entity-door').first().evaluate(element => {
      const style = getComputedStyle(element);
      return { color: style.color, decoration: style.textDecorationLine, label: element.textContent.trim() };
    });
    expect(tool.color !== 'rgb(0, 0, 0)' && tool.color !== 'rgba(0, 0, 0, 1)', `${width}px tool title inherits native black text`);
    expect(tool.decoration === 'none', `${width}px tool title is still presented as a bare underlined link`);

    await page.evaluate(() => window.SCOPE.Router.go('/e/robinhood-chain'));
    await page.waitForSelector('.entity-channel:not([hidden]) .entity-copy .term[data-ref-bound]');
    const muted = await page.locator('.entity-channel .term-muted').count();
    const unbound = await page.locator('.entity-channel .term:not([data-ref-bound])').count();
    expect(muted === 0, `${width}px entity reader contains ${muted} visually marked but muted terms`);
    expect(unbound === 0, `${width}px entity reader contains ${unbound} reference terms without behavior`);

    const type = await page.locator('.entity-page').evaluate(pageNode => {
      const heading = pageNode.querySelector('.entity-mast h2');
      const copy = pageNode.querySelector('.entity-copy p');
      const copyStyle = getComputedStyle(copy);
      return {
        headingPx: parseFloat(getComputedStyle(heading).fontSize),
        copyPx: parseFloat(copyStyle.fontSize),
        leading: parseFloat(copyStyle.lineHeight) / parseFloat(copyStyle.fontSize),
        measurePx: pageNode.querySelector('.entity-copy').getBoundingClientRect().width
      };
    });
    expect(type.headingPx <= (width < 760 ? 56 : 74), `${width}px entity heading is oversized at ${type.headingPx.toFixed(1)}px`);
    expect(type.leading >= 1.7, `${width}px entity copy leading is too tight at ${type.leading.toFixed(2)}`);
    expect(type.measurePx <= 700.5, `${width}px entity copy measure exceeds 700px`);

    const term = page.locator('.entity-copy .term[data-ref-bound]').first();
    const termStyle = await term.evaluate(element => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, decoration: style.textDecorationLine, label: element.textContent.trim() };
    });
    expect(termStyle.background !== 'rgba(0, 0, 0, 0)', `${width}px term annotation has no visible reference treatment`);
    expect(termStyle.decoration === 'none', `${width}px term annotation is still only an underline`);

    if (width === 1200) {
      await term.hover();
      await page.waitForTimeout(220);
      const preview = await page.locator('#refCard').evaluate(card => {
        const entity = document.querySelector('.entity-channel');
        const trigger=document.querySelector('.term[aria-describedby="refCard"]');
        const rect=card.getBoundingClientRect(),target=trigger.getBoundingClientRect(),header=document.querySelector('.slotbar').getBoundingClientRect();
        const placement=card.dataset.placement;
        return {
          hidden: card.hidden,
          definition: document.querySelector('#refDef').textContent.trim(),
          purpose: document.querySelector('#refPurpose').textContent.trim(),
          hint: document.querySelector('#refHint').textContent.trim(),
          z: Number(getComputedStyle(card).zIndex),
          entityZ: Number(getComputedStyle(entity).zIndex),
          placement,
          adjacent:placement==='bottom'?Math.abs(rect.top-target.bottom-10)<=1:Math.abs(target.top-rect.bottom-10)<=1,
          viewportSafe:rect.left>=11&&rect.right<=innerWidth-11&&rect.top>=header.bottom+11&&rect.bottom<=innerHeight-11
        };
      });
      expect(!preview.hidden, 'desktop term hover does not reveal a reference card');
      expect(preview.definition.length >= 48, 'desktop reference preview does not contain a full definition');
      expect(preview.purpose.length >= 24, 'desktop reference preview omits the operational purpose');
      expect(/CLICK TO PIN/.test(preview.hint), 'desktop reference preview does not explain how to open sources');
      expect(preview.z > preview.entityZ, `reference card z-index ${preview.z} does not clear entity reader ${preview.entityZ}`);
      expect(['top','bottom'].includes(preview.placement)&&preview.adjacent&&preview.viewportSafe, `desktop reference preview is not target-anchored and viewport-safe: ${JSON.stringify(preview)}`);
    }

    await term.click();
    await page.waitForSelector('#refCard.ref-pinned:not([hidden]) .ref-links a');
    const pinned = await page.locator('#refCard').evaluate(card => ({
      sources: card.querySelectorAll('.ref-links a[href^="https://"]').length,
      hint: card.querySelector('#refHint').textContent.trim(),
      firstTarget: card.querySelector('.ref-links a')?.target || ''
    }));
    expect(pinned.sources > 0, `${width}px pinned reference card has no external source link`);
    expect(/SOURCE CHANNEL OPEN/.test(pinned.hint), `${width}px pinned card does not identify its source state`);
    expect(pinned.firstTarget === '_blank', `${width}px source link does not preserve the reader context`);

    errors.forEach(error => failures.push(`${width}px page error: ${error}`));
    rows.push({
      viewport: `${width}px`,
      heading: `${type.headingPx.toFixed(0)}px`,
      copy: `${type.copyPx.toFixed(1)}px / ${type.leading.toFixed(2)}`,
      measure: `${type.measurePx.toFixed(0)}px`,
      term: termStyle.label.slice(0, 20),
      sources: pinned.sources
    });
    await context.close();
  }
} finally {
  await browser.close();
}

printTable(rows, [
  { key: 'viewport', label: 'Viewport' },
  { key: 'heading', label: 'Heading' },
  { key: 'copy', label: 'Copy / leading' },
  { key: 'measure', label: 'Measure' },
  { key: 'term', label: 'Reference' },
  { key: 'sources', label: 'Sources' }
]);

if (failures.length) {
  console.error(`\nREADABILITY FAIL (${failures.length})`);
  failures.forEach(failure => console.error('- ' + failure));
  process.exit(1);
}
console.log('\nREADABILITY PASS — reader scale, live reference terms, source paths, and motion labeling verified.');
