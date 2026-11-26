// Falling Meteor, shared by the fire staff and the Meteor special. All coordinates,
// ages and radii come from the authoritative AOE. The terrain stamp touches only
// Three.js vertex buffers. WD, navigation and the collision heightfield stay independent.
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined')return;
  const T=THREE, TAU=Math.PI*2, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const zones=[
    {rock:'#69554a',dust:'#8b7961',rim:'#ad9271',depth:.19,cooling:.52,drag:2.2,eject:1,shard:1.28}, // compact loam and sandstone
    {rock:'#483e36',dust:'#615848',rim:'#826750',depth:.23,cooling:.79,drag:3.4,eject:.75,shard:1.2}, // sod and dark humus
    {rock:'#788d9b',dust:'#c5d4de',rim:'#abd5e3',depth:.24,cooling:1.26,drag:1.6,eject:1.17,shard:1.53}, // fractured ice and powder
    {rock:'#473732',dust:'#65534b',rim:'#927565',depth:.15,cooling:.34,drag:1.3,eject:.88,shard:1.14}, // basalt and ash
    {rock:'#393544',dust:'#685d74',rim:'#80758a',depth:.13,cooling:.62,drag:2.5,eject:1.16,shard:1.72}, // obsidian
    {rock:'#48646e',dust:'#e2e1d6',rim:'#98b8bc',depth:0,cooling:1.8,drag:1.5,eject:1,shard:1},  // water and steam
    {rock:'#594739',dust:'#90735b',rim:'#af916c',depth:0,cooling:.77,drag:2.7,eject:.79,shard:2.1}  // deck
  ];
  // Difference of nearest distances to jittered mineral seeds. Warp the coordinates
  // before sampling so the plate boundaries bend and bifurcate at different scales.
  function faultTexture(size){
    const cells=8,sites=new Float32Array(cells*cells*2),rand=mulberry32(0x109a37);
    for(let i=0;i<sites.length;i++)sites[i]=.12+.76*rand();
    const data=new Uint8Array(size*size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const px=(x+.5)*cells/size,py=(y+.5)*cells/size,ix=Math.floor(px),iy=Math.floor(py);
      let first=9,second=9;
      for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
        const cx=ix+i,cy=iy+j,k=2*((cx+cells)%cells+cells*((cy+cells)%cells));
        const dx=cx+sites[k]-px,dy=cy+sites[k+1]-py,d=dx*dx+dy*dy;
        if(d<first){second=first;first=d}else if(d<second)second=d;
      }
      data[y*size+x]=Math.min(255,Math.round(255*(Math.sqrt(second)-Math.sqrt(first))));
    }
    const tex=new T.DataTexture(data,size,size,T.RedFormat,T.UnsignedByteType);
    tex.name='Meteor fault distances';tex.wrapS=tex.wrapT=T.RepeatWrapping;
    tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;
    return tex;
  }
  const faultGLSL='uniform sampler2D faultMap;float fault(vec2 q){return texture2D(faultMap,q*.125).r;}';
  const groundVertex=`
    varying vec2 vQ; varying vec3 vW;
    void main(){vQ=uv*2.-1.;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;
      gl_Position=projectionMatrix*viewMatrix*w;}`;
  const groundFragment=`
    uniform sampler2D vxN;uniform float age,progress,seed,wet,cooling;
    uniform vec4 deckFrame;uniform vec2 deckSize;uniform vec3 rock,rim;varying vec2 vQ;varying vec3 vW;
    ${faultGLSL}
    void main(){
      vec2 p=vQ*1.06;float d=length(p);
      if(d>1.035)discard;
      vec2 uv=p+vec2(seed,seed*.73);
      float coarse=texture2D(vxN,uv*.67).r;
      if(age<0.){
        float edge=1.-smoothstep(.009,.023,abs(d-1.));
        float penumbra=(1.-smoothstep(.08,.79,d))*(.11+progress*.26);
        float leading=1.-smoothstep(.019,.07,abs(d-(.2+.77*progress)));
        float signal=edge*(.73+.22*coarse)+leading*.15;
        gl_FragColor=vec4(mix(vec3(.033,.018,.013),vec3(1.,.39,.105),signal),max(penumbra,signal));
      }else if(wet>.5){
        float crest=.5+.5*cos(35.*d-age*12.+coarse*3.);
        float front=1.-smoothstep(.025,.16,abs(d-min(.98,age*1.35)));
        float alpha=(crest*.28+front*.38)*(1.-smoothstep(.55,1.,d))*(1.-smoothstep(.25,2.1,age));
        gl_FragColor=vec4(mix(rock,rim,crest),alpha);
      }else{
        if(deckSize.x>0.){
          vec2 fromDeck=vW.xz-deckFrame.xy,axis=deckFrame.zw;
          if(abs(dot(fromDeck,axis))>deckSize.x||abs(dot(fromDeck,vec2(-axis.y,axis.x)))>deckSize.y)discard;
        }
        vec2 warp=vec2(coarse,texture2D(vxN,uv*.83+.39).r)-.5;
        vec2 field=uv*3.1+warp*.47;
        float cell=fault(field);
        float chips=texture2D(vxN,field*3.7+warp*.24).g;
        float grain=texture2D(vxN,uv*8.1).a;
        float outline=d+(coarse-.5)*.16;
        float scorch=1.-smoothstep(.73,1.,outline);
        float lip=1.-smoothstep(.035,.19,abs(outline-.63));
        float wall=1.-smoothstep(.04,.22,abs(outline-.49));
        float seam=1.-smoothstep(.024,.135,cell);
        float hair=(1.-smoothstep(.01,.07,chips))*.27;
        float plates=smoothstep(.03,.19,cell);
        vec3 normal=normalize(cross(dFdx(vW),dFdy(vW)));
        float lit=.47+.53*max(dot(normal,normalize(vec3(-.48,.78,.43))),0.);
        vec3 stone=mix(rock*.27,rim*.32,lip*plates);
        stone*=lit*(.61+.5*coarse+.28*grain)*(.66+.34*plates);
        float heat=exp(-cooling*age)*(1.-smoothstep(.7,.93,outline));
        float veins=(seam+.45*hair)*(.42+2.15*wall+.50*lip)*(.71+.49*coarse);
        float pulse=.85+.15*texture2D(vxN,field*1.5+age*.065).r;
        vec3 glow=vec3(1.7,.23,.018)*veins + vec3(.62,.38,.065)*pow(seam,4.)*wall;
        stone+=heat*pulse*(glow+vec3(.58,.092,.011)*wall*(.55+.7*coarse)*(1.-plates*.52));
        float alpha=scorch*(1.-smoothstep(4.6,7.,age));
        gl_FragColor=vec4(stone,alpha);
      }
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  // A continuously attached, advected ablation wake. Its cross section rolls
  // towards the camera, while the trailing end curls into colder turbulent gas.
  function wakeMaterial(){
    return new T.ShaderMaterial({
      uniforms:{...ArenaVFXTex.uniforms(),aft:{value:new T.Vector3()},size:{value:1},phase:{value:0}},
      transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,
      vertexShader:`
        uniform vec3 aft;uniform float size,phase,vxT;varying vec2 vWake;
        void main(){
          vWake=uv;float t=uv.y;
          vec3 head=modelMatrix[3].xyz,axis=normalize(aft),side=normalize(cross(axis,normalize(cameraPosition-head)));
          vec3 centre=head+axis*(.18+7.2*t)*size;
          centre+=side*size*(sin(phase+9.*t-vxT*3.)*.31+sin(t*15.+phase)*.13)*t;
          centre.x+=size*.46*t*t;
          float width=size*(.55+.65*sin(2.7*t)+.42*t);
          gl_Position=projectionMatrix*viewMatrix*vec4(centre+side*(uv.x*2.-1.)*width,1.);
        }`,
      fragmentShader:`
        uniform sampler2D vxN;uniform float vxT,phase;varying vec2 vWake;
        void main(){
          float t=vWake.y,x=2.*vWake.x-1.;
          vec2 q=vec2(x*.39+phase,t*.87-vxT*1.23);
          float roll=texture2D(vxN,q).r,eddy=texture2D(vxN,q*2.7+roll*.31).a;
          float ridge=texture2D(vxN,q*1.9+vec2(eddy*.3,0.)).b;
          float side=abs(x+(roll-.5)*.68*t);
          float plume=(1.-smoothstep(.18,1.,side))*(.53+.59*roll);
          float fire=smoothstep(.2,.72,plume+ridge*.4-t*.91);
          float strand=pow(max(0.,1.-abs(side-.43+(eddy-.5)*.46)*3.8),2.);
          vec3 gas=mix(vec3(.047,.04,.038),vec3(.19,.15,.13),roll);
          vec3 flame=mix(vec3(.85,.09,.009),vec3(1.85,.71,.16),strand*(1.-t)+eddy*.24);
          float alpha=smoothstep(.08,.56,plume+(eddy-.5)*.65)*smoothstep(.0,.13,t+.045)*(1.-smoothstep(.61,1.,t));
          if(alpha<.012)discard;
          gl_FragColor=vec4(mix(gas,flame,fire),alpha*.92);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
  }
  function basalt(detail){
    const geo=new T.IcosahedronGeometry(1,detail),p=geo.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const ridges=Math.sin(x*6.1+y*4.2)*Math.cos(z*5.3-y*2.1);
      const dent=Math.max(0,x*.75-y*.4+z*.5-.72);
      const r=.92+.17*Math.sin(3.4*y-1.7*x)*Math.cos(3*z)+.105*ridges-.86*dent;
      p.setXYZ(i,x*r*1.12+.14*y,y*r*.84,z*r+.09*x);
    }
    geo.computeVertexNormals();return geo;
  }
  function rockMaterial(faultMap){
    const m=new T.MeshStandardMaterial({color:0xffffff,roughness:.92,metalness:.09});
    m.onBeforeCompile=sh=>{
      Object.assign(sh.uniforms,ArenaVFXTex.uniforms(),{faultMap:{value:faultMap}});
      sh.vertexShader='varying vec3 vOre;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOre=position;');
      sh.fragmentShader='uniform sampler2D vxN;uniform float vxT;varying vec3 vOre;\n'+faultGLSL+'\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec3 coord=vOre*1.06;vec3 w=pow(abs(normalize(vOre)),vec3(5.));w/=dot(w,vec3(1.));
        vec4 ore=texture2D(vxN,coord.xy+.24)*w.z+texture2D(vxN,coord.yz+.48)*w.x+texture2D(vxN,coord.zx+.64)*w.y;
        vec2 uvFault=vec2(coord.x+.45*coord.y,coord.z-.71*coord.y)*2.95+vec2(ore.r,ore.a)*.61;
        float seam=1.-smoothstep(.034,.16,fault(uvFault));
        float spark=.65+.35*sin(vxT*4.7+ore.r*12.);
        diffuseColor.rgb*=vec3(.16,.128,.108)*(.40+.96*ore.r+.47*ore.b);
      `).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        totalEmissiveRadiance+=vec3(2.,.37,.025)*seam*(.7+.7*ore.a)*spark+vec3(.8,.48,.09)*pow(seam,4.)+vec3(.31,.045,.004)*max(0.,-vOre.y)*ore.b;`);
    };
    return m;
  }
  // A stamp reads the exact row-major terrain triangles, including their adaptive diagonals.
  function terrainBed(R){
    const g=R.terrain.geometry,p=g.attributes.position,idx=g.index.array,n=Math.round(Math.sqrt(p.count));
    const origin=p.getX(0),spacing=p.getX(1)-origin,original=new Map();
    const bounds=R.terrain.userData.terrainRowBounds,expanded=new Map();
    const cell=v=>clamp(Math.floor((v-origin)/spacing),0,n-2);
    function sample(x,z){
      const i=cell(x),j=cell(z),a=j*n+i,u=clamp((x-origin)/spacing-i,0,1),v=clamp((z-origin)/spacing-j,0,1);
      const h=p.getY(a),b=p.getY(a+1),c=p.getY(a+n),d=p.getY(a+n+1);
      if(idx[(j*(n-1)+i)*6+2]===a+n+1)
        return u>v?h+(b-h)*u+(d-b)*v:h+(d-c)*u+(c-h)*v;
      return u+v<1?h+(b-h)*u+(c-h)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
    }
    function register(s){
      for(let j=cell(s.z-s.r);j<=cell(s.z+s.r)+1;j++)for(let i=cell(s.x-s.r);i<=cell(s.x+s.r)+1;i++){
        const k=j*n+i,dx=(p.getX(k)-s.x)/s.r,dz=(p.getZ(k)-s.z)/s.r,theta=Math.atan2(dz,dx);
        const d=Math.hypot(dx,dz)*(1+.063*Math.sin(theta*5+s.seed)+.047*Math.sin(theta*3-s.seed));
        if(d>=.88)continue;
        const bowl=Math.max(0,1-Math.pow(d/.59,2)),ridge=Math.max(0,1-Math.abs(d-.64)/.22);
        s.vertices.set(k,s.r*(-s.surface.depth*bowl+.091*ridge*ridge));
        if(!original.has(k))original.set(k,p.getY(k));
      }
    }
    function apply(slots){
      // Stamps can overlap. Reconstruct each modified height from its saved base.
      for(const [box,base] of expanded){box.min.y=base[0];box.max.y=base[1]}
      expanded.clear();
      const rows=new Map();
      for(const [k,h] of original){
        let depression=0,lift=0,used=false;
        for(const s of slots){const dy=s.vertices.get(k);if(dy!==undefined){used=true;depression=Math.min(depression,dy*s.strength);lift=Math.max(lift,dy*s.strength)}}
        const y=Math.fround(h+depression+lift),row=Math.floor(k/n);
        if(y!==p.getY(k)){
          p.setY(k,y);const span=rows.get(row);
          if(span){span[0]=Math.min(span[0],k);span[1]=Math.max(span[1],k)}else rows.set(row,[k,k]);
        }
        for(let i=Math.max(0,Math.floor((row-1)/bounds.size));i<=Math.min(bounds.strips.length-1,Math.floor(row/bounds.size));i++){
          const box=bounds.strips[i];
          if(y>=box.min.y&&y<=box.max.y)continue;
          if(!expanded.has(box))expanded.set(box,[box.min.y,box.max.y]);
          box.min.y=Math.min(box.min.y,y);box.max.y=Math.max(box.max.y,y);
        }
        if(!used)original.delete(k);
      }
      for(const [lo,hi] of rows.values())p.addUpdateRange(lo*3,(hi-lo+1)*3);
      if(rows.size)p.needsUpdate=true;
    }
    return {sample,register,apply};
  }
  // Six points span the torn inner face, the crest and the outer shoulder of each slab.
  // Neighbouring slabs share an irregular fracture line, with a gap exposing the hot substrate.
  const slabFaces=[0,1,2,1,3,2,2,3,4,3,5,4];
  for(const [a,b] of [[0,1],[1,3],[3,5],[5,4],[4,2],[2,0]])slabFaces.push(a,a+6,b,b,a+6,b+6);
  function crustMesh(count){
    const geo=new T.BufferGeometry(),n=count*slabFaces.length;
    geo.setAttribute('position',new T.BufferAttribute(new Float32Array(n*3),3).setUsage(T.DynamicDrawUsage));
    geo.setAttribute('aHot',new T.BufferAttribute(new Float32Array(n),1));
    const mat=new T.MeshStandardMaterial({roughness:.92,metalness:.07,color:'#434046'});
    const cooling={value:1};
    mat.onBeforeCompile=sh=>{
      Object.assign(sh.uniforms,ArenaVFXTex.uniforms(),{cooling});
      sh.vertexShader='attribute float aHot;varying float vHot;varying vec3 vSlab;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHot=aHot;vSlab=position;');
      sh.fragmentShader='uniform float cooling;uniform sampler2D vxN;varying float vHot;varying vec3 vSlab;\n'+sh.fragmentShader
        .replace('#include <color_fragment>',`#include <color_fragment>
          vec4 ore=texture2D(vxN,vSlab.xz*.009+vSlab.y*.002);
          float cleavage=texture2D(vxN,vSlab.xz*.020+vec2(ore.a,ore.b)*.15).g;
          diffuseColor.rgb*=(.28+.76*ore.r+.38*ore.a)*(.52+.52*smoothstep(.075,.38,cleavage))*(1.-.63*vHot);`)
        .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
          float mantle=vHot*vHot*cooling*(.46+.68*ore.r);
          totalEmissiveRadiance+=mantle*vec3(2.,.31,.023)+mantle*mantle*vec3(.5,.31,.049);`);
    };
    const mesh=new T.Mesh(geo,mat);mesh.receiveShadow=true;
    return {mesh,cooling,count,points:new Float32Array(count*12*3)};
  }
  function splitCrust(s){
    const {points,count,mesh}=s.crust,rand=s.rand,borders=[];
    for(let i=0;i<count;i++){
      const a=(i+rand()*.78)*TAU/count+s.seed;
      borders.push([a+(rand()-.5)*.17,a,a+(rand()-.5)*.22,.34+.18*rand(),.57+.13*rand(),.72+.22*rand()]);
    }
    for(let i=0;i<count;i++){
      const uplift=.032+.116*Math.pow(rand(),1.25),lean=(rand()-.5)*.043;
      for(let k=0;k<6;k++){
        const layer=k>>1,right=k%2,b=borders[(i+right)%count];
        const angle=b[layer]+(right?-1:1)*(.011+.022*rand()),d=b[layer+3]+(rand()-.5)*.044;
        const x=s.r*d*Math.cos(angle),z=s.r*d*Math.sin(angle);
        const lift=s.r*([uplift*.78,uplift,.014][layer]+lean*(right-.5));
        const top=(i*12+k)*3,bottom=top+18;
        points[top]=x;points[top+1]=lift;points[top+2]=z;
        points[bottom]=x*.99;points[bottom+1]=-s.r*.026;points[bottom+2]=z*.99;
      }
      for(let j=0;j<slabFaces.length;j++){
        const v=slabFaces[j],hot=v>=6?(v<=7?1:v<=9?.64:.21):v<=1?.3:.035;
        mesh.geometry.attributes.aHot.setX(i*slabFaces.length+j,hot);
      }
    }
    mesh.geometry.attributes.aHot.needsUpdate=true;
    mesh.material.color.set(s.surface.rock).multiplyScalar(s.ice?.82:.37);mesh.visible=true;
  }
  R3.createMeteorField=function(){
    const R=this,scene=R.scene,hi=R.hi&&!R.mobile,bed=terrainBed(R),slots=[],spill=[],cap=hi?5:3;
    const faults=faultTexture(hi?256:128);
    const headGeo=basalt(hi?4:2),chipGeo=basalt(1),headMat=rockMaterial(faults),wakeGeo=new T.PlaneGeometry(1,1,1,hi?14:8);

    const dummy=new T.Object3D(),tint=new T.Color();
    let dirty=false;
    function createSlot(){
      const head=new T.Mesh(headGeo,headMat);head.castShadow=hi;head.receiveShadow=true;
      const g=new T.PlaneGeometry(2,2,hi?28:17,hi?28:17);g.rotateX(-Math.PI/2);
      const u={...ArenaVFXTex.uniforms(),faultMap:{value:faults},age:{value:-1},progress:{value:0},seed:{value:0},
        wet:{value:0},cooling:{value:.52},deckFrame:{value:new T.Vector4()},deckSize:{value:new T.Vector2()},rock:{value:new T.Color()},rim:{value:new T.Color()}};
      const m=new T.ShaderMaterial({uniforms:u,vertexShader:groundVertex,fragmentShader:groundFragment,
        transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
      const ground=new T.Mesh(g,m);ground.renderOrder=2;
      const count=hi?27:13,chips=new T.InstancedMesh(chipGeo,new T.MeshStandardMaterial(),count);
      chips.instanceMatrix.setUsage(T.DynamicDrawUsage);chips.frustumCulled=false;chips.castShadow=hi;chips.receiveShadow=true;
      const wake=new T.Mesh(wakeGeo,wakeMaterial());wake.frustumCulled=false;wake.renderOrder=7;
      const crust=crustMesh(hi?21:13);crust.mesh.castShadow=hi;
      const group=new T.Group();group.name='Meteor impact';group.add(head,ground,chips,crust.mesh,wake);group.visible=false;scene.add(group);
      const s={group,head,ground,chips,crust,wake,u,bits:Array.from({length:count},()=>({})),vertices:new Map(),active:false};
      slots.push(s);return s;
    }
    function height(s,x,z){
      if(s.deck&&onBridge(x,z)===s.deck)return R.bridgeY(s.deck,x,z);
      if(s.wet||s.deck)return Math.max(s.waterY,bed.sample(x,z));
      return bed.sample(x,z);
    }
    function fitGround(s){
      const p=s.ground.geometry.attributes.position,uv=s.ground.geometry.attributes.uv;
      for(let i=0;i<p.count;i++){
        const dx=(uv.getX(i)*2-1)*s.r*1.06,dz=(1-uv.getY(i)*2)*s.r*1.06;
        p.setXYZ(i,dx,height(s,s.x+dx,s.z+dz)+2.4,dz);
      }
      p.needsUpdate=true;s.ground.position.set(s.x,0,s.z);s.ground.geometry.computeBoundingSphere();
      if(s.crust.mesh.visible){
        const {mesh,count,points}=s.crust,attr=mesh.geometry.attributes.position;
        mesh.position.set(s.x,0,s.z);
        for(let i=0;i<count;i++)for(let j=0;j<slabFaces.length;j++){
          const k=(i*12+slabFaces[j])*3,x=points[k],z=points[k+2];
          attr.setXYZ(i*slabFaces.length+j,x,height(s,s.x+x,s.z+z)+points[k+1]*s.strength-(1-s.strength)*5,z);
        }
        attr.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
      }
    }
    function release(s){
      if(s.vertices.size){s.vertices.clear();dirty=true}
      s.active=false;s.seen=false;s.group.visible=false;s.source=null;
    }
    function start(a){
      let s=slots.find(q=>!q.active);
      if(!s&&slots.length<cap)s=createSlot();
      if(!s){for(const q of slots)if(q.hit&&q.age>1&&(!s||q.age>s.age))s=q;if(!s)return null;release(s)}
      s.active=true;s.group.visible=true;s.ground.visible=true;s.head.visible=s.wake.visible=false;s.crust.mesh.visible=false;s.chips.count=0;
      s.x=a.x;s.z=a.y;s.r=a.r;s.source=a;s.birth=gameT-a.t;s.age=0;s.hit=false;s.trail=0;s.strength=0;
      s.rand=mulberry32((Math.imul(a.x|0,73856093)^Math.imul(a.y|0,19349663)^Math.round(s.birth*20))>>>0);
      s.seed=s.rand()*7;s.side=s.rand()<.5?-1:1;s.deck=onBridge(s.x,s.z);
      s.wet=!s.deck&&inWater(s.x,s.z);const zone=REG.at(s.x,s.z);
      s.ice=zone===2;s.surface=zones[s.deck?6:s.wet&&!s.ice?5:zone];
      s.waterY=WL;
      if(cityWater(s.x,s.z)){
        const C=WD.city,dx=s.x-C.x,dz=s.z-C.y;
        if(cityPondU(dx*C.lx+dz*C.ly,dx*C.ox+dz*C.oy)<0)s.waterY=CITY_PW;
      }
      const deck=s.deck;
      s.u.deckFrame.value.set(deck?.x||0,deck?.y||0,deck?.ax||0,deck?.ay||0);
      s.u.deckSize.value.set(deck?deck.len*.5:0,deck?deck.wid*.5:0);
      s.u.cooling.value=s.surface.cooling;
      const roughness=s.ice?.39:zone===4?.32:.89,metalness=zone===4?.22:.055;
      for(const mat of [s.crust.mesh.material,s.chips.material]){mat.roughness=roughness;mat.metalness=metalness}
      s.u.rock.value.set(s.surface.rock);s.u.rim.value.set(s.surface.rim);s.u.wet.value=+(s.wet&&!s.ice);
      s.u.seed.value=s.seed;s.u.age.value=-1;s.u.progress.value=0;
      fitGround(s);return s;
    }
    function puff(k,o){R.hxEmit?.(k,o)}
    function flight(s,a,dt){
      const k=clamp(a.t/a.delay,0,1),f=1-(.18*k+.82*k*k),size=s.r*.252;
      const x=s.x+s.side*s.r*1.32*f,z=s.z+s.r*.84*f;
      const bottom=height(s,s.x,s.z),y=bottom+size*.45+f*465;
      s.u.progress.value=k;s.head.visible=true;s.head.position.set(x,y,z);
      s.head.scale.setScalar(size);s.head.rotation.set(s.seed+k*1.39,k*2.28,s.seed*.6+k*.7);
      s.wake.visible=true;s.wake.position.copy(s.head.position);
      const u=s.wake.material.uniforms;
      u.aft.value.set(s.side*s.r*1.32,465,s.r*.84).normalize();u.size.value=size;u.phase.value=s.seed;
      s.trail-=dt;if(s.trail>0)return;s.trail=hi?.085:.14;
      const back=s.side*size*.42,h=y-R.gY(x,z);
      puff('smoke',{x:x+back*3.5,y:z+size*.83,h:h+size*3.4,r:size*.70,r1:size*1.63,
        c:'#4b423e',life:hi?1.2:.8,vx:s.side*31,vy:48,vz:28,drag:.8,gain:.46});
      R.pfxApi?.sparks({x:x+back,y:y+size*.7,z},hi?3:1,'#ffc380','#96331b',140,95,{life:.45,g:420,size:.72});
    }
    function impact(s){
      s.hit=true;s.age=0;s.head.visible=s.wake.visible=false;s.u.age.value=0;s.strength=1;
      if(!s.wet&&s.surface.depth)bed.register(s);
      if(s.surface.depth){splitCrust(s);dirty=true}
      const {x,z,r,rand}=s,y=height(s,x,z),steam=s.ice||s.wet;
      R.flash?.(x,y+50,z,'#ffa25a',2900,r*2.35,.28);
      R.shockwave?.(x,z,r*1.32,.045,.39);R.heat?.(x,z,r*.66,1.35,.0038);R.shakeNear?.(x,z,8);
      puff('flash',{x,y:z,h:30,r:r*.17,r1:r*.34,life:.13,c:'#ff773b',c2:'#ffe3ac',gain:.64});
      if(!s.wet)puff('fire',{x,y:z,h:25,r:r*.13,r1:r*.34,vy:65,life:.54,c:'#f76b2e',c2:'#ffbc74',gain:.67});
      for(let i=0;i<(hi?11:6);i++){
        const angle=TAU*(i+rand()*.65)/(hi?11:6),dx=Math.cos(angle),dz=Math.sin(angle),speed=r*(.82+rand()*.92);
        puff(steam?'smoke':'dust',{x:x+dx*r*.37,y:z+dz*r*.37,h:15,r:r*.09,r1:r*(.24+rand()*.12),
          c:s.surface.dust,life:.8+rand()*.65,vx:dx*speed,vz:dz*speed,vy:steam?80:36,drag:s.surface.drag,gain:.51,delay:rand()*.1});
      }
      for(let i=0;i<(hi?4:2);i++)puff('smoke',{x:x+(rand()-.5)*r*.5,y:z+(rand()-.5)*r*.4,h:32,
        r:r*.12,r1:r*.39,c:steam?'#c2cbd0':'#514944',life:1.6+rand(),vy:68+rand()*55,vx:22,drag:.55,delay:i*.12,gain:.58});
      R.pfxApi?.sparks({x,y:y+19,z},hi?38:18,'#ffcc7b','#b84820',r*2.15,r*1.95,{g:800,life:1.1,size:.95});
      s.chips.count=s.wet&&!s.ice?0:s.bits.length;
      for(let i=0;i<s.chips.count;i++){
        const b=s.bits[i],angle=TAU*(i+rand()*.74)/s.bits.length,dx=Math.cos(angle),dz=Math.sin(angle);
        const dist=r*(.16+rand()*.32),v=r*(.38+rand()*.81)*s.surface.eject;
        b.x=x+dx*dist;b.z=z+dz*dist;b.y=height(s,b.x,b.z)+7;
        b.vx=dx*v;b.vz=dz*v;b.vy=r*(.74+rand()*1.22);b.spin=(rand()-.5)*7;
        b.rot=rand()*TAU;b.tilt=rand()*2;b.size=r*(.018+.060*Math.pow(rand(),2));b.rest=false;
        s.chips.setColorAt(i,tint.set(i%3?s.surface.rock:s.surface.rim).multiplyScalar(.77+rand()*.62));
      }
      if(s.chips.instanceColor)s.chips.instanceColor.needsUpdate=true;
    }
    function fragments(s,dt){
      for(let i=0;i<s.chips.count;i++){
        const b=s.bits[i];
        if(!b.rest){
          b.x+=b.vx*dt;b.z+=b.vz*dt;b.vy-=760*dt;b.y+=b.vy*dt;b.rot+=b.spin*dt;b.tilt+=b.spin*.53*dt;
          const h=height(s,b.x,b.z)+b.size*.32;if(b.y<=h&&b.vy<0){b.y=h;b.vy*=-.22;b.vx*=.43;b.vz*=.43;b.spin*=.4;b.rest=b.vy<39}
        }else b.y=height(s,b.x,b.z)+b.size*.32;
        const size=b.size*clamp((6.4-s.age)/1.1,0,1);
        dummy.position.set(b.x,b.y,b.z);dummy.rotation.set(b.tilt,b.rot,.3+b.rot*.21);
        dummy.scale.set(size*s.surface.shard,size*(s.ice?.38:.63),size);dummy.updateMatrix();s.chips.setMatrixAt(i,dummy.matrix);
      }
      if(s.chips.count)s.chips.instanceMatrix.needsUpdate=true;
    }
    return {
      track(a,dt){
        const remote=net.mode==='client',birth=gameT-a.t;
        const same=q=>!q.seen&&(q.source===a||remote&&Math.abs(q.birth-birth)<.26&&
          Math.abs(q.x-a.x)<2&&Math.abs(q.z-a.y)<2&&q.r===a.r);
        let light=spill.find(same),s=slots.find(q=>q.active&&same(q));
        if(!s&&!light){
          if(a.t>a.delay+a.vis+.12)return true;
          s=start(a);
          if(!s){
            // Keep a telegraph for every concurrent cast even when all detailed slots are falling.
            light={x:a.x,z:a.y,r:a.r,birth,hit:false};spill.push(light);
            if(a.t<a.delay)R.avEmit('ring',{x:a.x,y:a.y,r:a.r,r1:a.r,height:4,c:'#e93316',c2:'#ffa65a',life:a.delay-a.t,width:.03,a:.8});
          }
        }
        if(light){
          light.seen=true;light.source=a;
          if(!light.hit&&a.t>=a.delay){light.hit=true;puff('dust',{x:a.x,y:a.y,r:a.r*.22,r1:a.r*.63,c:'#856957',h:15,vy:70,life:.9})}
          return true;
        }
        s.seen=true;s.source=a;
        if(!s.hit){if(a.t<a.delay)flight(s,a,dt);else impact(s)}
        return true;
      },
      step(dt){
        for(let i=spill.length-1;i>=0;i--){if(!spill[i].seen)spill.splice(i,1);else spill[i].seen=false}
        for(const s of slots)if(s.active){
          if(s.hit){
            s.age+=dt;s.u.age.value=s.age;s.crust.cooling.value=Math.exp(-s.surface.cooling*s.age);
            const strength=Math.ceil(clamp((7-s.age)/1.35,0,1)*14)/14;
            if(strength!==s.strength){s.strength=strength;dirty=true}
            if(s.age>=(s.wet&&!s.ice?2.2:7)){release(s);continue}
            fragments(s,dt);
          }else if(!s.seen){release(s);continue}
          s.seen=false;
        }
        if(dirty){bed.apply(slots);for(const s of slots)if(s.active)fitGround(s);dirty=false}
      },
      reset(){
        spill.length=0;
        for(const s of slots)release(s);
        bed.apply(slots);dirty=false;
      },
      dispose(){
        spill.length=0;
        for(const s of slots){release(s);scene.remove(s.group);s.ground.geometry.dispose();s.ground.material.dispose();s.crust.mesh.material.dispose();s.crust.mesh.geometry.dispose();s.wake.material.dispose();s.chips.material.dispose();s.chips.dispose()}
        bed.apply(slots);headGeo.dispose();chipGeo.dispose();wakeGeo.dispose();headMat.dispose();faults.dispose();
      }
    };
  };
})();
