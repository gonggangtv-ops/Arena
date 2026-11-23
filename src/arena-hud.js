/* Arena Royale's cached steel emblems and compact HUD trim. */
const ARENA_HUD_FONT='"Noto Sans Thai",system-ui,sans-serif';
const arenaStatuses=[
  ['โล่',true,'shield',u=>u.shieldHp>0&&u.shieldT],
  ['เร่งวิ่ง',true,'speed',u=>Math.max(u.spdPT||0,u.buffT||0)],
  ['ตีเร็ว',true,'quickBlade',u=>u.asT],
  ['บ้าคลั่ง',true,'rage',u=>u.rageT],
  ['ฟื้นเลือด',true,'health',u=>u.hotT],
  ['ฟื้นมานา',true,'mana',u=>u.motT],
  ['ล่องหน',true,'stealth',u=>u.invisT],
  ['ดูดเลือด',true,'leech',u=>u.lsT],
  ['เดือด',true,'fury',u=>u.furyT,u=>u.fury],
  ['ตีครั้งถัดไปแรงขึ้น',true,'critReady',u=>(u.critNext||u.bsReady)?Infinity:0],
  ['โล่อมตะ',true,'aegisRune',u=>u.aegis?Infinity:0],
  ['หลบความเสียหาย',true,'evasion',u=>u.rollT],
  ['ขุนพลคุ้มกัน',true,'warden',u=>u.wlord&&!u.wlord.dead&&SUMMONER.SO(u.wk)?u.wlord.lifeT:0],
  ['มึน',false,'stunned',u=>u.stunT],
  ['ตรึง',false,'rooted',u=>u.rootT],
  ['เคลื่อนที่ช้า',false,'slow',u=>u.slowT],
  ['เผาไหม้',false,'scorched',u=>Math.max(u.burnT||0,u.ignT||0),u=>u.ign],
  ['เย็นจัด',false,'chilled',u=>u.chillT,u=>u.chill],
  ['ประจุไฟฟ้า',false,'staticCharge',u=>u.statT,u=>u.stat],
  ['เน่าเปื่อย',false,'rot',u=>u.rotT],
  ['ถูกตีตรา',false,'mark',u=>(u.smarkUntil||0)-gameT],
  ['เปียก',false,'wet',u=>u.wet?Infinity:0],
];
function arenaStatusSnapshot(u){
  const rows=[];
  arenaStatuses.forEach(([, , ,timer,stacks],i)=>{
    const t=timer(u);
    if(t>0)rows.push([i,t===Infinity?-1:Math.ceil(t*10)/10,stacks?.(u)||0]);
  });
  return rows;
}
function drawArenaStatus(u,x,y,w,s){
  const [data,received]=u.arenaStatus||[[],0];
  const remote=net.mode==='client',rows=remote?data:arenaStatusSnapshot(u),elapsed=remote?(performance.now()-received)/1000:0;
  const h=21*s,gap=3*s,lines=[[]];
  let used=0;
  ctx.save();ctx.font=`600 ${10.5*s}px ${ARENA_HUD_FONT}`;
  for(const [i,t,n] of rows){
    if(t!==-1&&t<=elapsed)continue;
    const [name,buff,key]=arenaStatuses[i];
    const label=name+(n>0?` ×${n}`:'')+(t===-1?'':` · ${Math.ceil(t-elapsed)} วิ`);
    const width=Math.min(w,ctx.measureText(label).width+31*s);
    if(used&&used+width+gap>w){lines.push([]);used=0}
    lines.at(-1).push({label,buff,key,width});used+=width+gap;
  }
  ctx.textAlign='left';ctx.textBaseline='middle';
  lines.forEach((line,i)=>{
    let left=x+(w-line.reduce((sum,chip)=>sum+chip.width+gap,-gap))/2;
    const top=y-(i+1)*(h+gap);
    for(const {label,buff,key,width} of line){
      const rim=buff?'#608982':'#9b625b',ink=buff?'#c8f3de':'#ffc3b3';
      rr(left,top,width,h,3*s);ctx.fillStyle=buff?'#14272bf5':'#311c23f5';ctx.fill();
      ctx.strokeStyle=rim;ctx.lineWidth=1;ctx.stroke();
      const emblem=ArenaHudIcons.status(key,buff);
      ctx.drawImage(emblem,left+2*s,top+1*s,19*s,19*s);
      ctx.fillStyle=ink;ctx.fillText(label,left+25*s,top+h*.52,width-30*s);left+=width+gap;
    }
  });
  ctx.restore();
  return used?lines.length*(h+gap):0;
}

