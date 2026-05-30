# App Review Notes — Lincoln Heights Studio Map

Paste this into App Store Connect → App Review Information → Notes.

---

**What this app is.** An independent, unofficial walking map of artist studios in
the Lincoln Heights arts district of Los Angeles. It helps visitors find studios on
a campus map, search and filter by medium, and save favorites.

**Intellectual property (Guideline 5.2).**
- The app is independent and unofficial. It is not affiliated with, endorsed by, or
  authorized by any event or organization, and it does not claim to be.
- It contains **no third-party copyrighted material**: no photographs, no copied
  biographies, and no third-party map artwork.
- All content is non-copyrightable **factual directory information** — artist names,
  public studio addresses and unit numbers, medium/category, and public website /
  social links — compiled from publicly available sources.
- The campus map is our **own original schematic** (plain rectangles + street
  labels) based on public building locations; it is not a copy of any third-party map.
- The app name and icon are neutral and original — no third-party trademarks, logos,
  or trade dress. A single factual sentence names the local arts district to describe
  what the app is for, with a clear not-affiliated disclaimer (nominative reference).

**Minimum functionality (Guideline 4.2).** This is not a web wrapper of a website.
It provides native functionality: a Core Location "you are here" dot on the map,
full offline use (all data and the map are bundled), and persistent on-device
favorites.

**Privacy (Guidelines 5.1.1 / 5.1.5).**
- Location is used only to show the user's position on the map. It is never stored,
  never transmitted off the device, and never shared.
  `NSLocationWhenInUseUsageDescription` states this.
- No accounts, no analytics, no ads, no tracking, and no third-party SDKs that
  collect data. `PrivacyInfo.xcprivacy` declares precise location for App
  Functionality (not linked to identity, not used for tracking) plus required-reason
  APIs (UserDefaults `CA92.1`, file timestamp `C617.1`).
- Privacy policy: https://mattkillsyou.github.io/ArtWalk/privacy.html

Happy to provide any additional information on request.
