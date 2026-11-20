// Static analysis of a DSH plugin package. Reads files only; never runs or imports package code.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, relative, sep } from 'node:path';
import { objectsAround, parseLiteralAt } from './literal.mjs';
import { extractBlocks, extractFontFaces, resolveVariants } from './css.mjs';
import { fontLicense, mediaLicense } from './license.mjs';
import { glowColors } from './mapping.mjs';
import { parseColor, toHex } from './color.mjs';
import { findPetPacks } from './pet-pack.mjs';

const TEXT_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.css', '.json', '.md', '.txt', '.yml', '.yaml']);
const CODE_EXT = new Set(['.js', '.mjs', '.cjs', '.ts']);
const FONT_EXT = new Set(['.woff2', '.ttf', '.otf']);
const VIDEO_EXT = new Set(['.mp4', '.webm']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'test', 'tests', '__tests__', 'docs', 'examples', 'example', 'screenshots']);
const FOLLOW_HOST = new Set(['host', 'system', 'default', 'auto', 'follow', 'none', 'off', 'custom']);
const MAX_TEXT = 8 * 1024 * 1024;

/**
 * Reasons a whole package cannot be converted. Everything else is converted field by field and the
 * parts MCode cannot take over are reported item by item instead of rejecting the package.
 */
export const UNSUPPORTED = [
  [/wallpaper-engine/iu, '核心是把本机 Wallpaper Engine 壁纸（Scene / Web / 视频）放到聊天背后，依赖宿主侧 Node、随包 ffmpeg 和实时渲染引擎；MCode 插件壁纸只收包内静态图片或视频，页面沙箱也不能跑宿主侧代码。'],
];

/** Features that need the host runtime, reported when a package depends on them. */
export const HOST_BOUND = [
  [/liang|intensity-skin/iu, '推理等级滑块联动立绘与动态配色：MCode 主题是静态数据，不能随模型状态变化；立绘本身可以做成桌宠页。'],
  [/beauti-?code/iu, '背景管理器与 agent 工具（斜杠命令、本地媒体服务）：MCode 外观不提供宿主侧服务；配色与素材若可静态读取仍会转换。'],
];

export function walk(root, dir = root, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name) && !name.startsWith('.')) walk(root, p, out);
    } else if (st.isFile()) out.push({ path: p, rel: relative(root, p).split(sep).join('/'), size: st.size });
  }
  return out;
}

const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 60) || 'item';
const title = (s) => String(s).replace(/[-_]+/gu, ' ').replace(/\b\w/gu, (c) => c.toUpperCase());

