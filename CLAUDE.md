# CLAUDE.md — project memory

> Drop-in context file for Claude Code. Loaded automatically at the start of each session in this repo. Keep it short and current.

## What this app is

An iOS app: a single-file web app wrapped with **Capacitor 6**. It's an interactive campus map of an LA art-studio district (108 artists, 35 buildings). Native features: geolocation "find me" dot, offline service worker, persistent favorites.

## Active goal: convert to an UNOFFICIAL, UNBRANDED app

The real-world event's organization will **not** authorize this app and won't provide a permission letter. So we assume **zero license** to their trademarks, photos, bios, or official map. The working plan:

1. **Audit** the whole app (read-only) → `AUDIT.md`.
2. **Fix** bugs (map calibration, geolocation, offline, favorites).
3. **De-brand**: new neutral name + bundle ID; reference the event only as one plain-text factual line + a "not affiliated" disclaimer; no logo/colors/wordmark.
4. **Strip content**: remove all scraped artist photos, copied bios, and the official map artwork; keep only facts (names, public addresses, medium, public URLs); ship our own original SVG schematic.
5. **App Store prep**: privacy manifest, screenshots, honest metadata, proactive 5.2 review notes.

See `CLAUDE_CODE_PROMPT.md` (the full task prompt) and `UNOFFICIAL_APP_LEGAL_GUIDE.md` (the reasoning). Work on branch `unofficial-rebrand`; commit per phase; keep `CHANGELOG_REBRAND.md`.

## Architecture & workflow

- `index.html` — the entire app (single file, ~200 KB). The map is hand-built SVG: `POSITIONS` table (≈ line 425), `renderMap()` (≈ line 595), `OVERLAY` calibration constant (≈ line 562, only active with `?overlay=1`).
- `artists.json` (108) + `buildings.json` (35) are the data. **`prepare.js` inlines them into `index.html` and mirrors the result to `www/`** (Capacitor's `webDir`).
- **After editing `index.html`, `artists.json`, or `buildings.json`, always run `node prepare.js`.**
- Native iOS project: `ios/App/` (`App.xcworkspace`, `App.xcodeproj`, `Podfile`, `Pods/`).
- `capacitor.config.json`: currently `appId com.breweryartwalk.app` / `appName "Brewery Art Walk"` → both to be replaced in the de-brand phase.

## Commands

```bash
node prepare.js            # re-inline JSON into index.html + www/ (run after data/HTML edits)
npm run ios:sync           # build web + npx cap sync ios
npm run ios:open           # build + sync + open Xcode
npm run ios:run            # build + sync + run on simulator
npm run ios:icons          # generate iOS icon set from ios-icon-stash/icon-1024.png
# Simulator build (pick a device that exists from `xcrun simctl list devices available`):
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro Max' build
```

## Known bugs (from HANDOFF.md — verify, then fix)

- Building footprints drift from the printed map; `OVERLAY` not yet calibrated.
- `1910 N. Main` is placed in the SW but belongs in the **NW** corner.
- Buildings on the printed map missing from `buildings.json`: `606, 608, 614, 616, 674, 678, 688, 694, 2024 N. Main`.

## Content rights rule (do not violate)

- **Keep** (facts): artist name, public studio address, unit, building, medium/category, public website/Instagram URL.
- **Remove** (copyrighted): artist photos in `img/artists/`, bio prose in `artists.json`, and the official map files (`Map.jpg`, `bw map.jpg`, `map_greyscale.jpg`, `image00001.jpeg`, `template.svg`, `template-shapes.json`, OCR artifacts, `wetransfer_*.zip`).
- The in-app SVG schematic is our own original work and stays; building positions are facts.

## Human-only steps (Claude Code cannot do these — list them, don't attempt)

Apple Developer enrollment & Apple ID/2FA · Xcode GUI Signing & Capabilities / Team / bundle ID in target · App Store Connect app entry, App Privacy questionnaire, screenshot/metadata upload, pricing, TestFlight tester management · final **Submit for Review**.

## Safety rules

Runs unattended, end to end — no approval gates. Prefer reversible ops: move files into a gitignored `_archive/` instead of hard-deleting; never `git reset --hard` or force-push. Commit per phase. For legal judgment calls, make the conservative choice (assume no license, facts only) and record it rather than waiting.
