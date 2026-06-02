# ArtWalk LA — Full Multi-Agent Audit

*Produced 2026-06-02 by 11 specialist auditors with adversarial verification of every P0/P1 finding. Severities below are the post-verification (adjudicated) levels, not the original claims.*

## Executive summary

**Overall health: good.** The shipped app is functionally solid and the legally-sensitive work — the copyright strip — is the strongest part of the build. All 108 artists carry facts only (verified by decoding the base64 actually inlined in `index.html`, not just the source JSON: 0 bios, 0 photos, 0 profile URLs); all scraped photos and every official-map artifact are quarantined in a gitignored `_archive/`; the in-app map is the project's own original SVG; and the not-affiliated disclaimer ships verbatim. All three HANDOFF "known bugs" are resolved (1910 N. Main is in the NW corner, previously-missing buildings are present, the `?overlay=1` debug path is gone), the removed "Take me there" route feature left zero dangling references, performance is healthy, and there are no committed secrets and no telemetry of any kind.

**Top risks, in priority order:**

1. **Submission artifacts are stale and will misrepresent the app (P0).** The four screenshots `SUBMISSION_CHECKLIST.md` tells the human to upload (`store/screenshots/01-04*.png`) show the *abandoned* name "LINCOLN HEIGHTS STUDIO MAP" and the pre-UX-upgrade UI. The correct current shots sit in an unreferenced `store/screenshots/ux2/` folder. Uploading the referenced set means shipping App Store imagery that does not match the binary.
2. **Bundle identifier still embeds the trademark, and the docs disagree with the code (P1/P2).** Every native config ships `com.breweryartwalk.app` — the one de-brand step the project's own legal guide explicitly forbids — while `SUBMISSION_CHECKLIST.md`/`APP_STORE_PREP.md` instruct the human to use `com.lincolnheights.studiomap`. Following the docs would bounce the upload ("no matching app record"). This is a decision point for the human owner, not a blind fix.
3. **The interactive map is inaccessible to VoiceOver and keyboard (P1).** All ~52 building tap targets are click-only with no role/tabindex/label/key handler, and the parent `<svg role="img">` hides descendants from assistive tech. There is no non-spatial way to browse studios except typing a known query into search. This is a real App Store accessibility gap and the app's primary interaction is unreachable for AT users.
4. **Two declared native plugins are not installed (P3, but worth knowing).** `@capacitor/geolocation` and `@capacitor/preferences` are in `package.json` but absent from `node_modules`/Pods, so the native code paths are dead and the app silently falls back to web `navigator.geolocation` / `localStorage`. No crash — the guards handle it — but the manifest implies native capabilities the binary doesn't ship.
5. **A copyrighted-image scraper is still armed in the repo (P1/P2).** `package.json`'s `images:download` runs `download-artist-images.mjs`, which fetches `breweryartwalk.com` artist photos and rewrites `artists.json`. It is a no-op today (the `images` arrays are empty) but remains a one-/two-command path back to exactly the content the facts-only positioning forbids.

**What is solid:** the facts-only copyright strip (verified at the bundle level), offline self-containment (zero network/CDN dependencies, inline data, hand-built SVG), data integrity (108/52/79 counts exact, 0 orphaned artists, uniform schema), privacy posture (location never leaves the device, no tracking, honest manifests), build-pipeline idempotency (`prepare.js` is hash-stable and escaping-safe), gesture/momentum engineering, and per-frame performance. The text deliverables (store copy, review notes, privacy/support docs) are honest and within Apple's limits; the proactive Guideline 5.2 note is exactly what an unofficial event-companion app needs.

## Critical & high findings (verified)

### P0 — Stale screenshots show the OLD app name and UI; the checklist points humans at them
**Location:** `store/screenshots/01-map-home.png` (+ `02-building-list`, `03-artist-detail`, `04-filter-active`); referenced by `SUBMISSION_CHECKLIST.md:23` & step 5, plus `store/metadata.md`.
**Reality (confirmed by direct image rendering):** `01-map-home.png` renders the header "LINCOLN HEIGHTS STUDIO MAP" (abandoned name), the old +/−/⟲ zoom buttons only, no "Near me" chip, and no bottom action bar. The current UI ("ARTWALK LA", action bar, initials tiles) exists only in the *unreferenced* `store/screenshots/ux2/` set (`01-home`…`06-sunlight`, dated Jun 2). A human following the checklist would upload imagery that doesn't match the shipped binary.
**Recommendation:** Repoint `SUBMISSION_CHECKLIST.md`/`store/metadata.md` at `store/screenshots/ux2/`. Archive the top-level `01-04*.png` **and** the intermediate `store/screenshots/ux/` set (which also contains a byte-identical dupe `08-route.png` of the *removed* route feature) so the wrong files can't be grabbed. Re-capture the iPad set (see P1 below). *Claude-fixable (doc re-point + archive); the actual upload is human-only.*

