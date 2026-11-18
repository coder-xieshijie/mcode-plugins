// DSH --dsw-* / --shiki-* → MCode theme tokens. The table follows the DSH skin research
// (alias tokens of design-platform.css). Values are resolved with the skin's own variables first,
// then DSH's default scale for the mode (dsh-defaults.json), and written as #rrggbb[aa].
import { readFileSync } from 'node:fs';
import { asColor, parseColor, rgbToOklch, toHex } from './color.mjs';

const DEFAULTS = JSON.parse(readFileSync(new URL('./dsh-defaults.json', import.meta.url), 'utf8'));
export const DSH_DEFAULTS = DEFAULTS;

const A = (name) => '--dsw-alias-' + name;

/** [MCode token, DSH variables in priority order, match quality]. */
export const DSH_TOKEN_MAP = [
  ['bg_default_primary', [A('bg-base')], 'approx'],
  ['bg_default_primary_elevated', [A('bg-overlay'), A('button-elevated-fill')], 'approx'],
  ['bg_default_secondary', [A('bg-layer-1')], 'approx'],
  ['bg_grouped_primary', [A('bg-layer-1')], 'approx'],
  ['bg_default_tertiary', [A('bg-layer-3')], 'approx'],
  ['bg_grouped_secondary', ['--dsw-specific-sidebar-fill', A('bg-module-platform')], 'direct'],
  ['bg_grouped_secondary_elevated', [A('bg-layer-2'), '--dsw-menu-surface-fill'], 'approx'],
  ['bg_interaction_primary_default', [A('button-primary-fill')], 'direct'],
  ['bg_interaction_primary_hover', [A('button-primary-hover')], 'direct'],
  ['bg_interaction_secondary_hover', [A('interactive-bg-hover')], 'approx'],
  ['bg_interaction_secondary_press', [A('interactive-bg-active')], 'approx'],
  ['bg_interaction_tertiary_hover', [A('interactive-bg-hover')], 'approx'],
  ['bg_interaction_tertiary_press', [A('interactive-bg-active')], 'approx'],
  ['bg_interaction_accent_focus_highlight', [A('state-business-tertiary')], 'approx'],
  ['bg_status_blue', [A('state-business-tertiary')], 'approx'],
  ['text_default_primary', [A('label-primary')], 'direct'],
  ['text_default_secondary', [A('label-secondary')], 'direct'],
  ['text_default_tertiary', [A('label-tertiary')], 'direct'],
  ['text_default_inverted', [A('brand-text'), A('label-on-color'), A('label-primary-inverted')], 'direct'],
  ['icon_default_inverted', [A('brand-text'), A('label-on-color'), A('label-primary-inverted')], 'direct'],
  ['text_label_accent_default', [A('link')], 'approx'],
  ['border_light', [A('border-l1')], 'approx'],
  ['border_default', [A('border-l2')], 'approx'],
  ['border_heavy', [A('border-l3'), A('border-l4')], 'approx'],
  ['utility_scrollbar', [A('scrollbar-bg-l1')], 'direct'],
  ['code.default', ['--shiki-foreground'], 'direct'],
  ['code.comment', ['--shiki-token-comment'], 'direct'],
  ['code.keyword', ['--shiki-token-keyword'], 'direct'],
  ['code.string', ['--shiki-token-string'], 'direct'],
  ['code.function', ['--shiki-token-function'], 'direct'],
  ['code.number', ['--shiki-token-constant'], 'approx'],
  ['code.property', ['--shiki-token-parameter'], 'approx'],
  ['code.muted', ['--shiki-token-punctuation'], 'approx'],
];
/** Accent tokens take the first chromatic value of these. */
export const DSH_ACCENT_SOURCES = [A('state-business-primary'), '--dsw-focus-ring-color', A('brand-primary'), A('button-primary-fill')];
export const ACCENT_TOKENS = ['bg_interaction_accent_focus_blue', 'border_accent', 'icon_default_accent', 'icon_interaction_accent_accent', 'text_default_accent'];

const LOST_GROUPS = [
  ['状态色（成功/警告/错误）', /state-(?:success|warn|error|done)/u],
  ['代码与文件 diff', /diff/u],
  ['Markdown 代码块与行内代码底色', /markdown/u],
  ['提示、气泡与浮层（tooltip / toast / hovercard / bubble）', /tooltip|toast|hovercard|bubble|tip\b/u],
  ['遮罩', /mask|scrim/u],
  ['侧栏与输入框专用色（--dsw-specific-*）', /^--dsw-specific-/u],
  ['阴影', /shadow/u],
  ['图表、JSON 树与插画', /chart|json|illustration/u],
  ['DSH 基础色阶（--dsw-static-*，只用于求值）', /^--dsw-static-/u],
];

export function groupLost(names) {
  const groups = new Map();
  for (const name of names) {
    const hit = LOST_GROUPS.find(([, re]) => re.test(name));
    const label = hit ? hit[0] : '其他 DSH 变量';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(name);
  }
  return [...groups.entries()].map(([label, list]) => ({ label, count: list.length, examples: list.slice(0, 4) }));
}

