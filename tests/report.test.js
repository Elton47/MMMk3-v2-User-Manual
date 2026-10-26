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

// --- the spam check (Cloudflare Turnstile): js/report.js loads it, the report service checks the token ---

// A fake Turnstile and page around report.createSpamCheck: what was loaded, rendered and reset.
function spamCheck(options) {
  const seen = { scripts: [], renders: [], resets: [], removes: [], states: [], timers: [] };
  const turnstile = {
    render(container, params) { seen.renders.push({ container, params }); return 'w' + seen.renders.length; },
    reset(id) { seen.resets.push(id); },
    remove(id) { seen.removes.push(id); }
  };
  let loaded = null;
  const check = report.createSpamCheck(Object.assign({
    siteKey: '0x4AAAAAAA-real-looking-key',
    container: 'the-box',
    theme: () => 'dark',
    loadScript(src, onload, onerror) { seen.scripts.push(src); loaded = { onload, onerror }; },
    turnstile: () => (loaded && loaded.done ? turnstile : undefined),
    timer(fn, ms) { seen.timers.push({ fn, ms }); },
    onChange(state) { seen.states.push(state); }
  }, options || {}));
  const finishLoad = () => { loaded.done = true; loaded.onload(); };
  return { check, seen, finishLoad, failLoad: () => loaded.onerror() };
}

test('the spam check: nothing loads from Cloudflare until the report service and the site key are filled in', () => {
  const URL_PLACEHOLDER = 'https://maschine-reports.YOUR-SUBDOMAIN.workers.dev/report', KEY_PLACEHOLDER = 'PASTE-THE-TURNSTILE-SITE-KEY-HERE';
  assert.ok(!report.isConfigured(URL_PLACEHOLDER, KEY_PLACEHOLDER), 'placeholders are not a configuration');
  assert.ok(!report.isConfigured('https://maschine-reports.me.workers.dev/report', KEY_PLACEHOLDER));
  assert.ok(!report.isConfigured(URL_PLACEHOLDER, '0x4AAAAAAA-key'));
  assert.ok(report.isConfigured('https://maschine-reports.me.workers.dev/report', '0x4AAAAAAA-key'));
  const off = spamCheck({ siteKey: KEY_PLACEHOLDER });
  off.check.start(false);
  assert.strictEqual(off.check.state, 'off');
  assert.deepStrictEqual(off.seen.scripts, []);
});

test('the page ships pointing at the deployed report service and its Turnstile widget', () => {
  assert.ok(report.isConfigured(report.REPORT_URL, report.TURNSTILE_SITE_KEY));
  assert.match(report.REPORT_URL, /^https:\/\/maschine-reports\.[a-z0-9-]+\.workers\.dev\/report$/);
  assert.match(report.TURNSTILE_SITE_KEY, /^0x4[A-Za-z0-9_-]{10,}$/);
});

test('the spam check: Turnstile from challenges.cloudflare.com, rendered for the report, in the page\'s theme', () => {
  const s = spamCheck();
  s.check.start(true);
  assert.strictEqual(s.check.state, 'loading');
  assert.deepStrictEqual(s.seen.scripts, ['https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit']);
  s.finishLoad();
  assert.strictEqual(s.check.state, 'waiting');
  assert.strictEqual(s.seen.renders.length, 1);
  const { container, params } = s.seen.renders[0];
  assert.strictEqual(container, 'the-box');
  assert.strictEqual(params.sitekey, '0x4AAAAAAA-real-looking-key');
  assert.strictEqual(params.action, 'report');
  assert.strictEqual(params.theme, 'dark');
  assert.strictEqual(params.appearance, 'interaction-only');
  assert.strictEqual(params['response-field'], false);
  assert.strictEqual(report.turnstileTheme('light'), 'light');
  assert.strictEqual(report.turnstileTheme('dark'), 'dark');
  assert.strictEqual(report.turnstileTheme(null), 'auto');
});

test('the spam check: Send only with a token, the token goes with the report, and every answer gets a fresh one', () => {
  const s = spamCheck();
  s.check.start(true);
  s.finishLoad();
  assert.strictEqual(s.check.token(), null);
  assert.ok(!report.canSend(s.check));
  s.seen.renders[0].params.callback('token-1');
  assert.strictEqual(s.check.state, 'ready');
  assert.strictEqual(s.check.token(), 'token-1');
  assert.ok(report.canSend(s.check));
  assert.deepStrictEqual(report.withToken(GOOD, 'token-1'), Object.assign({}, GOOD, { turnstile_token: 'token-1' }));
  assert.ok(!('turnstile_token' in GOOD), 'the form\'s report is not changed');
  // the answer came (whatever it was): the token is spent, the widget makes a new one
  s.check.reset();
  assert.deepStrictEqual(s.seen.resets, ['w1']);
  assert.strictEqual(s.check.token(), null);
  assert.ok(!report.canSend(s.check));
  s.seen.renders[0].params.callback('token-2');
  assert.strictEqual(s.check.token(), 'token-2');
  // an expired token: Send waits for the next one
  s.seen.renders[0].params['expired-callback']();
  assert.strictEqual(s.check.token(), null);
  assert.strictEqual(s.check.state, 'waiting');
  // not configured: Send stays on, and the page says that reports can't be sent yet
  const off = spamCheck({ siteKey: report.TURNSTILE_SITE_KEY });
  off.check.start(false);
  assert.ok(report.canSend(off.check));
});

