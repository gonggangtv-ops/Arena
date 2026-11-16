// ===================== Visual pass 3: rim-lit units, armour plates, rune circles, light pillars =====================
(()=>{const P=R3,_fow=P.fow,_qnMat=P.qnMat,_gen=P.genTex,_impact=P.impact,_aoe=P.aoeVis,_fxx=P.fxExtra;
  // cool rim light on every character model so figures separate from the dark ground
  const RIM=fs=>fs.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n{float rimK=pow(1.-clamp(dot(normalize(vViewPosition),normal),0.,1.),2.4);totalEmissiveRadiance+=vec3(.5,.6,.85)*rimK*.26;}');
  P.fow=function(m,o){if(this._rim&&o&&o.key==='qn')o=Object.assign({},o,{key:'qnRim',frag:RIM});return _fow.call(this,m,o)};
  P.qnMat=function(src,o){if(o&&o.em)o=Object.assign({},o,{em:[o.em[0],o.em[1]*.4]});this._rim=1;try{return _qnMat.call(this,src,o)}finally{this._rim=0}};
  // textures: a rune circle for the ground and a soft vertical beam
  P.genTex=function(k){
    if(k==='rune'){const N=512,c=this.cvs(N),x=c.getContext('2d'),R=N/2,rnd=mulberry32(77);x.translate(R,R);x.strokeStyle='#fff';x.fillStyle='#fff';x.lineCap='round';
      const g=x.createRadialGradient(0,0,R*.2,0,0,R);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.8,'rgba(255,255,255,.1)');g.addColorStop(.97,'rgba(255,255,255,.3)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.arc(0,0,R,0,7);x.fill();
      const ring=(r,w)=>{x.lineWidth=w;x.beginPath();x.arc(0,0,r,0,7);x.stroke()};ring(R*.965,5);ring(R*.9,2);ring(R*.74,2.5);ring(R*.7,1.2);ring(R*.36,2);
      for(let i=0;i<48;i++){const a=i/48*6.2832,l=i%4===0?.05:.025;x.lineWidth=i%4===0?3:1.5;x.beginPath();x.moveTo(Math.cos(a)*R*.9,Math.sin(a)*R*.9);x.lineTo(Math.cos(a)*R*(.9-l),Math.sin(a)*R*(.9-l));x.stroke()}
      for(const off of[0,Math.PI/3]){x.lineWidth=2.5;x.beginPath();for(let i=0;i<3;i++){const a=off+i*2.0944-1.5708;x[i?'lineTo':'moveTo'](Math.cos(a)*R*.7,Math.sin(a)*R*.7)}x.closePath();x.stroke()}
      for(let i=0;i<14;i++){const a=i/14*6.2832;x.save();x.rotate(a);x.translate(0,-R*.82);x.lineWidth=2.4;x.beginPath();const n=2+Math.floor(rnd()*3);for(let j=0;j<n;j++){x.moveTo((rnd()-.5)*20,(rnd()-.5)*22);x.lineTo((rnd()-.5)*20,(rnd()-.5)*22)}x.stroke();if(rnd()<.5){x.beginPath();x.arc(0,0,5,0,7);x.stroke()}x.restore()}
      return{c,rep:false}}
    if(k==='beam'){const c=this.cvs(8,128),x=c.getContext('2d'),g=x.createLinearGradient(0,128,0,0);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,8,128);return{c,rep:false}}
    return _gen.call(this,k)};
  // pillar of light that shoots up from big impacts
  P.pillar=function(x,y,r,c,life){(this.pillars=this.pillars||[]).length<10&&this.pillars.push({x,y,r,c,t:0,life:life||.6})};
  P.drawPillars=function(dt){if(!this.pillars||!this.pillars.length)return;this.pillars=this.pillars.filter(p=>(p.t+=dt)<p.life);
    for(const p of this.pillars){const k=p.t/p.life,gy=this.gY(p.x,p.y);for(let i=0;i<2;i++){const m=this.get('pillar',()=>{const g=new THREE.CylinderGeometry(1,1,1,18,1,true);g.translate(0,.5,0);const mm=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:this.tex('beam'),color:'#ffffff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false}));mm.renderOrder=8;mm.frustumCulled=false;mm.userData.ownMat=1;return mm});
        const rr=p.r*(i?.07:.2)*(1-k*.6);m.material.color.set(i?'#ffffff':p.c).multiplyScalar((this.post?1.6:1)*(i?1:.8));m.material.opacity=Math.pow(1-k,1.5)*(i?.85:.4);m.position.set(p.x,gy,p.y);m.scale.set(rr,700+k*500,rr);m.rotation.y=k*2+i}}};
  P.fxExtra=function(T,dt,me,L){_fxx.call(this,T,dt,me,L);this.drawPillars(dt)};
  P.impact=function(a){_impact.call(this,a);const gy=this.gY(a.x,a.y),c=FX_COL[a.kind]||AOE_COL[a.kind]||'#ffffff',r=a.r||200,big=r>=230||a.kind==='meteor'||a.kind==='judg'||a.kind==='line';
    this.decal({x:a.x,y:a.y,r:r*1.02,c,life:big?1.3:.9,tex:'rune',spin:1.6,a:.85,fade:.7});
    if(big){this.pillar(a.x,a.y,r,c,.7);const n=this.hi?6:3;for(let i=0;i<n;i++){const an=Math.random()*6.283,d=rand(r*.15,r*.85),bx=a.x+Math.cos(an)*d,bz=a.y+Math.sin(an)*d;this.bolt(bx+rand(-60,60),gy+820,bz+rand(-60,60),bx,this.gY(bx,bz),bz,c,rand(.16,.34),4)}
      for(let i=0;i<(this.hi?26:10);i++){const an=Math.random()*6.283,d=rand(0,r*.9);this.sp(true,{x:a.x+Math.cos(an)*d,y:gy+6,z:a.y+Math.sin(an)*d,vx:rand(-20,20),vy:rand(90,300),vz:rand(-20,20),l:rand(.8,1.7),s:rand(7,13),s1:1,c,sp:1,dr:.3})}}};
  // rune circle under every telegraphed / lingering skill area
  P.aoeVis=function(a,T,dt,L){_aoe.call(this,a,T,dt,L);const S=this.runeSeen||(this.runeSeen=new Map()),key=a.x+'_'+a.y+'_'+a.kind,now=performance.now()/1000,e=S.get(key);
    if(e===undefined||(a.dot&&now>e)){const pre=a.t<a.delay,life=a.dot?2.4:Math.max(.3,a.delay-a.t)+.25;if(pre&&a.delay-a.t<.2&&!a.dot){S.set(key,now+3);return}
      S.set(key,now+life-.3);this.decal({x:a.x,y:a.y,r:(a.r||160)*.98,c:FX_COL[a.kind]||AOE_COL[a.kind]||'#ffffff',life,tex:'rune',spin:a.dot?.5:-.9,a:a.dot?.5:.7,fade:.3});if(S.size>80){for(const [k2,v] of S)if(now>v+6)S.delete(k2)}}};
  // ---- class look: cape, plate pieces and helm coloured by the weapon line; more pieces as the armour tier rises ----
  const TH={shadow:{cape:'#2c1a4e',trim:'#b06cff',metal:'#4a4460',glow:'#b060ff'},royal:{cape:'#b81e2e',trim:'#e0b040',metal:'#b98a30',glow:'#ffb030'},
    nature:{cape:'#2f7d3c',trim:'#e0d86a',metal:'#93a04c',glow:'#9dff5a'},arcane:{cape:'#2a3296',trim:'#e8c860',metal:'#6464c8',glow:'#8a9cff'},frost:{cape:'#3d8fd6',trim:'#eef8ff',metal:'#b6d2e8',glow:'#7fe0ff'}};
  const WTH={dagger:'shadow',sword:'royal',gsword:'royal',axe:'royal',bow:'nature',xbow:'nature',fire:'arcane',storm:'arcane',frost:'frost',MM:'royal',MS:'royal',MR:'shadow',RS:'nature',RR:'nature',SS:'arcane'};
  P.capeGeo=function(k){const C=this.capeG||(this.capeG={});if(C[k])return C[k];const T=TH[k],c1=new THREE.Color(T.cape),c2=new THREE.Color(T.trim),c3=c1.clone().multiplyScalar(.6),nx=6,ny=8,p=[],col=[],idx=[];
    for(let j=0;j<=ny;j++){const t=j/ny,hw=lerp(.2,.42,Math.pow(t,.8));for(let i=0;i<=nx;i++){const s=i/nx*2-1,x=s*hw,ruf=Math.sin(s*7)*.025*t;p.push(x,-t*1.02-(Math.abs(s)>.99?0:Math.cos(s*9)*.02*t),-Math.pow(t,1.5)*.16+s*s*.07*(1-t*.6)+ruf);
        const edge=Math.abs(s)>.72||t>.9,c=edge?c2:(j%2?c1:c3.clone().lerp(c1,.6));col.push(c.r,c.g,c.b);if(i<nx&&j<ny){const a=j*(nx+1)+i,b=a+1,d=a+nx+1,e=d+1;idx.push(a,d,b,b,d,e)}}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return C[k]=g};
  P.qnGear=function(o,u){if(o.gear)for(const m of o.gear)if(m.parent)m.parent.remove(m);o.gear=[];o.cape=null;const B=o.bones,F=u.wk&&FUSED[u.wk],key=F?F.arch:u.wk,tn=WTH[key];if(!B||!tn||typeof QW==='undefined')return;
    QW.init();const G=QW.g,T=TH[tn],at=u.at|0,glow=F?F.glow:T.glow;
    const mc='#'+new THREE.Color(T.metal).lerp(new THREE.Color('#8d939c'),at>=3?0:at===2?.3:.55).getHexString(),M=this.std(mc,.46,.8),TR=this.std(T.trim,.42,.8),DK=this.std('#2c2f36',.5,.75),GM=this.std(glow,.25,.1,{emissive:glow,emissiveIntensity:1.7});
    const add=(bn,geo,mat,x,y,z,sx,sy,sz,rx,rz)=>{const b=typeof bn==='string'?B[bn]:bn;if(!b)return null;const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);if(rx||rz)m.rotation.set(rx||0,0,rz||0);if(this.hi)m.castShadow=true;b.add(m);o.gear.push(m);return m};
    // cape off the upper back (spine: +Y up, -Z behind)
    if(B.spine_03){const cg=new THREE.Group();cg.position.set(0,.13,-.12);B.spine_03.add(cg);o.gear.push(cg);const cm=this.cached('capeM'+(this.hi?1:0),()=>this.fow(this.hi?new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.82,metalness:0,envMap:this.envTex,envMapIntensity:.3}):new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide})));
      const c=new THREE.Mesh(this.capeGeo(tn),cm);if(this.hi)c.castShadow=true;c.frustumCulled=false;cg.add(c);o.cape=cg;o.capeK=0;
      add('spine_03',G.cyl,TR,0,.15,-.02,.17,.03,.13);for(const s of[-1,1])add('spine_03',G.sph,at>=4?GM:TR,s*.13,.16,.06,.026,.026,.026)}
    // pauldrons (upper arm: +Y runs down the arm)
    for(const s of['r','l']){const up='upperarm_'+s,k=at>=3?1.12:1;add(up,G.sph,M,0,.015,0,.082*k,.05*k,.095*k);add(up,G.sph,DK,0,.07,0,.07*k,.04,.08*k);add(up,G.rim,TR,0,.03,0,.078*k,.078*k,.075*k,Math.PI/2);
      if(at>=4)add(up,G.oct,GM,0,-.045,0,.022,.036,.022);
      if(at>=2){add('lowerarm_'+s,G.cyl,M,0,.14,0,.046,.15,.05);add('lowerarm_'+s,G.cyl,TR,0,.065,0,.05,.02,.054)}
      if(at>=3){add('calf_'+s,G.cyl,M,0,.2,0,.06,.22,.064);add('calf_'+s,G.sph,TR,0,.01,0,.052,.05,.06)}}
    if(at>=2){add('spine_03',G.sph,M,0,.02,.075,.15,.17,.085);add('spine_03',G.box,TR,0,.02,.155,.024,.2,.01);if(at>=4)add('spine_03',G.oct,GM,0,.06,.165,.03,.04,.016)}
    // helm (from armour tier 4 of 5): dome, brim, crest; the top tier wears a crown of spikes
    if(at>=3){const hb=B.Head||B.head||B.neck_01,hy=hb===B.neck_01?.21:.11,hz=.02;if(hb){add(hb,G.dome,M,0,hy,hz,.122,.125,.135);add(hb,G.rim,TR,0,hy,hz,.122,.122,.135,Math.PI/2);add(hb,G.box,TR,0,hy+.085,hz-.01,.012,.09,.2);
        if(at>=4){for(let i=0;i<6;i++){const a=i/6*6.283;add(hb,G.cone,TR,Math.sin(a)*.112,hy+.05,hz+Math.cos(a)*.124,.014,.07,.014)}add(hb,G.oct,GM,0,hy+.05,hz+.135,.022,.032,.016)}}}};
  const _arm=P.qnArm,_anim=P.qnAnim,_qnW=P.qnW;
  // soft glow hugging rare and fused weapons
  const _gen2=P.genTex;P.genTex=function(k){if(k==='wglow'){const c=this.cvs(64),x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.35,'rgba(255,255,255,.4)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return{c,rep:false}}return _gen2.call(this,k)};
  P.qnW=function(kind,Pp,bone){const g=_qnW.call(this,kind,Pp,bone),c=this._aura;if(!g||!c||kind==='book'||kind==='shield')return g;const tip=g.userData.tip,ty=tip?tip.position.y:.5;
    const m=this.cached('aura'+c+(this.post?1:0),()=>new THREE.MeshBasicMaterial({map:this.tex('wglow'),color:new THREE.Color(c).multiplyScalar(this.post?1.5:1),transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false}));
    this.planeG=this.planeG||new THREE.PlaneGeometry(1,1);const B={sword:[0,(ty+.1)/2,.24,ty],gsword:[0,(ty+.16)/2,.3,ty],dagger:[0,(ty+.06)/2,.16,ty*1.1],spear:[0,1.44,.3,.6],axe:[.15,.76,.55,.6],bow:[-.1,0,.6,1.25],xbow:[0,.42,.8,.4],staff:[0,ty,.42,.42],wand:[0,ty,.26,.26]}[kind];if(!B)return g;
    for(const ry of[0,Math.PI/2]){const q=new THREE.Mesh(this.planeG,m);q.position.set(B[0],B[1],0);q.scale.set(B[2],B[3],1);q.rotation.y=ry;q.renderOrder=7;g.add(q)}return g};
  P.qnArm=function(o,u){const F=u.wk&&FUSED[u.wk],t=u.wt|0;this._aura=F?F.glow:u.wk&&t>=2?TIERS[Math.min(4,t)].c:null;try{_arm.call(this,o,u)}finally{this._aura=null}this.qnGear(o,u)};
  P.qnAnim=function(o,u,T,dt,mv){_anim.call(this,o,u,T,dt,mv);if(o.cape){const k=u.dash?1.6:mv?1:0;o.capeK=lerp(o.capeK||0,k,1-Math.pow(.004,dt));o.cape.rotation.x=.1+o.capeK*.55+Math.sin(T*(2.6+o.capeK*5)+u.id)*(.035+.05*o.capeK);o.cape.rotation.z=Math.sin(T*1.7+u.id)*.04}};
})();
// ===================== Depth pass: ambient occlusion (soft contact shadow in creases and around bases) + gentle sharpening =====================
// Runs inside the post chain on the scene's own depth buffer: AO at half resolution, then one full-screen composite.
R3.aoPass=function(){const T=THREE,tri=new T.BufferGeometry();tri.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));tri.setAttribute('uv',new T.Float32BufferAttribute([0,0,2,0,0,2],2));
  const cam2=new T.OrthographicCamera(-1,1,1,-1,0,1),VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const DEP='uniform sampler2D tDepth;uniform vec2 uNF,uProj;float vz(vec2 uv){float d=texture2D(tDepth,uv).x;return uNF.x*uNF.y/((uNF.y-uNF.x)*d-uNF.y);}vec3 vp(vec2 uv){float z=vz(uv);return vec3((uv*2.-1.)*uProj*-z,z);}\n';
  const aoM=new T.ShaderMaterial({uniforms:{tDepth:{value:null},uNF:{value:new T.Vector2(30,14000)},uProj:{value:new T.Vector2(1,1)},uRes:{value:new T.Vector2(1,1)},uR:{value:72},uK:{value:2.7}},vertexShader:VS,depthTest:false,depthWrite:false,
    fragmentShader:'precision highp float;varying vec2 vUv;uniform vec2 uRes;uniform float uR,uK;\n'+DEP+`void main(){vec3 p=vp(vUv);if(p.z<-6000.){gl_FragColor=vec4(1.);return;}
      vec2 e=1./uRes;vec3 a1=vp(vUv+vec2(e.x,0.)),a0=vp(vUv-vec2(e.x,0.)),b1=vp(vUv+vec2(0.,e.y)),b0=vp(vUv-vec2(0.,e.y));
      vec3 dx=abs(a1.z-p.z)<abs(p.z-a0.z)?a1-p:p-a0,dy=abs(b1.z-p.z)<abs(p.z-b0.z)?b1-p:p-b0;vec3 n=normalize(cross(dx,dy));
      vec2 ruv=uR/(-p.z)*.5/uProj;float ang=6.2832*fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));float bias=uR*.045-p.z*.0012,occ=0.;
      for(int i=0;i<10;i++){float t=(float(i)+.5)/10.,a=ang+float(i)*2.39996;vec3 v=vp(vUv+vec2(cos(a),sin(a))*sqrt(t)*ruv)-p;float d2=dot(v,v);
        occ+=max(0.,dot(v,n)-bias)/(d2+uR*uR*.02)*uR*clamp(1.-d2/(uR*uR*2.2),0.,1.);}
      float ao=clamp(1.-uK*occ/10.,0.,1.);ao=mix(ao,1.,smoothstep(2200.,4200.,-p.z));gl_FragColor=vec4(ao,ao,ao,1.);}`});
  const cmM=new T.ShaderMaterial({uniforms:{tColor:{value:null},tAO:{value:null},tDepth:{value:null},uNF:aoM.uniforms.uNF,uProj:aoM.uniforms.uProj,uRes:aoM.uniforms.uRes,uPx:{value:new T.Vector2(1,1)},uAmt:{value:.95},uSharp:{value:.45},uR:aoM.uniforms.uR},vertexShader:VS,depthTest:false,depthWrite:false,
    fragmentShader:'precision highp float;varying vec2 vUv;uniform sampler2D tColor,tAO;uniform vec2 uRes,uPx;uniform float uAmt,uSharp,uR;\n'+DEP+`void main(){vec4 c=texture2D(tColor,vUv);float zc=vz(vUv);
      vec3 nb=(texture2D(tColor,vUv+vec2(uPx.x,0.)).rgb+texture2D(tColor,vUv-vec2(uPx.x,0.)).rgb+texture2D(tColor,vUv+vec2(0.,uPx.y)).rgb+texture2D(tColor,vUv-vec2(0.,uPx.y)).rgb)*.25;
      vec3 col=max(c.rgb+clamp(c.rgb-nb,-.12,.12)*uSharp,0.);
      vec2 e=1./uRes;float s=0.,w=0.;for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 uv=vUv+vec2(float(i),float(j))*e*2.;float dz=(vz(uv)-zc)/(uR*.6);float k=1./(1.+dz*dz*4.);s+=texture2D(tAO,uv).r*k;w+=k;}
      float ao=s/w;float lum=dot(col,vec3(.3,.59,.11));ao=mix(ao,1.,smoothstep(.9,2.2,lum));
      col*=mix(vec3(1.),vec3(ao*ao*.55+ao*.45,ao*ao*.5+ao*.5,ao),uAmt);gl_FragColor=vec4(col,c.a);}`});
  const mesh=new T.Mesh(tri,aoM);mesh.frustumCulled=false;let rtAO=null;const self=this;
  return{enabled:true,needsSwap:true,clear:false,renderToScreen:false,isPass:true,ao:aoM,cm:cmM,
    setSize(w,h){if(rtAO)rtAO.dispose();const aw=Math.max(2,w>>1),ah=Math.max(2,h>>1);rtAO=new T.WebGLRenderTarget(aw,ah,{depthBuffer:false});aoM.uniforms.uRes.value.set(aw,ah);cmM.uniforms.uPx.value.set(1/w,1/h)},
    render(renderer,writeBuffer,readBuffer){const cam=self.cam,dt=readBuffer.depthTexture;if(!dt||!rtAO){mesh.material=cmM;cmM.uniforms.uAmt.value=0}
      aoM.uniforms.uNF.value.set(cam.near,cam.far);aoM.uniforms.uProj.value.set(1/cam.projectionMatrix.elements[0],1/cam.projectionMatrix.elements[5]);const ac=renderer.autoClear;renderer.autoClear=false;
      if(dt&&rtAO){aoM.uniforms.tDepth.value=dt;mesh.material=aoM;renderer.setRenderTarget(rtAO);renderer.render(mesh,cam2)}
      cmM.uniforms.tColor.value=readBuffer.texture;cmM.uniforms.tAO.value=rtAO?rtAO.texture:null;cmM.uniforms.tDepth.value=dt;mesh.material=cmM;renderer.setRenderTarget(this.renderToScreen?null:writeBuffer);renderer.render(mesh,cam2);renderer.autoClear=ac},
    dispose(){if(rtAO)rtAO.dispose();aoM.dispose();cmM.dispose();tri.dispose()}}};
