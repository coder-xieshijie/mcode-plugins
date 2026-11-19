// Static reader for JavaScript object/array literals. It never evaluates code: values that are
// not plain literals (identifiers, calls, spreads, functions) become UNRESOLVED and are skipped.

export const UNRESOLVED = Symbol('unresolved');

const WS = /\s/u;

export function skipSpace(src, i) {
  for (;;) {
    while (i < src.length && WS.test(src[i])) i++;
    if (src.startsWith('//', i)) { const n = src.indexOf('\n', i); i = n < 0 ? src.length : n + 1; continue; }
    if (src.startsWith('/*', i)) { const n = src.indexOf('*/', i + 2); i = n < 0 ? src.length : n + 2; continue; }
    return i;
  }
}

function readString(src, i) {
  const q = src[i];
  let out = '';
  let j = i + 1;
  while (j < src.length) {
    const ch = src[j];
    if (ch === '\\') {
      const n = src[j + 1];
      const map = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' };
      if (n === 'u') {
        if (src[j + 2] === '{') { const e = src.indexOf('}', j); out += String.fromCodePoint(parseInt(src.slice(j + 3, e), 16)); j = e + 1; continue; }
        out += String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16)); j += 6; continue;
      }
      if (n === 'x') { out += String.fromCharCode(parseInt(src.slice(j + 2, j + 4), 16)); j += 4; continue; }
      if (n === '\n') { j += 2; continue; }
      out += map[n] ?? n; j += 2; continue;
    }
    if (q === '`' && ch === '$' && src[j + 1] === '{') return { value: UNRESOLVED, end: skipTemplate(src, i) };
    if (ch === q) return { value: out, end: j + 1 };
    out += ch; j++;
  }
  throw new Error('unterminated string');
}

function skipTemplate(src, i) {
  let j = i + 1;
  while (j < src.length) {
    const ch = src[j];
    if (ch === '\\') { j += 2; continue; }
    if (ch === '`') return j + 1;
    if (ch === '$' && src[j + 1] === '{') { j = skipExpression(src, j + 2, '}') + 1; continue; }
    j++;
  }
  return j;
}

/** Skip an expression until a top-level terminator ("," or a closing bracket). Returns its index. */
export function skipExpression(src, i, closer) {
  let depth = 0;
  let j = i;
  while (j < src.length) {
    j = skipSpace(src, j);
    const ch = src[j];
    if (ch === undefined) return j;
    if (ch === '"' || ch === "'") { j = readString(src, j).end; continue; }
    if (ch === '`') { j = skipTemplate(src, j); continue; }
    if (ch === '(' || ch === '[' || ch === '{') { depth++; j++; continue; }
    if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) return j;
      depth--; j++; continue;
    }
    if (depth === 0 && ch === ',') return j;
    if (closer && depth === 0 && ch === closer) return j;
    j++;
  }
  return j;
}

/**
 * Parse the literal starting at src[i]. Returns { value, end }. Objects keep UNRESOLVED
 * values out; their spread sources are listed in a non-enumerable "__spreads" array.
 */
export function parseLiteralAt(src, i) {
  i = skipSpace(src, i);
  const ch = src[i];
  if (ch === '{') return parseObject(src, i);
  if (ch === '[') return parseArray(src, i);
  if (ch === '"' || ch === "'" || ch === '`') return readString(src, i);
  const num = /^-?(?:0x[0-9a-f]+|\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?)/iu.exec(src.slice(i, i + 40));
  if (num) {
    const end = i + num[0].length;
    const next = skipSpace(src, end);
    if (/[,}\]]/u.test(src[next] ?? ',')) return { value: Number(num[0]), end };
  }
  for (const [word, value] of [['true', true], ['false', false], ['null', null], ['void 0', undefined], ['undefined', undefined]]) {
    if (src.startsWith(word, i) && !/[\w$]/u.test(src[i + word.length] ?? '')) {
      const next = skipSpace(src, i + word.length);
      if (/[,}\]]/u.test(src[next] ?? ',')) return { value, end: i + word.length };
    }
  }
  return { value: UNRESOLVED, end: skipExpression(src, i) };
}

