# Arena Royale Reborn — Phase 5: Celestial Armory / Character Rig Pipeline

Status: **Implementation brief. No new meshes or rigged animation files have been created by this document.** Prepared for Codex Cloud/Claude working with the real repo.

Project: `gonggangtv-ops/Arena`, `gh-pages`, Three.js.

## Visual reference & scope

Approved concept: five Dark Celestial playable classes **Warrior, Assassin, Archer, Mage, Summoner** with obsidian/midnight steel, silver + antique gold armor, faint blue/violet moonlight highlights. Keep readable silhouettes, production-friendly poly budgets and mobile performance. This is a **character + rig + animation pipeline**, not merely exporting pretty static armor.

## Start with existing mesh — avoid paying again

Production model already in repository: `assets/meshy/celestial-warrior.glb`
Meshy textured task ID: `01a1e3b2-af58-7625-a8ed-b148d3cfcf1d`.
Current asset manifest marks it available, but `warrior.bones.rightHand`, `leftHand` and `warrior.clips.*` are blank. **Do not infer there is a rig** from a successful GLB import.

1. Inspect current GLB: node hierarchy, actual `skins` count, bones, weights, embedded clips, materials, orientation, height, triangle count, and pose. Meshy geometric generation is not rigging.
2. Use Meshy CLI 0.8.5+ in an authenticated environment that can access this same Meshy account (a cloud worker's separate login does not automatically share the chat plugin session). Check `meshy auth status`, use `meshy text-to-3d get TASK_ID` to verify same account and status. If task ID has expired, use already-downloaded original textured GLB via a supported authenticated URL route instead of regenerating.
3. Check actual Meshy rigging and animation costs **before** any paid operation. Obtain user approval for charges beyond approved scope. No accidental reruns.
4. Rig the *textured* Celestial Warrior model, facing +Z and A/T-pose when possible:
   `meshy rigging create --input-task-id 01a1e3b2-af58-7625-a8ed-b148d3cfcf1d --height-meters 1.7 --async --format json --no-update-check`
   Track submitted rigging task until terminal. Download the actual `result.rigged_character_glb_url` to `assets/meshy/celestial-warrior-rigged.glb`. The task might be rejected due to the model's pose/quality; do not claim rig success otherwise.
5. Check which basic walk/run clips are provided automatically by rig task. Then query `meshy animation-catalog list` for Idle, Attack, Cast, Hit, Death, Dodge. Use real library IDs (not invented IDs) and animate/retarget them to this rig. Prefer in-place clips / remove root motion. Save actual GLB animation files with explicit filenames.
6. Test bone hierarchy in Three.js, loading via `GLTFLoader` and `SkeletonUtils.clone`; validate skin, nonzero bone weights, independent AnimationMixers for multiplayer clones, right/left hand attachment sockets, and gait orientation. Bind to existing `warrior.bones` + `warrior.clips` mapping only after verified. Preserve existing unit/collision/damage/snapshots/skills.
7. Test `Idle/Walk/Run/Attack/Cast/Hit/Death` with gameplay actions and weapons. Log QA screenshots and missing clips, silhouette issues or skin deformations. On failure keep the existing animated hero fallback. No fake static or synthetic skeletons presented as production Rig.

## Then create the five-class kit (only after Warrior rig works)

| Class | Signature equipment | Rig requirements |
| --- | --- | --- |
| Warrior | two-hand greatsword, black-silver heavy armor, lunar mantle | humanoid rig, 2-hand grip |
| Assassin | twin blades, lightweight layered obsidian armor, hood | humanoid rig, fast dodge/dual wield |
| Archer | recurve bow, segmented lightweight armor, short cloak | humanoid rig, bow grip + pull/bowstring target |
| Mage | crescent staff, silver mage armor, segmented robe | humanoid rig, casting/aiming, avoid long cloth clipping |
| Summoner | arcane relic, celestial layered armor and shoulder motifs | humanoid rig, summon / casting hand sockets |

Build one consistent design and bone naming convention. Separate visual armor `Helmet, Chest, Gloves, Legs, Boots, Cape` where feasible. **A whole-body Meshy GLB with baked armor is not an interchangeable equipment system.** Swappable armor meshes must be separated, rigged/skinned to a compatible skeleton and tested. Keep original meshes for reference; use Blender or equivalent for mesh separation, weight painting and LOD where automated tools are insufficient. Rigging and animation must not be confused with automatically produced PBR textures.

## Hard constraints

- Start from latest `gh-pages`, work on a feature branch, create PR for user approval; no direct deploy.
- No creation of four additional classes until the Warrior proof of concept passes.
- No credit-consuming regeneration without explicit budget/approval.
- Ship actual verified GLB(s), not only task IDs. Validate no invalid compression/texture over-budget for the game's existing GLTF loader.
- Aim for mobile 30 fps and desktop 60 fps but only report measured numbers with device names. Test live movement/skills/combat, death/revive, both game entrypoints, player clones, weapon grips, mobile controls and multiplayer snapshots.
- Document remaining animation or armor slots clearly.

## Acceptance criteria for Warrior proof of concept

1. A real skinned rigged Warrior GLB exists in repo and loads.
2. At least Idle, Walk/Run, Attack and Death play on actual rig; report any missing action rather than faking it.
3. Attached weapon follows hand bone without snapping.
4. HP / Damage / Skills / Collisions / Multiplayer behavior preserved; fallback when rigging absent.
5. Code changes, tests, rigging task ID and any incurred credits documented in PR.
