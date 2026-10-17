# Detect silence in MP3 files

`detect-silence.mjs` decodes each MP3 with FFmpeg and reports continuous quiet sections with start/end timestamps and duration in seconds. JSON is the default output format; use `--format text` for a text report. It reads the original files without changing them. No npm packages are needed; use Node.js 22+ and FFmpeg with the `silencedetect` filter installed on `PATH` (or supply `--ffmpeg "C:\path\to\ffmpeg.exe"`).

Run from the CodeFlowFM project directory:

```powershell
node tools/detect-silence.mjs "C:\Projects\yt-downloader\Selected10G" --output silence-report.json
```

By default, this scans MP3 files directly inside the directory, including uppercase `.MP3` extensions, and flags sections of at least **30 seconds** below **-50 dBFS**. Both channels must be quiet. Leading and trailing silence is included, as well as silence in the middle of a track. Intentional quiet passages can also be flagged; review the reported timestamps before editing music.

To include subdirectories, find gaps of at least a minute, and save JSON:

```powershell
node tools/detect-silence.mjs "C:\Projects\yt-downloader\Selected10G" --recursive --min-duration 60 --threshold=-50 --output silence-report.json
```

A threshold nearer 0 (for example, `--threshold=-40`) also detects louder quiet passages; a lower threshold (for example, `--threshold=-60`) requires quieter audio. Use `--help` for all options. The scan decodes the complete audio and can take time for a large library. Files are processed one at a time to bound resource use. Directory symlinks are not followed.

Without `--output`, the report goes to stdout; progress always goes to stderr, so shell redirection also works. Output files are created exclusively: an existing report is never overwritten. JSON includes only tracks with detected silence in `files`, and failed scans in a separate `errors` array. Summary totals cover all scanned tracks. Each silence contains `startTime` and `endTime` in `HH:MM:SS.mmm` format, measured from the beginning of the decoded audio, plus numeric `durationSec`. Numeric `startSec` and `endSec` fields are not emitted. Text reports show only affected files and errors, plus totals. Use the [silence removal CLI](remove-silence.md) to apply the reported cuts. Example text output with `--format text`:

```text
C:\Music\track.mp3
  00:12:30.000 -> 00:15:00.000  (150.000s)
```

Exit code **0** means scanning completed, whether or not silence was found. Exit code **1** means an argument, filesystem, FFmpeg, or audio decoding error occurred. An invalid audio file is recorded as an error and scanning continues for the remaining files. Successfully decoded tracks still appear in the report. Decoder errors fail the file rather than treating an incomplete scan as clean.
