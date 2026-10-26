// The Report an issue page (report.html): the known issues (data/known-issues.json), a report form,
// and where the log files are, with a copy button for each path.
//
// The form is checked here, then sent as JSON to the report service (REPORT_URL), which checks
// everything again. The rules below and the service's must stay the same: the choices (OPTIONS),
// the lengths (LIMITS), at most 3 files, .txt or .log only (rotated logs such as bridge.log.1 too),
// 2 MB each. A larger file is cut to its last 2 MB here (the end of a log is what matters), from the
// start of a line.
//
// data/known-issues.json: {"issues": [{"title", "affects", "status", "workaround"}]}; every field but
// the title is optional. An empty list says so.
//
// The spam check: Cloudflare Turnstile. Its script loads from challenges.cloudflare.com on this page
// only, and only once the report service and the site key are filled in. Its widget gives the visitor
// a one-time token (most people see nothing, some one click). Send stays off until a token exists, the
// token goes with the report (turnstile_token), and after every answer the widget makes a new one.
// The report service checks the token with Cloudflare before anything else counts.
//
// The pure parts (validate, keepTail, logPaths, answerMessage, createSpamCheck) also run in Node:
// tests/report.test.js.
(function (root) {
  'use strict';

  // The report service's address and the Turnstile widget's site key (public, from the Cloudflare
  // dashboard: the report service's README). Until both are set, the page says that reports can't be
  // sent yet, and loads nothing from Cloudflare.
  var REPORT_URL = 'https://maschine-reports.YOUR-SUBDOMAIN.workers.dev/report';
  var TURNSTILE_SITE_KEY = 'PASTE-THE-TURNSTILE-SITE-KEY-HERE';
  var TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  var TURNSTILE_ACTION = 'report';  // the report service accepts only tokens made for this action
  var TURNSTILE_LOAD_MS = 20000;    // no script by then: blocked (an ad blocker that never answers)
  var TIMEOUT_MS = 45000;

  var OPTIONS = {
    os: ['Windows 10', 'Windows 11', 'macOS'],
    hardware: ['MASCHINE MIKRO MK3', 'MASCHINE MK3', 'MASCHINE+'],
    // newest first; add each new release at the top (and in the report service)
    script_version: ['v2.0.0', 'v1.6.1', 'v1.6.0', 'v1.5.1', 'v1.5.0', 'v1.4.0', 'v1.3.0', 'v1.2.0', 'v1.1.0', 'v1.0.0']
  };
  var LIMITS = { live_version: 40, description: 8000, steps: 8000, expected: 4000, email: 254, files: 3, file_bytes: 2 * 1024 * 1024 };
  var FILE_NAME = /\.(txt|log|log\.[0-9])$/i;
  var EMAIL = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  var LABELS = { os: 'your operating system', hardware: 'your hardware', script_version: 'the script version' };

  function text(value) { return typeof value === 'string' ? value.trim() : ''; }
  function utf8Length(value) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).length;
    return unescape(encodeURIComponent(value)).length;
  }

  // The report's problems: {field: message}, empty when it can be sent. Files: [{name, text}].
  function validate(report) {
    var errors = {};
    var live = text(report.live_version);
    if (!live) errors.live_version = 'Enter your Live version.';
    else if (live.length > LIMITS.live_version) errors.live_version = 'Use at most ' + LIMITS.live_version + ' characters.';
    else if (!/[0-9]/.test(live)) errors.live_version = 'Enter the version number, for example 12.1.10.';
    ['os', 'hardware', 'script_version'].forEach(function (field) {
      if (OPTIONS[field].indexOf(report[field]) < 0) errors[field] = 'Select ' + LABELS[field] + '.';
    });
    var description = text(report.description);
    if (!description) errors.description = 'Describe the issue.';
    ['description', 'steps', 'expected'].forEach(function (field) {
      if (!errors[field] && text(report[field]).length > LIMITS[field]) errors[field] = 'Use at most ' + LIMITS[field] + ' characters.';
    });
    var email = text(report.email);
    if (email && (email.length > LIMITS.email || !EMAIL.test(email))) errors.email = 'Enter a valid email address, or leave the field empty.';
    var files = report.files || [];
    if (files.length > LIMITS.files) errors.attachments = 'Attach at most ' + LIMITS.files + ' files.';
    else if (files.some(function (f) { return !FILE_NAME.test(f.name || ''); })) errors.attachments = 'Only .txt and .log files can be attached.';
    else if (files.some(function (f) { return typeof f.text !== 'string' || utf8Length(f.text) > LIMITS.file_bytes; })) errors.attachments = 'Each file can be at most 2 MB.';
    return errors;
  }

  // A file's text, at most `limit` bytes: the whole file, or its end from the start of a line with a
  // first line that says so. bytes: Uint8Array, the whole file, or its end when size (the whole
  // file's size) is larger. -> {text, cut}
  function keepTail(bytes, limit, size) {
    var decoder = new TextDecoder('utf-8');
    size = size || bytes.length;
    if (size <= limit) return { text: decoder.decode(bytes), cut: false };
    var room = limit - 200;  // the note and a possibly replaced first character
    var tail = decoder.decode(bytes.subarray(Math.max(0, bytes.length - room)));
    var line = tail.indexOf('\n');
    if (line >= 0 && line < 4096) tail = tail.slice(line + 1);
    var note = '[Shortened to the last 2 MB: the first ' + (size - room) + ' bytes are left out.]\n';
    return { text: note + tail, cut: true };
  }

  // The log files' paths for 'windows' or 'mac'. version: what the visitor typed as the Live
  // version (Live's folder is named after it, e.g. "Live 12.1.10").
  function logPaths(os, version) {
    var v = /^[0-9]+\.[0-9]+(\.[0-9]+)?$/.test(text(version)) ? text(version) : 'x.y.z';
    if (os === 'mac') {
      return [
        { label: 'MASCHINE for Ableton Live (bridge.log)', value: '~/Library/Logs/Maschine Bridge/bridge.log' },
        { label: 'Ableton Live (Log.txt)', value: '~/Library/Preferences/Ableton/Live ' + v + '/Log.txt' }
      ];
    }
    return [
      { label: 'MASCHINE for Ableton Live (bridge.log)', value: '%LOCALAPPDATA%\\Maschine Bridge\\bridge.log' },
      { label: 'Ableton Live (Log.txt)', value: '%APPDATA%\\Ableton\\Live ' + v + '\\Preferences\\Log.txt' }
    ];
  }

  var LOG_TIPS = {
    windows: 'Copy a path, paste it into the file name box of the Attachments dialog and press Enter. ' +
      'Live x.y.z is your Live version, for example Live 12.1.10. Older parts of the bridge log are bridge.log.1 and bridge.log.2 in the same folder.',
    mac: 'In the Attachments dialog, press Shift+Command+G, paste the path and press Return. ' +
      'The Library folder is hidden in Finder, this opens it directly. Live x.y.z is your Live version, for example Live 12.1.10.'
  };

  // --- the spam check ---------------------------------------------------------------------

  var TEXTS = {
    waiting: 'Send turns on after a quick spam check.',
    blocked: 'The spam check could not load. Allow challenges.cloudflare.com in your browser or ad blocker and reload the page, or reply to your purchase email and we will help.',
    failed: 'The spam check failed. Reload the page and try again.',
    unavailable: 'The spam check is not reachable at the moment. Please try again in a minute.'
  };

  function isConfigured(url, siteKey) {
    return /^https:\/\//.test(url || '') && url.indexOf('YOUR-SUBDOMAIN') < 0 && !!siteKey && siteKey.indexOf('PASTE') < 0;
  }

  // The page's theme (html data-theme: light, dark, or none for the system's) as Turnstile's.
  function turnstileTheme(dataTheme) { return dataTheme === 'light' || dataTheme === 'dark' ? dataTheme : 'auto'; }

  function withToken(report, token) {
    var sent = {};
    Object.keys(report).forEach(function (key) { sent[key] = report[key]; });
    sent.turnstile_token = token;
    return sent;
  }

  // The widget's life: state 'off' (not configured), 'loading', 'waiting' (no token), 'ready',
  // 'blocked' (the script did not load) or 'failed' (the widget reported an error). The page passes
  // in how to load a script, Turnstile itself, the theme, a timer and onChange (tests pass fakes).
  function createSpamCheck(opts) {
    var check = { state: 'off' };
    var widget = null, value = null;
    function set(state) {
      check.state = state;
      if (opts.onChange) opts.onChange(state);
    }
    function draw() {
      var turnstile = opts.turnstile();
      if (!turnstile) { set('blocked'); return; }
      value = null;
      set('waiting');
      try {
        widget = turnstile.render(opts.container, {
          sitekey: opts.siteKey,
          action: TURNSTILE_ACTION,
          theme: opts.theme(),
          appearance: 'interaction-only',
          'response-field': false,
          'refresh-expired': 'auto',
          callback: function (token) { value = token; set('ready'); },
          'expired-callback': function () { value = null; set('waiting'); },
          'error-callback': function () { value = null; set('failed'); return true; }
        });
      } catch (e) {
        widget = null;
        set('failed');
      }
    }
    check.start = function (configured) {
      if (!configured) { set('off'); return; }
      set('loading');
      opts.loadScript(TURNSTILE_SCRIPT,
        function () { if (check.state === 'loading') draw(); },
        function () { if (check.state === 'loading') set('blocked'); });
      opts.timer(function () { if (check.state === 'loading') set('blocked'); }, TURNSTILE_LOAD_MS);
    };
    check.token = function () { return value; };
    // after every answer: the token is spent, the widget makes a new one
    check.reset = function () {
      value = null;
      var turnstile = opts.turnstile();
      if (!turnstile || widget === null) return;
      try { turnstile.reset(widget); } catch (e) { /* the next draw makes a new one */ }
      set('waiting');
    };
    // the page's theme changed: the widget again, in the new theme
    check.redraw = function () {
      var turnstile = opts.turnstile();
      if (!turnstile || widget === null) return;
      try { turnstile.remove(widget); } catch (e) { /* already gone */ }
      widget = null;
      draw();
    };
    return check;
  }

  // Send is on without the spam check only when the page is not configured (it then says so).
  function canSend(check) { return check.state === 'off' || (check.state === 'ready' && !!check.token()); }

  // The report service's answer as the page's message: {kind: 'ok' | 'bad', text}.
  function answerMessage(status, body) {
    body = body || {};
    function bad(textValue) { return { kind: 'bad', text: textValue }; }
    if (status === 200 && body.ok) return { kind: 'ok', text: 'Your report was sent. Reference number: ' + body.reference + '. Thank you.' };
    if (status === 429) return bad('Too many reports were sent from this connection. Please try again in an hour.');
    if (status === 400 && body.fields) return bad('Please check the highlighted fields.');
    if (body.error === 'spam_check_failed') return bad(TEXTS.failed);
    if (body.error === 'spam_check_unavailable') return bad(TEXTS.unavailable);
    return bad('The report could not be sent. Please try again later.');
  }

  var api = {
    REPORT_URL: REPORT_URL, TURNSTILE_SITE_KEY: TURNSTILE_SITE_KEY, OPTIONS: OPTIONS, LIMITS: LIMITS, FILE_NAME: FILE_NAME, TEXTS: TEXTS,
    validate: validate, keepTail: keepTail, logPaths: logPaths, isConfigured: isConfigured, turnstileTheme: turnstileTheme,
    withToken: withToken, createSpamCheck: createSpamCheck, canSend: canSend, answerMessage: answerMessage
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  var doc = root.document;
  if (!doc || !root.MM) return;

  // --- the page ---------------------------------------------------------------------------

  var MM = root.MM, el = MM.el, h = MM.h;
  var FIELDS = ['live_version', 'os', 'hardware', 'script_version', 'description', 'steps', 'expected', 'email'];
  var attached = [];  // [{name, text, cut, size}]
  var logsOs = null;
  var spam = null;       // the spam check (createSpamCheck)
  var sending = false;

  // Send: off while a report is on its way, and until the spam check gave a token
  function updateSend() { el('report-send').disabled = sending || !canSend(spam); }

  function showSpam(state) {
    var line = el('spam-check-status');
    var textValue = state === 'loading' || state === 'waiting' ? TEXTS.waiting : (TEXTS[state] || '');
    line.textContent = textValue;
    line.hidden = !textValue;
    line.classList.toggle('rep-spam-bad', state === 'blocked' || state === 'failed');
    updateSend();
  }

  function startSpamCheck() {
    var html = doc.documentElement;
    var drawnTheme = turnstileTheme(html.getAttribute('data-theme'));
    spam = createSpamCheck({
      siteKey: TURNSTILE_SITE_KEY,
      container: el('spam-check'),
      theme: function () { drawnTheme = turnstileTheme(html.getAttribute('data-theme')); return drawnTheme; },
      loadScript: function (src, onload, onerror) {
        var script = doc.createElement('script');
        script.src = src;
        script.onload = onload;
        script.onerror = onerror;
        doc.head.appendChild(script);
      },
      turnstile: function () { return root.turnstile; },
      timer: function (fn, ms) { setTimeout(fn, ms); },
      onChange: showSpam
    });
    spam.start(isConfigured(REPORT_URL, TURNSTILE_SITE_KEY));
    updateSend();
    // the theme menu (Light / Dark / System): the widget follows
    if (root.MutationObserver) {
      new MutationObserver(function () {
        if (turnstileTheme(html.getAttribute('data-theme')) !== drawnTheme) spam.redraw();
      }).observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    }
  }

  function knownIssues() {
    var list = el('known-list');
    function show(issues) {
      list.textContent = '';
      if (!issues.length) {
        list.appendChild(h('p', { className: 'rep-muted', text: 'No known issues at the moment.' }));
        return;
      }
      var ul = h('ul', { className: 'rep-issues' });
      issues.forEach(function (issue) {
        if (!issue || !issue.title) return;
        ul.appendChild(h('li', {}, [
          h('h3', { text: issue.title }),
          issue.affects ? h('p', { className: 'rep-muted', text: 'Affects: ' + issue.affects }) : null,
          issue.status ? h('p', { className: 'rep-status', text: issue.status }) : null,
          issue.workaround ? h('p', { text: 'Workaround: ' + issue.workaround }) : null
        ]));
      });
      list.appendChild(ul);
    }
    fetch('data/known-issues.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      show(data && Array.isArray(data.issues) ? data.issues : []);
    }).catch(function () { show([]); });
  }

  function copyField(item) {
    var button = h('button', { type: 'button', className: 'btn btn-tonal', 'aria-label': 'Copy ' + item.label + ': ' + item.value },
      [MM.icon('copy'), h('span', { text: 'Copy' })]);
    button.addEventListener('click', function () {
      MM.copyText(item.value).then(function () {
        button.classList.add('copied');
        button.replaceChild(MM.icon('check'), button.firstChild);
        button.lastChild.textContent = 'Copied';
        MM.snackbar('Copied: ' + item.value);
        setTimeout(function () {
          button.classList.remove('copied');
          button.replaceChild(MM.icon('copy'), button.firstChild);
          button.lastChild.textContent = 'Copy';
        }, 1800);
      }, function () {
        MM.snackbar('Could not copy. Select the text and copy it by hand.');
      });
    });
    return h('div', { className: 'copy-field' }, [
      h('span', { className: 'copy-label', text: item.label }),
      h('code', { className: 'copy-value', text: item.value }),
      button
    ]);
  }

  function showLogs(os) {
    logsOs = os;
    doc.querySelectorAll('[data-logs-os]').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-logs-os') === os));
    });
    var list = el('logs-list');
    list.textContent = '';
    logPaths(os, el('live_version').value).forEach(function (item) { list.appendChild(copyField(item)); });
    el('logs-tip').textContent = LOG_TIPS[os];
  }

  function guessOs() {
    var chosen = el('os').value;
    if (chosen) return chosen === 'macOS' ? 'mac' : 'windows';
    var ua = (root.navigator && root.navigator.userAgent) || '';
    return /Mac/.test(ua) && !/like Mac/.test(ua) ? 'mac' : 'windows';
  }

  function showError(field, message) {
    var node = el(field + '-error'), input = el(field);
    node.textContent = message || '';
    node.hidden = !message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function showFiles() {
    var list = el('attachments-list');
    list.textContent = '';
    list.hidden = !attached.length;
    attached.forEach(function (file) {
      var size = file.size < 1024 * 1024 ? Math.max(1, Math.round(file.size / 1024)) + ' KB' : (file.size / 1024 / 1024).toFixed(1) + ' MB';
      list.appendChild(h('li', {}, [
        h('span', { className: 'rep-file-name', text: file.name }),
        h('span', { className: 'rep-muted', text: size + (file.cut ? ', shortened to the last 2 MB' : '') })
      ]));
    });
  }

  function readFiles(input) {
    var files = Array.prototype.slice.call(input.files || []);
    showError('attachments', '');
    if (files.length > LIMITS.files) {
      attached = [];
      showFiles();
      showError('attachments', 'Attach at most ' + LIMITS.files + ' files.');
      return;
    }
    if (files.some(function (f) { return !FILE_NAME.test(f.name); })) {
      attached = [];
      showFiles();
      showError('attachments', 'Only .txt and .log files can be attached.');
      return;
    }
    Promise.all(files.map(function (file) {
      // only the end is read when the file is larger than the limit
      var part = file.size > LIMITS.file_bytes ? file.slice(file.size - LIMITS.file_bytes) : file;
      return part.arrayBuffer().then(function (buffer) {
        var kept = keepTail(new Uint8Array(buffer), LIMITS.file_bytes, file.size);
        return { name: file.name, text: kept.text, cut: kept.cut, size: file.size };
      });
    })).then(function (list) {
      attached = list;
      showFiles();
    }, function () {
      attached = [];
      showFiles();
      showError('attachments', 'A file could not be read. Please choose it again.');
    });
  }

  function message(kind, textValue) {
    var box = el('report-message');
    box.textContent = '';
    if (!kind) return;
    box.appendChild(h('p', { className: 'note ' + kind }, [MM.icon(kind === 'ok' ? 'check' : 'alert'), h('span', { text: textValue })]));
  }

  function collect() {
    var report = {};
    FIELDS.forEach(function (field) { report[field] = el(field).value; });
    report.website = el('website').value;
    report.files = attached.map(function (f) { return { name: f.name, text: f.text }; });
    return report;
  }

  function submit(event) {
    event.preventDefault();
    message(null);
    var report = collect();
    var errors = validate(report);
    FIELDS.concat(['attachments']).forEach(function (field) { showError(field, errors[field]); });
    var first = FIELDS.concat(['attachments']).filter(function (f) { return errors[f]; })[0];
    if (first) {
      el(first).focus();
      message('bad', 'Please check the highlighted fields.');
      return;
    }
    if (spam.state === 'off') {
      message('bad', 'Reports cannot be sent from this page yet. Please try again later.');
      return;
    }
    if (!canSend(spam)) {
      message('bad', spam.state === 'blocked' || spam.state === 'failed' ? TEXTS[spam.state] : TEXTS.waiting);
      return;
    }
    var send = el('report-send');
    sending = true;
    updateSend();
    send.firstChild.textContent = 'Sending…';
    var controller = root.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, TIMEOUT_MS);
    fetch(REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withToken(report, spam.token())),
      signal: controller ? controller.signal : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) { return { status: r.status, body: body }; });
    }).then(function (answer) {
      var said = answerMessage(answer.status, answer.body);
      if (said.kind === 'ok') {
        el('report-form').reset();
        attached = [];
        showFiles();
        showLogs(guessOs());
      } else if (answer.status === 400 && answer.body.fields) {
        Object.keys(answer.body.fields).forEach(function (field) { if (el(field + '-error')) showError(field, answer.body.fields[field]); });
      }
      message(said.kind, said.text);
    }, function () {
      message('bad', 'The report could not be sent. Please check your connection and try again.');
    }).then(function () {
      clearTimeout(timer);
      // whatever the answer, the token is spent: a retry gets a fresh one
      spam.reset();
      sending = false;
      updateSend();
      send.firstChild.textContent = 'Send report';
    });
  }

  function init() {
    MM.initTheme();
    var bar = doc.querySelector('.top-app-bar');
    root.addEventListener('scroll', function () { bar.classList.toggle('scrolled', root.scrollY > 4); }, { passive: true });
    knownIssues();
    showLogs(guessOs());
    doc.querySelectorAll('[data-logs-os]').forEach(function (b) {
      b.addEventListener('click', function () { showLogs(b.getAttribute('data-logs-os')); });
    });
    el('os').addEventListener('change', function () { showLogs(guessOs()); });
    el('live_version').addEventListener('input', function () { showLogs(logsOs); });
    el('attachments').addEventListener('change', function () { readFiles(el('attachments')); });
    FIELDS.forEach(function (field) {
      el(field).addEventListener('input', function () { if (!el(field + '-error').hidden) showError(field, ''); });
    });
    el('report-form').addEventListener('submit', submit);
    startSpamCheck();
  }

  init();
})(typeof window !== 'undefined' ? window : globalThis);
