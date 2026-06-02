# CHANGELOG — unofficial / unbranded rebrand

Running log of the autonomous audit → fix → de-brand → content-strip → store-prep
run on branch `unofficial-rebrand`. One section per phase. Every judgment call I
made on the owner's behalf is recorded here. Removed files are moved to a
gitignored `_archive/` (never hard-deleted); nothing in `_archive/` ships.

Legal posture (applied throughout): **assume zero license** to the event's
trademarks, photos, bios, or official map. Keep only non-copyrightable facts.
When a call is genuinely legal, make the conservative choice and record it.

---

## Phase 0 — Setup

**Branch.** Already on `unofficial-rebrand` (off `main`). Working tree had **no
modified tracked files** — only untracked new files (`ios/`, `.env.testflight`,
`BACKLOG.md`, `CLAUDE.md`, `CLAUDE_CODE_PROMPT.md`, `UNOFFICIAL_APP_LEGAL_GUIDE.md`).
Treated as clean; proceeded.

**Toolchain (this Mac).**

| Tool | Version | Notes |
|---|---|---|
| node | v25.9.0 | OK |
| npm | 11.12.1 | OK |
| Xcode | 26.5 (17F42) | iOS 26 SDK present → meets the Apr 28 2026 minimum-SDK rule |
| Simulators | iOS 26.4 runtime | **No "iPhone 16 Pro Max"** — using **iPhone 17 Pro Max** (a 6.9" device) for builds/screenshots |

Nothing installed (per instructions).

**Decisions / actions in Phase 0:**
- **Secret protected.** `.env.testflight` holds real App Store Connect API
  credentials (key id + issuer id) and was **not** matched by `.gitignore`
  (patterns were `.env`, `.env.local`, `.env.*.local`). It was untracked, so
  never committed — added `.env.testflight` to `.gitignore` to keep it that way.
  The referenced `.p8` key lives outside the repo (`~/.appstoreconnect/...`). These
  credentials mean a CLI IPA upload is *possible* in Phase 5 if a valid archive exists.
- **`CLAUDE.md` already present and accurate** (stack, commands, `prepare.js`
  workflow, legal constraints, human-only steps). It satisfies the Phase 0.2
  checklist, so it was left intact rather than churned. Its "known bugs" list is
  **stale** — see Audit 1A; corrected understanding is captured in `AUDIT.md`.
- Created this `CHANGELOG_REBRAND.md`.

---

## Phase 1 — Audit (read-only)

Full report in [`AUDIT.md`](AUDIT.md). No code changed in this phase.

**Top risks (ranked):**

1. **Copyright — shipped content (highest).** The bundle ships **197 scraped
   artist photos** (`img/artists/`, 202 refs across 41 artists), **34 copied
   bios** in `artists.json`, and **derivatives of the official map**
   (`map_greyscale.jpg` + `bw map.jpg` are copied into `www/` by `prepare.js` and
   precached by `sw.js`). The **app icon itself** embeds a footprint comment-labeled
   "traced from the actual map." All of this is third-party copyrighted → must be
   stripped (Phase 4) / re-drawn (Phase 3 icon).
2. **Trademark — the name is the brand.** "Brewery Art Walk" is the app name,
   bundle id (`com.breweryartwalk.app`), `<title>`, headings, manifest, icon
   wordmark ("BAW" / "BREWERY ART WALK"), and docs title ("official-style guide").
   Must become a neutral name + single nominative reference + disclaimer (Phase 3).
3. **False permission claims.** In-app About ("images used with permission"),
   `docs/privacy.md`, `docs/support.md` ("built with permission") and
   `APP_STORE_PREP.md` all assert authorization we do **not** have. Must be deleted
   (Phase 3/4).
4. **Correctness — 12 artists unreachable on the map.** 9 artist addresses have no
   matching `POSITIONS` key (building split into `#A…#F` sub-shapes or merged into
   `630-638`, while artists keep the bare address; `1984 N. Main` has no shape at
   all). Tap-to-list and search-to-zoom silently fail for them (Phase 2).
5. **Native project broken.** `ios/App/App.xcodeproj/project.pbxproj` and the
   source `Info.plist` are **missing** → `xcodebuild` can't build. Must regenerate
   the iOS platform (Phase 5). The shipped archive also had **no
   `NSLocationWhenInUseUsageDescription`** despite requesting location.
6. **Apple 5.2 residual.** Even after de-brand + strip, an event-companion app can
   draw a 5.2 inquiry. Mitigate with proactive review notes (Phase 5).

**Map calibration is NOT a current bug** (contra `HANDOFF.md`/`CLAUDE.md`): the SVG
was re-derived at 1:1 against the map image (viewBox `1019×913`), `1910 N. Main` is
already in the NW corner, and the previously-"missing" buildings are present. The
old `OVERLAY` trial-and-error constant is gone. Verified by reading; re-verified by
rendering in Phase 2.

---

## Phase 2 — Fix bugs

**Primary fix — A2: 12 artists were unreachable on the map.** Added an
address→shape resolver `resolvePosKey()` in `index.html` (after `POSITIONS`):
exact match → explicit alias → first `#`-sub-unit shape → numbered-range shape
(`630-638`). Routed `artistsByAddress` grouping and the search-result tap handler
(`zoomTo`/`highlightBuilding`/return key) through it. Result, verified in Node
against all 108 artists: **0 unresolved** (was 12). The 9 formerly-orphaned
addresses now resolve:
- `618/622/690/692/696 Moulton Avenue` → their first `#A` sub-unit shape
- `632/634/638 Moulton Avenue` → `630-638 Moulton Avenue`
- `1984 N. Main Street` → `1980 N. Main Street` (alias)

**Judgment call — `1984 N. Main Street`.** It has 1 artist but **no footprint** in
the V1 schematic, and I won't ship the official map to trace an exact one. Rather
than guess a footprint (a misplaced building looks worse to a reviewer than none),
I **aliased it to the adjacent `1980 N. Main` block** so the artist stays tappable
and zoomable; the artist's detail still shows the true `1984` address. Owner can
later add a real `1984` shape. Same posture leaves `2024 N. Main` (0 artists in the
data) intentionally undrawn.

**Calibration confirmed (not re-done).** Rendered the production SVG to PNG
(`_audit/map.svg.png`, via QuickLook) and inspected it: coherent campus, `1910` in
the NW corner, Moulton-Ave diagonal wedge on the west, no broken overlaps — i.e. the
legacy "known bugs" are already resolved. Fixed the stale `viewBox is 1200×1400`
code comment to `1019×913`.

**Other checks.** Favorites (Capacitor Preferences + `localStorage` fallback),
search/filter, and the geolocation transform were code-reviewed and are sound; the
geolocation dot has an inherent rotational approximation (documented in `AUDIT.md`,
not a blocker). App `<script>` parses cleanly (`new Function` check); `www/` mirror
regenerated by `node prepare.js`.

**Deferred (pre-existing breakage, → Phase 5):** `npm run ios:sync` + `xcodebuild`
can't run because `ios/App/App.xcodeproj/project.pbxproj` and the source
`Info.plist` are missing. The iOS platform will be regenerated after the rebrand so
it inherits the new id/name, then built. The browser preview server could not be
used (the preview sandbox denies `cwd`/`open` on the project dir — `npx`, `python3`,
and a custom Node server all hit `EPERM`), so verification used Node + a rasterized
SVG render instead.

_Dead code (badges, `bld-name`, vestigial `OVERLAY` injection) left in place; the
overlay/map-image removal is folded into Phase 4 with the map-asset strip._

---

## Phase 3 — De-brand (unofficial, unbranded)

**Name (my pick):** **Lincoln Heights Studio Map**. Purely geographic (the LA
neighborhood) + functional, 26 chars, contains no protected mark, avoids "Walk".
- Alternates considered: *Avenue 21 Studio Guide*, *Moulton Studios Map* (both
  reference public street names; rejected as less clear/broad than the neighborhood).
- **Bundle id:** *planned* `com.breweryartwalk.app` → `com.lincolnheights.studiomap`,
  but **this was later reverted** — the shipped id stayed `com.breweryartwalk.app` to
  match the App Store Connect record (app id 6766774479) created afterward. The internal
  slug did migrate (SW cache `studiomap-shell-v1`, `FAV_KEY` `studiomap.favorites.v1`).
  The reverse-DNS bundle id is not user-visible; see `AUDIT_FULL.md` for the trade-off.

**Applied the name everywhere it shipped** (per Audit 1B): `index.html` `<title>`,
header, `apple-mobile-web-app-title`, description/og meta, svg aria-label, About
heading/tagline; `manifest.webmanifest`; `package.json` name/description; `sw.js`
header + cache; `PrivacyInfo.xcprivacy` comment; `docs/index.md` + `_config.yml`;
`README.md`; `MAC_SETUP.md` bundle id; rewrote `APP_STORE_PREP.md` to the unofficial
strategy. Also neutralized two branded code comments.

**Nominative reference + disclaimer.** Replaced the About panel's false
"images used with permission · © Brewery Art Walk" line and dropped the
`breweryartwalk.com` "org" link. About now carries one plain-text factual line
(names the neighborhood) plus the verbatim disclaimer: *"This is an independent,
unofficial guide. It is not affiliated with, endorsed by, sponsored by, or
authorized by the Brewery Art Walk, the Brewery Arts Complex, or any artist listed.
All studio and artist information is drawn from publicly available sources."* No
logo, wordmark, colors, or "official". Same disclaimer added to `docs/index.md` +
`README.md`.

**Icon (both problems).** The old `app-icon-1024.svg`/`favicon.svg` embedded a
footprint "traced from the actual map" **and** a "BAW" / "BREWERY ART WALK"
wordmark; `generate-placeholder-icons.mjs` stamped "BAW". Replaced all three with a
**neutral abstract mark** — four white "studio" blocks + a blue "you-are-here" dot
on a dark ground (generic geometry, no text, no real coordinates) — and regenerated
every PNG size (`icons/*.png`, `ios-icon-stash/icon-1024.png`). Verified visually.

**Deferred to Phase 4** (content, not name): the `sw.js` `breweryartwalk.com`
remote-image branch + map-image precache, and `docs/privacy.md` / `docs/support.md`
"with permission" claims.

Sweep of the shipping surface confirms the only remaining "Brewery" mentions are the
intended nominative disclaimers. `node prepare.js` re-inlined + mirrored to `www/`.

---

## Phase 4 — Content rights (strip & rebuild on facts)

Removed everything copyrightable; rebuilt the directory on facts only. Nothing was
hard-deleted — tracked assets were `git rm --cached` (untracked, kept in history)
and physically moved to the gitignored **`_archive/`**, so the action is reversible
and nothing ships.

**Archived (moved to `_archive/`, untracked):**
- **197 artist photos** (`img/artists/`) — third-party © .
- Official map + derivatives: `Map.jpg`, `bw map.jpg`, `map_greyscale.jpg`,
  `image00001.jpeg`, `IMG_1075 copy.png`, `IMG_1077 copy.png`.
- Map traces / OCR: `template.svg`, `template-shapes.json`, `ocr.json`.
- Map-tracing dev tools: `capture.html`, `numbered.html`.
- `wetransfer_*.zip` (265 MB raw source; was already gitignored).

**`artists.json` blanked (facts kept):** `bio` → null (34 removed), `images` → []
(41 lists, 202 refs removed), `profile_url` → null (41 `breweryartwalk.com`
portfolio deep-links removed). **Kept:** name, address, unit, category +
`category_original`, medium, and genuine public `website` (27) / `instagram` (5) /
`other_links` (19) — verified 0 of those are org-domain. 0 residual
`breweryartwalk`/`img/artists` strings in the file.

**Photos → generated placeholder.** Added `placeholderTile(a)` — a
category-colored rounded tile with the artist's initials (our own original SVG,
`esc()`-safe), replacing the old `<img>`. Verified the design renders cleanly across
all 11 categories.

