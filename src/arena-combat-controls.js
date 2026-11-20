/* Arena's combat hardware. Original UI coordinates, input, costs and timing own the rules. */
window.installArenaCombatControls=function(){
  'use strict';
  if((typeof MOON!=='undefined'&&MOON)||!window.MoonfallUI||document.body.classList.contains('arena-combat-hud'))return;
  document.body.classList.add('arena-combat-hud');
  const TAU=Math.PI*2,keys=['Q','E','R'],frames=new Map();
  const coarse=matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const circle=(paint,x,y,r)=>{paint.beginPath();paint.arc(x,y,Math.max(.1,r),0,TAU);};
  const facet=(paint,x,y,r)=>{paint.beginPath();for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?paint.lineTo(px,py):paint.moveTo(px,py);}paint.closePath();};
  function hardware(rim,dim){
    const key=String(rim)+'|'+!!dim;if(frames.has(key))return frames.get(key);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=192;
    const p=canvas.getContext('2d'),x=96,y=96,r=93;
    circle(p,x,y+2,r);p.fillStyle='#02060bd9';p.fill();
    const metal=p.createLinearGradient(0,0,192,192);metal.addColorStop(0,dim?'#89929b':'#f1dfb9');metal.addColorStop(.23,dim?'#4f5964':rim||'#b3bec9');metal.addColorStop(.48,'#272f38');metal.addColorStop(.72,dim?'#535b64':'#ac9370');metal.addColorStop(1,'#121a23');
    facet(p,x,y,r-2);p.fillStyle=metal;p.fill();
    for(let i=0;i<8;i++){
      const a=Math.PI/8+i*Math.PI/4,b=a+Math.PI/4;
      p.beginPath();p.moveTo(x+Math.cos(a)*(r-2),y+Math.sin(a)*(r-2));p.lineTo(x+Math.cos(b)*(r-2),y+Math.sin(b)*(r-2));p.lineTo(x+Math.cos(b)*(r-11),y+Math.sin(b)*(r-11));p.lineTo(x+Math.cos(a)*(r-11),y+Math.sin(a)*(r-11));p.closePath();
      p.fillStyle=Math.sin((a+b)/2)<0?'#fff0c82e':'#02070c66';p.fill();
    }
    facet(p,x,y,r-5);p.strokeStyle=dim?'#909aa34d':'#f9e9c28c';p.lineWidth=1.1;p.stroke();
    facet(p,x,y,r-10);p.fillStyle='#050b12';p.fill();p.strokeStyle='#000b';p.lineWidth=3;p.stroke();
    const face=p.createRadialGradient(x,y-23,4,x,y,r-11);face.addColorStop(0,'#263647');face.addColorStop(.65,'#101b29');face.addColorStop(1,'#050b13');facet(p,x,y,r-12);p.fillStyle=face;p.fill();
    for(let i=0;i<8;i++){
      const a=Math.PI/8+i*Math.PI/4,c=Math.cos(a),s=Math.sin(a);
      p.beginPath();p.moveTo(x+c*(r-6),y+s*(r-6));p.lineTo(x+c*(r-1),y+s*(r-1));p.strokeStyle=dim?'#adb5ba70':'#f7e1ac88';p.lineWidth=1.1;p.stroke();
    }
    p.strokeStyle=dim?'#aab4bf44':'#fff1cd99';p.lineWidth=1.7;p.beginPath();p.moveTo(x-Math.sin(Math.PI/8)*(r-2),y-Math.cos(Math.PI/8)*(r-2));p.lineTo(x+Math.sin(Math.PI/8)*(r-2),y-Math.cos(Math.PI/8)*(r-2));p.stroke();
    if(frames.size>=24)frames.delete(frames.keys().next().value);frames.set(key,canvas);return canvas;
  }
  btnBase=function(x,y,r,pressed,rim,tint,dim){
    const radius=r*(pressed?.94:1);ctx.save();ctx.drawImage(hardware(rim,dim),x-radius,y-radius,radius*2,radius*2);ctx.restore();
  };
  function face(B,pressed,art,alpha){
    const radius=B.r*(pressed?.94:1)*.895;
    ctx.save();facet(ctx,B.x,B.y,radius);ctx.clip();ctx.globalAlpha=alpha;
    if(art){const inset=Math.min(8,art.width*.055);ctx.drawImage(art,inset,inset,art.width-inset*2,art.height-inset*2,B.x-radius,B.y-radius,radius*2,radius*2);}
    const shade=ctx.createLinearGradient(B.x,B.y-radius,B.x,B.y+radius);shade.addColorStop(0,'#ffffff0c');shade.addColorStop(.4,'#00000000');shade.addColorStop(1,'#02060b73');ctx.globalAlpha=1;ctx.fillStyle=shade;ctx.fillRect(B.x-radius,B.y-radius,radius*2,radius*2);ctx.restore();
    return radius;
  }
  function text(value,x,y,size,color){ctx.font='600 '+size+'px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=Math.max(2,size*.16);ctx.strokeStyle='#030811ed';ctx.strokeText(String(value),x,y);ctx.fillStyle=color;ctx.fillText(String(value),x,y);}
  function keyBadge(value,x,y,size,gold){
    ctx.save();rr(x-size,y-size,size*2,size*2,Math.max(2,size*.23));ctx.fillStyle='#071019f5';ctx.fill();ctx.strokeStyle=gold?'#d8bb82':'#b4c0ca';ctx.lineWidth=1;ctx.stroke();text(value,x,y+.2,Math.max(9,size*1.27),gold?'#ffe5ae':'#e5edf4');ctx.restore();
  }
  function droplet(x,y,size,color){ctx.beginPath();ctx.moveTo(x,y-size*.62);ctx.bezierCurveTo(x-size*.75,y+size*.05,x-size*.6,y+size*.65,x,y+size*.65);ctx.bezierCurveTo(x+size*.6,y+size*.65,x+size*.75,y+size*.05,x,y-size*.62);ctx.fillStyle=color;ctx.fill();}
  function manaBadge(B,cost,low){
    const font=Math.max(8.5,B.r*.285);ctx.font='600 '+font+'px system-ui,sans-serif';
    const height=Math.max(11,B.r*.43),width=Math.max(B.r*.66,ctx.measureText(String(cost)).width+height*.75+4),x=B.x+B.r*.55,y=B.y+B.r*.63;
    rr(x-width/2,y-height/2,width,height,3);ctx.fillStyle=low?'#092741f5':'#07131ef5';ctx.fill();ctx.lineWidth=.8;ctx.strokeStyle=low?'#a1dafa':'#56829e';ctx.stroke();
    droplet(x-width/2+height*.39,y,height*.3,low?'#c8eeff':'#8dceef');text(cost,x+height*.2,y+.2,font,low?'#effaff':'#c9eafb');
  }
  function lock(x,y,r){
    const w=r*.42,h=r*.34;ctx.save();ctx.strokeStyle='#e3d8bd';ctx.lineWidth=Math.max(1.6,r*.07);ctx.beginPath();ctx.arc(x,y-h*.57,w*.35,Math.PI,TAU);ctx.stroke();
    rr(x-w/2,y-h*.48,w,h,Math.max(1,r*.05));ctx.fillStyle='#e3d8bd';ctx.fill();circle(ctx,x,y-h*.1,Math.max(1,r*.045));ctx.fillStyle='#15202a';ctx.fill();ctx.restore();
  }
  function learnBadge(B){
    ctx.save();const g=ctx.createLinearGradient(B.x,B.y-B.r,B.x,B.y+B.r);g.addColorStop(0,'#ecdda7');g.addColorStop(1,'#a48c4e');circle(ctx,B.x,B.y,B.r);ctx.fillStyle='#050c13';ctx.fill();ctx.lineWidth=1.4;ctx.strokeStyle='#e6d39d';ctx.stroke();circle(ctx,B.x,B.y,B.r-2);ctx.fillStyle=g;ctx.fill();
    const arm=B.r*.43;ctx.strokeStyle='#202518';ctx.lineWidth=Math.max(2,B.r*.2);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(B.x-arm,B.y);ctx.lineTo(B.x+arm,B.y);ctx.moveTo(B.x,B.y-arm);ctx.lineTo(B.x,B.y+arm);ctx.stroke();ctx.restore();
  }
  drawSkillBtn=function(B,i,me){
    const info=MoonfallUI.state(me,i),sk=info.skill,level=me.skl[i]||0,pressed=press[i+1]>0,learnable=canLearn(me,i),dim=info.kind==='locked'||info.kind==='unarmed',ultimate=i===2;
    const rim=dim?(learnable?'#d4be87':'#697887'):ultimate?'#e0bd7e':'#bbc8d4';
    ctx.save();btnBase(B.x,B.y,B.r,pressed,rim,null,dim&&!learnable);
    const radius=face(B,pressed,sk?MoonfallUI.icon(me.wk,i):null,dim?.58:1);
    if(dim){facet(ctx,B.x,B.y,radius);ctx.fillStyle='#030a124b';ctx.fill();if(!learnable)lock(B.x,B.y-B.r*.1,B.r);}
    if(info.kind==='cooldown'){
      const ratio=clamp(info.cooldown/Math.max(.01,info.maxCooldown),0,1),end=-Math.PI/2+TAU*ratio;
      ctx.save();facet(ctx,B.x,B.y,radius);ctx.clip();ctx.beginPath();ctx.moveTo(B.x,B.y);ctx.arc(B.x,B.y,radius,-Math.PI/2,end);ctx.closePath();ctx.fillStyle='#020710bc';ctx.fill();ctx.restore();
      ctx.beginPath();ctx.arc(B.x,B.y,B.r*.965,-Math.PI/2,end);ctx.strokeStyle=ultimate?'#e3c28a':'#b9d9e8';ctx.lineWidth=Math.max(1.5,B.r*.055);ctx.stroke();
      text(info.cooldown<1?info.cooldown.toFixed(1):Math.ceil(info.cooldown),B.x,B.y-B.r*.05,Math.max(13,B.r*.64),'#f6f4e9');
    }else if(info.kind==='mana'){
      facet(ctx,B.x,B.y,radius);ctx.fillStyle='#072c5b66';ctx.fill();
      const w=B.r*1.42,h=Math.max(12,B.r*.48);rr(B.x-w/2,B.y-h/2,w,h,3);ctx.fillStyle='#061c30e8';ctx.fill();text('MP ต่ำ',B.x,B.y,Math.max(9,B.r*.31),'#d4f2ff');
    }else if(dim&&!learnable){
      const label=sk?(ultimate?'Lv '+[6,11,16][Math.min(level,2)]:'ล็อก'):'อาวุธ';text(label,B.x,B.y+B.r*.31,Math.max(8,B.r*.28),'#c4c8cb');
    }
    keyBadge(keys[i],B.x-B.r*.64,B.y+B.r*.62,Math.max(6,B.r*.21),ultimate);
    if(level>0&&sk)manaBadge(B,info.cost,info.kind==='mana');
    const count=ultimate?3:4,pipW=B.r*.25,gap=B.r*.07,total=count*pipW+(count-1)*gap,pipH=Math.max(3,B.r*.12),pipY=B.y+B.r+3;
    for(let rank=0;rank<count;rank++){
      const x=B.x-total/2+rank*(pipW+gap);rr(x,pipY,pipW,pipH,1);ctx.fillStyle=rank<level?(ultimate?'#e6c58a':'#c5d4de'):'#101a24ed';ctx.fill();ctx.strokeStyle=rank<level?'#e9dcbb':'#63717d';ctx.lineWidth=.65;ctx.stroke();
    }
    if(learnable&&UI.learn[i])learnBadge(UI.learn[i]);
    ctx.restore();MoonfallUI.refreshHint?.(i);
  };
  drawBtnAtk=function(B,me){
    const pressed=press[0]>0||atkHeld,rim=me.wk&&me.wt>0?TIERS[me.wt].c:'#bfc8cb';
    ctx.save();btnBase(B.x,B.y,B.r,pressed,rim,null,false);
    const art=window.ArenaHudIcons?.weapon(me.wk||null)||wpIco(me);face(B,pressed,art,1);
    const width=B.r*1.13,height=Math.max(14,B.r*.37),y=B.y+B.r*.58;
    rr(B.x-width/2,y-height/2,width,height,3);ctx.fillStyle='#071019eb';ctx.fill();ctx.strokeStyle='#c9b78980';ctx.lineWidth=.7;ctx.stroke();text('โจมตี',B.x,y,Math.max(10,B.r*.27),'#efe3cb');
    if(!coarse)keyBadge('J',B.x-B.r*.64,B.y-B.r*.64,Math.max(7,B.r*.18),false);ctx.restore();
  };
  const E=CUR.el;if(E){
    E.pad.id='arenaCombatPad';E.coin.id='arenaGold';E.reg.id='arenaRegion';E.hint.id='arenaCombatHint';
    const dash=E.pad.children[1];dash.id='arenaDash';E.b3.id='arenaSpecial';
    for(const button of [dash,E.b3]){const caption=button.querySelector('span');if(caption)caption.classList.add('arena-pad-caption');}
    const counter=document.createElement('span');counter.className='arena-special-count';E.b3.firstChild.replaceWith(counter);
    const step=CUR.step;CUR.step=function(dt){
      const result=step.call(this,dt),me=ME();if(me&&state==='play'&&this.el){
        const special=this.el.b3,next=me.xcd>0?'cooldown':me.xs?'ready':'empty';if(special.dataset.state!==next)special.dataset.state=next;if(special.style.opacity!=='1')special.style.opacity='1';
        if(H<=W*1.05&&Math.min(W,H)<360&&UI.atk?.r){
          // The published DOM controls remain 56px + two 2px borders. On short
          // screens the canvas scales down, so contain this fixed-size group.
          let ceiling=Math.min(...UI.sk.map(button=>button.y-button.r));
          for(let i=0;i<3;i++)if(canLearn(me,i))ceiling=Math.min(ceiling,UI.learn[i].y-UI.learn[i].r);
          const left=Math.max(SAFE.l+8,Math.min(UI.atk.x-UI.atk.r*2.25,W-SAFE.r-148-8));
          const top=Math.max(SAFE.t+8,Math.min(UI.atk.y-UI.atk.r*4.55,ceiling-75-3));
          this.el.pad.style.left=left+'px';this.el.pad.style.top=top+'px';
        }
      }
      return result;
    };
  }
};
