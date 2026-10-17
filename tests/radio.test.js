import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RadioPlayer, prepareStation, getLivePosition, readPreferences, savePreferences, STORAGE_KEY } from '../src/radio.js';

function station(id = 'test') {
  return prepareStation({ id, name: id }, {
    schemaVersion: '1.0', station: { id }, generatedAt: '2026-01-01T00:00:00Z',
    tracks: [10, 20, 30].map((durationSec, index) => ({ url: `https://example.com/${id}/${index}.mp3`, durationSec })),
  });
}

class AudioStub extends EventTarget {
  paused = true;
  ended = false;
  currentTime = 0;
  duration = NaN;
  volume = 0.7;
  muted = false;
  playCount = 0;
  error = null;
  readyState = 0;
  loadCount = 0;
  sources = [];
  set src(value) {
    this.source = value;
    this.sources.push(value);
    this.currentTime = 0;
    this.readyState = 0;
    this.error = null;
  }
  get src() { return this.source; }
  removeAttribute(name) { if (name === 'src') this.source = undefined; }
  load() { this.loadCount++; this.currentTime = 0; this.readyState = 0; this.error = null; }
  play() { this.paused = false; this.ended = false; this.playCount++; return this.result ?? Promise.resolve(); }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  event(name) { this.dispatchEvent(new Event(name)); }
}

function fixture(options = {}) {
  const audio = new AudioStub();
  const spare = new AudioStub();
  const channel = station();
  const player = new RadioPlayer(audio, { now: () => channel.epoch + 15000, createAudio: () => spare, ...options });
  return { audio, spare, channel, player };
}

test('live schedule finds the track and wraps endlessly, including before the epoch', () => {
  const channel = station();
  for (const [seconds, index, offset] of [[0, 0, 0], [10, 1, 0], [15, 1, 5], [30, 2, 0], [60, 0, 0], [145, 1, 15], [-5, 2, 25]]) {
    assert.deepEqual(getLivePosition(channel, channel.epoch + seconds * 1000), { index, offset });
  }
});

test('remembering a station never starts playback', () => {
  const { player, audio, channel } = fixture();
  player.select(channel);
  assert.equal(player.state, 'ready');
  assert.equal(audio.playCount, 0);
  assert.equal(audio.src, undefined);
});

test('station click starts audio immediately and waits for playing before reporting success', () => {
  const { player, audio, channel } = fixture();
  player.tune(channel);
  assert.equal(audio.playCount, 1);
  assert.equal(audio.src, channel.tracks[1].url);
  assert.equal(audio.currentTime, 5);
  assert.equal(player.state, 'loading');
  audio.event('playing');
  assert.equal(player.state, 'playing');
  player.tune(channel);
  assert.equal(audio.playCount, 1, 'clicking an on-air card must not restart');
  player.pause();
});

test('ended advances through the playlist and loops from the last track to the first', () => {
  const { player, audio, channel } = fixture();
  player.tune(channel);
  for (const expected of [2, 0, 1, 2, 0, 1]) {
    player.audio.event('playing');
    player.audio.event('ended');
    assert.equal(player.trackIndex, expected);
    assert.equal(player.audio.src, channel.tracks[expected].url);
    assert.equal(player.audio.currentTime, 0);
  }
  player.pause();
  const count = audio.playCount;
  audio.event('ended');
  assert.equal(audio.playCount, count);
});

test('preloads the next track during playback and hands off without reloading or overlapping audio', () => {
  const states = [];
  const { player, audio, spare, channel } = fixture({ onChange: player => states.push(player.state) });
  player.tune(channel);
  assert.equal(spare.src, undefined, 'initial playback gets priority over preloading');
  audio.event('playing');
  assert.equal(spare.src, channel.tracks[2].url);
  assert.equal(spare.preload, 'auto');
  assert.equal(spare.playCount, 0);
  assert.equal(spare.paused, true);
  const loads = spare.loadCount;
  audio.event('playing');
  assert.equal(spare.loadCount, loads, 'repeated playing events preserve the preload');
  spare.readyState = 4;
  states.length = 0;
  audio.event('ended');
  assert.equal(player.audio, spare);
  assert.equal(audio.paused, true);
  assert.equal(audio.src, undefined, 'release the finished stream');
  assert.equal(spare.playCount, 1);
  assert.equal(spare.loadCount, loads);
  assert.deepEqual(spare.sources, [channel.tracks[2].url]);
  assert.deepEqual(states, ['playing'], 'a buffered transition does not show Loading');
  spare.event('playing');
  assert.equal(audio.src, channel.tracks[0].url, 'reuse the finished element to preload the loop');
  player.pause();
});

test('handoff copies the latest volume and mute settings in both directions', () => {
  const { player, audio, spare, channel } = fixture();
  player.tune(channel);
  audio.event('playing');
  audio.volume = 0.23;
  audio.muted = true;
  audio.event('ended');
  assert.equal(spare.volume, 0.23);
  assert.equal(spare.muted, true);
  spare.event('playing');
  spare.volume = 0.81;
  spare.muted = false;
  spare.event('ended');
  assert.equal(player.audio, audio);
  assert.equal(audio.volume, 0.81);
  assert.equal(audio.muted, false);
  player.pause();
});

