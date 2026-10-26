// The setup page: two guides (text | video), the video per controller and computer, no loopMIDI anywhere,
// no Licence tab (activate.html is reached only by its own link), activation only as a note on the setup's
// last step, and upgrading to the full edition as a section of its own.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const INSTALL = JSON.parse(read('data/install.json'));
const TEXT = /\.(html|js|css|json|svg|md|txt|xml)$/i;

function siteFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.name === '.git' || entry.name === 'node_modules' || rel === 'tests') continue;
    if (entry.isDirectory()) out.push(...siteFiles(rel));
    else if (TEXT.test(entry.name)) out.push(rel);
  }
  return out;
}

// setup.js in node: only its pure parts (the video for a choice)
function setupModule() {
  const context = { MM: { el: () => null, h: () => null }, console };
  vm.createContext(context);
  vm.runInContext(read('js/setup.js'), context, { filename: 'setup.js' });
  return context.MM.setup;
}

test('no trace of loopMIDI in the site', () => {
  const hits = siteFiles('.').filter((f) => /loopmidi/i.test(fs.readFileSync(path.join(root, f), 'utf8')));
  assert.deepStrictEqual(hits, []);
});

test('the header has no Licence tab, and nothing shows one', () => {
  const index = read('index.html');
  assert.doesNotMatch(index, /licence-tab|href="activate\.html"/);
  const app = read('js/app.js');
  assert.doesNotMatch(app, /licence-tab|licensing/);
  assert.doesNotMatch(read('js/setup.js'), /licensing/);
  assert.ok(fs.existsSync(path.join(root, 'activate.html')));  // the page stays, unlisted
});

test('no release-day switch, no activation step, no activation button', () => {
  assert.strictEqual(INSTALL.licensing, undefined);
  const shown = INSTALL.steps.filter((s) => s.place !== 'none');
  assert.ok(!shown.some((s) => s.id === 'activate'));
  for (const step of shown) {
    assert.doesNotMatch(JSON.stringify(step), /activate\.html|Open the activation page/, step.id);
  }
});

test('the setup\'s last step says the controller asks for the key, next to the info icon', () => {
  const wizard = INSTALL.steps.filter((s) => (s.place || 'wizard') === 'wizard');
  const done = wizard.find((s) => s.id === 'done');
  const notes = done.body.filter((b) => b.note !== undefined && (b.kind || 'info') === 'info');
  const licence = notes.filter((b) => /licence key/.test(b.note));
  assert.strictEqual(licence.length, 1);
  assert.doesNotMatch(licence[0].note, /;/);
  // an info note: the #i-info icon, its text to the right, always visible (no tooltip)
  const setup = read('js/setup.js');
  assert.match(setup, /var NOTE_ICONS = \{ info: 'info'/);
  assert.match(read('css/styles.css'), /\.note \{\s*display: flex; gap: 12px;/);
  assert.match(read('index.html'), /<symbol id="i-info"/);
});

test('upgrading to the full edition is a section of its own, always shown', () => {
  const sections = INSTALL.steps.filter((s) => s.place === 'section');
  assert.deepStrictEqual(sections.map((s) => s.id), ['full_edition']);
  assert.strictEqual(sections[0].when, undefined);
  const text = JSON.stringify(sections[0]);
  assert.match(text, /\*\*Licence\*\*/);
  assert.doesNotMatch(text, /open the activation page|Connect/);
  const setup = read('js/setup.js');
  assert.match(setup, /state\.sections\.forEach\(function \(step\) \{ root\.appendChild\(sectionCard\(step\)\); \}\)/);
});

test('the video guide plays one of exactly four videos, for every controller and computer', () => {
  const setup = setupModule();
  const os = INSTALL.choices.find((c) => c.id === 'os').options.map((o) => o.id);
  const device = INSTALL.choices.find((c) => c.id === 'device').options.map((o) => o.id);
  const seen = new Set();
  for (const o of os) {
    for (const d of device) {
      const v = setup.videoFor(o, d);
      assert.ok(v, o + ' ' + d);
      assert.match(v.src, /^video\/(mikro|mk3)-setup-(windows|mac)\.mp4$/);
      assert.strictEqual(v.poster, v.src.replace(/\.mp4$/, '.jpg'));
      seen.add(v.src);
    }
  }
  assert.deepStrictEqual([...seen].sort(), ['video/mikro-setup-mac.mp4', 'video/mikro-setup-windows.mp4',
    'video/mk3-setup-mac.mp4', 'video/mk3-setup-windows.mp4']);
  assert.strictEqual(setup.videoFor('win10', 'plus').src, 'video/mk3-setup-windows.mp4');  // MASCHINE+: the MK3's
  assert.strictEqual(setup.videoFor('macos', 'mikro').src, 'video/mikro-setup-mac.mp4');
});

test('the player: controls, metadata only, a still, no autoplay', () => {
  const setup = read('js/setup.js');
  assert.match(setup, /h\('video', \{ className: 'setup-video', controls: true, preload: 'metadata', playsinline: true,\s*poster: video\.poster/);
  assert.doesNotMatch(setup, /autoplay/i);
});

test('the four videos and their stills are in the site, or none yet', (t) => {
  const names = ['mikro-setup-windows', 'mikro-setup-mac', 'mk3-setup-windows', 'mk3-setup-mac'];
  const files = names.flatMap((n) => ['video/' + n + '.mp4', 'video/' + n + '.jpg']);
  const there = files.filter((f) => fs.existsSync(path.join(root, f)));
  if (!there.length) {
    t.skip('the videos are not copied in yet');
    return;
  }
  assert.deepStrictEqual(there, files);
});
