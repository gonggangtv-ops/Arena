"""Round 1 HUD integration with real atlas, game states, keyboard/native touch,
both entries, mobile preview layout and missing-image glyph fallback.
Requires Python Playwright and Chromium. Does not call Meshy or generation APIs.
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
    OUT.mkdir(exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    results=[]
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox','--enable-unsafe-swiftshader'])
            for entry,mobile in [('index.html',False),('cursed.html',False),('index.html',True)]:
                context=browser.new_context(viewport={'width':844 if mobile else 1100,'height':390 if mobile else 700},
                    is_mobile=mobile,has_touch=mobile,device_scale_factor=3 if mobile else 1,
                    **({'user_agent':'Mozilla/5.0 (Linux; Android 14) Mobile'} if mobile else {}))
                page=context.new_page();page.set_default_timeout(180000);errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.on('console',lambda m:errors.append(m.text) if m.type=='error' and '404' not in m.text else None)
                page.route('**/favicon.ico',lambda route:route.fulfill(status=204))
                page.add_init_script("window.__noMenu=true;window.requestAnimationFrame=cb=>1;localStorage.setItem('ar_q','low');localStorage.setItem('ar_sound','off')")
                page.goto(f'http://127.0.0.1:{server.server_port}/{entry}',timeout=180000)
                page.wait_for_function('window.MoonfallUI?.snapshot().state==="loaded"',polling=100)
                page.wait_for_function('CelestialAssets.snapshot().assets.length===17&&CelestialAssets.snapshot().assets.every(a=>["loaded","error"].includes(a.state))',polling=100)
                assert page.evaluate('MoonfallUI.snapshot().loadedIcons===27')
                page.evaluate('R3.menuSeed=20261116;R3.menuReady=1')
                page.locator('#moonfallBtn').click(no_wait_after=True);page.wait_for_function("state==='play'",polling=100);page.wait_for_timeout(250)
                data=page.evaluate("""()=>{
                    __game.lvl(6);__game.give('sword',2,2);const me=ME();me.skl=[1,1,1];me.cd=[0,0,0];me.mp=me.maxMp;
                    const before=JSON.stringify([UI.sk,UI.learn,UI.atk,WD.walls,WD.solids]),atlas=MoonfallUI.snapshot().atlas;
                    let named=0;for(const key of WK)for(let i=0;i<3;i++){
                        if(!MoonfallUI.icon(key,i)||atlas.skillNames[key][i]!==SK[key][i].n)throw Error('Wrong icon mapping '+key+':'+i);named++;
                    }
                    const states=[];
                    for(const [kind,level,cd,mp] of [['ready',1,0,9999],['cooldown',1,4,9999],['mana',1,0,0],['locked',0,0,9999]]){
                        me.skl[0]=level;me.cd[0]=cd;me.mp=mp;states.push(MoonfallUI.state(me,0).kind);
                        drawSkillBtn(UI.sk[0],0,me);
                    }
                    me.skl=[1,1,1];me.cd=[0,0,0];me.mp=me.maxMp;announce=null;R3.frame(1/30);
                    const fused=Object.keys(SKI).filter(key=>!WK.includes(key)).every(key=>!!skIco(key,0));
                    return{named,states,fused,unchanged:before===JSON.stringify([UI.sk,UI.learn,UI.atk,WD.walls,WD.solids]),
                        touchDiameters:UI.sk.map(b=>b.r*2),hotkeys:MoonfallUI.snapshot().hotkeys};
                }""")
                assert data['named']==27 and data['states']==['ready','cooldown','mana','locked'] and data['fused'] and data['unchanged'],data
                assert data['hotkeys']==['Q','E','R']
                if mobile:
                    assert min(data['touchDiameters'])>=44,data
                    session=context.new_cdp_session(page);skill=page.evaluate('({x:UI.sk[1].x,y:UI.sk[1].y})')
                    session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[skill]})
                    session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                    assert page.evaluate('ME().shieldHp>0&&ME().cd[1]>0')
                    attack=page.evaluate('({x:UI.atk.x,y:UI.atk.y})');session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[attack]});assert page.evaluate('atkHeld')
                    session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert page.evaluate('!atkHeld')
                else:
                    # E is the actual second-skill binding; movement remains W.
                    page.keyboard.press('e');assert page.evaluate('ME().shieldHp>0&&ME().cd[1]>0')
                    point=page.evaluate('({x:UI.sk[0].x,y:UI.sk[0].y})');page.mouse.move(point['x'],point['y'])
                    assert page.locator('#moonfallSkillHint').is_visible()
                    assert 'Q / 1' in page.locator('#moonfallSkillHint').inner_text()
                    page.mouse.move(400,100);assert page.locator('#moonfallSkillHint').is_hidden()
                for key in ['sword','fire','frost','storm']:
                    page.evaluate("key=>{__game.give(key,2,2);ME().skl=[1,1,1];ME().cd=[0,0,0];ME().mp=ME().maxMp;announce=null;R3.frame(1/30);}",key)
                    page.screenshot(path=str(OUT/f'{"mobile" if mobile else entry[:-5]}-{key}.png'),scale='css')
                page.evaluate("ME().cd=[5,0,0];ME().mp=0;ME().skl[2]=0;R3.frame(1/30)")
                page.screenshot(path=str(OUT/f'{"mobile" if mobile else entry[:-5]}-states.png'),scale='css')
                assert not errors,errors
                results.append({'entry':entry,'mobileEmulation':mobile,**data,'nativeTouch':mobile,'keyboardSkill':not mobile,'errors':errors})
                (OUT/'results.json').write_text(json.dumps(results,indent=2)+'\n')
                print(f'PASS {entry} mobile={mobile}: real 27-icon atlas, states, mappings, fused fallback, hit areas, original skill input and errors',flush=True)
                context.close()
            page=browser.new_page(viewport={'width':390,'height':844})
            page.goto(f'http://127.0.0.1:{server.server_port}/moonfall-ui-preview.html');page.wait_for_function('document.querySelectorAll(".disc").length===27')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.get_by_role('button',name='มานาไม่พอ',exact=True).click();assert page.evaluate('document.body.dataset.state==="mana"')
            page.screenshot(path=str(OUT/'gallery-mobile.png'),full_page=True,scale='css');page.close()
            # Intentionally bad image verifies graceful fallback without GLB downloads.
            page=browser.new_page();page.add_init_script("localStorage.setItem('ar_view','2d');window.__noMenu=true;window.requestAnimationFrame=cb=>1")
            missing=json.loads((ROOT/'assets/meshy/manifest.json').read_text())
            for asset in missing['assets'].values():asset['available']=False
            page.route('**/assets/meshy/manifest.json',lambda route:route.fulfill(json=missing))
            page.route('**/assets/ui/moonfall-skills.png',lambda route:route.fulfill(content_type='image/png',body=b'intentionally invalid image'))
            page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('window.MoonfallUI?.snapshot().state==="fallback"')
            assert page.evaluate('!!skIco("sword",0)&&MoonfallUI.snapshot().loadedIcons===0')
            print('PASS atlas image failure: original glyph icons remain usable; mobile gallery has no horizontal overflow',flush=True)
            browser.close()
    finally:
        server.shutdown();server.server_close()


if __name__=='__main__':main()