function arenaPlatePath(x,y,w,h,s){
  const cut=Math.min(7*s,h*.32);
  ctx.beginPath();ctx.moveTo(x+cut,y);ctx.lineTo(x+w-cut,y);ctx.lineTo(x+w,y+cut);
  ctx.lineTo(x+w,y+h-cut);ctx.lineTo(x+w-cut,y+h);ctx.lineTo(x+cut,y+h);
  ctx.lineTo(x,y+h-cut);ctx.lineTo(x,y+cut);ctx.closePath();
}

function arenaPlate(x,y,w,h,s,tone='gold',accent){
  const [rim,top,bottom]=tone==='danger'?['#bb675f','#49272f','#1a111c']:
    tone==='muted'?['#897b91','#2d293b','#10111c']:['#b58b61','#33293b','#11101a'];
  ctx.save();
  arenaPlatePath(x,y,w,h,s);
  const metal=ctx.createLinearGradient(x,y,x+w*.13,y+h);
  metal.addColorStop(0,top);metal.addColorStop(.65,bottom);metal.addColorStop(1,'#0c0d15');
  ctx.fillStyle=metal;ctx.fill();
  ctx.strokeStyle='#07070e';ctx.lineWidth=3*s;ctx.stroke();
  ctx.strokeStyle=accent||rim;ctx.lineWidth=Math.max(1,s);ctx.stroke();
  const inset=3*s;
  arenaPlatePath(x+inset,y+inset,w-2*inset,h-2*inset,.68*s);
  ctx.strokeStyle=hexA(accent||rim,.36);ctx.lineWidth=.75*s;ctx.stroke();
  const edge=ctx.createLinearGradient(x+11*s,y,x+w-11*s,y);
  edge.addColorStop(0,'#fff0cd00');edge.addColorStop(.39,'#f8dba969');edge.addColorStop(1,'#fff0cd00');
  ctx.fillStyle=edge;ctx.fillRect(x+11*s,y,w-22*s,Math.max(1,s*.75));
  ctx.restore();
}

function arenaNotice(txt,x,y,maxWidth,s,{tone='gold',align='center',size=15,alpha=1}={}){
  const ink=tone==='danger'?'#ffd0bc':tone==='muted'?'#e0dfec':'#fae6c4';
  ctx.save();ctx.globalAlpha=alpha;
  const pad=18*s,height=(size+11)*s;
  ctx.font=`650 ${size*s}px ${ARENA_HUD_FONT}`;
  const width=Math.min(maxWidth,ctx.measureText(txt).width+2*pad);
  const left=x-(align==='right'?width:width/2);
  arenaPlate(left,y-height/2,width,height,s,tone);
  const r=2.3*s;
  ctx.fillStyle=tone==='danger'?'#e49082':tone==='muted'?'#ac9cb8':'#e6bc84';
  for(const p of [left+8*s,left+width-8*s]){
    ctx.beginPath();ctx.moveTo(p,y-r);ctx.lineTo(p+r,y);ctx.lineTo(p,y+r);ctx.lineTo(p-r,y);ctx.closePath();ctx.fill();
  }
  ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(txt,left+width/2,y,Math.max(1,width-2*pad));ctx.restore();
}

