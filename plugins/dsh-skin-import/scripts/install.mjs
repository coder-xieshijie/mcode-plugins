#!/usr/bin/env node
// Copy a converted plugin into MiniMax Code's local plugin directory: <data-dir>/plugins/<name>/.
// MiniMax Code rescans that directory automatically and enables a newly found plugin.
// Usage: node scripts/install.mjs <plugin-dir> --data-dir <MiniMax Code data dir> [--replace]
import { cpSync, existsSync, rmSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { validatePlugin } from './lib/validate.mjs';

const args = process.argv.slice(2);
const src = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--data-dir');
const dataDir = args.includes('--data-dir') ? args[args.indexOf('--data-dir') + 1] : undefined;
if (!src || !dataDir) {
  console.error('usage: node scripts/install.mjs <plugin-dir> --data-dir <MiniMax Code data dir> [--replace]');
  process.exit(2);
}
const from = resolve(src);
if (!existsSync(join(from, '.minimax-plugin/plugin.json'))) {
  console.error('not a MiniMax plugin directory: ' + from);
  process.exit(1);
}
if (!existsSync(dataDir) || !statSync(dataDir).isDirectory()) {
  console.error('data directory not found: ' + dataDir);
  process.exit(1);
}
const errors = validatePlugin(from);
if (errors.length) {
  console.error('plugin failed the self-check:\n' + errors.map((e) => '- ' + e).join('\n'));
  process.exit(1);
}
const target = join(resolve(dataDir), 'plugins', basename(from));
if (existsSync(target)) {
  if (!args.includes('--replace')) {
    console.error('already installed: ' + target + ' (ask the user, then pass --replace)');
    process.exit(3);
  }
  rmSync(target, { recursive: true, force: true });
}
cpSync(from, target, { recursive: true });
console.log(target);
