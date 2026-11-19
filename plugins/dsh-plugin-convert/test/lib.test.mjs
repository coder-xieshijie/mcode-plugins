import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrast, ensureContrast, parseColor, toHex } from '../scripts/lib/color.mjs';
import { objectsAround, parseLiteralAt, UNRESOLVED } from '../scripts/lib/literal.mjs';
import { classifySelector, extractBlocks, extractFontFaces, resolveVariants } from '../scripts/lib/css.mjs';
import { CODE_TOKENS, COLOR_TOKENS, contrastReport, deriveMode } from '../scripts/lib/derive.mjs';
import { mapDshMode } from '../scripts/lib/mapping.mjs';

const hex = (s, v) => { const c = parseColor(s, v); return c ? toHex(c) : null; };

test('colour functions evaluate to hex', () => {
  assert.equal(hex('#abc'), '#aabbcc');
  assert.equal(hex('rgba(42, 44, 50, 0.92)'), '#2a2c32eb');
  assert.equal(hex('rgb(34 197 94 / 8%)'), '#22c55e14');
  assert.equal(hex('hsl(210 50% 40%)'), '#336699');
  assert.equal(hex('oklch(62.8% 0.2577 29.23)'), '#ff0000');
  assert.equal(hex('color-mix(in srgb, #ff0000 50%, #0000ff)'), '#800080');
  assert.equal(hex('color-mix(in srgb, #313244 45%, transparent)'), '#31324473');
  assert.equal(hex('transparent'), '#00000000');
});

test('var() resolves through the resolver, falls back, and calc() works', () => {
  const vars = { '--a': 'var(--b)', '--b': '#102030' };
  assert.equal(hex('var(--a)', (n) => vars[n]), '#102030');
  assert.equal(hex('var(--missing, #fff)', () => undefined), '#ffffff');
  assert.equal(hex('rgba(255,255,255, calc(var(--scrim, 0) * .45 + .1))', () => undefined), '#ffffff1a');
  assert.equal(hex('var(--missing)', () => undefined), null);
  assert.equal(hex('var(--loop)', (n) => (n === '--loop' ? 'var(--loop)' : undefined)), null);
});

test('ensureContrast reaches the target, even on mid-tone backgrounds', () => {
  const bg = parseColor('#4d6bfe');
  const fixed = ensureContrast('#fbfcff', [bg], 4.5);
  assert.ok(contrast(fixed, bg) >= 4.5);
});

test('literal reader skips code and keeps data', () => {
  const src = 'const X = { a: "1", // note\n b: [1, 2, f()], ...rest, c: `t`, d() { return 1 }, e: cond ? 1 : 2, "--k": \'v\' };';
  const { value } = parseLiteralAt(src, src.indexOf('{'));
  assert.deepEqual(value, { a: '1', b: [1, 2], c: 't', '--k': 'v' });
  assert.deepEqual(value.__spreads, ['rest']);
  const found = objectsAround('var T = [{ id: "x", colorScheme: "dark", tokens: { "--dsw-a": "#000" } }]', /colorScheme/u);
  assert.equal(found[0].value.id, 'x');
  assert.equal(parseLiteralAt('foo(1)', 0).value, UNRESOLVED);
});

test('selectors: theme-level only, dark detection, variants, toggles dropped', () => {
  assert.deepEqual(classifySelector(':root'), { mode: 'both', variant: [] });
  assert.deepEqual(classifySelector('body[data-ds-dark-theme]'), { mode: 'dark', variant: [] });
  assert.deepEqual(classifySelector('body[data-x][data-x-palette=a]:not([data-ds-dark-theme])'), { mode: 'light', variant: ['data-x-palette=a'] });
  assert.equal(classifySelector('[data-glass] body'), null);
  assert.equal(classifySelector('body[data-x-typeface=host]'), null);
  assert.equal(classifySelector('.card'), null);
});

test('variant cascade merges base blocks under each card', () => {
  const css = 'body[p=1]{--dsw-a:#111;--dsw-b:#222}body[p=1][data-y-palette=c]{--dsw-b:#333}';
  const v = resolveVariants(extractBlocks(css.replace(/p=1/gu, 'data-y-palette=main')));
  const card = v.find((x) => x.variant.length === 2);
  assert.deepEqual(card.modes.light, { '--dsw-a': '#111', '--dsw-b': '#333' });
});

test('@font-face with data URI keeps the full src', () => {
  const faces = extractFontFaces('@font-face{font-family:"A B";src:url(data:font/woff2;base64,AAAA) format("woff2");font-weight:400}');
  assert.equal(faces[0].family, 'A B');
  assert.equal(faces[0].urls[0], 'data:font/woff2;base64,AAAA');
});

test('derived mode has every token, opaque surfaces and readable text', () => {
  for (const [mode, seed] of [
    ['light', { canvas: '#ffffff', text: '#777777', accent: '#9ec5ff' }],
    ['dark', { canvas: '#101010', text: '#555555', accent: '#3355aa', overlay: 'rgba(30,30,30,0.2)' }],
  ]) {
    const out = deriveMode(seed, mode);
    assert.deepEqual(Object.keys(out.colors).sort(), [...COLOR_TOKENS].sort());
    assert.deepEqual(Object.keys(out.code).sort(), [...CODE_TOKENS].sort());
    for (const v of [...Object.values(out.colors), ...Object.values(out.code), ...Object.values(out.backdrop)]) assert.match(v, /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/u);
    const r = contrastReport(out, mode);
    assert.ok(r.primary.ratio >= 4.5 && r.secondary.ratio >= 4.5 && r.accent.ratio >= 4.5 && r.inverted.ratio >= 4.5 && r.tertiary.ratio >= 3);
    assert.ok(out.adjustments.length > 0);
  }
});

test('DSH mapping takes skin values and a chromatic accent', () => {
  const m = mapDshMode({ '--dsw-alias-bg-base': '#101218', '--dsw-alias-label-primary': '#eeeeee', '--dsw-alias-brand-primary': '#0f0f0f', '--dsw-focus-ring-color': '#a093fb', '--dsw-alias-file-diff-added-bg': '#00ff0020' }, 'dark');
  assert.equal(m.explicit.bg_default_primary, '#101218');
  assert.equal(m.explicit.text_default_primary, '#eeeeee');
  assert.equal(m.explicit.border_accent, '#a093fb');
  assert.ok(m.lost.includes('--dsw-alias-file-diff-added-bg'));
  assert.equal(m.explicit.bg_default_secondary, undefined);
});
