/* Moonfall Phase 2. Deterministic scenery and collider data on both host/client.
 * No combat, inventory, enemy, weapon, or network rules are replaced. */
window.installMoonfallEnvironment = function (P) {
  'use strict';
  if(P.moonfallEnvironmentInstalled)return;
  P.moonfallEnvironmentInstalled=true;
  const T=THREE, originalWorld=genWorld, build=P.buildWorld, draw=P.draw, ground=P.gY, castle=P.buildCastle;
  const VERSION=3;
  function rectangle(x,y,r,q){return Math.hypot(x-clamp(x,q.x,q.x+q.w),y-clamp(y,q.y,q.y+q.h))<r;}
  function layout(w){
    const C=w.castle;
    if(!C?.loc||C.x<-1e4)return;
    const props=[], ramps=[], platforms=[], colliders=[];
    const point=(a,b)=>C.loc(a,b);
    const O=point(0,0),X=point(1,0),Z=point(0,1);
    const axis={x:X.x-O.x,y:X.y-O.y},depth={x:Z.x-O.x,y:Z.y-O.y};
    const yaw=Math.atan2(-axis.y,axis.x);
    let stairZone=null;
    for(const sign of [1,-1])for(const fraction of [.46,.36,.6,.25]){
      if(stairZone)break;
      const a=sign*C.LH*.66,b=C.DP*fraction;
      if([point(a,b),point(a,b+150)].every(p=>!w.walls.some(q=>rectangle(p.x,p.y,95,q))&&
        !w.solids.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<q.r+90)))stairZone={a,b};
    }
    const reserved=(a,b,r)=>stairZone&&Math.abs(a-stairZone.a)<108+r&&b>stairZone.b-108-r&&b<stairZone.b+258+r;

    const local=(x,y)=>({a:(x-O.x)*axis.x+(y-O.y)*axis.y,b:(x-O.x)*depth.x+(y-O.y)*depth.y});
    const add=(asset,a,b,width,height,length,extra={})=>{
      const p=point(a,b),q={asset,x:p.x,y:p.y,localA:a,localB:b,width,height,length,yaw,base:0,...extra};props.push(q);return q;
    };
    const circle=(x,y,r)=>{const q={x,y,r,t:'moonfall',moonfall:true};w.solids.push(q);colliders.push(q);};
    const spot=(a,b,r)=>{
      const candidates=[[0,0],[60,0],[-60,0],[0,70],[0,-70],[90,70],[-90,70]];
      for(const db of [-160,160,-240,240,-320,320])for(const da of [0,-60,60,-120,120])candidates.push([da,db]);
      for(const [da,db] of candidates){
        const la=a+da,lb=b+db;
        if(reserved(la,lb,r))continue;
        const p=point(la,lb);
        if(p.x<C.x+70||p.x>C.x+C.w-70||p.y<C.y+70||p.y>C.y+C.h-70)continue;
        if(w.walls.some(q=>rectangle(p.x,p.y,r+16,q)))continue;
        if(w.solids.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<r+q.r+18))continue;
        if([...(w.spawns||[]),...(w.items||[]),...(w.mobs||[])].some(q=>Math.hypot(p.x-q.x,p.y-q.y)<r+38))continue;
        return {a:a+da,b:b+db};
      }
      return null;
    };
    // Original gate/tower collision envelopes remain authoritative at the entrance.
    const gate=add('temple-gate',0,20,600,280,40,{collision:'existing-gate-towers'});
    for(let i=0;i<C.towers.length;i++){
      const t=C.towers[i];props.push({asset:'wall-corner',x:t.x,y:t.y,width:100,height:140,length:100,yaw:i*Math.PI/2,base:0,collision:'existing-tower'});
    }
    for(const s of [-1,1]){
      const g=spot(s*C.LH*.66,C.DP*.24,36);
      if(g){const p=add('guardian-statue',g.a,g.b,58,136,58,{collision:'circle'});circle(p.x,p.y,42);}
      for(const f of [.32,.76]){
        const q=spot(s*C.LH*.88,C.DP*f,24);
        if(q){const p=add('brazier',q.a,q.b,38,32,38,{collision:'circle'});circle(p.x,p.y,27);}
      }
    }
    for(const [a,b] of [[-C.LH*.78,C.DP*.16],[C.LH*.78,C.DP*.85],[-C.LH*.78,C.DP*.78],[C.LH*.82,C.DP*.54]]){
      const q=spot(a,b,30);if(q){const p=add('rubble',q.a,q.b,58,25,58,{collision:'circle'});circle(p.x,p.y,42);}
    }
    // Match the four ruin columns or the two portal sides, leaving the walking opening clear.
    const arch=(asset,a,b,width,height,length)=>{
      for(const db of [0,-90,90,-160,160,240,320,480,640])for(const da of [0,15,-15,30,-30,60,-60]){
        const center=point(a+da,b+db);
        if(w.walls.some(q=>rectangle(center.x,center.y,30,q))||w.solids.some(q=>Math.hypot(center.x-q.x,center.y-q.y)<q.r+30))continue;
        if(reserved(a+da-width*.4,b+db,32)||reserved(a+da+width*.4,b+db,32))continue;
        const offsets=asset==='ruin-arch'?[-.45,-.25,.2,.45]:[-.4,.4];
        const posts=offsets.map(v=>point(a+da+width*v,b+db));
        const left=posts[0],right=posts[posts.length-1];
        if(posts.some(p=>p.x<C.x+35||p.x>C.x+C.w-35||p.y<C.y+35||p.y>C.y+C.h-35||
          w.walls.some(q=>rectangle(p.x,p.y,35,q))||w.solids.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<q.r+38)||
          [...(w.items||[]),...(w.mobs||[])].some(q=>Math.hypot(p.x-q.x,p.y-q.y)<58)))continue;
        const p=add(asset,a+da,b+db,width,height,length,{collision:'posts',openingWidth:asset==='ruin-arch'?width*.45-24:width*.8-64});
        if(asset==='ruin-arch'){
          for(let i=0;i<posts.length;i++){const center=posts[i],ww=i===0||i===3?36:24,dd=length;
            const q={x:center.x-(Math.abs(axis.x)*ww+Math.abs(depth.x)*dd)/2,y:center.y-(Math.abs(axis.y)*ww+Math.abs(depth.y)*dd)/2,
              w:Math.abs(axis.x)*ww+Math.abs(depth.x)*dd,h:Math.abs(axis.y)*ww+Math.abs(depth.y)*dd,moonfall:true};w.walls.push(q);colliders.push(q);}
        }else{circle(left.x,left.y,32);circle(right.x,right.y,32);}return p;
      }
    };
    arch('ruin-arch',0,C.DP*.7,300,220,55);
    const portal=arch('portal-frame',0,C.DP*.15,230,300,55);
    if(portal){portal.shader=true;portal.base=-105;}
    // Stairs rise to a small landing in a wing, with physical rails along sides.
    const a=stairZone?.a||C.LH*.66,b=stairZone?.b||C.DP*.46,width=130,length=150,rise=42;
    const stair=point(a,b),landing=point(a,b+length);
    const footprint=[stair,landing];
    if(footprint.every(p=>!w.walls.some(q=>rectangle(p.x,p.y,95,q))&&!w.solids.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<q.r+90))){
      add('moon-stairs',a,b,width,rise,length,{collision:'walkable-ramp'});
      ramps.push({a,b,width,length,rise});platforms.push({a,b:b+length,width,length,rise});
      add('modular-floor',a,b+length,width,4,length,{base:rise-4,collision:'walkable-landing'});
      for(const s of [-1,1]){
        const q0=point(a+s*(width/2+8),b-length/2),q1=point(a+s*(width/2+8),b+length*1.5);
        const q={x:Math.min(q0.x,q1.x)-4,y:Math.min(q0.y,q1.y)-4,w:Math.abs(q0.x-q1.x)+8,h:Math.abs(q0.y-q1.y)+8,moonfall:true,rail:true};
        w.walls.push(q);colliders.push(q);
      }
    }
    const core={x:C.lair.x,y:C.lair.y,diameter:Math.min(360,C.LH*.72-80),height:24};
    w.moonfall={version:VERSION,props,ramps,platforms,colliders,axis,depth,origin:O,gate,local,core};
  }
  genWorld=function(seed){const w=originalWorld(seed);layout(w);return w;};
  function surface(key,x,z){
    const grid=window.MOONFALL_COLLISION_DATA?.surfaces[key];if(!grid||Math.abs(x)>.5||Math.abs(z)>.5)return null;
    const u=(x+.5)*(grid.size-1),v=(z+.5)*(grid.size-1),i=Math.min(grid.size-2,Math.floor(u)),j=Math.min(grid.size-2,Math.floor(v));
    const sample=(a,b)=>grid.values[b*grid.size+a]/10000;
    return lerp(lerp(sample(i,j),sample(i+1,j),u-i),lerp(sample(i,j+1),sample(i+1,j+1),u-i),v-j);
  }
  P.buildCastle=function(){this._moonfallBaseFloor=true;try{return castle.call(this);}finally{this._moonfallBaseFloor=false;}};
  P.gY=function(x,y){
    const base=ground.call(this,x,y),l=WD?.moonfall;
    if(!l||this._moonfallBaseFloor)return base;
    const p=l.local(x,y);let baseHeight=base;
    if(l.core){const c=l.core,h=surface('moon-arena',(x-c.x)/c.diameter,(y-c.y)/c.diameter);if(h!==null)baseHeight=Math.max(baseHeight,h*c.height);}
    if(l.gate){const g=l.gate,x=(p.a-g.localA)/g.width,z=-(p.b-g.localB)/g.length;
      if(Math.abs(x)<.14){const h=surface('temple-gate-floor',x,z);if(h!==null)baseHeight=Math.max(baseHeight,h*g.height);}}
    for(const r of l.ramps)if(Math.abs(p.a-r.a)<=r.width/2&&Math.abs(p.b-r.b)<=r.length/2){
      const h=surface('moon-stairs',(p.a-r.a)/r.width,-(p.b-r.b)/r.length);
      return Math.max(baseHeight,h===null?(p.b-r.b+r.length/2)/r.length*r.rise:h*r.rise);}
    for(const r of l.platforms)if(Math.abs(p.a-r.a)<=r.width/2&&Math.abs(p.b-r.b)<=r.length/2)return Math.max(baseHeight,r.rise);
    return baseHeight;
  };
  function effect(kind){
    return new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
      uniforms:{uTime:{value:0},uVisible:{value:1},uKind:{value:kind==='portal'?0:1}},
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;vec4 p=vec4(position,1.0);
#ifdef USE_INSTANCING
p=instanceMatrix*p;
#endif
 gl_Position=projectionMatrix*modelViewMatrix*p;}`,
      fragmentShader:`uniform float uTime,uVisible,uKind;varying vec2 vUv;
