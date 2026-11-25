# MuzCruor · Arena runtime performance audit

The production target is the WebGL game served from `app/src/main/assets/index.html`. The reference build is `4468f94`. The test loads the shipped game, its 72 GLB entries, sounds and settings through a local HTTP server.

## Architecture and priorities

The Android shell hosts the same HTML/JavaScript as the browser. The host owns combat, AI, loot, unit movement and match results. Clients send input, receive snapshots and interpolate. Solo play runs the host in the same JavaScript context as rendering. Three.js submits the world and quality-dependent postprocessing. A 2D canvas draws overlays and a DOM layer handles menus and HUD. Consequently host tick time, render submission and final presentation time need separate measurements.

| Location / subsystem | Identified issue and root cause | Impact | Optimization strategy and decision |
|---|---|---|---|
| Menu · `d.js`, `moonfall-loading.js`, `r4.js` | The animation loop submitted the entire live scene behind the full-screen opaque Arena illustration. | High | Skip ground preparation and drawing only while that menu covers the viewport. Advance the camera, windmill and particle clocks. The boot gate still warms the real renderer and uncovered screens immediately draw. |
| Terrain · `r3.js` | A single row-major index buffer submitted all 516,128 terrain triangles at the village camera. Terrain was the second-largest individual draw in that trace. | High | Compute conservative bounds for each 16-row strip during world construction. Select one contiguous index range using the actual render camera before each draw and restore the full range afterwards. Positions, normals, UVs, textures, topology and draw count are preserved. |
| World lifetime · `r3.js`, regional and skill VFX | Disposing shared or private geometry does not signal disposal of the per-mesh instance attributes. Several effects removed their meshes before the general scene traversal. The Queen effect also retained its old scene until its next use. | High | Dispose instance buffers at their owner, before detaching private pools or when retiring the scene. Release the Queen pool and scene reference at teardown. |
| Ground cover · `r3.js`, `r4.js`, `arena-aaa.js` | The Arena overwrote the short-grass count to zero after generating transforms and colors on each camera cell crossing. | Medium | Omit the unused pool and its scatter loop in Arena. Keep the same cell boundaries and flower placement. Tall concealment grass is a separate system. |
| Host · `b.js`, `eclipse.js` | Separation created a Map and a bucket array per occupied cell per tick. V8 also attributed substantial samples to nearest-hero search. | Medium | Reuse a Map and an array of numeric next indices. Reverse insertion preserves unit order in each spatial cell. Build ordered living and all-hero rosters once per tick. Eclipse monsters query the all-hero roster and check life, revival and visibility at decision time. Reject targets outside the current search square before computing the exact distance. |
| World construction · `r3.js`, `trees-break.js` | Every static batch copied its entire instance matrix to RAM. Canopy hiding, shaking and felling were the only consumers. | Medium | Mark batches as tree instances are registered, then snapshot only those batches, including trunks and mixed batches. |
| Boot · `moonfall-loading.js` | Seven full MP3s were converted to JS ArrayBuffers to inspect the first four bytes. The asset subscription was released on success only. | Medium | Await each complete response as a Blob and validate a four-byte slice. Release the subscription in the boot finalizer. Full downloads, format checks, timeouts, progress and retry are retained. |
| Particle creation, shader passes, asset and network loading | The combat VFX backend already recycles instanced slots, the composer already disposes old passes, GLB startup is promise-deduplicated and serializes decoding, room polling and snapshots already have separate frequency limits. | Low | Retain current lifecycles. Compare actual pass disposal events, play a full bot match and exercise the host/client transport paths. |
| Other host and render work | Bot target and pickup scans can grow with population. Material and shadow passes for multi-instance batches also contribute substantial triangles. | Medium | Record the V8 samples and draw attribution. More aggressive loot indexing or model re-batching would require measuring item churn, shadow coverage and extra draw calls across camera paths. |

