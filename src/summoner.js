// ===================== SUMMONER · คัมภีร์วิญญาณ (Claude, 2026-11-18 · Arena Royale only) =====================
// A fifth weapon family: the Spirit Tome. Whoever holds it becomes the Summoner and fights through spirits:
//  Q  อัญเชิญภูติ       — call spirit wisps (ranged soul bolts); from level 3 a spirit wolf joins them
//  E  บัญชาวิญญาณ      — hurl a soul lance at a foe; every spirit you own hunts it, empowered and healed
//  R  อัญเชิญผู้พิทักษ์จันทรา — a Lunar Guardian crashes down (slam + stun) and fights at your side
// Spirits are host-authoritative mob units (pet:1) on the summoner's team. Their hits count as the summoner's,
// so kill credit, PvP damping, weapon traits and runes all work unchanged. Clients learn them from the mob snapshot
// row [..., -2, PK index, owner id] and drop them like any other summon when they leave the snapshot.
(()=>{
'use strict';
const K='soul',PK=['swisp','swolf','sguard'];window.PK=PK;
WEAPONS[K]={n:'คัมภีร์วิญญาณ',ic:'📖',melee:0,range:470,atkT:.95,dmg:.8,hp:60,armor:1,magic:1,pspd:860,mp:170,mpR:.7,col:'#8fe8ff',
  names:['ลูกแก้ววิญญาณ','ลูกแก้วดวงจันทร์','คัมภีร์ดวงวิญญาณ','คัมภีร์ปฐมกาล','คัมภีร์เทพอัญเชิญ SSR'],
  desc:'อาชีพ Summoner: อัญเชิญภูติยิงพลังวิญญาณ สั่งวิญญาณทั้งหมดรุมเป้าหมาย เรียกผู้พิทักษ์จันทรายักษ์ลงมาสู้ข้างกาย'};
WK.push(K);AW.splice(WK.length-1,0,K);   // network index: base weapons first, then fused (both ends build the same list)
SK[K]=[{ic:'👻',n:'อัญเชิญภูติ',cd:[13,12,11,10],mp:[70,75,80,85],range:[0,0,0,0]},
       {ic:'🔮',n:'บัญชาวิญญาณ',cd:[10,9.5,9,8.5],mp:[55,60,65,70],range:[640,660,680,700]},
       {ic:'🗿',n:'ผู้พิทักษ์จันทรา',cd:[75,65,55],mp:[160,210,260],range:[600,640,680]}];
SKV[K]=[{n:[2,2,2,2],wolf:[0,0,1,1],hp:[200,280,360,440],dmg:[18,25,32,40],t:[16,17,18,19]},
        {dmg:[70,110,150,190],buff:[.5,.6,.7,.8],t:4},
        {dmg:[200,300,400],stun:[1,1.2,1.4],r:[240,260,280],hp:[1600,2400,3200],gd:[55,80,105],t:[18,20,22]}];
SKA[K]=['self','unit','area'];
const PDEF={swisp:{name:'ภูติวิญญาณ',hp:200,dmg:20,armor:1,spd:270,r:16,atkT:1.05,range:380,xp:6,col:'#8fe8ff'},
  swolf:{name:'หมาป่าวิญญาณ',hp:420,dmg:28,armor:3,spd:258,r:24,atkT:.85,range:62,xp:10,col:'#9fd0ff'},
  sguard:{name:'ผู้พิทักษ์จันทรา',hp:2000,dmg:70,armor:8,spd:165,r:46,atkT:1.6,range:112,xp:30,col:'#b9a6ff',big:1}};
for(const k of PK)CREEPS[k]=Object.assign({pet:1},PDEF[k]);
const MAXW=4;let pid=400000,purgeT=0;
function mkPet(id,kind,x,y,owner){const d=CREEPS[kind];const u=mkUnit({id,type:kind,kind,def:d,name:d.name,mob:true,pet:true,summon:1,camp:-1,owner,team:owner?owner.team:-1,
    x,y,home:{x,y},big:!!d.big,golem:kind==='sguard'});setMobStats(u,1);u.tx=x;u.ty=y;
  if(kind==='sguard'){u.ecl='construct';u.poise=0;u.busyT=0;u.blockT=0;u.elite=1}return u}
const petsOf=(o,kind)=>units.filter(u=>u.pet&&!u.dead&&u.owner===o&&(!kind||u.kind===kind));
function dismiss(u,quiet){if(u.dead)return;u.hp=0;u.dead=true;u.deadAt=gameT;emit({t:'pd',id:u.id});fxE('die',{id:u.id,x:u.x|0,y:u.y|0});if(!quiet)fxE('soulgone',{x:u.x|0,y:u.y|0,pk:PK.indexOf(u.kind)})}
function purge(){if(!units.some(u=>u.pet&&u.dead&&gameT-(u.deadAt||0)>2.5))return;units=units.filter(u=>!(u.pet&&u.dead&&gameT-(u.deadAt||0)>2.5));UMAP=new Map(units.map(u=>[u.id,u]))}
function spawnPet(o,kind,x,y,hp,dmg,life,slot){let p={x,y};if(blockedAt(p,20)||houseAt(p)!==houseAt(o))p={x:o.x,y:o.y};
  const u=mkPet(pid++,kind,p.x,p.y,o);u.maxHp=Math.round(hp);u.hp=u.maxHp;u.atkDmg=dmg;u.lifeT=life;u.slot=slot;u.rise=kind==='sguard'?.55:.25;u.fx=o.fx;u.fy=o.fy;addUnit(u);return u}
// ---- skills ----
const _c0=cast0;cast0=function(u,i,ap){if(u.wk!==K)return _c0(u,i,ap);
  if(u.dead||u.stunT>0||u.dash||u.leap||u.kb||u.fuseT>0)return false;const L=u.skl[i];if(!L)return false;
  const s=SK[K][i],li=L-1;if(u.cd[i]>0)return false;const cost=s.mp[li];
  if(u.mp<cost){if(isHuman(u))emit({t:'s',n:'nomana',x:0,y:0,g:1,v:[u.id]});return false}
  const V=SKV[K][i],A=u.atkDmg,SA=(1+spellAmp(u))*SKILL_K,rngS=s.range[li]||400;purge();
  if(ap&&!(Math.hypot(ap.x-u.x,ap.y-u.y)>8))ap=null;
  const ft=!isHuman(u)&&u.ai.tgt&&!u.ai.tgt.dead?u.ai.tgt:null;
  if(u.invisT>0){u.invisT=0;u.bsReady=true}
  if(i===0){const n=V.n[li]+V.wolf[li],live=petsOf(u).filter(p=>p.kind!=='sguard').sort((a,b)=>a.lifeT-b.lifeT);
    for(let k=0;k<live.length+n-MAXW;k++)dismiss(live[k]);
    const hp=V.hp[li]+.05*u.maxHp,dmg=(V.dmg[li]+.32*A)*(1+spellAmp(u)),ids=[];
    for(let k=0;k<n;k++){const wolf=k>=V.n[li],a=Math.atan2(u.fy,u.fx)+Math.PI+(k-(n-1)/2)*.9,d=wolf?70:90;
      const p=spawnPet(u,wolf?'swolf':'swisp',u.x+Math.cos(a)*d,u.y+Math.sin(a)*d,wolf?hp*1.8:hp,wolf?dmg*1.35:dmg,V.t[li],k);ids.push(p.id)}
    u.castAnim=.5;u.revealT=1.2;sndAt('orb',u.x,u.y);sndAt('shield',u.x,u.y);fxE('soulsum',{id:u.id,x:u.x|0,y:u.y|0,n})}
  else if(i===1){const t=ft&&dist(u,ft)<rngS+60?ft:ap?enemyNear(u,ap,rngS):nearestEnemy(u,rngS+40,true);if(!t||dist(u,t)>rngS+80)return false;
    const d=dist(u,t)||1,nx=(t.x-u.x)/d,ny=(t.y-u.y)/d;u.fx=nx;u.fy=ny;u.revealT=1.2;u.castAnim=.45;
    proj(u,nx,ny,{spd:1250,r:16,dmg:V.dmg[li]*SA+.6*A,type:'m',kind:16,life:(rngS+120)/1250,big:1});
    for(const p of petsOf(u)){p.focus=t;p.pbT=V.t;p.pbAmt=V.buff[li];p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.25);p.atkCd=Math.min(p.atkCd,.1)}
    sndAt('blink',u.x,u.y);fxE('soulcmd',{id:u.id,x:u.x|0,y:u.y|0,x2:t.x|0,y2:t.y|0,tid:t.id})}
  else{const tg=ft?{x:ft.x,y:ft.y}:ap?ap:aim(u,rngS);const p=landSpot(u,clampTo(u,tg,rngS));const r=V.r[li];
    for(const g of petsOf(u,'sguard'))dismiss(g);
    const d=Math.hypot(p.x-u.x,p.y-u.y)||1;u.fx=(p.x-u.x)/d;u.fy=(p.y-u.y)/d;u.castAnim=.6;u.revealT=1.5;
    aoe({x:p.x,y:p.y,r,dmg:V.dmg[li]*SA+.8*A,type:'m',owner:u,delay:.5,kind:'slam',stun:V.stun[li],big:true});
    const g=spawnPet(u,'sguard',p.x,p.y,V.hp[li]+.12*u.maxHp,(V.gd[li]+.45*A)*(1+spellAmp(u)),V.t[li],0);g.fx=u.fx;g.fy=u.fy;
    sndAt('slam',p.x,p.y);sndAt('roar',p.x,p.y);fxE('soulgd',{id:g.id,x:p.x|0,y:p.y|0,r});emit({t:'k',a:8,x:p.x|0,y:p.y|0})}
  u.cd[i]=s.cd[li]*cdMul(u);u.mp-=cost;return true};
// ---- spirit AI ----
function pick(u,O){let best=null,bs=1e9;const bt=O.ai&&O.ai.tgt&&!O.ai.tgt.dead&&isEnemy(O,O.ai.tgt)&&dist(O,O.ai.tgt)<720?O.ai.tgt:null;if(bt&&!isHuman(O))return bt;
  const lh=O.lastHit&&gameT-O.lastHit.time<5&&!O.lastHit.src.dead&&dist(O,O.lastHit.src)<720?O.lastHit.src:null;if(lh)return lh;
  for(const o of units){if(o.dead||!isEnemy(O,o)||o.reviveT>0)continue;const dO=dist(O,o);if(dO>560)continue;
    let s;if(o.hero){if(!visibleTo(o,O))continue;s=dO}else if(o.pet)s=dO+120;else if(o.mob&&(o.aggro===O||o.aggro&&o.aggro.pet&&o.aggro.owner===O))s=dO+200;else continue;
    if(s<bs){bs=s;best=o}}
  return best}
function attack(u,t){const buff=u.pbT>0,dmg=u.atkDmg*(buff?1+u.pbAmt:1)*(isNight()?1.1:1),d=dist(u,t)||1,nx=(t.x-u.x)/d,ny=(t.y-u.y)/d,ang=Math.atan2(ny,nx);
  u.atkCd=u.atkCdBase/(buff?1.35:1);u.atkAnim=.3;
  if(u.kind==='swisp'){proj(u,nx,ny,{spd:900,r:9,dmg,type:'m',kind:16,life:(u.range+120)/900});return}
  if(u.kind==='swolf'){dealDamage(t,dmg,'p',u);emit({t:'w',id:u.id,a:+ang.toFixed(2),r:u.range+u.r,c:'#9fe8ff',k:2});return}
  eclCast(u,'basic',.7);emit({t:'w',id:u.id,a:+ang.toFixed(2),r:u.range+u.r,c:'#c9b6ff',k:1});
  for(const o of units){if(o.dead||!isEnemy(u,o))continue;const dd=dist(u,o);if(dd>u.range+u.r+o.r)continue;let da=Math.abs(Math.atan2(o.y-u.y,o.x-u.x)-ang);if(da>Math.PI)da=Math.PI*2-da;
    if(o===t||da<.9)dealDamage(o,o===t?dmg:dmg*.6,'p',u)}sndAt('hit',u.x,u.y)}
function petThink(u,dt){const O=u.owner;
  if(!O||O.dead||O.wk!==K||(u.lifeT-=dt)<=0){dismiss(u);return{mx:0,my:0}}
  if(u.rise>0){u.rise-=dt;return{mx:0,my:0}}if(u.pbT>0)u.pbT-=dt;
  if(u.kind==='sguard'){u.busyT=Math.max(0,(u.busyT||0)-dt);u.slT=(u.slT===undefined?3:u.slT)-dt}
  let t=u.focus&&!u.focus.dead&&u.focus.reviveT<=0&&dist(O,u.focus)<1100?u.focus:null;if(!t)u.focus=null;
  if(!t){u.pt=(u.pt||0)-dt;if(u.pt<=0||u.tgt&&u.tgt.dead){u.pt=.35;u.tgt=pick(u,O)}t=u.tgt&&!u.tgt.dead&&isEnemy(O,u.tgt)&&dist(O,u.tgt)<780?u.tgt:null}
  let mx=0,my=0;const fast=u.pbT>0?1.25:1;
  if(t){const d=dist(u,t),R=u.range+t.r;u.fx=(t.x-u.x)/(d||1);u.fy=(t.y-u.y)/(d||1);
    if(d>R-8){const v=navDir(u,t.x,t.y);mx=v.x*fast;my=v.y*fast}
    if(d<R+8&&u.atkCd<=0&&u.stunT<=0)attack(u,t);
    if(u.kind==='sguard'&&u.slT<=0&&d<230&&u.stunT<=0){u.slT=7;eclCast(u,'slam',1);aoe({x:u.x,y:u.y,r:230,dmg:u.atkDmg*1.5,type:'p',owner:u,delay:.55,kind:'slam',stun:.6,big:true});sndAt('slam',u.x,u.y)}}
  else{const back=Math.atan2(O.fy,O.fx)+Math.PI,a=back+((u.slot||0)-1)*.85,D=u.kind==='sguard'?150:u.kind==='swolf'?80:95,px=O.x+Math.cos(a)*D,py=O.y+Math.sin(a)*D,dd=Math.hypot(px-u.x,py-u.y);
    if(dist(u,O)>1150&&!blockedAt({x:px,y:py},u.r)){u.x=px;u.y=py;fxE('soulgone',{x:px|0,y:py|0,pk:PK.indexOf(u.kind)})}
    else if(dd>28){const v=navDir(u,px,py),k=dd>220?1.1:Math.max(.3,dd/220);mx=v.x*k;my=v.y*k;u.fx=v.x;u.fy=v.y}}
  if(u.kind==='swisp'){const m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m}}
  return{mx:mx*fast,my:my*fast}}
