/* Strict Cursed Realm boot: failed/missing art or models never unlock play.
 * The original asynchronous pack is validated before its real rig is admitted. */
window.installMoonfallLoading=function(){
  'use strict';
  const screen=$('loading'),status=$('moonfallLoadStatus'),count=$('moonfallLoadCount'),progress=$('moonfallLoadProgress'),fill=$('moonfallLoadFill'),error=$('moonfallLoadError'),retry=$('moonfallLoadRetry');
  const arena=screen.classList.contains('arena-load'),title=$('moonfallLoadTitle');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  if(arena){
    const layer=screen.querySelector('.arena-load-embers');
    for(let i=0;i<22;i++){
      const ember=document.createElement('i');
      ember.style.cssText=`--x:${20+i*47%79}%;--size:${1+i%3}px;--speed:${7+i%7}s;--delay:-${i*.73}s;--drift:${18+i*29%140}px;--rise:-${20+i*13%58}vh`;
      layer.appendChild(ember);
    }
  }
  const ids=['soloBtn','qmBtn','hostBtn','joinBtn','lobbyStart','moonfallBtn'];
  const original={host:hostStartMatch,host2:hostStartMatch2,client:clientStart,enter:enterPlay,menu:R3.menuFrame,qnSetup:R3.qnSetup,quick:quickMatch,room:hostRoom,join:joinRoom};
  let ready=false,failed=false,launchBusy=false,phase='loading',packDone=0,musicDone=0,artDone=0,renderDone=0,fontsDone=0,total=0,clientToken=0;
  let resolveReady;const whenReady=new Promise(resolve=>{resolveReady=resolve;});
  const music=['menu','day','night','battle','final','cave','wind'];
  const requiredModels=window.CELESTIAL_KEYS||['moon-arena','modular-floor','modular-wall','ancient-pillar','celestial-warrior','moon-stairs','wall-corner','temple-gate','ruin-arch','guardian-statue','portal-frame','rubble','brazier','moon-dead-tree','moon-silver-tree','moon-boulder','moon-rock-cluster'];
  function lock(value){
    for(const id of ids){const button=$(id);if(button)button.disabled=value;}
    for(const id of [...OV,'c']){const element=$(id);if(element)element.inert=value;}
    if(!value)syncMpButtons();
  }
  function setPhase(next){phase=next;if(arena)screen.dataset.phase=next;}
  function show(text){screen.classList.remove('hidden');if(status.textContent!==text)status.textContent=text;}
  function fail(reason){
    if(failed)return;failed=true;ready=false;setPhase('error');lock(true);show('ยังเข้าเกมไม่ได้');
    title.textContent='โหลดข้อมูลไม่สำเร็จ';error.hidden=false;error.textContent=reason+' · ระบบจะไม่ใช้ภาพหรือโมเดลสำรอง';retry.hidden=false;count.textContent='ตรวจสอบการเชื่อมต่อแล้วลองโหลดใหม่';
  }
  retry.onclick=()=>location.reload();
  function update(){
    if(failed||phase!=='loading')return;
    if(window.__moonfallCodeFailure)return fail('ไฟล์เกม: '+window.__moonfallCodeFailure);
    const assets=CelestialAssets.snapshot(),ui=MoonfallUI.snapshot();
    if(assets.error)return fail('รายการโมเดล: '+assets.error);
    if(assets.ready){const absent=requiredModels.find(key=>!assets.assets.some(a=>a.key===key));if(absent)return fail('ไม่มีโมเดลในรายการ: '+absent);}
    const broken=assets.assets.find(a=>a.state==='missing'||a.state==='error');if(broken)return fail(broken.name+': '+(broken.error||'ไม่มีไฟล์ที่จำเป็น'));
    if(ui.state==='error')return fail('ภาพไอคอน: '+ui.error);
    if(!total)return;
    const loaded=assets.assets.filter(a=>a.state==='loaded').length+packDone+musicDone+artDone+renderDone+fontsDone+(ui.state==='loaded'?Object.keys(ui.atlas.sheets).length:0);
    const percent=Math.min(99,Math.floor(loaded/total*100));fill.style.width=percent+'%';progress.setAttribute('aria-valuenow',percent);
    count.textContent=loaded+' / '+total+' รายการ · '+percent+'%';
  }
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function until(test,label){
    const deadline=performance.now()+90000;
    while(!test()){
      update();if(failed)throw Error('boot stopped');if(performance.now()>deadline)throw Error('หมดเวลารอ '+label);
      await delay(80);
    }
  }
  window.MoonfallLoading={isReady:()=>ready&&!failed,whenReady,snapshot:()=>({phase,ready,failed,total,packDone,musicDone,artDone,error:failed?error.textContent:null})};
  lock(true);screen.focus({preventScroll:true});
  // Capture clicks as well as programmatic .click(); network services can update
  // disabled flags independently, so the entry functions are guarded too.
  document.addEventListener('click',event=>{
    if((!ready||launchBusy)&&ids.some(id=>event.target.closest('#'+id))){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  window.addEventListener('keydown',event=>{
    if((!ready||launchBusy)&&!screen.contains(event.target)&&event.key!=='Tab'){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  hostStartMatch=function(){if(!ready||failed||launchBusy)return;return original.host();};
  quickMatch=function(...args){if(!ready||failed||launchBusy)return;return original.quick(...args);};
  hostRoom=function(...args){if(!ready||failed||launchBusy)return;return original.room(...args);};
  joinRoom=function(...args){if(!ready||failed||launchBusy)return;return original.join(...args);};
  hostStartMatch2=function(){if(!ready||failed)return;return original.host2();};
  enterPlay=function(){if(!ready||failed)return;return original.enter();};
  clientStart=function(data){
    if(ready&&!failed)return original.client(data);
    const token=++clientToken;net.pendS=[];whenReady.then(()=>{if(token!==clientToken)return;const pending=net.pendS;original.client(data);net.pendS=pending;});
  };
  R3.menuFrame=function(dt){if(!ready||failed)return;return original.menu.call(this,dt);};
  withLoading=function(fn){
    if(!ready||failed||launchBusy)return;launchBusy=true;lock(true);setPhase('preparing');show('กำลังจัดสนามและเตรียมผู้กล้า…');
    if(arena)title.textContent='กำลังเข้าสู่สนาม';
    fill.style.width='100%';progress.setAttribute('aria-valuenow','100');count.textContent='กำลังเตรียมสนาม';
    setTimeout(async()=>{
      try{
        await fn();if(view3D&&R3.ok&&R3.scene){await R3.renderer.compileAsync(R3.scene,R3.cam);R3.frame(1/60);}
        if(!failed){setPhase('ready');screen.classList.add('hidden');lock(false);}
      }catch(e){fail('เตรียมสนาม: '+e.message);}finally{launchBusy=false;}
    },60);
  };
  R3.qnSetup=function(got){
    const keys=Object.keys(window.AR_QN||{}),missing=keys.filter(k=>!got[k]);
    if(missing.length){fail('ไฟล์ตัวละครไม่ครบ: '+missing.join(', '));return;}
    original.qnSetup.call(this,got);
    if(!this.qn||this.qn.mobOnly){fail('Rig หรือ Animation ของผู้เล่นไม่ครบ');return;}packDone=keys.length;update();
  };
  const unsubscribe=CelestialAssets.subscribe(update);
  (async()=>{
    try{
      if(!window.THREE||!window.AR_GLTF||(!R3.ok&&!R3.init()))throw Error('อุปกรณ์ไม่พร้อมสำหรับกราฟิก 3D');
      show('กำลังอ่านฉากและภาพไอคอน…');
      await until(()=>CelestialAssets.snapshot().ready&&window.AR_QN&&window.SFX_PACK&&MoonfallUI.snapshot().atlas,'รายการไฟล์เกม');
      if(!AR_QN.c_MP||!AR_QN.h_M||!AR_QN.a_UAL1)throw Error('รายการตัวละครไม่ครบ');
      total=CelestialAssets.snapshot().assets.length+Object.keys(AR_QN).length+Object.keys(MoonfallUI.snapshot().atlas.sheets).length+music.length+3;update();
      R3.qnLoad();
      // CSS alone cannot prove the illustration decoded. Require the same real
      // URL used by both screens, then let the browser reuse its cached pixels.
      const art=new Promise((resolve,reject)=>{
        const image=new Image(),timer=setTimeout(()=>reject(Error('หมดเวลารอภาพหน้าโหลด')),60000);
        image.onload=async()=>{
          try{await image.decode();if(!image.naturalWidth||!image.naturalHeight)throw Error('empty image');clearTimeout(timer);artDone=1;update();resolve();}
          catch(e){clearTimeout(timer);reject(Error('ภาพหน้าโหลดไม่ถูกต้อง'));}
        };
        image.onerror=()=>{clearTimeout(timer);reject(Error('โหลดภาพหน้าโหลดไม่สำเร็จ'));};
        image.src=screen.dataset.keyArt||'assets/ui/moonfall-key-art.webp';
      });
      const audio=Promise.all(music.map(async name=>{const response=await fetch('music/'+name+'.mp3',{cache:'force-cache',signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('เสียง '+name+': HTTP '+response.status);const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length<4||!(String.fromCharCode(...bytes.slice(0,3))==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224)))throw Error('ไฟล์เสียงไม่ถูกต้อง: '+name);musicDone++;update();}));
      const fonts=document.fonts.ready.then(()=>{fontsDone=1;update();});
      await Promise.all([art,audio,fonts,until(()=>packDone>0,'ตัวละคร'),until(()=>MoonfallUI.snapshot().state==='loaded','ภาพไอคอน'),until(()=>CelestialAssets.snapshot().assets.every(a=>a.state==='loaded'),'ฉากเกม')]);
      if(failed)return;
      show(MOON?'กำลังเตรียมภาพและแสงจันทร์…':'กำลังเตรียมภาพสนามประลอง…');
      R3.menuSeed=Math.floor(Math.random()*1e9);setupWorld(R3.menuSeed);R3.buildWorld();R3.menuReady=1;
      await R3.renderer.compileAsync(R3.scene,R3.cam);
      // Exercise the actual menu renderer without exposing an incomplete scene.
      const suppressed=window.__noMenu;window.__noMenu=false;
      try{original.menu.call(R3,1/60);}finally{window.__noMenu=suppressed;}
      renderDone=1;update();if(failed)return;
      fill.style.width='100%';progress.setAttribute('aria-valuenow','100');count.textContent=total+' / '+total+' รายการ · พร้อมแล้ว';
      unsubscribe();setPhase('ready');
      if(arena){
        title.textContent='สนามพร้อมแล้ว';show('กำลังเปิดเมนูหลัก…');
        if(!reduced.matches)await delay(320);
        if(window.__moonfallCodeFailure)return fail('ไฟล์เกม: '+window.__moonfallCodeFailure);
      }
      ready=true;screen.classList.add('hidden');lock(false);resolveReady();$('soloBtn').focus({preventScroll:true});
    }catch(e){if(!failed)fail(e.message);}
  })();
};
