# Moonfall UI art v2

Three local WebP sheets supply 63 skill icons (27 base + 36 fusion) and 18 item/UI
icons. `skill-atlas.json` maps every actual weapon key and shop item key to a
sheet/cell. All 12 fusion weapons have their own three images, including the
three dual-element staffs. The sheets are newly generated artwork, encoded as
WebP quality 88 for game delivery; no Meshy job or credit was used.

- `moonfall-skills.webp`: existing base art, 6×5, first 27 cells used.
- `moonfall-fusion.webp`: 24 new fusion cells, 6×4.
- `moonfall-items.webp`: 12 fusion cells + 18 potion/shop/UI cells, 6×5.
  Its authored grid is 1088px high within the 1145px image; `gridHeight` records
  that actual boundary to avoid sampling the blank bottom margin.

The three files total 1,106,012 bytes, below the previous single 2.4MB PNG. Raw
new PNGs stay outside Git. The original base PNG is preserved in Git history.
The runtime caches 81 canvases at 144×144, about 6.4 MiB of RGBA pixels plus
browser-decoded sheets, encoded DOM icon URLs and graphics overhead.

Cursed Realm now requires every image before unlocking play. Image/manifest
errors are explicit boot errors; it does not use old glyphs or generic pictures
as a replacement. Retry reloads the actual files. Vanilla index.html is unchanged.

Source: `src/moonfall-ui.js`, `src/moonfall-inventory.js` and
`src/moonfall-loading.js`. Original prices, potion limits/effects, skill damage,
costs, cooldowns, aim and network payloads remain authoritative.

## Illustrated loading and ready menu

`moonfall-key-art.webp` is a separate generated celestial-knight illustration,
1672×941, encoded as WebP quality 86 (197,706 bytes). Both screens use the same
cached URL; it does not add another icon atlas or playable model. The strict boot
gate requires a successful image decode before entry. The task count includes
every model in the manifest (currently 52 tasks with 21 models). Original
generation PNG and browser screenshots remain outside Git.

## Spirit tome sheets

`moonfall-soul.webp` (6×1, three cells) holds the Spirit Tome's skills. The eighteen illustrated skill icons use the same atlas cells. `moonfall-soul2.webp` (6×3, 1374×687) holds the five forged tomes in order
`fOM`, `fOR`, `fOS_fire`, `fOS_frost`, `fOS_storm`. The three slots per tome show summons, orders and their ultimate. Every key in `AW`
requires all three cells in `skill-atlas.json` to pass the boot gate.
