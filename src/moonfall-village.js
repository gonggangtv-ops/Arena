/* Moonfall villages: Meshy house shells replace the box-and-roof houses, plus market stalls.
 * Gameplay is untouched: the house footprint, walls, door and loot are the original ones. The shell is the
 * "roof" object, so it fades exactly like the old roof when the hero walks behind or inside the house. */
window.installMoonfallVillage=function(P){
  'use strict';
  if(P.moonfallVillage)return;P.moonfallVillage=true;
  const T=THREE,A=window.CelestialAssets,build=P.buildWorld;
  const WANT={r:0,b:Math.PI/2,l:Math.PI,t:-Math.PI/2};
  const keyFor=h=>h.style==='witch'?'house-witch':(Math.max(h.w,h.h)/Math.min(h.w,h.h)>1.28||h.seed%3===0?'house-long':'house-cottage');
  function shell(R,key,mats){
    const parts=R.celestialAsset(key);if(!parts)return null;const g=new T.Group();
    for(const p of parts){const m=p.mat.clone();m.onBeforeCompile=p.mat.onBeforeCompile;m.customProgramCacheKey=p.mat.customProgramCacheKey;m.transparent=true;mats&&mats.push(m);
      const mesh=new T.Mesh(p.geo,m);mesh.castShadow=R.hi;mesh.receiveShadow=true;mesh.userData.ownMat=1;g.add(mesh)}
    return g}
  P.buildWorld=function(){
    build.call(this);
    if(!A||typeof CURSED==='undefined'||!CURSED)return;
    for(const r of this.roofs||[]){const h=r.h,key=keyFor(h),a=A.get(key),size=a&&a.inspection&&a.inspection.size;if(!size)continue;
      const mats=[],inner=shell(this,key,mats);if(!inner)continue;
      const along=h.w>=h.h,L=Math.max(h.w,h.h)+56,W=Math.min(h.w,h.h)+56,mx=size[0]>=size[2],ml=Math.max(size[0],size[2]),H=Math.min(300,Math.max(150,L*size[1]/ml));
      inner.scale.set(mx?L:W,H,mx?W:L);let rot=(mx===along)?0:Math.PI/2;
      // turn the model so its door faces the real doorway when the model has one on that axis
      const da=(a.config.doorAngle||0)-rot,want=WANT[h.side]||0;if(Math.cos(da-want)<-.3)rot+=Math.PI;inner.rotation.y=rot;
      const g=new T.Group();g.add(inner);g.position.set(h.x+h.w/2,this.gY(h.x+h.w/2,h.y+h.h/2)-2,h.y+h.h/2);
      this.scene.remove(r.g);this.scene.add(g);r.g=g;r.mats=mats;r.smoke={x:g.position.x,y:H*.9,z:g.position.z}}
    const sa=A.get('market-stall'),ss=sa&&sa.inspection&&sa.inspection.size;
    // until the stall model is available, draw a plain cart so the obstacle is never invisible
    if(!ss)for(const s of WD.stalls||[]){const g=new T.Group(),w=this.tstd('planks','#8a7460',.9,0),c=this.std('#5d6f8c',.9,0);g.position.set(s.x,this.gY(s.x,s.y),s.y);g.rotation.y=-s.a+Math.PI/2;
      this.mesh(this.G.box,w,0,20,0,92,36,46,g,true);this.mesh(this.G.box,c,0,84,0,104,5,62,g,true);for(const x of[-44,44])for(const z of[-24,24])this.mesh(this.G.box,w,x,44,z,5,84,5,g,true);this.scene.add(g)}
    if(ss)for(const s of WD.stalls||[]){const g=shell(this,'market-stall');if(!g)break;const k=118/Math.max(ss[0],ss[2]);g.scale.set(ss[0]*k,ss[1]*k,ss[2]*k);g.rotation.y=-s.a-Math.PI/2;g.position.set(s.x,this.gY(s.x,s.y)-1,s.y);this.scene.add(g)}
  };
};
