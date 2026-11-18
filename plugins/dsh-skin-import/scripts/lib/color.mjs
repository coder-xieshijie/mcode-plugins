// Colour parsing, CSS colour-function evaluation and colour math. Zero dependencies.
// Supports: #rgb[a] / #rrggbb[aa], named colours, rgb()/rgba(), hsl()/hsla(), oklch(), oklab(),
// color-mix(in <space>, ...), var(--x, fallback) through a resolver, and calc() in numeric slots.

const NAMED = {
  transparent: [0, 0, 0, 0], white: [255, 255, 255, 1], black: [0, 0, 0, 1],
  red: [255, 0, 0, 1], green: [0, 128, 0, 1], blue: [0, 0, 255, 1], gray: [128, 128, 128, 1],
  grey: [128, 128, 128, 1], silver: [192, 192, 192, 1], yellow: [255, 255, 0, 1],
  orange: [255, 165, 0, 1], purple: [128, 0, 128, 1], pink: [255, 192, 203, 1],
};

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export function rgba(r, g, b, a = 1) {
  return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a: clamp(a) };
}

export function parseHex(text) {
  const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/iu.exec(String(text).trim());
  if (!m) return null;
  let h = m[1];
  if (h.length <= 4) h = [...h].map((c) => c + c).join('');
  const n = (i) => parseInt(h.slice(i, i + 2), 16);
  return rgba(n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1);
}

const hex2 = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');

/** '#rrggbb', or '#rrggbbaa' when not opaque. */
export function toHex(c) {
  const base = '#' + hex2(c.r) + hex2(c.g) + hex2(c.b);
  const a = Math.round(clamp(c.a) * 255);
  return a >= 255 ? base : base + hex2(a);
}

export function toHex6(c) {
  return '#' + hex2(c.r) + hex2(c.g) + hex2(c.b);
}

// ---------- colour spaces ----------
const toLinear = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const fromLinear = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.sign(v) * Math.abs(v) ** (1 / 2.4) - 0.055);

export function rgbToOklab(c) {
  const r = toLinear(c.r), g = toLinear(c.g), b = toLinear(c.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    alpha: c.a,
  };
}

export function oklabToRgb({ L, a, b, alpha = 1 }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return rgba(
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    alpha,
  );
}

export function oklchToRgb(L, C, H, alpha = 1) {
  const h = (H * Math.PI) / 180;
  return oklabToRgb({ L, a: C * Math.cos(h), b: C * Math.sin(h), alpha });
}

export function rgbToOklch(c) {
  const { L, a, b, alpha } = rgbToOklab(c);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C: Math.hypot(a, b), H, alpha };
}

export function hslToRgb(h, s, l, alpha = 1) {
  h = (((h % 360) + 360) % 360) / 360;
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return rgba(f(0) * 255, f(8) * 255, f(4) * 255, alpha);
}

export function rgbToHsl(c) {
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l, alpha: c.a };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l, alpha: c.a };
}

// ---------- math ----------
/** Mix in sRGB; t is the weight of b (0..1). */
export function mix(a, b, t) {
  a = asColor(a); b = asColor(b);
  return rgba(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t, a.a + (b.a - a.a) * t);
}

export function withAlpha(c, alpha) {
  c = asColor(c);
  return rgba(c.r, c.g, c.b, alpha);
}

/** Paint fg (with its alpha) over an opaque bg. */
export function composite(fg, bg) {
  fg = asColor(fg); bg = asColor(bg);
  const a = fg.a;
  return rgba(fg.r * a + bg.r * (1 - a), fg.g * a + bg.g * (1 - a), fg.b * a + bg.b * (1 - a), 1);
}

export function luminance(c) {
  c = asColor(c);
  return 0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b);
}

export function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function isLight(c) {
  return luminance(c) > 0.35;
}

/** Shift lightness (HSL) until the colour reaches the target contrast on every background. */
export function ensureContrast(value, backgrounds, target = 4.5) {
  const base = asColor(value);
  const bgs = [].concat(backgrounds).map(asColor);
  const min = (c) => Math.min(...bgs.map((bg) => contrast(c, bg)));
  if (min(base) >= target) return base;
  const hsl = rgbToHsl(base);
  const dirs = isLight(bgs[0]) ? [-1, 1] : [1, -1];
  for (const dir of dirs) {
    for (let step = 1; step <= 50; step++) {
      const c = hslToRgb(hsl.h, hsl.s, clamp(hsl.l + dir * step * 0.02), base.a);
      if (min(c) >= target) return c;
    }
  }
  const candidates = [rgba(23, 23, 23), rgba(247, 247, 245), rgba(0, 0, 0), rgba(255, 255, 255)];
  return candidates.find((c) => min(c) >= target) ?? candidates.reduce((a, b) => (min(b) > min(a) ? b : a));
}

