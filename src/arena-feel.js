// ===================== GAME FEEL · จังหวะเกม การหลบ hitbox และ AI มอนสเตอร์ (Arena Royale, owner 2026-11-23) =====================
// Owner: "เกมมันไวไปหน่อย ปรับการเดิน โจมตี หลบหลีก เล็งสกิล Hitbox และ Animation ให้ลื่นไหล เพิ่มความฉลาดของมอนสเตอร์ ระบบหลบการโจมตี"
//  · pace      heroes and creeps walk slower, basic attacks come a little slower, fury adds less attack speed, bolts fly slower (same range)
//  · movement  velocity eases in and out (b.js calls feelMove) instead of snapping to full speed
//  · melee     a hero's swing and a creep's/zombie's bite land on a HIT FRAME after the wind-up, tested against where the target is THEN
//              (cone in front of the attacker) — step out, circle a big one or dash and it whiffs; a stun breaks a creep's wind-up
//  · (2026-11-23 the owner took the dodge roll out again — the Shift dash, now beside the attack button, is the one dodge)
//  · creeps    no more than 2 (zombies 3) wind up on one hero at once, the rest wait their turn; packs spread around you instead of
//              queueing; wolves, goblins and runners hit and step back, and hop aside from bolts and telegraphed blasts;
//              big ones flash ❗ to the hero they wind up on
//  · bots      step out of telegraphed blasts, some creep swings and some bolts (u.ai.dodge, steered in arena-bots.js)
//  · aim       PC: hold Q/E/R (1/2/3) to see the skill's shape at the mouse, release to cast, right click cancels;
//              touch: the dragged aim snaps gently onto a nearby enemy
// Host-authoritative like the rest of the sim.
// Every number lives in FEEL below.
const FEEL={
  heroSpd:182,                       // HB.spd was 205
  mobSpd:.9,mobAtk:1.08,             // creep move speed ×, attack interval ×
  heroAtk:1.12,furyAS:.6,            // hero basic-attack interval ×, share of fury's attack-speed bonus kept
  boltSpd:.9,                        // basic-attack bolt speed ×
  heroWind:[.11,.17,.07,.09],        // melee hit frame by SWING_K style: sword, heavy, stab, fists
  heroWindMove:.45,                  // move speed while winding up a swing
  accHero:13,decHero:17,accMob:9,accBig:6,
  mobWind:.28,mobWindWolf:.22,mobWindBig:.4,mobWindBoss:.5,zWind:.3,zWindBig:.42,
  reach:26,reachBig:12,              // a creep's swing lunges this far past its attack range
  turn:3.2,                          // rad/s a creep can turn while winding up
  tokens:2,tokensZ:3,
  dodge:{wolf:.32,goblin:.38,zrunner:.22,zombie:.06,ogre:.08},
  dodgeCd:{wolf:2.4,goblin:2.2,zrunner:3,zombie:5,ogre:5},
  backOff:{wolf:1,goblin:1,zrunner:1}};
