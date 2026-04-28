// match-labels.mjs — match each building address from buildings.json to the
// shape in template.svg that contains its printed label on the campus map.
//
// Label coords are eyeballed from map_greyscale.jpg. For each address we
// pick the smallest user-drawn shape whose bbox contains the label point,
// preferring GREEN (sections) over RED (outer outlines) since green more
// closely matches addressable units.
//
//   node match-labels.mjs   # writes positions.json + a JS snippet on stdout

import { readFileSync, writeFileSync } from 'node:fs';

const { shapes } = JSON.parse(readFileSync('template-shapes.json', 'utf8'));
const buildings = JSON.parse(readFileSync('buildings.json', 'utf8'));

// Approx label centers from map_greyscale.jpg (1019 × 913). Eyeballed but
// the matcher is forgiving — anything inside the right shape works.
const LABELS = {
  // Top row, fronting N. Main Street
  "1910 N. Main Street":   [180, 95],
  "1984 N. Main Street":   [440, 70],
  "2020 N. Main Street":   [635, 80],
  "2100 N. Main Street":   [840, 100],

  // West stack south of 1984 (vertical labels)
  "1980 N. Main Street":   [280, 105],
  "602 Moulton Avenue":    [280, 200],

  // Studio row inside south face of 1984
  "604 Moulton Avenue":    [425, 175],
  "610 Moulton Avenue":    [560, 175],

  // 612 vertical strip + 1930-50 small row north of 600
  "612 Moulton Avenue":    [625, 200],
  "1930 N. Main Street":   [310, 215],
  "1940 N. Main Street":   [340, 215],
  "1950 N. Main Street":   [370, 215],
  "1960 N. Main Street":   [395, 215],   // not labeled on map; place east of 1950

  // Central core
  "600 Moulton Avenue":    [465, 255],
  "620 Moulton Avenue":    [640, 380],

  // East cluster (626 / 621 / 624 / 622) plus 645
  "626 Moulton Avenue":    [800, 360],
  "621 Avenue 21":         [845, 360],
  "624 Moulton Avenue":    [835, 390],
  "622 Moulton Avenue":    [815, 425],
  "645 Moulton Avenue":    [880, 425],

  // East side along S Ave 21
  "660 South Avenue 21":   [905, 470],
  "650 South Avenue 21":   [905, 700],
  "676 South Avenue 21":   [905, 715],
  "672 South Avenue 21":   [645, 645],

  // 1918/1920 + 618 + 650 Moulton
  "1918 N. Main Street":   [220, 475],
  "1920 N. Main Street":   [300, 480],
  "618 Moulton Avenue":    [440, 350],
  "650 Moulton Avenue":    [140, 460],

  // 630-638 vertical strip (data has 632/634/638 separately)
  "632 Moulton Avenue":    [395, 450],
  "634 Moulton Avenue":    [395, 470],
  "638 Moulton Avenue":    [395, 490],

  // 642 Moulton (the W/E wings; we'll prefer the bigger red outline that covers both)
  "642 Moulton Avenue":    [445, 670],

  // 670 Moulton — data position description "south-center, near garden"
  "670 Moulton Avenue":    [530, 590],

  // SW cluster
  "696 Moulton Avenue":    [115, 700],
  "690 Moulton Avenue":    [200, 700],
  "692 Moulton Avenue":    [250, 790],
};

function shapeArea(s) { return s.bbox.w * s.bbox.h; }

function pointInBox(px, py, b) {
  return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
}

const matches = {};
const unmatched = [];

for (const [addr, [lx, ly]] of Object.entries(LABELS)) {
  // 1) shapes whose bbox contains the label
  const candidates = shapes.filter(s =>
    (s.category === 'red' || s.category === 'green') &&
    pointInBox(lx, ly, s.bbox)
  );

  // 2) prefer green over red, then smallest area (most specific)
  candidates.sort((a, b) => {
    const ag = a.category === 'green' ? 0 : 1;
    const bg = b.category === 'green' ? 0 : 1;
    if (ag !== bg) return ag - bg;
    return shapeArea(a) - shapeArea(b);
  });

  if (candidates.length > 0) {
    matches[addr] = { shape: candidates[0], confidence: 'contains', label: [lx, ly] };
    continue;
  }

  // 3) Fallback: closest centroid distance
  let best = null, bestD = Infinity;
  for (const s of shapes) {
    if (s.category !== 'red' && s.category !== 'green') continue;
    const cx = s.bbox.x + s.bbox.w / 2;
    const cy = s.bbox.y + s.bbox.h / 2;
    const d = Math.hypot(cx - lx, cy - ly);
    if (d < bestD) { bestD = d; best = s; }
  }
  if (best && bestD < 50) {
    matches[addr] = { shape: best, confidence: 'nearest', label: [lx, ly], dist: bestD };
  } else {
    unmatched.push({ addr, label: [lx, ly], dist: bestD });
  }
}

console.log(`matched ${Object.keys(matches).length} / ${Object.keys(LABELS).length} labels`);
if (unmatched.length) {
  console.log('UNMATCHED:');
  unmatched.forEach(u => console.log(`  ${u.addr} at (${u.label[0]},${u.label[1]}), nearest dist=${u.dist.toFixed(1)}`));
}

// ---- Write positions.json (machine readable) ----
const positions = {};
for (const [addr, { shape, confidence, label }] of Object.entries(matches)) {
  positions[addr] = {
    x: +shape.bbox.x.toFixed(2),
    y: +shape.bbox.y.toFixed(2),
    w: +shape.bbox.w.toFixed(2),
    h: +shape.bbox.h.toFixed(2),
    short: addr.match(/^\d+/) ? addr.match(/^\d+/)[0] : addr,
    geom: shape.geom,
    via: confidence,
  };
}
writeFileSync('positions.json', JSON.stringify(positions, null, 2));
console.log('wrote positions.json');

// ---- Print a JS POSITIONS snippet ready to paste into index.html ----
console.log('\n----- POSITIONS snippet -----');
console.log('const POSITIONS = {');
for (const [addr, p] of Object.entries(positions)) {
  let line = `  ${JSON.stringify(addr)}: { x: ${p.x}, y: ${p.y}, w: ${p.w}, h: ${p.h}, short: "${p.short}"`;
  if (p.geom && p.geom.type !== 'rect') {
    line += `, geom: ${JSON.stringify(p.geom)}`;
  }
  line += ' },';
  console.log(line);
}
console.log('};');

// Coverage check
const dataAddresses = new Set(buildings.map(b => b.address));
dataAddresses.add("621 Avenue 21");
const matchedAddresses = new Set(Object.keys(positions));
const missingFromData = [...matchedAddresses].filter(a => !dataAddresses.has(a));
const missingFromPositions = [...dataAddresses].filter(a => !matchedAddresses.has(a));
console.log('\n----- Coverage -----');
console.log(`buildings.json (+ orphan): ${dataAddresses.size}, matched: ${matchedAddresses.size}`);
if (missingFromPositions.length) console.log('IN DATA BUT NOT MATCHED:', missingFromPositions);
if (missingFromData.length)      console.log('MATCHED BUT NOT IN DATA:', missingFromData);
