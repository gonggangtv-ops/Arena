# Moonfall Phase 2 — original exports only

These exact Task IDs were supplied by the owner and verified through the Meshy
MCP read-only task-status tool. All eight returned `SUCCEEDED`. They are included
in the version 2 manifest together with the original five Phase 1 tasks.
**Task success is not file import:** the CDN download currently returns HTTP 403.
No actual GLB has been received or inspected in this checkout yet.

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

## Finish importing after network access is applied

1. Require an authenticated `meshy_check_balance` result. Use only free status,
   list and GLB download tools. Do not generate/refine/remesh/rig/animate/convert.
2. Fetch the original task's GLB via `meshy_download_model`, saving into a staging
   directory outside Git first. A tool response containing `download_error` or a
   URL fallback is not a downloaded file. Check that the real file exists and has
   a valid GLB header. Do not commit signed URLs, API keys or private MCP metadata.
3. `python3 scripts/import-meshy.py --source /workspace/meshy-mcp/arena-staging`
4. `python3 scripts/check-meshy-assets.py --require-complete` must pass for 13/13.
5. Load the actual assets in Chromium; inspect bounds, material slots, texture
   sizes, skeleton and clips. Calibrate facing and collider/opening dimensions.
   Do local offline optimization if necessary; never purchase a remesh/rig job.
6. Run `python3 scripts/check-moonfall-layout.py` and
   `python3 scripts/smoke-celestial.py`. The smoke suite deliberately tests
   missing-asset fallbacks and synthetic GLBs separately from real-asset checks.
7. Real-asset visual acceptance, physical mobile GPU checks and remote multiplayer
   testing remain required. Do not mark the phases complete on fallback results.

## Implemented assembly

`moonfall-environment.js` extends seeded world data before the original collision
and navigation grids are built. Host and client use the same layout version.
The original version handshake is bumped to 10 so older map clients are rejected.

- Hollow gate/arches/portal frames use posts and a clear center, avoiding an
  invisible bounding box over the opening. Temple Gate uses original gate-tower
  envelopes. Wall corners fit original corner-tower collider volumes.
- Statue, rubble and brazier placements avoid existing walls/solids and initial
  loot/mob positions. A reserved stair zone prevents props covering the approach.
- Stairs use a continuous ground-height ramp into a raised landing; side rails
  are visible and collide. The base courtyard stays flat underneath the stairs.
- Portal energy is an animated, transparent additive shader with fog-of-war
  distance visibility. It is visual scenery, without adding teleport abilities.
- Brazier flame quads animate with time, use no textures or new dynamic lights,
  and benefit from the existing high-quality bloom. Repeated static parts use
  the existing material/geometry cache and InstancedMesh batches.
- Meshy files are loaded only after a successful local import. Missing files use
  explicit procedural proxies. An unrigged/unanimated Warrior retains the
  original hero; its real rig is currently unknown until the GLB is downloaded.
