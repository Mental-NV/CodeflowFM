import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeSilences, parseOptions, parseTimestamp, preparePlan, probe } from '../tools/remove-silence.mjs';
import { timestamp } from '../tools/detect-silence.mjs';

const exec = promisify(execFile);
const cli = fileURLToPath(new URL('../tools/remove-silence.mjs', import.meta.url));

test('removal CLI previews by default and validates flags', () => {
  assert.equal(parseOptions(['report.json']).apply, false);
  assert.equal(parseOptions(['report.json', '--apply']).apply, true);
  assert.equal(parseOptions(['--help']).help, true);
  for (const args of [[], ['a', 'b'], ['a', '--unknown'], ['a', '--ffmpeg', '']]) assert.throws(() => parseOptions(args));
});

test('timestamps are parsed with millisecond precision and validated', () => {
  assert.equal(parseTimestamp('00:10:15.123'), 615.123);
  assert.equal(parseTimestamp('123:59:59.999'), 446399.999);
  for (const value of [null, 15, '', '0:00:01.000', '00:60:00.000', '00:00:60.000',
    '00:00:01', '00:00:01.1', '-01:00:00.000', '00:00:01.000\n', '9999999999999:00:00.000']) {
    assert.throws(() => parseTimestamp(value));
  }
});

test('silence intervals use timestamps, ignore numeric fields, and merge overlaps', () => {
  assert.deepEqual(mergeSilences([
    { startTime: '00:00:05.000', endTime: '00:00:08.000', startSec: 100, endSec: 200 },
    { startTime: '00:00:01.000', endTime: '00:00:03.000' },
    { startTime: '00:00:02.000', endTime: '00:00:04.000' },
    { startTime: '00:00:04.000', endTime: '00:00:05.000' },
  ]), [{ startSec: 1, endSec: 8 }]);
  for (const input of [null, [null], [{}], [{ startSec: 1, endSec: 2 }],
    [{ startTime: '00:00:01.000', endTime: '00:00:01.000' }],
    [{ startTime: '00:00:02.000', endTime: '00:00:01.000' }]]) {
    assert.throws(() => mergeSilences(input));
  }
});

test('CLI removes silence from CBR and VBR MP3s, preserving frames, metadata, artwork, and backups', async (t) => {
  try { await exec('ffmpeg', ['-version']); await exec('ffprobe', ['-version']); }
  catch { t.skip('FFmpeg and FFprobe are required for audio integration tests.'); return; }
  const dir = await mkdtemp(path.join(tmpdir(), 'remove-silence-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const cover = path.join(dir, 'cover.png');
  await exec('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=red:s=16x16', '-frames:v', '1', cover]);
  const packets = async (file, stream = 'a:0') => JSON.parse((await exec('ffprobe', [
    '-v', 'error', '-select_streams', stream, '-show_packets', '-show_data_hash', 'sha256',
    '-show_entries', 'packet=data_hash', '-of', 'json', file,
  ])).stdout).packets.map((packet) => packet.data_hash);

  for (const mode of ['cbr', 'vbr']) {
    const file = path.join(dir, `Трек with 'quote' ${mode}.MP3`);
    await exec('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i',
      "aevalsrc='if(lt(t,1)+between(t,3,5)+between(t,8,10)+gte(t,11),0,0.5*sin(2*PI*440*t))':s=48000:d=12",
      '-i', cover, '-map', '0:a', '-map', '1:v', '-c:a', 'libmp3lame',
      ...(mode === 'cbr' ? ['-b:a', '192k'] : ['-q:a', '2']), '-ac', '2',
      '-c:v', 'copy', '-disposition:v', 'attached_pic', '-metadata', 'title=Keep this title', file]);
    const original = await readFile(file);
    const before = await probe(file);
    const hashesBefore = await packets(file);
    const reportFile = path.join(dir, `${mode}.json`);
    const entry = { file: path.basename(file), silences: [
      { startTime: '00:00:00.000', endTime: '00:00:01.000' },
      { startTime: '00:00:03.000', endTime: '00:00:05.000' },
      { startTime: '00:00:08.000', endTime: '00:00:10.000' },
      { startTime: '00:00:11.000', endTime: '00:00:12.000' },
    ] };
    if (mode === 'vbr') {
      const detector = fileURLToPath(new URL('../tools/detect-silence.mjs', import.meta.url));
      const detected = JSON.parse((await exec(process.execPath, [detector, dir, '--min-duration', '0.2'])).stdout);
      entry.silences = detected.files.find((result) => result.file === file).silences;
      assert.equal(entry.silences.length, 4);
    }
    const report = { files: [entry], errors: [] };
    await writeFile(reportFile, JSON.stringify(report));
    const preview = await exec(process.execPath, [cli, reportFile]);
    assert.match(preview.stdout, /Preview only/);
    assert.deepEqual(await readFile(file), original);
    assert.equal((await readdir(dir)).some((name) => name.endsWith('.bak')), mode === 'vbr');
    await assert.rejects(preparePlan({ files: [entry, entry] }, reportFile), /Duplicate/);
    await assert.rejects(preparePlan({ files: [{ ...entry, silences: [{ startTime: '00:00:00.000', endTime: '00:16:39.000' }] }] }, reportFile), /outside/);
    await assert.rejects(preparePlan({ files: [{ ...entry, silences: [{ startTime: '00:00:00.000', endTime: timestamp(before.duration) }] }] }, reportFile), /entire/);
    await assert.rejects(exec(process.execPath, [cli, reportFile, '--apply', '--ffmpeg', 'missing-ffmpeg-removal-test']), /executable not found/);
    assert.deepEqual(await readFile(file), original, 'a failed FFmpeg launch must leave the source intact');
    assert.equal((await readdir(dir)).some((name) => name.startsWith('.remove-silence-')), false);

    const applied = await exec(process.execPath, [cli, reportFile, '--apply']);
    assert.match(applied.stdout, /Updated/);
    assert.deepEqual(await readFile(`${file}.bak`), original);
    const after = await probe(file);
    assert.ok(Math.abs(after.duration - (before.duration - 6)) < 0.2);
    assert.equal(after.audio.sample_rate, before.audio.sample_rate);
    assert.equal(after.audio.channels, before.audio.channels);
    if (mode === 'cbr') assert.equal(after.audio.bit_rate, before.audio.bit_rate);
    assert.equal(after.data.format.tags.title, 'Keep this title');
    assert.deepEqual(await packets(file, 'v:0'), await packets(`${file}.bak`, 'v:0'));
    const hashesAfter = await packets(file);
    assert.ok(hashesAfter.length < hashesBefore.length * 0.6);
    let cursor = 0;
    for (const hash of hashesAfter) {
      while (cursor < hashesBefore.length && hashesBefore[cursor] !== hash) cursor++;
      assert.ok(cursor < hashesBefore.length, 'retained encoded frames must remain byte-identical and ordered');
      cursor++;
    }
    // Rescan decoded audio to establish that the reported long gaps are gone.
    const decoded = await exec('ffmpeg', ['-hide_banner', '-nostdin', '-i', file, '-af', 'silencedetect=n=-50dB:d=0.2', '-f', 'null', '-']);
    assert.doesNotMatch(decoded.stderr, /silence_start:/);
    const edited = await readFile(file);
    await assert.rejects(exec(process.execPath, [cli, reportFile, '--apply']), /Backup already exists/);
    assert.deepEqual(await readFile(file), edited);
    assert.deepEqual(await readFile(`${file}.bak`), original);
  }
});
