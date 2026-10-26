// A Tour or Highlights step shows what its text says the screen does, not the default (drum pads) screen it
// starts on. Every step of every card is played to its end with the site's own choreography (tests/harness.js):
// (a) a step the script's export has screens for (js/step-screens.js: what the controller shows after the
//     press, from the script itself) shows each of them;
// (b) a step whose text says the screen changes (the screen says / shows / warns ..., a popup, a page) shows a
//     screen other than its start screen at some point;
// (c) a Tour step whose combo opens a mode with a screen of its own ends on that mode's screen, never the
//     default.
// KNOWN_OPEN lists the steps the manual cannot show yet (no export of that screen): it may only shrink.
// Run: node --test tests
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const h = require('./harness.js');

const ctx = h.load();

// device + ' ' + section + ' ' + combo (+ ' (context)'): why it stays
const KNOWN_OPEN = {
  // the MIDI mode warning comes from NI's firmware, not the script
  'mikro start SHIFT+MASCHINE': 'NI firmware',
  // the strip's rate while touched: the touch is not in the export yet
  'mikro playing STRIP': 'strip touch not exported',
  'mk3 playing STRIP': 'strip touch not exported'
};

function steps(device) {
  const out = [];
  h.DATA.sections.forEach((section) => {
    if (!section.items || !section.items.length || (section.devices && !section.devices.includes(device))) return;
    section.items.forEach((item) => {
      if (item.devices && !item.devices.includes(device)) return;
      out.push({ combo: item.combo, does: item.does, context: item.context || null, values: item.values || null, section });
    });
  });
  return out;
}

function name(device, step) {
  return device + ' ' + step.section.id + ' ' + step.combo.join('+') + (step.context ? ' (' + step.context + ')' : '');
}

const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
// an MK3 screen pair by its pictures (a still or a frame of an animation)
const key = (s) => (s && s.left ? (s.left.anim || s.left.img) + '#' + (s.frame === undefined ? '' : s.frame) : JSON.stringify(s));

for (const device of ['mikro', 'mk3']) {
  const spec = ctx.LAYOUTS[device];
  const exported = (ctx.STEP_SCREENS || {})[device] || {};

  test(device + ': a step the script\'s export has screens for shows them all', () => {
    const failures = [];
    let checked = 0;
    steps(device).forEach((step) => {
      const page = step.section.id + ' ' + step.combo.join(' + ') + (step.context ? ' (' + step.context + ')' : '');
      if (!exported[page]) return;
      const own = spec.sectionScreens[step.section.id][step.combo.join('+') + (step.context ? ' (' + step.context + ')' : '')];
      if (!own || !own.exact) return;  // the page has hand-made screens of its own (checked elsewhere)
      checked++;
      const shown = h.play(ctx, step, device).screens.map(key);
      own.forEach((screen, i) => {
        if (!shown.includes(key(screen))) failures.push(name(device, step) + ': never shows screen ' + (i + 1));
      });
    });
    assert.deepStrictEqual(failures, []);
    assert.ok(checked >= 30, 'only ' + checked + ' steps use the export');
  });

  test(device + ': a step whose text says the screen changes shows it', () => {
    const says = /\b(the screen (says|shows|warns)|on the screen|shows it on the screen|named on the screen|the popup|popup says)\b/i;
    const failures = [];
    [...steps(device), ...h.pages(ctx, device).map((p) => p.step)].forEach((step) => {
      if (!says.test(step.does) || KNOWN_OPEN[name(device, step)]) return;
      const r = h.play(ctx, step, device);
      const first = r.screens[0];
      if (r.screens.every((s) => same(s, first))) failures.push(name(device, step) + ': only ' + (h.nameOf(spec.screens, first) || 'its start screen'));
    });
    assert.deepStrictEqual(failures, []);
  });

  test(device + ': a step that opens a mode ends on that mode\'s screen, not the default', () => {
    const failures = [];
    steps(device).forEach((step) => {
      // (the Highlights' own stories end where the controller does: the browser closes after a load)
      if (step.combo.length !== 1 || step.context || step.section.id === 'highlights') return;
      const mode = step.combo[0], want = spec.screens[mode];
      if (!want || same(want, spec.screen) || spec.sectionScreens[step.section.id]) return;
      const r = h.play(ctx, step, device), last = r.screens[r.screens.length - 1];
      if (same(last, spec.screen)) failures.push(name(device, step) + ': ends on the default screen');
    });
    assert.deepStrictEqual(failures, []);
  });

  test(device + ': the known open steps still need their entry', () => {
    const stale = Object.keys(KNOWN_OPEN).filter((k) => k.startsWith(device + ' ')).filter((k) => {
      const step = steps(device).find((s) => name(device, s) === k);
      if (!step) return true;
      const r = h.play(ctx, step, device);
      return !r.screens.every((s) => same(s, r.screens[0]));
    });
    assert.deepStrictEqual(stale, [], 'shows its screen now (or is gone): remove it from KNOWN_OPEN');
  });
}

test('the export\'s MK3 pictures are all there', () => {
  const fs = require('node:fs'), path = require('node:path');
  const missing = [];
  Object.values((ctx.STEP_SCREENS || {}).mk3 || {}).forEach((names) => names.forEach((n) => {
    ['left', 'right'].forEach((side) => {
      const file = path.join(__dirname, '..', 'img', 'screens', 'mk3', n + '-' + side + '.png');
      if (!fs.existsSync(file)) missing.push(n + '-' + side);
    });
  }));
  assert.deepStrictEqual(missing, []);
});
