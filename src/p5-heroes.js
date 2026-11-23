// ===================== PHASE 5 · CELESTIAL ARMORY: rigged class heroes (render only) =====================
// Five Meshy class characters (auto-rig + 6 clips each) replace the hero model by WEAPON FAMILY — combat, skills,
// hitboxes and snapshots are untouched (owner chose "change with weapon" 2026-11-17):
//   sword / axe / greatsword -> Warrior · dagger -> Assassin · bow / crossbow -> Archer · fire / frost / storm -> Mage · fused -> Summoner
// The heroes ride on the Quaternius hero hooks (o.qn) so the frame loop, death and outline code keep working;
// whenever a class GLB is missing the old hero model is used.
(function(){if(typeof R3==='undefined'||typeof CURSED==='undefined'||!CURSED)return;const T=THREE,R=R3;
// 2026-11-21: the Archer is the owner's Celestial Archer, and the owner's Celestial Mage plays both the Mage and the Summoner (one file)
const P5={warrior:'p5-warrior',assassin:'p5-assassin',archer:'p5-archer',mage:'p5-mage',summoner:'p5-mage'};
const P5C={order:['idle','run','attack','cast','dodge','death'],idle:/Combat_Stance|idle/i,run:/Run/i,attack:/Slash|Combo|Shot|Soell|mage_|Attack/i,cast:/Charged|Spin|Spell_Cast/i,dodge:/Roll|Dodge/i,death:/Dead|Death/i};
const P5H=138;   // hero height in world units (Quaternius heroes are ~140)
const CA=()=>window.CelestialAssets;
// the Spirit Tome (summoner.js) is the Summoner; a fused weapon keeps the class of the weapon it was forged on
// owner 2026-11-23: a hero without a weapon is an ordinary villager (the Quaternius peasant in r8.js) until the first weapon is picked up
const p5Class=u=>{let k=u&&u.wk;if(!k)return null;if(typeof FUSED!=='undefined'&&FUSED[k])k=FUSED[k].base||k;
  return k==='soul'?'summoner':k==='dagger'?'assassin':k==='bow'||k==='xbow'?'archer':k==='fire'||k==='frost'||k==='storm'?'mage':'warrior'};
R.p5Ready=function(cls){if(!cls)return false;const A=CA(),a=A&&A.get(P5[cls]);return !!(a&&a.state==='loaded'&&a.inspection&&a.inspection.skinned&&a.gltf.animations.length>=4&&window.AR_GLTF&&AR_GLTF.SkeletonUtils)};
const p5Clips=a=>{if(a._p5)return a._p5;const list=a.gltf.animations,used=new Set(),out={};
  // in place: every clip's hips keep the IDLE clip's ground position (a clip's own first frame can already be a metre off)
  const hipT=c=>c&&c.tracks.find(t=>/\.position$/.test(t.name)&&/hips|pelvis|root/i.test(t.name)),ref=hipT(list.find(c=>/Combat_Stance|idle/i.test(c.name))||list[0]);
  const rx=ref?ref.values[0]:0,rz=ref?ref.values[2]:0;
  const inPlace=c=>{const k=c.clone();const t=hipT(k);if(t){const v=t.values;for(let i=0;i<v.length;i+=3){v[i]=rx;v[i+2]=rz}}return k};
  // clips arrive in the order they were ordered from Meshy; names confirm the slot when they can
  P5C.order.forEach((key,i)=>{let c=list[i];if(!c||!P5C[key].test(c.name)){const m=list.find(x=>!used.has(x)&&P5C[key].test(x.name));if(m)c=m}if(c&&!used.has(c)){used.add(c);out[key]=inPlace(c)}});
  return a._p5=out};
// ---- object ----
R.p5Hero=function(u){const cls=p5Class(u);if(!this.p5Ready(cls))return null;const a=CA().get(P5[cls]);
  const model=AR_GLTF.SkeletonUtils.clone(a.gltf.scene);model.rotation.y+=a.config.rotationY||0;model.updateMatrixWorld(true);
  const bb=new T.Box3().setFromObject(model,true),sz=bb.getSize(new T.Vector3()),sc=P5H/Math.max(1e-4,sz.y),pivot=new T.Group();pivot.scale.setScalar(sc);pivot.add(model);
  pivot.position.set(-(bb.min.x+bb.max.x)*sc/2,-bb.min.y*sc,-(bb.min.z+bb.max.z)*sc/2);
  const o={kind:'qn',qn:1,p5:1,cls,u,at:u.at,wk:'?',wt:-9,model,pivot,ov:null,lastAtk:0,lastCast:0,lastHurt:0,act:{},bones:{},
    lx:u.x,ly:u.y,rot:Math.atan2(u.fx,u.fy),walk:0,mvK:0,atkPh:0};   // the fields the base objFor fills in for every unit
  o.root=new T.Group();o.body=new T.Group();o.root.add(o.body);o.body.add(pivot);
  model.traverse(n=>{if(n.isBone)o.bones[n.name]=n;if(n.isMesh){n.castShadow=!!this.hi;n.receiveShadow=true;n.frustumCulled=false;
    if(this.fow){const paint=src=>this.cached('p5-'+src.uuid,()=>{const m=src.clone();if(m.isMeshStandardMaterial){m.envMap=this.envTex||null;m.envMapIntensity=.55}return this.fow(m,{key:'p5'})});n.material=Array.isArray(n.material)?n.material.map(paint):paint(n.material)}}});
  // Mixamo rigs (the owner's heroes) name the chest and neck bones differently from Meshy's auto-rig; the bow pose asks for these
  for(const [a,b] of[['Spine2','Spine02'],['Spine1','Spine01'],['Neck','neck']])if(o.bones[a]&&!o.bones[b])o.bones[b]=o.bones[a];
  // stand on the ring: centre the hips (not the bounding box, which arms and capes pull sideways)
  o.handR=o.bones.RightHand||null;o.handL=o.bones.LeftHand||null;
  o.mixer=new T.AnimationMixer(model);const clips=p5Clips(a);for(const k in clips)o.act[k]=o.mixer.clipAction(clips[k]);
  if(o.act.idle)o.act.idle.play();if(o.act.run){o.act.run.play();o.act.run.setEffectiveWeight(0)}
  if(o.bones.Hips){o.mixer.update(0);pivot.updateMatrixWorld(true);const h=new T.Vector3();o.bones.Hips.getWorldPosition(h);pivot.position.x-=h.x;pivot.position.z-=h.z}   // centre the idle pose's hips on the ring
  try{this.p5Arm(o,u)}catch(e){}this.addStatus(o,u);this.scene.add(o.root);this.objs.set(u.id,o);return o};
// the game's own weapon model goes into the rigged hand: its long side is turned onto the hand's +Z (checked on the Eclipse rigs)
// ---- Celestial Armory weapons (Meshy, 2026-11-18): one model per class and rarity band ----
// tiers 0–1 (ธรรมดา/หายาก) -> normal · 2 (มหากาพย์) -> epic · 3–4 (ตำนาน/SSR) -> legendary
// up = grip->tip axis in the GLB, g = grip point along it (0 = pommel end), len = world length (hero is 138 tall)
const P5W={warrior:['w0-ironblade','w1-bloodcrest','w2-solar-justice'],assassin:['a0-shadow-fang','a1-night-veil','a2-eclipse-twin'],
  archer:['b0-hunter-bow','b1-windleaf','b2-lunar-longbow'],axe:['x0-molten-axe','x0-molten-axe','x0-molten-axe'],mage:['m0-apprentice-staff','m1-arcane-staff','m2-astral-nexus'],summoner:['s0-spirit-orb','s1-soul-tome','s2-genesis-grimoire']};
const P5WS={'w0-ironblade':{up:[0,-1,0],g:.1,len:96},'w1-bloodcrest':{up:[-1,0,0],g:.1,len:100},'w2-solar-justice':{up:[-1,0,0],g:.1,len:106},
  'a0-shadow-fang':{up:[-1,0,0],g:.15,len:40},'a1-night-veil':{up:[0,1,0],g:.15,len:42},'a2-eclipse-twin':{up:[-1,0,0],g:.15,len:46},
  'x0-molten-axe':{up:[0,1,0],g:.17,len:96},
  'b0-hunter-bow':{up:[1,0,0],g:.5,len:92,str:{c:[0,-.026,0],l:.93,r:.0028}},'b1-windleaf':{up:[1,0,0],g:.5,len:96},'b2-lunar-longbow':{up:[0,1,0],g:.5,gx:.12,len:100},
  'm0-apprentice-staff':{up:[0,1,0],g:.36,len:128},'m1-arcane-staff':{up:[0,1,0],g:.36,len:134},'m2-astral-nexus':{up:[0,1,0],g:.36,len:140},
  's0-spirit-orb':{up:[0,1,0],g:.5,len:22,orb:1},'s1-soul-tome':{up:[0,1,0],g:.5,len:24,orb:1},'s2-genesis-grimoire':{up:[0,1,0],g:.5,len:27,orb:1}};
const P5WG={warrior:['#cfe0ff','#ff4a5a','#ffd890'],assassin:['#c8c8ff','#b46bff','#d878ff'],archer:['#e8c890','#7dff9a','#bfe4ff'],axe:['#ff7a2a','#ff6a1a','#ff8a3a'],mage:['#9fe0ff','#c080ff','#7ab0ff'],summoner:['#7fe8ff','#b46bff','#d8b0ff']};
const p5WBand=t=>t>=3?2:t===2?1:0;
R.p5WKey=function(cls,t){const L=P5W[cls];return L?L[p5WBand(t)]:null};
// weapon family -> model set. The axe uses the owner's Molten Inferno Axe at every tier (2026-11-18); the crossbow keeps the game's own
const P5FAM={axe:'axe',sword:'warrior',gsword:'warrior',dagger:'assassin',bow:'archer',fire:'mage',frost:'mage',storm:'mage',soul:'summoner'};
const p5Fam=wk=>{if(!wk)return null;const b=typeof FUSED!=='undefined'&&FUSED[wk]?FUSED[wk].base:wk;return P5FAM[b]||null};
R.p5WKeyFor=function(wk,t){const f=p5Fam(wk);return f?P5W[f][p5WBand(Math.min(4,Math.max(0,t|0)))]:null};
// where a fist closes on each rig: palm centre (hand-bone space, from the skin weights) and the across-the-palm axis toward
// the thumb (the line a held handle follows). Measured from the packed p5-*.glb skins; see HANDOFF 2026-11-18.
// The Warrior is the owner's Celestial Warrior since 2026-11-20 (Mixamo rig, metres): its PCA fails (the palm is as wide as it is
// long), so the axis is the knuckle line pinky1 -> index1 and the point sits 3 cm toward the wrist and 2 cm toward the palm (the palm
// faces the ground in the bind pose) from the knuckles' middle.
const P5GRIP={warrior:{R:{p:[-.0157,.0908,.0033],d:[.577,.052,.816]},L:{p:[.0157,.0898,.0033],d:[-.577,.052,.816]}},
  assassin:{R:{p:[-.67,9.24,-.19],d:[-.648,.192,.737]},L:{p:[.62,9.21,.33],d:[.671,.059,.739]}},
  // the owner's Celestial Archer and Celestial Mage (2026-11-21, Mixamo, metres) the same way; the Mage's hand is smaller, so the
  // point sits a quarter of the knuckle distance toward the wrist and 1.7 cm toward the palm
  archer:{R:{p:[-.0191,.0951,.0076],d:[.631,.168,.758]},L:{p:[.0194,.0904,.0067],d:[-.623,.22,.75]}},
  mage:{R:{p:[-.0129,.08,-.0092],d:[-.285,.172,.943]},L:{p:[.0129,.0741,-.0094],d:[.275,.208,.939]}},
  summoner:{R:{p:[-.0129,.08,-.0092],d:[-.285,.172,.943]},L:{p:[.0129,.0741,-.0094],d:[.275,.208,.939]}}};
const p5Grip=(o,hand)=>{const G=P5GRIP[o.cls]||P5GRIP.warrior;return hand===o.handL?G.L:G.R};
// fit a weapon group into the fist: grip point on the palm centre, handle along the fist axis
// A bow needs its whole frame, not just the handle line: limbs along the fist axis (thumb end up), the back of the riser
// (model -X after p5WModel: every bow GLB bulges that way, tips and string sit at +X) pointing out past the knuckles the way
// the fingers point (hand +Y = toward the target), string toward the archer, flat side against the palm.
const p5Fist=(g,o,hand,bow)=>{const G=p5Grip(o,hand),d=new T.Vector3().fromArray(G.d).normalize();
  if(bow){const f=new T.Vector3(0,1,0).addScaledVector(d,-d.y).normalize(),x=f.clone().negate(),z=new T.Vector3().crossVectors(x,d);
    g.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,d,z))}
  else g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d);
  g.position.fromArray(G.p)};
