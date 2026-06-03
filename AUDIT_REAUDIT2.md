# ArtWalk LA — Re-Audit #2 (post-remediation, rounds 1-3)

*Produced by 11 auditors with adversarial verification of every P0/P1 finding · 2026-06-02 · re-run after three remediation rounds.*

## Executive summary

**Overall health: strong and shippable from a code standpoint.** The just-applied remediation landed almost everywhere it claimed to, and adversarial verification could not knock down the core engineering work. The app parses clean, all 108 artists resolve to a real map footprint (zero dangling references), the offline service worker is now content-hash-versioned and network-first, geolocation/favorites/search/XSS-safety are exemplary, and the de-brand is genuine (facts-only data, original SVG map, neutral name/bundle/icon, verbatim not-affiliated disclaimer). The dominant remaining risks are **not** code defects — they are human-gated (git history, Apple submission, an owner-accepted naming risk) plus one build-hygiene step that must be run before archiving.

### RESOLVED by the remediation (verified)

- **All three HANDOFF "known bugs" are closed in scope.** OVERLAY/Map.jpg calibration scaffolding fully removed; `"1910 N. Main"` is now correctly in the NW corner (`index.html:1284`, x=139/y=64); 8 of 9 named-missing buildings (606,608,614,616,674,678,688,694) are present in POSITIONS. (`2024 N. Main` remains absent but no artist references it — see Open.)
- **642 Moulton placement fixed** — the 13 artists that were plotting in the wrong north row now resolve to the correct south footprint.
- **Sub-unit resolver honors the unit letter** in `resolvePosKey` + the tap/zoom path (the near-me *distance* path is the one spot that still drops it — see Open P3).
- **Service worker rewritten network-first with a real content hash** — `www/sw.js` carries `CACHE='artwalk-shell-e600df34'` (verified == sha256(www/index.html).slice(0,8)); resolves the prior P1 stale-shell defect.
- **Dead code removed** — duplicate `window.UX.nearMe` block, badge branch, and `.is-active` CSS are gone; base64 source is freed after decode; startup guard requires only artists.
- **Security/privacy hardening landed** — CSP meta added (verified not to break WKWebView), `safeUrl()` http(s) allowlist on every data-derived href, `config.xml` nav wildcard removed, `#search` aria-label added.
- **Accessibility scaffolding landed** — building `<g>` role=button/tabindex/aria-label/keydown, About focus-trap + Escape, reduced-motion handling, 44px tap targets, `user-scalable=no` dropped, dark-theme `.bld-street` contrast fixed.
- **Submission docs/screenshots largely reconciled** — Info.plist `ITSAppUsesNonExemptEncryption=false` + arm64-only; image-scraper scripts + tesseract dep removed; ~12 dead scripts archived; `artists.json` stripped to facts-only; in-app Privacy/Support links repointed to `.html`; screenshots re-captured at correct native resolutions for both required device classes.

### REMAINS open

| Sev | Item | Owner |
|-----|------|-------|
| **P0/P1** | Copyrighted blobs (197 scraped photos + official-map JPGs/templates) live in **public git history** and are being served right now | **HUMAN-GATED** (force-push / make-private) |
| **P1** | Bottom sheet + About overlay lack focus containment (no `inert`, sheet has no Tab-trap) — keyboard/VoiceOver can reach the 52 background building buttons | **Claude-fixable** |
| **P1** | Search re-opens the sheet and steals focus to the close button on every keystroke → iOS keyboard dismisses, breaking search after the first character | **Claude-fixable** |
| **P1** | Display name "ArtWalk LA" re-opens Guideline 5.2 / trademark risk (owner explicitly warned, chose to proceed) | **HUMAN-GATED** (owner) |
| **P1** | Privacy/Support URLs 404 until GitHub Pages is enabled (also dead in-app About links) | **HUMAN-GATED** (web) |
| **P2** | Stale gitignored iOS bundle mirror `ios/App/App/public/` — missing the new CSP meta, still ships old `studiomap-shell-v1` SW; one `npx cap sync ios` fixes it before archive | **Claude/human (build step)** |
| **P2** | Bundle id still `com.breweryartwalk.app` (contains event brand) | **HUMAN-GATED** (owner + new ASC record) |
| **P2/P3** | Projection aspect mismatch distorts the GPS dot ~10% E-W; cosmetic data/doc nits; minor a11y (Dynamic Type, dimmed-button tabbing, ux-count contrast); dead stubs | **Claude-fixable** |

### Regressions introduced by the remediation

