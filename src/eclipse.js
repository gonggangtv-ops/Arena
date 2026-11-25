// ===================== ECLIPSE REIGN (Phase 3): Celestial Overlord, Dark Sentinel, Lunar Construct, legendary weapons =====================
// Game logic only (host-authoritative, same contracts as every other mob): CREEPS defs, mobThink, aoe(), dealDamage, kill.
// Clients learn about everything through the existing snapshot rows / aoe rows / events; rendering lives in eclipse-fx.js.
// The Meshy creatures are STATIC meshes (no skin, no clips) — eclipse-fx.js moves them procedurally and says so.
const ECL_KINDS=['mslash','eburst','crain','vcage','ueclipse','usafe','hstrike','gslam','lscythe','lslash','lburst'];
AOE_KINDS.push(...ECL_KINDS);
Object.assign(AOE_COL,{mslash:'#9fd0ff',eburst:'#b08aff',crain:'#cfe4ff',vcage:'#a070ff',ueclipse:'#6a4aff',usafe:'#fff2b0',hstrike:'#ffcf8a',gslam:'#9fd0ff',lscythe:'#c08aff',lslash:'#bfe8ff',lburst:'#a8b8ff'});
const EK=['overlord','sentinel','construct'];
// other Eclipse-style bosses plug in here (Arena Royale's Snow Queen, snow-queen.js): {detect, wake(u), lose(u), act(u,t,d,R,dt)}.
// They get the Overlord's boss treatment: boss stats and phases, no stagger, regen only after a while out of combat.
const ECL_EXT={};
const eclBoss=u=>!!u&&(u.ecl==='overlord'||!!ECL_EXT[u.ecl]);
Object.assign(CREEPS,{
  overlord:{name:'Celestial Overlord · จอมราชันย์สุริยคราส',hp:16000,dmg:120,armor:8,spd:140,r:64,atkT:1.6,range:120,xp:1600,col:'#4a5a9a',leash:900,ecl:'overlord'},
  sentinel:{name:'Dark Sentinel · ผู้เฝ้ายามทมิฬ',hp:1500,dmg:46,armor:5,spd:172,r:28,atkT:1.25,range:82,xp:210,col:'#3a3f55',leash:560,ecl:'sentinel'},
  construct:{name:'Lunar Construct · โกเลมจันทรา',hp:3600,dmg:80,armor:10,spd:92,r:50,atkT:2.3,range:104,xp:400,col:'#8a90a8',leash:400,ecl:'construct'}
});
// legendary weapons ride on the existing weapon kinds; the legend id lives in spare bits of the weapon variant (wv bits 15-16)
const LEG=[null,
  {key:'lunar-greatsword',wk:'gsword',n:'Lunar Greatsword · ดาบใหญ่จันทรา',c:'#bfe8ff',every:3},
  {key:'eclipse-scythe',wk:'axe',n:'Eclipse Scythe · เคียวสุริยคราส',c:'#c08aff',every:4},
  {key:'moon-staff',wk:'frost',n:'Moon Staff · คทาจันทรา',c:'#a8b8ff',every:3}];
const lgOf=u=>u?(u.lg!==undefined?u.lg|0:((u.wv|0)>>15)&3):0;
const lgWv=(lg,tier)=>(wvRoll(tier)&32767)|(lg<<15);

