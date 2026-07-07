/**
 * ABBEYO RADIO — Web Player
 * Station data lives on each preset button (data-*) — not array indices.
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'abbeyo_radio_web_v5';

  var audio = document.getElementById('radioAudio');
  var playBtn = document.getElementById('playBtn');
  var volumeSlider = document.getElementById('volumeSlider');
  var lcd = document.getElementById('radioLcd');
  var trackEl = document.getElementById('nowPlayingTrack');
  var artistEl = document.getElementById('nowPlayingArtist');
  var stationEl = document.getElementById('nowPlayingStation');
  var freqEl = document.getElementById('nowPlayingFreq');
  var artEl = document.getElementById('nowPlayingArt');
  var artPlaceholder = document.getElementById('artPlaceholder');
  var statusEl = document.getElementById('radioStatus');
  var ledEl = document.getElementById('radioLed');
  var ledLabel = document.getElementById('ledLabel');
  var themeToggle = document.getElementById('themeToggle');
  var presetsContainer = document.getElementById('radioPresets');
  var vuBars = document.querySelectorAll('.radio-vu__bar');

  var presetButtons = [];
  var activeStation = null;
  var isPlaying = false;
  var isAmber = false;
  var isSwitching = false;
  var metaInterval = null;
  var vuInterval = null;
  var lastMetaKey = '';
  var playGeneration = 0;

  function stationFromButton(btn) {
    return {
      id: btn.getAttribute('data-station-id'),
      name: btn.getAttribute('data-name'),
      url: btn.getAttribute('data-url'),
      freq: btn.getAttribute('data-freq'),
      desc: btn.getAttribute('data-desc'),
      somaChannel: btn.getAttribute('data-soma') || null,
    };
  }

  function loadPrefs() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var prefs = JSON.parse(raw);
      if (typeof prefs.volume === 'number' && volumeSlider) {
        volumeSlider.value = Math.min(100, Math.max(0, prefs.volume));
        audio.volume = volumeSlider.value / 100;
      }
      if (prefs.stationId) {
        var match = presetButtons.find(function (b) {
          return b.getAttribute('data-station-id') === prefs.stationId;
        });
        if (match) activeStation = stationFromButton(match);
      }
      if (prefs.theme === 'amber') {
        isAmber = true;
        lcd.classList.add('is-amber');
        themeToggle.textContent = 'LCD: Amber';
      }
    } catch (e) { /* ignore */ }
  }

  function savePrefs() {
    if (!activeStation) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      volume: parseInt(volumeSlider.value, 10),
      stationId: activeStation.id,
      theme: isAmber ? 'amber' : 'green',
    }));
  }

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('is-error', !!isError);
  }

  function updatePlayButton() {
    playBtn.classList.toggle('is-playing', isPlaying);
    playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    playBtn.innerHTML = isPlaying
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
    ledEl.classList.toggle('is-live', isPlaying);
    ledLabel.textContent = isPlaying ? 'Live' : 'Standby';
    document.querySelector('.radio-vu').classList.toggle('is-active', isPlaying);
  }

  function updatePresetButtons() {
    if (!activeStation) return;
    presetButtons.forEach(function (btn) {
      var active = btn.getAttribute('data-station-id') === activeStation.id;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function updateStationUI(station) {
    stationEl.textContent = station.name;
    freqEl.textContent = station.freq;
    trackEl.textContent = 'Ready to stream';
    artistEl.textContent = station.desc;
    clearArt();
    lastMetaKey = '';
    updatePresetButtons();
  }

  function playStream(station) {
    var gen = ++playGeneration;
    isSwitching = true;
    setStatus('Connecting…');

    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audio.src = station.url;

    return audio.play().then(function () {
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
      setStatus('Stream error on ' + station.name + ' — try another preset or check your connection.', true);
      console.error('[ABBEYO RADIO]', station.url, err);
    });
  }

  function selectStation(station, autoPlay) {
    if (!station || !station.url) return;

    activeStation = station;
    updateStationUI(station);
    savePrefs();

    if (autoPlay) {
      playStream(station);
    } else {
      playGeneration++;
      isSwitching = false;
      audio.pause();
      isPlaying = false;
      updatePlayButton();
      stopVuAnimation();
      stopMetaPolling();
      setStatus(station.name + ' selected — press play');
    }
  }

  function clearArt() {
    artEl.style.display = 'none';
    artEl.removeAttribute('src');
    artPlaceholder.style.display = 'block';
  }

  function showArt(url) {
    if (!url) { clearArt(); return; }
    artEl.onload = function () {
      artEl.style.display = 'block';
      artPlaceholder.style.display = 'none';
    };
    artEl.onerror = clearArt;
    artEl.src = url;
  }

  function fetchDeezerArt(artist, title) {
    var q = encodeURIComponent(artist + ' ' + title);
    return fetch('https://api.deezer.com/search?q=' + q + '&limit=1')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.data || !data.data[0] || !data.data[0].album) return null;
        return data.data[0].album.cover_medium;
      })
      .catch(function () { return null; });
  }

  function fetchSomaMetadata(channel) {
    return fetch('https://somafm.com/songs/' + channel + '.json')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        return (data && data.songs && data.songs[0]) ? data.songs[0] : null;
      })
      .catch(function () { return null; });
  }

  function fetchMetadata() {
    if (!activeStation) return;

    if (!activeStation.somaChannel) {
      trackEl.textContent = 'Live Broadcast';
      artistEl.textContent = activeStation.desc;
      return;
    }

    fetchSomaMetadata(activeStation.somaChannel).then(function (song) {
      if (!song || !activeStation) return;

      var key = song.artist + '|' + song.title;
      if (key === lastMetaKey) return;
      lastMetaKey = key;

      trackEl.textContent = song.title || 'Unknown Track';
      artistEl.textContent = song.artist || 'Unknown Artist';

      if (song.albumArt) {
        showArt(song.albumArt);
      } else {
        fetchDeezerArt(song.artist, song.title).then(showArt);
      }
    });
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
    vuInterval = setInterval(function () {
      vuBars.forEach(function (bar) {
        bar.style.height = (isPlaying ? 15 + Math.random() * 85 : 15) + '%';
      });
    }, 100);
  }

  function stopVuAnimation() {
    if (vuInterval) {
      clearInterval(vuInterval);
      vuInterval = null;
    }
    vuBars.forEach(function (bar) { bar.style.height = '20%'; });
  }

  function togglePlay() {
    if (isPlaying) {
      playGeneration++;
      audio.pause();
      isPlaying = false;
      updatePlayButton();
      stopVuAnimation();
      stopMetaPolling();
      setStatus('Paused');
      return;
    }

    if (!activeStation) {
      activeStation = stationFromButton(presetButtons[0]);
      updateStationUI(activeStation);
    }

    playStream(activeStation);
  }

  function initPresets() {
    if (!presetsContainer) return;

    presetButtons = Array.prototype.slice.call(
      presetsContainer.querySelectorAll('.radio-preset')
    );

    presetButtons.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        selectStation(stationFromButton(btn), isPlaying);
      });

      btn.addEventListener('keydown', function (e) {
        var num = parseInt(e.key, 10);
        if (num >= 1 && num <= presetButtons.length) {
          e.preventDefault();
          selectStation(stationFromButton(presetButtons[num - 1]), isPlaying);
        }
      });
    });
  }

  function initControls() {
    playBtn.addEventListener('click', togglePlay);

    volumeSlider.addEventListener('input', function () {
      audio.volume = volumeSlider.value / 100;
      savePrefs();
    });

    themeToggle.addEventListener('click', function () {
      isAmber = !isAmber;
      lcd.classList.toggle('is-amber', isAmber);
      themeToggle.textContent = isAmber ? 'LCD: Amber' : 'LCD: Green';
      savePrefs();
    });

    audio.addEventListener('waiting', function () {
      if (!isSwitching && isPlaying) setStatus('Buffering…');
    });

    document.addEventListener('keydown', function (e) {
      if (e.target.matches('input, textarea, select')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    });
  }

  function init() {
    initPresets();
    initControls();
    loadPrefs();

    if (!activeStation && presetButtons.length) {
      activeStation = stationFromButton(presetButtons[0]);
    }

    if (activeStation) updateStationUI(activeStation);
    if (audio && volumeSlider) audio.volume = volumeSlider.value / 100;
    updatePlayButton();
    setStatus('Press play or hit spacebar to start');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();