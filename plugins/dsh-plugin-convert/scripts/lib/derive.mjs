// Derive a complete MCode theme mode (47 colour tokens, 9 code tokens, backdrop) from a small
// seed palette, then enforce text contrast. Explicit tokens (direct mappings) win over derived
// ones; every contrast fix is reported so converters and the preset build can show it.
import { asColor, composite, contrast, ensureContrast, isLight, mix, oklabToRgb, rgbToOklab, toHex, withAlpha } from './color.mjs';

export const COLOR_TOKENS = [
  'bg_default_primary', 'bg_default_primary_elevated', 'bg_default_secondary', 'bg_default_secondary_elevated',
  'bg_default_tertiary', 'bg_default_tertiary_elevated', 'bg_default_scrim', 'bg_grouped_primary',
  'bg_grouped_primary_elevated', 'bg_grouped_secondary', 'bg_grouped_secondary_elevated', 'bg_grouped_tertiary',
  'bg_grouped_tertiary_elevated', 'bg_interaction_accent_focus_blue', 'bg_interaction_accent_focus_highlight',
  'bg_interaction_primary_default', 'bg_interaction_primary_hover', 'bg_interaction_primary_press',
  'bg_interaction_primary_selected', 'bg_interaction_secondary_default', 'bg_interaction_secondary_hover',
  'bg_interaction_secondary_press', 'bg_interaction_secondary_selected', 'bg_interaction_tertiary_hover',
  'bg_interaction_tertiary_press', 'bg_interaction_tertiary_selected', 'bg_status_blue', 'border_accent',
  'border_default', 'border_heavy', 'border_light', 'icon_default_accent', 'icon_interaction_accent_accent',
  'icon_default_inverted', 'icon_default_primary', 'icon_default_secondary', 'icon_default_tertiary',
  'text_default_accent', 'text_default_inverted', 'text_default_primary', 'text_default_secondary',
  'text_default_tertiary', 'text_label_accent_default', 'text_label_accent_hover', 'text_label_accent_inactive',
  'text_label_accent_press', 'utility_scrollbar',
];
export const CODE_TOKENS = ['default', 'muted', 'comment', 'keyword', 'string', 'function', 'type', 'property', 'number'];

export const SURFACE_TOKENS = COLOR_TOKENS.filter((t) => t.startsWith('bg_default_') || t.startsWith('bg_grouped_'));
/** Surfaces that carry reading text (same set MCode's wallpaper theme checks). */
export const READING_SURFACES = [
  'bg_default_primary', 'bg_default_primary_elevated', 'bg_default_scrim',
  'bg_grouped_secondary', 'bg_grouped_secondary_elevated', 'bg_grouped_tertiary',
];

const hex = (c) => toHex(asColor(c));

/**
 * Code blocks (and inline code) sit on bg_grouped_tertiary over the page background. MCode draws
 * them with no other fill, so they need a visible step from bg_default_primary. Measured as OKLab
 * distance; thresholds come from checking the preset themes in a running instance (dark 0.06–0.08
 * read as "no edge"; 0.1 leaves a clear step).
 */
export const CODE_SURFACE_MIN_DELTA = { light: 0.045, dark: 0.1 };
export const CODE_SURFACE_TOKENS = ['bg_grouped_tertiary', 'bg_default_tertiary'];

export function oklabDistance(a, b) {
  const x = rgbToOklab(asColor(a));
  const y = rgbToOklab(asColor(b));
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b);
}

/** Move a surface's OKLab lightness away from the page until it is at least min apart. */
export function separateFrom(surface, page, min, mode) {
  const s = asColor(surface);
  if (oklabDistance(s, page) >= min) return s;
  const lab = rgbToOklab(s);
  const dir = mode === 'light' ? -1 : 1;
  for (let step = 1; step <= 60; step++) {
    const c = oklabToRgb({ ...lab, L: lab.L + dir * step * 0.004, alpha: 1 });
    if (oklabDistance(c, page) >= min) return c;
  }
  return oklabToRgb({ ...lab, L: lab.L + dir * 0.24, alpha: 1 });
}