if(typeof HB!=='undefined'&&typeof CREEPS!=='undefined'&&typeof basic==='function'){
// ---- pace ----
HB.spd=FEEL.heroSpd;
for(const k in CREEPS){const d=CREEPS[k];if(d.spd)d.spd=Math.round(d.spd*FEEL.mobSpd);if(d.atkT)d.atkT=+(d.atkT*FEEL.mobAtk).toFixed(3)}
for(const k in WEAPONS){const w=WEAPONS[k];if(w&&w.pspd)w.pspd=Math.round(w.pspd*FEEL.boltSpd)}
{const _rc=recalc;recalc=function(u,full){_rc(u,full);if(u&&u.hero)u.atkCdBase*=FEEL.heroAtk}}
const feelFury=u=>{const f=u.fury||0;if(f>0)u.atkCd*=(1+FURY_AS*f)/(1+FURY_AS*FEEL.furyAS*f)};
const angD=(a,b)=>{let d=a-b;return Math.atan2(Math.sin(d),Math.cos(d))};
const FW_N=new Map(),ENG_N=new Map(),REACT=[];
FEEL.clearReactions=()=>{REACT.length=0;FW_N.clear();ENG_N.clear()};
FEEL.startWind=feelStartWind;
FEEL.tickWind=feelWindTick;
// ---- movement: eased velocity (called by b.js hostUpdate for every unit) ----
var feelMove=function(u,m,dt){
  if(u.stunT>0||u.rootT>0||u.leap||u.kb||u.fw){u._vx=0;u._vy=0;return u.fw?{mx:0,my:0}:m}
  let tx=m.mx||0,ty=m.my||0;if(u.fwh){tx*=FEEL.heroWindMove;ty*=FEEL.heroWindMove}
  const cx=u._vx||0,cy=u._vy||0,up=tx*tx+ty*ty>=cx*cx+cy*cy;
  const k=u.hero?(up?FEEL.accHero:FEEL.decHero):(u.big||u.r>=34?FEEL.accBig:FEEL.accMob)*(up?1:1.4);
  const a=1-Math.exp(-k*dt);let vx=cx+(tx-cx)*a,vy=cy+(ty-cy)*a;if(!tx&&!ty&&vx*vx+vy*vy<.0016){vx=0;vy=0}
  u._vx=vx;u._vy=vy;return{mx:vx,my:vy}};
// a bot sees a hit coming and steps out of it for a moment (arena-bots.js steers it)
function feelStep(u,dx,dy,t){if(!u||u.dead||!u.ai||isHuman(u))return;const l=Math.hypot(dx,dy)||1;u.ai.dodge={x:dx/l,y:dy/l,t:t||.45}}
function feelHop(u,dx,dy){if(u.dead||u.stunT>0||u.rootT>0||u.dash||u.fw||u.leap||u.kb)return;const l=Math.hypot(dx,dy)||1;u.dash={vx:dx/l*820,vy:dy/l*820,t:.19,hit:null};u.dgT=gameT}
const canHop=u=>{const p=FEEL.dodge[u.kind];return p&&u.mob&&!u.boss&&!u.ecl&&!u.pet&&!u.summon&&!(u.rise>0)&&gameT-(u.dgT||-9)>=FEEL.dodgeCd[u.kind]?p:0};
// ---- hero melee: wind-up, then the original swing at the hit frame ----
{const _b=basic;
  basic=function(u,ft){
    if(!u||!u.hero||!u.melee){const r=_b(u,ft);if(r&&u&&u.hero)feelFury(u);return r}
    if(u.fwh||u.dead||u.stunT>0||u.atkCd>0||u.dash||u.leap||u.spinT>0||u.lotusT>0||u.kb||u.fuseT>0)return false;
    const t=ft||nearestEnemy(u,u.range+25,true),sk=u.wk?SWING_K[u.wk]:3,W=FEEL.heroWind[sk===undefined?0:sk]||.1;
    if(t){const d=dist(u,t)||1;u.fx=(t.x-u.x)/d;u.fy=(t.y-u.y)/d}
    u.fwh={t:W,tid:t?t.id:-1};u.atkCd=W+1;u.atkAnim=.28+W;u.revealT=Math.max(u.revealT||0,1);return true};
  // commits to the target picked at the wind-up: if it stepped out of the cone, the swing only cleaves whoever is there
  var feelHeroSwing=function(u,dt){const F=u.fwh;F.t-=dt;if(F.t>0)return;u.fwh=null;
    let t=F.tid>=0?UMAP.get(F.tid):null;if(t&&(t.dead||!isEnemy(u,t)))t=null;
    const an=u.atkAnim;u.atkCd=0;const ok=_b(u,t||undefined);if(ok){u.atkAnim=an;feelFury(u)}else u.atkCd=.08}}
// ---- creeps and zombies: wind-up, turn-limited tracking, then a cone strike ----
function feelWindOf(u){if(u.zombie)return u.big?FEEL.zWindBig:FEEL.zWind;if(u.boss)return FEEL.mobWindBoss;if(u.kind==='wolf')return FEEL.mobWindWolf;return u.big||u.r>=34?FEEL.mobWindBig:FEEL.mobWind}
function feelStartWind(u,t){const W=feelWindOf(u),a=Math.atan2(t.y-u.y,t.x-u.x);u.fw={t:W,T:W,tid:t.id,ang:a};u.atkCd=W+.5;u.atkAnim=.3+W;u.fx=Math.cos(a);u.fy=Math.sin(a);
  FW_N.set(t.id,(FW_N.get(t.id)||0)+1);
  if(t.hero&&!isHuman(t)&&Math.random()<.4){const s=Math.random()<.5?.7:-.7,b=Math.atan2(t.y-u.y,t.x-u.x)+s;REACT.push({u:t,at:gameT+Math.max(.04,W-.16),x:Math.cos(b),y:Math.sin(b)})}
  if((u.big||u.boss||u.r>=34)&&isHuman(t))fxTextFor(u.x,u.y-u.r-46,'❗','#ff6a4a',W+.25,[t.id])}
function feelWindTick(u,dt){const F=u.fw;if(u.busyT>0)u.busyT=Math.max(0,u.busyT-dt);
  if(u.stunT>0){u.fw=null;u.atkCd=.25;return{mx:0,my:0}}
  const t=UMAP.get(F.tid);
  if(t&&!t.dead){const mx=FEEL.turn*dt*(F.t>F.T*.35?1:.35);F.ang+=clamp(angD(Math.atan2(t.y-u.y,t.x-u.x),F.ang),-mx,mx);u.fx=Math.cos(F.ang);u.fy=Math.sin(F.ang)}
  F.t-=dt;if(F.t<=0){u.fw=null;feelStrike(u,F,t&&!t.dead?t:null)}
  return{mx:0,my:0}}
function feelStrike(u,F,t){const night=isNight(),dmg=u.zombie?u.atkDmg:u.atkDmg*(night?1.4:1),cl=!u.zombie&&u.def.cleave,arc=cl?1.05:.9,
    lunge=u.big||u.r>=34||u.boss?FEEL.reachBig:FEEL.reach;let hit=0;
  for(const o of units){if(o.dead||!isEnemy(u,o)||!cl&&o!==t)continue;const reach=u.range+o.r+lunge;if(Math.abs(o.x-u.x)>reach||Math.abs(o.y-u.y)>reach)continue;
    const d=dist(u,o);if(d>reach)continue;if(Math.abs(angD(Math.atan2(o.y-u.y,o.x-u.x),F.ang))>arc&&d>u.r+o.r*.5)continue;
    dealDamage(o,dmg,'p',u);hit++;
    if(!o.dead){if(u.zombie){if(!o.hidden){o.slowT=Math.max(o.slowT,.8);o.slowAmt=Math.max(o.slowT>.8?o.slowAmt:0,.25)}rotBite(u,o)}else if(u.def.fire)stAdd(u,o,'fire',1)}}
  if(!hit&&t&&isHuman(t)&&dist(u,t)<u.range+t.r+160)fxTextFor(t.x,t.y-74,'หลบ!','#bfe8ff',.7,[t.id]);
  emit({t:'w',id:u.id,a:+F.ang.toFixed(2),r:u.range+u.r,c:u.zombie?'#9dff7a':night?'#ff5a4a':u.def.fire?'#ff8a3a':u.golem?'#9fd0ff':u.boss?'#ff8a5a':'#d8c48a',k:4});
  if(u.r>30||u.big)sndAt('hit',u.x,u.y);
  u.atkCd=u.atkCdBase;if(FEEL.backOff[u.kind])u.backT=hit?.45:.2}
// packs spread around their hero instead of queueing; hit-and-run creeps step back after a strike; those waiting their turn hang back
function feelSteer(u,m,dt){const t=u.aggro;if(!t||t.dead||u.dash||!(m.mx||m.my))return m;
  const d=dist(u,t)||1;if(u.backT>0){u.backT-=dt;return{mx:(u.x-t.x)/d*.75,my:(u.y-t.y)/d*.75}}
  const R=u.range+t.r,wait=u.waitT>0;if(wait)u.waitT-=dt;
  if(d>360||(ENG_N.get(t.id)||0)<2&&!wait)return m;
  const h=u.home||t,off=((u.id*.618)%1-.5)*2.4,sa=Math.atan2(h.y-t.y,h.x-t.x)+off,rr=wait?R+38:R-8;
  const sx=t.x+Math.cos(sa)*rr-u.x,sy=t.y+Math.sin(sa)*rr-u.y,sl=Math.hypot(sx,sy);if(sl<8)return wait?{mx:0,my:0}:m;
  const w=d<R+60?.85:.5,ml=Math.hypot(m.mx,m.my);let vx=m.mx/ml*(1-w)+sx/sl*w,vy=m.my/ml*(1-w)+sy/sl*w;const vl=Math.hypot(vx,vy)||1;
  return{mx:vx/vl*ml,my:vy/vl*ml}}
function feelCanSwing(u,t){if(!t||t.dead||u.busyT>0||u.stunT>0||u.atkCd>0||u.dash)return false;const d=dist(u,t);if(d>=u.range+t.r+6)return false;
  if(!u.zombie){const L=u.def.leash||420;if(dist(u,u.home)>=L||dist(t,u.home)>=L+120||t.hidden&&d>=170)return false}return true}
{const _mt=mobThink;mobThink=function(u,dt){
  if(u.ecl||u.pet||u.summon)return _mt(u,dt);
  if(u.fw)return feelWindTick(u,dt);
  const t=u.aggro;if(feelCanSwing(u,t)){if((FW_N.get(t.id)||0)<FEEL.tokens){feelStartWind(u,t);return{mx:0,my:0}}u.atkCd=rand(.25,.45);u.waitT=.45}
  return feelSteer(u,_mt(u,dt),dt)}}
{const _zt=zombieThink;zombieThink=function(u,dt){
  if(u.rise>0)return _zt(u,dt);
  if(u.fw)return feelWindTick(u,dt);
  const t=u.aggro;if(feelCanSwing(u,t)){if((FW_N.get(t.id)||0)<FEEL.tokensZ){feelStartWind(u,t);return{mx:0,my:0}}u.atkCd=rand(.2,.4);u.waitT=.4}
  return feelSteer(u,_zt(u,dt),dt)}}
// ---- telegraphed blasts: bots step out, nimble creeps hop out ----
{const _ao=aoe;aoe=function(o){const r=_ao(o);try{feelWarn(o)}catch(e){}return r}}
function feelWarn(a){if(!(a.delay>=.32)||a.fxOnly||!(a.dmg>0)||!a.owner)return;
  for(const u of units){if(u.dead||u===a.owner||u.dash||!isEnemy(a.owner,u))continue;if(Math.abs(u.x-a.x)>(a.len||a.r||0)+200||Math.abs(u.y-a.y)>(a.len||a.r||0)+200)continue;
    const bot=u.hero&&!isHuman(u),hop=!bot&&canHop(u);if(!bot&&!hop)continue;
    let x,y;if(a.shape==='line'||a.shape==='cone'){if(!hitArea(a,u))continue;const s=Math.sin(a.ang)*(u.x-a.x)-Math.cos(a.ang)*(u.y-a.y)>=0?1:-1;x=Math.sin(a.ang)*s;y=-Math.cos(a.ang)*s}
    else{const d=Math.hypot(u.x-a.x,u.y-a.y);if(d>a.r+u.r)continue;x=d>1?(u.x-a.x)/d:u.fx;y=d>1?(u.y-a.y)/d:u.fy}
    if(Math.random()<(bot?.5:Math.min(.8,hop*1.6)))REACT.push({u,at:gameT+Math.min(rand(.12,.28),Math.max(.05,a.delay-.14)),x,y})}}
// ---- per frame (host) ----
function feelPre(dt){FW_N.clear();ENG_N.clear();
  for(const u of units){if(u.dead)continue;
    if(u.hero){if(u.fwh)feelHeroSwing(u,dt)}
    else if(u.mob){if(u.fw)FW_N.set(u.fw.tid,(FW_N.get(u.fw.tid)||0)+1);const t=u.aggro;if(t&&!t.dead)ENG_N.set(t.id,(ENG_N.get(t.id)||0)+1)}}
  for(let i=REACT.length-1;i>=0;i--){const r=REACT[i];if(gameT<r.at)continue;REACT.splice(i,1);const u=r.u;if(!u||u.dead)continue;if(u.hero)feelStep(u,r.x,r.y,r.t);else feelHop(u,r.x,r.y)}}
// bolts: nimble creeps hop aside, bots sometimes side-step
function feelPost(){if(!projs.length)return;
  for(const u of units){if(u.dead||u.fw||u.dash||(frameN+u.id)%3)continue;let pc=0;
    if(u.mob){pc=canHop(u);if(!pc)continue}else if(u.hero&&!isHuman(u))pc=.22;else continue;
    for(const p of projs){if(p.dead||!p.owner||p.owner===u||!isEnemy(p.owner,u)||u.mob&&!p.owner.hero)continue;
      const dx=u.x-p.x,dy=u.y-p.y;if(Math.abs(dx)>320||Math.abs(dy)>320)continue;const v=Math.hypot(p.vx,p.vy)||1,al=(dx*p.vx+dy*p.vy)/v;if(al<0||al>v*.4)continue;
      const cr=(dx*p.vy-dy*p.vx)/v;if(Math.abs(cr)>u.r+(p.wr||p.r)+8)continue;
      const S=p._dg||(p._dg=new Set());if(S.has(u.id))continue;S.add(u.id);
      if(Math.random()<pc*(p.basic?1:1.4)){const sg=cr>=0?1:-1;REACT.push({u,at:gameT+rand(.02,.08),x:p.vy/v*sg,y:-p.vx/v*sg,t:.32});break}}}}
{const _hu=hostUpdate;hostUpdate=function(dt){feelPre(dt);_hu(dt);feelPost()}}
// ---- local player: PC hold-to-aim, touch aim feelAssist ----
let PCA=null;const SKC={Digit1:0,KeyQ:0,Digit2:1,KeyE:1,Digit3:2,KeyR:2};
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||state!=='play')return;
  if(!(e.code in SKC))return;if(PCA&&PCA.code===e.code){e.stopImmediatePropagation();return}
  if(e.shiftKey||e.repeat||CUR.touch||!UI.mouse)return;const me=ME(),i=SKC[e.code];if(!me||me.dead||!me.skl[i]||me.cd[i]>0)return;const a=skAim(me,i);if(!a||a.t==='self')return;
  PCA={i,code:e.code};keys[e.code]=true;e.stopImmediatePropagation()},true);
