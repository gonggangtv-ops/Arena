// ===================== THE SNOW QUEEN · ราชินีหิมะ (Arena Royale, owner 2026-11-22) =====================
// The boss of the crystal castle on the plateau above the Frozen Sanctuary (a.js WD.fort, her camp 'icethrone' before its gate, no respawn).
// Game logic only, host-authoritative: she is an Eclipse-style boss (u.ecl 'queen' through eclipse.js ECL_EXT), so detection, leash,
// out-of-combat regen, phases and the 'ec' events are the Overlord's; eclipse-fx.js draws her (the owner's rigged Ice Queen holding the
// owner's Frostwing Scepter) and her boss bar, arena-frost.js her court and her Eternal Winter.
// Owner 2026-11-23: "ปรับบอสราชินีน้ำแข็งให้เก่งขึ้นมีเลือด 3 เฟส" — three health bars, one per phase (3 × 9,000). A bar takes no
// overflow: the blow that empties it stops at its bottom, she encases herself in ice (immune ~2.3 s), bursts out and the next phase begins.
//  Phase I   (bar 3)  scepter thrusts that chill · Ice Lance (ice spikes erupt in a line toward the target) · Shard Rain · Glacial Step
//  Phase II  (bar 2)  + Frost Nova (roots, two chill stacks) · Blizzard (the frost staff's storm of falling ice spears, ends in a freeze)
//                     · lances fan out three ways · the thrust becomes a two-hit combo
//  Phase III (bar 1)  + Ice Prison (the target is frozen solid) · Eternal Winter (the whole court freezes; only two warm circles are
//                     safe) · five-way lances, faster everything
//  Glacial Step: she vanishes in frost and steps out beside a target that runs (or now and then at random); the spot frosts over first
// Death: a tier-4 frost staff, two runes, gold and a tome.
if(typeof CREEPS!=='undefined'&&typeof ECL_EXT!=='undefined'){
Object.assign(CREEPS,{snowqueen:{name:'Snow Queen · ราชินีหิมะ',hp:27000,dmg:125,armor:8,spd:150,r:46,atkT:1.4,range:150,xp:2200,col:'#bfe6ff',leash:680,ecl:'queen'}});
const QBARS=3,QIMM=2.3;   // health bars (one per phase), immune seconds while a broken bar turns into the next phase
// her own aoe kinds, drawn by queen-vfx.js (the Blender ice set); gameplay is the kind-free aoe() of b.js
AOE_KINDS.push('qwinter','qslash','qlance','qshard','qnova','qblizz','qprison');
Object.assign(AOE_COL,{qwinter:'#e8f6ff',qslash:'#bfe8ff',qlance:'#9fd8ff',qshard:'#cfe4ff',qnova:'#bfeaff',qblizz:'#e8f6ff',qprison:'#bfe6ff'});
// cooldowns (s) per phase; the basic thrust runs on the mob attack timer
const QV=CREEPS.snowqueen.phaseCooldowns=[{lance:6,shards:9,blink:13},{lance:5,shards:8,nova:10,blizz:13,blink:10},{lance:4,shards:7,nova:8,blizz:11,prison:11,winter:26,blink:8}];
const qRand=(a,b)=>a+Math.random()*(b-a);
// a spot on the same ground as the queen (the plateau), d away from her, for her warm circles
function qSafeSpot(u,a0,d){const base=cityBase(u.x,u.y);for(let i=0;i<14;i++){const a=a0+(i%2?1:-1)*Math.ceil(i/2)*.42,x=u.x+Math.cos(a)*d,y=u.y+Math.sin(a)*d;
    if(walkable(x,y,60)&&Math.abs(cityBase(x,y)-base)<30&&!blockedAt({x,y},40))return{x,y}}
  const F=WD&&WD.fort;return F&&F.home?{x:F.home.x+Math.cos(a0)*160,y:F.home.y+Math.sin(a0)*160}:{x:u.x,y:u.y}}
// a spot for Glacial Step: just past the target, on the queen's own ground, inside her leash
function qBlinkSpot(u,t,origin=u.home){const base=cityBase(u.x,u.y),a0=Math.atan2(t.y-u.y,t.x-u.x),L=(u.def&&u.def.leash||860)-120;
  for(let i=0;i<7;i++){const a=a0+(i%2?1:-1)*Math.ceil(i/2)*.5,x=t.x+Math.cos(a)*170,y=t.y+Math.sin(a)*170;
    if(walkable(x,y,60)&&Math.abs(cityBase(x,y)-base)<30&&!blockedAt({x,y},40)&&Math.hypot(x-origin.x,y-origin.y)<L)return{x,y}}return null}
function queenAct(u,t,d,R,dt,choice){const B=u.maxHp/QBARS,ph=u.hp>B*2+.5?0:u.hp>B+.5?1:2;
  // Glacial Step in progress: she is gone, the frost marks where she comes back
  if(u.qBlink&&gameT-u.qBlink.at>1.6)u.qBlink=null;   // a step left hanging (she lost her target, was stunned): forget it
  if(u.qBlink){u.qBlink.t-=dt;if(u.qBlink.t<=0){u.x=u.qBlink.x;u.y=u.qBlink.y;u.qBlink=null;u.fx=Math.cos(Math.atan2(t.y-u.y,t.x-u.x));u.fy=Math.sin(Math.atan2(t.y-u.y,t.x-u.x));emit({t:'k',a:7,x:u.x|0,y:u.y|0});sndAt('freeze',u.x,u.y)}return}
  if(ph>(u.ph|0)){u.ph=ph;u.cds=ph===2?{winter:8,prison:4,nova:2,blink:5}:{blizz:3,blink:4};eclCast(u,'phase',1.6);u.stunT=0;u.qInvT=gameT+QIMM;emit({t:'ec',k:'ph',id:u.id,p:ph});emit({t:'k',a:12,x:u.x|0,y:u.y|0});sndAt('freeze',u.x,u.y);
    emit({t:'a',s:ph===1?'❄ หลอดเลือดแรกแตก — ราชินีหิมะพิโรธ พายุหิมะกำลังมา!':'❄ หลอดสุดท้าย — ฤดูหนาวนิรันดร์ใกล้มาถึง เตรียมหาวงไฟอุ่น!',d:3});
    aoe({x:u.x,y:u.y,r:120,dmg:0,type:'m',owner:u,delay:.2,kind:'qprison',fxOnly:true,vis:.5});   // she encases herself while the next bar fills
    aoe({x:u.x,y:u.y,r:360,dmg:u.atkDmg*.9,type:'m',owner:u,delay:QIMM-.3,kind:'qnova',root:.9,slow:2,slowAmt:.45,st:'frost',stN:2,vis:.6,big:true});u.busyT=Math.max(u.busyT||0,QIMM);return}
  const C=QV[u.ph|0],cd=u.cds||(u.cds={});for(const k in cd)cd[k]-=dt;
  if(u.busyT>0)return;const ready=(k,inRange=true)=>C[k]&&!(cd[k]>0)&&(choice===undefined?inRange:choice===k),use=k=>{cd[k]=C[k]};
  const dmg=u.atkDmg,ang=Math.atan2(t.y-u.y,t.x-u.x),fast=u.ph===2?.8:u.ph===1?.92:1;
  // Eternal Winter: the court freezes over; two warm circles on her ground are the only shelter
  if(ready('winter')){use('winter');eclCast(u,'ultimate',3.6);const a0=Math.random()*6.283,S=[0,1].map(i=>{const p=qSafeSpot(u,a0+i*Math.PI+qRand(-.35,.35),qRand(380,520));return{x:p.x,y:p.y,r:155}});
    aoe({x:u.x,y:u.y,r:1150,dmg:dmg*3.6,type:'m',owner:u,delay:3.4,kind:'qwinter',safes:S,st:'frost',stN:5,big:true,vis:1.2});
    for(const s of S)aoe({x:s.x,y:s.y,r:s.r,dmg:0,type:'m',owner:u,delay:3.4,kind:'usafe',fxOnly:true,vis:.6});
    emit({t:'a',s:'❄ ฤดูหนาวนิรันดร์ — วิ่งเข้าวงไฟอุ่น!',d:3});sndAt('freeze',u.x,u.y);return}
  // Ice Prison: the target's spot glazes over, then it is frozen solid
  if(ready('prison',d<650)){use('prison');eclCast(u,'cage',1.1);aoe({x:t.x,y:t.y,r:150,dmg:dmg*1.5,type:'m',owner:u,delay:1.25,kind:'qprison',root:1.6,st:'frost',stN:5,vis:.55});return}
  // Blizzard: the frost staff's storm on the target (every tick chills; the field ends in a freeze)
  if(ready('blizz',d<800)){use('blizz');eclCast(u,'rain',1.2);aoe({x:t.x,y:t.y,r:320,dmg:dmg*.3,type:'m',owner:u,delay:.6,kind:'qblizz',dot:3.6,tick:.45,slow:1.2,slowAmt:.5,endStun:.9,st:'frost'});return}
  // Frost Nova: arms flung wide, the ice bursts out of the ground all round her
  if(ready('nova',d<330)){use('nova');eclCast(u,'burst',1.3);aoe({x:u.x,y:u.y,r:360,dmg:dmg*1.5,type:'m',owner:u,delay:1,kind:'qnova',root:1.1,slow:2.2,slowAmt:.45,st:'frost',stN:2,vis:.6,big:true});return}
  // Glacial Step: the target runs (or now and then for no reason) — she vanishes and steps out beside it
  if(ready('blink')&&(choice==='blink'||d>420||Math.random()<.2)){const p=qBlinkSpot(u,t,choice==='blink'?u:u.home);if(p){use('blink');eclCast(u,'cast',.6);u.busyT=Math.max(u.busyT||0,.8);u.qBlink={x:p.x,y:p.y,t:.62,at:gameT};
      aoe({x:u.x,y:u.y,r:200,dmg:0,type:'m',owner:u,delay:.05,kind:'qnova',fxOnly:true,vis:.4});
      aoe({x:p.x,y:p.y,r:230,dmg:dmg*1.3,type:'m',owner:u,delay:.62,kind:'qnova',root:.6,slow:1.6,slowAmt:.4,st:'frost',stN:1,vis:.5});return}}
  // Shard Rain: the scepter raised to the sky, ice crystals fall on everyone near her
  if(ready('shards',d<900)){use('shards');eclCast(u,'rain',1.3);const tg=units.filter(h=>h.hero&&!h.dead&&Math.hypot(h.x-u.x,h.y-u.y)<900);
    for(let i=0;i<(u.ph===2?12:u.ph===1?9:6);i++){const h=tg[i%Math.max(1,tg.length)]||t,rr=Math.random()*220,a=Math.random()*6.283;aoe({x:h.x+Math.cos(a)*rr,y:h.y+Math.sin(a)*rr,r:95,dmg:dmg*.95,type:'m',owner:u,delay:.85+i*.16,kind:'qshard',st:'frost',vis:.35})}return}
  // Ice Lance: a thrust of the scepter, ice spikes erupt one after another along the line toward the target (phase II: three lines,
  // phase III: five)
  if(ready('lance',d<760&&d>160)){use('lance');eclCast(u,'slash',1);const fan=u.ph===2?[0,-.3,.3,-.6,.6]:u.ph===1?[0,-.38,.38]:[0];
    for(const o of fan){const cx=Math.cos(ang+o),cy=Math.sin(ang+o);
      for(let i=0;i<6;i++){const s=120+i*150;aoe({x:u.x+cx*s,y:u.y+cy*s,r:92,dmg:dmg*(o?1:1.2),type:'m',owner:u,delay:.5+i*.08+Math.abs(o)*.25,kind:'qlance',root:.5,slow:1.4,slowAmt:.4,st:'frost',vis:.35})}}return}
  // the scepter thrust: an ice-blue arc in front of her, chills what it hits; from phase II a second, wider sweep follows
  if((choice===undefined?d<R+12:choice==='basic')&&u.atkCd<=0){u.atkCd=u.atkCdBase*fast;eclCast(u,'basic',.55);
    aoe({x:u.x,y:u.y,r:R+60,len:R+60,ang,arc:.85,shape:'cone',dmg:dmg,type:'p',owner:u,delay:.3,kind:'qslash',st:'frost',vis:.35});
    if(u.ph>=1)aoe({x:u.x,y:u.y,r:R+80,len:R+80,ang,arc:1.15,shape:'cone',dmg:dmg*.8,type:'p',owner:u,delay:.68,kind:'qslash',st:'frost',vis:.35})}}
// owner 2026-11-24: her moon court is gone — she holds the forecourt before her crystal castle's gate, a stone's throw from the stair
// head, so she wakes a little closer (detect 620 -> 420) and keeps nearer her gate (leash 860 -> 680)
ECL_EXT.queen={detect:420,act:queenAct,
  wake(u){sndAt('freeze',u.x,u.y);emit({t:'f',s:'❄ ราชินีหิมะตื่นจากบัลลังก์น้ำแข็ง!'});emit({t:'a',s:'❄ SNOW QUEEN · ราชินีหิมะ',d:2.4});emit({t:'k',a:8,x:u.x|0,y:u.y|0})},
  lose(u){emit({t:'f',s:'❄ ราชินีหิมะกลับสู่บัลลังก์และฟื้นพลัง'})}};
// three bars: a blow stops at the bottom of the bar she is on (no overflow into the next), and she is immune while she turns
{const _dd=dealDamage;dealDamage=function(t,amt,type,src,quiet,crit){
  if(!t||t.ecl!=='queen'||t.dead)return _dd.apply(this,arguments);
  if(t.qInvT&&gameT<t.qInvT){if(!quiet&&src&&isHuman(src)&&gameT-(t._qImm||0)>.6){t._qImm=gameT;fxTextFor(t.x,t.y-t.r-70,'❄ IMMUNE','#bfe6ff',.8,[src.id])}return 0}
  const B=t.maxHp/QBARS,floor=Math.floor((t.hp-1e-6)/B)*B;if(floor<=0)return _dd.apply(this,arguments);
  const h0=t.hp;t._qFloor=floor;let r;try{r=_dd.apply(this,arguments)}finally{t._qFloor=0}
  if(!t.dead&&t.hp<=floor+1e-6){t.hp=floor;r=Math.min(r,h0-floor);t.qInvT=gameT+QIMM}   // the bar broke: immune until the next phase is up
  return r}}
// Eternal Winter spares whoever stands in one of its warm circles
{const _ha=hitArea;hitArea=function(a,u){if(a.safes){for(const s of a.safes)if(Math.hypot(u.x-s.x,u.y-s.y)<s.r)return false}return _ha(a,u)}}
// death: the court's treasure
{const _k=kill;kill=function(t,src){if(!t||t.dead)return;if(t.ecl==='queen'&&t._qFloor>0){t.hp=t._qFloor;return}   // a bar break, not a death
  const r=_k.apply(this,arguments);
  if(t&&t.ecl==='queen'){emit({t:'f',s:'❄ ราชินีหิมะถูกโค่นแล้ว! สมบัติแห่งบัลลังก์น้ำแข็งร่วงลงบนลาน'});emit({t:'k',a:16,x:t.x|0,y:t.y|0});emit({t:'ec',k:'die',id:t.id,x:t.x|0,y:t.y|0,q:1});
    dropItem({k:'w',x:t.x+90,y:t.y,wk:'frost',tier:4});dropItem({k:'r',x:t.x-90,y:t.y,tier:4});dropItem({k:'r',x:t.x,y:t.y+90,tier:3});
    dropItem({k:'c',x:t.x,y:t.y-90,n:5,gold:true});dropItem({k:'i',x:t.x+64,y:t.y+64,it:'tome'})}
  return r}}
}
