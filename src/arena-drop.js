// ===================== SKY DROP · everyone comes down from the sky and each player picks where (Arena Royale, owner 2026-11-23) =====================
// Owner: "ตอนเริ่มเกมอยากได้ Animation ส่งทุกคนลงมาจากฟ้า ผู้เล่นเลือกได้ว่าจะลงโซนไหน"
//  · pick  (DROP.PICK s, shorter once every player is ready): a full-screen map; tap anywhere inside the storm circle to choose the
//          landing spot (lands, villages, merchants and landmarks are labelled); 🎲 picks a village at random, ✔ says ready.
//          The world is frozen meanwhile (the host skips hostUpdate), so the storm clock and gameT start when everyone lands.
//          Bots pick villages / camps / open ground; in team games they land beside their team's player (or leader)
//  · fall  everyone drops from high above its spot with a comet trail, staggered; the camera starts far out and closes in as you
//          land; touchdown kicks up dust, a shock ring and a flash. Heroes are hidden until their own fall begins
//  · host-authoritative: the host broadcasts {t:'drop'} every .6 s (clients joining the match late in the pick still sync), clients
//    send {t:'land'} / {t:'dready'}; game actions sent during the drop are ignored. LAB / balance sims (simMode) skip the drop,
//    and window.__game.skipDrop() ends it at once (tests)
// Starter weapons by the spawn points are gone (a.js): search the houses, chests and monsters where you land.
const DROP={st:'off',PICK:13,PICKN:17,F:2.6,H0:2300,t:0,tot:0,bc:0,picks:new Map(),ready:new Set(),fall:null,mine:null,mates:[],waitT:0,el:null,reg:null,regWD:null,
  sky(){return this.st==='pick'||this.st==='wait'||this.st==='fall'&&this.inAir(myId)},
  inAir(id){const f=this.fall,q=f&&f.L.get(id);return !!q&&this.now()-f.t0-q.d<f.F},
  hideId(id){if(this.st==='pick'||this.st==='wait')return true;const f=this.fall,q=f&&f.L.get(id);return !!q&&this.now()-f.t0-q.d<0},
  now(){return performance.now()/1000},
  // body height above the ground during the fall (0 once landed)
  h(id){const f=this.fall,q=f&&f.L.get(id);if(!q)return 0;const k=(this.now()-f.t0-q.d)/f.F;if(k<0)return this.H0;if(k>=1)return 0;return this.H0*(1-k)*(1-k)},
  camK(){if(this.st==='pick'||this.st==='wait')return 2.6;const f=this.fall,q=f&&f.L.get(myId);if(!q)return 1;const k=(this.now()-f.t0-q.d)/f.F;
    if(k<0)return 2.6;if(k<1)return 1+1.6*Math.pow(1-k,1.6);return 1}};
