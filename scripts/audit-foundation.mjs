#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { launchAuditBrowser, openAuditPage } from './audit-helpers.mjs';

const source = readFileSync('index.html', 'utf8');
const failures = [];
const requireEmpty = process.argv.includes('--require-empty');
const lanes = ['A', 'B', 'C', 'E'];
const kinds = ['CSS', 'JS', 'HTML'];

for (const lane of lanes) {
  for (const kind of kinds) {
    const start = `${kind === 'CSS' ? '/*' : kind === 'JS' ? '//' : '<!--'} ==V3${lane}:${kind}== ${kind === 'CSS' ? '*/' : kind === 'HTML' ? '-->' : ''}`.trimEnd();
    const end = `${kind === 'CSS' ? '/*' : kind === 'JS' ? '//' : '<!--'} ==/V3${lane}:${kind}== ${kind === 'CSS' ? '*/' : kind === 'HTML' ? '-->' : ''}`.trimEnd();
    const starts = source.split(start).length - 1, ends = source.split(end).length - 1;
    if (starts !== 1 || ends !== 1) failures.push(`V3${lane}:${kind} banners are not byte-unique (${starts}/${ends})`);
    else if (requireEmpty && source.slice(source.indexOf(start) + start.length, source.indexOf(end)).trim()) failures.push(`V3${lane}:${kind} zone is not empty`);
  }
  const json = new RegExp(`"==V3${lane}:JSON==": null,([\\s\\S]*?)"==/V3${lane}:JSON==": null`).exec(source);
  if (!json) failures.push(`V3${lane}:JSON sentinels missing`);
  else if (requireEmpty && json[1].trim()) failures.push(`V3${lane}:JSON zone is not empty`);
}

for (const primitive of ['Overlay', 'Router', 'Store', 'positionOverlay', 'termify', 'Runtime']) {
  const comment = new RegExp(`/\\* ${primitive} usage:([\\s\\S]*?)\\*/`).exec(source);
  if (!comment || ![1, 2, 3, 4, 5].every(number => comment[1].includes(`* ${number}.`))) failures.push(`${primitive} lacks the required five-line usage comment`);
}

