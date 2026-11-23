let simMode=false;const KLOG=[];
// ===================== GAME STATE =====================
let state='menu',units=[],UMAP=new Map(),projs=[],aoes=[],items=[],boxes=[],parts=[],texts=[],swings=[],feedList=[],flies=[],fxq=[];
let alive=0,zone=null,gameT=0,shakeA=0,announce=null,chosenLook=clamp(+lsGet('ar_look','0')||0,0,7),COMBO={n:0,t:0,pop:0,dmg:0},TGT={id:-1,t:0},hitFl=[],scrFl={a:0,c:'#ffffff'},myId=0,spectate=null,gameOver=false,discovered=new Set();
let cam={x:0,y:0},campT=0,lastNight=false,nextItemId=5000,deathOrder=[];
const ME=()=>UMAP.get(myId);
function listener(){const m=ME();if(m&&!m.dead)return m;if(spectate&&UMAP.get(spectate))return UMAP.get(spectate);return m}
const isNight=()=>(gameT%(DAY+NIGHT))>=DAY;
const visionR=()=>isNight()?480:700;
const wdef=u=>u.wk?WEAPONS[u.wk]:FISTS;

function mkUnit(o){return Object.assign({x:0,y:0,r:26,hp:1,maxHp:1,mp:0,maxMp:0,lvl:1,xp:0,dmgB:0,spdB:0,hpB:0,armorB:0,mrB:0,cd:[0,0,0],skl:[0,0,0],pts:0,
  atkCd:0,stunT:0,rootT:0,slowT:0,slowAmt:.4,buffT:0,revealT:0,reviveT:0,atkAnim:0,castAnim:0,dash:null,dead:false,kills:0,fx:0,fy:1,hurtT:0,mvx:0,mvy:0,
  wk:null,wt:-1,wk2:null,wt2:-1,fuseT:0,spinR:0,rapid:null,lsT:0,altE:false,at:-1,look:0,shieldHp:0,shieldT:0,invisT:0,invisSpd:0,bsDmg:0,bsReady:false,critNext:false,spinT:0,spinTick:0,spinDmg:0,lotusT:0,lotusTick:0,lotusDmg:0,lotusR:0,
  leap:null,kb:null,asT:0,asAmt:0,burnT:0,burnDps:0,burnSrc:null,deadT:0,bag:[0,0,0,0],bcd:[0,0,0,0],hotT:0,hotV:0,motT:0,motV:0,spdPT:0,
  hidden:false,inBush:false,wet:false,aegis:false,bonusNext:0,lastDmgT:-99,armorV:0,mr:.15,atkDmg:10,atkCdBase:1,range:60,melee:true,pspd:0,spdBase:180,hpRegen:0,mpRegen:0,
  ai:{t:0,wx:0,wy:0,px:0,py:0,stuckT:0,detT:0},tx:0,ty:0},o)}
function recalc(u,full){if(!u.hero)return;const L=u.lvl-1,Wp=wdef(u),A=u.at>=0?ARMORS[u.at]:null,tm=u.wk&&u.wt>=0?TIERS[u.wt].m:1;
  const hr=u.maxHp>1?u.hp/u.maxHp:1,mr=u.maxMp>0?u.mp/u.maxMp:1;
  u.maxHp=Math.round((HB.hp+HG.hp*L+(Wp.hp||0)+(A?A.hp:0))*(1+u.hpB));u.maxMp=Math.round(HB.mp+HG.mp*L+(Wp.mp||0));
  u.hpRegen=HB.hpR+HG.hpR*L+(A&&A.regen||0);u.mpRegen=(HB.mpR+HG.mpR*L)*(1+(Wp.mpR||0));
  u.armorV=HB.armor+HG.armor*L+(Wp.armor||0)+(A?A.armor:0)+u.armorB;u.mr=Math.min(.6,HB.mr+(Wp.mr||0)+(A?A.mr:0)+u.mrB);
  u.atkDmg=(HB.dmg+HG.dmg*L)*Wp.dmg*tm*(1+u.dmgB);
  u.atkCdBase=Wp.atkT*AS_K/(1+HG.as*L);u.range=Wp.range;u.melee=!!Wp.melee;u.pspd=Wp.pspd||0;u.spdBase=HB.spd*(1+(Wp.spd||0)+(A&&A.spd||0));
  if(full){u.hp=u.maxHp;u.mp=u.maxMp}else{u.hp=Math.max(1,u.maxHp*hr);u.mp=u.maxMp*mr}}
function mkHero(id,name,ctrl,look,team){look=clamp(look|0,0,LOOKS.length-1);const u=mkUnit({id,type:'hero',def:{color:LOOKS[look].c,name},look,name,ctrl:ctrl||null,hero:true,team:team||id,r:26,pts:1});u.bag=[1,1,0,0];recalc(u,true);return u}
function setMobStats(u,scale){const d=u.def;u.scale=scale;u.maxHp=Math.round(d.hp*scale);u.hp=u.maxHp;u.atkDmg=d.dmg*scale;u.armorV=d.armor;u.mr=.15;u.atkCdBase=d.atkT;u.range=d.range;u.spdBase=d.spd;u.r=d.r;if(CURSED&&u.home)regMob(u)}
function mkZombie(id,kind,x,y,sc){const d=CREEPS[kind];const u=mkUnit({id,type:kind,kind,def:d,name:d.name,mob:true,zombie:true,team:0,x,y,home:{x,y},big:!!d.big,lord:!!d.lord});setMobStats(u,sc||1);u.tx=x;u.ty=y;u.rise=1.3;return u}
function mkMob(m){const d=CREEPS[m.kind];const u=mkUnit({id:m.id,type:m.kind,kind:m.kind,def:d,name:d.name,mob:true,team:0,x:m.x,y:m.y,home:{x:m.x,y:m.y},camp:m.camp,golem:m.kind==='golem'||m.kind==='guardian'||m.kind==='magma',boss:m.kind==='boss',undead:!!m.undead,big:!!d.big,lord:!!d.lord,rich:m.rich|0});setMobStats(u,m.sc||1);u.tx=m.x;u.ty=m.y;return u}
function addUnit(u){units.push(u);UMAP.set(u.id,u)}

function setupWorld(seed,cfg){
  WD=genWorld(seed);buildCollide(WD);buildMini();GROUND2D=null;
  units=[];UMAP=new Map();projs=[];aoes=[];parts=[];texts=[];swings=[];feedList=[];flies=[];fxq=[];deathOrder=[];
  items=WD.items.map(i=>Object.assign({},i));boxes=(WD.boxes||[]).map(b=>Object.assign({},b,{open:false}));
  for(const m of WD.mobs)addUnit(mkMob(m));
  genArena(seed,normCfg(cfg),items);buildHide();zid=100000;zWave=null;nightN=0;fuseWarn=0;
  gameT=0;shakeA=0;COMBO={n:0,t:0,pop:0,dmg:0};scrFl={a:0,c:'#ffffff'};TGT={id:-1,t:0};hitFl=[];gameOver=false;spectate=null;discovered=new Set();lastNight=false;campT=0;
  announce={txt:'🗡️ เก็บอาวุธใกล้ตัวเพื่อรับสกิล แล้วแตะ ＋ อัปสกิลแรก!',t:6};
  zone={x:ARENA.x,y:ARENA.y,r:ARENA.r,sx:0,sy:0,sr:0,tx:ARENA.x,ty:ARENA.y,tr:PHASES[0].r*ARENA.f,ph:0,st:'wait',t:PHASES[0].w*zTime()};
}
function hostNewGame(players,seed,cfg){
  seed=seed||Math.floor(Math.random()*1e9);setupWorld(seed,cfg);buildNav();const N=MC.n,ts=MC.ts,NT=Math.round(N/ts),SP=ASP||WD.spawns;
  for(const c of WD.camps){c.deadAt=-1;c.respawns=0}
  const names=[...BOT_NAMES].sort(()=>Math.random()-.5);myId=0;const order=SP.map((s,i)=>i).sort(()=>Math.random()-.5);
  // team slots: players keep the team they picked in the lobby, bots fill the empty seats
  const slots=Array.from({length:NT},()=>[]);
  for(const p of players.slice(0,N)){let t=ts>1&&p.team>=0&&p.team<NT&&slots[p.team].length<ts?p.team:-1;if(t<0)t=slots.findIndex(q=>q.length<ts);if(t<0)break;slots[t].push(p)}
  let id=1;
  for(let k=0;k<NT;k++){const sp=SP[order[k%SP.length]];
    for(let j=0;j<ts;j++){const p=slots[k][j],team=ts>1?1000+k:id;
      const u=p?mkHero(id,p.name,p.ctrl,p.look,team):mkHero(id,names[(id-1)%names.length],null,Math.floor(Math.random()*LOOKS.length),team);
      if(!p){u.bot=true;u.ai.pref=WK[Math.floor(Math.random()*WK.length)];u.ai.agg=rand(.25,1)}
      let q=sp;if(ts>1){for(let t=0;t<24;t++){const a=j/ts*6.283+t*.4,d=t?70+t*6:80;const c={x:sp.x+Math.cos(a)*d,y:sp.y+Math.sin(a)*d};if(walkable(c.x,c.y,30)&&!inWater(c.x,c.y)&&!houseAt(c)){q=c;break}}}
      u.x=u.tx=q.x;u.y=u.ty=q.y;u.tk=k;addUnit(u);
      if(p&&p.ctrl==='host')myId=u.id;id++}}
  alive=N;nextTarget();
  const me=ME();if(me){cam.x=me.x-W/2/Z;cam.y=me.y-H/2/Z}
  return seed;
}
function zTime(){return .55+.45*ARENA.f}
// The storm closes on a random spot (owner 2026-11-21: every game it ended near the middle of the map). The host draws the final
// point once, anywhere on open land in the valley; each next circle lies inside the current one and still holds that point (with a
// tenth of its radius to spare), so the circles drift toward it phase by phase. Clients only ever see the circles (snapshot z).
function zoneEnd(){const M=ARENA.r*.68;
  for(let k=0;k<240;k++){const a=Math.random()*Math.PI*2,d=Math.max(0,Math.min(M,bndR(a)-1500))*Math.sqrt(Math.random()),x=ARENA.x+Math.cos(a)*d,y=ARENA.y+Math.sin(a)*d,p={x,y};
    if(walkable(x,y,60)&&!inWater(x,y)&&!inCastleYard(p)&&!inDG(p,300))return p}
  return{x:ARENA.x,y:ARENA.y}}
function nextTarget(){const r=PHASES[zone.ph].r*ARENA.f;if(!zone.end)zone.end=zoneEnd();const F=zone.end,room=Math.max(0,zone.r-r),m=r*.9;let c=null;
  for(let k=0;k<70;k++){const a=Math.random()*Math.PI*2,o=m*Math.sqrt(Math.random()),tx=F.x+Math.cos(a)*o,ty=F.y+Math.sin(a)*o;
    if(Math.hypot(tx-zone.x,ty-zone.y)>room)continue;c={x:tx,y:ty};
    if(r<1270&&(!walkable(tx,ty,40)||inCastleYard(c)&&r<300))continue;break}
  if(!c){const dx=F.x-zone.x,dy=F.y-zone.y,d=Math.hypot(dx,dy),k=d>room?room/d:1;c={x:zone.x+dx*k,y:zone.y+dy*k}}
  zone.tx=c.x;zone.ty=c.y;zone.tr=r}

// ===================== EVENTS =====================
function emit(ev){applyEvent(ev);if(net.mode==='host')netQueue(ev)}
function bcast(ev){if(net.mode==='host')netQueue(ev)}
let sndBudget={};
function applyEvent(e){
  switch(e.t){
    case 'b':burst(e.x,e.y,e.c,e.n);fxq.push(e);break;
    case 'x':if(!e.v||e.v.includes(myId)){const dm=e.i!==undefined&&e.i>=0,mine=dm&&e.o===myId;let yy=e.y;if(dm){let n=0;for(const q of texts)if(q.dm&&q.max-q.life<.35&&Math.abs(q.x-e.x)<70&&Math.abs(q.y-yy)<26)n++;yy-=n*24}texts.push({x:e.x,y:yy,txt:String(e.s),col:e.c,life:e.l*(dm?1.25:1),max:e.l*(dm?1.25:1),big:e.g,dm,mine,vx:dm?(ARX?((Math.imul(e.x+e.y+e.i+frameN,2654435761)>>>24)/255*110-55):rand(-55,55)):0});
      // my own hits feed the combo counter, the target frame and a hit flash; being hit shows the attacker when nothing else is targeted
      if(mine){COMBO.n++;COMBO.t=3.2;COMBO.pop=1;COMBO.dmg+=parseInt(String(e.s).replace(/[^0-9]/g,''))||0;TGT.id=e.i;TGT.t=6;if(hitFl.length<24)hitFl.push({x:e.x,y:e.y+16,t:0,big:e.g?1:0});if(e.g){shakeA=Math.max(shakeA,7);scrFl.a=Math.max(scrFl.a,.16);scrFl.c='#fff2d0'}
        if(view3D&&has3D()&&R3.ok&&R3.hitVfx)R3.hitVfx(e.x,e.y,!!e.g,e.i)}
      else if(dm&&e.i===myId&&e.o>=0&&TGT.t<=0){TGT.id=e.o;TGT.t=4}}break;
    case 's':if(e.v&&!e.v.includes(myId))break;if((sndBudget[e.n]||0)<3){sndBudget[e.n]=(sndBudget[e.n]||0)+1;if(e.g)AU.play(e.n,.8);else AU.playAt(e.n,e.x,e.y)}break;
    case 'k':{const L=listener();if(L&&Math.hypot(L.x-e.x,L.y-e.y)<1000)shakeA=Math.max(shakeA,e.a);break}
    case 'w':{const u=UMAP.get(e.id);if(u){swings.push({u,ang:e.a,r:e.r,life:.22,max:.22,col:e.c,k:e.k||0});u.atkAnim=.28;u.atkK=(u.atkK||0)+1}break}
    case 'fx':
      if(e.k==='box'){const b=boxes[e.id];if(b)b.open=true}
      if(e.k==='die'&&e.n){
        const u=UMAP.get(e.id);
        if(net.mode==='client'&&u?.mob&&!u.inSnap){u.dead=true;u.hp=0}
        burst(e.x,e.y,e.c,28);
        if(e.by===myId)AU.play(e.n,.78);
        else if((sndBudget[e.n]||0)<3){sndBudget[e.n]=(sndBudget[e.n]||0)+1;AU.playAt(e.n,e.x,e.y)}
      }
      fxq.push(e);break;
    case 'f':feedList.unshift({txt:e.s,t:6,hl:e.v&&e.v.includes(myId)});if(feedList.length>5)feedList.pop();break;
    case 'a':if(!e.v||e.v.includes(myId))announce={txt:e.s,t:e.d||2.5};break;
    case 'ir':items=items.filter(i=>i.id!==e.id);break;
    case 'ia':if(!items.some(i=>i.id===e.it.id))items.push(e.it);break;
    case 'end':if(e.id===myId)showEnd(false,e.rank,e.kills,e.lvl,e.time);break;
    case 'tdown':if(e.id===myId){const me=ME();const al=units.find(u=>u.hero&&!u.dead&&me&&u.team===me.team&&u!==me);if(al){spectate=al.id;if(net.mode==='client')netSend({t:'spec',id:al.id})}
      announce={txt:'💀 คุณถูกโค่น — ทีมยังสู้อยู่ กำลังดูเพื่อนร่วมทีม',t:4}}break;
    case 'over':gameOver=true;{const me=ME();const won=e.wt!==undefined?!!(me&&me.team===e.wt):e.w===myId;
      if(won)showEnd(true,1,me?me.kills:0,me?me.lvl:1,e.time);else if(me&&!me.dead)showEnd(false,2,me.kills,me.lvl,e.time);else showFinal(e)}break;
  }
  if(fxq.length>200)fxq.splice(0,fxq.length-200);
}
const fxTextFor=(x,y,s,c,l,v,g,i,o)=>emit({t:'x',x:Math.round(x),y:Math.round(y),s,c,l,v,g,i,o});
const sndAt=(n,x,y)=>emit({t:'s',n,x:Math.round(x),y:Math.round(y)});
const burstE=(x,y,c,n)=>emit({t:'b',x:Math.round(x),y:Math.round(y),c,n});
const fxE=(k,o)=>emit(Object.assign({t:'fx',k},o));
const isHuman=u=>!!u.ctrl;

// ===================== STATS / LEVELS / SKILLS =====================
const armorRed=a=>.06*a/(1+.06*Math.abs(a));
const needXp=L=>90+45*L;
const spellAmp=u=>u.hero?(.012*u.lvl+(u.wk&&u.wt>=0?TIERS[u.wt].sa:0)+u.dmgB):0;
const cdMul=u=>u.wk&&u.wt>=3?(u.wt===4?.78:.85):1;
function speedOf(u){let s=u.spdBase*(1+u.spdB);if(u.spdPT>0)s*=1.35;if(u.mob&&!u.zombie&&isNight())s*=1.15;if(u.slowT>0)s*=1-u.slowAmt;if(u.atkSlowT>0)s*=.5;if(u.buffT>0)s*=1.3;if(u.invisT>0)s*=1+u.invisSpd;if(u.spinT>0)s*=.85;if(u.wet)s*=.72;return s}
function canLearn(u,i){if(!u||!u.hero||u.pts<=0)return false;const L=u.skl[i];if(i<2)return L<4&&L<Math.ceil(u.lvl/2);return L<3&&u.lvl>=[6,11,16][L]}
function learn(u,i){if(!canLearn(u,i))return false;u.skl[i]++;u.pts--;if(isHuman(u))emit({t:'s',n:'learn',x:u.x|0,y:u.y|0,g:1,v:[u.id]});return true}
function botLearn(u){let guard=0;while(u.pts>0&&guard++<20){if(canLearn(u,2)){learn(u,2);continue}
  const c=[0,1].filter(i=>canLearn(u,i)).sort((a,b)=>u.skl[a]-u.skl[b]);if(!c.length)break;learn(u,c[0])}}
function gainXp(u,x){
  if(!u||!u.hero||u.dead||u.lvl>=MAXL)return;u.xp+=x;
  while(u.lvl<MAXL&&u.xp>=needXp(u.lvl)){u.xp-=needXp(u.lvl);u.lvl++;u.pts++;recalc(u);
    u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.1);
    fxTextFor(u.x,u.y-70,'LEVEL '+u.lvl,'#ffd35a',1.3,isHuman(u)?[u.id]:[]);fxE('lvl',{id:u.id,x:u.x|0,y:u.y|0});
    if(isHuman(u))emit({t:'s',n:'lvl',x:u.x|0,y:u.y|0,g:1,v:[u.id]});else botLearn(u)}
  if(u.lvl>=MAXL)u.xp=0}
function heal(u,a){if(u.rotT>0)a*=.5;u.hp=Math.min(u.maxHp,u.hp+a)}   // a zombie's rot halves healing

