# Arena Royale Reborn — Celestial Armory Weapon Collection

**Production status:** Generated on 2026-11-18 from the previously approved Celestial Armory concept: **5 classes × 3 rarity tiers = 15 individually modeled weapons**. All weapon models were made via Meshy Smart Topology Text-to-3D Preview and Meshy 6 Lite PBR 2K Refine. These are separate static equipment meshes, not characters/skins/animation rigs. The distinct forge/crafting system is not implemented by this work.

The **task IDs in the table are the *textured refine* IDs** — download the GLBs using these, not the untextured preview IDs. Exact filenames below are intended targets for Codex/Claude and are *not* evidence that any binaries are in GitHub yet.

| Class | Tier | Display Name | Refined Meshy Task ID | Output GLB |
|---|---|---|---|---|
| Warrior | Normal | Ironblade | `01a1ea85-4354-717d-ac3b-01056f5b309d` | `assets/meshy/weapons/warrior-normal-ironblade.glb` |
| Warrior | Epic | Bloodcrest | `01a1ea85-95b7-7382-8c5c-e8b5cc122d4e` | `assets/meshy/weapons/warrior-epic-bloodcrest.glb` |
| Warrior | Legendary | Solar Justice | `01a1ea86-cd92-75d7-af28-11c3d0f940b3` | `assets/meshy/weapons/warrior-legendary-solar-justice.glb` |
| Assassin | Normal | Shadow Fang | `01a1ea85-53c2-77c4-899d-abcb1a82b6cc` | `assets/meshy/weapons/assassin-normal-shadow-fang.glb` |
| Assassin | Epic | Night Veil | `01a1ea85-a826-7266-b440-08ab3ddf2700` | `assets/meshy/weapons/assassin-epic-night-veil.glb` |
| Assassin | Legendary | Eclipse Twin | `01a1ea86-d8a1-748c-ad9e-c7b68cdff490` | `assets/meshy/weapons/assassin-legendary-eclipse-twin.glb` |
| Archer | Normal | Hunter Bow | `01a1ea85-63c8-7471-8275-5652976c315a` | `assets/meshy/weapons/archer-normal-hunter-bow.glb` |
| Archer | Epic | Windleaf Bow | `01a1ea85-b934-7408-b383-760816a931a0` | `assets/meshy/weapons/archer-epic-windleaf-bow.glb` |
| Archer | Legendary | Lunar Longbow | `01a1ea87-2f69-7561-a04d-a5bd42569c7d` | `assets/meshy/weapons/archer-legendary-lunar-longbow.glb` |
| Mage | Normal | Apprentice Staff | `01a1ea85-736a-7123-8538-da4a95e68f2b` | `assets/meshy/weapons/mage-normal-apprentice-staff.glb` |
| Mage | Epic | Arcane Staff | `01a1ea85-caed-77d3-8de3-aa259335a86a` | `assets/meshy/weapons/mage-epic-arcane-staff.glb` |
| Mage | Legendary | Astral Nexus | `01a1ea87-802d-7084-bce1-33ce520cc86f` | `assets/meshy/weapons/mage-legendary-astral-nexus.glb` |
| Summoner | Normal | Spirit Orb | `01a1ea85-8390-7768-bbb1-6838c6bce306` | `assets/meshy/weapons/summoner-normal-spirit-orb.glb` |
| Summoner | Epic | Soul Tome | `01a1ea85-dbeb-707d-b8a5-27a21faf60bc` | `assets/meshy/weapons/summoner-epic-soul-tome.glb` |
| Summoner | Legendary | Genesis Grimoire | `01a1ea87-96d7-74e6-976c-fed23b010006` | `assets/meshy/weapons/summoner-legendary-genesis-grimoire.glb` |

## Visual fidelity and manufacturing notes

- **Warrior**: Normal restrained grey steel, Epic crimson black steel, Legendary silver-gold sun blade.
- **Assassin**: Each *single dagger asset* is intended to be duplicated/mirrored and mounted in right/left hand sockets for dual wield — not a mesh with two daggers merged. Ensure blade sharp edge orientation and separate hit box per hand.
- **Archer**: The bow models include a visual bowstring; do not rely on the procedural string being skinned/animated. Use a proper bowstring system and separate arrow projectile/visual. Reuse existing arrow geometry or create in-game; arrow is **not** part of these 15 GLBs.
- **Mage**: Three distinct staff assets; use appropriate gripping point and casting VFX at ornament pivot.
- **Summoner**: Spirit Orb, Soul Tome (closed grimoire), Genesis Grimoire (open ring-backed grimoire) are **three different physical object silhouettes**, not required to be gripped the same way; configure hand grip vs book/floating mount and runtime controlled rotation explicitly.
- Visual glow in a PBR texture does *not* supply Three.js bloom or particle simulation. Runtime VFX is a separate engine task.

## Claude / Codex implementation acceptance

1. Fetch the **real GLB file** for each refined task through the connected Meshy account. Download as filenames above. Signed URLs expire; obtain new ones from Meshy rather than copying old signed URLs into GitHub. **Do not regenerate and do not spend credits.**
2. Inspect every GLB: binary glTF magic, bounding box, front axis, world scale, triangle count, materials, texture sizes, missing degenerate geometry, animation tracks, number of mesh components, and visual quality/shape relative to approved art. Text-to-3D does not guarantee identical shape to concept art or perfect bowstrings; report defects.
3. Create an equipment registry with item identity, class, rarity, asset path, weapon equip type, grip/pivot + angle, scaling rules, quality-tier fallback, optional idle particles. Avoid inventing new gameplay stats.
4. Connect to already existing damage/skill/weapon equip logic. Prefer `SkeletonUtils.clone` and hand bone sockets for skinned player characters. Adjust weapon *local transforms* instead of modifying world unit transforms.
5. Make 15 item preview cards for inventory, forge or selection UI, including unloaded/fallback states. **No forging gameplay system** is completed by this asset generation — implement it separately and keep crafting costs/probabilities user-configurable until approved.
6. Test keyboard/mouse + touch, weapon switching, save/load, asynchronous GLB loading, socket alignment, PvE/PvP replication and draw-call/material memory. Preserve existing world and combat data.
7. Work from latest `gh-pages`, on feature branch; create PR and report what was implemented vs missing. Never mark an asset `available:true` without real imported binary. Do not merge/deploy without user approval.

**Important:** This file is a handoff inventory. Actual mesh files are currently on Meshy, and require an explicit download/import step; do not claim they were uploaded to GitHub.
