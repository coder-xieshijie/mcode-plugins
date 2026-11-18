// Turn an analysis (extract.mjs) into a MiniMax Code appearance plugin directory plus
// CONVERSION.md and a structured report. Assets whose licence is not confirmed are left out unless
// their id is in options.allow (the user agreed in the conversation).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveMode } from './derive.mjs';
import { DSH_DEFAULTS, glowColors, groupLost, mapDshMode } from './mapping.mjs';
import { swatchIcon } from './png.mjs';
import { validatePlugin } from './validate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(HERE, '../../templates/boot-video');
const MiB = 1024 * 1024;
const FILE_LIMIT = 16 * MiB; // MiniMax Plugin V1 per-file limit (stricter than appearance's 50 MB)
const TOTAL_BUDGET = 60 * MiB;

const slug = (s, max = 60) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, max).replace(/-+$/u, '') || 'item';
const safeFile = (s) => String(s).replace(/[^A-Za-z0-9._-]+/gu, '-').replace(/^[-.]+/u, '').slice(0, 100) || 'file';
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export function pluginNameFor(pkgName) {
  const base = slug(String(pkgName).replace(/^@[^/]+\//u, ''), 50);
  const name = ('mcode-' + base).replace(/-{2,}/gu, '-');
  return /^[a-z]/u.test(name) ? name : 'mcode-skin';
}

function hasFfmpeg() {
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; }
}

function grabFrame(video, out, at) {
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(at), '-i', video, '-frames:v', '1', '-vf', 'scale=min(1920\\,iw):-2', '-q:v', '4', out], { stdio: 'ignore' });
}

/** Feature usage that MCode cannot take over, for the "lost" part of the report. */
export function featureLosses(root) {
  const stats = { glass: 0, selectors: 0, dom: 0, audio: 0 };
  const visit = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) visit(p);
      else if (/\.(?:m?js|cjs|css|ts)$/u.test(name) && st.size < 8 * MiB) {
        const t = readFileSync(p, 'utf8');
        stats.glass += (t.match(/backdrop-filter/gu) ?? []).length;
        stats.selectors += (t.match(/\[class\*=/gu) ?? []).length;
        stats.dom += (t.match(/querySelector|createElement\(/gu) ?? []).length;
        stats.audio += (t.match(/new Audio\(|<audio|AudioContext|afplay/gu) ?? []).length;
      }
    }
  };
  visit(root);
  const out = [];
  if (stats.glass) out.push(`毛玻璃 / 半透明材质（backdrop-filter ${stats.glass} 处）：MCode 主题只收颜色`);
  if (stats.selectors || stats.dom > 20) out.push(`界面 DOM 与选择器改写（[class*= ${stats.selectors} 处，DOM 操作 ${stats.dom} 处）：MCode 不开放任意 CSS`);
  if (stats.audio) out.push(`音效（${stats.audio} 处）：MCode 外观不提供音效`);
  return out;
}

