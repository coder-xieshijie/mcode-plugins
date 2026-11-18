// Offline self-check of a generated plugin against the MiniMax Plugin V1 package limits and the
// appearance declaration rules (token names, colours, ids, paths, files, sizes). MiniMax Code's own
// reader stays the authority; this catches mistakes before installing.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { CODE_TOKENS, COLOR_TOKENS } from './derive.mjs';

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/u;
const NAME = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u;
const COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u;
const SEGMENT = /^[A-Za-z0-9._-]+$/u;
const MiB = 1024 * 1024;
const COLOR_SET = new Set(COLOR_TOKENS);
const CODE_SET = new Set(CODE_TOKENS);

export function validatePlugin(dir) {
  const errors = [];
  const err = (m) => errors.push(m);
  const files = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const rel = relative(dir, p).split(sep).join('/');
      if (!SEGMENT.test(name) || name.endsWith('.')) err('path segment not portable: ' + rel);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (st.isFile()) files.push({ rel, size: st.size });
      else err('special file: ' + rel);
    }
  };
  walk(dir);
  const total = files.reduce((s, f) => s + f.size, 0);
  if (files.length > 1024) err('more than 1024 files');
  if (total > 64 * MiB) err('package larger than 64 MiB');
  for (const f of files) if (f.size > 16 * MiB) err('file larger than 16 MiB: ' + f.rel);
  const size = (rel) => files.find((f) => f.rel === rel)?.size;

  let manifest;
  try { manifest = JSON.parse(readFileSync(join(dir, '.minimax-plugin/plugin.json'), 'utf8')); } catch { err('manifest unreadable'); return errors; }
  for (const k of ['schemaVersion', 'name', 'version', 'description', 'author', 'icon', 'category', 'exampleQueries', 'apps', 'mcpServers', 'skills']) if (manifest[k] === undefined) err('manifest missing ' + k);
  if (!NAME.test(manifest.name ?? '')) err('manifest name invalid');
  if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/u.test(manifest.version ?? '')) err('version is not SemVer');
  if (!size(manifest.icon)) err('icon missing');
  for (const s of manifest.skills ?? []) if (!size(s)) err('skill missing: ' + s);
  if (manifest.appearance === undefined) return errors;
  if (manifest.appearance !== 'appearance/appearance.json') err('appearance path must be appearance/appearance.json');
  let decl;
  try { decl = JSON.parse(readFileSync(join(dir, 'appearance/appearance.json'), 'utf8')); } catch { err('appearance.json unreadable'); return errors; }
  if (decl.schemaVersion !== 1) err('schemaVersion must be 1');
  const color = (v, at) => { if (typeof v !== 'string' || !COLOR.test(v)) err('bad colour at ' + at); };
  const ids = (list, key, kind) => {
    const seen = new Set();
    for (const item of list ?? []) {
      const id = item[key];
      if (kind !== 'pages' && !ID.test(id ?? '')) err(kind + ' id invalid: ' + id);
      if (seen.has(id)) err(kind + ' id duplicated: ' + id);
      seen.add(id);
    }
    if ((list ?? []).length > 64) err(kind + ': more than 64 items');
  };
  ids(decl.themes, 'id', 'themes'); ids(decl.fonts, 'id', 'fonts'); ids(decl.wallpapers, 'id', 'wallpapers'); ids(decl.settings, 'key', 'settings');
  const fontIds = new Set((decl.fonts ?? []).map((f) => f.id));
  for (const t of decl.themes ?? []) {
    if (typeof t.label !== 'string' || !t.label || t.label.length > 120) err('theme label invalid: ' + t.id);
    if (t.description && t.description.length > 500) err('theme description too long: ' + t.id);
    if (t.preview) for (const k of ['canvas', 'surface', 'accent', 'text']) color(t.preview[k], t.id + '/preview/' + k);
    const modes = Object.keys(t.modes ?? {});
    if (!modes.length || modes.some((m) => m !== 'light' && m !== 'dark')) err('theme modes invalid: ' + t.id);
    for (const [m, def] of Object.entries(t.modes ?? {})) {
      for (const [k, v] of Object.entries(def.colors ?? {})) { if (!COLOR_SET.has(k)) err('unknown token ' + k); color(v, t.id + '/' + m + '/' + k); }
      for (const [k, v] of Object.entries(def.code ?? {})) { if (!CODE_SET.has(k)) err('unknown code token ' + k); color(v, t.id + '/' + m + '/code/' + k); }
      if (def.backdrop) for (const k of ['base', 'glowPrimary', 'glowSecondary']) color(def.backdrop[k], t.id + '/' + m + '/backdrop/' + k);
    }
    for (const role of ['ui', 'code']) {
      const ref = t.fonts?.[role];
      if (ref?.font && !fontIds.has(ref.font)) err('theme font missing: ' + ref.font);
    }
  }
  for (const f of decl.fonts ?? []) {
    if (!/^[^"'\x60;:{}()\\<>,\u0000-\u001f]{1,128}$/u.test(f.family ?? '')) err('font family invalid: ' + f.id);
    for (const file of f.files ?? []) {
      if (!['.woff2', '.ttf', '.otf'].includes(extname(file.path).toLowerCase())) err('font extension: ' + file.path);
      if (!size(file.path)) err('font file missing: ' + file.path);
      else if (size(file.path) > 50 * MiB) err('font too large: ' + file.path);
    }
    if ((f.files ?? []).length > 16) err('font has more than 16 files: ' + f.id);
  }
  for (const p of decl.pages ?? []) {
    if (!['boot', 'pet'].includes(p.slot) || !p.entry?.endsWith('.html') || !p.entry.includes('/')) err('page invalid: ' + p.slot);
    else if (!size(p.entry)) err('page entry missing: ' + p.entry);
  }
  for (const w of decl.wallpapers ?? []) {
    if (!w.label) err('wallpaper label missing: ' + w.id);
    if (w.image) { if (!/\.(?:png|jpe?g|webp)$/iu.test(w.image) || !size(w.image)) err('wallpaper image invalid: ' + w.image); }
    else if (w.video) {
      if (!/\.(?:mp4|webm)$/iu.test(w.video) || !size(w.video)) err('wallpaper video invalid: ' + w.video);
      if (!w.poster || !/\.(?:png|jpe?g|webp)$/iu.test(w.poster) || !size(w.poster)) err('wallpaper poster invalid: ' + w.id);
    } else err('wallpaper needs image or video: ' + w.id);
    const d = w.defaults ?? {};
    if (d.blur !== undefined && !(d.blur >= 0 && d.blur <= 30)) err('wallpaper blur out of range: ' + w.id);
    if (d.dim !== undefined && !(d.dim >= 0 && d.dim <= 70)) err('wallpaper dim out of range: ' + w.id);
    if (d.readingSurfaceOpacity !== undefined && !(d.readingSurfaceOpacity >= 0 && d.readingSurfaceOpacity <= 100)) err('wallpaper reading opacity out of range: ' + w.id);
  }
  if (!existsSync(join(dir, 'icon.png')) && manifest.icon === 'icon.png') err('icon.png missing');
  return errors;
}
