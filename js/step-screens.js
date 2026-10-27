// The screens after a press: what the controller shows once a page's combo is pressed (the popup, then the
// page under it), from the script itself (tools/manual_step_screens.py in the script's repository; do not
// edit by hand). mikro: the screen's fields (js/screen-render.js) or a popup; mk3: the two screens
// (img/screens/mk3/<name>-left.png / -right.png). js/layouts.js puts them on their pages.
var STEP_SCREENS = {
 "mikro": {
  "automation AUTO": [
    {"popup": "Automation Arm\nOn"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "chords CHORDS": [
    {"popup": "Chord\n7th"},
    {"MIKRO_CORNER": "C Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C3", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "7th Close  C Major", "TITLE": "3-Keys"}
  ],
  "chords SHIFT + CHORDS": [
    {"popup": "Voicing\nInv 1"},
    {"MIKRO_CORNER": "C Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C3", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Triad Inv 1  C Major", "TITLE": "3-Keys"}
  ],
  "chords ◀ + ▶": [
    {"MIKRO_CORNER": "C Major", "MIKRO_LINE3": "Root", "MIKRO_LINE3_VALUE": "C", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Triad Close  C Major", "TITLE": "3-Keys"}
  ],
  "drum DUPLICATE + PAD + PAD": [
    {"popup": "Copied\nKick 909 1 to C#1"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "drum ERASE + PAD": [
    {"popup": "Deleted\nKick 909 1"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "drum MUTE + PAD": [
    {"popup": "Mute\nSnare"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "drum PAD": [
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Snare", "MIKRO_LINE3_VALUE": "C#1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "drum PAD MODE": [
    {"popup": "Pad colours\nBy chain colour"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "drum SELECT + PAD": [
    {"popup": "Snare\nC#1"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "drum SHIFT + PAD MODE": [
    {"popup": "Velocity curve\nSoft: more sensitive"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "drum SOLO + PAD": [
    {"popup": "Solo\nSnare"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "drum ◀ + ▶": [
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Snare", "MIKRO_LINE3_VALUE": "C#1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "edit DUPLICATE": [
    {"popup": "Duplicated\nDrum Loop"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "edit ERASE": [
    {"popup": "ERASE\nHold + pad to erase"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "edit MUTE": [
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 5, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "edit SHIFT + DUPLICATE": [
    {"popup": "Doubled\n2 bars"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "edit SHIFT + MUTE": [
    {"popup": "All tracks\nUnmuted, unsoloed"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "edit SOLO": [
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 6, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "events ERASE + EVENTS": [
    {"popup": "Cleared\n26 notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "events EVENTS": [
    {"popup": "Selected\nAll notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "events SHIFT + VARIATION": [
    {"popup": "Random velocity\nall notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "events VARIATION": [
    {"popup": "Humanized\nall notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "keyboard SHIFT + KEYBOARD": [
    {"popup": "Layout\nChromatic"},
    {"MIKRO_CORNER": "C Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C3", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Keyboard  C Major", "TITLE": "3-Keys"}
  ],
  "keyboard ◀ + ▶": [
    {"MIKRO_CORNER": "C Major", "MIKRO_LINE3": "Root", "MIKRO_LINE3_VALUE": "C", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Keyboard  C Major", "TITLE": "3-Keys"}
  ],
  "master SWING + TURN": [
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "0 %", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "1-Drums", "TITLE": "Swing"},
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "1 %", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "1-Drums", "TITLE": "Swing"},
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "2 %", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "1-Drums", "TITLE": "Swing"},
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "3 %", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "1-Drums", "TITLE": "Swing"}
  ],
  "master TEMPO + TURN": [
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "120.00 BPM", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "1-Drums", "TITLE": "Tempo"},
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "121.00 BPM", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "1-Drums", "TITLE": "Tempo"},
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "122.00 BPM", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "1-Drums", "TITLE": "Tempo"},
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "123.00 BPM", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "1-Drums", "TITLE": "Tempo"}
  ],
  "master VOLUME + PUSH": [
    {"MIKRO_CORNER": "", "MIKRO_FILL": 98, "MIKRO_LINE3": "Volume", "MIKRO_LINE3_VALUE": "-3.0 dB", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "1-Drums", "TITLE": "1-Drums"},
    {"MIKRO_CORNER": "", "MIKRO_FILL": 107, "MIKRO_LINE3": "Volume", "MIKRO_LINE3_VALUE": "0.0 dB", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "1-Drums", "TITLE": "1-Drums"}
  ],
  "playing MOD": [
    {"popup": "Touch strip\nModulation"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "playing PITCH": [
    {"popup": "Touch strip\nPitch bend"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "playing SHIFT + NOTE REPEAT": [
    {"popup": "NOTE REPEAT\nArpeggiator"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "shift-pads SHIFT + PAD 11": [
    {"popup": "Copied\nAll notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "shift-pads SHIFT + PAD 12": [
    {"popup": "Pasted\n26 notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "shift-pads SHIFT + PAD 13": [
    {"popup": "Transpose Down\nAll notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "shift-pads SHIFT + PAD 14": [
    {"popup": "Transpose Up\nAll notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "shift-pads SHIFT + PAD 15": [
    {"popup": "Transpose Octave -\nAll notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "shift-pads SHIFT + PAD 16": [
    {"popup": "Transpose Octave +\nAll notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "shift-pads SHIFT + PAD 3": [
    {"popup": "Velocity 100\nAll notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "shift-pads SHIFT + PAD 4": [
    {"popup": "Selected\nAll notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "shift-pads SHIFT + PAD 5": [
    {"popup": "Quantized 100%\nAll notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "shift-pads SHIFT + PAD 6": [
    {"popup": "Quantized 50%\nAll notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "shift-pads SHIFT + PAD 7": [
    {"popup": "Nudged\nAll notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "shift-pads SHIFT + PAD 8": [
    {"popup": "Nudged\nAll notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "shift-pads SHIFT + PAD 9": [
    {"popup": "Cleared\nAll notes"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "step SELECT + PAD": [
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "Page 1/2  1/16", "MIKRO_LINE3_VALUE": "C#1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Step Snare", "TITLE": "Snare"}
  ],
  "step ◀ + ▶": [
    {"popup": "Sound\nSnare"},
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "Page 1/2  1/16", "MIKRO_LINE3_VALUE": "C#1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Step Snare", "TITLE": "Snare"}
  ],
  "transport FOLLOW": [
    {"popup": "Follow\nOn"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "transport SHIFT + REC": [
    {"popup": "Arrangement\nRecord on"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ],
  "transport SHIFT + STOP": [
    {"popup": "Stop\nAll clips"},
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"}
  ]
 },
 "mk3": {
  "automation AUTO": [
    "press-automation-auto-0",
    "press-drum-erase-pad-1"
  ],
  "chords CHORDS": [
    "press-chords-chords-0"
  ],
  "drum DUPLICATE + PAD + PAD": [
    "press-drum-duplicate-pad-pad-0",
    "press-drum-erase-pad-1"
  ],
  "drum ERASE + PAD": [
    "press-drum-erase-pad-0",
    "press-drum-erase-pad-1"
  ],
  "drum MUTE + PAD": [
    "press-drum-mute-pad-0",
    "press-drum-mute-pad-1"
  ],
  "drum PAD": [
    "press-drum-pad-0"
  ],
  "drum PAD MODE": [
    "press-drum-pad-mode-0",
    "press-drum-pad-mode-1"
  ],
  "drum SHIFT + PAD MODE": [
    "press-drum-shift-pad-mode-0",
    "press-drum-erase-pad-1"
  ],
  "drum SOLO + PAD": [
    "press-drum-solo-pad-0",
    "press-drum-solo-pad-1"
  ],
  "edit DUPLICATE": [
    "press-edit-duplicate-0",
    "press-drum-erase-pad-1"
  ],
  "edit ERASE": [
    "press-edit-erase-0",
    "press-drum-erase-pad-1"
  ],
  "edit MUTE": [
    "press-edit-mute-0",
    "press-drum-erase-pad-1"
  ],
  "edit SHIFT + DUPLICATE": [
    "press-edit-shift-duplicate-0",
    "press-drum-erase-pad-1"
  ],
  "edit SHIFT + LOCK": [
    "press-edit-shift-lock-0",
    "press-drum-erase-pad-1"
  ],
  "edit SHIFT + MUTE": [
    "press-edit-shift-mute-0",
    "press-drum-erase-pad-1"
  ],
  "edit SOLO": [
    "press-edit-solo-0",
    "press-drum-erase-pad-1"
  ],
  "events ERASE + EVENTS": [
    "press-events-erase-events-0",
    "press-drum-erase-pad-1"
  ],
  "events SHIFT + VARIATION": [
    "press-events-shift-variation-0",
    "press-drum-erase-pad-1"
  ],
  "events VARIATION": [
    "press-events-variation-0",
    "press-drum-erase-pad-1"
  ],
  "keyboard SHIFT + KEYBOARD": [
    "press-keyboard-shift-keyboard-0",
    "press-keyboard-shift-keyboard-1"
  ],
  "master VOLUME + PUSH": [
    "press-master-volume-push-0",
    "press-master-volume-push-1"
  ],
  "master VOLUME + TURN": [
    "press-master-volume-push-1",
    "press-master-volume-turn-1",
    "press-master-volume-turn-2",
    "press-master-volume-turn-3"
  ],
  "mk3 MACRO": [
    "press-mk3-macro-0"
  ],
  "mk3 MUTE + GROUP A-H": [
    "press-mk3-mute-group-a-h-0"
  ],
  "mk3 SHIFT + GROUP A-H": [
    "press-mk3-shift-group-a-h-0",
    "press-drum-erase-pad-1"
  ],
  "mk3 SOLO (held, with the screens)": [
    "press-drum-solo-pad-1"
  ],
  "playing FIXED VEL": [
    "press-playing-fixed-vel-0",
    "press-drum-erase-pad-1"
  ],
  "playing MOD": [
    "press-playing-mod-0",
    "press-drum-erase-pad-1"
  ],
  "playing PITCH": [
    "press-playing-pitch-0",
    "press-drum-erase-pad-1"
  ],
  "playing SHIFT + NOTE REPEAT": [
    "press-playing-shift-note-repeat-0",
    "press-drum-erase-pad-1"
  ],
  "shift-pads SHIFT + PAD 11": [
    "press-shift-pads-shift-pad-11-0",
    "press-drum-erase-pad-1"
  ],
  "shift-pads SHIFT + PAD 12": [
    "press-shift-pads-shift-pad-12-0",
    "press-drum-erase-pad-1"
  ],
  "shift-pads SHIFT + PAD 13": [
    "press-shift-pads-shift-pad-13-0",
    "press-drum-erase-pad-1"
  ],
  "shift-pads SHIFT + PAD 14": [
    "press-shift-pads-shift-pad-14-0",
    "press-drum-erase-pad-1"
  ],
  "shift-pads SHIFT + PAD 15": [
    "press-shift-pads-shift-pad-15-0",
    "press-drum-erase-pad-1"
  ],
  "shift-pads SHIFT + PAD 16": [
    "press-shift-pads-shift-pad-16-0",
    "press-drum-erase-pad-1"
  ],
  "shift-pads SHIFT + PAD 3": [
    "press-shift-pads-shift-pad-3-0",
    "press-drum-erase-pad-1"
  ],
  "shift-pads SHIFT + PAD 4": [
    "press-shift-pads-shift-pad-4-0",
    "press-drum-erase-pad-1"
  ],
  "shift-pads SHIFT + PAD 5": [
    "press-shift-pads-shift-pad-5-0",
    "press-drum-erase-pad-1"
  ],
  "shift-pads SHIFT + PAD 6": [
    "press-shift-pads-shift-pad-6-0",
    "press-drum-erase-pad-1"
  ],
  "shift-pads SHIFT + PAD 7": [
    "press-shift-pads-shift-pad-7-0",
    "press-drum-erase-pad-1"
  ],
  "shift-pads SHIFT + PAD 8": [
    "press-shift-pads-shift-pad-7-0",
    "press-drum-erase-pad-1"
  ],
  "shift-pads SHIFT + PAD 9": [
    "press-shift-pads-shift-pad-9-0",
    "press-drum-erase-pad-1"
  ],
  "step PUSH + TURN": [
    "press-step-push-turn-0",
    "press-step-push-turn-1",
    "press-step-push-turn-2",
    "press-step-push-turn-3"
  ],
  "transport FOLLOW": [
    "press-transport-follow-0",
    "press-drum-erase-pad-1"
  ],
  "transport SHIFT + REC": [
    "press-transport-shift-rec-0",
    "press-drum-erase-pad-1"
  ],
  "transport SHIFT + STOP": [
    "press-transport-shift-stop-0",
    "press-drum-erase-pad-1"
  ]
 }
};
