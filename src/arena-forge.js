// Arena fusion presentation runs off the existing start and completion events.
const arenaForgeEffects=new Map();
const arenaForgeMotion=matchMedia('(prefers-reduced-motion: reduce)');
const ARENA_FORGE_REVEAL=1.65;
let arenaForgeWorld=null;

function arenaForgeEvent(e){
  if(arenaForgeWorld!==WD){arenaForgeEffects.clear();arenaForgeWorld=WD;}
  const reveal=e.k==='fuse',keys=reveal?[AW[e.w]]:[AW[e.a],AW[e.b]];
  if(keys.some(key=>!WEAPONS[key]))return;
  const tiers=reveal?[e.tr??2]:[e.ta??2,e.tb??2];
  const colors=keys.map(key=>WEAPONS[key].glow||WEAPONS[key].col||'#ffcb82');
  arenaForgeEffects.set(e.id,{id:e.id,x:e.x,y:e.y,keys,tiers,colors,reveal,start:performance.now()});
}

function* arenaForgeFrames(listener,visible){
  const now=performance.now(),reduced=arenaForgeMotion.matches;
  let drawn=0;
  for(const [id,fx] of arenaForgeEffects){
    const age=(now-fx.start)/1000,u=UMAP.get(id);
    const duration=fx.reveal?ARENA_FORGE_REVEAL:FUSE_WINDUP+.16;
    if(arenaForgeWorld!==WD||age>=duration||(!fx.reveal&&u?.dead)){arenaForgeEffects.delete(id);continue;}
    const x=u?.x??fx.x,y=u?.y??fx.y;
    if(drawn>=5||!visible(x,y)||u&&listener&&!unitVisibleTo(u,ME(),listener))continue;
    drawn++;
    yield {fx,x,y,age,k:clamp(age/duration,0,1),reduced};
  }
}

function arenaForgeOrbit(j,age,k,reduced){
  const a=j*Math.PI+(reduced?.18:age*(4.2+4.5*k));
  const r=lerp(148,21,k*k);
  return {a,x:Math.cos(a)*r,z:Math.sin(a)*r,y:101+59*k+Math.sin(a)*9};
}

function makeArenaForgeTexture(kind){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const p=canvas.getContext('2d');
  if(kind!=='sigil'){
    const halo=p.createRadialGradient(128,128,0,128,128,126);
    const stops=kind==='seal'?[[0,'#1c10262b'],[.52,'#20142b55'],[.77,'#2a162799'],[.91,'#24132182'],[1,'#2c172600']]:
      [[0,'#fff'],[.12,'#fffd'],[.35,'#fff6'],[1,'#fff0']];
    for(const [at,color] of stops)halo.addColorStop(at,color);
    p.fillStyle=halo;p.fillRect(0,0,256,256);
    return canvas;
  }
  p.translate(128,128);
  p.strokeStyle='#fff';p.shadowColor='#fff9';p.shadowBlur=5;
  for(const [r,width] of [[116,2.8],[108,1],[96,1.8],[64,1.4]]){
    p.lineWidth=width;p.beginPath();p.arc(0,0,r,0,Math.PI*2);p.stroke();
  }
  for(let i=0;i<12;i++){
    p.rotate(Math.PI/6);
    p.lineWidth=1.8;p.beginPath();p.moveTo(0,-94);p.lineTo(6,-84);p.lineTo(0,-74);p.lineTo(-6,-84);p.closePath();p.stroke();
    p.lineWidth=1.1;p.beginPath();p.moveTo(-8,-111);p.lineTo(-8,-102);p.moveTo(8,-111);p.lineTo(8,-102);p.stroke();
  }
  for(const a of[0,Math.PI/6]){
    p.save();p.rotate(a);p.lineWidth=1.2;p.beginPath();
    for(let i=0;i<3;i++)p.lineTo(Math.sin(i*Math.PI*2/3)*64,-Math.cos(i*Math.PI*2/3)*64);
    p.closePath();p.stroke();p.restore();
  }
  return canvas;
}

const arenaForgeSigil=makeArenaForgeTexture('sigil');

function arenaForgeModel(renderer,key,tier){
  const T=THREE,root=new T.Group();
  const glb=FUSED[key]?null:renderer.p5WKeyFor(key,tier);
  const model=(glb&&renderer.p5WModel(glb))||renderer.weapon(key,tier);
  const bounds=new T.Box3().setFromObject(model),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
  model.position.sub(center);
  model.traverse(n=>{if(n.isMesh){n.castShadow=false;n.receiveShadow=false;}});
  root.add(model);
  root.userData.length=Math.max(1,size.x,size.y,size.z);
  return root;
}

