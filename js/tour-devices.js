// The Tour's last card, "Devices on the screens": a Live device of each kind (a Drum Synth, an
// instrument, an audio effect, a MIDI effect) as the selected controller's screens show it with
// PLUG-IN. Stills only (no animation). The data is the script's own (js/device-stills.js, made by
// the script repository's tools/manual_device_stills.py): the MIKRO's screen is drawn from its
// fields with the controller's fonts (MM.screen), the MK3's two screens are the bridge's pictures
// (img/screens/mk3/devices/). MM.tourDevices.show(device) draws it for 'mikro' or 'mk3'.
MM.tourDevices = (function () {
  'use strict';

  var h = MM.h, SVG = 'http://www.w3.org/2000/svg';

  function svgNode(name, attrs, parent) {
    var n = document.createElementNS(SVG, name);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  // the MIKRO's screen: its pixels in the OLED's black glass, as the manual draws it elsewhere
  function oled(state, label) {
    var img = MM.screen.render(state, MM.screenLines);
    var svg = svgNode('svg', { viewBox: '0 0 132 36', 'class': 'td-oled', role: 'img', 'aria-label': label });
    svgNode('rect', { x: 0, y: 0, width: 132, height: 36, 'class': 'td-oled-glass' }, svg);
    svgNode('path', { d: MM.screen.path(img, 2, 2, 1), 'class': 'td-oled-pixels' }, svg);
    return h('div', { className: 'td-screens td-mikro' }, [svg]);
  }

  function lcd(slug, label) {
    return h('div', { className: 'td-screens td-mk3' }, ['left', 'right'].map(function (side) {
      return h('img', { src: 'img/screens/mk3/devices/' + slug + '-' + side + '.png', width: 480, height: 272,
        loading: 'lazy', alt: label + ' (' + side + ' screen)' });
    }));
  }

  function show(device) {
    var grid = document.getElementById('tour-devices-grid');
    if (!grid || typeof DEVICE_STILLS === 'undefined') return;
    grid.innerHTML = '';
    DEVICE_STILLS.forEach(function (entry) {
      var label = (device === 'mk3' ? 'MK3' : 'MIKRO') + ' screen' + (device === 'mk3' ? 's' : '') + ': ' + entry.name;
      grid.appendChild(h('figure', { className: 'td-tile' }, [
        device === 'mk3' ? lcd(entry.slug, label) : oled(entry.mikro, label),
        h('figcaption', {}, [h('span', { className: 'td-group', text: entry.group }), h('span', { className: 'td-name', text: entry.name })])
      ]));
    });
    grid.classList.toggle('td-grid-mk3', device === 'mk3');
  }

  return { show: show };
})();
