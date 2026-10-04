// The printable cheat sheet (#cheatsheet, #cheatsheet/mk3) for one controller, on a paper-like
// sheet: first the controller with its main controls labelled (js/cheatsheet-overview.js), then
// every section's combinations and texts in columns; @media print in css/styles.css prints only
// the sheet (black on white, small type, the overview on page 1, 3 columns from page 2). Built
// from data/features.json.
// The Highlights section is left out: each highlight is explained in its own section. The SHIFT +
// pads section also gets its 4 x 4 grid, drawn like the pads (top row = pads 13-16).
// The manual's "Print cheat sheet" button opens this view and the print dialog.
MM.cheatsheet = (function () {
  'use strict';

  var el = MM.el, h = MM.h;
  var SKIP = ['highlights'];
  var state = { data: null, device: 'mikro', printOnShow: false };

  function forDevice(entry) { return MM.manual.forDevice(entry, state.device); }

  function combo(tokens) {
    var wrap = h('span', { className: 'cs-combo' });
    tokens.forEach(function (token, i) {
      if (i) wrap.appendChild(h('span', { className: 'cs-plus', 'aria-hidden': 'true', text: '+' }));
      wrap.appendChild(h('kbd', { className: 'cs-key', text: token }));
    });
    return wrap;
  }

  function item(entry) {
    return h('p', { className: 'cs-item' }, [
      combo(entry.combo), ' ',
      h('span', { className: 'cs-does', text: entry.does + (entry.context ? ' (' + entry.context + ')' : '') })
    ]);
  }

  function grid(section) {
    var body = h('tbody');
    section.grid.forEach(function (row, r) {
      body.appendChild(h('tr', {}, row.map(function (label, c) {
        return h('td', {}, [h('span', { className: 'cs-pad', text: String((3 - r) * 4 + c + 1) }), label]);
      })));
    });
    return h('table', { className: 'cs-grid', 'aria-label': section.title }, [body]);
  }

  // Where the manual lives, for the sheet's header (not when opened from a file or this computer).
  function siteAddress() {
    if (!/^https?:$/.test(location.protocol) || /^(localhost|127\.|\[::1\])/.test(location.hostname)) return '';
    return location.host + location.pathname.replace(/index\.html$/, '');
  }

  // The site's logo (the app bar's), without its ids: they must stay unique on the page.
  function logo() {
    var source = document.querySelector('.brand .logo');
    if (!source) return null;
    var copy = source.cloneNode(true);
    copy.setAttribute('class', 'cs-logo');
    Array.prototype.forEach.call(copy.querySelectorAll('[id], [filter]'), function (n) {
      n.removeAttribute('id');
      n.removeAttribute('filter');
    });
    return copy;
  }

  function render() {
    var data = state.data, device = data.devices[state.device];
    var root = el('cheatsheet');
    root.innerHTML = '';
    root.setAttribute('aria-label', 'Cheat sheet for the ' + device.name);

    var legend = h('dl', { className: 'cs-legend' });
    Object.keys(data.notation || {}).forEach(function (token) {
      legend.appendChild(h('div', {}, [
        h('dt', {}, [token === '+' ? h('span', { className: 'cs-plus', text: '+' }) : h('kbd', { className: 'cs-key', text: token })]),
        h('dd', { text: data.notation[token] })
      ]));
    });
    var address = siteAddress();
    root.appendChild(h('header', { className: 'cs-head' }, [
      h('div', { className: 'cs-brand' }, [
        h('div', { className: 'cs-title-row' }, [logo(), h('h1', { id: 'cs-title', text: data.product })]),
        h('p', { className: 'cs-meta' }, [
          h('strong', { text: device.name }), ' · Cheat sheet · v' + data.version,
          address ? ' · ' + address : null
        ]),
        device.verified ? null : h('p', { className: 'cs-note',
          text: 'MK3 / MASCHINE+ support is built from the hardware protocol and not yet tested on a real unit.' })
      ]),
      legend
    ]));

    var figure = h('figure', { className: 'cs-overview' });
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('role', 'img');
    figure.appendChild(svg);
    root.appendChild(figure);
    MM.cheatsheetOverview.draw(svg, state.device, data);

    var columns = h('div', { className: 'cs-columns' });
    data.sections.forEach(function (section) {
      if (SKIP.indexOf(section.id) >= 0 || !forDevice(section)) return;
      var items = section.items.filter(forDevice);
      if (!items.length) return;
      // the title stays with the grid or the first item (no title alone at the foot of a column)
      var keep = h('div', { className: 'cs-keep' }, [h('h2', { text: section.title })]);
      if (section.grid) keep.appendChild(grid(section));
      else keep.appendChild(item(items.shift()));
      columns.appendChild(h('section', { className: 'cs-section' }, [keep].concat(items.map(item))));
    });
    root.appendChild(columns);
  }

  function setDevice(device) {
    if (!state.data.devices[device]) return;
    state.device = device;
    MM.store('device', device);
    document.querySelectorAll('#view-cheatsheet .segmented button').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-device') === device));
      b.setAttribute('tabindex', b.getAttribute('data-device') === device ? '0' : '-1');
    });
    el('cs-back').setAttribute('href', '#' + device);
    render();
    var hash = '#cheatsheet/' + device;
    if (location.hash !== hash) {
      try { history.replaceState(null, '', hash); } catch (e) { /* keep the old hash */ }
    }
  }

  function print() {
    function go() { window.print(); }
    // wait for the web font, so the printed sheet is laid out like the preview
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(go, 60); });
    else setTimeout(go, 60);
  }

  function init(data) {
    state.data = data;
    var buttons = Array.prototype.slice.call(document.querySelectorAll('#view-cheatsheet .segmented button'));
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
    el('cs-print').addEventListener('click', print);
    // the manual's button: open the sheet for the manual's controller, then the print dialog
    el('cheatsheet-button').addEventListener('click', function (e) {
      e.preventDefault();
      var device = data.devices[MM.store('device')] ? MM.store('device') : 'mikro';
      state.printOnShow = true;
      location.hash = '#cheatsheet/' + device;
    });
  }

  // parts: the hash after "cheatsheet/": [device]
  function show(parts) {
    var stored = MM.store('device');
    setDevice(state.data.devices[parts[0]] ? parts[0] : state.data.devices[stored] ? stored : 'mikro');
    if (state.printOnShow) {
      state.printOnShow = false;
      print();
    }
  }

  return { init: init, show: show };
})();
