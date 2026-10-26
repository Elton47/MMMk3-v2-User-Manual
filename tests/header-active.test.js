// The header's icon buttons look "active" on their own page, like the tabs (help on #help, the bug on report.html).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('an icon button on its own page gets the active tab look', () => {
  const css = read('css/styles.css');
  assert.match(css, /\.icon-button\[aria-current="page"\]\s*\{[^}]*secondary-container/);
});

test('#help marks the help button, not the Set up tab', () => {
  const app = read('js/app.js');
  assert.match(app, /showView\('setup', 'help'\)/);
  assert.match(app, /el\('help-button'\)[\s\S]{0,200}tabName === 'help'/);
});

test('the report page marks its own bug button', () => {
  assert.match(read('report.html'), /<a href="report.html" class="icon-button" aria-current="page"/);
});
