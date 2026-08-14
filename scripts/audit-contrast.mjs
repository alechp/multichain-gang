#!/usr/bin/env node
import { launchAuditBrowser, openAuditPage, printTable } from './audit-helpers.mjs';

const widths = [360, 700, 1200];
const browser = await launchAuditBrowser();
const pairs = new Map();
const failures = [];

try {
  for (const width of widths) {
    const { context, page, errors } = await openAuditPage(browser, width);
    const result = await page.evaluate(() => {
      const parse = value => {
        if (!value || value === 'none' || value === 'transparent') return null;
        const rgb = value.match(/rgba?\(([^)]+)\)/i);
        if (rgb) {
          const parts = rgb[1].replace(/\//g, ' ').split(/[ ,]+/).filter(Boolean).map(Number);
          return [parts[0], parts[1], parts[2], Number.isFinite(parts[3]) ? parts[3] : 1];
        }
        const srgb = value.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/i);
        return srgb ? [+srgb[1] * 255, +srgb[2] * 255, +srgb[3] * 255, srgb[4] == null ? 1 : +srgb[4]] : null;
      };
      const blend = (front, back, alpha = front[3]) => [
        front[0] * alpha + back[0] * (1 - alpha),
        front[1] * alpha + back[1] * (1 - alpha),
        front[2] * alpha + back[2] * (1 - alpha),
        1
      ];
      const luminance = color => {
        const linear = color.slice(0, 3).map(channel => {
          const value = channel / 255;
          return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
        });
        return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
      };
      const ratio = (a, b) => {
        const l1 = luminance(a), l2 = luminance(b);
        return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
      };
      const toHex = color => '#' + color.slice(0, 3).map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('').toUpperCase();
      const opaqueGround = element => {
        let node = element;
        while (node) {
          const value = parse(getComputedStyle(node).backgroundColor);
          if (value && value[3] > 0) {
            if (value[3] >= .999) return value;
            const beneath = opaqueGround(node.parentElement || document.body);
            return blend(value, beneath);
          }
          node = node.parentElement;
        }
        return [10, 13, 19, 1];
      };
      const svgGround = text => {
        const box = text.getBoundingClientRect();
        const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
        const rects = Array.from(text.closest('svg').querySelectorAll('rect')).filter(rect => {
          const rb = rect.getBoundingClientRect();
          return cx >= rb.left && cx <= rb.right && cy >= rb.top && cy <= rb.bottom;
        }).sort((a, b) => {
          const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
          return ar.width * ar.height - br.width * br.height;
        });
        if (rects[0]) {
          const fill = parse(getComputedStyle(rects[0]).fill);
          if (fill) {
            const panel = opaqueGround(text.closest('.panel') || document.body);
            return fill[3] < .999 ? blend(fill, panel) : fill;
          }
        }
        return opaqueGround(text.closest('.panel') || document.body);
      };
      const opacity = element => {
        let value = 1, node = element;
        while (node && node !== document) { value *= Number(getComputedStyle(node).opacity) || 1; node = node.parentElement; }
        return value;
      };
      const checks = [];
      document.querySelectorAll('body *').forEach(element => {
        if (!element.getClientRects().length) return;
        const ownText = Array.from(element.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
        if (!ownText || parseFloat(getComputedStyle(element).fontSize) > 12.01) return;
        const style = getComputedStyle(element);
        const foreground = parse(element instanceof SVGTextElement ? style.fill : style.color);
        if (!foreground) return;
        const ground = element instanceof SVGTextElement ? svgGround(element) : opaqueGround(element);
        const alpha = foreground[3] * opacity(element);
        const actual = alpha < .999 ? blend(foreground, ground, alpha) : foreground;
        checks.push({
          label: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 72),
          selector: element.id ? '#' + element.id : element.className?.baseVal || element.className || element.tagName.toLowerCase(),
          font: parseFloat(style.fontSize).toFixed(1),
          fg: toHex(actual),
          bg: toHex(ground),
          ratio: ratio(actual, ground)
        });
      });
      return checks;
    });

    result.forEach(check => {
      const key = `${check.fg}/${check.bg}`;
      const prior = pairs.get(key);
      if (!prior || check.ratio < prior.ratio) pairs.set(key, { width, ...check, count: (prior?.count || 0) + 1 });
      else prior.count++;
      if (check.ratio < 4.5) failures.push(`${width}px ${check.selector} “${check.label}” ${check.fg} on ${check.bg} = ${check.ratio.toFixed(2)}:1`);
    });
    errors.forEach(error => failures.push(`${width}px page error: ${error}`));
    await context.close();
  }
} finally {
  await browser.close();
}

const rows = Array.from(pairs.values()).sort((a, b) => a.ratio - b.ratio).map(row => ({
  viewport: row.width,
  foreground: row.fg,
  ground: row.bg,
  ratio: row.ratio.toFixed(2) + ':1',
  status: row.ratio >= 4.5 ? 'PASS' : 'FAIL',
  sample: row.label.slice(0, 34)
}));
printTable(rows, [
  { key: 'viewport', label: 'Viewport' },
  { key: 'foreground', label: 'Text' },
  { key: 'ground', label: 'Ground' },
  { key: 'ratio', label: 'Ratio' },
  { key: 'status', label: 'AA' },
  { key: 'sample', label: 'Sample' }
]);

if (failures.length) {
  console.error(`\nCONTRAST FAIL (${failures.length})`);
  failures.slice(0, 80).forEach(failure => console.error('- ' + failure));
  process.exit(1);
}
console.log(`\nCONTRAST PASS — all computed text at <=12px clears 4.5:1 at ${widths.join('/')}px.`);
