// ===================== SUMMONER · คัมภีร์วิญญาณ (Claude, 2026-11-18 · Arena Royale only) =====================
// A fifth weapon family: the Spirit Tome. Whoever holds it becomes the Summoner and fights through spirits:
//  Q  อัญเชิญภูติ       — call spirit wisps (ranged soul bolts); from level 3 a spirit wolf joins them
//  E  บัญชาวิญญาณ      — hurl a soul lance at a foe; every spirit you own hunts it, empowered and healed
//  R  อัญเชิญผู้พิทักษ์จันทรา — a Lunar Guardian crashes down (slam + stun) and fights at your side
// Spirits are host-authoritative mob units (pet:1) on the summoner's team. Their hits count as the summoner's,
// so kill credit, PvP damping, weapon traits and runes all work unchanged. Clients learn them from the mob snapshot
// row [..., -2, PK index, owner id, element] and drop them like any other summon when they leave the snapshot.
//
// Fusion (owner 2026-11-21): the tome now forges with any other weapon family at 10:00, into five new tomes (arch 'SO', base 'soul',
// so the hero stays the Summoner):
//  📖 + melee  -> ⚜️ คัมภีร์ขุนพลวิญญาณ  spirit knights (melee, tough) · a charge order (every spirit dashes in and stuns) ·
//                 the Spirit Warlord (a spectral Dark Sentinel; the summoner takes 8% less damage while it stands)
//  📖 + ranged -> 🦅 คัมภีร์พรานวิญญาณ   hunter wisps (long range, piercing soul arrows) · a volley from every spirit that marks the
//                 target (your spirits hit it harder) · a rain of soul arrows that leaves two more hunters behind
//  📖 + staff  -> 🕯️💠🌌 คัมภีร์วิญญาณเพลิง/เหมันต์/อัสนี  the tome's kit with elemental spirits: half of their hits leave the
//                 element's status (burn / chill and freeze / static and overload, b.js stAdd), an elemental lance and guardian
(()=>{
'use strict';
const K='soul',PK=['swisp','swolf','sguard','sknight','swarlord','shunter'];window.PK=PK;   // append only: the index travels in snapshots
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
  sguard:{name:'ผู้พิทักษ์จันทรา',hp:2000,dmg:70,armor:8,spd:165,r:46,atkT:1.6,range:112,xp:30,col:'#b9a6ff',big:1},
  sknight:{name:'อัศวินวิญญาณ',hp:520,dmg:30,armor:3,spd:245,r:24,atkT:1.05,range:72,xp:8,col:'#a8c8ff',kk:'Skeleton_Warrior'},
  swarlord:{name:'ขุนพลวิญญาณ',hp:2400,dmg:80,armor:7,spd:178,r:36,atkT:1.5,range:118,xp:30,col:'#7f9cff',big:1},
  shunter:{name:'ภูติพราน',hp:170,dmg:22,armor:1,spd:285,r:15,atkT:.9,range:520,xp:6,col:'#d8ff9a'}};
for(const k of PK)CREEPS[k]=Object.assign({pet:1},PDEF[k]);
// ---- the five fused tomes ----
const SOK=[];
{const tn=b=>[b,b+'ชั้นสูง',b+'มหากาพย์',b+'ตำนาน',b+' SSR'],S4=(ic,n,cd,mp,rg)=>({ic,n,cd,mp,range:rg});
  const add=(k,o)=>{o.names=tn(o.n);o.fused=1;o.arch='SO';o.base=K;WEAPONS[k]=o;FUSED[k]=o;FK.push(k);AW.push(k);SOK.push(k);SKA[k]=['self','unit','area']};
  add('fOM',{n:'คัมภีร์ขุนพลวิญญาณ',ic:'⚜️',so:'M',melee:0,range:470,atkT:.95,dmg:.86,hp:170,armor:4,magic:1,pspd:860,mp:180,mpR:.7,col:'#a8c8ff',glow:'#7f9cff',
    desc:'คัมภีร์วิญญาณหลอมกับอาวุธประชิด: อัญเชิญอัศวินวิญญาณถึกทน สั่งวิญญาณทั้งหมดพุ่งชนจนมึน เรียกขุนพลวิญญาณยักษ์ (ขณะขุนพลอยู่ ผู้ใช้รับดาเมจลดลง 8%)',rec:['O','M']});
  SK.fOM=[S4('🛡️','กองทัพวิญญาณ',[14,13,12,11],[75,80,85,90],[0,0,0,0]),S4('📯','บัญชาบุกทะลวง',[10,9.5,9,8.5],[60,65,70,75],[640,660,680,700]),S4('⚜️','ขุนพลวิญญาณ',[75,65,55],[170,220,270],[600,640,680])];
  SKV.fOM=[{n:[2,2,2,3],hp:[200,270,340,410],dmg:[17,24,31,38],t:[18,19,20,21]},{dmg:[70,110,150,190],buff:[.5,.6,.7,.8],t:4,stun:[.2,.25,.3,.35]},
    {dmg:[200,300,400],stun:[1,1.2,1.4],r:[240,260,280],hp:[1700,2400,3100],gd:[48,70,92],t:[18,20,22],dr:.08}];
  add('fOR',{n:'คัมภีร์พรานวิญญาณ',ic:'🦅',so:'R',melee:0,range:520,atkT:.9,dmg:.86,hp:60,magic:1,pspd:1000,crit:.1,critM:1.7,mp:170,mpR:.7,col:'#d8ff9a',glow:'#9dff6a',
    desc:'คัมภีร์วิญญาณหลอมกับอาวุธยิงไกล: อัญเชิญภูติพรานยิงศรวิญญาณทะลุ สั่งวิญญาณทั้งหมดระดมยิงพร้อมตีตราเป้าหมาย ฝนศรวิญญาณที่ทิ้งภูติพรานไว้อีก 2 ตน',rec:['O','R']});
  SK.fOR=[S4('🦅','ภูติพราน',[13,12,11,10],[70,75,80,85],[0,0,0,0]),S4('🎯','ห่าศรวิญญาณ',[9,8.5,8,7.5],[55,60,65,70],[680,700,720,740]),S4('🌧️','ฝนศรวิญญาณ',[70,60,50],[160,210,260],[700,720,740])];
  SKV.fOR=[{n:[2,3,3,4],hp:[150,210,270,330],dmg:[14,20,26,32],t:[16,17,18,19]},{dmg:[70,105,140,175],mark:[.12,.16,.2,.24],t:5},
    {dmg:[30,44,58],r:[280,300,320],n:[2,2,3],t:[14,16,18]}];
  const EN={fire:'เพลิง',frost:'เหมันต์',storm:'อัสนี'},EI={fire:'🕯️',frost:'💠',storm:'🌌'},GN={fire:'อสูรเพลิง',frost:'ยักษ์น้ำแข็ง',storm:'ยักษ์อัสนี'};
  for(const e of['fire','frost','storm']){const E=ELEM[e];
    add('fOS_'+e,{n:'คัมภีร์วิญญาณ'+EN[e],ic:EI[e],so:'S',el:e,melee:0,range:480,atkT:.95,dmg:.84,hp:70,armor:1,magic:1,pspd:880,mp:190,mpR:.75,col:E.c,glow:E.c,
      desc:`คัมภีร์วิญญาณหลอมกับคทา${E.n}: ภูติ หมาป่า และผู้พิทักษ์กลายเป็นธาตุ${E.n} ทุกการโจมตีของวิญญาณติดสถานะธาตุ หอกวิญญาณ${E.n} ผู้พิทักษ์${E.n}ถล่มพื้นที่`,rec:['O','S'],re:e});
    SK['fOS_'+e]=[S4(E.ic,'อัญเชิญภูติ'+EN[e],[13,12,11,10],[70,75,80,85],[0,0,0,0]),S4('🔮','หอกวิญญาณ'+EN[e],[10,9.5,9,8.5],[55,60,65,70],[640,660,680,700]),S4(EI[e],GN[e],[75,65,55],[170,220,270],[600,640,680])];
    SKV['fOS_'+e]=[{n:[2,2,2,2],wolf:[0,0,1,1],hp:[190,265,340,415],dmg:[16,23,30,37],t:[16,17,18,19]},{dmg:[70,110,150,190],buff:[.5,.6,.7,.8],t:4},
      {dmg:[200,300,400],stun:[1,1.2,1.4],r:[250,270,290],hp:[1500,2200,2900],gd:[50,72,95],t:[18,20,22]}]}}
SKA_F.SO={t:['self','unit','area'],r:[0,0,'V'],w:[0,0,0]};
WCAT[K]='O';CATN.O='คัมภีร์วิญญาณ';
const SO=k=>k===K||!!(k&&FUSED[k]&&FUSED[k].base===K);   // the tome itself or a tome forged from it
const soEl=k=>k&&FUSED[k]&&FUSED[k].base===K&&FUSED[k].el||null,soKit=k=>k&&FUSED[k]&&FUSED[k].base===K?FUSED[k].so:'';
// the tome + another family -> its fused tome (two tomes never fuse: the same weapon)
{const _fk=fuseKey;fuseKey=function(a,b){const ca=WCAT[a],cb=WCAT[b];if(ca!=='O'&&cb!=='O')return _fk(a,b);if(!ca||!cb||a===b)return null;
  const o=ca==='O'?b:a,c=WCAT[o];return c==='M'?'fOM':c==='R'?'fOR':c==='S'?'fOS_'+o:null}}
const MAXW=4,MAXK=4,MAXH=5;let pid=400000,purgeT=0;
function mkPet(id,kind,x,y,owner){const d=CREEPS[kind];const u=mkUnit({id,type:kind,kind,def:d,name:d.name,mob:true,pet:true,summon:1,camp:-1,owner,team:owner?owner.team:-1,
    x,y,home:{x,y},big:!!d.big,golem:kind==='sguard'||kind==='swarlord'});setMobStats(u,1);u.tx=x;u.ty=y;
  if(kind==='sguard'){u.ecl='construct';u.poise=0;u.busyT=0;u.blockT=0;u.elite=1}
  else if(kind==='swarlord'){u.ecl='sentinel';u.poise=0;u.busyT=0;u.blockT=0;u.elite=1}
  else if(kind==='sknight')u.undead=1;   // drawn as a spectral skeleton knight
  return u}
const petsOf=(o,kind)=>units.filter(u=>u.pet&&!u.dead&&u.owner===o&&(!kind||u.kind===kind));
function dismiss(u,quiet,defeat){if(u.dead)return;u.hp=0;u.dead=true;u.deadAt=gameT;emit({t:'pd',id:u.id});
  if(ARX&&defeat)mobDeathFx(u,defeat.src);else fxE('die',{id:u.id,x:u.x|0,y:u.y|0});if(!quiet)fxE('soulgone',{x:u.x|0,y:u.y|0,pk:PK.indexOf(u.kind)})}
function purge(){if(!units.some(u=>u.pet&&u.dead&&gameT-(u.deadAt||0)>2.5))return;units=units.filter(u=>!(u.pet&&u.dead&&gameT-(u.deadAt||0)>2.5));UMAP=new Map(units.map(u=>[u.id,u]))}
function spawnPet(o,kind,x,y,hp,dmg,life,slot,el){let p={x,y};if(blockedAt(p,20)||houseAt(p)!==houseAt(o))p={x:o.x,y:o.y};
  const u=mkPet(pid++,kind,p.x,p.y,o);u.maxHp=Math.round(hp);u.hp=u.maxHp;u.atkDmg=dmg;u.lifeT=life;u.slot=slot;u.pel=el||null;u.rise=kind==='sguard'||kind==='swarlord'?.55:.25;u.fx=o.fx;u.fy=o.fy;addUnit(u);return u}
// keep at most n of the given kinds: the oldest go first
function cull(u,kinds,n){const live=petsOf(u).filter(p=>kinds.includes(p.kind)).sort((a,b)=>a.lifeT-b.lifeT);for(let k=0;k<live.length-n;k++)dismiss(live[k])}
// ---- skills ----
const spiritAttackDamage=(V,li,attack,amp,kit)=> (V.dmg[li]+(kit==='M'?.3:kit==='R'?.28:.32)*attack)*amp;
const spiritGuardianDamage=(V,li,attack,amp)=>(V.gd[li]+.45*attack)*amp;
const _c0=cast0;cast0=function(u,i,ap){if(!SO(u.wk))return _c0(u,i,ap);
  if(u.dead||u.stunT>0||u.dash||u.leap||u.kb||u.fuseT>0)return false;const L=u.skl[i];if(!L)return false;
  const W=u.wk,s=SK[W][i],li=L-1;if(u.cd[i]>0)return false;const cost=s.mp[li];
  if(u.mp<cost){if(isHuman(u))emit({t:'s',n:'nomana',x:0,y:0,g:1,v:[u.id]});return false}
  const V=SKV[W][i],A=u.atkDmg,SA=(1+spellAmp(u))*SKILL_K,rngS=s.range[li]||400,kit=soKit(W),el=soEl(W);purge();
  if(ap&&!(Math.hypot(ap.x-u.x,ap.y-u.y)>8))ap=null;
  const ft=!isHuman(u)&&u.ai.tgt&&!u.ai.tgt.dead?u.ai.tgt:null;
  if(u.invisT>0){u.invisT=0;u.bsReady=true}
  const amp=1+spellAmp(u),ring=(n,k)=>Math.atan2(u.fy,u.fx)+Math.PI+(k-(n-1)/2)*(n>3?.7:.9);
  if(i===0){const ids=[];
    if(kit==='M'){const n=V.n[li];cull(u,['sknight'],MAXK-n);const hp=V.hp[li]+.07*u.maxHp,dmg=spiritAttackDamage(V,li,A,amp,kit);
      for(let k=0;k<n;k++){const a=ring(n,k);ids.push(spawnPet(u,'sknight',u.x+Math.cos(a)*80,u.y+Math.sin(a)*80,hp,dmg,V.t[li],k).id)}}
    else if(kit==='R'){const n=V.n[li];cull(u,['shunter'],MAXH-n);const hp=V.hp[li]+.04*u.maxHp,dmg=spiritAttackDamage(V,li,A,amp,kit);
      for(let k=0;k<n;k++){const a=ring(n,k);ids.push(spawnPet(u,'shunter',u.x+Math.cos(a)*95,u.y+Math.sin(a)*95,hp,dmg,V.t[li],k).id)}}
    else{const n=V.n[li]+V.wolf[li];cull(u,['swisp','swolf'],MAXW-n);const hp=V.hp[li]+.05*u.maxHp,dmg=spiritAttackDamage(V,li,A,amp,kit);
      for(let k=0;k<n;k++){const wolf=k>=V.n[li],a=ring(n,k),d=wolf?70:90;
        ids.push(spawnPet(u,wolf?'swolf':'swisp',u.x+Math.cos(a)*d,u.y+Math.sin(a)*d,wolf?hp*1.8:hp,wolf?dmg*1.35:dmg,V.t[li],k,el).id)}}
    u.castAnim=.5;u.revealT=1.2;sndAt('orb',u.x,u.y);sndAt('shield',u.x,u.y);fxE('soulsum',{id:u.id,x:u.x|0,y:u.y|0,n:ids.length,c:el?ELEM[el].c:kit==='M'?'#a8c8ff':kit==='R'?'#d8ff9a':undefined})}
  else if(i===1){const t=ft&&dist(u,ft)<rngS+60?ft:ap?enemyNear(u,ap,rngS):nearestEnemy(u,rngS+40,true);if(!t||dist(u,t)>rngS+80)return false;
    const d=dist(u,t)||1,nx=(t.x-u.x)/d,ny=(t.y-u.y)/d;u.fx=nx;u.fy=ny;u.revealT=1.2;u.castAnim=.45;
    const lance={spd:1250,r:16,dmg:skillHitDamage('SO1',V,li,A,SA),type:'m',kind:16,life:(rngS+120)/1250,big:1};if(el){lance.el=el;lance.elP=1}if(kit==='R')lance.pierce=1;
    proj(u,nx,ny,lance);
    for(const p of petsOf(u)){p.focus=t;p.pbT=V.t;p.pbAmt=V.buff?V.buff[li]:.5;p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.25);p.atkCd=Math.min(p.atkCd,.1);
      const pd=dist(p,t)||1,px=(t.x-p.x)/pd,py=(t.y-p.y)/pd;
      if(kit==='M'&&(p.kind==='sknight'||p.kind==='swarlord')&&pd>60&&!(p.rise>0)){const sp=1250;p.dash={vx:px*sp,vy:py*sp,t:Math.min(pd-30,540)/sp,dmg:p.atkDmg*1.2,stun:V.stun[li],hit:new Set(),stop:true};p.fx=px;p.fy=py;
        fxE('dash',{id:p.id,x:p.x|0,y:p.y|0,a:+Math.atan2(py,px).toFixed(2)})}
      else if(kit==='R'&&pd<760&&!(p.rise>0)){p.fx=px;p.fy=py;p.atkAnim=.3;for(const s2 of[-1,0,1]){const a=Math.atan2(py,px)+s2*.07;proj(p,Math.cos(a),Math.sin(a),{spd:1150,r:8,dmg:p.atkDmg*.8,type:'m',kind:16,life:(pd+160)/1150})}}}
    if(kit==='R'){t.smarkO=u.id;t.smarkK=V.mark[li];t.smarkUntil=gameT+V.t;if(isHuman(u))fxTextFor(t.x,t.y-t.r-50,'🎯 ตีตรา','#d8ff9a',1,[u.id])}
    sndAt('blink',u.x,u.y);fxE('soulcmd',{id:u.id,x:u.x|0,y:u.y|0,x2:t.x|0,y2:t.y|0,tid:t.id})}
  else{const tg=ft?{x:ft.x,y:ft.y}:ap?ap:aim(u,rngS);const p=landSpot(u,clampTo(u,tg,rngS));const r=V.r[li];
    const d=Math.hypot(p.x-u.x,p.y-u.y)||1;u.fx=(p.x-u.x)/d;u.fy=(p.y-u.y)/d;u.castAnim=.6;u.revealT=1.5;
    if(kit==='R'){aoe({x:p.x,y:p.y,r,dmg:skillHitDamage('fOR2',V,li,A,SA),type:'m',owner:u,kind:'rain',delay:.3,dot:3,tick:.3});
      const hp=SKV.fOR[0].hp[Math.min(3,li+1)]+.04*u.maxHp,dmg=spiritAttackDamage(SKV.fOR[0],Math.min(3,li+1),A,amp,'R');cull(u,['shunter'],MAXH);
      for(let k=0;k<V.n[li];k++){const a=Math.atan2(u.fy,u.fx)+Math.PI+(k-(V.n[li]-1)/2)*.9;spawnPet(u,'shunter',p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,hp,dmg,V.t[li],k)}
      sndAt('volley',p.x,p.y);fxE('soulcmd',{id:u.id,x:u.x|0,y:u.y|0,x2:p.x|0,y2:p.y|0})}
    else{const big=kit==='M'?'swarlord':'sguard';for(const g of petsOf(u,big))dismiss(g);
      const sl={x:p.x,y:p.y,r,dmg:skillHitDamage('SO2',V,li,A,SA),type:'m',owner:u,delay:.5,kind:'slam',stun:V.stun[li],big:true};
      if(el){sl.el=el;sl.elP=1;sl.kind=el==='fire'?'meteor':el==='frost'?'frost':'thunder';if(el==='fire')sl.burn=(16+1.4*u.lvl)*(1+spellAmp(u))}
      aoe(sl);
      const g=spawnPet(u,big,p.x,p.y,V.hp[li]+.12*u.maxHp,spiritGuardianDamage(V,li,A,amp),V.t[li],0,el);g.fx=u.fx;g.fy=u.fy;if(kit==='M'){u.wlord=g;u.wlordDR=V.dr}
      sndAt('slam',p.x,p.y);sndAt('roar',p.x,p.y);fxE('soulgd',{id:g.id,x:p.x|0,y:p.y|0,r,c:el?ELEM[el].c:kit==='M'?'#7f9cff':undefined});emit({t:'k',a:8,x:p.x|0,y:p.y|0})}}
  u.cd[i]=s.cd[li]*cdMul(u);u.mp-=cost;return true};
