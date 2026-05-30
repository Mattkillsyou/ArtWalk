# ArtWalk LA

An **independent, unofficial** iOS app: an interactive map of artist studios in
the Lincoln Heights arts district of Los Angeles — 108 artists across the campus,
wrapped as a native iOS app via [Capacitor](https://capacitorjs.com/).

> Not affiliated with, endorsed by, sponsored by, or authorized by the Brewery Art
> Walk, the Brewery Arts Complex, or any artist listed. All studio and artist
> information is drawn from publicly available sources (names, public studio
> addresses, medium/category, and public website / Instagram links). The app ships
> no third-party photos or copied bios, and the campus map is our own original
> schematic drawn from public address/position facts.

## Scope

- Mobile-first single-page web app (HTML/CSS/JS, no framework, all inline).
- Interactive SVG site plan with pan/zoom.
- Search and category filters; favorites.
- Three native features that justify App Store inclusion:
  - GPS "you are here" pin (`@capacitor/geolocation`).
  - Offline mode (bundled JSON + service worker).
  - Persistent favorites (`@capacitor/preferences`).

## Repo layout

```
artists.json        108 artists: name, address, unit, category, medium, website, instagram (facts only)
buildings.json      buildings: address, name, units, floors, position, notes (facts)
index.html          the entire app; POSITIONS + renderMap() are the hand-built SVG map
prepare.js          inlines artists.json + buildings.json into index.html and mirrors to www/
```

## Run

### Web preview (any OS)

`index.html` is self-contained — open it directly in any browser. The artists and
buildings are inlined into the HTML by `prepare.js`.

If you edit `artists.json` or `buildings.json`:
```bash
node prepare.js     # re-inlines into index.html and www/
```

### iOS native (Mac required)

See **[MAC_SETUP.md](MAC_SETUP.md)** for the full step-by-step. Short version:

```bash
npm install            # installs Capacitor, runs prepare.js via postinstall
npx cap add ios        # one-time (regenerates the native project)
npm run ios:open       # build + sync + open in Xcode
```

## License

App code © its author. Studio/artist directory data are public factual information
and are not claimed as original creative work. No third-party copyrighted images or
text are included.
