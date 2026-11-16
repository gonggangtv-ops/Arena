"""Round 2 menu/room/lobby UI checks with original handlers and offline lobby
fixtures. No public room is created and no messages are sent to other players.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import json
from pathlib import Path
import shutil
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'reports/moonfall-ui'


class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass


def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start();OUT.mkdir(exist_ok=True)
    missing=json.loads((ROOT/'assets/meshy/manifest.json').read_text())
    for asset in missing['assets'].values():asset['available']=False
    results=[]
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox','--enable-unsafe-swiftshader'])
            for entry in ['index.html','cursed.html']:
                for label,width,height,mobile in [('desktop',1100,700,False),('landscape',844,390,True),('portrait',390,844,True)]:
                    context=browser.new_context(viewport={'width':width,'height':height},is_mobile=mobile,has_touch=mobile,
                        **({'user_agent':'Mozilla/5.0 (Linux; Android 14) Mobile'} if mobile else {}))
                    page=context.new_page();page.set_default_timeout(30000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                    page.route('**/assets/meshy/manifest.json',lambda route:route.fulfill(json=missing))
                    page.route('**/favicon.ico',lambda route:route.fulfill(status=204))
                    page.add_init_script("window.__noMenu=true;window.requestAnimationFrame=cb=>1;localStorage.setItem('ar_view','2d');localStorage.setItem('ar_sound','off')")
                    page.goto(f'http://127.0.0.1:{server.server_port}/{entry}')
                    page.wait_for_function('document.getElementById("menu").dataset.moonfallMenu==="1"&&MoonfallUI.snapshot().state==="loaded"',polling=100)
                    bounds=page.locator('#soloBtn').bounding_box();assert bounds['y']+bounds['height']<=height, (entry,label,bounds)
                    assert not page.locator('#moonfallWeaponGuide').evaluate('(e)=>e.open') and not page.locator('#viewBtn').is_visible()
                    assert page.locator('#codex > *').count()==9 and page.locator('.moonfall-menu-skill').count()==27
                    assert page.evaluate('document.getElementById("menu").scrollWidth<=innerWidth')
                    assert page.locator('#looks button').evaluate_all('(buttons)=>buttons.every(b=>b.getBoundingClientRect().width>=44&&b.getBoundingClientRect().height>=44)')
                    page.screenshot(path=str(OUT/f'{entry[:-5]}-menu-{label}.png'),scale='css')
                    page.locator('#pname').fill('Moonfall QA')
                    page.locator('#looks button').nth(2).click();assert page.locator('#looks button').nth(2).get_attribute('aria-pressed')=='true'
                    page.locator('#moonfallMenuSettings summary').focus();page.keyboard.press('Enter');assert page.locator('#viewBtn').is_visible()
                    page.locator('#fuseBtn').click();assert page.locator('#fuseOv').is_visible();page.locator('#fuseBack').click()
                    page.locator('#moonfallMenuSettings summary').click()
                    page.locator('#moonfallWeaponGuide summary').click();assert page.locator('#codex').is_visible()
                    page.screenshot(path=str(OUT/f'{entry[:-5]}-guide-{label}.png'),scale='css')
                    page.locator('#moonfallWeaponGuide summary').click()
                    page.locator('#celestialInfoBtn').click();assert page.locator('#celestialPanel').is_visible();page.locator('#celestialClose').click()
                    # Original lobby renderer and configuration handlers; transport absent.
                    page.evaluate("""()=>{net.tr=null;net.mode='host';net.qm=false;net.code='MOON1';net.rname='ห้องทดสอบ';net.pub=false;net.cl={};net.chat=[];
                        net.cfg={max:4,fill:16,size:'M',ts:2};net.lobby=[{name:'Moonfall QA',look:2,ctrl:'self',team:0},{name:'เพื่อนทดสอบ',look:1,ctrl:'qa-peer',team:0}];showLobby();}""")
                    assert page.locator('#cfgBox').is_visible() and page.locator('#lobbyStart').is_visible()
                    start=page.locator('#lobbyStart').bounding_box();assert start['y']+start['height']<=height,(entry,label,start)
                    page.locator('#cfgMode').select_option('4');assert page.evaluate('net.cfg.ts===4')
                    page.locator('#chatIn').fill('ข้อความทดสอบใน fixture');page.locator('#chatForm button').click();assert page.evaluate('net.chat.length===1 && net.tr===null')
                    assert page.locator('#lobby').evaluate('(e)=>e.scrollWidth<=innerWidth')
                    page.locator('#lobby').evaluate('(e)=>e.scrollTop=0');page.screenshot(path=str(OUT/f'{entry[:-5]}-lobby-{label}.png'),scale='css')
                    page.evaluate("net.mode='client';net.youI=1;renderLobby()")
                    assert page.locator('#lobbyStart').is_hidden() and page.locator('#cfgBox').is_hidden()
                    assert page.locator('#chatBox').is_visible()
                    page.evaluate("net.mode='search';renderLobby()")
                    assert page.locator('#lobbySpin').is_visible() and page.locator('#chatBox').is_hidden()
                    page.evaluate("net.mode='solo';net.qm=false;net.tr=null;roomsCtx=false;showMenu()")
                    # Start via the retained original Solo handler. Portrait keeps its
                    # existing rotate-to-landscape gameplay flow.
                    page.locator('#soloBtn').click(no_wait_after=True);page.wait_for_function("state==='play'",polling=100)
                    assert page.evaluate('units.filter(u=>u.hero).length===32&&myName()==="Moonfall QA"')
                    assert not errors,errors
                    results.append({'entry':entry,'viewport':label,'soloActionVisible':True,'nativeDetailsKeyboard':True,'originalConfigAndSolo':True,
                        'localLobbyHostGuestSearch':True,'transportDuringLobby':None,'icons':27,'errors':errors})
                    (OUT/'menu-results.json').write_text(json.dumps(results,indent=2)+'\n')
                    print('PASS',entry,label,': menu priority, 44px cloak buttons, accordion keyboard, art, original Solo/config, offline lobby roles, no overflow/errors',flush=True)
                    context.close()
            page=browser.new_page();page.add_init_script("localStorage.setItem('ar_view','2d');window.__noMenu=true;window.requestAnimationFrame=cb=>1")
            page.route('**/assets/meshy/manifest.json',lambda route:route.fulfill(json=missing))
            page.route('**/assets/ui/moonfall-skills.png',lambda route:route.fulfill(content_type='image/png',body=b'intentionally invalid image'))
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            page.wait_for_function('window.MoonfallUI?.snapshot().state==="fallback"',polling=100)
            assert page.locator('.moonfall-menu-skill').count()==0
            assert page.locator('#codex .sks span').evaluate_all('(spans)=>spans.length===27&&spans.every(s=>s.textContent.trim().length>0)')
            print('PASS image failure: menu retains original skill symbols',flush=True)
            browser.close()
    finally:
        server.shutdown();server.server_close()


if __name__=='__main__':main()
