# Remove absolute silence from MP3 tracks

`clean-mp3-silence.mjs` scans a folder, removes exact digital silence, and writes changed tracks beside the originals as `<name>.cleaned.mp3`. Original files are opened for reading only. No npm packages are needed.

Requires Node.js 22+, FFmpeg with the `mp3float` decoder and `libmp3lame` encoder, and FFprobe (normally included with FFmpeg). Both executables must be on `PATH`, or supplied with the options below.

## Run

From the CodeFlowFM project directory, preview your folder and save a JSON report:

```powershell
node tools/clean-mp3-silence.mjs "C:\Projects\yt-downloader\Selected10G" --dryrun --output ".\silence-preview.json"
```

Then scan again and create cleaned copies:

```powershell
node tools/clean-mp3-silence.mjs "C:\Projects\yt-downloader\Selected10G" --output ".\silence-result.json"
```

Without `--output`, the JSON report goes to standard output. Progress and errors go to standard error, keeping the JSON machine-readable. `--dryrun` performs the full scan but writes no audio or temporary audio files; it writes a report only when `--output` is specified. Normal mode creates copies immediately and does not consume a previous report.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `<folder>` | Required | Folder of MP3s; relative paths resolve from the working directory. |
| `--dryrun` | Off | Report proposed changes without writing audio. |
| `--output <report.json>` | Standard output | Write JSON to a new file. Parent directory must exist. Existing files are never overwritten. |
| `--recursive` | Off | Include subdirectories, placing each output next to its source. |
| `--min-duration <seconds>` | `0` | Minimum length of an exact-zero run to remove. The default includes single sample frames. For example, `0.1` keeps zero runs shorter than 100 ms. This does not change the amplitude threshold. |
| `--ffmpeg <executable>` | `ffmpeg` | FFmpeg executable or full path. |
| `--ffprobe <executable>` | `ffprobe` | FFprobe executable or full path. |
| `--help` | — | Print usage. |

Use space-separated option values, for example `--min-duration 0.1`.

## What counts as silence

FFmpeg decodes the first MP3 audio stream to 32-bit floating-point samples at its original sample rate and channel count. A sample frame is silent only if **every channel equals exactly zero**, including negative zero. Nonzero samples, however quiet, are retained. Integer conversion and decibel thresholds are not used. Leading, internal, and trailing zero runs are all detected, including runs crossing stream-buffer boundaries.

MP3 is lossy. A gap that sounds silent can contain tiny nonzero decoded samples; those samples will remain. The definition applies to FFmpeg's decoded audio, not to the audio before it was originally compressed. With the default minimum duration, even an isolated exact-zero waveform crossing is eligible for removal. Use a minimum duration if you only want sustained gaps.

The tool scans each track once, then decodes changed tracks again and removes the reported sample ranges. It streams audio one track at a time rather than loading whole mixes into memory or saving large uncompressed files. Memory also holds the JSON report and grows with the number of files and detected intervals.

## Output and preservation

- A source such as `mix.MP3` produces `mix.cleaned.MP3`. Extension casing is preserved.
- Cleaned copies are re-encoded using `libmp3lame` VBR quality `2`, preserving sample rate and channel count. Re-encoding is lossy and can change bitrate and size. Exact sample cuts cannot be achieved with MP3 stream copying. Newly encoded boundaries can contain tiny codec artifacts; the report describes the source samples removed.
- Text metadata and cover-art streams are copied through FFmpeg. Tags may be normalized by the MP3 muxer; ID3 bytes are not preserved verbatim. Chapters are omitted because their timestamps would be stale. See [FFmpeg's mapping and metadata options](https://ffmpeg.org/ffmpeg.html#Advanced-options).
- Tracks without qualifying silence get status `unchanged` and no duplicate file.
- Entirely silent tracks get status `all_silent` and no output, since an empty track cannot form a useful MP3.
- Names ending in `.cleaned.mp3` (case insensitive) are reserved for outputs and excluded from future scans. Symlink entries are not followed, and tool staging directories are excluded.
- An existing output is reported as a per-file error, including during dry runs. It is never overwritten. Re-running a completed folder therefore reports collisions for previously cleaned tracks; it does not overwrite or clean the generated copies again.
- Each result is encoded in a temporary directory beside the source, then published using an atomic, exclusive hard link. The destination filesystem must support hard links (NTFS does). Temporary files are cleaned after success or handled errors. Abrupt process termination or a power loss may leave a `.clean-mp3-*` directory, which future scans ignore.
- Source size, modification/change times, and identity are checked between passes and before publication. Avoid editing the input folder while a scan is running.

## JSON report

Both modes use the same report schema (`schemaVersion: 1`). It includes the absolute input folder, scan settings, a summary, and a `files` array containing every attempted track, including failures.

Each successfully scanned entry contains:

- `file`, `output`: absolute source and proposed destination paths. `output` does not imply a file was written; check `status`.
- `status`: `would_create`, `created`, `unchanged`, `all_silent`, or `error`.
- `sampleRate`, `channels`, `totalFrames`, `durationSec`: decoded source properties.
- `removedFrames`, `removedDurationSec`, `retainedDurationSec`: proposed cut totals, also present in dry runs and when output creation fails. Only `created` confirms they were applied.
- `silences`: ordered intervals with `startFrame`, exclusive `endFrame`, `startSec`, `endSec`, and `durationSec`, all on the original source timeline. A frame here is one sample per channel, not a compressed MP3 frame. Integer frame positions are authoritative; seconds are their division by sample rate.
- `error` or `reason` when applicable. Files that fail before analysis completes do not have scan fields.

The summary counts attempted/scanned files, files with silence, silent sections, created/proposed outputs, unchanged tracks, entirely silent tracks, and failures. `silentDurationSec` is the detected eligible silence across all successfully scanned tracks, including dry runs, all-silent tracks, and output collisions; it is not a count of successfully applied edits.

Exit code `0` means the run completed without file errors (including an empty folder); `1` means a configuration, dependency, report-writing, or per-file error. File errors do not stop subsequent tracks, and successful outputs remain available. Setup errors are printed to standard error and may prevent a report. The report path is reserved exclusively before scanning and filled when the run completes; interruption or a write failure can leave an empty or incomplete report.

## Verification

```powershell
node --test tests/clean-mp3-silence.test.js
```

Tests cover exact-zero detection, very quiet nonzero samples, both channels, partial buffers, minimum duration, real MP3 cuts, metadata/artwork, original-file preservation, dry runs, collisions, invalid inputs, and repeat scans. Audio integration tests skip when FFmpeg or FFprobe is unavailable.
