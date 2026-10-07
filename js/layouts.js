// Hardware layouts, drawn by manual.js. Units: SVG user units; a layout's view box is width x height.
// Each control: [id, label, x, y, w, h, kind, options]. kind: button | pad | encoder | strip | screen | knob
// options (optional): sub (the grey SHIFT label printed under the label), bracket (sub printed in
// square brackets, like [Velocity]), tone ('green' | 'red'),
// prefix (a printed symbol before the label), icon ('maschine' | 'star' | 'search' | 'left' |
// 'right'), inverse (label printed in a white box, like SHIFT), letter (a pad's group letter),
// light (a plain light cap, like the MK3's display buttons), lit (the colour a button is always
// lit in, dimly; brighter with litBright, and full when selected), face (knob / encoder: radius of the lighter top as a share of the radius),
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
// name rules (drumRule() below), like the script's name colours.
// Kit and pad 1 as in the script's reference drums screen (data/screens.json).
var SAMPLE_DRUMS = ['Kick 909 1', 'Snare', 'Closed Hat', 'Open Hat', 'Clap', 'Rim', 'Low Tom', 'High Tom',
  'Crash', 'Ride', 'Shaker', 'Cowbell', 'Perc 1', 'Perc 2', 'FX', 'Bass'];
var SAMPLE_KIT = 'Kit-Core 909';  // that Drum Rack's name

// The drum name colour rules, ported 1:1 from the script (pad_layout.py: _DRUM_NAME_COLORS,
// _ENDINGS, _PLACED, drum_kind), in rule order: [kind, words a name word starts with, short
// words that only count whole]. The kind is the text after the colour in the swatch names of
// features.json ('Red: Kick, 808, sub, bass'), which gives the rule its colour; that table lists
// the common words, these are all of them. Keep both in step with the script.
var DRUM_NAME_RULES = [
  ['Kick, 808, sub, bass', ['kick', 'bassdrum', 'bass', '808', 'sub', 'boom', 'sine', 'kck'], ['bd', 'bdr', 'kk', 'kik']],
  ['Snare', ['snare', 'snr', 'volt', 'breaker'], ['sd', 'sdr', 'sn', 'sne']],
  ['Rim, stick, snap', ['rim', 'stick', 'sidestick', 'snap'], ['rs', 'ss']],
  ['Clap', ['clap', 'clp', 'handclap', 'slap'], ['cp', 'cl']],
  ['Tom, big drum', ['tom', 'floortom', 'bigtom', 'taiko', 'timpani', 'surdo'], ['tm', 'lt', 'mt', 'ht', 'ft']],
  ['Percussion', ['perc', 'prc', 'conga', 'cng', 'bongo', 'timbal', 'cowbell', 'block', 'wood', 'clave',
    'agogo', 'kettle', 'guiro', 'cajon', 'tabla', 'djembe', 'darabuk', 'click', 'tap', 'fractal'], ['cb']],
  ['Bell, metal tones', ['bell', 'triangle', 'gong', 'chime', 'tubular', 'glock', 'marimba', 'kalimba',
    'vibe'], ['tri']],
  ['Atmosphere, pad', ['ambien', 'drone', 'atmos', 'texture', 'pad'], []],
  ['Shaker, tambourine', ['shaker', 'shake', 'shk', 'tamb', 'tmb', 'cabasa', 'maraca'], []],
  ['Open hi-hat', ['ohh', 'oht', 'openhat', 'openhh'], ['oh']],  // and 'Open HH'
  ['Hi-hat', ['hat', 'hihat', 'hh', 'hht', 'chh', 'closed', 'silver'], ['ch']],
  ['Ride', ['ride'], ['rd']],
  ['Crash, cymbal', ['crash', 'crsh', 'cymbal', 'cym', 'china', 'splash'], ['cy']],
  ['Synth, keys', ['synth', 'lead', 'chord', 'key', 'piano', 'arp', 'pluck', 'stab', 'organ', 'string',
    'brass', 'horn', 'guitar', 'ensemble', 'modular', 'lick'], []],
  ['Vocal', ['vocal', 'voc', 'vox', 'voice', 'chant', 'breath', 'choir', 'shout', 'adlib'], ['vx']],
  ['FX, riser, noise', ['fx', 'sfx', 'riser', 'rise', 'sweep', 'uplift', 'downlift', 'zap', 'laser',
    'lazer', 'glitch', 'noise', 'dist', 'rev', 'blip', 'blop', 'buzz', 'crackle', 'swell', 'drill', 'dive',
    'scratch', 'pop'], []],
  ['Hit, impact', ['hit', 'impact', 'strike', 'metal'], []],
  ['Loop, break, fill', ['loop', 'break', 'drum', 'groove', 'fill'], []]
];

