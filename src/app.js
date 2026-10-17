import { RadioPlayer, prepareStation, readPreferences, savePreferences } from './radio.js';
import { installScrollbar } from './scrollbar.js';

const element = id => document.getElementById(id);
const audio = element('radio-audio');
let storage;
try { storage = window.localStorage; } catch { /* Storage can be blocked by browser settings. */ }
const preferences = readPreferences(storage);
audio.volume = preferences.volume;
audio.muted = preferences.muted;
const cards = new Map();
let lastMetadata = '';
let lastSaved = '';
const player = new RadioPlayer(audio, { onChange: render });

const compactPlayer = window.matchMedia('(max-width: 700px)');
const volumeControl = element('volume-control');
const volumeToggle = element('volume-toggle');
const volumePanel = element('volume-panel');

function setVolumePanelOpen(open, restoreFocus = false) {
  const expanded = compactPlayer.matches && open;
  volumePanel.hidden = compactPlayer.matches && !expanded;
  volumeToggle.setAttribute('aria-expanded', String(expanded));
  if (expanded) element('volume').focus();
  else if (restoreFocus) (compactPlayer.matches ? volumeToggle : element('volume')).focus();
}

volumeToggle.addEventListener('click', () => {
  setVolumePanelOpen(volumeToggle.getAttribute('aria-expanded') !== 'true');
});
volumeControl.addEventListener('keydown', event => {
  if (event.key === 'Escape' && volumeToggle.getAttribute('aria-expanded') === 'true') {
    event.preventDefault();
    setVolumePanelOpen(false, true);
  }
});
volumeControl.addEventListener('focusout', event => {
  if (!volumeControl.contains(event.relatedTarget)) setVolumePanelOpen(false);
});
document.addEventListener('pointerdown', event => {
  if (!volumeControl.contains(event.target)) setVolumePanelOpen(false, volumePanel.contains(document.activeElement));
});
compactPlayer.addEventListener('change', () => {
  setVolumePanelOpen(false, volumeControl.contains(document.activeElement));
});
setVolumePanelOpen(false);

function render() {
  const station = player.station;
  const muted = audio.muted || audio.volume === 0;
  const playing = player.state === 'playing';
  const status = {
    idle: 'Choose a station to begin.', ready: 'Ready to play',
    loading: 'Loading…', playing: muted ? 'Playing · Muted' : 'Playing',
    paused: 'Paused', error: player.error,
  }[player.state];
  element('player-station').textContent = station?.name ?? 'Nothing playing';
  element('playback-status').textContent = status;
  element('playback-status').dataset.error = String(player.state === 'error');
  const artwork = element('player-art');
  artwork.hidden = !station;
  if (station && artwork.getAttribute('src') !== station.artwork) artwork.src = station.artwork;
  element('play-toggle').disabled = !station;
  const action = player.wantsPlayback ? 'Pause' : 'Play';
  element('play-toggle').setAttribute('aria-label', `${action}${station ? ` ${station.name}` : ''}`);
  element('play-toggle').title = action;
  element('play-label').textContent = action;
  element('play-icon').firstElementChild.setAttribute('d', player.wantsPlayback ? 'M6 5h4v14H6zm8 0h4v14h-4z' : 'm9 5 11 7-11 7Z');
  element('mute-toggle').setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
  element('mute-toggle').title = muted ? 'Unmute' : 'Mute';
  element('mute-toggle').setAttribute('aria-pressed', String(muted));
  element('mute-label').textContent = muted ? 'Unmute' : 'Mute';
  element('sound-waves').toggleAttribute('hidden', muted);
  element('sound-cross').toggleAttribute('hidden', !muted);
  element('volume').value = String(Math.round(audio.volume * 100));
  element('volume-value').value = `${Math.round(audio.volume * 100)}%`;

  const track = station && !['ready', 'idle'].includes(player.state) ? station.tracks[player.trackIndex] : null;
  const metadata = [track?.artist, track?.title].filter(Boolean).join(' · ');
  element('track-info').textContent = metadata;
  element('track-info').title = metadata;
  element('track-info').hidden = !metadata;
  for (const [id, card] of cards) {
    const current = station?.id === id;
    card.dataset.current = String(current);
    card.setAttribute('aria-disabled', String(current && playing));
    card.querySelector('.station-state').textContent = current
      ? ({ playing: muted ? 'Muted' : 'On air', loading: 'Loading…', paused: 'Paused', ready: 'Selected', error: 'Unavailable' }[player.state] ?? 'Continuous radio')
      : 'Continuous radio';
  }
  document.title = station && playing ? `${station.name} — Codeflow FM` : 'Codeflow FM — Background radio';
  const saved = { stationId: station?.id ?? preferences.stationId, volume: audio.volume, muted: audio.muted };
  const serialized = JSON.stringify(saved);
  if (serialized !== lastSaved) { savePreferences(storage, saved); lastSaved = serialized; }

  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = playing ? 'playing' : station ? 'paused' : 'none';
    const metadataKey = `${station?.id}:${metadata}`;
    if (station && metadataKey !== lastMetadata && 'MediaMetadata' in window) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: track?.title || station.name, artist: track?.artist || 'Codeflow FM', album: station.name });
      lastMetadata = metadataKey;
    }
  }
}