const browser = await launchAuditBrowser();
try {
  const { context, page, errors } = await openAuditPage(browser, 1200);
  const runtime = await page.evaluate(() => {
    const required = ['Overlay', 'Router', 'Store', 'positionOverlay', 'termify', 'Runtime'];
    const missing = required.filter(key => !window.SCOPE || window.SCOPE[key] == null);
    const anchors = document.querySelectorAll('[data-note-anchor]').length;
    const revs = [document.body.dataset.rev, JSON.parse(document.getElementById('chainData').textContent)._rev];
    const placement = window.SCOPE.positionOverlay(
      { left: 40, top: 4, right: 60, bottom: 24, width: 20, height: 20 },
      { width: 100, height: 60 },
      { placement: 'top', boundary: { left: 0, top: 0, right: 300, bottom: 200 }, padding: 12, offset: 10 }
    );
    const host = document.createElement('p'); host.textContent = 'Turbine Turbine'; document.body.appendChild(host);
    const terms = { turbine: { term: 'Turbine', aliases: ['Turbine'] } };
    const first = window.SCOPE.termify(host, { terms });
    const second = window.SCOPE.termify(host, { terms });
    host.remove();
    const store = window.SCOPE.Store.create('foundation-audit', { version: 1, defaultValue: { v: 1, value: 0 } });
    store.set({ v: 1, value: 7 }); const stored = store.get().value; store.remove();
    const ambients = ['#ch1 .panel', '#ch2 .pipe-scroll', '#ch3 .panel', '#ch4 .ladder', '#ch5 .bench'].map((selector, index) => {
      const element = document.querySelector(selector);
      const pseudo = getComputedStyle(element, '::before');
      return { selector, content: pseudo.content, animation: pseudo.animationName, opacity: Number(pseudo.opacity), index };
    });
    return { missing, anchors, revs, placement, first, second, stored, ambients };
  });
  if (runtime.missing.length) failures.push('missing SCOPE exports: ' + runtime.missing.join(', '));
  if (runtime.anchors < 50) failures.push(`only ${runtime.anchors} stable note anchors stamped`);
  if (!runtime.revs[0] || runtime.revs[0] !== runtime.revs[1]) failures.push(`body/data rev mismatch: ${runtime.revs.join(' / ')}`);
  if (runtime.placement.placement !== 'bottom') failures.push('positionOverlay did not flip away from viewport top');
  if (runtime.first.wrapped !== 2 || runtime.second.wrapped !== 0) failures.push(`termify idempotence failed: ${JSON.stringify([runtime.first, runtime.second])}`);
  if (runtime.stored !== 7) failures.push('Store round-trip failed');
  runtime.ambients.forEach(ambient => {
    if (!ambient.content || ambient.content === 'none') failures.push(`${ambient.selector} ambient missing`);
    if (ambient.animation !== 'none') failures.push(`${ambient.selector} ambient loops (${ambient.animation})`);
    if (ambient.opacity > .02) failures.push(`${ambient.selector} ambient opacity ${ambient.opacity} exceeds 2%`);
  });

  const bridge = await page.evaluate(() => {
    const Runtime=window.SCOPE.Runtime;
    const methods=['restartFigure','openDock','closeDock','cascade','filterBench','isVisible'];
    const fills=Array.from(document.querySelectorAll('.lfill'));
    fills.forEach(fill=>{ fill.style.transform='scaleX(0)'; });
    const restarted=Runtime.restartFigure('.ladder');
    const ladderRestored=fills.every(fill=>fill.style.transform!=='scaleX(0)');

    const opened=Runtime.openDock('topology','eth');
    const dock=document.querySelector('.dock[data-section="topology"]');
    const dockOpen=!!dock && !dock.querySelector('.dock-body').hidden && dock.dataset.active==='eth';
    const closed=Runtime.closeDock('topology');
    const dockClosed=!!dock && dock.querySelector('.dock-body').hidden;

    const cells=Array.from(document.querySelectorAll('#gridPanel .tcell .cm'));
    cells.forEach(cell=>{ cell.style.opacity='.2'; });
    const cascaded=Runtime.cascade();
    const cascadeVisible=cells.length>0 && cells.every(cell=>cell.style.opacity==='1');

    const filtered=Runtime.filterBench('protect');
    const protectPressed=document.querySelector('.chip-f[data-f="stance"][data-v="protect"]')?.getAttribute('aria-pressed')==='true';
    const visibleCards=Array.from(document.querySelectorAll('.tool-card')).filter(card=>!card.hidden);
    const protectOnly=visibleCards.length>0 && visibleCards.every(card=>card.dataset.stance==='protect');
    Runtime.filterBench({chain:'all',stance:'all'});

    const missing=[
      Runtime.restartFigure('#missing-runtime-target'),
      Runtime.openDock('missing-runtime-target','eth'),
      Runtime.closeDock('missing-runtime-target'),
      Runtime.filterBench({stance:'missing-runtime-filter'}),
      Runtime.isVisible(null)
    ];
    return {
      frozen:Object.isFrozen(Runtime),methods:methods.filter(method=>typeof Runtime[method]==='function'),
      restarted,ladderRestored,opened,dockOpen,closed,dockClosed,cascaded,cascadeVisible,
      filtered,protectPressed,protectOnly,visibleDesktop:Runtime.isVisible('#pipeSvg'),
      hiddenMobile:Runtime.isVisible('#pipeSvgV'),missing
    };
  });
  if (!bridge.frozen || bridge.methods.length !== 6) failures.push(`Runtime bridge shape invalid: ${JSON.stringify(bridge)}`);
  if (!bridge.restarted || !bridge.ladderRestored) failures.push(`Runtime.restartFigure did not invoke ladder action: ${JSON.stringify(bridge)}`);
  if (!bridge.opened || !bridge.dockOpen || !bridge.closed || !bridge.dockClosed) failures.push(`Runtime dock adapters failed: ${JSON.stringify(bridge)}`);
  if (!bridge.cascaded || !bridge.cascadeVisible) failures.push(`Runtime.cascade did not invoke the grid action: ${JSON.stringify(bridge)}`);
  if (!bridge.filtered || !bridge.protectPressed || !bridge.protectOnly) failures.push(`Runtime.filterBench did not apply protect filter: ${JSON.stringify(bridge)}`);
  if (!bridge.visibleDesktop || bridge.hiddenMobile) failures.push(`Runtime.isVisible differs from v2 responsive state: ${JSON.stringify(bridge)}`);
  if (bridge.missing.some(Boolean)) failures.push(`Runtime missing-target methods did not no-op: ${JSON.stringify(bridge.missing)}`);

  await page.locator('.tcell').first().click();
  const opened = await page.evaluate(() => {
    const pop = document.querySelector('.tpop');
    return { open: window.SCOPE.Overlay.isOpen(pop), hidden: pop.hidden, focused: pop.contains(document.activeElement) };
  });
  if (!opened.open || opened.hidden || !opened.focused) failures.push(`grid popover Overlay open failed: ${JSON.stringify(opened)}`);
  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() => {
    const pop = document.querySelector('.tpop');
    return { open: window.SCOPE.Overlay.isOpen(pop), hidden: pop.hidden, expanded: document.querySelector('.tcell[aria-expanded="true"]') !== null };
  });
  if (closed.open || !closed.hidden || closed.expanded) failures.push(`grid popover Overlay close failed: ${JSON.stringify(closed)}`);
  errors.forEach(error => failures.push('page error: ' + error));
  await context.close();

  for (const width of [700, 768, 820, 900]) {
    const { context: ctx, page: p, errors: pageErrors } = await openAuditPage(browser, width);
    const jitter = await p.evaluate(() => {
      const title = document.querySelector('h1');
      const lines = Array.from(document.querySelectorAll('.h1-line'));
      lines.forEach(line => line.style.letterSpacing = '.005em'); const settled = title.getBoundingClientRect().height;
      lines.forEach(line => line.style.letterSpacing = '.08em'); const wide = title.getBoundingClientRect().height;
      return { settled, wide };
    });
    if (Math.abs(jitter.settled - jitter.wide) > 1) failures.push(`${width}px hero title wrap jitter: ${jitter.settled} -> ${jitter.wide}`);
    const watermark = await p.evaluate(() => {
      const mark = document.querySelector('.watermark');
      if (!mark.getClientRects().length) return false;
      const a = mark.getBoundingClientRect();
      return Array.from(document.querySelectorAll('.lval')).some(value => {
        const b = value.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      });
    });
    if (watermark) failures.push(`${width}px watermark overlaps a latency value`);
    pageErrors.forEach(error => failures.push(`${width}px page error: ${error}`));
    await ctx.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`FOUNDATION FAIL (${failures.length})`);
  failures.forEach(failure => console.error('- ' + failure));
  process.exit(1);
}
console.log(`FOUNDATION PASS — zones byte-unique${requireEmpty ? '/empty' : ''}; five primitives + frozen Runtime bridge live; anchors, ambients, termify, Store, Overlay grid migration, title fit, and watermark guard pass.`);
