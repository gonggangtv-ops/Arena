"""Exercise editor gestures, the real Meteor cast, playtest, project files and a fresh Solo match over HTTP."""
import argparse
import json
import re
import shutil
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

SITE = Path(__file__).resolve().parents[2] / 'app/src/main/assets'


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def run(browser, url, pictures):
    page = browser.new_page(viewport={'width': 1120, 'height': 680}, device_scale_factor=1)
    page.set_default_timeout(150000)
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
        page.goto(url, wait_until='domcontentloaded')
        page.wait_for_function("window.MoonfallLoading?.isReady()||window.MoonfallLoading?.snapshot().failed||window.__moonfallCodeFailure", polling=100)
        assert page.evaluate('MoonfallLoading.isReady()'), errors

    def click(selector):
        page.locator(selector).click(force=True)

    def fill(selector, value):
        box = page.locator(selector)
        box.fill(str(value))
        box.press('Tab')

    def photo(name):
        if pictures:
            pictures.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=pictures / name)

    page.route('**/moonfall-loading.js', seed)
    ready()
    page.evaluate("ArenaProject.save({version:1,seed:null,kinds:{},spawns:{},meteor:{}})")
    click('#arenaEditorBtn')
    page.wait_for_function("state==='editor'", polling=100)
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
    page.mouse.move(drag['from']['x'], drag['from']['y'])
    page.mouse.down()
    page.mouse.move(drag['to']['x'], drag['to']['y'], steps=3)
    page.mouse.up()
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
    with page.expect_download() as dl:
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
    assert actual['hp']==31000 and actual['dmg']==184 and actual['r']==320, actual
    room_defaults=page.evaluate("""() => {net.mode='host';return ArenaProject.forMatch()}""")
    assert room_defaults == page.evaluate('ArenaProject.published')
    assert not errors, errors
    page.close()
    return {'positions':pos,'meteor':skill,'solo':actual}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pictures',type=Path)
    args=parser.parse_args()
    with ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(SITE))) as site:
        Thread(target=site.serve_forever,daemon=True).start()
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox','--enable-unsafe-swiftshader'])
            print(json.dumps(run(browser,f'http://127.0.0.1:{site.server_port}/index.html',args.pictures),ensure_ascii=False))
            browser.close()
        site.shutdown()
