/**
 * ABBEYO RADIO — Web Player
 */

(function () {
  'use strict';

  const STATIONS = [
    {
      id: 0,
      short: 'CKUE',
      name: 'CKUE Cool FM',
      url: 'https://blackburn-ais.leanstream.co/CKUEF2-MP3?args=web_02',
      freq: '95.1 / 100.7',
      desc: 'Classic Hits • 80s 90s Today',
      somaChannel: null,
    },
    {
      id: 1,
      short: 'u80s',
      name: 'SomaFM u80s',
      url: 'https://ice1.somafm.com/u80s-128-mp3',
      freq: 'SOMA',
      desc: 'Underground 80s',
      somaChannel: 'u80s',
    },
    {
      id: 2,
      short: 'Space',
      name: 'SomaFM Space Station',
      url: 'https://ice1.somafm.com/spacestation-128-mp3',
      freq: 'SOMA',
      desc: 'Spaced-out ambient & electronica',
      somaChannel: 'spacestation',
    },
  ];

  const STORAGE_KEY = 'abbeyo_radio_web_v4';
  const CONNECT_TIMEOUT_MS = 15000;

  const audio = document.getElementById('radioAudio');
  const playBtn = document.getElementById('playBtn');
  const volumeSlider = document.getElementById('volumeSlider');
  const lcd = document.getElementById('radioLcd');
  const trackEl = document.getElementById('nowPlayingTrack');
  const artistEl = document.getElementById('nowPlayingArtist');
  const stationEl = document.getElementById('nowPlayingStation');
  const freqEl = document.getElementById('nowPlayingFreq');
  const artEl = document.getElementById('nowPlayingArt');
  const artPlaceholder = document.getElementById('artPlaceholder');
  const statusEl = document.getElementById('radioStatus');
  const ledEl = document.getElementById('radioLed');
  const ledLabel = document.getElementById('ledLabel');
  const themeToggle = document.getElementById('themeToggle');
  const presetsContainer = document.getElementById('radioPresets');
  const stationListEl = document.getElementById('stationList');
  const vuBars = document.querySelectorAll('.radio-vu__bar');

  let currentStation = 0;
  let isPlaying = false;
  let isAmber = false;
  let isSwitching = false;
  let metaInterval = null;
  let vuInterval = null;
  let lastMetaKey = '';
  let connectToken = 0;

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw);
      if (typeof prefs.volume === 'number') {
        volumeSlider.value = Math.min(100, Math.max(0, prefs.volume));
        audio.volume = volumeSlider.value / 100;
      }
      if (typeof prefs.station === 'number' && prefs.station >= 0 && prefs.station < STATIONS.length) {
        currentStation = prefs.station;
      }
      if (prefs.theme === 'amber') {
        isAmber = true;
        lcd.classList.add('is-amber');
        themeToggle.textContent = 'LCD: Amber';
      }
    } catch (_) { /* ignore */ }
  }

  function savePrefs() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        volume: parseInt(volumeSlider.value, 10),
        station: currentStation,
        theme: isAmber ? 'amber' : 'green',
      })
    );
  }

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('is-error', isError);
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
    if (!presetsContainer) return;
    presetsContainer.querySelectorAll('.radio-preset').forEach((btn) => {
      const index = parseInt(btn.dataset.preset, 10);
      const active = index === currentStation;
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

  function startPlayback(station) {
    const token = ++connectToken;
    isSwitching = true;
    setStatus('Connecting…');

    return new Promise((resolve, reject) => {
      let settled = false;

      function finish(err) {
        if (settled || token !== connectToken) return;
        settled = true;
        clearTimeout(timer);
        audio.removeEventListener('playing', onPlaying);
        audio.removeEventListener('error', onError);
        isSwitching = false;
        if (err) reject(err);
        else resolve();
      }

      function onPlaying() {
        finish(null);
      }

      function onError() {
        const code = (audio.error && audio.error.code) || 'unknown';
        const msg = (audio.error && audio.error.message) || ('Media error code ' + code);
        finish(new Error(msg));
      }

      const timer = setTimeout(() => {
        if (audio.readyState > 0 && !audio.paused) {
          finish(null);
        } else if (audio.readyState > 0) {
          audio.play().catch((e) => finish(e));
        } else {
          finish(new Error('Connection timed out'));
        }
      }, CONNECT_TIMEOUT_MS);

      audio.addEventListener('playing', onPlaying, { once: true });
      audio.addEventListener('error', onError, { once: true });

      audio.pause();
      audio.src = station.url;
      audio.load();
      audio.play().catch((e) => finish(e));
    });
  }

  async function playStation(station) {
    try {
      await startPlayback(station);
      isPlaying = true;
      updatePlayButton();
      startVuAnimation();
      startMetaPolling();
      setStatus(`Streaming ${station.name}`);
      fetchMetadata();
    } catch (err) {
      isPlaying = false;
      updatePlayButton();
      stopVuAnimation();
      stopMetaPolling();
      onPlayError(err);
    }
  }

  function selectStation(index, shouldPlay) {
    if (index < 0 || index >= STATIONS.length) return;

    currentStation = index;
    const station = STATIONS[index];
    updateStationUI(station);
    savePrefs();

    if (shouldPlay) {
      playStation(station);
    } else {
      connectToken++;
      isSwitching = false;
      audio.pause();
      isPlaying = false;
      updatePlayButton();
      stopVuAnimation();
      stopMetaPolling();
      setStatus(`${station.name} selected — press play`);
    }
  }

  function clearArt() {
    artEl.style.display = 'none';
    artEl.removeAttribute('src');
    artPlaceholder.style.display = 'block';
  }

  function showArt(url) {
    if (!url) {
      clearArt();
      return;
    }
    artEl.onload = () => {
      artEl.style.display = 'block';
      artPlaceholder.style.display = 'none';
    };
    artEl.onerror = clearArt;
    artEl.src = url;
  }

  async function fetchDeezerArt(artist, title) {
    try {
      const q = encodeURIComponent(`${artist} ${title}`);
      const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=1`);
      if (!res.ok) return null;
      const data = await res.json();
      return (data.data && data.data[0] && data.data[0].album && data.data[0].album.cover_medium) || null;
    } catch (_) {
      return null;
    }
  }

  async function fetchSomaMetadata(channel) {
    try {
      const res = await fetch(`https://somafm.com/songs/${channel}.json`);
      if (!res.ok) return null;
      const data = await res.json();
      return (data.songs && data.songs[0]) || null;
    } catch (_) {
      return null;
    }
  }

  async function fetchMetadata() {
    const station = STATIONS[currentStation];
    if (!station.somaChannel) {
      trackEl.textContent = 'Live Broadcast';
      artistEl.textContent = station.desc;
      return;
    }

    const song = await fetchSomaMetadata(station.somaChannel);
    if (!song) return;

    const key = `${song.artist}|${song.title}`;
    if (key === lastMetaKey) return;
    lastMetaKey = key;

    trackEl.textContent = song.title || 'Unknown Track';
    artistEl.textContent = song.artist || 'Unknown Artist';

    if (song.albumArt) {
      showArt(song.albumArt);
    } else {
      const art = await fetchDeezerArt(song.artist, song.title);
      showArt(art);
    }
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
    vuInterval = setInterval(() => {
      vuBars.forEach((bar) => {
        const h = isPlaying ? 15 + Math.random() * 85 : 15;
        bar.style.height = `${h}%`;
      });
    }, 100);
  }

  function stopVuAnimation() {
    if (vuInterval) {
      clearInterval(vuInterval);
      vuInterval = null;
    }
    vuBars.forEach((bar) => {
      bar.style.height = '20%';
    });
  }

  function onPlayError(err) {
    const station = STATIONS[currentStation];
    setStatus(`Stream error on ${station.name} — try another preset or check your connection.`, true);
    console.error('[ABBEYO RADIO]', station.url, err);
  }

  function togglePlay() {
    if (isPlaying) {
      connectToken++;
      audio.pause();
      isPlaying = false;
      updatePlayButton();
      stopVuAnimation();
      stopMetaPolling();
      setStatus('Paused');
      return;
    }

    playStation(STATIONS[currentStation]);
  }

  function initPresets() {
    if (!presetsContainer) return;
    presetsContainer.querySelectorAll('.radio-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.preset, 10);
        if (!isNaN(index)) selectStation(index, isPlaying);
      });
    });
  }

  function initControls() {
    playBtn.addEventListener('click', togglePlay);

    volumeSlider.addEventListener('input', () => {
      audio.volume = volumeSlider.value / 100;
      savePrefs();
    });

    themeToggle.addEventListener('click', () => {
      isAmber = !isAmber;
      lcd.classList.toggle('is-amber', isAmber);
      themeToggle.textContent = isAmber ? 'LCD: Amber' : 'LCD: Green';
      savePrefs();
    });

    audio.addEventListener('waiting', () => {
      if (!isSwitching && isPlaying) setStatus('Buffering…');
    });

    audio.addEventListener('stalled', () => {
      if (!isSwitching && isPlaying) setStatus('Connection stalled — retrying…', true);
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= STATIONS.length) {
        selectStation(num - 1, isPlaying);
      }
    });
  }

  function init() {
    try {
      loadPrefs();
      initPresets();
      initControls();
      updateStationUI(STATIONS[currentStation]);
      if (audio && volumeSlider) audio.volume = volumeSlider.value / 100;
      updatePlayButton();
      setStatus('Press play or hit spacebar to start');
    } catch (err) {
      console.error('[ABBEYO RADIO] Init failed:', err);
      setStatus('Player loaded with limited features — refresh if buttons do not respond.', true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();