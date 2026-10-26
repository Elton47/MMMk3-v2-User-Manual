// The choreography of the Tour's cards (js/highlights.js, js/tour.js): what the controller does
// while a step is shown. HIGHLIGHT_SHOWS: the Highlights card's, keyed by the item's combo in
// data/features.json, its tokens joined with '+' ('SHIFT', 'VARIATION+PAD'). TOUR_SHOWS (at the
// end): the other cards', per section id, either { 'COMBO' or 'COMBO (context)': show } (some
// reuse a highlight's) or a function(step, device) that returns a show or null. A step without a
// show still plays (genericShow() in js/highlights.js): its combo is pressed in order, and the
// screen and the pads show what the manual shows for it on hover (the manual's `sectionScreens`,
// `screens` and `padDemos` in layouts.js).
//
// Each entry (all fields optional):
//   every     ms per tick (default 500)
//   duration  ms the step stays (default 6500)
//   glow      combo tokens to outline (default: the item's combo); the first one is the control
//             the callout points at
//   loupe     (no longer read: the Tour always shows the MIKRO's screen magnified in the callout)
//   tick(n, api)  draws tick n (0, 1, 2 ...). It draws the whole state for n, so a tick can be
//             skipped or repeated: no state is kept between ticks.
// api: device ('mikro' | 'mk3'), layout (LAYOUTS[device]), calm (the visitor prefers reduced
// motion: no flashing, slower changes), blank() (16 unlit pads), lit(color, level, drum) (a pad:
// level 'dim' | 'mid' | 'bright'), demo(token) (a copy of the layout's pad demo), pads(list) (16
// entries in pad order, pad 1 first; listPad() turns a reading position into a pad number),
// screen(oled, lcd) (a screen state on the MIKRO, made with the screen helpers in layouts.js:
// trackScreen, pluginScreen, modeScreen, popupScreen, browserScreen ...; on the MK3 lcd: its two
// screens { left, right } (the layout's pictures, layouts.js); without lcd the MK3's screens stay), screenOf(token) (the layout's sample screen), light(ids)
// (exactly these buttons are lit), turn(steps) (the encoder has turned this many detents),
// strip(fill, color, flash, centre) (the touch strip's LED dots as a progress bar: fill 0-1 in color,
// or red while flash; centre: from the middle LED, as Pan / PITCH; null clears it; the strip surface
// stays unlit), outline(tokens) (change the outlined controls), show(lines) (a screen as the
// layout keeps it: a MIKRO state, or { left, right } on the MK3).
// The sample Live set (SAMPLE_TRACKS, SAMPLE_DRUMS, PAD_COLORS ...) comes from layouts.js.

