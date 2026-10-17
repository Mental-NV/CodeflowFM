import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseOptions, findMp3Files, scanPcm, retainPcm } from '../tools/clean-mp3-silence.mjs';

const exec = promisify(execFile);
const cli = fileURLToPath(new URL('../tools/clean-mp3-silence.mjs', import.meta.url));
const audio = { sampleRate: 10, channels: 2 };
function pcm(frames) {
  const result = Buffer.alloc(frames.flat().length * 4);
  frames.flat().forEach((value, index) => result.writeFloatLE(value, index * 4));
  return result;
}
async function collect(chunks) {
  const buffers = [];
  for await (const chunk of chunks) buffers.push(chunk);
  return Buffer.concat(buffers);
}

test('CLI defaults to processing and validates options', () => {
  assert.equal(parseOptions(['music']).dryrun, false);
  assert.equal(parseOptions(['music']).minDuration, 0);
  assert.equal(parseOptions(['music', '--dryrun']).dryrun, true);
  assert.equal(parseOptions(['--help']).help, true);
  assert.equal(parseOptions(['music', '--min-duration', '0.1']).minDuration, 0.1);
  for (const args of [[], ['a', 'b'], ['a', '--unknown'], ['a', '--output'], ['a', '--output', 'song.mp3'],
    ['a', '--min-duration', '-1'], ['a', '--min-duration', 'NaN'], ['a', '--ffmpeg', '']]) assert.throws(() => parseOptions(args));
});

test('exact zeros in every channel, including signed zero, with arbitrary byte boundaries', async () => {
  const frames = [[0, -0], [0, 0], [0, 1e-30], [1e-30, 0], [0, 0], [-0, 0], [0.5, -0.5], [0, 0]];
  const data = pcm(frames);
  const chunks = [data.subarray(0, 3), data.subarray(3, 25), data.subarray(25, 43), data.subarray(43)];
  const scan = await scanPcm(chunks, audio);
  assert.deepEqual(scan.silences.map(({ startFrame, endFrame }) => [startFrame, endFrame]), [[0, 2], [4, 6], [7, 8]]);
  assert.equal(scan.totalFrames, 8);
  assert.equal(scan.removedFrames, 5);
  assert.deepEqual(await collect(retainPcm(chunks, scan)), pcm([frames[2], frames[3], frames[6]]));
  const limited = await scanPcm(chunks, audio, 0.2);
  assert.equal(limited.silences.length, 2);
  assert.deepEqual(await collect(retainPcm(chunks, limited)), pcm([frames[2], frames[3], frames[6], frames[7]]));
  assert.equal((await scanPcm([pcm([[0, 0]])], audio)).removedFrames, 1);
  await assert.rejects(scanPcm([Buffer.alloc(7)], audio), /incomplete/);
  await assert.rejects(scanPcm([], audio), /No audio/);
  await assert.rejects(scanPcm([pcm([[NaN, 0]])], audio), /non-finite/);
  await assert.rejects(collect(retainPcm([data.subarray(0, 56)], scan)), /count changed/);
});

test('discovery ignores generated outputs, temporary folders, and non-MP3s', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'clean-discovery-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'nested'));
  await mkdir(path.join(dir, '.clean-mp3-interrupted'));
  for (const name of ['Song.MP3', 'Song.cleaned.MP3', 'not.wav', 'nested/two.mp3', '.clean-mp3-interrupted/audio.mp3']) {
    await writeFile(path.join(dir, name), '');
  }
  assert.equal((await findMp3Files(dir)).length, 1);
  assert.equal((await findMp3Files(dir, true)).length, 2);
});

