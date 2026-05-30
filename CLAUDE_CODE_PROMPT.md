# Claude Code prompt — audit, fix, de-brand & ship the app (unofficial, unbranded)

## How to use this file

1. On your Mac, open Terminal in the project root (`/Users/mbrown/Desktop/Art Walk`).
2. Run `claude` to start Claude Code in this folder.
3. Start Claude Code with permissions pre-granted so it never pauses to ask (see the launcher note you were given), and paste everything below the `=== PROMPT STARTS HERE ===` line as your first message.
4. Walk away. It runs all phases back-to-back with no approval gates, makes the judgment calls itself, and logs them to `CHANGELOG_REBRAND.md`.
5. It stops *only* for things Claude Code physically cannot do (Apple ID login/2FA, Xcode GUI signing, App Store Connect web portal); those land in a checklist at the end.

> Still **safe by design**: it audits before it touches anything, works on a branch, commits per phase, and moves removed files into a gitignored `_archive/` instead of hard-deleting — so the unattended run stays fully reversible.

---

=== PROMPT STARTS HERE ===

You are working in an existing iOS app repository on my Mac. Your job has four goals, in order: **(1) audit the whole app, (2) fix what's broken, (3) convert it into a legally defensible *unofficial, unbranded* app, and (4) prepare it for App Store submission.** Work carefully and do not skip the approval gates.

## Hard constraints — read first

- **This must become an UNOFFICIAL, UNBRANDED app.** The organization behind the real-world event ("Brewery Art Walk" / the Brewery Arts Complex) wants this app to exist but **cannot and will not authorize it or provide a permission letter.** Therefore you must assume we have **zero license** to their trademarks, their copyrighted images, their written artist bios, or their official map artwork.
- **The legal strategy is: nominative fair use + facts-only content.** We may *refer to* the event by name as a plain factual statement, but we may not use it as our app's brand, and we may not ship their copyrighted material. Details in Phase 3 and Phase 4.
- **I am not your lawyer and you are not mine.** Where something is a legal judgment call, flag it in your audit for me to decide; don't silently assume.
- **Run autonomously, end to end — do not stop for my approval between phases.** Make the reasonable judgment calls yourself, record them in `CHANGELOG_REBRAND.md`, and keep going. The only things allowed to halt you are steps Claude Code physically cannot perform (Apple ID login/2FA, Xcode GUI signing, App Store Connect web portal) — collect those into a checklist and continue with everything else.
- **Prefer reversible operations.** Do not hard-delete; move files into a gitignored `_archive/` folder and exclude them from `www/` so nothing ships and nothing is lost. Never `git reset --hard` or force-push.
- **Do all work on a branch**, commit after each phase with clear messages, and keep a running `CHANGELOG_REBRAND.md` so I can review and revert.

## What I know about the repo (verify everything yourself)

- It's a **Capacitor 6** app: a single-file web app (`index.html`, ~200 KB) wrapped for iOS. `prepare.js` inlines `artists.json` (108 artists) and `buildings.json` (35 buildings) into `index.html` and mirrors the result to `www/` (Capacitor's `webDir`).
- Native iOS project lives in `ios/App/` (`App.xcodeproj`, `App.xcworkspace`, `Podfile`, `Pods/`).
- `capacitor.config.json` currently has `appId: com.breweryartwalk.app`, `appName: "Brewery Art Walk"`.
- Native features already added: `@capacitor/geolocation` (a "find me" GPS dot), `@capacitor/preferences` (favorites), and a service worker `sw.js` for offline.
- The interactive map is hand-built SVG inside `index.html`: a `POSITIONS` table (≈ line 425), a `renderMap()` function (≈ line 595), and an `OVERLAY` calibration constant (≈ line 562) used only when the page is opened with `?overlay=1`.
- Helper scripts in `package.json`: `build`/`postinstall` (run `prepare.js`), `ios:add`, `ios:icons`, `ios:sync`, `ios:open`, `ios:run`, `images:download`, `images:compress`, `icons:placeholder`.
- Context docs already in the repo: `README.md`, `APP_STORE_PREP.md`, `BACKLOG.md`, `HANDOFF.md`, `MAC_SETUP.md`, plus `docs/privacy.md` and `docs/support.md`.
- Known-broken items per `HANDOFF.md`: building footprints drift from the printed map; the `OVERLAY` constant is not yet calibrated; `1910 N. Main` is placed in the SW but belongs in the NW corner; several buildings on the printed map (`606, 608, 614, 616, 674, 678, 688, 694, 2024 N. Main`) are missing from `buildings.json`.

