// ===================== Realistic-proportion characters (Quaternius, CC0) =====================
// Heroes: Modular Character Outfits - Fantasy (peasant until you find armour, ranger gear after) on the Universal Base heads + hair,
// animated with the Universal Animation Library. Night zombies are the same villagers, risen. Goblins = Puglin, trolls = Imp, wolves = Wolf.
// Weapons are built in code (r9.js) to fit this rig's hands. Falls back to the older procedural figures when models2.js is missing.
const QN_S=74;                                    // world units per model metre: a hero stands ~132 tall
const QN_UP=/^(spine_0[123]|neck_01|Head|clavicle_|upperarm_|lowerarm_|hand_|index_|middle_|ring_|pinky_|thumb_)/;
// overlays: [clip, startSec, endSec] squeezed into the attack / cast time, upper body only
const QN_SEG={slashA:['Sword_Regular_A',.04,.42],slashB:['Sword_Regular_B',.06,.5],heavy:['Sword_Attack',.35,1.15],punch:['Punch_Jab',.1,.6],cast:['Spell_Simple_Shoot',0,.5],shoot:['Pistol_Shoot',0,.5],
  throw:['OverhandThrow',.45,1.05],hit:['Hit_Chest',0,.33],scratch:['Zombie_Scratch',.45,1.25],hook:['Melee_Hook',.02,.46]};
