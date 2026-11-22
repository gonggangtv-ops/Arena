// ===================== ECLIPSE REIGN: rendering (Overlord / Sentinel / Construct, legendary weapons, combat VFX, boss HUD) =====================
// The three Meshy creatures arrive as STATIC textured meshes (no skeleton, no clips). They are moved procedurally here
// (hover, lean, lunge, rise-and-slam, block, stagger) and fall back to the stone golem builder until their GLB is loaded.
// VFX quality: 0 low (mobile/auto) · 1 medium (high without post) · 2 high (post + bloom).
(function(){const T=THREE,R=R3;
const ECM={overlord:{key:'celestial-overlord',H:300},sentinel:{key:'dark-sentinel',H:152},construct:{key:'lunar-construct',H:205},
  queen:{key:'ice-queen',H:250}};   // Arena Royale's Snow Queen (snow-queen.js): the owner's rigged Ice Queen
const ECLSET=new Set(ECL_KINDS);
const LGW=[null,{rz:Math.PI,grip:.13,len:1.3},{rz:1.08,grip:.1,len:1.35},{rz:0,grip:.34,len:1.25}];
const CA=()=>window.CelestialAssets;
const fxQ=r=>r.hi?(r.post?2:1):0,QK=[.35,.7,1];
const rnd=(a,b)=>a+Math.random()*(b-a);

// ---- model helpers ----
R.eclReady=function(key){const A=CA(),a=A&&A.get(key);return !!(a&&a.state==='loaded'&&a.inspection&&a.inspection.size&&this.celestialAsset)};
R.eclModel=function(key,H){if(!this.eclReady(key))return null;const parts=this.celestialAsset(key);if(!parts)return null;const s=CA().get(key).inspection.size,k=H/s[1];
  const g=new T.Group();for(const p of parts){const m=new T.Mesh(p.geo,p.mat);m.scale.set(s[0]*k,H,s[2]*k);m.castShadow=!!this.hi;m.receiveShadow=true;g.add(m)}return g};
R.lgModel=function(lg){const L=LEG[lg],W=LGW[lg];if(!this.eclReady(L.key))return null;const parts=this.celestialAsset(L.key),s=CA().get(L.key).inspection.size;
  const g0=new T.Group();for(const p of parts){const m=new T.Mesh(p.geo,p.mat);m.scale.set(s[0],s[1],s[2]);g0.add(m)}
  const r=new T.Group();r.add(g0);r.rotation.z=W.rz;r.updateMatrixWorld(true);const bb=new T.Box3().setFromObject(r),Lm=bb.max.y-bb.min.y;
  r.position.set(-(bb.min.x+bb.max.x)/2,-(bb.min.y+Lm*W.grip),-(bb.min.z+bb.max.z)/2);const w=new T.Group();w.add(r);
  const tip=new T.Object3D();tip.position.y=Lm*(1-W.grip)*.92;w.add(tip);return{g:w,L:Lm,tip}};

// ---- rigged creatures (Meshy auto-rig + animation pack): clips are matched by name, falling back to the order they were ordered in ----
const ECLIP={
  sentinel:{order:['idle','walk','attack','block','hit','death'],idle:/Combat_Stance|idle/i,walk:/walk/i,attack:/Triple_Combo|Combo|Attack/i,block:/Parry|Block/i,hit:/Hit_Reaction|Hit/i,death:/Dead|Death|Dying/i},
  construct:{order:['idle','walk','attack','slam','hit','death'],idle:/Combat_Stance|idle/i,walk:/walk/i,attack:/Hammer|Swing/i,slam:/Ground_Slam|Slam/i,hit:/Hit_Reaction|Hit/i,death:/Knock_Down|Dead|Death/i},
  overlord:{order:['idle','walk','attack','cast','slam','death'],idle:/Combat_Stance|idle/i,walk:/walk/i,attack:/Judgment|Sword/i,cast:/Spell|Cast/i,slam:/Ground_Slam|Slam/i,death:/Dead|Death/i},
  queen:{order:['idle','walk','attack','cast','slam','death'],idle:/Combat_Stance/i,walk:/Walking/i,attack:/Scepter_Strike/i,cast:/Spell_Cast/i,slam:/Frost_Nova/i,death:/Death/i}};
R.eclSkReady=function(ecl){const A=CA(),a=A&&A.get(ECM[ecl].key);return !!(a&&a.state==='loaded'&&a.inspection&&a.inspection.skinned&&a.gltf.animations&&a.gltf.animations.length>=2&&window.AR_GLTF&&AR_GLTF.SkeletonUtils)};
// in-place clips: the game moves the unit, so the hip bone keeps only its height
const eclClips=(a,ecl)=>{if(a._eclClips)return a._eclClips;const C=ECLIP[ecl],list=a.gltf.animations,used=new Set(),out={};
  // in place: every clip's hips keep the IDLE clip's ground position (a clip's own first frame can already be a metre off)
  const hipT=c=>c&&c.tracks.find(t=>/\.position$/.test(t.name)&&/hips|pelvis|root/i.test(t.name)),ref=hipT(list.find(c=>/Combat_Stance|idle/i.test(c.name))||list[0]);
  const rx=ref?ref.values[0]:0,rz=ref?ref.values[2]:0;
  const inPlace=c=>{const k=c.clone();const t=hipT(k);if(t){const v=t.values;for(let i=0;i<v.length;i+=3){v[i]=rx;v[i+2]=rz}}return k};
  for(const key of C.order){let c=list.find(c=>!used.has(c)&&C[key].test(c.name));if(c)used.add(c);out[key]=c}
  C.order.forEach((key,i)=>{if(!out[key]&&list[i]&&!used.has(list[i])){out[key]=list[i];used.add(list[i])}});
  for(const k in out)if(out[k])out[k]=inPlace(out[k]);return a._eclClips=out};
R.eclSkModel=function(o,u,M){const a=CA().get(M.key),model=AR_GLTF.SkeletonUtils.clone(a.gltf.scene);model.rotation.y+=a.config.rotationY||0;model.updateMatrixWorld(true);
  const bb=new T.Box3().setFromObject(model,true),size=bb.getSize(new T.Vector3()),sc=M.H/Math.max(1e-4,size.y),pivot=new T.Group();pivot.scale.setScalar(sc);pivot.add(model);
  pivot.position.set(-(bb.min.x+bb.max.x)*sc/2,-bb.min.y*sc,-(bb.min.z+bb.max.z)*sc/2);
  model.traverse(n=>{if(n.isMesh){n.castShadow=!!this.hi;n.receiveShadow=true;n.frustumCulled=false;if(this.fow){const paint=src=>this.cached('ecl-sk-'+src.uuid,()=>{const m=src.clone();if(m.isMeshStandardMaterial){m.envMap=this.envTex||null;m.envMapIntensity=.5}return this.fow(m,{key:'ecl-sk'})});n.material=Array.isArray(n.material)?n.material.map(paint):paint(n.material)}}});
  o.sk=1;o.mixer=new T.AnimationMixer(model);o.act={};const clips=eclClips(a,u.ecl);for(const k in clips)if(clips[k])o.act[k]=o.mixer.clipAction(clips[k]);
  o.hand=null;model.traverse(n=>{if(n.isBone&&/^(mixamorig[:_]?)?RightHand$/i.test(n.name))o.hand=n});o.pivot=pivot;try{this.eclArm(o)}catch(e){o.wpnPending=0}
  if(o.act.idle)o.act.idle.play();if(o.act.walk){o.act.walk.play();o.act.walk.setEffectiveWeight(0)}(this._eclSk||(this._eclSk=new Set())).add(o);return pivot};
// the creatures were generated empty-handed: they carry the legendary weapon models in the rigged right hand
const ECW={overlord:{lg:1,len:.62},sentinel:{lg:2,len:.72},construct:{lg:3,len:.62},
  queen:{key:'frost-scepter',grip:.36,len:.66,c:'#bfeaff',p:[-.0129,.08,-.0092],d:[-.285,.172,.943]}};   // Mixamo hand: palm centre and fist axis (the Mage's)
// a weapon model by key (not one of the legendaries): grip point at the origin, tip along +Y
R.eclWModel=function(W){if(!this.eclReady(W.key))return null;const parts=this.celestialAsset(W.key),s=CA().get(W.key).inspection.size;
  const g0=new T.Group();for(const p of parts){const m=new T.Mesh(p.geo,p.mat);m.scale.set(s[0],s[1],s[2]);m.castShadow=!!this.hi;g0.add(m)}
  const r=new T.Group();r.add(g0);if(W.rz)r.rotation.z=W.rz;r.updateMatrixWorld(true);const bb=new T.Box3().setFromObject(r),Lm=bb.max.y-bb.min.y;
  r.position.set(-(bb.min.x+bb.max.x)/2,-(bb.min.y+Lm*W.grip),-(bb.min.z+bb.max.z)/2);const w=new T.Group();w.add(r);
  const tip=new T.Object3D();tip.position.y=Lm*(1-W.grip)*.92;w.add(tip);return{g:w,L:Lm,tip}};
R.eclArm=function(o){const W=ECW[o.ecl];o.wpnPending=0;if(!W||!o.hand)return;const mod=W.key?this.eclWModel(W):this.lgModel(W.lg);if(!mod){o.wpnPending=1;return}
  o.pivot.updateMatrixWorld(true);const ws=new T.Vector3();o.hand.getWorldScale(ws);const h=new T.Group();h.add(mod.g);
  h.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),W.d?new T.Vector3().fromArray(W.d).normalize():new T.Vector3(0,0,1));if(W.p)h.position.fromArray(W.p);h.scale.setScalar(o.H*W.len/(mod.L*Math.max(1e-6,ws.x)));
  o.hand.add(h);o.wpn=h;o.wpnTip=mod.tip;o.wpnC=W.key?W.c:LEG[W.lg].c};
