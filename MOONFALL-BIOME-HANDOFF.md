# Moonfall biome replacement — ground, trees, rocks

This handoff is for Codex on `gonggangtv-ops/Arena`. It is a new **biome visuals pass** after Phase 1/2, not a gameplay rewrite.

## Meshy 3D models (textured task IDs)

| Asset | Expected local GLB file | Meshy refined task ID |
| --- | --- | --- |
| Gnarled leafless moon tree | `assets/meshy/moon-dead-tree.glb` | `01a1e5de-ff15-723e-8432-05aa2913190b` |
| Silver-leaf moon tree | `assets/meshy/moon-silver-tree.glb` | `01a1e5df-10c3-7669-a8ad-db3b59a3e26a` |
| Rough dark basalt boulder | `assets/meshy/moon-boulder.glb` | `01a1e5df-21c4-76b4-98f0-2115d5c09dad` |
| Moonstone rock cluster | `assets/meshy/moon-rock-cluster.glb` | `01a1e5df-5a17-76bf-bdc1-778215cc0611` |

Task IDs are for textured Meshy exports, not the geometry preview. Download ordinary uncompressed GLB (embedded PBR textures) and verify files exist before changing availability flags. Do not treat the IDs themselves as downloadable files. Download as instructed by Meshy tool. Respect existing `scripts/import-meshy.py` manifest / validation requirements.

## Ground redesign (do not use tiled GLB for all terrain)

- Replace current main outdoor terrain material/texture treatment with rough dark-brown lunar soil, fragmented charcoal basalt, and small patches of cool silver moon-dust.
- Provide 2–3 tileable ground patterns (soil, cracked stone, sparse moon grass or moon-dust) via existing `P.genTex` and terrain splat/world geometry path rather than thousands of physical tiles.
- Avoid almost-black monochrome or over-bright glows: preserve navigational contrast and player/enemy silhouettes.
- Blend material types by paths/cliffs/courtyard using existing world terrain masks; retain exact existing terrain heights and collision SDF.
- Keep dungeon/fortress marble/stone floors from Phase 1/2 where they are already authored; the natural outdoor floor is what changes.
- No change to rules for `WD.walls`, `WD.solids`, circles/storm or pathfinding.

## Trees and rocks

- The currently committed `celestial-render.js` overrides `P.buildVegetation` and tints `this.treeMats` after invoking the base; inspect the actual rendering tree instancing/geometry path. Replace exterior generated vegetation appearance, not existing logic that controls spawn/world data.
- Add 2 visually distinct moon trees and 2 rocks as opt-in GLB visuals with variation in rotation, scale, and repeat placement. Use instancing where geometry/material support it; otherwise cache/prototype/clone while maintaining sane draw calls.
- Preserve existing collision from world data; new large boulders blocking a route require authored, tested collision/nav. Decoration should never make impassable invisible areas.
- No extra game logic for rocks/trees. Place trees away from central combat sightlines.
- Auto/Low should use lower instance density/distance with no expensive translucency; PC High can use full detail. If textures or assets exceed budgets, optimize them before production.
- Graceful fallback until files actually exist. If a model has no GLB or fails budget/decoder, show missing/error in Performance UI rather than claiming it loaded.

## Implementation and tests

1. Open current `gh-pages` code and confirm the latest file versions; integrate this document on a feature branch. Do not blindly overwrite existing Phase 2 work.
2. Fetch real four GLBs using Meshy or provide exact missing-file tasks; no credits for new generation.
3. Validate GLB headers, sizes, texture dimensions, triangle counts and textures; update asset manifest with `available:true` **only after** valid local imports.
4. Build biome selector or apply Moonfall-only visual layer; do not change other game maps unless explicitly requested.
5. Test `index.html` and `cursed.html`, quality Low/High switches repeated, browser errors, PBR lighting, game loop, damage/skills, enemy AI/collision, mobile touch and FPS/resource metrics.
6. Commit to a feature branch and open a PR against `gh-pages`; report exactly what is implemented vs blocked. No new Meshy generation unless user explicitly asks.

Do not merge or deploy unverified remote assets to production.
