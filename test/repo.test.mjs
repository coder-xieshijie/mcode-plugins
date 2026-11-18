import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validatePlugin } from '../plugins/dsh-skin-import/scripts/lib/validate.mjs';
import { contrastReport } from '../plugins/dsh-skin-import/scripts/lib/derive.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const preset = root + 'plugins/preset-themes';

test('preset themes are generated from palettes.mjs and pass the self-check', () => {
  execFileSync('node', ['scripts/build-preset-themes.mjs', '--check'], { cwd: root, stdio: 'pipe' });
  assert.deepEqual(validatePlugin(preset), []);
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
    }
  }
});

test('octopus boot package declares the dissolve ending and its wallpapers', () => {
  const decl = JSON.parse(readFileSync(root + 'plugins/octopus-boot/package/appearance/appearance.json', 'utf8'));
  assert.equal(decl.settings.find((s) => s.key === 'ending').default, 'dissolve');
  assert.equal(decl.wallpapers.length, 3);
  const css = readFileSync(root + 'plugins/octopus-boot/package/pages/boot/boot.css', 'utf8');
  assert.match(css, /html \{\n  background: transparent;/u);
});
