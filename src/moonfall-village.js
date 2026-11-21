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
  // Arena Royale: one house per land, the owner's models (2026-11-20): The Last Candle in the Cursed Forest, the Magic Potion House
  // in the Abyss, the Timberstone Cottage everywhere else. World gen (a.js HOUSEFIT / houseFit) already picked the model of each
  // house (h.mk) and fitted its walls, doorway, loot and chests to that model; the picked footprint is h.al. The Cursed Realm
  // keeps its three Moonfall houses; a house whose model failed to load keeps the plain box house.
  const arena=()=>typeof MOON==='undefined'||!MOON;
  const FIT=k=>typeof HOUSEFIT!=='undefined'&&HOUSEFIT[k];
  const keyFor=h=>{if(arena()){const k=h.mk||(FIT('house-timber')&&typeof REG!=='undefined'&&REG.at?HOUSEFIT.land[REG.at(h.x+h.w/2,h.y+h.h/2)]:null),a=k&&A&&A.get(k);if(a&&a.state==='loaded')return k;if(h.mk)return null}
    return h.style==='witch'?'house-witch':(Math.max(h.w,h.h)/Math.min(h.w,h.h)>1.28||h.seed%3===0?'house-long':'house-cottage')};
  // Arena houses never fade: when the hero is inside or behind one, the model is cut away instead (everything above wall height
  // goes, the doorway opens, the inner faces darken) so the room shows inside the model's own walls. Per-house uniforms.
  function cutaway(m){const ob=m.onBeforeCompile,ck=m.customProgramCacheKey;m.userData.cut={value:new T.Vector4(1e9,0,0,0)};m.userData.door={value:new T.Vector4(1e9,1e9,-1e9,-1e9)};
    m.onBeforeCompile=function(sh,rr){if(ob)ob.call(this,sh,rr);sh.uniforms.uCut=this.userData.cut;sh.uniforms.uDoorQ=this.userData.door;
      sh.fragmentShader=sh.fragmentShader.replace('void main() {','uniform vec4 uCut;uniform vec4 uDoorQ;\nvoid main() {\n  if(vWY>uCut.x)discard;\n  if(uCut.y>.5&&vWY>uCut.z&&vWY<uCut.w&&vFowW.x>uDoorQ.x&&vFowW.x<uDoorQ.z&&vFowW.y>uDoorQ.y&&vFowW.y<uDoorQ.w)discard;')
        .replace('#include <emissivemap_fragment>','if(uCut.y>.5&&!gl_FrontFacing)diffuseColor.rgb*=.4;\n#include <emissivemap_fragment>')};
    m.customProgramCacheKey=function(){return (ck?ck.call(this):'')+'cut'};m.side=T.DoubleSide;m.transparent=false;m.opacity=1;return m}
  function shell(R,key,mats,cut){
    const parts=R.celestialAsset(key);if(!parts)return null;const g=new T.Group();
    for(const p of parts){const m=p.mat.clone();m.onBeforeCompile=p.mat.onBeforeCompile;m.customProgramCacheKey=p.mat.customProgramCacheKey;m.transparent=true;if(cut)cutaway(m);mats&&mats.push(m);
      const mesh=new T.Mesh(p.geo,m);mesh.castShadow=R.hi;mesh.receiveShadow=true;mesh.userData.ownMat=1;g.add(mesh)}
    return g}
  // The box walls, corner posts, door frames, lit windows and footings of the old house sit along the same walls as the model now
  // and would poke out of it (a porch or a recessed front): for a house with a model they are never drawn (their materials skip
  // the footprints of the nearest such houses). They still give the collisions; the plank floor stays for the room inside.
  const HN=24,hideQ={value:Array.from({length:HN},()=>new T.Vector4(1e9,1e9,-1e9,-1e9))},hideN={value:0},CUT=96;
  function houseView(R){
    const tex={tudor:'plaster',lake:'planks',witch:'plaster',cabin:'logs',stone:'bricks'},col={tudor:'#ffffff',lake:'#a8c0d0',witch:'#9a90a8',cabin:'#ffffff',stone:'#e8e0d0'};
    const ms=new Set([R.tstd('bricks','#b8b0a0',.9,0),R.tstd('bark','#5a3a24',.9,0),R.winMat]);for(const s in tex)ms.add(R.tstd(tex[s],col[s],.88,0));
    for(const m of ms){if(!m||m._houseHide)continue;m._houseHide=1;const ob=m.onBeforeCompile,ck=m.customProgramCacheKey;
      m.onBeforeCompile=function(sh,rr){if(ob)ob.call(this,sh,rr);sh.uniforms.uHouseQ=hideQ;sh.uniforms.uHouseN=hideN;
        sh.fragmentShader=sh.fragmentShader.replace('void main() {','uniform vec4 uHouseQ['+HN+'];uniform int uHouseN;\nvoid main() {\n  for(int i=0;i<'+HN+';i++){if(i>=uHouseN)break;vec4 q=uHouseQ[i];if(vFowW.x>q.x&&vFowW.x<q.z&&vFowW.y>q.y&&vFowW.y<q.w&&vWY<420.)discard;}')};   // 420: the Old Town's houses stand on the plateau (a.js CITY_P)
      m.customProgramCacheKey=function(){return (ck?ck.call(this):'')+'hh'};m.needsUpdate=true}
    const sc=R.scene;if(sc._houseHide)return;sc._houseHide=1;const ob=sc.onBeforeRender;
    sc.onBeforeRender=function(){try{const tx=R.tx||0,ty=R.ty||0,c=[];
        for(const r of R.roofs||[]){if(!r.shell)continue;const h=r.h,dx=h.x+h.w/2-tx,dy=h.y+h.h/2-ty,d=dx*dx+dy*dy;if(d<2.6e6)c.push([d,h]);
          // r4 has just set the fade (inside: roofA -> 0, behind: occ -> .18); it becomes how far the cut has come down
          const a=Math.min(h.roofA===undefined?1:h.roofA,r.occ===undefined?1:r.occ),k=clamp((a-.18)/.82,0,1),on=k<.995,base=r.g.position.y;
          r.g.visible=true;const cy=on?base+CUT+(r.H-CUT)*k*k*k:1e9;
          for(const m of r.mats){m.opacity=1;m.depthWrite=true;const u=m.userData.cut&&m.userData.cut.value;if(!u)continue;u.set(cy,on?1:0,base+5,base+CUT+2);m.userData.door.value.copy(r.dq)}
          if(r.cutOn!==on){r.cutOn=on;r.g.traverse(o=>{if(o.isMesh)o.castShadow=R.hi&&!on})}}
        c.sort((a,b)=>a[0]-b[0]);const n=Math.min(HN,c.length);for(let i=0;i<n;i++){const h=c[i][1];hideQ.value[i].set(h.x-16,h.y-16,h.x+h.w+16,h.y+h.h+16)}hideN.value=n}catch(e){hideN.value=0}
      if(ob)return ob.apply(this,arguments)}}
  P.buildWorld=function(){
    build.call(this);
    if(!A||typeof CURSED==='undefined'||!CURSED)return;
    for(const r of this.roofs||[]){const h=r.h,key=keyFor(h),a=key&&A.get(key),size=a&&a.inspection&&a.inspection.size;if(!size)continue;
      const F=arena()&&FIT(key),mats=[],inner=shell(this,key,mats,!!F);if(!inner)continue;
      const al=F&&h.al||h,along=al.w>=al.h,L=Math.max(al.w,al.h)+56,W=Math.min(al.w,al.h)+56,mx=size[0]>=size[2],ml=Math.max(size[0],size[2]),H=Math.min(300,Math.max(150,L*size[1]/ml));
      const want=WANT[h.side]||0;
      if(F){
        // the same fit as a.js houseFit: the door turned to the doorway, each model axis stretched over the footprint axis it lands
        // on, the middle of the model's walls (not of its box) on the middle of the footprint
        const body=F.body,rot=(a.config.doorAngle||Math.PI/2)-want,sw=Math.abs(Math.sin(rot))>.5,sx=sw?al.h+56:al.w+56,sz=sw?al.w+56:al.h+56,ox=-(body[0]+body[1])/2*sx,oz=-(body[2]+body[3])/2*sz,c=Math.cos(rot),s=Math.sin(rot);
        inner.scale.set(sx,H,sz);inner.rotation.y=rot;inner.position.set(ox*c+oz*s,0,-ox*s+oz*c)}
      else{inner.scale.set(mx?L:W,H,mx?W:L);let rot=(mx===along)?0:Math.PI/2;
        // turn the model so its door faces the real doorway when the model has one on that axis
        const da=(a.config.doorAngle||0)-rot;if(Math.cos(da-want)<-.3)rot+=Math.PI;inner.rotation.y=rot}
      const g=new T.Group();g.add(inner);g.position.set(al.x+al.w/2,this.gY(al.x+al.w/2,al.y+al.h/2)-2,al.y+al.h/2);
      this.scene.remove(r.g);this.scene.add(g);r.g=g;r.mats=mats;r.shell=!!F;r.H=H;r.smoke={x:g.position.x,y:H*.9,z:g.position.z};
      // the doorway opened in the model while it is cut away: the gap in the walls, from inside the room to the step outside
      if(F&&h.door){const n=h.side==='r'?[1,0]:h.side==='l'?[-1,0]:h.side==='b'?[0,1]:[0,-1],lat=n[0]?[0,1]:[1,0],dx=h.door.x,dy=h.door.y,q=[];
        for(const u of[-49,49])for(const v of[-84,64])q.push([dx+lat[0]*u+n[0]*v,dy+lat[1]*u+n[1]*v]);
        r.dq=new T.Vector4(Math.min(...q.map(p=>p[0])),Math.min(...q.map(p=>p[1])),Math.max(...q.map(p=>p[0])),Math.max(...q.map(p=>p[1])))}
      else r.dq=new T.Vector4(1e9,1e9,-1e9,-1e9)}
    if(arena()&&(this.roofs||[]).some(r=>r.shell))houseView(this);
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
  // ---- Arena Royale nature dressing: mossy boulders, nebula blooms / rocky meadow patches / banana plants by the river and in the
  //      meadows, clear-water river stones (decor only, no collision). Owner 2026-11-18: lupine, flower cushion and the sapling-like
  //      tall-grass clump were replaced (their Meshy textures had black holes) ----
  P.buildNature=function(){const tg=WD.tg,n=tg.n,C=tg.C,hg=tg.hg,dens=this.gdens;if(!tg||!dens)return;
    const hash=(x,y,s)=>{const v=Math.sin(x*12.9898+y*78.233+s*37.719)*43758.5453;return v-Math.floor(v)},sz=k=>{const a=A.get(k);return a&&a.inspection&&a.inspection.size};
    const inst=(key,items,size)=>this.natInst(key,items,size);
    // owner 2026-11-19: the detailed wide rock takes over EVERY boulder (meadow, map edge, hill ring, cave mouth); taller where the
    // old rock was a wall piece. Same spot, same collision. Before it loads, mossy boulders stand in for the meadow rocks
    if(this.mfProp('wide-rock'))inst('wide-rock',WD.rocks.filter(r=>this.plainRock(r)).map(r=>({x:r.x,y:r.y,r:r.r,hy:r.edge?1.9:r.cliff?1.6:r.cave!==undefined?1.4:1.1,a:hash(r.x,r.y,1)*6.283,dy:-r.r*.14})),(q,s)=>{const W=q.r*2.25,k=W/Math.max(s[0],s[2]);return[s[0]*k,s[1]*k*q.hy,s[2]*k]});
    else inst('mossy-boulder',WD.rocks.filter(r=>this.plainRock(r)).map(r=>({x:r.x,y:r.y,r:r.r,a:hash(r.x,r.y,1)*6.283,dy:-r.r*.12})),(q,s)=>{const W=q.r*2.35,k=W/Math.max(s[0],s[2]);return[s[0]*k,s[1]*k*1.05,s[2]*k]});
    // owner 2026-11-19: every rocky hill (outcrop part) is dressed as an Ironvein Bastion, standing on the ground around it and
    // rising past the raised plateau so the terrain bump never shows through
    const hills=[];for(const cl of WD.cliffs||[])for(const c of cl.parts){let g=Infinity;for(let a=0;a<6.28;a+=.785)g=Math.min(g,this.gY(c.x+Math.cos(a)*c.r,c.y+Math.sin(a)*c.r));
      hills.push({x:c.x,y:c.y,r:c.r,h:Math.max(40,this.gY(c.x,c.y)-g),dy:g-this.gY(c.x,c.y)-6,a:hash(c.x,c.y,41)*6.283})}
    inst('bastion-hill',hills,(q,s)=>{const W=q.r*2.2,k=W/Math.max(s[0],s[2]);return[s[0]*k,Math.max(s[1]*k,q.h*1.28),s[2]*k]});
    const wet=(i,j,R)=>{for(let b=-R;b<=R;b+=1)for(let a=-R;a<=R;a+=1){const ii=i+a,jj=j+b;if(ii>=0&&jj>=0&&ii<n&&jj<n&&hg[jj*n+ii]<WL-1)return true}return false};
    const stones=[],bloom=[],patch=[],banana=[];
    for(let j=2;j<n-2;j+=2)for(let i=2;i<n-2;i+=2){const k=j*n+i,h=hg[k],x=(i+hash(i,j,2))*C,y=(j+hash(i,j,3))*C,r=hash(i,j,4);
      if(h<WL-1){if(h>WL-18&&r<.09)stones.push({x,y,w:46+hash(i,j,5)*60,a:hash(i,j,6)*6.283,dy:-2});continue}
      if(h<WL+3){if(r<.32)stones.push({x,y,w:55+hash(i,j,5)*70,a:hash(i,j,6)*6.283});continue}
      if(!dens[k]||dens[k]<160)continue;const nearW=h<WL+28&&wet(i,j,5);
      const p=nearW?.34:WD.noise(x,y)<.44?.035:.012;if(r>p)continue;const t=hash(i,j,7);const it={x,y,a:hash(i,j,8)*6.283,s:.75+hash(i,j,9)*.6};
      (t<.4?bloom:t<.72?patch:banana).push(it)}
    inst('river-stones',stones,(q,s)=>{const k=q.w/Math.max(s[0],s[2]);return[s[0]*k,s[1]*k,s[2]*k]});
    inst('nebula-bloom',bloom,(q,s)=>{const H=70*q.s,k=H/s[1];return[s[0]*k,H,s[2]*k]});
    inst('rocky-meadow',patch.map(q=>Object.assign(q,{dy:-2})),(q,s)=>{const W=150*q.s,k=W/Math.max(s[0],s[2]);return[s[0]*k,s[1]*k,s[2]*k]});
    inst('banana-plant',banana,(q,s)=>{const H=100*q.s,k=H/s[1];return[s[0]*k,H,s[2]*k]});
    // owner 2026-11-18: mystic mushrooms at the feet of trees, emerald crystals (thick in the abyss region), torch walls lining the
    // dungeon. Owner 2026-11-19: every floor model removed (octagon paving, ash-land rift slabs, dungeon flagstones)
    const mush=[],crys=[],reg=(x,y)=>typeof REG!=='undefined'&&REG.at?REG.at(x,y):-1,house=(x,y)=>typeof houseAt==='function'&&houseAt({x,y});
    for(const t of WD.trees){const r=hash(t.x,t.y,11);if(r>.2)continue;const a=hash(t.x,t.y,12)*6.283,d=(t.cr||60)*.75+26,x=t.x+Math.cos(a)*d,y=t.y+Math.sin(a)*d;
      if(!walkable(x,y,10)||inWater(x,y))continue;mush.push({x,y,a:hash(t.x,t.y,13)*6.283,s:.75+hash(t.x,t.y,14)*.6})}
    for(let j=2;j<n-2;j+=2)for(let i=2;i<n-2;i+=2){const k=j*n+i,h=hg[k];if(h<WL+3)continue;const x=(i+hash(i,j,21))*C,y=(j+hash(i,j,22))*C,r=hash(i,j,23),g=reg(x,y);
      if(g===3)continue;
      if(!dens[k])continue;if(r<(g===4?.0045:.00045)&&walkable(x,y,40)&&!house(x,y))crys.push({x,y,a:hash(i,j,28)*6.283,s:.7+hash(i,j,29)*.7})}
    inst('mystic-mushrooms',mush,(q,s)=>{const W=72*q.s,k=W/Math.max(s[0],s[2]);return[s[0]*k,s[1]*k,s[2]*k]});
    // (owner 2026-11-19: crystal density cut 85%, .03/.003 -> .0045/.00045)
    inst('emerald-crystals',crys,(q,s)=>{const W=84*q.s,k=W/Math.max(s[0],s[2]);return[s[0]*k,s[1]*k,s[2]*k]});
    let dgF=0,dgW=0;const D=WD.dg;
    if(D&&this.mfProp('dungeon-wall')){const wl=[],L=175,DE=46,inD=(x,y)=>x>D.x+D.T&&x<D.x+D.w-D.T&&y>D.y+D.T&&y<D.y+D.h-D.T,inWall=(x,y)=>WD.walls.some(q=>q.castle===3&&x>q.x&&x<q.x+q.w&&y>q.y&&y<q.y+q.h);
      for(const q of WD.walls){if(q.castle!==3)continue;const hor=q.w>=q.h,len=hor?q.w:q.h,n=Math.max(1,Math.round(len/L)),step=len/n;
        for(const side of[-1,1])for(let m=0;m<n;m++){const c=(m+.5)*step;let x,y,a;
          if(hor){x=q.x+c;y=side<0?q.y-DE/2:q.y+q.h+DE/2;a=side<0?-Math.PI/2:Math.PI/2}else{y=q.y+c;x=side<0?q.x-DE/2:q.x+q.w+DE/2;a=side<0?0:Math.PI}
          const px=hor?x:x+(side<0?-DE:DE),py=hor?y+(side<0?-DE:DE):y;if(!inD(px,py)||inWall(px,py))continue;wl.push({x,y,a,len:step})}}
      inst('dungeon-wall',wl,q=>[DE,170,q.len+2]);dgW=wl.length}
    this.natureCounts={hills:hills.length,stones:stones.length,bloom:bloom.length,patch:patch.length,banana:banana.length,mush:mush.length,crys:crys.length,dgFloor:dgF,dgWall:dgW}};
  // owner's Verdant Solitude tree replaces the birches (r3 buildVegetation asks verdantOn first); drawn through instC with the tree
  // items so felling (trees-break.js) copies it and the see-through-canopy (treeParts) still works
  P.verdantOn=function(){return (typeof MOON==='undefined'||!MOON)&&this.mfProp('verdant-tree')};
  P.verdantTrees=function(list,reg){if(!list.length)return;const a=A.get('verdant-tree'),s=a.inspection.size,parts=this.celestialAsset('verdant-tree');
    const place=(t,add)=>{const H=(70*t.h+t.cr*1.3),k=H/s[1],R=mulberry32(Math.floor(t.x*7+t.y));add(t.x,this.gY(t.x,t.y)-2,t.y,s[0]*k,H,s[2]*k,0,R()*6.283,0,null)};
    for(const p of parts)this.instC(p.geo,p.mat,list,place,true,reg)};
  P.plainRock=function(r){return !r.prop&&(typeof MOON==='undefined'||!MOON)&&(this.mfProp('wide-rock')||!r.edge&&!r.cliff&&r.cave===undefined&&this.mfProp('mossy-boulder'))};
  // one Meshy prop instanced over a list (size(q,s) -> [sx,sy,sz] from the model's own proportions s)
  P.natInst=function(key,items,size,csz){if(!this.mfProp(key)||!items.length)return false;const s=A.get(key).inspection.size,parts=this.celestialAsset(key);
    for(const p of parts)this.instC(p.geo,p.mat,items,(q,add)=>{const k=size(q,s);add(q.x,this.gY(q.x,q.y)+(q.dy||0)-1,q.y,k[0],k[1],k[2],0,q.a,0,q.c===undefined?null:q.c)},true,null,csz);return true};
  // the boulders lining cave passages (r3 buildRocks asks first)
  P.rockDeco=function(deco){if(typeof MOON!=='undefined'&&MOON)return false;
    return this.natInst('wide-rock',deco.map(r=>({x:r.x,y:r.y,r:r.r,a:r.x%6.283,dy:Math.max(0,this.gY(r.x,r.y))-this.gY(r.x,r.y)-r.r*.2})),(q,s)=>{const W=q.r*2.1,k=W/Math.max(s[0],s[2]);return[s[0]*k,s[1]*k*1.5,s[2]*k]})};
  // owner 2026-11-19: the Meshy pine replaces the stacked-cone pines (valley + dark). Valley-forest pines use the full model through
  // instC with the tree items (felling and see-through canopies keep working); the thousands of mountain pines use a 1.6k-triangle
  // copy. Dark pines keep their cooler tint
  P.pineOn=function(){return (typeof MOON==='undefined'||!MOON)&&this.mfProp('pine-tree')};
  P.pineTrees=function(list,reg){if(!list.length)return;const a=A.get('pine-tree'),s=a.inspection.size,parts=this.celestialAsset('pine-tree');
    const place=(t,add)=>{const H=38*t.h+t.cr*2.15,k=H/s[1],R=mulberry32(Math.floor(t.x*7+t.y));add(t.x,this.gY(t.x,t.y)-3,t.y,s[0]*k*1.35,H,s[2]*k*1.35,0,R()*6.283,0,t.v===4?'#a9c4bc':'#ffffff')};
    for(const p of parts)this.instC(p.geo,p.mat,list,place,true,reg)};
  // owner 2026-11-19: Big Mango Tree for the mango items (wide canopy: the model's own width, about 2.3x the crown radius)
  P.mangoOn=function(){return (typeof MOON==='undefined'||!MOON)&&this.mfProp('mango-tree')};
  P.mangoTrees=function(list,reg){if(!list.length)return;const s=A.get('mango-tree').inspection.size,parts=this.celestialAsset('mango-tree');
    const place=(t,add)=>{const W=t.cr*2.5,k=W/Math.max(s[0],s[2]),R=mulberry32(Math.floor(t.x*5+t.y*3));add(t.x,this.gY(t.x,t.y)-4,t.y,s[0]*k,s[1]*k*t.h,s[2]*k,0,R()*6.283,0,null)};
    for(const p of parts)this.instC(p.geo,p.mat,list,place,true,reg)};
  // owner 2026-11-21: the Cursed Forest's trees are the gnarled leafless moon tree (the model the owner sent with the Moonfall set); r3
  // buildVegetation hands over every tree item standing in REG land 1, through instC with the tree items so felling and see-through
  // canopies keep working. Height follows the item's own size, a random turn per tree
  P.deadOn=function(){return (typeof MOON==='undefined'||!MOON)&&typeof REG!=='undefined'&&!!REG.at&&this.mfProp('moon-dead-tree')};
  P.deadTrees=function(list,reg){if(!list.length)return;const s=A.get('moon-dead-tree').inspection.size,parts=this.celestialAsset('moon-dead-tree');
    const place=(t,add)=>{const R=mulberry32(Math.floor(t.x*7+t.y)),H=(t.mg?250:t.v===2?225:200)*t.h*(.9+R()*.2),k=H/s[1];add(t.x,this.gY(t.x,t.y)-3,t.y,s[0]*k,H,s[2]*k,0,R()*6.283,0,null)};
    for(const p of parts)this.instC(p.geo,p.mat,list,place,true,reg)};
  P.pineMtrees=function(list){if(!this.pineOn()||!this.mfProp('pine-tree-lo'))return false;const s=A.get('pine-tree-lo').inspection.size,parts=this.celestialAsset('pine-tree-lo');
    const place=(t,add)=>{const H=165*t.s,k=H/s[1];add(t.x,t.h-3,t.y,s[0]*k*1.4,H,s[2]*k*1.4,0,(t.x*1.7+t.y)%6.283,0,t.v===4?'#a9c4bc':'#ffffff')};
    for(const p of parts)this.instC(p.geo,p.mat,list,place,false,null,2500);return true};
};