function drawArenaPickup(me,s,pr,box,item){
  const weapon=item&&WEAPONS[item.wk],tint=box?'#dcb985':TIERS[item.tier].c;
  const rune=item&&!me.wk2?wvIcons(itWV(item)):'';
  const label=box?'เปิดกล่อง':(me.wk2?'รับ ':'เก็บ ')+weapon.names[item.tier]+(me.wk2?' · แทนช่องสำรอง':'')+(rune?' '+rune:'');
  ctx.save();ctx.font=`650 ${13*s}px ${ARENA_HUD_FONT}`;
  const w=Math.min(W-SAFE.l-SAFE.r-16,ctx.measureText(label).width+58*s),h=33*s;
  const x=clamp(pr.x+pr.w/2-w/2,SAFE.l+8,W-SAFE.r-w-8);
  const y=pr.y-h-10*s-(pr.statusHeight||0)-(me.pts>0?16*s:0);
  arenaPlate(x,y,w,h,s,'gold',tint);
  const image=box?ArenaHudIcons.symbol('chest'):ArenaHudIcons.weapon(item.wk);
  ctx.drawImage(image,x+8*s,y+3*s,h-6*s,h-6*s);
  ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle=press[4]>0?'#fff':'#fae9cf';
  ctx.fillText(label,x+40*s,y+h/2,w-49*s);
  ctx.restore();UI.swap={x,y,w,h};
}

function drawArenaFeed(s){
  const width=Math.min(258*s,Math.max(148*s,W/2-155*s-SAFE.r));
  feedList.forEach((f,i)=>arenaNotice(f.txt,W-SAFE.r-9,115+i*22*s,width,s,
    {align:'right',size:11,tone:f.hl?'gold':'muted',alpha:clamp(f.t,0,1)}));
}