// ---- spirit AI ----
function pick(u,O){let best=null,bs=1e9;const bt=O.ai&&O.ai.tgt&&!O.ai.tgt.dead&&isEnemy(O,O.ai.tgt)&&dist(O,O.ai.tgt)<720?O.ai.tgt:null;if(bt&&!isHuman(O))return bt;
  const lh=O.lastHit&&gameT-O.lastHit.time<5&&!O.lastHit.src.dead&&dist(O,O.lastHit.src)<720?O.lastHit.src:null;if(lh)return lh;
  for(const o of units){if(o.dead||!isEnemy(O,o)||o.reviveT>0)continue;const dO=dist(O,o);if(dO>(u.kind==='shunter'?640:560))continue;
    let s;if(o.hero){if(!visibleTo(o,O))continue;s=dO}else if(o.pet)s=dO+120;else if(o.mob&&(o.aggro===O||o.aggro&&o.aggro.pet&&o.aggro.owner===O))s=dO+200;else continue;
    if(s<bs){bs=s;best=o}}
  return best}
// melee sweep in front of a spirit: full damage on its target, 60% beside it
function sweep(u,t,dmg,arc){const ang=Math.atan2(t.y-u.y,t.x-u.x);for(const o of units){if(o.dead||!isEnemy(u,o))continue;const dd=dist(u,o);if(dd>u.range+u.r+o.r)continue;
  let da=Math.abs(Math.atan2(o.y-u.y,o.x-u.x)-ang);if(da>Math.PI)da=Math.PI*2-da;if(o===t||da<arc){dealDamage(o,o===t?dmg:dmg*.6,'p',u);if(u.pel&&!o.dead&&Math.random()<.5)stAdd(u,o,u.pel,1)}}}
