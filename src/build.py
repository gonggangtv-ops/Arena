import sys,os
D=os.path.dirname(os.path.abspath(__file__))
web='web' in sys.argv
cur='cursed' in sys.argv
classic='classic' in sys.argv          # the old v2.5 game, kept for reference (classic.html, not deployed)
arena=not cur and not classic          # index.html: every Cursed Realm system, original scenery, Meshy village houses
sys_on=cur or arena
VILLAGE=['house-cottage','house-long','house-witch','market-stall','village-well','street-lantern','stone-bridge','plaza-fountain']
# nature dressing joins the required set once its models are in the manifest
NATURE=['mossy-boulder','nebula-bloom','rocky-meadow','banana-plant','river-stones','mystic-mushrooms','emerald-crystals','dungeon-wall','verdant-tree','stone-guardian','magma-titan','pine-tree','pine-tree-lo','wide-rock','bastion-hill','mango-tree','goblin-shaman']
import json as _j
_man=_j.load(open(os.path.join(D,'..','app','src','main','assets','assets','meshy','manifest.json'),encoding='utf-8'))['assets']
VILLAGE+=[k for k in NATURE if k in _man]
# Eclipse Reign (Phase 3) combat pack: boss, two enemies, three legendary weapons
ECLIPSE=['celestial-overlord','dark-sentinel','lunar-construct','lunar-greatsword','eclipse-scythe','moon-staff']
VILLAGE+=[k for k in ECLIPSE if k in _man]
# Phase 5 Celestial Armory: rigged class heroes (Arena Royale only; The Cursed Realm keeps its heroes)
# the Summoner wears the Mage's model since 2026-11-21 (p5-heroes.js P5.summoner = 'p5-mage')
P5=['p5-warrior','p5-assassin','p5-archer','p5-mage']
VILLAGE+=[k for k in P5 if k in _man]
# Phase 5 class weapons: normal / epic / legendary per class (Arena Royale only)
P5W=[k for k in _man if k.startswith('p5w-')]
VILLAGE+=P5W
# Arena Royale's houses are the owner's models, one per land (2026-11-20); The Cursed Realm keeps the three Moonfall houses
HOUSES=['house-timber','house-candle','house-potion']
if arena and all(k in _man for k in HOUSES):VILLAGE=[k for k in VILLAGE if k not in ('house-cottage','house-long','house-witch')]+HOUSES
# Arena Royale (owner 2026-11-21): the Cursed Forest's leafless trees and the Old Town above the waterfall. The town is built from the
# owner's Moonfall pieces (old_towe.zip: the same exports as The Cursed Realm's walls, gates, stairs, colonnade and statue, plus the
# lamp pillar and the knight). The two new models are Arena-only; The Cursed Realm skips them. (Round 2, owner: the waterfall
# model read as a faceted blob from the game's camera; it is gone, the falls are procedural: arena-falls.js.)
CITY_NEW=['city-pillar','city-knight']
CITY=['moon-dead-tree','temple-gate','moon-stairs','modular-wall','wall-corner','ruin-arch','guardian-statue','moon-arena']+CITY_NEW
if arena:VILLAGE+=[k for k in CITY if k in _man and k not in VILLAGE]
# Arena Royale (owner 2026-11-22): the Snow Queen's fort. The owner's rigged Ice Queen and Frostwing Scepter, the Moonfall brazier, and
# the owner's Blender castle 'snow-castle' once it is in the manifest (until then arena-frost.js builds an ice palace). Arena-only models
# are skipped by The Cursed Realm.
FORT_NEW=['ice-queen','frost-scepter','snow-castle','queen-vfx']
FORT=FORT_NEW+['brazier']
if arena:VILLAGE+=[k for k in FORT if k in _man and k not in VILLAGE]
sh=open(os.path.join(D,'shell.html'),encoding='utf-8').read()
game_files=['a.js','gi.js','b.js','c.js','r3.js','r4.js','r5.js','r6.js','r7.js','r8.js','r9.js','r10.js','r11.js','r12.js','t1.js','d.js']
# Arena's visual layer must install before d.js initializes the renderer.
# Keep Cursed Realm and classic builds on their original rendering path.
if arena:game_files[-1:-1]=['arena-vfx-tex.js','arena-vfx-runtime.js','arena-vfx-skills.js','arena-vfx-3d.js']
# Eclipse Reign (boss, enemies, legendary weapons) runs in both CURSED builds; it installs after the arena VFX
# so its own aoe kinds are drawn by eclipse-fx.js and everything else still reaches the arena layer.
if sys_on:game_files[-1:-1]=['eclipse.js','eclipse-fx.js','p5-heroes.js']
if arena:game_files[-1:-1]=['summoner.js','summoner-fx.js']   # fifth class: the Spirit Tome (Arena Royale only)
if arena:game_files[-1:-1]=['snow-queen.js']   # the Snow Queen, boss of the ice castle (Arena Royale only; an Eclipse-style boss)
if arena:game_files[-1:-1]=['arena-gfx.js','arena-vfx-particles.js','arena-vfx-hero.js','arena-vfx-fire.js','boss-titan.js','golem-meshy.js','trees-break.js','arena-atmosphere.js','arena-aaa.js','arena-shading.js','arena-vfx-post.js','arena-ice.js','arena-regions.js','arena-city.js','arena-falls.js','arena-frost.js','queen-vfx.js','arena-feel.js']
if arena:game_files.extend(['arena-menu.js','arena-hud.js','arena-vitals.js','arena-combat-controls.js'])
js='\n'.join(open(os.path.join(D,f),encoding='utf-8').read() for f in game_files)
js='const CURSED='+('true' if sys_on else 'false')+';const MOON='+('true' if cur else 'false')+';\n'+js
MOON=['celestial-assets.js','celestial-render.js','moonfall-collision-data.js','moonfall-environment.js','moonfall-biome.js','moonfall-village.js','moonfall-ui.js','moonfall-menu.js','moonfall-inventory.js','moonfall-loading.js']
MOONCSS=['celestial-theme.css','moonfall-ui.css','moonfall-menu.css','moonfall-inventory.css','moonfall-loading.css']
if arena:MOON=[f for f in MOON if f not in ('celestial-render.js','moonfall-collision-data.js','moonfall-environment.js','moonfall-biome.js')]
arena_style='\n<style>'+'\n'.join(open(os.path.join(D,f),encoding='utf-8').read() for f in ['arena-menu.css','arena-combat-hud.css'])+'</style>\n' if arena else ''
if sys_on:
    if arena:
        js += "\nmoody=lsGet('ar_tone2','dark')==='dark';syncTone();installArenaMenuUX();\n"
    js += "\ninstallMoonfallInventory();"
    if arena:
        js += "installArenaHud();installArenaVitals();installArenaCombatControls();"
    js += "installMoonfallLoading();\n"
    import re
    if cur:sh=sh.replace('<title>Arena Royale</title>','<title>The Cursed Realm</title>')
    sh=sh.replace('<title>Arena Royale</title>','<title>Arena Royale</title>').replace('<meta name="theme-color" content="#0c0a08">','<meta name="theme-color" content="#080b16">')
    sh=sh.replace('</style>','</style>\n'+'\n'.join("<link rel=\"stylesheet\" href=\"%s\" onerror=\"window.__moonfallCodeFailure='%s';if(window.moonfallCodeFailure)moonfallCodeFailure('%s')\">"%(f,f,f) for f in MOONCSS),1)
    sh=re.sub(r'  <h1>⚔️ Arena Royale</h1>\n  <div class="sub">[^\n]*</div>',('  <div class="anime-kicker">MOONFALL · DARK CELESTIAL FANTASY</div>\n  <h1>The Cursed Realm</h1>\n  <div class="sub">ใต้เงาจันทราที่แตกสลาย · 32 ผู้กล้า หนึ่งตำนานบทสุดท้าย</div>' if cur else '  <div class="anime-kicker">BATTLE ROYALE · DARK FANTASY</div>\n  <h1>Arena Royale</h1>\n  <div class="sub">32 ผู้กล้า ล่ามอนสเตอร์ เก็บเหรียญ หนึ่งผู้รอดชีวิต</div>'),sh,count=1)
    sh=sh.replace('  <div class="msg" id="menuMsg"></div>',('  <div class="row celestial-tools"><button class="go ghost small" id="moonfallBtn">☽ สำรวจ Moonfall</button><button class="go ghost small" id="celestialInfoBtn">สถานะโมเดล / Performance</button></div>' if cur else '  <div class="row celestial-tools"></div>')+'\n  <div id="celestialAssetNote" role="status">กำลังตรวจสอบไฟล์โมเดล…</div>\n  <div class="msg" id="menuMsg"></div>',1)
    sh=sh.replace('  <div class="tip">','  <button class="anime-help-toggle" id="animeHelp" aria-expanded="false" aria-controls="animeGuide">วิธีเล่นและการควบคุม ▾</button>\n  <div class="tip anime-help-collapsed" id="animeGuide">',1)
    sh=re.sub(r'(<div id="loading"[^>]*><div class="spin"></div><div class="sub"[^>]*>)[^<]*',r'\1กำลังเปิดประตูสู่ Moonfall…',sh,count=1)
    assert sh.count('animeHelp')==1 and sh.count('moonfallBtn')==(1 if cur else 0) and 'anime-kicker' in sh and 'ประตูสู่ Moonfall' in sh
    loading=open(os.path.join(D,'moonfall-loading.html'),encoding='utf-8').read().strip()
    if arena:
        loading=loading.replace('id="loading"','id="loading" data-key-art="assets/ui/arena-citadel.webp"',1)
        loading=loading.replace('THE CURSED REALM','BATTLE ROYALE').replace('>MOONFALL<','>ARENA ROYALE<')
        loading=loading.replace('กำลังเปิดประตูจันทรา','กำลังเปิดประตูสนาม').replace('เมื่อจันทราร่วงหล่น ตำนานบทใหม่จึงเริ่มต้น','เตรียมตัวเข้าสู่สนามประลอง').replace('พลังจันทรา','อาวุธ')
    sh=sh.replace('<div id="loading" class="ov hidden"><div class="spin"></div><div class="sub" style="font-size:15px;margin-top:12px">กำลังเปิดประตูสู่ Moonfall…</div></div>',loading)
    sh=re.sub(r'(<button[^>]*id="(?:soloBtn|qmBtn|hostBtn|joinBtn|lobbyStart|moonfallBtn)"[^>]*)(>)',r'\1 disabled\2',sh)
    if arena:sh=sh.replace('</head>','<script>window.CELESTIAL_KEYS='+repr(VILLAGE).replace("'",'"')+'</script>\n'+arena_style+'</head>',1)
    else:sh=sh.replace('</head>','<script>window.CELESTIAL_SKIP='+repr(NATURE+P5+P5W+HOUSES+CITY_NEW+FORT_NEW).replace("'",'"')+'</script>\n</head>',1)  # Moonfall has no meadow dressing
    sh=sh.replace('<!--TURN-->','<!--TURN-->\n'+'\n'.join("<script src=\"%s\" onerror=\"moonfallCodeFailure('%s')\"></script>"%(f,f) for f in MOON),1)
