#!/usr/bin/env node
// Exact-zero silence removal. No third-party Node dependencies.
import { spawn } from 'node:child_process';
import { lstat, readdir, mkdtemp, link, rm, open } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HELP = `Remove absolute silence from MP3s without changing originals.

Usage: node tools/clean-mp3-silence.mjs <folder> [options]
  --dryrun                 Scan and report; do not write audio
  --output <report.json>   Save JSON to a NEW file (default: stdout)
  --recursive              Include subdirectories
  --min-duration <seconds> Only remove zero runs this long (default: 0, every run)
  --ffmpeg <executable>    FFmpeg path (default: ffmpeg)
  --ffprobe <executable>   FFprobe path (default: ffprobe)
  --help                   Show this help

Changed tracks are written as <name>.cleaned.mp3 beside their originals.
Existing outputs are never overwritten. See tools/clean-mp3-silence.md.
`;

export function parseOptions(args) {
  const options = { dryrun: false, recursive: false, minDuration: 0, ffmpeg: 'ffmpeg', ffprobe: 'ffprobe' };
  const values = { '--output': 'output', '--min-duration': 'minDuration', '--ffmpeg': 'ffmpeg', '--ffprobe': 'ffprobe' };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') options.help = true;
    else if (arg === '--dryrun') options.dryrun = true;
    else if (arg === '--recursive') options.recursive = true;
    else if (Object.hasOwn(values, arg)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      options[values[arg]] = value;
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else if (options.folder) throw new Error('Specify exactly one folder');
    else options.folder = path.resolve(arg);
  }
  if (options.help) return options;
  if (!options.folder) throw new Error('An input folder is required; use --help');
  options.minDuration = Number(options.minDuration);
  if (!Number.isFinite(options.minDuration) || options.minDuration < 0) throw new Error('--min-duration must be a finite nonnegative number');
  if (options.output) {
    options.output = path.resolve(options.output);
    if (path.extname(options.output).toLowerCase() !== '.json') throw new Error('--output must have a .json extension');
  }
  return options;
}

export async function findMp3Files(folder, recursive = false) {
  const files = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory() && recursive && !entry.name.startsWith('.clean-mp3-')) {
      files.push(...await findMp3Files(file, true));
    } else if (entry.isFile() && /\.mp3$/i.test(entry.name) && !/\.cleaned\.mp3$/i.test(entry.name)) files.push(file);
  }
  return files.sort();
}

