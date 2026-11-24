/* Arena Royale · the Snow Queen's aura (Claude, 2026-11-24 · index only). Render only.
 * Owner 2026-11-24: "เพิ่มแสงออร่าให้บอสราชินี ให้ดูน่ากลัวสวยงาม" (give the queen an aura, frightening and beautiful). Around the
 * queen drawn by eclipse-fx.js (her rigged model) this adds, all following her and fading out when she dies:
 *  - a spectral rim: a twin of her skinned mesh pushed out along the normals after skinning (so it moves with every clip), drawn
 *    additively with a fresnel falloff: her edges burn with cold light;
 *  - a shadow behind her: a soft dark glow kept on the far side of her from the camera, so the air round her darkens and she stands
 *    out pale against it (her own body hides it where she stands in front);
 *  - an aurora veil: slow curtains of light rising round her (the far half of a ring, so it never washes over her), folding and
 *    flickering against that shadow, fading out above her head;
 *  - under her feet a shadow of deep blue on the floor, and on it a frost vortex: two rune-and-spiral discs turning against each other;
 *  - ice shards orbiting her at different heights, each with its own halo;
 *  - a crown of ice floating over her head, following the head bone (a thin ring and six points) and turning slowly;
 *  - dark mist curling up from the floor around her (high quality only) and pale motes rising.
 * Her phase sets the colours and the strength: I cyan, II violet and stronger, III white-violet and strongest (Eternal Winter).
 * Driven from fxExtra over eclipse-fx's creature set, so it keeps animating (and fades) through her death clip.
 * Low quality keeps the floor, shadow, veil, shards and crown and drops the rim and the mist. */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined'||(typeof MOON!=='undefined'&&MOON))return;
  const R=R3,T=THREE;
  const PH=[{a:'#7fd8ff',b:'#cff4ff',d:'#0a1838',k:1},{a:'#a07cff',b:'#8fd8ff',d:'#140c34',k:1.3},{a:'#eef8ff',b:'#8a63ff',d:'#0c0a2a',k:1.6}];
  const warn=e=>{if(!R._qaE){R._qaE=1;console.warn('queen aura',e)}};
  const own=m=>{m.userData.ownMat=1;return m};
  // ---- the rim twin: Phong (it skins like her own materials), pushed out, its light replaced by a fresnel glow ----
  function rimMat(push){const m=own(new T.MeshPhongMaterial({color:0x000000,specular:0x000000,shininess:1,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false}));
    const U={uC:{value:new T.Color(PH[0].a)},uK:{value:0},uPush:{value:push}};m.userData.U=U;
    m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
      sh.vertexShader='uniform float uPush;\n'+sh.vertexShader.replace('#include <skinning_vertex>','#include <skinning_vertex>\n  transformed+=normalize(objectNormal)*uPush;');
      sh.fragmentShader='uniform vec3 uC;uniform float uK;\n'+sh.fragmentShader.replace('#include <opaque_fragment>',
        '  { float fr=1.-abs(dot(normalize(normal),normalize(vViewPosition))); outgoingLight=uC*(pow(fr,2.)*1.6+.02)*uK; }\n#include <opaque_fragment>')};
    m.customProgramCacheKey=()=>'queen-rim-v1';return m}
  // ---- the aurora veil: curtains of light round an open cylinder, uv.x round it, uv.y up ----
  const VEIL_VS='varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
  const VEIL_FS=`uniform float uT,uK;uniform vec3 uA,uB;varying vec2 vU;
void main(){float x=vU.x*6.2832,y=vU.y;
  float fold=.5+.5*sin(x*3.+uT*.7+sin(x*7.-uT*1.3)*.9),ray=pow(.5+.5*sin(x*11.-uT*2.1+sin(x*2.+uT*.4)*2.),14.);
  float a=(pow(fold,3.)*.75+ray*.7)*smoothstep(0.,.1,y)*(1.-smoothstep(.3,1.,y))*(.85+.15*sin(uT*5.3+x*4.))*uK;
  gl_FragColor=vec4(mix(uA,uB,y)*a,1.);
  #include <colorspace_fragment>
}`;
  // ---- the vortex: spiral arms and a ring of runes, drawn once ----
  let vortexTex=null;
  function vortex(){if(vortexTex)return vortexTex;const N=256,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d'),h=N/2;
    g.translate(h,h);g.lineCap='round';
    for(let arm=0;arm<5;arm++){g.beginPath();for(let i=0;i<=100;i++){const t=i/100,r=18+t*100,a=arm/5*Math.PI*2+t*3.2;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(!i)g.moveTo(x,y);else g.lineTo(x,y)}
      g.strokeStyle='rgba(255,255,255,.16)';g.lineWidth=10;g.stroke();g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=2.6;g.stroke()}
    g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=2;for(const r of[94,108,121]){g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.stroke()}
    g.fillStyle='rgba(255,255,255,.9)';for(let i=0;i<24;i++){g.save();g.rotate(i/24*Math.PI*2);g.translate(0,-101);g.fillRect(-1,-5,2,10);
      if(i%3===0){g.beginPath();g.moveTo(0,-7);g.lineTo(4,0);g.lineTo(0,7);g.lineTo(-4,0);g.closePath();g.fill()}g.restore()}
    const rg=g.createRadialGradient(0,0,0,0,0,h);rg.addColorStop(0,'rgba(255,255,255,.32)');rg.addColorStop(.25,'rgba(255,255,255,.07)');rg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=rg;g.fillRect(-h,-h,N,N);
    vortexTex=new T.CanvasTexture(c);vortexTex.colorSpace=T.SRGBColorSpace;return vortexTex}
  // ---- the shadow: soft overlapping blobs, a broad dark middle with a smoky edge (the round glow texture fades too soon) ----
  let shadeTex=null;
  function shadeT(){if(shadeTex)return shadeTex;const N=128,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d');let sd=7;const rnd=()=>(sd=sd*16807%2147483647)/2147483647;
    for(let i=0;i<26;i++){const a=rnd()*6.283,d=rnd()*N*.2,x=N/2+Math.cos(a)*d,y=N/2+Math.sin(a)*d,r=N*(.22+.2*rnd()),rg=g.createRadialGradient(x,y,0,x,y,r);
      rg.addColorStop(0,'rgba(255,255,255,.22)');rg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=rg;g.fillRect(0,0,N,N)}
    shadeTex=new T.CanvasTexture(c);shadeTex.colorSpace=T.SRGBColorSpace;return shadeTex}
  const addM=(map,color,op)=>own(new T.MeshBasicMaterial({map,color,transparent:true,opacity:op,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:false}));
  const sprM=(color,op)=>own(new T.SpriteMaterial({map:R.tex('wglow'),color,transparent:true,opacity:op,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:false}));
  const disc=(A,root,mat,s,ro)=>{const m=new T.Mesh(A.plane,mat);m.rotation.x=-Math.PI/2;m.scale.set(s,s,1);m.renderOrder=ro;root.add(m);return m};
  function build(o){const A={t:0,fade:0,twins:[],shells:[]},root=new T.Group(),H=o.H||250;o.root.add(root);A.root=root;A.plane=new T.PlaneGeometry(1,1);
    // the shadow that darkens the floor, then the two vortex discs and a faint pool of light on it
    A.dark=disc(A,root,own(new T.MeshBasicMaterial({map:shadeT(),color:PH[0].d,transparent:true,opacity:0,depthWrite:false,fog:false})),560,2);
    A.v1=disc(A,root,addM(vortex(),PH[0].a,0),400,3);A.v2=disc(A,root,addM(vortex(),PH[0].b,0),250,3);A.pool=disc(A,root,addM(R.tex('wglow'),PH[0].a,0),300,3);
    // the shadow behind her, then the aurora veil (only its far half is drawn: the inside faces)
    A.shade=new T.Sprite(own(new T.SpriteMaterial({map:shadeT(),color:PH[0].d,transparent:true,opacity:0,depthWrite:false,fog:false})));A.shade.scale.set(380,500,1);A.shade.renderOrder=1;root.add(A.shade);
    A.veilG=new T.CylinderGeometry(122,150,330,48,1,true);A.veilG.translate(0,165,0);
    A.veilM=own(new T.ShaderMaterial({uniforms:{uT:{value:0},uK:{value:0},uA:{value:new T.Color(PH[0].a)},uB:{value:new T.Color(PH[0].b)}},vertexShader:VEIL_VS,fragmentShader:VEIL_FS,
      transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.BackSide}));
    A.veil=new T.Mesh(A.veilG,A.veilM);A.veil.renderOrder=4;A.veil.frustumCulled=false;root.add(A.veil);
    // orbiting shards, each with a halo
    A.sg=new T.OctahedronGeometry(1,0);A.sg.scale(.55,1.9,.55);A.shM=own(new T.MeshBasicMaterial({color:'#e8f8ff',toneMapped:false}));
    A.shards=[];for(let i=0;i<7;i++){const s=new T.Mesh(A.sg,A.shM),k=9+(i%3)*3;s.scale.setScalar(k);const h=new T.Sprite(sprM(PH[0].a,0));h.scale.setScalar(70/k);s.add(h);
      root.add(s);A.shards.push({m:s,h,r:98+(i%4)*16,y:H*(.22+.11*(i%5)),sp:(i%2?1:-1)*(.55+.11*i),ph:i/7*Math.PI*2})}
    // the crown of ice over her head
    const crown=new T.Group();crown.position.y=H*.95;root.add(crown);A.crown=crown;
    A.ringG=new T.TorusGeometry(24,1.5,6,40);A.ringM=addM(null,'#e8f8ff',0);const ring=new T.Mesh(A.ringG,A.ringM);ring.rotation.x=Math.PI/2;crown.add(ring);
    A.spG=new T.ConeGeometry(2.4,15,5);A.spG.translate(0,7.5,0);for(let i=0;i<6;i++){const a=i/6*Math.PI*2,sp=new T.Mesh(A.spG,A.shM);sp.position.set(Math.cos(a)*24,0,Math.sin(a)*24);sp.scale.y=i%2?1:1.6;crown.add(sp)}
    A.crownGlow=new T.Sprite(sprM(PH[0].b,0));A.crownGlow.scale.set(100,100,1);crown.add(A.crownGlow);
    if(o.sk)o.pose.traverse(n=>{if(!A.head&&n.isBone&&/^(mixamorig[:_]?)?Head$/i.test(n.name))A.head=n});
    // the rim on her own skinned meshes (high quality), pushed 3.2 world units out whatever the rig's own scale
    if(R.hi&&o.sk){o.root.updateMatrixWorld(true);const ws=new T.Vector3(),list=[];o.pose.traverse(n=>{if(n.isSkinnedMesh&&!n.userData.qaTwin)list.push(n)});
      for(const n of list){n.getWorldScale(ws);const m=rimMat(3.2/Math.max(1e-4,(Math.abs(ws.x)+Math.abs(ws.y)+Math.abs(ws.z))/3)),t=new T.SkinnedMesh(n.geometry,m);
        t.userData.qaTwin=1;t.bindMode=n.bindMode;t.bind(n.skeleton,n.bindMatrix);t.position.copy(n.position);t.quaternion.copy(n.quaternion);t.scale.copy(n.scale);
        t.frustumCulled=false;t.castShadow=t.receiveShadow=false;t.renderOrder=(n.renderOrder||0)+2;n.parent.add(t);A.twins.push(t);A.shells.push(m)}}
    o.aura=A;return A}
  function dispose(o){const A=o.aura;if(!A)return;o.aura=null;try{for(const t of A.twins)t.parent&&t.parent.remove(t);A.root.parent&&A.root.parent.remove(A.root);
      A.root.traverse(n=>{const m=n.material;if(m&&m.userData&&m.userData.ownMat)m.dispose()});for(const m of A.shells)m.dispose();
      for(const g of[A.plane,A.sg,A.spG,A.ringG,A.veilG])g.dispose()}catch(e){warn(e)}}
  const cA=new T.Color(),cB=new T.Color(),V=new T.Vector3(),V2=new T.Vector3();
  function step(o,u,dt){const A=o.aura;A.t+=dt;const t=A.t,ph=Math.max(0,Math.min(2,u.ph|0)),P=PH[ph];
    A.fade=u.dead?Math.max(0,A.fade-dt*.8):Math.min(1,A.fade+dt*1.5);const f=A.fade*P.k,pulse=.82+.18*Math.sin(t*2.6)+(ph===2?.1*Math.sin(t*7.3):0),H=o.H||250,vis=A.fade>.02;
    cA.set(P.a);cB.set(P.b);
    // on the court the floor stands about 7 above the ground height (the moon circle): the discs lie on whichever she stands on
    const C=R.fortCourt;let lift=1.5;if(C)lift+=6.2*Math.max(0,Math.min(1,(C.r-Math.hypot(u.x-C.x,u.y-C.y))/40));
    A.dark.position.y=lift;A.v1.position.y=lift+.7;A.v2.position.y=lift+1.3;A.pool.position.y=lift+1.9;A.veil.position.y=lift;
    A.dark.material.color.set(P.d);A.dark.material.opacity=.55*A.fade;A.dark.rotation.z=-t*.05;
    A.v1.material.color.copy(cA);A.v1.material.opacity=.55*f*pulse;A.v1.rotation.z=t*(.35+.25*ph);
    A.v2.material.color.copy(cB);A.v2.material.opacity=.4*f;A.v2.rotation.z=-t*(.6+.35*ph);
    A.pool.material.color.copy(cA);A.pool.material.opacity=.22*f*pulse;
    const VU=A.veilM.uniforms;VU.uT.value=t*(1+.3*ph);VU.uK.value=.42*f;VU.uA.value.copy(cA);VU.uB.value.copy(cB);A.veil.visible=vis;
    // the shadow sits 130 behind her middle, away from the camera
    const cam=R.cam;A.shade.visible=vis&&!!cam;if(cam){o.root.getWorldPosition(V);V.y+=H*.55;V2.copy(V).sub(cam.position).normalize().multiplyScalar(130);V.add(V2);A.root.worldToLocal(V);A.shade.position.copy(V)}
    A.shade.material.color.set(P.d);A.shade.material.opacity=(.62+.08*ph)*A.fade;A.shade.material.rotation=Math.sin(t*.13)*.5;
    for(const s of A.shards){const a=s.ph+t*s.sp*(1+.45*ph);s.m.position.set(Math.cos(a)*s.r,s.y+Math.sin(t*1.7+s.ph)*10,Math.sin(a)*s.r);
      s.m.rotation.set(t*.9+s.ph,t*1.3,0);s.m.visible=vis;s.h.material.color.copy(cA);s.h.material.opacity=.62*f}
    // the crown rides the head bone (in her root's frame); without one it floats near the top of her height
    let cx=0,cy=H*.95,cz=0;if(A.head){A.head.getWorldPosition(V);A.root.worldToLocal(V);cx=V.x;cy=V.y+H*.15;cz=V.z}
    A.crown.visible=vis;A.crown.rotation.y=t*.5;A.crown.position.set(cx,cy+Math.sin(t*1.4)*4,cz);A.ringM.opacity=.8*A.fade;A.crownGlow.material.color.copy(cB);A.crownGlow.material.opacity=.42*f*pulse;
    for(const m of A.shells){const U=m.userData.U;U.uC.value.copy(cA);U.uK.value=(.75+.25*Math.sin(t*3.1))*f}
    for(const tw of A.twins)tw.visible=vis;
    // dark mist curling up around her, pale motes rising (only while she lives and is on screen)
    if(!u.dead&&dt>0&&o.root.visible){const gy=(o.gy!=null?o.gy:R.gY(u.x,u.y))+lift;
      if(R.hi&&R.pfxApi&&Math.random()<dt*(2.4+1.3*ph)){const a=Math.random()*6.283,d=60+Math.random()*100;R.pfxApi.smoke({x:u.x+Math.cos(a)*d,y:gy,z:u.y+Math.sin(a)*d},1,ph===1?'#1c1638':'#0f1c34',40,{a:.34,size:.9,up:.5,c2:'#05080f'})}
      if(Math.random()<dt*(R.hi?7+5*ph:3+2*ph)){const a=Math.random()*6.283,d=40+Math.random()*120;R.sp(true,{x:u.x+Math.cos(a)*d,y:gy+10+Math.random()*30,z:u.y+Math.sin(a)*d,vx:-Math.cos(a)*14,vy:45+Math.random()*50,vz:-Math.sin(a)*14,l:1.4,s:7,s1:1.5,c:Math.random()<.6?P.a:P.b,sp:1})}}
    if(u.dead&&A.fade<=0)dispose(o)}
  const AUR=new Set();
  const _fx=R.fxExtra;R.fxExtra=function(Tm,dt,me,L){const r=_fx.apply(this,arguments);try{dt=Math.min(.1,Math.max(0,dt||0));
      if(this._eclSet)for(const o of this._eclSet){if(o.ecl!=='queen'||!o.u||o.swap||this.objs.get(o.u.id)!==o)continue;
        if(!o.aura){if(o.u.dead||o.auraOff)continue;build(o);AUR.add(o)}step(o,o.u,dt);if(!o.aura)o.auraOff=1}
      for(const o of AUR)if(!o.aura||this.objs.get(o.u.id)!==o){dispose(o);AUR.delete(o)}}catch(e){warn(e)}return r};
  R.queenAura=()=>{for(const o of AUR)if(o.aura)return o.aura;return null};   // for tests
})();
