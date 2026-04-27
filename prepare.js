#!/usr/bin/env node
// prepare.js — inline artists.json and buildings.json into index.html as
// base64-encoded JSON, so the app works in any context (file://, preview
// panels, Capacitor WebView) without an HTTP server, and without any
// HTML-parser surprises from arbitrary text in bio fields.
//
// Run after editing artists.json or buildings.json:
//   node prepare.js
//
// Also writes www/index.html for Capacitor's webDir.

const fs = require('fs');
const path = require('path');

const root          = __dirname;
const htmlPath      = path.join(root, 'index.html');
const artistsPath   = path.join(root, 'artists.json');
const buildingsPath = path.join(root, 'buildings.json');
const wwwDir        = path.join(root, 'www');
const wwwHtmlPath   = path.join(wwwDir, 'index.html');

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
const before       = html.length;

// Validate JSON
let artistsData, buildingsData;
try { artistsData = JSON.parse(artistsRaw); }
catch (e) { console.error('artists.json invalid:', e.message); process.exit(1); }
try { buildingsData = JSON.parse(buildingsRaw); }
catch (e) { console.error('buildings.json invalid:', e.message); process.exit(1); }

// Base64-encode (UTF-8 safe; Node's Buffer handles this).
const artistsB64   = Buffer.from(artistsRaw,   'utf8').toString('base64');
const buildingsB64 = Buffer.from(buildingsRaw, 'utf8').toString('base64');

// Replace the placeholder string assignments. Anchored on the global names so
// the regex can't drift into the main app script.
function inject(html, globalName, b64) {
  const re = new RegExp(`(window\\.${globalName}\\s*=\\s*)"[^"]*"`);
  if (!re.test(html)) {
    console.error(`Could not find slot for window.${globalName} in index.html`);
    process.exit(1);
  }
  return html.replace(re, `$1"${b64}"`);
}

html = inject(html, '__ARTISTS_B64__',   artistsB64);
html = inject(html, '__BUILDINGS_B64__', buildingsB64);

fs.writeFileSync(htmlPath, html);

// Mirror into www/ for Capacitor (webDir).
if (!fs.existsSync(wwwDir)) fs.mkdirSync(wwwDir, { recursive: true });
fs.writeFileSync(wwwHtmlPath, html);

const after = html.length;
console.log(`Inlined ${artistsData.length} artists + ${buildingsData.length} buildings.`);
console.log(`index.html: ${before.toLocaleString()} → ${after.toLocaleString()} bytes`);
console.log(`Wrote: index.html, www/index.html`);
