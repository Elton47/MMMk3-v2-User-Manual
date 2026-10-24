// Shared helpers: storage, element building, icons, snackbar, clipboard, theme.
var MM = Object.assign(window.MM || {}, (function () {
  'use strict';

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  // localStorage can be missing or throw (private mode, blocked storage): never let it break the page.
  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch (e) { /* ignore */ }
    return null;
  }

  function storeJSON(key, value) {
    if (value !== undefined) return store(key, JSON.stringify(value));
    try { return JSON.parse(store(key) || 'null'); } catch (e) { return null; }
  }

  function el(id) { return document.getElementById(id); }

  // h('div', {className: 'x', onclick: fn}, [children or strings])
  function h(tag, props, children) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (key) {
      var value = props[key];
      if (value === undefined || value === null || value === false) return;
      if (key === 'className') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    });
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function icon(name, extraClass) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon' + (extraClass ? ' ' + extraClass : ''));
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }

  // A hardware button name, styled like the manual's combination keys.
  function key(name) {
    return h('kbd', { className: 'key' + (name === 'SHIFT' ? ' shift' : ''), text: name });
  }

  var snackTimer = null;
  function snackbar(message) {
    var bar = el('snackbar');
    bar.textContent = message;
    bar.classList.add('show');
    clearTimeout(snackTimer);
    snackTimer = setTimeout(function () { bar.classList.remove('show'); }, 2600);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      // Some browsers leave the promise pending (no focus, permission prompt): don't wait forever.
      var stalled = new Promise(function (resolve, reject) { setTimeout(function () { reject(new Error('timeout')); }, 1200); });
      return Promise.race([navigator.clipboard.writeText(text), stalled])
        .catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var area = h('textarea', { readonly: true, 'aria-hidden': 'true' });
      area.value = text;
      area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(area);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  // A copy of the app bar's logo for a printable sheet, without its ids and glow filter (ids must
  // stay unique on the page).
  function logo(className) {
    var source = document.querySelector('.brand .logo');
    if (!source) return null;
    var copy = source.cloneNode(true);
    copy.setAttribute('class', className);
    Array.prototype.forEach.call(copy.querySelectorAll('[id], [filter]'), function (n) {
      n.removeAttribute('id');
      n.removeAttribute('filter');
    });
    return copy;
  }

  function scrollToEl(node, block) {
    if (!node) return;
    node.scrollIntoView({ behavior: reducedMotion && reducedMotion.matches ? 'auto' : 'smooth', block: block || 'start' });
  }

  // --- accent colour: the popover of the header's pads button ----------------------------
  // Auto (a new pad colour every day at noon, js/day-colour.js MMDay) or one of the 16 pad colours,
  // pinned, laid out like MASCHINE's pads: colour N on pad N, pad 1 bottom left, pad 16 top right.
  // No text on the pads (a label for screen readers only). The chosen pad has a white ring; under
  // Auto the Auto tile and today's pad both have it. Arrows move spatially (up = higher pad
  // numbers), Enter / Space choose, Esc closes.

  // The 16 pads, top row first (pads 13-16), each a palette index.
  function buildPads(grid) {
    var day = window.MMDay, palette = day && day.palette();
    if (!palette || grid.children.length === palette.length) return;
    grid.innerHTML = '';
    for (var row = 0; row < 4; row++) {
      for (var col = 0; col < 4; col++) {
        var index = (3 - row) * 4 + col;
        if (index >= palette.length) continue;
        var name = day.NAMES[index] || 'Colour ' + (index + 1);
        var pad = h('button', { type: 'button', role: 'radio', className: 'colour-pad', title: name,
          'aria-label': name, 'data-colour': String(index) });
        pad.style.setProperty('--pad', day.hex(palette[index]));
        grid.appendChild(pad);
      }
    }
  }

  function syncAccent() {
    var day = window.MMDay, palette = day && day.palette(), grid = el('colour-pads');
    var button = el('accent-button');
    if (!grid || !button) return;
    button.parentNode.hidden = !palette;
    if (!palette) return;
    buildPads(grid);
    var pinned = day.choice(), today = day.autoIndex();
    var auto = el('accent-list').querySelector('.colour-auto');
    auto.setAttribute('aria-checked', String(pinned === null));
    // the Auto tile is filled with today's colour, its text black or white, whichever reads better
    auto.style.setProperty('--pad', day.hex(palette[today]));
    auto.style.setProperty('--on-pad', day.hex(day.onColor(palette[today])));
    auto.setAttribute('aria-label', 'Auto: a new colour every day. Today: ' + (day.NAMES[today] || ''));
    Array.prototype.forEach.call(grid.children, function (pad) {
      var index = Number(pad.getAttribute('data-colour'));
      pad.setAttribute('aria-checked', String(pinned === index));
      pad.classList.toggle('is-today', pinned === null && index === today);
    });
    var current = pinned === null ? today : pinned;
    button.setAttribute('title', 'Accent colour: ' + (pinned === null ? 'Auto, today ' : '') + (day.NAMES[current] || ''));
  }

  function initAccent() {
    var button = el('accent-button'), menu = el('accent-list'), grid = el('colour-pads');
    if (!button || !menu) return;
    var auto = menu.querySelector('.colour-auto');
    syncAccent();
    if (window.MMDay) window.MMDay.onChange(syncAccent);
    function pads() { return Array.prototype.slice.call(grid.children); }
    function open() {
      syncAccent();
      menu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      var pinned = window.MMDay ? window.MMDay.choice() : null;
      (pinned === null ? auto : grid.querySelector('[data-colour="' + pinned + '"]') || auto).focus();
    }
    function close(focusButton) {
      if (menu.hidden) return;
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (focusButton) button.focus();
    }
    button.addEventListener('click', function () { if (menu.hidden) open(); else close(false); });
    button.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); }
    });
    auto.addEventListener('click', function () { if (window.MMDay) window.MMDay.pick(null); });
    grid.addEventListener('click', function (e) {
      var pad = e.target.closest && e.target.closest('.colour-pad');
      if (pad && window.MMDay) window.MMDay.pick(Number(pad.getAttribute('data-colour')));
    });
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
      var t = e.target, next = null, all = pads(), pi = all.indexOf(t);
      if (t === auto) {
        if (e.key === 'ArrowDown') next = all[0];
      } else if (pi >= 0) {
        var row = Math.floor(pi / 4);
        if (e.key === 'ArrowRight' && pi % 4 < 3) next = all[pi + 1];
        else if (e.key === 'ArrowLeft' && pi % 4 > 0) next = all[pi - 1];
        else if (e.key === 'ArrowUp') next = row > 0 ? all[pi - 4] : auto;
        else if (e.key === 'ArrowDown' && row < 3) next = all[pi + 4];
        else if (e.key === 'Home') next = all[row * 4];
        else if (e.key === 'End') next = all[row * 4 + 3];
      }
      if (next) { e.preventDefault(); next.focus(); }
    });
    // focus leaving the popover (Tab past its end) or a click outside closes it
    menu.addEventListener('focusout', function (e) {
      if (e.relatedTarget && !menu.contains(e.relatedTarget) && e.relatedTarget !== button) close(false);
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !menu.contains(e.target) && !button.contains(e.target)) close(false);
    });
  }

  // --- theme: System (default) / Light / Dark --------------------------------------------

  var THEME_ICONS = { system: 'auto', light: 'sun', dark: 'moon' };

  function applyTheme(choice) {
    if (choice !== 'light' && choice !== 'dark') choice = 'system';
    if (choice === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', choice);
    el('theme-icon').setAttribute('href', '#i-' + THEME_ICONS[choice]);
    el('theme-button').setAttribute('title', 'Theme: ' + choice.charAt(0).toUpperCase() + choice.slice(1));
    document.querySelectorAll('[data-theme-choice]').forEach(function (item) {
      item.setAttribute('aria-checked', String(item.getAttribute('data-theme-choice') === choice));
    });
    return choice;
  }

  function initTheme() {
    var button = el('theme-button');
    var menu = el('theme-list');
    var items = Array.prototype.slice.call(menu.querySelectorAll('[role="menuitemradio"]'));
    applyTheme(store('theme'));
    initAccent();

    function open() {
      menu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      var checked = items.filter(function (i) { return i.getAttribute('aria-checked') === 'true'; })[0] || items[0];
      checked.focus();
    }
    function close(focusButton) {
      if (menu.hidden) return;
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (focusButton) button.focus();
    }
    button.addEventListener('click', function () { if (menu.hidden) open(); else close(false); });
    button.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); }
    });
    items.forEach(function (item, index) {
      item.addEventListener('click', function () {
        var choice = applyTheme(item.getAttribute('data-theme-choice'));
        store('theme', choice === 'system' ? null : choice);
        close(true);
      });
      item.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowDown') next = items[(index + 1) % items.length];
        else if (e.key === 'ArrowUp') next = items[(index + items.length - 1) % items.length];
        else if (e.key === 'Home') next = items[0];
        else if (e.key === 'End') next = items[items.length - 1];
        else if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
        else if (e.key === 'Tab') { close(false); return; }
        if (next) { e.preventDefault(); next.focus(); }
      });
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !menu.contains(e.target) && !button.contains(e.target)) close(false);
    });
  }

  return {
    store: store, storeJSON: storeJSON, el: el, h: h, icon: icon, key: key, logo: logo,
    snackbar: snackbar, copyText: copyText, scrollToEl: scrollToEl, initTheme: initTheme,
    reducedMotion: function () { return !!(reducedMotion && reducedMotion.matches); }
  };
})());
