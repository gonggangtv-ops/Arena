"""Record the same player Meteor cast on two deployed Arena revisions over HTTP.

Usage: python3 src/tests/smoke-arena-meteor.py SITE OUTPUT {before,after} {high,low}
OUTPUT contains temporary renders and a JSON measurement record. High quality
captures a motion sequence in addition to the five selected phase frames.
"""
import argparse
import base64
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
from threading import Thread

from playwright.sync_api import sync_playwright


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


CAST = """() => {
   __game.skipDrop();
   const hero=ME();let spot=null;
   for(let y=CY-2200;y<CY+2200&&!spot;y+=160)for(let x=CX-2000;x<CX+2000&&!spot;x+=160){
     if(REG.at(x,y)!==0||!walkable(x,y,30)||onBridge(x,y)||inWater(x,y)||inDG({x,y},40)||cityIn({x,y},0))continue;
     if(WD.houses.some(h=>Math.hypot(h.x-x,h.y-y)<420)||WD.trees.some(t=>Math.hypot(t.x-x,t.y-y)<245))continue;
     if(!walkable(x-130,y+135,30)||Math.abs(R3.gY(x,y)-R3.gY(x+140,y))>10)continue;
     spot={x,y};
   }
   if(!spot)throw Error('no clearing');Object.assign(hero,{x:spot.x-120,y:spot.y+125,tx:spot.x-120,ty:spot.y+125,stunT:0,fuseT:0,xcd:0,xs:SPX.findIndex(s=>s?.k==='meteor')});
   const target=units.find(u=>u.hero&&u.bot&&isEnemy(hero,u));
   Object.assign(target,{x:spot.x+135,y:spot.y-15,tx:spot.x+135,ty:spot.y-15,stunT:90,hp:2400,maxHp:2400});
   units=[hero,target];UMAP=new Map(units.map(u=>[u.id,u]));aoes=[];projs=[];fxq=[];window.__target=target;
   R3.tx=hero.x;R3.ty=hero.y;R3.ly=R3.gY(hero.x,hero.y);R3.camK=1;gameT=110;R3.t=110;shakeA=0;
   R3.frame(1/60);const ok=castSpecial(hero,spot);
   const a=aoes.find(q=>q.kind==='meteor'&&q.owner===hero&&q.delay===.85);
   if(!ok||!a)throw Error('cast failed');
   window.__terrainLogic=heightAt(spot.x,spot.y);window.__bedStart=R3.terrain.geometry.attributes.position.array.slice();window.__cast=a;window.__n=0;window.__phases=(end)=>{
     const dt=1/30,r=R3.renderer,gl=r.getContext(),pixel=new Uint8Array(4);
     let elapsed=0;
     while(__n<end){hostUpdate(dt);gameT=110+(__n+1)*dt;__n++;
       if(__n<end){const draw=R3.draw;try{R3.draw=()=>{};R3.frame(dt)}finally{R3.draw=draw}}}
     r.info.autoReset=false;r.info.reset();const start=performance.now();
     R3.frame(dt);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
     elapsed=performance.now()-start;const pic=r.domElement.toDataURL('image/png');
     r.info.autoReset=true;return {pic,elapsed,calls:r.info.render.calls,triangles:r.info.render.triangles,geometries:r.info.memory.geometries,textures:r.info.memory.textures,
       done:a.done,t:a.t,targetHP:target.hp};
   };
   return {seed:WD.seed,quality:R3.hi,mobile:R3.mobile,spot,r:a.r,delay:a.delay,damage:a.dmg,burn:a.burn,cooldown:hero.xcd};
 }"""


def capture(browser, url, out, version, quality):
    mobile = quality == 'low'
    page = browser.new_page(
        viewport={'width': 800 if mobile else 900, 'height': 450 if mobile else 520},
        device_scale_factor=1, is_mobile=mobile, has_touch=mobile,
        **({'user_agent': 'Mozilla/5.0 (Linux; Android 14) Mobile'} if mobile else {}))
    page.set_default_timeout(240000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def log(message):
        text = message.text.lower()
        if ((message.type == 'error' and any(s in text for s in ('shader', 'webgl', 'program not valid')))
                or (message.type == 'warning' and ('meteor vfx' in text or 'fire vfx' in text))):
            errors.append(message.text[:1500])

    page.on('console', log)
    page.add_init_script(f"requestAnimationFrame=()=>0;localStorage.setItem('ar_q','{quality}');"
                         "localStorage.setItem('ar_mute','1');localStorage.setItem('ar_snd','2');")

    def seed_world(route):
        response = route.fetch()
        seed = 'R3.menuSeed=Math.floor(Math.random()*1e9);setupWorld'
        source = response.text()
        assert source.count(seed) == 1
        route.fulfill(response=response, body=source.replace(seed, 'R3.menuSeed=777;setupWorld'))

    page.route('**/moonfall-loading.js', seed_world)
    page.goto(url, wait_until='domcontentloaded')
    page.wait_for_function('window.MoonfallLoading?.isReady()||window.MoonfallLoading?.snapshot().failed',
                           polling=150)
    assert page.evaluate('MoonfallLoading.isReady()')
    page.evaluate('Math.random=mulberry32(222)')
    page.locator('#soloBtn').click()
    page.wait_for_function("state==='play'&&document.getElementById('loading').classList.contains('hidden')",
                           polling=100)
    info = page.evaluate(CAST)
    frames = {5: 'warning', 22: 'release', 28: 'impact', 51: 'crater', 107: 'aftermath'}
    if not mobile:
        for tick in (2, 8, 11, 14, 17, 20, 24, 25, 26, 30, 32, 35, 38, 41, 45, 58, 68, 82):
            frames[tick] = f'f{tick:03d}'
    results = {}
    for tick, name in sorted(frames.items()):
        frame = page.evaluate('__phases', tick)
        png = base64.b64decode(frame.pop('pic').split(',', 1)[1])
        (out / f'{version}-{quality}-{name}.png').write_bytes(png)
        results[name] = frame
    checks = {}
    if version == 'after':
        checks = page.evaluate(Path(__file__).with_name('meteor-probe.js').read_text())
    page.close()
    return {'cast': info, 'frames': results, 'errors': errors, 'checks': checks}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('site', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('revision', choices=('before', 'after'))
    parser.add_argument('quality', choices=('high', 'low'))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    with ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(args.site))) as server:
        Thread(target=server.serve_forever, daemon=True).start()
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'),
                                         args=['--no-sandbox', '--enable-unsafe-swiftshader'])
            url = f'http://127.0.0.1:{server.server_port}/index.html'
            report = capture(browser, url, args.output, args.revision, args.quality)
            (args.output / f'{args.revision}-{args.quality}.json').write_text(json.dumps(report, indent=2))
            assert not report['errors'], report['errors']
            browser.close()
        server.shutdown()


if __name__ == '__main__':
    main()
