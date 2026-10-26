// Devices on the screens (the Tour's last card): a Live device of each kind as the script shows it
// with PLUG-IN, from the script itself (tools/manual_device_stills.py in the script's repository; do
// not edit by hand). mikro: the screen's fields (js/screen-render.js); the MK3's two screens are
// img/screens/mk3/devices/<slug>-left.png / -right.png.
var DEVICE_STILLS = [
  {"group": "Drum Synths", "mikro": {"MIKRO_CORNER": "", "MIKRO_FILL": 44, "MIKRO_LINE3": "Pitch", "MIKRO_LINE3_VALUE": "52 Hz", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "DS Kick", "TITLE": "DS Kick"}, "name": "DS Kick", "slug": "ds-kick"},
  {"group": "Instruments", "mikro": {"MIKRO_CORNER": "1/3", "MIKRO_FILL": 63, "MIKRO_LINE3": "Mode", "MIKRO_LINE3_VALUE": "One-Shot", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Rhodes Chord Cm9  Main 1/3", "TITLE": "Rhodes Chord Cm9"}, "name": "Simpler", "slug": "simpler"},
  {"group": "Audio effects", "mikro": {"MIKRO_CORNER": "1/7", "MIKRO_FILL": 23, "MIKRO_LINE3": "1 Frequency A", "MIKRO_LINE3_VALUE": "40 Hz", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "2", "SUBTITLE": "EQ Eight  Main 1/7", "TITLE": "EQ Eight"}, "name": "EQ Eight", "slug": "eq-eight"},
  {"group": "MIDI effects", "mikro": {"MIKRO_CORNER": "1/4", "MIKRO_FILL": 30, "MIKRO_LINE3": "Style", "MIKRO_LINE3_VALUE": "Up & Down", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Arpeggiator  Main 1/4", "TITLE": "Arpeggiator"}, "name": "Arpeggiator", "slug": "arpeggiator"}
];
