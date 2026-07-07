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
      short: 'KEXP',
      name: 'KEXP 90.3',
      url: 'https://kexp.streamguys1.com/kexp64.aac',
      freq: '90.3',
      desc: 'Seattle Independent Radio',
      somaChannel: null,
    },
    {
      id: 2,
      short: 'Secret Agent',
      name: 'SomaFM Secret Agent',
      url: 'https://ice.somafm.com/secretagent-128-mp3',
      freq: 'SOMA',
      desc: 'Spy Lounge • 60s Cool',
      somaChannel: 'secretagent',
    },
    {
      id: 3,
      short: 'u80s',
      name: 'SomaFM u80s',
      url: 'https://ice.somafm.com/u80s-128-mp3',
      freq: 'SOMA',
      desc: 'Underground 80s',
      somaChannel: 'u80s',
    },
    {
      id: 4,
      short: 'Space',
      name: 'SomaFM Space Station',
      url: 'https://ice5.somafm.com/spacestation-128-mp3',
      freq: 'SOMA',
      desc: 'Spaced-out ambient & electronica',
      somaChannel: 'spacestation',
    },
  ];

  const STORAGE_KEY = 'abbeyo_radio_web_v2';

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
    const buttons = presetsContainer.querySelectorAll('.radio-preset');
    buttons.forEach((btn) => {
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

  function loadStream(url) {
    return new Promise((resolve, reject) => {
      isSwitching = true;

      const onCanPlay = () => {
        cleanup();
        isSwitching = false;
        resolve();
      };

      const onError = () => {
        cleanup();
        isSwitching = false;
        const code = audio.error?.code || 'unknown';
        reject(new Error(`Stream failed (code ${code})`));
      };

      const timeout = setTimeout(() => {
        cleanup();
        isSwitching = false;
        if (audio.readyState >= 2) {
          resolve();
        } else {
          reject(new Error('Stream connection timed out'));
        }
      }, 12000);

      function cleanup() {
        clearTimeout(timeout);
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
      }

      audio.pause();
      audio.removeAttribute('src');
      audio.load();

      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('error', onError, { once: true });

      audio.src = url;
      audio.load();
    });
  }

  async function selectStation(index, autoPlay = false) {
    if (index < 0 || index >= STATIONS.length) return;

    currentStation = index;
    const station = STATIONS[index];
    updateStationUI(station);
    savePrefs();

    try {
      await loadStream(station.url);
      if (autoPlay || isPlaying) {
        await audio.play();
        isPlaying = true;
        updatePlayButton();
        startVuAnimation();
        startMetaPolling();
        setStatus(`Streaming ${station.name}`);
      } else {
        setStatus(`${station.name} selected — press play`);
      }
      fetchMetadata();
    } catch (err) {
      if (autoPlay || isPlaying) {
        onPlayError(err);
      } else {
        setStatus(`${station.name} selected — press play to connect`);
      }
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
      return data.data?.[0]?.album?.cover_medium || null;
    } catch (_) {
      return null;
    }
  }

  async function fetchSomaMetadata(channel) {
    try {
      const res = await fetch(`https://somafm.com/songs/${channel}.json`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.songs?.[0] || null;
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
    isPlaying = false;
    updatePlayButton();
    stopVuAnimation();
    stopMetaPolling();
    const station = STATIONS[currentStation];
    setStatus(`Stream error on ${station.name} — try another preset or check your connection.`, true);
    console.error('[ABBEYO RADIO]', station.url, err);
  }

  async function togglePlay() {
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      updatePlayButton();
      stopVuAnimation();
      stopMetaPolling();
      setStatus('Paused');
      return;
    }

    const station = STATIONS[currentStation];
    setStatus('Connecting…');

    try {
      if (!audio.src || audio.readyState < 2) {
        await loadStream(station.url);
      }
      await audio.play();
      isPlaying = true;
      updatePlayButton();
      startVuAnimation();
      startMetaPolling();
      setStatus(`Streaming ${station.name}`);
    } catch (err) {
      onPlayError(err);
    }
  }

  function buildPresets() {
    presetsContainer.innerHTML = STATIONS.map((station, index) => `
      <button class="radio-preset${index === 0 ? ' is-active' : ''}" data-preset="${index}" aria-pressed="${index === 0}">
        <span class="radio-preset__num">${index + 1}</span>${station.short}
      </button>
    `).join('');

    presetsContainer.querySelectorAll('.radio-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.preset, 10);
        selectStation(index, isPlaying);
      });
    });
  }

  function buildStationList() {
    stationListEl.innerHTML = STATIONS.map((station) => `
      <li class="radio-station-item">
        <strong>${station.name}</strong> — <span>${station.desc}${station.freq !== 'SOMA' ? ` · ${station.freq}` : ''}</span>
      </li>
    `).join('');
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

    audio.addEventListener('playing', () => {
      isPlaying = true;
      updatePlayButton();
    });

    audio.addEventListener('pause', () => {
      if (!audio.ended && !isSwitching) {
        isPlaying = false;
        updatePlayButton();
        stopVuAnimation();
      }
    });

    audio.addEventListener('waiting', () => {
      if (!isSwitching) setStatus('Buffering…');
    });

    audio.addEventListener('stalled', () => {
      if (!isSwitching) setStatus('Connection stalled — retrying…', true);
    });

    audio.addEventListener('error', () => {
      if (isSwitching) return;
      if (isPlaying) {
        onPlayError(new Error(audio.error?.message || 'Playback failed'));
      }
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
    loadPrefs();
    buildPresets();
    buildStationList();
    initControls();
    updateStationUI(STATIONS[currentStation]);
    audio.volume = volumeSlider.value / 100;
    updatePlayButton();
    setStatus('Press play or hit spacebar to start');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();