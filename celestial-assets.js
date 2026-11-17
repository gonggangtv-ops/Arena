/* Local-only asset gateway. Task IDs identify exports; they are not download URLs.
 * No account credentials or paid API calls belong in the browser. */
window.CelestialAssets = (() => {
  'use strict';
  const entries = new Map(), listeners = new Set();
  let manifest = null, started = null, error = null;
  const emit = () => listeners.forEach(fn => fn());
  const snapshot = () => ({
    error, ready: !!manifest,
    assets: Array.from(entries, ([key, a]) => ({key, name:a.config.name,
      taskId:a.config.taskId, url:a.config.url, state:a.state,
      error:a.error || null, bytes:a.bytes || 0, inspection:a.inspection || null}))
  });
  function inspect(gltf) {
    const bones = [], names = [], textures = new Set();
    let meshes = 0, skinned = 0, triangles = 0;
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(n => {
      if (n.isBone) bones.push(n.name);
      if (!n.isMesh) return;
      names.push(n.name); meshes++; if (n.isSkinnedMesh) skinned++;
      triangles += (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3;
      for (const m of (Array.isArray(n.material) ? n.material : [n.material])) {
        for (const v of Object.values(m)) if (v && v.isTexture) textures.add(v);
      }
    });
    const bounds = new THREE.Box3().setFromObject(gltf.scene, true);
    const size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.length()) || size.length() < .00001) throw Error('Empty or invalid model bounds');
    return {bones, meshes, skinned, triangles:Math.round(triangles), textures:textures.size,
      largestTexture:Math.max(0, ...Array.from(textures, t => Math.max(t.image?.width || 0,t.image?.height || 0))),
      clips:gltf.animations.map(c => c.name), size:size.toArray(), meshNames:names};
  }
  function fitTextures(gltf) {
    // Keep the original GLBs unchanged. Bound decoded GPU textures per device;
    // otherwise 13 exports × four 2K maps exceed 1 GiB including mipmaps.
    const mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)||
      (/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
    const limit=mobile?512:1024, textures=new Set(), images=new Map();
    gltf.scene.traverse(n=>{if(n.isMesh)for(const m of (Array.isArray(n.material)?n.material:[n.material]))
      for(const t of Object.values(m))if(t?.isTexture)textures.add(t);});
    const originals=Array.from(textures,t=>({t,image:t.image}));
    for(const {image} of originals){
      if(!image||images.has(image))continue;
      const scale=Math.min(1,limit/Math.max(image.width,image.height));
      if(scale===1){images.set(image,image);continue;}
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);images.set(image,canvas);
    }
    for(const {t,image} of originals){if(images.get(image)!==image){t.image=images.get(image);t.needsUpdate=true;}t.anisotropy=mobile?1:2;}
    for(const [image,resized] of images)if(image!==resized&&typeof image.close==='function')image.close();
    return {textureLimit:limit,residentTextureMax:Math.max(0,...Array.from(textures,t=>Math.max(t.image?.width||0,t.image?.height||0)))};
  }
  async function load(key, a) {
    if (!a.config.available) { a.state = 'missing'; emit(); return; }
    a.state = 'loading'; emit();
    try {
      if (!window.AR_GLTF) throw Error('Bundled GLTFLoader unavailable');
      const url = new URL(a.config.url, document.baseURI);
      if (url.origin !== location.origin) throw Error('Use a local, same-origin GLB export');
      const response = await fetch(url, {signal:AbortSignal.timeout(30000)});
      if (!response.ok) throw Error('HTTP ' + response.status);
      const buffer = await response.arrayBuffer();
      a.bytes = buffer.byteLength;
      if (a.bytes > 64 * 1024 * 1024) throw Error('Export exceeds 64 MiB. Optimize before import.');
      const header = new DataView(buffer);
      if (a.bytes < 20 || header.getUint32(0,true) !== 0x46546c67 || header.getUint32(4,true) !== 2 || header.getUint32(8,true) !== a.bytes)
        throw Error('Not a valid GLB 2.0 export');
      // Reject external buffers/textures: assets must remain offline-first.
      const jsonLength = header.getUint32(12,true);
      if (20 + jsonLength > a.bytes || header.getUint32(16,true) !== 0x4e4f534a) throw Error('Missing GLB JSON chunk');
      const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength)));
      if ([...(json.buffers || []), ...(json.images || [])].some(v => v.uri && !v.uri.startsWith('data:')))
        throw Error('Export must embed all buffers and textures');
      a.gltf = await new Promise((resolve,reject) => new AR_GLTF.GLTFLoader().parse(buffer,'',resolve,reject));
      a.inspection = inspect(a.gltf);
      // Conservative limits protect both desktop and mobile from unoptimized AI meshes.
      const budget = {'moon-arena':80000,'modular-floor':2500,'modular-wall':5000,'ancient-pillar':12000,'celestial-warrior':45000,
        'moon-dead-tree':8000,'moon-silver-tree':8000,'moon-boulder':6000,'moon-rock-cluster':6000}[key] || 45000;
      if (a.inspection.triangles > budget || a.inspection.textures > 16 || a.inspection.largestTexture > 2048)
        throw Error(`Asset exceeds budget: ${budget} triangles / 16 textures / 2048px. Optimize export.`);
      if (a.inspection.skinned && key !== 'celestial-warrior') throw Error('Scenery must be static for instancing');
      Object.assign(a.inspection,fitTextures(a.gltf));
      a.state = 'loaded';
    } catch (e) {
      if (a.gltf) {
        const textures = new Set(), materials = new Set(), geometries = new Set();
        a.gltf.scene.traverse(n => { if (n.isMesh) {
          geometries.add(n.geometry);
          for (const m of (Array.isArray(n.material) ? n.material : [n.material])) {
            materials.add(m); for (const v of Object.values(m)) if (v?.isTexture) textures.add(v);
          }
        }});
        geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      }
      a.gltf = null; a.state = 'error'; a.error = String(e.message || e);
    }
    emit();
  }
  return {
    start() {
      if (started) return started;
      started = (async () => {
        try {
          const r = await fetch('assets/meshy/manifest.json', {cache:'no-cache',signal:AbortSignal.timeout(10000)});
          if (!r.ok) throw Error('Asset manifest HTTP ' + r.status);
          manifest = await r.json();
          // a page may ask for only some models (Arena Royale loads just the village set)
          const only = window.CELESTIAL_KEYS, skip = window.CELESTIAL_SKIP || [];
          for (const [key, config] of Object.entries(manifest.assets)) if ((!only || only.includes(key)) && !skip.includes(key)) entries.set(key,{config,state:'pending'});
          // Serialize heavyweight GLBs to limit peak decode memory.
          for (const [key,a] of entries) await load(key,a);
        } catch (e) { error = String(e.message || e); emit(); }
        return snapshot();
      })();
      return started;
    },
    get: key => entries.get(key),
    get manifest() { return manifest; }, snapshot,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
})();
