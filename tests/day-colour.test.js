// The day's colour (js/day-colour.js) is the same as the dev chat page's on the same day: the same
// 16 colours in the same order (data/palette.json), Auto rotating over the first 14 (no pinks) with
// the same day index, turning at noon. The chat's palette and its index rule are copied below as a
// fixture. Run: node --test
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const day = require('../js/day-colour.js');

const ROOT = path.join(__dirname, '..');

// The chat's palette as its page serves it (accent.js PADS, from chat_palette.accent_colors):
// MASCHINE's 16 pad colours, Red .. Fuchsia.
const CHAT_PADS = [[255, 20, 20], [255, 90, 0], [255, 145, 30], [255, 190, 0], [255, 235, 0], [150, 240, 0],
  [0, 220, 40], [0, 230, 140], [0, 220, 230], [0, 160, 255], [30, 70, 255], [100, 40, 255],
  [150, 40, 255], [200, 30, 255], [255, 30, 200], [255, 30, 110]];

// The chat's day index, as in its accent.js dayAccent(), over its first 14 colours.
const CHAT_ROTATION = 14;
function chatIndex(now, length) {
  const d = new Date(now.getTime()); d.setHours(d.getHours() + 12); const y = d.getFullYear();
  return Math.round((new Date(y, d.getMonth(), d.getDate()) - new Date(y, 0, 1)) / 864e5) % length;
}

const palette = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/palette.json'), 'utf8'));

test('the palette is the chat\'s: the same 16 colours in the same order', () => {
  assert.deepStrictEqual(palette, CHAT_PADS);
  assert.ok(day.validPalette(palette));
});

test('the day index is the chat\'s, and it turns at noon', () => {
  const dates = [];
  for (let m = 0; m < 12; m++) for (const d of [1, 14, 28]) for (const h of [0, 6, 11, 12, 13, 23]) {
    dates.push(new Date(2026, m, d, h, 30));
  }
  // a year's end, a leap day, and the hours round the DST changes in Europe and the US
  dates.push(new Date(2026, 11, 31, 11, 59), new Date(2026, 11, 31, 12, 0), new Date(2028, 1, 29, 12, 0),
    new Date(2026, 2, 29, 1, 30), new Date(2026, 2, 29, 12, 0), new Date(2026, 9, 25, 2, 30),
    new Date(2026, 9, 25, 12, 0), new Date(2026, 2, 8, 12, 0), new Date(2026, 10, 1, 12, 0));
  for (const date of dates) {
    assert.strictEqual(day.dayIndex(date, day.autoCount(palette)), chatIndex(date, CHAT_ROTATION), String(date));
  }
  // the morning keeps the day before's colour, noon brings the next one
  const before = day.dayIndex(new Date(2026, 9, 25, 11, 59), 14), after = day.dayIndex(new Date(2026, 9, 25, 12, 0), 14);
  assert.strictEqual(after, (before + 1) % 14);
  assert.strictEqual(day.dayIndex(new Date(2026, 9, 26, 9, 0), 14), after);
});

test('Auto never lands on the pinks (Magenta, Fuchsia), and visits the other 14', () => {
  assert.strictEqual(day.autoCount(palette), 14);
  assert.deepStrictEqual(day.NAMES.slice(14), ['Magenta', 'Fuchsia']);
  const seen = new Set();
  for (let d = 0; d < 400; d++) seen.add(day.dayIndex(new Date(2026, 0, 1 + d, 15), day.autoCount(palette)));
  assert.deepStrictEqual([...seen].sort((a, b) => a - b), [...Array(14).keys()]);
});

test('text reads at WCAG AA on every surface, for every colour, in both themes', () => {
  for (const c of palette) {
    const s = day.scheme(c);
    for (const name of ['light', 'dark']) {
      const t = s[name], where = day.hex(c) + ' ' + name;
      for (const surface of day.SURFACES) {
        for (const fg of ['on-surface', 'on-surface-variant', 'primary', 'tertiary']) {
          assert.ok(day.contrast(t[fg], t[surface]) >= 4.5, where + ': ' + fg + ' on ' + surface);
        }
        assert.ok(day.contrast(t.outline, t[surface]) >= 3, where + ': outline on ' + surface);
      }
      for (const [fg, bg] of [['on-primary', 'primary'], ['on-primary-container', 'primary-container'],
        ['on-secondary-container', 'secondary-container'], ['on-tertiary-container', 'tertiary-container'],
        ['inverse-on-surface', 'inverse-surface']]) {
        assert.ok(day.contrast(t[fg], t[bg]) >= 4.5, where + ': ' + fg + ' on ' + bg);
      }
    }
  }
});

test('the style sheet sets both themes with the site\'s selectors', () => {
  const css = day.css(palette[0]);
  assert.match(css, /^:root \{ --day-pad: #ff1414;/);
  assert.match(css, /@media \(prefers-color-scheme: dark\) \{ :root:not\(\[data-theme="light"\]\) \{/);
  assert.match(css, /:root\[data-theme="dark"\] \{/);
  assert.match(day.favicon(palette[0]), /^data:image\/svg\+xml,/);
});

test('the printable sheets take the day colour, in the light tones whatever the theme (Elton)', () => {
  palette.forEach((c, i) => {
    const light = day.scheme(c).light;
    const sheet = day.css(c).match(/\.print-doc \{ ([^}]*) \}/);
    assert.ok(sheet, 'pad ' + (i + 1) + ': no .print-doc rule');
    ['primary', 'surface', 'surface-container-low', 'secondary-container'].forEach((role) => {
      assert.ok(sheet[1].includes('--md-sys-color-' + role + ': ' + day.hex(light[role]) + ';'), 'pad ' + (i + 1) + ' ' + role);
    });
  });
});

test('no broken characters (UTF-8 read as Latin-1) in the site\'s files', () => {
  const files = ['index.html'].concat(
    ['js', 'css', 'data'].flatMap((d) => fs.readdirSync(path.join(ROOT, d)).map((f) => d + '/' + f)))
    .filter((f) => /\.(html|js|css|json)$/.test(f));
  files.forEach((f) => {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!/Â[· -¿]|â€/.test(text), f + ' has mojibake');
  });
});

test('text on a pad colour is black or white by the WCAG luminance rule (the onText), all 16', () => {
  const BLACK = [0, 0, 0], WHITE = [255, 255, 255];
  palette.forEach((c, i) => {
    const want = day.lum(c) > 0.179 ? BLACK : WHITE;  // 0.179: the same contrast with black and white
    assert.deepStrictEqual(day.onColor(c), want, 'pad ' + (i + 1));
    // the better of the two, never below the other
    assert.ok(day.contrast(want, c) >= day.contrast(want === BLACK ? WHITE : BLACK, c), 'pad ' + (i + 1));
    // the accent's own text follows the same rule
    const s = day.scheme(c);
    for (const t of [s.light, s.dark]) {
      assert.deepStrictEqual(t['on-primary'], day.onColor(t.primary));
      assert.deepStrictEqual(t['on-primary-container'], day.onColor(t['primary-container']));
    }
  });
  // Lime, Green, Mint, Turquoise: black. Blue, Plum, Violet: white.
  for (const pad of [6, 7, 8, 10]) assert.deepStrictEqual(day.onColor(palette[pad - 1]), BLACK, 'pad ' + pad);
  for (const pad of [11, 12, 13]) assert.deepStrictEqual(day.onColor(palette[pad - 1]), WHITE, 'pad ' + pad);
});
