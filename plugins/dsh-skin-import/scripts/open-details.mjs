#!/usr/bin/env node
// Print (and optionally open) the deep link to a local plugin's detail page.
//
// The URL scheme depends on which MiniMax Code build is running: "minimax" (international),
// "minimax-cn" (China), with "-test" / "-staging" suffixes for test and pre-release builds, and
// development builds may register none. A plugin cannot read it from the runtime, so the caller
// must pass it explicitly; without --scheme nothing is opened.
//
// Usage: node scripts/open-details.mjs <plugin-name> [--scheme <scheme>] [--open]
// Prints one JSON line: { url, opened, launched, manualPath, note }.
//   opened is never true: the OS only reports that some app accepted the link, not that the
//   running MiniMax Code instance showed the page. launched=true means the OS accepted it.
import { spawnSync } from 'node:child_process';

const NAME = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u;
const SCHEME = /^minimax(?:-[a-z]+)*$/u;
const args = process.argv.slice(2);
const name = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--scheme');
const scheme = args.includes('--scheme') ? args[args.indexOf('--scheme') + 1] : process.env.MCODE_DEEPLINK_SCHEME;
const wantOpen = args.includes('--open');
if (!name || !NAME.test(name)) {
  console.error('usage: node scripts/open-details.mjs <plugin-name> [--scheme <scheme>] [--open]');
  process.exit(2);
}
const manualPath = '插件管理 → ' + name + ' → 插件设置';
if (!scheme || !SCHEME.test(scheme)) {
  console.log(JSON.stringify({ url: null, opened: false, launched: false, manualPath, note: 'scheme unknown: give the user the manual path' }));
  process.exit(0);
}
const url = scheme + '://plugin/details?name=' + encodeURIComponent(name);
if (!wantOpen) {
  console.log(JSON.stringify({ url, opened: false, launched: false, manualPath, note: 'not opened (no --open)' }));
  process.exit(0);
}
const [cmd, cmdArgs] = process.platform === 'darwin' ? ['open', [url]]
  : process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]]
  : ['xdg-open', [url]];
const r = spawnSync(cmd, cmdArgs, { stdio: 'ignore', timeout: 10000, windowsVerbatimArguments: process.platform === 'win32' });
const launched = !r.error && r.status === 0;
console.log(JSON.stringify({ url, opened: false, launched, manualPath, note: launched ? 'link handed to the OS; ask the user whether the detail page appeared' : 'the OS could not open the link' }));
process.exitCode = launched ? 0 : 1;
