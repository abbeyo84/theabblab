(function () {
  var HOME_ZONE = 'America/Toronto';
  var CITIES = [
    { name: 'Los Angeles', timeZone: 'America/Los_Angeles' },
    { name: 'New York', timeZone: 'America/New_York' },
    { name: 'London', timeZone: 'Europe/London' },
    { name: 'Paris', timeZone: 'Europe/Paris' },
    { name: 'Dubai', timeZone: 'Asia/Dubai' },
    { name: 'Mumbai', timeZone: 'Asia/Kolkata' },
    { name: 'Singapore', timeZone: 'Asia/Singapore' },
    { name: 'Hong Kong', timeZone: 'Asia/Hong_Kong' },
    { name: 'Tokyo', timeZone: 'Asia/Tokyo' },
    { name: 'Sydney', timeZone: 'Australia/Sydney' }
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

  var state = { hours: '12', theme: 'lcd' };
  var cityNodes = [];
  var wakeLock = null;
  var idleTimer = 0;

  function init() {
    var clockEl = document.getElementById('clock');
    var dateEl = document.getElementById('date');
    var citiesEl = document.getElementById('cities');
    var settingsEl = document.getElementById('settings');
    var settingsBtn = document.getElementById('settingsBtn');
    var launchBtn = document.getElementById('launchBtn');
    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!clockEl || !dateEl || !citiesEl || !settingsEl || !settingsBtn || !launchBtn) return;

    state.hours = readStore(STORE_HOURS, '12', ['12', '24']);
    state.theme = readStore(STORE_THEME, 'lcd', THEMES);
    applyTheme(state.theme, themeMeta);
    markHours(state.hours);
    cityNodes = buildCities(citiesEl);

    settingsBtn.addEventListener('click', function () {
      var open = settingsEl.hasAttribute('hidden');
      if (open) {
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
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && document.body.classList.contains('is-fs')) holdWake();
    });

    render(clockEl, dateEl);
    schedule(clockEl, dateEl);
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

  function buildCities(list) {
    return CITIES.map(function (city) {
      var item = document.createElement('li');
      item.className = 'clock-city';
      var name = document.createElement('span');
      name.className = 'clock-city__name';
      name.textContent = city.name;
      var time = document.createElement('span');
      time.className = 'clock-city__time';
      item.appendChild(name);
      item.appendChild(time);
      list.appendChild(item);
      return { timeZone: city.timeZone, el: time };
    });
  }

  function render(clockEl, dateEl) {
    var now = new Date();
    clockEl.textContent = formatClock(now, HOME_ZONE, state.hours);
    dateEl.textContent = formatDate(now, HOME_ZONE);
    cityNodes.forEach(function (city) {
      city.el.textContent = formatClock(now, city.timeZone, state.hours);
    });
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