float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec2 p=vUv*2.-1.;float a;vec3 c;
if(uKind<.5){float r=length(p),angle=atan(p.y,p.x);float wave=.5+.5*sin(angle*6.+r*18.-uTime*2.);
a=(1.-smoothstep(.82,1.,r))*(.16+wave*.3)+exp(-abs(r-.85)*70.)*.7;c=mix(vec3(.12,.18,.55),vec3(.45,.85,1.8),wave);}
else{float h=vUv.y;float shift=sin(h*12.-uTime*5.)*.1;float taper=(1.-h)*.68;float d=abs(p.x+shift)/(taper+.01);
a=(1.-smoothstep(.3,1.,d))*smoothstep(0.,.12,h)*(1.-smoothstep(.65,1.,h));a*=.75+.25*sin(uTime*9.+h*20.);c=mix(vec3(1.8,.8,.15),vec3(.8,.14,.02),h);}
gl_FragColor=vec4(c,a*uVisible);}`});
  }
  P.buildMoonfallEnvironment=function(){
    const l=WD.moonfall;if(!l)return;
    const root=new T.Group();root.name='Moonfall Phase 2';this.scene.add(root);this.moonfallEnvironment=root;
    const fallback=this.std('#465069',.7,.2),box=this.geoC.get('moon-bottom-box')||this.G.box;
    const assets=[...new Set(l.props.map(p=>p.asset))];
    for(const key of assets){
      const list=l.props.filter(p=>p.asset===key).map(p=>[p.x,p.base+(key==='portal-frame'?this.gY(p.x,p.y):0),p.y,p.width,p.height,p.length,0,p.yaw,0]);
      // Hollow arches must retain a clear opening even while an asset is missing.
      if(key==='moon-stairs'&&!this.celestialAsset(key)){
        for(const p of l.props.filter(q=>q.asset===key)){const g=new T.Group();g.position.set(p.x,p.base,p.y);g.rotation.y=p.yaw;root.add(g);
          for(let i=0;i<6;i++)this.mesh(box,fallback,0,0,p.length/2-(i+.5)*p.length/6,p.width,p.height*(i+1)/6,p.length/6,g,true);}
      }else if(['temple-gate','ruin-arch','portal-frame'].includes(key)&&!this.celestialAsset(key)){
        for(const p of l.props.filter(q=>q.asset===key)){
          const g=new T.Group();g.position.set(p.x,p.base,p.y);g.rotation.y=p.yaw;root.add(g);
          this.mesh(box,fallback,-p.width*.4,0,0,p.width*.13,p.height,p.length,g,true);
          this.mesh(box,fallback,p.width*.4,0,0,p.width*.13,p.height,p.length,g,true);
          this.mesh(box,fallback,0,p.height-24,0,p.width,24,p.length,g,true);
        }
      }else this.celestialBatch(root,key,list,box,fallback);
    }
    this.celestialBatch(root,'moonfall-railing',l.colliders.filter(q=>q.w&&q.rail).map(q=>[q.x+q.w/2,0,q.y+q.h/2,q.w,70,q.h,0,0,0]),box,this.std('#81745b',.55,.45));
    this.moonfallEffects=[];
    for(const p of l.props){
      if(p.asset==='portal-frame'){
        const mat=effect('portal'),m=new T.Mesh(this.G.quad,mat);m.name='moonfall-portal-energy';
        m.position.set(p.x,80+this.gY(p.x,p.y),p.y);m.rotation.y=p.yaw;m.scale.set(150,160,1);root.add(m);
        this.moonfallEffects.push({mesh:m,mat,x:p.x,y:p.y,kind:'portal'});
      }
      if(p.asset==='brazier'){
        const mat=effect('flame'),g=new T.Group();g.position.set(p.x,p.height-5,p.y);root.add(g);
        for(const yaw of [0,Math.PI/2]){const flame=new T.Mesh(this.G.quad,mat);flame.position.y=34;flame.rotation.y=yaw;flame.scale.set(36,75,1);g.add(flame);}
        this.moonfallEffects.push({mesh:g,mat,x:p.x,y:p.y,kind:'flame'});
      }
    }
    this.moonfallPhase2Counts=Object.fromEntries(assets.map(k=>[k,l.props.filter(p=>p.asset===k).length]));
  };
  P.buildWorld=function(){build.call(this);this.buildMoonfallEnvironment();};
  P.draw=function(){
    const L=state==='play'?(listener()||ME()):null;
    for(const e of this.moonfallEffects||[]){e.mat.uniforms.uTime.value=this.t;
      const visible=!L||Math.hypot(e.x-L.x,e.y-L.y)<visionR();e.mesh.visible=visible;e.mat.uniforms.uVisible.value=visible?1:0;}
    return draw.call(this);
  };
  P.moonfallLayoutVersion=VERSION;
};