// The index into DRUM_NAME_RULES of the rule a drum pad name matches, or -1 (white). The name is
// read word by word, first word first. A hat at a word's start or end ('HatRoll', 'ClosedHH',
// 'OpenHat') or 'hihat' is a hi-hat, not one mid-word ('Manhattan'); a drum with its place in
// front ('LoTom', 'HiConga') is checked first, as 'hitom' starts with 'hit'; kick, snare, clap
// and tri also count at a word's end ('SubKick', 'HandClap', 'MuteTri').
var drumRule = (function () {
  var HAT = /^(hat|hh)|(hat|hh|hats)$|hihat/;
  var PLACED = /^(lo|low|mid|middle|hi|high|floor|fl|rack|big)(tom|bongo|conga|timbal)/;
  var kinds = DRUM_NAME_RULES.map(function (rule) { return rule[0]; });
  var OPEN = kinds.indexOf('Open hi-hat'), HIHAT = kinds.indexOf('Hi-hat');
  var ENDINGS = [[/(kick|kck)$/, kinds.indexOf('Kick, 808, sub, bass')], [/snare$/, kinds.indexOf('Snare')],
    [/clap$/, kinds.indexOf('Clap')], [/tri$/, kinds.indexOf('Bell, metal tones')]];
  function wordRule(word) {
    if (HAT.test(word) && word.indexOf('open') >= 0) return OPEN;
    var placed = PLACED.exec(word);
    if (placed) return wordRule(placed[2]);
    for (var i = 0; i < DRUM_NAME_RULES.length; i++) {
      var rule = DRUM_NAME_RULES[i];
      if (rule[2].indexOf(word) >= 0 || (i === HIHAT && HAT.test(word))) return i;
      if (rule[1].some(function (start) { return word.indexOf(start) === 0; })) return i;
    }
    for (var e = 0; e < ENDINGS.length; e++) if (ENDINGS[e][0].test(word)) return ENDINGS[e][1];
    return -1;
  }
  return function (name) {
    var words = String(name || '').toLowerCase().match(/[a-z0-9]+/g) || [];
    if (words.indexOf('open') >= 0 && words.some(function (word) { return HAT.test(word); })) return OPEN;
    for (var i = 0; i < words.length; i++) {
      var rule = wordRule(words[i]);
      if (rule >= 0) return rule;
    }
    return -1;
  };
})();
var SAMPLE_SCENES = ['Intro', 'Verse', 'Chorus', 'Drop'];
// Live's browser: the top list as the script lists it (Favorites, the controller's stars, first;
// then Live's sidebar: Collections, MASCHINE Kits, the library), and the Drums category (a folder
// of single hits, then the kits; SAMPLE_KIT is loaded from it).
var SAMPLE_BROWSER = ['Favorites', 'Collections', 'MASCHINE Kits', 'Sounds', 'Drums', 'Instruments', 'Audio Effects',
  'MIDI Effects', 'Max for Live', 'Plug-Ins', 'Clips', 'Samples', 'Grooves', 'Packs', 'User Library',
  'Current Project'];
// The icons of the browser's top level (like Live's sidebar), as the script's BROWSER_ICONS
// (display_model.py): private-use characters drawn by the screen fonts (data/screens.json), a
// Places folder the folder icon, Favorites the star, Collections a dot (like the coloured dots in
// Live's sidebar). A top-level row is 'icon name >'.
var BROWSER_ICONS = {
  sounds: '', drums: '', instruments: '', audio_effects: '',
  midi_effects: '', max_for_live: '', plugins: '', clips: '',
  samples: '', grooves: '', packs: '', user_library: '',
  current_project: '', folder: '', kits: '', favorites: '★', collections: ''
};
// A top-level item's icon by its name (the script's CATEGORIES labels); anything else is a
// Places folder.
var BROWSER_ICON_KEYS = { 'Favorites': 'favorites', 'Collections': 'collections', 'MASCHINE Kits': 'kits', 'Sounds': 'sounds',
  'Drums': 'drums', 'Instruments': 'instruments', 'Audio Effects': 'audio_effects',
  'MIDI Effects': 'midi_effects', 'Max for Live': 'max_for_live', 'Plug-Ins': 'plugins',
  'Clips': 'clips', 'Samples': 'samples', 'Grooves': 'grooves', 'Packs': 'packs',
  'User Library': 'user_library', 'Current Project': 'current_project' };