function arenaForgeVisual(renderer,paint){
  // Three.js UUIDs and the shared particle pools use Math.random.
  const previous=Math.random;
  try{Math.random=renderer.avRand;return paint();}finally{Math.random=previous;}
}

function arenaForgeObject(renderer,key,make){
  return renderer.get(key,()=>arenaForgeVisual(renderer,make));
}

function arenaForgePlane(renderer,key){
  return arenaForgeObject(renderer,'forge-'+key,()=>{
    const texture=renderer.texC.get('forge-'+key)||renderer.ctex(key==='sigil'?arenaForgeSigil:makeArenaForgeTexture(key),true,false);
    renderer.texC.set('forge-'+key,texture);
    const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,
      blending:key==='seal'?THREE.NormalBlending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false});
    const shape=new THREE.Mesh(renderer.G.quad,material);shape.userData.ownMat=1;
    return shape;
  });
}

function drawArenaForge3D(renderer,listener){
  const radius=visionR()+105,near=(x,y)=>!listener||Math.hypot(x-listener.x,y-listener.y)<radius;
  for(const {fx,x,y,age,k,reduced} of arenaForgeFrames(listener,near)){
    const ground=renderer.gY(x,y),fade=fx.reveal?Math.pow(1-k,.75):Math.min(1,age*7);
    const color=fx.reveal?fx.colors[0]:'#efb467';
    const size=fx.reveal?340+140*Math.sqrt(k):290+56*k;
    // A shaded bed keeps the gold seal legible on snow and other bright ground.
    const bed=arenaForgePlane(renderer,'seal');bed.position.set(x,ground+3,y);bed.rotation.x=-Math.PI/2;
    bed.scale.set(size,size,1);bed.material.opacity=fade*.86;bed.renderOrder=2;
    const circle=arenaForgePlane(renderer,'sigil');circle.renderOrder=3;
    circle.position.set(x,ground+5,y);circle.rotation.set(-Math.PI/2,0,reduced?0:age*(fx.reveal?-.7:1.15));
    circle.scale.set(size,size,1);circle.material.color.set(color);circle.material.opacity=fade*(fx.reveal?.66:.46+.24*k);

    fx.keys.forEach((key,j)=>{
      const t=fx.tiers[j],weapon=arenaForgeObject(renderer,'forge-weapon-'+key+'-'+t,()=>arenaForgeModel(renderer,key,t));
      const pos=fx.reveal?{a:age*2.8,x:0,z:0,y:151+66*Math.sin(k*1.65)}:arenaForgeOrbit(j,age,k,reduced);
      weapon.position.set(x+pos.x,ground+pos.y,y+pos.z);
      weapon.rotation.set(.2,reduced?.35:pos.a+.6,fx.reveal?-.26:(j?-.52:.52)*(1-k));
      const length=fx.reveal?145*Math.min(1,.52+age*4)*(1-Math.pow(k,6)*.83):103+19*k;
      weapon.scale.setScalar(length/weapon.userData.length);
      if(!fx.reveal&&!reduced){
        for(let i=1;i<=8;i++){
          const past=Math.max(0,age-i*.028),trail=arenaForgeOrbit(j,past,past/(FUSE_WINDUP+.16),false);
          const glow=arenaForgePlane(renderer,'glow');glow.quaternion.copy(renderer.cam.quaternion);
          glow.position.set(x+trail.x,ground+trail.y,y+trail.z);
          const width=(29+17*k)*(1-i/10);
          glow.scale.set(width,width,1);glow.material.color.set(fx.colors[j]);glow.material.opacity=fade*(1-i/10)*.76;
        }
      }
    });
    if(fx.reveal){
      const beam=arenaForgePlane(renderer,'glow'),height=340+250*k;
      beam.position.set(x,ground+height*.45,y);beam.quaternion.copy(renderer.cam.quaternion);
      beam.scale.set((reduced?82:175)*(1-k*.53),height,1);beam.material.color.set(color);
      beam.material.opacity=(reduced?.17:.62)*Math.pow(1-k,2.1);
      if(!reduced)for(const side of [-1,1]){
        const blade=arenaForgePlane(renderer,'glow');
        blade.quaternion.copy(renderer.cam.quaternion);
        blade.rotateZ(side*(.28+k*.5));
        blade.position.set(x+side*(72+75*k),ground+height*.31,y);
        blade.scale.set(53+30*k,height*.8,1);blade.material.color.set('#ffbf74');
        blade.material.opacity=.50*Math.pow(1-k,3);
      }
    }else if(k>.61&&!reduced){
      const core=arenaForgePlane(renderer,'glow'),scale=70+140*(k-.61);
      core.position.set(x,ground+155,y);core.quaternion.copy(renderer.cam.quaternion);core.scale.set(scale,scale,1);
      core.material.color.set('#ffdc9a');core.material.opacity=fade*clamp((k-.61)*1.7,0,.58);
    }
  }
}

