"""Bake deterministic floor heights from unchanged local Meshy exports.

Requires Playwright/Chromium; performs no Meshy/API requests. --check verifies
that committed collider samples match the current GLBs and authored rotations.
"""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import argparse
import hashlib
import shutil
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check',action='store_true')
args=parser.parse_args()
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox','--enable-unsafe-swiftshader']);page=b.new_page();page.add_init_script("localStorage.setItem('ar_view','2d');window.__noMenu=true;window.requestAnimationFrame=cb=>1")
 page.goto(f'http://127.0.0.1:{server.server_port}/',timeout=120000);page.wait_for_function('CelestialAssets.snapshot().assets.length===13&&CelestialAssets.snapshot().assets.every(a=>a.state==="loaded")',polling=100,timeout=180000)
 data=page.evaluate('''() => {
  const T=THREE,out={version:1,surfaces:{}};
  const normalized=key=>{const a=CelestialAssets.get(key),s=a.gltf.scene.clone(true);s.rotation.y+=a.config.rotationY||0;s.updateMatrixWorld(true);
   const bb=new T.Box3().setFromObject(s,true),sz=bb.getSize(new T.Vector3());
   const matrix=new T.Matrix4().makeScale(1/sz.x,1/sz.y,1/sz.z).multiply(new T.Matrix4().makeTranslation(-(bb.min.x+bb.max.x)/2,-bb.min.y,-(bb.min.z+bb.max.z)/2));
   const root=new T.Group();s.traverse(n=>{if(n.isMesh)root.add(new T.Mesh(n.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(matrix,n.matrixWorld)),new T.MeshBasicMaterial({side:T.DoubleSide})))});root.updateMatrixWorld(true);return root;};
  for(const [key,source,originY] of [['moon-arena','moon-arena',2],['moon-stairs','moon-stairs',2],['temple-gate-floor','temple-gate',.15]]){
   const root=normalized(source),N=33,values=[],ray=new T.Raycaster();ray.ray.direction.set(0,-1,0);ray.far=4;
   for(let j=0;j<N;j++)for(let i=0;i<N;i++){ray.ray.origin.set(i/(N-1)-.5,originY,j/(N-1)-.5);const hit=ray.intersectObject(root,true)[0];values.push(hit?Math.round(hit.point.y*10000):0);}
   out.surfaces[key]={size:N,values};
  }
  return out;
 }''')
 b.close()
server.shutdown()
server.server_close()
for key,grid in data['surfaces'].items():
 source='temple-gate' if key=='temple-gate-floor' else key
 grid['sourceSha256']=hashlib.sha256((ROOT/f'assets/meshy/{source}.glb').read_bytes()).hexdigest()
content=('/* Heights sampled from the original Meshy GLBs. X/Z span [-.5,.5], Y is normalized ×10000.\n'
 ' * Baked before world generation so both peers share identical walkable surfaces. */\n'
 'window.MOONFALL_COLLISION_DATA='+json.dumps(data,separators=(',',':'))+';\n')
target=ROOT/'moonfall-collision-data.js'
if args.check:
 assert target.read_text()==content,'Collision data differs; run baker without --check and inspect changes'
 print('PASS: all three floor grids and source hashes match actual GLBs')
else:
 target.write_text(content)
 print('Baked three 33×33 floor grids to',target)
