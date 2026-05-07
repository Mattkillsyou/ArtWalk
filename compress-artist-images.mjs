// compress-artist-images.mjs
//
// Resizes and re-encodes every image in www/img/artists/ down to a
// reasonable size for an iOS app bundle. The originals (53 MB across
// 197 images) come straight from the WordPress server at native
// resolution; they're way larger than the app actually needs.
//
// Output: same filename, max 1280 px on the longest side, JPEG quality
// 78. Typical 200-400 KB → 30-80 KB.
//
//   node compress-artist-images.mjs

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Jimp } from 'jimp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, 'img', 'artists');
const MAX_DIM = 1280;
const QUALITY = 78;

const files = readdirSync(dir).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
console.log(`Compressing ${files.length} images (max ${MAX_DIM}px, JPEG q${QUALITY})…`);

let beforeBytes = 0, afterBytes = 0, errors = 0;

for (let i = 0; i < files.length; i++) {
  const f = files[i];
  const p = join(dir, f);
  beforeBytes += statSync(p).size;
  try {
    const img = await Jimp.read(p);
    const longSide = Math.max(img.bitmap.width, img.bitmap.height);
    if (longSide > MAX_DIM) {
      const scale = MAX_DIM / longSide;
      img.resize({ w: Math.round(img.bitmap.width * scale), h: Math.round(img.bitmap.height * scale) });
    }
    // Always write as JPEG for consistency.
    const ext = extname(f).toLowerCase();
    const buf = await img.getBuffer('image/jpeg', { quality: QUALITY });
    writeFileSync(p, buf);
    afterBytes += buf.length;
    if ((i + 1) % 25 === 0 || i === files.length - 1) {
      const pct = Math.round((i + 1) / files.length * 100);
      console.log(`  ${pct}%  ${i + 1}/${files.length}`);
    }
  } catch (e) {
    errors++;
    console.warn(`  ✗ ${f}: ${e.message}`);
    afterBytes += statSync(p).size;
  }
}

const beforeMb = (beforeBytes / 1024 / 1024).toFixed(1);
const afterMb  = (afterBytes  / 1024 / 1024).toFixed(1);
const savedMb  = ((beforeBytes - afterBytes) / 1024 / 1024).toFixed(1);
console.log(`\nDone. ${beforeMb} MB → ${afterMb} MB  (saved ${savedMb} MB).  ${errors} errors.`);
