// Hardware layouts, drawn by manual.js. Units: SVG user units; a layout's view box is width x height.
// Each control: [id, label, x, y, w, h, kind, options]. kind: button | pad | encoder | strip | screen | knob
// options (optional): sub (the grey SHIFT label printed under the label), bracket (sub printed in
// square brackets, like [Velocity]), tone ('green' | 'red'),
// prefix (a printed symbol before the label), icon ('maschine' | 'star' | 'search' | 'left' |
// 'right'), inverse (label printed in a white box, like SHIFT), letter (a pad's group letter),
// light (a plain light cap, like the MK3's display buttons), lit (the colour a button is always
// lit in, dimly; brighter with litBright, and full when selected), face (knob / encoder: radius of the matte top as a share of the radius; default 0.84),
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

// The sample Live set behind every lit state in the drawing: the MK3's group buttons, the pad
// demos (padDemos()) and the sample screen content all use these names and colours. The 8 tracks
// take every second MASCHINE sound colour. Track 1 is the selected track, track 2 is armed.
var SAMPLE_TRACKS = [
  { name: '1-Drums', color: PAD_COLORS[0] },   // Orange
  { name: '2-Bass', color: PAD_COLORS[2] },    // Warm Yellow
  { name: '3-Keys', color: PAD_COLORS[4] },    // Lime
  { name: '4-Lead', color: PAD_COLORS[6] },    // Mint
  { name: '5-Vox', color: PAD_COLORS[8] },     // Turquoise
  { name: '6-Pad', color: PAD_COLORS[10] },    // Plum
  { name: '7-FX', color: PAD_COLORS[12] },     // Purple
  { name: '8-Perc', color: PAD_COLORS[14] }    // Fuchsia
];
var SAMPLE_RETURNS = [{ name: 'A-Reverb', color: '#7f93b8' }, { name: 'B-Delay', color: '#1fb3a4' }];
var SAMPLE_MASTER = { name: 'Master', color: '#ebebeb' };
var SAMPLE_SELECTED = 0;  // index into SAMPLE_TRACKS
var SAMPLE_ARMED = 1;
var SAMPLE_SCENE_COLOR = PAD_COLORS[5];  // Green
// The Drum Rack on 1-Drums, in pad order (pad 1 first). manual.js colours each pad by the drum
// name colour table in features.json (first matching rule), like the script's name colours.
var SAMPLE_DRUMS = ['Kick', 'Snare', 'Closed Hat', 'Open Hat', 'Clap', 'Rim', 'Low Tom', 'High Tom',
  'Crash', 'Ride', 'Shaker', 'Cowbell', 'Perc 1', 'Perc 2', 'FX', 'Bass'];

// The short name of a sample track ('1-Drums' -> 'Drums').
function shortName(track) { return track.name.replace(/^\d+-/, ''); }

// a and b mixed: t = 0 gives a, t = 1 gives b (both '#rrggbb').
function mixHex(a, b, t) {
  var out = '#';
  for (var i = 1; i < 7; i += 2) {
    var v = Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t);
    out += (v < 16 ? '0' : '') + v.toString(16);
  }
  return out;
}

// Pad number (1-16) of a list position: lists read like text, position 0 = pad 13 (top left),
// position 3 = pad 16, position 4 = pad 9, ... position 15 = pad 4 (bottom right).
function listPad(position) { return (3 - Math.floor(position / 4)) * 4 + position % 4 + 1; }

// Buttons that show the track view on the pads while held, so a pad acts on a track (the
// MIKRO's SELECT is its arm modifier; the MK3's SELECT is its track mode). In the modes in
// TRACK_VIEW_KEEPS (drum mode) they act on that mode's pads instead and the pads stay as they are.
var TRACK_VIEW_MODIFIERS = ['STOP', 'SOLO', 'MUTE', 'SELECT'];
var TRACK_VIEW_KEEPS = ['PAD MODE'];

