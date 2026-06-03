# Scrub copyrighted assets from git history (HUMAN-ONLY)

**Why:** the working tree and shipped app are facts-only and clean, but the
**public** repo's *history* still contains the org's official map + 197 scraped
artist photos (they were deleted from the working tree, but a delete does not
rewrite history). Anyone can still `git log`/`git show` them on
`github.com/Mattkillsyou/ArtWalk`.

This requires a **history rewrite + force-push** and/or a **repo-visibility
change** — both are operations the assistant will not run unattended (force-push
is destructive and irreversible; visibility is an access-control change). Pick one
path below and run it yourself.

## Blobs to purge (verified present in history)
`Map.jpg`, `map_greyscale.jpg`, `bw map.jpg`, `template.svg`, `template-shapes.json`,
`image00001.jpeg`, `IMG_1075 copy.png`, `IMG_1077 copy.png`, `ocr.json`,
everything under `img/artists/` (197 photos), and any `wetransfer_*.zip`.

Confirm what's there first:
```bash
git rev-list --objects --all \
  | grep -iE 'Map\.jpg|map_greyscale|bw map|template\.svg|template-shapes|image00001|IMG_.*copy|ocr\.json|img/artists/|wetransfer_' \
  | sort -u
```

---

## Option A — Rewrite history (keeps the repo + its URL/stars/issues)

Use [`git-filter-repo`](https://github.com/newren/git-filter-repo)
(`brew install git-filter-repo` or `pip3 install git-filter-repo`). **Do this on a
fresh clone**, and tell any collaborators they must re-clone afterward.

```bash
# 1. Fresh mirror-ish clone
cd /tmp && rm -rf ArtWalk-scrub && git clone https://github.com/Mattkillsyou/ArtWalk.git ArtWalk-scrub && cd ArtWalk-scrub

# 2. Strip the blobs from ALL history
git filter-repo --force --invert-paths \
  --path 'Map.jpg' \
  --path 'map_greyscale.jpg' \
  --path 'bw map.jpg' \
  --path 'template.svg' \
  --path 'template-shapes.json' \
  --path 'image00001.jpeg' \
  --path 'ocr.json' \
  --path-glob 'IMG_*.png' \
  --path-glob 'img/artists/*' \
  --path-glob 'wetransfer_*.zip'

# 3. Verify they're gone
git rev-list --objects --all | grep -iE 'Map\.jpg|img/artists/|template\.svg|image00001|ocr\.json' || echo "CLEAN"

# 4. Force-push the rewritten history (filter-repo removes the remote; re-add it)
git remote add origin https://github.com/Mattkillsyou/ArtWalk.git
git push origin --force --all
git push origin --force --tags
```
**Caveats:** all commit SHAs change. Existing **forks** and GitHub's cached
views/PRs may still hold the old blobs — for a hard guarantee, also contact GitHub
Support to purge cached views, or use Option B/C.

## Option B — Keep the repo private (fastest risk reduction)
On github.com → repo **Settings → General → Danger Zone → Change visibility →
Private** (or `gh repo edit Mattkillsyou/ArtWalk --visibility private`). The app
still ships from the local working tree; the public exposure is removed instantly.
You can scrub later (Option A) before going public again.

## Option C — Nuke & recreate from a clean snapshot
If history isn't precious: copy the current working tree into a brand-new repo with
a single squashed commit, and delete the old repo.
```bash
cd "/Users/mbrown/Desktop/Art Walk"
rm -rf .git && git init && git add -A && git commit -m "ArtWalk LA — clean snapshot (facts-only)"
# create a new empty GitHub repo, then:
git remote add origin <new-repo-url> && git branch -M main && git push -u origin main
```

---

After whichever path: re-run the verification grep to confirm `CLEAN`, and the
gitignored `_archive/` on disk keeps the originals out of the tree going forward.
