# Arena Royale Reborn — Phase 5: Five Class Character Exports

**Status on 2026-11-17:** All five **textured 3D models** are created in Meshy. Each task succeeded and lists `glb` as a downloadable format. **NO rigging or animation has been performed**. GLB binary files are not included in this GitHub document and must be downloaded into the repository before use.

The approved art direction is the original **Celestial Armory** lineup: metallic black/navy armor, silver polished highlights, antique-gold moon ornamentation, hints of violet light; class-specific silhouettes.

| Class | Meshy textured image-to-3D Task ID | Reference Image Task | Intended filename |
| --- | --- | --- | --- |
| Warrior | `01a1ea26-0d4d-74da-8fa6-20180724290f` | Local generated clean A-pose image | `assets/meshy/p5-warrior.glb` |
| Assassin | `01a1ea29-8ca6-7010-812c-6e3cc7d9889e` | `01a1ea28-25a4-7765-9e89-7e2d535f9e29` | `assets/meshy/p5-assassin.glb` |
| Archer | `01a1ea29-f264-7103-b4f9-07ea36446163` | `01a1ea28-f824-722b-81c8-beb6b293fcce` | `assets/meshy/p5-archer.glb` |
| Mage | `01a1ea2a-0241-7761-8195-5f7a3dfa8178` | `01a1ea29-05df-75a9-a0b8-973f1b1a982a` | `assets/meshy/p5-mage.glb` |
| Summoner | `01a1ea2a-111b-728b-944d-985f0250481a` | `01a1ea29-1311-7429-b6ed-3735350e9f40` | `assets/meshy/p5-summoner.glb` |

## Appearance / approval contract

The **approved reference art**, not the generated mesh, is the target. Evaluate each finished GLB against it:

- **Warrior:** adult male, silver-white short hair, broad wing-like heavy plate shoulders, black/silver metallic armor, antique gold crescents, white fur mantle, navy/purple cloak; intended weapon is a separate greatsword (not part of rigging mesh).
- **Assassin:** adult female, silver-lavender ponytail and lower-face mask, dark sleek lightweight articulated armor, silver/gold trims, violet cloak panels; dual blades are separate weapons.
- **Archer:** adult male, short tousled black hair, fitted leather/metal layered silver-black gold armor, short torn cape, archer arm guards; bow and arrows are separate assets.
- **Mage:** adult female, long silver-white hair, black and gold structured bodice, midnight and violet layered wide-sleeve robes, gold lunar ornaments; staff and particles are separate from character geometry.
- **Summoner:** adult male, short dark hair, navy/black and white gold-edged layered ceremonial robe, tall collar and belts, restrained crescent embellishment; familiar, portal rings and magical entities are separate gameplay VFX/entities.

The images were generated or edited specifically to isolate each character as a complete front-view subject with hands empty and a neutral rig-friendly stance. The model inference can still alter details or accidentally bake accessories into body; **inspect visually and structurally**. No guarantee of pixel-identical likeness. Do not represent generated texture fidelity as verified until actually checked.

## Meshy generation

- Source: new image reference for each approved class (rather than a generic text-only reconstruction).
- Geometry model: `meshy-t2.5` (Smart Topology), requested target 25,000 triangles per mesh.
- Texture model: `meshy-6-lite`, PBR enabled (default 2K).
- Actual face counts / PBR maps, texture count / weights / skins require inspection of downloaded GLBs.
- Each task shows `SUCCEEDED` and returned a downloadable GLB link as of 2026-11-17. Signed download URLs expire; fetch fresh from Meshy using task IDs.
- The previous `celestial-warrior.glb` from Phase 1 is a **separate older model**; do not overwrite it.

## Claude / Codex handoff

1. Read this file, `PHASE5-CHARACTER-RIG-HANDOFF.md`, and the current `assets/meshy/README.md` / importer and GLB admission rules.
2. Use the linked Meshy account's existing 3D task IDs to download all five **real textured GLB** files to the exact filenames above. Do not regenerate character meshes or images; no credits required for generation.
3. Verify by opening actual meshes: character completeness, front orientation, A-pose suitability, hands, fingers, clothing separations, PBR, silhouette fidelity, polycount, embedded textures, and glTF compatibility. Report discrepancies class-by-class.
4. Prepare for Rig: clean mesh or weight paint as necessary; move weapons, companions, magical rings, and problematic cape panels to separate objects. If a mesh doesn't support automated humanoid rigging, repair manually instead of silently using an invalid skeleton.
5. **Rigging is a separate user-directed task:** check with user before initiating paid Meshy rigging or animation jobs. Use a consistent humanoid bone schema where appropriate, +Z facing, in-place locomotion and left/right weapon sockets. Character preview itself is not rigging.
6. Implement/verify the equipment workflow: helmet, chest, gloves, legs, boots, cape where meaningful. Generating one full-body outfit does *not* automatically create swappable skins. Separate and skin armor parts if user wants them swappable.
7. Test with Three.js `GLTFLoader` / `SkeletonUtils.clone`, independent mixers, all animation states, collision, authoritative HP / damage / skills and multiplayer snapshots.
8. Work on a branch and create a PR against `gh-pages`, report missing rigging/animation assets, measured performance, and actual files imported. Do not mark manifest assets `available:true` until binary GLBs have passed validation. Do not deploy automatically.

**Cost guardrail:** Five meshes were already generated; avoid paid re-generations. Rigging and animation credits should be budgeted separately. 
