#!/usr/bin/env node
// Generate plugins/preset-themes/appearance/appearance.json from scripts/palettes.mjs.
// Usage: node scripts/build-preset-themes.mjs [--check]   (--check fails when the file is stale)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESET_THEMES } from './palettes.mjs';
import { deriveMode } from '../plugins/dsh-skin-import/scripts/lib/derive.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'plugins/preset-themes/appearance/appearance.json');

const themes = [];
const notes = [];
for (const preset of PRESET_THEMES) {
  const modes = {};
  for (const [mode, seed] of Object.entries(preset.modes)) {
    const { colors, code, backdrop, adjustments } = deriveMode(seed, mode);
    modes[mode] = { colors, code, backdrop };
    for (const a of adjustments) notes.push(`${preset.id}/${mode} ${a.token}: ${a.from} -> ${a.to} (${a.reason})`);
  }
  const shown = modes.dark ?? modes.light;
  themes.push({
    id: preset.id,
    label: preset.label,
    description: preset.description,
    preview: {
      canvas: shown.colors.bg_default_secondary.slice(0, 7),
      surface: shown.colors.bg_default_primary.slice(0, 7),
      accent: shown.colors.bg_interaction_accent_focus_blue.slice(0, 7),
      text: shown.colors.text_default_primary.slice(0, 7),
    },
    modes,
    recipe: preset.recipe,
    fonts: { code: { families: preset.fonts.code } },
  });
}

const json = JSON.stringify({ schemaVersion: 1, themes }, null, 2) + '\n';
if (process.argv.includes('--check')) {
  const current = readFileSync(target, 'utf8');
  if (current !== json) {
    console.error('appearance.json is stale: run node scripts/build-preset-themes.mjs');
    process.exit(1);
  }
  console.log('appearance.json is up to date');
} else {
  writeFileSync(target, json);
  console.log(`wrote ${themes.length} themes to ${target}`);
}
if (notes.length) {
  console.log('contrast adjustments:');
  for (const n of notes) console.log('  ' + n);
}
