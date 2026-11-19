// MCode 桌宠页（由 dsh-plugin-convert 生成，MIT，与 mcode-octopus-boot 同一套写法）。
// 只通过 window.mcodeAppearance 与 MCode 通信：读设置、读会话状态、开主窗口、开设置。
// 这个页面看不到会话内容，也不发消息，不联网。
(function () {
  'use strict';
  var host = window.mcodeAppearance || previewHost();
  var stage = document.getElementById('stage');
  var media = document.getElementById('mascot');
  var tip = document.getElementById('tip');
  var label = '{{LABEL}}';
  var settings = { 'open-on-double-click': true, 'show-count': true, 'idle-animation': true };
  var sessions = [];
  var reducedMotion = false;
  var tipTimer = 0;
  var clickThrough = null;

  function say(text) {
    tip.textContent = text;
    tip.classList.add('show');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(function () { tip.classList.remove('show'); }, 1600);
  }

  function count(status) {
    return sessions.filter(function (s) { return s.status === status; }).length;
  }

  function summary() {
    var wait = count('awaiting');
    var run = count('running');
    if (wait) return wait + ' 个会话在等你';
    if (run) return run + ' 个会话在跑';
    return label;
  }

  function paint() {
    stage.classList.toggle('idle', !settings['idle-animation'] || reducedMotion);
    if (settings['show-count']) say(summary());
  }

  function wave() {
    if (reducedMotion) return;
    stage.classList.remove('wave');
    void stage.offsetWidth; // restart the animation
    stage.classList.add('wave');
  }

  // Transparent areas let the desktop through; only the character itself takes clicks.
  function passThrough(on) {
    if (clickThrough === on) return;
    clickThrough = on;
    host.setClickThrough(on).catch(function () {});
  }
  document.addEventListener('pointermove', function (event) {
    var top = document.elementFromPoint(event.clientX, event.clientY);
    passThrough(top !== media && top !== stage && top !== tip);
  });
  document.addEventListener('pointerleave', function () { passThrough(true); });
  passThrough(false);

  // Click shows the summary and opens the main window; dragging moves the pet window.
  var drag = null;
  stage.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    drag = { x: event.screenX, y: event.screenY, moved: false };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', function (event) {
    if (!drag) return;
    var dx = event.screenX - drag.x;
    var dy = event.screenY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    drag.moved = true;
    // Deltas keep the window under the pointer: it moves as the pointer moves.
    drag.x = event.screenX;
    drag.y = event.screenY;
    host.moveTo(event.screenX - dx, event.screenY - dy).catch(function () {});
  });
  stage.addEventListener('pointerup', function (event) {
    if (!drag) return;
    var moved = drag.moved;
    drag = null;
    try { stage.releasePointerCapture(event.pointerId); } catch (_) { /* already released */ }
    if (moved) return;
    wave();
    say(summary());
    host.openMainWindow().catch(function () {});
  });

  stage.addEventListener('dblclick', function () {
    if (!settings['open-on-double-click']) return;
    host.openMainWindow().catch(function () {});
  });

  stage.addEventListener('contextmenu', function (event) {
    event.preventDefault();
    var items = [{ id: 'open', label: '打开主窗口' }, { id: 'settings', label: '插件设置' }];
    var awaiting = sessions.filter(function (s) { return s.status === 'awaiting'; });
    if (awaiting.length) items.unshift({ id: 'next', label: '去处理：' + awaiting[0].title });
    host.showMenu(items).then(function (choice) {
      if (choice === 'open') return host.openMainWindow();
      if (choice === 'settings') return host.openSettings();
      if (choice === 'next' && awaiting[0]) return host.openSession(awaiting[0].sessionId);
      return null;
    }).catch(function () {});
  });

  host.getSettings().then(function (values) {
    settings = Object.assign(settings, values || {});
    paint();
  }).catch(function () {});
  host.getAppearance().then(function (next) {
    reducedMotion = Boolean(next && next.reducedMotion);
    paint();
  }).catch(function () {});
  if (host.onAppearanceChanged) {
    host.onAppearanceChanged(function (next) {
      reducedMotion = Boolean(next && next.reducedMotion);
      paint();
    });
  }
  host.getSessions().then(function (list) {
    sessions = Array.isArray(list) ? list : [];
    paint();
  }).catch(function () {});
  if (host.onSessionsChanged) {
    host.onSessionsChanged(function (list) {
      sessions = Array.isArray(list) ? list : [];
      paint();
    });
  }
  paint();

  // Offline preview in a normal browser: no host, so nothing is called.
  function previewHost() {
    var noop = function () { return Promise.resolve(null); };
    var subscribe = function () { return function () {}; };
    return {
      getSettings: noop, getAppearance: noop, getSessions: noop,
      onSessionsChanged: subscribe, onAppearanceChanged: subscribe,
      setClickThrough: noop, showMenu: noop, moveTo: noop,
      openMainWindow: noop, openSession: noop, openSettings: noop, fillDraft: noop,
    };
  }
})();
