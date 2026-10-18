export const STORAGE_KEY = 'codeflow-fm.preferences.v1';
const defaults = { stationId: null, volume: 0.7, muted: false };
export const WEBM_OPUS_TYPE = 'audio/webm; codecs=opus';
export const AUDIO_TYPES = ['audio/mpeg', 'audio/webm', WEBM_OPUS_TYPE];
export const UNSUPPORTED_BROWSER_MESSAGE = 'Your browser isn’t supported. Update your browser to listen. On iPhone, iPad, or Mac, update your system software too.';

export function supportsWebmOpus(audio) {
  const support = audio.canPlayType?.(WEBM_OPUS_TYPE);
  return support === 'probably' || support === 'maybe';
}

// iOS can ignore media volume assignments. Probe before playback instead of
// relying on browser names (including Firefox on iOS and iPad desktop mode).
export function supportsVolumeControl(audio) {
  const original = audio.volume;
  const probe = original === 0.5 ? 0.25 : 0.5;
  try {
    audio.volume = probe;
    return audio.volume === probe;
  } catch {
    return false;
  } finally {
    try { audio.volume = original; } catch { /* Some browsers expose read-only volume. */ }
  }
}

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
    if (!AUDIO_TYPES.includes(track.mime)) throw new Error('Invalid audio MIME type');
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
  constructor(audio, { onChange = () => {}, onProgress = () => {}, now = Date.now, timeoutMs = 25000, createAudio = () => new Audio() } = {}) {
    this.audio = audio;
    this.spareAudio = createAudio();
    this.preparedTrack = null;
    this.onChange = onChange;
    this.onProgress = onProgress;
    this.now = now;
    this.timeoutMs = timeoutMs;
    this.station = null;
    this.trackIndex = 0;
    this.state = supportsWebmOpus(audio) ? 'idle' : 'unsupported';
    this.error = this.state === 'unsupported' ? UNSUPPORTED_BROWSER_MESSAGE : '';
    this.wantsPlayback = false;
    this.request = 0;
    this.timer = null;
    this.pendingOffset = null;
    this.awaitingPlayback = false;

    this.listen(audio);
    this.listen(this.spareAudio);
  }

  listen(audio) {
    audio.addEventListener('loadedmetadata', () => {
      if (audio !== this.audio) return;
      this.seekToOffset();
      this.onProgress(this);
    });
    for (const event of ['timeupdate', 'durationchange']) {
      audio.addEventListener(event, () => {
        if (audio === this.audio) this.onProgress(this);
      });
    }
    audio.addEventListener('playing', () => {
      if (audio !== this.audio || !this.wantsPlayback || audio.paused) return;
      clearTimeout(this.timer);
      this.awaitingPlayback = false;
      this.state = 'playing';
      this.error = '';
      this.prepareNextTrack();
      this.emit();
    });
    audio.addEventListener('waiting', () => {
      if (audio !== this.audio || !this.wantsPlayback) return;
      this.state = 'loading';
      this.startTimeout();
      this.emit();
    });
    audio.addEventListener('pause', () => {
      if (audio !== this.audio || this.state !== 'playing' || !audio.paused || audio.ended) return;
      this.pause();
    });
    audio.addEventListener('ended', () => {
      if (audio === this.audio && this.wantsPlayback && this.station) {
        this.startTrack((this.trackIndex + 1) % this.station.tracks.length, 0, true);
      }
    });
    audio.addEventListener('error', () => {
      if (audio !== this.audio || !this.wantsPlayback || !audio.error) return;
      if (audio.error.code === 4) this.unsupported();
      else this.fail();
    });
    audio.addEventListener('volumechange', () => {
      if (audio === this.audio) this.emit();
    });
  }

  emit() { this.onChange(this); }

  select(station) {
    if (this.state === 'unsupported') return;
    this.station = station;
    this.state = 'ready';
    this.emit();
  }

  tune(station = this.station) {
    if (this.state === 'unsupported') return;
    if (!station) return;
    if (this.station?.id === station.id && ['playing', 'loading'].includes(this.state)) return;
    this.station = station;
    const { index, offset } = getLivePosition(station, this.now());
    this.startTrack(index, offset);
  }

  prepareNextTrack() {
    const index = (this.trackIndex + 1) % this.station.tracks.length;
    if (this.preparedTrack?.station === this.station && this.preparedTrack.index === index) return;
    this.preparedTrack = { station: this.station, index };
    this.spareAudio.preload = 'auto';
    this.spareAudio.src = this.station.tracks[index].url;
    this.spareAudio.load();
  }

  clearPreload() {
    this.preparedTrack = null;
    this.spareAudio.pause();
    this.spareAudio.removeAttribute('src');
    this.spareAudio.load();
  }

  startTrack(index, offset, usePrepared = false) {
    if (this.state === 'unsupported') return;
    const request = ++this.request;
    const prepared = usePrepared && this.preparedTrack?.station === this.station
      && this.preparedTrack.index === index && !this.spareAudio.error;
    clearTimeout(this.timer);
    this.wantsPlayback = false;
    this.state = 'loading';
    this.audio.pause();
    if (prepared) {
      // Keep the next element's buffered/decoded media intact. Only one plays at a time.
      const previous = this.audio;
      this.spareAudio.volume = previous.volume;
      this.spareAudio.muted = previous.muted;
      this.audio = this.spareAudio;
      this.spareAudio = previous;
    }
    this.clearPreload();
    this.trackIndex = index;
    this.error = '';
    this.pendingOffset = prepared ? null : offset;
    if (!prepared) this.audio.src = this.station.tracks[index].url;
    this.state = prepared && this.audio.readyState >= 3 ? 'playing' : 'loading';
    this.awaitingPlayback = true;
    this.wantsPlayback = true;
    this.emit();
    this.startTimeout();
    // play() stays in the station click's call stack for browser gesture policies.
    try {
      if (!prepared) this.audio.currentTime = offset;
      const playback = this.audio.play();
      Promise.resolve(playback).catch(error => {
        if (request !== this.request || !this.wantsPlayback) return;
        if (error?.name === 'NotSupportedError') { this.unsupported(); return; }
        this.fail(error?.name === 'NotAllowedError'
          ? 'Your browser paused playback. Press Play to listen.' : undefined);
      });
    } catch (error) {
      if (error?.name === 'NotSupportedError') this.unsupported();
      else this.fail();
    }
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
      if (this.wantsPlayback && (this.state === 'loading' || this.awaitingPlayback)) {
        this.fail('The connection is taking too long. Press Play to try again.');
      }
    }, this.timeoutMs);
    this.timer.unref?.();
  }

  pause() {
    if (this.state === 'unsupported') return;
    this.request++;
    this.wantsPlayback = false;
    this.awaitingPlayback = false;
    clearTimeout(this.timer);
    this.state = this.station ? 'paused' : 'idle';
    this.audio.pause();
    this.clearPreload();
    this.emit();
  }

  toggle() {
    if (this.wantsPlayback) this.pause();
    else this.tune();
  }

  fail(message = `Could not play ${this.station?.name ?? 'this station'}. Press Play to try again.`) {
    if (this.state === 'unsupported') return;
    this.request++;
    this.wantsPlayback = false;
    this.awaitingPlayback = false;
    clearTimeout(this.timer);
    this.state = 'error';
    this.error = message;
    this.audio.pause();
    this.clearPreload();
    this.emit();
  }

  unsupported() {
    this.request++;
    this.wantsPlayback = false;
    this.awaitingPlayback = false;
    this.pendingOffset = null;
    clearTimeout(this.timer);
    this.state = 'unsupported';
    this.error = UNSUPPORTED_BROWSER_MESSAGE;
    this.audio.pause();
    this.clearPreload();
    this.emit();
  }
}