// ===================== COMBAT (host) =====================
function addFury(u){if(!u||!u.hero||u.dead)return;u.fury=Math.min(FURY_MAX,(u.fury||0)+1);u.furyT=FURY_T}
function damageNumber(target,damage,type,source,crit=false,absorbed=false,spread=true){
  const audience=[];
  if(isHuman(target))audience.push(target.id);
  if(source&&isHuman(source))audience.push(source.id);
  if(!audience.length)return;
  const color=absorbed?'#ffe9a0':isHuman(target)?'#ff6060':crit?'#ffd23a':type==='m'?'#c9a8ff':'#ffffff';
  fxTextFor(target.x+(spread?rand(-12,12):0),target.y-target.r-16,fmtN(damage)+(crit?'!':''),color,crit?1:.75,
    audience,crit?1:0,target.id,source?source.id:-1);
}
function dealDamage(t,amt,type,src,quiet,crit){
  if(t.dead||t.reviveT>0||amt<=0)return 0;if(CURSED){amt=curDmg(t,amt,type,src,quiet);if(amt<=0)return 0}if(t.statT>0&&t.stat>0)amt*=1+.015*t.stat;   // storm static
  let k=1;if(type==='p')k=1-armorRed(t.armorV);else if(type==='m')k=1-t.mr;if(t.hero&&src&&src.hero&&src!==t)k*=PVP_K;
  let d=amt*k,ab=0;
  if(t.shieldHp>0){ab=Math.min(t.shieldHp,d);t.shieldHp-=ab;d-=ab}
  t.hp-=d;t.hurtT=.12;t.revealT=Math.max(t.revealT,.8);if(src||type!=='pure')t.lastDmgT=gameT;
  if(t.mob&&src&&src!==t){if(!t.aggro&&t.boss)sndAt('roar',t.x,t.y);t.aggro=src;const c=WD.camps[t.camp];if(c)for(const id of c.mem){const m=UMAP.get(id);if(m&&!m.dead&&!m.aggro)m.aggro=src}}
  if(t.hero&&src&&src.hero)t.lastHit={src,time:gameT};
  if(t.hero&&src&&!isHuman(t)&&(src.mob||isHuman(src)||gameT>120))t.ai.threat=src;
  if(!quiet){damageNumber(t,d+ab,type,src,crit,ab>0&&d<1);
    if(isHuman(t)&&d>80)emit({t:'k',a:6,x:t.x|0,y:t.y|0})}
  if(t.hp<=0)kill(t,src);
  return d+ab;
}
function dropItem(it){it.id=nextItemId++;if(CURSED&&it.k==='w'&&it.wv==null)it.wv=wvRoll(it.tier);items.push(it);bcast({t:'ia',it})}
function removeItem(it){items=items.filter(i=>i!==it);bcast({t:'ir',id:it.id})}
// castle and dungeon guards drop real loot, so camps there are worth farming (rich 2 = dungeon, better odds)
// owner 2026-11-23: weapons and armour come from monsters and chests rather than the open ground, so every camp monster can drop gear
// (big ones and elites more often, harder lands better tiers); summons, pets and Eclipse units keep their own loot
function mobGear(t){if(t.ecl||t.summon||t.pet||t.boss)return;const big=t.kind==='ogre'||t.kind==='golem'||t.big,k=(big?1.7:1)*(t.elite?1.6:1),r=Math.random(),R=()=>({x:t.x+rand(-28,28),y:t.y+rand(-28,28)});
  const hard=(t.rg|0)>=3||t.elite;
  if(r<.075*k)dropItem(Object.assign({k:'w',wk:WK[Math.floor(Math.random()*WK.length)],tier:pickTier(hard?[8,34,40,16,2]:[30,40,24,6])},R()));
  else if(r<.14*k)dropItem(Object.assign({k:'r',tier:pickTier(hard?[0,24,42,28,6]:[30,36,24,10,0])},R()))}
function richLoot(t,src){const x=t.x,y=t.y,g=t.rich===2?1.35:1,r=Math.random(),R=()=>({x:x+rand(-24,24),y:y+rand(-24,24)});
  if(t.lord){dropItem(Object.assign({k:'w',wk:WK[Math.floor(Math.random()*WK.length)],tier:Math.random()<.18?4:3},R()));dropItem(Object.assign({k:'c',n:3,gold:true},R()));emit({t:'f',s:`👑 ${src&&src.hero?src.name:'ใครบางคน'} ปราบผู้คุมคุกใต้ดิน!`})}
  if(r<.2*g)dropItem(Object.assign({k:'w',wk:WK[Math.floor(Math.random()*WK.length)],tier:pickTier([0,45,40,14,t.rich===2?1:0])},R()));   // 2026-11-23: .13 -> .2
  else if(r<.36*g)dropItem(Object.assign({k:'r',tier:pickTier([0,30,45,22,3])},R()));                                                    // .24 -> .36
  else if(r<.6)dropItem(Object.assign({k:'c',n:1+(Math.random()<.3?1:0)},R()));
  else if(r<.8)dropItem(Object.assign({k:'p',b:Math.random()<.6?0:1},R()))}
// stairways between the valley and the dungeon (people only; bots stay up top)
function dgPort(u,dt){const D=WD.dg;if(!D||u.dead||!isHuman(u))return;u.tpCd=(u.tpCd||0)-dt;if(u.tpCd>0)return;const inD=inDG(u);let on=null;
  for(const p of inD?D.ports:D.ents)if(Math.abs(u.x-p.x)<p.r&&dist(u,p)<p.r-6){on=p;break}
  if(!on){u.tpHold=0;return}u.tpHold=(u.tpHold||0)+dt;if(u.tpHold<.45)return;
  const to=on.to;fxE('tp',{x:u.x|0,y:u.y|0});u.x=to.x;u.y=to.y;u.dash=null;u.kb=null;u.leap=null;u.tpHold=0;u.tpCd=2.5;fxE('tp',{x:u.x|0,y:u.y|0});sndAt('cave',u.x,u.y);
  emit({t:'a',s:inD?'☀️ กลับขึ้นสู่หุบเขา':'⛓️ คุกใต้ดิน · ปีศาจเฝ้าสมบัติทุกห้อง',d:2.5,v:[u.id]})}
// where the zone sees you: inside the dungeon you count as standing at the stairway closest to the safe zone
function zoneXY(u){const D=WD.dg;if(!D||!inDG(u))return u;let b=null,bd=1e9;for(const e of D.ents){const d=Math.hypot(e.x-zone.x,e.y-zone.y);if(d<bd){bd=d;b=e}}return b||u}
function mobDeathFx(u,src){
  const n=u.zombie?'zdie':u.boss||u.golem?'roar':'mdie';
  fxE('die',{id:u.id,x:u.x|0,y:u.y|0,c:u.def.color||u.def.col||'#a7a4a0',
    n,by:src&&isHuman(src)?src.id:-1,big:!!(u.big||u.boss||u.golem),zombie:!!u.zombie});
}
function kill(t,src){
  t.hp=0;if(CURSED&&!(t.hero&&t.aegis))coinKill(t,src);
  if(t.hero&&t.aegis){t.aegis=false;t.dead=true;t.reviveT=4;t.dash=null;t.leap=null;burstE(t.x,t.y,'#ffd35a',30);
    emit({t:'f',s:`⚜️ ${t.name} ใช้โล่อมตะ จะฟื้นใน 4 วิ`,v:[t.id]});return}
  t.dead=true;t.spinT=0;t.lotusT=0;t.leap=null;t.dash=null;t.kb=null;t.rapid=null;t.fuseT=0;
  if(ARX&&t.mob)mobDeathFx(t,src);
  else{burstE(t.x,t.y,t.def.color||t.def.col,28);fxE('die',{id:t.id,x:t.x|0,y:t.y|0});}
  if(t.zombie){if(src&&src.hero){gainXp(src,t.def.xp*1.4*(t.scale||1)+6*src.lvl);zombieLoot(t,src)}if(!ARX)sndAt('zdie',t.x,t.y);t.deadAt=gameT;return}
  if(t.mob){if(src&&src.hero)gainXp(src,t.def.xp*1.6*(t.scale||1)+8*src.lvl);if(!ARX)sndAt(t.boss||t.golem?'roar':'mdie',t.x,t.y);
    if(t.boss){const C=WD.castle;const k=C.keep;const fx=k.x+k.w/2,fy=k.y+k.h/2;const tx=lerp(fx,t.x,.45),ty=lerp(fy,t.y,.45);
      dropItem({k:'a',x:t.x,y:t.y});dropItem({k:'c',x:tx+60,y:ty,n:3,gold:true});dropItem({k:'w',x:tx-60,y:ty,wk:WK[Math.floor(Math.random()*WK.length)],tier:3});dropItem({k:'r',x:tx,y:ty+60,tier:4});dropItem({k:'i',x:tx,y:ty-60,it:'tome'});
      emit({t:'f',s:`🐉 ${src&&src.hero?src.name:'ใครบางคน'} ปราบมังกรเพลิง! สมบัติอยู่ในปราสาท`});emit({t:'a',s:'🐉 มังกรเพลิงพ่ายแพ้!',d:3})}
    else if(t.kind==='guardian'){dropItem({k:'c',x:t.x,y:t.y,n:2,gold:true});emit({t:'a',s:'💎 ผู้พิทักษ์คริสตัลพ่ายแพ้!',v:src&&isHuman(src)?[src.id]:[]})}
    else if(t.kind==='magma'){dropItem({k:'c',x:t.x,y:t.y,n:2,gold:true});if(Math.random()<.5)dropItem({k:'r',x:t.x+50,y:t.y,tier:pickTier([0,30,45,22,3])});emit({t:'a',s:'🌋 ไททันลาวาพ่ายแพ้!',v:src&&isHuman(src)?[src.id]:[]})}
    else if(t.rich)richLoot(t,src);
    else{mobGear(t);if(Math.random()<(t.kind==='golem'||t.kind==='ogre'?.6:.3))dropItem({k:'c',x:t.x,y:t.y,n:1})}
    const c=WD.camps[t.camp];if(c&&c.mem.every(id=>{const m=UMAP.get(id);return !m||m.dead}))c.deadAt=gameT;
    return}
  const killer=src&&src.hero&&isEnemy(src,t)?src:(t.lastHit&&gameT-t.lastHit.time<8&&!t.lastHit.src.dead?t.lastHit.src:null);
  alive--;t.rank=alive+1;deathOrder.push(t.id);sndAt('death',t.x,t.y);
  KLOG.push({t:Math.round(gameT),v:(t.wk||'none')+t.lvl,k:killer?(killer.wk||'none')+killer.lvl:(src?src.kind||src.type:'zone'),zone:!src});
  const v=[t.id];if(killer)v.push(killer.id);
  emit({t:'f',s:killer?`${killer.name} ⚔ ${t.name}`:src&&src.mob?`${src.zombie?'🧟':'👹'} ${t.name} ถูก${src.name}ฆ่า`:`${t.name} ตายในวง`,v});
  if(killer){killer.kills++;gainXp(killer,160+40*t.lvl+60*Math.max(0,t.lvl-killer.lvl));heal(killer,killer.maxHp*.15)}
  dropItem({k:'c',x:t.x-25,y:t.y,n:2,gold:true});
  if(t.wk)dropItem({k:'w',x:t.x+25,y:t.y,wk:t.wk,tier:t.wt,wv:t.wv});
  if(t.wk2)dropItem({k:'w',x:t.x+5,y:t.y-30,wk:t.wk2,tier:t.wt2,wv:t.wv2});
  if(t.at>=0)dropItem({k:'r',x:t.x,y:t.y+28,tier:t.at});
  if(MC.ts>1){
    // team game: you are out only when your whole team is down
    const up=u=>u.hero&&(!u.dead||u.reviveT>0);const teamUp=units.some(u=>up(u)&&u.team===t.team);
    const teams=new Set(units.filter(up).map(u=>u.team));
    if(!teamUp){const rank=teams.size+1;for(const m of units)if(m.hero&&m.team===t.team){m.rank=rank;if(isHuman(m))emit({t:'end',id:m.id,rank,kills:m.kills,lvl:m.lvl,time:gameT|0})}
      emit({t:'f',s:`☠️ ทีมของ ${t.name} ถูกกำจัด (อันดับ ${rank})`})}
    else if(isHuman(t))emit({t:'tdown',id:t.id});
    if(teams.size<=1&&!gameOver){const w=units.find(up);gameOver=true;const wt=w?w.team:0;for(const m of units)if(m.hero&&m.team===wt)m.rank=1;
      if(simMode)return;setTimeout(()=>emit({t:'over',w:w?w.id:0,wt,time:gameT|0}),900)}
    return}
  if(isHuman(t))emit({t:'end',id:t.id,rank:alive+1,kills:t.kills,lvl:t.lvl,time:gameT|0});
  if(alive<=1&&!gameOver){const w=units.find(u=>u.hero&&!u.dead||u.hero&&u.reviveT>0);gameOver=true;if(w)w.rank=1;
    if(simMode)return;setTimeout(()=>emit({t:'over',w:w?w.id:0,time:gameT|0}),900)}
}
function reviveUnit(u){u.dead=false;u.reviveT=0;u.hp=u.maxHp*.6;u.mp=u.maxMp*.6;u.stunT=0;u.rootT=0;burstE(u.x,u.y,'#ffe27a',30);sndAt('revive',u.x,u.y);fxE('lvl',{id:u.id,x:u.x|0,y:u.y|0});
  emit({t:'f',s:`⚜️ ${u.name} ฟื้นคืนชีพ!`})}
function visibleTo(o,u){return !o.hidden||dist(o,u)<170}
function nearestEnemy(u,range,mobs){let best=null,bs=1e9;
  for(const o of units){if(o.dead||!isEnemy(u,o))continue;if(o.mob&&!mobs)continue;if(mobs==='only'&&!o.mob)continue;
    if(o.hero&&!visibleTo(o,u))continue;const d=dist(u,o)-o.r;if(d>range)continue;const s=d+(o.mob?160:0);if(s<bs){bs=s;best=o}}
  return best}