// ---- world: one Eclipse altar (the ancient camp closest to the map centre) + sentinel / construct camps ----
// Runs inside genWorld on host and clients alike: kinds change, ids and positions do not, so WD stays identical everywhere.
function eclWorld(w){if(!CURSED)return;
  const anc=w.camps.filter(c=>c.tier==='ancient'),lar=w.camps.filter(c=>c.tier==='large');if(!anc.length)return;
  const alt=anc.slice().sort((a,b)=>Math.hypot(a.x-CX,a.y-CY)-Math.hypot(b.x-CX,b.y-CY))[0];
  const byId=new Map(w.mobs.map(m=>[m.id,m]));
  const keep=alt.mem[0],gone=new Set(alt.mem.slice(1));const bm=byId.get(keep);
  bm.kind='overlord';bm.x=alt.x;bm.y=alt.y;alt.mem=[keep];alt.tier='eclipse';alt.maxRespawn=0;
  w.mobs=w.mobs.filter(m=>!gone.has(m.id));
  w.eclAltar={x:alt.x,y:alt.y,r:520,camp:alt.id};
  const farA=c=>Math.hypot(c.x-alt.x,c.y-alt.y)>1600;   // keep the boss fight a one-on-one encounter
  anc.filter(c=>c!==alt).forEach((c,i)=>{if(i%3||!farA(c))return;const m=byId.get(c.mem[0]);if(m&&m.kind==='golem'){m.kind='construct';c.tier='construct'}});
  lar.forEach((c,i)=>{if(i%3||!farA(c))return;let n=0;for(const id of c.mem){const m=byId.get(id);if(m&&n<2&&(m.kind==='ogre'||m.kind==='wolf')){m.kind='sentinel';n++}}c.tier='sentinel'});
}
{const _gw=genWorld;genWorld=function(seed){const w=_gw(seed);eclWorld(w);return w}}

// ---- units ----
function eclInit(u){const d=u.def;u.ecl=d.ecl;u.elite=u.elite||d.ecl!=='sentinel';u.golem=d.ecl!=='sentinel';u.big=1;
  u.ecT=0;u.busyT=0;u.poise=0;u.blockT=0;u.blkCd=3;u.combo=null;u.patrol=null;u.summons=u.summons||[];
  if(d.ecl==='overlord'||ECL_EXT[d.ecl]){const sc=u.scale||1;u.maxHp=Math.round(d.hp*sc);u.hp=u.maxHp;u.atkDmg=d.dmg*sc;u.armorV=d.armor;u.spdBase=d.spd;u.r=d.r;u.name=d.name;u.ph=0;u.cds={};u.mr=.25}}
{const _mk=mkMob;mkMob=function(m){const u=_mk(m);if(u.def&&u.def.ecl){eclInit(u);if(m.summon){u.summon=1;u.camp=-1}}return u}}
{const _sms=setMobStats;setMobStats=function(u,sc){_sms(u,sc);if(u.ecl)eclInit(u)}}
let eclSid=300000;
function eclSummon(boss,kind,x,y){const m={id:eclSid++,x,y,kind,camp:-1,summon:1};const u=mkMob(m);u.home={x:boss.home.x,y:boss.home.y};u.aggro=boss.aggro;addUnit(u);boss.summons.push(u.id);
  emit({t:'ec',k:'sum',id:u.id,x:x|0,y:y|0});return u}

// one event type for everything the renderer / HUD wants to know (host applies it too through emit)
function eclEv(e){const u=UMAP.get(e.id);
  if(e.k==='cast'&&u){u.ecA={n:e.n,t:e.d,d:e.d}}
  else if(e.k==='blk'&&u){u.blockT=e.d;u.ecA={n:'block',t:e.d,d:e.d}}
  else if(e.k==='stg'&&u){u.ecA={n:'stagger',t:.9,d:.9}}
  else if(e.k==='ph'&&u){u.ph=e.p;u.ecA={n:'phase',t:1.6,d:1.6}}
  else if(e.k==='die'&&u){u.dead=true;u.hp=0}   // clients stop receiving dead mobs; this makes the boss bar and AI views agree
  if(typeof R3!=='undefined'&&R3.eclEvent)try{R3.eclEvent(e,u)}catch(err){}}   // visuals never break host logic
{const _ae=applyEvent;applyEvent=function(e){if(e&&e.t==='ec'){eclEv(e);return}return _ae.apply(this,arguments)}}

// safe zones (Ultimate Eclipse) carve a hole into an otherwise unavoidable area
{const _ha=hitArea;hitArea=function(a,u){if(a.safe&&Math.hypot(u.x-a.safe.x,u.y-a.safe.y)<a.safe.r)return false;return _ha(a,u)}}

