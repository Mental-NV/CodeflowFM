# Build an audio playlist

`build-playlist.mjs` renames or copies local MP3 files to URL-safe filenames and generates a playlist, its JSON Schema, and a file mapping. Files without an `.mp3` extension are ignored. Use Node.js 22+ for this project (the script itself supports Node.js 18+). Install FFmpeg and ensure its `ffprobe` command is on `PATH` (for example, `brew install ffmpeg` on macOS or `sudo apt-get install ffmpeg` on Debian/Ubuntu). No npm packages are required. Optionally install `music-metadata` in the project with `npm install music-metadata` to read artist and title tags; missing packages or unreadable tags fall back to the original filename.

Run commands from the CodeFlowFM project directory. Start by previewing filenames in a separate output directory:

On macOS (zsh or bash):

```sh
node tools/build-playlist.mjs --dir '~/Projects/Yt-Download/lofi-beats' --out './playlist-preview' --dryRun
```

Backslash-separated paths are also supported. Use single quotes to preserve the backslashes:

```sh
node tools/build-playlist.mjs --dir '~\Projects\Yt-Download\lofi-beats' --mode copy --out './prepared-audio'
```

On Windows (PowerShell):

```powershell
node tools/build-playlist.mjs --dir "C:\Music\Future Garage" --out "./playlist-preview" --dryRun
```

**Preview mode still creates output directories and writes or overwrites all three JSON files.** It leaves the audio files untouched; the generated playlist refers to the planned filenames.

To copy audio into a prepared output folder and generate public URLs:

```powershell
node tools/build-playlist.mjs --dir "C:\Music\Future Garage" --mode copy --out "./prepared-audio" --baseUrl "https://cdn.example.com/future-garage"
```

The default mode is `rename`: it changes original filenames and moves the audio if `--out` points elsewhere. Use a fresh output directory to avoid overwriting existing files. Repeated runs on previously renamed files can change their names again.

## Options

Use separate arguments (`--dir "path"`), rather than `--dir=path`. Both `--dir` and `--out` accept absolute paths, relative paths, and home paths beginning with `~`, `~/`, or `~\`. Relative paths resolve from the current working directory; `~` expands to the current user's home directory even inside quotes. On macOS and Linux, backslashes are treated as directory separators. Use single quotes around backslash paths in zsh or bash so the shell passes them unchanged. Other-user shortcuts such as `~alice` are not expanded by the script.

| Option | Default | Behavior |
| --- | --- | --- |
| `--dir <path>` | Required | Input directory containing MP3 files; extension matching is case insensitive. |
| `--out <path>` | Input directory | Destination for audio and JSON files. In copy mode, if this equals the input directory, outputs go into its `_renamed` subfolder. |
| `--mode <rename\|copy>` | `rename` | Rename/move originals, or copy them while retaining originals. |
| `--recursive` | Off | Include MP3 files in subdirectories; output is flattened into one directory. |
| `--dryRun` | Off | Preview audio renames without applying them; still write JSON artifacts. |
| `--baseUrl <url>` | Omitted | Absolute HTTP(S) audio URL prefix without whitespace, query parameters, or a fragment; trailing slashes are removed. Without it, track URLs use `./<filename>`. |
| `--stationId <id>` | `future-garage` | Playlist station ID and the source of the filename prefix. |
| `--stationName <name>` | `Future Garage` | Playlist station display name. |

Boolean flags can be supplied alone to enable them, or with an explicit value. True values are `true`, `1`, `yes`, `y`, and `on`; false values are `false`, `0`, `no`, `n`, and `off` (case insensitive). Other boolean values are rejected. Mode values are also case insensitive. There is no dedicated `--help` mode.

Unknown options, positional arguments, duplicate options, missing or blank values, invalid modes, and invalid URL prefixes stop execution with a descriptive error and exit code `2`. Validation runs before creating output directories, writing JSON, or renaming/copying audio. The input directory must already exist; an output directory can be created, but it and its existing parents must be directories. Use `./` before a relative path beginning with `-` so it is not mistaken for an option.

## Generated files

The effective output directory contains:

- `playlist.json`: schema version `1.0`, station metadata, generation timestamp, optional base URL, and track records.
- `playlist.schema.json`: JSON Schema 2020-12 describing the generated playlist format.
- `rename-map.json`: absolute source and destination paths, original and generated filenames, full SHA-256 hashes, and byte sizes.

Files are sorted by their full paths before assigning a four-digit sequence number. Names normally follow `<station-slug>-<sequence>-<track-slug>.mp3`. Slugs use lowercase ASCII letters, digits, and hyphens; non-Latin characters are removed, and an empty track slug becomes `track`. The track slug uses `artist - title` when both tags are available, otherwise the original filename stem, and is capped at 80 characters. Filenames depend on ordering and metadata; they are not content-hash names.

Each track contains a content-based ID (the first 16 SHA-256 characters), full hash, filename, encoded URL, byte size, MIME type (`audio/mpeg`), original name, and nullable artist/title fields. `durationSec` is always `null`.

Inputs must already be MP3 audio. Before creating output directories, writing JSON, or renaming/copying audio, the builder checks every `.mp3` file with `ffprobe`. It requires an MP3 container with at least one audio stream and only MP3 audio codecs; embedded cover artwork is allowed. Mislabeled AAC/MP4, other codecs or containers, and files that cannot be probed stop the entire batch, including in `--dryRun` mode. Missing `ffprobe` also stops execution; there is no validation bypass. Probing checks the reported container and codecs, rather than decoding the entire file for corruption.

The builder preserves audio bytes and normalizes the extension to `.mp3`; it does not transcode audio. The generated schema is copied from the app’s canonical `assets/playlist.schema.json`.

## Use with CodeFlowFM

Before adding the generated playlist to `assets/`, fill in a positive `durationSec` for every track and ensure each track has a public HTTP(S) URL. The player needs durations for its repeating schedule. Upload the prepared audio files to the prefix passed as `--baseUrl`, then follow the [station setup instructions](../README.md#add-a-station). The script prepares files locally; it does not upload them or update the station catalog.

Exit code `0` indicates success, `2` indicates invalid arguments or directory paths, and `1` indicates no MP3 files, failed codec validation, missing `ffprobe`, or another processing error. Validation failures leave audio and existing output files untouched. Later operations are not transactional: an error during copying, renaming, or writing can leave partially processed audio. Keep original files or use copy mode when preparing a library.