const isEnemy=(a,b)=>a!==b&&a.team!==b.team;
// the enemy closest to an aim point (within reach of the caster)
function enemyNear(u,p,range){let best=null,bs=1e9;for(const o of units){if(o.dead||!isEnemy(u,o)||o.hero&&!visibleTo(o,u))continue;const dp=Math.hypot(o.x-p.x,o.y-p.y);if(dp>230+o.r||dist(u,o)>range+60)continue;if(dp<bs){bs=dp;best=o}}return best}
function aim(u,range){const t=nearestEnemy(u,range+120,true);if(t)return{x:t.x,y:t.y,t};const R=Math.max(range,200)*.8;return{x:u.x+u.fx*R,y:u.y+u.fy*R,t:null}}
function proj(u,nx,ny,o){projs.push(Object.assign({x:u.x+nx*(u.r+4),y:u.y+ny*(u.r+4),vx:nx*o.spd,vy:ny*o.spd,owner:u,hit:new Set(),dead:false,type:'p'},o))}
function aoe(o){aoes.push(Object.assign({t:0,delay:0,done:false,vis:.35,fxT:0,type:'m'},o))}
function clampTo(u,p,range){const dx=p.x-u.x,dy=p.y-u.y,d=Math.hypot(dx,dy);if(d<=range)return{x:p.x,y:p.y};return{x:u.x+dx/d*range,y:u.y+dy/d*range}}
function landSpot(u,p){for(let k=0;k<=12;k++){const t=1-k/12;const q={x:lerp(u.x,p.x,t),y:lerp(u.y,p.y,t)};if(!blockedAt(q,u.r)&&!houseAt(q))return q}return{x:u.x,y:u.y}}
const SWING_K={sword:0,axe:1,dagger:2,gsword:1,fMM:0,fMR:2,fMS_fire:1,fMS_frost:1,fMS_storm:1};
const BK={fire:1,frost:3,storm:10};   // basic-attack projectile kind per element
function basic(u,ft){
  if(u.dead||u.stunT>0||u.atkCd>0||u.dash||u.leap||u.spinT>0||u.lotusT>0||u.kb||u.fuseT>0)return false;
  const Wp=wdef(u);const t=ft||nearestEnemy(u,u.range+(u.melee?25:70),true);
  let nx=u.fx,ny=u.fy;if(t){const d=dist(u,t)||1;nx=(t.x-u.x)/d;ny=(t.y-u.y)/d;u.fx=nx;u.fy=ny}
  if(u.invisT>0){u.invisT=0;u.bsReady=true}
  u.revealT=1;u.atkAnim=.28;
  let dmg=u.atkDmg*(1+FURY_DMG*(u.fury||0)),crit=false;if(u.critNext||Math.random()<(Wp.crit||0)+CRIT_BASE){dmg*=(Wp.critM||1.6)+CRIT_BONUS+.02*u.lvl;crit=true;u.critNext=false}
  if(u.bonusNext){dmg+=u.bonusNext;u.bonusNext=0}
  if(u.bsReady&&t){dmg+=u.bsDmg;u.bsReady=false;crit=true;fxE('stab',{x:t.x|0,y:t.y|0})}
  if(!u.melee)u.atkSlowT=.25;
  if(u.melee){
    const ang=Math.atan2(ny,nx);const sk=u.wk?SWING_K[u.wk]:3;emit({t:'w',id:u.id,a:+ang.toFixed(2),r:u.range+u.r,c:Wp.fused?Wp.glow:u.wk&&u.wt>=0?TIERS[u.wt].c:'#ffd6a8',k:sk});
    sndAt(sk===1?'heavy':sk===2?'stab':'swing',u.x,u.y);
    let dealt=0,hitAny=false,first=null;
    for(const o of units){if(o.dead||!isEnemy(u,o))continue;const d=dist(u,o);if(d>u.range+u.r+o.r)continue;
      let da=Math.abs(Math.atan2(o.y-u.y,o.x-u.x)-ang);if(da>Math.PI)da=Math.PI*2-da;if(da>1.1)continue;
      const main=o===t||(!t&&!hitAny);const amt=main?dmg:(Wp.cleave?dmg*Wp.cleave:0);if(amt<=0)continue;
      dealt+=dealDamage(o,amt,'p',u,false,crit&&main);hitAny=true;if(main){first=o;if(crit&&o.mob&&!o.boss&&!o.golem&&!o.dead){o.kb={vx:nx*460,vy:ny*460,t:.13};o.dash=null}}}
    if(hitAny){addFury(u);sndAt(crit?'crit':first&&first.hero?'hitm':'hit',u.x,u.y);const ls=(Wp.ls||0)+(u.lsT>0?.1:0);if(ls)heal(u,dealt*ls);if(Wp.el&&first)elemHit(u,first,Wp.el,.45)}
  }else{const F=Wp.fused?Wp:null;let k,el=null;
    if(F){if(F.arch==='RS'){k=13;el=F.el}else if(F.arch==='RR')k=7;else{u.altE=!u.altE;el=u.altE&&F.el2?F.el2:F.el;k=BK[el]}}
    else k=u.wk==='fire'?1:u.wk==='frost'?3:u.wk==='xbow'?7:u.wk==='storm'?10:0;
    const o={spd:u.pspd,r:k===0||k===7||k===13?8:k===1?12:11,dmg,type:Wp.magic?'m':'p',crit,kind:k,slow:Wp.chill?1:0,slowAmt:Wp.chill||0,life:(u.range+80)/u.pspd,el,elP:.45,basic:1,
      st:!F&&(k===1||k===3||k===10)?u.wk:undefined};   // a staff's bolt leaves its element's status
    if(F&&F.arch==='RR'){o.dmg=dmg*.58;for(const s of[-1,1]){const a=Math.atan2(ny,nx)+s*.05;proj(u,Math.cos(a),Math.sin(a),o)}}   // twin crossbows: two bolts a shot
    else proj(u,nx,ny,o);
    sndAt(k===0||k===7||k===13?'shoot':k===1?'orb':k===10?'zap':'ice',u.x,u.y)}
  u.atkCd=Math.max(AS_MIN,u.atkCdBase*(u.asT>0?1/(1+u.asAmt):1)/(1+FURY_AS*(u.fury||0))*(isHuman(u)?1:1.1));return true;
}
// ap = aim point picked by the player (drag the skill button / mouse); without it the skill auto-targets
function cast(u,i,ap){return CURSED?castX(u,i,ap):cast0(u,i,ap)}
// SKV holds the level values; these are the attack and spell-power contributions.
const skillHitFactors={
  sword0:[.7],sword2:[.8],axe0:[.32],axe2:[1],dagger0:[.8],dagger2:[.35],bow0:[.6],bow1:[.4],bow2:[.15],fire0:[0,'base'],fire1:[0,'base'],fire2:[0,'base'],frost0:[0,'base'],frost1:[0,'base'],frost2:[0,'base'],storm0:[0,'base'],storm1:[0,'base'],storm2:[0,'base'],
  gsword0:[.9],gsword1:[.6],gsword2:[1.1],xbow0:[.7],xbow1:[.2],xbow2:[.18],
  MM0:[.75],MM2:[.9],MR0:[.85],MR2:[.3],MS0:[.8],MS1:[.05,'all'],MS2:[.9],RS0:[.6],RS1:[.05,'all'],RS2:[.15],
  RR0:[.15],RR1:[.35],RR2:[1.2],SS0:[0,'base'],SS1:[0,'base'],SS2:[0,'half'],SO1:[.6,'base'],SO2:[.8,'base'],fOR2:[.22,'base']
};
function skillHitDamage(key,V,level,attack,spell){
  const factor=skillHitFactors[key];
  if(!factor)return null;
  const [scale,mode]=factor,base=V.dmg[level],bonus=scale*attack;
  if(mode==='all')return (base+bonus)*spell;
  if(mode==='half')return base*spell*.5;
  return (mode==='base'?base*spell:base)+bonus;
}
const skillRoyalFollowup=(V,level,attack)=>V.dmg2[level]+.5*attack;
function cast0(u,i,ap){
  if(u.dead||u.stunT>0||u.dash||u.leap||u.kb||u.fuseT>0)return false;const L=u.skl[i];if(!L)return false;
  if(!u.wk){if(isHuman(u)&&u.cd[i]<=0){fxTextFor(u.x,u.y-80,'ต้องเก็บอาวุธก่อนจึงใช้สกิลได้','#ffd0a0',1.4,[u.id]);u.cd[i]=1}return false}
  const s=SK[u.wk][i],li=L-1;if(u.cd[i]>0)return false;const cost=s.mp[li];
  if(u.mp<cost){if(isHuman(u))emit({t:'s',n:'nomana',x:0,y:0,g:1,v:[u.id]});return false}
  if(u.rootT>0&&((u.wk==='sword'&&i!==1)||(u.wk==='dagger'&&i===0)||(u.wk==='bow'&&i===1)||ROOT_NO[u.wk+i]))return false;
  if((u.spinT>0||u.lotusT>0)&&!(i===1))return false;
  const V=SKV[u.wk][i],A=u.atkDmg,SA=(1+spellAmp(u))*SKILL_K,rngS=s.range[li]||400;
  if(ap&&!(Math.hypot(ap.x-u.x,ap.y-u.y)>8))ap=null;
  const ft=!isHuman(u)&&u.ai.tgt&&!u.ai.tgt.dead?u.ai.tgt:null,tg=ft?{x:ft.x,y:ft.y,t:ft}:ap?{x:ap.x,y:ap.y,t:enemyNear(u,ap,rngS)}:aim(u,rngS);
  const dx=tg.x-u.x,dy=tg.y-u.y,d=Math.hypot(dx,dy)||1,nx=dx/d,ny=dy/d;
  if(u.invisT>0&&!(u.wk==='dagger'&&i===1)){u.invisT=0;u.bsReady=true}
  const face=()=>{u.fx=nx;u.fy=ny;u.revealT=1.2;u.castAnim=.4};
  const hit=skillHitDamage(u.wk+i,V,li,A,SA);
  switch(u.wk+i){
    case 'sword0':{face();const sp=1400;u.dash={vx:nx*sp,vy:ny*sp,t:Math.min(d+30,rngS)/sp,dmg:hit,stun:V.stun[li],hit:new Set(),stop:true};sndAt('dash',u.x,u.y);fxE('dash',{id:u.id,x:u.x|0,y:u.y|0,a:+Math.atan2(ny,nx).toFixed(2)});break}
    case 'sword1':u.shieldHp=V.sh[li]+.08*u.maxHp;u.shieldT=4;u.castAnim=.4;sndAt('shield',u.x,u.y);fxE('shield',{id:u.id,x:u.x|0,y:u.y|0});break;
    case 'sword2':{face();const p=landSpot(u,clampTo(u,tg,rngS));u.leap={sx:u.x,sy:u.y,tx:p.x,ty:p.y,t:0,T:.55,dmg:hit,stun:V.stun[li],r:V.r[li]};sndAt('leap',u.x,u.y);fxE('leap',{id:u.id,x:p.x|0,y:p.y|0,r:V.r[li]});break}
    case 'axe0':u.spinT=1.75;u.spinTick=0;u.spinR=0;u.spinDmg=hit;u.atkAnim=0;sndAt('spin',u.x,u.y);fxE('spin',{id:u.id,x:u.x|0,y:u.y|0});break;
    case 'axe1':{u.castAnim=.4;for(const o of units){if(o.dead||!isEnemy(u,o)||dist(u,o)>rngS+o.r*.5)continue;o.slowT=Math.max(o.slowT,2.5);o.slowAmt=Math.max(o.slowT>2.5?o.slowAmt:0,V.slow[li])}
      u.asT=5;u.asAmt=V.as[li];u.buffT=3;sndAt('cry',u.x,u.y);fxE('cry',{id:u.id,x:u.x|0,y:u.y|0,r:rngS});break}
    case 'axe2':{face();const ang=Math.atan2(ny,nx);aoe({x:u.x+nx*20,y:u.y+ny*20,r:rngS,ang,len:rngS,w:V.w,shape:'line',dmg:hit,type:'p',owner:u,delay:.45,kind:'line',stun:V.stun[li],big:true});sndAt('heavy',u.x,u.y);break}
    case 'dagger0':{const t=ft||(ap?tg.t:nearestEnemy(u,rngS+40,true));if(!t||dist(u,t)>rngS+60)return false;const ox=u.x,oy=u.y;const dd=dist(u,t)||1;const bx=(t.x-u.x)/dd,by=(t.y-u.y)/dd;let spot=null;
      for(let k=0;k<8&&!spot;k++){const a=Math.atan2(by,bx)+(k%2?1:-1)*Math.ceil(k/2)*.6;const q={x:t.x+Math.cos(a)*(t.r+u.r+14),y:t.y+Math.sin(a)*(t.r+u.r+14)};if(!blockedAt(q,u.r)&&!houseAt(q)===!houseAt(t))spot=q}
      if(!spot)return false;u.x=spot.x;u.y=spot.y;u.fx=(t.x-u.x)/(dist(u,t)||1);u.fy=(t.y-u.y)/(dist(u,t)||1);u.revealT=1.2;u.castAnim=.3;
      dealDamage(t,hit,'p',u);u.critNext=true;u.atkCd=0;sndAt('blink',u.x,u.y);fxE('blink',{x:ox|0,y:oy|0,x2:u.x|0,y2:u.y|0});break}
    case 'dagger1':u.invisT=V.t[li];u.invisSpd=V.spd[li];u.bsDmg=V.bs[li];u.bsReady=false;sndAt('invis',u.x,u.y);fxE('smoke',{x:u.x|0,y:u.y|0});break;
    case 'dagger2':u.lotusT=1.2;u.lotusTick=0;u.lotusDmg=hit;u.lotusR=rngS;u.slowT=0;u.rootT=0;sndAt('lotus',u.x,u.y);fxE('lotus',{id:u.id,x:u.x|0,y:u.y|0,r:rngS});break;
    case 'bow0':{face();const hs=new Set();for(let k=-2;k<=2;k++){const a=Math.atan2(ny,nx)+k*.13;proj(u,Math.cos(a),Math.sin(a),{spd:1150,r:9,dmg:hit,type:'p',kind:0,life:rngS/1150,hit:hs})}sndAt('shoot',u.x,u.y);break}
    case 'bow1':{face();proj(u,nx,ny,{spd:1300,r:12,dmg:hit,type:'p',kind:5,root:V.root[li],life:rngS/1300});
      let mx=-nx,my=-ny;u.dash={vx:mx*1100,vy:my*1100,t:.26,hit:null};sndAt('dash',u.x,u.y);fxE('dash',{id:u.id,x:u.x|0,y:u.y|0,a:+Math.atan2(my,mx).toFixed(2)});break}
    case 'bow2':{face();const p=clampTo(u,tg,rngS);aoe({x:p.x,y:p.y,r:260,dmg:hit,type:'p',owner:u,kind:'rain',dot:3,tick:.3,slow:.6,slowAmt:.3});sndAt('rain',p.x,p.y);break}
    case 'fire0':face();proj(u,nx,ny,{spd:820,r:18,dmg:hit,type:'m',kind:2,boom:110,bkind:'boom',el:'fire',elP:1,life:rngS/820});sndAt('orb',u.x,u.y);break;
    case 'fire1':{u.castAnim=.4;for(const o of units){if(o.dead||!isEnemy(u,o))continue;const dd=dist(u,o);if(dd>230+o.r*.6)continue;dealDamage(o,hit,'m',u);if(o.dead)continue;
        o.burnT=3;o.burnDps=V.burn[li]*SA;o.burnSrc=u;stAdd(u,o,'fire',2);if(!o.boss&&!o.golem){const kx=(o.x-u.x)/(dd||1),ky=(o.y-u.y)/(dd||1);o.kb={vx:kx*900,vy:ky*900,t:.28};o.dash=null}}
      aoe({x:u.x,y:u.y,r:230,dmg:0,owner:u,kind:'nova',fxOnly:true,vis:.45});sndAt('nova',u.x,u.y);emit({t:'k',a:5,x:u.x|0,y:u.y|0});break}
    case 'fire2':{face();const tu=ft||tg.t;const lead=tu?{x:tg.x+(tu.mvx||0)*speedOf(tu)*.6,y:tg.y+(tu.mvy||0)*speedOf(tu)*.6}:tg;const p=clampTo(u,lead,rngS);aoe({x:p.x,y:p.y,r:V.r[li],dmg:hit,type:'m',owner:u,delay:.85,kind:'meteor',big:true,burn:V.burn[li]*SA,el:'fire',elP:1});sndAt('meteor',p.x,p.y);break}
    case 'frost0':face();proj(u,nx,ny,{spd:1250,r:16,dmg:hit,type:'m',kind:4,pierce:1,slow:2,slowAmt:.4,el:'frost',elP:1,life:rngS/1250});sndAt('lance',u.x,u.y);break;
    case 'frost1':u.castAnim=.4;aoe({x:u.x,y:u.y,r:240,dmg:hit,type:'m',owner:u,kind:'frost',root:V.root[li],slow:V.root[li]+2,slowAmt:.4,el:'frost',elP:1});sndAt('frost',u.x,u.y);break;
    case 'frost2':{face();const p=clampTo(u,tg,rngS);aoe({x:p.x,y:p.y,r:330,dmg:hit,type:'m',owner:u,kind:'blizz',dot:4,tick:.4,slow:.6,slowAmt:.5,endStun:V.stun[li],st:'frost'});sndAt('freeze',p.x,p.y);break}
    // ---- greatsword ----
    case 'gsword0':{face();u.atkAnim=.3;const ang=Math.atan2(ny,nx);aoe({x:u.x,y:u.y,r:rngS,len:rngS,ang,arc:.95,shape:'cone',dmg:hit,type:'p',owner:u,kind:'crescent',slow:1.6,slowAmt:V.slow[li],vis:.4});sndAt('heavy',u.x,u.y);emit({t:'k',a:6,x:u.x|0,y:u.y|0});break}
    case 'gsword1':{u.castAnim=.4;u.spinT=Math.max(u.spinT,.35);u.spinTick=99;aoe({x:u.x,y:u.y,r:rngS,dmg:hit,type:'p',owner:u,kind:'whirl',kb:V.kb,stun:.5,vis:.45});sndAt('spin',u.x,u.y);break}
    case 'gsword2':{face();proj(u,nx,ny,{spd:1050,r:62,wr:20,dmg:hit,type:'p',kind:6,pierce:1,slow:2,slowAmt:.45,life:rngS/1050});sndAt('heavy',u.x,u.y);sndAt('lance',u.x,u.y);emit({t:'k',a:8,x:u.x|0,y:u.y|0});break}
    // ---- crossbow ----
    case 'xbow0':face();proj(u,nx,ny,{spd:1300,r:12,dmg:hit,type:'p',kind:8,boom:130,btype:'p',life:rngS/1300});sndAt('shoot',u.x,u.y);break;
    case 'xbow1':face();proj(u,nx,ny,{spd:1000,r:16,dmg:hit,type:'p',kind:9,boom:150,btype:'p',bkind:'net',broot:V.root[li],life:rngS/1000});sndAt('shoot',u.x,u.y);break;
    case 'xbow2':{face();const p=clampTo(u,tg,rngS);aoe({x:p.x,y:p.y,r:250,dmg:hit,type:'p',owner:u,kind:'volley',delay:.35,dot:1.8,tick:.3,slow:.5,slowAmt:.35,endStun:V.stun[li]});sndAt('rain',p.x,p.y);break}
    // ---- lightning staff ----
    case 'storm0':{const t=ft&&dist(u,ft)<=rngS+40?ft:ap?tg.t:nearestEnemy(u,rngS,true);if(!t)return false;const d0=dist(u,t)||1;u.fx=(t.x-u.x)/d0;u.fy=(t.y-u.y)/d0;u.revealT=1.2;u.castAnim=.4;
      const struck=new Set(),pts=[[u.x|0,u.y|0]];let cur=t,dm=hit;
      for(let k=0;k<V.n[li]&&cur;k++){struck.add(cur);pts.push([cur.x|0,cur.y|0]);dealDamage(cur,dm,'m',u);if(!cur.dead){cur.stunT=Math.max(cur.stunT,.18);stAdd(u,cur,'storm',2)}dm*=.8;
        let nb=null,bd=330;for(const o of units){if(o.dead||struck.has(o)||!isEnemy(u,o))continue;const dd=dist(cur,o);if(dd<bd){bd=dd;nb=o}}cur=nb}
      fxE('chain',{x:u.x|0,y:u.y|0,p:pts});sndAt('lance',t.x,t.y);break}
    case 'storm1':u.castAnim=.4;aoe({x:u.x,y:u.y,r:rngS,dmg:hit,type:'m',owner:u,kind:'static',follow:u,followAll:true,dot:3,tick:.5,slow:.6,slowAmt:.35,st:'storm',stP:.5});sndAt('nova',u.x,u.y);break;
    case 'storm2':{face();const p=clampTo(u,tg,rngS);aoe({x:p.x,y:p.y,r:310,dmg:hit,type:'m',owner:u,kind:'thunder',delay:.3,dot:1.6,tick:.32,endStun:V.stun[li],st:'storm',stP:.6});sndAt('thunder',p.x,p.y);break}
    default:if(!FUSED[u.wk]||castF(u,i,li,V,A,SA,rngS,tg,nx,ny,d,ft,ap,face)===false)return false;
  }
  u.mp-=cost;u.cd[i]=s.cd[li]*cdMul(u);return true;
}
// ===================== FUSED WEAPONS: elements + the 18 new skills =====================
const ROOT_NO={fMM0:1,fMM2:1,fMR1:1,fMS_fire2:1,fMS_frost2:1,fMS_storm2:1};
const EL=['fire','frost','storm'];
const EL_BURST={fire:'nova',frost:'frost',storm:'whirl'},EL_FIELD={fire:'burn',frost:'blizz',storm:'static'},EL_DOT={fire:'burn',frost:'blizz',storm:'thunder'};
// element riders on hits: fire burns, frost chills, storm arcs to a second enemy. k = strength (basic attacks ~.45, skills 1)
function elemHit(src,o,el,k){if(!o||o.dead||!el||!src)return;k=k||1;const amp=1+spellAmp(src);stAdd(src,o,el,k>=.8?2:1);if(o.dead)return;
  if(el==='fire'){const dps=(10+1.1*src.lvl)*k*amp;if(o.burnT<=0||o.burnDps<dps){o.burnDps=dps;o.burnSrc=src}o.burnT=Math.max(o.burnT,2.5)}
  else if(el==='frost'){const T=1.1+.6*k,s=.16+.16*k;o.slowAmt=Math.max(o.slowT>T?o.slowAmt:0,s);o.slowT=Math.max(o.slowT,T)}
  else if(el==='storm'){if(Math.random()>.18+.42*k)return;let nb=null,bd=280;for(const q of units){if(q.dead||q===o||!isEnemy(src,q)||Math.abs(q.x-o.x)>bd)continue;const dd=dist(o,q);if(dd<bd){bd=dd;nb=q}}
    const dm=(8+1.6*src.lvl)*(.4+.6*k)*amp,tg=nb||o;dealDamage(tg,dm,'m',src,true);if(!tg.dead)tg.stunT=Math.max(tg.stunT,.12*k);
    if(nb)fxE('chain',{x:o.x|0,y:o.y|0,p:[[o.x|0,o.y|0],[nb.x|0,nb.y|0]]});else fxE('hit',{x:o.x|0,y:o.y|0,c:'#c8b4ff'})}}
// ---- element statuses (owner 2026-11-21: mages felt weak, so every element now leaves a status that builds up) ----
//  fire  เผาไหม้   up to 4 stacks, 3 s: each burns 0.5% of max HP a second on top of the flat burn
//  frost หนาวเหน็บ up to 5 stacks, 2.6 s: 7% slow each; the 5th freezes the target solid (heroes .5 s, monsters 1.4 s, bosses .45 s)
//                  with a burst of 3% max HP, and it cannot be frozen again for 6 s
//  storm ไฟฟ้าสถิต up to 5 stacks, 4 s: the target takes 1.5% more damage per stack; the 5th overloads it (3% max HP, a short stun,
//                  arcs to two enemies nearby) and the stacks reset
// Basic hits add one stack, skills two (elemHit k>=.8), damage-over-time fields one per tick (aoe st, stP = chance). Big monsters measure the % against
// a capped HP, and hero-vs-hero damage is still damped by PVP_K in dealDamage.
const ST_HP=o=>o.hero?o.maxHp:Math.min(o.maxHp,o.boss||o.golem||o.ecl||o.lord?2400:3600);
function stAdd(src,o,el,n){if(src&&src.pet&&src.owner)src=src.owner;if(!o||o.dead||!src||!el||o.reviveT>0)return;n=n||1;const H=[];if(isHuman(o))H.push(o.id);if(isHuman(src))H.push(src.id);
  if(el==='fire'){o.ign=Math.min(4,(o.ignT>0?o.ign||0:0)+n);o.ignT=3;o.ignSrc=src}
  else if(el==='frost'){if(o.frzImm>0)return;o.chill=Math.min(5,(o.chillT>0?o.chill||0:0)+n);o.chillT=2.6;o.slowAmt=Math.max(o.slowT>0?o.slowAmt:0,.07*o.chill);o.slowT=Math.max(o.slowT,1.2);
    if(o.chill>=5){o.chill=0;o.chillT=0;const T=o.boss?.45:o.hero?.5:o.golem||o.ecl?.9:1.4;o.stunT=Math.max(o.stunT,T);o.frzImm=T+6;
      fxE('freeze',{id:o.id,x:o.x|0,y:o.y|0});sndAt('freeze',o.x,o.y);if(H.length)fxTextFor(o.x,o.y-o.r-46,'❄ แช่แข็ง!','#bfefff',1.1,H);
      dealDamage(o,ST_HP(o)*.03+6+.8*(src.lvl||1),'m',src,false)}}
  else if(el==='storm'){o.stat=Math.min(5,(o.statT>0?o.stat||0:0)+n);o.statT=4;
    if(o.stat>=5){o.stat=0;o.statT=0;const dm=ST_HP(o)*.03+6+.9*(src.lvl||1),pts=[[o.x|0,o.y|0]];let n2=0;
      for(const q of units){if(n2>=2)break;if(q.dead||q===o||!isEnemy(src,q)||Math.abs(q.x-o.x)>300||dist(o,q)>300)continue;pts.push([q.x|0,q.y|0]);n2++;dealDamage(q,dm*.5,'m',src,true)}
      fxE('chain',{x:o.x|0,y:o.y|0,p:pts.length>1?pts:[[o.x|0,o.y-120|0],[o.x|0,o.y|0]]});fxE('hit',{x:o.x|0,y:o.y|0,c:'#c8b4ff'});sndAt('zap',o.x,o.y);
      if(H.length)fxTextFor(o.x,o.y-o.r-46,'⚡ ช็อต!','#d8c8ff',1.1,H);
      dealDamage(o,dm,'m',src,false);if(!o.dead)o.stunT=Math.max(o.stunT,o.hero?.2:o.boss?.2:.6)}}}
