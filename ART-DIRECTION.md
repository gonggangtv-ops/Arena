# Arena Royale Reborn — Moonfall

The active art layer is **Dark Celestial Fantasy**, shared by `index.html` and
`cursed.html`. The original seeded map, combat, collision, AI, multiplayer
protocol and compatibility 2D view remain authoritative.

Run `python3 -m http.server 8010` here and choose **☽ สำรวจ Moonfall** to enter
a solo match near the remodeled castle. Ordinary Solo and online games retain
their spawn rules. Mobile uses the original landscape flow.

Active files: `celestial-render.js`, `celestial-assets.js`, `moonfall-environment.js`, `moonfall-collision-data.js`, `moonfall-biome.js`, `celestial-theme.css`.
The former `anime-*` files are preserved but no longer installed. Their old smoke
suite targets the previous style; use `python3 scripts/smoke-celestial.py` now.

**All 13 original Meshy GLBs are included and decoded successfully.** Twelve
scenery types form the arena. The actual Celestial Warrior is static (no skin,
bones or clips), so gameplay retains the original animated hero. See
[asset calibration and limits](assets/meshy/README.md). No API credentials or
paid generation are used by the game.

See [the current Phase 1/2 report](PHASE12-REPORT.md) for architecture, changed files,
validation evidence, limitations and follow-up work.

The **Moonfall Nature Upgrade** adds the four existing textured Meshy tree/rock
exports, dark soil/fractured basalt/moondust terrain blending, and cooler forest
lighting. A Nature selector in the status panel restores the previous visuals
without changing world data. Temple/dungeon floors and hiding vegetation remain
intact. See [the Nature report](MOONFALL-BIOME-REPORT.md) for current validation.
