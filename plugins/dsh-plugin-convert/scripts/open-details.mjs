#!/usr/bin/env node
// Print (and optionally open) the deep link to a local plugin's detail page, where its plugin
// settings are. The scheme comes from MCODE_APP_SCHEME or --scheme (see lib/deeplink.mjs).
//
// Usage: node scripts/open-details.mjs <plugin-name> [--scheme <scheme>] [--open]
// Prints one JSON line: { url, opened, launched, manualPath, note }.
//   opened is never true: the OS only reports that some app accepted the link, not that the
//   running MiniMax Code instance showed the page. launched=true means the OS accepted it.
import { PLUGIN_NAME, buildUrl, launch, positional, resolveScheme } from './lib/deeplink.mjs';

const args = process.argv.slice(2);
const name = positional(args);
if (!name || !PLUGIN_NAME.test(name)) {
  console.error('usage: node scripts/open-details.mjs <plugin-name> [--scheme <scheme>] [--open]');
  process.exit(2);
}
const manualPath = '插件管理 → ' + name + ' → 插件设置';
const scheme = resolveScheme(args);
if (!scheme) {
  console.log(JSON.stringify({ url: null, opened: false, launched: false, manualPath, note: 'scheme unknown: give the user the manual path' }));
  process.exit(0);
}
const url = buildUrl(scheme, 'details', name);
if (!args.includes('--open')) {
  console.log(JSON.stringify({ url, opened: false, launched: false, manualPath, note: 'not opened (no --open)' }));
  process.exit(0);
}
const launched = launch(url);
console.log(JSON.stringify({ url, opened: false, launched, manualPath, note: launched ? 'link handed to the OS; ask the user whether the detail page appeared' : 'the OS could not open the link' }));
process.exitCode = launched ? 0 : 1;