function browserIcon(name) { return BROWSER_ICONS[BROWSER_ICON_KEYS[name] || 'folder']; }
var SAMPLE_BROWSER_DRUMS = ['Drum Hits', 'Kit-606', 'Kit-Core 909', 'Kit-Dusty', 'Kit-House',
  'Kit-Lo-Fi', 'Kit-Techno'];
// MASCHINE Kits: Favorites first (there is one), then the Expansions by name; in an Expansion
// its kits by name. The Expansion and its first kits as in the script's reference screen
// (data/screens.json, browser-kits); count: its number of kits.
var SAMPLE_EXPANSIONS = ['Favorites', 'Chromatic Fire', 'Deep Matter', 'Golden Kingdom', 'Molten Veil',
  'Prismatic Bliss'];
var SAMPLE_EXPANSION = { name: 'Chromatic Fire', count: 15,
  kits: ['Black Earth Kit', 'Concrete Dubs Kit', 'Dev Breaks Kit'] };
// Favorites (STAR): what was starred with SHIFT + STAR, and the kits starred in MASCHINE: a
// MASCHINE kit, a folder (Drums > Drum Hits) and a Drums preset ([name, is a folder]). Listed by
// name, case not counting, as the script sorts them (favoritesScreen sorts).
var SAMPLE_FAVORITES = [['Black Earth Kit', false], ['Drum Hits', true], ['Kit-House', false]];

// The short name of a sample track ('1-Drums' -> 'Drums').
function shortName(track) { return track.name.replace(/^\d+-/, ''); }

// --- the MIKRO's screen --------------------------------------------------------------------
// Screen states with the fields the script sends for the sample set (js/screen-render.js draws
// them as the controller does; MM.screenLines picks 2 or 3 lines). Texts as the script words them.

// A pad mode or PLUG-IN: line 1 the track's numbered box and its name (corner: the value at its
// right on two lines), line 2 the subtitle (three lines only), then the detail and its value.
// index: into SAMPLE_TRACKS; flags: MM.screen.MUTE / SOLO.
function trackScreen(index, subtitle, detail, value, corner, flags) {
  return { TITLE: SAMPLE_TRACKS[index].name, MIKRO_TRACK_LABEL: String(index + 1),
    MIKRO_TRACK_FLAGS: MM.screen.SHOWN | (flags || 0), SUBTITLE: subtitle, MIKRO_LINE3: detail || '',
    MIKRO_LINE3_VALUE: value || '', MIKRO_CORNER: corner || '' };
}

// PLUG-IN: three lines: the track, then the device; with more than one parameter page also the
// page (its name without a trailing number, 'Macros 2' -> 'Macros') and the count, as the script
// words it: line 2 'Keys Rack  Macros 2/2'. One page: the device only. Two lines (`two`): line 1
// the track's box and the device in bold, the corner only the count ('2/2'; nothing with one page).
// page / count: 1-based page and the number of pages. fill: the fill bar along the bottom, how
// far the parameter is turned up (0-126; centre: from the middle, for a parameter that goes both
// ways), as the script sends it.
function pluginScreen(index, device, pageName, page, count, parameter, value, fill, centre) {
  var screen, of = page + '/' + count;
  if (count <= 1) screen = trackScreen(index, device, parameter, value, device);
  else screen = trackScreen(index, device + '  ' + pageName.replace(/ \d+$/, '') + ' ' + of, parameter, value, device + ' ' + of);
  screen.two = { TITLE: device, MIKRO_CORNER: count > 1 ? of : '' };
  return withFill(screen, fill, centre);
}

// PLUG-IN on 2-Bass's Auto Filter, Frequency at khz: its fill bar on Live's log scale (26 Hz -
// 19.9 kHz), 2.40 kHz at 80 as in the script's reference screen (plugin-fill).
function frequencyScreen(khz) {
  return pluginScreen(1, 'Auto Filter', 'Filter', 1, 4, 'Frequency', khz.toFixed(2) + ' kHz',
    80 + 126 * Math.log(khz / 2.4) / Math.log(19900 / 26));
}

// A screen state with the fill bar (MIKRO_FILL 0-126; centre: MIKRO_FILL_CENTER, from the middle).
// Undo / Redo (SHIFT + PAD 1 / PAD 2): the screen as it was, with the arrow badge ('\ue010' undo,
// '\ue011' redo) over the start of line 1 for a second (screen-render.js `badge`).
function withBadge(screen, glyph) {
  var out = {};
  Object.keys(screen).forEach(function (key) { out[key] = screen[key]; });
  out.badge = glyph;
  return out;
}

