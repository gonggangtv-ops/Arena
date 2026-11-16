// ===================== KayKit character models (KayKit Adventurers 2.0 FREE, Kay Lousberg, CC0) =====================
// Heroes use rigged glTF characters when models.js + gltf.min.js are present; otherwise the procedural humanoid stays.
// The character you see follows the weapon you hold (classless: pick up a bow and you become the ranger).
const KK_FOR={none:'Rogue',sword:'Knight',axe:'Barbarian',dagger:'Rogue_Hooded',bow:'Ranger',fire:'Mage',frost:'Mage',gsword:'Knight',xbow:'Ranger',storm:'Mage',
  fMM:'Knight',fMR:'Barbarian',fMS_fire:'Knight',fMS_frost:'Knight',fMS_storm:'Knight',fRS_fire:'Ranger',fRS_frost:'Ranger',fRS_storm:'Ranger',fRR:'Ranger',fSS_steam:'Mage',fSS_blaze:'Mage',fSS_tempest:'Mage'};
const KK_UPPER=['spine','chest','upperarml','lowerarml','wristl','handl','handslotl','upperarmr','lowerarmr','wristr','handr','handslotr','head'];  // loader-sanitized bone names
// overlay segments: [clip, startSec, endSec] played over `dur` seconds on the upper body
const KK_SEG={throw:['Throw_U',.32,.95],use:['Use_Item_U',.18,.9],hit:['Hit_A_U',0,.6],chop:['1H_Melee_Attack_Chop_U',.15,.8],punch:['Unarmed_Melee_Attack_Punch_A_U',.1,.7]};
// night zombies (KayKit Skeletons, CC0): rotting tint, glowing eyes, own weapons
const KKZ={zombie:{tint:'#a8c29a',eye:'#7dff5a',w:[['Skeleton_Blade','r']]},zrunner:{tint:'#b8c8a8',eye:'#c8ff4a',w:[['Skeleton_Blade','r'],['Skeleton_Blade','l']]},
  zbrute:{tint:'#90a882',eye:'#ff6a3a',w:[['Skeleton_Axe','r'],['Skeleton_Shield_Large_A','l']]},zlord:{tint:'#a898c8',eye:'#ff3a6a',w:[['Skeleton_Staff','r']]}};
