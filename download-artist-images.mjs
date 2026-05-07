// download-artist-images.mjs
//
// Downloads every breweryartwalk.com image referenced from artists.json
// to www/img/artists/<slug>.<ext>, then rewrites artists.json so it
// points at the local copies. Bundling the images lets the app work
// fully offline AND removes the third-party-content rights ambiguity
// when Apple reviews against guideline 5.2.
//
// Usage:
//   node download-artist-images.mjs           # downloads + rewrites JSON
//   node download-artist-images.mjs --dry     # show what would happen
//
// Re-running is safe: only missing files are fetched.

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const artistsPath = join(__dirname, 'artists.json');
const outDir = join(__dirname, 'img', 'artists');   // source location; prepare.js mirrors into www/
const dryRun = process.argv.includes('--dry');
const PARALLEL = 6;
const TIMEOUT_MS = 25_000;

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const artists = JSON.parse(readFileSync(artistsPath, 'utf8'));

// Collect every unique URL, then assign a slug derived from the URL's
// own filename (stable across runs).
const urls = new Set();
for (const a of artists) {
  if (Array.isArray(a.images)) for (const u of a.images) if (u) urls.add(u);
}
const sortedUrls = [...urls];

function slugForUrl(u) {
  const url = new URL(u);
  // Use the URL's leaf filename, lowercased and stripped of weird chars.
  // This keeps cache stability — the same URL always maps to the same file.
  const leaf = decodeURIComponent(basename(url.pathname));
  const ext = extname(leaf).toLowerCase() || '.jpg';
  const stem = leaf.slice(0, leaf.length - ext.length)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  // Tag with a short hash of the host+path so different artists with the
  // same filename ("LA2.jpeg") don't collide.
  let h = 0;
  for (let i = 0; i < url.pathname.length; i++) h = (h * 31 + url.pathname.charCodeAt(i)) & 0x7fffffff;
  const hash = h.toString(36).slice(0, 5);
  return `${stem}-${hash}${ext}`;
}

const map = new Map();
for (const u of sortedUrls) map.set(u, slugForUrl(u));

console.log(`${sortedUrls.length} unique images referenced.`);
const missing = sortedUrls.filter(u => !existsSync(join(outDir, map.get(u))));
console.log(`${missing.length} need to be downloaded (${sortedUrls.length - missing.length} already on disk).`);

if (!dryRun && missing.length) {
  console.log(`Downloading ${PARALLEL} at a time…`);

  let done = 0, fail = 0;
  const queue = [...missing];

  async function worker() {
    while (queue.length) {
      const url = queue.shift();
      const filename = map.get(url);
      const dest = join(outDir, filename);
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
        const res = await fetch(url, {
          signal: ac.signal,
          headers: {
            'User-Agent': 'BreweryArtWalkBot/1.0 (+https://github.com/Mattkillsyou/ArtWalk; bundling images for offline iOS app)',
          },
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        writeFileSync(dest, buf);
        done++;
        const sizeKb = Math.round(buf.length / 1024);
        console.log(`  ✓ [${done + fail}/${missing.length}] ${filename} (${sizeKb} KB)`);
      } catch (e) {
        fail++;
        console.warn(`  ✗ [${done + fail}/${missing.length}] ${filename}: ${e.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: PARALLEL }, worker));

  console.log(`\nDone. ${done} downloaded, ${fail} failed.`);
}

// Rewrite artists.json to point at local paths, but ONLY for images we
// actually have on disk. Missing ones keep their original URL so the app
// can still try to fetch them via the service worker.
const out = artists.map(a => {
  if (!Array.isArray(a.images) || !a.images.length) return a;
  return {
    ...a,
    images: a.images.map(u => {
      const slug = map.get(u);
      if (slug && existsSync(join(outDir, slug))) {
        return `img/artists/${slug}`;
      }
      return u;
    }),
  };
});

if (!dryRun) {
  // Pretty-print to keep the diff readable in git.
  writeFileSync(artistsPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nRewrote artists.json — local paths used where the file exists.`);
} else {
  const localCount = out.flatMap(a => a.images || []).filter(u => u.startsWith('img/')).length;
  console.log(`\n[dry] Would rewrite artists.json — ${localCount} image refs would become local paths.`);
}

// Total bundle size summary.
let totalBytes = 0;
for (const u of sortedUrls) {
  const p = join(outDir, map.get(u));
  if (existsSync(p)) totalBytes += statSync(p).size;
}
console.log(`Local images now occupy ${(totalBytes / (1024 * 1024)).toFixed(1)} MB.`);
