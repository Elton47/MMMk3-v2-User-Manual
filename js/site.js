// Shared helpers: storage, element building, icons, snackbar, clipboard, theme.
var MM = (function () {
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

  function scrollToEl(node, block) {
    if (!node) return;
    node.scrollIntoView({ behavior: reducedMotion && reducedMotion.matches ? 'auto' : 'smooth', block: block || 'start' });
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
    store: store, storeJSON: storeJSON, el: el, h: h, icon: icon, key: key,
    snackbar: snackbar, copyText: copyText, scrollToEl: scrollToEl, initTheme: initTheme,
    reducedMotion: function () { return !!(reducedMotion && reducedMotion.matches); }
  };
})();
