/* Arena Royale · breakable trees (Claude, 2026-11-18 · index only; felled trees keep their own textured instances, stumps, hit wobble).
 * Host-authoritative: melee swings (1), arrows/bolts passing the trunk (1), spinning blades (1.5 per tick) and every skill
 * area that resolves on it (3, damage-over-time fields 1.5 per tick) chip a tree's 3 points; at 0 it breaks. Banana plants (a.js, flag
 * bn, owner 2026-11-23 "ปรับต้นกล้วยให้ล้มได้") have 1 point: any blow fells one.
 * {t:'th',i} reports a hit (leaves shake loose), {t:'tb',i,a} breaks tree i falling along angle a on every peer:
 * its colliders leave the grid, the host re-opens the nav cells around it, the renderer hides its instances and drops a
 * felled copy with wood chips, leaves and dust. Trees regrow with the next world. */
(()=>{
  'use strict';
  if(typeof buildCollide!=='function'||typeof WD==='undefined')return;
  const HP=3;
  const _bc=buildCollide;buildCollide=function(w){_bc(w);const map=new Map();w.trees.forEach((t,i)=>{t.ti=i;t.thp=t.bn?1:HP;t.broken=0;t.cols=[];map.set(t.x+','+t.y,t)});
    for(const L of w.cg.cells)for(const o of L){if(o.c!==1||o.tree)continue;const t=map.get(o.x+','+o.y);if(t&&o.r===t.r){o.tree=t;if(!t.cols.includes(o))t.cols.push(o)}}};
  const host=()=>typeof net==='undefined'||net.mode!=='client';
  function nearTrees(x,y,r,fn){if(!WD||!WD.cg)return;const seen=new Set();forObstacles(x,y,r,o=>{const t=o.tree;if(!t||t.broken||seen.has(t))return;seen.add(t);fn(t)})}
  function treeHit(t,amt,ang){if(!host()||!t||t.broken)return;t.thp-=amt;
    if(t.thp>0){emit({t:'th',i:t.ti,a:+(Number.isFinite(ang)?ang:0).toFixed(2)});sndAt('hit',t.x,t.y);return}
    sndAt('heavy',t.x,t.y);emit({t:'tb',i:t.ti,a:+(Number.isFinite(ang)?ang:Math.random()*6.28).toFixed(2)})}
  // the nav grid built at match start treats trunks as walls: open the cells a felled tree leaves free
  function reopenNav(x,y){if(typeof NAV==='undefined'||!NAV||!NAV.g)return;const N=NAV,C=N.C,i0=Math.floor((x-90)/C),i1=Math.floor((x+90)/C),j0=Math.floor((y-90)/C),j1=Math.floor((y+90)/C);
    for(let j=Math.max(0,j0);j<=Math.min(N.n-1,j1);j++)for(let i=Math.max(0,i0);i<=Math.min(N.n-1,i1);i++){const cx=i*C+C/2,cy=j*C+C/2;let b=0;
      if(sdfAt(cx,cy)<24)b=1;else if(forObstacles(cx,cy,22,o=>o.c===1?((cx-o.x)**2+(cy-o.y)**2<(o.r+22)**2):circRect(cx,cy,22,o)))b=1;else for(const h of WD.houses)if(inRect({x:cx,y:cy},h,20)){b=1;break}
      N.g[j*N.n+i]=b}}
  function breakTree(i,a){const t=WD&&WD.trees[i];if(!t||t.broken)return;t.broken=1;t.thp=0;t.ox=t.x;t.oy=t.y;
    for(const o of t.cols||[]){o.x=-1e9;o.y=-1e9}   // out of the collision grid's reach
    t.x=-99999;t.y=-99999;if(host())reopenNav(t.ox,t.oy);
    if(typeof R3!=='undefined'&&R3.ok&&R3.treeFell)try{R3.treeFell(t,a)}catch(e){}}
  const _ae=applyEvent;applyEvent=function(e){if(e&&e.t==='tb'){breakTree(e.i|0,+e.a);return}if(e&&e.t==='th'){const t=WD&&WD.trees[e.i|0];if(t&&!t.broken&&typeof R3!=='undefined'&&R3.ok&&R3.treeShake)try{R3.treeShake(t,+e.a)}catch(err){}return}return _ae.apply(this,arguments)};
  // ---- what chops ----
  const _b=basic;basic=function(u,ft){const r=_b(u,ft);if(r&&u.melee&&host())try{const R=u.range+u.r+30,ang=Math.atan2(u.fy,u.fx);
      nearTrees(u.x,u.y,R,t=>{const d=Math.hypot(t.x-u.x,t.y-u.y);if(d>R+t.r)return;let da=Math.abs(Math.atan2(t.y-u.y,t.x-u.x)-ang);if(da>Math.PI)da=Math.PI*2-da;if(da<1.15)treeHit(t,1,Math.atan2(t.y-u.y,t.x-u.x))})}catch(e){}
    return r};
  const _aa=applyAoe;applyAoe=function(a){const r=_aa(a);if(host()&&a&&!a.fxOnly)try{const R=a.shape==='line'||a.shape==='cone'?(a.len||a.r):a.r;
      nearTrees(a.x,a.y,R+40,t=>{if(!hitArea(a,{x:t.x,y:t.y,r:t.r+16}))return;treeHit(t,a.dot?1.5:HP,Math.atan2(t.y-a.y,t.x-a.x))})}catch(e){}
    return r};
  let spinT=0;const _ct=curTick;curTick=function(dt){_ct(dt);if(!host())return;try{
      spinT-=dt;const tick=spinT<=0;if(tick)spinT=.25;
      if(tick)for(const u of units){if(u.dead||!(u.spinT>0||u.lotusT>0))continue;const R=u.spinT>0?(u.spinR||190):(u.lotusR||300);nearTrees(u.x,u.y,R,t=>{if(Math.hypot(t.x-u.x,t.y-u.y)<R+t.r)treeHit(t,1.5,Math.atan2(t.y-u.y,t.x-u.x))})}
      for(const p of projs){if(p.dead||p.treeHit)continue;nearTrees(p.x,p.y,(p.r||8)+20,t=>{if(p.treeHit)return;if(Math.hypot(t.x-p.x,t.y-p.y)<(p.r||8)+t.r){p.treeHit=1;treeHit(t,1,Math.atan2(p.vy,p.vx))}})}}catch(e){}};
  window.TREES={hit:treeHit,broken:()=>WD&&WD.trees?WD.trees.filter(t=>t.broken).length:0};
  // ---------------- render ----------------
  if(typeof R3==='undefined')return;const P=R3,T=THREE;
  const _ic=P.instC;P.instC=function(geo,mat,items,place,shadow,onInst,csz){const self=this,set=this._treeSet;
    const wrapped=set?(it,im,i)=>{if(onInst)onInst(it,im,i);if(it&&set.has(it)&&it._i!==undefined)(self.treeAll[it._i]||(self.treeAll[it._i]=[])).push([im,i])}:onInst;
    return _ic.call(this,geo,mat,items,place,shadow,wrapped,csz)};
  const _bw=P.buildWorld;P.buildWorld=function(){this._treeSet=new Set(WD.trees);this.treeAll=[];this._fell=[];this._wob=[];this._stumps=null;try{return _bw.apply(this,arguments)}finally{this._treeSet=null}};
  const M4=new T.Matrix4(),M5=new T.Matrix4(),Q0=new T.Quaternion(),V0=new T.Vector3(),V1=new T.Vector3(),S0=new T.Vector3(),C0=new T.Color();
  const CAN={0:'#3f7a3c',1:'#5a8a3c',2:'#9ac45a',3:'#3ac8c0',4:'#2a5a54',5:'#6a3a5e',6:'#7aa84c'};
  const baseOf=(im,idx)=>M4.fromArray(im.userData.base||im.instanceMatrix.array,idx*16);
  // a hit rocks the real tree (its own instances) about its foot, away from the blow
  P.treeShake=function(t,a){if(this.pe&&this.pfxApi){const gy=this.gY(t.x,t.y),h=(t.cr||60)*1.2+40*(t.h||1);
      for(let i=0;i<(this.hi?10:5);i++)this.pe({x:t.x+rand(-t.cr*.6,t.cr*.6),y:gy+h+rand(-20,30),z:t.y+rand(-t.cr*.6,t.cr*.6),vx:rand(-60,60),vy:rand(-10,40),vz:rand(-60,60),g:120,drag:1.2,life:rand(1.2,2),s0:rand(6,10),s1:4,rs:rand(-6,6),kind:4,c:CAN[t.v]||'#5a8a3c',c2:'#3a5a2a'});
      this.pfxApi.sparks({x:t.x,y:gy+30,z:t.y},6,'#c8a070','#6a4a2a',220,200,{life:.6})}
    const L=this.treeAll&&this.treeAll[t._i];if(!L||!L.length)return;const ang=Number.isFinite(a)?a:Math.random()*6.283;
    if(this.treeHidden&&this.treeHidden[t._i])return;(this._wob||(this._wob=[])).push({t:0,L,i:t._i,x:t.x,y:this.gY(t.x,t.y),z:t.y,ax:-Math.sin(ang),az:Math.cos(ang)})};
  // tree i falls along angle a: its instances leave the forest, an exact instanced copy (same geometry, textured material
  // and tint) tips over from the foot, lands with dust and leaves, rests, then sinks; a cut stump stays behind
  P.treeFell=function(t,a){const L=this.treeAll&&this.treeAll[t._i]||[];const x=t.ox,z=t.oy,gy=this.gY(x,z),cr=t.cr||60,th=(t.v===2?70:t.v===5?54:t.v===6?44:t.v===1?40:38)*(t.h||1);
    if(this._wob)this._wob=this._wob.filter(w=>w.L!==L);
    const ang=Number.isFinite(a)?a:0,root=new T.Group(),pivot=new T.Group();root.position.set(x,gy,z);root.rotation.y=-ang;root.add(pivot);this.scene.add(root);root.updateMatrixWorld(true);
    const inv=M5.copy(pivot.matrixWorld).invert(),ch=new Set();let trunk=null;
    for(const [im,idx] of L){const o=idx*16,B=im.userData.base,A=im.instanceMatrix.array;baseOf(im,idx);if(M4.elements[15]===0)continue;
      if(!trunk){trunk={im,idx,m:M4.clone()}}
      const c=new T.InstancedMesh(im.geometry,im.material,1);c.setMatrixAt(0,M4.premultiply(im.matrixWorld).premultiply(inv));
      if(im.instanceColor){C0.fromArray(im.instanceColor.array,idx*3);c.setColorAt(0,C0)}
      c.castShadow=im.castShadow;c.receiveShadow=true;c.frustumCulled=false;c.userData.fellCopy=1;pivot.add(c);
      for(let j=0;j<16;j++){A[o+j]=0;if(B)B[o+j]=0}ch.add(im)}
    for(const im of ch)im.instanceMatrix.needsUpdate=true;
    if(this.treeHidden&&t._i!==undefined)this.treeHidden[t._i]=0;
    if(trunk)try{this.treeStump(trunk,x,gy,z,t)}catch(e){}
    (this._fell||(this._fell=[])).push({root,pivot,t:0,cr,th,x,z,a:ang,gy});
    if(this.pe&&this.pfxApi){const A=this.pfxApi;A.shards({x,y:gy+30,z},this.hi?26:12,'#c8a070','#6a4a2a',360,{size:1});A.smoke({x,y:gy,z},this.hi?10:5,'#6a5a48',40,{a:.4,size:1.2});
      for(let i=0;i<(this.hi?40:18);i++)this.pe({x:x+rand(-cr,cr),y:gy+th+cr*rand(.2,1.4),z:z+rand(-cr,cr),vx:rand(-80,80),vy:rand(0,90),vz:rand(-80,80),g:110,drag:1,life:rand(1.4,2.6),s0:rand(6,11),s1:4,rs:rand(-6,6),kind:4,c:CAN[t.v]||'#5a8a3c',c2:'#3a5a2a'})}
    if(this.v3Debris)this.v3Debris({x,y:z,r:20,n:this.hi?8:4,c:'#6a4a32',size:6,up:300,speed:200})};
  // stumps: one instanced pool per trunk material (bark / birch), plus a pale cut face; they stay until the next world
  P.treeStump=function(tr,x,gy,z,t){if(tr.im.geometry.type!=='CylinderGeometry')return;const S=this._stumps||(this._stumps=new Map()),key=tr.im.material.uuid;let p=S.get(key);
    if(!p){const cap=1024,body=new T.InstancedMesh(tr.im.geometry,tr.im.material,cap),cut=new T.InstancedMesh(this.G.cyl,this.cached('stump-cut',()=>{const m=new T.MeshStandardMaterial({color:'#d8b88a',roughness:.85,metalness:0});return this.fow?this.fow(m,{key:'stumpcut'}):m}),cap);
      for(const m of[body,cut]){m.count=0;m.castShadow=!!this.hi;m.receiveShadow=true;m.frustumCulled=false;this.scene.add(m)}p={body,cut,n:0};S.set(key,p)}
    if(p.n>=1024)return;tr.m.decompose(V0,Q0,S0);const h=Math.max(10,Math.min(20,S0.y*.22)),r=S0.x*1.04,i=p.n++;
    M4.compose(V1.set(x,gy+h/2-2,z),Q0,S0.set(r,h,r));p.body.setMatrixAt(i,M4);if(tr.im.instanceColor){C0.fromArray(tr.im.instanceColor.array,tr.idx*3);p.body.setColorAt(i,C0);p.body.instanceColor.needsUpdate=true}
    M4.compose(V1.set(x,gy+h-1.5,z),Q0.identity(),S0.set(r*.64,1.6,r*.64));p.cut.setMatrixAt(i,M4);
    p.body.count=p.cut.count=p.n;p.body.instanceMatrix.needsUpdate=p.cut.instanceMatrix.needsUpdate=true};
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r=_fx.call(this,Tm,dt,me,L);try{dt=Math.min(.1,dt||0);
      if(this._wob&&this._wob.length){const ch=new Set();for(let k=this._wob.length-1;k>=0;k--){const w=this._wob[k];w.t+=dt;const done=w.t>=.7,amp=done?0:.075*Math.exp(-w.t*4.5)*Math.sin(w.t*24);
          M5.makeTranslation(w.x,w.y,w.z).multiply(new T.Matrix4().makeRotationAxis(V0.set(w.ax,0,w.az),amp)).multiply(new T.Matrix4().makeTranslation(-w.x,-w.y,-w.z));
          if(this.treeHidden&&this.treeHidden[w.i]){this._wob.splice(k,1);continue}for(const [im,idx] of w.L){const B=im.userData.base;if(!B||B[idx*16+15]===0)continue;M4.fromArray(B,idx*16).premultiply(M5);M4.toArray(im.instanceMatrix.array,idx*16);ch.add(im)}
          if(done)this._wob.splice(k,1)}for(const im of ch)im.instanceMatrix.needsUpdate=true}
      if(this._fell&&this._fell.length){
      for(let k=this._fell.length-1;k>=0;k--){const f=this._fell[k];f.t+=dt;const fall=Math.min(1,f.t/1.05),e=fall*fall*fall;
        // tips over (accelerating), a small bounce on landing, then rests on the ground
        const land=f.t>1.05?Math.exp(-(f.t-1.05)*7)*Math.sin((f.t-1.05)*18)*.05:0;f.pivot.rotation.z=-(e*1.48)+land;
        if(fall>=1&&!f.landed){f.landed=1;const hx=f.x+Math.cos(f.a)*(f.th+f.cr),hz=f.z+Math.sin(f.a)*(f.th+f.cr);
          if(this.pfxApi){const A=this.pfxApi;A.smoke({x:hx,y:this.gY(hx,hz),z:hz},this.hi?14:6,'#7a6a52',f.cr*.9,{a:.4,size:1.4});A.smoke({x:(f.x+hx)/2,y:f.gy,z:(f.z+hz)/2},this.hi?8:4,'#6a5a48',f.cr*.7,{a:.3,size:1.2})}
          if(this.pe)for(let i=0;i<(this.hi?30:12);i++)this.pe({x:hx+rand(-f.cr,f.cr),y:this.gY(hx,hz)+rand(10,60),z:hz+rand(-f.cr,f.cr),vx:rand(-90,90),vy:rand(20,120),vz:rand(-90,90),g:120,drag:1.1,life:rand(1.2,2.4),s0:rand(6,10),s1:4,rs:rand(-6,6),kind:4,c:'#5a8a3c',c2:'#3a5a2a'});
          if(typeof shakeA!=='undefined'&&this.shakeNear)this.shakeNear(f.x,f.z,4)}
        if(f.t>6.5)f.root.position.y-=dt*28;if(f.t>8.5){this.scene.remove(f.root);f.root.traverse(o=>{if(o.isInstancedMesh)o.dispose()});this._fell.splice(k,1)}}}}catch(e){if(!this._treeErr){this._treeErr=1;console.warn('trees fx',e)}}return r};
})();