function castF(u,i,li,V,A,SA,rngS,tg,nx,ny,d,ft,ap,face){const F=WEAPONS[u.wk],e=F.el,ang=Math.atan2(ny,nx);
  const hit=skillHitDamage(F.arch+i,V,li,A,SA);
  switch(F.arch+i){
    // ---- 👑 twin royal swords ----
    case 'MM0':{face();const sp=1500;u.dash={vx:nx*sp,vy:ny*sp,t:Math.min(d+80,rngS)/sp,dmg:hit,stun:0,slow:V.slow[li],hit:new Set(),stop:false};
      emit({t:'w',id:u.id,a:+ang.toFixed(2),r:150,c:F.glow,k:1});sndAt('dash',u.x,u.y);sndAt('heavy',u.x,u.y);fxE('dash',{id:u.id,x:u.x|0,y:u.y|0,a:+ang.toFixed(2)});break}
    case 'MM1':u.shieldHp=V.sh[li]+.06*u.maxHp;u.shieldT=4;u.asT=5;u.asAmt=V.as[li];u.buffT=3;u.lsT=5;u.castAnim=.4;sndAt('shield',u.x,u.y);sndAt('cry',u.x,u.y);
      fxE('royal',{id:u.id,x:u.x|0,y:u.y|0});break;
    case 'MM2':{face();const p=landSpot(u,clampTo(u,tg,rngS));u.leap={sx:u.x,sy:u.y,tx:p.x,ty:p.y,t:0,T:.5,dmg:hit,stun:V.stun[li],r:V.r[li],k2:skillRoyalFollowup(V,li,A)};
      sndAt('leap',u.x,u.y);fxE('leap',{id:u.id,x:p.x|0,y:p.y|0,r:V.r[li]});break}
    // ---- 🔱 soul-hunter spear ----
    case 'MR0':face();proj(u,nx,ny,{spd:1500,r:24,dmg:hit,type:'p',kind:11,pierce:1,slow:1.5,slowAmt:.35,life:rngS/1500});sndAt('lance',u.x,u.y);sndAt('heavy',u.x,u.y);break;
    case 'MR1':{face();const sp=1350;u.dash={vx:nx*sp,vy:ny*sp,t:Math.max(.12,Math.min(d,rngS)/sp),hit:null};u.critNext=true;u.bonusNext=V.bs[li]+.3*A;u.atkCd=0;u.buffT=Math.max(u.buffT,2);
      sndAt('dash',u.x,u.y);fxE('dash',{id:u.id,x:u.x|0,y:u.y|0,a:+ang.toFixed(2)});fxE('gust',{x:u.x|0,y:u.y|0,a:+ang.toFixed(2)});break}
    case 'MR2':u.spinT=2.2;u.spinTick=0;u.spinDmg=hit;u.spinR=rngS;u.atkAnim=0;aoe({x:u.x,y:u.y,r:rngS,dmg:0,owner:u,kind:'spirit',follow:u,followAll:true,dot:2.2,tick:9});
      sndAt('spin',u.x,u.y);sndAt('invis',u.x,u.y);break;
    // ---- element blade ----
    case 'MS0':face();proj(u,nx,ny,{spd:1150,r:56,wr:18,dmg:hit,type:'p',kind:12,el:e,elP:1,pierce:1,life:rngS/1150});sndAt('heavy',u.x,u.y);sndAt(e==='fire'?'orb':e==='frost'?'ice':'lance',u.x,u.y);emit({t:'k',a:5,x:u.x|0,y:u.y|0});break;
    case 'MS1':u.castAnim=.4;aoe({x:u.x,y:u.y,r:rngS,dmg:hit,type:'m',owner:u,kind:EL_FIELD[e],follow:u,followAll:true,dot:4,tick:.5,el:e,elP:.6});sndAt(e==='frost'?'frost':'nova',u.x,u.y);break;
    case 'MS2':{face();const p=landSpot(u,clampTo(u,tg,rngS));u.leap={sx:u.x,sy:u.y,tx:p.x,ty:p.y,t:0,T:.55,dmg:hit,stun:V.stun[li],r:V.r[li],el:e};
      sndAt('leap',u.x,u.y);fxE('leap',{id:u.id,x:p.x|0,y:p.y|0,r:V.r[li]});break}
    // ---- element bow ----
    case 'RS0':{face();const hs=new Set();for(let k=-1;k<=1;k++){const a=ang+k*.16;proj(u,Math.cos(a),Math.sin(a),{spd:1300,r:10,dmg:hit,type:'p',kind:13,el:e,elP:1,life:rngS/1300,hit:hs})}sndAt('shoot',u.x,u.y);break}
    case 'RS1':{face();const p=clampTo(u,tg,rngS);aoe({x:p.x,y:p.y,r:220,dmg:hit,type:'m',owner:u,kind:EL_FIELD[e],dot:4,tick:.5,el:e,elP:.7,slow:.6,slowAmt:.25});sndAt(e==='frost'?'frost':'nova',p.x,p.y);break}
    case 'RS2':{face();const p=clampTo(u,tg,rngS);aoe({x:p.x,y:p.y,r:280,dmg:hit,type:'p',owner:u,kind:'rain',dot:3,tick:.3,el:e,elP:.5,endStun:V.stun[li]});
      aoe({x:p.x,y:p.y,r:260,dmg:0,owner:u,kind:EL_FIELD[e],dot:3,tick:9});sndAt('rain',p.x,p.y);break}
    // ---- 🐉 twin dragon crossbows ----
    case 'RR0':{face();const t0=ft||(ap?tg.t:nearestEnemy(u,rngS+60,true));u.rapid={n:6,t:0,nx,ny,dmg:hit,rng:rngS,tg:t0||null,side:1};sndAt('shoot',u.x,u.y);break}
    case 'RR1':{face();const p=clampTo(u,tg,rngS);aoe({x:p.x,y:p.y,r:170,dmg:hit,type:'p',owner:u,kind:'boom',delay:.9,root:V.root[li],slow:V.root[li]+1,slowAmt:.4});
      fxE('trap',{x:p.x|0,y:p.y|0});sndAt('trap',p.x,p.y);break}
    case 'RR2':face();proj(u,nx,ny,{spd:1700,r:46,dmg:hit,type:'p',kind:14,pierce:1,ghost:1,kbF:650,el:'fire',elP:.8,life:rngS/1700});sndAt('roar',u.x,u.y);sndAt('lance',u.x,u.y);emit({t:'k',a:9,x:u.x|0,y:u.y|0});break;
    // ---- two-element staff ----
    case 'SS0':{face();for(const [s,el] of[[-1,F.el],[1,F.el2]]){const a=ang+s*.08;proj(u,Math.cos(a),Math.sin(a),{spd:950,r:17,dmg:hit,type:'m',kind:15,el,elP:1,boom:95,life:rngS/950})}sndAt('orb',u.x,u.y);sndAt('ice',u.x,u.y);break}
    case 'SS1':{u.castAnim=.4;for(const o of units){if(o.dead||!isEnemy(u,o))continue;const dd=dist(u,o);if(dd>rngS+o.r*.6)continue;dealDamage(o,hit,'m',u);if(o.dead)continue;
        elemHit(u,o,F.el,.8);elemHit(u,o,F.el2,.8);if(!o.boss&&!o.golem){const kx=(o.x-u.x)/(dd||1),ky=(o.y-u.y)/(dd||1);o.kb={vx:kx*650,vy:ky*650,t:.26};o.dash=null}}
      for(const el of[F.el,F.el2])aoe({x:u.x,y:u.y,r:rngS,dmg:0,owner:u,kind:EL_BURST[el],fxOnly:true,vis:.45});sndAt('nova',u.x,u.y);emit({t:'k',a:5,x:u.x|0,y:u.y|0});break}
    case 'SS2':{face();const p=clampTo(u,tg,rngS);let n=0;for(const el of[F.el,F.el2]){aoe({x:p.x,y:p.y,r:320,dmg:hit,type:'m',owner:u,kind:EL_DOT[el],delay:.3,dot:3.5,tick:.35,el,elP:.5,endStun:n++?V.stun[li]:0})}
      sndAt(F.el==='storm'||F.el2==='storm'?'thunder':'freeze',p.x,p.y);sndAt(F.el==='fire'?'meteor':'frost',p.x,p.y);break}
    default:return false}
  return true}
// twin-crossbow volley: one bolt every 0.09s, re-aimed at the locked target
// impact sound by projectile kind: arrows thunk, fire bursts, ice cracks, lightning crackles
function projHitSnd(p){const k=p.kind,e=p.el;if(e)return e==='fire'?'fhit':e==='frost'?'ihit':'ehit';return k===0||k===5||k===7||k===13?'ahit':k===1||k===2?'fhit':k===3||k===4?'ihit':k===10?'ehit':k===11?'hitm':'hit'}
function rapidTick(u,dt){const R=u.rapid;if(u.stunT>0||u.kb||u.fuseT>0){u.rapid=null;return}R.t-=dt;
  while(u.rapid&&R.t<=0){R.t+=.09;let nx=R.nx,ny=R.ny;if(R.tg&&!R.tg.dead&&dist(u,R.tg)<R.rng+120){const d=dist(u,R.tg)||1;nx=(R.tg.x-u.x)/d;ny=(R.tg.y-u.y)/d}
    R.side=-R.side;const a=Math.atan2(ny,nx)+R.side*.05+rand(-.03,.03);u.fx=nx;u.fy=ny;u.atkAnim=.2;u.atkSlowT=.2;
    proj(u,Math.cos(a),Math.sin(a),{spd:1600,r:9,dmg:R.dmg,type:'p',kind:8,life:R.rng/1600,boom:60,btype:'p',bkind:'boom'});sndAt('shoot',u.x,u.y);if(--R.n<=0)u.rapid=null}}
// ---- equipment: a weapon in hand + a backup slot; at 10:00 two different weapons fuse into one ----
function botWantsWeapon(u,it){if(!u.wk)return 5+it.tier;const fz=!!FUSED[it.wk];
  if(it.wk===u.wk)return it.tier>u.wt?2+it.tier:-1;
  if(FUSED[u.wk])return fz&&it.tier>u.wt?1+it.tier-u.wt:-1;   // already fused: only a better fused weapon
  if(fz)return it.tier>=u.wt-1?3+it.tier:-1;                    // a fused weapon on the ground beats base gear
  if(it.wk===u.wk2)return it.tier>u.wt2?1+it.tier-u.wt2:-1;
  if(!u.wk2)return 2+it.tier*.4;                               // a second kind of weapon: it fuses at 10:00
  const pref=it.wk===u.ai.pref;if(it.tier>u.wt+(pref?0:1))return 1+it.tier-u.wt+(pref?1:0);if(pref&&it.tier>=u.wt&&u.wk!==u.ai.pref)return 1.5;return -1}
// where a picked-up weapon goes: main / upMain / upBack / back (empty backup) / lift (fused into hand, old one to the backup) / push (new in hand, hand -> backup, backup dropped)
function wSlot(u,it){if(!u.wk)return'main';if(it.wk===u.wk)return'upMain';if(it.wk===u.wk2)return'upBack';if(!u.wk2)return FUSED[it.wk]&&!FUSED[u.wk]?'lift':'back';return'push'}
const wName=(k,t)=>`${WEAPONS[k].ic} ${WEAPONS[k].names[Math.max(0,t)]}`;
function equipWeapon(u,it){it.dead=true;removeItem(it);const slot=wSlot(u,it),H=isHuman(u)?[u.id]:null;
  const drop=(k,t,v)=>dropItem({k:'w',x:u.x+rand(-25,25),y:u.y+30,wk:k,tier:t,wv:v,np:{id:u.id,until:gameT+3}});const nv=CURSED?itWV(it):0;
  if(slot==='upBack'||slot==='back'){if(slot==='upBack')drop(u.wk2,u.wt2,u.wv2);u.wk2=it.wk;u.wt2=it.tier;u.wv2=nv;sndAt('armor',u.x,u.y);fxE('equip',{id:u.id,x:u.x|0,y:u.y|0,c:TIERS[it.tier].c});
    if(H){const fk=!FUSED[u.wk]&&!FUSED[it.wk]?fuseKey(u.wk,it.wk):null;fxTextFor(u.x,u.y-84,`🎒 อาวุธสำรอง: ${wName(it.wk,it.tier)}`,TIERS[it.tier].c,2,H);
      if(fk&&gameT<FUSE_AT)fxTextFor(u.x,u.y-110,`⚒️ นาที 10 จะหลอมเป็น ${WEAPONS[fk].ic} ${WEAPONS[fk].n}`,WEAPONS[fk].col,2.6,H)}
    return}
  if(slot==='upMain')drop(u.wk,u.wt,u.wv);else if(slot==='push'){drop(u.wk2,u.wt2,u.wv2);u.wk2=u.wk;u.wt2=u.wt;u.wv2=u.wv}else if(slot==='lift'){u.wk2=u.wk;u.wt2=u.wt;u.wv2=u.wv}
  u.wk=it.wk;u.wt=it.tier;u.wv=nv;u.spinT=0;u.lotusT=0;u.rapid=null;recalc(u);sndAt('weapon',u.x,u.y);fxE('equip',{id:u.id,x:u.x|0,y:u.y|0,c:TIERS[it.tier].c});
  if(H)fxTextFor(u.x,u.y-84,`${wName(it.wk,it.tier)} (${TIERS[it.tier].n})`,TIERS[it.tier].c,2,H);if(H&&CURSED&&nv)fxTextFor(u.x,u.y-110,wvText(nv),'#e8d8a0',2.6,H);
  if(it.tier===3)emit({t:'f',s:`⭐ ${u.name} ได้อาวุธตำนาน!`,v:H||[]});
  if(it.tier===4){emit({t:'f',s:`🌈 ${u.name} ถืออาวุธระดับ SSR!`,v:H||[]});fxE('ssr',{id:u.id,x:u.x|0,y:u.y|0})}}
// swap the weapon in hand with the backup (T key / tap the weapon portrait)
function swapWeapons(u){if(!u||u.dead||!u.wk2||u.fuseT>0||u.leap||u.dash)return false;const k=u.wk,t=u.wt,v=u.wv;u.wk=u.wk2;u.wt=u.wt2;u.wv=u.wv2;u.wk2=k;u.wt2=t;u.wv2=v;
  u.spinT=0;u.lotusT=0;u.rapid=null;recalc(u);u.atkCd=Math.max(u.atkCd,.3);sndAt('weapon',u.x,u.y);fxE('equip',{id:u.id,x:u.x|0,y:u.y|0,c:TIERS[Math.max(0,u.wt)].c});
  if(isHuman(u))fxTextFor(u.x,u.y-84,'🔁 '+wName(u.wk,u.wt),TIERS[Math.max(0,u.wt)].c,1.4,[u.id]);return true}
// ---- fusion ----
const canFuse=u=>!!(u.wk&&u.wk2&&!FUSED[u.wk]&&!FUSED[u.wk2]&&fuseKey(u.wk,u.wk2));
const fuseTier=(a,b)=>Math.min(4,Math.max(a,b)+(a===b&&a>=2?1:0));
function startFuse(u){u.fuseT=1.2;u.rapid=null;fxE('fusing',{id:u.id,x:u.x|0,y:u.y|0,a:AW.indexOf(u.wk),b:AW.indexOf(u.wk2)});sndAt('fusing',u.x,u.y);
  if(isHuman(u))fxTextFor(u.x,u.y-96,'⚒️ กำลังหลอมอาวุธ…','#ffd27a',1.4,[u.id],1)}
function fuseNow(u){u.fuseT=0;if(!canFuse(u))return;const a=u.wk,b=u.wk2,fk=fuseKey(a,b),t=fuseTier(u.wt,u.wt2),F=WEAPONS[fk];
  u.wk=fk;u.wt=t;u.wk2=null;u.wt2=-1;u.wv2=0;u.spinT=0;u.lotusT=0;u.cd=[0,0,0];recalc(u);u.mp=u.maxMp;heal(u,u.maxHp*.3);
  fxE('fuse',{id:u.id,x:u.x|0,y:u.y|0,w:AW.indexOf(fk),tr:t});sndAt('fuse',u.x,u.y);emit({t:'k',a:8,x:u.x|0,y:u.y|0});
  if(isHuman(u)){emit({t:'f',s:`⚒️ ${u.name} ${WEAPONS[a].ic}+${WEAPONS[b].ic} → ${F.ic} ${F.names[t]}`,v:[u.id]});emit({t:'a',s:`⚒️ หลอมสำเร็จ! ${F.ic} ${F.names[t]}`,d:4,v:[u.id]});
    fxTextFor(u.x,u.y-96,`${F.ic} ${F.n}`,F.col,2.4,[u.id],1)}
  if(t===4)fxE('ssr',{id:u.id,x:u.x|0,y:u.y|0})}
let fuseWarn=0;
function fuseTick(){if(fuseWarn===0&&gameT>25){fuseWarn=1;emit({t:'f',s:'⚒️ พกอาวุธ 2 ชนิด · นาทีที่ 10 หลอมเป็นอาวุธใหม่'})}
  if(fuseWarn===1&&gameT>=FUSE_AT-180){fuseWarn=2;emit({t:'f',s:'⚒️ อีก 3 นาทีหลอมอาวุธ · แตะรูปอาวุธเพื่อสลับ'})}
  if(fuseWarn===2&&gameT>=FUSE_AT-30){fuseWarn=3;emit({t:'a',s:'⚒️ อีก 30 วิหลอมอาวุธ — พกอาวุธ 2 ชนิดไว้!',d:4});emit({t:'s',n:'fusewarn',x:0,y:0,g:1})}
  if(fuseWarn===3&&gameT>=FUSE_AT){fuseWarn=4;emit({t:'a',s:'⚒️ ถึงเวลาหลอมอาวุธ!',d:3.5});emit({t:'f',s:'⚒️ เริ่มหลอม! ได้ชิ้นที่ 2 เมื่อไหร่หลอมทันที'})}}
function equipArmor(u,it){it.dead=true;removeItem(it);
  if(u.at>=0)dropItem({k:'r',x:u.x+rand(-25,25),y:u.y+30,tier:u.at,np:{id:u.id,until:gameT+3}});
  u.at=it.tier;recalc(u);sndAt('armor',u.x,u.y);fxE('equip',{id:u.id,x:u.x|0,y:u.y|0,c:ARMORS[it.tier].c});
  if(isHuman(u))fxTextFor(u.x,u.y-84,`${ARMORS[it.tier].ic} ${ARMORS[it.tier].n}`,ARMORS[it.tier].c,2,[u.id])}
function pickSwap(u,id){if(!u||u.dead||u.fuseT>0)return;const it=items.find(i=>i.id===id&&!i.dead);if(!it||dist(u,it)>u.r+60)return;if(it.k==='w')equipWeapon(u,it);else if(it.k==='r')equipArmor(u,it)}
function swapCandidate(u){if(!u||u.dead||!u.wk)return null;let best=null,bd=1e9;for(const it of items){if(it.dead||it.k!=='w'||(it.wk===u.wk||it.wk===u.wk2)&&!(CURSED&&it.wk===u.wk&&it.tier>=u.wt&&itWV(it)!==(u.wv|0)))continue;const d=dist(u,it);if(d>u.r+52||d>=bd)continue;best=it;bd=d}return best}
// ---- house chests: press to open, BOX_RATE chance of loot ----
const BOX_RATE=.68;   // 2026-11-23: was .2 — chests are a main source of gear now
function boxNear(u){if(!u||u.dead)return null;let best=null,bd=1e9;for(const b of boxes){if(b.open||Math.abs(b.x-u.x)>110||Math.abs(b.y-u.y)>110)continue;const d=dist(u,b);if(d>u.r+62||d>=bd)continue;
    const h=WD.houses[b.house];if(h&&!inRect(u,h,0))continue;best=b;bd=d}return best}
function openBox(u,id){const b=boxes[id];if(!b||b.open||!u||u.dead||dist(u,b)>u.r+70)return;const h=WD.houses[b.house];if(h&&!inRect(u,h,4))return;
  b.open=true;const ok=Math.random()<BOX_RATE;const fx=b.x+Math.cos(b.a)*34,fy=b.y+Math.sin(b.a)*34;
  fxE('box',{id,x:b.x|0,y:b.y|0,ok:ok?1:0});sndAt(ok?'chest':'pick',b.x,b.y);const H=isHuman(u)?[u.id]:null;
  if(ok){const r=Math.random(),sx=-Math.sin(b.a)*30,sy=Math.cos(b.a)*30;
    if(r<.48)dropItem({k:'w',x:fx,y:fy,wk:WK[Math.floor(Math.random()*WK.length)],tier:pickTier([6,36,38,18,2])});
    else if(r<.84)dropItem({k:'r',x:fx,y:fy,tier:pickTier([0,22,40,30,8])});
    else dropItem({k:'c',x:fx,y:fy,n:2,gold:true});
    if(Math.random()<.35){const q=Math.random();if(q<.5)dropItem({k:'p',x:fx+sx,y:fy+sy,b:Math.random()<.6?0:1});else if(q<.8)dropItem({k:'c',x:fx+sx,y:fy+sy,n:1});else dropItem({k:'r',x:fx+sx,y:fy+sy,tier:pickTier([20,40,30,10,0])})}
    if(H)fxTextFor(b.x,b.y-46,'✨ เจอของ!','#ffe27a',1.5,H,1)}
  else if(H)fxTextFor(b.x,b.y-46,'📦 ว่างเปล่า…','#c8c0b0',1.3,H)}
