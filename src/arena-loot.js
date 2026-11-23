// ===================== TREASURE CHESTS · bigger, gilded and sparkling (Arena Royale, owner 2026-11-23) =====================
// Owner: "ปรับรูปแบบและขนาดของกล่องสมบัติที่เปิดให้สวยงามและใหญ่ขึ้นมีแสงวับวาว"
// Replaces R3.buildBoxes / R3.stepBoxes (r3.js): a half-barrel lid, gold bands and corner posts, a lock plate with a glowing gem,
// a warm glow on the ground and star glints around every chest that is still shut; opening one with loot throws a pillar of gold
// light, a flare and a fountain of sparks, and the inside glows for a few seconds. Render only — the chests' positions, collision
// (radius 26 in a.js) and opening (b.js openBox) are the game's.
(function(){if(typeof R3==='undefined'||typeof THREE==='undefined')return;const T=THREE,R=R3;
const CW=54,CH=28,CD=36,LR=CD/2,OPEN=1.95;
R.buildBoxes=function(){const B=WD.boxes||[];this.boxLid=null;this.chest=null;if(!B.length)return;const n=B.length;
  const wood=this.tstd('planks','#8c4b24',.78,0),dark=this.std('#1c120c',.95,0),gold=this.std('#e8b846',.3,.85),
    gem=this.std('#8ff4ff',.2,.1,{emissive:'#36d6ff',emissiveIntensity:1.8});
  const box=(w,h,d,x,y,z)=>{const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);return g};
  const barrel=(r,len,x,z)=>{const g=new T.CylinderGeometry(r,r,len,18,1,false,0,Math.PI);g.rotateZ(Math.PI/2);g.translate(x,0,z);return g};
  const xs=[-CW*.3,CW*.3],corners=[[-1,-1],[1,-1],[-1,1],[1,1]];
  // body (local +Z faces the door / the front), static
  const gBody=box(CW,CH,CD,0,CH/2,0),gIn=box(CW-7,1,CD-7,0,CH+.05,0),
    gGold=this.merge([box(CW+2.4,3.4,CD+2.4,0,1.7,0),box(CW+1.4,2.6,CD+1.4,0,CH-1.3,0),...xs.map(x=>box(4.2,CH,CD+1.6,x,CH/2,0)),
      ...corners.map(([a,b])=>box(3.6,CH+.6,3.6,a*CW/2,CH/2,b*CD/2)),box(10,12,1.8,0,CH-8,CD/2+.9)]),
    gGem=(()=>{const g=new T.BoxGeometry(4.6,4.6,4.6);g.rotateX(Math.PI/4);g.rotateZ(Math.PI/4);g.translate(0,CH-8,CD/2+2.4);return g})();
  // lid in hinge space: hinge along the back top edge, the half barrel reaches forward to z = CD
  const gLid=barrel(LR,CW,0,LR),gLidG=this.merge([...xs.map(x=>barrel(LR+1.1,4.4,x,LR)),barrel(LR+.9,2.4,-CW/2+1.2,LR),barrel(LR+.9,2.4,CW/2-1.2,LR),box(CW+1,2,2.2,0,1,CD),box(8,9,1.8,0,-2.5,CD+1)]);
  const mk=(g,m,cast,ro)=>{const im=new T.InstancedMesh(g,m,n);im.frustumCulled=false;im.castShadow=!!cast&&!!this.hi;im.receiveShadow=true;if(ro)im.renderOrder=ro;this.scene.add(im);return im};
  const glowM=new T.MeshBasicMaterial({map:this.tex('wglow'),color:'#ffc451',transparent:true,opacity:.5,depthWrite:false,blending:T.AdditiveBlending});
  const innM=new T.MeshBasicMaterial({map:this.tex('wglow'),color:'#ffe08a',transparent:true,opacity:.95,depthWrite:false,blending:T.AdditiveBlending});
  for(const m of[glowM,innM])m.userData.ownMat=1;
  const gGlow=new T.PlaneGeometry(1,1);gGlow.rotateX(-Math.PI/2);
  const C={n,k:new Float32Array(n),set:new Float32Array(n).fill(-1),okT:new Float32Array(n).fill(-99),P:[],Q:[],t:0,
    body:mk(gBody,wood,true),inner:mk(gIn,dark),trim:mk(gGold,gold,true),gem:mk(gGem,gem),lid:mk(gLid,wood,true),lidG:mk(gLidG,gold,true),
    glow:mk(gGlow,glowM,false,2),inn:mk(gGlow,innM,false,3),glowM,innM};
  const M=new T.Matrix4(),Y=new T.Vector3(0,1,0),S1=new T.Vector3(1,1,1);
  B.forEach((b,i)=>{const y=this.gY(b.x,b.y),P=new T.Vector3(b.x,y,b.y),Q=new T.Quaternion().setFromAxisAngle(Y,Math.PI/2-b.a);C.P.push(P);C.Q.push(Q);
    M.compose(P,Q,S1);for(const im of[C.body,C.inner,C.trim,C.gem])im.setMatrixAt(i,M)});
  for(const im of[C.body,C.inner,C.trim,C.gem])im.instanceMatrix.needsUpdate=true;
  this.chest=C;this.boxLid=C.lid;this.stepBoxes(0,true)};
R.stepBoxes=function(dt,force){const C=this.chest;if(!C)return;C.t+=dt;const M=new T.Matrix4(),H=new T.Matrix4().makeTranslation(0,CH,-CD/2),Rx=new T.Matrix4(),S=new T.Vector3(),V=new T.Vector3();
  let lid=false,glow=false,inn=false;
  for(let i=0;i<C.n;i++){const b=boxes[i],want=b&&b.open?1:0;let k=C.k[i];k=force?want:k+(want-k)*Math.min(1,dt*6);C.k[i]=k;
    if(force||Math.abs(k-C.set[i])>.002){C.set[i]=k;M.compose(C.P[i],C.Q[i],S.set(1,1,1)).multiply(H).multiply(Rx.makeRotationX(-OPEN*k));C.lid.setMatrixAt(i,M);C.lidG.setMatrixAt(i,M);lid=true;
      const g=(1-k)*175;M.compose(V.copy(C.P[i]).setY(C.P[i].y+1.2),C.Q[i],S.set(Math.max(.001,g),1,Math.max(.001,g)));C.glow.setMatrixAt(i,M);glow=true}
    const ot=C.t-C.okT[i];if(ot>=0&&ot<6||force){const f=ot>=0&&ot<6?Math.min(1,ot*3)*Math.min(1,(6-ot)/2.5):0;M.compose(V.copy(C.P[i]).setY(C.P[i].y+CH+1.5),C.Q[i],S.set(Math.max(.001,(CW-4)*f*1.5),1,Math.max(.001,(CD-4)*f*1.5)));C.inn.setMatrixAt(i,M);inn=true}}
  if(lid){C.lid.instanceMatrix.needsUpdate=true;C.lidG.instanceMatrix.needsUpdate=true}if(glow)C.glow.instanceMatrix.needsUpdate=true;if(inn)C.inn.instanceMatrix.needsUpdate=true;
  C.glowM.opacity=.46+.16*Math.sin(C.t*2.3);
  // star glints on the shut chests near the camera
  if(!force&&dt>0&&this.sp){const cx=this.tx||0,cz=this.ty||0,rate=this.hi?4.2:2.2;
    for(let i=0;i<C.n;i++){if(C.k[i]>.5)continue;const P=C.P[i];if(Math.abs(P.x-cx)>1500||Math.abs(P.z-cz)>1300||Math.random()>dt*rate)continue;
      const a=Math.random()*6.283,r=Math.random();this.sp(true,{x:P.x+Math.cos(a)*CW*.55*r,y:P.y+8+Math.random()*44,z:P.z+Math.sin(a)*CD*.6*r,vy:rand(6,24),l:rand(.55,1.1),s:rand(16,30),s1:0,c:Math.random()<.75?'#ffe7a0':'#bff4ff',sp:1,vr:rand(-2,2),dr:2})}}};
// opening: a chest with loot throws gold light and sparks and glows inside for a while; an empty one only puffs dust (r4.js)
{const _d=R.doFx;R.doFx=function(e,me,L){const r=_d.apply(this,arguments);
  if(e&&e.k==='box'&&e.ok&&this.chest){try{const C=this.chest,i=e.id|0;if(i>=0&&i<C.n)C.okT[i]=C.t;const P=C.P[i]||{x:e.x,y:this.gY(e.x,e.y),z:e.y},y=P.y+CH;
    if(this.pillar)this.pillar(e.x,e.y,300,'#ffd35a',1.2);if(this.flare)this.flare(e.x,y+30,e.y,320,'#fff0b0',.45);
    for(let k=0;k<(this.hi?34:18);k++)this.sp(true,{x:e.x+rand(-16,16),y:y+4,z:e.y+rand(-12,12),vx:rand(-70,70),vy:rand(170,340),vz:rand(-70,70),l:rand(.8,1.5),s:rand(11,20),s1:2,c:Math.random()<.7?'#ffe27a':'#fff8e0',sp:1,g:280,dr:1.1})}catch(err){}}
  return r}}
})();
