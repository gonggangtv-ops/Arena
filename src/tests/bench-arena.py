"""Compare two deployed Arena directories under identical Chromium workloads.

Run separately for each revision with Python Playwright and Chromium installed.
Pass the deployment directory and a path for the raw measurements.
"""
import argparse
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
from statistics import median
from math import ceil
from threading import Thread

from playwright.sync_api import sync_playwright


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


WORLD = """() => {
  const renderer=R3.renderer, gl=renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info');
  const trees=new Set([...R3.treeAll,...R3.treeParts].flatMap(list=>(list||[]).map(([mesh])=>mesh)));
  let matrixBytes=0, treeMatrixBytes=0, batches=0;
  R3.scene.traverse(mesh=>{
    if(!mesh.userData.base)return;
    const bytes=mesh.userData.base.byteLength;
    matrixBytes+=bytes;
    if(trees.has(mesh))treeMatrixBytes+=bytes;
    batches++;
  });
  return {seed:WD.seed,trees:WD.trees.length,matrixBytes,treeMatrixBytes,batches,
    grassCapacity:R3.gGrass?.instanceMatrix.count||0,models:CelestialAssets.snapshot().assets.length,
    gpu:ext&&gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)};
}"""

FRAMES = """({menu,warmup,count}) => {
  const renderer=R3.renderer, gl=renderer.getContext(), pixel=new Uint8Array(4), samples=[];
  renderer.info.autoReset=false;
  for(let i=0;i<warmup+count;i++){
    renderer.info.reset();
    const start=performance.now();
    if(menu)loop(last+1000/60);else R3.frame(1/60);
    gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    const {calls,triangles}=renderer.info.render;
    if(i>=warmup)samples.push({ms:performance.now()-start,calls,triangles});
  }
  renderer.info.autoReset=true;
  return samples;
}"""

GROUND = """() => {
  // Walk the camera across cell boundaries without drawing. Hash the visible
  // flower transforms AND tints after timing every update.
  const times=[];
  let hash=2166136261, flowers=0, grassWrites=0;
  const visit=i=>R3.updateGround(8000+(i%40)*61,10000+Math.floor(i/40)*73);
  for(let i=0;i<160;i++){
    const start=performance.now();
    visit(i);
    times.push(performance.now()-start);
    const mesh=R3.gFlow;
    flowers+=mesh.count;
    for(const attr of [mesh.instanceMatrix,mesh.instanceColor]){
      if(!attr)continue;
      const values=new Uint32Array(attr.array.buffer,attr.array.byteOffset,mesh.count*attr.itemSize);
      for(const n of values)hash=Math.imul(hash^n,16777619)>>>0;
    }
    if(R3.gGrass?.count)throw Error('short grass visible');
  }
  if(R3.gGrass){
    const set=R3.gGrass.setMatrixAt;
    R3.gGrass.setMatrixAt=function(...args){grassWrites++;return set.apply(this,args)};
    try{for(let i=0;i<160;i++)visit(i)}finally{R3.gGrass.setMatrixAt=set}
  }
  return {times,hash,flowers,grassWrites};
}"""

HOST = """(count) => {
  const times=[];
  for(let i=0;i<count;i++){
    const start=performance.now();
    hostUpdate(1/30);
    times.push(performance.now()-start);
  }
  const fields=[units.map(u=>[u.id,u.x,u.y,u.hp,u.wk,u.lvl,u.dead]),
    items.map(it=>it.id),zone,alive,deathOrder];
  let hash=2166136261;
  for(const n of new TextEncoder().encode(JSON.stringify(fields)))hash=Math.imul(hash^n,16777619)>>>0;
  return {times,hash,units:units.length,items:items.length};
}"""

