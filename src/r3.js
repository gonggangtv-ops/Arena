// ===================== 3D RENDERER v5: realistic fairy-tale valley =====================
const FOWFRAG=`
#ifdef CUTAWAY
{vec2 cd=vFowW-uFowC;float ax=abs(cd.x);if(cd.y>25.0&&ax<170.0){float lim=cd.y*1.48-26.0+ax*.9;if(vWY>lim){float hn=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);if(hn<smoothstep(0.0,30.0,vWY-lim)*smoothstep(170.0,110.0,ax))discard;}}}
#endif
{float fd=distance(vFowW,uFowC);float fk=smoothstep(uFowR-280.0,uFowR+40.0,fd);
 float zd=distance(vFowW,uZone.xy);float zk=smoothstep(uZone.z-10.0,uZone.z+10.0,zd);
 vec3 c=gl_FragColor.rgb;
 float cl=texture2D(uDetail,vFowW*.00031+vec2(uTime*.0045,uTime*.0028)).r;c*=mix(1.0,.52,smoothstep(.5,.72,cl)*uCloud);
 c=mix(c,c*vec3(.58,.24,1.23)+vec3(.004,0.,.008),zk*.6);
 c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,1.07);
 float l=dot(c,vec3(.2126,.7152,.0722));c=mix(c,vec3(l)*vec3(.43,.52,.89),fk*.6);c*=mix(1.0,pow(uFowDark,2.2),fk);gl_FragColor.rgb=c;}`;
// crisp zone lines painted on the ground (terrain + water): glowing purple storm edge, moving white dashes for the next safe zone
const ZLINES=`{float zd=distance(vFowW,uZone.xy);float ze=abs(zd-uZone.z);
 gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(1.5,.45,2.1),(1.0-smoothstep(4.0,13.0,ze))*.9+(1.0-smoothstep(13.0,70.0,ze))*step(zd,uZone.z)*.16);
 if(uZoneN.z>0.0){vec2 nv=vFowW-uZoneN.xy;float nl=1.0-smoothstep(3.0,8.5,abs(length(nv)-uZoneN.z));
  if(nl>0.0){float dash=smoothstep(.34,.42,fract(atan(nv.y,nv.x)*uZoneN.z/62.0-uTime*.18));gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(1.9,1.8,1.5),nl*dash*.85);}}}`;
