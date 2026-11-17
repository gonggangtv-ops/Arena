// ===================== PHASE 5 · CELESTIAL ARMORY: rigged class heroes (render only) =====================
// Five Meshy class characters (auto-rig + 6 clips each) replace the hero model by WEAPON FAMILY — combat, skills,
// hitboxes and snapshots are untouched (owner chose "change with weapon" 2026-11-17):
//   sword / axe / greatsword -> Warrior · dagger -> Assassin · bow / crossbow -> Archer · fire / frost / storm -> Mage · fused -> Summoner
// The heroes ride on the Quaternius hero hooks (o.qn) so the frame loop, death and outline code keep working;
// whenever a class GLB is missing the old hero model is used.
(function(){if(typeof R3==='undefined'||typeof CURSED==='undefined'||!CURSED)return;const T=THREE,R=R3;
const P5={warrior:'p5-warrior',assassin:'p5-assassin',archer:'p5-archer',mage:'p5-mage',summoner:'p5-summoner'};
const P5C={order:['idle','run','attack','cast','dodge','death'],idle:/Combat_Stance|idle/i,run:/Run/i,attack:/Slash|Combo|Shot|Soell|mage_|Attack/i,cast:/Charged|Spin|Spell_Cast/i,dodge:/Roll|Dodge/i,death:/Dead|Death/i};
const P5H=138;   // hero height in world units (Quaternius heroes are ~140)
const CA=()=>window.CelestialAssets;
const p5Class=u=>{const k=u&&u.wk;if(!k)return'warrior';if(typeof FUSED!=='undefined'&&FUSED[k])return'summoner';
  return k==='dagger'?'assassin':k==='bow'||k==='xbow'?'archer':k==='fire'||k==='frost'||k==='storm'?'mage':'warrior'};
R.p5Ready=function(cls){const A=CA(),a=A&&A.get(P5[cls]);return !!(a&&a.state==='loaded'&&a.inspection&&a.inspection.skinned&&a.gltf.animations.length>=4&&window.AR_GLTF&&AR_GLTF.SkeletonUtils)};
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
  archer:['b0-hunter-bow','b1-windleaf','b2-lunar-longbow'],mage:['m0-apprentice-staff','m1-arcane-staff','m2-astral-nexus'],summoner:['s0-spirit-orb','s1-soul-tome','s2-genesis-grimoire']};
const P5WS={'w0-ironblade':{up:[0,-1,0],g:.1,len:96},'w1-bloodcrest':{up:[-1,0,0],g:.1,len:100},'w2-solar-justice':{up:[-1,0,0],g:.1,len:106},
  'a0-shadow-fang':{up:[-1,0,0],g:.15,len:40},'a1-night-veil':{up:[0,1,0],g:.15,len:42},'a2-eclipse-twin':{up:[-1,0,0],g:.15,len:46},
  'b0-hunter-bow':{up:[1,0,0],g:.5,len:92},'b1-windleaf':{up:[1,0,0],g:.5,len:96},'b2-lunar-longbow':{up:[0,1,0],g:.5,gx:.12,len:100},
  'm0-apprentice-staff':{up:[0,1,0],g:.36,len:128},'m1-arcane-staff':{up:[0,1,0],g:.36,len:134},'m2-astral-nexus':{up:[0,1,0],g:.36,len:140},
  's0-spirit-orb':{up:[0,1,0],g:.5,len:22,orb:1},'s1-soul-tome':{up:[0,1,0],g:.5,len:24,orb:1},'s2-genesis-grimoire':{up:[0,1,0],g:.5,len:27,orb:1}};
const P5WG={warrior:['#cfe0ff','#ff4a5a','#ffd890'],assassin:['#c8c8ff','#b46bff','#d878ff'],archer:['#e8c890','#7dff9a','#bfe4ff'],mage:['#9fe0ff','#c080ff','#7ab0ff'],summoner:['#7fe8ff','#b46bff','#d8b0ff']};
const p5WBand=t=>t>=3?2:t===2?1:0;
R.p5WKey=function(cls,t){const L=P5W[cls];return L?L[p5WBand(t)]:null};
R.p5WReady=function(k){const A=CA(),a=k&&A&&A.get('p5w-'+k);return !!(a&&a.state==='loaded'&&a.gltf)};
// grip at the origin, tip along +Y, scaled to its world length
R.p5WModel=function(k){if(!this.p5WReady(k))return null;const S=P5WS[k],a=CA().get('p5w-'+k),m=a.gltf.scene.clone(true);
  m.traverse(n=>{if(!n.isMesh)return;n.castShadow=!!this.hi;n.frustumCulled=false;
    if(this.fow){const paint=src=>this.cached('p5w-'+src.uuid,()=>{const c=src.clone();if(c.isMeshStandardMaterial){c.envMap=this.envTex||null;c.envMapIntensity=.9}return this.fow(c,{key:'p5'})});n.material=Array.isArray(n.material)?n.material.map(paint):paint(n.material)}});
  const al=new T.Group();al.quaternion.setFromUnitVectors(new T.Vector3().fromArray(S.up),new T.Vector3(0,1,0));al.add(m);al.updateMatrixWorld(true);
  const bb=new T.Box3().setFromObject(al),L=bb.max.y-bb.min.y,gy=bb.min.y+L*S.g,gx=S.gx!==undefined?bb.min.x+(bb.max.x-bb.min.x)*S.gx:(bb.min.x+bb.max.x)/2;
  al.position.set(-gx,-gy,-(bb.min.z+bb.max.z)/2);const w=new T.Group();w.add(al);w.scale.setScalar(S.len/Math.max(1e-6,L));
  const tip=new T.Object3D();tip.position.y=(bb.max.y-gy)*.9;w.add(tip);w.userData.tip=tip;return w};
R.p5Arm=function(o,u){for(const w of[o.wpnR,o.wpnL,o.focus])if(w&&w.parent)w.parent.remove(w);o.wpnR=o.wpnL=o.wtip=o.focus=null;o.wk=u.wk;o.wt=u.wt;o.lgK=null;o.p5wWait=null;o.p5w=0;
  if(!u.wk||!o.handR)return;const t=Math.min(4,Math.max(0,u.wt|0)),bow=u.wk==='bow'||u.wk==='xbow',dual=u.wk==='dagger';
  const wk=this.p5WKey(o.cls,t);
  if(wk&&this.p5WReady(wk)){const S=P5WS[wk];o.p5w=1;o.wglowC=P5WG[o.cls][p5WBand(t)];
    if(S.orb){const f=this.p5WModel(wk);o.focus=f;o.wtip=f.userData.tip;o.root.add(f);return}   // the summoner's focus floats above the off hand
    const mount=hand=>{const w=this.p5WModel(wk),g=new T.Group();g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(0,0,1));if(bow)g.rotateY(Math.PI/2);g.add(w);   // a bow grip sits in the fist like a hilt; its string faces the archer
      o.pivot.updateMatrixWorld(true);const ws=new T.Vector3();hand.getWorldScale(ws);g.scale.setScalar(1/Math.max(1e-6,ws.x));hand.add(g);if(!o.wtip)o.wtip=w.userData.tip;return g};
    if(bow&&o.handL)o.wpnL=mount(o.handL);else o.wpnR=mount(o.handR);if(dual&&o.handL)o.wpnL=mount(o.handL);return}
  if(wk)o.p5wWait=wk;   // the Meshy weapon is still loading: show the game's own model until it is in
  if(!this.weapon)return;
  const W=WEAPONS[u.wk],mk=W&&W.fused?(W.base||'fire'):u.wk;   // fused weapons show their base family
  const make=hand=>{const w=this.weapon(mk,t);w.updateMatrixWorld(true);const bb=new T.Box3().setFromObject(w);if(bb.isEmpty())return null;
    const ext=[[bb.min.x,bb.max.x],[bb.min.y,bb.max.y],[bb.min.z,bb.max.z]];let ax=0,len=0;ext.forEach((e,i)=>{if(e[1]-e[0]>len){len=e[1]-e[0];ax=i}});
    const e=ext[ax],dir=new T.Vector3();dir.setComponent(ax,Math.abs(e[1])>=Math.abs(e[0])?1:-1);
    const g=new T.Group(),al=new T.Group();al.quaternion.setFromUnitVectors(dir,bow?new T.Vector3(0,1,0):new T.Vector3(0,0,1));al.add(w);g.add(al);
    o.pivot.updateMatrixWorld(true);const ws=new T.Vector3();hand.getWorldScale(ws);g.scale.setScalar(1/Math.max(1e-6,ws.x));hand.add(g);
    if(w.userData.tip&&!o.wtip)o.wtip=w.userData.tip;o.wglow=w.userData.glow||null;return g};
  if(bow&&o.handL)o.wpnL=make(o.handL);else o.wpnR=make(o.handR);
  if(dual&&o.handL)o.wpnL=make(o.handL)};
