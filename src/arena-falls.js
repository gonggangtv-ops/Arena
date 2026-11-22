/* Arena Royale · the Old Town's waterfall (Claude, 2026-11-21 · index only). Render only.
 * Owner, round 2: the waterfall model read as a faceted blob of blue and leaves from the game's camera and made no sense. The falls
 * are now built here from world gen's shape (a.js CITY_PW / CITY_PV / CITY_PRU / CITY_PRV / CITY_FW / CITY_FB, cityPondU, cityBasin):
 *  - the spring pool on the plateau: clear water over a shelving bed, a spring welling up in its still north half, the current
 *    drawing into the channel and pulling out into long glassy streaks as it speeds up to the lip;
 *  - the curtain: a sheet falling in a parabola off the brink, glassy at the lip, breaking into white streaks that stretch as the
 *    water speeds up, ragged at the sides, dissolving into spray at the foot, with a thinner veil in front of it;
 *  - the plunge: churning white water on the line where the curtain strikes, foam lace and broken ripples spreading over the basin;
 *  - spray and mist rising and drifting from the plunge (GPU-animated billboards: no per-frame CPU work).
 * The water surfaces are the game's own materials (lit by the sun and sky, fog of war, cloud shadows, storm tint through R3.fow);
 * the rocks framing the falls are the owner's wide rock (arena-city.js). Collision, wading and the rocks' places are world gen's. */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined'||(typeof MOON!=='undefined'&&MOON))return;
  const P=R3,T=THREE;
  const warn=(k,e)=>{if(!P['_fallsE'+k]){P['_fallsE'+k]=1;console.warn('falls',k,e)}};
  const f1=x=>(+x).toFixed(2);
  const DROP=CITY_PW-WL,LAND=76,AF=LAND/Math.sqrt(DROP),W0=CITY_FW-14,W1=CITY_FW+56,IMPV=CITY_FB-LAND-4;
  // the curtain's path: depth d below the brink -> (v, height); outward normal in the (v, y) plane
  const fallV=d=>CITY_FB-AF*Math.sqrt(d),fallN=d=>{const a=AF/(2*Math.sqrt(Math.max(d,.5))),l=Math.hypot(1,a);return[-1/l,a/l]};
  const noiseTex=R=>window.ArenaVFXTex&&ArenaVFXTex.texture||R.U.detail.value;
  // shared GLSL: the town frame (world xz -> u, v) and the pool's shape (same numbers as a.js)
  const FRAME=`uniform vec4 uCF;uniform vec2 uCO;uniform sampler2D uFN;
vec2 cityUV(vec2 w){vec2 d=w-uCF.xy;return vec2(dot(d,uCF.zw),dot(d,uCO));}
float pondSD(vec2 p){float e=(length(vec2(p.x/${f1(CITY_PRU)},(p.y-${f1(CITY_PV)})/${f1(CITY_PRV)}))-1.)*${f1(CITY_PRV)};
  float ch=max(max(abs(p.x)-${f1(CITY_FW/2)},${f1(CITY_FB)}-p.y),p.y-${f1(CITY_PV)});return min(e,ch);}
`;
  const frameU=(R,C)=>({uCF:{value:new T.Vector4(C.x,C.y,C.lx,C.ly)},uCO:{value:new T.Vector2(C.ox,C.oy)},uFN:{value:noiseTex(R)},uLitK:P._fallsLit});
  P._fallsLit={value:1};
  // a water material in the game's style (the valley water's settings), patched by 'frag'
  function waterMat(R,key,o,frag,vert){
    const base=R.hi?new T.MeshStandardMaterial(Object.assign({color:'#2a6a80',roughness:.14,metalness:0,transparent:true,envMap:R.envTex,envMapIntensity:.38,depthWrite:false},o))
      :new T.MeshPhongMaterial(Object.assign({color:'#2a6a80',shininess:80,specular:'#a0c8d8',transparent:true,depthWrite:false},R.lamOpts(o)));
    return R.fow(base,{key,uniforms:frameU(R,WD.city),vert,frag:fs=>fs.replace('void main() {','uniform float uLitK;\n'+FRAME+'void main() {\n  float fallW=0.;').replace('#include <map_fragment>','#include <map_fragment>\n'+frag)
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n  roughnessFactor=mix(roughnessFactor,.82,fallW);')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n  totalEmissiveRadiance+=diffuseColor.rgb*fallW*.16*uLitK;')})}

  // ---- the spring pool and its channel: still and clear, a spring welling up, the current quickening to the brink ----
  const POND=`{vec2 p=cityUV(vFowW);float sd=pondSD(p),dp=clamp(-sd/64.,0.,1.);
  float nearB=smoothstep(${f1(CITY_FB+150)},${f1(CITY_FB+4)},p.y);
  // the current: toward the middle of the brink, quickening into the channel; a gentle outflow from the spring
  vec2 sp=p-vec2(0.,${f1(CITY_PV+45)});float sr=length(sp);
  vec2 fl=normalize(vec2(-p.x*.7,${f1(CITY_FB-30)}-p.y))*mix(7.,62.,nearB)+sp/max(sr,1.)*14.*exp(-sr/90.);
  float ph=fract(uTime*.22),w0=1.-abs(1.-2.*ph);vec2 b=p/170.;
  float n=texture2D(uFN,b-fl*ph*4.5/170.).r*w0+texture2D(uFN,b*1.13-fl*fract(ph+.5)*4.5/170.+.5).r*(1.-w0);
  float n2=texture2D(uFN,p/61.-fl*ph*4.5/61.+.21).a*w0+texture2D(uFN,p/61.-fl*fract(ph+.5)*4.5/61.+.71).a*(1.-w0);
  vec3 c=mix(vec3(.11,.25,.22),vec3(.018,.07,.095),smoothstep(.0,.75,dp));
  c+=vec3(.36,.46,.46)*smoothstep(.58,.86,n*.6+n2*.4)*(.06+.22*nearB);                                 // drifting streaks
  float rg=sin(sr*.24-uTime*2.1+n2*5.);c+=vec3(.26,.36,.38)*pow(max(rg,0.),5.)*exp(-sr/38.)*.45;      // the spring welling up
  // the channel: the water draws out into long glassy streaks as it speeds up to the brink, a bright lip right at the edge
  float ch=smoothstep(${f1(CITY_FB+110)},${f1(CITY_FB+8)},p.y)*(1.-smoothstep(${f1(CITY_FW/2-30)},${f1(CITY_FW/2+4)},abs(p.x)));
  float spd=mix(30.,95.,smoothstep(${f1(CITY_FB+110)},${f1(CITY_FB)},p.y));
  float sk=texture2D(uFN,vec2(p.x/26.,p.y/150.+uTime*spd/150.)).b*.6+texture2D(uFN,vec2(p.x/11.+.3,p.y/90.+uTime*spd/90.)).r*.4;
  c=mix(c,vec3(.03,.1,.12)+vec3(.5,.6,.62)*pow(smoothstep(.45,.95,sk),2.),ch*.85);
  float lip=smoothstep(${f1(CITY_FB+9)},${f1(CITY_FB+1)},p.y)*ch;
  float shore=1.-smoothstep(0.,10.,-sd);
  c=mix(c,vec3(.8,.88,.9),clamp(lip*smoothstep(.35,.85,sk)*.55+shore*.32*(.4+.6*n),0.,1.));
  fallW=lip*.5;diffuseColor.rgb=c;diffuseColor.a=mix(.4,.93,smoothstep(.0,.5,dp))*(1.-smoothstep(-6.,2.,sd));diffuseColor.a=max(diffuseColor.a,ch*.9*step(sd,0.));}`;
  function pondMesh(R,C){const pos=[],uv=[],idx=[],St=10,u0=-CITY_PRU-24,u1=CITY_PRU+24,v0=CITY_FB,v1=CITY_PV+CITY_PRV+24,nu=Math.ceil((u1-u0)/St),nv=Math.ceil((v1-v0)/St),id=new Int32Array((nu+1)*(nv+1)).fill(-1);
    const vert=(i,j)=>{const k=j*(nu+1)+i;if(id[k]<0){const u=u0+i*(u1-u0)/nu,v=v0+j*(v1-v0)/nv,q=cityXY(C,u,v);id[k]=pos.length/3;pos.push(q.x,CITY_PW,q.y);uv.push(q.x/WORLD,q.y/WORLD)}return id[k]};
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){let wet=false;for(const [a,b] of[[0,0],[1,0],[0,1],[1,1],[.5,.5]])if(cityPondU(u0+(i+a)*(u1-u0)/nu,v0+(j+b)*(v1-v0)/nv)<9)wet=true;if(!wet)continue;
      const a=vert(i,j),b=vert(i+1,j),c=vert(i,j+1),d=vert(i+1,j+1);idx.push(a,b,c,b,d,c)}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    const n=g.attributes.normal;for(let i=0;i<n.count;i++)n.setXYZ(i,0,1,0);
    const m=waterMat(R,'cpond',R.waterN?{normalMap:R.waterN,normalScale:new T.Vector2(.32,.32)}:{},POND);
    const me=new T.Mesh(g,m);me.renderOrder=2;me.receiveShadow=true;me.userData.ownMat=1;return me}

  // ---- the curtain: two sheets (the fall, a veil in front), aF = (across -1..1, depth below the brink, layer) ----
  const CURT=`{float s=vFall.x,d=vFall.y,L=vFall.z,t=d/${f1(DROP)},tt=sqrt(d);float wd=mix(${f1(W0)},${f1(W1)},t);
  vec2 q=vec2(s*wd*.5/58.+L*.37,tt*.23-uTime*(.66+L*.14));
  float n1=texture2D(uFN,q*vec2(1.,.5)).r,n2=texture2D(uFN,q*vec2(2.6,1.)+vec2(.21,-uTime*.21)).a,n3=texture2D(uFN,q*vec2(5.4,1.7)+vec2(.63,.1)).r;
  float st=n1*.5+n2*.32+n3*.18,vn=texture2D(uFN,q*vec2(4.2,.16)+vec2(.11,-uTime*.1)).b;
  float aer=smoothstep(.0,.05,t+(st-.5)*.06);
  vec3 glass=vec3(.06,.16,.18)+vec3(.5,.6,.62)*pow(smoothstep(.45,.95,vn*.55+st*.45),2.);
  vec3 foam=mix(vec3(.34,.43,.48),vec3(.87,.93,.96),smoothstep(.24,.7,st))*(.76+.4*vn);
  vec3 c=mix(glass,foam,aer);
  float a=mix(.9,.5+.46*smoothstep(.2,.62,st),aer);
  a*=smoothstep(1.02,.56,abs(s)+(n2-.5)*.5+(n3-.5)*.25);
  a*=1.-smoothstep(.8,1.,t+(n1-.5)*.22);
  if(L>.5){a*=.38*smoothstep(.05,.2,t);c=mix(c,vec3(.93,.97,1.),.55);}
  fallW=aer;diffuseColor.rgb=c;diffuseColor.a=a;}`;
  function curtainMesh(R,C){const NU=26,NV=30,pos=[],att=[],idx=[];
    for(let L=0;L<2;L++){const o0=pos.length/3;
      for(let j=0;j<=NV;j++){const t=j/NV,d=DROP*Math.pow(t,1.55)+.001,v=fallV(d),y=CITY_PW-d,nm=fallN(d),off=L?6+5*t:0,wd=W0+(W1-W0)*t;
        for(let i=0;i<=NU;i++){const s=-1+2*i/NU,q=cityXY(C,s*wd/2,v+nm[0]*off);pos.push(q.x,y+nm[1]*off,q.y);att.push(s,d,L)}}
      for(let j=0;j<NV;j++)for(let i=0;i<NU;i++){const a=o0+j*(NU+1)+i,b=a+1,c=a+NU+1,e=c+1;idx.push(a,c,b,b,c,e)}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('aF',new T.Float32BufferAttribute(att,3));g.setIndex(idx);g.computeVertexNormals();
    const m=waterMat(R,'cfall',{side:T.DoubleSide,color:'#ffffff'},CURT,vs=>'attribute vec3 aF;varying vec3 vFall;\n'+vs.replace('#include <begin_vertex>','#include <begin_vertex>\n  vFall=aF;'));
    const fs0=m.onBeforeCompile;m.onBeforeCompile=function(sh,rd){fs0.call(this,sh,rd);sh.fragmentShader='varying vec3 vFall;\n'+sh.fragmentShader};
    const me=new T.Mesh(g,m);me.renderOrder=3;me.receiveShadow=true;me.userData.ownMat=1;return me}

  // ---- the plunge: white water on the strike line, foam lace and rings running out over the basin (aW: on water 0..1) ----
  const FOAM=`{vec2 p=cityUV(vFowW);vec2 rel=vec2(p.x*.55,p.y-(${f1(IMPV)}));float r=length(rel);vec2 dir=rel/max(r,1.);
  float strike=exp(-pow((p.y-(${f1(IMPV)}))/16.,2.))*(1.-smoothstep(${f1(W1/2-30)},${f1(W1/2+24)},abs(p.x)));
  vec2 fl=dir*mix(46.,10.,smoothstep(0.,150.,r));float ph=fract(uTime*.31),w0=1.-abs(1.-2.*ph);
  vec2 b=p/95.;float lace=texture2D(uFN,b-fl*ph*3.2/95.).g*w0+texture2D(uFN,b*1.21-fl*fract(ph+.5)*3.2/95.+.37).g*(1.-w0);
  float n=texture2D(uFN,p/70.-fl*ph*3.2/70.).r*w0+texture2D(uFN,p/70.-fl*fract(ph+.5)*3.2/70.+.5).r*(1.-w0);
  float near=1.-smoothstep(30.,175.,r);
  float f=strike*(.75+.45*n)+(1.-smoothstep(.015,.075,lace))*near*(.35+.5*n)+smoothstep(.55,.8,n)*near*.35;
  float rg=pow(max(0.,sin(r*.12-uTime*2.5+n*6.)),8.)*(1.-smoothstep(50.,200.,r))*.14;
  fallW=1.;diffuseColor.rgb=vec3(.85,.91,.94);diffuseColor.a=clamp(f+rg,0.,1.)*.92*vFoamW;}`;
  function foamMesh(R,C){const pos=[],aw=[],idx=[],St=12,u0=-W1/2-110,u1=W1/2+110,v0=IMPV-130,v1=CITY_FB-20,nu=Math.ceil((u1-u0)/St),nv=Math.ceil((v1-v0)/St);
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const u=u0+i*(u1-u0)/nu,v=v0+j*(v1-v0)/nv,q=cityXY(C,u,v),h=heightAt(q.x,q.y);pos.push(q.x,WL+.9,q.y);aw.push(clamp((WL-.5-h)/3,0,1))}
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,e=c+1;if(aw[a]+aw[b]+aw[c]+aw[e]<=0)continue;idx.push(a,b,c,b,e,c)}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('aW',new T.Float32BufferAttribute(aw,1));g.setIndex(idx);g.computeVertexNormals();
    const n=g.attributes.normal;for(let i=0;i<n.count;i++)n.setXYZ(i,0,1,0);
    const m=waterMat(R,'cfoam',{color:'#ffffff',roughness:.7,envMapIntensity:.15,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4},FOAM,vs=>'attribute float aW;varying float vFoamW;\n'+vs.replace('#include <begin_vertex>','#include <begin_vertex>\n  vFoamW=aW;'));
    const fs0=m.onBeforeCompile;m.onBeforeCompile=function(sh,rd){fs0.call(this,sh,rd);sh.fragmentShader='varying float vFoamW;\n'+sh.fragmentShader};
    const me=new T.Mesh(g,m);me.renderOrder=4;me.receiveShadow=true;me.userData.ownMat=1;return me}

  // ---- spray and mist: aS = (across -1..1, phase, size, kind: 0 mist, 1 droplets thrown up and falling back) ----
  function mistMesh(R,C){const lo=!R.hi,NM=lo?22:44,ND=lo?14:30,N=NM+ND,base=new T.PlaneGeometry(1,1),g=new T.InstancedBufferGeometry();
    g.index=base.index;g.setAttribute('position',base.attributes.position);g.setAttribute('uv',base.attributes.uv);
    const a=new Float32Array(N*4);let s=0x5eed1;const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff};
    for(let i=0;i<N;i++){const k=i<NM?0:1;a[i*4]=rnd()*2-1;a[i*4+1]=rnd();a[i*4+2]=k?.8+rnd()*.5:.75+rnd()*.55;a[i*4+3]=k}
    g.setAttribute('aS',new T.InstancedBufferAttribute(a,4));g.instanceCount=N;
    const U=Object.assign(T.UniformsUtils.clone(T.UniformsLib.fog),frameU(R,C),{uTime:R.U.time,uLit:{value:new T.Color(1,1,1)},uFowC:R.U.fowC,uFowR:R.U.fowR,uK:{value:new T.Vector3(W1,IMPV,WL)}});
    const m=new T.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,fog:true,
      vertexShader:`attribute vec4 aS;uniform float uTime;uniform vec4 uCF;uniform vec2 uCO;uniform vec3 uK;varying vec2 vUv;varying float vA,vK,vS;varying vec2 vW;
#include <fog_pars_vertex>
void main(){float k=aS.w,sd=aS.y,life=k<.5?mix(3.4,5.6,fract(sd*7.31)):mix(.9,1.5,fract(sd*5.17)),age=fract(uTime/life+sd),u,v,y,sz,a;
 if(k<.5){u=aS.x*uK.x*.5*(.72+.6*age);v=uK.y+6.-age*(22.+44.*fract(sd*3.7));y=uK.z+5.+age*(48.+84.*fract(sd*9.1));sz=mix(34.,150.,sqrt(age))*aS.z;
   a=smoothstep(0.,.16,age)*(1.-smoothstep(.42,1.,age))*.26;}
 else{float tt=age*life,vy=95.+75.*fract(sd*4.3),vo=26.+46.*fract(sd*6.7);u=aS.x*uK.x*.48+(fract(sd*2.9)-.5)*34.*tt;v=uK.y-vo*tt;y=uK.z+3.+vy*tt-165.*tt*tt;
   sz=(9.+11.*fract(sd*8.3))*aS.z;a=(1.-smoothstep(.62,1.,age))*.55*step(uK.z+1.,y);y=max(y,uK.z);}
 vec3 c=vec3(uCF.x+u*uCF.z+v*uCO.x,y,uCF.y+u*uCF.w+v*uCO.y);vW=c.xz;vA=a;vK=k;vS=sd;vUv=uv;
 vec4 mvPosition=viewMatrix*vec4(c,1.);mvPosition.xy+=position.xy*sz;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
      fragmentShader:`uniform sampler2D uFN;uniform vec3 uLit;uniform vec2 uFowC;uniform float uFowR;uniform float uTime;varying vec2 vUv;varying float vA,vK,vS;varying vec2 vW;