// ===================== Big-hit VFX: hit sparks, crit shockwaves, star flares, hit-stop, louder skill impacts, kill bursts =====================
(()=>{const P=R3,_gen=P.genTex,_impact=P.impact,_do=P.doFx,_frame=P.frame,_fxx=P.fxExtra;
  P.genTex=function(k){
    if(k==='flare'){const N=256,c=this.cvs(N),x=c.getContext('2d'),R=N/2;x.translate(R,R);let g=x.createRadialGradient(0,0,0,0,0,R);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.12,'rgba(255,255,255,.8)');g.addColorStop(.35,'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(-R,-R,N,N);
      for(const [a,l,w] of[[0,1,.05],[1.5708,1,.05],[.785,.55,.03],[-.785,.55,.03]]){x.save();x.rotate(a);g=x.createLinearGradient(-R*l,0,R*l,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.ellipse(0,0,R*l,R*w,0,0,7);x.fill();x.restore()}
      return{c,rep:false}}
    if(k==='crack'){const N=512,c=this.cvs(N),x=c.getContext('2d'),R=N/2,rnd=mulberry32(91);x.translate(R,R);x.strokeStyle='#fff';x.lineCap='round';
      for(let i=0;i<14;i++){let a=i/14*6.283+rnd()*.3,r=R*.08,px=Math.cos(a)*r,py=Math.sin(a)*r;x.lineWidth=7;x.beginPath();x.moveTo(px,py);while(r<R*.95){r+=R*(.06+rnd()*.08);a+=(rnd()-.5)*.5;const nx=Math.cos(a)*r,ny=Math.sin(a)*r;x.lineTo(nx,ny);x.lineWidth=Math.max(1.5,7*(1-r/R));
        if(rnd()<.25){const b=a+(rnd()-.5)*1.4;x.moveTo(nx,ny);x.lineTo(nx+Math.cos(b)*R*.12,ny+Math.sin(b)*R*.12);x.moveTo(nx,ny)}}x.stroke()}
      const g=x.createRadialGradient(0,0,0,0,0,R*.3);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.arc(0,0,R*.3,0,7);x.fill();return{c,rep:false}}
    return _gen.call(this,k)};
  // billboard star flare (screen-facing, additive)
  P.flare=function(x,y,z,s,c,life){(this.flares=this.flares||[]).length<14&&this.flares.push({x,y,z,s,c,t:0,life:life||.22})};
  P.drawFlares=function(dt){if(!this.flares||!this.flares.length)return;this.flares=this.flares.filter(f=>(f.t+=dt)<f.life);
    for(const f of this.flares){const k=f.t/f.life,m=this.get('flare',()=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:this.tex('flare'),color:'#ffffff',transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,toneMapped:false}));sp.renderOrder=12;sp.userData.ownMat=1;return sp});
      m.material.color.set(f.c).lerp(this.c2.set('#ffffff'),.45).multiplyScalar(this.post?.9:.8);m.material.opacity=.85*(1-k)*(1-k);m.material.rotation=f.t*1.4;m.position.set(f.x,f.y,f.z);const s=f.s*(.55+k*.8);m.scale.set(s,s,1)}};
  P.fxExtra=function(T,dt,me,L){_fxx.call(this,T,dt,me,L);this.drawFlares(dt)};
  // my hits land with sparks; crits add a shockwave, a star flare and a beat of hit-stop
  P.hitVfx=function(x,y,crit,tid){const gy=this.gY(x,y),u=tid!==undefined?UMAP.get(tid):null,h=gy+(u&&(u.big||u.boss||u.golem)?110:62),c=crit?'#ffc860':'#fff0d0';
    this.sparks(x,h,y,c,crit?(this.hi?34:18):(this.hi?10:6),crit?720:440,crit?.5:.32,false);
    if(crit){this.flare(x,h,y,360,'#ffd890',.22);this.ring(x,y,12,200,'#ffffff',.26);this.ring(x,y,24,140,'#ffb040',.4);this.flash(x,h+40,y,'#ffd8a0',4200,700,.22);this.hitStop=Math.max(this.hitStop||0,.075)}
    else this.flare(x,h,y,210,'#fff4e0',.12)};
  // skill impacts: bigger flash and flare, double shock ring, cracked ground and debris on the heavy ones
  P.impact=function(a){_impact.call(this,a);const gy=this.gY(a.x,a.y),c=FX_COL[a.kind]||AOE_COL[a.kind]||'#ffffff',r=a.r||200,big=r>=230||a.kind==='meteor'||a.kind==='judg'||a.kind==='line';
    this.flare(a.x,gy+120,a.y,r*(big?2.3:1.5),c,big?.34:.22);this.ring(a.x,a.y,r*.2,r*(big?2.4:1.8),'#ffffff',big?.45:.32);
    this.sparks(a.x,gy+30,a.y,'#ffffff',this.hi?(big?30:14):8,big?900:600,.45,true);
    for(let i=0;i<(this.hi?(big?28:12):6);i++){const an=Math.random()*6.283,s=rand(200,big?700:450);this.sp(true,{x:a.x,y:gy+20,z:a.y,vx:Math.cos(an)*s,vy:rand(300,big?900:600),vz:Math.sin(an)*s,l:rand(.6,1.2),s:rand(9,16),s1:3,c,sp:6,g:1300})}
    if(big){this.decal({x:a.x,y:a.y,r:r*1.25,c:'#2a1a10',life:3.2,tex:'crack',a:.75,fade:.5,normal:true});this.decal({x:a.x,y:a.y,r:r*1.2,c,life:1.4,tex:'crack',a:.9,fade:.8});
      for(let i=0;i<(this.hi?12:5);i++){const an=Math.random()*6.283,s=rand(180,480);this.sp(false,{x:a.x+Math.cos(an)*r*.2,y:gy+10,z:a.y+Math.sin(an)*r*.2,vx:Math.cos(an)*s,vy:rand(380,720),vz:Math.sin(an)*s,l:rand(.8,1.3),s:rand(14,26),s1:10,c:'#5a4a3a',a:.95,sp:1,g:1500,dr:.2})}
      const L=listener&&listener();if(L&&Math.hypot(L.x-a.x,L.y-a.y)<700){scrFl.a=Math.max(scrFl.a,.2);scrFl.c=c;shakeA=Math.max(shakeA,16)}}};
  // whatever I just killed goes out in a burst of light
  P.doFx=function(e,me,L){_do.call(this,e,me,L);if(e.k!=='die'||e.x===undefined||TGT.id!==e.id||TGT.t<=0)return;const gy=this.gY(e.x,e.y),U=UMAP.get(e.id),c=U&&U.hero?'#ffd040':'#ffe8a0',big=U&&(U.hero||U.boss||U.big||U.golem);
    this.flare(e.x,gy+70,e.y,big?700:380,c,.35);this.ring(e.x,e.y,20,big?320:200,c,.5);this.sparks(e.x,gy+50,e.y,c,this.hi?(big?40:20):10,big?640:420,.9,true);if(big){this.pillar(e.x,e.y,240,c,.8);this.hitStop=Math.max(this.hitStop||0,.12)}};
  P.frame=function(dt){if(this.hitStop>0){this.hitStop-=dt;dt*=.15}return _frame.call(this,dt)};
})();
// ===================== Dungeon dressing: stairway portals, stone pillars; teleport flashes =====================
(()=>{const P=R3,_bc=P.buildCastle,_do=P.doFx,_fxx=P.fxExtra;
  P.buildCastle=function(){_bc.call(this);const D=WD.dg;this.portals=[];if(!D)return;const S=this.scene,G=this.G;
    const stG=this.tstd('bricks','#6a6672',.95,0),stL=this.tstd('rock','#9a96a0',.9,0),pit=new THREE.MeshBasicMaterial({color:'#05040a'});
    const gate=(x,y,c,outside)=>{const gy=this.gY(x,y),g=new THREE.Group();g.position.set(x,gy,y);S.add(g);
      this.mesh(G.disc,pit,0,1.2,0,72,1,72,g);this.mesh(this.cylg(86,92,20,28,true),stL,0,10,0,1,1,1,g,true);
      for(let k=0;k<4;k++){const a=k/4*6.283+.785;this.mesh(this.cylg(18,22,outside?130:150,10),stG,Math.cos(a)*96,(outside?130:150)/2,Math.sin(a)*96,1,1,1,g,true);this.mesh(G.box,stL,Math.cos(a)*96,(outside?130:150)+6,Math.sin(a)*96,30,12,30,g,true)}
      const sw=new THREE.Mesh(G.plane,new THREE.MeshBasicMaterial({map:this.tex('rune'),color:new THREE.Color(c).multiplyScalar(this.post?1.4:1),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));sw.position.y=4;sw.scale.set(150,1,150);g.add(sw);
      const bm=new THREE.Mesh(this.cylg(60,60,1,20,true).clone().translate(0,.5,0),new THREE.MeshBasicMaterial({map:this.tex('beam'),color:c,transparent:true,opacity:.45,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false}));bm.scale.y=260;g.add(bm);
      this.glows.push([x,gy+60,y,c,380]);this.portals.push({sw,bm})};
    for(const e of D.ents)gate(e.x,e.y,'#b06cff',true);for(const p of D.ports)gate(p.x,p.y,'#6ac8ff',false);
    this.instC(this.cylg(30,36,170,12),stG,D.pillars,(p,add)=>add(p.x,85,p.y,1,1,1,0,0,0,null),true);
    this.instC(G.box,stL,D.pillars,(p,add)=>add(p.x,176,p.y,84,14,84,0,0,0,null),true)};
  P.fxExtra=function(T,dt,me,L){_fxx.call(this,T,dt,me,L);if(this.portals)for(const p of this.portals){p.sw.rotation.y=T*.9;p.bm.material.opacity=.35+.12*Math.sin(T*3)}};
  P.doFx=function(e,me,L){_do.call(this,e,me,L);if(e.k!=='tp'||e.x===undefined)return;const gy=this.gY(e.x,e.y);
    this.flash(e.x,gy+80,e.y,'#c08aff',4200,600,.4);this.ring(e.x,e.y,10,220,'#c08aff',.45);this.sparks(e.x,gy+20,e.y,'#d8b0ff',this.hi?40:16,520,.8,true);this.pillar(e.x,e.y,160,'#b06cff',.6)};
})();