// block (Sentinel front), weak point (Construct back), poise -> stagger
{const _dd=dealDamage;dealDamage=function(t,amt,type,src,quiet,crit){
  if(t&&t.ecl&&src&&src!==t&&amt>0&&!t.dead){const ang=Math.atan2(src.y-t.y,src.x-t.x),fa=Math.atan2(t.fy,t.fx);let da=Math.abs(ang-fa);if(da>Math.PI)da=Math.PI*2-da;
    if(t.ecl==='sentinel'&&t.blockT>0&&da<1.25){amt*=.25;if(!quiet&&Math.random()<.5)fxE('shield',{id:t.id,x:t.x|0,y:t.y|0})}
    else if(t.ecl==='construct'&&da>2.1){amt*=1.6;crit=true;if(!quiet&&gameT-(t._wpT||0)>.6){t._wpT=gameT;fxTextFor(t.x,t.y-t.r-40,'จุดอ่อน!','#9fe8ff',.9,src.hero&&isHuman(src)?[src.id]:[])}}
    if(!eclBoss(t)){t.poise+=amt;const P=t.ecl==='sentinel'?t.maxHp*.22:t.maxHp*.3;if(t.poise>P&&t.stunT<=0){t.poise=0;t.stunT=t.ecl==='sentinel'?.9:1.2;t.combo=null;t.busyT=0;t.blockT=0;emit({t:'ec',k:'stg',id:t.id})}}}
  return _dd(t,amt,type,src,quiet,crit)}}

