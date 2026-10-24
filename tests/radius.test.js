// Every rounded corner on the site uses one radius family: the tokens on :root in css/styles.css
// (--r 10px, --r-s 6px, --r-xs 2px, --r-full for real circles and pills), 0 or inherit. No
// stray big corners. Run: node --test tests
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const noComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const cssFiles = fs.readdirSync(path.join(ROOT, 'css')).filter((f) => f.endsWith('.css')).map((f) => 'css/' + f);

const EXPECTED = { '--r': '10px', '--r-s': '6px', '--r-xs': '2px', '--r-full': '999px' };

test('the radius tokens are defined once, on :root', () => {
  const css = noComments(read('css/styles.css'));
  const root = /:root\s*\{([^}]*)\}/.exec(css)[1];
  const tokens = {};
  for (const m of root.matchAll(/(--r(?:-[a-z]+)?)\s*:\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();
  assert.deepStrictEqual(tokens, EXPECTED);
  assert.ok(!/--md-sys-shape/.test(cssFiles.map(read).join('\n')), 'the old shape scale is gone');
});

test('every border-radius uses the family', () => {
  const allowed = new Set(['0', 'inherit', ...Object.keys(EXPECTED).map((t) => 'var(' + t + ')')]);
  const bad = [];
  for (const file of cssFiles) {
    for (const m of noComments(read(file)).matchAll(/border(?:-[a-z]+)*-radius\s*:\s*([^;}]+)/g)) {
      const parts = m[1].replace(/!important/, '').trim().split(/\s+/);
      if (!parts.every((p) => allowed.has(p))) bad.push(file + ': ' + m[0]);
    }
  }
  assert.deepStrictEqual(bad, []);
});

test('no corner is set outside the style sheets', () => {
  const files = ['index.html', 'activate.html', 'check-screens.html',
    ...fs.readdirSync(path.join(ROOT, 'js')).map((f) => 'js/' + f)];
  const bad = files.filter((f) => /border-?radius/i.test(read(f)));
  assert.deepStrictEqual(bad, []);
});
