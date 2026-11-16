# Sakura Frontier

Both `index.html` and `cursed.html` share a local, offline-first anime fantasy art layer. Start the site with `python3 -m http.server 8010` from this directory. No build or package installation is required to play.

- **World:** painterly ground, layered sakura crowns and branches, curved tiled roofs, ivory walls, torii gates, lanterns and crystal shrine accents. Existing seeded layouts, collisions, roof fading and tree occlusion remain authoritative.
- **Characters:** painted anime eyes, sculpted hair, eight color palettes, collars and gems. Both the animated glTF characters and procedural fallback use the new heads. Armor keeps faces open; combat rigs and animation clips remain intact.
- **Rendering:** stepped light bands, cool shadows, thin character outlines, softer contact shading and clean emissive accents. Screen-wide bloom is disabled to keep character details readable. Low graphics uses 28 instanced petals; high uses 80. New materials and geometry are shared where possible.

The art lives in `anime-world.js`, `anime-characters.js`, `anime-render.js` and `anime-theme.css`. The HTML entry points load those files before the main script and install the three renderer extensions before initialization. Keep this integration identical in both entry points.

## Validation

With Python Playwright and Chromium available, run `python3 scripts/smoke-anime.py`. It starts an ephemeral local server, checks both games, switches low → high → low, captures day/night scenes, and exercises the real solo game loop. Screenshots are written outside the checkout to a temporary directory. Set `CHROMIUM_PATH` if the browser is not on PATH.

The game still includes its 2D compatibility view. The new modeled scenery and character heads are rendered in **3D**. These are procedural stylized upgrades; no external production character assets, textures or paid services are required.