R.eclPlay=function(o,key,dur){const act=o.act[key];if(!act)return;if(o.overlay&&o.overlay!==act)o.overlay.fadeOut(.12);const c=act.getClip().duration;
  act.reset().setLoop(T.LoopOnce,1);act.clampWhenFinished=true;act.timeScale=dur?clamp(c/Math.max(.3,dur),.7,2.4):1;act.setEffectiveWeight(1).fadeIn(.1).play();o.overlay=act;o.overlayT=c/act.timeScale};
R.eclAnimSk=function(o,u,Tm,dt){if(o.wpnPending){const W=ECW[o.ecl];if(this.eclReady(W.key||LEG[W.lg].key))try{this.eclArm(o)}catch(e){o.wpnPending=0}}if(o.dying){o.dying=0;o.mixer.stopAllAction();o.overlay=null;if(o.act.idle)o.act.idle.reset().play();if(o.act.walk)o.act.walk.reset().play()}
  const A=u.ecA;if(A&&A!==o.lastA){o.lastA=A;const n=A.n,C=o.act;
    const k=n==='basic'||n==='combo'||n==='heavy'||n==='slash'?'attack':n==='slam'||n==='burst'||n==='phase'||n==='summon'?(C.slam?'slam':C.cast?'cast':'attack'):n==='ultimate'||n==='cage'||n==='rain'?(C.cast?'cast':C.slam?'slam':'attack'):n==='block'?'block':n==='stagger'?'hit':null;
    if(k&&C[k])this.eclPlay(o,k,k==='hit'||k==='block'?0:A.d)}
  const mk=o.mvK;let ow=0;if(o.overlay){o.overlayT-=dt;ow=clamp(o.overlayT/.15,0,1);if(o.overlayT<=0){o.overlay.fadeOut(.15);o.overlay=null;ow=0}}
  if(o.act.idle)o.act.idle.setEffectiveWeight((1-mk)*(1-ow));if(o.act.walk){o.act.walk.setEffectiveWeight(mk*(1-ow));o.act.walk.timeScale=clamp((u.spdBase||140)/140,.7,1.4)}
  o.mixer.update(dt)};