export function convert(analysis, { root, outDir, allow = new Set(), name } = {}) {
  const allowAll = allow.has('all');
  const allowed = (id) => allowAll || allow.has(id);
  const pluginName = name ?? pluginNameFor(analysis.pkg.name);
  const dir = join(outDir, pluginName);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, '.minimax-plugin'), { recursive: true });
  mkdirSync(join(dir, 'appearance'), { recursive: true });
  const report = {
    plugin: pluginName, dir, source: analysis.pkg, formats: analysis.formats,
    themes: [], fonts: [], wallpapers: [], boot: null, pending: [], excluded: [], lost: [], adjustments: 0,
    skipped: analysis.skipped, licenseFiles: [],
  };
  const decl = { schemaVersion: 1 };
  let budget = 0;
  const licenseCopies = new Map();
  const keepLicense = (p) => {
    if (!p || licenseCopies.has(p)) return;
    const target = 'LICENSES/' + safeFile(String(licenseCopies.size + 1).padStart(2, '0') + '-' + basename(p));
    licenseCopies.set(p, target);
  };
  for (const name of readdirSync(root)) if (/^(?:LICEN[CS]E|NOTICE|COPYING)/iu.test(name)) keepLicense(join(root, name));

  // Themes.
  const themes = [];
  const lostNames = new Set();
  const lostExtra = new Set();
  for (const cand of analysis.themes.slice(0, 64)) {
    const modes = {};
    const summary = { id: cand.id, label: cand.label, modes: [], mapped: 0, derived: 0, adjusted: 0, format: cand.format };
    let shape;
    let fontRefs;
    for (const [mode, src] of Object.entries(cand.modes)) {
      let seed, explicit = {};
      if (src.kind === 'dsh') {
        const m = mapDshMode(src.vars, mode);
        seed = m.seed; explicit = m.explicit; shape = shape ?? m.shape; fontRefs = fontRefs ?? m.fonts;
        if (cand.glow) {
          const resolver = (n) => src.vars[n] ?? DSH_DEFAULTS[mode][n];
          const g = glowColors(cand.glow, resolver);
          if (g.length >= 2) seed.glow = [g[0], g[1]];
        }
        for (const n of m.lost) lostNames.add(n);
        summary.mapped = Math.max(summary.mapped, Object.keys(explicit).length);
      } else {
        seed = src.seed; explicit = src.explicit ?? {};
        summary.mapped = Math.max(summary.mapped, Object.keys(explicit).length + Object.keys(seed).length);
      }
      const out = deriveMode(seed, mode, explicit);
      modes[mode] = { colors: out.colors, code: out.code, backdrop: out.backdrop };
      summary.modes.push(mode);
      summary.adjusted += out.adjustments.length;
      summary.adjustments = (summary.adjustments ?? []).concat(out.adjustments.map((a) => ({ mode, ...a })));
    }
    for (const x of cand.lostExtra ?? []) lostExtra.add(x);
    summary.derived = 56 - Math.min(56, summary.mapped);
    const shown = modes.dark ?? modes.light;
    const theme = {
      id: cand.id.slice(0, 64).replace(/-+$/u, ''),
      label: cut(cand.label || cand.id, 120),
      description: cut(`由 ${analysis.pkg.name} ${analysis.pkg.version} 转换（${cand.format}）${summary.modes.length === 1 ? '；只有' + (summary.modes[0] === 'dark' ? '暗' : '亮') + '色，应用时锁定该模式' : ''}`, 500),
      preview: {
        canvas: shown.colors.bg_default_secondary.slice(0, 7), surface: shown.colors.bg_default_primary.slice(0, 7),
        accent: shown.colors.bg_interaction_accent_focus_blue.slice(0, 7), text: shown.colors.text_default_primary.slice(0, 7),
      },
      modes,
    };
    if (shape) theme.recipe = { shape };
    if (fontRefs) {
      theme.fonts = {};
      if (fontRefs.ui) theme.fonts.ui = { families: fontRefs.ui };
      if (fontRefs.code) theme.fonts.code = { families: fontRefs.code };
    }
    themes.push(theme);
    report.adjustments += summary.adjusted;
    report.themes.push(summary);
  }
  if (analysis.themes.length > 64) report.excluded.push({ kind: '主题', id: `另外 ${analysis.themes.length - 64} 套`, reason: 'MCode 一个插件最多 64 套主题' });
  if (themes.length) decl.themes = themes;
  report.lost.push(...groupLost([...lostNames]).map((g) => `${g.label}：${g.count} 个变量（如 ${g.examples.join('、')}）`));
  report.lost.push(...lostExtra);

  // Fonts.
  const fonts = [];
  for (const font of analysis.fonts.slice(0, 64)) {
    const ok = font.license.status === 'ok' || allowed(font.id);
    if (!ok) {
      report.pending.push({ kind: '字体', id: font.id, name: font.family, status: font.license.status, reason: font.license.reason });
      continue;
    }
    const files = [];
    for (const f of font.files) {
      const size = f.data ? f.data.length : statSync(f.path).size;
      if (size > FILE_LIMIT || budget + size > TOTAL_BUDGET) { report.excluded.push({ kind: '字体文件', id: f.name, reason: '超过插件包体积上限' }); continue; }
      const rel = `fonts/${font.id}/${safeFile(f.name)}`;
      mkdirSync(join(dir, 'fonts', font.id), { recursive: true });
      if (f.data) writeFileSync(join(dir, rel), f.data); else copyFileSync(f.path, join(dir, rel));
      budget += size;
      files.push({ path: rel, ...(f.weight ? { weight: f.weight } : {}), ...(f.style ? { style: f.style } : {}) });
    }
    if (!files.length) continue;
    const mono = /mono|code|courier|plex mono|cascadia/iu.test(font.family);
    fonts.push({ id: font.id, family: font.family, label: font.family, files, fallback: mono ? ['monospace'] : ['sans-serif'] });
    if (font.license.evidence) keepLicense(join(root, font.license.evidence));
    report.fonts.push({ id: font.id, family: font.family, files: files.length, license: font.license.status === 'ok' ? font.license.license : '用户确认后打包' });
  }
  if (fonts.length) decl.fonts = fonts;

  // Media.
  const ffmpeg = hasFfmpeg();
  const wallpapers = [];
  for (const media of analysis.media) {
    const ok = media.license.status === 'ok' || allowed(media.id);
    if (!ok) {
      report.pending.push({ kind: media.role === 'boot' ? '开机视频' : '壁纸', id: media.id, name: media.rel, status: media.license.status, reason: media.license.reason });
      continue;
    }
    const size = statSync(media.path).size;
    if (size > FILE_LIMIT) { report.excluded.push({ kind: media.role === 'boot' ? '开机视频' : '壁纸', id: media.id, reason: `${(size / MiB).toFixed(1)} MB，超过插件包单文件 16 MiB 上限` }); continue; }
    if (budget + size > TOTAL_BUDGET) { report.excluded.push({ kind: '素材', id: media.id, reason: '插件包总体积会超过 64 MiB' }); continue; }
    if (media.license.evidence) keepLicense(join(root, media.license.evidence));
    const ext = extname(media.path).toLowerCase();
    if (media.role === 'boot') {
      if (report.boot) { report.excluded.push({ kind: '开机视频', id: media.id, reason: '一个插件只有一个开机画面，已用 ' + report.boot.id }); continue; }
      const pageDir = join(dir, 'pages/boot');
      mkdirSync(join(pageDir, 'media'), { recursive: true });
      copyFileSync(media.path, join(pageDir, 'media', 'boot' + ext));
      budget += size;
      let poster = '';
      if (ffmpeg) {
        try { grabFrame(media.path, join(pageDir, 'media/poster.jpg'), 0.05); poster = '<img id="poster" src="media/poster.jpg" alt="" />'; } catch { poster = ''; }
      }
      const html = readFileSync(join(TEMPLATE, 'index.html'), 'utf8').replace('{{TITLE}}', '开机动画').replace('{{POSTER}}', poster).replace('{{VIDEO}}', 'media/boot' + ext);
      writeFileSync(join(pageDir, 'index.html'), html);
      copyFileSync(join(TEMPLATE, 'boot.js'), join(pageDir, 'boot.js'));
      copyFileSync(join(TEMPLATE, 'boot.css'), join(pageDir, 'boot.css'));
      decl.pages = [{ slot: 'boot', entry: 'pages/boot/index.html', label: '开机动画（' + analysis.pkg.name + '）' }];
      const fade = Math.round(Math.min(3000, Math.max(200, Number(media.boot?.fadeMs) || 800)));
      decl.settings = [
        { key: 'sound', label: '播放声音', description: '开机时播放视频原声；不允许带声自动播放时自动退回静音。', type: 'boolean', default: media.boot?.sound !== false },
        { key: 'ending', label: '结束方式', type: 'select', options: [{ value: 'dissolve', label: '片尾溶解进界面' }, { value: 'after', label: '放完再淡出' }], default: 'dissolve' },
        { key: 'fade-ms', label: '溶解时长（毫秒）', type: 'number', min: 200, max: 3000, default: fade },
        { key: 'click-to-skip', label: '点击画面跳过', description: 'MCode 还没准备好时，点击后会等它准备好再进入。Esc 任何时候都能跳过。', type: 'boolean', default: true },
        { key: 'show-progress', label: '显示启动进度条', type: 'boolean', default: true },
      ];
      report.boot = { id: media.id, file: media.rel, poster: Boolean(poster), license: media.license.status === 'ok' ? media.license.license : '用户确认后打包' };
      continue;
    }
    mkdirSync(join(dir, 'wallpapers'), { recursive: true });
    const id = slug(media.id, 64);
    const file = `wallpapers/${safeFile(id)}${ext}`;
    const item = { id, label: cut(media.label, 120), description: cut('来自 ' + analysis.pkg.name + ' 的 ' + media.rel, 500) };
    if (media.kind === 'video') {
      if (!ffmpeg) { report.excluded.push({ kind: '视频壁纸', id, reason: '视频壁纸需要封面图，本机没有 ffmpeg 无法截取' }); continue; }
      const poster = `wallpapers/${safeFile(id)}-poster.jpg`;
      try { grabFrame(media.path, join(dir, poster), 1); } catch { report.excluded.push({ kind: '视频壁纸', id, reason: 'ffmpeg 无法从视频截取封面图' }); continue; }
      copyFileSync(media.path, join(dir, file));
      item.video = file;
      item.poster = poster;
    } else {
      copyFileSync(media.path, join(dir, file));
      item.image = file;
    }
    budget += size;
    if (media.defaults) item.defaults = media.defaults;
    wallpapers.push(item);
    report.wallpapers.push({ id, kind: media.kind, file: media.rel, license: media.license.status === 'ok' ? media.license.license : '用户确认后打包' });
  }
  if (wallpapers.length) decl.wallpapers = wallpapers;

  report.lost.push(...featureLosses(root));
  const empty = !decl.themes && !decl.fonts && !decl.pages && !decl.wallpapers;
  if (empty) {
    rmSync(dir, { recursive: true, force: true });
    report.dir = null;
    report.empty = true;
    return report;
  }

  // Licences, icon, manifest, declaration, CONVERSION.md.
  for (const [src, target] of licenseCopies) {
    if (!existsSync(src)) continue;
    mkdirSync(join(dir, 'LICENSES'), { recursive: true });
    copyFileSync(src, join(dir, target));
    report.licenseFiles.push({ from: src.slice(root.length + 1), to: target });
  }
  const first = themes[0]?.preview;
  writeFileSync(join(dir, 'icon.png'), swatchIcon(first ? [first.canvas, first.surface, first.accent, first.text] : ['#1b1d24', '#3a7bff', '#7fd8ff', '#e8f1f8']));
  const author = typeof analysis.pkg.author === 'string' ? analysis.pkg.author : 'dsh-skin-import';
  const version = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/u.test(analysis.pkg.version) ? analysis.pkg.version : '0.1.0';
  const manifest = {
    schemaVersion: 1, name: pluginName, displayName: cut(analysis.pkg.name + '（MCode 转换）', 80), version,
    description: cut(`由 dsh-skin-import 从 DSH 插件 ${analysis.pkg.name} ${analysis.pkg.version} 转换的外观：${[themes.length && themes.length + ' 套主题', fonts.length && fonts.length + ' 款字体', wallpapers.length && wallpapers.length + ' 张壁纸', decl.pages && '开机动画'].filter(Boolean).join('、')}。来源与许可见 CONVERSION.md。`, 300),
    author, icon: 'icon.png', category: 'Design & Sites',
    exampleQueries: [`用 ${analysis.pkg.name} 转换来的外观`], apps: [], mcpServers: [], skills: [],
    appearance: 'appearance/appearance.json',
  };
  writeFileSync(join(dir, '.minimax-plugin/plugin.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(join(dir, 'appearance/appearance.json'), JSON.stringify(decl, null, 2) + '\n');
  writeFileSync(join(dir, 'CONVERSION.md'), conversionMarkdown(report, analysis));
  report.errors = validatePlugin(dir);
  return report;
}

export function conversionMarkdown(report, analysis) {
  const p = analysis.pkg;
  const lines = [];
  lines.push(`# 转换记录：${p.name}`, '');
  lines.push(`本插件由 dsh-skin-import 从 DeepSeek Harness（DSH）插件静态转换而来，转换时没有执行源插件的任何代码。`, '');
  lines.push('## 来源', '');
  lines.push(`- 包：${p.name} ${p.version}`);
  lines.push(`- 代码许可：${p.license ?? '未声明'}`);
  if (p.repository) lines.push(`- 仓库：${p.repository}`);
  if (p.homepage) lines.push(`- 主页：${p.homepage}`);
  lines.push(`- 识别出的格式：${report.formats.join('、') || '无'}`, '');
  lines.push('## 转换结果', '');
  if (report.themes.length) {
    lines.push('| 主题 | 模式 | 直接对应 | 调整 | 来源格式 |', '|---|---|---|---|---|');
    for (const t of report.themes) lines.push(`| ${t.label}（${t.id}） | ${t.modes.join(' / ')} | ${t.mapped} | ${t.adjusted} | ${t.format} |`);
    lines.push('', 'MCode 主题有 47 个颜色 token 和 9 个代码 token。“直接对应”是从源插件变量直接取值的数量，其余按派生规则从底色、正文、强调色推算（见 dsh-skin-import 的映射表）；“调整”是为满足正文对比度 ≥ 4.5:1 等要求改过的颜色。', '');
  }
  if (report.fonts.length) {
    lines.push('| 字体 | 文件数 | 许可 |', '|---|---|---|');
    for (const f of report.fonts) lines.push(`| ${f.family} | ${f.files} | ${f.license} |`);
    lines.push('');
  }
  if (report.wallpapers.length) {
    lines.push('| 壁纸 | 类型 | 源文件 | 许可 |', '|---|---|---|---|');
    for (const w of report.wallpapers) lines.push(`| ${w.id} | ${w.kind === 'video' ? '视频' : '图片'} | ${w.file} | ${w.license} |`);
    lines.push('');
  }
  if (report.boot) lines.push(`开机动画：${report.boot.file}，套用标准开机页（进度条、就绪后片尾溶解进主界面、点击跳过）；许可：${report.boot.license}。`, '');
  const adj = report.themes.flatMap((t) => (t.adjustments ?? []).map((a) => `- ${t.id}/${a.mode} ${a.token}：${a.from} → ${a.to}（${a.reason}）`));
  if (adj.length) lines.push('### 颜色调整', '', ...adj.slice(0, 200), adj.length > 200 ? `- ……另 ${adj.length - 200} 处` : '', '');
  lines.push('## 丢失项', '');
  lines.push(...(report.lost.length ? report.lost.map((x) => '- ' + x) : ['- 无']), '');
  if (report.pending.length || report.excluded.length || report.skipped.length) {
    lines.push('## 没有打包的内容', '');
    for (const x of report.pending) lines.push(`- ${x.kind} ${x.id}（${x.name}）：${x.status === 'restricted' ? '许可受限' : '许可未确认'}，${x.reason}`);
    for (const x of report.excluded) lines.push(`- ${x.kind} ${x.id}：${x.reason}`);
    for (const x of report.skipped) lines.push(`- ${x.kind} ${x.id}${x.name ? '（' + x.name + '）' : ''}：${x.reason}`);
    lines.push('');
  }
  lines.push('## 许可', '');
  lines.push(`- 配色是数据，按源插件代码许可（${p.license ?? '未声明'}）随附其许可文本。`);
  lines.push('- 字体与素材只在许可明确允许再分发、或用户在转换时明确同意后才打包；许可文本放在 LICENSES/。');
  for (const l of report.licenseFiles) lines.push(`  - ${l.to} ← 源包 ${l.from}`);
  lines.push('- 源插件名称、作者与商标归其权利人所有；本转换不代表源作者或 MiniMax 认可。', '');
  return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n') + '\n';
}
