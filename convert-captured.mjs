// convert-captured.mjs — turn positions-captured.json (output of capture.html)
// into a POSITIONS object and splice it into index.html.
//
// 1. SPATIAL-AWARE edge snap. Two X edges only cluster if their values are
//    close AND their perpendicular (y) ranges overlap. This stops a polygon
//    vertex on the far side of the campus from pulling an unrelated edge.
//    Cluster spread is also capped at SNAP_TOLERANCE.
// 2. Gap-close pass: rects that overlap horizontally get their vertical
//    edges snapped together (and vice versa) — closes small gaps and small
//    overshoots so adjacent buildings share an edge.
// 3. Overlap-resolution pass: after snap + gap-close, no two rects of
//    DIFFERENT base addresses are allowed to overlap. Sub-units (e.g.
//    618 Moulton Avenue #A vs #B) are intentionally adjacent and never
//    trigger this. Fully-nested rects are also allowed (e.g. 111/112/113
//    inside the 620 polygon — though 620 is a polygon and isn't checked).
//
//   node convert-captured.mjs
//   node prepare.js   # then re-inline + mirror to www/

import { readFileSync, writeFileSync } from 'node:fs';

const SNAP_TOLERANCE = 10;   // values within this px range may cluster — kept under typical cell width so adjacent narrow cells (e.g. 622 #D-G at ~14px each) don't have their separate left-edges merged into one cluster
const SPATIAL_SLACK  = 5;    // perp-range slack: edges 5px apart in perp direction still considered adjacent
const GAP_CLOSE      = 20;   // close vertical/horizontal gaps up to this many px
const MIN_OVERLAP    = 5;    // require this much perp overlap before gap-close

const captured = JSON.parse(readFileSync('positions-captured.json', 'utf8'));

// ----- 1. Edge collection with perpendicular range ---------------------
// Each X edge knows over which Y range it exists (and vice versa) so the
// clustering can be spatially aware. A rect contributes 2 X edges and 2 Y
// edges; a polygon contributes one X-value-with-poly-y-range per vertex.
// Edges are kept by reference so the snap can be read back directly off
// the same object that joined the cluster (avoids the "two clusters share
// a value, picked the wrong one" bug).
const xEdges = [], yEdges = [];
const edgesByShape = {};   // addr → { L,R,T,B } for rects, { verts: [{x,y}…] } for polys

for (const [addr, shape] of Object.entries(captured)) {
  if (shape.type === 'rect') {
    const x1 = shape.x, x2 = shape.x + shape.w;
    const y1 = shape.y, y2 = shape.y + shape.h;
    const eL = { v: x1, min: y1, max: y2, shape: addr, side: 'L' };
    const eR = { v: x2, min: y1, max: y2, shape: addr, side: 'R' };
    const eT = { v: y1, min: x1, max: x2, shape: addr, side: 'T' };
    const eB = { v: y2, min: x1, max: x2, shape: addr, side: 'B' };
    xEdges.push(eL, eR);
    yEdges.push(eT, eB);
    edgesByShape[addr] = { L: eL, R: eR, T: eT, B: eB };
  } else if (shape.type === 'polygon') {
    const nums = shape.points.split(/[\s,]+/).map(parseFloat).filter(n => !Number.isNaN(n));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      if (nums[i]   < minX) minX = nums[i];   if (nums[i]   > maxX) maxX = nums[i];
      if (nums[i+1] < minY) minY = nums[i+1]; if (nums[i+1] > maxY) maxY = nums[i+1];
    }
    const verts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const ex = { v: nums[i],     min: minY, max: maxY, shape: null, side: null };
      const ey = { v: nums[i + 1], min: minX, max: maxX, shape: null, side: null };
      xEdges.push(ex);
      yEdges.push(ey);
      verts.push({ x: ex, y: ey });
    }
    edgesByShape[addr] = { verts };
  }
}

