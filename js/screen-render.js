// The MIKRO MK3's 128 x 32 screen, drawn the way the controller draws it: the same layouts and
// the same two pixel fonts, pixel for pixel. The fonts come from data/screens.json, which is
// exported from the controller's own renderer together with reference screens;
// check-screens.html renders every reference and compares (rerun it after a screen change).
//
// A screen is a state with the fields the script sends (names as in data/screens.json):
//   TITLE, SUBTITLE            line 1 (bold) and line 2
//   MIKRO_LINE3, MIKRO_LINE3_VALUE   line 3, its value on the right
//   MIKRO_TRACK_FLAGS          SHOWN (4): line 1 is the track's numbered box; MUTE (1): hollow box;
//                              SOLO (2): a small S box after it
//   MIKRO_TRACK_LABEL          the number in the box (A, B for returns, M the Master)
//   MIKRO_LINES                3 or 2 (the settings page's Screen choice; default MM.screenLines)
//   LIST_ITEM                  up to 3 rows ('name\tvalue' puts the value on the right)
//   LIST_SELECTED              the highlighted row (0-2)
//   MIKRO_SCROLL               a list's position 0-126 for its scrollbar (null: none)
//   MIKRO_CORNER               two lines: a value at the right of line 1, when the title leaves room
// { popup: 'Title\nValue' } is a popup (a changed value), drawn in the two-line layout.
// Long text is shortened with an ellipsis (the controller scrolls it instead).
//
// MM.screen.render(state, lines) -> { width, height, bits: Uint8Array (1 = lit) }
// MM.screen.path(bitmap, x, y, px, dot) -> SVG path data: a square per lit pixel
var MM = window.MM || (window.MM = {});

// The layout the manual shows on the MIKRO's screen everywhere (the manual, the highlights tour,
// the cheat sheet): 2 (the larger font) or 3 lines.
MM.screenLines = 2;

