"""Exercise the shipped Meshy exports in Chromium, without API calls.

Requires Python Playwright and Chromium. Saves evidence in reports/real-meshy/.
Software rendering and mobile emulation do not certify hardware FPS.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'reports/real-meshy'


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    OUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    reports = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=shutil.which('chromium'),
                args=['--no-sandbox', '--enable-unsafe-swiftshader'])
            for entry, mobile in [('index.html', False), ('cursed.html', False), ('index.html', True)]:
                context = browser.new_context(viewport={'width': 844 if mobile else 1100, 'height': 390 if mobile else 700},
                    is_mobile=mobile, has_touch=mobile, device_scale_factor=3 if mobile else 1,
                    **({'user_agent': 'Mozilla/5.0 (Linux; Android 14) Mobile'} if mobile else {}))
                page = context.new_page()
                page.set_default_timeout(180000)
                errors, failed = [], []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('console', lambda message: errors.append(message.text)
                    if message.type == 'error' and '404' not in message.text else None)
                page.on('response', lambda response: failed.append(response.url)
                    if '.glb' in response.url and response.status != 200 else None)
                page.route('**/favicon.ico', lambda route: route.fulfill(status=204))
                page.add_init_script("""window.__noMenu=true;window.requestAnimationFrame=cb=>1;
                    localStorage.setItem('ar_q','low');localStorage.setItem('ar_sound','off');""")
                page.goto(f'http://127.0.0.1:{server.server_port}/{entry}', timeout=180000)
                page.wait_for_function('CelestialAssets.snapshot().assets.length===13 && CelestialAssets.snapshot().assets.every(a=>["loaded","error"].includes(a.state))', polling=100)
                assets = page.evaluate('CelestialAssets.snapshot().assets')
                assert all(a['state'] == 'loaded' for a in assets), assets
                assert all(a['inspection']['residentTextureMax'] <= (512 if mobile else 1024) for a in assets)
                assert not page.evaluate('R3.inspectCelestialWarrior().ready')
                page.evaluate('R3.menuSeed=20261116;R3.menuReady=1')
                page.locator('#moonfallBtn').click(no_wait_after=True)
                page.wait_for_function("state==='play'", polling=100)
                page.wait_for_timeout(250)
                result = page.evaluate("""() => {
                    announce=null;R3.frame(1/30);R3.scene.updateMatrixWorld(true);
                    const T=THREE,l=WD.moonfall,C=WD.castle,names=new Set();
                    R3.scene.traverse(n=>{if(n.isInstancedMesh)names.add(n.name);});
                    const scenery=CelestialAssets.snapshot().assets.filter(a=>a.key!=='celestial-warrior').map(a=>a.key);
                    const present=scenery.every(k=>names.has('moonfall-'+k));
                    const passage=[];
                    for(const key of ['temple-gate','ruin-arch','portal-frame']){
                        const p=l.props.find(p=>p.asset===key),objects=[];
                        R3.scene.traverse(n=>{if(n.name==='moonfall-'+key)objects.push(n);});
                        const clear=[55,110].every(height=>{
                            const ray=new T.Raycaster(new T.Vector3(p.x-l.depth.x*150,R3.gY(p.x,p.y)+height,p.y-l.depth.y*150),new T.Vector3(l.depth.x,0,l.depth.y),0,300);
                            return ray.intersectObjects(objects).length===0;
                        });
                        passage.push({key,clear,walk:!blockedAt(p,26),nav:!navBlocked(p.x,p.y)});
                    }
                    const groundCheck=(key,x,y,originY=500)=>{
                        const objects=[];R3.scene.traverse(n=>{if(n.name==='moonfall-'+key)objects.push(n);});
                        const ray=new T.Raycaster(new T.Vector3(x,originY,y),new T.Vector3(0,-1,0),0,600),hit=ray.intersectObjects(objects)[0];
                        return {key,expected:R3.gY(x,y),actual:hit?.point.y??null};
                    };
                    const r=l.ramps[0],heights=[];
                    for(const t of [-.375,-.25,0,.25,.375]){const p=C.loc(r.a,r.b+t*r.length);heights.push(groundCheck('moon-stairs',p.x,p.y));}
                    heights.push(groundCheck('moon-arena',l.core.x,l.core.y));
                    heights.push(groundCheck('temple-gate',l.gate.x,l.gate.y,40));
                    const collision=JSON.stringify([WD.walls,WD.solids]),memories=[];
                    for(const q of ['low','high','low','high','low']){
                        gfxQ=q;R3.setQuality();R3.frame(1/30);
                        memories.push({quality:q,...R3.renderer.info.memory,calls:R3.renderer.info.render.calls,triangles:R3.renderer.info.render.triangles});
                    }
                    return {present,passage,heights,memories,collisionUnchanged:collision===JSON.stringify([WD.walls,WD.solids]),
                        heroes:units.filter(u=>u.hero).length,warriorFallback:[...R3.objs.values()].filter(o=>o.u.hero).every(o=>!o.celestial),
                        mobile:R3.mobile,pixelRatio:R3.renderer.getPixelRatio(),shader:R3.moonfallEffects.some(e=>e.kind==='portal')};
                }""")
                assert result['present'] and result['collisionUnchanged'] and result['warriorFallback'] and result['shader'], result
                assert result['heroes'] == 32, result
                assert all(p['clear'] and p['walk'] and p['nav'] for p in result['passage']), result['passage']
                assert all(p['actual'] is not None and abs(p['expected']-p['actual']) < 1.5 for p in result['heights']), result['heights']
                assert result['memories'][4]['textures'] <= result['memories'][2]['textures'], result['memories']
                assert result['memories'][4]['geometries'] <= result['memories'][2]['geometries'], result['memories']
                assert result['memories'][3]['textures'] <= result['memories'][1]['textures'], result['memories']
                for feature in ['portal-frame', 'moon-stairs', 'moon-arena']:
                    page.evaluate("""feature=>{const p=feature==='moon-arena'?WD.moonfall.core:WD.moonfall.props.find(p=>p.asset===feature);
                        __game.tp(p.x,p.y);R3.tx=R3.ty=R3.ly=undefined;gameT=DAY+20;R3.frame(1/30);}""", feature)
                    page.screenshot(path=str(OUT / f'{"mobile" if mobile else entry[:-5]}-{feature}.png'))
                if mobile:
                    assert result['mobile'] and result['pixelRatio'] == 1
                    session = context.new_cdp_session(page)
                    attack = page.evaluate('({x:UI.atk.x,y:UI.atk.y})')
                    session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [attack]})
                    assert page.evaluate('atkHeld')
                    session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                    session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 100, 'y': 310}]})
                    session.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 145, 'y': 310}]})
                    assert page.evaluate('joy && joy.x>joy.ox+30')
                    session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                    assert page.evaluate('!atkHeld && joy===null')
                    result['nativeTouch'] = True
                assert not errors and not failed, {'errors': errors, 'failedGLBs': failed}
                reports.append({'entry': entry, 'mobileEmulation': mobile, 'assets': assets, **result, 'errors': errors})
                (OUT / 'results.json').write_text(json.dumps(reports, indent=2, ensure_ascii=False)+'\n')
                print(f'PASS {entry} mobile={mobile}: 13 real GLBs, residency, 12 scenery types, openings, surface alignment, quality rebuilds, fallback, errors', flush=True)
                context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