export function asColor(c) {
  if (c && typeof c === 'object') return c;
  const parsed = parseColor(String(c));
  if (!parsed) throw new Error('not a colour: ' + c);
  return parsed;
}

// ---------- CSS value parsing ----------
/**
 * Parse a CSS colour string. resolveVar(name) returns the raw value of a custom property
 * (or undefined). Returns null when the value is not a resolvable colour.
 */
export function parseColor(text, resolveVar = () => undefined) {
  try {
    const expanded = substituteVars(String(text), resolveVar);
    if (expanded === null) return null;
    const nodes = parseValue(expanded);
    if (nodes.length !== 1) return null;
    return evalColorNode(nodes[0]);
  } catch {
    return null;
  }
}

/** Replace var() references (innermost first). Returns null on unresolvable or cyclic refs. */
export function substituteVars(text, resolveVar, depth = 0) {
  if (depth > 24) return null;
  let out = text;
  for (let guard = 0; guard < 400; guard++) {
    const i = out.lastIndexOf('var(');
    if (i < 0) return out;
    const end = matchParen(out, i + 3);
    if (end < 0) return null;
    const inner = out.slice(i + 4, end);
    const comma = topLevelIndex(inner, ',');
    const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
    const fallback = comma < 0 ? undefined : inner.slice(comma + 1).trim();
    let value = resolveVar(name);
    if (value !== undefined && value !== null) {
      value = substituteVars(String(value), resolveVar, depth + 1);
    }
    if (value === undefined || value === null) value = fallback;
    if (value === undefined || value === null) return null;
    out = out.slice(0, i) + value + out.slice(end + 1);
  }
  return null;
}

export function matchParen(s, open) {
  let depth = 0, quote = null;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function topLevelIndex(s, needle) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (depth === 0 && ch === needle) return i;
  }
  return -1;
}

/** Split a value into top-level components: {fn, args:[[nodes]]} | {num, unit} | {word} | {op}. */
export function parseValue(text) {
  const nodes = [];
  let i = 0;
  const s = text.trim();
  while (i < s.length) {
    const ch = s[i];
    if (/\s/u.test(ch)) { i++; continue; }
    if (ch === ',' ) { nodes.push({ op: ',' }); i++; continue; }
    if (ch === '/' || ch === '*') { nodes.push({ op: ch }); i++; continue; }
    if ((ch === '+' || ch === '-') && (i + 1 >= s.length || /\s/u.test(s[i + 1]))) { nodes.push({ op: ch }); i++; continue; }
    const num = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/iu.exec(s.slice(i));
    if (num) {
      const j = i + num[0].length;
      const unit = /^(?:%|[a-z]+)/iu.exec(s.slice(j));
      nodes.push({ num: parseFloat(num[0]), unit: unit ? unit[0].toLowerCase() : '' });
      i = j + (unit ? unit[0].length : 0);
      continue;
    }
    if (ch === '#') {
      const m = /^#[0-9a-f]+/iu.exec(s.slice(i));
      nodes.push({ word: m ? m[0] : '#' });
      i += m ? m[0].length : 1;
      continue;
    }
    const word = /^-?[a-z_][a-z0-9_-]*/iu.exec(s.slice(i));
    if (word) {
      const after = i + word[0].length;
      if (s[after] === '(') {
        const end = matchParen(s, after);
        if (end < 0) throw new Error('unbalanced');
        const inner = s.slice(after + 1, end);
        nodes.push({ fn: word[0].toLowerCase(), args: splitArgs(inner).map(parseValue), raw: inner });
        i = end + 1;
      } else {
        nodes.push({ word: word[0] });
        i = after;
      }
      continue;
    }
    if (ch === '(') {
      const end = matchParen(s, i);
      nodes.push({ fn: 'calc', args: [parseValue(s.slice(i + 1, end))], raw: s.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    throw new Error('unexpected ' + ch);
  }
  return nodes;
}

function splitArgs(inner) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) { parts.push(inner.slice(start, i)); start = i + 1; }
  }
  parts.push(inner.slice(start));
  return parts;
}