function parseObject(src, i) {
  const obj = {};
  const spreads = [];
  let j = skipSpace(src, i + 1);
  while (src[j] !== '}') {
    if (j >= src.length) throw new Error('unterminated object');
    if (src.startsWith('...', j)) {
      const end = skipExpression(src, j + 3);
      spreads.push(src.slice(j + 3, end).trim());
      j = end;
    } else {
      let key;
      let k = j;
      if (src[k] === '"' || src[k] === "'") { const r = readString(src, k); key = r.value; k = r.end; }
      else if (src[k] === '[') { k = skipExpression(src, k + 1) + 1; key = UNRESOLVED; }
      else {
        const m = /^(?:async\s+|get\s+|set\s+|\*\s*)?([\w$]+)/u.exec(src.slice(k, k + 200));
        if (!m) throw new Error('bad key at ' + k);
        key = m[1]; k += m[0].length;
      }
      k = skipSpace(src, k);
      if (src[k] === ':') {
        const r = parseLiteralAt(src, k + 1);
        if (key !== UNRESOLVED && r.value !== UNRESOLVED) obj[key] = r.value;
        j = r.end;
      } else if (src[k] === '(') {
        // method: skip params and body
        k = skipExpression(src, k);
        j = k;
      } else {
        j = k; // shorthand property: unresolved
      }
    }
    j = skipSpace(src, j);
    if (src[j] === ',') j = skipSpace(src, j + 1);
    else if (src[j] !== '}') j = skipExpression(src, j);
  }
  Object.defineProperty(obj, '__spreads', { value: spreads, enumerable: false });
  return { value: obj, end: j + 1 };
}

function parseArray(src, i) {
  const arr = [];
  let j = skipSpace(src, i + 1);
  while (src[j] !== ']') {
    if (j >= src.length) throw new Error('unterminated array');
    if (src.startsWith('...', j)) j = skipExpression(src, j + 3);
    else {
      const r = parseLiteralAt(src, j);
      if (r.value !== UNRESOLVED) arr.push(r.value);
      j = r.end;
    }
    j = skipSpace(src, j);
    if (src[j] === ',') j = skipSpace(src, j + 1);
    else if (src[j] !== ']') j = skipExpression(src, j);
  }
  return { value: arr, end: j + 1 };
}

/**
 * Find the "{" that opens the object literal containing position pos, scanning backwards and
 * skipping double/single-quoted strings. Good enough for data literals in bundled code.
 */
export function enclosingObjectStart(src, pos) {
  let depth = 0;
  for (let i = pos - 1; i >= 0; i--) {
    const ch = src[i];
    if (ch === '"' || ch === "'") {
      let k = i - 1;
      while (k >= 0 && !(src[k] === ch && src[k - 1] !== '\\')) k--;
      i = k;
      continue;
    }
    if (ch === '}' || ch === ']') depth++;
    else if (ch === '{' || ch === '[') {
      if (depth === 0) return ch === '{' ? i : -1;
      depth--;
    }
  }
  return -1;
}

/** All object literals that contain a match of pattern, parsed statically. */
export function objectsAround(src, pattern) {
  const found = [];
  const seen = new Set();
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  let m;
  while ((m = re.exec(src))) {
    const start = enclosingObjectStart(src, m.index);
    if (start < 0 || seen.has(start)) continue;
    seen.add(start);
    try {
      const r = parseLiteralAt(src, start);
      found.push({ value: r.value, start, end: r.end, name: bindingName(src, start) });
    } catch {
      // not a plain literal; ignore
    }
  }
  return found;
}

/** "const foo = {" / "foo: {" / "exports.foo = {" → foo */
export function bindingName(src, start) {
  const before = src.slice(Math.max(0, start - 120), start);
  const m = /(?:(?:const|let|var)\s+|exports\.|["']?)([\w$-]+)["']?\s*[:=]\s*$/u.exec(before);
  return m ? m[1] : undefined;
}