function tryPickup(u){
  for(const it of items){
    if(it.dead||Math.abs(it.x-u.x)>60||dist(u,it)>u.r+20)continue;
    if(it.np&&it.np.id===u.id&&gameT<it.np.until)continue;
    const H=isHuman(u)?[u.id]:[];
    if(it.k==='c'){it.dead=true;removeItem(it);burstE(it.x,it.y,it.gold?'#ffd35a':'#e0b070',16);sndAt('chest',it.x,it.y);fxE('chest',{x:it.x|0,y:it.y|0,c:it.gold?'#ffd35a':'#e0b070'});
      for(let k=0;k<it.n;k++){const ii=pickW(ITEMS);const b=ii.id==='potion'?0:ii.id==='mana'?1:-1;const bagged=b>=0&&bagAdd(u,b);if(!bagged)applyItem(u,ii);if(H.length)fxTextFor(it.x,it.y-30-k*26,(bagged?'🎒 ':'')+ii.ic+' '+ii.name,'#ffe9a8',1.6,H)}
      const r=Math.random();if(r<(it.gold?.55:.28))dropItem({k:'w',x:it.x+rand(-30,30),y:it.y+rand(10,30),wk:Math.random()<.5&&u.wk&&!FUSED[u.wk]?u.wk:WK[Math.floor(Math.random()*WK.length)],tier:pickTier(it.gold?[15,40,35,10]:[50,36,14,0])});
      else if(r<(it.gold?.9:.5))dropItem({k:'r',x:it.x+rand(-30,30),y:it.y+rand(10,30),tier:pickTier(it.gold?[0,20,40,40,0]:[30,40,25,5,0])});
    }else if(it.k==='i'){const ii=ITEM_BY[it.it];const b=ii.id==='potion'?0:ii.id==='mana'?1:-1;
      if(b>=0&&u.bag[b]>=BAG[b].max&&(b===0?u.hp>u.maxHp*.9:u.mp>u.maxMp*.9)){if(H.length&&!(it.hint&&it.hint[u.id])){(it.hint=it.hint||{})[u.id]=1;fxTextFor(it.x,it.y-34,'🎒 กระเป๋าเต็ม','#c9d6d8',1.2,H)}continue}
      it.dead=true;removeItem(it);const bagged=b>=0&&bagAdd(u,b);if(!bagged)applyItem(u,ii);sndAt('pick',it.x,it.y);if(H.length)fxTextFor(it.x,it.y-30,(bagged?'🎒 +':'')+ii.ic+' '+ii.name,'#ffe9a8',1.4,H)}
    else if(it.k==='p'){const b=clamp(it.b|0,0,BAG.length-1);if(u.bag[b]>=BAG[b].max){if(H.length&&!(it.hint&&it.hint[u.id])){(it.hint=it.hint||{})[u.id]=1;fxTextFor(it.x,it.y-34,'🎒 กระเป๋าเต็ม','#c9d6d8',1.2,H)}continue}
      it.dead=true;removeItem(it);bagAdd(u,b);sndAt('pick',it.x,it.y);if(H.length)fxTextFor(it.x,it.y-30,'🎒 +'+BAG[b].ic+' '+BAG[b].n,'#ffe9a8',1.4,H)}
    else if(it.k==='a'){if(u.aegis)continue;it.dead=true;removeItem(it);u.aegis=true;emit({t:'s',n:'aegis',x:u.x|0,y:u.y|0,g:1});emit({t:'f',s:`⚜️ ${u.name} ได้โล่อมตะ (ฟื้นได้ 1 ครั้ง)`});burstE(u.x,u.y,'#ffe27a',24)}
    else if(it.k==='w'){const sl=wSlot(u,it);
      if(H.length?(sl==='main'||sl==='back'||sl==='lift'||sl==='upMain'&&it.tier>u.wt||sl==='upBack'&&it.tier>u.wt2):botWantsWeapon(u,it)>0)equipWeapon(u,it);
      else if(H.length){it.hint=it.hint||{};if(!it.hint[u.id]){it.hint[u.id]=1;fxTextFor(it.x,it.y-34,sl==='upMain'||sl==='upBack'?'มีอาวุธนี้ที่ดีกว่าแล้ว':'กดปุ่ม 🔄 เพื่อรับอาวุธนี้','#c9d6d8',1.4,H)}}}
    else if(it.k==='r'){
      if(it.tier>u.at)equipArmor(u,it);
      else if(H.length){it.hint=it.hint||{};if(!it.hint[u.id]){it.hint[u.id]=1;fxTextFor(it.x,it.y-34,'มีเกราะที่ดีกว่าแล้ว','#c9d6d8',1.2,H)}}}
  }
}
// ---- backpack ----
function bagAdd(u,b){if(!u.bag||u.bag[b]>=BAG[b].max)return false;u.bag[b]++;return true}
// potions under attack (owner 2026-11-21): while the drinker has taken damage from an enemy in the last POT_FIGHT seconds, healing and mana
// potions restore half. The heal/mana over time checks every tick, so a hit halfway through halves the rest while the fight goes on,
// and stepping out of the fight brings the full rate back. The storm (pure damage, no source) does not count as being attacked.
const POT_FIGHT=3;
function potFight(u){return gameT-(u.lastDmgT===undefined?-99:u.lastDmgT)<POT_FIGHT}
function potK(u){return potFight(u)?.5:1}
function usePotion(u,b){const B=BAG[b];if(!B||!u||u.dead||!u.hero||u.bag[b]<=0||u.bcd[b]>0)return false;u.bag[b]--;u.bcd[b]=B.cd;const fight=B.k!=='spd'&&potFight(u);
  if(B.k==='hp'){u.hotT=3;u.hotP=0;u.hotV=u.maxHp*.4/3}else if(B.k==='mp'){u.motT=2;u.motV=u.maxMp*.5/2}
  else if(B.k==='big'){const k=fight?.5:1;u.hp=Math.min(u.maxHp,u.hp+(u.maxHp-u.hp)*k);u.mp=Math.min(u.maxMp,u.mp+(u.maxMp-u.mp)*k);burstE(u.x,u.y,'#ff9ae8',fight?10:20)}else if(B.k==='spd')u.spdPT=6;
  fxE('potion',{id:u.id,x:u.x|0,y:u.y|0,c:['#ff5a6a','#5aa8ff','#ff9ae8','#9dffb0'][b]});sndAt('potion',u.x,u.y);if(B.k==='spd')sndAt('speed',u.x,u.y);
  if(isHuman(u)){fxTextFor(u.x,u.y-80,B.ic+' '+B.n,'#ffe9a8',1.2,[u.id]);if(fight)fxTextFor(u.x,u.y-104,'⚔️ โดนโจมตีอยู่ · ยาได้ผลครึ่งเดียว','#ff9a8a',1.5,[u.id])}return true}
function applyItem(u,it){
  switch(it.id){
    case 'potion':heal(u,u.maxHp*.4*potK(u));break;
    case 'mana':u.mp=Math.min(u.maxMp,u.mp+u.maxMp*.5*potK(u));break;
    case 'whet':u.dmgB+=.1;recalc(u);break;
    case 'boots':u.spdB=Math.min(.35,u.spdB+.07);break;
    case 'heart':u.hpB+=.12;recalc(u);break;
    case 'cloak':u.mrB+=.1;recalc(u);break;
    case 'fairy':u.armorB+=3;recalc(u);break;
    case 'tome':gainXp(u,320);break;
  }
}
function burst(x,y,col,n){for(let i=0;i<n&&parts.length<600;i++){const a=Math.random()*Math.PI*2,s=rand(60,320);parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.3,.7),max:.7,col,sz:rand(3,7)})}}

// ===================== INPUT =====================
let joy=null,atkHeld=false,keys={},press=[0,0,0,0,0];const ptrs=new Map();
const hitBtn=(b,x,y,m=1)=>Math.hypot(x-b.x,y-b.y)<b.r*m;
function pressSkill(i,ap){press[i+1]=.15;const me=ME();if(!me||me.dead)return;
  if(me.skl[i]===0){pressLearn(i);return}
  if(net.mode==='client'){if(me.cd[i]<=0)netSend(ap?{t:'k',i,x:Math.round(ap.x),y:Math.round(ap.y)}:{t:'k',i})}else cast(me,i,ap||null)}
function pressPotion(b){UI.potP=b;UI.potT=.18;const me=ME();if(!me||me.dead)return;if(me.bag[b]<=0){AU.play('nomana');return}
  if(net.mode==='client'){if(me.bcd[b]<=0)netSend({t:'u',b})}else usePotion(me,b)}
// ---- skill aiming: how each skill is pointed (dir = line/projectile, cone, area = circle at a spot, unit = an enemy near the spot, self = no aim) ----
const SKA={sword:['dir','self','area'],axe:['self','self','dir'],dagger:['unit','self','self'],bow:['cone','dir','area'],fire:['dir','self','area'],frost:['dir','self','area'],
  gsword:['cone','self','dir'],xbow:['dir','dir','area'],storm:['unit','self','area']};
// fused weapons by archetype: aim kind, circle radius (V = the skill's own r) and line width per skill slot
const SKA_F={MM:{t:['dir','self','area'],r:[0,0,'V'],w:[80,0,0]},MR:{t:['dir','dir','self'],r:[0,0,0],w:[48,50,0]},MS:{t:['dir','self','area'],r:[0,0,'V'],w:[112,0,0]},
  RS:{t:['cone','area','area'],r:[0,220,280],w:[0,0,0]},RR:{t:['dir','area','dir'],r:[0,170,0],w:[40,0,92]},SS:{t:['dir','self','area'],r:[0,0,320],w:[44,0,0]}};
function skAim(u,i){if(!u||!u.wk||!u.skl[i])return null;const li=u.skl[i]-1,s=SK[u.wk][i],V=SKV[u.wk][i],k=u.wk+i;const range=s.range[li]||0;
  if(FUSED[u.wk]){const A=SKA_F[WEAPONS[u.wk].arch],t=A.t[i];let r=A.r[i]==='V'?V.r[li]:A.r[i];if(!r&&t==='self')r=range;return{t,range,r,w:A.w[i]||40,arc:t==='cone'?.32:0}}
  const t=SKA[u.wk][i];
  const r={sword2:V.r&&V.r[li],bow2:260,fire2:V.r&&V.r[li],frost2:330,xbow2:250,storm2:310}[k]||(t==='self'?range:0);
  const w={sword0:70,axe2:V.w,bow1:30,fire0:40,frost0:34,gsword2:124,xbow0:30,xbow1:36}[k]||40;
  return{t,range,r,w,arc:k==='gsword0'?.95:k==='bow0'?.3:0}}
let aimSt=null,arenaHeldSkill=null;
const ARENA_SKILL_HOLD_MS=420;
function arenaCanInspectSkill(me){
  const drop=window.__game?.drop?.st;
  return state==='play'&&me&&!me.dead&&!gameOver&&!CUR.open&&(!drop||drop==='off'||drop==='done');
}
function beginArenaSkillHold(i,e,target,onTap){
  const me=ME();
  if(arenaHeldSkill||aimSt||e.button!==0||!arenaCanInspectSkill(me))return;
  arenaHeldSkill={i,pid:e.pointerId,x:e.clientX,y:e.clientY,since:performance.now(),wk:me.wk,target,onTap,drag:false};
  if(e.isTrusted)target.setPointerCapture(e.pointerId);
}
function moveArenaSkillHold(e){
  const st=arenaHeldSkill;
  if(!st||st.pid!==e.pointerId||st.drag||Math.hypot(e.clientX-st.x,e.clientY-st.y)<8)return;
  st.drag=true;
  const me=ME();
  if(st.i===3||e.pointerType==='mouse'||!arenaCanInspectSkill(me)||me.wk!==st.wk||me.cd[st.i]>0)return;
  const a=skAim(me,st.i);
  if(a&&a.t!=='self'&&startAim(st.i,st.pid,e.clientX,e.clientY))aimSt.moved=true;
}
function endArenaSkillHold(e){
  const st=arenaHeldSkill;
  if(!st||st.pid!==e.pointerId)return;
  arenaHeldSkill=null;
  const me=ME();
  const tap=e.type==='pointerup'&&arenaCanInspectSkill(me)&&me.wk===st.wk;
  if(aimSt?.pid===st.pid){
    if(!tap){aimSt=null;return}
    aimSt.x=e.clientX;aimSt.y=e.clientY;finishAim();
  }else if(tap&&!st.drag&&Math.hypot(e.clientX-st.x,e.clientY-st.y)<8&&performance.now()-st.since<ARENA_SKILL_HOLD_MS)st.onTap();
}
addEventListener('blur',()=>{if(arenaHeldSkill){arenaHeldSkill=null;aimSt=null}});
function startAim(i,pid,x,y){const me=ME();const a=skAim(me,i);
  if(!a||a.t==='self'||me.cd[i]>0||me.dead){pressSkill(i);return false}
  aimSt={i,pid,ox:UI.sk[i].x,oy:UI.sk[i].y,x,y,moved:false};press[i+1]=.15;return true}
function aimPoint(st){const me=ME();if(!me||!st)return null;const a=skAim(me,st.i);if(!a)return null;const B=UI.sk[st.i];
  let dx=st.x-st.ox,dy=(st.y-st.oy)*(view3D&&has3D()&&R3.ok?1.18:1);const l=Math.hypot(dx,dy);if(l<1)return null;dx/=l;dy/=l;
  const f=clamp(Math.hypot(st.x-st.ox,st.y-st.oy)/(B.r*2.6),0,1);const d=a.t==='dir'||a.t==='cone'?a.range:Math.max(60,a.range*f);return{x:me.x+dx*d,y:me.y+dy*d,a}}
function finishAim(){const st=aimSt;aimSt=null;if(!st)return;const C=UI.cancel;
  if(C&&Math.hypot(st.x-C.x,st.y-C.y)<C.r*1.25){AU.play('click');return}
  if(!st.moved){pressSkill(st.i);return}const p=aimPoint(st);pressSkill(st.i,p?{x:p.x,y:p.y}:null)}
// screen -> world (for the mouse on PC)
function screenToWorld(x,y){if(view3D&&has3D()&&R3.ok&&R3.toGround)return R3.toGround(x,y);return{x:x/Z+cam.x,y:y/Z+cam.y}}
function pressLearn(i){const me=ME();if(!me||!canLearn(me,i))return;if(net.mode==='client'){netSend({t:'l',i});me.pts--;me.skl[i]++;AU.play('learn')}else learn(me,i)}
function soundToggle(){AU.toggle();feedList.unshift({txt:['🔊 ','🔉 ','🔇 '][AU.mode]+AU.modeName(),t:2.5,hl:1});if(feedList.length>5)feedList.pop()}
function pressSwapW(){const me=ME();if(!me||me.dead||!me.wk2||me.fuseT>0)return;UI.wswT=.2;
  if(net.mode==='client'){netSend({t:'sw'});const k=me.wk,t=me.wt;me.wk=me.wk2;me.wt=me.wt2;me.wk2=k;me.wt2=t;AU.play('weapon',.7)}else swapWeapons(me)}
function pressSwap(){press[4]=.2;const me=ME();const bx=boxNear(me);if(bx){if(net.mode==='client')netSend({t:'ob',id:bx.id});else openBox(me,bx.id);return}const it=swapCandidate(me);if(!it)return;if(net.mode==='client')netSend({t:'pk',id:it.id});else pickSwap(me,it.id)}
cv.addEventListener('pointerdown',e=>{
  e.preventDefault();AU.init();if(state!=='play')return;const x=e.clientX,y=e.clientY;
  if(Math.hypot(x-UI.mute.x,y-UI.mute.y)<22){soundToggle();return}
  const me=ME();
  if(me&&!me.dead){
    if(UI.bagOpen&&UI.bagRows)for(const r of UI.bagRows)if(x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h){pressPotion(r.b);ptrs.set(e.pointerId,'sk');return}
    if(UI.bagBtn&&hitBtn(UI.bagBtn,x,y,1.25)){UI.bagOpen=!UI.bagOpen;AU.play('click');ptrs.set(e.pointerId,'sk');return}
    for(let b=0;b<2;b++)if(UI.pot&&UI.pot[b]&&hitBtn(UI.pot[b],x,y,1.25)){pressPotion(b);ptrs.set(e.pointerId,'sk');return}
    if(UI.swap&&x>UI.swap.x&&x<UI.swap.x+UI.swap.w&&y>UI.swap.y&&y<UI.swap.y+UI.swap.h){pressSwap();ptrs.set(e.pointerId,'sk');return}
    if(me.wk2&&(UI.wsw&&hitBtn(UI.wsw,x,y,1.1)||UI.wsw2&&hitBtn(UI.wsw2,x,y,1.5))){pressSwapW();ptrs.set(e.pointerId,'sk');return}
    for(let i=0;i<3;i++)if(canLearn(me,i)&&hitBtn(UI.learn[i],x,y,1.35)){pressLearn(i);ptrs.set(e.pointerId,'sk');return}
    for(let i=0;i<3;i++)if(hitBtn(UI.sk[i],x,y,1.15)){if(ARX){beginArenaSkillHold(i,e,cv,()=>pressSkill(i));return}if(e.pointerType==='mouse'){pressSkill(i);ptrs.set(e.pointerId,'sk');return}
      if(!aimSt&&startAim(i,e.pointerId,x,y))ptrs.set(e.pointerId,'aim');else ptrs.set(e.pointerId,'sk');return}
    if(hitBtn(UI.atk,x,y,1.2)){atkHeld=true;press[0]=.15;ptrs.set(e.pointerId,'atk');return}
    if(x<W*.55&&!joy){joy={id:e.pointerId,ox:x,oy:y,x,y};ptrs.set(e.pointerId,'joy')}
  }else if(spectate!==null&&!gameOver)cycleSpectate();
},{passive:false});
cv.addEventListener('pointermove',e=>{if(ARX)moveArenaSkillHold(e);if(joy&&e.pointerId===joy.id){joy.x=e.clientX;joy.y=e.clientY}
  if(aimSt&&e.pointerId===aimSt.pid){aimSt.x=e.clientX;aimSt.y=e.clientY;if(Math.hypot(aimSt.x-aimSt.ox,aimSt.y-aimSt.oy)>UI.sk[aimSt.i].r*.55)aimSt.moved=true}
  if(e.pointerType==='mouse')UI.mouse={x:e.clientX,y:e.clientY}});
function ptrEnd(e){const k=ptrs.get(e.pointerId);ptrs.delete(e.pointerId);if(k==='atk'&&![...ptrs.values()].includes('atk'))atkHeld=false;if(joy&&e.pointerId===joy.id)joy=null;
  if(k==='aim'&&aimSt&&aimSt.pid===e.pointerId){if(e.type==='pointercancel')aimSt=null;else finishAim()}}
cv.addEventListener('pointerup',ptrEnd);cv.addEventListener('pointercancel',ptrEnd);
if(ARX)for(const ev of ['pointerup','pointercancel','lostpointercapture'])cv.addEventListener(ev,endArenaSkillHold);
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;keys[e.code]=true;if(state!=='play')return;AU.init();
  const map={Digit1:0,KeyQ:0,Digit2:1,KeyE:1,Digit3:2,KeyR:2};if(e.code in map){if(e.shiftKey)pressLearn(map[e.code]);else{const me=ME(),i=map[e.code];   // PC: skills fly toward the mouse
      const a=skAim(me,i);pressSkill(i,a&&a.t!=='self'&&UI.mouse?screenToWorld(UI.mouse.x,UI.mouse.y):null)}}
  const pm={Digit4:0,Digit5:1,Digit6:2,Digit7:3};if(e.code in pm)pressPotion(pm[e.code]);if(e.code==='KeyB')UI.bagOpen=!UI.bagOpen;
  const lm={KeyZ:0,KeyX:1,KeyC:2};if(e.code in lm)pressLearn(lm[e.code]);if(e.code==='KeyM')soundToggle();if(e.code==='KeyF'||e.code==='KeyG')pressSwap();if(e.code==='KeyT')pressSwapW()});
