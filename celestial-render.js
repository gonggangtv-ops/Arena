/* Moonfall Phase 1. Render adapters only; seeded world, combat, AI and transport
 * remain owned by the original game. No gameplay obstacle is added here. */
window.installCelestialRender = function (P) {
  'use strict';
  if (P.celestialInstalled) return;
  P.celestialInstalled = true;
  const T = THREE, A = CelestialAssets;
  const base = {init:P.init, draw:P.draw, world:P.buildWorld, post:P.setupPost,
    quality:P.setQuality, dispose:P.disposeScene, obj:P.objFor, menu:P.menuFrame,
    qnSetup:P.qnSetup};
  const fog = new T.Color(), stone = '#626e88', gold = '#b8a171', blue = '#8dc7ee';
  let revision = 0;
  const prepared = new Map();
  const metrics = {fps:0, renderMs:0, calls:0, triangles:0, geometries:0, textures:0, heapMiB:null};
  let frames = 0, sampleStart = performance.now(), renderTotal = 0;
  let showPerf = new URLSearchParams(location.search).has('perf');

  function textureValues(m) {
    return [...Object.values(m).filter(v=>v?.isTexture),
      ...Object.values(m.uniforms || {}).map(u=>u.value).filter(v=>v?.isTexture),
      ...(m.userData.celestialTextures || [])];
  }
  const fow=P.fow;
  P.fow=function(m,options){
    const result=fow.call(this,m,options);
    // onBeforeCompile captures these uniforms in a closure rather than exposing
    // Material.uniforms. Keep ownership metadata for depth/splat texture cleanup.
    const textures=Object.values(options?.uniforms || {}).map(u=>u.value).filter(v=>v?.isTexture);
    if(textures.length)result.userData.celestialTextures=textures;
    return result;
  };
  function releaseVisuals(renderer, roots) {
    // Cache entries and GLB prototypes outlive a scene. Water normals/depth and
    // terrain splat textures do not: Material.dispose() alone never frees them.
    const cachedMats=new Set(renderer.mats.values()), keep=new Set(renderer.texC.values());
    for(const t of renderer.emojiTex.values())keep.add(t);
    keep.add(renderer.envTex);keep.add(renderer.U?.detail.value);
    for(const m of cachedMats)for(const t of textureValues(m))keep.add(t);
    for(const a of A.snapshot().assets){const source=A.get(a.key)?.gltf?.scene;
      source?.traverse(n=>{if(n.material)for(const m of (Array.isArray(n.material)?n.material:[n.material]))for(const t of textureValues(m))keep.add(t);});
    }
    const mats=new Set(),textures=new Set(),geos=new Set(),skeletons=new Set();
    for(const root of roots)root.traverse(n=>{
      if(n.geometry&&!renderer.cachedGeos.has(n.geometry))geos.add(n.geometry);
      if(n.material)for(const m of (Array.isArray(n.material)?n.material:[n.material])){
        if(!cachedMats.has(m))mats.add(m);
        for(const t of textureValues(m))if(!keep.has(t))textures.add(t);
      }
      if(n.skeleton)skeletons.add(n.skeleton);
      if(n.isInstancedMesh)n.dispose();
      if(n.isLight&&n.shadow)n.shadow.dispose();
    });
    geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
    skeletons.forEach(s=>s.dispose());
  }

  // Own all pass resources across low/high/AO switches. EffectComposer.dispose
  // only frees its internal targets, not the custom passes it contains.
  P.setupPost = function () {
    if (this.composer) for (const pass of this.composer.passes) if (pass.dispose) pass.dispose();
    this.ao = null;
    base.post.call(this);
    if (this.bloom) { this.bloom.enabled = true; this.bloom.threshold = 1.05; this.bloom.strength = .28; this.bloom.radius = .38; }
    if (this.ao) { this.ao.ao.uniforms.uK.value = 1.25; this.ao.ao.uniforms.uR.value = 38; }
  };
  P.setQuality = function () {
    const actors=Array.from(this.objs.values());
    base.quality.call(this);
    // The original quality setter detaches actors before scene disposal. Release
    // their per-instance buffers as well, retaining shared cached geometry.
    for(const o of actors)if(!o.root.parent){
      if(o.mixer){o.mixer.stopAllAction();o.mixer.uncacheRoot(o.model);}
      releaseVisuals(this,[o.root]);
    }
    const cap = this.hi ? 1.5 : 1;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, cap));
    if (this.composer) { this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(W,H); }
  };
  P.init = function () {
    const ok = base.init.call(this);
    if (ok) { this.renderer.toneMappingExposure = 1.1; this.renderer.info.autoReset = false; }
    return ok;
  };
  P.disposeScene = function () {
    if (this.scene) {
      for (const o of this.objs.values()) if (o.mixer) { o.mixer.stopAllAction(); o.mixer.uncacheRoot(o.model); }
      releaseVisuals(this,[this.scene]);
    }
  };
  const material = (renderer, name, color, metal, rough, emissive) => renderer.cached('moon-'+name, () => {
    const m = new T.MeshStandardMaterial({color, metalness:metal, roughness:rough,
      envMap:renderer.envTex, envMapIntensity:.5, emissive:emissive || '#000000', emissiveIntensity:emissive ? 1.8 : 0});
    return renderer.fow(m,{key:'moon-'+name, uniforms:{uZoneN:renderer.U.zoneN},frag:fs=>zlines(fs)});
  });

  // Convert each static primitive to a shared unit bounding box. This bakes the
  // authored hierarchy and pivot once; instances then fit existing collider data.
  P.celestialAsset = function (key) {
    const a = A.get(key);
    if (!a || a.state !== 'loaded') return null;
    if (prepared.has(key)) return prepared.get(key);
    const root = a.gltf.scene.clone(true);
    root.rotation.y += a.config.rotationY || 0; root.updateMatrixWorld(true);
    const bb = new T.Box3().setFromObject(root,true), size = bb.getSize(new T.Vector3());
    const norm = new T.Matrix4().makeScale(1 / Math.max(size.x,.00001),1 / Math.max(size.y,.00001),1 / Math.max(size.z,.00001));
    norm.multiply(new T.Matrix4().makeTranslation(-(bb.min.x+bb.max.x)/2,-bb.min.y,-(bb.min.z+bb.max.z)/2));
    const parts = [];
    root.traverse(n => {
      if (!n.isMesh) return;
      const geo = n.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(norm,n.matrixWorld));
      this.cachedGeos.add(geo);
      const paint = src => this.cached('moon-asset-'+src.uuid, () => {
        const m = src.clone(); if (m.isMeshStandardMaterial) m.envMapIntensity = .5;
        for (const v of Object.values(m)) if (v?.isTexture) v.anisotropy = 2;
        return this.fow(m,{key:'moon-asset',uniforms:{uZoneN:this.U.zoneN},frag:fs=>zlines(fs)});
      });
      parts.push({geo, mat:Array.isArray(n.material) ? n.material.map(paint) : paint(n.material)});
    });
    prepared.set(key,parts); return parts;
  };
  P.celestialBatch = function (parent, key, placements, fallbackGeo, fallbackMat) {
    if (!placements.length) return;
    const parts = this.celestialAsset(key) || [{geo:fallbackGeo,mat:fallbackMat}];
    for (const part of parts) {
      const mesh = new T.InstancedMesh(part.geo,part.mat,placements.length);
      mesh.name = 'moonfall-'+key;
      mesh.castShadow = key !== 'modular-floor' && !!this.hi; mesh.receiveShadow = true;
      placements.forEach((p,i) => this.setI(mesh,i,...p));
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); parent.add(mesh);
    }
  };
  P.buildCastle = function () {
    const C = WD.castle;
    this.flags = []; this.castleParts = [];
    if (!C || C.x < -1e4) return;
    const group = new T.Group(); group.name = 'Moonfall Arena'; this.scene.add(group); this.moonfall = group;
    const basalt = material(this,'basalt',stone,.3,.64);
    const trim = material(this,'gold',gold,.74,.32);
    const dark = material(this,'obsidian','#192338',.48,.3);
    const rune = material(this,'rune','#a8cde7',.3,.35,'#76b8e9');
    const slate=this.tex('moon-slate'),normal=this.hi?this.texN('moon-slate'):null;
    for(const m of [basalt, dark]){
      if(m.map!==slate || m.normalMap!==normal){m.map=slate;m.normalMap=normal;m.normalScale.set(.45,.45);m.needsUpdate=true;}
    }
    // Bottom-pivoted primitives, matching the normalized GLB convention.
    const boxKey = 'moon-bottom-box';
    let box = this.geoC.get(boxKey);
    if (!box) { box = new T.BoxGeometry(1,1,1).translate(0,.5,0); this.geoC.set(boxKey,box); this.cachedGeos.add(box); }
    const walls = WD.walls.filter(q => q.castle);
    const wp = walls.map(q => [q.x+q.w/2,0,q.y+q.h/2,q.w,q.castle===2?220:q.castle===3?170:150,q.h,0,0,0]);
    this.celestialBatch(group,'modular-wall',wp,box,basalt);
    // Cornice and footing use only three instanced material batches.
    this.celestialBatch(group,'cornice',wp.map(p => [p[0],p[4]-9,p[2],p[3]+3,9,p[5]+3,0,0,0]),box,trim);
    this.celestialBatch(group,'footing',wp.map(p => [p[0],0,p[2],p[3]+4,12,p[5]+4,0,0,0]),box,dark);
    const floors = [], nx = 16, nz = 13, dx = (C.w-80)/nx, dz = (C.h-80)/nz;
    for (let z=0;z<nz;z++) for (let x=0;x<nx;x++) {
      const px = C.x+40+(x+.5)*dx, pz = C.y+40+(z+.5)*dz;
      floors.push([px,this.gY(px,pz)-2,pz,dx-1.2,3,dz-1.2,0,0,0]);
    }
    const floor=material(this,'floor','#72809b',.36,.44);
    if(floor.map!==slate || floor.normalMap!==normal){floor.map=slate;floor.normalMap=normal;floor.normalScale.set(.35,.35);floor.needsUpdate=true;}
    this.celestialBatch(group,'modular-floor',floors,box,floor);
    const towers = [...C.towers,...C.gtowers];
    const cylinderKey = 'moon-bottom-cylinder';
    let cyl = this.geoC.get(cylinderKey);
    if (!cyl) { cyl = new T.CylinderGeometry(.42,.5,1,16).translate(0,.5,0); this.geoC.set(cylinderKey,cyl); this.cachedGeos.add(cyl); }
    this.celestialBatch(group,'ancient-pillar',towers.map(t => [t.x,0,t.y,t.r*2,t.h,t.r*2,0,0,0]),cyl,basalt);
    this.celestialBatch(group,'pillar-cap',towers.map(t => [t.x,t.h-12,t.y,t.r*1.9,16,t.r*1.9,0,0,0]),cyl,trim);
    this.celestialBatch(group,'pillar-base',towers.map(t => [t.x,0,t.y,t.r*2,20,t.r*2,0,0,0]),cyl,dark);
    const bands=[],flutes=[];
    for(const t of towers){
      for(const h of [.12,.74,.88])bands.push([t.x,t.h*h,t.y,t.r*1.8,6,t.r*1.8,0,0,0]);
      if(!this.celestialAsset('ancient-pillar'))for(let i=0;i<12;i++){
        const a=i/12*Math.PI*2;
        flutes.push([t.x+Math.cos(a)*t.r*.8,32,t.y+Math.sin(a)*t.r*.8,3,t.h-64,3,0,0,0]);
      }
    }
    this.celestialBatch(group,'pillar-bands',bands,cyl,trim);
    this.celestialBatch(group,'pillar-flutes',flutes,box,dark);
    this.celestialBatch(group,'pillar-gem',towers.map(t => [t.x,t.h+18,t.y,t.r*.45,55,t.r*.45,0,0,0]),this.G.oct,rune);
    // The Moon Arena export is a temple crown on the existing solid keep. An
    // arbitrary generated arena must not introduce invisible gameplay walls.
    const K = C.keep;
    if (this.celestialAsset('moon-arena')) {
      this.celestialBatch(group,'moon-arena',[[K.x+K.w/2,220,K.y+K.h/2,K.w,210,K.h,0,0,0]],box,basalt);
    } else {
      this.celestialBatch(group,'temple-roof',[[K.x+K.w/2,220,K.y+K.h/2,K.w+8,18,K.h+8,0,0,0]],box,trim);
      for (let i=0;i<3;i++) this.mesh(this.G.oct,dark,K.x+K.w/2,280+i*48,K.y+K.h/2,80-i*17,72,80-i*17,group,true);
    }
    // Reuse all registered dungeon pillar colliders as ancient temple columns.
    const columns = WD.solids.filter(s => s.t==='pillar');
    this.celestialBatch(group,'dungeon-column',columns.map(s => [s.x,this.gY(s.x,s.y),s.y,s.r*2,145,s.r*2,0,0,0]),cyl,basalt);
    const center = C.loc ? C.loc(0,C.DP*.25) : C.lair;
    this.moonfallFocus = {x:center.x,y:center.y};
    for (const r of [80,130,165]) {
      const ring = this.mesh(this.G.ringThin,rune,center.x,2.2,center.y,r,1,r,group);
      ring.name = 'moonfall-inlaid-sigil'; ring.castShadow = false;
    }
    const marks = Array.from({length:24},(_,i) => {
      const a=i/24*Math.PI*2;
      return [center.x+Math.cos(a)*148,2,center.y+Math.sin(a)*148,3,1,12,0,-a,0];
    });
    this.celestialBatch(group,'inlaid-runes',marks,box,rune);
    towers.forEach(t => this.glows.push([t.x,t.h+35,t.y,blue,150]));
    this.moonfallCounts = {floors:floors.length,walls:wp.length,pillars:towers.length,columns:columns.length};
  };

  // Repaint the existing terrain textures instead of introducing a second map.
  const genTex = P.genTex;
  P.genTex = function (key) {
    if(key==='moon-slate'){
      const c=this.cvs(256),f=this.fbm(817,8,4),g=this.fbm(821,3,3);
      this.pix(c,(u,v)=>{
        const n=f(u,v),vein=Math.pow(Math.max(0,1-Math.abs(Math.sin((u*3+v*5+g(u,v)*1.3)*Math.PI))*16),2);
        const edge=Math.min(u,v,1-u,1-v)<.012?.55:1;
        const l=(105+n*65+vein*36)*edge;
        return[l*.92,l*.96,l*1.04];
      });
      return {c,norm:1.4};
    }
    const out = genTex.call(this,key);
    if (['grass','dirt','sand','cobble','plaster','tiles'].includes(key)) {
      const canvas = out.c || out, ctx = canvas.getContext('2d'), img = ctx.getImageData(0,0,canvas.width,canvas.height);
      const palette = key==='grass' ? [.38,.47,.62] : key==='plaster' ? [.49,.53,.66] : [.47,.52,.65];
      for (let i=0;i<img.data.length;i+=4) {
        const l=img.data[i]*.3+img.data[i+1]*.59+img.data[i+2]*.11;
        for (let j=0;j<3;j++) img.data[i+j]=l*palette[j]+(key==='grass'?5:12);
      }
      ctx.putImageData(img,0,0);
    }
    return out;
  };
  const vegetation = P.buildVegetation;
  P.buildVegetation = function () {
    vegetation.call(this);
    for (const m of this.treeMats || []) m.color.set('#637d9b');
  };
  P.buildWorld = function () {
    base.world.call(this); this.celestialRevision = revision;
    this.buildCelestialSky();
  };
  P.buildCelestialSky = function () {
    const sky = new T.Group(); sky.name='moonfall-sky'; this.scene.add(sky); this.celestialSky=sky;
    const R=mulberry32(48017), stars=[];
    for (let i=0;i<(this.hi?360:120);i++) {
      const a=R()*Math.PI*2,h=R()*.8+.15,r=Math.sqrt(1-h*h);
      stars.push(Math.cos(a)*r*7000,h*7000,Math.sin(a)*r*7000);
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position',new T.Float32BufferAttribute(stars,3));
    const m = new T.PointsMaterial({color:'#b9d4ff',size:this.hi?5:6,transparent:true,opacity:.75,depthWrite:false,fog:false});
    const points=new T.Points(geo,m);points.userData.ownMat=1;sky.add(points);
    const moon = this.mesh(this.G.sph,material(this,'moon','#c2cedb',.05,.9,'#293e5d'),-2000,2100,-3900,420,420,420,sky);
    moon.material.fog=false;
    const haloMat = this.cached('moon-halo',()=>new T.MeshBasicMaterial({color:'#90b1ec',transparent:true,opacity:.23,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,fog:false}));
    const halo = this.mesh(this.G.torus,haloMat,-2000,2100,-3900,530,530,530,sky);halo.rotation.set(.28,.3,.5);
    this.celestialMoon=moon;
  };

  // Celestial Warrior is deliberately admitted only when its OWN clips and hand
  // sockets exist. Retargeting unrelated shipped clips would deform arbitrary rigs.
  P.inspectCelestialWarrior = function () {
    const a=A.get('celestial-warrior');
    if (!a || a.state!=='loaded') return {ready:false,reason:'รอ celestial-warrior.glb · ใช้ตัวละครและแอนิเมชันเดิม'};
    const cfg=A.manifest.warrior || {}, report=a.inspection, bones=cfg.bones || {}, clips=cfg.clips || {};
    const pick=(name,pattern,list)=>name ? list.find(n=>n===name) : list.find(n=>pattern.test(n));
    const right=pick(bones.rightHand,/^(mixamorig[:_]?)?(RightHand|hand_r|hand\.r)$/i,report.bones);
    const left=pick(bones.leftHand,/^(mixamorig[:_]?)?(LeftHand|hand_l|hand\.l)$/i,report.bones);
    const patterns={idle:/idle/i,walk:/walk|run|jog/i,attack:/attack|slash|punch/i,cast:/cast|spell/i,hit:/hit|hurt|damage/i,death:/death|die/i};
    const mapped={}; for (const [key,pattern] of Object.entries(patterns)) mapped[key]=pick(clips[key],pattern,report.clips);
    const missing=Object.keys(mapped).filter(k=>!mapped[k]);
    if (!report.skinned || !report.bones.length) return {ready:false,reason:'ไฟล์ไม่มี skinned rig · ต้อง rig ก่อนใช้งาน',report};
    if (!right || !left || missing.length) return {ready:false,reason:'ต้องกำหนด hand sockets / clips: '+missing.join(', '),report};
    if(new Set(Object.values(mapped)).size!==6)return {ready:false,reason:'ต้องกำหนด animation clip แยกสำหรับแต่ละสถานะ',report};
    return {ready:true,right,left,clips:mapped,height:cfg.height || 132};
  };
  P.celestialHero = function (u) {
    const admission=this.inspectCelestialWarrior();
    if (!admission.ready) return null;
    const a=A.get('celestial-warrior'), root=new T.Group(), body=new T.Group();root.add(body);
    const model=AR_GLTF.SkeletonUtils.clone(a.gltf.scene), pivot=new T.Group();
    model.rotation.y += a.config.rotationY || 0; model.updateMatrixWorld(true);
    const bb=new T.Box3().setFromObject(model,true), size=bb.getSize(new T.Vector3()), scale=admission.height/size.y;
    pivot.scale.setScalar(scale);body.add(pivot);pivot.add(model);
    pivot.position.set(-(bb.min.x+bb.max.x)*scale/2,-bb.min.y*scale,-(bb.min.z+bb.max.z)*scale/2);
    const bones={};
    model.traverse(n=>{if(n.isBone)bones[n.name]=n;if(n.isMesh){
      this.cachedGeos.add(n.geometry);n.castShadow=!!this.hi;n.receiveShadow=true;n.frustumCulled=false;
      const paint=src=>this.cached('moon-warrior-'+src.uuid,()=>this.fow(src.clone(),{key:'moon-warrior'}));
      n.material=Array.isArray(n.material)?n.material.map(paint):paint(n.material);
    }});
    const o={kind:'celestial',celestial:true,u,root,body,model,bones,scale,mixer:new T.AnimationMixer(model),act:{},
      wk:'?',wt:-9,at:u.at,lx:u.x,ly:u.y,rot:Math.atan2(u.fx,u.fy),walk:0,mvK:0,lastAtk:0,lastCast:0,lastHurt:0};
    for(const [key,name] of Object.entries(admission.clips)) o.act[key]=o.mixer.clipAction(a.gltf.animations.find(c=>c.name===name));
    o.act.idle.play();o.act.walk.play().setEffectiveWeight(0);
    o.handR=new T.Group();o.handL=new T.Group();
    o.handR.scale.setScalar(1/scale);o.handL.scale.setScalar(1/scale);
    bones[admission.right].add(o.handR);bones[admission.left].add(o.handL);
    o.root.userData.celestialCharacter=true;
    this.celestialWeapon(o,u);this.addStatus(o,u);this.scene.add(root);this.objs.set(u.id,o);return o;
  };
  P.celestialWeapon = function (o,u) {
    o.handR.clear();o.handL.clear();o.wpnR=o.wpnL=null;
    if (u.wk) {
      o.wpnR=this.weapon(u.wk,u.wt);o.wpnR.rotation.x=Math.PI/2;o.handR.add(o.wpnR);
    }
    o.wk=u.wk;o.wt=u.wt;o.at=u.at;
  };
  P.objFor = function (u) {
    const had=this.objs.get(u.id);if(had)return had;
    return (u.hero && this.celestialHero(u)) || base.obj.call(this,u);
  };
  P.celestialAnim = function (o,u,time,dt,mv) {
    if (o.dying) {o.dying=false;o.act.death.stop();o.act.idle.play();o.act.walk.play();}
    if (o.wk!==u.wk || o.wt!==u.wt) this.celestialWeapon(o,u);
    o.act.idle.setEffectiveWeight(1-o.mvK);o.act.walk.setEffectiveWeight(o.mvK);o.act.walk.timeScale=clamp(mv/250,.7,1.5);
    let next=null;
    if (u.atkAnim>o.lastAtk+.05) next='attack';
    else if(u.castAnim>o.lastCast+.05) next='cast';
    else if(u.hurtT>o.lastHurt+.02) next='hit';
    if(next){if(o.overlay)o.overlay.stop();const act=o.act[next];act.reset().setLoop(T.LoopOnce,1);act.clampWhenFinished=true;act.play();o.overlay=act;o.overlayT=act.getClip().duration;}
    if(o.overlay){o.overlayT-=dt;const w=Math.min(1,Math.max(0,o.overlayT)/.12);o.overlay.setEffectiveWeight(w);o.act.idle.setEffectiveWeight((1-o.mvK)*(1-w));o.act.walk.setEffectiveWeight(o.mvK*(1-w));if(o.overlayT<=0){o.overlay.stop();o.overlay=null;}}
    o.lastAtk=u.atkAnim||0;o.lastCast=u.castAnim||0;o.lastHurt=u.hurtT||0;o.mixer.update(dt);
    o.body.rotation.y=u.spinT>0||u.lotusT>0?time*22:0;
    o.body.rotation.x=u.dash?.28:u.kb?-.2:0;
    if(u.leap){o.leapT=(o.leapT||0)+dt;o.body.position.y=Math.sin(Math.PI*Math.min(1,o.leapT/.55))*140;}else{o.leapT=0;o.body.position.y=0;}
  };
  P.celestialDie = function (o,dt) {
    if(!o.dying){o.dying=true;o.dieT=2.3;o.overlay=null;o.mixer.stopAllAction();const a=o.act.death;a.reset().setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.play();}
    o.dieT-=dt;o.mixer.update(dt);o.root.visible=o.dieT>0;
  };
  // The old pack may finish asynchronously after the Meshy hero was admitted.
  // Keep that visual object in place instead of discarding it for a fallback.
  P.qnSetup = function (got) {
    const heroes=Array.from(this.objs.entries()).filter(([,o])=>o.celestial);
    heroes.forEach(([id])=>this.objs.delete(id));
    base.qnSetup.call(this,got);
    heroes.forEach(([id,o])=>this.objs.set(id,o));
  };

  P.menuFrame = function (dt) {
    // Retain original menu world setup and resource streaming.
    this.celestialMenuDt=dt;
    return base.menu.call(this,dt);
  };
  P.draw = function () {
    if (this.scene) {
      const inMenu=state!=='play';
      if(inMenu && this.moonfallFocus){const p=this.moonfallFocus,a=this.t*.055;
        this.cam.position.set(p.x+Math.sin(a)*370,660,p.y+600);this.cam.lookAt(p.x,35,p.y);
        this.sun.position.set(p.x-500,1300,p.y+200);this.sun.target.position.set(p.x,0,p.y);}
      const L=state==='play'?(listener()||ME()):null;
      const cave=L&&(inDG(L)||WD.caves.some(c=>dist(L,c)<c.R+6));
      const day=state==='play'?this.dayK():.6;
      fog.set(cave?'#090e1b':'#101b32');
      if(!cave)fog.lerp(this.c1.set('#23314b'),day*.5);
      this.scene.fog.color.copy(fog);this.scene.background.copy(fog);this.scene.fog.density=cave?.00022:.00015;
      this.sun.color.set('#acc6f4');this.sun.intensity=cave?.3:(moody?1.45:2.05);
      this.hemi.color.set('#99b4df');this.hemi.groundColor.set('#202033');this.hemi.intensity=cave?.65:(moody?.9:1.2);
      if(this.bloom)this.bloom.strength=.28;
      if(this.celestialSky){this.celestialSky.position.set(this.cam.position.x,0,this.cam.position.z);this.celestialSky.visible=!cave;}
      // Asset arrivals trigger one safe scene rebuild on the next frame. World
      // data and network state are never regenerated by asset loading.
      if(this.celestialRevision!==revision)this.world=null;
    }
    const start=performance.now();this.renderer.info.reset();
    const result=base.draw.call(this);
    renderTotal+=performance.now()-start;frames++;
    const now=performance.now(),elapsed=now-sampleStart;
    if(elapsed>=1000){const info=this.renderer.info;
      Object.assign(metrics,{fps:Math.round(frames*1000/elapsed),renderMs:+(renderTotal/frames).toFixed(1),
        calls:info.render.calls,triangles:info.render.triangles,geometries:info.memory.geometries,textures:info.memory.textures,
        heapMiB:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null});
      frames=0;renderTotal=0;sampleStart=now;updateMetrics();
    }
    return result;
  };
  P.celestialMetrics = () => ({...metrics});
  function updateMetrics() {
    const text = `${metrics.fps} FPS · CPU submit ${metrics.renderMs} ms\n${metrics.calls} draws · ${metrics.triangles.toLocaleString()} triangles\n${metrics.geometries} geometries · ${metrics.textures} textures\nJS heap ${metrics.heapMiB===null?'unavailable':metrics.heapMiB+' MiB'} · GPU memory unavailable`;
    const small=document.getElementById('celestialPerf'),full=document.getElementById('celestialMetrics');
    if(small){small.textContent=text;small.classList.toggle('hidden',!showPerf || state!=='play');}
    if(full)full.textContent=text+'\n'+(P.hi?'High · bloom + shadows':'Low · direct rendering')+' · DPR '+(P.renderer?.getPixelRatio() || 1);
  }
  function updateStatus() {
    const data=A.snapshot(),loaded=data.assets.filter(a=>a.state==='loaded').length;
    const note=document.getElementById('celestialAssetNote');
    if(note)note.textContent=data.error?'Manifest: '+data.error:`MOONFALL / ${loaded}/${data.assets.length} GLB พร้อมใช้ · ${loaded<data.assets.length?'ใช้ฉากและตัวละครสำรองระหว่างรอไฟล์':'ตรวจ rig ก่อนสลับตัวละคร'}`;
    const list=document.getElementById('celestialAssetList');
    if(list){list.replaceChildren();for(const a of data.assets){const li=document.createElement('li');li.textContent=`${a.name} — ${a.state}${a.error?' · '+a.error:''}${a.inspection?' · '+a.inspection.triangles.toLocaleString()+' tris / '+a.inspection.clips.length+' clips':''}`;list.appendChild(li);}}
    const rig=document.getElementById('celestialRigNote');if(rig)rig.textContent=P.inspectCelestialWarrior().reason || 'Celestial Warrior: rig / clips / hand sockets พร้อมใช้งาน';
  }
  let assetSignature='';
  A.subscribe(()=>{
    const signature=A.snapshot().assets.filter(a=>a.state==='loaded').map(a=>a.key).join(',');
    const settled=A.snapshot().assets.every(a=>['loaded','missing','error'].includes(a.state));
    if(settled&&signature!==assetSignature){assetSignature=signature;revision++;}
    updateStatus();
  });
  // Defer DOM bindings until all original handlers and lexical state are ready.
  setTimeout(()=>{
    const panel=document.createElement('section');panel.id='celestialPanel';panel.className='hidden';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','celestialPanelTitle');
    panel.innerHTML='<button class="go ghost small" id="celestialClose">ปิด ×</button><h2 id="celestialPanelTitle">Moonfall / Phase 1 &amp; 2</h2><p>GLB จะแสดงสถานะ loaded เฉพาะเมื่อมีไฟล์จริงและถอดรหัสสำเร็จ รายการ missing ใช้ฉากสำรองและระบบเดิม</p><ul id="celestialAssetList"></ul><p id="celestialRigNote"></p><div id="celestialMetrics"></div><p>FPS ในเครื่องทดสอบนี้ไม่ใช่ผลรับรองประสิทธิภาพมือถือจริง CPU submit ไม่รวมเวลาทำงาน GPU</p><label class="chk"><input type="checkbox" id="celestialPerfToggle"> แสดง Performance ระหว่างเล่น</label><p>มือถือเล่นแนวนอน · กราฟิกอัตโนมัติใช้โหมดประหยัดบนมือถือ · โหมดสูงเพิ่ม Bloom และเงา</p>';
    document.body.appendChild(panel);
    const perf=document.createElement('output');perf.id='celestialPerf';perf.className='hidden';document.body.appendChild(perf);
    const open=document.getElementById('celestialInfoBtn'),close=document.getElementById('celestialClose');
    const dismiss=()=>{panel.classList.add('hidden');open.focus();};
    open.onclick=()=>{updateStatus();updateMetrics();panel.classList.remove('hidden');close.focus();};close.onclick=dismiss;
    panel.addEventListener('keydown',e=>{if(e.key==='Escape')dismiss();if(e.key==='Tab'){
      const first=close,last=document.getElementById('celestialPerfToggle');
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }});
    const toggle=document.getElementById('celestialPerfToggle');toggle.checked=showPerf;toggle.onchange=()=>{showPerf=toggle.checked;updateMetrics();};
    document.getElementById('moonfallBtn').onclick=()=>{
      // Explicit solo exploration entry; the normal Solo/online spawn is unchanged.
      document.getElementById('soloBtn').click();
      const timeout=performance.now()+30000;
      const jump=()=>{if(state==='play'&&ME()&&WD?.castle){const C=WD.castle,p=C.loc(0,130);ME().x=p.x;ME().y=p.y;P.tx=P.ty=undefined;announce={txt:'☽ Moonfall · สำรวจสนาม / กติกาต่อสู้เดิม',t:4};}
        else if(performance.now()<timeout)setTimeout(jump,100);};setTimeout(jump,100);
    };
    A.start();updateStatus();
  },0);
};