// ---- AI ----
const eclHeroNear=(u,R)=>{
  let best=null,bd=R;
  for(const h of tickHeroes){
    if(h.dead||h.reviveT>0)continue;
    const dx=h.x-u.x,dy=h.y-u.y;
    if(Math.abs(dx)>=bd||Math.abs(dy)>=bd)continue;
    const d=Math.hypot(dx,dy);
    if(d<bd&&(!h.hidden||d<170)){bd=d;best=h}
  }
  return best
};
function eclCast(u,n,d){u.busyT=Math.max(u.busyT,d);emit({t:'ec',k:'cast',id:u.id,n,d})}
function eclThink(u,dt){
  if(u.blockT>0)u.blockT-=dt;if(u.busyT>0)u.busyT-=dt;if(u.blkCd>0)u.blkCd-=dt;if(u.ecT>0)u.ecT-=dt;u.poise=Math.max(0,u.poise-u.maxHp*.04*dt);
  const L=u.def.leash||500,dh=Math.hypot(u.x-u.home.x,u.y-u.home.y);
  // detect: these hunt on sight (the old camps only woke up when hit)
  const X=ECL_EXT[u.ecl];
  if(!u.aggro||u.aggro.dead){u.aggro=null;const h=eclHeroNear(u,X?X.detect:u.ecl==='overlord'?560:u.ecl==='sentinel'?400:300);
    if(h&&Math.hypot(h.x-u.home.x,h.y-u.home.y)<L){u.aggro=h;if(u.ecl==='overlord'){sndAt('roar',u.x,u.y);emit({t:'f',s:'☾ Celestial Overlord ตื่นจากแท่นสุริยคราส!'});emit({t:'k',a:10,x:u.x|0,y:u.y|0})}else if(X&&X.wake)X.wake(u)}}
  // a target that ran off: switch to whoever is still fighting inside the arena before giving up
  const ok=h=>h&&!h.dead&&Math.hypot(h.x-u.home.x,h.y-u.home.y)<L+140&&(!h.hidden||Math.hypot(h.x-u.x,h.y-u.y)<170);
  if(u.aggro&&!ok(u.aggro)){let nb=null,bd=1e9;for(const h of units){if(!h.hero||h.reviveT>0||!ok(h))continue;const d=Math.hypot(h.x-u.x,h.y-u.y);if(d<bd&&d<L){bd=d;nb=h}}if(nb)u.aggro=nb}
  const t=u.aggro;let mx=0,my=0;if(t)u.idleT=0;else u.idleT=(u.idleT||0)+dt;
  if(t&&!t.dead&&dh<L&&Math.hypot(t.x-u.home.x,t.y-u.home.y)<L+140&&(!t.hidden||Math.hypot(t.x-u.x,t.y-u.y)<170)){
    const d=Math.hypot(t.x-u.x,t.y-u.y)||1;u.fx=(t.x-u.x)/d;u.fy=(t.y-u.y)/d;const R=u.range+t.r;
    if(d>R-8&&u.busyT<=0&&!u.combo){mx=u.fx;my=u.fy}
    if(u.stunT<=0){if(X)X.act(u,t,d,R,dt);else if(u.ecl==='overlord')overlordAct(u,t,d,R,dt);else if(u.ecl==='sentinel')sentinelAct(u,t,d,R,dt);else constructAct(u,t,d,R,dt)}
  }else{
    if(u.aggro&&u.ecl==='overlord'&&u.hp<u.maxHp)emit({t:'f',s:'☾ Celestial Overlord กลับสู่แท่นบูชาและฟื้นพลัง'});else if(u.aggro&&X&&X.lose&&u.hp<u.maxHp)X.lose(u);
    u.aggro=null;u.combo=null;u.blockT=0;
    if(dh>30){mx=(u.home.x-u.x)/dh;my=(u.home.y-u.y)/dh}else if(u.ecl==='sentinel'){ // patrol a loop around the camp
      if(!u.patrol||Math.hypot(u.x-u.patrol.x,u.y-u.patrol.y)<24||(u.patrol.t-=dt)<0){const a=Math.random()*6.283,rr=60+Math.random()*130;u.patrol={x:u.home.x+Math.cos(a)*rr,y:u.home.y+Math.sin(a)*rr,t:6}}}
    if(u.patrol&&u.ecl==='sentinel'&&dh<=220){const px=u.patrol.x-u.x,py=u.patrol.y-u.y,pl=Math.hypot(px,py)||1;mx=px/pl*.42;my=py/pl*.42;u.fx=px/pl;u.fy=py/pl}
    if(!eclBoss(u)||u.idleT>4)u.hp=Math.min(u.maxHp,u.hp+u.maxHp*(eclBoss(u)?.05:.25)*dt);if(eclBoss(u)&&u.hp>=u.maxHp)u.ph=0}
  if(u.busyT>0){mx*=.15;my*=.15}if(u.blockT>0){mx*=.35;my*=.35}
  return{mx,my}}
{const _mt=mobThink;mobThink=function(u,dt){return u.ecl?eclThink(u,dt):_mt(u,dt)}}
const eclSwing=(u,t,mul,c)=>{const ang=Math.atan2(t.y-u.y,t.x-u.x);emit({t:'w',id:u.id,a:+ang.toFixed(2),r:u.range+u.r,c:c||'#9fd0ff',k:4});u.atkAnim=.3;
  for(const o of units){if(o.dead||!isEnemy(u,o))continue;const d=Math.hypot(o.x-u.x,o.y-u.y);if(d>u.range+u.r+o.r)continue;let da=Math.abs(Math.atan2(o.y-u.y,o.x-u.x)-ang);if(da>Math.PI)da=Math.PI*2-da;if(da<.9||o===t)dealDamage(o,u.atkDmg*mul*(isNight()?1.25:1),'p',u)}sndAt('hit',u.x,u.y)};
function sentinelAct(u,t,d,R,dt){
  // block when the hero is swinging at it from the front
  if(u.blkCd<=0&&!u.combo&&u.blockT<=0&&(t.atkAnim>0||t.castAnim>0)&&d<R+90&&Math.random()<dt*3){u.blkCd=5.5;emit({t:'ec',k:'blk',id:u.id,d:1.3})}
  if(u.blockT>0)return;
  if(u.combo){u.combo.t-=dt;if(u.combo.t<=0){const n=u.combo.n++;eclSwing(u,t,n===2?1.35:.62,n===2?'#bfe8ff':'#8a9ad8');if(n===2){u.combo=null;u.atkCd=u.atkCdBase}else u.combo.t=.34}return}
  if(d<R+10&&u.atkCd<=0&&u.busyT<=0){u.combo={n:0,t:.12};eclCast(u,'combo',1.05)}}
