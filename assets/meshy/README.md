# Meshy originals installed

All **17 real GLB exports** are included in this directory and marked
`available: true`. They were downloaded from the existing successful Meshy tasks;
no generation, remesh, rigging, animation or other paid job was requested.
Only free task-status, download and balance tools were used. Credentials, signed
CDN URLs and private MCP responses are kept outside this repository.

The original GLB bytes are unchanged. The four Nature exports and their
validation are documented in [MOONFALL-BIOME-REPORT.md](../../MOONFALL-BIOME-REPORT.md). The offline inspector records SHA-256,
file size, triangles, skins and clips in
[phase12-assets.json](../../reports/phase12-assets.json) and
[biome-assets.json](../../reports/biome-assets.json).

| Asset | File | Task ID | Triangles |
| --- | --- | --- | ---: |
| Moon Arena | [moon-arena.glb](moon-arena.glb) | `01a1e3b2-07b9-74a5-a370-4d8171618ca6` | 9,859 |
| Modular Floor | [modular-floor.glb](modular-floor.glb) | `01a1e3b2-1966-7224-83c0-2bdbeea548a3` | 1,693 |
| Modular Wall | [modular-wall.glb](modular-wall.glb) | `01a1e3b2-29fa-7146-aa67-e377d41d78fa` | 2,992 |
| Ancient Pillar | [ancient-pillar.glb](ancient-pillar.glb) | `01a1e3b2-a03c-7483-ae7e-4ee77550bd8c` | 3,324 |
| Celestial Warrior | [celestial-warrior.glb](celestial-warrior.glb) | `01a1e3b2-af58-7625-a8ed-b148d3cfcf1d` | 20,060 |
| Moon Stairs | [moon-stairs.glb](moon-stairs.glb) | `01a1e4ef-59c3-75ce-8019-606c53d74925` | 2,479 |
| Wall Corner | [wall-corner.glb](wall-corner.glb) | `01a1e4ef-7820-7509-aa6f-85d568e6a53e` | 2,299 |
| Temple Gate | [temple-gate.glb](temple-gate.glb) | `01a1e4ef-8405-73dc-93d6-004c7f2ca49f` | 5,903 |
| Ruin Arch | [ruin-arch.glb](ruin-arch.glb) | `01a1e4ef-8ea6-7073-b3ce-37695394cd7e` | 3,955 |
| Guardian Statue | [guardian-statue.glb](guardian-statue.glb) | `01a1e4ef-9a7d-7191-a43f-e89ab12b0a92` | 7,033 |
| Portal Frame | [portal-frame.glb](portal-frame.glb) | `01a1e4ef-b382-71aa-a201-bf72f103dea8` | 5,757 |
| Rubble | [rubble.glb](rubble.glb) | `01a1e4ef-bf35-7484-a476-086101d99d22` | 2,554 |
| Brazier | [brazier.glb](brazier.glb) | `01a1e4ef-c952-7560-b980-300c4359c684` | 3,078 |
| Gnarled leafless moon tree | [moon-dead-tree.glb](moon-dead-tree.glb) | `01a1e5de-ff15-723e-8432-05aa2913190b` | 4,162 |
| Silver-leaf moon tree | [moon-silver-tree.glb](moon-silver-tree.glb) | `01a1e5df-10c3-7669-a8ad-db3b59a3e26a` | 5,252 |
| Rough dark basalt boulder | [moon-boulder.glb](moon-boulder.glb) | `01a1e5df-21c4-76b4-98f0-2115d5c09dad` | 3,110 |
| Moonstone rock cluster | [moon-rock-cluster.glb](moon-rock-cluster.glb) | `01a1e5df-5a17-76bf-bdc1-778215cc0611` | 3,504 |

## Runtime placement

`celestial-render.js` bakes each authored hierarchy/rotation into shared,
bottom-centered unit bounds once. Repeated scenery uses InstancedMesh, shared
PBR materials and embedded maps. High has shadows/AO/Bloom; Low uses direct
rendering and no shadows/postprocessing. Courtyard tiles use 56 Low / 208 High
instances. The generated floor is a cube-like module: flattening it into a thin
paving tile is intentional. Long wall modules are tiled along their authored X
axis instead of stretching one mesh along the wrong axis. Pillars preserve
native proportions while fitting the six original tower collision circles.

Moon Arena is a low, walkable central dais at the original hall, not a stretched
keep crown. `moonfall-collision-data.js` contains 33×33 height fields sampled from
Moon Arena, Moon Stairs and the Temple Gate doorway floor, with source hashes.
The heights exist before host/client world generation, independently of load
speed. Rebuild/check them with:

```sh
python3 scripts/bake-moonfall-surfaces.py --check
# After intentionally changing GLB bytes or manifest rotation:
python3 scripts/bake-moonfall-surfaces.py
```

Phase 2 assembly remains deterministic. Ruin Arch uses its four actual column
positions, with an open central passage. Temple Gate is widened to align its
narrow native doorway with the existing gate. The portal's solid pedestal is
buried; its opening and shader remain above walkable ground. Side rails, statues,
rubble and braziers have visible matching collision envelopes. The layout
revision is 3; the existing network handshake version is 11 to reject older maps.
No combat or transport schema is changed.

## Texture and download budgets

Each source export has four embedded 2048px maps. Before GPU upload, decoded maps
are resized to at most 1024px on desktop or 512px on mobile (including touch iPad).
Original files remain intact. Across 68 maps, RGBA8 plus mipmaps is approximately
363 MiB desktop / 91 MiB mobile, **excluding** other game textures, targets,
geometry, driver overhead and CPU decode buffers; this is a calculated bound,
not measured VRAM. Cold downloads now total about 129.5 MiB (32.0 MiB added by Nature). Compression and
progressive delivery remain follow-up performance work.

## Celestial Warrior: verified fallback

The actual Warrior has **0 skins, 0 bones and 0 animation clips**, 20,060 triangles.
It is downloaded, decoded and inspected, but the original animated hero remains
the playable character. The adapter requires a real skin, two hand sockets and
six distinct idle/walk/attack/cast/hit/death clips. A static export must not replace
the working combat character. No automatic paid rigging is performed.

If a compatible export is supplied later, calibrate `warrior.bones`,
`warrior.clips`, height (default 132), forward +Z and grips in the manifest.
Use in-place clips; the original unit continues to own HP, damage, skills,
movement, inventory, weapons and multiplayer state.

## Validation

```sh
python3 scripts/check-meshy-assets.py --require-complete
python3 scripts/check-meshy-assets.py --scope biome --require-complete
python3 scripts/smoke-moonfall-biome.py
python3 scripts/check-moonfall-layout.py
python3 scripts/smoke-real-meshy.py
python3 scripts/smoke-celestial.py
```

The real-asset suite uses the shipped GLBs. The regression suite separately
routes missing manifests and explicitly synthetic loader/rig fixtures; those
fixtures are never installed as production artwork. See the
[current report](../../PHASE12-REPORT.md) for evidence and remaining limits.
