/* Arena Royale · realistic-fantasy shading (Claude, 2026-11-19 · index only). Render only.
 * The owner asked for a realistic fantasy look with more depth. Two parts:
 *  1. Rim light on every lit material (through R3.fow, so heroes, creatures, trees, rocks, houses and Meshy props alike):
 *     a fresnel edge that wraps the sun and sky colour round silhouettes, so shapes separate from the ground.
 *     Works at every quality level (no post needed).
 *  2. A depth grade pass in the high-quality post chain (after the AAA layer, before bloom), reading the scene depth:
 *     - aerial perspective: distant ground fades into a sun-tinted haze, brighter toward the sun,
 *     - valley mist that pools in low ground away from the player,
 *     - a gentle depth of field: sharp around the player, softening into the distance and on canopies right under the lens,
 *     - local contrast ("clarity") so surfaces read as carved rather than flat, and vibrance for the dull mid-tones.
 *     Without a depth texture (mobile post) only clarity and vibrance run.
 * Toggles (localStorage, default on): ar_fx_rim, ar_fx_depth, ar_fx_dof. */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined'||(typeof MOON!=='undefined'&&MOON))return;
  const P=R3,T=THREE,MOB=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const on=k=>{try{return localStorage.getItem('ar_fx_'+k)!=='0'}catch(e){return true}};
  const V1=new T.Vector3(),V2=new T.Vector3(),C1=new T.Color(),C2=new T.Color();

  // ---------------- 1. rim light ----------------
  // ARENA_SHADING.off=1 switches both parts off at run time (before/after checks)
  const SH=window.ARENA_SHADING={off:0};
  const RIM=SH.RIM={uRimDir:{value:new T.Vector3(0,1,0)},uRimCol:{value:new T.Color(0,0,0)}};
  const RIMFRAG=`
{vec3 rn=normalize(normal),rv=normalize(vViewPosition);float fr=1.-clamp(dot(rn,rv),0.,1.);fr=fr*fr*fr;
 float wrap=.35+.65*clamp(dot(rn,uRimDir)*.6+.4,0.,1.);gl_FragColor.rgb+=uRimCol*fr*wrap;}
`;
  if(on('rim')){const _fow=P.fow;P.fow=function(m,o){const r=_fow.call(this,m,o);
    if(!(m.isMeshStandardMaterial||m.isMeshLambertMaterial||m.isMeshPhongMaterial))return r;
    const ob=m.onBeforeCompile,ck=m.customProgramCacheKey;
    m.onBeforeCompile=function(sh,rd){ob.call(this,sh,rd);if(sh.fragmentShader.indexOf('vViewPosition')<0)return;
      Object.assign(sh.uniforms,RIM);const at=sh.fragmentShader.indexOf('{float fd=distance(vFowW,uFowC);');
      const fs='uniform vec3 uRimDir,uRimCol;\n'+sh.fragmentShader;const i=at<0?-1:at+'uniform vec3 uRimDir,uRimCol;\n'.length;
      sh.fragmentShader=i<0?fs.replace('#include <tonemapping_fragment>',RIMFRAG+'#include <tonemapping_fragment>'):fs.slice(0,i)+RIMFRAG+fs.slice(i)};
    m.customProgramCacheKey=()=>ck.call(m)+'rim';return r}}

  // ---------------- 2. depth grade ----------------
  const VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',CAM2=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const GFS=`precision highp float;varying vec2 vUv;
