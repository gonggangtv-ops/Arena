"""Real optimized assets, strict boot, item/fusion art, purchases and input.
Failure routes intentionally block entry; no replacement model/art fixtures.
Screenshots remain under /tmp, per AGENTS.md. No public multiplayer messages.
"""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
import json,shutil,tempfile
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];SITE=ROOT/'app/src/main/assets'
OUT=ROOT/'moonfall-docs/reports/ui-ux';OUT.mkdir(parents=True,exist_ok=True)
SHOTS=Path(tempfile.mkdtemp(prefix='arena-ui-ux-'))
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(SITE)));Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}'
reports=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox','--enable-unsafe-swiftshader'])
 def fresh(mobile=False):
  context=browser.new_context(viewport={'width':844 if mobile else 1100,'height':390 if mobile else 700},is_mobile=mobile,has_touch=mobile,**({'user_agent':'Mozilla/5.0 (Linux; Android 14) Mobile'} if mobile else {}));page=context.new_page();page.set_default_timeout(180000);errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('**/favicon.ico',lambda r:r.fulfill(status=204))
  page.add_init_script("window.__noMenu=true;window.requestAnimationFrame=cb=>1;localStorage.setItem('ar_q','low');localStorage.setItem('ar_sound','off')")
  return page,errors
 def go(page):
  page.goto(url+'/cursed.html',wait_until='domcontentloaded',timeout=180000);page.wait_for_function('window.MoonfallLoading',polling=100)
 def ready(page):
  page.wait_for_function('window.MoonfallLoading&&(MoonfallLoading.snapshot().phase==="ready"||MoonfallLoading.snapshot().failed)',polling=100)
  assert page.evaluate('MoonfallLoading.isReady()'),page.evaluate('MoonfallLoading.snapshot()')
 def play(page):
  page.locator('#soloBtn').click(no_wait_after=True);page.wait_for_function('state==="play"&&document.getElementById("loading").classList.contains("hidden")',polling=100)
 for mobile in [False,True]:
  page,errors=fresh(mobile);held=[];page.route('**/moon-boulder.glb',lambda route:held.append(route));go(page)
  page.wait_for_function('CelestialAssets.snapshot().assets.some(a=>a.key==="moon-boulder"&&a.state==="loading")',polling=100)
  assert page.locator('#soloBtn').is_disabled() and page.locator('#loading').is_visible()
  blocked=page.evaluate("()=>{document.getElementById('soloBtn').click();hostStartMatch();hostStartMatch2();enterPlay();quickMatch();hostRoom();joinRoom('BLOCK','');return state==='menu'&&units.length===0&&net.tr===null;}")
  assert blocked
  page.screenshot(path=str(SHOTS/f'loading-{mobile}.png'),scale='css')
  for route in held:route.continue_()
  page.unroute('**/moon-boulder.glb');ready(page)
  boot=page.evaluate('MoonfallLoading.snapshot()');assert boot['packDone']==18 and boot['musicDone']==7
  coverage=page.evaluate("({skills:AW.reduce((n,k)=>n+SK[k].filter((_,i)=>!!MoonfallUI.icon(k,i)).length,0),items:Object.keys(MoonfallUI.snapshot().atlas.utilities).length,icons:MoonfallUI.snapshot().loadedIcons,models:CelestialAssets.snapshot().assets.every(a=>a.state==='loaded'),qn:!!R3.qn&&!R3.qn.mobOnly})")
  assert coverage=={'skills':63,'items':18,'icons':81,'models':True,'qn':True},coverage
  play(page)
  page.evaluate("__game.lvl(8);__game.give('fSS_tempest',2,2);ME().skl=[1,1,1];ME().cd=[0,0,0];ME().bag=[3,3,1,1];ME().bcd=[0,0,0,0];ME().gold=5000;ME().mp=ME().maxMp;announce=null;R3.frame(1/30);CUR.toggle(true);CUR.step(.016)")
  assert page.locator('#moonfallShop .moonfall-shop-row').count()==11
  assert page.locator('#moonfallShop .moonfall-shop-row img').count()==11
  before=page.evaluate('({gold:ME().gold,n:ME().bag[0]})');page.locator('#moonfallShop [data-k="hp"]').click();page.evaluate('CUR.step(.016)')
  assert page.evaluate('ME().gold')==before['gold']-25 and page.evaluate('ME().bag[0]')==before['n']+1
  page.screenshot(path=str(SHOTS/f'shop-{mobile}.png'),scale='css')
  page.locator('#moonfallShop [data-k="close"]').click()
  page.evaluate('ME().hp=ME().maxHp*.5;R3.frame(1/30)');before=page.evaluate('ME().bag[0]')
  if mobile:
   session=page.context.new_cdp_session(page);point=page.evaluate('({x:UI.pot[0].x,y:UI.pot[0].y})');session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]});session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  else:page.keyboard.press('4')
  assert page.evaluate('ME().bag[0]')==before-1 and page.evaluate('ME().hotT>0')
  page.evaluate('ME().mp=ME().maxMp;ME().cd=[0,0,0]');mana=page.evaluate('ME().mp')
  if mobile:
   point=page.evaluate('({x:UI.sk[1].x,y:UI.sk[1].y})');session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]});session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  else:page.keyboard.press('e')
  assert page.evaluate('ME().mp')<mana and page.evaluate('ME().cd[1]>0')
  page.evaluate('R3.frame(1/30)');assert page.evaluate('!!R3.objs.get(ME().id).qn')
  page.screenshot(path=str(SHOTS/f'fusion-{mobile}.png'),scale='css')
  assert not errors,errors
  reports.append({'case':'real-game','mobile':mobile,'boot':boot,'coverage':coverage,'entryBlockedUntilLoaded':blocked,'purchasePrice':25,'potionAndSkillInput':True,'realRig':True,'errors':errors})
  if not mobile:
   # Capture actual production snapshot and bootstrap for a queued client test.
   payload=page.evaluate("()=>{net.tr={kind:'peer',budget:14000};net.snapN=0;ME().hp=ME().maxHp-123;return{start:{seed:WD.seed,cfg:MC,you:myId,heroes:units.filter(u=>u.hero).map(u=>[u.id,u.name,u.look,u.ctrl?1:0,u.team])},snapshot:snapFor('host',{q:[],ea:0},14000),hp:Math.floor(ME().hp)};}")
  page.context.close();print('PASS real game mobile='+str(mobile)+': strict gate, all art/models, real rig, shop price, potion and fusion input',flush=True)
 # Native client start cannot bypass boot, and queued production snapshots survive.
 page,errors=fresh();held=[];page.route('**/moon-boulder.glb',lambda route:held.append(route));go(page)
 page.wait_for_function('CelestialAssets.snapshot().assets.some(a=>a.key==="moon-boulder"&&a.state==="loading")',polling=100)
 page.evaluate("p=>{net.mode='client';clientStart(p.start);net.pendS.push(p.snapshot);}",payload);assert page.evaluate("state==='menu'")
 for route in held:route.continue_()
 page.unroute('**/moon-boulder.glb');ready(page);page.wait_for_function('state==="play"&&document.getElementById("loading").classList.contains("hidden")',polling=100)
 assert page.evaluate('Math.floor(ME().hp)')==payload['hp'],(page.evaluate('ME().hp'),payload['hp'])
 assert not errors,errors
 reports.append({'case':'queued-client','pendingSnapshotPreserved':True,'hp':payload['hp'],'errors':errors});page.context.close();print('PASS queued client start and production pending snapshot',flush=True)
 # Each failure is a hard stop, never a fallback scene or generic icon admission.
 for kind in ['model','art','music','character','manifest']:
  page,errors=fresh();broken={'yes':True}
  if kind=='model':page.route('**/moon-boulder.glb',lambda r:r.fulfill(status=503,body='unavailable') if broken['yes'] else r.continue_())
  elif kind=='art':page.route('**/moonfall-items.webp',lambda r:r.fulfill(status=200,content_type='image/webp',body=b'invalid') if broken['yes'] else r.continue_())
  elif kind=='music':page.route('**/music/menu.mp3',lambda r:r.fulfill(status=503,body='unavailable'))
  elif kind=='character':page.route('**/models2.js',lambda r:r.fulfill(content_type='text/javascript',body=(SITE/'models2.js').read_text()+';delete window.AR_QN.h_M;'))
  else:
   manifest=json.loads((SITE/'assets/meshy/manifest.json').read_text());manifest['assets'].pop('moon-boulder');page.route('**/assets/meshy/manifest.json',lambda r:r.fulfill(json=manifest))
  go(page);page.wait_for_function('MoonfallLoading.snapshot().failed',polling=100)
  assert page.locator('#soloBtn').is_disabled() and page.locator('#moonfallLoadRetry').is_visible()
  assert page.evaluate("()=>{hostStartMatch();hostStartMatch2();enterPlay();return state==='menu';}")
  reports.append({'case':'blocked-'+kind,'snapshot':page.evaluate('MoonfallLoading.snapshot()'),'noEntry':True})
  page.screenshot(path=str(SHOTS/f'failed-{kind}.png'),scale='css')
  if kind=='art':
   assert page.evaluate('MoonfallUI.snapshot().state')=='error';broken['yes']=False;page.locator('#moonfallLoadRetry').click();ready(page)
   reports.append({'case':'retry-art','ready':True})
  page.context.close();print('PASS blocks '+kind+' failure'+(' and real reload retry' if kind=='art' else ''),flush=True)
 # Missing boot code stays visibly blocked even before the gate can install.
 page,errors=fresh();page.route('**/moonfall-ui.js',lambda r:r.fulfill(status=503,body='unavailable'));go_code=url+'/cursed.html'
 page.goto(go_code,wait_until='domcontentloaded');page.wait_for_function('window.__moonfallCodeFailure',polling=100)
 assert page.locator('#loading').is_visible() and page.locator('#soloBtn').is_disabled() and page.locator('#moonfallLoadRetry').is_visible()
 reports.append({'case':'blocked-code','file':page.evaluate('__moonfallCodeFailure'),'noEntry':True});page.context.close();print('PASS failed code resource is fail-closed with reload action',flush=True)
 page,errors=fresh();page.add_init_script("const context=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type.startsWith('webgl'))return null;return context.call(this,type,...args);}")
 go(page);page.wait_for_function('MoonfallLoading.snapshot().failed',polling=100);assert page.locator('#soloBtn').is_disabled()
 reports.append({'case':'blocked-webgl','snapshot':page.evaluate('MoonfallLoading.snapshot()'),'no2DFallback':True});page.context.close();print('PASS WebGL failure cannot start a 2D fallback',flush=True)
 page,errors=fresh();page.route('**/moonfall-loading.css',lambda r:r.fulfill(status=503,body='unavailable'));go(page)
 page.wait_for_function('MoonfallLoading.snapshot().failed',polling=100);assert page.locator('#soloBtn').is_disabled()
 reports.append({'case':'blocked-stylesheet','noEntry':True,'error':page.evaluate('MoonfallLoading.snapshot().error')});page.context.close();print('PASS missing stylesheet stays blocked',flush=True)
 # Vanilla index stays separate and has no Moonfall gate/modules.
 page,errors=fresh();page.goto(url+'/index.html',wait_until='domcontentloaded');assert page.evaluate('!window.MoonfallLoading&&!window.MoonfallUI&&CURSED===false');page.context.close()
 browser.close()
server.shutdown();server.server_close()
(OUT/'results.json').write_text(json.dumps(reports,indent=2,ensure_ascii=False)+'\n')
print('Screenshots (not committed):',SHOTS,flush=True)
