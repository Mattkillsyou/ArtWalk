# Brewery Art Walk — Enhancement Backlog

Tasks selected from the enhancement list. Ordered by dependency: dev tooling
first (so iteration is faster), then data quality, then visitor features, then
map UX, then native iOS, then polish.

## How to run this

Hand to Claude in a fresh session:

```
Read BACKLOG.md and work through it. Start with Phase 1, task 33.
After each task: show me the change, run `npm run sim`, screenshot the
simulator, and ask before moving to the next task.
```

Or pick individually: `Do BACKLOG task 21.`

Each task names its files, an approach, and how to verify.

---

## Phase 1 — dev workflow (do first; speeds everything else)

### 33. Live reload via Capacitor's `--external` server
**Goal**: edit `index.html`, see it in the simulator without `xcodebuild`.
**Files**: `capacitor.config.json`, `scripts/sim-live.sh` (new), `package.json`.
**Approach**:
- Start a local HTTP server pointing at the project root (port 3000).
- Set `server.url = "http://<mac-ip>:3000"` in `capacitor.config.json` (or via a separate dev config).
- `npx cap run ios` — the WebView loads from the local server, so saving `index.html` + reloading the page updates it without rebuild.
- Add `npm run sim:live` for the dev flow; keep `npm run sim` for the bake-into-app flow.
**Verify**: edit `index.html`, save, hit reload in simulator (`Cmd+R` in WebView is `Device → Restart`) — change shows in <2s, no `xcodebuild` ran.