test('progress follows the active audio across handoffs and ignores preloading events', () => {
  const updates = [];
  const { player, audio, spare, channel } = fixture({
    onProgress: player => updates.push({ index: player.trackIndex, offset: player.audio.currentTime }),
  });
  player.tune(channel);
  audio.event('loadedmetadata');
  assert.deepEqual(updates, [{ index: 1, offset: 5 }]);
  audio.event('playing');
  for (const event of ['loadedmetadata', 'durationchange', 'timeupdate']) spare.event(event);
  assert.equal(updates.length, 1);
  audio.currentTime = 9;
  audio.event('timeupdate');
  assert.deepEqual(updates.at(-1), { index: 1, offset: 9 });
  audio.event('ended');
  spare.currentTime = 2;
  spare.event('timeupdate');
  assert.deepEqual(updates.at(-1), { index: 2, offset: 2 });
  const count = updates.length;
  audio.event('timeupdate');
  audio.event('durationchange');
  assert.equal(updates.length, count);
  spare.event('durationchange');
  assert.equal(updates.length, count + 1);
  player.pause();
});

test('standby events cannot seek, interrupt, or advance the current track', () => {
  const { player, audio, spare, channel } = fixture();
  player.tune(channel);
  spare.duration = 1;
  spare.event('loadedmetadata');
  assert.equal(player.pendingOffset, 5);
  audio.event('playing');
  spare.error = { code: 2 };
  for (const event of ['waiting', 'error', 'pause', 'ended', 'playing']) spare.event(event);
  assert.equal(player.state, 'playing');
  assert.equal(player.trackIndex, 1);
  assert.equal(player.audio, audio);
  player.pause();
});

test('a failed preload is retried at the boundary without interrupting the current track', () => {
  const { player, audio, spare, channel } = fixture();
  player.tune(channel);
  audio.event('playing');
  spare.error = { code: 2 };
  spare.event('error');
  assert.equal(player.state, 'playing');
  audio.event('ended');
  assert.equal(player.state, 'loading');
  assert.equal(player.audio.src, channel.tracks[2].url);
  assert.equal(player.audio.playCount, 2);
  player.audio.event('playing');
  assert.equal(player.state, 'playing');
  player.pause();
});

test('an incomplete preload is reused and reports loading until playback starts', () => {
  const { player, audio, spare, channel } = fixture();
  player.tune(channel);
  audio.event('playing');
  const loads = spare.loadCount;
  audio.event('ended');
  assert.equal(player.audio, spare);
  assert.equal(player.state, 'loading');
  assert.equal(spare.loadCount, loads);
  spare.event('playing');
  assert.equal(player.state, 'playing');
  spare.event('waiting');
  assert.equal(player.state, 'loading');
  player.pause();
});

test('switching stations, pausing, and failing release the preloaded stream', () => {
  const { player, audio, spare, channel } = fixture();
  player.tune(channel);
  audio.event('playing');
  player.tune(station('second'));
  assert.equal(spare.src, undefined);
  audio.event('playing');
  assert.equal(spare.src, station('second').tracks[2].url);
  player.pause();
  assert.equal(spare.src, undefined);
  spare.event('ended');
  assert.equal(player.state, 'paused');
  player.tune();
  audio.event('playing');
  player.fail();
  assert.equal(spare.src, undefined);
  assert.equal(audio.paused, true);
});

test('a single-track station preloads its own next iteration', () => {
  const { player, audio, spare, channel } = fixture();
  channel.tracks = channel.tracks.slice(0, 1);
  channel.duration = 10;
  player.tune(channel);
  audio.event('playing');
  assert.equal(spare.src, audio.src);
  audio.event('ended');
  assert.equal(player.audio, spare);
  assert.equal(player.trackIndex, 0);
  assert.equal(spare.currentTime, 0);
  player.pause();
});

test('pausing after handoff ignores a late play rejection and late events from the retired element', async () => {
  const { player, audio, spare, channel } = fixture();
  let reject;
  spare.result = new Promise((resolve, rejectPromise) => { reject = rejectPromise; });
  player.tune(channel);
  audio.event('playing');
  audio.event('ended');
  audio.event('ended');
  assert.equal(player.trackIndex, 2);
  player.pause();
  reject(new Error('Interrupted'));
  await Promise.resolve();
  spare.event('playing');
  assert.equal(player.state, 'paused');
  assert.equal(spare.paused, true);
});

test('even a buffered handoff times out if playback never starts', async () => {
  const { player, audio, spare, channel } = fixture({ timeoutMs: 5 });
  player.tune(channel);
  audio.event('playing');
  spare.readyState = 4;
  spare.result = new Promise(() => {});
  audio.event('ended');
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.equal(player.state, 'error');
  assert.equal(spare.paused, true);
});

