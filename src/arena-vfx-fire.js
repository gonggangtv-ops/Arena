/* Arena Royale · realistic fireball and meteor (Claude, 2026-11-21 · index only). Render only, own random stream.
 * Owner: make the meteor and the fireball prettier and more real. The old look stacked a magic circle, a light pillar, flat rings
 * and a white bloom flash (meteor) and a torch-like flame smear (fireball). This layer owns those two and draws them as things:
 *  FIREBALL (fire staff skill 1, kind 2; the staff's basic bolt, kind 1, is the small version): a turbulent ball of fire with a
 *    white-hot heart, a comet tail of fire that cools into smoke behind it, sparks shed in flight, and a light under it (aaa).
 *    Impact: a short white flash, a volumetric fireball that cools to smoke, burning shrapnel, a dust and heat shock, a scorch.
 *  METEOR (aoe kind 'meteor' with a fall delay: fire staff skill 3, the Meteor special): a real rock with glowing seams falls from
 *    high on a slant, wrapped in a plasma sheath and trailing a long smoke column, its shadow and a heat ring growing on the
 *    target; the impact is a flash, a big fireball, a dust shockwave across the ground, molten rocks thrown out, a smoke column,
 *    a scorched crater with seams that cool, embers. Ground slams with no fall time (magma titan, element slams) get the blast only.
 * Owned visuals switch off the old layers for the same thing (r4 base meshes and rings, arena-vfx-skills runes/pillars/domes, the
 * 3D beams and the signature layer's projectile flames): R3.fireOwn(aoe), R3.fireOwnP(projectile), R3.firePulse(style).
 * Gameplay timing, radius and damage are untouched: everything is read from aoes / projs. localStorage ar_fx_fire='0' turns it off. */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined'||(typeof MOON!=='undefined'&&MOON))return;
  try{if(localStorage.getItem('ar_fx_fire')==='0')return}catch(e){}
  const P=R3,T=THREE,TAU=Math.PI*2;
  let seed=0x2c1b3c6d;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};
  const rr=(a,b)=>a+(b-a)*rnd(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),fin=(v,d)=>Number.isFinite(v)?v:d;
  const warn=(k,e)=>{if(!P['_fireE'+k]){P['_fireE'+k]=1;console.warn('fire vfx',k,e)}};
  const near=(x,y,pad)=>{const L=typeof listener==='function'?listener():null,R=typeof visionR==='function'?visionR():1100;return !L||Math.hypot(x-L.x,y-L.y)<R+(pad||220)};
  const NX=()=>window.ArenaVFXTex?ArenaVFXTex.uniforms():{vxN:{value:null},vxT:{value:0}};
  const FIRE=['#ff6a1f','#ffd58a'];
  // what this layer draws instead of the old one
  const meteorAoe=a=>a&&a.kind==='meteor';
  const boomAoe=a=>a&&a.kind==='boom'&&a.el==='fire';
  P.fireOwn=function(a){return !!this._fx2&&(meteorAoe(a)||boomAoe(a))};
  P.fireOwnP=function(p){return !!this._fx2&&!!p&&(p.kind===2||p.kind===1)};
  P.firePulse=function(style,at,o,S){return !!this._fx2&&(style==='meteor'||style==='fireball'&&(!S||!S.el||S.el==='fire'))};
  // ---------------- shaders ----------------
  // tail: a cone behind the head; flowing fire near the head cooling to dark red and nothing, soft edges (facing ratio)
  const TVERT=`varying vec2 vUv;varying float vF;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.0);vec3 n=normalize(mat3(modelMatrix)*normal);
    vF=abs(dot(n,normalize(cameraPosition-w.xyz)));gl_Position=projectionMatrix*viewMatrix*w;}`;
  const TFRAG=`precision highp float;${window.VFXN_GLSL||'uniform sampler2D vxN;uniform float vxT;'}uniform vec3 uC1,uC2;uniform float uA,uSeed,uFlow;varying vec2 vUv;varying float vF;
    void main(){float v=1.0-vUv.y,u=vUv.x;   // v: 0 at the head (the cone's base), 1 at the end of the tail
      float n=texture2D(vxN,vec2(u*2.0+uSeed,v*1.3-vxT*uFlow)).r*.62+texture2D(vxN,vec2(u*4.0-uSeed*.7,v*2.7-vxT*uFlow*1.6)).a*.38;
      float body=smoothstep(.18,.62,n*1.05+(1.0-v)*.55-v*.35)*pow(1.0-v,1.35)*smoothstep(.0,.06,v);
      float soft=pow(vF,1.6);float hot=clamp(1.15-v*1.8+n*.35,0.0,1.0);
      vec3 col=mix(uC1*vec3(.55,.18,.06),uC1,smoothstep(.0,.45,hot));col=mix(col,uC2*1.6,smoothstep(.55,1.0,hot));
      float k=body*soft*uA;if(k<.003)discard;gl_FragColor=vec4(col*k*1.6,0.0);}`;
  // glow shell round a head: fresnel-free soft sphere (brightest where the sphere faces the camera), flickering
  const GFRAG=`precision highp float;${window.VFXN_GLSL||'uniform sampler2D vxN;uniform float vxT;'}uniform vec3 uC1,uC2;uniform float uA,uSeed;varying vec2 vUv;varying float vF;
    void main(){float n=texture2D(vxN,vUv*vec2(3.0,1.5)+vec2(uSeed,-vxT*1.7)).r*.6+texture2D(vxN,vUv*vec2(6.0,3.0)+vec2(-uSeed,-vxT*2.9)).a*.4;
      float k=smoothstep(.12,.9,vF+(n-.5)*.7)*pow(vF,1.4)*(.55+.6*n)*uA;if(k<.003)discard;
      gl_FragColor=vec4(mix(uC1*vec3(1.0,.55,.3),uC2*1.6,smoothstep(.45,1.0,vF*(.7+.5*n)))*k,0.0);}`;
  // meteor rock: dark basalt crust (lit), seams of molten rock glowing through the cell walls of the shared noise
  function rockMat(){const m=new T.MeshStandardMaterial({color:'#2e2622',roughness:.92,metalness:0,emissive:'#ff5a12',emissiveIntensity:1});
    m.userData.u={vxN:NX().vxN,uHeat:{value:1}};
    m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,m.userData.u);
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRk;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRk=position;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D vxN;uniform float uHeat;varying vec3 vRk;')
        .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
          {vec3 q=normalize(vRk);vec3 w=pow(abs(q),vec3(4.0));w/=w.x+w.y+w.z;
           float c=texture2D(vxN,q.yz*.9+.13).g*w.x+texture2D(vxN,q.xz*.9+.41).g*w.y+texture2D(vxN,q.xy*.9+.77).g*w.z;
           float seam=1.0-smoothstep(.02,.12,c);float glow=seam*uHeat;
           totalEmissiveRadiance=vec3(1.0,.42,.1)*glow*2.4+vec3(1.0,.8,.5)*pow(seam,3.0)*uHeat*1.2;}`)};
    m.customProgramCacheKey=()=>'fx2rock';return m}
  // ---------------- per scene ----------------
  function build(R){if(!R.scene)return null;const hi=!!R.hi&&!R.mobile;
    const tailGeo=new T.CylinderGeometry(1,0,1,hi?18:10,6,true);tailGeo.translate(0,-.5,0);tailGeo.rotateX(Math.PI/2);   // the wide end at z = 0 (the head), the tip at z = -1
    const shellGeo=new T.SphereGeometry(1,hi?20:12,hi?14:8);
    const rockGeo=new T.IcosahedronGeometry(1,hi?3:2);{const p=rockGeo.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);
      const n=.78+.2*Math.sin(v.x*3.1+1.3)*Math.cos(v.y*2.7)+.1*Math.sin(v.z*5.3+v.x*2.1)+.06*Math.sin(v.y*9.1);v.multiplyScalar(n);p.setXYZ(i,v.x,v.y,v.z)}rockGeo.computeVertexNormals()}
    const mk=(frag,o)=>new T.ShaderMaterial(Object.assign({uniforms:Object.assign({uC1:{value:new T.Color(FIRE[0])},uC2:{value:new T.Color(FIRE[1])},uA:{value:1},uSeed:{value:rr(0,9)},uFlow:{value:2.2}},NX()),
      vertexShader:TVERT,fragmentShader:frag,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false},o||{}));
    const pool=(n,make)=>Array.from({length:n},make);
    const heads=pool(hi?10:6,()=>{const g=new T.Group();const tail=new T.Mesh(tailGeo,mk(TFRAG)),shell=new T.Mesh(shellGeo,mk(GFRAG,{side:T.FrontSide}));
      tail.renderOrder=8;shell.renderOrder=9;g.add(tail,shell);g.visible=false;R.scene.add(g);return{g,tail,shell,on:false}});
    const mets=pool(4,()=>{const g=new T.Group();const rock=new T.Mesh(rockGeo,rockMat()),tail=new T.Mesh(tailGeo,mk(TFRAG)),shell=new T.Mesh(shellGeo,mk(GFRAG,{side:T.FrontSide}));
      rock.castShadow=true;tail.renderOrder=8;shell.renderOrder=9;tail.material.uniforms.uFlow.value=1.4;g.add(rock,tail,shell);g.visible=false;R.scene.add(g);return{g,rock,tail,shell,on:false}});
    // the meteor's shadow on the target, growing as it comes down
    const shGeo=new T.CircleGeometry(1,40);shGeo.rotateX(-Math.PI/2);
    const shMat=new T.ShaderMaterial({uniforms:{uA:{value:0}},vertexShader:'varying vec2 vU;void main(){vU=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'precision highp float;uniform float uA;varying vec2 vU;void main(){float r=length(vU);float k=(1.0-smoothstep(.15,1.0,r))*uA;gl_FragColor=vec4(0.03,0.02,0.02,k);}',
      transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3});
    const shadows=pool(4,()=>{const m=new T.Mesh(shGeo,shMat.clone());m.renderOrder=2;m.visible=false;R.scene.add(m);return{m}});
    return{scene:R.scene,hi,heads,mets,shadows,geos:[tailGeo,shellGeo,rockGeo,shGeo],seen:new WeakMap(),areas:new Map(),gone:[],d:new T.Object3D(),q:new T.Quaternion(),v:new T.Vector3(),v2:new T.Vector3(),z:new T.Vector3(0,0,1),t:0}}
  function dispose(R){const a=R._fx2;if(!a)return;for(const h of a.heads.concat(a.mets)){a.scene.remove(h.g);h.g.traverse(o=>{if(o.material)o.material.dispose()})}
    for(const s of a.shadows){a.scene.remove(s.m);s.m.material.dispose()}for(const g of a.geos)g.dispose();R._fx2=null}
  function ensure(R){if(R._fx2&&R._fx2.scene!==R.scene)dispose(R);if(!R._fx2&&R.scene&&R.ok!==false){const prev=Math.random;try{Math.random=rnd;R._fx2=build(R)}finally{Math.random=prev}}return R._fx2}
  // orient a group so its +z points along (dx,dy,dz) (the tail cone runs back along -z)
  function aim(a,g,dx,dy,dz){a.v.set(dx,dy,dz);const L=a.v.length();if(L<1e-4)return;a.v.multiplyScalar(1/L);a.q.setFromUnitVectors(a.z,a.v);g.quaternion.copy(a.q)}
  // ---------------- recipes ----------------
  const hx=(R,k,o)=>R.hxEmit?R.hxEmit(k,o):false;
  const api=R=>R.pfxApi||null;
  function blast(R,x,y,r,o){o=o||{};const big=!!o.big,gy=R.gY(x,y),A=api(R);
    // a white-hot flash, short: the light does the rest
    hx(R,'flash',{x,y,h:big?60:40,r:r*(big?.34:.3),r1:r*(big?.6:.5),life:big?.2:.16,c:FIRE[0],c2:'#fff4dc',gain:big?.9:.75});
    if(R.flash)R.flash(x,gy+(big?140:90),y,'#ff9a48',big?5200:2600,r*(big?3.2:2.4),big?.7:.4);
    // the fireball: volumetric where the high-quality layer is on, billboards always
    if(R.fireball&&R._balls)R.fireball(x,gy+r*(big?.34:.3),y,r*(big?.52:.42),'fire',{n:big?9:6});
    hx(R,'fire',{x,y,h:r*.28,r:r*.24,r1:r*(big?.72:.6),life:big?1.5:1.05,c:FIRE[0],c2:FIRE[1],vy:big?80:40,drag:2,rise:big?60:30});
    const n=big?9:5;for(let k=0;k<n;k++){const an=k/n*TAU+rr(-.3,.3),sp=rr(.9,1.6)*r*(big?1.9:1.6);
      hx(R,'fire',{x:x+Math.cos(an)*r*.16,y:y+Math.sin(an)*r*.16,h:r*rr(.12,.3),r:r*rr(.1,.15),r1:r*rr(.26,.4),life:rr(.7,1.05)*(big?1.3:1),c:FIRE[0],c2:FIRE[1],vx:Math.cos(an)*sp,vz:Math.sin(an)*sp,vy:rr(40,160),drag:3.2,delay:rr(0,.05)})}
    // smoke rolling up after the fire: a column for the meteor, a few puffs for the fireball
    for(let k=0;k<(big?6:3);k++)hx(R,'smoke',{x:x+rr(-.25,.25)*r,y:y+rr(-.25,.25)*r,h:r*rr(.35,.6),r:r*.2,r1:r*rr(.55,.85),life:rr(2,2.8)*(big?1.25:.9),c:'#3e3732',vy:rr(70,130)*(big?1.3:1),drag:.7,delay:.18+k*.09,gain:.75});
    // dust thrown along the ground (a ring that runs out past the blast)
    const nd=big?14:7;for(let k=0;k<nd;k++){const an=k/nd*TAU+rr(-.2,.2),sp=rr(.9,1.3)*r*(big?2:1.5);
      hx(R,'dust',{x:x+Math.cos(an)*r*.3,y:y+Math.sin(an)*r*.3,h:14,r:r*.1,r1:r*rr(.24,.34),life:rr(.9,1.4),c:'#7d7062',vx:Math.cos(an)*sp,vz:Math.sin(an)*sp,vy:rr(10,40),drag:2.6,gain:.55,delay:.03})}
    if(A){try{const p=A.G(x,y,24);A.sparks(p,big?36:16,'#ffd27a','#ff5a10',big?620:420,big?520:360,{g:820,life:big?1.1:.8,size:big?1.3:1});
      A.embers(p,big?26:10,'#ffb050','#ff3a10',r*.6,{up:big?1.5:1});A.scorch(x,y,r*(big?.95:.7),big?9:5);
      if(big)A.smoke(p,10,'#2a2420',r*.5,{size:1.6,life:1.6,a:.5})}catch(e){}}
    // molten rocks thrown out (they trail fire as they fly)
    if(R.v3Debris)R.v3Debris({x,y,r:r*.3,n:big?(R.hi?16:8):6,c:'#3a2a22',up:big?560:380,speed:big?420:280,size:big?9:6});
    if(R.shockwave)R.shockwave(x,y,r*(big?2.1:1.6),big?.075:.05,big?.75:.55);
    if(R.heat)R.heat(x,y,r*.95,big?2.6:1.6,.007);
    if(R.lensKick)R.lensKick(x,y,big?.006:.003);
    if(R.vfxKick&&big)R.vfxKick(x,y,{ca:.004,rad:.016,fl:.04,c:'#ffd8a8',stop:.06});
    if(R.shakeNear)R.shakeNear(x,y,big?11:4);
    // a crater with seams that glow and cool (the 3D layer's cracks), a fiery ground ring for the game's GPU batches
    if(R.v3)R.v3('crack',{x,y,r:r*(big?.95:.6),r1:r*(big?.95:.6),c:'#ff6a1f',c2:'#ffd58a',life:big?2.4:1.3,height:3,k1:big?7:5,a:.9});
    if(P.avEmit){if(big)P.avEmit('ring',{x,y,height:6,r:r*.25,r1:r*1.2,c:'#b4743e',c2:'#e8b07a',life:.55,width:.03,a:.28});   // the dust front (no hot white line)
      for(let k=0;k<(big?10:5);k++){const an=rnd()*TAU,d=r*rr(.1,.7);P.avEmit('ember',{x:x+Math.cos(an)*d,y:y+Math.sin(an)*d,height:rr(10,50),r:rr(8,16),r1:2,c:'#ff8a3a',c2:'#ffe0a8',life:rr(.6,1),vx:Math.cos(an)*rr(30,90),vz:Math.sin(an)*rr(30,90),vy:rr(60,180),a:.7})}}}
  // ---------------- per frame ----------------
  function stepHeads(R,a,dt){const used=new Set();let hi=0;
    for(const p of (typeof projs!=='undefined'?projs:[])){if(!P.fireOwnP.call(R,p)||!near(p.x,p.y,120))continue;const big=p.kind===2,gy=R.gY(p.x,p.y),y=gy+42,sp=Math.hypot(p.vx,p.vy)||1,ux=p.vx/sp,uz=p.vy/sp;
      let st=a.seen.get(p);if(!st){st={t:0,trail:0,x:p.x,y:p.y,big};a.seen.set(p,st);
        if(typeof net==='undefined'||net.mode!=='client'){a.gone.push({p,st});   // launch: a burst of flame at the staff (a client sees new objects every snapshot)
          hx(R,'flash',{x:p.x,y:p.y,h:44,r:big?30:16,r1:big?52:26,life:.16,c:FIRE[0],c2:'#fff2d8',gain:.7});hx(R,'fire',{x:p.x,y:p.y,h:42,r:big?16:8,r1:big?40:20,life:.3,c:FIRE[0],c2:FIRE[1],vx:ux*60,vz:uz*60,vy:20,drag:3})}}
      st.t+=dt;st.x=p.x;st.y=p.y;st.gy=gy;
      const H=a.heads[hi++];if(H){used.add(H);const r=big?24:12,len=big?160:75;H.g.visible=true;H.g.position.set(p.x,y,p.y);aim(a,H.g,ux,0,uz);
        H.tail.scale.set(r*.9,r*.9,len);H.shell.scale.setScalar(r*1.12);H.tail.material.uniforms.uA.value=big?.8:.65;H.shell.material.uniforms.uA.value=big?.6:.5}
      // the ball: a white-hot heart in a churning fire, cooling puffs left behind as the tail, smoke after them
      // (rate-limited: the billboard pool is shared by every effect, 160 slots on high quality, 64 on low)
      st.head=(st.head||0)-dt;if(st.head<=0){st.head=a.hi?.033:.06;
        hx(R,'flash',{x:p.x,y:p.y,h:42,r:big?16:9,r1:big?18:10,life:a.hi?.07:.1,c:FIRE[0],c2:'#fff6e4',gain:big?.55:.45});
        for(let k=0;k<(big&&a.hi?2:1);k++)hx(R,'fire',{x:p.x+rr(-5,5),y:p.y+rr(-5,5),h:42+rr(-5,5),r:big?24:11,r1:big?32:15,life:a.hi?.12:.16,c:FIRE[0],c2:FIRE[1],vx:-ux*50,vz:-uz*50,drag:1,gain:1})}
      st.trail-=dt;if(st.trail<=0){st.trail=a.hi?(big?.026:.045):(big?.06:.09);
        hx(R,'fire',{x:p.x-ux*8,y:p.y-uz*8,h:42,r:big?15:8,r1:big?34:16,life:big?.42:.28,c:FIRE[0],c2:FIRE[1],vx:-ux*sp*.12,vz:-uz*sp*.12,vy:big?30:15,drag:2.4,gain:.95});
        if(big||rnd()<.4)hx(R,'smoke',{x:p.x-ux*30,y:p.y-uz*30,h:48,r:big?12:6,r1:big?46:22,life:big?1.1:.7,c:'#3a3431',vx:-ux*sp*.05,vz:-uz*sp*.05,vy:35,drag:1,gain:big?.6:.45});
        const A=api(R);if(A&&(big||rnd()<.5))try{A.sparks(A.G(p.x,p.y,42),big?2:1,'#ffd27a','#ff5a10',160,110,{g:500,life:.45,size:.8})}catch(e){}}}
    for(const H of a.heads)if(!used.has(H)&&H.g.visible)H.g.visible=false;
    // a basic fire bolt that ends without a blast puffs out where it ended
    if(typeof net!=='undefined'&&net.mode==='client')a.gone.length=0;   // a client gets new projectile objects with every snapshot
    for(let i=a.gone.length-1;i>=0;i--){const g=a.gone[i];if(projs.includes(g.p))continue;a.gone.splice(i,1);
      if(!g.st.big&&near(g.st.x,g.st.y)){hx(R,'fire',{x:g.st.x,y:g.st.y,h:40,r:9,r1:30,life:.32,c:FIRE[0],c2:FIRE[1],vy:30,drag:2});hx(R,'smoke',{x:g.st.x,y:g.st.y,h:44,r:8,r1:34,life:.8,c:'#3a3431',vy:40,gain:.45});
        const A=api(R);if(A)try{A.sparks(A.G(g.st.x,g.st.y,40),5,'#ffd27a','#ff5a10',220,160,{g:700,life:.4,size:.8})}catch(e){}}}
    if(a.gone.length>64)a.gone.splice(0,a.gone.length-64)}
  function stepMeteors(R,a,dt){let mi=0;const used=new Set();
    for(const A of (typeof aoes!=='undefined'?aoes:[])){if(!P.fireOwn.call(R,A)||!near(A.x,A.y,A.r||200))continue;const r=A.r||200;
      // a client rebuilds the aoe objects with every snapshot: the state is kept by kind, place and size
      const key=A.kind+'|'+Math.round(A.x/6)+'|'+Math.round(A.y/6)+'|'+(r|0);let st=a.areas.get(key);if(!st){st={pre:A.t<A.delay,hit:false,trail:0,dir:rr(0,TAU)};a.areas.set(key,st)}st.last=a.t;
      const gy=R.gY(A.x,A.y),fall=meteorAoe(A)&&A.delay>=.7&&st.pre;
      if(A.t<A.delay){if(fall){const M=a.mets[mi++],S=a.shadows[mi-1];if(M){used.add(M);
          // in on a slant from the camera's side of the sky: the game camera looks steeply down from the south, so a rock falling
          // from over it toward the target stays in view for most of the wait (one from the far side would only show at the end)
          const k=clamp(A.t/A.delay,0,1),e=Math.pow(k,1.2),H=1000,ox=Math.cos(st.dir)*300,oz=220+140*Math.abs(Math.sin(st.dir));
          const x=A.x+ox*(1-e),y=gy+20+H*(1-e),z=A.y+oz*(1-e),vx=-ox,vy=-H,vz=-oz,sz=clamp(r*.22,40,70);
          M.g.visible=true;M.g.position.set(x,y,z);aim(a,M.g,vx,vy,vz);M.rock.scale.setScalar(sz);M.rock.rotation.set(A.t*2.3,A.t*1.7,0);
          M.tail.scale.set(sz*1.25,sz*1.25,sz*(9+5*k));M.shell.scale.setScalar(sz*1.9);M.tail.material.uniforms.uA.value=.95;M.shell.material.uniforms.uA.value=.85;
          M.rock.material.userData.u.uHeat.value=.8+.4*k;
          if(S){S.m.visible=true;S.m.position.set(A.x,gy+2.5,A.y);S.m.scale.setScalar(r*(.35+.65*k));S.m.material.uniforms.uA.value=.18+.5*k}
          st.trail-=dt;if(st.trail<=0){st.trail=a.hi?.03:.06;const L=Math.hypot(vx,vy,vz),bx=-vx/L,by=-vy/L,bz=-vz/L,gyh=R.gY(x,z);
            hx(R,'fire',{x:x+bx*sz*.8,y:z+bz*sz*.8,h:y-gyh+by*sz*.8,r:sz*.8,r1:sz*1.6,life:.34,c:FIRE[0],c2:FIRE[1],vx:bx*120,vy:by*120,vz:bz*120,drag:2,gain:1});
            hx(R,'smoke',{x:x+bx*sz*2.6,y:z+bz*sz*2.6,h:y-gyh+by*sz*2.6,r:sz*.7,r1:sz*2.8,life:a.hi?2.2:1.5,c:'#2d2826',vx:bx*40,vy:by*40+20,vz:bz*40,drag:.6,gain:.8});
            const Ap=api(R);if(Ap)try{Ap.sparks({x,y,z},2,'#ffd27a','#ff5a10',220,140,{g:300,life:.6,size:.9})}catch(e){}}
          // a heat ring at the edge of the blast, warning where it lands
          if(P.avEmit&&!st.ring){st.ring=1;P.avEmit('ring',{x:A.x,y:A.y,height:4,r:r*.96,r1:r,c:'#c8401a',c2:'#ff9a5a',life:Math.max(.2,A.delay-A.t),width:.028,a:.24})}}}
        else if(!st.ring&&P.avEmit){st.ring=1;P.avEmit('ring',{x:A.x,y:A.y,height:4,r:r*.9,r1:r,c:'#c8401a',c2:'#ff9a5a',life:Math.max(.15,A.delay-A.t),width:.028,a:.24})}
        continue}
      if(!st.hit){st.hit=true;blast(R,A.x,A.y,r,{big:meteorAoe(A)})}}
    for(const M of a.mets)if(!used.has(M)&&M.g.visible){M.g.visible=false}
    for(let i=0;i<a.shadows.length;i++){const S=a.shadows[i];if(i>=mi&&S.m.visible)S.m.visible=false}
    if(a.areas.size>48)for(const [k,st] of a.areas)if(a.t-st.last>1.5)a.areas.delete(k)}
  function step(R,dt){const a=ensure(R);if(!a)return;dt=Math.max(0,Math.min(.1,fin(dt,0)));a.t+=dt;stepHeads(R,a,dt);stepMeteors(R,a,dt)}
  // ---------------- hooks ----------------
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r=_fx.apply(this,arguments);try{step(this,dt)}catch(e){warn('step',e)}return r};
  const _ds=P.disposeScene;P.disposeScene=function(){dispose(this);return _ds.apply(this,arguments)};
  const _bw=P.buildWorld;if(_bw)P.buildWorld=function(){const r=_bw.apply(this,arguments);try{ensure(this)}catch(e){warn('build',e)}return r};
})();
