/* Moonfall HUD artwork. Original costs, hit areas, cooldowns and rules remain.
 * All base/fusion/item art is required by the strict boot gate. */
window.installMoonfallUI=function(){
  'use strict';
  if(window.MoonfallUI)return;
  const original={icon:skIco,button:btnBase,skill:drawSkillBtn,frame:drawFrame,panel:panelBg,hud:drawHUD};
  const icons=new Map(),weaponPortraits=new Map(),hotkeys=['Q','E','R'];
  const coarse=matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  let atlas=null,loadState='loading',loadError=null,hover=-1,lastHint=0;
  const hint=document.createElement('aside');hint.id='moonfallSkillHint';hint.hidden=true;hint.setAttribute('role','tooltip');document.body.appendChild(hint);
  const instructions=document.createElement('p');instructions.id='moonfallHUDHelp';instructions.className='moonfall-sr-only';
  instructions.textContent='เดินด้วย W A S D หรือจอยซ้าย โจมตีด้วย J หรือ Space (ตีฮีโร่ก่อนเสมอ) K หรือปุ่มเล็กข้างปุ่มโจมตีตีเฉพาะมอนสเตอร์ สกิล Q E R หรือ 1 2 3 กดปุ่ม + บนจอเพื่ออัปสกิล Shift หรือปุ่มซ้ายขวดเลือดเพื่อพุ่ง (คูลดาวน์ 45 วิ) V สกิลพิเศษ มือถือกดค้างแล้วลากเพื่อเล็ง ปล่อยเพื่อร่าย';
  if(ARX)instructions.textContent+=' แตะสกิลเพื่อใช้ กดค้างเพื่ออ่านรายละเอียด';
  document.body.appendChild(instructions);cv.setAttribute('aria-describedby',instructions.id);
  function skillState(me,i){
    const skill=me?.wk&&SK[me.wk]?.[i],level=me?.skl?.[i]||0,index=Math.max(0,level-1);
    if(!skill)return{kind:'unarmed',label:'ต้องมีอาวุธ',skill:null,cost:0};
    const cost=skill.mp[index],cooldown=Math.max(0,me.cd[i]);
    const kind=!level?'locked':cooldown>0?'cooldown':me.mp<cost?'mana':'ready';
    return{kind,label:{locked:canLearn(me,i)?'อัปสกิลได้':'ยังไม่ปลดล็อก',cooldown:'กำลังฟื้นฟู',mana:'มานาไม่พอ',ready:'พร้อมใช้'}[kind],skill,cost,cooldown,level,maxCooldown:skill.cd[index]*cdMul(me)};
  }
  function showHeldSkill(me,held){
    const info=arenaSkillDetails(me,held.i);
    const add=(tag,text,style)=>{
      const el=document.createElement(tag);el.textContent=text;if(style)el.className=style;hint.appendChild(el);
    };
    hint.dataset.hold='';
    hint.replaceChildren();
    add('strong',(['Q','E','R','V'][held.i])+' · '+info.name+(info.level?' · Lv. '+info.level:''));
    add('span',[info.state,info.cost!=null?'MP '+info.cost:'',info.cooldown!=null?'คูลดาวน์ '+arenaSkillTime(info.cooldown):''].filter(Boolean).join(' · '),'skill-meta');
    if(info.damage)add('span','ความเสียหาย '+info.damage+' (ค่าพื้นฐานก่อนลดทอน)','skill-damage');
    if(info.note)add('span',info.note,'skill-note');
    if(info.rune)add('span','รูน · '+info.rune,'skill-rune');
    hint.hidden=false;
    const B=held.i===3?held.target.getBoundingClientRect():UI.sk[held.i];
    const x=held.i===3?B.left+B.width/2:B.x,y=held.i===3?B.top:B.y-B.r;
    hint.style.left=clamp(x-hint.offsetWidth/2,SAFE.l+8,Math.max(SAFE.l+8,W-SAFE.r-hint.offsetWidth-8))+'px';
    hint.style.top=Math.max(SAFE.t+8,y-hint.offsetHeight-8)+'px';
  }
  function updateHint(force=false){
    if(ARX){
      const me=ME(),held=arenaHeldSkill,now=performance.now();
      if(held&&!held.drag&&me?.wk===held.wk&&arenaCanInspectSkill(me)&&now-held.since>=ARENA_SKILL_HOLD_MS){
        if(!hint.hasAttribute('data-hold')||now-lastHint>=180){lastHint=now;showHeldSkill(me,held)}
        return;
      }
      if(hint.hasAttribute('data-hold')){delete hint.dataset.hold;hint.hidden=true;lastHint=0;}
      if(held||!arenaCanInspectSkill(me)){hint.hidden=true;return}
    }
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
    ctx.restore();if(!ARX&&hover===i)updateHint();
  };
  drawHUD=function(){if(ARX)updateHint();else if(state!=='play'||ME()?.dead)hint.hidden=true;return original.hud();};
  window.MoonfallUI={state:skillState,refreshHint:i=>{if(hover===i)updateHint();},snapshot:()=>({state:loadState,error:loadError,loadedIcons:icons.size,atlas,hotkeys:[...hotkeys]}),
    icon:(key,i)=>icons.get(key+':'+i)||null,item:key=>icons.get('item:'+key)||null,weapon:key=>weaponPortraits.get(key)||null};
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
      const extract=(ref,transparent=false)=>{
        const sheet=atlas.sheets[ref.sheet],image=images[ref.sheet],width=sheet.width/sheet.columns,height=sheet.gridHeight/sheet.rows;
        const canvas=document.createElement('canvas');canvas.width=canvas.height=144;
        const paint=canvas.getContext('2d');
        const column=ref.cell%sheet.columns,row=Math.floor(ref.cell/sheet.columns);
        if(transparent)paint.drawImage(image,column*width,row*height,width,height,0,0,144,144);
        else{
          paint.fillStyle='#0b1120';paint.fillRect(0,0,144,144);
          paint.drawImage(image,column*width+3,row*height+3,width-6,height-6,3,3,138,138);
        }
        return canvas;
      };
      for(const [key,cells] of Object.entries(atlas.skills))cells.forEach((cell,i)=>icons.set(key+':'+i,extract({sheet:'base',cell})));
      for(const [key,refs] of Object.entries(atlas.fusionSkills))refs.forEach((ref,i)=>icons.set(key+':'+i,extract(ref)));
      for(const [key,ref] of Object.entries(atlas.utilities))icons.set('item:'+key,extract(ref));
      if(ARX&&atlas.sheets.armory){
        const sheet=atlas.sheets.armory;
        for(const key of ['fist',...AW]){
          const cell=atlas.weaponPortraits?.[key];
          if(!Number.isInteger(cell)||cell<0||cell>=sheet.columns*sheet.rows)throw Error('Missing weapon portrait: '+key);
          weaponPortraits.set(key,extract({sheet:'armory',cell},true));
        }
      }
      if(AW.some(key=>SK[key].some((_,i)=>!icons.has(key+':'+i))))throw Error('Missing skill artwork');
      const requiredItems=[...BAG.map(p=>p.k),'lv','rf','coin','bag','shop','block','dodge','special',...SPX.map((s,i)=>s?'x'+i:null).filter(Boolean)];
      if(requiredItems.some(key=>!icons.has('item:'+key)))throw Error('Missing item artwork');
      loadState='loaded';window.dispatchEvent(new Event('moonfallui:ready'));
    }catch(error){icons.clear();weaponPortraits.clear();loadState='error';loadError=String(error.message||error);}
  })();
};
