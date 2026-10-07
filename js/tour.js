// The Tour (#tour, #tour/<section>, #tour/<section>/<step>, #tour/mk3/<section>/<step>; the old
// #highlights, #highlights/3, #highlights/mk3/3 open its Highlights card): the manual as a row of
// self-playing cards, one per section of data/features.json, in the manual's order, for the
// selected controller (a section or an item with `devices` only shows for those). Each card is a
// player (MM.tourPlayer in js/highlights.js): the controller drawing acts out the section's
// items one by one, a callout shows the combo and its text, and "Read the full section" opens
// the same section in the Full manual (#full/<section>). Only the card most in view plays, and a
// card's drawing is only made when it comes near the window, so the page stays light on a phone.
// The page hidden or the window without focus pauses it, like the pause button.
MM.tour = (function () {
  'use strict';

  var el = MM.el, h = MM.h;
  var SVG = 'http://www.w3.org/2000/svg';
  var state = { data: null, device: null, cards: [], active: null, ready: false, blurred: false, frame: null };

  function forDevice(entry, device) { return !entry.devices || entry.devices.indexOf(device) >= 0; }

  // The card's intro: the section's own Tour line (`tour.intro`), else its summary's first sentence.
  function introOf(section) {
    if (section.tour && section.tour.intro) return section.tour.intro;
    var match = /^(.+?[.!?])(\s|$)/.exec(section.summary || '');
    return match ? match[1] : section.summary || '';
  }

  function stepsOf(section, device) {
    return section.items.filter(function (item) { return forDevice(item, device); }).map(function (item) {
      return { combo: item.combo, does: item.does, context: item.context || null, values: item.values || null,
        section: section };
    });
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

  function deviceTag(section) {
    if (!section.devices) return null;
    var name = state.data.devices[section.devices[0]].name.replace('MASCHINE ', '').split(' /')[0];
    return h('span', { className: 'device-tag', text: name + ' only' });
  }

  // A card: its heading, the stage (drawing, leader line, callout), the controls, the link to the
  // full section.
  function buildCard(section) {
    var id = section.id, highlights = id === 'highlights';
    var device = svgNode('svg', { id: 'tour-device-' + id, 'class': 'tour-device hw-drawing', role: 'img', 'aria-label': 'Controller' });
    var leader = svgNode('svg', { 'class': 'tour-leader', 'aria-hidden': 'true', focusable: 'false' });
    svgNode('path', { 'class': 'tour-leader-line' }, leader);
    svgNode('circle', { 'class': 'tour-leader-start', r: 4 }, leader);
    svgNode('circle', { 'class': 'tour-leader-end', r: 5 }, leader);
    var loupe = h('canvas', { className: 'tour-loupe', 'aria-hidden': 'true', hidden: true });
    var stage = h('div', { className: 'tour-stage' }, [
      h('div', { className: 'tour-device-wrap' }, [device]),
      leader,
      h('div', { className: 'tour-bubble' }, [
        h('div', { className: 'tour-stack tour-heads' }),
        loupe,
        h('div', { className: 'tour-stack tour-texts' })
      ])
    ]);
    var intro = introOf(section);
    var node = h('article', { className: 'tour-card', id: 'tour-' + id, 'aria-labelledby': 'tour-h-' + id, 'data-section': id }, [
      h('header', { className: 'tour-card-head' }, [
        h('h2', { id: 'tour-h-' + id, className: 'tour-card-title' }, [section.title, deviceTag(section)]),
        intro ? h('p', { className: 'tour-card-intro', text: intro }) : null
      ]),
      stage,
      h('div', { className: 'tour-controls' }, [
        h('div', { className: 'tour-buttons' }, [
          iconButton('tour-prev', 'Previous', 'left'),
          iconButton('tour-pause', 'Pause', 'pause'),
          iconButton('tour-next', 'Next', 'right')
        ]),
        h('div', { className: 'tour-dots', role: 'group', 'aria-label': section.title }),
        h('span', { className: 'tour-status', 'aria-hidden': 'true' })
      ]),
      h('p', { className: 'tour-card-more' }, [
        h('a', { className: 'btn btn-text has-icon-start', href: '#full/' + id }, [MM.icon('book'), 'Read the full section'])
      ])
    ]);
    node.querySelector('.tour-pause').setAttribute('aria-pressed', 'false');
    var card = { section: section, node: node, stage: stage, link: null };
    card.player = MM.tourPlayer(node, {
      label: highlights ? 'Highlight' : 'Step',
      name: section.title,
      onUser: function () { setActive(card, true); }
    });
    return card;
  }

  function buildToc() {
    var toc = el('tour-toc');
    toc.innerHTML = '';
    state.cards.forEach(function (card) {
      var section = card.section;
      card.link = h('a', { href: '#tour/' + section.id, text: section.nav || section.title.split(':')[0] });
      card.link.addEventListener('click', function (e) {
        e.preventDefault();
        jump(card, null);
      });
      toc.appendChild(card.link);
    });
  }

  // --- which card plays ---------------------------------------------------------------------

  function barBottom() {
    var bar = document.querySelector('.top-app-bar');
    return bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
  }

  function setHash(card) {
    var hash = '#tour/' + card.section.id;
    if (location.hash === hash || el('view-tour').hidden) return;
    try { history.replaceState(null, '', hash); } catch (e) { /* keep the old hash */ }
  }

  // The card in view plays, the one before stops where it is. byUser: a control on the card was
  // used, so it plays even when another card is more in view.
  function setActive(card, byUser) {
    if (card === state.active) return;
    if (state.active) state.active.player.halt();
    state.active = card;
    state.cards.forEach(function (c) { if (c.link) c.link.classList.toggle('active', c === card); });
    if (!card) return;
    card.player.draw();
    card.player.play();
    if (!byUser) setHash(card);
  }

  // Draw the cards near the window; the one most in view plays.
  function update() {
    state.frame = null;
    if (!state.ready || el('view-tour').hidden) return;
    var vh = window.innerHeight || document.documentElement.clientHeight, top = barBottom();
    var best = null, bestScore = 0;
    state.cards.forEach(function (card) {
      if (card.node.hidden) return;
      var r = card.stage.getBoundingClientRect();
      if (r.bottom > top - vh * 0.75 && r.top < vh * 1.75) card.player.draw();
      var seen = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, top));
      var score = seen / Math.max(1, Math.min(r.height, vh - top));
      if (score > bestScore + 0.001) { best = card; bestScore = score; }
    });
    setActive(bestScore >= 0.3 ? best : null, false);
  }

  // (a timer, not an animation frame: those don't come while the page isn't painted)
  function later() {
    if (state.frame) return;
    state.frame = setTimeout(update, 60);
  }

  // Scroll a card into view (no smooth scroll: every card on the way would be drawn), and play
  // it from `step` (0-based) when given.
  function jump(card, step) {
    if (!card || card.node.hidden) return;
    card.player.draw();
    if (step !== null && step !== undefined && step >= 0) card.player.go(Math.min(step, card.player.count() - 1), false);
    card.node.scrollIntoView({ block: 'start' });
    setHash(card);
    later();
  }

  // --- the controller -----------------------------------------------------------------------

  function setDevice(device) {
    state.device = device;
    MM.store('device', device);
    document.querySelectorAll('#view-tour .segmented button').forEach(function (b) {
      var on = b.getAttribute('data-device') === device;
      b.setAttribute('aria-checked', String(on));
      b.setAttribute('tabindex', on ? '0' : '-1');
    });
    el('tour-unverified').hidden = state.data.devices[device].verified;
    if (state.active) state.active.player.halt();
    state.active = null;
    state.cards.forEach(function (card) {
      var steps = forDevice(card.section, device) ? stepsOf(card.section, device) : [];
      card.node.hidden = !steps.length;
      if (card.link) card.link.hidden = !steps.length;
      // the same step where the other controller has it too, else the first
      if (steps.length) {
        var keep = card.player.count() ? card.player.index() : 0;
        card.player.load(device, steps, keep < steps.length ? keep : 0);
      }
    });
  }

  // Switching the controller keeps the card in view.
  function switchDevice(device) {
    if (device === state.device) return;
    var current = state.active;
    setDevice(device);
    if (current && !current.node.hidden) jump(current, null);
    else later();
  }

  function awayChanged() {
    var away = document.hidden || state.blurred;
    state.cards.forEach(function (card) { card.player.setAway(away); });
  }

  function init(data) {
    state.data = data;
    var list = el('tour-cards');
    list.innerHTML = '';
    state.cards = data.sections.filter(function (s) { return s.items && s.items.length; }).map(buildCard);
    state.cards.forEach(function (card) { list.appendChild(card.node); });
    buildToc();
    var buttons = Array.prototype.slice.call(document.querySelectorAll('#view-tour .segmented button'));
    buttons.forEach(function (b, index) {
      b.addEventListener('click', function () { switchDevice(b.getAttribute('data-device')); });
      b.addEventListener('keydown', function (e) {
        var step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        e.stopPropagation();
        var next = buttons[(index + step + buttons.length) % buttons.length];
        switchDevice(next.getAttribute('data-device'));
        next.focus();
      });
    });
    document.addEventListener('visibilitychange', awayChanged);
    window.addEventListener('blur', function () { state.blurred = true; awayChanged(); });
    window.addEventListener('focus', function () { state.blurred = false; awayChanged(); });
    // ← →: the previous / next step of the card that plays
    document.addEventListener('keydown', function (e) {
      if (el('view-tour').hidden || !state.active || e.ctrlKey || e.metaKey || e.altKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      if (e.target.closest && e.target.closest('.segmented')) return;
      var player = state.active.player;
      if (e.key === 'ArrowRight') { e.preventDefault(); player.go(player.index() + 1, true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); player.go(player.index() - 1, true); }
    });
    window.addEventListener('scroll', later, { passive: true });
    window.addEventListener('resize', later);
    // the cards' sizes settle after the first look (fonts, drawings): look again then
    if (window.ResizeObserver) new ResizeObserver(later).observe(list);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  }

  // target: { device (optional), section (an id, optional), step (0-based, optional) }.
  function show(target) {
    target = target || {};
    var device = LAYOUTS[target.device] ? target.device : (LAYOUTS[MM.store('device')] ? MM.store('device') : 'mikro');
    var first = !state.ready;
    state.ready = true;
    if (first || device !== state.device) setDevice(device);
    var card = target.section ? state.cards.filter(function (c) { return c.section.id === target.section; })[0] : null;
    if (card && !card.node.hidden) {
      setTimeout(function () { jump(card, target.step); }, 0);
    } else {
      if (first) window.scrollTo(0, 0);
      later();
    }
  }

  function stop() {
    if (state.active) state.active.player.halt();
    state.active = null;
  }

  function hasSection(id) {
    return state.cards.some(function (c) { return c.section.id === id; });
  }

  return { init: init, show: show, stop: stop, hasSection: hasSection };
})();
