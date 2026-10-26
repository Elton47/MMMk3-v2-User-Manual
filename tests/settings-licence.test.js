// SETTINGS > Licence on the MIKRO, 1:1 with the controller: the row right before About (after Covers), and its
// card plays the press -> the confirmation (CANCEL first) -> a turn to CONFIRM -> the licence page's popup.
// The texts are the script's (checked in its repository: tests/test_manual_settings_licence.py).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const h = require('./harness.js');

const ctx = h.load();
const settings = h.DATA.sections.find((s) => s.id === 'settings');
const licence = settings.items.find((i) => i.context === 'Licence');

test('the list ends with Covers, Licence, About', () => {
  const names = ctx.settingsRows().map((row) => row.split('\t')[0]);
  assert.deepStrictEqual([...names.slice(-3)], ['Covers', 'Licence', 'About']);
  assert.ok(ctx.settingsRows().includes('Licence\tActivated'));
  // features.json documents the settings in the same order
  const documented = settings.items.filter((i) => i.context).map((i) => i.context);
  assert.deepStrictEqual(documented.slice(-3), ['Covers', 'Licence', 'About']);
});

test('the Licence card: the row, the confirmation, CONFIRM, the popup, the page again', () => {
  const rec = h.play(ctx, { combo: licence.combo, does: licence.does, context: 'Licence', values: licence.values, section: settings }, 'mikro');
  const seen = rec.ticks.map((t) => t.screen);
  const at = (screen) => seen.findIndex((s) => JSON.stringify(s) === JSON.stringify(screen));
  const row = at(ctx.settingsScreen('Licence'));
  const ask = at(ctx.licenceConfirmScreen(false));
  const yes = at(ctx.licenceConfirmScreen(true));
  const opened = at(ctx.licenceOpenedScreen());
  assert.ok(row >= 0 && row < ask && ask < yes && yes < opened, [row, ask, yes, opened].join(' '));
  assert.deepStrictEqual(JSON.stringify(seen[seen.length - 1]), JSON.stringify(ctx.settingsScreen('Licence')));
  assert.match(ctx.licenceConfirmScreen(false).TITLE, /^Licence page\?: MIKRO MK3 edition, bu\*\*\*@example\.com\. /);
  assert.strictEqual(ctx.licenceConfirmScreen(false).SUBTITLE, '[Cancel]  Confirm');
  // the pushes light the encoder, the turn to CONFIRM is one detent more
  assert.deepStrictEqual([...rec.ticks[ask].lit], ['ENCODER']);
  assert.strictEqual(rec.ticks[yes].turn, rec.ticks[ask].turn + 1);
});