// What the pads show in each mode, as the script lights them, for the sample set above. Per mode
// (keyed by the control id of the mode button): 16 entries in pad order (index 0 = pad 1), each
// null (unlit) or { color, level, drum }. level: 'dim' | 'mid' | 'bright' (the script's DIM,
// BRIGHT and BRIGHT_PLUS). drum: a drum pad name; manual.js replaces color (the track colour,
// kept for names no rule matches) with that name's colour. trackMode: the id of the button that
// shows tracks on the pads on this unit (MIKRO: GROUP, MK3: SELECT).
function padDemos(trackMode) {
  function pads() { var out = []; for (var i = 0; i < 16; i++) out.push(null); return out; }
  function lit(color, level, drum) { return { color: color, level: level, drum: drum || null }; }
  var drums = SAMPLE_TRACKS[0].color, keys = SAMPLE_TRACKS[2].color;
  var demos = {};

  // PATTERN: 4 tracks x 4 scenes (scene 1 on the top row). P = playing clip, c = stopped clip,
  // . = empty slot (dim red on the armed track: pressing it records a new clip).
  var clipRows = ['Pcc.', 'c.Pc', 'cc..', '...c'];
  demos.PATTERN = pads();
  clipRows.forEach(function (row, scene) {
    row.split('').forEach(function (slot, track) {
      var pad = (3 - scene) * 4 + track;
      var color = SAMPLE_TRACKS[track].color;
      if (slot === 'P') demos.PATTERN[pad] = lit(color, 'bright');
      else if (slot === 'c') demos.PATTERN[pad] = lit(color, 'dim');
      else if (track === SAMPLE_ARMED) demos.PATTERN[pad] = lit(PAD_COLORS[15], 'dim');
    });
  });

  // SCENE: scenes 1-4 in list order, scene 1 playing; unlit pads create a scene.
  demos.SCENE = pads();
  for (var s = 0; s < 4; s++) demos.SCENE[listPad(s) - 1] = lit(SAMPLE_SCENE_COLOR, s === 0 ? 'bright' : 'dim');

  // Track mode: tracks in list order, empty pads create a track, the returns and the Master on
  // the last pads (2, 3 and 4). Colours as the script picks them: a muted track, or one silenced
  // by another track's solo, white dim; the selected track its colour at full brightness; an
  // armed or soloed track 'mid'; the rest dim. The Master is never muted. muted / soloed: indices
  // into SAMPLE_TRACKS. Returns stay audible under a solo (Live's Solo in Place, the default).
  function trackView(muted, soloed) {
    var view = pads();
    SAMPLE_TRACKS.forEach(function (track, i) {
      var silenced = muted.indexOf(i) >= 0 || (soloed.length > 0 && soloed.indexOf(i) < 0);
      var level = i === SAMPLE_SELECTED ? 'bright' : i === SAMPLE_ARMED || soloed.indexOf(i) >= 0 ? 'mid' : 'dim';
      view[listPad(i) - 1] = silenced ? lit(SAMPLE_MASTER.color, 'dim') : lit(track.color, level);
    });
    SAMPLE_RETURNS.concat([SAMPLE_MASTER]).forEach(function (track, i) {
      view[listPad(16 - SAMPLE_RETURNS.length - 1 + i) - 1] = lit(track.color, 'dim');
    });
    return view;
  }
  demos[trackMode] = trackView([], []);
  // While held, these show the track view and their pads act on tracks (TRACK_VIEW_MODIFIERS);
  // the sample states: track 1 soloed, track 3 muted. STOP and the MIKRO's SELECT (its arm
  // modifier; track 2 is armed) show the plain view.
  var held = { SOLO: trackView([], [SAMPLE_SELECTED]), MUTE: trackView([2], []), STOP: demos[trackMode], SELECT: demos[trackMode] };
  TRACK_VIEW_MODIFIERS.forEach(function (id) { if (id !== trackMode) demos[id] = held[id]; });

  // PAD MODE: the Drum Rack, the focused drum (pad 1) bright.
  demos['PAD MODE'] = SAMPLE_DRUMS.map(function (name, i) { return lit(drums, i === 0 ? 'bright' : 'dim', name); });

  // KEYBOARD and CHORDS: C major from the bottom left; 7 notes a scale, so pads 1, 8 and 15 are C.
  demos.KEYBOARD = pads().map(function (_, i) { return lit(keys, i % 7 === 0 ? 'bright' : 'dim'); });
  demos.CHORDS = demos.KEYBOARD.slice();

  // STEP: 16 steps in list order. Notes in the track colour, beat markers (steps 1, 5, 9, 13)
  // dim where empty, the playhead white.
  var notes = [1, 5, 8, 11, 13], playhead = 6;
  demos.STEP = pads();
  for (var step = 1; step <= 16; step++) {
    var entry = null;
    if (step === playhead) entry = lit(SAMPLE_MASTER.color, 'bright');
    else if (notes.indexOf(step) >= 0) entry = lit(drums, 'mid');
    else if (step % 4 === 1) entry = lit(drums, 'dim');
    demos.STEP[listPad(step - 1) - 1] = entry;
  }

  // VOLUME: meters of tracks 1-4, bottom to top. The three lower pads follow the level (d: dim
  // at half, m: passed); the top pad is the loud end: a lighter shade near 0 dB, red on a clip.
  var meters = [['mmd', ''], ['mmm', 'hot'], ['mmm', 'clip'], ['m..', '']];
  demos.VOLUME = pads();
  meters.forEach(function (meter, column) {
    var color = SAMPLE_TRACKS[column].color;
    meter[0].split('').forEach(function (segment, row) {
      if (segment !== '.') demos.VOLUME[row * 4 + column] = lit(color, segment === 'd' ? 'dim' : 'mid');
    });
    if (meter[1] === 'hot') demos.VOLUME[12 + column] = lit(mixHex(color, '#ffffff', 0.55), 'bright');
    if (meter[1] === 'clip') demos.VOLUME[12 + column] = lit(PAD_COLORS[15], 'bright');
  });

  // EVENTS: the drum pads that have notes in the focused clip, in their own colours; the
  // selected ones (Kick) brightest.
  var withNotes = 3;
  demos.EVENTS = SAMPLE_DRUMS.map(function (name, i) {
    return i < withNotes ? lit(drums, i === 0 ? 'bright' : 'mid', name) : null;
  });
  return demos;
}

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
      screen: ['Clips 1-4', 'Scene 1  ' + SAMPLE_TRACKS.slice(0, 2).map(shortName).join(' ')],
      // What the OLED shows when a control is selected or a combo with it is hovered (sample
      // content in the style of the script's screens; 2 lines: big + small, 3 lines: all small).
      screens: {
        'PLUG-IN': [SAMPLE_TRACKS[1].name, 'Auto Filter  Filter', 'Frequency   2.40 kHz'],
        'TEMPO': ['Tempo', '120.00 BPM'],
        'SWING': ['Swing', '25 %'],
        'VOLUME': ['Meters 1-4', SAMPLE_TRACKS.slice(0, 4).map(shortName).join(' ')],
        'PAD MODE': ['808 Kit', SAMPLE_DRUMS[0]],
        'KEYBOARD': ['Keyboard', 'C Major  C3'],
        'CHORDS': ['Chords', 'Triad  C Major'],
        'STEP': ['Step ' + SAMPLE_DRUMS[0], 'Page 1  1/16'],
        'SCENE': ['Scenes', '1 - 4 of 4'],
        'PATTERN': ['Clips 1-4', 'Scene 1  ' + SAMPLE_TRACKS.slice(0, 2).map(shortName).join(' ')],
        'NOTE REPEAT': ['Repeat', '1/16'],
        'FIXED VEL': ['Fixed Vel', 'Velocity 127'],
        'EVENTS': ['Events', 'Drum Loop'],
        'GROUP': ['Tracks', '1 - ' + SAMPLE_TRACKS.length + ' of ' + SAMPLE_TRACKS.length],
        'LOCK': ['Locked', SAMPLE_TRACKS[1].name + '  Auto Filter'],
        'MASCHINE': ['MASCHINE for Live', '2.0.0  by Elton47', 'Live 12.4.6'],
        'STAR': ['Browser', 'Drums  808 Kit'],
        'BROWSER': ['Browser', 'Drums  808 Kit']
      },
      stripDots: dots,
      padDemos: padDemos('GROUP'),
      controls: [
        c('MASCHINE', 'MASCHINE', 33.75, 164, 17.5, 14, 'button', { icon: 'maschine' }),
        c('STAR', '★', 33.75, 185, 17.5, 14.5, 'button', { icon: 'star' }),
        c('BROWSER', 'BROWSER', 33.75, 206, 17.5, 14.5, 'button', { icon: 'search' }),
        c('SCREEN', 'SCREEN', 67.5, 164, 50.5, 15, 'screen'),
        c('ENCODER', 'ENCODER', 72.5, 183.75, 40, 40, 'encoder'),
        c('VOLUME', 'VOLUME', 133.75, 163.5, 43.25, 15.5, 'button', { sub: 'Velocity', bracket: true }),
        c('PLUG-IN', 'PLUG-IN', 183.75, 163.5, 43.25, 15.5, 'button', { sub: 'Macro' }),
        c('SWING', 'SWING', 133.75, 185, 43.25, 14.5, 'button', { sub: 'Position', bracket: true }),
        c('SAMPLING', 'SAMPLING', 183.75, 185, 43.25, 14.5),
        c('TEMPO', 'TEMPO', 133.75, 206, 43.25, 15, 'button', { sub: 'Tune', bracket: true }),
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
      knobs.push(round('KNOB ' + (i + 1), String(i + 1), 181 + i * 51, 208, 15.5, 'knob', { face: 0.8 }));
    }
    // Group buttons: the printed letter. The script lights them in the colours of the 8 tracks
    // in view (they select those tracks), the selected track brighter.
    var groups = 'ABCDEFGH'.split('').map(function (letter, i) {
      return c('GROUP ' + letter, letter, [26.5, 77.5, 129, 180.5][i % 4], i < 4 ? 398.5 : 431.5, 45, 26.5, 'button',
        { lit: SAMPLE_TRACKS[i].color, litBright: i === SAMPLE_SELECTED });
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
    var tracks = SAMPLE_TRACKS.map(function (t) { return [t.name, t.color]; });
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
    var firstFour = SAMPLE_TRACKS.slice(0, 4).map(shortName).join('  ');
    var clips = {
      left: { title: tracks[0][0], sub: 'Clips', center: 'Clips 1-4', small: 'Scene 1  ' + firstFour, accent: tracks[0][1], knobs: volumeKnobs(0) },
      right: { title: 'Volume', sub: 'Mixer', knobs: volumeKnobs(4) }
    };
    var plugin = {
      left: { title: 'Auto Filter', sub: tracks[1][0], accent: tracks[1][1], knobs: [
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
      'VOLUME': { left: side(tracks[0][0], 'Meters', 'Meters 1-4', firstFour) },
      'PAD MODE': {
        left: side(tracks[0][0], 'Drums', '808 Kit', 'Pad 1  ' + SAMPLE_DRUMS[0]),
        // list entries [name, colour, drum name]: manual.js colours a drum by its name colour
        right: { title: 'Drum Rack', sub: '808 Kit', selected: 0, list: SAMPLE_DRUMS.slice(0, 6).map(function (name) {
          return [name, tracks[0][1], name];
        }) }
      },
      'KEYBOARD': { left: side(tracks[2][0], 'Keyboard', 'C Major', 'Octave C3', tracks[2][1]) },
      'CHORDS': { left: side(tracks[2][0], 'Chords', 'Triad', 'C Major  Close', tracks[2][1]) },
      'STEP': { left: side(tracks[0][0], 'Step', SAMPLE_DRUMS[0], 'Page 1  1/16') },
      'SCENE': { left: side(tracks[0][0], 'Scenes', 'Scenes 1-4', 'Scene 1 playing', SAMPLE_SCENE_COLOR) },
      'SELECT': { left: side(tracks[0][0], 'Tracks', 'Tracks 1-8', '2 returns and the Master') },
      'NOTE REPEAT': { left: side('1-Drums', 'Note Repeat', '1/16', 'Rate') },
      'FIXED VEL': { left: side('1-Drums', 'Fixed Velocity', '100', 'Velocity') },
      'EVENTS': { left: side(tracks[0][0], 'Events', 'Drum Loop', SAMPLE_DRUMS[0] + ' selected') },
      'LOCK': { left: side(tracks[1][0], 'Locked', 'Auto Filter', 'Device lock', tracks[1][1]) },
      'ARRANGER': { left: side(tracks[0][0], 'View', 'Arrangement', 'Session / Arrangement') },
      'BROWSER': {
        left: { title: 'Browser', sub: 'Drums', selected: 0, accent: '#8f8f96',
          list: [['808 Kit'], ['909 Kit'], ['Boom Kit'], ['Dub Kit'], ['Lo-Fi Kit']] }
      },
      'GROUP A-H': { left: side(tracks[0][0], 'Tracks', 'Tracks 1-8', 'Group buttons select') }
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
      padDemos: padDemos('SELECT'),
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
        round('ENCODER', 'ENCODER', 75, 271, 25, 'encoder'),
        c('VOLUME', 'VOLUME', 129, 240.5, 45, 16, 'button', { sub: 'Velocity', bracket: true }),
        c('SWING', 'SWING', 129, 262.5, 45, 16, 'button', { sub: 'Position', bracket: true }),
        c('TEMPO', 'TEMPO', 129, 284.5, 45, 16, 'button', { sub: 'Tune', bracket: true }),
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
