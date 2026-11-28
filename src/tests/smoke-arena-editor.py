"""Exercise editor gestures, the real Meteor cast, playtest, project files and a fresh Solo match over HTTP."""
import argparse
import json
import re
import shutil
import secrets
import subprocess
from tempfile import TemporaryDirectory
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

SITE = Path(__file__).resolve().parents[2] / 'app/src/main/assets'


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def run(browser, url, pictures, password, gate):
    tab = browser.new_page(viewport={'width': 1120, 'height': 680}, device_scale_factor=1)
    page = tab
    tab.set_default_timeout(150000)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text[:400]) if re.search('shader error|WebGLProgram|program not valid', m.text, re.I) else None)
    page.add_init_script("window.__noMenu=true;requestAnimationFrame=()=>0;localStorage.setItem('ar_q','low');localStorage.setItem('ar_mute','1')")
    menu_seed = 777

    def seed(route):
        res = route.fetch()
        code = res.text()
        key = 'R3.menuSeed=Math.floor(Math.random()*1e9);setupWorld'
        assert code.count(key) == 1
        route.fulfill(response=res, body=code.replace(key, f'R3.menuSeed={menu_seed};setupWorld'))

    def ready():
        tab.goto(url, wait_until='domcontentloaded')
        page.wait_for_function("window.MoonfallLoading?.isReady()||window.MoonfallLoading?.snapshot().failed||window.__moonfallCodeFailure", polling=100)
        assert page.evaluate('MoonfallLoading.isReady()'), errors

    def click(selector):
        page.locator(selector).click()

    def fill(selector, value):
        box = page.locator(selector)
        box.fill(str(value))
        box.press('Tab')

    def photo(name):
        if pictures:
            pictures.mkdir(parents=True, exist_ok=True)
            tab.screenshot(path=pictures / name)

    tab.route('**/moonfall-loading.js', seed)
    if gate:
        tab.route('**/editor.html*', lambda route: route.fulfill(path=str(gate), content_type='text/html; charset=utf-8'))
    tab.goto(url+'?editor=1')
    tab.wait_for_url('**/editor.html')
    assert tab.locator('iframe').count()==0
    photo('MuzCruor-studio-login.png')
    tab.locator('#password').fill('incorrect password')
    tab.locator('#unlock').click()
    tab.wait_for_function("document.getElementById('message').textContent.includes('ไม่ถูกต้อง')", polling=70)
    assert tab.locator('iframe').count()==0
    ready()
    assert tab.evaluate("typeof ArenaEditor==='undefined' && !document.querySelector('#arenaEditor')")
    page.evaluate("localStorage.setItem(ArenaProject.storageKey,JSON.stringify({version:1,seed:null,kinds:{},spawns:{},meteor:{}}))")
    click('#arenaEditorBtn')
    tab.wait_for_url('**/editor.html')
    tab.locator('#password').fill(password)
    tab.locator('#unlock').click()
    tab.wait_for_selector('iframe')
    page=tab.locator('iframe').element_handle().content_frame()
    page.wait_for_function("window.ArenaEditor && state==='editor'", polling=100)
    page.evaluate('ArenaEditor.frame(1/30)')
    # Grab the actual Snow Queen and drop her on another clear point at the same elevation.
    drag = page.evaluate("""() => {
      const q=UMAP.get(WD.fort.queen), sy=R3.gY(q.x,q.y);
      const dot=(x,y)=>R3.toScreen(x,R3.gY(x,y)+2,y),from=dot(q.x,q.y);
      for(const d of [92,65,120,45])for(let i=0;i<16;i++){
        const x=q.x+Math.cos(i*Math.PI/8)*d,y=q.y+Math.sin(i*Math.PI/8)*d;
        if(!blockedAt({x,y},q.r+8)&&!inWater(x,y)&&Math.abs(R3.gY(x,y)-sy)<10)return {from,to:dot(x,y),start:[q.x,q.y]};
      }throw Error('No walkable destination for fixture');
    }""")
    tab.mouse.move(drag['from']['x'], drag['from']['y'])
    tab.mouse.down()
    tab.mouse.move(drag['to']['x'], drag['to']['y'], steps=3)
    tab.mouse.up()
    pos = [int(page.locator('#edX').input_value()), int(page.locator('#edY').input_value())]
    assert max(abs(a-b) for a,b in zip(pos,drag['start'])) > 25, (pos,drag)
    fill('#edX', 0)
    assert int(page.locator('#edX').input_value()) == pos[0]
    assert page.locator('#edStatus').get_attribute('data-tone') == 'error'
    fill('#ed-hp', 310000)
    click('#edKind')
    fill('#ed-dmg', 1840)
    click('#edInstance')
    fill('#ed-leash', 800)
    click('#edUndo')
    assert page.locator('#ed-leash').input_value() == '680'
    page.evaluate('ArenaEditor.frame(1/30)')
    photo('MuzCruor-editor-monsters.png')
    click('#edLibraryBtn')
    catalog=page.evaluate("""() => ({
      weapons:ArenaCatalog.entries.filter(e=>e.group==='weapons').length,
      skills:ArenaCatalog.entries.filter(e=>e.group==='skills').length,
      specials:ArenaCatalog.entries.filter(e=>e.group==='specials').length,
      settings:ArenaCatalog.fields.size
    })""")
    assert catalog['skills']==81 and catalog['weapons']==28 and catalog['specials']==6, catalog
    def setting(group, entry, suffix, value):
        page.locator('#edCategory').select_option(group)
        page.locator('#edDataList').select_option(entry)
        fill(f'[data-setting="{entry}.{suffix}"]', value)
    setting('heroes','heroes.base','hp',8800)
    setting('skills','skills.axe.0','cd.0',3.25)
    setting('skills','skills.axe.0','power.dmg.0',770)
    setting('skills','skills.fOS_fire.0','power.hp.0',7400)
    assert page.evaluate("HB.hp===880 && SK.axe[0].cd[0]===3.25 && SKV.axe[0].dmg[0]===77 && SKV.fOS_fire[0].hp[0]===740")
    setting('specials','specials.heal','heal.0',.48)
    setting('economy','economy.shop','hp',12)
    setting('bosses','bosses.snowqueen.0','lance',2.5)
    setting('rules','rules.match','dash',8)
    setting('circle','circle.0','w',150)
    setting('regions','regions.2','bloom',.45)
    assert page.evaluate("shopPrice(ME(),'hp')===12 && CREEPS.snowqueen.phaseCooldowns[0].lance===2.5 && DASH_CD===8 && PHASES[0].w===150 && ArenaRegions.atmosphere[2].bloom===.45")
    page.locator('#edCategory').select_option('skills')
    page.locator('#edDataList').select_option('skills.axe.0')
    photo('MuzCruor-studio-skills.png')
    page.locator('#edTrialRank').select_option('3')
    click('#edTryEntry')
    page.wait_for_function("state==='play'&&$('loading').classList.contains('hidden')",polling=100)
    assert page.evaluate("ME().wk==='axe'&&ME().skl[0]===3")
    click('#edReturn')
    page.wait_for_function("state==='editor'&&$('edLibrary').open",polling=100)
    assert page.locator('#edDataList').input_value()=='skills.axe.0'
    click('[data-tab="map"]')
    page.locator('#edMapGroup').select_option('boxes')
    target=page.evaluate("""() => {
      const b=WD.boxes[0], origin=[b.x,b.y];
      for(const d of [140,210,350,500,700])for(let i=0;i<24;i++){
        const x=Math.round(b.x+d*Math.cos(i*Math.PI/12)),y=Math.round(b.y+d*Math.sin(i*Math.PI/12));
        if(!inWater(x,y)&&!blockedAt({x,y},34))return {origin,at:[x,y]};
      }
      throw Error('Missing open ground');
    }""")
    fill('#edMapX',target['at'][0]);fill('#edMapY',target['at'][1]);click('#edMapApply')
    assert page.evaluate('([x,y])=>WD.boxes[0].x===x && WD.boxes[0].y===y && blockedAt({x,y},1) && WD.rocks.some(o=>o.prop&&o.r===26&&o.x===x&&o.y===y)', target['at'])
    assert not page.evaluate('([x,y])=>WD.rocks.some(o=>o.prop&&o.r===26&&o.x===x&&o.y===y)', target['origin'])
    fill('#edMapX',0);fill('#edMapY',0);click('#edMapApply')
    assert page.locator('#edLibraryStatus').get_attribute('data-tone')=='error'
    assert page.evaluate('([x,y])=>WD.boxes[0].x===x&&WD.boxes[0].y===y',target['at'])
    click('[data-tab="files"]')
    file=page.locator('#edLocalSource')
    file.set_input_files({'name':'settings.json','mimeType':'application/json','buffer':b'{"gold":10}'})
    page.locator('#edSourceText').fill('{"gold":15}')
    with tab.expect_download() as source:
        click('#edDownloadSource')
    assert source.value.path().read_text()=='{"gold":15}'
    file.set_input_files({'name':'art.glb','mimeType':'model/gltf-binary','buffer':b'original'})
    page.locator('#edReplacement').set_input_files({'name':'new.glb','mimeType':'model/gltf-binary','buffer':b'new model'})
    with tab.expect_download() as binary:
        click('#edDownloadSource')
    assert binary.value.suggested_filename=='art.glb' and binary.value.path().read_bytes()==b'new model'
    file.set_input_files({'name':'clean.txt','mimeType':'text/plain','buffer':b'clean'})
    page.wait_for_function("$('edSourceName').textContent.startsWith('clean.txt')",polling=50)
    click('#edLibraryClose')
    page.locator('#edLibrary').wait_for(state='hidden')
    click('#edSkills')
    fill('#ed-radius', 320)
    fill('#ed-delay', .35)
    fill('#ed-baseDamage', 3200)
    fill('#ed-cd0', 8.5)
    click('#edCast')
    skill = page.evaluate("""() => {
      const a=aoes.find(a=>a.kind==='meteor'),hp=units.find(u=>u.mob).hp;
      if(!a)throw Error('no cast');
      const result={radius:a.r,delay:a.delay,damage:a.dmg,cooldown:ME().xcd,wire:aoeRow(a)[13]};
      for(let i=0;i<14;i++){const draw=R3.draw;try{
        if(i!==0&&i!==6&&i!==13)R3.draw=()=>{};
        ArenaEditor.frame(1/30);
      }finally{R3.draw=draw}}
      result.hit=hp-units.find(u=>u.mob).hp;result.vfx=!!R3._fx2.meteorField;return result;
    }""")
    assert skill['radius']==320 and skill['delay']==.35 and skill['damage']>320
    assert skill['cooldown']==8.5 and skill['wire']==1 and skill['hit']>0 and skill['vfx'], skill
    photo('MuzCruor-editor-meteor.png')
    click('#edSave')
    project = page.evaluate("ArenaProject.read()")
    qid = page.evaluate('WD.fort.queen')
    assert project['seed']==777 and project['spawns'][str(qid)]['position']==pos
    assert project['kinds']['snowqueen']=={'dmg':184}
    page.locator('.ed-files summary').click(force=True)
    with tab.expect_download() as dl:
        click('#edExport')
    assert json.loads(dl.value.path().read_text()) == project
    click('#edDefaults')
    assert float(page.locator('#ed-radius').input_value()) == page.evaluate('ArenaProject.published.meteor.radius??ArenaProject.defaults.radius')
    page.locator('#edFile').set_input_files({'name':'project.json','mimeType':'application/json','buffer':json.dumps(project).encode()})
    page.wait_for_function("METEOR.radius===320", polling=100)
    # An invalid import must leave the draft intact.
    page.locator('#edFile').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"version":99}'})
    page.wait_for_function("document.getElementById('edStatus').dataset.tone==='error'", polling=100)
    assert page.evaluate('METEOR.radius')==320
    click('#edMobs')
    click('#edPlay')
    page.wait_for_function("state==='play'&&$('loading').classList.contains('hidden')", polling=100)
    assert page.evaluate('ArenaEditor.testing && ME().xs===SPX.indexOf(METEOR)')
    click('#edReturn')
    page.wait_for_function("state==='editor'",polling=100)
    click('#edClose')
    tab.locator('#unlock').wait_for(state='visible')
    assert tab.locator('iframe').count()==0
    page=tab
    # Reload with a different menu world. Standard Solo must select the saved world.
    menu_seed=31415
    ready()
    click('#soloBtn')
    page.wait_for_function("state==='play'&&$('loading').classList.contains('hidden')",polling=100)
    actual=page.evaluate("""() => {
      const m=WD.mobs.find(m=>m.id===WD.fort.queen),u=UMAP.get(m.id),camp=WD.camps[m.camp];
      return {seed:WD.seed,positions:[m,u,u.home,camp,WD.fort.home].map(v=>[v.x,v.y]),
        hp:u.maxHp,dmg:u.atkDmg,r:METEOR.radius,savedSeed:ArenaProject.forMatch().seed};
    }""")
    assert actual['seed']==777 and all(p==pos for p in actual['positions']), actual
    combat=page.evaluate("""() => {
      const u=ME();u.wk='axe';u.wt=0;u.skl[0]=1;u.cd[0]=0;u.wv=0;recalc(u,true);
      const cast=cast0(u,0),cost=SK.axe[0].mp[0];
      u.xs=SPX.indexOf(SPECIAL_BY.heal);u.xl=1;u.xcd=0;
      const heal=castSpecial(u);
      return [cast,u.cd[0],u.mp===u.maxMp-cost,heal,Math.round(100*u.hotV*u.hotT/u.maxHp),WD.boxes[0].x,WD.boxes[0].y];
    }""")
    assert combat==[True,3.25,True,True,48,*target['at']],combat
    assert actual['hp']==31000 and actual['dmg']==184 and actual['r']==320, actual
    room_defaults=page.evaluate("""() => {net.mode='host';return ArenaProject.forMatch()}""")
    assert room_defaults == page.evaluate('ArenaProject.published')
    assert page.evaluate('() => {ArenaProject.activate(ArenaProject.forMatch());return HB.hp===700 && SK.axe[0].cd[0]===12 && DASH_CD===45 && ArenaRegions.atmosphere[2].bloom===.7}')
    assert not errors, errors
    page.close()
    return {'catalog':catalog,'positions':pos,'meteor':skill,'solo':actual,'chest':target,'combat':combat}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pictures',type=Path)
    parser.add_argument('--password-file',type=Path,help='Test the shipped editor with a local password file')
    args=parser.parse_args()
    with TemporaryDirectory() as tmp, ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(SITE))) as site:
        password=args.password_file.read_text().rstrip('\r\n') if args.password_file else secrets.token_urlsafe(24)
        gate=None
        if not args.password_file:
            gate=Path(tmp)/'editor.html'
            subprocess.run(['node',str(SITE.parents[3]/'src/tools/pack-editor.mjs'),'--test-output',str(gate)],input=password,text=True,check=True)
        Thread(target=site.serve_forever,daemon=True).start()
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox','--enable-unsafe-swiftshader'])
            print(json.dumps(run(browser,f'http://127.0.0.1:{site.server_port}/index.html',args.pictures,password,gate),ensure_ascii=False))
            browser.close()
        site.shutdown()
