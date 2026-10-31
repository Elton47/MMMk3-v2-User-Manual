// The manual's 1:1 audit, on what the pages really do: every Highlights page of both controllers is
// played to its end with the site's own choreography (tests/harness.js), and
// (b) the control the callout points at is one the page's combo names;
// (c) a page shows its own mode: no SHIFT pads or SHIFT screens on a page without SHIFT, a page whose
//     context names a mode (KNOB in KEYBOARD) ends on that mode's screens, and SCENE's pages show
//     SCENE's own screens, not PATTERN's;
// (d) the MIKRO's pages never show the MK3's two screens, the MK3's never the MIKRO's one.
// Run: node --test tests
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const h = require('./harness.js');

const ctx = h.load();

function each(device, check) {
  const failures = [];
  h.pages(ctx, device).forEach(({ page, step }, i) => {
    const record = h.play(ctx, step, device);
    const problem = check(step, record, page);
    if (problem) failures.push(device + ' page ' + (i + 1) + ' [' + page.section.id + '] ' + step.combo.join(' + ') +
      (step.context ? ' (' + step.context + ')' : '') + ': ' + problem);
  });
  return failures;
}

const matches = (combo, id) => combo.some((t) => t === id || ctx.tokenMatches(t, id));

for (const device of ['mikro', 'mk3']) {
  const spec = ctx.LAYOUTS[device];

  test(device + ': the callout points at a control the page names', () => {
    // (a setting's page points at the screen, where its value is read)
    const failures = each(device, (step, r) => (matches(step.combo, r.glow[0]) ||
      (r.glow[0] === 'SCREEN' && step.section.id === 'settings') ? null : 'callout on ' + r.glow[0]));
    assert.deepStrictEqual(failures, []);
  });

  test(device + ': a page without SHIFT never shows the SHIFT pads or screens', () => {
    const failures = each(device, (step, r) => {
      if (step.combo.includes('SHIFT')) return null;
      if (r.pads.some((p) => p && h.nameOf({ SHIFT: spec.padDemos.SHIFT }, p))) return 'SHIFT pads';
      if (spec.screens.SHIFT && r.screens.some((s) => h.nameOf({ SHIFT: spec.screens.SHIFT }, s))) return 'SHIFT screen';
      return null;
    });
    assert.deepStrictEqual(failures, []);
  });

  test(device + ': a page in a mode ends on that mode\'s screen', () => {
    const failures = each(device, (step, r) => {
      const want = step.context && spec.screens[step.context];
      if (!want || step.section.id === 'settings') return null;
      const last = r.screens[r.screens.length - 1];
      return h.nameOf({ want }, last) ? null : 'ends on ' + (h.nameOf(spec.screens, last) || 'another screen');
    });
    assert.deepStrictEqual(failures, []);
  });

  test(device + ': the pages show this controller\'s screens', () => {
    const failures = each(device, (step, r) => {
      const two = r.screens.filter((s) => s && (s.left || s.right)).length;
      if (device === 'mikro' && two) return 'the MK3\'s screens';
      if (device === 'mk3' && r.screens.some((s) => s && !(s.left || s.right))) return 'the MIKRO\'s screen';
      return null;
    });
    assert.deepStrictEqual(failures, []);
  });
}

test('mk3: SCENE has its own screens, not PATTERN\'s', () => {
  const screens = ctx.LAYOUTS.mk3.screens;
  assert.notStrictEqual(screens.SCENE.anim, screens.PATTERN.anim);
});

// Elton, 2026-10-31: the slicing pages showed PAD MODE's drum page and the MASCHINE drum colours on the
// pads. A sliced Simpler's pads are its slices in the track's colour (drum.py _slice_colors), and the MK3's
// PAD MODE / PAD pages play the PLUG-IN Slicing showcase.
for (const device of ['mikro', 'mk3']) {
  test(device + ': the slicing pages show slices on the pads, never the drum pads', () => {
    const section = h.DATA.sections.find((s) => s.id === 'slicing');
    const drums = ctx.SAMPLE_TRACKS[0].color;
    const failures = [];
    const demo = ctx.LAYOUTS[device].padDemos.SLICES;
    if (demo.some((p) => !p || p.drum || p.color !== drums)) failures.push('SLICES: the track colour, no drum names');
    section.items.filter((item) => !item.devices || item.devices.includes(device)).forEach((item) => {
      const step = { combo: item.combo, does: item.does, context: item.context || null, values: null, section };
      const r = h.play(ctx, step, device);
      r.pads.filter(Boolean).forEach((list) => list.forEach((p) => {
        if (p && p.drum) failures.push(item.combo.join('+') + ': drum pad ' + p.drum);
      }));
      if (device === 'mk3' && ['PAD MODE', 'PAD'].includes(item.combo[0]) &&
          r.screens.some((s) => s === ctx.LAYOUTS.mk3.screens['PAD MODE'])) failures.push(item.combo.join('+') + ': PAD MODE screen');
    });
    assert.deepStrictEqual([...new Set(failures)], []);
  });
}

test('the slicing section lights its pads as slices in the full manual', () => {
  assert.strictEqual(ctx.SECTION_PADS.slicing['*'], 'SLICES');
});