### P1 — Bundle id still `com.breweryartwalk.app`; code and submission docs disagree
**Location:** `ios/App/App.xcodeproj/project.pbxproj:359,378` (`PRODUCT_BUNDLE_IDENTIFIER`); `capacitor.config.json:2` (root + `ios/App/App/`); vs `SUBMISSION_CHECKLIST.md:11,41,52`, `APP_STORE_PREP.md:16`, `CHANGELOG_REBRAND.md:139`.
**Reality (confirmed):** All three code locations ship `com.breweryartwalk.app`; the display name was correctly de-branded to "ArtWalk LA" everywhere else (only the factual disclaimer in `index.html:1035` still names the event). The docs instruct `com.lincolnheights.studiomap`. `CHANGELOG_REBRAND.md:139` claims the id was already changed — it never was. The web cache slug *did* migrate (`sw.js:9` = `studiomap-shell-v1`), so the rebrand was half-applied. Following the docs to create the App Store Connect entry would produce a no-matching-record upload failure. (Adjudicators split this into a trademark concern and a doc-mismatch concern, both landing at P1–P2; the bundle id is not user-visible, so practical trademark exposure is low, but it contradicts `UNOFFICIAL_APP_LEGAL_GUIDE.md:31`.)
**Recommendation — decision point for the human owner, do not blind-fix:** Pick ONE id and make code + all docs agree. The repo does not actually record App Store app id `6766774479` (grep is empty), so verify upload state first. (a) If no build has shipped to that record, change `PRODUCT_BUNDLE_IDENTIFIER` in both configs + pbxproj to a neutral id (e.g. `com.<owner>.artwalkla`) before first upload and create a fresh record. (b) If a build is already live, the id is frozen — keep `com.breweryartwalk.app`, fix the docs to match, and note in `store/review-notes.md` that the reverse-DNS string is legacy/non-public. Bundle-id/signing edits in Xcode are human-only.

### P1 — Interactive map is fully inaccessible to VoiceOver & keyboard
**Location:** `index.html:998` (`<svg role="img" aria-label="Studio campus map">`); `renderMap()` building groups at `index.html:1535-1583`.
**Reality (confirmed verbatim):** Each building is `el('g', { class:'bld-group', 'data-address':addr })` with only a `click` listener — no `role`, no `tabindex`, no `aria-label`, no `keydown`. `role="img"` on the parent additionally tells AT to ignore the SVG `<text>` labels. The only keyboard wiring in the whole file is on the sheet handle; a grep finds zero ARIA/keyboard wiring on `bld-group`. Search results *do* render an accessible `<ul>`, but reaching them requires typing a known query, and the action bar has no "browse all" directory. So AT/keyboard users cannot select any of the ~52 buildings — the app's core interaction.
**Recommendation:** Give each `<g>` `role="button"`, `tabindex="0"`, a descriptive `aria-label` (e.g. `"600 Moulton — 4 studios"`), and an Enter/Space `keydown` → `onBuildingTap(addr)`. Demote the parent `<svg>` off `role="img"` so descendants are exposed. Add a non-spatial "Browse all studios" list (reuse the existing accessible artist `<ul>`). *Claude-fixable.*

