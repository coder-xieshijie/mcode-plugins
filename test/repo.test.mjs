import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validatePlugin } from '../plugins/dsh-skin-import/scripts/lib/validate.mjs';
import { CODE_SURFACE_MIN_DELTA, contrastReport } from '../plugins/dsh-skin-import/scripts/lib/derive.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const preset = root + 'plugins/preset-themes';

test('preset themes are generated from palettes.mjs and pass the self-check', () => {
  execFileSync('node', ['scripts/build-preset-themes.mjs', '--check'], { cwd: root, stdio: 'pipe' });
  assert.deepEqual(validatePlugin(preset), []);
});

test('open-details never claims success and needs an explicit scheme', () => {
  const run = (...a) => JSON.parse(execFileSync('node', ['plugins/dsh-skin-import/scripts/open-details.mjs', ...a], { cwd: root, env: { ...process.env, MCODE_DEEPLINK_SCHEME: '' } }).toString());
  const none = run('mcode-demo');
  assert.equal(none.url, null);
  assert.equal(none.opened, false);
  assert.match(none.manualPath, /mcode-demo/u);
  const staging = run('mcode-demo', '--scheme', 'minimax-cn-staging');
  assert.equal(staging.url, 'minimax-cn-staging://plugin/details?name=mcode-demo');
  assert.equal(staging.launched, false);
});

test('preset themes keep body text at 4.5:1 or better', () => {
  const decl = JSON.parse(readFileSync(preset + '/appearance/appearance.json', 'utf8'));
  assert.equal(decl.themes.length, 9);
  for (const t of decl.themes) {
    for (const [mode, def] of Object.entries(t.modes)) {
      assert.equal(Object.keys(def.colors).length, 47, t.id);
      assert.equal(Object.keys(def.code).length, 9, t.id);
      const r = contrastReport(def, mode);
      assert.ok(r.primary.ratio >= 4.5, `${t.id}/${mode} primary ${r.primary.ratio}`);
      assert.ok(r.secondary.ratio >= 4.5 && r.accent.ratio >= 4.5 && r.inverted.ratio >= 4.5, `${t.id}/${mode}`);
      assert.ok(r.codeSurface.ratio >= CODE_SURFACE_MIN_DELTA[mode], `${t.id}/${mode} code block surface ${r.codeSurface.ratio}`);
    }
  }
});

test('octopus boot package declares the dissolve ending and its wallpapers', () => {
  const decl = JSON.parse(readFileSync(root + 'plugins/octopus-boot/package/appearance/appearance.json', 'utf8'));
  assert.equal(decl.settings.find((s) => s.key === 'ending').default, 'dissolve');
  assert.equal(decl.wallpapers.length, 3);
  const css = readFileSync(root + 'plugins/octopus-boot/package/pages/boot/boot.css', 'utf8');
  // html and body stay transparent (a body background would paint the whole canvas and not fade);
  // the dark backdrop lives on #stage and fades with the page.
  assert.match(css, /html,\nbody \{[^}]*background: transparent;/u);
  assert.doesNotMatch(css.replace(/html,\nbody \{[^}]*\}/u, ''), /(?:^|\n)(?:html|body)\s*\{[^}]*background/u);
  assert.match(css, /#stage \{\n  background: #05070d;/u);
  const js = readFileSync(root + 'plugins/octopus-boot/package/pages/boot/boot.js', 'utf8');
  assert.equal((js.match(/host\.dismiss\(\)/gu) ?? []).length, 1, 'dismiss() is only called at the end of the fade');
});
