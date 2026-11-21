# Moonfall Phase 2 — original exports only

These exact Task IDs were supplied by the owner and verified through the Meshy
MCP read-only task-status tool. All eight returned `SUCCEEDED`. They are included
in the version 2 manifest together with the original five Phase 1 tasks.
All eight originals are now downloaded, inspected and assembled in the game.
Together with Phase 1, the local manifest has 13/13 admitted real GLBs.
Checksums and geometry inspection: [phase12-assets.json](../../reports/phase12-assets.json).

| Asset | Filename | Task ID |
| --- | --- | --- |
| Moon Stairs | moon-stairs.glb | 01a1e4ef-59c3-75ce-8019-606c53d74925 |
| Wall Corner | wall-corner.glb | 01a1e4ef-7820-7509-aa6f-85d568e6a53e |
| Temple Gate | temple-gate.glb | 01a1e4ef-8405-73dc-93d6-004c7f2ca49f |
| Ruin Arch | ruin-arch.glb | 01a1e4ef-8ea6-7073-b3ce-37695394cd7e |
| Guardian Statue | guardian-statue.glb | 01a1e4ef-9a7d-7191-a43f-e89ab12b0a92 |
| Portal Frame | portal-frame.glb | 01a1e4ef-b382-71aa-a201-bf72f103dea8 |
| Rubble | rubble.glb | 01a1e4ef-bf35-7484-a476-086101d99d22 |
| Brazier | brazier.glb | 01a1e4ef-c952-7560-b980-300c4359c684 |

## Current assembly and validation

`moonfall-environment.js` extends seeded world data before the original collision
and navigation grids are built. Layout revision 3 is shared by host/client;
network version 11 uses the existing handshake to reject older maps.

- Temple Gate aligns its actual narrow opening to the existing entrance; its
  doorstep height is baked from the mesh. Corner walls fit tower envelopes.
- Ruin Arch has four post colliders matching the actual GLB columns. Portal Frame
  has two side colliders; its solid pedestal is buried to open the walkable ring.
- Statues, rubble and braziers avoid walls, solids and initial loot/mob positions.
  A reserved stair approach keeps the raised landing accessible.
- Moon Stairs and Moon Arena use deterministic 33×33 sampled surface heights.
  The base courtyard remains flat. Stair rails are visible colliders.
- Animated portal/flame shaders retain fog-of-war visibility, do not add game
  abilities, and use the existing High bloom. No new lights/textures for flames.
- Static primitives use shared geometry/materials and InstancedMesh batches.
  Runtime map limits are 1024px desktop / 512px mobile; source GLBs remain 2K.
- Celestial Warrior is now inspected: no skins, bones or clips. The original
  animated hero remains active. No rigging/animation credit was spent.

Run the four validation commands in [README.md](README.md), including the
real-GLB suite. The suite checks actual mesh openings and floor heights, device
texture limits, native touch events, quality rebuild resources and JS errors.
Hardware mobile/PC FPS, long-duration heap/VRAM and remote two-machine multiplayer
still need physical acceptance. See [PHASE12-REPORT.md](../../PHASE12-REPORT.md).

Only repeat downloads if replacing an export intentionally. Use authenticated,
free task-status/download tools; stage outside Git, validate the real GLB header,
then run `scripts/import-meshy.py`. Do not commit API keys, signed URLs or private
MCP metadata, and do not generate/refine/remesh/rig/animate/convert models.
