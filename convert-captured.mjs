// convert-captured.mjs — turn positions-captured.json (output of capture.html)
// into a POSITIONS object and splice it into index.html.
//
// 1. Snap near-coincident X and Y coordinates so manually-clicked shapes
//    that "should" share an edge actually do (cluster spread capped at
//    SNAP_TOLERANCE so a long chain can't drag the whole cluster).
// 2. Each captured address becomes its own POSITIONS entry with one part.
//    Sub-units like "618 Moulton Avenue #A" stay as their own entries.
//
//   node convert-captured.mjs
//   node prepare.js   # then re-inline + mirror to www/

import { readFileSync, writeFileSync } from 'node:fs';

const SNAP_TOLERANCE = 15;
const captured = JSON.parse(readFileSync('positions-captured.json', 'utf8'));

// ----- 1. Edge snapping ------------------------------------------------
// Collect every X edge and Y edge from every shape.
const xs = [], ys = [];
for (const shape of Object.values(captured)) {
  if (shape.type === 'rect') {
    xs.push(shape.x, shape.x + shape.w);
    ys.push(shape.y, shape.y + shape.h);
  } else if (shape.type === 'polygon') {
    const nums = shape.points.split(/[\s,]+/).map(parseFloat).filter(n => !Number.isNaN(n));
    for (let i = 0; i + 1 < nums.length; i += 2) {
      xs.push(nums[i]);
      ys.push(nums[i + 1]);
    }
  }
}

// Cap each cluster's spread at tolerance so a chain of values 7px apart
// each can't span 50px collectively. A value joins the current cluster only
// if it's within tolerance of the cluster's FIRST value.
function buildClusters(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const clusters = [];
  let cur = [];
  for (const v of sorted) {
    if (cur.length === 0 || v - cur[0] <= SNAP_TOLERANCE) cur.push(v);
    else { clusters.push(cur); cur = [v]; }
  }
  if (cur.length) clusters.push(cur);
  return clusters.map(c => ({
    lo: c[0],
    hi: c[c.length - 1],
    snap: Math.round(c.reduce((a, b) => a + b, 0) / c.length),
  }));
}

const xClusters = buildClusters(xs);
const yClusters = buildClusters(ys);

function snap(v, clusters) {
  for (const c of clusters) {
    if (v >= c.lo - 0.001 && v <= c.hi + 0.001) return c.snap;
  }
  return Math.round(v);
}

console.log(`snap: ${xClusters.length} unique X edges, ${yClusters.length} unique Y edges`);

// ----- 2. Build POSITIONS, applying snap to every coordinate -----------
const positions = {};
for (const [addr, shape] of Object.entries(captured)) {
  // Sub-units like "618 Moulton Avenue #A" label as "A" (the unit only) so
  // a row of cells shows A B C D E F rather than five "618"s. Parents like
  // "618 Moulton Avenue" label as "618" (the building number).
  let short;
  if (addr.includes(' #')) {
    short = addr.split(' #').pop();
  } else {
    short = (addr.match(/^\d+/) || [addr])[0];
  }

  let part, bbox;
  if (shape.type === 'rect') {
    const x1 = snap(shape.x, xClusters);
    const y1 = snap(shape.y, yClusters);
    const x2 = snap(shape.x + shape.w, xClusters);
    const y2 = snap(shape.y + shape.h, yClusters);
    part = { type: 'rect', x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    bbox = part;
  } else if (shape.type === 'polygon') {
    const nums = shape.points.split(/[\s,]+/).map(parseFloat).filter(n => !Number.isNaN(n));
    const snapped = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      snapped.push(snap(nums[i], xClusters), snap(nums[i + 1], yClusters));
    }
    const xy = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i + 1 < snapped.length; i += 2) {
      xy.push([snapped[i], snapped[i + 1]]);
      if (snapped[i]   < minX) minX = snapped[i];   if (snapped[i]   > maxX) maxX = snapped[i];
      if (snapped[i+1] < minY) minY = snapped[i+1]; if (snapped[i+1] > maxY) maxY = snapped[i+1];
    }
    bbox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    // Keep every polygon as-drawn — the user's intentional triangles
    // (e.g. 688 #A and 692 #B that form the diagonal east point of the
    // SW cluster) are NOT mis-clicks. Auto-converting them to bounding
    // rects destroys the building's pentagon outline.
    part = { type: 'polygon', points: xy.map(p => p[0] + ',' + p[1]).join(' ') };
  } else {
    continue;
  }

  positions[addr] = {
    x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h,
    short,
    parts: [part],
  };
}