const QN_FING=/^(index|middle|ring|pinky)_0/,QN_WS=1.22;            // fingers are posed in code; weapons drawn a little over life size so they read from the game camera
const QN_HAIR=['#3a2a1e','#8a5a2a','#d8b46a','#1e1e22','#a23a1e','#e8e4da','#5a3a2a','#c88a4a'];
const QN_MOB={goblin:{k:'m_Puglin',h:84,atk:'slashA',dur:.4},ogre:{k:'m_Imp',h:178,atk:'heavy',dur:.6},wolf:{k:'m_Wolf',h:74}};
const QN_Z={zombie:{tint:'#86a878',s:1},zrunner:{tint:'#9ab088',s:.96},zbrute:{tint:'#6f8f62',s:1.28,w:'Skeleton_Axe'},zlord:{tint:'#9a86c0',s:1.4,w:'Skeleton_Staff',em:['#3a1a5a',.3]}};
Object.assign(R3,{
  qn:null,qnBusy:false,
  qnLoad(){if(this.qn||this.qnBusy||!window.AR_QN||!window.AR_GLTF)return;this.qnBusy=true;let L;try{L=new AR_GLTF.GLTFLoader()}catch(e){return}
    const bin=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer};
    const src=Object.assign({},AR_QN);
    const keys=Object.keys(src),got={};let left=keys.length;const fin=()=>{try{this.qnSetup(got)}catch(e){console.warn('qn setup',e)}};
    keys.forEach((k,i)=>setTimeout(()=>{try{L.parse(bin(src[k]),'',g=>{got[k]=g;if(--left===0)fin()},e=>{console.warn('qn',k,e);if(--left===0)fin()})}catch(e){if(--left===0)fin()}},i*12))},
  qnSetup(got){const Q={g:{},clips:{},up:{},items:{},rig:{},h:{}};
    for(const k in got){const g=got[k];
      if(k.startsWith('a_'))for(const c of g.animations)Q.clips[c.name]=c;
      else if(k.startsWith('w_')){const sc=g.scene;sc.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(sc,true);Q.items[k.slice(2)]={scene:sc,lo:bb.min,hi:bb.max}}
      else{Q.g[k]=g;if(k.startsWith('m_')||k.startsWith('c_')){g.scene.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(g.scene,true);Q.h[k]=(bb.max.y-bb.min.y)||1.7}}}
    if(!Q.clips.Idle_Loop||!Q.clips.Jog_Fwd_Loop)return;Q.mobOnly=!Q.g.c_MP||!Q.g.h_M;
    for(const n in QN_SEG){const c=Q.clips[QN_SEG[n][0]];if(c)Q.up[c.name]=new THREE.AnimationClip(c.name+'_U',c.duration,c.tracks.filter(t=>QN_UP.test(t.name)))}
    this.qn=Q;if(!Q.mobOnly)this.kk={items:{},chars:{},clips:{},qnOnly:true};   // full pack: the older KayKit path stays switched off; monsters-only pack: KayKit keeps the heroes
    for(const [id,o] of this.objs)if(o.u&&!o.qn&&((!Q.mobOnly&&(o.u.hero||o.u.zombie))||QN_MOB[o.u.kind])){this.scene.remove(o.root);this.objs.delete(id)}},
  // clips with only the tracks this rig has (the monsters lack finger tips), cached per rig
  qnClip(rig,bones,name,upper){const key=rig+(upper?'U':'')+name;let c=this.qn.rig[key];if(c!==undefined)return c;const s=upper?this.qn.up[name]:this.qn.clips[name];
    c=s?new THREE.AnimationClip(s.name,s.duration,s.tracks.filter(t=>bones[t.name.slice(0,t.name.lastIndexOf('.'))]&&!(rig==='hero'&&QN_FING.test(t.name)))):null;this.qn.rig[key]=c;return c},
  qnMat(src,o){o=o||{};const key='qn'+(src.map?src.map.uuid:src.uuid)+(o.tint||'')+(o.k||0)+(o.em?o.em[0]+o.em[1]:'')+(this.hi?'h':'l');
    return this.cached(key,()=>{const p={map:src.map||null,color:o.tint?new THREE.Color('#ffffff').lerp(new THREE.Color(o.tint),o.k===undefined?.5:o.k):new THREE.Color('#ffffff')};if(!src.map&&src.color){p.color=src.color.clone();if(o.tint)p.color.lerp(new THREE.Color(o.tint),o.k===undefined?.5:o.k)}if(src.vertexColors)p.vertexColors=true;
      if(src.emissiveMap){p.emissiveMap=src.emissiveMap;p.emissive=new THREE.Color('#ffffff');p.emissiveIntensity=1.6}else if(o.em){p.emissive=new THREE.Color(o.em[0]);p.emissiveIntensity=o.em[1]}
      if(src.transparent||src.alphaTest){p.alphaTest=.4;p.side=THREE.DoubleSide}
      return this.fow(this.hi?new THREE.MeshStandardMaterial(Object.assign(p,{roughness:.78,metalness:0,envMap:this.envTex,envMapIntensity:.45})):new THREE.MeshLambertMaterial(p),{key:'qn'})})},
  // clone a body and skin the extra parts (head, hair, brows) onto its bones
  qnAssemble(ch,parts,paint){const Q=this.qn,m=AR_GLTF.SkeletonUtils.clone(Q.g[ch].scene),bones={},meshes=[];m.traverse(n=>{if(n.isBone)bones[n.name]=n;if(n.isMesh)meshes.push(n)});
    for(const pk of parts){const g=Q.g[pk];if(!g)continue;const s=AR_GLTF.SkeletonUtils.clone(g.scene),add=[];s.traverse(n=>{if(n.isSkinnedMesh)add.push(n)});
      for(const n of add){const sk=new THREE.Skeleton(n.skeleton.bones.map(b=>bones[b.name]||bones.root||bones.pelvis),n.skeleton.boneInverses);n.removeFromParent();m.add(n);n.bind(sk,n.bindMatrix);n.userData.part=pk;meshes.push(n)}}
    for(const n of meshes){n.castShadow=!!this.hi;n.receiveShadow=false;n.frustumCulled=false;n.userData.src=n.userData.src||n.material;n.material=paint(n.userData.src,n)}
    return{m,bones,meshes}},
  qnKind(src){const n=src.map&&src.map.name||src.name||'';return /Hair/i.test(n)?'hair':/Eye/i.test(n)?'eye':/Ranger|Peasant/i.test(n)?'cloth':'skin'},
  // grip frames in each fist (+Y of the frame = out past the thumb), a strap frame on the left forearm, and code-posed fingers
  qnHold(o){const B=o.bones,mk=(bn,x,y,z,rx,rz)=>{const b=B[bn];if(!b)return null;const h=new THREE.Group();h.scale.setScalar(QN_WS);h.rotation.set(rx,0,rz);h.position.set(x,y,z);b.add(h);return h};
    B.handslotr=mk('hand_r',-.03,.085,0,Math.PI/2,0);B.handslotl=mk('hand_l',.03,.085,0,Math.PI/2,0);B.armslotl=mk('hand_l',-.05,-.07,0,0,Math.PI/2);o.fing=[];
    for(const sd of['r','l'])for(const f of['index','middle','ring','pinky'])for(let j=1;j<=3;j++){const b=B[f+'_0'+j+'_'+sd];if(b)o.fing.push([b,b.rotation.z,sd==='r'?1:-1,j,sd])}this.qnGrip(o,0,0)},
  qnGrip(o,r,l){const C=[[.3,.45,.3],[.9,1.2,.8]];for(const f of o.fing)f[0].rotation.z=f[1]+f[2]*C[(f[4]==='r'?r:l)?1:0][f[3]-1]},
  qnWM(c,r,m,em){return this.std(c,r,m,em?{emissive:em[0],emissiveIntensity:em[1]}:undefined)},
  qnW(kind,P,bone){if(!bone)return null;const g=QW.make(kind,(c,r,m,em)=>this.qnWM(c,r,m,em),P);if(this.hi)g.traverse(n=>{if(n.isMesh)n.castShadow=true});bone.add(g);return g},
  qnArm(o,u){for(const w of[o.wpnR,o.wpnL,o.book,o.shield])if(w&&w.parent)w.parent.remove(w);o.wpnR=o.wpnL=o.book=o.shield=o.wtip=null;
    const wk=u.wk,t=Math.max(0,u.wt|0),B=o.bones,R=B.handslotr,L=B.handslotl,F=wk&&FUSED[wk];o.wk=wk;o.wt=u.wt;
    o.wglow=F?F.glow:wk==='fire'?'#ffa040':wk==='frost'?'#9fe8ff':wk==='storm'?'#c8b4ff':t>=2?TIERS[t].c:null;if(!wk||!R||!L){this.qnGrip(o,0,0);return}
    const em=F?[F.glow,.45+.1*t]:t>=1?[TIERS[t].c,[0,.12,.2,.32,.5][t]]:null,P={t,em,gem:F?F.glow:t>=2?TIERS[t].c:null,glow:F?F.glow:null};
    const b=F?(F.arch==='SS'?'staff':F.arch):wk,staff=b==='staff'||b==='fire'||b==='storm';R.rotation.x=staff?2.75:Math.PI/2;
    const book=(open,c)=>{const g=this.qnW('book',{t,open,gemC:c,cover:open?'#2e2a5a':'#4a2440'},o.model);if(g){g.scale.setScalar(.85);g.position.set(.42,1.18,.16);g.rotation.set(.75,-.45,.12);o.bookY=1.18}return g};
    if(F){const a=F.arch;
      if(a==='MM'){o.wpnR=this.qnW('sword',P,R);o.wpnL=this.qnW('sword',P,L)}
      else if(a==='MR')o.wpnR=this.qnW('spear',P,R);
      else if(a==='MS')o.wpnR=this.qnW('gsword',P,R);
      else if(a==='RS')o.wpnL=this.qnW('bow',P,L);
      else if(a==='RR'){o.wpnR=this.qnW('xbow',P,R);o.wpnL=this.qnW('xbow',P,L);if(o.wpnL)o.wpnL.scale.setScalar(.85)}
      else{o.wpnR=this.qnW('staff',{t,em:null,gemC:ELEM[F.el].c,head:F.el==='storm'?'ring':''},R);o.book=book(true,ELEM[F.el2].c)}}
    else if(wk==='sword'){o.wpnR=this.qnW('sword',P,R);o.shield=this.qnW('shield',{t,em,face:LOOKS[clamp(u.look|0,0,LOOKS.length-1)].c},B.armslotl)}
    else if(wk==='axe')o.wpnR=this.qnW('axe',P,R);
    else if(wk==='dagger'){o.wpnR=this.qnW('dagger',P,R);o.wpnL=this.qnW('dagger',P,L)}
    else if(wk==='bow')o.wpnL=this.qnW('bow',P,L);
    else if(wk==='fire')o.wpnR=this.qnW('staff',{t,gemC:'#ff8a30'},R);
    else if(wk==='frost'){o.wpnR=this.qnW('wand',{t,gemC:'#9fe8ff'},R);o.book=book(true,'#9fe8ff')}
    else if(wk==='gsword')o.wpnR=this.qnW('gsword',P,R);
    else if(wk==='xbow')o.wpnR=this.qnW('xbow',P,R);
    else if(wk==='storm'){o.wpnR=this.qnW('staff',{t,gemC:'#b9a6ff',head:'ring'},R);o.book=book(false,'#b9a6ff')}
    this.qnGrip(o,o.wpnR?1:0,o.wpnL?1:0);const w=o.wpnR||o.wpnL;o.wtip=w&&w.userData.tip||null},
  qnActs(o,rig,names){o.mixer=new THREE.AnimationMixer(o.model);o.act={};o.up={};for(const n of names){const c=this.qnClip(rig,o.bones,n);if(c)o.act[n]=o.mixer.clipAction(c)}
    for(const n in QN_SEG){const c=this.qnClip(rig,o.bones,QN_SEG[n][0],true);if(c)o.up[n]=o.mixer.clipAction(c)}},
  qnPlay(o,kind,dur,w){const s=QN_SEG[kind],a=o.up[kind];if(!a)return;if(o.ov&&o.ov.a!==a)o.ov.a.stop();
    a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.time=s[1];a.timeScale=(s[2]-s[1])/dur;a.setEffectiveWeight(0);a.play();o.ov={a,t:0,dur,w:w||6}},
  qnOv(o,dt){if(!o.ov)return;const v=o.ov;v.t+=dt;const e=Math.min(1,v.t/.06)*Math.min(1,Math.max(0,(v.dur-v.t)/.12));v.a.setEffectiveWeight(v.w*e);if(v.t>=v.dur){v.a.stop();o.ov=null}},
  // ---- heroes ----
  qnHero(u){const o={kind:'qn',qn:1,u,at:-9,wk:'?',wt:-9,model:null,ov:null,lastAtk:0,lastCast:0,lastHurt:0,sw:0};o.root=new THREE.Group();o.body=new THREE.Group();o.root.add(o.body);this.qnBuild(o,u);return o},
  qnLookKey(u){return(u.look%2?'F':'M')+((u.at|0)>=1?'R':'P')+(u.look|0)+'_'+clamp(u.at|0,0,4)},
  qnBuild(o,u){if(o.model){o.body.remove(o.model);o.mixer.stopAllAction();o.mixer.uncacheRoot(o.model)}
    const fem=u.look%2===1,armed=(u.at|0)>=1,lk=u.look|0,ch='c_'+(fem?'F':'M')+(armed?'R':'P'),parts=[fem?'h_F':'h_M'];
    if(!armed)parts.push(fem?(lk%4===1?'x_Long':'x_Buns'):(lk%4===0?'x_SimpleParted':'x_Buzzed'),fem?'x_BrowFemale':'x_BrowRegular');if(!fem&&(lk===2||lk===6||lk===4))parts.push('x_Beard');
    const tint=LOOKS[lk].c,em=KK_ARMOR[clamp(u.at|0,0,4)]||null,hair=QN_HAIR[lk%QN_HAIR.length];
    const A=this.qnAssemble(ch,parts,src=>{const k=this.qnKind(src);return k==='cloth'?this.qnMat(src,{tint,k:.42,em}):k==='hair'?this.qnMat(src,{tint:hair,k:.9}):this.qnMat(src)});
    const m=A.m;m.scale.setScalar(QN_S);o.model=m;o.bones=A.bones;o.parts=A.meshes;o.lookKey=this.qnLookKey(u);o.body.add(m);this.qnHold(o);
    this.qnActs(o,'hero',['Idle_Loop','Jog_Fwd_Loop','Death01']);o.act.Idle_Loop.play();o.act.Jog_Fwd_Loop.play();o.act.Jog_Fwd_Loop.setEffectiveWeight(0);o.ov=null;o.dying=false;
    o.wpnR=o.wpnL=o.book=o.wtip=null;o.wglow=null;o.at=u.at;o.wk='?';o.wt=-9;this.qnArm(o,u)},
  qnAnim(o,u,T,dt,mv){if(o.mob)return this.qnMobAnim(o,u,T,dt,mv);if(o.zom)return this.qnZomAnim(o,u,T,dt,mv);
    if(o.dying){o.dying=false;o.act.Death01.stop();o.act.Idle_Loop.play();o.act.Jog_Fwd_Loop.play()}
    if(this.qnLookKey(u)!==o.lookKey)this.qnBuild(o,u);else if(o.wk!==u.wk||o.wt!==u.wt)this.qnArm(o,u);
    const k=o.mvK,run=o.act.Jog_Fwd_Loop,idle=o.act.Idle_Loop;run.setEffectiveWeight(k);idle.setEffectiveWeight(1-k);run.timeScale=clamp(mv/250,.7,1.5);
    const W=u.wk&&WEAPONS[u.wk],ranged=!!(W&&!W.melee),bw=W&&W.fused?W.base:u.wk,mag=bw==='fire'||bw==='frost'||bw==='storm';
    if(u.atkAnim>o.lastAtk+.05&&!(u.spinT>0)){o.sw^=1;this.qnPlay(o,!u.wk?'punch':mag?'cast':ranged?'shoot':bw==='axe'||bw==='gsword'?'heavy':o.sw?'slashA':'slashB',ranged?.4:bw==='axe'||bw==='gsword'?.46:.34)}
    else if(u.castAnim>o.lastCast+.05)this.qnPlay(o,mag?'cast':ranged?'throw':'heavy',.5);
    else if(u.hurtT>o.lastHurt+.02&&!o.ov)this.qnPlay(o,'hit',.3,3);
    o.lastAtk=u.atkAnim||0;o.lastCast=u.castAnim||0;o.lastHurt=u.hurtT||0;this.qnOv(o,dt);o.mixer.update(dt);
    const B=o.bones;let by=0;
    if(u.spinT>0||u.lotusT>0){o.body.rotation.y=(o.body.rotation.y+dt*(u.spinT>0?22:26))%(Math.PI*2);if(B.upperarm_r&&B.upperarm_l){B.upperarm_r.rotation.y-=1;B.upperarm_l.rotation.y+=1}}else o.body.rotation.y=0;
    if(u.leap){if(o.leapT===undefined||o.leapT<0)o.leapT=0;o.leapT+=dt;by+=Math.sin(Math.PI*Math.min(1,o.leapT/.55))*140}else o.leapT=-1;
    if(o.book){o.book.position.y=o.bookY+Math.sin(T*2.2+u.id)*.035;o.book.rotation.y=-.45+Math.sin(T*1.3+u.id)*.12}
    o.body.rotation.x=u.dash?.38:u.kb?-.3:0;o.body.position.y=by;if(u.stunT>0&&B.Head)B.Head.rotation.z+=Math.sin(T*6)*.3;
    if(o.wtip&&(u.castAnim>0||u.atkAnim>0)&&Math.random()<.5){o.wtip.getWorldPosition(this.v);this.sp(true,{x:this.v.x,y:this.v.y,z:this.v.z,vy:30,l:.35,s:22,s1:4,c:FUSED[u.wk]?FUSED[u.wk].glow:u.wk==='fire'?'#ffb050':u.wk==='storm'?'#d8c8ff':'#bfefff',sp:u.wk==='fire'?3:4})}},
  qnDie(o,dt){const D=o.wolf?1.3:2.3;if(!o.dying){o.dying=true;o.dieT=D;if(o.ov){o.ov.a.stop();o.ov=null}for(const k in o.act)o.act[k].setEffectiveWeight(0);
      const a=o.act.Death01||o.act.Death;if(a){a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.timeScale=1.15;a.setEffectiveWeight(1);a.play()}}
    o.dieT-=dt;o.mixer.update(dt);const k=1-o.dieT/D;o.root.visible=o.dieT>0;o.root.position.y=o.gy-Math.max(0,k-.72)*90},
  // ---- night zombies: risen villagers ----
  qnZombie(u){const Z=QN_Z[u.kind]||QN_Z.zombie,fem=u.id%3===0,o={kind:'qn',qn:1,zom:1,u,ov:null,lastAtk:0,lastHurt:0,rose:false};o.root=new THREE.Group();o.body=new THREE.Group();o.root.add(o.body);
    const parts=[fem?'h_F':'h_M'];if(u.id%2)parts.push(fem?'x_Long':'x_Buzzed');
    const A=this.qnAssemble(fem?'c_FP':'c_MP',parts,src=>this.qnMat(src,{tint:this.qnKind(src)==='cloth'?'#5a6650':Z.tint,k:this.qnKind(src)==='cloth'?.55:.72,em:Z.em||['#1a3a10',.1]}));
    const m=A.m;m.scale.setScalar(QN_S*Z.s);o.model=m;o.bones=A.bones;o.parts=A.meshes;o.body.add(m);this.qnHold(o);
    const walk=u.kind==='zrunner'?'Jog_Fwd_Loop':'Zombie_Walk_Fwd_Loop';this.qnActs(o,'hero',['Zombie_Idle_Loop',walk,'Death01','LayToIdle']);o.idleA=o.act.Zombie_Idle_Loop;o.walkA=o.act[walk];o.idleA.play();o.walkA.play();o.walkA.setEffectiveWeight(0);
    if(Z.w&&o.bones.handslotr){const st=Z.w==='Skeleton_Staff';if(st)o.bones.handslotr.rotation.x=2.75;this.qnW(st?'staff':'axe',{rust:1,gemC:'#b46bff',head:'ring'},o.bones.handslotr);this.qnGrip(o,1,0)}
    o.aura=this.mesh(this.G.disc,this.glowM(u.lord?'#ff3a6a':u.big?'#ff6a3a':'#7dff5a',.22),0,1.5,0,u.r+18,1,u.r+18,o.root);return o},
  qnZomAnim(o,u,T,dt,mv){if(o.dying){o.dying=false;for(const k in o.act)o.act[k].stop();o.idleA.play();o.walkA.play()}
    if(u.rise>0&&!o.rose){o.rose=true;const a=o.act.LayToIdle;if(a){for(const k in o.act)if(o.act[k]!==a)o.act[k].setEffectiveWeight(0);a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.timeScale=1.1;a.setEffectiveWeight(1);a.play();o.riseA=a}}
    if(o.riseA){if(u.rise>0||o.riseA.isRunning()){o.mixer.update(dt);return}o.riseA.stop();o.riseA=null}
    const k=o.mvK;o.walkA.setEffectiveWeight(k);o.idleA.setEffectiveWeight(1-k);o.walkA.timeScale=clamp(mv/(u.kind==='zrunner'?240:105),.6,1.7);
    if(u.atkAnim>o.lastAtk+.05)this.qnPlay(o,u.big?'heavy':'scratch',u.big?.55:.42,6);else if(u.hurtT>o.lastHurt+.02&&!o.ov)this.qnPlay(o,'hit',.28,2);
    o.lastAtk=u.atkAnim||0;o.lastHurt=u.hurtT||0;this.qnOv(o,dt);o.mixer.update(dt);
    if(o.aura)o.aura.material.opacity=.26+.12*Math.sin(T*3+u.id);
    if(Math.random()<dt*3)this.sp(true,{x:u.x+rand(-12,12),y:o.gy+rand(30,90),z:u.y+rand(-12,12),vy:rand(15,40),l:rand(.8,1.4),s:10,s1:2,c:u.lord?'#ff3a6a':'#7dff5a',a:.7,sp:1,dr:.5})},
  // ---- goblins (Puglin), trolls (Imp), wolves ----
  qnMob(u){const D=QN_MOB[u.kind],Q=this.qn;if(!D||!Q.g[D.k])return null;const o={kind:'qn',qn:1,mob:1,wolf:u.kind==='wolf',u,ov:null,lastAtk:0,lastHurt:0};o.root=new THREE.Group();o.body=new THREE.Group();o.root.add(o.body);
    const A=this.qnAssemble(D.k,[],src=>this.qnMat(src,o.wolf?{tint:'#7c8694',k:.6}:null));const m=A.m;m.scale.setScalar(D.h*(u.scale||1)/Q.h[D.k]);o.model=m;o.bones=A.bones;o.parts=A.meshes;o.body.add(m);
    if(o.wolf){o.mixer=new THREE.AnimationMixer(m);o.act={};o.up={};for(const c of Q.g[D.k].animations)o.act[c.name]=o.mixer.clipAction(c);o.idleA=o.act.Idle;o.walkA=o.act.Gallop||o.act.Walk}
    else{this.qnActs(o,D.k,['Idle_Loop','Jog_Fwd_Loop','Death01']);o.idleA=o.act.Idle_Loop;o.walkA=o.act.Jog_Fwd_Loop}
    if(!o.idleA||!o.walkA)return null;o.idleA.play();o.walkA.play();o.walkA.setEffectiveWeight(0);return o},
  qnMobAnim(o,u,T,dt,mv){if(o.dying){o.dying=false;for(const k in o.act)o.act[k].stop();o.idleA.play();o.walkA.play()}
    const k=o.mvK,D=QN_MOB[u.kind];o.walkA.setEffectiveWeight(k);o.idleA.setEffectiveWeight(1-k);o.walkA.timeScale=clamp(mv/(o.wolf?200:u.kind==='ogre'?190:210),.6,1.6);
    if(u.atkAnim>o.lastAtk+.05){if(o.wolf){const a=o.act.Attack;if(a){a.reset();a.setLoop(THREE.LoopOnce,1);a.timeScale=1.5;a.setEffectiveWeight(4);a.play()}}else this.qnPlay(o,D.atk,D.dur,6)}
    else if(!o.wolf&&u.hurtT>o.lastHurt+.02&&!o.ov)this.qnPlay(o,'hit',.28,2);
    o.lastAtk=u.atkAnim||0;o.lastHurt=u.hurtT||0;this.qnOv(o,dt);o.mixer.update(dt)}
});
// the new characters take over from the KayKit ones whenever models2.js is there
(()=>{const P=R3,_load=P.kkLoad;P.kkLoad=function(){if(window.AR_QN){this.qnLoad();if(window.AR_QN.c_MP)return}return _load.call(this)}})();
