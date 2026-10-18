// build-playlist.mjs
// Node.js 18+
// Renames MP3 files to URL-safe names and computes SHA-256 track IDs,
// generates playlist.json for Codeflow FM,
// and generates playlist.schema.json (JSON Schema) describing the playlist.
//
// Usage examples:
//   node tools/build-playlist.mjs --dir "./Future Garage" --baseUrl "https://cdn.example.com/future-garage"
//   node tools/build-playlist.mjs --dir "./Future Garage" --dryRun
//   node tools/build-playlist.mjs --dir "./Future Garage" --mode copy --out "./out"
//
// Notes:
// - Default mode is rename (destructive). Use --dryRun first.
// - If you install `music-metadata`, the script will read ID3 tags (artist/title).
//     npm i music-metadata
// - Without music-metadata, it falls back to the original filename (sanitized).

import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_STATION_ID = "future-garage";
const DEFAULT_STATION_NAME = "Future Garage";

class ArgumentError extends Error {}

const STRING_OPTIONS = new Set(["dir", "out", "mode", "baseUrl", "stationId", "stationName"]);
const BOOLEAN_OPTIONS = new Set(["recursive", "dryRun"]);
const TRUE_VALUES = new Set(["1", "true", "yes", "y", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "n", "off"]);

function parseArgs(argv) {
  const args = Object.create(null);
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      throw new ArgumentError(`Unexpected argument: ${a}. Use named options such as --dir "path".`);
    }
    const key = a.slice(2);
    if (!STRING_OPTIONS.has(key) && !BOOLEAN_OPTIONS.has(key)) {
      throw new ArgumentError(`Unknown option: ${a}. Supported options: ${[...STRING_OPTIONS, ...BOOLEAN_OPTIONS].map((name) => `--${name}`).join(", ")}. Use separate arguments (--dir "path"), not --dir=path.`);
    }
    if (Object.hasOwn(args, key)) {
      throw new ArgumentError(`Duplicate option: ${a}. Supply each option only once.`);
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("-")) {
      if (STRING_OPTIONS.has(key)) throw new ArgumentError(`Missing value for ${a}.`);
      args[key] = true;
    } else {
      if (!next.trim() || next.includes("\0")) throw new ArgumentError(`Invalid empty or null-containing value for ${a}.`);
      if (BOOLEAN_OPTIONS.has(key)) {
        const value = next.toLowerCase();
        if (!TRUE_VALUES.has(value) && !FALSE_VALUES.has(value)) {
          throw new ArgumentError(`Invalid value for ${a}: ${next}. Use true, false, 1, 0, yes, no, y, n, on, or off.`);
        }
        args[key] = TRUE_VALUES.has(value);
      } else {
        args[key] = next;
      }
      i++;
    }
  }
  if (!args.dir) throw new ArgumentError('Missing --dir. Example: node tools/build-playlist.mjs --dir "./Future Garage"');
  if (args.mode !== undefined && !["rename", "copy"].includes(args.mode.toLowerCase())) {
    throw new ArgumentError("Invalid --mode. Use: rename | copy.");
  }
  if (args.baseUrl !== undefined) {
    let url;
    try {
      url = new URL(args.baseUrl);
    } catch {
      throw new ArgumentError("Invalid --baseUrl. Use an absolute HTTP(S) URL.");
    }
    if (!/^https?:\/\//i.test(args.baseUrl) || !url.hostname || /\s/.test(args.baseUrl) || args.baseUrl.includes("?") || args.baseUrl.includes("#")) {
      throw new ArgumentError("Invalid --baseUrl. Use an absolute HTTP(S) URL without whitespace, a query, or a fragment.");
    }
  }
  return args;
}

