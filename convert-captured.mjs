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

    // Polygon area via shoelace.
    let area2 = 0;
    for (let i = 0; i < xy.length; i++) {
      const [x1, y1] = xy[i];
      const [x2, y2] = xy[(i + 1) % xy.length];
      area2 += x1 * y2 - x2 * y1;
    }
    const polyArea = Math.abs(area2) / 2;
    const bboxArea = bbox.w * bbox.h;
    const fillRatio = bboxArea > 0 ? polyArea / bboxArea : 0;

    // Real parallelograms / L-shapes fill ~55-90% of their bbox.
    // Mis-clicked triangles fill <50%. Promote those to a clean rect.
    if (fillRatio < 0.55) {
      part = { type: 'rect', x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h };
    } else {
      part = { type: 'polygon', points: xy.map(p => p[0] + ',' + p[1]).join(' ') };
    }
  } else {
    continue;
  }

  positions[addr] = {
    x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h,
    short,
    parts: [part],
  };
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
