/* Moonfall villages: Meshy house shells replace the box-and-roof houses, plus market stalls.
 * Gameplay is untouched: the house footprint, walls, door and loot are the original ones. The shell is the
 * "roof" object, so it fades exactly like the old roof when the hero walks behind or inside the house. */
window.installMoonfallVillage=function(P){
  'use strict';
  if(P.moonfallVillage)return;P.moonfallVillage=true;
  const T=THREE,A=window.CelestialAssets,build=P.buildWorld;
  const WANT={r:0,b:Math.PI/2,l:Math.PI,t:-Math.PI/2};
  // Without the Moonfall renderer (Arena Royale) this file brings its own model preparation.
  if(!P.celestialAsset){const prepared=new Map();
    P.celestialAsset=function(key){const a=A&&A.get(key);if(!a||a.state!=='loaded')return null;if(prepared.has(key))return prepared.get(key);
      const root=a.gltf.scene.clone(true);root.rotation.y+=a.config.rotationY||0;root.updateMatrixWorld(true);
      const bb=new T.Box3().setFromObject(root,true),size=bb.getSize(new T.Vector3());
      const norm=new T.Matrix4().makeScale(1/Math.max(size.x,1e-5),1/Math.max(size.y,1e-5),1/Math.max(size.z,1e-5)).multiply(new T.Matrix4().makeTranslation(-(bb.min.x+bb.max.x)/2,-bb.min.y,-(bb.min.z+bb.max.z)/2));
      const parts=[];root.traverse(n=>{if(!n.isMesh)return;const geo=n.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(norm,n.matrixWorld));this.cachedGeos.add(geo);
        const paint=src=>this.cached('moon-asset-'+src.uuid,()=>{const m=src.clone();if(m.isMeshStandardMaterial){m.envMap=this.envTex||null;m.envMapIntensity=.5}return this.fow(m,{key:'moon-asset',uniforms:{uZoneN:this.U.zoneN},frag:fs=>zlines(fs)})});
        parts.push({geo,mat:Array.isArray(n.material)?n.material.map(paint):paint(n.material)})});
      prepared.set(key,parts);return parts};
    if(A)A.start();
    // the models arrive after the first world build: rebuild the village once they are in
    if(A)A.subscribe(()=>{if(R3.ok&&WD&&R3.world===WD&&!P._villageDone&&(window.CELESTIAL_KEYS||['house-cottage']).every(k=>A.get(k)&&A.get(k).state==='loaded')){P._villageDone=1;R3.world=null}})}
  // r3 asks this before drawing its own well / fountain / lantern / bridge / stall, so nothing is drawn twice
  P.mfProp=function(key){if(typeof CURSED==='undefined'||!CURSED||!A)return false;const a=A.get(key);return !!(a&&a.state==='loaded'&&a.inspection&&a.inspection.size)};
  const keyFor=h=>h.style==='witch'?'house-witch':(Math.max(h.w,h.h)/Math.min(h.w,h.h)>1.28||h.seed%3===0?'house-long':'house-cottage');
  function shell(R,key,mats){
    const parts=R.celestialAsset(key);if(!parts)return null;const g=new T.Group();
    for(const p of parts){const m=p.mat.clone();m.onBeforeCompile=p.mat.onBeforeCompile;m.customProgramCacheKey=p.mat.customProgramCacheKey;m.transparent=true;mats&&mats.push(m);
      const mesh=new T.Mesh(p.geo,m);mesh.castShadow=R.hi;mesh.receiveShadow=true;mesh.userData.ownMat=1;g.add(mesh)}
    return g}
  P.buildWorld=function(){
    build.call(this);
    if(!A||typeof CURSED==='undefined'||!CURSED)return;
    for(const r of this.roofs||[]){const h=r.h,key=keyFor(h),a=A.get(key),size=a&&a.inspection&&a.inspection.size;if(!size)continue;
      const mats=[],inner=shell(this,key,mats);if(!inner)continue;
      const along=h.w>=h.h,L=Math.max(h.w,h.h)+56,W=Math.min(h.w,h.h)+56,mx=size[0]>=size[2],ml=Math.max(size[0],size[2]),H=Math.min(300,Math.max(150,L*size[1]/ml));
      inner.scale.set(mx?L:W,H,mx?W:L);let rot=(mx===along)?0:Math.PI/2;
      // turn the model so its door faces the real doorway when the model has one on that axis
      const da=(a.config.doorAngle||0)-rot,want=WANT[h.side]||0;if(Math.cos(da-want)<-.3)rot+=Math.PI;inner.rotation.y=rot;
      const g=new T.Group();g.add(inner);g.position.set(h.x+h.w/2,this.gY(h.x+h.w/2,h.y+h.h/2)-2,h.y+h.h/2);
      this.scene.remove(r.g);this.scene.add(g);r.g=g;r.mats=mats;r.smoke={x:g.position.x,y:H*.9,z:g.position.z}}
    const sa=A.get('market-stall'),ss=sa&&sa.inspection&&sa.inspection.size;
    if(ss)for(const s of WD.stalls||[]){const g=shell(this,'market-stall');if(!g)break;const k=118/Math.max(ss[0],ss[2]);g.scale.set(ss[0]*k,ss[1]*k,ss[2]*k);g.rotation.y=-s.a-Math.PI/2;g.position.set(s.x,this.gY(s.x,s.y)-1,s.y);this.scene.add(g)}
    // ---- village dressing: wells, plaza fountains, street lanterns, river bridges ----
    const sz=k=>{const a=A.get(k);return a&&a.inspection&&a.inspection.size},prop=(key,x,y,z,w,h,d,ry)=>{const parts=this.celestialAsset(key);if(!parts)return null;const g=new T.Group();
      for(const p of parts){const m=new T.Mesh(p.geo,p.mat);m.castShadow=this.hi;m.receiveShadow=true;g.add(m)}g.scale.set(w,h,d);g.rotation.y=ry;g.position.set(x,y,z);this.scene.add(g);return g};
    const hash=(x,y)=>{const s=Math.sin(x*12.9898+y*78.233)*43758.5453;return s-Math.floor(s)};
    if(this.mfProp('village-well')){const s=sz('village-well');for(const w of WD.wells){const W=w.r*2.6;prop('village-well',w.x,this.gY(w.x,w.y)-1,w.y,W,W*s[1]/Math.max(s[0],s[2]),W,hash(w.x,w.y)*6.283)}}
    if(this.mfProp('plaza-fountain')){const s=sz('plaza-fountain');for(const f of WD.fountains){const W=f.r*2.5;prop('plaza-fountain',f.x,this.gY(f.x,f.y)-1,f.y,W,W*s[1]/Math.max(s[0],s[2])*1.15,W,hash(f.x,f.y)*6.283)}}
    if(this.mfProp('street-lantern')){const s=sz('street-lantern'),parts=this.celestialAsset('street-lantern'),H=78,k=H/s[1],items=WD.lanterns.filter(l=>!l.torch&&!l.small);
      for(const p of parts)this.instC(p.geo,p.mat,items,(l,add)=>add(l.x,this.gY(l.x,l.y)-1,l.y,s[0]*k,H,s[2]*k,0,hash(l.x,l.y)*6.283,0,null),true)}
    // river bridges: a row of arch blocks bent along the bridge's hump, so the stone deck matches where people walk
    if(this.mfProp('stone-bridge')){const parts=this.celestialAsset('stone-bridge');
      for(const b of WD.bridges){if(b.dock)continue;const n=Math.max(2,Math.round(b.len/(b.wid*1.05))),seg=b.len/n,H=b.big?92:80,hump=b.big?30:24;
        const g=new T.Group();g.position.set(b.x,0,b.y);g.rotation.y=Math.atan2(-b.ay,b.ax);
        for(const p of parts){const src=p.geo,pos=src.attributes.position,geos=[];
          for(let i=0;i<n;i++){const q=src.clone(),a=src.attributes.position,f=new Float32Array(a.count*3);  // float copy: the packed (quantized) positions cannot hold world-size values
            for(let v=0;v<a.count;v++){const x=-b.len/2+seg*(i+.5)+a.getX(v)*seg*1.02,t=x/(b.len/2);f[v*3]=x;f[v*3+1]=(a.getY(v)-1)*H+7+hump*(1-t*t)+2;f[v*3+2]=a.getZ(v)*b.wid*1.04}
            q.setAttribute('position',new T.BufferAttribute(f,3));q.deleteAttribute('normal');q.computeVertexNormals();q.computeBoundingSphere();geos.push(q)}
          const geo=T.BufferGeometryUtils?T.BufferGeometryUtils.mergeGeometries(geos):null;
          if(geo){const m=new T.Mesh(geo,p.mat);m.castShadow=this.hi;m.receiveShadow=true;m.userData.ownGeo=1;g.add(m)}else for(const q of geos){const m=new T.Mesh(q,p.mat);m.castShadow=this.hi;m.receiveShadow=true;g.add(m)}}
        this.scene.add(g)}}
    if(typeof MOON==='undefined'||!MOON)this.buildNature();
  };
  // ---- Arena Royale nature dressing: mossy boulders, wildflowers by the river, clear-water river stones (decor only, no collision) ----
  P.buildNature=function(){const tg=WD.tg,n=tg.n,C=tg.C,hg=tg.hg,dens=this.gdens;if(!tg||!dens)return;
    const hash=(x,y,s)=>{const v=Math.sin(x*12.9898+y*78.233+s*37.719)*43758.5453;return v-Math.floor(v)},sz=k=>{const a=A.get(k);return a&&a.inspection&&a.inspection.size};
    const inst=(key,items,size)=>{if(!this.mfProp(key)||!items.length)return;const s=sz(key),parts=this.celestialAsset(key);
      for(const p of parts)this.instC(p.geo,p.mat,items,(q,add)=>{const k=size(q,s);add(q.x,this.gY(q.x,q.y)+(q.dy||0)-1,q.y,k[0],k[1],k[2],0,q.a,0,null)},true)};
    // mossy boulders take over the plain meadow rocks (same spot, same collision)
    inst('mossy-boulder',WD.rocks.filter(r=>this.plainRock(r)).map(r=>({x:r.x,y:r.y,r:r.r,a:hash(r.x,r.y,1)*6.283,dy:-r.r*.12})),(q,s)=>{const W=q.r*2.35,k=W/Math.max(s[0],s[2]);return[s[0]*k,s[1]*k*1.05,s[2]*k]});
    const wet=(i,j,R)=>{for(let b=-R;b<=R;b+=1)for(let a=-R;a<=R;a+=1){const ii=i+a,jj=j+b;if(ii>=0&&jj>=0&&ii<n&&jj<n&&hg[jj*n+ii]<WL-1)return true}return false};
    const stones=[],lupine=[],cushion=[],tall=[];
    for(let j=2;j<n-2;j+=2)for(let i=2;i<n-2;i+=2){const k=j*n+i,h=hg[k],x=(i+hash(i,j,2))*C,y=(j+hash(i,j,3))*C,r=hash(i,j,4);
      if(h<WL-1){if(h>WL-18&&r<.09)stones.push({x,y,w:46+hash(i,j,5)*60,a:hash(i,j,6)*6.283,dy:-2});continue}
      if(h<WL+3){if(r<.32)stones.push({x,y,w:55+hash(i,j,5)*70,a:hash(i,j,6)*6.283});continue}
      if(!dens[k]||dens[k]<160)continue;const nearW=h<WL+28&&wet(i,j,5);
      const p=nearW?.34:WD.noise(x,y)<.44?.035:.012;if(r>p)continue;const t=hash(i,j,7);const it={x,y,a:hash(i,j,8)*6.283,s:.75+hash(i,j,9)*.6};
      (t<.42?lupine:t<.62?cushion:tall).push(it)}
    inst('river-stones',stones,(q,s)=>{const k=q.w/Math.max(s[0],s[2]);return[s[0]*k,s[1]*k,s[2]*k]});
    inst('lupine-clump',lupine,(q,s)=>{const H=58*q.s,k=H/s[1];return[s[0]*k,H,s[2]*k]});
    inst('flower-cushion',cushion,(q,s)=>{const W=42*q.s,k=W/Math.max(s[0],s[2]);return[s[0]*k,s[1]*k,s[2]*k]});
    inst('tall-grass',tall,(q,s)=>{const H=50*q.s,k=H/s[1];return[s[0]*k,H,s[2]*k]});
    this.natureCounts={stones:stones.length,lupine:lupine.length,cushion:cushion.length,tall:tall.length}};
  P.plainRock=function(r){return !r.prop&&!r.edge&&!r.cliff&&r.cave===undefined&&(typeof MOON==='undefined'||!MOON)&&this.mfProp('mossy-boulder')};
};
