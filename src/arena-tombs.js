// ===================== THE CURSED FOREST'S DEAD · bone heaps and searchable knights' tombs (Arena Royale, owner 2026-11-23) =====================
// Owner: "ใส่ไฟล์1ตกแต่ง ในโซนต้องสาป ไฟล์ที่ 2 ตกแต่งในโซนต้องสาป แต่ กด ค้นหาของได้ ยิ่งนาน ยิ่งมีโอกาสได้ของดี"
//  · file 1, a heap of human bones ('bone-heap'), and file 2, a moss-grown knight lying on his tomb ('knight-tomb'), stand in the
//    Cursed Forest (REG land 1). a.js places them (WD.bones, WD.tombs: integer hash per cell, the same on every machine) with
//    collision circles; this file draws them and runs the search
//  · a tomb that has not been searched glows a sick green. Standing beside one: the 🔍 prompt (touch) or F starts a search, the
//    same again stops it and takes what was found. The longer the search, the better the find — the bar shows the chance of a
//    legendary find (0 · 3 · 7 · 15% after 0 · 3 · 6 · 9 s, TOMB_BANDS); at 10 s it ends by itself. Walking off, getting hit or
//    dying ends it early (whatever was found so far comes out); under 1.5 s nothing is found and the tomb stays untouched.
//    One search per tomb per match
//  · host-authoritative: the client asks ({t:'srch',i} / {t:'srchx'}), the host runs the timer on the hero (u.srch), rolls the loot
//    and tells everyone ({t:'tss',i,u} started · {t:'tse',i,u,ok} ended). Bots leave the tombs alone
const TOMB_R=130,TOMB_MAX=10,TOMB_MIN=1.5;
// tier weights (ธรรมดา · หายาก · มหากาพย์ · ตำนาน · SSR) by how long the search has run. Owner 2026-11-23 "ปรับ % ลงอีกหน่อยมันได้ง่ายไป
// ลดเหลือสัก 15%": a full search finds legendary or better about 15% of the time (85% of finds are a weapon or a rune, and 18% of
// those are tier 3+), 7% after 6 s, 3% after 3 s, never before (it was 60% for a full search)
const TOMB_BANDS=[[0,[70,27,3,0,0]],[3,[40,42,15,3,0]],[6,[20,42,30,7,1]],[9,[10,32,40,15,3]]];
const tombLegPct=b=>{const W=TOMB_BANDS[b][1],n=W.reduce((a,c)=>a+c,0);return Math.round(85*(W[3]+W[4])/n)};   // % of searches ending here that find tier 3+
const tombBand=s=>{let b=0;for(let i=0;i<TOMB_BANDS.length;i++)if(s>=TOMB_BANDS[i][0])b=i;return b};
function tombNear(u,r){const T=WD&&WD.tombs;if(!u||!T)return null;let b=null,bd=r||TOMB_R;for(const t of T){if(t.done)continue;const d=Math.hypot(t.x-u.x,t.y-u.y);if(d<bd){bd=d;b=t}}return b}
// ---- host ----
function tombStart(u,i){const T=WD&&WD.tombs,t=T&&T[i|0];if(!t||t.done||t.by!==undefined&&t.by!==u.id||!u||!u.hero||u.dead||u.srch||u.stunT>0)return;
  if(Math.hypot(t.x-u.x,t.y-u.y)>TOMB_R+30)return;t.by=u.id;u.srch={i:t.id,t0:gameT,x:u.x,y:u.y};emit({t:'tss',i:t.id,u:u.id});sndAt('pick',t.x,t.y)}
function tombStop(u,why){const S=u&&u.srch;if(!S)return;u.srch=null;const t=WD.tombs[S.i];if(!t)return;t.by=undefined;const s=Math.min(TOMB_MAX,gameT-S.t0),H=isHuman(u)?[u.id]:null;
  if(why==='dead'||s<TOMB_MIN){emit({t:'tse',i:t.id,u:u.id,ok:0});if(H&&why!=='dead')fxTextFor(u.x,u.y-84,'🔍 ยังไม่ทันเจออะไร','#c8c0b0',1.2,H);return}
  t.done=1;const best=tombLoot(u,t,s,H);emit({t:'tse',i:t.id,u:u.id,ok:1,b:best})}   // b: the best tier found (the effects match the find)