R.p5WReady=function(k){const A=CA(),a=k&&A&&A.get('p5w-'+k);return !!(a&&a.state==='loaded'&&a.gltf)};
// grip at the origin, tip along +Y, scaled to its world length
R.p5WModel=function(k){if(!this.p5WReady(k))return null;const S=P5WS[k],a=CA().get('p5w-'+k),m=a.gltf.scene.clone(true);
  m.traverse(n=>{if(!n.isMesh)return;n.castShadow=!!this.hi;n.frustumCulled=false;
    if(this.fow){const paint=src=>this.cached('p5w-'+src.uuid,()=>{const c=src.clone();if(c.isMeshStandardMaterial){c.envMap=this.envTex||null;c.envMapIntensity=.9}return this.fow(c,{key:'p5'})});n.material=Array.isArray(n.material)?n.material.map(paint):paint(n.material)}});
  const al=new T.Group();al.quaternion.setFromUnitVectors(new T.Vector3().fromArray(S.up),new T.Vector3(0,1,0));al.add(m);
  if(S.str){const s=new T.Mesh(this.G.cyl,this.cached('p5w-string',()=>{const c=new T.MeshStandardMaterial({color:'#efe4c8',roughness:.6});return this.fow?this.fow(c,{key:'p5'}):c}));   // the Hunter Bow was generated without a string
    s.position.fromArray(S.str.c);s.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3().fromArray(S.up));s.scale.set(S.str.r,S.str.l,S.str.r);m.add(s)}
  al.updateMatrixWorld(true);
  const bb=new T.Box3().setFromObject(al),L=bb.max.y-bb.min.y,gy=bb.min.y+L*S.g,gx=S.gx!==undefined?bb.min.x+(bb.max.x-bb.min.x)*S.gx:(bb.min.x+bb.max.x)/2;
  al.position.set(-gx,-gy,-(bb.min.z+bb.max.z)/2);const w=new T.Group();w.add(al);w.scale.setScalar(S.len/Math.max(1e-6,L));
  const tip=new T.Object3D();tip.position.y=(bb.max.y-gy)*.9;w.add(tip);w.userData.tip=tip;return w};
