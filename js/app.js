// Boot and routing. Views: #setup... (the setup wizard), #highlights... (the self-playing
// highlights tour: #highlights, #highlights/3, #highlights/mk3/3) and everything else (the
// manual: #manual, #mikro, #mk3/PLUG-IN, #<section id>). A first visit without a hash opens the
// setup.
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

  function showView(name) {
    if (name !== 'highlights') MM.tour.stop();
    ['setup', 'manual', 'highlights'].forEach(function (view) {
      el('view-' + view).hidden = view !== name;
    });
    document.querySelectorAll('.nav-tab').forEach(function (tab) {
      if (tab.getAttribute('data-view') === name) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    if (current && current !== name) window.scrollTo(0, 0);
    current = name;
  }

  function route() {
    var hash = location.hash.replace(/^#/, '');
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
    if (ready.manual) MM.manual.show(parts);
  }

  function boot() {
    MM.initTheme();
    var bar = document.querySelector('.top-app-bar');
    window.addEventListener('scroll', function () { bar.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });

    Promise.all([
      fetchJSON('data/features.json').catch(function () { return null; }),
      fetchJSON('data/install.json').catch(function () { return null; })
    ]).then(function (results) {
      var features = results[0], install = results[1];
      if (features) {
        el('version').textContent = 'Manual · v' + features.version;
        MM.manual.init(features);
        MM.tour.init(features);
        ready.manual = true;
      } else {
        el('sections').innerHTML = '<p class="empty">Could not load the manual data (open the page through a web server).</p>';
      }
      if (install) {
        MM.setup.init(install);
        ready.setup = true;
      }
      route();
      window.addEventListener('hashchange', route);
    });
  }

  boot();
})();
