/* Arena Royale · the Snow Queen's fort (Claude, 2026-11-22 · index only). Render only.
 * World gen (a.js WD.fort) raises a plateau one step up out of the Frozen Sanctuary, east of the Old Town, with one wide stairway
 * from the valley; the queen (snow-queen.js, drawn by eclipse-fx.js) holds the forecourt before her castle's gate. Drawn here:
 *  - the castle: the owner's Aurora Nexus Citadel ('aurora-citadel', Blender, 2026-11-24: glacial keep and bastions, curtain walls,
 *    ice pinnacles, aurora standards, crystal spire, its own processional dais) — owner 2026-11-24 "ปรับขยายปราสาทให้ใหญ่แทนลานเดิม
 *    แล้วปรับปราสาทให้เป็นผลึกแก้วใสสวยงาม": ~1.9x its first fit, standing where the moon court was (a.js FORT_S / FORT_V0), in clear
 *    crystal glass (glassMat: fresnel cover, frosted carving and stained colour from its own texture, an aurora sky and a prism along
 *    its edges, caustic shimmer, glints, a cold light inside at night); its inner court, side yards and open gate are walkable (a.js
 *    FORT_WALK). If the model is ever missing, an ice palace built from simple solids over the same footprint;
 *  - the stairway: 28 Blender ice steps up the ramp between two balustrades, its ice glossier with a cold glow inside, its crystal
 *    rails, posts and step noses lit (owner 2026-11-24: "ปรับบันใดน้ำแข็งทางขึ้นให้สวยยิ่งขึ้น"); on it an aurora runner up the middle
 *    of the steps whose light bands flow up toward the queen and glint along every nose, floating crystal lanterns over the ten
 *    posts, a pool of cold light at the foot, small crystal clusters at the foot and against the cliff, motes drifting up the steps;
 *  - the forecourt: frozen braziers burning blue, ice-tinted guardians at the stair head and either side of the gate;
 *  - ice crystal clusters (faceted, glossy, a cold inner glow), along the forecourt's sides and behind the castle;
 *  - Eternal Winter (the queen's ultimate, aoe 'qwinter'): the air fills with driven snow toward her, frost closes in at the edges of
 *    the screen while it charges, then the forecourt bursts white. Its two warm circles are eclipse-fx's 'usafe'.
 * Entering the plateau shows the castle's name once per visit. Collision, loot and the queen are world gen's and snow-queen.js'. */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined'||(typeof MOON!=='undefined'&&MOON))return;
  const P=R3,T=THREE,A=()=>window.CelestialAssets;
  const warn=(k,e)=>{if(!P['_fortE'+k]){P['_fortE'+k]=1;console.warn('fort',k,e)}};
  const loaded=k=>{const a=A()&&A().get(k);return !!(a&&a.state==='loaded'&&a.inspection&&a.inspection.size)};
  const hash=(x,y)=>{const s=Math.sin(x*12.9898+y*78.233)*43758.5453;return s-Math.floor(s)};
  // ---- materials (through R3.fow: fog of war, cloud shadows, the Sanctuary's snow on top) ----
  const stoneM=R=>R.cached('fort-stone',()=>{const T0=R.tex('rock'),N=R.hi&&R.texN('rock'),p={color:'#d8e6f4',map:T0};if(R.hi){if(N){p.normalMap=N;p.normalScale=new T.Vector2(.8,.8)}
      return R.fow(new T.MeshStandardMaterial(Object.assign({roughness:.86,metalness:0,envMap:R.envTex,envMapIntensity:.7},p)),{key:'fortcut',cut:true})}return R.fow(new T.MeshLambertMaterial(p),{key:'fortcut',cut:true})});
  const iceM=R=>R.cached('fort-ice',()=>R.fow(R.hi?new T.MeshStandardMaterial({color:'#bfe4ff',roughness:.1,metalness:.05,envMap:R.envTex,envMapIntensity:1.5,flatShading:true,emissive:'#2c6a9e',emissiveIntensity:.42,transparent:true,opacity:.9})
      :new T.MeshLambertMaterial({color:'#bfe4ff',flatShading:true,emissive:'#2c6a9e',emissiveIntensity:.42,transparent:true,opacity:.9}),{key:'fortice'}));
  const glowM=R=>R.cached('fort-door',()=>R.fow(R.hi?new T.MeshStandardMaterial({color:'#0b2236',roughness:.5,metalness:0,emissive:'#7fe4ff',emissiveIntensity:1.1})
      :new T.MeshLambertMaterial({color:'#0b2236',emissive:'#7fe4ff',emissiveIntensity:1.1}),{key:'fortglow'}));
  // ---- one geometry per material from many solids (local frame: x across, y up, z toward the valley); UVs from position ----
  function merged(parts){let n=0;const list=parts.map(([g,m])=>{const c=g.index?g.toNonIndexed():g.clone();c.applyMatrix4(m);n+=c.attributes.position.count;return c});
    const pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2);let o=0;
    for(const g of list){const p=g.attributes.position.array,q=g.attributes.normal.array;pos.set(p,o*3);nor.set(q,o*3);
      for(let i=0;i<g.attributes.position.count;i++){const x=p[i*3],y=p[i*3+1],z=p[i*3+2],nx=Math.abs(q[i*3]),ny=Math.abs(q[i*3+1]),nz=Math.abs(q[i*3+2]),k=(o+i)*2;
        if(ny>.6){uv[k]=x/220;uv[k+1]=z/220}else if(nx>nz){uv[k]=z/220;uv[k+1]=y/220}else{uv[k]=x/220;uv[k+1]=y/220}}
      o+=g.attributes.position.count;g.dispose()}
    const out=new T.BufferGeometry();out.setAttribute('position',new T.BufferAttribute(pos,3));out.setAttribute('normal',new T.BufferAttribute(nor,3));out.setAttribute('uv',new T.BufferAttribute(uv,2));out.computeBoundingSphere();return out}
  const M4=(x,y,z,sx,sy,sz,ry,rx)=>new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx||0,ry||0,0,'YXZ')),new T.Vector3(sx,sy,sz));
  // ---- the ice palace (until the owner's Blender castle is in): W x D footprint, gate at +z ----
  function palace(R,W,D){const G=R.G,S=[],I=[],L=[],hw=W/2,hd=D/2,b=36,wallH=200;
    const box=(arr,x,y,z,sx,sy,sz,ry)=>arr.push([G.box,M4(x,y,z,sx,sy,sz,ry)]);
    const tower=(x,z,r,h,roofR,roofH)=>{S.push([G.cyl,M4(x,b+h/2,z,r,h,r)]);S.push([G.cyl,M4(x,b+h+6,z,r*1.12,12,r*1.12)]);
      I.push([G.cone6,M4(x,b+h+12+roofH/2,z,roofR,roofH,roofR)]);for(let k=0;k<3;k++){const a=k/3*Math.PI*2+.5;L.push([G.box,M4(x+Math.sin(a)*r*.98,b+h*(.45+k*.12),z+Math.cos(a)*r*.98,10,34,6,a)])}};
    box(S,0,b/2,0,W+20,b,D+20);                                         // plinth
    box(S,0,b/2-10,hd+34,280,b-12,70);box(S,0,(b-24)/2,hd+64,240,b-24,40);  // steps up to the gate
    box(S,0,b+wallH/2,-hd+22,W-40,wallH,44);for(const s of[-1,1]){box(S,s*(hw-22),b+wallH/2,0,44,wallH,D-60);box(S,s*(hw*.5+65),b+wallH/2,hd-22,hw-130,wallH,44)}
    // merlons along every wall top
    for(let x=-hw+50;x<=hw-50;x+=50){box(S,x,b+wallH+15,-hd+22,26,30,48);if(Math.abs(x)>140)box(S,x,b+wallH+15,hd-22,26,30,48)}
    for(const s of[-1,1])for(let z=-hd+70;z<=hd-70;z+=50)box(S,s*(hw-22),b+wallH+15,z,48,30,26);
    // gatehouse: two square towers, a lintel, the glowing door
    for(const s of[-1,1]){box(S,s*150,b+150,hd-14,84,300,88);box(S,s*150,b+318,hd-14,96,18,100);I.push([G.cone4,M4(s*150,b+380,hd-14,70,120,70,Math.PI/4)])}
    box(S,0,b+232,hd-14,220,56,64);box(L,0,b+105,hd-8,190,210,8);
    // the four corner towers and the keep with its two front towers and the crystal spire
    for(const sx of[-1,1])for(const sz of[-1,1])tower(sx*hw,sz*hd,78,330,98,210);
    box(S,0,b+165,-70,400,330,280);for(const s of[-1,1])L.push([G.box,M4(s*110,b+220,70,14,60,6)]);L.push([G.box,M4(0,b+250,71,22,80,6)]);
    I.push([G.cone4,M4(0,b+330+85,-70,300,170,240,Math.PI/4)]);
    for(const s of[-1,1])tower(s*210,60,56,420,70,170);
    I.push([G.cyl6,M4(0,b+330+130,-70,48,260,48)]);I.push([G.cone6,M4(0,b+330+260+80,-70,48,160,48)]);
    for(const [x,z,s] of[[-60,-150,.7],[70,-160,.6],[0,-200,.5]]){I.push([G.cyl6,M4(x,b+330+70*s,z,26*s,140*s,26*s)]);I.push([G.cone6,M4(x,b+330+140*s+40*s,z,26*s,80*s,26*s)])}
    return{stone:merged(S),ice:merged(I),glow:merged(L)}}
  // ---- crystal geometry: a hexagonal prism with a pointed tip, base at y = 0, 1 tall ----
  function crystalGeo(){const prism=new T.CylinderGeometry(1,1.08,.72,6,1).translate(0,.36,0),tip=new T.ConeGeometry(1,.28,6,1).translate(0,.86,0);
    const g=merged([[prism,new T.Matrix4()],[tip,new T.Matrix4()]]);prism.dispose();tip.dispose();return g}
  // ---- props: the castle model, guardians (ice-tinted), the court circle, braziers ----
  // 'ice': tinted cold; 'cut': see-through when a hero walks behind it (the castle)
  // 'stair': the stair model's own materials by name, glossier ice with a cold glow inside and lit crystal (see-through like 'cut')
  const STAIR_M={Glacier_Ice:{r:.12,env:1.4,e:'#1d5f9e',k:.26},Ice_Crystal:{r:.06,env:1.6,e:'#2f8fe0',k:.7},Deep_Ice:{e:'#0d2c5c',k:.5},Glow:{x:2.4}};
  function remat(R,m,mode){return R.cached('fort-'+mode+'-'+m.uuid,()=>{const c=m.clone();if((mode==='cut'||mode==='stair')&&R.hi&&c.isMeshStandardMaterial){c.envMap=R.envTex;c.envMapIntensity=.75}if(mode==='ice'){if(c.color)c.color.multiply(new T.Color('#cfe6ff'));if('emissive' in c){c.emissive=new T.Color('#16324e');c.emissiveIntensity=.6}}
      const S=mode==='stair'&&STAIR_M[c.name];if(S){if(S.r!==undefined&&'roughness' in c)c.roughness=S.r;if(S.env&&R.hi&&c.isMeshStandardMaterial)c.envMapIntensity=S.env;
        if('emissive' in c){if(S.e){c.emissive=new T.Color(S.e);c.emissiveIntensity=S.k}if(S.x)c.emissiveIntensity=(c.emissiveIntensity||1)*S.x}}
      return R.fow(c,mode==='cut'||mode==='stair'?{key:'fortmcut',cut:true}:{key:'forttint'})})}
  // ---- the castle's clear crystal glass (owner 2026-11-24 "ปรับปราสาทให้เป็นผลึกแก้วใสสวยงาม") ----
  // Two passes over the model, neither writing depth, so whatever stands behind or inside the castle stays in view:
  //  1. absorb (multiplied into the frame): what is seen through the glass takes its tint — deep ice blue at the foot, paler up high,
  //     stronger toward the edges where the light runs through more glass; overlapping walls and towers tint twice, so thick reads
  //     deeper; the model's coloured panels stain it, its bright carving frosts it;
  //  2. light (premultiplied alpha, so the reflections are not dimmed by the glass being clear): a MeshStandardMaterial lit like the
  //     rest of the world (sharp sun glints; the sky's reflection through envTex on high) recomposed before the fog of war — frosted
  //     carving from the model's own texture, an aurora sky and a faint prism along the edges, a crisp rim, a slow caustic shimmer,
  //     twinkling glints, a cold light held inside at night.
  // Per part: light [base cover, edge cover, frost from, frost to], [specular, sky, prism, glints], emissive, absorb strength, order.
  const GLASS={'Glacial Module | Meshy PBR atlas':{g:[.02,.18,.6,1],g2:[1,.45,.4,1.1],e:.75,k:1,o:-6},Ice_Full:{g:[.03,.16,.7,1.2],g2:[.5,.28,.35,.8],k:1.05,o:-8},
    Snow:{g:[.2,.3,.4,.9],g2:[.8,.3,.2,.5],k:.6,o:-9},Ice_Crystal:{g:[.04,.22,.6,1.1],g2:[1.2,.5,.7,1.6],e:.4,k:1.1,o:-5},Glow:{g:[.35,.45,2,3],g2:[1,.5,.4,.5],e:1.8,k:.6,o:-4}};
  const GLASS_FS=`{vec3 gN=normalize(normal),gV=normalize(vViewPosition);float nv=clamp(dot(gN,gV),0.,1.),fr=pow(1.-nv,2.4);
 vec3 wR=inverseTransformDirection(reflect(-gV,gN),viewMatrix);float up=wR.y;
 vec3 sky=mix(vec3(.45,.7,.96),vec3(.08,.2,.5),smoothstep(-.15,.85,up));
 float au=.5+.5*sin(wR.x*2.6+wR.z*1.3+uTime*.11+1.7*sin(wR.z*3.1-uTime*.17)),band=smoothstep(.05,.45,up)*(1.-smoothstep(.55,.98,up));
 sky+=mix(vec3(.15,1.,.72),vec3(.62,.38,1.),au)*band*au*au*.85;
 vec3 tc=diffuseColor.rgb;float lum=dot(tc,vec3(.2126,.7152,.0722)),sat=max(tc.r,max(tc.g,tc.b))-min(tc.r,min(tc.g,tc.b));
 float frost=smoothstep(uGlass.z,uGlass.w,lum);
 vec3 tint=mix(vec3(.8,.93,1.),tc/max(lum,.04)*.5,smoothstep(.1,.4,sat));
 float a=clamp(uGlass.x+frost*.18+fr*uGlass.y,0.,1.);
 vec3 prism=.55+.45*cos(6.2832*(vec3(0.,.33,.67)+fr*1.6+dot(wR,vec3(.9,.3,.6))));
 vec3 wp=vec3(vFowW.x,vWY,vFowW.y),cp=floor(wp/9.),fp=fract(wp/9.)-.5;float hs=fract(sin(dot(cp,vec3(12.9898,78.233,37.719)))*43758.5453);
 float spk=step(.93,hs)*pow(max(0.,sin(uTime*(1.6+hs*2.2)+hs*40.)),12.)*smoothstep(.3,0.,length(fp))*(.4+fr);
 float cs=sin(wp.x*.045+uTime*.6)+sin(wp.z*.051-uTime*.47)+sin((wp.x+wp.y)*.033+uTime*.39),caus=pow(1.-abs(cs)/3.,10.);
 float night=1.-uCloud;
 vec3 col=totalDiffuse*tint*(.15+.85*frost)*a+totalSpecular*uGlass2.x+sky*fr*uGlass2.y+vec3(.72,.9,1.)*pow(fr,3.)*uGlass2.y*.35+prism*fr*fr*uGlass2.z
   +totalEmissiveRadiance+vec3(.55,.88,1.)*caus*(.16+.45*night)*(.3+a)+tint*vec3(.1,.24,.44)*night*(.35+.65*frost)*(.4+a)+vec3(1.,.97,.9)*spk*uGlass2.w;
 gl_FragColor=vec4(col/max(a,.03),a);}
`;
  function glassMat(R,src){const G=GLASS[src.name]||GLASS.Ice_Full;return R.cached('fort-glass-'+src.uuid,()=>{
    const m=new T.MeshStandardMaterial({name:src.name,color:'#ffffff',map:src.map||null,normalMap:src.normalMap||null,roughness:.12,metalness:0,
      transparent:true,depthWrite:false,premultipliedAlpha:true});
    if(src.color&&!src.map)m.color.copy(src.color);
    if(m.normalMap)m.normalScale=new T.Vector2(1.15,1.15);
    if(G.e){const e=src.emissive,lit=e&&e.r+e.g+e.b>.01;m.emissive=lit?e.clone():new T.Color('#2f9fff');m.emissiveMap=lit&&src.emissiveMap||null;m.emissiveIntensity=G.e*(lit&&src.emissiveIntensity||1)}
    if(R.hi&&R.envTex){m.envMap=R.envTex;m.envMapIntensity=.6}
    R.fow(m,{key:'fortglass',cut:true});
    const U={uGlass:{value:new T.Vector4(...G.g)},uGlass2:{value:new T.Vector4(...G.g2)}},ob=m.onBeforeCompile,ck=m.customProgramCacheKey;
    m.onBeforeCompile=function(sh,rd){if(ob)ob.call(this,sh,rd);Object.assign(sh.uniforms,U);
      sh.fragmentShader='uniform vec4 uGlass,uGlass2;\n'+sh.fragmentShader.replace('#include <opaque_fragment>',GLASS_FS)};
    m.customProgramCacheKey=()=>(ck?ck.call(m):'')+'|glass2';m.userData.glassOrder=G.o;return m})}
  const ABS_VS=`varying vec3 vW,vN;varying vec2 vUv;
void main(){vec4 p=vec4(position,1.);vec3 n=normal;
#ifdef USE_INSTANCING
mat3 im=mat3(instanceMatrix);p=instanceMatrix*p;n/=vec3(dot(im[0],im[0]),dot(im[1],im[1]),dot(im[2],im[2]));n=im*n;
#endif
vec4 w=modelMatrix*p;vW=w.xyz;vN=mat3(modelMatrix)*n;vUv=uv;gl_Position=projectionMatrix*viewMatrix*w;}`;
  const ABS_FS=`uniform vec3 uAbsA,uAbsB;uniform vec2 uAbsY,uFowC;uniform float uAbsK,uFowH,uHasMap,uHasNrm;uniform sampler2D uMap,uNrm;varying vec3 vW,vN;varying vec2 vUv;
void main(){
 {vec2 cd=vW.xz-uFowC;float ax=abs(cd.x);if(cd.y>25.&&ax<170.){float lim=uFowH+cd.y*1.48-26.+ax*.9;if(vW.y>lim){float hn=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);if(hn<smoothstep(0.,30.,vW.y-lim)*smoothstep(170.,110.,ax))discard;}}}
 vec3 n=normalize(vN),v=normalize(cameraPosition-vW);float fr=pow(1.-abs(dot(n,v)),2.);
 vec3 ab=mix(uAbsA,uAbsB,smoothstep(uAbsY.x,uAbsY.y,vW.y));
 float hue=.5+.5*sin(vW.x*.0031+vW.z*.0023+sin(vW.y*.004+vW.x*.0017)*1.6);ab=mix(ab,ab*vec3(1.08,.82,1.)+vec3(.06,0.,0.),hue*.55);   // aurora: cyan drifting to violet
 if(uHasMap>.5){vec3 tc=texture2D(uMap,vUv).rgb;float l=dot(tc,vec3(.2126,.7152,.0722)),s=max(tc.r,max(tc.g,tc.b))-min(tc.r,min(tc.g,tc.b));
   ab=mix(ab,clamp(tc/max(l,.04)*.45,0.,1.),smoothstep(.1,.4,s)*.8);ab=mix(ab,vec3(.86,.9,.95),smoothstep(.6,1.,l)*.25);}
 if(uHasNrm>.5){vec2 d=texture2D(uNrm,vUv).xy*2.-1.;ab*=mix(1.,.7,smoothstep(.12,.55,length(d)));}   // carved edges read deeper
 gl_FragColor=vec4(mix(vec3(1.),ab,min(1.,uAbsK*(.72+.28*fr))),1.);
 #include <colorspace_fragment>
}`;   // a linear factor: on the screen (low quality) it is encoded like any colour, so both qualities tint alike
  // y0: the castle's base; its tint runs from deep at the foot to pale by 4 model metres up
  function absMat(R,src,y0,S){const G=GLASS[src.name]||GLASS.Ice_Full,m=R.cached('fort-gabs-'+src.uuid,()=>{
    const m=new T.ShaderMaterial({vertexShader:ABS_VS,fragmentShader:ABS_FS,transparent:true,depthWrite:false,
      blending:T.CustomBlending,blendEquation:T.AddEquation,blendSrc:T.ZeroFactor,blendDst:T.SrcColorFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,
      uniforms:{uAbsA:{value:new T.Color(.1,.3,.8)},uAbsB:{value:new T.Color(.3,.56,.95)},uAbsY:{value:new T.Vector2(y0+.4*S,y0+4*S)},uAbsK:{value:G.k},
        uMap:{value:src.map||null},uHasMap:{value:src.map?1:0},uNrm:{value:src.normalMap||null},uHasNrm:{value:src.normalMap?1:0},uFowC:R.U.fowC,uFowH:R.U.fowH}});
    m.name='fort-glass-absorb';return m});m.uniforms.uAbsY.value.set(y0+.4*S,y0+4*S);return m}
  // the citadel at the world's fit (a.js: FORT_S game units per model metre round the GLB's bounds centre F.castle), sunk until its
  // processional dais is flush with the plateau (the snow bed of its courts lies under the plateau's own snow)
  const DAIS=.464;   // model metres: the top of the citadel's processional dais (its courts' snow bed is .3)
  function placeGlass(R,C,y0){const s=A().get('aurora-citadel').inspection.size,parts=R.celestialAsset('aurora-citadel'),S=C.s||FORT_S;if(!parts)return 0;
    const put=(geo,mat,order)=>{for(const im of R.instC(geo,mat,[C],(q,add)=>add(q.x,y0,q.y,s[0]*S,s[1]*S,s[2]*S,0,q.a,0,null),false,null,9000))im.renderOrder=order};
    for(const p of parts){const one=Array.isArray(p.mat)?p.mat[0]:p.mat,o=(GLASS[one.name]||GLASS.Ice_Full).o;
      if(one.name!=='Glow')put(p.geo,Array.isArray(p.mat)?p.mat.map(m=>absMat(R,m,y0,S)):absMat(R,p.mat,y0,S),o-10);
      put(p.geo,Array.isArray(p.mat)?p.mat.map(m=>glassMat(R,m)):glassMat(R,p.mat),o)}
    return 1}
  function place(R,key,list,fit,mode){if(!list.length||!loaded(key))return 0;const s=A().get(key).inspection.size,parts=R.celestialAsset(key);if(!parts)return 0;
    for(const p of parts){const mat=mode?(Array.isArray(p.mat)?p.mat.map(m=>remat(R,m,mode)):remat(R,p.mat,mode)):p.mat;
      R.instC(p.geo,mat,list,(q,add)=>{const f=fit(q,s);add(q.x,(q.y0!==undefined?q.y0:R.gY(q.x,q.y))+(q.dy||0),q.y,f[0],f[1],f[2],0,q.a,0,null)},true,null,2600)}
    return list.length}
  P.buildFort=function(){this.fortStair=this.fortCourt=null;const F=WD&&WD.fort;if(!F)return;const R=this,face=Math.atan2(-F.ox,-F.oy),P2=(u,v)=>cityXY(F,u,v),
      M=(x,z)=>P2(x*FORT_S,FORT_V0-z*FORT_S);
    // the castle: the owner's citadel in clear crystal glass where the court was (its dais, model y DAIS, flush with the plateau);
    // an ice palace over the same footprint if the model ever fails
    const C=F.castle,gate=F.gate||M(0,FORT_ZF);
    this.fortGlass=null;const S=C.s||FORT_S,yb=this.gY(gate.x,gate.y)-DAIS*S+3;   // yb: the model's base (its y 0)
    if(loaded('aurora-citadel')&&placeGlass(this,C,yb)){this.fortModel='aurora-citadel';
      // light caught in the glass: the gate's two crystal pillars, the keep's door over the inner court
      for(const sg of[-1,1]){const q=M(sg*1.37,2.08);this.glows.push([q.x,yb+2.62*S,q.y,'#9fe8ff',260])}
      {const d=M(0,.42);this.glows.push([d.x,yb+.95*S,d.y,'#bfefff',300])}this.fortGlass={x:C.x,y:C.y,yb,S}}
    else{const c=M(0,(FORT_ZF-2.25)/2),pal=palace(this,8.6*FORT_S,(FORT_ZF+2.25)*FORT_S);for(const [g,m,sh] of[[pal.stone,stoneM(this),true],[pal.ice,iceM(this),true],[pal.glow,glowM(this),false]]){
        const me=new T.Mesh(g,m);me.position.set(c.x,this.gY(c.x,c.y)-4,c.y);me.rotation.y=face;me.castShadow=!!this.hi&&sh;me.receiveShadow=true;this.scene.add(me)}this.fortModel='palace'}
    const start=FORT_SB,end=FORT_OF+10,steps=Object.assign(P2(0,(start+end)/2),{a:face,y0:0});
    if(place(this,'snow-stairs',[steps],(q,size)=>size.map(d=>d*100),'stair')){this.fortStairModel='snow-stairs';try{this.fortStairFx(steps,face)}catch(e){warn('stairfx',e)}}
    else{
      this.fortStairModel='ramp';
      const n=28,dv=(end-start)/n,st=R.inst(R.G.box,stoneM(R),n,true);
      for(let i=0;i<n;i++){
        const q=P2(0,start+(i+.5)*dv),top=FORT_P*(i+1)/n;
        R.setI(st,i,q.x,top-20,q.y,2*FORT_SH,40,dv+.6,0,face,0);
      }
      st.instanceMatrix.needsUpdate=true;st.computeBoundingSphere();
    }
    // guardians (ice-tinted), braziers burning blue
    const by=new Map();for(const q of F.props){if(q.k==='snow-castle'||q.k==='aurora-citadel')continue;if(!by.has(q.k))by.set(q.k,[]);by.get(q.k).push(q)}
    for(const [k,list] of by)place(this,k,list,(q,s)=>{const f=q.h?q.h/s[1]:1;return[s[0]*f,s[1]*f,s[2]*f]},list[0].ice?'ice':null);
    if(F.braziers.length){if(loaded('brazier'))place(this,'brazier',F.braziers.map(b=>Object.assign({},b,{a:face})),(q,s)=>{const f=90/s[1];return[s[0]*f,90,s[2]*f]},'ice');
      else this.instC(this.G.cylT,stoneM(this),F.braziers,(b,add)=>add(b.x,this.gY(b.x,b.y)+30,b.y,30,60,30,0,0,0,null),true);
      for(const b of F.braziers)this.glows.push([b.x,this.gY(b.x,b.y)+104,b.y,'#8fe6ff',230])}
    // ice crystal clusters: n faceted crystals leaning out of a common root
    {const geo=crystalGeo(),list=[];for(const c of F.crystals){const n=c.n,h0=hash(c.x,c.y);for(let i=0;i<n;i++){const hh=hash(c.x+i*7.1,c.y-i*3.3),a=c.a+i/n*Math.PI*2+hh,d=i?c.r*(.25+.45*hh):0;
        list.push({x:c.x+Math.cos(a)*d,y:c.y+Math.sin(a)*d,h:c.h*(i?.45+.5*hash(c.y+i,c.x):1),r:c.r*(i?.16+.12*hh:.24),tx:i?Math.cos(a)*(.25+.35*h0):0,tz:i?Math.sin(a)*(.25+.35*h0):0,ry:hh*6.28})}}
      this.instC(geo,iceM(this),list,(c,add)=>add(c.x,this.gY(c.x,c.y)-8,c.y,c.r,c.h,c.r,c.tz,c.ry,-c.tx,null),!!this.hi,null,2600)}};
  // ---- the stairway's light, in the stair model's own frame (x100: x ±1.61, y 0..3.39, z ±2.5; 28 steps of rise .0857 and run .1786
  // from the valley at +z up to the plateau at -z; a crystal strip on every nose; crystal posts at x ±1.405, z -2.29 -1.16 0 1.19 2.2) ----
  const ST={n:28,rise:2.4/28*100,run:5/28*100,z0:250,hw:56,lift:.7,nose:122,px:140.5,posts:[[-229,339],[-116,264],[0,209],[119,152],[220,123]]};
  const RUN_VS='attribute vec3 aP;varying vec3 vP;void main(){vP=aP;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
  const RUN_FS=`uniform float uT,uK;uniform vec3 uA,uB;varying vec3 vP;
void main(){float t=vP.x,w=abs(vP.y),band=pow(.5+.5*sin((t*5.-uT*.42)*6.2832),8.),a;vec3 c=mix(uA,uB,smoothstep(.05,.95,t));
  if(vP.z<.5){float edge=1.-smoothstep(.45,1.,w),core=1.-smoothstep(0.,.3,w),shim=.5+.5*sin(t*70.-uT*2.3+vP.y*2.);a=(edge*(.13+.07*shim+.5*band)+core*.06)*smoothstep(0.,.05,t);}
  else a=(1.-smoothstep(.88,1.,w))*(.28+1.1*band);
  gl_FragColor=vec4(c*a*uK,1.);
  #include <colorspace_fragment>
}`;
  P.fortStairFx=function(steps,face){const S=ST,g=new T.Group();g.position.set(steps.x,0,steps.y);g.rotation.y=face;this.scene.add(g);g.updateMatrixWorld(true);
    // the runner (one riser and one tread per step, a lead-in on the valley floor) and the glint on each nose; aP = (path 0..1, across -1..1, kind)
    const pos=[],ap=[],ix=[],Lt=S.n*(S.rise+S.run)+40,H=S.hw,lf=S.lift,W=[-1,1,1,-1];
    const quad=(v,t0,t1,k)=>{const i=pos.length/3;for(let j=0;j<4;j++){pos.push(v[j][0],v[j][1],v[j][2]);ap.push((j<2?t0:t1)/Lt,W[j],k)}ix.push(i,i+1,i+2,i,i+2,i+3)};
    quad([[-H,lf,S.z0+40],[H,lf,S.z0+40],[H,lf,S.z0+lf],[-H,lf,S.z0+lf]],0,40,0);let s=40;
    for(let k=1;k<=S.n;k++){const zf=S.z0-S.run*(k-1)+lf,y0=S.rise*(k-1)+lf,y1=S.rise*k+lf,N=S.nose;
      quad([[-H,y0,zf],[H,y0,zf],[H,y1,zf],[-H,y1,zf]],s,s+S.rise,0);s+=S.rise;
      quad([[-H,y1,zf],[H,y1,zf],[H,y1,zf-S.run],[-H,y1,zf-S.run]],s,s+S.run,0);
      quad([[-N,y1+.25,zf+.2],[N,y1+.25,zf+.2],[N,y1+.25,zf-4.6],[-N,y1+.25,zf-4.6]],s,s,1);s+=S.run}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('aP',new T.Float32BufferAttribute(ap,3));geo.setIndex(ix);geo.computeBoundingSphere();
    const mat=new T.ShaderMaterial({uniforms:{uT:{value:0},uK:{value:this.hi?1:.85},uA:{value:new T.Color('#4fd2ff')},uB:{value:new T.Color('#a58bff')}},vertexShader:RUN_VS,fragmentShader:RUN_FS,
      transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const run=new T.Mesh(geo,mat);run.userData.ownMat=1;run.renderOrder=3;g.add(run);
    // floating crystal lanterns over the ten posts, each with a halo, and the posts' light in the static glows
    const oct=new T.OctahedronGeometry(1,0),lm=new T.MeshBasicMaterial({color:'#e4f7ff',toneMapped:false}),
      hm=new T.SpriteMaterial({map:this.tex('wglow'),color:'#7fd8ff',transparent:true,opacity:.55,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:false}),lan=[],v=new T.Vector3();
    S.posts.forEach(([z,top],i)=>{for(const sx of[-1,1]){const m=new T.Mesh(oct,lm),h=new T.Sprite(hm),y=top+32;m.scale.set(6.5,15,6.5);m.position.set(sx*S.px,y,z);h.position.copy(m.position);h.scale.set(66,66,1);
      m.userData.ownMat=h.userData.ownMat=1;g.add(m,h);lan.push({m,h,y,ph:i*1.3+(sx>0?.7:0)});v.set(sx*S.px,top+6,z);g.localToWorld(v);this.glows.push([v.x,v.y,v.z,'#8fe6ff',150])}});
    // a pool of cold light at the foot
    const pool=new T.Mesh(this.G.plane,new T.MeshBasicMaterial({map:this.tex('wglow'),color:'#5fd0ff',transparent:true,opacity:.24,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:false}));
    pool.position.set(0,1.2,S.z0+40);pool.scale.set(420,1,170);pool.userData.ownMat=1;pool.renderOrder=2;g.add(pool);   // G.plane already lies flat
    // small crystal clusters (no collision, like world gen's small ones) at the foot, hugging the side walls, and against the cliff either side
    const geo2=crystalGeo(),list=[],cf=Math.cos(face),sf=Math.sin(face);
    const cl=(lx,lz,h,n,sd)=>{for(let i=0;i<n;i++){const hh=hash(sd+i*3.7,sd*1.3-i),a=i/n*6.283+hh*2,d=i?14+16*hh:0,dx=Math.cos(a),dz=Math.sin(a);v.set(lx+dx*d,0,lz+dz*d);g.localToWorld(v);
        const wx=cf*dx+sf*dz,wz=-sf*dx+cf*dz;list.push({x:v.x,y:v.z,h:h*(i?.4+.4*hash(sd-i,i*5.1):1),r:i?6+5*hh:11,tx:i?wx*.4:0,tz:i?wz*.4:0,ry:hh*6.28})}};
    for(const sx of[-1,1]){cl(sx*188,212,118,5,11+sx);cl(sx*205,268,74,4,23+sx);cl(sx*214,-212,150,5,37+sx);cl(sx*246,-168,92,4,51+sx)}
    this.instC(geo2,iceM(this),list,(c,add)=>add(c.x,this.gY(c.x,c.y)-6,c.y,c.r,c.h,c.r,c.tz,c.ry,-c.tx,null),!!this.hi,null,2600);
    this.fortStair={g,mat,lan,t:0,x:steps.x,y:steps.y,cf,sf}};
  // per frame: the runner's light flows up, the lanterns bob and turn; motes drift up the steps when the hero is near
  P.fortStairStep=function(dt,L){const Q=this.fortStair;if(!Q||!Q.g.parent)return;Q.t+=dt;const t=Q.t;Q.mat.uniforms.uT.value=t;
    for(const l of Q.lan){l.m.position.y=l.y+Math.sin(t*1.5+l.ph)*5;l.m.rotation.y=t*.8+l.ph;l.h.position.y=l.m.position.y;l.h.material.opacity=.45+.12*Math.sin(t*2.2+l.ph)}
    if(!L||dt<=0||Math.hypot(L.x-Q.x,L.y-Q.y)>1500||Math.random()>dt*(this.hi?7:3))return;
    const S=ST,k=1+Math.floor(Math.random()*S.n),lx=(Math.random()*2-1)*110,lz=S.z0-S.run*(k-.5),ly=S.rise*k+4;
    this.sp(true,{x:Q.x+Q.cf*lx+Q.sf*lz,y:ly,z:Q.y-Q.sf*lx+Q.cf*lz,vx:0,vy:22+Math.random()*26,vz:0,l:2.2,s:7,s1:1.5,c:Math.random()<.55?'#bff0ff':'#c8b8ff',sp:1})};
  // built with the rest of the props
  const _bp=P.buildProps;P.buildProps=function(){const r=_bp.apply(this,arguments);try{this.buildFort()}catch(e){warn('build',e)}return r};
  // ---- per frame: the castle's name, the braziers' blue flames, Eternal Winter ----
  let frost=null;const frostDom=()=>{if(frost||typeof document==='undefined')return frost;frost=document.createElement('div');
    frost.style.cssText='position:fixed;inset:0;z-index:6;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,#ffffff00 38%,#d8f0ffcc 80%,#ffffffee 100%);mix-blend-mode:screen';
    document.body.appendChild(frost);return frost};
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r=_fx.apply(this,arguments);try{const F=WD&&WD.fort;if(this.fortStair)this.fortStairStep(Math.min(.1,Math.max(0,dt||0)),typeof state!=='undefined'&&state==='play'?L:null);
      if(!F||!L||typeof state==='undefined'||state!=='play')return r;
      const inF=fortIn(L.x,L.y,-120)&&fortBase(L.x,L.y)>FORT_P-1;if(inF&&!this._inFort&&typeof gameT!=='undefined'&&gameT>3)announce={txt:'❄️ '+F.name+' — ราชินีหิมะรอผู้กล้าอยู่หน้าประตูปราสาทผลึก',t:3.4};this._inFort=inF;
      const near=Math.hypot(L.x-F.x,L.y-F.y)<4200;
      if(near&&dt>0){for(const b of F.braziers){if(Math.random()>dt*9)continue;const y=this.gY(b.x,b.y)+92;this.sp(true,{x:b.x+(Math.random()-.5)*16,y,z:b.y+(Math.random()-.5)*16,vy:60+Math.random()*60,l:.7,s:22,s1:4,c:'#bff2ff',c2:'#3a8ad8',sp:1})}}
      // glints rising through the crystal castle while a hero is near it
      const Gl=this.fortGlass;if(Gl&&dt>0&&Math.hypot(L.x-Gl.x,L.y-Gl.y)<2600&&Math.random()<dt*(this.hi?9:3.5)){const x=(Math.random()*2-1)*4.2,z=-2.1+Math.random()*4,q=cityXY(F,x*Gl.S,FORT_V0-z*Gl.S);
        this.sp(true,{x:q.x,y:Gl.yb+Gl.S*(.6+Math.random()*1.6),z:q.y,vx:0,vy:14+Math.random()*18,vz:0,l:2.6,s:8,s1:1.5,c:Math.random()<.6?'#d8f6ff':'#cdbcff',sp:1})}
      // Eternal Winter: driven snow pulled toward the queen while it charges, frost at the screen's edges, a white burst at the end
      let fr=0;for(const a of aoes){if(a.kind!=='qwinter')continue;const d=Math.hypot(a.x-L.x,a.y-L.y);if(d>a.r+900)continue;
        const k=a.t<a.delay?a.t/a.delay:0;fr=Math.max(fr,a.t<a.delay?k*.38:Math.max(0,a.fxT||0)/(a.vis||1)*.45);
        if(a.t<a.delay&&Math.random()<dt*60){const an=Math.random()*6.283,rr=a.r*(.35+.65*Math.random()),x=a.x+Math.cos(an)*rr,z=a.y+Math.sin(an)*rr;
          this.sp(true,{x,y:this.gY(x,z)+20+Math.random()*160,z,vx:(a.x-x)*.9,vy:-10,vz:(a.y-z)*.9,l:1.1,s:14,s1:3,c:'#ffffff',sp:1})}
        // clients rebuild their areas every snapshot: the burst is remembered by place, not on the area
        if(a.t>=a.delay){const B=this._fortBursts||(this._fortBursts=new Map()),key=(a.x|0)+','+(a.y|0),now=performance.now();if(!(now-(B.get(key)||-1e9)<4000)){B.set(key,now);this.ring(a.x,a.y,40,a.r,'#e8f6ff',1.2);this.ring(a.x,a.y,30,a.r*.55,'#ffffff',.8);if(this.eclFlash)this.eclFlash('#e8f6ff',.3)}}}
      const D=fr>0||frost?frostDom():null;if(D){this._fortFr=(this._fortFr||0)+(fr-(this._fortFr||0))*Math.min(1,dt*5);D.style.opacity=this._fortFr.toFixed(3)}}
    catch(e){warn('fx',e)}return r};
})();
