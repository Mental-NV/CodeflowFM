#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { lstat, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

const HELP = `Usage: node tools/detect-silence.mjs <directory> [options]

Find quiet sections in MP3 files without modifying the audio.
Requires Node.js 22+ and FFmpeg on PATH.

Options:
  --min-duration <seconds>  Minimum continuous silence (default: 30)
  --threshold=<dB>         Silence ceiling in dBFS (default: -50)
  --recursive              Include subdirectories (does not follow symlinks)
  --format <text|json>     Report format (default: text)
  --output <file>          Save report instead of printing it to stdout
  --ffmpeg <executable>    FFmpeg executable name or full path
  --help                  Show this help

Example:
  node tools/detect-silence.mjs "C:\\Projects\\yt-downloader\\Selected10G" --output silence-report.txt

Exit codes: 0 = scan completed (including silence found), 1 = an error occurred.
Progress goes to stderr. Reports include leading and trailing silence.
`;

export function parseOptions(args) {
  const { values, positionals } = parseArgs({
    args, allowPositionals: true,
    options: {
      'min-duration': { type: 'string', default: '30' },
      threshold: { type: 'string', default: '-50' },
      recursive: { type: 'boolean', default: false },
      format: { type: 'string', default: 'text' },
      output: { type: 'string' },
      ffmpeg: { type: 'string', default: 'ffmpeg' },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) return { help: true };
  if (positionals.length !== 1) throw new Error('Specify exactly one directory. Use --help for usage.');
  const minDuration = Number(values['min-duration']);
  const thresholdDb = Number(values.threshold);
  if (!Number.isFinite(minDuration) || minDuration <= 0) throw new Error('--min-duration must be a positive number.');
  if (values.threshold.trim() === '' || !Number.isFinite(thresholdDb) || thresholdDb > 0) {
    throw new Error('--threshold must be a finite number at or below 0 dBFS.');
  }
  if (!['text', 'json'].includes(values.format)) throw new Error('--format must be text or json.');
  if (!values.ffmpeg.trim()) throw new Error('--ffmpeg must name an executable.');
  if (values.output !== undefined && !values.output.trim()) throw new Error('--output must name a file.');
  return {
    directory: path.resolve(positionals[0]), minDuration, thresholdDb,
    recursive: values.recursive, format: values.format,
    output: values.output === undefined ? undefined : path.resolve(values.output),
    ffmpeg: values.ffmpeg,
  };
}

export async function findMp3Files(directory, recursive) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.mp3') files.push(fullPath);
    else if (recursive && entry.isDirectory()) files.push(...await findMp3Files(fullPath, true));
  }
  return files;
}

// Parse only detector messages; do not confuse metadata or other FFmpeg logs
// with silence events. Both stereo channels must be quiet (mono is disabled).
export function createSilenceParser() {
  const silences = [];
  let start = null;
  return {
    silences,
    get incomplete() { return start !== null; },
    line(line) {
      if (!/^\[silencedetect\s+@[^\]]+\]/.test(line)) return;
      const begin = line.match(/\bsilence_start:\s*([\d.eE+-]+)/);
      if (begin) start = Number(begin[1]);
      const finish = line.match(/\bsilence_end:\s*([\d.eE+-]+)/);
      if (finish && start !== null) {
        const end = Number(finish[1]);
        if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
          silences.push({
            startSec: start, endSec: end, durationSec: Number((end - start).toFixed(6)),
            startTime: timestamp(start), endTime: timestamp(end),
          });
        }
        start = null;
      }
    },
  };
}

export function scanFile(file, options) {
  return new Promise((resolve) => {
    const detector = createSilenceParser();
    const child = spawn(options.ffmpeg, [
      '-hide_banner', '-nostdin', '-nostats', '-loglevel', 'info', '-xerror',
      '-i', file, '-map', '0:a:0', '-vn', '-sn', '-dn',
      '-af', `silencedetect=noise=${options.thresholdDb}dB:duration=${options.minDuration}:mono=0`,
      '-f', 'null', '-',
    ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    let pending = '';
    let diagnostics = '';
    let launchError;
    child.on('error', (error) => { launchError = error; });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      diagnostics = (diagnostics + chunk).slice(-8192);
      pending += chunk;
      const lines = pending.split(/[\r\n]/);
      pending = lines.pop();
      for (const line of lines) detector.line(line);
      // Keep malformed input/metadata from accumulating an unlimited log line.
      if (pending.length > 16384) pending = pending.slice(-16384);
    });
    child.on('close', (code, signal) => {
      detector.line(pending);
      const error = launchError
        ? `Cannot start FFmpeg: ${launchError.message}`
        : code !== 0
          ? `FFmpeg failed (${signal ?? `exit ${code}`}): ${diagnostics.trim()}`
          : detector.incomplete ? 'FFmpeg did not close the final silence interval.' : null;
      // A partial decode is not a successful scan; report the error, not incomplete findings.
      resolve(error ? { file, error } : { file, silences: detector.silences });
    });
  });
}

