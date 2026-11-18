#!/usr/bin/env node
// Check text contrast of every theme in one or more appearance.json files.
// Body text (text_default_primary) must reach 4.5:1 on every background token; secondary and
// accent text 4.5:1 and tertiary text 3:1 on reading surfaces; text on the primary action 4.5:1;
// code text 4.5:1 on the main background. Translucent surfaces are composited over the canvas.
// The code block surface (bg_grouped_tertiary) must differ from the page (bg_default_primary) by an
// OKLab distance of at least 0.1 in dark mode and 0.045 in light mode, so code blocks keep an edge.
// Usage: node scripts/check-contrast.mjs <appearance.json>...
import { readFileSync } from 'node:fs';
import { CODE_SURFACE_MIN_DELTA, contrastReport } from '../plugins/dsh-skin-import/scripts/lib/derive.mjs';

const LIMITS = { primary: 4.5, secondary: 4.5, tertiary: 3, accent: 4.5, inverted: 4.5, code: 4.5 };
const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node scripts/check-contrast.mjs <appearance.json>...');
  process.exit(2);
}
let failures = 0;
for (const file of files) {
  const decl = JSON.parse(readFileSync(file, 'utf8'));
  for (const theme of decl.themes ?? []) {
    for (const [mode, def] of Object.entries(theme.modes)) {
      const report = contrastReport(def, mode);
      const cells = [];
      const limits = { ...LIMITS, codeSurface: CODE_SURFACE_MIN_DELTA[mode] };
      for (const [key, limit] of Object.entries(limits)) {
        const entry = report[key];
        if (!entry) continue;
        const ok = entry.ratio >= limit;
        if (!ok) failures++;
        cells.push(`${key} ${entry.ratio.toFixed(key === 'codeSurface' ? 3 : 2)}${ok ? '' : ` < ${limit} on ${entry.surface}`}`);
      }
      console.log(`${theme.id}/${mode}: ${cells.join(', ')}`);
    }
  }
}
if (failures) {
  console.error(`${failures} contrast check(s) failed`);
  process.exit(1);
}
console.log('all contrast checks passed');
