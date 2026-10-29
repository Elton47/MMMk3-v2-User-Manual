// Every page boots. A single syntax error in one script (an unescaped apostrophe in a quoted string)
// stops app.js and leaves the manual blank, while the other tests, which load only some scripts, stay
// green. So: (1) every js/*.js file and every inline <script> parses, (2) every <script src> a page
// names exists, (3) in a real headless Chrome (skipped when none is installed) every page and view
// loads with no console error and shows content. Run: node --test
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const os = require('node:os');
const { spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const jsFiles = fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f);
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

test('every script file parses', () => {
  const bad = [];
  for (const file of jsFiles) {
    try { new vm.Script(read(file), { filename: file }); } catch (e) { bad.push(file + ': ' + e.message); }
  }
  assert.deepStrictEqual(bad, []);
});

test('every inline script parses and every script a page names exists', () => {
  const bad = [];
  for (const page of pages) {
    const html = read(page);
    for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      const src = /\bsrc="([^"]+)"/.exec(m[1]);
      if (src) {
        if (!/^https?:/.test(src[1]) && !fs.existsSync(path.join(ROOT, src[1].split(/[?#]/)[0]))) bad.push(page + ': missing ' + src[1]);
      } else if (!/type="(module|application\/(ld\+)?json)"/.test(m[1])) {
        try { new vm.Script(m[2], { filename: page }); } catch (e) { bad.push(page + ' inline script: ' + e.message); }
      }
    }
  }
  assert.deepStrictEqual(bad, []);
});

const CHROMES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].filter(Boolean);
const chrome = CHROMES.find((p) => fs.existsSync(p));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.webm': 'video/webm' };

function serve() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split(/[?#]/)[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function load(url, profile) {
  return new Promise((resolve, reject) => {
    const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      '--user-data-dir=' + profile, '--enable-logging=stderr', '--v=0', '--virtual-time-budget=6000', '--dump-dom', url];
    const child = spawn(chrome, args);
    let dom = '', log = '';
    child.stdout.on('data', (d) => { dom += d; });
    child.stderr.on('data', (d) => { log += d; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('timeout loading ' + url)); }, 60000);
    child.on('close', () => { clearTimeout(timer); resolve({ dom, log }); });
  });
}

// The console lines Chrome logs at INFO:CONSOLE that are errors of the page itself.
const consoleErrors = (log) => log.split(/\r?\n/).filter((l) => /:CONSOLE[^\]]*\]/.test(l) && /Uncaught|Error|Failed to load/.test(l));

// Every route of js/app.js, on both controllers where it has one.
const VIEWS = ['', '#setup', '#help', '#setup/print', '#manual', '#full', '#mikro', '#mk3', '#tour', '#highlights',
  '#highlights/mk3', '#cheatsheet', '#cheatsheet/mk3', '#whatsnew'].map((v) => 'index.html' + v)
  .concat(pages.filter((p) => p !== 'index.html'));

test('every page and view boots in a real browser with no console error', { skip: !chrome && 'no Chrome or Edge installed' }, async () => {
  const server = await serve();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-boot-'));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const bad = [];
  try {
    for (const view of VIEWS) {
      const { dom, log } = await load(base + view, profile);
      for (const line of consoleErrors(log)) bad.push(view + ': ' + line.replace(/^.*?:CONSOLE[^\]]*\]\s*/, ''));
      if (view.startsWith('index.html')) {
        const main = /<main id="main"[^>]*>([\s\S]*?)<\/main>/.exec(dom);
        const text = main ? main[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
        if (text.length < 40) bad.push(view + ': the page is empty');
        if (/class="load-error"/.test(dom)) bad.push(view + ': shows a load error');
      }
    }
  } finally {
    server.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
  assert.deepStrictEqual(bad, []);
});