#include <fog_pars_fragment>
void main(){vec2 q=vUv*2.-1.;float r=length(q);if(r>1.)discard;float a;vec3 col;
 if(vK<.5){float n=texture2D(uFN,vUv*.55+vec2(vS*3.1,vS*1.7-uTime*.03)).r;a=vA*pow(1.-r,1.5)*(.35+.9*n);col=vec3(.86,.92,.98);}
 else{a=vA*(1.-smoothstep(.25,1.,r));col=vec3(.95,.98,1.);}
 a*=1.-smoothstep(uFowR*.85,uFowR*1.05,distance(vW,uFowC));if(a<.004)discard;
 gl_FragColor=vec4(col*uLit,a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
}`});
    const me=new T.Mesh(g,m);me.frustumCulled=false;me.renderOrder=5;me.userData.ownMat=1;me.userData.fallsMist=U;return me}

  P.buildFalls=function(){const C=WD&&WD.city;this.fallsMist=null;if(!C||typeof cityPondU!=='function')return;
    for(const [k,f] of[['pond',pondMesh],['curtain',curtainMesh],['foam',foamMesh],['mist',mistMesh]]){try{const m=f(this,C);this.scene.add(m);if(k==='mist')this.fallsMist=m.userData.fallsMist}catch(e){warn(k,e)}}};
  // built with the town's props
  const _bp=P.buildProps;P.buildProps=function(){const r=_bp.apply(this,arguments);try{this.buildFalls()}catch(e){warn('build',e)}return r};
  // the spray takes the scene's light (day / night / dusk), the white water glows a little less at night
  const _fx=P.fxExtra;P.fxExtra=function(){const r=_fx.apply(this,arguments);try{const U=this.fallsMist;if(U&&this.hemi&&this.sun){const h=this.hemi,s=this.sun,c=U.uLit.value;
      c.setRGB(h.color.r*h.intensity*.55+s.color.r*s.intensity*.16,h.color.g*h.intensity*.55+s.color.g*s.intensity*.16,h.color.b*h.intensity*.55+s.color.b*s.intensity*.16);
      P._fallsLit.value=Math.min(1,(c.r+c.g+c.b)/3)}}catch(e){warn('fx',e)}return r};
})();
