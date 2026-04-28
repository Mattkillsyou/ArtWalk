// match-final.mjs — read every shape from the user's template.svg, claim each
// for the closest building address in buildings.json (using a label-position
// table that combines OCR results with eyeballed estimates), then emit a
// POSITIONS object grouping all claimed shapes per address as `parts`.
//
// Output:
//   positions.json           — full machine-readable mapping
//   index.html               — POSITIONS block in-place replaced
//
//   node match-final.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const { shapes } = JSON.parse(readFileSync('template-shapes.json', 'utf8'));
const buildings  = JSON.parse(readFileSync('buildings.json', 'utf8'));

// Where each address's printed label appears on map_greyscale.jpg.
// OCR-confirmed (high-conf single tokens) marked with [OCR].
const ADDR_LABELS = {
  "1910 N. Main Street":   [180,  95],
  "1980 N. Main Street":   [285, 100],
  "1984 N. Main Street":   [474,  81],   // [OCR]
  "2020 N. Main Street":   [660, 119],   // [OCR]
  "2100 N. Main Street":   [798, 129],   // [OCR]
  "602 Moulton Avenue":    [285, 200],
  "604 Moulton Avenue":    [425, 175],
  "610 Moulton Avenue":    [560, 175],
  "612 Moulton Avenue":    [595, 200],
  "1930 N. Main Street":   [310, 215],
  "1940 N. Main Street":   [340, 215],
  "1950 N. Main Street":   [370, 215],
  "1960 N. Main Street":   [395, 215],
  "600 Moulton Avenue":    [488, 303],   // [OCR]
  "620 Moulton Avenue":    [690, 462],   // [OCR]
  "624 Moulton Avenue":    [924, 497],   // [OCR]
  "626 Moulton Avenue":    [800, 360],
  "621 Avenue 21":         [845, 360],
  "622 Moulton Avenue":    [815, 425],
  "645 Moulton Avenue":    [880, 425],
  "660 South Avenue 21":   [837, 575],   // [OCR]
  "618 Moulton Avenue":    [445, 350],
  "1918 N. Main Street":   [220, 470],
  "1920 N. Main Street":   [300, 470],
  "650 Moulton Avenue":    [115, 460],
  "632 Moulton Avenue":    [395, 425],
  "634 Moulton Avenue":    [395, 450],
  "638 Moulton Avenue":    [395, 480],
  "642 Moulton Avenue":    [475, 755],
  "670 Moulton Avenue":    [530, 590],
  "672 South Avenue 21":   [645, 645],
  "650 South Avenue 21":   [905, 700],
  "676 South Avenue 21":   [905, 715],
  "696 Moulton Avenue":    [165, 720],
  "690 Moulton Avenue":    [260, 808],   // [OCR]
  "692 Moulton Avenue":    [245, 790],
};

const dist = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1]);
const inBox = (px, py, b) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
const area = (s) => s.bbox.w * s.bbox.h;

// For each address: find the smallest shape whose bbox contains the label,
// preferring green (sub-unit) over red (outer outline). If nothing contains,
// fall back to nearest centroid within a generous tolerance.
const groups = new Map();
const placeholderAddrs = new Set();
for (const [addr, [lx, ly]] of Object.entries(ADDR_LABELS)) {
  const containing = shapes.filter(s =>
    (s.category === 'red' || s.category === 'green') && inBox(lx, ly, s.bbox)
  );
  containing.sort((a, b) => {
    const ag = a.category === 'green' ? 0 : 1;
    const bg = b.category === 'green' ? 0 : 1;
    if (ag !== bg) return ag - bg;
    return area(a) - area(b);
  });

  const claimed = [];
  if (containing.length > 0) {
    claimed.push(containing[0]);
    // Also collect any further shapes that the address rightfully owns:
    // sub-rects of the same building (other greens whose centroid is inside
    // the chosen shape, but whose label isn't a different address).
    for (const s of shapes) {
      if (s.category !== 'green' || s === containing[0]) continue;
      const cx = s.bbox.x + s.bbox.w / 2;
      const cy = s.bbox.y + s.bbox.h / 2;
      if (!inBox(cx, cy, containing[0].bbox)) continue;
      // Skip if another address's label lands inside this candidate.
      let stolen = false;
      for (const [otherAddr, [ox, oy]] of Object.entries(ADDR_LABELS)) {
        if (otherAddr === addr) continue;
        if (inBox(ox, oy, s.bbox)) { stolen = true; break; }
      }
      if (!stolen) claimed.push(s);
    }
  } else {
    // No containing shape — try nearest by centroid within 200px.
    let best = null, bestD = Infinity;
    for (const s of shapes) {
      if (s.category !== 'red' && s.category !== 'green') continue;
      const cx = s.bbox.x + s.bbox.w / 2, cy = s.bbox.y + s.bbox.h / 2;
      const d = dist([cx, cy], [lx, ly]);
      if (d < bestD) { bestD = d; best = s; }
    }
    if (best && bestD < 200) claimed.push(best);
  }

  if (claimed.length > 0) groups.set(addr, claimed);
  else placeholderAddrs.add(addr);
}

