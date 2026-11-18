/* Arena Royale · AAA light and VFX layer (Claude, 2026-11-18 · index only, high quality). Render only.
 * Post (inserted before bloom, needs the high-quality composer):
 *  - volumetric light: the sun's shadow map is ray-marched through a low ground haze at reduced resolution, so light
 *    falls in shafts through canopies, past houses and bridges (desktop only); Henyey-Greenstein forward scattering,
 *    drifting density noise, blurred on composite,
 *  - screen distortion: shockwave rings and heat shimmer from skills, rendered as offsets into a small float target,
 *  - lens: radial chromatic aberration that spikes on big nearby impacts, fine film grain, a gentle filmic contrast curve.
 * Scene: volumetric fireballs (noise-displaced, eroding spheres that burn from white-hot to smoke) for fire / frost / holy /
 *  void blasts, heat haze over burning ground, and point lights that ride the brightest projectiles.
 * Toggles (localStorage, default on): ar_fx_vol, ar_fx_dist, ar_fx_lens, ar_fx_ball, ar_fx_plight. */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined'||(typeof MOON!=='undefined'&&MOON))return;
  const P=R3,T=THREE,MOB=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const on=k=>{try{return localStorage.getItem('ar_fx_'+k)!=='0'}catch(e){return true}};
  const V1=new T.Vector3(),V2=new T.Vector3(),M1=new T.Matrix4(),Q1=new T.Quaternion(),C1=new T.Color();
  const TRI=new T.BufferGeometry();TRI.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));TRI.setAttribute('uv',new T.Float32BufferAttribute([0,0,2,0,0,2],2));
  const VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',CAM2=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const FX={ca:0,dist:[],balls:[],t:0};
  const near=(x,y,R)=>P.tx===undefined||Math.hypot(x-P.tx,y-P.ty)<R;
  const camD=(x,y)=>P.tx!==undefined?Math.hypot(x-P.tx,y-P.ty):0;

  // ---------------- shaders ----------------
  const VOLFS=`precision highp float;varying vec2 vUv;
uniform sampler2D tDepth,uNoise;uniform sampler2DShadow tShadow;uniform mat4 uProjInv,uCamW,uShM;uniform vec3 uCam,uSun;uniform float uGround,uTop,uH,uTime,uHasSh,uG;
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
void main(){float d=texture2D(tDepth,vUv).x;vec4 v=uProjInv*vec4(vUv*2.-1.,d*2.-1.,1.);v/=v.w;vec3 Pw=(uCamW*v).xyz;
  vec3 rd=Pw-uCam;float L=length(rd);rd/=max(L,1e-3);L=min(L,7000.);float t0=0.;
  if(uCam.y>uTop){if(rd.y>-1e-3){gl_FragColor=vec4(0.);return;}t0=(uTop-uCam.y)/rd.y;}
  if(t0>=L){gl_FragColor=vec4(0.);return;}
  const int N=22;float st=(L-t0)/float(N),j=ign(gl_FragCoord.xy+vec2(fract(uTime*7.)*61.,fract(uTime*3.)*17.)),acc=0.;
  for(int i=0;i<N;i++){vec3 S=uCam+rd*(t0+(float(i)+j)*st);
    float dens=exp(-max(S.y-uGround,0.)/uH);float n=texture2D(uNoise,S.xz*.0011+vec2(uTime*.012,uTime*.007)).r*.65+texture2D(uNoise,S.xz*.0043+vec2(-uTime*.02,uTime*.013)).r*.35;dens*=.12+1.9*n*n;
    float lit=1.;if(uHasSh>.5){vec4 sc=uShM*vec4(S,1.);vec3 q=sc.xyz/sc.w;if(q.x>.002&&q.x<.998&&q.y>.002&&q.y<.998&&q.z<1.)lit=texture(tShadow,vec3(q.xy,q.z-.0008));}
    acc+=dens*lit;}
  float mu=dot(rd,uSun),g=uG,hg=(1.-g*g)/pow(1.+g*g-2.*g*mu,1.5)*.25;
  gl_FragColor=vec4(acc*st*(.35+2.2*hg),0.,0.,1.);}`;
  const CMFS=`precision highp float;varying vec2 vUv;
uniform sampler2D tColor,tVol,tDist;uniform vec2 uVolPx;uniform vec3 uSunCol;uniform float uVolK,uCA,uCAp,uGrain,uTime,uDistOn,uVolOn,uCurve;
void main(){vec2 uv=vUv,off=vec2(0.);if(uDistOn>.5){off=texture2D(tDist,vUv).xy;uv=clamp(vUv+off,vec2(.001),vec2(.999));}
  vec2 cd=uv-.5;float r2=dot(cd,cd),k=uCA*r2*4.+uCAp*(.35+r2*2.4)+length(off)*.5;
  vec3 col=vec3(texture2D(tColor,uv+cd*k).r,texture2D(tColor,uv).g,texture2D(tColor,uv-cd*k).b);
  if(uVolOn>.5){float v=0.;for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++)v+=texture2D(tVol,vUv+vec2(float(i),float(j))*uVolPx*1.4).r;col+=uSunCol*(v/9.)*uVolK;}
  float l=dot(col,vec3(.2126,.7152,.0722));if(l>1e-5)col*=.18*pow(l/.18,uCurve)/l;
  float g=fract(sin(dot(gl_FragCoord.xy+vec2(fract(uTime*1.7)*113.,fract(uTime*2.3)*71.),vec2(12.9898,78.233)))*43758.5453)-.5;col*=1.+g*uGrain;
  gl_FragColor=vec4(max(col,0.),1.);}`;
  // distortion: ground quads, type 0 = expanding shockwave ring (radial push), 1 = heat shimmer disc
  const DVS=`attribute vec4 aP,aQ;varying vec2 vL;varying vec4 vQ,vS,vC;
void main(){vec3 wp=vec3(aP.x+position.x*aP.w,aP.y,aP.z+position.y*aP.w);vL=position.xy;vQ=aQ;vS=projectionMatrix*viewMatrix*vec4(wp,1.);vC=projectionMatrix*viewMatrix*vec4(aP.xyz,1.);gl_Position=vS;}`;
  const DFS=`uniform float uTime;varying vec2 vL;varying vec4 vQ,vS,vC;
void main(){float r=length(vL);if(r>1.)discard;vec2 sp=vS.xy/vS.w,sc=vC.xy/vC.w,off=vec2(0.);
  if(vQ.z<.5){float k=vQ.x,w=.07+.15*k,band=exp(-pow((r-(.12+.88*k))/w,2.));off=normalize(sp-sc+vec2(1e-6))*band*vQ.y*(1.-k)*(1.-k);}
  else{float a=sin(vL.y*13.-uTime*7.+vQ.w)+.6*sin(vL.y*27.+vL.x*6.-uTime*11.+vQ.w*2.),b=sin(vL.x*11.-uTime*6.+vQ.w*3.)+.5*sin(vL.x*23.+vL.y*7.+uTime*9.);
    off=vec2(a,b)*.5*vQ.y*smoothstep(1.,.25,r)*min(1.,(1.-vQ.x)*4.)*min(1.,vQ.x*12.);}
  gl_FragColor=vec4(off*.5,0.,1.);}`;
  // simplex noise (Ashima Arts / Stefan Gustavson, MIT)
  const SNOISE=`vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}vec4 pm(vec4 x){return m289(((x*34.)+1.)*x);}vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=m289(i);vec4 p=pm(pm(pm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 nr=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=nr.x;p1*=nr.y;p2*=nr.z;p3*=nr.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;
  // fireball: displaced, eroding sphere; aF = (life 0..1, seed, mist(0 dark smoke .. 1 white mist), rise)
  const BVS=`attribute vec4 aF;attribute vec3 aC1,aC2;uniform float uTime;varying float vN,vLife,vFres,vMist;varying vec3 vC1,vC2;
