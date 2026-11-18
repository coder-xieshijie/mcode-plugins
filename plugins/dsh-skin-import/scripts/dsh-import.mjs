#!/usr/bin/env node
// dsh-skin-import: convert a DeepSeek Harness skin plugin into a MiniMax Code appearance plugin.
// Usage:
//   node scripts/dsh-import.mjs <npm package | git URL | local directory> [--out DIR]
//        [--allow id1,id2 | --allow all] [--include-capsules] [--name plugin-name] [--json]
// The source is downloaded with "npm pack --ignore-scripts" or "git clone --depth 1" into a temp
// directory and only read: nothing from it is installed, required or executed.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { analyzePackage } from './lib/extract.mjs';
import { convert } from './lib/convert.mjs';
import { renderReport } from './lib/report.mjs';

function parseArgs(argv) {
  const opts = { allow: new Set(), out: join(tmpdir(), 'dsh-skin-import-out'), json: false, includeCapsules: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') opts.out = argv[++i];
    else if (a === '--allow') for (const id of String(argv[++i] ?? '').split(',')) { if (id.trim()) opts.allow.add(id.trim()); }
    else if (a === '--include-capsules') opts.includeCapsules = true;
    else if (a === '--name') opts.name = argv[++i];
    else if (a === '--json') opts.json = true;
    else if (a === '-h' || a === '--help') opts.help = true;
    else rest.push(a);
  }
  opts.source = rest[0];
  return opts;
}

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32', encoding: 'utf8' });

/** Resolve the source to a package root directory (the one holding package.json). */
export function fetchSource(source) {
  const local = isAbsolute(source) || source.startsWith('.') ? resolve(source) : null;
  if (local && existsSync(local)) return packageRoot(local);
  const work = mkdtempSync(join(tmpdir(), 'dsh-skin-'));
  if (/^(?:https?:\/\/|git@|git\+)/u.test(source) || /^github:/u.test(source)) {
    const url = source.replace(/^git\+/u, '').replace(/^github:/u, 'https://github.com/');
    run('git', ['clone', '--depth', '1', '--quiet', url, join(work, 'repo')]);
    return packageRoot(join(work, 'repo'));
  }
  // npm package name (optionally with @version).
  const out = run('npm', ['pack', source, '--ignore-scripts', '--silent', '--pack-destination', work]).trim().split(/\r?\n/u).pop();
  run('tar', ['-xzf', join(work, out), '-C', work]);
  return packageRoot(join(work, 'package'));
}

function packageRoot(dir) {
  if (existsSync(join(dir, 'package.json'))) return dir;
  if (existsSync(join(dir, 'package', 'package.json'))) return join(dir, 'package');
  for (const name of readdirSync(dir)) if (existsSync(join(dir, name, 'package.json'))) return join(dir, name);
  return dir;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help || !opts.source) {
  console.log('usage: node scripts/dsh-import.mjs <npm package | git URL | directory> [--out DIR] [--allow ids|all] [--include-capsules] [--name NAME] [--json]');
  process.exit(opts.help ? 0 : 2);
}
const root = fetchSource(opts.source);
const analysis = analyzePackage(root, { includeCapsules: opts.includeCapsules });
let report;
if (analysis.unsupported) {
  report = { unsupported: analysis.unsupported, source: analysis.pkg, root };
} else {
  mkdirSync(opts.out, { recursive: true });
  report = { ...convert(analysis, { root, outDir: opts.out, allow: opts.allow, name: opts.name }), root };
}
writeFileSync(join(opts.out, 'report.json'), JSON.stringify(report, (k, v) => (v instanceof Set ? [...v] : v), 2) + '\n');
console.log(opts.json ? JSON.stringify(report, null, 2) : renderReport(report));
if (report.errors?.length) process.exitCode = 1;