R.p5WDrop=function(k){const S=P5WS[k],w=this.p5WModel(k),g=new T.Group(),L=S.len,sc=S.orb?1.7:Math.min(1,84/L);
  w.scale.multiplyScalar(sc);w.position.y=-(L*sc)*(.5-S.g);g.add(w);g.userData.tip=w.userData.tip;return g};
{const _io=R.itemObj;R.itemObj=function(it){if(it&&it.k==='w'){const k=this.p5WKeyFor(it.wk,it.tier);if(k&&this.p5WReady(k)){const _w=this.weapon;this.weapon=()=>this.p5WDrop(k);
  try{return _io.call(this,it)}finally{this.weapon=_w}}}return _io.apply(this,arguments)}}
R.p5Arm=function(o,u){for(const w of[o.wpnR,o.wpnL,o.focus])if(w&&w.parent)w.parent.remove(w);o.wpnR=o.wpnL=o.wtip=o.focus=null;o.wk=u.wk;o.wt=u.wt;o.lgK=null;o.p5wWait=null;o.p5w=0;o.bowP=0;if(o.arrow)o.arrow.visible=false;
  if(!u.wk||!o.handR)return;const t=Math.min(4,Math.max(0,u.wt|0)),bk=typeof FUSED!=='undefined'&&FUSED[u.wk]?FUSED[u.wk].base:u.wk,bow=bk==='bow'||bk==='xbow',dual=bk==='dagger';
  o.bowP=bk==='bow'&&!!(o.handL&&o.bones.LeftForeArm&&o.bones.RightArm&&o.bones.Spine02);if(o.bT===undefined)o.bT=9;
  const wk=this.p5WKeyFor(u.wk,t),fam=p5Fam(u.wk);
  if(wk&&this.p5WReady(wk)){const S=P5WS[wk];o.p5w=1;o.wglowC=P5WG[fam][p5WBand(t)];
    if(S.orb){const f=this.p5WModel(wk);o.focus=f;o.wtip=f.userData.tip;o.root.add(f);return}   // the summoner's focus floats above the off hand
    const mount=hand=>{const w=this.p5WModel(wk),g=new T.Group();p5Fist(g,o,hand,bow);g.add(w);   // the handle (or a bow's grip) runs through the closed fist
      o.pivot.updateMatrixWorld(true);const ws=new T.Vector3();hand.getWorldScale(ws);g.scale.setScalar(1/Math.max(1e-6,ws.x));hand.add(g);if(!o.wtip)o.wtip=w.userData.tip;return g};
    if(bow&&o.handL)o.wpnL=mount(o.handL);else o.wpnR=mount(o.handR);if(dual&&o.handL)o.wpnL=mount(o.handL);return}
  if(wk)o.p5wWait=wk;   // the Meshy weapon is still loading: show the game's own model until it is in
  if(!this.weapon)return;
  const W=WEAPONS[u.wk],mk=W&&W.fused?(W.base||'fire'):u.wk;   // fused weapons show their base family
  const make=hand=>{const w=this.weapon(mk,t);w.updateMatrixWorld(true);const bb=new T.Box3().setFromObject(w);if(bb.isEmpty())return null;
    const ext=[[bb.min.x,bb.max.x],[bb.min.y,bb.max.y],[bb.min.z,bb.max.z]];let ax=0,len=0;ext.forEach((e,i)=>{if(e[1]-e[0]>len){len=e[1]-e[0];ax=i}});
    const e=ext[ax],dir=new T.Vector3();dir.setComponent(ax,Math.abs(e[1])>=Math.abs(e[0])?1:-1);
    const g=new T.Group(),al=new T.Group();al.quaternion.setFromUnitVectors(dir,new T.Vector3(0,1,0));al.add(w);g.add(al);p5Fist(g,o,hand,false);
    o.pivot.updateMatrixWorld(true);const ws=new T.Vector3();hand.getWorldScale(ws);g.scale.setScalar(1/Math.max(1e-6,ws.x));hand.add(g);
    if(w.userData.tip&&!o.wtip)o.wtip=w.userData.tip;o.wglow=w.userData.glow||null;return g};
  if(bow&&o.handL)o.wpnL=make(o.handL);else o.wpnR=make(o.handR);
  if(dual&&o.handL)o.wpnL=make(o.handL)};