function withFill(screen, fill, centre) {
  if (typeof fill !== 'number') return screen;
  screen.MIKRO_FILL = Math.max(0, Math.min(126, Math.round(fill)));
  if (centre) screen.MIKRO_FILL_CENTER = 1;
  return screen;
}

// The mixer (VOLUME tap) visits the tracks in Live's mixer order: the tracks, the returns, the
// Master (box labels as the script's: the number, A / B, M).
var MIXER_TRACKS = SAMPLE_TRACKS.map(function (t, i) { return { name: t.name, label: String(i + 1) }; })
  .concat(SAMPLE_RETURNS.map(function (t) { return { name: t.name, label: t.name.charAt(0) }; }),
    [{ name: SAMPLE_MASTER.name, label: 'M' }]);

// The fill of a volume or send in dB, as the script computes it (Live's curve: 0 dB = 0.85,
// encoder.py db_to_volume; 126 = full).
function volumeFill(db) {
  var v = db === -Infinity ? 0 : db >= -18 ? Math.min(1, 0.85 + db * 0.025) : 0.4 * Math.pow(10, (db + 18) / 20);
  return Math.round(Math.max(0, v) * 126);
}
// dB as Live shows it: '-3.0 dB', '-inf dB'.
function dbText(db) { return db === -Infinity ? '-inf dB' : db.toFixed(1) + ' dB'; }
// Pan as Live shows it: -50 ... 50 -> '12L', 'C', '25R'; its fill (from the centre).
function panText(pan) { return pan === 0 ? 'C' : Math.abs(pan) + (pan < 0 ? 'L' : 'R'); }
function panFill(pan) { return (pan / 50 + 1) / 2 * 126; }

// The mixer's screen (metering.py _draw): line 1 the visited track's box and name with 'Mixer'
// in the corner, line 2 (three lines only) 'Mixer 2/11', then the parameter and its value; the
// fill bar along the bottom, Pan's from the centre. index: into MIXER_TRACKS; parameter:
// 'Volume' | 'Send A' ... with amount in dB, or 'Pan' with amount -50 ... 50; flags:
// MM.screen.MUTE / SOLO.
function mixerScreen(index, parameter, amount, flags) {
  var t = MIXER_TRACKS[index], pan = parameter === 'Pan';
  return withFill({ TITLE: t.name, MIKRO_TRACK_LABEL: t.label, MIKRO_TRACK_FLAGS: MM.screen.SHOWN | (flags || 0),
    SUBTITLE: 'Mixer ' + (index + 1) + '/' + MIXER_TRACKS.length, MIKRO_LINE3: parameter,
    MIKRO_LINE3_VALUE: pan ? panText(amount) : dbText(amount), MIKRO_CORNER: 'Mixer' },
  pan ? panFill(amount) : volumeFill(amount), pan);
}

// A mode named on line 1 (Pattern, Scenes, Tracks ...).
function modeScreen(title, subtitle, detail, value, corner) {
  return { TITLE: title, SUBTITLE: subtitle || '', MIKRO_LINE3: detail || '', MIKRO_LINE3_VALUE: value || '',
    MIKRO_CORNER: corner || '' };
}

// A MIDI note as Live names it (60 = C3); a Drum Rack's pad 1 is 36 (C1).
function noteName(pitch) {
  return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][pitch % 12] + (Math.floor(pitch / 12) - 2);
}

// A popup: a value that changed (tempo, swing, a toggle ...).
function popupScreen(title, value) { return { popup: value ? title + '\n' + value : title }; }

// A list (the browser, the settings page): three rows around the chosen one, which is
// highlighted, and the scrollbar. rows: the row texts ('name\tvalue' for a value on the right).
function listScreen(title, subtitle, rows, chosen) {
  var start = Math.max(0, Math.min(chosen - 1, rows.length - 3));
  return { TITLE: title, SUBTITLE: subtitle, LIST_ITEM: rows.slice(start, start + 3), LIST_SELECTED: chosen - start,
    MIKRO_SCROLL: rows.length > 1 ? Math.round(chosen * 126 / (rows.length - 1)) : null };
}

// Live's browser at a level: its name, the items (folders marked ' >'), the chosen one; starred(i)
// (optional): a starred item, a star on the right of its row ('name	★') and after its name on
// line 2, as the script's _row / _show. The top level ('Browser') starts each row with its icon
// (browserIcon); line 2 has none, as in the script.
function browserScreen(level, items, chosen, folders, starred) {
  var star = function (i) { return starred && starred(i) ? '	★' : ''; };
  var rows = items.map(function (name, i) {
    var row = (folders(i) ? name + ' >' : name) + star(i);
    return level === 'Browser' ? browserIcon(name) + ' ' + row : row;
  });
  return listScreen(level + ' ' + (chosen + 1) + '/' + items.length,
    items[chosen] + star(chosen).replace('	', ' ') + ' ' + (folders(chosen) ? '>' : ''), rows, chosen);
}

