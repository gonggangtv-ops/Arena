/* Arena Royale · the Snow Queen's fort (Claude, 2026-11-22 · index only). Render only.
 * World gen (a.js WD.fort) raises a plateau one step up out of the Frozen Sanctuary, east of the Old Town, with one wide stairway
 * from the valley; the queen (snow-queen.js, drawn by eclipse-fx.js) holds the court in front of her castle. Drawn here:
 *  - the castle: the owner's Blender castle ('snow-castle', fitted to world gen's footprint FORT_CW x FORT_CD, gate toward the valley)
 *    as soon as it is in the manifest; until then an ice palace built from simple solids (pale stone walls and merlons, four round
 *    towers and two keep towers under ice-crystal roofs, a gatehouse with a glowing door, the keep and its crystal spire). The regions
 *    module settles snow on its upward faces like every other prop in the Sanctuary;
 *  - the stairway: 28 stone steps up the ramp between two balustrades;
 *  - the court: the moon circle iced over, frozen braziers burning blue, ice-tinted guardians at the stair head and the gate;
 *  - ice crystal clusters (faceted, glossy, a cold inner glow);
 *  - Eternal Winter (the queen's ultimate, aoe 'qwinter'): the air fills with driven snow toward her, frost closes in at the edges of
 *    the screen while it charges, then the court bursts white. Its two warm circles are eclipse-fx's 'usafe'.
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
  function remat(R,m,mode){return R.cached('fort-'+mode+'-'+m.uuid,()=>{const c=m.clone();if(mode==='ice'){if(c.color)c.color.multiply(new T.Color('#cfe6ff'));if('emissive' in c){c.emissive=new T.Color('#16324e');c.emissiveIntensity=.6}}
      return R.fow(c,mode==='cut'?{key:'fortmcut',cut:true}:{key:'forttint'})})}
  function place(R,key,list,fit,mode){if(!list.length||!loaded(key))return 0;const s=A().get(key).inspection.size,parts=R.celestialAsset(key);if(!parts)return 0;
    for(const p of parts){const mat=mode?(Array.isArray(p.mat)?p.mat.map(m=>remat(R,m,mode)):remat(R,p.mat,mode)):p.mat;
      R.instC(p.geo,mat,list,(q,add)=>{const f=fit(q,s);add(q.x,(q.y0!==undefined?q.y0:R.gY(q.x,q.y))+(q.dy||0),q.y,f[0],f[1],f[2],0,q.a,0,null)},true,null,2600)}
    return list.length}
  P.buildFort=function(){const F=WD&&WD.fort;if(!F)return;const R=this,face=Math.atan2(-F.ox,-F.oy),P2=(u,v)=>cityXY(F,u,v);
    // the castle: the owner's model when it is in, the ice palace until then
    const C=F.castle,cy=this.gY(C.x,C.y);
    if(loaded('snow-castle')){place(this,'snow-castle',[Object.assign({},C,{dy:-20})],(q,s)=>{const k=Math.min(FORT_CW/s[0],FORT_CD/s[2]);return[s[0]*k,s[1]*k,s[2]*k]},'cut');this.fortModel='snow-castle'}   // its foundation sinks 20 into the ground
    else{const pal=palace(this,FORT_CW,FORT_CD);for(const [g,m,sh] of[[pal.stone,stoneM(this),true],[pal.ice,iceM(this),true],[pal.glow,glowM(this),false]]){
        const me=new T.Mesh(g,m);me.position.set(C.x,cy-4,C.y);me.rotation.y=face;me.castShadow=!!this.hi&&sh;me.receiveShadow=true;this.scene.add(me)}this.fortModel='palace'}
    // the stairway: stone steps up the ramp, balustrades either side
    {const N=28,v0=FORT_SB,v1=FORT_OF+10,dv=(v1-v0)/N,st=this.inst(this.G.box,stoneM(this),N,true);
      for(let i=0;i<N;i++){const vm=v0+(i+.5)*dv,q=P2(0,vm),top=FORT_P*(i+1)/N+1;this.setI(st,i,q.x,top-20,q.y,2*FORT_SH-30,40,dv+.6,0,face,0)}st.instanceMatrix.needsUpdate=true;st.computeBoundingSphere();
      const len=Math.hypot(v1-v0,FORT_P),pitch=Math.atan2(FORT_P,v1-v0);
      for(const s of[-1,1]){const q=P2(s*(FORT_SH-4),(v0+v1)/2),me=new T.Mesh(this.G.box,stoneM(this));me.position.set(q.x,FORT_P/2+22,q.y);me.quaternion.setFromEuler(new T.Euler(pitch,face,0,'YXZ'));
        me.scale.set(40,56,len+20);me.castShadow=!!this.hi;me.receiveShadow=true;this.scene.add(me);
        for(const [v,h] of[[v0-6,70],[v1+8,90]]){const p=P2(s*(FORT_SH-4),v),y=FORT_P*clamp((v-v0)/(v1-v0),0,1);this.mesh(this.G.box,stoneM(this),p.x,y+h/2,p.y,54,h,54,this.scene,!!this.hi).rotation.y=face}}}
    // the court: the moon circle iced over; guardians; braziers burning blue
    {const q=P2(0,FORT_VA);place(this,'moon-arena',[Object.assign(q,{a:face,dy:-4})],(qq,s)=>{const k=820/Math.max(s[0],s[2]);return[s[0]*k,13,s[2]*k]},'ice')}
    const by=new Map();for(const q of F.props){if(q.k==='snow-castle')continue;if(!by.has(q.k))by.set(q.k,[]);by.get(q.k).push(q)}
    for(const [k,list] of by)place(this,k,list,(q,s)=>{const f=q.h?q.h/s[1]:1;return[s[0]*f,s[1]*f,s[2]*f]},list[0].ice?'ice':null);
    if(F.braziers.length){if(loaded('brazier'))place(this,'brazier',F.braziers.map(b=>Object.assign({},b,{a:face})),(q,s)=>{const f=90/s[1];return[s[0]*f,90,s[2]*f]},'ice');
      else this.instC(this.G.cylT,stoneM(this),F.braziers,(b,add)=>add(b.x,this.gY(b.x,b.y)+30,b.y,30,60,30,0,0,0,null),true);
      for(const b of F.braziers)this.glows.push([b.x,this.gY(b.x,b.y)+104,b.y,'#8fe6ff',230])}
    // ice crystal clusters: n faceted crystals leaning out of a common root
    {const geo=crystalGeo(),list=[];for(const c of F.crystals){const n=c.n,h0=hash(c.x,c.y);for(let i=0;i<n;i++){const hh=hash(c.x+i*7.1,c.y-i*3.3),a=c.a+i/n*Math.PI*2+hh,d=i?c.r*(.25+.45*hh):0;
        list.push({x:c.x+Math.cos(a)*d,y:c.y+Math.sin(a)*d,h:c.h*(i?.45+.5*hash(c.y+i,c.x):1),r:c.r*(i?.16+.12*hh:.24),tx:i?Math.cos(a)*(.25+.35*h0):0,tz:i?Math.sin(a)*(.25+.35*h0):0,ry:hh*6.28})}}
      const pal=this.fortModel==='palace'&&F.castle;if(pal){const C2=F.castle;for(const [u,v,h] of[[-FORT_CW/2-40,FORT_VC-FORT_CD/2-50,170],[FORT_CW/2+40,FORT_VC-FORT_CD/2-50,190],[-FORT_CW/2-30,FORT_VC+FORT_CD/2+30,150],[FORT_CW/2+30,FORT_VC+FORT_CD/2+30,160]]){const q=P2(u,v);
        for(let i=0;i<4;i++){const a=i*1.7+u*.01;list.push({x:q.x+Math.cos(a)*(i?34:0),y:q.y+Math.sin(a)*(i?34:0),h:h*(i?.55:1),r:i?18:28,tx:i?Math.cos(a)*.4:0,tz:i?Math.sin(a)*.4:0,ry:a})}}}
      this.instC(geo,iceM(this),list,(c,add)=>add(c.x,this.gY(c.x,c.y)-8,c.y,c.r,c.h,c.r,c.tz,c.ry,-c.tx,null),!!this.hi,null,2600)}};
  // built with the rest of the props
  const _bp=P.buildProps;P.buildProps=function(){const r=_bp.apply(this,arguments);try{this.buildFort()}catch(e){warn('build',e)}return r};
  // ---- per frame: the castle's name, the braziers' blue flames, Eternal Winter ----
  let frost=null;const frostDom=()=>{if(frost||typeof document==='undefined')return frost;frost=document.createElement('div');
    frost.style.cssText='position:fixed;inset:0;z-index:6;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,#ffffff00 38%,#d8f0ffcc 80%,#ffffffee 100%);mix-blend-mode:screen';
    document.body.appendChild(frost);return frost};
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r=_fx.apply(this,arguments);try{const F=WD&&WD.fort;if(!F||!L||typeof state==='undefined'||state!=='play')return r;
      const inF=fortIn(L.x,L.y,-120)&&fortBase(L.x,L.y)>FORT_P-1;if(inF&&!this._inFort&&typeof gameT!=='undefined'&&gameT>3)announce={txt:'❄️ '+F.name+' — ราชินีหิมะรอผู้กล้าอยู่บนลานบัลลังก์น้ำแข็ง',t:3.4};this._inFort=inF;
      const near=Math.hypot(L.x-F.x,L.y-F.y)<4200;
      if(near&&dt>0){for(const b of F.braziers){if(Math.random()>dt*9)continue;const y=this.gY(b.x,b.y)+92;this.sp(true,{x:b.x+(Math.random()-.5)*16,y,z:b.y+(Math.random()-.5)*16,vy:60+Math.random()*60,l:.7,s:22,s1:4,c:'#bff2ff',c2:'#3a8ad8',sp:1})}}
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
