// The screens detent by detent: what the controller shows before a turn of the encoder and after each
// detent, from the script itself (tools/manual_anims_detents.py in the script's repository; do not
// edit by hand). mikro: the screen's fields (js/screen-render.js); mk3: the animation of the export
// (img/screens/mk3/anim/), one frame a detent. js/layouts.js puts them on their pages.
var DETENT_SCREENS = {
 "mikro": {
  "chords TURN": [
    {"MIKRO_CORNER": "C Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C3", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Triad Close  C Major", "TITLE": "3-Keys"},
    {"MIKRO_CORNER": "C Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C4", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Triad Close  C Major", "TITLE": "3-Keys"},
    {"MIKRO_CORNER": "C Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C5", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Triad Close  C Major", "TITLE": "3-Keys"},
    {"MIKRO_CORNER": "C Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C6", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Triad Close  C Major", "TITLE": "3-Keys"}
  ],
  "clip SHIFT + TURN": [
    {"MIKRO_CORNER": "T1-4 S1-4", "MIKRO_LINE3": "Drum Loop", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "Tracks 1-4 Scenes 1-4", "TITLE": "Pattern"},
    {"MIKRO_CORNER": "T1-4 S2-5", "MIKRO_LINE3": "Drum Loop", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "Tracks 1-4 Scenes 2-5", "TITLE": "Pattern"},
    {"MIKRO_CORNER": "T1-4 S3-6", "MIKRO_LINE3": "Drum Loop", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "Tracks 1-4 Scenes 3-6", "TITLE": "Pattern"},
    {"MIKRO_CORNER": "T1-4 S4-7", "MIKRO_LINE3": "Drum Loop", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "Tracks 1-4 Scenes 4-7", "TITLE": "Pattern"}
  ],
  "clip TURN": [
    {"MIKRO_CORNER": "T1-4 S1-4", "MIKRO_LINE3": "Drum Loop", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "Tracks 1-4 Scenes 1-4", "TITLE": "Pattern"},
    {"MIKRO_CORNER": "T2-5 S1-4", "MIKRO_LINE3": "Drum Loop", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "Tracks 2-5 Scenes 1-4", "TITLE": "Pattern"},
    {"MIKRO_CORNER": "T3-6 S1-4", "MIKRO_LINE3": "Drum Loop", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "Tracks 3-6 Scenes 1-4", "TITLE": "Pattern"},
    {"MIKRO_CORNER": "T4-6 S1-4", "MIKRO_LINE3": "Drum Loop", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "Tracks 4-6 Scenes 1-4", "TITLE": "Pattern"}
  ],
  "drum TURN": [
    {"MIKRO_CORNER": "Kit-Core 909", "MIKRO_LINE3": "Kick 909 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Kit-Core 909", "TITLE": "1-Drums"},
    {"popup": "Pads\nE1 - G2"},
    {"popup": "Pads\nG#1 - B2"},
    {"popup": "Pads\nC2 - D#3"}
  ],
  "events EVENTS + TURN": [
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "Drum Loop", "TITLE": "Events"},
    {"popup": "Pads\nE1 - G2"},
    {"popup": "Pads\nG#1 - B2"},
    {"popup": "Pads\nC2 - D#3"}
  ],
  "keyboard PUSH + TURN": [
    {"MIKRO_CORNER": "C Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C3", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Keyboard  C Major", "TITLE": "3-Keys"},
    {"MIKRO_CORNER": "C# Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C#3", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Keyboard  C# Major", "TITLE": "3-Keys"},
    {"MIKRO_CORNER": "D Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "D3", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Keyboard  D Major", "TITLE": "3-Keys"},
    {"MIKRO_CORNER": "D# Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "D#3", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Keyboard  D# Major", "TITLE": "3-Keys"}
  ],
  "keyboard SHIFT + TURN": [
    {"MIKRO_CORNER": "C Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C3", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Keyboard  C Major", "TITLE": "3-Keys"},
    {"MIKRO_CORNER": "C Minor", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C3", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Keyboard  C Minor", "TITLE": "3-Keys"},
    {"MIKRO_CORNER": "C Dorian", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C3", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Keyboard  C Dorian", "TITLE": "3-Keys"},
    {"MIKRO_CORNER": "C Mixolydian", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C3", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Keyboard  C Mixolydian", "TITLE": "3-Keys"}
  ],
  "keyboard TURN": [
    {"MIKRO_CORNER": "C Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C3", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Keyboard  C Major", "TITLE": "3-Keys"},
    {"MIKRO_CORNER": "C Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C4", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Keyboard  C Major", "TITLE": "3-Keys"},
    {"MIKRO_CORNER": "C Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C5", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Keyboard  C Major", "TITLE": "3-Keys"},
    {"MIKRO_CORNER": "C Major", "MIKRO_LINE3": "Octave", "MIKRO_LINE3_VALUE": "C6", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "3", "SUBTITLE": "Keyboard  C Major", "TITLE": "3-Keys"}
  ],
  "scene TURN": [
    {"MIKRO_CORNER": "1 - 4 of 4", "MIKRO_LINE3": "Intro", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "1 - 4 of 4", "TITLE": "Scenes"},
    {"MIKRO_CORNER": "2 - 4 of 4", "MIKRO_LINE3": "Intro", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "2 - 4 of 4", "TITLE": "Scenes"},
    {"MIKRO_CORNER": "3 - 4 of 4", "MIKRO_LINE3": "Intro", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "3 - 4 of 4", "TITLE": "Scenes"},
    {"MIKRO_CORNER": "4 - 4 of 4", "MIKRO_LINE3": "Intro", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "4 - 4 of 4", "TITLE": "Scenes"}
  ],
  "slicing TURN": [
    {"MIKRO_CORNER": "Break 120 bpm", "MIKRO_LINE3": "Slice 1", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Break 120 bpm", "TITLE": "1-Drums"},
    {"popup": "Slices\n5 - 20"},
    {"popup": "Slices\n9 - 24"},
    {"popup": "Slices\n13 - 28"}
  ],
  "step PUSH + TURN": [
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "Page 1/2  1/16", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Step Kick 909 1", "TITLE": "Kick 909 1"},
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "Page 1/2  1/16", "MIKRO_LINE3_VALUE": "C#1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Step Snare", "TITLE": "Snare"},
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "Page 1/2  1/16", "MIKRO_LINE3_VALUE": "D1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Step Closed Hat", "TITLE": "Closed Hat"},
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "Page 1/2  1/16", "MIKRO_LINE3_VALUE": "D#1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Step Open Hat", "TITLE": "Open Hat"}
  ],
  "step SHIFT + TURN": [
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "Page 1/2  1/16", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Step Kick 909 1", "TITLE": "Kick 909 1"},
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "Page 1/1  1/8", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Step Kick 909 1", "TITLE": "Kick 909 1"},
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "Page 1/1  1/4", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Step Kick 909 1", "TITLE": "Kick 909 1"}
  ],
  "step TURN": [
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "Page 1/2  1/16", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Step Kick 909 1", "TITLE": "Kick 909 1"},
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "Page 2/2  1/16", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Step Kick 909 1", "TITLE": "Kick 909 1"},
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "Page 3/3  1/16", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Step Kick 909 1", "TITLE": "Kick 909 1"},
    {"MIKRO_CORNER": "", "MIKRO_LINE3": "Page 4/4  1/16", "MIKRO_LINE3_VALUE": "C1", "MIKRO_TRACK_FLAGS": 4, "MIKRO_TRACK_LABEL": "1", "SUBTITLE": "Step Kick 909 1", "TITLE": "Kick 909 1"}
  ],
  "track TURN": [
    {"MIKRO_CORNER": "1 - 6 of 6", "MIKRO_LINE3": "1-Drums", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "1 - 6 of 6", "TITLE": "Tracks"},
    {"MIKRO_CORNER": "2 - 6 of 6", "MIKRO_LINE3": "1-Drums", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "2 - 6 of 6", "TITLE": "Tracks"},
    {"MIKRO_CORNER": "3 - 6 of 6", "MIKRO_LINE3": "1-Drums", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "3 - 6 of 6", "TITLE": "Tracks"},
    {"MIKRO_CORNER": "4 - 6 of 6", "MIKRO_LINE3": "1-Drums", "MIKRO_LINE3_VALUE": "", "MIKRO_TRACK_FLAGS": 0, "MIKRO_TRACK_LABEL": "", "SUBTITLE": "4 - 6 of 6", "TITLE": "Tracks"}
  ]
 },
 "mk3": {
  "chords TURN": {"anim": "detent-chords", "frames": 4, "still": "chords"},
  "drum PAD + TURN": {"anim": "detent-drum-pad", "frames": 4, "still": "pad-mode"},
  "drum TURN": {"anim": "detent-drum", "frames": 4, "still": "pad-mode"},
  "keyboard SHIFT + TURN": {"anim": "detent-keyboard-shift", "frames": 4, "still": "keyboard"},
  "keyboard TURN": {"anim": "detent-keyboard", "frames": 4, "still": "keyboard"},
  "playing FIXED VEL + TURN": {"anim": "detent-fixed-vel", "frames": 4, "still": "pad-mode"},
  "transport REC + TURN": {"anim": "detent-rec", "frames": 4, "still": "pad-mode"}
 }
};
