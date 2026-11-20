/* Arena Royale · realistic ice (Claude, 2026-11-20 · index only). Render only: combat is read, never written.
 * The owner wanted the frost kit to look like real ice: ice shards falling out of the sky, and anyone caught frozen solid
 * in a coat of ice. Everything shares one ice material:
 *  - ICE: MeshPhysicalMaterial. On high quality it uses real transmission, so the ground behind a shard and the body inside a
 *    frozen unit are refracted through it (reflections from the scene's env map, ior 1.31, blue absorption with thickness).
 *    Faceted flat shading; the shared noise texture adds fracture planes at two depths (they slide against each other as the
 *    view moves), trapped air, a milky core, white hoarfrost on edges and upward faces, and glints.
 *    Low quality and phones: the same look without the refraction pass (alpha blended).
 *  - STORM ('blizz' areas: the frost R and the fused frost fields): spear-like shards fall from the sky at an angle with the
 *    wind, stab into the ground or burst into tumbling chunks; frost creeps over the ground; when the field ends ('shatter')
 *    every shard still standing bursts with it.
 *  - FROZEN: the 'freeze' event (the field's closing stun) encases the unit. An ice crust grows from the feet up over its own
 *    mesh (a twin of every body part on the same skeleton, pushed out along the normals), crystals burst from the ground
 *    around it, icicles hang off it, the pose stops. When the stun ends it cracks and shatters. Lighter frost while slowed
 *    (patchy, building up inside a storm) or rooted by the frost nova (legs frozen to the ground). The nova's cone spikes
 *    become real crystals, and its root no longer shows the green vine snare.
 * localStorage ar_fx_ice='0' turns the module off. */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined'||(typeof MOON!=='undefined'&&MOON)||!window.ArenaVFXTex||!window.VFXN_GLSL)return;
  try{if(localStorage.getItem('ar_fx_ice')==='0')return}catch(e){}
  const P=R3,T=THREE,TAU=Math.PI*2;
  let seed=0x2545f491;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};
  const rr=(a,b)=>a+(b-a)*rnd(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),fin=(v,d)=>Number.isFinite(v)?v:d;
  const eob=x=>{x=clamp(x,0,1);const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};   // ease-out-back: crystals snap into place
  const near=(x,y,pad)=>{const L=typeof listener==='function'?listener():null,reach=typeof visionR==='function'?visionR():1100;return !L||Math.hypot(x-L.x,y-L.y)<reach+(pad||200)};
  const warn=(R,k,e)=>{if(!R['_iceE'+k]){R['_iceE'+k]=1;console.warn('ice vfx',k,e)}};
  const mode=R=>{const high=!!R.hi&&!R.mobile,reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;return{high,reduced,key:(high?'h':'l')+(reduced?'r':'')}};
  const NXU=()=>ArenaVFXTex.uniforms();
  const UP=new T.Vector3(0,1,0),V1=new T.Vector3(),S1=new T.Vector3(),Q2=new T.Quaternion(),M1=new T.Matrix4(),C1=new T.Color(),C2=new T.Color();

  // ---------------- shapes (unit size, axis +Y from the base at 0 to the tip at 1) ----------------
  const _a=new T.Vector3(),_b=new T.Vector3(),_c=new T.Vector3(),_n=new T.Vector3(),_m=new T.Vector3();
  function solid(pos,idx,cy){for(let i=0;i<idx.length;i+=3){_a.fromArray(pos,idx[i]*3);_b.fromArray(pos,idx[i+1]*3);_c.fromArray(pos,idx[i+2]*3);
      _n.subVectors(_b,_a).cross(_m.subVectors(_c,_a));_m.copy(_a).add(_b).add(_c).multiplyScalar(1/3);_m.y-=cy;if(_n.dot(_m)<0){const t=idx[i+1];idx[i+1]=idx[i+2];idx[i+2]=t}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();return g}
  // a faceted column: rings of [height, radius] from the base up, closed by a tip and a (broken) base point
  function column(sides,rings,tip,base,jit,twist){const pos=[],idx=[],ang=[],o=rnd()*TAU;
    for(let i=0;i<sides;i++)ang.push(o+(i+(rnd()-.5)*.4)/sides*TAU);
    for(const [y,r] of rings){const tw=(rnd()-.5)*twist;for(let i=0;i<sides;i++){const rad=r*(1+(rnd()-.5)*jit),an=ang[i]+tw;pos.push(Math.cos(an)*rad,y,Math.sin(an)*rad)}}
    const K=rings.length,ti=K*sides,bi=ti+1;pos.push(tip[0],tip[1],tip[2],base[0],base[1],base[2]);
    for(let k=0;k<K-1;k++)for(let i=0;i<sides;i++){const j=(i+1)%sides,p=k*sides;idx.push(p+i,p+j,p+sides+j,p+i,p+sides+j,p+sides+i)}
    for(let i=0;i<sides;i++){const j=(i+1)%sides;idx.push((K-1)*sides+i,(K-1)*sides+j,ti,i,j,bi)}
    return solid(pos,idx,(rings[0][0]+tip[1])*.5)}
  // falling shard: an icicle-like spear, sharp tip, chipped base; crystal: a six-sided column with a pointed end; chunk: a broken fragment
  const shardShape=()=>column(rnd()<.5?5:6,[[0,1],[.3,rr(.86,.95)],[.62,rr(.6,.7)],[.84,rr(.3,.38)]],[rr(-.05,.05),1,rr(-.05,.05)],[rr(-.25,.25),-rr(.1,.28),rr(-.25,.25)],.28,.35);
  const crystalShape=()=>column(6,[[0,1],[.06,rr(1,1.06)],[.72,rr(.9,1.04)]],[rr(-.1,.1),1,rr(-.1,.1)],[0,-.03,0],.16,.06);
  const chunkShape=()=>{const g=column(rnd()<.5?4:5,[[0,rr(.75,1)],[rr(.35,.6),rr(.9,1.15)]],[rr(-.3,.3),rr(.95,1.2),rr(-.3,.3)],[rr(-.3,.3),-rr(.3,.6),rr(-.3,.3)],.5,.7);g.translate(0,-.35,0);return g};

  // ---------------- the ice material ----------------
  const VDECL=`varying vec3 vIP;varying vec4 vIA;varying float vIH;varying vec3 vIW;
#ifdef ICE_INST
attribute vec4 aIce;
#endif
#ifdef ICE_SHELL
uniform sampler2D vxN;uniform vec4 uIceA,uIceS,uIceM;
#endif
`;
  // after skinning (object space): pattern coordinates that stick to the object, the shell's coverage and crust
  const VMAIN=`{
#ifdef ICE_INST
  vIA=aIce;vIH=1.0;
  vIP=position*vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz))+aIce.x*vec3(91.0,57.0,23.0);
#endif
#ifdef ICE_SHELL
  vIA=uIceA;
  #ifdef USE_SKINNING
  float iK=length((modelMatrix*skinMatrix*vec4(1.0,0.0,0.0,0.0)).xyz);
  #else
  float iK=length(modelMatrix[0].xyz);
  #endif
  vec3 iPB=position*iK;vIP=iPB+uIceA.x*vec3(91.0,57.0,23.0);
  float iWY=(modelMatrix*vec4(transformed,1.0)).y;
  float iHk=clamp((iWY-uIceS.z)/max(uIceS.w,1.0),0.0,1.0);
  float iN=texture2D(vxN,iPB.xz*.0105+vec2(iPB.y*.0071)+uIceA.xx).r;
  float iN2=texture2D(vxN,iPB.zy*.0123+vec2(.31)+uIceA.xx).a;
  float iM=uIceS.x*1.3-iHk*uIceM.x+(iN-.5)*uIceM.y+(iN2-.5)*.3;
  vIH=iM;
  float iL=length(objectNormal);
  if(iL>1e-5)transformed+=objectNormal/iL*(uIceS.y*smoothstep(0.0,.3,iM)*(.7+.6*iN2))/max(length(modelMatrix[0].xyz),1e-5);
#endif
  vec4 iW4=vec4(transformed,1.0);
#ifdef USE_INSTANCING
  iW4=instanceMatrix*iW4;
#endif
  vIW=(modelMatrix*iW4).xyz;
}
`;
  const FDECL=`varying vec3 vIP;varying vec4 vIA;varying float vIH;varying vec3 vIW;uniform float uIceGlint,uIceLit;
#ifdef ICE_SHELL
uniform vec4 uIceM;
#endif
${window.VFXN_GLSL}
vec4 iTri(vec3 s,vec3 w){return texture2D(vxN,s.yz)*w.x+texture2D(vxN,s.zx+vec2(.37,.11))*w.y+texture2D(vxN,s.xy+vec2(.71,.53))*w.z;}
`;
  // right after the base colour: every ice feature, as colour (white), transmission (how clear) and emission (glints)
  const FCOL=`
float iTr=1.0,iTh=1.0;vec3 iEm=vec3(0.0),iBump=vec3(0.0);
{
  vec3 iV=normalize(cameraPosition-vIW);
  vec3 iFv=normalize(cross(dFdx(vViewPosition),dFdy(vViewPosition)));
  vec3 iN=normalize((vec4(iFv,0.0)*viewMatrix).xyz);
  float iFr=pow(1.0-clamp(abs(dot(iN,iV)),0.0,1.0),3.0);
  vec3 bw=pow(abs(iN),vec3(3.0));bw/=(bw.x+bw.y+bw.z+1e-4);
  vec4 nS=iTri(vIP*.0105,bw);                          // surface
  vec4 nD=iTri((vIP-iV*16.0)*.0105+vec3(.5),bw);       // 16 units inside: it slides against the surface as the view moves
  vec4 nF=iTri(vIP*.034,bw);                           // fine grain
  iTh=.55+.9*nD.r;
  iBump=(vec3(nS.r,nS.a,nF.r)-.5)*ICE_BUMP;
  // melting / crumbling: burn-away with a white frosty band at the edge
  float dv=vIA.z*1.15,dn=nS.r*.7+nF.a*.3;
  if(vIA.z>.001&&dn<dv)discard;
  float dEdge=vIA.z>.001?1.0-smoothstep(0.0,.07,dn-dv):0.0;
  float cEdge=0.0,cFl=0.0;
#ifdef ICE_SHELL
  if(vIH<0.0)discard;
  cEdge=1.0-smoothstep(0.0,.09,vIH);                 // the creeping front of the crust: thin, white
  cFl=uIceM.z;                                        // about to break: the fractures light up
#endif
#ifdef ICE_SHELL
  float crack=(1.0-smoothstep(.012,.045+cFl*.05,nS.g))*(.5+cFl*.9);
  float crackD=(1.0-smoothstep(.02,.07,nD.g))*.3;
  float core=(1.0-iFr)*smoothstep(.55,.9,nD.r)*.15;
#else
  float crack=(1.0-smoothstep(.015,.06,nS.g))*.8;
  float crackD=(1.0-smoothstep(.02,.08,nD.g))*.55;
  float core=(1.0-iFr)*smoothstep(.4,.8,nD.r)*.5;
#endif
  float bub=smoothstep(.84,.94,nD.g)*smoothstep(.45,.7,nD.a);
  float up=clamp(iN.y,0.0,1.0);
  float frost=clamp(vIA.y*(.5+.65*up)+(nF.r-.5)*.9*vIA.y+cEdge*.95+dEdge,0.0,1.0);
  frost=smoothstep(.22,.78,frost);
  float white=clamp(max(max(crack,crackD),max(bub,core))*.75+frost,0.0,1.0);
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.92,.96,1.0),white);
  iTr=1.0-clamp(white*.88+frost*.1,0.0,.94);
  float iGl=pow(clamp((nF.b-.74)*4.0,0.0,1.0),3.0)*step(.58,fract(dot(floor(vIP*.55),vec3(.13,.71,.37))+vxT*.33+dot(iV,vec3(1.7,2.3,1.1))));
  iEm=vec3(.85,.95,1.0)*iGl*(1.2+frost)*uIceGlint+vec3(.3,.66,1.0)*vIA.w*(.3+.7*(1.0-iFr))+vec3(.5,.78,1.0)*iFr*.34+vec3(.9,.97,1.0)*crack*cFl*1.4+vec3(.16,.4,.62)*uIceLit*(.22+.5*(1.0-iFr))*(1.0-white*.6)*ICE_SCAT;
#ifdef ICE_LOW
  float wl=clamp(white*.55+iFr*.4,0.0,1.0);                  // no refraction pass: a bluer glassy body instead
  diffuseColor.rgb=mix(vec3(.34,.64,.9),vec3(.9,.96,1.0),wl);
  diffuseColor.a=clamp(.32+white*.38+iFr*.4,0.0,1.0)*opacity;
#endif
}
`;
  const TRANS=String(T.ShaderChunk.transmission_fragment||'').replace('material.transmission = transmission;','material.transmission = transmission*iTr;').replace('material.thickness = thickness;','material.thickness = thickness*iTh;');
  // tr: real refraction (high quality only). Shells switch it per state with setTrans (slow frost does not need it)
  function iceMat(kind,tr,U,GL,LIT){const shell=kind==='shell';
    const m=new T.MeshPhysicalMaterial({color:0xeef7ff,roughness:shell?.18:.14,metalness:0,ior:1.31,transmission:tr?1:0,thickness:shell?22:30,
      attenuationColor:new T.Color(shell?'#5fb2ec':'#86ccf2'),attenuationDistance:tr?(shell?110:110):Infinity,specularIntensity:1,envMap:P.envTex||null,envMapIntensity:1.2,
      flatShading:true,transparent:!tr,opacity:1,depthWrite:true});
    const NU=NXU();m.name='arena-ice-'+kind;
    m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,NU,{uIceGlint:GL,uIceLit:LIT},U||{});
      const D=(shell?'#define ICE_SHELL\n#define ICE_BUMP .22\n#define ICE_SCAT .45\n':'#define ICE_INST\n#define ICE_BUMP .22\n#define ICE_SCAT 1.0\n')+(m.transmission>0?'':'#define ICE_LOW\n');
      sh.vertexShader=D+VDECL+sh.vertexShader.replace('#include <displacementmap_vertex>',VMAIN+'#include <displacementmap_vertex>');
      sh.fragmentShader=D+FDECL+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+FCOL)
        .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.6,clamp(1.0-iTr,0.0,1.0));')
        .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+iBump);')
        .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=iEm;')
        .replace('#include <transmission_fragment>',TRANS)
        .replace('#include <opaque_fragment>','outgoingLight=min(outgoingLight,vec3(2.2));if(any(isnan(outgoingLight)))outgoingLight=vec3(0.0);\n#include <opaque_fragment>')};
    m.customProgramCacheKey=()=>'arIce2'+kind+(m.transmission>0?'t':'o');return m}
  function setTrans(m,on){if(!m||(m.transmission>0)===on)return;m.transmission=on?1:0;m.transparent=!on;m.attenuationDistance=on?110:Infinity;m.needsUpdate=true}

  // ---------------- frost on the ground (terrain-hugging discs) ----------------
  const DR=10,DS=40;let DIDX=null;
  const DV=`varying vec2 vL;varying vec3 vW;void main(){vL=uv;vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
  const DF=`${window.VFXN_GLSL}
