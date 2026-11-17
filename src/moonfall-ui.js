/* Moonfall HUD artwork. Original costs, hit areas, cooldowns and rules remain.
 * All base/fusion/item art is required by the strict boot gate. */
window.installMoonfallUI=function(){
  'use strict';
  if(window.MoonfallUI)return;
  const original={icon:skIco,button:btnBase,skill:drawSkillBtn,frame:drawFrame,panel:panelBg,hud:drawHUD};
  const icons=new Map(),hotkeys=['Q','E','R'];
  const coarse=matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  let atlas=null,loadState='loading',loadError=null,hover=-1,lastHint=0;
  const hint=document.createElement('aside');hint.id='moonfallSkillHint';hint.hidden=true;hint.setAttribute('role','tooltip');document.body.appendChild(hint);
  const instructions=document.createElement('p');instructions.id='moonfallHUDHelp';instructions.className='moonfall-sr-only';
  instructions.textContent='เดินด้วย W A S D หรือจอยซ้าย สกิล Q E R หรือ 1 2 3 กดปุ่ม + บนจอเพื่ออัปสกิล Shift เพื่อหลบ มือถือกดค้างแล้วลากเพื่อเล็ง ปล่อยเพื่อร่าย';
  document.body.appendChild(instructions);cv.setAttribute('aria-describedby',instructions.id);
  function skillState(me,i){
    const skill=me?.wk&&SK[me.wk]?.[i],level=me?.skl?.[i]||0,index=Math.max(0,level-1);
    if(!skill)return{kind:'unarmed',label:'ต้องมีอาวุธ',skill:null,cost:0};
    const cost=skill.mp[index],cooldown=Math.max(0,me.cd[i]);
    const kind=!level?'locked':cooldown>0?'cooldown':me.mp<cost?'mana':'ready';
    return{kind,label:{locked:canLearn(me,i)?'อัปสกิลได้':'ยังไม่ปลดล็อก',cooldown:'กำลังฟื้นฟู',mana:'มานาไม่พอ',ready:'พร้อมใช้'}[kind],skill,cost,cooldown,level,maxCooldown:skill.cd[index]*cdMul(me)};
  }
  function updateHint(force=false){
    if(coarse||hover<0||state!=='play'||!ME()||ME().dead){hint.hidden=true;return;}
    const now=performance.now();if(!force&&now-lastHint<200)return;lastHint=now;
    const i=hover,info=skillState(ME(),i),B=UI.sk[i];
    hint.replaceChildren();const title=document.createElement('strong');title.textContent=hotkeys[i]+' / '+(i+1)+' · '+(info.skill?.n||'ช่องสกิล');hint.appendChild(title);
    const detail=document.createElement('span');detail.textContent=info.label+(info.skill?' · MP '+info.cost+' · '+(info.kind==='cooldown'?Math.ceil(info.cooldown):Number(info.maxCooldown.toFixed(1)))+' วิ':'');hint.appendChild(detail);
    if(info.kind==='locked'&&canLearn(ME(),i)){const learn=document.createElement('span');learn.textContent='กดปุ่ม + ข้างสกิลเพื่ออัปสกิล';hint.appendChild(learn);}
    hint.style.left=Math.max(8,Math.min(W-248,B.x-120))+'px';hint.style.top=Math.max(8,B.y-B.r-88)+'px';hint.hidden=false;
  }
  cv.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse')return;
    hover=state==='play'?UI.sk.findIndex(B=>Math.hypot(event.clientX-B.x,event.clientY-B.y)<B.r):-1;updateHint(true);
  },{passive:true});
  cv.addEventListener('pointerleave',()=>{hover=-1;hint.hidden=true;},{passive:true});
  skIco=function(key,i){return icons.get(key+':'+i)||null;};
  btnBase=function(x,y,r,pressed,rim,tint,dim){
    const R=r*(pressed?.94:1);ctx.save();
    ctx.fillStyle='rgba(2,5,12,.78)';ctx.beginPath();ctx.arc(x,y+2,R+2,0,Math.PI*2);ctx.fill();
    const face=ctx.createLinearGradient(x,y-R,x,y+R);face.addColorStop(0,dim?'#20283a':'#25334c');face.addColorStop(1,'#080e1c');
    ctx.fillStyle=face;ctx.beginPath();ctx.arc(x,y,R,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=dim?'#59657a':rim;ctx.lineWidth=Math.max(1.5,r*.045);ctx.stroke();
    ctx.strokeStyle=dim?'#303a4c':'#8da5c055';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,R-4,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=dim?'#65728977':'#e7d7ac';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,R,-Math.PI*.84,-Math.PI*.42);ctx.stroke();ctx.restore();
  };
  panelBg=function(x,y,w,h,r){
    ctx.save();const fill=ctx.createLinearGradient(0,y,0,y+h);fill.addColorStop(0,'rgba(24,35,55,.95)');fill.addColorStop(1,'rgba(6,12,24,.95)');
    ctx.fillStyle=fill;rr(x,y,w,h,r);ctx.fill();ctx.strokeStyle='#9d8b655f';ctx.lineWidth=1;ctx.stroke();ctx.restore();
  };
  drawFrame=function(me,s){
    const result=original.frame(me,s);ctx.save();ctx.strokeStyle='rgba(192,174,131,.45)';ctx.lineWidth=1;
    rr(result.x,result.y,result.w,result.h,result.h/2);ctx.stroke();ctx.restore();return result;
  };
  drawSkillBtn=function(B,i,me){
    original.skill(B,i,me);const info=skillState(me,i);ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    if(!coarse){
      const x=B.x+B.r*.65,y=B.y-B.r*.63,r=Math.max(7,B.r*.23);
      ctx.fillStyle='#0a1120';rr(x-r,y-r,r*2,r*2,3);ctx.fill();ctx.strokeStyle='#a99a76';ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle='#f0e4c6';ctx.font='600 '+Math.max(10,B.r*.29)+'px system-ui';ctx.fillText(hotkeys[i],x,y+.5);
    }
    if(info.kind==='mana'){
      const w=B.r*1.55,y=B.y+B.r*.22;ctx.fillStyle='#0a1635ee';rr(B.x-w/2,y,w,B.r*.5,3);ctx.fill();
      ctx.font='600 '+Math.max(9,B.r*.28)+'px system-ui';ctx.fillStyle='#c4e4ff';ctx.fillText('MP ต่ำ',B.x,y+B.r*.25);
    }
    ctx.restore();if(hover===i)updateHint();
  };
  drawHUD=function(){if(state!=='play'||ME()?.dead)hint.hidden=true;return original.hud();};
  window.MoonfallUI={state:skillState,snapshot:()=>({state:loadState,error:loadError,loadedIcons:icons.size,atlas,hotkeys:[...hotkeys]}),
    icon:(key,i)=>icons.get(key+':'+i)||null,item:key=>icons.get('item:'+key)||null};
  (async()=>{
    try{
      const response=await fetch('assets/ui/skill-atlas.json',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Atlas manifest HTTP '+response.status);
      atlas=await response.json();if(atlas.columns!==6||atlas.rows!==5)throw Error('Unsupported atlas layout');
      const images={};
      for(const [key,sheet] of Object.entries(atlas.sheets)){
        const url=new URL(sheet.image,document.baseURI);if(url.origin!==location.origin)throw Error('Use a local atlas');
        const image=new Image();image.decoding='async';let timer;try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Atlas image unavailable: '+key));timer=setTimeout(()=>reject(Error('Atlas image timeout: '+key)),60000);image.src=url.href;});}finally{clearTimeout(timer);}
        if(image.naturalWidth!==sheet.width||image.naturalHeight!==sheet.height)throw Error('Atlas dimensions differ: '+key);images[key]=image;
      }
      const extract=(key,ref)=>{const sheet=atlas.sheets[ref.sheet],image=images[ref.sheet],width=sheet.width/sheet.columns,height=sheet.gridHeight/sheet.rows;
        const canvas=document.createElement('canvas');canvas.width=canvas.height=144;const paint=canvas.getContext('2d');paint.fillStyle='#0b1120';paint.fillRect(0,0,144,144);
        paint.drawImage(image,ref.cell%6*width+3,Math.floor(ref.cell/6)*height+3,width-6,height-6,3,3,138,138);icons.set(key,canvas);};
      for(const [key,cells] of Object.entries(atlas.skills))cells.forEach((cell,i)=>extract(key+':'+i,{sheet:'base',cell}));
      for(const [key,refs] of Object.entries(atlas.fusionSkills))refs.forEach((ref,i)=>extract(key+':'+i,ref));
      for(const [key,ref] of Object.entries(atlas.utilities))extract('item:'+key,ref);
      if(AW.some(key=>SK[key].some((_,i)=>!icons.has(key+':'+i))))throw Error('Missing skill artwork');
      const requiredItems=[...BAG.map(p=>p.k),'lv','rf','coin','bag','shop','block','dodge','special',...SPX.map((s,i)=>s?'x'+i:null).filter(Boolean)];
      if(requiredItems.some(key=>!icons.has('item:'+key)))throw Error('Missing item artwork');
      loadState='loaded';window.dispatchEvent(new Event('moonfallui:ready'));
    }catch(error){icons.clear();loadState='error';loadError=String(error.message||error);}
  })();
};