// the tome's basic attack is a soul bolt (projectile kind 16) instead of the default arrow
const _b=basic;basic=function(u,ft){const n=projs.length,r=_b(u,ft);if(u.wk===K)for(let i=n;i<projs.length;i++)if(projs[i].owner===u&&!projs[i].kind){projs[i].kind=16;projs[i].r=11}return r};
const _mt=mobThink;mobThink=function(u,dt){return u.pet?petThink(u,dt):_mt(u,dt)};
const _na=nightAggro;nightAggro=function(u){if(u.pet)return;return _na(u)};
// spirits strike for their summoner: kill credit, PvP damping, traits and runes are the summoner's
const _dd=dealDamage;dealDamage=function(t,amt,type,src,quiet,crit){if(src&&src.pet){const o=src.owner;src=o&&!o.dead?o:null}return _dd(t,amt,type,src,quiet,crit)};
const _k=kill;kill=function(t,src){if(t&&t.pet){if(!t.dead){t.hp=0;dismiss(t);sndAt('mdie',t.x,t.y)}return}return _k(t,src)};
// bots never farm spirits as creeps
const _bc=bestCreep;bestCreep=function(u,range){const P=units.filter(o=>o.pet&&!o.dead);for(const p of P)p.dead=true;try{return _bc(u,range)}finally{for(const p of P)p.dead=false}};
const _ct=curTick;curTick=function(dt){_ct(dt);purgeT-=dt;if(purgeT<=0){purgeT=1;purge()}};
// bots: wisps early, command when a spirit is up, the guardian on anything big
const _ai=aiSkills;aiSkills=function(u,t,d,hpR){if(u.wk!==K)return _ai(u,t,d,hpR);
  const can=i=>u.skl[i]>0&&u.cd[i]<=0&&u.mp>=SK[K][i].mp[u.skl[i]-1],rg=i=>SK[K][i].range[u.skl[i]-1],big=t.hero||t.golem||t.boss;
  if(can(2)&&(big||Math.random()<.08)&&d<rg(2)*.9&&!(t.hero&&t.hp/t.maxHp<.12))return cast(u,2);
  if(can(0)&&d<720&&petsOf(u).filter(p=>p.kind!=='sguard').length<2)return cast(u,0);
  if(can(1)&&d<rg(1)*.95&&(petsOf(u).length||t.hero))return cast(u,1)};
