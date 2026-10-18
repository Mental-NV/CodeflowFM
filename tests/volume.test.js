import test from 'node:test';
import assert from 'node:assert/strict';
import { hideVolumeControl, STORAGE_KEY } from '../src/radio.js';

const hiddenBrowsers = [
  { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1' },
  { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15' },
  { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/605.1.15' },
  { userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' },
  { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', platform: 'MacIntel', maxTouchPoints: 5 },
  { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 CriOS/130 Version/18.0 Safari/605.1.15' },
  { userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' },
  { userAgent: 'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0' },
  { userAgent: 'Mozilla/5.0 (Android 14; Tablet; rv:130.0) Gecko/130.0 Firefox/130.0' },
];

test('hardcoded mobile browser rules cover iOS Chrome, Firefox, and iPads plus Android Chrome/Firefox', () => {
  for (const browser of hiddenBrowsers) {
    assert.equal(hideVolumeControl(browser), true, browser.userAgent);
  }
});

test('desktop Chrome, Firefox, and Safari keep volume controls', () => {
  for (const userAgent of [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
  ]) {
    assert.equal(hideVolumeControl({ userAgent, platform: 'MacIntel', maxTouchPoints: 0 }), false);
  }
  assert.equal(hideVolumeControl(), false);
});

// Mobile stubs deliberately accept volume writes: browser identifiers must hide
// the control even when the previous capability probe would have succeeded.
async function loadApp(t, browser) {
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
    get volume() { return this.volumeLevel; }
    set volume(value) { this.volumeLevel = value; }
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
  replace('navigator', browser);
  replace('Audio', Node);
  replace('ResizeObserver', class { observe() {} });
  replace('fetch', async () => ({ ok: true, json: async () => ({ stations: [] }) }));
  await import(`../src/app.js?browser=${encodeURIComponent(JSON.stringify(browser))}`);
  await new Promise(resolve => setImmediate(resolve));
  return { element, document, saved: () => JSON.parse(saved) };
}

for (const browser of hiddenBrowsers) {
test(`mobile volume control stays hidden for ${browser.userAgent}`, async t => {
  const { element, document, saved } = await loadApp(t, browser);
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
}

test('writable volume UI keeps the slider, applies changes, and unmutes', async t => {
  const { element, document, saved } = await loadApp(t, { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36' });
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
