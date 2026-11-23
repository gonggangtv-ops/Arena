/* Arena Royale · particle & trail layer (Claude, 2026-11-18). Render only, own random stream.
 * - GPU particles: thousands of billboards simulated in the vertex shader (no per-frame CPU work):
 *   glow puffs, velocity-stretched sparks, flickering embers, drifting smoke/mist (alpha blended), spinning ice shards, 4-point stars
 * - ribbon trails behind every swung weapon (class heroes, Eclipse creatures, the Lava Titan) and afterimages on dashes
 * - burnt scorch marks that linger on the ground after fire and slams
 * - every skill style from the arena choreography gets sparks/embers/smoke/shards on top of the 3D layer; projectiles leave
 *   glowing trails; hits throw sparks; deaths puff smoke. */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined')return;
  const P=R3,T=THREE,TAU=Math.PI*2,MOB=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  let seed=0x2f6b1d37;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};
  const rr=(a,b)=>a+(b-a)*rnd(),fin=(v,d)=>Number.isFinite(v)?v:d;
  const PVERT=`
    uniform float uTime;attribute vec4 a0;attribute vec4 a1;attribute vec4 a2;attribute vec4 a3;attribute vec4 a4;attribute vec4 a5;
    varying vec2 vUv;varying vec4 vCol;varying float vKind;varying float vT;varying float vSeed;varying vec2 vWorld;
    void main(){float age=uTime-a0.w,t=age/max(a1.w,1e-3);
      if(t<0.0||t>1.0){gl_Position=vec4(2.0,2.0,2.0,1.0);vT=2.0;return;}
      float dr=a2.w,ek=dr>0.0?exp(-dr*age):1.0,k=dr>0.0?(1.0-ek)/dr:age;
      vec3 p=a0.xyz+a1.xyz*k+vec3(0.0,-0.5*a2.z*age*age,0.0);vec3 vel=a1.xyz*ek+vec3(0.0,-a2.z*age,0.0);
      float sz=mix(a2.x,a2.y,t);vec4 mv=viewMatrix*vec4(p,1.0);vec2 off=position.xy;
      if(a5.z>0.0){vec2 d=(viewMatrix*vec4(vel,0.0)).xy;float L=length(d);vec2 dir=L>1e-3?d/L:vec2(0.0,1.0);vec2 nr=vec2(-dir.y,dir.x);
        mv.xy+=dir*off.y*(sz+L*a5.z)+nr*off.x*sz;}
      else{float r=a5.x+a5.y*age,c=cos(r),s=sin(r);mv.xy+=mat2(c,s,-s,c)*off*sz;}
      gl_Position=projectionMatrix*mv;vUv=uv;vT=t;vKind=a4.w;vSeed=a5.w;vCol=vec4(mix(a3.rgb,a4.rgb,t),a3.a);vWorld=p.xz;}`;
  const VXN=window.VFXN_GLSL||`uniform sampler2D vxN;uniform float vxT;float vxF(vec2 u){return .5;}float vxC(vec2 u){return 1.0;}float vxR(vec2 u){return .5;}float vxA(vec2 u){return .5;}
    float vxFlow(vec2 u,vec2 v){return .5;}float vxBurn(float n,float th,float w){return smoothstep(th-w,th+w,n);}float vxRim(float n,float th,float w){return 0.0;}vec3 vxHot(vec3 c){return c;}`;
  const NXU=()=>window.ArenaVFXTex?ArenaVFXTex.uniforms():{vxN:{value:null},vxT:{value:0}};
  // 2026-11-19 (VFX round 1): fire puffs are warped flame tongues that burn away as they age, smoke is billowy and lit
  // (normal from the noise gradient, light from above), embers flicker from the texture instead of a sine.
  const PFRAG=`
    precision highp float;uniform float uGain;uniform vec2 uFocus;uniform float uVision;
    ${VXN}
    varying vec2 vUv;varying vec4 vCol;varying float vKind;varying float vT;varying float vSeed;varying vec2 vWorld;
    void main(){if(vT>1.0)discard;vec2 q=vUv*2.0-1.0;float r=length(q),a=0.0,hot=0.0,k=vKind,sd=fract(vSeed*.1591)*7.0;vec3 shade=vec3(1.0);
      if(k<0.5){                                     // fire puff: warped flame tongues burning away with age
        vec2 w=q+(vec2(vxF(q*.3+sd),vxA(q*.3-sd))-.5)*.75;float n=vxF(w*.42+vec2(sd,-vT*1.1-vxT*.3));
        a=exp(-dot(w,w)*3.2)*(.5+.8*n)*vxBurn(n,vT*.75-.05,.12);hot=exp(-r*r*18.0)*(1.0-vT)*(.6+.6*n);}
      else if(k<1.5){a=exp(-q.x*q.x*14.0)*(1.0-smoothstep(.55,1.0,abs(q.y)));hot=exp(-q.x*q.x*60.0)*(1.0-abs(q.y));}
      else if(k<2.5){                                // smoke: billowy, lit from above
        vec2 u=q*.5+vec2(sd,-vT*.35);float e=.035;
        float n=vxF(u)*.62+vxA(u*2.1+sd)*.38,nx=vxF(u+vec2(e,0.0))*.62+vxA((u+vec2(e,0.0))*2.1+sd)*.38,ny=vxF(u+vec2(0.0,e))*.62+vxA((u+vec2(0.0,e))*2.1+sd)*.38;
        vec3 nrm=normalize(vec3(-(nx-n)/e*.09,-(ny-n)/e*.09,.6));float lit=clamp(dot(nrm,normalize(vec3(-.35,.75,.55))),0.0,1.0);
        a=smoothstep(1.0,.22,r+(n-.5)*.95)*.85*(.7+.5*n);shade=vec3(.55+.65*lit);}
      else if(k<3.5){a=exp(-r*r*9.0)*(.55+.7*vxF(vec2(sd,vxT*3.0+vSeed)));hot=exp(-r*r*40.0);}
      else if(k<4.5){float d=abs(q.x)*1.7+abs(q.y);a=1.0-smoothstep(.82,.95,d);hot=(1.0-smoothstep(0.0,.6,d))*.7;}
      else{float an=atan(q.y,q.x);a=exp(-r*r*7.0)+pow(abs(cos(an*2.0)),26.0)*exp(-r*2.6);hot=exp(-r*r*30.0);}
      float fi=smoothstep(0.0,.06,vT),fo=1.0-smoothstep(k>1.5&&k<2.5?.35:.6,1.0,vT);
      float vis=1.0-smoothstep(uVision-100.0,uVision+20.0,distance(vWorld,uFocus));
      float op=a*vCol.a*fi*fo*vis;if(k<0.5)op*=.25+.75*smoothstep(.03,.4,op);if(op<.004)discard;
      vec3 c=mix(vCol.rgb,vxHot(vCol.rgb)*1.15,clamp(hot*.85,0.0,1.0))*shade;
      gl_FragColor=vec4(c*(k>1.5&&k<2.5?1.0:uGain*(1.0+hot*.6)),op);
      #include <colorspace_fragment>
    }`;
  function psys(R,cap,additive){const base=new T.PlaneGeometry(1,1),g=new T.InstancedBufferGeometry();g.index=base.index;g.setAttribute('position',base.attributes.position);g.setAttribute('uv',base.attributes.uv);
    const at={};for(const k of['a0','a1','a2','a3','a4','a5']){const a=new T.InstancedBufferAttribute(new Float32Array(cap*4),4);a.setUsage(T.DynamicDrawUsage);g.setAttribute(k,a);at[k]=a}
    for(let i=0;i<cap;i++)at.a1.array[i*4+3]=1e-3;   // empty slots read as long dead
    for(let i=0;i<cap;i++)at.a0.array[i*4+3]=-1e9;
    g.instanceCount=cap;
    const m=new T.ShaderMaterial({uniforms:Object.assign({uTime:{value:0},uGain:{value:1},uFocus:R.U.fowC,uVision:R.U.fowR},NXU()),vertexShader:PVERT,fragmentShader:PFRAG,transparent:true,depthWrite:false,depthTest:true,
      blending:additive?T.AdditiveBlending:T.NormalBlending,toneMapped:false});
    const mesh=new T.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=additive?10:8;mesh.visible=false;mesh.userData.arenaVFX=true;R.scene.add(mesh);
    return{g,m,mesh,at,cap,cur:0,lo:1e9,hi:-1,alive:0,base}}
  // ---------------- trails ----------------
  const TN=22;
  const TVERT=`attribute float aT;attribute float aS;varying float vT;varying float vS;void main(){vT=aT;vS=aS;gl_Position=projectionMatrix*viewMatrix*vec4(position,1.0);}`;
  // weapon ribbons: streaked along the swing and fraying into wisps toward the tail (round 1)
  const TFRAG=`precision highp float;uniform vec3 uC;uniform float uGain;${VXN}varying float vT;varying float vS;
    void main(){float n=vxF(vec2(vT*1.7-vxT*1.6,vS*1.6))*.65+vxA(vec2(vT*3.1-vxT*2.3,vS*3.3))*.35;
      float a=pow(max(0.0,1.0-vT),1.4)*mix(.12,1.0,smoothstep(0.0,1.0,vS))*(.45+.95*n)*vxBurn(n,vT*.85-.1,.12);if(a<.004)discard;
      float hot=smoothstep(.7,1.0,vS)*(1.0-vT);vec3 c=mix(uC,vxHot(uC)*1.2,hot*.85);gl_FragColor=vec4(c*uGain*(1.0+hot*.7),a);
    #include <colorspace_fragment>
    }`;
  function mkTrail(R){const g=new T.BufferGeometry(),pos=new Float32Array(TN*2*3),aT=new Float32Array(TN*2),aS=new Float32Array(TN*2),idx=[];
    for(let i=0;i<TN;i++){aS[i*2]=0;aS[i*2+1]=1}for(let i=0;i<TN-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}
    g.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));g.setAttribute('aT',new T.BufferAttribute(aT,1).setUsage(T.DynamicDrawUsage));g.setAttribute('aS',new T.BufferAttribute(aS,1));g.setIndex(idx);
    const m=new T.ShaderMaterial({uniforms:Object.assign({uC:{value:new T.Color('#cfe6ff')},uGain:{value:1.4}},NXU()),vertexShader:TVERT,fragmentShader:TFRAG,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});
    const mesh=new T.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=11;mesh.visible=false;mesh.userData.arenaVFX=true;R.scene.add(mesh);
    return{g,m,mesh,pos,aT,tip:new Float32Array(TN*3),base:new Float32Array(TN*3),t:new Float32Array(TN).fill(-9),head:0,o:null,last:-9}}
  // ---------------- scorch marks (alpha blended, darken the ground) ----------------
  const SVERT=`attribute vec2 sA;varying vec2 vUv;varying vec2 vA;varying vec2 vWorld;void main(){vUv=uv;vA=sA;vec4 p=instanceMatrix*vec4(position,1.0);vWorld=(modelMatrix*p).xz;gl_Position=projectionMatrix*modelViewMatrix*p;}`;
  const SFRAG=`precision highp float;uniform vec2 uFocus;uniform float uVision;${VXN}varying vec2 vUv;varying vec2 vA;varying vec2 vWorld;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
    void main(){vec2 q=vUv*2.0-1.0;float r=length(q),n=n2(q*3.0+vA.y*13.0)*.6+n2(q*8.0+vA.y*3.0)*.4;float m=1.0-smoothstep(.45,1.0,r+(n-.5)*.5);
      float glow=(1.0-smoothstep(0.0,.18,vA.x))*exp(-r*r*3.0);float a=m*.62*(1.0-smoothstep(.55,1.0,vA.x));
      float vis=1.0-smoothstep(uVision-100.0,uVision+20.0,distance(vWorld,uFocus));a*=vis;if(a<.004)discard;
      float cw=(1.0-smoothstep(.0,.09,vxC(q*.85+vA.y*3.7)))*(1.0-smoothstep(.2,.9,r));float ember=cw*(1.0-smoothstep(.0,.45,vA.x));
      vec3 c=mix(vec3(.05,.035,.03),vec3(1.0,.42,.12),clamp(glow*smoothstep(.3,.8,n)+ember*1.2,0.0,1.0));a=max(a,ember*.9*vis);gl_FragColor=vec4(c*(1.0+ember*1.4),a);
      #include <colorspace_fragment>
    }`;
  function mkScorch(R,cap){const g=new T.PlaneGeometry(2,2).rotateX(-Math.PI/2),sA=new T.InstancedBufferAttribute(new Float32Array(cap*2),2);sA.setUsage(T.DynamicDrawUsage);g.setAttribute('sA',sA);
    const m=new T.ShaderMaterial({uniforms:Object.assign({uFocus:R.U.fowC,uVision:R.U.fowR},NXU()),vertexShader:SVERT,fragmentShader:SFRAG,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,toneMapped:false});
    const mesh=new T.InstancedMesh(g,m,cap);mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=2;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.userData.arenaVFX=true;R.scene.add(mesh);
    return{g,m,mesh,sA,cap,slots:Array.from({length:cap},()=>({on:false})),cur:0}}
  // ---------------- lifecycle ----------------
  function mode(R){const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;const high=!!R.hi&&!MOB;return{high,reduced,key:(high?'h':'l')+(reduced?'r':'')+(R.hi?'H':'')}}
  function alloc(R){if(!R.scene||!R.ok||!R.U)return null;const q=mode(R),prev=Math.random;Math.random=rnd;try{
      const capA=q.reduced?900:q.high?7000:R.hi?4200:2400,capS=q.reduced?160:q.high?700:400;
      return{scene:R.scene,q,add:psys(R,capA,true),alpha:psys(R,capS,false),trails:Array.from({length:q.reduced?4:q.high?18:10},()=>mkTrail(R)),scorch:mkScorch(R,q.high?28:14),
        time:0,emitted:0,budget:q.reduced?120:q.high?900:420,tmap:new Map(),c:new T.Color(),c2:new T.Color(),v:new T.Vector3(),v2:new T.Vector3(),d:new T.Object3D(),stats:{n:0,drop:0},seen:new WeakMap(),pt:new WeakMap()}}
    finally{Math.random=prev}}
  function dispose(R){const a=R._pfx;if(!a)return;for(const s of[a.add,a.alpha]){a.scene.remove(s.mesh);s.g.dispose();s.base.dispose();s.m.dispose()}
    for(const t of a.trails){a.scene.remove(t.mesh);t.g.dispose();t.m.dispose()}a.scene.remove(a.scorch.mesh);a.scorch.g.dispose();a.scorch.m.dispose();R._pfx=null}
  function ensure(R){const q=mode(R),a=R._pfx;if(a&&(a.scene!==R.scene||a.q.key!==q.key))dispose(R);if(!R._pfx)R._pfx=alloc(R);return R._pfx}
  const nearL=(x,z,m)=>{const L=typeof listener==='function'?listener():null;return !L||Math.hypot(x-L.x,z-L.y)<(typeof visionR==='function'?visionR():1100)+(m||200)};
  // one particle. kind: 0 glow · 1 spark (stretched by speed) · 2 smoke/mist (alpha) · 3 ember · 4 shard · 5 star
  P.pe=function(o){const a=this._pfx;if(!a)return false;if(a.emitted>=a.budget){a.stats.drop++;return false}const s=o.kind===2?a.alpha:a.add,i=s.cur;s.cur=(s.cur+1)%s.cap;
    const A=s.at;a.c.set(o.c||'#ffffff');a.c2.set(o.c2||o.c||'#ffffff');const j=i*4;
    A.a0.array.set([o.x,o.y,o.z,a.time+fin(o.delay,0)],j);A.a1.array.set([fin(o.vx,0),fin(o.vy,0),fin(o.vz,0),Math.max(.05,fin(o.life,.6))],j);
    A.a2.array.set([fin(o.s0,10),fin(o.s1,fin(o.s0,10)*.3),fin(o.g,0),fin(o.drag,0)],j);A.a3.array.set([a.c.r,a.c.g,a.c.b,fin(o.a,1)],j);A.a4.array.set([a.c2.r,a.c2.g,a.c2.b,o.kind|0],j);
    A.a5.array.set([fin(o.rot,rnd()*TAU),fin(o.rs,0),fin(o.st,0),rnd()],j);
    if(i<s.lo)s.lo=i;if(i>s.hi)s.hi=i;s.alive=Math.max(s.alive,a.time+fin(o.delay,0)+fin(o.life,.6));a.emitted++;a.stats.n++;return true};
  const G=(x,z,h)=>({x,y:P.gY(x,z)+(h||0),z});
  // bursts --------------------------------------------------------------
  const Q=()=>{const a=P._pfx;return !a?0:a.q.reduced?.35:a.q.high?1:.55},N=n=>Math.max(1,Math.round(n*Q()));
  function sparks(p,n,c,c2,sp,up,o){o=o||{};for(let i=0;i<N(n);i++){const an=rnd()*TAU,s=rr(.35,1)*sp,el=o.flat?rr(-.1,.3):rr(.1,1);
    P.pe({x:p.x,y:p.y,z:p.z,vx:Math.cos(an)*s,vz:Math.sin(an)*s,vy:el*up,g:o.g!==undefined?o.g:900,drag:o.drag||1.4,life:rr(.35,.8)*(o.life||1),s0:rr(3,6)*(o.size||1),s1:1,st:o.st||.055,kind:1,c,c2:c2||c,delay:o.delay||0})}}
  function embers(p,n,c,c2,r,o){o=o||{};for(let i=0;i<N(n);i++){const an=rnd()*TAU,d=rr(0,r||40);
    P.pe({x:p.x+Math.cos(an)*d,y:p.y+rr(0,30),z:p.z+Math.sin(an)*d,vx:rr(-40,40),vz:rr(-40,40),vy:rr(60,190)*(o.up||1),g:-25,drag:.9,life:rr(.9,2)*(o.life||1),s0:rr(4,8)*(o.size||1),s1:1,kind:3,c,c2:c2||c})}}
  function smoke(p,n,c,r,o){o=o||{};for(let i=0;i<N(n);i++){const an=rnd()*TAU,d=rr(0,r||30);
    P.pe({x:p.x+Math.cos(an)*d,y:p.y+rr(0,20),z:p.z+Math.sin(an)*d,vx:Math.cos(an)*rr(20,90),vz:Math.sin(an)*rr(20,90),vy:rr(30,110)*(o.up||1),g:-12,drag:1.1,life:rr(1.1,2.2)*(o.life||1),s0:rr(26,44)*(o.size||1),s1:rr(90,150)*(o.size||1),rs:rr(-.8,.8),kind:2,c:c||'#2a2522',c2:o.c2||'#15120f',a:o.a||.55,delay:o.delay||0})}}
  function glow(p,n,c,s,life,o){o=o||{};for(let i=0;i<N(n);i++)P.pe({x:p.x+rr(-6,6),y:p.y+rr(-6,6),z:p.z+rr(-6,6),vx:rr(-30,30)*(o.v||1),vy:rr(-10,40)*(o.v||1),vz:rr(-30,30)*(o.v||1),drag:2,life:(life||.4)*rr(.8,1.2),s0:s*rr(.7,1.2),s1:s*(o.end||.2),kind:0,c,c2:o.c2||c,a:o.a||1})}
  function shards(p,n,c,c2,sp,o){o=o||{};for(let i=0;i<N(n);i++){const an=rnd()*TAU,s=rr(.4,1)*sp;
    P.pe({x:p.x,y:p.y,z:p.z,vx:Math.cos(an)*s,vz:Math.sin(an)*s,vy:rr(150,560),g:1100,drag:.6,life:rr(.6,1.1),s0:rr(7,13)*(o.size||1),s1:rr(3,6),rs:rr(-14,14),kind:4,c,c2:c2||c})}}
  function stars(p,n,c,s,r){for(let i=0;i<N(n);i++){const an=rnd()*TAU,d=rr(0,r||30);P.pe({x:p.x+Math.cos(an)*d,y:p.y+rr(0,40),z:p.z+Math.sin(an)*d,vy:rr(10,60),drag:1,life:rr(.3,.6),s0:s*rr(.6,1.1),s1:s*.2,rs:rr(-3,3),kind:5,c,c2:'#ffffff'})}}
  function ring(p,n,c,r,sp,o){o=o||{};for(let i=0;i<N(n);i++){const an=i/N(n)*TAU+rr(-.1,.1);
    P.pe({x:p.x+Math.cos(an)*(o.r0||10),y:p.y,z:p.z+Math.sin(an)*(o.r0||10),vx:Math.cos(an)*sp,vz:Math.sin(an)*sp,vy:o.up||0,drag:o.drag||3,life:o.life||.5,s0:o.size||14,s1:3,kind:o.kind===undefined?0:o.kind,st:o.st||0,c,c2:o.c2||c})}}
  function scorch(x,z,r,life){const a=P._pfx;if(!a)return;const S=a.scorch;let s=null;for(let j=0;j<S.cap;j++){const i=(S.cur+j)%S.cap;if(!S.slots[i].on){s=S.slots[i];S.cur=(i+1)%S.cap;break}}
    if(!s){s=S.slots[S.cur];S.cur=(S.cur+1)%S.cap}Object.assign(s,{on:true,t:0,life:life||5,x,z,r,seed:rnd()*10,rot:rnd()*TAU})}
  P.pfxApi={sparks,embers,smoke,glow,shards,stars,ring,scorch,G,rr};
  // element bursts
  const EC={fire:['#ff7a22','#ffd27a'],frost:['#8fe3ff','#f2ffff'],storm:['#b38cff','#efe4ff'],holy:['#ffd66a','#fff6d8'],soul:['#7fe8ff','#c9b6ff']};
  function burst(p,el,r,big,c,c2){const e=EC[el]||[c||'#ffffff',c2||'#ffffff'],k=big?1.6:1;
    if(el==='fire'){glow({x:p.x,y:p.y+30,z:p.z},6,'#ffb050',r*.9,.38,{c2:'#ff3a10',end:.5,v:3});sparks({x:p.x,y:p.y+20,z:p.z},40*k,e[1],e[0],r*3,620);embers(p,30*k,e[0],'#ff3a10',r*.5);smoke(p,10*k,'#2a221e',r*.4,{size:big?1.5:1});scorch(p.x,p.z,r*.85,6)}
    else if(el==='frost'){glow({x:p.x,y:p.y+30,z:p.z},4,e[1],r*.7,.32,{c2:e[0]});shards({x:p.x,y:p.y+16,z:p.z},26*k,e[1],e[0],r*2.6);smoke(p,8*k,'#dff6ff',r*.5,{a:.32,c2:'#a9dcff',up:.4});stars(p,8*k,'#ffffff',26,r*.6);embers(p,14*k,'#ffffff','#bfeaff',r*.6,{up:.4})}
    else if(el==='storm'){glow({x:p.x,y:p.y+40,z:p.z},5,e[1],r*.8,.3,{c2:e[0]});sparks({x:p.x,y:p.y+30,z:p.z},50*k,'#ffffff',e[0],r*3.4,520,{st:.07,g:500});stars(p,10*k,e[0],34,r*.7);smoke(p,4*k,'#3a3150',r*.3,{a:.35})}
    else{glow({x:p.x,y:p.y+30,z:p.z},5,e[1],r*.8,.35,{c2:e[0]});sparks({x:p.x,y:p.y+24,z:p.z},34*k,e[1],e[0],r*2.6,560);stars(p,8*k,e[0],30,r*.6);embers(p,16*k,e[0],e[1],r*.5)}}
  // ---------------- hooks: skill styles ----------------
  const _pulse=P.v3Pulse;
  if(_pulse)P.v3Pulse=function(style,at,o,S){const r0=_pulse.apply(this,arguments);if(!this._pfx||!at)return r0;try{
    const r=Math.max(20,S.r||90),c=S.c,c2=S.c2,a=S.a||0,p=G(at.x,at.y,0),el=S.el;
    if(o.phase==='windup'){if(style==='meteor'||style==='elementslam'||style==='judgment'||style==='thunder')ring(G(at.x,at.y,6),24,c,r,-r*1.2,{r0:r,life:Math.max(.3,(o.delay||.5)),size:12,c2,drag:.5});return r0}
    switch(style){
      case'dash':case'spear':case'bladewave':case'icelance':{for(let i=0;i<N(26);i++){const d=rr(0,r*.8),q={x:at.x+Math.cos(a)*d,y:at.y+Math.sin(a)*d};const g=G(q.x,q.y,40);
          P.pe({x:g.x,y:g.y,z:g.z,vx:Math.cos(a)*rr(200,700),vz:Math.sin(a)*rr(200,700),vy:rr(-40,120),drag:2.4,life:rr(.25,.5),s0:rr(3,6),s1:1,st:.06,kind:1,c:c2,c2:c})}
        glow(G(at.x,at.y,40),3,c,90,.25);if(style==='icelance')shards(G(at.x,at.y,30),14,'#f2ffff',c,380);break}
      case'ward':case'royal':ring(G(at.x,at.y,10),32,c,0,180,{size:16,up:160,life:.7,c2});stars(G(at.x,at.y,40),12,c2,30,70);embers(p,20,c,c2,60,{up:1.4});break;
      case'judgment':case'elementslam':case'meteor':burst(p,style==='judgment'?'holy':el||'fire',r,true,c,c2);ring(G(at.x,at.y,8),40,c2,0,r*3.2,{size:10,kind:1,st:.05,life:.45,drag:2});
        if(style==='meteor'){smoke(p,14,'#1f1814',r*.6,{size:1.8,life:1.4});embers(p,40,'#ff7a22','#ff3a10',r*.9,{up:1.5})}break;
      case'cyclone':case'spirit':for(let i=0;i<N(40);i++){const an=rnd()*TAU,d=rr(r*.3,r*.9),g=G(at.x+Math.cos(an)*d,at.y+Math.sin(an)*d,rr(10,60));
          P.pe({x:g.x,y:g.y,z:g.z,vx:-Math.sin(an)*rr(300,600),vz:Math.cos(an)*rr(300,600),vy:rr(150,420),drag:1.5,g:200,life:rr(.5,.9),s0:rr(3,5),s1:1,st:.05,kind:1,c:c2,c2:c})}
        smoke(p,8,'#6a5a48',r*.6,{a:.3,up:1.6});break;
      case'warcry':ring(G(at.x,at.y,30),36,c,20,r*2.2,{size:18,life:.5,c2});ring(G(at.x,at.y,8),28,'#ffffff',20,r*2.6,{size:6,kind:1,st:.05,life:.45});break;
      case'fissure':{const L=S.len||r;for(let j=0;j<N(10);j++){const d=(j+.5)/10*L,g=G(at.x+Math.cos(a)*d,at.y+Math.sin(a)*d,8);sparks(g,8,c2,c,180,520,{life:1.1});smoke(g,2,'#4a3a2c',30,{a:.4})}
        for(let j=0;j<4;j++)scorch(at.x+Math.cos(a)*L*(j+.5)/4,at.y+Math.sin(a)*L*(j+.5)/4,r*.45,6);break}
      case'shadow':case'veil':smoke(p,12,'#2a1838',60,{a:.55,c2:'#120a1a'});glow(G(at.x,at.y,50),6,c,60,.4,{c2});break;
      case'lotus':for(let i=0;i<N(36);i++){const an=rnd()*TAU,g=G(at.x+Math.cos(an)*r*.5,at.y+Math.sin(an)*r*.5,rr(20,60));P.pe({x:g.x,y:g.y,z:g.z,vx:-Math.sin(an)*500,vz:Math.cos(an)*500,vy:rr(-20,80),drag:2,life:.5,s0:5,s1:1,st:.06,kind:1,c:c2,c2:c})}break;
      case'arrowfan':case'barrage':glow(G(at.x,at.y,45),3,c2,60,.2);sparks(G(at.x,at.y,45),12,c2,c,300,200,{flat:1,life:.6});break;
      case'snare':case'trap':ring(G(at.x,at.y,12),28,c,r,-r*.6,{size:10,life:.6,c2,kind:5});break;
      case'crescent':for(let i=0;i<N(40);i++){const an=a+rr(-1.1,1.1),d=r*rr(.6,1),g=G(at.x+Math.cos(an)*d,at.y+Math.sin(an)*d,rr(20,70));
          P.pe({x:g.x,y:g.y,z:g.z,vx:-Math.sin(an)*rr(200,500),vz:Math.cos(an)*rr(200,500),vy:rr(0,140),drag:2,life:rr(.3,.6),s0:rr(3,6),s1:1,st:.05,kind:1,c:c2,c2:c})}break;
      case'arrowrain':for(let i=0;i<N(18);i++){const an=rnd()*TAU,d=r*Math.sqrt(rnd())*.85;sparks(G(at.x+Math.cos(an)*d,at.y+Math.sin(an)*d,6),3,c2,c,160,260,{delay:rnd()*.4})}break;
      case'fireball':case'explosive':case'fireburst':burst(p,'fire',r,style!=='fireball');break;
      case'iceburst':case'blizzard':burst(p,'frost',r,style==='blizzard');if(style==='blizzard')for(let i=0;i<N(60);i++){const an=rnd()*TAU,d=r*Math.sqrt(rnd()),g=G(at.x+Math.cos(an)*d,at.y+Math.sin(an)*d,rr(80,300));
          P.pe({x:g.x,y:g.y,z:g.z,vx:rr(-80,80),vz:rr(-80,80),vy:-rr(60,140),life:rr(1,2),s0:rr(3,6),s1:2,kind:3,c:'#ffffff',c2:'#cfefff',delay:rnd()*.6})}break;
      case'chain':case'stormfield':case'thunder':burst(p,'storm',r,style==='thunder');break;
      case'duality':case'elementburst':case'elementstorm':case'elementfield':burst(p,el||'fire',r,style!=='elementfield',c,c2);if(S.el2)burst(p,S.el2,r*.8,false,c2,c);break;
      case'dragon':burst(p,'fire',140,true);break}
  }catch(e){}return r0};
  // summoner bursts
  const _sfx=P.soulFx;if(_sfx)P.soulFx=function(e){const r=_sfx.apply(this,arguments);if(!this._pfx||!nearL(e.x,e.y))return r;try{const p=G(e.x,e.y,0),C=EC.soul;
    if(e.k==='soulsum'){embers(p,40,C[0],C[1],80,{up:1.8});stars(G(e.x,e.y,30),10,C[0],34,80);ring(G(e.x,e.y,20),30,C[0],10,320,{size:14,up:120,life:.6,c2:C[1]})}
    else if(e.k==='soulcmd'){const p2=G(e.x2,e.y2,50),p1=G(e.x,e.y,60);for(let i=0;i<N(30);i++){const t=rnd();P.pe({x:p1.x+(p2.x-p1.x)*t,y:p1.y+(p2.y-p1.y)*t,z:p1.z+(p2.z-p1.z)*t,vx:rr(-40,40),vy:rr(0,60),vz:rr(-40,40),drag:2,life:rr(.3,.6),s0:rr(10,18),s1:2,kind:0,c:C[0],c2:C[1]})}burst(p2,'soul',90,false,C[0],C[1])}
    else if(e.k==='soulgd'){const d=.45;burst(p,'soul',e.r||250,true,C[1],C[0]);smoke(p,12,'#2a2340',(e.r||250)*.5,{a:.45,delay:d});scorch(e.x,e.y,(e.r||250)*.8,7)}
    else if(e.k==='soulgone')glow(G(e.x,e.y,40),4,C[0],50,.35)}catch(err){}return r};
  // hits throw sparks
  const _hv=P.hitVfx;if(_hv)P.hitVfx=function(x,y,crit,tid){const r=_hv.apply(this,arguments);if(!this._pfx)return r;try{const u=tid!==undefined?UMAP.get(tid):null,h=u&&(u.big||u.boss||u.golem)?110:62;
    const p=G(x,y,h);sparks(p,crit?26:12,crit?'#fff1b8':'#ffffff',crit?'#ffb43a':'#ffd6a0',crit?520:340,crit?380:240,{life:.7,size:crit?1.3:1});glow(p,crit?3:1,crit?'#ffd27a':'#ffffff',crit?70:40,.18)}catch(e){}return r};
  // deaths puff smoke; everything else passes through
  const _df=P.doFx;P.doFx=function(e,me,L){const r=_df.apply(this,arguments);if(!this._pfx||!e||e.t!=='fx')return r;try{
    if(e.k==='die'&&e.x!==undefined&&nearL(e.x,e.y)){const u=UMAP.get(e.id),big=e.big||u&&(u.big||u.boss||u.golem),p=G(e.x,e.y,0);smoke(p,big?14:6,'#3a3430',big?60:26,{a:.45,size:big?1.6:1});embers(p,big?24:8,e.zombie||u?.zombie?'#9dff7a':'#ffb070','#ff5a2a',big?60:24)}
    else if(e.k==='leap'&&e.x!==undefined){scorch(e.x,e.y,(e.r||200)*.7,5)}}catch(err){}return r};
  // ---------------- per frame: trails, projectile tails, dash afterimages, scorch ----------------
  const ACT=u=>u&&!u.dead&&(u.atkAnim>0||u.spinT>0||u.lotusT>0);
  function trails(R,a,dt){const now=a.time,life=a.q.high?.26:.2;
    for(const [o,t] of a.tmap){if(!t.u||R.objs.get(t.u.id)!==o||now-t.last>life+.1){t.o=null;t.u=null;t.mesh.visible=false;a.tmap.delete(o)}}
    if(typeof units==='undefined')return;
    for(const u of units){const o=R.objs.get(u.id);if(!o||!o.root||!o.root.visible||u.dead)continue;const tip=o.wtip||o.wpnTip,hand=o.handR||o.hand;if(!tip||!hand)continue;
      const act=o.ecl?!!o.overlay:ACT(u);if(!act&&!a.tmap.has(o))continue;if(!nearL(u.x,u.y))continue;
      let t=a.tmap.get(o);if(!t){t=a.trails.find(x=>!x.o);if(!t)continue;t.o=o;t.u=u;t.t.fill(-9);t.head=0;a.tmap.set(o,t);t.m.uniforms.uC.value.set(o.wglowC||o.wpnC||(u.wt>=3?'#ffd27a':u.wt===2?'#c79bff':'#cfe6ff'))}
      if(act){tip.getWorldPosition(a.v);hand.getWorldPosition(a.v2);const i=t.head;t.head=(t.head+1)%TN;t.tip.set([a.v.x,a.v.y,a.v.z],i*3);
        // the inner edge sits a third of the way from the hand so the ribbon hugs the blade
        t.base.set([a.v2.x+(a.v.x-a.v2.x)*.3,a.v2.y+(a.v.y-a.v2.y)*.3,a.v2.z+(a.v.z-a.v2.z)*.3],i*3);t.t[i]=now;t.last=now}
      let alive=0;for(let k=0;k<TN;k++){const i=(t.head-1-k+TN*2)%TN,ag=(now-t.t[i])/life;const A=ag>1||t.t[i]<0?1:ag;if(A<1)alive++;
        const src=t.t[i]<0?(t.head-1+TN)%TN:i;t.pos.set([t.base[src*3],t.base[src*3+1],t.base[src*3+2]],k*6);t.pos.set([t.tip[src*3],t.tip[src*3+1],t.tip[src*3+2]],k*6+3);t.aT[k*2]=A;t.aT[k*2+1]=A}
      t.mesh.visible=alive>1;t.g.attributes.position.needsUpdate=true;t.g.attributes.aT.needsUpdate=true}}
  const BIGP={1:['#ffb050','fire'],2:['#ff8a2a','fire'],3:['#9fe8ff','frost'],4:['#bff0ff','frost'],6:['#dfe8ff',null],8:['#ff9a4a','fire'],9:['#e8d8a8',null],10:['#c9b0ff','storm'],11:['#7ff0d8',null],12:['#c9e0ff',null],14:['#ff8a3a','fire'],15:['#ffffff',null],16:['#7fe8ff','soul']};
  function projTrails(R,a,dt){if(typeof projs==='undefined')return;let n=0;const cap=a.q.high?28:14;
    for(const p of projs){if(n>=cap)break;if(!nearL(p.x,p.y))continue;n++;const g=G(p.x,p.y,42),b=BIGP[p.kind],el=p.el||(b&&b[1]);
      const c=el&&EC[el]?EC[el][0]:b?b[0]:'#ffffff',c2=el&&EC[el]?EC[el][1]:'#ffffff',big=!!b,sp=Math.hypot(p.vx,p.vy)||1;
      const steps=big?2:1;for(let s=0;s<steps;s++){const k=s/steps;P.pe({x:g.x-p.vx*dt*k,y:g.y,z:g.z-p.vy*dt*k,vx:-p.vx*.04+rr(-15,15),vy:rr(-6,18),vz:-p.vy*.04+rr(-15,15),drag:3,life:big?.34:.16,s0:(p.r||8)*(big?1.7:1.1),s1:2,kind:0,c,c2,a:big?.9:.6})}
      if(el==='fire'&&rnd()<.7)P.pe({x:g.x,y:g.y,z:g.z,vx:rr(-40,40),vy:rr(40,120),vz:rr(-40,40),g:-20,drag:1,life:rr(.4,.8),s0:5,s1:1,kind:3,c:'#ffb050',c2:'#ff3a10'});
      if(el==='fire'&&a.q.high&&rnd()<.25)smoke(g,1,'#2a2420',6,{a:.35,size:.5,life:.6});
      if(el==='frost'&&rnd()<.35)P.pe({x:g.x,y:g.y,z:g.z,vx:rr(-60,60),vy:rr(0,80),vz:rr(-60,60),g:500,life:.5,s0:6,s1:3,rs:rr(-10,10),kind:4,c:'#f2ffff',c2:'#8fe3ff'});
      if(el==='storm'&&rnd()<.5)P.pe({x:g.x,y:g.y,z:g.z,vx:rr(-200,200),vy:rr(-50,150),vz:rr(-200,200),drag:4,life:.2,s0:3,s1:1,st:.06,kind:1,c:'#ffffff',c2:'#b38cff'});
      if(el==='soul'&&rnd()<.5)P.pe({x:g.x,y:g.y,z:g.z,vx:rr(-30,30),vy:rr(10,60),vz:rr(-30,30),drag:1,life:.6,s0:7,s1:1,kind:3,c:'#7fe8ff',c2:'#c9b6ff'})}}
  function dashes(R,a,dt){if(typeof units==='undefined')return;const me=typeof ME==='function'?ME():null,L=typeof listener==='function'?listener():null;
    for(const u of units){if(!u.hero||u.dead||!(u.dash||u.leap))continue;if(!nearL(u.x,u.y))continue;if(typeof unitVisibleTo==='function'&&!unitVisibleTo(u,me,L))continue;
      const o=R.objs.get(u.id),c=o&&o.wglowC||(u.wt>=3?'#ffd27a':u.wt===2?'#c79bff':'#cfe6ff');const g=G(u.x,u.y,0);
      for(let i=0;i<(a.q.high?3:2);i++)P.pe({x:g.x+rr(-14,14),y:g.y+rr(20,110),z:g.z+rr(-14,14),vx:rr(-20,20),vy:rr(0,30),vz:rr(-20,20),drag:2,life:.32,s0:rr(22,34),s1:4,kind:0,c,c2:'#ffffff',a:.55});
      if(rnd()<.6)P.pe({x:g.x,y:g.y+4,z:g.z,vx:rr(-60,60),vy:rr(40,120),vz:rr(-60,60),g:600,drag:1,life:.5,s0:4,s1:1,st:.04,kind:1,c:'#fff1d0',c2:c})}}
  function scorchStep(a,dt){const S=a.scorch,d=a.d;let n=0;for(const s of S.slots){if(!s.on)continue;s.t+=dt;if(s.t>=s.life){s.on=false;continue}
      d.position.set(s.x,P.gY(s.x,s.z)+1.6,s.z);d.rotation.set(0,s.rot,0);d.scale.set(s.r,1,s.r);d.updateMatrix();S.mesh.setMatrixAt(n,d.matrix);S.sA.setXY(n,s.t/s.life,s.seed);n++}
    S.mesh.count=n;S.mesh.visible=n>0;if(n){S.mesh.instanceMatrix.needsUpdate=true;S.sA.needsUpdate=true}}
  function upload(a){for(const s of[a.add,a.alpha]){s.mesh.visible=s.alive>a.time;s.m.uniforms.uTime.value=a.time;if(s.hi<0)continue;
      for(const k of['a0','a1','a2','a3','a4','a5']){const at=s.at[k];at.clearUpdateRanges();at.addUpdateRange(s.lo*4,(s.hi-s.lo+1)*4);at.needsUpdate=true}s.lo=1e9;s.hi=-1}}
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r=_fx.call(this,Tm,dt,me,L);try{const a=ensure(this);if(a){dt=Math.min(.1,Math.max(0,dt||0));a.time+=dt;
      const gain=(this.post?1.2:1.0)*(a.q.reduced?.8:1);   // round 1: was 1.45/1.05a.add.m.uniforms.uGain.value=gain;for(const t of a.trails)t.m.uniforms.uGain.value=gain*1.2;
      trails(this,a,dt);projTrails(this,a,dt);dashes(this,a,dt);scorchStep(a,dt);upload(a);a.emitted=0}}catch(e){if(!this._pfxErr){this._pfxErr=1;console.warn('pfx',e)}}return r};
  const _ini=P.initFX;if(_ini)P.initFX=function(){const r=_ini.apply(this,arguments);try{const a=this._pfx;if(a){for(const s of[a.add,a.alpha]){s.at.a0.array.fill(-1e9);for(let i=0;i<s.cap;i++)s.at.a0.array[i*4+3]=-1e9;s.lo=0;s.hi=s.cap-1;s.alive=0}for(const t of a.trails){t.o=null;t.mesh.visible=false}a.tmap.clear();for(const s of a.scorch.slots)s.on=false}}catch(e){}return r};
  const _ds=P.disposeScene;P.disposeScene=function(){dispose(this);return _ds.apply(this,arguments)};
  window.ArenaPFX={snapshot(){const a=P._pfx;if(!a)return{enabled:false};return{enabled:true,quality:a.q.high?'high':'low',emitted:a.stats.n,dropped:a.stats.drop,capAdd:a.add.cap,capAlpha:a.alpha.cap,trails:a.tmap.size,scorch:a.scorch.mesh.count}}};
})();