The main update path is `d.js:loop` → host or client update → local FX → snapshot cadence for hosts → `R3.frame` or 2D drawing. `a.js` builds the seeded world and static obstacle grid. `b.js` resolves units, projectiles and areas in order. `c.js` owns the room/peer transports and snapshot application. `r3.js` owns world construction, materials and renderer quality. `r4.js` places the camera, updates instances and effects, then draws. Arena modules extend the renderer during the source build. `celestial-assets.js` keeps decoded models available for world rebuilds and applies texture limits.

## Benchmark method

Run the same script against each deployed tree. A reference checkout can be outside the working tree.

```sh
python3 src/tests/bench-arena.py /path/to/reference/app/src/main/assets /tmp/arena-before.json
python3 src/tests/bench-arena.py app/src/main/assets /tmp/arena-after.json
```

The run used Chromium 156.0.8078.79 on AMD EPYC 9V74, with a four-core CPU quota and ANGLE SwiftShader. The harness requires Python Playwright and Chromium. It uses low quality, an 800 × 450 viewport at DPR 1, software WebGL, world seed 777 and fixed simulation and spawn randomness. It controls the animation scheduler to isolate workloads. Menu and play each warm four frames. The menu sample covers 20 frames and the fixed village view covers ten. A one-pixel synchronous GL readback includes queued render work. This forces completion for the diagnostic software-rendering workload. It is unsuitable for predicting display FPS or GPU time on a phone.

The ground test visits 160 cell boundaries, hashes the rendered flower matrices and colors and counts discarded grass matrix writes in a separate traversal. The host runs 120 warm-up ticks then 1,800 uninstrumented ticks at a fixed simulation step of 1/30 s. A subsequent 600 ticks run under the V8 sampling profiler. The host checksum covers unit identity, position, health, weapon, level and death state, item IDs, zone, survivors and death order. Timing percentiles use nearest-rank p95. Standard deviation describes the samples within this run.

## Measured results

| Workload or resource | Reference | Optimized |
|---|---:|---:|
| Opaque menu · median draw calls | 250.5 | 0 |
| Opaque menu · median submitted triangles | 9,736,761 | 0 |
| Opaque menu · p95 ms including GPU readback | 2,689.5 | 0.3 |
| Uncovered menu · draw calls | 250 | 250 |
| Village gameplay · median draw calls | 253 | 253 |
| Village gameplay · median submitted triangles | 7,241,014 | 6,773,654 |
| Village gameplay · median ms including GPU readback | 2,432.05 | 2,412.4 |
| Village gameplay · p95 ms including GPU readback | 2,701.9 | 2,596.8 |
| Village gameplay · frame-time standard deviation, ms | 114.6 | 134.82 |
| Host simulation · median ms per tick | 2.6 | 2.8 |
| Host simulation · p95 ms per tick | 5.8 | 6.9 |
| Host simulation · tick-time standard deviation, ms | 1.57 | 2.1 |
| Ground cover · median ms per cell crossing | 0.7 | 0.3 |
| Ground cover · p95 ms per cell crossing | 0.9 | 0.5 |
| Short-grass instance matrix writes on the route | 278,666 | 0 |
| Matrix backups · bytes | 1,591,424 | 71,552 |
| Batches holding backups | 1,111 | 187 |
| Tree matrix backups · bytes | 71,552 | 71,552 |
| Short-grass pool capacity at low quality | 2,700 | 0 |
| MP3 payload bytes converted to JS ArrayBuffers for header validation | 4,567,762 | 28 |
| Instanced meshes emitting dispose / meshes present at teardown | 18 / 1,162 | 1,161 / 1,161 |
| Postprocessing passes disposed on quality change | 9 / 9 | 9 / 9 |

At the village, visible-world submissions dropped by 6.5% at the same camera position. The one-time trace that motivated terrain culling also found a 170-instance material batch submitting 762,790 triangles and a 31-instance shadow draw submitting 463,698. These are candidates for camera-path profiling if further GPU work is planned.