function chroma(c) {
  return rgbToOklch(c).C;
}

/**
 * Map one mode of a DSH skin. vars: the skin's own custom properties for that mode.
 * Returns { explicit, seed, mapped:[{token, source}], lost:[names], radius?, fonts? }.
 */
export function mapDshMode(vars, mode) {
  const defaults = DEFAULTS[mode];
  const resolveSkin = (name) => (Object.hasOwn(vars, name) ? vars[name] : defaults[name]);
  const resolveDefault = (name) => defaults[name];
  const colorOf = (name, resolver = resolveSkin) => parseColor('var(' + name + ')', resolver);
  const skinValue = (name) => {
    const c = colorOf(name);
    if (!c) return null;
    const d = colorOf(name, resolveDefault);
    const touched = Object.hasOwn(vars, name) || !d || toHex(c) !== toHex(d);
    return touched ? c : null;
  };
  const used = new Set();
  const explicit = {};
  const mapped = [];
  for (const [token, sources, quality] of DSH_TOKEN_MAP) {
    for (const source of sources) {
      const c = skinValue(source);
      if (c) {
        explicit[token] = toHex(c);
        mapped.push({ token, source, quality });
        used.add(source);
        break;
      }
    }
  }
  // Accent: first chromatic skin value; otherwise DSH's default business colour.
  let accent = null;
  let accentSource = null;
  for (const source of DSH_ACCENT_SOURCES) {
    const c = skinValue(source);
    if (c && c.a > 0.5 && chroma(c) > 0.04) { accent = c; accentSource = source; break; }
  }
  if (accent) {
    for (const token of ACCENT_TOKENS) { explicit[token] = toHex(accent); mapped.push({ token, source: accentSource, quality: 'approx' }); }
    used.add(accentSource);
  }
  const pick = (token, fallbackVar) => explicit[token] ?? (colorOf(fallbackVar) ? toHex(colorOf(fallbackVar)) : undefined);
  const seed = {
    canvas: pick('bg_default_primary', A('bg-base')),
    text: pick('text_default_primary', A('label-primary')),
    text2: explicit.text_default_secondary,
    text3: explicit.text_default_tertiary,
    sidebar: explicit.bg_default_secondary,
    surface: explicit.bg_default_primary_elevated,
    overlay: explicit.bg_grouped_secondary_elevated,
    tertiary: explicit.bg_default_tertiary,
    accent: accent ? toHex(accent) : toHex(colorOf(A('state-business-primary')) ?? asColor(mode === 'light' ? '#4176e6' : '#7aaaff')),
    primaryAction: explicit.bg_interaction_primary_default,
    onPrimary: explicit.text_default_inverted,
    code: {},
  };
  for (const key of Object.keys(seed)) if (seed[key] === undefined) delete seed[key];
  // Radius and fonts, only when the skin changes them.
  const px = (name) => {
    if (!Object.hasOwn(vars, name)) return undefined;
    const m = /^(-?\d+(?:\.\d+)?)px$/u.exec(String(vars[name]).trim());
    return m ? Math.max(0, Math.min(64, Number(m[1]))) : undefined;
  };
  const shape = {
    controlRadius: px('--dsw-radius-sm'),
    surfaceRadius: px('--dsw-radius-md'),
    messageRadius: px('--dsw-radius-lg'),
    composerRadius: px('--dsw-radius-xl'),
  };
  for (const k of Object.keys(shape)) if (shape[k] === undefined) delete shape[k];
  for (const k of ['--dsw-radius-sm', '--dsw-radius-md', '--dsw-radius-lg', '--dsw-radius-xl']) if (Object.hasOwn(vars, k)) used.add(k);
  const families = (names) => {
    for (const name of names) {
      if (!Object.hasOwn(vars, name)) continue;
      used.add(name);
      const list = String(vars[name]).split(',').map((s) => s.trim().replace(/^["']|["']$/gu, '')).filter((s) => s && !s.includes('(') && !/^(?:inherit|initial|unset)$/u.test(s));
      if (list.length) return list.slice(0, 16);
    }
    return undefined;
  };
  const fonts = {
    ui: families(['--dsw-font-family', '--dsh-font-family-text']),
    code: families(['--ds-font-family-code', '--dsh-font-family-code']),
  };
  const lost = Object.keys(vars).filter((n) => !used.has(n) && (n.startsWith('--dsw-') || n.startsWith('--shiki-')));
  return { explicit, seed, mapped, lost, shape: Object.keys(shape).length ? shape : undefined, fonts: fonts.ui || fonts.code ? fonts : undefined };
}

/** Background colours from a CSS gradient string (dream-skin "glow"): [first, second, base]. */
export function glowColors(glow, resolver) {
  if (typeof glow !== 'string') return [];
  const out = [];
  const re = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch)\([^()]*\)/giu;
  for (const m of glow.matchAll(re)) {
    const c = parseColor(m[0], resolver);
    if (c && c.a > 0) out.push(c);
  }
  return out;
}
