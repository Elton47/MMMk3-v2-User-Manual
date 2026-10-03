// The setup wizard: choices first, then a stepper. Content from data/install.json (a copy of
// docs/install.json in the script repository; the schema is described at the top of that file).
// Deep links: #setup (the questions), #setup/<os>/<device>/<live>/<step number>.
MM.setup = (function () {
  'use strict';

  var el = MM.el, h = MM.h;
  var CHOICE_ICONS = { os: 'computer', device: 'pads', live: 'live' };
  var NOTE_ICONS = { info: 'info', important: 'alert', coming: 'soon' };
  var INLINE = /\*\*(.+?)\*\*|`([^`]+)`|\[\[([^\]]+)\]\]|\[([^\]]+)\]\(([^)\s]+)\)/g;

  var state = { data: null, choices: {}, steps: [], index: 0, detected: {}, focusStep: false };

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
      var value = v.values[state.choices[v.choice]];
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
    var a = h('a', { href: href });
    a.appendChild(document.createTextNode(text));
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
    }).concat([h('a', { className: 'btn btn-text has-icon-start', href: '#setup' }, [MM.icon('edit'), h('span', { text: 'Change' })])]));

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
    if (index === total - 1) markDone();
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

  return { init: init, show: show };
})();
