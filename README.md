# MASCHINE for Ableton Live: interactive manual (v2)

Click any control on a schematic MASCHINE MIKRO MK3 or MK3 to see everything it does, hover a
combination to see it on the controller, search, light / dark themes, deep links
(`#mikro/SHIFT`, `#mk3/PLUG-IN`).

It is a static site (no build step): `index.html`, `css/`, `js/` and `data/features.json`.

## Updating the content

All content comes from `data/features.json`, a copy of `docs/features.json` from the script
repository ([MMMk3-MIDI-Script-For-Live](https://github.com/Elton47/MMMk3-MIDI-Script-For-Live), private),
which also generates the Markdown user guide. Edit it there, then copy it here.

## Running locally

```
python -m http.server 8000
```

then open http://localhost:8000 (opening `index.html` directly can't load the data file).

## Publishing

GitHub Pages: Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`.
