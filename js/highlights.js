// The Tour's player (MM.tourPlayer): one card of the Tour (js/tour.js), the selected controller
// drawn large (the manual's realistic drawing, MM.manual.createDrawing), playing through the
// card's steps by itself and looping. A card is a section of data/features.json, a step one of
// its items (the Highlights card: the headline items). The controls of a step glow, the pads, the
// strip and the screen act it out (js/highlight-shows.js; a step without a choreography of its
// own presses its combo in order and shows what the manual shows for it on hover), and a callout
// with the combo and its text points at them: beside the controller on wide windows, under it on
// narrow ones, the MIKRO's screen magnified in it. Pointing at the controller or the callout
// holds the step; previous / pause / next buttons and the dots are there for those who want them.
// Only the card in view plays (the Tour calls play() / halt()); the drawing is made the first
// time the card comes near the window (draw()).

// The choreography of a Tour step (shared with check-screens.html): MM.tourShow(step, device)
// -> { every, duration, glow, tick(n, api) } (see the top of js/highlight-shows.js). A step is
// { combo, does, context, values, section } from data/features.json.
MM.tourShow = (function () {
  'use strict';

  var EVERY = 500;

  // The ids of the buttons (and the encoder for PUSH) a combo token presses; pads, the strip and
  // TURN act otherwise.
  function pressedIds(token, device) {
    if (token === 'PUSH' || token === 'ENCODER TOUCH') return ['ENCODER'];
    return LAYOUTS[device].controls.filter(function (c) {
      return tokenMatches(token, c[0]) && (c[6] === 'button' || c[6] === 'knob');
    }).map(function (c) { return c[0]; });
  }

  // A step without a choreography of its own: its combo pressed in order (the first controls
  // held, a single button tapped and let go), then what it does, as the manual shows it on hover:
  // the section's screen for it (a list of screens plays in turn) and its pads. Before the press,
  // the section's mode (its screen and pads). A SHIFT combo never shows another button's own
  // screen (SHIFT changes what the button does): the mode's screen stays. A single pad (SHIFT +
  // PAD 5) lights up as it is pressed; TURN turns the encoder, STRIP slides along the strip.
  function genericShow(step, device) {
    // a highlight is about its controls, not a section's mode: its first token's screen and pads
    var section = step.section && step.section.id !== 'highlights' ? step.section : null;
    var spec = LAYOUTS[device];
    var combo = step.combo, screens = spec.screens || {}, demos = spec.padDemos || {};
    var mode = section ? MM.manual.sectionMode(section, device) : null;
    var base = (mode && screens[mode]) || spec.screen;
    var baseDemo = mode ? demos[mode] || null : null;
    var result = section ? MM.manual.sectionScreen(device, combo, section, step.context) : null;
    if (!result && (!section || combo[0] !== 'SHIFT')) combo.some(function (t) { return (result = screens[t] || null); });
    var frames = Array.isArray(result) ? result : [result || base];
    var demo = null;
    if (section) demo = MM.manual.comboDemo(device, combo, section).demo;
    else combo.some(function (t) { return (demo = demos[t] || null); });
    if (!demo) demo = baseDemo;
    var presses = combo.length, tap = presses === 1;
    var pad = -1, padAt = -1;
    combo.forEach(function (t, i) { var m = /^PAD (\d+)$/.exec(t); if (m) { pad = Number(m[1]) - 1; padAt = i; } });
    return {
      every: EVERY,
      duration: Math.max(5500, Math.min(10000, 3500 + step.does.length * 40 + presses * EVERY)),
      tick: function (n, api) {
        var down = Math.min(n, presses), done = n >= presses, since = n - presses;
        var ids = [];
        combo.slice(0, down).forEach(function (token) {
          if (tap && since >= 2) return;  // a tap: let go after a moment
          ids = ids.concat(pressedIds(token, device));
        });
        api.light(ids);
        if (combo.indexOf('TURN') >= 0 && done) api.turn(since + 1);
        if (combo.indexOf('STRIP') >= 0) {
          api.strip(done ? 0.5 + 0.4 * Math.sin(since * 0.7) : null, SAMPLE_TRACKS[0].color);
        }
        api.show(done ? frames[Math.floor(since / 3) % frames.length] : base);
        var pads = done ? demo : baseDemo;
        if (pad >= 0 && down > padAt) {
          pads = (pads || api.blank()).slice();
          pads[pad] = api.lit(SAMPLE_MASTER.color, 'bright');
        }
        api.pads(pads);
      }
    };
  }

  // The choreography of a step: its section's own (TOUR_SHOWS in js/highlight-shows.js), the
  // Highlights' (HIGHLIGHT_SHOWS, by combo), else the generic one.
  return function showFor(step, device) {
    var section = step.section, key = step.combo.join('+'), show = null;
    if (!section || section.id === 'highlights') show = HIGHLIGHT_SHOWS[key] || null;
    else {
      var own = TOUR_SHOWS[section.id];
      if (typeof own === 'function') show = own(step, device);
      else if (own) show = own[key + (step.context ? ' (' + step.context + ')' : '')] || null;
    }
    return show || genericShow(step, device);
  };
})();