// ---- the archer's bow arm (procedural, on top of the clips; 2026-11-18) ----
// Carry: idle/run keep the bow low at the left side, limbs tilted forward, string toward the body (Combat_Stance held the fist
// in front of the belly, so the bow stood across the torso and face). Shot / bow skill: chest turns side-on, the left arm goes
// straight at the target with the bow upright, the right hand comes back to the chin with a nocked arrow, looses and follows
// through, then re-draws while the archer keeps shooting. Everything is solved in the model's own space (faces +Z, left +X).
{const V=T.Vector3,Q=T.Quaternion,F=new V(0,0,1),U=new V(0,1,0),L=new V(1,0,0),Y=new V(0,1,0);
  const q0=new Q(),q1=new Q(),q2=new Q(),q3=new Q(),mqi=new Q(),v0=new V(),v1=new V(),v2=new V(),v3=new V();
  const msQ=(b,out)=>{b.getWorldQuaternion(out);return out.premultiply(mqi)};
  // turn bone b (blend w) so that its +Y (toward its child) points along model-space D
  const aim=(b,D,w)=>{if(!b||w<=0)return;const pq=msQ(b.parent,q0),cur=q1.copy(pq).multiply(b.quaternion);v0.copy(Y).applyQuaternion(cur);
    q2.setFromUnitVectors(v0,v3.copy(D).normalize()).multiply(cur);q2.premultiply(pq.invert());b.quaternion.slerp(q2,Math.min(1,w));b.updateMatrixWorld(true)};
  // twist bone b about its own +Y so its local axis ax lies toward model-space want
  const roll=(b,ax,want,w)=>{if(!b||w<=0)return;const pq=msQ(b.parent,q0),cur=q1.copy(pq).multiply(b.quaternion);v0.copy(Y).applyQuaternion(cur);
    v1.copy(ax).applyQuaternion(cur);v1.addScaledVector(v0,-v1.dot(v0));v2.copy(want).addScaledVector(v0,-want.dot(v0));
    if(v1.lengthSq()<1e-4||v2.lengthSq()<1e-4)return;v1.normalize();v2.normalize();q2.setFromUnitVectors(v1,v2).multiply(cur);q2.premultiply(pq.invert());b.quaternion.slerp(q2,Math.min(1,w));b.updateMatrixWorld(true)};
  const yaw=(b,a,w)=>{if(!b||w<=0)return;const pq=msQ(b.parent,q0),cur=q1.copy(pq).multiply(b.quaternion);q2.setFromAxisAngle(U,a).multiply(cur);q2.premultiply(pq.invert());b.quaternion.slerp(q2,Math.min(1,w));b.updateMatrixWorld(true)};
  const pos=(o,b,out)=>o.model.worldToLocal(b.getWorldPosition(out));
  const ease=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
  R.p5BowPose=function(o,u,dt){const B=o.bones,M=o.model;if(!B.LeftArm||!B.LeftForeArm||!B.RightArm||!B.RightForeArm||!B.RightHand)return;
    o.bT=(o.bT||0)+dt;if(!o.root.visible)return;const busy=u.dash||u.dead||o.dying||u.spinT>0;
    const want=busy?0:o.bT<1.15?1:0;o.bAim=clamp((o.bAim||0)+(want-(o.bAim||0))*Math.min(1,dt*(want?16:5)),0,1);
    const carry=busy?0:(1-o.bAim)*(1-.3*(o.mvK||0));
    M.updateMatrixWorld(true);M.getWorldQuaternion(mqi).invert();
    const G=p5Grip(o,o.handL),thumb=new V().fromArray(G.d).normalize();
    if(carry>.01){   // bow low at the side, tilted forward
      aim(B.LeftArm,v3.set(.2,-1,.22),carry*.9);aim(B.LeftForeArm,new V(.12,-.55,.8),carry);aim(o.handL,new V(.08,-.18,1),carry);roll(o.handL,thumb,U,carry)}
    const w=ease(o.bAim);let H=null;
    if(w>.01){
      // side-on chest (shoulder line turned to point back from the target, a little open), head back onto the target;
      // measured from the clip's own pose, which already stands half-turned in Combat_Stance and square in Run
      const ls=pos(o,B.LeftArm,v1),rs=pos(o,B.RightArm,v2);let tw=Math.atan2(-.25,-1)-Math.atan2(rs.x-ls.x,rs.z-ls.z);tw=Math.atan2(Math.sin(tw),Math.cos(tw));tw=clamp(tw,-1.7,.7)*w;
      yaw(B.Spine02,tw*.5,1);if(B.Spine01)yaw(B.Spine01,tw*.5,1);if(B.neck)yaw(B.neck,-tw*.55,1);if(B.Head)yaw(B.Head,-tw*.4,1);
      // bow arm straight at the target, bow upright (a slight cant), string toward the archer
      const D=new V(0,.12,1).normalize();aim(B.LeftArm,D,w);aim(B.LeftForeArm,D,w);aim(o.handL,D,w);roll(o.handL,thumb,new V(.12,1,0),w);
      // draw hand: anchor at the chin on the arrow line, loose, follow through, re-draw
      const lh=pos(o,o.handL,new V()),hd=B.Head?pos(o,B.Head,new V()):lh.clone().add(new V(0,.3,-.5));
      const A=new V(hd.x-.065,hd.y+.01,hd.z+.06);   // right cheek / corner of the jaw
      const ready=A.clone().addScaledVector(D,.32),rel=A.clone().addScaledVector(D,-.08).addScaledVector(L,-.07).addScaledVector(U,.02);
      const t=o.bT;H=t<.1?ready.clone().lerp(A,ease(t/.1)):t<.2?A.clone().lerp(rel,ease((t-.1)/.1)):t<.55?rel.clone():t<.9?rel.clone().lerp(ready,ease((t-.55)/.35)):ready.clone();
      // two-bone IK, elbow back and out at shoulder height
      const S=pos(o,B.RightArm,new V()),E0=pos(o,B.RightForeArm,new V()),W0=pos(o,B.RightHand,new V()),a=S.distanceTo(E0),b=E0.distanceTo(W0);
      const d=H.clone().sub(S);let c=d.length();c=clamp(c,Math.abs(a-b)+1e-3,a+b-1e-3);d.normalize();
      const pole=new V(-.35,.05,-1).addScaledVector(d,-new V(-.35,.05,-1).dot(d)).normalize(),ca=(a*a+c*c-b*b)/(2*a*c),sa=Math.sqrt(Math.max(0,1-ca*ca));
      const E=S.clone().addScaledVector(d,a*ca).addScaledVector(pole,a*sa);
      aim(B.RightArm,E.clone().sub(S),w);aim(B.RightForeArm,H.clone().sub(pos(o,B.RightForeArm,v1)),w);aim(B.RightHand,new V(.15,0,1),w*.7)}
    // nocked arrow while drawn
    const show=w>.6&&(o.bT<.1||o.bT>.62);
    if(show&&!o.arrow){const g=new T.Group(),sh=this.cached('p5-arrow-shaft',()=>{const m=new T.MeshStandardMaterial({color:'#8a6a48',roughness:.7});return this.fow?this.fow(m,{key:'p5'}):m}),
        hd=this.cached('p5-arrow-head',()=>{const m=new T.MeshStandardMaterial({color:'#cfd6e0',metalness:.8,roughness:.3});return this.fow?this.fow(m,{key:'p5'}):m});
      for(const [geo,mat,y,r,l] of[[this.G.cyl,sh,.5,.006,1],[this.G.cone,hd,1.03,.016,.06],[this.G.cone,sh,.06,.018,.1]]){const m=new T.Mesh(geo,mat);m.position.y=y;m.scale.set(r,l,r);m.castShadow=false;g.add(m)}
      M.add(g);o.arrow=g}
    if(o.arrow){o.arrow.visible=show;if(show&&H){const lh=pos(o,o.handL,v2),dir=v1.copy(lh).sub(H),len=dir.length()+.14;dir.normalize();
      o.arrow.position.copy(pos(o,B.RightHand,v3)).lerp(H,.5);o.arrow.quaternion.setFromUnitVectors(Y,dir);o.arrow.scale.set(1,len,1)}}}}
