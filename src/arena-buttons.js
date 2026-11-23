// ===================== HERO-FIRST ATTACK · MONSTER BUTTON · BUTTON LAYOUT (Arena Royale, owner 2026-11-23) =====================
// Owner: "เพิ่มปุ่มตีมอสเตอร์เล็กๆ ข้างปุ่มโจมตีหลัก ปุ่มโจมตีหลักจะตี Hero ก่อนเสมอ ย้ายปุ่มสกิลพุ่งมา ข้างทางซ้ายของที่กด ขวดเลือด
//         ขยับปุ่มสกิลพิเศษ (มันทับกับปุ่มยกเลิกสกิล) · ปรับไอคอนเงินเล็กลง"
//  · the main attack (big button, J, Space) always goes for a hero in reach first, a monster only when no hero is in reach
//  · a small monster button (K) hugs the attack button's lower left: it hits monsters only — the nearest one in reach — and does not
//    swing at all when there is none (a short note says so), so it never starts a fight with a hero by accident
//  · host-authoritative: the input wire's attack field is 0 none · 1 attack · 2 monster attack (an older host reads 2 as a plain
//    attack); the host keeps the mode on the hero (u.amode) for the swing it starts that frame. Bots are untouched
//  · the 💨 dash button sits left of the HP potion, the ✦ special (V) right above it, left of the MP potion — clear of the
//    skill-cancel spot it used to cover; both shrink together on small screens (CUR pad children, so t1.js keeps their cooldowns)
//  · the coin counter is a slim pill with a small coin
//  · the Eclipse boss bar (eclipse-fx.js R3.eclHud: the Snow Queen's three bars, the Overlord's phases) comes up again: installArenaVitals
//    replaces drawTarget outright, which dropped eclipse-fx.js's hook, so in Arena the bar never showed. While it is up, the boss's own
//    small top frame is skipped (no stacked bars), as eclipse-fx.js meant
// ---- host: who the swing goes for ----
{const _b=basic;basic=function(u,ft){
  if(ft||!u||!u.hero||!u.amode||!isHuman(u))return _b.apply(this,arguments);
  const m=u.amode;u.amode=0;
  if(u.dead||u.stunT>0||u.atkCd>0||u.fwh||u.dash||u.leap||u.kb)return _b.call(this,u);   // not ready: the chain refuses as before
  const reach=u.range+(u.melee?25:70);
  if(m===2){const t=nearestEnemy(u,reach,'only');if(t)return _b.call(this,u,t);
    if(gameT-(u._noMobT||-9)>1.4){u._noMobT=gameT;fxTextFor(u.x,u.y-u.r-64,'ไม่มีมอนสเตอร์ในระยะ','#c8d2dc',.9,[u.id])}return false}
  const t=nearestEnemy(u,reach,false)||nearestEnemy(u,reach,true);return t?_b.call(this,u,t):_b.call(this,u)}}
// ---- local input: the monster button (pointer) or K ----
const ATKX={held:new Set(),press:0,key:'',spot:null};
if(typeof CUR!=='undefined'&&CUR.input){const _in=CUR.input;CUR.input=function(mx,my){const r=_in.call(this,mx,my);
  if(r&&state==='play'&&(ATKX.held.size||keys.KeyK)){r.atk=true;r.am=true}return r}}
// the small button's spot: the attack button's lower left (where the dash used to sit), never over a skill, a learn badge or a potion;
// it shrinks a step at a time on a crowded screen
function atkxSpot(){const a=UI.atk;if(!a||!a.r)return null;const P=UI.pot||[];
  const key=W+'|'+H+'|'+Math.round(a.x)+'|'+Math.round(a.y)+'|'+Math.round(a.r)+'|'+P.map(p=>p?Math.round(p.x)+','+Math.round(p.y):'').join(';');
  if(ATKX.key===key&&ATKX.spot)return ATKX.spot;ATKX.key=key;
  const base=Math.max(17,a.r*.46);
  const clear=(x,y,r)=>x-r>=SAFE.l+2&&x+r<=W-SAFE.r-2&&y-r>=SAFE.t+2&&y+r<=H-SAFE.b-1&&UI.sk.every(b=>!b||!b.r||Math.hypot(x-b.x,y-b.y)>=b.r+r+3)&&
    UI.learn.every(b=>!b||!b.r||Math.hypot(x-b.x,y-b.y)>=b.r+r+2)&&P.every(b=>!b||Math.hypot(x-b.x,y-b.y)>=b.r+r+3);
  for(const k of[1,.86,.74])for(const deg of[155,145,165,135,175,125])for(const ex of[4,8,13]){const r=base*k,d=a.r+r+ex,q=deg*Math.PI/180,x=a.x+Math.cos(q)*d,y=a.y+Math.sin(q)*d;
    if(clear(x,y,r))return ATKX.spot={x,y,r}}
  const r=base*.74,q=155*Math.PI/180;return ATKX.spot={x:a.x+Math.cos(q)*(a.r+r+4),y:Math.min(H-SAFE.b-r-1,a.y+Math.sin(q)*(a.r+r+4)),r}}
