// Boot and routing. Views: #setup... (the setup wizard), the manual in two views: the Tour
// (js/tour.js: #tour, #tour/<section>[/<step>], #tour/mk3/<section>/<step>; the old #highlights,
// #highlights/3, #highlights/mk3/3 open its Highlights card) and the Full manual (js/manual.js:
// #full, #full/<section>, #mikro, #mk3/PLUG-IN, a search: #manual?q=arp, #mk3?q=note%20repeat),
// #cheatsheet... (the printable cheat sheet: #cheatsheet, #cheatsheet/mk3) and the printable
// documents (js/print-docs.js: the installation guide #setup/print, #setup/print/windows; what's
// new #whatsnew). #manual and #<section id> open the view the visitor chose last in the header
// (Tour | Full manual, remembered as `manualView`; the Tour to start with), at that section. A
// first visit without a hash opens the setup.
(function () {
  'use strict';

  var el = MM.el;
  var current = null;
  var ready = { manual: false, setup: false };

  function fetchJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ': ' + r.status);
      return r.json();
    });
  }

  // The manual view the visitor chose last in the header: 'tour' (the default) or 'full'.
  function manualView() { return MM.store('manualView') === 'full' ? 'full' : 'tour'; }

  // tab: the nav tab to mark when it isn't the view's own (the cheat sheet belongs to the manual)
  function showView(name, tab) {
    if (name !== 'tour') MM.tour.stop();
    ['setup', 'manual', 'tour', 'cheatsheet', 'print'].forEach(function (view) {
      el('view-' + view).hidden = view !== name;
    });
    var tabName = tab || (name === 'cheatsheet' ? 'manual' : name);
    document.querySelectorAll('.nav-tab').forEach(function (tab) {
      if (tab.getAttribute('data-view') === tabName) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    if (current && current !== name) window.scrollTo(0, 0);
    current = name;
  }

  // The value of `name` in the hash's query (#manual?q=arp), or null.
  function hashParam(query, name) {
    var found = null;
    query.split('&').some(function (pair) {
      var eq = pair.indexOf('=');
      if ((eq < 0 ? pair : pair.slice(0, eq)) !== name) return false;
      try { found = decodeURIComponent((eq < 0 ? '' : pair.slice(eq + 1)).replace(/\+/g, ' ')); } catch (e) { found = ''; }
      return true;
    });
    return found;
  }

  function showTour(target) {
    showView('tour');
    document.title = 'Tour · MASCHINE for Ableton Live';
    MM.store('manualSeen', '1');
    if (ready.manual) MM.tour.show(target);
    else el('tour-cards').innerHTML = '<p class="load-error">Could not load the manual data. Reload the page to try again.</p>';
  }

  // #tour/<device>/<section>/<step>, each part optional (step 1-based).
  function tourTarget(parts) {
    var target = {};
    if (LAYOUTS[parts[0]]) target.device = parts.shift();
    if (parts[0]) target.section = decodeURIComponent(parts.shift());
    var step = parseInt(parts[0], 10);
    if (!isNaN(step)) target.step = step - 1;
    return target;
  }

  function showFull(parts, query) {
    showView('manual');
    document.title = 'Manual · MASCHINE for Ableton Live';
    MM.store('manualSeen', '1');
    if (ready.manual) MM.manual.show(parts, query);
  }

  function route() {
    var hash = location.hash.replace(/^#/, '');
    var queryAt = hash.indexOf('?');
    var query = queryAt >= 0 ? hash.slice(queryAt + 1) : '';
    if (queryAt >= 0) hash = hash.slice(0, queryAt);
    var parts = hash.split('/');
    if (parts[0] === 'help') {
      // The header's help button: the troubleshooting step for this visitor's setup.
      showView('setup');
      if (ready.setup) MM.setup.help();
      return;
    }
    if (parts[0] === 'tour') {
      showTour(tourTarget(parts.slice(1)));
      return;
    }
    if (parts[0] === 'highlights') {
      // the highlights tour of before: the Tour's Highlights card (#highlights/mk3/3: step 3)
      var target = tourTarget(parts.slice(1));
      target.step = target.section ? parseInt(target.section, 10) - 1 : target.step;
      target.section = 'highlights';
      showTour(target);
      return;
    }
    if (parts[0] === 'setup' && parts[1] === 'print') {
      showView('print', 'setup');
      if (ready.setup) MM.printDocs.guide(parts.slice(2));
      else el('print-doc').innerHTML = '<p class="load-error">Could not load the setup steps. Reload the page to try again.</p>';
      return;
    }
    if (parts[0] === 'whatsnew') {
      showView('print', 'manual');
      if (ready.manual) MM.printDocs.changes();
      else el('print-doc').innerHTML = '<p class="load-error">Could not load the manual data. Reload the page to try again.</p>';
      return;
    }
    if (parts[0] === 'cheatsheet') {
      showView('cheatsheet');
      document.title = 'Cheat sheet · MASCHINE for Ableton Live';
      if (ready.manual) MM.cheatsheet.show(parts.slice(1));
      else el('cheatsheet').innerHTML = '<p class="load-error">Could not load the manual data. Reload the page to try again.</p>';
      return;
    }
    var setup = parts[0] === 'setup' ||
      (!hash && !MM.store('setupDone') && !MM.store('manualSeen'));
    if (setup) {
      showView('setup');
      if (ready.setup) MM.setup.show(parts[0] === 'setup' ? parts.slice(1) : []);
      else el('setup-root').innerHTML = '<p class="load-error">Could not load the setup steps. Reload the page to try again.</p>';
      return;
    }
    if (parts[0] === 'full') {
      showFull(parts[1] ? [decodeURIComponent(parts[1])] : ['manual'], hashParam(query, 'q'));
      return;
    }
    // A controller (#mikro, #mk3/PLUG-IN) or a search belongs to the Full manual; the rest
    // (#manual, #<section id>, no hash) opens the view chosen last, at that section.
    var q = hashParam(query, 'q');
    if (LAYOUTS[parts[0]] || q || manualView() === 'full') {
      showFull(parts, q);
      return;
    }
    var section = parts[0] && parts[0] !== 'manual' ? decodeURIComponent(parts[0]) : null;
    showTour({ section: section });
  }

  function boot() {
    MM.initTheme();
    var bar = document.querySelector('.top-app-bar');
    window.addEventListener('scroll', function () { bar.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });
    // the header's Tour | Full manual: the visitor's choice, remembered for #manual and sections
    document.querySelectorAll('[data-manual-view]').forEach(function (tab) {
      tab.addEventListener('click', function () { MM.store('manualView', tab.getAttribute('data-manual-view')); });
    });

    Promise.all([
      fetchJSON('data/features.json').catch(function () { return null; }),
      fetchJSON('data/install.json').catch(function () { return null; }),
      fetchJSON('data/screens.json').catch(function () { return null; })
    ]).then(function (results) {
      var features = results[0], install = results[1];
      MM.screen.init(results[2]);  // the MIKRO screen's fonts (a blank screen without them)
      if (features) {
        el('version').textContent = 'Manual · v' + features.version;
        MM.manual.init(features);
        MM.cheatsheet.init(features);
        MM.tour.init(features);
        ready.manual = true;
      } else {
        el('sections').innerHTML = '<p class="empty">Could not load the manual data (open the page through a web server).</p>';
      }
      if (install) {
        MM.setup.init(install);
        ready.setup = true;
      }
      MM.printDocs.init(features, install);
      route();
      window.addEventListener('hashchange', route);
    });
  }

  boot();
})();