const KK_ARMOR=[null,null,['#9aa6b4',.12],['#d6e6ff',.2],['#ff7a2a',.32]];
Object.assign(R3,{
  kk:null,kkBusy:false,KK_S:47,  // one scale for every character so hats/helmets add height, bodies match
  kkLoad(){if(this.kk||this.kkBusy||!window.AR_KK||!window.AR_GLTF)return;this.kkBusy=true;
    let L;try{L=new AR_GLTF.GLTFLoader()}catch(e){console.warn('kk loader',e);return}
    const bin=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer};
    const keys=Object.keys(AR_KK),got={};let left=keys.length;
    const fin=()=>{try{this.kkSetup(got)}catch(e){console.warn('kk setup',e)}};
    keys.forEach((k,i)=>setTimeout(()=>{try{L.parse(bin(AR_KK[k]),'',g=>{got[k]=g;if(--left===0)fin()},e=>{console.warn('kk',k,e);if(--left===0)fin()})}catch(e){console.warn('kk',k,e);if(--left===0)fin()}},i*15))},
  kkSetup(got){const out={chars:{},clips:{},items:{}};
    for(const k in got){const g=got[k];
      if(k.startsWith('c_')){const sc=g.scene;sc.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(sc,true);out.chars[k.slice(2)]={scene:sc,h:(bb.max.y-bb.min.y)||1.3}}
      else if(k.startsWith('a_'))for(const c of g.animations)out.clips[c.name]=c;
      else if(k.startsWith('w_')){const sc=g.scene;sc.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(sc,true);out.items[k.slice(2)]={scene:sc,lo:bb.min,hi:bb.max}}}
    // upper-body variants so the legs keep running while the arms attack / cast / flinch
    for(const n of['Throw','Use_Item','Hit_A','1H_Melee_Attack_Chop','Unarmed_Melee_Attack_Punch_A']){const c=out.clips[n];if(!c)continue;
      out.clips[n+'_U']=new THREE.AnimationClip(n+'_U',c.duration,c.tracks.filter(t=>KK_UPPER.some(b=>t.name.startsWith(b+'.'))))}
    if(!out.chars.Rogue||!out.clips.Idle_A||!out.clips.Running_A)return;
    this.kk=out;
    // swap any procedural heroes already on screen
    for(const [id,o] of this.objs)if(o.u&&(o.u.hero||o.u.zombie)&&o.kind!=='kk'&&o.kind!=='kkz'){this.scene.remove(o.root);this.objs.delete(id)}},
  kkMat(src,tint,em,k){const key='kk'+(src.map?src.map.uuid:'')+(tint||'')+(em?em[0]+em[1]:'')+(this.hi?'h':'l');
    return this.cached(key,()=>{const p={map:src.map||null,color:tint?new THREE.Color('#ffffff').lerp(new THREE.Color(tint),.75):new THREE.Color('#ffffff')};
      if(em){p.emissive=new THREE.Color(em[0]);p.emissiveIntensity=em[1]}
      return this.fow(this.hi?new THREE.MeshStandardMaterial(Object.assign(p,{roughness:.72,metalness:0,envMap:this.envTex,envMapIntensity:.55})):new THREE.MeshLambertMaterial(p),{key:'kk'})})},
  kkZombie(u){const d=CREEPS[u.kind]||CREEPS.zombie,C=this.kk.chars[d.kk]||this.kk.chars.Skeleton_Minion;if(!C)return null;const Z=KKZ[u.kind]||KKZ.zombie;
    const o={kind:'kkz',u,ov:null,lastAtk:0,lastHurt:0,rose:false};o.root=new THREE.Group();o.body=new THREE.Group();o.root.add(o.body);
    const m=AR_GLTF.SkeletonUtils.clone(C.scene);m.scale.setScalar(this.KK_S*(u.lord?1.32:d.big?1.22:1));o.model=m;o.bones={};o.parts=[];
    m.traverse(n=>{if(n.isBone)o.bones[n.name]=n;if(n.isMesh){n.castShadow=!!this.hi;n.frustumCulled=false;const eye=/Eyes/.test(n.name||'');n.material=eye?this.glowM(Z.eye,1):this.kkMat(n.material,Z.tint,u.lord?['#3a1a5a',.25]:['#1a3a10',.12]);o.parts.push(n)}});
    o.body.add(m);o.mixer=new THREE.AnimationMixer(m);o.act={};for(const k in this.kk.clips)o.act[k]=o.mixer.clipAction(this.kk.clips[k]);
    o.walkA=o.act[u.kind==='zrunner'?'Running_A':'Walking_D_Skeletons']||o.act.Running_A;o.idleA=o.act.Idle_B||o.act.Idle_A;o.idleA.play();o.walkA.play();o.walkA.setEffectiveWeight(0);
    for(const [w,h] of Z.w){const bone=h==='r'?o.bones.handslotr:o.bones.handslotl;const g=bone&&this.kkItem(w,0);if(g)bone.add(g)}
    // a faint sickly glow under the feet so they read at night
    o.aura=this.mesh(this.G.disc,this.glowM(Z.eye,.22),0,1.5,0,(u.r+18)/(m.scale.x/this.KK_S),1,(u.r+18)/(m.scale.x/this.KK_S),o.root);return o},
  animKKZ(o,u,T,dt,mv){if(o.dying){o.dying=false;for(const k in o.act)o.act[k].stop();o.idleA.play();o.walkA.play()}
    if(u.rise>0&&!o.rose){o.rose=true;const a=o.act.Spawn_Ground_Skeletons;if(a){for(const k in o.act)if(o.act[k]!==a)o.act[k].setEffectiveWeight(0);a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.timeScale=1.3;a.setEffectiveWeight(1);a.play();o.riseA=a}}
    if(o.riseA){if(u.rise>0||o.riseA.isRunning()){o.mixer.update(dt);return}o.riseA.stop();o.riseA=null}
    const k=o.mvK;o.walkA.setEffectiveWeight(k);o.idleA.setEffectiveWeight(1-k);o.walkA.timeScale=clamp(mv/(u.kind==='zrunner'?230:120),.6,1.6);
    if(u.atkAnim>o.lastAtk+.05)this.kkPlay(o,u.kind==='zombie'||u.kind==='zrunner'?(Math.random()<.5?'chop':'punch'):'chop',u.big?.55:.4,6);
    else if(u.hurtT>o.lastHurt+.02&&!o.ov)this.kkPlay(o,'hit',.3,2);
    o.lastAtk=u.atkAnim||0;o.lastHurt=u.hurtT||0;
    if(o.ov){const v=o.ov;v.t+=dt;const e=Math.min(1,v.t/.06)*Math.min(1,Math.max(0,(v.dur-v.t)/.1));v.a.setEffectiveWeight(v.w*e);if(v.t>=v.dur){v.a.stop();o.ov=null}}
    o.mixer.update(dt);o.body.rotation.z=Math.sin(T*2+u.id)*.05*(1-k);   // the dead sway
    if(o.aura)o.aura.material.opacity=.26+.12*Math.sin(T*3+u.id);
    if(Math.random()<dt*3){const Z=KKZ[u.kind]||KKZ.zombie;this.sp(true,{x:u.x+rand(-12,12),y:o.gy+rand(30,90),z:u.y+rand(-12,12),vy:rand(15,40),l:rand(.8,1.4),s:10,s1:2,c:Z.eye,a:.7,sp:1,dr:.5})}},
  kkHero(u){const o={kind:'kk',u,at:-9,wk:'?',wt:-9,model:null,ov:null,lastAtk:0,lastCast:0,lastHurt:0};o.root=new THREE.Group();o.body=new THREE.Group();o.root.add(o.body);this.kkBuild(o,u);return o},
  kkBuild(o,u){if(o.model){o.body.remove(o.model);o.mixer.stopAllAction();o.mixer.uncacheRoot(o.model)}
    const name=KK_FOR[u.wk||'none']||'Rogue',C=this.kk.chars[name]||this.kk.chars.Rogue;
    const m=AR_GLTF.SkeletonUtils.clone(C.scene);m.scale.setScalar(this.KK_S);o.model=m;o.kkName=name;o.bones={};o.parts=[];
    m.traverse(n=>{if(n.isBone)o.bones[n.name]=n;if(n.isMesh){n.castShadow=!!this.hi;n.receiveShadow=false;n.frustumCulled=false;n.userData.src=n.material;o.parts.push(n)}});
    o.body.add(m);o.mixer=new THREE.AnimationMixer(m);o.act={};for(const k in this.kk.clips)o.act[k]=o.mixer.clipAction(this.kk.clips[k]);
    o.act.Idle_A.play();o.act.Running_A.play();o.act.Running_A.setEffectiveWeight(0);o.ov=null;o.dying=false;
    o.wpnR=o.wpnL=o.wtip=null;o.wglow=null;o.at=-9;o.wk=u.wk;o.wt=-9;this.kkPaint(o,u);this.kkArm(o,u)},
  kkPaint(o,u){const em=KK_ARMOR[clamp((u.at|0),0,4)]||null;
    for(const n of o.parts){const nm=n.name||'';const cape=/Cape|BearHat|Hat|Mask/.test(nm)&&!/Head$/.test(nm);
      n.material=this.kkMat(n.userData.src,cape?LOOKS[clamp(u.look|0,0,LOOKS.length-1)].c:null,cape?null:em)}o.at=u.at},
  kkItem(name,t,glow){const it=this.kk.items[name];if(!it)return null;const g=it.scene.clone(true);const em=glow||(t>=1?[TIERS[t].c,[0,.18,.3,.5,.8][t]]:null);
    g.traverse(n=>{if(n.isMesh){n.castShadow=!!this.hi;n.material=this.kkMat(n.material,null,em)}});
    const tip=new THREE.Object3D();const d=it.hi.clone().sub(it.lo);if(d.z>d.y)tip.position.set(0,0,it.hi.z);else tip.position.set(0,it.hi.y,0);g.add(tip);g.userData.tip=tip;return g},
  // the soul-hunter spear: no KayKit spear exists, so build one sized and aligned like the two-handed sword
  kkSpear(t,F){const ref=this.kk.items.sword_2handed_color;if(!ref)return null;const d=ref.hi.clone().sub(ref.lo),z=d.z>d.y,L=(z?d.z:d.y)*1.4;
    const outer=new THREE.Group(),g=new THREE.Group();outer.add(g);if(z)g.rotation.x=Math.PI/2;const G=this.G;
    this.mesh(G.cyl,this.std('#4a3424',.75,0),0,L*.2,0,L*.022,L,L*.022,g);this.mesh(G.cyl,this.std('#d8a840',.3,.95),0,L*.66,0,L*.04,L*.05,L*.04,g);
    const tip=this.mesh(G.cone4,this.std('#e8fff8',.15,.9,{emissive:F.glow,emissiveIntensity:.6+.15*t}),0,L*.8,0,L*.05,L*.24,L*.028,g);
    this.mesh(G.oct,this.glowM(F.glow,.5),0,L*.8,0,L*.08,L*.2,L*.08,g);for(const s of[-1,1]){const w=this.mesh(G.cone4,this.std('#c8d8d0',.2,.9),s*L*.05,L*.68,0,L*.018,L*.09,L*.012,g);w.rotation.z=s*1.1}
    const tp=new THREE.Object3D();tp.position.set(0,L*.92,0);g.add(tp);outer.userData.tip=tp;return outer},
  kkArm(o,u){for(const w of[o.wpnR,o.wpnL,o.book])if(w&&w.parent)w.parent.remove(w);o.wpnR=o.wpnL=o.book=o.wtip=null;
    const wk=u.wk,t=Math.max(0,u.wt|0),R=o.bones.handslotr,Lh=o.bones.handslotl;o.wk=wk;o.wt=u.wt;const F=wk&&FUSED[wk];
    o.wglow=F?F.glow:wk==='fire'?'#ffa040':wk==='frost'?'#9fe8ff':wk==='storm'?'#c8b4ff':t>=2?TIERS[t].c:null;if(!wk||!R||!Lh)return;
    const em=F?[F.glow,.5+.1*t]:null,put=(name,bone,e)=>{const g=this.kkItem(name,t,e||em);if(g)bone.add(g);return g};
    if(F){const a=F.arch;   // fused weapons: KayKit parts recombined + an element glow
      if(a==='MM'){o.wpnR=put('sword_1handed',R);o.wpnL=put('sword_1handed',Lh)}
      else if(a==='MR'){o.wpnR=this.kkSpear(t,F);if(o.wpnR)R.add(o.wpnR)}
      else if(a==='MS')o.wpnR=put('sword_2handed_color',R);
      else if(a==='RS')o.wpnL=put('bow_withString',Lh);
      else if(a==='RR'){o.wpnR=put('crossbow_2handed',R);o.wpnL=put('crossbow_2handed',Lh)}
      else{o.wpnR=put('staff',R,[ELEM[F.el].c,.6+.1*t]);o.book=put('spellbook_open',Lh,[ELEM[F.el2].c,.55])}
      const w=o.wpnR||o.wpnL;o.wtip=w&&w.userData.tip||null;return}
    if(wk==='sword'){o.wpnR=put('sword_1handed',R);o.wpnL=put('shield_badge_color',Lh)}
    else if(wk==='axe')o.wpnR=put('axe_2handed',R);
    else if(wk==='dagger'){o.wpnR=put('dagger',R);o.wpnL=put('dagger',Lh)}
    else if(wk==='bow')o.wpnL=put('bow_withString',Lh);
    else if(wk==='fire')o.wpnR=put('staff',R);
    else if(wk==='frost'){o.wpnR=put('wand',R);o.book=put('spellbook_open',Lh)}
    else if(wk==='gsword')o.wpnR=put('sword_2handed_color',R);
    else if(wk==='xbow')o.wpnR=put('crossbow_2handed',R);
    else if(wk==='storm'){o.wpnR=put('staff',R);o.book=put('spellbook_closed',Lh)}
    const w=o.wpnR||o.wpnL;o.wtip=w&&w.userData.tip||null},
  kkPlay(o,kind,dur,w){const s=KK_SEG[kind];const a=o.act[s[0]];if(!a)return;if(o.ov&&o.ov.a!==a)o.ov.a.stop();
    a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.time=s[1];a.timeScale=(s[2]-s[1])/dur;a.setEffectiveWeight(0);a.play();o.ov={a,t:0,dur,w:w||5}},
  kkDie(o,dt){if(!o.dying){o.dying=true;o.dieT=2.2;if(o.ov){o.ov.a.stop();o.ov=null}for(const k in o.act)o.act[k].setEffectiveWeight(0);
      const a=o.kind==='kkz'&&o.act.Death_C_Skeletons||o.act.Death_A;a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.timeScale=.9;a.setEffectiveWeight(1);a.play()}
    o.dieT-=dt;o.mixer.update(dt);const k=1-o.dieT/2.2;o.root.visible=o.dieT>0;o.root.position.y=o.gy-Math.max(0,k-.65)*70},
  animKK(o,u,T,dt,mv){
    if(o.dying){o.dying=false;o.act.Death_A.stop();o.act.Idle_A.play();o.act.Running_A.play()}
    if(KK_FOR[u.wk||'none']!==o.kkName){this.kkBuild(o,u)}else{if(o.wk!==u.wk||o.wt!==u.wt)this.kkArm(o,u);if(o.at!==u.at)this.kkPaint(o,u)}
    const k=o.mvK;const run=o.act.Running_A,idle=o.act.Idle_A;run.setEffectiveWeight(k);idle.setEffectiveWeight(1-k);run.timeScale=clamp(mv/230,.7,1.45);
    // one-shot upper-body moves keyed off the same timers the procedural rig used
    const ranged=!!(u.wk&&!WEAPONS[u.wk].melee),bw=u.wk&&FUSED[u.wk]?FUSED[u.wk].base:u.wk;
    if(u.atkAnim>o.lastAtk+.05&&!(u.spinT>0))this.kkPlay(o,ranged?'use':'throw',ranged?.42:.36);
    else if(u.castAnim>o.lastCast+.05)this.kkPlay(o,bw==='fire'||bw==='frost'||bw==='axe'||bw==='storm'||bw==='gsword'?'throw':'use',.5);
    else if(u.hurtT>o.lastHurt+.02&&!o.ov)this.kkPlay(o,'hit',.32,2.5);
    o.lastAtk=u.atkAnim||0;o.lastCast=u.castAnim||0;o.lastHurt=u.hurtT||0;
    if(o.ov){const v=o.ov;v.t+=dt;const e=Math.min(1,v.t/.07)*Math.min(1,Math.max(0,(v.dur-v.t)/.12));v.a.setEffectiveWeight(v.w*e);if(v.t>=v.dur){v.a.stop();o.ov=null}}
    o.mixer.update(dt);
    // procedural extras on top of the clips
    const B=o.bones;let by=0;
    if(u.spinT>0||u.lotusT>0){o.body.rotation.y=(o.body.rotation.y+dt*(u.spinT>0?22:26))%(Math.PI*2);if(B.upperarmr&&B.upperarml){B.upperarmr.rotation.z-=.9;B.upperarml.rotation.z+=.9}}else o.body.rotation.y=0;
    if(u.leap){if(o.leapT===undefined||o.leapT<0)o.leapT=0;o.leapT+=dt;const q=Math.min(1,o.leapT/.55);by+=Math.sin(Math.PI*q)*140}else o.leapT=-1;
    o.body.rotation.x=u.dash?.38:u.kb?-.3:0;o.body.position.y=by;
    if(u.stunT>0&&B.head)B.head.rotation.z+=Math.sin(T*6)*.3;
    if(o.wtip&&(u.castAnim>0||u.atkAnim>0)&&Math.random()<.5){o.wtip.getWorldPosition(this.v);this.sp(true,{x:this.v.x,y:this.v.y,z:this.v.z,vy:30,l:.35,s:22,s1:4,c:FUSED[u.wk]?FUSED[u.wk].glow:u.wk==='fire'?'#ffb050':u.wk==='storm'?'#d8c8ff':'#bfefff',sp:u.wk==='fire'?3:4})}}
});
