# Submission Checklist — ArtWalk LA

Independent, unofficial app. Generated at the end of the autonomous rebrand run.
See `CHANGELOG_REBRAND.md` for the full decision log and `AUDIT.md` for findings.

## ✅ Done in this repo (automated)

- [x] **Bugs fixed** — all 108 artists reachable on the map (address→shape resolver);
  calibration verified by render; stale comments fixed.
- [x] **De-branded** — name `ArtWalk LA`, neutral icon (no wordmark / no map trace),
  nominative reference + not-affiliated disclaimer in About + docs. **Bundle id is
  `com.breweryartwalk.app`** — it matches the existing App Store Connect record (app id
  6766774479) and is reverse-DNS only, never shown to users. Switching to a fully neutral
  id (e.g. `com.<owner>.artwalkla`) is possible **only before the first upload** and means
  creating a new ASC record — an owner decision (see Residual risk + `AUDIT_FULL.md`).
- [x] **Content stripped to facts** — 197 photos, 34 bios, official map + traces, and
  41 org profile-links removed (archived to gitignored `_archive/`); photos replaced
  with generated initials tiles. `www/` ships only HTML/SW/manifest/fonts/icons.
- [x] **Privacy** — `PrivacyInfo.xcprivacy` present (location=App Functionality, no
  tracking; UserDefaults `CA92.1`, file-timestamp `C617.1`); honest
  `NSLocationWhenInUseUsageDescription` in `Info.plist`; privacy/support docs corrected.
- [x] **Native project rebuilt** — the previously-broken Xcode project was
  regenerated; **`xcodebuild` simulator build SUCCEEDS** (iPhone 17 Pro Max, iOS 26.4
  SDK). App runs and renders correctly (verified).
- [x] **Icons** — neutral, alpha-free PNGs at all sizes incl. the 1024 App Store icon.
- [x] **Screenshots** — current 6.9" iPhone set in **`store/screenshots/ux2/`**
  (`01-home`…`06-sunlight`; the ArtWalk LA UI with the bottom action bar). The older
  top-level `01-04*.png` and `store/screenshots/ux/` sets show the **abandoned** name
  and the removed route feature — archived, do NOT upload them. The 13" iPad set in
  `store/screenshots/ipad/` predates the action-bar upgrade and should be re-captured
  from the current build (iPad is a declared target).
- [x] **Store copy + review notes** — `store/metadata.md` (name/subtitle/promo/
  description/keywords all within limits) and `store/review-notes.md` (proactive
  5.2 / 4.2 / privacy notes).
- [x] **Toolchain meets Apple's Apr-28-2026 rule** — built with Xcode 26.5 / iOS 26 SDK.

## Left to do (human-only — Claude Code cannot do these)

Ordered. Items marked (GUI)/(WEB)/(ACCOUNT) are off-CLI.

1. **(ACCOUNT)** Apple Developer Program enrollment ($99/yr); Apple ID sign-in + 2FA
   in Xcode. (Team `RPV54B2NK5` was used on a prior archive — confirm it's still valid.)
2. **(WEB)** Enable **GitHub Pages** (repo → Settings → Pages → branch `main`,
   folder `/docs`) so the privacy/support URLs resolve:
   `https://mattkillsyou.github.io/ArtWalk/privacy.html` and `/support.html`.
3. **(GUI)** In Xcode (`ios/App/App.xcworkspace`):
   - Signing & Capabilities → select Team; confirm bundle id
     `com.breweryartwalk.app` (must match the App Store Connect record); let
     automatic signing provision.
   - **Add `PrivacyInfo.xcprivacy` to the App target** — it sits in `ios/App/App/` but
     is **not yet referenced by the project**, so it won't ship until you drag it into
     the App target (check "App" in Target Membership). Required because the app uses
     UserDefaults (a required-reason API).
   - Set Version `1.0`, Build `1` (use a higher build number if one already exists
     on the record).
   - **Export compliance:** `Info.plist` now declares
     `ITSAppUsesNonExemptEncryption=false` (no custom crypto, standard HTTPS only), so
     App Store Connect shouldn't prompt; if it does, answer **No / exempt**.
4. **(GUI/CLI)** Archive for device: Product → Archive (or
   `xcodebuild -workspace ios/App/App.xcworkspace -scheme App archive` once signing is
   set). Then Distribute → App Store Connect → Upload. (CLI IPA upload via the App
   Store Connect API is possible — creds are in the gitignored `.env.testflight` — but
   only after a signed archive exists.)
5. **(WEB)** App Store Connect → create the app entry (bundle id above, name
   "ArtWalk LA", iOS). Paste copy from `store/metadata.md`; upload the current
   screenshots from `store/screenshots/ux2/` (plus a re-captured 13" iPad set); set
   category Travel/Reference, age 4+,
   price Free.
6. **(WEB)** Fill the **App Privacy** questionnaire per `store/metadata.md`
   (Track: none; Linked: none; Not linked: Precise Location → App Functionality).
7. **(WEB)** Add the **App Review notes** from `store/review-notes.md`.
8. **(WEB)** TestFlight: install on a device, walk the campus, sanity-check the GPS dot.
9. **(WEB)** **Submit for Review.**

## Residual risk (be honest)

- **Guideline 5.2 + trademark (ELEVATED by the name choice).** Stripping content +
  the neutral icon/bundle id still removes the copyright exposure (no protected imagery
  or copied text). **But the display name "ArtWalk LA" (owner's choice) uses the
  distinctive "Art Walk" phrase as the brand**, which re-opens the trademark /
  impersonation angle and raises 5.2 rejection risk; it is also confusingly close to
  the separately trademarked **"Downtown LA Art Walk."** The not-affiliated disclaimer
  and review notes mitigate but do not eliminate this. A neutral name (e.g. the prior
  "Lincoln Heights Studio Map") would keep this risk low; written content/name
  permission would take it near zero. See `CHANGELOG_REBRAND.md` → "Post-run change".
- The geolocation dot is an approximate (north-up linear) projection — fine for
  orientation, not survey-accurate. Noted in `AUDIT.md`.

## Notes / decisions (see CHANGELOG_REBRAND.md)

- Support contact routes to GitHub issues (no app email exists) — add a real email in
  `docs/support.md` / `docs/privacy.md` if preferred.
- `1984 N. Main` (1 artist, no footprint on our schematic) is aliased to the adjacent
  `1980 N. Main` block; `2024 N. Main` (0 artists) is intentionally undrawn.
- Optional: rename the GitHub repo off `ArtWalk` to fully neutralize the URL path.
- The old broken iOS project is preserved at `_archive/ios-broken/` (gitignored).
