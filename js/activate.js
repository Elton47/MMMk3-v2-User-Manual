// The licence activation page. It talks only to MASCHINE for Ableton Live on this computer (the
// bridge at http://127.0.0.1, port 47923 unless the address says another), never to any other
// server. It keeps nothing in the browser: every load asks the bridge for the real licence state,
// and the page never says "activated" unless the bridge does.
//
// Changes (activate, check, deactivate) need the one-time token the bridge gives this page: the
// controller's encoder opens activate.html#t=<token>, and the Connect button goes to the bridge,
// which sends the browser back here with a new one. The token lives only in this page's memory.
(function () {
  'use strict';

  var DEFAULT_PORT = 47923;
  var TOKEN_HEADER = 'X-Activation-Token';

  // --- the address: #t=<token>&p=<port> ---------------------------------------------------------

  function readHash() {
    var params = {};
    location.hash.replace(/^#/, '').split('&').forEach(function (part) {
      var i = part.indexOf('=');
      if (i <= 0) return;
      try { params[decodeURIComponent(part.slice(0, i))] = decodeURIComponent(part.slice(i + 1)); } catch (e) { /* skip */ }
    });
    return params;
  }

  var params = readHash();
  var port = parseInt(params.p, 10);
  if (!(port >= 1024 && port <= 65535)) port = DEFAULT_PORT;
  var token = /^[A-Za-z0-9_-]{8,64}$/.test(params.t || '') ? params.t : '';
  var hadToken = !!params.t;
  var BRIDGE = 'http://127.0.0.1:' + port;
  if (params.t) {
    // out of the address bar, the history and bookmarks: a copied or old link can't change anything
    try {
      history.replaceState(null, '', location.pathname + location.search + (port !== DEFAULT_PORT ? '#p=' + port : ''));
    } catch (e) { /* the token still works for this visit */ }
  }

  // --- small helpers --------------------------------------------------------------------------------

  function el(id) { return document.getElementById(id); }

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

  function icon(name) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }

  function fill(node, children) {
    while (node.firstChild) node.removeChild(node.firstChild);
    children.forEach(function (child) { if (child) node.appendChild(child); });
  }

  function days(count) {
    if (count <= 0) return 'today';
    return count === 1 ? '1 day ago' : count + ' days ago';
  }

  function isWebAddress(text) { return /^https:\/\/[^\s"'<>]+$/.test(text || ''); }
  function isEmail(text) { return /^[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+$/.test(text || ''); }

  // --- talking to the bridge ---------------------------------------------------------------------

  // Resolves to {status, data}; rejects when the bridge can't be reached (not running, blocked).
  function ask(path, body, seconds) {
    var options = {
      method: body ? 'POST' : 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      headers: {}
    };
    if (token) options.headers[TOKEN_HEADER] = token;
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    var timer = null;
    if (window.AbortController) {
      var abort = new AbortController();
      options.signal = abort.signal;
      timer = setTimeout(function () { abort.abort(); }, (seconds || 8) * 1000);
    }
    return fetch(BRIDGE + path, options).then(function (response) {
      if (timer) clearTimeout(timer);
      return response.json().catch(function () { return {}; }).then(function (data) {
        return { status: response.status, data: data };
      });
    }, function (error) {
      if (timer) clearTimeout(timer);
      throw error;
    });
  }

  // --- what the page shows -------------------------------------------------------------------------

  var current = null;  // the bridge's last status answer (this visit only)
  var busy = false;

  function message(text, ok) {
    var box = el('act-message');
    if (!text) { fill(box, []); return; }
    fill(box, [h('p', { className: 'note ' + (ok ? 'ok' : 'bad') }, [icon(ok ? 'check' : 'alert'), h('span', { text: text })])]);
  }

  function helpLine(status) {
    var contact = status && status.support;
    var children = ['Questions? '];
    if (isEmail(contact)) children.push(h('a', { href: 'mailto:' + contact, text: contact }));
    else if (isWebAddress(contact)) children.push(h('a', { href: contact, rel: 'noreferrer', target: '_blank', text: 'Contact support' }));
    else children.push('Reply to your purchase email, and we will help.');
    fill(el('act-help'), [h('span', {}, children)]);
  }

  function storeLink(status, text) {
    return isWebAddress(status.store_page) ? h('a', { href: status.store_page, rel: 'noreferrer', target: '_blank', text: text }) : null;
  }

  function showUnreachable() {
    current = null;
    var state = el('act-state');
    state.setAttribute('aria-busy', 'false');
    var local = BRIDGE + '/';
    fill(state, [
      h('h2', { className: 'bad' }, [icon('computer'), h('span', { text: 'MASCHINE for Ableton Live is not answering' })]),
      h('p', { text: 'Open Live with your controller connected, then reload this page.' }),
      h('p', { text: 'If your browser asked whether this page may connect to apps or devices on this computer, choose Allow, then reload.' }),
      h('p', { text: 'Still nothing? Some browsers (Safari, for example) don\'t let a website talk to your computer. Use the page on this computer instead: it does the same.' }),
      h('div', { className: 'act-row' }, [
        h('button', { type: 'button', className: 'btn btn-filled', onclick: function () { location.reload(); } }, [h('span', { text: 'Reload' })]),
        h('a', { className: 'btn btn-outlined', href: local, rel: 'noreferrer' }, [h('span', { text: 'Open the page on this computer' })])
      ]),
      h('p', { className: 'act-small', text: 'That page is at 127.0.0.1:' + port + ' and works while Live is running.' })
    ]);
    el('act-actions').hidden = true;
    helpLine(null);
  }

  function facts(rows) {
    var list = h('dl', { className: 'act-facts' });
    rows.forEach(function (row) {
      if (!row[1]) return;
      list.appendChild(h('dt', { text: row[0] }));
      list.appendChild(h('dd', { text: row[1] }));
    });
    return list;
  }

  function showState(status) {
    var licence = status.licence || {};
    var state = el('act-state');
    state.setAttribute('aria-busy', 'false');
    var parts = [];
    if (licence.licensed) {
      var needsCheck = typeof licence.grace_left === 'number' && licence.grace_left <= 0;
      parts.push(h('h2', { className: needsCheck ? 'bad' : '' }, [icon(needsCheck ? 'alert' : 'check'),
        h('span', { text: needsCheck ? 'Activated, but needs an online check' : 'Activated on this computer' })]));
      parts.push(facts([
        ['Edition', licence.edition],
        ['Works with', licence.covers],
        ['Key', licence.key],
        ['Email', licence.email],
        ['Last online check', typeof licence.days_since_check === 'number' ? days(licence.days_since_check) : '']
      ]));
      if (needsCheck) {
        parts.push(h('p', { text: 'This computer has been offline too long. Connect it to the internet: the licence checks itself within a few minutes.' }));
      } else if (licence.warn) {
        var left = Math.max(1, Math.ceil(licence.grace_left || 1));
        parts.push(h('p', { className: 'note important' }, [icon('info'), h('span', {
          text: 'Please connect this computer to the internet once in the next ' + left + (left === 1 ? ' day' : ' days') + ', so the licence can check itself.'
        })]));
      }
      if (licence.edition_id === 'mikro') {
        var link = storeLink(status, 'store');
        parts.push(h('p', { className: 'act-small' }, [
          'Have a MASCHINE MK3 or MASCHINE+ too? The ' + (status.full_edition || 'MK3 & MASCHINE+') + ' edition covers all three controllers.',
          link ? ' Get it at the ' : null, link, link ? '.' : null
        ]));
      }
    } else if (licence.status === 'revoked') {
      parts.push(h('h2', { className: 'bad' }, [icon('alert'), h('span', { text: 'This key is not active any more' })]));
      parts.push(h('p', { text: 'The store says the key on this computer is disabled or refunded. If you think that is a mistake, please contact us and we will sort it out. You can also enter another key.' }));
    } else {
      parts.push(h('h2', {}, [icon('info'), h('span', { text: 'Not activated yet' })]));
      parts.push(h('p', { text: 'Enter the licence key from your purchase email and the email you bought with. You do this only once on each computer.' }));
      var buy = storeLink(status, 'store');
      if (buy) parts.push(h('p', { className: 'act-small' }, ['No key yet? Get one at the ', buy, '.']));
    }
    fill(state, parts);
    showActions(status);
    helpLine(status);
  }

  function showActions(status) {
    var licence = status.licence || {};
    var box = el('act-actions');
    box.hidden = false;
    if (!status.token_ok) {
      fill(box, [
        h('h2', {}, [icon('computer'), h('span', { text: licence.licensed ? 'Deactivate or check' : 'Activate' })]),
        h('p', { text: hadToken
          ? 'This page\'s link is from an earlier visit. Connect again to make changes.'
          : 'To make changes, first connect this page to MASCHINE for Ableton Live on this computer.' }),
        h('div', { className: 'act-row' }, [
          h('a', { className: 'btn btn-filled', href: BRIDGE + '/connect', rel: 'noreferrer' }, [h('span', { text: 'Connect' })])
        ]),
        h('p', { className: 'act-small', text: 'Pressing the encoder on the controller opens this page connected, too.' })
      ]);
      return;
    }
    if (!licence.licensed) {
      var key = h('input', { id: 'act-key', name: 'key', className: 'mono', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', required: true });
      var email = h('input', { id: 'act-email', name: 'email', type: 'email', autocomplete: 'email', required: true });
      var form = h('form', { className: 'act-form', novalidate: true, onsubmit: function (event) {
        event.preventDefault();
        if (!key.value.trim() || email.value.indexOf('@') < 0) {
          message('Please enter the licence key and the email you bought with.', false);
          return;
        }
        act('activate', { key: key.value, email: email.value }, 'Activating… this takes a few seconds.');
      } }, [
        h('label', { className: 'act-field', 'for': 'act-key' }, [h('span', { text: 'Licence key' }), key]),
        h('label', { className: 'act-field', 'for': 'act-email' }, [h('span', { text: 'Purchase email' }), email]),
        h('div', { className: 'act-row' }, [h('button', { type: 'submit', className: 'btn btn-filled' }, [h('span', { text: 'Activate' })])])
      ]);
      fill(box, [h('h2', {}, [icon('check'), h('span', { text: 'Activate' })]), form]);
      return;
    }
    fill(box, [
      h('h2', {}, [icon('computer'), h('span', { text: 'This computer' })]),
      h('div', { className: 'act-row' }, [
        h('button', { type: 'button', className: 'btn btn-tonal', onclick: function () {
          act('check', {}, 'Checking with the store…');
        } }, [h('span', { text: 'Check now' })])
      ]),
      h('p', { text: 'Moving to another computer? Deactivate here first. That frees this computer\'s place' +
        (status.cap ? ' (a key works on ' + status.cap + ' computers).' : '.') }),
      h('div', { className: 'act-row' }, [
        h('button', { type: 'button', className: 'btn btn-outlined', onclick: function () {
          if (window.confirm('Deactivate this computer? You can activate it again later.')) {
            act('deactivate', {}, 'Deactivating…');
          }
        } }, [h('span', { text: 'Deactivate this computer' })])
      ])
    ]);
  }

  function setBusy(on) {
    busy = on;
    el('act-actions').querySelectorAll('button, input').forEach(function (node) { node.disabled = on; });
  }

  function act(action, body, waiting) {
    if (busy) return;
    setBusy(true);
    message('');
    fill(el('act-message'), [h('p', { className: 'note' }, [icon('info'), h('span', { text: waiting })])]);
    ask('/api/' + action, body, 60).then(function (answer) {
      setBusy(false);
      if (answer.status === 401) {
        token = '';
        hadToken = true;
        message('This page\'s link is from an earlier visit. Press Connect, then try again.', false);
        return refresh();
      }
      if (answer.status !== 200 || !answer.data || !answer.data.licence) {
        message('Something went wrong. Please reload the page and try again.', false);
        return refresh();
      }
      message(answer.data.message, answer.data.ok === true);
      current = answer.data;
      showState(answer.data);
    }, function () {
      setBusy(false);
      showUnreachable();
    });
  }

  // On every load: the real state, straight from the bridge.
  function refresh() {
    return ask('/api/status', null, 6).then(function (answer) {
      if (answer.status !== 200 || !answer.data || !answer.data.licence) throw new Error('no status');
      current = answer.data;
      showState(answer.data);
    }).catch(function () { showUnreachable(); });
  }

  refresh();
})();
