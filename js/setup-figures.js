// Drawings for the setup steps, in the manual's own look (no screenshots): the folder to drag, the
// two loopMIDI ports, Live's MIDI settings as a diagram, and the controller with its screen (the
// manual's drawing and the MIKRO's screen renderer, pixel for pixel). The printable guide
// (#setup/print...) shows them beside the step's text. Every name in them comes from
// data/install.json (its vars and the step's own text); the screens show what the controller
// really shows: the bridge's setup pages (setup_pages() in bridge/maschine_bridge/app.py of the
// script repository), the layout's default screen once Live is connected, and the settings page.
// A drawing for several controllers shows the MASCHINE MIKRO MK3 and says so.
MM.setupFigures = (function () {
  'use strict';

  var h = MM.h;
  var SHOWN = 'mikro';  // the controller the drawings show when the guide is for several

  // The bridge's waiting pages, by route (setup_pages() in the bridge): without the loopMIDI
  // ports, and with them while Live isn't connected yet. {in} / {out}: the port names.
  var PAGES_NO_PORTS = [['Needs loopMIDI', 'See the setup guide'], ['Create port', '{in}'], ['Create port', '{out}'],
    ['Or use v1.6.1', 'In the same download']];
  var PAGES_WAITING = [['MASCHINE for Live', 'Waiting for Live...'], ['Live: Settings', 'Link, Tempo & MIDI'],
    ['Input', '{in}'], ['Output', '{out}'], ['Output may show', '{in} (Port 2)']];

  function svgNode(tag, attrs, parent) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  function folderIcon() {
    var svg = svgNode('svg', { viewBox: '0 0 24 24', 'class': 'sf-folder-icon', 'aria-hidden': 'true' });
    svgNode('path', { d: 'M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z' }, svg);
    return svg;
  }

  function zipIcon() {
    var svg = svgNode('svg', { viewBox: '0 0 24 24', 'class': 'sf-folder-icon zip', 'aria-hidden': 'true' });
    svgNode('path', { d: 'M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z' }, svg);
    svgNode('path', { d: 'M13 9v1.5M13 12v1.5M13 15v1.5', 'class': 'zip-teeth' }, svg);
    return svg;
  }

  function folder(name, extra, children, cls) {
    var row = h('span', { className: 'sf-name' }, [folderIcon(), h('span', { text: name }), extra || null]);
    return h('li', { className: cls || null }, [row, children && children.length ? h('ul', {}, children) : null]);
  }

  // the folder names a step's text gives in `code`
  function codeNames(text) {
    var names = [];
    text.replace(/`([A-Za-z0-9_]+)`/g, function (m, name) { if (names.indexOf(name) < 0) names.push(name); return m; });
    return names;
  }

  function caption(parts) { return h('figcaption', {}, parts); }

  // the MIKRO's screen on its own: the picture of a screen state, in the OLED's black glass
  function oled(state, label) {
    var img = MM.screen.render(state, MM.screenLines);
    var svg = svgNode('svg', { viewBox: '0 0 132 36', 'class': 'sf-oled', role: 'img', 'aria-label': (state.TITLE || '') + ' ' + (state.SUBTITLE || '') });
    svgNode('rect', { x: 0, y: 0, width: 132, height: 36, rx: 2.5, 'class': 'sf-oled-glass' }, svg);
    svgNode('path', { d: MM.screen.path(img, 2, 2, 1), 'class': 'sf-oled-pixels' }, svg);
    return h('div', { className: 'sf-screen' }, [svg, label ? h('span', { className: 'sf-screen-label', text: label }) : null]);
  }

  function page(pair, names) {
    var sub = pair[1].replace('{in}', names.in).replace('{out}', names.out);
    return oled({ TITLE: pair[0], SUBTITLE: sub });
  }

  // the controller drawing (the manual's), these controls lit as the manual lights related ones
  function controller(device, screen, lit) {
    var svg = svgNode('svg', { 'class': 'sf-device', role: 'img', 'aria-label': 'The controller' });
    var holder = h('div', { className: 'sf-device-wrap' }, [svg]);
    var drawing = MM.manual.createDrawing(svg);
    drawing.draw(device);
    if (drawing.oled && screen) drawing.showScreen(screen);
    (lit || []).forEach(function (id) {
      var g = drawing.node(id);
      if (g) g.classList.add('related');
    });
    // the screen as vector pixels (sharp at any size, on paper too), not the on-screen raster:
    // without its oled the drawing never paints the raster
    var group = drawing.oled && drawing.oled.group;
    if (group) {
      group.classList.remove('raster');
      var image = group.querySelector('image');
      if (image) image.parentNode.removeChild(image);
      drawing.oled = null;
    }
    return holder;
  }

  function keys(tokens) {
    var span = h('span', { className: 'sf-keys' });
    tokens.forEach(function (t, i) {
      if (i) span.appendChild(document.createTextNode(' + '));
      span.appendChild(MM.key(t));
    });
    return span;
  }

  // --- the drawings, by step id ---------------------------------------------------------
  // env: value(var, option) a var's value for one option; text the step's own texts (for its
  // `code` names); several: true when the guide is for more than one controller; device: the
  // controller shown; version: the script's version.

  var FIGURES = {
    // One drag: the zip's Remote Scripts folder onto the User Library, merged.
    copy: { when: { os: ['win11', 'win10'] }, make: function (env) {
      var names = codeNames(env.text);
      var library = env.value('library_path', 'win11').split('\\');
      var from = h('div', { className: 'sf-box' }, [
        h('p', { className: 'sf-box-title' }, [zipIcon(), h('span', { text: 'The download (zip)' })]),
        h('ul', { className: 'sf-tree' }, [folder('Remote Scripts', null, names.map(function (n) { return folder(n); }), 'sf-hot')])
      ]);
      var to = h('div', { className: 'sf-box' }, [
        h('p', { className: 'sf-box-title' }, [folderIcon(), h('span', { text: library.join(' › ') })]),
        h('ul', { className: 'sf-tree' }, [folder('Remote Scripts', null,
          names.map(function (n) { return folder(n, null, null, 'sf-new'); }), 'sf-hot')])
      ]);
      var arrow = h('div', { className: 'sf-arrow', 'aria-hidden': 'true' }, [h('span', { text: 'drag' })]);
      return { node: h('figure', { className: 'sf sf-copy' }, [h('div', { className: 'sf-flow' }, [from, arrow, to]),
        caption(['One drag: the two ', h('strong', { text: 'Remote Scripts' }), ' folders merge.'])]) };
    } },

    // Updating: the three folders deleted first, then the new ones copied in as when installing.
    update: { make: function (env) {
      var names = codeNames(env.text);
      var windows = !env.ctx.os || env.ctx.os.every(function (o) { return o !== 'macos'; });
      function box(title, rows) {
        return h('div', { className: 'sf-box' }, [h('p', { className: 'sf-box-title' }, [folderIcon(), h('span', { text: title })]),
          h('ul', { className: 'sf-tree' }, [folder('Remote Scripts', null, rows, 'sf-hot')])]);
      }
      var before = box('1. Delete the three', names.map(function (n) { return folder(n, null, null, 'sf-del'); }));
      var after = box('2. Then the new ones', names.map(function (n) { return folder(n, null, null, 'sf-new'); }));
      var arrow = h('div', { className: 'sf-arrow', 'aria-hidden': 'true' }, [h('span', { text: windows ? 'drag' : 'copy' })]);
      return { node: h('figure', { className: 'sf sf-copy' }, [h('div', { className: 'sf-flow' }, [before, arrow, after])]) };
    } },

    // The two ports in a loopMIDI-like panel (a diagram, not loopMIDI's window).
    ports: { make: function (env) {
      var names = { in: env.value('in_port', env.device), out: env.value('out_port', env.device) };
      var panel = h('div', { className: 'sf-panel' }, [
        h('p', { className: 'sf-panel-bar', text: 'loopMIDI' }),
        h('div', { className: 'sf-field-row' }, [
          h('span', { className: 'sf-field-label', text: 'New port-name' }),
          h('span', { className: 'sf-field', text: names.out }),
          h('span', { className: 'sf-plus', text: '+' })
        ]),
        h('ul', { className: 'sf-port-list' }, [
          h('li', {}, [h('span', { className: 'sf-num', text: '1' }), h('span', { className: 'sf-mono', text: names.in })]),
          h('li', {}, [h('span', { className: 'sf-num', text: '2' }), h('span', { className: 'sf-mono', text: names.out })])
        ])
      ]);
      return { node: h('figure', { className: 'sf sf-ports' }, [panel,
        env.several ? caption(['For the ' + env.deviceName + '; the other controllers’ names are in the table.']) : null]) };
    } },

    // Live's settings as a diagram: v1.6.1's row set to None, the new row, the MIDI ports.
    'live-settings': { make: function (env) {
      var surface = env.value('surface', env.device), input = env.value('in_port', env.device), output = env.value('out_port', env.device);
      function select(text, off) { return h('span', { className: 'sf-select' + (off ? ' off' : ''), text: text }); }
      function toggle(on) { return h('span', { className: 'sf-toggle' + (on ? ' on' : ''), text: on ? 'On' : 'Off' }); }
      var surfaces = h('table', { className: 'sf-grid' }, [
        h('thead', {}, [h('tr', {}, [h('th', { text: 'Control Surface' }), h('th', { text: 'Input' }), h('th', { text: 'Output' })])]),
        h('tbody', {}, [
          h('tr', { className: 'sf-dim' }, [h('td', {}, [select('None', true), h('span', { className: 'sf-aside', text: 'v1.6’s row, if any' })]),
            h('td', {}, [select('None', true)]), h('td', {}, [select('None', true)])]),
          h('tr', { className: 'sf-on' }, [h('td', {}, [select(surface)]), h('td', {}, [select(input)]), h('td', {}, [select(output)])])
        ])
      ]);
      var ports = h('table', { className: 'sf-grid sf-ports-grid' }, [
        h('thead', {}, [h('tr', {}, [h('th', { text: 'MIDI Ports' }), h('th', { text: 'Track' })])]),
        h('tbody', {}, [
          h('tr', {}, [h('td', { className: 'sf-mono', text: 'In: ' + input }), h('td', {}, [toggle(true)])]),
          h('tr', {}, [h('td', { className: 'sf-mono', text: 'In: ' + output }), h('td', {}, [toggle(false)])])
        ])
      ]);
      var panel = h('div', { className: 'sf-panel' }, [h('p', { className: 'sf-panel-bar', text: 'Settings → Link, Tempo & MIDI' }), surfaces, ports]);
      return { node: h('figure', { className: 'sf sf-live' }, [panel,
        env.several ? caption(['For the ' + env.deviceName + '; the others are in the table.']) : null]) };
    } },

    // The controller: its screen while it waits (both routes), once connected, and About.
    check: { make: function (env) {
      if (env.drawingDevice !== 'mikro') return null;  // the setup pages are drawn for the MIKRO's screen
      var names = { in: env.value('in_port', env.device), out: env.value('out_port', env.device) };
      var layout = LAYOUTS[env.drawingDevice];
      var drawing = h('div', {}, [
        controller(env.drawingDevice, layout.screen, ['SHIFT', 'MASCHINE']),
        caption([keys(['SHIFT', 'MASCHINE']), ' leaves NI’s MIDI mode' + (env.several ? ' (MASCHINE MIKRO MK3 shown).' : '.')])
      ]);
      // under the step's text: the screen once connected, and the settings page's About row
      var connected = h('div', { className: 'sf-pair' }, [
        oled(layout.screen, 'Connected: Live’s screen'),
        oled(settingsScreen('About'), 'MASCHINE, turn to About: the version')
      ]);
      function group(title, screens) {
        return h('div', { className: 'sf-screens-group' }, [h('p', { className: 'sf-screens-title', text: title }), h('div', { className: 'sf-screens' }, screens)]);
      }
      var screens = h('figure', { className: 'sf sf-screens-all' }, [
        group('Without the loopMIDI ports, the screen’s pages take turns:', PAGES_NO_PORTS.map(function (p) { return page(p, names); })),
        group('With the ports, until Live connects:', PAGES_WAITING.map(function (p) { return page(p, names); }))
      ]);
      return { node: h('figure', { className: 'sf sf-check' }, [drawing]), lead: connected, below: screens, besideAll: true };
    } }
  };

  // The drawing for a step, or null. ctx: the choices still open ({choice: [options]}).
  function figure(step, env) {
    var def = FIGURES[step.id];
    if (!def || !MM.screen || !MM.manual) return null;
    var ok = Object.keys(def.when || {}).every(function (id) {
      return !env.ctx[id] || env.ctx[id].some(function (o) { return def.when[id].indexOf(o) >= 0; });
    });
    if (!ok) return null;
    var devices = env.ctx.device || ['mikro', 'mk3', 'plus'];
    env.device = devices.length === 1 ? (devices[0] === 'plus' ? 'plus' : devices[0]) : SHOWN;
    env.several = devices.length > 1;
    env.deviceName = env.label('device', env.device);
    var drawingDevice = env.device === 'plus' ? 'mk3' : env.device;  // MASCHINE+ looks like the MK3
    var made = def.make({
      ctx: env.ctx, value: env.value, text: env.text, several: env.several, device: env.device, deviceName: env.deviceName,
      drawingDevice: drawingDevice
    });
    return made;
  }

  return { figure: figure };
})();
