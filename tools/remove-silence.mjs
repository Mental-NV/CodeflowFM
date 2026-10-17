#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { chmod, copyFile, lstat, mkdtemp, readFile, realpath, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { timestamp } from './detect-silence.mjs';

const exec = promisify(execFile);
const HELP = `Usage: node tools/remove-silence.mjs <report.json> [options]

Remove the intervals listed by detect-silence.mjs from the original MP3 files.
Requires Node.js 22+, FFmpeg (noise bitstream filter), and FFprobe.
Default: preview only. Add --apply to replace originals, saving <file>.bak first.

Options:
  --apply                  Write updated MP3s in place with exclusive .bak backups
  --ffmpeg <executable>    FFmpeg executable or full path (default: ffmpeg)
  --ffprobe <executable>   FFprobe executable or full path (default: ffprobe)
  --help                  Show this help

Example:
  node tools/remove-silence.mjs silence-report.json
  node tools/remove-silence.mjs silence-report.json --apply

Copies encoded MP3 frames without re-encoding. Cuts follow frame boundaries.
CBR bitrate and retained VBR frames are preserved; VBR average bitrate may change.
Existing backups are never overwritten. Do not reuse a report after applying it.
Exit codes: 0 = success, 1 = validation or processing error.
`;

export function parseOptions(args) {
  const { values, positionals } = parseArgs({
    args, allowPositionals: true,
    options: {
      apply: { type: 'boolean', default: false },
      ffmpeg: { type: 'string', default: 'ffmpeg' },
      ffprobe: { type: 'string', default: 'ffprobe' },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) return { help: true };
  if (positionals.length !== 1) throw new Error('Specify one JSON report. Use --help for usage.');
  if (!values.ffmpeg.trim() || !values.ffprobe.trim()) throw new Error('Executable paths must not be empty.');
  return { ...values, report: path.resolve(positionals[0]) };
}

async function run(executable, args) {
  try {
    return (await exec(executable, args, { windowsHide: true, maxBuffer: 8 * 1024 * 1024 })).stdout;
  } catch (error) {
    throw new Error(`${executable}: ${error.code === 'ENOENT' ? 'executable not found' : (error.stderr || error.message).trim().slice(-4000)}`);
  }
}

export function parseTimestamp(value, field = 'timestamp') {
  const match = typeof value === 'string' && value.match(/^(\d{2,}):([0-5]\d):([0-5]\d)\.(\d{3})$/);
  if (!match || match[0] !== value) throw new Error(`${field} must be a timestamp in HH:MM:SS.mmm format.`);
  const milliseconds = Number(match[1]) * 3600000 + Number(match[2]) * 60000 + Number(match[3]) * 1000 + Number(match[4]);
  if (!Number.isSafeInteger(milliseconds)) throw new Error(`${field} is outside the supported timestamp range.`);
  return milliseconds / 1000;
}

export function mergeSilences(silences) {
  if (!Array.isArray(silences)) throw new Error('Every track must have a silences array.');
  const sorted = silences.map((part) => {
    const startSec = parseTimestamp(part?.startTime, 'startTime');
    const endSec = parseTimestamp(part?.endTime, 'endTime');
    if (endSec <= startSec) throw new Error('Silence intervals require startTime < endTime.');
    return { startSec, endSec };
  }).sort((a, b) => a.startSec - b.startSec);
  const merged = [];
  for (const part of sorted) {
    const previous = merged.at(-1);
    if (previous && part.startSec <= previous.endSec) previous.endSec = Math.max(previous.endSec, part.endSec);
    else merged.push(part);
  }
  return merged;
}

export async function probe(file, executable = 'ffprobe') {
  const data = JSON.parse(await run(executable, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file]));
  const audio = data.streams?.filter((stream) => stream.codec_type === 'audio') ?? [];
  const duration = Number(data.format?.duration);
  if (data.format?.format_name !== 'mp3' || audio.length !== 1 || audio[0].codec_name !== 'mp3'
    || !Number.isFinite(duration) || duration <= 0) throw new Error(`Not a supported, finite-duration MP3: ${file}`);
  if (data.streams.some((stream) => stream.codec_type !== 'audio' && !stream.disposition?.attached_pic)) {
    throw new Error(`Unsupported extra streams: ${file}`);
  }
  return { duration, audio: audio[0], data };
}

async function exists(file) {
  return lstat(file).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
}

export async function preparePlan(report, reportFile, ffprobe = 'ffprobe') {
  if (!report || !Array.isArray(report.files)) throw new Error('Report must contain a files array.');
  const seen = new Set();
  const plans = [];
  for (const entry of report.files) {
    if (!entry || typeof entry.file !== 'string' || !entry.file.trim()) throw new Error('Every report entry must name a file.');
    if (entry.error) throw new Error(`Report contains a failed scan: ${entry.file}`);
    const intervals = mergeSilences(entry.silences);
    if (!intervals.length) continue; // Also accepts older reports containing clean tracks.
    // Relative file paths, if supplied, are relative to the report's location.
    const file = path.resolve(path.dirname(reportFile), entry.file);
    if (path.extname(file).toLowerCase() !== '.mp3') throw new Error(`Expected an .mp3 path: ${file}`);
    const source = await lstat(file);
    if (!source.isFile() || source.nlink > 1) throw new Error(`Input must be a regular file without hard links: ${file}`);
    const resolved = await realpath(file);
    const key = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    if (seen.has(key)) throw new Error(`Duplicate report file: ${file}`);
    seen.add(key);
    const backup = `${file}.bak`;
    if (await exists(backup)) throw new Error(`Backup already exists (report may already be applied): ${backup}`);
    const media = await probe(file, ffprobe);
    for (const interval of intervals) {
      // Allow a small decoded/container duration difference at EOF.
      if (interval.startSec >= media.duration || interval.endSec > media.duration + 0.1) {
        throw new Error(`Silence interval is outside the current track duration (stale report?): ${file}`);
      }
      interval.endSec = Math.min(interval.endSec, media.duration);
    }
    const removedSec = intervals.reduce((total, part) => total + part.endSec - part.startSec, 0);
    if (media.duration - removedSec < 0.1) throw new Error(`Cannot remove the entire track: ${file}`);
    plans.push({ file, backup, source, media, intervals, removedSec });
  }
  return plans;
}

export function dropFilter(intervals) {
  // Drop only frames fully inside a reported interval, preserving music at the
  // edges. FFmpeg's normal input offset makes pts*tb match decoded audio time.
  // amount=0 explicitly leaves the bytes of all retained frames untouched.
  const expression = intervals.map(({ startSec, endSec }) =>
    `gte(pts*tb,${startSec})*lte((pts+duration)*tb,${endSec})`).join('+');
  return `noise=amount=0:drop='${expression}'`;
}

function assertUnchanged(current, original, file) {
  if (current.size !== original.size || current.mtimeMs !== original.mtimeMs || current.ino !== original.ino) {
    throw new Error(`Source changed during processing: ${file}`);
  }
}

export async function applyPlan(plan, options) {
  const work = await mkdtemp(path.join(path.dirname(plan.file), '.remove-silence-'));
  const output = path.join(work, 'updated.mp3');
  try {
    assertUnchanged(await stat(plan.file), plan.source, plan.file);
    await run(options.ffmpeg, [
      '-hide_banner', '-nostdin', '-v', 'error', '-xerror', '-n', '-i', plan.file,
      '-map', '0', '-map_metadata', '0', '-map_chapters', '-1', '-c', 'copy',
      '-bsf:a', dropFilter(plan.intervals), '-metadata', 'TLEN=', '-metadata', 'duration=',
      '-write_xing', '1', output,
    ]);
    const updated = await probe(output, options.ffprobe);
    for (const field of ['codec_name', 'sample_rate', 'channels', 'channel_layout']) {
      if (updated.audio[field] !== plan.media.audio[field]) throw new Error(`Output ${field} differs: ${plan.file}`);
    }
    if (updated.data.streams.length !== plan.media.data.streams.length) throw new Error(`Output lost streams: ${plan.file}`);
    // Each boundary may retain a partial frame; allow encoder padding as well.
    const tolerance = 0.1 + plan.intervals.length * 2 * 1152 / Number(plan.media.audio.sample_rate);
    if (Math.abs(updated.duration - (plan.media.duration - plan.removedSec)) > tolerance) {
      throw new Error(`Output duration does not match the planned cuts: ${plan.file}`);
    }
    // A successful mux alone does not establish that the edited MP3 decodes.
    await run(options.ffmpeg, ['-hide_banner', '-nostdin', '-v', 'error', '-xerror', '-i', output, '-map', '0:a:0', '-f', 'null', '-']);
    assertUnchanged(await stat(plan.file), plan.source, plan.file);
    await chmod(output, plan.source.mode);
    await copyFile(plan.file, plan.backup, constants.COPYFILE_EXCL);
    assertUnchanged(await stat(plan.file), plan.source, plan.file);
    // Temp file is on the same filesystem. Never delete the source first.
    await rename(output, plan.file);
    return updated;
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

export async function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  if (options.help) { process.stdout.write(HELP); return 0; }
  const report = JSON.parse((await readFile(options.report, 'utf8')).replace(/^\uFEFF/, ''));
  const plans = await preparePlan(report, options.report, options.ffprobe);
  if (report.errors?.length) process.stderr.write(`Note: ${report.errors.length} failed scans in report.errors will not be edited.\n`);
  process.stdout.write(`${options.apply ? 'Applying' : 'Preview only:'} ${plans.length} track(s), ${plans.reduce((sum, plan) => sum + plan.removedSec, 0).toFixed(3)}s of reported silence.\n`);
  for (const plan of plans) {
    process.stdout.write(`\n${plan.file}\n`);
    for (const interval of plan.intervals) process.stdout.write(`  Remove ${timestamp(interval.startSec)} -> ${timestamp(interval.endSec)}\n`);
    process.stdout.write(`  ${plan.media.duration.toFixed(3)}s -> approximately ${(plan.media.duration - plan.removedSec).toFixed(3)}s\n  Backup: ${plan.backup}\n`);
  }
  if (!options.apply) {
    process.stdout.write('\nNo files changed. Add --apply to write updated tracks.\n');
    return 0;
  }
  // Validate every input before starting. Once application starts, each file is
  // committed separately; failures leave earlier successful tracks updated.
  for (const plan of plans) {
    process.stderr.write(`Processing ${plan.file}\n`);
    await applyPlan(plan, options);
    process.stdout.write(`Updated ${plan.file}\n`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  });
}
