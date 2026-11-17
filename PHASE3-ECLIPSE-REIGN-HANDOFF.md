# ARENA ROYALE REBORN — PHASE 3: ECLIPSE REIGN

**Art direction:** Dark Celestial Forces. User approved an epic blue-violet eclipse, metallic lunar armor, monumental bosses and luminous weapon effects.

**Scope:** First Phase 3 playable combat pack. These are **real Meshy text-to-3D textured jobs**. Task IDs below are refined jobs, not geometry previews. Do not add them as `available: true` until their actual GLB exports exist in the repository and pass validation.

## Meshy deliverables

| Key | Intended filename | Textured Meshy task | Type |
| --- | --- | --- | --- |
| celestial-overlord | `assets/meshy/celestial-overlord.glb` | `01a1e994-9a14-715f-9105-30d8606c53f1` | boss |
| dark-sentinel | `assets/meshy/dark-sentinel.glb` | `01a1e994-ab2c-743a-84b2-c753dbf7de31` | humanoid enemy |
| lunar-construct | `assets/meshy/lunar-construct.glb` | `01a1e994-ba44-7630-a09c-83fe5a4b587b` | golem enemy |
| lunar-greatsword | `assets/meshy/lunar-greatsword.glb` | `01a1e994-ca3f-747d-af1e-cff70b42a5a4` | melee weapon |
| eclipse-scythe | `assets/meshy/eclipse-scythe.glb` | `01a1e994-daa8-7076-a9e4-bc5cd60ee263` | melee weapon |
| moon-staff | `assets/meshy/moon-staff.glb` | `01a1e994-eb99-710a-b535-2ce5b760958a` | magic weapon |

Created with Meshy smart-topology geometry and 2K PBR texture refine. Proposed poly budgets: boss 25k, sentinel 14k, construct 14k, greatsword 4.6k, scythe 4.7k, staff 4.1k. Actual geometry counts must be inspected in exports; generation targets are **not** measured post-export counts.

## Production instructions for Codex

1. Start from the latest `gh-pages` and read current asset importer/manifest, `PHASE1-REPORT.md` and the Moonfall Phase 2 code. Preserve the existing unit state, damage, combat, skills, AI, touch controls, multiplayer and map paths.
2. Use the Meshy connector to retrieve these existing task IDs and download **ordinary uncompressed textured GLB**. Do not regenerate or spend Meshy credits. Confirm local binaries and run the project's GLB validation/import script, adapting manifest schema to include the new keys.
3. Inspect scene nodes, geometry triangle counts, PBR textures, bounding boxes and orientation, and determine whether the three creatures are actually *skinned*. Text-to-3D often produces unrigged static meshes; a neutral A-pose is NOT a valid animation rig.
4. Do **not** substitute static meshes for fully animated playable enemies unless there is an explicit graceful fallback and test scene. If no skeletal skin and animation clips are present, create a separate rigging/animation job with explicit user budget approval. Do not claim that a boss is combat-ready until AI, rig/anim, hitbox and attacks actually work.
5. Hook weapon models as cosmetic replacements using existing unit/weapon equipment logic and hand sockets; preserve authoritative attack hitboxes/timing/damage. Correct handedness, pivot, scale, and two-handed alignment.
6. Boss design target: **Celestial Overlord** with readable encounter phases at 70% and 35% HP, with attack telegraphs and predictable safe zones, implemented using existing combat contracts only after animations are present. Never silently change multiplayer authority.
7. Enemies: **Dark Sentinel** (melee), **Lunar Construct** (slow high-armor golem). Reuse existing AI controller interfaces, explicitly define collision size, animation action mapping, and HP/skill tuning as non-destructive additions.
8. VFX in Three.js: Moon Slash (arc trail), Eclipse Burst (radial shockwave), Celestial Rain (projectiles), Void Cage (warning ring + pillars). The visuals should be **runtime shaders / instanced geometry / sprites**, not new Meshy geometry. Maintain low/mobile quality presets and disable heavy bloom during mass encounters.
9. Test battle arena on both `index.html` and `cursed.html` where relevant, including regression on HP/damage, skills, collision, AI pathfinding, touch controls, multiplayer snapshots and quality switches. Report exact test devices/FPS rather than claiming 60 FPS based on software GPU.
10. Commit implementation on feature branch and open a PR against `gh-pages`. Keep invalid or missing assets in a clearly labeled fallback state. No release/deployment until validation and user approval.

## Creative constraints

- Black obsidian, midnight steel, silver engravings, antique gold trims; moonlit icy blue + violet only as focused luminous accents.
- Strong readable silhouettes at gameplay camera distance. Heavy boss armor, not busy tiny ornamentation.
- Keep monsters distinctive from boss at a glance.
- Add no copyright characters, no textual logos to models.
- Performance priority: PC and mobile. Minimize skinned mesh draw calls, texture memory and costly alpha. Prefer in-place animations.
- This handoff is **metadata + instructions only**. It does not contain GLB binaries and is not evidence of successful installation into the shipped game.

## Future expansion (not yet generated in this batch)

Moon Queen, Eclipse Titan, Moonfang, Void Wraith, Astral Bow, Celestial Spear, additional boss encounter arena effects. Plan separate budget and visual approval before ordering.