### 34. Make `preview_start` work in this sandbox
**Goal**: browser preview as an alternative to the simulator.
**Files**: `.claude/launch.json`, possibly a tiny `scripts/dev-server.mjs`.
**Approach**:
- Earlier failure: `EPERM: process.cwd` — child process inherits an unreadable cwd.
- Try a Node script that calls `process.chdir('/abs/path')` before any other import (Python's `http.server` reads cwd at module-import time, which is why it crashed).
- Drop the Python entries from `launch.json`; keep one `node scripts/dev-server.mjs` entry that always works.
**Verify**: `preview_start` opens the project in the browser, `index.html` renders.

### 35. `npm test` — JSON validity + matching smoke test
**Goal**: catch corrupt data or unmapped artists before iOS build.
**Files**: `scripts/check.mjs` (new), `package.json` (`scripts.test`).
**Approach**:
- `JSON.parse` both `artists.json` and `buildings.json`.
- Run `node prepare.js` and assert `www/index.html` exists and is in expected size range.
- Re-implement `findPositionKey` logic in Node and assert every artist resolves to a POSITIONS key (catches today's "12 unmapped" regression at lint-time).
- Exit non-zero if any check fails.
**Verify**: `npm test` runs in <5s. Break a JSON file → test fails with a clear message.

### 36. Auto-refresh `artists.json` from a remote source
**Goal**: pull artist roster updates from breweryartwalk.com without hand-editing.
**Files**: `scripts/sync-artists.mjs` (new), `package.json` (`scripts.sync`).
**Approach**:
- Find the source: scrape `breweryartwalk.com/artists` (HTML), check for a public JSON endpoint, or use Brewery Artist Lofts directory.
- Normalize to existing `artists.json` shape (name, address, unit, category, medium, website, instagram, bio, images).
- Diff against current `artists.json`; print `+N / -N / ~N` summary; require `--write` flag to actually overwrite.
**Verify**: `npm run sync` (read-only) prints diff. `npm run sync -- --write` updates the file. `npm test` still passes after.

---

## Phase 2 — data quality

### 21. Add `1984 N. Main Street` parent shape
**Goal**: stop routing the lone 1984 #400 artist via the alias hack.
**Files**: `positions-captured.json` (canonical capture data), regenerate via the existing pipeline (`update-html.mjs` or whichever script bakes POSITIONS into `index.html`), then `index.html` to remove the alias.
**Approach**:
- Open `capture.html` in browser, locate the central green block on the printed map (the 1984 N. Main complex containing 1980 + 602 + 604/606/608/610 cells).
- Capture a parent polygon labelled `1984 N. Main Street` covering all those cells.
- Run the bake script that updates `POSITIONS` in `index.html`.
- Remove `'1984 N. Main Street': '1980 N. Main Street'` from `POSITION_ALIASES` in `index.html`.
**Verify**: tap the central 1984 area → floor view titled "1984 N. Main"; the 1984 #400 artist appears.

### 22. Verify per-sub-unit artist mapping
**Goal**: artist with `address: "618 Moulton Avenue", unit: "C"` should route to `618 Moulton Avenue #C` specifically — not bucket into the first sub-unit found.
**Files**: `index.html` (audit `findPositionKey`), `artists.json`.
**Approach**:
- Audit each artist whose address has POSITIONS sub-units (618, 622, 690, 692, 696). Confirm their `unit` field matches one of the sub-keys.
- For artists at parent-only addresses where no `#unit` POSITIONS key matches the artist's `unit`, decide: (a) capture more sub-unit shapes, or (b) introduce a "shared parent" lookup that creates a virtual parent tap zone.
- Currently `findPositionKey` falls through to the first sub-unit when nothing else matches — that's wrong for buildings with real sub-unit data; fix it to fall through to a *parent* aggregate instead.
**Verify**: tap `618 #C` → only the artists in #C; tap any other sub-unit → only artists in that sub-unit.

### 23. Add explicit `floor` field to `artists.json`
**Goal**: replace `floorOfUnit()` heuristic with data — eliminates ambiguity.
**Files**: `artists.json`, `index.html` (`floorOfUnit` becomes a fallback).
**Approach**:
- For each artist, derive floor (heuristically first, then hand-verify against the printed program / artist statements).
- Add `floor` field as a string: `"1"`, `"2"`, `"A"`, `"B"`, `"E"`, `"W"`.
- In `floorOfUnit`, prefer `artist.floor` if present; keep current logic as fallback.
**Verify**: `npm test` passes. Every artist has a `floor`. Floor view groups exactly per data.

### 24. Add `floors` field to every entry in `buildings.json`
**Goal**: the floor view can render *empty* floors so a 4-floor tower with one artist on floor 4 still shows floors 1–3 as empty.
**Files**: `buildings.json`, `index.html` (`showBuildingFloors`).
**Approach**:
- Set `floors` per building. Defaults: pink/yellow lofts = 1, 600 Moulton / Atrium = 4–5, 2020 / 1918 = 2, 642 = 1.
- In `showBuildingFloors`, render rows for floors 1..N (or A/B for Atrium), placing artist chips by `floor`. Floors with zero artists render as a labeled empty row.
**Verify**: 600 Moulton (4 floors, 11 artists) shows 4 rows; floor 1 is empty if no `unit: 1xx` artist exists.

### 26. Bios for artists
**Goal**: artist detail sheets feel sparse without bio text. Currently most have `bio: null`.
**Files**: `artists.json` (touched), maybe `scripts/sync-artists.mjs` from #36.
**Approach**:
- Source: scrape each artist's `breweryartwalk.com/artist/<slug>` page if the field exists, fall back to their personal website's about page or Instagram bio.
- Plain-text only, ~1–3 sentences each.
- Re-run `node prepare.js` to inline.
**Verify**: tap an artist → detail view shows a paragraph; `npm test` still passes.

---

## Phase 3 — visitor-day features

### 11. Search-within-floor-view
**Goal**: typing in the search bar filters chips inside an open floor view.
**Files**: `index.html` (`showBuildingFloors`, `applyFilters`, `search` event).
**Approach**:
- Track which sheet is currently open in a state var (`currentSheet: 'floors' | 'detail' | 'search' | null`).
- When `searchQuery` changes and `currentSheet === 'floors'`, re-render the floor view with the filtered list, hiding floors with zero matching artists.
**Verify**: open Atrium floor view → type "Vosper" → only Stephanie Vosper's chip remains under LEVEL A.

### 12. Search across `unit` and `bio`
**Goal**: typing "B07" finds the unit; typing "ceramicist" finds the bio.
**Files**: `index.html` (`matchesSearch`).
**Approach**: extend `matchesSearch` to also test `a.unit` and `a.bio`.
**Verify**: search "B07" → the Atrium B07 artist surfaces. Search "watercolor" → matching bios appear (after #26 lands).

---

## Phase 4 — map UX

### 16. Visually dim buildings with no artists
**Goal**: at-a-glance, see which buildings are worth visiting.
**Files**: `index.html` (`renderMap` or `applyFilters`), CSS.
**Approach**:
- After data loads, tag any POSITIONS key with zero matched artists (and zero `artistsByParent[parent]`) as `class="bld-empty"`. This is permanent — distinct from the temporary `dim` class set by filtering.
- CSS: `.bld-empty .bld-rect { stroke: #d0d0d0; }` and `.bld-empty .bld-label { fill: #aaa; }`.
**Verify**: small studios with no artists (632/634/638) appear faded; the rest are crisp black.

### 17. Stronger selected-building highlight
**Goal**: tapping a building should be unmistakable.
**Files**: `index.html` CSS for `.bld-group.selected .bld-rect`.
**Approach**:
- Increase stroke-width to 6, fill to `rgba(255, 213, 0, 0.7)`.
- Optional: a subtle pulse via `@keyframes pulse-stroke { 0%, 100% { stroke-width: 6 } 50% { stroke-width: 9 } }` on `.bld-group.selected .bld-rect`.
**Verify**: tap a building → outline is unmistakable from across the screen.

### 18. Spatial floor-view layout
**Goal**: floor rows should look like floor *plans*, not chip clouds. Units in geographic order.
**Files**: `index.html` (`showBuildingFloors`, CSS for `.floor-artists`).
**Approach**:
- Replace `display: flex; flex-wrap: wrap` with a horizontal row (`display: flex; overflow-x: auto`) for buildings whose floors are linear (642 East as one strip).
- For Atrium A1–A15, render as one row left-to-right per level.
- For numeric floors with units like 101–215, sort by unit number and lay out in a single row or 2D grid mirroring the actual floor plan if known.
**Verify**: 642 East shows E18→E30 in a single horizontal scroll; Atrium A1→A15 as one row per level.

### 19. Pinch-to-zoom + double-tap to zoom
**Goal**: standard mobile map gestures.
**Files**: `index.html` (touch event handlers on the SVG).
**Approach**:
- Track `touchstart` / `touchmove` / `touchend`. With 2 fingers, compute initial pinch distance and current distance; scale viewBox by the ratio, anchored at the midpoint.
- Double-tap detection: two `touchend`s within 300ms within ~30 px of each other → zoom in 2x centered on tap point.
- Existing `wheel` handler stays for trackpad / desktop.
**Verify**: in simulator (option-drag pinch) and on device, both gestures work and feel native.

### 20. Tap-zone calibration mode
**Goal**: fix misaligned tap zones in-app, not by hand-editing JSON.
**Files**: `index.html` (toggle via `?calibrate=1` URL param), small new helper functions.
**Approach**:
- When `?calibrate=1`, overlay the printed map (`map_greyscale.jpg`) at 50% opacity behind the tap zones, render `.bld-rect` as red translucent + draggable (via `touchmove` on each shape).
- Track edits in a `calibrationDiff` object keyed by address.
- "Export" button copies the JSON patch to clipboard, ready to paste into `positions-captured.json`.
- "Reset" button clears local edits.
**Verify**: open `?calibrate=1` → drag a misaligned shape → export → paste → reload → tap zones align.

---

## Phase 5 — native iOS (Capacitor)

### 1. GPS "you are here" pin
**Goal**: show the user's real-world position on the map.
**Files**: `package.json` (add `@capacitor/geolocation`), `capacitor.config.json` (permissions), `index.html` (a `<g id="user-pin">` + transform logic).
**Approach**:
- `npm install @capacitor/geolocation` && `npx cap sync ios`.
- Add `NSLocationWhenInUseUsageDescription` to `ios/App/App/Info.plist`: "Show your position on the campus map."
- On app load, `Geolocation.requestPermissions()` then `Geolocation.watchPosition({ enableHighAccuracy: true })`.
- Compute affine transform from real-world (campus bbox: 34.0625–34.0670 N, -118.2210 to -118.2155 W) into viewBox coords (1019×913). Calibrate with two known points: e.g., NW corner of 1910 N. Main shape ↔ approx 34.0658 N, -118.2192 W. Atrium SE corner ↔ 34.0664 N, -118.2155 W.
- Render circle + heading arrow at the projected position; hide if outside the viewBox.
**Verify**: in simulator, `Features → Location → Custom Location` set to 34.0664, -118.2178 → pin appears in the Atrium area.

### 2. Haptic feedback
**Goal**: tactile confirmation on building tap, chip tap, sheet open.
**Files**: `package.json` (add `@capacitor/haptics`), `index.html`.
**Approach**:
- `npm install @capacitor/haptics` && `npx cap sync ios`.
- In `onBuildingTap`, `chip` click handler, and `openSheet`: `await Haptics.impact({ style: ImpactStyle.Light })`. Wrap in `try/catch` so it no-ops in a browser preview.
- Use `Light` for chips, `Medium` for building taps, `Light` for sheet open.
**Verify**: real iPhone gives haptic feedback on each interaction. Simulator: no actual haptic but no errors logged.

### 3. Persistent favorites
**Goal**: star artists; survives app restart.
**Files**: `package.json` (add `@capacitor/preferences`), `index.html` (favorite button in artist detail + a "★ Favorites" filter chip).
**Approach**:
- `npm install @capacitor/preferences` && `npx cap sync ios`.
- On app load, `Preferences.get({ key: 'favorites' })` → JSON-parse into a `favoritedNames: Set<string>`.
- In `showArtistDetail`, render a star button. On tap: toggle membership in `favoritedNames`, `Preferences.set({ key: 'favorites', value: JSON.stringify([...favoritedNames]) })`.
- Add a `★ Favorites` chip (always present, doesn't count toward category list). When active, `matchesFilter` returns `favoritedNames.has(a.name)`.
- Note interaction with single-select chips: ★ Favorites should probably be a *toggle* independent of the category filter, or replace the category. Decide and document.
**Verify**: star Joey Forsyte → kill app → reopen → tap ★ → only Joey shown.

---

## Phase 6 — polish

### 27. Bottom-sheet swipe-to-dismiss
**Goal**: swipe the handle down to close the sheet.
**Files**: `index.html` (`#sheet` touch handlers).
**Approach**:
- `touchstart` on `#sheet-handle`: record start Y.
- `touchmove`: translate sheet down by delta Y (only if dragging down).
- `touchend`: if dragged > 30% of sheet height OR velocity > threshold → animate fully out and call `closeSheet()`. Else snap back to 0.
**Verify**: drag the handle down on simulator → sheet dismisses with momentum; partial drag snaps back.

### 28. Sheet height presets (half / full)
**Goal**: tap handle to toggle between half and full screen.
**Files**: `index.html` (CSS variants + handle tap).
**Approach**:
- Two CSS classes on `#sheet`: `.sheet-half` (max-height: 50dvh), `.sheet-full` (max-height: 90dvh). Default to `.sheet-half`.
- Single tap on `#sheet-handle` toggles. Combine with #27's swipe gesture: swipe up = expand; swipe down = collapse or dismiss.
**Verify**: tap building → half sheet. Tap handle → expands to full. Tap again → back to half. Swipe down past half → closes.

### 29. Dark mode
**Goal**: respect iOS dark mode.
**Files**: `index.html` CSS (add `@media (prefers-color-scheme: dark)` block).
**Approach**:
- Define a small palette: `--bg`, `--fg`, `--street`, `--building-stroke`, `--selected-fill`. Use vars throughout existing CSS.
- Dark overrides: `--bg: #0a0a0a`, `--fg: #fafafa`, `--street: #2a2a2a`, `--building-stroke: #fafafa`, `--selected-fill: rgba(255, 213, 0, 0.5)`.
- Sheet, search, chips, status bar, zoom controls all need overrides.
**Verify**: enable dark mode in simulator (`Features → Toggle Appearance` or `Cmd+Shift+A`) → app re-themes; selected highlight still pops.

### 30. App icon + splash screen
**Goal**: replace the placeholder hammer.
**Files**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`, `ios/App/App/Assets.xcassets/Splash.imageset/` (or `Splash.storyboard`).
**Approach**:
- Design a 1024×1024 icon: stylized "BAW" wordmark + simplified building polygon, or the Brewery Artwalk logo if licensed.
- Generate iOS icon set via `npx capacitor-assets generate --ios` (install `@capacitor/assets` first), passing `assets/icon.png` (1024×1024) and `assets/splash.png` (2732×2732 with content centered).
- Run `npx cap sync ios`.
**Verify**: install fresh on simulator → home screen shows new icon; launch shows new splash.

### 31. Smooth chip-change animation
**Goal**: dim/undim of buildings should fade, not snap.
**Files**: `index.html` CSS for `.bld-rect`, `.bld-label`.
**Approach**:
- Add `transition: opacity 200ms ease, fill 200ms ease, stroke 200ms ease` to `.bld-rect`.
- Same on `.bld-label` and `.bld-street`.
- Verify it doesn't slow down the initial render (transitions on first paint can flicker — wrap in a short `requestAnimationFrame` if so).
**Verify**: toggle "Ceramics" → buildings fade smoothly.

### 32. Larger building labels at high zoom
**Goal**: labels don't shrink to pixel dust when zoomed in.
**Files**: `index.html` (`renderMap` re-size on zoom, or use SVG `vector-effect`).
**Approach**:
- After `setView` runs, compute zoom ratio `NATURAL.w / VIEW.w`. Apply font-size via CSS variable on `.bld-label` (or re-render text elements with new size).
- Alternatively: SVG `text` doesn't support `vector-effect="non-scaling-stroke"` for fonts directly — JS resize is the simpler path.
- Cap maximum size so labels don't blow up to the size of the building.
**Verify**: pinch in → labels stay readable; pinch out → labels return to current size.

---

## Done indicators

When the whole backlog is shipped, the app should:
- Run via `npm run sim` for production-style builds and `npm run sim:live` for live-reload dev.
- Show the user's GPS pin live on the campus.
- Star artists, see them across sessions.
- Reveal which buildings have artists at a glance and which are empty.
- Match the printed map's spatial accuracy because tap zones are calibrated in-app.
- Render in dark mode the same quality as light.
- Have a real icon and splash on the home screen.
