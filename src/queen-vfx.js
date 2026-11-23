/* Arena Royale · the Snow Queen's spells, rebuilt for grandeur (Claude, 2026-11-23 · index only). Render only: combat is read, never written.
 * The owner asked for grander ice-boss VFX made in Blender. moonfall-docs/blender/queen_vfx.py builds assets/meshy/queen-vfx.glb:
 * two spike clusters, a shard, an ice tomb, a crystal wing, a frost sigil and an ice-fracture texture (both rendered with Cycles).
 * snow-queen.js gives each of her spells its own aoe kind and this file draws them (eclipse-fx / arena-ice no longer touch them):
 *  qslash  scepter thrust: a sweep of ice spikes across the cone
 *  qlance  Ice Lance: a row of frost sigils, then giant spike clusters burst out one after another, leaning toward the target
 *  qshard  Shard Rain: ice comets fall out of the sky onto their sigils and explode into spikes, fractures and shards
 *  qnova   Frost Nova (and her phase change): two rings of spikes erupt outward from the sigil under her
 *  qblizz  Blizzard: a vortex of snow with ice comets raining inside; when it ends spikes burst out all over the field
 *  qprison Ice Prison: ice teeth rise round the target, the tomb closes over it and shatters when the root ends
 *  qwinter Eternal Winter: the great sigil covers the court, ice pillars rise round its rim, then the court erupts in waves of spikes
 *          (never inside the warm circles). arena-frost.js adds the driven snow, the frost on the screen and the white burst.
 * Every crystal shatters into tumbling shards. On the queen: a crown of orbiting shards from phase II, crystal wings while she changes
 * phase or casts Eternal Winter (and for good in phase III), a sigil under her feet while she casts, a crystal tomb when she dies.
 * One instanced ice material (faceted, fresnel rim, inner glow rising to the tip, white-hot flash when a crystal forms, a glowing
 * dissolve when it breaks); counts scale with the graphics quality. Own RNG: visuals never touch Math.random. */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined'||(typeof MOON!=='undefined'&&MOON))return;
  const P=R3,T=THREE,TAU=Math.PI*2,KEY='queen-vfx',CA=()=>window.CelestialAssets;
  const KINDS=new Set(['qslash','qlance','qshard','qnova','qblizz','qprison','qwinter']);
  let seed=0x51f15e3d;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};
  const rr=(a,b)=>a+(b-a)*rnd(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),sat=v=>clamp(v,0,1);
  const eob=x=>{x=sat(x);const c1=1.9,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};   // ease-out-back: crystals snap into place
  const eio=x=>{x=sat(x);return x*x*(3-2*x)};
  const warn=(k,e)=>{if(!P['_qvE'+k]){P['_qvE'+k]=1;console.warn('queen vfx',k,e)}};
  const UP=new T.Vector3(0,1,0),V1=new T.Vector3(),V2=new T.Vector3(),S1=new T.Vector3(),Q1=new T.Quaternion(),Q2=new T.Quaternion(),M1=new T.Matrix4(),M2=new T.Matrix4(),E1=new T.Euler();
  const qd=R=>R.hi&&!R.mobile?1:R.hi?.7:.45;                       // how much of everything (counts, particles)
  const N=(R,n)=>Math.max(1,Math.round(n*qd(R)));

  // ---------------- the Blender assets ----------------
  function prep(){const a=CA()&&CA().get(KEY);if(!a||a.state!=='loaded'||!a.gltf)return null;if(a._qv)return a._qv;
    a.gltf.scene.updateMatrixWorld(true);
    const find=n=>{let m=null;a.gltf.scene.traverse(c=>{if(!m&&c.isMesh&&(c.name===n||(c.parent&&c.parent.name===n)))m=c});return m};
    const geo=n=>{const m=find(n);if(!m)return null;const g=m.geometry.clone();g.applyMatrix4(m.matrixWorld);for(const k of Object.keys(g.attributes))if(k!=='position'&&k!=='normal')g.deleteAttribute(k);g.computeBoundingSphere();return g};
    const tex=n=>{const m=find(n),mt=m&&m.material;return mt&&(mt.emissiveMap||mt.map)||null};
    const G={spike:geo('QV_Spike'),spike2:geo('QV_Spike2'),shard:geo('QV_Shard'),prison:geo('QV_Prison'),wing:geo('QV_Wing'),sigil:tex('QV_Sigil'),cracks:tex('QV_Cracks')};
    for(const k in G)if(!G[k])return null;
    // the left wing: mirrored, winding flipped so it stays front-facing
    const L=G.wing.clone();L.scale(-1,1,1);if(L.index){const ix=L.index;for(let i=0;i<ix.count;i+=3){const t=ix.getX(i+1);ix.setX(i+1,ix.getX(i+2));ix.setX(i+2,t)}ix.needsUpdate=true}
    else{const p=L.attributes.position;for(let i=0;i<p.count;i+=3)for(let c=0;c<3;c++){const t=p.getComponent(i+1,c);p.setComponent(i+1,c,p.getComponent(i+2,c));p.setComponent(i+2,c,t)}p.needsUpdate=true}
    G.wingL=L;for(const t of[G.sigil,G.cracks]){t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.needsUpdate=true}
    return a._qv=G}

  // one ice material for every crystal: aQ = (flash, dissolve, seed, glow)
  function iceMat(R){const m=new T.MeshStandardMaterial({color:'#6aa9e2',roughness:.14,metalness:0,envMap:R.envTex||null,envMapIntensity:.7,flatShading:true,
      transparent:true,opacity:.9,emissive:'#0a2546',emissiveIntensity:1});
    m.onBeforeCompile=sh=>{
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aQ;varying vec4 vQ;varying vec3 vLp;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nvQ=aQ;vLp=position;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec4 vQ;varying vec3 vLp;\nfloat qvH(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}')
        .replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat qvN=qvH(floor(vLp*vec3(15.0,21.0,15.0))+vQ.z);if(vQ.y>0.0&&qvN<vQ.y)discard;')
        .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
  {vec3 qvV=normalize(vViewPosition);float qvF=pow(1.0-clamp(abs(dot(normal,qvV)),0.0,1.0),2.0);float qvY=clamp(vLp.y,0.0,1.0);
   diffuseColor.rgb*=mix(vec3(.55,.74,1.0),vec3(1.05),qvY*.45+qvF*.55);
   totalEmissiveRadiance+=vec3(.08,.24,.5)*(.2+.8*qvY)*(.5+vQ.w)+vec3(.42,.72,1.0)*qvF*(.38+.3*vQ.w)+vec3(.75,.92,1.0)*vQ.x*1.1;
   if(vQ.y>0.0)totalEmissiveRadiance+=vec3(.55,.85,1.0)*(1.0-smoothstep(vQ.y,vQ.y+.1,qvN))*1.4;
   diffuseColor.a*=.74+.26*qvF;}`)};
    m.customProgramCacheKey=()=>'qvIce3';return m}

  // ---------------- instanced pools ----------------
  const Q={fx:[],seen:new Map(),scene:null,G:null,t:0};
  function pool(R,geo,cap,shadow){const g=geo.clone(),at=new T.InstancedBufferAttribute(new Float32Array(cap*4),4);at.setUsage(T.DynamicDrawUsage);g.setAttribute('aQ',at);
    const im=new T.InstancedMesh(g,Q.mat,cap);im.count=0;im.visible=false;im.frustumCulled=false;im.castShadow=!!shadow;im.receiveShadow=false;im.renderOrder=3;
    im.instanceMatrix.setUsage(T.DynamicDrawUsage);im.raycast=()=>{};im.name='queen-vfx';R.scene.add(im);return{im,at,g,cap,n:0}}
  function put(p,pos,q,s,a0,a1,a2,a3){if(!p||p.n>=p.cap||!(s.y>.01))return;M1.compose(pos,q,s);p.im.setMatrixAt(p.n,M1);p.at.setXYZW(p.n,a0,a1,a2,a3);p.n++}
  function putM(p,m,a0,a1,a2,a3){if(!p||p.n>=p.cap)return;p.im.setMatrixAt(p.n,m);p.at.setXYZW(p.n,a0,a1,a2,a3);p.n++}
  function flush(p){p.im.count=p.n;p.im.visible=p.n>0;if(p.n){p.im.instanceMatrix.needsUpdate=true;p.at.needsUpdate=true}p.n=0}
  function dispose(){if(!Q.p)return;for(const k in Q.p){const p=Q.p[k];if(p.im.parent)p.im.parent.remove(p.im);p.g.dispose()}if(Q.mat)Q.mat.dispose();Q.p=null;Q.mat=null;Q.fx.length=0;Q.seen.clear()}
  function ensure(R){if(!R.scene)return null;const G=prep();if(!G)return null;
    if(Q.scene!==R.scene||Q.G!==G||!Q.p){dispose();Q.scene=R.scene;Q.G=G;Q.mat=iceMat(R);const hq=qd(R)>=1,c=k=>Math.max(8,Math.round(k*(hq?1:.5)));
      Q.p={spike:pool(R,G.spike,c(90),hq),spike2:pool(R,G.spike2,c(90),hq),shard:pool(R,G.shard,c(340),false),prison:pool(R,G.prison,6,hq),wing:pool(R,G.wing,3,false),wingL:pool(R,G.wingL,3,false)}}
    return Q}
  const add=f=>{if(Q.fx.length<760)Q.fx.push(f);return f};

  // ---------------- ground marks: the Blender sigil and fractures (additive, tinted) ----------------
  function deck(R,pool,tex,x,z,r,rot,c,a){if(!(a>.004))return;const m=R.get(pool,()=>{const o=new T.Mesh(R.G.plane,new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
      polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,fog:false}));o.renderOrder=2;o.userData.ownMat=1;return o});
    m.material.map=tex;m.material.color.set(c);m.material.opacity=Math.min(1,a*(R.hi?1:.55));m.position.set(x,R.gY(x,z)+3+(R.pool[pool].used%8)*.22,z);m.rotation.set(0,rot,0);m.scale.set(r*2,1,r*2);return m}
  const sigil=o=>add(Object.assign({k:'sg',t:0,life:1,fi:.12,fo:.5,spin:.4,rot:rnd()*TAU,c:'#bfe6ff',a:.9,r:100,r1:1},o));
  const cracks=(x,z,r,life,a)=>add({k:'ck',x,z,r,t:0,life:life||2.6,rot:rnd()*TAU,a:a||1});
  function stepSigil(R,f,dt){f.t+=dt;if(f.t>f.life)return false;f.rot+=f.spin*dt;const a=f.a*Math.min(sat(f.t/f.fi),sat((f.life-f.t)/f.fo));
    deck(R,'qvsig',Q.G.sigil,f.x,f.z,f.r*(1+(f.r1-1)*eio(f.t/f.life)),f.rot,f.c,a);return true}
  function stepCracks(R,f,dt){f.t+=dt;if(f.t>f.life)return false;const g=eio(f.t/.2),a=sat(f.t/.04)*sat((f.life-f.t)/(f.life*.65));
    deck(R,'qvcrk',Q.G.cracks,f.x,f.z,f.r*(.55+.45*g),f.rot,'#a8dcff',a*f.a);return true}

  // ---------------- crystals ----------------
  function orient(q,dir,lean,yaw){V1.set(Math.cos(dir)*Math.sin(lean),Math.cos(lean),Math.sin(dir)*Math.sin(lean));Q1.setFromUnitVectors(UP,V1);Q2.setFromAxisAngle(UP,yaw);return q.copy(Q1).multiply(Q2)}
  function spike(o){const f=add(Object.assign({k:'sp',t:0,del:0,gd:.16,life:1.2,lean:0,dir:0,glow:.3,p:rnd()<.55?'spike':'spike2',seed:rnd()*50,puff:true},o));
    if(!f.w)f.w=f.h*rr(.85,1.05);f.q=orient(new T.Quaternion(),f.dir,f.lean,rnd()*TAU);return f}
  function puff(R,x,y,z,s,n){for(let i=0;i<n;i++){const a=rnd()*TAU,v=rr(40,140)*s;R.sp(false,{x:x+Math.cos(a)*20*s,y:y+rr(4,24),z:z+Math.sin(a)*20*s,vx:Math.cos(a)*v,vy:rr(30,110)*s,vz:Math.sin(a)*v,l:rr(.6,1),s:24*s,s1:80*s,c:'#dcecfa',a:.22,sp:2,dr:2.4})}}
  function sparks(R,x,y,z,s,n,c){for(let i=0;i<n;i++){const a=rnd()*TAU,e=rr(.1,1.2),v=rr(160,520)*s;R.sp(true,{x,y,z,vx:Math.cos(a)*Math.cos(e)*v,vy:Math.sin(e)*v+60,vz:Math.sin(a)*Math.cos(e)*v,l:rr(.3,.65),s:rr(5,9)*s,s1:2,c:c||'#dff2ff',c2:'#3a88e8',a:.8,sp:1,g:500,dr:1.8})}}
  function debris(x,y,z,vx,vy,vz,s,life){return add({k:'db',x,y,z,vx,vy,vz,s,t:0,life:life||rr(.9,1.5),seed:rnd()*50,
    q:new T.Quaternion().setFromEuler(E1.set(rnd()*TAU,rnd()*TAU,rnd()*TAU)),ax:new T.Vector3(rnd()-.5,rnd()-.5,rnd()-.5).normalize(),av:rr(5,14)})}
  // a crystal breaks: shards fly from along its length, a burst of glitter and frost
  function shatter(R,f){const n=N(R,f.h>200?6:f.h>110?4:3),ax=V2.copy(UP).applyQuaternion(f.q);
    for(let i=0;i<n;i++){const hh=rr(.12,.85)*f.h,a=rnd()*TAU,v=rr(110,300)*(f.h>200?1.2:.9);
      debris(f.x+ax.x*hh+Math.cos(a)*f.w*.08,f.y+ax.y*hh,f.z+ax.z*hh+Math.sin(a)*f.w*.08,Math.cos(a)*v,rr(160,420),Math.sin(a)*v,rr(.16,.3)*f.h)}
    sparks(R,f.x+ax.x*f.h*.5,f.y+ax.y*f.h*.5,f.z+ax.z*f.h*.5,f.h>200?1.1:.8,N(R,f.h>200?9:5));if(f.puff)puff(R,f.x,f.y,f.z,f.h/260,N(R,1))}
  function stepSpike(R,f,dt){f.t+=dt;const t=f.t-f.del;if(t<0)return true;if(f.y===undefined)f.y=R.gY(f.x,f.z);
    if(!f.born){f.born=1;if(f.puff){puff(R,f.x,f.y,f.z,f.h/300,N(R,f.h>200?2:1));sparks(R,f.x,f.y+f.h*.3,f.z,f.h/320,N(R,f.h>200?6:3))}}
    const g=f.gd>.3?eio(t/f.gd):eob(t/f.gd),fl=Math.max(sat(1-t/.4)*(f.gd>.3?.35:1),f.gd>.3&&t>=f.gd?sat(1-(t-f.gd)/.35):0);let d=0,sink=0;
    if(t>f.life){if(!f.sh){f.sh=1;shatter(R,f)}d=sat((t-f.life)/.28);sink=d*f.h*.12;if(d>=1)return false}
    S1.set(f.w*g,f.h*g,f.w*g);V1.set(f.x,f.y-5-sink,f.z);put(Q.p[f.p],V1,f.q,S1,fl,d,f.seed,f.glow);return true}
  function stepDebris(R,f,dt){f.t+=dt;if(f.t>f.life)return false;f.vy-=1500*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.vz*dt;
    const gy=R.gY(f.x,f.z)+f.s*.12;if(f.y<gy){f.y=gy;if(f.vy<0){f.vy*=-.28;f.vx*=.5;f.vz*=.5;f.av*=.45}}
    Q2.setFromAxisAngle(f.ax,f.av*dt);f.q.premultiply(Q2);S1.setScalar(f.s);V1.set(f.x,f.y,f.z);put(Q.p.shard,V1,f.q,S1,sat(1-f.t/.25)*.6,sat((f.t-f.life+.4)/.4),f.seed,.25);return true}
  // the tomb: grows over the target, holds, breaks apart
  const tomb=o=>add(Object.assign({k:'pr',t:0,del:0,hold:1.6,r:150,yaw:rnd()*TAU,seed:rnd()*50},o));
  function burstBig(R,x,y,z,r,h,n){n=Math.min(n,22);for(let i=0;i<n;i++){const a=rnd()*TAU,d=rr(.1,.6)*r,v=rr(160,420)*(r/150);debris(x+Math.cos(a)*d,y+rr(.1,.9)*h,z+Math.sin(a)*d,Math.cos(a)*v,rr(200,520),Math.sin(a)*v,rr(.18,.34)*r)}
    sparks(R,x,y+h*.5,z,r/120,N(R,16));puff(R,x,y,z,r/140,N(R,3));R.ring(x,z,20,r*1.6,'#bfe6ff',.5)}
  function stepTomb(R,f,dt){f.t+=dt;const t=f.t-f.del;if(t<0)return true;if(f.y===undefined)f.y=R.gY(f.x,f.z);
    if(!f.born){f.born=1;cracks(f.x,f.z,f.r*1.45,f.hold+1.4);puff(R,f.x,f.y,f.z,f.r/150,N(R,2));sparks(R,f.x,f.y+f.r*.6,f.z,f.r/140,N(R,10));R.ring(f.x,f.z,20,f.r*1.5,'#cfefff',.5);if(R.flash)R.flash(f.x,f.y+120,f.z,'#8fd0ff',520,f.r*3,.3)}
    const g=eob(t/.3);let d=0;if(t>f.hold){if(!f.sh){f.sh=1;burstBig(R,f.x,f.y,f.z,f.r,f.r*1.4,N(R,18))}d=sat((t-f.hold)/.32);if(d>=1)return false}
    Q1.setFromAxisAngle(UP,f.yaw);S1.set(f.r*g,f.r*1.15*g,f.r*g);V1.set(f.x,f.y-4,f.z);put(Q.p.prison,V1,Q1,S1,sat(1-t/.5),d,f.seed,.4);return true}
  // an ice comet: a great shard falls out of the sky along the wind, its point first, and bursts where it lands
  function comet(o){const a=o.from!==undefined?o.from:rnd()*TAU,h=o.hh||1300;return add(Object.assign({k:'cm',t:0,del:0,dur:.6,s:90,seed:rnd()*50,ox:Math.cos(a)*h*.38,oz:Math.sin(a)*h*.38,oh:h,q:new T.Quaternion()},o))}
  function impact(R,f){const big=!f.small,y=f.y;
    if(big){const n=N(R,3);for(let i=0;i<n;i++){const a=i/n*TAU+rnd(),h=f.s*rr(1.1,1.6);spike({x:f.x+Math.cos(a)*f.s*.35,z:f.y0z+Math.sin(a)*f.s*.35,h,dir:a,lean:rr(.35,.6),life:rr(.8,1.1),gd:.12,glow:.5,puff:false})}
      cracks(f.x,f.y0z,f.s*1.7,2.4);R.ring(f.x,f.y0z,10,f.s*2,'#e8f6ff',.45);if(R.flash&&rnd()<.4)R.flash(f.x,y+80,f.y0z,'#8fd0ff',380,f.s*4,.22)}
    if(!big&&rnd()<.4)spike({x:f.x,z:f.y0z,h:rr(55,90),dir:rnd()*TAU,lean:rr(.1,.4),life:rr(.7,1.1),gd:.1,glow:.45,puff:false});
    for(let i=0;i<N(R,big?5:2);i++){const a=rnd()*TAU,v=rr(120,300);debris(f.x,y+10,f.y0z,Math.cos(a)*v,rr(150,380),Math.sin(a)*v,rr(.22,.4)*f.s)}
    sparks(R,f.x,y+16,f.y0z,big?1:.6,N(R,big?18:6));puff(R,f.x,y,f.y0z,big?f.s/80:f.s/110,N(R,big?4:2))}
  function stepComet(R,f,dt){f.t+=dt;const t=f.t-f.del;if(t<0)return true;if(f.y===undefined){f.y=R.gY(f.x,f.z);f.y0z=f.z}
    const k=sat(t/f.dur),e=k*k,x=f.x+f.ox*(1-e),y=f.y+f.oh*(1-e),z=f.z+f.oz*(1-e);
    V2.set(-f.ox,-f.oh,-f.oz).normalize();f.q.setFromUnitVectors(UP,V2);Q2.setFromAxisAngle(UP,t*11);f.q.multiply(Q2);
    for(let i=0;i<(f.small?1:2);i++)R.sp(true,{x:x+rr(-8,8),y:y+rr(-8,8),z:z+rr(-8,8),vx:rr(-25,25),vy:rr(-10,30),vz:rr(-25,25),l:f.small?.25:.4,s:f.s*.32,s1:3,c:'#f0f8ff',c2:'#5aa8ff',sp:1});
    if(!f.small&&rnd()<.6)R.sp(false,{x,y,z,vx:rr(-20,20),vy:rr(0,30),vz:rr(-20,20),l:.6,s:f.s*.35,s1:f.s*1.1,c:'#e6f4ff',a:.3,sp:2,dr:2});
    if(k>=1){impact(R,f);return false}
    S1.setScalar(f.s);V1.set(x,y,z);put(Q.p.shard,V1,f.q,S1,.55,0,f.seed,.9);return true}

  // ---------------- per spell ----------------
  const queen=()=>{if(typeof units==='undefined')return null;let b=null;for(const u of units)if(u.ecl==='queen'&&!u.dead){b=u;break}return b};
  const tele=(R,a,c,al,x,y,sx,rot,tex,add)=>R.eclPick?R.eclPick('qvp',{tex:tex||'shock',c,a:al,x,y,sx,rot:rot||0},R.gY(x,y),add):null;
  const warmCircles=a=>{const S=[];if(typeof aoes!=='undefined')for(const b of aoes)if(b.kind==='usafe'&&Math.hypot(b.x-a.x,b.y-a.y)<a.r+200)S.push(b);return S};
  const START={
    qlance(R,a,s){const u=queen();s.dir=u?Math.atan2(a.y-u.y,a.x-u.x):rnd()*TAU},
    qshard(R,a,s){const rem=Math.max(0,a.delay-a.t);s.cm=comet({x:a.x,z:a.y,del:Math.max(0,rem-.62),dur:Math.min(.62,rem||.3),s:rr(80,108),from:rnd()*TAU})},
    qprison(R,a,s){const rem=Math.max(.2,a.delay-a.t),n=N(R,7);s.teeth=[];
      for(let i=0;i<n;i++){const an=i/n*TAU+rnd()*.5,d=a.r*rr(.78,.92);s.teeth.push(spike({x:a.x+Math.cos(an)*d,z:a.y+Math.sin(an)*d,h:rr(80,120),dir:an+Math.PI,lean:rr(.3,.45),gd:rem,life:rem+1.6,glow:.45,puff:false}))}},
    qwinter(R,a,s){const rem=Math.max(.4,a.delay-a.t),n=N(R,14),o=rnd()*TAU;
      for(let i=0;i<n;i++){const an=o+i/n*TAU,d=a.r*rr(.9,.97);spike({x:a.x+Math.cos(an)*d,z:a.y+Math.sin(an)*d,h:rr(380,520),dir:an+Math.PI,lean:rr(.04,.14),
        del:i/n*.35,gd:Math.max(.5,rem-.35-i/n*.35),life:rem+1.9+rr(0,.35),glow:.75,p:'spike'})}}};
  const TELE={
    qslash(R,a,s,k,pre){const ang=a.ang||0,len=a.len||a.r;
      if(pre)tele(R,a,'#bfe8ff',.25+.45*k,a.x+Math.cos(ang)*len/2,a.y+Math.sin(ang)*len/2,len*(a.arc||.85)*1.6,-ang+Math.PI/2,'beam');
      else if(a.fxT>0&&R.eclPick)R.eclPick('qvp',{tex:'slash',c:'#cfefff',a:Math.min(1,a.fxT*3),x:a.x+Math.cos(ang)*len*.55,y:a.y+Math.sin(ang)*len*.55,sx:len*1.15,sz:len*.85,rot:-ang+Math.PI/2},R.gY(a.x,a.y))},
    qlance(R,a,s,k,pre,Tm){if(!pre)return;deck(R,'qvsig',Q.G.sigil,a.x,a.y,a.r*1.4,Tm*1.3+a.x,'#bfe6ff',.25+.65*k);tele(R,a,'#9fd8ff',.25*k,a.x,a.y,a.r*2*k)},
    qshard(R,a,s,k,pre,Tm){if(!pre)return;deck(R,'qvsig',Q.G.sigil,a.x,a.y,a.r*1.3,-Tm*1.8+a.y,'#cfe8ff',.2+.6*k);tele(R,a,'#ffffff',.35*k,a.x,a.y,a.r*2*k)},
    qnova(R,a,s,k,pre,Tm,dt){if(!pre)return;deck(R,'qvsig',Q.G.sigil,a.x,a.y,a.r*1.14,Tm*.9,'#bfe6ff',.3+.6*k);deck(R,'qvsig',Q.G.sigil,a.x,a.y,a.r*.5,-Tm*1.7,'#e8f6ff',.55*k);
      tele(R,a,'#cfeaff',.3*k,a.x,a.y,a.r*2*k);
      if(rnd()<dt*60*qd(R)){const an=rnd()*TAU,x=a.x+Math.cos(an)*a.r,z=a.y+Math.sin(an)*a.r;R.sp(true,{x,y:R.gY(x,z)+rr(10,60),z,vx:(a.x-x)*1.2,vy:rr(20,80),vz:(a.y-z)*1.2,l:.7,s:14,s1:3,c:'#e8f6ff',sp:1})}},
    qblizz(R,a,s,k,pre,Tm,dt){const gy=R.gY(a.x,a.y);
      if(pre){deck(R,'qvsig',Q.G.sigil,a.x,a.y,a.r*1.12,-Tm*1.2,'#bfe6ff',.3+.5*k);if(R.eclPick)R.eclPick('qvdk',{tex:'shock',c:'#6a86b0',a:.3*k,x:a.x,y:a.y,sx:a.r*2.1},gy,false);return}
      const ft=a.t-a.delay,live=a.dot?sat((a.dot-ft)/.4):1;deck(R,'qvsig',Q.G.sigil,a.x,a.y,a.r*1.05,-Tm*1.5,'#a8d8ff',.5*live);
      if(R.eclPick)R.eclPick('qvdk',{tex:'shock',c:'#46628a',a:.42*live,x:a.x,y:a.y,sx:a.r*2.2},gy,false);
      // the storm wall: white mist racing round the rim
      for(let i=Math.floor((s.accW=(s.accW||0)+dt*34*qd(R)*live));i>0;i--){s.accW--;const an=rnd()*TAU,d=a.r*rr(.78,1.02),x=a.x+Math.cos(an)*d,z=a.y+Math.sin(an)*d,sw=rr(420,560);
        R.sp(false,{x,y:gy+rr(20,200),z,vx:-Math.sin(an)*sw,vy:rr(10,60),vz:Math.cos(an)*sw,l:rr(.7,1.1),s:rr(70,110),s1:rr(150,210),c:'#eef5fc',a:.42,sp:2,dr:.4})}
      // the vortex: snow spirals in and up
      for(let i=Math.floor((s.acc=(s.acc||0)+dt*150*qd(R)*live));i>0;i--){s.acc--;const an=rnd()*TAU,d=a.r*rr(.15,1),x=a.x+Math.cos(an)*d,z=a.y+Math.sin(an)*d,sw=rr(260,420);
        const fine=rnd()<.62;R.sp(fine,{x,y:gy+rr(10,260),z,vx:-Math.sin(an)*sw-(x-a.x)*.5,vy:rr(30,140),vz:Math.cos(an)*sw-(z-a.y)*.5,l:rr(.6,1),s:fine?rr(5,10):rr(40,80),s1:fine?3:120,c:fine?'#f4faff':'#c8dcf0',a:fine?.8:.32,sp:fine?1:2,dr:.6})}
      // ice comets inside the storm, all with the same wind
      if(s.wind===undefined)s.wind=rnd()*TAU;s.ct=(s.ct||0)-dt;
      if(live>.5&&s.ct<=0){s.ct=rr(.07,.12)/qd(R);const an=rnd()*TAU,d=a.r*Math.sqrt(rnd())*.92;comet({x:a.x+Math.cos(an)*d,z:a.y+Math.sin(an)*d,dur:rr(.3,.42),s:rr(60,84),hh:rr(700,900),from:s.wind,small:1})}},
    qprison(R,a,s,k,pre,Tm){if(!pre)return;deck(R,'qvsig',Q.G.sigil,a.x,a.y,a.r*(1.45-.35*k),Tm*2.6,'#cfe8ff',.35+.6*k);tele(R,a,'#bfe6ff',.3+.3*k,a.x,a.y,a.r*2*(1.2-.2*k))},
    qwinter(R,a,s,k,pre,Tm){if(!pre)return;deck(R,'qvsig',Q.G.sigil,a.x,a.y,a.r*1.02,Tm*.22,'#9fd4ff',.14+.38*k);deck(R,'qvsig',Q.G.sigil,a.x,a.y,a.r*.42,-Tm*.7,'#cfeaff',.2+.35*k);
      for(const b of warmCircles(a))deck(R,'qvsig',Q.G.sigil,b.x,b.y,b.r*1.15,-Tm*1.5,'#ffc870',.4+.2*Math.sin(Tm*6))}};
  const BOOM={
    qslash(R,a){const ang=a.ang||0,len=a.len||a.r,arc=(a.arc||.85)*1.5,n=N(R,6),gy=R.gY(a.x,a.y);
      for(let i=0;i<n;i++){const f=i/Math.max(1,n-1),aa=ang+(f-.5)*arc,d=len*rr(.5,.85),h=rr(70,110);spike({x:a.x+Math.cos(aa)*d,z:a.y+Math.sin(aa)*d,h,dir:aa,lean:rr(.4,.6),del:f*.07,life:.5+f*.07,glow:.45,puff:i%2===0})}
      sparks(R,a.x+Math.cos(ang)*len*.5,gy+50,a.y+Math.sin(ang)*len*.5,.9,N(R,14))},
    qlance(R,a,s){const dir=s.dir||0,i=Math.round((a.delay-.5)/.08),h=rr(230,300),gy=R.gY(a.x,a.y);
      spike({x:a.x,z:a.y,h:h*.85,dir,lean:rr(.2,.32),life:1.2+i*.06,glow:.55,p:'spike'});
      for(const sg of[-1,1]){const an=dir+sg*Math.PI/2;spike({x:a.x+Math.cos(an)*45-Math.cos(dir)*20,z:a.y+Math.sin(an)*45-Math.sin(dir)*20,h:rr(110,160),dir:an+sg*-.6,lean:rr(.45,.6),del:.04,life:1.1+i*.06,glow:.4,puff:false})}
      cracks(a.x,a.y,a.r*1.7,2.4);R.ring(a.x,a.y,20,a.r*1.5,'#cfefff',.5);if(R.flash&&i%2===0)R.flash(a.x,gy+140,a.y,'#8fd0ff',420,420,.25)},
    qshard(R,a,s){if(!s.cm)impact(R,{x:a.x,y:R.gY(a.x,a.y),y0z:a.y,s:90})},
    qnova(R,a){const gy=R.gY(a.x,a.y),big=a.r>=330;
      for(const [f,n0,h0,h1,ln,dl] of[[.42,8,190,250,.3,0],[.8,13,140,200,.42,.08]]){const n=N(R,n0),o=rnd()*TAU;
        for(let i=0;i<n;i++){const an=o+i/n*TAU+rr(-.1,.1),d=a.r*f*rr(.92,1.06);spike({x:a.x+Math.cos(an)*d,z:a.y+Math.sin(an)*d,h:rr(h0,h1),dir:an,lean:ln+rr(-.06,.08),del:dl+rr(0,.04),life:1.2+dl*3+rr(0,.25),glow:.55})}}
      cracks(a.x,a.y,a.r*1.3,3);sigil({x:a.x,z:a.y,r:a.r*1.14,life:.9,a:1,spin:2.4,fo:.7,r1:1.15});R.ring(a.x,a.y,30,a.r*1.5,'#e8f6ff',.7);R.ring(a.x,a.y,20,a.r*.8,'#ffffff',.45);
      R.decal({x:a.x,y:a.y,r:a.r*1.05,c:'#ffffff',life:3.5,tex:'frostp',normal:1,a:.7,fade:.5});sparks(R,a.x,gy+40,a.y,1.3,N(R,22));if(R.flash)R.flash(a.x,gy+160,a.y,'#8fd0ff',big?800:650,a.r*3,.35)},
    qblizz(R,a){R.decal({x:a.x,y:a.y,r:a.r*1.05,c:'#ffffff',life:(a.dot||3)+1.2,tex:'frostp',normal:1,a:.55,fade:.3});cracks(a.x,a.y,a.r*.9,(a.dot||3)+.8)},
    qprison(R,a,s){tomb({x:a.x,z:a.y,r:a.r*.95,hold:1.6})},
    qwinter(R,a){const gy=R.gY(a.x,a.y),S=warmCircles(a),ok=(x,z)=>!S.some(b=>Math.hypot(x-b.x,z-b.y)<b.r+55);
      for(const [f,n0] of[[.2,5],[.38,9],[.56,12],[.74,15],[.9,17]]){const n=N(R,n0),o=rnd()*TAU;
        for(let i=0;i<n;i++){const an=o+i/n*TAU+rr(-.12,.12),d=a.r*f*rr(.9,1.08),x=a.x+Math.cos(an)*d,z=a.y+Math.sin(an)*d;if(!ok(x,z))continue;
          spike({x,z,h:rr(200,320)*(1.15-.3*f),dir:an,lean:rr(.18,.34),del:f*.5+rr(0,.06),life:1.5+f*.6+rr(0,.25),glow:.6,puff:i%3===0})}}
      cracks(a.x,a.y,620,3.6,.6);for(let i=0;i<N(R,4);i++){const an=rnd()*TAU,d=a.r*rr(.35,.7),x=a.x+Math.cos(an)*d,z=a.y+Math.sin(an)*d;if(ok(x,z))cracks(x,z,rr(260,360),3.2,.6)}
      sigil({x:a.x,z:a.y,r:a.r*1.02,life:1.4,a:.6,spin:1,fo:1,c:'#9fd4ff'});sparks(R,a.x,gy+80,a.y,1.8,N(R,30));if(R.flash)R.flash(a.x,gy+220,a.y,'#9fd8ff',1000,a.r*2.2,.45)}};
  function blizzEnd(R,s){const n=N(R,10);for(let i=0;i<n;i++){const an=rnd()*TAU,d=s.r*Math.sqrt(rnd())*.85;spike({x:s.x+Math.cos(an)*d,z:s.y+Math.sin(an)*d,h:rr(140,230),dir:an,lean:rr(.05,.35),del:rr(0,.15),life:rr(.9,1.3),glow:.5})}
    cracks(s.x,s.y,s.r*1.2,2.6);R.ring(s.x,s.y,20,s.r*1.4,'#e8f6ff',.6);if(R.flash)R.flash(s.x,R.gY(s.x,s.y)+150,s.y,'#8fd0ff',600,s.r*3,.3)}

  // ---------------- the queen herself: crown, wings, casting sigil, death ----------------
  const LQ=new T.Quaternion(),LP=new T.Vector3(),LS=new T.Vector3();
  function queenFx(R,dt,Tm){const u=queen();Q.wingK=Q.wingK||0;if(!u){Q.wingK=0;return}const o=R.objs.get(u.id);if(!o||!o.root||!o.root.visible)return;
    const H=o.H||250,hr=u.hp/Math.max(1,u.maxHp),ph=hr>2/3+1e-4?0:hr>1/3+1e-4?1:2,A=u.ecA;   // three bars (snow-queen.js)
    if(A&&A!==Q.lastA){Q.lastA=A;Q.castT=Q.t;Q.castN=A.n;Q.castD=A.d||1}
    const casting=Q.lastA&&Q.t-Q.castT<Q.castD?Q.castN:null,gy=o.gy!==undefined?o.gy:R.gY(u.x,u.y);
    // the sigil under her feet while she casts
    if(casting&&casting!=='basic'){const p=sat((Q.t-Q.castT)/Q.castD),big=casting==='ultimate'||casting==='phase';deck(R,'qvsig',Q.G.sigil,u.x,u.y,big?240:160,Tm*(big?1.4:2.2),'#cfeaff',.9*sat(p*5)*sat((1-p)*4+.2));
      if(rnd()<dt*40*qd(R)){const an=rnd()*TAU,d=rr(40,150);R.sp(true,{x:u.x+Math.cos(an)*d,y:gy+10,z:u.y+Math.sin(an)*d,vy:rr(120,260),l:.8,s:12,s1:2,c:'#e8f6ff',sp:1})}}
    o.root.updateMatrixWorld(true);const RW=o.root.matrixWorld;
    // crown: shards orbit above her head from phase II (faster and wider while she casts)
    if(ph>=1){const n=ph===2?12:8,spin=(casting?2.6:.7)*(ph===2?1.3:1);Q.crA=(Q.crA||0)+dt*spin;const rad=(ph===2?64:54)+(casting?24:0),y=H*1.1+(casting?18:0)+Math.sin(Tm*1.6)*6;
      for(let i=0;i<n;i++){const an=Q.crA+i/n*TAU;LP.set(Math.cos(an)*rad,y+Math.sin(an*3+Tm)*4,Math.sin(an)*rad);V1.set(Math.cos(an)*.55,1,Math.sin(an)*.55).normalize();LQ.setFromUnitVectors(UP,V1);
        LS.setScalar(ph===2?40:32);M2.compose(LP,LQ,LS);M1.multiplyMatrices(RW,M2);putM(Q.p.shard,M1,casting?.35:0,0,i*7.3,.9)}}
    // wings: open while she changes phase or calls Eternal Winter, and for good in phase III
    const want=(casting==='phase'||casting==='ultimate'||ph===2)&&!u.dead?1:0;Q.wingK+=(want-Q.wingK)*Math.min(1,dt*(want?3.2:2.2));
    if(want&&!Q.wingOpen){Q.wingOpen=1;Q.wingT=Q.t;sparks(R,u.x,gy+H*.62,u.y,1.4,N(R,30));if(R.flash)R.flash(u.x,gy+H*.7,u.y,'#8fd0ff',520,700,.3)}if(!want&&Q.wingK<.05)Q.wingOpen=0;
    if(Q.wingK>.02){const k=Q.wingK,s=H*.66*(.35+.65*eob(k)),fl=Q.wingOpen?sat(1-(Q.t-Q.wingT)/.5):0,flap=Math.sin(Tm*1.7)*.06;
      for(const side of[1,-1]){LP.set(side*12,H*.6,-20);E1.set(0,side*.42,side*(-1.05*(1-k)+flap),'YXZ');LQ.setFromEuler(E1);LS.setScalar(s);M2.compose(LP,LQ,LS);M1.multiplyMatrices(RW,M2);
        putM(side>0?Q.p.wing:Q.p.wingL,M1,fl*.6,sat(1-k*1.6),side>0?3.1:5.7,.7+.3*Math.sin(Tm*3))}
      if(rnd()<dt*14*qd(R)*k){V1.set((rnd()<.5?-1:1)*rr(20,120),H*rr(.55,1.15),-30).applyMatrix4(RW);R.sp(true,{x:V1.x,y:V1.y,z:V1.z,vy:rr(-20,20),l:1,s:10,s1:2,c:'#e8f6ff',sp:1})}}}
  function queenDeath(R,e){if(!ensure(R))return;const gy=R.gY(e.x,e.y);tomb({x:e.x,z:e.y,r:175,del:.55,hold:1.5});
    for(const [f,n0,dl] of[[.75,10,0],[1.35,14,.12]]){const n=N(R,n0),o=rnd()*TAU;for(let i=0;i<n;i++){const an=o+i/n*TAU,d=170*f;spike({x:e.x+Math.cos(an)*d,z:e.y+Math.sin(an)*d,h:rr(160,240),dir:an,lean:.35,del:dl+rr(0,.05),life:1.6+dl*2,glow:.6,puff:i%3===0})}}
    cracks(e.x,e.y,520,4);sigil({x:e.x,z:e.y,r:460,life:2.2,a:.85,spin:1.6,fo:1.2,r1:1.2});sparks(R,e.x,gy+120,e.y,1.6,N(R,30))}

  // ---------------- hooks ----------------
  function fallback(R,a,Tm){const pre=a.t<a.delay,k=pre?sat(a.t/Math.max(.01,a.delay)):1;if(pre)tele(R,a,'#bfe6ff',.4+.4*k,a.x,a.y,a.r*2,Tm,'rune');else if(R.eclOnce&&R.eclOnce(a))R.ring(a.x,a.y,20,a.r*1.3,'#e8f6ff',.6)}
  P.qvVis=function(a,Tm,dt,L){if(!ensure(this))return fallback(this,a,Tm);
    const key=a.kind+'|'+(a.x|0)+'|'+(a.y|0)+'|'+a.delay;let s=Q.seen.get(key);
    if(!s){s={kind:a.kind,x:a.x,y:a.y,r:a.r,boom:0,last:Q.t,dot:a.dot||0};Q.seen.set(key,s);if(a.t<a.delay+.3&&START[a.kind])START[a.kind](this,a,s)}
    s.last=Q.t;const pre=a.t<a.delay,k=pre?sat(a.t/Math.max(.01,a.delay)):1;
    TELE[a.kind](this,a,s,k,pre,Tm,dt);
    if(!pre&&!s.boom){s.boom=1;s.boomT=Q.t;if(a.t-a.delay<.5)BOOM[a.kind](this,a,s)}};
  const _av=P.aoeVis;P.aoeVis=function(a,Tm,dt,L){if(a&&KINDS.has(a.kind)){try{return this.qvVis(a,Tm,dt,L)}catch(e){warn('vis',e);return}}return _av.apply(this,arguments)};
  P._qvDbg=()=>{const c={};for(const f of Q.fx)c[f.k]=(c[f.k]||0)+1;return{fx:c,seen:Q.seen.size,pools:Q.p?Object.fromEntries(Object.entries(Q.p).map(([k,p])=>[k,p.im.count])):null}};
  const STEP={sp:stepSpike,db:stepDebris,pr:stepTomb,cm:stepComet,sg:stepSigil,ck:stepCracks};
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r=_fx.apply(this,arguments);
    try{if(!Q.p&&!Q.fx.length&&!queen())return r;if(!ensure(this))return r;Q.t+=dt;
      const keep=[];for(const f of Q.fx)if(STEP[f.k](this,f,dt))keep.push(f);Q.fx=keep;
      for(const [key,s] of Q.seen){const age=Q.t-s.last;if(s.kind==='qblizz'&&s.boom&&!s.end&&age>.25&&Q.t-s.boomT>s.dot*.7){s.end=1;blizzEnd(this,s)}if(age>8)Q.seen.delete(key)}
      queenFx(this,dt,Tm);for(const k in Q.p)flush(Q.p[k])}
    catch(e){warn('step',e)}return r};
  const _df=P.doFx;P.doFx=function(e,me,L){const r=_df.apply(this,arguments);
    try{if(e&&e.t==='fx'&&e.k==='shatter'&&Q.p)for(const s of Q.seen.values())if(s.kind==='qblizz'&&!s.end&&Math.hypot(s.x-e.x,s.y-e.y)<30){s.end=1;blizzEnd(this,s)}}catch(err){warn('fx',err)}return r};
  const _ee=P.eclEvent;P.eclEvent=function(e,u){const r=_ee?_ee.apply(this,arguments):undefined;try{if(e&&e.k==='die'&&e.q)queenDeath(this,e)}catch(err){warn('ev',err)}return r};
})();
