// Hardware layouts, drawn by manual.js. Units: SVG user units; a layout's view box is width x height.
// Each control: [id, label, x, y, w, h, kind, options]. kind: button | pad | encoder | strip | screen | knob
// options (optional): sub (the grey SHIFT label printed under the label), tone ('green' | 'red'),
// prefix (a printed symbol before the label), icon ('maschine' | 'star' | 'search' | 'left' |
// 'right'), inverse (label printed in a white box, like SHIFT).
// Control ids match the combo tokens in features.json (upper-case button labels, PAD n, ...).
//
// The MIKRO MK3 is measured from a straight top-down product photo (pixel coordinates in that
// photo, scaled by `photo()`), so the drawing has the real proportions.

// A converter from photo pixel coordinates (unit's top-left at ox, oy) to view box units.
function photo(ox, oy, scale) {
  return function (id, label, x, y, w, h, kind, options) {
    return [id, label, (x - ox) * scale, (y - oy) * scale, w * scale, h * scale, kind || 'button', options || null];
  };
}

function grid(ids, x, y, columns, w, h, gap, kind) {
  return ids.map(function (entry, i) {
    var id = Array.isArray(entry) ? entry[0] : entry;
    var label = Array.isArray(entry) ? entry[1] : entry;
    return [id, label, x + (i % columns) * (w + gap), y + Math.floor(i / columns) * (h + gap), w, h, kind || 'button'];
  });
}

function pads(x, y, size, gap) {
  var out = [];
  for (var row = 0; row < 4; row++) {
    for (var col = 0; col < 4; col++) {
      var number = (3 - row) * 4 + col + 1; // pad 1 = bottom left, as printed
      out.push(['PAD ' + number, String(number), x + col * (size + gap), y + row * (size + gap), size, size, 'pad']);
    }
  }
  return out;
}

// A selected pad lights in MASCHINE's 16 sound colours, in the software's order: sound 1 Orange
// ... sound 15 Fuchsia, sound 16 Red (as in MASCHINE). Values marked "sampled" were
// taken from NI's MASCHINE software screenshots on native-instruments.com; the rest sit between
// their sampled neighbours.
var PAD_COLORS = [
  '#ff692d', // 1 Orange (sampled)
  '#ff9429', // 2 Light Orange
  '#ffb514', // 3 Warm Yellow
  '#ffdb00', // 4 Yellow (sampled)
  '#9fff19', // 5 Lime
  '#26ff38', // 6 Green
  '#19ffab', // 7 Mint
  '#00f0ef', // 8 Cyan (sampled)
  '#00d2ff', // 9 Turquoise (sampled)
  '#2b96ff', // 10 Blue (sampled)
  '#8871ff', // 11 Plum (sampled)
  '#ab61ff', // 12 Violet
  '#d24dff', // 13 Purple
  '#ff38d7', // 14 Magenta
  '#ff2c7f', // 15 Fuchsia (sampled)
  '#ff2030'  // 16 Red (sampled)
];