Start by reading these files yourself: `README.md`, `APP_STORE_PREP.md`, `HANDOFF.md`, `BACKLOG.md`, `package.json`, `capacitor.config.json`, `index.html`, `artists.json`, `buildings.json`, `docs/privacy.md`, `docs/support.md`. Do not trust my summary over what you actually find.

---

## Phase 0 — Setup (no code changes yet)

1. Run `git status` and `git branch`. If the tree is dirty, tell me before doing anything. Create and switch to a branch named `unofficial-rebrand`.
2. Generate or update a `CLAUDE.md` at the repo root capturing: stack, build/run commands, the inline-via-`prepare.js` workflow, known bugs, the rebrand/legal constraints above, and the manual (human-only) steps list. (If a `CLAUDE.md` already exists, merge, don't overwrite.)
3. Create `CHANGELOG_REBRAND.md` with empty sections for each phase below.
4. Confirm your toolchain on this Mac: `node -v`, `npm -v`, `xcodebuild -version`, `xcrun simctl list devices available | head`. Report what's present/missing. Do **not** install anything yet.

Record Phase 0 results in `CHANGELOG_REBRAND.md` and continue straight into Phase 1 — do not wait.

---

## Phase 1 — AUDIT ONLY (read-only; produce a report, change nothing)

Investigate the entire app and write your findings to `AUDIT.md`, organized into these five sections. **Do not fix anything in this phase.**

**1A. Correctness & bugs.** Map calibration (the `OVERLAY` constant, `1910 N. Main` misplacement, the missing buildings, any other footprint drift), the geolocation lat/lng → SVG transform, the service worker (cache version, what it caches, update behaviour under Capacitor's `capacitor://`/`https` scheme), favorites persistence (Capacitor Preferences vs. localStorage fallback), search/filter logic, accessibility, console errors, dead code, and anything that would crash or look broken to a reviewer.

**1B. Trademark / branding surface.** Grep the entire repo and list **every** place the protected name or org identity appears: `app id`, app name, display name, `capacitor.config.json`, `package.json`, `Info.plist`, icons, splash, the in-app "About" panel, `index.html` title/headings/meta, service worker cache names, `docs/`, `README`, screenshots, App Store copy in `APP_STORE_PREP.md`, GitHub URLs (`Mattkillsyou/ArtWalk`, `mattkillsyou.github.io`), and the bundle identifier. Output a table: file → line → current string → why it's a branding/trademark risk.

**1C. Copyrighted-content inventory.** This is the most important section. Identify every asset we do **not** own:
   - Artist **photos** in `img/artists/` (these were downloaded from the org's website — treat all as third-party copyrighted).
   - Artist **bios** / descriptive prose in `artists.json` (creative text = copyrighted).
   - The **official map** and any derivative of it: `Map.jpg`, `bw map.jpg`, `map_greyscale.jpg`, `image00001.jpeg`, `template.svg`, `template-shapes.json`, and any OCR/trace artifacts, plus the big `wetransfer_*.zip`.
   - Fonts and any other downloaded assets — confirm license (e.g. Inter Tight is OFL; fine to bundle).
   For each: file/field, size, source, and whether it's **copyrightable creative work** (photo, bio, map artwork) or **non-copyrightable fact** (artist name, public studio address, unit number, medium, category, public website/Instagram URL). Cite the fact/expression distinction (facts and directory data are not copyrightable; only original creative expression and original selection/arrangement are).

**1D. App Store readiness.** Audit against current Apple requirements (verify them yourself — search Apple's developer docs, don't trust hardcoded values, they change): privacy manifest (`PrivacyInfo.xcprivacy`), `Info.plist` usage strings (`NSLocationWhenInUseUsageDescription`), required screenshot sizes, minimum Xcode/SDK for new uploads, the App Privacy questionnaire data, age rating, category, and the Guideline 4.2 (web-wrapper) and **Guideline 5.2 (intellectual property / unofficial-app)** risks specifically. State plainly where we still have exposure after the rebrand.

**1E. Fix & rebrand plan.** A ranked, phased to-do list mapping every finding above to a concrete action in Phases 2–5. Flag anything that needs a decision from me.

When `AUDIT.md` is written, summarize the top risks in the changelog, then continue automatically into Phase 2. You are running unattended — do not wait for approval.

---

## Phase 2 — Fix bugs

Implement the correctness fixes from 1A. Prioritize anything a reviewer or user would hit immediately. At minimum:
- Calibrate the map: tune `OVERLAY`, move `1910 N. Main` to the NW corner, and either add the missing buildings to `buildings.json` (+ `POSITIONS`) or document why they're intentionally omitted.
- Verify geolocation, offline/service-worker, favorites, and search/filter actually work; fix what doesn't.
- Remember the workflow: after editing `index.html`, `artists.json`, or `buildings.json`, run `node prepare.js` to re-inline and mirror to `www/`.
- Build to confirm nothing is broken: `npm run ios:sync` then a simulator build (`xcodebuild -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 16 Pro Max' build`, adjusting the device name to one that exists from your `simctl` check).
- Commit: `fix: <summary>`. Update `CHANGELOG_REBRAND.md`. Summarize and continue.

---

## Phase 3 — De-brand into an unofficial app

Goal: remove the protected mark as our identity, while keeping a single honest factual reference allowed under nominative fair use.

1. **Pick a new neutral name yourself.** Choose a name that does NOT contain the protected event mark and does not imply affiliation (neighborhood/geography-based, e.g. "Lincoln Heights Studio Map" or "Avenue 21 Studio Guide"). Record your pick, 2 alternates, and the rationale in the changelog, then apply it everywhere from 1B: `capacitor.config.json` (`appName`), display name, `package.json` `name`/`description`, `index.html` `<title>`/headings/meta, `manifest.webmanifest`, service-worker cache names, `docs/`, `README`.
2. **Change the bundle identifier** off `com.breweryartwalk.app` to a neutral one tied to the new name (e.g. `com.<mychosen>.studiomap`). Update `capacitor.config.json` and note that the Xcode target's identifier and signing must be set by me in the GUI.
3. **Allowed nominative reference only.** A reviewer needs to know what the app is for, so include exactly one factual, non-stylized line in the About panel and the store description, e.g.:
   > "An independent, unofficial guide for visitors exploring artist studios in the Lincoln Heights / Brewery arts district of Los Angeles. Not affiliated with, endorsed by, sponsored by, or authorized by the Brewery Art Walk or the Brewery Arts Complex."
   Rules: plain text only, **no logo, no stylized wordmark, no official colors**, use the mark only as far as needed to identify the area/event, and never the words "official," "presented by," or anything implying endorsement.
4. **Icon & splash:** ensure the placeholder icon contains no org mark, logo, or trade dress. Keep a neutral typographic/abstract placeholder.
5. Rewrite `APP_STORE_PREP.md` store copy to match the new name and the unofficial framing (remove "official-style guide," the org name as title, etc.).
6. Commit: `rebrand: unofficial unbranded identity`. Update changelog. Summarize and continue.

---

## Phase 4 — Resolve content rights (strip & rebuild on facts)

We have no license, so remove everything copyrightable and rebuild the directory from facts only.

1. **List every file/field you're removing or blanking** (from inventory 1C) in the changelog, then proceed without waiting. Do not hard-delete — move removed files into a gitignored `_archive/` folder and exclude them from `www/`, so the action is reversible and nothing ships.
2. **Artist photos:** remove the bundled scraped images from the app/`www` and from `artists.json` image fields. Replace with a neutral generated placeholder (e.g. a category-colored tile with the artist's initials) so layout still works. Keep the original files out of the shipped bundle; if you don't delete them from the repo, ensure they're `.gitignore`d and excluded from `www/` so they never ship.
3. **Bios:** remove copied bio prose from `artists.json`. Either leave blank, or replace with a short neutral factual line generated from facts we're allowed to use (name, medium, building) — clearly not copied text.
4. **Keep the facts:** artist name, public studio address, unit, building, medium/category, and public website/Instagram URLs are factual directory data and may stay.
5. **Map:** do not ship the official map artwork or any direct trace of it. Confirm the in-app SVG is our own original schematic (simple rectangles/streets we draw), not an embedded copy of `Map.jpg`. Remove `Map.jpg`, `bw map.jpg`, `map_greyscale.jpg`, `image00001.jpeg`, `template.svg`, `template-shapes.json`, the OCR artifacts, and the `wetransfer_*.zip` from anything that ships (and ideally from the repo). Building positions themselves are facts; redraw/relabel as needed so the schematic is clearly our own work.
6. **Update privacy policy & docs:** delete the line claiming images are "used with permission from the Brewery Art Walk organization" (no longer true and we don't ship their images). Update `docs/privacy.md`, `docs/support.md`, and the in-app About text accordingly.
7. Run `node prepare.js`, rebuild, confirm the app still renders with placeholders. Commit: `content: remove unlicensed assets, rebuild on facts`. Update changelog. Summarize and continue.

---

## Phase 5 — App Store preparation (do what's possible from CLI; stop at human gates)

Verify current Apple requirements yourself before acting. Then:

1. **Privacy manifest & permission strings:** confirm `PrivacyInfo.xcprivacy` is present and correct for our actual API use (location for functionality, no tracking), and that `NSLocationWhenInUseUsageDescription` in `Info.plist` matches the new name and is honest.
2. **Screenshots:** boot a simulator and capture the required sizes via `xcrun simctl` (current spec as of 2026: 6.9" iPhone at 1320×2868 or 1290×2796, and if iPad is supported, 13" at 2064×2752 — verify before relying on these). Capture at least: full map, building tapped → artist list, artist detail, an active filter. Save to `store/screenshots/`.
3. **Store metadata:** produce final, honest copy (name ≤30, subtitle ≤30, promo ≤170, description ≤4000, keywords ≤100) reflecting the unofficial framing, plus suggested category and **review notes** that proactively explain to the reviewer: this is an independent unofficial guide, contains no third-party copyrighted images/text, uses only public factual info, uses location only for the on-map dot, and is not claiming affiliation.
4. **Build for distribution if my signing is already configured:** try `npm run ios:sync`, then `xcodebuild -workspace ios/App/App.xcworkspace -scheme App archive ...`. If signing/team isn't set (GUI-only — only I can do it), skip the archive, add it to the human-only checklist, and keep going. Do not block.
5. Write `SUBMISSION_CHECKLIST.md`: everything done vs. everything left, with the human-only steps called out explicitly (below).
6. Commit: `chore: app store prep`. Update changelog.

---

## What you CANNOT do — list these for me as manual steps, don't attempt them

- Apple Developer Program enrollment ($99/yr) and any Apple ID login / 2FA.
- Xcode GUI: Signing & Capabilities, selecting a Team, setting the bundle ID in the target, provisioning profiles.
- App Store Connect web portal: creating the app entry, the **App Privacy questionnaire**, uploading screenshots/metadata into the listing, pricing/availability, TestFlight tester management.
- The final **Submit for Review** button.
Do the CLI-automatable parts (builds, archives, `simctl` screenshots, validation, metadata files, IPA upload via App Store Connect API *if* I've given you keys), and hand me a precise, ordered checklist for the rest.

## Operating rules (apply throughout)

- Use your built-in to-do/plan tracking so I can review the full trail afterward.
- Run all phases back-to-back without pausing for approval; summarize each phase in the changelog and move straight on.
- After any change to `index.html`/`artists.json`/`buildings.json`, always `node prepare.js`.
- Commit per phase; never force-push; keep `CHANGELOG_REBRAND.md` current.
- For legal judgment calls, make the conservative choice (assume no license, keep facts only, strip anything creative), record your reasoning, and continue — never wait for me and never invent authorization we don't have.
- End with a single summary: what shipped, the decisions you made on my behalf (chosen name, anything archived), residual risks (especially remaining Guideline 5.2 exposure), and my ordered human-only to-dos.

=== PROMPT ENDS HERE ===
