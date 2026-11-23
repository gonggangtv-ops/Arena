// ===================== THE SNOW QUEEN · ราชินีหิมะ (Arena Royale, owner 2026-11-22) =====================
// The boss of the ice castle on the plateau above the Frozen Sanctuary (a.js WD.fort, her camp 'icethrone', no respawn).
// Game logic only, host-authoritative: she is an Eclipse-style boss (u.ecl 'queen' through eclipse.js ECL_EXT), so detection, leash,
// out-of-combat regen, phases and the 'ec' events are the Overlord's; eclipse-fx.js draws her (the owner's rigged Ice Queen holding the
// owner's Frostwing Scepter) and her boss bar, arena-frost.js her court and her Eternal Winter.
//  Phase I   (100–70%) scepter thrusts that chill · Ice Lance (ice spikes erupt in a line toward the target) · Shard Rain
//  Phase II  (70–35%)  + Frost Nova (roots, two chill stacks) · Blizzard (the frost staff's storm of falling ice spears, ends in a freeze)
//  Phase III (< 35%)   + Ice Prison (the target is frozen solid) · Eternal Winter (the throne hall freezes; two marked warm circles are safe)
// Death: a tier-4 frost staff, two runes, gold and a tome.
if(typeof CREEPS!=='undefined'&&typeof ECL_EXT!=='undefined'){
Object.assign(CREEPS,{snowqueen:{name:'Snow Queen · ราชินีหิมะ',hp:14000,dmg:110,armor:7,spd:150,r:46,atkT:1.5,range:150,xp:1500,col:'#bfe6ff',leash:860,ecl:'queen'}});
// her own aoe kinds, drawn by queen-vfx.js (the Blender ice set); gameplay is the kind-free aoe() of b.js
AOE_KINDS.push('qwinter','qslash','qlance','qshard','qnova','qblizz','qprison');
Object.assign(AOE_COL,{qwinter:'#e8f6ff',qslash:'#bfe8ff',qlance:'#9fd8ff',qshard:'#cfe4ff',qnova:'#bfeaff',qblizz:'#e8f6ff',qprison:'#bfe6ff'});
// cooldowns (s) per phase; the basic thrust runs on the mob attack timer
const QV=[{lance:7,shards:10},{lance:6,shards:9,nova:11,blizz:14},{lance:5,shards:8,nova:9,blizz:12,prison:13,winter:30}];
function queenAct(u,t,d,R,dt){const hr=u.hp/u.maxHp,ph=hr>.7?0:hr>.35?1:2;
  if(ph>(u.ph|0)){u.ph=ph;u.cds=ph===2?{winter:8,prison:4,nova:2}:{blizz:3};eclCast(u,'phase',1.6);u.stunT=0;emit({t:'ec',k:'ph',id:u.id,p:ph});emit({t:'k',a:12,x:u.x|0,y:u.y|0});sndAt('freeze',u.x,u.y);
    emit({t:'a',s:ph===1?'❄ ราชินีหิมะพิโรธ — พายุหิมะกำลังมา!':'❄ ฤดูหนาวนิรันดร์ใกล้มาถึง — เตรียมหาวงไฟอุ่น!',d:3});
    aoe({x:u.x,y:u.y,r:340,dmg:u.atkDmg*.8,type:'m',owner:u,delay:.9,kind:'qnova',root:.8,slow:2,slowAmt:.45,st:'frost',stN:2,vis:.6,big:true});return}
  const C=QV[u.ph|0],cd=u.cds||(u.cds={});for(const k in cd)cd[k]-=dt;
  if(u.busyT>0)return;const ready=k=>C[k]&&!(cd[k]>0),use=k=>{cd[k]=C[k]};
  const dmg=u.atkDmg,ang=Math.atan2(t.y-u.y,t.x-u.x),fast=u.ph===2?.85:1;
  // Eternal Winter: the court freezes over; two warm circles on her ground are the only shelter
  if(ready('winter')){use('winter');eclCast(u,'ultimate',3.6);const S=WD.fort.safes;
    aoe({x:u.x,y:u.y,r:1150,dmg:dmg*3.6,type:'m',owner:u,delay:3.4,kind:'qwinter',safes:S,st:'frost',stN:5,big:true,vis:1.2});
    for(const s of S)aoe({x:s.x,y:s.y,r:s.r,dmg:0,type:'m',owner:u,delay:3.4,kind:'usafe',fxOnly:true,vis:.6});
    emit({t:'a',s:'❄ ฤดูหนาวนิรันดร์ — วิ่งเข้าวงไฟอุ่น!',d:3});sndAt('freeze',u.x,u.y);return}
  // Ice Prison: the target's spot glazes over, then it is frozen solid
  if(ready('prison')&&d<650){use('prison');eclCast(u,'cage',1.1);aoe({x:t.x,y:t.y,r:150,dmg:dmg*1.5,type:'m',owner:u,delay:1.25,kind:'qprison',root:1.6,st:'frost',stN:5,vis:.55});return}
  // Blizzard: the frost staff's storm on the target (every tick chills; the field ends in a freeze)
  if(ready('blizz')&&d<800){use('blizz');eclCast(u,'rain',1.2);aoe({x:t.x,y:t.y,r:320,dmg:dmg*.3,type:'m',owner:u,delay:.6,kind:'qblizz',dot:3.6,tick:.45,slow:1.2,slowAmt:.5,endStun:.9,st:'frost'});return}
  // Frost Nova: arms flung wide, the ice bursts out of the ground all round her
  if(ready('nova')&&d<330){use('nova');eclCast(u,'burst',1.3);aoe({x:u.x,y:u.y,r:360,dmg:dmg*1.5,type:'m',owner:u,delay:1,kind:'qnova',root:1.1,slow:2.2,slowAmt:.45,st:'frost',stN:2,vis:.6,big:true});return}
  // Shard Rain: the scepter raised to the sky, ice crystals fall on everyone near her
  if(ready('shards')&&d<900){use('shards');eclCast(u,'rain',1.3);const tg=units.filter(h=>h.hero&&!h.dead&&fortHall(h)&&Math.hypot(h.x-u.x,h.y-u.y)<900);
    for(let i=0;i<(u.ph===2?10:u.ph===1?8:6);i++){const h=tg[i%Math.max(1,tg.length)]||t,rr=Math.random()*220,a=Math.random()*6.283;aoe({x:h.x+Math.cos(a)*rr,y:h.y+Math.sin(a)*rr,r:95,dmg:dmg*.95,type:'m',owner:u,delay:.85+i*.16,kind:'qshard',st:'frost',vis:.35})}return}
  // Ice Lance: a thrust of the scepter, ice spikes erupt one after another along the line toward the target
  if(ready('lance')&&d<760&&d>160){use('lance');eclCast(u,'slash',1);const cx=Math.cos(ang),cy=Math.sin(ang);
    for(let i=0;i<6;i++){const s=120+i*150;aoe({x:u.x+cx*s,y:u.y+cy*s,r:92,dmg:dmg*1.2,type:'m',owner:u,delay:.5+i*.08,kind:'qlance',root:.5,slow:1.4,slowAmt:.4,st:'frost',vis:.35})}return}
  // the scepter thrust: an ice-blue arc in front of her, chills what it hits
  if(d<R+12&&u.atkCd<=0){u.atkCd=u.atkCdBase*fast;eclCast(u,'basic',.55);
    aoe({x:u.x,y:u.y,r:R+60,len:R+60,ang,arc:.85,shape:'cone',dmg:dmg,type:'p',owner:u,delay:.3,kind:'qslash',st:'frost',vis:.35})}}
ECL_EXT.queen={detect:680,target:fortHall,act:queenAct,
  wake(u){sndAt('freeze',u.x,u.y);emit({t:'f',s:'❄ ราชินีหิมะตื่นจากบัลลังก์น้ำแข็ง!'});emit({t:'a',s:'❄ SNOW QUEEN · ราชินีหิมะ',d:2.4});emit({t:'k',a:8,x:u.x|0,y:u.y|0})},
  lose(u){emit({t:'f',s:'❄ ราชินีหิมะกลับสู่บัลลังก์และฟื้นพลัง'})}};
// Eternal Winter spares whoever stands in one of its warm circles
{const _ha=hitArea;hitArea=function(a,u){if(a.kind==='qwinter'&&!fortHall(u))return false;if(a.safes){for(const s of a.safes)if(Math.hypot(u.x-s.x,u.y-s.y)<s.r)return false}return _ha(a,u)}}
// death: the court's treasure
{const _k=kill;kill=function(t,src){const r=_k.apply(this,arguments);
  if(t&&t.ecl==='queen'){emit({t:'f',s:'❄ ราชินีหิมะถูกโค่นแล้ว! สมบัติแห่งบัลลังก์น้ำแข็งร่วงลงบนลาน'});emit({t:'k',a:16,x:t.x|0,y:t.y|0});emit({t:'ec',k:'die',id:t.id,x:t.x|0,y:t.y|0,q:1});
    dropItem({k:'w',x:t.x+90,y:t.y,wk:'frost',tier:4});dropItem({k:'r',x:t.x-90,y:t.y,tier:4});dropItem({k:'r',x:t.x,y:t.y+90,tier:3});
    dropItem({k:'c',x:t.x,y:t.y-90,n:5,gold:true});dropItem({k:'i',x:t.x+64,y:t.y+64,it:'tome'})}
  return r}}
}