// STAR: the browser on Favorites (SAMPLE_FAVORITES by name, every row starred), item `chosen`.
function favoritesScreen(chosen) {
  var key = function (f) { return f[0].toLowerCase(); };
  var list = SAMPLE_FAVORITES.slice().sort(function (a, b) { return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0; });
  return browserScreen('Favorites', list.map(function (f) { return f[0]; }), chosen,
    function (i) { return list[i][1]; }, function () { return true; });
}

// The kits of SAMPLE_EXPANSION, kit `chosen` (0-1: the rows shown are the known kits);
// favorites: the indexes of favourite kits (a star at the right of the row, as the script
// sends it: 'Kit\t★', and 'Kit ★' on line 2).
function kitsScreen(chosen, favorites) {
  var e = SAMPLE_EXPANSION, star = function (i) { return favorites.indexOf(i) >= 0 ? '\t★' : ''; };
  var start = Math.max(0, Math.min(chosen - 1, e.count - 3));
  var rows = e.kits.slice(start, start + 3).map(function (name, i) { return name + star(start + i); });
  return { TITLE: e.name + ' ' + (chosen + 1) + '/' + e.count, SUBTITLE: (e.kits[chosen] + star(chosen)).replace('\t', ' '),
    LIST_ITEM: rows, LIST_SELECTED: chosen - start, MIKRO_SCROLL: Math.round(chosen * 126 / (e.count - 1)) };
}

// The settings page (MASCHINE), a setting chosen by its name (default: the first one), line 2
// 'Name: value' as the script's settings page shows it (the setup guide shows 'About'). The rows
// in the script's order and with its defaults (surface.py _settings_items; its Brightness row is
// left out until it is confirmed on the hardware). The Tour's Settings card steps through the
// values in features.json (`values`, checked against the script there).
function settingsRows() {
  return ['Screen\t' + MM.screenLines + ' lines', 'Screen saver\t10 min', 'Velocity curve\tLinear',
    'Fixed velocity\t100', 'Pad pressure\tPoly', 'Drum colours\tBy chain', 'Step follows\tOn',
    'Record length\tFree', 'Start mode\tPads', 'About\t2.0.0'];
}
// changed (optional): { setting name: value } shown instead of the default; Screen '3 lines'
// draws the page in three lines, as the controller does at once.
function settingsScreen(chosenName, changed) {
  changed = changed || {};
  var rows = settingsRows().map(function (row) {
    var name = row.split('\t')[0];
    return name in changed ? name + '\t' + changed[name] : row;
  });
  var names = rows.map(function (row) { return row.split('\t')[0]; });
  var chosen = Math.max(0, names.indexOf(chosenName));
  var screen = listScreen('Settings', rows[chosen].replace('\t', ': '), rows, chosen);
  var lines = /^(\d) lines$/.exec(changed.Screen || '');
  if (lines) screen.MIKRO_LINES = Number(lines[1]);
  return screen;
}

// The settings section's screens: each setting's row ('MASCHINE (Screen saver)', the item's
// context) shows the page on that setting.
function settingsSectionScreens() {
  var out = { '*': settingsScreen() };
  settingsRows().forEach(function (row) {
    var name = row.split('\t')[0];
    out['MASCHINE (' + name + ')'] = settingsScreen(name);
  });
  return out;
}

// A held button's value (REC: the record length; a held step): the display's show_held, the
// name on line 1, the value below.
function heldScreen(title, value) { return modeScreen(title, '', value); }

// Pad number (1-16) of a list position: lists read like text, position 0 = pad 13 (top left),
// position 3 = pad 16, position 4 = pad 9, ... position 15 = pad 4 (bottom right).
function listPad(position) { return (3 - Math.floor(position / 4)) * 4 + position % 4 + 1; }

// Buttons that show the track view on the pads while held, so a pad acts on a track (the
// MIKRO's SELECT is its arm modifier; the MK3's SELECT is its track mode). In the modes in
// TRACK_VIEW_KEEPS (drum mode) they act on that mode's pads instead and the pads stay as they are.
var TRACK_VIEW_MODIFIERS = ['STOP', 'SOLO', 'MUTE', 'SELECT'];
var TRACK_VIEW_KEEPS = ['PAD MODE'];