function tombLoot(u,t,s,H){const band=tombBand(s),W=TOMB_BANDS[band][1],fx=t.x+Math.sin(t.a)*70,fy=t.y+Math.cos(t.a)*70,r=Math.random();let best=0,gold=false;
  if(r<.5){const tier=pickTier(W);best=tier;dropItem({k:'w',x:fx,y:fy,wk:WK[Math.floor(Math.random()*WK.length)],tier})}
  else if(r<.85){const tier=pickTier(W);best=tier;dropItem({k:'r',x:fx,y:fy,tier})}
  else{gold=true;best=Math.min(1,band);dropItem({k:'c',x:fx,y:fy,n:2+band,gold:band>=1})}
  if(band>=2&&Math.random()<.6)dropItem(Math.random()<.5?{k:'p',x:fx+30,y:fy-20,b:Math.random()<.5?2:0}:{k:'c',x:fx+30,y:fy-20,n:2,gold:true});
  best=Math.min(4,best);sndAt(best>=3?'chest':'pick',t.x,t.y);
  if(H)fxTextFor(t.x,t.y-70,gold?'🔍 เจอเหรียญ!':'🔍 เจอของ'+TIERS[best].n+'!',gold?'#ffd35a':TIERS[best].c,1.8,H,best>=3?1:0);return best}
{const _ct=curTick;curTick=function(dt){_ct(dt);if(typeof net!=='undefined'&&net.mode==='client')return;try{
  for(const u of units){const S=u.srch;if(!S)continue;
    if(u.dead){tombStop(u,'dead');continue}
    if(u.stunT>0||(u.lastDmgT!==undefined&&u.lastDmgT>S.t0+.05)||Math.hypot(u.x-S.x,u.y-S.y)>40||gameT-S.t0>=TOMB_MAX)tombStop(u,'end')}}catch(e){}}}
{const _hd=hostOnData;hostOnData=function(cid,d){if(d&&(d.t==='srch'||d.t==='srchx')){const u=units.find(q=>q.ctrl===cid);if(u&&state==='play'){if(d.t==='srch')tombStart(u,d.i);else tombStop(u,'end')}return}
  return _hd.apply(this,arguments)}}
// every peer: who is searching which tomb, which are done
const TOMBS={on:new Map(),my:null,wd:null};
const tombFresh=()=>{if(TOMBS.wd!==WD){TOMBS.wd=WD;TOMBS.on.clear();TOMBS.my=null}};   // a new world: nobody is searching anything
{const _ae=applyEvent;applyEvent=function(e){if(e&&(e.t==='tss'||e.t==='tse')){tombFresh();const t=WD&&WD.tombs&&WD.tombs[e.i|0];
    if(e.t==='tss'){if(t)t.by=e.u;TOMBS.on.set(e.i|0,{u:e.u,t0:performance.now()});if(e.u===myId)TOMBS.my={i:e.i|0,t0:performance.now()}}
    else{TOMBS.on.delete(e.i|0);if(t){t.by=undefined;if(e.ok)t.done=1}if(e.u===myId)TOMBS.my=null;
      if(e.ok&&t&&typeof R3!=='undefined'&&R3.ok&&R3.tombDone)try{R3.tombDone(t,e.b|0)}catch(err){}}
    return}
  return _ae.apply(this,arguments)}}
// the local player: F (after a chest or a weapon to pick up) and the prompt
function tombPress(){const me=ME();if(!me||me.dead)return false;
  if(TOMBS.my){if(net.mode==='client')netSend({t:'srchx'});else tombStop(me,'end');return true}
  const t=tombNear(me);if(!t||t.by!==undefined)return false;if(net.mode==='client')netSend({t:'srch',i:t.id});else tombStart(me,t.id);return true}
if(typeof pressSwap==='function'){const _ps=pressSwap;pressSwap=function(){const me=ME();if(TOMBS.my)return tombPress();
  if(me&&!me.dead&&!boxNear(me)&&!swapCandidate(me)&&tombNear(me))return tombPress();return _ps.apply(this,arguments)}}