// Build POSITIONS. For each address: union bbox of its shapes, plus a parts
// array carrying the original geometry so renderMap() can draw the real outlines.
const positions = {};
for (const [addr, addrShapes] of groups) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const s of addrShapes) {
    if (s.bbox.x < minX) minX = s.bbox.x;
    if (s.bbox.x + s.bbox.w > maxX) maxX = s.bbox.x + s.bbox.w;
    if (s.bbox.y < minY) minY = s.bbox.y;
    if (s.bbox.y + s.bbox.h > maxY) maxY = s.bbox.y + s.bbox.h;
  }
  positions[addr] = {
    x: +minX.toFixed(2),
    y: +minY.toFixed(2),
    w: +(maxX - minX).toFixed(2),
    h: +(maxY - minY).toFixed(2),
    short: (addr.match(/^\d+/) || [addr])[0],
    parts: addrShapes.map(s => s.geom),
  };
}

// Synthesize placeholder positions for addresses with no claimed shape so the
// app still has all 35+1 buildings on the map.
for (const [addr, [lx, ly]] of Object.entries(ADDR_LABELS)) {
  if (positions[addr]) continue;
  positions[addr] = {
    x: lx - 25, y: ly - 25, w: 50, h: 50,
    short: (addr.match(/^\d+/) || [addr])[0],
    parts: [{ type: 'rect', x: lx - 25, y: ly - 25, w: 50, h: 50 }],
    placeholder: true,
  };
}

// Reporting
const claimed = Object.entries(positions).filter(([, p]) => !p.placeholder);
const placeholders = Object.entries(positions).filter(([, p]) => p.placeholder);
console.log(`addresses claimed from SVG: ${claimed.length}`);
console.log(`addresses needing placeholder: ${placeholders.length}`);
for (const [addr] of placeholders) console.log('  PLACEHOLDER  ' + addr);

writeFileSync('positions.json', JSON.stringify(positions, null, 2));
console.log('\nwrote positions.json');

// Emit a POSITIONS JS literal ready to paste into index.html.
const lines = ['  const POSITIONS = {'];
for (const [addr, p] of Object.entries(positions)) {
  const head = `    ${JSON.stringify(addr)}: { x: ${p.x}, y: ${p.y}, w: ${p.w}, h: ${p.h}, short: ${JSON.stringify(p.short)}`;
  if (p.parts && p.parts.length) {
    const parts = p.parts.map(g => JSON.stringify(g)).join(', ');
    lines.push(`${head}, parts: [${parts}] },`);
  } else {
    lines.push(`${head} },`);
  }
}
lines.push('  };');
writeFileSync('positions.js', lines.join('\n'));
console.log('wrote positions.js (POSITIONS block ready to paste)');

// Surface unclaimed shapes so the user can see what we *didn't* use.
const claimedSet = new Set();
for (const arr of groups.values()) for (const s of arr) claimedSet.add(s);
let unclaimedCount = 0;
for (const s of shapes) {
  if (s.category !== 'green' && s.category !== 'red') continue;
  if (claimedSet.has(s)) continue;
  unclaimedCount++;
}
console.log(`shapes drawn but unclaimed (extra sub-units, intentionally skipped): ${unclaimedCount}`);
