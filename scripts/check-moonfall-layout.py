"""Check deterministic layout, collision and navigation for three seeds in both entries."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
class H(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(Path(__file__).resolve().parents[1])));Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for entry in ['index.html','cursed.html']:
  page=b.new_page();page.add_init_script("localStorage.setItem('ar_view','2d');window.__noMenu=true;window.requestAnimationFrame=cb=>1")
  page.goto('http://127.0.0.1:'+str(s.server_port)+'/'+entry)
  for seed in [20261116,42,1900]:
   r=page.evaluate('''seed=>{const a=genWorld(seed),b=genWorld(seed);WD=b;buildCollide(WD);buildNav();
    const m=WD.moonfall,c=WD.castle,s=m.ramps[0],portal=m.props.find(p=>p.asset==='portal-frame');
    return {same:JSON.stringify(a.moonfall)===JSON.stringify(b.moonfall),props:[...new Set(m.props.map(p=>p.asset))],stairs:!!s,
    portal:!!portal,portalWalk:portal?!blockedAt(portal,26):false,portalNav:portal?!navBlocked(portal.x,portal.y):false};}''',seed)
   assert r['same'] and r['stairs'] and r['portal'] and r['portalWalk'] and r['portalNav'], (entry,seed,r)
   assert len(r['props'])==9, (entry,seed,r)
   print('PASS',entry,seed,r,flush=True)
  page.close()
 b.close()
s.shutdown()