### P1 — Pinch-zoom disabled on fixed-px UI chrome with no Dynamic Type (low-vision users can't enlarge the UI)
**Location:** `index.html:5` (`maximum-scale=1, user-scalable=no`); fixed-px chrome — `#status` 13px (`165`), chips 14px (`439`), search 16px (`106`), action-bar labels `var(--ux-fs-2xs)`; zero rem/em font-sizes; no `text-size-adjust`.
**Reality (partial — real, but mis-scoped in the original write-up):** The viewport blocks page zoom and all *chrome* text is absolute px with no link to the iOS "Larger Text" setting, so a low-vision user has no way to enlarge the search field, bottom sheet, chips, status readout, or action-bar labels. **Correction:** the "8px" labels the original finding emphasized (`.bld-name`/`.bld-street`) are SVG map text that *does* scale via the in-app zoom controls — only the HTML chrome is stuck. WCAG 1.4.4 / Apple HIG Dynamic Type apply.
**Recommendation:** Drop `maximum-scale=1, user-scalable=no` (the map manages its own pinch via `touch-action:none` on `#map`, so page-level zoom of the chrome won't break it). Scale chrome text off a rem/Dynamic-Type base feeding the `--ux-fs-*` tokens. *Claude-fixable.*

### P1 — Bottom sheet & About modal never move, trap, or restore focus
**Location:** `openSheet`/`closeSheet` `index.html:1667-1679`; `openAbout`/`closeAbout` `index.html:1139-1140`; `#about-modal` is `role="dialog" aria-modal="true"` at `index.html:1022`.
**Reality (partial — confirmed defect, severity lowered P1→P2 by adjudication):** No `activeElement` capture, no focus-restore, no focus-trap, no `inert` anywhere; the only two `.focus()` calls target `#search`. The About dialog is a true `aria-modal` with no focus-in, no focus-restore, and **no Escape handler** (only backdrop-click + ×), so Tab escapes it and the page behind is reachable — a real WCAG 2.4.3 / ARIA-dialog defect. **Corrections:** `#sheet` is `role="region"` (non-modal), so a focus *trap* is not expected there — its only gap is focus-move-in/out; and the sheet handle *does* already have an Escape/Arrow `keydown` handler, it's just unreachable because focus never enters the sheet. Downgraded because this is a touch-first iOS app where VoiceOver (not a Tab keyboard) is primary and both panels close on an outside tap.
**Recommendation:** On open, record `document.activeElement` and move focus into the panel; on close, restore it. For `#about-modal` only, add a Tab/Shift+Tab trap + Escape-to-close + `inert`/`aria-hidden` on the rest of the page. *Claude-fixable.*

### P1 → resolved-to-P2: SW cache version never bumped (stale shell for PWA users)
**Location:** `sw.js:9` (`const CACHE = 'studiomap-shell-v1'`, byte-identical in `www/sw.js`); same-origin cache-first handler `sw.js:38-49`.
**Reality (partial — confirmed mechanism, scope-limited):** The cache key was last set at Phase 3 and never changed despite 13 commits to `index.html` (1393 insertions/90 deletions) and 5 icon redesigns. The `activate` handler only deletes caches where `key !== CACHE`, and the fetch handler never refreshes an already-cached entry, so a returning PWA visitor is served stale `index.html` indefinitely. **Why P2 not P1:** the SW is provably dead in the iOS app (registration is guarded by `/^https?:/.test(location.protocol)` and WKWebView ignores SWs for scheme-handled content), and there is **no evidence a GitHub Pages site is actually deployed** (no `CNAME`, no workflow). Real-world impact today may be zero.
**Recommendation:** Before any web deploy, bump `CACHE` on every shippable change (derive from a build hash/date in `prepare.js`) and make the navigation document network-first or stale-while-revalidate. *Claude-fixable.*

### P1 → resolved-to-P2: `images:download` scraper re-arms copyrighted photos/bios
**Location:** `package.json:14-15`; `download-artist-images.mjs` (rewrites `artists.json` in place; custom `BreweryArtWalkBot/1.0` UA).
**Reality (confirmed, immediacy corrected):** The script downloads `breweryartwalk.com` images and rewrites `artists.json`; git history at `6cc9c27` proves it previously held copyrighted bios + `profile_url` + populated `images` that were deliberately emptied. The schema keys (`images`, `bio`, `category_original`, `profile_url`) persist on all 108 records. **Correction:** all `images` arrays are empty and `profile_url` is null today, so `npm run images:download` alone is a no-op — re-arming requires re-running the *original* scraper first. Nothing copyrighted is in the tree or ships now; this is a latent footgun, not an active leak.
**Recommendation:** Delete `images:download`/`images:compress` from `package.json`; archive `download-artist-images.mjs` + `compress-artist-images.mjs` to `_archive/`; drop the `tesseract.js` devDependency (legacy OCR only); strip the vestigial `images`/`bio`/`profile_url`/`category_original` keys from `artists.json` so no tool has a slot to refill. *Claude-fixable.*

### P0 → resolved-to-P1: Export-compliance/encryption undeclared
**Location:** `ios/App/App/Info.plist` (no `ITSAppUsesNonExemptEncryption`); not mentioned in any submission doc.
**Reality (confirmed, severity lowered P0→P1):** No encryption key in `Info.plist` and zero repo mentions of export compliance. The app uses only standard HTTPS (`iosScheme https`) and ships no custom crypto (grep across Swift/JS/HTML found only one unrelated comment), so a `<false/>` exempt declaration is accurate. **Why P1 not P0:** App Store Connect presents this as a guided manual prompt — it stalls/degrades each upload rather than blocking the build; without the key the human must answer manually and could guess wrong.
**Recommendation:** Add `<key>ITSAppUsesNonExemptEncryption</key><false/>` to `Info.plist` and one line to `SUBMISSION_CHECKLIST.md` ("export compliance = No / exempt HTTPS only"). *Claude-fixable.*

### P0 → resolved-to-P1: iPad (13") screenshots predate the UX action-bar upgrade
**Location:** `store/screenshots/ipad/` (2064×2752, dated May 30).
**Reality (confirmed):** The iPad shots have the correct name ("ARTWALK LA") and correct dimensions but the OLD bottom layout (only +/−/recenter, no action bar) **and** the OLD chip row (no "Near me" chip). iPad support is genuinely declared via `TARGETED_DEVICE_FAMILY = '1,2'` (`project.pbxproj:363,382`), so 13" screenshots are *required* — the "skip if iPad isn't a priority" escape hatch does not apply unless device family is changed to iPhone-only.
**Recommendation:** Re-capture the 13" iPad set from the current build (dimensions are already right), or set `TARGETED_DEVICE_FAMILY=1` to drop iPad and remove the requirement. *Screenshot capture is effectively human/simulator-driven; the device-family decision is Claude-fixable.*

### P1 → resolved-to-P2: Default (light/auto) theme contrast failures
**Location:** `.bld-street` `index.html:231-236`; `.street-label` `index.html:261-264`; `.about-fine` `index.html:495-503`.
**Reality (partial — the headline claims were false positives, smaller real failures remain):** **Correction:** the primary building-number labels `.bld-label` actually ship at `#6a6a6a` = **5.41:1 (PASS)** because `index.html:729` overrides the dead `#8c8c8c` base rule, and `--ux-ink-faint` has **zero `var()` consumers** (dead token) — both originally-flagged "failures" are false positives. Genuine AA failures in the default theme: `.bld-street` street names `#b2b2b2` on `#fff` = **2.12:1** at 8px (worst), `.street-label` `#777` on `#ededed` = **3.83:1**, `.about-fine` disclaimer `#888` on `#fff` = **3.54:1**. Downgraded to P2 because these are secondary map text + fine print, and the one-tap "sunlight" theme is pure `#000`-on-`#fff` (21:1).
**Recommendation:** Darken `.bld-street` to ~`#6a6a6a` and bump above 8px; darken `.street-label` (or lighten its strip); darken `.about-fine` to ~`#767676`. *Claude-fixable.*

## Dismissed (false positives)

These were claimed but the adversarial pass found them not to hold as stated:

- **`.bld-label` building numbers fail AA at 3.36:1** — *false positive.* The `#8c8c8c` base rule (`index.html:222`) is overridden by `index.html:729`; the shipped color is `#6a6a6a` = 5.41:1 (passes).
- **`--ux-ink-faint` #8c8c8c used for faint text fails contrast** — *false positive.* The token has no `var(--ux-ink-faint)` consumer anywhere; it colors nothing.
- **"Near me" filter bug is P1** — *downgraded, not dismissed.* Confirmed real (the live `uxNearMe` ignores active filters AND drops the top-30 slice) but it's a non-crashing UI inconsistency → P2.
- **Bundle-id is "permanent"** — *overstated.* A bundle id only freezes once a build is uploaded to a given ASC record; the repo cannot prove upload state.

## Findings by dimension

### 1. Core app correctness & bugs
*Solid. Data loading, favorites, search/filter, sheet, pan/zoom, and event wiring are coherent; the route feature was removed cleanly; all three HANDOFF bugs are resolved (1910 N. Main NW at `index.html:1256`; previously-missing buildings present; `?overlay=1` fully removed).*

| Sev | Finding | Location | Recommendation |
|---|---|---|---|
| P2 | Live "Near me" (`uxNearMe`) ignores active category/favorite filters and drops the top-30 slice; the filter-aware version is dead | `index.html:2137` (dead) overwritten by `2322`→`uxNearMe` (`2274-2310`) | Delete the `2137` definition; add `if (!matchesFilter(a)) return;` (and consider `favOnly`) inside `uxNearMe`, or relabel it filter-independent |
| P2 | GPS lat/lng→SVG projection stretches a ~square (~360 m) campus into a 1019×913 box (~10% anisotropic skew) | `index.html:1151-1160`, inverse `2124-2129`/`2223-2230` | Treat the dot as approximate (small absolute error); optionally fit the transform from known corners and document |
| P3 | `findMe()` never sets `window.UX.lastPos`, so "Near me" re-prompts and distance labels stay null until used once | `findMe` `1203-1230`; cache `2244-2260` | Set `window.UX.lastPos` on a successful `findMe()` fix to share one cache |
| P3 | Rapid double-tap of "Find me" during the GPS await can desync button state from the painted dot | `findMe` `1203-1230` | Add an in-flight guard; only add `active` after a successful fix |
| info | `updateZoomLevel()` toggles `text.bld-name` nodes `renderMap()` never creates (dead no-op) | `index.html:1874` | Remove the line + orphaned `.bld-name` CSS |
| info | `applyFilters()` updates artist-count badges that are never rendered (dead branch) | `index.html:1631-1637` | Remove the badge block + badge CSS |

### 2. UX-upgrade features
*Well integrated. Hook collisions resolve by load order, action-bar buttons bind exactly once, both scripts parse clean, the removed route left zero refs, and prefers-reduced-motion is honored where it matters.*

| Sev | Finding | Location | Recommendation |
|---|---|---|---|
| P2 | Label-declutter collision math uses stale font sizes (7-14px) vs rendered labels (10-18px CSS) → under-detects overlaps at campus zoom | `uxBuildLabelRects` `index.html:2527` vs CSS `226-230` | Define one shared `LBL_FONT` table keyed by `renderMap`, `uxBuildLabelRects`, and CSS |
| P3 | ~70 lines of dead `window.UX` stubs in the visual block — and `nearMe` at `2137` is a full unreachable impl, not a stub | `index.html:2112-2121`, `2137-2195` | Delete the superseded `nearMe`/`recenter`/`focusSearch` + helpers `svgToLatLng`/`fmtDist` |
| P3 | prefers-reduced-motion is a load-time snapshot in the sheet but live in gestures → mid-session OS toggle leaves sheet animations stale | `index.html:2611` vs `2339-2343` | Read `matches` live at decision time in the sheet controller |
| P3 | `renderMap` baseline offset uses fontSize 8-15 while glyphs render at 10-18px → large labels sit slightly high | `index.html:1563-1568` | Use the shared real-size table for baseline math |
| P3 | `.is-active` action-bar accent styling is dead CSS — no button gets the class | `index.html:825-826` | Wire it or remove the two rules |
| info | Mixed distance units (ft/mi badges vs km gate vs ±N m accuracy) in the near-me view | `2232-2239` vs `2257` | Pick one unit system for the near-me surface |
| info | Unused `seenNoPos` const inside the dead `nearMe` stub | `index.html:2152` | Remove with the surrounding stub |

### 3. Offline-first / PWA / Service Worker
*Genuinely self-contained: zero external/CDN deps, self-hosted font, base64-inline data, pure inline SVG. On iOS the offline guarantee doesn't even depend on the SW (Capacitor ships the bundle on-device). Root and `www/` copies are byte-identical.*

| Sev | Finding | Location | Recommendation |
|---|---|---|---|
| P2 | SW cache version `studiomap-shell-v1` never bumped → stale shell for PWA users (web-only; SW dead on iOS; no Pages deploy proven) | `sw.js:9`; handler `38-49` | Bump `CACHE` per web change; make navigation doc network-first; automate in `prepare.js` |
| P2 | Precache (`SHELL`) lists only `./` and `./index.html` — manifest, icons, font not precached | `sw.js:10-13` | Add font + manifest + 192/512 icons to `SHELL` (small, ~45KB+12KB) |
| P3 | SW registration comment is wrong for the shipped `https` scheme; SW is effectively dead code in Capacitor | `index.html:1233-1240` | Fix the comment; optionally gate registration to exclude Capacitor |
| P3 | Runtime cache-first can pin unversioned assets across deploys even after a version bump | `sw.js:38-52` | Add content-hash query strings or use stale-while-revalidate |
| info | Manifest `any maskable` icons verified to survive the safe-zone (no clipping) | `manifest.webmanifest:12-30` | No change required |
| info | `start_url` is `./index.html` rather than `./` (minor dedup nuance) | `manifest.webmanifest:5-6` | Optional: set to `./` |

### 4. Security & Privacy
*Privacy-clean and largely XSS-safe. Geolocation stays on-device (never in a URL, never persisted, never transmitted). All DOM text is escaped via `esc()`; the search-highlight path is XSS-safe by construction. No secrets, no telemetry, no dynamic-code sinks. Privacy manifests + Info.plist usage strings are correct and consistent.*

| Sev | Finding | Location | Recommendation |
|---|---|---|---|
| P2 | Data-driven `<a href>` uses `esc()` but no URL-scheme allowlist (`javascript:`/`data:` not neutralized; safe today — all 51 URLs are http/https) | `index.html:1722-1725`; `esc()` `1788-1792` | Add a `safeUrl()` http/https allowlist before emitting any data-derived href |
| P3 | No Content-Security-Policy (defense-in-depth gap for a WebView app) | `index.html:4-16`; not in `capacitor.config.json` | Add a `self`-scoped CSP meta with no remote script/connect origins |
| P3 | Legacy Cordova `config.xml` allows navigation to any origin (`<access origin="*">`); `limitsNavigationsToAppBoundDomains:false` | `ios/App/App/config.xml:3`; capacitor configs | Tighten to app-bound domains or remove the wildcard; verify external links still work |
| info | Data ships as `__ARTISTS_B64__` placeholders in some snapshots → same-origin fetch fallback runs (no data leaves device) | `index.html:1414-1429` | Out of scope for security; ensure `prepare.js` runs at sync |

### 5. Accessibility
*Thoughtful scaffolding (every icon button has an aria-label, decorative SVGs are aria-hidden, chips expose aria-pressed, the sheet handle is a real role=slider with arrow keys, prefers-reduced-motion honored in CSS + JS) — but the core map experience is inaccessible to AT.*

| Sev | Finding | Location | Recommendation |
|---|---|---|---|
| P1 | Entire map is one `role="img"`; ~52 building tap targets invisible to VoiceOver & keyboard | `index.html:998`, `1535-1583` | role=button + tabindex + aria-label + keydown per `<g>`; add a browse-all list |
| P1 | Pinch-zoom disabled + fixed-px chrome with no Dynamic Type | `index.html:5`; chrome tokens | Drop `user-scalable=no`; scale chrome off a rem/Dynamic-Type base |
| P1 | Sheet & About modal never move/trap/restore focus; About has no Escape | `1667-1679`, `1139-1144`, `2832-2837` | Capture/restore focus; trap Tab + Escape in the About modal |
| P2 | Default-theme contrast: `.bld-street` 2.12:1, `.street-label` 3.83:1, `.about-fine` 3.54:1 | `231-236`, `261-264`, `495-503` | Darken to meet 4.5:1 (`.bld-label`/`--ux-ink-faint` already fine/unused) |
| P2 | Tap targets below 44px: header locate/info 28px, About-close & back-btn 32px, chips 36px | `84-97`, `504-513`, `407-419`, `132-144` | Enlarge to 44px hit targets |
| P2 | About dialog can't close with Escape; sheet Escape only fires when the handle has focus | `1141-1144`, `2832-2837` | Add a document/modal-level Escape closing whichever overlay is open |
| P3 | Search field's accessible name comes only from its placeholder | `index.html:992` | Add `aria-label` or a visually-hidden `<label>` |
| P3 | `#status` aria-live announces "Showing X of N" every keystroke and is the only spoken map alternative | `1005`, `1639` | Announce on settle; expose a labeled results list |
| P3 | Light-theme active accent `#007aff` is 4.02:1 (just under AA) for the 12px label | `index.html:608`, `825-826` | Darken to `#0040d0` or pair with a non-color cue |

### 6. Content rights, de-branding & Guideline 5.2
*The strongest part of the build. Bundle-level verification confirms facts-only: 0 bios/photos/profile-URLs across all 108 shipped artists. 197 photos + every official-map artifact are gitignored in `_archive/` and untracked; `www/` ships zero rasters. The About disclaimer is verbatim; store metadata excludes the event name from keywords.*

| Sev | Finding | Location | Recommendation |
|---|---|---|---|
| P2 | Bundle id `com.breweryartwalk.app` embeds the protected mark — the one de-brand step the legal guide forbids (deliberate revert, documented) | `capacitor.config.json:2`; `project.pbxproj:359,378` | Owner decision: change before first upload, or keep + document the legacy/non-public rationale |
| P3 | Copyrighted-photo scraper `download-artist-images.mjs` + `images:download` script still tracked (not in build path) | `download-artist-images.mjs`; `package.json:14` | Archive the scraper/compress scripts; remove the npm entries |
| P3 | Stale `08-route.png` screenshot of the removed route feature lingers in `store/screenshots/ux/` | `store/screenshots/ux/08-route.png` | Delete the superseded `ux/` subdir |
| info | Facts-only strip verified at the bundle level (0 bios/photos/profile-URLs ×108) | `index.html` `__ARTISTS_B64__` | No action — core requirement satisfied |
| info | Copyrighted artifacts quarantined in gitignored `_archive/`, untracked | `_archive/`; `.gitignore:60,64` | No action; optionally purge `_archive/` once confident |
| info | App icon is an original beer-mug + arrow silhouette (generic allusion, not the org's mark) | `icons/app-icon.svg` | No action — defensible |
| info | About disclaimer verbatim + one factual district line; store metadata/review notes honest with a proactive 5.2 statement | `index.html:1026,1035`; `store/review-notes.md` | No action |

### 7. Data integrity
*Very good. Counts exact (108 artists / 52 buildings / 79 POSITIONS), schema perfectly uniform (12 keys ×108, no anomalies/dupes), and ZERO artists resolve to no footprint (all 31 distinct addresses map via exact/alias/sub-unit/range). HANDOFF data bugs fixed; content-rights fields null on all 108.*

| Sev | Finding | Location | Recommendation |
|---|---|---|---|
| P2 | Sub-unit resolution concentrates 8 artists onto first-letter (`#A`) shapes; other lettered squares open an empty sheet and the unit letter is ignored | `resolvePosKey` `index.html:1349-1370` (branch `1356`) | Prefer the shape whose letter matches the artist's `unit`, or collapse sub-unit shapes into one tappable footprint |
| P3 | `positions.json` is structurally stale (phantom `1960 N. Main`, pre-split addresses); `positions-captured.json` is the in-sync copy | `positions.json` (36 keys) vs inline (79) | Archive `positions.json`/`positions.js`; note the authoritative source in `CLAUDE.md` |
| P3 | `1960 N. Main Street` is in `buildings.json` but has no footprint and no artists (orphan record) | `buildings.json`; absent from POSITIONS | Add a footprint, drop the record, or alias it |
| P3 | `www/` is missing the `artists.json`/`buildings.json` mirrors the docs imply (non-fatal: inlined as base64) | `www/`; `CLAUDE.md` | Run `prepare.js` or update the doc to say www ships inline-only |
| info | Printed-map landmark `2024 N. Main` absent everywhere, but nothing references it | POSITIONS; `buildings.json` | Add facts-only if it has studios, else document as omitted |

### 8. iOS / Capacitor native configuration
*Mostly clean and internally consistent: both capacitor configs agree (appName "ArtWalk LA"), the AppIcon is a correct 1024×1024 RGB PNG with no alpha, the splash is alpha-free, the privacy manifest is well-formed and added to the build (Resources phase), and the location usage string is honest and minimal.*

| Sev | Finding | Location | Recommendation |
|---|---|---|---|
| P2 | Bundle id retains "breweryartwalk" (see dimension 6) | `project.pbxproj:359,378`; capacitor configs | Owner decision; reconcile with docs |
| P3 | `@capacitor/geolocation` & `@capacitor/preferences` declared but NOT installed/pod-integrated → native paths dead, silent web fallback (no crash) | `package.json:20,23` vs `node_modules`/`Podfile.lock` | Remove the unused deps, OR `npm i` + `npx cap sync ios` if native behavior is wanted |
| P2 | `UIRequiredDeviceCapabilities` lists stale 32-bit `armv7` (contradicts iOS 13 min / 64-bit-only store) | `Info.plist:31-34` | Change to `arm64` or remove the key |
| P2 | `ITSAppUsesNonExemptEncryption` absent → every upload prompts export compliance | `Info.plist` (key absent) | Add the key set to `<false/>` |
| P3 | Duplicated source-of-truth files (capacitor config ×2, privacy manifest ×2) in sync now but can drift | root vs `ios/App/App/` | Treat root capacitor config as canonical; archive the stray root privacy manifest |
| info | Cosmetic: a few `Info.plist` keys use space indentation amid tabs (hand-edit marker) | `Info.plist:7-10` | No action |

### 9. App Store submission readiness
*Text deliverables are genuinely strong (honest, within limits, proactive 5.2/4.2/5.1.1 note). The screenshot deliverables and the bundle-id/encryption gaps are the blockers.*

| Sev | Finding | Location | Recommendation |
|---|---|---|---|
| P0 | The screenshots the checklist tells the human to upload show the OLD name + OLD UI | `store/screenshots/01-04*.png`; `SUBMISSION_CHECKLIST.md:23` | Repoint at `ux2/`; archive stale sets |
| P1 | Shipped bundle id contradicts every doc (`breweryartwalk` vs `lincolnheights.studiomap`) | `project.pbxproj`; configs vs docs | Make code + all docs agree on one id |
| P1 | Export-compliance answer undocumented; no `ITSAppUsesNonExemptEncryption` | `Info.plist`; docs | Add `<false/>` + a checklist line |
| P1 | iPad (13") screenshots predate the action-bar upgrade (and are required — universal binary) | `store/screenshots/ipad/` | Re-capture, or drop iPad via `TARGETED_DEVICE_FAMILY=1` |
| P2 | Stale `ux/` set references the removed route feature; `08-route.png` is a byte dupe of `07-nearme.png` | `store/screenshots/ux/` | Archive the whole `ux/` folder |
| P2 | "Near me" screenshot surfaces the raw "localhost would like to use your location" dev prompt | `store/screenshots/ux2/05-nearme.png` | Capture the post-permission "you are here" state instead |
| P3 | `APP_STORE_PREP.md` keyword string is 106 chars (over 100); `metadata.md` (97) is correct | `APP_STORE_PREP.md:97` vs `store/metadata.md:42` | Update the prep doc or mark `metadata.md` canonical |
| info | `metadata.md` labels promo text "156"; actual is 158 (both <170) | `store/metadata.md:9,13` | Cosmetic count fix |
| info | Privacy/Support URLs use mixed GitHub username casing | `metadata.md:51-52` vs `docs/*` | Pick one casing; enable Pages so URLs resolve |
| info | Description says map "shows where you are in real time" vs approximate projection | `metadata.md:27` | Optional softening ("roughly where you are") |

### 10. Repo & build-pipeline hygiene
*Core pipeline is solid: `prepare.js` is hash-stable across 3 runs, escaping-safe (base64 can't contain the terminating quote), and rm -rf's `www/` before regenerating. No secrets in git history; `.env.testflight` was never tracked. The problems are legally-hazardous legacy clutter, not breakage.*

| Sev | Finding | Location | Recommendation |
|---|---|---|---|
| P2 | `images:download` re-downloads copyrighted photos + rewrites `artists.json` (no-op today, fully armed) | `package.json:14-15`; `download-artist-images.mjs` | Remove scripts; archive scraper; strip vestigial schema keys; drop `tesseract.js` |
| P2 | `.env.testflight` holds a live ASC API Key ID + Issuer ID in plaintext (gitignored, never committed; referenced `scripts/testflight.sh` is absent) | `.env.testflight:3-5` | Move creds out of the repo folder; delete the stale file if the flow was abandoned |
| P2 | `.gitignore` covers `*.pem`/`*.p12` but not `*.p8` (the ASC key format) | `.gitignore:55-57` | Add `*.p8` as a guardrail |
| P3 | Eight legacy `.mjs` map-pipeline scripts tracked but dead — all consume forbidden/absent official-map inputs; two even rewrite `index.html`'s POSITIONS | `ocr.mjs`, `parse-template.mjs`, `match-*.mjs`, `convert-captured.mjs`, `update-html.mjs` | Archive to `_archive/`; keep `prepare.js` + `generate-placeholder-icons.mjs` as the only live scripts |
| P3 | `positions.json`/`positions.js`/`positions-captured.json` tracked but orphaned (POSITIONS is inline) | root | Archive or delete |
| P3 | Stale duplicate `app-icon-1024.svg` (old design) tracked, referenced by nothing | root vs `icons/app-icon.svg` | Delete or move to `_logo/` |
| info | Original scaffolding prompts (`build_prompt.md`, `design_prompt.md`) still tracked | root | Optional declutter |

### 11. Performance & resource use
*Healthy for this scale. ~190KB/~46KB-gzipped single HTML parsed once; the rendered map is ~245 simple flat-fill SVG nodes; 108 artists exist only as JS objects until a sheet opens. rAF handles are cancelled, listeners bound once, the O(n²) declutter is ~5µs and writes no-ops during a pan, no filters/blur on animated map elements.*

| Sev | Finding | Location | Recommendation |
|---|---|---|---|
| P3 | `updateZoomLevel` queries `text.bld-name` every frame, but that element is never created (per-frame waste) | `index.html:1874` | Delete the line (handled by `ux-collapsed`) |
| P3 | `applyFilters` maintains studio-count badges that are never rendered (dead DOM branch) | `index.html:1631-1637` | Remove the badge block + CSS |
| P3 | Base64 source strings (~65KB → ~130KB UTF-16) stay on `window` after decode | `index.html:1071-1072`, decoded `1392-1415` | Null them after a successful decode to free ~130KB |
| info | Declutter + label query run every frame, not only on zoom-level change (currently harmless) | `index.html:1872-1876` | Optional: cache `lastZoomLevel` and skip when unchanged |
| info | `applyFilters` does a per-building attribute-selector lookup (79×) each pass | `index.html:1623-1638` | Optional: build an `addr→<g>` Map once in `renderMap` |
| info | `@font-face` lists the same woff2 twice (defensive fallback, no double download) | `index.html:30-31` | Leave or collapse to one `format("woff2")` |
| info | `window` resize re-runs `setView` undebounced (rare on iOS) | `index.html:2035` | No change for iOS; rAF-coalesce only if targeting desktop |

## Strengths

- **Copyright strip is verified clean at the bundle level** — decoding the inlined base64 in `index.html` (the real ship artifact) shows 0 bios, 0 photos, 0 profile URLs across all 108 artists; only facts ship.
- **Robustly offline** — zero external/CDN/network dependencies, self-hosted variable font, base64-inline data, and a hand-built SVG map (no tile server, no map images). On iOS the offline guarantee doesn't even depend on the service worker.
- **Data integrity is excellent** — exact counts (108/52/79), perfectly uniform schema, and **zero orphaned artists**: every one of the 31 distinct addresses resolves to a tappable shape.
- **Privacy is exemplary** — geolocation returns only `{lat,lng,acc}`, used solely for on-map positioning/distance; never in a URL, never persisted, never transmitted. No telemetry, no third-party SDKs, no committed secrets. Privacy manifests + usage strings are honest and consistent.
- **XSS-safe by construction** — all DOM text is escaped via `esc()`, and the fuzzy-search highlighter escapes per-character before inserting `<mark>`, defeating the class of bug naive highlighters get wrong.
- **Build pipeline is disciplined** — `prepare.js` is provably idempotent (hash-stable ×3), escaping-safe, and wipes `www/` before regenerating so archived assets can't linger. Icons are alpha-free RGB at every size, in sync with the iOS master.
- **Gesture/momentum + performance engineering** — every motion routes through a clamped `setView()`, rAF handles are cancelled, listeners bind once, and the per-frame label-declutter writes no-ops during a pan.
- **Honest, reviewer-ready store text** — metadata is within Apple's limits, deliberately excludes the protected mark from keywords, and `review-notes.md` leads with a strong proactive Guideline 5.2 statement.

## Recommended next actions

### P0 — before any submission attempt
- [ ] **(Claude)** Repoint `SUBMISSION_CHECKLIST.md` + `store/metadata.md` to `store/screenshots/ux2/`; archive the stale top-level `01-04*.png` and the `store/screenshots/ux/` set (incl. the dead `08-route.png`).

### P1 — submission blockers / honest-positioning
- [ ] **(Human decision, then Claude/Xcode)** Resolve the bundle-id contradiction: verify whether a build has shipped to the existing App Store record, then either change `com.breweryartwalk.app`→neutral in both configs + pbxproj **before first upload**, or keep it and fix `SUBMISSION_CHECKLIST.md`/`APP_STORE_PREP.md`/`CHANGELOG_REBRAND.md` to match + document the rationale. **(bundle-id/signing edits in Xcode are HUMAN-ONLY.)**
- [ ] **(Claude)** Add `<key>ITSAppUsesNonExemptEncryption</key><false/>` to `Info.plist` + a checklist line for export compliance.
- [ ] **(Human/simulator)** Re-capture the 13" iPad screenshot set from the current build, OR **(Claude)** set `TARGETED_DEVICE_FAMILY=1` to drop iPad support and remove the requirement.
- [ ] **(Claude)** Make the map accessible: `role="button"` + `tabindex` + `aria-label` + Enter/Space `keydown` on each building `<g>`, demote the parent `<svg>` off `role="img"`, and add a non-spatial "Browse all studios" list.
- [ ] **(Claude)** Restore Dynamic Type: drop `maximum-scale=1, user-scalable=no` and scale chrome text off a rem/Dynamic-Type base.
- [ ] **(Claude)** Add focus management: capture/restore focus on sheet/modal open-close; add a Tab-trap + Escape to the About modal.

### P2 — quality / risk reduction (Claude-fixable)
- [ ] Fix the "Near me" filter bug (`uxNearMe`) and delete the dead `2137` definition.
- [ ] Disarm the legal footgun: remove `images:download`/`images:compress`, archive the scraper + `compress-artist-images.mjs`, drop `tesseract.js`, strip vestigial `images`/`bio`/`profile_url`/`category_original` keys.
- [ ] Add a `safeUrl()` http/https allowlist for data-driven `<a href>`.
- [ ] Darken default-theme contrast offenders (`.bld-street`, `.street-label`, `.about-fine`); enlarge sub-44px tap targets; add a document-level Escape for both overlays.
- [ ] Fix the sub-unit resolver to honor the artist's `unit` letter (corrects 8 placements + removes empty-sheet squares).
- [ ] Change `UIRequiredDeviceCapabilities` `armv7`→`arm64`; decide on the unused `@capacitor/geolocation`/`preferences` deps (remove or install + sync).
- [ ] Unify the label font-size table across `renderMap`/declutter/CSS.
- [ ] Add `*.p8` to `.gitignore`; move ASC creds out of the repo folder / delete stale `.env.testflight`.
- [ ] (Before any web deploy) Bump the SW `CACHE` version and make the navigation doc network-first; precache font/manifest/icons.

### P3 / housekeeping (Claude-fixable)
- [ ] Archive the eight dead map-pipeline `.mjs` scripts and orphan `positions*.json`/`positions.js`; delete stale `app-icon-1024.svg`.
- [ ] Remove dead code: per-frame `text.bld-name` query, badge branch in `applyFilters`, visual-block `nearMe`/`recenter`/`focusSearch` stubs; null base64 strings after decode.
- [ ] Update `HANDOFF.md` (stale bug notes) and reconcile the `APP_STORE_PREP.md` 106-char keyword string with the canonical `metadata.md`.

### Human-only gates (Claude Code cannot do these)
- [ ] **(ACCOUNT)** Apple Developer Program enrollment; Apple ID + 2FA in Xcode; confirm team validity.
- [ ] **(GUI)** Xcode Signing & Capabilities (Team, bundle id, automatic provisioning); confirm `PrivacyInfo.xcprivacy` Target Membership; set Version/Build.
- [ ] **(GUI/CLI)** Archive + Distribute → App Store Connect upload (after signing).
- [ ] **(WEB)** Enable GitHub Pages so privacy/support URLs resolve; create the ASC app entry; paste metadata; upload screenshots; complete the App Privacy questionnaire; add App Review notes; TestFlight walkthrough; **Submit for Review.**
- [ ] **(LEGAL)** Accept or mitigate the elevated Guideline 5.2 / trademark exposure from the "ArtWalk LA" name (distinctive "Art Walk" phrase; proximity to "Downtown LA Art Walk"); the not-affiliated disclaimer mitigates but does not eliminate it.
