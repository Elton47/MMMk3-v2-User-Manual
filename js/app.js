// Boot and routing. Views: #setup... (the setup wizard), #highlights... (the self-playing
// highlights tour: #highlights, #highlights/3, #highlights/mk3/3), #cheatsheet... (the printable
// cheat sheet: #cheatsheet, #cheatsheet/mk3), the printable documents (js/print-docs.js: the
// installation guide #setup/print, #setup/print/windows; what's new #whatsnew) and everything else (the manual: #manual, #mikro,
// #mk3/PLUG-IN, #<section id>, a search: #manual?q=arp, #mk3?q=note%20repeat). A first visit
// without a hash opens the setup.
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

  // tab: the nav tab to mark when it isn't the view's own (the cheat sheet belongs to the manual)
  function showView(name, tab) {
    if (name !== 'highlights') MM.tour.stop();
    ['setup', 'manual', 'highlights', 'cheatsheet', 'print'].forEach(function (view) {
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
    if (parts[0] === 'highlights') {
      showView('highlights');
      document.title = 'Highlights · MASCHINE for Ableton Live';
      if (ready.manual) MM.tour.show(parts.slice(1));
      else el('tour-stage').innerHTML = '<p class="load-error">Could not load the highlights. Reload the page to try again.</p>';
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
    showView('manual');
    document.title = 'Manual · MASCHINE for Ableton Live';
    MM.store('manualSeen', '1');
    if (ready.manual) MM.manual.show(parts, hashParam(query, 'q'));
  }

  function boot() {
    MM.initTheme();
    var bar = document.querySelector('.top-app-bar');
    window.addEventListener('scroll', function () { bar.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });

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