function arenaForgeBurst(renderer,e){
  const weapon=WEAPONS[AW[e.w]];
  if(!weapon)return;
  const x=e.x,z=e.y,y=renderer.gY(x,z),color=weapon.glow||weapon.col,gold='#ffc480';
  const reduced=arenaForgeMotion.matches;
  renderer.ring(x,z,30,268,gold,.82);
  renderer.ring(x,z,54,385,color,1.17);
  renderer.flash(x,y+104,z,color,reduced?900:3200,560,.43);
  const count=reduced?14:renderer.hi?46:30;
  const rng=mulberry32(Math.imul(e.id+1,1597334677)^e.w);
  for(let i=0;i<count;i++){
    const a=i/count*Math.PI*2+rng()*.24,v=180+rng()*420;
    renderer.sp(true,{x:x+Math.cos(a)*20,y:y+48,z:z+Math.sin(a)*20,vx:Math.cos(a)*v,vz:Math.sin(a)*v,
      vy:78+rng()*340,l:.5+rng()*.75,s:12+rng()*10,s1:2,c:i%3?color:gold,sp:7,g:330});
  }
  for(let i=0;i<(reduced?5:12);i++){
    const a=i*Math.PI/6;
    renderer.sp(false,{x:x+Math.cos(a)*44,y:y+10,z:z+Math.sin(a)*44,vx:Math.cos(a)*170,vz:Math.sin(a)*170,
      vy:32,l:.84,s:45,s1:115,c:'#a6959d',sp:2,a:.31});
  }
}

function drawArenaForge2D(listener,visible){
  for(const {fx,x,y,age,k,reduced} of arenaForgeFrames(listener,visible)){
    const fade=fx.reveal?1-k:Math.min(1,age*6),r=fx.reveal?154+145*Math.sqrt(k):138+19*k;
    const color=fx.reveal?fx.colors[0]:'#ffc785';
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle=hexA('#2a182c',.36*fade);ctx.beginPath();ctx.ellipse(0,0,r,r*.66,0,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.scale(1,.66);ctx.rotate(reduced?0:age*.8);ctx.globalAlpha=.76*fade;
    ctx.drawImage(arenaForgeSigil,-r,-r,r*2,r*2);ctx.restore();
    ctx.strokeStyle=hexA(color,.81*fade);ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(0,0,r,r*.66,0,0,Math.PI*2);ctx.stroke();
    for(let j=0;j<fx.keys.length;j++){
      const pos=fx.reveal?{a:0,x:0,z:0,y:92+45*k}:arenaForgeOrbit(j,age,k,reduced);
      ctx.save();ctx.translate(pos.x,pos.z*.65-pos.y*.67);
      ctx.rotate(fx.reveal||reduced?0:Math.sin(pos.a)*.55);
      const size=fx.reveal?116:78;
      ctx.globalAlpha=fade;ctx.shadowColor=fx.colors[j];ctx.shadowBlur=13;
      ctx.drawImage(ArenaHudIcons.weapon(fx.keys[j]),-size/2,-size/2,size,size);ctx.restore();
    }
    ctx.restore();
  }
}

{
  const otherFx=R3.fx3,otherExtra=R3.fxExtra;
  R3.fx3=function(e){
    if(e.k==='fuse')return arenaForgeVisual(this,()=>arenaForgeBurst(this,e));
    if(e.k!=='fusing')return otherFx.call(this,e);
  };
  R3.fxExtra=function(T,dt,me,listener){
    otherExtra.call(this,T,dt,me,listener);
    drawArenaForge3D(this,listener);
  };
}