MM.tourPlayer = function (root, options) {
  'use strict';

  options = options || {};
  var SVG = 'http://www.w3.org/2000/svg';
  var h = MM.h;
  var DURATION = 6500, EVERY = 500, FRAME = 30;
  var CALM_SLOWER = 1.5;  // reduced motion: every step stays longer
  var WIDE = '(min-width: 1180px)';
  function find(cls) { return root.querySelector('.' + cls); }
  var refs = {
    stage: find('tour-stage'), bubble: find('tour-bubble'), svg: find('tour-device'), loupe: find('tour-loupe'),
    heads: find('tour-heads'), texts: find('tour-texts'), dots: find('tour-dots'), status: find('tour-status'),
    pause: find('tour-pause'), prev: find('tour-prev'), next: find('tour-next')
  };
  var state = {
    device: null, steps: [], index: 0, drawing: null, drawnFor: null,
    show: null, api: null, duration: DURATION, elapsed: 0, tick: -1, last: 0, timer: null,
    hover: false, paused: false, glow: [], swap: null,
    autoPaused: false,  // paused because the page was hidden or the window lost focus (setAway())
    resumedAt: 0        // when coming back played the card on (see the pause button)
  };

  function now() { return window.performance ? performance.now() : Date.now(); }

  // --- data --------------------------------------------------------------------------------

  function controlSpecs(token) {
    return state.drawing.layout().controls.filter(function (c) { return tokenMatches(token, c[0]); });
  }

  // The box around a token's controls in drawing units: { x, y, w, h, round }.
  function boxOf(token) {
    var specs = controlSpecs(token);
    if (!specs.length) return null;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    specs.forEach(function (c) {
      x0 = Math.min(x0, c[2]); y0 = Math.min(y0, c[3]);
      x1 = Math.max(x1, c[2] + c[4]); y1 = Math.max(y1, c[3] + c[5]);
    });
    var round = specs.length === 1 && (specs[0][6] === 'encoder' || specs[0][6] === 'knob');
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, round: round };
  }

  // --- what the controller shows -----------------------------------------------------------

  function svgNode(name, attrs, parent) {
    var n = document.createElementNS(SVG, name);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  // Outline the controls of these tokens (a soft glow on the drawing); buttons, the encoder, the
  // knobs and the strip also light up like the manual's related controls.
  function outline(tokens) {
    var key = tokens.join('|');
    if (state.glow.join('|') === key) return;
    state.glow = tokens.slice();
    var drawing = state.drawing, layer = drawing.svg.querySelector('.tour-outlines');
    layer.innerHTML = '';
    drawing.svg.querySelectorAll('.hw-control.related').forEach(function (g) { g.classList.remove('related'); });
    tokens.forEach(function (token) {
      var box = boxOf(token);
      if (!box) return;
      var gap = 6;
      if (box.round) {
        svgNode('circle', { cx: box.x + box.w / 2, cy: box.y + box.h / 2, r: box.w / 2 + gap, 'class': 'tour-outline' }, layer);
      } else {
        svgNode('rect', { x: box.x - gap, y: box.y - gap, width: box.w + 2 * gap, height: box.h + 2 * gap, rx: 7, 'class': 'tour-outline' }, layer);
      }
      controlSpecs(token).forEach(function (c) {
        if (c[6] !== 'pad' && c[6] !== 'screen' && c[6] !== 'strip') drawing.node(c[0]).classList.add('related');
      });
    });
  }

  function light(ids) {
    var drawing = state.drawing;
    drawing.svg.querySelectorAll('.tour-on').forEach(function (g) {
      if (ids.indexOf(g.getAttribute('data-id')) < 0) g.classList.remove('tour-on');
    });
    ids.forEach(function (id) { var g = drawing.node(id); if (g) g.classList.add('tour-on'); });
  }

  // The encoder has turned `steps` detents: its ridged band turns, and an arrow beside it shows
  // the turn.
  function turn(steps) {
    var drawing = state.drawing, g = drawing.node('ENCODER');
    if (!g) return;
    var knurl = g.querySelector('.knurl');
    if (knurl) knurl.style.transform = 'rotate(' + steps * 24 + 'deg)';
    var layer = drawing.svg.querySelector('.tour-outlines');
    var arrow = layer.querySelector('.tour-turn');
    if (!arrow) {
      var box = boxOf('ENCODER'), cx = box.x + box.w / 2, cy = box.y + box.h / 2, r = box.w / 2 + 13;
      var a1 = -Math.PI / 4, a2 = Math.PI / 4;
      var sx = cx + r * Math.cos(a1), sy = cy + r * Math.sin(a1), ex = cx + r * Math.cos(a2), ey = cy + r * Math.sin(a2);
      var tx = -Math.sin(a2), ty = Math.cos(a2), nx = Math.cos(a2), ny = Math.sin(a2);
      arrow = svgNode('g', { 'class': 'tour-turn' }, layer);
      svgNode('path', { d: 'M' + sx.toFixed(2) + ' ' + sy.toFixed(2) + 'A' + r + ' ' + r + ' 0 0 1 ' + ex.toFixed(2) + ' ' + ey.toFixed(2) }, arrow);
      svgNode('polygon', { points: [[ex + tx * 7, ey + ty * 7], [ex + nx * 5, ey + ny * 5], [ex - nx * 5, ey - ny * 5]]
        .map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' ') }, arrow);
    }
    arrow.classList.toggle('tick', steps % 2 === 1);
  }

  // The touch strip's LEDs as a progress bar: fill (0-1) in color, red while flash; null clears
  // it. centre: from the middle LED to the value, as for PITCH and a parameter symmetric around
  // 0 (the mixer's Pan; the bridge's StripMode.CENTER). Only the LED dots light up, like on the
  // controller; the touch surface stays unlit.
  function strip(fill, color, flash, centre) {
    var drawing = state.drawing;
    var on = fill !== null && fill !== undefined;
    var shade = flash ? PAD_COLORS[15] : color;
    var amount = on ? Math.max(0, Math.min(1, fill)) : 0;
    var count = on ? Math.round(amount * drawing.dots.length) : 0;
    var middle = Math.floor(drawing.dots.length / 2), position = Math.round(amount * (drawing.dots.length - 1));
    drawing.dots.forEach(function (dot, i) {
      var lit = centre ? on && i >= Math.min(middle, position) && i <= Math.max(middle, position)
        : i < Math.max(count, on ? 1 : 0);
      dot.classList.toggle('on', lit);
      dot.style.fill = lit ? shade : '';
      dot.style.color = lit ? shade : '';
    });
  }

  // A colour screen side for a MIKRO screen state (shows that give no MK3 screens of their own).
  function lcdFrom(oled) {
    var o = oled || {}, text = o.popup !== undefined ? String(o.popup).split('\n') : null;
    if (text) return { left: { title: text[0], center: text[1] || '', accent: SAMPLE_TRACKS[0].color } };
    var line3 = [o.MIKRO_LINE3, o.MIKRO_LINE3_VALUE].filter(Boolean).join('  ');
    return { left: { title: o.TITLE || '', sub: o.SUBTITLE || '', center: line3, accent: SAMPLE_TRACKS[0].color } };
  }

  function makeApi() {
    var drawing = state.drawing, spec = drawing.layout();
    // shows draw every tick (up to 32 a second): only what changed is drawn again
    var shown = { screen: null, pads: null };
    function changed(what, content) {
      var key = JSON.stringify(content);
      if (shown[what] === key) return false;
      shown[what] = key;
      return true;
    }
    function screen(content) { if (changed('screen', content)) drawing.showScreen(content); }
    var api = {
      device: state.device,
      layout: spec,
      calm: MM.reducedMotion(),
      blank: function () { var out = []; for (var i = 0; i < 16; i++) out.push(null); return out; },
      lit: function (color, level, drum) { return { color: color, level: level, drum: drum || null }; },
      demo: function (token) { var demo = (spec.padDemos || {})[token]; return demo ? demo.slice() : api.blank(); },
      pads: function (list) { if (changed('pads', list || null)) drawing.paintPads(list); },
      screen: function (oled, lcd) { screen(drawing.lcd ? lcd || lcdFrom(oled) : oled); },
      screenOf: function (token) { screen((spec.screens || {})[token] || spec.screen); },
      show: function (lines) { screen(lines || spec.screen); },
      light: light,
      turn: turn,
      strip: strip,
      outline: outline
    };
    return api;
  }

  // Back to the plain controller: nothing lit, the default screen.
  function resetDrawing() {
    var drawing = state.drawing, spec = drawing.layout();
    state.glow = ['-'];
    outline([]);
    light([]);
    strip(null);
    var layer = drawing.svg.querySelector('.tour-outlines');
    var arrow = layer.querySelector('.tour-turn');
    if (arrow) layer.removeChild(arrow);
    var knurl = drawing.svg.querySelector('[data-id="ENCODER"] .knurl');
    if (knurl) knurl.style.transform = '';
    drawing.paintPads(null);
    drawing.showScreen(spec.screen);
  }

  // --- the callout -------------------------------------------------------------------------

  function comboElement(combo) {
    var wrap = h('span', { className: 'combo' });
    combo.forEach(function (token, i) {
      if (i) wrap.appendChild(h('span', { className: 'plus', 'aria-hidden': 'true', text: '+' }));
      wrap.appendChild(MM.key(token));
    });
    return wrap;
  }

  // Every step's combo and text are in the callout, stacked in one place, only the current one
  // visible: the callout keeps the size of the longest, so the card doesn't jump between steps.
  function buildBubble() {
    refs.heads.innerHTML = '';
    refs.texts.innerHTML = '';
    var label = options.label || 'Step';
    state.steps.forEach(function (step, i) {
      refs.heads.appendChild(h('div', { className: 'tour-step' }, [
        h('p', { className: 'tour-count', text: label + ' ' + (i + 1) + ' of ' + state.steps.length }),
        h(options.comboTag || 'h3', { className: 'tour-combo' }, [comboElement(step.combo)])
      ]));
      var text = h('p', { className: 'tour-text tour-step', text: step.does });
      if (step.context) text.insertBefore(h('span', { className: 'tour-context', text: step.context + ': ' }), text.firstChild);
      refs.texts.appendChild(text);
    });
  }

  function markCurrent() {
    [refs.heads, refs.texts].forEach(function (stack) {
      Array.prototype.forEach.call(stack.children, function (child, i) { child.classList.toggle('current', i === state.index); });
    });
  }

  function fillBubble() {
    markCurrent();
    syncLoupe();
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Does a line from (xa, ya) to (xb, yb), horizontal or vertical, in drawing units, stay clear
  // of every control except those of `token`?
  function clearPath(xa, ya, xb, yb, token) {
    var x0 = Math.min(xa, xb), x1 = Math.max(xa, xb), y0 = Math.min(ya, yb), y1 = Math.max(ya, yb), m = 2;
    return !state.drawing.layout().controls.some(function (c) {
      if (tokenMatches(token, c[0])) return false;
      return c[2] - m < x1 && c[2] + c[4] + m > x0 && c[3] - m < y1 && c[3] + c[5] + m > y0;
    });
  }

  // How the leader reaches the target from the callout's side of the controller, in drawing
  // units, through the gaps between the controls: { y, x, endY } — it runs in along y from the
  // edge to x, then (endY set) up or down to the outline. A straight line in when that is clear,
  // else the nearest clear gap above or below the target, else around the outside.
  function route(token, box, left) {
    var spec = state.drawing.layout(), gap = 6;
    var edge = left ? 0 : spec.width, cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    var near = left ? box.x - gap : box.x + box.w + gap;
    if (clearPath(edge, cy, near, cy, token)) return { y: cy, x: near, endY: null };
    var top = box.y - gap, bottom = box.y + box.h + gap;
    for (var d = 0; d < 80; d += 2) {
      var candidates = [[top - d, top], [bottom + d, bottom]];
      for (var i = 0; i < 2; i++) {
        var y = candidates[i][0], end = candidates[i][1];
        if (y <= 0 || y >= spec.height) continue;
        if (clearPath(edge, y, cx, y, token) && clearPath(cx, y, cx, end, token)) return { y: y, x: cx, endY: end };
      }
    }
    var outside = cy < spec.height / 2 ? -14 : spec.height + 14;
    return { y: outside, x: cx, endY: outside < 0 ? top : bottom };
  }

  function visible() { return !!(state.drawing && root.offsetParent !== null); }

  // Put the callout next to the glowing controls (wide windows: in the space beside the
  // controller, a leader line to the controls) or under the controller (narrow: its arrow points
  // at them). animate: draw the leader line in.
  function place(animate) {
    var stage = refs.stage, bubble = refs.bubble, svg = state.drawing && state.drawing.svg;
    if (!svg || !visible()) return;
    var ctm = svg.getScreenCTM();
    var token = state.glow.filter(function (t) { return boxOf(t); })[0];
    var box = token && boxOf(token);
    if (!ctm || !box) return;
    var sr = stage.getBoundingClientRect(), spec = state.drawing.layout();
    function at(x, y) { return { x: ctm.a * x + ctm.c * y + ctm.e - sr.left, y: ctm.b * x + ctm.d * y + ctm.f - sr.top }; }
    var d0 = at(0, 0), d1 = at(spec.width, spec.height);
    var gap = 6;
    var t0 = at(box.x - gap, box.y - gap), t1 = at(box.x + box.w + gap, box.y + box.h + gap);
    var tcx = (t0.x + t1.x) / 2;
    var left = tcx < (d0.x + d1.x) / 2;
    var room = left ? d0.x : sr.width - d1.x;
    var width = Math.min(360, room - 40);
    var wide = window.matchMedia(WIDE).matches && width >= 230;
    stage.classList.toggle('wide', wide);
    stage.classList.toggle('narrow', !wide);
    var line = stage.querySelector('.tour-leader-line');
    if (!wide) {
      bubble.style.left = bubble.style.top = bubble.style.width = '';
      bubble.style.setProperty('--arrow-x', clamp(tcx - bubble.offsetLeft, 28, bubble.offsetWidth - 28) + 'px');
      return;
    }
    bubble.style.width = width + 'px';
    var bh = bubble.offsetHeight;
    // the leader: from the callout's edge into the controller through the gaps between the
    // controls (route()), ending on the outline
    var path = route(token, box, left);
    var gy = at(0, path.y).y, px = at(path.x, 0).x, gx = left ? d0.x - 14 : d1.x + 14;
    var x = left ? d0.x - 32 - width : d1.x + 32;
    var y = clamp(gy - bh / 2, Math.max(0, Math.min(d0.y, gy - 30)), Math.max(0, Math.max(d1.y, sr.height) - bh));
    bubble.style.left = x.toFixed(1) + 'px';
    bubble.style.top = y.toFixed(1) + 'px';
    var points = [[left ? x + width : x, clamp(gy, y + 24, y + bh - 24)]];
    points.push([gx, points[0][1]], [gx, gy], [px, gy]);
    if (path.endY !== null) points.push([px, at(0, path.endY).y]);
    var length = 0;
    for (var i = 1; i < points.length; i++) length += Math.abs(points[i][0] - points[i - 1][0]) + Math.abs(points[i][1] - points[i - 1][1]);
    var sx = points[0][0], sy = points[0][1], ex = points[points.length - 1][0], ey = points[points.length - 1][1];
    line.setAttribute('d', points.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(''));
    var start = stage.querySelector('.tour-leader-start'), end = stage.querySelector('.tour-leader-end');
    start.setAttribute('cx', sx.toFixed(1)); start.setAttribute('cy', sy.toFixed(1));
    end.setAttribute('cx', ex.toFixed(1)); end.setAttribute('cy', ey.toFixed(1));
    line.style.strokeDasharray = length.toFixed(1);
    if (animate && !MM.reducedMotion()) {
      line.style.transition = 'none';
      line.style.strokeDashoffset = length.toFixed(1);
      line.getBoundingClientRect();
      line.style.transition = '';
    }
    line.style.strokeDashoffset = '0';
  }

  // --- playing -----------------------------------------------------------------------------

  function runTick(n) {
    if (state.show.tick) state.show.tick(n, state.api);
    syncLoupe();
  }

  // The MIKRO's OLED is small in the drawing: the callout shows it magnified too.
  function loupeShown() { return !!(state.drawing && state.drawing.oled); }

  // The magnified screen: the same bitmap on a canvas of whole device pixels per screen pixel
  // (up to 2 CSS px each), so it stays crisp at any pixel ratio.
  function syncLoupe() {
    var loupe = refs.loupe;
    loupe.hidden = !loupeShown();
    if (loupe.hidden) return;
    var oled = state.drawing.oled;
    if (!oled.img) return;
    var ratio = window.devicePixelRatio || 1, box = loupe.parentNode, style = getComputedStyle(box);
    var room = Math.min(256, box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 16);
    if (!(room >= 32)) return;  // not laid out yet
    var key = [oled.key, room, ratio].join(' ');
    if (loupe.getAttribute('data-key') === key) return;
    loupe.setAttribute('data-key', key);
    var k = Math.max(1, Math.floor(room * ratio / 128));
    MM.manual.oledCanvas(oled.img, 128 * k, 32 * k, loupe);
    loupe.style.width = (loupe.width / ratio) + 'px';
    loupe.style.height = (loupe.height / ratio) + 'px';
  }

  function go(index, byUser) {
    var count = state.steps.length;
    if (!count) return;
    state.index = ((index % count) + count) % count;
    if (options.onStep) options.onStep(state.index, byUser);
    renderDots();
    updateStatus();
    if (!state.drawing) { markCurrent(); return; }  // drawn later (draw()): it starts on this step
    var step = state.steps[state.index];
    resetDrawing();
    state.show = MM.tourShow(step, state.device);
    state.api = makeApi();
    state.duration = (state.show.duration || DURATION) * (state.api.calm ? CALM_SLOWER : 1);
    state.elapsed = 0;
    state.tick = 0;
    state.glow = ['-'];
    outline(state.show.glow || step.combo);
    runTick(0);
    var stage = refs.stage;
    clearTimeout(state.swap);
    if (!stage.classList.contains('shown') || MM.reducedMotion()) {
      fillBubble();
      stage.classList.add('shown');
      place(true);
    } else {
      stage.classList.add('changing');
      state.swap = setTimeout(function () {
        fillBubble();
        place(true);
        stage.classList.remove('changing');
      }, 180);
    }
    if (byUser) refs.bubble.setAttribute('aria-live', 'polite');
    else refs.bubble.removeAttribute('aria-live');
  }

  function held() { return state.paused || state.hover; }

  function frame() {
    var t = now();
    var dt = Math.min(t - state.last, 100);
    state.last = t;
    if (!state.show || held()) return;
    state.elapsed += dt;
    var n = Math.floor(state.elapsed / (state.show.every || EVERY));
    if (n !== state.tick) {
      state.tick = n;
      runTick(n);
    }
    var fill = refs.dots.querySelector('.active .tour-dot-fill');
    if (fill) fill.style.transform = 'scaleX(' + Math.min(1, state.elapsed / state.duration).toFixed(3) + ')';
    if (state.elapsed >= state.duration) go(state.index + 1, false);
  }

  // The card in view plays; the others wait where they are.
  function play() {
    if (state.timer) return;
    state.last = now();
    state.timer = setInterval(frame, FRAME);
    refs.stage.classList.add('playing');
  }

  function halt() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
    refs.stage.classList.remove('playing');
  }

  // --- controls ----------------------------------------------------------------------------

  function renderDots() {
    var dots = refs.dots;
    if (dots.children.length !== state.steps.length) {
      dots.innerHTML = '';
      dots.classList.toggle('many', state.steps.length > 9);
      state.steps.forEach(function (step, i) {
        var dot = h('button', { type: 'button', className: 'tour-dot',
          'aria-label': (options.label || 'Step') + ' ' + (i + 1) + ': ' + step.combo.join(' + ') + (step.context ? ' (' + step.context + ')' : '') },
          [h('span', { className: 'tour-dot-fill', 'aria-hidden': 'true' })]);
        dot.addEventListener('click', function () { go(i, true); });
        dots.appendChild(dot);
      });
    }
    Array.prototype.forEach.call(dots.children, function (dot, i) {
      var active = i === state.index;
      dot.classList.toggle('active', active);
      if (active) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
      dot.querySelector('.tour-dot-fill').style.transform = active ? 'scaleX(0)' : '';
    });
  }

  function updateStatus() {
    var status = state.paused ? 'Paused' : state.hover ? 'Holding' : (state.index + 1) + ' / ' + state.steps.length;
    refs.status.textContent = status;
    refs.stage.classList.toggle('held', held());
    var button = refs.pause;
    button.setAttribute('aria-pressed', String(state.paused));
    var label = state.paused ? 'Play' : 'Pause';
    button.setAttribute('title', label);
    button.querySelector('.visually-hidden').textContent = label;
    button.querySelector('use').setAttribute('href', state.paused ? '#i-play' : '#i-pause');
  }

  // The page hidden (another tab, minimised) or the window without focus: the card pauses as if
  // the pause button had been pressed. Back again, it plays on only if it was playing before.
  function setAway(away) {
    if (away) {
      if (state.paused) return;  // already paused (by hand or before): stays as it is
      state.paused = true;
      state.autoPaused = true;
      updateStatus();
    } else if (state.autoPaused) {
      state.paused = false;
      state.autoPaused = false;
      state.resumedAt = now();
      updateStatus();
    }
  }

  function hoverable(node) {
    node.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      state.hover = true;
      updateStatus();
    });
    node.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      state.hover = false;
      updateStatus();
    });
  }

  // The steps for this controller; index: the step to show (kept where it was by default).
  function load(device, steps, index) {
    state.device = device;
    state.steps = steps;
    buildBubble();
    refs.dots.innerHTML = '';
    if (state.drawing && state.drawnFor !== device) redraw();
    presize();
    go(index === undefined ? Math.min(state.index, steps.length - 1) : index, false);
  }

  // Not drawn yet: the card takes its final size already (the drawing's proportions, the callout
  // beside or under it), so a jump to a card further down lands where it should.
  function presize() {
    if (state.drawing || !state.device) return;
    var spec = LAYOUTS[state.device], wide = window.matchMedia(WIDE).matches;
    refs.svg.setAttribute('viewBox', '0 0 ' + spec.width + ' ' + spec.height);
    refs.stage.classList.toggle('wide', wide);
    refs.stage.classList.toggle('narrow', !wide);
  }

  function redraw() {
    state.drawing.draw(state.device);
    state.drawnFor = state.device;
    var spec = state.drawing.layout();
    state.drawing.svg.setAttribute('aria-label', spec.title + ': ' + (options.name || 'the tour'));
    svgNode('g', { 'class': 'tour-outlines' }, state.drawing.svg);
    refs.stage.classList.toggle('has-loupe', !!state.drawing.oled);
  }

  // Make the drawing (the first time the card comes near the window), and show the step.
  function draw() {
    if (state.drawing && state.drawnFor === state.device) return;
    if (!state.drawing) state.drawing = MM.manual.createDrawing(refs.svg, { magnifier: true });
    redraw();
    go(state.index, false);
  }

  // the callout follows the drawing whenever its size changes (window, fonts, mobile toolbars)
  var pending = null;
  function later() {
    if (pending) return;
    pending = setTimeout(function () { pending = null; presize(); place(false); if (state.drawing) syncLoupe(); }, 60);
  }
  window.addEventListener('resize', later);
  if (window.ResizeObserver) new ResizeObserver(later).observe(refs.svg);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);

  hoverable(refs.svg);
  hoverable(refs.bubble);
  refs.pause.addEventListener('click', function () {
    // a click on Play in a window without focus first focuses it, which already plays the card
    // on (setAway()): that click must not pause it again
    if (state.resumedAt && now() - state.resumedAt < 600) { state.resumedAt = 0; return; }
    state.resumedAt = 0;
    state.paused = !state.paused;
    state.autoPaused = false;
    updateStatus();
    if (options.onUser) options.onUser();
  });
  // previous / next: that step from its start, still playing or still paused
  refs.prev.addEventListener('click', function () { go(state.index - 1, true); if (options.onUser) options.onUser(); });
  refs.next.addEventListener('click', function () { go(state.index + 1, true); if (options.onUser) options.onUser(); });

  return {
    load: load, draw: draw, play: play, halt: halt, setAway: setAway, place: place,
    go: function (index, byUser) { go(index, byUser); },
    index: function () { return state.index; },
    count: function () { return state.steps.length; },
    drawn: function () { return !!state.drawing && state.drawnFor === state.device; }
  };
};