// ---- the prompt / progress pill ----
if(typeof CUR!=='undefined'&&CUR.el){
  const css=document.createElement('style');css.textContent=`
#arenaTomb{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 96px);transform:translateX(-50%);z-index:7;display:none;flex-direction:column;align-items:stretch;gap:6px;min-width:210px;
  padding:8px 16px 9px 12px;border:1px solid #7fbf6a;border-radius:20px;background:linear-gradient(180deg,#16231af5,#0a110cf5);color:#dff3cf;font:700 15px/1 system-ui,sans-serif;
  cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;box-shadow:0 4px 14px #000a,0 0 0 1px #000}
#arenaTomb .row{display:flex;align-items:center;gap:9px;white-space:nowrap}#arenaTomb b{font-size:21px;line-height:1}#arenaTomb small{margin-left:auto;font:600 11px system-ui,sans-serif;color:#cfe6c0;border:1px solid #7fbf6a88;border-radius:4px;padding:2px 5px}
#arenaTomb .bar{position:relative;height:9px;border-radius:5px;background:#05090699;border:1px solid #9fd08a55;overflow:hidden;display:none}
#arenaTomb .bar i{position:absolute;top:0;bottom:0;width:1px;background:#ffffff55}#arenaTomb .bar em{position:absolute;left:0;top:0;bottom:0;width:0;background:#dcdcdc}
#arenaTomb .tier{font:700 12px system-ui,sans-serif;display:none}#arenaTomb.on .bar,#arenaTomb.on .tier{display:block}#arenaTomb.on{border-color:#d8c07a}
@media(max-height:420px){#arenaTomb{bottom:calc(env(safe-area-inset-bottom,0px) + 64px);font-size:13px;min-width:180px}}`;document.head.appendChild(css);
  const el=document.createElement('div');el.id='arenaTomb';el.setAttribute('role','button');
  el.innerHTML='<div class="row"><b>🔍</b><span class="lb">ค้นร่างอัศวิน</span><small>F</small></div><div class="bar">'+TOMB_BANDS.slice(1).map(q=>'<i style="left:'+(q[0]/TOMB_MAX*100)+'%"></i>').join('')+'<em></em></div><div class="tier"></div>';
  document.body.appendChild(el);const lb=el.querySelector('.lb'),em=el.querySelector('em'),tr=el.querySelector('.tier');
  for(const k of['pointerup','pointermove','touchstart','wheel'])el.addEventListener(k,e=>e.stopPropagation());
  el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();tombPress()});
  const tierOf=s=>[0,1,2,3][tombBand(s)];let last='';
  function tombHud(){tombFresh();const me=ME(),sky=typeof DROP!=='undefined'&&DROP.sky&&DROP.sky(),on=state==='play'&&me&&!me.dead&&!sky&&!CUR.open;
    const M=TOMBS.my,near=on&&!M?tombNear(me):null,show=on&&(!!M||!!near&&near.by===undefined);
    if((el.style.display==='flex')!==show)el.style.display=show?'flex':'none';if(!show)return;
    if(M){const s=Math.min(TOMB_MAX,(performance.now()-M.t0)/1000),t=tierOf(s),k=s<TOMB_MIN?'wait':t;
      const sig='s'+k;if(sig!==last){last=sig;el.classList.add('on');lb.textContent=s<TOMB_MIN?'กำลังค้น…':'กำลังค้น… แตะเพื่อเก็บของ';
        const pct=tombLegPct(t);tr.textContent=s<TOMB_MIN?'ยังไม่เจออะไร':(pct?'ลุ้นของตำนาน '+pct+'%':'ได้ของธรรมดา–หายาก')+(t<3?' · ค้นต่อได้ของดีขึ้น':'');tr.style.color=TIERS[t].c;em.style.background=TIERS[t].c}
      em.style.width=(s/TOMB_MAX*100).toFixed(1)+'%'}
    else if(last!=='idle'){last='idle';el.classList.remove('on');lb.textContent='ค้นร่างอัศวิน';em.style.width='0%'}}
  setTimeout(()=>{const st=CUR.step;CUR.step=function(dt){const r=st.call(this,dt);try{tombHud()}catch(e){}return r}},0);
}
// ---- 3D: the heaps, the tombs, a green glow on the ones still unsearched, dust while someone searches ----
// Owner 2026-11-23 (later): "ศพอัศวินด้วย จะได้รู้ว่าออฟเจกนี้ค้นได้" — a tomb that can still be searched wears a breathing spirit
// light: a shell of its own mesh pushed out a little along the normals, bright at the silhouette (fresnel) and added over the
// stone, a brighter glow on the ground and pale motes drifting up from it; all of it goes out the moment it is searched
const TOMB_C='#8dffc8';
if(typeof R3!=='undefined'&&typeof THREE!=='undefined'){const P=R3,T=THREE,A=()=>window.CelestialAssets;
  const loaded=k=>{const a=A()&&A().get(k);return !!(a&&a.state==='loaded'&&a.inspection&&a.inspection.size)};
  const shellM=R=>{const m=new T.ShaderMaterial({uniforms:{uT:{value:0},uC:{value:new T.Color(TOMB_C).multiplyScalar(R.post?1.45:1.15)},uPush:{value:1.8}},
      transparent:true,depthWrite:false,blending:T.AdditiveBlending,
      vertexShader:`uniform float uPush;varying vec3 vN,vV;varying float vY;
void main(){mat4 M=modelMatrix*instanceMatrix;vec3 s2=max(vec3(dot(M[0].xyz,M[0].xyz),dot(M[1].xyz,M[1].xyz),dot(M[2].xyz,M[2].xyz)),vec3(1e-8));
 vec3 n=normalize(mat3(M)*(normal/s2));vec4 wp=M*vec4(position,1.);wp.xyz+=n*uPush;vN=n;vV=cameraPosition-wp.xyz;vY=position.y;
 gl_Position=projectionMatrix*viewMatrix*wp;}`,
      fragmentShader:`uniform float uT;uniform vec3 uC;varying vec3 vN,vV;varying float vY;
void main(){float f=1.-abs(dot(normalize(vN),normalize(vV)));float k=.85+.15*sin(uT*2.3);
 gl_FragColor=vec4(uC*(pow(f,2.2)*1.1+.07)*k*(.7+.45*clamp(vY,0.,1.)),1.);}`});m.userData.ownMat=1;return m};
  P.tombLit=function(i,on){const S=this.tombShell;if(!S)return;for(const im of S.ims){const a=im.instanceMatrix.array;
      if(on)for(let k=0;k<16;k++)a[i*16+k]=S.base[S.ims.indexOf(im)][i*16+k];else for(let k=0;k<16;k++)a[i*16+k]=0;im.instanceMatrix.needsUpdate=true}};
  P.buildDead=function(){this.tombGlow=null;this.tombShell=null;const B=WD.bones||[],TB=WD.tombs||[];
    if(B.length&&loaded('bone-heap')){const s=A().get('bone-heap').inspection.size,parts=this.celestialAsset('bone-heap');
      if(parts)for(const p of parts)this.instC(p.geo,p.mat,B,(q,add)=>{const w=104*q.s,k=w/s[0];add(q.x,this.gY(q.x,q.y)-3,q.y,w,s[1]*k,s[2]*k,0,q.a,0,null)},true,null,2600)}
    if(TB.length&&loaded('knight-tomb')){const s=A().get('knight-tomb').inspection.size,parts=this.celestialAsset('knight-tomb'),L=118,k=L/s[2];
      if(parts){for(const p of parts)this.instC(p.geo,p.mat,TB,(q,add)=>{add(q.x,this.gY(q.x,q.y)-2,q.y,s[0]*k,s[1]*k,L,0,q.a,0,null)},true,null,2600);
        // the spirit-light shell: one instance per tomb, indexed by tomb id so a searched one can be switched off
        const m=shellM(this),ims=[],base=[];for(const p of parts){const im=new T.InstancedMesh(p.geo,m,TB.length);im.frustumCulled=false;im.renderOrder=3;
          TB.forEach((q,i)=>this.setI(im,i,q.x,this.gY(q.x,q.y)-2,q.y,s[0]*k,s[1]*k,L,0,q.a,0,null));base.push(im.instanceMatrix.array.slice());this.scene.add(im);ims.push(im)}
        this.tombShell={m,ims,base};TB.forEach((q,i)=>{if(q.done)this.tombLit(i,0)})}}
    if(TB.length){const m=new T.MeshBasicMaterial({map:this.tex('wglow'),color:new T.Color(TOMB_C).multiplyScalar(this.post?1.3:1),transparent:true,opacity:.55,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});m.userData.ownMat=1;
      const g=new T.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);const im=new T.InstancedMesh(g,m,TB.length);im.frustumCulled=false;im.renderOrder=2;this.scene.add(im);
      this.tombGlow={im,m,t:0};const M=new T.Matrix4();TB.forEach((t,i)=>{M.makeTranslation(t.x,this.gY(t.x,t.y)+1.4,t.y).scale(new T.Vector3(t.done?.001:230,1,t.done?.001:230));im.setMatrixAt(i,M)});im.instanceMatrix.needsUpdate=true}};
  const _bp=P.buildProps;P.buildProps=function(){const r=_bp.apply(this,arguments);try{this.buildDead()}catch(e){if(!this._deadErr){this._deadErr=1;console.warn('dead',e)}}return r};
  P.tombDone=function(t,tier){tier=Math.max(0,Math.min(4,tier|0));const G=this.tombGlow;if(G){const M=new T.Matrix4().makeScale(0,0,0);G.im.setMatrixAt(t.id,M);G.im.instanceMatrix.needsUpdate=true}
    this.tombLit(t.id,0);const y=this.gY(t.x,t.y);if(this.pfxApi){this.pfxApi.smoke({x:t.x,y,z:t.y},this.hi?12:6,'#5a6a4a',60,{a:.45,size:1.3});this.pfxApi.sparks({x:t.x,y:y+40,z:t.y},this.hi?24:12,TIERS[tier].c,'#ffffff',260,240,{life:.8})}
    if(tier>=3&&this.pillar)this.pillar(t.x,t.y,240,TIERS[tier].c,.9)};   // a pillar of light only for a legendary find
  // a frame: the glow breathes; a tomb being searched coughs up dust and green motes
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r=_fx.apply(this,arguments);try{const G=this.tombGlow;if(G){G.t+=dt||0;G.m.opacity=.52+.1*Math.sin(G.t*2.3)}
      const S=this.tombShell;if(S&&G)S.m.uniforms.uT.value=G.t;
      // pale motes drift up from every tomb that can still be searched (near the camera only)
      if(dt>0&&this.sp&&L&&WD.tombs)for(const t of WD.tombs){if(t.done||Math.abs(t.x-L.x)>1500||Math.abs(t.y-L.y)>1100||Math.random()>dt*4)continue;
        const d=rand(-46,46),y=this.gY(t.x,t.y);this.sp(true,{x:t.x+Math.sin(t.a)*d+rand(-12,12),y:y+rand(18,40),z:t.y+Math.cos(t.a)*d+rand(-12,12),vx:rand(-6,6),vy:rand(22,42),vz:rand(-6,6),l:rand(1.4,2.2),s:rand(7,12),s1:2,c:Math.random()<.7?TOMB_C:'#f2fff6',sp:1,dr:.6})}
      if(TOMBS.on.size&&this.sp&&dt>0)for(const [i] of TOMBS.on){const t=WD.tombs&&WD.tombs[i];if(!t||Math.random()>dt*14)continue;const y=this.gY(t.x,t.y);
        this.sp(Math.random()<.5,{x:t.x+rand(-40,40),y:y+rand(10,50),z:t.y+rand(-40,40),vx:rand(-20,20),vy:rand(20,70),vz:rand(-20,20),l:rand(.6,1.2),s:rand(10,22),s1:2,c:Math.random()<.6?'#a8c890':'#d8ffb0',sp:1,dr:1.2})}}catch(e){}return r};
}