// ---- creatures ----
const _of=R.objFor;R.objFor=function(u){if(u.ecl&&!this.objs.get(u.id))return this.eclObj(u);return _of.call(this,u)};
R.eclObj=function(u){const M=ECM[u.ecl],root=new T.Group(),body=new T.Group();root.add(body);
  const o={kind:'ecl',ecl:u.ecl,root,body,u,lx:u.x,ly:u.y,rot:Math.atan2(u.fx,u.fy),walk:0,mvK:0,atkPh:0,H:M.H};
  const pose=new T.Group();root.add(pose);o.pose=pose;
  if(this.eclSkReady(u.ecl)){pose.add(this.eclSkModel(o,u,M));o.body=new T.Group()}   // the generic death tilt acts on a detached body; the clip does the falling
  else{body.add(pose);const m=this.eclModel(M.key,M.H);
  if(m)pose.add(m);else{o.fallback=1;const f=this.golem(u,u.ecl!=='construct');f.root.scale.setScalar(u.ecl==='overlord'?2.4:u.ecl==='construct'?1.7:1.2);pose.add(f.root)}}
  if(u.ecl==='overlord'&&!o.sk){o.halo=this.mesh(this.G.torus,this.glowM('#9fc4ff',.5),0,M.H*.87,-22,40,40,40,pose);o.halo2=this.mesh(this.G.torus,this.glowM('#7a5aff',.35),0,M.H*.87,-26,52,52,52,pose)}
  if(u.ecl==='sentinel'){o.shield=this.mesh(this.G.disc,this.glowM('#8fb0ff',.0),0,M.H*.5,34,34,34,34,pose);o.shield.visible=false}
  if(u.ecl==='construct'){o.core=this.mesh(this.G.sph,this.glowM('#9fe8ff',.8),0,M.H*.62,-30,9,9,9,pose)}   // weak point glow on the back
  this.addStatus(o,u);this.scene.add(root);this.objs.set(u.id,o);(this._eclSet||(this._eclSet=new Set())).add(o);return o};
const _ab=R.animBig;R.animBig=function(o,u,Tm){if(o.ecl)return this.eclAnim(o,u,Tm);return _ab.call(this,o,u,Tm)};
R.eclAnim=function(o,u,Tm){const dt=Math.min(.1,Math.max(0,Tm-(o.lt||Tm)));o.lt=Tm;o.seenT=performance.now();
  if((o.fallback&&this.eclReady(ECM[o.ecl].key)||!o.sk&&this.eclSkReady(o.ecl))&&!o.swap){o.swap=1;this.scene.remove(o.root);this.objs.delete(u.id);return}  // rebuilt next frame with the real model
  if(o.sk){this.eclAnimSk(o,u,Tm,dt);const P=o.pose;let y=0;if(o.ecl==='overlord'){y=10+Math.sin(Tm*1.3)*5;if(o.halo){o.halo.rotation.z=Tm*.6;o.halo2.rotation.z=-Tm*.4;o.halo.material.opacity=.35+.25*(u.ph===2?1:u.ph===1?.75:.5)+.1*Math.sin(Tm*3)}}
    P.position.set(0,y,0);P.rotation.set(0,0,0);P.scale.set(1,1,1);if(o.shield)o.shield.visible=false;if(o.core)o.core.material.opacity=.55+.35*Math.sin(Tm*4);
    if(o.ecl==='overlord'&&Math.random()<dt*(4+8*fxQ(this))){const a=Math.random()*6.283;this.sp(true,{x:u.x+Math.cos(a)*rnd(40,120),y:o.gy+rnd(40,o.H),z:u.y+Math.sin(a)*rnd(40,120),vy:rnd(10,40),l:1.2,s:10,s1:2,c:u.ph===2?'#b08aff':'#9fc4ff',sp:1})}
    if(o.ecl==='queen'&&Math.random()<dt*(5+9*fxQ(this))){const a=Math.random()*6.283;this.sp(true,{x:u.x+Math.cos(a)*rnd(30,110),y:o.gy+rnd(20,o.H*.9),z:u.y+Math.sin(a)*rnd(30,110),vx:rnd(-20,20),vy:rnd(-30,10),vz:rnd(-20,20),l:1.6,s:8,s1:2,c:u.ph===2?'#ffffff':'#cfefff',sp:1})}return}
  const P=o.pose,H=o.H,k=o.mvK,ph=o.walk*.6;let y=Math.abs(Math.sin(ph))*4*k+Math.sin(Tm*1.6+u.id)*1.2,rx=0,rz=Math.sin(ph)*.045*k,z=0,sc=1+Math.sin(Tm*1.7+u.id)*.012;
  if(o.ecl==='overlord'){y+=16+Math.sin(Tm*1.3)*7;if(o.halo){o.halo.rotation.z=Tm*.6;o.halo2.rotation.z=-Tm*.4;const f=u.ph===2?1:u.ph===1?.75:.5;o.halo.material.opacity=.35+.25*f+.1*Math.sin(Tm*3)}}
  const A=u.ecA;if(A&&A.t>0){A.t-=dt;const p=1-Math.max(0,A.t)/A.d;
    if(A.n==='basic'||A.n==='combo'||A.n==='heavy'||A.n==='slash'){const w=p<.45?p/.45:1-(p-.45)/.55;const strike=p>=.45;rx=strike?.32*w:-.2*w;z=strike?26*w:-8*w;if(A.n==='combo')rz+=Math.sin(p*Math.PI*3)*.25}
    else if(A.n==='slam'||A.n==='burst'||A.n==='phase'||A.n==='summon'){const up=p<.6?Math.sin(p/.6*Math.PI/2):1-(p-.6)/.4;y+=up*(o.ecl==='construct'?36:60);if(p>.6&&p<.72)sc*=.92;rx=-.12*up}
    else if(A.n==='ultimate'||A.n==='cage'||A.n==='rain'){y+=Math.min(1,p*3)*70;P.rotation.y=(A.n==='ultimate'?p*Math.PI*2:Math.sin(p*Math.PI)*.4)}
    else if(A.n==='block'){rx=-.16;z=-6}
    else if(A.n==='stagger'){rz+=Math.sin(Tm*34)*.16*(1-p);rx=-.25*(1-p)}}
  else{P.rotation.y=0;if(u.atkAnim>0){rx=.25;z=18}}
  if(u.stunT>0)rz+=Math.sin(Tm*22)*.06;
  P.position.set(0,y,z);P.rotation.x=rx;P.rotation.z=rz;P.scale.set(1/Math.sqrt(sc),sc,1/Math.sqrt(sc));
  if(o.shield){const on=u.blockT>0||(A&&A.n==='block'&&A.t>0);o.shield.visible=on;if(on)o.shield.material.opacity=.35+.2*Math.sin(Tm*18)}
  if(o.core)o.core.material.opacity=.55+.35*Math.sin(Tm*4);
  const q=fxQ(this);if(o.ecl==='overlord'&&Math.random()<dt*(4+8*q)){const a=Math.random()*6.283;this.sp(true,{x:u.x+Math.cos(a)*rnd(40,120),y:o.gy+rnd(40,H),z:u.y+Math.sin(a)*rnd(40,120),vy:rnd(10,40),l:1.2,s:10,s1:2,c:u.ph===2?'#b08aff':'#9fc4ff',sp:1})}};