/** Opaque colour a surface token shows over the canvas (or over black/white for a translucent canvas). */
export function surfaceOn(colors, token, mode) {
  const base = asColor(colors.bg_default_primary);
  const floor = base.a < 1 ? composite(base, mode === 'light' ? '#ffffff' : '#000000') : base;
  const c = asColor(colors[token]);
  return c.a < 1 ? composite(c, floor) : c;
}

/**
 * seed: { canvas, sidebar?, surface?, overlay?, tertiary?, text, text2?, text3?, accent,
 *         accentText?, primaryAction?, onPrimary?, border?, borderLight?, borderHeavy?,
 *         scrollbar?, info?, code?: {...}, backdrop?: {base, glowPrimary, glowSecondary}, glow?: [c, c] }
 */
export function deriveMode(seed, mode, explicit = {}) {
  const light = mode === 'light';
  const canvas = asColor(seed.canvas);
  const text = asColor(seed.text);
  const sidebar = asColor(seed.sidebar ?? (light ? mix(canvas, text, 0.04) : mix(canvas, '#000000', 0.18)));
  const surface = asColor(seed.surface ?? mix(canvas, light ? '#ffffff' : text, light ? 0.6 : 0.05));
  const overlay = asColor(seed.overlay ?? surface);
  const tertiary = asColor(seed.tertiary ?? mix(canvas, text, 0.08));
  const text2 = asColor(seed.text2 ?? mix(text, canvas, 0.3));
  const text3 = asColor(seed.text3 ?? mix(text, canvas, 0.48));
  const accent = asColor(seed.accent);
  const primaryAction = asColor(seed.primaryAction ?? text);
  const hoverTarget = canvas;
  const d = {};
  d.bg_default_primary = canvas;
  d.bg_default_primary_elevated = surface;
  d.bg_default_secondary = sidebar;
  d.bg_default_secondary_elevated = mix(sidebar, surface, 0.5);
  d.bg_default_tertiary = tertiary;
  d.bg_default_tertiary_elevated = mix(tertiary, surface, 0.5);
  d.bg_default_scrim = sidebar;
  d.bg_grouped_primary = sidebar;
  d.bg_grouped_primary_elevated = canvas;
  d.bg_grouped_secondary = surface;
  d.bg_grouped_secondary_elevated = overlay;
  d.bg_grouped_tertiary = tertiary;
  d.bg_grouped_tertiary_elevated = mix(tertiary, overlay, 0.5);
  d.bg_interaction_accent_focus_blue = accent;
  d.bg_interaction_accent_focus_highlight = mix(canvas, accent, 0.22);
  d.bg_interaction_primary_default = primaryAction;
  d.bg_interaction_primary_hover = mix(primaryAction, hoverTarget, 0.12);
  d.bg_interaction_primary_press = mix(primaryAction, hoverTarget, 0.22);
  d.bg_interaction_primary_selected = primaryAction;
  d.bg_interaction_secondary_default = withAlpha(text, 0.05);
  d.bg_interaction_secondary_hover = withAlpha(text, 0.09);
  d.bg_interaction_secondary_press = withAlpha(text, 0.14);
  d.bg_interaction_secondary_selected = withAlpha(accent, 0.16);
  d.bg_interaction_tertiary_hover = withAlpha(accent, 0.1);
  d.bg_interaction_tertiary_press = withAlpha(accent, 0.16);
  d.bg_interaction_tertiary_selected = withAlpha(accent, 0.13);
  d.bg_status_blue = mix(surface, asColor(seed.info ?? accent), 0.2);
  d.border_accent = accent;
  d.border_default = seed.border ? asColor(seed.border) : withAlpha(text, 0.15);
  d.border_light = seed.borderLight ? asColor(seed.borderLight) : withAlpha(text, 0.09);
  d.border_heavy = seed.borderHeavy ? asColor(seed.borderHeavy) : withAlpha(text, 0.72);
  d.icon_default_accent = accent;
  d.icon_interaction_accent_accent = accent;
  d.icon_default_primary = text;
  d.icon_default_secondary = text2;
  d.icon_default_tertiary = text3;
  d.text_default_primary = text;
  d.text_default_secondary = text2;
  d.text_default_tertiary = text3;
  const accentText = asColor(seed.accentText ?? accent);
  d.text_default_accent = accentText;
  d.text_label_accent_default = accentText;
  d.text_label_accent_hover = accentText;
  d.text_label_accent_press = accentText;
  d.text_label_accent_inactive = accentText;
  d.utility_scrollbar = seed.scrollbar ? asColor(seed.scrollbar) : withAlpha(text, 0.24);
  const onPrimary = asColor(seed.onPrimary ?? (contrast(canvas, primaryAction) >= contrast(text, primaryAction) ? canvas : text));
  d.text_default_inverted = onPrimary;
  d.icon_default_inverted = onPrimary;

  const colors = {};
  for (const token of COLOR_TOKENS) colors[token] = hex(explicit[token] ?? d[token]);
  const adjustments = [];

  // Translucent surfaces (glass in the source) would let the backdrop through: make them opaque.
  for (const token of SURFACE_TOKENS) {
    if (token === 'bg_default_primary') continue;
    const c = asColor(colors[token]);
    if (c.a < 0.5) {
      const fixed = hex(surfaceOn(colors, token, mode));
      adjustments.push({ token, from: colors[token], to: fixed, reason: 'translucent surface made opaque' });
      colors[token] = fixed;
    }
  }

  // Code block surface must stand apart from the page.
  const page = surfaceOn(colors, 'bg_default_primary', mode);
  for (const token of CODE_SURFACE_TOKENS) {
    const before = colors[token];
    const after = hex(separateFrom(surfaceOn(colors, token, mode), page, CODE_SURFACE_MIN_DELTA[mode] + 0.005, mode));
    if (after !== hex(surfaceOn(colors, token, mode))) {
      adjustments.push({ token, from: before, to: after, reason: 'code block surface distinct from page' });
      colors[token] = after;
    }
  }

  const fix = (token, backgrounds, target, reason) => {
    const before = colors[token];
    const after = hex(ensureContrast(before, backgrounds, target + 0.05));
    if (after !== before) {
      adjustments.push({ token, from: before, to: after, reason });
      colors[token] = after;
    }
  };
  const allSurfaces = SURFACE_TOKENS.map((t) => surfaceOn(colors, t, mode));
  const reading = READING_SURFACES.map((t) => surfaceOn(colors, t, mode));
  fix('text_default_primary', allSurfaces, 4.5, 'body text contrast >= 4.5');
  fix('text_default_secondary', reading, 4.5, 'secondary text contrast >= 4.5');
  fix('text_default_tertiary', reading, 3, 'tertiary text contrast >= 3');
  fix('text_default_accent', reading, 4.5, 'accent text contrast >= 4.5');
  fix('text_label_accent_default', reading, 4.5, 'accent label contrast >= 4.5');
  if (!explicit.icon_default_primary) colors.icon_default_primary = colors.text_default_primary;
  if (!explicit.icon_default_secondary) colors.icon_default_secondary = colors.text_default_secondary;
  if (!explicit.icon_default_tertiary) colors.icon_default_tertiary = colors.text_default_tertiary;
  const primarySurface = surfaceOn(colors, 'bg_interaction_primary_default', mode);
  fix('text_default_inverted', [primarySurface], 4.5, 'text on primary action >= 4.5');
  if (!explicit.icon_default_inverted || explicit.icon_default_inverted === explicit.text_default_inverted) colors.icon_default_inverted = colors.text_default_inverted;

  const labelBase = asColor(colors.text_label_accent_default);
  const shift = light ? '#000000' : '#ffffff';
  if (!explicit.text_label_accent_hover) colors.text_label_accent_hover = hex(ensureContrast(mix(labelBase, shift, 0.12), reading, 4.55));
  if (!explicit.text_label_accent_press) colors.text_label_accent_press = hex(ensureContrast(mix(labelBase, shift, 0.22), reading, 4.55));
  if (!explicit.text_label_accent_inactive) colors.text_label_accent_inactive = hex(ensureContrast(mix(labelBase, canvas.a < 1 ? reading[0] : canvas, 0.4), reading, 3));

  // Code colours.
  const code = {};
  const sc = seed.code ?? {};
  const codeBg = surfaceOn(colors, 'bg_default_primary', mode);
  const tone = (fallbackLight, fallbackDark) => ensureContrast(mix(accent, light ? fallbackLight : fallbackDark, 0.55), [codeBg], 3);
  const defaults = {
    default: colors.text_default_primary,
    muted: colors.text_default_tertiary,
    comment: colors.text_default_tertiary,
    keyword: tone('#713b94', '#d8a5ed'),
    string: tone('#317a4e', '#8dcc9b'),
    function: tone('#365f9f', '#9bb7ef'),
    type: tone('#875525', '#e2b77d'),
    property: tone('#995545', '#e79b88'),
    number: tone('#246d7a', '#86cbd6'),
  };
  for (const token of CODE_TOKENS) code[token] = hex(explicit['code.' + token] ?? sc[token] ?? defaults[token]);
  for (const token of ['muted', 'comment', 'keyword', 'string', 'function', 'type', 'property', 'number']) {
    const before = code[token];
    code[token] = hex(ensureContrast(before, [codeBg], 3.05));
    if (code[token] !== before) adjustments.push({ token: 'code.' + token, from: before, to: code[token], reason: 'code colour contrast >= 3' });
  }
  const beforeCode = code.default;
  code.default = hex(ensureContrast(code.default, [codeBg], 4.55));
  if (code.default !== beforeCode) adjustments.push({ token: 'code.default', from: beforeCode, to: code.default, reason: 'code text contrast >= 4.5' });

  const baseBackdrop = asColor(seed.backdrop?.base ?? (canvas.a < 1 ? reading[0] : mix(canvas, sidebar, 0.5)));
  const glow = seed.glow ?? [];
  const backdrop = {
    base: hex(baseBackdrop),
    glowPrimary: hex(seed.backdrop?.glowPrimary ?? (glow[0] ? composite(asColor(glow[0]), baseBackdrop) : mix(baseBackdrop, accent, light ? 0.28 : 0.22))),
    glowSecondary: hex(seed.backdrop?.glowSecondary ?? (glow[1] ? composite(asColor(glow[1]), baseBackdrop) : mix(baseBackdrop, light ? '#ffffff' : text, light ? 0.5 : 0.06))),
  };
  return { colors, code, backdrop, adjustments };
}

