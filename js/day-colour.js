// The day's colour: one of MASCHINE's pad colours (data/palette.json: all 16, in MASCHINE's
// order) is the site's accent, a new one every day at 12:00 local time (the morning keeps the day
// before's). Auto rotates over the FIRST 14 only (AUTO_COUNT): the two pinks, Magenta and Fuchsia,
// are left out of the rotation but can be picked. The rule is the same as the dev chat page's, so
// both show the same colour on the same day: the date 12 hours from now, its day of the year from
// 0, modulo 14.
//
// The visitor can pin any of the 16 instead (the colour pads in the theme popover, js/site.js),
// remembered as `accent` (a palette index; none or unreadable storage: Auto).
//
// The surfaces, outlines and neutral text keep the site's own Material tones, turned to the
// day's hue: light tints on the light theme, dark shades on the dark one, never the accent
// itself. Text is nudged until it reads at WCAG AA (4.5:1) on every surface it sits on. The tab
// icon takes the day's colour too.
//
// Loaded in <head> after css/styles.css: the colours of the last visit (remembered as
// `dayPalette`) apply before the first paint, then data/palette.json is read and applied.
// Works in Node too (tests/day-colour.test.js requires it).
(function (root) {
  'use strict';

  // The site's own scheme (css/styles.css) from the seed #E8620A: the tones that turn with the day.
  var SEED = '#e8620a';
  var BASE = {
    light: {
      'secondary': '#765749', 'on-secondary': '#ffffff', 'secondary-container': '#ffdbcc', 'on-secondary-container': '#5c4033',
      'tertiary': '#005ea6', 'on-tertiary': '#ffffff', 'tertiary-container': '#0076cf', 'on-tertiary-container': '#fdfcff',
      'surface': '#fff8f6', 'surface-dim': '#e2d8d4', 'surface-bright': '#fff8f6',
      'surface-container-lowest': '#ffffff', 'surface-container-low': '#fcf1ee', 'surface-container': '#f6ece8',
      'surface-container-high': '#f0e6e2', 'surface-container-highest': '#ebe0dd',
      'on-surface': '#1f1b19', 'on-surface-variant': '#51443e', 'outline': '#83746d', 'outline-variant': '#d6c3bb',
      'inverse-surface': '#352f2d', 'inverse-on-surface': '#f9efeb'
    },
    dark: {
      'secondary': '#e6bead', 'on-secondary': '#442a1e', 'secondary-container': '#5c4033', 'on-secondary-container': '#ffdbcc',
      'tertiary': '#a2c9ff', 'on-tertiary': '#00315c', 'tertiary-container': '#1693fc', 'on-tertiary-container': '#002548',
      'surface': '#171211', 'surface-dim': '#171211', 'surface-bright': '#3e3836',
      'surface-container-lowest': '#110d0c', 'surface-container-low': '#1f1b19', 'surface-container': '#231f1d',
      'surface-container-high': '#2e2927', 'surface-container-highest': '#393431',
      'on-surface': '#ebe0dd', 'on-surface-variant': '#d6c3bb', 'outline': '#9e8d86', 'outline-variant': '#51443e',
      'inverse-surface': '#ebe0dd', 'inverse-on-surface': '#352f2d'
    }
  };
  var SURFACES = ['surface', 'surface-dim', 'surface-bright', 'surface-container-lowest', 'surface-container-low',
    'surface-container', 'surface-container-high', 'surface-container-highest'];
  var WHITE = [255, 255, 255], BLACK = [0, 0, 0];
  var AUTO_COUNT = 14;  // Auto's rotation: the palette's first 14 (no Magenta, no Fuchsia)
  // the colours' names, in the palette's order (MASCHINE's own)
  var NAMES = ['Red', 'Orange', 'Light Orange', 'Warm Yellow', 'Yellow', 'Lime', 'Green', 'Mint', 'Cyan',
    'Turquoise', 'Blue', 'Plum', 'Violet', 'Purple', 'Magenta', 'Fuchsia'];

  // --- colour helpers -------------------------------------------------------------------------

  function lum(c) {
    function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  }
  function contrast(a, b) { var x = lum(a) + 0.05, y = lum(b) + 0.05; return x > y ? x / y : y / x; }
  function mix(c, t, w) { return c.map(function (v, i) { return Math.round(v + (t[i] - v) * w); }); }
  function hex(c) { return '#' + c.map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function rgbOf(s) { return [1, 3, 5].map(function (i) { return parseInt(s.slice(i, i + 2), 16); }); }
  // black or white, whichever reads better (0.179: the same contrast with both)
  function onColor(c) { return lum(c) > 0.179 ? BLACK : WHITE; }
  // c moved toward t in 5 % steps until ok(c)
  function toward(c, t, ok) {
    var w = 0, x = c;
    while (!ok(x) && w < 1) { w += 0.05; x = mix(c, t, w); }
    return x;
  }
  function hueOf(c) {
    var n = c.map(function (v) { return v / 255; });
    var M = Math.max.apply(null, n), m = Math.min.apply(null, n), d = M - m;
    if (!d) return 0;
    var h = M === n[0] ? ((n[1] - n[2]) / d) % 6 : M === n[1] ? (n[2] - n[0]) / d + 2 : (n[0] - n[1]) / d + 4;
    return (h * 60 + 360) % 360;
  }
  // the same lightness and saturation at hue h
  function rehue(c, h) {
    var n = c.map(function (v) { return v / 255; });
    var M = Math.max.apply(null, n), m = Math.min.apply(null, n), C = M - m, o = (M + m) / 2 - C / 2;
    if (!C) return c;
    h = (h % 360 + 360) % 360;
    var X = C * (1 - Math.abs((h / 60) % 2 - 1));
    return [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][Math.floor(h / 60) % 6]
      .map(function (v) { return Math.round((v + o) * 255); });
  }
  // fg nudged (toward white or black, whichever needs less) until it reaches `ratio` on every bg
  function readable(fg, bgs, ratio) {
    function ok(x) { return bgs.every(function (b) { return contrast(x, b) >= ratio; }); }
    if (ok(fg)) return fg;
    var best = null;
    [WHITE, BLACK].forEach(function (t) {
      for (var w = 0.05; w <= 1.001; w += 0.05) {
        var x = mix(fg, t, w);
        if (ok(x)) { if (!best || w < best.w) best = { w: w, c: x }; return; }
      }
    });
    if (best) return best.c;
    var first = bgs[0];
    return contrast(WHITE, first) >= contrast(BLACK, first) ? WHITE : BLACK;
  }

  // --- the day ----------------------------------------------------------------------------------

  // Auto's palette index for `date` (the dev chat's rule, kept equal: tests/day-colour.test.js):
  // the date 12 hours later, its day of the year from 0 (rounded: a DST change moves midnight by
  // an hour), modulo `count` (autoCount()). So the colour turns at noon.
  function autoCount(palette) { return Math.min(AUTO_COUNT, palette.length); }
  function dayIndex(date, count) {
    var d = new Date(date.getTime());
    d.setHours(d.getHours() + 12);
    var y = d.getFullYear();
    return Math.round((new Date(y, d.getMonth(), d.getDate()) - new Date(y, 0, 1)) / 864e5) % count;
  }

  function validPalette(list) {
    return Array.isArray(list) && list.length > 0 && list.every(function (c) {
      return Array.isArray(c) && c.length === 3 && c.every(function (v) {
        return typeof v === 'number' && v === Math.round(v) && v >= 0 && v <= 255;
      });
    });
  }

  // The colour roles for the day colour c: { light: {role: '#rrggbb'}, dark: {...}, extra: {...} }.
  function scheme(c) {
    var dh = hueOf(c) - hueOf(rgbOf(SEED));
    function side(dark) {
      var base = BASE[dark ? 'dark' : 'light'], t = {};
      Object.keys(base).forEach(function (k) { var v = rgbOf(base[k]); t[k] = rehue(v, hueOf(v) + dh); });
      // the accent: a light tint on dark surfaces, a deep shade on light ones; its container the other way
      var p = dark ? toward(c, WHITE, function (x) { return lum(x) >= 0.45; }) : toward(c, BLACK, function (x) { return lum(x) <= 0.12; });
      var k = dark ? mix(c, BLACK, 0.6) : mix(c, WHITE, 0.78);
      var surfaces = SURFACES.map(function (s) { return t[s]; });
      t['primary'] = readable(p, surfaces, 4.5);
      t['on-primary'] = onColor(t['primary']);
      t['primary-container'] = k;
      t['on-primary-container'] = onColor(k);
      t['inverse-primary'] = dark ? toward(c, BLACK, function (x) { return lum(x) <= 0.12; }) : toward(c, WHITE, function (x) { return lum(x) >= 0.45; });
      // text keeps AA on every surface it sits on; outlines keep 3:1 (WCAG's figure for UI parts)
      ['on-surface', 'on-surface-variant', 'tertiary'].forEach(function (fg) { t[fg] = readable(t[fg], surfaces, 4.5); });
      ['outline', 'secondary'].forEach(function (fg) { t[fg] = readable(t[fg], surfaces, 3); });
      [['on-secondary', 'secondary'], ['on-secondary-container', 'secondary-container'], ['on-tertiary', 'tertiary'],
        ['on-tertiary-container', 'tertiary-container'], ['inverse-on-surface', 'inverse-surface']].forEach(function (pair) {
        t[pair[0]] = readable(t[pair[0]], [t[pair[1]]], 4.5);
      });
      return t;
    }
    return { light: side(false), dark: side(true), pad: c, padDim: mix(c, BLACK, 0.55) };
  }

  function declarations(roles) {
    return Object.keys(roles).map(function (k) { return '--md-sys-color-' + k + ': ' + hex(roles[k]) + ';'; }).join(' ');
  }

  // The style sheet: the same selectors as css/styles.css (later in the page, so these win).
  function css(c) {
    var s = scheme(c);
    var pads = '--day-pad: ' + hex(s.pad) + '; --day-pad-dim: ' + hex(s.padDim) + ';';
    return ':root { ' + pads + ' ' + declarations(s.light) + ' }\n' +
      '@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ' + declarations(s.dark) + ' } }\n' +
      ':root[data-theme="dark"] { ' + declarations(s.dark) + ' }\n' +
      // the printable sheets (#setup/print, #whatsnew) stay light in both themes, in the day's colour
      '.print-doc { ' + declarations(s.light) + ' }\n';
  }

  // The tab icon: the site's logo (four pads and the stick) with the day's colour on the pads.
  function favicon(c) {
    var lit = hex(c), dim = hex(mix(c, BLACK, 0.55));
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='3' fill='#0f0f10'/>" +
      "<rect x='3' y='3' width='11.5' height='11.5' rx='1' fill='" + lit + "'/>" +
      "<rect x='17.5' y='3' width='11.5' height='11.5' rx='1' fill='" + dim + "'/>" +
      "<rect x='3' y='17.5' width='11.5' height='11.5' rx='1' fill='" + lit + "'/>" +
      "<rect x='17.5' y='17.5' width='11.5' height='11.5' rx='1' fill='" + dim + "'/>" +
      "<path d='M13.4 1.4H18.6L16.6 4.4V30H15.4V4.4Z' fill='#f4ece9' stroke='#0f0f10' stroke-width='.5' paint-order='stroke' stroke-linejoin='round'/></svg>";
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  var api = { dayIndex: dayIndex, autoCount: autoCount, AUTO_COUNT: AUTO_COUNT, NAMES: NAMES, scheme: scheme, css: css, favicon: favicon, validPalette: validPalette,
    contrast: contrast, hex: hex, onColor: onColor, lum: lum, SURFACES: SURFACES };

  if (typeof module === 'object' && module.exports) { module.exports = api; return; }

  // --- in the page ------------------------------------------------------------------------------

  var doc = root.document, palette = null, shown = '', listeners = [];

  function remembered() {
    try { var p = JSON.parse(root.localStorage.getItem('dayPalette')); return validPalette(p) ? p : null; } catch (e) { return null; }
  }
  function remember(p) {
    try { root.localStorage.setItem('dayPalette', JSON.stringify(p)); } catch (e) { /* storage blocked: fine */ }
  }

  // the pinned colour (a palette index), or null for Auto
  function choice() {
    var v = null;
    try { v = root.localStorage.getItem('accent'); } catch (e) { return null; }
    var i = v === null ? NaN : Number(v);
    return palette && i === Math.round(i) && i >= 0 && i < palette.length ? i : null;
  }
  // index: a palette index to pin, or null for Auto
  function pick(index) {
    try {
      if (index === null) root.localStorage.removeItem('accent');
      else root.localStorage.setItem('accent', String(index));
    } catch (e) { /* no storage: Auto */ }
    apply();
  }
  function autoIndex() { return palette ? dayIndex(new Date(), autoCount(palette)) : null; }
  function current() { var c = choice(); return c === null ? autoIndex() : c; }

  function apply() {
    if (!palette) return;
    var c = palette[current()], key = hex(c);
    listeners.forEach(function (fn) { try { fn(); } catch (e) { /* a broken listener never stops the colour */ } });
    if (key === shown) return;
    shown = key;
    var style = doc.getElementById('day-colour');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'day-colour';
      doc.head.appendChild(style);
    }
    style.textContent = css(c);
    var s = scheme(c);
    var icon = doc.querySelector('link[rel="icon"]');
    if (icon) icon.setAttribute('href', favicon(c));
    // the browser's bar takes the day's background
    doc.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) {
      var dark = /dark/.test(meta.getAttribute('media') || '');
      meta.setAttribute('content', hex((dark ? s.dark : s.light)['surface']));
    });
  }

  function use(p) {
    if (!validPalette(p)) return;
    palette = p;
    apply();
  }

  api.apply = apply;
  api.pick = pick;
  api.choice = choice;
  api.autoIndex = autoIndex;
  api.palette = function () { return palette; };
  // fn() after the colour or the palette changed (the theme popover's pads)
  api.onChange = function (fn) { listeners.push(fn); };
  root.MMDay = api;
  use(remembered());
  if (root.fetch) {
    root.fetch('data/palette.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (p) {
      if (!validPalette(p)) return;
      remember(p);
      use(p);
    }).catch(function () { /* the colours of the last visit, or the site's own */ });
  }
  // the next colour at noon, without a reload
  setInterval(apply, 60000);
})(this);
