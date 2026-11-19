# Vice Frame — GTA-style Cover Maker

A web app that turns a person's photo and a caption into cover art in the
style of GTA 6's posters: multi-panel layouts, bold lettering, and a Vice City
sunset or neon colour grade — exported as a PNG to share. Made for the
make.fun bounty **gta6-cover-art-01**.

## Try it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Everything runs offline
from the app's own static files, and photos never leave your machine.

## How to make a cover

1. Add photos — upload your own, or use the two free sample photos (Pier,
   Boulevard).
2. Pick a layout: Hero + 2, Grid 2×2, Strip ×3, or Single.
3. Pick a colour grade: Vice Sunset, Neon Nights, Palm Gold, or Noir.
4. Tap a photo to put it in the selected panel, then use Zoom and the
   move sliders to crop and position it.
5. Edit the title and subtitle.
6. Pick an export size — Square 1080 × 1080, Portrait 1080 × 1350, or Wide
   1920 × 1080 — and press **Export PNG**.

## What is in this repository

- `main.ts` — hands the app in: copies `app/` and `screenshots/` to the
  output and writes `dossier.json` with the vendored make.fun library.
- `app/` — the web app as plain static files (`index.html`, `style.css`,
  `src/cover.js` the cover renderer, `src/main.js` the wiring,
  `src/shots.js` the fixed scenes for screenshots, `samples/` the two
  free sample photos).
- `screenshots/` — 3–4 screenshots of the app (see below).
- `shots.json` — the scenes the screenshots come from.
- `serve.ts` — a tiny static server for trying the app locally.
- `vendor/makefun-app.ts` — the kit's vendored make.fun library, unchanged.

## Screenshots — IMPORTANT, READ BEFORE SUBMITTING

The screenshots in `screenshots/` were rendered by a Python script
(`tools/render-shots.py`, kept out of the entry) that re-implements the
cover layouts with the same sample photos, titles and grades — because no
working browser was available in this build environment:

- the local Chromium (`/opt/meta-chromium/chrome`) refuses to start:
  "Hatch WebGL domain policy is required for browser startup";
- `pip install playwright` worked, but `playwright install chromium`
  failed to download Chrome for Testing, and the install step's approval
  timed out, so it must not be retried without a fresh approval.

**Before submitting, replace all four files in `screenshots/` with real
screenshots taken in a desktop browser** — open the app with
`node serve.ts`, load each scene in `shots.json`
(`http://localhost:8080/<query>` at the listed width × height), wait for
`window.__shotReady`, and capture the page. The first file by name must be
a cover the app exported, and at least one must show the editor with a
photo loaded. Keep each file at most 256 KiB, long side at most 1280 px,
short side at least 480 px. Do not submit with the script-rendered shots.

## Artwork note

All artwork and lettering in this app is drawn by its own code (canvas
shapes and the browser's system sans-serif). No Rockstar Games logo,
official artwork or font is used. The two sample photos were made for
make.fun with an image model and are free to use.

## License

MIT — see `LICENSE` (SPDX-License-Identifier: MIT).
