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
The canvas gets text control instructions for assistive technology. Full keyboard
play is retained; a complete screen-reader UI is still follow-up work.

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

Implemented `moonfall-menu.js` / `moonfall-menu.css` in a separate second round.
Play actions and player identity appear first. Weapon reference and visual/audio
settings use native keyboard-accessible details/summary sections. The reference
uses the same 27 skill illustrations and links to the independent gallery. Name,
cloak, Solo, quick match, rooms, settings and fusion buttons retain their original
nodes and handlers. Cloak buttons now have 44px targets and aria-pressed state.

Room/lobby panels have clearer contrast, readable room codes, 44px inputs and
selects, and a primary start/leave row above long player/config lists. Host-only
controls, client waiting, search state, chat and original configuration handlers
remain intact. No room service, transport schema or gameplay rule is changed.

`python3 scripts/smoke-moonfall-menu.py` passes both entries at 1100×700 desktop,
844×390 mobile landscape and 390×844 portrait (six cases). It checks visible
primary actions, no horizontal overflow, keyboard accordions, cloak selection,
fusion/info dialogs, original Solo start with 32 heroes, configuration events,
local transportless host/client/search fixtures, local chat and image failure
fallback. Portrait coverage is for menus; gameplay still uses its original
landscape flow. No public room or message to another player was created.

Menu fixtures intentionally route the GLB manifest to missing for isolation;
those screenshots do not describe installed file availability. Separate
`real-menu-*` captures use all 17 actual GLBs loaded in the 3D menu. HUD captures
also use the real installed GLBs. The old full regression passed both entries,
native touch, damage/basic attack, skills/MP/cooldowns, inventory, AI loop,
snapshot roundtrip, version guard and rig/missing/corrupt fallback cases during
round 1. Menu-only changes were subsequently checked with the six-case suite.

## Evidence and changed files

- [Actual 3D menu](reports/moonfall-ui/real-menu-desktop.png) and
  [mobile menu](reports/moonfall-ui/real-menu-mobile.png).
- [In-game HUD and fire skills](reports/moonfall-ui/index-fire.png),
  [mobile HUD](reports/moonfall-ui/mobile-fire.png),
  [cooldown/mana/locked states](reports/moonfall-ui/index-states.png).
- [Local lobby](reports/moonfall-ui/index-lobby-desktop.png),
  [menu tests](reports/moonfall-ui/menu-results.json),
  [HUD tests](reports/moonfall-ui/results.json),
  [gameplay regression](reports/moonfall-ui/gameplay-regression.json).
- Added UI/menu adapters and CSS, the atlas/manifest/asset README, gallery,
  two smoke suites and evidence under `reports/moonfall-ui/`.
- `index.html` and `cursed.html` only add script/style links and installer calls.
  The gameplay source before `const R3=` exactly matches the merged base.
- Existing model files, nature/terrain adapters, combat data, controls and network
  version are unchanged. No Meshy calls or Phase 3 work were performed.

## Review and limitations

Run `python3 -m http.server 8010` from this repository; open the game or
`/moonfall-ui-preview.html`. The work is kept on a feature branch for review.
It is not merged or deployed in this pass. Physical mobile device testing,
complete screen-reader navigation and new fusion/utility icon artwork remain
follow-up work. Meshy models, credits and Phase 3 are untouched.
