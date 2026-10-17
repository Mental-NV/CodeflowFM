# Remove reported silence from MP3 tracks

`remove-silence.mjs` reads a JSON report from `detect-silence.mjs`, removes its silence intervals, and writes updated MP3 files at their original paths. Requires Node.js 22+, FFmpeg with the `noise` bitstream filter, and FFprobe. No npm packages are needed.

Preview the changes from the project directory:

```powershell
node tools/remove-silence.mjs silence-report.json
```

Write the updated tracks:

```powershell
node tools/remove-silence.mjs silence-report.json --apply
```

The reference report lists four silent sections across three tracks, totaling about **1,141.988 seconds (19 minutes, 2 seconds)**. Only files listed with silence are processed. Entries in the report's separate `errors` array are announced and skipped. Older reports containing clean tracks are also accepted; those tracks are skipped.

The tool uses `startTime` and `endTime` in `HH:MM:SS.mmm` format, with milliseconds required and hours allowed above 99. These timestamps determine the cuts; `durationSec` and any legacy numeric `startSec` / `endSec` fields are ignored. Reports without valid timestamps are rejected. Relative track paths are resolved against the report's directory. Overlapping or adjacent intervals are merged before removal. Out-of-range intervals, duplicate files, non-MP3 input, symlinks, hard links, and intervals covering the entire track are rejected before any changes start.

## Preserving audio parameters

The tool copies the existing encoded MP3 frames, dropping only frames fully inside the reported intervals. FFmpeg's [bitstream filter](https://ffmpeg.org/ffmpeg-bitstream-filters.html#noise) is configured with `amount=0` to leave retained bytes untouched. There is no audio re-encoding or resampling. This preserves the MP3 codec, sample rate, channels, CBR bitrate, and the bitrates of retained VBR frames. A VBR file's average bitrate can change because its frame mix changes.

Cuts follow MP3 frame boundaries rather than exact audio samples. A short fraction of a frame can remain at each cut boundary (typically tens of milliseconds). The tool checks the resulting duration with this tolerance. It copies supported tags and attached artwork, regenerates the MP3 duration/seek header, and drops old duration tags and chapters whose timestamps would be stale. Tag serialization and container headers can change during remuxing.

## Backups and failures

The default preview probes inputs and prints planned cuts without creating any files. With `--apply`, each replacement is prepared in a temporary directory beside the original, checked for matching audio parameters and expected duration, and fully decoded to check for errors. The original is copied to `<original filename>.bak` before the replacement is renamed over the original path. Existing backups are never overwritten.

All report entries are validated before applying changes. Replacements are committed one file at a time: if a later track fails, earlier successful edits remain and keep their backups. The failing track stays at its original path; if its backup was already created, that backup is retained. Temporary files are cleaned up.

Use a fresh report for current originals. Do not apply the same report twice: its timestamps refer to the audio before editing. An existing backup blocks accidental repeat application; even after moving backups elsewhere, old reports should not be reused. Duration checks cannot detect every possible change to a track since the scan.

Use `--ffmpeg <path>` and `--ffprobe <path>` for custom executable locations. `--help` lists options. Exit code **0** means the preview or application succeeded; **1** means an argument, report, filesystem, validation, or FFmpeg error occurred.