function attack(u,t){const buff=u.pbT>0,dmg=u.atkDmg*(buff?1+u.pbAmt:1)*(isNight()?1.1:1),d=dist(u,t)||1,nx=(t.x-u.x)/d,ny=(t.y-u.y)/d,ang=Math.atan2(ny,nx);
  u.atkCd=u.atkCdBase/(buff?1.35:1);u.atkAnim=.3;
  if(u.kind==='swisp'){proj(u,nx,ny,{spd:900,r:9,dmg,type:'m',kind:16,life:(u.range+120)/900,st:u.pel||undefined,stP:.5});return}
  if(u.kind==='shunter'){proj(u,nx,ny,{spd:1150,r:8,dmg,type:'m',kind:16,pierce:1,life:(u.range+120)/1150});return}
  if(u.kind==='swolf'){dealDamage(t,dmg,'p',u);if(u.pel&&!t.dead&&Math.random()<.5)stAdd(u,t,u.pel,1);emit({t:'w',id:u.id,a:+ang.toFixed(2),r:u.range+u.r,c:u.pel?ELEM[u.pel].c:'#9fe8ff',k:2});return}
  if(u.kind==='sknight'){emit({t:'w',id:u.id,a:+ang.toFixed(2),r:u.range+u.r,c:'#a8c8ff',k:0});sweep(u,t,dmg,.8);sndAt('hit',u.x,u.y);return}
  eclCast(u,u.kind==='swarlord'?'combo':'basic',.7);emit({t:'w',id:u.id,a:+ang.toFixed(2),r:u.range+u.r,c:u.pel?ELEM[u.pel].c:u.kind==='swarlord'?'#8fa8ff':'#c9b6ff',k:1});
  sweep(u,t,dmg,.9);sndAt('hit',u.x,u.y)}