// ----- 2b. Close vertical gaps between horizontally-overlapping rects -----
// The global edge-cluster snap is purely numeric and can pull together edges
// from buildings on opposite sides of the campus. This pass only operates on
// rects that actually overlap horizontally — closing the small remaining
// gap between, e.g., 650 S. Ave 21's bottom and 686/674's top.
const rects = [];
for (const [addr, p] of Object.entries(positions)) {
  const part = p.parts[0];
  if (part && part.type === 'rect') rects.push({ addr, ref: part, p });
}

const GAP_CLOSE = 20;       // close vertical gaps up to this many px
const MIN_OVERLAP = 5;      // require this much horizontal overlap

// Close both gaps AND small overlaps. A and B should share an edge if their
// edges are within tolerance, regardless of which side overshoots.
for (let pass = 0; pass < 6; pass++) {
  let changed = false;

  // Vertical: A above B, snap A.bottom = B.top.
  for (const A of rects) {
    const a = A.ref;
    let bestDist = Infinity, bestB = null;
    for (const B of rects) {
      if (A === B) continue;
      const b = B.ref;
      // A must be above B (centers).
      if (a.y + a.h / 2 >= b.y + b.h / 2) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      if (ox < MIN_OVERLAP) continue;
      const diff = b.y - (a.y + a.h);  // positive = gap, negative = overlap
      const d = Math.abs(diff);
      if (d <= GAP_CLOSE && d < bestDist) {
        bestDist = d; bestB = b;
      }
    }
    if (bestB) {
      const newBottom = bestB.y;
      if (a.h !== newBottom - a.y) { a.h = newBottom - a.y; changed = true; }
    }
  }

  // Horizontal: A to the left of B, snap A.right = B.left.
  for (const A of rects) {
    const a = A.ref;
    let bestDist = Infinity, bestB = null;
    for (const B of rects) {
      if (A === B) continue;
      const b = B.ref;
      if (a.x + a.w / 2 >= b.x + b.w / 2) continue;
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (oy < MIN_OVERLAP) continue;
      const diff = b.x - (a.x + a.w);
      const d = Math.abs(diff);
      if (d <= GAP_CLOSE && d < bestDist) {
        bestDist = d; bestB = b;
      }
    }
    if (bestB) {
      const newRight = bestB.x;
      if (a.w !== newRight - a.x) { a.w = newRight - a.x; changed = true; }
    }
  }
  if (!changed) break;
}

// Refresh each entry's bbox to match its (possibly grown) part.
for (const r of rects) {
  r.p.x = r.ref.x; r.p.y = r.ref.y;
  r.p.w = r.ref.w; r.p.h = r.ref.h;
}

// ----- 3. Splice POSITIONS literal into index.html ---------------------
const lines = ['  const POSITIONS = {'];
for (const [addr, p] of Object.entries(positions)) {
  const partStr = JSON.stringify(p.parts[0]);
  lines.push(`    ${JSON.stringify(addr)}: { x: ${p.x}, y: ${p.y}, w: ${p.w}, h: ${p.h}, short: ${JSON.stringify(p.short)}, parts: [${partStr}] },`);
}
lines.push('  };');
const positionsBlock = lines.join('\n');

let html = readFileSync('index.html', 'utf8');
const start = html.indexOf('const POSITIONS = {');
if (start === -1) throw new Error('POSITIONS not found in index.html');
let depth = 0, end = -1;
for (let i = start; i < html.length; i++) {
  if (html[i] === '{') depth++;
  else if (html[i] === '}') {
    depth--;
    if (depth === 0) {
      const semi = html.indexOf(';', i);
      end = semi !== -1 ? semi + 1 : i + 1;
      break;
    }
  }
}
html = html.slice(0, start) + positionsBlock.trimStart() + html.slice(end);
writeFileSync('index.html', html);
console.log(`Wrote ${Object.keys(positions).length} POSITIONS entries to index.html`);
