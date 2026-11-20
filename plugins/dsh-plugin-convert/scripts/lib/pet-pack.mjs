// DSH Pet Pack 1.0 (the format dsh-bigfish loads): pet.json + animations.json + atlas sheets whose
// frames are rectangles in the sheet. Read-only, static: the pack is data, never executed.
//
// MCode's desktop pet page can show a frame sequence, so the mapping is by tag: the pack's
// idle / working / attention / success / error animations follow the local session states.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const SKIP = new Set(['node_modules', '.git', 'dist', '.cache']);
const IMAGE = /^[\s\S]*\.(?:png|webp|jpe?g)$/iu;

/** MCode's pet roles, and the pack tags that can drive them, in priority order. */
export const ROLE_TAGS = {
  idle: ['idle'],
  working: ['working', 'writing', 'edit', 'command', 'tool', 'test', 'parallel', 'agent'],
  attention: ['attention', 'waiting', 'ask'],
  success: ['success', 'done', 'export'],
  error: ['error', 'failed', 'thinking'],
  greeting: ['greeting', 'wave', 'hello'],
};

const readJson = (path) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
};

/** Every file named pet.json under root, without following symlinks. */
export function findPetManifests(root) {
  const out = [];
  const visit = (dir) => {
    let names;
    try { names = readdirSync(dir); } catch { return; }
    for (const name of names) {
      if (SKIP.has(name) || name.startsWith('.')) continue;
      const path = join(dir, name);
      let st;
      try { st = statSync(path); } catch { continue; }
      if (st.isDirectory()) visit(path);
      else if (name === 'pet.json') out.push(path);
    }
  };
  visit(root);
  return out;
}

function framesOf(animations) {
  const list = Array.isArray(animations) ? animations : [];
  const usable = [];
  for (const item of list) {
    if (!item || !Array.isArray(item.frames) || !item.frames.length) continue;
    const frames = item.frames
      .filter((f) => f && typeof f.asset === 'string' && Array.isArray(f.rect) && f.rect.length === 4)
      .map((f) => ({ asset: f.asset, rect: f.rect.map((n) => Math.max(0, Math.round(Number(n) || 0))), ms: Math.min(10000, Math.max(20, Math.round(Number(f.durationMs) || 120))) }));
    if (frames.length) usable.push({ id: String(item.id ?? ''), label: String(item.label ?? ''), tags: Array.isArray(item.tags) ? item.tags.map(String) : [], loop: item.loop !== false, frames: frames.slice(0, 512) });
  }
  return usable;
}

/**
 * Parse one pet.json into what the converter needs, or null when it is not a usable dsh-pet pack.
 * Sizes and counts follow the published 1.0 bounds but stay generous: this is not the pack validator.
 */
export function readPetPack(manifestPath) {
  const manifest = readJson(manifestPath);
  if (!manifest || manifest.format !== 'dsh-pet' || !Array.isArray(Object.keys(manifest.assets ?? {}))) return null;
  const dir = dirname(manifestPath);
  const canvas = manifest.canvas ?? {};
  const width = Number(canvas.width);
  const height = Number(canvas.height);
  if (!(width >= 32 && width <= 2048 && height >= 32 && height <= 2048)) return null;

  const animationsPath = typeof manifest.animations === 'string' ? join(dir, manifest.animations) : join(dir, 'animations.json');
  const animations = framesOf(readJson(animationsPath) ?? []);
  if (!animations.length) return null;

  const assets = {};
  for (const [key, value] of Object.entries(manifest.assets ?? {})) {
    const rel = typeof value === 'string' ? value : value?.path;
    if (typeof rel !== 'string' || !IMAGE.test(rel)) continue;
    const path = resolve(dir, rel);
    if (!existsSync(path) || !statSync(path).isFile()) continue;
    assets[key] = { path, rel };
  }
  const used = new Set(animations.flatMap((a) => a.frames.map((f) => f.asset)).filter((k) => assets[k]));
  if (!used.size) return null;

  const thumbnail = typeof manifest.thumbnail === 'string' && IMAGE.test(manifest.thumbnail) && existsSync(join(dir, manifest.thumbnail))
    ? { path: join(dir, manifest.thumbnail), rel: manifest.thumbnail }
    : null;

  // Keep only the roles that a ported animation can drive, so the page has one animation per state.
  const roles = {};
  for (const [role, tags] of Object.entries(ROLE_TAGS)) {
    const hit = animations.find((a) => a.tags.some((tag) => tags.includes(tag)));
    if (hit) roles[role] = hit.id;
  }
  for (const [role, fallback] of Object.entries(manifest.fallbacks ?? {})) {
    if (roles[role]) continue;
    const hit = animations.find((a) => a.id === fallback);
    if (hit) roles[role] = hit.id;
  }
  if (!roles.idle) roles.idle = animations[0].id;

  // What a DSH pet does that an MCode pet page cannot: say it, do not drop it silently.
  const lost = [];
  if (typeof manifest.dialogue === 'string' || Array.isArray(manifest.dialogue)) lost.push('角色台词与对话气泡（dialogue.json）：MCode 桌宠页没有气泡，也没有台词表');
  const caps = Array.isArray(manifest.capabilities) ? manifest.capabilities.map(String) : [];
  if (caps.includes('sign') || manifestsSigns(animations)) lost.push('举牌与牌面文案：MCode 桌宠页不显示牌面文字');
  if (caps.includes('air-swing')) lost.push('near-miss / 空中挥击的落点判定：MCode 桌宠页只按时间放帧');
  if (caps.includes('scenes') || Array.isArray(manifest.scenes)) lost.push('场景包与场景切换（不同状态换背景）：MCode 桌宠窗口只有一个角色');
  if (caps.includes('look')) lost.push('鼠标视线跟随：MCode 桌宠页拿不到指针位置');
  if (manifest.dialogue === undefined && manifestsSigns(animations)) lost.push('举牌与牌面文案：MCode 桌宠页不显示牌面文字');
  lost.push('按力度 / 疲劳自动选动作（pressure、fatigue、minHoldMs）：MCode 桌宠页只跟着会话状态换动作');

  return {
    lost,
    manifestPath,
    dir,
    rel: manifestPath.split(sep).join('/'),
    id: String(manifest.id ?? ''),
    name: String(manifest.name ?? manifest.id ?? ''),
    author: typeof manifest.author === 'string' ? manifest.author : null,
    description: typeof manifest.description === 'string' ? manifest.description : '',
    license: null,
    canvas: { width, height },
    thumbnail,
    assets,
    usedAssets: [...used],
    animations,
    roles,
    totalFrames: animations.reduce((n, a) => n + a.frames.length, 0),
  };
}

function manifestsSigns(animations) {
  return animations.some((a) => a.tags.includes('sign') || a.id.includes('sign'));
}

/** All usable packs under root, richest first (more ported roles, then more frames). */
export function findPetPacks(root) {
  return findPetManifests(root)
    .map((path) => readPetPack(path))
    .filter(Boolean)
    .sort((a, b) => Object.keys(b.roles).length - Object.keys(a.roles).length || b.totalFrames - a.totalFrames);
}
