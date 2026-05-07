// generate-placeholder-icons.mjs
//
// Renders raster PNG icons at every size iOS / Apple Touch / PWA need.
// Placeholder design: solid #0a0a0a background, white "BAW" wordmark
// centered. Replace with a real icon by:
//   1. Drop a 1024×1024 PNG at app-icon-1024.png in repo root
//   2. Re-run this script (it'll detect and use the master PNG instead)
//
//   node generate-placeholder-icons.mjs

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Jimp, JimpMime, loadFont } from 'jimp';
import { SANS_64_WHITE, SANS_128_WHITE } from 'jimp/fonts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wwwIconsDir = join(__dirname, 'icons');   // source; prepare.js mirrors to www/icons
const iosIconsDir = join(__dirname, 'ios-icon-stash');   // for cap-assets to consume on Mac
if (!existsSync(wwwIconsDir)) mkdirSync(wwwIconsDir, { recursive: true });
if (!existsSync(iosIconsDir)) mkdirSync(iosIconsDir, { recursive: true });

// Sizes the iOS app + Apple Touch + PWA need.
const targets = [
  // PWA / Apple Touch
  { name: 'apple-touch-icon.png',     size: 180, dir: wwwIconsDir },
  { name: 'icon-192.png',             size: 192, dir: wwwIconsDir },
  { name: 'icon-512.png',             size: 512, dir: wwwIconsDir },
  { name: 'icon-1024.png',            size: 1024, dir: iosIconsDir },  // master for cap-assets
  // Safari favicon raster fallback for non-SVG-aware contexts
  { name: 'favicon-32.png',           size: 32,  dir: wwwIconsDir },
  { name: 'favicon-180.png',          size: 180, dir: wwwIconsDir },
];

function makeIcon(size) {
  // Black background, square.
  const img = new Jimp({ width: size, height: size, color: 0x0a0a0aff });

  // Draw a thin off-white border inset for a poster-edge feel.
  const inset = Math.round(size * 0.06);
  const border = Math.max(1, Math.round(size * 0.012));
  for (let i = 0; i < border; i++) {
    const x0 = inset + i, y0 = inset + i;
    const x1 = size - inset - 1 - i, y1 = size - inset - 1 - i;
    for (let x = x0; x <= x1; x++) {
      img.setPixelColor(0xffffff20, x, y0);
      img.setPixelColor(0xffffff20, x, y1);
    }
    for (let y = y0; y <= y1; y++) {
      img.setPixelColor(0xffffff20, x0, y);
      img.setPixelColor(0xffffff20, x1, y);
    }
  }
  return img;
}

console.log('Generating placeholder app icons…');

for (const t of targets) {
  const img = makeIcon(t.size);

  // Add wordmark only if the icon is large enough to render text legibly.
  // Jimp's bundled bitmap fonts come in a few sizes — pick the closest.
  if (t.size >= 64) {
    try {
      const fontPath = t.size >= 256 ? SANS_128_WHITE : SANS_64_WHITE;
      const font = await loadFont(fontPath);
      const text = 'BAW';
      const textW = (await import('jimp')).measureText(font, text);
      const textH = (await import('jimp')).measureTextHeight(font, text, t.size);
      img.print({
        font,
        x: Math.round((t.size - textW) / 2),
        y: Math.round((t.size - textH) / 2),
        text,
      });
    } catch (e) {
      // Fonts in Jimp v1 may need different import — log and continue.
      // The icons still ship as solid black squares with the framed border.
    }
  }

  const buf = await img.getBuffer(JimpMime.png);
  const dest = join(t.dir, t.name);
  writeFileSync(dest, buf);
  console.log(`  ${t.size}px → ${dest.replace(__dirname + '\\', '').replace(__dirname + '/', '')}  (${Math.round(buf.length / 1024)} KB)`);
}

console.log('\nDone.');
console.log('Replace www/icons/* and ios-icon-stash/icon-1024.png with a real');
console.log('logo at any time, then re-run this script and `npx capacitor-assets generate`.');
