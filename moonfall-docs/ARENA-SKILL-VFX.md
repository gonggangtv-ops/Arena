# Arena Royale skill VFX

Target: `index.html`, built from `src/`. The new rendering layer is inserted before
`d.js` initializes Three.js. `cursed.html` and the reference classic build retain
their existing rendering path. No combat data or multiplayer schema is changed.

## Choreography

The registry contains the 27 original weapon skills and 36 fusion skills. Existing
visual events, projectiles, AOE timing and visible unit states drive the effects.
Preview calls are excluded from semantic coverage counters.

| Weapon family | Visual treatment |
| --- | --- |
| Sword / greatsword | Gold wards, spectral crescents, directional blade ribbons and judgment pillars |
| Axe | Copper cyclones, layered warcry waves and directional ground fissures |
| Daggers | Violet shadow petals, vanishing wisps and orbiting lotus cuts |
| Bow / crossbow | Green/gold arrow fans and rain, mechanical snares, explosive salvos |
| Fire | Orange/gold fire trails, molten jets, meteor warning and impact layers |
| Frost | Cyan crystalline lances, radial ice spires, lattice dome and blizzard |
| Storm | Violet lightning accents, circuit-like runes and descending strikes |
| Fusion | Royal twin blades, soul spear, elemental blades/bows, dragon bolts and two-element storms |

The original hit radius and activation delay remain authoritative. Extra height,
trails, edge detail and residual sparks provide scale while the ground remains
readable. The layer adds no new screen shake or full-screen flashes.

## GPU and lifecycle

Eight `InstancedMesh` batches share one shader program: ring, rune, pillar, dome,
arc, shard, streak and ember. Geometry and materials are allocated once per scene,
never per cast. The additional layer needs at most eight draw calls per pass;
this is not a claim about the total game frame, shadows or postprocessing.

- High: 774 slots, up to 300 accepted emissions per frame.
- Low / mobile: 310 slots, up to 130 accepted emissions per frame.
- Reduced motion: 55% pool sizes and at most 70 emissions per frame, no spinning.
- Time-based sustained emissions, bounded AOE history and per-caster debouncing.
- Separate visual PRNG; extra VFX never consume the simulation's random stream.
- Ground-distance culling, fragment fog fade and original unit visibility rules.
  Following effects end when an actor dies or becomes hidden.
- Explicit disposal before the original scene traversal, reset on world rebind
  and pool replacement when graphics quality changes.

`ArenaVFX.snapshot()` exposes capacities, active instances, admission/drop counts
and actual semantic routes for QA. `ArenaVFX.preview()` is visual only.

## Validation

```sh
node --check src/arena-vfx-runtime.js
node --check src/arena-vfx-skills.js
python3 src/build.py
python3 src/build.py cursed
python3 src/build.py web
python3 src/tests/smoke-arena-vfx.py
python3 src/tests/smoke-arena-vfx-client.py
```

The baseline comparison uses the pre-upgrade HTML (default
`/tmp/arena-vfx-baseline.html`, configurable via `ARENA_VFX_BASELINE`). It casts
actual skills through `cast()` and the original host update, compares mana,
cooldowns, damage/status/position and serialized network rows, and separately
checks new visual RNG purity. The fixture isolates combat and legacy visual
random streams because the existing renderer and Three.js UUID/cache allocation
also consume global randomness. This isolation exists only in the test harness.

Tests use real deployment assets through HTTP, actual keyboard/touch input and
Chromium with software WebGL. Structured results are under `reports/arena-vfx/`;
screenshots stay in `/tmp`, outside Git.

## Limits

The existing client snapshot supplies projectile element/kind, but omits AOE
owner and element. Ownerless AOE effects therefore use the correct known `kind`
palette instead of guessing a hidden caster or extending the network protocol.
The host can show the full two-element fusion treatment. Purchased special skills
reuse existing effect families; the 63-profile count describes weapon skills.

An additional baseline audit found existing whole-renderer texture growth when
switching quality and rebuilding the world: 109 → 148 → 202 → 245 textures,
with the new VFX module absent. This requires a separate renderer lifecycle fix;
the new layer creates no textures and its eight GPU pools remain stable through
repeated casts and disposal/recreation. See `reports/arena-vfx/baseline-quality.json`.

Physical device FPS, VRAM, Android WebView and a live PeerJS connection remain
hardware/network checks. Software rendering measurements do not establish them.
