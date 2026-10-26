// Runs the site's own page choreography (js/highlights.js, js/highlight-shows.js, js/layouts.js,
// js/manual.js) in node, without a browser: every Highlights page of a controller is played to its
// end and what it does is recorded (the outlined controls, the lit buttons, the screens and the
// pads per tick). Used by tests/audit.test.js.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

function fakeNode() {
  const node = {
    style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null }, removeAttribute() {}, appendChild(c) { return c; },
    addEventListener() {}, removeEventListener() {}, querySelector() { return fakeNode(); },
    querySelectorAll() { return []; }, insertBefore(c) { return c; }, getContext() { return null; },
    textContent: '', innerHTML: ''
  };
  return node;
}

function load() {
  const context = {
    console, Math, JSON, Date, Object, Array, Number, String, RegExp, isFinite, parseInt, parseFloat, setTimeout() {},
    clearTimeout() {}, performance: { now: () => 0 },
    document: { createElement: fakeNode, createElementNS: fakeNode, createTextNode: fakeNode, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, documentElement: fakeNode(), body: fakeNode() },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    addEventListener() {}, location: { hash: '' }, navigator: {}
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ['site.js', 'screen-render.js', 'layouts.js', 'manual.js', 'highlight-shows.js', 'highlights.js', 'best.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', file), 'utf8'), context, { filename: file });
  }
  return context;
}

const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'features.json'), 'utf8'));

// What one page does, tick by tick: { glow, lit: Set of ids, screens: [screen objects], pads: [pad lists] }.
function play(ctx, step, device) {
  const spec = ctx.LAYOUTS[device];
  const show = ctx.MM.tourShow(step, device);
  const rec = { glow: show.glow || step.combo, outlined: [], lit: new Set(), screens: [], pads: [], ticks: [] };
  // the state after each tick: { lit (exactly these buttons), turn, screen, pads } (a tick draws its whole state)
  let now = { lit: [], turn: 0, screen: null, pads: null };
  const blank = () => Array.from({ length: 16 }, () => null);
  const lcdFrom = (oled) => (oled && (oled.left || oled.right) ? oled : null);
  const api = {
    device, layout: spec, calm: false, blank,
    lit: (color, level, drum) => ({ color, level, drum: drum || null }),
    demo: (token) => { const d = (spec.padDemos || {})[token]; return d ? d.slice() : blank(); },
    pads: (list) => { rec.pads.push(list || null); now.pads = list || null; },
    screen: (oled, lcd) => shown(device === 'mk3' ? (lcd === undefined ? now.screen : lcd || lcdFrom(oled)) : oled),
    screenOf: (token) => shown((spec.screens || {})[token] || spec.screen),
    show: (lines) => shown(lines || spec.screen),
    light: (ids) => { (ids || []).forEach((id) => rec.lit.add(id)); now.lit = (ids || []).slice(); },
    turn: (steps) => { now.turn = steps; }, strip() {},
    outline: (tokens) => rec.outlined.push(tokens)
  };
  const ticks = Math.ceil((show.duration || 6500) / (show.every || 500));
  function shown(screen) { rec.screens.push(screen); now.screen = screen; }
  for (let n = 0; n <= ticks; n++) {
    show.tick(n, api);
    rec.ticks.push({ lit: now.lit.slice(), turn: now.turn, screen: now.screen, pads: now.pads });
  }
  return rec;
}

function pages(ctx, device) {
  return ctx.MM.best.pages(DATA, device).map((p) => ({
    page: p, step: { combo: p.item.combo, does: p.item.does, context: p.item.context || null, values: p.item.values || null, section: p.section }
  }));
}

// The name of a layout screen / pad demo an object is (by identity or by content), else null.
function nameOf(table, value) {
  if (!value) return null;
  const json = JSON.stringify(value);
  for (const key of Object.keys(table || {})) {
    const v = table[key];
    if (v === value || JSON.stringify(v) === json) return key;
  }
  return null;
}

module.exports = { load, play, pages, nameOf, DATA };
