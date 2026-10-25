// The Report an issue page (report.html, js/report.js): the form's choices match the page's
// dropdowns, a report is checked before it is sent (required fields, lengths, files), a large log
// keeps its end, and the log paths follow the Live version. Run: node --test tests
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const report = require(path.join(ROOT, 'js', 'report.js'));
const HTML = fs.readFileSync(path.join(ROOT, 'report.html'), 'utf8');

const GOOD = {
  live_version: '12.1.10', os: 'Windows 11', hardware: 'MASCHINE MIKRO MK3', script_version: 'v2.0.0',
  description: 'The pads stay dark after loading a set.', steps: '', expected: '', email: '', files: []
};

test('the dropdowns offer exactly the choices the check accepts, newest script version first', () => {
  for (const field of ['os', 'hardware', 'script_version']) {
    const select = new RegExp('<select id="' + field + '"[^>]*>([\\s\\S]*?)</select>').exec(HTML)[1];
    const options = [...select.matchAll(/<option>([^<]+)<\/option>/g)].map((m) => m[1]);
    assert.deepStrictEqual(options, report.OPTIONS[field], field);
  }
  assert.strictEqual(report.OPTIONS.script_version[0], 'v2.0.0');
});

test('every form field has its error line, and the required ones are marked', () => {
  for (const field of ['live_version', 'os', 'hardware', 'script_version', 'description', 'steps', 'expected', 'email', 'attachments']) {
    assert.ok(HTML.includes('id="' + field + '-error"'), field);
  }
  for (const field of ['live_version', 'os', 'hardware', 'script_version', 'description']) {
    assert.ok(new RegExp('id="' + field + '"[^>]*required').test(HTML), field + ' is required');
  }
});

test('a complete report passes, missing required fields do not', () => {
  assert.deepStrictEqual(report.validate(GOOD), {});
  const errors = report.validate({});
  assert.deepStrictEqual(Object.keys(errors).sort(), ['description', 'hardware', 'live_version', 'os', 'script_version']);
  assert.ok(report.validate(Object.assign({}, GOOD, { os: 'Linux' })).os);
  assert.ok(report.validate(Object.assign({}, GOOD, { live_version: 'latest' })).live_version);
  assert.ok(report.validate(Object.assign({}, GOOD, { description: '   ' })).description);
  assert.ok(report.validate(Object.assign({}, GOOD, { description: 'x'.repeat(8001) })).description);
  assert.ok(report.validate(Object.assign({}, GOOD, { email: 'not an email' })).email);
  assert.ok(report.validate(Object.assign({}, GOOD, { email: 'a`b@example.com' })).email);
  assert.deepStrictEqual(report.validate(Object.assign({}, GOOD, { email: 'name@example.com' })), {});
});

test('attachments: at most 3, .txt or .log (rotated logs too), 2 MB each', () => {
  const file = (name, text) => ({ name, text: text || 'line\n' });
  const ok = (files) => !report.validate(Object.assign({}, GOOD, { files })).attachments;
  assert.ok(ok([file('bridge.log'), file('Log.txt'), file('bridge.log.1')]));
  assert.ok(!ok([file('a.log'), file('b.log'), file('c.log'), file('d.log')]));
  assert.ok(!ok([file('crash.dmp')]));
  assert.ok(!ok([file('notes.txt.exe')]));
  assert.ok(!ok([file('big.log', 'x'.repeat(2 * 1024 * 1024 + 1))]));
  assert.ok(ok([file('edge.log', 'x'.repeat(2 * 1024 * 1024))]));
});

test('a log larger than 2 MB keeps its end, from the start of a line, and fits', () => {
  const limit = report.LIMITS.file_bytes;
  const lines = [];
  for (let i = 0; lines.join('\n').length < 3 * 1024 * 1024; i++) lines.push('2026-10-25 12:00:00 INFO line ' + i + ' ünïcode');
  const bytes = new TextEncoder().encode(lines.join('\n') + '\nTHE LAST LINE');
  const kept = report.keepTail(bytes, limit);
  assert.ok(kept.cut);
  assert.ok(new TextEncoder().encode(kept.text).length <= limit);
  assert.ok(kept.text.endsWith('THE LAST LINE'));
  const second = kept.text.split('\n')[1];
  assert.match(second, /^2026-10-25 12:00:00 INFO line \d+ ünïcode$/, 'whole lines only');
  assert.match(kept.text, /^\[Shortened to the last 2 MB/);
  // only the end of the file is read: the same result from the last 2 MB and the whole size
  const end = bytes.subarray(bytes.length - limit);
  assert.strictEqual(report.keepTail(end, limit, bytes.length).text, kept.text);
  // a small file is untouched
  assert.deepStrictEqual(report.keepTail(new TextEncoder().encode('short'), limit), { text: 'short', cut: false });
});

test('the log paths: the bridge log and Live\'s Log.txt on both systems, with the Live version filled in', () => {
  const win = report.logPaths('windows', '12.1.10').map((p) => p.value);
  assert.deepStrictEqual(win, ['%LOCALAPPDATA%\\Maschine Bridge\\bridge.log', '%APPDATA%\\Ableton\\Live 12.1.10\\Preferences\\Log.txt']);
  const mac = report.logPaths('mac', '12.2').map((p) => p.value);
  assert.deepStrictEqual(mac, ['~/Library/Logs/Maschine Bridge/bridge.log', '~/Library/Preferences/Ableton/Live 12.2/Log.txt']);
  assert.ok(report.logPaths('windows', 'no idea')[1].value.includes('Live x.y.z'));
});

test('the page sends only to the report service, over HTTPS, and has a spam trap', () => {
  assert.match(report.REPORT_URL, /^https:\/\/[^/]+\.workers\.dev\//);
  assert.match(HTML, /connect-src 'self' https:\/\/\*\.workers\.dev;/);
  assert.match(HTML, /<input id="website" name="website" type="text" tabindex="-1"/);
});