// ----- 2. Spatial-aware clustering -------------------------------------
function rangesOverlap(a, b) {
  return a.min <= b.max + SPATIAL_SLACK && a.max >= b.min - SPATIAL_SLACK;
}

function buildSpatialClusters(edges) {
  // Walk edges sorted by value, joining each into the BEST-FIT existing
  // cluster (closest firstV, ties broken by most recent). Constraints:
  //   (a) e.v within SNAP_TOLERANCE of cluster's firstV
  //   (b) e spatially overlaps at least one cluster member in the perp axis
  //   (c) cluster doesn't already contain the OPPOSITE edge of e's rect
  //       (would collapse the rect to zero width/height)
  // Iterating clusters in REVERSE prefers the most recent cluster, which —
  // since edges are sorted ascending — has the closest firstV. Without this,
  // an edge at v=275 would join an old cluster firstV=260 (diff 15) instead
  // of a better-fitting cluster firstV=275 (diff 0) created moments earlier.
  const sorted = [...edges].sort((a, b) => a.v - b.v);
  const clusters = [];
  for (const e of sorted) {
    let added = false;
    for (let ci = clusters.length - 1; ci >= 0; ci--) {
      const c = clusters[ci];
      if (e.v - c.firstV > SNAP_TOLERANCE) continue;
      if (!c.members.some(m => rangesOverlap(e, m))) continue;
      if (e.shape && c.members.some(m => m.shape === e.shape && m.side !== e.side)) continue;
      c.members.push(e);
      added = true;
      break;
    }
    if (!added) clusters.push({ firstV: e.v, members: [e] });
  }
  // Stamp each edge object with its cluster's snap value. Reading the snap
  // back off the edge avoids the lookup-by-value ambiguity (two clusters
  // can legitimately share a value at their boundaries).
  return clusters.map(c => {
    const sum = c.members.reduce((s, m) => s + m.v, 0);
    const snap = Math.round(sum / c.members.length);
    for (const m of c.members) m.snap = snap;
    let lo = Infinity, hi = -Infinity;
    for (const m of c.members) { if (m.v < lo) lo = m.v; if (m.v > hi) hi = m.v; }
    return { lo, hi, snap, members: c.members };
  });
}

const xClusters = buildSpatialClusters(xEdges);
const yClusters = buildSpatialClusters(yEdges);

console.log(`spatial snap: ${xClusters.length} X clusters, ${yClusters.length} Y clusters`);

// ----- 3. Build POSITIONS, applying snap to every coordinate -----------
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
    const e = edgesByShape[addr];
    const sx1 = e.L.snap, sx2 = e.R.snap, sy1 = e.T.snap, sy2 = e.B.snap;
    part = { type: 'rect', x: sx1, y: sy1, w: sx2 - sx1, h: sy2 - sy1 };
    bbox = part;
  } else if (shape.type === 'polygon') {
    const verts = edgesByShape[addr].verts;
    const xy = [];
    let bMinX = Infinity, bMaxX = -Infinity, bMinY = Infinity, bMaxY = -Infinity;
    for (const v of verts) {
      const sx = v.x.snap, sy = v.y.snap;
      xy.push([sx, sy]);
      if (sx < bMinX) bMinX = sx; if (sx > bMaxX) bMaxX = sx;
      if (sy < bMinY) bMinY = sy; if (sy > bMaxY) bMaxY = sy;
    }
    bbox = { x: bMinX, y: bMinY, w: bMaxX - bMinX, h: bMaxY - bMinY };
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

// ----- 4. Close vertical/horizontal gaps between adjacent rects --------
const rects = [];
for (const [addr, p] of Object.entries(positions)) {
  const part = p.parts[0];
  if (part && part.type === 'rect') rects.push({ addr, ref: part, p });
}

// Two rects are considered "of the same building" if their addresses share
// a common base (i.e. one is a sub-unit of the other). We close gaps between
// these aggressively — sub-units that should be touching almost certainly are.
function baseAddr(addr) {
  // Strip "#X" suffix. Leave "(West)" etc. since e.g. "642 Moulton Avenue (West)"
  // and "642 Moulton Avenue (East)" should be treated as the same building too.
  return addr.split(' #')[0].replace(/\s*\([^)]+\)\s*$/, '');
}

