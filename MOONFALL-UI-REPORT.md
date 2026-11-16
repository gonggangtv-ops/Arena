# Moonfall UI/UX and skill art

## Round 1 — HUD and base skill icons

Added real, newly generated icon artwork for the 27 existing base skills across
nine weapons. `assets/ui/skill-atlas.json` records exact skill names and cells.
Three additional utility illustrations are reserved; fusion skills keep their
existing glyph icons. The game still owns all damage, costs, cooldowns, levels,
learn rules, aiming, equipment and multiplayer state.

`moonfall-ui.js` installs render adapters: navy/silver/gold button rims and vitals
frame, actual keyboard bindings **Q / E / R** (plus 1/2/3), text for insufficient
mana, and a desktop hover tooltip with mana and effective cooldown. Mobile uses
the original touch buttons and aim gestures, without hover-only requirements.
Original level pips, learn buttons, cooldown timers and fallback icons remain.
The canvas gets text control instructions for assistive technology.

The local PNG is decoded once; 27 cached 192px canvases are reused. Image failure
uses the old glyph renderer. `moonfall-ui-preview.html` is a lightweight gallery
with 27 labels and selectable example states, independent of the large GLBs.
It is a review page; cooldown/mana examples there are illustrative.

Validation: `python3 scripts/smoke-moonfall-ui.py` passes real atlas mapping,
ready/cooldown/mana/locked states, unchanged skill hit areas/world collision,
fusion fallback, actual E skill casting and mobile touch casting/attack on both
entries plus mobile emulation. It also passes failed-image fallback and a narrow
gallery with no horizontal overflow. See `reports/moonfall-ui/results.json` and
`hud-test-log.txt`. Hardware FPS/accessibility certification is not claimed.

## Round 2 — start menu and lobby

The next implementation round groups play actions, weapon reference and visual
settings, and improves room/lobby readability while retaining original handlers.

## Review and limitations

Run `python3 -m http.server 8010` from this repository; open the game or
`/moonfall-ui-preview.html`. The work is kept on a feature branch for review.
It is not merged or deployed in this pass. Physical mobile device testing,
complete screen-reader navigation and new fusion/utility icon artwork remain
follow-up work. Meshy models, credits and Phase 3 are untouched.