const ArenaHudIcons=(()=>{
  const weapons=new Map(),symbols=new Map(),statuses=new Map();
  const tome='M3 5 Q7 4 12 7 Q17 4 21 5 L21 18 Q17 17 12 20 Q7 17 3 18 Z M12 7 V20 M5.5 8.5 Q8 8.5 10 10 M5.5 11.5 Q8 11.5 10 13 M15 11 L17 8.5 L19 11 L17 13.5 Z';
  const glyphs={
    chest:['M3 11V7l4-3h10l4 3v4m-18 0h18v8H3Zm7 0v4h4v-4M7 7v3m10-3v3','#f9d594'],
    health:['M12 20 4.8 12.7C-.5 7.4 6.7 1.9 12 7.4c5.3-5.5 12.5 0 7.2 5.3Z','#ffb9b6',true],
    mana:['M12 2.5 19 12 12 21.5 5 12Z M12 7 15.5 12 12 16.5 8.5 12Z','#a7f4ff',true],
    shield:['M12 2.5C9 5 6 6 3.8 6l1.1 7.7C5.6 17 8.2 19.5 12 21.5c3.8-2 6.4-4.5 7.1-7.8L20.2 6c-2.2 0-5.2-1-8.2-3.5Z M12 6.5v10.7 M8.3 11h7.4','#efcf8b'],
    attack:['M5 19 18.8 5.2 21 3l-1.1 6.1L9.7 17 M5.6 14.2l4.2 4.2 M3 21l2-2','#e3e1d7'],
    speed:['M10 4h6l-1.6 8.4 6.2 3V19H5.4V15l3.2-3.4Z M7 8H3 M6 11H2','#d8e0e5'],
    quickBlade:['M10 18 20 5l-1 6-7 8m-6-2 7 4m-4-2-2 3M3 9h7M4 13h4','#d7efff'],
    rage:['M4 4c1 4 3 5 5 5m11-5c-1 4-3 5-5 5M4 4l-1 8 4 6 5 3 5-3 4-6-1-8M6 13l3 1m6 0 3-1m-9 5 3-2 3 2','#ffb97e'],
    stealth:['M3 12c3-4 6-6 9-6s6 2 9 6c-3 4-6 6-9 6s-6-2-9-6ZM3 20 21 4M12 9a3 3 0 0 0-3 3','#d3b7f7'],
    leech:['M12 3C10 8 5 13 5 16a7 5 0 0 0 14 0c0-3-5-8-7-13Zm-3 13h6m-3-3v6','#ff9fac'],
    fury:['M4 16 17 3l3 1-3 4L7 19m2 2 10-11 2 1-4 7-5 4M3 13l4-5 3-3','#ffd381'],
    critReady:['M12 2l2 7 7 3-7 2-2 8-2-8-7-2 7-3Zm-7 4 3 2m9 9 3 3','#fff1b5'],
    aegisRune:['M12 2 4 6v7c0 4 5 7 8 9 3-2 8-5 8-9V6l-8-4Zm-4 7 4-3 4 3-4 7-4-7Z','#ffe3a6'],
    evasion:['M3 16c4 0 6-7 10-7 2 0 4 1 7 3m-6-7 7 7-7 7M3 11h4m-1 9h5','#a9f1e7'],
    warden:['M3 18V9l5 4 4-7 4 7 5-4v9H3Zm2 3h14M12 2v2','#f5d893'],
    stunned:['M12 2l1.3 3 3.5.5-2.5 2.3.6 3.5L12 9.5l-3 1.8.6-3.5-2.5-2.3 3.6-.5ZM3 12l1 2 2.5.4-1.8 1.6.4 2.4L3 17l-2 1m18-5 1 2 2 .5-1.5 1.4.5 2.1-2-1.3-2 1.3 1-2-2-1.5Z','#f8ce80'],
    rooted:['M12 3v11m0-6L7 5m5 7 6-5m-6 6L7 18l-4 1m9-6 4 6 5 2M7 18v4m9-3 1 3','#b7e49d'],
    slow:['M9 20c-5-2-6-8-2-11 3-2 7-.5 8 2 1 3-2 6-5 4-1-1-1-2 0-3m-5 7h13l3-4-2-3h-3','#d7b7a7'],
    scorched:['M12 3c1 6-2 7-2 10 4 0 4-4 4-5 5 4 6 7 4 11-2 3-10 4-12-1-2-5 2-8 3-9 0 5 3 3 3-6Z','#ffb17a'],
    chilled:['M12 2v20M4 7l16 10M4 17 20 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-.5L7.5 5m9 14-.5-4 4-.5M4 14l4 1-.5 4m9-14-.5 4 4 .5','#a8e9ff'],
    staticCharge:['M13 2 4 14h7l-1 8 10-12h-7l.5-8Z','#d7b1ff',true],
    rot:['M8 19v2h8v-2l2-2v-3a7 7 0 0 0-12-5c-3 3-2 8 2 10Zm0-5h1m6 0h1M12 17v1','#c6e299'],
    mark:['M12 2v5m0 10v5M2 12h5m10 0h5M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z','#ffb7ad'],
    wet:['M12 2c3 5 7 9 7 13a7 7 0 0 1-14 0c0-4 4-8 7-13Zm-4 13c0 2 1 3 3 3','#a9d7ff'],
    audio:['M3.2 9h4l4.5-4.2v14.4L7.2 15h-4Z M15.2 8.4a5 5 0 0 1 0 7.2 M17.8 5.8a8.7 8.7 0 0 1 0 12.4','#f0dfb8'],
    quiet:['M3.2 9h4l4.5-4.2v14.4L7.2 15h-4Z M15.2 8.4a5 5 0 0 1 0 7.2','#d9d4c7'],
    muted:['M3.2 9h4l4.5-4.2v14.4L7.2 15h-4Z M15.7 9.2l5.6 5.6m0-5.6-5.6 5.6','#b6b9c2']
  };
  function plate(size){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    return canvas;
  }
  function weapon(key){
    const wk=key&&Object.hasOwn(WEAPONS,key)?key:'fist';
    const portrait=window.MoonfallUI?.weapon?.(wk);
    if(portrait)return portrait;
    if(weapons.has(wk))return weapons.get(wk);
    const canvas=plate(144),paint=canvas.getContext('2d');
    const fusion=FUSED[wk],base=fusion?.base||wk;
    const tint=fusion?.glow||({fire:'#e89355',frost:'#8ad5f4',storm:'#b2a9f0',soul:'#b8b2ed'})[base]||'#cab084';
    const figure=base==='soul'?null:GI[({fMM:'dervish-swords',fMR:'thrown-spear'})[wk]||WI[base]||WI.fist];
    const size=figure?512:24;
    const path=new Path2D(figure||tome);
    paint.save();paint.translate(14,14);paint.scale(116/size,116/size);
    const metal=paint.createLinearGradient(0,0,size*.9,size);
    metal.addColorStop(0,'#fcf2d9');metal.addColorStop(.34,'#a9b7c9');metal.addColorStop(.48,'#fff7e4');
    metal.addColorStop(.65,'#798a9f');metal.addColorStop(1,tint);
    paint.lineJoin='round';paint.lineCap='round';
    paint.shadowColor=hexA(tint,.6);paint.shadowBlur=8;
    paint.strokeStyle='#121520';paint.lineWidth=size*.032;paint.stroke(path);
    paint.shadowBlur=0;paint.fillStyle=metal;paint.strokeStyle=metal;
    if(figure)paint.fill(path);else{paint.lineWidth=1.25;paint.stroke(path)}
    paint.restore();
    if(fusion){
      paint.fillStyle=tint;paint.strokeStyle='#161522';paint.lineWidth=2;
      for(const [x,y] of [[24,24],[120,120]]){
        paint.beginPath();paint.moveTo(x,y-7);paint.lineTo(x+5,y);paint.lineTo(x,y+7);paint.lineTo(x-5,y);paint.closePath();paint.fill();paint.stroke();
      }
    }
    weapons.set(wk,canvas);return canvas;
  }
  function symbol(key){
    if(!Object.hasOwn(glyphs,key))return null;
    if(symbols.has(key))return symbols.get(key);
    const [d,color,filled]=glyphs[key],canvas=plate(72),paint=canvas.getContext('2d');
    const path=new Path2D(d);
    paint.scale(3,3);paint.lineWidth=3.75;paint.lineCap='round';paint.lineJoin='round';
    paint.strokeStyle='#130f16';paint.stroke(path);
    paint.lineWidth=1.7;paint.strokeStyle=color;paint.fillStyle=color;
    if(filled)paint.fill(path,'evenodd');else paint.stroke(path);
    symbols.set(key,canvas);return canvas;
  }
  function status(key,buff){
    if(statuses.has(key))return statuses.get(key);
    const canvas=plate(72),paint=canvas.getContext('2d'),ink=glyphs[key][1];
    const rim=new Path2D('M16 3H56L69 16V56L56 69H16L3 56V16Z');
    const fill=paint.createLinearGradient(0,0,0,72);
    fill.addColorStop(0,buff?'#2b4951':'#553036');fill.addColorStop(1,buff?'#0e1b22':'#22131b');
    paint.fillStyle=fill;paint.fill(rim);paint.strokeStyle=hexA(ink,.74);paint.lineWidth=3;paint.stroke(rim);
    paint.fillStyle=hexA(ink,.7);paint.fillRect(20,3,32,2);
    paint.shadowColor=hexA(ink,.65);paint.shadowBlur=9;
    paint.drawImage(symbol(key),10,10,52,52);
    statuses.set(key,canvas);return canvas;
  }
  return{weapon,symbol,status};
})();
window.ArenaHudIcons=ArenaHudIcons;

