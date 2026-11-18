#!/usr/bin/env node
// Regenerate plugins/dsh-skin-import/scripts/lib/dsh-defaults.json from a DeepSeek Harness checkout
// (MIT, Copyright (c) 2026 DeepSeek). The file holds DSH's default --dsw-* / --shiki-* / radius
// values per mode, used to resolve var() references in DSH skins.
// Usage: node scripts/build-dsh-defaults.mjs <deepseek-harness checkout>
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractBlocks, resolveVariants } from '../plugins/dsh-skin-import/scripts/lib/css.mjs';

const repo = process.argv[2];
if (!repo) {
  console.error('usage: node scripts/build-dsh-defaults.mjs <deepseek-harness checkout>');
  process.exit(2);
}
const dir = join(repo, 'packages/client/ui-theme/src/styles');
const text = ['design-platform.css', 'shiki.css', 'base.css'].map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
const blocks = extractBlocks(text, { requirePrefix: '--', stripComments: true });
const base = resolveVariants(blocks).find((v) => v.variant.length === 0);
const light = {};
const dark = {};
for (const b of blocks.filter((b) => b.variant.length === 0).sort((a, b) => a.order - b.order)) {
  if (b.mode !== 'dark') Object.assign(light, b.vars);
  if (b.mode !== 'light') Object.assign(dark, b.vars);
}
void base;
const out = {
  source: 'deepseek-harness packages/client/ui-theme/src/styles (design-platform.css, shiki.css, base.css), MIT, Copyright (c) 2026 DeepSeek',
  light,
  dark: { ...light, ...dark },
};
const target = join(dirname(fileURLToPath(import.meta.url)), '../plugins/dsh-skin-import/scripts/lib/dsh-defaults.json');
writeFileSync(target, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${Object.keys(light).length} light / ${Object.keys(out.dark).length} dark values to ${target}`);
