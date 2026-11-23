// ===================== TREASURE CHESTS · bigger, gilded and sparkling (Arena Royale, owner 2026-11-23) =====================
// Owner: "ปรับรูปแบบและขนาดของกล่องสมบัติที่เปิดให้สวยงามและใหญ่ขึ้นมีแสงวับวาว"
// Replaces R3.buildBoxes / R3.stepBoxes (r3.js): a half-barrel lid, gold bands and corner posts, a lock plate with a glowing gem,
// a warm glow on the ground and star glints around every chest that is still shut; opening one with loot throws a pillar of gold
// light, a flare and a fountain of sparks, and the inside glows for a few seconds. Render only — the chests' positions, collision
// (radius 26 in a.js) and opening (b.js openBox) are the game's.
// Owner, later the same day: "ไฟล์3 เปลี่ยนโมเดล กล่องธรรมดา · ไฟล์ที่4 โมเดลขวดเลือด · ไฟล์5 โมเดลมานา"
//  · every ordinary chest (houses, castle, dungeon rooms, the fort gate) is the owner's Enchanted Sentinel chest ('chest-eye'): its
//    mesh is cut at the lid seam when the world is built, so the lid still swings open on its back hinge; a cold rune-blue glow
//  · the gilded chest above now marks the treasure chests that never come up empty (b.js openBox): the dungeon warden's vault
//    (a.js vault:1), behind the Snow Queen (vault:2) and the old city's temple (vault:3)
//  · health and mana potions lying on the ground are the owner's vials ('potion-hp', 'potion-mana') instead of the emoji sprite
(function(){if(typeof R3==='undefined'||typeof THREE==='undefined')return;const T=THREE,R=R3,A=()=>window.CelestialAssets;
const CW=54,CH=28,CD=36,LR=CD/2,OPEN=1.95;
const EYE={W:58,SEAM:.62,OPEN:1.7};
const loaded=k=>{const a=A()&&A().get(k);return !!(a&&a.state==='loaded'&&a.inspection&&a.inspection.size)};
const box=(w,h,d,x,y,z)=>{const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);return g};
const barrel=(r,len,x,z)=>{const g=new T.CylinderGeometry(r,r,len,18,1,false,0,Math.PI);g.rotateZ(Math.PI/2);g.translate(x,0,z);return g};
// shared by both kinds: the glow on the ground of a shut chest and the light inside an opened one
function glowKit(R,n,col){const glowM=new T.MeshBasicMaterial({map:R.tex('wglow'),color:col,transparent:true,opacity:.5,depthWrite:false,blending:T.AdditiveBlending}),
    innM=new T.MeshBasicMaterial({map:R.tex('wglow'),color:'#ffe08a',transparent:true,opacity:.95,depthWrite:false,blending:T.AdditiveBlending});
  for(const m of[glowM,innM])m.userData.ownMat=1;const g=new T.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);
  const mk=(m,ro)=>{const im=new T.InstancedMesh(g,m,n);im.frustumCulled=false;im.renderOrder=ro;R.scene.add(im);return im};
  return{glow:mk(glowM,2),inn:mk(innM,3),glowM,innM}}
