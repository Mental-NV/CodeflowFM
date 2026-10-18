export const STORAGE_KEY = 'codeflow-fm.preferences.v1';
const defaults = { stationId: null, volume: 0.7, muted: false };
const SEEK_RETRY_MS = 500;
const MAX_SEEK_ATTEMPTS = 20;
export const WEBM_OPUS_TYPE = 'audio/webm; codecs=opus';
export const AUDIO_TYPES = ['audio/mpeg', 'audio/webm', WEBM_OPUS_TYPE];
export const UNSUPPORTED_BROWSER_MESSAGE = 'Your browser isn’t supported. Update your browser to listen. On iPhone, iPad, or Mac, update your system software too.';

export function supportsWebmOpus(audio) {
  const support = audio.canPlayType?.(WEBM_OPUS_TYPE);
  return support === 'probably' || support === 'maybe';
}

export function hideVolumeControl({ userAgent = '', platform = '', maxTouchPoints = 0 } = {}) {
  // Firefox on iOS can identify as Safari; iPad desktop mode can identify as a Mac.
  const ios = /iPhone|iPad|iPod/i.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1);
  const iosChromeOrFirefox = /CriOS|FxiOS/i.test(userAgent);
  const mobileChromeOrFirefox = /Android|Mobile/i.test(userAgent)
    && /Chrome\/|Firefox\//i.test(userAgent);
  return ios || iosChromeOrFirefox || mobileChromeOrFirefox;
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
    this.seekTimer = null;
    this.seekAttempts = 0;
    this.lastSeekAt = -Infinity;
    this.seekPosition = null;
    this.seekMetadataLoaded = false;
    this.playbackStarted = false;
    this.awaitingPlayback = false;

    this.listen(audio);
    this.listen(this.spareAudio);
  }

  listen(audio) {
    for (const event of ['loadedmetadata', 'loadeddata', 'canplay', 'progress', 'seeked', 'timeupdate', 'durationchange']) {
      audio.addEventListener(event, () => {
        if (audio !== this.audio) return;
        if (event === 'loadedmetadata') this.seekMetadataLoaded = true;
        this.seekToOffset(event);
        if (['loadedmetadata', 'timeupdate', 'durationchange'].includes(event)) this.onProgress(this);
      });
    }
    audio.addEventListener('playing', () => {
      if (audio !== this.audio || !this.wantsPlayback || audio.paused) return;
      this.playbackStarted = true;
      this.seekToOffset('playing');
      if (this.pendingOffset === null) this.confirmPlayback();
    });
    audio.addEventListener('waiting', () => {
      if (audio !== this.audio || !this.wantsPlayback) return;
      this.state = 'loading';
      this.playbackStarted = false;
      this.seekPosition = null;
      // Repeated buffering events must not extend the initial seek deadline.
      if (this.pendingOffset === null) this.startTimeout();
      this.emit();
    });
    audio.addEventListener('pause', () => {
      if (audio !== this.audio || this.state !== 'playing' || !audio.paused || audio.ended) return;
      this.pause();
    });
    audio.addEventListener('ended', () => {
      if (audio === this.audio && this.wantsPlayback && this.station) {
        if (this.pendingOffset !== null) { this.fail(); return; }
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

  confirmPlayback() {
    if (!this.wantsPlayback || !this.playbackStarted || this.audio.paused) return;
    clearTimeout(this.timer);
    this.awaitingPlayback = false;
    this.state = 'playing';
    this.error = '';
    this.prepareNextTrack();
    this.emit();
  }

  clearSeek() {
    clearTimeout(this.seekTimer);
    this.seekTimer = null;
    this.pendingOffset = null;
    this.seekPosition = null;
    this.seekMetadataLoaded = false;
  }

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
    this.clearSeek();
    this.playbackStarted = false;
    this.seekAttempts = 0;
    this.lastSeekAt = -Infinity;
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
    this.pendingOffset = !prepared && offset > 0 ? offset : null;
    if (!prepared) this.audio.src = this.station.tracks[index].url;
    this.state = prepared && this.audio.readyState >= 3 ? 'playing' : 'loading';
    this.awaitingPlayback = true;
    this.wantsPlayback = true;
    this.emit();
    this.startTimeout();
    this.seekToOffset();
    // play() stays in the station click's call stack for browser gesture policies.
    try {
      // Some mobile engines reject early seeks. That must not prevent play()
      // from running in the user's gesture; readiness events will retry it.
      if (!prepared) {
        try { this.audio.currentTime = offset; } catch { /* Retry once seekable. */ }
      }
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

  seekToOffset(event) {
    if (this.pendingOffset === null || !this.wantsPlayback) return;
    if (this.seekTimer === null) {
      this.seekTimer = setTimeout(() => {
        this.seekTimer = null;
        this.seekToOffset('retry');
      }, SEEK_RETRY_MS);
      this.seekTimer.unref?.();
    }
    // src changes can leave the previous resource's metadata visible until the
    // load algorithm runs. Do not clamp or seek using that stale duration.
    if (!this.seekMetadataLoaded) return;
    const duration = this.audio.duration;
    const offset = Number.isFinite(duration) && duration > 0
      ? Math.min(this.pendingOffset, Math.max(0, duration - 0.05)) : this.pendingOffset;
    this.pendingOffset = offset;
    if (this.audio.readyState < 2 || this.audio.seeking) {
      this.seekPosition = null;
      return;
    }
    const position = this.audio.currentTime;
    // A currentTime assignment can report the target before the decoder gets
    // there. Require subsequent playback movement, not just setter readback.
    const nearTarget = Math.abs(position - offset) <= Math.min(1, offset / 2);
    if (nearTarget) {
      if (this.playbackStarted && !this.audio.paused) {
        if (event === 'timeupdate' && this.seekPosition !== null && position > this.seekPosition) {
          this.clearSeek();
          this.confirmPlayback();
          return;
        } else if (['playing', 'seeked', 'timeupdate'].includes(event)) {
          this.seekPosition ??= position;
        }
      }
    } else this.seekPosition = null;
    const ranges = this.audio.seekable;
    const canSeek = ranges && Array.from({ length: ranges.length }, (_, i) => i)
      .some(i => ranges.start(i) <= offset && offset <= ranges.end(i));
    if (!canSeek || this.seekAttempts >= MAX_SEEK_ATTEMPTS || Date.now() - this.lastSeekAt < SEEK_RETRY_MS) return;
    this.seekAttempts++;
    this.lastSeekAt = Date.now();
    this.seekPosition = null;
    try { this.audio.currentTime = offset; } catch { /* Retry within the startup deadline. */ }
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
    this.playbackStarted = false;
    this.clearSeek();
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
    this.playbackStarted = false;
    this.clearSeek();
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
    this.playbackStarted = false;
    this.clearSeek();
    clearTimeout(this.timer);
    this.state = 'unsupported';
    this.error = UNSUPPORTED_BROWSER_MESSAGE;
    this.audio.pause();
    this.clearPreload();
    this.emit();
  }
}
