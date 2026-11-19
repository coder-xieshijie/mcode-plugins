// Licence checks for fonts and media. Code licences (package.json) never cover artwork.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

const RESTRICTED = /CC[ -]BY[ -](?:[A-Z]+-)*NC|NonCommercial|non-commercial|非商业|未授权|not (?:be )?licen[cs]ed|权利归原权利人|all rights reserved|不在授权范围|不得商用|商用.{0,6}(?:联系|授权)/iu;
const PERMISSIVE_ART = /\bCC0\b|CC[ -]BY(?:[ -]SA)?[ -]4\.0|CC[ -]BY(?:[ -]SA)?\b|public domain|公有领域|Creative Commons Attribution/iu;
const FONT_LICENSE = /SIL Open Font License|\bOFL(?:-1\.1)?\b|Apache License|Ubuntu Font Licen[cs]e/iu;
const LICENSE_FILE = /^(?:LICEN[CS]E|COPYING|NOTICE|OFL|CREDITS|ATTRIBUTION|LICENSE-ARTWORK|ASSETS?)[\w.-]*$/iu;

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/gu, '');

export function licenseFilesNear(root, file) {
  const out = [];
  let dir = dirname(file);
  for (;;) {
    if (existsSync(dir)) {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (LICENSE_FILE.test(name) && statSync(p).isFile()) out.push(p);
      }
    }
    if (relative(root, dir) === '' || dir === dirname(dir)) break;
    dir = dirname(dir);
  }
  return out;
}

/**
 * Font licence: ok when a licence file near the font (or a package text mentioning the family)
 * names a redistributable font licence. textIndex: [{path, text}] of package text files.
 */
export function fontLicense({ root, file, family, textIndex }) {
  const fam = norm(family);
  const stem = file ? norm(basename(file).replace(/\.[^.]+$/u, '')) : '';
  for (const p of file ? licenseFilesNear(root, file) : []) {
    const text = readFileSync(p, 'utf8');
    // A font licence file in the font's own directory covers the fonts shipped there.
    if (dirname(p) === dirname(file) && FONT_LICENSE.test(text)) {
      return { status: 'ok', license: FONT_LICENSE.exec(text)[0], evidence: relative(root, p) };
    }
    if (FONT_LICENSE.test(text) && (norm(text).includes(fam) || (stem && norm(text).includes(stem)))) {
      return { status: 'ok', license: FONT_LICENSE.exec(text)[0], evidence: relative(root, p) };
    }
  }
  for (const { path, text } of textIndex) {
    const n = text.toLowerCase();
    let i = -1;
    const famLoose = family.toLowerCase().replace(/\s+/gu, '-');
    for (const needle of [family.toLowerCase(), famLoose]) {
      while ((i = n.indexOf(needle, i + 1)) >= 0) {
        const win = text.slice(Math.max(0, i - 400), i + 400);
        if (FONT_LICENSE.test(win)) return { status: 'ok', license: FONT_LICENSE.exec(win)[0], evidence: relative(root, path) };
      }
    }
  }
  return { status: 'unconfirmed', reason: '没有找到覆盖这个字体的可再分发字体许可（OFL / Apache 等）' };
}

/** Media licence for a file: restricted (NC / unauthorised), ok (explicit art licence), or unconfirmed. */
export function mediaLicense({ root, file, manifestLicense }) {
  if (manifestLicense) {
    if (RESTRICTED.test(manifestLicense)) return { status: 'restricted', reason: '清单许可为 ' + manifestLicense };
    if (PERMISSIVE_ART.test(manifestLicense)) return { status: 'ok', license: manifestLicense, evidence: 'skin manifest' };
  }
  const files = licenseFilesNear(root, file);
  const readme = ['README.md', 'README.zh.md', 'README.zh-CN.md', 'README.en.md'].map((n) => join(root, n)).filter(existsSync);
  const base = basename(file);
  for (const p of [...files, ...readme]) {
    const text = readFileSync(p, 'utf8');
    const isReadme = readme.includes(p);
    // README only counts where it talks about this file.
    const scope = isReadme ? windowAround(text, base) : text;
    if (!scope) continue;
    if (RESTRICTED.test(scope)) return { status: 'restricted', reason: '许可说明含非商业或未授权条款', evidence: relative(root, p) };
    if (!isReadme && /artwork|素材|美术|image|video|assets|插画|视频|图片/iu.test(text) && PERMISSIVE_ART.test(text)) {
      return { status: 'ok', license: PERMISSIVE_ART.exec(text)[0], evidence: relative(root, p) };
    }
  }
  return { status: 'unconfirmed', reason: '包里没有写明这份素材的作者与授权（代码许可不覆盖素材）' };
}

function windowAround(text, needle) {
  const i = text.indexOf(needle);
  return i < 0 ? '' : text.slice(Math.max(0, i - 600), i + 600);
}