// the gilded treasure chest (procedural), over the boxes in ids
function kitGild(R,ids){const n=ids.length;
  const wood=R.tstd('planks','#8c4b24',.78,0),dark=R.std('#1c120c',.95,0),gold=R.std('#e8b846',.3,.85),
    gem=R.std('#8ff4ff',.2,.1,{emissive:'#36d6ff',emissiveIntensity:1.8});
  const xs=[-CW*.3,CW*.3],corners=[[-1,-1],[1,-1],[-1,1],[1,1]];
  // body (local +Z faces the door / the front), static
  const gBody=box(CW,CH,CD,0,CH/2,0),gIn=box(CW-7,1,CD-7,0,CH+.05,0),
    gGold=R.merge([box(CW+2.4,3.4,CD+2.4,0,1.7,0),box(CW+1.4,2.6,CD+1.4,0,CH-1.3,0),...xs.map(x=>box(4.2,CH,CD+1.6,x,CH/2,0)),
      ...corners.map(([a,b])=>box(3.6,CH+.6,3.6,a*CW/2,CH/2,b*CD/2)),box(10,12,1.8,0,CH-8,CD/2+.9)]),
    gGem=(()=>{const g=new T.BoxGeometry(4.6,4.6,4.6);g.rotateX(Math.PI/4);g.rotateZ(Math.PI/4);g.translate(0,CH-8,CD/2+2.4);return g})();
  // lid in hinge space: hinge along the back top edge, the half barrel reaches forward to z = CD
  const gLid=barrel(LR,CW,0,LR),gLidG=R.merge([...xs.map(x=>barrel(LR+1.1,4.4,x,LR)),barrel(LR+.9,2.4,-CW/2+1.2,LR),barrel(LR+.9,2.4,CW/2-1.2,LR),box(CW+1,2,2.2,0,1,CD),box(8,9,1.8,0,-2.5,CD+1)]);
  const mk=(g,m,cast)=>{const im=new T.InstancedMesh(g,m,n);im.frustumCulled=false;im.castShadow=!!cast&&!!R.hi;im.receiveShadow=true;R.scene.add(im);return im};
  const C=Object.assign({kind:'gild',ids,n,H:CH,inW:CW-4,inD:CD-4,glowW:175,k:new Float32Array(n),set:new Float32Array(n).fill(-1),okT:new Float32Array(n).fill(-99),P:[],Q:[],
    body:mk(gBody,wood,true),inner:mk(gIn,dark),trim:mk(gGold,gold,true),gem:mk(gGem,gem),lid:[mk(gLid,wood,true),mk(gLidG,gold,true)]},glowKit(R,n,'#ffc451'));
  const M=new T.Matrix4(),Y=new T.Vector3(0,1,0),S1=new T.Vector3(1,1,1);
  ids.forEach((id,j)=>{const b=WD.boxes[id],y=R.gY(b.x,b.y),P=new T.Vector3(b.x,y,b.y),Q=new T.Quaternion().setFromAxisAngle(Y,Math.PI/2-b.a);C.P.push(P);C.Q.push(Q);
    M.compose(P,Q,S1);for(const im of[C.body,C.inner,C.trim,C.gem])im.setMatrixAt(j,M)});
  for(const im of[C.body,C.inner,C.trim,C.gem])im.instanceMatrix.needsUpdate=true;
  const H=new T.Matrix4().makeTranslation(0,CH,-CD/2),Rx=new T.Matrix4();
  C.lidM=(j,k,out)=>out.compose(C.P[j],C.Q[j],S1).multiply(H).multiply(Rx.makeRotationX(-OPEN*k));
  return C}
// the owner's chest: body and lid cut apart at the seam (triangles above it swing with the lid)
const splitCache=new WeakMap();
function splitLid(geo,seam){let s=splitCache.get(geo);if(s)return s;const idx=geo.index?geo.index.array:null,pos=geo.attributes.position,lidI=[],bodyI=[];
  const n=idx?idx.length:pos.count;for(let t=0;t<n;t+=3){const a=idx?idx[t]:t,b=idx?idx[t+1]:t+1,c=idx?idx[t+2]:t+2;(((pos.getY(a)+pos.getY(b)+pos.getY(c))/3>seam)?lidI:bodyI).push(a,b,c)}
  const body=geo.clone(),lid=geo.clone();body.setIndex(bodyI);lid.setIndex(lidI);s={body,lid};splitCache.set(geo,s);return s}
function kitEye(R,ids){const parts=R.celestialAsset('chest-eye');if(!parts)return null;const sz=A().get('chest-eye').inspection.size,k=EYE.W/sz[0],W=EYE.W,H=sz[1]*k,D=sz[2]*k,n=ids.length;
  const mk=(g,m)=>{const im=new T.InstancedMesh(g,m,n);im.frustumCulled=false;im.castShadow=!!R.hi;im.receiveShadow=true;R.scene.add(im);return im};
  const body=[],lid=[];for(const p of parts){const s=splitLid(p.geo,EYE.SEAM);body.push(mk(s.body,p.mat));lid.push(mk(s.lid,p.mat))}
  const C=Object.assign({kind:'eye',ids,n,H:H*EYE.SEAM,inW:W*.8,inD:D*.75,glowW:150,k:new Float32Array(n),set:new Float32Array(n).fill(-1),okT:new Float32Array(n).fill(-99),P:[],Q:[],body,lid},glowKit(R,n,'#59d8ff'));
  const M=new T.Matrix4(),Y=new T.Vector3(0,1,0),S=new T.Vector3(W,H,D);
  ids.forEach((id,j)=>{const b=WD.boxes[id],y=R.gY(b.x,b.y),P=new T.Vector3(b.x,y-1,b.y),Q=new T.Quaternion().setFromAxisAngle(Y,Math.PI/2-b.a);C.P.push(P);C.Q.push(Q);
    M.compose(P,Q,S);for(const im of body)im.setMatrixAt(j,M)});for(const im of body)im.instanceMatrix.needsUpdate=true;
  // hinge on the back edge of the seam, in the chest's own (scaled) space, so the lid turns without shearing
  const Hm=new T.Matrix4().makeTranslation(0,EYE.SEAM*H,-D/2),Hi=new T.Matrix4().makeTranslation(0,-EYE.SEAM*H,D/2),Rx=new T.Matrix4(),Sm=new T.Matrix4().makeScale(W,H,D),I1=new T.Vector3(1,1,1);
  C.lidM=(j,k,out)=>out.compose(C.P[j],C.Q[j],I1).multiply(Hm).multiply(Rx.makeRotationX(-EYE.OPEN*k)).multiply(Hi).multiply(Sm);
  return C}