var HIGHLIGHT_SHOWS = (function () {
  'use strict';

  var RED = PAD_COLORS[15];
  var WHITE = SAMPLE_MASTER.color;
  var drums = SAMPLE_TRACKS[0], bass = SAMPLE_TRACKS[1], keys = SAMPLE_TRACKS[2];

  // The MK3's two screens for a mode: the pictures the layout keeps (rendered by the bridge's MK3
  // renderer, see drawLcd() in manual.js); undefined on the MIKRO (its screen is the state). An
  // animated pair plays by itself unless the show picks its frame: mk3(api, token, k).
  function mk3(api, token, k) {
    var pair = (api.layout.screens || {})[token];
    return typeof k === 'number' ? lcdFrame(pair, k) : pair;
  }

  // Live's tempo, swing and a device parameter, as the encoder changes them.
  var TURNS = [
    ['TEMPO', 120], ['TEMPO', 121], ['TEMPO', 122], ['TEMPO', 123],
    ['SWING', 10], ['SWING', 15], ['SWING', 20],
    ['PLUG-IN', 2.4], ['PLUG-IN', 2.9], ['PLUG-IN', 3.6]
  ];

  // I, V, vi, IV in C major. The pads are the scale from the bottom left (pad 1 = C), and a chord
  // pad's notes are the pads two and four above it: the chord's pad lights bright, its notes soft.
  var CHORDS = [
    { pad: 1, name: 'C Major', degree: 'I' }, { pad: 5, name: 'G Major', degree: 'V' },
    { pad: 6, name: 'A Minor', degree: 'VI' }, { pad: 4, name: 'F Major', degree: 'IV' }
  ];

  var STEP_NOTES = [1, 5, 8, 11, 13];  // the kick pattern of the manual's STEP demo

  // The MK3's browser (MASCHINE's, on both screens): BROWSER opens it, the 4-D turns down the
  // categories to Drums, PUSH opens it, two turns onto a kit (its preview plays); PUSH loads it, the
  // browser closes and the pads light with the kit. The frames as the export renders them
  // (anim/browser: frame 0 open, 1-3 turns, 4 the push, 5-6 turns).
  var MK3_BROWSER = [
    // [frame, lit buttons, encoder detents]
    [0, ['BROWSER'], 0], [1, ['BROWSER'], 1], [2, ['BROWSER'], 2], [3, ['BROWSER'], 3],
    [4, ['BROWSER', 'ENCODER'], 3], [5, ['BROWSER'], 4], [6, ['BROWSER'], 5], [6, ['BROWSER', 'ENCODER'], 5]
  ];
  function mk3Browser(n, api) {
    var last = Math.min(n, MK3_BROWSER.length), step = MK3_BROWSER[Math.min(last, MK3_BROWSER.length - 1)];
    var loaded = n >= MK3_BROWSER.length;
    api.outline(['BROWSER']);
    api.turn(step[2]);
    api.light(loaded ? [] : step[1]);
    api.screen(null, loaded ? mk3(api, 'PAD MODE') : mk3(api, 'BROWSER', step[0]));
    api.pads(loaded ? api.demo('PAD MODE') : api.blank());
  }

  // The MIKRO's screens below are what the script shows (the screen helpers in layouts.js).
  var CHORDS_SCREEN = trackScreen(2, 'Triad Close  C Major', 'Chord', 'Triad', 'C Major');

  return {
    // A real SHIFT key, and Live's colours on the pads: a wave through MASCHINE's 16 sound
    // colours, then the clip grid and the Drum Rack in the sample set's colours.
    'SHIFT': {
      every: 120,
      tick: function (n, api) {
        var t = n * 120;
        if (t < 2600) {
          var front = Math.floor(t / 120), pads = api.blank();
          for (var i = 0; i < 16 && i <= front; i++) {
            pads[listPad(i) - 1] = api.lit(PAD_COLORS[i], front >= 16 || i === front ? 'bright' : 'mid');
          }
          api.pads(pads);
          api.screen(api.layout.screen, api.layout.screen);  // the start screen: the drums
        } else if (t < 4600) {
          api.pads(api.demo('PATTERN'));
          api.screenOf('PATTERN');
        } else {
          api.pads(api.demo('PAD MODE'));
          api.screenOf('PAD MODE');
        }
      }
    },

    // The screen follows what the encoder changes: tempo, swing, then a device parameter.
    'TURN': {
      every: 650,
      loupe: true,
      tick: function (n, api) {
        var turn = TURNS[n % TURNS.length], value = turn[1];
        api.turn(n);
        api.light([turn[0]]);
        // the MK3's frames are these values (tools/export_manual_screens.py: 120-123 BPM, 10-20 %,
        // 2.40-3.60 kHz)
        var k = TURNS.slice(0, n % TURNS.length + 1).filter(function (t) { return t[0] === turn[0]; }).length - 1;
        if (turn[0] === 'TEMPO') {
          api.screen(popupScreen('Tempo', value.toFixed(2) + ' BPM'), mk3(api, 'TEMPO', k));
        } else if (turn[0] === 'SWING') {
          api.screen(popupScreen('Swing', value + ' %'), mk3(api, 'SWING', k));
        } else {
          api.screen(frequencyScreen(value), mk3(api, 'PLUG-IN', k));
        }
      }
    },

    // A chord on every pad: I, V, vi, IV, each pressed for a moment.
    'CHORDS': {
      every: 400,
      loupe: true,
      tick: function (n, api) {
        var chord = CHORDS[Math.floor(n / 4) % CHORDS.length], pressed = n % 4 !== 3;
        var pads = api.blank().map(function () { return api.lit(keys.color, 'dim'); });
        if (pressed) {
          pads[chord.pad - 1] = api.lit(keys.color, 'bright');
          pads[chord.pad + 1] = api.lit(keys.color, 'mid');
          pads[chord.pad + 3] = api.lit(keys.color, 'mid');
        }
        api.pads(pads);
        api.screen(CHORDS_SCREEN, mk3(api, 'CHORDS'));
      }
    },

    // Note repeat on the Drum Rack: the closed hat in 1/16 with accents (pressure gives the
    // velocity), then a snare roll in 1/32.
    'NOTE REPEAT': {
      every: 1000 / 32,
      loupe: true,
      duration: 7000,
      tick: function (n, api) {
        var t = n * 1000 / 32;
        var pads = api.demo('PAD MODE').map(function (entry) { return entry && api.lit(entry.color, 'dim', entry.drum); });
        var pad = null, period = 0, rate = '1/16';
        if (t >= 400 && t < 3400) { pad = 3; period = 125; }
        else if (t >= 3900 && t < 6600) { pad = 2; period = 62.5; rate = '1/32'; }
        else if (t >= 3400) rate = '1/32';
        if (pad) {
          var note = Math.floor((t - 400) / period), on = api.calm || (t % period) < period / 2;
          var level = !on ? 'dim' : period > 100 && note % 4 !== 0 ? 'mid' : 'bright';
          pads[pad - 1] = api.lit(drums.color, level, SAMPLE_DRUMS[pad - 1]);
        }
        api.pads(pads);
        // the screen: the pad last hit (hitting a pad selects it), and the new rate popping up
        // for a moment (NOTIFY_DURATION in the script: 1.2 s)
        var hit = t < 400 ? 1 : t < 3900 ? 3 : 2;
        var oled = t >= 3400 && t < 4600 ? popupScreen('Note repeat', rate)
          : trackScreen(0, SAMPLE_KIT, SAMPLE_DRUMS[hit - 1], noteName(35 + hit), SAMPLE_KIT);
        // the MK3: the clip plays behind the repeat's page, its playhead an 1/8 a frame
        api.screen(oled, mk3(api, 'NOTE REPEAT', Math.floor(t / 250)));
      }
    },

    // Steps go in one by one, then the pattern plays with the white playhead running across the
    // pads in reading order (pad 13 is step 1).
    'STEP': {
      every: 125,
      tick: function (n, api) {
        var entered = Math.min(STEP_NOTES.length, Math.floor(n / 2) + 1);
        var playing = n >= 10, playhead = 0;
        if (playing) playhead = (api.calm ? Math.floor((n - 10) / 4) : n - 10) % 16 + 1;
        var pads = api.blank();
        for (var step = 1; step <= 16; step++) {
          var index = STEP_NOTES.indexOf(step), entry = null;
          if (step === playhead) entry = api.lit(WHITE, 'bright');
          else if (index >= 0 && index < entered) entry = api.lit(drums.color, !playing && index === entered - 1 && n % 2 === 0 ? 'bright' : 'mid');
          else if (step % 4 === 1) entry = api.lit(drums.color, 'dim');
          pads[listPad(step - 1) - 1] = entry;
        }
        api.pads(pads);
        api.light(playing ? ['PLAY'] : []);
        // the MK3's screens: the page as it is, then its playhead with the pads' (frame k: step k + 1)
        var page = mk3(api, 'STEP');
        if (page && page.anim) api.screen(null, playing ? lcdFrame(page, playhead - 1) : page.still);
        else api.screenOf('STEP');
      }
    },

    // Live's browser on the MIKRO's screen: BROWSER opens it (lit while open), scroll to Drums, open
    // it, scroll to a kit and load it (the browser closes); the pads light up with the kit. Then
    // STAR: the browser straight on Favorites (STAR lit).
    'BROWSER': {
      every: 700,
      loupe: true,
      duration: 8500,
      tick: function (n, api) {
        if (api.device === 'mk3') return mk3Browser(n, api);
        var drums = SAMPLE_BROWSER.indexOf('Drums');  // 4: after Favorites, Collections, MASCHINE Kits, Sounds
        var frame = Math.min(n, drums + 6), pushed = n === drums + 1 || n === drums + 4;
        var star = frame >= drums + 6;
        api.outline(star ? ['STAR'] : ['BROWSER']);
        api.turn(frame <= drums ? frame : frame < drums + 4 ? frame - 1 : drums + 2);
        api.light(star ? ['STAR'] : frame < drums + 4 ? (pushed ? ['BROWSER', 'ENCODER'] : ['BROWSER']) : pushed ? ['ENCODER'] : []);
        // Live's categories are folders; in Drums only Drum Hits is (the kits load)
        if (frame <= drums) api.screen(browserScreen('Browser', SAMPLE_BROWSER, frame, function () { return true; }), mk3(api, 'BROWSER'));
        else if (frame < drums + 4) api.screen(browserScreen('Drums', SAMPLE_BROWSER_DRUMS, frame - drums - 1, function (i) { return i === 0; }), mk3(api, 'BROWSER'));
        else if (!star) api.screen(popupScreen('Loaded', SAMPLE_KIT), mk3(api, 'PAD MODE'));
        else api.screen(favoritesScreen(0), mk3(api, 'BROWSER'));
        api.pads(frame < drums + 4 ? api.blank() : api.demo('PAD MODE'));
      }
    },

    // MASCHINE Kits: BROWSER, open MASCHINE Kits (Favorites first), turn to an Expansion and open
    // it: its kits, a favourite (starred in MASCHINE) with a star. Turning onto a kit previews it;
    // PUSH loads it as the selected MIDI track's Drum Rack (or a new track's), the pads in the drum
    // colours.
    'PUSH': {
      every: 750,
      loupe: true,
      duration: 8000,
      glow: ['PUSH', 'BROWSER'],  // the callout on PUSH, the page's own control
      tick: function (n, api) {
        var kits = SAMPLE_BROWSER.indexOf('MASCHINE Kits');
        var folders = function () { return true; };
        var steps = [
          // [screen, lit buttons, encoder detents, outlined]
          [browserScreen('Browser', SAMPLE_BROWSER, 0, folders), [], 0],
          [browserScreen('Browser', SAMPLE_BROWSER, kits, folders), [], kits],
          [browserScreen('MASCHINE Kits', SAMPLE_EXPANSIONS, 0, folders), ['ENCODER'], kits],
          [browserScreen('MASCHINE Kits', SAMPLE_EXPANSIONS, 1, folders), [], kits + 1],
          [kitsScreen(0, [0]), ['ENCODER'], kits + 1],
          [kitsScreen(1, [0]), [], kits + 2],
          [popupScreen('Loaded', SAMPLE_EXPANSION.kits[1]), ['ENCODER'], kits + 2]
        ];
        var last = Math.min(n, steps.length - 1), step = steps[last];
        api.outline(step[3] || ['BROWSER', 'PUSH']);  // first: a new outline clears the turn arrow
        api.screen(step[0], mk3(api, last < steps.length - 1 ? 'BROWSER' : 'PAD MODE'));
        // BROWSER is lit while the browser is open; the load closes it
        api.light(last < steps.length - 1 ? step[1].concat(['BROWSER']) : step[1]);
        api.turn(step[2]);
        api.pads(n < steps.length - 1 ? api.blank() : api.demo('PAD MODE'));
      }
    },

    // VARIATION held: the clip grid, the first free slot below each clip red. A red pad records a
    // copy of the clip above it: Bass_1, recording while the original stays as it was.
    'VARIATION+PAD': {
      every: 500,
      loupe: true,
      duration: 7000,
      glow: ['VARIATION', 'PAD'],
      tick: function (n, api) {
        var grid = api.demo('PATTERN'), pads = api.blank();
        var clip = function (entry) { return !!entry && entry.color !== RED; };
        var target = 9;  // pad 10: below 2-Bass's clip in scene 1
        for (var track = 0; track < 4; track++) {
          for (var scene = 0; scene < 4; scene++) {
            var pad = (3 - scene) * 4 + track;
            if (!clip(grid[pad])) continue;
            pads[pad] = grid[pad];
            if (n >= 4) continue;
            for (var below = scene + 1; below < 4; below++) {
              var free = (3 - below) * 4 + track;
              if (!clip(grid[free])) { pads[free] = api.lit(RED, 'bright'); break; }
            }
          }
        }
        if (n >= 4) {
          // the copy plays and records; the original stops
          pads[target + 4] = api.lit(bass.color, 'dim');
          pads[target] = api.lit(bass.color, api.calm || n % 2 === 0 ? 'bright' : 'mid');
          api.outline(['VARIATION', 'PAD 10']);
          api.light(['REC']);
          api.screen(n < 6 ? popupScreen('Variation', 'Recording the copy') : api.layout.screens.PATTERN, mk3(api, 'PATTERN'));
        } else {
          api.outline(['VARIATION', 'PAD']);
          api.light([]);
          api.screen(n < 2 ? popupScreen('Variation', 'Red pad: record copy') : api.layout.screens.PATTERN, mk3(api, 'VARIATION'));
        }
        api.pads(pads);
      }
    },

    // The mixer (MIKRO): a VOLUME tap and the pads are the tracks, glowing with their levels
    // (2-Bass visited: white; 3-Keys muted: dim white). TURN raises 2-Bass's volume in 1 dB steps,
    // the strip slides it in 0.1 dB steps, PUSH + TURN picks Pan (its bar from the centre) and
    // turns it. The strip's LEDs show the parameter in the track's colour (Pan from the centre).
    'VOLUME': {
      every: 700,
      loupe: true,
      duration: 8400,
      tick: function (n, api) {
        var steps = [
          // [screen, outlined, lit buttons, encoder detents]
          [mixerScreen(MIXER_VISITED, 'Volume', -3), ['VOLUME', 'PAD'], ['VOLUME'], 0],
          [mixerScreen(MIXER_VISITED, 'Volume', -3), ['VOLUME', 'PAD'], [], 0],
          [mixerScreen(MIXER_VISITED, 'Volume', -2), ['VOLUME', 'ENCODER'], [], 1],
          [mixerScreen(MIXER_VISITED, 'Volume', -1), ['VOLUME', 'ENCODER'], [], 2],
          [mixerScreen(MIXER_VISITED, 'Volume', 0), ['VOLUME', 'ENCODER'], [], 3],
          [mixerScreen(MIXER_VISITED, 'Volume', -0.8), ['VOLUME', 'STRIP'], [], 3],
          [mixerScreen(MIXER_VISITED, 'Volume', -1.5), ['VOLUME', 'STRIP'], [], 3],
          [mixerScreen(MIXER_VISITED, 'Pan', -12), ['VOLUME', 'ENCODER'], ['ENCODER'], 4],
          [mixerScreen(MIXER_VISITED, 'Pan', -11), ['VOLUME', 'ENCODER'], ['ENCODER'], 5],
          [mixerScreen(MIXER_VISITED, 'Pan', -10), ['VOLUME', 'ENCODER'], ['ENCODER'], 6],
          [mixerScreen(MIXER_VISITED, 'Pan', -10), ['VOLUME', 'PAD'], [], 6]
        ];
        var step = steps[Math.min(n, steps.length - 1)], screen = step[0];
        api.outline(step[1]);
        api.light(step[2]);
        api.turn(step[3]);
        api.strip(screen.MIKRO_FILL / 126, SAMPLE_TRACKS[MIXER_VISITED].color, false, screen.MIKRO_FILL_CENTER === 1);
        api.pads(api.demo('VOLUME'));
        api.screen(screen, mk3(api, 'MIXER'));
      }
    },

    // The strip shows where the loop is: a 2-bar drum loop in its clip colour; then, recording
    // Bass_1, it flashes red on every beat: a silent metronome.
    'STRIP': {
      every: 1000 / 16,
      loupe: true,
      duration: 7000,
      tick: function (n, api) {
        var t = n * 1000 / 16, loop = 4000;
        var recording = t >= 3200, since = recording ? t - 3200 : t + 600;
        var beat = Math.floor(since / 500) % 4 + 1, bar = Math.floor(since / 2000) % 2 + 1;
        // red for the first half of every beat, like the controller
        var flash = recording && !api.calm && since % 500 < 250;
        api.strip((since % loop) / loop, recording ? bass.color : drums.color, flash);
        api.light(recording ? ['PLAY', 'REC'] : ['PLAY']);
        var position = 'Bar ' + bar + '  Beat ' + beat;
        // the MIKRO's screen stays on PATTERN
        api.screen(api.layout.screens.PATTERN, mk3(api, 'PATTERN', Math.floor((since % loop) / 250)));
        var grid = api.demo('PATTERN');
        if (recording) grid[9] = api.lit(bass.color, 'bright');
        api.pads(grid);
      }
    }
  };
})();

