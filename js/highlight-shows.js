// The choreography of the highlights tour (js/highlights.js): what the controller does while a
// highlight is shown. Keyed by the item's combo in data/features.json, its tokens joined with
// '+' ('SHIFT', 'VARIATION+PAD'). An item without an entry here still plays: its combo's
// controls glow, and the screen and the pads show that control's sample content (the manual's
// `screens` and `padDemos` in layouts.js).
//
// Each entry (all fields optional):
//   every     ms per tick (default 500)
//   duration  ms the highlight stays (default 6500)
//   glow      combo tokens to outline (default: the item's combo); the first one is the control
//             the callout points at
//   loupe     true: the callout also shows the MIKRO's screen, magnified
//   tick(n, api)  draws tick n (0, 1, 2 ...). It draws the whole state for n, so a tick can be
//             skipped or repeated: no state is kept between ticks.
// api: device ('mikro' | 'mk3'), layout (LAYOUTS[device]), calm (the visitor prefers reduced
// motion: no flashing, slower changes), blank() (16 unlit pads), lit(color, level, drum) (a pad:
// level 'dim' | 'mid' | 'bright'), demo(token) (a copy of the layout's pad demo), pads(list) (16
// entries in pad order, pad 1 first; listPad() turns a reading position into a pad number),
// screen(oled, lcd) (a screen state on the MIKRO, made with the screen helpers in layouts.js:
// trackScreen, pluginScreen, modeScreen, popupScreen, browserScreen ...; colour screens { left, right } on the
// MK3; without lcd the MK3 shows the state's text), screenOf(token) (the layout's sample screen), light(ids)
// (exactly these buttons are lit), turn(steps) (the encoder has turned this many detents),
// strip(fill, color, flash) (the touch strip's LED dots as a progress bar: fill 0-1 in color, or
// red while flash; null clears it; the strip surface stays unlit), outline(tokens) (change the outlined controls).
// The sample Live set (SAMPLE_TRACKS, SAMPLE_DRUMS, PAD_COLORS ...) comes from layouts.js.