**None functional.** The remediation introduced no behavioral regression in committed source. The only remediation-adjacent gap is a *non-source* build artifact: the gitignored `ios/App/App/public/` mirror was not re-synced after the round-3 `www/` edits, so an Xcode archive cut *before* `npx cap sync ios` would ship without the new CSP meta and with the old SW name. This is a forgotten-`cap sync` hygiene gap (one command fixes it), not a defect in any tracked file. One stale inline comment was also noted: `index.html:~1262-1264` claims the SW is "skipped under capacitor://", but `iosScheme:https` means it actually registers on iOS (inert) — a doc bug, not a functional one.

**Bottom line:** zero Claude-fixable P0 remains in the working tree. Two real P1 accessibility defects (sheet/About focus containment; search focus-steal) survived the remediation and are the highest-value Claude-fixable work left. Everything else blocking submission is human-gated: the public-history scrub, the owner's name/bundle-id decisions, enabling GitHub Pages, and standard App Store Connect/signing/build-number steps.

## Critical & high findings (verified)

### P0 — Copyrighted blobs in PUBLIC git history (HUMAN-GATED)
**Location:** git history of `github.com/Mattkillsyou/ArtWalk` — `img/artists/*` (197 files), `Map.jpg`, `bw map.jpg`, `map_greyscale.jpg`, `image00001.jpeg`, `template.svg`, `template-shapes.json`, `ocr.json`; documented in `SCRUB_GIT_HISTORY.md`.
**Reality (verified, two independent auditors):** The working tree and shipped bundle are clean (`img/artists/` empty, no map JPGs at HEAD), but `git rev-list --all --objects` still contains 197 scraped photos (≈30.4 MiB pack) plus the org's official-map rasters and OCR/template artifacts, all reachable from HEAD (adding commit `4cb5ce2` is an ancestor of HEAD). The repo is public and **actively serving** them: `raw.githubusercontent.com/Mattkillsyou/ArtWalk/4cb5ce2/img/artists/01-art-walkin-napkin-scaled-s7bcr.jpg` returns HTTP 200 with a byte-identical 456,578-byte payload. A `git rm` does not rewrite history. This directly contradicts the app's facts-only/zero-license premise.
**Recommendation:** HUMAN-GATED, not Claude-fixable (force-push and visibility changes are destructive/access-control ops barred under the unattended safety rules). Per `SCRUB_GIT_HISTORY.md`: (A) `git filter-repo` to purge `img/artists/`, the map JPGs, `template*`, `ocr.json`, `wetransfer_*` then force-push, or (B) make the repo private / delete-and-recreate. Single highest-impact remaining item.

### P1 — Sheet & About overlays have no focus containment (CONFIRMED)
**Location:** `index.html:1701-1719` (openSheet/closeSheet, no Tab-trap), `1145-1167` (About trap), `1568-1574` (building `<g>` static `role=button`/`tabindex=0`).
**Reality (verified):** No `inert` attribute exists anywhere (`grep "inert"` returns only "inertia"/momentum-gesture code). The bottom sheet moves focus in/restores on close but has **zero** Tab containment, so keyboard Tab walks straight out into the 52 always-tabbable background building buttons. The About dialog traps Tab but, with no `inert`/`aria-hidden` on the background chrome, remains escapable via the VoiceOver rotor/swipe (the sheet is `role=region`, not a dialog; About is `aria-modal=true`, which alone does not remove siblings from the AT tree). Real modal-containment failure for keyboard and VoiceOver users; not P0 because Escape closes overlays and focus is moved in/restored.
**Recommendation:** Set `inert` (with an `aria-hidden` fallback for older WebKit) on the background app chrome while either overlay is open, and add a Tab-trap to the sheet mirroring the About one.

### P1 — Search steals focus on every keystroke, killing the iOS keyboard (CONFIRMED)
**Location:** `index.html:2064-2071` (search input handler) → `applyFilters` `1673-1676` → `showSearchResults` → `openSheet` `1701-1710`, focusing `#sheet-close` at `1708-1709`.
**Reality (verified):** Each keystroke calls `showSearchResults`, which ends in `openSheet`, which unconditionally focuses `#sheet-close`. The `1702` *capture* is guarded but the *focus* is not, so focus leaves `#search`. iOS WKWebView drops the soft keyboard when focus leaves the input — so typing more than one character breaks search. This is a real, user-facing functional defect.
**Recommendation:** Focus the sheet only on a fresh open (sheet was closed) and only when focus is not already inside `#search`. Guard the focus call to the not-already-open case.

