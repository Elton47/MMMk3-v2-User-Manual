// The interactive manual: schematic controller, sections from data/features.json, search,
// selection, deep links (#mikro/SHIFT, #mk3/PLUG-IN, #mikro?q=arp).
MM.manual = (function () {
  'use strict';

  var SVG = 'http://www.w3.org/2000/svg';
  var el = MM.el, h = MM.h;
  var state = { data: null, device: 'mikro', selected: null, query: '', terms: [], index: [], ready: false, drawing: null };

  // --- data helpers ------------------------------------------------------------------------

  function forDevice(entry) { return !entry.devices || entry.devices.indexOf(state.device) >= 0; }
  function layout() { return LAYOUTS[state.device]; }
  function controlIds() { return layout().controls.map(function (c) { return c[0]; }); }
  function controlsForToken(token) { return controlIds().filter(function (id) { return tokenMatches(token, id); }); }
  function itemUsesControl(item, id) { return item.combo.some(function (token) { return tokenMatches(token, id); }); }

  // The colour of a drum pad name, from the drum name colour table in features.json (first
  // matching row wins, like the script's rules). A keyword matches anywhere in the name ignoring
  // case; a keyword of several words needs all of them; a short capitalised keyword (CH, OH) must
  // be a whole word. Names no row matches keep `fallback`.
  function drumColor(name, fallback) {
    var words = name.toLowerCase().split(/[^a-z0-9]+/);
    var lower = name.toLowerCase();
    function matches(keyword) {
      if (/^[A-Z]{1,2}$/.test(keyword)) return words.indexOf(keyword.toLowerCase()) >= 0;
      return keyword.toLowerCase().split(' ').every(function (part) { return lower.indexOf(part) >= 0; });
    }
    var hit = null;
    (state.data ? state.data.sections : []).some(function (section) {
      return (section.swatches || []).some(function (swatch) {
        if (swatch.keywords.some(matches)) hit = swatch.rgb;
        return !!hit;
      });
    });
    return hit || fallback;
  }

  function visibleSections() {
    return state.data.sections.filter(forDevice).map(function (section) {
      return { section: section, items: section.items.filter(forDevice) };
    });
  }

  // --- hardware drawing --------------------------------------------------------------------

  function node(name, attrs, parent) {
    var n = document.createElementNS(SVG, name);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  function controlName(id, label) {
    if (/^PAD \d+$/.test(id)) return 'Pad ' + label;
    if (id === '◀') return 'Left arrow';
    if (id === '▶') return 'Right arrow';
    return id;
  }

  // A 5 x 7 pixel font for the OLED screen (our own glyphs). Each glyph: 7 rows of 5 bits.
  var PIXEL_FONT = {
    'A': '01110100011000111111100011000110001', 'B': '11110100011000111110100011000111110',
    'C': '01110100011000010000100001000101110', 'D': '11110100011000110001100011000111110',
    'E': '11111100001000011110100001000011111', 'F': '11111100001000011110100001000010000',
    'G': '01110100011000010111100011000101111', 'H': '10001100011000111111100011000110001',
    'I': '01110001000010000100001000010001110', 'J': '00111000100001000010000101001001100',
    'K': '10001100101010011000101001001010001', 'L': '10000100001000010000100001000011111',
    'M': '10001110111010110101100011000110001', 'N': '10001100011100110101100111000110001',
    'O': '01110100011000110001100011000101110', 'P': '11110100011000111110100001000010000',
    'Q': '01110100011000110001101011001001101', 'R': '11110100011000111110101001001010001',
    'S': '01111100001000001110000010000111110', 'T': '11111001000010000100001000010000100',
    'U': '10001100011000110001100011000101110', 'V': '10001100011000110001100010101000100',
    'W': '10001100011000110101101011010101010', 'X': '10001100010101000100010101000110001',
    'Y': '10001100010101000100001000010000100', 'Z': '11111000010001000100010001000011111',
    '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110',
    '2': '01110100010000100010001000100011111', '3': '11111000100010000010000011000101110',
    '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110',
    '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000',
    '8': '01110100011000101110100011000101110', '9': '01110100011000101111000010001001100',
    '-': '00000000000000011111000000000000000', '.': '00000000000000000000000000110001100',
    ':': '00000011000110000000011000110000000', ' ': '00000000000000000000000000000000000',
    '/': '00001000100001000100010000100010000', '%': '11001110100001000100010000101110011',
    '+': '00000001000010011111001000010000000', '>': '10000010000010000010001000100010000',
    '<': '00001000100010001000001000001000001', '_': '00000000000000000000000000000011111'
  };

  // Path data for text in the pixel font: top-left at (x, y), one font pixel = px units.
  function pixelText(text, x, y, px) {
    var d = '';
    String(text).toUpperCase().split('').forEach(function (ch, i) {
      var glyph = PIXEL_FONT[ch] || PIXEL_FONT[' '];
      for (var bit = 0; bit < 35; bit++) {
        if (glyph.charAt(bit) !== '1') continue;
        var gx = x + (i * 6 + bit % 5) * px, gy = y + Math.floor(bit / 5) * px;
        d += 'M' + gx.toFixed(2) + ' ' + gy.toFixed(2) + 'h' + px.toFixed(2) + 'v' + px.toFixed(2) + 'h-' + px.toFixed(2) + 'z';
      }
    });
    return d;
  }

  function gradient(defs, type, id, attrs, stops) {
    var g = node(type, Object.assign({ id: id }, attrs), defs);
    stops.forEach(function (st) {
      node('stop', { offset: st[0], 'stop-color': st[1], 'stop-opacity': st[2] === undefined ? 1 : st[2] }, g);
    });
  }

  // The gradients of the realistic drawings, once per page in a hidden <svg> of their own: every
  // drawing (the manual's and the highlights tour's) refers to them, and a gradient inside a
  // hidden view would not paint the other one.
  function sharedDefs() {
    if (el('hw-defs')) return;
    var holder = node('svg', { id: 'hw-defs', width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' });
    holder.style.position = 'absolute';
    var defs = node('defs', {}, holder);
    gradient(defs, 'linearGradient', 'hw-body-fill', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#202022'], [1, '#141415']]);
    gradient(defs, 'linearGradient', 'hw-cap-fill', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#353538'], [1, '#27272a']]);
    gradient(defs, 'radialGradient', 'hw-pad-fill', { cx: '50%', cy: '45%', r: '70%' }, [[0, '#4a4a4e'], [1, '#353538']]);
    gradient(defs, 'radialGradient', 'hw-pad-sheen', { cx: '50%', cy: '45%', r: '60%' }, [[0, '#ffffff', 0.45], [1, '#ffffff', 0]]);
    gradient(defs, 'radialGradient', 'hw-knob-fill', { cx: '38%', cy: '32%', r: '75%' }, [[0, '#47474b'], [0.55, '#1c1c1f'], [1, '#0b0b0c']]);
    gradient(defs, 'radialGradient', 'hw-knob-top', { cx: '40%', cy: '34%', r: '72%' }, [[0, '#6b6b70'], [0.6, '#404044'], [1, '#2a2a2d']]);
    gradient(defs, 'linearGradient', 'hw-light-fill', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#e9edf0'], [1, '#c4cbd0']]);
    gradient(defs, 'linearGradient', 'hw-glass-fill', { x1: 0, y1: 0, x2: 0.35, y2: 1 }, [[0, '#121214'], [0.45, '#08080a'], [1, '#040405']]);
    document.body.appendChild(holder);
  }

  function drawIcon(g, icon, x, y, w, hgt) {
    var cx = x + w / 2, cy = y + hgt / 2, r = Math.min(w, hgt) * 0.24;
    if (icon === 'maschine') {
      node('circle', { cx: cx, cy: cy, r: r, 'class': 'icon-line' }, g);
      node('circle', { cx: cx, cy: cy, r: r * 0.45, 'class': 'icon-fill' }, g);
    } else if (icon === 'star') {
      var pts = [];
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r * 1.1;
        pts.push((cx + rr * Math.cos(a)).toFixed(2) + ',' + (cy + rr * Math.sin(a)).toFixed(2));
      }
      node('polygon', { points: pts.join(' '), 'class': 'icon-fill' }, g);
    } else if (icon === 'search') {
      node('circle', { cx: cx + r * 0.25, cy: cy - r * 0.15, r: r * 0.7, 'class': 'icon-line' }, g);
      node('path', { d: 'M' + (cx + r * 0.75) + ' ' + (cy + r * 0.4) + 'l' + r * 0.6 + ' ' + r * 0.6 +
        'M' + (cx - r * 1.4) + ' ' + (cy - r * 0.6) + 'h' + r * 0.6 +
        'M' + (cx - r * 1.4) + ' ' + cy + 'h' + r * 0.6 +
        'M' + (cx - r * 1.4) + ' ' + (cy + r * 0.6) + 'h' + r * 0.6, 'class': 'icon-line' }, g);
    } else if (icon === 'left' || icon === 'right') {
      var s = icon === 'left' ? -1 : 1;
      node('path', { d: 'M' + (cx + s * r * 0.7) + ' ' + cy + 'L' + (cx - s * r * 0.6) + ' ' + (cy - r * 0.8) +
        'V' + (cy + r * 0.8) + 'Z', 'class': 'icon-fill' }, g);
    }
  }

  // Printed button text: the label top left, the grey SHIFT label under it (when there is room).
  function drawLabel(g, label, opts, x, y, w, hgt) {
    var pad = Math.min(7, w * 0.08);
    if (opts.inverse) {
      var tw = label.length * 6.4 + 8;
      node('rect', { x: x + pad, y: y + 5, width: tw, height: 12, rx: 1.5, 'class': 'label-box' }, g);
      node('text', { x: x + pad + 4, y: y + 11.5, 'class': 'label inverse' }, g).textContent = label;
      return;
    }
    var main = node('text', { x: x + pad, y: y + 10.5, 'class': 'label' + (opts.tone ? ' ' + opts.tone : '') }, g);
    main.textContent = (opts.prefix ? opts.prefix + ' ' : '') + label;
    if (opts.sub && hgt > 22) {
      node('text', { x: x + pad, y: y + 21, 'class': 'sublabel' + (opts.tone ? ' ' + opts.tone : '') }, g).textContent = opts.sub;
    }
  }

  function svgText(parent, x, y, cls, text) {
    var t = node('text', { x: x, y: y, 'class': cls }, parent);
    t.textContent = text;
    return t;
  }

  // One colour screen (480 x 272 units, like the MK3's displays), in the layout of the script's
  // screens: labels for the display buttons, a header with an accent bar, a big value or a list,
  // and 4 knob cells at the bottom.
  function drawLcd(g, side) {
    g.innerHTML = '';
    var accent = side.accent || '#ff8000';
    var top = 6;
    if (side.buttons) {
      side.buttons.forEach(function (label, i) {
        if (label) svgText(g, 60 + i * 120, 18, 'lcd-button', label.toUpperCase());
      });
      node('rect', { x: 0, y: 34, width: 480, height: 1.5, 'class': 'lcd-rule' }, g);
      top = 42;
    }
    node('rect', { x: 0, y: top, width: 6, height: 54, fill: accent }, g);
    svgText(g, 18, top + 17, 'lcd-title', side.title || '');
    if (side.sub) svgText(g, 18, top + 43, 'lcd-sub', side.sub);
    var knobs = side.knobs || [];
    if (side.center) {
      svgText(g, 240, knobs.length ? 140 : 156, 'lcd-center', side.center);
      if (side.small) svgText(g, 240, knobs.length ? 176 : 200, 'lcd-small', side.small);
    }
    (side.list || []).forEach(function (item, i) {
      var y = top + 68 + i * 28, chosen = i === side.selected;
      if (chosen) node('rect', { x: 8, y: y, width: 464, height: 26, rx: 2, fill: accent }, g);
      var chip = item[2] ? drumColor(item[2], item[1]) : item[1];
      if (chip) node('rect', { x: 16, y: y + 6, width: 9, height: 14, fill: chip, 'class': 'lcd-chip' }, g);
      svgText(g, item[1] ? 34 : 18, y + 13, 'lcd-list' + (chosen ? ' chosen' : ''), item[0]);
    });
    if (!knobs.length) return;
    node('rect', { x: 0, y: 194, width: 480, height: 1.5, 'class': 'lcd-rule' }, g);
    knobs.forEach(function (knob, i) {
      var x0 = i * 120, touched = i === side.touched;
      if (touched) node('rect', { x: x0 + 2, y: 197, width: 116, height: 75, 'class': 'lcd-touched' }, g);
      svgText(g, x0 + 60, 213, 'lcd-knob-name', knob[0]);
      if (knob[1] !== null && knob[1] !== undefined) {
        node('rect', { x: x0 + 12, y: 226, width: 96, height: 7, 'class': 'lcd-track' }, g);
        node('rect', { x: x0 + 12, y: 226, width: 96 * knob[1], height: 7, fill: knob[3] || accent }, g);
      }
      svgText(g, x0 + 60, 254, 'lcd-knob-value' + (touched ? ' touched' : ''), knob[2] || '');
    });
  }

  // A drawing of a layout in an <svg>: the manual's (#device, the controls are buttons) and the
  // highlights tour's (js/highlights.js, a picture). options.onSelect(id): called when a control
  // is clicked or chosen with Enter / Space; without it the controls are not interactive.
  // Returns { svg, device, layout(), draw(device), node(id), showScreen(lines), paintPads(demo),
  // dots (the strip LEDs) }.
  function createDrawing(svg, options) {
    options = options || {};
    var drawing = { svg: svg, device: null, oled: null, lcd: null, dots: [] };

    drawing.layout = function () { return LAYOUTS[drawing.device]; };

    drawing.node = function (id) {
      return svg.querySelector('[data-id="' + id.replace(/"/g, '\\"') + '"]');
    };

    // The screens show `lines`: the OLED takes text lines, the colour screens { left, right } (a
    // side that is left out shows the layout's default).
    drawing.showScreen = function (lines) {
      var lcd = drawing.lcd;
      if (lcd && lines && lcd.content !== lines) {
        lcd.content = lines;
        Object.keys(lcd.sides).forEach(function (name) {
          drawLcd(lcd.sides[name], lines[name] || drawing.layout().screen[name]);
        });
      }
      // The OLED: 2 lines (big + small) or 3 small lines, like the script's screens. In the 3-line
      // layout a line can be { text, inverse: true }: dark text on a lit bar (a chosen list entry).
      var oled = drawing.oled;
      if (!oled || !lines || oled.lines === lines) return;
      oled.lines = lines;
      var px = oled.px, d = '', inverse = '';
      if (lines.length > 2) {
        lines.forEach(function (line, i) {
          var x = oled.x + 2 * px, y = oled.y + (2 + i * 11) * px;
          if (line && line.inverse) {
            d += 'M' + oled.x.toFixed(2) + ' ' + (y - px).toFixed(2) + 'h' + (128 * px).toFixed(2) +
              'v' + (9 * px).toFixed(2) + 'h-' + (128 * px).toFixed(2) + 'z';
            inverse += pixelText(line.text, x, y, px);
          } else {
            d += pixelText(line && line.text !== undefined ? line.text : line || '', x, y, px);
          }
        });
      } else {
        d = pixelText(lines[0] || '', oled.x + 2 * px, oled.y + 2 * px, px * 2) +
          pixelText(lines[1] || '', oled.x + 2 * px, oled.y + 21 * px, px);
      }
      oled.path.setAttribute('d', d);
      oled.inverse.setAttribute('d', inverse);
    };

    // The pads as a mode lights them: demo is 16 entries in pad order, null or { color, level,
    // drum } (see padDemos() in layouts.js); no demo lights nothing.
    drawing.paintPads = function (demo) {
      for (var n = 1; n <= 16; n++) {
        var g = drawing.node('PAD ' + n);
        if (!g) continue;
        var entry = demo && demo[n - 1];
        ['dim', 'mid', 'bright'].forEach(function (level) {
          g.classList.toggle('demo-' + level, !!entry && entry.level === level);
        });
        if (entry) g.style.setProperty('--demo-color', entry.drum ? drumColor(entry.drum, entry.color) : entry.color);
        else g.style.removeProperty('--demo-color');
      }
    };

    drawing.draw = function (device) {
      drawing.device = device;
      drawing.oled = null;
      drawing.lcd = null;
      drawing.dots = [];
      var spec = drawing.layout();
      var interactive = typeof options.onSelect === 'function';
      svg.innerHTML = '';
      svg.setAttribute('viewBox', '0 0 ' + spec.width + ' ' + spec.height);
      var real = !!spec.real;  // measured from a photo: drawn with the printed look
      svg.classList.add('hw-drawing');
      svg.classList.toggle('real', real);
      if (real) sharedDefs();
      var defs = node('defs', {}, svg);  // this drawing's own: the colour screens' clip paths
      node('rect', { x: 1, y: 1, width: spec.width - 2, height: spec.height - 2, rx: spec.radius || 26, 'class': 'hw-body' }, svg);
      (spec.panels || []).forEach(function (p) {
        node('rect', { x: Math.max(p[0], 1), y: Math.max(p[1], 1), width: Math.min(p[2], spec.width - 1 - Math.max(p[0], 1)),
          height: Math.min(p[3], spec.height - 1 - Math.max(p[1], 1)), 'class': p[4] }, svg);
      });
      (spec.stripDots || []).forEach(function (dot) {
        drawing.dots.push(node('circle', { cx: dot[0], cy: dot[1], r: 2.2, 'class': 'hw-dot' }, svg));
      });
      (spec.marks || []).forEach(function (dot) { node('circle', { cx: dot[0], cy: dot[1], r: dot[2], 'class': 'hw-mark' }, svg); });
      spec.controls.forEach(function (c) {
        var id = c[0], label = c[1], x = c[2], y = c[3], w = c[4], hgt = c[5], kind = c[6], opts = c[7] || {};
        var g = node('g', { 'class': 'hw-control ' + kind, 'data-id': id }, svg);
        if (interactive && kind !== 'screen') {
          g.setAttribute('tabindex', '0');
          g.setAttribute('role', 'button');
          g.setAttribute('aria-label', controlName(id, label));
          g.setAttribute('aria-pressed', 'false');
          g.addEventListener('click', function () { options.onSelect(id); });
          g.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); options.onSelect(id); }
          });
        }
        if (kind === 'pad') g.style.setProperty('--pad-color', PAD_COLORS[Number(label) - 1]);
        if (opts.lit) {
          g.classList.add('lit');
          g.classList.toggle('lit-bright', !!opts.litBright);
          g.style.setProperty('--lit-color', opts.lit);
        }
        if (opts.light) g.classList.add('light');
        if (kind === 'encoder' || kind === 'knob') {
          var r = Math.min(w, hgt) / 2, cx = x + w / 2, cy = y + hgt / 2;
          node('circle', { cx: cx, cy: cy, r: r, 'class': 'ring' }, g);
          if (real && opts.face) {
            // a dark skirt with a lighter top; the encoder has a ridged band between them
            if (kind === 'encoder') node('circle', { cx: cx, cy: cy, r: r * (opts.face + 1) / 2, 'class': 'knurl' }, g);
            node('circle', { cx: cx, cy: cy, r: r * opts.face, 'class': 'knob-top' }, g);
          } else if (kind === 'encoder' && real) {
            node('circle', { cx: cx, cy: cy, r: r * 0.8, 'class': 'knurl' }, g);
            node('circle', { cx: cx, cy: cy, r: r * 0.66, 'class': 'knob-cap' }, g);
          } else if (kind === 'encoder') {
            node('circle', { cx: cx, cy: cy, r: r * 0.62 }, g);
          }
          if (!real) node('text', { x: cx, y: cy }, g).textContent = label;
          return;
        }
        if (kind === 'screen' && real && opts.lcd) {
          // a colour screen flush in the glass; content drawn in its own 480 x 272 units
          node('rect', { x: x, y: y, width: w, height: hgt, 'class': 'lcd' }, g);
          var clipId = (svg.id || 'hw') + '-lcd-clip-' + opts.lcd;
          node('rect', { x: x, y: y, width: w, height: hgt }, node('clipPath', { id: clipId }, defs));
          var s = Math.min(w / 480, hgt / 272);
          var content = node('g', { transform: 'translate(' + (x + (w - 480 * s) / 2).toFixed(2) + ' ' +
            (y + (hgt - 272 * s) / 2).toFixed(2) + ') scale(' + s.toFixed(4) + ')' }, node('g', { 'clip-path': 'url(#' + clipId + ')' }, g));
          drawing.lcd = drawing.lcd || { sides: {}, content: null };
          drawing.lcd.sides[opts.lcd] = content;
          return;
        }
        if (kind === 'screen' && real) {
          node('rect', { x: x, y: y, width: w, height: hgt, rx: 2, 'class': 'bezel' }, g);
          var inset = hgt * 0.12, ow = w - inset * 2, oh = hgt - inset * 2;
          node('rect', { x: x + inset, y: y + inset, width: ow, height: oh, 'class': 'oled' }, g);
          // the MIKRO's OLED is 128 x 32 pixels
          drawing.oled = { x: x + inset, y: y + inset, px: ow / 128, path: node('path', { 'class': 'pixels' }, g),
            inverse: node('path', { 'class': 'pixels-inverse' }, g), lines: null };
          return;
        }
        node('rect', { x: x, y: y, width: w, height: hgt, rx: real ? (kind === 'pad' ? 4 : 2.5) : (kind === 'pad' ? 10 : 6), 'class': 'cap' }, g);
        if (!real) {
          node('text', { x: x + w / 2, y: y + hgt / 2 }, g).textContent = kind === 'screen' ? spec.title.replace('MASCHINE ', '') : label;
        } else if (kind === 'pad') {
          node('rect', { x: x, y: y, width: w, height: hgt, rx: 4, 'class': 'sheen' }, g);
          var printed = node('text', { x: x + 7, y: y + 12, 'class': 'pad-print' }, g);
          node('tspan', { 'class': 'pad-number' }, printed).textContent = label;
          if (opts.sub) node('tspan', { 'class': 'pad-label', dx: 4 }, printed).textContent = opts.sub;
          if (opts.letter) node('text', { x: x + w - 7, y: y + 12, 'class': 'pad-print pad-letter' }, g).textContent = opts.letter;
        } else if (kind === 'strip') {
          node('rect', { x: x + 3, y: y + 3, width: w - 6, height: hgt - 6, rx: 1.5, 'class': 'strip-inner' }, g);
        } else if (opts.icon) {
          drawIcon(g, opts.icon, x, y, w, hgt);
        } else if (!opts.light) {
          drawLabel(g, label, opts, x, y, w, hgt);
        }
      });
    };

    return drawing;
  }

  function updateScreen(combo) {
    var spec = layout();
    if (!spec.screens) return;
    var lines = null;
    (combo || []).some(function (token) { return (lines = spec.screens[token] || null); });
    if (!lines && state.selected) lines = spec.screens[state.selected] || null;
    state.drawing.showScreen(lines || spec.screen);
  }

  // The mode a section is about: its first single-button item (for this device) that has a pad
  // demo, e.g. PAD MODE for the drum section; null if none.
  function sectionMode(section) {
    var demos = layout().padDemos || {}, mode = null;
    (section ? section.items.filter(forDevice) : []).some(function (item) {
      return item.combo.length === 1 && demos[item.combo[0]] && (mode = item.combo[0]);
    });
    return mode;
  }

  // The pads as the mode lights them: the first token of a hovered combo that has a pad demo,
  // else the selected control's (layout().padDemos, built in layouts.js); none lights nothing.
  // In a section about a mode where the track view modifiers act on that mode's own pads
  // (TRACK_VIEW_KEEPS), those modifiers don't switch to the track view: the pads show the mode.
  // A demo that comes from the combo itself (SOLO + PAD: the track view) also shows on the
  // combo's pads (class combo-demo on the drawing), instead of their plain highlight.
  function paintPads(combo, section) {
    var demos = layout().padDemos || {}, demo = null;
    var mode = sectionMode(section);
    var keep = mode && TRACK_VIEW_KEEPS.indexOf(mode) >= 0 ? mode : null, kept = false;
    (combo || []).some(function (token) {
      if (keep && TRACK_VIEW_MODIFIERS.indexOf(token) >= 0) { kept = true; return false; }
      return (demo = demos[token] || null);
    });
    if (!demo && kept) demo = demos[keep];
    el('device').classList.toggle('combo-demo', !!demo);
    if (!demo && state.selected) demo = demos[state.selected] || null;
    state.drawing.paintPads(demo);
  }

  function drawDevice() {
    var spec = layout();
    state.drawing = state.drawing || createDrawing(el('device'), { onSelect: select });
    state.drawing.draw(state.device);
    el('device').setAttribute('aria-label', spec.title + ' layout: choose a control to see what it does');
    node('g', { id: 'badges' }, el('device'));
    paintHardware();
  }

  function controlNode(id) {
    return state.drawing.node(id);
  }

  function paintHardware(combo, section) {
    controlIds().forEach(function (id) {
      var g = controlNode(id);
      if (!g) return;
      g.classList.toggle('selected', id === state.selected);
      g.classList.remove('related');
      if (g.hasAttribute('aria-pressed')) g.setAttribute('aria-pressed', String(id === state.selected));
    });
    updateScreen(combo);
    paintPads(combo, section);
    var badges = el('badges');
    if (!badges) return;
    badges.innerHTML = '';
    if (!combo) return;
    combo.forEach(function (token, index) {
      var ids = controlsForToken(token);
      ids.forEach(function (id) { var g = controlNode(id); if (g) g.classList.add('related'); });
      // number only single-control tokens, so "PAD" (all pads) doesn't get 16 badges
      if (ids.length === 1 && combo.length > 1) {
        var c = layout().controls.filter(function (x) { return x[0] === ids[0]; })[0];
        var b = node('g', { 'class': 'badge' }, badges);
        node('circle', { cx: c[2] + c[4] - 4, cy: c[3] + 4, r: 11 }, b);
        node('text', { x: c[2] + c[4] - 4, y: c[3] + 4 }, b).textContent = String(index + 1);
      }
    });
  }

  // --- reference ---------------------------------------------------------------------------

  // terms (optional): search terms whose matches are marked (see marked()).
  function comboElement(combo, terms) {
    var wrap = h('span', { className: 'combo' });
    combo.forEach(function (token, i) {
      if (i) wrap.appendChild(h('span', { className: 'plus', 'aria-hidden': 'true', text: '+' }));
      var key = MM.key(token);
      if (terms) { key.textContent = ''; marked(key, token, terms); }
      wrap.appendChild(key);
    });
    return wrap;
  }

  function itemElement(item, section, withTitle, terms) {
    var does = marked(h('span', { className: 'does' }), item.does, terms);
    if (item.context) does.appendChild(marked(h('span', { className: 'context' }), ' (' + item.context + ')', terms));
    var li = h('li', {}, [
      withTitle ? h('div', { className: 'section-label', text: section.title }) : null,
      comboElement(item.combo, terms),
      does
    ]);
    li.addEventListener('mouseenter', function () { paintHardware(item.combo, section); });
    li.addEventListener('mouseleave', function () { paintHardware(); });
    li.addEventListener('click', function () { paintHardware(item.combo, section); });
    return li;
  }

  function swatchTable(section, swatches, terms) {
    // Drum pad name colours: a colour dot, its name, and the words that give it.
    var body = h('tbody');
    swatches.forEach(function (swatch) {
      var dot = h('span', { className: 'swatch', 'aria-hidden': 'true' });
      dot.style.background = swatch.rgb;
      var words = h('td');
      swatch.keywords.forEach(function (keyword) {
        words.appendChild(marked(h('code'), keyword, terms));
        words.appendChild(document.createTextNode(' '));
      });
      if (swatch.note) words.appendChild(marked(h('span', { className: 'context' }), '(' + swatch.note + ')', terms));
      body.appendChild(h('tr', {}, [marked(h('td', {}, [dot]), swatch.name, terms), words]));
    });
    var table = h('table', {}, [
      h('thead', {}, [h('tr', {}, [h('th', { scope: 'col', text: 'Colour' }), h('th', { scope: 'col', text: 'Pad name contains' })])]),
      body
    ]);
    return h('div', { className: 'swatches' }, [
      section.swatches_note ? h('p', { className: 'summary', text: section.swatches_note }) : null,
      h('div', { className: 'table-wrap' }, [table])
    ]);
  }

  function shiftGrid(section) {
    // The SHIFT + pads matrix, drawn like the pads: top row = pads 13-16. Hover lights it.
    var grid = h('div', { className: 'shift-grid', role: 'group', 'aria-label': 'SHIFT + pads' });
    section.grid.forEach(function (row, r) {
      row.forEach(function (label, c) {
        var pad = (3 - r) * 4 + c + 1;
        var combo = ['SHIFT', 'PAD ' + pad];
        var cell = h('button', { type: 'button', 'aria-label': 'SHIFT + pad ' + pad + ': ' + label },
          [h('span', { text: label }), h('small', { text: 'pad ' + pad, 'aria-hidden': 'true' })]);
        cell.addEventListener('mouseenter', function () { paintHardware(combo); });
        cell.addEventListener('focus', function () { paintHardware(combo); });
        cell.addEventListener('mouseleave', function () { paintHardware(); });
        cell.addEventListener('blur', function () { paintHardware(); });
        cell.addEventListener('click', function () { paintHardware(combo); });
        grid.appendChild(cell);
      });
    });
    return grid;
  }

  // The Highlights section opens the self-playing tour over the controller (js/highlights.js).
  function tourLink() {
    return h('p', { className: 'tour-link' }, [
      h('a', { className: 'btn btn-tonal has-icon-start', href: '#highlights' }, [MM.icon('play'), 'Watch the highlights tour'])
    ]);
  }

  function sectionHeading(section, id, terms) {
    var heading = marked(h('h2', { id: id }), section.title, terms);
    if (section.devices) {
      heading.appendChild(h('span', { className: 'device-tag',
        text: state.data.devices[section.devices[0]].name.replace('MASCHINE ', '').split(' /')[0] + ' only' }));
    }
    return heading;
  }

  function renderSections() {
    var container = el('sections');
    var toc = el('toc');
    container.innerHTML = '';
    toc.innerHTML = '';
    visibleSections().forEach(function (entry) {
      var section = entry.section;
      var list = h('ul', { className: 'items' });
      entry.items.forEach(function (item) { list.appendChild(itemElement(item, section)); });
      container.appendChild(h('section', { className: 'card', id: section.id, 'aria-labelledby': 'h-' + section.id }, [
        sectionHeading(section, 'h-' + section.id),
        section.summary ? h('p', { className: 'summary', text: section.summary }) : null,
        section.id === 'highlights' ? tourLink() : null,
        section.grid ? shiftGrid(section) : null,
        section.swatches && section.swatches.length ? swatchTable(section, section.swatches) : null,
        list
      ]));
      var link = h('a', { href: '#' + section.id, text: section.title.split(':')[0] });
      link.addEventListener('click', function (e) {
        e.preventDefault();
        MM.scrollToEl(el(section.id));
      });
      toc.appendChild(link);
    });
  }

  function renderSelection() {
    var box = el('selection');
    if (!state.selected) { box.hidden = true; paintHardware(); return; }
    var list = el('selection-items');
    list.innerHTML = '';
    var id = state.selected;
    el('selection-title').textContent = /^PAD \d+$/.test(id) ? 'Pads' : id;
    var found = 0;
    visibleSections().forEach(function (entry) {
      entry.items.forEach(function (item) {
        if (itemUsesControl(item, id)) {
          list.appendChild(itemElement(item, entry.section, true));
          found++;
        }
      });
    });
    if (!found) list.appendChild(h('li', { className: 'empty', text: 'No function in this version.' }));
    box.hidden = false;
    paintHardware();
  }

  function renderChanges() {
    var body = el('changes-table').querySelector('tbody');
    body.innerHTML = '';
    state.data.changes.forEach(function (change) {
      body.appendChild(h('tr', {}, [h('td', { text: change.what }), h('td', { text: change.v1 || '–' }), h('td', { text: change.v2 })]));
    });
  }

  // --- search ------------------------------------------------------------------------------
  // The query splits into words, and an item matches when every word matches its section title,
  // its combination or its text, ignoring case. A word matches the start of a word ("arp" finds
  // "arpeggiator"); a number matches a whole number ("pad 5" finds PAD 5, not PAD 15). Matches show
  // grouped under their sections, marked, for the selected controller (`devices`). The query is
  // in the hash (#mikro?q=arp), so a search can be linked to.

  var SUGGESTIONS = ['SHIFT', 'NOTE REPEAT', 'tempo', 'undo', 'PAD 5'];

  function escapeRegExp(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function searchTerms(query) {
    var seen = {};
    return query.toLowerCase().split(/\s+/).filter(function (word) {
      // a lone "+" (as in "shift + pad") or punctuation is not a word to look for
      if (!word || /^[+,;:.!?]+$/.test(word) || seen[word]) return false;
      return (seen[word] = true);
    }).map(function (word) {
      var source = '(?:^|[^a-z0-9])(' + escapeRegExp(word) + ')' + (/^\d+$/.test(word) ? '(?![0-9])' : '');
      return { word: word, test: new RegExp(source), all: new RegExp(source, 'g') };
    });
  }

  function matchesAll(text, terms) {
    for (var i = 0; i < terms.length; i++) if (!terms[i].test.test(text)) return false;
    return true;
  }

  // Appends `text` to `parent` with the matches of `terms` in <mark>s; returns parent.
  function marked(parent, text, terms) {
    text = String(text);
    if (!terms || !terms.length) { parent.appendChild(document.createTextNode(text)); return parent; }
    var lower = text.toLowerCase(), ranges = [];
    terms.forEach(function (term) {
      var re = term.all, m;
      re.lastIndex = 0;
      while ((m = re.exec(lower))) {
        var start = m.index + m[0].length - m[1].length;
        ranges.push([start, start + m[1].length]);
      }
    });
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    // overlapping matches, and matches only a space apart ("note repeat"), make one mark
    var merged = [];
    ranges.forEach(function (range) {
      var last = merged[merged.length - 1];
      if (last && (range[0] <= last[1] || /^\s+$/.test(text.slice(last[1], range[0])))) last[1] = Math.max(last[1], range[1]);
      else merged.push([range[0], range[1]]);
    });
    var pos = 0;
    merged.forEach(function (range) {
      if (range[0] > pos) parent.appendChild(document.createTextNode(text.slice(pos, range[0])));
      parent.appendChild(h('mark', { className: 'hit', text: text.slice(range[0], range[1]) }));
      pos = range[1];
    });
    if (pos < text.length) parent.appendChild(document.createTextNode(text.slice(pos)));
    return parent;
  }

  // Lower-cased search texts, built once: an item's is its section title, its combination and its
  // text; a drum colour's is its name, its words and its note.
  function buildIndex() {
    state.index = state.data.sections.map(function (section) {
      var title = section.title.toLowerCase();
      return {
        section: section,
        items: section.items.map(function (item) {
          return { item: item, text: title + '\n' + item.combo.join(' + ').toLowerCase() + '\n' +
            item.does.toLowerCase() + (item.context ? ' (' + item.context.toLowerCase() + ')' : '') };
        }),
        swatches: (section.swatches || []).map(function (swatch) {
          return { swatch: swatch, text: (swatch.name + '\n' + swatch.keywords.join(' ') + '\n' + (swatch.note || '')).toLowerCase() };
        })
      };
    });
  }

  function search(terms, device) {
    var groups = [], count = 0;
    state.index.forEach(function (entry) {
      if (!MM.manual.forDevice(entry.section, device)) return;
      var items = entry.items.filter(function (e) {
        return MM.manual.forDevice(e.item, device) && matchesAll(e.text, terms);
      }).map(function (e) { return e.item; });
      var swatches = entry.swatches.filter(function (e) { return matchesAll(e.text, terms); })
        .map(function (e) { return e.swatch; });
      if (!items.length && !swatches.length) return;
      groups.push({ section: entry.section, items: items, swatches: swatches });
      count += items.length + swatches.length;
    });
    return { groups: groups, count: count };
  }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function setQuery(value) {
    el('search').value = value;
    state.query = value.trim();
    state.terms = searchTerms(state.query);
    renderSearch();
    searchSettled();
  }

  // Leaves the search and shows the full manual, scrolled to the section (if any).
  function clearSearch(sectionId) {
    setQuery('');
    if (sectionId && el(sectionId)) MM.scrollToEl(el(sectionId));
  }

  function noMatch(box, terms) {
    var otherDevice = state.device === 'mikro' ? 'mk3' : 'mikro';
    var other = search(terms, otherDevice).count;
    var suggestions = SUGGESTIONS.filter(function (word) { return search(searchTerms(word), state.device).count; });
    var hint = h('p', { className: 'summary' }, [
      'Nothing in the ' + state.data.devices[state.device].name + ' manual matches “' + state.query + '”. ' +
      'Check the spelling, use fewer words, or try one of these:'
    ]);
    var chips = h('div', { className: 'suggestions' }, suggestions.map(function (word) {
      return h('button', { type: 'button', className: 'suggestion', onclick: function () { setQuery(word); el('search').focus(); } },
        [word === word.toUpperCase() ? MM.key(word) : word]);
    }));
    var actions = h('div', { className: 'actions' }, [
      other ? h('button', { type: 'button', className: 'btn btn-tonal', onclick: function () { setDevice(otherDevice); } },
        ['Show ' + plural(other, 'result') + ' for the ' + state.data.devices[otherDevice].name]) : null,
      h('button', { type: 'button', className: 'btn btn-text', onclick: function () { clearSearch(); el('search').focus(); } }, ['Clear the search'])
    ]);
    box.appendChild(h('section', { className: 'card search-empty' }, [h('h2', { text: 'No match' }), hint, chips, actions]));
  }

  // Shows the matches of the query, or the full manual when there is no query. Fast enough to run
  // on every key (about 160 items).
  function renderSearch() {
    var terms = state.terms, searching = terms.length > 0;
    var box = el('search-results');
    el('view-manual').classList.toggle('searching', searching);
    el('sections').hidden = searching;
    el('toc').hidden = searching;
    el('changes').hidden = searching;
    el('search-clear').hidden = !el('search').value;
    el('search-hint').hidden = !!el('search').value;
    box.hidden = !searching;
    box.innerHTML = '';
    if (!searching) return;
    var result = search(terms, state.device);
    if (!result.count) { noMatch(box, terms); return; }
    box.appendChild(h('p', { className: 'search-count' }, [
      h('strong', { text: plural(result.count, 'result') }),
      ' for “' + state.query + '” in ' + plural(result.groups.length, 'section')
    ]));
    result.groups.forEach(function (group) {
      var section = group.section;
      var list = h('ul', { className: 'items' });
      group.items.forEach(function (item) { list.appendChild(itemElement(item, section, false, terms)); });
      var open = h('button', { type: 'button', className: 'btn btn-text search-open', onclick: function () { clearSearch(section.id); } },
        ['Open section']);
      open.setAttribute('aria-label', 'Open the section ' + section.title);
      box.appendChild(h('section', { className: 'card search-group', 'aria-labelledby': 's-' + section.id }, [
        h('div', { className: 'search-group-head' }, [sectionHeading(section, 's-' + section.id, terms), open]),
        group.swatches.length ? swatchTable(section, group.swatches, terms) : null,
        group.items.length ? list : null
      ]));
    });
  }

  // After typing pauses: tell screen readers the result count and put the query in the hash.
  var settleTimer = null;
  function searchSettled() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function () {
      var status = '';
      if (state.terms.length) {
        var result = search(state.terms, state.device);
        status = result.count ? plural(result.count, 'result') + ' in ' + plural(result.groups.length, 'section') : 'No match';
      }
      el('search-status').textContent = status;
      if (!el('view-manual').hidden) updateHash();
    }, 400);
  }

  function initSearch() {
    var input = el('search');
    buildIndex();
    input.addEventListener('input', function () {
      state.query = input.value.trim();
      state.terms = searchTerms(state.query);
      renderSearch();
      searchSettled();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (input.value) setQuery(''); else input.blur();
    });
    el('search-clear').addEventListener('click', function () { setQuery(''); input.focus(); });
    // the whole pill is the field: a click beside the input focuses it
    document.querySelector('.search-bar').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) input.focus();
    });
  }

  // --- state -------------------------------------------------------------------------------

  function updateHash() {
    var hash = '#' + state.device + (state.selected ? '/' + encodeURIComponent(state.selected) : '') +
      (state.query ? '?q=' + encodeURIComponent(state.query) : '');
    if (location.hash === hash) return;
    // some browsers throttle (or throw on) many history calls in a short time
    try { history.replaceState(null, '', hash); } catch (e) { /* keep the old hash */ }
  }

  function select(id) {
    state.selected = state.selected === id ? null : id;
    renderSelection();
    updateHash();
    if (state.selected && window.matchMedia('(max-width: 1100px)').matches) MM.scrollToEl(el('selection'));
  }

  function setDevice(device, keepHash) {
    if (!LAYOUTS[device]) return;
    state.device = device;
    MM.store('device', device);
    document.querySelectorAll('#view-manual .segmented button').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-device') === device));
      b.setAttribute('tabindex', b.getAttribute('data-device') === device ? '0' : '-1');
    });
    el('unverified').hidden = state.data.devices[device].verified;
    if (state.selected && controlIds().indexOf(state.selected) < 0) state.selected = null;
    drawDevice();
    renderSections();
    renderSelection();
    renderSearch();
    if (state.terms.length) searchSettled();
    if (!keepHash) updateHash();
  }

  function updateWelcome() {
    el('welcome').hidden = !!(MM.store('setupDone') || MM.store('welcomeDismissed'));
  }

  function init(data) {
    state.data = data;
    renderChanges();
    var buttons = Array.prototype.slice.call(document.querySelectorAll('#view-manual .segmented button'));
    buttons.forEach(function (b, index) {
      b.addEventListener('click', function () { setDevice(b.getAttribute('data-device')); });
      b.addEventListener('keydown', function (e) {
        var step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        var next = buttons[(index + step + buttons.length) % buttons.length];
        setDevice(next.getAttribute('data-device'));
        next.focus();
      });
    });
    initSearch();
    el('clear-selection').addEventListener('click', function () { select(state.selected); });
    el('welcome-dismiss').addEventListener('click', function () {
      MM.store('welcomeDismissed', '1');
      updateWelcome();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || el('view-manual').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      e.preventDefault();
      el('search').focus();
      el('search').select();
    });
  }

  // parts: the hash split on "/": [device or section id, control]; query: the search (the hash's
  // ?q=), none shows the full manual
  function show(parts, query) {
    query = query || '';
    el('search').value = query;
    state.query = query.trim();
    state.terms = searchTerms(state.query);
    var first = parts[0] || '';
    var device = LAYOUTS[first] ? first : (LAYOUTS[MM.store('device')] ? MM.store('device') : 'mikro');
    var section = !LAYOUTS[first] && first && first !== 'manual' ? first : null;
    state.selected = LAYOUTS[first] && parts[1] ? decodeURIComponent(parts[1]) : null;
    if (!state.ready || device !== state.device) {
      state.ready = true;
      setDevice(device, !!section);
    } else {
      if (state.selected && controlIds().indexOf(state.selected) < 0) state.selected = null;
      renderSelection();
      renderSearch();
      searchSettled();
      if (!section) updateHash();
    }
    updateWelcome();
    if (section && el(section)) {
      setTimeout(function () { MM.scrollToEl(el(section)); }, 0);
    } else if (state.selected && window.matchMedia('(max-width: 1100px)').matches) {
      setTimeout(function () { MM.scrollToEl(el('selection')); }, 0);
    }
  }

  function setDeviceFromSetup(device) {
    if (LAYOUTS[device]) MM.store('device', device);
  }

  function hasSection(id) {
    return !!(state.data && state.data.sections.some(function (s) { return s.id === id; }));
  }

  return {
    init: init, show: show, setDeviceFromSetup: setDeviceFromSetup, hasSection: hasSection, updateWelcome: updateWelcome,
    createDrawing: createDrawing, forDevice: function (entry, device) { return !entry.devices || entry.devices.indexOf(device) >= 0; }
  };
})();
