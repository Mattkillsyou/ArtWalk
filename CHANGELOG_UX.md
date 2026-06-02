# CHANGELOG — UX upgrades (multi-agent)

Branch `ux-upgrades`. Implemented the UX_UPGRADES "recommended first slice"
(items **1, 2, 6, 10, 11, 16, 17, 20**) using **4 parallel agents in isolated git
worktrees**, then integrated (lead) and verified. Offline-first, facts-only, and
unbranded throughout; `node prepare.js` run after every `index.html` edit.

## Approach
- Created branch `ux-upgrades` off `main`; spun up 4 worktrees (`.artwalk-ux/*`) each
  on its own branch (`ux-feat-{visual,wayfind,mapgest,discovery}`).
- Gave every agent a shared brief (`AGENTS_SHARED.md`): the one-file constraint,
  existing IDs/JS to preserve, a **cross-agent contract** (bottom action-bar button
  ids `#ux-act-*` that call `window.UX.<hook>?.()`; each agent exposes its entry points
  on `window.UX`), and rules (delimited `/* === UX: … === */` + `// === UX: … ===`
  blocks at shared anchors, no reformatting, ≥44px targets, `prefers-reduced-motion`,
  no new network/3rd-party deps).
- Agents validated with `node prepare.js` + a JS-parse check (no native build — their
  worktrees have no CocoaPods).

## What each agent built
- **visual** (`51feb2a`, items 16/17/10): `:root` design tokens; 3 themes via
  `data-theme` (auto / **sunlight** max-contrast / dark) with a persisted toggle;
  refined `CAT_COLORS` + original per-category SVG glyphs in `placeholderTile`; a
  thumb-reachable bottom **action bar** (`#ux-actionbar`, ≥44px) wired to `window.UX` hooks.
- **wayfind** (`a8064dd`, items 1/2): `window.UX.nearMe()` (rank studios by haversine
  from GPS, smart ft/mi badges), `window.UX.routeTo()/clearRoute()` (route line + arrow
  + distance/ETA on the SVG), a "Take me there" button in artist detail.
- **mapgest** (`e494e91`, item 6 + 7): momentum/inertia pan, double-tap-zoom-at-point,
  smooth `window.UX.recenter()`, pinch verified; collision/zoom-aware label declutter
  with per-building studio counts ("642 · 9"). All motion guards `prefers-reduced-motion`.
- **discovery** (`b57dbc7`, items 11/20): multi-select category chips + fuzzy
  search-as-you-type with `<mark>` highlighting (XSS-safe); `#sheet` PEEK/HALF/FULL snap
  points with draggable handle, flick-to-dismiss, internal scroll.

## Integration (lead) — merged each branch into `ux-upgrades`, kept BOTH features
1. **visual** → fast-forward.
2. **wayfind** → conflict at the two shared anchors (CSS before `</style>`, JS before
   `// Init`). Resolved keep-both; **fixed an `@media` split** — git factored the common
   `}`+delimiter suffix, leaving visual's `prefers-reduced-motion` block open, so I
   re-closed it.
3. **mapgest** → same two-anchor conflict; clean keep-both (blocks self-contained).
4. **discovery** → same two-anchor conflict; clean keep-both. **Caught + fixed a real
   bug:** discovery's CSS comment contained a literal `</style>`, which the HTML parser
   treats as the end of the `<style>` element regardless of CSS comments — it would have
   prematurely closed the stylesheet and broken all CSS below it. Rewrote the comment.

After each merge: `node prepare.js`, JS-parse check, and a brace-balance check (main CSS
**196/196 balanced**). Final integrated `index.html` parses clean with all 9 UX blocks
and the `window.UX` hooks present.

