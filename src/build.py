import sys,os
D=os.path.dirname(os.path.abspath(__file__))
web='web' in sys.argv
cur='cursed' in sys.argv
sh=open(os.path.join(D,'shell.html'),encoding='utf-8').read()
js='\n'.join(open(os.path.join(D,f),encoding='utf-8').read() for f in ['a.js','gi.js','b.js','c.js','r3.js','r4.js','r5.js','r6.js','r7.js','r8.js','r9.js','r10.js','r11.js','r12.js','t1.js','d.js'])
js='const CURSED='+('true' if cur else 'false')+';\n'+js
MOON=['celestial-assets.js','celestial-render.js','moonfall-collision-data.js','moonfall-environment.js','moonfall-biome.js','moonfall-ui.js','moonfall-menu.js','moonfall-inventory.js','moonfall-loading.js']
MOONCSS=['celestial-theme.css','moonfall-ui.css','moonfall-menu.css','moonfall-inventory.css','moonfall-loading.css']
if cur:
    js += "\ninstallMoonfallInventory();installMoonfallLoading();\n"
    import re
    sh=sh.replace('<title>Arena Royale</title>','<title>The Cursed Realm</title>').replace('<meta name="theme-color" content="#0c0a08">','<meta name="theme-color" content="#080b16">')
    sh=sh.replace('</style>','</style>\n'+'\n'.join("<link rel=\"stylesheet\" href=\"%s\" onerror=\"window.__moonfallCodeFailure='%s';if(window.moonfallCodeFailure)moonfallCodeFailure('%s')\">"%(f,f,f) for f in MOONCSS),1)
    sh=re.sub(r'  <h1>⚔️ Arena Royale</h1>\n  <div class="sub">[^\n]*</div>','  <div class="anime-kicker">MOONFALL · DARK CELESTIAL FANTASY</div>\n  <h1>The Cursed Realm</h1>\n  <div class="sub">ใต้เงาจันทราที่แตกสลาย · 32 ผู้กล้า หนึ่งตำนานบทสุดท้าย</div>',sh,count=1)
    sh=sh.replace('  <div class="msg" id="menuMsg"></div>','  <div class="row celestial-tools"><button class="go ghost small" id="moonfallBtn">☽ สำรวจ Moonfall</button><button class="go ghost small" id="celestialInfoBtn">สถานะโมเดล / Performance</button></div>\n  <div id="celestialAssetNote" role="status">กำลังตรวจสอบไฟล์โมเดล…</div>\n  <div class="msg" id="menuMsg"></div>',1)
    sh=sh.replace('  <div class="tip">','  <button class="anime-help-toggle" id="animeHelp" aria-expanded="false" aria-controls="animeGuide">วิธีเล่นและการควบคุม ▾</button>\n  <div class="tip anime-help-collapsed" id="animeGuide">',1)
    sh=re.sub(r'(<div id="loading"[^>]*><div class="spin"></div><div class="sub"[^>]*>)[^<]*',r'\1กำลังเปิดประตูสู่ Moonfall…',sh,count=1)
    assert sh.count('animeHelp')==1 and sh.count('moonfallBtn')==1 and 'anime-kicker' in sh and 'ประตูสู่ Moonfall' in sh
    sh=sh.replace('<div id="loading" class="ov hidden"><div class="spin"></div><div class="sub" style="font-size:15px;margin-top:12px">กำลังเปิดประตูสู่ Moonfall…</div></div>',open(os.path.join(D,'moonfall-loading.html'),encoding='utf-8').read().strip())
    sh=re.sub(r'(<button[^>]*id="(?:soloBtn|qmBtn|hostBtn|joinBtn|lobbyStart|moonfallBtn)"[^>]*)(>)',r'\1 disabled\2',sh)
    sh=sh.replace('<!--TURN-->','<!--TURN-->\n'+'\n'.join("<script src=\"%s\" onerror=\"moonfallCodeFailure('%s')\"></script>"%(f,f) for f in MOON),1)
def critical_libs(text):
    if cur:
        for name in ['engine.min.js','models2.js','sfx.js']:
            text=text.replace('src="'+name+'"', 'src="'+name+'" onerror="moonfallCodeFailure(\''+name+'\')"')
    return text
if not web:
    libs='<script src="engine.min.js"></script>\n<script src="models2.js" async></script>\n<script src="models4.js" async></script>\n<script src="peerjs.min.js"></script>\n<script src="sfx.js" async></script>'
    libs=critical_libs(libs)
    out=sh.replace('<!--LIBS-->',libs).replace('<!--TURN-->','<script src="turn.js"></script>').replace('/*GAME*/',js)
    p=os.path.join(D,'cursed.html' if cur else 'index.html')
else:
    libs='<script src="engine.min.js"></script>\n<script src="models2.js" async></script>\n<script src="models4.js" async></script>\n<script src="sfx.js" async></script>'
    libs=critical_libs(libs)
    st=sh[sh.index('<style>'):sh.index('</style>')+8].replace("html,body{margin:0;height:100%;","html,body{margin:0;height:100%;padding:0!important;")
    body=sh[sh.index('<body>')+6:sh.rindex('</body>')].replace('<!--LIBS-->',libs).replace('<!--TURN-->','').replace('/*GAME*/',js)
    out=('<title>The Cursed Realm</title>\n' if cur else '<title>Arena Royale</title>\n')+st+'\n'+body
    if cur:out=out.replace(st,st+''.join('\n<style>'+open(os.path.join(D,f),encoding='utf-8').read()+'</style>' for f in MOONCSS),1)
    p=os.path.join(os.path.dirname(D),'cursed_artifact.html' if cur else 'artifact.html')
open(p,'w',encoding='utf-8').write(out)
print(p,len(out))
