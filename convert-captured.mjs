// convert-captured.mjs — turn positions-captured.json (output of capture.html)
// into a POSITIONS object and splice it into index.html. Also rewrites the
// renderMap parts logic so each entry can carry one rect or polygon part.
//
//   node convert-captured.mjs
//   node prepare.js   # then re-inline + mirror to www/

import { readFileSync, writeFileSync } from 'node:fs';

const captured = JSON.parse(readFileSync('positions-captured.json', 'utf8'));

// Build POSITIONS. Each captured address becomes its own entry with one
// part. Sub-units like "618 Moulton Avenue #A" stay as their own entries
// (separately tappable on the map). The bottom-sheet code can match
// "<addr> #<unit>" → fall back to artists at "<addr>" if no exact match.
const positions = {};
for (const [addr, shape] of Object.entries(captured)) {
  const short = (addr.match(/^\d+/) || [addr])[0];
  let part;
  if (shape.type === 'polygon') {
    part = { type: 'polygon', points: shape.points };
  } else {
    part = { type: 'rect', x: shape.x, y: shape.y, w: shape.w, h: shape.h };
  }
  positions[addr] = {
    x: +shape.x.toFixed(2),
    y: +shape.y.toFixed(2),
    w: +shape.w.toFixed(2),
    h: +shape.h.toFixed(2),
    short,
    parts: [part],
  };
}

// Build the POSITIONS literal as compact JS. One address per line.
const lines = ['  const POSITIONS = {'];
for (const [addr, p] of Object.entries(positions)) {
  const partStr = JSON.stringify(p.parts[0]);
  lines.push(`    ${JSON.stringify(addr)}: { x: ${p.x}, y: ${p.y}, w: ${p.w}, h: ${p.h}, short: ${JSON.stringify(p.short)}, parts: [${partStr}] },`);
}
lines.push('  };');
const positionsBlock = lines.join('\n');

// Splice into index.html.
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
