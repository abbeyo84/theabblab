(function () {
  var DEFAULT_ZONE = 'America/Toronto';
  var ZONES = [
    'America/Toronto',
    'America/Los_Angeles',
    'America/New_York',
    'Europe/London',
    'Europe/Paris',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Hong_Kong',
    'Asia/Tokyo',
    'Australia/Sydney'
  ];
  var THEMES = ['lcd', 'amber', 'ice', 'lab', 'white', 'crimson'];
  var THEME_COLOR = {
    lcd: '#0d0d0d',
    amber: '#100c06',
    ice: '#070b14',
    lab: '#0a0b0f',
    white: '#000000',
    crimson: '#140608'
  };
  var STORE_HOURS = 'abbeyo-time-hours';
  var STORE_THEME = 'abbeyo-time-theme';
  var STORE_ZONE = 'abbeyo-time-zone';
  var STORE_LEVEL = 'abbeyo-time-level';

  var state = { hours: '12', theme: 'lcd', zone: DEFAULT_ZONE, level: 100 };
  var wakeLock = null;
  var idleTimer = 0;

  function init() {
    var clockEl = document.getElementById('clock');
    var dateEl = document.getElementById('date');
    var settingsEl = document.getElementById('settings');
    var settingsBtn = document.getElementById('settingsBtn');
    var launchBtn = document.getElementById('launchBtn');
    var zoneEl = document.getElementById('zone');
    var levelEl = document.getElementById('level');
    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!clockEl || !dateEl || !settingsEl || !settingsBtn || !launchBtn || !zoneEl || !levelEl) return;

    state.hours = readStore(STORE_HOURS, '12', ['12', '24']);
    state.theme = readStore(STORE_THEME, 'lcd', THEMES);
    state.zone = readStore(STORE_ZONE, DEFAULT_ZONE, ZONES);
    state.level = readLevel();
    applyTheme(state.theme, themeMeta);
    markHours(state.hours);
    zoneEl.value = state.zone;
    applyLevel(state.level, levelEl);

    settingsBtn.addEventListener('click', function () {
      if (settingsEl.hasAttribute('hidden')) {
        settingsEl.removeAttribute('hidden');
        settingsBtn.setAttribute('aria-expanded', 'true');
        pokeChrome();
      } else {
        closeSettings(settingsEl, settingsBtn);
      }
    });

    document.querySelectorAll('[data-hours]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.hours = btn.getAttribute('data-hours') === '24' ? '24' : '12';
        writeStore(STORE_HOURS, state.hours);
        markHours(state.hours);
        render(clockEl, dateEl);
      });
    });

    document.querySelectorAll('[data-choice]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyTheme(btn.getAttribute('data-choice'), themeMeta);
      });
    });

    zoneEl.addEventListener('change', function () {
      state.zone = ZONES.indexOf(zoneEl.value) === -1 ? DEFAULT_ZONE : zoneEl.value;
      zoneEl.value = state.zone;
      writeStore(STORE_ZONE, state.zone);
      render(clockEl, dateEl);
    });

    levelEl.addEventListener('input', function () {
      applyLevel(levelEl.value, levelEl);
    });

    launchBtn.addEventListener('click', function () {
      toggleLaunch(settingsEl, settingsBtn, launchBtn);
    });

    document.addEventListener('fullscreenchange', function () {
      syncFullscreen(launchBtn);
    });
    document.addEventListener('webkitfullscreenchange', function () {
      syncFullscreen(launchBtn);
    });
    document.addEventListener('mousemove', pokeChrome);
    document.addEventListener('touchstart', pokeChrome);
    document.addEventListener('focusin', pokeChrome);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && document.body.classList.contains('is-fs')) holdWake();
    });

    render(clockEl, dateEl);
    schedule(clockEl, dateEl);
    pokeChrome();
  }

  function readStore(key, fallback, allowed) {
    try {
      var value = localStorage.getItem(key);
      if (allowed.indexOf(value) !== -1) return value;
    } catch (err) {}
    return fallback;
  }

  function writeStore(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {}
  }

  function readLevel() {
    try {
      var n = Number(localStorage.getItem(STORE_LEVEL));
      if (n >= 10 && n <= 100) return Math.round(n);
    } catch (err) {}
    return 100;
  }

  function parts(date, options) {
    var map = {};
    new Intl.DateTimeFormat('en-US', options).formatToParts(date).forEach(function (part) {
      if (part.type !== 'literal') map[part.type] = part.value;
    });
    return map;
  }

  function ordinal(day) {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  function formatClock(date, timeZone, hours) {
    var hour12 = hours !== '24';
    var options = hour12
      ? { timeZone: timeZone, hour: 'numeric', minute: '2-digit', hourCycle: 'h12' }
      : { timeZone: timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
    var piece = parts(date, options);
    if (!hour12) return piece.hour + ':' + piece.minute;
    return (piece.hour + ':' + piece.minute + ' ' + (piece.dayPeriod || '')).replace(/\s+/g, ' ').trim();
  }

  function formatDate(date, timeZone) {
    var piece = parts(date, {
      timeZone: timeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    var day = Number(piece.day);
    return piece.weekday + ' The ' + day + ordinal(day) + ' of ' + piece.month + ' ' + piece.year;
  }

  function render(clockEl, dateEl) {
    var now = new Date();
    clockEl.textContent = formatClock(now, state.zone, state.hours);
    dateEl.textContent = formatDate(now, state.zone);
  }

  function schedule(clockEl, dateEl) {
    window.setTimeout(function () {
      render(clockEl, dateEl);
      schedule(clockEl, dateEl);
    }, 1000 - (Date.now() % 1000));
  }

  function markHours(hours) {
    document.querySelectorAll('[data-hours]').forEach(function (btn) {
      var on = btn.getAttribute('data-hours') === hours;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function applyTheme(id, themeMeta) {
    if (THEMES.indexOf(id) === -1) id = 'lcd';
    state.theme = id;
    document.body.setAttribute('data-theme', id);
    writeStore(STORE_THEME, id);
    if (themeMeta) themeMeta.setAttribute('content', THEME_COLOR[id]);
    document.querySelectorAll('[data-choice]').forEach(function (btn) {
      var on = btn.getAttribute('data-choice') === id;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function applyLevel(value, levelEl) {
    var n = Math.round(Number(value));
    if (n < 10 || n > 100) n = 100;
    state.level = n;
    levelEl.value = String(n);
    document.body.style.setProperty('--clock-level', String(n));
    writeStore(STORE_LEVEL, String(n));
  }

  function closeSettings(settingsEl, settingsBtn) {
    settingsEl.setAttribute('hidden', '');
    settingsBtn.setAttribute('aria-expanded', 'false');
  }

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement;
  }

  function enterFullscreen() {
    var root = document.documentElement;
    var request = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!request) return Promise.reject(new Error('unsupported'));
    return Promise.resolve(request.call(root));
  }

  function exitFullscreen() {
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (!exit) return Promise.resolve();
    return Promise.resolve(exit.call(document));
  }

  function toggleLaunch(settingsEl, settingsBtn, launchBtn) {
    if (fullscreenElement() || document.body.classList.contains('is-fs')) {
      document.body.classList.remove('is-fs');
      document.body.classList.remove('is-awake');
      launchBtn.textContent = 'Full screen';
      releaseWake();
      if (fullscreenElement()) exitFullscreen();
      return;
    }
    closeSettings(settingsEl, settingsBtn);
    document.body.classList.add('is-fs');
    pokeChrome();
    launchBtn.textContent = 'Exit';
    enterFullscreen().catch(function () {});
    holdWake();
  }

  function syncFullscreen(launchBtn) {
    if (fullscreenElement()) {
      document.body.classList.add('is-fs');
      launchBtn.textContent = 'Exit';
      return;
    }
    document.body.classList.remove('is-fs');
    launchBtn.textContent = 'Full screen';
    releaseWake();
  }

  function pokeChrome() {
    document.body.classList.add('is-awake');
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(function () {
      if (document.getElementById('settings').hasAttribute('hidden')) {
        document.body.classList.remove('is-awake');
      }
    }, 2500);
  }

  function holdWake() {
    if (!('wakeLock' in navigator)) return;
    navigator.wakeLock.request('screen').then(function (lock) {
      wakeLock = lock;
    }).catch(function () {});
  }

  function releaseWake() {
    if (!wakeLock) return;
    wakeLock.release().catch(function () {});
    wakeLock = null;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
