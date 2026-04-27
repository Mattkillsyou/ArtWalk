# PROMPT: Build the Brewery Art Walk Map App

Read `artists.json` and `buildings.json` in this folder. Build `index.html` — a single-file mobile-first web app (all CSS/JS inline) that displays an interactive campus map.

## Data

`artists.json` has 108 artists. Every artist has these fields:
- `name` (string)
- `address` (string — matches a building address in buildings.json)
- `unit` (string or null)
- `category` (string — one of exactly these 11 values: "Painting", "Mixed Media", "Fashion & Jewelry", "Gallery", "Installation", "Artisan", "Photography", "Ceramics", "Illustration", "Sculpture", "Video & Digital")
- `medium` (string — short description of their work)
- `website` (URL string or null)
- `instagram` (URL string or null)
- `bio` (string or null)
- `images` (array of URL strings)

`buildings.json` has 35 buildings. Each has `address`, `name`, `units`, `floors`, `position`.

**The `category` field is the source of truth for filtering.** The filter chips in the UI must use the exact category strings from the data. Do NOT hardcode category names — read them dynamically from the data.

## Layout Rules

This is a custom SVG site plan, NOT a Google/OSM map. No tile server. Draw building rectangles manually.

**Campus layout (north is up):**

Row 1 (top, along North Main Street, left to right):
- 1910 (far left)
- 1984 (left-center, large)
- 2020 (center, large)  
- 2100 (right, largest building, "Atrium")

Row 2 (upper-middle):
- 1960, 1950, 1940, 1930 (small buildings, left cluster)
- 604, 606, 608, 610 (small buildings, center-north)
- 612 (medium, right of 610)

Row 3 (center):
- 1920 (left)
- 600 (CENTER, large — biggest Moulton building)
- 620 (right of 600)
- 622, 624, 626 (small cluster, far right)

Row 4 (lower-middle):
- 1918 (left)
- 618 (below 600)
- 630, 632, 634, 638 (center row)
- 642 East & West (large L-shape, center-south)
- 645 (right)
- 660 S. Ave 21 (right side)

Row 5 (bottom):
- 696, 694, 692, 690 (left cluster)
- 670 (center)
- 672 (center-right)
- 650 S. Ave 21 (right)
- 674, 676, 678 (far right)

Streets:
- "NORTH MAIN STREET" label across top
- "SOUTH AVENUE 21" label down right side
- "MOULTON AVE" label running vertically through center

Landmarks (draw as labeled dotted rectangles):
- Beer Garden (between 620 and 660)
- Garden (south of Beer Garden)
- I-5 Gallery (far right, on South Ave 21)
- UPS Parking (far left)

## Visual Style

**GREYSCALE ONLY.** No color anywhere.
- Buildings: white fill, 1px black stroke
- Building labels: black monospace text, small
- Streets: light grey (#eee) background strips with grey text labels
- Selected/highlighted building: dark grey fill (#333) with white text
- Filter chips: black border, white fill. Active: black fill, white text
- Bottom sheet: white background, black text
- Overall: clean, minimal, architectural drawing feel

## Zoom Behavior

Use SVG with viewBox manipulation for pan/zoom (or a lightweight library like svg-pan-zoom). Three levels:

**Level 1 — Campus (default, fits all buildings):**
- Show building outlines with short address label ONLY (e.g. "600", "2020", "2100")
- No artist names visible
- Artist count per building shown as small number in corner of building rect

**Level 2 — Neighborhood (2-3x zoom):**
- Building name visible
- Category dots or artist count badge
- Unit subdivisions start appearing inside larger buildings

**Level 3 — Building (5x+ zoom or tap-to-zoom):**
- Single building fills screen
- Each unit is a cell with unit number and artist name
- Tapping a unit opens the artist detail panel

## Filter Chips

- Render one chip per unique `category` value found in `artists.json` (read dynamically, do NOT hardcode)
- Plus an "All" chip that is active by default
- When a category chip is tapped: highlight buildings that contain artists in that category, dim all others (set opacity to 0.2). Update the artist count badges to show filtered count.
- Multiple chips can be active simultaneously
- Show the filtered artist count somewhere (e.g. "Showing 25 of 108 artists")

## Search

- Text input pinned to top
- Searches `name`, `medium`, and `address` fields
- As user types, show matching artists in the bottom sheet list
- Tapping a result zooms the map to that building and opens the artist detail

## Artist Detail (bottom sheet)

Slide-up panel, max 60% of screen height, with:
- Artist name (large, bold)
- Category + medium (smaller, grey)
- Building address + unit number
- Bio text (if available, scrollable)
- Link buttons: "Website" and "Instagram" (only show if data exists, open in new tab)
- Thumbnail image (if `images` array is non-empty, show first image)
- Close button (X) in top-right corner

## Do NOT

- Use color
- Use a tile-based map provider
- Hardcode category filter values
- Show all artist names at the campus zoom level
- Add features not listed here
- Use localStorage
- Require a build step or framework
