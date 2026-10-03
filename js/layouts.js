// Schematic hardware layouts. Units: SVG user units in a 1000 x 640 view box.
// Each control: [id, label, x, y, w, h, kind]. kind: button | pad | encoder | strip | screen | knob
// Control ids match the combo tokens in features.json (upper-case button labels, PAD n, ...).

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

// A selected pad lights in MASCHINE's 16 sound colours, in the software's order (sound 1 Red ...
// sound 16 Fuchsia). Values marked "sampled" were taken from NI's MASCHINE software screenshots
// on native-instruments.com; the rest sit between their sampled neighbours.
var PAD_COLORS = [
  '#ff2030', // 1 Red (sampled)
  '#ff692d', // 2 Orange (sampled)
  '#ff9429', // 3 Light Orange
  '#ffb514', // 4 Warm Yellow
  '#ffdb00', // 5 Yellow (sampled)
  '#9fff19', // 6 Lime
  '#26ff38', // 7 Green
  '#19ffab', // 8 Mint
  '#00f0ef', // 9 Cyan (sampled)
  '#00d2ff', // 10 Turquoise (sampled)
  '#2b96ff', // 11 Blue (sampled)
  '#8871ff', // 12 Plum (sampled)
  '#ab61ff', // 13 Violet
  '#d24dff', // 14 Purple
  '#ff38d7', // 15 Magenta
  '#ff2c7f'  // 16 Fuchsia (sampled)
];

var LAYOUTS = {
  mikro: {
    title: 'MASCHINE MIKRO MK3',
    width: 1000,
    height: 640,
    controls: [].concat(
      grid(['MASCHINE', ['STAR', '★'], ['BROWSER', 'BROWSER']], 30, 30, 3, 88, 34, 10),
      grid(['VOLUME', 'SWING', 'TEMPO'], 30, 82, 3, 88, 34, 10),
      grid(['PLUG-IN', 'SAMPLING'], 30, 134, 3, 88, 34, 10),
      [['SCREEN', 'SCREEN', 340, 30, 230, 90, 'screen']],
      grid([['◀', '◀'], ['▶', '▶']], 368, 132, 2, 82, 34, 10),
      [['ENCODER', 'ENCODER', 610, 30, 136, 136, 'encoder']],
      grid(['PITCH', 'MOD', 'PERFORM', 'NOTES'], 30, 206, 4, 88, 34, 10),
      [['STRIP', 'TOUCH STRIP', 30, 252, 382, 30, 'strip']],
      grid(['GROUP', 'AUTO', 'LOCK', 'NOTE REPEAT'], 30, 300, 4, 88, 34, 10),
      grid(['RESTART', 'ERASE', 'TAP', 'FOLLOW', 'PLAY', 'REC', 'STOP', 'SHIFT'], 30, 370, 2, 88, 50, 10),
      grid(['FIXED VEL', 'PAD MODE', 'KEYBOARD', 'CHORDS', 'STEP'], 236, 370, 1, 96, 36, 9),
      grid(['SCENE', 'PATTERN', 'EVENTS', 'VARIATION', 'DUPLICATE', 'SELECT', 'SOLO', 'MUTE'], 350, 370, 2, 92, 50, 10),
      pads(560, 210, 96, 10)
    )
  },
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