function petThink(u,dt){const O=u.owner;
  if(!O||O.dead||!SO(O.wk)||(u.lifeT-=dt)<=0){dismiss(u);return{mx:0,my:0}}
  if(u.rise>0){u.rise-=dt;return{mx:0,my:0}}if(u.pbT>0)u.pbT-=dt;
  const big=u.kind==='sguard'||u.kind==='swarlord';
  if(big){u.busyT=Math.max(0,(u.busyT||0)-dt);u.slT=(u.slT===undefined?3:u.slT)-dt}
  let t=u.focus&&!u.focus.dead&&u.focus.reviveT<=0&&dist(O,u.focus)<1100?u.focus:null;if(!t)u.focus=null;
  if(!t){u.pt=(u.pt||0)-dt;if(u.pt<=0||u.tgt&&u.tgt.dead){u.pt=.35;u.tgt=pick(u,O)}t=u.tgt&&!u.tgt.dead&&isEnemy(O,u.tgt)&&dist(O,u.tgt)<780?u.tgt:null}
  let mx=0,my=0;const fast=u.pbT>0?1.25:1;
  if(t){const d=dist(u,t),R=u.range+t.r;u.fx=(t.x-u.x)/(d||1);u.fy=(t.y-u.y)/(d||1);
    if(d>R-8){const v=navDir(u,t.x,t.y);mx=v.x*fast;my=v.y*fast}
    if(d<R+8&&u.atkCd<=0&&u.stunT<=0)attack(u,t);
    if(big&&u.slT<=0&&d<230&&u.stunT<=0){u.slT=7;eclCast(u,'slam',1);const r=u.kind==='swarlord'?210:230;
      aoe({x:u.x,y:u.y,r,dmg:u.atkDmg*1.5,type:'p',owner:u,delay:.55,kind:u.pel==='fire'?'nova':u.pel==='frost'?'frost':u.pel==='storm'?'thunder':'slam',stun:.6,big:true,st:u.pel||undefined,stP:.5});sndAt('slam',u.x,u.y)}}
  else{const back=Math.atan2(O.fy,O.fx)+Math.PI,a=back+((u.slot||0)-1)*.85,D=big?150:u.kind==='swolf'||u.kind==='sknight'?80:95,px=O.x+Math.cos(a)*D,py=O.y+Math.sin(a)*D,dd=Math.hypot(px-u.x,py-u.y);
    if(dist(u,O)>1150&&!blockedAt({x:px,y:py},u.r)){u.x=px;u.y=py;fxE('soulgone',{x:px|0,y:py|0,pk:PK.indexOf(u.kind)})}
    else if(dd>28){const v=navDir(u,px,py),k=dd>220?1.1:Math.max(.3,dd/220);mx=v.x*k;my=v.y*k;u.fx=v.x;u.fy=v.y}}
  if(u.kind==='swisp'||u.kind==='shunter'){const m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m}}
  return{mx:mx*fast,my:my*fast}}
