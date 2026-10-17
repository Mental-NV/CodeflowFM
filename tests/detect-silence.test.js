import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSilenceParser, findMp3Files, parseOptions, timestamp } from '../tools/detect-silence.mjs';

const exec = promisify(execFile);
const cli = fileURLToPath(new URL('../tools/detect-silence.mjs', import.meta.url));

test('silence CLI validates arguments and accepts negative threshold values', () => {
  const options = parseOptions(['music', '--threshold=-60', '--min-duration', '2.5', '--recursive']);
  assert.equal(options.thresholdDb, -60);
  assert.equal(options.minDuration, 2.5);
  assert.equal(options.recursive, true);
  assert.equal(parseOptions(['--help']).help, true);
  for (const args of [[], ['a', 'b'], ['a', '--min-duration', '0'], ['a', '--min-duration', 'NaN'],
    ['a', '--threshold=1'], ['a', '--threshold='], ['a', '--format', 'csv'], ['a', '--unknown']]) {
    assert.throws(() => parseOptions(args));
  }
});

test('parser handles multiple intervals, scientific notation, and trailing silence', () => {
  const parser = createSilenceParser();
  parser.line('silence_start: 999'); // Not a detector message.
  parser.line('[silencedetect @ 000001] silence_start: 0');
  assert.equal(parser.incomplete, true);
  parser.line('[silencedetect @ 000001] silence_end: 2.5 | silence_duration: 2.5');
  parser.line('[silencedetect @ 000001] silence_start: 1e1');
  parser.line('[silencedetect @ 000001] silence_end: 12 | silence_duration: 2');
  assert.deepEqual(parser.silences, [
    { startSec: 0, endSec: 2.5, durationSec: 2.5 },
    { startSec: 10, endSec: 12, durationSec: 2 },
  ]);
  assert.equal(parser.incomplete, false);
  assert.equal(timestamp(3599.9996), '01:00:00.000');
});

test('file discovery handles uppercase extensions and optional recursion', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'silence-discovery-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'nested'));
  await writeFile(path.join(dir, 'TRACK.MP3'), '');
  await writeFile(path.join(dir, 'ignore.wav'), '');
  await writeFile(path.join(dir, 'nested', 'track.mp3'), '');
  assert.equal((await findMp3Files(dir, false)).length, 1);
  assert.equal((await findMp3Files(dir, true)).length, 2);
});

test('CLI scans real MP3 audio, reports decoding errors, and saves JSON', async (t) => {
  try { await exec('ffmpeg', ['-version']); }
  catch { t.skip('FFmpeg is required for the audio integration test.'); return; }
  const dir = await mkdtemp(path.join(tmpdir(), 'silence-audio-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const nested = path.join(dir, 'nested');
  await mkdir(nested);
  const encode = async (name, source) => {
    await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', source,
      '-c:a', 'libmp3lame', '-q:a', '2', path.join(nested, name)], { windowsHide: true });
  };
  await encode('Трек with gaps.MP3', "aevalsrc='if(between(t,1,3)+between(t,4,6),0,0.5*sin(2*PI*440*t))':s=44100:d=6");
  await encode('continuous.mp3', 'sine=frequency=440:duration=4');
  await encode('all silent.mp3', 'anullsrc=r=44100:cl=stereo:d=3');
  await encode('one active channel.mp3', 'aevalsrc=0|0.5*sin(2*PI*440*t):s=44100:d=3');
  await encode('leading.mp3', "aevalsrc='if(lt(t,2),0,0.5*sin(2*PI*440*t))':s=44100:d=3");
  await writeFile(path.join(nested, 'broken.mp3'), 'This is not audio');
  const output = path.join(dir, 'report.json');
  const args = [cli, dir, '--recursive', '--min-duration', '1', '--format', 'json', '--output', output];
  await assert.rejects(exec(process.execPath, args), (error) => {
    assert.equal(error.code, 1, 'a failed decode must produce a nonzero exit code');
    assert.match(error.stderr, /Report saved/);
    assert.equal(error.stdout, '');
    return true;
  });
  const report = JSON.parse(await readFile(output, 'utf8'));
  assert.deepEqual(report.summary, { totalFiles: 6, scannedFiles: 5, failedFiles: 1, filesWithSilence: 3, silentSections: 4 });
  const get = (name) => report.files.find((file) => path.basename(file.file) === name);
  assert.match(get('broken.mp3').error, /FFmpeg failed/);
  assert.deepEqual(get('continuous.mp3').silences, []);
  assert.deepEqual(get('one active channel.mp3').silences, [], 'a single silent channel is not a silent track');
  const gaps = get('Трек with gaps.MP3').silences;
  assert.equal(gaps.length, 2);
  for (const [actual, expected] of [[gaps[0].startSec, 1], [gaps[0].endSec, 3], [gaps[1].startSec, 4], [gaps[1].endSec, 6],
    [get('all silent.mp3').silences[0].startSec, 0], [get('all silent.mp3').silences[0].endSec, 3],
    [get('leading.mp3').silences[0].startSec, 0], [get('leading.mp3').silences[0].endSec, 2]]) {
    assert.ok(Math.abs(actual - expected) < 0.06, `expected ${expected}, received ${actual}`);
  }
  const before = await readFile(output, 'utf8');
  await assert.rejects(exec(process.execPath, args), /EEXIST/);
  assert.equal(await readFile(output, 'utf8'), before, 'existing reports must not be overwritten');
  const empty = JSON.parse((await exec(process.execPath, [cli, dir, '--format', 'json'])).stdout);
  assert.equal(empty.summary.totalFiles, 0, 'subdirectories are opt-in');
  await assert.rejects(exec(process.execPath, [cli, dir, '--output', path.join(nested, 'continuous.mp3')]), /must not have an .mp3/);
  await assert.rejects(exec(process.execPath, [cli, dir, '--ffmpeg', 'missing-ffmpeg-for-test']), /Cannot start FFmpeg/);
});