addEventListener('keyup',e=>{keys[e.code]=false});
function localInput(){let mx=0,my=0;
  if(joy){const dx=joy.x-joy.ox,dy=joy.y-joy.oy,d=Math.hypot(dx,dy),R=UI.b*1.1;if(d>R){joy.ox=joy.x-dx/d*R;joy.oy=joy.y-dy/d*R}if(d>6){const k=Math.min(1,d/R);mx=dx/d*k;my=dy/d*k}}
  if(keys.KeyW||keys.ArrowUp)my-=1;if(keys.KeyS||keys.ArrowDown)my+=1;if(keys.KeyA||keys.ArrowLeft)mx-=1;if(keys.KeyD||keys.ArrowRight)mx+=1;
  const l=Math.hypot(mx,my);if(l>1){mx/=l;my/=l}if(CURSED)return CUR.input(mx,my);return{mx,my,atk:atkHeld||!!keys.Space||!!keys.KeyJ}}
function cycleSpectate(){const al=units.filter(u=>u.hero&&!u.dead);if(!al.length)return;const i=al.findIndex(u=>u.id===spectate);spectate=al[(i+1)%al.length].id;if(net.mode==='client')netSend({t:'spec',id:spectate})}

// ===================== AI (host) =====================
const dirTo=(u,p)=>{const dx=p.x-u.x,dy=p.y-u.y,d=Math.hypot(dx,dy)||1;return{x:dx/d,y:dy/d}};
function navDir(u,x,y){const ai=u.ai;
  const hu=houseAt(u),ht=houseAt({x,y});
  if(hu&&ht!==hu)return dirTo(u,Math.hypot(u.x-hu.door.x,u.y-hu.door.y)<62?hu.out:hu.inn);
  if(hu&&ht===hu)return dirTo(u,{x,y});
  if(ht){if(Math.hypot(u.x-ht.out.x,u.y-ht.out.y)<48||Math.hypot(u.x-ht.door.x,u.y-ht.door.y)<70)return dirTo(u,ht.inn);x=ht.out.x;y=ht.out.y}
  const d=Math.hypot(x-u.x,y-u.y);if(d<70||!NAV)return dirTo(u,{x,y});
  if(d<650&&losClear(u.x,u.y,x,y))return dirTo(u,{x,y});
  if(!ai.path||gameT>ai.pathT||Math.hypot(ai.pgx-x,ai.pgy-y)>200){const P0=findPath(u.x,u.y,x,y);if(P0===undefined)return dirTo(u,{x,y});ai.path=P0;ai.pi=0;ai.pathT=gameT+2.5+Math.random();ai.pgx=x;ai.pgy=y}
  const P=ai.path;if(!P||!P.length)return dirTo(u,{x,y});
  while(ai.pi<P.length-1&&Math.hypot(P[ai.pi].x-u.x,P[ai.pi].y-u.y)<60)ai.pi++;
  return dirTo(u,P[ai.pi])}
const power=u=>u.lvl+(u.wk?(u.wt+1)*.9:-3)+(u.at+1)*.6+3*(u.hp/u.maxHp)+(u.aegis?3:0);
function bestCreep(u,range){let best=null,bs=1e9;const hpR=u.hp/u.maxHp;if(hpR<.5||!u.wk)return null;
  const ranged=!u.melee;for(const o of units){if(!o.mob||o.dead)continue;const req=(CREEP_REQ[o.kind]||1)+(ranged&&o.kind!=='goblin'?2:0)-(u.at>=2?1:0);if(u.lvl<req)continue;
    if(o.boss&&(hpR<.85||u.lvl<13||u.wt<1))continue;if((o.kind==='golem'||o.kind==='guardian')&&hpR<.7)continue;
    const d=dist(u,o);if(d>range)continue;if(Math.hypot(o.x-zone.x,o.y-zone.y)>zone.r-50)continue;if(d<bs){bs=d;best=o}}
  return best}
function nearestShrine(u,range){let best=null,bd=range;for(const s of WD.shrines){const d=dist(u,s);if(d<bd&&Math.hypot(s.x-zone.x,s.y-zone.y)<zone.r-100){bd=d;best=s}}return best}
function aiSkills(u,t,d,hpR){const k=u.wk;if(!k)return;
  const can=i=>u.skl[i]>0&&u.cd[i]<=0&&u.mp>=SK[k][i].mp[u.skl[i]-1];const rg=i=>SK[k][i].range[u.skl[i]-1];
  const big=t.hero||t.golem||t.boss;const thr=t.hp/t.maxHp;
  if(FUSED[k]){const a=WEAPONS[k].arch;
    if(can(2)&&(big||Math.random()<.08)&&!(t.hero&&thr<.12)){
      if(a==='MM'&&d>120&&d<rg(2)*.9||a==='MR'&&d<rg(2)*.7||a==='MS'&&d>100&&d<rg(2)*.9||a==='RS'&&d<rg(2)*.9||a==='RR'&&d<rg(2)*.75||a==='SS'&&d<rg(2)*.9)return cast(u,2)}
    if(can(0)){if(a==='MM'&&d>110&&d<rg(0)*.9||a==='MR'&&d<rg(0)*.85||a==='MS'&&d<rg(0)*.8||a==='RS'&&d<rg(0)*.9||a==='RR'&&d<rg(0)*.85||a==='SS'&&d<rg(0)*.9)return cast(u,0)}
    if(can(1)){if(a==='MM'&&d<240&&(t.hero||hpR<.75||big)||a==='MR'&&d>200&&d<rg(1)+120||a==='MS'&&d<220||a==='RS'&&d<rg(1)*.9||a==='RR'&&d<rg(1)*.85||a==='SS'&&d<rg(1)*.95)return cast(u,1)}
    return}
  if(can(2)&&(big||Math.random()<.08)&&!(t.hero&&thr<.12)){
    if(k==='sword'&&d>140&&d<rg(2)*.9)return cast(u,2);if(k==='axe'&&d<520)return cast(u,2);if(k==='dagger'&&d<240)return cast(u,2);
    if(k==='bow'&&d<620)return cast(u,2);if(k==='fire'&&d<680)return cast(u,2);if(k==='frost'&&d<600)return cast(u,2);
    if(k==='gsword'&&d<rg(2)*.8)return cast(u,2);if(k==='xbow'&&d<640)return cast(u,2);if(k==='storm'&&d<620)return cast(u,2)}
  if(can(0)){if(k==='sword'&&d>130&&d<rg(0)*.95)return cast(u,0);if(k==='axe'&&d<170)return cast(u,0);if(k==='dagger'&&d>140&&d<rg(0))return cast(u,0);
    if(k==='bow'&&d<520)return cast(u,0);if(k==='fire'&&d<640)return cast(u,0);if(k==='frost'&&d<660)return cast(u,0);
    if(k==='gsword'&&d<rg(0)*.9)return cast(u,0);if(k==='xbow'&&d<600)return cast(u,0);if(k==='storm'&&d<rg(0))return cast(u,0)}
  if(can(1)){if(k==='sword'&&d<220&&(t.hero||hpR<.75||big))return cast(u,1);if(k==='axe'&&d<260)return cast(u,1);if(k==='dagger'&&t.hero&&d>220&&d<700&&hpR>.5)return cast(u,1);
    if(k==='bow'&&((t.melee&&d<190)||(d<230&&hpR<.7)))return cast(u,1);if(k==='fire'&&d<210)return cast(u,1);if(k==='frost'&&d<230)return cast(u,1);
    if(k==='gsword'&&d<200)return cast(u,1);if(k==='xbow'&&d<520)return cast(u,1);if(k==='storm'&&d<220)return cast(u,1)}}
function aiEscape(u,t,d){const k=u.wk;if(!k||!u.skl[1]||u.cd[1]>0)return;
  if(FUSED[k]){const a=WEAPONS[k].arch;if(a==='MM'||a==='RR'||a==='RS'&&d<520||a==='SS'&&d<260)cast(u,1);return}
  if(k==='dagger'||k==='sword'||(k==='bow'&&d<320)||(k==='frost'&&d<220)||(k==='fire'&&d<210))cast(u,1)}
function botThink(u,dt){
  const ai=u.ai;ai.t-=dt;const hpR=u.hp/u.maxHp;
  if(u.pts>0)botLearn(u);
  if(ai.t<=0){
    ai.t=rand(.25,.4);if(ai.agg===undefined)ai.agg=rand(.25,1);if(!ai.pref)ai.pref=WK[Math.floor(Math.random()*WK.length)];
    ai.tgt=null;if(u.wk2&&u.fuseT<=0&&(FUSED[u.wk2]&&!FUSED[u.wk]||u.wt2>u.wt&&!FUSED[u.wk]))swapWeapons(u);
    const sight=Math.min(visionR(),300+90*zone.ph);
    if(gameT>=150&&u.wk){const h=nearestEnemy(u,sight,false);const eager=zone.ph<2?.03:zone.ph<4?.08:zone.ph<6?.18:.3;
      if(h&&(zone.ph>=6||(hpR>.6&&(power(u)>power(h)+2||Math.random()<ai.agg*eager))))ai.tgt=h}
    if(!ai.tgt&&u.lvl<MAXL)ai.tgt=bestCreep(u,750);
    if(ai.threat&&!ai.threat.dead&&dist(u,ai.threat)<800&&(!ai.threat.hero||visibleTo(ai.threat,u)))ai.tgt=ai.threat;
    if(ai.threat&&(ai.threat.dead||dist(u,ai.threat)>1000))ai.threat=null;
    ai.flee=ai.tgt&&((ai.tgt.hero&&(hpR<.3||!u.wk&&ai.tgt.wk)&&ai.tgt.hp/ai.tgt.maxHp>hpR+.1)||(ai.tgt.mob&&hpR<(u.melee?.3:.45)));if(ai.flee&&ai.tgt.mob){ai.threat=null}
    ai.goal=null;
    if((!ai.tgt||ai.flee)&&hpR<.5){const s=nearestShrine(u,2400);if(s)ai.goal={x:s.x,y:s.y}}
    if(!ai.goal&&(!ai.tgt||ai.flee||!u.wk)){let bd=u.wk?1100:3200,best=null;
      for(const it of items){if(it.dead||(it.cave!==undefined&&u.lvl<8)||(ai.bad&&ai.bad.has(it.id)))continue;if(it.np&&it.np.id===u.id&&gameT<it.np.until)continue;
        const val=it.k==='a'?(u.aegis?-1:6):it.k==='c'?(u.wk?1:.3):it.k==='i'?(u.wk?.6:.2):it.k==='p'?(u.bag[it.b|0]<BAG[it.b|0].max?(u.wk?.9:.3):-1):it.k==='r'?(it.tier>u.at?(u.wk?1.5+it.tier-u.at:.4):-1):botWantsWeapon(u,it);if(val<0)continue;
        if(Math.hypot(it.x-zone.tx,it.y-zone.ty)>zone.tr+zone.r*.25)continue;const d=dist(u,it)/val;if(d<bd){bd=d;best=it}}
      if(best){ai.goal={x:best.x,y:best.y,item:best};if(!u.wk&&ai.tgt&&!ai.flee&&ai.tgt.mob)ai.tgt=null}}
    // squads stick together: drift back to the team leader (a human teammate if there is one)
    if(MC.ts>1&&!ai.goal&&(!ai.tgt||ai.flee)){let lead=null;for(const o of units)if(o.hero&&!o.dead&&o!==u&&o.team===u.team&&(!lead||isHuman(o)&&!isHuman(lead)||o.id<lead.id&&isHuman(o)===isHuman(lead)))lead=o;
      if(lead&&dist(u,lead)>520&&(isHuman(lead)||lead.id<u.id))ai.goal={x:lead.x+rand(-120,120),y:lead.y+rand(-120,120)}}
    if(!ai.wx||Math.hypot(ai.wx-u.x,ai.wy-u.y)<100||Math.random()<.04){const a=Math.random()*Math.PI*2,r=Math.random()*Math.max(80,zone.tr*.7);ai.wx=clamp(zone.tx+Math.cos(a)*r,300,WORLD-300);ai.wy=clamp(zone.ty+Math.sin(a)*r,300,WORLD-300);if(!walkable(ai.wx,ai.wy,30)){ai.wx=zone.tx;ai.wy=zone.ty}}
    ai.strafe=Math.random()<.5?1:-1;
  }
  let mx=0,my=0;const add=(v,w)=>{mx+=v.x*w;my+=v.y*w};
  const dz=Math.hypot(u.x-zone.x,u.y-zone.y),dzt=Math.hypot(u.x-zone.tx,u.y-zone.ty);
  const zoneDanger=dz>zone.r-80||(zone.st==='shrink'&&dzt>zone.tr*.9)||(zone.st==='wait'&&zone.t<12&&dzt>zone.tr*.95);
  const outside=dz>zone.r-40;
  const t=ai.tgt&&!ai.tgt.dead&&!(outside&&Math.hypot(ai.tgt.x-zone.x,ai.tgt.y-zone.y)>zone.r)?ai.tgt:null;
  if(zoneDanger){const zx=zone.st==='wait'?zone.tx:zone.x,zy=zone.st==='wait'?zone.ty:zone.y;add(navDir(u,outside?zone.x:zx,outside?zone.y:zy),outside?3:1.4)}
  if(t){
    const d=dist(u,t);
    if(ai.flee){const away=dirTo(u,t);add({x:-away.x,y:-away.y},1.2);if(ai.goal)add(navDir(u,ai.goal.x,ai.goal.y),.6);if(Math.random()<dt*3)aiEscape(u,t,d);if(!u.wk&&d<u.range+t.r)basic(u,t)}
    else{
      const want=u.melee?0:u.range*.75;
      if(d>want+30)add(navDir(u,t.x,t.y),1);else if(!u.melee&&d<want-60){const aw=dirTo(u,t);add({x:-aw.x,y:-aw.y},.8)}
      if(!u.melee){const dx=t.x-u.x,dy=t.y-u.y,l=Math.hypot(dx,dy)||1;mx+=-dy/l*.5*ai.strafe;my+=dx/l*.5*ai.strafe}
      if(d<u.range+t.r+(u.melee?10:0))basic(u,t);
      if(Math.random()<dt*2.4)aiSkills(u,t,d,hpR);
    }
  }else if(ai.goal)add(navDir(u,ai.goal.x,ai.goal.y),1);
  else add(navDir(u,ai.wx,ai.wy),.8);
  let l=Math.hypot(mx,my);if(l>1){mx/=l;my/=l;l=1}
  ai.stuckT+=dt;
  if(ai.stuckT>.5){const moved=Math.hypot(u.x-ai.px,u.y-ai.py);
    if(moved<14&&!(u.stunT>0)&&!(u.rootT>0)&&l>.3){ai.detT=.7;ai.detS=Math.random()<.5?1:-1;ai.stuckN=(ai.stuckN||0)+1;ai.path=null;
      if(ai.stuckN>=3){ai.stuckN=0;if(ai.goal&&ai.goal.item){(ai.bad=ai.bad||new Set()).add(ai.goal.item.id)}ai.goal=null;ai.wx=0;ai.t=0}}
    else if(moved>40)ai.stuckN=0;ai.px=u.x;ai.py=u.y;ai.stuckT=0}
  if(ai.detT>0){ai.detT-=dt;const s=ai.detS;const nx=-my*s,ny=mx*s;mx=nx*.9+mx*.3;my=ny*.9+my*.3}
  return{mx,my};
}
// camp monsters fight smarter once the match is under way (4:00+, owner 2026-11-21): trolls and golems slam the ground (stun),
// wolves pounce on anyone keeping away, goblins throw knives
const MOB_ACT={ogre:{cd:8,rng:190},golem:{cd:9,rng:230},guardian:{cd:9,rng:240},magma:{cd:8,rng:250},wolf:{cd:7,rng:420,min:150},goblin:{cd:4.5,rng:440,min:130}};
function mobAct(u,t,d,dt){const A=MOB_ACT[u.kind];if(!A||u.ecl||u.boss||u.pet||gameT<240||u.stunT>0||u.busyT>0||u.dash)return;
  u.actT=(u.actT===undefined?A.cd*.4:u.actT)-dt;if(u.actT>0||d>A.rng||d<(A.min||0))return;u.actT=A.cd*rand(.85,1.15);
  const nx=(t.x-u.x)/(d||1),ny=(t.y-u.y)/(d||1);u.fx=nx;u.fy=ny;
  if(u.kind==='wolf'){const sp=1100;u.dash={vx:nx*sp,vy:ny*sp,t:Math.min(d-30,380)/sp,dmg:u.atkDmg*1.2,stun:.3,hit:new Set(),stop:true};u.atkAnim=.3;
    fxE('dash',{id:u.id,x:u.x|0,y:u.y|0,a:+Math.atan2(ny,nx).toFixed(2)});sndAt('dash',u.x,u.y)}
  else if(u.kind==='goblin'){proj(u,nx,ny,{spd:950,r:8,dmg:u.atkDmg*.9,type:'p',kind:0,life:(A.rng+60)/950});u.atkAnim=.3;sndAt('shoot',u.x,u.y)}
  else if(u.kind==='magma'){u.busyT=.8;u.castAnim=.85;aoe({x:u.x,y:u.y,r:230,dmg:u.atkDmg*1.45,type:'m',owner:u,delay:.6,kind:'meteor',stun:.5,big:true,el:'fire',elP:1,burn:10+.12*u.atkDmg});sndAt('meteor',u.x,u.y)}
  else{const og=u.kind==='ogre';u.busyT=.75;u.castAnim=.8;aoe({x:u.x,y:u.y,r:og?180:220,dmg:u.atkDmg*(og?1.3:1.5),type:'p',owner:u,delay:.55,kind:'slam',stun:og?.55:.7,big:true});sndAt('slam',u.x,u.y)}}
function mobThink(u,dt){
  let mx=0,my=0;const t=u.aggro,L=u.def.leash||420;const dh=dist(u,u.home);if(!u.boss&&u.busyT>0)u.busyT=Math.max(0,u.busyT-dt);
  if(t&&!t.dead&&dh<L&&dist(t,u.home)<L+120&&(!t.hidden||dist(u,t)<170)){
    const d=dist(u,t),R=u.range+t.r;if(d>R-6){mx=(t.x-u.x)/d;my=(t.y-u.y)/d}mobAct(u,t,d,dt);
    u.fx=(t.x-u.x)/(d||1);u.fy=(t.y-u.y)/(d||1);
    if(d<R+6&&u.atkCd<=0&&u.stunT<=0&&!u.busyT){u.atkCd=u.atkCdBase;u.atkAnim=.3;const ang=Math.atan2(t.y-u.y,t.x-u.x);
      if(u.def.cleave){for(const o of units){if(o.dead||!isEnemy(u,o)||dist(u,o)>R+o.r)continue;let da=Math.abs(Math.atan2(o.y-u.y,o.x-u.x)-ang);if(da>Math.PI)da=Math.PI*2-da;if(da<1)dealDamage(o,u.atkDmg*(isNight()?1.4:1),'p',u)}}
      else{dealDamage(t,u.atkDmg*(isNight()?1.4:1),'p',u);if(u.def.fire&&!t.dead)stAdd(u,t,'fire',1)}
      emit({t:'w',id:u.id,a:+ang.toFixed(2),r:u.range+u.r,c:isNight()?'#ff5a4a':u.def.fire?'#ff8a3a':u.golem?'#9fd0ff':u.boss?'#ff8a5a':'#d8c48a',k:4});if(u.r>30)sndAt('hit',u.x,u.y)}
    if(u.boss&&u.stunT<=0){u.brT=(u.brT===undefined?3:u.brT)-dt;u.slT=(u.slT===undefined?6:u.slT)-dt;u.busyT=Math.max(0,(u.busyT||0)-dt);
      if(u.brT<=0&&d<430){u.brT=8;u.busyT=1.4;const ang=Math.atan2(t.y-u.y,t.x-u.x);aoe({x:u.x+Math.cos(ang)*40,y:u.y+Math.sin(ang)*40,r:440,ang,len:440,arc:.55,shape:'cone',dmg:42*u.scale,type:'m',owner:u,kind:'breath',delay:.35,dot:1.6,tick:.2,burn:0});sndAt('breath',u.x,u.y);u.castAnim=1.6}
      else if(u.slT<=0&&d<260){u.slT=9;u.busyT=.8;aoe({x:u.x,y:u.y,r:270,dmg:180*u.scale,type:'m',owner:u,delay:.7,kind:'slam',stun:1,big:true});sndAt('slam',u.x,u.y);u.castAnim=.9}}
  }else{u.aggro=null;if(dh>20){mx=(u.home.x-u.x)/dh;my=(u.home.y-u.y)/dh}u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.25*dt)}
  if(u.busyT>0){mx*=.2;my*=.2}
  return{mx,my};
}

