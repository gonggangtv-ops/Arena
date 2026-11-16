"""Integration regression checks. Requires Python Playwright and Chromium.

Runs the real static game, both entries, quality rebuilds, gameplay, mobile,
snapshot roundtrip, and GLB admission using explicitly synthetic test fixtures.
No test fixture is installed as a production Meshy asset.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
import struct
import tempfile
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def fixture(rig=False):
    """A three-vertex glTF for loader/adapter tests; never presented as artwork."""
    binary = bytearray()
    views, accessors = [], []

    def accessor(values, fmt, component, kind, count, **kwargs):
        while len(binary) % 4:
            binary.append(0)
        offset = len(binary)
        packed = struct.pack('<' + fmt * len(values), *values)
        binary.extend(packed)
        views.append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(packed)})
        accessors.append({'bufferView': len(views)-1, 'componentType': component,
                          'type': kind, 'count': count, **kwargs})
        return len(accessors)-1

    position = accessor([-.5, 0, -.1, .5, 0, -.1, 0, 2, .1], 'f', 5126, 'VEC3', 3,
                        min=[-.5, 0, -.1], max=[.5, 2, .1])
    normal = accessor([0, 0, 1] * 3, 'f', 5126, 'VEC3', 3)
    attributes = {'POSITION': position, 'NORMAL': normal}
    data = {'asset': {'version': '2.0'}, 'scene': 0, 'scenes': [{'nodes': [0]}],
            'nodes': [{'mesh': 0, 'name': 'SYNTHETIC_TEST_TRIANGLE'}],
            'meshes': [{'primitives': [{'attributes': attributes}]}]}
    if rig:
        attributes['JOINTS_0'] = accessor([0, 0, 0, 0] * 3, 'H', 5123, 'VEC4', 3)
        attributes['WEIGHTS_0'] = accessor([1, 0, 0, 0] * 3, 'f', 5126, 'VEC4', 3)
        data['nodes'][0]['skin'] = 0
        data['nodes'] += [{'name': 'RightHand', 'children': [2]}, {'name': 'LeftHand'}]
        data['scenes'][0]['nodes'].append(1)
        data['skins'] = [{'joints': [1, 2], 'skeleton': 1}]
        times = accessor([0, 1], 'f', 5126, 'SCALAR', 2, min=[0], max=[1])
        rotations = accessor([0, 0, 0, 1, 0, .1, 0, .9949874], 'f', 5126, 'VEC4', 2)
        data['animations'] = [{'name': name, 'samplers': [{'input': times, 'output': rotations}],
                               'channels': [{'sampler': 0, 'target': {'node': 1, 'path': 'rotation'}}]}
                              for name in ['Idle', 'Walk', 'Attack', 'Cast', 'Hit', 'Death']]
    while len(binary) % 4:
        binary.append(0)
    data.update(buffers=[{'byteLength': len(binary)}], bufferViews=views, accessors=accessors)
    encoded = json.dumps(data).encode()
    encoded += b' ' * (-len(encoded) % 4)
    length = 12 + 8 + len(encoded) + 8 + len(binary)
    return (struct.pack('<3I', 0x46546C67, 2, length)
            + struct.pack('<2I', len(encoded), 0x4E4F534A) + encoded
            + struct.pack('<2I', len(binary), 0x004E4942) + binary)


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}'
    artifacts = Path(tempfile.mkdtemp(prefix='arena-celestial-'))
    reports = []
    try:
        with sync_playwright() as playwright:
            browser_path = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
            browser = playwright.chromium.launch(
                **({'executable_path': browser_path} if browser_path else {}),
                args=['--no-sandbox', '--enable-unsafe-swiftshader'])

            def new_page(mobile=False):
                context = browser.new_context(viewport={'width': 844 if mobile else 1100, 'height': 390 if mobile else 700},
                                              is_mobile=mobile, has_touch=mobile, device_scale_factor=3 if mobile else 1,
                                              **({'user_agent': 'Mozilla/5.0 (Linux; Android 14) Mobile'} if mobile else {}))
                page = context.new_page()
                page.set_default_timeout(120000)
                errors = []
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('console', lambda m: errors.append(m.text)
                        if m.type == 'error' and '404' not in m.text else None)
                page.route('**/favicon.ico', lambda route: route.fulfill(status=204))
                page.add_init_script("""
                    window.__noMenu=true;
                    window.__nativeRAF=window.requestAnimationFrame.bind(window);
                    window.requestAnimationFrame=cb=>1;
                    localStorage.setItem('ar_q','auto');localStorage.setItem('ar_sound','off');
                """)
                return page, errors

            for entry in ('index.html', 'cursed.html'):
                page, errors = new_page()
                fallback_manifest = json.loads((ROOT / 'assets/meshy/manifest.json').read_text())
                for asset in fallback_manifest['assets'].values():
                    asset['available'] = False
                page.route('**/assets/meshy/manifest.json', lambda route: route.fulfill(json=fallback_manifest))
                page.goto(f'{url}/{entry}', timeout=120000)
                page.wait_for_function('CelestialAssets.snapshot().ready && CelestialAssets.snapshot().assets.length===Object.keys(CelestialAssets.manifest.assets).length && CelestialAssets.snapshot().assets.every(a=>a.state==="missing")', polling=100)
                assert page.evaluate('R3.ok && !TOON')
                assert page.locator('#codex > *').count() == 9
                page.locator('#celestialInfoBtn').click()
                assert 'missing' in page.locator('#celestialAssetList').inner_text()
                page.locator('#celestialClose').click()
                page.screenshot(path=str(artifacts / f'{entry}-menu.png'))
                page.evaluate('R3.menuSeed=20261116;R3.menuReady=1')
                page.locator('#moonfallBtn').click(no_wait_after=True)
                page.wait_for_function("state==='play'", polling=100, timeout=120000)
                page.wait_for_timeout(200)
                # Deterministic Phase 2 collision is generated before original grids/nav.
                phase2 = page.evaluate("""() => {
                    const l=WD.moonfall,C=WD.castle;
                    const opening=blockedAt({x:l.gate.x,y:l.gate.y},26)===false;
                    const columns=l.colliders.filter(p=>p.r);
                    const obstacles=columns.every(p=>blockedAt(p,10));
                    const navigation=columns.every(p=>navBlocked(p.x,p.y));
                    const r=l.ramps[0];let stairs=false;
                    if(r){const a=C.loc(r.a,r.b-r.length*.49),b=C.loc(r.a,r.b+r.length*.49);
                        stairs=R3.gY(b.x,b.y)>R3.gY(a.x,a.y)+30&&!blockedAt(a,20)&&!blockedAt(b,20);}
                    return {version:l.version,opening,obstacles,navigation,stairs,
                        props:Object.keys(R3.moonfallPhase2Counts),shader:R3.moonfallEffects.some(e=>e.kind==='portal'),
                        fire:R3.moonfallEffects.some(e=>e.kind==='flame')};
                }""")
                assert phase2['version']==3 and all(phase2[k] for k in ['opening','obstacles','navigation','stairs','shader','fire']), phase2
                assert len(phase2['props'])>=8, phase2
                # Rendering must not mutate collision data, units, or map bounds.
                result = page.evaluate("""() => {
                    const before=JSON.stringify([WD.walls,WD.solids,WD.castle,WORLD]);
                    const memories=[];
                    for(const q of ['low','high','low','high','low']){
                        gfxQ=q;R3.setQuality();R3.frame(1/30);
                        if(q==='high'&&!(R3.bloom.enabled&&R3.post&&R3.ao))throw Error('post unavailable');
                        if(q==='low'&&R3.composer)throw Error('post active on low');
                        memories.push({...R3.renderer.info.memory});
                    }
                    return {unchanged:before===JSON.stringify([WD.walls,WD.solids,WD.castle,WORLD]),
                        counts:R3.moonfallCounts,players:units.filter(u=>u.hero).length,memories,
                        fallback:!R3.inspectCelestialWarrior().ready};
                }""")
                assert result['unchanged'] and result['players'] == 32 and result['fallback'], result
                assert result['counts']['floors'] == 56 and result['counts']['pillars'] == 6
                # Compare equal quality after caches have warmed; no linear growth
                # may remain in scene geometry or textures across rebuilds.
                assert result['memories'][4]['textures'] <= result['memories'][2]['textures'], result
                assert result['memories'][4]['geometries'] <= result['memories'][2]['geometries'], result
                page.evaluate('announce=null;R3.frame(1/30)')
                animated = page.evaluate("""() => {
                    const e=R3.moonfallEffects.find(e=>e.kind==='portal'),before=e.mat.uniforms.uTime.value;
                    __game.tp(e.x,e.y);R3.tx=R3.ty=undefined;R3.frame(1/30);
                    return e.mesh.visible&&e.mat.uniforms.uTime.value>before&&!blockedAt(ME(),ME().r);
                }""")
                assert animated
                page.screenshot(path=str(artifacts / f'{entry}-portal.png'))
                page.screenshot(path=str(artifacts / f'{entry}-low.png'))
                page.evaluate("gfxQ='high';R3.setQuality();gameT=DAY+20;R3.frame(1/30)")
                page.screenshot(path=str(artifacts / f'{entry}-high-night.png'))
                # A short real-loop run exercises AI, input movement and rendering together.
                live = page.evaluate("""() => {
                    gfxQ='low';R3.setQuality();keys.KeyD=true;
                    window.requestAnimationFrame=window.__nativeRAF;requestAnimationFrame(loop);
                    return {time:gameT,x:ME().x};
                }""")
                try:
                    page.wait_for_function('gameT>'+str(live['time']+.12), polling=100, timeout=60000)
                except Exception:
                    print({'errors': errors, 'loop': page.evaluate('({state,gameT,gameOver,hp:ME()?.hp,H,W})')}, flush=True)
                    raise
                page.evaluate('keys.KeyD=false;window.requestAnimationFrame=cb=>1')
                # Isolate a small duel with the original lab for deterministic mechanics checks.
                combat = page.evaluate("""() => {
                    LAB.arena();const a=LAB.mk(1,'sword',6,0,2),b=LAB.mk(2,'sword',6,0,2);
                    a.bot=b.bot=false;a.ctrl='self';addUnit(a);addUnit(b);myId=1;
                    a.x=CX;a.y=CY;b.x=CX+60;b.y=CY;a.fx=1;a.fy=0;
                    const hp=b.hp;dealDamage(b,123,'pure',null);const damage=hp-b.hp;
                    const before=b.hp;basic(a,b);const melee=b.hp<before;
                    a.skl=[1,1,1];a.cd=[0,0,0];a.mp=a.maxMp;const mp=a.mp;
                    const casted=cast(a,1),skill=casted&&a.shieldHp>0&&a.mp<mp&&a.cd[1]>0;
                    // Serialize and apply the exact production multiplayer snapshot.
                    net.tr={kind:'peer',budget:14000};net.snapN=0;net.lastN=0;
                    const snap=snapFor('self',{q:[],ea:0},14000),saved=a.hp;
                    a.hp=1;applySnap(snap);const sync=a.hp===Math.floor(saved);
                    // Existing world bounds and rectangular wall collision.
                    WD.walls=[{x:CX-40,y:CY-100,w:40,h:200}];buildCollide(WD);
                    a.x=CX+5;a.y=CY;collideUnit(a);const wall=a.x>=CX+a.r-.01;
                    a.x=-100;collideUnit(a);const bounds=a.x>=a.r;
                    a.hp=Math.max(1,a.hp-100);a.bag=[1,1,0,0];a.bcd=[0,0,0,0];
                    const inventory=usePotion(a,0)&&a.bag[0]===0&&a.hotT>0&&a.bcd[0]>0;
                    const rejected=[];net.tr.send=(id,data)=>rejected.push(data.t);net.tr.kick=id=>rejected.push('kick');
                    hostJoin('legacy-client',{v:VER-1});const versionGuard=rejected.join(',')==='ver,kick';
                    return {damage,melee,skill,sync,wall,bounds,inventory,versionGuard};
                }""")
                assert combat == dict(damage=123, melee=True, skill=True, sync=True, wall=True, bounds=True, inventory=True, versionGuard=True), combat
                assert not errors, errors
                reports.append({'entry': entry, 'render': result, 'combat': combat, 'phase2': phase2,
                                'metricsSoftwareGPU': page.evaluate('R3.celestialMetrics()')})
                (artifacts / 'report.json').write_text(json.dumps(reports, indent=2))
                print(f'PASS {entry}: scene, quality, immutable collision, 32 heroes, real loop, damage/attack/skill, snapshot, bounds', flush=True)
                page.context.close()

            page, errors = new_page(mobile=True)
            page.goto(f'{url}/index.html', timeout=120000)
            page.wait_for_function('R3.ok', polling=100)
            assert page.evaluate('R3.mobile && !R3.hi && R3.renderer.getPixelRatio()===1 && !R3.composer')
            page.locator('#animeHelp').tap()
            assert page.locator('#animeGuide').is_visible()
            page.locator('#animeHelp').tap()
            page.evaluate('R3.menuSeed=20261116;R3.menuReady=1')
            page.locator('#moonfallBtn').tap()
            page.wait_for_function("state==='play'", polling=100, timeout=120000)
            page.evaluate('R3.frame(1/30)')
            # Native touchscreen events must still reach the original canvas controls.
            cdp = page.context.new_cdp_session(page)
            attack = page.evaluate('({x:UI.atk.x,y:UI.atk.y})')
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [attack]})
            assert page.evaluate('atkHeld')
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            assert page.evaluate('!atkHeld')
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 100, 'y': 310}]})
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 145, 'y': 310}]})
            assert page.evaluate('joy && joy.x>joy.ox+30')
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            assert page.evaluate('joy===null')
            page.screenshot(path=str(artifacts / 'mobile-landscape.png'))
            assert not errors, errors
            print('PASS mobile emulation: native touch attack/joystick, menu, landscape, low, DPR 1, scene', flush=True)
            page.context.close()

            # Real GLTFLoader, synthetic buffers, no account/download assumptions.
            for variant in ('rigged', 'unrigged', 'corrupt'):
                page, errors = new_page()
                manifest = json.loads((ROOT / 'assets/meshy/manifest.json').read_text())
                for a in manifest['assets'].values():
                    a['available'] = True
                page.route('**/assets/meshy/manifest.json', lambda route: route.fulfill(json=manifest))
                static, warrior = fixture(), fixture(rig=variant == 'rigged')
                page.route('**/assets/meshy/*.glb', lambda route: route.fulfill(
                    content_type='model/gltf-binary', body=(b'corrupt' if variant == 'corrupt'
                        else warrior if route.request.url.endswith('celestial-warrior.glb') else static)))
                page.goto(f'{url}/index.html', timeout=120000)
                page.wait_for_function('CelestialAssets.snapshot().ready && CelestialAssets.snapshot().assets.length===Object.keys(CelestialAssets.manifest.assets).length && CelestialAssets.snapshot().assets.every(a=>["loaded","error"].includes(a.state))', polling=100)
                admission = page.evaluate('R3.inspectCelestialWarrior()')
                assert admission['ready'] == (variant == 'rigged'), admission
                if variant == 'rigged':
                    adapter = page.evaluate("""() => {
                        LAB.arena();R3.scene=new THREE.Scene();
                        const normalized=R3.celestialAsset('modular-floor');
                        if(!normalized?.length)throw Error('Static GLB normalization failed');
                        R3.celestialBatch(R3.scene,'modular-floor',[[0,0,0,100,3,100,0,0,0]],R3.G.box,R3.std('#ffffff',.5,0));
                        const u=LAB.mk(1,'sword',6,0,2);addUnit(u);myId=1;
                        const o=R3.objFor(u);o.mvK=1;u.atkAnim=.3;R3.celestialAnim(o,u,1,.033,200);
                        u.wk='bow';R3.celestialAnim(o,u,2,.033,200);const weapon=o.wk==='bow'&&!!o.wpnR;
                        o.dieT=1.4;R3.celestialDie(o,.033);const death=o.dying&&o.act.death.isRunning();
                        u.dead=false;R3.celestialAnim(o,u,3,.033,0);
                        R3.cam.position.set(0,200,500);R3.cam.lookAt(0,50,0);R3.renderer.render(R3.scene,R3.cam);
                        return {celestial:o.celestial,same:o.u===u,weapon,death,revive:!o.dying};
                    }""")
                    assert all(adapter.values()), adapter
                elif variant == 'unrigged':
                    assert 'skinned rig' in admission['reason']
                else:
                    assert page.evaluate('CelestialAssets.snapshot().assets.every(a=>a.state==="error")')
                assert not errors, errors
                print(f'PASS synthetic GLB {variant}: loader / rig admission / fallback', flush=True)
                page.context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    (artifacts / 'report.json').write_text(json.dumps(reports, indent=2))
    print(f'Artifacts: {artifacts}', flush=True)


if __name__ == '__main__':
    main()
