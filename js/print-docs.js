// Printable documents, on a paper-like sheet like the cheat sheet, printed by @media print (A4 or
// Letter, black text on white, the site's colours kept for the notes and step numbers):
// - #setup/print[/<choices>...]: the installation guide, every step on one page, from
//   data/install.json (the content comes from MM.setup.guide(): #setup/print/windows is the
//   Windows guide plus the Live 11 page, #setup/print/win11/mikro/live12 one route);
// - #whatsnew: what changed since v1 (the "changes" of data/features.json, the manual's table).
// On paper every link shows its address (setup.js), and each document ends with the manual's.
MM.printDocs = (function () {
  'use strict';

  var el = MM.el, h = MM.h;
  var state = { features: null, site: '', back: '#setup' };

  function host(href) { return href.replace(/^https?:\/\//, '').replace(/\/$/, ''); }

  function header(title, subtitle) {
    var version = state.features ? 'v' + state.features.version : '';
    return h('header', { className: 'pd-head' }, [
      MM.logo('pd-logo'),
      h('div', { className: 'pd-head-text' }, [
        h('p', { className: 'pd-brand', text: (state.features && state.features.product) || 'MASCHINE for Ableton Live' }),
        h('h1', { className: 'pd-title', id: 'pd-title', text: title }),
        subtitle ? h('p', { className: 'pd-sub', text: subtitle }) : null
      ]),
      version ? h('span', { className: 'pd-version', text: version }) : null
    ]);
  }

  // Where everything else is: the online manual, its address printed in full (on paper too).
  // first: the box under the title, which also points to the same steps online.
  function manualLink(site, first) {
    site = (site || state.site || location.href.replace(/#.*$/, '')).replace(/\/?$/, '/');
    return h('aside', { className: 'pd-manual' + (first ? ' first' : '') }, [
      MM.icon('book'),
      h('div', {}, [
        h('p', { className: 'pd-manual-line' }, [
          h('strong', { text: 'Full manual, cheat sheets and what’s new: ' }),
          h('a', { href: site, text: site })
        ]),
        first ? h('p', { className: 'pd-manual-sub' }, ['These steps online, with copy buttons: ',
          h('a', { href: site + '#setup', text: site + '#setup' })]) : null
      ])
    ]);
  }

  function footer() {
    return h('footer', { className: 'pd-foot' }, [h('p', { text: 'Not affiliated with Native Instruments or Ableton.' })]);
  }

  function mount(back, nodes) {
    state.back = back;
    el('pd-back').setAttribute('href', back);
    el('pd-back-label').textContent = back.indexOf('#setup') === 0 ? 'Set up' : 'Manual';
    var root = el('print-doc');
    root.innerHTML = '';
    nodes.forEach(function (n) { if (n) root.appendChild(n); });
  }

  // parts: the hash after "setup/print/"
  function guide(parts) {
    var g = MM.setup.guide(parts);
    if (!g) {
      mount('#setup', [h('p', { className: 'load-error', text: 'No setup steps for this choice.' })]);
      return;
    }
    mount('#setup', [header(g.title, g.subtitle), manualLink(g.site, true), g.node, manualLink(g.site, false), footer()]);
    document.title = g.title + (g.subtitle ? ': ' + g.subtitle : '') + ' · MASCHINE for Ableton Live';
  }

  function changes() {
    var data = state.features;
    var rows = h('tbody', {}, data.changes.map(function (change) {
      return h('tr', {}, [h('th', { scope: 'row', text: change.what }), h('td', { text: change.v1 || '–' }), h('td', { text: change.v2 })]);
    }));
    var table = h('table', { className: 'pd-changes' }, [
      h('thead', {}, [h('tr', {}, [
        h('th', { scope: 'col' }, [h('span', { className: 'visually-hidden', text: 'What' })]),
        h('th', { scope: 'col', text: 'v1.6' }),
        h('th', { scope: 'col', text: 'v' + data.version })
      ])]),
      rows
    ]);
    mount('#manual', [
      header("What's new in v2", 'What changed since v1.6'),
      table,
      manualLink(null, false),
      footer()
    ]);
    document.title = "What's new in v2 · MASCHINE for Ableton Live";
  }

  function print() {
    function go() { window.print(); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(go, 60); });
    else setTimeout(go, 60);
  }

  function init(features, install) {
    state.features = features;
    state.site = install && install.site ? install.site.replace(/\/?$/, '/') : '';
    el('pd-print').addEventListener('click', print);
  }

  return { init: init, guide: guide, changes: changes };
})();