for (let pass = 0; pass < 6; pass++) {
  let changed = false;

  // Vertical: A above B → snap A.bottom = B.top.
  for (const A of rects) {
    const a = A.ref;
    let bestDist = Infinity, bestB = null;
    for (const B of rects) {
      if (A === B) continue;
      const b = B.ref;
      if (a.y + a.h / 2 >= b.y + b.h / 2) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      if (ox < MIN_OVERLAP) continue;
      const diff = b.y - (a.y + a.h);
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

  // Horizontal: A left of B → snap A.right = B.left.
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

// ----- 5. Overlap resolution -------------------------------------------
// After snap + gap-close, no two rects of DIFFERENT base addresses may
// overlap by more than 1 px. Sub-units of the same base address are allowed
// to overlap (intentional: 618 #A-F sit side-by-side and snap together).
// Nested rects (one fully contains the other) are also allowed.
function rectArea(r) { return r.w * r.h; }
function isContained(small, large) {
  return small.x >= large.x - 0.5 && small.y >= large.y - 0.5 &&
         small.x + small.w <= large.x + large.w + 0.5 &&
         small.y + small.h <= large.y + large.h + 0.5;
}

const overlapFixes = [];
for (let pass = 0; pass < 6; pass++) {
  let changed = false;
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const Ar = rects[i], Br = rects[j];
      const A = Ar.ref, B = Br.ref;
      if (baseAddr(Ar.addr) === baseAddr(Br.addr)) continue;
      const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
      const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
      if (ox <= 1 || oy <= 1) continue;
      if (rectArea(A) <= rectArea(B) && isContained(A, B)) continue;
      if (rectArea(B) <= rectArea(A) && isContained(B, A)) continue;

      // Trim along the smaller overlap dimension.
      const smallRef = rectArea(A) < rectArea(B) ? A : B;
      const bigRef = smallRef === A ? B : A;
      const smallName = smallRef === A ? Ar.addr : Br.addr;

      if (ox < oy) {
        // Trim X.
        if (smallRef.x < bigRef.x && smallRef.x + smallRef.w > bigRef.x) {
          smallRef.w = bigRef.x - smallRef.x;
        } else if (smallRef.x + smallRef.w > bigRef.x + bigRef.w && smallRef.x < bigRef.x + bigRef.w) {
          const newX = bigRef.x + bigRef.w;
          smallRef.w = (smallRef.x + smallRef.w) - newX;
          smallRef.x = newX;
        }
      } else {
        // Trim Y.
        if (smallRef.y < bigRef.y && smallRef.y + smallRef.h > bigRef.y) {
          smallRef.h = bigRef.y - smallRef.y;
        } else if (smallRef.y + smallRef.h > bigRef.y + bigRef.h && smallRef.y < bigRef.y + bigRef.h) {
          const newY = bigRef.y + bigRef.h;
          smallRef.h = (smallRef.y + smallRef.h) - newY;
          smallRef.y = newY;
        }
      }
      overlapFixes.push(`${smallName}: trimmed ${ox < oy ? 'horizontally' : 'vertically'} by ${ox < oy ? ox : oy} px`);
      changed = true;
    }
  }
  if (!changed) break;
}

if (overlapFixes.length) {
  console.log(`overlap fixes (${overlapFixes.length}):`);
  for (const m of overlapFixes) console.log('  - ' + m);
} else {
  console.log('overlap fixes: none needed');
}

// Refresh each entry's bbox to match its (possibly grown/trimmed) part.
for (const r of rects) {
  r.p.x = r.ref.x; r.p.y = r.ref.y;
  r.p.w = r.ref.w; r.p.h = r.ref.h;
}

// ----- 6. Splice POSITIONS literal into index.html ---------------------
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
