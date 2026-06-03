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
const crypto = require('crypto');

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

// Mirror into www/ for Capacitor (webDir). Start clean so assets removed from
// the source tree (e.g. archived images) can't linger in the shipped bundle.
fs.rmSync(wwwDir, { recursive: true, force: true });
fs.mkdirSync(wwwDir, { recursive: true });
fs.writeFileSync(wwwHtmlPath, html);

// Mirror static assets from repo-root source dirs into www/.
//   · top-level files: sw.js, manifest
//   · fonts/ → www/fonts/
//   · icons/ → www/icons/
// NB: no map images or artist photos ship — the map is our own in-app SVG and
// the directory is facts-only (no third-party photos).
const copied = [];

function copyFile(rel) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) return;
  const dest = path.join(wwwDir, rel);
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  copied.push(rel);
}

function copyDir(rel) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) return;
  const dest = path.join(wwwDir, rel);
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const srcChild = path.join(src, name);
    const destChild = path.join(dest, name);
    const stat = fs.statSync(srcChild);
    if (stat.isDirectory()) copyDir(path.join(rel, name));
    else { fs.copyFileSync(srcChild, destChild); copied.push(path.join(rel, name)); }
  }
}

// Top-level files the HTML references via relative URL.
['sw.js', 'manifest.webmanifest'].forEach(copyFile);

// Stamp the service-worker cache version with a content hash of the shell, so
// every release invalidates the previous cache automatically. The source sw.js
// keeps the `__SW_VERSION__` placeholder; only the shipped www/ copy is stamped.
const swVer = crypto.createHash('sha256').update(html).digest('hex').slice(0, 8);
const wwwSw = path.join(wwwDir, 'sw.js');
if (fs.existsSync(wwwSw)) {
  fs.writeFileSync(wwwSw, fs.readFileSync(wwwSw, 'utf8').replace(/__SW_VERSION__/g, swVer));
}

// Bundled directories.
['fonts', 'icons'].forEach(copyDir);

const after = html.length;
console.log(`Inlined ${artistsData.length} artists + ${buildingsData.length} buildings.`);
console.log(`index.html: ${before.toLocaleString()} → ${after.toLocaleString()} bytes`);
console.log(`Mirrored ${copied.length} files to www/.`);
