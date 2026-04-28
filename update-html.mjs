// update-html.mjs — replace the POSITIONS block in index.html with the
// generated positions.js content, and extend renderMap to handle parts of
// any geometry type (polygon / path / polyline / rect).

import { readFileSync, writeFileSync } from 'node:fs';

const positionsBody = readFileSync('positions.js', 'utf8');
let html = readFileSync('index.html', 'utf8');

// 1) Replace POSITIONS const block. Match from "const POSITIONS = {" to the
//    closing "};" — track brace depth so we don't stop at a nested brace.
{
  const start = html.indexOf('const POSITIONS = {');
  if (start === -1) throw new Error('could not find POSITIONS block');
  let depth = 0;
  let end = -1;
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) {
        end = html.indexOf(';', i);
        if (end !== -1) end += 1;
        break;
      }
    }
  }
  if (end === -1) throw new Error('could not find end of POSITIONS block');
  html = html.slice(0, start) + positionsBody.trimStart() + html.slice(end);
}

// 2) Extend renderMap parts rendering to handle non-rect geometries.
const oldParts = `      if (pos.parts) {
        pos.parts.forEach(part => {
          g.appendChild(el('rect', {
            class: 'bld-rect', x: part.x, y: part.y, width: part.w, height: part.h
          }));
        });
      } else {
        g.appendChild(el('rect', {
          class: 'bld-rect', x: pos.x, y: pos.y, width: pos.w, height: pos.h
        }));
      }`;

const newParts = `      if (pos.parts && pos.parts.length) {
        pos.parts.forEach(part => {
          let pe;
          if (part.type === 'rect' || (part.x != null && part.w != null && part.type == null)) {
            pe = el('rect', { class: 'bld-rect', x: part.x, y: part.y, width: part.w, height: part.h });
          } else if (part.type === 'polygon' || part.type === 'polyline') {
            pe = el(part.type, { class: 'bld-rect', points: part.points });
          } else if (part.type === 'path') {
            pe = el('path', { class: 'bld-rect', d: part.d });
          }
          if (pe) g.appendChild(pe);
        });
      } else {
        g.appendChild(el('rect', {
          class: 'bld-rect', x: pos.x, y: pos.y, width: pos.w, height: pos.h
        }));
      }`;

if (!html.includes(oldParts)) {
  // Try a less strict match
  const re = /if\s*\(pos\.parts\)\s*\{[\s\S]*?\}\s*else\s*\{[\s\S]*?\}\s*/;
  if (!re.test(html)) {
    console.error('Could not find parts-rendering block to update.');
    process.exit(1);
  }
  html = html.replace(re, newParts + '\n      ');
} else {
  html = html.replace(oldParts, newParts);
}

writeFileSync('index.html', html);
console.log('updated index.html: POSITIONS replaced, renderMap extended for mixed geometry parts');