// ---- HP bar height for the new silhouettes (the generic golem height is far too low for a 300-unit boss)
R.eclTop=u=>u.ecl==='overlord'?345:u.ecl==='construct'?225:u.ecl==='queen'?300:172;

// ---- events from the host ----
R.eclEvent=function(e,u){if(!this.ok||!this.PA||!this.scene)return;const gy=this.gY?this.gY(e.x||(u&&u.x)||0,e.y||(u&&u.y)||0):0,q=QK[fxQ(this)];
  if(e.k==='sum'){this.ring(e.x,e.y,20,190,'#a070ff',.8);for(let i=0;i<40*q;i++){const a=Math.random()*6.283;this.sp(true,{x:e.x+Math.cos(a)*60,y:gy+10,z:e.y+Math.sin(a)*60,vy:rnd(120,360),l:.8,s:22,s1:4,c:'#c8a8ff',c2:'#4a2aa8',sp:1})}}
  else if(e.k==='ph'&&u){const q=u.ecl==='queen';this.ring(u.x,u.y,30,520,q?'#bfeaff':'#b08aff',1);this.ring(u.x,u.y,20,300,'#ffffff',.5);this.eclFlash(q?(e.p===2?'#cfefff':'#8fc8ff'):e.p===2?'#3a1a6a':'#1a2a5a',q?.35:.5)}
  else if(e.k==='die'){const c2=e.q?'#7fd0ff':'#6a4aff';this.ring(e.x,e.y,40,900,'#cfe0ff',1.4);this.ring(e.x,e.y,30,520,e.q?'#bfeaff':'#a070ff',1);for(let i=0;i<120*q;i++){const a=Math.random()*6.283,v=rnd(150,700);this.sp(true,{x:e.x,y:gy+80,z:e.y,vx:Math.cos(a)*v,vy:rnd(100,600),vz:Math.sin(a)*v,l:rnd(.8,1.6),s:30,s1:4,c:'#e0ecff',c2,sp:1,g:300,dr:.8})}this.eclFlash(e.q?'#e8f6ff':'#cfe0ff',.45)}
  else if(e.k==='stg'&&u){for(let i=0;i<16*q;i++)this.sp(true,{x:u.x+rnd(-20,20),y:gy+rnd(40,120),z:u.y+rnd(-20,20),vx:rnd(-160,160),vy:rnd(60,200),vz:rnd(-160,160),l:.45,s:12,s1:2,c:'#ffe8a0',sp:1,g:400})}};

// ---- DOM: boss bar + eclipse darkening (pointer-events none: never blocks touch controls) ----
const css=`#eclBoss{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 50px);transform:translateX(-50%);width:min(560px,72vw);z-index:30;pointer-events:none;font:600 13px/1.2 system-ui,sans-serif;color:#e8eeff;text-align:center;text-shadow:0 1px 3px #000;transition:opacity .4s;opacity:0}
#eclBoss .n{letter-spacing:.06em;margin-bottom:5px}#eclBoss .n b{color:#b9a6ff;font-weight:700}
#eclBoss .bar{position:relative;height:12px;border-radius:7px;background:#0b0d1acc;border:1px solid #8a9ad866;overflow:hidden;box-shadow:0 0 14px #6a5aff55}
#eclBoss .f{position:absolute;inset:0;width:100%;background:linear-gradient(90deg,#5a3ad8,#9fb8ff);transition:width .25s}#eclBoss .lag{position:absolute;inset:0;background:#ffffff55;transition:width 1.1s .3s}
#eclBoss .m{position:absolute;top:-2px;bottom:-2px;width:2px;background:#ffe9a0}
#eclDark{position:fixed;inset:0;z-index:5;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,#0000 25%,#12062ad9 100%)}
#eclFlash{position:fixed;inset:0;z-index:6;pointer-events:none;opacity:0;transition:opacity .6s}`;
let D=null;const dom=()=>{if(D)return D;const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  const b=document.createElement('div');b.id='eclBoss';b.innerHTML='<div class="n"></div><div class="bar"><div class="lag"></div><div class="f"></div><div class="m" style="left:70%"></div><div class="m" style="left:35%"></div></div>';
  const dk=document.createElement('div');dk.id='eclDark';const fl=document.createElement('div');fl.id='eclFlash';document.body.append(dk,fl,b);
  D={b,n:b.querySelector('.n'),f:b.querySelector('.f'),lag:b.querySelector('.lag'),dk,fl};return D};
