/* Arena Royale · signature skill VFX (Claude, 2026-11-20 · index only). VFX round 2. Render only, own random stream.
 * The arena choreography drew every skill out of the same flat rings and magic circles. This layer gives the big skills a real
 * body, the way modern action games build them in layers (anticipation -> white-hot impact -> fire/energy -> smoke -> embers):
 *  - billboards with premultiplied blending, so one sprite can glow (fire) AND occlude (smoke) without washing the screen out:
 *    fireball (white-hot core cooling through orange and red into dark lit smoke), flame, smoke, flash, frost mist, dust
 *  - branching lightning bolts (midpoint-displaced, forked, striking down from the sky in a blink and flickering out)
 *  - recipes per skill style: fireball/explosive/fireburst/meteor/burn, thunder/stormfield/chain/elementstorm,
 *    iceburst/blizzard/icelance, judgment/elementslam/fissure/leap/warcry/cyclone dust; meteors fall from the sky during the
 *    windup with a smoke trail; fire projectiles burn and smoke in flight.
 * Hooks the 3D layer's style dispatch (R3.v3Pulse) plus one projectile pass per frame; nothing in combat is read for writing. */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined'||typeof R3.avEmit!=='function')return;
  const P=R3,T=THREE,TAU=Math.PI*2,PI=Math.PI;
  let seed=0x1b873593;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};
  const rr=(a,b)=>a+(b-a)*rnd(),fin=(v,d)=>Number.isFinite(v)?v:d,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const VXN=window.VFXN_GLSL||`uniform sampler2D vxN;uniform float vxT;float vxF(vec2 u){return .5;}float vxC(vec2 u){return 1.0;}float vxR(vec2 u){return .5;}float vxA(vec2 u){return .5;}
    float vxFlow(vec2 u,vec2 v){return .5;}float vxBurn(float n,float th,float w){return smoothstep(th-w,th+w,n);}float vxRim(float n,float th,float w){return 0.0;}vec3 vxHot(vec3 c){return c;}`;
  const NXU=()=>window.ArenaVFXTex?ArenaVFXTex.uniforms():{vxN:{value:null},vxT:{value:0}};
  const KIND={fire:0,flame:1,smoke:2,flash:3,mist:4,dust:5};
  // ---------------- billboards ----------------
  const BVERT=`attribute vec4 hL;attribute vec3 hC;attribute vec3 hC2;
    varying vec2 vUv;varying vec4 vL;varying vec3 vC;varying vec3 vC2;varying vec2 vWorld;
    void main(){vUv=uv;vL=hL;vC=hC;vC2=hC2;vec4 c=instanceMatrix*vec4(0.0,0.0,0.0,1.0);vWorld=c.xz;
      float s=length(instanceMatrix[0].xyz),rot=hL.y+hL.x*(fract(hL.y*3.7)-.5)*1.4;
      vec4 mv=modelViewMatrix*c;float cs=cos(rot),sn=sin(rot);mv.xy+=mat2(cs,sn,-sn,cs)*position.xy*s;gl_Position=projectionMatrix*mv;}`;
  const BFRAG=`precision highp float;uniform float hGain;uniform vec2 uFocus;uniform float uVision;
    ${VXN}
    varying vec2 vUv;varying vec4 vL;varying vec3 vC;varying vec3 vC2;varying vec2 vWorld;
    vec3 fireRamp(float t,vec3 c,vec3 c2){vec3 deep=c*c/max(max(c.r,max(c.g,c.b)),1e-3);
      vec3 col=mix(vec3(0.0),deep*.5,smoothstep(.0,.22,t));col=mix(col,c,smoothstep(.18,.48,t));col=mix(col,c2,smoothstep(.42,.74,t));return mix(col,vxHot(c2)*1.2,smoothstep(.7,1.0,t));}
    float lit(vec3 n,float k){return clamp(dot(normalize(vec3(n.xy+vec2(k-.5)*.9,n.z)),normalize(vec3(-.3,.75,.6))),0.0,1.0);}
    void main(){vec2 q=vUv*2.0-1.0;float r2=dot(q,q);if(r2>1.0)discard;
      float age=vL.x,sd=fract(vL.y*.1591)*7.0,kind=vL.z,gain=vL.w,r=sqrt(r2),z=sqrt(1.0-r2);vec3 nrm=vec3(q,z);vec2 su=q/(1.0+z);
      vec3 emit=vec3(0.0);float alpha=0.0;
      if(kind<.5){                                  // fireball: white-hot core cooling into dark, lit smoke
        vec2 u=su*.55+vec2(sd,-age*.35-vxT*.04);float n=vxF(u)*.55+vxA(u*2.1+vec2(age*.3,sd))*.3+vxR(u*3.3-sd)*.15;
        float body=1.0-smoothstep(.48,.97,r+(n-.5)*.62);
        float temp=clamp((1.0-age*1.35)*(.45+.75*z)+(n-.5)*.7+.1,0.0,1.0);
        float fireA=body*smoothstep(.12,.4,temp);
        float smk=body*(1.0-smoothstep(.12,.42,temp))*smoothstep(.04,.28,age)*(1.0-smoothstep(.7,1.0,age));
        vec3 smokeC=mix(vec3(.03,.026,.024),vec3(.29,.27,.25),lit(nrm,n))*(.75+.5*n);
        alpha=smk*.9;emit=fireRamp(temp,vC,vC2)*fireA*(1.0+temp*2.4)+smokeC*alpha;alpha=max(alpha,fireA*.3);
      }else if(kind<1.5){                           // flame: licking fire, no smoke
        vec2 u=su*.5+vec2(sd,-vxT*1.6);float n=vxF(u)*.6+vxA(u*2.3-vec2(0.0,vxT*2.1))*.4;
        float body=1.0-smoothstep(.32,.95,r+(n-.5)*.6);float temp=clamp(.5+z*.5+(n-.5)*.65-age*.5,0.0,1.0);
        emit=fireRamp(temp,vC,vC2)*body*(1.0+temp*2.0)*(1.0-smoothstep(.6,1.0,age));alpha=body*.15*(1.0-age);
      }else if(kind<2.5||kind>4.5){                 // smoke (2) and ground dust (5): billowing, lit from above
        vec2 u=su*.5+vec2(sd,-age*.22);float n=vxF(u)*.6+vxA(u*2.0+sd)*.4;
        float body=1.0-smoothstep(.3,1.0,r+(n-.5)*.8);float l=lit(nrm,n);
        alpha=body*(.5+.5*n)*smoothstep(0.0,.12,age)*(1.0-smoothstep(.5,1.0,age))*gain;
        emit=mix(vC*.35,vC,l)*alpha*(kind>4.5?1.15:1.0);
      }else if(kind<3.5){                           // flash: a white-hot point with flickering rays and a coloured halo
        float an=atan(q.y,q.x),core=exp(-r2*16.0),halo=exp(-r2*3.2)*.32;
        float rays=pow(abs(cos(an*3.0+sd)),22.0)*exp(-r*2.4)*(.55+.9*vxF(vec2(an/6.2831*3.0+sd,vxT*1.5)));
        float f=pow(max(0.0,1.0-age),2.2);emit=(vxHot(vC2)*core*3.2+vC*(halo+rays*.8))*f*gain;
      }else{                                        // frost mist: pale, lit, drifting
        vec2 u=su*.5+vec2(sd,-age*.12+vxT*.03);float n=vxF(u)*.6+vxA(u*2.2+sd)*.4;
        float body=1.0-smoothstep(.28,1.0,r+(n-.5)*.85);float l=lit(nrm,n);
        alpha=body*.42*smoothstep(0.0,.18,age)*(1.0-smoothstep(.45,1.0,age))*gain;
        emit=mix(vC*.6,vC2,l)*alpha*1.15+vC2*body*.1*(1.0-age)*gain;
      }
      float vis=1.0-smoothstep(uVision-100.0,uVision+20.0,distance(vWorld,uFocus));emit*=vis*hGain;alpha*=vis;
      if(alpha<.002&&max(emit.r,max(emit.g,emit.b))<.002)discard;
      gl_FragColor=vec4(emit,alpha);
      #include <colorspace_fragment>
    }`;
  // ---------------- lightning ----------------
  const NP=20;   // points per bolt strand
  const LVERT=`uniform float uTime;attribute vec3 aDir;attribute float aSide;attribute vec4 aInfo;attribute vec3 aCol;
    varying float vAge;varying float vU;varying float vS;varying float vSeed;varying vec3 vC;varying vec2 vWorld;
    void main(){vAge=(uTime-aInfo.z)/max(aInfo.w,1e-3);vU=fract(aInfo.x);vSeed=floor(aInfo.x);vS=aSide;vC=aCol;vWorld=position.xz;
      if(vAge<0.0||vAge>1.0){gl_Position=vec4(2.0,2.0,2.0,1.0);return;}
      vec4 mv=viewMatrix*vec4(position,1.0);vec3 d=(viewMatrix*vec4(aDir,0.0)).xyz;vec3 sd=cross(normalize(d+vec3(0.0,0.0,1e-4)),vec3(0.0,0.0,1.0));
      mv.xyz+=normalize(sd+vec3(1e-5,0.0,0.0))*aSide*aInfo.y;gl_Position=projectionMatrix*mv;}`;
  const LFRAG=`precision highp float;uniform float hGain;uniform vec2 uFocus;uniform float uVision;
    ${VXN}
    varying float vAge;varying float vU;varying float vS;varying float vSeed;varying vec3 vC;varying vec2 vWorld;
    void main(){if(vAge<0.0||vAge>1.0)discard;
      float lead=smoothstep(vU-.03,vU+.03,vAge*8.0);                       // the strike runs down the strand in the first eighth of its life
      float flick=.4+.6*step(.42,vxF(vec2(floor(vAge*16.0)*.173+vSeed*.31,vSeed*.07)));
      float fade=pow(1.0-vAge,1.6),x=abs(vS),core=exp(-x*x*70.0),glow=exp(-x*x*5.5)*.55;
      vec3 col=vxHot(vC)*core*3.6+vC*glow*1.5;float k=lead*flick*fade;
      float vis=1.0-smoothstep(uVision-100.0,uVision+20.0,distance(vWorld,uFocus));if(k*vis<.003)discard;
      gl_FragColor=vec4(col*hGain,k*vis);
      #include <colorspace_fragment>
    }`;
  function mode(R){const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;const high=!!R.hi&&!R.mobile;return{high,reduced,key:(high?'h':'l')+(reduced?'r':'')}}
  function allocate(R){if(!R.scene||!R.ok)return null;const q=mode(R);
    const cap=Math.floor((q.high?160:64)*(q.reduced?.5:1)),bolts=Math.floor((q.high?40:16)*(q.reduced?.5:1));
    // billboards
    const g=new T.PlaneGeometry(2,2),hL=new T.InstancedBufferAttribute(new Float32Array(cap*4),4),hC=new T.InstancedBufferAttribute(new Float32Array(cap*3),3),hC2=new T.InstancedBufferAttribute(new Float32Array(cap*3),3);
    for(const a of[hL,hC,hC2])a.setUsage(T.DynamicDrawUsage);g.setAttribute('hL',hL);g.setAttribute('hC',hC);g.setAttribute('hC2',hC2);
    const m=new T.ShaderMaterial({uniforms:Object.assign({hGain:{value:1},uFocus:R.U.fowC,uVision:R.U.fowR},NXU()),vertexShader:BVERT,fragmentShader:BFRAG,transparent:true,depthWrite:false,depthTest:true,
      blending:T.CustomBlending,blendEquation:T.AddEquation,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor,blendSrcAlpha:T.OneFactor,blendDstAlpha:T.OneMinusSrcAlphaFactor,toneMapped:false});
    const mesh=new T.InstancedMesh(g,m,cap);mesh.name='arena-vfx-hero';mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.renderOrder=7;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.userData.arenaVFX=true;R.scene.add(mesh);
    // lightning strands: NP points -> 2*NP vertices each, written only when a bolt is born
    const nv=bolts*NP*2,lg=new T.BufferGeometry(),pos=new Float32Array(nv*3),dir=new Float32Array(nv*3),side=new Float32Array(nv),info=new Float32Array(nv*4),col=new Float32Array(nv*3),idx=[];
    for(let b=0;b<bolts;b++)for(let i=0;i<NP-1;i++){const a=(b*NP+i)*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}
    for(let v=0;v<nv;v++){side[v]=v%2?1:-1;info[v*4+2]=-1e9;info[v*4+3]=.001}
    const at=(n,arr,k)=>{const x=new T.BufferAttribute(arr,k);x.setUsage(T.DynamicDrawUsage);lg.setAttribute(n,x);return x};
    const aPos=at('position',pos,3),aDir=at('aDir',dir,3),aInfo=at('aInfo',info,4),aCol=at('aCol',col,3);lg.setAttribute('aSide',new T.BufferAttribute(side,1));lg.setIndex(idx);
    const lm=new T.ShaderMaterial({uniforms:Object.assign({uTime:{value:0},hGain:{value:1},uFocus:R.U.fowC,uVision:R.U.fowR},NXU()),vertexShader:LVERT,fragmentShader:LFRAG,transparent:true,depthWrite:false,depthTest:true,
      blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});
    const lmesh=new T.Mesh(lg,lm);lmesh.name='arena-vfx-bolts';lmesh.frustumCulled=false;lmesh.renderOrder=11;lmesh.visible=false;lmesh.userData.arenaVFX=true;R.scene.add(lmesh);
    return{scene:R.scene,q,cap,mesh,g,m,hL,hC,hC2,slots:Array.from({length:cap},()=>({on:false})),cur:0,order:[],emitted:0,budget:q.reduced?40:q.high?140:60,
      lg,lm,lmesh,bolts,aPos,aDir,aInfo,aCol,bcur:0,time:0,boltUntil:0,seqs:[],d:new T.Object3D(),c:new T.Color(),c2:new T.Color(),v:new T.Vector3(),stats:{acc:0,drop:0,bolts:0}}}
  function create(R){const prev=Math.random;try{Math.random=rnd;return allocate(R)}finally{Math.random=prev}}
  function dispose(R){const a=R._hx;if(!a)return;for(const o of[a.mesh,a.lmesh])a.scene.remove(o);a.g.dispose();a.m.dispose();a.lg.dispose();a.lm.dispose();if(a.mesh.dispose)a.mesh.dispose();R._hx=null}
  function ensure(R){const q=mode(R),o=R._hx;if(o&&(o.scene!==R.scene||o.q.key!==q.key))dispose(R);if(!R._hx)R._hx=create(R);return R._hx}
  const listenerNear=(x,y,pad)=>{const L=typeof listener==='function'?listener():null,reach=typeof visionR==='function'?visionR():1100;return !L||Math.hypot(x-L.x,y-L.y)<reach+(pad||200)};
  // ---------------- emitters ----------------
  // kind: KIND.*; o: x,y,h (height above ground), r,r1 (radius start/end), life, c,c2, vx,vy,vz (world units/s), drag, rise (upward accel), gain, delay
  function hx(R,kind,o){const a=R._hx;if(!a||!o||!Number.isFinite(o.x)||!Number.isFinite(o.y))return false;if(a.emitted>=a.budget){a.stats.drop++;return false}
    let s=null;for(let j=0;j<a.cap;j++){const i=(a.cur+j)%a.cap;if(!a.slots[i].on){s=a.slots[i];a.cur=(i+1)%a.cap;break}}if(!s){a.stats.drop++;return false}
    a.c.set(o.c||'#ff7a2a');a.c2.set(o.c2||'#ffe7a0');const gy=R.gY(o.x,o.y);
    Object.assign(s,{on:true,t:0,delay:Math.max(0,fin(o.delay,0)),life:clamp(fin(o.life,.8),.05,6),kind,x:o.x,y:gy+fin(o.h,30),z:o.y,r:fin(o.r,40),r1:fin(o.r1,fin(o.r,40)*1.6),
      vx:fin(o.vx,0),vy:fin(o.vy,0),vz:fin(o.vz,0),drag:fin(o.drag,1.6),rise:fin(o.rise,0),gain:fin(o.gain,1),seed:rnd()*TAU,ease:o.ease||0,
      cr:a.c.r,cg:a.c.g,cb:a.c.b,c2r:a.c2.r,c2g:a.c2.g,c2b:a.c2.b});a.emitted++;a.stats.acc++;return true}
  // a branching bolt from A (in the sky) to B (ground); heights are above the local ground
  function midpoint(pts,a,b,depth,rough){if(depth<=0){pts.push(b);return}const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],L=Math.hypot(dx,dy,dz);
    const m=[(a[0]+b[0])/2+rr(-1,1)*L*rough,(a[1]+b[1])/2+rr(-.5,.5)*L*rough*.5,(a[2]+b[2])/2+rr(-1,1)*L*rough];midpoint(pts,a,m,depth-1,rough);midpoint(pts,m,b,depth-1,rough)}
  function strand(R,pts,w,c,life,delay){const a=R._hx;if(!a)return;const b=a.bcur;a.bcur=(a.bcur+1)%a.bolts;a.stats.bolts++;
    const n=Math.min(NP,pts.length),t0=a.time+(delay||0),sd=Math.floor(rnd()*900);a.c.set(c);
    for(let i=0;i<NP;i++){const p=pts[Math.min(i,n-1)],pn=pts[Math.min(i+1,n-1)],pp=pts[Math.min(Math.max(i-1,0),n-1)];const dx=pn[0]-pp[0],dy=pn[1]-pp[1],dz=pn[2]-pp[2],L=Math.hypot(dx,dy,dz)||1;
      const u=Math.min(i,n-1)/Math.max(1,n-1),wi=w*(1-u*.35);
      for(let k=0;k<2;k++){const v=(b*NP+i)*2+k;a.aPos.array.set(p,v*3);a.aDir.array.set([dx/L,dy/L,dz/L],v*3);a.aInfo.array.set([sd+Math.min(u,.999),wi,t0,life],v*4);a.aCol.array.set([a.c.r,a.c.g,a.c.b],v*3)}}
    for(const x of[a.aPos,a.aDir,a.aInfo,a.aCol])x.needsUpdate=true;a.boltUntil=Math.max(a.boltUntil,t0+life);a.lmesh.visible=true}
  function bolt(R,x,y,o={}){const a=R._hx;if(!a||!listenerNear(x,y))return;const gy=R.gY(x,y),H=fin(o.H,rr(520,760)),top=[x+rr(-90,90),gy+H,y+rr(-90,90)],bot=[x,gy+4,y];
    const pts=[top];midpoint(pts,top,bot,4,.16);const c=o.c||'#b9a2ff',life=fin(o.life,.42),w=fin(o.w,26),delay=fin(o.delay,0);
    strand(R,pts,w,c,life,delay);
    if(!a.q.reduced){for(let k=0;k<(a.q.high?2:1);k++){const i=Math.floor(rr(.25,.6)*(pts.length-1)),p=pts[i],L=H*rr(.25,.42),an=rr(0,TAU),e=[p[0]+Math.cos(an)*L*.6,p[1]-L,p[2]+Math.sin(an)*L*.6];
      const br=[p];midpoint(br,p,e,3,.22);strand(R,br,w*.55,c,life*.8,delay+.012)}}
    // impact: a flash, a light, scorched earth
    hx(R,KIND.flash,{x,y,h:20,r:fin(o.fr,120),r1:fin(o.fr,120)*1.4,life:.32,c,c2:'#ffffff',delay,gain:1.1});
    hx(R,KIND.smoke,{x,y,h:20,r:30,r1:90,life:1.1,c:'#4a4458',vy:30,delay:delay+.05,gain:.55});
    if(R.flash)R.flash(x,gy+80,y,c,3600,520,.25);
    const api=R.pfxApi;if(api){try{api.sparks(api.G(x,y,10),a.q.high?16:8,c,'#ffffff',380,true);api.scorch(x,y,52,4)}catch(e){}}}
  function chainBolt(R,p,q,c,delay){const a=R._hx;if(!a)return;const h1=R.gY(p.x,p.y)+60,h2=R.gY(q.x,q.y)+60,A=[p.x,h1,p.y],B=[q.x,h2,q.y],pts=[A];midpoint(pts,A,B,4,.12);strand(R,pts,22,c,.32,delay||0)}
  // ---------------- recipes ----------------
  function explosion(R,at,r,c,c2,o={}){const big=!!o.big,n=big?7:4,life=big?1.5:1.0;
    hx(R,KIND.flash,{x:at.x,y:at.y,h:40,r:r*.7,r1:r*1.1,life:.28,c,c2,gain:1.2});
    hx(R,KIND.fire,{x:at.x,y:at.y,h:r*.3,r:r*.32,r1:r*.95,life,c,c2,vy:big?60:30,drag:2,rise:big?40:20});
    for(let k=0;k<n;k++){const an=k/n*TAU+rr(-.3,.3),sp=rr(.9,1.6)*r*1.6;
      hx(R,KIND.fire,{x:at.x+Math.cos(an)*r*.18,y:at.y+Math.sin(an)*r*.18,h:r*rr(.15,.35),r:r*rr(.16,.24),r1:r*rr(.42,.6),life:life*rr(.75,1),c,c2,vx:Math.cos(an)*sp,vz:Math.sin(an)*sp,vy:rr(40,140),drag:3.2,delay:rr(0,.06)})}
    // smoke column that keeps rising after the fire is gone
    for(let k=0;k<(big?5:3);k++)hx(R,KIND.smoke,{x:at.x+rr(-.25,.25)*r,y:at.y+rr(-.25,.25)*r,h:r*rr(.3,.6),r:r*.3,r1:r*rr(.75,1.05),life:rr(1.8,2.6)*(big?1.2:1),c:'#3a3532',vy:rr(55,95),drag:.8,delay:.18+k*.08,gain:.9});
    if(R.flash)R.flash(at.x,R.gY(at.x,at.y)+90,at.y,c,big?4200:2600,r*2.4,big?.5:.32);
    const api=R.pfxApi;if(api){try{api.embers(api.G(at.x,at.y,30),R._hx.q.high?(big?22:12):6,c,c2,r*.5);api.scorch(at.x,at.y,r*.7,big?7:4)}catch(e){}}}
  function dustRing(R,at,r,c,n,o={}){for(let k=0;k<n;k++){const an=k/n*TAU+rr(-.2,.2),sp=rr(.8,1.25)*r*1.5;
    hx(R,KIND.dust,{x:at.x+Math.cos(an)*r*.25,y:at.y+Math.sin(an)*r*.25,h:18,r:r*.14,r1:r*rr(.3,.42),life:rr(1.1,1.6)*(o.life||1),c:c||'#9c8f7e',vx:Math.cos(an)*sp,vz:Math.sin(an)*sp,vy:rr(15,45),drag:2.6,gain:o.gain||.8,delay:o.delay||0})}}
  function frostBurst(R,at,r,c,c2,n){for(let k=0;k<n;k++){const an=k/n*TAU+rr(-.25,.25),sp=rr(.6,1.1)*r*1.2;
    hx(R,KIND.mist,{x:at.x+Math.cos(an)*r*.2,y:at.y+Math.sin(an)*r*.2,h:rr(15,45),r:r*.16,r1:r*rr(.38,.55),life:rr(1.2,1.8),c,c2,vx:Math.cos(an)*sp,vz:Math.sin(an)*sp,vy:rr(5,25),drag:2.2,gain:1})}
    hx(R,KIND.flash,{x:at.x,y:at.y,h:30,r:r*.5,r1:r*.8,life:.26,c,c2:'#ffffff',gain:.9})}
  const FIREC=['#ff6a1f','#ffd78a'],STORMC='#b49cff',FROSTC=['#7fd8ff','#f0fdff'];
  const isFire=(S,style)=>S&&S.el?S.el==='fire':['fireball','fireburst','meteor','explosive'].includes(style);
  function onPulse(R,style,at,o,S){const a=ensure(R);if(!a||!at||!listenerNear(at.x,at.y,(S&&S.r)||200))return;const r=Math.max(40,fin(S&&S.r,90)),c=S&&S.c,c2=S&&S.c2;
    const fireCol=S&&S.el==='fire'?[c||FIREC[0],c2||FIREC[1]]:FIREC;
    if(o&&o.phase==='windup'){
      if(style==='meteor'||style==='elementslam'){const d=Math.max(.25,fin(o.delay,.6));a.seqs.push({k:'meteor',x:at.x,y:at.y,t:0,d,r,c:fireCol[0],c2:fireCol[1],trail:0})}
      return}
    switch(style){
      case'fireball':case'explosive':
        // the choreography also pulses the style at the caster when the projectile is launched: a muzzle burst there, the explosion on impact
        if(at.hp!==undefined){hx(R,KIND.flash,{x:at.x,y:at.y,h:45,r:40,r1:70,life:.2,c:fireCol[0],c2:fireCol[1],gain:.8});hx(R,KIND.flame,{x:at.x,y:at.y,h:45,r:22,r1:40,life:.25,c:fireCol[0],c2:fireCol[1]});break}
        explosion(R,at,Math.max(r,90),fireCol[0],fireCol[1]);break;
      case'fireburst':explosion(R,at,r*.85,fireCol[0],fireCol[1]);
        for(let k=0;k<10;k++){const an=k/10*TAU;hx(R,KIND.fire,{x:at.x+Math.cos(an)*r*.35,y:at.y+Math.sin(an)*r*.35,h:25,r:r*.12,r1:r*.32,life:.75,c:fireCol[0],c2:fireCol[1],vx:Math.cos(an)*r*2.2,vz:Math.sin(an)*r*2.2,vy:30,drag:3.5,delay:.03})}break;
      case'meteor':if(at.dot||at.kind==='burn')break;   // the burning ground left behind pulses this style too: no second blast
        explosion(R,at,r*1.05,fireCol[0],fireCol[1],{big:true});dustRing(R,at,r,'#8c7f70',12,{delay:.05});break;
      case'elementslam':if(isFire(S,style))explosion(R,at,r*.9,fireCol[0],fireCol[1],{big:true});dustRing(R,at,r,'#9a8e7f',10);break;
      case'judgment':dustRing(R,at,r,'#a39784',12);hx(R,KIND.flash,{x:at.x,y:at.y,h:60,r:r*.6,r1:r,life:.3,c:c||'#ffe27a',c2:'#ffffff',gain:1});break;
      case'fissure':{const len=fin(o&&o.len,r),an=fin(S&&S.a,0);for(let k=0;k<7;k++){const d=(k+.5)/7*len;dustRing(R,{x:at.x+Math.cos(an)*d,y:at.y+Math.sin(an)*d},70,'#8e8273',3,{delay:k*.035,gain:.7})}break}
      case'warcry':dustRing(R,at,r*.8,'#9b8f80',10,{gain:.6});break;
      case'cyclone':dustRing(R,at,r*.7,'#9b8f80',8,{gain:.55,life:.8});break;
      case'thunder':case'elementstorm':hx(R,KIND.flash,{x:at.x,y:at.y,h:120,r:r*.5,r1:r*.9,life:.3,c:c||STORMC,c2:'#ffffff',gain:.8});break;
      case'iceburst':frostBurst(R,at,r,FROSTC[0],FROSTC[1],a.q.high?9:5);break;
      case'blizzard':frostBurst(R,at,r,FROSTC[0],FROSTC[1],a.q.high?7:4);a.seqs.push({k:'blizz',x:at.x,y:at.y,t:0,d:2.2,r,acc:0});break;
      case'icelance':hx(R,KIND.mist,{x:at.x,y:at.y,h:35,r:40,r1:110,life:1,c:FROSTC[0],c2:FROSTC[1],gain:.8});break;
    }}
  // sustained areas tick through the same dispatch (sustain=true in the choreography); a light touch for them
  function onSustain(R,a,el,at,r){if(el==='fire'){for(let k=0;k<2;k++){const an=rr(0,TAU),d=Math.sqrt(rnd())*r*.8;hx(R,KIND.flame,{x:at.x+Math.cos(an)*d,y:at.y+Math.sin(an)*d,h:rr(10,30),r:rr(14,24),r1:rr(26,44),life:rr(.45,.7),c:FIREC[0],c2:FIREC[1],vy:rr(60,120),drag:1})}
      if(rnd()<.5)hx(R,KIND.smoke,{x:at.x+rr(-.5,.5)*r,y:at.y+rr(-.5,.5)*r,h:40,r:24,r1:70,life:1.4,c:'#3c3734',vy:70,drag:.8,gain:.6})}
    else if(el==='frost'){if(rnd()<.6)hx(R,KIND.mist,{x:at.x+rr(-.6,.6)*r,y:at.y+rr(-.6,.6)*r,h:20,r:r*.15,r1:r*.32,life:1.3,c:FROSTC[0],c2:FROSTC[1],vx:rr(-40,40),vz:rr(-40,40),gain:.8})}}
  // ---------------- per frame ----------------
  const seenProj=new WeakMap();
  function step(R,dt){const a=ensure(R);if(!a)return;dt=Math.max(0,Math.min(.1,fin(dt,0)));a.time+=dt;a.emitted=0;a.lm.uniforms.uTime.value=a.time;
    const gain=(R.post?1.1:.95)*(a.q.reduced?.8:1);a.m.uniforms.hGain.value=gain;a.lm.uniforms.hGain.value=gain;
    if(a.lmesh.visible&&a.time>a.boltUntil+.05)a.lmesh.visible=false;
    // sequences: falling meteors, blizzard swirl
    for(const s of a.seqs){s.t+=dt;
      if(s.k==='meteor'){const k=Math.min(1,s.t/s.d),H=900*(1-k*k),ox=-260*(1-k*k);const x=s.x+ox,y=s.y,gy=R.gY(x,y);s.trail-=dt;
        hx(R,KIND.flame,{x,y,h:H+20,r:s.r*.2,r1:s.r*.24,life:.12,c:s.c,c2:s.c2,gain:1});
        if(s.trail<=0){s.trail=a.q.high?.035:.07;hx(R,KIND.smoke,{x,y,h:H+40,r:s.r*.12,r1:s.r*.4,life:1.2,c:'#2f2b29',vy:15,drag:1,gain:.75});hx(R,KIND.fire,{x,y,h:H+30,r:s.r*.1,r1:s.r*.22,life:.35,c:s.c,c2:s.c2,vy:30,drag:2})}}
      else if(s.k==='blizz'){s.acc-=dt;if(s.acc<=0){s.acc=a.q.high?.12:.25;const an=s.t*2.4+rr(0,TAU),d=s.r*rr(.2,.85);
        hx(R,KIND.mist,{x:s.x+Math.cos(an)*d,y:s.y+Math.sin(an)*d,h:rr(20,70),r:s.r*.12,r1:s.r*.3,life:1.1,c:FROSTC[0],c2:FROSTC[1],vx:-Math.sin(an)*s.r*1.1,vz:Math.cos(an)*s.r*1.1,drag:1.2,gain:.85})}}}
    a.seqs=a.seqs.filter(s=>s.t<s.d);
    // fire projectiles: burning core + smoke in flight
    if(typeof projs!=='undefined')for(const p of projs){const el=p.el||(p.kind===1||p.kind===2||p.kind===8||p.kind===14?'fire':null);if(el!=='fire'||!listenerNear(p.x,p.y,80))continue;
      let st=seenProj.get(p);if(!st){st={t:0};seenProj.set(p,st)}st.t-=dt;const big=p.kind===2||p.kind===14,r=big?34:20;
      hx(R,KIND.flame,{x:p.x,y:p.y,h:42,r,r1:r*1.05,life:.1,c:FIREC[0],c2:FIREC[1],gain:1});
      if(st.t<=0){st.t=a.q.high?.045:.09;hx(R,KIND.smoke,{x:p.x,y:p.y,h:46,r:r*.5,r1:r*1.8,life:.9,c:'#383331',vy:40,drag:1,gain:.55});hx(R,KIND.fire,{x:p.x,y:p.y,h:42,r:r*.45,r1:r*.9,life:.3,c:FIREC[0],c2:FIREC[1],drag:2})}}
    // billboards: simulate, then write back-to-front so smoke layers correctly
    const cam=R.cam,ord=a.order;ord.length=0;
    for(const s of a.slots){if(!s.on)continue;s.t+=dt;if(s.t<s.delay)continue;const tt=s.t-s.delay;if(tt>=s.life){s.on=false;continue}
      const e=Math.exp(-s.drag*dt);s.vx*=e;s.vz*=e;s.vy=s.vy*e+s.rise*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;
      s.age=tt/s.life;s.dist=cam?(cam.position.x-s.x)**2+(cam.position.y-s.y)**2+(cam.position.z-s.z)**2:0;ord.push(s)}
    ord.sort((p,q)=>q.dist-p.dist);const d=a.d;let n=0;
    for(const s of ord){const k=s.kind===KIND.flash?s.age:1-Math.pow(1-s.age,2.2),rad=s.r+(s.r1-s.r)*k;
      d.position.set(s.x,s.y,s.z);d.rotation.set(0,0,0);d.scale.setScalar(Math.max(.01,rad));d.updateMatrix();a.mesh.setMatrixAt(n,d.matrix);
      a.hL.setXYZW(n,s.age,s.seed,s.kind,s.gain);a.hC.setXYZ(n,s.cr,s.cg,s.cb);a.hC2.setXYZ(n,s.c2r,s.c2g,s.c2b);n++}
    a.mesh.count=n;a.mesh.visible=n>0;if(n){a.mesh.instanceMatrix.needsUpdate=true;a.hL.needsUpdate=true;a.hC.needsUpdate=true;a.hC2.needsUpdate=true}}
  function reset(R){const a=R._hx;if(!a)return;for(const s of a.slots)s.on=false;a.seqs=[];a.mesh.count=0;a.mesh.visible=false;a.lmesh.visible=false;a.boltUntil=0;
    a.aInfo.array.fill(0);for(let v=0;v<a.aInfo.count;v++){a.aInfo.array[v*4+2]=-1e9;a.aInfo.array[v*4+3]=.001}a.aInfo.needsUpdate=true}
  // ---------------- hooks ----------------
  // every entry point the choreography calls is fenced: a visual must never break the frame
  const safe=(R,f)=>{try{return f()}catch(e){if(!R._hxErr3){R._hxErr3=1;console.warn('hero vfx',e)}}};
  Object.assign(P,{hxEmit(kind,o){return safe(this,()=>hx(this,KIND[kind]!==undefined?KIND[kind]:kind,o))},hxBolt(x,y,o){return safe(this,()=>bolt(this,x,y,o))},hxChain(p,q,c,delay){return safe(this,()=>chainBolt(this,p,q,c,delay))},
    hxSnapshot(){const a=this._hx;return a?{billboards:a.slots.filter(s=>s.on).length,cap:a.cap,bolts:a.bolts,stats:Object.assign({},a.stats)}:null}});
  const _pulse=P.v3Pulse;P.v3Pulse=function(style,at,o,S){const r0=_pulse?_pulse.apply(this,arguments):undefined;try{onPulse(this,style,at,o||{},S||{})}catch(e){if(!this._hxErr){this._hxErr=1;console.warn('hero vfx',e)}}return r0};
  P.hxSustain=function(el,at,r){try{if(ensure(this))onSustain(this,this._hx,el,at,r)}catch(e){}};
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r0=_fx.call(this,Tm,dt,me,L);try{step(this,dt)}catch(e){if(!this._hxErr2){this._hxErr2=1;console.warn('hero vfx step',e)}}return r0};
  const _ini=P.initFX;if(_ini)P.initFX=function(){const r0=_ini.apply(this,arguments);try{if(this._hx)reset(this)}catch(e){}return r0};
  const _ds=P.disposeScene;P.disposeScene=function(){dispose(this);return _ds.apply(this,arguments)};
})();