**Map images severed from the build:**
- `prepare.js`: dropped `bw map.jpg` / `map_greyscale.jpg` and `img/artists` from
  the copy lists; **now wipes `www/` before each rebuild** so removed assets can't
  linger in the Capacitor bundle (was a real leak — stale photos survived in `www/`).
- `sw.js`: removed `bw map.jpg` / `map_greyscale.jpg` from the precache SHELL and
  deleted the dead `breweryartwalk.com` remote-image branch.
- `index.html`: removed the vestigial `OVERLAY`/overlay-mode code + CSS (it named the
  map images and was already non-functional — no `<image>` was ever injected).

**Docs / permission claims fixed:** rewrote `docs/privacy.md` (dropped "images loaded
from breweryartwalk.com" and "used with permission"; now states facts-only, no remote
content, with the disclaimer) and `docs/support.md` (dropped "built with permission"
and the event-promo link; contact via GitHub issues, since no app email exists —
flagged for the owner). The in-app About claim was already fixed in Phase 3.

**Verification:** `node prepare.js` → `www/` contains only HTML/SW/manifest/fonts/icons
(no photos, no maps); `index.html` has no `a.images`/`img/artists`/map/OVERLAY refs;
app script + `sw.js` parse; `www/index.html` matches source. The map remains our own
SVG schematic (confirmed by the Phase 2 render).

