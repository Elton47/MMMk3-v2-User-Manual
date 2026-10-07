// The setup wizard: choices first, then a stepper. Content from data/install.json (a copy of
// docs/install.json in the script repository; the schema is described at the top of that file).
// Deep links: #setup (the questions), #setup/<os>/<device>/<live>/<step number>.
// #setup/print[/<choices>...] is the printable guide: every step on one page (see guide()).
MM.setup = (function () {
  'use strict';

  var el = MM.el, h = MM.h;
  var CHOICE_ICONS = { os: 'computer', device: 'pads', live: 'live' };
  var NOTE_ICONS = { info: 'info', important: 'alert', coming: 'soon' };
  var INLINE = /\*\*(.+?)\*\*|`([^`]+)`|\[\[([^\]]+)\]\]|\[([^\]]+)\]\(([^)\s]+)\)/g;

  // ctx: set while the printable guide renders ({choice id: [options still allowed]}); vars and
  // links follow it instead of the wizard's choices.
  var state = { data: null, choices: {}, steps: [], index: 0, detected: {}, focusStep: false, ctx: null };

  // --- data -------------------------------------------------------------------------------

  function choiceDefs() { return state.data.choices; }

  function findOption(choice, name) {
    if (!name) return null;
    name = String(name).toLowerCase();
    var hit = choice.options.filter(function (o) {
      return o.id === name || (o.aliases || []).indexOf(name) >= 0;
    })[0];
    return hit ? hit.id : null;
  }

  function optionLabel(choiceId, optionId) {
    var choice = choiceDefs().filter(function (c) { return c.id === choiceId; })[0];
    var option = choice && choice.options.filter(function (o) { return o.id === optionId; })[0];
    return option ? option.label : optionId;
  }

  function complete() {
    return choiceDefs().every(function (c) { return !!state.choices[c.id]; });
  }

  function matches(when) {
    return Object.keys(when || {}).every(function (choiceId) {
      return when[choiceId].indexOf(state.choices[choiceId]) >= 0;
    });
  }

  function stepsFor() {
    return state.data.steps.filter(function (step) { return matches(step.when); });
  }

  function fill(text) {
    return String(text).replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/g, function (m, name) {
      var v = state.data.vars[name];
      if (!v) return m;
      var value = state.ctx ? resolveVar(name, state.ctx) : v.values[state.choices[v.choice]];
      return value !== undefined ? value : v.generic;
    });
  }

  function routeHash(index) {
    return '#setup/' + choiceDefs().map(function (c) { return state.choices[c.id]; }).join('/') +
      (index !== undefined ? '/' + (index + 1) : '');
  }

  function manualDevice() {
    var v = state.data.vars.manual;
    return v ? v.values[state.choices[v.choice]] : 'mikro';
  }

  function remember() {
    MM.storeJSON('setupChoices', state.choices);
    if (state.choices.device) MM.manual.setDeviceFromSetup(manualDevice());
  }

  // --- inline markup -> DOM ----------------------------------------------------------------

  function inline(text, parent) {
    parent = parent || document.createDocumentFragment();
    text = fill(text);
    var last = 0, m;
    INLINE.lastIndex = 0;
    while ((m = INLINE.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      if (m[1] !== undefined) parent.appendChild(inlineInto(m[1], h('strong')));
      else if (m[2] !== undefined) parent.appendChild(h('code', { text: m[2] }));
      else if (m[3] !== undefined) parent.appendChild(MM.key(m[3]));
      else parent.appendChild(link(m[4], m[5]));
      last = INLINE.lastIndex;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
    return parent;
  }

  // nested markup inside **bold** (its own regex state, so the outer loop isn't disturbed)
  function inlineInto(text, parent) {
    var saved = INLINE.lastIndex;
    var re = new RegExp(INLINE.source, 'g');
    var last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      if (m[2] !== undefined) parent.appendChild(h('code', { text: m[2] }));
      else if (m[3] !== undefined) parent.appendChild(MM.key(m[3]));
      else if (m[4] !== undefined) parent.appendChild(link(m[4], m[5]));
      else parent.appendChild(document.createTextNode(m[0]));
      last = re.lastIndex;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
    INLINE.lastIndex = saved;
    return parent;
  }

  function isExternal(href) { return /^https?:/i.test(href); }

  function link(text, href) {
    if (state.ctx) href = printHref(href);
    var a = h('a', { href: href });
    a.appendChild(document.createTextNode(text));
    if (state.ctx) a.appendChild(h('span', { className: 'pd-url-inline', text: ' (' + printAddress(href) + ')' }));
    if (isExternal(href)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
      a.appendChild(h('span', { className: 'visually-hidden', text: ' (opens in a new tab)' }));
    }
    return a;
  }

  // --- blocks -----------------------------------------------------------------------------

  function copyField(item) {
    var label = fill(item.label);
    var value = fill(item.value);
    var button = h('button', { type: 'button', className: 'btn btn-tonal', 'aria-label': 'Copy ' + label + ': ' + value },
      [MM.icon('copy'), h('span', { text: 'Copy' })]);
    button.addEventListener('click', function () {
      MM.copyText(value).then(function () {
        button.classList.add('copied');
        button.replaceChild(MM.icon('check'), button.firstChild);
        button.lastChild.textContent = 'Copied';
        MM.snackbar('Copied: ' + value);
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
      h('span', { className: 'copy-label', text: label }),
      h('span', { className: 'copy-value', text: value }),
      button
    ]);
  }

  function block(b) {
    if (b.p !== undefined) return inline(b.p, h('p'));
    if (b.h !== undefined) return inline(b.h, h('h3'));
    if (b.ol || b.ul) {
      var list = h(b.ol ? 'ol' : 'ul');
      (b.ol || b.ul).forEach(function (item) { list.appendChild(inline(item, h('li'))); });
      return list;
    }
    if (b.note !== undefined) {
      var kind = b.kind || 'info';
      return h('div', { className: 'note ' + kind, role: kind === 'important' ? 'note' : null }, [
        MM.icon(NOTE_ICONS[kind] || 'info'),
        inline(b.note, h('div'))
      ]);
    }
    if (b.copy) return h('div', { className: 'copy-list' }, b.copy.map(copyField));
    if (b.table) {
      var dl = h('dl', { className: 'kv' });
      b.table.forEach(function (row) {
        dl.appendChild(inline(row[0], h('dt')));
        dl.appendChild(h('dd', { text: fill(row[1]) }));
      });
      return dl;
    }
    if (b.faq) {
      return h('div', { className: 'faq' }, b.faq.filter(function (item) { return matches(item.when); }).map(function (item) {
        var answer = h('div', { className: 'faq-answer' });
        if (item.a.length > 1) {
          var ul = h('ul');
          item.a.forEach(function (a) { ul.appendChild(inline(a, h('li'))); });
          answer.appendChild(ul);
        } else {
          answer.appendChild(inline(item.a[0], h('p')));
        }
        return h('details', {}, [h('summary', {}, [inline(item.q, h('span')), MM.icon('down')]), answer]);
      }));
    }
    if (b.actions) {
      return h('div', { className: 'actions' }, b.actions.map(function (action, i) {
        var href = fill(action.href);
        var a = h('a', { className: 'btn ' + (action.primary ? 'btn-filled' : i ? 'btn-outlined' : 'btn-tonal'), href: href },
          [h('span', { text: fill(action.label) })]);
        if (isExternal(href)) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener');
          a.appendChild(MM.icon('external'));
          a.appendChild(h('span', { className: 'visually-hidden', text: ' (opens in a new tab)' }));
        }
        a.addEventListener('click', markDone);
        return a;
      }));
    }
    return null;
  }

  function markDone() {
    if (state.choices.live === 'live12') {
      MM.store('setupDone', '1');
      MM.manual.updateWelcome();
    }
  }

  // --- choices screen ---------------------------------------------------------------------

  function renderChoices() {
    var root = el('setup-root');
    root.innerHTML = '';
    el('setup-intro').hidden = false;
    var start = h('a', { className: 'btn btn-filled has-icon-end', href: '#setup' }, [h('span', { text: 'Start' }), MM.icon('right')]);
    var groups = choiceDefs().map(function (choice, number) { return choiceGroup(choice, number, update); });

    function update() {
      groups.forEach(function (g, i) { g.classList.toggle('answered', !!state.choices[choiceDefs()[i].id]); });
      if (complete()) {
        start.removeAttribute('aria-disabled');
        start.setAttribute('href', routeHash(0));
        start.removeAttribute('tabindex');
      } else {
        start.setAttribute('aria-disabled', 'true');
        start.setAttribute('href', '#setup');
        start.setAttribute('tabindex', '-1');
      }
    }

    var progress = MM.store('setupProgress');
    var resume = null;
    if (progress && /^#setup\/[^/]+\/[^/]+\/[^/]+\/\d+$/.test(progress)) {
      var n = progress.split('/').pop();
      if (Number(n) > 1) {
        resume = h('a', { className: 'btn btn-text', href: progress }, [h('span', { text: 'Continue where you left off (step ' + n + ')' })]);
      }
    }
    var form = h('div', { className: 'choice-form' }, groups.concat([
      h('div', { className: 'choice-actions' }, [
        start,
        resume,
        h('a', { className: 'btn btn-text', href: '#manual' }, [h('span', { text: 'Already set up? Open the manual' })])
      ])
    ]));
    root.appendChild(h('div', { className: 'choices-layout' }, [form, padArt()]));
    update();
  }

  // Decoration for wide screens: 16 pads in MASCHINE's sound colours (PAD_COLORS, layouts.js).
  function padArt() {
    var grid = h('div', { className: 'pad-art', 'aria-hidden': 'true' });
    for (var row = 0; row < 4; row++) {
      for (var col = 0; col < 4; col++) {
        var number = (3 - row) * 4 + col + 1;
        var pad = h('span', { className: 'pad-art-pad' });
        pad.style.setProperty('--pad', PAD_COLORS[number - 1]);
        pad.style.setProperty('--delay', ((row + col) * 0.35) + 's');
        grid.appendChild(pad);
      }
    }
    return h('div', { className: 'pad-art-wrap' }, [grid]);
  }

  function choiceGroup(choice, number, onChange) {
    var legendId = 'choice-' + choice.id;
    var radios = [];
    var group = h('div', { className: 'choice-options', role: 'radiogroup', 'aria-labelledby': legendId });

    function select(optionId, focus) {
      state.choices[choice.id] = optionId;
      remember();
      radios.forEach(function (r) {
        var on = r.getAttribute('data-option') === optionId;
        r.setAttribute('aria-checked', String(on));
        r.setAttribute('tabindex', on ? '0' : '-1');
        if (on && focus) r.focus();
      });
      onChange();
    }

    choice.options.forEach(function (option, index) {
      var detected = state.detected[choice.id] === option.id;
      var radio = h('button', { type: 'button', role: 'radio', className: 'choice', 'data-option': option.id, 'aria-checked': 'false', tabindex: '-1' }, [
        h('span', { className: 'radio', 'aria-hidden': 'true' }),
        h('span', { className: 'choice-text' }, [
          h('span', { className: 'choice-label', text: option.label }),
          option.hint ? h('span', { className: 'choice-hint', text: option.hint }) : null,
          detected ? h('span', { className: 'choice-detected', text: 'This computer' }) : null
        ])
      ]);
      radio.addEventListener('click', function () { select(option.id, false); });
      radio.addEventListener('keydown', function (e) {
        var step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        select(choice.options[(index + step + choice.options.length) % choice.options.length].id, true);
      });
      radios.push(radio);
      group.appendChild(radio);
    });
    var current = state.choices[choice.id];
    radios.forEach(function (r, i) {
      var on = r.getAttribute('data-option') === current;
      r.setAttribute('aria-checked', String(on));
      r.setAttribute('tabindex', on || (!current && i === 0) ? '0' : '-1');
    });
    return h('fieldset', { className: 'choice-group' }, [
      h('legend', { id: legendId }, [h('span', { className: 'num', 'aria-hidden': 'true', text: String(number + 1) }), choice.label]),
      group
    ]);
  }

  // --- stepper ----------------------------------------------------------------------------

  function renderStepper() {
    var root = el('setup-root');
    var steps = state.steps;
    var index = state.index;
    var step = steps[index];
    var total = steps.length;
    root.innerHTML = '';
    el('setup-intro').hidden = true;
    MM.store('setupProgress', routeHash(index));

    var summary = h('div', { className: 'wizard-summary', 'aria-label': 'Your answers' }, choiceDefs().map(function (c) {
      return h('span', { className: 'chip' }, [MM.icon(CHOICE_ICONS[c.id] || 'check'), optionLabel(c.id, state.choices[c.id])]);
    }).concat([
      h('a', { className: 'btn btn-text has-icon-start', href: '#setup' }, [MM.icon('edit'), h('span', { text: 'Change' })]),
      h('a', { className: 'btn btn-text has-icon-start', href: routeHash().replace('#setup/', '#setup/print/') }, [MM.icon('print'), h('span', { text: 'All steps on one page' })])
    ]));

    var progress = h('div', { className: 'progress' }, [
      h('div', { className: 'progress-track', role: 'progressbar', 'aria-label': 'Setup progress',
        'aria-valuemin': '1', 'aria-valuemax': String(total), 'aria-valuenow': String(index + 1),
        'aria-valuetext': 'Step ' + (index + 1) + ' of ' + total }, [h('span', { className: 'progress-bar' })]),
      h('span', { className: 'progress-label', text: 'Step ' + (index + 1) + ' of ' + total })
    ]);
    progress.querySelector('.progress-bar').style.width = ((index + 1) / total * 100) + '%';

    var list = h('ol', { className: 'step-list collapsed', id: 'step-list' });
    steps.forEach(function (s, i) {
      var cls = i < index ? 'done' : i === index ? 'current' : '';
      var a = h('a', { className: 'step-link', href: routeHash(i), 'aria-current': i === index ? 'step' : null }, [
        h('span', { className: 'step-dot', 'aria-hidden': 'true' }, [i < index ? MM.icon('check') : String(i + 1)]),
        h('span', { text: fill(s.nav || s.title) }),
        i < index ? h('span', { className: 'visually-hidden', text: ' (done)' }) : null
      ]);
      a.addEventListener('click', function () { state.focusStep = true; });
      list.appendChild(h('li', { className: cls }, [a]));
    });
    var toggle = h('button', { type: 'button', className: 'step-list-toggle', 'aria-expanded': 'false', 'aria-controls': 'step-list' }, [
      h('span', { text: 'All steps' }), MM.icon('down')
    ]);
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      list.classList.toggle('collapsed', !open);
    });
    var nav = h('nav', { className: 'step-list-wrap', 'aria-label': 'Setup steps' }, [toggle, list]);

    var body = h('div', { className: 'step-body' });
    (step.body || []).forEach(function (b) {
      if (!matches(b.when)) return;
      var node = block(b);
      if (node) body.appendChild(node);
    });

    var prevHref = index > 0 ? routeHash(index - 1) : '#setup';
    var prev = h('a', { className: 'btn btn-outlined has-icon-start', href: prevHref }, [
      MM.icon('left'), h('span', { text: index > 0 ? 'Previous' : 'Change answers' })
    ]);
    prev.addEventListener('click', function () { if (index > 0) state.focusStep = true; });
    var next = null;
    if (index < total - 1) {
      var nextStep = steps[index + 1];
      next = h('a', { className: 'btn btn-filled has-icon-end', href: routeHash(index + 1) }, [
        h('span', {}, ['Next', h('span', { className: 'btn-label-long', text: ': ' + fill(nextStep.nav || nextStep.title) })]),
        MM.icon('right')
      ]);
      next.addEventListener('click', function () { state.focusStep = true; });
    }
    var hint = next ? h('span', { className: 'key-hint', 'aria-hidden': 'true' }, [h('kbd', { text: '←' }), ' ', h('kbd', { text: '→' }), ' to move']) : null;

    var card = h('article', { className: 'step-card', 'aria-labelledby': 'step-title' }, [
      h('p', { className: 'step-eyebrow', text: 'Step ' + (index + 1) + ' of ' + total }),
      h('h2', { className: 'step-title', id: 'step-title', tabindex: '-1', text: fill(step.title) }),
      body,
      h('div', { className: 'step-nav' }, [prev, h('span', { className: 'spacer' }), hint, next])
    ]);

    var single = total === 1;  // e.g. Live 11: one page, no stepper chrome
    if (single) card.querySelector('.step-eyebrow').textContent = 'Your setup';
    root.appendChild(h('div', { className: 'wizard' + (single ? ' single' : '') }, single ? [summary, card] : [summary, progress, nav, card]));
    // reaching "You're set" (or the last step) finishes the setup; steps after it (updating) are extra
    if (index === total - 1 || steps.slice(0, index + 1).some(function (s) { return s.id === 'done'; })) markDone();
    document.title = fill(step.title) + ' · Setup · MASCHINE for Ableton Live';

    if (state.focusStep) {
      state.focusStep = false;
      var title = el('step-title');
      title.focus({ preventScroll: true });
      var top = el('view-setup').getBoundingClientRect().top;
      if (top < 0) MM.scrollToEl(el('view-setup'));
    }
  }

  // --- routing ----------------------------------------------------------------------------

  // parts: the hash after "setup/", split on "/": [os, device, live, step]
  function show(parts) {
    var stored = MM.storeJSON('setupChoices') || {};
    var fromHash = {};
    choiceDefs().forEach(function (c, i) {
      var id = findOption(c, parts[i]);
      if (id) fromHash[c.id] = id;
    });
    var hashComplete = choiceDefs().every(function (c) { return !!fromHash[c.id]; });
    state.choices = {};
    choiceDefs().forEach(function (c) {
      state.choices[c.id] = fromHash[c.id] || findOption(c, stored[c.id]) || state.detected[c.id] || null;
    });
    document.title = 'Install and set up · MASCHINE for Ableton Live';
    if (!hashComplete) {
      renderChoices();
      return;
    }
    remember();
    state.steps = stepsFor();
    var n = parseInt(parts[3], 10);
    if (isNaN(n) && parts[3]) {  // a step by its id, e.g. .../troubleshooting
      state.steps.forEach(function (s, i) { if (s.id === parts[3]) n = i + 1; });
    }
    state.index = isNaN(n) ? 0 : Math.max(0, Math.min(state.steps.length - 1, n - 1));
    var canonical = routeHash(state.index);
    if (location.hash !== canonical) history.replaceState(null, '', canonical);
    renderStepper();
  }

  function detect() {
    var ua = navigator.userAgent || '';
    var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    if (/iPhone|iPad|Android/i.test(ua)) return;
    if (/Mac/i.test(platform)) { state.detected.os = 'macos'; return; }
    if (/Win/i.test(platform) && navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      navigator.userAgentData.getHighEntropyValues(['platformVersion']).then(function (values) {
        var major = parseInt(String(values.platformVersion || '').split('.')[0], 10);
        if (major >= 13) state.detected.os = 'win11';
        else if (major > 0) state.detected.os = 'win10';
        // the questions may already be on screen: show the hint there
        if (state.detected.os && !el('view-setup').hidden && el('setup-root').querySelector('.choice-form')) {
          var parts = location.hash.replace(/^#setup\/?/, '').split('/');
          show(parts);
        }
      }).catch(function () {});
    }
  }

  function init(data) {
    state.data = data;
    el('setup-intro').textContent = data.intro || '';
    detect();
    document.addEventListener('keydown', function (e) {
      if (el('view-setup').hidden || !el('setup-root').querySelector('.step-card')) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var target = e.target;
      var tag = (target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) return;
      if (target.closest && target.closest('[role="radiogroup"], [role="menu"]')) return;
      var index = state.index + (e.key === 'ArrowRight' ? 1 : -1);
      if (index < 0 || index >= state.steps.length) return;
      e.preventDefault();
      state.focusStep = true;
      location.hash = routeHash(index);
    });
  }

  // --- the printable guide (#setup/print...) ----------------------------------------------
  // Every step on one page, rendered like the Markdown guide (tools/gen_install_guide.py in the
  // script repository): the "guide" sections of install.json, narrowed by the choices in the hash
  // (#setup/print/windows: the Windows section and the Live 11 one; #setup/print/win11/mikro/live12:
  // one route). A var that still differs shows its generic text, or, in a copy or table block, a
  // table with a row per option; a step, block or answer that applies to only some of the choices
  // left open says so ("Windows 11 only", "MASCHINE+: ...").

  function optionsOf(choiceId) {
    var choice = choiceDefs().filter(function (c) { return c.id === choiceId; })[0];
    return choice.options.map(function (o) { return o.id; });
  }

  // ctx narrowed by a 'when', or null when nothing of ctx is left
  function narrow(when, ctx) {
    var out = {}, empty = false;
    Object.keys(ctx).forEach(function (id) { out[id] = ctx[id]; });
    Object.keys(when || {}).forEach(function (id) {
      var allowed = (ctx[id] || optionsOf(id)).filter(function (o) { return when[id].indexOf(o) >= 0; });
      if (!allowed.length) empty = true;
      out[id] = allowed;
    });
    return empty ? null : out;
  }

  // 'Windows 11' when a 'when' keeps only part of ctx; '' when it applies to all of it
  function onlyLabel(when, ctx) {
    var parts = [];
    Object.keys(when || {}).forEach(function (id) {
      var allowed = ctx[id] || optionsOf(id);
      var kept = allowed.filter(function (o) { return when[id].indexOf(o) >= 0; });
      if (kept.length && kept.length < allowed.length) {
        parts.push(kept.map(function (o) { return optionLabel(id, o); }).join(', '));
      }
    });
    return parts.join('; ');
  }

  // a var's value when every option still allowed gives the same one, else undefined
  function resolveVar(name, ctx) {
    var v = state.data.vars[name];
    var values = (ctx[v.choice] || optionsOf(v.choice)).map(function (o) { return v.values[o]; });
    return values.every(function (x) { return x === values[0]; }) ? values[0] : undefined;
  }

  // the choices whose vars in this text don't resolve in ctx
  function openChoices(text, ctx) {
    var out = [];
    String(text).replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/g, function (m, name) {
      var v = state.data.vars[name];
      if (v && resolveVar(name, ctx) === undefined && out.indexOf(v.choice) < 0) out.push(v.choice);
      return m;
    });
    return out;
  }

  function withCtx(ctx, fn) {
    var saved = state.ctx;
    state.ctx = ctx;
    try { return fn(); } finally { state.ctx = saved; }
  }

  // On paper a link shows its address, and a link into the site needs the site's address.
  function printHref(href) {
    return href.charAt(0) === '#' ? state.data.site.replace(/\/?$/, '/') + href : href;
  }

  function printAddress(href) { return href.replace(/^https?:\/\//, '').replace(/\/$/, ''); }

  function valueTable(rows, ctx) {
    var open = [];
    rows.forEach(function (row) {
      openChoices(row[1], ctx).forEach(function (id) { if (open.indexOf(id) < 0) open.push(id); });
    });
    if (!open.length) {
      var dl = h('dl', { className: 'kv' });
      rows.forEach(function (row) {
        dl.appendChild(inline(row[0], h('dt')));
        dl.appendChild(h('dd', { text: fill(row[1]) }));
      });
      return dl;
    }
    var id = open[0];  // one varying choice per table is enough for this data
    var choice = choiceDefs().filter(function (c) { return c.id === id; })[0];
    var head = h('tr', {}, [h('th', { scope: 'col', text: choice.label })].concat(rows.map(function (row) {
      return inline(row[0], h('th', { scope: 'col' }));
    })));
    var body = h('tbody', {}, (ctx[id] || optionsOf(id)).map(function (option) {
      var one = narrow({}, ctx);
      one[id] = [option];
      return withCtx(one, function () {
        return h('tr', {}, [h('th', { scope: 'row', text: optionLabel(id, option) })].concat(rows.map(function (row) {
          return h('td', { text: fill(row[1]) });
        })));
      });
    }));
    return h('div', { className: 'pd-table-wrap' }, [h('table', { className: 'pd-values' }, [h('thead', {}, [head]), body])]);
  }

  function printFaq(items, ctx) {
    var list = items.map(function (item) {
      var itemCtx = narrow(item.when, ctx);
      if (!itemCtx) return null;
      var only = onlyLabel(item.when, ctx);
      return withCtx(itemCtx, function () {
        var q = inline(item.q, h('p', { className: 'pd-q' }));
        if (only) q.appendChild(h('span', { className: 'pd-only', text: only + ' only' }));
        var answer = item.a.length > 1
          ? h('ul', {}, item.a.map(function (a) { return inline(a, h('li')); }))
          : inline(item.a[0], h('p'));
        return h('div', { className: 'pd-faq-item' }, [q, answer]);
      });
    });
    return h('div', { className: 'pd-faq' }, list);
  }

  function printActions(actions) {
    return h('ul', { className: 'pd-actions' }, actions.map(function (action) {
      var label = fill(action.label);
      var href = printHref(fill(action.href));
      return h('li', {}, [h('a', { href: href }, [
        h('span', { className: 'pd-action-label', text: label }),
        h('span', { className: 'pd-url', text: printAddress(href) })
      ])]);
    }));
  }

  function printBlock(b, ctx) {
    var only = onlyLabel(b.when, ctx);
    ctx = narrow(b.when, ctx);
    if (!ctx) return null;
    return withCtx(ctx, function () {
      var node;
      if (b.copy) node = valueTable(b.copy.map(function (c) { return [c.label, c.value]; }), ctx);
      else if (b.table) node = valueTable(b.table, ctx);
      else if (b.faq) node = printFaq(b.faq, ctx);
      else if (b.actions) node = printActions(b.actions);
      else node = block(b);
      if (node && b.p !== undefined && /:\s*$/.test(b.p)) node.classList.add('pd-lead');  // "You need:"
      if (!node || !only) return node;
      var label = h('strong', { className: 'pd-only-lead', text: only + ': ' });
      if (b.note !== undefined) node.lastChild.insertBefore(label, node.lastChild.firstChild);
      else if (b.p !== undefined) node.insertBefore(label, node.firstChild);
      else node = h('div', {}, [h('p', { className: 'pd-only-lead', text: only + ':' }), node]);
      return node;
    });
  }

  // The step's drawing (js/setup-figures.js), from its vars and its own texts, or null.
  function stepFigure(step, ctx) {
    if (!MM.setupFigures) return null;
    var texts = (step.body || []).filter(function (b) { return narrow(b.when, ctx); }).map(function (b) { return JSON.stringify(b); });
    return MM.setupFigures.figure(step, {
      ctx: ctx,
      text: texts.join(' '),
      label: optionLabel,
      value: function (name, option) {
        var v = state.data.vars[name];
        return v.values[option] !== undefined ? v.values[option] : v.generic;
      }
    });
  }

  // A hash part names options: an option id, every option whose label starts with that word
  // ("windows": Windows 11 and Windows 10), or an alias.
  function printOptions(part) {
    part = String(part || '').toLowerCase();
    var out = {};
    choiceDefs().forEach(function (c) {
      var hit = c.options.filter(function (o) { return o.id === part; });
      if (!hit.length) hit = c.options.filter(function (o) { return o.label.split(' ')[0].toLowerCase() === part; });
      if (!hit.length) hit = c.options.filter(function (o) { return (o.aliases || []).indexOf(part) >= 0; });
      if (hit.length) out[c.id] = hit.map(function (o) { return o.id; });
    });
    return out;
  }

  // parts: the hash after "setup/print/". Returns { title, subtitle, site, contents, node },
  // or null when no section of the guide fits.
  function guide(parts) {
    var ctx = {};
    (parts || []).forEach(function (part) {
      var found = printOptions(part);
      Object.keys(found).forEach(function (id) { ctx[id] = (ctx[id] || []).concat(found[id]); });
    });
    var sections = (state.data.guide || []).map(function (section) {
      return { title: section.title, ctx: narrow(section.when, ctx) };
    }).filter(function (section) { return section.ctx; });
    if (!sections.length) return null;
    var contents = h('ol', { className: 'pd-contents-list' });
    var node = h('div', { className: 'pd-guide' });
    sections.forEach(function (section) {
      var number = 0;
      var groupList = contents;
      if (sections.length > 1) {
        groupList = h('ol');
        contents.appendChild(h('li', { className: 'pd-contents-group' }, [h('span', { text: section.title }), groupList]));
      }
      var wrap = h('section', { className: 'pd-section' });
      if (sections.length > 1) wrap.appendChild(h('h2', { className: 'pd-section-title', text: section.title }));
      state.data.steps.forEach(function (step) {
        var stepCtx = narrow(step.when, section.ctx);
        if (!stepCtx) return;
        number++;
        var only = onlyLabel(step.when, section.ctx);
        var body = h('div', { className: 'step-body pd-body' });
        (step.body || []).forEach(function (b) {
          var n = printBlock(b, stepCtx);
          if (n) body.appendChild(n);
        });
        var title = withCtx(stepCtx, function () { return fill(step.title); });
        groupList.appendChild(h('li', { text: withCtx(stepCtx, function () { return fill(step.nav || step.title); }) }));
        // a drawing goes beside the step's instructions (up to its first list), the rest of the
        // step under both; a wide one under the whole step
        // (fig.besideAll: the whole text, then fig.lead under it), then fig.below
        var fig = stepFigure(step, stepCtx);
        var main = body;
        // a step of text only flows in two columns on paper (not the troubleshooting answers,
        // which have their own)
        if (!fig && !body.querySelector('.pd-faq')) body.classList.add('pd-flow');
        if (fig) {
          var lead = h('div', { className: 'step-body pd-body' });
          var list = fig.besideAll ? null : body.querySelector(':scope > ol, :scope > ul');
          while (body.firstChild) {
            var child = body.firstChild;
            lead.appendChild(child);
            if (!fig.besideAll && (child === list || !list)) break;
          }
          if (fig.lead) lead.appendChild(fig.lead);
          main = h('div', {}, [h('div', { className: 'pd-step-grid' }, [lead, fig.node]),
            body.firstChild ? body : null, fig.below ? h('div', { className: 'pd-step-wide' }, [fig.below]) : null]);
        }
        wrap.appendChild(h('article', { className: 'pd-step' + (fig ? ' has-figure' : '') }, [
          h('div', { className: 'pd-step-head' }, [
            h('span', { className: 'pd-step-num', 'aria-hidden': 'true', text: String(number) }),
            h('h3', { className: 'pd-step-title' }, [
              h('span', { className: 'visually-hidden', text: 'Step ' + number + ': ' }), title,
              only ? h('span', { className: 'pd-only', text: only + ' only' }) : null
            ])
          ]),
          main
        ]));
      });
      node.appendChild(wrap);
    });
    var given = choiceDefs().filter(function (c) { return ctx[c.id]; }).map(function (c) {
      return ctx[c.id].map(function (o) { return optionLabel(c.id, o); }).join(' and ');
    });
    return {
      title: state.data.title,
      subtitle: given.join(' · '),
      site: state.data.site,
      contents: contents,
      node: node
    };
  }

  // #help: the troubleshooting step for the visitor's answers (remembered, else detected, else the
  // first option), or the first step where there is none (Live 11).
  function help() {
    var stored = MM.storeJSON('setupChoices') || {};
    var parts = choiceDefs().map(function (c) {
      return findOption(c, stored[c.id]) || state.detected[c.id] || c.options[0].id;
    });
    parts.push('troubleshooting');
    history.replaceState(null, '', '#setup/' + parts.join('/'));
    show(parts);
  }

  return { init: init, show: show, help: help, guide: guide };
})();
