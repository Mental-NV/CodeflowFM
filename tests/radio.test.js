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
  play() { this.paused = false; this.ended = false; this.playCount++; return this.result ?? Promise.resolve(); }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  event(name) { this.dispatchEvent(new Event(name)); }
}

function fixture(options = {}) {
  const audio = new AudioStub();
  const channel = station();
  const player = new RadioPlayer(audio, { now: () => channel.epoch + 15000, ...options });
  return { audio, channel, player };
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
    audio.event('ended');
    assert.equal(player.trackIndex, expected);
    assert.equal(audio.src, channel.tracks[expected].url);
    assert.equal(audio.currentTime, 0);
  }
  player.pause();
  const count = audio.playCount;
  audio.event('ended');
  assert.equal(audio.playCount, count);
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
  const playlist = JSON.parse(await readFile(new URL('../assets/playlist.json', import.meta.url), 'utf8'));
  const channel = prepareStation(catalog.stations[0], playlist);
  assert.equal(channel.id, 'future-garage');
  assert.equal(channel.tracks.length, 57);
  assert.ok(channel.duration > 92 * 3600);
  assert.ok(channel.tracks.every(track => track.artist === 'X-Sound' && track.title));
});
