#!/usr/bin/env node
import { launchAuditBrowser, openAuditPage, printTable } from './audit-helpers.mjs';

const widths = [360, 700, 1200];
const browser = await launchAuditBrowser();
const rows = [];
const failures = [];

try {
  for (const width of widths) {
    const { context, page, errors } = await openAuditPage(browser, width);
    const result = await page.evaluate(() => {
      const fit = [];
      document.querySelectorAll('svg').forEach(svg => {
        if (!svg.getClientRects().length) return;
        svg.querySelectorAll('[data-fit]').forEach(group => {
          const rect = group.querySelector(':scope > rect');
          if (!rect) return;
          const rb = rect.getBBox();
          group.querySelectorAll(':scope > text').forEach(text => {
            const tb = text.getBBox();
            const overflow = Math.max(
              0,
              rb.x - 2 - tb.x,
              tb.x + tb.width - (rb.x + rb.width + 2),
              rb.y - 2 - tb.y,
              tb.y + tb.height - (rb.y + rb.height + 2)
            );
            fit.push({
              figure: svg.id || svg.getAttribute('aria-label') || 'inline-svg',
              group: group.dataset.fit,
              label: text.textContent.trim(),
              box: rb.width.toFixed(1),
              text: tb.width.toFixed(1),
              overflow: overflow.toFixed(2)
            });
          });
        });
      });

      const layerErrors = [];
      document.querySelectorAll('svg').forEach(svg => {
        const textLayer = svg.querySelector('.text-layer');
        if (!textLayer) return;
        svg.querySelectorAll('.motion-layer,.motion-node').forEach(motion => {
          if (motion.compareDocumentPosition(textLayer) & Node.DOCUMENT_POSITION_PRECEDING) {
            layerErrors.push((svg.id || svg.getAttribute('aria-label') || 'inline-svg') + ': motion follows text layer');
          }
        });
      });

      const haloErrors = [];
      document.querySelectorAll('svg').forEach(svg => {
        if (!svg.querySelector('.motion-layer,.motion-node')) return;
        svg.querySelectorAll('text').forEach(text => {
          const style = getComputedStyle(text);
          if (!style.paintOrder.includes('stroke') || parseFloat(style.strokeWidth) < 3) {
            haloErrors.push((svg.id || 'inline-svg') + ': ' + text.textContent.trim());
          }
        });
      });

      const figureErrors = [];
      document.querySelectorAll('#heroSvgD,#heroSvgM,#turbineSvg,#pipeSvg,#pipeSvgV,#sandwichSvg,#sandSvgM1,#sandSvgM2,#jitoSvg').forEach(svg => {
        if (!svg.getClientRects().length) return;
        const height = svg.getBoundingClientRect().height;
        if (height > innerHeight) figureErrors.push((svg.id || 'figure') + ': figure ' + height.toFixed(1) + 'px > viewport ' + innerHeight + 'px');
      });
      return { fit, layerErrors, haloErrors, figureErrors };
    });

    result.fit.forEach(row => rows.push({ width, ...row }));
    result.fit.filter(row => Number(row.overflow) > 0).forEach(row => failures.push(`${width}px ${row.figure} / ${row.label}: ${row.overflow} overflow`));
    result.layerErrors.forEach(error => failures.push(`${width}px ${error}`));
    result.haloErrors.forEach(error => failures.push(`${width}px un-haloed ${error}`));
    result.figureErrors.forEach(error => failures.push(`${width}px ${error}`));
    errors.forEach(error => failures.push(`${width}px page error: ${error}`));
    await context.close();
  }
} finally {
  await browser.close();
}

printTable(rows, [
  { key: 'width', label: 'Viewport' },
  { key: 'figure', label: 'Figure' },
  { key: 'label', label: 'Label' },
  { key: 'box', label: 'Box w' },
  { key: 'text', label: 'Text w' },
  { key: 'overflow', label: 'Overflow' }
]);

if (failures.length) {
  console.error(`\nSVG FIT FAIL (${failures.length})`);
  failures.forEach(failure => console.error('- ' + failure));
  process.exitCode = 1;
  throw new Error('SVG FIT AUDIT FAILED');
}
console.log(`\nSVG FIT PASS — ${rows.length} label measurements; zero offenders at ${widths.join('/')}px; motion/text order and halos pass.`);
