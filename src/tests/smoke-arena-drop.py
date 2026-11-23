"""Arena Royale: sky drop, village merchants and the loot balance (owner 2026-11-23).

Two browser contexts run the production host/client protocol over a local transport (the same pattern as
smoke-arena-vfx-client.py): the host starts a match, the client receives the start packet, the drop events and
the snapshots through the game's own snapFor/clientOnData. Checks:
  · the host freezes the world while players pick; the client sees the pick phase, picks a spot, the host lands
    the client's hero there; game actions sent during the drop are ignored; both sides end with the drop over
  · every village has a merchant; buying away from one is refused, beside one it works
  · weapons and armour mostly come from houses now (open-ground counts stay low)
Run: python3 src/tests/smoke-arena-drop.py
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import shutil

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / 'app/src/main/assets'


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


WIRE = r"""() => {
  window.__dTransport={kind:'peer',budget:14000,send(cid,packet){(window.__dWire=window.__dWire||[]).push({cid,packet:JSON.parse(JSON.stringify(packet))});},
    setState(){},input(){},toHost(){},snap(){},kick(){},close(){}};
  window.__dPacket=()=>{net.cl['drop-client'].seen=0;return snapFor('drop-client',net.cl['drop-client'],14000);};
  return true}"""

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(SITE)))
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}'


def boot(browser, mobile=False):
    context = browser.new_context(viewport={'width': 844 if mobile else 1100, 'height': 390 if mobile else 700},
                                  is_mobile=mobile, has_touch=mobile)
    page = context.new_page()
    page.set_default_timeout(180000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/favicon.ico', lambda route: route.fulfill(status=204))
    # no frame loop: the page's own broadcastSnaps would drain the event queue into the stub transport
    page.add_init_script("window.__noMenu=true;window.requestAnimationFrame=cb=>1;localStorage.setItem('ar_q','low');localStorage.setItem('ar_mute','1')")
    page.goto(url + '/index.html', wait_until='domcontentloaded', timeout=180000)
    page.wait_for_function('window.MoonfallLoading&&(MoonfallLoading.isReady()||MoonfallLoading.snapshot().failed)', polling=100)
    assert page.evaluate('MoonfallLoading.isReady()'), page.evaluate('MoonfallLoading.snapshot()')
    assert page.evaluate(WIRE)
    return page, errors


report = {}
try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=shutil.which('chromium'),
                                             args=['--no-sandbox', '--enable-unsafe-swiftshader'])
        host, host_errors = boot(browser)
        client, client_errors = boot(browser, mobile=True)
        host.evaluate("""() => {
          net.mode='host';net.tr=__dTransport;net.pub=false;net.qm=false;net.cfg={max:2,fill:1,size:'L',ts:1};
          net.lobby=[{ctrl:'host',name:'DropHost',look:0,team:0},{ctrl:'drop-client',name:'DropClient',look:1,team:0}];
          net.cl={'drop-client':{q:[],seq:0,ea:0,seen:0}};hostStartMatch();}""")
        host.wait_for_function('state==="play"', polling=100)
        start = host.evaluate("__dWire.find(m=>m.packet.t==='start').packet")
        # the host is in the pick phase and the world is frozen
        frozen = host.evaluate("""() => {const t0=gameT,z=zone.t;for(let i=0;i<20;i++)hostUpdate(1/30);
          return {st:DROP.st,gameT:gameT===t0,zone:zone.t===z,heroes:units.filter(u=>u.hero).length,hidden:units.filter(u=>u.hero&&!unitVisibleTo(u,ME(),listener())).length}}""")
        assert frozen['st'] == 'pick' and frozen['gameT'] and frozen['zone'], frozen
        assert frozen['hidden'] == frozen['heroes'], frozen
        report['hostPick'] = frozen
        client.evaluate("packet=>{net.mode='client';net.tr=__dTransport;clientOnData(packet);}", start)
        client.wait_for_function('state==="play"', polling=100)
        assert client.evaluate('DROP.st') == 'wait'
        packet = host.evaluate('__dPacket()')
        client.evaluate("p=>clientOnData(p)", packet)
        cpick = client.evaluate("({st:DROP.st,t:DROP.t,tot:DROP.tot})")
        assert cpick['st'] == 'pick' and cpick['t'] > 0, cpick
        report['clientPick'] = cpick
        # the client picks a village; a dash sent during the pick is ignored
        want = client.evaluate("(()=>{const v=WD.villages[3];return{x:Math.round(v.x+40),y:Math.round(v.y+40)}})()")
        cid = host.evaluate("""p=>{const u=units.find(q=>q.ctrl==='drop-client');hostOnData('drop-client',{t:'dg',x:1,y:0});
          const dashed=!!u.dash;hostOnData('drop-client',{t:'land',x:p.x,y:p.y,r:1});return{id:u.id,dashed,pick:DROP.picks.get(u.id),ready:DROP.ready.has(u.id)}}""", want)
        assert not cid['dashed'] and cid['ready'] and abs(cid['pick']['x'] - want['x']) < 1, cid
        host.evaluate("DROP.choose({x:WD.villages[0].x,y:WD.villages[0].y},true)")
        fall = host.evaluate("""id=>{for(let i=0;i<60&&DROP.st==='pick';i++)hostUpdate(1/30);const u=UMAP.get(id),q=DROP.fall&&DROP.fall.L.get(id);
          return{st:DROP.st,at:[Math.round(u.x),Math.round(u.y)],q:q?[Math.round(q.x),Math.round(q.y)]:null,n:DROP.fall?DROP.fall.L.size:0}}""", cid['id'])
        assert fall['st'] == 'fall' and fall['n'] >= 2, fall
        landed = ((fall['at'][0] - want['x'])**2 + (fall['at'][1] - want['y'])**2) ** .5
        assert landed < 900, (fall, want)
        report['hostFall'] = dict(fall, fromPick=round(landed))
        packet = host.evaluate('__dPacket()')
        client.evaluate("p=>clientOnData(p)", packet)
        cfall = client.evaluate("id=>{const q=DROP.fall&&DROP.fall.L.get(id);return{st:DROP.st,q:q?[q.x,q.y]:null,me:myId}}", cid['id'])
        assert cfall['st'] == 'fall' and cfall['q'] and cfall['me'] == cid['id'], cfall
        report['clientFall'] = cfall
        done = host.evaluate("""()=>{const t0=gameT;for(let i=0;i<220&&DROP.st==='fall';i++)hostUpdate(1/30);for(let i=0;i<30;i++)hostUpdate(1/30);return{st:DROP.st,runs:gameT>t0}}""")
        assert done['st'] == 'done' and done['runs'], done
        packet = host.evaluate('__dPacket()')
        client.evaluate("p=>{DROP.now=()=>performance.now()/1000+30;clientOnData(p)}", packet)
        cdone = client.evaluate("""()=>{const me=ME();return{st:DROP.st,visible:unitVisibleTo(me,me,me),pos:[Math.round(me.x),Math.round(me.y)]}}""")
        assert cdone['st'] in ('done', 'off') and cdone['visible'], cdone
        report['done'] = {'host': done, 'client': cdone}
        # merchants and the shop gate
        shop = host.evaluate("""()=>{const me=ME();me.gold=999;let away=null;for(let i=0;i<400&&!away;i++){const p={x:2000+Math.random()*(WORLD-4000),y:2000+Math.random()*(WORLD-4000)};if(!npcNear(p,600))away=p}me.x=away.x;me.y=away.y;const far=shopBuy(me,'hp');const n=WD.npcs[0];me.x=n.x+60;me.y=n.y;const near=shopBuy(me,'hp');
          return{npcs:WD.npcs.length,villages:WD.villages.length,far,near,gold:me.gold}}""")
        assert shop['npcs'] == shop['villages'] and not shop['far'] and shop['near'], shop
        report['shop'] = shop
        loot = host.evaluate("""()=>{const c={};for(const it of WD.items){const k=it.k+(it.house!==undefined?'_house':'');c[k]=(c[k]||0)+1}return c}""")
        assert loot['w_house'] > loot['w'] and loot['r_house'] > loot['r'], loot
        report['loot'] = loot
        assert not host_errors and not client_errors, (host_errors, client_errors)
        browser.close()
finally:
    server.shutdown()
print(json.dumps(report, ensure_ascii=False, indent=1))
