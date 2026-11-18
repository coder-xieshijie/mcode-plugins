#!/usr/bin/env node
// Open MiniMax Code on a local plugin's detail page (its plugin settings area).
// Usage: node scripts/open-details.mjs <plugin-name>
import { spawn } from 'node:child_process';

const name = process.argv[2];
if (!name || !/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u.test(name)) {
  console.error('usage: node scripts/open-details.mjs <plugin-name>');
  process.exit(2);
}
const url = 'minimax://plugin/details?name=' + encodeURIComponent(name);
const [cmd, args] = process.platform === 'darwin' ? ['open', [url]]
  : process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]]
  : ['xdg-open', [url]];
const child = spawn(cmd, args, { stdio: 'ignore', detached: true, windowsVerbatimArguments: process.platform === 'win32' });
child.on('error', (e) => { console.error('could not open ' + url + ': ' + e.message); process.exitCode = 1; });
child.unref();
console.log(url);