---

## Phase 5 — App Store prep

**Verified Apple requirements (this run):** new submissions need the **iOS 26 SDK /
Xcode 26** (in force since Apr 28 2026) — we have Xcode 26.5 / iOS 26.4 SDK.
Screenshots captured at the simulator's **native 6.9" resolution (1320×2868)**, an
accepted size, sidestepping spec ambiguity.

**Native project regenerated (fixes the Audit 1D blocker).** Moved the broken
`ios/` (missing `project.pbxproj` + `Info.plist`) to `_archive/ios-broken/` and ran
`npx cap add ios`, which regenerated a clean project from the rebranded
`capacitor.config.json` → bundle id `com.lincolnheights.studiomap`, display name
"Lincoln Heights Studio Map". CocoaPods 1.16.2 `pod install` ran.

**Privacy / permission strings.** Added an honest `NSLocationWhenInUseUsageDescription`
to the new `Info.plist` and copied `PrivacyInfo.xcprivacy` into `ios/App/App/`.
**Caveat:** the manifest is **not yet referenced by the Xcode project**, so it won't
ship until dragged into the App target — flagged as a human GUI step in
`SUBMISSION_CHECKLIST.md`.

**Build + run verified.** `xcodebuild … -destination 'iPhone 17 Pro Max'
CODE_SIGNING_ALLOWED=NO build` → **BUILD SUCCEEDED**. Installed + launched on the
simulator and captured 4 real screenshots to `store/screenshots/`:
- `01-map-home` — header "LINCOLN HEIGHTS STUDIO MAP", full schematic, "Showing 108 of 108 artists"
- `02-building-list` — "620 MOULTON · 8 artists" (facts only, no photos/bios)
- `03-artist-detail` — Joey Forsyte + the generated initials placeholder tile (no photo)
- `04-filter-active` — "Showing 25 of 108 artists" with non-matching buildings dimmed
(An intermittent simulator iCloud nag was cleared with `simctl erase` before recapture.
Interactive states were driven by injecting a DOM-click script into the *built bundle*
only — source untouched.)