${SNOISE}
void main(){float life=aF.x,s=aF.y;vec3 p=position;float n=snoise(p*1.6+vec3(s,s*1.7,uTime*.55+s))*.66+snoise(p*3.1+vec3(-s,uTime*1.1,s*.5))*.22;
  vN=n;vLife=life;vMist=aF.z;vec4 wp=modelMatrix*instanceMatrix*vec4(p*(1.+n*(.22+.3*life)),1.);wp.y+=pow(life,1.4)*aF.w;
  vec3 nw=normalize(mat3(modelMatrix*instanceMatrix)*normal);vFres=clamp(dot(nw,normalize(cameraPosition-wp.xyz)),0.,1.);vC1=aC1;vC2=aC2;gl_Position=projectionMatrix*viewMatrix*wp;}`;
  const BFS=`varying float vN,vLife,vFres,vMist;varying vec3 vC1,vC2;
void main(){float life=vLife,heat=clamp(1.02-life*2.5+vN*.5+vFres*.32-.16,0.,1.);float ero=smoothstep(-.08,.18,(vN*.5+.5)-(life-.4)*1.6);if(ero<=0.)discard;
  vec3 smoke=mix(mix(vec3(.045,.04,.035),vec3(.17,.16,.15),vFres),mix(vec3(.5,.58,.66),vec3(.86,.92,.98),vFres),vMist);
  vec3 fire=mix(vC2*1.05,vC1*1.9,smoothstep(.4,.95,heat))+vec3(.9,.75,.55)*smoothstep(.9,1.,heat);
  vec3 col=mix(smoke,fire,smoothstep(.12,.45,heat));
  float a=smoothstep(.02,.6,vFres)*(1.-smoothstep(.6,1.,life))*mix(mix(.55,.4,vMist),.92,smoothstep(.1,.5,heat))*ero;
  gl_FragColor=vec4(col,a);}`;

  // ---------------- post pass ----------------
  P.aaaPass=function(){const self=this;
    const volM=new T.ShaderMaterial({uniforms:{tDepth:{value:null},tShadow:{value:null},uNoise:{value:this.U.detail.value},uProjInv:{value:new T.Matrix4()},uCamW:{value:new T.Matrix4()},uShM:{value:new T.Matrix4()},
        uCam:{value:new T.Vector3()},uSun:{value:new T.Vector3(0,1,0)},uGround:{value:0},uTop:{value:360},uH:{value:70},uTime:{value:0},uHasSh:{value:0},uG:{value:.45}},vertexShader:VS,fragmentShader:VOLFS,depthTest:false,depthWrite:false});
    const cmM=new T.ShaderMaterial({uniforms:{tColor:{value:null},tVol:{value:null},tDist:{value:null},uVolPx:{value:new T.Vector2(1,1)},uSunCol:{value:new T.Vector3()},uVolK:{value:0},uCA:{value:.0016},uCAp:{value:0},
        uGrain:{value:.035},uTime:{value:0},uDistOn:{value:0},uVolOn:{value:0},uCurve:{value:1.05}},vertexShader:VS,fragmentShader:CMFS,depthTest:false,depthWrite:false});
    // distortion sources
    const DC=64,pl=new T.PlaneGeometry(2,2),dg=new T.InstancedBufferGeometry();dg.index=pl.index;dg.setAttribute('position',pl.getAttribute('position'));
    const aP=new T.InstancedBufferAttribute(new Float32Array(DC*4),4),aQ=new T.InstancedBufferAttribute(new Float32Array(DC*4),4);aP.setUsage(T.DynamicDrawUsage);aQ.setUsage(T.DynamicDrawUsage);
    dg.setAttribute('aP',aP);dg.setAttribute('aQ',aQ);dg.instanceCount=0;
    const dM=new T.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:DVS,fragmentShader:DFS,transparent:true,blending:T.AdditiveBlending,depthTest:false,depthWrite:false,side:T.DoubleSide});
    const dMesh=new T.Mesh(dg,dM);dMesh.frustumCulled=false;const dScene=new T.Scene();dScene.add(dMesh);
    const quad=new T.Mesh(TRI,cmM);quad.frustumCulled=false;let rtV=null,rtD=null;
    const vol=!MOB&&on('vol'),dist=on('dist'),lens=on('lens');
    return{enabled:true,needsSwap:true,clear:false,renderToScreen:false,isPass:true,name:'aaa',
      setSize(w,h){if(rtV)rtV.dispose();if(rtD)rtD.dispose();const k=Math.min(.5,800/Math.max(1,w)),vw=Math.max(2,Math.round(w*k)),vh=Math.max(2,Math.round(h*k));
        rtV=vol?new T.WebGLRenderTarget(vw,vh,{type:T.HalfFloatType,depthBuffer:false}):null;const k2=Math.min(.5,960/Math.max(1,w));
        rtD=dist?new T.WebGLRenderTarget(Math.max(2,Math.round(w*k2)),Math.max(2,Math.round(h*k2)),{type:T.HalfFloatType,depthBuffer:false}):null;cmM.uniforms.uVolPx.value.set(1/vw,1/vh)},
      dispose(){if(rtV)rtV.dispose();if(rtD)rtD.dispose();volM.dispose();cmM.dispose();dM.dispose();dg.dispose();pl.dispose()},
      render(renderer,writeBuffer,readBuffer){const now=performance.now()/1000,cam=self.cam,sun=self.sun,ac=renderer.autoClear,cc=renderer.getClearColor(C1),ca=renderer.getClearAlpha();renderer.autoClear=false;
        let volOn=0,distOn=0;
        try{
          // ---- light shafts ----
          const dep=self._sceneDepth,sh=sun&&sun.shadow&&sun.shadow.map&&sun.shadow.map.depthTexture;
          const indoor=typeof inDG==='function'&&self.tx!==undefined&&inDG({x:self.tx,y:self.ty});
          if(rtV&&dep&&sun&&!indoor&&sun.intensity>.05){const U=volM.uniforms;U.tDepth.value=dep;const hs=!!(sh&&sh.compareFunction);U.uHasSh.value=hs?1:0;U.tShadow.value=hs?sh:null;
            U.uProjInv.value.copy(cam.projectionMatrixInverse);U.uCamW.value.copy(cam.matrixWorld);U.uCam.value.setFromMatrixPosition(cam.matrixWorld);if(hs)U.uShM.value.copy(sun.shadow.matrix);
            sun.getWorldPosition(V1);sun.target.getWorldPosition(V2);U.uSun.value.copy(V1).sub(V2).normalize();U.uGround.value=self.ly||0;U.uTime.value=now%1000;
            if(hs){quad.material=volM;renderer.setRenderTarget(rtV);renderer.setClearColor(0,0);renderer.clear(true,false,false);renderer.render(quad,CAM2);volOn=1;
              const k=self._volK===undefined?1:self._volK;C1.copy(sun.color).multiplyScalar(sun.intensity);cmM.uniforms.uSunCol.value.set(C1.r,C1.g,C1.b);cmM.uniforms.uVolK.value=1.6e-4*k}}
          // ---- distortion ----
          const L=FX.dist;if(rtD&&L.length){const n=Math.min(DC,L.length),A=aP.array,B=aQ.array;
            for(let i=0;i<n;i++){const d=L[i];A[i*4]=d.x;A[i*4+1]=d.y;A[i*4+2]=d.z;A[i*4+3]=d.r;B[i*4]=Math.min(1,d.t/d.dur);B[i*4+1]=d.s;B[i*4+2]=d.type;B[i*4+3]=d.seed}
            aP.needsUpdate=aQ.needsUpdate=true;dg.instanceCount=n;dM.uniforms.uTime.value=now%1000;renderer.setRenderTarget(rtD);renderer.setClearColor(0,0);renderer.clear(true,false,false);renderer.render(dScene,cam);distOn=1}
        }catch(e){if(!self._aaaErr){self._aaaErr=1;console.warn('aaa pass',e)}volOn=0;distOn=0}
        const U=cmM.uniforms;U.tColor.value=readBuffer.texture;U.tVol.value=rtV?rtV.texture:null;U.tDist.value=rtD?rtD.texture:null;U.uVolOn.value=volOn;U.uDistOn.value=distOn;
        U.uCA.value=lens?.0016:0;U.uCAp.value=lens?Math.min(.012,FX.ca):0;U.uGrain.value=lens?.035:0;U.uTime.value=now%100;
        quad.material=cmM;renderer.setRenderTarget(writeBuffer);renderer.render(quad,CAM2);
        renderer.setClearColor(cc,ca);renderer.autoClear=ac}}};
  // insert before bloom; remember the scene depth the render pass writes every frame
  const _sp=P.setupPost;P.setupPost=function(){const r=_sp.apply(this,arguments);const c=this.composer;this.aaa=null;if(!c)return r;
    try{if(!MOB&&on('vol')&&!c.renderTarget1.depthTexture){for(const rt of[c.renderTarget1,c.renderTarget2]){rt.depthTexture=new T.DepthTexture(rt.width,rt.height)}}
      const rp=this.rpass,self=this;if(rp&&!rp._aaa){const rr=rp.render;rp.render=function(renderer,w,rb){self._sceneDepth=rb&&rb.depthTexture||null;return rr.apply(this,arguments)};rp._aaa=1}
      const pass=this.aaaPass();let at=c.passes.indexOf(this.bloom);if(at<0)at=Math.max(1,c.passes.length-1);c.insertPass(pass,at);this.aaa=pass}
    catch(e){console.warn('aaa post',e)}return r};

  // ---------------- volumetric fireballs ----------------
  P.ballInit=function(){if(this._balls||!this.hi||!on('ball'))return;const cap=72,geo=new T.IcosahedronGeometry(1,MOB?3:4);
    const aF=new T.InstancedBufferAttribute(new Float32Array(cap*4),4),c1=new T.InstancedBufferAttribute(new Float32Array(cap*3),3),c2=new T.InstancedBufferAttribute(new Float32Array(cap*3),3);
    for(const a of[aF,c1,c2])a.setUsage(T.DynamicDrawUsage);geo.setAttribute('aF',aF);geo.setAttribute('aC1',c1);geo.setAttribute('aC2',c2);
    const m=new T.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:BVS,fragmentShader:BFS,transparent:true,depthWrite:false});
    const im=new T.InstancedMesh(geo,m,cap);im.count=0;im.frustumCulled=false;im.renderOrder=6;im.castShadow=false;im.receiveShadow=false;this.scene.add(im);this._balls={im,geo,m,aF,c1,c2,cap}};
  const PAL={fire:['#ffd27a','#ff4a10',0],frost:['#e8fbff','#5ab8ff',1],holy:['#fff4c0','#ffb020',.6],storm:['#e8d8ff','#7a4aff',.5],void:['#e0b0ff','#5a1a8a',.15],soul:['#c8fbff','#3ad8e8',.7]};
  // a blast is a cluster of soft puffs: a short white-hot / coloured burst that cools into rising smoke (or mist) and erodes away
  P.fireball=function(x,y,z,size,el,o){if(!this._balls)return;const p=PAL[el]||PAL.fire;o=o||{};const n=o.n||(size>70?7:5),c1=new T.Color(p[0]),c2=new T.Color(p[1]);
    for(let j=0;j<n&&FX.balls.length<this._balls.cap;j++){const a=Math.random()*6.283,d=j?size*(.25+Math.random()*.35):0;
      FX.balls.push({x:x+Math.cos(a)*d,y:y+(j?Math.random()*size*.35:0),z:z+Math.sin(a)*d,size:size*(j?.34+Math.random()*.16:.5),t:-((o.delay||0)+j*.035),
        dur:(o.dur||(el==='frost'?1.5:el==='fire'?2.3:1.7))*(.85+Math.random()*.3),seed:Math.random()*40,c1,c2,mist:p[2],rise:size*(1.1+Math.random()*.9)*(el==='fire'?1:.5)})}};
  // ---------------- distortion sources + lens pulses ----------------
  P.shockwave=function(x,z,r,str,dur){if(!this.aaa||!near(x,z,2400))return;FX.dist.push({x,y:this.gY(x,z)+4,z,r,s:str===undefined?.05:str,t:0,dur:dur||.6,type:0,seed:Math.random()*20})};
  P.heat=function(x,z,r,dur,str,id){if(!this.aaa||!near(x,z,2200))return;if(id!==undefined){const h=FX.dist.find(d=>d.id===id);if(h){h.t=Math.min(h.t,.2);h.dur=Math.max(h.dur,dur);h.x=x;h.z=z;h.r=r;return}}
    FX.dist.push({x,y:this.gY(x,z)+6,z,r,s:str||.006,t:0,dur:dur||2,type:1,seed:Math.random()*20,id})};
  P.lensKick=function(x,z,s){const d=camD(x,z);if(d>1500)return;FX.ca=Math.max(FX.ca,s*(1-d/1500))};
  // ---------------- projectile lights ----------------
  const GLOWP={1:'#ffb050',2:'#ff8a2a',3:'#9fe8ff',4:'#bff0ff',8:'#ff9a4a',10:'#c9b0ff',14:'#ff8a3a',16:'#7fe8ff'};
  P.plightInit=function(){if(this._pl||!this.hi||MOB||!on('plight'))return;this._pl=[];for(let i=0;i<3;i++){const l=new T.PointLight('#ffffff',0,430,1.2);l.castShadow=false;this.scene.add(l);this._pl.push(l)}};
  // ---------------- hooks ----------------
  const _bw=P.buildWorld;P.buildWorld=function(){FX.dist.length=0;FX.balls.length=0;this._balls=null;this._pl=null;const r=_bw.apply(this,arguments);try{this.ballInit();this.plightInit()}catch(e){console.warn('aaa init',e)}return r};
  const STY={fireball:['fire',.3,1],explosive:['fire',.38,1],fireburst:['fire',.36,1],meteor:['fire',.42,1.4],dragon:['fire',.34,1.2],iceburst:['frost',.34,.8],blizzard:['frost',.36,.9],
    judgment:['holy',.28,1.1],thunder:['storm',.3,1],stormfield:['storm',.3,.7],shadow:['void',.28,.6],veil:['void',.26,.5],elementslam:[null,.38,1.2],elementburst:[null,.36,1],duality:[null,.34,1],elementstorm:[null,.3,.8]};
  const RING={warcry:[1.6,.06],ward:[1.1,.035],royal:[1.1,.04],fissure:[1.1,.05],cyclone:[1.2,.035],spirit:[1.2,.035],lotus:[1,.03],crescent:[1.1,.03],snare:[1,.03],trap:[1,.03],chain:[1,.03],arrowrain:[1.1,.025]};
  const _pulse=P.v3Pulse;if(_pulse)P.v3Pulse=function(style,at,o,S){const r0=_pulse.apply(this,arguments);try{if(!at||(o&&o.phase==='windup')||!this.hi)return r0;
      const r=Math.max(20,S&&S.r||90),gy=this.gY(at.x,at.y),st=STY[style];
      if(st){const el=st[0]||(S&&S.el)||'fire',sz=r*st[1],big=st[2];
        if(el==='fire'||el==='frost'||el==='holy'||el==='void'||el==='soul')this.fireball(at.x,gy+sz*.35,at.y,sz,el,{n:big>=1.2?9:big>=1?7:5});
        this.shockwave(at.x,at.y,r*(1.5+.4*big),.045+.025*big,.55+.2*big);if(el==='fire')this.heat(at.x,at.y,r*.95,2.2,.007);this.lensKick(at.x,at.y,.004*big)}
      else{const q=RING[style];if(q){this.shockwave(at.x,at.y,r*q[0],q[1],.55);this.lensKick(at.x,at.y,q[1]*.06)}}}catch(e){if(!this._aaaPE){this._aaaPE=1;console.warn('aaa pulse',e)}}return r0};
  const _fl=P.flash;if(_fl)P.flash=function(x,y,z,c,I,d,Tm){const r=_fl.apply(this,arguments);try{if(I>=2200)this.lensKick(x,z,Math.min(.006,I/600000))}catch(e){}return r};
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r=_fx.call(this,Tm,dt,me,L);try{dt=Math.min(.1,dt||0);FX.t+=dt;FX.ca*=Math.exp(-dt*6);
      // distortion lifetimes; heat over burning ground and dragon breath
      for(let k=FX.dist.length-1;k>=0;k--){const d=FX.dist[k];d.t+=dt;if(d.t>=d.dur)FX.dist.splice(k,1)}
      if(this.aaa&&typeof aoes!=='undefined')for(const a of aoes){if(!(a.kind==='burn'||a.kind==='breath'))continue;if(a.t<(a.delay||0))continue;if(!near(a.x,a.y,2000))continue;
        const id='a'+(a.x|0)+'_'+(a.y|0)+'_'+a.kind;this.heat(a.x,a.y,(a.r||120)*(a.kind==='breath'?.7:1),.5,a.kind==='breath'?.009:.006,id)}
      // fireballs
      const B=this._balls;if(B){const F=FX.balls;let n=0;B.m.uniforms.uTime.value=FX.t;
        for(let k=F.length-1;k>=0;k--){const f=F[k];f.t+=dt;if(f.t>=f.dur){F.splice(k,1);continue}}
        for(const f of F){if(f.t<0)continue;const k=f.t/f.dur,s=f.size*(.35+.9*(1-Math.exp(-k*5)));
          M1.compose(V1.set(f.x,f.y,f.z),Q1.identity(),V2.set(s,s*.92,s));B.im.setMatrixAt(n,M1);B.aF.setXYZW(n,k,f.seed,f.mist,f.rise);B.c1.setXYZ(n,f.c1.r,f.c1.g,f.c1.b);B.c2.setXYZ(n,f.c2.r,f.c2.g,f.c2.b);n++}
        B.im.count=n;if(n){B.im.instanceMatrix.needsUpdate=true;B.aF.needsUpdate=B.c1.needsUpdate=B.c2.needsUpdate=true}}
      // three lights ride the brightest projectiles near the camera
      if(this._pl&&typeof projs!=='undefined'){const pick=[];for(const p of projs){if(p.dead)continue;const c=GLOWP[p.kind];if(!c||!near(p.x,p.y,1500))continue;pick.push([camD(p.x,p.y),p,c]);}
        pick.sort((a,b)=>a[0]-b[0]);for(let i=0;i<this._pl.length;i++){const l=this._pl[i],q=pick[i];if(!q){l.intensity=0;continue}const p=q[1];l.position.set(p.x,this.gY(p.x,p.y)+46,p.y);l.color.set(q[2]);l.intensity=900}}
    }catch(e){if(!this._aaaFE){this._aaaFE=1;console.warn('aaa fx',e)}}return r};
  // ---------------- hero rim light + grass that parts around characters ----------------
  const RIM={c:{value:new T.Color('#9fc8ff')},k:{value:.32}},PUSH={value:Array.from({length:8},()=>new T.Vector4(0,0,0,0))};
  const chain=(m,tag,edit)=>{const ob=m.onBeforeCompile,ck=m.customProgramCacheKey;m.onBeforeCompile=function(sh,r){if(ob)ob.call(this,sh,r);edit(sh)};m.customProgramCacheKey=()=>(ck?ck.call(m):'')+'|'+tag;return m};
  const _fow=P.fow;P.fow=function(m,o){const r=_fow.call(this,m,o);try{if(o&&o.key==='p5'&&this.hi&&on('rim')&&(m.isMeshStandardMaterial||m.isMeshPhysicalMaterial))chain(r,'rim',sh=>{sh.uniforms.uRimC=RIM.c;sh.uniforms.uRimK=RIM.k;
        sh.fragmentShader='uniform vec3 uRimC;uniform float uRimK;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n{float rim=1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.);totalEmissiveRadiance+=uRimC*(pow(rim,2.6)*uRimK);}')})}catch(e){}return r};
  const _wm=P.windMat;if(_wm)P.windMat=function(base,key,amt){const m=_wm.call(this,base,key,amt);try{if((key==='G'||key==='F'||key==='H')&&on('push'))chain(m,'push',sh=>{sh.uniforms.uPush=PUSH;
        sh.vertexShader='uniform vec4 uPush[8];\n'+sh.vertexShader.replace('#include <project_vertex>',`{vec3 bp=vec3(0.);
#ifdef USE_INSTANCING
bp=instanceMatrix[3].xyz;
#endif
float hy=max(position.y,0.);for(int i=0;i<8;i++){vec4 q=uPush[i];if(q.z<=0.)continue;vec2 d=bp.xz-q.xy;float dl=length(d),k=clamp(1.-dl/q.z,0.,1.)*q.w;if(k<=0.)continue;
  vec2 dir=d/max(dl,.001);transformed.x+=dir.x*k*hy*.9;transformed.z+=dir.y*k*hy*.9;transformed.y-=k*hy*.35;}}
