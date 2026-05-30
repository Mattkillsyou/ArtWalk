# AUDIT — Brewery Art Walk app (read-only, Phase 1)

Audit only. Nothing was changed to ship behaviour in this phase. Line numbers are
against `index.html` at the time of audit (1,538 lines; the two giant lines 666/667
are the base64-inlined `artists.json`/`buildings.json`).

**Headline:** the *map* is in much better shape than the legacy docs claim — the
real exposure is **content rights** (photos, bios, official-map derivatives,
trademarked name/icon) plus a **broken native project** and one genuine
**data-matching bug** that hides 12 artists from the map.

---

## 1A. Correctness & bugs

### A1 — Map calibration: already done (legacy docs are stale) — INFO
`HANDOFF.md` and `CLAUDE.md` describe an uncalibrated `OVERLAY = {x:-55,y:-490,…}`,
a misplaced `1910 N. Main`, and missing buildings. **None of that matches the
current code:**
- viewBox is `0 0 1019 913` (index.html:618) — the SVG was re-derived 1:1 against
  the map image. `NATURAL = {w:1019,h:913}` (934).
- `OVERLAY` is now `{x:0,y:0,width:1019,height:913}` (1035) — i.e. identity.
- `1910 N. Main Street` is at `x:139,y:64` (852) = **NW corner**. Correct.
- Previously-"missing" buildings **exist** in `POSITIONS`: 606 (898), 608 (899),
  614/616 (857-858), 674/678 (902/904), 688 (880-882), 694 (905-907, 920-923).
- `POSITIONS` has **79 shapes**; `buildings.json` has **52 records**.

Action: **verify by rendering** (Phase 2), don't "re-fix". `2024 N. Main` (from the
old missing-list) is absent from both data files — confirm it's intentional.

### A2 — 12 artists are unreachable on the map (address↔POSITIONS mismatch) — HIGH
`artistsByAddress` is keyed by each artist's exact `address` (index.html:993-996),
and the map taps/zooms by `POSITIONS[addr]`. **9 artist addresses have no matching
`POSITIONS` key**, so those buildings can't be tapped and search→tap neither zooms
(`zoomTo` returns early at 1372-1373) nor highlights:

| Artist address (artists) | Why it doesn't match a shape |
|---|---|
| `618 Moulton Avenue` (1) | map only has `618 Moulton Avenue #A…#F` |
| `622 Moulton Avenue` (1) | map only has `622 Moulton Avenue #A…#G` |
| `690 Moulton Avenue` (2) | map only has `690 Moulton Avenue #A…#C` |
| `692 Moulton Avenue` (1) | map only has `692 Moulton Avenue #A,#B` |
| `696 Moulton Avenue` (3) | map only has `696 Moulton Avenue #A…#E` |
| `632 Moulton Avenue` (1) | map merges these into `630-638 Moulton Avenue` |
| `634 Moulton Avenue` (1) | "" |
| `638 Moulton Avenue` (1) | "" |
| `1984 N. Main Street` (1) | **no shape exists at all** |

