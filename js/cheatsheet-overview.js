// The cheat sheet's first page: the controller drawing (the manual's renderer,
// MM.manual.createDrawing) as line art, with labels round it that name the main controls and
// say in a few words what they do. The words come from data/features.json (an item, a section
// summary or title, shortened); a few general ones are written here.
//
// A callout: { label, text(D), side: 'left' | 'right' | 'top' | 'bottom', targets }, where a
// target is a control id or { id, via: [[x, y], ...] }: the leader runs from the control's
// centre through the via points (drawing units) to the edge of the drawing, then to the label.
// Leaders are drawn under the controls, so they show only between them; via points route them
// through the gaps. chain: true joins the targets with a line instead (a row of buttons). The
// labels on each side keep the order of their leaders and are spaced so they never overlap.
MM.cheatsheetOverview = (function () {
  'use strict';

  var SVG = 'http://www.w3.org/2000/svg';
  var SIDE_W = 300;        // left / right label width, drawing units
  var END_W = 184;         // top / bottom label width
  var GAP = 14;            // between labels
  var OUT = 14;            // leaders leave the drawing this far out
  var REACH = 64;          // labels start this far from the drawing (room for the leaders)
  var TITLE = 22, TEXT = 20.5, LINE = 25;  // type sizes and line height
  var CHAR = 0.54;         // average character width in em, for wrapping

  // --- words from features.json ------------------------------------------------------------

  function words(data, device) {
    function section(id) {
      return data.sections.filter(function (s) { return s.id === id && MM.manual.forDevice(s, device); })[0] || null;
    }
    // drops asides "(...)", keeps the first sentence (two when the first is very short), then
    // cuts at each mark in `cuts` in turn: ',' keeps what is before it, '>: ' what is after it
    function short(text, cuts) {
      if (!text) return null;
      text = text.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
      var parts = text.split(/\.(?:\s+|$)/), out = parts[0], i = 1;
      while (out.length < 15 && parts[i]) out += '. ' + parts[i++];
      [].concat(cuts || []).forEach(function (mark) {
        var after = mark.charAt(0) === '>';
        if (after) mark = mark.slice(1);
        var at = out.indexOf(mark);
        if (at > 0) out = after ? out.slice(at + mark.length) : out.slice(0, at);
      });
      out = out.replace(/[.,;:\s]+$/, '').trim();
      return out.charAt(0).toUpperCase() + out.slice(1);
    }
    return {
      short: short,
      item: function (sectionId, combo, cuts) {
        var s = section(sectionId), key = combo.join('+');
        var found = s && s.items.filter(function (it) {
          return it.combo.join('+') === key && MM.manual.forDevice(it, device);
        })[0];
        return found ? short(found.does, cuts) : null;
      },
      summary: function (sectionId, cuts) { var s = section(sectionId); return s ? short(s.summary, cuts) : null; },
      title: function (sectionId) {
        var s = section(sectionId);
        return s ? short(s.title.split(': ').slice(1).join(': ') || s.title) : null;
      },
      // "Page left / right; SHIFT: select the previous / next track"
      arrows: function () {
        var shifted = this.item('views', ['SHIFT', '◀', '▶']);
        return shifted ? 'Page left / right; SHIFT: ' + shifted.charAt(0).toLowerCase() + shifted.slice(1) : null;
      },
      join: function () {
        var list = Array.prototype.slice.call(arguments).filter(Boolean);
        // later parts start lower case, unless they start with a button name (SHIFT)
        return list.map(function (t, i) { return i && !/^[A-Z]{2}/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t; }).join('; ');
      }
    };
  }

  // --- the callouts per controller ---------------------------------------------------------

  function bus(id, x, bottom) { return { id: id, via: [[x, null], [x, bottom]] }; }

  var CALLOUTS = {
    mikro: function (H) {
      return [
        { label: 'SCREEN', side: 'top', targets: ['SCREEN'], text: function (D) { return D.item('highlights', ['TURN'], ':'); } },
        { label: 'VOLUME · SWING · TEMPO', side: 'top', targets: ['VOLUME', 'SWING', 'TEMPO'], chain: true,
          text: function (D) { return D.summary('master', ';'); } },
        { label: 'PLUG-IN', side: 'top', targets: ['PLUG-IN'], text: function (D) { return D.title('plugin'); } },
        { label: 'FIXED VEL', side: 'top', targets: ['FIXED VEL'], text: function (D) { return D.item('playing', ['FIXED VEL'], ':'); } },
        { label: 'PAD MODE', side: 'top', targets: ['PAD MODE'], text: function (D) { return D.item('start', ['PAD MODE']); } },
        { label: 'KEYBOARD', side: 'top', targets: ['KEYBOARD'], text: function (D) { return D.item('start', ['KEYBOARD']); } },
        { label: 'CHORDS', side: 'top', targets: ['CHORDS'], text: function (D) { return D.summary('chords', ','); } },
        { label: 'STEP', side: 'top', targets: ['STEP'], text: function (D) { return D.title('step'); } },

        { label: 'STAR · BROWSER', side: 'left', targets: ['STAR', 'BROWSER'], chain: true,
          text: function (D) {
            var browse = D.title('browser'), star = D.item('browser', ['STAR'], ';');
            return browse && D.join('BROWSER: ' + browse.toLowerCase(), star && 'STAR: ' + star.charAt(0).toLowerCase() + star.slice(1));
          } },
        { label: 'TURN · PUSH', side: 'left', targets: [{ id: 'ENCODER', via: [[137, 101]] }],
          text: function () { return 'The encoder: scroll and change values; touch it to see the mode\'s details'; } },
        { label: '◀ ▶', side: 'left', targets: [{ id: '◀', via: [[312, 172]] }, { id: '▶', via: [[356, 172]] }],
          text: function (D) { return D.arrows(); } },
        { label: 'PITCH · MOD', side: 'left', targets: ['PITCH', 'MOD'], chain: true,
          text: function (D) { return D.item('playing', ['PITCH']) && 'The touch strip becomes a pitch bend or the mod wheel'; } },
        { label: 'TOUCH STRIP', side: 'left', targets: [{ id: 'STRIP', via: [[60, 283]] }], text: function (D) { return D.item('playing', ['STRIP'], ';'); } },
        { label: 'GROUP', side: 'left', targets: ['GROUP'], text: function (D) { return D.item('track', ['GROUP']); } },
        { label: 'NOTE REPEAT', side: 'left', targets: [{ id: 'NOTE REPEAT', via: [[334, 413]] }],
          text: function (D) { return D.join(D.item('playing', ['NOTE REPEAT']), D.item('playing', ['SHIFT', 'NOTE REPEAT']) && 'SHIFT: arpeggiator'); } },

        { label: 'PLAY · REC · STOP', side: 'bottom', targets: ['PLAY', 'REC', 'STOP'], chain: true,
          text: function (D) { return D.join(D.item('transport', ['PLAY']), D.item('transport', ['REC'])); } },
        { label: 'SHIFT', side: 'bottom', targets: ['SHIFT'], text: function (D) { return D.item('start', ['SHIFT'], ['>: ', ',']); } },
        { label: 'SCENE', side: 'bottom', targets: [bus('SCENE', 386, H)], text: function (D) { return D.summary('scene', ','); } },
        { label: 'PATTERN', side: 'bottom', targets: [bus('PATTERN', 394, H)], text: function (D) { return D.item('start', ['PATTERN']); } },
        { label: 'EVENTS', side: 'bottom', targets: [bus('EVENTS', 402, H)], text: function (D) { return D.title('events'); } },
        { label: 'VARIATION', side: 'bottom', targets: [bus('VARIATION', 410, H)],
          text: function (D) { return D.join(D.item('events', ['VARIATION'], ','), D.item('events', ['VARIATION', 'PAD'], ',') && '+ PAD: record a variation'); } },
        { label: 'DUPLICATE', side: 'bottom', targets: [bus('DUPLICATE', 418, H)], text: function (D) { return D.item('edit', ['DUPLICATE']); } },
        { label: 'SELECT · SOLO · MUTE', side: 'bottom', targets: [bus('SELECT', 426, H), bus('SOLO', 426, H), bus('MUTE', 426, H)],
          text: function (D) { return D.item('track', ['SELECT', 'PAD']) && '+ PAD: arm, solo or mute that track'; } },

        { label: 'SHIFT + PADS', side: 'right', targets: ['PAD 16'], text: function (D) { return D.title('shift-pads'); } },
        { label: 'PADS', side: 'right', targets: ['PAD 8'], text: function () { return 'Clips, scenes, tracks, drums, notes or steps: the mode decides'; } }
      ];
    },
    mk3: function (H) {
      return [
        { label: 'SCREENS', side: 'top', targets: ['SCREEN', 'SCREEN 2'], text: function (D) { return D.item('highlights', ['TURN'], ':'); } },

        { label: 'PLUG-IN', side: 'left', targets: [{ id: 'PLUG-IN', via: [[152, 14]] }], text: function (D) { return D.item('mk3', ['PLUG-IN'], ';'); } },
        { label: 'MIXER', side: 'left', targets: [{ id: 'MIXER', via: [[152, 69]] }], text: function (D) { return D.item('mk3', ['MIXER']); } },
        { label: 'BROWSER', side: 'left', targets: ['BROWSER'], text: function (D) { return D.item('views', ['BROWSER']); } },
        { label: '◀ ▶', side: 'left', targets: ['◀', '▶'], chain: true,
          text: function (D) { return D.arrows(); } },
        { label: 'NOTE REPEAT', side: 'left', targets: [{ id: 'NOTE REPEAT', via: [[330, 373]] }],
          text: function (D) { return D.join(D.item('playing', ['NOTE REPEAT']), D.item('playing', ['SHIFT', 'NOTE REPEAT']) && 'SHIFT: arpeggiator'); } },
        { label: 'VOLUME · SWING · TEMPO', side: 'left', targets: [{ id: 'VOLUME', via: [[241, 384]] }, 'SWING', 'TEMPO'], chain: true,
          text: function (D) { return D.summary('master', ';'); } },
        { label: 'TURN · PUSH', side: 'left', targets: ['ENCODER'],
          text: function () { return 'The 4-D encoder: scroll and change values; touch it to see the mode\'s details'; } },
        { label: 'PITCH · MOD', side: 'left', targets: ['PITCH', 'MOD'], chain: true,
          text: function (D) { return D.item('playing', ['PITCH']) && 'The touch strip becomes a pitch bend or the mod wheel'; } },
        { label: 'TOUCH STRIP', side: 'left', targets: [{ id: 'STRIP', via: [[60, 607]] }], text: function (D) { return D.item('playing', ['STRIP'], ';'); } },
        { label: 'GROUP A-H', side: 'left', targets: ['GROUP A', 'GROUP E'], text: function (D) { return D.item('mk3', ['GROUP A-H']); } },

        { label: 'KNOBS 1-8', side: 'right', targets: [{ id: 'KNOB 8', via: [[930, 339]] }],
          text: function (D) { return D.item('mk3', ['SHIFT', 'KNOB']) && 'Volumes or parameters, see MIXER and PLUG-IN; SHIFT: fine'; } },
        { label: 'FIXED VEL', side: 'right', targets: [{ id: 'FIXED VEL', via: [[468, 369], [1000, 369]] }], text: function (D) { return D.item('playing', ['FIXED VEL'], ':'); } },
        { label: 'PAD MODE', side: 'right', targets: [{ id: 'PAD MODE', via: [[581, 375], [1000, 375]] }], text: function (D) { return D.item('start', ['PAD MODE']); } },
        { label: 'KEYBOARD', side: 'right', targets: [{ id: 'KEYBOARD', via: [[695, 381], [1000, 381]] }], text: function (D) { return D.item('start', ['KEYBOARD']); } },
        { label: 'CHORDS', side: 'right', targets: [{ id: 'CHORDS', via: [[808, 387], [1000, 387]] }], text: function (D) { return D.summary('chords', ','); } },
        { label: 'STEP', side: 'right', targets: ['STEP'], text: function (D) { return D.title('step'); } },
        { label: 'SHIFT + PADS', side: 'right', targets: ['PAD 16'], text: function (D) { return D.title('shift-pads'); } },
        { label: 'PADS', side: 'right', targets: ['PAD 8'], text: function () { return 'Clips, scenes, tracks, drums, notes or steps: the mode decides'; } },

        { label: 'PLAY · REC · STOP', side: 'bottom', targets: ['PLAY', 'REC', 'STOP'], chain: true,
          text: function (D) { return D.join(D.item('transport', ['PLAY']), D.item('transport', ['REC'])); } },
        { label: 'SHIFT', side: 'bottom', targets: ['SHIFT'], text: function (D) { return D.item('start', ['SHIFT'], ['>: ', ',']); } },
        { label: 'SCENE', side: 'bottom', targets: [bus('SCENE', 383, H)], text: function (D) { return D.summary('scene', ','); } },
        { label: 'PATTERN', side: 'bottom', targets: [bus('PATTERN', 391, H)], text: function (D) { return D.item('start', ['PATTERN']); } },
        { label: 'EVENTS', side: 'bottom', targets: [bus('EVENTS', 399, H)], text: function (D) { return D.title('events'); } },
        { label: 'VARIATION', side: 'bottom', targets: [bus('VARIATION', 407, H)],
          text: function (D) { return D.join(D.item('events', ['VARIATION'], ','), D.item('events', ['VARIATION', 'PAD'], ',') && '+ PAD: record a variation'); } },
        { label: 'DUPLICATE', side: 'bottom', targets: [bus('DUPLICATE', 415, H)], text: function (D) { return D.item('edit', ['DUPLICATE']); } },
        { label: 'SELECT · SOLO · MUTE', side: 'bottom', targets: [bus('SELECT', 423, H), bus('SOLO', 423, H), bus('MUTE', 423, H)],
          text: function (D) { return D.item('track', ['SELECT']) && D.item('track', ['SOLO', 'PAD']) && 'Tap SELECT: tracks on the pads; + PAD: solo or mute that track'; } }
      ];
    }
  };

  // --- drawing -----------------------------------------------------------------------------

  function node(name, attrs, parent) {
    var n = document.createElementNS(SVG, name);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  // Lines of at most width units; `sep` (' ' or ' · ') is where a line may break, and is dropped there.
  function wrap(text, width, size, sep) {
    var max = Math.max(8, Math.floor(width / (size * CHAR))), lines = [], line = '';
    sep = sep || ' ';
    text.split(sep).forEach(function (word) {
      if (line && (line + sep + word).length > max) { lines.push(line); line = word; } else line = line ? line + sep + word : word;
    });
    if (line) lines.push(line);
    return lines;
  }

  // Places boxes of `sizes` near `wanted` positions along one axis, in order, no overlaps, within
  // [min, max] where possible. Returns the start of each box.
  function spread(wanted, sizes, min, max) {
    var at = [], i;
    for (i = 0; i < wanted.length; i++) {
      at[i] = Math.max(wanted[i] - sizes[i] / 2, i ? at[i - 1] + sizes[i - 1] + GAP : min);
    }
    var over = at.length ? at[at.length - 1] + sizes[sizes.length - 1] - max : 0;
    for (i = at.length - 1; i >= 0 && over > 0; i--) {
      var room = i ? at[i] - (at[i - 1] + sizes[i - 1] + GAP) : at[i] - min;
      var move = Math.min(over, Math.max(room, 0));
      for (var j = i; j < at.length; j++) at[j] -= move;
      over -= move;
    }
    return at;
  }

  function draw(svg, device, data) {
    var drawing = MM.manual.createDrawing(svg);
    drawing.draw(device);
    svg.classList.add('cs-drawing');
    var spec = LAYOUTS[device], W = spec.width, H = spec.height;
    if (drawing.oled) drawing.showScreen(spec.screen);  // the MIKRO's screen, as on the controller
    var D = words(data, device);
    var boxes = {};
    spec.controls.forEach(function (c) { boxes[c[0]] = { x: c[2], y: c[3], w: c[4], h: c[5], cx: c[2] + c[4] / 2, cy: c[3] + c[5] / 2 }; });

    // the callouts with their texts and leader paths (up to the edge of the drawing)
    var callouts = CALLOUTS[device](H).map(function (co) {
      var text = co.text(D);
      var targets = co.targets.map(function (t) { return typeof t === 'string' ? { id: t } : t; })
        .filter(function (t) { return boxes[t.id]; });
      if (!text || !targets.length) return null;
      var leaders = (co.chain ? targets.slice(0, 1) : targets).map(function (t) {
        var b = boxes[t.id], pts = [[b.cx, b.cy]];
        (t.via || []).forEach(function (p) { pts.push([p[0], p[1] === null ? b.cy : p[1]]); });
        var last = pts[pts.length - 1];
        if (co.side === 'left') pts.push([-OUT, last[1]]);
        else if (co.side === 'right') pts.push([W + OUT, last[1]]);
        else if (co.side === 'top') pts.push([last[0], -OUT]);
        else pts.push([last[0], H + OUT]);
        return pts;
      });
      var exit = leaders[0][leaders[0].length - 1];
      var horizontal = co.side === 'left' || co.side === 'right';
      var lines = wrap(text, horizontal ? SIDE_W : END_W, TEXT);
      var titleLines = wrap(co.label, horizontal ? SIDE_W : END_W, TITLE * 1.12, ' · ');
      return {
        co: co, targets: targets, leaders: leaders, lines: lines, titleLines: titleLines,
        exit: horizontal ? exit[1] : exit[0], height: (titleLines.length + lines.length) * LINE + 4
      };
    }).filter(Boolean);

    var bySide = { left: [], right: [], top: [], bottom: [] };
    callouts.forEach(function (c) { bySide[c.co.side].push(c); });
    Object.keys(bySide).forEach(function (side) { bySide[side].sort(function (a, b) { return a.exit - b.exit; }); });
    var maxHeight = function (list) { return list.reduce(function (m, c) { return Math.max(m, c.height); }, 0); };
    var top = maxHeight(bySide.top) + REACH + 16, bottom = maxHeight(bySide.bottom) + REACH + 16;
    var left = SIDE_W + REACH + 16, right = SIDE_W + REACH + 16;

    // label positions: along the side, in the order of their leaders
    ['left', 'right'].forEach(function (side) {
      var list = bySide[side];
      var at = spread(list.map(function (c) { return c.exit + c.height / 2 - LINE / 2; }), list.map(function (c) { return c.height; }), -REACH + 6, H + REACH - 6);
      list.forEach(function (c, i) {
        c.box = { y: at[i] };
        c.textX = side === 'left' ? -REACH - 8 : W + REACH + 8;
        c.anchor = [side === 'left' ? -REACH : W + REACH, at[i] + LINE / 2];
      });
    });
    ['top', 'bottom'].forEach(function (side) {
      var list = bySide[side];
      var at = spread(list.map(function (c) { return c.exit; }), list.map(function () { return END_W; }), -left + 10, W + right - 10);
      list.forEach(function (c, i) {
        c.box = { y: side === 'top' ? -REACH - 4 - c.height : H + REACH + 4 };
        c.textX = at[i] + END_W / 2;
        c.anchor = [c.textX, side === 'top' ? -REACH : H + REACH];
      });
    });

    // leaders and chains go under the controls: they show between them, not across them
    var under = node('g', { 'class': 'cs-leaders' });
    svg.insertBefore(under, svg.querySelector('.hw-control'));
    callouts.forEach(function (c) {
      c.leaders.forEach(function (pts) {
        pts = pts.concat([c.anchor]);
        node('polyline', { points: pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '), 'class': 'cs-leader' }, under);
        node('circle', { cx: c.anchor[0], cy: c.anchor[1], r: 3.2, 'class': 'cs-leader-end' }, svg);
      });
      if (c.co.chain) {
        node('polyline', { points: c.targets.map(function (t) { return boxes[t.id].cx + ',' + boxes[t.id].cy; }).join(' '), 'class': 'cs-leader' }, under);
      }
      c.targets.forEach(function (t) { var g = drawing.node(t.id); if (g) g.classList.add('cs-target'); });
    });

    // the labels
    var labels = node('g', { 'class': 'cs-labels' }, svg);
    callouts.forEach(function (c) {
      var side = c.co.side, x = c.textX;
      var align = side === 'left' ? 'end' : side === 'right' ? 'start' : 'middle';
      var text = node('text', { 'class': 'cs-callout', 'text-anchor': align }, labels);
      var y = c.box.y + LINE * 0.75;
      c.titleLines.forEach(function (line) {
        node('tspan', { x: x, y: y, 'class': 'cs-callout-title' }, text).textContent = line;
        y += LINE;
      });
      c.lines.forEach(function (line) {
        node('tspan', { x: x, y: y, 'class': 'cs-callout-text' }, text).textContent = line;
        y += LINE;
      });
    });

    svg.setAttribute('viewBox', [-left, -top, W + left + right, H + top + bottom].join(' '));
    svg.setAttribute('aria-label', spec.title + ': the main controls and what they do');
    return callouts.length;
  }

  return { draw: draw };
})();
