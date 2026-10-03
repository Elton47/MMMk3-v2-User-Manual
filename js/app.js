(function () {
  'use strict';

  var SVG = 'http://www.w3.org/2000/svg';
  var state = { data: null, device: 'mikro', selected: null, query: '' };
  var el = function (id) { return document.getElementById(id); };

  function store(key, value) {
    try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); } catch (e) { return null; }
    return null;
  }

  // --- data helpers ------------------------------------------------------------------------

  function forDevice(entry) {
    return !entry.devices || entry.devices.indexOf(state.device) >= 0;
  }

  function layout() { return LAYOUTS[state.device]; }

  function controlIds() { return layout().controls.map(function (c) { return c[0]; }); }

  function controlsForToken(token) {
    return controlIds().filter(function (id) { return tokenMatches(token, id); });
  }

  function itemUsesControl(item, id) {
    return item.combo.some(function (token) { return tokenMatches(token, id); });
  }

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

  function drawDevice() {
    var svg = el('device');
    var spec = layout();
    svg.innerHTML = '';
    svg.setAttribute('viewBox', '0 0 ' + spec.width + ' ' + spec.height);
    node('rect', { x: 4, y: 4, width: spec.width - 8, height: spec.height - 8, rx: 26, 'class': 'hw-body' }, svg);
    spec.controls.forEach(function (c) {
      var id = c[0], label = c[1], x = c[2], y = c[3], w = c[4], h = c[5], kind = c[6];
      var g = node('g', { 'class': 'hw-control ' + kind, 'data-id': id, tabindex: kind === 'screen' ? -1 : 0,
        role: 'button', 'aria-label': id }, svg);
      if (kind === 'pad') g.style.setProperty('--pad-color', PAD_COLORS[Number(label) - 1]);
      if (kind === 'encoder' || kind === 'knob') {
        var r = Math.min(w, h) / 2;
        node('circle', { cx: x + w / 2, cy: y + h / 2, r: r, 'class': 'ring' }, g);
        if (kind === 'encoder') node('circle', { cx: x + w / 2, cy: y + h / 2, r: r * 0.62 }, g);
      } else {
        node('rect', { x: x, y: y, width: w, height: h, rx: kind === 'pad' ? 10 : 6 }, g);
      }
      var text = node('text', { x: x + w / 2, y: y + h / 2 }, g);
      text.textContent = kind === 'screen' ? spec.title.replace('MASCHINE ', '') : label;
      if (kind !== 'screen') {
        g.addEventListener('click', function () { select(id); });
        g.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); }
        });
      }
    });
    node('g', { id: 'badges' }, svg);
    paintHardware();
  }

  function setClass(id, cls, on) {
    var g = el('device').querySelector('[data-id="' + id.replace(/"/g, '\\"') + '"]');
    if (g) g.classList.toggle(cls, on);
  }

  function paintHardware(combo) {
    controlIds().forEach(function (id) {
      setClass(id, 'selected', id === state.selected);
      setClass(id, 'related', false);
    });
    var badges = el('badges');
    if (!badges) return;
    badges.innerHTML = '';
    if (!combo) return;
    combo.forEach(function (token, index) {
      var ids = controlsForToken(token);
      ids.forEach(function (id) { setClass(id, 'related', true); });
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
    var wrap = document.createElement('span');
    wrap.className = 'combo';
    combo.forEach(function (token, i) {
      if (i) {
        var plus = document.createElement('span');
        plus.className = 'plus';
        plus.textContent = '+';
        wrap.appendChild(plus);
      }
      var key = document.createElement('span');
      key.className = 'key' + (token === 'SHIFT' ? ' shift' : '');
      key.textContent = token;
      wrap.appendChild(key);
    });
    return wrap;
  }

  function itemElement(item, sectionTitle) {
    var li = document.createElement('li');
    if (sectionTitle) {
      var label = document.createElement('div');
      label.className = 'section-label';
      label.textContent = sectionTitle;
      li.appendChild(label);
    }
    li.appendChild(comboElement(item.combo));
    var does = document.createElement('span');
    does.className = 'does';
    does.textContent = item.does;
    if (item.context) {
      var context = document.createElement('span');
      context.className = 'context';
      context.textContent = ' (' + item.context + ')';
      does.appendChild(context);
    }
    li.appendChild(does);
    li.addEventListener('mouseenter', function () { paintHardware(item.combo); });
    li.addEventListener('mouseleave', function () { paintHardware(); });
    li.addEventListener('click', function () { paintHardware(item.combo); });
    return li;
  }

  function swatchTable(section, swatches) {
    // Drum pad name colours: a colour dot, its name, and the words that give it.
    var wrap = document.createElement('div');
    wrap.className = 'swatches';
    if (section.swatches_note) {
      var note = document.createElement('p');
      note.className = 'summary';
      note.textContent = section.swatches_note;
      wrap.appendChild(note);
    }
    var table = document.createElement('table');
    var head = table.createTHead().insertRow();
    ['Colour', 'Pad name contains'].forEach(function (title) {
      var th = document.createElement('th');
      th.textContent = title;
      head.appendChild(th);
    });
    var body = table.createTBody();
    swatches.forEach(function (swatch) {
      var row = body.insertRow();
      var name = row.insertCell();
      var dot = document.createElement('span');
      dot.className = 'swatch';
      dot.style.background = swatch.rgb;
      name.appendChild(dot);
      name.appendChild(document.createTextNode(swatch.name));
      var words = row.insertCell();
      swatch.keywords.forEach(function (keyword) {
        var code = document.createElement('code');
        code.textContent = keyword;
        words.appendChild(code);
        words.appendChild(document.createTextNode(' '));
      });
      if (swatch.note) {
        var small = document.createElement('span');
        small.className = 'context';
        small.textContent = '(' + swatch.note + ')';
        words.appendChild(small);
      }
    });
    var scroll = document.createElement('div');
    scroll.className = 'table-wrap';
    scroll.appendChild(table);
    wrap.appendChild(scroll);
    return wrap;
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
      var card = document.createElement('section');
      card.className = 'card';
      card.id = section.id;
      var h = document.createElement('h2');
      h.textContent = section.title;
      if (section.devices) {
        var tag = document.createElement('span');
        tag.className = 'device-tag';
        tag.textContent = state.data.devices[section.devices[0]].name.replace('MASCHINE ', '').split(' /')[0] + ' only';
        h.appendChild(tag);
      }
      card.appendChild(h);
      if (section.summary) {
        var p = document.createElement('p');
        p.className = 'summary';
        p.textContent = section.summary;
        card.appendChild(p);
      }
      if (section.grid && !query) {
        var grid = document.createElement('div');
        grid.className = 'shift-grid';
        section.grid.forEach(function (row) {
          row.forEach(function (label) {
            var cell = document.createElement('div');
            cell.textContent = label;
            grid.appendChild(cell);
          });
        });
        card.appendChild(grid);
      }
      if (swatches.length) card.appendChild(swatchTable(section, swatches));
      var list = document.createElement('ul');
      list.className = 'items';
      items.forEach(function (item) { list.appendChild(itemElement(item)); });
      card.appendChild(list);
      container.appendChild(card);
      var link = document.createElement('a');
      link.href = '#' + section.id;
      link.textContent = section.title.split(':')[0];
      toc.appendChild(link);
    });
    if (!container.children.length) {
      container.innerHTML = '<p class="empty">Nothing matches that search.</p>';
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
    if (!found) list.innerHTML = '<li class="empty">No function in this version.</li>';
    box.hidden = false;
    paintHardware();
  }

  function renderChanges() {
    var body = el('changes-table').querySelector('tbody');
    body.innerHTML = '';
    state.data.changes.forEach(function (change) {
      var tr = document.createElement('tr');
      [change.what, change.v1 || '–', change.v2].forEach(function (text) {
        var td = document.createElement('td');
        td.textContent = text;
        tr.appendChild(td);
      });
      body.appendChild(tr);
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
    if (state.selected && window.matchMedia('(max-width: 980px)').matches) {
      el('selection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function setDevice(device) {
    if (!LAYOUTS[device]) return;
    state.device = device;
    store('device', device);
    document.querySelectorAll('.segmented button').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-device') === device));
    });
    el('unverified').hidden = state.data.devices[device].verified;
    if (state.selected && controlIds().indexOf(state.selected) < 0) state.selected = null;
    drawDevice();
    renderSections();
    renderSelection();
    updateHash();
  }

  function applyTheme(theme) {
    if (theme) document.documentElement.setAttribute('data-theme', theme);
  }

  function init(data) {
    state.data = data;
    el('version').textContent = 'v' + data.version;
    renderChanges();
    var parts = location.hash.slice(1).split('/');
    var device = LAYOUTS[parts[0]] ? parts[0] : (store('device') || 'mikro');
    state.selected = parts[1] ? decodeURIComponent(parts[1]) : null;
    setDevice(device);

    document.querySelectorAll('.segmented button').forEach(function (b) {
      b.addEventListener('click', function () { setDevice(b.getAttribute('data-device')); });
    });
    el('search').addEventListener('input', function (e) {
      state.query = e.target.value.trim().toLowerCase();
      renderSections();
    });
    el('clear-selection').addEventListener('click', function () { select(state.selected); });
    applyTheme(store('theme'));
    el('theme').addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      store('theme', next);
    });
  }

  fetch('data/features.json')
    .then(function (r) { return r.json(); })
    .then(init)
    .catch(function () {
      el('sections').innerHTML = '<p class="empty">Could not load the manual data (open the page through a web server).</p>';
    });
})();