function installArenaHud(){
  const originalMap=drawMinimap,originalHud=drawHUD;

  drawMinimap=function(me,s,my0){
    const bounds=originalMap(me,s,my0);
    const {x,y,w,h}=bounds;
    const left=x-3,top=y-3,right=x+w+3,bottom=y+h+3,corner=9*s;
    ctx.save();
    ctx.strokeStyle='#16151b';ctx.lineWidth=5;ctx.strokeRect(left,top,right-left,bottom-top);
    ctx.strokeStyle='#77644c';ctx.lineWidth=1.4;ctx.strokeRect(left,top,right-left,bottom-top);
    ctx.strokeStyle='#d4b77c';ctx.lineWidth=1.8;
    for(const [a,b,dx,dy] of [[left,top,1,1],[right,top,-1,1],[right,bottom,-1,-1],[left,bottom,1,-1]]){
      ctx.beginPath();ctx.moveTo(a,b+dy*corner);ctx.lineTo(a,b);ctx.lineTo(a+dx*corner,b);ctx.stroke();
    }
    ctx.restore();return bounds;
  };

  drawPanel=function(me,s){
    const left=SAFE.l+UI.b*3.4,right=W-SAFE.r-UI.b*4.6;
    const w=clamp(right-left,230*s,440*s),h=23*s;
    const x=clamp(W/2-w/2-UI.b*.6,left,right-w),y=H-SAFE.b-h-5;
    const ratio=me.lvl>=MAXL?1:clamp(me.xp/needXp(me.lvl),0,1);
    const emblem=ArenaHudIcons.weapon(me.wk);
    const title=me.wk?WEAPONS[me.wk].names[me.wt]:'มือเปล่า';
    const rank=me.wk?TIERS[me.wt].c:'#ddd2bb';
    ctx.save();arenaPlate(x,y,w,h,s);
    const tx=x+9*s,textY=y+9.7*s,trackY=y+h-5*s,trackW=w-18*s;
    ctx.fillStyle='#20202e';ctx.fillRect(tx,trackY,trackW,2*s);
    ctx.fillStyle='#c89a66';ctx.fillRect(tx,trackY,trackW*ratio,2*s);
    if(ratio>0){ctx.fillStyle='#f5d5a4';ctx.fillRect(tx,trackY,trackW*ratio,.75*s)}
    ctx.textBaseline='middle';ctx.textAlign='left';ctx.font=`700 ${10.5*s}px ${ARENA_HUD_FONT}`;
    ctx.fillStyle='#eed8aa';ctx.fillText(`Lv. ${me.lvl}`,tx,textY);
    ctx.fillStyle='#bba18072';ctx.fillRect(x+46*s,y+4*s,1,h-11*s);
    const iconX=x+52*s,iconSize=24*s;
    ctx.drawImage(emblem,iconX,textY-iconSize/2,iconSize,iconSize);
    ctx.font=`700 ${11.4*s}px ${ARENA_HUD_FONT}`;
    ctx.fillStyle=rank;ctx.fillText(title,iconX+27*s,textY,w-89*s);

    // Leave room for the dash control and its keyboard label.
    const dash=arenaDashAnchor(potionRail({x,w},s));
    const statusWidth=clamp(dash.x-dash.r-x-(H>420?64:8),88*s,w);
    const statusHeight=drawArenaStatus(me,x,y,statusWidth,s);
    if(me.pts>0){
      const skillY=y-statusHeight;
      ctx.font=`700 ${10.5*s}px system-ui,sans-serif`;
      const label=`แต้มสกิล +${me.pts}`,labelW=ctx.measureText(label).width+15*s,middle=x+w/2;
      rr(middle-labelW/2,skillY-17*s,labelW,14*s,3*s);ctx.fillStyle='#18221e';ctx.fill();
      ctx.strokeStyle='#668968';ctx.stroke();ctx.textAlign='center';ctx.fillStyle='#c4ebba';ctx.fillText(label,middle,skillY-10*s);
    }
    ctx.restore();return{x,y,w,h,statusHeight};
  };

  drawHUD=function(){
    originalHud();if(!ME())return;
    const {x,y}=UI.mute;
    ctx.save();ctx.beginPath();ctx.arc(x,y,18.75,0,Math.PI*2);
    const steel=ctx.createLinearGradient(x,y-18,x,y+18);
    steel.addColorStop(0,'#35333d');steel.addColorStop(1,'#12131a');
    ctx.fillStyle=steel;ctx.fill();ctx.lineWidth=1.35;
    ctx.strokeStyle=AU.mode===2?'#737680':'#ab8f61';ctx.stroke();
    const icon=['audio','quiet','muted'][AU.mode]||'muted';
    ctx.drawImage(ArenaHudIcons.symbol(icon),x-10,y-10,20,20);
    ctx.restore();
  };
}