varying vec2 vL;varying vec3 vW;uniform vec4 uF;uniform vec3 uLit;
void main(){float d=length(vL);vec2 q=vW.xz*.0085+uF.ww;
  float fb=texture2D(vxN,q*.6).r,rid=texture2D(vxN,q*1.7+.3).b,cel=texture2D(vxN,q*2.6+.6).g,fine=texture2D(vxN,q*7.0).a;
  float front=uF.x*1.15-d+(fb-.5)*.45;float m=smoothstep(0.0,.12,front);        // frost spreads out from the middle with a ragged front
  m*=1.0-smoothstep(0.0,.3,uF.z*1.35-(fb*.6+fine*.4));                        // thawing: patches go first
  float feather=smoothstep(.55,.95,rid),walls=1.0-smoothstep(0.0,.07,cel);     // feathery frost ferns, crystal boundaries
  float rime=clamp(feather*.85+walls*.45+fine*.15,0.0,1.0);
  float edge=(1.0-smoothstep(0.0,.1,front))*step(.001,front);
  vec3 col=mix(vec3(.6,.79,.93),vec3(.96,.99,1.0),rime)*uLit;
  float a=m*uF.y*(.1+.75*rime+edge*.25)*(1.0-smoothstep(.86,1.0,d));
  float g=pow(clamp((fine-.8)*5.0,0.0,1.0),2.0)*step(.6,fract(dot(floor(vW.xz*.35),vec2(.13,.71))+vxT*.4));
  gl_FragColor=vec4(col*a+vec3(.8,.92,1.0)*g*a*.9,a);}`;
  function decalSlot(R){if(!DIDX){DIDX=[];for(let j=0;j<DS;j++)DIDX.push(0,1+(j+1)%DS,1+j);
      for(let i=0;i<DR-1;i++)for(let j=0;j<DS;j++){const j2=(j+1)%DS,p=1+i*DS,q=1+(i+1)*DS;DIDX.push(p+j,p+j2,q+j2,p+j,q+j2,q+j)}}
    const n=1+DR*DS,g=new T.BufferGeometry(),uv=new Float32Array(n*2);g.setAttribute('position',new T.BufferAttribute(new Float32Array(n*3),3));
    for(let i=0;i<DR;i++)for(let j=0;j<DS;j++){const an=j/DS*TAU,r=(i+1)/DR,k=1+i*DS+j;uv[k*2]=Math.cos(an)*r;uv[k*2+1]=Math.sin(an)*r}
    g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(DIDX);
    const U={uF:{value:new T.Vector4()},uLit:{value:new T.Color(1,1,1)}};
    const m=new T.ShaderMaterial({uniforms:Object.assign({},NXU(),U),vertexShader:DV,fragmentShader:DF,transparent:true,depthWrite:false,side:T.DoubleSide,
      blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
    const mesh=new T.Mesh(g,m);mesh.frustumCulled=false;mesh.visible=false;mesh.renderOrder=1;mesh.raycast=()=>{};R.scene.add(mesh);
    return{mesh,g,m,U,on:false,t:0}}
  function frostDecal(R,a,x,z,r,o){let d=a.decals.find(s=>!s.on);if(!d)d=a.decals.reduce((m,s)=>s.t>m.t?s:m);
    const pos=d.g.attributes.position.array;pos[0]=x;pos[1]=R.gY(x,z)+1.8;pos[2]=z;
    for(let i=0;i<DR;i++)for(let j=0;j<DS;j++){const an=j/DS*TAU,rad=r*(i+1)/DR,k=(1+i*DS+j)*3,px=x+Math.cos(an)*rad,pz=z+Math.sin(an)*rad;pos[k]=px;pos[k+1]=R.gY(px,pz)+1.8;pos[k+2]=pz}
    d.g.attributes.position.needsUpdate=true;
    Object.assign(d,{on:true,t:0,grow:o.grow||1,alpha:o.alpha||1,hold:true,melt:0,meltDelay:0,meltDur:o.meltDur||1.8,seed:rnd()*7});d.mesh.visible=true;return d}
  function release(d,delay,dur){if(!d)return;d.hold=false;d.meltDelay=delay||0;if(dur)d.meltDur=dur}

  // ---------------- instanced pools ----------------
  function pool(R,geo,mat,cap){const im=new T.InstancedMesh(geo,mat,cap);im.count=0;im.visible=false;im.frustumCulled=false;im.castShadow=im.receiveShadow=false;im.renderOrder=2;
    im.instanceMatrix.setUsage(T.DynamicDrawUsage);const at=new T.InstancedBufferAttribute(new Float32Array(cap*4),4);at.setUsage(T.DynamicDrawUsage);geo.setAttribute('aIce',at);
    im.raycast=()=>{};im.name='arena-ice';R.scene.add(im);return{im,at,cap,n:0,geo}}
  function put(p,x,y,z,q,sx,sy,sz,a0,a1,a2,a3){if(p.n>=p.cap||!(sy>.01))return;V1.set(x,y,z);S1.set(sx,sy,sz);M1.compose(V1,q,S1);p.im.setMatrixAt(p.n,M1);p.at.setXYZW(p.n,a0,a1,a2,a3);p.n++}
  function flush(p){p.im.count=p.n;p.im.visible=p.n>0;if(p.n){p.im.instanceMatrix.needsUpdate=true;p.at.needsUpdate=true}}

  function create(R,q){const a={scene:R.scene,q,time:0,fall:[],stuck:[],frag:[],crys:[],decals:[],pools:{},GL:{value:q.high?1:.75},LIT:{value:1},twinN:0,twinCap:q.high?200:56,
      fragCap:q.high?220:70,stuckCap:q.high?44:16,lit:new T.Color(1,1,1)};
    a.mat=iceMat('inst',q.high,null,a.GL,a.LIT);a.matF=q.high?iceMat('inst',false,null,a.GL,a.LIT):a.mat;
    const mk=(shape,n,cap,mat)=>{const out=[];for(let i=0;i<n;i++)out.push(pool(R,shape(),mat||a.mat,cap));return out};
    a.pools.shard=mk(shardShape,3,q.high?48:20);a.pools.crys=mk(crystalShape,2,q.high?64:28);a.pools.chunk=mk(chunkShape,3,q.high?84:28,a.matF);a.pools.lance=mk(shardShape,1,8,a.matF);
    for(let i=0;i<(q.high?8:5);i++)a.decals.push(decalSlot(R));
    // the refraction pass renders the opaque scene again while any ice is on screen: at half resolution (ice blurs it anyway)
    if(q.high)try{if('transmissionResolutionScale' in R.renderer)R.renderer.transmissionResolutionScale=.5}catch(e){}
    return a}
  function ensure(R){if(!R.scene)return null;const q=mode(R);let a=R._ice;if(a&&(a.scene!==R.scene||a.q.key!==q.key)){dispose(R);a=null}if(!a)a=R._ice=create(R,q);return a}

  // ---------------- debris, mist, glints ----------------
  function frag(R,a,x,y,z,s,vx,vy,vz,frost){if(a.frag.length>=a.fragCap)return;V1.set(rr(-1,1),rr(-1,1),rr(-1,1)).normalize();
    const q=new T.Quaternion().setFromAxisAngle(V1,rr(0,TAU));V1.set(rr(-1,1),rr(-1,1),rr(-1,1)).normalize();
    a.frag.push({pool:rnd()*a.pools.chunk.length|0,x,y,z,vx,vy,vz,q,wx:V1.x,wy:V1.y,wz:V1.z,w:rr(5,15),sx:s*rr(.7,1.1),sy:s*rr(1,1.7),sz:s*rr(.7,1.1),
      t:0,life:rr(.9,1.6),bn:0,rest:0,seed:rnd(),frost:fin(frost,rr(.12,.3))})}
  function burst(R,a,x,y,z,n,s,spd,up,bx,bz){if(a.q.reduced)n=Math.ceil(n*.5);for(let i=0;i<n;i++){const an=rnd()*TAU,v=spd*rr(.35,1);frag(R,a,x+rr(-3,3),y+rr(-3,3),z+rr(-3,3),s*rr(.55,1.15),Math.cos(an)*v+(bx||0),up*rr(.45,1.1),Math.sin(an)*v+(bz||0))}}
  function puff(R,x,z,r,g,h){if(R.hxEmit)R.hxEmit('mist',{x,y:z,h:fin(h,rr(8,18)),r:r*.35,r1:r*rr(.9,1.3),life:rr(.6,1),c:'#cfeeff',c2:'#ffffff',vy:rr(10,30),drag:2,gain:.55*(g||1)})}
  function glit(R,x,y,z,n,r){const A=R.pfxApi;if(A&&A.stars)A.stars({x,y,z},n,'#eaf8ff',rr(5,8),r||24)}
  function crystal(a,owner,pk,x,y,z,dx,dy,dz,len,rad,grow,frost){const pools=a.pools[pk];if(!pools)return null;
    V1.set(dx,dy,dz).normalize();const q=new T.Quaternion().setFromUnitVectors(UP,V1);Q2.setFromAxisAngle(UP,rnd()*TAU);q.multiply(Q2);
    const c={pk,pool:rnd()*pools.length|0,x,y,z,q,dx:V1.x,dy:V1.y,dz:V1.z,len,rad,t:0,grow,frost,seed:rnd(),glow:.55,diss:0,dissR:0,life:Infinity,owner,gone:0};
    a.crys.push(c);if(owner)owner.crys.push(c);return c}
  function shatterCrys(R,a,c,cx,cz){if(c.gone)return;c.gone=1;const n=a.q.high?3:1;
    for(let i=0;i<n;i++){const k=rr(.15,.85)*c.len*Math.min(1,eob(c.t/c.grow)),x=c.x+c.dx*k,y=c.y+c.dy*k,z=c.z+c.dz*k,dx=x-cx,dz=z-cz,dl=Math.hypot(dx,dz)||1,v=rr(140,330);
      frag(R,a,x,y,z,c.rad*rr(.6,1.05),dx/dl*v,rr(140,420),dz/dl*v,c.frost)}}

  // ---------------- ice storms ----------------
  const BZ=new Map();   // keyed by position: on clients the area objects are rebuilt with every snapshot
  function scanStorms(R,a,dt){if(typeof aoes==='undefined')return;
    for(const z of aoes){if(!z||z.kind!=='blizz'||z.done)continue;const t0=z.delay||0;if(!(z.t>=t0&&z.t-t0<(z.dot||0)))continue;if(!near(z.x,z.y,(z.r||300)+300))continue;
      const k=(z.x|0)+'_'+(z.y|0);let s=BZ.get(k);
      if(!s){s={k,x:z.x,y:z.y,r:z.r||300,acc:rnd(),wind:rr(0,TAU),tilt:rr(.2,.36),seen:a.time,decal:frostDecal(R,a,z.x,z.y,(z.r||300)*1.04,{grow:1.6,alpha:.45,meltDur:2})};BZ.set(k,s)}
      s.seen=a.time;s.r=z.r||s.r;
      const rate=(a.q.high?24:10)*(a.q.reduced?.6:1)*Math.min(1.6,(s.r*s.r)/(330*330));
      s.acc+=dt*rate;let guard=8;while(s.acc>=1&&guard-->0){s.acc-=1;spawnShard(R,a,s)}}
    for(const [k,s] of BZ)if(a.time-s.seen>.3){release(s.decal,1.2,2);BZ.delete(k)}}
  function spawnShard(R,a,s){const an=rnd()*TAU,d=s.r*.96*Math.sqrt(rnd()),tx=s.x+Math.cos(an)*d,tz=s.y+Math.sin(an)*d,gy=R.gY(tx,tz);
    const big=rnd(),len=68+92*big*big,spd=rr(1500,1900),h=rr(900,1200),st=Math.sin(s.tilt);
    const dx=Math.cos(s.wind)*st+rr(-.05,.05),dz=Math.sin(s.wind)*st+rr(-.05,.05),dy=-Math.cos(s.tilt),dl=Math.hypot(dx,dy,dz),ux=dx/dl,uy=dy/dl,uz=dz/dl;
    const tt=h/(spd*-uy);V1.set(ux,uy,uz);const q=new T.Quaternion().setFromUnitVectors(UP,V1);Q2.setFromAxisAngle(UP,rnd()*TAU);q.multiply(Q2);
    // the instance origin is the base: the tip leads, and it reaches the ground at (tx,tz)
    a.fall.push({pool:rnd()*a.pools.shard.length|0,x:tx-ux*(spd*tt+len),y:gy+h-uy*len,z:tz-uz*(spd*tt+len),vx:ux*spd,vy:uy*spd,vz:uz*spd,dx:ux,dy:uy,dz:uz,
      len,rad:len*rr(.085,.125),q,seed:rnd(),storm:s.k,t:0})}
  function stormTargets(R){const out=[];if(!BZ.size||typeof units==='undefined')return out;
    for(const u of units){if(!u||u.dead)continue;const o=R.objs.get(u.id);if(!o||!o.root||!o.root.visible)continue;let inside=false;
      for(const s of BZ.values())if(Math.abs(u.x-s.x)<s.r+80&&Math.abs(u.y-s.y)<s.r+80){inside=true;break}
      if(inside)out.push({u,x:u.x,z:u.y,top:fin(o.gy,0)+unitH(u,o),rr2:Math.pow((u.r||20)+6,2)})}return out}
  function stepFall(R,a,dt){const keep=[],tg=a.fall.length?stormTargets(R):null;
    for(const e of a.fall){e.t+=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;
      const tx=e.x+e.dx*e.len,ty=e.y+e.dy*e.len,tz=e.z+e.dz*e.len,gy=R.gY(tx,tz);let hit=null;
      if(ty<gy+260)for(const u of tg){if(ty>u.top)continue;const ddx=tx-u.x,ddz=tz-u.z;if(ddx*ddx+ddz*ddz<u.rr2){hit=u;break}}
      if(hit){burst(R,a,tx,Math.max(ty,gy+12),tz,a.q.high?5:2,e.rad*.75,rr(150,280),rr(160,360),e.vx*.06,e.vz*.06);puff(R,tx,tz,e.len*.45,.8,Math.max(10,ty-gy));
        const st=US.get(hit.u.id);if(st)st.bz=Math.min(.34,st.bz+.07);continue}
      if(ty<=gy){land(R,a,e,tx,gy,tz);continue}
      if(e.t<2.5)keep.push(e)}
    a.fall=keep}
  function land(R,a,e,x,gy,z){
    if(e.len>70&&rnd()<.6&&a.stuck.length<a.stuckCap){const pen=e.len*rr(.12,.26);   // stabs into the ground
      a.stuck.push({pool:e.pool,x:e.x+e.dx*pen,y:e.y+e.dy*pen,z:e.z+e.dz*pen,dx:e.dx,dy:e.dy,dz:e.dz,q:e.q,len:e.len,rad:e.rad,seed:e.seed,storm:e.storm,t:0,life:rr(1.3,2.6),diss:0,crumble:0,gone:0});
      burst(R,a,x,gy+4,z,a.q.high?2:1,e.rad*.5,130,240);puff(R,x,z,e.len*.35,.55)}
    else{burst(R,a,x,gy+6,z,a.q.high?4+(rnd()*4|0):2,e.rad*rr(.55,.85),rr(160,300),rr(220,420),e.vx*.08,e.vz*.08);puff(R,x,z,e.len*.5,.9);glit(R,x,gy+10,z,a.q.high?3:1)}}
  function stepStuck(R,a,dt){for(const s of a.stuck){s.t+=dt;if(s.t>s.life){if(!s.crumble){s.crumble=1;burst(R,a,s.x+s.dx*s.len*.5,s.y+s.dy*s.len*.5,s.z+s.dz*s.len*.5,a.q.high?2:1,s.rad*.6,60,90)}s.diss=Math.min(1,s.diss+dt/.45)}}
    a.stuck=a.stuck.filter(s=>!s.gone&&s.diss<1)}
  // the field's closing burst: every shard still standing breaks with it
  function stormShatter(R,a,x,y,r){let n=0;
    for(const s of a.stuck){if(s.gone||Math.hypot(s.x-x,s.z-y)>r+60)continue;s.gone=1;n++;const m=a.q.high?4:2;
      for(let i=0;i<m;i++){const k=rr(.1,.9)*s.len,px=s.x+s.dx*k,py=s.y+s.dy*k,pz=s.z+s.dz*k,dx=px-x,dz=pz-y,dl=Math.hypot(dx,dz)||1,v=rr(120,320);
        frag(R,a,px,py,pz,s.rad*rr(.55,1),dx/dl*v,rr(180,460),dz/dl*v,.22)}}
    const k=(x|0)+'_'+(y|0),s=BZ.get(k);if(s)release(s.decal,1.4,2.2);
    for(let i=0;i<(a.q.high?6:3);i++){const an=rnd()*TAU,d=r*Math.sqrt(rnd())*.9;puff(R,x+Math.cos(an)*d,y+Math.sin(an)*d,r*.35,.8)}
    glit(R,x,R.gY(x,y)+30,y,a.q.high?14:5,r*.7);return n}

  // ---------------- frozen units ----------------
  const US=new Map(),FRZ=new Map(),ROOTF=new Map();
  function unitH(u,o){return fin(o&&o.H,0)||(u.boss?260:u.hero?118:Math.max(48,(u.r||20)*2.7))}
  const twinOk=m=>{const mt=Array.isArray(m.material)?m.material[0]:m.material,pa=m.geometry&&m.geometry.attributes&&m.geometry.attributes.position;
    return !!(mt&&pa&&pa.count>=12&&mt.visible!==false&&!mt.transparent&&mt.depthWrite!==false&&mt.blending===T.NormalBlending&&!mt.isMeshBasicMaterial&&!mt.isShadowMaterial&&
      mt.side!==T.BackSide&&!(mt.alphaTest>0)&&!m.geometry.isInstancedBufferGeometry)};
  // the crust is a twin of every body part: same geometry, same skeleton, the ice material pushing it out along the normals
  function buildTwins(R,a,st,o){if(!o||!o.root)return;
    if(!st.mat){st.U={uIceA:{value:new T.Vector4(st.seed,.5,0,0)},uIceS:{value:new T.Vector4(0,4,0,120)},uIceM:{value:new T.Vector4(.85,1,0,0)}};st.mat=iceMat('shell',false,st.U,a.GL,a.LIT)}
    const skip=new Set([o.ring,o.fxRing,o.ice,o.bubble,o.stars].filter(Boolean)),src=[];
    const walk=n=>{if(skip.has(n)||n.userData.iceTwin)return;if(n.isMesh&&!n.isInstancedMesh&&twinOk(n))src.push(n);for(const c of n.children)walk(c)};walk(o.root);
    if(src.length>48){src.sort((p,q)=>q.geometry.attributes.position.count-p.geometry.attributes.position.count);src.length=48}
    st.src=src;st.twins=[];
    for(const m of src){if(a.twinN>=a.twinCap)break;let t;
      if(m.isSkinnedMesh&&m.skeleton){t=new T.SkinnedMesh(m.geometry,st.mat);t.bind(m.skeleton,m.bindMatrix);t.bindMode=m.bindMode}else t=new T.Mesh(m.geometry,st.mat);
      if(m.morphTargetInfluences){t.morphTargetInfluences=m.morphTargetInfluences;t.morphTargetDictionary=m.morphTargetDictionary}
      t.userData.iceTwin=1;t.castShadow=t.receiveShadow=false;t.frustumCulled=false;t.renderOrder=(m.renderOrder||0)+1;t.raycast=()=>{};m.add(t);st.twins.push(t);a.twinN++}}
  function dropTwins(a,st){if(st.twins){for(const t of st.twins)if(t.parent)t.parent.remove(t);a.twinN=Math.max(0,a.twinN-st.twins.length);st.twins=null}st.src=null}
  function bodyPoint(st,out){const m=st.src[rnd()*st.src.length|0],pa=m&&m.geometry.attributes.position;if(!pa)return false;
    try{m.getVertexPosition(rnd()*pa.count|0,out);out.applyMatrix4(m.matrixWorld);return Number.isFinite(out.x)&&Number.isFinite(out.y)}catch(e){return false}}
  function freezeIn(R,a,st,u,o){const gy=fin(o&&o.gy,R.gY(u.x,u.y)),H=st.H,ur=u.r||22;st.rot0=o?o.rot:0;if(o)o._iceT0=R.t;
    // crystals bursting out of the ground around the body, leaning outwards
    const n=a.q.high?7:4;for(let i=0;i<n;i++){const an=i/n*TAU+rr(-.35,.35),d=ur*rr(.3,.95),tl=rr(.12,.5);
      crystal(a,st,'crys',u.x+Math.cos(an)*d,gy-H*.04,u.y+Math.sin(an)*d,Math.cos(an)*Math.sin(tl),Math.cos(tl),Math.sin(an)*Math.sin(tl),H*rr(.38,.78),H*rr(.06,.1),rr(.12,.22),.38)}
    for(let i=0;i<(a.q.high?4:2);i++){const an=rr(0,TAU),d=ur*rr(1,1.6),tl=rr(.5,.95);
      crystal(a,st,'crys',u.x+Math.cos(an)*d,gy-H*.03,u.y+Math.sin(an)*d,Math.cos(an)*Math.sin(tl),Math.cos(tl),Math.sin(an)*Math.sin(tl),H*rr(.14,.3),H*rr(.04,.065),rr(.1,.2),.42)}
    if(!st.puddle)st.puddle=frostDecal(R,a,u.x,u.y,ur*2.4+20,{grow:.35,alpha:1,meltDur:1.4});
    st.iciT=.14;   // icicles once the pose has settled
    for(let i=0;i<3;i++)puff(R,u.x+rr(-ur,ur),u.y+rr(-ur,ur),H*.5,.5);glit(R,u.x,gy+H*.5,u.y,a.q.high?8:3,ur);
    if(R.vfxWave)R.vfxWave(u.x,u.y,{h:H*.4,r0:ur,r1:ur*5,s:.006,life:.4})}
  function icicles(R,a,st,u,o){if(!st.src||!st.src.length||!o)return;const gy=o.gy,H=st.H,ur=u.r||22,n=a.q.high?8:3;let made=0;
    for(let k=0;k<n*6&&made<n;k++){if(!bodyPoint(st,V1))continue;const hk=(V1.y-gy)/H;if(hk<.28||hk>.92)continue;
      const dx=V1.x-u.x,dz=V1.z-u.y,dr=Math.hypot(dx,dz);if(dr<ur*.45)continue;
      const len=H*rr(.06,.15);crystal(a,st,'shard',V1.x+dx/dr*2.5,V1.y+H*.02,V1.z+dz/dr*2.5,0,-1,0,len,len*rr(.12,.18),rr(.25,.4),.3);made++}}
  function freezeOut(R,a,st,u,o){const gy=fin(o&&o.gy,R.gY(u.x,u.y)),H=st.H,ur=u.r||22;
    for(const c of st.crys)shatterCrys(R,a,c,u.x,u.y);st.crys=[];
    // the crust bursts off the body
    const n=a.q.high?14:5;for(let i=0;i<n;i++){let x=u.x+rr(-ur,ur),y=gy+rr(.15,.9)*H,z=u.y+rr(-ur,ur);
      if(st.src&&st.src.length&&bodyPoint(st,V1)){x=V1.x;y=V1.y;z=V1.z}
      const dx=x-u.x,dz=z-u.y,dl=Math.hypot(dx,dz)||1,v=rr(150,340);frag(R,a,x,y,z,H*rr(.03,.06),dx/dl*v,rr(120,380),dz/dl*v,.25)}
    st.lvl=0;st.crack=0;release(st.puddle,1.2,1.4);st.puddle=null;
    for(let i=0;i<3;i++)puff(R,u.x+rr(-ur,ur),u.y+rr(-ur,ur),H*.55,.9,H*rr(.2,.6));glit(R,u.x,gy+H*.5,u.y,a.q.high?12:4,ur*1.5);
    if(R.vfxWave)R.vfxWave(u.x,u.y,{h:H*.4,r0:ur*.5,r1:ur*6,s:.008,life:.35})}
  function rootIn(R,a,st,u,o){const gy=fin(o&&o.gy,R.gY(u.x,u.y)),H=st.H,ur=u.r||22,n=a.q.high?4:2;
    for(let i=0;i<n;i++){const an=i/n*TAU+rr(-.4,.4),d=ur*rr(.25,.8),tl=rr(.15,.5);
      crystal(a,st,'crys',u.x+Math.cos(an)*d,gy-H*.03,u.y+Math.sin(an)*d,Math.cos(an)*Math.sin(tl),Math.cos(tl),Math.sin(an)*Math.sin(tl),H*rr(.2,.34),H*rr(.05,.075),rr(.1,.18),.45)}
    if(!st.puddle)st.puddle=frostDecal(R,a,u.x,u.y,ur*1.9+12,{grow:.25,alpha:.9,meltDur:1.2})}
  function rootOut(R,a,st){for(const c of st.crys)c.dissR=2.4;st.crys=[];release(st.puddle,.4,1.2);st.puddle=null}
  function newSt(R,a,u,o){return{id:u.id,o,seed:rnd(),lvl:0,hw:.85,nw:1.25,th:.02,fr:.7,bz:0,frz:false,root:false,crys:[],twins:null,src:null,mat:null,U:null,
    H:unitH(u,o),rot0:o?o.rot:0,crack:0,iciT:0,puddle:null,idle:0,seen:a.time}}
  function freeSt(a,st){dropTwins(a,st);if(st.mat){st.mat.dispose();st.mat=null}if(st.o){st.o._iceHold=false;st.o._iceT0=undefined}release(st.puddle,0,1);st.puddle=null;for(const c of st.crys)c.dissR=2.4;st.crys=[]}
  function stepUnits(R,a,dt){if(typeof units==='undefined')return;const tn=a.time;
    for(const u of units){if(!u)continue;let st=US.get(u.id);const o=R.objs.get(u.id);
      const fe=FRZ.get(u.id),frz=fe!==undefined&&!u.dead&&tn-fe<12&&(u.stunT>0||tn-fe<.2);if(fe!==undefined&&!frz)FRZ.delete(u.id);
      // area roots carry no event: a root that starts inside a frost nova is the ice one
      if(u.rootT>0&&!u.dead&&!ROOTF.has(u.id)&&frostAt(u.x,u.y))ROOTF.set(u.id,tn);
      const re=ROOTF.get(u.id),root=re!==undefined&&!u.dead&&tn-re<10&&(u.rootT>0||tn-re<.2);if(re!==undefined&&!root)ROOTF.delete(u.id);
      const slow=!u.dead&&u.slowT>0,vis=!!(o&&o.root&&o.root.visible&&o.root.parent)&&near(u.x,u.y,150);
      if(!st){if(!vis||!(frz||root||slow))continue;st=newSt(R,a,u,o);US.set(u.id,st)}
      st.seen=tn;
      if(st.o!==o){dropTwins(a,st);if(st.o){st.o._iceHold=false;st.o._iceT0=undefined}st.o=o;if(o)st.rot0=o.rot}   // the model was rebuilt (e.g. a GLB finished loading)
      let inStorm=false;for(const s of BZ.values())if(Math.hypot(u.x-s.x,u.y-s.y)<s.r+(u.r||20)){inStorm=true;break}
      st.bz=clamp(st.bz+(inStorm&&slow?dt*.14:-dt*.3),0,.34);
      let tgt=0,hw=st.hw,nw=st.nw,th=st.th,fr=st.fr;
      if(frz){tgt=1;hw=.8;nw=.45;th=.042;fr=.18}else if(root){tgt=.6;hw=1.8;nw=.4;th=.032;fr=.28}else if(slow){tgt=.16+Math.min(st.bz,.24);hw=.8;nw=1.3;th=.022;fr=.26}
      if(frz&&!st.frz){if(st.root)rootOut(R,a,st);freezeIn(R,a,st,u,o)}
      if(!frz&&st.frz)freezeOut(R,a,st,u,o);
      if(root&&!st.root&&!frz)rootIn(R,a,st,u,o);
      if(!root&&st.root&&!frz)rootOut(R,a,st);
      st.frz=frz;st.root=root&&!frz;
      st.lvl=st.lvl<tgt?Math.min(tgt,st.lvl+dt*(frz?5:2.4)):Math.max(tgt,st.lvl-dt*.8);
      const k=Math.min(1,dt*5);st.hw+=(hw-st.hw)*k;st.nw+=(nw-st.nw)*k;st.th+=(th-st.th)*k;st.fr+=(fr-st.fr)*k;
      // the host knows the stun's time left: the ice cracks for the last moment before it breaks
      st.crack=frz&&u.stunT>0&&u.stunT<.3?clamp(1-u.stunT/.3,0,1):Math.max(0,st.crack-dt*6);
      if(vis&&st.lvl>.004&&!st.twins&&a.twinN<a.twinCap)buildTwins(R,a,st,o);
      if(st.mat){const show=vis&&st.lvl>.004&&!!st.twins;st.mat.visible=show;setTrans(st.mat,a.q.high&&(frz||st.root||(slow&&inStorm)));
        if(show){st.U.uIceA.value.set(st.seed,st.fr,0,frz?.1+.3*st.crack:0);st.U.uIceS.value.set(st.lvl,st.H*st.th,fin(o.gy,0),st.H);st.U.uIceM.value.set(st.hw,st.nw,st.crack,0)}}
      if(st.iciT>0){st.iciT-=dt;if(st.iciT<=0&&frz&&vis)icicles(R,a,st,u,o)}
      st.crys=st.crys.filter(c=>!c.gone&&c.diss<1);
      if(o){o._iceHold=frz;if(frz){if(o._iceT0===undefined)o._iceT0=R.t;o.rot=st.rot0;o.root.rotation.y=st.rot0;if(o.body)o.body.scale.set(1,1,1)}else o._iceT0=undefined;
        if((frz||st.root)&&st.lvl>.05&&o.ice)o.ice.visible=false;if(frz&&o.stars)o.stars.visible=false}
      const busy=frz||root||slow||st.lvl>0||st.crys.length;st.idle=busy?0:st.idle+dt;
      if(st.twins&&st.lvl<=0&&!busy)dropTwins(a,st)}
    for(const [id,st] of US)if(tn-st.seen>.5||st.idle>.6){freeSt(a,st);US.delete(id)}}

  // ---------------- the frost lance (Q) flies as a real ice spear and breaks where it stops ----------------
  const LANCE=new Map();
  function stepLances(R,a){if(typeof projs==='undefined')return;const seen=new Set();
    for(const p of projs){if(!p||p.kind!==4||!near(p.x,p.y,100))continue;const sp=Math.hypot(p.vx,p.vy);if(!(sp>1))continue;
      const key=p.id!==undefined?'i'+p.id:'v'+Math.round(p.vx)+'_'+Math.round(p.vy);seen.add(key);let l=LANCE.get(key);
      if(!l){l={seed:rnd(),pool:rnd()*a.pools.shard.length|0,roll:rnd()*TAU,q:new T.Quaternion(),len:rr(70,80)};LANCE.set(key,l)}
      const dx=p.vx/sp,dz=p.vy/sp;V1.set(dx,0,dz);l.q.setFromUnitVectors(UP,V1);Q2.setFromAxisAngle(UP,l.roll+a.time*7);l.q.multiply(Q2);
      l.x=p.x-dx*l.len*.55;l.y=R.gY(p.x,p.y)+40;l.z=p.y-dz*l.len*.55;l.dx=dx;l.dz=dz}
    for(const [k,l] of LANCE)if(!seen.has(k)){LANCE.delete(k);if(l.x===undefined)continue;const x=l.x+l.dx*l.len*.8,z=l.z+l.dz*l.len*.8;
      burst(R,a,x,l.y,z,a.q.high?5:2,6,rr(120,220),rr(120,260),l.dx*160,l.dz*160);puff(R,x,z,40,.7,40);glit(R,x,l.y,z,a.q.high?3:1,16)}}

  // ---------------- the refraction pass ----------------
  // three renders the opaque scene again into its own target while anything transmissive is on screen. The big instanced
  // batches (trees, rocks, props, grass) stay out of that copy: behind a shard there is ground, and it halves the cost.
  let ICEON=false;
  const isTRT=rt=>!!(rt&&rt.texture&&rt.texture.generateMipmaps===true&&rt.texture.minFilter===T.LinearMipmapLinearFilter);
  function trimPass(R,a){if(a.trimmed===R.scene)return;a.trimmed=R.scene;
    R.scene.traverse(o=>{if(!o.isInstancedMesh||o.name==='arena-ice'||o.userData.iceTrim||!o.geometry||!o.geometry.attributes.position)return;
      const g=o.geometry,tri=(g.index?g.index.count:g.attributes.position.count)/3*Math.max(1,o.count);if(tri<30000)return;
      o.userData.iceTrim=1;const ob=o.onBeforeRender,oa=o.onAfterRender;let keep=-1;
      o.onBeforeRender=function(r,s,c,geo){ob.apply(this,arguments);if(ICEON&&geo&&isTRT(r.getRenderTarget())){keep=geo.drawRange.count;geo.drawRange.count=0}};
      o.onAfterRender=function(r,s,c,geo){if(keep!==-1&&geo){geo.drawRange.count=keep;keep=-1}oa.apply(this,arguments)}})}

  // ---------------- per frame ----------------
  function step(R,dt){const a=ensure(R);if(!a)return;dt=Math.min(.1,Math.max(0,fin(dt,0)));a.time+=dt;
    if(R.hemi&&R.sun){a.lit.copy(R.hemi.color).multiplyScalar(R.hemi.intensity*.55).add(C1.copy(R.sun.color).multiplyScalar(R.sun.intensity*.22));
      a.lit.r=Math.min(1.2,a.lit.r);a.lit.g=Math.min(1.2,a.lit.g);a.lit.b=Math.min(1.25,a.lit.b);a.LIT.value=clamp((a.lit.r+a.lit.g+a.lit.b)/3,.2,1.2)}
    scanStorms(R,a,dt);stepFall(R,a,dt);stepStuck(R,a,dt);
    for(const f of a.frag){f.t+=dt;if(f.rest)continue;f.vy-=1600*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.vz*dt;const gy=R.gY(f.x,f.z)+f.sy*.3;
      if(f.y<gy){f.y=gy;if(f.vy<0){f.vy=-f.vy*.3;f.vx*=.55;f.vz*=.55;f.w*=.55;f.bn++;if(f.vy<70||f.bn>2){f.rest=1;f.vy=0}}}
      Q2.setFromAxisAngle(V1.set(f.wx,f.wy,f.wz),f.w*dt);f.q.premultiply(Q2)}
    a.frag=a.frag.filter(f=>f.t<f.life);
    for(const c of a.crys){c.t+=dt;if(c.t>c.life&&!c.dissR&&!c.gone){if(c.endShatter)shatterCrys(R,a,c,fin(c.cx,c.x),fin(c.cz,c.z));else c.dissR=2.4}if(c.dissR)c.diss=Math.min(1,c.diss+dt*c.dissR)}
    a.crys=a.crys.filter(c=>!c.gone&&c.diss<1);
    stepUnits(R,a,dt);stepLances(R,a);
    for(const d of a.decals){if(!d.on)continue;d.t+=dt;if(!d.hold){d.meltDelay-=dt;if(d.meltDelay<=0)d.melt+=dt/d.meltDur}
      d.U.uF.value.set(Math.min(1.2,d.t/d.grow),d.alpha,Math.min(1,d.melt),d.seed);d.U.uLit.value.copy(a.lit);if(d.melt>=1){d.on=false;d.mesh.visible=false}}
    // write the instances
    for(const k in a.pools)for(const p of a.pools[k])p.n=0;
    const SH=a.pools.shard,CR=a.pools.crys,CH=a.pools.chunk;
    for(const l of LANCE.values())if(l.x!==undefined)put(a.pools.lance[0],l.x,l.y,l.z,l.q,9.5,l.len,9.5,l.seed,.14,0,.42);
    for(const e of a.fall)put(SH[e.pool],e.x,e.y,e.z,e.q,e.rad,e.len,e.rad,e.seed,.2,0,.3);
    for(const s of a.stuck)put(SH[s.pool],s.x,s.y,s.z,s.q,s.rad,s.len,s.rad,s.seed,.24+.3*Math.min(1,s.t/2),s.diss,0);
    for(const f of a.frag){const k=f.t/f.life;put(CH[f.pool],f.x,f.y,f.z,f.q,f.sx,f.sy,f.sz,f.seed,f.frost,k>.62?(k-.62)/.38:0,0)}
    for(const c of a.crys){const g=eob(c.t/c.grow),w=.55+.45*Math.min(1,g),P2=c.pk==='shard'?SH:CR;
      put(P2[c.pool%P2.length],c.x,c.y,c.z,c.q,c.rad*w,c.len*Math.max(.01,g),c.rad*w,c.seed,c.frost,c.diss,c.glow*Math.max(0,1-c.t/.6))}
    let on=false;for(const p of a.pools.shard.concat(a.pools.crys))if(p.n){on=a.q.high;break}
    if(!on)for(const st of US.values())if(st.mat&&st.mat.visible&&st.mat.transmission>0){on=true;break}
    for(const p of a.pools.chunk.concat(a.pools.lance))p.im.material=on?a.mat:a.matF;
    for(const k in a.pools)for(const p of a.pools[k])flush(p);
    ICEON=a.q.high&&on;if(ICEON)trimPass(R,a)}
  function reset(R){const a=R._ice;ICEON=false;for(const st of US.values())freeSt(a||{twinN:0},st);US.clear();FRZ.clear();ROOTF.clear();BZ.clear();LANCE.clear();
    if(!a)return;a.fall=[];a.stuck=[];a.frag=[];a.crys=[];a.twinN=0;for(const d of a.decals){d.on=false;d.mesh.visible=false}for(const k in a.pools)for(const p of a.pools[k]){p.n=0;flush(p)}}
  function dispose(R){const a=R._ice;reset(R);if(!a)return;
    for(const k in a.pools)for(const p of a.pools[k]){if(p.im.parent)p.im.parent.remove(p.im);p.geo.dispose();p.im.dispose&&p.im.dispose()}
    for(const d of a.decals){if(d.mesh.parent)d.mesh.parent.remove(d.mesh);d.g.dispose();d.m.dispose()}a.mat.dispose();if(a.matF!==a.mat)a.matF.dispose();R._ice=null}

  // ---------------- hooks ----------------
  // a frozen unit keeps its pose: its animation runs on a stopped clock (every model kind goes through one of these)
  for(const k of['celestialAnim','qnAnim','animKK','animKKZ','animHum','animWolf','animDragon','animBig']){const f=P[k];if(typeof f!=='function')continue;
    P[k]=function(o,u){if(o&&o._iceHold&&o._iceT0!==undefined)return f.call(this,o,u,o._iceT0,0,0);return f.apply(this,arguments)}}
  const frostAt=(x,y)=>typeof aoes!=='undefined'&&aoes.some(z=>z&&z.kind==='frost'&&Math.hypot(z.x-x,z.y-y)<=(z.r||0)+40);
  const _doFx=P.doFx;if(_doFx)P.doFx=function(e,me,L){try{if(e&&ensure(this)){const a=this._ice;
        if(e.k==='freeze'&&e.id!==undefined)FRZ.set(e.id,a.time);
        else if(e.k==='shatter'&&Number.isFinite(e.x))stormShatter(this,a,e.x,e.y,e.r||40);
        else if(e.k==='snare'&&e.id!==undefined&&frostAt(e.x,e.y)){ROOTF.set(e.id,a.time);return}}   // the frost nova's root is ice, not the green vine snare
    }catch(err){warn(this,'fx',err)}return _doFx.apply(this,arguments)};
  // the frost nova's cone spikes (r4) become real crystals
  const _av=P.aoeVis;if(_av)P.aoeVis=function(z,Tm,dt,L){const n0=Array.isArray(this.spikes)?this.spikes.length:0,pa=this.pool&&this.pool.ad,u0=pa?pa.used:0;const r0=_av.apply(this,arguments);
    try{if(z&&z.kind==='blizz'&&this.pool&&this.pool.ad){const pl=this.pool.ad,fp=this.tex('frostp');for(let i=pa?u0:0;i<pl.used;i++){const m=pl.list[i];if(m&&m.material)m.material.opacity*=m.material.map===fp?.3:.65}}}catch(e){warn(this,'blizz',e)}
    try{if(z&&z.kind==='frost'&&Array.isArray(this.spikes)&&this.spikes.length>n0&&ensure(this)){const a=this._ice,add=this.spikes.splice(n0),keep=[];
        for(const s of add){if(!s.ice){keep.push(s);continue}const m=1+(rnd()<.6)+(rnd()<.3);
          for(let i=0;i<m;i++){const ox=s.x+rr(-10,10),oz=s.y+rr(-10,10),dx=ox-z.x,dz=oz-z.y,dl=Math.hypot(dx,dz)||1,tl=rr(.18,.6),len=rr(42,88)*(i?.6:1);
            const c=crystal(a,null,'crys',ox,this.gY(ox,oz)-6,oz,dx/dl*Math.sin(tl),Math.cos(tl),dz/dl*Math.sin(tl),len,len*rr(.12,.17),.1,.35);
            if(c){c.life=rr(.75,1);c.endShatter=rnd()<.45;c.cx=z.x;c.cz=z.y}}}
        if(keep.length)this.spikes.push(...keep)}}catch(e){warn(this,'nova',e)}return r0};
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r0=_fx.apply(this,arguments);try{step(this,dt)}catch(e){warn(this,'step',e)}return r0};
  const _ini=P.initFX;if(_ini)P.initFX=function(){const r0=_ini.apply(this,arguments);try{reset(this)}catch(e){}return r0};
  const _ds=P.disposeScene;if(_ds)P.disposeScene=function(){try{dispose(this)}catch(e){}return _ds.apply(this,arguments)};
  window.ArenaIce={snapshot(){const a=P._ice;if(!a)return null;const n={};for(const k in a.pools)n[k]=a.pools[k].reduce((s,p)=>s+p.n,0);
      return{falling:a.fall.length,stuck:a.stuck.length,fragments:a.frag.length,crystals:a.crys.length,decals:a.decals.filter(d=>d.on).length,storms:BZ.size,
        units:[...US.values()].map(s=>({id:s.id,lvl:+s.lvl.toFixed(3),frz:s.frz,root:s.root,twins:s.twins?s.twins.length:0,crys:s.crys.length})),twinN:a.twinN,drawn:n,high:a.q.high}},
    freeze(id){if(P._ice)FRZ.set(id,P._ice.time)},storms:BZ,states:US};
})();
