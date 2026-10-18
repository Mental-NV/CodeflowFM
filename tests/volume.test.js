import test from 'node:test';
import assert from 'node:assert/strict';
import { supportsVolumeControl, STORAGE_KEY } from '../src/radio.js';

test('volume detection preserves the starting level, including zero and the probe value', () => {
  for (const volume of [0, 0.25, 0.5, 0.7, 1]) {
    const audio = { volume };
    assert.equal(supportsVolumeControl(audio), true);
    assert.equal(audio.volume, volume);
  }
});

test('iOS-style ignored assignments cannot be mistaken for working volume control', () => {
  for (const volume of [0.5, 1]) {
    const audio = { get volume() { return volume; }, set volume(value) {} };
    assert.equal(supportsVolumeControl(audio), false);
    assert.equal(audio.volume, volume);
  }
});

test('read-only and throwing volume properties fall back without breaking startup', () => {
  const readOnly = Object.freeze({ volume: 1 });
  const throwing = {
    get volume() { return 1; },
    set volume(value) { throw new Error('Volume is controlled by the device'); },
  };
  assert.equal(supportsVolumeControl(readOnly), false);
  assert.equal(supportsVolumeControl(throwing), false);
});

// Exercise the actual app handlers with device-controlled and writable media
// elements, without requiring an iPhone or making audio/network requests.
async function loadApp(t, deviceVolume) {
  const originals = new Map();
  const replace = (name, value) => {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value });
  };
  t.after(() => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  class Node extends EventTarget {
    attributes = new Map();
    volumeLevel = 1;
    muted = false;
    currentTime = 0;
    scrollHeight = 0;
    clientHeight = 0;
    get volume() { return deviceVolume ? 1 : this.volumeLevel; }
    set volume(value) { if (!deviceVolume) this.volumeLevel = value; }
    canPlayType() { return 'probably'; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    getAttribute(name) { return this.attributes.get(name); }
    toggleAttribute() {}
    get firstElementChild() { return this; }
    dataset = {};
    focus() { document.activeElement = this; }
    contains(node) { return node === this; }
  }
  const nodes = new Map();
  const element = id => {
    if (!nodes.has(id)) nodes.set(id, new Node());
    return nodes.get(id);
  };
  const document = Object.assign(new EventTarget(), { getElementById: element });
  const media = Object.assign(new EventTarget(), { matches: true });
  let saved = JSON.stringify({ stationId: null, volume: 0.32, muted: false });
  const storage = {
    getItem: () => saved,
    setItem(key, value) { assert.equal(key, STORAGE_KEY); saved = value; },
  };
  replace('document', document);
  replace('window', Object.assign(new EventTarget(), { localStorage: storage, matchMedia: () => media }));
  replace('navigator', {});
  replace('Audio', Node);
  replace('ResizeObserver', class { observe() {} });
  replace('fetch', async () => ({ ok: true, json: async () => ({ stations: [] }) }));
  await import(`../src/app.js?device-volume=${deviceVolume}`);
  await new Promise(resolve => setImmediate(resolve));
  return { element, document, saved: () => JSON.parse(saved) };
}

test('unsupported volume UI is hidden while mute and saved preferences remain available', async t => {
  const { element, document, saved } = await loadApp(t, true);
  assert.equal(element('volume-control').hidden, true);
  assert.equal(element('volume').disabled, true);
  assert.equal(element('volume-panel').hidden, true);
  element('volume-toggle').dispatchEvent(new Event('click'));
  assert.equal(element('volume-panel').hidden, true);
  assert.equal(element('volume-toggle').getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement, undefined);
  element('mute-toggle').dispatchEvent(new Event('click'));
  assert.equal(element('radio-audio').muted, true);
  assert.equal(saved().muted, true);
  element('mute-toggle').dispatchEvent(new Event('click'));
  assert.equal(element('radio-audio').muted, false);
  assert.equal(saved().volume, 0.32);
});

test('writable volume UI keeps the slider, applies changes, and unmutes', async t => {
  const { element, document, saved } = await loadApp(t, false);
  assert.equal(element('volume-control').hidden, false);
  assert.equal(element('radio-audio').volume, 0.32);
  element('volume-toggle').dispatchEvent(new Event('click'));
  assert.equal(document.activeElement, element('volume'));
  const escape = new Event('keydown');
  Object.defineProperty(escape, 'key', { value: 'Escape' });
  element('volume-control').dispatchEvent(escape);
  assert.equal(element('volume-panel').hidden, true);
  assert.equal(document.activeElement, element('volume-toggle'));
  element('mute-toggle').dispatchEvent(new Event('click'));
  element('volume').value = '15';
  element('volume').dispatchEvent(new Event('input'));
  assert.equal(element('radio-audio').volume, 0.15);
  assert.equal(element('radio-audio').muted, false);
  assert.equal(element('volume-value').value, '15%');
  assert.equal(saved().volume, 0.15);
});
