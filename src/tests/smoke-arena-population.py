"""Exercise a published spawn project on two HTTP clients using the room's start and snapshot messages."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
import json
import shutil
import subprocess
import sys

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
ASSETS = Path('app/src/main/assets')
PROJECT = {
    'version': 3, 'seed': 777, 'kinds': {}, 'spawns': {}, 'meteor': {},
    'chests': {'radius': 650, 'boxes': {'0': 0}},
    'encounters': {'2': {'kind': 'wolf', 'name': 'Ash wolf', 'count': 4, 'stats': {'hp': 702}}},
}


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def build_fixture(tmp):
    src, site = tmp / 'src', tmp / ASSETS
    shutil.copytree(ROOT / 'src', src, ignore=shutil.ignore_patterns('tests', '__pycache__', 'index.html'))
    site.mkdir(parents=True)
    for p in (ROOT / ASSETS).iterdir():
        if p.suffix != '.html':
            (site / p.name).symlink_to(p)
    (src / 'arena-project.json').write_text(json.dumps(PROJECT))
    subprocess.run([sys.executable, src / 'build.py'], check=True, stdout=subprocess.DEVNULL)
    shutil.copy2(src / 'index.html', site / 'index.html')
    return site


def run(browser, url):
    errors = []
    host, guest = browser.new_page(), browser.new_page()
    for page in (host, guest):
        page.set_default_timeout(120000)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.add_init_script("requestAnimationFrame=()=>0;window.__noMenu=true;localStorage.setItem('ar_q','low');localStorage.setItem('ar_mute','1')")
        page.goto(url, wait_until='domcontentloaded')
        page.wait_for_function('window.MoonfallLoading?.isReady()', polling=100)
        page.evaluate("""() => {
          const draft=structuredClone(ArenaProject.published);draft.chests.radius=0;draft.encounters={};
          localStorage.setItem(ArenaProject.storageKey,JSON.stringify(draft));
          window.packets=[];net.tr={kind:'peer',budget:14000,send(id,msg){packets.push(msg)},setState(){},snap(){},input(){},toHost(){},close(){}};
        }""")
    host.evaluate("""() => {
      net.mode='host';net.cfg={max:2,fill:0,size:'L',ts:1};
      net.lobby=[{ctrl:'host',name:'Owner',look:0,team:0},{ctrl:'guest',name:'Guest',look:1,team:0}];
      net.cl={guest:{q:[],seq:0,ea:0,seen:0}};hostStartMatch();
    }""")
    ready = "state==='play'&&$('loading').classList.contains('hidden')"
    host.wait_for_function(ready, polling=100)
    start = host.evaluate("packets.find(p=>p.t==='start')")
    assert start['seed'] == 777 and isinstance(start['lootSeed'], int)
    guest.evaluate("p=>{net.mode='client';clientOnData(p)}", start)
    guest.wait_for_function(ready, polling=100)
    digest = """() => ({
      boxes:WD.boxes.map(b=>[b.id,b.x,b.y,b.a,b.vault,b.house,b.cave]),
      monsters:WD.mobs.filter(m=>m.encounter).map(m=>[m.id,m.x,m.y,UMAP.get(m.id).def.name,UMAP.get(m.id).def.hp]),
      version:qmHello().v
    })"""
    state = host.evaluate(digest)
    assert state == guest.evaluate(digest)
    assert state['version'].startswith('spawn-')
    assert [m[0] for m in state['monsters']] == list(range(50032,50036))
    assert all(m[3:] == ['Ash wolf',702] for m in state['monsters'])
    snapshot = host.evaluate("""() => {
      DROP.skip();
      const b=boxes[1],u=units.find(h=>h.ctrl==='guest'),p=ArenaPopulation.approach(b,u.r);
      u.x=p.x;u.y=p.y;hostOnData('guest',{t:'ob',id:b.id});
      return snapFor('guest',net.cl.guest,net.tr.budget);
    }""")
    guest.evaluate('p=>clientOnData(p)',snapshot)
    assert host.evaluate('boxes[1].open') and guest.evaluate('boxes[1].open')
    reroll = guest.evaluate("""() => {
      const p=ArenaProject.published;
      const sample=(seed,roll,project=p)=>{
        setupWorld(seed,undefined,project,false,roll);
        return {boxes:WD.boxes.map(b=>[b.x,b.y]),mobs:WD.mobs.filter(m=>m.encounter).map(m=>[m.id,m.x,m.y])};
      };
      const a=sample(777,10),b=sample(777,11),again=sample(777,10),base=sample(777);
      const other=sample(17,10),globalOnly=sample(17,10,{...p,chests:{radius:650,boxes:{}}});
      const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
      return {different:a.boxes.filter((point,i)=>!eq(point,b.boxes[i])).length,repeat:eq(a,again),
        pinned:eq(a.boxes[0],base.boxes[0]),stable:eq(a.mobs,b.mobs),other:other.mobs.length,
        scoped:eq(other,globalOnly),native:CREEPS.wolf.hp};
    }""")
    assert reroll['different'] > 0
    assert all(reroll[k] for k in ('repeat','pinned','stable','scoped'))
    assert reroll['other'] == 4 and reroll['native'] == 450 and not errors, (reroll, errors)
    print(json.dumps({'matchedChests':len(state['boxes']),'matchedMonsters':len(state['monsters']),'reroll':reroll}))


if __name__ == '__main__':
    with TemporaryDirectory() as tmp:
        site = build_fixture(Path(tmp))
        with ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(site))) as server, sync_playwright() as pw:
            Thread(target=server.serve_forever, daemon=True).start()
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox','--enable-unsafe-swiftshader'])
            run(browser, f'http://127.0.0.1:{server.server_port}/index.html')
            browser.close()
