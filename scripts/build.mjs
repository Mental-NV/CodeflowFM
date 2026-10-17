import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { prepareStation } from '../src/radio.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(await readFile(join(root, 'assets/stations.json'), 'utf8'));
if (!Array.isArray(catalog.stations) || !catalog.stations.length) throw new Error('No stations configured');
const ids = new Set();
for (const entry of catalog.stations) {
  if (ids.has(entry.id)) throw new Error(`Duplicate station: ${entry.id}`);
  ids.add(entry.id);
  const playlist = JSON.parse(await readFile(join(root, entry.playlist), 'utf8'));
  prepareStation(entry, playlist);
}
await mkdir(join(root, 'dist'), { recursive: true });
for (const item of ['index.html', 'src', 'assets']) {
  await cp(join(root, item), join(root, 'dist', item), { recursive: true });
}
// A static host serves these files directly; no Node process runs in production.
await writeFile(join(root, 'dist', '.nojekyll'), '');
console.log(`Built dist/ with ${catalog.stations.length} station(s). Upload its contents to any static host.`);