function constructAct(u,t,d,R,dt){
  if(u.busyT>0)return;
  if(u.ecT<=0&&d<300){u.ecT=8;eclCast(u,'slam',1.4);aoe({x:u.x,y:u.y,r:270,dmg:u.atkDmg*1.7,type:'p',owner:u,delay:1.1,kind:'gslam',stun:.6,big:true,vis:.5});return}
  if(d<R+20&&u.atkCd<=0){u.atkCd=u.atkCdBase;eclCast(u,'heavy',1.1);const ang=Math.atan2(t.y-u.y,t.x-u.x);
    aoe({x:u.x,y:u.y,r:230,len:230,ang,arc:.6,shape:'cone',dmg:u.atkDmg*1.5,type:'p',owner:u,delay:.85,kind:'hstrike',vis:.45})}}
// ---- Celestial Overlord: phase A 100-70% · B 70-35% · C <35% ----
const OVC={A:{basic:1,slash:6.5,heavy:9},B:{basic:1,slash:5.5,heavy:8,burst:10,summon:22},C:{basic:.85,slash:4.5,heavy:7,burst:9,rain:9,cage:12,ult:28}};
function overlordAct(u,t,d,R,dt){const hr=u.hp/u.maxHp,ph=hr>.7?0:hr>.35?1:2;
  if(ph>(u.ph|0)){u.ph=ph;u.cds=ph===2?{ult:9,cage:3,rain:2}:{};eclCast(u,'phase',1.6);u.stunT=0;emit({t:'ec',k:'ph',id:u.id,p:ph});emit({t:'k',a:14,x:u.x|0,y:u.y|0});sndAt('roar',u.x,u.y);
    emit({t:'a',s:ph===1?'☾ สุริยคราสเริ่มต้น — Overlord เรียกบริวาร!':'☾ คราสเต็มดวง — ระวัง Ultimate Eclipse!',d:3});
    aoe({x:u.x,y:u.y,r:300,dmg:u.atkDmg*.8,type:'m',owner:u,delay:.9,kind:'eburst',kb:520,vis:.6,big:true});return}
  const P=['A','B','C'][u.ph|0],C=OVC[P],sp=u.ph===2?.72:u.ph===1?.86:1,cd=u.cds;for(const k in cd)cd[k]-=dt;
  if(u.busyT>0)return;const ready=k=>C[k]&&!(cd[k]>0),use=(k,b)=>{cd[k]=C[k]*(b||1)};
  const dmg=u.atkDmg,ang=Math.atan2(t.y-u.y,t.x-u.x);
  if(ready('ult')){use('ult');eclCast(u,'ultimate',3.4);const a=Math.random()*6.283,sd=420;const sx=u.x+Math.cos(a)*sd,sy=u.y+Math.sin(a)*sd;
    aoe({x:u.x,y:u.y,r:1050,dmg:dmg*4.2,type:'m',owner:u,delay:3.2,kind:'ueclipse',safe:{x:sx,y:sy,r:170},big:true,vis:1.2});
    aoe({x:sx,y:sy,r:170,dmg:0,type:'m',owner:u,delay:3.2,kind:'usafe',fxOnly:true,vis:.6});
    emit({t:'a',s:'☾ ULTIMATE ECLIPSE — วิ่งเข้าวงแสงจันทร์!',d:3});return}
  if(ready('summon')){use('summon');eclCast(u,'summon',1.2);const live=u.summons.filter(id=>{const m=UMAP.get(id);return m&&!m.dead}).length;
    for(let i=0;i<Math.min(2,4-live);i++){const a=ang+Math.PI+(i?.8:-.8);eclSummon(u,'sentinel',u.x+Math.cos(a)*170,u.y+Math.sin(a)*170)}return}
  if(ready('cage')&&d<700){use('cage');eclCast(u,'cage',1.1);aoe({x:t.x,y:t.y,r:220,dmg:dmg*2.1,type:'m',owner:u,delay:1.9,kind:'vcage',root:1.4,vis:.7});return}
  if(ready('rain')&&d<900){use('rain');eclCast(u,'rain',1.3);const tg=units.filter(h=>h.hero&&!h.dead&&Math.hypot(h.x-u.x,h.y-u.y)<900);
    for(let i=0;i<(u.ph===2?11:8);i++){const h=tg[i%Math.max(1,tg.length)]||t,rr=Math.random()*260,a=Math.random()*6.283;aoe({x:h.x+Math.cos(a)*rr,y:h.y+Math.sin(a)*rr,r:95,dmg:dmg*1.05,type:'m',owner:u,delay:.9+i*.17,kind:'crain',vis:.35})}return}
  if(ready('burst')&&d<460){use('burst');eclCast(u,'burst',1.4);aoe({x:u.x,y:u.y,r:440,dmg:dmg*1.6,type:'m',owner:u,delay:1.25,kind:'eburst',kb:420,vis:.6,big:true});return}
  if(ready('heavy')&&d<520){use('heavy');eclCast(u,'heavy',1.2);aoe({x:t.x,y:t.y,r:175,dmg:dmg*2,type:'p',owner:u,delay:1,kind:'hstrike',stun:.5,vis:.45,big:true});return}
  if(ready('slash')&&d<560){use('slash');eclCast(u,'slash',.95);aoe({x:u.x,y:u.y,r:560,len:560,ang,arc:.42,shape:'cone',dmg:dmg*1.45,type:'m',owner:u,delay:.75,kind:'mslash',vis:.45});return}
  if(d<R+12&&u.atkCd<=0){u.atkCd=u.atkCdBase*sp;eclCast(u,'basic',.45);eclSwing(u,t,1,'#9fd0ff')}}

