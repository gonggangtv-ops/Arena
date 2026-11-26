// Executed in the live Arena page after the photographed cast.
() => {
  const field=R3._fx2.meteorField,position=R3.terrain.geometry.attributes.position;
  const sameGround=()=>__bedStart.every((value,i)=>value===position.array[i]);
  const groups=()=>R3.scene.children.filter(g=>g.name==='Meteor impact');
  const visible=()=>groups().filter(g=>g.visible);
  const check=(ok,message)=>{if(!ok)throw Error(message)};
  let depression=0,lift=0;
  for(let i=1;i<position.array.length;i+=3){
    const d=position.array[i]-__bedStart[i];depression=Math.min(depression,d);lift=Math.max(lift,d);
  }
  check(depression< -10&&lift>3,'missing displaced bowl or rim');
  check(__terrainLogic===heightAt(__cast.x,__cast.y),'collision height changed');
  for(let i=0;i<90;i++)field.step(.1);
  check(sameGround()&&visible().length===0,'cooldown did not restore the complete terrain buffer');

  const h=ME();Object.assign(h,{wk:'fire',wt:2,mp:9000,stunT:0,fuseT:0,skl:[1,1,1],cd:[0,0,0]});
  check(cast(h,2,{x:__cast.x,y:__cast.y}),'staff cast rejected');
  const staff=aoes.find(a=>a.kind==='meteor'&&a.owner===h&&a.el==='fire');
  check(staff&&staff.delay===.85,'staff Meteor signature');
  const castRecord={r:staff.r,damage:staff.dmg,delay:staff.delay,cooldown:h.cd[2]};
  const sample=(x,z)=>({...staff,x,y:z,t:.90,done:true});
  const materials=[];
  // Read actual zone/water/deck classification at five dry sites, water and a real bridge.
  const sites=new Map();
  for(let y=1800;y<WORLD-1800&&sites.size<6;y+=330)for(let x=1800;x<WORLD-1800&&sites.size<6;x+=330){
    if(onBridge(x,y)||inDG({x,y})||Math.abs(R3.gY(x,y))>85)continue;
    const zone=REG.at(x,y),wet=inWater(x,y),key=wet?(zone===2?null:'water'):zone;
    if(key!==null&&!sites.has(key))sites.set(key,[x,y]);
  }
  const bridge=WD.bridges.find(b=>!b.dock);sites.set('deck',[bridge.x,bridge.y]);
  for(const [zone,[x,z]] of sites){
    field.track(sample(x,z),.03);field.step(.03);
    const g=visible()[0],ground=g.children.find(o=>o.material?.uniforms?.deckSize);
    const u=ground.material.uniforms,crust=g.children.find(o=>o.geometry?.attributes.aHot);
    materials.push({zone,tint:u.rim.value.getHexString(),cooling:u.cooling.value,crust:crust.visible});
    check(zone==='deck'?u.deckSize.value.x>0:zone==='water'?u.wet.value===1:crust.visible,'wrong surface response '+zone);
    field.reset();check(sameGround(),'region failed to restore '+zone);
  }
  check(sites.size===7&&new Set(materials.map(m=>m.tint)).size===7,'surface coverage');
  // Force simultaneous impacts (including coincident centers) then recycle the slots.
  const limit=R3.hi&&!R3.mobile?5:3;
  for(let pass=0;pass<4;pass++){
    for(let i=0;i<limit+3;i++)field.track(sample(__cast.x+(i%3)*20,__cast.y),.03);
    field.step(.03);check(visible().length===limit,'pool cap');
    for(let i=0;i<80;i++)field.step(.1);
    check(sameGround()&&!visible().length,'overlap restoration');
  }
  check(groups().length===limit,'pool expanded between casts');

  // The wire carries age, delay, radius and element but no AOE object identity.
  // Start from a real staff AOE, serialize and decode fresh objects for each packet.
  net.tr={kind:'peer'};net.mode='host';
  const packet=snapFor(h.ctrl,{q:[],ea:0},16000);
  packet.o=[aoeRow(staff)];net.mode='client';net.lastN=0;
  const ages=[.2,.4,.65,.8,.9,.9,1.1],base=gameT;
  let release=0,hits=0,lastCrust=false;
  for(let i=0;i<ages.length;i++){
    const t=ages[i];packet.n=i+1;packet.g=base+t;packet.o[0][3]=t;
    applySnap(JSON.parse(JSON.stringify(packet)));
    const a=aoes[0];check(a&&a.kind==='meteor','invalid network replica');
    const wire=JSON.stringify(aoeRow(a));
    const hp=ME().hp;field.track(a,.03);field.step(.03);
    const [g]=visible(),crust=g.children.find(o=>o.geometry?.attributes.aHot).visible;
    check(visible().length===1&&wire===JSON.stringify(aoeRow(a))&&hp===ME().hp,'replayed impact or changed simulation');
    if(!crust)release++;
    if(crust&&!lastCrust)hits++;
    lastCrust=crust;
  }
  check(release===4&&hits===1,'snapshot phase transitions');
  const watched=new Set(),disposed=new Set(),watch=obj=>{
    if(!obj||watched.has(obj))return;watched.add(obj);obj.addEventListener('dispose',()=>disposed.add(obj));
  };
  for(const group of groups())group.traverse(o=>{
    watch(o.geometry);watch(o.material);watch(o.material?.uniforms?.faultMap?.value);if(o.isInstancedMesh)watch(o);
  });
  R3.disposeScene();
  check(sameGround()&&groups().length===0&&disposed.size===watched.size,'scene disposal');
  return {depression,lift,collisionHeight:__terrainLogic,staff:castRecord,materials,slots:limit,
    networkSnapshots:ages.length,networkImpacts:hits,restored:true,resources:watched.size,disposed:disposed.size};
}
