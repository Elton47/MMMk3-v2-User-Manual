// The animations follow the controls, frame by frame (the manual's fidelity rule): every page of both
// controllers is played tick by tick (tests/harness.js), and every MK3 showcase animation
// (img/screens/mk3/anim/index.json: frames and the cue of each step) is walked step by step.
//   1. A turn (the 4-D encoder) or a new press changes the screens in that step: they follow the
//      control. (An animation that plays on its own clock, not stepped by the page, is left out.)
//   2. The encoder only turns in the drawing when the encoder is what turned (a knob's turn lights
//      and outlines that knob).
//   3. While SHIFT is held on a page, the pads show SHIFT's functions, as on the controller.
// Run: node --test tests
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const h = require('./harness.js');

const ctx = h.load();
const INDEX = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'img', 'screens', 'mk3', 'anim', 'index.json'), 'utf8'));

// --- the showcase animations (cues) ------------------------------------------------------------------

function frameKey(entry, k) {
  return JSON.stringify([entry.left.frames[k], entry.right.frames[k]]);
}

function stepFrames(entry, s) {
  const per = entry.step / entry.every, first = Math.round(s * per);
  const last = Math.min(entry.frames, Math.round((s + 1) * per));
  const out = [];
  for (let k = first; k < Math.max(first + 1, last); k++) out.push(Math.min(k, entry.frames - 1));
  return out;
}

const pressedNew = (before, after) => (after.lit || []).filter((id) => !(before.lit || []).includes(id));

test('mk3 showcases: a turn or a press changes the screens in its step', () => {
  const failures = [];
  for (const [name, entry] of Object.entries(INDEX)) {
    const cues = entry.cues || [];
    for (let s = 1; s < cues.length; s++) {
      const before = cues[s - 1] || {}, after = cues[s] || {};
      const turned = (after.turn || 0) !== (before.turn || 0);
      const pressed = pressedNew(before, after).filter((id) => !/^PAD /.test(id));
      if (!turned && !pressed.length) continue;
      const previous = frameKey(entry, stepFrames(entry, s - 1).slice(-1)[0]);
      if (stepFrames(entry, s).every((k) => frameKey(entry, k) === previous)) {
        failures.push(name + ' step ' + s + ': ' + (turned ? 'turn ' + after.turn : 'press ' + pressed.join('+')) +
          ' leaves the screens as they were');
      }
    }
  }
  assert.deepStrictEqual(failures, []);
});

test('mk3 showcases: the encoder turns only when the encoder turned', () => {
  const failures = [];
  for (const [name, entry] of Object.entries(INDEX)) {
    (entry.cues || []).forEach((cue, s) => {
      const before = s ? entry.cues[s - 1] || {} : {};
      if (!cue || (cue.turn || 0) === (before.turn || 0)) return;
      const glow = cue.glow || [];
      if (glow.length && glow[0] !== 'ENCODER' && !/^(TURN|PUSH)$/.test(glow[0])) {
        failures.push(name + ' step ' + s + ': the encoder turns while ' + glow[0] + ' is the control');
      }
    });
  }
  assert.deepStrictEqual(failures, []);
});

// --- every page, tick by tick ---------------------------------------------------------------------------

function screenKey(screen) {
  if (!screen) return 'none';
  return JSON.stringify(screen);
}
const selfPlaying = (screen) => !!(screen && screen.anim && typeof screen.frame !== 'number');

// Pages whose turn has no screens of its own yet (the value after each detent, from the script itself, still to
// be exported): they show one screen while the encoder turns. Listed so the list only shrinks: a page that
// follows its turns must leave it, a new page that doesn't fails.
const STILL_ON_TURN = {
  mikro: ['drum TURN', 'slicing TURN', 'mixer TURN', 'mixer PUSH + TURN', 'step PUSH + TURN', 'step SHIFT + TURN',
    'step TURN', 'chords TURN', 'keyboard SHIFT + TURN', 'keyboard PUSH + TURN', 'keyboard TURN', 'events EVENTS + TURN',
    'clip TURN', 'clip SHIFT + TURN', 'scene TURN', 'track TURN'],
  mk3: ['drum PAD + TURN', 'transport REC + TURN', 'playing FIXED VEL + TURN', 'drum TURN', 'chords TURN',
    'keyboard TURN', 'keyboard SHIFT + TURN', 'track TURN']
};

for (const device of ['mikro', 'mk3']) {
  const spec = ctx.LAYOUTS[device];

  test(device + ': the screen follows each turn of the encoder', () => {
    const failures = [], still = [];
    h.pages(ctx, device).forEach(({ page, step }, i) => {
      const ticks = h.play(ctx, step, device).ticks;
      const key = page.section.id + ' ' + step.combo.join(' + ') + (step.context ? ' (' + step.context + ')' : '');
      let follows = true;
      for (let n = 1; n < ticks.length; n++) {
        const a = ticks[n - 1], b = ticks[n];
        if (a.turn === b.turn || selfPlaying(b.screen) || selfPlaying(a.screen)) continue;
        if (screenKey(a.screen) === screenKey(b.screen)) { follows = false; break; }
      }
      if (!follows) still.push(key);
      if (!follows && !STILL_ON_TURN[device].includes(key)) failures.push(device + ' page ' + (i + 1) + ' [' + key + ']: a turn leaves the screen');
    });
    assert.deepStrictEqual(failures, []);
    assert.deepStrictEqual(STILL_ON_TURN[device].filter((key) => !still.includes(key)), [], 'these follow their turns now: out of the list');
  });

  test(device + ': SHIFT held shows the SHIFT pads', () => {
    const failures = [];
    h.pages(ctx, device).forEach(({ page, step }, i) => {
      if (!step.combo.includes('SHIFT') || step.combo.some((t) => /^(SELECT|GROUP|SOLO|MUTE|STOP)$/.test(t))) return;
      const ticks = h.play(ctx, step, device).ticks;
      const held = ticks.filter((t) => t.lit.includes('SHIFT'));
      if (held.some((t) => !samePadsBut(t.pads, spec.padDemos.SHIFT))) {
        failures.push(device + ' page ' + (i + 1) + ' [' + page.section.id + '] ' + step.combo.join(' + ') +
          (step.context ? ' (' + step.context + ')' : '') + ': SHIFT held, the pads are not SHIFT\'s');
      }
    });
    assert.deepStrictEqual(failures, []);
  });
}

// The SHIFT pads, one of them pressed (bright): still SHIFT's pads.
function samePadsBut(pads, demo) {
  if (!pads || !demo) return false;
  let differ = 0;
  for (let i = 0; i < 16; i++) if (JSON.stringify(pads[i]) !== JSON.stringify(demo[i])) differ++;
  return differ <= 1;
}