TERRAIN = """() => {
  if(!R3.cullTerrainRows)return [];
  const renderer=R3.renderer, terrain=R3.terrain, geometry=terrain.geometry;
  const view=R3.cam.clone(), isolated=new THREE.Scene();
  const mesh=new THREE.Mesh(geometry,terrain.material);
  isolated.add(mesh,new THREE.HemisphereLight(0xffffff,0x777777,2));
  const width=256,height=160, target=new THREE.WebGLRenderTarget(width,height);
  const original=new Uint8Array(width*height*4), limited=new Uint8Array(original.length);
  const results=[], full=geometry.index.count, previous=renderer.getRenderTarget();
  const draw=(scene,pixels)=>{
    renderer.render(scene,view);
    renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
  };
  try{
    renderer.setRenderTarget(target);
    view.aspect=width/height;view.updateProjectionMatrix();
    for(const [scene,x,y,h,angle] of [
      [R3.scene,R3.tx,R3.ty,900,0],[isolated,0,0,1200,0.45],
      [isolated,WD.fort.x,WD.fort.y,1200,-1.4],[isolated,WORLD,WORLD,180,3],
      [isolated,CX,CY,8000,1],[isolated,-WORLD,-WORLD,400,2]
    ]){
      const subject=scene===isolated?mesh:terrain;
      view.position.set(x+900*Math.sin(angle),h,y+900*Math.cos(angle));
      view.lookAt(x,0,y);
      const before=terrain.onBeforeRender, saved=subject.onBeforeRender;
      let submitted=0;
      try{
        subject.onBeforeRender=()=>geometry.setDrawRange(0,Infinity);
        draw(scene,original);
        subject.onBeforeRender=function(...args){
          before.apply(this,args);submitted=geometry.drawRange.count;
        };
        draw(scene,limited);
      }finally{subject.onBeforeRender=saved;geometry.setDrawRange(0,Infinity)}
      let different=0;
      for(let i=0;i<original.length;i+=4){
        if(original[i]!==limited[i]||original[i+1]!==limited[i+1]||
           original[i+2]!==limited[i+2]||original[i+3]!==limited[i+3])different++;
      }
      results.push({different,submitted,full});
    }
  }finally{renderer.setRenderTarget(previous);target.dispose()}
  return results;
}"""

SCENE = """() => {
  const first=R3.trees.find(t=>R3.treeParts[t._i]?.length && R3.treeAll[t._i]?.length);
  R3.updateTrees(first);
  const parts=R3.treeParts[first._i];
  const hidden=parts.every(([m,i])=>m.instanceMatrix.array[i*16+15]===0);
  R3.updateTrees({x:-100000,y:-100000});
  const restored=parts.every(([m,i])=>m.instanceMatrix.array.slice(i*16,i*16+16)
    .every((n,j)=>n===m.userData.base[i*16+j]));
  R3.treeFell({...first,ox:first.x,oy:first.y},0);
  const fallen=R3.treeAll[first._i].every(([m,i])=>m.userData.base[i*16+15]===0);
  R3.post=true;
  R3.setupPost();
  const passes=R3.composer.passes.slice(), disposedPasses=new Set();
  for(const p of passes){
    const dispose=p.dispose;
    if(dispose)p.dispose=function(){disposedPasses.add(this);return dispose.call(this)};
  }
  R3.post=false;
  R3.setupPost();
  const live=new Set();
  let count=0, duplicates=0;
  R3.scene.traverse(mesh=>{
    if(!mesh.isInstancedMesh)return;
    count++;
    live.add(mesh);
    mesh.addEventListener('dispose',()=>{if(!live.delete(mesh))duplicates++});
  });
  R3.disposeScene();
  return {hidden,restored,fallen,passes:passes.length,disposedPasses:disposedPasses.size,
    count,disposed:count-live.size,duplicates,missing:[...live].slice(0,8).map(m=>m.name||m.geometry.type)};
}"""