var LAYOUTS = {
  mikro: (function () {
    // Photo: 600 px wide; the unit spans x 14-586.5, y 145-458 (572.5 x 313 px).
    var k = 1000 / 572.5;
    var c = photo(14, 145, k);
    var column = ['SCENE', 'PATTERN', 'EVENTS', 'VARIATION', 'DUPLICATE', 'SELECT', 'SOLO', 'MUTE'];
    var columnSubs = { SCENE: 'Section', VARIATION: 'Navigate', DUPLICATE: 'Double', MUTE: 'Choke' };
    // Printed on each pad: the number (bold), a label, and on the top rows a group letter.
    var padPrint = {
      1: ['Undo'], 2: ['Redo'], 3: ['Step Undo'], 4: ['Step Redo'],
      5: ['Quantize'], 6: ['Quantize 50%'], 7: ['Nudge <'], 8: ['Nudge >'],
      9: ['Clear', 'E'], 10: ['Clear Auto', 'F'], 11: ['Copy', 'G'], 12: ['Paste', 'H'],
      13: ['Semitone -', 'A'], 14: ['Semitone +', 'B'], 15: ['Octave -', 'C'], 16: ['Octave +', 'D']
    };
    var pads = [];
    for (var row = 0; row < 4; row++) {
      for (var col = 0; col < 4; col++) {
        var number = (3 - row) * 4 + col + 1; // pad 1 = bottom left, as printed
        pads.push(c('PAD ' + number, String(number), 318.3 + col * 64.33, 190.7 + row * 64.33, 59.3, 59.3, 'pad',
          { sub: padPrint[number][0], letter: padPrint[number][1] }));
      }
    }
    var dots = [];
    for (var d = 0; d < 25; d++) dots.push([(44.5 + d * (216.25 - 44.5) / 24 - 14) * k, (291.25 - 145) * k]);
    return {
      title: 'MASCHINE MIKRO MK3',
      width: 1000,
      height: Math.round(313 * k),
      radius: 7,
      real: true,
      screen: ['Clips 1-4', 'Scene 1  Drums Bass'],
      // What the OLED shows when a control is selected or a combo with it is hovered (sample
      // content in the style of the script's screens; 2 lines: big + small, 3 lines: all small).
      screens: {
        'PLUG-IN': ['1-Bass', 'Auto Filter  Filter', 'Frequency   2.40 kHz'],
        'TEMPO': ['Tempo', '120.00 BPM'],
        'SWING': ['Swing', '25 %'],
        'VOLUME': ['Meters 1-4', 'Drums Bass Keys'],
        'PAD MODE': ['Drum Rack', '1-Drums  Kick'],
        'KEYBOARD': ['C Major', 'Keyboard  Octave 3'],
        'CHORDS': ['Chords', 'C Major  Close'],
        'STEP': ['Step Kick', 'Page 1  1/16'],
        'SCENE': ['Scenes', '1 - 16 of 8'],
        'PATTERN': ['Clips 1-4', 'Scene 1  Drums Bass'],
        'NOTE REPEAT': ['Repeat', '1/16'],
        'FIXED VEL': ['Fixed Vel', 'Velocity 127'],
        'EVENTS': ['Events', '1-Drums  Kick'],
        'GROUP': ['Tracks 1-4', 'Drums Bass Keys'],
        'LOCK': ['Locked', '1-Bass  Auto Filter'],
        'MASCHINE': ['MASCHINE for Live', '2.0.0  by Elton47', 'Live 12.4.6'],
        'STAR': ['Browser', 'Drums  808 Kit'],
        'BROWSER': ['Browser', 'Drums  808 Kit']
      },
      stripDots: dots,
      controls: [
        c('MASCHINE', 'MASCHINE', 33.75, 164, 17.5, 14, 'button', { icon: 'maschine' }),
        c('STAR', '★', 33.75, 185, 17.5, 14.5, 'button', { icon: 'star' }),
        c('BROWSER', 'BROWSER', 33.75, 206, 17.5, 14.5, 'button', { icon: 'search' }),
        c('SCREEN', 'SCREEN', 67.5, 164, 50.5, 15, 'screen'),
        c('ENCODER', 'ENCODER', 72.5, 183.75, 40, 40, 'encoder'),
        c('VOLUME', 'VOLUME', 133.75, 163.5, 43.25, 15.5, 'button', { sub: 'Velocity' }),
        c('PLUG-IN', 'PLUG-IN', 183.75, 163.5, 43.25, 15.5, 'button', { sub: 'Macro' }),
        c('SWING', 'SWING', 133.75, 185, 43.25, 14.5, 'button', { sub: 'Position' }),
        c('SAMPLING', 'SAMPLING', 183.75, 185, 43.25, 14.5),
        c('TEMPO', 'TEMPO', 133.75, 206, 43.25, 15, 'button', { sub: 'Tune' }),
        c('◀', '◀', 183.75, 206, 18.25, 15, 'button', { icon: 'left' }),
        c('▶', '▶', 208.75, 206, 18.25, 15, 'button', { icon: 'right' }),
        c('PITCH', 'PITCH', 33.25, 266, 44.25, 15.25),
        c('MOD', 'MOD', 83.25, 266, 44.25, 15.25),
        c('PERFORM', 'PERFORM', 133.75, 266, 43.25, 15.25, 'button', { sub: 'FX Select' }),
        c('NOTES', 'NOTES', 183.75, 266, 43.25, 15.25),
        c('STRIP', 'TOUCH STRIP', 33, 296.25, 194, 22.5, 'strip'),
        c('GROUP', 'GROUP', 33.25, 342.5, 44.25, 26.75),
        c('AUTO', 'AUTO', 83.25, 342.5, 44.25, 26.75),
        c('LOCK', 'LOCK', 133.75, 342.5, 43.25, 26.75),
        c('NOTE REPEAT', 'NOTE REPEAT', 183.75, 342.5, 43.25, 26.75, 'button', { sub: 'Arp' }),
        c('RESTART', 'RESTART', 33.25, 393, 44.25, 15.75, 'button', { sub: 'Loop' }),
        c('ERASE', 'ERASE', 83.25, 393, 44.25, 15.75, 'button', { sub: 'Replace' }),
        c('TAP', 'TAP', 133.75, 393, 43.25, 15.75, 'button', { sub: 'Metro' }),
        c('FOLLOW', 'FOLLOW', 183.75, 393, 43.25, 15.75, 'button', { sub: 'Grid' }),
        c('PLAY', 'PLAY', 33.25, 415, 44.25, 25, 'button', { tone: 'green', prefix: '▶' }),
        c('REC', 'REC', 83.25, 415, 44.25, 25, 'button', { tone: 'red', prefix: '●', sub: 'Count-in' }),
        c('STOP', 'STOP', 133.75, 415, 43.25, 25, 'button', { prefix: '■' }),
        c('SHIFT', 'SHIFT', 183.75, 415, 43.25, 25, 'button', { inverse: true }),
        c('FIXED VEL', 'FIXED VEL', 261.25, 163.75, 44.25, 14.25, 'button', { sub: '16 Vel' }),
        c('PAD MODE', 'PAD MODE', 318.3, 162.7, 59.3, 16.6),
        c('KEYBOARD', 'KEYBOARD', 382.6, 162.7, 59.3, 16.6),
        c('CHORDS', 'CHORDS', 446.9, 162.7, 59.3, 16.6),
        c('STEP', 'STEP', 511.2, 162.7, 59.3, 16.6)
      ].concat(column.map(function (id, i) {
        return c(id, id, 261.25, 191.25 + i * 31.9, 44.25, 25.75, 'button', columnSubs[id] ? { sub: columnSubs[id] } : null);
      }), pads)
    };
  })(),
  mk3: {
    title: 'MASCHINE MK3',
    width: 1000,
    height: 640,
    controls: [].concat(
      grid(['CHANNEL', 'PLUG-IN', 'ARRANGER', 'MIXER', 'BROWSER', 'SAMPLING'], 20, 24, 2, 74, 28, 8),
      grid([['◀', '◀'], ['▶', '▶']], 20, 134, 2, 74, 28, 8),
      grid(['FILE', 'SETTINGS', 'AUTO', 'MACRO'], 20, 172, 2, 74, 28, 8),
      grid(['DISPLAY 1', 'DISPLAY 2', 'DISPLAY 3', 'DISPLAY 4', 'DISPLAY 5', 'DISPLAY 6', 'DISPLAY 7', 'DISPLAY 8']
        .map(function (id, i) { return [id, String(i + 1)]; }), 200, 20, 8, 84, 18, 6),
      [['SCREEN', 'SCREEN', 200, 44, 354, 120, 'screen'], ['SCREEN 2', 'SCREEN', 560, 44, 354, 120, 'screen']],
      grid(['KNOB 1', 'KNOB 2', 'KNOB 3', 'KNOB 4', 'KNOB 5', 'KNOB 6', 'KNOB 7', 'KNOB 8']
        .map(function (id, i) { return [id, String(i + 1)]; }), 214, 176, 8, 70, 70, 20, 'knob'),
      grid(['VOLUME', 'SWING', 'TEMPO'], 20, 270, 3, 60, 28, 6),
      [['ENCODER', '4-D', 54, 310, 96, 96, 'encoder']],
      grid(['NOTE REPEAT', 'LOCK'], 20, 418, 2, 92, 28, 8),
      grid(['PITCH', 'MOD', 'PERFORM', 'NOTES'], 214, 270, 4, 70, 28, 8),
      [['STRIP', 'TOUCH STRIP', 214, 306, 304, 26, 'strip']],
      grid(['GROUP A', 'GROUP B', 'GROUP C', 'GROUP D', 'GROUP E', 'GROUP F', 'GROUP G', 'GROUP H']
        .map(function (id) { return [id, id.slice(-1)]; }), 214, 346, 4, 70, 34, 8),
      grid(['RESTART', 'ERASE', 'TAP', 'FOLLOW', 'PLAY', 'REC', 'STOP', 'SHIFT'], 20, 470, 2, 92, 34, 8),
      grid(['FIXED VEL', 'PAD MODE', 'KEYBOARD', 'CHORDS', 'STEP'], 214, 434, 5, 58, 30, 4),
      grid(['SCENE', 'PATTERN', 'EVENTS', 'VARIATION', 'DUPLICATE', 'SELECT', 'SOLO', 'MUTE'], 214, 474, 4, 70, 34, 8),
      pads(560, 262, 84, 9)
    )
  }
};

// Combo tokens that stand for several controls.
var TOKEN_ALIASES = {
  'PAD': function (id) { return /^PAD \d+$/.test(id); },
  'TURN': function (id) { return id === 'ENCODER'; },
  'PUSH': function (id) { return id === 'ENCODER'; },
  'ENCODER TOUCH': function (id) { return id === 'ENCODER'; },
  'GROUP A-H': function (id) { return /^GROUP [A-H]$/.test(id); },
  'KNOB': function (id) { return /^KNOB \d$/.test(id); }
};

function tokenMatches(token, id) {
  if (TOKEN_ALIASES[token]) return TOKEN_ALIASES[token](id);
  return token === id;
}
