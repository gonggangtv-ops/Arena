import sys,os
D=os.path.dirname(os.path.abspath(__file__))
web='web' in sys.argv
cur='cursed' in sys.argv
classic='classic' in sys.argv          # the old v2.5 game, kept for reference (classic.html, not deployed)
arena=not cur and not classic          # index.html: every Cursed Realm system, original scenery, Meshy village houses
sys_on=cur or arena
VILLAGE=['house-cottage','house-long','house-witch','market-stall','village-well','street-lantern','stone-bridge','plaza-fountain']
# nature dressing joins the required set once its models are in the manifest
NATURE=['mossy-boulder','lupine-clump','flower-cushion','tall-grass','river-stones']
import json as _j
_man=_j.load(open(os.path.join(D,'..','app','src','main','assets','assets','meshy','manifest.json'),encoding='utf-8'))['assets']
VILLAGE+=[k for k in NATURE if k in _man]
sh=open(os.path.join(D,'shell.html'),encoding='utf-8').read()
game_files=['a.js','gi.js','b.js','c.js','r3.js','r4.js','r5.js','r6.js','r7.js','r8.js','r9.js','r10.js','r11.js','r12.js','t1.js','d.js']
# Arena's visual layer must install before d.js initializes the renderer.
# Keep Cursed Realm and classic builds on their original rendering path.
if arena:game_files[-1:-1]=['arena-vfx-runtime.js','arena-vfx-skills.js']
js='\n'.join(open(os.path.join(D,f),encoding='utf-8').read() for f in game_files)
js='const CURSED='+('true' if sys_on else 'false')+';const MOON='+('true' if cur else 'false')+';\n'+js
MOON=['celestial-assets.js','celestial-render.js','moonfall-collision-data.js','moonfall-environment.js','moonfall-biome.js','moonfall-village.js','moonfall-ui.js','moonfall-menu.js','moonfall-inventory.js','moonfall-loading.js']
MOONCSS=['celestial-theme.css','moonfall-ui.css','moonfall-menu.css','moonfall-inventory.css','moonfall-loading.css']
if arena:MOON=[f for f in MOON if f not in ('celestial-render.js','moonfall-collision-data.js','moonfall-environment.js','moonfall-biome.js')]
if sys_on:
    js += "\ninstallMoonfallInventory();installMoonfallLoading();\n"
    import re
    if cur:sh=sh.replace('<title>Arena Royale</title>','<title>The Cursed Realm</title>')
    sh=sh.replace('<title>Arena Royale</title>','<title>Arena Royale</title>').replace('<meta name="theme-color" content="#0c0a08">','<meta name="theme-color" content="#080b16">')
    sh=sh.replace('</style>','</style>\n'+'\n'.join("<link rel=\"stylesheet\" href=\"%s\" onerror=\"window.__moonfallCodeFailure='%s';if(window.moonfallCodeFailure)moonfallCodeFailure('%s')\">"%(f,f,f) for f in MOONCSS),1)
    sh=re.sub(r'  <h1>⚔️ Arena Royale</h1>\n  <div class="sub">[^\n]*</div>',('  <div class="anime-kicker">MOONFALL · DARK CELESTIAL FANTASY</div>\n  <h1>The Cursed Realm</h1>\n  <div class="sub">ใต้เงาจันทราที่แตกสลาย · 32 ผู้กล้า หนึ่งตำนานบทสุดท้าย</div>' if cur else '  <div class="anime-kicker">BATTLE ROYALE · DARK FANTASY</div>\n  <h1>Arena Royale</h1>\n  <div class="sub">32 ผู้กล้า ล่ามอนสเตอร์ เก็บเหรียญ หนึ่งผู้รอดชีวิต</div>'),sh,count=1)
    sh=sh.replace('  <div class="msg" id="menuMsg"></div>',('  <div class="row celestial-tools"><button class="go ghost small" id="moonfallBtn">☽ สำรวจ Moonfall</button><button class="go ghost small" id="celestialInfoBtn">สถานะโมเดล / Performance</button></div>' if cur else '  <div class="row celestial-tools"></div>')+'\n  <div id="celestialAssetNote" role="status">กำลังตรวจสอบไฟล์โมเดล…</div>\n  <div class="msg" id="menuMsg"></div>',1)
    sh=sh.replace('  <div class="tip">','  <button class="anime-help-toggle" id="animeHelp" aria-expanded="false" aria-controls="animeGuide">วิธีเล่นและการควบคุม ▾</button>\n  <div class="tip anime-help-collapsed" id="animeGuide">',1)
    sh=re.sub(r'(<div id="loading"[^>]*><div class="spin"></div><div class="sub"[^>]*>)[^<]*',r'\1กำลังเปิดประตูสู่ Moonfall…',sh,count=1)
    assert sh.count('animeHelp')==1 and sh.count('moonfallBtn')==(1 if cur else 0) and 'anime-kicker' in sh and 'ประตูสู่ Moonfall' in sh
    sh=sh.replace('<div id="loading" class="ov hidden"><div class="spin"></div><div class="sub" style="font-size:15px;margin-top:12px">กำลังเปิดประตูสู่ Moonfall…</div></div>',(lambda t:t if cur else t.replace('THE CURSED REALM','ARENA ROYALE'))(open(os.path.join(D,'moonfall-loading.html'),encoding='utf-8').read().strip()))
    sh=re.sub(r'(<button[^>]*id="(?:soloBtn|qmBtn|hostBtn|joinBtn|lobbyStart|moonfallBtn)"[^>]*)(>)',r'\1 disabled\2',sh)
    if arena:sh=sh.replace('</head>','<script>window.CELESTIAL_KEYS='+repr(VILLAGE).replace("'",'"')+'</script>\n</head>',1)
    else:sh=sh.replace('</head>','<script>window.CELESTIAL_SKIP='+repr(NATURE).replace("'",'"')+'</script>\n</head>',1)  # Moonfall has no meadow dressing
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
    if sys_on:out=out.replace(st,st+''.join('\n<style>'+open(os.path.join(D,f),encoding='utf-8').read()+'</style>' for f in MOONCSS),1)
    p=os.path.join(os.path.dirname(D),'cursed_artifact.html' if cur else 'classic_artifact.html' if classic else 'artifact.html')
open(p,'w',encoding='utf-8').write(out)
print(p,len(out))
