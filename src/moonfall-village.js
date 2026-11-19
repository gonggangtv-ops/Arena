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
      if(!dens[k])continue;if(r<(g===4?.03:.003)&&walkable(x,y,40)&&!house(x,y))crys.push({x,y,a:hash(i,j,28)*6.283,s:.7+hash(i,j,29)*.7})}
    inst('mystic-mushrooms',mush,(q,s)=>{const W=72*q.s,k=W/Math.max(s[0],s[2]);return[s[0]*k,s[1]*k,s[2]*k]});
    inst('emerald-crystals',crys,(q,s)=>{const W=84*q.s,k=W/Math.max(s[0],s[2]);return[s[0]*k,s[1]*k,s[2]*k]});
    let dgF=0,dgW=0;const D=WD.dg;
    if(D&&this.mfProp('dungeon-wall')){const wl=[],L=175,DE=46,inD=(x,y)=>x>D.x+D.T&&x<D.x+D.w-D.T&&y>D.y+D.T&&y<D.y+D.h-D.T,inWall=(x,y)=>WD.walls.some(q=>q.castle===3&&x>q.x&&x<q.x+q.w&&y>q.y&&y<q.y+q.h);
      for(const q of WD.walls){if(q.castle!==3)continue;const hor=q.w>=q.h,len=hor?q.w:q.h,n=Math.max(1,Math.round(len/L)),step=len/n;
        for(const side of[-1,1])for(let m=0;m<n;m++){const c=(m+.5)*step;let x,y,a;
          if(hor){x=q.x+c;y=side<0?q.y-DE/2:q.y+q.h+DE/2;a=side<0?-Math.PI/2:Math.PI/2}else{y=q.y+c;x=side<0?q.x-DE/2:q.x+q.w+DE/2;a=side<0?0:Math.PI}
          const px=hor?x:x+(side<0?-DE:DE),py=hor?y+(side<0?-DE:DE):y;if(!inD(px,py)||inWall(px,py))continue;wl.push({x,y,a,len:step})}}
      inst('dungeon-wall',wl,q=>[DE,170,q.len+2]);dgW=wl.length}
    // owner 2026-11-19: the Autumn Stone Garden tile floors the whole map (everything but water, houses, the dungeon and the steep
    // hill/mountain sides): a square grid, tiles overlapping a little with a random quarter turn so the seams and the art don't repeat,
    // each one tilted with the ground. The plate's carved face points +z in the file, so the geometry is turned face-up once
    let flN=0;
    if(this.mfProp('garden-floor')&&typeof WORLD!=='undefined'){const TW=250,SP=TW*.9,tg=WD.tg,gd=this.gdens;
      const parts=this.celestialAsset('garden-floor').map(p=>({mat:p.mat,geo:this.cached('garden-up-'+p.geo.uuid,()=>{const g=p.geo.clone();g.rotateX(-Math.PI/2);g.translate(0,.5,.5);this.cachedGeos.add(g);return g})}));
      const s0=sz('garden-floor'),TH=s0[2]*TW/s0[0];
      const ok=(x,y)=>!(inWater(x,y)||house(x,y)||(typeof inDG==='function'&&inDG({x,y},40))||(typeof outsideD==='function'&&outsideD(x,y)>-30));
      const tilt=(x,y,r)=>{const hx=(this.gY(x+r,y)-this.gY(x-r,y))/(2*r),hz=(this.gY(x,y+r)-this.gY(x,y-r))/(2*r);return Math.abs(hx)>.5||Math.abs(hz)>.5?null:[-Math.atan(hz),Math.atan(hx)]};
      const tiles=[];
      for(let y=SP/2;y<WORLD;y+=SP)for(let x=SP/2;x<WORLD;x+=SP){if(!ok(x,y)||!ok(x-TW*.4,y)||!ok(x+TW*.4,y)||!ok(x,y-TW*.4)||!ok(x,y+TW*.4))continue;const t=tilt(x,y,TW/2);if(!t)continue;
        tiles.push({x,y,t,q:Math.floor(hash(x,y,51)*4),z:hash(x,y,52)});
        if(gd&&tg){const i0=Math.floor((x-TW/2)/tg.C),i1=Math.floor((x+TW/2)/tg.C),j0=Math.floor((y-TW/2)/tg.C),j1=Math.floor((y+TW/2)/tg.C);for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++)if(i>=0&&j>=0&&i<tg.n&&j<tg.n)gd[j*tg.n+i]=0}}
      // the carved face spans .4-.75 of the plate's depth: its lowest dips sit just above the ground, so no grass shows through
      const place=(q,add)=>{add(q.x,this.gY(q.x,q.y)+3+q.z*1.2-.38*TH,q.y,TW,TH,TW,q.t[0],q.q*Math.PI/2,q.t[1],null)};
      for(const p of parts)this.instC(p.geo,p.mat,tiles,place,false,null);flN=tiles.length}
    this.natureCounts={floor:flN,hills:hills.length,stones:stones.length,bloom:bloom.length,patch:patch.length,banana:banana.length,mush:mush.length,crys:crys.length,dgFloor:dgF,dgWall:dgW}};
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
  P.pineMtrees=function(list){if(!this.pineOn()||!this.mfProp('pine-tree-lo'))return false;const s=A.get('pine-tree-lo').inspection.size,parts=this.celestialAsset('pine-tree-lo');
    const place=(t,add)=>{const H=165*t.s,k=H/s[1];add(t.x,t.h-3,t.y,s[0]*k*1.4,H,s[2]*k*1.4,0,(t.x*1.7+t.y)%6.283,0,t.v===4?'#a9c4bc':'#ffffff')};
    for(const p of parts)this.instC(p.geo,p.mat,list,place,false,null,2500);return true};
};
