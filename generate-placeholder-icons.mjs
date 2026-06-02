// generate-placeholder-icons.mjs
//
// Renders the ArtWalk LA app icon at every size iOS / Apple Touch / PWA need.
// Design (original, unbranded): a solid black beer-stein silhouette on white —
// a nod to the historic brewery building the studios occupy — with a white
// navigation arrow knocked out of the mug body (the app is a walking map). The
// mug fills the tile, the C-handle is joined to the body, and the composition is
// optically centred. Pure black on white, no gradients. The vector master lives
// in icons/app-icon.svg; the geometry below is the same, redrawn in Jimp so the
// pipeline stays pure-JS (no system deps, CI-safe). 2x supersampled + downscaled.
//
//   node generate-placeholder-icons.mjs

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

const MASTER = 2048, S = MASTER / 1024;   // supersample; design space is 1024
const OX = -5, OY = -26;                  // centered on the ink center-of-mass (design space)

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const toInt = c => (Math.round(cl(c[0], 0, 255)) * 0x1000000 + Math.round(cl(c[1], 0, 255)) * 0x10000 + Math.round(cl(c[2], 0, 255)) * 0x100 + 255);
const solid = c => () => c;

function paint(img, x, y, shade) { if (x >= 0 && y >= 0 && x < MASTER && y < MASTER) img.setPixelColor(toInt(shade(x / MASTER, y / MASTER)), x, y); }
const T = p => [(p[0] + OX) * S, (p[1] + OY) * S];

function fillPoly(img, ptsD, shade) {
  const pts = ptsD.map(T);
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
    for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]); for (let x = xa; x < xb; x++) paint(img, x, y, shade); }
  }
}
function fillEllipse(img, cxD, cyD, rxD, ryD, shade) {
  const [cx, cy] = T([cxD, cyD]); const rx = rxD * S, ry = ryD * S;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const dy = (y - cy) / ry; if (dy < -1 || dy > 1) continue;
    const sp = rx * Math.sqrt(Math.max(0, 1 - dy * dy));
    for (let x = Math.round(cx - sp); x <= Math.round(cx + sp); x++) paint(img, x, y, shade);
  }
}
function fillRect(img, xD, yD, wD, hD, shade) {
  const [x1, y1] = T([xD, yD]); const x2 = (xD + wD + OX) * S, y2 = (yD + hD + OY) * S;
  for (let y = Math.round(y1); y < Math.round(y2); y++) for (let x = Math.round(x1); x < Math.round(x2); x++) paint(img, x, y, shade);
}
// Thick stroked path (round caps) — the C-handle, so it joins the body cleanly.
function strokePath(img, ptsD, rD, shade) {
  for (let i = 0; i < ptsD.length - 1; i++) {
    const a = ptsD[i], b = ptsD[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (rD * 0.45)));
    for (let s = 0; s <= steps; s++) { const t = s / steps; fillEllipse(img, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, rD, rD, shade); }
  }
}

// ---- geometry (1024 design space) — foamless tankard: flat top, slight taper, rounded bottom ----
const BODY = [[300, 235], [660, 235], [644, 836], [634, 858], [612, 872], [598, 873], [362, 873], [348, 872], [326, 858], [316, 836]];
// Smooth C-handle: right half of an ellipse so the curve is clean.
const HANDLE = (() => { const cx = 652, cy = 500, rx = 168, ry = 120, p = []; for (let i = 0; i <= 30; i++) { const a = (-90 + i / 30 * 180) * Math.PI / 180; p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return p; })();
const HANDLE_R = 33;
const ARROW = [[480, 419], [590, 689], [480, 635], [370, 689]];

function drawMaster() {
  const img = new Jimp({ width: MASTER, height: MASTER, color: 0xFFFFFFFF });  // white tile
  const ink = solid(hex('#000000')), white = solid(hex('#FFFFFF'));
  strokePath(img, HANDLE, HANDLE_R, ink);            // handle first; body covers the join
  fillPoly(img, BODY, ink);
  fillPoly(img, ARROW, white);                       // navigation arrow knocked out
  return img;
}

console.log('Rendering ArtWalk LA app icons (black beer-stein + navigation arrow)…');
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