// a touch on it (window capture: it never reaches the attack button's own wider hit circle underneath)
addEventListener('pointerdown',e=>{if(state!=='play'||e.target!==cv)return;const B=UI.atkMob,me=ME();if(!B||!me||me.dead)return;
  const x=e.clientX,y=e.clientY,rel=Math.hypot(x-B.x,y-B.y)/B.r;if(rel>1.3)return;
  if(UI.atk&&UI.atk.r&&Math.hypot(x-UI.atk.x,y-UI.atk.y)/UI.atk.r<rel)return;for(const b of UI.sk)if(b&&b.r&&Math.hypot(x-b.x,y-b.y)/b.r<rel)return;
  e.preventDefault();e.stopImmediatePropagation();if(typeof AU!=='undefined'&&AU.init)AU.init();ATKX.held.add(e.pointerId);ATKX.press=.15},{capture:true,passive:false});
for(const k of['pointerup','pointercancel'])addEventListener(k,e=>{ATKX.held.delete(e.pointerId)},{capture:true});
addEventListener('blur',()=>ATKX.held.clear());
// the monster head: the weapon emblems' steel, a green monster tint
let atkxArt=null;
function atkxHead(){if(atkxArt)return atkxArt;const c=document.createElement('canvas');c.width=c.height=144;const p=c.getContext('2d'),d=typeof GI!=='undefined'&&GI['spiked-dragon-head'];
  p.save();p.translate(16,16);if(d){const path=new Path2D(d);p.scale(112/512,112/512);const g=p.createLinearGradient(0,0,460,512);g.addColorStop(0,'#f4f8e4');g.addColorStop(.35,'#a9c49a');g.addColorStop(.5,'#f2fbe0');g.addColorStop(.7,'#6f8f6a');g.addColorStop(1,'#8fe07a');
    p.lineJoin='round';p.shadowColor='#8fe07a99';p.shadowBlur=18;p.strokeStyle='#101a12';p.lineWidth=16;p.stroke(path);p.shadowBlur=0;p.fillStyle=g;p.fill(path)}
  else{p.font='86px sans-serif';p.textAlign='center';p.textBaseline='middle';p.fillText('🐾',56,60)}
  p.restore();return atkxArt=c}
const atkxCoarse=matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
function atkxDraw(me){const B=atkxSpot();UI.atkMob=B;if(!B||!me)return;if(ATKX.press>0)ATKX.press-=1/60;
  const on=ATKX.held.size>0||!!keys.KeyK,pressed=on||ATKX.press>0,R=B.r*(pressed?.94:1);
  ctx.save();btnBase(B.x,B.y,B.r,pressed,'#a8d49a',null,false);
  ctx.beginPath();ctx.arc(B.x,B.y,R*.8,0,Math.PI*2);ctx.clip();ctx.globalAlpha=pressed?1:.92;ctx.drawImage(atkxHead(),B.x-R*.8,B.y-R*.86,R*1.6,R*1.6);ctx.restore();
  ctx.save();const fs=Math.max(7.5,B.r*.3),tw=B.r*1.34,th=Math.max(10,B.r*.42),ty=B.y+B.r*.64;rr(B.x-tw/2,ty-th/2,tw,th,3);ctx.fillStyle='#071019eb';ctx.fill();ctx.strokeStyle='#9fc89080';ctx.lineWidth=.7;ctx.stroke();
  ctx.font='600 '+fs+'px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=Math.max(2,fs*.16);ctx.strokeStyle='#030811ed';ctx.strokeText('ตีมอน',B.x,ty+.5);ctx.fillStyle='#dff3d2';ctx.fillText('ตีมอน',B.x,ty+.5);
  if(!atkxCoarse){const s=Math.max(7,B.r*.2),kx=B.x-B.r*.72,ky=B.y-B.r*.72;rr(kx-s,ky-s,s*2,s*2,Math.max(2,s*.23));ctx.fillStyle='#071019f5';ctx.fill();ctx.strokeStyle='#b4c0ca';ctx.lineWidth=1;ctx.stroke();
    ctx.font='600 '+Math.max(9,s*1.27)+'px system-ui,sans-serif';ctx.fillStyle='#e5edf4';ctx.fillText('K',kx,ky+.5)}
  ctx.restore()}
