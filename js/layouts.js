// Hardware layouts, drawn by manual.js. Units: SVG user units; a layout's view box is width x height.
// Each control: [id, label, x, y, w, h, kind, options]. kind: button | pad | encoder | strip | screen | knob
// options (optional): sub (the grey SHIFT label printed under the label), tone ('green' | 'red'),
// prefix (a printed symbol before the label), icon ('maschine' | 'star' | 'search' | 'left' |
// 'right'), inverse (label printed in a white box, like SHIFT), letter (a pad's group letter),
// light (a plain light cap, like the MK3's display buttons), lit (the colour a button lights in
// when selected), face (knob / encoder: radius of the lighter top as a share of the radius),
// lcd ('left' | 'right': a colour screen showing that side of `screens`).
// Control ids match the combo tokens in features.json (upper-case button labels, PAD n, ...).
//
// Both units are measured from straight top-down product photos (pixel coordinates in that
// photo, scaled by `photo()`), so the drawings have the real proportions.

// A converter from photo pixel coordinates (unit's top-left at ox, oy) to view box units.
function photo(ox, oy, scale) {
  return function (id, label, x, y, w, h, kind, options) {
    return [id, label, (x - ox) * scale, (y - oy) * scale, w * scale, h * scale, kind || 'button', options || null];
  };
}

// What is printed on each pad (the same on both units): the label after the number, and on the
// top two rows a group letter.
var PAD_PRINT = {
  1: ['Undo'], 2: ['Redo'], 3: ['Step Undo'], 4: ['Step Redo'],
  5: ['Quantize'], 6: ['Quantize 50%'], 7: ['Nudge <'], 8: ['Nudge >'],
  9: ['Clear', 'E'], 10: ['Clear Auto', 'F'], 11: ['Copy', 'G'], 12: ['Paste', 'H'],
  13: ['Semitone -', 'A'], 14: ['Semitone +', 'B'], 15: ['Octave -', 'C'], 16: ['Octave +', 'D']
};

