import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

test('playlist builder preserves WebM and MP3 files and emits the canonical schema', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'codeflow-playlist-'));
  try {
    const input = join(directory, 'input');
    const output = join(directory, 'output');
    await mkdir(input);
    // Naming and copying do not transcode or inspect the encoded audio.
    await writeFile(join(input, 'A.WEBM'), 'webm bytes');
    await writeFile(join(input, 'B.mp3'), 'mp3 bytes');
    await writeFile(join(input, 'ignore.webp'), 'image bytes');
    await promisify(execFile)(process.execPath, [
      fileURLToPath(new URL('../tools/build-playlist.mjs', import.meta.url)),
      '--dir', input, '--out', output, '--mode', 'copy', '--baseUrl', 'https://example.com/audio',
    ]);
    const playlist = JSON.parse(await readFile(join(output, 'playlist.json'), 'utf8'));
    assert.equal(playlist.tracks.length, 2);
    const [webm, mp3] = playlist.tracks;
    assert.equal(webm.mime, 'audio/webm; codecs=opus');
    assert.match(webm.filename, /\.webm$/);
    assert.equal(webm.url, `https://example.com/audio/${webm.filename}`);
    assert.equal(mp3.mime, 'audio/mpeg');
    assert.match(mp3.filename, /\.mp3$/);
    assert.equal(await readFile(join(output, webm.filename), 'utf8'), 'webm bytes');
    assert.equal(await readFile(join(input, 'A.WEBM'), 'utf8'), 'webm bytes');
    const generatedSchema = JSON.parse(await readFile(join(output, 'playlist.schema.json'), 'utf8'));
    const schema = JSON.parse(await readFile(new URL('../assets/playlist.schema.json', import.meta.url), 'utf8'));
    assert.deepEqual(generatedSchema, schema);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
