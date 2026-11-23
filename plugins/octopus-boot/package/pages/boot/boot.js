// MCode 章鱼少女开机动画（MIT）。只通过 window.mcodeAppearance 与 MCode 通信。
// 开机画面层没有底色：页面把自己淡到透明再调用 dismiss()，就是溶解进已经渲染好的主界面。
(function () {
  'use strict';
  var host = window.mcodeAppearance || previewHost();
  var clip = document.getElementById('clip');
  var poster = document.getElementById('poster');
  var bar = document.getElementById('bar');
  var progress = document.getElementById('progress');
  var hint = document.getElementById('hint');

  var settings = { sound: true, ending: 'dissolve', 'fade-ms': 800, 'click-to-skip': true, 'show-progress': true };
  var ready = false;
  var finished = false; // 视频放完、出错，或因减少动态效果不播
  var leaving = false;
  var reducedMotion = false;
  var STALL_MS = 4000; // 这么久还没出画面就当视频不可用，停在封面上

  function fadeMs() {
    var value = Number(settings['fade-ms']);
    return Number.isFinite(value) ? Math.min(3000, Math.max(200, value)) : 800;
  }

  // 进度条取启动进度和视频播放进度中较慢的一个：视频没放到溶解点、MCode 没准备好，都不会走满；
  // 开始溶解时走满。只跟启动进度走的话，MCode 准备好时视频可能还没过半，进度条却已经满了。
  var startup = 0;

  function playback() {
    if (finished || leaving) return 1;
    if (!clip.duration) return 0;
    var end = settings.ending === 'after' ? clip.duration : clip.duration - fadeMs() / 1000;
    return end > 0 ? Math.min(1, clip.currentTime / end) : 1;
  }

  function renderProgress() {
    var value = leaving ? 1 : Math.min(startup, playback());
    bar.style.width = Math.round(value * 100) + '%';
  }

  function leave() {
    if (leaving) return;
    leaving = true;
    renderProgress();
    var ms = reducedMotion ? 0 : fadeMs();
    document.body.style.setProperty('--fade-ms', ms + 'ms');
    document.body.classList.add('leaving');
    // 画面淡到透明（透出主界面），声音一起淡出
    var start = clip.volume;
    var began = performance.now();
    function step(now) {
      var t = ms ? Math.min(1, (now - began) / ms) : 1;
      clip.volume = Math.max(0, start * (1 - t));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    setTimeout(function () {
      host.dismiss().catch(function () {});
    }, ms);
  }

  function maybeLeave() {
    if (ready && finished) leave();
  }

  function finishVideo() {
    if (finished) return;
    finished = true;
    renderProgress();
    maybeLeave();
  }

  function playClip() {
    clip.muted = !settings.sound;
    var started = false;
    var stall = setTimeout(function () {
      if (!started) finishVideo();
    }, STALL_MS);
    clip.addEventListener('playing', function () {
      started = true;
      clearTimeout(stall);
      clip.classList.add('playing');
    });
    clip.addEventListener('ended', function () {
      // 停在最后一帧（笑容）等 MCode 准备好
      if (clip.duration) clip.currentTime = clip.duration;
      finishVideo();
    });
    clip.addEventListener('error', function () {
      clearTimeout(stall);
      finishVideo();
    });
    clip.addEventListener('timeupdate', function () {
      renderProgress();
      // 'dissolve'（默认，旧值 'crossfade' 同义）：片尾最后一段边播边溶解；'after'：放完再溶解
      if (settings.ending === 'after' || !ready || leaving || !clip.duration) return;
      if (clip.duration - clip.currentTime <= fadeMs() / 1000) {
        finished = true;
        leave();
      }
    });
    var attempt = clip.play();
    if (attempt && attempt.catch) {
      attempt.catch(function () {
        // 不允许带声自动播放时退回静音
        clip.muted = true;
        clip.play().catch(function () {
          clearTimeout(stall);
          finishVideo();
        });
      });
    }
  }

  function applySettings(next) {
    if (next && typeof next === 'object') {
      for (var key in next) settings[key] = next[key];
    }
    progress.classList.toggle('hidden', settings['show-progress'] === false);
  }

  function applyLanguage(language) {
    var skip = settings['click-to-skip'] !== false;
    hint.textContent =
      language === 'en'
        ? (skip ? 'Click or press Esc to skip' : 'Press Esc to skip')
        : (skip ? '点击或按 Esc 跳过' : '按 Esc 跳过');
  }

  function start(appearance) {
    reducedMotion = Boolean(appearance && appearance.reducedMotion);
    applyLanguage(appearance && appearance.language);
    if (reducedMotion) {
      // 减少动态效果：只显示笑容那一帧，准备好就进入
      poster.src = 'media/end.jpg';
      clip.remove();
      finishVideo();
      return;
    }
    playClip();
  }

  host.onProgress(function (p) {
    if (p && typeof p.value === 'number') {
      startup = Math.max(0, Math.min(1, p.value));
      renderProgress();
    }
  });
  host.onReady(function () {
    ready = true;
    startup = 1;
    renderProgress();
    maybeLeave();
  });
  document.addEventListener('click', function () {
    if (settings['click-to-skip'] === false) return;
    // 跳过也走溶解：准备好了就立刻淡出；没准备好就等就绪后淡出（Esc 由 MCode 处理）
    finished = true;
    renderProgress();
    maybeLeave();
  });

  // 直接用浏览器打开本文件预览时没有 MCode 宿主：模拟 5 秒的启动进度，结束后重播。
  function previewHost() {
    var readyCallbacks = [];
    var progressCallbacks = [];
    var began = Date.now();
    var timer = setInterval(function () {
      var value = Math.min(1, (Date.now() - began) / 5000);
      progressCallbacks.forEach(function (cb) { cb({ stage: value < 1 ? 'starting' : 'ready', value: value }); });
      if (value >= 1) {
        clearInterval(timer);
        readyCallbacks.forEach(function (cb) { cb(); });
      }
    }, 200);
    var resolved = function (value) { return function () { return Promise.resolve(value); }; };
    return {
      getSettings: resolved({}),
      getAppearance: resolved({ mode: 'dark', themeId: null, reducedMotion: false, language: 'zh' }),
      onAppearanceChanged: function () { return function () {}; },
      onProgress: function (cb) { progressCallbacks.push(cb); return function () {}; },
      onReady: function (cb) { readyCallbacks.push(cb); return function () {}; },
      dismiss: function () {
        setTimeout(function () { location.reload(); }, 1500);
        return Promise.resolve();
      }
    };
  }

  Promise.all([
    host.getSettings().catch(function () { return null; }),
    host.getAppearance().catch(function () { return null; })
  ]).then(function (values) {
    applySettings(values[0]);
    start(values[1]);
  });
})();
