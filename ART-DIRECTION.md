# Arena Royale Reborn — Moonfall

The active art layer is **Dark Celestial Fantasy**, shared by `index.html` and
`cursed.html`. The original seeded map, combat, collision, AI, multiplayer
protocol and compatibility 2D view remain authoritative.

Run `python3 -m http.server 8010` here and choose **☽ สำรวจ Moonfall** to enter
a solo match near the remodeled castle. Ordinary Solo and online games retain
their spawn rules. Mobile uses the original landscape flow.

Active files: `celestial-render.js`, `celestial-assets.js`, `celestial-theme.css`.
The former `anime-*` files are preserved but no longer installed. Their old smoke
suite targets the previous style; use `python3 scripts/smoke-celestial.py` now.

**None of the five Meshy GLBs is included yet.** The arena uses procedural
fallback architecture. See [import instructions](assets/meshy/README.md) for
filenames, task IDs, budgets and rig requirements. Real GLBs replace visual
proxies only after successful admission. Never store API keys here.

See [the Phase 1 report](PHASE1-REPORT.md) for architecture, changed files,
validation evidence, limitations and follow-up work.
