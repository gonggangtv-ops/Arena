"""Real Arena skill casts, unchanged combat, bounded instanced VFX and native input.

Serve actual deployment assets over HTTP. No successful model/image fixtures,
public room connections, replacement combat or synthetic profile coverage.
Screenshots stay under /tmp. A pre-upgrade index is required for combat comparison.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import argparse
import hashlib
import json
import os
import shutil
import tempfile

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / 'app/src/main/assets'
OUT = ROOT / 'moonfall-docs/reports/arena-vfx'
BASELINE = Path(os.environ.get('ARENA_VFX_BASELINE', '/tmp/arena-vfx-baseline.html'))
SHOTS = Path(tempfile.mkdtemp(prefix='arena-vfx-'))

LAB_JS = r"""() => {
  LAB.arena();AU.mode=2;WD.nM=WD.nR=WD.nD=()=>.5;
  WD.castle.gate=WD.castle.out={x:-90000,y:-90000};gameT=30;lastNight=false;campT=99999;net.mode='solo';net.tr=null;
  net.inputs={};myId=1;state='play';simMode=true;R3.buildWorld();
  R3.tx=CX;R3.ty=CY;R3.ly=0;R3.t=1;
  window.__vfxPrepare=(key)=>{
    units=[];UMAP=new Map();projs=[];aoes=[];parts=[];texts=[];swings=[];fxq=[];
    gameT=30;campT=99999;gameOver=false;alive=3;myId=1;spectate=null;
    COMBO={n:0,t:0,pop:0,dmg:0};TGT={id:-1,t:0};hitFl=[];announce=null;
    const a=mkHero(1,'VFX QA','host',0,1);a.lvl=18;a.wk=key;a.wt=2;a.at=-1;
    a.wv=0;a.skl=[4,4,3];a.cd=[0,0,0];a.x=CX;a.y=CY;a.fx=1;a.fy=0;
    recalc(a,true);a.hp=a.maxHp*.7;addUnit(a);
    for(let i=0;i<2;i++){
      const b=mkHero(i+2,'Target '+i,'qa-'+i,i+1,i+2);
      b.x=CX+170+i*110;b.y=CY+i*65;b.maxHp=b.hp=100000;
      b.armorV=0;b.mr=0;b.atkCd=999;addUnit(b);
    }
    if(R3.PA){R3.PA.list=[];R3.PB.list=[];}
    for(const q of R3.decalPool||[])q.on=q.m.visible=false;
    for(const q of R3.trailPool||[])q.on=q.m.visible=false;
    R3.bolts=[];R3.slashes=[];R3.moons=[];R3.spikes=[];
    if(R3.avReset)R3.avReset();
    return a;
  };
  window.__vfxCombat=()=>{
    const clean=n=>typeof n==='number'?Math.round(n*1e6)/1e6:n;
    const unit=u=>Object.fromEntries(['id','x','y','hp','mp','maxHp','maxMp','shieldHp',
      'shieldT','stunT','rootT','slowT','slowAmt','burnT','burnDps','invisT','spinT',
      'lotusT','asT','asAmt','bonusNext','critNext','bsReady','fury','fuseT']
      .map(k=>[k,clean(u[k])]).filter(p=>p[1]!==undefined).concat([
        ['cd',u.cd.map(clean)],['dash',u.dash?Object.fromEntries(['vx','vy','t','dmg','stun','slow']
          .filter(k=>u.dash[k]!==undefined).map(k=>[k,clean(u.dash[k])])):null],
        ['leap',u.leap?Object.fromEntries(['sx','sy','tx','ty','t','T','dmg','r']
          .map(k=>[k,clean(u.leap[k])])):null]]));
    return {units:units.map(unit),projs:projs.map(p=>({kind:p.kind,x:clean(p.x),y:clean(p.y),
      vx:clean(p.vx),vy:clean(p.vy),r:p.r,dmg:clean(p.dmg),el:p.el||null,life:clean(p.life)})),
      aoes:aoes.map(a=>({kind:a.kind,x:clean(a.x),y:clean(a.y),r:a.r,dmg:clean(a.dmg),
        delay:a.delay,dot:a.dot||0,t:clean(a.t),done:!!a.done,el:a.el||null})),
      network:{heroes:units.map(heroRow),self:selfRow(ME()),areas:aoes.map(aoeRow)}};
  };
  window.__vfxCastCase=(key,slot,visual)=>{
    const a=__vfxPrepare(key),seed=113+iHash(key)*17+slot;
    const originalRandom=Math.random,combatRandom=mulberry32(seed),visualRandom=mulberry32(seed^0x51f3a7);
    Math.random=combatRandom;
    // Damage text invokes the OLD hit renderer synchronously inside hostUpdate.
    // Its UUID/cache allocations belong to the visual stream as well.
    const originalHit=R3.hitVfx;
    if(originalHit)R3.hitVfx=function(...args){const previous=Math.random;Math.random=visualRandom;
      try{return originalHit.apply(this,args);}finally{Math.random=previous;}};
    const beforeMP=a.mp,expectedCost=SK[key][slot].mp[a.skl[slot]-1];
    const expectedCD=SK[key][slot].cd[a.skl[slot]-1]*cdMul(a);
    let result;
    try{
      const ok=cast(a,slot,{x:CX+170,y:CY});
      const immediate=__vfxCombat();
      const events=fxq.map(e=>encEv(e,a));
      const cost=beforeMP-a.mp,cd=a.cd[slot];
      let peak=0,semantic=0;
      for(let i=0;i<135;i++){
        // The old renderer shares Math.random with combat. Its UUID/cache
        // allocations depend on the random boot world; isolate the test streams
        // so identical combat draws compare damage/state rather than cache order.
        Math.random=combatRandom;hostUpdate(1/30);
        if(visual){
          Math.random=visualRandom;
          R3.effects(1+i/30,1/30,a,a);
          R3.stepP(R3.PA,1/30);R3.stepP(R3.PB,1/30);
          R3.stepDecals(1/30);R3.stepTrails(1/30);
          if(window.ArenaVFX){const s=ArenaVFX.snapshot();peak=Math.max(peak,s.totalActive);
            semantic=Math.max(semantic,s.marks[key+'#'+slot]||0);}
        }
      }
      result={key,slot,ok,cost,expectedCost,cd,expectedCD,immediate,events,
        final:__vfxCombat(),peak,semantic};
    }finally{Math.random=originalRandom;R3.hitVfx=originalHit;}
    return result;
  };
  function iHash(s){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h;}
  __vfxPrepare('fire');enterPlay();
  return {skills:AW.flatMap(key=>SK[key].map((_,slot)=>({key,slot}))),
    flags:{cursed:CURSED,moon:MOON},models:CelestialAssets.snapshot().assets.length};
}"""


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def fresh(browser, quality='high', *, mobile=False, reduced=False):
    options = {'viewport': {'width': 844 if mobile else 1100,
                            'height': 390 if mobile else 700},
               'is_mobile': mobile, 'has_touch': mobile,
               'reduced_motion': 'reduce' if reduced else 'no-preference'}
    if mobile:
        options['user_agent'] = 'Mozilla/5.0 (Linux; Android 14) Mobile'
    context = browser.new_context(**options)
    page = context.new_page()
    page.set_default_timeout(180000)
    errors, shader_errors = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda event: shader_errors.append(event.text)
            if any(term in event.text for term in [
                'Shader Error', 'VALIDATE_STATUS', 'WebGLProgram: Shader',
                'CONTEXT_LOST_WEBGL']) else None)
    page.route('**/favicon.ico', lambda route: route.fulfill(status=204))
    page.add_init_script(
        "window.__noMenu=true;window.requestAnimationFrame=cb=>1;"
        f"localStorage.setItem('ar_q','{quality}');"
        "localStorage.setItem('ar_snd','2');localStorage.setItem('ar_mute','1');localStorage.setItem('ar_ao','0')")
    return page, errors, shader_errors


def boot(page, url):
    page.goto(url, wait_until='domcontentloaded', timeout=180000)
    page.wait_for_function('window.MoonfallLoading&&(MoonfallLoading.isReady()||'
                           'MoonfallLoading.snapshot().failed)', polling=100)
    assert page.evaluate('MoonfallLoading.isReady()'), page.evaluate('MoonfallLoading.snapshot()')
    page.locator('#soloBtn').click(no_wait_after=True)
    page.wait_for_function('state==="play"&&document.getElementById("loading").classList.contains("hidden")',
                           polling=100)
    assert page.evaluate('!!R3.qn&&!R3.qn.mobOnly')
    return page.evaluate('MoonfallLoading.snapshot()')


def actual_casts(page, *, baseline=False):
    fixture = page.evaluate(LAB_JS)
    assert fixture['flags'] == {'cursed': True, 'moon': False}, fixture
    assert len(fixture['skills']) == 63
    results = []
    for skill in fixture['skills']:
        result = page.evaluate('p=>__vfxCastCase(p.key,p.slot,true)', skill)
        assert result['ok'], (skill, result)
        assert result['cost'] == result['expectedCost'], (skill, result)
        assert abs(result['cd']-result['expectedCD']) < 1e-8, (skill, result)
        if not baseline:
            assert result['peak'] > 0, ('No real visual activity', skill, result)
            assert result['semantic'] > 0, ('No actual skill route', skill, result)
        results.append(result)
    return fixture, results


def combat_projection(results):
    return [{key: value for key, value in result.items()
             if key not in ('peak', 'semantic')} for result in results]


def native_input(page, *, mobile=False):
    page.evaluate("__vfxPrepare('sword');R3.frame(1/30)")
    before = page.evaluate('ME().mp')
    if mobile:
        point = page.evaluate('({x:UI.sk[1].x,y:UI.sk[1].y})')
        session = page.context.new_cdp_session(page)
        session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [point]})
        session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    else:
        page.keyboard.press('e')
    after = page.evaluate('({mp:ME().mp,cd:ME().cd[1],shield:ME().shieldHp,cost:SK.sword[1].mp[3]})')
    assert before-after['mp'] == after['cost'] and after['cd'] > 0 and after['shield'] > 0, after
    page.evaluate('R3.frame(1/30)')
    snapshot = page.evaluate('ArenaVFX.snapshot()')
    assert snapshot['marks'].get('sword#1', 0) > 0, snapshot
    return {'input': 'native-touch' if mobile else 'keyboard-e', 'manaCost': after['cost'],
            'cooldownStarted': True, 'shieldApplied': True}


def visual_rng_purity(page):
    result = page.evaluate(r'''() => {
      __vfxPrepare('fire');const before=JSON.stringify(__vfxCombat());
      const original=Math.random;let previews=0,allocatorRestored=false;
      try{
        const forbidden=()=>{throw Error('New VFX consumed the gameplay random stream');};
        Math.random=forbidden;R3.avDispose();R3.avReset();
        allocatorRestored=Math.random===forbidden;
        if(!allocatorRestored)throw Error('Allocator did not restore global RNG');
        for(const key of AW)for(let slot=0;slot<3;slot++){
          R3.avReset();ArenaVFX.preview(key,slot,{x:CX,y:CY});
          R3.avStep(1/30);previews++;
          if(Object.keys(ArenaVFX.snapshot().marks).length)throw Error('Preview claimed a real gameplay route');
        }
        R3.avReset();
      }finally{Math.random=original;}
      return {previews,allocatorRestored,combatUnchanged:before===JSON.stringify(__vfxCombat()),
        previewDoesNotClaimGameplayRoutes:Object.keys(ArenaVFX.snapshot().marks).length===0};
    }''')
    assert result == {'previews': 63, 'allocatorRestored':True, 'combatUnchanged': True,
                      'previewDoesNotClaimGameplayRoutes': True}, result
    return result


def pool_stress(page):
    result = page.evaluate(r"""() => {
      __vfxPrepare('fire');const types=['ring','rune','pillar','dome','arc','shard','streak','ember'];
      const draw=()=>{const info=R3.renderer.info,auto=info.autoReset;info.autoReset=false;info.reset();
        try{R3.draw();}finally{info.autoReset=auto;}};
      const emit=type=>R3.avEmit(type,{x:CX,y:CY,height:35,r:90,r1:200,life:.8,
        c:'#ff8a3a',c2:'#fff0c0',angle:.7,arc:2.6,width:10,vy:40});
      // Warm every actual shader/geometry before measuring allocations.
      for(const type of types)emit(type);R3.avStep(.05);draw();
      R3.avReset();R3.avStep(.01);draw();
      const memory=()=>({...R3.renderer.info.memory,programs:R3.renderer.info.programs.length});
      const before=memory(),emptyCalls=R3.renderer.info.render.calls;
      let peak=0;
      for(let frame=0;frame<36;frame++){
        R3.avStep(1/60);for(let i=0;i<120;i++)emit(types[i%types.length]);
        peak=Math.max(peak,ArenaVFX.snapshot().totalActive);
      }
      draw();
      const during=ArenaVFX.snapshot(),after=memory(),calls=R3.renderer.info.render.calls;
      for(let i=0;i<120;i++)R3.avStep(1/30);
      const expired=ArenaVFX.snapshot();
      R3.avReset();const reset=ArenaVFX.snapshot();
      const cycles=[];
      for(let i=0;i<3;i++){
        R3.avDispose();draw();const disposed=ArenaVFX.snapshot();
        R3.avReset();for(const type of types)emit(type);R3.avStep(.02);
        draw();
        cycles.push({disposed,recreated:ArenaVFX.snapshot(),memory:memory()});
        R3.avReset();
      }
      return {before,after,emptyCalls,calls,extraDrawCalls:calls-emptyCalls,peak,during,expired,reset,cycles};
    }""")
    Path('/tmp/arena-vfx-pool-stress.json').write_text(json.dumps(result,indent=2)+'\n')
    state = result['during']
    assert state['batchCount'] == 8 and state['allocatedGeometries'] == 8 and state['allocatedMaterials'] == 8, state
    assert result['peak'] <= state['totalCapacity'], result
    assert state['dropped'] > 0, 'Stress never exercised the admission budget'
    assert result['extraDrawCalls'] <= 8, result
    assert result['after'] == result['before'], result
    assert result['expired']['totalActive'] == result['reset']['totalActive'] == 0, result
    for cycle in result['cycles']:
        assert cycle['disposed']['batchCount'] == 0, cycle
        assert cycle['recreated']['batchCount'] == 8, cycle
        assert cycle['memory'] == result['before'], {'before':result['before'],'cycle':cycle}
    return result


def captures(page, label):
    output = []
    for key, slot, delay in [('fire', 2, .95), ('frost', 2, .35), ('storm', 2, .5),
                             ('gsword', 0, .08), ('fSS_tempest', 2, .55)]:
        page.evaluate(r"""p=>{
          const a=__vfxPrepare(p.key);R3.tx=CX+80;R3.ty=CY;R3.ly=0;R3.t=1;
          cast(a,p.slot,{x:CX+170,y:CY});
          for(let i=0;i<Math.ceil(p.delay*30);i++){hostUpdate(1/30);R3.frame(1/30);}
        }""", {'key': key, 'slot': slot, 'delay': delay})
        path = SHOTS / f'{label}-{key}-{slot}.png'
        page.screenshot(path=str(path), scale='css')
        output.append(str(path))
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline-only', action='store_true')
    parser.add_argument('--case', choices=['desktop-high','mobile-low','reduced-motion'])
    args = parser.parse_args()
    assert BASELINE.is_file(), f'Save the pre-upgrade index to {BASELINE}'
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(SITE)))
    Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}'
    report = {'baselineSHA256': hashlib.sha256(BASELINE.read_bytes()).hexdigest(), 'cases': []}
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=shutil.which('chromium'),
                args=['--no-sandbox', '--enable-unsafe-swiftshader'])
            for label, quality, mobile, reduced in [('desktop-high', 'high', False, False),
                                                   ('mobile-low', 'low', True, False),
                                                   ('reduced-motion', 'low', True, True)]:
                if args.case and label != args.case:
                    continue
                baseline_page, baseline_errors, baseline_shader = fresh(browser, quality, mobile=mobile, reduced=reduced)
                baseline_page.route('**/baseline-index.html', lambda route: route.fulfill(
                    status=200, content_type='text/html', body=BASELINE.read_bytes()))
                boot(baseline_page, url+'/baseline-index.html')
                fixture, baseline_results = actual_casts(baseline_page, baseline=True)
                assert not baseline_errors and not baseline_shader, (baseline_errors, baseline_shader)
                baseline_page.context.close()
                print('PASS '+label+': baseline 63 real casts',flush=True)
                if args.baseline_only:
                    report['cases'].append({'case': label, 'fixture': fixture, 'casts': baseline_results})
                    print('PASS baseline '+label+': 63 actual casts', flush=True)
                    continue
                page, errors, shader_errors = fresh(browser, quality, mobile=mobile, reduced=reduced)
                boot_snapshot = boot(page, url+'/index.html')
                assert page.evaluate('!!window.ArenaVFX')
                _, upgraded_results = actual_casts(page)
                print('PASS '+label+': enhanced 63 real visual routes',flush=True)
                baseline_combat = combat_projection(baseline_results)
                upgraded_combat = combat_projection(upgraded_results)
                for before, after in zip(baseline_combat, upgraded_combat):
                    if before != after:
                        Path('/tmp/arena-vfx-combat-mismatch.json').write_text(json.dumps({'baseline':before,'upgraded':after},indent=2))
                        raise AssertionError('Combat mismatch '+before['key']+'#'+str(before['slot'])+'; inspect /tmp/arena-vfx-combat-mismatch.json')
                print('PASS '+label+': identical damage/state/network for all 63 baseline casts',flush=True)
                input_result = native_input(page, mobile=mobile)
                purity = visual_rng_purity(page)
                stress = pool_stress(page)
                shots = captures(page, label) if not reduced else []
                assert not errors and not shader_errors, (errors, shader_errors)
                report['cases'].append({'case': label, 'boot': boot_snapshot, 'fixture': fixture,
                    'actualCasts': [{'key': r['key'], 'slot': r['slot'], 'manaCost': r['cost'],
                        'cooldown': r['cd'], 'peakActive': r['peak'], 'semanticEvents': r['semantic']}
                        for r in upgraded_results], 'combatIdenticalToBaseline': True,
                    'nativeInput': input_result, 'visualRngPurity':purity, 'stress': stress, 'errors': errors,
                    'shaderErrors': shader_errors, 'screenshots': shots})
                page.context.close()
                print('PASS '+label+': all 63 real casts, unchanged combat, native input, bounded GPU resources', flush=True)
            if not args.baseline_only:
                page, errors, shader_errors = fresh(browser, 'low')
                snapshot = boot(page, url+'/cursed.html')
                assert page.evaluate('MOON===true&&!window.ArenaVFX')
                page.evaluate('R3.frame(1/30)')
                assert not errors and not shader_errors, (errors, shader_errors)
                report['cursedCompatibility'] = {'boot': snapshot, 'realStart': True,
                    'vfxModuleAbsent': True, 'errors': errors, 'shaderErrors': shader_errors}
                page.context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    OUT.mkdir(parents=True, exist_ok=True)
    target = Path('/tmp/arena-vfx-baseline-fixture.json') if args.baseline_only else OUT/'results.json'
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print('Screenshots (not committed):', SHOTS, flush=True)


if __name__ == '__main__':
    main()