R.eclFlash=function(c,a){if(typeof document==='undefined')return;const d=dom();d.fl.style.transition='none';d.fl.style.background=c;d.fl.style.opacity=a;requestAnimationFrame(()=>{d.fl.style.transition='opacity .9s';d.fl.style.opacity=0})};
const BOSSUI={overlord:{t:'☾ CELESTIAL OVERLORD',ph:['PHASE I','PHASE II · ECLIPSE','PHASE III · TOTALITY'],bg:'linear-gradient(90deg,#5a3ad8,#9fb8ff)'},
  queen:{t:'❄ SNOW QUEEN · ราชินีหิมะ',ph:['PHASE I','PHASE II · BLIZZARD','PHASE III · ETERNAL WINTER'],bg:'linear-gradient(90deg,#3a8ad8,#e8f6ff)'}};
R.eclHud=function(me,L,dt){const F=me||L;if(!F||typeof document==='undefined')return;let b=null,bd=1e9;const cl=typeof net!=='undefined'&&net.mode==='client';for(const u of units){if(!BOSSUI[u.ecl]||u.dead||(cl&&!u.inSnap))continue;const d=Math.hypot(u.x-F.x,u.y-F.y);if(d<bd){bd=d;b=u}}
  const show=!!b&&bd<1600&&(b.hp<b.maxHp-1||bd<720);this._eclBossShown=show;if(!show&&!D)return;const d=dom();d.b.style.opacity=show?1:0;
  if(show){const r=Math.max(0,b.hp/b.maxHp),ph=r>.7?0:r>.35?1:2,w=(r*100).toFixed(1)+'%';d.f.style.width=w;d.lag.style.width=w;
    const U=BOSSUI[b.ecl],t=U.t+' <b>· '+U.ph[ph]+'</b> · '+fmtN(b.hp)+' / '+fmtN(b.maxHp);if(d.n._t!==t){d.n._t=t;d.n.innerHTML=t}if(d.f._bg!==U.bg){d.f._bg=U.bg;d.f.style.background=U.bg}}
  // Ultimate Eclipse darkens the sky while it charges
  let dark=0;for(const a of aoes)if(a.kind==='ueclipse'&&Math.hypot(a.x-F.x,a.y-F.y)<a.r+600)dark=Math.max(dark,a.t<a.delay?Math.min(1,a.t/a.delay)*.85:Math.max(0,a.fxT||0));
  this._eclDk=lerp(this._eclDk||0,dark,Math.min(1,dt*6));d.dk.style.opacity=this._eclDk.toFixed(3)};

// the boss bar replaces the generic top-centre enemy frame while it is up (no stacked bars)
if(typeof drawTarget==='function'){const _dt=drawTarget;let _t0=0;drawTarget=function(me,s,fr){const now=performance.now(),dt=Math.min(.1,(now-(_t0||now))/1000);_t0=now;try{R.eclHud(me,(typeof listener==='function'&&listener())||me,dt)}catch(e){}const u=UMAP.get(TGT.id);if(u&&BOSSUI[u.ecl]&&R._eclBossShown)return;return _dt.apply(this,arguments)}}
// ---- the altar (decor only: rune disc, eclipse ring, orbiting obsidian shards) ----
R.eclAltar=function(Tm){const A=WD&&WD.eclAltar;if(!A){return}
  if(this._eclW!==WD){this._eclW=WD;if(this._eclAlt)this.scene.remove(this._eclAlt);const g=new T.Group(),gy=this.gY(A.x,A.y);g.position.set(A.x,gy,A.y);
    const disc=new T.Mesh(this.G.plane,new T.MeshBasicMaterial({map:this.tex('rune'),color:'#6a7aff',transparent:true,opacity:.55,depthWrite:false,blending:T.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-2}));disc.userData.ownMat=1;disc.position.y=3;disc.scale.set(A.r*1.1,1,A.r*1.1);g.add(disc);
    const ring=this.mesh(this.G.torus,this.glowM('#a8c0ff',.5),0,560,0,120,120,120,g);ring.rotation.x=Math.PI/2;const ring2=this.mesh(this.G.torus,this.glowM('#4a2aa8',.6),0,560,0,104,104,104,g);ring2.rotation.x=Math.PI/2;
    const sh=[],mat=this.std?this.std('#14121c',.35,.6,{emissive:'#3a2a8a',emissiveIntensity:.6}):this.glowM('#3a2a8a',.8);for(let i=0;i<7;i++){const m=this.mesh(this.G.oct,mat,0,0,0,16,46,16,g,true);sh.push(m)}
    this._eclAlt=g;this._eclAltP={disc,ring,ring2,sh};this.scene.add(g)}
  const P=this._eclAltP;if(!P)return;P.disc.rotation.y=Tm*.08;P.ring.rotation.z=Tm*.2;P.ring2.rotation.z=-Tm*.15;
  P.sh.forEach((m,i)=>{const a=Tm*.25+i/P.sh.length*6.283,r=A.r*.92;m.position.set(Math.cos(a)*r,90+Math.sin(Tm*1.1+i)*22,Math.sin(a)*r);m.rotation.y=Tm+i})};

// ---- legendary weapons on heroes: the Meshy model replaces the KayKit/procedural weapon mesh in the same hand socket ----
R.lgAttach=function(o,u){if(o.lgM){if(o.lgM.parent)o.lgM.parent.remove(o.lgM);o.lgM=null;o.lgTip=null}if(o.lgHid){for(const n of o.lgHid)n.visible=true;o.lgHid=null}
  const lg=lgOf(u),L=LEG[lg],h=o.wpnR||o.wpnL;o.lgK=lg+'|'+u.wk+'|'+u.wt;o.lgH=h;if(!L||u.wk!==L.wk||!h)return;
  const mod=this.lgModel(lg);if(!mod){o.lgK=null;return}
  h.updateMatrixWorld(true);const inv=new T.Matrix4().copy(h.matrixWorld).invert(),bb=new T.Box3(),tb=new T.Box3(),mm=new T.Matrix4(),hid=[];
  h.traverse(n=>{if(n.isMesh&&n.visible&&n.geometry){const g=n.geometry;if(!g.boundingBox)g.computeBoundingBox();tb.copy(g.boundingBox).applyMatrix4(mm.multiplyMatrices(inv,n.matrixWorld));bb.union(tb);hid.push(n)}});
  if(bb.isEmpty())return;const ext=[[bb.min.x,bb.max.x],[bb.min.y,bb.max.y],[bb.min.z,bb.max.z]];let ax=0,len=0;ext.forEach((e,i)=>{if(e[1]-e[0]>len){len=e[1]-e[0];ax=i}});
  const e=ext[ax],dir=new T.Vector3();dir.setComponent(ax,Math.abs(e[1])>=Math.abs(e[0])?1:-1);
  const al=new T.Group();al.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir);mod.g.scale.setScalar(len*(o.p5w?1.05:LGW[lg].len)/mod.L);al.add(mod.g);h.add(al);
  for(const n of hid)n.visible=false;o.lgM=al;o.lgHid=hid;o.lgTip=mod.tip;o.lgC=L.c};

