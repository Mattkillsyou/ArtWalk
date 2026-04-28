// parse-template.mjs — pull shapes out of template.svg, group by color
// (red=outlines, green=sections, blue=roads), and report bounding boxes.
//
// Key: SVG <path> bboxes now correctly track the visible curve via a
// proper command-by-command walk (only endpoints contribute to bbox, so
// bezier control points don't inflate the rect).
//
//   node parse-template.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const SVG = readFileSync('template.svg', 'utf8');

// --------------------------------------------------------------------
// 1) Map CSS classes → color category from the <style> block.
// --------------------------------------------------------------------
const classCategory = {};
{
  const css = (SVG.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
  for (const rule of css.matchAll(/\.([\w-]+(?:\s*,\s*\.[\w-]+)*)\s*\{([^}]+)\}/g)) {
    const classes = rule[1].split(',').map(s => s.trim().replace(/^\./, ''));
    const stroke = (rule[2].match(/stroke\s*:\s*([^;]+?)\s*(?:;|$)/) || [])[1];
    if (!stroke) continue;
    for (const cls of classes) {
      classCategory[cls] = classCategory[cls] || categorize(stroke);
    }
  }
}
function categorize(c) {
  c = c.toLowerCase().trim();
  if (c === 'red' || c === '#e60000' || c === '#f00' || c === '#ff0000') return 'red';
  if (c === '#21ff28' || c === '#0f0' || c === 'green' || c === '#00ff00') return 'green';
  if (c === '#00a' || c === '#0000aa' || c === 'blue' || c === '#0000ff') return 'blue';
  return 'other';
}
console.log('class → category:', classCategory);

// --------------------------------------------------------------------
// 2) Proper SVG path-d bbox: tokenize commands, walk endpoints only.
// --------------------------------------------------------------------
function pathBBox(d) {
  // Tokenize: split into commands + numeric arg arrays.
  const tokens = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:e-?\d+)?)/g;
  let m;
  let curr = null;
  while ((m = re.exec(d)) !== null) {
    if (m[1]) { curr = { cmd: m[1], args: [] }; tokens.push(curr); }
    else if (curr) curr.args.push(parseFloat(m[2]));
  }
  let x = 0, y = 0;          // current point
  let sx = 0, sy = 0;         // start of current subpath
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  function ext(px, py) {
    if (px < minX) minX = px; if (px > maxX) maxX = px;
    if (py < minY) minY = py; if (py > maxY) maxY = py;
  }
  for (const t of tokens) {
    const a = t.args;
    const rel = t.cmd === t.cmd.toLowerCase();
    switch (t.cmd.toUpperCase()) {
      case 'M': {
        for (let i = 0; i < a.length; i += 2) {
          const nx = rel && i ? x + a[i]   : (rel ? x + a[i]   : a[i]);
          const ny = rel && i ? y + a[i+1] : (rel ? y + a[i+1] : a[i+1]);
          // First M (i==0): absolute or relative-from-origin
          if (i === 0 && !rel) { x = a[0]; y = a[1]; }
          else if (i === 0 && rel) { x = x + a[0]; y = y + a[1]; }
          else { x = nx; y = ny; }
          if (i === 0) { sx = x; sy = y; }
          ext(x, y);
        }
        break;
      }
      case 'L': {
        for (let i = 0; i < a.length; i += 2) {
          x = rel ? x + a[i] : a[i];
          y = rel ? y + a[i+1] : a[i+1];
          ext(x, y);
        }
        break;
      }
      case 'H': {
        for (const v of a) {
          x = rel ? x + v : v;
          ext(x, y);
        }
        break;
      }
      case 'V': {
        for (const v of a) {
          y = rel ? y + v : v;
          ext(x, y);
        }
        break;
      }
      case 'C': {
        // skip control points (a[i..i+3]), endpoint at a[i+4..i+5]
        for (let i = 0; i + 5 < a.length; i += 6) {
          x = rel ? x + a[i+4] : a[i+4];
          y = rel ? y + a[i+5] : a[i+5];
          ext(x, y);
        }
        break;
      }
      case 'S': {
        for (let i = 0; i + 3 < a.length; i += 4) {
          x = rel ? x + a[i+2] : a[i+2];
          y = rel ? y + a[i+3] : a[i+3];
          ext(x, y);
        }
        break;
      }
      case 'Q': {
        for (let i = 0; i + 3 < a.length; i += 4) {
          x = rel ? x + a[i+2] : a[i+2];
          y = rel ? y + a[i+3] : a[i+3];
          ext(x, y);
        }
        break;
      }
      case 'T': {
        for (let i = 0; i + 1 < a.length; i += 2) {
          x = rel ? x + a[i] : a[i];
          y = rel ? y + a[i+1] : a[i+1];
          ext(x, y);
        }
        break;
      }
      case 'A': {
        // rx ry rotation large-arc sweep x y
        for (let i = 0; i + 6 < a.length; i += 7) {
          x = rel ? x + a[i+5] : a[i+5];
          y = rel ? y + a[i+6] : a[i+6];
          ext(x, y);
        }
        break;
      }
      case 'Z': { x = sx; y = sy; break; }
    }
  }
  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function bboxFromPoints(points) {
  const nums = points.trim().split(/[\s,]+/).map(parseFloat).filter(n => !Number.isNaN(n));
  let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    if (nums[i] < minX) minX = nums[i];     if (nums[i] > maxX) maxX = nums[i];
    if (nums[i+1] < minY) minY = nums[i+1]; if (nums[i+1] > maxY) maxY = nums[i+1];
  }
  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