if(typeof hostNewGame==='function'){
// ---------------------------------------------------------------- host ----------------------------------------------------------------
const okLand=p=>walkable(p.x,p.y,34)&&!inWater(p.x,p.y)&&!houseAt(p)&&!inDG(p,80)&&!blockedAt(p,30)&&Math.hypot(p.x-zone.x,p.y-zone.y)<zone.r-140;
function dropLandSpot(p,taken){const free=q=>okLand(q)&&!taken.some(t=>Math.hypot(t.x-q.x,t.y-q.y)<70);if(free(p))return{x:p.x,y:p.y};
  for(let r=40;r<=900;r+=40)for(let i=0,n=Math.max(8,Math.round(r/14));i<n;i++){const a=i/n*6.2832+r*.013,q={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r};if(free(q))return q}
  for(let k=0;k<400;k++){const a=Math.random()*6.2832,d=Math.sqrt(Math.random())*(zone.r-200),q={x:zone.x+Math.cos(a)*d,y:zone.y+Math.sin(a)*d};if(free(q))return q}
  return{x:zone.x,y:zone.y}}
// a bot's (or an undecided player's) spot: mostly a village, sometimes a monster camp or open ground
function dropRandomLand(){const inz=p=>Math.hypot(p.x-zone.x,p.y-zone.y)<zone.r-260,V=WD.villages.filter(inz),r=Math.random();
  if(V.length&&r<.62){const v=V[Math.floor(Math.random()*V.length)],a=Math.random()*6.2832,d=Math.random()*v.r*.75;return{x:v.x+Math.cos(a)*d,y:v.y+Math.sin(a)*d}}
  const C=WD.camps.filter(inz);if(C.length&&r<.8){const c=C[Math.floor(Math.random()*C.length)],a=Math.random()*6.2832;return{x:c.x+Math.cos(a)*420,y:c.y+Math.sin(a)*420}}
  const a=Math.random()*6.2832,d=Math.sqrt(Math.random())*(zone.r-300);return{x:zone.x+Math.cos(a)*d,y:zone.y+Math.sin(a)*d}}
const clampZ=p=>{const dx=p.x-zone.x,dy=p.y-zone.y,d=Math.hypot(dx,dy),m=zone.r-160;return d>m?{x:zone.x+dx/d*m,y:zone.y+dy/d*m}:{x:p.x,y:p.y}};
DROP.start=function(){const solo=!Object.keys(net.cl||{}).length;this.st='pick';this.tot=this.t=solo?this.PICK:this.PICKN;this.bc=0;this.picks.clear();this.ready.clear();this.fall=null;this.mine=null;this.mates=[];
  for(const u of units)if(u.hero&&!isHuman(u))u.dropAt=rand(.6,this.tot-1.2)};
DROP.pick=function(u,p,ready){if(!u||!u.hero||this.st!=='pick')return;if(p){const q=clampZ({x:clamp(+p.x||0,0,WORLD),y:clamp(+p.y||0,0,WORLD)});this.picks.set(u.id,q)}if(ready)this.ready.add(u.id)};
DROP.bcast=function(){if(this.st==='pick'){const m=[];if(MC.ts>1)for(const [id,p] of this.picks){const u=UMAP.get(id);if(u&&isHuman(u))m.push([id,Math.round(p.x),Math.round(p.y),u.team])}
    emit({t:'drop',st:'pick',T:+this.t.toFixed(2),tot:this.tot,m})}
  else if(this.st==='fall'){const f=this.fall;emit({t:'drop',st:'fall',F:f.F,el:+(this.now()-f.t0).toFixed(2),L:[...f.L].map(([id,q])=>[id,Math.round(q.x),Math.round(q.y),+q.d.toFixed(2)])})}
  else emit({t:'drop',st:'done'})};
DROP.toFall=function(){const taken=[],L=new Map(),heroes=units.filter(u=>u.hero&&!u.dead);
  // squads: the team's first player (else its lowest id) decides; teammates come down around that spot
  const lead=new Map();if(MC.ts>1)for(const u of heroes){const c=lead.get(u.team);if(!c||isHuman(u)&&!isHuman(c)||isHuman(u)===isHuman(c)&&u.id<c.id)lead.set(u.team,u)}
  const isLead=u=>MC.ts===1||lead.get(u.team)===u,put=(u,p)=>{const q=dropLandSpot(clampZ(p),taken);taken.push(q);u.x=u.tx=q.x;u.y=u.ty=q.y;u.dash=null;u.kb=null;u.leap=null;u._vx=u._vy=0;
    L.set(u.id,{x:q.x,y:q.y,d:isHuman(u)?rand(0,.25):rand(.1,1.3)})};
  // leaders (everyone in free-for-all) first, then each teammate around where its leader actually lands
  for(const u of heroes)if(isLead(u))put(u,this.picks.get(u.id)||dropRandomLand());
  for(const u of heroes){if(isLead(u))continue;let p=this.picks.get(u.id);if(!p){const l=L.get(lead.get(u.team).id),a=Math.random()*6.2832;p=l?{x:l.x+Math.cos(a)*rand(120,220),y:l.y+Math.sin(a)*rand(120,220)}:dropRandomLand()}put(u,p)}
  this.fall={t0:this.now(),F:this.F,L};this.st='fall';this.t=this.F+1.5;this.bc=0;
  const me=ME();if(me&&typeof cam!=='undefined'){cam.x=me.x-W/2/Z;cam.y=me.y-H/2/Z}};
DROP.skip=function(){if(this.st!=='pick'&&this.st!=='fall'&&this.st!=='wait')return;if(net.mode==='client'){this.st='off';this.fall=null;return}if(this.st==='pick')this.toFall();
  if(this.fall)for(const q of this.fall.L.values())q.d=-9;this.st='done';this.bcast()};
{const _nb=hostNewGame;hostNewGame=function(players,seed,cfg){const r=_nb.apply(this,arguments);try{if(typeof simMode!=='undefined'&&simMode)DROP.st='off';else DROP.start()}catch(e){DROP.st='off'}return r}}
{const _hu=hostUpdate;hostUpdate=function(dt){if(DROP.st!=='pick'&&DROP.st!=='fall')return _hu(dt);
  DROP.t-=dt;DROP.bc-=dt;
  if(DROP.st==='pick'){for(const u of units)if(u.hero&&!isHuman(u)&&u.dropAt!==undefined&&DROP.tot-DROP.t>=u.dropAt&&!DROP.picks.has(u.id)){const p=dropRandomLand();if(MC.ts===1)DROP.picks.set(u.id,clampZ(p))}
    const hum=units.filter(u=>u.hero&&isHuman(u)&&!u.dead);if(hum.length&&hum.every(u=>DROP.ready.has(u.id))&&DROP.t>1.2)DROP.t=1.2;
    if(DROP.t<=0){DROP.toFall();DROP.bc=0}}
  else if(DROP.t<=0){DROP.st='done';DROP.bc=0}
  if(DROP.bc<=0){DROP.bc=.6;DROP.bcast()}}}
{const _hd=hostOnData;hostOnData=function(cid,d){if(d&&(d.t==='land'||d.t==='dready')){const u=units.find(q=>q.ctrl===cid);if(u)DROP.pick(u,d.t==='land'?d:null,d.t==='dready'||!!d.r);return}
  if(d&&(DROP.st==='pick'||DROP.st==='fall')&&['k','u','dg','xs','buy','ob','pk','sw','l'].includes(d.t))return;return _hd(cid,d)}}
// --------------------------------------------------------------- client ---------------------------------------------------------------
{const _cs=clientStart2;clientStart2=function(d){DROP.st='wait';DROP.waitT=4;DROP.fall=null;DROP.mine=null;DROP.mates=[];return _cs.apply(this,arguments)}}
{const _ae=applyEvent;applyEvent=function(e){if(!e||e.t!=='drop')return _ae(e);if(net.mode!=='client')return;
  if(e.st==='pick'){DROP.st='pick';DROP.t=e.T;DROP.tot=e.tot||DROP.tot||e.T;const me=ME();DROP.mates=(e.m||[]).filter(q=>me&&q[3]===me.team&&q[0]!==myId)}
  else if(e.st==='fall'){const L=new Map();for(const q of e.L||[])L.set(q[0],{x:q[1],y:q[2],d:q[3]});const old=DROP.fall;
    if(!old||DROP.st!=='fall')DROP.fall={t0:DROP.now()-(e.el||0),F:e.F||DROP.F,L};else for(const [id,q] of L){const o=old.L.get(id);if(o){q.landed=o.landed}old.L.set(id,Object.assign(o||{},q))}
    DROP.st='fall'}
  else if(e.st==='done'){if(DROP.st!=='off'&&DROP.st!=='done'){if(DROP.fall)DROP.st='done';else DROP.st='off'}}}}
// the local player's choice
DROP.choose=function(p,ready){const me=ME();if(!me||(this.st!=='pick'))return;if(p){this.mine={x:p.x,y:p.y}}
  if(net.mode==='client'){if(p)netSend({t:'land',x:Math.round(p.x),y:Math.round(p.y),r:ready?1:0});else if(ready)netSend({t:'dready'})}else this.pick(me,p,ready);if(ready)this.readyMe=true};
DROP.randomVillage=function(){const V=WD.villages.filter(v=>Math.hypot(v.x-zone.x,v.y-zone.y)<zone.r-300);if(!V.length)return{x:zone.x,y:zone.y};const v=V[Math.floor(Math.random()*V.length)];return{x:v.x+rand(-120,120),y:v.y+rand(-120,120)}};
// heroes in the sky are not drawn (3D, 2D, minimap, bars)
{const _uv=unitVisibleTo;unitVisibleTo=function(u,me,L){if(u&&u.hero&&DROP.st!=='off'&&DROP.st!=='done'&&DROP.hideId(u.id))return false;if(u&&u.hero&&DROP.fall&&DROP.st==='done'&&DROP.hideId(u.id))return false;return _uv(u,me,L)}}
// no game input while choosing / falling
{const busy=()=>DROP.st==='pick'||DROP.st==='wait'||DROP.st==='fall';
  if(typeof pressSkill==='function'){const _ps=pressSkill;pressSkill=function(){if(busy())return;return _ps.apply(this,arguments)}}
  if(typeof usePotion==='function'){const _up=usePotion;usePotion=function(){if(busy())return false;return _up.apply(this,arguments)}}
  if(typeof CUR!=='undefined'){for(const k of['dodge','special']){const f=CUR[k];if(typeof f==='function')CUR[k]=function(){if(busy())return;return f.apply(this,arguments)}}}}
addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT')return;if(state==='play'&&(DROP.st==='pick'||DROP.st==='wait'||DROP.st==='fall')&&e.code!=='Escape'){if(DROP.st!=='fall'&&(e.code==='Enter'||e.code==='Space')&&DROP.st==='pick'){DROP.choose(DROP.mine,true)}e.stopImmediatePropagation();e.preventDefault()}},true);
setTimeout(()=>{window.__game=window.__game||{};window.__game.skipDrop=()=>DROP.skip();window.__game.drop=DROP},0);   // d.js (later in the script) builds window.__game
// ---------------------------------------------------------------- map overlay ----------------------------------------------------------------
DROP.ui=function(){if(this.el)return;const c=document.createElement('canvas');c.id='arenaDropMap';c.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:45;display:none;touch-action:none;cursor:crosshair';document.body.appendChild(c);this.el=c;this.btn=[];
  const at=e=>{const r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
  c.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(this.st!=='pick')return;const p=at(e);
    for(const b of this.btn)if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){if(typeof AU!=='undefined')AU.play('click');b.f();return}
    const M=this.map;if(M&&p.x>=M.x&&p.x<=M.x+M.s&&p.y>=M.y&&p.y<=M.y+M.s){const w={x:(p.x-M.x)/M.s*WORLD,y:(p.y-M.y)/M.s*WORLD},dx=w.x-zone.x,dy=w.y-zone.y,d=Math.hypot(dx,dy),m=zone.r-160;
      this.choose(d>m?{x:zone.x+dx/d*m,y:zone.y+dy/d*m}:w,false);if(typeof AU!=='undefined')AU.play('click')}});
  c.addEventListener('pointermove',e=>{this.hover=at(e)});c.addEventListener('pointerleave',()=>{this.hover=null});
  for(const k of['pointerup','touchstart','wheel','contextmenu'])c.addEventListener(k,e=>{e.stopPropagation();if(k==='contextmenu')e.preventDefault()});
  const loop=()=>{requestAnimationFrame(loop);const on=state==='play'&&(this.st==='pick'||this.st==='wait');if(on!==this.shown){this.shown=on;c.style.display=on?'block':'none'}
    if(net.mode==='client'&&this.st==='wait'){this.waitT-=1/60;if(this.waitT<=0)this.st='off'}
    if(on)try{this.draw()}catch(err){if(!this.drawErr){this.drawErr=1;console.warn('drop map',err)}}};requestAnimationFrame(loop)};
