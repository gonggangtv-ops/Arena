// Spawn rules used by both room peers. The world seed determines creatures and
// the host's separate match roll determines treasure locations on that world.
const ArenaPopulation=(()=>{
  const bases=Object.keys(CREEPS).filter(k=>!CREEPS[k].pet&&!['boss','overlord','snowqueen'].includes(k));
  const stride=32,maxTypes=128,maxUnits=256,maxRadius=4000;
  // Generated camps start at 100; the night horde starts at 100000.
  const firstId=type=>50000+(Number(type)-1)*stride;
  const pointKey=(x,y)=>x+','+y;
  const overlap=(x,y,r,p)=>((p.x-x)**2+(p.y-y)**2)<(r+p.r)**2;
  function groundFree(x,y,r,ignore){
    if(x<r||y<r||x>WORLD-r||y>WORLD-r||sdfAt(x,y)<r||inWater(x,y))return false;
    return !forObstacles(x,y,r,o=>{
      if(o.c!==1)return circRect(x,y,r,o);
      return !(o.r===26&&ignore?.has(pointKey(o.x,o.y)))&&overlap(x,y,r,o);
    });
  }
  function moveObject(w,group,obj,x,y,rock){
    obj.x=x;obj.y=y;
    if(rock){rock.x=x;rock.y=y}
    if(group!=='boxes'&&group!=='items')return;
    const h=houseAt(obj),c=caveAt(obj);
    if(h)obj.house=w.houses.indexOf(h);else delete obj.house;
    if(c)obj.cave=w.caves.indexOf(c);else delete obj.cave;
  }
  function hasScatter(policy){return !!policy&&(policy.radius>0||Object.values(policy.boxes).some(v=>v>0))}
  function approach(box,r,ignore,occupied=[]){
    const house=houseAt(box);
    for(let j=0;j<16;j++){
      const a=(box.a||0)+j*Math.PI/8,x=box.x+Math.cos(a)*58,y=box.y+Math.sin(a)*58;
      if(groundFree(x,y,r,ignore)&&(!house||inRect({x,y},house,0))&&
        !occupied.some(q=>overlap(x,y,r,q))&&
        !WD.boxes.some(b=>b.id!==box.id&&(x-b.x)**2+(y-b.y)**2<=58**2))return {x,y,a,r};
    }
    return null;
  }
  function scatter(w,policy,roll,sameMap){
    if(!Number.isInteger(roll)||!hasScatter(policy))return;
    w.lootSeed=roll;
    const rocks=new Map(),positions=[];
    for(const rock of w.rocks)if(rock.prop&&rock.r===26)rocks.set(pointKey(rock.x,rock.y),rock);
    // Old locations stay reserved until every chest has a safe destination. This
    // also preserves a fallback for any chest surrounded by walls or water.
    const reserved=[...w.mobs.map(m=>({x:m.x,y:m.y,r:CREEPS[m.kind].r})),
      ...w.npcs.map(p=>({x:p.x,y:p.y,r:20})),...w.spawns.map(p=>({x:p.x,y:p.y,r:26})),
      ...w.items.map(p=>({x:p.x,y:p.y,r:8}))];
    // Preserve an interaction spot at every fallback, including chests opted out of scattering.
    for(const b of w.boxes){
      const spot=approach(b,26);if(spot)reserved.push({...spot,r:33,owner:b.id});
    }
    for(const b of w.boxes){
      const radius=(sameMap?policy.boxes[b.id]:undefined)??policy.radius;
      if(!radius)continue;
      const from=pointKey(b.x,b.y),rock=rocks.get(from);if(!rock)continue;
      const ignore=new Set([from]),rng=mulberry32(roll^w.seed^Math.imul(b.id+1,0x9e3779b1));
      const occupied=reserved.filter(q=>q.owner!==b.id);
      const height=heightAt(b.x,b.y),dungeon=inDG(b);
      const room=dungeon&&w.dg.rooms.find(r=>inRect(b,r));
      const reach=b.vault?Math.min(radius,180):radius;
      for(let attempt=0;attempt<48;attempt++){
        const a=rng()*Math.PI*2,d=Math.sqrt(rng())*reach;
        const x=Math.round(b.x+Math.cos(a)*d),y=Math.round(b.y+Math.sin(a)*d);
        if(Math.hypot(x-b.x,y-b.y)>radius||!groundFree(x,y,26,ignore))continue;
        const p={id:b.id,x,y,r:26,a:b.a};
        if(inDG(p)!==dungeon||room&&!inRect(p,room,-26)||Math.abs(heightAt(x,y)-height)>75)continue;
        if(b.vault===2&&!fortIn(x,y,0)||b.vault===3&&!townIn(x,y,0))continue;
        if(occupied.some(q=>overlap(x,y,26,q)))continue;
        const standing=approach(p,26,ignore,occupied);if(!standing)continue;
        moveObject(w,'boxes',b,x,y,rock);b.a=standing.a;
        reserved.push(p,{...standing,r:33});positions.push([b.id,x,y,b.a]);break;
      }
    }
    if(positions.length){buildCollide(w);w.authoredLayout=(w.authoredLayout||'')+'|'+JSON.stringify(positions)}
  }

  function populate(w,types,strict){
    if(!types||!Object.keys(types).length)return;
    const fieldCamps=w.camps.filter(c=>['small','medium','large','ancient'].includes(c.tier));
    const anchors=fieldCamps.length?fieldCamps:w.spawns;
    const occupied=[...w.mobs.map(m=>({x:m.x,y:m.y,r:CREEPS[m.kind].r})),
      ...w.spawns.map(p=>({...p,r:26})),...w.npcs.map(p=>({...p,r:20}))];
    for(const [type,spec] of Object.entries(types)){
      const r=Math.ceil(CREEPS[spec.kind].r*1.18); // Leave room for the regional elite variant.
      for(let slot=0;slot<spec.count;slot++){
        const id=firstId(type)+slot,rng=mulberry32(w.seed^Math.imul(id,0x9e3779b1));
        const start=Math.floor(rng()*anchors.length);
        let point;
        for(let i=0;i<anchors.length&&!point;i++){
          const anchor=anchors[(start+i)%anchors.length];
          for(let j=0;j<12;j++){
            const a=rng()*Math.PI*2,d=90+rng()*230;
            const x=Math.round(anchor.x+Math.cos(a)*d),y=Math.round(anchor.y+Math.sin(a)*d);
            if(groundFree(x,y,r)&&!occupied.some(o=>overlap(x,y,r+8,o))){point={x,y};break}
          }
        }
        if(!point){
          if(strict)throw Error('หาพื้นที่สำหรับมอนสเตอร์ใหม่ไม่ได้');
          continue;
        }
        const camp=w.camps.length;
        w.mobs.push({...point,id,camp,kind:spec.kind,encounter:type,undead:ZK.includes(spec.kind)});
        w.camps.push({...point,id:camp,tier:'custom',mem:[id],maxRespawn:99});
        occupied.push({...point,r});
      }
    }
  }
  return {bases,stride,maxTypes,maxUnits,maxRadius,firstId,pointKey,groundFree,moveObject,approach,hasScatter,scatter,populate};
})();
