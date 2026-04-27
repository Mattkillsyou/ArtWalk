# ArtWalk

iOS app for the [Brewery Art Walk](https://breweryartwalk.com/) — interactive campus map of the LA Brewery Art Colony, featuring 108 artists across 35 buildings.

## Status

V1 in development. Branding intentionally deferred to V2.

## V1 scope

- Mobile-first single-page web app (HTML/CSS/JS, no framework, all inline).
- Interactive SVG site plan with three zoom levels (campus / neighborhood / building).
- Search and category filters.
- Artist detail panels.
- Wrapped as a native iOS app via [Capacitor](https://capacitorjs.com/).
- Three native features that justify App Store inclusion:
  - GPS "you are here" pin (`@capacitor/geolocation`).
  - Offline mode (bundled JSON + cached imagery via service worker).
  - Persistent favorites (`@capacitor/preferences`).

## V2 (deferred)

- Branding: logo, colors, custom app icon, splash screen.
- Push notifications for event days.
- Apple Calendar integration ("add open studio to calendar").
- AR overlay at the venue.
- Share sheet for artists / buildings.
- Remote content management (so artist roster updates don't require app resubmissions).

## Repo layout

```
artists.json        108 artists: name, address, unit, category, medium, website, instagram, bio, images
buildings.json      35 buildings: address, name, units, floors, position, notes
build_prompt.md     V1 web-app build spec
design_prompt.md    V1 visual / UX requirements
Map.jpg             Reference: official printed campus map
image00001.jpeg     Reference: alternate map photo
IMG_1075 copy.png   Reference: campus photo
IMG_1077 copy.png   Reference: campus photo
```

## Run

### Web preview (any OS)

`index.html` is self-contained — open it directly in any browser. The 108 artists and 35 buildings are inlined into the HTML by `prepare.js`.

If you edit `artists.json` or `buildings.json`:
```bash
node prepare.js     # re-inlines into index.html and www/
```

### iOS native (Mac required)

See **[MAC_SETUP.md](MAC_SETUP.md)** for the full step-by-step. Short version:

```bash
git clone https://github.com/Mattkillsyou/ArtWalk.git
cd ArtWalk
npm install            # installs Capacitor, runs prepare.js via postinstall
npx cap add ios        # one-time
npm run ios:open       # build + sync + open in Xcode
```

## Build phases

1. Web app foundation (`index.html` per `build_prompt.md`).
2. Capacitor wrap, iOS project, placeholder icon/splash, real-device run.
3. Native features: GPS, offline, favorites.
4. Privacy policy, App Store Connect listing, screenshots, TestFlight.
5. App Store submission.

## License

TBD — to be decided with the Brewery Art Walk org.
