"""Real Arena combat HUD, art, input and renderer-isolation smoke checks.

Tests use real HTTP assets and production Solo/input functions. Actor states are
explicit fixtures; painting is required to leave those authoritative values intact.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import re
import shutil
import sys
import tempfile

from playwright.sync_api import sync_playwright


BASE = Path(__file__).resolve().parents[2]
SITE = BASE / 'app/src/main/assets'
REPORT = BASE / 'moonfall-docs/reports/arena-combat-hud/smoke.json'
SHOTS = Path(tempfile.mkdtemp(prefix='arena-combat-hud-'))
SHADER_FAILURE = re.compile(r'WebGLProgram|shader error|VALIDATE_STATUS|GL_INVALID|program not valid', re.I)


class Files(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class Server(ThreadingHTTPServer):
    def handle_error(self, request, client_address):
        if not isinstance(sys.exc_info()[1], (BrokenPipeError, ConnectionResetError)):
            super().handle_error(request, client_address)


HELPERS = r"""() => {
  const statKeys=['id','hp','maxHp','mp','maxMp','shieldHp','shieldT','dead','lvl','xp','pts',
    'wk','wt','wv','wk2','wt2','at','atkDmg','armorV','mr','dmgB','spdB','hpB','gold',
    'x','y','team','hidden','invisT','stunT','rootT','burnT','spinT','lotusT','fuseT','atkCd',
    'skl','cd','bag','bcd','xs','xl','xcd','dgcd'];
  const pick=u=>Object.fromEntries(statKeys.map(key=>[key,u[key]]));
  window.__hudActor=()=>pick(ME());
  window.__hudDigest=()=>JSON.stringify({units:units.map(pick),gameT,alive,
    projs:projs.map(p=>[p.x,p.y,p.vx,p.vy,p.kind,p.r,p.dmg,p.life,p.dead,p.owner?.id]),
    aoes:aoes.map(a=>[a.x,a.y,a.r,a.t,a.delay,a.dot,a.kind,a.fxT,a.vis,a.done,a.dmg,a.owner?.id])});
  window.__hudPixels=(x,y,w,h)=>{
    const scale=typeof DPR==='number'?DPR:devicePixelRatio;
    const ix=Math.max(0,Math.floor(x*scale)),iy=Math.max(0,Math.floor(y*scale));
    const iw=Math.max(1,Math.min(cv.width-ix,Math.ceil(w*scale))),ih=Math.max(1,Math.min(cv.height-iy,Math.ceil(h*scale)));
    const bytes=ctx.getImageData(ix,iy,iw,ih).data;let hash=2166136261,opaque=0;
    const colors=new Set();for(let i=0;i<bytes.length;i+=4){
      if(bytes[i+3]>8)opaque++;
      if((i/4)%4===0)colors.add((bytes[i]>>4)*256+(bytes[i+1]>>4)*16+(bytes[i+2]>>4));
      for(let c=0;c<4;c++)hash=Math.imul(hash^bytes[i+c],16777619);
    }
    return {hash:(hash>>>0).toString(16),opaque,area:iw*ih,colors:colors.size};
  };
  window.__hudRender=()=>{const before=__hudDigest();R3.frame(1/60);
    if(before!==__hudDigest())throw Error('3D rendering changed gameplay fields');};
  window.__hudProbe=()=>{
    const me=ME(),target=UMAP.get(TGT.id),before=__hudDigest();
    const original={frame:drawFrame,target:drawTarget,bar:drawBars,skill:drawSkillBtn,attack:drawBtnAtk,image:ctx.drawImage};
    const calls={frame:0,target:0,bar:0,skill:[],attack:0,images:0};
    drawFrame=function(...args){calls.frame++;return original.frame.apply(this,args)};
    drawTarget=function(...args){calls.target++;return original.target.apply(this,args)};
    drawBars=function(...args){calls.bar++;return original.bar.apply(this,args)};
    drawSkillBtn=function(B,i,u){calls.skill.push({slot:i,state:MoonfallUI.state(u,i).kind,cost:MoonfallUI.state(u,i).cost});return original.skill.apply(this,arguments)};
    drawBtnAtk=function(...args){calls.attack++;return original.attack.apply(this,args)};
    ctx.drawImage=function(...args){calls.images++;return original.image.apply(this,args)};
    try{
      ctx.save();ctx.setTransform(DPR,0,0,DPR,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,W,H);
      drawHUD();if(target)drawBars(W*.5,H*.47,target,me,1);ctx.restore();
      const snapshot=ArenaVitals.snapshot(),rail=snapshot.frame.rail;
      const skills=UI.sk.map(B=>__hudPixels(B.x-B.r,B.y-B.r,B.r*2,B.r*2));
      const result={actor:pick(me),target:target?pick(target):null,calls,metadata:snapshot,
        hpPixels:__hudPixels(rail.x,rail.y,rail.width,rail.hpHeight),
        mpPixels:__hudPixels(rail.x,rail.mpY,rail.width,rail.mpHeight),skills};
      if(before!==__hudDigest())throw Error('HUD painting changed gameplay fields');
      return result;
    }finally{drawFrame=original.frame;drawTarget=original.target;drawBars=original.bar;
      drawSkillBtn=original.skill;drawBtnAtk=original.attack;ctx.drawImage=original.image;}
  };
  window.__hudReset=()=>{
    const u=ME();u.wk='fire';u.wt=2;u.wv=0;u.lvl=8;u.skl=[1,1,1];u.cd=[0,0,0];
    u.pts=0;u.atkCd=0;u.stunT=u.rootT=u.fuseT=u.spinT=u.lotusT=u.invisT=0;
    u.dash=u.leap=u.kb=null;u.shieldHp=0;u.shieldT=0;u.dead=false;
    recalc(u,true);u.bag=[3,2,1,1];u.bcd=[0,0,0,0];u.gold=777;
    announce=null;feedList=[];fxq=[];projs=[];aoes=[];TGT.t=5;
    return pick(u);
  };
  return true;
}"""


def validate_probe(value):
    assert value['calls']['frame'] == 1 and value['calls']['target'] == 1
    assert value['calls']['attack'] == 1 and len(value['calls']['skill']) == 3
    assert value['calls']['images'] > 0
    actor, frame = value['actor'], value['metadata']['frame']
    assert value['metadata']['paintCount'] <= value['metadata']['paintCapacity']
    for field in ['id', 'hp', 'maxHp', 'mp', 'maxMp', 'shieldHp', 'dead']:
        assert frame[field] == actor[field], (field, frame, actor)
    for field, numerator, denominator in [('hpRatio', 'hp', 'maxHp'), ('mpRatio', 'mp', 'maxMp'), ('shieldRatio', 'shieldHp', 'maxHp')]:
        expected = 0 if actor['dead'] else min(1, max(0, actor[numerator]/max(1, actor[denominator])))
        assert abs(frame[field] - expected) < 1e-8, (field, frame, actor)
    for name in ['hpPixels', 'mpPixels']:
        assert value[name]['opaque'] > value[name]['area']*.2 and value[name]['colors'] > 3, value[name]
    for skill in value['skills']:
        assert skill['opaque'] > 100 and skill['colors'] > 8, skill
    assert value['target'] and value['calls']['bar'] == 1
    for key in ['lastTarget', 'lastWorld']:
        metadata = value['metadata'][key]
        assert metadata and metadata['id'] == value['target']['id'], (key, metadata)
        assert abs(metadata['hpRatio'] - value['target']['hp']/value['target']['maxHp']) < 1e-8


def launch(browser, origin, *, mobile=False, document='index.html'):
    context = browser.new_context(viewport={'width': 844 if mobile else 1280, 'height': 390 if mobile else 800},
                                  is_mobile=mobile, has_touch=mobile, device_scale_factor=1,
                                  **({'user_agent': 'Mozilla/5.0 (Linux; Android 14) Mobile'} if mobile else {}))
    page = context.new_page(); page.set_default_timeout(240000)
    errors, shader_errors = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: shader_errors.append(message.text)
            if message.type == 'error' and SHADER_FAILURE.search(message.text) else None)
    page.route('**/favicon.ico', lambda route: route.fulfill(status=204))
    page.add_init_script("window.__noMenu=true;requestAnimationFrame=()=>0;localStorage.setItem('ar_q','low');"
                         "localStorage.setItem('ar_snd','2');localStorage.setItem('ar_mute','1')")
    page.goto(origin+'/'+document, wait_until='domcontentloaded', timeout=240000)
    page.wait_for_function('window.MoonfallLoading&&(MoonfallLoading.isReady()||MoonfallLoading.snapshot().failed)', polling=100)
    assert page.evaluate('MoonfallLoading.isReady()'), page.evaluate('MoonfallLoading.snapshot()')
    return page, errors, shader_errors


def start(page, *, mobile=False):
    page.evaluate("""() => {const original=hostNewGame;
      hostNewGame=function(players,seed,cfg){return original(players,719243,cfg);};}""")
    (page.locator('#soloBtn').tap if mobile else page.locator('#soloBtn').click)()
    page.wait_for_function("state==='play'&&document.getElementById('loading').classList.contains('hidden')", polling=100)


def screenshot(page, name):
    page.screenshot(path=str(SHOTS/(name+'.png')), scale='css')


server = Server(('127.0.0.1', 0), partial(Files, directory=str(SITE)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
cases = []
try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox', '--enable-unsafe-swiftshader'])
        for mobile in [False, True]:
            name = 'mobile' if mobile else 'desktop'
            page, errors, shader_errors = launch(browser, origin, mobile=mobile)
            start(page, mobile=mobile)
            page.evaluate(HELPERS)
            page.wait_for_function('window.ArenaVitals&&document.body.classList.contains("arena-combat-hud")', polling=100)
            art = page.evaluate("""() => {
              const inspect=canvas=>{if(!canvas||!canvas.width||!canvas.height)return false;
                const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();
                for(let i=0;i<data.length;i+=32)colors.add((data[i]>>4)*256+(data[i+1]>>4)*16+(data[i+2]>>4));return colors.size>8;};
              const skills=AW.flatMap(key=>SK[key].map((_,slot)=>({key,slot,painted:inspect(MoonfallUI.icon(key,slot))})));
              const utilities=Object.keys(MoonfallUI.snapshot().atlas.utilities).map(key=>({key,painted:inspect(MoonfallUI.item(key))}));
              return {skills,utilities,loaded:MoonfallUI.snapshot().loadedIcons};
            }""")
            assert len(art['skills']) == 81 and all(cell['painted'] for cell in art['skills']), art   # 27 weapons x 3 (five forged spirit tomes since 2026-11-21)
            assert len(art['utilities']) >= 18 and all(cell['painted'] for cell in art['utilities']), art
            assert art['loaded'] == len(art['skills'])+len(art['utilities'])
            page.evaluate("""() => {
              __hudReset();const me=ME(),target=units.find(unit=>unit.hero&&unit!==me&&!unit.dead);let at=null;
              for(let n=0;n<24;n++){const angle=n*Math.PI/12,p={x:me.x+Math.cos(angle)*240,y:me.y+Math.sin(angle)*240};
                if(walkable(p.x,p.y,30)&&!houseAt(p)&&!WD.caves.some(c=>dist(c,p)<c.R+50)){at=p;break;}}
              if(!target||!at)throw Error('No clear focused-hero fixture');target.x=target.tx=at.x;target.y=target.ty=at.y;
              target.hidden=false;target.invisT=0;target.name='HUD Target';target.wk='sword';target.wt=1;target.lvl=6;recalc(target,true);
              target.hp=target.maxHp*.72;target.mp=target.maxMp*.61;TGT.id=target.id;TGT.t=5;
              __hudRender();CUR.step(.016);
            }""")
            assert all(page.locator(selector).count() == 1 for selector in ['#arenaCombatPad', '#arenaDash', '#arenaSpecial', '#arenaGold', '#arenaRegion', '#arenaCombatHint'])
            assert page.locator('#arenaCombatPad').evaluate("element=>getComputedStyle(element).display!=='none'")
            assert page.locator('#arenaDash').is_visible() and page.locator('#arenaSpecial').is_visible()
            assert '777' in page.locator('#arenaGold').inner_text()
            normal = page.evaluate('__hudProbe()');validate_probe(normal)
            page.evaluate('__hudRender()');screenshot(page, name+'-healthy')
            page.evaluate("()=>{const me=ME();me.hp=me.maxHp*.18;me.mp=me.maxMp*.27;me.shieldHp=me.maxHp*.2;me.shieldT=4;}")
            wounded = page.evaluate('__hudProbe()');validate_probe(wounded)
            assert wounded['metadata']['frame']['critical']
            assert normal['hpPixels']['hash'] != wounded['hpPixels']['hash']
            assert normal['mpPixels']['hash'] != wounded['mpPixels']['hash']
            page.evaluate('__hudRender()');screenshot(page, name+'-wounded-shield')
            state_checks = []
            for kind, setup in [
                ('locked', "me.skl=[0,1,1];me.pts=0;me.cd=[0,0,0];me.mp=me.maxMp"),
                ('cooldown', "me.skl=[1,1,1];me.cd=[2.4,0,0];me.mp=me.maxMp"),
                ('mana', "me.skl=[1,1,1];me.cd=[0,0,0];me.mp=0"),
                ('ready', "me.skl=[1,1,1];me.cd=[0,0,0];me.mp=me.maxMp"),
            ]:
                page.evaluate('()=>{const me=ME();'+setup+'}')
                state = page.evaluate('__hudProbe()');validate_probe(state)
                assert state['calls']['skill'][0]['state'] == kind, state['calls']['skill']
                state_checks.append({'kind': kind, 'pixels': state['skills'][0], 'actual': state['actor']})
                if kind == 'mana':
                    page.evaluate('__hudRender()');screenshot(page, name+'-low-mana')
            assert len({row['pixels']['hash'] for row in state_checks}) == 4, state_checks

            # The game's real key/pointer handlers, costs and cooldowns are used.
            session = page.context.new_cdp_session(page) if mobile else None
            def input_skill(index):
                if mobile:
                    point = page.evaluate('i=>({x:UI.sk[i].x,y:UI.sk[i].y})', index)
                    session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [point]})
                    session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                else:
                    page.keyboard.press('qer'[index])
            inputs = []
            for index in range(3):
                expected = page.evaluate("""i=>{const u=ME();u.skl=[1,1,1];u.cd=[0,0,0];u.mp=u.maxMp;u.wv=0;
                  __hudRender();return {mp:u.mp,cost:SK[u.wk][i].mp[0],cd:SK[u.wk][i].cd[0]*cdMul(u)};}""", index)
                input_skill(index)
                after = page.evaluate('i=>({mp:ME().mp,cd:ME().cd[i],projs:projs.length,aoes:aoes.length})', index)
                assert abs(after['mp']-(expected['mp']-expected['cost'])) < 1e-8, (index, expected, after)
                assert abs(after['cd']-expected['cd']) < 1e-8, (index, expected, after)
                page.evaluate('__hudRender()')
                inputs.append({'slot': index, 'expected': expected, 'actual': after})
            for blocked in ['locked', 'cooldown', 'mana']:
                page.evaluate("""kind=>{const u=ME();u.skl=[1,1,1];u.cd=[0,0,0];u.mp=u.maxMp;u.pts=0;
                  if(kind==='locked')u.skl[0]=0;if(kind==='cooldown')u.cd[0]=2.4;if(kind==='mana')u.mp=0;__hudRender();}""", blocked)
                before = page.evaluate('__hudActor()');input_skill(0);after = page.evaluate('__hudActor()')
                assert before['mp'] == after['mp'] and before['cd'] == after['cd'] and before['skl'] == after['skl'], blocked
            page.evaluate("()=>{ME().skl[0]=0;ME().pts=1;ME().cd[0]=0;__hudRender();}")
            if mobile:
                point = page.evaluate('({x:UI.learn[0].x,y:UI.learn[0].y})')
                session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [point]})
                session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            else:
                input_skill(0)
            assert page.evaluate('ME().skl[0]===1&&ME().pts===0')
            page.evaluate("()=>{ME().hp=ME().maxHp*.4;ME().bag[0]=3;ME().bcd=[0,0,0,0];__hudRender();}")
            if mobile:
                point = page.evaluate('({x:UI.pot[0].x,y:UI.pot[0].y})')
                session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [point]})
                session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            else:
                page.keyboard.press('4')
            assert page.evaluate('ME().bag[0]===2&&ME().bcd[0]>0&&ME().hotT>0')
            page.evaluate('__hudRender()')
            await_compile = page.evaluate("""async()=>{await R3.renderer.compileAsync(R3.scene,R3.cam);return {
              badPrograms:(R3.renderer.info.programs||[]).filter(p=>p.diagnostics?.runnable===false).length,
              contextLost:R3.renderer.getContext().isContextLost()};}""")
            assert not errors and not shader_errors and not await_compile['badPrograms'] and not await_compile['contextLost'], (errors, shader_errors, await_compile)
            cases.append({'case': name, 'art': art, 'healthy': normal, 'woundedShield': wounded,
                          'states': state_checks, 'nativeInputs': inputs, 'blockedInputs': True,
                          'nativeLearning': 'plus-touch' if mobile else 'Q-key',
                          'seed': page.evaluate('WD.seed'), 'nativePotion': True, 'gameplayUnchangedByPainting': True,
                          'errors': errors, 'shaderErrors': shader_errors, 'programs': await_compile})
            page.context.close()
            print('PASS '+name+': 81 spells/utilities, vitals/states, immutable paint, real QER/potion input', flush=True)

        page, errors, shader_errors = launch(browser, origin)
        page.locator('#arenaSettingsBtn').click();page.locator('#viewBtn').click()
        assert page.evaluate('!view3D')
        page.locator('#arenaSettings .arena-settings-close').click()
        start(page);page.evaluate(HELPERS);page.evaluate('__hudReset()')
        two_d = page.evaluate("""()=>{const before=__hudDigest();draw2D();
          return {unchanged:before===__hudDigest(),frame:ArenaVitals.snapshot().frame,pixels:__hudPixels(0,0,W,H),view3D};}""")
        assert two_d['unchanged'] and not two_d['view3D'] and two_d['frame']
        assert two_d['pixels']['opaque'] > two_d['pixels']['area']*.8
        screenshot(page, 'arena-2d')
        assert not errors and not shader_errors, (errors, shader_errors)
        cases.append({'case': 'arena-2d', **two_d, 'errors': errors, 'shaderErrors': shader_errors})
        page.context.close();print('PASS Arena 2D: original view handler, HUD paint and unchanged actor state', flush=True)
        # cursed.html is no longer maintained (owner 2026-11-23), so it is no longer opened here
        browser.close()
finally:
    server.shutdown();server.server_close()

REPORT.parent.mkdir(parents=True, exist_ok=True)
REPORT.write_text(json.dumps(cases, ensure_ascii=False, indent=2)+'\n')
print('Screenshots (temporary):', SHOTS, flush=True)
