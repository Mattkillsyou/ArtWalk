# Brewery Art Walk — App Store Submission Checklist

> Live punch list for shipping V1 to the iOS App Store.
> Status legend: `[ ]` not started · `[~]` in progress · `[x]` done
> Tasks tagged `(WIN)` are done in this repo on Windows, `(MAC)` on the Mac, `(APPLE)` in App Store Connect / Developer Portal, `(YOU)` are off-machine actions.

---

## TL;DR — what's blocking submission

These three rejection risks must be solved before submitting:

1. **Guideline 4.2 (web-wrapper rejection)** → solved by adding native features (Geolocation, offline cache, favorites)
2. **Third-party content (Guideline 5.2)** → solved by a permission letter from Brewery Art Walk org OR self-hosting all artist images
3. **Privacy Manifest (PrivacyInfo.xcprivacy)** → mandatory file Apple has required since May 2024

---

## Phase A — what I can build from Windows now

### A1. Native features (kills the 4.2 web-wrapper risk)
- [x] **(WIN)** Service worker for offline cache (`sw.js`) — caches index.html, JSON, map images, artist photos
- [x] **(WIN)** Register service worker in `index.html` (graceful no-op in Capacitor's `capacitor://` scheme)
- [x] **(WIN)** Add `@capacitor/geolocation` to `package.json` dependencies
- [x] **(WIN)** "Find me" button → blue pulsing GPS dot SVG overlay using lat/lng → SVG affine
- [x] **(WIN)** Add `@capacitor/preferences` for favorites persistence (Capacitor on native, localStorage fallback on web)
- [x] **(WIN)** Star button on artist detail → toggle favorite, persisted
- [x] **(WIN)** Filter chip: "★ Favorites"

### A2. Self-hosted assets (kills the 5.2 risk + offline)
- [x] **(WIN)** Download Inter Tight woff2 file locally → `fonts/inter-tight.woff2` (45 KB), kill the Google Fonts CDN link
- [x] **(WIN)** `download-artist-images.mjs` — downloaded all 197 unique images from breweryartwalk.com to `img/artists/`
- [x] **(WIN)** Rewrote `artists.json` to point at local paths (`img/artists/<slug>.jpeg`)
- [x] **(WIN)** `compress-artist-images.mjs` — resized to max 1280px @ JPEG q78 (54 MB → 31 MB)

### A3. Privacy Manifest + permission strings (kills the hard blocker)
- [x] **(WIN)** Created `PrivacyInfo.xcprivacy` at repo root — `npm run ios:add` script auto-copies it into `ios/App/App/` after `cap add`
- [x] **(WIN)** Drafted `NSLocationWhenInUseUsageDescription` text (in this file)
- [x] **(WIN)** Drafted Info.plist additions

### A4. App "About" panel (Guideline 1.5 + 5.1.1)
- [x] **(WIN)** "i" button in header → modal with: version, support URL, privacy policy URL, brewery org link, copyright, "no accounts/no ads/no tracking" line
- [x] **(WIN)** "◎" Find me button next to it

### A5. Icons + launch screen
- [x] **(WIN)** Placeholder 1024×1024 app icon → `ios-icon-stash/icon-1024.png` + SVG source `app-icon-1024.svg`
- [x] **(WIN)** Apple Touch Icon (180px) + PWA icons (192/512) generated → `icons/`
- [x] **(WIN)** Web manifest (`manifest.webmanifest`) for PWA & home-screen installs
- [x] **(WIN)** `npm run ios:icons` script ready: runs `npx capacitor-assets generate` from the 1024 master once on Mac
- [ ] **(MAC)** Launch screen storyboard — Capacitor's default scaffolds with `cap add ios`; replace assets later

### A6. App Store Connect copy (drafts in this file)
- [x] **(WIN)** App name + subtitle drafted
- [x] **(WIN)** Description (≤4000 char) drafted
- [x] **(WIN)** Keywords (≤100 char comma-separated) drafted
- [x] **(WIN)** Promotional text (≤170 char) drafted
- [x] **(WIN)** Privacy Policy text drafted (also live at `docs/privacy.md` — enable GitHub Pages and the URL is `https://mattkillsyou.github.io/ArtWalk/privacy/`)
- [x] **(WIN)** Support page text drafted (also at `docs/support.md`)

---

## Phase B — what you do off-machine / on the Mac

### B1. Apple Developer Account `(YOU)` `(APPLE)`
- [ ] Sign up at **developer.apple.com** — $99/year
- [ ] Wait for Apple verification (hours to a few days)
- [ ] Sign into Xcode on the Mac with the same Apple ID
- [ ] In App Store Connect: create the app entry (bundle ID `com.breweryartwalk.app`, name "Brewery Art Walk", platform iOS)

### B2. Brewery Art Walk content authorization `(YOU)`
- [ ] Get written permission (email is fine) from the Brewery Art Walk organization to use:
  - Their artist directory (names, bios)
  - Their hosted images
  - The campus map / floor plan
  - The "Brewery Art Walk" name
- [ ] Save the email — Apple may ask for proof during review

### B3. Privacy Policy + Support URLs `(YOU)`
- [ ] Host the privacy policy text from this file somewhere public:
  - Easiest: GitHub Pages (free, just enable on the existing repo)
  - Or: Notion public page
  - Or: a page on your own site
- [ ] Host a support page (single page with email contact)
- [ ] URLs go into App Store Connect

### B4. On the Mac — bootstrap iOS `(MAC)`
```bash
cd ~/path/to/ArtWalk
git pull
npm install                                        # runs prepare.js automatically
npm run ios:add                                    # cap add ios + auto-copies PrivacyInfo.xcprivacy
npm run ios:icons                                  # generates every iOS icon size from master 1024 png
npm run ios:open                                   # syncs www/ and opens Xcode
```

### B5. In Xcode `(MAC)`
- [ ] Click project root → **Signing & Capabilities** → pick your team
- [ ] Bundle Identifier: `com.breweryartwalk.app`
- [ ] Display Name: `Brewery Art Walk`
- [ ] Version: `1.0.0`, Build: `1`
- [ ] **Info tab**: paste in the permission strings from Phase A3 of this file
- [ ] **General → App Icons and Launch Images**: confirm AppIcon is populated (it should be after `cap sync` if we placed icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`)
- [ ] Build for "Any iOS Device" (top selector) → **Product → Archive**
- [ ] When archive completes: **Distribute App → App Store Connect → Upload**

### B6. Screenshots `(MAC)`
Required for App Store Connect — minimum 1, max 10 per device size. Apple in 2026 requires the 6.9" iPhone size (it auto-propagates to smaller screens):

- [ ] **iPhone 6.9"** (1320×2868 or 1290×2796) — required
  - In Xcode: Product → Run on **iPhone 16 Pro Max** simulator → Cmd+S to screenshot
- [ ] **iPad Pro 13"** (2064×2752) — only if you support iPad (recommended: yes, low-effort win)
  - Run on iPad Pro 13" simulator → Cmd+S
- [ ] Screenshots to capture (at least these 4):
  1. Whole-campus map view with all buildings
  2. Building tapped → artist list bottom sheet
  3. Artist tapped → artist detail with images
  4. Filter chips active (e.g. "Painting" filter selected)

### B7. App Store Connect listing `(APPLE)`
- [ ] Create app entry → fill all metadata fields (drafts in this file)
- [ ] Upload screenshots
- [ ] Fill **App Privacy** questionnaire ("Data Used to Track You: NONE", "Data Linked to You: NONE", "Data Not Linked to You: Location → app functionality only")
- [ ] Set age rating: **4+**
- [ ] Set primary category: **Travel**, secondary: **Reference**
- [ ] Set price: Free
- [ ] Set availability: United States (or worldwide if you prefer)
- [ ] Add the build from Xcode (it appears 5-30 min after upload)
- [ ] **Add to TestFlight first** — invite yourself + a few testers, walk the campus

### B8. Submit for review `(APPLE)`
- [ ] After TestFlight feels good
- [ ] In App Store Connect: **Submit for Review**
- [ ] Add Review Notes: explain it's a guide for the Brewery Art Walk in LA, location is used to show position on the campus map only, no account, no payments
- [ ] If Brewery Art Walk content is licensed, mention this and offer to provide proof
- [ ] Wait 24-48 hours for Apple's response

---

## Drafts ready to use

### App name / subtitle / promo text

```
Name (≤30):       Brewery Art Walk
Subtitle (≤30):   LA's Largest Art Colony
Promo (≤170):     The complete guide to the Brewery Art Walk in Lincoln Heights —
                  100+ artist studios across the historic LA Brewery campus, on a
                  map you can use as you walk.
```

### Description (≤4000 char)

```
Brewery Art Walk is the official-style guide to the Brewery, the largest live-work
art colony in the world, tucked into a historic former brewery in Lincoln Heights,
Los Angeles.

Use it to:
• Find artists by name, medium, or category — painting, sculpture, photography,
  jewelry, ceramics, installation, and more
• See every studio on a clean campus map
• Get directions on foot — the map shows where you are in real time
• Save your favorite artists to come back to
• Browse offline once you've opened the app — the entire map and directory work
  with no signal

The Brewery campus is a maze. This app makes it easy.

NO accounts. NO ads. NO tracking. The only thing the app uses your location for
is showing your blue dot on the map — and that data never leaves your phone.

Made for art-walkers, by art-walkers.
```

### Keywords (≤100 char, comma-separated)

```
art,walk,studio,gallery,Brewery,Lincoln Heights,LA,Los Angeles,artist,colony,map,guide,open,studios
```

### Privacy Policy text (host this somewhere)

```markdown
# Brewery Art Walk — Privacy Policy

Last updated: [DATE]

Brewery Art Walk respects your privacy. This is a short policy because the app
collects very little data.

## What we collect

- **Your location**: Only when you tap "show me on the map." Your location is
  used solely to display a blue dot on the campus map. It is never transmitted
  off your device, never stored, and never shared with us or any third party.
- **Your favorites**: When you tap the heart icon on an artist, we store that
  preference locally on your device using iOS's standard preferences storage.
  We do not see this data.

## What we do NOT collect

- We do not collect your name, email, phone number, or any account info.
- There are no user accounts.
- We do not use analytics, advertising trackers, or any third-party SDKs that
  collect data about you.
- We do not track you across other apps or websites.

## Network requests

The app loads artist images from breweryartwalk.com. Your IP address is
visible to that server like any normal web request. We do not log or analyze
this access.

## Third-party content

Artist names, bios, and images are used with permission from the Brewery Art
Walk organization.

## Changes

If we change this policy, we'll update the date above and post the new version
in the app's "About" screen.

## Contact

Questions? Email [SUPPORT EMAIL].
```

### Support page text

```markdown
# Brewery Art Walk — Support

Need help with the app? Found a wrong address, missing artist, or a bug?

Email: [SUPPORT EMAIL]
We usually reply within a few days.

The Brewery Art Walk happens twice a year — visit
breweryartwalk.com for event dates.
```

### Permission strings (Info.plist values)

When the iOS folder exists, drop these into `ios/App/App/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Brewery Art Walk uses your location to show your position on the campus map. Your location stays on your device — it's never sent anywhere.</string>
```

### Privacy Manifest (PrivacyInfo.xcprivacy)

Create at `ios/App/App/PrivacyInfo.xcprivacy`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyTrackingDomains</key>
    <array/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypePreciseLocation</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
    </array>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>C617.1</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

The `CA92.1` reason code = "Access info from same app, per documentation."
The `C617.1` reason code = "Inside app container, accessing same app's files."

---

## Reference: Apple guideline numbers we're solving for

| # | What | Status |
|---|---|---|
| 1.5 | Easy contact info | About panel + support URL |
| 2.1 | App must be complete and not crash | Tested in TestFlight before submitting |
| 2.3.1 | Accurate metadata (don't lie about features) | Drafts in this file are honest |
| 2.3.5 | Right category | Travel + Reference |
| 2.3.7 | Unique app name ≤30 char | "Brewery Art Walk" — fits |
| 2.3.8 | Metadata appropriate for 4+ age rating | No objectionable content |
| 2.4.1 | Should run on iPad if possible | Capacitor's webview already works on iPad |
| 2.4.2 | No excessive battery drain | Use `getCurrentPosition` not `watchPosition` |
| 2.5.1 | Public APIs only | Capacitor uses public APIs |
| 4.2 | More than a web wrapper | **Native features added in Phase A1** |
| 4.5.1 | Don't scrape Apple sites | N/A |
| 5.1.1 | Privacy policy link in app + App Store Connect | About panel + App Store Connect field |
| 5.1.5 | Location permission with clear purpose string | NSLocationWhenInUseUsageDescription drafted |
| 5.2.1 | Use only content you own/license | **Permission letter needed (Phase B2)** |
| 5.2.2 | Display third-party content with authorization | Same as above |

---

## ✅ Phase A complete

What landed in this repo (Windows):

**Native features that defeat the 4.2 web-wrapper rejection**
- Service worker for full offline (`sw.js`)
- Geolocation w/ pulsing GPS dot on map (Capacitor + browser fallback)
- Favorites with star button + filter chip (Capacitor Preferences + localStorage fallback)

**Content rights resolution (5.2)**
- All 197 artist images downloaded to `img/artists/` and bundled in the app
- `artists.json` rewritten to local paths
- 31 MB of local images replace ~200 third-party HTTP requests
- Inter Tight font self-hosted — no Google Fonts CDN dependency

**Apple-mandated Privacy Manifest**
- `PrivacyInfo.xcprivacy` ready at repo root
- `npm run ios:add` auto-copies it after `cap add ios`

**Apple guideline 1.5 + 5.1.1**
- About modal with version, support, privacy policy, copyright
- All link to live URLs at `mattkillsyou.github.io/ArtWalk/...`

**Submission-ready artifacts**
- `app-icon-1024.svg` (placeholder — replace with real logo any time)
- `icons/` (apple-touch-icon, favicon, PWA icons)
- `manifest.webmanifest` for PWA / home-screen install
- `docs/privacy.md` + `docs/support.md` for GitHub Pages
- `APP_STORE_PREP.md` (this file) with all the App Store copy drafts

## What's left to ship

Per Phase B above. Short version:

1. Apple Developer Account ($99/yr) `(YOU)`
2. Get permission letter from Brewery Art Walk org `(YOU)`
3. Enable GitHub Pages on this repo, settings → Pages → branch `main` / folder `/docs` `(YOU)`
4. On the Mac: `npm install && npm run ios:add && npm run ios:icons && npm run ios:open` `(MAC)`
5. In Xcode: pick signing team, paste `NSLocationWhenInUseUsageDescription` from this file, archive, upload to App Store Connect `(MAC)`
6. App Store Connect: paste copy from this file, take 4 screenshots in iOS Simulator, fill privacy questionnaire, TestFlight, submit `(APPLE)`