### P1 — Display name "ArtWalk LA" re-opens Guideline 5.2 / trademark risk (CONFIRMED, HUMAN-GATED)
**Location:** `store/metadata.md:7` (Name = "ArtWalk LA"); `ios/App/App/Info.plist:7-8` (CFBundleDisplayName); `SUBMISSION_CHECKLIST.md:78-88`; `CHANGELOG_REBRAND.md:291-311`.
**Reality (verified verbatim):** The entire de-brand strategy exists to remove trademark exposure, yet the shipped name uses "Art Walk" — the distinctive element of the protected event mark — *as the brand*, not as a factual reference. `CHANGELOG_REBRAND.md` records the owner was explicitly warned this "reverses the core de-brand" and is "confusingly similar to the separately trademarked Downtown LA Art Walk," and chose to proceed. Name/trademark-axis only — the content-rights remediation (facts-only, no photos/bios/official map) is unaffected, and the not-affiliated disclaimer + neutral bundle id + neutral icon are real mitigations.
**Recommendation:** HUMAN-GATED owner decision. A neutral name (e.g. "Lincoln Heights Studio Map") drops 5.2 risk to low. If proceeding with "ArtWalk LA," keep the About-panel disclaimer + review-notes nominative framing (both present) and be prepared for a possible 5.2 rejection/appeal.

### P1 — Privacy & Support URLs 404 until GitHub Pages is enabled (CONFIRMED, HUMAN-GATED)
**Location:** `store/metadata.md:51-52`; `index.html:1035-1036` (live About links); `docs/privacy.md`, `docs/support.md` (`SUBMISSION_CHECKLIST.md:42-45`).
**Reality (verified):** Both `https://mattkillsyou.github.io/ArtWalk/{privacy,support}.html` are required by App Store Connect AND linked live from the in-app About dialog. `docs/` holds the Jekyll-ready pages with correct permalinks, but GitHub Pages must be enabled (Settings → Pages → branch `main`, folder `/docs`) for them to resolve. A 404 privacy URL is a classic 5.1.1 metadata rejection, and the in-app links would be dead.
**Recommendation:** HUMAN-GATED (web). Enable Pages and confirm both URLs return 200 before submitting. (Nuance: `docs/_config.yml` has no `baseurl:/ArtWalk`; direct hits on the two `.html` permalinks under the project subpath still 200 with the minimal theme, but verify.)

### P1 → P2 — Stale iOS bundle mirror (`ios/App/App/public/`) (PARTIAL — downgraded)
**Location:** `ios/App/App/public/index.html` and `ios/App/App/public/sw.js` vs `www/`.
**Reality (verified on disk):** `www/index.html` (Jun 3, 173,979 B, CSP meta present) differs from the gitignored mirror (Jun 2, 177,032 B, **no** CSP meta). `www/sw.js` = `artwalk-shell-e600df34` (network-first); the mirror still = `studiomap-shell-v1` (old cache-first). `git status` is clean because the dir is gitignored, so the drift is invisible to git. `cap sync` (not yet re-run since the round-3 `www` edits) is what copies `www`→`public`. **Adversarial downgrade P1→P2:** the stale SW half is cosmetic in the Capacitor context (the whole on-device bundle is replaced on install/update and serves the document with no remote assets, so cache-first vs network-first has no in-app effect — even though the SW *does* register because `iosScheme:https`). The only materially live half is the **missing CSP meta**, which is a not-yet-built-from-current-source state, not a defect in any committed file. One `cap sync` fully resolves it; no evidence an archive has been cut.
**Recommendation:** Run `npm run ios:sync` (or `npx cap sync ios`) before any archive; confirm the mirror's `sw.js` then reads `artwalk-shell-e600df34` and `index.html` contains the CSP meta. Treat as a mandatory pre-archive step (easy to forget — the dir is gitignored and looks clean). Also fix the inline comment at `index.html:~1262-1264` (it wrongly says the SW is skipped on `capacitor://`).

### P1 → P2 — Bundle identifier still contains the event brand (HUMAN-GATED)
**Location:** `project.pbxproj:359,378` (`PRODUCT_BUNDLE_IDENTIFIER = com.breweryartwalk.app`); both `capacitor.config.json`; `Info.plist:13-14`.
**Reality (verified):** The only case-insensitive "brewery" hit in the shipped web bundle is this identifier. App id `6766774479` already exists against the current bundle id, so changing it means a new ASC record.
**Recommendation:** HUMAN-GATED owner decision. If unacceptable for an unbranded app, register a neutral id (e.g. `com.<owner>.artwalkla`), update both build configs + both capacitor configs, and create the matching ASC record.

### Dismissed / re-scoped under adversarial verification

- **`build-number-first-upload` (claimed P1 → downgraded to info):** `CURRENT_PROJECT_VERSION=1` is the correct default for a first upload and the most likely scenario; the issue only materializes if a build was already uploaded to app id `6766774479` (unverifiable from the repo) and is already documented at `SUBMISSION_CHECKLIST.md:54-55`. Informational/process, not a repo defect.

