#!/usr/bin/env node
// Write plugins/preset-themes/icon.png: one swatch per preset theme accent.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESET_THEMES } from './palettes.mjs';
import { swatchIcon } from '../plugins/dsh-skin-import/scripts/lib/png.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const accents = PRESET_THEMES.map((t) => (t.modes.dark ?? t.modes.light).accent);
writeFileSync(join(root, 'plugins/preset-themes/icon.png'), swatchIcon(['#1b1d24', ...accents]));
console.log('wrote plugins/preset-themes/icon.png');
