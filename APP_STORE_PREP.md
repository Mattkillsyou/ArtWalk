# ArtWalk LA — App Store Prep

> Prep notes for shipping V1 as an **independent, unofficial** app.
> Final submission-ready metadata, review notes, and the human-only checklist
> live in `SUBMISSION_CHECKLIST.md` + `store/` (produced in Phase 5).
> Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## Strategy (read first)

This app is **unofficial and unbranded**. We assume **zero license** to the event's
trademarks, photos, bios, or official map. Two separate problems, two fixes:

1. **Trademark (the name/look)** → solved by a neutral name (**Lincoln Heights
   Studio Map**), bundle id `com.lincolnheights.studiomap`, no logo/wordmark/colors,
   and a single plain-text nominative reference + disclaimer (nominative fair use).
2. **Copyright (the content)** → solved by **shipping facts only**: artist names,
   public studio addresses, units, medium/category, and public website/Instagram
   links. **No** third-party photos, **no** copied bios, **no** official-map image.
   The in-app map is our own original SVG schematic.

The old plan (get a permission letter; bundle ~197 scraped photos as the "5.2 fix")
is **abandoned** — it was the thing most likely to get the app rejected.

### Three review risks

1. **Guideline 4.2 (web-wrapper)** → mitigated by real native features
   (Geolocation dot, offline service worker, persistent favorites).
2. **Guideline 5.2 (IP / unofficial)** → mitigated by de-brand + facts-only +
   **proactive review notes**. Residual risk is reduced, **not zero** (Apple has
   discretion over event-companion apps). Belt-and-suspenders (optional, owner
   declined): written content permission from the org/artists.
3. **Privacy Manifest** → `PrivacyInfo.xcprivacy` present; location = app
   functionality, no tracking.

---

## Status

### Done in-repo (this rebrand)
- [x] Neutral name + bundle id applied across app, manifest, SW cache, docs, icon
- [x] Single nominative reference + disclaimer in the in-app About panel
- [x] Neutral icon (no wordmark, no map trace) + regenerated PNG sizes
- [x] Content stripped to facts (photos + bios removed; see Phase 4 / `_archive/`)
- [x] Original SVG schematic map (not an embedded copy of the official map)
- [x] `PrivacyInfo.xcprivacy` at repo root (location functionality, no tracking)
- [x] All 108 artists reachable on the map (address→shape resolver)

### Human-only (see SUBMISSION_CHECKLIST.md)
- [ ] Apple Developer enrollment + Apple ID / 2FA
- [ ] Xcode Signing & Capabilities (Team, bundle id), Info usage strings
- [ ] App Store Connect: app entry, App Privacy questionnaire, screenshots/metadata
- [ ] Enable GitHub Pages for privacy/support URLs
- [ ] Submit for Review (with the review notes from `store/`)

---

## Store copy drafts (de-branded)

```
Name (≤30):      ArtWalk LA        (26)
Subtitle (≤30):  Find LA artist studios            (21)
Promo (≤170):    An independent, unofficial map of 100+ artist studios in the
                 Lincoln Heights arts district of Los Angeles. Search, filter,
                 and find studios on a walkable map.
```

### Description (≤4000)

```
ArtWalk LA is an independent, unofficial guide to artist studios
in the Lincoln Heights arts district of Los Angeles — a dense cluster of working
studios in a historic former brewery complex.

Use it to:
• Find artists by name, medium, or category — painting, sculpture, photography,
  jewelry, ceramics, installation, and more
• See every studio on a clean, hand-drawn campus map
• Get oriented on foot — the map shows where you are in real time
• Save your favorite artists to come back to
• Browse offline once you've opened the app — the whole map and directory work
  with no signal

NO accounts. NO ads. NO tracking. The app uses your location only to show your
dot on the map, and that never leaves your phone.

This is an independent, unofficial guide. It is not affiliated with, endorsed by,
sponsored by, or authorized by the Brewery Art Walk, the Brewery Arts Complex, or
any artist listed. All studio and artist information is drawn from publicly
available sources.
```

### Keywords (≤100, comma-separated)

```
art studios,open studios,artist,gallery,studio map,Lincoln Heights,Los Angeles,sculpture,painting,ceramics
```

_Note: deliberately avoid using the protected event name as a keyword to ride its
discoverability — keywords stay geographic/functional._

### Permission string (Info.plist) — honest, new name

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>ArtWalk LA uses your location only to show your position on the studio map. Your location stays on your device and is never sent anywhere.</string>
```

---

## Apple guideline crosswalk

| # | What | Status |
|---|---|---|
| 1.5 | Easy contact info | About panel + support URL |
| 2.3.1 | Accurate, honest metadata | Copy above is honest, unofficial framing |
| 2.3.7 | Unique app name ≤30 | "ArtWalk LA" (26) |
| 4.2 | More than a web wrapper | Geolocation + offline + favorites |
| 5.1.1 | Privacy policy in app + ASC | About panel + `docs/privacy.md` |
| 5.1.5 | Clear location purpose string | `NSLocationWhenInUseUsageDescription` above |
| 5.2.1 | Use only content you own/license | **Facts only; no third-party media. Review notes explain.** |

Privacy/support page copy is finalized in `docs/privacy.md` + `docs/support.md`.
Submission-ready review notes are in `store/review-notes.md`.
