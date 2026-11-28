// Only authored leaves are serialized. Game systems keep their original tables, array
// lengths and network IDs. Capture defaults after all weapon and boss packs install.
function createArenaCatalog(){
  const entries=[],fields=new Map();
  const integer=[0,1000000,1],positive=[.01,600],amount=[0,1000000],unit=[0,1];
  const bounds={
    atkT:[.05,60],cd:[.1,300],duration:positive,delay:[.01,20],range:[0,6000],reach:[1,6000],
    r:[1,2000],radius:[1,2000],n:[1,32,1],wolf:[0,8,1],max:[1,99,1],every:[1,100,1],
    mr:[0,.95],slowAmt:unit,slow:[0,60],heal:unit,shield:unit,haste:[0,5],crit:unit,ls:unit,
    chill:unit,mark:unit,dr:[0,.95],root:[0,120],stun:[0,120],t:positive,
    xp:integer,p:integer,perLevel:amount,dmg:amount,hp:[1,1000000],leash:[1,5000],spd:[0,2000]
  };
  function add(group,id,label){
    const entry={group,id:group+'.'+id,label,fields:[]};entries.push(entry);return entry;
  }
  function bind(entry,obj,key,code=key,limits,caption=key,rank=0){
    const value=obj[key];
    if(Array.isArray(value)){
      value.forEach((_,i)=>bind(entry,value,i,code+'.'+i,limits,caption,i+1));
      return;
    }
    const type=typeof value;
    if(type!=='number'&&type!=='string')return;
    const kind=type==='number'?'number':/^#[0-9a-f]{6}$/i.test(value)?'color':'text';
    const path=entry.id+'.'+code;
    const field={path,caption,rank,initial:value,kind,limits:limits||bounds[caption]||amount,
      write(v){obj[key]=v}};
    fields.set(path,field);entry.fields.push(field);
  }
  function bindKeys(entry,obj,keys,overrides={}){
    for(const k of keys)if(Object.hasOwn(obj,k))bind(entry,obj,k,k,overrides[k]);
  }
  const base=add('heroes','base','Base hero'),growth=add('heroes','growth','Per level');
  bindKeys(base,HB,Object.keys(HB),{spd:[1,2000]});bindKeys(growth,HG,Object.keys(HG),{hp:amount});
  const weaponKeys=['n','ic','desc','names','range','atkT','dmg','hp','mp','mpR','armor','mr','spd','ls','cleave','crit','critM','pspd','chill','col','glow'];
  for(const [id,w] of Object.entries({unarmed:FISTS,...WEAPONS})){
    bindKeys(add('weapons',id,w.n),w,weaponKeys,{hp:amount,dmg:[0,50],spd:[-.9,5]});
  }
  for(const [weapon,slots] of Object.entries(SK))slots.forEach((skill,i)=>{
    const entry=add('skills',weapon+'.'+i,WEAPONS[weapon].n+' · '+'QER'[i]+' · '+skill.n);
    bindKeys(entry,skill,['n','ic','cd','mp','range']);
    const power=SKV[weapon][i];
    for(const k of Object.keys(power))bind(entry,power,k,'power.'+k,bounds[k],k==='n'?'count':k);
  });
  for(const s of SPX.filter(Boolean)){
    const entry=add('specials',s.k,s.n);
    // Meteor's original project fields and its 3D inspector share a single override.
    const dedicated=['cd','baseDamage','radius','delay'];
    bindKeys(entry,s,Object.keys(s).filter(k=>k!=='k'&&(s!==METEOR||!dedicated.includes(k))));
  }
  for(const [id,d] of Object.entries(CREEPS)){
    bindKeys(add('creatures',id,d.name),d,['name','hp','dmg','armor','spd','r','atkT','range','xp','col','leash']);
  }
  for(const [id,rows] of [['snowqueen',CREEPS.snowqueen.phaseCooldowns],['overlord',Object.values(OVC)]]){
    rows.forEach((row,i)=>{
      const e=add('bosses',id+'.'+i,CREEPS[id].name+' · '+(i+1));
      for(const k of Object.keys(row))bind(e,row,k,k,positive);
    });
  }
  ARMORS.forEach((a,i)=>bindKeys(add('equipment','armor'+i,a.n),a,['n','ic','c','hp','mr','armor','spd','regen'],{spd:[-.9,5]}));
  TIERS.forEach((t,i)=>bindKeys(add('equipment','tier'+i,t.n),t,['n','c','m','sa']));
  LEG.filter(Boolean).forEach(l=>bindKeys(add('equipment',l.key,l.n),l,['n','c','every']));
  ITEMS.forEach(it=>bindKeys(add('items',it.id,it.name),it,['name','ic','w'],{w:[.01,10000]}));
  BAG.forEach(b=>bindKeys(add('items','bag-'+b.k,b.n),b,['n','ic','d','cd','max']));
  bindKeys(add('economy','shop','Shop prices'),SHOP_RATES,Object.keys(SHOP_RATES),Object.fromEntries(Object.keys(SHOP_RATES).map(k=>[k,integer])));
  const coins=add('economy','coins','Coins per monster');
  for(const k of Object.keys(COIN))bind(coins,COIN,k,k,[1,1000000,1],CREEPS[k]?.name||k);
  // Other game code reads these scalar bindings directly, including the HUD and bots.
  const rules={
    get day(){return DAY},set day(v){DAY=v},get night(){return NIGHT},set night(v){NIGHT=v},
    get fusion(){return FUSE_AT},set fusion(v){FUSE_AT=v},get dash(){return DASH_CD},set dash(v){DASH_CD=v},
    get pvp(){return PVP_K},set pvp(v){PVP_K=v},get skill(){return SKILL_K},set skill(v){SKILL_K=v},
    get critical(){return CRIT_BASE},set critical(v){CRIT_BASE=v}
  };
  bindKeys(add('rules','match','Match rules'),rules,Object.keys(rules),
    {day:[1,3600],night:[1,3600],fusion:[1,3600],dash:[.1,300],pvp:[0,10],skill:[0,10],critical:unit});
  PHASES.forEach((p,i)=>bindKeys(add('circle',String(i),'Phase '+(i+1)),p,['w','s','r'],{w:[.1,3600],s:[.1,3600],r:[0,9400]}));
  REG.N.forEach((name,i)=>{
    const entry=add('regions',String(i),name);
    for(const [key,arr] of [['name',REG.N],['ic',REG.IC],['tip',REG.TIP]])bind(entry,arr,i,key,null,key);
    const light=window.ArenaRegions?.atmosphere[i];
    if(light)bindKeys(entry,light,Object.keys(light).filter(k=>light[k]!==null&&(i!==0||k!=='fogD')),
      {lift:[-1,1],gain:[0,4],fogD:[0,.02],hl:unit,mist:[0,5],ap:[0,5],bloom:[0,5],hemiK:[0,5],sunK:[0,5],vig:unit,con:[0,5],sat:[0,5]});
  });
  const music=add('audio','music','Music volume'),ambience=add('audio','ambience','Ambient volume');
  for(const k of Object.keys(MUS_VOL))bind(music,MUS_VOL,k,k,unit);
  for(const k of Object.keys(AMB_VOL))bind(ambience,AMB_VOL,k,k,unit);

  function validate(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw Error('รูปแบบข้อมูลเกมไม่ถูกต้อง');
    const result={};
    for(const [path,v] of Object.entries(input)){
      const f=fields.get(path);
      if(!f)throw Error('ไม่พบคุณสมบัติในเกม · '+path);
      const [min,max,step]=f.limits;
      const valid=f.kind==='number'?Number.isFinite(v)&&v>=min&&v<=max&&(step!==1||Number.isInteger(v)):
        typeof v==='string'&&(f.kind==='color'?/^#[a-f0-9]{6}$/i.test(v):v.trim().length>0&&v.length<=512&&!/[<>&"'\x00-\x1f]/.test(v));
      if(!valid)throw Error('ค่าไม่ถูกต้อง · '+path);
      if(v!==f.initial)result[path]=v;
    }
    for(let i=1;i<PHASES.length;i++){
      const radius=j=>result['circle.'+j+'.r']??fields.get('circle.'+j+'.r').initial;
      if(radius(i)>radius(i-1))throw Error('รัศมีวงบีบต้องลดลงหรือเท่าเดิมในแต่ละช่วง');
    }
    return result;
  }
  let applied={};
  function activate(next={}){
    let palette=false;
    for(const path of new Set([...Object.keys(applied),...Object.keys(next)])){
      const f=fields.get(path),v=next[path]??f.initial;
      if(v===(applied[path]??f.initial))continue;
      f.write(v);
      if(AU.ctx&&(path==='audio.music.'+AU.musCur||path==='audio.ambience.'+AU.ambCur))AU.fade(path.split('.')[2],v);
      if(path.startsWith('regions.'))palette=true;
    }
    if(palette)window.ArenaRegions?.refreshPalette();
    applied={...next};
  }
  return {entries,fields,validate,activate};
}

// A player using the default project needs none of the inspector's field descriptors.
const ArenaCatalog=(()=>{
  let catalog;
  const get=()=>catalog??=createArenaCatalog();
  const empty=o=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===0;
  return {
    get entries(){return get().entries},get fields(){return get().fields},
    validate(o){return empty(o)?{}:get().validate(o)},
    activate(o={}){if(catalog||!empty(o))get().activate(o)}
  };
})();
