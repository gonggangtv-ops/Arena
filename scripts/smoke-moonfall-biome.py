"""Real-Meshy biome integration: geometry/collision invariance, native touch,
quality/selector rebuild resources and rendered forest on both game entries.
Requires Playwright and Chromium; results are software GPU measurements only.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'reports/moonfall-biome'


class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*_args):pass


def main():
    OUT.mkdir(exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    reports=[]
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox','--enable-unsafe-swiftshader'])
            for entry,mobile in [('index.html',False),('cursed.html',False),('index.html',True)]:
                context=browser.new_context(viewport={'width':844 if mobile else 1100,'height':390 if mobile else 700},
                    is_mobile=mobile,has_touch=mobile,device_scale_factor=3 if mobile else 1,
                    **({'user_agent':'Mozilla/5.0 (Linux; Android 14) Mobile'} if mobile else {}))
                page=context.new_page();page.set_default_timeout(180000)
                errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                page.on('console',lambda m:errors.append(m.text) if m.type=='error' and '404' not in m.text else None)
                page.route('**/favicon.ico',lambda route:route.fulfill(status=204))
                page.add_init_script("window.__noMenu=true;window.requestAnimationFrame=cb=>1;localStorage.setItem('ar_q','auto');localStorage.setItem('ar_biome','moonfall');localStorage.setItem('ar_sound','off')")
                page.goto(f'http://127.0.0.1:{server.server_port}/{entry}',timeout=180000)
                page.wait_for_function('CelestialAssets.snapshot().assets.length===17&&CelestialAssets.snapshot().assets.every(a=>["loaded","error"].includes(a.state))',polling=100)
                assets=page.evaluate('CelestialAssets.snapshot().assets.filter(a=>CelestialAssets.get(a.key).config.biome==="moonfall")')
                assert len(assets)==4 and all(a['state']=='loaded' for a in assets),assets
                assert all(a['inspection']['textures']==4 and a['inspection']['largestTexture']==2048 and a['inspection']['residentTextureMax']<=(512 if mobile else 1024) for a in assets),assets
                if mobile:assert page.evaluate('!R3.hi && R3.renderer.getPixelRatio()===1')
                # Select through the actual settings UI as well as the adapter API.
                page.locator('#celestialInfoBtn').click()
                page.locator('#moonfallBiomeSelect').select_option('classic');assert not page.evaluate('R3.moonfallBiomeEnabled()')
                page.locator('#moonfallBiomeSelect').select_option('moonfall');assert page.evaluate('R3.moonfallBiomeEnabled()')
                page.locator('#celestialClose').click()
                page.evaluate('R3.menuSeed=20261116;R3.menuReady=1')
                page.locator('#moonfallBtn').click(no_wait_after=True);page.wait_for_function("state==='play'",polling=100)
                page.wait_for_timeout(250)
                page.evaluate("""() => {
                    window.__biomeHash=a=>{const bytes=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return h>>>0;};
                    window.__worldSnapshot=()=>JSON.stringify([WD.walls,WD.solids,WD.rocks,WD.trees,WD.mtrees,WD.paths,WD.moonfall]);
                    window.__biomeWorld=__worldSnapshot();window.__biomeTerrain=__biomeHash(R3.terrain.geometry.attributes.position.array);
                    window.__biomeHeights=__biomeHash(WD.tg.hg);window.__templeCobble=R3.tex('cobble').uuid;
                    const C=WD.castle;let best=null;
                    for(let x=C.x-1400;x<C.x+C.w+1400;x+=120)for(let y=C.y-1400;y<C.y+C.h+1400;y+=120){
                        if(x>C.x-250&&x<C.x+C.w+250&&y>C.y-250&&y<C.y+C.h+250)continue;
                        if(blockedAt({x,y},28)||inDG({x,y},100)||inWater(x,y)||heightAt(x,y)>20)continue;
                        const trees=WD.trees.filter(t=>Math.hypot(t.x-x,t.y-y)<460).length,rocks=WD.rocks.filter(t=>!t.prop&&Math.hypot(t.x-x,t.y-y)<420).length;
                        const score=trees*2+Math.min(rocks,8)*3;if(!best||score>best.score)best={x,y,score,trees,rocks};
                    }
                    window.__biomeSpot=best;__game.tp(best.x,best.y);R3.tx=R3.ty=R3.ly=undefined;announce=null;R3.frame(1/30);
                }""")
                print(f'LOADED {entry} mobile={mobile}: four real biome GLBs and forest',flush=True)
                rebuilds=[]
                for quality,biome in [('low','moonfall'),('low','classic'),('low','moonfall'),('high','moonfall'),('low','moonfall'),('high','moonfall'),('low','moonfall')]:
                    row=page.evaluate("""([quality,biome])=>{
                        gfxQ=quality;R3.setQuality();R3.setMoonfallBiome(biome);R3.frame(1/30);
                        const invariant=__biomeWorld===__worldSnapshot()&&__biomeTerrain===__biomeHash(R3.terrain.geometry.attributes.position.array)&&__biomeHeights===__biomeHash(WD.tg.hg)&&__templeCobble===R3.tex('cobble').uuid;
                        return{quality,biome,invariant,counts:R3.biomeCounts,natureShader:!!R3.terrain.material.userData.moonfallNature,
                            ...R3.renderer.info.memory,calls:R3.renderer.info.render.calls,triangles:R3.renderer.info.render.triangles};
                    }""",[quality,biome])
                    assert row['invariant'] and row['natureShader']==(biome=='moonfall'),row
                    rebuilds.append(row)
                assert rebuilds[6]['textures']<=rebuilds[4]['textures'] and rebuilds[6]['geometries']<=rebuilds[4]['geometries'],rebuilds
                assert rebuilds[5]['textures']<=rebuilds[3]['textures'] and rebuilds[5]['geometries']<=rebuilds[3]['geometries'],rebuilds
                assert rebuilds[3]['counts']['mountainTrees']>rebuilds[6]['counts']['mountainTrees']>0,rebuilds
                assert all(rebuilds[6]['counts']['byAsset'].get(k,0)>0 for k in ['moon-dead-tree','moon-silver-tree','moon-boulder','moon-rock-cluster'])
                assert rebuilds[6]['counts']['trees']==rebuilds[3]['counts']['trees']>0
                print(f'CHECKED {entry} mobile={mobile}: seven quality/biome rebuilds preserve world, terrain and resources',flush=True)
                geometry=page.evaluate("""()=>{
                    const T=THREE,mat=new T.Matrix4(),pos=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();let checked=0,maxRatio=0;
                    const originals=WD.rocks.filter(r=>!r.prop);
                    for(const mesh of R3.biomeBatches.filter(m=>['moon-boulder','moon-rock-cluster'].includes(m.userData.biomeAsset))){
                        for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,mat);mat.decompose(pos,q,s);
                            const r=originals.find(r=>Math.abs(r.x-pos.x)<.02&&Math.abs(r.y-pos.z)<.02);if(!r)throw Error('Rock outside authored collider');
                            maxRatio=Math.max(maxRatio,Math.hypot(s.x,s.z)/(2*r.r));checked++;}
                    }
                    const t=WD.trees.find(t=>Math.hypot(t.x-ME().x,t.y-ME().y)<300),rock=WD.rocks.find(r=>!r.prop&&Math.hypot(r.x-ME().x,r.y-ME().y)<420);
                    const collisions=!!t&&!!rock&&blockedAt(t,10)&&blockedAt(rock,10);
                    const before=new Map(units.filter(u=>u.bot&&!u.dead).map(u=>[u.id,{x:u.x,y:u.y}]));
                    for(let i=0;i<15;i++)hostUpdate(1/30);
                    const moved=units.some(u=>before.has(u.id)&&Math.hypot(u.x-before.get(u.id).x,u.y-before.get(u.id).y)>1);
                    return{checked,maxRatio,collisions,aiLoop:moved,walk:!blockedAt(ME(),ME().r),nav:!navBlocked(ME().x,ME().y)};
                }""")
                assert geometry['checked']>0 and geometry['maxRatio']<=1.001 and geometry['collisions'] and geometry['aiLoop'] and geometry['walk'],geometry
                for quality,biome in [('low','moonfall'),('high','moonfall'),('low','classic')]:
                    page.evaluate("""([q,b])=>{gfxQ=q;R3.setQuality();R3.setMoonfallBiome(b);__game.tp(__biomeSpot.x,__biomeSpot.y);R3.tx=R3.ty=R3.ly=undefined;R3.frame(1/30);}""",[quality,biome])
                    page.screenshot(path=str(OUT/f'{"mobile" if mobile else entry[:-5]}-{biome}-{quality}.png'),scale='css')
                page.evaluate("gfxQ='low';R3.setQuality();R3.setMoonfallBiome('moonfall');R3.frame(1/30)")
                if mobile:
                    session=context.new_cdp_session(page);attack=page.evaluate('({x:UI.atk.x,y:UI.atk.y})')
                    session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[attack]});assert page.evaluate('atkHeld')
                    session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                    session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':100,'y':310}]})
                    session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':145,'y':310}]});assert page.evaluate('joy&&joy.x>joy.ox+30')
                    session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert page.evaluate('joy===null&&!atkHeld')
                assert not errors,errors
                reports.append({'entry':entry,'mobileEmulation':mobile,'assets':assets,'rebuilds':rebuilds,'geometry':geometry,'nativeTouch':mobile,
                    'forest':page.evaluate('__biomeSpot'),'softwareMetrics':page.evaluate('R3.celestialMetrics()'),'errors':errors})
                (OUT/'results.json').write_text(json.dumps(reports,indent=2,ensure_ascii=False)+'\n')
                print(f'PASS {entry} mobile={mobile}: terrain/collision invariants, four variants, density, resources, rocks, AI, selector, touch and errors',flush=True)
                context.close()
            browser.close()
    finally:
        server.shutdown();server.server_close()


if __name__=='__main__':main()