12 artists total. They still appear in search results (and detail opens), but the
map never reacts. Fix in Phase 2 with an address→shape resolver (and a decision on
`1984`). 57 `POSITIONS` shapes have 0 artists — mostly legitimate (landmarks
`Garden`/`Construction Yard`, sub-unit cells, buildings flagged "not in the 2026
program" in `buildings.json`); not a bug, but it's why badges were dropped.

### A3 — Geolocation transform is a flat lat/lng→box map — LOW (accuracy)
`latLngToSvg` (746-755) linearly maps a GEO bounding box (`nw 34.066,-118.2195` /
`se 34.0628,-118.2156`) onto `1019×913`. The printed campus is rotated relative to
true north (Moulton Ave runs NW→SE), so a north-up linear map introduces rotational
error — the "you are here" dot can sit tens of metres off. Acceptable for V1 (it's a
nicety, gated by an 800 m "near campus" check, 749/811), but document it. Capacitor
Geolocation is preferred with a `navigator.geolocation` fallback (781-796) — fine.
The usage string that makes this work is **missing from Info.plist** (see 1D).

### A4 — Service worker ships official-map derivatives + dead remote logic — MED
`sw.js`: cache `baw-shell-v1` precaches `./bw map.jpg` + `./map_greyscale.jpg`
(SHELL, 11-16) — these are **copyrighted official-map derivatives** and are also
copied into `www/` by `prepare.js` (line 98). They are **not used by the app at
runtime** (see A5), so they ship for no functional reason. Separately, the
`breweryartwalk.com` image branch (57-72) is **dead** — all 202 image refs are local
(`img/artists/…`), 0 remote. Same-origin handler is cache-first with no cache
versioning beyond the `CACHE` constant, so a stale `index.html` can persist across
updates until the cache name changes — bump the cache name on release. Phase 3/4:
rename cache (de-brand), drop both map images from SHELL + `prepare.js`, delete the
remote branch.

### A5 — Dead code / vestigial features — LOW
- **Overlay mode is vestigial**: `OVERLAY`, `overlayMode`, `OVERLAY_SRC` (1035-1039)
  are computed but **no `<image>` is ever injected** — `?overlay=` only toggles a
  body class that hides labels. So the map images are never actually drawn. Safe to
  delete with the map-image removal (Phase 4).
- **Badges**: `applyFilters` looks up `text.badge-text`/`circle.badge-circle`
  (1189-1190) but `renderMap` never creates them (guarded, so harmless). CSS at
  207-209/248-296 is dead.
- **`bld-name`**: `updateZoomLevel` toggles `.bld-name` (1369) but `renderMap`
  emits `.bld-label`/`.bld-street`, never `.bld-name`. No-op.
- **`buildings.json` is inlined but unused by the UI** (renderMap reads `POSITIONS`;
  detail reads `artistsByAddress`). Harmless; keep as the building fact table.
- **Stale comment** 838-843 says "viewBox is 1200×1400" — actual is 1019×913.
- `category_original` (artists.json) is retained but never displayed.

### A6 — Things that are correct — INFO
Favorites (Capacitor Preferences with `localStorage` fallback, 689-712; key
`baw.favorites.v1`) work and persist; `favKey` = name|address|unit. Search/filter
(1164-1202) covers name/medium/address/category + a Favorites chip; `favOnly` is
declared (999) before first runtime use — **not** a bug. Pan/zoom/pinch (1347-1484)
fine. `esc()` escapes injected HTML; base64 inlining avoids parser issues. SVG has
`role="img"` + `aria-label`; About modal has dialog semantics. No obvious crashers
besides the missing-data fallback path (which shows a helpful error banner).

---

## 1B. Trademark / branding surface

Every place the protected mark / org identity / personal GitHub handle appears.
"Ships" = reaches the end user's device or the store listing.

| File | Line(s) | Current string | Risk | Ships? |
|---|---|---|---|---|
| `capacitor.config.json` | 2-3 | `appId com.breweryartwalk.app`, `appName "Brewery Art Walk"` | mark as bundle id + app name | ✅ |
| `ios/App/App/capacitor.config.json` | 2-3 | same (synced copy) | same | ✅ |
| native (recovered from archive) | — | `CFBundleDisplayName "Brewery Art Walk"`, `CFBundleIdentifier com.breweryartwalk.app` | mark as display name + id | ✅ |
| `index.html` | 11 | `apple-mobile-web-app-title "Brewery"` | mark | ✅ |
| `index.html` | 13 | meta desc "The **official-style** guide to the Brewery…" | implies official | ✅ |
| `index.html` | 14-15 | `og:title "Brewery Art Walk"`, og:desc | mark | ✅ |
| `index.html` | 20 | `<title>Brewery Art Walk</title>` | mark | ✅ |
| `index.html` | 606 | header `<p id="title">Brewery Art Walk</p>` | mark | ✅ |
| `index.html` | 618 | svg `aria-label="Brewery Art Colony campus map"` | mark | ✅ |
| `index.html` | 645 | About `<h2>Brewery Art Walk</h2>` | mark | ✅ |
| `index.html` | 652-653 | About links → `mattkillsyou.github.io/ArtWalk/...` | personal handle | ✅ |
| `index.html` | 654 | About link → `breweryartwalk.com` "Brewery Art Walk org" | links the org as if affiliated | ✅ |
| `index.html` | 656 | "Artist names, bios & images **used with permission**.<br>© 2026 Brewery Art Walk" | **false permission claim** + asserts their © | ✅ |
| `index.html` | 690 | `FAV_KEY 'baw.favorites.v1'` | mark initials (internal) | ✅ (storage key) |
| `index.html` | 743, 839 | code comments referencing the org / "official … Spring 2026" map | mark (comments) | ✅ (in source) |
| `manifest.webmanifest` | 2-4 | `name/short_name/description` = Brewery… | mark | ✅ |
| `sw.js` | 10 | cache `'baw-shell-v1'` | mark initials | ✅ |
| `sw.js` | 1, 57-72 | "Brewery Art Walk service worker", `breweryartwalk.com` fetch | mark + dead remote dep | ✅ |
| `PrivacyInfo.xcprivacy` | 5 | comment "Brewery Art Walk does not track users" | mark (comment) | ✅ |
| `app-icon-1024.svg`, `icons/favicon.svg` | 55, 58 | icon wordmark **"BAW"** + **"BREWERY ART WALK"** | **mark as icon/trade dress** | ✅ |
| generated icons (`icons/*.png`, `ios-icon-stash/icon-1024.png`) | — | derived from the SVG above | same | ✅ |
| `docs/index.md` | 3-9 | title "Brewery Art Walk", "**official-style** guide app to the Brewery" | implies official | 🌐 site |
| `docs/_config.yml` | 1-2 | title/description "official-style guide" | implies official | 🌐 site |
| `docs/privacy.md` | 3,7,46-47,61 | title + "**used with permission** from the Brewery Art Walk org" + `hello@breweryartwalk.app` | false permission + branded email | 🌐 + linked in-app |
| `docs/support.md` | 3,8,42-43 | "unofficial guide built **with permission**", branded email | false permission | 🌐 + linked in-app |
| `package.json` | 2,5,32 | name `artwalk`, desc "for the Brewery Art Walk", repo `Mattkillsyou/ArtWalk` | mark + handle | repo |
| `README.md` | 3,37,59,76 | org name, "official printed campus map", GitHub URL, "decided with the Brewery Art Walk org" | mark + handle | repo |
| `APP_STORE_PREP.md` | many | name, "official-style guide", "permission letter", bundle id, keywords incl "Brewery" | store copy uses mark as title | store |
| `MAC_SETUP.md`, `HANDOFF.md`, `design_prompt.md`, `build_prompt.md`, `capture.html` | — | GitHub URLs / org refs (dev docs) | handle/mark (not shipped) | dev |

Allowed to remain (nominative): **one** plain-text factual line naming the event to
say what the app is for, plus the disclaimer — no logo, wordmark, colors, or
"official". Everything in the "Ships ✅" rows must be neutralized in Phase 3.

---

## 1C. Copyrighted-content inventory (the core issue)

Governing line: facts and directory data are **not** copyrightable (*Feist v.
Rural*); only original creative expression and original selection/arrangement are.

### Must REMOVE — third-party creative expression (no license)

| Asset | Where | Size/Count | Source | Why |
|---|---|---|---|---|
| Artist **photos** | `img/artists/*` (tracked in git) + mirrored to `www/img/artists/` by `prepare.js` | **197 files**, 202 refs across 41 artists | scraped from org site | artwork/photographs = © artist/org |
| Artist **bios** | `artists.json` `bio` field | **34** non-empty | copied prose | creative text = © |
| Official **map** | `Map.jpg` (1.7 MB), `image00001.jpeg` (4.5 MB) | tracked | the printed map | © map artwork |
| Map **derivatives** | `bw map.jpg` (191 KB), `map_greyscale.jpg` (439 KB) | tracked **+ shipped in `www/`** + SW-precached | from the printed map | © derivative |
| Campus **photos** | `IMG_1075 copy.png` (8.9 MB), `IMG_1077 copy.png` (7.3 MB) | tracked | reference photos | © |
| Map **traces / OCR** | `template.svg` (593 KB), `template-shapes.json` (35 KB), `ocr.json` (32 KB) | tracked | auto-traced/OCR'd from the map | derivative of © map |
| Icon **map-trace** | `app-icon-1024.svg` / `favicon.svg` "traced from the actual map" comment | tracked + generated PNGs ship | from the printed map | derivative in the icon |
| Transfer blob | `wetransfer_*.zip` (265 MB) | already `.gitignore`d | raw map source | © (doesn't ship) |

Dev-only intermediates derived from the map (don't ship, but tied to the © source):
`positions-captured.json`, `positions.json`, `positions.js`, `capture.html`,
`numbered.html`, `convert-captured.mjs`, `match-*.mjs`, `parse-template.mjs`,
`ocr.mjs`, `update-html.mjs`. The current `POSITIONS` coordinates themselves are
**facts** (building locations) — keep them; the schematic we draw from them is our
own work.

### May KEEP — non-copyrightable facts / our own work

- Artist **name, studio address, unit, building, category, medium** (incl.
  `category_original`) — directory facts.
- Public **website / instagram / profile_url / other_links** URLs — facts/links.
- `buildings.json` records (address, units, floors, position, notes) — facts.
- The hand-built **SVG schematic** (`POSITIONS` + `renderMap`) — our original
  drawing of factual positions (must stay a drawing, not an embedded map image).
- **Inter Tight** font (`fonts/inter-tight.woff2`) — SIL OFL, free to bundle. ✅

Net: the app keeps a complete factual directory + original map; it loses photos and
bios. That's the price of needing no permission.

---

## 1D. App Store readiness (requirements verified May 2026)

**Verified against Apple this run:**
- **Min SDK:** as of **Apr 28, 2026**, new submissions/updates must be built with
  the **iOS 26 SDK (Xcode 26+)**. We have **Xcode 26.5 / iOS 26.4 SDK** → compliant;
  the prior archive already used iOS SDK 26.4.
- **Screenshots:** at least one **iPhone** screenshot required; **6.9"** is the
  current iPhone class (Apple lists 6.9" and a conditional 6.5"); **13" iPad**
  required only if the app supports iPad. To dodge spec ambiguity I'll **capture at
  the simulator's native resolution** (iPhone 17 Pro Max = 6.9", 1320×2868), which
  Apple accepts for that class.

**Our status / gaps:**
- **Privacy manifest** `PrivacyInfo.xcprivacy` is present and reasonable: precise
  location, `AppFunctionality`, not linked, not tracking; required-reason APIs
  `CA92.1` (UserDefaults) + `C617.1` (file timestamp). ✅ (only the comment is
  branded.) Must be copied into the app target on sync (`ios:add` does this).
- **`NSLocationWhenInUseUsageDescription`: MISSING.** No source `Info.plist` exists
  and the shipped archive's `Info.plist` has no `NSLocation*` key. The app calls
  Geolocation → iOS will deny/kill location and a reviewer will flag it. Must be
  added when the project is regenerated (Phase 5), honest + new-name.
- **Native project is broken:** `ios/App/App.xcodeproj/project.pbxproj` and
  `ios/App/App/Info.plist` are **absent** (the `.xcodeproj` dir only has
  `project.xcworkspace/…`). `xcodebuild -workspace … -scheme App` cannot succeed.
  → **Regenerate** the iOS platform (`npx cap add ios`) after the rebrand so it
  picks up the new id/name, then re-add `PrivacyInfo.xcprivacy` + the location
  string. (A prior archive/IPA exists under `ios/App/dist/`, Team `RPV54B2NK5`,
  automatic signing — proof signing worked once; signing itself is a human GUI step.)
- **Guideline 4.2 (min functionality / web wrapper):** defensible — three native
  capabilities (Geolocation dot, offline service worker, persistent favorites)
  beyond a bare website. Keep them working and say so in review notes.
- **Guideline 5.2 (IP / unofficial):** the real review risk. After de-brand + strip
  there is no protected imagery, copied text, or trademarked app name for a reviewer
  to catch — **substantially** lower. **Not zero:** an app that is clearly a
  companion to one named event remains within Apple's discretion. Mitigation =
  proactive review notes (Phase 5) + the in-app disclaimer. Belt-and-suspenders
  (out of scope, owner declined): written content permission from the org/artists.
- Age rating 4+; category Travel or Reference; no accounts, no IAP, no ads, no
  tracking — all simple and honest.

---

## 1E. Fix & rebrand plan (ranked → phases)

**Phase 2 — correctness**
1. (HIGH) Fix A2: add an address→shape resolver so all 108 artists are tap- and
   search-reachable; decide `1984 N. Main` (add a shape or alias). Re-key
   `artistsByAddress`/`applyFilters`/`zoomTo` through it.
2. (MED) Render the map (browser preview) and confirm A1 — calibration is good;
   fix the stale 1200×1400 comment.
3. (LOW) Remove dead code (badges, `bld-name`, vestigial overlay injection) if
   low-risk; verify favorites, search, geolocation, offline behave.
4. Build check: native build is blocked (see 1D) → verify in the **web preview**
   this phase; defer the native build to Phase 5 after platform regen. Run
   `node prepare.js`.

**Phase 3 — de-brand** (every "Ships ✅" row in 1B)
5. Pick a neutral geographic name (+2 alternates, rationale). Apply to
   `appName`, `<title>`, header, manifest, meta/og, SW cache, `apple-mobile-web-app-title`,
   docs, README, package.json.
6. New bundle id `com.<name>.studiomap` in `capacitor.config.json` (target id is a
   human GUI step, noted).
7. One nominative line + the disclaimer in About + store copy; drop the
   `breweryartwalk.com` "org" link and "official-style"; delete the
   "used with permission" / "© Brewery Art Walk" line.
8. New **neutral icon** (no wordmark, no map trace) → regenerate all PNG sizes.
9. Rewrite `APP_STORE_PREP.md` copy.

**Phase 4 — content rights**
10. Move photos, map files, traces/OCR, campus photos, and dev map-intermediates to
    gitignored `_archive/`; drop map images from `prepare.js` + `sw.js`.
11. Blank `images` (41) and `bio` (34) in `artists.json`; render an initials/category
    placeholder tile instead of `<img>`.
12. Fix `docs/privacy.md`, `docs/support.md`, in-app About to the no-permission,
    no-remote-images, disclaimer framing. `node prepare.js`; confirm render.

**Phase 5 — store prep**
13. Regenerate iOS platform; add honest `NSLocationWhenInUseUsageDescription`;
    re-add `PrivacyInfo.xcprivacy`; `cap sync`; attempt a **simulator** build.
14. `simctl` screenshots (map, building→list, artist detail, active filter) at native
    6.9".
15. Honest metadata (name/subtitle/promo/desc/keywords) + proactive **5.2/4.2**
    review notes; `SUBMISSION_CHECKLIST.md` with human-only steps; attempt
    archive only if signing is already wired (else hand off).

**Needs an owner decision (flagged, not blocking):** final app name (I'll choose and
record one), whether to pursue content permission for belt-and-suspenders 5.2 cover,
and whether `1984 N. Main`/`2024 N. Main` should get drawn shapes.