DROP.regions=function(){if(this.regWD===WD&&this.reg)return this.reg;this.regWD=WD;const acc={};if(typeof REG==='undefined'||!REG.at)return this.reg=[];
  const n=44;for(let i=0;i<n;i++)for(let j=0;j<n;j++){const x=(i+.5)/n*WORLD,y=(j+.5)/n*WORLD;if(!walkable(x,y,0)||Math.hypot(x-ARENA.x,y-ARENA.y)>ARENA.r)continue;const r=REG.at(x,y);if(r<0)continue;const a=acc[r]||(acc[r]={x:0,y:0,n:0});a.x+=x;a.y+=y;a.n++}
  return this.reg=Object.keys(acc).map(r=>({r:+r,x:acc[r].x/acc[r].n,y:acc[r].y/acc[r].n,n:acc[r].n})).filter(q=>q.n>8)};
DROP.draw=function(){const c=this.el,dpr=Math.min(2,window.devicePixelRatio||1),w=innerWidth,h=innerHeight;if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
  const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);const T=performance.now()/1000;
  const bg=x.createRadialGradient(w*.4,h*.45,0,w*.4,h*.45,Math.max(w,h)*.8);bg.addColorStop(0,'#141c2cf4');bg.addColorStop(1,'#04060bfa');x.fillStyle=bg;x.fillRect(0,0,w,h);
  const sl=(typeof SAFE!=='undefined'?SAFE.l:0)+10,sr=(typeof SAFE!=='undefined'?SAFE.r:0)+10,P=clamp(w*.3,190,330),S=Math.max(120,Math.min(h-24,w-P-sl-sr-24)),mx=sl+Math.max(0,(w-P-sl-sr-12-S)/2),my=(h-S)/2;
  this.map={x:mx,y:my,s:S};const k=S/WORLD,X=v=>mx+v*k,Y=v=>my+v*k;
  // the map, darkened outside the storm circle
  x.save();x.shadowColor='#000';x.shadowBlur=24;x.fillStyle='#000';x.fillRect(mx-4,my-4,S+8,S+8);x.restore();
  if(typeof MINI!=='undefined'&&MINI)x.drawImage(MINI,mx,my,S,S);x.save();x.beginPath();x.rect(mx,my,S,S);x.arc(X(zone.x),Y(zone.y),zone.r*k,0,6.2832,true);x.fillStyle='#030409b8';x.fill('evenodd');x.restore();
  x.strokeStyle='#c9a0ff';x.lineWidth=2;x.beginPath();x.arc(X(zone.x),Y(zone.y),zone.r*k,0,6.2832);x.stroke();
  x.strokeStyle='#d6b45e';x.lineWidth=1.5;x.strokeRect(mx-1.5,my-1.5,S+3,S+3);
  const lab=(t,px,py,sz,col,bold)=>{x.font=(bold?'700 ':'500 ')+sz+'px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=3;x.strokeStyle='#000c';x.strokeText(t,px,py);x.fillStyle=col;x.fillText(t,px,py)};
  const fs=clamp(S/62,9,13);
  // lands
  if(typeof REG!=='undefined')for(const g of this.regions())lab((REG.IC[g.r]||'')+' '+REG.N[g.r],X(g.x),Y(g.y),fs+3,'#ffffff9a',true);
  // landmarks
  const icon=(t,px,py,sz)=>{x.font=sz+'px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(t,px,py)};
  if(WD.castle)icon('🏰',X(WD.castle.cx),Y(WD.castle.cy),fs+4);if(WD.fort&&WD.fort.castle)icon('❄️',X(WD.fort.castle.x),Y(WD.fort.castle.y),fs+3);
  for(const s of WD.shrines||[])icon('✨',X(s.x),Y(s.y),fs);
  for(const n of WD.npcs||[])icon('🛒',X(n.x)+fs*.9,Y(n.y)-fs*.2,fs);
  for(const v of WD.villages){const px=X(v.x),py=Y(v.y);x.fillStyle='#ffd35a';x.beginPath();x.arc(px,py,3.2,0,6.2832);x.fill();lab(v.name,px,py+fs,fs,'#ffe9b0',false)}
  // hover: which land
  if(this.hover&&this.hover.x>=mx&&this.hover.x<=mx+S&&this.hover.y>=my&&this.hover.y<=my+S&&typeof REG!=='undefined'){const wx=(this.hover.x-mx)/k,wy=(this.hover.y-my)/k,r=REG.at(wx,wy);
    x.strokeStyle='#ffffff55';x.lineWidth=1;x.beginPath();x.arc(this.hover.x,this.hover.y,12,0,6.2832);x.stroke();if(r>=0)lab(REG.IC[r]+' '+REG.N[r],this.hover.x,this.hover.y-20,fs+1,'#fff',true)}
  // pins: teammates, then me
  const pin=(px,py,col,txt)=>{const b=Math.sin(T*4)*2;x.save();x.translate(px,py);x.strokeStyle=col;x.lineWidth=2;for(let i=0;i<2;i++){const q=((T*.9+i*.5)%1);x.globalAlpha=1-q;x.beginPath();x.arc(0,0,6+q*22,0,6.2832);x.stroke()}x.globalAlpha=1;
    x.fillStyle=col;x.beginPath();x.moveTo(0,-2+b);x.bezierCurveTo(-9,-14+b,-9,-26+b,0,-26+b);x.bezierCurveTo(9,-26+b,9,-14+b,0,-2+b);x.fill();x.fillStyle='#000a';x.beginPath();x.arc(0,-18+b,3.4,0,6.2832);x.fill();x.restore();if(txt)lab(txt,px,py-36,fs,col,true)};
  const me=ME(),mates=net.mode==='client'?this.mates:MC.ts>1&&me?[...this.picks].filter(([id])=>{const u=UMAP.get(id);return id!==myId&&u&&isHuman(u)&&u.team===me.team}).map(([id,p])=>[id,p.x,p.y]):[];
  for(const q of mates){const u=UMAP.get(q[0]);pin(X(q[1]),Y(q[2]),'#6fb6ff',u?u.name:'')}
  if(this.mine)pin(X(this.mine.x),Y(this.mine.y),'#ffd35a','จุดของคุณ');
  // side panel
  const px=w-P-sr,pw=P;let y=Math.max(14,(h-Math.min(h-20,330))/2);
  lab('🪂 เลือกจุดลงจากฟ้า',px+pw/2,y+12,clamp(pw/12,15,22),'#ffe9a8',true);y+=34;
  const tips=['แตะบนแผนที่ (ในวงพายุ) เพื่อเลือกจุดลง','หมู่บ้านมีอาวุธในบ้าน กล่องสมบัติ และพ่อค้า 🛒','ไม่เลือก = สุ่มให้'];
  for(const t of tips){lab(t,px+pw/2,y,clamp(pw/24,10,12.5),'#cbbf9f',false);y+=18}y+=6;
  if(this.st==='wait'){lab('กำลังรอโฮสต์…',px+pw/2,y+30,16,'#fff',true);return}
  // countdown ring
  const R=clamp(pw/7,22,36),cx=px+pw/2,cy=y+R+4,fr=clamp(this.t/Math.max(1,this.tot),0,1);x.lineWidth=5;x.strokeStyle='#ffffff22';x.beginPath();x.arc(cx,cy,R,0,6.2832);x.stroke();
  x.strokeStyle='#ffd35a';x.beginPath();x.arc(cx,cy,R,-Math.PI/2,-Math.PI/2+6.2832*fr);x.stroke();lab(String(Math.max(0,Math.ceil(this.t))),cx,cy+1,R*.9,'#fff',true);y+=R*2+18;
  if(this.mine&&typeof REG!=='undefined'){const r=REG.at(this.mine.x,this.mine.y);let near=null,bd=1e9;for(const v of WD.villages){const d=Math.hypot(v.x-this.mine.x,v.y-this.mine.y);if(d<bd){bd=d;near=v}}
    lab((r>=0?REG.IC[r]+' '+REG.N[r]:'')+(near&&bd<near.r+250?' · '+near.name:''),cx,y,clamp(pw/22,11,13.5),'#ffe9b0',true);y+=22}
  // buttons
  const bw=Math.min(pw-20,220),bh=clamp(h/12,32,42);this.btn=[];
  const btn=(t,f,hot)=>{const bx=cx-bw/2;x.fillStyle=hot?'#6b5a1ef0':'#1a2230f0';x.strokeStyle=hot?'#e2c06a':'#7d8aa0';x.lineWidth=1.5;x.beginPath();x.roundRect?x.roundRect(bx,y,bw,bh,bh/2):x.rect(bx,y,bw,bh);x.fill();x.stroke();
    lab(t,cx,y+bh/2+1,clamp(bh*.42,13,16),hot?'#fff3cf':'#dfe6f0',true);this.btn.push({x:bx,y,w:bw,h:bh,f});y+=bh+10};
  btn('🎲 สุ่มหมู่บ้าน',()=>this.choose(this.randomVillage(),false),false);
  btn(this.readyMe?'✔ พร้อมแล้ว':'✔ พร้อม · ลงเลย',()=>this.choose(this.mine,true),!this.readyMe)};
DROP.ui();
{const _st=DROP.start;DROP.start=function(){this.readyMe=false;return _st.call(this)}}
{const _cs2=clientStart2;clientStart2=function(d){DROP.readyMe=false;return _cs2.apply(this,arguments)}}
// ---------------------------------------------------------------- 3D: the fall ----------------------------------------------------------------
if(typeof R3!=='undefined'&&typeof THREE!=='undefined'){const R=R3;
  {const _fr=R.frame;R.frame=function(dt){this.camK=DROP.camK();return _fr.apply(this,arguments)}}
  {const _qa=R.qnAnim;R.qnAnim=function(o,u,Tm,dt,mv){const r=_qa.apply(this,arguments);try{if(u&&u.hero&&DROP.fall)dropFallBody(this,o,u,dt)}catch(e){}return r}}
  function dropFallBody(R,o,u,dt){const f=DROP.fall,q=f.L.get(u.id);if(!q)return;const k=(DROP.now()-f.t0-q.d)/f.F;if(k<0||!o.body)return;
    if(k<1){const hh=DROP.H0*(1-k)*(1-k);o.body.position.y+=hh;o.body.rotation.x+=.35*(1-k);
      const gy=o.gy||0,y=gy+hh+70;if(R.sp&&hh>60){R.sp(true,{x:u.x+rand(-12,12),y:y+rand(-10,30),z:u.y+rand(-12,12),vx:rand(-25,25),vy:rand(180,330),vz:rand(-25,25),l:rand(.35,.6),s:rand(40,62),s1:6,c:'#d6f0ff',c2:'#4a86ff',sp:0,dr:.6});
        if(Math.random()<.6)R.sp(true,{x:u.x+rand(-30,30),y:y+rand(-20,40),z:u.y+rand(-30,30),vy:rand(60,160),l:rand(.5,.9),s:rand(10,16),s1:0,c:'#ffffff',sp:1,dr:1})}
      if(!q.ring&&R.ring){q.ring=1;R.ring(q.x,q.y,30,90,'#9fd8ff',Math.max(.6,(1-k)*f.F))}}
    else if(!q.landed){q.landed=1;q.lt=DROP.now();const gy=o.gy||0;
      if(R.burstFX)R.burstFX(q.x,q.y,gy+12,'#d8c8a8',R.hi?26:14,260,{g:420,s:18});if(R.ring){R.ring(q.x,q.y,20,170,'#ffffff',.5);R.ring(q.x,q.y,40,240,'#9fd8ff',.7)}
      if(R.flare)R.flare(q.x,gy+60,q.y,260,'#cfe8ff',.25);if(u.id===myId){shakeA=Math.max(shakeA,11)}
      if(typeof AU!=='undefined'&&AU.playAt)try{AU.playAt('quake',q.x,q.y)}catch(e){}}
    if(q.lt){const s=(DROP.now()-q.lt)/.32;if(s<1){const a=Math.sin(s*Math.PI)*.22;o.body.scale.set(1+a*.6,1-a,1+a*.6)}else if(!q.sq){q.sq=1;o.body.scale.set(1,1,1)}}}
}
}
