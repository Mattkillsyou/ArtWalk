// generate-placeholder-icons.mjs
//
// Renders the ArtWalk LA app icon at every size iOS / Apple Touch / PWA need.
// Design (original, unbranded): a black beer-stein silhouette on white — a nod
// to the historic brewery building the studios occupy — with a white navigation
// arrow knocked out of the mug body (the app is a walking map). The vector
// master lives in icons/app-icon.svg; the shapes below are the same geometry
// redrawn in Jimp so the pipeline stays pure-JS (no system deps, works in CI).
// Drawn at 3x supersample and downscaled for clean anti-aliased edges.
//
//   node generate-placeholder-icons.mjs
//
// On a Mac you can also regenerate the full iOS icon set from the 1024 master:
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

const WHITE = 0xFFFFFFFF;
const INK   = 0x15171Cff;          // near-black stein silhouette
const MASTER = 3072;               // supersample canvas
const S = MASTER / 1024;           // design space is 1024x1024 (matches app-icon.svg)

function px(img, x, y, c) { if (x >= 0 && y >= 0 && x < MASTER && y < MASTER) img.setPixelColor(c, x | 0, y | 0); }

function fillRect(img, x, y, w, h, c) {
  const x1 = Math.round(x * S), y1 = Math.round(y * S), x2 = Math.round((x + w) * S), y2 = Math.round((y + h) * S);
  for (let yy = y1; yy < y2; yy++) for (let xx = x1; xx < x2; xx++) px(img, xx, yy, c);
}

function fillEllipse(img, cx, cy, rx, ry, c) {
  cx *= S; cy *= S; rx *= S; ry *= S;
  for (let yy = Math.floor(cy - ry); yy <= Math.ceil(cy + ry); yy++) {
    const dy = (yy - cy) / ry;
    if (dy < -1 || dy > 1) continue;
    const span = rx * Math.sqrt(Math.max(0, 1 - dy * dy));
    for (let xx = Math.round(cx - span); xx <= Math.round(cx + span); xx++) px(img, xx, yy, c);
  }
}

// Even-odd scanline polygon fill. Points are in 1024 design space.
function fillPolygon(img, ptsDesign, c) {
  const pts = ptsDesign.map(([x, y]) => [x * S, y * S]);
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of pts) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
  minY = Math.max(0, Math.floor(minY)); maxY = Math.min(MASTER - 1, Math.ceil(maxY));
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]);
      for (let x = xa; x < xb; x++) px(img, x, y, c);
    }
  }
}

function drawMaster() {
  const img = new Jimp({ width: MASTER, height: MASTER, color: WHITE });
  // Handle: black outer ellipse with a white inner punch; the body (next) covers
  // the left join so it reads as an open C-handle.
  fillEllipse(img, 736, 556, 92, 112, INK);
  fillEllipse(img, 728, 556, 44, 62, WHITE);
  // Mug body — slight taper, rounded bottom.
  fillPolygon(img, [[306, 392], [654, 392], [642, 786], [636, 806], [618, 820], [606, 822],
                    [354, 822], [342, 820], [324, 806], [318, 786]], INK);
  // Foam head — a band plus overlapping bumps.
  fillRect(img, 294, 362, 366, 46, INK);
  for (const [cx, cy, r] of [[330, 356, 52], [398, 330, 60], [470, 340, 56], [542, 330, 58],
                             [612, 356, 50], [432, 308, 44], [510, 308, 44]])
    fillEllipse(img, cx, cy, r, r, INK);
  // Navigation arrow — knocked out of the body in white.
  fillPolygon(img, [[480, 486], [582, 728], [480, 678], [378, 728]], WHITE);
  return img;
}

console.log('Rendering ArtWalk LA app icons (beer-stein + navigation arrow)…');
const master = drawMaster();
for (const t of targets) {
  const img = master.clone().resize({ w: t.size, h: t.size });
  // colorType 2 = RGB, no alpha channel — App Store icons must not be transparent.
  const buf = await img.getBuffer(JimpMime.png, { colorType: 2 });
  const dest = join(t.dir, t.name);
  writeFileSync(dest, buf);
  console.log(`  ${t.size}px → ${dest.replace(__dirname + '/', '')}  (${Math.round(buf.length / 1024)} KB)`);
}
console.log('\nDone. Vector master: icons/app-icon.svg');
