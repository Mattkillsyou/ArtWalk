#!/usr/bin/env node
// prepare.js — inline artists.json and buildings.json into index.html
// so the app works in any context (file://, preview panels, Capacitor WebView)
// without needing an HTTP server.
//
// Run after editing artists.json or buildings.json:
//   node prepare.js

const fs = require('fs');
const path = require('path');

const root = __dirname;
const htmlPath      = path.join(root, 'index.html');
const artistsPath   = path.join(root, 'artists.json');
const buildingsPath = path.join(root, 'buildings.json');

function read(p) {
  if (!fs.existsSync(p)) {
    console.error(`Missing: ${p}`);
    process.exit(1);
  }
  return fs.readFileSync(p, 'utf8');
}

const artistsRaw   = read(artistsPath).trim();
const buildingsRaw = read(buildingsPath).trim();
let html           = read(htmlPath);

// Validate JSON
try { JSON.parse(artistsRaw); }
catch (e) { console.error('artists.json invalid:', e.message); process.exit(1); }
try { JSON.parse(buildingsRaw); }
catch (e) { console.error('buildings.json invalid:', e.message); process.exit(1); }

// Embedded JSON cannot contain </script (case-insensitive) or it terminates the tag.
function safe(json) { return json.replace(/<\/script/gi, '<\\/script'); }

const artists   = safe(artistsRaw);
const buildings = safe(buildingsRaw);

const before = html.length;

html = html.replace(
  /(<script id="artists-data" type="application\/json">)[\s\S]*?(<\/script>)/,
  `$1${artists}$2`
);
html = html.replace(
  /(<script id="buildings-data" type="application\/json">)[\s\S]*?(<\/script>)/,
  `$1${buildings}$2`
);

if (!html.includes('id="artists-data"') || !html.includes('id="buildings-data"')) {
  console.error('Could not find inline data slots in index.html. Did the markers move?');
  process.exit(1);
}

fs.writeFileSync(htmlPath, html);

const after = html.length;
const aCount   = JSON.parse(artistsRaw).length;
const bCount   = JSON.parse(buildingsRaw).length;
console.log(`Inlined ${aCount} artists + ${bCount} buildings.`);
console.log(`index.html: ${before.toLocaleString()} → ${after.toLocaleString()} bytes`);
