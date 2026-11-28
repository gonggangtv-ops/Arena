// Solo practice possesses the actual camp actor. Its opponents are heroes on one team.
const ArenaBossTrial=(()=>{
  const picker=$('bossTrialPicker'),hud=$('bossTrialHud'),form=$('btForm'),phaseMenu=$('btPhase');
  const names={snowqueen:'ราชินีหิมะ',overlord:'จอมราชันย์สุริยคราส',boss:'ไททันลาวาบรรพกาล'};
  const tint={snowqueen:'#aee0f5',overlord:'#d3b5f4',boss:'#ffb88c'};
  // Each entry maps a physical key to a move in the boss's existing attack routine.
  const kits={
    snowqueen:[['basic','J','ฟาดคทา'],['lance','Q','หอกน้ำแข็ง'],['shards','E','ฝนผลึก',900],['blink','R','ก้าวเหมันต์',460],['nova','F','โนวาน้ำแข็ง'],['blizz','Z','พายุหิมะ',800],['prison','X','คุกน้ำแข็ง',650],['winter','V','ฤดูหนาวนิรันดร์']],
    overlord:[['basic','J','ฟันดาบ'],['slash','Q','คมดาบจันทรา'],['heavy','E','ดาบพิพากษา',520],['burst','R','ระเบิดคราส'],['summon','F','เรียกผู้เฝ้ายาม'],['rain','Z','ฝนอุกกาบาตคราส',900],['cage','X','กรงสุญญะ',700],['ult','V','สุริยคราสเต็มดวง']],
    boss:[['basic','J','ทุบประชิด'],['breath','Q','พ่นไฟลาวา'],['slam','E','ทุบปฐพี']]
  };
  const challengers=[['ผู้ท้าชิงโล่เงิน','sword',0],['ผู้ท้าชิงคันศร','bow',2],['ผู้ท้าชิงอัคคี','fire',3]];
  const phases=['I','II','III'];
  const tr=s=>ArenaLanguage.text(s);
  let source=null,boss=null,party=[],buttons=[],command=null,marked=null,held=false,stickId=null,stickX=0,stickY=0;
  let starting=false,finished=false,startPhase=0,shownPhase=-1,lastTarget=null,hudTime=0;
  const loading=$('loading'),aimMark=$('btAimMark');
  const selectedKind=()=>form.elements.trialBoss.value;
  function available(kind,phase){
    const cooldowns=kind==='snowqueen'?CREEPS.snowqueen.phaseCooldowns[phase]:kind==='overlord'?OVC[['A','B','C'][phase]]:null;
    return kits[kind].filter(([move])=>move==='basic'||!cooldowns||Object.hasOwn(cooldowns,move));
  }
  function preview(){
    const kind=selectedKind();
    $('btPhaseField').hidden=kind==='boss';
    $('btKit').textContent=available(kind,Number(phaseMenu.value)).map(row=>tr(row[2])).join(' · ');
  }
  function open(options){
    if(starting||picker.open||net.mode!=='solo'||!loading.classList.contains('hidden')||!MoonfallLoading.isReady())return;
    if(state!=='bossTrial'){
      if(state!=='menu'&&state!=='editor')return;
      const project=options?.project||ArenaProject.forMatch();
      source={...options,project,seed:options?.seed??project.seed??WD.seed};
      form.elements.trialBoss.value=options?.kind||'snowqueen';phaseMenu.value='2';
    }else{form.elements.trialBoss.value=boss.kind;phaseMenu.value=String(startPhase)}
    clearInput();preview();picker.showModal();
  }
  function clearInput(){
    command=null;held=false;joy=null;atkHeld=false;keys={};ptrs.clear();resetStick();
  }
  function resetStick(){stickId=null;stickX=stickY=0;$('btStick').firstElementChild.style.transform=''}
  function releaseActors(){
    if(boss&&R3.objs){
      // Rig clones own bone textures and status materials. Their meshes and PBR maps are shared.
      for(const u of units){
        const o=R3.objs.get(u.id);
        if(!o||o.u!==u)continue;
        o.mixer?.stopAllAction();
        const skeletons=new Set();
        o.root.traverse(n=>{
          if(n.isSkinnedMesh)skeletons.add(n.skeleton);
          if(n.userData.ownMat){
            const materials=Array.isArray(n.material)?n.material:[n.material];
            for(const m of materials)m?.dispose();
          }
        });
        for(const skeleton of skeletons)skeleton.dispose();
        o.root.removeFromParent();R3.objs.delete(u.id);R3._eclSet?.delete(o);
      }
    }
    aimMark.hidden=true;
    // Telegraph reactions retain their target until their due game time.
    R3.clearEncounterScreen?.();R3.clearFortFrost?.();
    FEEL.clearReactions();ERUPT.length=0;tickHeroes.length=HEROES.length=0;
    clearInput();marked=null;lastTarget=null;
  }
  function spawnNear(unit,index){
    const base=Math.atan2(unit.home.y-WD.spawns[0].y,unit.home.x-WD.spawns[0].x)+index*Math.PI*2/3;
    const height=heightAt(unit.x,unit.y);
    for(const distance of [315,245,395,175,480,115,575])for(let i=0;i<32;i++){
      const a=base+(i%2?1:-1)*Math.ceil(i/2)*Math.PI/16;
      const p={x:unit.x+Math.cos(a)*distance,y:unit.y+Math.sin(a)*distance};
      if(!blockedAt(p,32)&&!inWater(p.x,p.y)&&!houseAt(p)&&Math.abs(heightAt(p.x,p.y)-height)<65&&
        party.every(h=>dist(h,p)>80)&&losClear(unit.x,unit.y,p.x,p.y))return p;
    }
    throw Error(tr('หาจุดยืนสำหรับผู้ท้าชิงไม่ได้'));
  }
  function setup(){
    const kind=selectedKind(),ph=kind==='boss'?0:Number(phaseMenu.value);startPhase=ph;
    releaseActors();
    setupWorld(source.seed,undefined,source.project);buildNav();
    const original=WD.mobs.find(m=>m.kind===kind&&m.id===source.actorId)||WD.mobs.find(m=>m.kind===kind);
    if(!original)throw Error(tr('ไม่พบบอสในแผนที่นี้'));
    boss=UMAP.get(original.id);units=[boss];UMAP=new Map([[boss.id,boss]]);myId=boss.id;
    boss.ctrl='host';boss.ph=ph;boss.cds={};boss.busyT=0;boss.brT=boss.slT=0;
    if(ph)boss.hp=Math.floor(boss.maxHp*(kind==='snowqueen'?(3-ph)/3:ph===1?.7:.35));
    party=[];items=[];gameT=90;
    for(const [i,[name,wk,look]] of challengers.entries()){
      const p=spawnNear(boss,i),h=mkHero(i+1,tr(name),null,look,1);
      h.wk=wk;h.wt=1;h.wv=0;h.bot=true;h.lvl=4;h.skl=[1,0,0];h.pts=0;recalc(h,true);
      h.x=h.tx=p.x;h.y=h.ty=p.y;h.atkCd=.9+i*.35;h.ai.t=2+i*.5;
      addUnit(h);party.push(h);
    }
    alive=party.length;Object.assign(zone,{x:boss.x,y:boss.y,tx:boss.x,ty:boss.y,r:WORLD,tr:WORLD,st:'done'});
    DROP.st='off';DROP.fall=null;announce=null;CUR.open=false;UI.bagOpen=false;
    R3.tx=boss.x;R3.ty=boss.y;R3.ly=heightAt(boss.x,boss.y);
    cam.x=boss.x-W/(2*Z);cam.y=boss.y-H/(2*Z);
    if(view3D&&has3D()&&R3.ok)R3.sync();
  }
  function start(){
    if(!source||starting||net.mode!=='solo'||!loading.classList.contains('hidden'))return;
    starting=true;const wasActive=state==='bossTrial';
    picker.close();AU.init();AU.play('click');
    if(!wasActive)source.enter?.();
    showOnly(null);hud.hidden=true;
    withLoading(()=>{
      try{
        setup();state='bossTrial';finished=false;shownPhase=-1;hudTime=0;hud.hidden=false;
        $('btResult').hidden=true;$('btLeave').textContent=tr(source.exit?'กลับไปแก้ไข':'กลับเมนู');
        hud.style.setProperty('--bt-tint',tint[boss.kind]);$('btName').textContent=tr(names[boss.kind]);
        syncHud();hud.focus({preventScroll:true});
      }catch(error){
        const message=error.message;leave();
        if(state==='menu')menuMsg(message);else if(state==='editor')$('edStatus').textContent=message;
      }finally{starting=false}
    });
  }
  function leave(){
    picker.close();hud.hidden=true;releaseActors();buttons=[];$('btActions').replaceChildren();
    const exit=source?.exit;source=null;party=[];boss=null;finished=false;myId=0;
    units=[];UMAP.clear();aoes=[];projs=[];fxq=[];parts=[];texts=[];swings=[];shakeA=0;TGT.t=0;
    if(exit){exit();return}
    R3.menuReady=0;R3.menuQueued=0;showMenu();AU.pickMusic();$('bossTrialBtn')?.focus({preventScroll:true});
  }
  function target(){
    if(marked&&!marked.dead)return marked;
    let nearest=null,best=Infinity;
    for(const h of party)if(!h.dead){const d=dist(boss,h);if(d<best){best=d;nearest=h}}
    return nearest;
  }
  function timeLeft(move){
    if(move==='basic')return boss.atkCd;
    if(move==='breath')return boss.brT;
    if(move==='slam')return boss.slT;
    return boss.cds[move]||0;
  }
  function request(move){
    if(!boss||boss.dead||finished||picker.open||starting)return;
    if(buttons.some(b=>b.move===move)&&timeLeft(move)<=0)command=move;
  }
  function control(u,dt){
    const input=localInput(),enemy=target();
    u.busyT=Math.max(0,u.busyT-dt);u.aggro=enemy;
    let move=command;command=null;
    if(!move&&(held||keys.KeyJ||keys.Space&&document.activeElement===hud))move='basic';
    if(u.stunT>0||u.kb)move=null;
    if(enemy){
      const range=kits[u.kind].find(row=>row[0]===move)?.[3],t=range&&dist(u,enemy)>range?clampTo(u,enemy,range):enemy;
      const d=dist(u,t),ang=Math.atan2(t.y-u.y,t.x-u.x);
      if(move&&u.busyT<=0){u.fx=Math.cos(ang);u.fy=Math.sin(ang)}
      if(u.kind==='boss'){
        u.brT-=dt;u.slT-=dt;
        if(u.fw)return FEEL.tickWind(u,dt);
        if(move&&u.busyT<=0&&timeLeft(move)<=0){
          if(move==='basic')FEEL.startWind(u,enemy);
          else titanCast(u,move,ang);
        }
      }else{
        const act=u.kind==='snowqueen'?ECL_EXT.queen.act:overlordAct;
        act(u,t,d,u.range+enemy.r,dt,move);
      }
    }
    const mx=input.mx+stickX,my=input.my+stickY,len=Math.max(1,Math.hypot(mx,my));
    const scale=u.qBlink||u.fw?0:u.busyT>0?.15:1;
    return {mx:mx/len*scale,my:my/len*scale};
  }
  function challenger(u,dt){
    const d=dist(u,boss),stop=u.range+(u.melee?boss.r*.7:0);
    if(!boss.dead&&u.stunT<=0){
      if(d<=u.range+boss.r)basic(u,boss);
      u.ai.t-=dt;if(u.ai.t<=0){u.ai.t=2.5;aiSkills(u,boss,d,u.hp/u.maxHp)}
    }
    if(u.ai.dodge?.t>0){const dodge=u.ai.dodge;dodge.t-=dt;return {mx:dodge.x,my:dodge.y}}
    if(d<=stop)return {mx:0,my:0};
    const dir=navDir(u,boss.x,boss.y);return {mx:dir.x,my:dir.y};
  }
  function textIfChanged(el,value){if(el.textContent!==value)el.textContent=value}
  function buildActions(){
    shownPhase=boss.ph;$('btActions').replaceChildren();
    buttons=available(boss.kind,shownPhase).map(([move,key,name])=>{
      const node=document.createElement('button'),hotkey=document.createElement('b'),label=document.createElement('span');
      node.type='button';node.dataset.move=move;label.textContent=tr(name);hotkey.textContent=key;
      node.setAttribute('aria-label',tr(name)+' ('+key+')');node.append(hotkey,label);$('btActions').append(node);
      node.onclick=e=>{request(move);if(e.detail)hud.focus({preventScroll:true})};
      if(move==='basic'){
        node.onpointerdown=e=>{node.setPointerCapture(e.pointerId);held=true};
        node.onlostpointercapture=node.onpointercancel=node.onpointerup=()=>{held=false};
      }
      return {move,key,node,hotkey};
    });
  }
  function syncHud(){
    if(shownPhase!==boss.ph)buildActions();
    const hp=$('btHp');hp.max=boss.maxHp;hp.value=Math.max(0,boss.hp);
    textIfChanged($('btHpText'),fmtN(Math.max(0,boss.hp))+' / '+fmtN(boss.maxHp));
    textIfChanged($('btPhaseNow'),boss.kind==='boss'?'':tr('เฟส')+' '+phases[boss.ph]);
    const remaining=party.filter(h=>!h.dead).length;
    textIfChanged($('btRemaining'),tr('ผู้ท้าชิง')+' '+remaining+'/'+party.length);
    const enemy=target();
    if(enemy!==lastTarget){lastTarget=enemy;textIfChanged($('btTarget'),enemy?tr('เป้าหมาย')+' · '+enemy.name:'')}
    for(const {move,key,node,hotkey} of buttons){
      const wait=Math.max(0,Math.ceil(timeLeft(move)));
      node.setAttribute('aria-disabled',String(wait>0||boss.busyT>0||finished));
      node.toggleAttribute('data-cooling',wait>0);
      textIfChanged(hotkey,wait?String(wait):key);
    }
    if(!finished&&(boss.dead||remaining===0)){
      finished=true;clearInput();$('btOutcome').textContent=tr(boss.dead?'บอสพ่ายแพ้':'พิชิตผู้ท้าชิงครบแล้ว');
      $('btResult').hidden=false;$('btRetry').focus({preventScroll:true});
    }
  }
  function frame(dt){
    if(starting||picker.open||!boss||!loading.classList.contains('hidden'))return;
    const landscape=H<=W*1.05;
    hud.classList.toggle('bt-rotate',!landscape);
    if(landscape&&!window.__pause){
      if(!finished)hostUpdate(dt);
      fxUpdate(dt);hudTime-=dt;
      if(hudTime<=0){hudTime=.08;syncHud()}
    }
    if(view3D&&has3D()&&R3.ok){$('gl').style.visibility='visible';R3.frame(dt)}else draw2D();
    const enemy=landscape&&!finished&&target(),p=enemy&&w2s(enemy.x,enemy.y);
    aimMark.hidden=!p||!p.ok||p.x<0||p.x>W||p.y<0||p.y>H;
    if(!aimMark.hidden)aimMark.style.transform='translate('+Math.round(p.x)+'px,'+Math.round(p.y)+'px)';
  }
  form.onchange=preview;form.onsubmit=e=>{e.preventDefault();start()};
  $('btCancel').onclick=()=>picker.close();
  picker.addEventListener('close',()=>{if(!starting&&state!=='bossTrial')source=null});
  $('btPick').onclick=()=>open();$('btLeave').onclick=leave;
  $('btRetry').onclick=()=>{form.elements.trialBoss.value=boss.kind;phaseMenu.value=String(startPhase);start()};
  hud.tabIndex=-1;
  const stick=$('btStick');
  function steer(e){
    if(e.pointerId!==stickId)return;
    const rect=stick.getBoundingClientRect(),dx=e.clientX-rect.left-rect.width/2,dy=e.clientY-rect.top-rect.height/2;
    const r=rect.width*.34,m=Math.max(r,Math.hypot(dx,dy));stickX=dx/m;stickY=dy/m;
    stick.firstElementChild.style.transform='translate('+stickX*r+'px,'+stickY*r+'px)';
  }
  stick.onpointerdown=e=>{if(stickId!==null)return;stickId=e.pointerId;stick.setPointerCapture(stickId);steer(e)};
  stick.onpointermove=steer;
  stick.onpointerup=stick.onpointercancel=stick.onlostpointercapture=e=>{if(e.pointerId===stickId)resetStick()};
  cv.addEventListener('pointerdown',e=>{
    if(state!=='bossTrial'||!boss||finished||picker.open)return;
    const p=screenToWorld(e.clientX,e.clientY);if(!p)return;
    let best=150;marked=null;
    for(const h of party){const d=dist(p,h);if(!h.dead&&d<best){marked=h;best=d}}
    hud.focus({preventScroll:true});
  });
  addEventListener('keydown',e=>{
    if(state!=='bossTrial'||!boss||picker.open||starting||e.altKey||e.ctrlKey||e.metaKey)return;
    if(e.code==='Escape'){e.preventDefault();open();return}
    if(finished)return;
    if(e.code==='Space'&&e.target.closest?.('button'))return;
    const entry=buttons.find(b=>e.code==='Key'+b.key||e.code==='Space'&&b.move==='basic');
    if(entry){e.preventDefault();if(!e.repeat)request(entry.move)}
    if(e.code.startsWith('Arrow'))e.preventDefault();
  });
  addEventListener('blur',()=>{if(state==='bossTrial')clearInput()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='bossTrial')clearInput()});
  return {open,frame,control,challenger};
})();