The short-grass route retained all 89,600 visible flower instances counted over the route, including the same transform/color checksum `3889162271`. The terrain comparison rendered the full index range and the culled range under identical camera, shader and lighting state. All 6 views matched at every RGBA pixel in the 256 × 160 target, including the full village scene, map edge, fortress, distant view and off-map camera. Tree hide, restoration and felling succeeded on both builds. Instance disposal was counted per unique object, with 0 duplicate events on the optimized scene.

At 1,800 measured host ticks, both builds produced checksum `1082264453` across 718 units and 864 item entries. The collision grid retains only numeric indices between ticks. Each occupied cell previously allocated an array every tick. Map storage and other game allocations still exist. Sampling profiles in the raw reports identify the host simulation, movement and targeting paths.

[Reference measurements](before.json) · [Optimized measurements](after.json) · [Benchmark harness](../../../src/tests/bench-arena.py)

## Paired host timings

A separate run kept both builds open, alternated which build ran first (AB, BA, AB, BA), and simulated 1,200 timed ticks per seed after 120 warm-up ticks. All four pairs produced identical state checksums. Across 4,800 ticks per revision, mean host time changed from 2.367 to 2.285 ms (3.5% lower). The first pair took longer on the optimized build. The single 1,800-tick workload also showed a higher host p95, and the village frame-time standard deviation increased. These measurements support lower aggregate CPU work on the paired workload with mixed latency tails.

| Simulation RNG | Before mean ms | After mean ms | Before p95 ms | After p95 ms | State checksum |
|---|---:|---:|---:|---:|---:|
| 436 | 3.31 | 3.58 | 7.1 | 6.9 | 2040136219 |
| 437 | 2.20 | 1.84 | 3.7 | 2.9 | 2765982029 |
| 438 | 2.10 | 1.95 | 3.3 | 3.8 | 2140052412 |
| 439 | 1.86 | 1.77 | 2.5 | 2.6 | 309697846 |

```sh
python3 src/tests/bench-arena.py app/src/main/assets /tmp/host-pairs.json --compare-host /path/to/reference/app/src/main/assets
```

[Paired host results](host-pairs.json)

## Scope and regression coverage

- Render and build sources changed in `r3.js`, `r4.js`, `arena-aaa.js` and `trees-break.js`. The changes affect terrain submission, hidden-menu work, short grass and world-batch memory.
- Instance ownership and teardown changed in `arena-regions.js`, `arena-vfx-3d.js`, `arena-vfx-particles.js`, `arena-vfx-post.js` and `queen-vfx.js`. Shared model geometries and materials keep their existing ownership.
- Host logic changed in `b.js` and `eclipse.js`. Boot and menu visibility checks changed in `moonfall-loading.js`. The Arena HTML was rebuilt and its external loader copied to the deployed asset directory.
- HTTP smoke coverage includes real solo entry, desktop and mobile viewport settings, 2D, drops, skills and HUD, and two independent browser contexts using the production snapshot and event protocol over a local transport. The six terrain pixel comparisons also passed with high-quality materials. A 32-bot simulation finished at 645 game seconds with one survivor. A one-byte MP3 and an invalid four-byte signature both kept admission locked.
- Monitor scene rebuilds after long matches, unusually dense unit clusters and camera angles added by future features. Terrain culling assumes row-major indices and static vertex positions. If a future shader displaces the terrain, its displacement extent must be included in the strip bounds. A future translucent main menu would also need to allow the world to draw.
- The browser exposes draw counts, triangles and disposal events. It does not expose driver-level VRAM reclaimed, battery drain or package energy in this setup. The directly measured memory savings apply to JS-visible arrays. The Blob still represents the full downloaded audio payload. Mobile viewport tests use Chromium on the host. Physical mobile FPS, thermal throttling, native WebView behavior and Internet transport remain unmeasured.
