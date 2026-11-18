// Extract custom-property blocks from CSS text (stylesheets, or CSS embedded in bundled JS
// strings). Only rules whose subject is :root / html / body (with attribute conditions) count.

const VARIANT_ATTR = /palette|theme|skin|scheme|flavou?r|variant|preset/iu;
const DARK_ATTR = 'data-ds-dark-theme';
// Valueless attributes that switch optional effects; blocks gated by them are not part of a theme.
const TOGGLE_ATTR = /glass|blur|frost|wallpaper|video|transparent|float|motion|reduce|fog|liquid|mica|translucen|backdrop|peek|zoom/iu;

function unescapeJs(text) {
  return text.replace(/\\(["'\\])/gu, '$1');
}

/** Declarations "--a: v; --b: w" → { '--a': 'v', ... } (custom properties only). */
export function parseDeclarations(body) {
  const out = {};
  let depth = 0, start = 0;
  const parts = [];
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ';' && depth === 0) { parts.push(body.slice(start, i)); start = i + 1; }
  }
  parts.push(body.slice(start));
  for (const part of parts) {
    const colon = part.indexOf(':');
    if (colon < 0) continue;
    const name = part.slice(0, colon).trim();
    if (!name.startsWith('--')) continue;
    const value = part.slice(colon + 1).replace(/!important\s*$/u, '').trim();
    if (value) out[name] = value;
  }
  return out;
}

/** Classify one selector. Returns null when it is not a theme-level selector. */
export function classifySelector(selector) {
  const sel = unescapeJs(selector).trim().replace(/\s+/gu, ' ');
  if (!/^(?:(?::root|html)(?:\[[^\]]*\]|:not\([^)]*\))*\s)?(?::root|html|body)(?:\[[^\]]*\]|:not\([^)]*\))*$/u.test(sel)) return null;
  let mode = 'both';
  const variant = [];
  const notDark = /:not\(\[data-ds-dark-theme[^)]*\)/u;
  if (notDark.test(sel)) mode = 'light';
  const stripped = sel.replace(/:not\([^)]*\)/gu, '');
  if (stripped.includes('[' + DARK_ATTR)) mode = 'dark';
  for (const m of stripped.matchAll(/\[([\w-]+)(?:([~|^$*]?=)["']?([^"'\]]*)["']?)?\]/gu)) {
    const [, attr, op, value] = m;
    if (attr === DARK_ATTR) continue;
    if (op === undefined) {
      if (TOGGLE_ATTR.test(attr)) return null;
      continue; // plugin-active marker
    }
    if (op !== '=' || !VARIANT_ATTR.test(attr)) return null;
    variant.push(attr + '=' + value);
  }
  // :not(...) conditions other than the dark-theme one gate optional behaviour.
  for (const m of sel.matchAll(/:not\(([^)]*)\)/gu)) if (!m[1].includes(DARK_ATTR)) return null;
  // prefers-color-scheme style data attributes on html
  return { mode, variant: variant.sort() };
}

/**
 * Every theme-level block in a text: [{ selector, mode, variant:[attr=value], vars, order }].
 * Media-query wrappers are dropped (their inner rules still count).
 */
export function extractBlocks(text, { requirePrefix = '--dsw-', stripComments = false } = {}) {
  if (stripComments) text = text.replace(/\/\*[\s\S]*?\*\//gu, ' ');
  const blocks = [];
  const re = /([^{}"'`;]+)\{([^{}]*)\}/gu;
  let m;
  let order = 0;
  while ((m = re.exec(text))) {
    const body = m[2];
    if (requirePrefix && !body.includes(requirePrefix)) continue;
    const vars = parseDeclarations(unescapeJs(body));
    if (Object.keys(vars).length === 0) continue;
    const head = m[1].includes('*/') ? m[1].slice(m[1].lastIndexOf('*/') + 2) : m[1];
    for (const selector of splitSelectors(head)) {
      const cls = classifySelector(selector);
      if (!cls) continue;
      blocks.push({ selector: selector.trim(), ...cls, vars, order: order++ });
    }
  }
  return blocks;
}

function splitSelectors(text) {
  const out = [];
  let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) { out.push(text.slice(start, i)); start = i + 1; }
  }
  out.push(text.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}

/**
 * Resolve blocks into themes: for every distinct variant attribute set and mode, merge the blocks
 * whose attributes are a subset (cascade: fewer attributes first, then source order).
 * Returns [{ variant:[...], modes: { light?: vars, dark?: vars } }].
 */
export function resolveVariants(blocks) {
  const keys = new Map();
  for (const b of blocks) keys.set(b.variant.join('&'), b.variant);
  const variantSets = [...keys.values()];
  const results = [];
  for (const target of variantSets) {
    const applicable = blocks
      .filter((b) => b.variant.every((v) => target.includes(v)))
      .sort((a, b) => a.variant.length - b.variant.length || (a.mode === 'both' ? 0 : 1) - (b.mode === 'both' ? 0 : 1) || a.order - b.order);
    const own = blocks.filter((b) => b.variant.join('&') === target.join('&'));
    const modes = {};
    const hasLight = own.some((b) => b.mode !== 'dark');
    const hasDark = own.some((b) => b.mode !== 'light');
    for (const mode of ['light', 'dark']) {
      if (mode === 'light' ? !hasLight : !hasDark) continue;
      const vars = {};
      for (const b of applicable) if (b.mode === 'both' || b.mode === mode) Object.assign(vars, b.vars);
      modes[mode] = vars;
    }
    results.push({ variant: target, modes });
  }
  return results;
}

/** @font-face blocks → [{ family, src:[url], weight, style }]. */
export function extractFontFaces(text) {
  const faces = [];
  for (const m of text.matchAll(/@font-face\s*\{([^}]*)\}/gu)) {
    const body = unescapeJs(m[1]);
    const get = (prop) => {
      const r = new RegExp('(?:^|;)\\s*' + prop + '\\s*:\\s*([^;]*)', 'iu').exec(body);
      return r ? r[1].trim() : undefined;
    };
    const family = get('font-family')?.replace(/^["']|["']$/gu, '').trim();
    if (!family || family.includes('${')) continue;
    const srcMatch = /(?:^|;)\s*src\s*:\s*((?:url\([^)]*\)|[^;])*)/iu.exec(body);
    const srcText = srcMatch ? srcMatch[1] : '';
    const urls = [...srcText.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gu)].map((u) => u[1]);
    faces.push({ family, urls, weight: get('font-weight'), style: get('font-style') });
  }
  return faces;
}