def boot(browser, url):
    page = browser.new_page(viewport={'width': 800, 'height': 450}, device_scale_factor=1,
                            reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_default_timeout(240000)
    page.add_init_script("""requestAnimationFrame=()=>0;
        localStorage.setItem('ar_q','low');localStorage.setItem('ar_mute','1');
        localStorage.setItem('ar_snd','2');""")

    def seed_world(route):
        response = route.fetch()
        original = 'R3.menuSeed=Math.floor(Math.random()*1e9);setupWorld'
        source = response.text()
        assert source.count(original) == 1
        route.fulfill(response=response, body=source.replace(original, 'R3.menuSeed=777;setupWorld'))

    page.route('**/moonfall-loading.js', seed_world)
    page.goto(url, wait_until='domcontentloaded')
    page.wait_for_function('window.MoonfallLoading?.isReady()||window.MoonfallLoading?.snapshot().failed',
                           polling=100)
    assert page.evaluate('MoonfallLoading.isReady()'), page.evaluate('MoonfallLoading.snapshot()')
    return page, errors


def measure(browser, url):
    page, errors = boot(browser, url)
    data = {'browser': browser.version, 'world': page.evaluate(WORLD)}
    data['menu'] = page.evaluate(FRAMES, {'menu': True, 'warmup': 4, 'count': 20})
    data['uncoveredCalls'] = page.evaluate("""() => {
      const menu=document.getElementById('menu');menu.classList.add('hidden');
      R3.renderer.info.reset();R3.menuFrame(1/60);
      menu.classList.remove('hidden');return R3.renderer.info.render.calls;
    }""")
    assert data['uncoveredCalls'] > 0
    page.evaluate('Math.random=mulberry32(940)')
    page.locator('#soloBtn').click()
    page.wait_for_function("state==='play'&&document.getElementById('loading').classList.contains('hidden')",
                           polling=100)
    data['camera'] = page.evaluate("""() => {
      __game.skipDrop();
      const hero=ME(), v=WD.villages.find(v=>v.main);
      hero.x=hero.tx=R3.tx=v.x;hero.y=hero.ty=R3.ty=v.y;
      R3.t=1;
      return {seed:WD.seed,x:v.x,y:v.y};
    }""")
    data['play'] = page.evaluate(FRAMES, {'menu': False, 'warmup': 4, 'count': 10})
    data['ground'] = page.evaluate(GROUND)
    data['terrain'] = page.evaluate(TERRAIN)
    assert all(row['different'] == 0 for row in data['terrain']), data['terrain']
    data['scene'] = page.evaluate(SCENE)
    assert all(data['scene'][k] for k in ('hidden', 'restored', 'fallen'))
    if data['terrain']:  # The reference intentionally exhibits the old resource counts.
        assert any(0 < row['submitted'] < row['full'] for row in data['terrain'])
        assert data['scene']['count'] == data['scene']['disposed'] and data['scene']['duplicates'] == 0
        assert data['world']['matrixBytes'] == data['world']['treeMatrixBytes'] > 0
        assert data['ground']['grassWrites'] == 0 and all(f['calls'] == 0 for f in data['menu'])
    page.evaluate("""() => {state='play';simMode=true;Math.random=mulberry32(436);
        hostNewGame([],777,{n:32,size:'L'});frameN=0;for(let i=0;i<120;i++)hostUpdate(1/30)}""")
    # Separate the uninstrumented timings from the V8 sampling profiler.
    data['host'] = page.evaluate(HOST, 1800)
    cdp = page.context.new_cdp_session(page)
    cdp.send('Profiler.enable')
    cdp.send('Profiler.setSamplingInterval', {'interval': 500})
    cdp.send('Profiler.start')
    page.evaluate('()=>{for(let i=0;i<600;i++)hostUpdate(1/30)}')
    nodes = cdp.send('Profiler.stop')['profile']['nodes']
    data['cpuTop'] = [(n['callFrame']['functionName'], n.get('hitCount', 0))
                      for n in sorted(nodes, key=lambda n: -n.get('hitCount', 0))[:20]]
    data['errors'] = errors
    page.close()
    return data


def compare_hosts(browser, reference_url, current_url):
    visits = [boot(browser, reference_url), boot(browser, current_url)]
    pairs = []
    for run, seed in enumerate([436, 437, 438, 439]):
        pair = {'seed': seed}
        for index in ([0, 1] if run % 2 == 0 else [1, 0]):
            page, errors = visits[index]
            page.evaluate("""seed=>{
              state='play';simMode=true;Math.random=mulberry32(seed);
              hostNewGame([],777,{n:32,size:'L'});frameN=0;
              for(let i=0;i<120;i++)hostUpdate(1/30);
            }""", seed)
            result = page.evaluate(HOST, 1200)
            times = sorted(result.pop('times'))
            result.update(median=median(times), p95=times[ceil(.95*len(times))-1],
                          total=sum(times), ticks=len(times))
            pair[['reference', 'optimized'][index]] = result
            assert not errors, errors
        assert pair['reference']['hash'] == pair['optimized']['hash'], pair
        pairs.append(pair)
    for page, _ in visits:
        page.close()
    return pairs


@contextmanager
def serve(site):
    with ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(site))) as server:
        Thread(target=server.serve_forever, daemon=True).start()
        try:
            yield f'http://127.0.0.1:{server.server_port}/index.html'
        finally:
            server.shutdown()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('site', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--compare-host', metavar='REFERENCE_SITE', type=Path,
                        help='measure four paired host workloads, alternating revision order')
    args = parser.parse_args()
    with serve(args.site) as url, sync_playwright() as p:
        browser = p.chromium.launch(executable_path=shutil.which('chromium'),
                                    args=['--no-sandbox', '--enable-unsafe-swiftshader'])
        if args.compare_host:
            with serve(args.compare_host) as reference_url:
                result = compare_hosts(browser, reference_url, url)
        else:
            result = measure(browser, url)
            assert not result['errors'], result['errors']
        args.output.write_text(json.dumps(result))
        browser.close()


if __name__ == '__main__':
    main()