// ---- hooks ----
const _of=R.objFor;R.objFor=function(u){if(u.hero&&!this.objs.get(u.id)){try{const o=this.p5Hero(u);if(o)return o}catch(e){if(!this._p5Err){this._p5Err=1;console.warn('p5 hero',e)}}}return _of.call(this,u)};
const _qa=R.qnAnim;R.qnAnim=function(o,u,Tm,dt,mv){
  // a hero still on the old model swaps as soon as its class model is in; a class change (new weapon family) rebuilds
  if(u.hero&&!o.mob&&!o.zom&&(o.p5?p5Class(u)!==o.cls:this.p5Ready(p5Class(u)))&&!o.swap){o.swap=1;this.scene.remove(o.root);this.objs.delete(u.id);return}
  if(!o.p5)return _qa.call(this,o,u,Tm,dt,mv);
  if(o.dying){o.dying=false;o.mixer.stopAllAction();o.ov=null;if(o.act.idle)o.act.idle.reset().play();if(o.act.run)o.act.run.reset().play()}
  if(o.wk!==u.wk||o.wt!==u.wt||o.p5wWait&&this.p5WReady(o.p5wWait))try{this.p5Arm(o,u)}catch(e){o.wk=u.wk;o.wt=u.wt;o.p5wWait=null}
  const play=(k,ts)=>{const a=o.act[k];if(!a)return;if(o.ov&&o.ov!==a)o.ov.fadeOut(.08);a.reset().setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.timeScale=ts;a.setEffectiveWeight(1).fadeIn(.06).play();o.ov=a;o.ovT=a.getClip().duration/ts};
  if(u.dash&&!o.dashOn){o.dashOn=1;play('dodge',2.6)}else if(!u.dash)o.dashOn=0;
  if(u.atkAnim>o.lastAtk+.05&&!(u.spinT>0))play('attack',o.cls==='warrior'?1.9:o.cls==='assassin'?2.2:1.7);
  else if(u.castAnim>o.lastCast+.05)play('cast',1.5);
  o.lastAtk=u.atkAnim||0;o.lastCast=u.castAnim||0;
  let ow=0;if(o.ov){o.ovT-=dt;ow=clamp(o.ovT/.12,0,1);if(o.ovT<=0){o.ov.fadeOut(.12);o.ov=null;ow=0}}
  const k=o.mvK;if(o.act.idle)o.act.idle.setEffectiveWeight((1-k)*(1-ow));if(o.act.run){o.act.run.setEffectiveWeight(k*(1-ow));o.act.run.timeScale=clamp((mv||0)/260,.7,1.5)}
  o.mixer.update(dt);
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
