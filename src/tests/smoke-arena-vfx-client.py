"""Two real browser contexts exercise Arena's production host/client protocol.

Only the transport is local: start messages, event queues, snapshots, decoding,
client updates, and visual rendering are the game's real implementation. No
PeerJS traffic is sent. Real deployment assets are served over HTTP.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import shutil
import tempfile
import time

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / 'app/src/main/assets'
OUT = ROOT / 'moonfall-docs/reports/arena-vfx/client.json'
SHOTS = Path(tempfile.mkdtemp(prefix='arena-vfx-client-'))


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


HELPERS = r"""() => {
  const fields=['id','x','y','hp','mp','maxHp','maxMp','wk','wt','wv','wk2','wt2',
    'atkDmg','armorV','mr','dmgB','spdB','gold','xp','lvl','pts','dead','team',
    'hidden','invisT','shieldHp','shieldT','stunT','slowT','rootT','burnT',
    'spinT','lotusT','fuseT','xcd','xs','xl','sta','atkCd','cd','skl','bag','bcd'];
  const select=(object,keys)=>Object.fromEntries(keys.map(key=>[key,object[key]]));
  window.__avDigest=()=>JSON.stringify({gameT,alive,MC,zone,
    units:units.map(unit=>select(unit,fields)),
    projs:projs.map(p=>({...select(p,['x','y','vx','vy','kind','r','el','dmg','life','dead','type']),owner:p.owner?.id,hit:p.hit?[...p.hit].map(x=>typeof x==='object'?x.id:x):null})),
    aoes:aoes.map(a=>({...select(a,['x','y','r','t','delay','dot','kind','fxT','vis','done','dmg','type','shape','len','w','arc','ang']),owner:a.owner?.id})),
    inventory:items.map(item=>select(item,['id','k','x','y','wk','tier','dead']))});
  window.__avRender=(dt,full=false)=>{
    const before=__avDigest();
    if(full)R3.frame(dt);else R3.effects(performance.now()/1000,dt,ME(),listener());
    if(before!==__avDigest())throw Error('Visual rendering mutated authoritative gameplay fields');
    return ArenaVFX.snapshot();
  };
  window.__avTransport={kind:'peer',budget:14000,
    send(cid,packet){window.__avWire.push({cid,packet:JSON.parse(JSON.stringify(packet))});},
    setState(){},input(){},toHost(){},snap(){},kick(){},close(){}};
  window.__avWire=[];
  window.__avPacket=()=>{net.cl['vfx-client'].seen=0;return snapFor('vfx-client',net.cl['vfx-client'],14000);};
  window.__avApply=(packet,dt=1/60,full=false)=>{
    const serialized=JSON.stringify(packet);clientOnData(packet);
    if(serialized!==JSON.stringify(packet))throw Error('Snapshot decoding/rendering changed the wire payload');
    return __avRender(dt,full);
  };
  window.__avGear=(unit,key)=>{unit.wk=key;unit.wt=2;unit.wv=0;unit.lvl=8;
    unit.skl=[1,1,1];unit.cd=[0,0,0];unit.stunT=0;unit.rootT=0;unit.fuseT=0;
    unit.dash=null;unit.leap=null;unit.kb=null;unit.spinT=0;unit.lotusT=0;
    unit.hidden=false;unit.invisT=0;recalc(unit,true);};
  return {index:CURSED&&!MOON,profiles:Object.keys(ArenaVFX.profiles).length};
}"""


def bounded(snapshot):
    assert snapshot['enabled'], snapshot
    assert snapshot['batchCount'] == 8, snapshot
    assert snapshot['allocatedGeometries'] == snapshot['allocatedMaterials'] == 8
    assert snapshot['totalActive'] <= snapshot['totalCapacity'], snapshot
    assert all(b['active'] <= b['capacity'] for b in snapshot['batches'].values()), snapshot


server = ThreadingHTTPServer(
    ('127.0.0.1', 0), partial(Handler, directory=str(SITE)))
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}'
report = {'transport': 'local messages through production start/snapFor/clientOnData/applySnap',
          'externalPeerJSMessages': False, 'hardwareFPSBenchmark': False}


def boot(browser, *, mobile=False):
    context = browser.new_context(
        viewport={'width': 844 if mobile else 1100, 'height': 390 if mobile else 700},
        is_mobile=mobile, has_touch=mobile)
    page = context.new_page()
    page.set_default_timeout(180000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/favicon.ico', lambda route: route.fulfill(status=204))
    page.add_init_script("window.__noMenu=true;window.requestAnimationFrame=cb=>1;"
                         "localStorage.setItem('ar_q','low');localStorage.setItem('ar_snd','2');"
                         "localStorage.setItem('ar_mute','1')")
    page.goto(url + '/index.html', wait_until='domcontentloaded', timeout=180000)
    page.wait_for_function('window.MoonfallLoading&&(MoonfallLoading.isReady()||MoonfallLoading.snapshot().failed)', polling=100)
    assert page.evaluate('MoonfallLoading.isReady()'), page.evaluate('MoonfallLoading.snapshot()')
    assert page.evaluate(HELPERS) == {'index': True, 'profiles': 21}
    return page, errors


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=shutil.which('chromium'),
            args=['--no-sandbox', '--enable-unsafe-swiftshader'])
        host, host_errors = boot(browser)
        client, client_errors = boot(browser, mobile=True)
        host.evaluate("""() => {
          net.mode='host';net.tr=__avTransport;net.pub=false;net.qm=false;
          net.cfg={max:2,fill:0,size:'S',ts:1};
          net.lobby=[{ctrl:'host',name:'VFXHost',look:0,team:0},
            {ctrl:'vfx-client',name:'VFXClient',look:1,team:0}];
          net.cl={'vfx-client':{q:[],seq:0,ea:0,seen:0}};
          hostStartMatch();
        }""")
        host.wait_for_function('state==="play"&&document.getElementById("loading").classList.contains("hidden")', polling=100)
        start = host.evaluate("__avWire.find(message=>message.packet.t==='start').packet")
        assert len(start['heroes']) == 2
        client.evaluate("packet=>{net.mode='client';net.tr=__avTransport;clientOnData(packet);}", start)
        client.wait_for_function('state==="play"&&document.getElementById("loading").classList.contains("hidden")', polling=100)
        positions = host.evaluate("""() => {
          const h=ME(),c=units.find(unit=>unit.ctrl==='vfx-client');let spot=null;
          for(const p of [{x:h.x,y:h.y},...(ASP||WD.spawns)]){
            if(walkable(p.x,p.y,30)&&walkable(p.x+260,p.y,30)&&!houseAt(p)&&!houseAt({x:p.x+260,y:p.y})&&!WD.caves.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<q.R+400)){spot=p;break;}}
          if(!spot)throw Error('No clear production spawn for the protocol fixture');
          h.x=h.tx=spot.x;h.y=h.ty=spot.y;c.x=c.tx=spot.x+260;c.y=c.ty=spot.y;
          __avGear(h,'fire');__avGear(c,'sword');h.fx=1;h.fy=0;
          return {hostId:h.id,clientId:c.id,distance:dist(h,c)};
        }""")
        client.evaluate('packet=>__avApply(packet,1/60,true)', host.evaluate('__avPacket()'))

        # A real projectile cast and delayed AOE are serialized by production
        # snapFor. The client receives their original compact, ownerless schema.
        cast = host.evaluate("""() => {
          R3.avReset();const u=ME(),target={x:u.x+420,y:u.y};
          const projectile=cast(u,0,target),area=cast(u,2,target);
          return {projectile,area,projectiles:projs.length,areas:aoes.length};
        }""")
        assert cast['projectile'] and cast['area'] and cast['projectiles'] > 0 and cast['areas'] > 0, cast
        packet = host.evaluate('__avPacket()')
        assert packet['p'] and all(len(row) in [6, 7] for row in packet['p'])
        assert packet['o'] and all(len(row) == 12 for row in packet['o'])
        host_fx = host.evaluate('__avRender(1/60,true)')
        client_fx = client.evaluate('packet=>{R3.avReset();return __avApply(packet,1/60,true);}', packet)
        bounded(host_fx)
        bounded(client_fx)
        assert host_fx['accepted'] > 0 and client_fx['accepted'] > 0
        assert host_fx['marks'].get('fire#0', 0) > 0, host_fx
        assert client_fx['marks'] == {}, 'Ownerless snapshot effects must not invent a caster/skill identity'
        ownership = client.evaluate("({mode:net.mode,projectileOwnerOmitted:projs.every(p=>!('owner'in p)),areaOwnerElementOmitted:aoes.every(a=>!('owner'in a)&&!('el'in a))})")
        assert ownership == {'mode': 'client', 'projectileOwnerOmitted': True, 'areaOwnerElementOmitted': True}
        host.screenshot(path=str(SHOTS / 'host-real-cast.png'), scale='css')
        client.screenshot(path=str(SHOTS / 'mobile-client-real-cast.png'), scale='css')
        report['realCast'] = {'cast': cast, 'positions': positions, 'wireProjectileRows': len(packet['p']),
                              'wireAreaRows': len(packet['o']), 'ownership': ownership,
                              'host': host_fx, 'client': client_fx}
        print('PASS real host casts -> compact production snapshots -> mobile client VFX', flush=True)

        # Nova has no DOT refresh. Recreate its object on every authoritative
        # snapshot, then replay stationary state with fresh sequence numbers.
        host.evaluate("""() => {projs=[];aoes=[];fxq=[];__avGear(ME(),'fire');
          if(!cast(ME(),1))throw Error('Real nova cast rejected');}""")
        client.evaluate('()=>{R3.avReset();swings=[];fxq=[];}')
        first = client.evaluate('packet=>__avApply(packet)', host.evaluate('__avPacket()'))
        assert first['accepted'] > 0
        started = time.monotonic()
        replacements = 0
        for index in range(72):
            if index < 12:
                packet = host.evaluate('()=>{hostUpdate(1/60);return __avPacket();}')
            else:
                packet = host.evaluate('__avPacket()')
            result = client.evaluate("""packet=>{
              const previous=aoes[0];clientOnData(packet);const replaced=!!previous&&!!aoes[0]&&previous!==aoes[0];
              clientUpdate(1/30);return {replaced,fx:__avRender(1/30)};
            }""", packet)
            replacements += int(result['replaced'])
            bounded(result['fx'])
            assert result['fx']['accepted'] == first['accepted'], (index, first, result)
            assert result['fx']['marks'] == {}
            client.wait_for_timeout(16)
        assert replacements == 72, replacements
        assert result['fx']['totalActive'] == 0, result
        report['snapshotDedupe'] = {'snapshots': 72, 'objectsActuallyRecreated': replacements,
            'authoritativeTimeAdvanced': packet['g'], 'renderTimeSeconds': 72/30,
            'wallSeconds': round(time.monotonic()-started, 3), 'initial': first,
            'final': result['fx'], 'noRepeatedOneShotOrInventedIdentity': True}
        print('PASS recreated client AOE snapshots: no repeated one-shot and full expiry', flush=True)

        # The original shield event gives the client a real known unit ID.
        host.evaluate("""() => {projs=[];aoes=[];fxq=[];__avGear(ME(),'sword');
          if(!cast(ME(),1))throw Error('Real shield cast rejected');}""")
        shield_packet = host.evaluate('__avPacket()')
        shield_event = next(row[1] for row in shield_packet['e']
                            if isinstance(row[1], dict) and row[1].get('k') == 'shield')
        client.evaluate('packet=>{R3.avReset();return __avApply(packet);}', shield_packet)
        following = client.evaluate("""id=>{const u=UMAP.get(id);window.__avTracked=[];
          for(const batch of Object.values(R3._av.batches))for(const slot of batch.slots)if(slot.on&&slot.follow===u)__avTracked.push(slot);
          return {count:__avTracked.length,visible:unitVisibleTo(u,ME(),listener()),distance:dist(u,ME())};}""", positions['hostId'])
        assert following['count'] > 0 and following['visible'] and following['distance'] > 170, following
        host.evaluate('()=>{ME().hidden=true;ME().invisT=3;}')
        hidden = client.evaluate("""packet=>{clientOnData(packet);const u=UMAP.get(__avTracked[0].follow.id);
          const before=__avDigest();R3.avStep(1/60);const admitted=R3.avEmit('dome',{x:u.x,y:u.y,r:60,life:1,follow:u});
          return {visible:unitVisibleTo(u,ME(),listener()),admitted,activeTracked:__avTracked.filter(s=>s.on||s.follow).length,unchanged:before===__avDigest()};}""", host.evaluate('__avPacket()'))
        assert hidden == {'visible': False, 'admitted': False, 'activeTracked': 0, 'unchanged': True}, hidden
        host.evaluate('()=>{ME().hidden=false;ME().invisT=0;}')
        revealed = client.evaluate("""packet=>{clientOnData(packet);R3.avStep(1/60);return __avTracked.every(s=>!s.on&&s.follow===null);}""", host.evaluate('__avPacket()'))
        assert revealed, 'Hidden follow effects became active again after reveal'
        report['hiddenFollow'] = {'before': following, 'hidden': hidden, 'expiredSlotsStayReleased': revealed}

        # The actual shield event is also a direct renderer input. It and all
        # simulation fields must remain byte-for-byte unchanged by rendering.
        direct = client.evaluate("""event=>{R3.avReset();const source=JSON.stringify(event),before=__avDigest();
          R3.doFx(event,ME(),listener());R3.avStep(1/60);return {eventUnchanged:source===JSON.stringify(event),gameplayUnchanged:before===__avDigest(),fx:ArenaVFX.snapshot()};}""", shield_event)
        assert direct['eventUnchanged'] and direct['gameplayUnchanged']
        bounded(direct['fx'])
        report['directEvent'] = direct
        print('PASS production shield follow: hidden-unit culling and immutable event/gameplay fields', flush=True)

        resources = client.evaluate("""() => {
          R3.avReset();const before=__avDigest(),u=ME(),types=Object.keys(R3._av.batches);
          const ids=()=>Object.values(R3._av.batches).map(b=>[b.mesh.uuid,b.geometry.uuid,b.material.uuid]);
          const original=JSON.stringify(ids());
          for(let i=0;i<2000;i++)R3.avEmit(types[i%types.length],{x:u.x,y:u.y,r:50,life:.3});
          R3.avStep(0);const capped=ArenaVFX.snapshot();
          for(let frame=0;frame<30;frame++){R3.avStep(1/30);for(let i=0;i<70;i++)R3.avEmit(types[i%types.length],{x:u.x,y:u.y,r:50,life:.2});}
          R3.avStep(.4);const settled=ArenaVFX.snapshot(),sameResources=original===JSON.stringify(ids());
          let geometryDisposals=0,materialDisposals=0;
          for(const b of Object.values(R3._av.batches)){b.geometry.addEventListener('dispose',()=>geometryDisposals++);b.material.addEventListener('dispose',()=>materialDisposals++);}
          R3.avDispose();const disposed=ArenaVFX.snapshot(),remainingMeshes=R3.scene.children.filter(n=>n.userData.arenaVFX).length;
          R3.avReset();return {capped,settled,sameResources,geometryDisposals,materialDisposals,
            disposed,remainingMeshes,recreated:ArenaVFX.snapshot(),gameplayUnchanged:before===__avDigest()};
        }""")
        bounded(resources['capped'])
        bounded(resources['settled'])
        bounded(resources['recreated'])
        assert resources['capped']['accepted'] <= resources['capped']['frameBudget']
        assert resources['capped']['dropped'] > 0
        assert resources['settled']['totalActive'] == 0
        assert resources['sameResources'] and resources['gameplayUnchanged']
        assert resources['geometryDisposals'] == resources['materialDisposals'] == 8
        assert not resources['disposed']['enabled'] and resources['remainingMeshes'] == 0
        report['boundedResources'] = resources
        report['errors'] = {'host': host_errors, 'client': client_errors}
        assert not host_errors and not client_errors, report['errors']
        report['passed'] = True
        print('PASS fixed batches, frame/pool budgets, disposal/recreation, no gameplay writes', flush=True)
        host.context.close()
        client.context.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print('Screenshots (not committed):', SHOTS, flush=True)
