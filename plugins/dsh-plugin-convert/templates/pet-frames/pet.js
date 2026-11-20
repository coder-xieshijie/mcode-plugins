// MCode 桌宠页（由 dsh-plugin-convert 从 DSH Pet Pack 1.0 生成，MIT）。
// 只通过 window.mcodeAppearance 与 MCode 通信：读设置、读会话状态、开主窗口、开设置。
// 角色是图集里的矩形帧，按包内的动作表播放；会话状态决定放哪个动作。
(function () {
  'use strict';
  var host = window.mcodeAppearance || previewHost();
  var DATA = {{DATA}};
  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');
  var tip = document.getElementById('tip');
  var settings = { 'open-on-double-click': true, 'show-count': true, 'idle-animation': true };
  var sessions = [];
  var reducedMotion = false;
  var role = 'idle';
  var animation = null;
  var frameIndex = 0;
  var timer = 0;
  var tipTimer = 0;

  var images = {};
  var ready = Object.keys(DATA.assets).length === 0;

  function loadImages() {
    var pending = Object.keys(DATA.assets).length;
    if (!pending) return;
    Object.keys(DATA.assets).forEach(function (key) {
      var img = new Image();
      img.onload = function () {
        images[key] = img;
        if (--pending === 0) { ready = true; play(role); }
      };
      img.onerror = function () { if (--pending === 0) { ready = true; play(role); } };
      img.src = DATA.assets[key];
    });
  }

  function say(text) {
    if (!settings['show-count']) return;
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
    var err = count('error');
    if (wait) return wait + ' 个会话在等你';
    if (run) return run + ' 个会话在跑';
    if (err) return err + ' 个会话出错';
    return DATA.name;
  }

  function roleForSessions() {
    if (count('awaiting')) return 'attention';
    if (count('running')) return 'working';
    if (count('error')) return 'error';
    if (count('completed')) return 'success';
    return 'idle';
  }

  function draw() {
    if (!animation || !ready) return;
    var frame = animation.frames[frameIndex % animation.frames.length];
    var img = images[frame.asset];
    if (!img) return;
    var r = frame.rect;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, r[0], r[1], r[2], r[3], 0, 0, canvas.width, canvas.height);
  }

  function step() {
    if (!animation) return;
    var frame = animation.frames[frameIndex % animation.frames.length];
    frameIndex++;
    draw();
    // One-shot actions (a click's greeting) hand control back to the state role when they end.
    if (!animation.loop && frameIndex >= animation.frames.length) { play(role); return; }
    timer = setTimeout(step, reducedMotion ? 0 : frame.ms);
  }

  function play(nextRole) {
    clearTimeout(timer);
    var id = DATA.roles[nextRole] || DATA.roles.idle;
    var next = DATA.animations[id];
    if (!next) return;
    animation = next;
    frameIndex = 0;
    // Reduced motion: draw one frame and stop, as MCode asks of pages.
    if (reducedMotion) { draw(); return; }
    step();
  }

  function playOnce(nextRole) {
    var id = DATA.roles[nextRole];
    if (!id || !DATA.animations[id]) return false;
    clearTimeout(timer);
    animation = { frames: DATA.animations[id].frames, loop: false };
    frameIndex = 0;
    step();
    return true;
  }

  var clickThrough = null;
  function passThrough(on) {
    if (clickThrough === on) return;
    clickThrough = on;
    host.setClickThrough(on).catch(function () {});
  }
  passThrough(false);

  canvas.addEventListener('pointerenter', function () { passThrough(false); });
  canvas.addEventListener('pointerleave', function () { passThrough(true); });

  // Drag the window with the pointer; a click without movement counts as a click.
  var drag = null;
  canvas.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    drag = { x: event.screenX, y: event.screenY, moved: false };
    try { canvas.setPointerCapture(event.pointerId); } catch (_) { /* not capturable */ }
  });
  canvas.addEventListener('pointermove', function (event) {
    if (!drag) return;
    var dx = event.screenX - drag.x;
    var dy = event.screenY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    drag.moved = true;
    drag.x = event.screenX;
    drag.y = event.screenY;
    host.moveTo(event.screenX - dx, event.screenY - dy).catch(function () {});
  });
  canvas.addEventListener('pointerup', function (event) {
    if (!drag) return;
    var moved = drag.moved;
    drag = null;
    try { canvas.releasePointerCapture(event.pointerId); } catch (_) { /* already released */ }
    if (moved) return;
    playOnce('greeting');
    say(summary());
  });

  canvas.addEventListener('dblclick', function () {
    if (!settings['open-on-double-click']) return;
    host.openMainWindow().catch(function () {});
  });

  canvas.addEventListener('contextmenu', function (event) {
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

  function refresh() {
    var next = roleForSessions();
    if (next !== role) { role = next; playOnce(role); }
    say(summary());
  }

  host.getSettings().then(function (values) {
    settings = Object.assign(settings, values || {});
    refresh();
  }).catch(function () {});
  host.getAppearance().then(function (next) {
    reducedMotion = Boolean(next && next.reducedMotion);
    play(role);
  }).catch(function () {});
  if (host.onAppearanceChanged) {
    host.onAppearanceChanged(function (next) {
      reducedMotion = Boolean(next && next.reducedMotion);
      play(role);
    });
  }
  host.getSessions().then(function (list) {
    sessions = Array.isArray(list) ? list : [];
    refresh();
  }).catch(function () {});
  if (host.onSessionsChanged) {
    host.onSessionsChanged(function (list) {
      sessions = Array.isArray(list) ? list : [];
      refresh();
    });
  }

  loadImages();
  play(role);
  say(DATA.name);

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