// ===================== HIDING SPOTS =====================
// bushes + tall grass, bucketed so every hero can test "am I hidden?" cheaply each frame
let HIDE=null;
function buildHide(){const C=400,n=Math.ceil(WORLD/C);const cells=Array.from({length:n*n},()=>[]);
  for(const b of[...WD.bushes,...(WD.tgrass||[])]){for(let j=Math.max(0,Math.floor((b.y-b.r)/C));j<=Math.min(n-1,Math.floor((b.y+b.r)/C));j++)for(let i=Math.max(0,Math.floor((b.x-b.r)/C));i<=Math.min(n-1,Math.floor((b.x+b.r)/C));i++)cells[j*n+i].push(b)}
  HIDE={C,n,cells}}
function hideAt(x,y){if(!HIDE)return null;const i=Math.floor(x/HIDE.C),j=Math.floor(y/HIDE.C);if(!(i>=0&&j>=0&&i<HIDE.n&&j<HIDE.n))return null;
  for(const b of HIDE.cells[j*HIDE.n+i])if(Math.abs(x-b.x)<b.r&&Math.hypot(x-b.x,y-b.y)<b.r-4)return b;return null}

// ===================== NIGHT: the dead rise =====================
let zid=100000,zWave=null,nightN=0;
const zAlive=()=>units.filter(u=>u.zombie&&!u.dead).length;
function inZone(p,m){return Math.hypot(p.x-zone.x,p.y-zone.y)<zone.r-(m||0)}
function zSpot(){const ok=p=>walkable(p.x,p.y,34)&&!inWater(p.x,p.y)&&!houseAt(p)&&!inCastleYard(p)&&inZone(p,120);
  if(WD.graves.length&&Math.random()<.4){const gs=WD.graves.filter(g=>inZone(g,200));if(gs.length){const g=gs[Math.floor(Math.random()*gs.length)];for(let t=0;t<12;t++){const a=Math.random()*6.3,d=rand(20,160);const p={x:g.x+Math.cos(a)*d,y:g.y+Math.sin(a)*d};if(ok(p))return p}}}
  const hs=units.filter(u=>u.hero&&!u.dead);if(!hs.length)return null;const h=hs[Math.floor(Math.random()*hs.length)];
  for(let t=0;t<16;t++){const a=Math.random()*6.3,d=rand(visionR()+120,visionR()+650);const p={x:h.x+Math.cos(a)*d,y:h.y+Math.sin(a)*d};if(ok(p)&&!units.some(o=>o.hero&&!o.dead&&dist(o,p)<visionR()))return p}return null}
function spawnZombie(kind,p){const sc=1+Math.min(2.6,gameT/420);const u=mkZombie(zid++,kind,p.x,p.y,sc);u.atkDmg*=(1+.8*(sc-1))/sc;addUnit(u);fxE('rise',{x:p.x|0,y:p.y|0,big:CREEPS[kind].big?1:0});sndAt('rise',p.x,p.y);return u}
function nightTick(dt){
  if(zWave){zWave.t-=dt;if(zWave.t<=0&&zWave.left>0&&isNight()){zWave.t=rand(.28,.65);
      const cap=Math.min(100,6+Math.round(alive*2.7));if(zAlive()<cap){const p=zSpot();if(p){const r=Math.random(),late=nightN>=2;
        const kind=zWave.lord>0&&WD.graves.length?(zWave.lord--,'zlord'):r<(late?.26:.14)?'zbrute':r<.5?'zrunner':'zombie';spawnZombie(kind,p);zWave.left--}}}
    if(!isNight())zWave=null}
  // corpses of the dead stay a moment, then go
  if(units.some(u=>u.zombie&&u.dead&&gameT-(u.deadAt||0)>4)){units=units.filter(u=>!(u.zombie&&u.dead&&gameT-(u.deadAt||0)>4));UMAP=new Map(units.map(u=>[u.id,u]))}}
function nightStart(){nightN++;zWave={t:2,left:Math.min(150,10+Math.round(alive*(2.8+.6*nightN))),lord:nightN>=2?Math.min(3,nightN-1):0};
  emit({t:'a',s:'🌙 ค่ำแล้ว! ซอมบี้ออกล่า · มอนสเตอร์ดุร้ายขึ้น · ซ่อนในพุ่มหญ้าได้',d:4});emit({t:'f',s:'🧟 ซอมบี้ลุกขึ้นจากหลุม! ฆ่าแล้วสุ่มได้ไอเทม (SSR 1%)'})}
function dawn(){for(const u of units)if(u.zombie&&!u.dead){u.dead=true;u.deadAt=gameT;fxE('dust',{id:u.id,x:u.x|0,y:u.y|0});fxE('die',{id:u.id,x:u.x|0,y:u.y|0})}
  emit({t:'f',s:'☀️ รุ่งเช้า ซอมบี้สลายเป็นผุยผง'})}
// what a slain zombie drops: potions mostly, sometimes gear, SSR at 1%
function zombieLoot(t,src){const x=t.x,y=t.y,r=Math.random(),H=isHuman(src)?[src.id]:[];
  const wpn=tier=>dropItem({k:'w',x:x+rand(-20,20),y:y+rand(-20,20),wk:WK[Math.floor(Math.random()*WK.length)],tier});
  if(r<.01){wpn(4);emit({t:'a',s:'🌈 SSR!! อาวุธระดับเทพหล่นจากซอมบี้',d:3,v:H});emit({t:'f',s:`🌈 ${src.name} ได้อาวุธ SSR จากซอมบี้!`});fxE('ssr',{x:x|0,y:y|0})}
  else if(r<.09){if(Math.random()<.6)wpn(pickTier([0,0,70,30]));else dropItem({k:'r',x,y,tier:pickTier([0,0,55,40,5])})}   // 2026-11-23: .06 -> .09
  else if(r<.31)dropItem({k:'p',x,y,b:0});else if(r<.45)dropItem({k:'p',x,y,b:1});else if(r<.50)dropItem({k:'p',x,y,b:2});else if(r<.55)dropItem({k:'p',x,y,b:3});
  else if(r<.62){const pool=ITEMS.filter(i=>i.id!=='potion'&&i.id!=='mana');dropItem({k:'i',x,y,it:pickW(pool).id})}
  if(t.lord){wpn(pickTier([0,0,55,45]));dropItem({k:'p',x:x+30,y,b:2});dropItem({k:'p',x:x-30,y,b:0});emit({t:'f',s:`👑 ${src.name} ปราบราชาซอมบี้!`})}}
// a zombie's bite rots: 1% of max HP a second (+ a little more each night) for 4 s, refreshed by every bite, healing halved meanwhile
function rotBite(z,t){if(!t.hero)return;t.rotT=4;t.rotDps=t.maxHp*.01+4+2*nightN;t.rotSrc=z}
// the Zombie King calls three more of the dead out of the ground around it
function raiseDead(u){const cap=Math.min(110,10+Math.round(alive*3));if(zAlive()>=cap)return;u.castAnim=1;sndAt('rise',u.x,u.y);emit({t:'k',a:4,x:u.x|0,y:u.y|0});
  for(let i=0;i<3;i++){const a=Math.random()*6.28,d=rand(70,160),p={x:u.x+Math.cos(a)*d,y:u.y+Math.sin(a)*d};if(!walkable(p.x,p.y,30)||inWater(p.x,p.y)||houseAt(p))continue;
    const z=spawnZombie(Math.random()<.3?'zrunner':'zombie',p);z.aggro=u.aggro}}
function zombieThink(u,dt){
  if(u.rise>0){u.rise-=dt;return{mx:0,my:0}}
  u.zt=(u.zt||0)-dt;
  if(u.zt<=0){u.zt=rand(.35,.65);let best=null,bd=2000;   // they smell the living; tall grass hides you unless they are close
    for(const h of HEROES){if(h.dead||h.reviveT>0)continue;const d=dist(u,h);if(d>=bd||h.hidden&&d>230)continue;bd=d;best=h}
    if(u.aggro&&!u.aggro.dead&&u.aggro.hero&&dist(u,u.aggro)<bd+150&&!(u.aggro.hidden&&dist(u,u.aggro)>230))best=u.aggro;
    u.aggro=best;if(!best&&(!u.wx||Math.hypot(u.wx-u.x,u.wy-u.y)<90)){const a=Math.random()*6.3,r=rand(150,500);u.wx=u.x+Math.cos(a)*r;u.wy=u.y+Math.sin(a)*r;if(!walkable(u.wx,u.wy,30)){u.wx=zone.x;u.wy=zone.y}}}
  const t=u.aggro;let mx=0,my=0;
  if(t&&!t.dead){const d=dist(u,t),R=u.range+t.r;u.fx=(t.x-u.x)/(d||1);u.fy=(t.y-u.y)/(d||1);
    if(d>R-6){const v=navDir(u,t.x,t.y);mx=v.x;my=v.y}
    if(d<R+6&&u.atkCd<=0&&u.stunT<=0){u.atkCd=u.atkCdBase;u.atkAnim=.3;const ang=Math.atan2(t.y-u.y,t.x-u.x);
      dealDamage(t,u.atkDmg,'p',u);if(!t.dead){if(!t.hidden){t.slowT=Math.max(t.slowT,.8);t.slowAmt=Math.max(t.slowT>.8?t.slowAmt:0,.25)}rotBite(u,t)}
      emit({t:'w',id:u.id,a:+ang.toFixed(2),r:u.range+u.r,c:'#9dff7a',k:4});if(u.big)sndAt('hit',u.x,u.y)}
    if(u.lord&&u.stunT<=0){u.slT=(u.slT===undefined?5:u.slT)-dt;if(u.slT<=0&&d<300){u.slT=7;aoe({x:u.x,y:u.y,r:260,dmg:130*u.scale,type:'m',owner:u,delay:.6,kind:'slam',stun:.8,big:true,slow:2,slowAmt:.4});sndAt('slam',u.x,u.y);u.castAnim=.8}
      u.rsT=(u.rsT===undefined?4:u.rsT)-dt;if(u.rsT<=0&&d<900){u.rsT=10;raiseDead(u)}}
    if(u.stunT<=0&&!u.dash&&(u.kind==='zrunner'||u.kind==='zbrute')){u.zsT=(u.zsT===undefined?rand(1,3):u.zsT)-dt;
      if(u.zsT<=0){if(u.kind==='zrunner'&&d>130&&d<380){u.zsT=rand(4.5,6);const sp=1050,nx=(t.x-u.x)/(d||1),ny=(t.y-u.y)/(d||1);u.dash={vx:nx*sp,vy:ny*sp,t:Math.min(d-25,360)/sp,dmg:u.atkDmg*1.1,stun:.2,hit:new Set(),stop:true};u.atkAnim=.3;fxE('dash',{id:u.id,x:u.x|0,y:u.y|0,a:+Math.atan2(ny,nx).toFixed(2)})}
        else if(u.kind==='zbrute'&&d<200){u.zsT=rand(6,8);u.castAnim=.8;aoe({x:u.x,y:u.y,r:200,dmg:u.atkDmg*1.3,type:'p',owner:u,delay:.55,kind:'slam',stun:.6,big:true});sndAt('slam',u.x,u.y)}}}}
  else if(u.wx){const v=dirTo(u,{x:u.wx,y:u.wy});mx=v.x*.45;my=v.y*.45}
  return{mx,my}}
// camp monsters at night: harder hits and they charge anyone who walks too close to their camp
function nightAggro(u){if(u.aggro||u.zombie||!isNight()||(u.id+frameN)%6)return;const L=u.def.leash||420;
  for(const h of HEROES){if(!h.hero||h.dead||h.hidden)continue;if(Math.abs(h.x-u.x)>320||Math.abs(h.y-u.y)>320)continue;if(dist(h,u)<300&&dist(h,u.home)<L){u.aggro=h;break}}}
// bots drink potions too
function botPotions(u){const hr=u.hp/u.maxHp;if(hr<.22&&u.bag[2]>0&&usePotion(u,2))return;if(hr<.42&&u.hotT<=0&&u.bag[0]>0&&usePotion(u,0))return;
  if(u.mp<u.maxMp*.25&&u.motT<=0&&u.bag[1]>0&&usePotion(u,1))return;if(u.ai.flee&&u.bag[3]>0&&u.spdPT<=0)usePotion(u,3)}

// ===================== HOST UPDATE =====================
function collideUnit(u){
  forObstacles(u.x,u.y,u.r+4,o=>{
    if(o.c===1){const dx=u.x-o.x,dy=u.y-o.y,mn=o.r+u.r;if(Math.abs(dx)>mn||Math.abs(dy)>mn)return;const d=Math.hypot(dx,dy);if(d<mn&&d>0){u.x=o.x+dx/d*mn;u.y=o.y+dy/d*mn;if(u.dash)u.dash.t=Math.min(u.dash.t,.02)}}
    else{const nx=clamp(u.x,o.x,o.x+o.w),ny=clamp(u.y,o.y,o.y+o.h);let dx=u.x-nx,dy=u.y-ny,d=Math.hypot(dx,dy);
      if(d<u.r){if(d===0){dx=u.x-(o.x+o.w/2);dy=u.y-(o.y+o.h/2);d=Math.hypot(dx,dy)||1}u.x=nx+dx/d*u.r;u.y=ny+dy/d*u.r;if(u.dash)u.dash.t=Math.min(u.dash.t,.02)}}});
  for(let k=0;k<2;k++){const s=sdfAt(u.x,u.y);if(s>=u.r)break;const e=12;let gx=sdfAt(u.x+e,u.y)-sdfAt(u.x-e,u.y),gy=sdfAt(u.x,u.y+e)-sdfAt(u.x,u.y-e);const gl=Math.hypot(gx,gy);
    if(gl<1e-4){const dx=CX-u.x,dy=CY-u.y,l=Math.hypot(dx,dy)||1;gx=dx/l;gy=dy/l}else{gx/=gl;gy/=gl}u.x+=gx*(u.r-s+.5);u.y+=gy*(u.r-s+.5);if(u.dash)u.dash.t=Math.min(u.dash.t,.02);if(u.kb)u.kb.t=0}
  u.x=clamp(u.x,u.r,WORLD-u.r);u.y=clamp(u.y,u.r,WORLD-u.r);
}
function zoneTick(dt){const P=PHASES[Math.min(zone.ph,PHASES.length-1)];if(zone.st==='done')return;zone.t-=dt;
  if(zone.st==='wait'&&zone.t<=0){zone.st='shrink';zone.t=P.s*zTime();zone.sx=zone.x;zone.sy=zone.y;zone.sr=zone.r;emit({t:'a',s:'⚠️ วงกำลังหด!',d:2.5});emit({t:'s',n:'zone',x:0,y:0,g:1})}
  else if(zone.st==='shrink'){const k=clamp(1-zone.t/(P.s*zTime()),0,1);zone.x=lerp(zone.sx,zone.tx,k);zone.y=lerp(zone.sy,zone.ty,k);zone.r=lerp(zone.sr,zone.tr,k);
    if(zone.t<=0){zone.ph++;if(zone.ph<PHASES.length){zone.st='wait';zone.t=PHASES[zone.ph].w*zTime();nextTarget()}else zone.st='done'}}}
let warnN=false;
function dayTick(){const n=isNight();const cyc=gameT%(DAY+NIGHT);if(!n&&cyc>DAY-15&&!warnN&&gameT>20){warnN=true;emit({t:'a',s:'🌙 อีก 15 วินาทีจะค่ำ — ซอมบี้กำลังจะลุกขึ้น! หาที่ซ่อนหรือเตรียมสู้',d:3.5})}if(n)warnN=false;if(n!==lastNight){lastNight=n;if(gameT>5){if(n)nightStart();else{emit({t:'a',s:'☀️ เช้าแล้ว',d:3});dawn()}emit({t:'s',n:n?'night':'day',x:0,y:0,g:1})}}}
// Monsters grow with the match (owner 2026-11-21: tougher monsters, but not in the first minutes): x1 until 3:00, x2 at 8:00, x3.2 at 14:00,
// x4 by 24:00. Living camps catch up every 6 s while nobody fights them (their health keeps its share); a camp that respawns comes back a
// step ahead. Their bite grows slower than their health (x1 + 80% of the rise). The castle boss and the Overlord stop at x2.5.
function mobPow(t){return 1+2.2*clamp((t-180)/660,0,1)+.8*clamp((t-840)/600,0,1)}
const mobCap=m=>m.boss||m.ecl==='overlord'?2.5:9;
function mobScale(m,k){const f=m.dead?1:m.hp/Math.max(1,m.maxHp);setMobStats(m,k);m.atkDmg*=(1+.8*(k-1))/k;m.hp=Math.max(1,m.maxHp*f)}
let mobGrowT=0;
function campTick(){const P=mobPow(gameT),grow=(mobGrowT-=1)<=0&&P>1;if(grow)mobGrowT=6;
  for(const c of WD.camps){
    if(c.deadAt<0){if(grow)for(const id of c.mem){const m=UMAP.get(id);if(!m||m.dead||m.aggro||m.pet)continue;const k=Math.min(mobCap(m),P*(c.sc||1));if(k>(m.scale||1)*1.03)mobScale(m,k)}continue}
    if(c.respawns>=c.maxRespawn)continue;const wait=c.tier==='boss'?240:75;
  if(gameT-c.deadAt>wait&&!units.some(u=>u.hero&&!u.dead&&dist(u,c)<750)){const sc=Math.max(1.15,P*1.1);
    for(const id of c.mem){const m=UMAP.get(id);if(!m)continue;mobScale(m,Math.min(mobCap(m),sc*(c.sc||1)));m.dead=false;m.x=m.home.x;m.y=m.home.y;m.aggro=null;m.stunT=0;m.rootT=0;m.slowT=0;m.burnT=0;m.kb=null}
    c.deadAt=-1;c.respawns++;if(c.tier==='boss')emit({t:'f',s:'🐉 มังกรเพลิงกลับมาเฝ้าปราสาท!'})}}}
let avgLvl=1,frameN=0,HEROES=[];
// bolts hit the body, not the whole collision circle (owner 2026-11-23: hitboxes felt too generous)
const HBX=.85;
function hitArea(a,u){if(a.shape==='line'){const ex=a.x+Math.cos(a.ang)*a.len,ey=a.y+Math.sin(a.ang)*a.len;return segDist(u,[a.x,a.y,ex,ey])<a.w/2+u.r*.5}
  if(a.shape==='cone'){const d=dist(a,u);if(d>a.len+u.r*.5)return false;let da=Math.abs(Math.atan2(u.y-a.y,u.x-a.x)-a.ang);if(da>Math.PI)da=Math.PI*2-da;return da<a.arc||d<u.r+30}
  return dist(a,u)<a.r+u.r*.6}