// the tome's basic attack is a soul bolt (projectile kind 16) instead of the default arrow; the elemental tomes keep their element's bolt
const _b=basic;basic=function(u,ft){const n=projs.length,r=_b(u,ft);if(SO(u.wk))for(let i=n;i<projs.length;i++)if(projs[i].owner===u&&!projs[i].kind){projs[i].kind=16;projs[i].r=11}return r};
const _mt=mobThink;mobThink=function(u,dt){return u.pet?petThink(u,dt):_mt(u,dt)};
const _na=nightAggro;nightAggro=function(u){if(u.pet)return;return _na(u)};
// spirits strike for their summoner: kill credit, PvP damping, traits and runes are the summoner's.
// The hunt's mark makes your own spirits hit the marked foe harder; the Warlord shields its summoner.
const _dd=dealDamage;dealDamage=function(t,amt,type,src,quiet,crit){
  if(src&&src.pet){const o=src.owner;if(o&&t&&t.smarkO===o.id&&gameT<(t.smarkUntil||0))amt*=1+(t.smarkK||0);src=o&&!o.dead?o:null}
  if(t&&t.wlord&&amt>0){if(!t.wlord.dead&&SO(t.wk))amt*=1-(t.wlordDR||0);else t.wlord=null}
  return _dd(t,amt,type,src,quiet,crit)};
