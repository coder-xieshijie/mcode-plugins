#!/usr/bin/env node
// After installing a converted plugin that has a boot page, ask MiniMax Code to use it as the
// startup screen: the deep link plugin/boot does what the plugin's "Use as startup screen" switch
// does, and takes effect at the next start. It is the one appearance choice made for the user;
// themes, fonts and wallpapers stay the user's click. The scheme comes from MCODE_APP_SCHEME or
// --scheme (see lib/deeplink.mjs).
//
// Usage: node scripts/open-boot.mjs <installed-plugin-dir> [--scheme <scheme>] [--open]
// Prints one JSON line: { name, hasBootPage, url, launched, manualPath, note }.
//   launched=true only means the OS accepted the link; the switch in the plugin settings shows
//   whether MiniMax Code turned it on.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PLUGIN_NAME, buildUrl, launch, positional, resolveScheme } from './lib/deeplink.mjs';

const args = process.argv.slice(2);
const dir = positional(args);
const usage = 'usage: node scripts/open-boot.mjs <installed-plugin-dir> [--scheme <scheme>] [--open]';
if (!dir) {
  console.error(usage);
  process.exit(2);
}
let name;
let hasBootPage = false;
try {
  const root = resolve(dir);
  const manifest = JSON.parse(readFileSync(join(root, '.minimax-plugin/plugin.json'), 'utf8'));
  name = manifest.name;
  if (typeof manifest.appearance === 'string') {
    const decl = JSON.parse(readFileSync(join(root, manifest.appearance), 'utf8'));
    hasBootPage = Array.isArray(decl.pages) && decl.pages.some((page) => page && page.slot === 'boot');
  }
} catch (error) {
  console.error('not a readable MiniMax plugin directory: ' + dir + ' (' + String(error.message ?? error) + ')');
  process.exit(1);
}
if (typeof name !== 'string' || !PLUGIN_NAME.test(name)) {
  console.error('plugin.json has no valid name');
  process.exit(1);
}
const manualPath = '插件管理 → ' + name + ' → 插件设置 → 用作开机画面';
const out = (fields) => console.log(JSON.stringify({ name, hasBootPage, manualPath, ...fields }));
if (!hasBootPage) {
  out({ url: null, launched: false, note: 'no boot page: nothing to turn on' });
  process.exit(0);
}
const scheme = resolveScheme(args);
if (!scheme) {
  out({ url: null, launched: false, note: 'scheme unknown: tell the user to turn it on in the plugin settings' });
  process.exit(0);
}
const url = buildUrl(scheme, 'boot', name);
if (!args.includes('--open')) {
  out({ url, launched: false, note: 'not opened (no --open)' });
  process.exit(0);
}
const launched = launch(url);
out({ url, launched, note: launched ? 'link handed to the OS; the plugin settings switch shows whether it is on' : 'the OS could not open the link' });
process.exitCode = launched ? 0 : 1;