**Icons hardened.** Regenerated all PNGs **without an alpha channel** (`colorType:2`)
since App Store icons can't be transparent; installed the neutral 1024 icon as the
AppIcon. Fixed the broken `ios:icons` npm script (`npx capacitor-assets` → 404; now
runs the local generator + copies the master).

**Docs written:** `store/metadata.md` (name 26/30, subtitle 22/30, promo 158/170,
keywords 97/100, description, category, App-Privacy answers), `store/review-notes.md`
(proactive 5.2/4.2/privacy notes), and `SUBMISSION_CHECKLIST.md` (done vs. the ordered
human-only steps + residual 5.2 risk).

**Committed the regenerated `ios/` project** so the working build, `Info.plist`, and
neutral AppIcon persist (Pods/build/public stay gitignored).

**Could not do (human gates):** Apple ID/2FA, Xcode signing/Team + adding the privacy
manifest to the target, App Store Connect entry/privacy questionnaire/metadata+screenshot
upload, and Submit for Review. A device **archive** needs signing, so it's deferred to
the human (a CLI IPA upload via the ASC API in `.env.testflight` is possible only after
a signed archive exists).

---

## Summary of decisions made on the owner's behalf

- **App name:** Lincoln Heights Studio Map (alts: Avenue 21 Studio Guide, Moulton
  Studios Map). **Bundle id:** com.lincolnheights.studiomap.
- **Archived (not deleted)** all unlicensed assets to gitignored `_archive/`.
- **Facts-only data:** removed bios, photos, and org profile-links; kept directory facts
  + genuine artist website/IG links.
- **`1984 N. Main`** aliased to `1980 N. Main`; **`2024 N. Main`** left undrawn.
- **Support** routed to GitHub issues (no app email); **legal-conservative** throughout
  (assumed zero license).

---

## Post-run change — display name → "ArtWalk LA" (owner override)

After the run, the owner directed renaming the app's **display name** to **ArtWalk LA**.
Applied across all user-facing/shipping/store surfaces (display name, title,
`apple-mobile-web-app-title`, manifest name/short_name, About heading, `Info.plist`
`CFBundleDisplayName` + `NSLocation` string, docs, README, `package.json` name,
`store/metadata.md` + `review-notes.md`, checklist). **Bundle id kept neutral**
(`com.lincolnheights.studiomap`); descriptive "Lincoln Heights arts district" copy and
the not-affiliated disclaimer were left intact. Rebuilt + verified in the simulator
(header reads "ARTWALK LA").

**⚠️ Recorded risk (owner accepted, against the documented strategy).** I flagged that
this reverses the core de-brand: "Art Walk" is the distinctive part of the protected
event mark, so using it *as the app's name* (not merely a factual reference) re-opens
the **trademark / impersonation** problem and the **App Store Guideline 5.2** rejection
risk the rebrand was built to eliminate. "ArtWalk LA" is also **confusingly similar to
the separately trademarked "Downtown LA Art Walk"**, a different LA event — a second,
independent mark it could collide with. The owner chose to proceed anyway. The
content-rights work (facts only, no photos/bios/official map) is unaffected and still
holds; this risk is purely on the **name/trademark/5.2** axis. Mitigations still in
place: neutral bundle id/icon and the prominent not-affiliated disclaimer.