MM.screen = (function () {
  'use strict';

  var W = 128, H = 32;
  var NO_VALUE = 127;
  var SHOWN = 4, MUTE = 1, SOLO = 2;
  var small = null, large = null;

  function init(data) {
    if (!data || !data.fonts) return;
    var s = data.fonts.small, l = data.fonts.large;
    small = { width: s.width, boldWidth: s.bold_width, glyphs: s.glyphs };
    large = { gap: l.gap, glyphs: l.glyphs };
  }

  function ready() { return !!(small && large); }

  // --- a 1-bit image ---------------------------------------------------------------------

  function Bitmap(w, h) {
    this.width = w;
    this.height = h;
    this.bits = new Uint8Array(w * h);
  }
  Bitmap.prototype.point = function (x, y, fill) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.bits[y * this.width + x] = fill ? 1 : 0;
  };
  // corners inclusive; filled, or only its 1-pixel outline
  Bitmap.prototype.rect = function (x0, y0, x1, y1, filled) {
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        if (filled || y === y0 || y === y1 || x === x0 || x === x1) this.point(x, y, 1);
      }
    }
  };
  // light this image's pixels where the mask is lit, the mask's top left at (ox, oy)
  Bitmap.prototype.stamp = function (mask, ox, oy) {
    for (var y = 0; y < mask.height; y++) {
      for (var x = 0; x < mask.width; x++) {
        if (mask.bits[y * mask.width + x]) this.point(ox + x, oy + y, 1);
      }
    }
  };

  function chars(text) { return Array.from(String(text || '')); }

  // A character the font lacks: its plain letter (é -> e), else '?'.
  function plain(ch) { return ch.normalize('NFKD').replace(/[^\x00-\x7f]/g, '').charAt(0); }

  // --- the small font: 5 x 7, rows of 5 bits, lowercase with descenders --------------------

  function smallGlyph(ch) {
    var g = small.glyphs;
    if (g[ch]) return g[ch];
    var p = plain(ch);
    if (!p) return g['?'];
    if (/[a-z]/.test(p) && g[p]) return g[p];
    return g[p.toUpperCase()] || g['?'];
  }

  function smallAdvance(bold) { return bold ? small.boldWidth : small.width; }

  function smallWidth(text, bold) { return Math.max(0, chars(text).length * smallAdvance(bold) - 1); }

  function smallFit(text, width, bold) {
    text = text || '';
    if (smallWidth(text, bold) <= width) return text;
    var count = Math.max(0, Math.floor((width + 1) / smallAdvance(bold)) - 1);
    return chars(text).slice(0, count).join('') + '…';
  }

  // Bold strokes are a pixel wider; medium only the vertical ones (as wide as bold).
  function smallText(img, x, y, text, fill, bold, medium) {
    var advance = smallAdvance(bold || medium);
    chars(text).forEach(function (ch, i) {
      var glyph = smallGlyph(ch);
      function lit(b) { return b >= 0 && b < glyph.length && glyph.charAt(b) === '1'; }
      for (var bit = 0; bit < glyph.length; bit++) {
        if (glyph.charAt(bit) !== '1') continue;
        var px = x + i * advance + bit % 5, py = y + Math.floor(bit / 5);
        img.point(px, py, fill);
        var vertical = (bit % 5 === 4 || !lit(bit + 1)) && (lit(bit - 5) || lit(bit + 5));
        if (bold || (medium && vertical)) img.point(px + 1, py, fill);
      }
    });
  }

  // --- the large font: proportional, capitals 9 pixels tall --------------------------------

  function largeGlyph(ch) {
    var g = large.glyphs;
    if (g[ch]) return g[ch];
    var p = plain(ch);
    return (p && g[p]) || g['?'];
  }

  function largeAdvance(ch, bold) { return largeGlyph(ch).width + (bold ? 1 : 0) + large.gap; }

  function largeWidth(text, bold) {
    var sum = 0;
    chars(text).forEach(function (ch) { sum += largeAdvance(ch, bold); });
    return Math.max(0, sum - large.gap);
  }

  function largeFit(text, width, bold) {
    text = text || '';
    if (largeWidth(text, bold) <= width) return text;
    var list = chars(text);
    while (list.length && largeWidth(list.join('') + '…', bold) > width) list.pop();
    return list.join('') + '…';
  }

  function largeText(img, x, y, text, fill, bold, medium) {
    chars(text).forEach(function (ch) {
      var rows = largeGlyph(ch).rows;
      function lit(r, c) { return r >= 0 && r < rows.length && c >= 0 && c < rows[r].length && rows[r].charAt(c) === '1'; }
      for (var row = 0; row < rows.length; row++) {
        for (var col = 0; col < rows[row].length; col++) {
          if (rows[row].charAt(col) !== '1') continue;
          img.point(x + col, y + row, fill);
          var vertical = !lit(row, col + 1) && (lit(row - 1, col) || lit(row + 1, col));
          if (bold || (medium && vertical)) img.point(x + col + 1, y + row, fill);
        }
      }
      x += largeAdvance(ch, bold || medium);
    });
  }

  // --- the layouts -------------------------------------------------------------------------

  function get(state, name, fallback) {
    var v = state[name];
    return v === undefined || v === null ? fallback : v;
  }

  function listItem(state, i) {
    var items = state.LIST_ITEM;
    if (Array.isArray(items)) return items[i] || '';
    return state['LIST_ITEM_' + i] || '';
  }

  function trackFlags(state) {
    var flags = get(state, 'MIKRO_TRACK_FLAGS', 0);
    return flags === NO_VALUE ? 0 : flags;
  }

  // Python's round(): halves to the even neighbour.
  function pyRound(v) {
    var r = Math.round(v);
    if (Math.abs(v - Math.trunc(v)) === 0.5 && r % 2 !== 0) r -= 1;
    return r;
  }

  function partition(text) {
    var at = text.indexOf('\t');
    return at < 0 ? [text, ''] : [text.slice(0, at), text.slice(at + 1)];
  }

  // A name's own "2-" prefix isn't repeated after its box.
  function withoutLabel(title, label) {
    var seps = ['-', ' '];
    for (var i = 0; i < seps.length; i++) {
      if (label && title.indexOf(label + seps[i]) === 0 && chars(title).length > chars(label).length + 1) {
        return chars(title).slice(chars(label).length + 1).join('').replace(/^\s+/, '');
      }
    }
    return title;
  }

  // Three lines: the browser / settings list, the selected row inverted.
  function list(img, state, width) {
    var selected = get(state, 'LIST_SELECTED', NO_VALUE);
    for (var i = 0; i < 3; i++) {
      var parts = partition(listItem(state, i)), text = parts[0], value = parts[1];
      var top = i * 11, fill = i === selected ? 0 : 1;
      if (i === selected) img.rect(0, top, W - 1, top + 9, true);
      var valueWidth = value ? smallWidth(value) : 0;
      if (value) smallText(img, W - 2 - valueWidth, top + 1, value, fill);
      var nameWidth = width - 3 - (value ? valueWidth + 6 : 0);
      smallText(img, 2, top + 1, smallFit(text, nameWidth), fill);
    }
  }

  function trackBox(img, x, label, heard, bold, top, medium) {
    var text = smallWidth(label, bold || medium);
    var inner = text + (chars(label).length <= 1 ? 2 : 0);
    var width = inner + 4;
    img.rect(x, top, x + width - 1, top + 8, heard);
    smallText(img, x + 2 + Math.floor((inner - text + 1) / 2), top + 1, label, heard ? 0 : 1, bold, medium);
    return x + width;
  }

  function header(img, state, width, top) {
    var flags = trackFlags(state);
    if (flags & SHOWN) {
      var label = get(state, 'MIKRO_TRACK_LABEL', '');
      var x = trackBox(img, 0, label, !(flags & MUTE), true, top, false);
      if (flags & SOLO) x = trackBox(img, x + 2, 'S', true, false, top, true);
      var title = withoutLabel(get(state, 'TITLE', ''), label);
      var line = new Bitmap(W - x - 3, 10);
      smallText(line, 0, 1, smallFit(title, line.width - 1, true), 1, true);
      img.stamp(line, x + 3, top);
    } else {
      smallText(img, 1, top + 1, smallFit(get(state, 'TITLE', ''), width, true), 1, true);
    }
  }

  function valueLine(img, y, text, value, width) {
    var valueWidth = smallWidth(value);
    if (value) smallText(img, W - 1 - valueWidth, y, value, 1);
    var nameWidth = Math.max(0, width - valueWidth - (value ? 6 : 0));
    smallText(img, 1, y, smallFit(text, nameWidth), 1);
  }

  function threeLines(img, state, width) {
    header(img, state, width, 0);
    smallText(img, 1, 12, smallFit(get(state, 'SUBTITLE', ''), width), 1);
    valueLine(img, 23, get(state, 'MIKRO_LINE3', ''), get(state, 'MIKRO_LINE3_VALUE', ''), width);
  }

  function largeBox(img, x, label, heard, bold, medium) {
    var text = largeWidth(label, bold || medium);
    var n = Math.max(1, chars(label).length), zeros = '';
    for (var i = 0; i < n; i++) zeros += '0';
    var widest = largeWidth(zeros, bold || medium);
    var inner = Math.max(text, chars(label).length <= 1 ? widest + 2 : widest - 3);
    var width = inner + 4;
    img.rect(x, 1, x + width - 1, 13, heard);
    largeText(img, x + 2 + Math.floor((inner - text + 1) / 2), 3, label, heard ? 0 : 1, bold, medium);
    return x + width;
  }

  // Two lines: the corner value at the right of line 1, only when it fits beside the whole
  // title (otherwise the title has the line). Returns the width left for the title.
  function corner(img, state, x, title) {
    var available = W - 1 - x;
    var text = get(state, 'MIKRO_CORNER', ''), cornerWidth = largeWidth(text);
    if (text && largeWidth(title, true) + 7 + cornerWidth <= available) {
      largeText(img, W - 1 - cornerWidth, 3, text, 1);
      return available - cornerWidth - 7;
    }
    return available;
  }

  function headerLarge(img, state) {
    var flags = trackFlags(state), title;
    if (!(flags & SHOWN)) {
      title = get(state, 'TITLE', '');
      largeText(img, 1, 3, largeFit(title, corner(img, state, 1, title), true), 1, true);
      return;
    }
    var label = get(state, 'MIKRO_TRACK_LABEL', '');
    var x = largeBox(img, 0, label, !(flags & MUTE), true, false);
    if (flags & SOLO) x = largeBox(img, x + 2, 'S', true, false, true);
    title = withoutLabel(get(state, 'TITLE', ''), label);
    var line = new Bitmap(Math.max(1, corner(img, state, x + 3, title)), 14);
    largeText(line, 0, 3, largeFit(title, line.width - 1, true), 1, true);
    img.stamp(line, x + 3, 0);
  }

  function valueLineLarge(img, y, text, value, width) {
    var valueWidth = largeWidth(value);
    if (value) largeText(img, 1 + width - valueWidth, y, value, 1);
    var nameWidth = Math.max(0, width - valueWidth - (value ? 7 : 0));
    largeText(img, 1, y, largeFit(text, nameWidth), 1);
  }

  function twoLines(img, state, width) {
    headerLarge(img, state);
    var text = get(state, 'MIKRO_LINE3', '') || get(state, 'SUBTITLE', '');
    valueLineLarge(img, 18, text, get(state, 'MIKRO_LINE3_VALUE', ''), width);
  }

  // Two lines of a list: the folder (or Settings) in bold, the selected row below it.
  function listTwoLines(img, state, width) {
    var title = get(state, 'TITLE', '').replace(/\s+\d+\/\d+$/, '');
    largeText(img, 1, 3, largeFit(title, width - 5, true), 1, true);
    var selected = get(state, 'LIST_SELECTED', NO_VALUE);
    var row = selected >= 0 && selected <= 2 ? listItem(state, selected) : '';
    var parts = partition(row);
    valueLineLarge(img, 18, parts[0], parts[1], width - 5);
  }

  // A short bar at the right edge: where the list is.
  function scrollbar(img, state) {
    var position = get(state, 'MIKRO_SCROLL', NO_VALUE);
    if (position === NO_VALUE) return;
    var height = 7, top = 1 + pyRound((H - 2 - height) * position / 126.0);
    img.rect(W - 3, top, W - 2, top + height - 1, true);
  }

  // A popup (a value changed: 'Title\nValue'): the two-line layout on a dark screen, the
  // title bold on line 1, the value on line 2.
  function popup(text) {
    var img = new Bitmap(W, H);
    if (!ready()) return img;
    text = String(text || '');
    var at = text.indexOf('\n'), title = at < 0 ? text : text.slice(0, at), value = at < 0 ? '' : text.slice(at + 1);
    largeText(img, 1, 3, largeFit(title, W - 2, true), 1, true);
    if (value) largeText(img, 1, 18, largeFit(value, W - 2), 1);
    return img;
  }

  // The screen for state; lines: 3 or 2 (default: the state's MIKRO_LINES, else MM.screenLines).
  // A state { popup: 'Title\nValue' } is a popup.
  function render(state, lines) {
    state = state || {};
    if (state.popup !== undefined) return popup(state.popup);
    lines = lines || get(state, 'MIKRO_LINES', MM.screenLines);
    var img = new Bitmap(W, H), width = W - 2;
    if (!ready()) return img;
    if (listItem(state, 0) || listItem(state, 1) || listItem(state, 2)) {
      if (lines === 2) listTwoLines(img, state, width);
      else list(img, state, width - 4);
      scrollbar(img, state);
      return img;
    }
    // A screen without line 3 (a mode with nothing more to say) is drawn in the same
    // layout with line 3 empty.
    if (lines === 2) twoLines(img, state, width);
    else threeLines(img, state, width);
    return img;
  }

  // SVG path data: a square for each lit pixel, the screen's top left at (x, y), one pixel = px
  // units; dot: the share of a pixel its square fills (the glass shows a hairline between).
  // Without a gap, each row's runs of lit pixels are one rectangle (the same pixels, fewer edges).
  function path(img, x, y, px, dot) {
    var s = px * (dot === undefined ? 1 : dot), off = (px - s) / 2, out = [];
    var side = s.toFixed(3), merge = s >= px;
    for (var row = 0; row < img.height; row++) {
      for (var col = 0; col < img.width; col++) {
        if (!img.bits[row * img.width + col]) continue;
        var end = col + 1;
        if (merge) while (end < img.width && img.bits[row * img.width + end]) end++;
        var wide = (s + (end - col - 1) * px).toFixed(3);
        out.push('M' + (x + col * px + off).toFixed(3) + ' ' + (y + row * px + off).toFixed(3) +
          'h' + wide + 'v' + side + 'h-' + wide + 'z');
        col = end - 1;
      }
    }
    return out.join('');
  }

  // The bitmap as 32 strings of 128 '0' / '1' (the form of data/screens.json's references).
  function rows(img) {
    var out = [];
    for (var row = 0; row < img.height; row++) {
      out.push(Array.prototype.join.call(img.bits.subarray(row * img.width, (row + 1) * img.width), ''));
    }
    return out;
  }

  return { init: init, ready: ready, render: render, path: path, rows: rows, SHOWN: SHOWN, MUTE: MUTE, SOLO: SOLO };
})();