/** Minimum contrasts for a finished mode (used by the contrast checker and tests). */
export function contrastReport(modeDef, mode) {
  const colors = modeDef.colors;
  const all = SURFACE_TOKENS.map((t) => [t, surfaceOn(colors, t, mode)]);
  const reading = READING_SURFACES.map((t) => [t, surfaceOn(colors, t, mode)]);
  const worst = (fg, list) => list.reduce((acc, [t, bg]) => {
    const r = contrast(asColor(fg), bg);
    return r < acc.ratio ? { ratio: r, surface: t } : acc;
  }, { ratio: Infinity, surface: null });
  return {
    primary: worst(colors.text_default_primary, all),
    secondary: worst(colors.text_default_secondary, reading),
    tertiary: worst(colors.text_default_tertiary, reading),
    accent: worst(colors.text_default_accent, reading),
    inverted: worst(colors.text_default_inverted, [['bg_interaction_primary_default', surfaceOn(colors, 'bg_interaction_primary_default', mode)]]),
    code: modeDef.code ? worst(modeDef.code.default, [['bg_default_primary', surfaceOn(colors, 'bg_default_primary', mode)]]) : null,
    codeSurface: { ratio: oklabDistance(surfaceOn(colors, 'bg_grouped_tertiary', mode), surfaceOn(colors, 'bg_default_primary', mode)), surface: 'bg_grouped_tertiary' },
  };
}

export function isLightColor(c) {
  return isLight(asColor(c));
}