addEventListener('keyup',e=>{if(!PCA||e.code!==PCA.code)return;const i=PCA.i;PCA=null;if(state!=='play'||!UI.mouse)return;pressSkill(i,screenToWorld(UI.mouse.x,UI.mouse.y))},true);
addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==2||state!=='play'||!PCA)return;PCA=null;e.stopImmediatePropagation();e.preventDefault()},true);
addEventListener('blur',()=>{PCA=null});
{const _dan=drawAnnounce;drawAnnounce=function(s){_dan(s);if(PCA)try{feelDrawPcAim()}catch(e){PCA=null}}}
function feelDrawPcAim(){const me=ME();if(!me||me.dead||!UI.mouse){PCA=null;return}const a=skAim(me,PCA.i);if(!a){PCA=null;return}
  const mw=screenToWorld(UI.mouse.x,UI.mouse.y),l=Math.hypot(mw.x-me.x,mw.y-me.y)||1,nx=(mw.x-me.x)/l,ny=(mw.y-me.y)/l,d=a.t==='dir'||a.t==='cone'?a.range:Math.min(l,a.range),
    p={x:me.x+nx*d,y:me.y+ny*d},col='rgba(120,200,255,',px=-ny,py=nx;
  ctx.save();polyW(circW(me.x,me.y,a.range,56));ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.stroke();ctx.setLineDash([]);
  if(a.t==='dir'){const w=a.w/2,L=a.range;polyW([[me.x+px*w,me.y+py*w],[me.x+nx*L+px*w,me.y+ny*L+py*w],[me.x+nx*(L+w*1.2),me.y+ny*(L+w*1.2)],[me.x+nx*L-px*w,me.y+ny*L-py*w],[me.x-px*w,me.y-py*w]]);ctx.fillStyle=col+'.28)';ctx.fill();ctx.strokeStyle=col+'.9)';ctx.lineWidth=2;ctx.stroke()}
  else if(a.t==='cone'){const an=Math.atan2(ny,nx),pts=[[me.x,me.y]];for(let k=0;k<=16;k++){const q=an-a.arc+2*a.arc*k/16;pts.push([me.x+Math.cos(q)*a.range,me.y+Math.sin(q)*a.range])}polyW(pts);ctx.fillStyle=col+'.28)';ctx.fill();ctx.strokeStyle=col+'.9)';ctx.lineWidth=2;ctx.stroke()}
  else if(a.t==='area'){polyW(circW(p.x,p.y,a.r,36));ctx.fillStyle='rgba(255,170,90,.3)';ctx.fill();ctx.strokeStyle='rgba(255,200,120,.95)';ctx.lineWidth=2.5;ctx.stroke()}
  else if(a.t==='unit'){const t=enemyNear(me,p,a.range);polyW(circW(p.x,p.y,230,30));ctx.strokeStyle=col+'.5)';ctx.lineWidth=1.5;ctx.stroke();
    if(t&&unitVisibleTo(t,me,me)){polyW(circW(t.x,t.y,t.r+16,24));ctx.strokeStyle='rgba(255,80,80,.95)';ctx.lineWidth=3;ctx.stroke()}}
  const q=w2s(p.x,p.y);if(q.ok){ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(q.x,q.y,4,0,7);ctx.fill()}ctx.restore()}