test('real MP3 dry run, removal, metadata/artwork, collisions, and decoding failures', async (t) => {
  try { await exec('ffmpeg', ['-version']); await exec('ffprobe', ['-version']); }
  catch { t.skip('FFmpeg and FFprobe are required for this integration test'); return; }
  const dir = await mkdtemp(path.join(tmpdir(), 'clean-audio-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const music = path.join(dir, 'music');
  await mkdir(music);
  const cover = path.join(dir, 'cover.png');
  await exec('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=blue:s=16x16', '-frames:v', '1', cover]);
  const source = path.join(music, "Трек with 'quotes'.MP3");
  await exec('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i',
    "aevalsrc='if(lt(t,1)+between(t,2,3)+gte(t,4),0,0.4*cos(2*PI*440*t))':s=44100:d=5",
    '-i', cover, '-map', '0:a', '-map', '1:v', '-c:a', 'libmp3lame', '-q:a', '2', '-ac', '2',
    '-c:v', 'copy', '-disposition:v', 'attached_pic', '-metadata', 'title=Keep title', source]);
  await exec('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono:d=1',
    '-c:a', 'libmp3lame', path.join(music, 'all silent.mp3')]);
  await exec('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=1',
    '-c:a', 'libmp3lame', path.join(music, 'continuous.mp3')]);
  const original = await readFile(source);
  const before = await stat(source);
  const originalListing = await readdir(music);
  const args = [cli, music, '--min-duration', '0.1'];
  const dry = JSON.parse((await exec(process.execPath, [...args, '--dryrun'])).stdout);
  assert.deepEqual(await readdir(music), originalListing, 'dry run must not write audio or temporary files');
  const entry = dry.files.find((file) => file.file === source);
  assert.equal(entry.status, 'would_create');
  assert.equal(entry.silences.length, 3);
  assert.ok(entry.removedDurationSec > 2.7 && entry.removedDurationSec < 3);
  assert.equal(dry.summary.allSilentFiles, 1);
  assert.equal(dry.summary.unchangedFiles, 1);
  assert.equal(dry.summary.wouldCreateFiles, 1);

  const reportPath = path.join(dir, 'report.json');
  const applied = await exec(process.execPath, [...args, '--output', reportPath]);
  assert.equal(applied.stdout, '');
  const reportText = await readFile(reportPath, 'utf8');
  const report = JSON.parse(reportText);
  assert.equal(report.summary.createdFiles, 1);
  const output = report.files.find((file) => file.file === source).output;
  assert.equal(output, path.join(music, "Трек with 'quotes'.cleaned.MP3"));
  assert.deepEqual(await readFile(source), original);
  assert.equal((await stat(source)).mtimeMs, before.mtimeMs);
  const probe = JSON.parse((await exec('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', output])).stdout);
  assert.equal(probe.format.tags.title, 'Keep title');
  assert.equal(probe.streams[0].sample_rate, '44100');
  assert.equal(probe.streams[0].channels, 2);
  const picture = async (file) => (await exec('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-c', 'copy', '-f', 'image2pipe', '-'], { encoding: 'buffer' })).stdout;
  assert.deepEqual(await picture(output), await picture(source));
  const decoded = (await exec('ffmpeg', ['-v', 'error', '-i', output, '-map', '0:a:0', '-c:a', 'pcm_f32le', '-f', 'f32le', '-'], { encoding: 'buffer' })).stdout;
  assert.equal(decoded.length / 8, entry.totalFrames - entry.removedFrames);
  const rescanned = await scanPcm([decoded], { sampleRate: 44100, channels: 2 }, 0.1);
  assert.deepEqual(rescanned.silences, []);
  const outputBefore = await readFile(output);
  await assert.rejects(exec(process.execPath, args), (error) => {
    const collision = JSON.parse(error.stdout);
    assert.equal(collision.summary.totalFiles, 3, 'generated outputs are excluded');
    assert.equal(collision.summary.failedFiles, 1);
    assert.match(collision.files.find((file) => file.file === source).error, /already exists/);
    return true;
  });
  assert.deepEqual(await readFile(output), outputBefore);
  await assert.rejects(exec(process.execPath, [...args, '--output', reportPath]), /EEXIST/);
  assert.equal(await readFile(reportPath, 'utf8'), reportText);

  await writeFile(path.join(music, 'broken.mp3'), 'not an MP3');
  await assert.rejects(exec(process.execPath, [...args, '--dryrun']), (error) => {
    const failure = JSON.parse(error.stdout);
    assert.equal(failure.summary.failedFiles, 2);
    assert.equal(failure.files.find((file) => file.file.endsWith('broken.mp3')).status, 'error');
    return true;
  });
  await assert.rejects(exec(process.execPath, [...args, '--ffmpeg', 'missing-ffmpeg-for-clean-test']), /Cannot start/);
  assert.equal((await readdir(music)).some((name) => name.startsWith('.clean-mp3-')), false);
  assert.deepEqual(await readFile(source), original);
});
