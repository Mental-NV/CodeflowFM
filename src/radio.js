export const STORAGE_KEY = 'codeflow-fm.preferences.v1';
const defaults = { stationId: null, volume: 0.7, muted: false };

export function readPreferences(storage) {
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY));
    return {
      stationId: typeof value?.stationId === 'string' ? value.stationId : null,
      volume: typeof value?.volume === 'number' && Number.isFinite(value.volume)
        ? Math.min(1, Math.max(0, value.volume)) : defaults.volume,
      muted: typeof value?.muted === 'boolean' ? value.muted : defaults.muted,
    };
  } catch { return { ...defaults }; }
}

export function savePreferences(storage, preferences) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Listening also works without storage. */ }
}

export function prepareStation(entry, playlist) {
  if (!entry || typeof entry.id !== 'string' || typeof entry.name !== 'string' || !entry.name.trim()
    || playlist?.schemaVersion !== '1.0' || playlist.station?.id !== entry.id
    || !Array.isArray(playlist.tracks) || !playlist.tracks.length) {
    throw new Error('Invalid station playlist');
  }
  const tracks = playlist.tracks.map(track => {
    const url = new URL(track.url);
    if (!['https:', 'http:'].includes(url.protocol) || !Number.isFinite(track.durationSec) || track.durationSec <= 0) {
      throw new Error('Invalid audio URL or duration');
    }
    return { ...track, url: url.href };
  });
  const epoch = Date.parse(playlist.generatedAt);
  return {
    ...entry, tracks,
    epoch: Number.isFinite(epoch) ? epoch : 0,
    duration: tracks.reduce((sum, track) => sum + track.durationSec, 0),
  };
}

// Every visitor tunes into the same repeating, clock-based playlist.
// No server, stream, saved audio position, or per-listener queue is needed.
export function getLivePosition(station, now = Date.now()) {
  let offset = (((now - station.epoch) / 1000) % station.duration + station.duration) % station.duration;
  for (let index = 0; index < station.tracks.length; index++) {
    if (offset < station.tracks[index].durationSec) return { index, offset };
    offset -= station.tracks[index].durationSec;
  }
  return { index: 0, offset: 0 };
}

export class RadioPlayer {
  constructor(audio, { onChange = () => {}, now = Date.now, timeoutMs = 25000 } = {}) {
    this.audio = audio;
    this.onChange = onChange;
    this.now = now;
    this.timeoutMs = timeoutMs;
    this.station = null;
    this.trackIndex = 0;
    this.state = 'idle';
    this.error = '';
    this.wantsPlayback = false;
    this.request = 0;
    this.timer = null;
    this.pendingOffset = null;

    audio.addEventListener('loadedmetadata', () => this.seekToOffset());
    audio.addEventListener('playing', () => {
      if (!this.wantsPlayback || audio.paused) return;
      clearTimeout(this.timer);
      this.state = 'playing';
      this.error = '';
      this.emit();
    });
    audio.addEventListener('waiting', () => {
      if (!this.wantsPlayback) return;
      this.state = 'loading';
      this.startTimeout();
      this.emit();
    });
    audio.addEventListener('pause', () => {
      if (this.state !== 'playing' || !audio.paused || audio.ended) return;
      this.pause();
    });
    audio.addEventListener('ended', () => {
      if (this.wantsPlayback && this.station) {
        this.startTrack((this.trackIndex + 1) % this.station.tracks.length, 0);
      }
    });
    audio.addEventListener('error', () => {
      if (this.wantsPlayback && audio.error) this.fail();
    });
    audio.addEventListener('volumechange', () => this.emit());
  }

  emit() { this.onChange(this); }

  select(station) {
    this.station = station;
    this.state = 'ready';
    this.emit();
  }

  tune(station = this.station) {
    if (!station) return;
    if (this.station?.id === station.id && ['playing', 'loading'].includes(this.state)) return;
    this.station = station;
    const { index, offset } = getLivePosition(station, this.now());
    this.startTrack(index, offset);
  }

  startTrack(index, offset) {
    const request = ++this.request;
    clearTimeout(this.timer);
    this.wantsPlayback = false;
    this.state = 'loading';
    this.audio.pause();
    this.trackIndex = index;
    this.error = '';
    this.pendingOffset = offset;
    this.audio.src = this.station.tracks[index].url;
    this.wantsPlayback = true;
    this.emit();
    this.startTimeout();
    // play() stays in the station click's call stack for browser gesture policies.
    try {
      this.audio.currentTime = offset;
      const playback = this.audio.play();
      Promise.resolve(playback).catch(error => {
        if (request !== this.request || !this.wantsPlayback) return;
        this.fail(error?.name === 'NotAllowedError'
          ? 'Your browser paused playback. Press Play to listen.' : undefined);
      });
    } catch { this.fail(); }
  }

  seekToOffset() {
    if (this.pendingOffset === null || !this.wantsPlayback) return;
    const duration = this.audio.duration;
    const offset = Number.isFinite(duration) ? Math.min(this.pendingOffset, Math.max(0, duration - 0.05)) : this.pendingOffset;
    this.pendingOffset = null;
    try { this.audio.currentTime = offset; } catch { this.fail(); }
  }

  startTimeout() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.wantsPlayback && this.state === 'loading') {
        this.fail('The connection is taking too long. Press Play to try again.');
      }
    }, this.timeoutMs);
    this.timer.unref?.();
  }

  pause() {
    this.request++;
    this.wantsPlayback = false;
    clearTimeout(this.timer);
    this.state = this.station ? 'paused' : 'idle';
    this.audio.pause();
    this.emit();
  }

  toggle() {
    if (this.wantsPlayback) this.pause();
    else this.tune();
  }

  fail(message = `Could not play ${this.station?.name ?? 'this station'}. Press Play to try again.`) {
    this.request++;
    this.wantsPlayback = false;
    clearTimeout(this.timer);
    this.state = 'error';
    this.error = message;
    this.audio.pause();
    this.emit();
  }
}
