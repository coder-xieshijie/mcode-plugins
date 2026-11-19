import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validatePlugin } from '../plugins/dsh-plugin-convert/scripts/lib/validate.mjs';
import { CODE_SURFACE_MIN_DELTA, contrastReport } from '../plugins/dsh-plugin-convert/scripts/lib/derive.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const preset = root + 'plugins/preset-themes';

test('preset themes are generated from palettes.mjs and pass the self-check', () => {
  execFileSync('node', ['scripts/build-preset-themes.mjs', '--check'], { cwd: root, stdio: 'pipe' });
  assert.deepEqual(validatePlugin(preset), []);
});

test('open-details never claims success and takes the scheme from MCODE_APP_SCHEME or --scheme', () => {
  const run = (env, ...a) => JSON.parse(execFileSync('node', ['plugins/dsh-plugin-convert/scripts/open-details.mjs', ...a], { cwd: root, env: { ...process.env, MCODE_APP_SCHEME: env } }).toString());
  const none = run('', 'mcode-demo');
  assert.equal(none.url, null);
  assert.equal(none.opened, false);
  assert.match(none.manualPath, /mcode-demo/u);
  const fromEnv = run('minimax-cn-test', 'mcode-demo');
  assert.equal(fromEnv.url, 'minimax-cn-test://plugin/details?name=mcode-demo');
  assert.equal(fromEnv.launched, false);
  const staging = run('minimax-cn-test', 'mcode-demo', '--scheme', 'minimax-cn-staging');
  assert.equal(staging.url, 'minimax-cn-staging://plugin/details?name=mcode-demo');
  assert.equal(run('not-a-scheme', 'mcode-demo').url, null);
});

test('open-boot builds the plugin/boot link only for a plugin with a boot page', () => {
  const run = (env, dir) => JSON.parse(execFileSync('node', ['plugins/dsh-plugin-convert/scripts/open-boot.mjs', dir], { cwd: root, env: { ...process.env, MCODE_APP_SCHEME: env } }).toString());
  const octopus = run('minimax-cn', root + 'plugins/octopus-boot/package');
  const name = JSON.parse(readFileSync(root + 'plugins/octopus-boot/package/.minimax-plugin/plugin.json', 'utf8')).name;
  assert.equal(octopus.hasBootPage, true);
  assert.equal(octopus.url, 'minimax-cn://plugin/boot?name=' + name);
  assert.equal(octopus.launched, false);
  assert.equal(run('', root + 'plugins/octopus-boot/package').url, null);
  const themes = run('minimax-cn', preset);
  assert.equal(themes.hasBootPage, false);
  assert.equal(themes.url, null);
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