async function validateDirectory(directory, option, allowMissing = false) {
  let current = directory;
  while (true) {
    let stats;
    try {
      stats = await fs.stat(current);
    } catch (err) {
      if (err.code === "ENOENT" && allowMissing) {
        current = path.dirname(current);
        continue;
      }
      if (err.code === "ENOENT" || err.code === "ENOTDIR") {
        throw new ArgumentError(`Invalid --${option}: ${directory}. ${allowMissing ? "Output path must be a directory with directory parents." : "Input directory must exist."}`);
      }
      throw err;
    }
    if (!stats.isDirectory()) throw new ArgumentError(`Invalid --${option}: ${directory}. Path must be a directory.`);
    return;
  }
}

function resolveDirectory(input) {
  // Quoted tildes are not expanded by the shell. Accept either separator so
  // home paths with backslashes also work on macOS and Linux.
  const expanded = input.replace(/^~(?=$|[\\/])/, () => homedir());
  const normalized = process.platform === "win32" ? expanded : expanded.replace(/\\/g, "/");
  return path.resolve(normalized);
}

function normalizeAscii(input) {
  // Remove diacritics, keep ASCII only. Cyrillic/other scripts are removed.
  // If you need Cyrillic-preserving keys, change this behavior.
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function slugify(input, fallback = "track") {
  const ascii = normalizeAscii(String(input || "")).toLowerCase();
  const slug = ascii
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug.length ? slug : fallback;
}

function pad4(n) {
  return String(n).padStart(4, "0");
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function listAudioFiles(dir, recursive = false) {
  const out = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(current, e.name);
      if (e.isDirectory()) {
        if (recursive) await walk(full);
        continue;
      }
      if (e.isFile() && /\.mp3$/i.test(e.name)) out.push(full);
    }
  }
  await walk(dir);
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash("sha256");
    const s = fssync.createReadStream(filePath);
    s.on("data", (chunk) => h.update(chunk));
    s.on("error", reject);
    s.on("end", () => resolve(h.digest("hex")));
  });
}

async function tryReadTags(filePath) {
  // Optional dependency: music-metadata
  // npm i music-metadata
  try {
    const mm = await import("music-metadata");
    const meta = await mm.parseFile(filePath, { duration: false });
    const common = meta.common || {};
    const title = common.title || null;
    const artist = common.artist || common.albumartist || null;
    return { title, artist };
  } catch {
    return { title: null, artist: null };
  }
}

async function safeRenameOrCopy({ from, to, mode }) {
  if (mode === "copy") {
    await fs.copyFile(from, to);
    return;
  }

  try {
    await fs.rename(from, to);
  } catch (err) {
    // Cross-device rename fallback: copy + unlink
    if (err && (err.code === "EXDEV" || err.code === "EPERM")) {
      await fs.copyFile(from, to);
      await fs.unlink(from);
      return;
    }
    throw err;
  }
}

async function buildPlaylistSchema() {
  // Use the app's schema so generated playlists stay in sync with playback.
  return JSON.parse(await fs.readFile(path.join(__dirname, "../assets/playlist.schema.json"), "utf-8"));
}