var HIGHLIGHT_SHOWS = (function () {
  'use strict';

  var RED = PAD_COLORS[15];
  var WHITE = SAMPLE_MASTER.color;
  var drums = SAMPLE_TRACKS[0], bass = SAMPLE_TRACKS[1], keys = SAMPLE_TRACKS[2];

  // A colour screen side in the style of the script's MK3 screens (see drawLcd() in manual.js).
  function side(title, sub, center, small, accent) {
    return { left: { title: title, sub: sub, center: center, small: small, accent: accent || drums.color } };
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
        if (turn[0] === 'TEMPO') {
          api.screen(popupScreen('Tempo', value.toFixed(2) + ' BPM'), side('Tempo', 'Master', value.toFixed(2), 'BPM'));
        } else if (turn[0] === 'SWING') {
          api.screen(popupScreen('Swing', value + ' %'), side('Swing', 'Master', value + ' %', 'Repeat and arp follow'));
        } else {
          var text = value.toFixed(2) + ' kHz', page = api.layout.screens['PLUG-IN'], lcd = null;
          if (page && page.left && page.left.knobs) {
            lcd = { left: Object.assign({}, page.left, {
              touched: 0, knobs: [['Frequency', 0.5 + (value - 2.4) / 3, text]].concat(page.left.knobs.slice(1))
            }), right: page.right };
          }
          api.screen(frequencyScreen(value), lcd);
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
        api.screen(CHORDS_SCREEN,
          side(keys.name, 'Chords', chord.name, 'Triad  ' + chord.degree, keys.color));
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
        var oled = t >= 3400 && t < 4600 ? popupScreen('Note Repeat', rate)
          : trackScreen(0, SAMPLE_KIT, SAMPLE_DRUMS[hit - 1], noteName(35 + hit), SAMPLE_KIT);
        api.screen(oled, side(drums.name, 'Note Repeat', rate, 'Rate'));
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
        api.screenOf('STEP');
      }
    },

    // Live's browser on the MIKRO's screen: scroll to Drums, open it, scroll to a kit and load it;
    // the pads light up with the kit.
    'STAR': {
      every: 700,
      loupe: true,
      duration: 7000,
      tick: function (n, api) {
        var drums = SAMPLE_BROWSER.indexOf('Drums');  // 3: after Collections, MASCHINE Kits, Sounds
        var frame = Math.min(n, drums + 4), pushed = n === drums + 1 || n === drums + 4;
        api.turn(frame <= drums ? frame : frame < drums + 4 ? frame - 1 : drums + 2);
        api.light(pushed ? ['ENCODER'] : []);
        // Live's categories are folders; in Drums only Drum Hits is (the kits load)
        if (frame <= drums) api.screen(browserScreen('Browser', SAMPLE_BROWSER, frame, function () { return true; }));
        else if (frame < drums + 4) api.screen(browserScreen('Drums', SAMPLE_BROWSER_DRUMS, frame - drums - 1, function (i) { return i === 0; }));
        else api.screen(popupScreen('Loaded', SAMPLE_KIT));
        api.pads(frame < drums + 4 ? api.blank() : api.demo('PAD MODE'));
      }
    },

    // MASCHINE Kits: STAR, open MASCHINE Kits (Favorites first), turn to an Expansion and open
    // it: its kits, a favourite with a star. Turning onto a kit previews it; SHIFT + STAR makes
    // it a favourite too (popup, then its star); PUSH loads it as the selected MIDI track's Drum Rack
    // (or a new track's), the pads in the drum colours.
    'PUSH': {
      every: 750,
      loupe: true,
      duration: 8000,
      glow: ['STAR', 'PUSH'],
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
          [popupScreen('Favorite', SAMPLE_EXPANSION.kits[1]), ['SHIFT', 'STAR'], kits + 2, ['SHIFT', 'STAR']],
          [kitsScreen(1, [0, 1]), [], kits + 2],
          [popupScreen('Loaded', SAMPLE_EXPANSION.kits[1]), ['ENCODER'], kits + 2]
        ];
        var step = steps[Math.min(n, steps.length - 1)];
        api.outline(step[3] || ['STAR', 'PUSH']);  // first: a new outline clears the turn arrow
        api.screen(step[0]);
        api.light(step[1]);
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
          api.screen(n < 6 ? popupScreen('Variation', 'Recording the copy') : api.layout.screens.PATTERN, side(bass.name, 'Variation', 'Bass_1', 'Recording the copy', bass.color));
        } else {
          api.outline(['VARIATION', 'PAD']);
          api.light([]);
          api.screen(n < 2 ? popupScreen('Variation', 'Red pad: record a copy') : api.layout.screens.PATTERN, side(bass.name, 'Variation', 'Red pad', 'Record a copy of the clip above', RED));
        }
        api.pads(pads);
      }
    },

    // The mixer (MIKRO): a VOLUME tap and the pads are the tracks, glowing with their levels
    // (2-Bass visited: white; 3-Keys muted: dim white). TURN raises 2-Bass's volume in 1 dB steps,
    // the strip slides it in 0.1 dB steps, PUSH + TURN picks Pan (its bar from the centre) and
    // turns it. The strip's LEDs show the parameter in the track's colour.
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
        api.strip(screen.MIKRO_FILL / 126, SAMPLE_TRACKS[MIXER_VISITED].color);
        api.pads(api.demo('VOLUME'));
        api.screen(screen);
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
        if (recording) api.screen(api.layout.screens.PATTERN, side(bass.name, 'Recording', position, 'Bass_1', bass.color));
        else api.screen(api.layout.screens.PATTERN, side(drums.name, 'Playing', position, 'Drum Loop'));
        var grid = api.demo('PATTERN');
        if (recording) grid[9] = api.lit(bass.color, 'bright');
        api.pads(grid);
      }
    }
  };
})();