// ---- the dash and special buttons beside the potions, the slim coin ----
if(typeof CUR!=='undefined'&&CUR.el){const E=CUR.el;
  const css=document.createElement('style');css.textContent=`
.arena-combat-hud #arenaGold{padding:3px 10px 3px 4px!important;min-height:0!important;font-size:14px!important;line-height:22px!important;white-space:nowrap}
.arena-combat-hud #arenaGold .moonfall-item-art{width:22px!important;height:22px!important;vertical-align:middle!important;margin:0 5px 0 0!important;border-radius:3px}
.arena-combat-hud #arenaGold span{vertical-align:middle}
.arena-combat-hud #arenaCombatPad #arenaDash .arena-pad-caption,.arena-combat-hud #arenaCombatPad #arenaSpecial .arena-pad-caption{left:auto!important;right:calc(100% + 7px)!important;top:50%!important;bottom:auto!important;min-width:0!important;transform:translateY(-50%)!important}
@media(max-height:420px){.arena-combat-hud #arenaCombatPad #arenaDash .arena-pad-caption,.arena-combat-hud #arenaCombatPad #arenaSpecial .arena-pad-caption{display:none!important}}`;document.head.appendChild(css);
  const put=(el,x,y,k,px,py)=>{const l=(x-30-px).toFixed(1)+'px',t=(y-30-py).toFixed(1)+'px',tf=k<.999?'scale('+k.toFixed(3)+')':'';
    if(el.style.left!==l)el.style.left=l;if(el.style.top!==t)el.style.top=t;if(el.style.transform!==tf){el.style.transform=tf;el.style.transformOrigin='50% 50%'}};
  // c.js drawPotions: HP potion = UI.pot[0] just above the bottom panel (pot0.y = panel.y - r - 6s), MP potion = UI.pot[1] above it
  function atkxLayout(){if(E.pad.style.display==='none'||!UI.pot||!UI.pot[0]||!UI.pot[1])return;const d=E.pad.children[1],sp=E.b3;if(!d||!sp)return;
    const P0=UI.pot[0],P1=UI.pot[1],px=parseFloat(E.pad.style.left)||0,py=parseFloat(E.pad.style.top)||0;
    const dia=clamp(P0.r*2.7,46,60),k=dia/60,rd=dia/2,gap=Math.max(5,P0.r*.28),floor=P0.y+P0.r+6*UI.s-3;
    const x=Math.max(SAFE.l+2+rd,P0.x-P0.r-gap-rd),dy=Math.min(P0.y,floor-rd),sy=Math.max(SAFE.t+2+rd,Math.min(P1.y,dy-rd*2-gap));
    put(d,x,dy,k,px,py);put(sp,x,sy,k,px,py)}
  setTimeout(()=>{   // after the HUD installers (installArenaCombatControls replaces drawBtnAtk; arena-npc.js wraps CUR.step first)
    const _da=drawBtnAtk;drawBtnAtk=function(B,me){const r=_da.apply(this,arguments);try{atkxDraw(me)}catch(e){}return r};
    const st=CUR.step;CUR.step=function(dt){const r=st.call(this,dt);try{if(state!=='play')ATKX.held.clear();else atkxLayout()}catch(e){}return r};
    if(typeof R3!=='undefined'&&R3.eclHud&&typeof drawTarget==='function'){const _dt=drawTarget;let t0=0;
      drawTarget=function(me,s,fr){const now=performance.now(),dt=Math.min(.1,(now-(t0||now))/1000);t0=now;try{R3.eclHud(me,(typeof listener==='function'&&listener())||me,dt)}catch(e){}
        const u=TGT&&UMAP.get(TGT.id);if(u&&R3._eclBossShown&&(u.ecl==='queen'||u.ecl==='overlord'))return;return _dt.apply(this,arguments)}}},0);
}