// The section cards' own choreographies (see the top of this file). The highlights that left the
// Highlights card play in their sections' cards.
var TOUR_SHOWS = (function () {
  'use strict';

  var S = HIGHLIGHT_SHOWS;
  // The MK3's two screens for a mode (as in HIGHLIGHT_SHOWS); undefined on the MIKRO.
  function mk3(api, token) { return (api.layout.screens || {})[token]; }

  // --- MASCHINE: the settings page (MIKRO) --------------------------------------------------
  // The page as the script shows it (settingsScreen() in layouts.js), the values from
  // features.json (an item's `values`: the default first, then as ▶ walks them; checked against
  // the script in its repository). A change shows at once in the row and on line 2; two settings
  // also pop up their new value for a moment (the script's notify, NOTIFY_DURATION 1.2 s).
  var NAMES = settingsRows().map(function (row) { return row.split('\t')[0]; });
  var POPUPS = {
    // Line 2 says what the curve does (the script's CURVE_HINTS); the row keeps the short value.
    'Velocity curve': function (value) {
      var hints = { Soft: 'Soft: more sensitive', Hard: 'Hard: less sensitive' };
      return popupScreen('Velocity curve', hints[value] || value);
    },
    'Drum colours': function (value) { return popupScreen('Pad colours', value === 'By name' ? 'By name' : 'By chain colour'); }
  };
  var EVERY = 600, PER_VALUE = 3;  // a press, the popup's 1.2 s, then a moment on the page

  function changed(name, value) { var out = {}; out[name] = value; return out; }

  // A setting: a moment on the row above, one detent onto it, then ▶ through its values.
  function valuesShow(name, values) {
    var at = NAMES.indexOf(name);
    if (at < 0) return null;
    var presses = values.length - 1;
    return {
      every: EVERY,
      duration: Math.max(5500, (2 + presses * PER_VALUE + 3) * EVERY),
      glow: ['SCREEN', '◀', '▶'],
      tick: function (n, api) {
        if (n >= 1 && at > 0) api.turn(1);
        var press = n < 2 || !presses ? 0 : Math.min(presses, Math.floor((n - 2) / PER_VALUE) + 1);
        var since = press ? n - 2 - (press - 1) * PER_VALUE : -1;
        api.light(since === 0 ? ['▶'] : []);
        if (press && since < 2 && POPUPS[name]) api.screen(POPUPS[name](values[press]), mk3(api, 'SETTINGS'));
        else if (n < 1 && at > 0) api.screen(settingsScreen(NAMES[at - 1]), mk3(api, 'SETTINGS'));
        else api.screen(settingsScreen(name, changed(name, values[press])), mk3(api, 'SETTINGS'));
      }
    };
  }

  // TURN: down the list and back up.
  var turnShow = {
    every: 650,
    tick: function (n, api) {
      var k = n % 8, row = k <= 4 ? k : 8 - k;
      api.turn(n);
      api.screen(settingsScreen(NAMES[row]), mk3(api, 'SETTINGS'));
    }
  };

  // ◀ ▶ on Record length: ▶ to 2 bars, ◀ back to the default.
  function arrowsShow(values) {
    var path = [0, 1, 2, 1, 0];
    return {
      every: 700,
      duration: 7000,
      tick: function (n, api) {
        var k = Math.min(path.length - 1, Math.floor((n + 1) / 2));
        var pressing = n % 2 === 1 && (n + 1) / 2 <= path.length - 1;
        api.light(pressing ? [path[k] > path[k - 1] ? '▶' : '◀'] : []);
        api.screen(settingsScreen('Record length', changed('Record length', values[path[k]])), mk3(api, 'SETTINGS'));
      }
    };
  }

  function settings(step) {
    var key = step.combo.join('+');
    if (step.context && step.values) return valuesShow(step.context, step.values);
    if (key === 'TURN') return turnShow;
    if (key === '◀+▶') {
      var lengths = step.section.items.filter(function (i) { return i.context === 'Record length'; })[0];
      return lengths && lengths.values && lengths.values.length >= 3 ? arrowsShow(lengths.values) : null;
    }
    return null;  // MASCHINE: the generic press, the page opens
  }

  // --- the MK3's showcases: the controller as the export ran it ------------------------------
  // An animation of the export (img/screens/mk3/anim/, layouts.js screens[token]) with its cues: per
  // step what the script lit and turned meanwhile (index.json `cues`: lit buttons, outlined
  // controls, the encoder's detents, the 16 pads as the script coloured them), so the drawing and
  // the screens come from the same run. The step's length and their number come from the index;
  // until it has loaded the screens show the mode's still and the controls stay as they are.
  var CUE_EVERY = 1000 / 32;
  // The script's hue (palette.HUE_RGB) as the manual draws that hue on a pad (PAD_COLORS, sampled
  // from the hardware): the nearest one.
  var padColors = {};
  function padColor(hex) {
    if (padColors[hex]) return padColors[hex];
    function rgb(c) { var n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
    var want = rgb(hex), best = hex, bestD = Infinity;
    PAD_COLORS.concat([SAMPLE_MASTER.color]).forEach(function (c) {
      var v = rgb(c), d = 0;
      for (var i = 0; i < 3; i++) d += (v[i] - want[i]) * (v[i] - want[i]);
      if (d < bestD) { bestD = d; best = c; }
    });
    return (padColors[hex] = best);
  }
  function cueShow(token, glow) {
    var pair = null, info = function () {
      var a = pair && pair.anim && MM.manual.lcdAnim ? MM.manual.lcdAnim(pair.anim) : null;
      var steps = a ? (a.cues && a.cues.length) || Math.max(1, Math.round(a.frames * a.every / a.step)) : 0;
      return { a: a, steps: steps };
    };
    var show = {
      every: CUE_EVERY,
      glow: glow,
      tick: function (n, api) {
        pair = (api.layout.screens || {})[token] || null;
        var i = info();
        if (!i.a) { api.screen(null, pair); return; }
        var k = Math.floor(n * CUE_EVERY / i.a.step) % i.steps, cue = i.a.cues ? i.a.cues[k] : null;
        api.screen(null, lcdFrame(pair, k));
        if (!cue) return;
        if (cue.lit) api.light(cue.lit);
        // the page's own controls stay outlined: a cue outlines only what the page is about (its pad,
        // its knob), never another control of the animation (PLUG-IN on a page about the pads)
        var own = (cue.glow || []).filter(function (id) {
          return glow.some(function (token) { return token === id || tokenMatches(token, id); });
        });
        if (own.length) api.outline(own);
        if (typeof cue.turn === 'number') api.turn(cue.turn);
        if (cue.pads) api.pads(cue.pads.map(function (p) { return p ? api.lit(padColor(p[0]), p[1]) : null; }));
      }
    };
    // the whole animation once, or about 7 s (read when the step starts: by then the index is in)
    Object.defineProperty(show, 'duration', { get: function () {
      if (!pair) pair = (LAYOUTS.mk3.screens || {})[token] || null;
      var i = info();
      return i.a ? Math.max(5000, Math.min(16000, i.steps * i.a.step)) : 7000;
    } });
    return show;
  }
  // A section's showcase on the MK3: every page plays it, outlining the page's own controls (its
  // combo; glow only for a page whose combo the drawing can't outline).
  function cueFor(token, glow) {
    var shows = {};
    return function (step, device) {
      if (device !== 'mk3') return null;
      var key = step.combo.join('+');
      return shows[key] || (shows[key] = cueShow(token, glow && !step.combo.length ? glow : step.combo));
    };
  }

  // The MIKRO has no picture of the slices: the pads play them in order (slice 1 on pad 1, the
  // track's colour, the playing slice bright), the screen stays.
  var slicesPads = {
    every: 250,
    duration: 6000,
    tick: function (n, api) {
      var hit = n % 16, pads = [];
      for (var i = 0; i < 16; i++) pads.push(api.lit(keys.color, i === hit ? 'bright' : 'dim'));
      api.light(['PAD MODE']);
      api.pads(pads);
    }
  };
  var keys = SAMPLE_TRACKS[2];

  return {
    'mixer-mk3': {},
    'plugin-mk3': function (step, device) {
      var token = { 'Simpler': 'SIMPLER', 'Simpler: Slicing': 'SLICING', 'EQ Eight': 'EQ EIGHT' }[step.context];
      return token ? cueFor(token, ['PLUG-IN'])(step, device) : null;
    },
    'drum-synths': cueFor('DRUM SYNTHS'),
    'slicing': function (step, device) {
      if (device === 'mk3') return cueFor('SLICING', ['PAD'])(step, device);
      return step.combo[0] === 'PAD MODE' || step.combo[0] === 'PAD' ? slicesPads : null;
    },
    'kits-mk3': cueFor('KITS', ['BROWSER']),
    'section-mk3': cueFor('SECTION'),
    clip: { 'STRIP': S.STRIP },
    events: { 'VARIATION+PAD': S['VARIATION+PAD'] },
    mixer: { 'VOLUME': S.VOLUME },
    browser: { 'BROWSER': S.BROWSER, 'PUSH (on a MASCHINE kit)': S.PUSH },
    'browser-mk3': function (step, device) {
      var key = step.combo.join('+');
      return key === 'BROWSER' || key === 'KNOB' ? cueFor('BROWSER TAGS', ['KNOB 2'])(step, device) : null;
    },
    playing: { 'NOTE REPEAT': S['NOTE REPEAT'] },
    chords: { 'PAD': S.CHORDS },
    step: { 'STEP': S.STEP },
    settings: settings
  };
})();
