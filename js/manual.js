// The interactive manual: schematic controller, sections from data/features.json, search,
// selection, deep links (#mikro/SHIFT, #mk3/PLUG-IN).
MM.manual = (function () {
  'use strict';

  var SVG = 'http://www.w3.org/2000/svg';
  var el = MM.el, h = MM.h;
  var state = { data: null, device: 'mikro', selected: null, query: '', ready: false };

  // --- data helpers ------------------------------------------------------------------------

  function forDevice(entry) { return !entry.devices || entry.devices.indexOf(state.device) >= 0; }
  function layout() { return LAYOUTS[state.device]; }
  function controlIds() { return layout().controls.map(function (c) { return c[0]; }); }
  function controlsForToken(token) { return controlIds().filter(function (id) { return tokenMatches(token, id); }); }
  function itemUsesControl(item, id) { return item.combo.some(function (token) { return tokenMatches(token, id); }); }

  function itemText(section, item) {
    return (section.title + ' ' + item.combo.join(' ') + ' ' + item.does + ' ' + (item.context || '')).toLowerCase();
  }

  function visibleSections() {
    return state.data.sections.filter(forDevice).map(function (section) {
      return { section: section, items: section.items.filter(forDevice) };
    });
  }

  // --- hardware drawing --------------------------------------------------------------------

  function node(name, attrs, parent) {
    var n = document.createElementNS(SVG, name);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  function controlName(id, label) {
    if (/^PAD \d+$/.test(id)) return 'Pad ' + label;
    if (id === '◀') return 'Left arrow';
    if (id === '▶') return 'Right arrow';
    return id;
  }

  function drawDevice() {
    var svg = el('device');
    var spec = layout();
    svg.innerHTML = '';
    svg.setAttribute('viewBox', '0 0 ' + spec.width + ' ' + spec.height);
    svg.setAttribute('aria-label', spec.title + ' layout: choose a control to see what it does');
    node('rect', { x: 4, y: 4, width: spec.width - 8, height: spec.height - 8, rx: 26, 'class': 'hw-body' }, svg);
    spec.controls.forEach(function (c) {
      var id = c[0], label = c[1], x = c[2], y = c[3], w = c[4], hgt = c[5], kind = c[6];
      var interactive = kind !== 'screen';
      var g = node('g', { 'class': 'hw-control ' + kind, 'data-id': id }, svg);
      if (interactive) {
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', controlName(id, label));
        g.setAttribute('aria-pressed', 'false');
      }
      if (kind === 'pad') g.style.setProperty('--pad-color', PAD_COLORS[Number(label) - 1]);
      if (kind === 'encoder' || kind === 'knob') {
        var r = Math.min(w, hgt) / 2;
        node('circle', { cx: x + w / 2, cy: y + hgt / 2, r: r, 'class': 'ring' }, g);
        if (kind === 'encoder') node('circle', { cx: x + w / 2, cy: y + hgt / 2, r: r * 0.62 }, g);
      } else {
        node('rect', { x: x, y: y, width: w, height: hgt, rx: kind === 'pad' ? 10 : 6 }, g);
      }
      var text = node('text', { x: x + w / 2, y: y + hgt / 2 }, g);
      text.textContent = kind === 'screen' ? spec.title.replace('MASCHINE ', '') : label;
      if (interactive) {
        g.addEventListener('click', function () { select(id); });
        g.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); }
        });
      }
    });
    node('g', { id: 'badges' }, svg);
    paintHardware();
  }

  function controlNode(id) {
    return el('device').querySelector('[data-id="' + id.replace(/"/g, '\\"') + '"]');
  }

  function paintHardware(combo) {
    controlIds().forEach(function (id) {
      var g = controlNode(id);
      if (!g) return;
      g.classList.toggle('selected', id === state.selected);
      g.classList.remove('related');
      if (g.hasAttribute('aria-pressed')) g.setAttribute('aria-pressed', String(id === state.selected));
    });
    var badges = el('badges');
    if (!badges) return;
    badges.innerHTML = '';
    if (!combo) return;
    combo.forEach(function (token, index) {
      var ids = controlsForToken(token);
      ids.forEach(function (id) { var g = controlNode(id); if (g) g.classList.add('related'); });
      // number only single-control tokens, so "PAD" (all pads) doesn't get 16 badges
      if (ids.length === 1 && combo.length > 1) {
        var c = layout().controls.filter(function (x) { return x[0] === ids[0]; })[0];
        var b = node('g', { 'class': 'badge' }, badges);
        node('circle', { cx: c[2] + c[4] - 4, cy: c[3] + 4, r: 11 }, b);
        node('text', { x: c[2] + c[4] - 4, y: c[3] + 4 }, b).textContent = String(index + 1);
      }
    });
  }

  // --- reference ---------------------------------------------------------------------------

  function comboElement(combo) {
    var wrap = h('span', { className: 'combo' });
    combo.forEach(function (token, i) {
      if (i) wrap.appendChild(h('span', { className: 'plus', 'aria-hidden': 'true', text: '+' }));
      wrap.appendChild(MM.key(token));
    });
    return wrap;
  }

  function itemElement(item, sectionTitle) {
    var does = h('span', { className: 'does', text: item.does });
    if (item.context) does.appendChild(h('span', { className: 'context', text: ' (' + item.context + ')' }));
    var li = h('li', {}, [
      sectionTitle ? h('div', { className: 'section-label', text: sectionTitle }) : null,
      comboElement(item.combo),
      does
    ]);
    li.addEventListener('mouseenter', function () { paintHardware(item.combo); });
    li.addEventListener('mouseleave', function () { paintHardware(); });
    li.addEventListener('click', function () { paintHardware(item.combo); });
    return li;
  }

  function swatchTable(section, swatches) {
    // Drum pad name colours: a colour dot, its name, and the words that give it.
    var body = h('tbody');
    swatches.forEach(function (swatch) {
      var dot = h('span', { className: 'swatch', 'aria-hidden': 'true' });
      dot.style.background = swatch.rgb;
      var words = h('td');
      swatch.keywords.forEach(function (keyword) {
        words.appendChild(h('code', { text: keyword }));
        words.appendChild(document.createTextNode(' '));
      });
      if (swatch.note) words.appendChild(h('span', { className: 'context', text: '(' + swatch.note + ')' }));
      body.appendChild(h('tr', {}, [h('td', {}, [dot, swatch.name]), words]));
    });
    var table = h('table', {}, [
      h('thead', {}, [h('tr', {}, [h('th', { scope: 'col', text: 'Colour' }), h('th', { scope: 'col', text: 'Pad name contains' })])]),
      body
    ]);
    return h('div', { className: 'swatches' }, [
      section.swatches_note ? h('p', { className: 'summary', text: section.swatches_note }) : null,
      h('div', { className: 'table-wrap' }, [table])
    ]);
  }

  function shiftGrid(section) {
    // The SHIFT + pads matrix, drawn like the pads: top row = pads 13-16. Hover lights it.
    var grid = h('div', { className: 'shift-grid', role: 'group', 'aria-label': 'SHIFT + pads' });
    section.grid.forEach(function (row, r) {
      row.forEach(function (label, c) {
        var pad = (3 - r) * 4 + c + 1;
        var combo = ['SHIFT', 'PAD ' + pad];
        var cell = h('button', { type: 'button', 'aria-label': 'SHIFT + pad ' + pad + ': ' + label },
          [h('span', { text: label }), h('small', { text: 'pad ' + pad, 'aria-hidden': 'true' })]);
        cell.addEventListener('mouseenter', function () { paintHardware(combo); });
        cell.addEventListener('focus', function () { paintHardware(combo); });
        cell.addEventListener('mouseleave', function () { paintHardware(); });
        cell.addEventListener('blur', function () { paintHardware(); });
        cell.addEventListener('click', function () { paintHardware(combo); });
        grid.appendChild(cell);
      });
    });
    return grid;
  }

  function renderSections() {
    var container = el('sections');
    var toc = el('toc');
    container.innerHTML = '';
    toc.innerHTML = '';
    var query = state.query;
    visibleSections().forEach(function (entry) {
      var section = entry.section;
      var items = entry.items.filter(function (item) { return !query || itemText(section, item).indexOf(query) >= 0; });
      var swatches = (section.swatches || []).filter(function (swatch) {
        return !query || (swatch.name + ' ' + swatch.keywords.join(' ') + ' ' + (swatch.note || '')).toLowerCase().indexOf(query) >= 0;
      });
      if (query && !items.length && !swatches.length) return;
      var heading = h('h2', { id: 'h-' + section.id, text: section.title });
      if (section.devices) {
        heading.appendChild(h('span', { className: 'device-tag',
          text: state.data.devices[section.devices[0]].name.replace('MASCHINE ', '').split(' /')[0] + ' only' }));
      }
      var list = h('ul', { className: 'items' });
      items.forEach(function (item) { list.appendChild(itemElement(item)); });
      container.appendChild(h('section', { className: 'card', id: section.id, 'aria-labelledby': 'h-' + section.id }, [
        heading,
        section.summary ? h('p', { className: 'summary', text: section.summary }) : null,
        section.grid && !query ? shiftGrid(section) : null,
        swatches.length ? swatchTable(section, swatches) : null,
        list
      ]));
      var link = h('a', { href: '#' + section.id, text: section.title.split(':')[0] });
      link.addEventListener('click', function (e) {
        e.preventDefault();
        MM.scrollToEl(el(section.id));
      });
      toc.appendChild(link);
    });
    if (!container.children.length) {
      container.appendChild(h('p', { className: 'empty', text: 'Nothing matches that search.' }));
    }
  }

  function renderSelection() {
    var box = el('selection');
    if (!state.selected) { box.hidden = true; paintHardware(); return; }
    var list = el('selection-items');
    list.innerHTML = '';
    var id = state.selected;
    el('selection-title').textContent = /^PAD \d+$/.test(id) ? 'Pads' : id;
    var found = 0;
    visibleSections().forEach(function (entry) {
      entry.items.forEach(function (item) {
        if (itemUsesControl(item, id)) {
          list.appendChild(itemElement(item, entry.section.title));
          found++;
        }
      });
    });
    if (!found) list.appendChild(h('li', { className: 'empty', text: 'No function in this version.' }));
    box.hidden = false;
    paintHardware();
  }

  function renderChanges() {
    var body = el('changes-table').querySelector('tbody');
    body.innerHTML = '';
    state.data.changes.forEach(function (change) {
      body.appendChild(h('tr', {}, [h('td', { text: change.what }), h('td', { text: change.v1 || '–' }), h('td', { text: change.v2 })]));
    });
  }

  // --- state -------------------------------------------------------------------------------

  function updateHash() {
    var hash = '#' + state.device + (state.selected ? '/' + encodeURIComponent(state.selected) : '');
    if (location.hash !== hash) history.replaceState(null, '', hash);
  }

  function select(id) {
    state.selected = state.selected === id ? null : id;
    renderSelection();
    updateHash();
    if (state.selected && window.matchMedia('(max-width: 1100px)').matches) MM.scrollToEl(el('selection'));
  }

  function setDevice(device, keepHash) {
    if (!LAYOUTS[device]) return;
    state.device = device;
    MM.store('device', device);
    document.querySelectorAll('.segmented button').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-device') === device));
      b.setAttribute('tabindex', b.getAttribute('data-device') === device ? '0' : '-1');
    });
    el('unverified').hidden = state.data.devices[device].verified;
    if (state.selected && controlIds().indexOf(state.selected) < 0) state.selected = null;
    drawDevice();
    renderSections();
    renderSelection();
    if (!keepHash) updateHash();
  }

  function updateWelcome() {
    el('welcome').hidden = !!(MM.store('setupDone') || MM.store('welcomeDismissed'));
  }

  function init(data) {
    state.data = data;
    renderChanges();
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.segmented button'));
    buttons.forEach(function (b, index) {
      b.addEventListener('click', function () { setDevice(b.getAttribute('data-device')); });
      b.addEventListener('keydown', function (e) {
        var step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        var next = buttons[(index + step + buttons.length) % buttons.length];
        setDevice(next.getAttribute('data-device'));
        next.focus();
      });
    });
    el('search').addEventListener('input', function (e) {
      state.query = e.target.value.trim().toLowerCase();
      renderSections();
    });
    el('clear-selection').addEventListener('click', function () { select(state.selected); });
    el('welcome-dismiss').addEventListener('click', function () {
      MM.store('welcomeDismissed', '1');
      updateWelcome();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || el('view-manual').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      e.preventDefault();
      el('search').focus();
    });
  }

  // parts: the hash split on "/": [device or section id, control]
  function show(parts) {
    var first = parts[0] || '';
    var device = LAYOUTS[first] ? first : (LAYOUTS[MM.store('device')] ? MM.store('device') : 'mikro');
    var section = !LAYOUTS[first] && first && first !== 'manual' ? first : null;
    state.selected = LAYOUTS[first] && parts[1] ? decodeURIComponent(parts[1]) : null;
    if (!state.ready || device !== state.device) {
      state.ready = true;
      setDevice(device, !!section);
    } else {
      if (state.selected && controlIds().indexOf(state.selected) < 0) state.selected = null;
      renderSelection();
      if (!section) updateHash();
    }
    updateWelcome();
    if (section && el(section)) {
      setTimeout(function () { MM.scrollToEl(el(section)); }, 0);
    } else if (state.selected && window.matchMedia('(max-width: 1100px)').matches) {
      setTimeout(function () { MM.scrollToEl(el('selection')); }, 0);
    }
  }

  function setDeviceFromSetup(device) {
    if (LAYOUTS[device]) MM.store('device', device);
  }

  function hasSection(id) {
    return !!(state.data && state.data.sections.some(function (s) { return s.id === id; }));
  }

  return { init: init, show: show, setDeviceFromSetup: setDeviceFromSetup, hasSection: hasSection, updateWelcome: updateWelcome };
})();