// touch: the dragged aim leans onto an enemy close to the line (or the circle)
{const _ap=aimPoint;aimPoint=function(st){const p=_ap(st);if(!p||!p.a)return p;try{return feelAssist(p)}catch(e){return p}}}
function feelAssist(p){const me=ME(),a=p.a;if(!me)return p;const ok=o=>!o.dead&&isEnemy(me,o)&&unitVisibleTo(o,me,me);
  if(a.t==='dir'||a.t==='cone'){const a0=Math.atan2(p.y-me.y,p.x-me.x);let best=null,bw=a.t==='cone'?.22:.16;
    for(const o of units){if(!ok(o))continue;const d=dist(me,o);if(d<1||d>a.range+o.r)continue;const da=angD(Math.atan2(o.y-me.y,o.x-me.x),a0),w=Math.abs(da)*(o.hero?.7:1);if(w<bw){bw=w;best=da}}
    if(best===null)return p;const an=a0+best*.85,L=Math.hypot(p.x-me.x,p.y-me.y);return{x:me.x+Math.cos(an)*L,y:me.y+Math.sin(an)*L,a}}
  if(a.t==='area'){let best=null,bd=Math.max(60,a.r*.55);for(const o of units){if(!ok(o)||dist(me,o)>a.range+a.r*.5)continue;const d=Math.hypot(o.x-p.x,o.y-p.y)*(o.hero?.7:1);if(d<bd){bd=d;best=o}}
    if(best)return{x:lerp(p.x,best.x,.7),y:lerp(p.y,best.y,.7),a}}
  return p}
}