// ---- per-frame: altar, HUD, legendary sockets + trails, bloom guard ----
const _fx=R.effects;R.effects=function(Tm,dt,me,L){const r=_fx.apply(this,arguments);if(!CURSED)return r;
  try{if(this._eclSet){const now=performance.now();for(const o of this._eclSet){if(this.objs.get(o.u.id)!==o){this._eclSet.delete(o);continue}const u=o.u;
      // the unit loop hides a mob the frame it dies, before the 'die' event reaches doFx: start the death here while it was on screen a moment ago
      if(u.dead&&!o.dying&&!(o.dieT>0)&&o.seenT&&now-o.seenT<400){o.dying=1;o.root.visible=true;
        if(o.sk){o.overlay=null;o.mixer.stopAllAction();const d=o.act.death;if(d){d.reset().setLoop(T.LoopOnce,1);d.clampWhenFinished=true;d.play();o.dieT=d.getClip().duration+.9}else o.dieT=1.4}else o.dieT=1.4}
      if(!u.dead&&o.dying&&!o.sk)o.dying=0;
      if(o.sk&&o.dieT>0)o.mixer.update(dt);
      if(o.wpnTip&&!u.dead&&o.root.visible&&Math.random()<dt*((o.overlay?24:4)*QK[fxQ(this)])){o.wpnTip.getWorldPosition(this.v);this.sp(true,{x:this.v.x+rnd(-6,6),y:this.v.y+rnd(-6,6),z:this.v.z+rnd(-6,6),vy:rnd(10,40),l:.7,s:o.overlay?18:10,s1:2,c:o.wpnC,sp:1})}}}
    this.eclAltar(Tm);const q=fxQ(this);
    for(const u of units){if(!u.hero||u.dead)continue;const o=this.objs.get(u.id);if(!o||!o.root.visible)continue;const lg=lgOf(u),h=o.wpnR||o.wpnL;
      if((lg||o.lgM)&&(o.lgK!==lg+'|'+u.wk+'|'+u.wt||o.lgH!==h))this.lgAttach(o,u);
      if(o.lgTip&&Math.random()<dt*((u.atkAnim>0?40:5)*QK[q])){o.lgTip.getWorldPosition(this.v);this.sp(true,{x:this.v.x+rnd(-5,5),y:this.v.y+rnd(-5,5),z:this.v.z+rnd(-5,5),vy:rnd(10,40),l:u.atkAnim>0?.5:.8,s:u.atkAnim>0?16:9,s1:2,c:o.lgC,sp:1})}}
    // heavy bloom off while the screen is full of eclipse effects (keeps attacks readable and mobile GPUs alive)
    if(this.bloom){if(this._eclBloom===undefined)this._eclBloom=this.bloom.strength;let n=0;for(const a of aoes)if(ECLSET.has(a.kind))n++;this.bloom.strength=n>6?this._eclBloom*.55:this._eclBloom}
  }catch(e){if(!this._eclErr){this._eclErr=1;console.warn('eclipse fx',e)}}
  return r};

// ---- combat VFX for the new aoe kinds ----
const _av=R.aoeVis;R.aoeVis=function(a,Tm,dt,L){if(ECLSET.has(a.kind))return this.eclVis(a,Tm,dt,L);return _av.call(this,a,Tm,dt,L)};
R.eclPick=function(pool,o,gy,add){const d=this.get(pool,()=>{const m=new T.Mesh(this.G.plane,new T.MeshBasicMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,blending:add===false?T.NormalBlending:T.AdditiveBlending}));m.renderOrder=1;m.userData.ownMat=1;return m});
  d.material.map=this.tex(o.tex);d.material.color.set(o.c);d.material.opacity=o.a;d.position.set(o.x,gy+2.8+(this.pool[pool].used%6)*.25,o.y);d.rotation.y=o.rot||0;d.scale.set(o.sx,1,o.sz||o.sx);return d};