test('the spam check: blocked by an ad blocker or failing, the page says what to do', () => {
  const blocked = spamCheck();
  blocked.check.start(true);
  blocked.failLoad();
  assert.strictEqual(blocked.check.state, 'blocked');
  assert.ok(!report.canSend(blocked.check));
  assert.match(report.TEXTS.blocked, /^The spam check could not load\. Allow challenges\.cloudflare\.com/);
  assert.match(report.TEXTS.blocked, /reply to your purchase email/);
  // a script that never answers counts as blocked too
  const silent = spamCheck();
  silent.check.start(true);
  assert.ok(silent.seen.timers.length === 1 && silent.seen.timers[0].ms >= 10000);
  silent.seen.timers[0].fn();
  assert.strictEqual(silent.check.state, 'blocked');
  // the widget reports an error: no Send until it recovers with a token
  const failing = spamCheck();
  failing.check.start(true);
  failing.finishLoad();
  failing.seen.timers[0].fn();   // the load timer firing late changes nothing
  assert.strictEqual(failing.check.state, 'waiting');
  failing.seen.renders[0].params['error-callback']('300030');
  assert.strictEqual(failing.check.state, 'failed');
  assert.strictEqual(report.TEXTS.failed, 'The spam check failed. Reload the page and try again.');
  failing.seen.renders[0].params.callback('token-ok');
  assert.strictEqual(failing.check.state, 'ready');
});

test('the spam check: a theme change draws the widget again in the new theme', () => {
  let theme = 'light';
  const s = spamCheck({ theme: () => theme });
  s.check.start(true);
  s.finishLoad();
  s.seen.renders[0].params.callback('token-1');
  theme = 'dark';
  s.check.redraw();
  assert.deepStrictEqual(s.seen.removes, ['w1']);
  assert.strictEqual(s.seen.renders[1].params.theme, 'dark');
  assert.strictEqual(s.check.token(), null, 'the old token belonged to the old widget');
  s.check.reset();
  assert.deepStrictEqual(s.seen.resets, ['w2']);
});

test('the service\'s answers become plain messages, the spam check ones included', () => {
  assert.deepStrictEqual(report.answerMessage(403, { ok: false, error: 'spam_check_failed' }),
    { kind: 'bad', text: 'The spam check failed. Reload the page and try again.' });
  assert.match(report.answerMessage(503, { ok: false, error: 'spam_check_unavailable' }).text, /try again/);
  assert.strictEqual(report.answerMessage(200, { ok: true, reference: 42 }).kind, 'ok');
  assert.match(report.answerMessage(200, { ok: true, reference: 42 }).text, /Reference number: 42\./);
  assert.match(report.answerMessage(429, {}).text, /in an hour/);
  assert.match(report.answerMessage(400, { fields: { os: 'x' } }).text, /highlighted fields/);
  assert.match(report.answerMessage(403, { error: 'origin_not_allowed' }).text, /could not be sent/);
  assert.match(report.answerMessage(500, { error: 'not_configured' }).text, /could not be sent/);
});

test('the page: Turnstile allowed by the page\'s policy, only on this page, Send off until the check ran, said in the privacy note', () => {
  const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(HTML)[1];
  assert.match(csp, /script-src 'self' https:\/\/challenges\.cloudflare\.com;/);
  assert.match(csp, /frame-src https:\/\/challenges\.cloudflare\.com;/);
  // Turnstile's frame needs to know which site it runs on: the origin is sent, never the full address
  assert.match(HTML, /<meta name="referrer" content="strict-origin">/);
  assert.match(HTML, /<div id="spam-check" class="rep-spam"><\/div>/);
  assert.match(HTML, /<p class="rep-help" id="spam-check-status" role="status" aria-live="polite" hidden><\/p>/);
  assert.match(HTML, /<button type="submit" class="btn btn-filled has-icon-end" id="report-send" disabled>/);
  assert.match(HTML, /class="rep-privacy">[^<]*Cloudflare Turnstile[^<]*</);
  for (const name of fs.readdirSync(ROOT).filter((n) => n.endsWith('.html') && n !== 'report.html')) {
    assert.ok(!fs.readFileSync(path.join(ROOT, name), 'utf8').includes('challenges.cloudflare.com'), name);
  }
});
