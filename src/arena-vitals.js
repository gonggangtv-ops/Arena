/* Arena combat vitals: Canvas presentation only. The original interaction
 * geometry, perception rules and live actor values remain authoritative. */
window.installArenaVitals=function(){
  'use strict';
  if(window.ArenaVitals&&window.ArenaVitals.installed)return;
  const GOLD='#bda66f',STEEL='#647486',INK='#070b12';
  const PALETTES={
    steel:['#2a3442','#141c28','#080d15'],portrait:['#253246','#111b2b','#060a12'],
    health:['#fa7c7c','#b73046','#681528'],critical:['#ff9d87','#df3d4c','#9a1d31'],
    mana:['#b4ecff','#43aecb','#15526b'],shield:['#fff2bf','#dbb75a','#80612a'],
    self:['#b9f5dc','#4bb69a','#1a6258'],ally:['#acdfff','#498fc8','#1e4a7b'],
    enemy:['#ffada5','#d2505a','#7b2336'],mob:['#f6d09b','#bf8748','#714822'],
    boss:['#fff4c9','#d7aa55','#955328'],zombie:['#dcf4ad','#8bb150','#496b2e']
  };
  // Fixed palette strips are rasterized once, shared by every bar at every
  // position/scale. No gradient or actor cache grows while the camera moves.
  const paints=new Map();
  const state={frame:null,lastTarget:null,lastWorld:null,drawCounts:{frame:0,target:0,world:0}};
  function paint(key,x,y,w,h){
    if(!(w>0&&h>0))return;
    let image=paints.get(key);
    if(!image){
      const stops=PALETTES[key]||PALETTES.steel;
      image=document.createElement('canvas');image.width=8;image.height=64;
      const p=image.getContext('2d'),g=p.createLinearGradient(0,0,0,64);
      g.addColorStop(0,stops[0]);g.addColorStop(.43,stops[1]);g.addColorStop(1,stops[2]);
      p.fillStyle=g;p.fillRect(0,0,8,64);paints.set(key,image);
    }
    ctx.drawImage(image,0,0,8,64,x,y,w,h);
  }
  const bounded=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
  function values(u){
    const dead=!!u.dead,hpMax=Math.max(1,Number.isFinite(u.maxHp)?u.maxHp:1),mpMax=Math.max(1,Number.isFinite(u.maxMp)?u.maxMp:1);
    return{id:u.id,dead,hp:u.hp,maxHp:u.maxHp,mp:u.mp,maxMp:u.maxMp,shieldHp:u.shieldHp||0,
      hpRatio:dead?0:bounded(u.hp/hpMax),mpRatio:dead?0:bounded(u.mp/mpMax),
      shieldRatio:dead?0:bounded((u.shieldHp||0)/hpMax)};
  }
  function relation(u,me){return u===me?'self':u.hero?(allyOf(u,me)?'ally':'enemy'):u.boss?'boss':u.zombie?'zombie':'mob';}
  function cutRect(x,y,w,h,c){
    c=Math.min(c,w*.3,h*.4);ctx.beginPath();ctx.moveTo(x+c,y);ctx.lineTo(x+w-c,y);
    ctx.lineTo(x+w,y+c);ctx.lineTo(x+w,y+h-c);ctx.lineTo(x+w-c,y+h);
    ctx.lineTo(x+c,y+h);ctx.lineTo(x,y+h-c);ctx.lineTo(x,y+c);ctx.closePath();
  }
  function circle(x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);}
  function text(value,x,y,maxWidth,size,color,align){
    value=String(value);let f=size;ctx.textAlign=align||'left';ctx.textBaseline='middle';
    ctx.font=`600 ${f}px system-ui,sans-serif`;
    while(f>size*.76&&ctx.measureText(value).width>maxWidth){f-=.35;ctx.font=`600 ${f}px system-ui,sans-serif`;}
    ctx.lineJoin='round';ctx.lineWidth=Math.max(2,f*.24);ctx.strokeStyle='#02050bd9';ctx.strokeText(value,x,y,maxWidth);
    ctx.fillStyle=color;ctx.fillText(value,x,y,maxWidth);
  }
  function glyph(key,x,y,size,color){
    const api=window.ArenaHudIcons,image=api&&typeof api.symbol==='function'?api.symbol(key):null;
    if(image&&image.width>0&&image.height>0){ctx.drawImage(image,x-size/2,y-size/2,size,size);return;}
    ctx.save();ctx.translate(x,y);ctx.scale(size/16,size/16);ctx.strokeStyle=color||'#bdc9d8';ctx.lineWidth=1.5;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
    if(key==='shield'){ctx.moveTo(0,-6);ctx.lineTo(5,-4);ctx.lineTo(4,2);ctx.quadraticCurveTo(2,5,0,6);ctx.quadraticCurveTo(-2,5,-4,2);ctx.lineTo(-5,-4);ctx.closePath();}
    else if(key==='speed'){ctx.moveTo(-5,-4);ctx.lineTo(0,0);ctx.lineTo(-5,4);ctx.moveTo(1,-4);ctx.lineTo(6,0);ctx.lineTo(1,4);}
    else{ctx.moveTo(-5,5);ctx.lineTo(5,-5);ctx.lineTo(5,-1);ctx.moveTo(5,-5);ctx.lineTo(1,-5);ctx.moveTo(-5,1);ctx.lineTo(-1,5);}
    ctx.stroke();ctx.restore();
  }
  function art(wk,x,y,r){
    const api=window.ArenaHudIcons,image=api&&typeof api.weapon==='function'?api.weapon(wk||null):null;
    if(image&&image.width>0&&image.height>0){ctx.save();circle(x,y,r);ctx.clip();ctx.drawImage(image,x-r,y-r,r*2,r*2);ctx.restore();}
    else glyph('attack',x,y,r*1.3,'#e8d9b6');
  }
  function frameRail(x,y,w,h,f,key,shield,segments){
    ctx.fillStyle='#03060bcc';ctx.fillRect(x-1,y-1,w+2,h+2);paint('steel',x,y,w,h);
    paint(key,x,y,w*f,h);
    if(shield>0){
      // The amber buffer shares the same maximum-health scale. Its thin crown
      // remains visible when health is full, without pretending to be more HP.
      paint('shield',x,y,w*shield,Math.max(1.5,h*.17));
      const extra=Math.min(shield,1-f);if(extra>0){paint('shield',x+w*f,y,w*extra,h);}
    }
    ctx.strokeStyle='#7e879454';ctx.lineWidth=1;ctx.strokeRect(x-.5,y-.5,w+1,h+1);
    ctx.fillStyle='#ffffff25';ctx.fillRect(x,y,w*f,Math.max(1,h*.12));
    if(segments>3){ctx.fillStyle='#05080d66';for(let i=segments;i<w*f-1;i+=segments)ctx.fillRect(x+i,y,1,h);}
  }
  function diamond(x,y,r,fill,stroke){ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
  function badge(x,y,r,label,s){
    cutRect(x-r,y-r,r*2,r*2,3*s);ctx.fillStyle=INK;ctx.fill();ctx.strokeStyle=GOLD;ctx.lineWidth=1.15*s;ctx.stroke();
    text(label,x,y+.3*s,r*1.8,10*s,'#efe0bc','center');
  }
  drawFrame=function(me,s){
    const x=SAFE.l+6,y=5,w=clamp(W*.3,196*s,270*s),h=52*s;
    const pr=h*.42,cx=x+h/2,cy=y+h/2,v=values(me),tier=me.wk?TIERS[clamp(me.wt|0,0,4)].c:GOLD;
    ctx.save();ctx.globalAlpha=1;
    cutRect(x,y,w,h,7*s);ctx.fillStyle='#02050bd9';ctx.fill();ctx.save();ctx.clip();paint('steel',x,y,w,h);ctx.restore();
    ctx.strokeStyle='#7987978c';ctx.lineWidth=1.2*s;ctx.stroke();
    ctx.strokeStyle='#c8b38180';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+8*s,y+1.5*s);ctx.lineTo(x+w-9*s,y+1.5*s);ctx.stroke();
    circle(cx,cy,pr+2.7*s);ctx.fillStyle='#04070c';ctx.fill();ctx.strokeStyle=STEEL;ctx.lineWidth=2*s;ctx.stroke();
    ctx.save();circle(cx,cy,pr);ctx.clip();paint('portrait',cx-pr,cy-pr,pr*2,pr*2);art(me.wk,cx,cy,pr*.94);ctx.restore();
    circle(cx,cy,pr+.3*s);ctx.strokeStyle='#cfba85';ctx.lineWidth=1.2*s;ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,pr+2.9*s,-Math.PI*.93,-Math.PI*.15);ctx.strokeStyle=tier;ctx.lineWidth=1.7*s;ctx.stroke();
    if(me.fuseT>0){circle(cx,cy,pr+4*s);ctx.strokeStyle='#ffe0a1';ctx.lineWidth=2.3*s;ctx.stroke();}
    else if(me.wk&&FUSED[me.wk]){ctx.beginPath();ctx.arc(cx,cy,pr+4*s,-.8,3.9);ctx.strokeStyle=WEAPONS[me.wk].glow;ctx.lineWidth=1.7*s;ctx.stroke();}
    // Preserve the original swap circles and press timer exactly.
    if(UI.wswT>0)UI.wswT-=1/60;UI.wsw={x:cx,y:cy,r:pr};UI.wsw2=null;
    badge(cx+pr*.74,cy+pr*.74,9*s,me.lvl,s);
    let bx=cx+pr+10*s,bw=x+w-bx-12*s;
    if(me.wk2){
      const cr=Math.max(11,pr*.56),rx=x+w-cr-5*s,ry=cy,pressed=UI.wswT>0,rr=cr*(pressed?.88:1);
      UI.wsw2={x:rx,y:ry,r:cr};bw-=cr*2+10*s;
      circle(rx,ry,rr+1*s);ctx.fillStyle='#03070d';ctx.fill();ctx.strokeStyle=TIERS[clamp(me.wt2|0,0,4)].c;ctx.lineWidth=1.5*s;ctx.stroke();
      art(me.wk2,rx,ry,rr*.9);
      const ax=rx+cr*.74,ay=ry+cr*.72;ctx.fillStyle=INK;circle(ax,ay,5.3*s);ctx.fill();
      ctx.strokeStyle='#e9dcba';ctx.lineWidth=1.2*s;ctx.beginPath();ctx.moveTo(ax-3*s,ay-1.5*s);ctx.lineTo(ax+3*s,ay-1.5*s);ctx.lineTo(ax+1.6*s,ay-3*s);ctx.moveTo(ax+3*s,ay+1.5*s);ctx.lineTo(ax-3*s,ay+1.5*s);ctx.lineTo(ax-1.6*s,ay+3*s);ctx.stroke();
    }
    const hpY=y+8*s,hpH=12*s,mpY=y+23*s,mpH=8*s,critical=!v.dead&&v.hpRatio>0&&v.hpRatio<=.25;
    frameRail(bx,hpY,bw,hpH,v.hpRatio,critical?'critical':'health',v.shieldRatio,0);
    if(critical){ctx.strokeStyle='#ffb0a0';ctx.lineWidth=1.2*s;ctx.strokeRect(bx-1,hpY-1,bw+2,hpH+2);}
    const hpText=`${fmtN(Math.ceil(v.dead?0:me.hp))} / ${fmtN(me.maxHp)}`+(v.shieldRatio>0?` +${fmtN(Math.ceil(me.shieldHp))}`:'');
    text(hpText,bx+bw/2,hpY+hpH/2+.4*s,bw-7*s,Math.max(8.5,9.5*s),critical?'#fff1d6':'#fff4ee','center');
    frameRail(bx,mpY,bw,mpH,v.mpRatio,'mana',0,0);
    text(`${Math.floor(v.dead?0:me.mp)} / ${me.maxMp}`,bx+bw/2,mpY+mpH/2+.3*s,bw-6*s,Math.max(8.5,8.8*s),'#e5faff','center');
    const statY=y+43*s,cell=bw/3,nums=[fmtN(me.atkDmg),(+me.armorV).toFixed(1),Math.round(HB.spd*(1+me.spdB))],keys=['attack','shield','speed'];
    for(let i=0;i<3;i++){const sx=bx+i*cell;glyph(keys[i],sx+5*s,statY,10*s,i===0?'#e3c5a0':'#b7c9dc');text(nums[i],sx+13*s,statY,Math.max(10,cell-16*s),Math.max(8.2,8.7*s),'#cdd6e1','left');}
    if(me.aegis){diamond(cx-pr*.73,cy-pr*.73,4.6*s,'#d6b971','#fff2b9');}
    ctx.restore();
    state.drawCounts.frame++;state.frame=Object.assign(v,{x,y,w,h,critical,
      rail:{x:bx,y:hpY,width:bw,hpHeight:hpH,mpY,mpHeight:mpH},
      mainSwap:{x:cx,y:cy,r:pr},reserveSwap:UI.wsw2?Object.assign({},UI.wsw2):null});
    return{x,y,w,h};
  };
  drawTarget=function(me,s,fr){
    state.lastTarget=null;
    if(TGT.t<=0)return;const u=UMAP.get(TGT.id),L=listener()||me;
    if(!u||u===me||(!u.dead&&L&&!unitVisibleTo(u,me,L)))return;
    let w=clamp(W*.3,180*s,310*s),x=Math.max(W/2-w/2,fr.x+fr.w+12*s);
    const limit=UI.mute.x-30;if(x+w>limit)w=limit-x;if(w<120*s)return;
    const y=7,h=12*s,by=y+15*s,alpha=clamp(TGT.t/.5,0,1),v=values(u),rel=relation(u,me),key=rel==='ally'?'ally':u.boss?'boss':u.hero?'enemy':u.zombie?'zombie':'mob';
    ctx.save();ctx.globalAlpha=alpha;ctx.lineJoin='round';
    const name=u.name+(u.hero?`  Lv.${u.lvl}`:'');text(name,x+w/2,y+6*s,w-8*s,11*s,rel==='ally'?'#cbe7ff':u.boss?'#f0d6a4':'#eec2c1','center');
    const edge=h*.76;ctx.beginPath();ctx.moveTo(x-edge,by+h/2);ctx.lineTo(x,by-3*s);ctx.lineTo(x+w,by-3*s);ctx.lineTo(x+w+edge,by+h/2);ctx.lineTo(x+w,by+h+3*s);ctx.lineTo(x,by+h+3*s);ctx.closePath();ctx.fillStyle='#05090fe8';ctx.fill();ctx.strokeStyle=u.boss?GOLD:'#8993a28c';ctx.lineWidth=1.1*s;ctx.stroke();
    frameRail(x,by,w,h,v.hpRatio,key,v.shieldRatio,0);
    const label=v.dead?'กำจัดแล้ว':`${fmtN(Math.ceil(u.hp))} / ${fmtN(u.maxHp)} (${Math.round(v.hpRatio*100)}%)`;
    text(label,x+w/2,by+h/2+.35*s,w-7*s,9.2*s,'#fff4e8','center');
    diamond(x-edge*.95,by+h/2,2.3*s,rel==='ally'?'#8dcaf0':u.boss?'#ead09a':'#d98287','#ffffff40');
    diamond(x+w+edge*.95,by+h/2,2.3*s,rel==='ally'?'#8dcaf0':u.boss?'#ead09a':'#d98287','#ffffff40');
    ctx.restore();state.drawCounts.target++;state.lastTarget=Object.assign(v,{x,y:by,w,h,relation:rel,name:u.name});
  };
  drawBars=function(px,py,u,me,sc){
    // The 2D/3D callers own visibility and death admission, exactly as before.
    state.lastWorld=null;
    const hero=!!u.hero,w=(hero?76:u.boss?130:u.r>33?72:48)*sc,h=(hero?8:u.boss?7:6)*sc,x=px-w/2,y=py,v=values(u),rel=relation(u,me),key=rel;
    ctx.save();ctx.globalAlpha=1;
    cutRect(x-2*sc,y-2*sc,w+4*sc,h+(hero?5*sc:0)+4*sc,2*sc);ctx.fillStyle='#03070cde';ctx.fill();ctx.strokeStyle=u.boss?'#aa8b51':'#6877858c';ctx.lineWidth=Math.max(.7,sc);ctx.stroke();
    frameRail(x,y,w,h,v.hpRatio,key,v.shieldRatio,hero?250/Math.max(1,u.maxHp)*w:0);
    if(hero){
      paint('portrait',x,y+h+sc,w,3*sc);paint('mana',x,y+h+sc,w*v.mpRatio,3*sc);
      const tier=u.wk?TIERS[clamp(u.wt|0,0,4)].c:GOLD;ctx.fillStyle=tier;ctx.fillRect(x,y-2*sc,Math.min(15*sc,w*.23),Math.max(1,sc));
      badge(x-10*sc,y+h*.67,8.3*sc,u.lvl,sc);
      const name=String(u.name||''),size=10.5*sc;ctx.font=`600 ${size}px system-ui,sans-serif`;
      const nameW=Math.min(150*sc,ctx.measureText(name).width),icon=11.5*sc,total=nameW+icon+3*sc;
      art(u.wk,px-total/2+icon/2,y-10.5*sc,icon/2);
      text(name,px-total/2+icon+3*sc,y-9.7*sc,nameW,size,rel==='self'?'#f4e6c6':rel==='ally'?'#cce8ff':'#f4c6cc','left');
      if(u.aegis){diamond(x+w+9*sc,y+h*.6,5.5*sc,'#b99c5b','#f7e2a6');glyph('shield',x+w+9*sc,y+h*.6,7*sc,'#fff3c9');}
    }else if(u.r>33||u.boss){
      text(u.name,px,y-8*sc,Math.max(w+40*sc,120*sc),u.boss?11*sc:10*sc,u.boss?'#f3d9ab':'#e1c4a4','center');
      if(u.boss){diamond(x-5*sc,y+h/2,3.3*sc,'#b18e4d','#eed39a');diamond(x+w+5*sc,y+h/2,3.3*sc,'#b18e4d','#eed39a');}
    }
    ctx.restore();state.drawCounts.world++;state.lastWorld=Object.assign(v,{x,y,w,h,relation:rel});
  };
  window.ArenaVitals={installed:true,snapshot:()=>({
    frame:state.frame?Object.assign({},state.frame,{rail:Object.assign({},state.frame.rail),mainSwap:Object.assign({},state.frame.mainSwap),reserveSwap:state.frame.reserveSwap?Object.assign({},state.frame.reserveSwap):null}):null,
    lastTarget:state.lastTarget?Object.assign({},state.lastTarget):null,lastWorld:state.lastWorld?Object.assign({},state.lastWorld):null,
    paintCount:paints.size,paintCapacity:Object.keys(PALETTES).length,drawCounts:Object.assign({},state.drawCounts)
  })};
};
