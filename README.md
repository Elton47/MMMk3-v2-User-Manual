# MASCHINE for Ableton Live: interactive manual (v2)

A step-by-step setup guide (`#setup`: choose your computer, controller and Live version, then
follow the steps), the **Highlights** (`#highlights`, `#highlights/3`, `#highlights/mk3/3`: one
page per feature, the best first, each played on the controller drawing, with a jump list by
mode), and the manual in two views, switched in the header (the choice is remembered):

- **Tour** (`#tour`): a self-playing card per section, acting it out on a drawing of the MASCHINE
  MIKRO MK3 or MK3: the presses, the pads and the screen, step by step (`#tour/settings`,
  `#tour/settings/4`, `#tour/mk3/drum/2`).
- **Full manual** (`#full`, `#full/<section>`): click any control on the drawing to see everything
  it does, hover a combination to see it on the controller, search, deep links (`#mikro/SHIFT`,
  `#mk3/PLUG-IN`, `#mikro?q=arp`).

**Report an issue** (`report.html`): a support form (Live version, operating system, hardware,
script version and a description are required; steps, what was expected, an email address and up to
three .txt / .log files are optional), where to find the log files with a copy button for each path,
and the known issues (`data/known-issues.json`). The form is checked on the page and sent to the
report service at `REPORT_URL` in `js/report.js`.

`#<section>` (`#browser`) opens that section in the view chosen last. Light / dark / system
theme; setup deep links like `#setup/win11/mikro/live12/3`.

The accent colour is one of MASCHINE's 16 pad colours (`data/palette.json`): Auto picks a new one
every day at 12:00 over the first 14, or the visitor pins one with the pads button in the header.
Every rounded corner uses one radius family (`--r`, `--r-s`, `--r-xs`, `--r-full`, and `--r-pad`
for pads).

It is a static site (no build step): `index.html`, `css/`, `js/` and `data/` (`features.json`
for the manual, `install.json` for the setup guide).

## Checks

```
node --test
```

runs `tests/` (no dependencies): every Highlights page played to its end (`tests/harness.js`: the callout on a control the page names, each page in its own mode, each controller's own screens), the radius family, the Report an issue form's checks, and the day colour against the dev chat's
palette and day rule, with the contrast of every colour in both themes.

## Updating the content

All content comes from `data/features.json`, `data/install.json` and `data/palette.json`, copies of the files in the
script repository's `docs/` folder (private), which also generate its Markdown user guide and
install guide. Edit them there, then copy them here.

## Running locally

```
python -m http.server 8000
```

then open http://localhost:8000 (opening `index.html` directly can't load the data file).

## Publishing

GitHub Pages: Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`.