/** Evaluate a numeric node: {num, unit}, calc(), min(), max(), clamp(). Returns {value, unit}. */
export function evalNumber(node) {
  if (node.num !== undefined) return { value: node.num, unit: node.unit };
  if (node.fn === 'calc') return evalArith(node.args[0]);
  if (node.fn === 'min' || node.fn === 'max') {
    const vals = node.args.map(evalArith);
    const pick = node.fn === 'min' ? Math.min : Math.max;
    return { value: pick(...vals.map((v) => v.value)), unit: vals[0].unit };
  }
  if (node.fn === 'clamp') {
    const [lo, v, hi] = node.args.map(evalArith);
    return { value: clamp(v.value, lo.value, hi.value), unit: v.unit };
  }
  throw new Error('not a number');
}

function evalArith(nodes) {
  // Two precedence levels: * / then + -.
  const terms = [];
  const ops = [];
  let i = 0;
  const factor = () => evalNumber(nodes[i++]);
  let acc = factor();
  const pending = [];
  while (i < nodes.length) {
    const op = nodes[i++].op;
    const rhs = factor();
    if (op === '*') acc = { value: acc.value * rhs.value, unit: acc.unit || rhs.unit };
    else if (op === '/') acc = { value: acc.value / rhs.value, unit: acc.unit };
    else if (op === '+' || op === '-') { pending.push(acc, op); acc = rhs; }
    else throw new Error('bad op');
  }
  pending.push(acc);
  let result = pending[0];
  for (let k = 1; k < pending.length; k += 2) {
    const r = pending[k + 1];
    result = { value: pending[k] === '+' ? result.value + r.value : result.value - r.value, unit: result.unit || r.unit };
  }
  void terms; void ops;
  return result;
}

function channel(node, scale, percentScale = scale) {
  if (node.word === 'none') return 0;
  const { value, unit } = evalNumber(node);
  return unit === '%' ? (value / 100) * percentScale : value * (scale === 255 ? 1 : 1);
}

function alphaOf(node) {
  if (!node) return 1;
  const { value, unit } = evalNumber(node);
  return clamp(unit === '%' ? value / 100 : value);
}

function hueOf(node) {
  if (node.word === 'none') return 0;
  const { value, unit } = evalNumber(node);
  if (unit === 'turn') return value * 360;
  if (unit === 'rad') return (value * 180) / Math.PI;
  return value;
}

/** Components of a colour function: comma or space syntax, optional "/ alpha". */
function components(node) {
  const flat = node.args.length > 1 ? node.args.map((a) => a[0]).filter(Boolean) : node.args[0].filter((n) => n.op !== ',');
  const slash = flat.findIndex((n) => n.op === '/');
  if (slash >= 0) return { parts: flat.slice(0, slash), alpha: flat[slash + 1] };
  return { parts: flat.slice(0, 3), alpha: flat[3] };
}

export function evalColorNode(node) {
  if (node.word) {
    if (node.word.startsWith('#')) return parseHex(node.word);
    const named = NAMED[node.word.toLowerCase()];
    return named ? rgba(...named) : null;
  }
  if (!node.fn) return null;
  switch (node.fn) {
    case 'rgb':
    case 'rgba': {
      const { parts, alpha } = components(node);
      if (parts.length !== 3) return null;
      return rgba(channel(parts[0], 255, 255), channel(parts[1], 255, 255), channel(parts[2], 255, 255), alphaOf(alpha));
    }
    case 'hsl':
    case 'hsla': {
      const { parts, alpha } = components(node);
      if (parts.length !== 3) return null;
      const s = evalNumber(parts[1]).value / 100, l = evalNumber(parts[2]).value / 100;
      return hslToRgb(hueOf(parts[0]), clamp(s), clamp(l), alphaOf(alpha));
    }
    case 'oklch': {
      const { parts, alpha } = components(node);
      if (parts.length !== 3) return null;
      const Ln = evalNumber(parts[0]);
      const Cn = evalNumber(parts[1]);
      const L = Ln.unit === '%' ? Ln.value / 100 : Ln.value;
      const C = Cn.unit === '%' ? (Cn.value / 100) * 0.4 : Cn.value;
      return oklchToRgb(L, C, hueOf(parts[2]), alphaOf(alpha));
    }
    case 'oklab': {
      const { parts, alpha } = components(node);
      if (parts.length !== 3) return null;
      const Ln = evalNumber(parts[0]);
      const ab = (n) => { const v = evalNumber(n); return v.unit === '%' ? (v.value / 100) * 0.4 : v.value; };
      return oklabToRgb({ L: Ln.unit === '%' ? Ln.value / 100 : Ln.value, a: ab(parts[1]), b: ab(parts[2]), alpha: alphaOf(alpha) });
    }
    case 'color-mix':
      return evalColorMix(node);
    default:
      return null;
  }
}