// ---- hooks ----
const _of=R.objFor;R.objFor=function(u){if(u.hero&&!this.objs.get(u.id)){try{const o=this.p5Hero(u);if(o)return o}catch(e){if(!this._p5Err){this._p5Err=1;console.warn('p5 hero',e)}}}return _of.call(this,u)};
const _qa=R.qnAnim;R.qnAnim=function(o,u,Tm,dt,mv){
  // a hero still on the old model swaps as soon as its class model is in; a class change (new weapon family) rebuilds
  if(u.hero&&!o.mob&&!o.zom&&(o.p5?p5Class(u)!==o.cls:this.p5Ready(p5Class(u)))&&!o.swap){o.swap=1;this.scene.remove(o.root);this.objs.delete(u.id);return}
  if(!o.p5)return _qa.call(this,o,u,Tm,dt,mv);
  if(o.dying){o.dying=false;o.mixer.stopAllAction();o.ov=null;if(o.act.idle)o.act.idle.reset().play();if(o.act.run)o.act.run.reset().play()}
  if(o.wk!==u.wk||o.wt!==u.wt||o.p5wWait&&this.p5WReady(o.p5wWait))try{this.p5Arm(o,u)}catch(e){o.wk=u.wk;o.wt=u.wt;o.p5wWait=null}
  const play=(k,ts)=>{const a=o.act[k];if(!a)return;if(o.ov&&o.ov!==a)o.ov.fadeOut(.12);a.reset().setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.timeScale=ts;a.setEffectiveWeight(1).fadeIn(.09).play();o.ov=a;o.ovT=a.getClip().duration/ts};
  if(u.dash&&!o.dashOn){o.dashOn=1;play('dodge',2.6)}else if(!u.dash)o.dashOn=0;
  // a bow shot is drawn by p5BowPose (the Meshy "Side_Shot" clip held the bow flat at the hip, body turned away)
  if(u.atkAnim>o.lastAtk+.05&&!(u.spinT>0)){if(o.bowP)o.bT=0;else play('attack',o.cls==='warrior'?1.65:o.cls==='assassin'?1.95:1.5)}
  else if(u.castAnim>o.lastCast+.05){if(o.bowP)o.bT=0;else play('cast',1.5)}
  o.lastAtk=u.atkAnim||0;o.lastCast=u.castAnim||0;
  let ow=0;if(o.ov){o.ovT-=dt;ow=clamp(o.ovT/.12,0,1);if(o.ovT<=0){o.ov.fadeOut(.12);o.ov=null;ow=0}}
  const k=o.mvK;if(o.act.idle)o.act.idle.setEffectiveWeight((1-k)*(1-ow));if(o.act.run){o.act.run.setEffectiveWeight(k*(1-ow));o.act.run.timeScale=clamp((mv||0)/260,.7,1.5)}
  o.mixer.update(dt);
  if(o.bowP)try{this.p5BowPose(o,u,dt)}catch(e){if(!this._p5BowErr){this._p5BowErr=1;console.warn('p5 bow',e)}}
  if(o.focus&&o.handL){o.root.updateMatrixWorld(true);o.handL.getWorldPosition(this.v);o.root.worldToLocal(this.v);const f=o.focus,c=u.castAnim>0?1:0;
    f.position.set(this.v.x*1.35,this.v.y+8+c*18+Math.sin(Tm*2.2)*4,this.v.z+14);f.rotation.y+=dt*(c?4:1.1)}
  let by=0;if(u.spinT>0||u.lotusT>0)o.body.rotation.y=(o.body.rotation.y+dt*(u.spinT>0?22:26))%(Math.PI*2);else o.body.rotation.y=0;
  if(u.leap){if(o.leapT===undefined||o.leapT<0)o.leapT=0;o.leapT+=dt;by+=Math.sin(Math.PI*Math.min(1,o.leapT/.55))*140}else o.leapT=-1;
  o.body.rotation.x=u.kb?-.25:0;o.body.position.y=by;
  if(o.wtip&&(u.castAnim>0||u.atkAnim>0)&&Math.random()<.5){o.wtip.getWorldPosition(this.v);this.sp(true,{x:this.v.x,y:this.v.y,z:this.v.z,vy:30,l:.35,s:22,s1:4,c:o.wglowC&&o.p5w?o.wglowC:FUSED[u.wk]?FUSED[u.wk].glow:u.wk==='fire'?'#ffb050':u.wk==='storm'?'#d8c8ff':'#bfefff',sp:u.wk==='fire'?3:4})}};
const _qd=R.qnDie;R.qnDie=function(o,dt){if(!o.p5)return _qd.call(this,o,dt);
  if(!o.dying){o.dying=true;o.ov=null;o.mixer.stopAllAction();const d=o.act.death;if(d){d.reset().setLoop(T.LoopOnce,1);d.clampWhenFinished=true;d.play();o.dieT=d.getClip().duration+.6}else o.dieT=1.4}
  o.dieT-=dt;o.mixer.update(dt);o.root.visible=o.dieT>0};
// the frame loop hides a hero the frame it dies, before the 'die' event: start the death clip while it was just on screen
const _fx=R.effects;R.effects=function(Tm,dt,me,L){const r=_fx.apply(this,arguments);
  try{for(const u of units){if(!u.hero||!u.dead)continue;const o=this.objs.get(u.id);if(o&&o.p5&&!o.dying&&!(o.dieT>0)&&o.seen&&performance.now()-o.seen<400){o.root.visible=true;this.qnDie(o,0)}}
    for(const u of units){if(!u.hero||u.dead)continue;const o=this.objs.get(u.id);if(o&&o.p5&&o.root.visible)o.seen=performance.now()}}catch(e){}
  return r};
window.P5_CLASS=p5Class;
})();