uniform sampler2D tColor,tDepth;uniform float uSplit,uHasD,uAP,uMist,uDof,uClar,uVib,uFocus,uGround,uSeed;uniform vec2 uPx;
uniform mat4 uProjInv,uCamW;uniform vec3 uCam,uSun,uSunCol,uHaze;
vec3 wpos(vec2 uv,float d){vec4 v=uProjInv*vec4(uv*2.-1.,d*2.-1.,1.);v/=v.w;return (uCamW*v).xyz;}
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
void main(){vec3 col=texture2D(tColor,vUv).rgb;float j=ign(gl_FragCoord.xy+uSeed)*6.2832;
  if(uHasD>.5){float d=texture2D(tDepth,vUv).x;bool sky=d>.99999;vec3 P=wpos(vUv,d),rd=P-uCam;float dist=sky?20000.:length(rd);rd/=max(length(rd),1e-3);
    // depth of field: far softening past the player, near softening for what crowds the lens
    float coc=clamp((dist-uFocus*1.5)/(uFocus*1.8),0.,1.)+clamp((uFocus*.36-dist)/(uFocus*.25),0.,1.);coc=min(coc,1.)*uDof;
    if(coc>.03){vec3 acc=col;float w=1.;for(int i=0;i<12;i++){float a=j+float(i)*2.39996,r=sqrt((float(i)+.5)/12.);vec2 uv=vUv+vec2(cos(a),sin(a))*r*coc*5.5*uPx;
        float ds=texture2D(tDepth,uv).x;float dd=ds>.99999?20000.:length(wpos(uv,ds)-uCam);float k=dd>dist*.85?1.:.12;acc+=texture2D(tColor,uv).rgb*k;w+=k;}col=acc/w;}
    // aerial perspective: in-scattered haze, brighter looking toward the sun
    float mu=max(dot(rd,uSun),0.);vec3 hz=uHaze+uSunCol*(pow(mu,6.)*.32+.04);
    float ap=1.-exp(-max(dist-uFocus*.9,0.)*uAP);col=mix(col,hz,ap*.72);
    // mist that pools in the low ground away from the player
    float hm=sky?0.:exp(-max(P.y-uGround,0.)/110.)*smoothstep(uFocus*.8,uFocus*2.4,dist);col=mix(col,hz*1.08,hm*uMist);}
  // clarity: local contrast against a wide blurred luminance
  float lb=0.;for(int i=0;i<8;i++){float a=j*.5+float(i)*.7854;lb+=lum(texture2D(tColor,vUv+vec2(cos(a),sin(a))*uPx*18.).rgb);}lb/=8.;
  float l=lum(col);col*=clamp(1.+uClar*(l-lb)/(lb+.12),.75,1.3);
  // vibrance: lift the dull colours, leave the saturated ones
  l=lum(col);float mx=max(col.r,max(col.g,col.b)),mn=min(col.r,min(col.g,col.b)),sat=(mx-mn)/(mx+1e-4);col=max(mix(vec3(l),col,1.+uVib*(1.-sat)*(1.-sat)),0.);
  // fantasy split light: warm gold where the light falls, cool teal in the shade
  l=lum(col);float hk=smoothstep(.04,.55,l);col*=mix(mix(vec3(1.),vec3(.9,.99,1.1),uSplit),mix(vec3(1.),vec3(1.09,1.01,.88),uSplit),hk);
  gl_FragColor=vec4(col,1.);}`;
  P.depthGradePass=function(){const self=this,tri=new T.BufferGeometry();tri.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));tri.setAttribute('uv',new T.Float32BufferAttribute([0,0,2,0,0,2],2));
    const m=new T.ShaderMaterial({uniforms:{uSplit:{value:.5},tColor:{value:null},tDepth:{value:null},uHasD:{value:0},uAP:{value:1/3800},uMist:{value:.34},uDof:{value:1},uClar:{value:.22},uVib:{value:.22},uFocus:{value:1000},uGround:{value:0},uSeed:{value:0},
        uPx:{value:new T.Vector2(1,1)},uProjInv:{value:new T.Matrix4()},uCamW:{value:new T.Matrix4()},uCam:{value:new T.Vector3()},uSun:{value:new T.Vector3(0,1,0)},uSunCol:{value:new T.Color()},uHaze:{value:new T.Color()}},
      vertexShader:VS,fragmentShader:GFS,depthTest:false,depthWrite:false});
    const quad=new T.Mesh(tri,m);quad.frustumCulled=false;const U=m.uniforms,depthOn=on('depth'),dofOn=on('dof')&&!MOB;
    return{enabled:true,needsSwap:true,clear:false,renderToScreen:false,isPass:true,mat:m,setSize(w,h){U.uPx.value.set(1/Math.max(1,w),1/Math.max(1,h))},dispose(){m.dispose();tri.dispose()},
      render(renderer,writeBuffer,readBuffer){if(SH.off){U.uHasD.value=0;U.uClar.value=0;U.uVib.value=0;U.uSplit.value=0}else{U.uClar.value=.34;U.uVib.value=.28;U.uSplit.value=.5}const cam=self.cam,dep=depthOn?self._sceneDepth:null,sun=self.sun,fog=self.scene&&self.scene.fog;
        U.tColor.value=readBuffer.texture;U.uPx.value.set(1/readBuffer.width,1/readBuffer.height);U.uHasD.value=dep&&!SH.off?1:0;U.tDepth.value=dep;
        if(dep&&cam){U.uProjInv.value.copy(cam.projectionMatrixInverse);U.uCamW.value.copy(cam.matrixWorld);U.uCam.value.setFromMatrixPosition(cam.matrixWorld);
          const px=self.tx===undefined?0:self.tx,pz=self.ty===undefined?0:self.ty,py=self.ly||0;U.uFocus.value=Math.max(300,U.uCam.value.distanceTo(V1.set(px,py,pz)));U.uGround.value=py;
          const indoor=typeof inDG==='function'&&self.tx!==undefined&&inDG({x:self.tx,y:self.ty});U.uDof.value=dofOn&&!indoor?1:0;U.uMist.value=indoor?0:.34;U.uAP.value=indoor?0:1/3800;
          if(sun){sun.getWorldPosition(V1);sun.target.getWorldPosition(V2);U.uSun.value.copy(V1).sub(V2).normalize();U.uSunCol.value.copy(sun.color).multiplyScalar(Math.min(1.4,sun.intensity*.4))}
          // haze: the fog colour, lifted toward the sky light by day
          C1.copy(fog?fog.color:C2.set('#8aa4bc'));if(self.hemi)C1.lerp(C2.copy(self.hemi.color).multiplyScalar(Math.min(1,self.hemi.intensity*.6)),.35);U.uHaze.value.copy(C1)}
        U.uSeed.value=(U.uSeed.value+17.31)%997;const ac=renderer.autoClear;renderer.autoClear=false;renderer.setRenderTarget(writeBuffer);renderer.render(quad,CAM2);renderer.autoClear=ac}}};
  // in the chain right before bloom (after the AAA composite, which keeps the scene depth in self._sceneDepth)
  const _sp=P.setupPost;P.setupPost=function(){const r=_sp.apply(this,arguments);const c=this.composer;this.dgrade=null;if(!c)return r;
    try{if(!MOB&&on('depth')&&!c.renderTarget1.depthTexture){for(const rt of[c.renderTarget1,c.renderTarget2])rt.depthTexture=new T.DepthTexture(rt.width,rt.height)}
      const rp=this.rpass,self=this;if(rp&&!rp._aaa){const rr=rp.render;rp.render=function(renderer,w,rb){self._sceneDepth=rb&&rb.depthTexture||null;return rr.apply(this,arguments)};rp._aaa=1}
      const pass=this.depthGradePass();let at=c.passes.indexOf(this.bloom);if(at<0)at=Math.max(1,c.passes.length-1);c.insertPass(pass,at);this.dgrade=pass}
    catch(e){console.warn('depth grade',e)}return r};

  // ---------------- per-frame light for the rim ----------------
  const _draw=P.draw;P.draw=function(){try{const sun=this.sun,cam=this.cam;
      if(sun&&cam){sun.getWorldPosition(V1);sun.target.getWorldPosition(V2);RIM.uRimDir.value.copy(V1).sub(V2).normalize().transformDirection(cam.matrixWorldInverse);
        // sun-coloured by day, cool sky blue at night; stronger in the moody look
        const day=Math.min(1,sun.intensity/2.4),k=(typeof moody!=='undefined'&&moody?.62:.5);
        C1.copy(sun.color).multiplyScalar(.46*day);if(this.hemi)C1.add(C2.copy(this.hemi.color).multiplyScalar(.22*Math.min(1.2,this.hemi.intensity)));RIM.uRimCol.value.copy(C1).multiplyScalar(SH.off?0:k)}}
    catch(e){if(!this._rimErr){this._rimErr=1;console.warn('rim',e)}}return _draw.apply(this,arguments)};

})();
