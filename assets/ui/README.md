# Moonfall UI art — round 1

`moonfall-skills.png` is newly generated artwork for the requested Arena Royale
UI pass. It is a 1374×1145 sheet with six columns and five rows, 229px per cell.
`skill-atlas.json` maps the 27 base skills to the first 27 cells in the exact
existing `SK` order, with Thai names verified against game data. The final three
cells (attack/health/mana) are reserved artwork, not connected to gameplay yet.

The runtime extracts and caches 192px canvases once, retaining original cooldown,
level, mana and aim overlays. Missing/corrupt images and all fusion skills retain
the existing GI glyph renderer and its credits. Artwork is displayed within the
original circular hit areas; no input event or skill balance is replaced.

The PNG is about 2.4 MB. Runtime cached icons total roughly 4 MiB RGBA plus the
browser's decoded sheet (about 6 MiB) and caches. This is an estimate, not a VRAM measurement.
No Meshy requests or credits are involved in this UI pass.

Review all skills and example states in `moonfall-ui-preview.html`.