const _k=kill;kill=function(t,src){if(t&&t.pet){if(!t.dead){t.hp=0;dismiss(t,false,{src});if(!ARX)sndAt('mdie',t.x,t.y)}return}return _k(t,src)};
// bots never farm spirits as creeps
const _bc=bestCreep;bestCreep=function(u,range){const P=units.filter(o=>o.pet&&!o.dead);for(const p of P)p.dead=true;try{return _bc(u,range)}finally{for(const p of P)p.dead=false}};
const _ct=curTick;curTick=function(dt){_ct(dt);purgeT-=dt;if(purgeT<=0){purgeT=1;purge()}};
// bots: spirits early, command when a spirit is up, the big one on anything big
const _ai=aiSkills;aiSkills=function(u,t,d,hpR){if(!SO(u.wk))return _ai(u,t,d,hpR);const W=u.wk;
  const can=i=>u.skl[i]>0&&u.cd[i]<=0&&u.mp>=SK[W][i].mp[u.skl[i]-1],rg=i=>SK[W][i].range[u.skl[i]-1],big=t.hero||t.golem||t.boss;
  if(can(2)&&(big||Math.random()<.08)&&d<rg(2)*.9&&!(t.hero&&t.hp/t.maxHp<.12))return cast(u,2);
  if(can(0)&&d<720&&petsOf(u).filter(p=>p.kind!=='sguard'&&p.kind!=='swarlord').length<2)return cast(u,0);
  if(can(1)&&d<rg(1)*.95&&(petsOf(u).length||t.hero))return cast(u,1)};