element('play-toggle').addEventListener('click', () => player.toggle());
element('volume').addEventListener('input', event => {
  audio.volume = Number(event.target.value) / 100;
  if (audio.volume > 0) audio.muted = false;
  render();
});
element('mute-toggle').addEventListener('click', () => {
  if (audio.muted || audio.volume === 0) {
    audio.muted = false;
    if (audio.volume === 0) audio.volume = preferences.volume || 0.7;
  } else audio.muted = true;
  render();
});

if ('mediaSession' in navigator) {
  for (const [action, handler] of Object.entries({ play: () => player.tune(), pause: () => player.pause(), stop: () => player.pause() })) {
    try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* Optional browser support. */ }
  }
}
window.addEventListener('offline', () => {
  if (player.wantsPlayback) player.fail('You are offline. Reconnect, then press Play.');
});

async function readJSON(path) {
  const response = await fetch(path, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

async function loadStations() {
  try {
    const catalog = await readJSON('./assets/stations.json');
    if (!Array.isArray(catalog.stations) || !catalog.stations.length) throw new Error('Empty catalog');
    const results = await Promise.allSettled(catalog.stations.map(async entry => prepareStation(entry, await readJSON(entry.playlist))));
    const stations = results.filter(result => result.status === 'fulfilled').map(result => result.value);
    if (!stations.length) throw new Error('No playable stations');
    for (const [index, station] of stations.entries()) {
      if (cards.has(station.id)) continue;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'station-card';
      card.setAttribute('aria-label', `Tune in to ${station.name}`);
      const artwork = document.createElement('img');
      artwork.className = 'station-art';
      artwork.src = station.artwork || './assets/future-garage.svg';
      artwork.alt = '';
      artwork.width = 108;
      artwork.height = 108;
      artwork.addEventListener('error', () => { artwork.src = './assets/future-garage.svg'; }, { once: true });
      const copy = document.createElement('span');
      for (const [className, text] of [
        ['station-number', `STATION ${String(index + 1).padStart(2, '0')}`],
        ['station-name', station.name], ['station-description', station.description ?? 'Continuous music for your work session.'],
        ['station-state', 'Continuous radio'],
      ]) {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = text;
        copy.append(span);
      }
      card.append(artwork, copy);
      card.addEventListener('click', () => player.tune(station));
      cards.set(station.id, card);
      element('station-grid').append(card);
    }
    const selected = stations.find(station => station.id === preferences.stationId);
    if (selected) player.select(selected);
    element('catalog-message').hidden = results.every(result => result.status === 'fulfilled');
    element('catalog-message').textContent = 'Some stations could not load. Refresh the page to try again.';
    render();
  } catch {
    element('catalog-message').textContent = 'Stations could not load. Refresh the page.';
  }
}

element('player-art').addEventListener('error', event => { event.target.src = './assets/future-garage.svg'; }, { once: true });
installScrollbar(element('station-chooser'), element('station-grid'), element('chooser-scrollbar'));
render();
loadStations();