function command(executable, args, input = false) {
  const child = spawn(executable, args, { windowsHide: true, stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (data) => { stderr = (stderr + data).slice(-8192); });
  const done = new Promise((resolve, reject) => {
    child.once('error', (error) => reject(new Error(`Cannot start ${executable}: ${error.message}`)));
    child.once('close', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${executable} failed (${signal || code}): ${stderr.trim()}`));
    });
  });
  // The process may fail while its output is still being consumed.
  done.catch(() => {});
  return { child, done };
}

async function capture(executable, args) {
  const proc = command(executable, args);
  let result = '';
  for await (const chunk of proc.child.stdout) result += chunk.toString('utf8');
  await proc.done;
  return result;
}

async function probe(file, options) {
  const data = JSON.parse(await capture(options.ffprobe, ['-v', 'error', '-select_streams', 'a:0',
    '-show_entries', 'stream=codec_name,sample_rate,channels', '-of', 'json', file]));
  const audio = data.streams?.[0];
  const sampleRate = Number(audio?.sample_rate);
  const channels = Number(audio?.channels);
  if (audio?.codec_name !== 'mp3' || !Number.isInteger(sampleRate) || sampleRate <= 0 || ![1, 2].includes(channels)) {
    throw new Error('Expected an MP3 audio stream with a valid sample rate and one or two channels');
  }
  return { sampleRate, channels };
}

// Preserve float precision: converting to integer PCM would misclassify quiet audio as zero.
async function* decode(file, options) {
  const proc = command(options.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-xerror',
    '-err_detect', 'explode', '-c:a', 'mp3float', '-i', file, '-map', '0:a:0',
    '-c:a', 'pcm_f32le', '-f', 'f32le', 'pipe:1']);
  try {
    yield* proc.child.stdout;
    await proc.done;
  } catch (error) {
    proc.child.kill();
    // Prefer a useful decoder error over a secondary pipe error.
    await proc.done;
    throw error;
  } finally {
    if (proc.child.exitCode === null) proc.child.kill();
    await proc.done.catch(() => {});
  }
}

async function* alignedFrames(chunks, frameBytes) {
  let pending = Buffer.alloc(0);
  for await (const chunk of chunks) {
    const data = pending.length ? Buffer.concat([pending, chunk]) : chunk;
    const end = data.length - data.length % frameBytes;
    if (end) yield data.subarray(0, end);
    pending = Buffer.from(data.subarray(end));
  }
  if (pending.length) throw new Error('Decoded PCM ended with an incomplete sample frame');
}

export async function scanPcm(chunks, { sampleRate, channels }, minDuration = 0) {
  const frameBytes = channels * 4;
  const minimum = Math.max(1, Math.ceil(minDuration * sampleRate));
  const silences = [];
  let totalFrames = 0;
  let start = null;
  const finish = () => {
    if (start !== null && totalFrames - start >= minimum) {
      silences.push({ startFrame: start, endFrame: totalFrames, startSec: start / sampleRate,
        endSec: totalFrames / sampleRate, durationSec: (totalFrames - start) / sampleRate });
    }
    start = null;
  };
  for await (const data of alignedFrames(chunks, frameBytes)) {
    for (let offset = 0; offset < data.length; offset += frameBytes) {
      let silent = true;
      for (let channel = 0; channel < channels; channel++) {
        const value = data.readFloatLE(offset + channel * 4);
        if (!Number.isFinite(value)) throw new Error('Decoded PCM contains non-finite samples');
        if (value !== 0) silent = false;
      }
      if (silent) { if (start === null) start = totalFrames; }
      else finish();
      totalFrames++;
    }
  }
  finish();
  if (!totalFrames) throw new Error('No audio samples decoded');
  const removedFrames = silences.reduce((sum, item) => sum + item.endFrame - item.startFrame, 0);
  return { ...{ sampleRate, channels }, totalFrames, durationSec: totalFrames / sampleRate,
    removedFrames, removedDurationSec: removedFrames / sampleRate,
    retainedDurationSec: (totalFrames - removedFrames) / sampleRate, silences };
}

// Slice by sample index, not rounded timestamps or compressed MP3 frame boundaries.
export async function* retainPcm(chunks, scan) {
  const frameBytes = scan.channels * 4;
  let position = 0;
  let interval = 0;
  for await (const data of alignedFrames(chunks, frameBytes)) {
    const end = position + data.length / frameBytes;
    let cursor = position;
    while (cursor < end) {
      const silence = scan.silences[interval];
      if (!silence || silence.startFrame >= end) {
        yield data.subarray((cursor - position) * frameBytes);
        break;
      }
      if (cursor < silence.startFrame) yield data.subarray((cursor - position) * frameBytes, (silence.startFrame - position) * frameBytes);
      cursor = Math.min(end, silence.endFrame);
      if (cursor === silence.endFrame) interval++;
    }
    position = end;
  }
  if (position !== scan.totalFrames) throw new Error('Decoded sample count changed between scan and removal');
}

async function sourceUnchanged(file, before) {
  const after = await lstat(file);
  if (!after.isFile() || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs || after.ino !== before.ino) {
    throw new Error('Source changed during processing; no cleaned output was published');
  }
}

async function ensureAbsent(file) {
  try { await lstat(file); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  throw new Error(`Output already exists: ${file}`);
}

async function writeCleaned(file, output, scan, options, before) {
  const temporary = await mkdtemp(path.join(path.dirname(file), '.clean-mp3-'));
  const staged = path.join(temporary, 'audio.mp3');
  try {
    const encoder = command(options.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-xerror', '-n',
      '-f', 'f32le', '-ar', String(scan.sampleRate), '-ac', String(scan.channels), '-i', 'pipe:0', '-i', file,
      '-map', '0:a:0', '-map', '1:v?', '-map_metadata', '1', '-map_chapters', '-1',
      '-c:a', 'libmp3lame', '-q:a', '2', '-c:v', 'copy', '-id3v2_version', '3', staged], true);
    encoder.child.stdout.resume();
    const tasks = [pipeline(retainPcm(decode(file, options), scan), encoder.child.stdin), encoder.done];
    try {
      await Promise.all(tasks);
    } catch (error) {
      encoder.child.kill();
      await Promise.allSettled(tasks);
      throw error;
    }
    await sourceUnchanged(file, before);
    // Hard-link publication is atomic and fails if the target exists, including symlinks.
    await link(staged, output);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export async function run(options) {
  const files = await findMp3Files(options.folder, options.recursive);
  await capture(options.ffmpeg, ['-version']);
  await capture(options.ffprobe, ['-version']);
  // Reserve the report exclusively before doing any audio work.
  const reportHandle = options.output ? await open(options.output, 'wx') : null;
  try {
    const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), folder: options.folder,
      dryrun: options.dryrun, detection: { sampleFormat: 'f32le', threshold: 0, allChannels: true, minDurationSec: options.minDuration },
      files: [], summary: { totalFiles: files.length, scannedFiles: 0, filesWithSilence: 0, silentSections: 0,
        silentDurationSec: 0, createdFiles: 0, wouldCreateFiles: 0, unchangedFiles: 0, allSilentFiles: 0, failedFiles: 0 } };
    for (const [index, file] of files.entries()) {
      process.stderr.write(`[${index + 1}/${files.length}] ${file}\n`);
      const parsed = path.parse(file);
      const output = path.join(parsed.dir, `${parsed.name}.cleaned${parsed.ext}`);
      const entry = { file, output, status: 'error' };
      try {
        const before = await lstat(file);
        if (!before.isFile()) throw new Error('Input is no longer a regular file');
        const audio = await probe(file, options);
        const scan = await scanPcm(decode(file, options), audio, options.minDuration);
        await sourceUnchanged(file, before);
        Object.assign(entry, scan);
        report.summary.scannedFiles++;
        report.summary.silentSections += scan.silences.length;
        report.summary.silentDurationSec += scan.removedDurationSec;
        if (scan.silences.length) report.summary.filesWithSilence++;
        if (!scan.silences.length) {
          entry.status = 'unchanged';
          report.summary.unchangedFiles++;
        } else if (scan.removedFrames === scan.totalFrames) {
          entry.status = 'all_silent';
          entry.reason = 'No audio would remain; an empty MP3 was not created';
          report.summary.allSilentFiles++;
        } else {
          await ensureAbsent(output);
          if (options.dryrun) {
            entry.status = 'would_create';
            report.summary.wouldCreateFiles++;
          } else {
            await writeCleaned(file, output, scan, options, before);
            entry.status = 'created';
            report.summary.createdFiles++;
          }
        }
      } catch (error) {
        entry.status = 'error';
        entry.error = error.message;
        report.summary.failedFiles++;
        process.stderr.write(`  Error: ${error.message}\n`);
      }
      report.files.push(entry);
    }
    const json = `${JSON.stringify(report, null, 2)}\n`;
    if (reportHandle) {
      await reportHandle.writeFile(json, 'utf8');
      process.stderr.write(`Report saved: ${options.output}\n`);
    } else process.stdout.write(json);
    return report.summary.failedFiles ? 1 : 0;
  } finally {
    await reportHandle?.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseOptions(process.argv.slice(2));
    if (options.help) process.stdout.write(HELP);
    else process.exitCode = await run(options);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