## Decisions made on the owner's behalf
- **Simulator = iPhone 17 Pro Max** (the prompt said iPhone 16 Pro Max, which doesn't
  exist on this Mac; 17-series + iPad Pro 13" M5 are present).
- **`window.UX` hook collisions resolved by load order:** visual ships stub
  `nearMe`/`recenter`/`focusSearch`; the authoritative versions (wayfind / mapgest /
  discovery) are defined in later blocks and win at runtime. (Stubs are harmless dead
  code; flagged for optional cleanup.)
- **Per-merge verification = prepare.js + JS-parse + CSS brace-balance** rather than a
  full `xcodebuild` per merge: for a one-file Capacitor web app, `xcodebuild` compiles
  the unchanged native shell and does NOT execute/validate the JS — the parse check
  plus a final simulator **run** (below) is the verification that actually catches
  integration breakage. One native build + on-device run is done at the end.

## Verification & screenshots
- **Simulator build + run:** `xcodebuild … iPhone 17 Pro Max` → **BUILD SUCCEEDED**;
  installed + launched; all four feature sets confirmed working at runtime (no crash,
  108 artists rendered). 8 screenshots in `store/screenshots/ux/`: `01-home` (action
  bar + per-building studio counts "642 · 13"), `02-building`, `03-artist` (refined
  tile with category glyph + "Take me there"), `04-filter` (multi-select), `05-sunlight`
  (max-contrast theme), `06-dark`, `07-nearme` (distance-ranked list), `08-route`.
- **Fresh review agent** diffed `ux-upgrades` vs `main`: **no P0s** — no regressions to
  existing IDs/handlers, offline-first intact (zero new network/CDN/font/script deps),
  no third-party media or brand-as-brand, `window.UX` hook collisions resolve correctly
  by load order (authoritative impls win), inverse lat/lng projection is the exact
  inverse of `latLngToSvg`, JS parses, `www/` mirror identical.
- **Fixes applied (commit `48ae93c`):**
  - **P1** — three action-bar buttons (near/search/recenter) had *duplicate* click
    listeners (visual + the owning agent) → double-fire. Removed visual's three; each
    button now binds exactly once.
  - **P2 contrast (AA):** route button `#007aff`→`#0058d0` (white text ≥4.5:1);
    count suffix `#b0b0b0`→`#8a8a8a` + `html[data-theme="sunlight"] tspan.ux-count{fill:#000}`;
    default-theme label token `--ux-label #8c8c8c`→`#6a6a6a`.

## Residual risks / follow-ups
- **Dead code (P2, deferred):** visual's superseded `window.UX.nearMe/recenter/focusSearch`
  stub functions remain (overwritten by load order — harmless; safe to delete later).
- **Reduced-motion:** discovery/wayfind read the media query at load; mapgest reads it
  live. Toggling the OS setting mid-session needs a reload for the sheet/route animations
  (most apps treat PRM as load-time — minor).
- **Dark-theme hairline dividers** are faint (`--ux-line` ≈1.68:1) — cosmetic.
- **Map count labels** in auto/dark themes are intentionally light secondary text;
  the **sunlight** theme is the AA-compliant outdoor-readability mode (labels → black).
- **Gesture feel** (momentum/pinch/double-tap) validated by code review + the simulator
  run; not hand-tested on a physical device.
- This work lives on **branch `ux-upgrades`** (not merged to `main`); the submitted V1
  App Store build is unaffected. Per-agent branches `ux-feat-*` retained for reference.

## Owner feedback round 1 — remove route, enlarge type

Two changes from on-device feedback ("the line/arrow is useless unless it navigates
around buildings into a door" and "the font throughout is extremely small and hard to use").

### 1. Removed the "Take me there" route (UX_UPGRADES item 2)
A straight GPS-dot→studio vector cuts through buildings and reads as a real path it
isn't — misleading without true pathfinding/door data we don't have. Removed **all** of
it, end to end:
- **CSS:** `.ux-route-line/.ux-route-halo/.ux-route-target`, `@keyframes uxRouteDash`,
  the `#sheet-body .ux-route-btn` button styles, and the route-only
  `prefers-reduced-motion` block. (Main `<style>` brace count 196→**188, balanced**.)
- **Markup/wiring:** the `➤ Take me there` button in the artist detail + its click
  listener.
- **JS:** `uxRouteTo`, `uxClearRoute`, `uxBearingHint`, the obsolete reduced-motion
  comment, and the now-unused `UX_WALK_M_PER_MIN` const; trimmed the `=== UX: wayfind ===`
  header comment to describe near-me only.
- **Hooks:** dropped `window.UX.routeTo` / `window.UX.clearRoute`.
- **Kept:** "Studios near me" (item 1), distance badges, `window.UX.nearMe` /
  `distanceLabel`, and `uxCentroidSvg`→`uxCentroidLatLng` (near-me depends on them).
- Verified: `grep` for `routeTo|clearRoute|uxBearingHint|UX_WALK_M_PER_MIN|ux-route|Take me there|ux-route-btn` → **0 occurrences**. This also clears the wayfind half of the
  earlier "dead code" follow-up.

### 2. Global type scale bump (outdoor legibility)
Raised font sizes across every surface (≈ +2 px, ~20–40%), keeping the minimalist look:
- **Map labels** `.bld-label.lbl-{xs,sm,md,lg,xl}` 7/8/10/12/14 → **10/11/13/15/18**;
  sunlight overrides 8/9/11/13/15 → **11/12/14/16/19**; `.bld-street` 6 → **8** (tighter
  tracking to compensate).
- **Header** `#title` 11 → **15** (small-screen 10 → **13**); **chips** 13 → **15**
  (small-screen 12 → **14**); reduced title letter-spacing 0.18→0.14em.
- **Map status** `#status` 11 → **13**. **Action-bar labels** token `--ux-fs-2xs` 10 → **12**.
- **Sheet/detail/near-list:** `.meta` 13→**15**, `.building-head` 11→**13**, `.bio`
  14→**16**, `.links a` 14→**16**, `.artist-list button` 14→**16**, `.a-meta` 12→**14**,
  `.empty` 14→**16**; near-list `button` 14→**16**, its `.a-meta` 12→**14**,
  `.ux-dist-badge` 12→**14**.
- **Unchanged:** `#search` stays **16 px** (iOS focus-zoom threshold) and `h2` stays 22.

### Validation
`node prepare.js` re-inlined (108 artists + 52 buildings, mirrored to `www/`); both inline
scripts parse clean (`new Function`), CSS **188/188 balanced**, 0 route refs. Re-rendered
the web layer into the existing iPhone 17 Pro Max sim bundle (native shell unchanged) and
re-screenshot home/building/artist/filter/near-me/sunlight in `store/screenshots/ux2/`.

## Owner feedback round 2 — new app icon + header mark

Replaced the placeholder icon (four grey blocks + a blue dot) with an original
**beer-stein logo**: a black stein silhouette on white with a **navigation arrow**
knocked out of the mug body. It nods to the historic brewery building the studios
occupy while the arrow signals the app's job (a walking map). Original/unbranded —
our own geometry, not anyone's mark.

- **Vector master:** `icons/app-icon.svg` (1024 viewBox). Also refreshed
  `icons/favicon.svg` to the same mark (the old one was the 4-block placeholder).
- **Generator rewrite:** `generate-placeholder-icons.mjs` now redraws the stein in
  **Jimp at 3× supersample** (added `fillPolygon`/`fillEllipse`; arrow knocked out
  in white) and downscales to every size — stays pure-JS (no system deps, CI-safe;
  `postinstall` is `prepare.js`, so it never auto-runs). Regenerated
  `icons/{apple-touch-icon,icon-192,icon-512,favicon-32,favicon-180}.png` +
  `ios-icon-stash/icon-1024.png`; `npm run ios:icons` copied the 1024 into the iOS
  asset catalog (`AppIcon.appiconset/AppIcon-512@2x.png`). All output is RGB, no
  alpha (App Store requirement).
- **In-app header mark:** added a 26px inline-SVG stein beside the `ArtWalk LA`
  wordmark (new `#brand` flex group). Theme-aware — the silhouette uses
  `fill: currentColor` driven by `--ux-ink` (black in light/sunlight, light in
  dark), and the arrow is a `<mask>` hole so it shows the header background in any
  theme. Verified on-device in light + dark; layout unchanged.
- **Design scratch:** alternative concepts (route-pin, "A" monogram, footsteps, and
  the stein treatments) live in the gitignored `_logo/`.
- The new icon takes effect in the **next** iOS build; the submitted V1 is untouched.

## Owner feedback round 3 — icon redesign, header mark removed

- **Removed the in-app header mark** (the `#brand` group): the header is text-only
  "ArtWalk LA" again, per owner request ("don't add the logo to the app, just the icon").
- **Redesigned the icon to look professional** while keeping the owner's spec
  (**black stein, white background, white arrow, no gradients**). Fixes vs the first
  cut: the mug now **fills the tile** (was small with wide margins), the **C-handle is
  joined to the body** (was a detached floating ring — now a smooth right-half-ellipse
  arc, stroked with round caps and tucked under the body), shapes are cleaner, and the
  composition is **optically centred** (handle's rightward weight offset left).
  `generate-placeholder-icons.mjs` gained `strokePath` + an optical-centre offset;
  `icons/app-icon.svg` + `icons/favicon.svg` updated to match. Regenerated every size +
  the iOS asset catalog. Still pure black/white, RGB no-alpha.
- Explored gradient/colour directions (amber tile, dark "real-beer", light+amber) in the
  gitignored `_logo/` but the owner chose flat black-on-white.

## Owner feedback round 4 — drop the foam

Removed the foam head. The icon is now a clean foamless **tankard** (flat top) +
navigation arrow. Reproportioned so it still fills the tile and stays centred
without the foam (taller body, handle re-centred, optical offset retuned).
`generate-placeholder-icons.mjs` + `icons/app-icon.svg` + `icons/favicon.svg`
updated; all sizes + the iOS asset catalog regenerated.

Then **centered on the ink center-of-mass** rather than the bounding box: the
heavy mug body read as left-shifted (the light handle padded the right). Measured
the black-pixel centroid and set the offset to `OX=-5, OY=-26` so the mark looks
optically centred in the tile.