export function timestamp(seconds) {
  const milliseconds = Math.round(seconds * 1000);
  return `${String(Math.floor(milliseconds / 3600000)).padStart(2, '0')}:${String(Math.floor(milliseconds / 60000) % 60).padStart(2, '0')}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')}.${String(milliseconds % 1000).padStart(3, '0')}`;
}

export function textReport(report) {
  const { summary } = report;
  const lines = [
    `Silence scan: ${report.directory}`,
    `Threshold: ${report.thresholdDb} dBFS | Minimum: ${report.minDurationSec}s | Recursive: ${report.recursive}`,
    `Files: ${summary.totalFiles} | Scanned: ${summary.scannedFiles} | Errors: ${summary.failedFiles}`,
    `Tracks with silence: ${summary.filesWithSilence} | Silent sections: ${summary.silentSections}`,
  ];
  if (summary.totalFiles === 0) lines.push('', 'No MP3 files found.');
  else if (summary.scannedFiles > 0 && summary.silentSections === 0) lines.push('', 'No qualifying silence found in successfully scanned files.');
  for (const result of [...report.files, ...(report.errors ?? [])]) {
    if (result.error) lines.push('', `ERROR: ${result.file}`, result.error);
    else if (result.silences.length) {
      lines.push('', result.file);
      for (const part of result.silences) {
        lines.push(`  ${timestamp(part.startSec)} -> ${timestamp(part.endSec)}  (${part.durationSec.toFixed(3)}s)`);
      }
    }
  }
  return `${lines.join('\n')}\n`;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  if (options.help) { process.stdout.write(HELP); return 0; }
  if (!(await stat(options.directory)).isDirectory()) throw new Error('Input path must be a directory.');
  const files = await findMp3Files(options.directory, options.recursive);
  // Refuse audio output paths and catch existing reports before an expensive scan.
  if (options.output && path.extname(options.output).toLowerCase() === '.mp3') {
    throw new Error('--output must not have an .mp3 extension; choose a report filename.');
  }
  if (options.output) {
    const existing = await lstat(options.output).catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (existing) throw new Error(`EEXIST: output file already exists: ${options.output}`);
  }
  // Check availability once, before a potentially large scan.
  await new Promise((resolve, reject) => {
    const child = spawn(options.ffmpeg, ['-version'], { stdio: 'ignore', windowsHide: true });
    child.on('error', () => reject(new Error(`Cannot start FFmpeg (${options.ffmpeg}). Install FFmpeg or use --ffmpeg <path>.`)));
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error('FFmpeg version check failed.')));
  });
  const results = [];
  for (const [index, file] of files.entries()) {
    process.stderr.write(`[${index + 1}/${files.length}] ${file}\n`);
    results.push(await scanFile(file, options));
  }
  const successful = results.filter((result) => !result.error);
  const report = {
    directory: options.directory, thresholdDb: options.thresholdDb,
    minDurationSec: options.minDuration, recursive: options.recursive,
    summary: {
      totalFiles: files.length, scannedFiles: successful.length,
      failedFiles: files.length - successful.length,
      filesWithSilence: successful.filter((result) => result.silences.length > 0).length,
      silentSections: successful.reduce((total, result) => total + result.silences.length, 0),
    },
    files: successful.filter((result) => result.silences.length > 0),
    errors: results.filter((result) => result.error),
  };
  const output = options.format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : textReport(report);
  if (options.output) {
    await writeFile(options.output, output, { encoding: 'utf8', flag: 'wx' });
    process.stderr.write(`Report saved to ${options.output}\n`);
  } else process.stdout.write(output);
  return report.summary.failedFiles > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  });
}
