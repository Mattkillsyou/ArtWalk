// generate-placeholder-icons.mjs
//
// Renders raster PNG icons at every size iOS / Apple Touch / PWA need.
// Neutral placeholder design (no wordmark, no trademark, not a map trace):
// solid #0a0a0a background, four abstract white "studio" blocks leaving a
// cross-shaped street gap, and a blue "you are here" dot at the crossing.
// Mirrors the vector master in app-icon-1024.svg / icons/favicon.svg.
//
//   node generate-placeholder-icons.mjs
//
// On a Mac you can then regenerate the full iOS icon set from the 1024 master:
//   npx capacitor-assets generate --iconSourcePath ios-icon-stash/icon-1024.png

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Jimp, JimpMime } from 'jimp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wwwIconsDir = join(__dirname, 'icons');            // source; prepare.js mirrors to www/icons
const iosIconsDir = join(__dirname, 'ios-icon-stash');   // master for cap-assets to consume on Mac
if (!existsSync(wwwIconsDir)) mkdirSync(wwwIconsDir, { recursive: true });
if (!existsSync(iosIconsDir)) mkdirSync(iosIconsDir, { recursive: true });

const targets = [
  { name: 'apple-touch-icon.png', size: 180,  dir: wwwIconsDir },
  { name: 'icon-192.png',         size: 192,  dir: wwwIconsDir },
  { name: 'icon-512.png',         size: 512,  dir: wwwIconsDir },
  { name: 'icon-1024.png',        size: 1024, dir: iosIconsDir },  // master for cap-assets
  { name: 'favicon-32.png',       size: 32,   dir: wwwIconsDir },
  { name: 'favicon-180.png',      size: 180,  dir: wwwIconsDir },
];

const BG = 0x0a0a0aff, BLOCK = 0xecececff, DOT = 0x3b82f6ff;

function fillRect(img, x, y, w, h, color) {
  const x1 = Math.round(x), y1 = Math.round(y), x2 = Math.round(x + w), y2 = Math.round(y + h);
  for (let yy = y1; yy < y2; yy++) for (let xx = x1; xx < x2; xx++) img.setPixelColor(color, xx, yy);
}
function fillCircle(img, cx, cy, r, color) {
  const r2 = r * r;
  for (let yy = Math.round(cy - r); yy <= cy + r; yy++) {
    for (let xx = Math.round(cx - r); xx <= cx + r; xx++) {
      const dx = xx - cx, dy = yy - cy;
      if (dx * dx + dy * dy <= r2) img.setPixelColor(color, xx, yy);
    }
  }
}

function makeIcon(size) {
  const img = new Jimp({ width: size, height: size, color: BG });
  const u = v => v * size;
  fillRect(img, u(0.16), u(0.16), u(0.30), u(0.30), BLOCK);  // top-left
  fillRect(img, u(0.54), u(0.16), u(0.30), u(0.18), BLOCK);  // top-right
  fillRect(img, u(0.54), u(0.40), u(0.30), u(0.44), BLOCK);  // right (tall)
  fillRect(img, u(0.16), u(0.54), u(0.30), u(0.30), BLOCK);  // bottom-left
  fillCircle(img, u(0.50), u(0.50), size * 0.053, BG);       // dark ring
  fillCircle(img, u(0.50), u(0.50), size * 0.039, DOT);      // you-are-here dot
  return img;
}

console.log('Generating neutral placeholder app icons…');
for (const t of targets) {
  const img = makeIcon(t.size);
  const buf = await img.getBuffer(JimpMime.png);
  const dest = join(t.dir, t.name);
  writeFileSync(dest, buf);
  console.log(`  ${t.size}px → ${dest.replace(__dirname + '/', '')}  (${Math.round(buf.length / 1024)} KB)`);
}
console.log('\nDone. Replace icons/* and ios-icon-stash/icon-1024.png with a real logo any time.');
