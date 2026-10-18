import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
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

test('playlist builder resolves absolute, relative, and home directory paths', async (t) => {
  const formats = [
    ['absolute', (input) => input],
    ['absolute with backslashes', (input) => input.replaceAll('/', '\\')],
    ['relative', (input, home) => relative(home, input)],
    ['home with forward slashes', () => '~/Projects/Yt-Download/lofi-beats'],
    ['home with backslashes', () => '~\\Projects\\Yt-Download\\lofi-beats'],
  ];
  for (const [name, format] of formats) {
    await t.test(name, async () => {
      // macOS resolves /var through /private/var when starting the child process.
      const directory = await realpath(await mkdtemp(join(tmpdir(), 'codeflow-playlist-paths-')));
      try {
        const home = join(directory, 'home');
        const input = join(home, 'Projects', 'Yt-Download', 'lofi-beats');
        const output = join(home, 'Prepared Audio');
        await mkdir(input, { recursive: true });
        await writeFile(join(input, 'A.mp3'), 'mp3 bytes');
        await promisify(execFile)(process.execPath, [
          fileURLToPath(new URL('../tools/build-playlist.mjs', import.meta.url)),
          '--dir', format(input, home), '--out', '~\\Prepared Audio', '--mode', 'copy',
        ], {
          cwd: home,
          env: { ...process.env, HOME: home, USERPROFILE: home },
        });
        const playlist = JSON.parse(await readFile(join(output, 'playlist.json'), 'utf8'));
        assert.equal(playlist.tracks.length, 1);
        assert.equal(await readFile(join(output, playlist.tracks[0].filename), 'utf8'), 'mp3 bytes');
        assert.equal(await readFile(join(input, 'A.mp3'), 'utf8'), 'mp3 bytes');
        const [mapping] = JSON.parse(await readFile(join(output, 'rename-map.json'), 'utf8'));
        assert.equal(mapping.from, join(input, 'A.mp3'));
        assert.equal(mapping.to, join(output, playlist.tracks[0].filename));
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
});

test('invalid playlist arguments fail before creating outputs or changing audio', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'codeflow-playlist-invalid-'));
  try {
    const input = join(directory, 'input');
    const output = join(directory, 'output');
    const source = join(input, 'A.mp3');
    await mkdir(input);
    await writeFile(source, 'original bytes');
    const valid = ['--dir', input, '--out', output];
    const cases = [
      ['unknown option', [...valid, '--dryrun'], /Unknown option: --dryrun/],
      ['prototype option', [...valid, '--__proto__', 'x'], /Unknown option/],
      ['positional argument', [...valid, 'extra'], /Unexpected argument: extra/],
      ['short option', [...valid, '-r'], /Unexpected argument: -r/],
      ['equals syntax', [`--dir=${input}`], /Unknown option/],
      ['duplicate option', [...valid, '--dir', input], /Duplicate option: --dir/],
      ['duplicate flag', [...valid, '--dryRun', '--dryRun'], /Duplicate option: --dryRun/],
      ['missing required dir', [], /Missing --dir/],
      ['invalid mode', [...valid, '--mode', 'move'], /Invalid --mode/],
      ['missing input directory', ['--dir', join(directory, 'missing'), '--out', output], /Invalid --dir/],
      ['file input', ['--dir', source, '--out', output], /Invalid --dir/],
      ['file output', ['--dir', input, '--out', source], /Invalid --out/],
      ['file output parent', ['--dir', input, '--out', join(source, 'child')], /Invalid --out/],
    ];
    for (const option of ['dir', 'out', 'mode', 'baseUrl', 'stationId', 'stationName']) {
      const prefix = option === 'dir' ? [] : valid;
      // Avoid duplicates so the test reaches value validation.
      const base = option === 'out' ? ['--dir', input] : prefix;
      cases.push(
        [`missing ${option}`, [...base, `--${option}`], new RegExp(`Missing value for --${option}`)],
        [`empty ${option}`, [...base, `--${option}`, ''], /Invalid empty/],
        [`blank ${option}`, [...base, `--${option}`, '   '], /Invalid empty/],
      );
    }
    cases.push(['missing value before option', ['--dir', '--out', output], /Missing value for --dir/]);
    for (const option of ['recursive', 'dryRun']) {
      cases.push([`invalid ${option}`, [...valid, `--${option}`, 'flase'], new RegExp(`Invalid value for --${option}`)]);
    }
    for (const url of ['not-a-url', '/relative', 'ftp://example.com/audio', 'https://', 'https://example.com/a b', 'https://example.com/audio?x=1', 'https://example.com/audio#part']) {
      cases.push([`invalid URL ${url}`, [...valid, '--baseUrl', url], /Invalid --baseUrl/]);
    }
    for (const [name, args, message] of cases) {
      await t.test(name, async () => {
        await assert.rejects(promisify(execFile)(process.execPath, [
          fileURLToPath(new URL('../tools/build-playlist.mjs', import.meta.url)), ...args,
        ]), (err) => {
          assert.equal(err.code, 2);
          assert.match(err.stderr, message);
          assert.equal(err.stdout, '');
          return true;
        });
        assert.deepEqual(await readdir(directory), ['input']);
        assert.deepEqual(await readdir(input), ['A.mp3']);
        assert.equal(await readFile(source, 'utf8'), 'original bytes');
      });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('playlist boolean flags accept bare flags and explicit true or false values', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'codeflow-playlist-flags-'));
  try {
    const input = join(directory, 'input');
    await mkdir(join(input, 'nested'), { recursive: true });
    await writeFile(join(input, 'A.mp3'), 'root bytes');
    await writeFile(join(input, 'nested', 'B.mp3'), 'nested bytes');
    for (const [index, value] of [undefined, 'TRUE', '1', 'yes', 'y', 'on', 'FALSE', '0', 'no', 'n', 'off'].entries()) {
      await t.test(value ?? 'bare flags', async () => {
        const enabled = index < 6;
        const output = join(directory, `output-${index}`);
        const args = ['--dir', input, '--out', output, '--mode', 'COPY', '--stationId', 'lofi', '--stationName', 'Lofi Beats'];
        for (const flag of ['recursive', 'dryRun']) {
          args.push(`--${flag}`);
          if (value !== undefined) args.push(value);
        }
        await promisify(execFile)(process.execPath, [
          fileURLToPath(new URL('../tools/build-playlist.mjs', import.meta.url)), ...args,
        ]);
        const playlist = JSON.parse(await readFile(join(output, 'playlist.json'), 'utf8'));
        assert.equal(playlist.tracks.length, enabled ? 2 : 1);
        assert.deepEqual(playlist.station, { id: 'lofi', name: 'Lofi Beats' });
        const outputFiles = await readdir(output);
        assert.equal(outputFiles.filter((file) => file.endsWith('.mp3')).length, enabled ? 0 : 1);
        assert.equal(await readFile(join(input, 'A.mp3'), 'utf8'), 'root bytes');
      });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
