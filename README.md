# MASCHINE for Ableton Live: interactive manual (v2)

A step-by-step setup guide (`#setup`: choose your computer, controller and Live version, then
follow the steps), and an interactive manual: click any control on a drawing of the MASCHINE MIKRO
MK3 or MK3 to see everything it does, hover a combination to see it on the controller, search,
light / dark / system theme, deep links (`#mikro/SHIFT`, `#mk3/PLUG-IN`,
`#setup/win11/mikro/live12/3`). `#highlights` is a self-playing tour of the best features on
the controller drawing (`#highlights/3`, `#highlights/mk3/3` open a given highlight).

It is a static site (no build step): `index.html`, `css/`, `js/` and `data/` (`features.json`
for the manual, `install.json` for the setup guide).

## Updating the content

All content comes from `data/features.json` and `data/install.json`, copies of the files in the
script repository's `docs/` folder (private), which also generate its Markdown user guide and
install guide. Edit them there, then copy them here.

## Running locally

```
python -m http.server 8000
```

then open http://localhost:8000 (opening `index.html` directly can't load the data file).

## Publishing

GitHub Pages: Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`.