test('pause stops playback, and resume rejoins the live schedule', () => {
  let time = station().epoch + 15000;
  const { player, audio, channel } = fixture({ now: () => time });
  player.tune(channel);
  audio.event('playing');
  player.toggle();
  assert.equal(player.state, 'paused');
  assert.equal(audio.paused, true);
  time += 20000;
  player.toggle();
  assert.equal(player.trackIndex, 2);
  assert.equal(audio.currentTime, 5);
  player.pause();
});

test('switching stations ignores a rejected play request for the old station', async () => {
  const { player, audio, channel } = fixture();
  let rejectFirst;
  audio.result = new Promise((resolve, reject) => { rejectFirst = reject; });
  player.tune(channel);
  audio.result = Promise.resolve();
  const second = station('second');
  player.tune(second);
  rejectFirst(new Error('Interrupted'));
  await Promise.resolve();
  assert.equal(player.station.id, 'second');
  assert.equal(player.state, 'loading');
  assert.equal(audio.src, second.tracks[1].url);
  audio.event('playing');
  assert.equal(player.state, 'playing');
  player.pause();
});

test('pausing during loading cancels late playback success and rejection', async () => {
  const { player, audio, channel } = fixture();
  let reject;
  audio.result = new Promise((resolve, rejectPromise) => { reject = rejectPromise; });
  player.tune(channel);
  player.pause();
  reject(new Error('Interrupted'));
  await Promise.resolve();
  audio.event('playing');
  assert.equal(player.state, 'paused');
});

test('media error is recoverable through the same station card', () => {
  const { player, audio, channel } = fixture();
  player.tune(channel);
  audio.error = { code: 2 };
  audio.event('error');
  assert.equal(player.state, 'error');
  assert.equal(audio.paused, true);
  assert.match(player.error, /Press Play/);
  audio.error = null;
  player.tune(channel);
  audio.event('playing');
  assert.equal(player.state, 'playing');
  player.pause();
});

test('autoplay rejection presents a recoverable error', async () => {
  const { player, audio, channel } = fixture();
  audio.result = Promise.reject(Object.assign(new Error('Blocked'), { name: 'NotAllowedError' }));
  player.tune(channel);
  await Promise.resolve();
  assert.equal(player.state, 'error');
  assert.match(player.error, /browser paused/);
});

test('a stalled connection times out and leaves Play available', async () => {
  const { player, channel } = fixture({ timeoutMs: 5 });
  player.tune(channel);
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.equal(player.state, 'error');
  assert.equal(player.wantsPlayback, false);
});

test('metadata seeking tolerates a small duration mismatch', () => {
  const { player, audio, channel } = fixture();
  player.tune(channel);
  audio.duration = 4.9;
  audio.event('loadedmetadata');
  assert.ok(audio.currentTime < audio.duration);
  player.pause();
});

test('preferences survive storage and tolerate corruption, invalid values, and denied access', () => {
  const storage = { getItem() { return this.value; }, setItem(key, value) { assert.equal(key, STORAGE_KEY); this.value = value; } };
  const preferences = { stationId: 'future-garage', volume: 0.32, muted: true };
  savePreferences(storage, preferences);
  assert.deepEqual(readPreferences(storage), preferences);
  storage.value = '{broken';
  assert.deepEqual(readPreferences(storage), { stationId: null, volume: 0.7, muted: false });
  storage.value = JSON.stringify({ volume: 10, muted: 'false', stationId: 123 });
  assert.deepEqual(readPreferences(storage), { stationId: null, volume: 1, muted: false });
  assert.equal(readPreferences(undefined).volume, 0.7);
  assert.doesNotThrow(() => savePreferences(undefined, preferences));
});

test('invalid and empty playlists are rejected', () => {
  assert.throws(() => prepareStation({ id: 'a', name: 'A' }, { schemaVersion: '1.0', station: { id: 'a' }, tracks: [] }));
  const playlist = { schemaVersion: '1.0', station: { id: 'a' }, tracks: [{ url: 'javascript:alert(1)', durationSec: 10 }] };
  assert.throws(() => prepareStation({ id: 'a', name: 'A' }, playlist));
  playlist.tracks[0] = { url: 'https://example.com/a.mp3', durationSec: null };
  assert.throws(() => prepareStation({ id: 'a', name: 'A' }, playlist));
});

test('the shipped catalog contains 57 playable Future Garage tracks', async () => {
  const catalog = JSON.parse(await readFile(new URL('../assets/stations.json', import.meta.url), 'utf8'));
  const playlist = JSON.parse(await readFile(new URL('../assets/future-garage.json', import.meta.url), 'utf8'));
  const channel = prepareStation(catalog.stations[0], playlist);
  assert.equal(channel.id, 'future-garage');
  assert.equal(channel.tracks.length, 57);
  assert.ok(channel.duration > 92 * 3600);
  assert.ok(channel.tracks.every(track => track.artist === 'X-Sound' && track.title));
});
