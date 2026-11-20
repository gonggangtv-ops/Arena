/* Arena Royale's cached steel emblems and compact HUD trim. */
const ArenaHudIcons=(()=>{
  const weapons=new Map(),symbols=new Map();
  const tome='M3 5 Q7 4 12 7 Q17 4 21 5 L21 18 Q17 17 12 20 Q7 17 3 18 Z M12 7 V20 M5.5 8.5 Q8 8.5 10 10 M5.5 11.5 Q8 11.5 10 13 M15 11 L17 8.5 L19 11 L17 13.5 Z';
  const glyphs={
    health:['M12 20 4.8 12.7C-.5 7.4 6.7 1.9 12 7.4c5.3-5.5 12.5 0 7.2 5.3Z','#ffb9b6',true],
    mana:['M12 2.5 19 12 12 21.5 5 12Z M12 7 15.5 12 12 16.5 8.5 12Z','#a7f4ff',true],
    shield:['M12 2.5C9 5 6 6 3.8 6l1.1 7.7C5.6 17 8.2 19.5 12 21.5c3.8-2 6.4-4.5 7.1-7.8L20.2 6c-2.2 0-5.2-1-8.2-3.5Z M12 6.5v10.7 M8.3 11h7.4','#efcf8b'],
    attack:['M5 19 18.8 5.2 21 3l-1.1 6.1L9.7 17 M5.6 14.2l4.2 4.2 M3 21l2-2','#e3e1d7'],
    speed:['M10 4h6l-1.6 8.4 6.2 3V19H5.4V15l3.2-3.4Z M7 8H3 M6 11H2','#d8e0e5'],
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
  return{weapon,symbol};
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
    const w=clamp(right-left,230*s,440*s),h=17*s;
    const x=clamp(W/2-w/2-UI.b*.6,left,right-w),y=H-SAFE.b-h-5;
    const ratio=me.lvl>=MAXL?1:clamp(me.xp/needXp(me.lvl),0,1);
    const emblem=ArenaHudIcons.weapon(me.wk),cut=4*s;
    const title=me.wk?WEAPONS[me.wk].names[me.wt]:'มือเปล่า';
    const rank=me.wk?TIERS[me.wt].c:'#ddd2bb';
    ctx.save();ctx.beginPath();ctx.moveTo(x+cut,y);ctx.lineTo(x+w-cut,y);ctx.lineTo(x+w,y+cut);
    ctx.lineTo(x+w,y+h-cut);ctx.lineTo(x+w-cut,y+h);ctx.lineTo(x+cut,y+h);
    ctx.lineTo(x,y+h-cut);ctx.lineTo(x,y+cut);ctx.closePath();
    ctx.fillStyle='#14151c';ctx.fill();ctx.strokeStyle='#807051';ctx.lineWidth=1;ctx.stroke();

    const tx=x+8*s,trackY=y+h-3.5*s,trackW=w-16*s;
    ctx.fillStyle='#262631';ctx.fillRect(tx,trackY,trackW,2*s);
    ctx.fillStyle='#c6a36b';ctx.fillRect(tx,trackY,trackW*ratio,2*s);
    if(ratio>0){ctx.fillStyle='#f6daa2';ctx.fillRect(tx,trackY,trackW*ratio,.75*s)}
    ctx.textBaseline='middle';ctx.textAlign='left';ctx.font=`700 ${10*s}px system-ui,sans-serif`;
    ctx.fillStyle='#ead7ae';ctx.fillText(`Lv. ${me.lvl}`,tx,y+6.5*s);
    const iconSize=14*s,iconX=x+57*s;
    ctx.drawImage(emblem,iconX,y-.75*s,iconSize,iconSize);
    ctx.fillStyle=rank;ctx.fillText(title,iconX+iconSize+2*s,y+6.5*s,w-81*s);

    if(me.pts>0){
      ctx.font=`700 ${10.5*s}px system-ui,sans-serif`;
      const label=`แต้มสกิล +${me.pts}`,labelW=ctx.measureText(label).width+15*s,middle=x+w/2;
      rr(middle-labelW/2,y-17*s,labelW,14*s,3*s);ctx.fillStyle='#18221e';ctx.fill();
      ctx.strokeStyle='#668968';ctx.stroke();ctx.textAlign='center';ctx.fillStyle='#c4ebba';ctx.fillText(label,middle,y-10*s);
    }
    ctx.restore();return{x,y,w,h};
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
