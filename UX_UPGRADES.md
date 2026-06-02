# UX/UI upgrade backlog — ArtWalk LA

Context for every idea below: this is a minimalist black-and-white **map app used outdoors, on foot, often offline**, with **no third-party photos** (we ship category-colored initial tiles). It's Capacitor, so native plugins are available (geolocation + preferences already in; haptics, share, browser, app-launcher, status-bar, screen-brightness are easy adds). Priorities: **P0** = highest impact / does the most for the core "help me walk this campus" job, **P1** = strong, **P2** = nice-to-have.

---

## A. Wayfinding — the killer feature set for a walking app

1. **(P0) "Studios near me" sorted by distance.** Use the GPS dot to rank the directory by proximity with live distance badges ("120 ft", "0.2 mi"). This is the single most useful thing an on-site visitor wants. *How: haversine from current lat/lng to each studio's position; a "Near me" sort/filter on the list.*
2. **(P0) "Take me there" path on the map.** From the user's dot to a selected studio, draw a line/route on the schematic with distance + walking ETA. Even a straight-line + "head NE ~2 min" beats nothing on a confusing campus. *How: project both points into SVG space, draw a path, compute distance/ETA at ~3 mph.*
3. **(P1) Build-a-route / itinerary.** Let users queue studios (from favorites or taps) into an ordered walking route, auto-order by nearest-neighbor, and check them off as visited. *How: reuse favorites store; add an ordered list + simple greedy ordering.*
4. **(P1) Heading-aware "you are here."** Show the GPS dot with a facing cone using device orientation, so people can orient themselves. *How: `deviceorientation` / Capacitor Motion; rotate a cone under the dot.*
5. **(P1) Visited state + progress.** Mark studios visited (separate from favorites) with a "23 / 108 visited" progress indicator. Drives the "complete the walk" loop. *How: a second persisted set; checkmark on cards + a progress chip.*

## B. Map legibility & interaction

6. **(P0) Solid gesture model.** Confirm/implement pinch-zoom, double-tap-to-zoom-at-point, momentum pan, and a one-tap "recenter to campus." Map gestures are the whole app; they must feel native. *How: pointer events + inertia; verify against current `setView`.*
7. **(P0) Label decluttering by zoom.** At campus zoom, collapse overlapping building labels (the app already toggles `bld-name` by level — extend to collision-aware hiding and show unit counts per building). *How: simple overlap test; show "642 · 9 studios".*
8. **(P1) Color-code buildings.** Tint buildings/markers by dominant medium, or flag those containing favorites/visited, with a small legend. Gives the map information density it currently lacks. *How: aggregate categories per building; fill rects accordingly.*
9. **(P1) Selected-building framing.** On select, smoothly animate the viewBox to frame the building and dim the rest, instead of a hard highlight. *How: animate `setView`; add a dim overlay.*

## C. Discovery & content (lean in now that there are no photos)

10. **(P0) Make the tiles feel intentional.** Treat the category-color + initials tile as a deliberate design system (consistent palette, type, maybe a medium glyph) so "no photos" reads as a clean choice, not a gap. *How: refine `CAT_COLORS`, add per-category icons.*
11. **(P0) Filter upgrades.** Multi-select categories, "Favorites only," "Near me," and search-as-you-type with fuzzy matching + match highlighting. The current single chip + plain search is limiting. *How: extend `chips` to multi-select; debounce search; fuzzy lib or simple scoring.*
12. **(P1) A–Z artist index.** A browse-by-name list view as an alternative to the map, with sticky letter headers. Some users browse by artist, not location. *How: sorted list + jump bar.*
13. **(P1) Richer building detail.** Tapping a building shows all its studios grouped by floor, plus building facts (name, # units). *How: group `artists` by building + floor.*
14. **(P1) Link out to artists' own pages instead of bundling media.** Surface each artist's public Instagram/website prominently (open in in-app browser) — adds richness and stays legal. *How: Capacitor Browser; emphasize existing `links`.*
15. **(P2) "Surprise me."** Random studio / "discover" button for browsing.

## D. Outdoor & accessibility usability (this app lives in daylight)

16. **(P0) High-contrast "sunlight" mode + dark mode.** Outdoor daylight readability is critical; offer a max-contrast theme and a dark theme, plus optional auto screen-brightness boost. *How: CSS theme tokens; Capacitor screen-brightness.*
17. **(P0) Bigger tap targets / one-handed reach.** 28px header buttons are small for thumbs outdoors. Move primary actions (find-me, near-me, search) to a reachable bottom bar with ≥44px targets. *How: relocate controls; bump sizing.*
18. **(P1) Full accessibility pass.** VoiceOver labels on the SVG and controls, Dynamic Type support, AA contrast, logical focus order, `prefers-reduced-motion`. *How: ARIA roles on map nodes; relative font units; motion guard.*
19. **(P1) Offline clarity.** A visible "Available offline ✓" indicator and cache status in About, so users trust it works with no signal. *How: surface service-worker state.*

## E. Polish, retention & micro-UX

20. **(P0) Bottom-sheet snap points.** Peek / half / full snap positions, drag handle, swipe-to-dismiss, internal scroll. The sheet is the main content surface — it should feel like a native sheet. *How: snap thresholds on the existing `#sheet`.*
21. **(P1) Haptics + state persistence.** Light haptic on select/favorite; persist last view, filter, and selection and restore on reopen. *How: Capacitor Haptics; save VIEW + filters to Preferences.*
22. **(P1) First-run onboarding.** A 3-card intro: the map, find-me, favorites/offline. *How: one-time modal gated on a Preferences flag.*
23. **(P1) Share sheet + deep links.** Share a studio or a route; open the app to that studio. *How: Capacitor Share + URL scheme.*
24. **(P2) Private notes per studio** and consistent empty/loading/skeleton states.
25. **(P2) Settings panel:** theme, distance units (ft/mi/m), reset favorites/visited.

## F. Identity / visual system (also de-risks Apple 5.2)

26. **(P1) Cohesive original design system.** Since you can't borrow the org's brand, invest in your own: a type scale, spacing system, motion language, and a simple neutral logomark. A distinctly *yours* look both improves UX and reinforces that this is an independent app. *How: tokenize type/space/color; design a mark for icon + header.*

---

## Recommended first slice (an "MVP of improvements")

If implementing in one pass, do these eight — they deliver the most for the core job and the outdoor/no-photo reality:

**1 (near me) · 2 (take me there) · 6 (gestures) · 11 (filters) · 16 (sunlight/dark mode) · 17 (bigger targets / bottom bar) · 20 (sheet snap points) · 10 (intentional tiles).**

Everything here must keep the app **offline-first, facts-only, and unbranded**, and run `node prepare.js` after any `index.html` / data edits.