function evalColorMix(node) {
  if (node.args.length !== 3) return null;
  const spaceNodes = node.args[0];
  if (spaceNodes[0]?.word !== 'in') return null;
  const space = (spaceNodes[1]?.word || 'srgb').toLowerCase();
  const item = (nodes) => {
    let color = null, pct = null;
    for (const n of nodes) {
      if (n.num !== undefined && n.unit === '%') pct = n.num;
      else if (n.fn === 'calc' && !color && isPercentCalc(n)) pct = evalNumber(n).value;
      else color = evalColorNode(n);
    }
    return { color, pct };
  };
  const a = item(node.args[1]);
  const b = item(node.args[2]);
  if (!a.color || !b.color) return null;
  let p1 = a.pct, p2 = b.pct;
  if (p1 === null && p2 === null) { p1 = 50; p2 = 50; }
  else if (p1 === null) p1 = 100 - p2;
  else if (p2 === null) p2 = 100 - p1;
  const sum = p1 + p2;
  if (sum <= 0) return null;
  const t = p2 / sum;
  const alphaScale = sum < 100 ? sum / 100 : 1;
  return mixIn(space, a.color, b.color, t, alphaScale);
}

function isPercentCalc(node) {
  try { return evalNumber(node).unit === '%'; } catch { return false; }
}

/** CSS Color 5 mixing with premultiplied alpha. */
export function mixIn(space, c1, c2, t, alphaScale = 1) {
  const alpha = c1.a * (1 - t) + c2.a * t;
  const pre = (vals, a) => vals.map((v) => v * a);
  const un = (vals) => (alpha === 0 ? vals : vals.map((v) => v / alpha));
  let out;
  if (space === 'oklch' || space === 'oklab' || space === 'lab' || space === 'lch') {
    const A = rgbToOklab(c1), B = rgbToOklab(c2);
    if (space === 'oklch' || space === 'lch') {
      const a1 = rgbToOklch(c1), b1 = rgbToOklch(c2);
      let h1 = a1.H, h2 = b1.H;
      if (a1.C < 1e-4) h1 = h2; if (b1.C < 1e-4) h2 = h1;
      let dh = h2 - h1;
      if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
      const [L, C] = un([a1.L * c1.a * (1 - t) + b1.L * c2.a * t, a1.C * c1.a * (1 - t) + b1.C * c2.a * t]);
      out = oklchToRgb(L, C, h1 + dh * t, alpha);
    } else {
      const v1 = pre([A.L, A.a, A.b], c1.a), v2 = pre([B.L, B.a, B.b], c2.a);
      const [L, a, b] = un(v1.map((v, i) => v * (1 - t) + v2[i] * t));
      out = oklabToRgb({ L, a, b, alpha });
    }
  } else if (space === 'srgb-linear') {
    const v1 = pre([toLinear(c1.r), toLinear(c1.g), toLinear(c1.b)], c1.a);
    const v2 = pre([toLinear(c2.r), toLinear(c2.g), toLinear(c2.b)], c2.a);
    const [r, g, b] = un(v1.map((v, i) => v * (1 - t) + v2[i] * t));
    out = rgba(fromLinear(r), fromLinear(g), fromLinear(b), alpha);
  } else {
    const v1 = pre([c1.r, c1.g, c1.b], c1.a), v2 = pre([c2.r, c2.g, c2.b], c2.a);
    const [r, g, b] = un(v1.map((v, i) => v * (1 - t) + v2[i] * t));
    out = rgba(r, g, b, alpha);
  }
  out.a = clamp(out.a * alphaScale);
  return out;
}

/** Every colour literal (hex, rgb[a](), hsl[a](), oklch(), color-mix()) in a string, in order. */
export function colorsIn(text, resolveVar) {
  const found = [];
  const re = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|color-mix)\(/giu;
  let m;
  while ((m = re.exec(text))) {
    let raw = m[0];
    if (raw.endsWith('(')) {
      const end = matchParen(text, m.index + raw.length - 1);
      if (end < 0) continue;
      raw = text.slice(m.index, end + 1);
      re.lastIndex = end + 1;
    }
    const c = parseColor(raw, resolveVar);
    if (c) found.push(c);
  }
  return found;
}
