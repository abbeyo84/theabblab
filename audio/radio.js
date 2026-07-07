/**
 * ABBEYO RADIO — Web Player
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'abbeyo_radio_web_v6';

  var STATIONS = {
    ckue: {
      id: 'ckue',
      name: 'CKUE Cool FM',
      url: 'https://blackburn-ais.leanstream.co/CKUEF2-MP3?args=web_02',
      freq: '95.1 / 100.7',
      desc: 'Classic Hits • 80s 90s Today',
      somaChannel: null,
    },
    u80s: {
      id: 'u80s',
      name: 'SomaFM u80s',
      url: 'https://ice1.somafm.com/u80s-128-mp3',
      freq: 'SOMA',
      desc: 'Underground 80s',
      somaChannel: 'u80s',
    },
    space: {
      id: 'space',
      name: 'SomaFM Space Station',
      url: 'https://ice1.somafm.com/spacestation-128-mp3',
      freq: 'SOMA',
      desc: 'Spaced-out ambient & electronica',
      somaChannel: 'spacestation',
    },
  };

  var els = {};
  var activeStation = null;
  var isPlaying = false;
  var isAmber = false;
  var isSwitching = false;
  var metaInterval = null;
  var vuInterval = null;
  var lastMetaKey = '';
  var playGeneration = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function stationFromButton(btn) {
    if (!btn) return null;

    var id = btn.getAttribute('data-station-id');
    if (id && STATIONS[id]) return STATIONS[id];

    var url = btn.getAttribute('data-url');
    if (!url) return null;

    return {
      id: id || url,
      name: btn.getAttribute('data-name') || 'Station',
      url: url,
      freq: btn.getAttribute('data-freq') || '',
      desc: btn.getAttribute('data-desc') || '',
      somaChannel: btn.getAttribute('data-soma') || null,
    };
  }

  function findPresetButton(stationId) {
    var buttons = document.querySelectorAll('.radio-preset');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute('data-station-id') === stationId) {
        return buttons[i];
      }
    }
    return null;
  }

  function setStatus(msg, isError) {
    if (!els.status) return;
    els.status.textContent = msg;
    els.status.classList.toggle('is-error', !!isError);
  }

  function updatePlayButton() {
    if (!els.playBtn) return;
    els.playBtn.classList.toggle('is-playing', isPlaying);
    els.playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    els.playBtn.innerHTML = isPlaying
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

    if (els.led) els.led.classList.toggle('is-live', isPlaying);
    if (els.ledLabel) els.ledLabel.textContent = isPlaying ? 'Live' : 'Standby';

    var vu = document.querySelector('.radio-vu');
    if (vu) vu.classList.toggle('is-active', isPlaying);
  }

  function updatePresetButtons() {
    if (!activeStation) return;
    var buttons = document.querySelectorAll('.radio-preset');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var active = btn.getAttribute('data-station-id') === activeStation.id;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  function updateStationUI(station) {
    if (!station) return;
    if (els.stationName) els.stationName.textContent = station.name;
    if (els.freq) els.freq.textContent = station.freq;
    if (els.track) els.track.textContent = 'Ready to stream';
    if (els.artist) els.artist.textContent = station.desc;
    clearArt();
    lastMetaKey = '';
    updatePresetButtons();
  }

  function safePlay() {
    var result = els.audio.play();
    if (result && typeof result.then === 'function') {
      return result;
    }
    return Promise.resolve();
  }

  function playStream(station) {
    if (!els.audio || !station || !station.url) return;

    var gen = ++playGeneration;
    isSwitching = true;
    setStatus('Connecting…');

    els.audio.pause();
    els.audio.src = station.url;
    els.audio.load();

    safePlay().then(function () {
      if (gen !== playGeneration) return;
      isSwitching = false;
      isPlaying = true;
      updatePlayButton();
      startVuAnimation();
      startMetaPolling();
      setStatus('Streaming ' + station.name);
      fetchMetadata();
    }).catch(function (err) {
      if (gen !== playGeneration) return;
      isSwitching = false;
      isPlaying = false;
      updatePlayButton();
      stopVuAnimation();
      stopMetaPolling();
      setStatus('Stream error on ' + station.name + ' — try another preset.', true);
      console.error('[ABBEYO RADIO]', station.url, err);
    });
  }

  function selectStation(station, autoPlay) {
    if (!station || !station.url) {
      setStatus('Station unavailable.', true);
      return;
    }

    activeStation = station;
    updateStationUI(station);
    savePrefs();

    if (autoPlay) {
      playStream(station);
    } else {
      playGeneration++;
      isSwitching = false;
      if (els.audio) els.audio.pause();
      isPlaying = false;
      updatePlayButton();
      stopVuAnimation();
      stopMetaPolling();
      setStatus(station.name + ' selected — press play');
    }
  }

  function onPresetClick(e) {
    var btn = e.target.closest('.radio-preset');
    if (!btn) return;
    e.preventDefault();
    selectStation(stationFromButton(btn), isPlaying);
  }

  function clearArt() {
    if (!els.art) return;
    els.art.style.display = 'none';
    els.art.removeAttribute('src');
    if (els.artPlaceholder) els.artPlaceholder.style.display = 'block';
  }

  function showArt(url) {
    if (!url || !els.art) { clearArt(); return; }
    els.art.onload = function () {
      els.art.style.display = 'block';
      if (els.artPlaceholder) els.artPlaceholder.style.display = 'none';
    };
    els.art.onerror = clearArt;
    els.art.src = url;
  }

  function fetchMetadata() {
    if (!activeStation) return;

    if (!activeStation.somaChannel) {
      if (els.track) els.track.textContent = 'Live Broadcast';
      if (els.artist) els.artist.textContent = activeStation.desc;
      return;
    }

    fetch('https://somafm.com/songs/' + activeStation.somaChannel + '.json')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.songs || !data.songs[0] || !activeStation) return;
        var song = data.songs[0];
        var key = song.artist + '|' + song.title;
        if (key === lastMetaKey) return;
        lastMetaKey = key;
        if (els.track) els.track.textContent = song.title || 'Unknown Track';
        if (els.artist) els.artist.textContent = song.artist || 'Unknown Artist';
        if (song.albumArt) {
          showArt(song.albumArt);
        }
      })
      .catch(function () { /* ignore */ });
  }

  function startMetaPolling() {
    stopMetaPolling();
    fetchMetadata();
    metaInterval = setInterval(fetchMetadata, 15000);
  }

  function stopMetaPolling() {
    if (metaInterval) {
      clearInterval(metaInterval);
      metaInterval = null;
    }
  }

  function startVuAnimation() {
    stopVuAnimation();
    if (!els.vuBars || !els.vuBars.length) return;
    vuInterval = setInterval(function () {
      for (var i = 0; i < els.vuBars.length; i++) {
        els.vuBars[i].style.height = (isPlaying ? 15 + Math.random() * 85 : 15) + '%';
      }
    }, 100);
  }

  function stopVuAnimation() {
    if (vuInterval) {
      clearInterval(vuInterval);
      vuInterval = null;
    }
    if (els.vuBars) {
      for (var i = 0; i < els.vuBars.length; i++) {
        els.vuBars[i].style.height = '20%';
      }
    }
  }

  function togglePlay() {
    if (isPlaying) {
      playGeneration++;
      if (els.audio) els.audio.pause();
      isPlaying = false;
      updatePlayButton();
      stopVuAnimation();
      stopMetaPolling();
      setStatus('Paused');
      return;
    }

    if (!activeStation) {
      var first = document.querySelector('.radio-preset');
      activeStation = stationFromButton(first);
      updateStationUI(activeStation);
    }

    playStream(activeStation);
  }

  function savePrefs() {
    if (!activeStation) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        volume: els.volumeSlider ? parseInt(els.volumeSlider.value, 10) : 80,
        stationId: activeStation.id,
        theme: isAmber ? 'amber' : 'green',
      }));
    } catch (e) { /* ignore */ }
  }

  function loadPrefs() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var prefs = JSON.parse(raw);

      if (typeof prefs.volume === 'number' && els.volumeSlider) {
        els.volumeSlider.value = Math.min(100, Math.max(0, prefs.volume));
        if (els.audio) els.audio.volume = els.volumeSlider.value / 100;
      }

      if (prefs.stationId && STATIONS[prefs.stationId]) {
        activeStation = STATIONS[prefs.stationId];
      }

      if (prefs.theme === 'amber' && els.lcd) {
        isAmber = true;
        els.lcd.classList.add('is-amber');
        if (els.themeToggle) els.themeToggle.textContent = 'LCD: Amber';
      }
    } catch (e) { /* ignore */ }
  }

  function bindEvents() {
    if (els.presets) {
      els.presets.addEventListener('click', onPresetClick);
    }

    if (els.playBtn) {
      els.playBtn.addEventListener('click', function (e) {
        e.preventDefault();
        togglePlay();
      });
    }

    if (els.volumeSlider && els.audio) {
      els.volumeSlider.addEventListener('input', function () {
        els.audio.volume = els.volumeSlider.value / 100;
        savePrefs();
      });
    }

    if (els.themeToggle && els.lcd) {
      els.themeToggle.addEventListener('click', function () {
        isAmber = !isAmber;
        els.lcd.classList.toggle('is-amber', isAmber);
        els.themeToggle.textContent = isAmber ? 'LCD: Amber' : 'LCD: Green';
        savePrefs();
      });
    }

    document.addEventListener('keydown', function (e) {
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        return;
      }

      var num = parseInt(e.key, 10);
      if (num >= 1 && num <= 3) {
        var buttons = document.querySelectorAll('.radio-preset');
        if (buttons[num - 1]) {
          selectStation(stationFromButton(buttons[num - 1]), isPlaying);
        }
      }
    });
  }

  function init() {
    els.audio = $('radioAudio');
    els.playBtn = $('playBtn');
    els.volumeSlider = $('volumeSlider');
    els.lcd = $('radioLcd');
    els.track = $('nowPlayingTrack');
    els.artist = $('nowPlayingArtist');
    els.stationName = $('nowPlayingStation');
    els.freq = $('nowPlayingFreq');
    els.art = $('nowPlayingArt');
    els.artPlaceholder = $('artPlaceholder');
    els.status = $('radioStatus');
    els.led = $('radioLed');
    els.ledLabel = $('ledLabel');
    els.themeToggle = $('themeToggle');
    els.presets = $('radioPresets');
    els.vuBars = document.querySelectorAll('.radio-vu__bar');

    bindEvents();
    loadPrefs();

    if (!activeStation) {
      var firstBtn = document.querySelector('.radio-preset');
      activeStation = stationFromButton(firstBtn) || STATIONS.ckue;
    }

    updateStationUI(activeStation);

    if (els.audio && els.volumeSlider) {
      els.audio.volume = els.volumeSlider.value / 100;
    }

    updatePlayButton();
    setStatus('Press play or hit spacebar to start');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();