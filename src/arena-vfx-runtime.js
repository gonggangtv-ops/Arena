/* Arena skill VFX: eight bounded GPU batches, no simulation or combat state.
 * Every emission reuses a preallocated slot; geometry/materials live per scene.
 * Coordinates are game x/y; height is measured above the local terrain. */
(()=>{
  'use strict';
  const TYPES=['ring','rune','pillar','dome','arc','shard','streak','ember'];
  const HIGH=[72,36,24,18,80,176,144,224],LOW=[30,14,10,8,32,72,56,88];
  const PI=Math.PI,TAU=PI*2;
  let randomState=0x7248a31d;
  const random=()=>{randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return(randomState>>>0)/4294967296;};
  const finite=(v,d)=>Number.isFinite(v)?v:d;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function visibleFollow(u,L){
    if(!u||u.dead)return false;
    const me=typeof ME==='function'?ME():null;
    if(typeof unitVisibleTo==='function'&&!unitVisibleTo(u,me,L))return false;
    if(u.invisT>0&&u!==me&&L&&Math.hypot(u.x-L.x,u.y-L.y)>170)return false;
    return true;
  }
  const VERT=`
    attribute vec4 avLife; attribute vec3 avColor; attribute vec3 avColor2;
    varying vec2 vUv; varying vec4 vLife; varying vec3 vColor; varying vec3 vColor2;
    varying vec3 vNormal; varying vec3 vEye; varying vec2 vWorld;
    void main(){
      vUv=uv;vLife=avLife;vColor=avColor;vColor2=avColor2;
      vec4 p=instanceMatrix*vec4(position,1.0);
      vWorld=(modelMatrix*p).xz;
      vec4 mv=modelViewMatrix*p;vEye=normalize(-mv.xyz);
      vNormal=normalize(normalMatrix*mat3(instanceMatrix)*normal);
      gl_Position=projectionMatrix*mv;
    }`;
  // Fallback when the texture library is missing: flat mid-grey noise keeps every shape working as before.
  const VXN=window.VFXN_GLSL||`uniform sampler2D vxN;uniform float vxT;float vxF(vec2 u){return .5;}float vxC(vec2 u){return 1.0;}float vxR(vec2 u){return .5;}float vxA(vec2 u){return .5;}
    float vxFlow(vec2 u,vec2 v){return .5;}float vxBurn(float n,float th,float w){return smoothstep(th-w,th+w,n);}float vxRim(float n,float th,float w){return 0.0;}vec3 vxHot(vec3 c){return c;}`;
  // 2026-11-19 (Claude, VFX round 1): every shape now samples the shared noise texture: rings wobble and boil, magic circles are
  // inscribed by a sweeping head and burn away, pillars lick upward like flame, shields show flowing hex cells, slashes streak and
  // fray into wisps, trails go wispy, glows flicker like fire. Colours run deep edge -> colour -> hot core with HDR cores for bloom.
  const FRAG=`
    precision highp float;
    uniform float avType; uniform float avGain;uniform vec2 avFocus;uniform float avVision;
    ${VXN}
    varying vec2 vUv; varying vec4 vLife; varying vec3 vColor; varying vec3 vColor2;
    varying vec3 vNormal; varying vec3 vEye; varying vec2 vWorld;
    const float PI=3.14159265359;const float TAU=6.28318530718;
    float band(float x,float width){return 1.0-smoothstep(width,width*1.85,abs(x));}
    void main(){
      vec2 p=vUv*2.0-1.0;float r=length(p),an=atan(p.y,p.x),au=an/TAU+.5;
      float age=vLife.x,seed=vLife.y,width=vLife.z,span=vLife.w,sd=fract(seed*.1591)*7.0;
      float envelope=smoothstep(0.0,.09,age)*pow(max(0.0,1.0-age),.85);
      float mask=0.0;float core=.0;
      if(avType<.5){                                   // shock ring: a boiling, wobbling front that burns away
        float n=vxFlow(vec2(au*3.0+sd,r*1.3-age*.8),vec2(0.0,-.3));
        float rr=r+(n-.5)*(.09+width*1.6);
        mask=band(rr-.83,width*(.75+n*.9))*.95+band(rr-.66,width*.45)*.3*n;
        mask+=smoothstep(.85,.3,r)*smoothstep(.05,.55,r)*pow(n,2.4)*.5*(1.0-age);
        core=band(rr-.83,width*.3)*(.5+n);
        float th=smoothstep(.3,1.0,age)*.85;core+=vxRim(n,th,.05)*mask*1.4;mask*=vxBurn(n,th,.07);
      }else if(avType<1.5){                            // magic circle: inscribed by a sweeping head, energy runs the lines
        float hex=r*cos(mod(an+PI/6.0,PI/3.0)-PI/6.0);
        float hexb=r*cos(mod(an+PI/2.0,PI/3.0)-PI/6.0);
        float circle=band(r-.90,.012)+band(r-.76,.008)*.65;
        float star=(band(hex-.56,.008)+band(hexb-.56,.008))*(1.0-smoothstep(.83,.87,r));
        float tick=step(.72,cos(an*24.0))*smoothstep(.77,.80,r)*(1.0-smoothstep(.86,.88,r));
        float inner=band(r-.27,.01)*.8+band(r-.36,.006)*.45;
        float gly=smoothstep(.58,.8,vxR(vec2(au*16.0+sd,r*2.5)))*band(r-.465,.06);
        float fl=vxF(vec2(au*6.0-vxT*.22+sd,r*2.0));
        mask=(circle*.65+star*.7+tick*.7+inner+gly*.6)*(.6+.75*fl);core=circle*.35+star*.2+(circle+star)*fl*.35;
        float rev=age/.16,sw=fract(au+sd*.13);
        mask*=smoothstep(sw-.035,sw,rev);core+=exp(-pow((rev-sw)*22.0,2.0))*(circle+star+inner+gly)*1.6*step(rev,1.2);
        float n=vxF(p*.9+sd),th=smoothstep(.62,1.0,age);core+=vxRim(n,th,.05)*1.2*step(.02,mask);mask*=vxBurn(n,th,.06);
      }else if(avType<2.5){                            // pillar: flame licks rising and thinning
        float h=vUv.y;
        float n=vxFlow(vec2(vUv.x*2.0+sd,h*.8),vec2(0.0,-1.3));
        float rid=vxR(vec2(vUv.x*3.0+sd-vxT*.1,h*1.5-vxT*1.0));
        float column=pow(max(0.0,1.0-h),1.3);
        float lick=smoothstep(.3+h*.5,.9,n+(1.0-h)*.28);
        float braid=pow(max(0.0,sin(vUv.x*TAU*3.0+h*8.0-age*5.0+seed)),9.0);
        mask=column*(.08+lick*.7+rid*.22*(1.0-h)+braid*.25);core=column*(lick*lick*.55+braid*.2);
        envelope*=1.0-smoothstep(.55,1.0,age);
      }else if(avType<3.5){                            // dome shield: fresnel rim, flowing hex cells, a scanning wave
        vec3 N=normalize(vNormal),E=normalize(vEye);
        float rim=pow(1.0-abs(dot(N,E)),2.4);
        float cell=vxC(vUv*vec2(6.0,3.0)+vec2(vxT*.02+sd,0.0));
        float wall=1.0-smoothstep(.04,.16,cell);
        float fl=vxFlow(vUv*vec2(4.0,2.0)+sd,vec2(.04,.1));
        float wave=exp(-pow((vUv.y-fract(.85-age*1.3))*7.0,2.0));
        mask=rim*.62+wall*(.14+rim*.45)*(.55+.9*fl)+fl*.07+wave*(.18+wall*.4);
        core=rim*.18+wall*fl*.22+wave*.25;
        float th=smoothstep(.55,1.0,age);core+=vxRim(fl,th,.05)*.8;mask*=vxBurn(fl,th,.07);
      }else if(avType<4.5){                            // slash arc: streaked along the swing, frays into wisps
        float angle=abs(an);
        float end=1.0-smoothstep(max(0.0,span*.5-.16),span*.5,angle);
        float taper=pow(max(0.0,cos(angle/max(span,.01)*PI)),.5);
        float sa=an/max(span,.01)+.5;
        float n=vxFlow(vec2(sa*1.5+sd,r*2.5),vec2(-.9,0.0));
        float st=vxF(vec2(sa*.7-age*1.8+sd,r*7.0));
        float rr=r+(n-.5)*.05;
        mask=(band(rr-.83,width*(.7+st))*.9+band(rr-.64,width*.4)*.3*n)*end*taper*(.5+.9*st);
        core=band(rr-.83,width*.22)*end*taper*(.45+st);
        float th=smoothstep(.2,1.0,age)*.9;core+=vxRim(n,th,.05)*mask*1.3;mask*=vxBurn(n,th,.07);
      }else if(avType<5.5){                            // crystal shard: facets, cracks and a glint
        vec3 N=normalize(vNormal),E=normalize(vEye);
        float rim=pow(1.0-abs(dot(N,E)),1.6);
        float crk=1.0-smoothstep(.03,.12,vxC(vUv*1.5+sd));
        float gl=pow(max(0.0,dot(reflect(-E,N),normalize(vec3(.35,.8,.45)))),20.0);
        mask=.2+rim*.55+crk*.3;core=.1+rim*.15+gl*.9+crk*.15;
      }else if(avType<6.5){                            // streak: wispy, flowing trail
        float n=vxFlow(vec2(p.x*.4+sd,vUv.y*1.2),vec2(0.0,-2.0));
        float w=1.0-smoothstep(.12+.55*n,1.0,abs(p.x));
        mask=w*(1.0-smoothstep(.0,1.0,abs(p.y)))*(.5+n);
        core=pow(max(0.0,1.0-abs(p.x)),5.0)*(1.0-abs(p.y))*.55;
      }else{                                           // glow: a flickering, warped fireball rather than a perfect disc
        vec2 wq=p+(vec2(vxF(p*.3+sd+vxT*.12),vxA(p*.3-sd+vxT*.1))-.5)*.6;
        float rr=dot(wq,wq),n=vxF(wq*.5+vec2(sd,-vxT*.35));
        mask=exp(-rr*5.0)*(.55+.9*n)*(1.0-smoothstep(.65,1.0,r));
        core=exp(-rr*20.0)*.55;
      }
      float visibility=1.0-smoothstep(avVision-100.0,avVision+20.0,distance(vWorld,avFocus));
      float opacity=envelope*clamp(mask,0.0,1.0)*visibility;
      // contrast shaping: faint, broad glow is what washed the screen out; it fades away, strong structure stays
      opacity*=.22+.78*smoothstep(.02,.38,opacity);
      if(opacity<.002)discard;
      float heat=clamp(core*1.3,0.0,1.0);
      vec3 deep=vColor*vColor/max(max(vColor.r,max(vColor.g,vColor.b)),1e-3);
      vec3 color=mix(deep*.85,vColor,smoothstep(0.0,.5,mask));
      color=mix(color,vColor2,smoothstep(.15,.7,heat));
      color=mix(color,vxHot(vColor2),smoothstep(.65,1.0,heat));
      gl_FragColor=vec4(color*avGain*(1.0+heat*1.5),opacity);
      #include <colorspace_fragment>
    }`;
  // the shared noise texture (arena-vfx-tex.js); a 1x1 grey stand-in if the library is absent
  let grey=null;
  function noiseUniforms(){if(window.ArenaVFXTex)return ArenaVFXTex.uniforms();
    if(!grey){grey=new THREE.DataTexture(new Uint8Array([128,255,128,128]),1,1);grey.needsUpdate=true}return{vxN:{value:grey},vxT:{value:0}}}
  function mode(renderer){
    const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    const high=!!renderer.hi&&!renderer.mobile;
    return {high,reduced,key:(high?'high':'low')+(reduced?'-reduced':'')};
  }
  function makeGeometry(type,high){
    if(type==='pillar')return new THREE.CylinderGeometry(1,1,1,high?32:20,1,true).translate(0,.5,0);
    if(type==='dome')return new THREE.SphereGeometry(1,high?28:18,high?14:10,0,TAU,0,PI/2);
    if(type==='shard')return new THREE.OctahedronGeometry(1,0);
    const g=new THREE.PlaneGeometry(2,2);
    if(type==='ring'||type==='rune'||type==='arc')g.rotateX(-PI/2);
    return g;
  }
  function create(renderer){
    // Three.js constructors allocate UUIDs using Math.random. Keep even those
    // synchronous, visual-only allocations off the simulation's random stream.
    const previous=Math.random;
    try{Math.random=random;return allocate(renderer);}finally{Math.random=previous;}
  }
  function allocate(renderer){
    if(!renderer.scene||!renderer.ok)return null;
    const quality=mode(renderer),caps=quality.high?HIGH:LOW;
    const state={scene:renderer.scene,quality,batches:{},accepted:0,dropped:0,culled:0,emittedFrame:0,
      frameBudget:quality.reduced?70:quality.high?300:130,marks:Object.create(null),markKeys:0,steps:0,
      dummy:new THREE.Object3D(),color:new THREE.Color(),color2:new THREE.Color(),direction:new THREE.Vector3(),
      view:new THREE.Vector3(),side:new THREE.Vector3(),normal:new THREE.Vector3(),basis:new THREE.Matrix4()};
    TYPES.forEach((type,index)=>{
      const capacity=Math.max(4,Math.floor(caps[index]*(quality.reduced?.55:1)));
      const geometry=makeGeometry(type,quality.high);
      const life=new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4);
      const color=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3);
      const color2=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3);
      life.setUsage(THREE.DynamicDrawUsage);color.setUsage(THREE.DynamicDrawUsage);color2.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute('avLife',life);geometry.setAttribute('avColor',color);geometry.setAttribute('avColor2',color2);
      const material=new THREE.ShaderMaterial({uniforms:Object.assign({avType:{value:index},avGain:{value:renderer.post?1.25:.95},avFocus:renderer.U.fowC,avVision:renderer.U.fowR},noiseUniforms()),
        vertexShader:VERT,fragmentShader:FRAG,transparent:true,depthTest:true,depthWrite:false,
        side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});
      const mesh=new THREE.InstancedMesh(geometry,material,capacity);
      mesh.name='arena-vfx-'+type;mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;
      mesh.renderOrder=8;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // avDispose removes these before the base renderer's scene traversal.
      mesh.userData.arenaVFX=true;renderer.scene.add(mesh);
      const slots=Array.from({length:capacity},()=>({on:false}));
      state.batches[type]={mesh,geometry,material,life,color,color2,slots,capacity,active:0,cursor:0};
    });
    return state;
  }
  function ensure(renderer){
    const q=mode(renderer),old=renderer._av;
    if(old&&(old.scene!==renderer.scene||old.quality.key!==q.key)){renderer.avDispose();}
    if(!renderer._av)renderer._av=create(renderer);
    renderer.avHi=q.high;renderer.avReduced=q.reduced;
    return renderer._av;
  }
  Object.assign(R3,{
    avRand:random,
    avMark(key){const a=this._av;if(!a||typeof key!=='string'||key.length>80)return;
      if(a.marks[key]!==undefined)a.marks[key]++;else if(a.markKeys<128){a.marks[key]=1;a.markKeys++;}},
    avEmit(type,o){
      const a=this._av;if(!a||a.scene!==this.scene||!o)return false;
      const b=a.batches[type];if(!b||!Number.isFinite(o.x)||!Number.isFinite(o.y))return false;
      const L=typeof listener==='function'?listener():null;
      const reach=typeof visionR==='function'?visionR():1100;
      if(o.follow&&!visibleFollow(o.follow,L)){a.culled++;return false;}
      if(L&&Math.hypot(o.x-L.x,o.y-L.y)>reach+Math.min(650,finite(o.r,100))+140){a.culled++;return false;}
      if(a.emittedFrame>=a.frameBudget){a.dropped++;return false;}
      let slot=null;
      for(let j=0;j<b.capacity;j++){const i=(b.cursor+j)%b.capacity;if(!b.slots[i].on){slot=b.slots[i];b.cursor=(i+1)%b.capacity;break;}}
      if(!slot){a.dropped++;return false;}
      a.color.set(o.c||'#b5e5ff');a.color2.set(o.c2||'#ffffff');
      const follow=o.follow&&!o.follow.dead?o.follow:null;
      Object.assign(slot,{on:true,t:0,life:clamp(finite(o.life,.7),.06,5),x:o.x,y:o.y,
        height:finite(o.height,type==='ring'||type==='rune'||type==='arc'?7:20),
        r:clamp(finite(o.r,90),.5,1300),r1:clamp(finite(o.r1,finite(o.r,90)),.1,2600),
        angle:finite(o.angle,0),arc:clamp(finite(o.arc,PI*1.5),.05,TAU),spin:a.quality.reduced?0:clamp(finite(o.spin,0),-16,16),
        vx:clamp(finite(o.vx,0),-2400,2400),vy:clamp(finite(o.vy,0),-2400,2400),vz:clamp(finite(o.vz,0),-2400,2400),
        gravity:clamp(finite(o.gravity,0),0,1800),tilt:finite(o.tilt,0),
        width:clamp(finite(o.width,type==='arc'?.12:.035),.003,type==='streak'?240:.5),
        opacity:clamp(finite(o.a,finite(o.opacity,1)),0,1),seed:finite(o.seed,random()*TAU),follow,
        ox:follow?o.x-follow.x:0,oy:follow?o.y-follow.y:0,
        cr:a.color.r,cg:a.color.g,cb:a.color.b,c2r:a.color2.r,c2g:a.color2.g,c2b:a.color2.b});
      // Useful physical defaults for primitives with two different dimensions.
      if(o.r1===undefined&&type==='pillar')slot.r1=Math.min(2600,slot.r*5);
      if(o.r1===undefined&&type==='shard')slot.r1=slot.r*3;
      if(o.width===undefined&&type==='streak')slot.width=Math.max(2,slot.r*.06);
      a.accepted++;a.emittedFrame++;b.active++;return true;
    },
    avStep(dt){
      if(!this._av)return;const a=ensure(this);if(!a)return;
      dt=Math.max(0,finite(dt,0));const motionDT=Math.min(dt,.12),d=a.dummy;
      const L=typeof listener==='function'?listener():null;
      const reach=typeof visionR==='function'?visionR():1100;
      a.steps++;
      for(const type of TYPES){
        const b=a.batches[type];let n=0;
        b.material.uniforms.avGain.value=(this.post?1.25:.95)*(a.quality.reduced?.8:1);   // round 1: was 1.9/1.05 (white-out); hot cores carry the HDR now
        for(const s of b.slots){
          if(!s.on)continue;s.t+=dt;
          if(s.t>=s.life||(s.follow&&!visibleFollow(s.follow,L))){s.on=false;s.follow=null;continue;}
          const age=s.t/s.life,grow=Math.sin(Math.min(1,age*2.4)*PI/2);
          if(s.follow){s.x=s.follow.x+s.ox;s.y=s.follow.y+s.oy;}
          s.x+=s.vx*motionDT;s.y+=s.vz*motionDT;s.height+=s.vy*motionDT;s.vy-=s.gravity*motionDT;
          if(L&&Math.hypot(s.x-L.x,s.y-L.y)>reach+Math.min(650,s.r)+140){s.on=false;s.follow=null;a.culled++;continue;}
          const ground=this.gY(s.x,s.y);
          d.position.set(s.x,ground+s.height,s.y);d.rotation.set(0,0,0);d.scale.set(1,1,1);
          const radius=s.r+(s.r1-s.r)*(a.quality.reduced?age:grow);
          const turn=s.angle+s.spin*s.t;
          if(type==='ring'||type==='rune'||type==='arc'){
            d.rotation.y=-turn;d.scale.set(radius,1,radius);
          }else if(type==='pillar'){
            const rise=a.quality.reduced?1:.65+.35*grow;d.rotation.y=turn;d.scale.set(s.r,s.r1*rise,s.r);
          }else if(type==='dome'){
            d.rotation.y=turn;d.scale.set(radius,radius*.72,radius);
          }else if(type==='shard'){
            d.rotation.set(s.seed*.2,turn,s.seed*.4);d.scale.set(s.r,s.r1,s.r*.7);
          }else if(type==='streak'){
            a.direction.set(Math.cos(turn)*Math.cos(s.tilt),Math.sin(s.tilt),Math.sin(turn)*Math.cos(s.tilt));
            // Face the camera while preserving the 3D trajectory: a fixed plane
            // can turn edge-on and make projectile trails disappear at some aims.
            a.view.copy(this.cam.position).sub(d.position).normalize();
            a.side.crossVectors(a.direction,a.view);
            if(a.side.lengthSq()<.00001)a.side.set(1,0,0);
            a.side.normalize();a.normal.crossVectors(a.side,a.direction).normalize();
            a.basis.makeBasis(a.side,a.direction,a.normal);d.quaternion.setFromRotationMatrix(a.basis);
            d.scale.set(s.width,s.r,1);
          }else{
            d.quaternion.copy(this.cam.quaternion);d.scale.setScalar(radius);
          }
          d.updateMatrix();b.mesh.setMatrixAt(n,d.matrix);
          b.life.setXYZW(n,age,s.seed,s.width,s.arc);
          // Opacity is encoded in color because additive blending is deliberate.
          const opacity=s.opacity;b.color.setXYZ(n,s.cr*opacity,s.cg*opacity,s.cb*opacity);
          b.color2.setXYZ(n,s.c2r*opacity,s.c2g*opacity,s.c2b*opacity);n++;
        }
        b.active=n;b.mesh.count=n;b.mesh.visible=n>0;
        if(n){b.mesh.instanceMatrix.needsUpdate=true;b.life.needsUpdate=true;b.color.needsUpdate=true;b.color2.needsUpdate=true;}
      }
      a.emittedFrame=0;
    },
    avReset(){
      const a=ensure(this);if(a){for(const b of Object.values(a.batches)){for(const s of b.slots){s.on=false;s.follow=null;}b.active=0;b.cursor=0;b.mesh.count=0;b.mesh.visible=false;}
        a.accepted=0;a.dropped=0;a.culled=0;a.emittedFrame=0;a.marks=Object.create(null);a.markKeys=0;a.steps=0;}
      if(typeof this.avRecipeReset==='function')this.avRecipeReset();
    },
    avDispose(){const a=this._av;if(!a)return;
      for(const b of Object.values(a.batches)){a.scene.remove(b.mesh);b.geometry.dispose();b.material.dispose();if(typeof b.mesh.dispose==='function')b.mesh.dispose();for(const s of b.slots)s.follow=null;}
      this._av=null;
    }
  });
  const originalInit=R3.initFX,originalExtra=R3.fxExtra,originalDispose=R3.disposeScene,originalRebind=R3.rebind;
  R3.initFX=function(){originalInit.call(this);this.avReset();};
  R3.fxExtra=function(T,dt,me,L){originalExtra.call(this,T,dt,me,L);this.avStep(dt);};
  R3.disposeScene=function(){this.avDispose();return originalDispose.call(this);};
  R3.rebind=function(){const result=originalRebind.call(this);this.avReset();return result;};
  window.ArenaVFX={snapshot(){
    const a=R3._av;if(!a)return{enabled:false,totalActive:0,totalCapacity:0,batchCount:0,allocatedGeometries:0,allocatedMaterials:0,marks:{},batches:{}};
    const batches={};let totalActive=0,totalCapacity=0;
    for(const type of TYPES){const b=a.batches[type];batches[type]={active:b.active,capacity:b.capacity};totalActive+=b.active;totalCapacity+=b.capacity;}
    return{enabled:true,quality:a.quality.high?'high':'low',reducedMotion:a.quality.reduced,totalActive,totalCapacity,batchCount:TYPES.length,
      allocatedGeometries:TYPES.length,allocatedMaterials:TYPES.length,accepted:a.accepted,dropped:a.dropped,culled:a.culled,
      frameBudget:a.frameBudget,marks:Object.assign({},a.marks),batches};
  }};
})();
