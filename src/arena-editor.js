// The workbench uses the game's renderer and generated world; only a playtest runs the host simulation.
const ArenaEditor=window.ArenaEditor=(()=>{
  const panel=$('arenaEditor'),stage=$('edStage'),list=$('edList'),status=$('edStatus');
  const copy=o=>JSON.parse(JSON.stringify(o));
  const empty={version:2,seed:null,kinds:{},spawns:{},meteor:{},tuning:{},layout:{},chests:{radius:0,boxes:{}},encounters:{}};
  const labels={hp:'พลังชีวิตพื้นฐาน',dmg:'พลังโจมตีพื้นฐาน',leash:'ระยะไล่จากจุดเกิด',armor:'เกราะ',spd:'ความเร็ว',atkT:'ช่วงโจมตี (วิ)',range:'ระยะโจมตี',xp:'ค่าประสบการณ์',
    baseDamage:'ความเสียหายพื้นฐาน',radius:'รัศมีโจมตี',delay:'เวลาตก (วิ)'};
  const names=m=>m.encounter?ArenaProject.definition(m).name:ArenaLanguage.text(CREEPS[m.kind].name).split(' · ').at(ArenaLanguage.language==='en'?0:-1);
  const isBoss=m=>m.kind==='snowqueen'||m.kind==='overlord'||m.kind==='boss';
  const history=[];
  let draft,saved,seed,origins,spawnById,selected,mode,scope,hero,dummy,practice,aim;
  let returnToLibrary=false,leaving=false;
  let ring,drag,trial,ray,ndc,drawnX,drawnY,placing=false,zoom=1.3,busy=false,testing=false,previousView,dirtyFrame=true,readError=false;
  function selectedMob(){return spawnById.get(selected)}
  function changed(){return JSON.stringify(draft)!==saved}
  function notice(message,tone){
    status.textContent=message|| (changed()?'มีการแก้ไขที่ยังไม่บันทึก':'ใช้ค่าที่บันทึกไว้');
    status.dataset.tone=tone|| (changed()?'dirty':'clean');
    $('edUndo').disabled=$('edLibraryUndo').disabled=!history.length;
    $('edLibraryStatus').textContent=status.textContent;$('edLibraryStatus').dataset.tone=status.dataset.tone;
  }
  function press(id,on){$(id).setAttribute('aria-pressed',String(on))}
  function moveTo(unit,x,y){unit.x=unit.tx=x;unit.y=unit.ty=y}
  function focusAt(x,y){
    moveTo(hero,clamp(x,0,WORLD),clamp(y,0,WORLD));
    R3.tx=hero.x;R3.ty=hero.y;R3.ly=R3.gY(hero.x,hero.y);
    for(const house of WD.houses)house.roofA=inRect(hero,house,-4)?0:1;
    for(const cave of WD.caves)cave.roofA=dist(hero,cave)<cave.R+6?0:1;
    dirtyFrame=true;mapView();region();
  }
  function region(){
    $('edRegion').textContent=inDG(hero)?'ดันเจียน':REG.N[REG.at(hero.x,hero.y)];
  }
  function mapView(){
    const map=$('edMap'),context=map.getContext('2d'),scale=map.width/WORLD;
    if(!MINI)return;
    context.drawImage(MINI,0,0,map.width,map.height);
    for(const m of WD.mobs){
      context.fillStyle=isBoss(m)?'#ffe3a0':'#d4deda';
      const r=isBoss(m)?2.5:1;
      context.fillRect(m.x*scale-r,m.y*scale-r,2*r,2*r);
    }
    context.strokeStyle='#ffffff';context.lineWidth=2;
    context.strokeRect(hero.x*scale-6,hero.y*scale-5,12,10);
  }
  function removeRing(){
    if(!ring)return;
    ring.removeFromParent();ring.geometry.dispose();ring.material.dispose();ring=null;
  }
  function updateRing(point,invalid=false,objectRadius){
    point=point||(mode==='meteor'?aim:selectedMob());if(!point)return;
    if(!ring){
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(96*3),3));
      ring=new THREE.LineLoop(geometry,new THREE.LineBasicMaterial({transparent:true,opacity:.96,depthWrite:false}));
      ring.frustumCulled=false;ring.renderOrder=10;R3.scene.add(ring);
    }
    ring.visible=!trial;
    ring.material.color.set(invalid?'#ff604b':mode==='meteor'?'#ffba73':'#93ffe1');
    const pos=ring.geometry.attributes.position,r=objectRadius??(mode==='meteor'?METEOR.radius:CREEPS[selectedMob().kind].r+10);
    for(let i=0;i<pos.count;i++){
      const theta=2*Math.PI*i/pos.count,x=point.x+Math.cos(theta)*r,y=point.y+Math.sin(theta)*r;
      pos.setXYZ(i,x,R3.gY(x,y)+3,y);
    }
    pos.needsUpdate=true;dirtyFrame=true;
  }
  function pin(){
    const el=$('edPin'),m=mode==='meteor'?dummy:UMAP.get(selected);
    if(!m){el.hidden=true;return}
    const p=R3.toScreen(m.x,R3.gY(m.x,m.y)+m.r*(m.ecl==='queen'?4:3),m.y),rect=stage.getBoundingClientRect();
    el.hidden=!p.ok||p.x<rect.left+5||p.x>rect.right-5||p.y<rect.top+22||p.y>rect.bottom;
    if(!el.hidden){
      el.style.left=(p.x-rect.left)+'px';el.style.top=(p.y-rect.top)+'px';
      el.textContent=mode==='meteor'?'หุ่นฝึก · '+fmtN(dummy.hp)+' HP':names(selectedMob());
    }
  }
  function drawList(){
    const query=$('edSearch').value.trim().toLowerCase(),fragment=document.createDocumentFragment();
    const mobs=WD.mobs.filter(m=>(m.id+' '+m.kind+' '+CREEPS[m.kind].name+' '+names(m)).toLowerCase().includes(query));
    mobs.sort((a,b)=>Number(isBoss(b))-Number(isBoss(a))||a.kind.localeCompare(b.kind)||a.id-b.id);
    let group;
    for(const m of mobs){
      const heading=isBoss(m)?'บอส':'มอนสเตอร์';
      if(heading!==group){const h=document.createElement('h3');h.textContent=group=heading;fragment.append(h)}
      const button=document.createElement('button');button.type='button';button.dataset.id=m.id;
      button.className='ed-object'+(isBoss(m)?' ed-boss':'');button.setAttribute('aria-current',String(selected===m.id&&mode==='mobs'));
      const name=document.createElement('span'),id=document.createElement('small');
      name.textContent=names(m);id.textContent='#'+m.id;button.append(name,id);fragment.append(button);
    }
    if(!mobs.length){const note=document.createElement('p');note.textContent='ไม่พบมอนสเตอร์';fragment.append(note)}
    list.replaceChildren(fragment);$('edCount').textContent=mobs.length;
  }
  function inspect(){
    const skill=mode==='meteor',m=selectedMob();
    press('edSkills',skill);press('edMobs',!skill);
    press('edInstance',scope==='instance');press('edKind',scope==='kind');
    $('edMobFields').hidden=skill;$('edSkillFields').hidden=!skill;
    $('edBossTrial').hidden=skill||!isBoss(m);
    $('edObjects').hidden=skill;$('edRange').hidden=!skill;
    $('edBrowse').textContent=skill?'สนามทดสอบ':'วัตถุในฉาก';
    press('edPlace',placing);stage.classList.toggle('ed-aim',skill||placing);
    $('edType').textContent=skill?'สกิลพิเศษ':'#'+m.id+'  /  '+m.kind;
    $('edName').textContent=skill?'Meteor':names(m);
    $('edHint').textContent=skill?'แตะพื้นเพื่อเล็ง แล้วกดร่ายทดสอบ':placing?'คลิกแผนที่เพื่อเลื่อนกล้อง แล้วแตะพื้นเพื่อวาง':'ลากตัวมอนสเตอร์เพื่อย้าย · ลากพื้นเพื่อเลื่อนกล้อง';
    if(skill){
      for(const key of Object.keys(ArenaProject.skillRanges))$('ed-'+key).value=METEOR[key]*displayScale(key);
      targetStats();
      METEOR.cd.forEach((v,i)=>$('ed-cd'+i).value=v);
    }else{
      $('edX').value=Math.round(m.x);$('edY').value=Math.round(m.y);
      const def=scope==='kind'?{...CREEPS[m.kind],...draft.kinds[m.kind],...draft.encounters[m.encounter]?.stats}:ArenaProject.definition(m);
      for(const key of Object.keys(ArenaProject.statRanges))$('ed-'+key).value=(def[key]??420)*displayScale(key);
    }
    $('edSeed').textContent='SEED '+seed;region();mapView();updateRing();
  }
  function targetStats(){
    $('edHealth').textContent=fmtN(dummy.hp)+' / '+fmtN(dummy.maxHp)+' HP';
    $('edHealthBar').value=dummy.hp/dummy.maxHp;
    $('edPower').textContent=fmtN(specialHitDamage(hero,'meteor'));
  }
  function stopTrial(){
    trial=null;aoes=[];fxq=[];parts=[];texts=[];shakeA=0;
    R3._fx2?.meteorField?.reset();$('edHit').textContent='';
  }
  function roster(){
    stopTrial();
    units=mode==='mobs'?WD.mobs.map(m=>mkMob(m)):[hero,dummy];
    UMAP=new Map(units.map(u=>[u.id,u]));UMAP.set(hero.id,hero);
    if(mode==='meteor'){dummy.hp=dummy.maxHp;hero.xcd=0}
    dirtyFrame=true;
  }
  function applyDraft(){
    ArenaProject.activate(draft);recalc(hero,true);
    for(const m of WD.mobs){
      const base=origins.get(m.id),pos=draft.spawns[m.id]?.position;
      const x=pos?pos[0]:base.x,y=pos?pos[1]:base.y;
      if(m.x!==x||m.y!==y)ArenaProject.place(WD,m,x,y);
    }
    roster();inspect();notice();
  }
  function nearSpot(center,radius,from=170){
    for(let d=from;d<=from+480;d+=32)for(let i=0;i<16;i++){
      const a=(i+.5)*Math.PI/8,x=center.x+Math.cos(a)*d,y=center.y+Math.sin(a)*d;
      if(!blockedAt({x,y},radius)&&!inWater(x,y)&&Math.abs(R3.gY(x,y)-R3.gY(center.x,center.y))<70)return {x,y};
    }
    return {x:center.x,y:center.y};
  }
  function prepareScene(sceneSeed,project=empty,strict=false){
    removeRing();seed=sceneSeed;
    setupWorld(seed,undefined,{...empty,seed,layout:project.layout,tuning:project.tuning,encounters:project.encounters},strict);R3.sync();
    spawnById=new Map(WD.mobs.map(m=>[m.id,m]));
    origins=new Map(WD.mobs.map(m=>[m.id,{x:m.x,y:m.y}]));
    if(!spawnById.has(selected))selected=WD.fort?.queen??WD.mobs[0].id;
    hero=mkHero(1,myName(),'host',chosenLook,1);myId=hero.id;
    hero.xs=SPX.indexOf(METEOR);hero.xl=Number($('edRank').value);
    const center=WD.spawns.find(p=>!inWater(p.x,p.y)&&!blockedAt(p,35)&&REG.at(p.x,p.y)===0)||WD.spawns[0];
    practice={x:center.x,y:center.y};
    const spot=nearSpot(center,50);
    dummy=mkMob({id:-71,kind:'golem',camp:-1,x:spot.x,y:spot.y});
    dummy.hp=dummy.maxHp=50000;dummy.mr=.15;aim={...spot};
    gameT=90;DROP.st='off';DROP.fall=null;state='editor';
  }
  function validateScene(project){
    for(const id of Object.keys(project.chests.boxes))if(!WD.boxes[id])throw Error('กล่องไม่ตรงกับแผนที่');
    for(const [id,entry] of Object.entries(project.spawns)){
      const m=spawnById.get(Number(id));
      if(!m||m.kind!==entry.kind)throw Error('ข้อมูลมอนสเตอร์ไม่ตรงกับแผนที่');
      if(entry.position&&!ArenaProject.canPlace(m,...entry.position))throw Error('จุดเกิดต้องอยู่บนพื้นที่เดินได้');
    }
  }
  function focusSelection(){
    const point=mode==='meteor'?practice:selectedMob();focusAt(point.x,point.y);
  }
  function worldSettings(p){
    const creatures=Object.entries(p.encounters).map(([id,t])=>[id,t.kind,t.count]);
    return JSON.stringify([p.layout,creatures,Object.entries(p.tuning).filter(([k])=>k.startsWith('items.')&&k.endsWith('.w'))]);
  }
  function edit(next,sceneSeed=next.seed??seed){
    next=ArenaProject.validate(next);
    const oldSeed=seed,oldSelected=selected,rebuild=sceneSeed!==seed||worldSettings(next)!==worldSettings(draft);
    if(!rebuild&&JSON.stringify(next)===JSON.stringify(draft)){inspect();return}
    try{
      if(rebuild)prepareScene(sceneSeed,next,true);
      validateScene(next);
    }catch(error){
      if(rebuild){selected=oldSelected;prepareScene(oldSeed,draft);applyDraft();focusSelection();drawList()}
      throw error;
    }
    history.push({project:draft,seed:oldSeed});if(history.length>40)history.shift();
    const rename=Object.entries(next.encounters).some(([id,t])=>t.name!==draft.encounters[id]?.name);
    draft=next;applyDraft();
    if(rebuild||rename)drawList();
    if(rebuild)focusSelection();
  }
  function change(fn){
    try{const next=copy(draft);fn(next);edit(next);return true}
    catch(error){inspect();notice(error.message,'error');return false}
  }
  function entry(next,m){
    next.seed=seed;return next.spawns[m.id]??={kind:m.kind};
  }
  function prune(next,m){
    const spawn=next.spawns[m.id];
    if(spawn?.stats&&!Object.keys(spawn.stats).length)delete spawn.stats;
    if(spawn&&!spawn.stats&&!spawn.position)delete next.spawns[m.id];
    // Keep an explicitly selected map even after its final spawn override is reset.
  }
  function moveSpawn(x,y){
    const m=selectedMob(),base=origins.get(m.id);
    change(next=>{
      if(!ArenaProject.canPlace(m,x,y))throw Error('จุดเกิดต้องอยู่บนพื้นที่เดินได้');
      const spawn=entry(next,m);
      if(x===Math.round(base.x)&&y===Math.round(base.y))delete spawn.position;
      else spawn.position=[x,y];
      prune(next,m);
    });
  }
  function updateStat(key,value){
    const m=selectedMob();
    change(next=>{
      const kindStats=next.kinds[m.kind]||{},base=CREEPS[m.kind][key]??420;
      const type=next.encounters[m.encounter];
      if(scope==='kind'){
        if(type){
          if(value===(kindStats[key]??base))delete type.stats[key];else type.stats[key]=value;
          return;
        }
        if(value===base)delete kindStats[key];else kindStats[key]=value;
        if(Object.keys(kindStats).length)next.kinds[m.kind]=kindStats;else delete next.kinds[m.kind];
      }else{
        const spawn=entry(next,m);spawn.stats??={};
        if(value===(type?.stats[key]??kindStats[key]??base))delete spawn.stats[key];else spawn.stats[key]=value;
        prune(next,m);
      }
    });
  }
  function select(id,focus){
    if(!spawnById.has(id))return;
    selected=id;placing=false;
    if(mode!=='mobs'){mode='mobs';roster()}
    if(focus)focusSelection();
    for(const b of list.querySelectorAll('[aria-current=true]'))b.setAttribute('aria-current','false');
    list.querySelector('[data-id="'+id+'"]')?.setAttribute('aria-current','true');
    inspect();notice();panel.dataset.panel='';
  }
  function setMode(next){
    if(next===mode)return;
    mode=next;placing=false;roster();focusSelection();drawList();inspect();notice();
    if(innerWidth<=600)panel.dataset.panel='inspector';
  }
  function castTrial(){
    if(!validInputs())return;
    stopTrial();dummy.hp=dummy.maxHp;dummy.dead=false;dummy.hurtT=0;hero.xcd=0;
    if(!castSpecial(hero,aim)){notice('ยังร่ายสกิลไม่ได้','error');return}
    targetStats();trial={t:0,hp:dummy.hp,impact:false};ring.visible=false;
    $('edHit').textContent='กำลังรอแรงกระแทก';dirtyFrame=true;
  }
  function frame(dt){
    if(trial){
      gameT+=dt;trial.t+=dt;
      const hp=dummy.hp;stepAreas(dt);fxUpdate(dt);if(dummy.hp!==hp)targetStats();
      if(!trial.impact&&trial.t>=METEOR.delay){
        trial.impact=true;
        $('edHit').textContent='ความเสียหายตอนกระแทก · '+fmtN(trial.hp-dummy.hp)+' HP';
      }
      if(trial.t>METEOR.delay+7.3){trial=null;updateRing()}
    }
    if(!dirtyFrame&&!trial)return;
    dirtyFrame=false;R3.frame(dt);drawnX=R3.tx;drawnY=R3.ty;pin();
  }

  // Intersect the pointer ray with the same terrain/bridge surface used to draw the actors.

  function groundAt(event){
    ray??=new THREE.Raycaster();ndc??=new THREE.Vector2();
    const rect=$('gl').getBoundingClientRect();
    ndc.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
    ray.setFromCamera(ndc,R3.cam);
    const {origin,direction}=ray.ray;let h=R3.ly||0,x,y;
    for(let i=0;i<8;i++){
      const t=(h-origin.y)/direction.y;x=origin.x+direction.x*t;y=origin.z+direction.z*t;
      const surface=R3.gY(x,y);if(Math.abs(surface-h)<.25)break;h=surface;
    }
    return {x,y};
  }
  function pickMob(event){
    let best=null,score=1;
    for(const m of WD.mobs){
      const model=R3.objs.get(m.id);if(!model?.root.visible)continue;
      const r=CREEPS[m.kind].r,h=R3.gY(m.x,m.y),base=R3.toScreen(m.x,h,m.y);
      const top=R3.toScreen(m.x,h+2.8*r,m.y),side=R3.toScreen(m.x+r,h,m.y);
      if(!base.ok)continue;
      const width=Math.max(14,Math.abs(side.x-base.x)*1.25);
      const dx=(event.clientX-base.x)/width,dy=(event.clientY-clamp(event.clientY,Math.min(base.y,top.y),Math.max(base.y,top.y)))/width;
      const d=dx*dx+dy*dy;if(d<score){score=d;best=m}
    }
    return best;
  }
  stage.addEventListener('pointerdown',e=>{
    if(e.target.closest('button')||e.button!==0||drag||busy)return;
    const ground=groundAt(e),mob=mode==='mobs'&&!placing&&!library.picking?pickMob(e):null;
    if(mob)select(mob.id,false);
    drag={pid:e.pointerId,start:ground,screenX:e.clientX,screenY:e.clientY,mob,ox:mob?.x,oy:mob?.y,moved:false};
    stage.setPointerCapture(e.pointerId);stage.classList.add('ed-drag');
  });
  function trackPointer(e){
    if(!drag||e.pointerId!==drag.pid)return;
    if(Math.hypot(e.clientX-drag.screenX,e.clientY-drag.screenY)>3)drag.moved=true;
    if(!drag.moved||mode==='meteor'&&!library.picking)return;
    const p=groundAt(e);
    if(drag.mob){
      const x=Math.round(drag.ox+p.x-drag.start.x),y=Math.round(drag.oy+p.y-drag.start.y);
      drag.point={x,y};moveTo(UMAP.get(drag.mob.id),x,y);$('edX').value=x;$('edY').value=y;
      updateRing(drag.point,!ArenaProject.canPlace(drag.mob,x,y));
    }else{
      focusAt(drawnX+drag.start.x-p.x,drawnY+drag.start.y-p.y);
    }
  }
  stage.addEventListener('pointermove',trackPointer);
  function finishPointer(e,accept){
    if(!drag||drag.pid!==e.pointerId)return;
    if(accept)trackPointer(e);
    const movement=drag;drag=null;stage.classList.remove('ed-drag');
    if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
    if(library.picking){if(accept&&!movement.moved){library.picked(groundAt(e));inspect()}return}
    if(mode==='meteor'&&accept){
      stopTrial();aim=clampTo(hero,groundAt(e),METEOR.reach);updateRing();return;
    }
    if(placing&&accept&&!movement.moved){
      const p=groundAt(e);
      if(ArenaProject.canPlace(selectedMob(),Math.round(p.x),Math.round(p.y)))placing=false;
      moveSpawn(Math.round(p.x),Math.round(p.y));return;
    }
    if(movement.mob){
      moveTo(UMAP.get(movement.mob.id),movement.mob.x,movement.mob.y);
      if(accept&&movement.point)moveSpawn(movement.point.x,movement.point.y);else inspect();
    }
  }
  stage.addEventListener('pointerup',e=>finishPointer(e,true));
  stage.addEventListener('pointercancel',e=>finishPointer(e,false));
  stage.addEventListener('lostpointercapture',e=>finishPointer(e,false));
  // HP and damage use the same displayed units as the in-game HUD.
  function displayScale(key){return ['hp','dmg','baseDamage'].includes(key)?DS:1}
  function field(container,key,title,range,action){
    const label=document.createElement('label'),input=document.createElement('input');
    label.textContent=title;input.id='ed-'+key;input.type='number';
    const scale=displayScale(key);input.min=range[0]*scale;input.max=range[1]*scale;input.step='any';input.required=true;
    input.onchange=()=>{
      if(!input.value||!input.checkValidity()){input.reportValidity();notice('ตรวจสอบค่าที่กรอก','error');return}
      action(input.valueAsNumber/scale);
    };
    label.append(input);$(container).append(label);
  }
  for(const [key,range] of Object.entries(ArenaProject.statRanges))
    field('edStats',key,labels[key],range,v=>updateStat(key,v));
  for(const [key,range] of Object.entries(ArenaProject.skillRanges))
    field('edSkillStats',key,labels[key],range,v=>change(next=>{
      if(v===ArenaProject.defaults[key])delete next.meteor[key];else next.meteor[key]=v;
    }));
  for(let i=0;i<3;i++)field('edCooldowns','cd'+i,'Lv. '+(i+1),ArenaProject.cooldownRange,v=>change(next=>{
    const cd=next.meteor.cd||[...ArenaProject.defaults.cd];cd[i]=v;
    if(cd.every((n,j)=>n===ArenaProject.defaults.cd[j]))delete next.meteor.cd;else next.meteor.cd=cd;
  }));
  function validInputs(){
    for(const input of $(mode==='meteor'?'edSkillFields':'edMobFields').querySelectorAll('input')){
      if(!input.value||!input.checkValidity()){input.reportValidity();input.focus();return false}
    }
    return true;
  }
  for(const id of ['edX','edY']){
    const input=$(id);input.max=WORLD;input.required=true;
    input.onchange=()=>{if(validInputs())moveSpawn($('edX').valueAsNumber,$('edY').valueAsNumber)};
  }
  function undo(){
    const prev=history.pop();if(!prev)return;
    if(seed!==prev.seed||worldSettings(draft)!==worldSettings(prev.project))prepareScene(prev.seed,prev.project);
    draft=prev.project;applyDraft();focusSelection();drawList();
  }
  function save(){
    if(!validInputs())return;
    try{
      if(WD.layoutIssue)throw Error(WD.layoutIssue);
      if(!readError&&JSON.stringify(ArenaProject.read())!==saved)throw Error('อีกหน้าต่างบันทึกแล้ว ส่งออกฉบับนี้แล้วเปิดใหม่');
      const serialized=JSON.stringify(ArenaProject.validate(draft));
      localStorage.setItem(ArenaProject.storageKey,serialized);saved=serialized;readError=false;
      notice('บันทึกแล้ว · แมตช์ Solo ถัดไปใช้ค่าชุดนี้');
    }catch(error){notice(error.message,'error')}
  }
  function open(){
    if(state!=='menu'||net.mode!=='solo'||!MoonfallLoading.isReady()||busy)return;
    placing=false;zoom=1.3;$('edRank').value='1';previousView=view3D;view3D=true;history.length=0;mode='mobs';scope='instance';selected=null;readError=false;
    try{draft=ArenaProject.read()}catch{draft=ArenaProject.published;readError=true}
    saved=JSON.stringify(draft);draft=copy(draft);$('edSearch').value='';
    enterEditor(draft.seed??WD.seed);
  }
  function enterEditor(worldSeed){
    busy=true;$('edReturn').hidden=true;
    try{
      prepareScene(worldSeed,draft);
      let stale=false;
      for(const [id,entry] of Object.entries(draft.spawns)){
        const m=spawnById.get(Number(id));
        if(!m||m.kind!==entry.kind){delete draft.spawns[id];stale=true}
        else if(entry.position&&!ArenaProject.canPlace(m,...entry.position)){
          delete entry.position;prune(draft,m);stale=true;
        }
      }
      showOnly(null);document.body.classList.add('ed-open');panel.hidden=false;$('gl').style.visibility='visible';
      panel.dataset.panel='';applyDraft();focusSelection();drawList();
      if(WD.layoutIssue)notice(WD.layoutIssue,'error');
      else if(stale)notice('พบจุดเกิดเดิมที่ใช้กับแผนที่นี้ไม่ได้ ตรวจสอบฉบับแก้ไขก่อนบันทึก','dirty');
      else if(readError)notice('อ่านไฟล์ในเครื่องไม่ได้ กำลังใช้ค่าจากเกม','error');
      $('edMobs').focus({preventScroll:true});
    }finally{busy=false}
  }
  function close(){
    if(changed()&&!window.confirm(ArenaLanguage.text('ออกโดยทิ้งการแก้ไขที่ยังไม่บันทึกหรือไม่')))return;
    if(!library.confirmFileExit())return;
    leaving=true;stopTrial();removeRing();drag=null;history.length=0;panel.hidden=true;document.body.classList.remove('ed-open');
    view3D=previousView;myId=0;ArenaProject.activate(ArenaProject.forMatch());
    list.replaceChildren();spawnById=origins=hero=dummy=practice=aim=draft=null;
    const lock=new URL('editor.html',location.href);lock.search=location.search;
    window.top.location.replace(lock.href);
  }
  function play(kit){
    if(busy||!validInputs())return;
    busy=true;
    withLoading(()=>{
      try{
        stopTrial();removeRing();panel.hidden=true;document.body.classList.remove('ed-open');
        const who=selected;
        hostNewGame([{ctrl:'host',name:myName(),look:chosenLook}],seed,undefined,draft);
        R3.sync();DROP.skip();
        const player=ME(),mob=UMAP.get(who),box=WD.boxes[kit?.chest];
        const start=box?ArenaPopulation.approach(box,player.r)||nearSpot(box,player.r,58):nearSpot(mob,player.r+3,260);
        moveTo(player,start.x,start.y);
        player.xs=kit?.special?SPX.indexOf(SPECIAL_BY[kit.special]):SPX.indexOf(METEOR);
        player.xl=kit?.special?kit.rank:1;
        if(kit?.weapon&&kit.weapon!=='unarmed'){
          player.wk=kit.weapon;player.wt=0;player.wv=0;player.skl=[1,1,1];
          if(kit.slot!==undefined)player.skl[kit.slot]=kit.rank;
          recalc(player,true);
        }
        R3.tx=player.x;R3.ty=player.y;R3.ly=R3.gY(player.x,player.y);
        testing=true;enterPlay();$('edReturn').hidden=false;
      }finally{busy=false}
    });
  }
  function returnToEdit(){
    if(!testing||busy)return;
    testing=false;enterEditor(seed);
    if(returnToLibrary){returnToLibrary=false;library.open()}
  }
  list.onclick=e=>{const b=e.target.closest('[data-id]');if(b)select(Number(b.dataset.id),true)};
  function setZoom(factor){zoom=clamp(zoom*factor,.7,2.3);dirtyFrame=true}
  $('edZoomIn').onclick=()=>setZoom(.82);$('edZoomOut').onclick=()=>setZoom(1/.82);
  stage.addEventListener('wheel',e=>{e.preventDefault();setZoom(e.deltaY<0?.92:1/.92)},{passive:false});
  $('edPlace').onclick=()=>{
    placing=!placing;panel.dataset.panel='';inspect();notice();
  };
  $('edAimDummy').onclick=()=>{
    stopTrial();aim={x:dummy.x,y:dummy.y};updateRing();panel.dataset.panel='';
  };
  $('edRank').onchange=()=>{
    stopTrial();hero.xl=Number($('edRank').value);dummy.hp=dummy.maxHp;targetStats();updateRing();
  };
  $('edSearch').oninput=drawList;
  $('edMap').onpointerdown=e=>{
    if(mode!=='mobs')return;
    const rect=e.currentTarget.getBoundingClientRect();
    focusAt((e.clientX-rect.left)/rect.width*WORLD,(e.clientY-rect.top)/rect.height*WORLD);
    panel.dataset.panel='';
  };
  $('edMobs').onclick=()=>setMode('mobs');$('edSkills').onclick=()=>setMode('meteor');
  $('edInstance').onclick=()=>{scope='instance';inspect()};$('edKind').onclick=()=>{scope='kind';inspect()};
  $('edFocus').onclick=focusSelection;$('edUndo').onclick=undo;$('edCast').onclick=castTrial;
  $('edBossTrial').onclick=()=>{
    if(busy||!validInputs())return;
    const m=selectedMob();
    ArenaBossTrial.open({kind:m.kind,actorId:m.id,seed,project:draft,enter(){
      stopTrial();removeRing();panel.hidden=true;document.body.classList.remove('ed-open');
    },exit(){enterEditor(seed)}});
  };
  $('edPlay').onclick=()=>play();$('edReturn').onclick=returnToEdit;$('edClose').onclick=close;$('edSave').onclick=save;
  $('edBrowse').onclick=()=>panel.dataset.panel=panel.dataset.panel==='list'?'':'list';
  $('edInspect').onclick=()=>panel.dataset.panel=panel.dataset.panel==='inspector'?'':'inspector';
  $('edDefaults').onclick=()=>{edit(copy(ArenaProject.published));notice()};
  $('edExport').onclick=()=>{
    if(!validInputs())return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)+'\n'],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='arena-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  $('edImport').onclick=()=>$('edFile').click();
  $('edFile').onchange=async e=>{
    const file=e.target.files[0];e.target.value='';if(!file)return;
    try{
      if(file.size>1024*1024)throw Error('ไฟล์โปรเจกต์ใหญ่เกินไป');
      const imported=ArenaProject.validate(JSON.parse(await file.text()));
      if(state!=='editor')return;
      edit(imported);notice('นำเข้าแล้ว · กดบันทึกเพื่อใช้ใน Solo','dirty');
    }catch(error){notice(error instanceof SyntaxError?'อ่าน JSON ไม่สำเร็จ':error.message,'error')}
  };
  addEventListener('beforeunload',e=>{if(!leaving&&draft&&changed()){e.preventDefault();e.returnValue=''}});
  addEventListener('resize',()=>{dirtyFrame=true});
  addEventListener('keydown',e=>{
    if(state!=='editor'||e.target.closest?.('[data-page="files"]'))return;
    if(e.key==='Escape'&&library.picking){library.picked(null);inspect();return}
    if((e.ctrlKey||e.metaKey)&&e.code==='KeyS'){e.preventDefault();document.activeElement?.blur();save()}
    if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'&&e.target.tagName!=='INPUT'){e.preventDefault();undo()}
  });
  const library=installEditorLibrary({
    draft:()=>draft,change,save,undo,notice,select,meteor:()=>setMode('meteor'),
    play(kit){returnToLibrary=true;play(kit)},
    pick(point){
      if(mode!=='mobs')setMode('mobs');
      panel.dataset.panel='';focusAt(point.x,point.y);updateRing(point,false,38);stage.classList.add('ed-aim');
      $('edHint').textContent=ArenaLanguage.language==='en'?'Tap the ground to select a position':'แตะพื้นเพื่อเลือกตำแหน่ง';
    }
  });
  return {open,frame,returnToEdit,get zoom(){return zoom},get testing(){return testing}};
})();
