#!/usr/bin/env node
import { launchAuditBrowser, openAuditPage } from './audit-helpers.mjs';

const widths = [360, 390, 430, 768, 1200];
const modes = [
  { name: 'reduced-motion', reducedMotion: 'reduce', javaScriptEnabled: true },
  { name: 'cdn-blocked', reducedMotion: 'no-preference', javaScriptEnabled: true },
  { name: 'js-off', reducedMotion: 'reduce', javaScriptEnabled: false }
];
const failures = [];
const browser = await launchAuditBrowser();

try {
  for (const width of widths) {
    for (const mode of modes) {
      const { context, page, errors } = await openAuditPage(browser, width, mode);
      const result = await page.evaluate(({ jsOff }) => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        sections: Array.from(document.querySelectorAll('section')).filter(section => section.getClientRects().length).length,
        hiddenReveal: Array.from(document.querySelectorAll('.reveal')).filter(element => {
          const style = getComputedStyle(element); return style.visibility === 'hidden' || Number(style.opacity) === 0;
        }).length,
        fallbacks: Array.from(document.querySelectorAll('.dock-fallback')).filter(element => element.getClientRects().length).length,
        docks: document.querySelectorAll('.dock').length,
        gridRows: document.querySelectorAll('.tgrid tbody tr').length,
        tools: document.querySelectorAll('.tool-card').length,
        noMotion: document.body.classList.contains('no-motion'),
        json: (() => { try { JSON.parse(document.getElementById('chainData').textContent); return true; } catch (error) { return false; } })(),
        jsOff
      }), { jsOff: mode.javaScriptEnabled === false });
      if (result.overflow > 1) failures.push(`${width}px ${mode.name}: ${result.overflow}px horizontal page overflow`);
      if (result.sections !== 6) failures.push(`${width}px ${mode.name}: only ${result.sections}/6 sections visible`);
      if (result.hiddenReveal) failures.push(`${width}px ${mode.name}: ${result.hiddenReveal} reveal blocks hidden`);
      if (!result.json) failures.push(`${width}px ${mode.name}: chainData JSON parse failed`);
      if (mode.name === 'js-off' && result.fallbacks !== 5) failures.push(`${width}px js-off: only ${result.fallbacks}/5 fallback tables visible`);
      if (mode.name !== 'js-off' && (result.docks !== 4 || result.gridRows !== 8 || result.tools < 20)) {
        failures.push(`${width}px ${mode.name}: dynamic content missing (docks=${result.docks}, rows=${result.gridRows}, tools=${result.tools})`);
      }
      if (mode.name !== 'js-off' && !result.noMotion) failures.push(`${width}px ${mode.name}: static fallback mode not engaged`);
      errors.forEach(error => failures.push(`${width}px ${mode.name} page error: ${error}`));
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`DEGRADATION FAIL (${failures.length})`);
  failures.forEach(failure => console.error('- ' + failure));
  process.exitCode = 1;
  throw new Error('DEGRADATION AUDIT FAILED');
}
console.log(`DEGRADATION PASS — ${widths.length * modes.length} cases (${widths.join('/')} x reduced-motion/CDN-blocked/JS-off); content parity and page overflow pass.`);
console.log('MOTION-ON PROFILE SKIP — external anime.js was intentionally blocked; physical mid-range phone paint timing was not measured.');
