// Highlights (#highlights, #highlights/<page>, #highlights/mk3/<page>): the manual's features one
// page at a time, the best first, for the selected controller. A page is one item of
// data/features.json (a mode, a feature or a button combination): its title, the controller
// drawing acting it out with its screen (the Tour's player, MM.tourPlayer, on that one step,
// playing it again and again), the combo and its text. Previous / next walk the pages; the jump
// list beside them (above them on a phone) lists every page by mode, so any page is one click away.
//
// Which pages, in which order (pages()):
//   1. items with a `best` rank in features.json, lowest first: `"best": 3`, or per controller
//      `"best": {"mikro": 3, "mk3": 5}`. When any item has one, only ranked items are pages.
//   2. until then: the Highlights section's items, then every other section in the Tour's order
//      for that controller (`tour_order`, the best first; else the file's order), its first
//      PER_SECTION items (a section lists its main use first). Getting started is left out.
// An item's optional `headline` is the page's title, else the first sentence of its text.
// Only the MIKRO MK3 and the MK3 are shown (SITE_DEVICES): entries for any other controller are
// skipped.
MM.best = (function () {
  'use strict';

  var el = MM.el, h = MM.h;
  var SVG = 'http://www.w3.org/2000/svg';
  var SITE_DEVICES = ['mikro', 'mk3'];
  var PER_SECTION = 3;
  var SKIP = ['start'];
  var state = { data: null, device: null, pages: [], player: null, index: 0, built: false, blurred: false };

  function forDevice(entry, device) { return !entry.devices || entry.devices.indexOf(device) >= 0; }

  function rankOf(item, device) {
    var best = item.best;
    if (best && typeof best === 'object') best = best[device];
    return typeof best === 'number' && isFinite(best) ? best : null;
  }

  // The page's title: its headline, else the first sentence of its text (cut at a word).
  function titleOf(item) {
    if (item.headline) return item.headline;
    var does = item.does || '';
    var match = /^(.+?[.!?])(\s|$)/.exec(does);
    var title = (match ? match[1] : does).replace(/[.:]$/, '');
    if (title.length > 90) title = title.slice(0, 90).replace(/\s+\S*$/, '') + '…';
    return title;
  }

  // The pages for a controller: [{ item, section, step (its 0-based index on the section's Tour
  // card), title }].
  function pages(data, device) {
    var sections = data.sections.filter(function (s) { return forDevice(s, device) && s.items && s.items.length; });
    var all = [];
    sections.forEach(function (section) {
      section.items.filter(function (item) { return forDevice(item, device); }).forEach(function (item, step) {
        all.push({ item: item, section: section, step: step, title: titleOf(item) });
      });
    });
    var ranked = all.filter(function (p) { return rankOf(p.item, device) !== null; });
    if (ranked.length) {
      return ranked.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) {
        return rankOf(a.p.item, device) - rankOf(b.p.item, device) || a.i - b.i;
      }).map(function (x) { return x.p; });
    }
    var order = ((data.tour_order || {})[device] || []).slice(), rank = {};
    order.forEach(function (id, i) { rank[id] = i; });
    var sorted = sections.map(function (s, i) { return { s: s, key: rank.hasOwnProperty(s.id) ? rank[s.id] : order.length + i }; })
      .sort(function (a, b) { return a.key - b.key; }).map(function (x) { return x.s; });
    // the Highlights section first, whatever the Tour's order says
    sorted = sorted.filter(function (s) { return s.id === 'highlights'; }).concat(sorted.filter(function (s) { return s.id !== 'highlights'; }));
    var out = [];
    sorted.forEach(function (section) {
      if (SKIP.indexOf(section.id) >= 0) return;
      var mine = all.filter(function (p) { return p.section === section; });
      out = out.concat(section.id === 'highlights' ? mine : mine.slice(0, PER_SECTION));
    });
    return out;
  }

  function svgNode(name, attrs, parent) {
    var n = document.createElementNS(SVG, name);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  function iconButton(cls, label, icon) {
    return h('button', { type: 'button', className: 'icon-button ' + cls, title: label }, [
      MM.icon(icon), h('span', { className: 'visually-hidden', text: label })
    ]);
  }

  function sectionName(section) {
    return section.id === 'highlights' ? 'The best of it' : section.nav || section.title.split(':')[0];
  }

  // The page: its heading, the stage (the Tour's markup, so the player and its styles fit), the
  // previous / next buttons and the links.
  function build() {
    var device = svgNode('svg', { id: 'best-device', 'class': 'tour-device hw-drawing', role: 'img', 'aria-label': 'Controller' });
    var leader = svgNode('svg', { 'class': 'tour-leader', 'aria-hidden': 'true', focusable: 'false' });
    svgNode('path', { 'class': 'tour-leader-line' }, leader);
    svgNode('circle', { 'class': 'tour-leader-start', r: 4 }, leader);
    svgNode('circle', { 'class': 'tour-leader-end', r: 5 }, leader);
    var page = el('best-page');
    page.innerHTML = '';
    page.appendChild(h('header', { className: 'best-page-head' }, [
      h('p', { className: 'eyebrow', id: 'best-mode' }),
      h('h2', { className: 'best-title', id: 'best-title', tabindex: '-1' })
    ]));
    page.appendChild(h('div', { className: 'tour-stage' }, [
      h('div', { className: 'tour-device-wrap' }, [device]),
      leader,
      h('div', { className: 'tour-bubble' }, [
        h('div', { className: 'tour-stack tour-heads' }),
        h('canvas', { className: 'tour-loupe', 'aria-hidden': 'true', hidden: true }),
        h('div', { className: 'tour-stack tour-texts' })
      ])
    ]));
    page.appendChild(h('div', { className: 'tour-controls best-controls' }, [
      h('div', { className: 'tour-buttons' }, [
        iconButton('tour-prev', 'Previous page', 'left'),
        iconButton('tour-pause', 'Pause', 'pause'),
        iconButton('tour-next', 'Next page', 'right')
      ]),
      h('div', { className: 'tour-dots', 'aria-hidden': 'true' }),
      h('span', { className: 'tour-status', 'aria-hidden': 'true' })
    ]));
    page.appendChild(h('p', { className: 'best-links' }, [
      h('a', { className: 'btn btn-text has-icon-start', id: 'best-full' }, [MM.icon('book'), 'Read the full section']),
      h('a', { className: 'btn btn-text has-icon-start', id: 'best-tour' }, [MM.icon('spark'), 'See it in the Tour'])
    ]));
    page.querySelector('.tour-pause').setAttribute('aria-pressed', 'false');
    state.player = MM.tourPlayer(page, {
      label: 'Page', name: 'Highlights', stay: true, comboTag: 'h3',
      onStep: function (index, byUser) { onPage(index, byUser); }
    });
    state.built = true;
  }

  // The jump list: every page, grouped by mode, in page order.
  function buildJump() {
    var list = el('best-jump-list');
    list.innerHTML = '';
    var group = null, current = null;
    state.pages.forEach(function (p, i) {
      if (p.section !== current) {
        current = p.section;
        group = h('ol', { className: 'best-jump-group', start: String(i + 1) });
        list.appendChild(h('li', { className: 'best-jump-mode' }, [
          h('h3', { className: 'best-jump-name', text: sectionName(p.section) }), group
        ]));
      }
      var link = h('a', { href: hashFor(i), className: 'best-jump-link', 'data-page': String(i) }, [
        h('span', { className: 'best-jump-num', text: String(i + 1) }),
        h('span', { className: 'best-jump-text', text: p.title })
      ]);
      link.addEventListener('click', function (e) {
        e.preventDefault();
        go(i, true);
        var details = el('best-jump');
        if (details && window.matchMedia('(max-width: 1099px)').matches) details.open = false;
        var title = el('best-title');
        if (title) { title.focus({ preventScroll: true }); el('best-page').scrollIntoView({ block: 'start' }); }
      });
      group.appendChild(h('li', {}, [link]));
    });
  }

  function hashFor(index) {
    return '#highlights/' + (state.device === 'mk3' ? 'mk3/' : '') + (index + 1);
  }

  function onPage(index, byUser) {
    state.index = index;
    var p = state.pages[index];
    if (!p) return;
    el('best-mode').textContent = sectionName(p.section);
    el('best-title').textContent = p.title;
    el('best-full').setAttribute('href', '#full/' + p.section.id);
    el('best-tour').setAttribute('href', '#tour/' + (state.device === 'mk3' ? 'mk3/' : '') + p.section.id + '/' + (p.step + 1));
    Array.prototype.forEach.call(document.querySelectorAll('.best-jump-link'), function (link) {
      var on = Number(link.getAttribute('data-page')) === index;
      link.classList.toggle('active', on);
      if (on) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    var hash = hashFor(index);
    if (!el('view-highlights').hidden && location.hash !== hash) {
      try { history.replaceState(null, '', hash); } catch (e) { /* keep the old hash */ }
    }
    void byUser;
  }

  function go(index, byUser) {
    if (!state.pages.length) return;
    state.player.go(Math.max(0, Math.min(state.pages.length - 1, index)), byUser);
  }

  function setDevice(device, index) {
    state.device = device;
    MM.store('device', device);
    document.querySelectorAll('#view-highlights .segmented button').forEach(function (b) {
      var on = b.getAttribute('data-device') === device;
      b.setAttribute('aria-checked', String(on));
      b.setAttribute('tabindex', on ? '0' : '-1');
    });
    el('best-unverified').hidden = !!(state.data.devices[device] || {}).verified;
    state.pages = pages(state.data, device);
    buildJump();
    el('best-total').textContent = 'This controller has ' + state.pages.length + ' pages.';
    var steps = state.pages.map(function (p) {
      return { combo: p.item.combo, does: p.item.does, context: p.item.context || null, values: p.item.values || null, section: p.section };
    });
    state.player.load(device, steps, Math.max(0, Math.min(steps.length - 1, index || 0)));
    state.player.draw();
  }

  function awayChanged() {
    if (state.player) state.player.setAway(document.hidden || state.blurred);
  }

  function init(data) {
    state.data = data;
    // on a phone the jump list starts folded, so the page itself is in view
    if (window.matchMedia && window.matchMedia('(max-width: 1099px)').matches) el('best-jump').open = false;
    var buttons = Array.prototype.slice.call(document.querySelectorAll('#view-highlights .segmented button'));
    buttons.forEach(function (b, index) {
      b.addEventListener('click', function () { if (b.getAttribute('data-device') !== state.device) setDevice(b.getAttribute('data-device'), 0); });
      b.addEventListener('keydown', function (e) {
        var step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        e.stopPropagation();
        var next = buttons[(index + step + buttons.length) % buttons.length];
        setDevice(next.getAttribute('data-device'), 0);
        next.focus();
      });
    });
    document.addEventListener('visibilitychange', awayChanged);
    window.addEventListener('blur', function () { state.blurred = true; awayChanged(); });
    window.addEventListener('focus', function () { state.blurred = false; awayChanged(); });
    // ← →: the previous / next page
    document.addEventListener('keydown', function (e) {
      if (el('view-highlights').hidden || !state.player || e.ctrlKey || e.metaKey || e.altKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      if (e.target.closest && (e.target.closest('.segmented') || e.target.closest('.menu'))) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(state.index + 1, true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(state.index - 1, true); }
    });
  }

  // target: { device (optional), page (0-based, optional) }.
  function show(target) {
    target = target || {};
    if (!state.built) build();
    var device = SITE_DEVICES.indexOf(target.device) >= 0 ? target.device
      : (SITE_DEVICES.indexOf(MM.store('device')) >= 0 ? MM.store('device') : 'mikro');
    var index = typeof target.page === 'number' && target.page >= 0 ? target.page : null;
    if (device !== state.device) setDevice(device, index === null ? 0 : index);
    else if (index !== null && index !== state.index) go(index, false);
    state.player.play();
  }

  function stop() { if (state.player) state.player.halt(); }

  return { init: init, show: show, stop: stop, pages: pages, SITE_DEVICES: SITE_DEVICES };
})();