R.buildBoxes=function(){const B=WD.boxes||[];this.boxLid=null;this.chest=null;this.chests=[];this.chestAt=new Map();if(!B.length)return;
  const eyeOn=loaded('chest-eye'),gild=[],eye=[];B.forEach((b,i)=>(b.vault||!eyeOn?gild:eye).push(i));
  if(gild.length)this.chests.push(kitGild(this,gild));if(eye.length){const K=kitEye(this,eye);if(K)this.chests.push(K);else for(const i of eye)gild.push(i)}
  for(const C of this.chests)C.ids.forEach((id,j)=>this.chestAt.set(id,[C,j]));
  this.chest=this.chests[0]||null;this.boxLid=this.chest&&this.chest.lid[0];this.stepBoxes(0,true)};
R.stepBoxes=function(dt,force){const Ks=this.chests;if(!Ks||!Ks.length)return;const M=new T.Matrix4(),S=new T.Vector3(),V=new T.Vector3();
  for(const C of Ks){C.t=(C.t||0)+dt;let lid=false,glow=false,inn=false;
    for(let j=0;j<C.n;j++){const b=boxes[C.ids[j]],want=b&&b.open?1:0;let k=C.k[j];k=force?want:k+(want-k)*Math.min(1,dt*6);C.k[j]=k;
      if(force||Math.abs(k-C.set[j])>.002){C.set[j]=k;C.lidM(j,k,M);for(const im of C.lid)im.setMatrixAt(j,M);lid=true;
        const g=(1-k)*C.glowW;M.compose(V.copy(C.P[j]).setY(C.P[j].y+1.2),C.Q[j],S.set(Math.max(.001,g),1,Math.max(.001,g)));C.glow.setMatrixAt(j,M);glow=true}
      const ot=C.t-C.okT[j];if(ot>=0&&ot<6||force){const f=ot>=0&&ot<6?Math.min(1,ot*3)*Math.min(1,(6-ot)/2.5):0;M.compose(V.copy(C.P[j]).setY(C.P[j].y+C.H+1.5),C.Q[j],S.set(Math.max(.001,C.inW*f*1.5),1,Math.max(.001,C.inD*f*1.5)));C.inn.setMatrixAt(j,M);inn=true}}
    if(lid)for(const im of C.lid)im.instanceMatrix.needsUpdate=true;if(glow)C.glow.instanceMatrix.needsUpdate=true;if(inn)C.inn.instanceMatrix.needsUpdate=true;
    C.glowM.opacity=(C.kind==='eye'?.34:.46)+.16*Math.sin(C.t*2.3);
    // star glints on the shut chests near the camera
    if(!force&&dt>0&&this.sp){const cx=this.tx||0,cz=this.ty||0,rate=(this.hi?4.2:2.2)*(C.kind==='eye'?.6:1);
      for(let j=0;j<C.n;j++){if(C.k[j]>.5)continue;const P=C.P[j];if(Math.abs(P.x-cx)>1500||Math.abs(P.z-cz)>1300||Math.random()>dt*rate)continue;
        const a=Math.random()*6.283,r=Math.random();this.sp(true,{x:P.x+Math.cos(a)*C.inW*.6*r,y:P.y+8+Math.random()*44,z:P.z+Math.sin(a)*C.inD*.7*r,vy:rand(6,24),l:rand(.55,1.1),s:rand(16,30),s1:0,
          c:C.kind==='eye'?(Math.random()<.7?'#bff4ff':'#ffffff'):(Math.random()<.75?'#ffe7a0':'#bff4ff'),sp:1,vr:rand(-2,2),dr:2})}}}};
// opening: a chest with loot throws gold light and sparks and glows inside for a while; an empty one only puffs dust (r4.js)
{const _d=R.doFx;R.doFx=function(e,me,L){const r=_d.apply(this,arguments);
  if(e&&e.k==='box'&&e.ok&&this.chestAt){try{const q=this.chestAt.get(e.id|0),C=q&&q[0],j=q?q[1]:-1;if(C)C.okT[j]=C.t||0;const P=C?C.P[j]:{x:e.x,y:this.gY(e.x,e.y),z:e.y},y=P.y+(C?C.H:CH);
    const vault=C&&C.kind==='gild'&&WD.boxes[e.id|0]&&WD.boxes[e.id|0].vault;
    if(this.pillar)this.pillar(e.x,e.y,vault?380:300,'#ffd35a',vault?1.6:1.2);if(this.flare)this.flare(e.x,y+30,e.y,320,'#fff0b0',.45);
    for(let k=0;k<(this.hi?34:18)*(vault?1.5:1);k++)this.sp(true,{x:e.x+rand(-16,16),y:y+4,z:e.y+rand(-12,12),vx:rand(-70,70),vy:rand(170,340),vz:rand(-70,70),l:rand(.8,1.5),s:rand(11,20),s1:2,c:Math.random()<.7?'#ffe27a':'#fff8e0',sp:1,g:280,dr:1.1})}catch(err){}}
  return r}}