const _ae=aiEscape;aiEscape=function(u,t,d){if(SO(u.wk)){if(u.skl[0]&&u.cd[0]<=0&&d<300)cast(u,0);return}return _ae(u,t,d)};
const _sa=skAim;skAim=function(u,i){const a=_sa(u,i);if(a&&SO(u.wk)&&i===2)a.r=SKV[u.wk][2].r[u.skl[i]-1];return a};
// ---- network: [..., -2, PK index, owner id, element (0 none, 1 fire, 2 frost, 3 storm)] ----
const _mr=mobRow;mobRow=function(o){if(o.pet)return[o.id,o.x|0,o.y|0,o.hp|0,uflags(o),Math.round(o.fx*99),Math.round(o.fy*99),o.maxHp,-2,PK.indexOf(o.kind),o.owner?o.owner.id:-1,o.pel?EL.indexOf(o.pel)+1:0];return _mr(o)};
const _as=applySnap;applySnap=function(d){if(d&&d.m)for(const r of d.m){if(r.length>10&&r[8]===-2&&PK[r[9]]&&!UMAP.get(r[0])){const o=UMAP.get(r[10]);const p=mkPet(r[0],PK[r[9]],r[1],r[2],o||null);p.pel=EL[(r[11]|0)-1]||null;addUnit(p)}}return _as(d)};
// clients stop receiving dead mobs: this tells them the spirit is gone right away
const _aev=applyEvent;applyEvent=function(e){if(e&&e.t==='pd'){const u=UMAP.get(e.id);if(u){u.dead=true;u.hp=0}return}return _aev.apply(this,arguments)};
// the HUD's weapon glyph: a tome has none (its emoji is drawn instead)
if(typeof wpIco==='function'){const _wi=wpIco;wpIco=function(me){if(me&&SO(me.wk))return null;return _wi(me)}}
// ---- the codex card and the fusion recipes ----
try{const el=document.createElement('div');el.className='wcard';const d=WEAPONS[K];
  el.innerHTML=`<div class="ic">${d.ic}</div><b>${d.n}</b><small>${d.desc}</small><div class="sks">${SK[K].map(s=>`<span title="${s.n}">${s.ic}</span>`).join(' ')}</div>`;$('codex').appendChild(el)}catch(e){}
try{const G=$('fuseGrid'),M='🗡️🪓🔪⚔️',R='🏹🎯';
  for(const k of SOK){const F=WEAPONS[k],el=document.createElement('div');el.className='fcard';el.style.borderColor=hexA(F.glow,.55);
    const rc=F.so==='M'?`📖 คัมภีร์วิญญาณ + ${M} ประชิด`:F.so==='R'?`📖 คัมภีร์วิญญาณ + ${R} ยิงไกล`:`📖 คัมภีร์วิญญาณ + ${WEAPONS[F.el].ic} ${WEAPONS[F.el].n}`;
    el.innerHTML=`<div class="fh2"><span class="ic">${F.ic}</span><div><b>${F.n}</b><div class="rc">${rc}</div></div></div><small>${F.desc}</small><div class="sks">${SK[k].map((s,i)=>`<span>${s.ic} ${['Q','E','R'][i]} · ${s.n}</span>`).join('')}</div>`;G.appendChild(el)}}catch(e){}
window.SUMMONER={K,PK,petsOf,SO,SOK,soKit,soEl,spiritAttackDamage,spiritGuardianDamage};
})();
