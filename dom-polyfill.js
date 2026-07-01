// Comprehensive Web API polyfills for Hermes/React Native
// Loaded as Metro polyfill — runs before ALL modules
(function () {
  'use strict';
  var g = typeof globalThis !== 'undefined' ? globalThis : global;

  // ── DOMException ──
  if (typeof g.DOMException === 'undefined') {
    var DE = function (msg, name) { this.message = msg || ''; this.name = name || 'Error'; this.code = DE[name] || 0; };
    DE.prototype = Object.create(Error.prototype);
    DE.prototype.constructor = DE;
    g.DOMException = DE;
  }
  var domCodes = {INDEX_SIZE_ERR:1,DOMSTRING_SIZE_ERR:2,HIERARCHY_REQUEST_ERR:3,WRONG_DOCUMENT_ERR:4,
    INVALID_CHARACTER_ERR:5,NO_DATA_ALLOWED_ERR:6,NO_MODIFICATION_ALLOWED_ERR:7,NOT_FOUND_ERR:8,
    NOT_SUPPORTED_ERR:9,INUSE_ATTRIBUTE_ERR:10,INVALID_STATE_ERR:11,SYNTAX_ERR:12,
    INVALID_MODIFICATION_ERR:13,NAMESPACE_ERR:14,INVALID_ACCESS_ERR:15,VALIDATION_ERR:16,
    TYPE_MISMATCH_ERR:17,SECURITY_ERR:18,NETWORK_ERR:19,ABORT_ERR:20,URL_MISMATCH_ERR:21,
    QUOTA_EXCEEDED_ERR:22,TIMEOUT_ERR:23,INVALID_NODE_TYPE_ERR:24,DATA_CLONE_ERR:25};
  for (var c in domCodes) { if (!(c in g.DOMException)) g.DOMException[c] = domCodes[c]; }

  // ── EventTarget ──
  if (typeof g.EventTarget === 'undefined') {
    var ET = function () { this._listeners = {}; };
    ET.prototype = {
      addEventListener: function (t, cb) { (this._listeners[t] = this._listeners[t] || []).push(cb); },
      removeEventListener: function (t, cb) { var l = this._listeners[t]; if (l) this._listeners[t] = l.filter(function (f) { return f !== cb; }); },
      dispatchEvent: function (e) { var l = this._listeners[e.type]; if (l) l.forEach(function (cb) { cb(e); }); return true; },
    };
    g.EventTarget = ET;
  }

  // ── CustomEvent ──
  if (typeof g.CustomEvent === 'undefined') {
    g.CustomEvent = function (type, p) { p = p || {}; this.type = type; this.bubbles = !!p.bubbles; this.cancelable = !!p.cancelable; this.detail = p.detail || null; };
  }

  // ── CloseEvent ──
  if (typeof g.CloseEvent === 'undefined') {
    g.CloseEvent = function (type, i) { i = i || {}; this.type = type; this.code = i.code || 0; this.reason = i.reason || ''; this.wasClean = !!i.wasClean; };
  }

  // ── MessageChannel / MessagePort ──
  if (typeof g.MessageChannel === 'undefined') {
    var MP = function () { this.onmessage = null; this._other = null; };
    MP.prototype = {
      postMessage: function (d) { var o = this._other; if (o && typeof o.onmessage === 'function') { var oo = o; setTimeout(function () { oo.onmessage({data: d}); }, 0); } },
      start: function () {}, close: function () {}, addEventListener: function () {}, removeEventListener: function () {},
    };
    g.MessagePort = MP;
    g.MessageChannel = function () { this.port1 = new MP(); this.port2 = new MP(); this.port1._other = this.port2; this.port2._other = this.port1; };
  }
  if (typeof g.MessageQueue === 'undefined') { g.MessageQueue = g.MessageChannel; }

  // ── BroadcastChannel ──
  if (typeof g.BroadcastChannel === 'undefined') {
    g.BroadcastChannel = function () {};
    g.BroadcastChannel.prototype = { postMessage: function () {}, close: function () {}, addEventListener: function () {}, removeEventListener: function () {}, onmessage: null };
  }

  // ── Performance APIs ──
  if (typeof g.PerformanceEntry === 'undefined') {
    g.PerformanceEntry = function () {}; g.PerformanceEntry.prototype = { get name() { return ''; }, get entryType() { return ''; }, get startTime() { return 0; }, get duration() { return 0; }, toJSON: function () { return {}; } };
  }
  if (typeof g.PerformanceMark === 'undefined') { g.PerformanceMark = function () {}; g.PerformanceMark.prototype = Object.create(g.PerformanceEntry.prototype); }
  if (typeof g.PerformanceMeasure === 'undefined') { g.PerformanceMeasure = function () {}; g.PerformanceMeasure.prototype = Object.create(g.PerformanceEntry.prototype); }
  if (typeof g.PerformanceObserver === 'undefined') {
    g.PerformanceObserver = function () {}; g.PerformanceObserver.prototype = { observe: function () {}, disconnect: function () {}, takeRecords: function () { return []; } };
    g.PerformanceObserver.supportedEntryTypes = [];
  }

  // ── structuredClone ──
  if (typeof g.structuredClone === 'undefined') { g.structuredClone = function (o) { return JSON.parse(JSON.stringify(o)); }; }

  // ── TextEncoder / TextDecoder ──
  if (typeof g.TextEncoder === 'undefined') {
    g.TextEncoder = function () {};
    g.TextEncoder.prototype.encode = function (s) { var a = []; for (var i = 0; i < s.length; i++) { var code = s.charCodeAt(i); if (code < 128) a.push(code); else if (code < 2048) { a.push(192 | (code >> 6)); a.push(128 | (code & 63)); } else { a.push(224 | (code >> 12)); a.push(128 | ((code >> 6) & 63)); a.push(128 | (code & 63)); } } return new Uint8Array(a); };
  }
  if (typeof g.TextDecoder === 'undefined') {
    g.TextDecoder = function () {};
    g.TextDecoder.prototype.decode = function (buf) { var a = new Uint8Array(buf); var s = ''; for (var i = 0; i < a.length;) { var b = a[i]; if (b < 128) { s += String.fromCharCode(b); i++; } else if (b < 224) { s += String.fromCharCode(((b & 31) << 6) | (a[i+1] & 63)); i += 2; } else { s += String.fromCharCode(((b & 15) << 12) | ((a[i+1] & 63) << 6) | (a[i+2] & 63)); i += 3; } } return s; };
  }

  // ── Streams ──
  if (typeof g.ReadableStream === 'undefined') { g.ReadableStream = function () {}; g.ReadableStream.prototype = { getReader: function () { return { read: function () { return Promise.resolve({done:true}); }, releaseLock: function () {} }; }, cancel: function () { return Promise.resolve(); } }; }
  if (typeof g.WritableStream === 'undefined') { g.WritableStream = function () {}; g.WritableStream.prototype = { getWriter: function () { return { write: function () { return Promise.resolve(); }, close: function () { return Promise.resolve(); }, releaseLock: function () {} }; } }; }
  if (typeof g.TransformStream === 'undefined') { g.TransformStream = function () { this.readable = new g.ReadableStream(); this.writable = new g.WritableStream(); }; }

  // ── requestIdleCallback ──
  if (typeof g.requestIdleCallback === 'undefined') { g.requestIdleCallback = function (cb) { return setTimeout(function () { cb({ didTimeout: false, timeRemaining: function () { return 50; } }); }, 1); }; g.cancelIdleCallback = function (id) { clearTimeout(id); }; }

  // ── matchMedia ──
  if (typeof g.matchMedia === 'undefined') { g.matchMedia = function () { return { matches: false, addListener: function () {}, removeListener: function () {}, addEventListener: function () {}, removeEventListener: function () {} }; }; }

  // ── navigator.locks ──
  if (typeof g.navigator !== 'undefined' && !g.navigator.locks) { g.navigator.locks = { request: function (n, cb) { return Promise.resolve(cb({name:n})); }, query: function () { return Promise.resolve({held:[],pending:[]}); } }; }

  // ── performance.memory ──
  if (typeof g.performance !== 'undefined' && !g.performance.memory) {
    g.performance.memory = { jsHeapSizeLimit: 0, totalJSHeapSize: 0, usedJSHeapSize: 0 };
  }

  // ── navigator.deviceMemory ──
  if (typeof g.navigator !== 'undefined' && typeof g.navigator.deviceMemory === 'undefined') {
    g.navigator.deviceMemory = 4;
  }

  // ── Worker ──
  if (typeof g.Worker === 'undefined') { g.Worker = function () {}; g.Worker.prototype = { postMessage: function () {}, terminate: function () {}, addEventListener: function () {}, removeEventListener: function () {} }; }
})();