// ---- the potions on the ground: the owner's vials (health = Inferno Vial, mana = the blue flask) ----
const POT={hp:{key:'potion-hp',H:30,c:'#ff3f58',g:'#ff6a7a'},mp:{key:'potion-mana',H:30,c:'#3f9bff',g:'#6ab0ff'}};
// owner 2026-11-23 (later): "ทำเอฟเฟกเรืองแสง ให้ขวด เลือดกับ มานาหน่อย มันมองยาก" — the vial lights itself (its own texture as
// emissive), a soft halo of its colour hangs round it, a glow lies on the ground under it — the three breathing together — and
// small motes drift up from it
const potMats=new Map(),potFx={halo:{},floor:{}};
const potMat=(m,pk)=>{let c=potMats.get(m);if(!c){c=m.clone();if(c.emissive){if(c.map){c.emissive.set('#ffffff');c.emissiveMap=c.map;c.emissiveIntensity=.6}else{c.emissive.set(POT[pk].c);c.emissiveIntensity=.45}}
  potMats.set(m,c)}return c};
const potHalo=(R,pk)=>potFx.halo[pk]||(potFx.halo[pk]=new T.SpriteMaterial({map:R.tex('wglow'),color:new T.Color(POT[pk].c).multiplyScalar(R.post?1.7:1.2),transparent:true,opacity:.6,
  depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
const potFloor=(R,pk)=>potFx.floor[pk]||(potFx.floor[pk]=new T.MeshBasicMaterial({map:R.tex('wglow'),color:new T.Color(POT[pk].g).multiplyScalar(R.post?1.4:1.1),transparent:true,opacity:.5,
  depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
const potKind=it=>it.k==='p'?(it.b===0||it.b===undefined?'hp':it.b===1?'mp':null):it.k==='i'?(it.it==='potion'?'hp':it.it==='mana'?'mp':null):null;
{const _io=R.itemObj;R.itemObj=function(it){const pk=potKind(it),D=pk&&POT[pk];if(!D||!loaded(D.key))return _io.apply(this,arguments);
  try{const parts=this.celestialAsset(D.key);if(!parts)return _io.apply(this,arguments);const sz=A().get(D.key).inspection.size,k=D.H/sz[1];
    const g=new T.Group(),hold=new T.Group();g.add(hold);for(const p of parts){const m=new T.Mesh(p.geo,potMat(p.mat,pk));m.scale.set(sz[0]*k,D.H,sz[2]*k);m.position.y=6;m.castShadow=!!this.hi;hold.add(m)}
    const halo=new T.Sprite(potHalo(this,pk));halo.scale.set(64,64,1);halo.position.y=6+D.H*.48;halo.renderOrder=6;hold.add(halo);
    this.planeG=this.planeG||new T.PlaneGeometry(1,1);const fl=new T.Mesh(this.planeG,potFloor(this,pk));fl.rotation.x=-Math.PI/2;fl.position.y=1.5;fl.scale.set(74,74,1);fl.renderOrder=2;g.add(fl);
    g.userData.spin=hold;g.userData.potK=pk;
    g.position.set(it.x,this.gY(it.x,it.y),it.y);this.scene.add(g);return g}catch(e){return _io.apply(this,arguments)}}}
{const _fx=R.fxExtra;R.fxExtra=function(Tm,dt,me,L){const r=_fx.apply(this,arguments);try{this._potT=(this._potT||0)+(dt||0);const k=.5+.5*Math.sin(this._potT*3.1);
  for(const pk in potFx.halo)potFx.halo[pk].opacity=.42+.28*k;for(const pk in potFx.floor)potFx.floor[pk].opacity=.32+.22*k;
  if(dt>0&&this.sp&&this.itemObjs)for(const g of this.itemObjs.values()){const pk=g.userData.potK;if(!pk||!g.visible||Math.random()>dt*2.4)continue;const q=g.position;
    this.sp(true,{x:q.x+rand(-10,10),y:q.y+rand(10,30),z:q.z+rand(-10,10),vy:rand(20,38),l:rand(.7,1.1),s:rand(5,8),s1:1.5,c:POT[pk].c,sp:1})}}catch(e){}return r}}
})();