const _ae=aiEscape;aiEscape=function(u,t,d){if(u.wk===K){if(u.skl[0]&&u.cd[0]<=0&&d<300)cast(u,0);return}return _ae(u,t,d)};
const _sa=skAim;skAim=function(u,i){const a=_sa(u,i);if(a&&u.wk===K&&i===2)a.r=SKV[K][2].r[u.skl[i]-1];return a};
// ---- network: [..., -2, PK index, owner id] ----
const _mr=mobRow;mobRow=function(o){if(o.pet){const r=[o.id,o.x|0,o.y|0,o.hp|0,uflags(o),Math.round(o.fx*99),Math.round(o.fy*99),o.maxHp,-2,PK.indexOf(o.kind),o.owner?o.owner.id:-1];return r}return _mr(o)};
const _as=applySnap;applySnap=function(d){if(d&&d.m)for(const r of d.m){if(r.length>10&&r[8]===-2&&PK[r[9]]&&!UMAP.get(r[0])){const o=UMAP.get(r[10]);addUnit(mkPet(r[0],PK[r[9]],r[1],r[2],o||null))}}return _as(d)};
// clients stop receiving dead mobs: this tells them the spirit is gone right away
const _aev=applyEvent;applyEvent=function(e){if(e&&e.t==='pd'){const u=UMAP.get(e.id);if(u){u.dead=true;u.hp=0}return}return _aev.apply(this,arguments)};
// ---- the codex card ----
try{const el=document.createElement('div');el.className='wcard';const d=WEAPONS[K];
  el.innerHTML=`<div class="ic">${d.ic}</div><b>${d.n}</b><small>${d.desc}</small><div class="sks">${SK[K].map(s=>`<span title="${s.n}">${s.ic}</span>`).join(' ')}</div>`;$('codex').appendChild(el)}catch(e){}
window.SUMMONER={K,PK,petsOf};
})();
