// These controls are packaged with the locked editor. Only their data resolver is needed by players.
function installEditorLibrary(api){
  const dialog=$('edLibrary'),category=$('edCategory'),rows=$('edDataList'),group=$('edMapGroup'),objects=$('edMapRow');
  const en=ArenaLanguage.language==='en',tr=(th,eng)=>en?eng:th;
  const pair=s=>s.split('|')[en?1:0];
  const groups={rules:'กติกาแมตช์|Match rules',heroes:'ฮีโร่|Heroes',weapons:'อาวุธ|Weapons',skills:'สกิลอาวุธ|Weapon skills',specials:'สกิลพิเศษ|Special skills',creatures:'มอนสเตอร์และอสูรอัญเชิญ|Monsters and summons',bosses:'เฟสบอส|Boss phases',equipment:'เครื่องสวมใส่และระดับ|Equipment and tiers',items:'ไอเทมและยา|Items and potions',economy:'ร้านค้าและเหรียญ|Shop and rewards',circle:'วงบีบ|Storm circle',regions:'แสงและภูมิภาค|Regions and lighting',audio:'เสียง|Audio'};
  const mapGroups={spawns:'จุดเกิดผู้เล่น (แผนที่ใหญ่)|Player spawns (large map)',npcs:'พ่อค้า|Merchants',boxes:'กล่องสมบัติ|Chests',items:'ไอเทมบนพื้น|Ground loot'};
  const names={day:'กลางวัน (วิ)|Day length (s)',night:'กลางคืน (วิ)|Night length (s)',fusion:'เวลาหลอมอาวุธ (วิ)|Fusion time (s)',dash:'คูลดาวน์พุ่ง (วิ)|Dash cooldown (s)',pvp:'ตัวคูณดาเมจ PvP|PvP damage multiplier',skill:'ตัวคูณดาเมจสกิล|Skill damage multiplier',critical:'โอกาสคริติคอล (0–1)|Critical chance (0–1)',n:'ชื่อ|Name',name:'ชื่อ|Name',desc:'คำอธิบาย|Description',d:'คำอธิบาย|Description',names:'ชื่อแต่ละระดับ|Tier names',ic:'ไอคอน|Icon',c:'สี|Color',col:'สี|Color',glow:'สีแสง|Glow color',hp:'พลังชีวิต|Health',mp:'มานา|Mana',hpR:'ฟื้นฟู HP|HP regen',mpR:'ฟื้นฟูมานา|Mana regen',dmg:'ความเสียหาย|Damage',dmg2:'ความเสียหายครั้งที่สอง|Follow-up damage',gd:'ความเสียหายของผู้พิทักษ์|Guardian damage',bs:'โจมตีจากเงา|Backstab damage',sh:'พลังโล่|Shield points',baseDamage:'ดาเมจพื้นฐาน|Base damage',perLevel:'ดาเมจต่อเลเวล|Damage per level',armor:'เกราะ|Armor',mr:'ต้านเวท (0–1)|Magic resistance (0–1)',spd:'ความเร็ว|Speed',range:'ระยะ|Range',reach:'ระยะร่าย|Cast range',atkT:'ช่วงโจมตี (วิ)|Attack interval (s)',r:'รัศมี|Radius',radius:'รัศมี|Radius',count:'จำนวน|Count',cd:'คูลดาวน์ (วิ)|Cooldown (s)',duration:'ระยะเวลา (วิ)|Duration (s)',t:'ระยะเวลา (วิ)|Duration (s)',stun:'สตัน (วิ)|Stun (s)',root:'ตรึง (วิ)|Root (s)',heal:'สัดส่วนฟื้นฟู|Healing fraction',shield:'สัดส่วนโล่|Shield fraction',slow:'ชะลอ|Slow',slowAmt:'สัดส่วนลดความเร็ว|Slow fraction',delay:'เวลารอ (วิ)|Delay (s)',w:'น้ำหนัก|Weight',s:'เวลาบีบ (วิ)|Shrink time (s)',p:'ราคาซื้อ|Price',xp:'ค่าประสบการณ์|XP reward',leash:'ระยะไล่|Leash',max:'จำนวนสูงสุด|Stack limit',level:'ซื้อเลเวล|Buy level',levelStep:'ราคาเพิ่มต่อเลเวล|Price per level',reforge:'หลอมใหม่|Reforge',reforgeStep:'ราคาเพิ่มต่อระดับ|Price per tier',fog:'สีหมอก|Fog color',fogD:'ความหนาหมอก|Fog density',hemi:'สีแสงท้องฟ้า|Sky color',sun:'สีแสงอาทิตย์|Sun color',sunK:'ความเข้มแสงอาทิตย์|Sun intensity',hemiK:'ความเข้มแสงท้องฟ้า|Sky intensity',bloom:'แสงฟุ้ง|Bloom',sat:'ความอิ่มสี|Saturation',con:'คอนทราสต์|Contrast',vig:'ขอบมืด|Vignette',mist:'หมอกภาคพื้น|Ground mist',ap:'หมอกระยะไกล|Aerial haze',lift:'สีเงา RGB|Shadow RGB',gain:'สีสว่าง RGB|Highlight RGB',tip:'คำอธิบายพื้นที่|Region tip',haste:'สัดส่วนความเร็วโจมตี|Attack speed fraction',damageBonus:'สัดส่วนดาเมจเพิ่ม|Bonus damage fraction'};
  function option(node,value,label){node.add(new Option(label,value))}
  for(const [key,title] of Object.entries(groups))option(category,key,pair(title));
  for(const [key,title] of Object.entries(mapGroups))option(group,key,pair(title));
  function entryName(e){
    if(e.id==='rules.match')return pair(groups.rules);
    if(e.id==='heroes.base')return tr('ค่าพื้นฐานฮีโร่','Base hero');
    if(e.id==='heroes.growth')return tr('ค่าที่เพิ่มต่อเลเวล','Per level');
    if(e.group==='circle')return tr('ช่วงที่ ','Phase ')+(Number(e.id.split('.')[1])+1);
    if(e.id==='economy.shop')return tr('ราคาสินค้า','Shop prices');
    if(e.id==='economy.coins')return tr('เหรียญต่อมอนสเตอร์','Coins per monster');
    if(e.group==='audio')return e.id==='audio.music'?tr('เสียงดนตรี','Music volume'):tr('เสียงบรรยากาศ','Ambient volume');
    return ArenaLanguage.text(e.label);
  }
  let page='balance',selectedEntry=null,pickPath=null;
  function fieldName(e,f){
    if(e.group==='circle'&&f.caption==='w')return tr('เวลาก่อนบีบ (วิ)','Wait time (s)');
    if(e.group==='weapons'&&f.caption==='dmg')return tr('ตัวคูณการโจมตี','Attack multiplier');
    if(e.group==='skills'&&f.caption==='w')return tr('ความกว้าง','Width');
    if(e.id==='economy.shop'&&['hp','mp','big'].includes(f.caption))return tr('ราคายา ','Potion price · ')+f.caption.toUpperCase();
    return names[f.caption]?pair(names[f.caption]):ArenaLanguage.text(String(f.caption));
  }
  function scale(e,f){
    const key=f.caption;
    if(e.group==='heroes'||e.group==='creatures')return ['hp','dmg','hpR'].includes(key)?DS:1;
    if(e.group==='equipment'||e.group==='weapons')return key==='hp'?DS:1;
    if(e.group==='skills'||e.group==='specials')return ['dmg','dmg2','gd','bs','sh','hp','baseDamage','perLevel','burn'].includes(key)?DS:1;
    return 1;
  }
  function renderFields(){
    const entry=ArenaCatalog.entries.find(e=>e.id===rows.value),target=$('edDataFields');
    selectedEntry=entry?.id;target.replaceChildren();
    $('edDataName').textContent=entry?entryName(entry):tr('ไม่พบข้อมูล','No matching entries');
    $('edMeteorLab').hidden=entry?.id!=='specials.meteor';
    const hasRank=entry?.group==='skills'||entry?.group==='specials';
    $('edTrialKit').hidden=!entry||!hasRank&&entry.group!=='weapons';
    $('edTrialLevel').hidden=!hasRank;
    const rank=$('edTrialRank'),last=rank.value||1;rank.replaceChildren();
    if(hasRank){
      const [,id,slot]=entry.id.split('.'),levels=entry.group==='skills'?SK[id][slot].cd.length:3;
      for(let i=1;i<=levels;i++)option(rank,i,'Lv. '+i);
      rank.value=Math.min(last,levels);
    }
    if(!entry)return;
    const tuning=api.draft().tuning,fragment=document.createDocumentFragment();
    let current,previous;
    for(const f of entry.fields){
      const key=f.rank?f.path.slice(0,f.path.lastIndexOf('.')):f.path;
      if(key!==previous){
        current=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent=fieldName(entry,f);current.append(legend);fragment.append(current);previous=key;
      }
      const label=document.createElement('label'),input=document.createElement('input'),mult=scale(entry,f);
      if(f.rank)label.textContent=['gain','lift'].includes(f.caption)?'RGB'[f.rank-1]:String(f.rank);
      input.setAttribute('aria-label',fieldName(entry,f)+(f.rank?' '+f.rank:''));input.dataset.setting=f.path;input.type=f.kind;input.required=true;
      const v=tuning[f.path]??f.initial;
      if(f.kind==='number'){const [min,max,step]=f.limits;input.min=min*mult;input.max=max*mult;input.step=step?step*mult:'any';input.value=Number((v*mult).toFixed(8))}
      else{input.value=v;input.maxLength=512}
      input.onchange=()=>{
        if(!input.reportValidity())return;
        const value=f.kind==='number'?input.valueAsNumber/mult:input.value;
        if(!api.change(next=>{if(value===f.initial)delete next.tuning[f.path];else next.tuning[f.path]=value}))renderFields();
      };
      label.append(input);current.append(label);
    }
    target.append(fragment);
  }
  function filter(){
    const selected=rows.value||selectedEntry,q=$('edFindData').value.trim().toLowerCase();rows.replaceChildren();
    for(const e of ArenaCatalog.entries){
      if(e.group!==category.value||!(e.id+' '+e.label+' '+entryName(e)).toLowerCase().includes(q))continue;
      option(rows,e.id,entryName(e));
    }
    if(Array.from(rows.options).some(o=>o.value===selected))rows.value=selected;else rows.selectedIndex=0;
    renderFields();
  }
  function renderMap(){
    const index=objects.selectedIndex;objects.replaceChildren();
    for(const [i,obj] of WD[group.value].entries()){
      const detail=group.value==='items'?(ITEM_BY[obj.it]?.name||WEAPONS[obj.wk]?.n||obj.k):obj.name;
      option(objects,i,'#'+(obj.id??i)+(detail?' · '+ArenaLanguage.text(detail):''));
    }
    objects.selectedIndex=clamp(index,0,objects.length-1);coordinates();$('edMapSeed').value=WD.seed;
  }
  function coordinates(){
    chestControls();
    const obj=WD[group.value][objects.value];if(!obj)return;
    $('edMapX').value=Math.round(obj.x);$('edMapY').value=Math.round(obj.y);
  }
  const chestScope=$('edChestScope'),chestRadius=$('edChestRadius');
  chestRadius.max=ArenaPopulation.maxRadius;
  function chestControls(){
    const isChest=group.value==='boxes',single=chestScope.value==='one';
    $('edChestRules').hidden=!isChest;if(!isChest)return;
    const {boxes,radius}=api.draft().chests,id=objects.value;
    chestRadius.value=(single?boxes[id]:undefined)??radius;
    $('edChestInherit').hidden=!single;$('edChestInherit').disabled=!Object.hasOwn(boxes,id);
    $('edChestTry').disabled=!WD.boxes[id];
  }
  chestScope.onchange=chestControls;
  $('edChestApply').onclick=()=>{
    if(!chestRadius.reportValidity())return;
    if(api.change(next=>{
      if(chestScope.value==='all')next.chests.radius=chestRadius.valueAsNumber;
      else{next.seed=WD.seed;next.chests.boxes[objects.value]=chestRadius.valueAsNumber}
    }))chestControls();
  };
  $('edChestInherit').onclick=()=>{api.change(next=>{delete next.chests.boxes[objects.value]});chestControls()};
  $('edChestTry').onclick=()=>{dialog.close();api.play({chest:Number(objects.value)})};

  const creatureRecord=$('edCreatureRecord'),creatureBase=$('edCreatureBase'),creatureCount=$('edCreatureCount'),creatureName=$('edCreatureName');
  const statInputs=new Map();
  creatureCount.max=ArenaPopulation.stride;
  for(const kind of ArenaPopulation.bases)option(creatureBase,kind,ArenaLanguage.text(CREEPS[kind].name));
  for(const [key,[min,max]] of Object.entries(ArenaProject.statRanges)){
    const label=document.createElement('label'),input=document.createElement('input'),scale=['hp','dmg'].includes(key)?DS:1;
    label.textContent=pair(names[key]);input.id='edCreature-'+key;input.type='number';input.step='any';input.min=min*scale;input.max=max*scale;
    statInputs.set(key,{input,scale});label.append(input);$('edCreatureStats').append(label);
  }
  function baseHints(){
    const kind=creatureBase.value,base={...CREEPS[kind],...api.draft().kinds[kind]};
    for(const [key,{input,scale}] of statInputs)input.placeholder=String((base[key]??420)*scale);
  }
  creatureBase.onchange=baseHints;
  function showCreature(){
    const spec=api.draft().encounters[creatureRecord.value];
    creatureBase.value=spec?.kind??ArenaPopulation.bases[0];creatureCount.value=spec?.count??1;creatureName.value=spec?.name??'';
    for(const [key,{input,scale}] of statInputs)input.value=spec?.stats[key]===undefined?'':spec.stats[key]*scale;
    baseHints();
    $('edCreatureApply').textContent=spec?tr('ใช้การแก้ไข','Apply changes'):tr('เพิ่มลงแผนที่','Add to map');
    $('edCreatureFocus').disabled=$('edCreatureDelete').disabled=!spec;
  }
  function renderCreatures(selected=creatureRecord.value){
    const types=api.draft().encounters;
    creatureRecord.replaceChildren();option(creatureRecord,'',tr('สร้างชนิดใหม่','Create a monster type'));
    for(const [id,spec] of Object.entries(types))option(creatureRecord,id,spec.name+' × '+spec.count);
    creatureRecord.value=Object.hasOwn(types,selected)?selected:'';showCreature();
  }
  creatureRecord.onchange=showCreature;
  function removedSpawns(type,kind,count){
    const start=ArenaPopulation.firstId(type);
    return Object.keys(api.draft().spawns).filter(id=>id>=start&&id<start+ArenaPopulation.stride&&
      (id>=start+count||api.draft().spawns[id].kind!==kind));
  }
  $('edCreatureApply').onclick=()=>{
    if(![creatureName,creatureCount,...Array.from(statInputs.values(),s=>s.input)].every(input=>input.reportValidity()))return;
    const name=creatureName.value.trim(),kind=creatureBase.value,count=creatureCount.valueAsNumber,stats={};
    for(const [key,{input,scale}] of statInputs)if(input.value!=='')stats[key]=input.valueAsNumber/scale;
    const types=api.draft().encounters;
    let type=Number(creatureRecord.value);
    if(!type){type=1;while(Object.hasOwn(types,type))type++}
    if(type>ArenaPopulation.maxTypes||Object.entries(types).reduce((n,[id,t])=>n+(Number(id)===type?0:t.count),count)>ArenaPopulation.maxUnits){
      api.notice(tr('เพิ่มได้สูงสุด 128 ชนิด รวม 256 ตัวต่อแผนที่','Limit of 128 types and 256 monsters per map'),'error');return;
    }
    const removed=removedSpawns(type,kind,count);
    if(removed.length&&!confirm(tr('การเปลี่ยนนี้จะลบจุดเกิดและค่ารายตัวที่ใช้ต่อไม่ได้ ดำเนินการหรือไม่','Remove individual overrides that no longer match this type?')))return;
    if(api.change(next=>{
      next.encounters[type]={kind,name,count,stats};
      for(const id of removed)delete next.spawns[id];
    }))renderCreatures(String(type));
  };
  $('edCreatureFocus').onclick=()=>{dialog.close();api.select(ArenaPopulation.firstId(creatureRecord.value),true)};
  $('edCreatureDelete').onclick=()=>{
    const type=creatureRecord.value;if(!type||!confirm(tr('ลบมอนสเตอร์ชนิดนี้และจุดเกิดของมันหรือไม่','Remove this monster type and its spawns?')))return;
    const removed=removedSpawns(type,'',0);
    if(api.change(next=>{delete next.encounters[type];for(const id of removed)delete next.spawns[id]}))renderCreatures('');
  };
  function activate(name){
    page=name;
    for(const el of dialog.querySelectorAll('[data-page]'))el.hidden=el.dataset.page!==name;
    for(const btn of dialog.querySelectorAll('[data-tab]'))btn.setAttribute('aria-pressed',String(btn.dataset.tab===name));
    $('edLibrarySave').hidden=$('edLibraryUndo').hidden=name==='files';
    if(name==='balance')filter();if(name==='map')renderMap();if(name==='encounters')renderCreatures();
  }
  const valid=()=>Array.from(dialog.querySelectorAll('[data-page="balance"] input')).every(i=>i.reportValidity());
  function open(){activate(page);dialog.showModal()}
  $('edLibraryBtn').onclick=open;$('edLibraryClose').onclick=()=>dialog.close();
  dialog.querySelector('nav').onclick=e=>{if(e.target.dataset.tab)activate(e.target.dataset.tab)};
  category.onchange=()=>{$('edFindData').value='';filter()};rows.onchange=renderFields;$('edFindData').oninput=filter;
  $('edLibrarySave').onclick=()=>{if(page!=='balance'||valid())api.save()};
  $('edLibraryUndo').onclick=()=>{api.undo();activate(page)};
  $('edTryEntry').onclick=()=>{
    if(!selectedEntry||!valid())return;
    const [type,id,slot]=selectedEntry.split('.'),rank=Number($('edTrialRank').value)||1;
    const kit=type==='specials'?{special:id,rank}:{weapon:id,rank};
    if(type==='skills')kit.slot=Number(slot);
    dialog.close();api.play(kit);
  };
  $('edMeteorLab').onclick=()=>{dialog.close();api.meteor()};
  group.onchange=renderMap;objects.onchange=coordinates;
  for(const id of ['edMapX','edMapY'])$(id).max=WORLD;
  const path=()=>group.value+'.'+objects.value;
  const pinnedRules=p=>[p.spawns,p.layout,p.chests.boxes].some(o=>Object.keys(o).length);
  function clearPinned(p){p.spawns={};p.layout={};p.chests.boxes={}}
  $('edUseSeed').onclick=()=>{
    const input=$('edMapSeed');if(!input.reportValidity())return;
    const seed=input.valueAsNumber,old=api.draft();
    if(seed!==WD.seed&&pinnedRules(old)&&
      !confirm(tr('เปลี่ยนแผนที่และล้างค่ารายตัว จุดวาง และรัศมีรายกล่องของแผนที่เดิมหรือไม่','Change map and clear individual overrides, placements and per-chest radii tied to the previous seed?')))return;
    api.change(next=>{if(seed!==WD.seed)clearPinned(next);next.seed=seed});renderMap();
  };
  $('edRandomSeed').onclick=()=>{
    const old=api.draft();
    if(pinnedRules(old)&&
      !confirm(tr('ล้างค่ารายตัว จุดวาง และรัศมีรายกล่องของแผนที่นี้ แล้วสุ่มแผนที่ใหม่หรือไม่','Clear individual overrides, placements and per-chest radii, and randomize future maps?')))return;
    api.change(next=>{next.seed=null;clearPinned(next)});renderMap();
  };
  $('edMapApply').onclick=()=>{
    if(![$('edMapX'),$('edMapY')].every(i=>i.reportValidity()))return;
    const pos=[$('edMapX').valueAsNumber,$('edMapY').valueAsNumber];
    if(api.change(next=>{next.seed=WD.seed;next.layout[path()]=pos}))renderMap();
  };
  $('edMapReset').onclick=()=>{api.change(next=>{delete next.layout[path()]});renderMap()};
  $('edMapPick').onclick=()=>{
    const point=WD[group.value][objects.value];if(!point)return;
    pickPath=path();dialog.close();api.pick(point);
  };
  function picked(p){
    if(!pickPath)return false;
    pickPath=null;open();if(p){$('edMapX').value=Math.round(p.x);$('edMapY').value=Math.round(p.y)}
    return true;
  }
  const files=installEditorProjectFiles(api.notice);
  return {open,picked,get picking(){return !!pickPath},confirmFileExit:files.confirmExit};
}