export function analyzePackage(root, options = {}) {
  const pkgPath = join(root, 'package.json');
  const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : {};
  const info = {
    name: pkg.name ?? basename(root), version: pkg.version ?? '0.0.0', license: pkg.license ?? null,
    description: typeof pkg.description === 'string' ? pkg.description : '', homepage: pkg.homepage ?? null,
    author: typeof pkg.author === 'string' ? pkg.author.replace(/\s*<[^>]*>/gu, '').trim() : pkg.author?.name ?? null,
    repository: typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url ?? null,
  };
  const result = { pkg: info, formats: [], themes: [], fonts: [], media: [], notes: [], skipped: [] };
  for (const [re, reason] of UNSUPPORTED) {
    if (re.test(info.name) || re.test(basename(root))) { result.unsupported = reason; return result; }
  }
  for (const [re, reason] of HOST_BOUND) {
    if (re.test(info.name) || re.test(basename(root))) { result.hostBound = [...(result.hostBound ?? []), reason]; }
  }
  // DSH Pet Pack 1.0: the pack itself is the appearance contribution (atlas frames + action table).
  const petPacks = findPetPacks(root);
  if (petPacks.length) {
    result.petPacks = petPacks;
    result.formats.push('DSH Pet Pack（' + petPacks.map((p) => p.name).join('、') + '）');
  }
  const files = walk(root);
  const textIndex = files
    .filter((f) => TEXT_EXT.has(extname(f.path)) && f.size <= MAX_TEXT && !f.rel.endsWith('.map'))
    .map((f) => ({ ...f, text: readFileSync(f.path, 'utf8') }));
  const codeFiles = textIndex.filter((f) => CODE_EXT.has(extname(f.path)));
  const seen = new Set();
  const addTheme = (theme) => {
    let id = slug(theme.id);
    if (seen.has(id)) return;
    seen.add(id);
    result.themes.push({ ...theme, id });
  };

  // 1. ctx.theme.register-style literals: { id|themeId, colorScheme, tokens: { --dsw-*: ... } }.
  const shiki = new Map();
  for (const f of codeFiles) {
    if (!f.text.includes('--shiki-token-')) continue;
    for (const o of objectsAround(f.text, /"--shiki-token-keyword"\s*:/u)) {
      if (o.name && !shiki.has(o.name)) shiki.set(o.name, o.value);
    }
  }
  let literalCount = 0;
  for (const f of codeFiles) {
    if (!/colorScheme\s*:/u.test(f.text)) continue;
    for (const o of objectsAround(f.text, /\bcolorScheme\s*:/u)) {
      const v = o.value;
      if (!v || (v.colorScheme !== 'light' && v.colorScheme !== 'dark') || !v.tokens || typeof v.tokens !== 'object') continue;
      const keys = Object.keys(v.tokens).filter((k) => k.startsWith('--dsw-'));
      if (keys.length < 5) continue;
      const id = v.id ?? v.themeId;
      if (typeof id !== 'string') continue;
      const vars = { ...v.tokens };
      for (const [name, table] of shiki) {
        if (id.toLowerCase().includes(name.toLowerCase())) for (const [k, val] of Object.entries(table)) if (!(k in vars)) vars[k] = val;
      }
      const label = [v.label, v.name, v.nameZh, title(id)].find((x) => typeof x === 'string');
      addTheme({
        id, label, format: 'theme.register 字面量（' + f.rel + '）',
        modes: { [v.colorScheme]: { kind: 'dsh', vars } },
        glow: typeof v.glow === 'string' ? v.glow : undefined,
        lostExtra: v.defaults ? ['玻璃材质与面板透明度（defaults）'] : [],
      });
      literalCount++;
    }
  }
  if (literalCount) result.formats.push('theme.register 字面量');

  // 2. dream-skin theme packs (JSON).
  for (const f of textIndex.filter((f) => f.rel.endsWith('.json'))) {
    let json;
    try { json = JSON.parse(f.text); } catch { continue; }
    if (json?.format === 'dsh-dream-skin/pack' && json.manifest?.tokens) {
      const m = json.manifest;
      const mode = m.colorScheme === 'light' ? 'light' : 'dark';
      addTheme({ id: m.id ?? basename(f.rel, '.json'), label: m.nameZh ?? m.name ?? m.id, format: 'dream-skin 主题包（' + f.rel + '）', modes: { [mode]: { kind: 'dsh', vars: m.tokens } } });
      if (!result.formats.includes('dream-skin 主题包')) result.formats.push('dream-skin 主题包');
    }
  }

  // 3. skin-center manifest v2 (skin.json + stylesheet + backgroundMedia).
  for (const f of textIndex.filter((f) => basename(f.rel) === 'skin.json')) {
    let m;
    try { m = JSON.parse(f.text); } catch { continue; }
    const sheet = m?.contributes?.stylesheet;
    if (!m?.id || !sheet) continue;
    const dir = join(root, f.rel, '..');
    const sheets = (Array.isArray(sheet) ? sheet : [sheet]).map((s) => (typeof s === 'string' ? s : s.path)).filter(Boolean);
    const css = sheets.map((s) => { const p = join(dir, s); return existsSync(p) ? readFileSync(p, 'utf8') : ''; }).join('\n');
    const variants = resolveVariants(extractBlocks(css, { stripComments: true }));
    const base = variants.find((v) => v.variant.length === 0) ?? variants[0];
    if (base) addTheme({ id: m.id, label: m.name ?? m.id, format: 'skin-center 清单 v2（' + f.rel + '）', modes: mapModes(base.modes), lostExtra: ['L3 选择器补丁（patches）与 hooks.mjs'] });
    for (const mode of ['light', 'dark']) {
      const media = m.contributes?.backgroundMedia?.[mode];
      if (!media?.src) continue;
      const p = join(dir, media.src);
      if (!existsSync(p)) continue;
      result.media.push({
        id: slug(m.id + '-' + mode), role: 'wallpaper', kind: media.type === 'video' ? 'video' : 'image', path: p, rel: relative(root, p),
        label: (m.name ?? m.id) + (mode === 'dark' ? '（暗色）' : '（亮色）'),
        license: mediaLicense({ root, file: p, manifestLicense: m.license }),
        defaults: typeof media.scrim === 'number' ? { dim: Math.round(Math.min(0.7, media.scrim) * 100) } : undefined,
      });
    }
    if (!result.formats.includes('skin-center 清单 v2')) result.formats.push('skin-center 清单 v2');
  }

  // 4. CSS token blocks (stylesheets and CSS strings inside bundles).
  const cssThemes = [];
  for (const f of textIndex) {
    const ext = extname(f.path);
    if (!(ext === '.css' || CODE_EXT.has(ext)) || !f.text.includes('--dsw-alias')) continue;
    if (f.rel.includes('skins/')) continue; // handled by the skin manifest
    const blocks = extractBlocks(f.text, { stripComments: ext === '.css' });
    for (const v of resolveVariants(blocks)) {
      const own = blocks.filter((b) => b.variant.join('&') === v.variant.join('&'));
      const isAlias = (k) => /^--dsw-(?:alias|specific)-/u.test(k);
      const ownAlias = new Set(own.flatMap((b) => Object.keys(b.vars)).filter(isAlias));
      const merged = new Set(Object.values(v.modes).flatMap((vars) => Object.keys(vars)).filter(isAlias));
      // A card may change only a few colours on top of its palette; the merged set must still be a theme.
      if (ownAlias.size < 1 || merged.size < 8) continue;
      const values = v.variant.map((x) => x.split('=')[1]);
      if (values.some((x) => FOLLOW_HOST.has(x))) continue;
      if (v.variant.length === 0 && (literalCount || blocks.some((b) => b.variant.length))) continue;
      cssThemes.push({ variant: v.variant, values, modes: v.modes, file: f.rel });
    }
  }
  const prefix = info.name.replace(/^@[^/]+\//u, '').replace(/^dsh-(?:plugin-|client-)?/u, '');
  // Values every variant shares (e.g. palette=claude under each card) do not name the theme.
  const common = cssThemes.length > 1 ? cssThemes[0].values.filter((v) => cssThemes.every((t) => t.values.includes(v))) : [];
  for (const t of cssThemes) {
    const own = t.values.filter((v) => !common.includes(v));
    const names = own.length ? own : t.values;
    addTheme({ id: names.length ? prefix + '-' + names.join('-') : prefix, label: title(prefix) + (names.length ? ' · ' + names.map(title).join(' · ') : ''), format: 'CSS 变量块（' + t.file + '）', modes: mapModes(t.modes) });
  }
  if (cssThemes.length) result.formats.push('CSS 变量块');

  // 5. opencode theme.json (embedded or files) and palette capsules.
  let opencode = 0;
  for (const f of textIndex) {
    if (!f.text.includes('opencode.ai/theme.json') && !f.text.includes('custom-theme.v1')) continue;
    for (const o of objectsAround(f.text, /"\$schema"\s*:\s*"https:\/\/opencode\.ai\/theme\.json"/u)) {
      const id = o.name ?? basename(f.rel, extname(f.rel));
      const modes = opencodeModes(o.value);
      if (!modes) { result.skipped.push({ kind: 'opencode 主题', id, reason: '背景、正文或强调色引用了无法静态求值的值（如终端色号）' }); continue; }
      addTheme({ id: 'opencode-' + id, label: title(id.replace(/_/gu, '-')), format: 'opencode theme.json（' + f.rel + '）', modes, lostExtra: ['diff 与 Markdown 专用色'] });
      opencode++;
    }
    for (const o of objectsAround(f.text, /"schema"\s*:\s*"dsh-opencode-palette\.custom-theme\.v1"/u)) {
      const v = o.value;
      if (!v?.colors || !v.id) continue;
      if (!options.includeCapsules) { result.skipped.push({ kind: '主题胶囊', id: v.id, name: v.name, reason: '名称涉及第三方 IP 商标，默认不收录（--include-capsules 可收录）' }); continue; }
      const modes = opencodeModes({ defs: {}, theme: v.colors }, v.appearance);
      if (modes) { addTheme({ id: 'capsule-' + v.id, label: v.name ?? v.id, format: 'opencode-palette 胶囊（' + f.rel + '）', modes }); opencode++; }
    }
  }
  if (opencode) result.formats.push('opencode 主题');

  // 6. Bloom-style palette literal: PALETTE = { key: { accentL, accentD, bgL, bgD, txL, txD, sfL, sfD, sf2L, sf2D, morandi } }.
  for (const f of codeFiles) {
    const m = /\b(?:const|let|var)\s+PALETTE\s*=\s*\{/u.exec(f.text);
    if (!m) continue;
    let palette;
    try { palette = parseLiteralAt(f.text, m.index + m[0].length - 1).value; } catch { continue; }
    let labels = {};
    const lm = /\b(?:const|let|var)\s+VARIANT_LABELS\s*=\s*\{/u.exec(f.text);
    if (lm) { try { labels = parseLiteralAt(f.text, lm.index + lm[0].length - 1).value; } catch { labels = {}; } }
    let count = 0;
    for (const [key, p] of Object.entries(palette ?? {})) {
      if (!p?.accentL || !p?.bgL || !p?.txL) continue;
      const glow = typeof p.morandi === 'string' ? ['rgba(' + p.morandi + ', 0.22)'] : [];
      const modes = {};
      for (const [mode, s] of [['light', 'L'], ['dark', 'D']]) {
        if (!p['bg' + s]) continue;
        modes[mode] = { kind: 'seed', seed: { canvas: p['bg' + s], surface: p['sf' + s], tertiary: p['sf2' + s], text: p['tx' + s], accent: p['accent' + s], glow } };
      }
      const label = labels[key] ? [labels[key].zh, labels[key].en].filter(Boolean).join(' ') : title(key);
      addTheme({ id: prefix + '-' + key, label: title(prefix) + ' · ' + label, format: '色板字面量 PALETTE（' + f.rel + '）', modes, lostExtra: ['氛围渐变只取第一种颜色作背景光晕'] });
      count++;
    }
    if (count) { result.formats.push('色板字面量'); break; }
  }

  // 7. Fonts: bundled files and data: URIs in @font-face.
  const faces = textIndex.flatMap((f) => extractFontFaces(f.text).map((face) => ({ ...face, file: f.rel })));
  const familyOf = new Map();
  for (const face of faces) for (const url of face.urls) if (!url.startsWith('data:')) familyOf.set(basename(url), face);
  const byFamily = new Map();
  const addFontFile = (family, entry) => {
    if (!byFamily.has(family)) byFamily.set(family, []);
    const list = byFamily.get(family);
    if (!list.some((e) => e.name === entry.name)) list.push(entry);
  };
  for (const f of files.filter((f) => FONT_EXT.has(extname(f.path).toLowerCase()))) {
    const face = familyOf.get(basename(f.path));
    const family = face?.family ?? familyFromFile(basename(f.path));
    addFontFile(family, { name: basename(f.path), path: f.path, rel: f.rel, weight: weightOf(face?.weight), style: face?.style === 'italic' ? 'italic' : undefined });
  }
  for (const face of faces) {
    for (const url of face.urls) {
      const dm = /^data:(?:font\/|application\/(?:x-)?font-)(woff2|ttf|otf|truetype|opentype)[^;,]*;base64,(.+)$/iu.exec(url);
      if (!dm) continue;
      const ext = { truetype: 'ttf', opentype: 'otf' }[dm[1].toLowerCase()] ?? dm[1].toLowerCase();
      const weight = weightOf(face.weight);
      const name = slug(face.family) + '-' + (weight ?? '400').replace(/\s+/gu, '-') + (face.style === 'italic' ? '-italic' : '') + '.' + ext;
      addFontFile(face.family, { name, data: Buffer.from(dm[2], 'base64'), rel: face.file + '（内联 data URI）', weight, style: face.style === 'italic' ? 'italic' : undefined });
    }
  }
  for (const [family, entries] of byFamily) {
    const lic = fontLicense({ root, file: entries[0].path, family, textIndex });
    result.fonts.push({ id: slug(family), family: family.replace(/["';:{}()\\<>,]/gu, '').slice(0, 120), files: entries.slice(0, 16), license: lic });
  }
  if (result.fonts.length) result.formats.push('字体文件');

  // 8. Media: boot videos, pet artwork and background images/videos.
  // Pet artwork is matched first: a character image called "background" must not become the
  // wallpaper, and a wallpaper called "pet.png" is still a pet.
  const config = textIndex.map((f) => { try { return f.rel.endsWith('.json') ? JSON.parse(f.text) : null; } catch { return null; } }).find((j) => j && (j.boot?.file || j.background?.file));
  const PET_NAME = /pet|mascot|character|\bchara\b|live2d|sprite|chibi|avatar|立绘|角色|桌宠|桌宠/u;
  const ANIM_EXT = new Set([...VIDEO_EXT, '.gif']);
  // A pet page takes one asset: prefer something that moves, then images.
  const petCandidates = files
    .filter((f) => {
      const ext = extname(f.path).toLowerCase();
      if (!ANIM_EXT.has(ext) && !IMAGE_EXT.has(ext)) return false;
      if (f.size > 16 * 1024 * 1024) return false;
      return PET_NAME.test(basename(f.path, ext).toLowerCase());
    })
    .sort((a, b) => {
      const anim = (f) => (ANIM_EXT.has(extname(f.path).toLowerCase()) ? 0 : 1);
      return anim(a) - anim(b) || b.size - a.size;
    });
  let petAsset = petCandidates[0] ?? null;
  for (const f of files) {
    const ext = extname(f.path).toLowerCase();
    if (result.media.some((m) => m.path === f.path)) continue;
    const name = basename(f.path).toLowerCase();
    let role = null;
    if (f === petAsset) role = 'pet';
    else if (VIDEO_EXT.has(ext) && /boot|splash|startup|开机|intro/u.test(name)) role = 'boot';
    else if ((VIDEO_EXT.has(ext) || (IMAGE_EXT.has(ext) && f.size >= 100 * 1024)) && /background|wallpaper|backdrop|\bbg\b|bg[-_.]|聊天背景|壁纸/u.test(name)) role = 'wallpaper';
    if (!role) continue;
    const item = { id: slug(basename(f.path, ext)), role, kind: VIDEO_EXT.has(ext) || ext === '.gif' ? 'video' : 'image', path: f.path, rel: f.rel, size: f.size, label: title(basename(f.path, ext)), license: mediaLicense({ root, file: f.path }) };
    if (role === 'pet') item.animated = ANIM_EXT.has(ext);
    if (config?.background && role === 'wallpaper' && item.kind === 'video') {
      const b = config.background;
      item.defaults = { dim: clampInt((b.veil ?? 0.14) * 100, 0, 70), readingSurfaceOpacity: clampInt((b.surface ?? 0.6) * 100, 0, 100), blur: 0 };
    }
    if (config?.boot && role === 'boot') item.boot = { fadeMs: config.boot.fadeMs, sound: config.boot.sound };
    result.media.push(item);
  }
  if (result.media.length) {
    const roles = new Set(result.media.map((m) => m.role));
    const labels = [roles.has('boot') && '开机视频', roles.has('pet') && '桌宠立绘', roles.has('wallpaper') && '背景'].filter(Boolean);
    result.formats.push('素材（' + labels.join(' / ') + '）');
  }
  if (!result.themes.length && !result.fonts.length && !result.media.length && !result.petPacks?.length) {
    result.unsupported = '没有找到可以静态解析的配色、字体、素材或 DSH 角色包：可能主题是运行时计算出来的，或者插件只做 DOM 改写与功能。';
  }
  return result;
}

function clampInt(v, lo, hi) { return Math.round(Math.min(hi, Math.max(lo, v))); }

function weightOf(w) {
  if (!w) return undefined;
  const s = String(w).trim();
  return /^(?:normal|bold|[1-9][0-9]{0,2}(?: [1-9][0-9]{0,2})?)$/u.test(s) ? s : undefined;
}

export function familyFromFile(name) {
  return name.replace(/\.[^.]+$/u, '').replace(/[-_]?(?:Variable|VF|Regular|Bold|Italic|Medium|Light|Thin|Black|SemiBold|ExtraBold|\d{3})/gu, '').replace(/([a-z])([A-Z])/gu, '$1 $2').replace(/[-_]+/gu, ' ').trim() || name;
}

function mapModes(modes) {
  const out = {};
  for (const [mode, vars] of Object.entries(modes)) out[mode] = { kind: 'dsh', vars };
  return out;
}

/** opencode theme.json → seed modes. Returns null when the colours cannot be resolved. */
export function opencodeModes(json, appearance) {
  const defs = json?.defs ?? {};
  const theme = json?.theme;
  if (!theme || typeof theme !== 'object') return null;
  const dual = Object.values(theme).some((v) => v && typeof v === 'object' && ('dark' in v || 'light' in v));
  const resolve = (v, mode, depth = 0) => {
    if (depth > 8 || v === undefined || v === null || v === 'none') return undefined;
    if (typeof v === 'object') return resolve(v[mode] ?? v.dark ?? v.light, mode, depth + 1);
    if (typeof v !== 'string') return undefined;
    if (v.startsWith('#')) { const c = parseColor(v); return c ? toHex(c) : undefined; }
    if (v in defs) return resolve(defs[v], mode, depth + 1);
    if (v in theme) return resolve(theme[v], mode, depth + 1);
    return undefined;
  };
  const build = (mode) => {
    const g = (k) => resolve(theme[k], mode);
    const canvas = g('background');
    const text = g('text');
    if (!canvas || !text) return null;
    const seed = {
      canvas, text, text2: g('textMuted'), sidebar: g('sidebarBg') ?? g('backgroundPanel'), surface: g('backgroundElement') ?? g('backgroundPanel'),
      overlay: g('backgroundElement'), tertiary: g('backgroundElement') ?? g('inputBg'),
      accent: g('primary') ?? g('accent') ?? g('info'), info: g('info'), border: g('border'), borderLight: g('borderSubtle'),
      code: { comment: g('syntaxComment'), keyword: g('syntaxKeyword'), function: g('syntaxFunction'), string: g('syntaxString'), number: g('syntaxNumber'), type: g('syntaxType'), property: g('syntaxVariable'), muted: g('syntaxPunctuation') ?? g('syntaxOperator') },
    };
    if (!seed.accent) return null;
    for (const k of Object.keys(seed)) if (seed[k] === undefined) delete seed[k];
    for (const k of Object.keys(seed.code)) if (seed.code[k] === undefined) delete seed.code[k];
    const explicit = {};
    const ba = g('borderActive');
    if (ba) explicit.border_accent = ba;
    return { kind: 'seed', seed, explicit };
  };
  if (dual) {
    const out = {};
    const light = build('light');
    const dark = build('dark');
    if (light) out.light = light;
    if (dark) out.dark = dark;
    return Object.keys(out).length ? out : null;
  }
  const single = build('dark');
  if (!single) return null;
  const c = parseColor(single.seed.canvas);
  const mode = appearance === 'light' || appearance === 'dark' ? appearance : (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255 > 0.5 ? 'light' : 'dark';
  return { [mode]: single };
}

export { glowColors };
