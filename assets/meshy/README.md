# Meshy exports required

**None of the 13 production GLBs is included yet.** The manifest intentionally
marks every export `available: false`. Task IDs alone do not grant account access.
Meshy MCP authentication now works, and all 13 original tasks have been checked:
every task returned SUCCEEDED. The actual GLB download is blocked by the runtime
proxy for `assets.meshy.ai` (HTTP 403). Network access to `api.meshy.ai` alone is
insufficient. No API key belongs in this repository.

Phase 2 filenames and IDs: [PHASE2-HANDOFF.md](PHASE2-HANDOFF.md). The manifest
contains all 13 entries; availability remains false until real files are present.

Export GLB with embedded textures from the account that owns these tasks:

| Filename | Task ID | Triangle budget |
| --- | --- | ---: |
| `moon-arena.glb` | `01a1e3b2-07b9-74a5-a370-4d8171618ca6` | 80,000 |
| `modular-floor.glb` | `01a1e3b2-1966-7224-83c0-2bdbeea548a3` | 2,500 |
| `modular-wall.glb` | `01a1e3b2-29fa-7146-aa67-e377d41d78fa` | 5,000 |
| `ancient-pillar.glb` | `01a1e3b2-a03c-7483-ae7e-4ee77550bd8c` | 12,000 |
| `celestial-warrior.glb` | `01a1e3b2-af58-7625-a8ed-b148d3cfcf1d` | 45,000 |

Each file has limits of 64 MiB, 16 textures, and maximum texture edge 2048px.
These admission limits do not guarantee mobile FPS. Reduce material slots and
keep repeated modules much smaller. The bundled loader has no configured
Draco/KTX2/Meshopt decoders; export ordinary uncompressed GLB.

```sh
python3 scripts/import-meshy.py --source /path/to/export-directory
# Or copy the named GLBs into assets/meshy, then:
python3 scripts/import-meshy.py --scan
```

The importer validates headers, JSON and embedded resources before copying and
updating the manifest. The browser then decodes and checks geometry/texture
budgets. Reload and open **สถานะโมเดล / Performance** for loaded/missing/error.
Partial imports are supported. Never store an API key in the static website.

## Placement and collision

Scenery hierarchies and rotations are baked once to shared bottom-centered unit
bounds. `rotationY` in the manifest is radians, applied before normalization.
Floor instances fit 208 courtyard tiles. Wall instances fit the exact original
`WD.walls` collider envelopes, preserving doors and corridors. Pillars replace
the six original tower volumes. Procedural dungeon columns use existing solids.

Moon Arena is fitted onto the existing solid keep as a temple crown. It is
**not** treated as an arbitrary new walkable collision mesh. A generated arena
can contain stairs/walls that disagree with the original world. To replace the
whole playable map, author a dedicated collider/nav layout and a network map
version first. Inspect geometry gaps/protrusions before enabling production
assets: bounds normalization cannot verify their semantic shape.

## Warrior admission and calibration

Inspection reports mesh/triangle/texture counts, bone names, skin count, bounds
and clip names. The adapter requires a real skinned rig, both hand bones and
distinct idle/walk/attack/cast/hit/death clips. Unrigged/incomplete exports keep the original
animated hero. No retargeting from the unrelated shipped skeleton is attempted.

Set exact names under `warrior.bones` and `warrior.clips` in the manifest if auto
matching fails. Height defaults to 132 world units. Set `rotationY` to face +Z.
Common RightHand/LeftHand, hand_r/hand_l and Mixamo names are recognized.

Use in-place clips; authored root motion must be removed before production use so
the visible character stays aligned with the authoritative unit hitbox.

An admitted hero gets a skeleton-safe clone, independent AnimationMixer and the
original unit reference. HP, damage, skill timers, status effects, death/revive
and weapon selection remain authoritative. A separate pivot parent preserves
animation track transforms. Existing weapon factories supply equipment.
Hand orientation, two-handed grips, shields/bows and skill poses require visual
calibration against the actual export. Automatic visual armor replacement on an
arbitrary Meshy rig is not implemented; armor stats stay unchanged.

Smoke tests use explicitly synthetic GLB buffers delivered only by test routes.
They are not installed here or counted as Meshy artwork.
