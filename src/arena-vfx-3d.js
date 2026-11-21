/* Arena Royale · 3D skill VFX (Claude, 2026-11-18). Volumetric layer on top of the arena VFX choreography:
 * tornado funnels, 3D shock tori, tilted crescent slashes, energy orbs, sky beams, erupting crystal spikes,
 * glowing ground cracks, impact flares and lit rock debris — plus the renderer's flash lights and camera shake.
 * Render only: it reads the skill style the choreography already resolved (R3.v3Pulse) and the live projectiles,
 * never touches gameplay state, and keeps its own random stream so the simulation's stays untouched. */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof R3.avEmit!=='function')return;
  const P=R3,PI=Math.PI,TAU=PI*2;
  const TYPES=['vortex','shock','blade','orb','beam','spike','crack','flare'];
  const HIGH=[18,44,44,72,26,110,14,44],LOW=[8,18,18,30,10,44,6,18],DEB_HI=140,DEB_LO=48;
  let seed=0x5bd1e995;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};
  const between=(a,b)=>a+(b-a)*rnd(),fin=(v,d)=>Number.isFinite(v)?v:d,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const EL={fire:['#ff6a1f','#ffd98a'],frost:['#7fd8ff','#f0fdff'],storm:['#b08cff','#f4ecff']};
  const VERT=`
    attribute vec4 v3Life;attribute vec3 v3Color;attribute vec3 v3Color2;
    varying vec2 vUv;varying vec4 vLife;varying vec3 vColor;varying vec3 vColor2;varying vec3 vNormal;varying vec3 vEye;varying vec2 vWorld;varying vec3 vPos;
    void main(){vUv=uv;vLife=v3Life;vColor=v3Color;vColor2=v3Color2;vPos=position;
      vec4 p=instanceMatrix*vec4(position,1.0);vWorld=(modelMatrix*p).xz;vec4 mv=modelViewMatrix*p;vEye=normalize(-mv.xyz);
      vNormal=normalize(normalMatrix*mat3(instanceMatrix)*normal);gl_Position=projectionMatrix*mv;}`;
  const VXN=window.VFXN_GLSL||`uniform sampler2D vxN;uniform float vxT;float vxF(vec2 u){return .5;}float vxC(vec2 u){return 1.0;}float vxR(vec2 u){return .5;}float vxA(vec2 u){return .5;}
    float vxFlow(vec2 u,vec2 v){return .5;}float vxBurn(float n,float th,float w){return smoothstep(th-w,th+w,n);}float vxRim(float n,float th,float w){return 0.0;}vec3 vxHot(vec3 c){return c;}`;
  // 2026-11-19 (VFX round 1): textured with the shared noise: funnels churn, shock tori boil and burn off, crescents streak and
  // fray behind the leading edge, orbs swirl, beams surge, spikes show facets, ground cracks are a real crack network glowing
  // like lava, flares flicker. Same deep-edge -> colour -> white-hot ramp as the arena layer.
  const FRAG=`
    precision highp float;
    uniform float v3Type;uniform float v3Gain;uniform vec2 v3Focus;uniform float v3Vision;
    ${VXN}
    varying vec2 vUv;varying vec4 vLife;varying vec3 vColor;varying vec3 vColor2;varying vec3 vNormal;varying vec3 vEye;varying vec2 vWorld;varying vec3 vPos;
    const float PI=3.14159265359;const float TAU=6.28318530718;
    float band(float x,float w){return 1.0-smoothstep(w,w*1.9,abs(x));}
    void main(){
      float age=vLife.x,seed=vLife.y,k1=vLife.z,k2=vLife.w,sd=fract(seed*.1591)*7.0;
      float env=smoothstep(0.0,.07,age)*pow(max(0.0,1.0-age),.9);
      float fres=1.0-abs(dot(normalize(vNormal),normalize(vEye)));
      float mask=0.0,core=0.0;vec2 p=vUv*2.0-1.0;float r=length(p),an=atan(p.y,p.x);
      if(v3Type<.5){                       // vortex: twisting funnel bands churned by noise
        float h=vUv.y,sw=vUv.x*TAU*3.0+h*(7.0+k1*4.0)-age*16.0*k2+seed;
        float b1=pow(.5+.5*sin(sw),5.0),b2=pow(.5+.5*sin(vUv.x*TAU*7.0-h*5.0-age*22.0*k2+seed*2.0),14.0);
        float n=vxFlow(vec2(vUv.x*3.0+h*1.4+sd,h*1.2),vec2(-.7*k2,-1.3));
        float fh=smoothstep(0.0,.1,h)*(1.0-smoothstep(.62,1.0,h));
        mask=(b1*.6+b2*.45+n*n*.55)*fh*(.35+.75*pow(fres,1.4))*(.55+.8*n);core=(b1*.45+n*n*.35)*fh;
        float th=smoothstep(.45,1.0,age)*.85;core+=vxRim(n,th,.05)*fh;mask*=vxBurn(n,th,.07);
      }else if(v3Type<1.5){                // shock torus: boiling surface that burns off
        env=smoothstep(0.0,.05,age)*pow(max(0.0,1.0-age),1.5);
        float n=vxFlow(vUv*vec2(6.0,2.0)+sd,vec2(.35,0.0));
        mask=(.22+pow(fres,1.6)*.85)*(.5+.9*n);core=pow(1.0-fres,3.0)*(.5+.7*n);
        float th=smoothstep(.25,1.0,age)*.8;core+=vxRim(n,th,.05);mask*=vxBurn(n,th,.07);
      }else if(v3Type<2.5){                // crescent slash: streaked, sweeping from tail to head, fraying behind the head
        float span=max(k2,.2),t=an/span+.5;float front=smoothstep(0.0,.32,age)*1.25;
        float on=step(0.0,t)*step(t,1.0)*(1.0-smoothstep(front-.02,front+.08,t));
        float trail=clamp(1.0-(front-t)*1.6,0.0,1.0);float th=k1*pow(max(0.0,sin(PI*clamp(t,0.0,1.0))),.7);
        float st=vxF(vec2(t*.8-age*2.0+sd,r*8.0)),n=vxFlow(vec2(t*1.6+sd,r*3.0),vec2(-.8,0.0));
        float rr=r+(n-.5)*.04;
        mask=(band(rr-.82,th*(.75+st*.8))*.95+band(rr-.74,th*.5)*.35*n)*on*(.25+.75*trail)*(.5+.9*st);
        core=band(rr-.83,th*.35)*on*trail*(.5+st);
        float er=clamp((front-t)*1.1-.15,0.0,1.0)+smoothstep(.55,1.0,age)*.6;core+=vxRim(n,er,.05)*mask*1.2;mask*=vxBurn(n,er,.08);
        env=smoothstep(0.0,.04,age)*pow(max(0.0,1.0-age),1.1);
      }else if(v3Type<3.5){                // energy orb: swirling plasma
        vec3 q=normalize(vPos);
        float n=vxF(q.xy*.55+vec2(sd,vxT*.45))*.5+vxA(q.yz*.55-vec2(vxT*.38,sd))*.5;
        float vein=vxR(q.xz*.7+vec2(vxT*.2,sd));
        mask=.16+pow(fres,2.0)*.9+(n-.5)*.55+vein*.2;core=pow(1.0-fres,2.0)*(.65+.7*n)+vein*.15;
        env=smoothstep(0.0,.1,age)*pow(max(0.0,1.0-age),k1>0.5?.4:.9);
      }else if(v3Type<4.5){                // sky beam: surging energy
        float h=vUv.y,ctr=pow(1.0-fres,2.5);
        float n=vxFlow(vec2(vUv.x*2.0+sd,h*3.0),vec2(0.0,-4.0)),rid=vxR(vec2(vUv.x*3.0+sd,h*2.0-vxT*3.0));
        float fh=smoothstep(0.0,.04,h)*(1.0-smoothstep(.45,1.0,h));
        mask=(ctr*(.45+.85*n)*1.15+.06*n+rid*.25*ctr)*fh;core=ctr*fh*(.55+.6*n);env=smoothstep(0.0,.06,age)*pow(max(0.0,1.0-age),1.3);
      }else if(v3Type<5.5){                // crystal spike: facets, cracks, glint at the tip
        float crk=1.0-smoothstep(.03,.12,vxC(vUv*vec2(2.0,1.0)+sd));
        mask=.26+pow(fres,1.3)*.7+crk*.3;core=pow(fres,3.0)*.5+(1.0-vUv.y)*.25+crk*.2;
        env=smoothstep(0.0,.05,age)*(1.0-smoothstep(.8,1.0,age));
      }else if(v3Type<6.5){                // ground cracks: a crack network glowing like lava, revealed outward
        float cw=1.0-smoothstep(.0,.075,vxC(p*1.25+sd));
        float rays=pow(abs(cos(an*k1+seed+(vxF(vec2(r*1.6,an*.35+sd))-.5)*1.1)),90.0);   // jagged fissures, not wavy roots
        float n=vxF(p*.8+vec2(sd,vxT*.15));
        float reveal=1.0-smoothstep(age*3.2-.05,age*3.2+.05,r+(n-.5)*.15);
        float fall=1.0-smoothstep(.2,1.0,r);
        mask=(cw*fall*(.55+.7*n)+rays*fall*.3+band(r-.14,.05)*.4+exp(-r*r*30.0)*.4)*reveal;core=(cw*fall*.8+rays*.4)*(.6+.5*n);
        env=smoothstep(0.0,.05,age)*pow(max(0.0,1.0-age),.7);
      }else{                               // impact flare (camera facing), flickering rays
        float fk=.6+.8*vxF(vec2(an/TAU*4.0+sd,vxT*2.0));
        float rays=(pow(abs(cos(an*2.0+seed)),40.0)*exp(-r*2.2)+pow(abs(cos(an*2.0+seed+PI*.25)),60.0)*exp(-r*3.5)*.55)*fk;
        mask=exp(-r*r*9.0)*.85+rays;core=exp(-r*r*36.0);env=pow(max(0.0,1.0-age),1.6)*smoothstep(0.0,.03,age);
      }
      float vis=1.0-smoothstep(v3Vision-100.0,v3Vision+20.0,distance(vWorld,v3Focus));
      float op=env*clamp(mask,0.0,1.6)*vis;op*=.22+.78*smoothstep(.02,.38,op);if(op<.003)discard;
      float heat=clamp(core,0.0,1.0);
      vec3 deep=vColor*vColor/max(max(vColor.r,max(vColor.g,vColor.b)),1e-3);
      vec3 col=mix(deep*.85,vColor,smoothstep(0.0,.45,mask));
      col=mix(col,vColor2,smoothstep(.12,.65,heat));col=mix(col,vxHot(vColor2),smoothstep(.65,1.0,heat));
      gl_FragColor=vec4(col*v3Gain*(1.0+heat*1.3),op);
      #include <colorspace_fragment>
    }`;
  function mode(R){const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;const high=!!R.hi&&!R.mobile;return{high,reduced,key:(high?'h':'l')+(reduced?'r':'')}}
  function geo(type,hi){
    if(type==='vortex')return new THREE.CylinderGeometry(1,.28,1,hi?40:22,hi?10:5,true).translate(0,.5,0);
    if(type==='shock')return new THREE.TorusGeometry(1,.05,hi?10:6,hi?72:40).rotateX(PI/2);
    if(type==='orb')return new THREE.IcosahedronGeometry(1,hi?3:2);
    if(type==='beam')return new THREE.CylinderGeometry(1,1,1,hi?26:14,1,true).translate(0,.5,0);
    if(type==='spike')return new THREE.ConeGeometry(1,1,hi?7:5,1,false).translate(0,.5,0);
    const g=new THREE.PlaneGeometry(2,2);if(type==='crack')g.rotateX(-PI/2);return g}
  function allocate(R){
    if(!R.scene||!R.ok)return null;const q=mode(R),caps=q.high?HIGH:LOW;
    const st={scene:R.scene,q,b:{},emitted:0,budget:q.reduced?60:q.high?220:110,d:new THREE.Object3D(),c:new THREE.Color(),c2:new THREE.Color(),
      qa:new THREE.Quaternion(),qb:new THREE.Quaternion(),qc:new THREE.Quaternion(),X:new THREE.Vector3(1,0,0),Y:new THREE.Vector3(0,1,0),Z:new THREE.Vector3(0,0,1),stats:{acc:0,drop:0}};
    TYPES.forEach((type,i)=>{const cap=Math.max(4,Math.floor(caps[i]*(q.reduced?.5:1))),g=geo(type,q.high);
      const life=new THREE.InstancedBufferAttribute(new Float32Array(cap*4),4),col=new THREE.InstancedBufferAttribute(new Float32Array(cap*3),3),col2=new THREE.InstancedBufferAttribute(new Float32Array(cap*3),3);
      for(const a of[life,col,col2])a.setUsage(THREE.DynamicDrawUsage);g.setAttribute('v3Life',life);g.setAttribute('v3Color',col);g.setAttribute('v3Color2',col2);
      const m=new THREE.ShaderMaterial({uniforms:Object.assign({v3Type:{value:i},v3Gain:{value:1},v3Focus:R.U.fowC,v3Vision:R.U.fowR},window.ArenaVFXTex?ArenaVFXTex.uniforms():{vxN:{value:null},vxT:{value:0}}),vertexShader:VERT,fragmentShader:FRAG,
        transparent:true,depthTest:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});
      const mesh=new THREE.InstancedMesh(g,m,cap);mesh.name='arena-vfx3d-'+type;mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.renderOrder=9;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.userData.arenaVFX=true;R.scene.add(mesh);
      st.b[type]={mesh,g,m,life,col,col2,cap,slots:Array.from({length:cap},()=>({on:false})),cur:0,n:0}});
    // lit rock / ice debris: real shaded chunks that bounce on the terrain
    const dc=Math.floor((q.high?DEB_HI:DEB_LO)*(q.reduced?.4:1)),dg=new THREE.DodecahedronGeometry(1,0);
    let dm=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.82,metalness:.06,emissive:'#000000'});
    try{if(R.fow)dm=R.fow(dm,{key:'v3deb'})||dm}catch(e){}
    const dmesh=new THREE.InstancedMesh(dg,dm,dc);dmesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(dc*3),3);dmesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    dmesh.name='arena-vfx3d-debris';dmesh.count=0;dmesh.visible=false;dmesh.frustumCulled=false;dmesh.castShadow=!!q.high;dmesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);dmesh.userData.arenaVFX=true;R.scene.add(dmesh);
    st.deb={mesh:dmesh,g:dg,m:dm,cap:dc,slots:Array.from({length:dc},()=>({on:false})),cur:0,n:0};
    return st}
  function create(R){const prev=Math.random;try{Math.random=rnd;return allocate(R)}finally{Math.random=prev}}
  function ensure(R){const q=mode(R),o=R._v3;if(o&&(o.scene!==R.scene||o.q.key!==q.key))R.v3Dispose();if(!R._v3)R._v3=create(R);return R._v3}
  const near=(x,y,m)=>{const L=typeof listener==='function'?listener():null;return !L||Math.hypot(x-L.x,y-L.y)<(typeof visionR==='function'?visionR():1100)+(m||180)};
  Object.assign(P,{
    v3(type,o){const a=this._v3;if(!a||a.scene!==this.scene||!o||!Number.isFinite(o.x)||!Number.isFinite(o.y))return false;const b=a.b[type];if(!b)return false;
      if(!near(o.x,o.y,Math.min(600,fin(o.r1,fin(o.r,80)))+160))return false;if(a.emitted>=a.budget){a.stats.drop++;return false}
      let s=null;for(let j=0;j<b.cap;j++){const i=(b.cur+j)%b.cap;if(!b.slots[i].on){s=b.slots[i];b.cur=(i+1)%b.cap;break}}if(!s){a.stats.drop++;return false}
      a.c.set(o.c||'#bfe8ff');a.c2.set(o.c2||'#ffffff');const f=o.follow&&!o.follow.dead?o.follow:null;
      Object.assign(s,{on:true,t:0,delay:Math.max(0,fin(o.delay,0)),life:clamp(fin(o.life,.6),.05,6),x:o.x,y:o.y,height:fin(o.height,4),r:clamp(fin(o.r,60),.5,1600),r1:clamp(fin(o.r1,fin(o.r,60)),.5,2600),
        h:clamp(fin(o.h,100),1,3000),angle:fin(o.angle,0),tilt:fin(o.tilt,0),spin:a.q.reduced?0:fin(o.spin,0),vx:fin(o.vx,0),vy:fin(o.vy,0),vz:fin(o.vz,0),grav:fin(o.gravity,0),
        k1:fin(o.k1,type==='blade'?.05:type==='crack'?7:type==='vortex'?1:0),k2:fin(o.k2,type==='blade'?2.2:type==='vortex'?1:0),seed:fin(o.seed,rnd()*TAU),
        op:clamp(fin(o.a,1),0,1.5),follow:f,ox:f?o.x-f.x:0,oy:f?o.y-f.y:0,ease:o.ease||0,
        cr:a.c.r,cg:a.c.g,cb:a.c.b,c2r:a.c2.r,c2g:a.c2.g,c2b:a.c2.b});
      a.emitted++;a.stats.acc++;return true},
    v3Debris(o){const a=this._v3;if(!a||!o||!Number.isFinite(o.x))return 0;const D=a.deb;let made=0;const n=Math.round(fin(o.n,8)),gy=this.gY(o.x,o.y);
      for(let k=0;k<n;k++){let s=null;for(let j=0;j<D.cap;j++){const i=(D.cur+j)%D.cap;if(!D.slots[i].on){s=D.slots[i];D.cur=(i+1)%D.cap;break}}if(!s)break;
        const an=rnd()*TAU,sp=between(.45,1)*fin(o.speed,320),d=fin(o.r,40)*Math.sqrt(rnd());a.c.set(o.c||'#5a5048');const tint=between(.75,1.15);
        Object.assign(s,{on:true,t:0,life:between(1.1,1.8)*fin(o.life,1),x:o.x+Math.cos(an)*d,z:o.y+Math.sin(an)*d,y:gy+fin(o.height,10),vx:Math.cos(an)*sp,vz:Math.sin(an)*sp,vy:between(.6,1.2)*fin(o.up,420),
          s:between(.55,1.25)*fin(o.size,9),rx:rnd()*TAU,ry:rnd()*TAU,wx:between(-9,9),wy:between(-9,9),b:0,cr:a.c.r*tint,cg:a.c.g*tint,cb:a.c.b*tint});made++}
      return made},
    v3Step(dt){if(!this._v3)return;const a=ensure(this);if(!a)return;dt=Math.max(0,fin(dt,0));const md=Math.min(dt,.1),d=a.d,cam=this.cam;
      const gain=(this.post?1.25:1.0)*(a.q.reduced?.8:1);   // round 1: was 1.75/1.15
      for(const type of TYPES){const b=a.b[type];let n=0;b.m.uniforms.v3Gain.value=gain;
        for(const s of b.slots){if(!s.on)continue;s.t+=dt;if(s.t<s.delay)continue;const tt=s.t-s.delay;if(tt>=s.life||s.follow&&s.follow.dead){s.on=false;s.follow=null;continue}
          const age=tt/s.life,grow=s.ease===1?1-Math.pow(1-Math.min(1,age*1.6),3):Math.sin(Math.min(1,age*2.2)*PI/2);
          if(s.follow){s.x=s.follow.x+s.ox;s.y=s.follow.y+s.oy}
          s.x+=s.vx*md;s.y+=s.vz*md;s.height+=s.vy*md;s.vy-=s.grav*md;
          const gy=this.gY(s.x,s.y),rad=s.r+(s.r1-s.r)*(a.q.reduced?age:grow),turn=s.angle+s.spin*tt;
          d.position.set(s.x,gy+s.height,s.y);d.rotation.set(0,0,0);d.quaternion.identity();d.scale.set(1,1,1);
          if(type==='vortex'){d.rotation.y=-turn;const rise=.55+.45*grow;d.scale.set(rad,s.h*rise,rad)}
          else if(type==='shock'){d.rotation.y=turn;d.scale.set(rad,Math.max(.6,s.h/100),rad)}
          else if(type==='blade'){a.qa.setFromAxisAngle(a.Y,-turn);a.qb.setFromAxisAngle(a.X,s.tilt);a.qc.setFromAxisAngle(a.X,-PI/2);d.quaternion.copy(a.qa).multiply(a.qb).multiply(a.qc);d.scale.setScalar(rad)}
          else if(type==='orb'){d.rotation.set(s.seed,turn,0);d.scale.setScalar(rad)}
          else if(type==='beam'){d.rotation.y=turn;d.scale.set(rad,s.h*(.4+.6*grow),rad)}
          else if(type==='spike'){const t1=Math.min(1,age/.2)-1,up=age>.8?1-(age-.8)/.2*.85:1+2.7*t1*t1*t1+1.7*t1*t1;   // erupt with a little overshoot, sink at the end
            a.qa.setFromAxisAngle(a.Y,-s.angle);a.qb.setFromAxisAngle(a.Z,-s.tilt);d.quaternion.copy(a.qa).multiply(a.qb);d.scale.set(s.r,s.h*Math.max(.02,up),s.r)}
          else if(type==='crack'){d.rotation.y=s.seed;d.scale.set(s.r1,1,s.r1)}
          else{d.quaternion.copy(cam.quaternion);d.scale.setScalar(rad)}
          d.updateMatrix();b.mesh.setMatrixAt(n,d.matrix);b.life.setXYZW(n,age,s.seed,s.k1,s.k2);
          b.col.setXYZ(n,s.cr*s.op,s.cg*s.op,s.cb*s.op);b.col2.setXYZ(n,s.c2r*s.op,s.c2g*s.op,s.c2b*s.op);n++}
        b.n=n;b.mesh.count=n;b.mesh.visible=n>0;if(n){b.mesh.instanceMatrix.needsUpdate=true;b.life.needsUpdate=true;b.col.needsUpdate=true;b.col2.needsUpdate=true}}
      const D=a.deb;let n=0;
      for(const s of D.slots){if(!s.on)continue;s.t+=dt;if(s.t>=s.life){s.on=false;continue}
        s.vy-=1150*md;s.x+=s.vx*md;s.z+=s.vz*md;s.y+=s.vy*md;s.rx+=s.wx*md;s.ry+=s.wy*md;const g=this.gY(s.x,s.z)+s.s*.6;
        if(s.y<g){s.y=g;if(s.b<2&&s.vy<-60){s.vy*=-.32;s.vx*=.55;s.vz*=.55;s.wx*=.5;s.wy*=.5;s.b++}else{s.vy=0;s.vx*=Math.pow(.02,md);s.vz*=Math.pow(.02,md);s.wx*=.9;s.wy*=.9}}
        const k=s.t/s.life,sc=s.s*(k>.7?1-(k-.7)/.3:1);d.position.set(s.x,s.y,s.z);d.rotation.set(s.rx,s.ry,0);d.quaternion.setFromEuler(d.rotation);d.scale.setScalar(Math.max(.01,sc));d.updateMatrix();
        D.mesh.setMatrixAt(n,d.matrix);D.mesh.instanceColor.setXYZ(n,s.cr,s.cg,s.cb);n++}
      D.n=n;D.mesh.count=n;D.mesh.visible=n>0;if(n){D.mesh.instanceMatrix.needsUpdate=true;D.mesh.instanceColor.needsUpdate=true}
      a.emitted=0},
    v3Reset(){const a=ensure(this);if(!a)return;for(const b of Object.values(a.b)){for(const s of b.slots){s.on=false;s.follow=null}b.n=0;b.mesh.count=0;b.mesh.visible=false}
      for(const s of a.deb.slots)s.on=false;a.deb.mesh.count=0;a.deb.mesh.visible=false;a.emitted=0;heroState=new WeakMap();clock=0;trailAt=0},
    v3Dispose(){const a=this._v3;if(!a)return;for(const b of Object.values(a.b)){a.scene.remove(b.mesh);b.g.dispose();b.m.dispose();for(const s of b.slots)s.follow=null}
      a.scene.remove(a.deb.mesh);a.deb.g.dispose();a.deb.m.dispose();this._v3=null}
  });
  // ---------------- recipes ----------------
  const hi=()=>!!(P._v3&&P._v3.q.high),red=()=>!!(P._v3&&P._v3.q.reduced),cnt=(h,l)=>red()?Math.max(2,Math.floor(l*.6)):hi()?h:l;
  const E=(t,at,o)=>P.v3(t,Object.assign({x:at.x,y:at.y},o));
  const flare=(at,s,c,c2,life=.32,h=40)=>E('flare',at,{r:s*.35,r1:s,c,c2,life,height:h,a:1});
  const shock=(at,r0,r1,c,c2,life=.55,h=10,thick=100,delay=0)=>E('shock',at,{r:r0,r1,c,c2,life,height:h,h:thick,delay,ease:1,a:.9});
  const beam=(at,r,h,c,c2,life=.7,delay=0,a=1)=>E('beam',at,{r:r*.55,r1:r,h,c,c2,life,delay,spin:3,a});
  const vortex=(at,r,h,c,c2,life=.9,spin=8,o={})=>E('vortex',at,Object.assign({r:r*.45,r1:r,h,c,c2,life,spin,height:2,k1:1,k2:spin>=0?1:-1,a:.85},o));
  const blade=(at,r,ang,tilt,c,c2,life=.42,h=40,o={})=>E('blade',at,Object.assign({r:r*.92,r1:r,angle:ang,tilt,c,c2,life,height:h,k1:.06,k2:2.3,a:1},o));
  const orb=(at,r0,r1,c,c2,life=.5,h=40,o={})=>E('orb',at,Object.assign({r:r0,r1,c,c2,life,height:h},o));
  const crack=(at,r,c,c2,life=1.4)=>E('crack',at,{r,r1:r,c,c2,life,height:3,k1:Math.floor(between(5,8)),a:.95});
  function spikes(at,r,n,c,c2,life=1,hMin=40,hMax=110,stagger=0,sz=1){for(let j=0;j<n;j++){const an=j/n*TAU+between(-.25,.25),d=r*between(.35,.95);
    E('spike',{x:at.x+Math.cos(an)*d,y:at.y+Math.sin(an)*d},{r:between(7,14)*sz,h:between(hMin,hMax),angle:an,tilt:between(.12,.5),c,c2,life:life*between(.85,1.15),delay:stagger*d/r,height:-4,a:.95})}}
  const light=(at,c,I,d,T,h=90)=>{if(hi()&&P.flash)P.flash(at.x,P.gY(at.x,at.y)+h,at.y,c,I,d,T)};
  const shake=(at,s)=>{if(!red()&&P.shakeNear)P.shakeNear(at.x,at.y,s)};
  const rock=(at,r,n,c,o={})=>P.v3Debris(Object.assign({x:at.x,y:at.y,r,n:cnt(n,Math.ceil(n*.45)),c},o));
  function impact(at,r,el,c,c2,big){const e=EL[el]||[c,c2],H=!!P.hxEmit;   // H: the signature layer (arena-vfx-hero.js) draws the fireball, flash, bolts and light
    if(el==='frost'){spikes(at,r*.85,cnt(big?14:9,6),e[0],e[1],1.25,big?60:40,big?150:100,.12);rock(at,r*.4,big?10:6,'#bfe6ff',{size:7,up:300});}
    else if(el==='storm'){const n=H?0:cnt(big?6:3,2);for(let j=0;j<n;j++){const an=rnd()*TAU,d=r*Math.sqrt(rnd())*.8,q={x:at.x+Math.cos(an)*d,y:at.y+Math.sin(an)*d};beam(q,between(9,15),620,e[0],e[1],.32,j*.06);flare(q,90,e[0],e[1],.25,30)}}
    else{if(!H)orb(at,r*.1,r*.42,e[0],e[1],.45,r*.2,{ease:1,a:.55});rock(at,r*.3,big?14:7,'#4a3a32',{up:big?520:380,speed:big?380:260});}
    shock(at,r*.15,r*1.02,e[0],e[1],.55,8,big?160:110);crack(at,r*.9,e[0],e[1],big?1.6:1.1);if(!H){flare(at,(big?220:150)*(el==='frost'?.8:1),e[0],e[1],.35,40);light(at,e[0],big?5200:3200,r*2.8,big?.5:.3)}if(big)shake(at,9)}
  // style recipes: same names as the arena choreography (arena-vfx-skills.js)
  P.v3Pulse=function(style,at,o,S){if(!this._v3)return;const r=Math.max(20,S.r||90),c=S.c,c2=S.c2,a=S.a||0,el=S.el,el2=S.el2;
    if(o.phase==='windup'){const dl=Math.max(.2,o.delay||.5);
      if(style==='meteor'||style==='elementslam'||style==='judgment'){beam(at,r*.16,900,c,c2,dl+.15,0,.35);
        if(style==='meteor'){const H=900,T=dl;orb(at,22,26,c,c2,T,H,{vy:-H/T,a:1.2,k1:1});for(let j=0;j<3;j++)orb(at,14-j*3,16-j*3,c2,c,T,H+40+j*45,{vy:-H/T,a:.6,k1:1})}
        else orb(at,8,r*.22,c,c2,dl,260,{a:.8})}
      else if(style==='thunder'||style==='stormfield'||style==='elementstorm')orb(at,10,r*.3,c,c2,dl,320,{a:.7,spin:4});
      return}
    switch(style){
      case'dash':case'spear':case'bladewave':case'icelance':{
        blade(at,r*.62,a,.55,c,c2,.4,42);blade(at,r*.5,a,-.5,c2,c,.36,50,{delay:.05});flare(at,90,c,c2,.25,40);
        if(style==='bladewave'){for(let j=0;j<3;j++)blade({x:at.x+Math.cos(a)*r*(.3+j*.25),y:at.y+Math.sin(a)*r*(.3+j*.25)},r*.4,a,j%2?.4:-.4,c,c2,.4,32,{delay:j*.06})}
        if(style==='icelance'){for(let j=0;j<cnt(6,3);j++){const d=r*(.2+j*.15),q={x:at.x+Math.cos(a)*d,y:at.y+Math.sin(a)*d};E('spike',q,{r:between(5,9),h:between(40,80),angle:a+(j%2?1.2:-1.2),tilt:.35,c,c2,life:.9,delay:j*.05,height:-3})}}
        if(style==='spear')beam(at,10,240,c,c2,.35,0,.6);break}
      case'ward':case'royal':{beam(at,48,320,c,c2,1.1,0,.55);shock(at,30,95,c,c2,.6,8,90);shock(at,30,80,c2,c,.7,60,70,.12);
        for(let j=0;j<cnt(6,4);j++){const an=j/6*TAU;orb({x:at.x+Math.cos(an)*70,y:at.y+Math.sin(an)*70},5,9,c,c2,1,70,{vy:40,follow:S.u||null})}flare(at,150,c,c2,.4,60);light(at,c,2400,420,.45);break}
      case'judgment':case'elementslam':case'meteor':{beam(at,r*.18,1100,c,c2,.55,0,.75);impact(at,r,style==='judgment'?'holy':el||'fire',c,c2,true);
        if(style==='judgment'){spikes(at,r*.8,cnt(10,6),c,c2,1.1,60,140,.1,1.2);for(let j=0;j<3;j++)blade(at,r*.8,a+j*TAU/3,.25,c,c2,.6,30+j*14,{spin:3})}
        if(el2)impact(at,r*.8,el2,c2,c,false);break}
      case'cyclone':case'spirit':{vortex(at,r*.7,r*1.3,c,c2,.95,9);vortex(at,r*.45,r*1.7,c2,c,.85,-12,{a:.6});shock(at,r*.2,r,c,c2,.5,10,80);rock(at,r*.6,6,'#6a5a4a',{up:520,speed:160,size:6});break}
      case'warcry':{for(let j=0;j<3;j++)shock(at,r*.08,r*(.55+j*.22),c,c2,.55+j*.1,10+j*30,120-j*25,j*.08);flare(at,200,c,c2,.4,60);light(at,c,2600,r*2,.35);shake(at,6);break}
      case'fissure':{const L=S.len||r,n=cnt(12,7);for(let j=0;j<n;j++){const d=(j+.5)/n*L,q={x:at.x+Math.cos(a)*d,y:at.y+Math.sin(a)*d};
          E('spike',{x:q.x+between(-14,14),y:q.y+between(-14,14)},{r:between(10,18),h:between(60,130),angle:a+(j%2?1.4:-1.4),tilt:between(.15,.45),c,c2,life:1.1,delay:j*.04,height:-6});
          if(j%3===0)rock(q,20,4,'#5a4a3c',{up:420,speed:140,size:8})}
        crack({x:at.x+Math.cos(a)*L*.5,y:at.y+Math.sin(a)*L*.5},L*.55,c,c2,1.2);shake(at,7);break}
      case'shadow':case'veil':{orb(at,90,18,c,c2,.45,40,{a:.8});vortex(at,60,140,c,c2,.6,-10,{a:.55});flare(at,120,c,c2,.3,50);break}
      case'lotus':{for(let j=0;j<cnt(5,3);j++)blade(at,r*(.55+j*.08),a+j*TAU/5,(j%2?.5:-.5),c,c2,.9,30+j*12,{spin:8+j,k2:2.8});vortex(at,r*.5,160,c,c2,.9,10,{a:.5});break}
      case'arrowfan':case'barrage':{flare(at,110,c,c2,.22,45);blade(at,85,a,0,c,c2,.3,44,{k2:1.4});break}
      case'snare':case'trap':{spikes(at,r*.95,cnt(10,6),c,c2,1.2,50,90,.05,.8);shock(at,r*.9,r,c,c2,.8,6,70);break}
      case'crescent':{for(let j=0;j<3;j++)blade(at,r*(.8+j*.1),a,(j-1)*.45,j?c:c2,j?c2:c,.5,24+j*20,{delay:j*.04,k1:.07});flare(at,150,c,c2,.28,40);light(at,c,2200,r*2,.25);break}
      case'arrowrain':{beam(at,r*.9,500,c,c2,.7,0,.18);for(let j=0;j<cnt(8,4);j++){const an=rnd()*TAU,d=r*Math.sqrt(rnd())*.85,q={x:at.x+Math.cos(an)*d,y:at.y+Math.sin(an)*d};flare(q,60,c,c2,.2,8);shock(q,4,26,c,c2,.3,4,40,.15+j*.05)}break}
      case'fireball':case'explosive':case'fireburst':impact(at,r,'fire',c,c2,style!=='fireball');break;
      case'iceburst':impact(at,r,'frost',c,c2,false);orb(at,r*.15,r*.7,c,c2,.5,20,{ease:1,a:.45});break;
      case'blizzard':impact(at,r,'frost',c,c2,true);vortex(at,r*.85,r*1.1,c,c2,1.4,5,{a:.5});break;
      case'chain':impact(at,r*.7,'storm',c,c2,false);break;
      case'stormfield':impact(at,r,'storm',c,c2,false);vortex(at,r*.8,260,c,c2,1.1,6,{a:.45});break;
      case'thunder':impact(at,r,'storm',c,c2,true);beam(at,r*.22,1300,c,c2,.45,0,1);break;
      case'duality':case'elementburst':case'elementstorm':case'elementfield':{impact(at,r,el||'fire',c,c2,style!=='elementfield');if(el2)impact(at,r*.8,el2,c2,c,false);vortex(at,r*.6,r*1.2,c,c2,1,7,{a:.55});break}
      case'dragon':{vortex(at,90,320,c,c2,.8,11);beam(at,40,700,c,c2,.6,0,.9);orb(at,20,80,c,c2,.6,60,{ease:1});flare(at,220,c,c2,.4,60);light(at,c,3200,600,.4);shake(at,6);break}
    }};
  // ---------------- per-frame: projectile heads, spinning heroes, lotus ----------------
  let heroState=new WeakMap(),clock=0,trailAt=0;
  const BIG={2:['fire',30],4:['frost',22],6:[null,24],11:[null,22],12:[null,24],14:['fire',46],15:[null,26]};
  function frame(T,dt){if(!P._v3)return;clock+=Math.min(.1,Math.max(0,dt));
    if(typeof projs!=='undefined'&&clock>=trailAt){trailAt=clock+(red()?.12:hi()?.045:.075);let n=0;
      for(const p of projs){const b=BIG[p.kind];if(!b||!near(p.x,p.y)||P.fireOwnP&&P.fireOwnP(p))continue;if(n++>=(hi()?16:8))break;const el=p.el||b[0],cc=el?EL[el]:['#c9f2ff','#ffffff'];
        orb(p,b[1]*.8,b[1],cc[0],cc[1],.12,42,{a:.9});if(hi()&&p.kind===14)flare(p,b[1]*3,cc[0],cc[1],.12,42)}}
    if(typeof units==='undefined')return;
    for(const u of units){if(!u.hero||u.dead||!near(u.x,u.y))continue;if(typeof unitVisibleTo==='function'&&typeof ME==='function'&&!unitVisibleTo(u,ME(),typeof listener==='function'?listener():null))continue;
      let s=heroState.get(u);if(!s){s={at:0};heroState.set(u,s)}if(clock<s.at)continue;
      if(u.spinT>0){s.at=clock+.32;const r=u.spinR||190,c=u.wk==='axe'?'#ff963f':u.wk==='gsword'?'#adc9ff':'#7ff0d8';vortex(u,r*.55,r*.9,c,'#fff0ce',.45,14,{follow:u,a:.55});blade(u,r*.85,clock*9,.3,c,'#fff6e0',.34,36,{follow:u,spin:16,k2:3.4})}
      else if(u.lotusT>0){s.at=clock+.3;const r=u.lotusR||300;blade(u,r*.7,clock*7,.6,'#dc75ff','#ffb0df',.4,40,{follow:u,spin:12,k2:3})}}}
  const _init=P.initFX,_extra=P.fxExtra,_disp=P.disposeScene,_rebind=P.rebind;
  P.initFX=function(){_init.call(this);this.v3Reset()};
  P.fxExtra=function(T,dt,me,L){const r=_extra.call(this,T,dt,me,L);try{ensure(this);frame(T,dt);this.v3Step(dt)}catch(e){if(!this._v3Err){this._v3Err=1;console.warn('vfx3d',e)}}return r};
  P.disposeScene=function(){this.v3Dispose();return _disp.call(this)};
  P.rebind=function(){const r=_rebind.call(this);this.v3Reset();return r};
  window.ArenaVFX3D={snapshot(){const a=P._v3;if(!a)return{enabled:false};const out={enabled:true,quality:a.q.high?'high':'low',accepted:a.stats.acc,dropped:a.stats.drop,debris:a.deb.n};for(const t of TYPES)out[t]=a.b[t].n;return out},
    preview(style,at,o){const L=at||listener();if(L)P.v3Pulse(style,L,o||{},Object.assign({r:180,c:'#ffb050',c2:'#fff0c0',a:0},o||{}))}};
})();