def critical_libs(text):
    if sys_on:
        for name in ['engine.min.js','models2.js','sfx.js']:
            text=text.replace('src="'+name+'"', 'src="'+name+'" onerror="moonfallCodeFailure(\''+name+'\')"')
    return text
if not web:
    libs='<script src="engine.min.js"></script>\n<script src="models2.js" async></script>\n<script src="models4.js" async></script>\n<script src="peerjs.min.js"></script>\n<script src="sfx.js" async></script>'
    libs=critical_libs(libs)
    out=sh.replace('<!--LIBS-->',libs).replace('<!--TURN-->','<script src="turn.js"></script>').replace('/*GAME*/',js)
    p=os.path.join(D,'cursed.html' if cur else 'classic.html' if classic else 'index.html')
else:
    libs='<script src="engine.min.js"></script>\n<script src="models2.js" async></script>\n<script src="models4.js" async></script>\n<script src="sfx.js" async></script>'
    libs=critical_libs(libs)
    st=sh[sh.index('<style>'):sh.index('</style>')+8].replace("html,body{margin:0;height:100%;","html,body{margin:0;height:100%;padding:0!important;")
    body=sh[sh.index('<body>')+6:sh.rindex('</body>')].replace('<!--LIBS-->',libs).replace('<!--TURN-->','').replace('/*GAME*/',js)
    out=('<title>The Cursed Realm</title>\n' if cur else '<title>Arena Royale</title>\n')+st+'\n'+body
    if sys_on:out=out.replace(st,st+''.join('\n<style>'+open(os.path.join(D,f),encoding='utf-8').read()+'</style>' for f in MOONCSS)+arena_style,1)
    p=os.path.join(os.path.dirname(D),'cursed_artifact.html' if cur else 'classic_artifact.html' if classic else 'artifact.html')
open(p,'w',encoding='utf-8').write(out)
print(p,len(out))
