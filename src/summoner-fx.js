// ===================== SUMMONER · render (Claude, 2026-11-18 · Arena Royale only) =====================
// Spirits: wisps are glowing soul orbs with rings and a trail; the spirit wolf and the Lunar Guardian reuse the wolf and
// rigged Lunar Construct models, re-coloured into translucent spectral copies. Soul bolts are projectile kind 16.
// The tome itself: the Meshy orb / tome / grimoire when they are loaded (p5-heroes.js), otherwise a small procedural orb.
// 2026-11-21: the fused tomes' spirits — spectral skeleton knights, the Spirit Warlord (a spectral Dark Sentinel), green-gold hunter wisps —
// and the elemental tomes' spirits take their element's colour (fire / frost / storm).
(()=>{
if(typeof R3==='undefined')return;const R=R3,T=THREE,CYAN='#7fe8ff',VIO='#a98bff';
if(typeof KK_FOR!=='undefined')KK_FOR.soul='Mage';
if(typeof QN_MOB!=='undefined'&&QN_MOB.wolf)QN_MOB.swolf=QN_MOB.wolf;
// the tome on the ground / in a non-class hero's hand
const SOF=k=>k==='soul'||!!(k&&typeof FUSED!=='undefined'&&FUSED[k]&&FUSED[k].base==='soul');
const petCol=u=>u.pel&&typeof ELEM!=='undefined'&&ELEM[u.pel]?ELEM[u.pel].c:({sguard:VIO,swarlord:'#7f9cff',sknight:'#7f9cff',shunter:'#d8ff9a'})[u.kind]||CYAN;
const _w=R.weapon;R.weapon=function(wk,tier){if(!SOF(wk))return _w.call(this,wk,tier);const G=this.G,g=new T.Group(),t=Math.max(0,tier|0),F=wk!=='soul'?FUSED[wk]:null,c=F?F.glow:TIERS[t].c;
  this.mesh(G.cyl,this.std('#2a2440',.6,.3),0,10,0,2.4,20,2.4,g);this.mesh(G.sph,this.std('#c9c3e8',.3,.9),0,1,0,3.2,3.2,3.2,g);
  this.mesh(G.sph,this.glowM(F?F.col:t>=2?VIO:CYAN,.9),0,27,0,7+t,7+t,7+t,g);this.mesh(G.sph,this.bas('#f2ffff'),0,27,0,3.4,3.4,3.4,g);
  for(const r of[0,1.1]){const q=this.mesh(G.torus,this.glowM(c,.6),0,27,0,10+t,10+t,10+t,g);q.rotation.set(r,r*.6,0)}
  const tip=new T.Object3D();tip.position.y=27;g.add(tip);g.userData.tip=tip;g.userData.glow=c;return g};
// translucent spectral copy of a creature's materials (fog-of-war shader kept)
R.spiritify=function(root,col){if(!root)return;const C=new T.Color(col);root.traverse(n=>{if(!n.isMesh||n.userData.spirit)return;n.userData.spirit=1;
  const f=m=>this.cached('spirit-'+col+m.uuid,()=>{const c=m.clone();c.onBeforeCompile=m.onBeforeCompile;c.customProgramCacheKey=m.customProgramCacheKey;
    c.transparent=true;c.opacity=.82;if(c.emissive){c.emissive=C.clone();c.emissiveMap=null;c.emissiveIntensity=.65}if(c.color)c.color=c.color.clone().lerp(C,.5);return c});
  n.material=Array.isArray(n.material)?n.material.map(f):f(n.material)})};
R.soulWisp=function(u){const G=this.G,root=new T.Group(),body=new T.Group();root.add(body);const c=petCol(u),hunt=u.kind==='shunter';
  const o={kind:'wisp',wisp:1,root,body,u,wcol:c};o.core=this.mesh(G.sph,this.bas('#effeff'),0,42,0,5,5,5,body);
  o.shell=this.mesh(G.sph,this.glowM(c,.55),0,42,0,11,11,11,body);o.halo=this.mesh(G.sph,this.glowM(c===CYAN?'#3fa8ff':c,.18),0,42,0,19,19,19,body);
  o.rings=[0,1.2].map(r=>{const q=this.mesh(G.torus,this.glowM(hunt?'#ffe27a':u.pel?'#ffffff':VIO,.7),0,42,0,13,13,13,body);q.rotation.set(r,r*.7,0);return q});
  o.lx=u.x;o.ly=u.y;o.rot=Math.atan2(u.fx,u.fy);o.walk=0;o.mvK=0;o.atkPh=0;this.addStatus(o,u);this.scene.add(root);this.objs.set(u.id,o);return o};
const _of=R.objFor;R.objFor=function(u){if(!u.pet||this.objs.get(u.id))return _of.call(this,u);
  if(u.kind==='swisp'||u.kind==='shunter')return this.soulWisp(u);let o;
  if(u.kind==='swolf'){u.kind='wolf';try{o=_of.call(this,u)}finally{u.kind='swolf'}}else o=_of.call(this,u);
  if(o){const me=typeof ME==='function'?ME():null,foe=me&&u.team!==me.team,col=petCol(u);try{this.spiritify(o.pose||o.body,col)}catch(e){}
    const rm=this.glowM(foe?'#ff5a6a':col,.55).clone();o.petRing=this.mesh(this.G.ring,rm,0,3,0,u.r+16,1,u.r+16,o.root);o.petRing.userData.ownMat=1;o.petCol=col}
  return o};
const _ab=R.animBig;R.animBig=function(o,u,Tm){if(!o.wisp)return _ab.call(this,o,u,Tm);
  const k=u.atkAnim>0?1.35:1,b=Math.sin(Tm*3+u.id)*6;o.body.position.y=b;o.core.scale.setScalar(5*k*(1+Math.sin(Tm*14)*.08));o.shell.scale.setScalar(11*k);
  o.rings[0].rotation.z=Tm*3;o.rings[1].rotation.x=Tm*2.4;
  if(Math.random()<.55)this.sp(true,{x:u.x+rand(-5,5),y:o.gy+42+b,z:u.y+rand(-5,5),vy:rand(5,30),l:.5,s:12,s1:2,c:o.wcol||CYAN,c2:u.kind==='shunter'?'#ffe27a':VIO,sp:u.pel==='fire'?3:u.pel==='frost'?4:3,a:.75})};
// soul bolts
const _pn=R.projNew;R.projNew=function(p,y,ang,Tm){if(p.kind!==16)return _pn.call(this,p,y,ang,Tm);const G=this.G;
  const o=this.get('soulP',()=>{const g=new T.Group();this.mesh(G.sph,this.glowM(CYAN,.85),0,0,0,1,1,1,g);this.mesh(G.sph,this.bas('#f2ffff'),0,0,0,.5,.5,.5,g);
    const q=this.mesh(G.torus,this.glowM(VIO,.6),0,0,0,1.5,1.5,1.5,g);q.rotation.x=1.2;return g});
  o.position.set(p.x,y,p.y);o.rotation.set(Tm*6,ang,0);o.scale.setScalar((p.r||10)*(1+Math.sin(Tm*28)*.1));
  if(Math.random()<.8)this.sp(true,{x:p.x+rand(-4,4),y:y+rand(-4,4),z:p.y+rand(-4,4),vy:rand(10,40),l:.35,s:p.r>12?22:13,s1:2,c:CYAN,c2:VIO,sp:4,a:.8})};
// summon / command / guardian / dismiss bursts
const near=(x,y)=>{const L=typeof listener==='function'?listener():null;return !L||Math.hypot(x-L.x,y-L.y)<(typeof visionR==='function'?visionR():1100)+200};
R.soulFx=function(e){if(!near(e.x,e.y))return;const gy=this.gY(e.x,e.y),v3=(t,o)=>this.v3&&this.v3(t,Object.assign({x:e.x,y:e.y},o));
  const puff=(x,y,n,c,up)=>{for(let i=0;i<n;i++){const a=Math.random()*6.28,s=rand(20,90);this.sp(true,{x:x+Math.cos(a)*s*.3,y:this.gY(x,y)+rand(10,60),z:y+Math.sin(a)*s*.3,vx:Math.cos(a)*s,vy:rand(40,up||160),vz:Math.sin(a)*s,l:rand(.5,.9),s:rand(14,26),s1:3,c,c2:VIO,sp:3,a:.85})}};
  if(e.k==='soulsum'){const C=e.c||CYAN;puff(e.x,e.y,this.hi?34:16,C,220);v3('vortex',{r:40,r1:110,h:210,c:C,c2:'#efffff',life:.9,spin:9,k1:1,k2:1,a:.8});v3('shock',{r:20,r1:150,c:C,c2:VIO,life:.6,h:90,ease:1});
    v3('flare',{r:60,r1:170,c:C,c2:'#ffffff',life:.35,height:60});if(this.hi&&this.flash)this.flash(e.x,gy+80,e.y,C,2600,420,.35)}
  else if(e.k==='soulcmd'){const g2=this.gY(e.x2,e.y2);if(this.bolt)this.bolt(e.x,gy+60,e.y,e.x2,g2+50,e.y2,CYAN,.22,3);
    v3('flare',{x:e.x2,y:e.y2,r:50,r1:140,c:VIO,c2:'#ffffff',life:.3,height:50});v3('shock',{x:e.x2,y:e.y2,r:10,r1:110,c:VIO,c2:CYAN,life:.45,h:70,ease:1});puff(e.x2,e.y2,this.hi?16:8,VIO,120)}
  else if(e.k==='soulgd'){const r=e.r||250,C=e.c||VIO;v3('beam',{r:26,r1:60,h:1200,c:C,c2:'#f4eeff',life:.9,spin:3,a:.7});v3('shock',{r:r*.15,r1:r,c:C,c2:CYAN,life:.6,h:150,ease:1,delay:.45});
    v3('crack',{r,r1:r,c:C,c2:'#ffffff',life:1.6,height:3,k1:7,delay:.45});v3('flare',{r:90,r1:260,c:C,c2:'#ffffff',life:.4,height:60,delay:.45});
    for(let j=0;j<(this.hi?12:6);j++){const an=j/12*6.28,d=r*rand(.5,.95);v3('spike',{x:e.x+Math.cos(an)*d,y:e.y+Math.sin(an)*d,r:rand(8,14),h:rand(60,130),angle:an,tilt:rand(.15,.45),c:C,c2:CYAN,life:1.2,delay:.47,height:-4})}
    if(this.v3Debris)setTimeout(()=>{try{this.v3Debris({x:e.x,y:e.y,r:r*.35,n:this.hi?12:5,c:'#5a5470',up:480,speed:300})}catch(err){}},450);
    puff(e.x,e.y,this.hi?40:18,C,260);if(this.hi&&this.flash)this.flash(e.x,gy+120,e.y,C,3000,r*3,.5)}
  else if(e.k==='soulgone'){puff(e.x,e.y,this.hi?14:7,e.pk===2?VIO:CYAN,140);v3('flare',{r:30,r1:80,c:CYAN,c2:'#ffffff',life:.25,height:40})}};
const _df=R.doFx;R.doFx=function(e,me,L){if(e&&typeof e.k==='string'&&e.k.slice(0,4)==='soul'){try{this.soulFx(e)}catch(err){}return}return _df.call(this,e,me,L)};
// spectral shimmer on the wolf and the guardian
const _fx=R.fxExtra;R.fxExtra=function(Tm,dt,me,L){const r=_fx.call(this,Tm,dt,me,L);
  try{for(const u of units){if(!u.pet||u.dead||u.kind==='swisp'||u.kind==='shunter')continue;const o=this.objs.get(u.id);if(!o||!o.root.visible)continue;
    if(o.petRing)o.petRing.material.opacity=.35+.2*Math.sin(Tm*4+u.id);
    const bg=u.kind==='sguard'||u.kind==='swarlord';if(Math.random()<dt*(bg?26:12))this.sp(true,{x:u.x+rand(-u.r,u.r),y:o.gy+rand(10,bg?180:50),z:u.y+rand(-u.r,u.r),vy:rand(20,60),l:.7,s:rand(10,20),s1:2,c:o.petCol||CYAN,c2:'#ffffff',sp:3,a:.6})}}catch(e){}
  return r};
// 2D view: a puff where spirits arrive and leave
if(typeof applyEvent==='function'){const _ae=applyEvent;applyEvent=function(e){if(e&&e.t==='fx'&&typeof e.k==='string'&&e.k.slice(0,4)==='soul'&&typeof burst==='function'&&!(view3D&&R.ok))burst(e.x,e.y,e.k==='soulgd'?VIO:CYAN,e.k==='soulgd'?40:16);return _ae.apply(this,arguments)}}
// spirit knights (the Legion tome): the Quaternius soldier the zombies use, jogging, with a sword and a shield and real sword swings
if(typeof QN_Z!=='undefined')QN_Z.sknight={tint:'#c8d8ff',s:1.06};
if(typeof R.qnZombie==='function'){const f=R.qnZombie;R.qnZombie=function(u){if(!u||u.kind!=='sknight')return f.call(this,u);
  u.kind='zrunner';let o;try{o=f.call(this,u)}finally{u.kind='sknight'}if(!o)return o;
  try{const B=o.bones,P={t:2,em:['#7f9cff',.45],gem:'#a8c8ff',glow:'#a8c8ff'};if(B.handslotr)this.qnW('sword',P,B.handslotr);if(B.armslotl||B.handslotl)this.qnW('shield',{t:2,em:['#7f9cff',.3],face:'#a8c8ff'},B.armslotl||B.handslotl);this.qnGrip(o,1,0);
    const c=this.qnClip&&this.qnClip('hero',o.bones,'Idle_Loop');if(c){o.act.Idle_Loop=o.mixer.clipAction(c);o.idleA.stop();o.idleA=o.act.Idle_Loop;o.idleA.play()}
    if(o.aura){o.aura.material=this.glowM('#7f9cff',.22);o.aura.userData.ownMat=1}}catch(e){}
  return o}}
if(typeof R.qnZomAnim==='function'){const f=R.qnZomAnim;R.qnZomAnim=function(o,u,T,dt,mv){if(!u||u.kind!=='sknight')return f.call(this,o,u,T,dt,mv);
  if(o.dying){o.dying=false;for(const k in o.act)o.act[k].stop();o.idleA.play();o.walkA.play()}
  if(u.rise>0&&!o.rose){o.rose=true;const a=o.act.LayToIdle;if(a){for(const k in o.act)if(o.act[k]!==a)o.act[k].setEffectiveWeight(0);a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.timeScale=1.6;a.setEffectiveWeight(1);a.play();o.riseA=a}}
  if(o.riseA){if(u.rise>0||o.riseA.isRunning()){o.mixer.update(dt);return}o.riseA.stop();o.riseA=null}
  const k=o.mvK;o.walkA.setEffectiveWeight(k);o.idleA.setEffectiveWeight(1-k);o.walkA.timeScale=clamp((mv||0)/240,.6,1.6);
  if(u.atkAnim>o.lastAtk+.05)this.qnPlay(o,'slashA',.42,6);else if(u.hurtT>o.lastHurt+.02&&!o.ov)this.qnPlay(o,'hit',.28,2);
  o.lastAtk=u.atkAnim||0;o.lastHurt=u.hurtT||0;this.qnOv(o,dt);o.mixer.update(dt);if(o.aura)o.aura.material.opacity=.2+.1*Math.sin(T*3+u.id)}}
// the old KayKit / Quaternius hero models know only the base families: a forged tome arms like the tome itself
for(const k of['kkArm','qnArm']){const f=R[k];if(typeof f!=='function')continue;R[k]=function(o,u){if(u&&u.wk&&u.wk!=='soul'&&SOF(u.wk)){const w=u.wk;u.wk='soul';try{return f.call(this,o,u)}finally{u.wk=w;if(o)o.wk=w}}return f.apply(this,arguments)}}
if(typeof R.p5Arm==='function'){const f=R.p5Arm;R.p5Arm=function(o,u){const r=f.apply(this,arguments);if(o&&u&&u.wk&&u.wk!=='soul'&&SOF(u.wk))o.wglowC=FUSED[u.wk].glow;return r}}
})();