## Findings by dimension

### 1. Core app correctness & bugs
**Summary:** Core logic is solid; the three HANDOFF bugs are resolved. JS parses clean, all 108 artists resolve, filter/count math is exact (sum=108, no stray buckets), one listener per action-bar button, SW correctly network-first with a real hash. The one substantive residue is a projection aspect mismatch from the never-finished OVERLAY calibration.

| Sev | Finding | Location | Recommendation |
|-----|---------|----------|----------------|
| P2 | GPS projection anisotropically distorted: SVG aspect 1.116 vs GPS box 1.010 → "you are here" dot off up to ~10% E-W (15-30 m at edges) | `index.html:1179-1188`, inverse `2192-2199` | Re-derive GEO corners to match SVG aspect, or project to meters with a single uniform scale + letterbox; near-me ranking largely unaffected |
| P3 | `2024 N. Main` still absent from buildings.json + POSITIONS (no artist references it) | buildings.json / POSITIONS `1283-1361` | Add footprint for printed-map parity, or document as intentional omission |
| P3 | Near-me distance uses wrong sub-unit footprint for 3 artists (unit dropped: 692/618/690 Moulton → #A) | `index.html:2248`→`2183-2189` | Thread `unit` through `uxCentroidLatLng`→`uxCentroidSvg`→`resolvePosKey` |
| P3 | No 0-width `getBoundingClientRect` guard in setView/resetView/zoomTo | `index.html:1896-1935` | Add `if(!rect.width||!rect.height)return;` or defer init resetView to rAF |
| info | `window.UX.recenter`/`focusSearch` assigned twice (earlier dead) | `2154`/`2431`, `2158`/`2817` | Delete the early stubs |
| info | Dead CSS: `.badge-*`, `.bio` (~25 lines) | `251-262`, `743-756`, `349-356` | Optional cleanup |
| info | Action-bar `locate` button doesn't reflect active GPS state | `2169` | Optionally mirror `.active` onto `#ux-act-locate` |

### 2. UX-upgrade features (near-me, gestures, sheet, chips, themes, action bar)
**Summary:** Four UX blocks are well-engineered; the `window.UX` contract holds (hook collisions resolve by load order, buttons wired after authoritative impls), `nearMe` has one real definition, the removed "Take me there" route left zero dangling refs, fuzzy `<mark>` is XSS-safe, inverse projection is exact, www mirror ships the code. No P0/P1.

| Sev | Finding | Location | Recommendation |
|-----|---------|----------|----------------|
| P3 | Near-me distance badge ignores unit → can measure a sibling footprint (badge ≠ navigation target) | `index.html:2248` vs `2272`; resolver `1375-1398` | Pass `unit` through (one-line) |
| P3 | Visual block's `recenter`/`focusSearch` stubs are dead | `2154`/`2158`, superseded `2431`/`2817` | Delete the two stub assignments |
| P3 | `window.UX.distanceLabel` exposed but never called | `2282-2292` | Wire it (live distance in detail) or drop it |
| P3 | Reduced-motion read live for gestures but snapshotted at load for the sheet | `2308-2312` (live) vs `2580` (snapshot) | Have the sheet use `UXreduceMotion()` or add an `mq` change listener |
| info | Two `prefers-reduced-motion` rules target `#sheet`; later overrides earlier | `855-861` & `980-982` | Consolidate into one block |
| info | Sheet can receive two Escape close calls (idempotent) | `1169-1173` & `2801-2806` | Optional `stopPropagation()` |
| info | Inverse projection hardcodes `1019/913` instead of `NATURAL.w/.h` | `2196-2197`, `1184-1188`, `1401` | Reference `NATURAL` for single source of truth |

### 3. Offline-first / PWA / service worker
**Summary:** Genuinely offline-capable, zero third-party/CDN in the live path, the prior stale-shell P1 is fixed via content-hash cache versioning. Remaining issues are not offline-breaking; iOS offline does not depend on the SW (Capacitor ships the bundle on-device).

| Sev | Finding | Location | Recommendation |
|-----|---------|----------|----------------|
| P3 | SW registration comment wrong: SW actually registers (inert) on iOS because `iosScheme:https` | `index.html:1261-1268` + `capacitor.config.json:5-6` | Tighten guard with `!window.Capacitor?.isNativePlatform?.()` and fix comment |
| P3 | Stale iOS `public/` mirror ships OLD SW (`studiomap-shell-v1`) + OLD index.html until next sync | `ios/App/App/public/sw.js`, `…/index.html` | `node prepare.js && npx cap sync ios` before any build |
| P3 | `favicon.svg` referenced by head + manifest but omitted from SW precache | `sw.js:12-20` vs `index.html:18` | Add `./icons/favicon.svg` to SHELL |
| P3 | Manifest icons declare combined `"any maskable"` on one asset (lint; crop risk) | `manifest.webmanifest:17,24` | Split into separate `any` + `maskable` entries or verify safe-zone |
| info | `loadJSON` fetch fallback targets files not in www/ (dead path, never fires) | `index.html:1435-1459` | Optional comment noting it's dev-only |
| info | Unreferenced icons (`favicon-32/180.png`, `app-icon.svg`) copied into bundle | `www/icons/*` | Optional prune |

### 4. Security & Privacy
**Summary:** Privacy-exemplary and XSS-safe by construction. Every data value reaches the DOM via `esc()`/DOM API; fuzzy highlighter escapes per-character; all hrefs pass `safeUrl()` + `rel=noopener`; geolocation returns only `{lat,lng,acc}`, never persisted/transmitted; locked-down CSP forbids egress; no telemetry/eval/secrets. Manifests + usage string honest and consistent.

| Sev | Finding | Location | Recommendation |
|-----|---------|----------|----------------|
| P3 | CSP allows `script-src 'unsafe-inline'` (architectural — single inline IIFE) | `index.html:5` | Accept for now (connect-src/object-src/form-action lockdown mitigates); later externalize app.js to drop it |
| info | ASC API Key ID + Issuer ID in local plaintext `.env.testflight` (gitignored, never committed) | `.env.testflight`, `.gitignore:54,57-58` | No leak; optionally delete from working tree when not running scripts |
| info | In-app Privacy/Support links point to owner GitHub Pages (correct host; must be live) | `index.html:1035-1036` | Pre-submit: confirm 200 + privacy text matches on-device claims |

### 5. Accessibility
**Summary:** Strong scaffolding landed (keyboard/AT-operable buildings, About focus-trap+restore, reduced-motion, 44px targets, restored pinch-zoom, good dark/sunlight contrast, real ARIA slider handle). Two P1 modal-containment/focus defects remain (see Critical section).

| Sev | Finding | Location | Recommendation |
|-----|---------|----------|----------------|
| **P1** | Search re-opens sheet + steals focus → kills iOS keyboard | `2064-2071`, `1701-1710` | Focus only on fresh open & not when focus is in `#search` |
| **P1** | Sheet has no focus trap; no overlay inerts background (Tab/VoiceOver reach 52 building buttons) | `1701-1719`, `1145-1167`, `1568-1574` | `inert` background chrome + sheet Tab-trap |
| P2 | Fixed-px type (no Dynamic Type); dimmed buildings stay tabbable; no skip link | `583-589`, `1568-1574`, `1670` | `rem` scale; `tabindex=-1` on `.dim` (or roving); add skip link |
| P3 | `ux-count` 3.45:1 fails AA; chatty `#status`; focus-visible-only ring; dead CSS | `903`, `1672`, `214-215`, `1539-1628` | Darken ux-count; throttle status; add plain `:focus` ring; prune dead CSS |

### 6. Content rights, de-branding & App Store 5.2
**Summary:** Strong. Facts-only data (8 keys: address/category/instagram/medium/name/other_links/unit/website), original SVG map (no `<image>`/`xlink:href`/`data:image`), empty photo folder, clean de-brand, verbatim disclaimer in About + README + docs. The one material gap is the human-gated public-history blobs.

| Sev | Finding | Location | Recommendation |
|-----|---------|----------|----------------|
| **P1** | ~197 scraped photos + official-map files in public git history | git history; `SCRUB_GIT_HISTORY.md` | HUMAN-GATED: filter-repo + force-push, or make private (see P0 above) |
| P3 | Prep doc lists wrong Name/Subtitle char counts (says 26/21; actual 10/22; promo 156 vs 158) | `APP_STORE_PREP.md:63-64` vs `metadata.md` | Fix counts; all under limits |
| info | "Brewery" word in non-rendered comment in `app-icon.svg` | `icons/app-icon.svg:3` | Optional removal |
| info | Unused `.bio` style + stale source comment | `index.html:~349`, `~1419` | Optional cleanup |

### 7. Data integrity (artists.json / buildings.json / POSITIONS)
**Summary:** Strong. All 108 artists resolve to a real footprint (96 exact, 8 unit-letter, 1 alias, 3 numbered-range; 0 unresolved). Uniform schema (8 keys/artist, 6/building), no empty/whitespace/duplicate rows, base64 inline byte-identical to source, www mirror in sync. POSITIONS geometry valid (all coords inside the 1019×913 viewBox).

| Sev | Finding | Location | Recommendation |
|-----|---------|----------|----------------|
| P3 | `buildings.json` inlined (~11KB) but never read by the app (map draws from POSITIONS) | `index.html:1443/1456`, comment `1447` | Stop inlining it in prepare.js, or wire its metadata into the detail sheet |
| P3 | `621 Avenue 21` has a footprint + artist but no buildings.json record (also 614/616/630-638) | `index.html:1349`; buildings.json | If buildings.json is ever wired up, add records |
| P3 | `694 South Avenue 21` key family geometrically incoherent (bare key far from `#children`) | `index.html:1335-1337,1350-1353` | Rename center-bottom cluster to true street numbers (latent; 0 artists today) |
| P3 | `resolvePosKey` cache key concatenates `addr+''+unit` (no separator; 0 collisions today) | `index.html:1377` | Use a delimiter that can't appear in data (e.g. `\0`) |
| info | 48 of 77 footprints have no artist (intended map context, not missing data) | POSITIONS | None |
| info | 2 artists `medium=null`; display path guards for it | artists.json; `index.html:1810/2259` | None (optional backfill) |

### 8. iOS / Capacitor native configuration
**Summary:** Upload-ready: consistent bundle identity (appId + appName match across both configs; Info.plist resolves correctly), valid 1024×1024 RGB no-alpha icon, `ITSAppUsesNonExemptEncryption=false`, PrivacyInfo wired into the Resources phase, no tracking SDKs, clean reproducible pod graph, unbranded launch screen, signing left to the human. Most material item is the operational stale mirror.

| Sev | Finding | Location | Recommendation |
|-----|---------|----------|----------------|
| P2 (was P1) | Stale iOS web mirror missing CSP meta + old SW name (build-hygiene; `cap sync` fixes) | `ios/App/App/public/*` vs `www/*` | `npm run ios:sync` before archive; verify CSP + `artwalk-shell-e600df34` |
| P2 | Bundle id `com.breweryartwalk.app` contains event brand (human-gated) | `pbxproj:359,378`; both capacitor configs | Owner decision + new ASC record |
| P3 | `CFBundleName` resolves to "App" (DisplayName is correct "ArtWalk LA") | `Info.plist:17-18` → `pbxproj:360,379` | Cosmetic; optionally set `PRODUCT_NAME` |
| P3 | `@capacitor/geolocation` + `/preferences` declared/called but pods not installed (web fallbacks guard) | `package.json` vs `Podfile.lock` | `npm i`+`cap sync` to use native, or drop the two deps |
| info | Deployment target 13.0 (valid, slightly below Cap 6 baseline) | `Podfile:3`, pbxproj | Optionally raise to 14/15 |
| info | `config.xml` empty Cordova shell; nav wildcard already removed | `ios/App/App/config.xml` | None |

### 9. App Store submission readiness
**Summary:** Genuinely good shape. Honest metadata within limits (Name 10/30, Subtitle 22/30, Promo 156/170), App Privacy questionnaire exactly matches both identical PrivacyInfo files, export compliance pre-answered, age 4+ consistent, screenshots CURRENT at correct native resolutions for both required classes (6.9″ iPhone 1320×2868, 13″ iPad 2064×2752), iPad a genuine target. Dominant real risk is the owner-accepted trademark name; remaining items are human-gated or stale-doc nits.

| Sev | Finding | Location | Recommendation |
|-----|---------|----------|----------------|
| **P1** | Display name "ArtWalk LA" re-opens 5.2/trademark risk (owner-accepted) | `metadata.md:7`; `Info.plist`; `CHANGELOG_REBRAND.md:291-311` | HUMAN-GATED owner decision (see Critical) |
| **P1** | Privacy/Support URLs 404 until GitHub Pages enabled (also dead in-app) | `metadata.md:51-52`; `index.html:1035-1036` | HUMAN-GATED (web): enable Pages, confirm 200 |
| info (was P1) | Build number 1 vs existing ASC record | `pbxproj:353,373` | Already documented at checklist `54-55`; bump only if a build exists on the record |
| P2 | `CHANGELOG_REBRAND.md` states wrong bundle id (`com.lincolnheights.studiomap`) | CHANGELOG_REBRAND.md | Doc-only: reconcile to `com.breweryartwalk.app` |
| P2 | `SUBMISSION_CHECKLIST.md` says add PrivacyInfo to target — already done | checklist `49-53` vs `pbxproj:17,33,86,167` | Doc-only: mark DONE |
| P2 | Checklist claims iPad shots predate the action bar — they already show it | checklist `29-31,69` vs `screenshots/ipad/` | Doc-only: set is uploadable as-is |
| P3 | Checklist warns against deleted screenshot sets that no longer exist | checklist `27-29` | Doc-only: drop stale warning |
| P3 | In-app About shows hardcoded `1.0.0` while build ships `1.0` | `index.html:1031` vs `pbxproj:357,377` | Set literal to `1.0` or wire to `App.getInfo().version` |
| info | GitHub username appears in two casings (`mattkillsyou` vs `Mattkillsyou`) | `metadata.md` / `docs/*` | Optional: pick one casing |
| info | Deployment target iOS 13.0 (fine; SDK meets current rule) | pbxproj; Podfile | None |

### 10. Repo & build-pipeline hygiene
**Summary:** Genuinely solid. `prepare.js` + `generate-placeholder-icons.mjs` fully idempotent (re-running changes zero bytes), `index.html` in sync with a fresh prepare run, icon pipeline emits RGB-no-alpha PNGs, shipped iOS AppIcon byte-identical to the generated master, www/ correctly gitignored + regenerated, base64 injection escaping-safe, scraper/OCR scripts + tesseract dep gone. Dominant issue is the public-history blobs (P0).

| Sev | Finding | Location | Recommendation |
|-----|---------|----------|----------------|
| **P0** | 197 scraped photos + official-map/template blobs in public git history (reachable from HEAD; serving over raw.githubusercontent.com) | git history; `SCRUB_GIT_HISTORY.md` | HUMAN-GATED: filter-repo + force-push, or make private (see Critical) |
| P3 | 4 stale old-app screenshot PNGs (2.6 MB) tracked despite `_archive/` gitignore | `_archive/stale-screenshots/*.png` | `git rm --cached` (keeps files on disk; blobs still need the same scrub pass) |
| info | `.claude/launch.json` committed with machine-specific absolute path to a gitignored file | `.claude/launch.json` | Optional: gitignore it or use a repo-relative invocation |
| info | No secrets/.env/keys/large binaries committed (confirmed clean) | repo-wide | None |

### 11. Performance & resource use (mid-range iPhone)
**Summary:** Broadly healthy. ~174KB single HTML + 44KB woff2 + ~52KB inlined JSON, loaded from disk under Capacitor → negligible parse/decode. SVG map ~244 live nodes, built once. Decoded JSON single copy, base64 nulled for GC. Only real inefficiencies are per-frame and low-impact. No P0/P1.

| Sev | Finding | Location | Recommendation |
|-----|---------|----------|----------------|
| P3 | Label declutter runs full greedy loop + fresh array alloc on every setView (every momentum/pan frame) even when zoom unchanged | `index.html:1915-1918`, `2533-2565` | Memoize last level; only call `UXdeclutter` when it changes (reset in renderMap wrapper) |
| P3 | `setView()` forces a layout read (`getBoundingClientRect`) every call → every pan/momentum/pinch frame | `index.html:1899` (+ gesture handlers) | Cache the rect; refresh only on resize/orientationchange |
| info | Initial load, DOM size, memory, font loading all well within budget | whole app | No change required |

## Strengths

- **Map correctness:** all three HANDOFF bugs closed; all 108 artists resolve to a real footprint (0 dangling); filter/count math exact (sum=108); 642 Moulton south-footprint fix verified; POSITIONS geometry valid inside the viewBox.
- **Robust address resolution:** `resolvePosKey` honors unit letter → alias → first-sub-unit → numbered-range, memoized, no collisions on real data.
- **Offline/PWA done right:** network-first shell + cache-first assets, real sha256 content-hash cache version stamped by prepare.js (self-invalidating each release), every SHELL asset present, zero CDN/analytics/remote fetch in the live path.
- **XSS-safe by construction:** `esc()` on all data text, `safeUrl()` http(s) allowlist + `rel=noopener` on every dynamic href, per-character-escaping fuzzy `<mark>` highlighter.
- **Privacy-exemplary:** geolocation returns only `{lat,lng,acc}`, never persisted/transmitted; locked-down CSP forbids egress; no telemetry/eval/secrets; honest, consistent Info.plist usage string + both PrivacyInfo manifests (wired into Resources).
- **Genuine de-brand:** facts-only data, original SVG map (no copied artwork/photos), neutral name/bundle/icon, verbatim not-affiliated disclaimer, thorough proactive 5.2/4.2 review notes.
- **Clean native config:** consistent bundle identity, valid 1024 no-alpha icon, `ITSAppUsesNonExemptEncryption=false`, arm64-only, reproducible pinned pods, unbranded splash, signing left to the human.
- **Build-pipeline hygiene:** idempotent prepare.js + icon generator, index.html in sync, www/ gitignored+regenerated, shipped icon byte-identical to master, escaping-safe base64 injection, scraper scripts + tesseract removed.
- **Performance headroom:** declutter avoids getBBox/layout, momentum captures rect once per flick, clean rAF lifecycle, debounced search, GPU-composited GPS pulse, reduced-motion honored comprehensively, map built once with class-toggle-only filter/theme changes.
- **Solid UX a11y bones:** ARIA-slider sheet handle with synced values, multi-select chips with `aria-pressed`, robust 3-way theme system (Preferences + localStorage fallback, private-mode safe).

## Recommended next actions

### HUMAN-ONLY gates (Claude cannot do these — do not score as Claude-fixable)
- [ ] **[P0] Scrub public git history** of the 197 scraped photos + official-map/template blobs — `git filter-repo` + force-push, or make the repo private / delete-and-recreate (`SCRUB_GIT_HISTORY.md`). The repo is *currently serving* a copyrighted photo over raw.githubusercontent.com.
- [ ] **[P1] Owner decision on the display name "ArtWalk LA"** — accept the documented 5.2/trademark risk, or rename to a neutral mark (e.g. "Lincoln Heights Studio Map") to drop risk to low.
- [ ] **[P1] Enable GitHub Pages** (Settings → Pages → `main` / `/docs`) and confirm both Privacy + Support URLs return 200 before submitting.
- [ ] **[P2] Owner decision on the bundle id** `com.breweryartwalk.app` — if unacceptable, register a neutral id + create a new ASC record (app id `6766774479` is tied to the current id).
- [ ] **[submit] App Store Connect / signing:** set Team + bundle id in Xcode Signing & Capabilities; bump `CURRENT_PROJECT_VERSION` above any build already on the record; complete the App Privacy questionnaire; upload screenshots/metadata; **Submit for Review**. Verify Target Membership shows PrivacyInfo.xcprivacy checked.

### CLAUDE-FIXABLE (prioritized)
- [ ] **[P1] Add focus containment to the bottom sheet and About overlay** — set `inert` (+ `aria-hidden` fallback) on background chrome while either is open, and add a Tab-trap to the sheet mirroring About's. (`index.html:1701-1719`, `1145-1167`, building loop `1568-1574`.)
- [ ] **[P1] Fix the search focus-steal** — in `openSheet`, focus the sheet only on a fresh open and only when focus is not inside `#search`, so the iOS keyboard survives typing. (`index.html:2064-2071`, `1701-1710`.)
- [ ] **[P2/build] Re-sync the iOS mirror** — `node prepare.js && npx cap sync ios` so `ios/App/App/public/` picks up the CSP meta + `artwalk-shell-e600df34`; make this a mandatory pre-archive step.
- [ ] **[P2] Fix the GPS projection aspect mismatch** — re-derive GEO corners to the SVG's 1.116 aspect, or project to meters with a uniform scale + letterbox; verify the dot against satellite imagery. (`index.html:1179-1188`, `2192-2199`.)
- [ ] **[P2] Reconcile stale docs** — `CHANGELOG_REBRAND.md` bundle id → `com.breweryartwalk.app`; mark PrivacyInfo + iPad screenshots DONE and drop the deleted-screenshot warning in `SUBMISSION_CHECKLIST.md`; fix Name/Subtitle counts in `APP_STORE_PREP.md:63-64`.
- [ ] **[P2] Accessibility polish** — `rem`-based type scale (Dynamic Type), `tabindex=-1` on `.dim` buildings (or roving tabindex), add a skip link, darken `ux-count` to pass AA, throttle `#status`, add a plain `:focus` ring.
- [ ] **[P3] Near-me unit consistency** — thread `unit` through `uxCentroidLatLng`→`uxCentroidSvg`→`resolvePosKey` so the distance badge matches the navigation target. (`index.html:2248`.)
- [ ] **[P3] Fix the SW registration guard + comment** — exclude Capacitor native (`!window.Capacitor?.isNativePlatform?.()`) and correct the misleading `capacitor://` comment (`index.html:1261-1268`); add `./icons/favicon.svg` to the SW precache.
- [ ] **[P3] Performance micro-wins** — memoize the declutter zoom level (skip per-frame work during pans/flicks) and cache the container rect (refresh on resize/orientationchange).
- [ ] **[P3] Hygiene** — `git rm --cached _archive/stale-screenshots/*.png`; reduced-motion live-check for the sheet; sub-unit `694 South Avenue 21` rename; `resolvePosKey` cache-key delimiter; In-app About version → `1.0`.
- [ ] **[P3/info] Dead-code cleanup** — remove the duplicate `recenter`/`focusSearch` stubs, `.badge-*`/`.bio` CSS, the unused `distanceLabel` export; reference `NATURAL.w/.h` in the projection; consolidate the duplicate `#sheet` reduced-motion rules.
