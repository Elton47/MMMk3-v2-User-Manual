// The Tour: Getting started and Highlights come first on every controller, and switching the controller never scrolls.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

test('the MK3 Tour starts with Getting started, then Highlights', () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data/features.json'), 'utf8'));
  for (const order of Object.values(data.tour_order || {})) assert.deepStrictEqual(order.slice(0, 2), ['start', 'highlights']);
  const ids = data.sections.filter((s) => s.items && s.items.length).map((s) => s.id);
  assert.deepStrictEqual(ids.slice(0, 2), ['start', 'highlights'], 'the MIKRO follows the file order');
});

test('switching the controller keeps the page where it is', () => {
  const src = fs.readFileSync(path.join(root, 'js/tour.js'), 'utf8');
  const fn = src.slice(src.indexOf('function switchDevice'), src.indexOf('function awayChanged'));
  assert.match(fn, /var y = window\.scrollY;[\s\S]*window\.scrollTo\(0, y\)/);
  assert.doesNotMatch(fn, /jump\(|scrollIntoView/);
});