const attr = (raw, name) => (raw.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`)) || [])[1] || null;

// --------------------------------------------------------------------
// 3) Walk every shape element after the <style> block.
// --------------------------------------------------------------------
const body = SVG.slice(SVG.indexOf('</style>') + '</style>'.length);
const shapes = [];

// Split subpaths at every M/m so each becomes its own bbox candidate.
function splitPathSubpaths(d) {
  return d.split(/(?=[Mm])/).filter(s => s.trim().length > 1);
}

// Preserve the ORIGINAL geometry alongside the bbox so consumers can render
// the actual shape (polygon / path / rect / line) instead of just the box.
for (const m of body.matchAll(/<rect\s+([^>]*?)\/?>/g)) {
  const a = m[1];
  const x = parseFloat(attr(a, 'x') || 0);
  const y = parseFloat(attr(a, 'y') || 0);
  const w = parseFloat(attr(a, 'width') || 0);
  const h = parseFloat(attr(a, 'height') || 0);
  shapes.push({
    tag: 'rect',
    cls: attr(a, 'class') || '',
    bbox: { x, y, w, h },
    geom: { type: 'rect', x, y, w, h },
  });
}
for (const m of body.matchAll(/<(polygon|polyline)\s+([^>]*?)\/?>/g)) {
  const points = attr(m[2], 'points');
  if (!points) continue;
  const bbox = bboxFromPoints(points);
  if (!bbox) continue;
  shapes.push({
    tag: m[1],
    cls: attr(m[2], 'class') || '',
    bbox,
    geom: { type: m[1], points: points.trim() },
  });
}
for (const m of body.matchAll(/<path\s+([^>]*?)\/?>/g)) {
  const a = m[1];
  const d = attr(a, 'd');
  if (!d) continue;
  const cls = attr(a, 'class') || '';
  for (const sub of splitPathSubpaths(d)) {
    const bbox = pathBBox(sub);
    if (!bbox) continue;
    if (bbox.w < 1.5 && bbox.h < 1.5) continue; // dust
    shapes.push({ tag: 'path', cls, bbox, geom: { type: 'path', d: sub.trim() } });
  }
}
for (const m of body.matchAll(/<line\s+([^>]*?)\/?>/g)) {
  const a = m[1];
  const x1 = parseFloat(attr(a, 'x1') || 0);
  const y1 = parseFloat(attr(a, 'y1') || 0);
  const x2 = parseFloat(attr(a, 'x2') || 0);
  const y2 = parseFloat(attr(a, 'y2') || 0);
  shapes.push({
    tag: 'line', cls: attr(a, 'class') || '',
    bbox: { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2-x1), h: Math.abs(y2-y1) },
    geom: { type: 'line', x1, y1, x2, y2 },
  });
}

// Attach category from class.
shapes.forEach(s => s.category = classCategory[s.cls] || 'other');

// --------------------------------------------------------------------
// 4) Filter / report.
// --------------------------------------------------------------------
// Keep a shape if at least 50% of its bbox area falls inside the canvas, OR
// if the bbox is reasonably small (<= 4× canvas) and intersects at all. This
// keeps the long road polylines that border the campus while still dropping
// Illustrator's single-point artifact paths far off-canvas.
function intersectsCanvas(b) {
  if (b.w < 1.5 || b.h < 1.5) return false;
  const ix = Math.max(0, Math.min(1019, b.x + b.w) - Math.max(0, b.x));
  const iy = Math.max(0, Math.min(913,  b.y + b.h) - Math.max(0, b.y));
  if (ix <= 0 || iy <= 0) return false;
  const interArea = ix * iy;
  const bArea = b.w * b.h;
  if (bArea > 4 * 1019 * 913) return false;     // bigger than 4× the canvas → garbage
  return interArea > bArea * 0.4;
}

const onCanvas = shapes.filter(s => intersectsCanvas(s.bbox));
console.log(`total shapes parsed: ${shapes.length}, on-canvas: ${onCanvas.length}`);

const byCat = { red: [], green: [], blue: [], other: [] };
for (const s of onCanvas) byCat[s.category].push(s);

for (const cat of ['red', 'green', 'blue', 'other']) {
  console.log(`\n=== ${cat.toUpperCase()} (${byCat[cat].length}) ===`);
  byCat[cat]
    .sort((a, b) => (a.bbox.y - b.bbox.y) || (a.bbox.x - b.bbox.x))
    .forEach((s, i) => {
      const b = s.bbox;
      const area = Math.round(b.w * b.h);
      console.log(`  [${String(i).padStart(2)}] ${s.tag.padEnd(8)} (${Math.round(b.x)},${Math.round(b.y)}) ${Math.round(b.w)}x${Math.round(b.h)}  area=${area}`);
    });
}

writeFileSync('template-shapes.json', JSON.stringify({
  shapes: onCanvas,
  byCat: {
    red:   byCat.red.map(s => s.bbox),
    green: byCat.green.map(s => s.bbox),
    blue:  byCat.blue.map(s => s.bbox),
  },
}, null, 2));
console.log('\nwrote template-shapes.json');
