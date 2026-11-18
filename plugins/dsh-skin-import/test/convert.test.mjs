import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzePackage } from '../scripts/lib/extract.mjs';
import { convert } from '../scripts/lib/convert.mjs';
import { validatePlugin } from '../scripts/lib/validate.mjs';
import { contrastReport } from '../scripts/lib/derive.mjs';

const fx = (name) => fileURLToPath(new URL('./fixtures/' + name, import.meta.url));
const out = () => mkdtempSync(join(tmpdir(), 'dsh-import-test-'));
const decl = (report) => JSON.parse(readFileSync(join(report.dir, 'appearance/appearance.json'), 'utf8'));

test('theme.register literals: themes, shiki merge, glow, radius, lost groups', () => {
  const a = analyzePackage(fx('theme-literal'));
  assert.deepEqual(a.themes.map((t) => t.id), ['demo-night', 'demo-day']);
  const r = convert(a, { root: fx('theme-literal'), outDir: out() });
  assert.deepEqual(r.errors, []);
  const d = decl(r);
  const night = d.themes[0];
  assert.deepEqual(Object.keys(night.modes), ['dark']);
  assert.equal(night.modes.dark.colors.bg_default_primary, '#101218');
  assert.equal(night.modes.dark.code.keyword, '#c792ea');
  assert.notEqual(night.modes.dark.backdrop.glowPrimary, night.modes.dark.backdrop.base);
  assert.equal(d.themes[1].recipe.shape.surfaceRadius, 14);
  assert.ok(r.lost.some((x) => x.startsWith('状态色')));
  assert.ok(r.lost.some((x) => x.includes('玻璃')));
  assert.ok(existsSync(join(r.dir, 'CONVERSION.md')) && existsSync(join(r.dir, 'LICENSES')));
  for (const t of d.themes) for (const [mode, def] of Object.entries(t.modes)) assert.ok(contrastReport(def, mode).primary.ratio >= 4.5);
});

test('CSS palette cards become named themes; host and glass blocks are ignored; OFL fonts packaged', () => {
  const a = analyzePackage(fx('css-variants'));
  assert.deepEqual(a.themes.map((t) => t.id).sort(), ['card-style-main', 'card-style-moss'].sort());
  const fonts = Object.fromEntries(a.fonts.map((f) => [f.family, f.license.status]));
  assert.deepEqual(fonts, { 'Demo Sans': 'ok', 'Demo Mono': 'ok' });
  const r = convert(a, { root: fx('css-variants'), outDir: out() });
  assert.deepEqual(r.errors, []);
  const d = decl(r);
  const moss = d.themes.find((t) => t.id === 'card-style-moss');
  assert.equal(moss.modes.light.colors.bg_default_primary, '#f6faf5');
  // The card's tertiary (#eeeeee, inherited from the main palette) is pushed away from the page so
  // code blocks keep an edge.
  assert.equal(moss.modes.light.colors.bg_default_tertiary, '#e7e7e7');
  assert.ok(r.themes.find((t) => t.id === 'card-style-moss').adjustments.some((a) => a.reason === 'code block surface distinct from page'));
  assert.equal(d.fonts.length, 2);
});

test('opencode theme.json resolves defs and dark/light pairs', () => {
  const a = analyzePackage(fx('opencode'));
  assert.equal(a.themes.length, 1);
  const r = convert(a, { root: fx('opencode'), outDir: out() });
  assert.deepEqual(r.errors, []);
  const t = decl(r).themes[0];
  assert.deepEqual(Object.keys(t.modes).sort(), ['dark', 'light']);
  assert.equal(t.modes.light.colors.bg_default_primary, '#f5f7fa');
  assert.equal(t.modes.dark.code.keyword, '#c4a7e7');
});

test('PALETTE literal (OKLCH) becomes a two-mode theme with labels', () => {
  const a = analyzePackage(fx('bloom-like'));
  assert.equal(a.themes[0].label, 'Petal Theme · 潮汐 Tide');
  const r = convert(a, { root: fx('bloom-like'), outDir: out() });
  assert.deepEqual(r.errors, []);
});

test('media without a licence statement waits for consent; NC media is restricted', () => {
  const a = analyzePackage(fx('media-unconfirmed'));
  assert.deepEqual(a.media.map((m) => [m.role, m.license.status]).sort(), [['boot', 'unconfirmed'], ['wallpaper', 'unconfirmed']]);
  const r = convert(a, { root: fx('media-unconfirmed'), outDir: out() });
  assert.equal(r.empty, true);
  assert.equal(r.pending.length, 2);
  const b = analyzePackage(fx('media-restricted'));
  assert.equal(b.media[0].license.status, 'restricted');
});

test('consented boot video gets the standard boot page and settings', () => {
  const root = fx('media-unconfirmed');
  const r = convert(analyzePackage(root), { root, outDir: out(), allow: new Set(['boot']) });
  assert.deepEqual(r.errors, []);
  const d = decl(r);
  assert.equal(d.pages[0].slot, 'boot');
  assert.equal(d.settings.find((s) => s.key === 'ending').default, 'dissolve');
  assert.equal(d.settings.find((s) => s.key === 'fade-ms').default, 1200);
  assert.equal(d.settings.find((s) => s.key === 'sound').default, false);
  assert.ok(existsSync(join(r.dir, 'pages/boot/boot.js')));
  assert.equal(validatePlugin(r.dir).length, 0);
});

test('known unsupported plugins only get a reason', () => {
  const a = analyzePackage(fx('unsupported'));
  assert.match(a.unsupported, /Wallpaper Engine/u);
});