function hostUpdate(dt){
  gameT+=dt;frameN++;if(CURSED)curTick(dt);PATHB=6;HEROES=units.filter(u=>u.hero&&!u.dead);{let n=0,t=0;for(const u of HEROES){n++;t+=u.lvl}avgLvl=n?t/n:1}sndBudget={};zoneTick(dt);dayTick();fuseTick();nightTick(dt);campT-=dt;if(campT<=0){campT=1;campTick()}
  const zph=zone.ph;
  for(const u of units){
    if(u.dead){if(u.reviveT>0){u.reviveT-=dt;if(u.reviveT<=0)reviveUnit(u)}continue}
    u.atkCd-=dt;u.atkSlowT-=dt;u.stunT-=dt;u.slowT-=dt;u.buffT-=dt;u.hurtT-=dt;u.revealT-=dt;u.rootT-=dt;u.atkAnim-=dt;u.castAnim-=dt;for(let i=0;i<3;i++)u.cd[i]-=dt;
    if(u.shieldT>0){u.shieldT-=dt;if(u.shieldT<=0)u.shieldHp=0}if(u.asT>0)u.asT-=dt;if(u.furyT>0){u.furyT-=dt;if(u.furyT<=0)u.fury=0}if(u.invisT>0)u.invisT-=dt;
    if(u.hero){for(let i=0;i<4;i++)if(u.bcd[i]>0)u.bcd[i]-=dt;if(u.hotT>0||u.motT>0){const pk=potK(u);if(u.hotT>0){u.hotT-=dt;heal(u,u.hotV*dt*(u.hotP?1:pk))}if(u.motT>0){u.motT-=dt;u.mp=Math.min(u.maxMp,u.mp+u.motV*dt*pk)}}if(u.spdPT>0)u.spdPT-=dt}
    if(u.burnT>0){u.burnT-=dt;u._bn=(u._bn||0)+dealDamage(u,u.burnDps*dt,'m',u.burnSrc&&!u.burnSrc.dead?u.burnSrc:null,true);if(u.dead)continue}
    if(u.ignT>0){u.ignT-=dt;u._bn=(u._bn||0)+dealDamage(u,ST_HP(u)*.005*(u.ign||0)*dt,'m',u.ignSrc&&!u.ignSrc.dead?u.ignSrc:null,true);if(u.ignT<=0)u.ign=0;if(u.dead)continue}
    if(u.rotT>0){u.rotT-=dt;u._rn=(u._rn||0)+dealDamage(u,(u.rotDps||0)*dt,'pure',u.rotSrc&&!u.rotSrc.dead?u.rotSrc:null,true);if(u.dead)continue;
      if(u._rn>=1&&(u._rnT=(u._rnT||0)-dt)<=0){u._rnT=.6;if(isHuman(u))fxTextFor(u.x+rand(-14,14),u.y-u.r-20,fmtN(u._rn),'#9dff6a',.7,[u.id],0,u.id,-1);u._rn=0}}
    if(u.chillT>0){u.chillT-=dt;if(u.chillT<=0)u.chill=0}if(u.statT>0){u.statT-=dt;if(u.statT<=0)u.stat=0}if(u.frzImm>0)u.frzImm-=dt;
    if(u._bn>0){u._bnT=(u._bnT||0)-dt;if(u._bnT<=0){u._bnT=.6;const s=u.ignT>0&&u.ignSrc?u.ignSrc:u.burnSrc,v=[];if(isHuman(u))v.push(u.id);if(s&&!s.dead&&isHuman(s))v.push(s.id);   // burn damage, shown every .6 s
      if(v.length&&u._bn>=1)fxTextFor(u.x+rand(-14,14),u.y-u.r-20,fmtN(u._bn),'#ff9a3a',.7,v,0,u.id,s?s.id:-1);u._bn=0}}
    if(u.hero){
      {const zp=zoneXY(u);if(Math.hypot(zp.x-zone.x,zp.y-zone.y)>zone.r)dealDamage(u,u.maxHp*(.03+.02*zph)*dt,'pure',null,true)}
      dgPort(u,dt);
      if(u.dead)continue;
      let hr=u.hpRegen;const ooc=gameT-u.lastDmgT;if(ooc>6)hr+=u.maxHp*.01;if(u.rotT>0)hr*=.5;
      u.hp=Math.min(u.maxHp,u.hp+hr*dt);u.mp=Math.min(u.maxMp,u.mp+u.mpRegen*dt);
      for(const s of WD.shrines)if(Math.abs(u.x-s.x)<s.r&&dist(u,s)<s.r&&ooc>3){u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.06*dt);u.mp=Math.min(u.maxMp,u.mp+u.maxMp*.06*dt);if(Math.random()<dt*5)burstE(u.x,u.y,'#8cffb0',3)}
      gainXp(u,3.2*dt*(1+.12*Math.max(0,avgLvl-u.lvl)));
      if(u.spinT>0){u.spinT-=dt;u.spinTick-=dt;if(u.spinTick<=0){u.spinTick=.25;let tot=0;const sr=u.spinR||190;for(const o of units){if(o.dead||!isEnemy(u,o)||Math.abs(o.x-u.x)>sr+60||dist(u,o)>sr+o.r*.6)continue;
        const hp=o.hp,damage=dealDamage(o,u.spinDmg,'p',u,true);tot+=damage;
        if(ARX&&damage>0)damageNumber(o,damage,'p',u,false,o.hp===hp,false)}if(tot>0){heal(u,tot*.15);sndAt('hit',u.x,u.y)}}}
      if(u.lsT>0)u.lsT-=dt;if(u.rapid)rapidTick(u,dt);
      if(u.fuseT>0){u.fuseT-=dt;if(u.fuseT<=0)fuseNow(u)}else if(u.wk2&&gameT>=FUSE_AT&&canFuse(u))startFuse(u);
      if(u.lotusT>0){u.lotusT-=dt;u.lotusTick-=dt;if(u.lotusTick<=0){u.lotusTick=.2;for(const o of units){if(o.dead||!isEnemy(u,o)||dist(u,o)>u.lotusR+o.r*.5)continue;dealDamage(o,u.lotusDmg,'p',u,false);if(!o.dead){o.slowT=Math.max(o.slowT,.5);o.slowAmt=Math.max(o.slowT>.5?o.slowAmt:0,.2)}}}}
    }
    let m={mx:0,my:0};
    if(isHuman(u)){const inp=u.ctrl==='host'?localInput():(net.inputs[u.ctrl]||{mx:0,my:0,atk:false});m={mx:inp.mx||0,my:inp.my||0};if(CURSED){tpsHost(u,inp,dt);if(u.blk){m.mx*=.45;m.my*=.45}}if(inp.atk&&!u.blk){u.amode=inp.am?2:1;basic(u)}}
    else if(u.zombie)m=zombieThink(u,dt);else if(u.mob){nightAggro(u);m=mobThink(u,dt)}else{m=botThink(u,dt);if(Math.random()<dt*3)botPotions(u)}
    if(typeof feelMove==='function')m=feelMove(u,m,dt);   // arena-feel.js: acceleration, wind-up slow, roll easing
    if(u.stunT>0||u.rootT>0){m.mx=0;m.my=0}
    u.mvx=m.mx;u.mvy=m.my;u.wet=u.hero&&inWater(u.x,u.y);
    if(u.leap){const L=u.leap;L.t+=dt;const k=Math.min(1,L.t/L.T);u.x=lerp(L.sx,L.tx,k);u.y=lerp(L.sy,L.ty,k);
      if(k>=1){u.leap=null;
        if(L.el){const e=L.el;aoe({x:u.x,y:u.y,r:L.r,dmg:L.dmg,type:'p',owner:u,kind:e==='fire'?'meteor':e==='frost'?'frost':'judg',stun:L.stun,big:true,el:e,elP:1,burn:e==='fire'?(16+1.4*u.lvl)*(1+spellAmp(u)):0});
          if(e==='storm')aoe({x:u.x,y:u.y,r:L.r,dmg:L.dmg*.12,type:'m',owner:u,kind:'thunder',delay:.15,dot:1.2,tick:.3,el:e,elP:.4})}
        else aoe({x:u.x,y:u.y,r:L.r,dmg:L.dmg,type:'p',owner:u,kind:'judg',stun:L.stun,big:true});
        if(L.k2)aoe({x:u.x,y:u.y,r:L.r*1.1,dmg:L.k2,type:'p',owner:u,kind:'whirl',delay:.35,kb:520,vis:.45})}}
    else if(u.kb){u.x+=u.kb.vx*dt;u.y+=u.kb.vy*dt;const f=Math.exp(-7*dt);u.kb.vx*=f;u.kb.vy*=f;u.kb.t-=dt;if(u.kb.t<=0)u.kb=null}
    else if(u.dash){
      u.x+=u.dash.vx*dt;u.y+=u.dash.vy*dt;u.dash.t-=dt;
      if(u.dash.hit){for(const o of units){if(o.dead||!isEnemy(u,o)||u.dash.hit.has(o))continue;
        if(dist(u,o)<u.r+o.r+10){u.dash.hit.add(o);dealDamage(o,u.dash.dmg,'p',u);o.stunT=Math.max(o.stunT,u.dash.stun);if(u.dash.slow&&!o.dead){o.slowAmt=Math.max(o.slowT>1.8?o.slowAmt:0,u.dash.slow);o.slowT=Math.max(o.slowT,1.8)}
          fxE(u.dash.stop?'bash':'xcut',{x:o.x|0,y:o.y|0,a:+Math.atan2(u.dash.vy,u.dash.vx).toFixed(2)});sndAt('hit',o.x,o.y);if(u.dash.stop){u.dash.t=0;break}}}}
      if(u.dash&&u.dash.t<=0)u.dash=null;
    }else{const sp=speedOf(u);u.x+=m.mx*sp*dt;u.y+=m.my*sp*dt;
      if(m.mx||m.my){const l=Math.hypot(m.mx,m.my);if(!(isHuman(u)&&u.atkCd>-0.3&&nearestEnemy(u,u.range+70,true))){u.fx=m.mx/l;u.fy=m.my/l}}}
    if(!u.leap&&(u.hero||m.mx||m.my||u.kb||u.dash))collideUnit(u);
    if(u.hero){u.inBush=!!hideAt(u.x,u.y);u.hidden=(u.inBush||u.invisT>0)&&u.revealT<=0||u.invisT>0&&u.revealT<=.5;if(!u.leap){if((u.id+frameN)%3===0)tryPickup(u);if(u.bot&&Math.random()<.05){const bx=boxNear(u);if(bx)openBox(u,bx.id)}}}
  }
  // keep units from overlapping: spatial hash, so 400+ units stay cheap
  {const SG=new Map(),C=150;for(const a of units){if(a.dead||a.leap)continue;const k=Math.floor(a.x/C)*4096+Math.floor(a.y/C);let c=SG.get(k);if(!c){c=[];SG.set(k,c)}c.push(a)}
   for(const a of units){if(a.dead||a.leap)continue;const cx=Math.floor(a.x/C),cy=Math.floor(a.y/C);
    for(let i=cx-1;i<=cx+1;i++)for(let j=cy-1;j<=cy+1;j++){const c=SG.get(i*4096+j);if(!c)continue;
      for(const b of c){if(b.id<=a.id||b.dead||b.leap)continue;const dx=b.x-a.x,dy=b.y-a.y;if(Math.abs(dx)>140||Math.abs(dy)>140)continue;
        const d=Math.hypot(dx,dy),mn=a.r+b.r;if(d<mn&&d>0){// heavier units give way less: a player walking into monsters shoulders them aside instead of being shoved back
          const ma=pushMass(a),mb=pushMass(b),p=(mn-d)*.8/(ma+mb),nx=dx/d,ny=dy/d;a.x-=nx*p*mb;a.y-=ny*p*mb;b.x+=nx*p*ma;b.y+=ny*p*ma}}}}}
  for(const p of projs){
    if(p.dead)continue;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
    const wr=p.wr||p.r;let hitS=!p.ghost&&(solidAt(p.x,p.y)||forObstacles(p.x,p.y,wr,o=>o.c===1?((p.x-o.x)**2+(p.y-o.y)**2<(o.r+wr)**2):circRect(p.x,p.y,wr,o)));
    if(p.ghost&&(p.x<0||p.y<0||p.x>WORLD||p.y>WORLD))p.life=0;
    if(!hitS)for(const u of units){if(u.dead||!isEnemy(p.owner,u)||p.hit.has(u))continue;
      if(Math.abs(p.x-u.x)<u.r+p.r&&dist(p,u)<u.r*HBX+p.r){p.hit.add(u);
        if(p.basic)addFury(p.owner);if(!p.boom){dealDamage(u,p.dmg,p.crit?'pure':p.type,p.owner,false,p.crit);sndAt(p.crit?'crit':projHitSnd(p),u.x,u.y);
          if(!u.dead){if(p.slow){u.slowT=Math.max(u.slowT,p.slow);u.slowAmt=Math.max(u.slowT>p.slow?u.slowAmt:0,p.slowAmt)}if(p.root){u.rootT=Math.max(u.rootT,p.root);fxE('snare',{id:u.id,x:u.x|0,y:u.y|0})}
            if(p.el)elemHit(p.owner,u,p.el,p.elP);else if(p.st&&(!p.stP||Math.random()<p.stP))stAdd(p.owner,u,p.st,1);if(p.kbF&&!u.boss&&!u.golem){const l=Math.hypot(p.vx,p.vy)||1;u.kb={vx:p.vx/l*p.kbF,vy:p.vy/l*p.kbF,t:.2};u.dash=null}}
          if(p.kind===4)fxE('shatter',{x:u.x|0,y:u.y|0});else if(p.kind>=11)fxE('hit',{x:u.x|0,y:u.y|0,c:p.el?ELEM[p.el].c:p.kind===11?'#7ff0d8':'#ffb46a'})}
        if(!p.pierce){hitS=true;break}}}
    if(hitS||p.life<=0){p.dead=true;
      if(p.boom){aoe({x:p.x,y:p.y,r:p.boom,dmg:p.dmg,type:p.btype||'m',owner:p.owner,kind:p.bkind||(p.el?EL_BURST[p.el]:'boom'),vis:.3,root:p.broot||0,slow:p.broot?p.broot+1:0,slowAmt:.4,el:p.el,elP:p.elP});sndAt(p.bkind==='net'?'frost':'boom',p.x,p.y)}
      else if(hitS)fxE('hit',{x:p.x|0,y:p.y|0,c:p.el?ELEM[p.el].c:p.kind===1?'#ffb070':p.kind===3||p.kind===4?'#bfefff':'#e8ffe0'})}
  }
  projs=projs.filter(p=>!p.dead);
  const fresh=[];
  for(const a of aoes){
    a.t+=dt;if(a.follow&&!a.follow.dead&&!a.done&&(a.followAll||a.t<a.delay+.01)){a.x=a.follow.x;a.y=a.follow.y}
    if(a.t<a.delay)continue;
    if(a.dot){a.dotT=(a.dotT||0)-dt;if(a.t-a.delay<a.dot){if(a.dotT<=0){a.dotT=a.tick;applyAoe(a)}}else{a.done=true;if(a.endStun){for(const u of units){if(u.dead||!isEnemy(a.owner,u)||!hitArea(a,u))continue;u.stunT=Math.max(u.stunT,a.endStun);fxE('freeze',{id:u.id,x:u.x|0,y:u.y|0})}fxE('shatter',{x:a.x|0,y:a.y|0,r:a.r});sndAt('freeze',a.x,a.y)}}continue}
    if(!a.done){a.done=true;if(!a.fxOnly)applyAoe(a);a.fxT=a.vis;
      if(a.big){emit({t:'k',a:a.kind==='meteor'?12:9,x:a.x|0,y:a.y|0});sndAt(a.kind==='meteor'?'boom':'quake',a.x,a.y)}
      if(a.burn)fresh.push({x:a.x,y:a.y,r:a.r*.85,dmg:a.burn*.5,type:'m',owner:a.owner,kind:'burn',dot:3,tick:.5,t:0,delay:0,done:false,vis:.3,fxT:0,st:a.el==='fire'?'fire':undefined})}
    a.fxT-=dt;
  }
  aoes=aoes.filter(a=>!(a.done&&(a.dot?true:a.fxT<=0))).concat(fresh);
}
function applyAoe(a){for(const u of units){if(u.dead||!isEnemy(a.owner,u))continue;
  if(hitArea(a,u)){dealDamage(u,a.dmg,a.type,a.owner,!!a.dot&&a.kind!=='rain'&&a.kind!=='blizz'&&a.kind!=='qblizz'&&a.kind!=='volley'&&a.kind!=='thunder');if(u.dead)continue;
    if(a.kb&&!u.boss&&!u.golem){const d=dist(a,u)||1;u.kb={vx:(u.x-a.x)/d*a.kb,vy:(u.y-a.y)/d*a.kb,t:.26};u.dash=null}if(a.stun)u.stunT=Math.max(u.stunT,a.stun);if(a.root)u.rootT=Math.max(u.rootT,a.root);if(a.slow){u.slowT=Math.max(u.slowT,a.slow);u.slowAmt=a.slowAmt||.4}
    if(a.el&&a.dmg>0)elemHit(a.owner,u,a.el,a.elP);else if(a.st&&(!a.stP||Math.random()<a.stP))stAdd(a.owner,u,a.st,a.stN||1)}}}

// ===================== SHARED VISUAL UPDATE =====================
// a player walking into a bot or a monster keeps going (owner 2026-11-23: bots shoved the player back in melee); arena-bots.js stops melee bots leaning in
const pushMass=u=>u.boss||u.golem?12:u.hero?(u.ctrl?10:3):u.big||u.lord?2:1;
function fxUpdate(dt){AU.tick(dt);
  for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.92;if(!p.line)p.vy*=.92;p.life-=dt}parts=parts.filter(p=>p.life>0);
  for(const t of texts){t.y-=(t.dm?30:38)*dt;if(t.vx){t.x+=t.vx*dt;t.vx*=Math.pow(.05,dt)}t.life-=dt}if(scrFl.a>0)scrFl.a=Math.max(0,scrFl.a-dt*1.6);texts=texts.filter(t=>t.life>0);
  if(COMBO.t>0){COMBO.t-=dt;COMBO.pop=Math.max(0,COMBO.pop-dt*6);if(COMBO.t<=0){COMBO.n=0;COMBO.dmg=0}}if(TGT.t>0)TGT.t-=dt;for(const h of hitFl)h.t+=dt;if(hitFl.length)hitFl=hitFl.filter(h=>h.t<.2);
  for(const s of swings)s.life-=dt;swings=swings.filter(s=>s.life>0);
  for(const f of feedList)f.t-=dt;feedList=feedList.filter(f=>f.t>0);
  for(let i=0;i<5;i++)press[i]-=dt;
  if(announce){announce.t-=dt;if(announce.t<=0)announce=null}
  shakeA*=Math.pow(.02,dt);
  const L=listener();
  if(L){
    for(const h of WD.houses){const inside=inRect(L,h,-4);h.roofA=lerp(h.roofA,inside?0:1,1-Math.pow(.001,dt))}
    for(const c of WD.caves){const inside=dist(L,c)<c.R+6;c.roofA=lerp(c.roofA,inside?0:1,1-Math.pow(.003,dt));
      if(inside&&L===ME()&&!discovered.has(c.id)){discovered.add(c.id);announce={txt:'🔮 ค้นพบถ้ำลับ!',t:3};AU.play('cave')}}
    const tx=L.x-W/2/Z,ty=L.y-H/2/Z;cam.x=lerp(cam.x,tx,1-Math.pow(.0005,dt));cam.y=lerp(cam.y,ty,1-Math.pow(.0005,dt));
    const want=(isNight()||isDire(L.x,L.y))?42:14;
    while(flies.length<want)flies.push({x:L.x+rand(-900,900),y:L.y+rand(-600,600),vx:rand(-20,20),vy:rand(-20,20),ph:rand(0,6),c:Math.random()<.5?'#c8ff7a':'#8af6ff'});
    if(flies.length>want)flies.length=want;
    for(const f of flies){f.vx+=rand(-30,30)*dt;f.vy+=rand(-30,30)*dt;f.vx=clamp(f.vx,-25,25);f.vy=clamp(f.vy,-25,25);f.x+=f.vx*dt;f.y+=f.vy*dt;f.ph+=dt*3;
      if(Math.abs(f.x-L.x)>1000||Math.abs(f.y-L.y)>700){f.x=L.x+rand(-900,900);f.y=L.y+rand(-600,600)}}
  }
  for(const u of units){if(u.dead)continue;if(u.dash&&u.dash.hit&&Math.random()<.7)parts.push({x:u.x,y:u.y,vx:rand(-30,30),vy:rand(-30,30),life:.3,max:.3,col:'#ffb07a',sz:9});
    if(u.dash&&!u.dash.hit&&Math.random()<.6)parts.push({x:u.x,y:u.y,vx:0,vy:0,life:.25,max:.25,col:'#9effc9',sz:8})}
  for(const p of projs)if(p.kind===2&&Math.random()<.85)parts.push({x:p.x,y:p.y,vx:rand(-40,40),vy:rand(-40,40),life:.32,max:.32,col:Math.random()<.5?'#ffcf4a':'#ff6a2a',sz:rand(4,9)});
  for(const a of aoes){if(a.kind==='rain'&&a.t>=a.delay&&a.t-a.delay<(a.dot||0)&&Math.random()<.95)parts.push({x:a.x+rand(-a.r,a.r)*.8,y:a.y+rand(-a.r,a.r)*.8,vx:0,vy:0,life:.14,max:.14,col:'#d6ffe6',sz:3,line:true});
    if(a.kind==='burn'&&Math.random()<.7)parts.push({x:a.x+rand(-a.r,a.r)*.7,y:a.y+rand(-a.r,a.r)*.7,vx:0,vy:-20,life:.4,max:.4,col:Math.random()<.5?'#ffb03a':'#ff5a1a',sz:rand(4,8)})}
}