const zlines=fs=>'uniform vec3 uZoneN;\n'+fs.replace('#include <tonemapping_fragment>',ZLINES+'\n#include <tonemapping_fragment>');
const R3={ok:false,world:null,objs:new Map(),itemObjs:new Map(),emojiTex:new Map(),t:0,tx:0,ty:0,geoC:new Map(),texC:new Map(),mats:new Map(),
  init(){
    if(this.ok)return true;if(typeof THREE==='undefined')return false;
    try{
      const MOB=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);this.mobile=MOB;
      const r=this.renderer=new THREE.WebGLRenderer({canvas:$('gl'),antialias:!MOB,powerPreference:'high-performance'});
      r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.08;r.shadowMap.enabled=true;
      this.cam=new THREE.PerspectiveCamera(44,W/H,30,14000);
      this.v=new THREE.Vector3();this.dummy=new THREE.Object3D();this.col=new THREE.Color();this.c1=new THREE.Color();this.c2=new THREE.Color();
      this.U={fowC:{value:new THREE.Vector2(CX,CY)},fowR:{value:860},fowDark:{value:.42},zone:{value:new THREE.Vector3(CX,CY,99999)},zoneN:{value:new THREE.Vector3(CX,CY,-1)},time:{value:0},detail:{value:this.detailTex()},cloud:{value:1}};
      const G=this.G={sph:new THREE.SphereGeometry(1,18,12),sphLo:new THREE.SphereGeometry(1,9,6),half:new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2),
        cyl:new THREE.CylinderGeometry(1,1,1,12),cyl6:new THREE.CylinderGeometry(1,1,1,6),cylT:new THREE.CylinderGeometry(.62,1,1,9),cone:new THREE.ConeGeometry(1,1,12),cone4:new THREE.ConeGeometry(1,1,4),cone6:new THREE.ConeGeometry(1,1,7),
        box:new THREE.BoxGeometry(1,1,1),oct:new THREE.OctahedronGeometry(1),ico:new THREE.IcosahedronGeometry(1,0),ico1:new THREE.IcosahedronGeometry(1,1),ico2:new THREE.IcosahedronGeometry(1,2),dod:new THREE.DodecahedronGeometry(1),
        ring:new THREE.RingGeometry(.86,1,64).rotateX(-Math.PI/2),ringThin:new THREE.RingGeometry(.993,1,128).rotateX(-Math.PI/2),disc:new THREE.CircleGeometry(1,48).rotateX(-Math.PI/2),plane:new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),
        quad:new THREE.PlaneGeometry(1,1),torus:new THREE.TorusGeometry(1,.12,6,24),torusHalf:new THREE.TorusGeometry(1,.1,6,18,Math.PI),cape:new THREE.PlaneGeometry(1,1,2,5).translate(0,-.5,0),
        hood:new THREE.SphereGeometry(1,16,12,Math.PI/2+.85,Math.PI*2-1.7,0,Math.PI*.78),openCyl:new THREE.CylinderGeometry(1,1,1,24,1,true)};
      G.rock=[0,1,2,3].map(s=>this.rockGeo(s));G.blob=[0,1,2].map(s=>this.blobGeo(s));G.leafc=[0,1,2].map(s=>this.leafCluster(s));G.pineRing=this.pineRing();G.tuft=this.tuftGeo();G.card=this.tuftGeo(1);
      this.cachedGeos=new Set([...Object.values(G).filter(g=>g.isBufferGeometry),...G.rock,...G.blob,...G.leafc]);
      try{this.envTex=this.makeEnv()}catch(e){this.envTex=null}
      this.setQuality();
      this.ok=true;
    }catch(e){console.warn('WebGL unavailable',e);this.ok=false}
    return this.ok;
  },
  setQuality(){const hi=gfxQ==='high'||(gfxQ==='auto'&&!this.mobile);const ch=this.hi!==undefined&&this.hi!==hi;this.hi=hi;const r=this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio||1,hi?1.75:1.2));r.setSize(W,H);this.post=hi&&typeof AR_POST!=='undefined';this.setupPost();r.shadowMap.type=THREE.PCFShadowMap;this.shadowSize=hi?2048:1024;
    if(this.sun){this.sun.shadow.mapSize.set(this.shadowSize,this.shadowSize);if(this.sun.shadow.map){this.sun.shadow.map.dispose();this.sun.shadow.map=null}}
    if(ch&&this.scene){this.world=null;this.objs.forEach(o=>this.scene.remove(o.root));this.objs=new Map()}},
  resize(){if(!this.ok)return;this.renderer.setSize(W,H);this.cam.aspect=W/H;this.cam.updateProjectionMatrix();if(this.composer){this.composer.setPixelRatio(this.renderer.getPixelRatio());this.composer.setSize(W,H)}},
  setupPost(){if(this.composer){this.composer.dispose();this.composer=null;this.bloom=null}
    if(!this.post)return;const P=AR_POST,r=this.renderer;
    try{const rt=new THREE.WebGLRenderTarget(W,H,{type:THREE.HalfFloatType,samples:4});const ao=this.aoPass&&lsGet('ar_ao','1')!=='0';if(ao)rt.depthTexture=new THREE.DepthTexture(W,H);const c=new P.EffectComposer(r,rt);
      this.rpass=new P.RenderPass(new THREE.Scene(),this.cam);c.addPass(this.rpass);this.ao=null;if(ao){try{this.ao=this.aoPass();c.addPass(this.ao)}catch(e){console.warn('ao',e);this.ao=null}}if(this.cleanPass){this.grade=this.cleanPass();c.addPass(this.grade)}
      this.bloom=new P.UnrealBloomPass(new THREE.Vector2(W,H),.3,.45,1.15);c.addPass(this.bloom);c.addPass(new P.OutputPass());
      c.setPixelRatio(r.getPixelRatio());c.setSize(W,H);this.composer=c}catch(e){console.warn('post',e);this.post=false;this.composer=null}},
  draw(){if(this.composer){this.rpass.scene=this.scene;this.rpass.camera=this.cam;this.composer.render()}else this.renderer.render(this.scene,this.cam)},
  cap(r,len){const k='c'+r+'_'+len;let g=this.geoC.get(k);if(!g){g=new THREE.CapsuleGeometry(r,len,5,12);this.geoC.set(k,g);this.cachedGeos.add(g)}return g},
  cylg(rt,rb,h,seg,open){const k='y'+rt+'_'+rb+'_'+h+'_'+(seg||12)+(open?'o':'');let g=this.geoC.get(k);if(!g){g=new THREE.CylinderGeometry(rt,rb,h,seg||12,1,!!open);this.geoC.set(k,g);this.cachedGeos.add(g)}return g},
  lathe(key,pts,seg){let g=this.geoC.get('L'+key);if(!g){g=new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),seg||16);this.geoC.set('L'+key,g);this.cachedGeos.add(g)}return g},
  fow(m,o){const U=this.U;o=o||{};
    m.onBeforeCompile=sh=>{
      Object.assign(sh.uniforms,{uFowC:U.fowC,uFowR:U.fowR,uFowDark:U.fowDark,uZone:U.zone,uTime:U.time,uDetail:U.detail,uCloud:U.cloud},o.uniforms||{});
      let vs='varying vec2 vFowW;varying float vWY;uniform float uTime;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n{vec4 fw=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nfw=instanceMatrix*fw;\n#endif\nfw=modelMatrix*fw;vFowW=fw.xz;vWY=fw.y;}');
      if(o.vert)vs=o.vert(vs);sh.vertexShader=vs;
      let fs='uniform vec2 uFowC;uniform float uFowR;uniform float uFowDark;uniform vec3 uZone;uniform float uTime;uniform float uCloud;uniform sampler2D uDetail;varying vec2 vFowW;varying float vWY;\n'+(o.cut?'#define CUTAWAY\n':'')+sh.fragmentShader;
      if(o.frag)fs=o.frag(fs);sh.fragmentShader=fs.replace('#include <tonemapping_fragment>',FOWFRAG+'\n#include <tonemapping_fragment>')};
    m.customProgramCacheKey=()=>'f7'+(o.key||'')+(o.cut?'c':'');return m},
  cached(k,f){let m=this.mats.get(k);if(!m){m=f();this.mats.set(k,m)}return m},
  std(c,r,mt,o){return this.cached('s'+c+r+mt+JSON.stringify(o||0),()=>this.fow(this.hi?new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:r,metalness:mt,envMap:this.envTex,envMapIntensity:1},o||{})):new THREE.MeshLambertMaterial(Object.assign({color:c},this.lamOpts(o)))))},
  lamOpts(o){if(!o)return{};const q=Object.assign({},o);for(const k of['roughness','metalness','envMapIntensity','roughnessMap','metalnessMap'])delete q[k];return q},
  tstd(tex,c,r,mt,o,ok){const T=this.tex(tex);const N=this.hi&&this.texN(tex);return this.cached('ts'+tex+c+r+mt+JSON.stringify(o||0)+(ok||''),()=>{
      const p=Object.assign({color:c,map:T},o||{});if(this.hi){if(N){p.normalMap=N;p.normalScale=new THREE.Vector2(.9,.9)}return this.fow(new THREE.MeshStandardMaterial(Object.assign({roughness:r,metalness:mt,envMap:this.envTex,envMapIntensity:.85},p)),ok?{key:ok,cut:ok==='cut'}:undefined)}
      return this.fow(new THREE.MeshLambertMaterial(this.lamOpts(p)),ok?{key:ok,cut:ok==='cut'}:undefined)})},
  lam(c,o){return this.cached('l'+c+JSON.stringify(o||0),()=>this.fow(new THREE.MeshLambertMaterial(Object.assign({color:c},o||{}))))},
  bas(c,o){return this.cached('b'+c+JSON.stringify(o||0),()=>this.fow(new THREE.MeshBasicMaterial(Object.assign({color:c},o||{}))))},
  glowM(c,a){return this.cached('g'+c+a,()=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:a===undefined?.85:a,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}))},
  mesh(geo,mat,x,y,z,sx,sy,sz,parent,shadow){const m=new THREE.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);m.scale.set(sx||1,sy===undefined?(sx||1):sy,sz===undefined?(sx||1):sz);if(shadow){m.castShadow=true;m.receiveShadow=true}if(parent)parent.add(m);return m},
  setI(im,i,x,y,z,sx,sy,sz,rx,ry,rz,col){const d=this.dummy;d.position.set(x,y,z);d.rotation.set(rx||0,ry||0,rz||0);d.scale.set(sx,sy,sz);d.updateMatrix();im.setMatrixAt(i,d.matrix);if(col!==undefined&&col!==null){this.col.set(col);im.setColorAt(i,this.col)}},
  // chunked instancing so the GPU only draws what is near the camera
  instC(geo,mat,items,place,shadow,onInst,csz){csz=csz||2000;const groups=new Map();
    for(const it of items){const k=Math.floor((it.x+6000)/csz)*1000+Math.floor((it.y+6000)/csz);let g=groups.get(k);if(!g){g=[];groups.set(k,g)}g.push(it)}
    const out=[];
    for(const arr of groups.values()){const tmp=[];for(const it of arr)place(it,(x,y,z,sx,sy,sz,rx,ry,rz,c)=>tmp.push([x,y,z,sx,sy,sz,rx,ry,rz,c,it]));if(!tmp.length)continue;
      const im=new THREE.InstancedMesh(geo,mat,tmp.length);im.castShadow=!!shadow;im.receiveShadow=true;
      tmp.forEach((q,i)=>{this.setI(im,i,q[0],q[1],q[2],q[3],q[4],q[5],q[6],q[7],q[8],MOON&&q[9]!=null?REG.objCol(q[9],q[0],q[2]):q[9]);if(onInst)onInst(q[10],im,i)});
      im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;im.computeBoundingSphere();im.userData.base=im.instanceMatrix.array.slice();this.scene.add(im);out.push(im)}
    return out},
  inst(geo,mat,n,shadow){const im=new THREE.InstancedMesh(geo,mat,Math.max(1,n));im.count=n;im.castShadow=!!shadow;im.receiveShadow=true;im.frustumCulled=false;this.scene.add(im);return im},
  disposeScene(){this.scene.traverse(o=>{if(o.geometry&&!this.cachedGeos.has(o.geometry))o.geometry.dispose();if(o.userData&&o.userData.ownMat){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())}})},
  makeEnv(){const pm=new THREE.PMREMGenerator(this.renderer);const s=new THREE.Scene();const geo=new THREE.SphereGeometry(100,32,16);const cols=[];const pos=geo.attributes.position;
    const ct=new THREE.Color('#9cc4ff'),cb=new THREE.Color('#5a5040'),ch=new THREE.Color('#ffe8c4');
    for(let i=0;i<pos.count;i++){const y=pos.getY(i)/100;const c=y>0?ct.clone().lerp(ch,Math.pow(1-y,3)):cb.clone().lerp(ch,Math.pow(1+y,4));cols.push(c.r,c.g,c.b)}
    geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));s.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
    const sunD=new THREE.Mesh(new THREE.SphereGeometry(8,8,6),new THREE.MeshBasicMaterial({color:new THREE.Color(6,5.4,4.4)}));sunD.position.set(-50,60,40);s.add(sunD);
    const rt=pm.fromScene(s,.03);pm.dispose();return rt.texture},

  // ---------- procedural textures ----------
  cvs(w,h){const c=document.createElement('canvas');c.width=w;c.height=h||w;c.getContext('2d',{willReadFrequently:true});return c},
  ctex(c,srgb,rep){const t=new THREE.CanvasTexture(c);if(srgb!==false)t.colorSpace=THREE.SRGBColorSpace;if(rep!==false){t.wrapS=t.wrapT=THREE.RepeatWrapping}t.anisotropy=this.renderer.capabilities.getMaxAnisotropy?Math.min(8,this.renderer.capabilities.getMaxAnisotropy()):4;return t},
  tnoise(seed,n){const R=mulberry32(seed);const P=new Float32Array(n*n);for(let i=0;i<n*n;i++)P[i]=R();
    return (u,v)=>{const x=u*n,y=v*n;const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const a0=((xi%n)+n)%n,b0=((yi%n)+n)%n,a1=(a0+1)%n,b1=(b0+1)%n;
      const s=xf*xf*(3-2*xf),t=yf*yf*(3-2*yf);const A=P[b0*n+a0],B=P[b0*n+a1],C=P[b1*n+a0],D=P[b1*n+a1];return A+(B-A)*s+(C-A)*t+(A-B-C+D)*s*t}},
  fbm(seed,base,oct){const L=[];for(let i=0;i<oct;i++)L.push(this.tnoise(seed+i*101,base<<i));return(u,v)=>{let s=0,a=.5,t=0;for(const f of L){s+=f(u,v)*a;t+=a;a*=.5}return s/t}},
  pix(c,fn){const x=c.getContext('2d'),w=c.width,h=c.height,img=x.getImageData(0,0,w,h),d=img.data;for(let j=0;j<h;j++)for(let i=0;i<w;i++){const k=(j*w+i)*4;const r=fn(i/w,j/h,i,j);d[k]=r[0];d[k+1]=r[1];d[k+2]=r[2];d[k+3]=r[3]===undefined?255:r[3]}x.putImageData(img,0,0);return x},
  wrapDraw(x,w,h,fn,px,py,m){m=m||24;const xs=px===undefined?[-w,0,w]:[0].concat(px<m?[w]:[],px>w-m?[-w]:[]),ys=py===undefined?[-h,0,h]:[0].concat(py<m?[h]:[],py>h-m?[-h]:[]);for(const ox of xs)for(const oy of ys){if(ox||oy){x.save();x.translate(ox,oy);fn();x.restore()}else fn()}},
  cutTex(c,rgb,rep){const w=c.width,h=c.height,src=c.getContext('2d').getImageData(0,0,w,h).data,d=new Uint8Array(w*h*4);
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){const s=(j*w+i)*4,o=((h-1-j)*w+i)*4,a=src[s+3];if(a<8){d[o]=rgb[0];d[o+1]=rgb[1];d[o+2]=rgb[2];d[o+3]=0}else{d[o]=src[s];d[o+1]=src[s+1];d[o+2]=src[s+2];d[o+3]=a}}
    const t=new THREE.DataTexture(d,w,h,THREE.RGBAFormat);t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;if(rep!==false){t.wrapS=t.wrapT=THREE.RepeatWrapping}t.needsUpdate=true;return t},
  detailTex(){const n=256,c=this.cvs(n);const f=this.fbm(3,8,4);this.pix(c,(u,v)=>{const g=f(u,v)*255;return[g,g,g]});const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t},
  texN(k){if(!this.normCanvas||!this.normCanvas[k])return null;const key='N'+k;let t=this.texC.get(key);if(!t){t=this.ctex(this.normFrom(this.normCanvas[k].c,this.normCanvas[k].s),false);this.texC.set(key,t)}return t},
  normFrom(src,str){const w=src.width,h=src.height,sd=src.getContext('2d').getImageData(0,0,w,h).data;const c=this.cvs(w,h),x=c.getContext('2d'),img=x.createImageData(w,h),d=img.data;
    const L=(i,j)=>{i=(i+w)%w;j=(j+h)%h;const k=(j*w+i)*4;return(sd[k]*.3+sd[k+1]*.59+sd[k+2]*.11)/255};
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){const dx=(L(i+1,j)-L(i-1,j))*str,dy=(L(i,j+1)-L(i,j-1))*str;const l=Math.hypot(dx,dy,1);const k=(j*w+i)*4;d[k]=(-dx/l*.5+.5)*255;d[k+1]=(dy/l*.5+.5)*255;d[k+2]=(1/l*.5+.5)*255;d[k+3]=255}
    x.putImageData(img,0,0);return c},
  tex(k){let t=this.texC.get(k);if(t)return t;const c=this.genTex(k);t=c.cut?this.cutTex(c.c,c.cut,c.rep):this.ctex(c.c||c,c.srgb,c.rep);if(c.norm){(this.normCanvas=this.normCanvas||{})[k]={c:c.c||c,s:c.norm}}this.texC.set(k,t);if(k==='cobble'&&typeof CURSED!=='undefined'&&CURSED)this.cobImg(t);return t},
  // village paving baked from the Meshy cobblestone sculpt (assets/tex); the canvas setts stay until it loads
  cobImg(t){if(typeof Image==='undefined')return;const im=new Image();im.onload=()=>{t.image=im;t.needsUpdate=true};im.src='assets/tex/cobble-meshy.jpg'},
  genTex(k){const R=mulberry32(k.length*977+k.charCodeAt(0)*13);const rnd=(a,b)=>a+R()*(b-a);
    switch(k){
    case 'grass':{const N=this.hi?1024:512,q=N/512,c=this.cvs(N),f=this.fbm(11,6,5),g=this.fbm(12,24,3),dry=this.fbm(14,3,3),sp=this.fbm(15,96,2);
      const x=this.pix(c,(u,v)=>{const n=f(u,v),m=g(u,v),d=Math.max(0,dry(u,v)-.45)*2.2,s2=sp(u,v);const r=50+n*52+m*16,gg=88+n*58+m*14,b=30+n*26+m*8;
        return[r+d*48+s2*10,gg+d*20+s2*8,b+d*4]});
      // layered blades: dark roots first, then mid greens, then sunlit tips and a few dry straws
      for(const [cnt,cols,lw,len] of[[7000,['rgba(24,44,14,.55)','rgba(34,58,20,.5)'],1.4,[5,10]],[9000,['rgba(76,124,44,.55)','rgba(98,150,56,.5)','rgba(64,108,38,.55)'],1.1,[5,12]],[4200,['rgba(150,196,86,.5)','rgba(176,206,104,.45)'],.9,[4,9]],[700,['rgba(196,178,96,.55)','rgba(170,150,80,.5)'],.9,[6,12]]])
        for(let i=0;i<cnt*q*q/2;i++){const px=rnd(0,N),py=rnd(0,N),l=rnd(len[0],len[1])*q,a=rnd(-.55,.55)-Math.PI/2;x.strokeStyle=cols[Math.floor(R()*cols.length)];x.lineWidth=lw*q*rnd(.8,1.2);
          this.wrapDraw(x,N,N,()=>{x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+Math.cos(a)*l*.5+rnd(-1,1)*q,py+Math.sin(a)*l*.5,px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke()},px,py,14*q)}
      for(let i=0;i<60*q*q;i++){const px=rnd(0,N),py=rnd(0,N),r=rnd(2,3.2)*q;this.wrapDraw(x,N,N,()=>{x.fillStyle='rgba(56,112,40,.8)';for(let k=0;k<3;k++){const a=k*2.1;x.beginPath();x.arc(px+Math.cos(a)*r,py+Math.sin(a)*r,r*.85,0,7);x.fill()}},px,py,8*q)}
      for(let i=0;i<90*q*q;i++){const px=rnd(0,N),py=rnd(0,N),r=rnd(.8,2.2)*q,gv=rnd(110,170);x.fillStyle=`rgba(${gv},${gv*.92},${gv*.8},.75)`;x.beginPath();x.ellipse(px,py,r,r*.7,rnd(0,3),0,7);x.fill()}
      for(let i=0;i<160*q*q;i++){const px=rnd(0,N),py=rnd(0,N);x.fillStyle=R()<.5?'rgba(250,250,240,.7)':'rgba(255,220,90,.7)';x.beginPath();x.arc(px,py,rnd(.8,1.6)*q,0,7);x.fill()}
      return c}
    case 'dirt':{const c=this.cvs(256),f=this.fbm(21,8,4);const x=this.pix(c,(u,v)=>{const n=f(u,v);return[92+n*58,72+n*44,50+n*30]});
      for(let i=0;i<170;i++){const px=rnd(0,256),py=rnd(0,256),r=rnd(1.5,4.5),g=rnd(95,160);this.wrapDraw(x,256,256,()=>{x.fillStyle=`rgb(${g*.55},${g*.5},${g*.42})`;x.beginPath();x.ellipse(px+1,py+1.2,r,r*.75,0,0,7);x.fill();x.fillStyle=`rgb(${g},${g*.92},${g*.8})`;x.beginPath();x.ellipse(px,py,r,r*.75,0,0,7);x.fill()},px,py,8)}
      return{c,norm:2.2}}
    case 'rock':{const c=this.cvs(512),f=this.fbm(31,6,6),g=this.fbm(33,3,3);const x=this.pix(c,(u,v)=>{const n=f(u,v),m=g(u,v);const st=.5+.5*Math.sin((v*16+m*5)*Math.PI);const b=78+n*80-st*14;return[b*1.04,b,b*.95]});
      x.lineCap='round';for(let i=0;i<70;i++){let px=rnd(0,512),py=rnd(0,512);x.strokeStyle=`rgba(30,28,26,${rnd(.3,.6)})`;x.lineWidth=rnd(.6,2);x.beginPath();x.moveTo(px,py);for(let s=0;s<8;s++){px+=rnd(-14,14);py+=rnd(-6,14);x.lineTo(px,py)}x.stroke()}
      for(let i=0;i<120;i++){const px=rnd(0,512),py=rnd(0,512);x.fillStyle=R()<.6?`rgba(150,160,80,${rnd(.15,.35)})`:`rgba(200,200,180,.25)`;x.beginPath();x.arc(px,py,rnd(2,7),0,7);x.fill()}
      return{c,norm:3.2}}
    case 'cobble':{const c=this.cvs(256),x=c.getContext('2d');x.fillStyle='#38332c';x.fillRect(0,0,256,256);const n=8,s=256/n;
      // worn setts: rounded irregular blocks with thin dark joints, warm grey with some brown and blue-grey stones
      const rr=(cx,cy,w,h,r,a)=>{x.save();x.translate(cx,cy);x.rotate(a);x.beginPath();x.moveTo(-w/2+r,-h/2);x.lineTo(w/2-r,-h/2);x.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);x.lineTo(w/2,h/2-r);x.quadraticCurveTo(w/2,h/2,w/2-r,h/2);x.lineTo(-w/2+r,h/2);x.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);x.lineTo(-w/2,-h/2+r);x.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);x.fill();x.restore()};
      for(let j=0;j<n;j++)for(let i=0;i<n;i++){const cx=(i+.5+(j%2)*.5)*s+rnd(-1.5,1.5),cy=(j+.5)*s+rnd(-1.5,1.5),w=s*rnd(.86,.95),h=s*rnd(.84,.93),g=rnd(112,150),t=Math.random(),cr=t<.2?[10,2,-8]:t<.35?[-6,0,8]:[4,2,-2];
        this.wrapDraw(x,256,256,()=>{const gr=x.createLinearGradient(cx-w/2,cy-h/2,cx+w/2,cy+h/2);gr.addColorStop(0,`rgb(${g+18+cr[0]},${g+15+cr[1]},${g+10+cr[2]})`);gr.addColorStop(1,`rgb(${g-22+cr[0]},${g-24+cr[1]},${g-28+cr[2]})`);x.fillStyle=gr;rr(cx,cy,w,h,s*.22,rnd(-.06,.06))},cx,cy,s*.6)}
      const f=this.fbm(41,16,3);const img=x.getImageData(0,0,256,256);for(let i=0;i<img.data.length;i+=4){const q=(f((i/4%256)/256,Math.floor(i/4/256)/256)-.5)*26;img.data[i]+=q;img.data[i+1]+=q;img.data[i+2]+=q}x.putImageData(img,0,0);return{c,norm:3}}
    case 'sand':{const c=this.cvs(256),f=this.fbm(51,16,4);const x=this.pix(c,(u,v)=>{const n=f(u,v);const r=.5+.5*Math.sin((v*22+n*3)*Math.PI*2);return[170+n*40-r*10,152+n*36-r*10,112+n*28-r*8]});
      for(let i=0;i<220;i++){x.fillStyle=`rgba(${rnd(90,150)},${rnd(80,130)},${rnd(60,100)},.6)`;x.beginPath();x.arc(rnd(0,256),rnd(0,256),rnd(.6,1.8),0,7);x.fill()}return{c,norm:1.5}}
    case 'plaster':{const c=this.cvs(256),f=this.fbm(61,16,4);const x=this.pix(c,(u,v)=>{const n=f(u,v);return[214+n*34,202+n*32,176+n*30]});
      const beam=(x0,y0,x1,y1,w)=>{x.strokeStyle='#4a3020';x.lineWidth=w;x.beginPath();x.moveTo(x0,y0);x.lineTo(x1,y1);x.stroke();x.strokeStyle='rgba(120,80,50,.35)';x.lineWidth=w*.3;x.stroke()};
      x.lineCap='butt';beam(0,0,0,256,22);beam(256,0,256,256,22);beam(128,0,128,256,16);beam(0,8,256,8,16);beam(0,128,256,128,14);beam(0,250,256,250,16);beam(10,128,118,10,11);beam(138,10,246,128,11);beam(10,248,118,138,9);beam(138,138,246,248,9);
      return{c,norm:2}}
    case 'logs':{const c=this.cvs(256),x=c.getContext('2d');const f=this.fbm(71,8,3);x.fillStyle='#2a1c12';x.fillRect(0,0,256,256);
      for(let r=0;r<6;r++){const y=r*256/6,h=256/6;const g=x.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#9a7048');g.addColorStop(.45,'#7a5434');g.addColorStop(1,'#3a2618');x.fillStyle=g;x.fillRect(0,y+1.5,256,h-3);
        x.strokeStyle='rgba(40,24,12,.4)';x.lineWidth=1;for(let i=0;i<14;i++){const yy=y+rnd(4,h-4);x.beginPath();x.moveTo(rnd(0,256),yy);x.lineTo(rnd(0,256),yy+rnd(-1,1));x.stroke()}}
      return{c,norm:2.6}}
    case 'bricks':{const c=this.cvs(256),x=c.getContext('2d');x.fillStyle='#7a7468';x.fillRect(0,0,256,256);const rows=5,bh=256/rows;
      for(let r=0;r<rows;r++){const off=(r%2)*32;for(let i=-1;i<5;i++){const bx=i*64+off,g=rnd(118,170),tint=rnd(-8,8);x.fillStyle=`rgb(${g+tint+6},${g},${g-tint-8})`;x.fillRect(bx+2.5,r*bh+2.5,59,bh-5);
        x.fillStyle='rgba(255,255,255,.12)';x.fillRect(bx+2.5,r*bh+2.5,59,3);x.fillStyle='rgba(0,0,0,.18)';x.fillRect(bx+2.5,r*bh+bh-6,59,3.5)}}
      const f=this.fbm(81,16,4);const img=x.getImageData(0,0,256,256);for(let i=0;i<img.data.length;i+=4){const q=(f((i/4%256)/256,Math.floor(i/4/256)/256)-.5)*44;img.data[i]+=q;img.data[i+1]+=q;img.data[i+2]+=q}x.putImageData(img,0,0);return{c,norm:3.2}}
    case 'tiles':{const c=this.cvs(256),x=c.getContext('2d');x.fillStyle='#3a3a3a';x.fillRect(0,0,256,256);const rows=8,h=256/rows,w=256/8;
      for(let r=rows;r>=-1;r--){for(let i=-1;i<=8;i++){const cx=i*w+(r%2)*w/2,cy=r*h;const g=rnd(170,215);const gr=x.createLinearGradient(0,cy-h*.2,0,cy+h);gr.addColorStop(0,`rgb(${g},${g},${g})`);gr.addColorStop(1,`rgb(${g*.55},${g*.55},${g*.55})`);
        x.fillStyle=gr;x.beginPath();x.moveTo(cx-w/2+1,cy-h*.2);x.lineTo(cx+w/2-1,cy-h*.2);x.lineTo(cx+w/2-1,cy+h*.55);x.quadraticCurveTo(cx,cy+h*1.25,cx-w/2+1,cy+h*.55);x.closePath();x.fill()}}
      return{c,norm:2.8}}
    case 'thatch':{const c=this.cvs(256),x=c.getContext('2d');x.fillStyle='#6a5228';x.fillRect(0,0,256,256);
      for(let r=0;r<8;r++){for(let i=0;i<260;i++){const px=rnd(-4,260),py=r*32+rnd(0,30),l=rnd(10,24);x.strokeStyle=`rgba(${rnd(170,225)},${rnd(140,185)},${rnd(70,110)},${rnd(.5,.9)})`;x.lineWidth=rnd(.8,1.8);x.beginPath();x.moveTo(px,py);x.lineTo(px+rnd(-2,2),py+l);x.stroke()}
        x.fillStyle='rgba(40,28,10,.35)';x.fillRect(0,r*32+29,256,4)}return{c,norm:2.2}}
    case 'planks':{const c=this.cvs(256),x=c.getContext('2d');const n=5,w=256/n;
      for(let i=0;i<n;i++){const g=rnd(120,165);x.fillStyle=`rgb(${g},${g*.72},${g*.48})`;x.fillRect(i*w,0,w,256);x.strokeStyle='rgba(60,36,20,.35)';x.lineWidth=1;
        for(let l=0;l<9;l++){const ox=i*w+rnd(3,w-3);x.beginPath();x.moveTo(ox,0);for(let y=0;y<=256;y+=16)x.lineTo(ox+Math.sin(y*.05+l)*2.2,y);x.stroke()}
        if(R()<.6){x.fillStyle='rgba(60,36,20,.55)';x.beginPath();x.ellipse(i*w+rnd(8,w-8),rnd(20,236),2.5,5,0,0,7);x.fill()}
        x.fillStyle='rgba(30,18,8,.7)';x.fillRect(i*w,0,2,256)}return{c,norm:2}}
    case 'bark':case 'birch':{const c=this.cvs(128),f=this.fbm(91,4,4),birch=k==='birch';const x=this.pix(c,(u,v)=>{const n=f(u,v*.25),s=.5+.5*Math.sin(u*Math.PI*2*9+n*6);if(birch)return[220+n*30,214+n*30,200+n*28];const b=50+n*44-s*18;return[b*1.15,b*.82,b*.58]});
      if(birch)for(let i=0;i<46;i++){x.fillStyle='rgba(30,26,22,.85)';x.fillRect(rnd(0,128),rnd(0,128),rnd(6,22),rnd(1.5,3.5))}return{c,norm:birch?1:3}}
    case 'leaves':{const c=this.cvs(256),x=c.getContext('2d');x.fillStyle='#2c4a22';x.fillRect(0,0,256,256);
      for(let i=0;i<1400;i++){const px=rnd(0,256),py=rnd(0,256),a=rnd(0,6.3),l=rnd(4,8),g=rnd(.65,1.25);this.wrapDraw(x,256,256,()=>{x.fillStyle=`rgb(${70*g},${118*g},${46*g})`;x.beginPath();x.ellipse(px,py,l,l*.45,a,0,7);x.fill()},px,py,9)}
      return{c,norm:2.4}}
    case 'fabric':{const c=this.cvs(128),f=this.fbm(101,8,3);this.pix(c,(u,v,i,j)=>{const w=((i>>1)+(j>>1))%2?8:-8;const n=f(u,v)*26;const b=200+w+n;return[b,b,b]});return{c,norm:1.2}}
    case 'leather':{const c=this.cvs(128),f=this.fbm(111,16,4);const x=this.pix(c,(u,v)=>{const n=f(u,v);return[120+n*50,78+n*36,46+n*22]});
      x.strokeStyle='rgba(240,220,180,.55)';x.setLineDash([4,3]);x.lineWidth=1.2;x.strokeRect(6,6,116,116);return{c,norm:2.5}}
    case 'chain':{const c=this.cvs(128),x=c.getContext('2d');x.fillStyle='#1c1e22';x.fillRect(0,0,128,128);const n=10,s=128/n;
      for(let j=-1;j<=n;j++)for(let i=-1;i<=n;i++){const cx=i*s+(j%2)*s/2,cy=j*s*.8;x.strokeStyle='#8a929e';x.lineWidth=2.4;x.beginPath();x.arc(cx,cy,s*.42,0,7);x.stroke();x.strokeStyle='rgba(230,235,245,.7)';x.lineWidth=1;x.beginPath();x.arc(cx,cy,s*.42,3.6,5.2);x.stroke()}
      return{c,norm:3.5}}
    case 'metal':{const c=this.cvs(128),f=this.fbm(121,4,3);const x=this.pix(c,(u,v)=>{const n=f(u,v);const s=Math.sin(v*900+n*20)*6;return[188+n*30+s,192+n*30+s,200+n*30+s]});return{c,norm:.8}}
    case 'scales':{const c=this.cvs(128),x=c.getContext('2d');x.fillStyle='#2a1010';x.fillRect(0,0,128,128);const n=8,w=128/n;
      for(let r=n;r>=-1;r--)for(let i=-1;i<=n;i++){const cx=i*w+(r%2)*w/2,cy=r*w*.7;const g=x.createRadialGradient(cx,cy-w*.3,1,cx,cy,w*.7);g.addColorStop(0,'#f0e0d0');g.addColorStop(1,'#6a5a50');x.fillStyle=g;x.beginPath();x.arc(cx,cy,w*.55,0,Math.PI);x.fill()}
      return{c,norm:2.6}}
    case 'water':{const c=this.cvs(256),f=this.fbm(131,8,4);this.pix(c,(u,v)=>{const g=f(u,v)*255;return[g,g,g]});return{c,srgb:false,norm:0,raw:1}}
    case 'atlas':return this.atlas();
    case 'rune':{const c=this.cvs(512),x=c.getContext('2d');x.translate(256,256);x.strokeStyle='#fff';x.fillStyle='#fff';x.shadowColor='#fff';x.shadowBlur=10;
      const ring=(r,w)=>{x.lineWidth=w;x.beginPath();x.arc(0,0,r,0,7);x.stroke()};ring(244,7);ring(226,3);ring(160,5);ring(118,2.5);
      x.lineWidth=3.5;x.beginPath();for(let i=0;i<=6;i++){const a=i*4*Math.PI/6*1.0+Math.PI/2;const r=160;i?x.lineTo(Math.cos(a*1)*r,Math.sin(a)*r):x.moveTo(Math.cos(a)*r,Math.sin(a)*r)}x.stroke();
      x.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;x.moveTo(Math.cos(a)*160,Math.sin(a)*160);x.lineTo(Math.cos(a+Math.PI*2/3)*160,Math.sin(a+Math.PI*2/3)*160)}x.stroke();
      x.font='bold 22px serif';x.textAlign='center';x.textBaseline='middle';const gl='ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';for(let i=0;i<24;i++){const a=i/24*Math.PI*2;x.save();x.rotate(a);x.fillText(gl[i],0,-235);x.restore()}
      return{c,rep:false}}
    case 'shock':{const c=this.cvs(256),x=c.getContext('2d');const g=x.createRadialGradient(128,128,60,128,128,128);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.72,'rgba(255,255,255,.35)');g.addColorStop(.9,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,256,256);return{c,rep:false}}
    case 'scorch':{const c=this.cvs(256),f=this.fbm(141,6,4);this.pix(c,(u,v)=>{const d=Math.hypot(u-.5,v-.5)*2,n=f(u,v);const a=clamp((1-d)*1.6+(n-.5)*1.4,0,1)*.9;return[20+n*30,14+n*20,10+n*10,a*255]});return{c,rep:false}}
    case 'frostp':{const c=this.cvs(256),f=this.fbm(151,8,4);const x=this.pix(c,(u,v)=>{const d=Math.hypot(u-.5,v-.5)*2,n=f(u,v);const a=clamp((1-d)*1.5+(n-.5)*1.2,0,1)*.85;return[210+n*40,236+n*19,255,a*255]});
      x.strokeStyle='rgba(255,255,255,.8)';x.lineWidth=1.5;for(let i=0;i<14;i++){const a=rnd(0,6.3);let px=128,py=128;x.beginPath();x.moveTo(px,py);for(let s=0;s<6;s++){px+=Math.cos(a+rnd(-.4,.4))*16;py+=Math.sin(a+rnd(-.4,.4))*16;x.lineTo(px,py)}x.stroke()}return{c,rep:false}}
    case 'slash':{const c=this.cvs(256,64),x=c.getContext('2d');const g=x.createLinearGradient(0,0,256,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.75,'rgba(255,255,255,.55)');g.addColorStop(.95,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');
      x.fillStyle=g;x.fillRect(0,0,256,64);const v=x.createLinearGradient(0,0,0,64);v.addColorStop(0,'rgba(0,0,0,1)');v.addColorStop(.35,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.6)');x.globalCompositeOperation='destination-out';x.fillStyle=v;x.fillRect(0,0,256,64);return{c,rep:false}}
    case 'falls':{const c=this.cvs(128,256),x=c.getContext('2d');x.fillStyle='rgba(180,220,240,.55)';x.fillRect(0,0,128,256);for(let i=0;i<90;i++){const px=rnd(0,128),l=rnd(40,180),py=rnd(-40,256);const g=x.createLinearGradient(0,py,0,py+l);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,`rgba(255,255,255,${rnd(.4,.95)})`);g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;this.wrapDraw(x,128,256,()=>x.fillRect(px,py,rnd(1.5,4),l),px,py+l/2,l)}return{c}}
    case 'window':{const c=this.cvs(64),x=c.getContext('2d');const g=x.createRadialGradient(32,36,4,32,32,34);g.addColorStop(0,'#fff2c0');g.addColorStop(1,'#d88a30');x.fillStyle=g;x.fillRect(0,0,64,64);x.fillStyle='#3a2416';x.fillRect(0,0,64,5);x.fillRect(0,59,64,5);x.fillRect(0,0,5,64);x.fillRect(59,0,5,64);x.fillRect(29,0,6,64);x.fillRect(0,29,64,6);return{c,rep:false}}
    case 'banner':{const c=this.cvs(128,256),x=c.getContext('2d');x.fillStyle='#e8e8e8';x.fillRect(0,0,128,256);x.fillStyle='#bdbdbd';x.fillRect(0,0,128,18);x.fillRect(0,0,10,256);x.fillRect(118,0,10,256);
      x.fillStyle='#ffd35a';x.beginPath();x.moveTo(64,70);x.lineTo(92,120);x.lineTo(64,170);x.lineTo(36,120);x.closePath();x.fill();x.fillStyle='#f0f0f0';x.beginPath();x.moveTo(0,236);x.lineTo(64,256);x.lineTo(128,236);x.lineTo(128,256);x.lineTo(0,256);x.fill();return{c,rep:false}}
    case 'net':{const c=this.cvs(128),x=c.getContext('2d');x.clearRect(0,0,128,128);x.strokeStyle='#e8d8a8';x.lineWidth=3;
        for(let i=-128;i<256;i+=18){x.beginPath();x.moveTo(i,0);x.lineTo(i+128,128);x.stroke();x.beginPath();x.moveTo(i+128,0);x.lineTo(i,128);x.stroke()}
        const g=x.createRadialGradient(64,64,40,64,64,64);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,1)');x.globalCompositeOperation='destination-out';x.fillStyle=g;x.fillRect(0,0,128,128);return{c,rep:false,cut:[232,216,168]}}
    case 'leafc':{const c=this.cvs(256),x=c.getContext('2d');x.clearRect(0,0,256,256);
        for(let i=0;i<300;i++){const a=rnd(0,6.283),r=118*Math.sqrt(R());const px=128+Math.cos(a)*r,py=128+Math.sin(a)*r;const sh=1-(py/256)*.45,g=rnd(.6,1.05)*sh;
          const L=rnd(9,17),rot=rnd(0,6.283);x.save();x.translate(px,py);x.rotate(rot);x.fillStyle=`rgb(${Math.min(255,150*g+30)|0},${Math.min(255,205*g+35)|0},${Math.min(255,110*g+20)|0})`;
          x.beginPath();x.moveTo(-L,0);x.quadraticCurveTo(0,-L*.5,L,0);x.quadraticCurveTo(0,L*.5,-L,0);x.fill();x.strokeStyle=`rgba(40,60,20,${.35*sh})`;x.lineWidth=1;x.beginPath();x.moveTo(-L*.9,0);x.lineTo(L*.8,0);x.stroke();x.restore()}
        return{c,rep:false,cut:[120,160,80]}}
    case 'needle':{const c=this.cvs(128),x=c.getContext('2d');x.clearRect(0,0,128,128);x.strokeStyle='#5a4a30';x.lineWidth=3;x.beginPath();x.moveTo(64,128);x.lineTo(64,4);x.stroke();
        for(let t=4;t<124;t+=3){const k=1-t/128*.15,len=(30+R()*10)*(.45+.55*(t/128)),g=rnd(.7,1.1);for(const sd of[-1,1]){x.strokeStyle=`rgb(${70*g|0},${125*g|0},${62*g|0})`;x.lineWidth=2;
          x.beginPath();x.moveTo(64,128-t);x.lineTo(64+sd*len*k,128-t-len*.55);x.stroke()}}
        return{c,rep:false,cut:[70,120,60]}}
    case 'blades':{const c=this.cvs(128),x=c.getContext('2d');x.clearRect(0,0,128,128);for(let i=0;i<22;i++){const bx=rnd(8,120),h=rnd(60,124),bend=rnd(-18,18),w=rnd(4,8),g=rnd(.7,1.2);x.fillStyle=`rgb(${80*g},${130*g},${50*g})`;
        x.beginPath();x.moveTo(bx-w/2,128);x.quadraticCurveTo(bx+bend*.3,128-h*.5,bx+bend,128-h);x.quadraticCurveTo(bx+bend*.3+w*.2,128-h*.5,bx+w/2,128);x.fill()}return{c,rep:false,cut:[90,140,56]}}
    case 'flower':{const c=this.cvs(64),x=c.getContext('2d');x.clearRect(0,0,64,64);x.fillStyle='#fff';for(let i=0;i<6;i++){const a=i/6*Math.PI*2;x.beginPath();x.ellipse(32+Math.cos(a)*14,32+Math.sin(a)*14,11,7,a,0,7);x.fill()}x.fillStyle='#ffd040';x.beginPath();x.arc(32,32,8,0,7);x.fill();return{c,rep:false,cut:[255,255,255]}}
    case 'wheat':{const c=this.cvs(64,128),x=c.getContext('2d');x.clearRect(0,0,64,128);for(let i=0;i<9;i++){const bx=rnd(6,58),h=rnd(80,124),b=rnd(-8,8);x.strokeStyle='#b8902a';x.lineWidth=2;x.beginPath();x.moveTo(bx,128);x.quadraticCurveTo(bx+b*.3,128-h*.6,bx+b,128-h);x.stroke();
        x.fillStyle=R()<.5?'#e8c050':'#d8a838';x.beginPath();x.ellipse(bx+b,128-h+8,4,11,b*.03,0,7);x.fill()}return{c,rep:false,cut:[200,160,50]}}
    case 'strands':{const c=this.cvs(128),x=c.getContext('2d');x.clearRect(0,0,128,128);for(let i=0;i<70;i++){const bx=rnd(0,128),l=rnd(60,128),g=rnd(.75,1.2);x.strokeStyle=`rgba(${90*g},${150*g},${60*g},.95)`;x.lineWidth=rnd(1.5,3);x.beginPath();x.moveTo(bx,0);x.quadraticCurveTo(bx+rnd(-6,6),l*.5,bx+rnd(-4,4),l);x.stroke()}return{c,cut:[100,160,64]}}
    case 'beam':{const c=this.cvs(32,128),x=c.getContext('2d');const g=x.createLinearGradient(0,0,0,128);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.6,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,.9)');x.fillStyle=g;x.fillRect(0,0,32,128);
      const h=x.createLinearGradient(0,0,32,0);h.addColorStop(0,'rgba(0,0,0,1)');h.addColorStop(.5,'rgba(0,0,0,0)');h.addColorStop(1,'rgba(0,0,0,1)');x.globalCompositeOperation='destination-out';x.fillStyle=h;x.fillRect(0,0,32,128);return{c,rep:false}}
    }return this.cvs(4)},
  atlas(){const S=128,c=this.cvs(512),x=c.getContext('2d');const cell=(i,fn)=>{x.save();x.translate((i%4)*S,Math.floor(i/4)*S);fn();x.restore()};const R=mulberry32(77);
    const rad=(stops)=>{const g=x.createRadialGradient(64,64,0,64,64,62);stops.forEach(s=>g.addColorStop(s[0],s[1]));return g};
    cell(0,()=>{x.fillStyle=rad([[0,'rgba(255,255,255,1)'],[.25,'rgba(255,255,255,.6)'],[1,'rgba(255,255,255,0)']]);x.fillRect(0,0,S,S)});
    cell(1,()=>{x.fillStyle=rad([[0,'rgba(255,255,255,1)'],[.12,'rgba(255,255,255,.8)'],[.3,'rgba(255,255,255,0)']]);x.fillRect(0,0,S,S);x.fillStyle='rgba(255,255,255,.9)';for(const a of[0,Math.PI/2]){x.save();x.translate(64,64);x.rotate(a);x.beginPath();x.moveTo(-60,0);x.lineTo(0,-4);x.lineTo(60,0);x.lineTo(0,4);x.fill();x.restore()}});
    cell(2,()=>{for(let i=0;i<14;i++){const px=64+(R()-.5)*50,py=64+(R()-.5)*50,r=18+R()*26;const g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'rgba(255,255,255,.28)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,S,S)}});
    cell(3,()=>{const g=x.createRadialGradient(64,84,2,64,70,58);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.75)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.moveTo(64,4);x.bezierCurveTo(100,50,112,92,64,124);x.bezierCurveTo(16,92,28,50,64,4);x.fill()});
    cell(4,()=>{x.strokeStyle='rgba(255,255,255,.95)';x.lineWidth=5;x.lineCap='round';x.translate(64,64);for(let i=0;i<6;i++){x.rotate(Math.PI/3);x.beginPath();x.moveTo(0,0);x.lineTo(0,-50);x.moveTo(0,-28);x.lineTo(-13,-40);x.moveTo(0,-28);x.lineTo(13,-40);x.stroke()}});
    cell(5,()=>{x.fillStyle=rad([[0,'rgba(255,255,255,0)'],[.7,'rgba(255,255,255,0)'],[.85,'rgba(255,255,255,1)'],[1,'rgba(255,255,255,0)']]);x.fillRect(0,0,S,S)});
    cell(6,()=>{x.fillStyle='rgba(255,255,255,1)';x.beginPath();x.ellipse(64,64,22,52,.3,0,7);x.fill();x.strokeStyle='rgba(180,180,180,1)';x.lineWidth=3;x.beginPath();x.moveTo(50,20);x.lineTo(78,108);x.stroke()});
    cell(7,()=>{const g=x.createLinearGradient(40,0,88,0);g.addColorStop(0,'rgba(255,255,255,.3)');g.addColorStop(.5,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,.3)');x.fillStyle=g;x.beginPath();x.moveTo(64,2);x.lineTo(84,64);x.lineTo(64,126);x.lineTo(44,64);x.fill()});
    cell(8,()=>{x.fillStyle=rad([[0,'rgba(255,255,255,.75)'],[.5,'rgba(255,255,255,.3)'],[1,'rgba(255,255,255,0)']]);x.fillRect(0,0,S,S)});
    cell(9,()=>{x.strokeStyle='rgba(255,255,255,1)';x.lineWidth=7;x.lineCap='round';x.beginPath();x.moveTo(34,24);x.lineTo(94,104);x.moveTo(94,24);x.lineTo(64,64);x.moveTo(40,92);x.lineTo(88,92);x.stroke()});
    cell(10,()=>{const g=x.createLinearGradient(0,0,0,S);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.8,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(58,0,12,S)});
    cell(11,()=>{x.fillStyle=rad([[0,'rgba(255,255,255,.2)'],[.75,'rgba(255,255,255,.45)'],[.88,'rgba(255,255,255,1)'],[1,'rgba(255,255,255,0)']]);x.fillRect(0,0,S,S);x.fillStyle='rgba(255,255,255,.95)';x.beginPath();x.arc(46,44,9,0,7);x.fill()});
    cell(12,()=>{x.strokeStyle='rgba(255,255,255,1)';x.lineWidth=4;x.beginPath();let px=64,py=0;x.moveTo(px,py);for(let i=0;i<8;i++){px=64+(R()-.5)*40;py+=16;x.lineTo(px,py)}x.stroke();x.lineWidth=12;x.strokeStyle='rgba(255,255,255,.25)';x.stroke()});
    return{c,rep:false}},
  emoji(e){let t=this.emojiTex.get(e);if(!t){const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');x.font='72px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(e,48,54);t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;this.emojiTex.set(e,t)}return t},
  // ---------- geometry helpers ----------
  rockGeo(s){const g=new THREE.IcosahedronGeometry(1,2);const p=g.attributes.position,R=mulberry32(500+s);const n=this.tnoise(600+s,4);
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const u=Math.atan2(z,x)/6.283+.5,v=Math.acos(clamp(y,-1,1))/3.1416;const k=.78+.38*n(u,v)+R()*.06;p.setXYZ(i,x*k,y*k*(y<0?.55:1),z*k)}
    g.computeVertexNormals();return g},
  quads(list){const P=[],N=[],U=[],I=[];for(const q of list){const b=P.length/3;for(let k=0;k<4;k++){P.push(...q.p[k]);N.push(...q.n[k]);U.push(...q.uv[k])}I.push(b,b+1,b+2,b,b+2,b+3,b,b+2,b+1,b,b+3,b+2)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setIndex(I);g.computeBoundingSphere();return g},
  // smooth leafy puff: a sphere with a few soft bulges, flat-ish underside, darker toward the bottom (vertex colour)
  puffGeo(s){const R=mulberry32(900+s*17),g=new THREE.SphereGeometry(1,this.hi?16:11,this.hi?11:8),p=g.attributes.position,v=new THREE.Vector3(),L=[];
    for(let i=0;i<6+s;i++)L.push(new THREE.Vector3(R()*2-1,R()*1.4-.3,R()*2-1).normalize());
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=v.clone().normalize();let b=0;for(const d of L)b+=Math.pow(Math.max(0,n.dot(d)),5)*.2;const r=1+b-(n.y<-.25?(-.25-n.y)*.42:0);v.multiplyScalar(r);p.setXYZ(i,v.x,v.y,v.z)}
    g.computeVertexNormals();this.weldNormals(g);const c=[];for(let i=0;i<p.count;i++){const k=.68+.46*clamp((p.getY(i)+.9)/2.1,0,1);c.push(k,k,k*.96)}g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));return g},
  // rounded pine tier (lathe): soft skirt edge, origin at the tier's base
  tierGeo(){const pts=[[0,1],[.22,.8],[.5,.48],[.8,.2],[.98,.06],[1,0],[.9,-.05],[.55,-.08],[0,-.08]].map(q=>new THREE.Vector2(q[0],q[1]));const g=new THREE.LatheGeometry(pts,this.hi?12:9);this.weldNormals(g);
    const p=g.attributes.position,c=[];for(let i=0;i<p.count;i++){const k=.66+.48*clamp(p.getY(i)+.1,0,1);c.push(k,k,k*.96)}g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));return g},
  weldNormals(g){const p=g.attributes.position,n=g.attributes.normal,m=new Map();for(let i=0;i<p.count;i++){const k=Math.round(p.getX(i)*1e3)+'_'+Math.round(p.getY(i)*1e3)+'_'+Math.round(p.getZ(i)*1e3);let a=m.get(k);if(!a)m.set(k,a=[0,0,0,[]]);a[0]+=n.getX(i);a[1]+=n.getY(i);a[2]+=n.getZ(i);a[3].push(i)}
    for(const a of m.values()){const l=Math.hypot(a[0],a[1],a[2])||1;for(const i of a[3])n.setXYZ(i,a[0]/l,a[1]/l,a[2]/l)}n.needsUpdate=true},
  leafCluster(s){const R=mulberry32(4100+s*31),V=THREE.Vector3,out=[];
    for(let i=0;i<20;i++){const c=new V();do{c.set(R()*2-1,R()*2-1,R()*2-1)}while(c.lengthSq()>1);c.multiplyScalar(.6);const h=.4+R()*.28;
      const v=new V(R()*2-1,R()*2-1,R()*2-1).normalize();const a=new V(0,1,0);if(Math.abs(v.y)>.9)a.set(1,0,0);a.cross(v).normalize();const b=v.clone().cross(a).normalize();
      const r=R()*6.28,A=a.clone().multiplyScalar(Math.cos(r)).addScaledVector(b,Math.sin(r)),B=a.clone().multiplyScalar(-Math.sin(r)).addScaledVector(b,Math.cos(r));
      const p=[],n=[];for(const [du,dv] of[[-1,-1],[1,-1],[1,1],[-1,1]]){const q=c.clone().addScaledVector(A,du*h).addScaledVector(B,dv*h);p.push([q.x,q.y,q.z]);const m=q.clone().normalize().multiplyScalar(.8).addScaledVector(v,.2).normalize();n.push([m.x,m.y+.15,m.z])}
      out.push({p,n,uv:[[0,0],[1,0],[1,1],[0,1]]})}
    return this.quads(out)},
  pineRing(){const out=[];for(let L=0;L<2;L++){const n=L?7:9,o=L?.35:0,y0=L?.18:0,R1=L?.78:1;
      for(let i=0;i<n;i++){const a=(i+o)/n*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a),px=-sa,pz=ca,w0=.13,w1=.36;
        const p=[[ca*.06-px*w0,y0,sa*.06-pz*w0],[ca*.06+px*w0,y0,sa*.06+pz*w0],[ca*R1+px*w1,y0-.42*R1,sa*R1+pz*w1],[ca*R1-px*w1,y0-.42*R1,sa*R1-pz*w1]];
        const nm=[ca*.45,.9,sa*.45];out.push({p,n:[nm,nm,nm,nm],uv:[[1,0],[0,0],[0,1],[1,1]]})}}
    return this.quads(out)},
  blobGeo(s){const g=new THREE.IcosahedronGeometry(1,2);const p=g.attributes.position;const n=this.tnoise(700+s,5);
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const u=Math.atan2(z,x)/6.283+.5,v=Math.acos(clamp(y,-1,1))/3.1416;const k=.82+.32*n(u,v);p.setXYZ(i,x*k,y*k,z*k)}
    g.computeVertexNormals();return g},
  tuftGeo(n){n=n||3;const pos=[],uv=[],idx=[];for(let k=0;k<n;k++){const a=k*Math.PI/n,c=Math.cos(a)*.5,s=Math.sin(a)*.5;const b=pos.length/3;pos.push(-c,0,-s,c,0,s,c,1,s,-c,1,-s);uv.push(0,0,1,0,1,1,0,1);idx.push(b,b+1,b+2,b,b+2,b+3,b,b+2,b+1,b,b+3,b+2)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.setAttribute('normal',new THREE.Float32BufferAttribute(pos.map((v,i)=>i%3===1?1:0),3));return g},
  boxUV(w,h,d,s){const g=new THREE.BoxGeometry(w,h,d);const uv=g.attributes.uv;const dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let v=0;v<4;v++){const i=f*4+v;uv.setXY(i,uv.getX(i)*dims[f][0]/s,uv.getY(i)*dims[f][1]/s)}return g},
  merge(list){let n=0,ni=0;for(const g of list){n+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count}
    const pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2),col=list.some(g=>g.attributes.color)?new Float32Array(n*3):null,idx=new Uint32Array(ni);let o=0,oi=0;
    for(const g of list){const c=g.attributes.position.count;pos.set(g.attributes.position.array,o*3);if(g.attributes.normal)nor.set(g.attributes.normal.array,o*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,o*2);if(col&&g.attributes.color)col.set(g.attributes.color.array,o*3);
      if(g.index){for(let i=0;i<g.index.count;i++)idx[oi+i]=g.index.array[i]+o;oi+=g.index.count}else{for(let i=0;i<c;i++)idx[oi+i]=o+i;oi+=c}o+=c;g.dispose()}
    const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.BufferAttribute(pos,3));m.setAttribute('normal',new THREE.BufferAttribute(nor,3));m.setAttribute('uv',new THREE.BufferAttribute(uv,2));if(col)m.setAttribute('color',new THREE.BufferAttribute(col,3));m.setIndex(new THREE.BufferAttribute(idx,1));m.computeBoundingSphere();return m},
  tg(g,x,y,z,ry,rx,rz){if(rx)g.rotateX(rx);if(rz)g.rotateZ(rz);if(ry)g.rotateY(ry);g.translate(x,y,z);return g},
  hAt(x,y){return x>=0&&y>=0&&x<=WORLD&&y<=WORLD?heightAt(x,y):terrH(x,y)},
  gY(x,y){const b=onBridge(x,y);if(b)return this.bridgeY(b,x,y);return Math.max(this.hAt(x,y),WL-14)},
  bridgeY(b,x,y){if(b.dock)return 4;const al=(x-b.x)*b.ax+(y-b.y)*b.ay;const t=clamp(al/(b.len/2),-1,1);return 7+(b.big?30:24)*(1-t*t)},

  // ---------- static world ----------
  rebind(){this.world=WD;this.roofs.forEach((r,i)=>r.h=WD.houses[i]);this.domes.forEach((d,i)=>d.c=WD.caves[i]);this.shrines.forEach((q,i)=>q.s=WD.shrines[i]);this.trees=WD.trees;
    for(const o of this.objs.values())this.scene.remove(o.root);this.objs=new Map();for(const g of this.itemObjs.values())this.scene.remove(g);this.itemObjs=new Map();
    for(const d of this.decalPool){d.on=false;d.m.visible=false}this.PA.list=[];this.PB.list=[];this.spikes=[];this.treeHidden.fill(0);for(const t of this.trees)if(t._i===undefined)t._i=0;
    WD.trees.forEach((t,i)=>t._i=i)},
  sync(){if(this.world===WD)return;if(this.world&&this.scene&&this.world.seed===WD.seed&&this.world.houses.length===WD.houses.length)this.rebind();else this.buildWorld()},
  buildWorld(){
    if(this.scene)this.disposeScene();
    const S=this.scene=new THREE.Scene();this.world=WD;this.objs=new Map();this.itemObjs=new Map();this.pool={};this.decals=[];this.trails=[];this.deadObjs=[];const G=this.G;
    S.background=new THREE.Color('#8fb4d8');S.fog=new THREE.FogExp2('#a8c4dc',.000085);if(this.envTex)S.environment=this.envTex;
    this.hemi=new THREE.HemisphereLight('#cfe4ff','#4a4030',1.0);S.add(this.hemi);
    const d=this.sun=new THREE.DirectionalLight('#fff0d8',2.8);d.castShadow=true;d.shadow.mapSize.set(this.shadowSize,this.shadowSize);const sc=d.shadow.camera;sc.left=-1400;sc.right=1400;sc.top=1400;sc.bottom=-1400;sc.near=100;sc.far=4600;d.shadow.bias=-.0006;d.shadow.normalBias=2.2;d.shadow.intensity=.8;S.add(d);S.add(d.target);
    this.plight=new THREE.PointLight('#ffd8a8',0,900,1);this.plight.castShadow=false;S.add(this.plight);
    this.buildTerrain();this.buildWater();this.buildVegetation();this.buildRocks();this.buildBuildings();this.buildCastle();this.buildProps();
    // zone
    this.zoneWall=new THREE.Mesh(new THREE.CylinderGeometry(1,1,520,160,1,true),new THREE.MeshBasicMaterial({color:'#b46bff',transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false}));this.zoneWall.userData.ownMat=1;S.add(this.zoneWall);
    this.staticGlow=this.glowSet(this.glows);S.add(this.staticGlow);
    this.initFX();
  },
  buildTerrain(){const St=50,x0=-1700,x1=WORLD+1700,n=Math.round((x1-x0)/St)+1;const N=n*n;const pos=new Float32Array(N*3),col=new Float32Array(N*3),reg=new Float32Array(N*4),rq=[0,0,0,0];const C=this.col;
    const W1=new THREE.Color('#e8f0c8'),E1=new THREE.Color('#9fd0d8'),F1=new THREE.Color('#9aa880'),M1=new THREE.Color('#c0c8a0');const nz=WD.noise,mN=makeNoise(mulberry32(5),900);
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=x0+i*St,y=x0+j*St,k=j*n+i;const h=this.hAt(x,y);pos[k*3]=x;pos[k*3+1]=h;pos[k*3+2]=y;
      const dk=direK(x,y),fo=clamp((nz(x,y)-.46)/.12,0,1),m=mN(x,y);C.copy(W1).lerp(E1,dk);C.lerp(F1,fo*.6);C.multiplyScalar(.92+m*.16);if(h>40)C.lerp(M1,clamp((h-40)/300,0,1));col[k*3]=C.r;col[k*3+1]=C.g;col[k*3+2]=C.b;if(MOON){REG.mix(x,y,rq);reg[k*4]=rq[0];reg[k*4+1]=rq[1];reg[k*4+2]=rq[2];reg[k*4+3]=rq[3]}}
    const idx=new Uint32Array((n-1)*(n-1)*6);let o=0;for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i,b=a+1,c=a+n,d=c+1;if(Math.abs(pos[a*3+1]-pos[d*3+1])<Math.abs(pos[b*3+1]-pos[c*3+1])){idx[o++]=a;idx[o++]=c;idx[o++]=d;idx[o++]=a;idx[o++]=d;idx[o++]=b}else{idx[o++]=a;idx[o++]=c;idx[o++]=b;idx[o++]=b;idx[o++]=c;idx[o++]=d}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setAttribute('aReg',new THREE.BufferAttribute(reg,4));g.setIndex(new THREE.BufferAttribute(idx,1));g.computeVertexNormals();
    const spl=this.ctex(paintMasks(.1024),false,false);spl.flipY=false;spl.minFilter=THREE.LinearFilter;spl.generateMipmaps=false;
    const tu={tGrass:{value:this.tex('grass')},tDirt:{value:this.tex('dirt')},tCob:{value:this.tex('cobble')},tRock:{value:this.tex('rock')},tSand:{value:this.tex('sand')},uSplat:{value:spl},uZoneN:this.U.zoneN};
    const m=new THREE.MeshLambertMaterial({vertexColors:true});
    this.fow(m,{key:'terr'+(this.hi?'h':'l')+(MOON?'c':''),cut:true,uniforms:tu,
      vert:vs=>'varying vec3 vWN;attribute vec4 aReg;varying vec4 vReg;\n'+vs.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvWN=normalize(objectNormal);vReg=aReg;'),
      frag:fs=>zlines('uniform sampler2D tGrass,tDirt,tCob,tRock,tSand,uSplat;varying vec3 vWN;varying vec4 vReg;\n'+fs.replace('#include <color_fragment>',`vec3 tBump=vec3(0.);
        {vec2 w=vFowW;vec4 sp=texture2D(uSplat,w/${WORLD.toFixed(1)});
         ${this.hi?'vec3 g1=texture2D(tGrass,w*.0046).rgb,g2=texture2D(tGrass,w*.0012+.37).rgb;vec3 c=mix(g1,g2,.42)*vColor.rgb*1.05;':'vec3 c=texture2D(tGrass,w*.0046).rgb*vColor.rgb*1.05;'}
         c=mix(c,vec3(dot(c,vec3(.3,.59,.11)))*vReg.rgb,vReg.a);
         vec3 dt=texture2D(tDirt,w*.0058).rgb;c=mix(c,dt,clamp(sp.r*1.25,0.,1.));c=mix(c,dt*vec3(.78,.7,.6),sp.b*.9);
         c=mix(c,texture2D(tCob,w*.0072).rgb,sp.g);
         float wt=smoothstep(-.8,-6.,vWY);vec3 sd=texture2D(tSand,w*.0052).rgb;c=mix(c,sd*mix(1.,.5,smoothstep(-6.,-20.,vWY)),wt);
         ${this.hi?'vec3 an=abs(normalize(vWN));an=pow(an,vec3(4.));an/=an.x+an.y+an.z;vec3 rk=texture2D(tRock,vec2(w.y,vWY)*.0028).rgb*an.x+texture2D(tRock,w*.0028).rgb*an.y+texture2D(tRock,vec2(w.x,vWY)*.0028).rgb*an.z;':'vec3 rk=texture2D(tRock,(w+vec2(0.,vWY*.6))*.0028).rgb;'}
         float k=clamp(max(1.-smoothstep(.62,.86,vWN.y),smoothstep(28.,190.,vWY)*.88),0.,1.);float gk=smoothstep(.75,.95,vWN.y)*(1.-smoothstep(260.,520.,vWY));k=k*(1.-gk*.75);c=mix(c,rk,k);
         float sn=smoothstep(960.,1150.,vWY+texture2D(uDetail,w*.002).r*240.)*smoothstep(.42,.7,vWN.y);c=mix(c,vec3(.92,.95,1.)*(.85+.15*texture2D(tRock,w*.004).r),sn);
         {float mv=texture2D(uDetail,w*.00021).r,dv=texture2D(uDetail,w*.00013+.31).r;c*=mix(.86,1.1,mv);c=mix(c,c*vec3(1.13,1.05,.78),smoothstep(.55,.8,dv)*.45*(1.-k)*(1.-wt));
          c*=mix(.8,1.,smoothstep(.55,.92,vWN.y));
          float pv=texture2D(uDetail,w*.0011+.17).r,pv2=texture2D(uDetail,w*.0031+.53).r;float gm_=(1.-k)*(1.-wt)*(1.-sp.g)*(1.-clamp(sp.r*1.25,0.,1.));
          c=mix(c,c*vec3(.62,.74,.6),smoothstep(.42,.7,pv)*.55*gm_);c=mix(c,c*vec3(1.16,1.12,.8),smoothstep(.6,.85,pv2)*.3*gm_);
          float lu=dot(c,vec3(.3,.59,.11));${TOON?`{vec3 hu=c/max(lu,.02);c=hu*mix(lu,.3,.62);float pk=clamp(sp.r*1.25,0.,1.)+sp.b;
            c=mix(c,vec3(.3,.6,.08)*(.85+lu*.8),gm_*.7);c=mix(c,vec3(.83,.74,.5)*(.82+lu*.5),clamp(pk,0.,1.)*(1.-k)*.65);c=mix(c,vec3(.5,.52,.7)*(.75+lu*.6),k*.65);c=mix(c,vec3(.9,.86,.66),wt*.4);}`:'c=mix(vec3(lu),c,.8)*vec3(.98,.93,.88);'}}
         ${this.hi?'{float hh=dot(c,vec3(.33,.5,.17));tBump=vec3(-dFdx(hh),0.,dFdy(hh))*'+(TOON?'.6':'2.6')+';}':''}
         ${TOON?'':`{float uw=clamp((${WL.toFixed(1)}-vWY)/2.5,0.,1.);if(uw>0.){float dp=clamp((${WL.toFixed(1)}-vWY)/34.,0.,1.);vec2 q=w*.011;
           float a1=texture2D(uDetail,q+vec2(uTime*.021,uTime*.014)).r,a2=texture2D(uDetail,q*1.37+vec2(-uTime*.018,uTime*.023)).r;float ca=pow(clamp(1.-abs(a1-a2)*3.2,0.,1.),6.);
           vec3 bed=texture2D(tRock,w*.014).rgb*vec3(.62,.66,.58);c=mix(c,bed,uw*.55);c=mix(c,c*vec3(.42,.58,.54),uw*(.55+dp*.35));c+=vec3(.42,.62,.56)*ca*uw*(1.-dp*.8)*.22;}}`}
         diffuseColor.rgb=c;}`).replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n normal=normalize(normal+(viewMatrix*vec4(tBump,0.)).xyz);'))});
    const t=new THREE.Mesh(g,m);t.receiveShadow=true;t.userData.ownMat=1;this.scene.add(t);this.terrain=t;
    // grass density map for the dynamic ground cover (0 = none)
    {const gt=WD.tg,n2=gt.n,M=Math.round(WORLD*.025),md=paintMasks(.025).getContext('2d').getImageData(0,0,M,M).data;const dens=new Uint8Array(n2*n2);
      for(let j=0;j<n2;j++)for(let i=0;i<n2;i++){const k=j*n2+i,h=gt.hg[k];if(h>20||h<-1.5||gt.blk[k]){continue}const mi=(Math.floor(j/n2*M)*M+Math.floor(i/n2*M))*4;const road=md[mi]/255,cob=md[mi+1]/255,fld=md[mi+2]/255;
        dens[k]=Math.round(255*clamp(1-road*1.6-cob*2-fld*2,0,1))}
      for(const hs of WD.houses)for(let y=hs.y;y<hs.y+hs.h;y+=20)for(let x=hs.x;x<hs.x+hs.w;x+=20){const i=Math.floor(x/gt.C),j=Math.floor(y/gt.C);if(i>=0&&j>=0&&i<n2&&j<n2)dens[j*n2+i]=0}
      for(let j=0;j<n2;j++)for(let i=0;i<n2;i++){const k=j*n2+i;if(dens[k]&&caveK((i+.5)*gt.C,(j+.5)*gt.C)>0)dens[k]=0}
      if(WD.dg){const D=WD.dg;for(const e of D.ents)for(let y=e.y-160;y<e.y+160;y+=20)for(let x=e.x-160;x<e.x+160;x+=20){const i=Math.floor(x/gt.C),j=Math.floor(y/gt.C);if(i>=0&&j>=0&&i<n2&&j<n2)dens[j*n2+i]=0}
        for(let y=D.y;y<D.y+D.h;y+=20)for(let x=D.x;x<D.x+D.w;x+=20){const i=Math.floor(x/gt.C),j=Math.floor(y/gt.C);if(i>=0&&j>=0&&i<n2&&j<n2)dens[j*n2+i]=0}}
      const CS=WD.castle;for(let y=CS.y;y<CS.y+CS.h;y+=20)for(let x=CS.x;x<CS.x+CS.w;x+=20){const i=Math.floor(x/gt.C),j=Math.floor(y/gt.C);if(i>=0&&j>=0&&i<n2&&j<n2)dens[j*n2+i]=0}
      this.gdens=dens}},
  buildWater(){const S=this.scene;
    const c=this.cvs(512),x=c.getContext('2d'),img=x.createImageData(512,512);for(let j=0;j<512;j++)for(let i=0;i<512;i++){const wx=(i+.5)/512*WORLD,wy=(j+.5)/512*WORLD;const h=heightAt(wx,wy);const d=clamp((WL-h)/26,0,1);const k=(j*512+i)*4;img.data[k]=d*255;img.data[k+1]=d*255;img.data[k+2]=d*255;img.data[k+3]=255}
    x.putImageData(img,0,0);const dt=this.ctex(c,false,false);dt.flipY=false;
    const wn=this.ctex(this.normFrom(this.genTex('water').c,6),false);wn.repeat.set(70,70);this.waterN=wn;
    const m=this.hi?new THREE.MeshStandardMaterial({color:TOON?'#2aa8c0':'#2a6a80',roughness:.16,metalness:0,transparent:true,envMap:this.envTex,envMapIntensity:TOON?.55:.34,normalMap:wn,normalScale:new THREE.Vector2(.45,.45),depthWrite:false})
      :new THREE.MeshPhongMaterial({color:TOON?'#2aa8c0':'#2a6a80',shininess:90,specular:'#a0c8d8',transparent:true,normalMap:wn,normalScale:new THREE.Vector2(.5,.5),depthWrite:false});
    this.fow(m,{key:'water',uniforms:{uWD:{value:dt},uZoneN:this.U.zoneN},frag:fs=>zlines('uniform sampler2D uWD;\n'+fs.replace('#include <map_fragment>',`#include <map_fragment>
      {float dp=texture2D(uWD,vFowW/${WORLD.toFixed(1)}).r;vec3 sh=${TOON?'vec3(.09,.3,.3)':'vec3(.07,.27,.26)'},dc=vec3(.012,.06,.11);diffuseColor.rgb=mix(sh,dc,smoothstep(.0,${TOON?'.6':'.85'},dp));
       float fm=(1.-smoothstep(.0,.07,dp))*(.55+.45*sin(uTime*2.2+vFowW.x*.045+vFowW.y*.03));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.82,.9,.92),fm*.6);diffuseColor.a=${TOON?'mix(.55,.95,smoothstep(.0,.3,dp))':'mix(.34,.92,smoothstep(.03,.6,dp))'};}`))});
    const wq=[],Cq=100,nq=WORLD/Cq;for(let j=0;j<nq;j++)for(let i=0;i<nq;i++){let wet=false;for(let b=0;b<=4&&!wet;b++)for(let a2=0;a2<=4&&!wet;a2++)if(heightAt(i*Cq+a2*25,j*Cq+b*25)<WL+1.5)wet=true;if(!wet)continue;
      const x0=i*Cq,y0=j*Cq;wq.push(x0,0,y0,x0,0,y0+Cq,x0+Cq,0,y0+Cq,x0,0,y0,x0+Cq,0,y0+Cq,x0+Cq,0,y0)}
    const wgeo=new THREE.BufferGeometry();wgeo.setAttribute('position',new THREE.Float32BufferAttribute(wq,3));const wuv=[];for(let i=0;i<wq.length;i+=3)wuv.push(wq[i]/WORLD,wq[i+2]/WORLD);wgeo.setAttribute('uv',new THREE.Float32BufferAttribute(wuv,2));wgeo.computeVertexNormals();
    const w=new THREE.Mesh(wgeo,m);w.position.set(0,WL,0);w.renderOrder=2;w.receiveShadow=true;w.userData.ownMat=1;S.add(w);this.water=w;
    // waterfall
    const F=WD.wf;if(F){const ox=-F.nx,oy=-F.ny,px=-F.ny,py=F.nx;const pts=[],uv=[],idx=[];const nv=16,nu=6,wd=170;
      const outC=h=>{let lo=-45,hi=15;for(let i=0;i<20;i++){const m=(lo+hi)/2;if(330*smooth01((m+45)/60)<h)lo=m;else hi=m}return lo};
      for(let v=0;v<=nv;v++){const t=v/nv;const h=lerp(345,WL,t);const out=Math.min(outC(Math.min(h,329))-30,26-t*60)+Math.sin(t*Math.PI)*-6;for(let u=0;u<=nu;u++){const s=(u/nu-.5)*wd*(1+t*.3);pts.push(F.x+ox*out+px*s,h,F.y+oy*out+py*s);uv.push(u/nu,t*2.2)}}
      for(let v=0;v<nv;v++)for(let u=0;u<nu;u++){const a=v*(nu+1)+u,b=a+1,c2=a+nu+1,d=c2+1;idx.push(a,c2,b,b,c2,d)}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
      const ft=this.tex('falls');const fm=this.fow(new THREE.MeshBasicMaterial({map:ft,color:'#e8f6ff',transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));
      const wf=new THREE.Mesh(g,fm);wf.renderOrder=3;wf.userData.ownMat=1;S.add(wf);this.falls=ft;
      const ft2=ft.clone();ft2.needsUpdate=true;ft2.repeat.set(1.6,1);this.falls2=ft2;const w2=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:ft2,color:'#ffffff',transparent:true,opacity:.45,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));w2.renderOrder=4;w2.userData.ownMat=1;S.add(w2);
      this.fallsBase={x:F.x-ox*60,y:F.y-oy*60,px,py}}
    // lily pads & reeds
    const lp=this.instC(G_cyl(this),this.std('#3f7a34',.7,0),WD.lilies,(l,add)=>add(l.x,WL+.6,l.y,16*l.s,.8,16*l.s,0,l.a,0,null),false);
    this.instC(this.G.sph,this.std('#ffb8d0',.5,0),WD.lilies.filter(l=>l.f),(l,add)=>add(l.x+5,WL+3,l.y+3,5,3,5,0,0,0,null),false);
    const rm=this.std('#7a8a42',.8,0),rh=this.std('#5a3a20',.9,0);
    this.instC(this.cylg(.6,1,1,5),rm,WD.reeds,(r,add)=>{const b=this.gY(r.x,r.y);for(let k=0;k<3;k++){const a=k*2.1+r.x,h=(34+k*9)*r.s;add(r.x+Math.cos(a)*7,b+h/2,r.y+Math.sin(a)*7,2,h,2,Math.cos(a)*.15,0,Math.sin(a)*.15,null)}},false);
    this.instC(this.cylg(1,1,1,6),rh,WD.reeds,(r,add)=>{const b=this.gY(r.x,r.y);const a=r.x;add(r.x+Math.cos(a)*7,b+42*r.s,r.y+Math.sin(a)*7,3.2,12,3.2,0,0,0,null)},false)},
  windMat(base,key,amt){return this.fow(base,{key:'wind'+key,vert:vs=>vs.replace('#include <begin_vertex>',`#include <begin_vertex>
      {vec3 ip=vec3(0.);
      #ifdef USE_INSTANCING
      ip=instanceMatrix[3].xyz;
      #endif
      float sw=sin(uTime*1.6+ip.x*.011+ip.z*.013)+.4*sin(uTime*3.7+ip.x*.03);transformed.x+=sw*max(position.y,0.)*${amt};transformed.z+=sw*.6*max(position.y,0.)*${amt};}`)})},
  buildVegetation(){const S=this.scene,G=this.G;
    const bark=this.tstd('bark','#8a6a50',.9,0),birch=this.tstd('birch','#ffffff',.85,0);const lv=this.tex('leaves');
    let leafM,pineM,magicM;const EM={emissive:'#ffffff',emissiveMap:lv,emissiveIntensity:TOON?.42:.16};leafM=this.windMat(this.hi?new THREE.MeshStandardMaterial(Object.assign({map:lv,roughness:.85,metalness:0,envMap:this.envTex,envMapIntensity:.6},EM)):new THREE.MeshLambertMaterial(Object.assign({map:lv},EM)),'L',.05);
    pineM=this.windMat(this.hi?new THREE.MeshStandardMaterial(Object.assign({map:lv,roughness:.9,metalness:0,flatShading:true,envMap:this.envTex,envMapIntensity:.5},EM)):new THREE.MeshLambertMaterial(Object.assign({map:lv,flatShading:true},EM)),'P',.03);
    magicM=this.windMat(new THREE.MeshLambertMaterial({map:lv,emissive:'#1a3a48',emissiveIntensity:.8}),'M',.05);
    const willowM=this.windMat(new THREE.MeshLambertMaterial({map:this.tex('strands'),alphaTest:.5,side:THREE.DoubleSide,transparent:false}),'W',.07);
    const hiF=this.hi;const cardM=hiF&&this.windMat(new THREE.MeshStandardMaterial({map:this.tex('leafc'),alphaTest:.42,roughness:.8,metalness:0,envMap:this.envTex,envMapIntensity:.45,emissive:'#ffffff',emissiveMap:this.tex('leafc'),emissiveIntensity:TOON?.42:.14}),'C',.05);
    const needM=hiF&&this.windMat(new THREE.MeshStandardMaterial({map:this.tex('needle'),alphaTest:.42,roughness:.85,metalness:0,envMap:this.envTex,envMapIntensity:.4,emissive:'#ffffff',emissiveMap:this.tex('needle'),emissiveIntensity:TOON?.4:.14}),'N',.03);
    if(this.post)for(const m of[cardM,needM,willowM])if(m)m.alphaToCoverage=true;   // multisampled leaf edges instead of hard cut-outs
    // toon look: smooth rounded puffs with a soft top-light gradient instead of textured cards
    const TF=TOON,puff=TF?[0,1,2].map(s=>this.puffGeo(s)):null,tier=TF?this.tierGeo():null;
    if(TF){leafM=this.windMat(new THREE.MeshLambertMaterial({vertexColors:true}),'L',.05);pineM=this.windMat(new THREE.MeshLambertMaterial({vertexColors:true}),'P',.03);
      magicM=this.windMat(new THREE.MeshLambertMaterial({vertexColors:true,emissive:'#1e3450',emissiveIntensity:.3}),'M',.05)}
    const cards=hiF&&!TF,BLOB=i=>TF?puff[i]:G.blob[i],CONE=TF?tier:G.cone6,SQ=TF?1:.72;
    const dimC=(c,k)=>'#'+new THREE.Color(c).multiplyScalar(k).getHexString();
    this.treeMats=[leafM,pineM,magicM].concat(cards?[cardM,needM]:[]);
    const tr=WD.trees;this.trees=tr;this.treeHidden=new Uint8Array(tr.length);this.treeParts=tr.map(()=>[]);tr.forEach((t,i)=>t._i=i);
    const reg=(t,im,i)=>{if(t._i!==undefined)this.treeParts[t._i].push([im,i])};const RT=t=>mulberry32(Math.floor(t.x*7+t.y));
    const TH=t=>(t.v===2?70:t.v===5?54:t.v===6?44:t.v===1?40:38)*t.h;
    // Arena Royale: birches become the owner's Meshy Verdant Solitude tree (moonfall-village.js) when it is loaded
    const MT0=this.verdantOn&&this.verdantOn()?(t=>t.v===2):(()=>false);
    // ...mango trees (birch-class items flagged mg) become the owner's Big Mango Tree when it is loaded (moonfall-village.js mangoTrees)
    const MG=this.mangoOn&&this.mangoOn()?(t=>!!t.mg):(()=>false),MT=t=>MT0(t)||MG(t);
    // ...and pines become the owner's Meshy pine (moonfall-village.js pineTrees) when it is loaded
    const PM=this.pineOn&&this.pineOn()?(t=>t.v===0||t.v===4):(()=>false);
    // trunks
    this.instC(G.cylT,bark,tr.filter(t=>t.v!==2&&!PM(t)),(t,add)=>{const R=RT(t),th=TH(t),b=this.gY(t.x,t.y);add(t.x,b+th/2,t.y,t.v===1||t.v===6?11:t.v===5?7:8,th,t.v===1||t.v===6?11:8,0,R()*6,0,t.v===3?'#8a7aa8':t.v===5?'#5a4048':'#ffffff')},true);
    this.instC(G.cylT,birch,tr.filter(t=>t.v===2&&!MT(t)),(t,add)=>{const th=TH(t),b=this.gY(t.x,t.y);add(t.x,b+th/2,t.y,6,th,6,0,t.x,0,'#ffffff')},true);
    // pines (valley + dark) as stacked cones
    const PINE=TF?['#3f9e4c','#4aaa56','#389348','#52b05a']:['#3a7a3c','#457f40','#356a34','#4a8844'],DPINE=TF?['#2f8a80','#36968a','#2a7c76']:['#2a5a54','#2f6458','#264a48'];
    const pines=tr.filter(t=>(t.v===0||t.v===4)&&!PM(t)),TIERS_P=[[1,1.05,.4],[.78,.95,.95],[.52,.85,1.45],[.28,.6,1.85]];
    this.instC(CONE,pineM,pines,(t,add)=>{const R=RT(t),th=TH(t),cr=t.cr,b=this.gY(t.x,t.y),P=t.v===0?PINE:DPINE,k=cards?.82:1;for(const q of TIERS_P)add(t.x,b+th+cr*q[2]-(TF?cr*q[1]*.25:0),t.y,cr*q[0]*k*(TF?1.12:1),cr*q[1]*(TF?.82:1),cr*q[0]*k*(TF?1.12:1),0,R()*6,0,cards?dimC(P[Math.floor(R()*P.length)],.85):P[Math.floor(R()*P.length)])},true,reg);
    if(cards)this.instC(G.pineRing,needM,pines,(t,add)=>{const R=RT(t),th=TH(t),cr=t.cr,b=this.gY(t.x,t.y),P=t.v===0?PINE:DPINE;for(const q of TIERS_P){R();add(t.x,b+th+cr*q[2]-cr*q[1]*.2,t.y,cr*q[0]*1.28,cr*q[1]*.95,cr*q[0]*1.28,0,R()*6,0,P[Math.floor(R()*P.length)])}},true,reg);
    // oak / birch / willow / magic / dead canopies from noisy blobs
    const OAK=TF?['#62b83c','#70c446','#58aa36','#7ccc4e']:['#5a8a3c','#6a9a44','#4f7f36','#76a24c'],BIR=TF?['#a6d454','#b4dc60','#98c84c']:['#9ac45a','#a8cc64','#8ab84e'],MAG=TF?['#3aa49c','#7a62c0','#3a86c0','#a466b8']:['#3ac8c0','#9a6ae8','#4aa8f0','#d07ae0'],DEAD=['#6a3a5e','#7a4a4e','#5a3a6a'],WIL=['#7aa84c','#86b056'];
    for(let bi=0;bi<3;bi++){const canL=tr.filter(t=>(t.v===1||t.v===2||t.v===6||t.v===5)&&!MT(t)&&(Math.floor(t.x+t.y)%3===bi));
      const canP=(t,add)=>{const R=RT(t),th=TH(t),cr=t.cr,b=this.gY(t.x,t.y);
        if(t.v===1)for(const q of[[0,.5,0,.86,.68],[-.4,.86,.12,.6,.5],[.42,.8,-.18,.56,.48],[0,1.08,.1,.5,.42]])add(t.x+cr*q[0],b+th+cr*q[1],t.y+cr*q[2],cr*q[3],cr*q[4],cr*q[3],R(),R()*6,0,OAK[Math.floor(R()*OAK.length)]);
        else if(t.v===2)for(const q of[[0,.2,0,.5,.62],[.18,.75,.1,.42,.5],[-.12,1.15,0,.32,.42]])add(t.x+cr*q[0],b+th+cr*q[1]-20,t.y+cr*q[2],cr*q[3],cr*q[4],cr*q[3],R(),R()*6,0,BIR[Math.floor(R()*BIR.length)]);
        else if(t.v===6)add(t.x,b+th+cr*.32,t.y,cr*.95,cr*(TF?.62:.5),cr*.95,0,R()*6,0,WIL[Math.floor(R()*WIL.length)]);
        else for(const s of[-1,1])add(t.x+s*cr*.5,b+th*.85+cr*.32,t.y+R()*10,cr*.34,cr*.26,cr*.34,0,0,0,DEAD[Math.floor(R()*DEAD.length)])};
      if(TF)this.instC(BLOB(bi),leafM,canL,(t,add)=>canP(t,(x,y,z,sx,sy,sz,rx,ry,rz,c)=>add(x,y,z,sx*1.05,sy*1.05,sz*1.05,0,ry,0,c)),true,reg);
      else if(hiF){this.instC(G.blob[bi],leafM,canL,(t,add)=>canP(t,(x,y,z,sx,sy,sz,rx,ry,rz,c)=>add(x,y,z,sx*.72,sy*.72,sz*.72,rx,ry,rz,c&&dimC(c,.78))),true,reg);
        this.instC(G.leafc[bi],cardM,canL,(t,add)=>canP(t,(x,y,z,sx,sy,sz,rx,ry,rz,c)=>add(x,y,z,sx*1.14,sy*1.1,sz*1.14,rx,ry,rz,c)),true,reg)}
      else this.instC(G.blob[bi],leafM,canL,canP,true,reg)}
    // boughs reaching from the trunk top into oak canopies
    if(cards)this.instC(G.cylT,bark,tr.filter(t=>t.v===1),(t,add)=>{const R=mulberry32(Math.floor(t.x*13+t.y*7)),th=TH(t),cr=t.cr,b=this.gY(t.x,t.y);
      for(let k=0;k<3;k++){const a=k/3*6.283+R(),tl=.55+R()*.35,len=cr*(.62+R()*.25),dx=Math.sin(tl)*Math.cos(a),dy=Math.cos(tl),dz=Math.sin(tl)*Math.sin(a);
        add(t.x+dx*len*.5,b+th*.82+dy*len*.5,t.y+dz*len*.5,5,len,5,0,-a,-tl,null)}},true,reg);
    // enchanted trees: a full leafy crown in one glowing hue per tree
    if(this.verdantOn&&this.verdantOn())this.verdantTrees(tr.filter(t=>MT0(t)&&!MG(t)),reg);
    if(this.mangoOn&&this.mangoOn())this.mangoTrees(tr.filter(MG),reg);
    if(this.pineOn&&this.pineOn())this.pineTrees(tr.filter(PM),reg);
    {const mg=tr.filter(t=>t.v===3),magP=(t,add,k)=>{const R=RT(t),th=TH(t),cr=t.cr,b=this.gY(t.x,t.y),c=MAG[Math.floor(R()*MAG.length)];
        for(const q of[[0,.5,0,.8,.64],[-.38,.84,.12,.56,.48],[.4,.78,-.16,.52,.46],[0,1.06,.08,.46,.4]])add(t.x+cr*q[0],b+th+cr*q[1],t.y+cr*q[2],cr*q[3]*k,cr*q[4]*k,cr*q[3]*k,R(),R()*6,0,c)};
      this.instC(BLOB(1),magicM,mg,(t,add)=>magP(t,add,cards?.72:1),true,reg);
      if(cards){const magC=this.windMat(new THREE.MeshStandardMaterial({map:this.tex('leafc'),alphaTest:.42,roughness:.8,metalness:0,emissive:'#3a6a78',emissiveMap:this.tex('leafc'),emissiveIntensity:.7}),'MC',.05);this.treeMats.push(magC);
        this.instC(G.leafc[1],magC,mg,(t,add)=>magP(t,add,1.14),true,reg)}}
    if(!TF)this.instC(G.openCyl,willowM,tr.filter(t=>t.v===6),(t,add)=>{const th=TH(t),cr=t.cr,b=this.gY(t.x,t.y);add(t.x,b+th+cr*.32-cr*.42,t.y,cr*.9,cr*.95,cr*.9,0,t.x,0,'#8f9c80')},true,reg);
    this.instC(this.cylg(.5,1,1,5),bark,tr.filter(t=>t.v===5),(t,add)=>{const th=TH(t),cr=t.cr,b=this.gY(t.x,t.y);for(const s of[-1,1])add(t.x+s*cr*.24,b+th*.82,t.y,3,cr*.72,3,0,0,s*.95,'#5a4048')},true);
    // mountain pines (no shadows, bigger chunks)
    if(!(this.pineMtrees&&this.pineMtrees(WD.mtrees))){this.instC(G.cylT,bark,WD.mtrees,(t,add)=>{add(t.x,t.h+20*t.s,t.y,9*t.s,40*t.s,9*t.s,0,t.x,0,'#ffffff')},false,null,2500);
    this.instC(CONE,pineM,WD.mtrees,(t,add)=>{const R=mulberry32(Math.floor(t.x*3+t.y)),P=t.v===0?PINE:DPINE,cr=62*t.s,th=40*t.s;for(const q of[[1,1.1,.42],[.72,1,1],[.45,.85,1.5]])add(t.x,t.h+th+cr*q[2],t.y,cr*q[0],cr*q[1],cr*q[0],0,R()*6,0,P[Math.floor(R()*P.length)])},true,null,2500)}
    this.treeMeshes=null;
    // bushes (hiding spots)
    const bu=WD.bushes,pf=[[0,0,1],[.45,.2,.74],[-.42,.25,.76],[.1,-.42,.62]];
    const bushP=(b,add)=>{const dire=isDire(b.x,b.y),y=this.gY(b.x,b.y);pf.forEach((q,k)=>add(b.x+q[0]*b.r,y+b.r*.4*q[2],b.y+q[1]*b.r,b.r*.64*q[2],b.r*.52*q[2],b.r*.64*q[2],0,b.x+k,0,dire?(k?'#3a8a7a':'#2e6e64'):TF?(k?'#6cbc48':'#5aa83e'):(k?'#5aa04a':'#468a3c')))};
    if(TF)this.instC(puff[0],leafM,bu,(b,add)=>bushP(b,(x,y,z,sx,sy,sz,rx,ry,rz,c)=>add(x,y,z,sx*1.05,sy*1.05,sz*1.05,0,ry,0,c)),true);
    else if(hiF){this.instC(G.blob[0],leafM,bu,(b,add)=>bushP(b,(x,y,z,sx,sy,sz,rx,ry,rz,c)=>add(x,y,z,sx*.75,sy*.75,sz*.75,rx,ry,rz,c&&dimC(c,.8))),true);
      this.instC(G.leafc[2],cardM,bu,(b,add)=>bushP(b,(x,y,z,sx,sy,sz,rx,ry,rz,c)=>add(x,y,z,sx*1.12,sy*1.12,sz*1.12,rx,ry,rz,c)),true);}
    else this.instC(G.blob[0],leafM,bu,bushP,true);
    this.instC(G.sphLo,this.std('#c82a3a',.4,0),bu.filter(b=>!isDire(b.x,b.y)),(b,add)=>{const R=mulberry32(b.x|0),y=this.gY(b.x,b.y);for(let k=0;k<6;k++){const a=R()*6.3,r=b.r*(.3+R()*.5);add(b.x+Math.cos(a)*r,y+b.r*.55+R()*b.r*.2,b.y+Math.sin(a)*r,2.6,2.6,2.6,0,0,0,null)}},false);
    // tall-grass meadows (hiding spots): dense chest-high blades that sway
    {const tgM=this.windMat(new THREE.MeshLambertMaterial({map:this.tex('blades'),alphaTest:.42,emissive:'#ffffff',emissiveMap:this.tex('blades'),emissiveIntensity:TOON?.5:.12}),'T',.13);if(TOON)tgM.color.setRGB(1.3,1.4,1.05);const pts=[];
      for(const p of WD.tgrass||[]){const R=mulberry32(Math.floor(p.x*7+p.y));const n=Math.round(p.r*p.r/(hiF?520:820));for(let k=0;k<n;k++){const a=R()*6.283,d=Math.sqrt(R())*p.r*.96;pts.push({x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,s:.8+R()*.5,c:R(),e:d/p.r,dr:isDire(p.x,p.y)})}}
      this.instC(G.tuft,tgM,pts,(q,add)=>{const h=(q.e>.82?52:84)*q.s;add(q.x,this.gY(q.x,q.y)-3,q.y,62*q.s,h,62*q.s,0,q.c*6.3,0,q.dr?(q.c<.5?'#7ab8a0':'#98ccb4'):q.c<.33?'#8fb85a':q.c<.66?'#a4c868':'#7fa850')},true)}
    // glowing mushrooms & crystals
    const mu=WD.mush;this.instC(G.cyl,this.std('#f0e8d8',.7,0),mu,(m,add)=>{const y=this.gY(m.x,m.y);add(m.x,y+m.s*.8,m.y,m.s*.35,m.s*1.6,m.s*.35,0,0,0,null)},false);
    this.instC(G.half,this.bas('#ffffff'),mu,(m,add)=>{const y=this.gY(m.x,m.y);add(m.x,y+m.s*1.5,m.y,m.s*1.15,m.s*.9,m.s*1.15,0,0,0,m.c)},false);
    const cr=WD.crystals;this.instC(G.oct,this.std('#ffffff',.15,.1,{emissive:'#ffffff',emissiveIntensity:.35,transparent:true,opacity:.92}),cr,(c,add)=>{const y=this.gY(c.x,c.y);add(c.x,y+c.s*1.4,c.y,c.s*.7,c.s*1.9,c.s*.7,0,c.x,0,c.c);add(c.x+c.s*.8,y+c.s*.8,c.y+c.s*.3,c.s*.4,c.s*1.1,c.s*.4,.3,c.x,.4,c.c)},false);
    // dynamic ground cover pools (grass tufts + flowers follow the camera)
    const gm=this.windMat(new THREE.MeshLambertMaterial({map:this.tex('blades'),alphaTest:.45,emissive:'#ffffff',emissiveMap:this.tex('blades'),emissiveIntensity:TOON?.55:.1}),'G',.1);if(TOON)gm.color.setRGB(1.45,1.55,1.05);
    this.gGrass=this.inst(G.tuft,gm,this.hi?5800:2700,false);this.gGrass.receiveShadow=true;this.gGrass.count=0;this.gGrass.userData.cell=null;
    const fm=this.windMat(new THREE.MeshLambertMaterial({map:this.tex('flower'),alphaTest:.5}),'F',.06);
    this.gFlow=this.inst(G.card,fm,this.hi?1150:560,false);this.gFlow.count=0;
    // farm crops
    for(const f of WD.fields){const ca=Math.cos(f.a),sa=Math.sin(f.a);const pts=[];for(let x=-f.w/2+14;x<f.w/2;x+=26)for(let y=-f.h/2+12;y<f.h/2;y+=f.crop==='wheat'?18:30)pts.push({x:f.x+x*ca-y*sa,y:f.y+x*sa+y*ca});
      if(f.crop==='wheat'){const wm=this.windMat(new THREE.MeshLambertMaterial({map:this.tex('wheat'),alphaTest:.5}),'H',.12);this.instC(G.tuft,wm,pts,(p,add)=>add(p.x,this.gY(p.x,p.y),p.y,30,38,30,0,p.x,0,null),false)}
      else this.instC(G.blob[2],this.std('#7aaa4a',.7,0),pts,(p,add)=>add(p.x,this.gY(p.x,p.y)+6,p.y,10,8,10,0,p.x,0,null),true)}
    this.ground=[];
  },
  buildRocks(){const G=this.G;const rk=WD.rocks.filter(r=>!r.prop&&!(this.plainRock&&this.plainRock(r)));const rm=this.tstd('rock','#ffffff',.92,0,{},'cut');if(TOON)rm.color.setRGB(1.9,1.9,2.25);
    for(let v=0;v<4;v++)this.instC(G.rock[v],rm,rk.filter((r,i)=>i%4===v),(r,add)=>{const R=mulberry32(Math.floor(r.x*3+r.y));const y=this.gY(r.x,r.y);const hy=r.edge?1.2:r.cliff?1:.75;
      add(r.x,y+r.r*hy*.3,r.y,r.r*1.08,r.r*hy,r.r,R()*.4,R()*6,R()*.3,r.cave!==undefined?'#9a94a8':r.edge?'#a8a49a':'#b8b4aa')},true);
    // decor boulders lining cave passages and the waterfall
    const deco=[];for(const c of WD.caves){const L=Math.hypot(c.x-c.mx,c.y-c.my);const nx=(c.x-c.mx)/L,ny=(c.y-c.my)/L;for(let s=0;s<L;s+=40)for(const sd of[-1,1]){const w=c.w+sr2(c.x+s*sd,20,40);deco.push({x:c.mx+nx*s-ny*w*sd,y:c.my+ny*s+nx*w*sd,r:sr2(s+sd,30,50)})}}
    if(!(this.rockDeco&&this.rockDeco(deco)))this.instC(G.rock[1],rm,deco,(r,add)=>{const y=this.gY(r.x,r.y);add(r.x,Math.max(0,y)+r.r*.4,r.y,r.r,r.r*1.4,r.r,0,r.x,0,'#a8a49a')},true)},
  glowSet(list){const g=new THREE.BufferGeometry();const pa=new Float32Array(list.length*3),ca=new Float32Array(list.length*3),sa=new Float32Array(list.length);
    list.forEach((q,i)=>{pa[i*3]=q[0];pa[i*3+1]=q[1];pa[i*3+2]=q[2];this.col.set(q[3]);ca[i*3]=this.col.r*.75;ca[i*3+1]=this.col.g*.75;ca[i*3+2]=this.col.b*.75;sa[i]=q[4]});
    g.setAttribute('position',new THREE.BufferAttribute(pa,3));g.setAttribute('color',new THREE.BufferAttribute(ca,3));g.setAttribute('gsize',new THREE.BufferAttribute(sa,1));
    const m=new THREE.ShaderMaterial({uniforms:{map:{value:this.tex('atlas')},scale:{value:H/2},k:{value:1}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      vertexShader:'attribute float gsize;attribute vec3 color;varying vec3 vC;uniform float scale;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=gsize*scale/-mv.z;gl_Position=projectionMatrix*mv;}',
      defines:this.post?{LIN:1}:{},fragmentShader:'uniform sampler2D map;uniform float k;varying vec3 vC;void main(){vec4 t=texture2D(map,gl_PointCoord*.25+vec2(0.,.75));vec3 c=vC;\n#ifdef LIN\nc=pow(c,vec3(2.2))*1.6;\n#endif\ngl_FragColor=vec4(c*t.a*k,t.a);}'});
    const p=new THREE.Points(g,m);p.frustumCulled=false;p.userData.ownMat=1;return p},
  // ---------- villages ----------
  buildBuildings(){const S=this.scene,G=this.G;this.glows=[];
    const styleTex={tudor:'plaster',lake:'planks',witch:'plaster',cabin:'logs',stone:'bricks'};const styleCol={tudor:'#ffffff',lake:'#a8c0d0',witch:'#9a90a8',cabin:'#ffffff',stone:'#e8e0d0'};
    const walls={},found=[],floors=[];
    for(const q of WD.walls){if(q.castle||q.moonfall)continue;const h=WD.houses[q.house];const st=h.style;(walls[st]=walls[st]||[]).push(this.tg(this.boxUV(q.w,70,q.h,st==='cabin'?110:150),q.x+q.w/2,47,q.y+q.h/2));
      found.push(this.tg(this.boxUV(q.w+6,14,q.h+6,90),q.x+q.w/2,5,q.y+q.h/2))}
    for(const st in walls){const m=new THREE.Mesh(this.merge(walls[st]),this.tstd(styleTex[st],styleCol[st],.88,0));m.castShadow=true;m.receiveShadow=true;S.add(m)}
    if(found.length){const m=new THREE.Mesh(this.merge(found),this.tstd('bricks','#b8b0a0',.9,0));m.castShadow=true;m.receiveShadow=true;S.add(m)}
    for(const h of WD.houses)floors.push(this.tg(this.boxUV(h.w-4,2,h.h-4,120),h.x+h.w/2,1.5,h.y+h.h/2));if(floors.length){const m=new THREE.Mesh(this.merge(floors),this.tstd('planks','#c8a07a',.85,0));m.receiveShadow=true;S.add(m)}
    // timber corner posts, door frames, windows
    const posts=[],frames=[],wins=[];
    for(const h of WD.houses){for(const c of[[h.x,h.y],[h.x+h.w,h.y],[h.x,h.y+h.h],[h.x+h.w,h.y+h.h]])posts.push(this.tg(new THREE.BoxGeometry(14,84,14),c[0],42,c[1]));
      const d=h.door,vert=h.side==='l'||h.side==='r';for(const s of[-1,1])frames.push(this.tg(new THREE.BoxGeometry(vert?20:8,72,vert?8:20),d.x+(vert?0:s*46),36,d.y+(vert?s*46:0)));frames.push(this.tg(new THREE.BoxGeometry(vert?20:100,10,vert?100:20),d.x,74,d.y));
      const R=mulberry32(h.seed);for(const s of['t','b','l','r']){if(s===h.side)continue;const n=s==='t'||s==='b'?Math.max(1,Math.floor(h.w/110)):Math.max(1,Math.floor(h.h/110));
        for(let i=0;i<n;i++){if(R()<.25)continue;const t=(i+.5)/n;let x,y,ry=0;if(s==='t'){x=h.x+h.w*t;y=h.y-1;ry=Math.PI}else if(s==='b'){x=h.x+h.w*t;y=h.y+h.h+1}else if(s==='l'){x=h.x-1;y=h.y+h.h*t;ry=-Math.PI/2}else{x=h.x+h.w+1;y=h.y+h.h*t;ry=Math.PI/2}
          wins.push([x,y,ry])}}}
    const pm=this.tstd('bark','#5a3a24',.9,0);for(const g of[posts,frames])if(g.length){const m=new THREE.Mesh(this.merge(g),pm);m.castShadow=true;m.receiveShadow=true;S.add(m)}
    const wt=this.tex('window');this.winMat=new THREE.MeshStandardMaterial({map:wt,emissiveMap:wt,emissive:'#ffb050',emissiveIntensity:0,roughness:.3,metalness:0});this.fow(this.winMat,{key:'win'});
    const wg=[];for(const w of wins){const g=new THREE.PlaneGeometry(30,34);g.rotateY(w[2]);g.translate(w[0]+Math.sin(w[2])*.5,46,w[1]+Math.cos(w[2])*.5);wg.push(g)}
    if(wg.length){const m=new THREE.Mesh(this.merge(wg),this.winMat);m.userData.ownMat=1;S.add(m)}
    // gable roofs (fade when you step inside)
    this.roofs=WD.houses.map(h=>{const g=new THREE.Group();const along=h.w>=h.h,L=(along?h.w:h.h)+40,Wd=(along?h.h:h.w)+44,rh=h.style==='witch'?120:h.style==='cabin'?70:95;
      const tk=h.style==='cabin'||h.style==='tudor'&&(h.seed%3===0)?'thatch':'tiles';const T=this.tex(tk);
      const mk=(c)=>{const m=this.hi?new THREE.MeshStandardMaterial({color:c,map:T,roughness:.85,metalness:0,transparent:true,envMap:this.envTex,envMapIntensity:.6}):new THREE.MeshLambertMaterial({color:c,map:T,transparent:true});if(this.hi&&this.texN(tk)){m.normalMap=this.texN(tk)}return this.fow(m)};
      const rm=mk(tk==='thatch'?(CURSED?'#77727f':'#e0c890'):h.roof),gm=mk('#ffffff');gm.map=this.tex(h.style==='cabin'?'logs':h.style==='stone'?'bricks':'plaster');
      const pos=[],uv=[];const hw=Wd/2,hl=L/2;const P=(a,b,c)=>pos.push(a,b,c);
      // two slopes
      P(-hl,0,-hw);P(hl,rh,0);P(hl,0,-hw);P(-hl,0,-hw);P(-hl,rh,0);P(hl,rh,0);P(-hl,0,hw);P(hl,0,hw);P(hl,rh,0);P(-hl,0,hw);P(hl,rh,0);P(-hl,rh,0);
      const sl=Math.hypot(hw,rh)/90,U=L/90;uv.push(0,0,U,sl,U,0,0,0,0,sl,U,sl,0,0,U,0,U,sl,0,0,U,sl,0,sl);
      const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));rg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));rg.computeVertexNormals();
      const roof=new THREE.Mesh(rg,rm);roof.castShadow=true;roof.userData.ownMat=1;
      const gp=[-hl+18,0,-hw+16,-hl+18,0,hw-16,-hl+18,rh-12,0,hl-18,0,hw-16,hl-18,0,-hw+16,hl-18,rh-12,0];const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(gp,3));gg.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,Wd/150,0,Wd/300,rh/70,0,0,Wd/150,0,Wd/300,rh/70],2));gg.computeVertexNormals();
      const gab=new THREE.Mesh(gg,gm);gab.material.side=THREE.DoubleSide;gab.userData.ownMat=1;
      const inner=new THREE.Group();inner.add(roof,gab);if(!along)inner.rotation.y=Math.PI/2;inner.position.y=82;if(h.style==='witch')inner.rotation.z=(h.seed%2?1:-1)*.06;g.add(inner);
      const cm=mk('#9a8a7a');cm.map=this.tex('bricks');const ch=new THREE.Mesh(this.boxUV(20,60,20,40),cm);ch.position.set((along?h.w*.22:0)*((h.seed%2)?1:-1),82+rh*.55,(along?0:h.h*.22));ch.castShadow=true;ch.userData.ownMat=1;g.add(ch);
      g.position.set(h.x+h.w/2,0,h.y+h.h/2);S.add(g);return{g,mats:[rm,gm,cm],h,smoke:{x:g.position.x+ch.position.x,y:82+rh*.55+32,z:g.position.z+ch.position.z}}});
    // wells & fountain plazas
    const mfp=k=>CURSED&&this.mfProp&&this.mfProp(k);
    for(const w of WD.wells){if(mfp('village-well'))break;const g=new THREE.Group();g.position.set(w.x,0,w.y);
      this.mesh(this.cylg(w.r,w.r+3,26,18),this.tstd('bricks','#c8c0b0',.9,0),0,13,0,1,1,1,g,true);this.mesh(G.disc,this.std('#244a6a',.15,0),0,22,0,w.r*.8,1,w.r*.8,g);
      for(const s of[-1,1])this.mesh(G.box,this.tstd('bark','#6a4a32',.9,0),s*w.r*.85,48,0,5,48,5,g,true);const rf=this.mesh(G.cone4,this.tstd('tiles','#a04a32',.8,0),0,82,0,w.r*1.35,28,w.r*1.35,g,true);rf.rotation.y=Math.PI/4;
      this.mesh(G.cyl,this.tstd('planks','#9a7050',.8,0),0,40,0,6,10,6,g,true);this.scene.add(g)}
    this.fountains=WD.fountains.map(f=>{if(mfp('plaza-fountain'))return{x:f.x,y:f.y};const g=new THREE.Group();g.position.set(f.x,0,f.y);const st=this.tstd('bricks','#d8d0c0',.85,0);
      this.mesh(this.cylg(f.r,f.r+4,22,28),st,0,11,0,1,1,1,g,true);this.mesh(G.disc,this.std('#3a7ab0',.08,.1,{transparent:true,opacity:.85}),0,19,0,f.r*.86,1,f.r*.86,g);
      this.mesh(this.cylg(9,13,60,12),st,0,40,0,1,1,1,g,true);this.mesh(this.cylg(28,10,10,20),st,0,70,0,1,1,1,g,true);this.mesh(G.disc,this.std('#3a7ab0',.08,.1),0,75.5,0,24,1,24,g);this.mesh(G.sph,st,0,84,0,7,9,7,g,true);
      this.scene.add(g);return{x:f.x,y:f.y}});
    for(const s of WD.stalls){if(mfp('market-stall'))break;const g=new THREE.Group();g.position.set(s.x,0,s.y);g.rotation.y=-s.a;const wood=this.tstd('bark','#6a4a32',.9,0);
      for(const q of[[-30,-18],[30,-18],[-30,18],[30,18]])this.mesh(G.box,wood,q[0],32,q[1],4,64,4,g,true);this.mesh(this.boxUV(68,10,40,60),this.tstd('planks','#b08860',.8,0),0,30,0,1,1,1,g,true);
      const aw=this.mesh(G.box,this.std(s.c,.8,0),0,66,0,74,4,48,g,true);aw.rotation.x=.18;for(let k=0;k<4;k++)this.mesh(G.sph,this.std(['#e04a3a','#f0c040','#7ac84a','#e88a3a'][k],.6,0),-22+k*14,38,-6+(k%2)*10,6,6,6,g,true);this.scene.add(g)}
    // banners on poles around the plaza
    const bt=this.tex('banner');this.banners=WD.banners.map(b=>{const g=new THREE.Group();g.position.set(b.x,0,b.y);this.mesh(G.cyl,this.tstd('bark','#5a3a24',.9,0),0,70,0,3,140,3,g,true);
      const cl=this.mesh(G.cape,this.fow(new THREE.MeshLambertMaterial({map:bt,color:b.c,side:THREE.DoubleSide})),0,132,4,30,64,1,g,true);cl.userData.ownMat=1;this.scene.add(g);return{g,cl}});
    // fairy shrines: standing stones around a floating crystal
    this.shrines=WD.shrines.map(s=>{const g=new THREE.Group();g.position.set(s.x,this.gY(s.x,s.y),s.y);const stone=this.tstd('rock','#c8c4bc',.9,0);
      this.mesh(this.cylg(80,86,6,32),this.tstd('cobble','#d0ccc4',.9,0),0,3,0,1,1,1,g,true);
      for(let k=0;k<5;k++){const a=k/5*Math.PI*2;const m=this.mesh(G.rock[k%4],stone,Math.cos(a)*66,32,Math.sin(a)*66,13,38,10,g,true);m.rotation.y=-a;this.mesh(G.box,this.glowM(s.dire?'#c8a0ff':'#8cffc0',.8),Math.cos(a)*58,40,Math.sin(a)*58,1.5,22,4,g).rotation.y=-a}
      const orb=new THREE.Group();orb.position.y=56;g.add(orb);this.mesh(G.oct,this.std(s.dire?'#c8a8ff':'#a8ffd0',.1,.2,{emissive:s.dire?'#8a5ae8':'#4ad890',emissiveIntensity:1.3}),0,0,0,12,20,12,orb);
      this.mesh(G.ring,this.glowM('#8cffb0',.22),0,4,0,s.r,1,s.r,g);this.scene.add(g);this.glows.push([s.x,60,s.y,s.dire?'#c8a8ff':'#a8ffc8',300]);return{g,orb,s}});
    // caves: rocky lids over the chambers fade when you walk in
    const lid=this.tstd('rock','#bab4a8',.95,0,{transparent:true},'lid');
    // caves: a lid of uncarved mountain (same terrain material) hides each chamber until you walk in
    this.domes=WD.caves.map(c=>{const R=c.R+70,St=22,n=Math.ceil(R*2/St)+1,x0=c.x-R,y0=c.y-R;const pos=[],col=[],idx=[],map=new Int32Array(n*n).fill(-1);const C=this.col;
      for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=x0+i*St,y=y0+j*St;const d=Math.hypot(x-c.x,y-c.y);if(d>R)continue;map[j*n+i]=pos.length/3;const h=terrH(x,y,true)+2;pos.push(x,h,y);
        C.set('#c0c8a0');if(h<40)C.set('#e8f0c8');col.push(C.r,C.g,C.b)}
      for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const a=map[j*n+i],b=map[j*n+i+1],cc=map[(j+1)*n+i],dd=map[(j+1)*n+i+1];if(a<0||b<0||cc<0||dd<0)continue;idx.push(a,cc,dd,a,dd,b)}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
      const dm=new THREE.Mesh(g,this.terrain.material);dm.castShadow=true;dm.receiveShadow=true;this.scene.add(dm);
      for(let k=0;k<4;k++)this.glows.push([c.x+Math.cos(k*1.6)*c.R*.5,30,c.y+Math.sin(k*1.6)*c.R*.5,k%2?'#7ff3ff':'#ff8ae0',220]);
      return{c,dm,mt:[]}});
    // lanterns / torches
    const la=WD.lanterns;const iron=this.std('#2a2624',.5,.7);const mfL=CURSED&&this.mfProp&&this.mfProp('street-lantern'),laP=mfL?la.filter(l=>l.torch||l.small):la;
    this.instC(G.cyl,iron,laP,(l,add)=>{const tall=l.torch?34:l.small?40:56,y=this.gY(l.x,l.y);add(l.x,y+tall/2,l.y,l.torch?5:2.4,tall,l.torch?5:2.4,0,0,0,null)},true);
    this.lampMat=this.std('#fff0c0',.3,0,{emissive:'#ffb040',emissiveIntensity:1.2});
    this.instC(G.box,this.lampMat,laP.filter(l=>!l.torch),(l,add)=>{const tall=l.small?40:56,y=this.gY(l.x,l.y);add(l.x,y+tall+6,l.y,9,12,9,0,.6,0,null)},false);
    for(const l of la){const tall=l.torch?34:l.small?40:56;this.glows.push([l.x,this.gY(l.x,l.y)+tall+8,l.y,l.torch?'#ff8a2a':l.dire?'#c08aff':'#ffbf66',l.torch?330:250])}
    this.torches=la.filter(l=>l.torch).map(l=>({x:l.x,y:this.gY(l.x,l.y)+40,z:l.y}));
    for(const m of WD.mush)this.glows.push([m.x,m.s*1.8,m.y,m.c,m.s*13]);for(const c of WD.crystals)this.glows.push([c.x,c.s*1.6,c.y,c.c,c.s*13]);
    for(const t of WD.trees)if(t.v===3)this.glows.push([t.x,t.cr*.6+40*t.h,t.y,'#7ff3ff',t.cr*3]);if(MOON)REG.glows(this)},
  buildCastle(){const C=WD.castle,G=this.G,S=this.scene;if(!C||C.x<-1e4)return;const st=this.tstd('bricks','#d8d2c4',.9,0,{},'cut'),stD=this.tstd('bricks','#a8a294',.92,0);
    this.castleParts=[];const add=(m,x,y)=>{m.castShadow=true;m.receiveShadow=true;S.add(m);this.castleParts.push({m,x,y})};
    const cren=[];
    const stG=this.tstd('bricks','#6a6672',.95,0);
    for(const q of WD.walls){if(!q.castle)continue;const keep=q.castle===2,dgw=q.castle===3;const hgt=keep?220:dgw?170:150;const g=this.tg(this.boxUV(q.w,hgt,q.h,160),q.x+q.w/2,hgt/2,q.y+q.h/2);const m=new THREE.Mesh(g,keep?stD:dgw?stG:st);m.userData.ownMat=0;add(m,q.x+q.w/2,q.y+q.h/2);
      if(!keep&&!dgw){const along=q.w>q.h,L=along?q.w:q.h,n=Math.floor(L/40);for(let i=0;i<n;i++){if(i%2)continue;const t=(i+.5)/n;cren.push(along?[q.x+q.w*t,q.y+q.h/2]:[q.x+q.w/2,q.y+q.h*t])}}}
    this.instC(G.box,st,cren.map(c=>({x:c[0],y:c[1]})),(c,add2)=>add2(c.x,162,c.y,26,24,26,0,0,0,null),true);
    const roofM=this.tstd('tiles','#3a5a9a',.7,.1);const flagM=this.fow(new THREE.MeshLambertMaterial({color:'#c8322e',side:THREE.DoubleSide}));
    this.flags=[];
    for(const t of[...C.towers,...C.gtowers]){const g=new THREE.Group();g.position.set(t.x,0,t.y);this.mesh(this.cylg(t.r,t.r+6,t.h,20),st,0,t.h/2,0,1,1,1,g,true);
      this.mesh(this.cylg(t.r+10,t.r+6,20,20),st,0,t.h+6,0,1,1,1,g,true);const rf=this.mesh(this.cylg(0,t.r+16,t.r*2.1,20),roofM,0,t.h+16+t.r*1.05,0,1,1,1,g,true);
      for(let k=0;k<4;k++){const a=k*Math.PI/2+.4;this.mesh(G.box,this.bas('#1a1410'),Math.cos(a)*(t.r+5.5),t.h*.62,Math.sin(a)*(t.r+5.5),10,26,10,g).rotation.y=-a}
      this.mesh(G.cyl,this.std('#3a3430',.5,.6),0,t.h+20+t.r*2.1+30,0,1.5,60,1.5,g);const fl=this.mesh(G.cape,flagM,14,t.h+20+t.r*2.1+58,0,28,18,1,g);fl.rotation.z=Math.PI/2;fl.userData.ph=t.x*.01;this.flags.push(fl);
      S.add(g);this.castleParts.push({m:g,x:t.x,y:t.y,grp:1})}
    // gatehouse arch + portcullis, keep roof
    {const gt=C.gate,gn=C.gn,vert=gn.x!==0;const g=this.tg(this.boxUV(vert?40:220,50,vert?220:40,100),gt.x,175,gt.y);const m=new THREE.Mesh(g,st);m.userData.ownMat=0;add(m,gt.x,gt.y);
      const pc=new THREE.Mesh(this.tg(new THREE.BoxGeometry(vert?6:170,40,vert?170:6),gt.x+gn.x*14,150,gt.y+gn.y*14),this.std('#2a2624',.5,.7));pc.castShadow=true;S.add(pc)}
    {const K=C.keep;const g=new THREE.Group();g.position.set(K.x+K.w/2,0,K.y+K.h/2);const along=K.w>=K.h;const rf=this.mesh(G.cone4,roofM,0,220+70,0,(Math.max(K.w,K.h)+30)/1.41,140,(Math.min(K.w,K.h)+30)/1.41,g,true);rf.rotation.y=Math.PI/4+(along?0:Math.PI/2);rf.scale.set(along?(K.w+40)/1.41:(K.h+40)/1.41,140,along?(K.h+40)/1.41:(K.w+40)/1.41);
      for(const s of[-1,1]){const tx=along?s*K.w/2:0,tz=along?0:s*K.h/2;this.mesh(this.cylg(34,38,300,16),st,tx,150,tz,1,1,1,g,true);this.mesh(this.cylg(0,46,110,16),roofM,tx,355,tz,1,1,1,g,true)}
      S.add(g);this.castleParts.push({m:g,x:K.x+K.w/2,y:K.y+K.h/2,grp:1})}
    // hanging banners on the inner walls + dragon hoard glitter
    const bt=this.tex('banner');for(const t of C.towers){const g=new THREE.Group();const dx=C.cx-t.x,dy=C.cy-t.y,l=Math.hypot(dx,dy);g.position.set(t.x+dx/l*(t.r+4),0,t.y+dy/l*(t.r+4));g.rotation.y=Math.atan2(dx,dy);
      this.mesh(G.quad,this.fow(new THREE.MeshLambertMaterial({map:bt,color:'#a8282a',side:THREE.DoubleSide})),0,170,0,44,96,1,g);S.add(g)}
    const hoard=[];const K=C.keep;const hx=lerp(K.x+K.w/2,C.lair.x,.35),hy=lerp(K.y+K.h/2,C.lair.y,.35);for(let i=0;i<70;i++){const a=i*2.4,r=Math.sqrt(i)*13;hoard.push({x:hx+Math.cos(a)*r,y:hy+Math.sin(a)*r})}
    this.instC(G.cyl6,this.std('#ffcc44',.25,1),hoard,(p,a2)=>a2(p.x,2+Math.random()*6,p.y,7,2,7,Math.random(),0,Math.random(),null),false);this.glows.push([hx,20,hy,'#ffcc44',260])},
  buildProps(){const S=this.scene,G=this.G;
    // graveyards: where the dead rise at night
    {this.graveFx=[];const gs=WD.graves||[],stone=this.tstd('rock','#8e8c86',.95,0),moss=this.tstd('rock','#6a7a5a',.95,0),dirt=this.tstd('dirt','#4a3a2a',.95,0);const st=[];for(const g of gs)for(const t of g.st)st.push(t);
      const at=(t,dx,dz)=>{const c=Math.cos(t.a),s2=Math.sin(t.a);return[t.x+dx*c-dz*s2,t.y+dx*s2+dz*c]};
      this.instC(G.box,stone,st.filter(t=>t.t===0),(t,add)=>{const y=this.gY(t.x,t.y);add(t.x,y+15,t.y,22,30,7,0,-t.a,0,null)},true);
      this.instC(this.cylg(11,11,7,14),stone,st.filter(t=>t.t===0),(t,add)=>{const y=this.gY(t.x,t.y);add(t.x,y+30,t.y,1,1,1,Math.PI/2,-t.a,0,null)},true);
      this.instC(G.box,moss,st.filter(t=>t.t===1),(t,add)=>{const y=this.gY(t.x,t.y);add(t.x,y+22,t.y,6,44,6,0,-t.a,0,null);add(t.x,y+32,t.y,24,6,6,0,-t.a,0,null)},true);
      this.instC(G.box,stone,st.filter(t=>t.t===2),(t,add)=>{const y=this.gY(t.x,t.y);add(t.x,y+8,t.y,28,16,10,.12,-t.a,.08,null)},true);
      this.instC(G.box,dirt,st,(t,add)=>{const p=at(t,0,24);add(p[0],this.gY(p[0],p[1])+1.5,p[1],24,4,40,0,-t.a,0,null)},false);
      const bark=this.tstd('bark','#3a2e26',.95,0);
      for(const g of gs){const y=this.gY(g.x,g.y);const tr=new THREE.Group();tr.position.set(g.x+60,y,g.y-40);S.add(tr);this.mesh(this.cylg(4,9,90),bark,0,45,0,1,1,1,tr,true);
        for(let k=0;k<5;k++){const b=this.mesh(this.cylg(1.2,3,46),bark,0,62+k*7,0,1,1,1,tr,true);b.rotation.z=(k%2?1:-1)*(.7+k*.1);b.rotation.y=k*1.3;b.position.x=Math.sin(k*1.3)*8}
        this.glows.push([g.x,y+40,g.y,'#7dff8a',360]);this.graveFx=(this.graveFx||[]).concat([g])}}
    // bridges: stone arches; docks: wooden planks
    this.bridges=WD.bridges.map(b=>{if(!b.dock&&CURSED&&this.mfProp&&this.mfProp('stone-bridge'))return null;const g=new THREE.Group();g.position.set(b.x,0,b.y);g.rotation.y=Math.atan2(-b.ay,b.ax);
      if(b.dock){const pl=this.tstd('planks','#a88660',.85,0);this.mesh(this.boxUV(b.len,6,b.wid,80),pl,0,3,0,1,1,1,g,true);for(let x=-b.len/2+20;x<b.len/2;x+=60)for(const z of[-b.wid/2+4,b.wid/2-4])this.mesh(G.cyl,this.tstd('bark','#6a4a32',.9,0),x,-6,z,4,28,4,g,true);S.add(g);return g}
      const st=this.tstd('bricks','#d0c8b8',.88,0);const n=16,pos=[];const hy=(t)=>7+(b.big?30:24)*(1-t*t);
      const deck=new THREE.BoxGeometry(b.len,10,b.wid,n,1,1);const p=deck.attributes.position;for(let i=0;i<p.count;i++){const t=p.getX(i)/(b.len/2);p.setY(i,p.getY(i)+hy(t)-5)}deck.computeVertexNormals();
      const uv=deck.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*b.len/120,uv.getY(i)*b.wid/120);this.mesh(deck,this.tstd('cobble','#cfc8bc',.9,0),0,0,0,1,1,1,g,true).userData.ownMat=0;
      for(const z of[-b.wid/2+5,b.wid/2-5]){const w=new THREE.BoxGeometry(b.len,22,10,n,1,1);const q=w.attributes.position;for(let i=0;i<q.count;i++){const t=q.getX(i)/(b.len/2);q.setY(i,q.getY(i)+hy(t)+11)}w.computeVertexNormals();
        const u2=w.attributes.uv;for(let i=0;i<u2.count;i++)u2.setXY(i,u2.getX(i)*b.len/150,u2.getY(i)*.3);this.mesh(w,st,0,0,z,1,1,1,g,true)}
      const AR=b.len*.34;const arch=new THREE.Mesh(new THREE.TorusGeometry(AR,14,8,20,Math.PI),st);arch.scale.set(1,.55,b.wid/28);arch.position.y=hy(0)-12-AR*.55;arch.castShadow=true;g.add(arch);
      for(const s of[-1,1])this.mesh(this.cylg(16,20,40,10),st,s*(b.len/2-6),20,0,1,1,1,g,true);
      S.add(g);return g});
    // windmills
    this.mills=WD.windmills.map(m=>{const g=new THREE.Group();g.position.set(m.x,this.gY(m.x,m.y),m.y);this.mesh(this.cylg(36,50,190,16),this.tstd('plaster','#f0e8d8',.9,0),0,95,0,1,1,1,g,true);
      this.mesh(this.cylg(0,48,60,16),this.tstd('thatch','#d8c090',.9,0),0,220,0,1,1,1,g,true);this.mesh(G.box,this.tstd('planks','#8a6a4a',.8,0),0,22,49,26,44,4,g,true);
      const hub=new THREE.Group();hub.position.set(0,185,52);g.add(hub);this.mesh(G.cyl,this.std('#4a3a2a',.6,.2),0,0,0,8,16,8,hub).rotation.x=Math.PI/2;const wood=this.tstd('bark','#7a5a3a',.9,0),sail=this.fow(new THREE.MeshLambertMaterial({color:'#f4ecd8',side:THREE.DoubleSide}));
      for(let k=0;k<4;k++){const arm=new THREE.Group();arm.rotation.z=k*Math.PI/2;hub.add(arm);this.mesh(G.box,wood,0,78,6,6,160,4,arm,true);this.mesh(G.quad,sail,14,92,8,24,120,1,arm,true)}
      g.rotation.y=m.a;S.add(g);return{g,hub,sp:.8+(m.a%.4)}});
    // farm extras: hay bales, log piles, fences, barrels & crates
    this.instC(G.cyl,this.tstd('thatch','#e8d090',.95,0),WD.hay,(h,add)=>add(h.x,this.gY(h.x,h.y)+18,h.y,22,30,22,Math.PI/2,h.a,0,null),true);
    this.instC(G.cyl,this.tstd('bark','#9a7a5a',.9,0),WD.logs,(l,add)=>{const y=this.gY(l.x,l.y);for(let k=0;k<5;k++){const r=k<3?0:1;add(l.x+Math.cos(l.a+Math.PI/2)*((k%3)-1)*15+(r?Math.cos(l.a+Math.PI/2)*7.5:0),y+8+r*14,l.y+Math.sin(l.a+Math.PI/2)*((k%3)-1)*15+(r?Math.sin(l.a+Math.PI/2)*7.5:0),8,64,8,Math.PI/2,-l.a,0,null)}},true);
    const fence=[];for(const f of WD.fences){const L=Math.hypot(f[2]-f[0],f[3]-f[1]),n=Math.max(1,Math.round(L/50));for(let i=0;i<=n;i++){const t=i/n;fence.push({x:lerp(f[0],f[2],t),y:lerp(f[1],f[3],t),post:1})}for(let i=0;i<n;i++){const t=(i+.5)/n;fence.push({x:lerp(f[0],f[2],t),y:lerp(f[1],f[3],t),a:Math.atan2(f[3]-f[1],f[2]-f[0]),len:L/n})}}
    const fw=this.tstd('bark','#8a6a4a',.9,0);this.instC(G.box,fw,fence,(f,add)=>{const y=this.gY(f.x,f.y);if(f.post)add(f.x,y+16,f.y,5,32,5,0,0,0,null);else{add(f.x,y+24,f.y,f.len,3,3,0,-f.a,0,null);add(f.x,y+12,f.y,f.len,3,3,0,-f.a,0,null)}},true);
    const pr=WD.props;const barrels=pr.filter(p=>p.t==='barrel'),crates=pr.filter(p=>p.t==='crate');
    this.instC(this.lathe('barrel',[[0,0],[11,0],[13.5,8],[14.5,15],[13.5,22],[11,30],[0,30]],14),this.tstd('planks','#8a6a48',.85,0),barrels,(p,add)=>add(p.x,this.gY(p.x,p.y),p.y,1,1,1,0,p.x,0,null),true);
    this.instC(this.boxUV(26,26,26,26),this.tstd('planks','#b08a5a',.85,0),crates,(p,add)=>add(p.x,this.gY(p.x,p.y)+13,p.y,1,1,1,0,p.x,0,null),true);
    this.buildBoxes()},
  // house chests: body / trim / lock are static instances, lids are one InstancedMesh animated open
  buildBoxes(){const B=WD.boxes||[];this.boxLid=null;if(!B.length)return;const n=B.length,M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(1,1,1),P=new THREE.Vector3(),Y=new THREE.Vector3(0,1,0);
    const wood=this.tstd('planks','#9a6234',.8,0),iron=this.std('#3a3a40',.5,.6),gold=this.std('#e8b840',.35,.7);
    const geo=(w,h,d,x,y,z)=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);return g};
    const body=geo(36,20,24,0,10,0),trim=this.merge([geo(37,3,25,0,1.5,0),geo(37,3,25,0,18.5,0),geo(3,20,25,-12,10,0),geo(3,20,25,12,10,0)]),lock=geo(6,7,2,0,15,12.6);
    const mk=(g,m,cast)=>{const im=new THREE.InstancedMesh(g,m,n);im.frustumCulled=false;im.castShadow=cast;im.receiveShadow=true;this.scene.add(im);return im};
    const ib=mk(body,wood,true),it=mk(trim,iron,true),il=mk(lock,gold,false);
    this.boxLid=mk(this.merge([geo(36,7,24,0,3.5,12),geo(37,2.5,25,-12,4,12),geo(37,2.5,25,12,4,12)]),wood,true);this.boxBase=[];
    B.forEach((b,i)=>{const y=this.gY(b.x,b.y);Q.setFromAxisAngle(Y,Math.PI/2-b.a);P.set(b.x,y,b.y);M.compose(P,Q,S);ib.setMatrixAt(i,M);it.setMatrixAt(i,M);il.setMatrixAt(i,M);this.boxBase.push({P:P.clone(),Q:Q.clone(),k:0,set:-1})});
    for(const im of[ib,it,il])im.instanceMatrix.needsUpdate=true;this.stepBoxes(0,true)},
  stepBoxes(dt,force){if(!this.boxLid)return;const L=this.boxLid,M=new THREE.Matrix4(),H=new THREE.Matrix4(),R=new THREE.Matrix4();let ch=false;
    this.boxBase.forEach((s,i)=>{const b=boxes[i];const want=b&&b.open?1:0;s.k=force?want:s.k+(want-s.k)*Math.min(1,dt*7);if(!force&&Math.abs(s.k-s.set)<.002)return;s.set=s.k;
      M.compose(s.P,s.Q,new THREE.Vector3(1,1,1));H.makeTranslation(0,20,-12);R.makeRotationX(-1.9*s.k);M.multiply(H).multiply(R);L.setMatrixAt(i,M);ch=true});
    if(ch)L.instanceMatrix.needsUpdate=true},
};
function G_cyl(r){return r.G.cyl}
function sr2(s,a,b){const x=Math.sin(s*12.9898)*43758.5453;return a+(x-Math.floor(x))*(b-a)}
