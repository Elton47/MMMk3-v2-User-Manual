// The MK3's colour screens change pictures without a blank frame: a still picture that has not
// loaded yet (its first view, before the browser has it) is laid over the old one, which stays
// until the new one has loaded (or failed to). Before, the screen went black for the download.
// Run: node --test tests
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const h = require('./harness.js');

// a small DOM: enough for the drawing's nodes, their children and load events
function el(name) {
  const node = {
    tagName: name, childNodes: [], attrs: {}, listeners: {}, style: { setProperty() {}, removeProperty() {} }, dataset: {}, parentNode: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute(k, v) { this.attrs[k] = String(v); }, setAttributeNS(ns, k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, removeAttribute(k) { delete this.attrs[k]; },
    appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.childNodes.push(c); return c; },
    removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); c.parentNode = null; return c; },
    insertBefore(c) { return this.appendChild(c); },
    addEventListener(type, f) { (this.listeners[type] = this.listeners[type] || []).push(f); }, removeEventListener() {},
    fire(type) { (this.listeners[type] || []).forEach((f) => f({ type })); },
    querySelector() { return null; }, querySelectorAll() { return []; }, getContext() { return null; },
    getBBox() { return { x: 0, y: 0, width: 0, height: 0 }; }, getScreenCTM() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0 }; },
    textContent: ''
  };
  Object.defineProperty(node, 'innerHTML', { get() { return ''; }, set() { node.childNodes.slice().forEach((c) => node.removeChild(c)); } });
  Object.defineProperty(node, 'firstChild', { get() { return node.childNodes[0] || null; } });
  return node;
}

function hrefs(g) {
  return g.childNodes.filter((c) => c.tagName === 'image').map((c) => c.getAttribute('href'));
}
function newest(g) {
  const list = g.childNodes.filter((c) => c.tagName === 'image');
  return list[list.length - 1];
}

test('a new still picture keeps the old one on screen until it has loaded', () => {
  const ctx = h.load();
  ctx.document.createElementNS = (ns, name) => el(name);
  ctx.document.createElement = (name) => el(name);
  const drawing = ctx.MM.manual.createDrawing(el('svg'));
  drawing.draw('mk3');
  assert.ok(drawing.lcd, 'the MK3 drawing has its colour screens');
  const left = drawing.lcd.sides.left;
  drawing.showScreen({ left: { img: 'first-left' }, right: { img: 'first-right' } });
  newest(left).fire('load');
  assert.deepStrictEqual(hrefs(left), ['img/screens/mk3/first-left.png']);

  drawing.showScreen({ left: { img: 'second-left' }, right: { img: 'second-right' } });
  assert.deepStrictEqual(hrefs(left), ['img/screens/mk3/first-left.png', 'img/screens/mk3/second-left.png'],
    'the old picture stays under the new one while it loads');
  newest(left).fire('load');
  assert.deepStrictEqual(hrefs(left), ['img/screens/mk3/second-left.png'], 'loaded: the old one goes');

  // a picture that fails to load does not keep the old one for ever
  drawing.showScreen({ left: { img: 'third-left' }, right: { img: 'third-right' } });
  newest(left).fire('error');
  assert.deepStrictEqual(hrefs(left), ['img/screens/mk3/third-left.png']);
});
