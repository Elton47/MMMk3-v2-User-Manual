// The Highlights pages (js/best.js): with ranks in data/features.json every feature gets a page,
// the ranked ones first in rank order, the unranked ones after them, and the jump list opens with
// "The best of it" (best_of pages), then goes by mode. Run: node --test tests
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
global.MM = { el: () => null, h: () => null };
require(path.join(ROOT, 'js', 'best.js'));
const best = global.MM.best;
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'features.json'), 'utf8'));

const forDevice = (entry, device) => !entry.devices || entry.devices.includes(device);
const rankOf = (item, device) => (item.best && typeof item.best === 'object' ? item.best[device] : item.best);

function items(data, device) {
  const out = [];
  for (const s of data.sections) {
    if (!forDevice(s, device) || s.id === 'start') continue;
    for (const item of s.items) if (forDevice(item, device)) out.push(item);
  }
  return out;
}

for (const device of best.SITE_DEVICES) {
  test(device + ': every feature has a page, the best first', () => {
    const pages = best.pages(DATA, device);
    const mine = items(DATA, device);
    assert.strictEqual(pages.length, mine.length);
    assert.deepStrictEqual(new Set(pages.map((p) => p.item)), new Set(mine));
    const ranks = pages.map((p) => rankOf(p.item, device));
    assert.deepStrictEqual(ranks, ranks.slice().sort((a, b) => a - b));
    for (const p of pages) assert.ok(p.title && p.title.length <= 91, p.title);
  });

  test(device + ': the jump list opens with The best of it, then goes by mode', () => {
    const pages = best.pages(DATA, device);
    const n = best.bestOf(DATA, device);
    assert.ok(n > 0 && n < pages.length);
    const groups = best.jumpGroups(pages, n);
    assert.strictEqual(groups[0].name, 'The best of it');
    assert.strictEqual(groups[0].pages.length, n);
    assert.ok(groups.slice(1).every((g) => g.name !== 'The best of it' && g.section), 'one Best of it group');
    // each mode is one block after it, and the groups cover every page in order
    const ids = groups.slice(1).map((g) => g.section.id);
    assert.strictEqual(new Set(ids).size, ids.length, ids.join(' '));
    assert.deepStrictEqual(groups.flatMap((g) => g.pages), pages);
    groups.forEach((g, i) => assert.strictEqual(g.start, i ? groups[i - 1].start + groups[i - 1].pages.length : 0));
  });
}

test('the Highlights card stays in The best of it', () => {
  for (const device of best.SITE_DEVICES) {
    const pages = best.pages(DATA, device).slice(0, best.bestOf(DATA, device));
    const highlights = DATA.sections.find((s) => s.id === 'highlights').items.filter((i) => forDevice(i, device));
    for (const item of highlights) assert.ok(pages.some((p) => p.item === item), device + ': ' + item.does);
  }
});

test('unranked items follow the ranked ones, in the Tour order', () => {
  const data = {
    tour_order: { mk3: ['b', 'a'] },
    sections: [
      { id: 'start', title: 'Start', items: [{ combo: ['X'], does: 'Start.' }] },
      { id: 'a', title: 'A', items: [{ combo: ['A1'], does: 'A one.', best: 2 }, { combo: ['A2'], does: 'A two.' }] },
      { id: 'b', title: 'B', items: [{ combo: ['B1'], does: 'B one.' }, { combo: ['B2'], does: 'B two.', best: { mikro: 9, mk3: 1 } }] }
    ]
  };
  assert.deepStrictEqual(best.pages(data, 'mk3').map((p) => p.title), ['B two', 'A one', 'B one', 'A two']);
  assert.deepStrictEqual(best.pages(data, 'mikro').map((p) => p.title), ['A one', 'B two', 'A two', 'B one']);
  assert.strictEqual(best.bestOf(data, 'mk3'), 0, 'no best_of: no Best of it group');
  assert.deepStrictEqual(best.jumpGroups(best.pages(data, 'mk3'), 0).map((g) => g.pages.length), [1, 1, 1, 1]);
});

test('a headline is the title', () => {
  const data = { sections: [{ id: 'a', title: 'A', items: [{ combo: ['A'], does: 'Tap: a long text. More.', headline: 'Short', best: 1 }] }] };
  assert.strictEqual(best.pages(data, 'mikro')[0].title, 'Short');
});
