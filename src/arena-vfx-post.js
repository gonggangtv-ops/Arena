/* Arena Royale · VFX rounds 3+4 (Claude, 2026-11-20 · index only). Render only, nothing in combat is touched.
 * Round 3 — the air and the light react to the effects:
 *  - one screen-space pass (high quality post chain, before bloom) that bends the image: shockwave rings that refract outward
 *    from blasts, slams and lightning strikes, and heat haze that shimmers over fire. Up to 8 of each at once, projected from
 *    their world position every frame; the pass switches itself off when nothing is active.
 *  - ground light: on low quality (no real point lights) blasts, bolts and slams light the ground under them with a coloured glow.
 * Round 4 — impact feel:
 *  - kicks: a brief radial blur toward the impact, a chromatic split and a tinted flash for the big hits, scaled down with distance
 *    from the local player; a short hit-stop (the renderer's own visual slow-down, r10) only when the local player is close.
 * Toggles (localStorage, default on): ar_fx_warp (distortion), ar_fx_kick (blur/split/flash/hit-stop). */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined'||(typeof MOON!=='undefined'&&MOON))return;
  const P=R3,T=THREE,MOB=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const on=k=>{try{return localStorage.getItem('ar_fx_'+k)!=='0'}catch(e){return true}};
  const VXN=window.VFXN_GLSL||`uniform sampler2D vxN;uniform float vxT;float vxF(vec2 u){return .5;}float vxA(vec2 u){return .5;}`;
  const NXU=()=>window.ArenaVFXTex?ArenaVFXTex.uniforms():{vxN:{value:null},vxT:{value:0}};
  const NW=8,NH=8,V=new T.Vector3(),V2=new T.Vector3(),RT=new T.Vector3(),C=new T.Color();
  const waves=[],heats=[],kick={ca:0,rad:0,fl:0,c:new T.Color(1,1,1),x:.5,y:.5};
  const near=(x,y)=>{const L=typeof listener==='function'?listener():null;return L?Math.hypot(x-L.x,y-L.y):0};
  // ---------------- API (safe to call from anywhere, any quality) ----------------
  // wave: x,y game coords, h height, r0->r1 world radius, s strength (uv offset), life seconds
  P.vfxWave=function(x,y,o={}){if(!on('warp')||!Number.isFinite(x)||!Number.isFinite(y)||near(x,y)>1700)return;if(waves.length>=NW)waves.shift();
    waves.push({x,y,h:o.h||20,r0:o.r0||20,r1:o.r1||300,s:o.s||.008,life:o.life||.6,t:0})};
  P.vfxHeat=function(x,y,o={}){if(!on('warp')||!Number.isFinite(x)||!Number.isFinite(y)||near(x,y)>1700)return;if(heats.length>=NH)heats.shift();
    heats.push({x,y,h:o.h||40,r:o.r||120,s:o.s||.004,life:o.life||1.4,t:0})};
  // kick: radial blur + chromatic split + flash, fading over ~.3 s; scaled by distance from the local player
  P.vfxKick=function(x,y,o={}){if(!on('kick')||!Number.isFinite(x))return;const d=near(x,y),k=Math.max(0,1-d/(o.reach||900));if(k<=0)return;
    kick.ca=Math.max(kick.ca,(o.ca||0)*k);kick.rad=Math.max(kick.rad,(o.rad||0)*k);if((o.fl||0)*k>kick.fl){kick.fl=(o.fl||0)*k;kick.c.set(o.c||'#ffffff')}kick.wx=x;kick.wy=y;
    if(o.stop&&d<(o.stopReach||420))this.hitStop=Math.max(this.hitStop||0,o.stop)};
  // ---------------- the distortion / impact pass ----------------
  const VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',CAM2=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const FS=`precision highp float;varying vec2 vUv;uniform sampler2D tColor;uniform vec4 uW[${NW}];uniform vec4 uH[${NH}];uniform float uAsp;uniform float uCA;uniform float uRad;uniform float uFl;uniform vec2 uC;uniform vec3 uFlC;
    ${VXN}
    void main(){vec2 uv=vUv,off=vec2(0.0),asp=vec2(uAsp,1.0);
      for(int i=0;i<${NW};i++){vec4 w=uW[i];if(w.w<=0.0)continue;vec2 d=(uv-w.xy)*asp;float L=length(d)+1e-5;float x=(L-w.z)/max(w.z*.24,.004);
        off+=(d/L)/asp*(-x*exp(-x*x*1.2))*w.w;}
      for(int i=0;i<${NH};i++){vec4 h=uH[i];if(h.w<=0.0)continue;vec2 d=(uv-h.xy)*asp;float f=1.0-smoothstep(h.z*.3,h.z,length(d));
        vec2 q=uv*asp*7.0;vec2 n=vec2(vxF(q+vec2(0.0,-vxT*1.3)),vxA(q*1.3+vec2(vxT*.6,-vxT*1.7)))-.5;off+=n*f*h.w;}
      vec3 col;
      if(uRad>.0005){vec2 dir=uv-uC;col=vec3(0.0);for(int i=0;i<6;i++)col+=texture2D(tColor,uv+off-dir*uRad*float(i)/5.0).rgb;col/=6.0;}
      else col=texture2D(tColor,uv+off).rgb;
      if(uCA>.0003){vec2 cd=(uv-.5)*uCA;col.r=texture2D(tColor,uv+off+cd).r;col.b=texture2D(tColor,uv+off-cd).b;}
      // the flash is light from the blast: strongest round the impact, a faint tint elsewhere (a flat full-screen wash read as haze)
      vec2 fd=(uv-uC)*asp;col+=uFlC*uFl*(.25+.75*exp(-dot(fd,fd)*6.0));
      gl_FragColor=vec4(col,1.0);}`;
  function makePass(R){const tri=new T.BufferGeometry();tri.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));tri.setAttribute('uv',new T.Float32BufferAttribute([0,0,2,0,0,2],2));
    const uW=Array.from({length:NW},()=>new T.Vector4()),uH=Array.from({length:NH},()=>new T.Vector4());
    const m=new T.ShaderMaterial({uniforms:Object.assign({tColor:{value:null},uW:{value:uW},uH:{value:uH},uAsp:{value:1},uCA:{value:0},uRad:{value:0},uFl:{value:0},uC:{value:new T.Vector2(.5,.5)},uFlC:{value:new T.Color()}},NXU()),
      vertexShader:VS,fragmentShader:FS,depthTest:false,depthWrite:false});
    const quad=new T.Mesh(tri,m);quad.frustumCulled=false;
    return{enabled:false,needsSwap:true,clear:false,renderToScreen:false,isPass:true,mat:m,setSize(){},dispose(){m.dispose();tri.dispose()},
      render(renderer,writeBuffer,readBuffer){m.uniforms.tColor.value=readBuffer.texture;const ac=renderer.autoClear;renderer.autoClear=false;renderer.setRenderTarget(writeBuffer);renderer.render(quad,CAM2);renderer.autoClear=ac}}}
  const _sp=P.setupPost;P.setupPost=function(){const r=_sp.apply(this,arguments);const c=this.composer;this.vfxPass=null;if(!c||MOB)return r;
    try{const pass=makePass(this);let at=c.passes.indexOf(this.bloom);if(at<0)at=Math.max(1,c.passes.length-1);c.insertPass(pass,at);this.vfxPass=pass}catch(e){console.warn('vfx post',e)}return r};
  // ---------------- ground light (low quality only: high quality has real flash lights) ----------------
  const GFS=`precision highp float;varying vec2 vUv;varying vec3 vC;varying vec2 vL;uniform vec2 uFocus;uniform float uVision;varying vec2 vWorld;
    void main(){vec2 q=vUv*2.0-1.0;float r2=dot(q,q);if(r2>1.0)discard;float a=exp(-r2*3.2)*(1.0-smoothstep(.7,1.0,sqrt(r2)))*pow(max(0.0,1.0-vL.x),1.6)*vL.y;
      float vis=1.0-smoothstep(uVision-100.0,uVision+20.0,distance(vWorld,uFocus));a*=vis;if(a<.003)discard;gl_FragColor=vec4(vC*a,a);
      #include <colorspace_fragment>
    }`;
  const GVS=`attribute vec3 gC;attribute vec2 gL;varying vec2 vUv;varying vec3 vC;varying vec2 vL;varying vec2 vWorld;
    void main(){vUv=uv;vC=gC;vL=gL;vec4 p=instanceMatrix*vec4(position,1.0);vWorld=p.xz;gl_Position=projectionMatrix*modelViewMatrix*p;}`;
  function glowPool(R){const cap=16,g=new T.PlaneGeometry(2,2).rotateX(-Math.PI/2),gC=new T.InstancedBufferAttribute(new Float32Array(cap*3),3),gL=new T.InstancedBufferAttribute(new Float32Array(cap*2),2);
    gC.setUsage(T.DynamicDrawUsage);gL.setUsage(T.DynamicDrawUsage);g.setAttribute('gC',gC);g.setAttribute('gL',gL);
    const m=new T.ShaderMaterial({uniforms:{uFocus:R.U.fowC,uVision:R.U.fowR},vertexShader:GVS,fragmentShader:GFS,transparent:true,depthWrite:false,blending:T.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-4,toneMapped:false});
    const mesh=new T.InstancedMesh(g,m,cap);mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.renderOrder=3;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.userData.arenaVFX=true;R.scene.add(mesh);
    return{scene:R.scene,g,m,mesh,gC,gL,cap,list:[],d:new T.Object3D()}}
  P.vfxGlow=function(x,y,r,c,I,life){if(this.hi||!this.scene||!Number.isFinite(x))return;if(!this._vglow||this._vglow.scene!==this.scene){this._vglow=glowPool(this)}const G=this._vglow;
    if(G.list.length>=G.cap)G.list.shift();C.set(c||'#ffb060');G.list.push({x,y,r:r||150,cr:C.r,cg:C.g,cb:C.b,I:I||1,life:life||.45,t:0})};
  function stepGlow(R,dt){const G=R._vglow;if(!G)return;let n=0;G.list=G.list.filter(s=>(s.t+=dt)<s.life);
    for(const s of G.list){G.d.position.set(s.x,R.gY(s.x,s.y)+3,s.y);G.d.scale.set(s.r,1,s.r);G.d.updateMatrix();G.mesh.setMatrixAt(n,G.d.matrix);G.gC.setXYZ(n,s.cr,s.cg,s.cb);G.gL.setXY(n,s.t/s.life,s.I);n++}
    G.mesh.count=n;G.mesh.visible=n>0;if(n){G.mesh.instanceMatrix.needsUpdate=true;G.gC.needsUpdate=true;G.gL.needsUpdate=true}}
  // ---------------- per frame ----------------
  function project(R,x,y,h){const cam=R.cam;V.set(x,R.gY(x,y)+h,y).project(cam);return V.z<1&&V.z>-1}
  function step(R,dt){const pass=R.vfxPass;dt=Math.max(0,Math.min(.1,dt||0));
    for(const w of waves)w.t+=dt;for(const h of heats)h.t+=dt;
    for(let i=waves.length-1;i>=0;i--)if(waves[i].t>=waves[i].life)waves.splice(i,1);for(let i=heats.length-1;i>=0;i--)if(heats[i].t>=heats[i].life)heats.splice(i,1);
    const dk=Math.exp(-dt*9);kick.ca*=dk;kick.rad*=dk;kick.fl*=Math.exp(-dt*12);if(kick.ca<.0002)kick.ca=0;if(kick.rad<.0004)kick.rad=0;if(kick.fl<.003)kick.fl=0;
    stepGlow(R,dt);
    if(!pass)return;const U=pass.mat.uniforms,cam=R.cam;if(!cam)return;
    const W=R.renderer?R.renderer.domElement.width:1,H=R.renderer?R.renderer.domElement.height:1,asp=W/Math.max(1,H);U.uAsp.value=asp;RT.setFromMatrixColumn(cam.matrixWorld,0).normalize();
    let any=false;
    for(let i=0;i<NW;i++){const w=waves[i],u=U.uW.value[i];u.set(0,0,0,0);if(!w)continue;const k=w.t/w.life,e=1-Math.pow(1-k,2.4),r=w.r0+(w.r1-w.r0)*e;
      if(!project(R,w.x,w.y,w.h))continue;const cx=V.x*.5+.5,cy=V.y*.5+.5;V2.set(w.x,R.gY(w.x,w.y)+w.h,w.y).addScaledVector(RT,r).project(cam);
      const rr=Math.hypot((V2.x*.5+.5-cx)*asp,V2.y*.5+.5-cy);u.set(cx,cy,rr,w.s*Math.pow(1-k,1.4));any=true}
    for(let i=0;i<NH;i++){const h=heats[i],u=U.uH.value[i];u.set(0,0,0,0);if(!h)continue;const k=h.t/h.life,f=Math.min(1,h.t/.15)*(1-Math.pow(k,2));
      if(!project(R,h.x,h.y,h.h))continue;const cx=V.x*.5+.5,cy=V.y*.5+.5;V2.set(h.x,R.gY(h.x,h.y)+h.h,h.y).addScaledVector(RT,h.r).project(cam);
      u.set(cx,cy,Math.hypot((V2.x*.5+.5-cx)*asp,V2.y*.5+.5-cy),h.s*f);any=true}
    U.uCA.value=kick.ca;U.uRad.value=kick.rad;U.uFl.value=kick.fl;U.uFlC.value.copy(kick.c);
    if((kick.rad>0||kick.fl>0)&&Number.isFinite(kick.wx)&&project(R,kick.wx,kick.wy,30))U.uC.value.set(V.x*.5+.5,V.y*.5+.5);
    pass.enabled=any||kick.ca>0||kick.rad>0||kick.fl>0}
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r=_fx.call(this,Tm,dt,me,L);try{step(this,dt)}catch(e){if(!this._vpErr){this._vpErr=1;console.warn('vfx post step',e)}}return r};
  const _ini=P.initFX;if(_ini)P.initFX=function(){const r=_ini.apply(this,arguments);waves.length=0;heats.length=0;kick.ca=kick.rad=kick.fl=0;if(this._vglow){this._vglow.list=[]}return r};
  const _ds=P.disposeScene;P.disposeScene=function(){const G=this._vglow;if(G){G.scene.remove(G.mesh);G.g.dispose();G.m.dispose();this._vglow=null}return _ds.apply(this,arguments)};
  window.ArenaVFXPost={waves,heats,kick};
})();