// The mixer's sample state: 2-Bass visited (Live's selection stays on 1-Drums), 3-Keys muted
// (indexes into SAMPLE_TRACKS).
var MIXER_VISITED = 1, MIXER_MUTED = 2;

// Pad demos chosen by section (section id -> combo tokens joined with '+', or '*' for any other
// combo there -> the token of the pad demo to show, null: none): in the mixer every combo
// (MUTE + PAD, STOP + PAD ...) acts on the mixer's pads; holding VOLUME or SHIFT + VOLUME to turn
// leaves the pads as they are.
var SECTION_PADS = {
  mixer: { '*': 'VOLUME' },
  master: { 'VOLUME+TURN': null, 'SHIFT+VOLUME': null }
};

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

  // VOLUME: the mixer (metering.py), in TRACK mode's layout: each track in its colour with the
  // brightness of its level (loud near 0 dB 'bright', playing 'mid', quiet 'dim'; meter: a seed,
  // so manual.js lets each pad's brightness move gently on its own), the visited track
  // (MIXER_VISITED) steady white, a muted one (MIXER_MUTED) dim white. The returns and the Master
  // on the last pads.
  var levels = ['bright', null, null, 'mid', 'mid', 'dim', 'dim', 'mid', 'dim', 'dim', 'mid'];
  var seeds = [0.1, 0, 0, 0.55, 0.3, 0.8, 0.45, 0.7, 0.2, 0.9, 0.35];
  var mixed = SAMPLE_TRACKS.concat(SAMPLE_RETURNS, [SAMPLE_MASTER]);
  demos.VOLUME = pads();
  mixed.forEach(function (track, i) {
    var position = i < SAMPLE_TRACKS.length ? i : 16 - mixed.length + i;
    var entry = i === MIXER_VISITED ? lit(SAMPLE_MASTER.color, 'bright')
      : i === MIXER_MUTED ? lit(SAMPLE_MASTER.color, 'dim') : lit(track.color, levels[i]);
    if (i !== MIXER_VISITED && i !== MIXER_MUTED) entry.meter = seeds[i];
    demos.VOLUME[listPad(position) - 1] = entry;
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
    var pattern = modeScreen('Pattern', 'Tracks 1-4 Scenes 1-4', SAMPLE_TRACKS[SAMPLE_SELECTED].name, '', 'Scenes 1-4');
    // The script starts on the pads (PAD MODE: the drums, as 1-Drums has a Drum Rack), so that is
    // the screen with nothing selected; the track is heard (not muted).
    var drums = trackScreen(0, SAMPLE_KIT, SAMPLE_DRUMS[0], noteName(36), SAMPLE_KIT);
    var scenes = '1 - ' + SAMPLE_SCENES.length + ' of ' + SAMPLE_SCENES.length;
    // PLUG-IN on 2-Bass's Auto Filter (Live's banks: Filter is page 1 of 4; on two lines the
    // device on line 1, '1/4' in the corner). PUSH + TURN pages through the 16 macros of a rack
    // on 3-Keys, Keys Rack (Macros 1-8, 9-16), as the script's reference screen plugin-macros.
    // The fill bar: a macro's value of 0-127 on 126.
    var plugin = frequencyScreen(2.4);
    var macros = [pluginScreen(2, 'Keys Rack', 'Macros 1', 1, 2, 'Macro 1', '32', 32 * 126 / 127),
      pluginScreen(2, 'Keys Rack', 'Macros 2', 2, 2, 'Macro 9', '64', 64 * 126 / 127)];
    // The mixer on 2-Bass (MIXER_VISITED), as the script's reference screens (mixer, mixer-pan):
    // Volume -3.0 dB, Pan 12L.
    var mixer = function (parameter, amount, flags) { return mixerScreen(MIXER_VISITED, parameter, amount, flags); };
    var mixerVolume = mixer('Volume', -3);
    // LOCK: a pin after the track's name while the controller is locked to it (KEYBOARD on 2-Bass,
    // the script's reference screen 'locked')
    var locked = trackScreen(1, 'Keyboard  C Major', 'Octave', 'C3', 'C Major');
    locked.TITLE += ' \ue00f';
    var tracks = '1 - ' + SAMPLE_TRACKS.length + ' of ' + SAMPLE_TRACKS.length;
    // BROWSER: the browser's top list, first opened on Favorites; STAR: Favorites itself
    var browser = browserScreen('Browser', SAMPLE_BROWSER, 0, function () { return true; });
    var favorites = favoritesScreen(0);
    // SHIFT + STAR in Drums on Kit-House: the star appears on its row (no popup)
    var drumsAt = function (name, star) {
      var at = SAMPLE_BROWSER_DRUMS.indexOf(name);
      return browserScreen('Drums', SAMPLE_BROWSER_DRUMS, at, function (i) { return i === 0; },
        function (i) { return star && i === at; });
    };
    var starring = [drumsAt('Kit-House', false), drumsAt('Kit-House', true)];
    // SHIFT + BROWSER: Hot-Swap the selected device (1-Drums' Drum Rack): the popup names it, the
    // browser opens on its category (Drums, on its first item), TURN to a kit, PUSH swaps it.
    var drumFolders = function (i) { return i === 0; };
    var hotSwap = [popupScreen('Hot-Swap', SAMPLE_KIT),
      browserScreen('Drums', SAMPLE_BROWSER_DRUMS, 0, drumFolders),
      browserScreen('Drums', SAMPLE_BROWSER_DRUMS, SAMPLE_BROWSER_DRUMS.indexOf('Kit-House'), drumFolders),
      popupScreen('Swapped', 'Kit-House')];
    return {
      title: 'MASCHINE MIKRO MK3',
      width: 1000,
      height: Math.round(313 * k),
      radius: 7,
      real: true,
      screen: drums,
      // What the screen shows when a control is selected or a combo with it is hovered: the
      // script's screen for the sample set (the screen helpers above).
      screens: {
        'PLUG-IN': plugin,
        'TEMPO': popupScreen('Tempo', '120.00 BPM'),
        'SWING': popupScreen('Swing', '25 %'),
        'VOLUME': mixerVolume,
        'PAD MODE': drums,
        'KEYBOARD': trackScreen(2, 'Keyboard  C Major', 'Octave', 'C3', 'C Major'),
        'CHORDS': trackScreen(2, 'Triad Close  C Major', 'Chord', 'Triad', 'C Major'),
        'STEP': trackScreen(0, 'Step ' + SAMPLE_DRUMS[0], 'Page 1/2  1/16', 'C1', SAMPLE_DRUMS[0]),
        'SCENE': modeScreen('Scenes', scenes, SAMPLE_SCENES[0], '', scenes),
        'PATTERN': pattern,
        'NOTE REPEAT': popupScreen('Note Repeat', '1/16 latched'),
        'FIXED VEL': popupScreen('Fixed Velocity', 'On (100)'),
        'EVENTS': modeScreen('Events', 'Drum Loop'),
        'GROUP': modeScreen('Tracks', tracks, SAMPLE_TRACKS[SAMPLE_SELECTED].name, '', tracks),
        'LOCK': locked,
        'MASCHINE': settingsScreen(),
        'STAR': favorites,
        'BROWSER': browser
      },
      // Screens for a combo hovered in a given section (section id -> combo tokens joined with
      // '+', '*' for any other combo there); a list of states plays in turn (manual.js).
      sectionScreens: {
        plugin: { '*': plugin, 'PUSH+TURN': macros,
          'TURN': [plugin, frequencyScreen(2.9), frequencyScreen(3.6)] },
        // The mixer: TURN in 1 dB steps; PUSH + TURN chooses Volume, Pan (its bar from the
        // centre), Send A; a PUSH tap resets; the strip sets 0.1 dB steps; MUTE / SOLO taps show
        // on the track's box (hollow: muted; S: soloed); the arrows visit 1-Drums ... 3-Keys (muted).
        mixer: { '*': mixerVolume,
          'TURN': [mixerVolume, mixer('Volume', -2), mixer('Volume', -1), mixer('Volume', 0)],
          'PUSH+TURN': [mixerVolume, mixer('Pan', -12), mixer('Send A', -Infinity)],
          'PUSH': [mixerVolume, mixer('Volume', 0), mixer('Pan', -12), mixer('Pan', 0)],
          'STRIP': [mixerVolume, mixer('Volume', -2.4), mixer('Volume', -1.7)],
          'MUTE': [mixerVolume, mixer('Volume', -3, MM.screen.MUTE)],
          'SOLO': [mixerVolume, mixer('Volume', -3, MM.screen.SOLO)],
          '◀+▶': [mixerScreen(0, 'Volume', 0), mixerVolume, mixerScreen(MIXER_MUTED, 'Volume', -6, MM.screen.MUTE)] },
        // VOLUME held + TURN: the selected track's volume (its name, the value); SHIFT + VOLUME:
        // the Cue volume in 0.5 dB steps (the script's reference screen 'cue').
        master: {
          'VOLUME+TURN': ['0.0 dB', '-1.0 dB', '-2.0 dB'].map(function (v) { return modeScreen(SAMPLE_TRACKS[0].name, '', v); }),
          'SHIFT+VOLUME': ['-12.0 dB', '-11.5 dB', '-11.0 dB'].map(function (v) { return modeScreen('Cue', '', v); }) },
        edit: { 'SHIFT+LOCK': popupScreen('Device lock', 'toggled') },
        // SHIFT + PAD 1 / PAD 2: no popup, only the arrow badge over the screen for a second.
        'shift-pads': { 'SHIFT+PAD 1': [drums, withBadge(drums, '\ue010')],
          'SHIFT+PAD 2': [drums, withBadge(drums, '\ue011')] },
        views: { 'SHIFT+BROWSER': hotSwap },
        // BROWSER: the top list; STAR: Favorites. In MASCHINE Kits: TURN scrolls the kits
        // (previewing each), PUSH loads one. SHIFT + STAR on any item: the favourite popup, then the
        // star on its row.
        browser: { '*': browser, 'BROWSER': browser, 'STAR': favorites,
          'TURN': [kitsScreen(0, [0]), kitsScreen(1, [0])],
          'PUSH': [kitsScreen(1, [0]), popupScreen('Loaded', SAMPLE_EXPANSION.kits[1])],
          'SHIFT+STAR': starring },
        highlights: { 'PUSH': kitsScreen(0, [0]) },
        settings: settingsSectionScreens(),
        // Hold REC + TURN: the record length (Free, 1, 2, 4, 8 bars).
        transport: { 'REC+TURN': ['Free', '1 bar', '2 bars', '4 bars'].map(function (v) { return heldScreen('Record length', v); }) },
        // Hold a step + TURN: 'Step 1' and its velocity (SHIFT: 'Length 2 steps', PUSH: 'Nudge +1/16').
        step: { 'PAD+TURN': ['Velocity 100', 'Velocity 101', 'Velocity 102'].map(function (v) { return heldScreen('Step 1', v); }) },
        // Hold a drum pad + TURN: its chain volume in 1 dB steps, 'Volume' in the corner, the fill bar.
        drum: { 'PAD+TURN': [0, -1, -2].map(function (db) {
          return withFill(trackScreen(0, 'Volume', SAMPLE_DRUMS[0], dbText(db), 'Volume'), volumeFill(db));
        }) }
      },
      stripDots: dots,
      padDemos: padDemos('GROUP'),
      trackMode: 'GROUP',  // the track mode button; the other TRACK_VIEW_MODIFIERS are held
      controls: [
        c('MASCHINE', 'MASCHINE', 33.75, 164, 17.5, 14, 'button', { icon: 'maschine' }),
        c('STAR', '★', 33.75, 185, 17.5, 14.5, 'button', { icon: 'star' }),
        c('BROWSER', 'BROWSER', 33.75, 206, 17.5, 14.5, 'button', { icon: 'search' }),
        c('SCREEN', 'SCREEN', 67.5, 164, 50.5, 15, 'screen'),
        // the encoder spans STAR's top edge to BROWSER's bottom edge, centred under the screen
        c('ENCODER', 'ENCODER', 75, 185, 35.5, 35.5, 'encoder'),
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
      knobs.push(round('KNOB ' + (i + 1), String(i + 1), 181 + i * 51, 208, 15.5, 'knob', { face: 0.71 }));
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
      'VOLUME': { left: side(tracks[MIXER_VISITED][0], 'Mixer ' + (MIXER_VISITED + 1) + '/' + MIXER_TRACKS.length, '-3.0 dB', 'Volume', tracks[MIXER_VISITED][1]) },
      'PAD MODE': {
        left: side(tracks[0][0], 'Drums', SAMPLE_KIT, 'Pad 1  ' + SAMPLE_DRUMS[0]),
        // list entries [name, colour, drum name]: manual.js colours a drum by its name colour
        right: { title: 'Drum Rack', sub: SAMPLE_KIT, selected: 0, list: SAMPLE_DRUMS.slice(0, 6).map(function (name) {
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
        left: { title: 'Browser', sub: 'Drums', selected: 1, accent: '#8f8f96',
          list: SAMPLE_BROWSER_DRUMS.slice(1, 6).map(function (name) { return [name]; }) }
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
      trackMode: 'SELECT',  // the track mode button; the other TRACK_VIEW_MODIFIERS are held
      // nothing selected: the script starts on the pads (the drums), like the MIKRO
      screen: screens['PAD MODE'],
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
