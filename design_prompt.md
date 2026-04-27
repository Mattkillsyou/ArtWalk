# Brewery Art Walk — Map App Design Prompt (for Claude Code)

Build a single-page mobile-first web app (HTML/CSS/JS) that displays an interactive campus map of the Brewery Art Colony for the Brewery Art Walk event. The data files `artists.json` (108 artists) and `buildings.json` (35 buildings) are in this same folder.

## The Problem with the Current Design

The last attempt produced a map that was impossible to read — building labels overlapped, text was tiny, and the layout was a jumbled mess. This time the priorities are clarity and readability above all else.

## Hard Requirements

1. **Greyscale only.** No color. Black, white, and greys. The art is the color — the map is infrastructure.

2. **Minimal.** No decorative elements. No drop shadows. No gradients. No rounded corners on buildings. Thin clean lines. The map should feel like an architectural site plan, not a theme park brochure.

3. **Readable at every zoom level.** This is a 16-acre campus with 35 buildings. At full zoom-out, show only building outlines and address numbers (e.g. "600", "642E", "2100"). At mid-zoom, show building name + artist count badge. At full zoom-in on a building, show individual unit numbers and artist names.

4. **The map layout must match the real campus.** Use the building position data from `buildings.json`. Key spatial facts from the official printed map:
   - North Main Street runs along the top (north edge)
   - South Avenue 21 runs along the right (east edge)  
   - Moulton Avenue is an internal road running roughly north-south through the center
   - The I-5 freeway is on the far east edge
   - 2100 N. Main (Atrium) is in the northeast corner
   - 2020 N. Main is north-center
   - 1984 N. Main is northwest
   - 1918/1920 N. Main are southwest
   - 600 Moulton is the large central building
   - 642 Moulton (East & West) is a large L-shaped building south-center
   - 660/672/676 South Ave 21 are along the east side
   - 690/692/694/696 Moulton are in the southwest cluster
   - Beer Garden is between 620 Moulton and 660 S. Ave 21
   - There is a Garden south of the Beer Garden

5. **Three zoom levels with distinct content:**
   - **Campus level (default):** All buildings visible as grey rectangles with address numbers in small monospace font. Streets labeled. User can see the entire campus and orient themselves. Buildings should be sized roughly proportional to their real size (600 Moulton and 2100 N. Main are the largest).
   - **Neighborhood level (pinch zoom in):** Building names visible, artist count badges (small circle with number), units start to appear as subdivisions within the building rectangle. Category icons optional.
   - **Building level (deep zoom or tap a building):** The building fills most of the screen. Each unit is a labeled cell in a grid. Artist name shown inside or next to each unit. Tapping a unit opens the artist detail panel.

6. **Artist detail panel:** A slide-up bottom sheet. Shows: name, medium/category, unit + building address, bio (if available), and links (website, instagram) as tappable buttons. Include a small thumbnail if image data exists. Close with swipe-down or X button.

7. **Search bar** pinned to top of screen. Searches artist name, category, or building address. Results appear as a list in the bottom sheet — tapping a result zooms the map to that building and highlights the unit.

8. **Filter chips** below search bar. One chip per category from the data: Painting, Sculpture, Photography, Mixed Media, Gallery, Ceramics, etc. Tapping a chip highlights only buildings that contain artists in that category and dims the rest. Multiple chips can be active.

9. **Mobile-first.** Minimum tap target 44px. Works in bright sunlight (high contrast greyscale helps). Touch-friendly pan and zoom. No hover-dependent interactions.

## Tech Stack

- Single HTML file with inline CSS and JS
- Use Leaflet.js with a custom CRS (no tile server — we're drawing our own map, not using Google/OSM)
- Or: plain SVG/Canvas with custom pan-zoom. Whatever produces the cleanest result.
- Load `artists.json` and `buildings.json` via fetch
- No build step. No frameworks. Open the HTML file and it works.

## What NOT to Do

- Do not use color to distinguish buildings (greyscale only)
- Do not cram all artist names onto the campus-level view — that's what made the last version unreadable
- Do not use a real map tile provider — this is a custom site plan, not a street map
- Do not add features not listed above
- Do not make the buildings all the same size — size them proportionally

## File Structure

```
/Art Walk/
  artists.json    ← 108 artists with name, address, unit, category, medium, website, instagram, bio, images
  buildings.json  ← 35 buildings with address, name, units, floors, position
  index.html      ← THE APP (single file, all CSS/JS inline)
```

## Data Schema

**artists.json** — each entry:
```json
{
  "name": "Bruce Dean",
  "address": "600 Moulton Avenue",
  "unit": "203",
  "category": "Painting",
  "medium": "Paintings, Drawings, Prints",
  "website": "http://www.brucedeanart.com/",
  "instagram": "https://www.instagram.com/fbrucedean/",
  "other_links": [],
  "bio": "After receiving his MFA from Otis...",
  "profile_url": "https://breweryartwalk.com/portfolio/bruce-dean",
  "images": ["https://breweryartwalk.com/wp-content/uploads/..."]
}
```

**buildings.json** — each entry:
```json
{
  "address": "600 Moulton Avenue",
  "name": "600 Moulton",
  "units": "101-500",
  "floors": 2,
  "position": "center of campus, large building",
  "notes": "One of the largest buildings, central location"
}
```
