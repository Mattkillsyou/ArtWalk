// ocr.mjs — OCR map_greyscale.jpg to extract every text label + its
// bounding box. Saves to ocr.json so the matcher can look up where each
// printed building number appears.
//
//   node ocr.mjs

import { createWorker } from 'tesseract.js';
import { writeFileSync } from 'node:fs';

console.log('booting tesseract worker (downloads ~30MB language model on first run)...');
const worker = await createWorker('eng', 1, {
  logger: m => {
    if (m.status === 'recognizing text') {
      process.stdout.write(`\r  recognizing: ${(m.progress * 100).toFixed(0)}%`);
    }
  },
});

console.log('\nrunning OCR on map_greyscale.jpg...');
const { data } = await worker.recognize('map_greyscale.jpg', {}, { blocks: true });
await worker.terminate();
process.stdout.write('\n');

// Tesseract.js returns hierarchical structure: blocks → paragraphs → lines → words.
// We mostly want WORDS (the building numbers and street names).
const words = [];
function visitWords(node) {
  if (node.words) for (const w of node.words) visitWords(w);
  if (node.text != null && node.bbox) {
    words.push({
      text: node.text.trim(),
      conf: node.confidence,
      bbox: {
        x: node.bbox.x0,
        y: node.bbox.y0,
        w: node.bbox.x1 - node.bbox.x0,
        h: node.bbox.y1 - node.bbox.y0,
      },
    });
  }
  if (node.lines) for (const l of node.lines) visitWords(l);
  if (node.paragraphs) for (const p of node.paragraphs) visitWords(p);
  if (node.blocks) for (const b of node.blocks) visitWords(b);
}
visitWords(data);

// De-duplicate (the recursion above can visit text at multiple levels).
const seen = new Set();
const unique = [];
for (const w of words) {
  const key = `${w.text}@${w.bbox.x},${w.bbox.y}`;
  if (!seen.has(key)) { seen.add(key); unique.push(w); }
}
unique.sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x);

console.log(`got ${unique.length} unique tokens`);
writeFileSync('ocr.json', JSON.stringify(unique, null, 2));
console.log('wrote ocr.json');

// Print a quick sampling so we can sanity-check.
const numbers = unique.filter(w => /^\d+$/.test(w.text) || /^\d+[A-Z]?$/.test(w.text));
console.log(`numeric tokens: ${numbers.length}`);
for (const n of numbers.slice(0, 50)) {
  console.log(`  "${n.text}" at (${n.bbox.x}, ${n.bbox.y})  conf=${n.conf.toFixed(0)}`);
}