R.eclMesh=function(pool,geo,col,a){const m=this.get(pool,()=>{const x=new T.Mesh(this.G[geo],new T.MeshBasicMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false}));x.userData.ownMat=1;return x});m.material.color.set(col);m.material.opacity=a;m.rotation.set(0,0,0);return m};
// one-shot bursts fire once per aoe even though clients rebuild the aoe list every snapshot
R.eclOnce=function(a){const k=a.kind+'|'+(a.x|0)+'|'+(a.y|0)+'|'+a.delay;const S=this._eclSeen||(this._eclSeen=new Map()),now=performance.now();if(S.has(k)&&now-S.get(k)<4000)return false;S.set(k,now);if(S.size>300)for(const [kk,t] of S)if(now-t>4000)S.delete(kk);return true};
R.eclVis=function(a,Tm,dt,L){const gy=this.gY(a.x,a.y),pre=a.t<a.delay,k=pre?Math.min(1,a.t/Math.max(.01,a.delay)):1,q=QK[fxQ(this)],N=n=>Math.max(1,Math.round(n*q));
  const P=(o)=>this.eclPick('eclp',o,gy),cone=a.shape==='cone',len=a.len||a.r,ang=a.ang||0;
  const pulse=.55+.3*Math.sin(Tm*16);
  switch(a.kind){
  case 'mslash':case 'lslash':{const col=a.kind==='lslash'?'#bfe8ff':'#9fd0ff';
    if(pre){P({tex:'beam',c:col,a:.25+.35*k*pulse,x:a.x+Math.cos(ang)*len/2,y:a.y+Math.sin(ang)*len/2,sx:len*a.arc*1.6,sz:len,rot:-ang+Math.PI/2});return}
    if(a.fxT>0)P({tex:'slash',c:col,a:Math.min(1,a.fxT*3),x:a.x+Math.cos(ang)*len*.55,y:a.y+Math.sin(ang)*len*.55,sx:len*1.1,sz:len*.8,rot:-ang+Math.PI/2});
    if(this.eclOnce(a)){for(let i=0;i<N(70);i++){const aa=ang+rnd(-a.arc,a.arc),rr=rnd(.35,1)*len,v=rnd(200,520);this.sp(true,{x:a.x+Math.cos(aa)*rr*.4,y:gy+rnd(30,90),z:a.y+Math.sin(aa)*rr*.4,vx:Math.cos(aa)*v,vy:rnd(-20,60),vz:Math.sin(aa)*v,l:rnd(.35,.6),s:rnd(18,34),s1:4,c:'#f0f8ff',c2:'#5a7aff',sp:1,dr:2})}
      this.decal({x:a.x+Math.cos(ang)*len*.5,y:a.y+Math.sin(ang)*len*.5,r:len*.45,c:'#9fb8ff',life:1.6,tex:'scorch',normal:1,a:.4,fade:.5})}return}
  case 'eburst':case 'lburst':{const col=a.kind==='lburst'?'#a8b8ff':'#b08aff';
    if(pre){P({tex:'rune',c:col,a:.75,x:a.x,y:a.y,sx:a.r*2,rot:Tm*1.4});P({tex:'shock',c:'#e8dcff',a:.55,x:a.x,y:a.y,sx:a.r*2*k});
      if(Math.random()<dt*30*q){const aa=Math.random()*6.283;this.sp(true,{x:a.x+Math.cos(aa)*a.r,y:gy+10,z:a.y+Math.sin(aa)*a.r,vx:-Math.cos(aa)*a.r*1.2,vz:-Math.sin(aa)*a.r*1.2,vy:30,l:.7,s:14,s1:4,c:'#d8c8ff',sp:1})}return}
    if(this.eclOnce(a)){this.ring(a.x,a.y,20,a.r*1.25,col,.7);this.ring(a.x,a.y,10,a.r*.7,'#ffffff',.4);
      for(let i=0;i<N(80);i++){const aa=i/N(80)*6.283,v=rnd(380,700)*(a.r/400);this.sp(true,{x:a.x+Math.cos(aa)*30,y:gy+rnd(15,60),z:a.y+Math.sin(aa)*30,vx:Math.cos(aa)*v,vy:rnd(10,90),vz:Math.sin(aa)*v,l:rnd(.4,.7),s:rnd(26,48),s1:8,c:'#e8dcff',c2:'#4a2aa8',sp:1,dr:2.2})}
      this.decal({x:a.x,y:a.y,r:a.r*.8,c:'#6a4aff',life:2.5,tex:'scorch',normal:1,a:.55,fade:.5})}
    if(a.fxT>0){const s=this.eclMesh('eclsph','sph','#2a1050',Math.min(.6,a.fxT));s.position.set(a.x,gy+60,a.y);s.scale.setScalar(a.r*.35*(1.2-a.fxT))}return}
  case 'crain':{if(pre){P({tex:'rune',c:'#cfe4ff',a:.5+.3*k,x:a.x,y:a.y,sx:a.r*2,rot:-Tm*2});P({tex:'shock',c:'#ffffff',a:.5,x:a.x,y:a.y,sx:a.r*2*k});
      if(k>.35){const sp=this.eclMesh('eclspear','oct','#e8f2ff',.9),h=(1-k)/.65*1300;sp.position.set(a.x+h*.18,gy+h+40,a.y-h*.1);sp.scale.set(10,70,10);sp.rotation.z=.18;
        if(Math.random()<.7)this.sp(true,{x:sp.position.x,y:sp.position.y+40,z:sp.position.z,vy:60,l:.3,s:20,s1:3,c:'#bfd8ff',sp:1})}return}
    if(this.eclOnce(a)){this.ring(a.x,a.y,10,a.r*1.5,'#dfeaff',.45);for(let i=0;i<N(26);i++){const aa=Math.random()*6.283,v=rnd(120,380);this.sp(true,{x:a.x,y:gy+20,z:a.y,vx:Math.cos(aa)*v,vy:rnd(80,300),vz:Math.sin(aa)*v,l:.45,s:18,s1:3,c:'#ffffff',c2:'#7a9aff',sp:1,g:500})}
      this.decal({x:a.x,y:a.y,r:a.r*.7,c:'#8aa8ff',life:2,tex:'scorch',normal:1,a:.5,fade:.5})}return}
  case 'vcage':{const n=8;if(pre){P({tex:'rune',c:'#a070ff',a:.8,x:a.x,y:a.y,sx:a.r*2.15,rot:Tm*2.2});P({tex:'shock',c:'#ff5a8a',a:.2+.25*pulse,x:a.x,y:a.y,sx:a.r*2});
      for(let i=0;i<n;i++){const aa=i/n*6.283+Tm*.3,m=this.eclMesh('eclpil','cyl','#b890ff',.55+.3*k);m.position.set(a.x+Math.cos(aa)*a.r,gy+k*110,a.y+Math.sin(aa)*a.r);m.scale.set(9,k*220+4,9)}
      if(Math.random()<dt*40*q){const aa=Math.random()*6.283;this.sp(true,{x:a.x+Math.cos(aa)*a.r,y:gy+rnd(10,200),z:a.y+Math.sin(aa)*a.r,vy:rnd(40,120),l:.6,s:12,s1:3,c:'#d8c0ff',sp:1})}return}
    if(this.eclOnce(a)){this.ring(a.x,a.y,10,a.r*1.3,'#c8a0ff',.6);for(let i=0;i<N(60);i++){const aa=Math.random()*6.283;this.sp(true,{x:a.x+Math.cos(aa)*a.r,y:gy+rnd(20,180),z:a.y+Math.sin(aa)*a.r,vx:-Math.cos(aa)*a.r*2,vz:-Math.sin(aa)*a.r*2,vy:rnd(-20,40),l:.5,s:22,s1:4,c:'#e0d0ff',c2:'#5a2aa8',sp:1})}}
    if(a.fxT>0)for(let i=0;i<n;i++){const aa=i/n*6.283,m=this.eclMesh('eclpil','cyl','#e8d8ff',a.fxT);m.position.set(a.x+Math.cos(aa)*a.r,gy+110,a.y+Math.sin(aa)*a.r);m.scale.set(12,230,12)}return}
  case 'ueclipse':{if(pre){this.eclPick('ecldk',{tex:'shock',c:'#12062a',a:.55*k,x:a.x,y:a.y,sx:a.r*2},gy,false);P({tex:'rune',c:'#6a4aff',a:.35+.2*pulse,x:a.x,y:a.y,sx:a.r*2,rot:Tm*.5});
      const s=this.eclMesh('eclsph','sph','#1a0838',.5*k);s.position.set(a.x,gy+320,a.y);s.scale.setScalar(60+k*90);const h=this.eclMesh('eclhalo','torus','#cfd8ff',.7*k);h.position.set(a.x,gy+320,a.y);h.scale.setScalar(70+k*110);h.rotation.set(Math.PI/2,0,Tm);
      if(Math.random()<dt*60*q){const aa=Math.random()*6.283,rr=rnd(.2,1)*a.r;this.sp(true,{x:a.x+Math.cos(aa)*rr,y:gy+10,z:a.y+Math.sin(aa)*rr,vx:(a.x-(a.x+Math.cos(aa)*rr))*.6,vz:(a.y-(a.y+Math.sin(aa)*rr))*.6,vy:rnd(120,300),l:1,s:16,s1:3,c:'#b8a0ff',sp:1})}return}
    if(this.eclOnce(a)){for(const [r0,c,l] of[[40,'#ffffff',.8],[30,'#b08aff',1.2],[20,'#4a2aa8',1.6]])this.ring(a.x,a.y,r0,a.r*1.1,c,l);
      for(let i=0;i<N(160);i++){const aa=Math.random()*6.283,v=rnd(300,1100);this.sp(true,{x:a.x,y:gy+rnd(40,320),z:a.y,vx:Math.cos(aa)*v,vy:rnd(-60,260),vz:Math.sin(aa)*v,l:rnd(.6,1.2),s:rnd(30,70),s1:6,c:'#e8dcff',c2:'#3a1a8a',sp:1,dr:1})}
      this.decal({x:a.x,y:a.y,r:a.r*.9,c:'#3a1a6a',life:5,tex:'scorch',normal:1,a:.6,fade:.4})}return}
  case 'usafe':{if(pre){P({tex:'rune',c:'#fff2b0',a:.85,x:a.x,y:a.y,sx:a.r*2,rot:-Tm});P({tex:'shock',c:'#ffe9a0',a:.35+.2*pulse,x:a.x,y:a.y,sx:a.r*2});
      const b=this.eclMesh('eclbeam','cyl','#fff0c0',.22+.1*pulse);b.position.set(a.x,gy+400,a.y);b.scale.set(a.r*.55,800,a.r*.55)}return}
  case 'hstrike':case 'gslam':{const col=a.kind==='gslam'?'#9fd0ff':'#ffcf8a';
    if(pre){if(cone)P({tex:'beam',c:col,a:.3+.35*k*pulse,x:a.x+Math.cos(ang)*len/2,y:a.y+Math.sin(ang)*len/2,sx:len*a.arc*1.6,sz:len,rot:-ang+Math.PI/2});
      else{P({tex:'rune',c:col,a:.75,x:a.x,y:a.y,sx:a.r*2,rot:Tm*1.6});P({tex:'shock',c:col,a:.6,x:a.x,y:a.y,sx:a.r*2*k})}return}
    if(this.eclOnce(a)){const cx=cone?a.x+Math.cos(ang)*len*.5:a.x,cy=cone?a.y+Math.sin(ang)*len*.5:a.y,rr=cone?len*.45:a.r;this.ring(cx,cy,20,rr*1.3,col,.55);
      for(let i=0;i<N(10);i++){const aa=Math.random()*6.283,d=rnd(.2,.9)*rr;this.spikes.push({x:cx+Math.cos(aa)*d,y:cy+Math.sin(aa)*d,t:0,ice:a.kind==='gslam'?1:0})}
      for(let i=0;i<N(14);i++)this.sp(false,{x:cx+rnd(-rr*.6,rr*.6),y:gy+30,z:cy+rnd(-rr*.6,rr*.6),vy:rnd(40,120),l:1.3,s:50,s1:130,c:'#4a4458',a:.5,sp:2,dr:.8});
      this.decal({x:cx,y:cy,r:rr*.85,c:'#ffffff',life:3.5,tex:'scorch',normal:1,a:.7,fade:.5})}return}
  case 'lscythe':{if(a.fxT>0){P({tex:'slash',c:'#c08aff',a:Math.min(1,a.fxT*2.5),x:a.x,y:a.y,sx:a.r*2.1,rot:Tm*18});P({tex:'slash',c:'#7a3aff',a:Math.min(.7,a.fxT*2),x:a.x,y:a.y,sx:a.r*1.6,rot:-Tm*14+1.5})}
    if(!pre&&this.eclOnce(a))for(let i=0;i<N(40);i++){const aa=i/N(40)*6.283;this.sp(true,{x:a.x+Math.cos(aa)*a.r*.7,y:gy+rnd(30,70),z:a.y+Math.sin(aa)*a.r*.7,vx:-Math.sin(aa)*420,vz:Math.cos(aa)*420,vy:rnd(0,50),l:.4,s:20,s1:3,c:'#e0c8ff',c2:'#5a1aa8',sp:1,dr:2})}return}
  }};
})();
