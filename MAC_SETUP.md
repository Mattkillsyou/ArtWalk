# Mac Setup — Phase 2 (Capacitor + iOS)

Run these on the Mac, in order. Each step has expected output; if something fails, paste the error and we'll fix it.

---

## 1. Verify prerequisites

Open Terminal and run:

```bash
node --version
npm --version
git --version
xcodebuild -version
pod --version
```

**Expected:**
- `node` ≥ v18 (v20 LTS preferred)
- `npm` ≥ v9
- `git` any recent version
- Xcode 15+ (`Xcode 15.x ... Build version ...`)
- CocoaPods ≥ 1.14

### If anything is missing

```bash
# Install Homebrew if you don't have it:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then:
brew install node git
sudo gem install cocoapods       # CocoaPods (Capacitor needs it for iOS)

# Xcode: install from the Mac App Store, then run once and accept the license:
sudo xcodebuild -license accept
xcode-select --install           # command-line tools
```

---

## 2. Clone the repo

```bash
cd ~/Documents
git clone https://github.com/Mattkillsyou/ArtWalk.git
cd ArtWalk
```

You should see: `index.html`, `artists.json`, `buildings.json`, `package.json`, `capacitor.config.json`, `prepare.js`, `MAC_SETUP.md`, etc.

---

## 3. Install dependencies

```bash
npm install
```

This installs Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`) and automatically runs `node prepare.js` via the `postinstall` script — that inlines the JSON data and creates the `www/` folder Capacitor needs.

**Expected output ends with something like:**
```
> postinstall
> node prepare.js

Inlined 108 artists + 35 buildings.
index.html: 33,087 → 142,331 bytes
Wrote: index.html, www/index.html
```

**Verify:**
```bash
ls www/                    # should show index.html
```

---

## 4. Add the iOS platform

```bash
npx cap add ios
```

This creates an `ios/` directory containing the Xcode project. CocoaPods will run automatically and install native dependencies.

**Expected:**
```
✔ Adding native xcode project in: ios in ...
✔ add in ...
✔ Copying web assets from www to ios/App/App/public in ...
✔ Creating capacitor.config.json in ios/App/App in ...
...
✔ Updating iOS native dependencies with pod install in ...
```

**Verify:**
```bash
ls ios/App/                # should show App.xcodeproj, App.xcworkspace, App, Podfile, ...
```

---

## 5. Sync (any time you change web code or capacitor.config)

```bash
npm run ios:sync
```

Equivalent to: `node prepare.js && npx cap sync ios`. Run this whenever you edit `index.html`, `artists.json`, `buildings.json`, or any `capacitor.config` setting.

---

## 6. Open in Xcode

```bash
npm run ios:open
```

This builds + syncs + opens `ios/App/App.xcworkspace` in Xcode.

**Important:** always open the **`.xcworkspace`** file, never the `.xcodeproj`. The workspace pulls in CocoaPods.

---

## 7. Run on the iOS Simulator

In Xcode:

1. Top toolbar: pick a simulator (e.g. **iPhone 15 Pro**) from the device dropdown.
2. Press **▶ (Play)** or `Cmd+R`.
3. The simulator boots, the app installs, and you should see the campus map.

If the build fails with code-signing errors on the simulator, that's unusual — paste the error.

---

## 8. (Later) Run on your physical iPhone

1. Plug iPhone into the Mac via USB.
2. In Xcode, select your iPhone from the device dropdown.
3. Open **Project navigator → App → Signing & Capabilities**:
   - **Team**: pick your personal team (the Apple ID associated with your Apple Developer account).
   - **Bundle Identifier**: set it to `com.lincolnheights.studiomap` (must be unique on the App Store; match `capacitor.config.json`).
4. On the iPhone: Settings → General → VPN & Device Management → trust your developer certificate the first time.
5. Press **▶** in Xcode.

---

## 9. Commit anything new

After Phase 2 completes, the `ios/` folder will be in the working tree. Commit it:

```bash
git add ios/ package.json package-lock.json capacitor.config.json
git status                  # review what's staged
git commit -m "Phase 2: Capacitor iOS platform"
git push
```

`node_modules/`, `www/`, and `ios/App/Pods/` are gitignored — don't worry about those.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `pod: command not found` | `sudo gem install cocoapods` |
| `xcrun: error: invalid active developer path` | `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer` |
| `npx cap add ios` complains about `webDir` | Run `node prepare.js` manually to confirm `www/index.html` exists |
| White screen in simulator | Check Xcode's debug console for errors; usually a path issue in `index.html`. Run `npm run ios:sync` and rebuild. |
| App icon is blank | Expected for V1 — V2 adds branded icons |

---

## What's next after Phase 2

Once you have the app running on the simulator (and ideally your phone), reply here and we'll start **Phase 3**: GPS "you are here" pin, offline support, and favorites.
