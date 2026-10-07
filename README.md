# MASCHINE for Ableton Live: interactive manual (v2)

A step-by-step setup guide (`#setup`: choose your computer, controller and Live version, then
follow the steps), and the manual in two views, switched in the header (the choice is
remembered):

- **Tour** (`#tour`): a self-playing card per section, acting it out on a drawing of the MASCHINE
  MIKRO MK3 or MK3: the presses, the pads and the screen, step by step (`#tour/settings`,
  `#tour/settings/4`, `#tour/mk3/drum/2`; `#highlights`, `#highlights/3` open the Highlights card).
- **Full manual** (`#full`, `#full/<section>`): click any control on the drawing to see everything
  it does, hover a combination to see it on the controller, search, deep links (`#mikro/SHIFT`,
  `#mk3/PLUG-IN`, `#mikro?q=arp`).

`#<section>` (`#browser`) opens that section in the view chosen last. Light / dark / system
theme; setup deep links like `#setup/win11/mikro/live12/3`.

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