// ---- death: the Overlord drops all three legendary weapons ----
{const _k=kill;kill=function(t,src){if(!t||t.dead)return;const r=_k.apply(this,arguments);
  if(t&&t.ecl==='overlord'){emit({t:'f',s:'☾ Celestial Overlord ถูกโค่นแล้ว! อาวุธในตำนานร่วงลงบนแท่นบูชา'});emit({t:'k',a:16,x:t.x|0,y:t.y|0});emit({t:'ec',k:'die',id:t.id,x:t.x|0,y:t.y|0});
    for(let i=1;i<=3;i++){const a=i/3*6.283;dropItem({k:'w',x:t.x+Math.cos(a)*90,y:t.y+Math.sin(a)*90,wk:LEG[i].wk,tier:4,wv:lgWv(i,4)})}
    for(const id of t.summons||[]){const m=UMAP.get(id);if(m&&!m.dead)kill(m,null)}}
  return r}}

// ---- legendary weapon procs (every Nth basic attack; damage formula of the weapon is untouched) ----
{const _b=basic;basic=function(u,ft){const r=_b(u,ft);if(r&&CURSED&&u.hero){const lg=lgOf(u),L=LEG[lg];if(L&&u.wk===L.wk){u.lgN=(u.lgN||0)+1;if(u.lgN>=L.every){u.lgN=0;lgProc(u,lg,ft)}}}return r}}
function lgProc(u,lg,ft){const ang=Math.atan2(u.fy,u.fx),dmg=u.atkDmg;
  if(lg===1)aoe({x:u.x,y:u.y,r:330,len:330,ang,arc:.62,shape:'cone',dmg:dmg*1.2,type:'p',owner:u,delay:.05,kind:'lslash',vis:.4});
  else if(lg===2)aoe({x:u.x,y:u.y,r:200,dmg:dmg*1.05,type:'p',owner:u,delay:.05,kind:'lscythe',vis:.45,follow:u});
  else if(lg===3){const t=ft||nearestEnemy(u,u.range+70,true)||{x:u.x+Math.cos(ang)*260,y:u.y+Math.sin(ang)*260};aoe({x:t.x,y:t.y,r:160,dmg:dmg*1.15,type:'m',owner:u,delay:.35,kind:'lburst',vis:.45})}}
{const _ew=equipWeapon;equipWeapon=function(u,it){const lg=((it.wv|0)>>15)&3;_ew(u,it);if(lg&&isHuman(u))fxTextFor(u.x,u.y-112,'☾ อาวุธในตำนาน: '+LEG[lg].n,LEG[lg].c,2.4,[u.id])}}
