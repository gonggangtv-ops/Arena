// Authoring data shared by the editor, world setup, monster factory and skill tables.
// Instance IDs belong to one generated world. Room clients use the build's project.
const ArenaProject=(()=>{
  const key='muzcruor.editor.project.v1';
  const statRanges={hp:[1,1000000],dmg:[0,10000],leash:[1,5000]};
  const skillRanges={baseDamage:[0,10000],radius:[12,1200],delay:[.1,8]};
  const cooldownRange=[.1,300];
  const defaults={baseDamage:METEOR.baseDamage,radius:METEOR.radius,delay:METEOR.delay,cd:METEOR.cd.slice()};
  function check(ok){if(!ok)throw Error('รูปแบบโปรเจกต์หรือค่าอยู่นอกช่วงที่รองรับ')}
  function record(o){check(o&&typeof o==='object'&&!Array.isArray(o));return o}
  function number(n,[min,max]){check(Number.isFinite(n)&&n>=min&&n<=max);return n}
  function fields(o,ranges){
    const result={};
    for(const [k,v] of Object.entries(record(o))){
      check(Object.hasOwn(ranges,k));result[k]=number(v,ranges[k]);
    }
    return result;
  }
  function validate(data){
    record(data);check(data.version===1);
    const seed=data.seed;
    check(seed===null||Number.isInteger(seed)&&seed>=0&&seed<=2147483647);
    const project={version:1,seed,kinds:{},spawns:{},meteor:{}};
    for(const [kind,stats] of Object.entries(record(data.kinds))){
      check(Object.hasOwn(CREEPS,kind));project.kinds[kind]=fields(stats,statRanges);
    }
    for(const [id,entry] of Object.entries(record(data.spawns))){
      record(entry);check(typeof entry.kind==='string'&&seed!==null&&/^\d{1,8}$/.test(id)&&Object.hasOwn(CREEPS,entry.kind));
      const spawn={kind:entry.kind};
      if(entry.position!==undefined){
        check(Array.isArray(entry.position)&&entry.position.length===2);
        spawn.position=entry.position.map(v=>number(v,[0,WORLD]));
      }
      if(entry.stats)spawn.stats=fields(entry.stats,statRanges);
      project.spawns[id]=spawn;
    }
    const {cd,...skill}=record(data.meteor);
    project.meteor=fields(skill,skillRanges);
    if(cd!==undefined){
      check(Array.isArray(cd)&&cd.length===3);
      project.meteor.cd=cd.map(v=>number(v,cooldownRange));
    }
    return project;
  }
  const published=validate(ARENA_PUBLISHED_PROJECT);
  let current=published;
  function read(){
    const raw=localStorage.getItem(key);
    return raw===null?published:validate(JSON.parse(raw));
  }
  function forMatch(){
    if(net.mode==='solo'){try{return read()}catch{}}
    return published;
  }
  function activate(project){
    current=project;
    Object.assign(METEOR,defaults,project.meteor);
  }
  function instance(m){
    if(WD?.seed!==current.seed)return null;
    const spawn=current.spawns[m.id];
    return spawn?.kind===m.kind?spawn:null;
  }
  function definition(m){
    const base=CREEPS[m.kind],kind=current.kinds[m.kind],stats=instance(m)?.stats;
    return kind||stats?Object.assign({},base,kind,stats):base;
  }
  function place(w,m,x,y){
    m.x=x;m.y=y;
    const camp=w.camps[m.camp];
    if(camp?.mem.length===1){camp.x=x;camp.y=y}
    if(w.fort?.queen===m.id){w.fort.home={x,y}}
  }
  function canPlace(m,x,y){
    return Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=WORLD&&y>=0&&y<=WORLD&&
      !blockedAt({x,y},CREEPS[m.kind].r)&&!inWater(x,y);
  }
  function placeSpawns(w){
    if(w.seed!==current.seed)return;
    for(const m of w.mobs){
      const pos=instance(m)?.position;
      if(pos&&canPlace(m,...pos))place(w,m,...pos);
    }
  }
  return {published,defaults,statRanges,skillRanges,cooldownRange,validate,read,forMatch,activate,definition,canPlace,place,placeSpawns,
    save(project){localStorage.setItem(key,JSON.stringify(validate(project)))}};
})();
