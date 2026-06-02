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