// The 4 x 4 pads with their print. columns / rows: photo pixel positions (rows top first), c: a
// photo() converter. Pad 1 is bottom left, as printed.
function printedPads(c, columns, rows, w, h) {
  var out = [];
  for (var row = 0; row < 4; row++) {
    for (var col = 0; col < 4; col++) {
      var number = (3 - row) * 4 + col + 1;
      out.push(c('PAD ' + number, String(number), columns[col], rows[row], w, h, 'pad',
        { sub: PAD_PRINT[number][0], letter: PAD_PRINT[number][1] }));
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
    var step = [0, 1, 2, 3].map(function (i) { return i * 64.33; });  // pad pitch
    var pads = printedPads(c, step.map(function (s) { return 318.3 + s; }), step.map(function (s) { return 190.7 + s; }), 59.3, 59.3);
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
  mk3: (function () {
    // Photo: 600 x 552 px; the unit spans x 11.5-591.3, y 11.5-542.3 (579.8 x 530.8 px). The
    // right and bottom 15 px are the unit's darker edge band.
    var k = 1000 / 579.8;
    var c = photo(11.5, 11.5, k);
    function area(x, y, w, h, cls) { return [(x - 11.5) * k, (y - 11.5) * k, w * k, h * k, cls]; }
    function round(id, label, cx, cy, r, kind, options) { return c(id, label, cx - r, cy - r, 2 * r, 2 * r, kind, options); }
    var displayX = [159.5, 210.5, 261.75, 313, 364.25, 415.5, 466.75, 517.75];
    var display = [], knobs = [];
    for (var i = 0; i < 8; i++) {
      display.push(c('DISPLAY ' + (i + 1), String(i + 1), displayX[i], 28.5, i === 7 ? 44.5 : 44, 15.5, 'button', { light: true }));
      knobs.push(round('KNOB ' + (i + 1), String(i + 1), 181 + i * 51, 208, 15.5, 'knob', { face: 0.71 }));
    }
    // Group buttons: the printed letter; lit colours sampled from the photo.
    var groupLit = ['#fecf7e', '#4bddfe', '#4edafe', '#4cdcfc', '#4edcfd', '#9177fd', '#4fdafe', '#fe76fb'];
    var groups = 'ABCDEFGH'.split('').map(function (letter, i) {
      return c('GROUP ' + letter, letter, [26.5, 77.5, 129, 180.5][i % 4], i < 4 ? 398.5 : 431.5, 45, 26.5, 'button', { lit: groupLit[i] });
    });
    var column = [
      ['SCENE', 269.5, 'Section'], ['PATTERN', 302.5], ['EVENTS', 335.5], ['VARIATION', 368.25, 'Navigate'],
      ['DUPLICATE', 401.25, 'Double'], ['SELECT', 434.25], ['SOLO', 467], ['MUTE', 500, 'Choke']
    ].map(function (b) { return c(b[0], b[0], 260.5, b[1], 45, 27, 'button', b[2] ? { sub: b[2] } : null); });
    var leds = [];
    for (var d = 0; d < 25; d++) leds.push([(38.5 + d * (213.5 - 38.5) / 24 - 11.5) * k, (347.5 - 11.5) * k]);
    // the four direction dots around the encoder
    var marks = [[75, 241], [45, 271], [106, 271], [75, 301]].map(function (m) { return [(m[0] - 11.5) * k, (m[1] - 11.5) * k, 1.8]; });

    // Sample content for the two colour screens (480 x 272 each), in the style of the script's MK3
    // screens. Per side: title, sub, accent (header bar colour), center + small (a big value),
    // buttons (labels over the display buttons), knobs ([name, value 0-1 or null, text, colour]),
    // list ([name, colour]) with selected, touched (the knob cell being touched). A side that is
    // left out shows the default content.
    var tracks = [['1-Drums', '#ff692d'], ['2-Bass', '#2b96ff'], ['3-Keys', '#ffdb00'], ['4-Pad', '#ab61ff'],
      ['5-Lead', '#26ff38'], ['6-Vox', '#ff38d7'], ['7-FX', '#00d2ff'], ['8-Perc', '#ffb514']];
    var volumes = [[0.85, '0.0 dB'], [0.78, '-3.0 dB'], [0.7, '-6.0 dB'], [0.6, '-10 dB'],
      [0.74, '-4.5 dB'], [0.81, '-1.5 dB'], [0.55, '-12 dB'], [0.66, '-7.5 dB']];
    function volumeKnobs(from) {
      return tracks.slice(from, from + 4).map(function (t, j) {
        return [t[0].split('-')[1], volumes[from + j][0], volumes[from + j][1], t[1]];
      });
    }
    function side(title, sub, center, small, accent) {
      return { title: title, sub: sub, center: center, small: small, accent: accent || tracks[0][1] };
    }
    var clips = {
      left: { title: '1-Drums', sub: 'Clips', center: 'Tracks 1-8', small: 'Scene 1', accent: tracks[0][1], knobs: volumeKnobs(0) },
      right: { title: 'Volume', sub: 'Mixer', knobs: volumeKnobs(4) }
    };
    var plugin = {
      left: { title: 'Auto Filter', sub: '2-Bass', accent: tracks[1][1], knobs: [
        ['Frequency', 0.62, '2.40 kHz'], ['Resonance', 0.32, '32 %'], ['Drive', 0.2, '3.0 dB'], ['LFO Amt', 0.18, '18 %']] },
      right: { title: 'Filter', sub: 'Device', accent: tracks[1][1], knobs: [
        ['Env Amt', 0.5, '0.0'], ['Morph', 0, '0 %'], ['Dry/Wet', 1, '100 %'], ['Output', 0.5, '0.0 dB']] }
    };
    var mutes = ['Mute', 'Mute', 'Mute', 'Mute'];
    var screens = {
      'PLUG-IN': plugin,
      'KNOB': plugin,
      'MIXER': {
        left: { title: 'Mixer', sub: 'Tracks 1-8', buttons: mutes, knobs: volumeKnobs(0) },
        right: { title: 'Volume', sub: 'Mixer', buttons: mutes, knobs: volumeKnobs(4) }
      },
      'PATTERN': clips,
      'TEMPO': { left: side('Tempo', 'Master', '120.00', 'BPM') },
      'SWING': { left: side('Swing', 'Master', '25 %', 'Repeat and arp follow') },
      'VOLUME': { left: side('1-Drums', 'Volume', '-6.0 dB', 'Selected track') },
      'PAD MODE': {
        left: side('1-Drums', 'Drums', '808 Kit', 'Pad 1  Kick'),
        right: { title: 'Drum Rack', sub: '808 Kit', selected: 0, list: [['Kick', PAD_COLORS[0]], ['Snare', PAD_COLORS[1]],
          ['Clap', PAD_COLORS[2]], ['Closed Hat', PAD_COLORS[3]], ['Open Hat', PAD_COLORS[4]], ['Tom', PAD_COLORS[5]]] }
      },
      'KEYBOARD': { left: side('3-Keys', 'Keyboard', 'C Major', 'Octave 3', tracks[2][1]) },
      'CHORDS': { left: side('3-Keys', 'Chords', 'Triad', 'C Major  Close', tracks[2][1]) },
      'STEP': { left: side('1-Drums', 'Step', 'Kick', 'Page 1  1/16') },
      'SCENE': { left: side('1-Drums', 'Scenes', 'Scenes 1-16', 'Scene 1 playing') },
      'SELECT': { left: side('1-Drums', 'Tracks', 'Tracks 1-16', 'Pads select tracks') },
      'NOTE REPEAT': { left: side('1-Drums', 'Note Repeat', '1/16', 'Rate') },
      'FIXED VEL': { left: side('1-Drums', 'Fixed Velocity', '100', 'Velocity') },
      'EVENTS': { left: side('1-Drums', 'Events', 'Kick', '8 notes selected') },
      'LOCK': { left: side('2-Bass', 'Locked', 'Auto Filter', 'Device lock', tracks[1][1]) },
      'ARRANGER': { left: side('1-Drums', 'View', 'Arrangement', 'Session / Arrangement') },
      'BROWSER': {
        left: { title: 'Browser', sub: 'Drums', selected: 0, accent: '#8f8f96',
          list: [['808 Kit'], ['909 Kit'], ['Boom Kit'], ['Dub Kit'], ['Lo-Fi Kit']] }
      },
      'GROUP A-H': { left: side('1-Drums', 'Tracks', 'Tracks 1-8', 'Group buttons select') }
    };
    tracks.forEach(function (t, j) {
      screens['GROUP ' + 'ABCDEFGH'.charAt(j)] = { left: side(t[0], 'Selected track', 'Tracks 1-8', 'Track ' + (j + 1) + ' of 8', t[1]) };
    });
    // a knob shows the plug-in page with its cell touched
    for (var n = 0; n < 8; n++) {
      var page = { left: Object.assign({}, plugin.left), right: Object.assign({}, plugin.right) };
      page[n < 4 ? 'left' : 'right'].touched = n % 4;
      screens['KNOB ' + (n + 1)] = page;
    }

    return {
      title: 'MASCHINE MK3',
      width: 1000,
      height: Math.round(530.8 * k),
      radius: 4,
      real: true,
      // decorations under the controls: [x, y, w, h, class]
      panels: [
        area(576.5, 11.5, 14.8, 530.8, 'hw-edge'),
        area(11.5, 527.5, 579.8, 14.8, 'hw-edge'),
        area(144.5, 11.5, 432, 172.5, 'hw-glass')
      ],
      stripDots: leds,
      marks: marks,
      screen: clips,
      screens: screens,
      controls: [
        c('CHANNEL', 'CHANNEL', 26.5, 28.5, 45, 16, 'button', { sub: 'MIDI' }),
        c('PLUG-IN', 'PLUG-IN', 77.5, 28.5, 45, 16, 'button', { sub: 'Instance' }),
        c('ARRANGER', 'ARRANGER', 26.5, 58.5, 45, 26),
        c('MIXER', 'MIXER', 77.5, 58.5, 45, 26),
        c('BROWSER', 'BROWSER', 26.5, 91.5, 45, 26, 'button', { sub: '+Plug-in' }),
        c('SAMPLING', 'SAMPLING', 77.5, 91.5, 45, 26),
        c('◀', '◀', 26.5, 124, 45, 15.5, 'button', { icon: 'left' }),
        c('▶', '▶', 77.5, 124, 45, 15.5, 'button', { icon: 'right' }),
        c('FILE', 'FILE', 26.5, 145.5, 45, 16, 'button', { sub: 'Save' }),
        c('SETTINGS', 'SETTINGS', 77.5, 145.5, 45, 16),
        c('AUTO', 'AUTO', 26.5, 167.5, 45, 16),
        c('MACRO', 'MACRO', 77.5, 167.5, 45, 16, 'button', { sub: 'Set' }),
        c('SCREEN', 'SCREEN', 167.75, 67.5, 178.25, 100.5, 'screen', { lcd: 'left' }),
        c('SCREEN 2', 'SCREEN', 375.5, 67.5, 177, 100.5, 'screen', { lcd: 'right' }),
        round('ENCODER', 'ENCODER', 75, 271, 25, 'encoder', { face: 0.76 }),
        c('VOLUME', 'VOLUME', 129, 240.5, 45, 16, 'button', { sub: 'Velocity' }),
        c('SWING', 'SWING', 129, 262.5, 45, 16, 'button', { sub: 'Position' }),
        c('TEMPO', 'TEMPO', 129, 284.5, 45, 16, 'button', { sub: 'Tune' }),
        c('NOTE REPEAT', 'NOTE REPEAT', 180.5, 240.5, 45, 38, 'button', { sub: 'Arp' }),
        c('LOCK', 'LOCK', 180.5, 284.5, 45, 16, 'button', { sub: 'Ext Lock' }),
        c('PITCH', 'PITCH', 26.5, 320.5, 45, 16.5),
        c('MOD', 'MOD', 77.5, 320.5, 45, 16.5),
        c('PERFORM', 'PERFORM', 129, 320.5, 45, 16.5, 'button', { sub: 'FX Select' }),
        c('NOTES', 'NOTES', 180.5, 320.5, 45, 16.5),
        c('STRIP', 'TOUCH STRIP', 29, 351.5, 195, 24, 'strip'),
        c('RESTART', 'RESTART', 26.5, 478.5, 45, 16, 'button', { sub: 'Loop' }),
        c('ERASE', 'ERASE', 77.5, 478.5, 45, 16, 'button', { sub: 'Replace' }),
        c('TAP', 'TAP', 129, 478.5, 45, 16, 'button', { sub: 'Metro' }),
        c('FOLLOW', 'FOLLOW', 180.5, 478.5, 45, 16, 'button', { sub: 'Grid' }),
        c('PLAY', 'PLAY', 26.5, 500.5, 45, 26.5, 'button', { tone: 'green', prefix: '▶' }),
        c('REC', 'REC', 77.5, 500.5, 45, 26.5, 'button', { tone: 'red', prefix: '●', sub: 'Count In' }),
        c('STOP', 'STOP', 129, 500.5, 45, 26.5, 'button', { prefix: '■' }),
        c('SHIFT', 'SHIFT', 180.5, 500.5, 45, 26.5, 'button', { inverse: true }),
        c('FIXED VEL', 'FIXED VEL', 260.5, 240.5, 45, 16, 'button', { sub: '16 Vel' }),
        c('PAD MODE', 'PAD MODE', 318.5, 240.5, 60.5, 16),
        c('KEYBOARD', 'KEYBOARD', 384, 240.5, 60.5, 16),
        c('CHORDS', 'CHORDS', 449.5, 240.5, 61, 16),
        c('STEP', 'STEP', 515.5, 240.5, 61, 16)
      ].concat(display, knobs, groups, column,
        printedPads(c, [319.5, 385.5, 451.5, 517], [270.5, 336.5, 402.5, 468.25], 59.5, 59))
    };
  })()
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
