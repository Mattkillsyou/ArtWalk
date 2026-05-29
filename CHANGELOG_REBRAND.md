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

_(pending)_

---

## Phase 3 — De-brand (unofficial, unbranded)

_(pending)_

---

## Phase 4 — Content rights (strip & rebuild on facts)

_(pending)_

---

## Phase 5 — App Store prep

_(pending)_
