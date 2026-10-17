// build-playlist.mjs
// Node.js 18+
// Renames MP3 files to URL-safe names and computes SHA-256 track IDs,
// generates playlist.json for a web MP3 player,
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
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_STATION_ID = "future-garage";
const DEFAULT_STATION_NAME = "Future Garage";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function toBool(v) {
  if (v === true) return true;
  if (typeof v !== "string") return false;
  return ["1", "true", "yes", "y", "on"].includes(v.toLowerCase());
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

async function listMp3Files(dir, recursive = false) {
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

function buildPlaylistSchema() {
  // JSON Schema 2020-12
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://example.com/playlist.schema.json",
    title: "MP3 Playlist (Pre-MVP)",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "station", "generatedAt", "tracks"],
    properties: {
      schemaVersion: { type: "string", const: "1.0" },
      station: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name"],
        properties: {
          id: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1 },
        },
      },
      generatedAt: { type: "string", format: "date-time" },
      baseUrl: { type: "string", minLength: 1 },
      tracks: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "filename", "url", "sizeBytes", "sha256", "mime"],
          properties: {
            id: { type: "string", minLength: 8 },
            title: { type: ["string", "null"] },
            artist: { type: ["string", "null"] },
            filename: { type: "string", minLength: 1 },
            url: { type: "string", minLength: 1 },
            sizeBytes: { type: "integer", minimum: 0 },
            sha256: { type: "string", minLength: 64, maxLength: 64 },
            mime: { type: "string", const: "audio/mpeg" },
            // Optional fields you may add later:
            durationSec: { type: ["number", "null"], minimum: 0 },
            originalName: { type: ["string", "null"] },
          },
        },
      },
    },
  };
}

async function main() {
  const args = parseArgs(process.argv);

  const dir = args.dir ? path.resolve(args.dir) : null;
  if (!dir) {
    console.error("Missing --dir. Example: node tools/build-playlist.mjs --dir \"./Future Garage\"");
    process.exit(2);
  }

  const outDir = args.out ? path.resolve(args.out) : dir;
  const recursive = toBool(args.recursive);
  const dryRun = toBool(args.dryRun);
  const mode = (args.mode || "rename").toLowerCase(); // rename | copy
  if (!["rename", "copy"].includes(mode)) {
    console.error("Invalid --mode. Use: rename | copy");
    process.exit(2);
  }

  const stationId = args.stationId ? String(args.stationId) : DEFAULT_STATION_ID;
  const stationName = args.stationName ? String(args.stationName) : DEFAULT_STATION_NAME;
  const stationSlug = slugify(stationId, DEFAULT_STATION_ID);

  const baseUrlRaw = args.baseUrl ? String(args.baseUrl) : "";
  const baseUrl = baseUrlRaw ? baseUrlRaw.replace(/\/+$/g, "") : ""; // trim trailing /

  await ensureDir(outDir);

  const files = await listMp3Files(dir, recursive);
  if (!files.length) {
    console.error(`No .mp3 files found in: ${dir}`);
    process.exit(1);
  }

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
    const hash8 = sha256.slice(0, 8);

    const { title, artist } = await tryReadTags(from);
    const baseName = path.basename(from, path.extname(from));
    const display = (artist && title) ? `${artist} - ${title}` : baseName;

    // URL-safe, deterministic filename
    let slug = slugify(display, "track");
    // keep filename length reasonable
    if (slug.length > 80) slug = slug.slice(0, 80).replace(/-+$/g, "");

    // let newName = `${stationSlug}-${pad4(i + 1)}-${slug}-${hash8}.mp3`;
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

  const schema = buildPlaylistSchema();

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
    console.log("\nR2 note: upload the renamed .mp3 files + playlist.json to your bucket/prefix.");
    console.log("If you use a custom domain, baseUrl should be that public prefix (no trailing slash).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});