async function main() {
  const args = parseArgs(process.argv);

  const dir = resolveDirectory(args.dir);
  const outDir = args.out ? resolveDirectory(args.out) : dir;
  const recursive = args.recursive ?? false;
  const dryRun = args.dryRun ?? false;
  const mode = (args.mode || "rename").toLowerCase(); // rename | copy

  const stationId = args.stationId ? String(args.stationId) : DEFAULT_STATION_ID;
  const stationName = args.stationName ? String(args.stationName) : DEFAULT_STATION_NAME;
  const stationSlug = slugify(stationId, DEFAULT_STATION_ID);

  const baseUrlRaw = args.baseUrl ? String(args.baseUrl) : "";
  const baseUrl = baseUrlRaw ? baseUrlRaw.replace(/\/+$/g, "") : ""; // trim trailing /

  await validateDirectory(dir, "dir");
  await validateDirectory(outDir, "out", true);

  const files = await listAudioFiles(dir, recursive);
  if (!files.length) {
    console.error(`No .mp3 files found in: ${dir}`);
    process.exit(1);
  }

  await ensureDir(outDir);

  const mapping = [];
  const tracks = [];
  const usedNames = new Set();

  // If mode=copy and outDir==dir, create a subfolder to avoid overwriting.
  let effectiveOutDir = outDir;
  if (mode === "copy" && path.resolve(outDir) === path.resolve(dir)) {
    effectiveOutDir = path.join(outDir, "_renamed");
    await ensureDir(effectiveOutDir);
  }

  for (let i = 0; i < files.length; i++) {
    const from = files[i];
    const stats = await fs.stat(from);
    const sha256 = await sha256File(from);

    const { title, artist } = await tryReadTags(from);
    const baseName = path.basename(from, path.extname(from));
    const display = (artist && title) ? `${artist} - ${title}` : baseName;

    // URL-safe, deterministic filename
    let slug = slugify(display, "track");
    // keep filename length reasonable
    if (slug.length > 80) slug = slug.slice(0, 80).replace(/-+$/g, "");

    let newName = `${stationSlug}-${pad4(i + 1)}-${slug}.mp3`;

    // Ensure uniqueness even in pathological cases
    if (usedNames.has(newName)) {
      newName = `${stationSlug}-${pad4(i + 1)}-${slug}-${sha256.slice(0, 12)}.mp3`;
    }
    usedNames.add(newName);

    const to = path.join(effectiveOutDir, newName);

    mapping.push({
      from,
      to,
      originalName: path.basename(from),
      newName,
      sha256,
      sizeBytes: stats.size,
    });

    tracks.push({
      id: sha256.slice(0, 16),
      title: title ?? null,
      artist: artist ?? null,
      filename: newName,
      url: baseUrl ? `${baseUrl}/${encodeURIComponent(newName)}` : `./${encodeURIComponent(newName)}`,
      sizeBytes: stats.size,
      sha256,
      mime: "audio/mpeg",
      originalName: path.basename(from),
      durationSec: null, // optional: you can fill later if you add a duration parser
    });
  }

  // Apply rename/copy
  if (dryRun) {
    console.log("DRY RUN — audio files will not be changed; JSON artifacts will still be written.\n");
    for (const m of mapping) {
      console.log(`${m.originalName}  ->  ${m.newName}`);
    }
  } else {
    for (const m of mapping) {
      await safeRenameOrCopy({ from: m.from, to: m.to, mode });
    }
    console.log(`Done: ${mode}d ${mapping.length} file(s) into: ${effectiveOutDir}`);
  }

  // Write artifacts (always, even in dry run)
  const playlist = {
    schemaVersion: "1.0",
    station: { id: stationId, name: stationName },
    generatedAt: new Date().toISOString(),
    ...(baseUrl ? { baseUrl } : {}),
    tracks,
  };

  const schema = await buildPlaylistSchema();

  const playlistPath = path.join(effectiveOutDir, "playlist.json");
  const schemaPath = path.join(effectiveOutDir, "playlist.schema.json");
  const mapPath = path.join(effectiveOutDir, "rename-map.json");

  await fs.writeFile(playlistPath, JSON.stringify(playlist, null, 2), "utf-8");
  await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2), "utf-8");
  await fs.writeFile(mapPath, JSON.stringify(mapping, null, 2), "utf-8");

  console.log(`Wrote: ${playlistPath}`);
  console.log(`Wrote: ${schemaPath}`);
  console.log(`Wrote: ${mapPath}`);

  // Helpful hint for R2 upload
  if (baseUrl) {
    console.log("\nR2 note: upload the prepared audio files + playlist.json to your bucket/prefix.");
    console.log("If you use a custom domain, baseUrl should be that public prefix (no trailing slash).");
  }
}

main().catch((err) => {
  console.error(err instanceof ArgumentError ? `Error: ${err.message}` : err);
  process.exitCode = err instanceof ArgumentError ? 2 : 1;
});
