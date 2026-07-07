/**
 * ABBEYO RADIO — Web Player
 * Station presets mirror the desktop Abbeyo Radio app.
 */

(function () {
  'use strict';

  const STATIONS = [
    {
      id: 0,
      name: 'CKUE Cool FM',
      url: 'https://blackburn-ais.leanstream.co/CKUEF2-MP3?args=web_02',
      freq: '95.1 / 100.7',
      desc: 'Classic Hits • 80s 90s Today',
      somaChannel: null,
    },
    {
      id: 1,
      name: 'SomaFM u80s',
      url: 'https://ice.somafm.com/u80s-128-mp3',
      freq: 'SOMA',
      desc: 'Underground 80s',
      somaChannel: 'u80s',
    },
    {
      id: 2,
      name: 'SomaFM Space Station',
      url: 'https://ice5.somafm.com/spacestation-128-mp3',
      freq: 'SOMA',
      desc: 'Spaced-out ambient & electronica',
      somaChannel: 'spacestation',
    },
  ];

  const STORAGE_KEY = 'abbeyo_radio_web';

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
  const vuBars = document.querySelectorAll('.radio-vu__bar');
  const presetBtns = document.querySelectorAll('.radio-preset');

  let currentStation = 0;
  let isPlaying = false;
  let isAmber = false;
  let metaInterval = null;
  let vuInterval = null;
  let lastMetaKey = '';

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw);
      if (typeof prefs.volume === 'number') {
        volumeSlider.value = prefs.volume;
        audio.volume = prefs.volume / 100;
      }
      if (typeof prefs.station === 'number' && prefs.station < STATIONS.length) {
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

  function selectStation(index) {
    currentStation = index;
    const station = STATIONS[index];

    presetBtns.forEach((btn, i) => {
      btn.classList.toggle('is-active', i === index);
      btn.setAttribute('aria-pressed', String(i === index));
    });

    stationEl.textContent = station.name;
    freqEl.textContent = station.freq;
    trackEl.textContent = 'Ready to stream';
    artistEl.textContent = station.desc;
    clearArt();
    lastMetaKey = '';

    audio.src = station.url;
    savePrefs();

    if (isPlaying) {
      audio.play().catch(onPlayError);
    }

    fetchMetadata();
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
    setStatus('Stream error — try another preset or check your connection.', true);
    console.error('[ABBEYO RADIO]', err);
  }

  async function togglePlay() {
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      updatePlayButton();
      stopVuAnimation();
      setStatus('Paused');
      return;
    }

    if (!audio.src) selectStation(currentStation);

    setStatus('Connecting…');
    try {
      await audio.play();
      isPlaying = true;
      updatePlayButton();
      startVuAnimation();
      startMetaPolling();
      setStatus(`Streaming ${STATIONS[currentStation].name}`);
    } catch (err) {
      onPlayError(err);
    }
  }

  function initPresets() {
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.preset, 10);
        selectStation(index);
        if (isPlaying) {
          setStatus(`Streaming ${STATIONS[index].name}`);
        }
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

    audio.addEventListener('playing', () => {
      isPlaying = true;
      updatePlayButton();
    });

    audio.addEventListener('pause', () => {
      if (!audio.ended) {
        isPlaying = false;
        updatePlayButton();
        stopVuAnimation();
      }
    });

    audio.addEventListener('waiting', () => setStatus('Buffering…'));
    audio.addEventListener('stalled', () => setStatus('Connection stalled — retrying…', true));

    audio.addEventListener('error', () => {
      onPlayError(new Error(audio.error?.message || 'Playback failed'));
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= STATIONS.length) {
        selectStation(num - 1);
        if (isPlaying) setStatus(`Streaming ${STATIONS[num - 1].name}`);
      }
    });
  }

  function init() {
    loadPrefs();
    initPresets();
    initControls();
    selectStation(currentStation);
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