#include <project_vertex>`)})}catch(e){}return m};
  const _fx2=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r=_fx2.call(this,Tm,dt,me,L);try{
      const night=typeof isNight==='function'&&isNight();RIM.c.value.set(night?'#7f9cff':'#a8ccff');RIM.k.value=night?.42:.3;
      if(typeof units!=='undefined'&&this.tx!==undefined){const P8=PUSH.value;let n=0;const list=[];for(const u of units){if(u.dead||(!u.hero&&!u.mob))continue;const d=Math.hypot(u.x-this.tx,u.y-this.ty);if(d<1300)list.push([d,u])}
        list.sort((a,b)=>a[0]-b[0]);for(const [d,u] of list){if(n>=8)break;P8[n++].set(u.x,u.y,(u.r||24)*2.4+26,u.boss?1.2:1)}for(;n<8;n++)P8[n].set(0,0,0,0)}
    }catch(e){}return r};
  // owner 2026-11-18: no short grass tufts anywhere (the camera-following tuft pool stays empty; flowers and tall hiding grass stay)
  const _ug=P.updateGround;if(_ug)P.updateGround=function(cx,cy){const r=_ug.apply(this,arguments);if(this.gGrass&&this.gGrass.count){this.gGrass.count=0;this.gGrass.instanceMatrix.needsUpdate=true}return r};
  window.ArenaAAA={FX,fireball:(...a)=>P.fireball(...a),shockwave:(...a)=>P.shockwave(...a)};
})();
