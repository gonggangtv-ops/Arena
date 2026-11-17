# Moonfall illustrated loading and ready menu

The Cursed Realm now shares one illustrated silver/gold celestial knight backdrop
between boot, match preparation, and the ready menu. The original Arena Royale
`index.html` remains byte-identical to `main`.

## Runtime files

- `src/moonfall-loading.html` / `.css`: full-screen key art, moon crest, readable
  progress/error panel, compact landscape and bottom-aligned portrait composition.
- `src/moonfall-loading.js`: adds one required decoded illustration to the existing
  strict boot gate (48 tasks). No entry until all original resources and this image
  load successfully. Broken art keeps the existing error/reload flow locked.
- `src/moonfall-menu.js` / `.css`: cinematic ready menu with the original Solo,
  matchmaking, rooms, appearance, settings and help controls. Controls retain their
  original IDs and handlers. The primary play action remains above the fold.
- `app/src/main/assets/assets/ui/moonfall-key-art.webp`: generated runtime key art,
  1672 × 941 pixels, 197,706 bytes. The original PNG stays outside Git. This is a
  menu illustration, not a claim about a new playable model or rig.
- Deployment modules and `cursed.html` are copied/rebuilt from `src/`; the web
  artifact is regenerated. The existing workflow already copies the UI asset tree.

No balance, skill, inventory, damage, AI, world generation, collision or multiplayer
transport changes. No Meshy jobs or credits were used.

## Verification

Run from the repository root:

```sh
node --check src/moonfall-loading.js
node --check src/moonfall-menu.js
python3 src/build.py
python3 src/build.py cursed
python3 src/build.py cursed web
python3 src/tests/smoke-cinematic-ui.py
python3 src/tests/smoke-ui-ux.py
```

The focused suite serves real deployment assets over HTTP, holds the new image
while all models/rigs/audio/atlases finish, checks entry remains locked, then
releases the actual WebP and checks successful admission. Corrupt-image recovery
uses a real reload. Layout checks cover desktop 1100 × 700, mobile landscape
844 × 390, portrait 390 × 844, and reduced motion. Screenshots stay under `/tmp`;
structured results are in `reports/cinematic-ui/`.
The suite also exercises saved player names, mouse/touch cloak selection and ARIA
state, native keyboard details, the retained settings handlers, camera toggling,
and all nine weapon cards with 27 original skill images.

The existing suite verifies real model/rig boot, item and fusion art, native
keyboard/touch potion and skill input, shop prices, queued client snapshots,
resource failures and vanilla separation.

## Remaining verification

Physical PC/mobile, Android WebView and live two-device PeerJS checks remain for
hardware review. Chromium software rendering and viewport/touch emulation do not
establish device FPS, VRAM or live networking performance.
