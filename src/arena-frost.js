/* Frozen Sanctuary presentation. World generation owns the climb and the castle collision.
 * The Blender staircase fits the terrain ramp, and the open palace encloses the Snow Queen's throne hall.
 * Regional snow and the cutaway shader apply to the palace, including during Eternal Winter. */
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
  // ---- one geometry per material from many solids (local frame: x across, y up, z toward the valley); UVs from position ----
  function merged(parts){let n=0;const list=parts.map(([g,m])=>{const c=g.index?g.toNonIndexed():g.clone();c.applyMatrix4(m);n+=c.attributes.position.count;return c});
    const pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2);let o=0;
    for(const g of list){const p=g.attributes.position.array,q=g.attributes.normal.array;pos.set(p,o*3);nor.set(q,o*3);
      for(let i=0;i<g.attributes.position.count;i++){const x=p[i*3],y=p[i*3+1],z=p[i*3+2],nx=Math.abs(q[i*3]),ny=Math.abs(q[i*3+1]),nz=Math.abs(q[i*3+2]),k=(o+i)*2;
        if(ny>.6){uv[k]=x/220;uv[k+1]=z/220}else if(nx>nz){uv[k]=z/220;uv[k+1]=y/220}else{uv[k]=x/220;uv[k+1]=y/220}}
      o+=g.attributes.position.count;g.dispose()}
    const out=new T.BufferGeometry();out.setAttribute('position',new T.BufferAttribute(pos,3));out.setAttribute('normal',new T.BufferAttribute(nor,3));out.setAttribute('uv',new T.BufferAttribute(uv,2));out.computeBoundingSphere();return out}
  // Keep the passage and hall open even if the asset registry has no model.
  function palaceFallback(R,F,face){
    const m=stoneM(R),ice=iceM(R),at=(u,v)=>cityXY(F,u,FORT_VC+v);
    for(const [u,v,w,d,width,height] of FORT_WALLS){
      const p=at((u+w)/2,(v+d)/2),angle=face+Math.atan2(d-v,w-u);
      R.mesh(R.G.box,m,p.x,FORT_P+height/2,p.y,Math.hypot(w-u,d-v),height,width,R.scene,true).rotation.y=angle;
    }
    for(const [u,v,r,height] of FORT_PIERS){
      const p=at(u,v),h=height*.63;
      R.mesh(R.G.cyl,m,p.x,FORT_P+h/2,p.y,r,h,r,R.scene,true);
      R.mesh(R.G.cone6,ice,p.x,FORT_P+(h+height)/2,p.y,r*.9,height-h,r*.9,R.scene,true);
    }
  }
  // ---- crystal geometry: a hexagonal prism with a pointed tip, base at y = 0, 1 tall ----
  function crystalGeo(){const prism=new T.CylinderGeometry(1,1.08,.72,6,1).translate(0,.36,0),tip=new T.ConeGeometry(1,.28,6,1).translate(0,.86,0);
    const g=merged([[prism,new T.Matrix4()],[tip,new T.Matrix4()]]);prism.dispose();tip.dispose();return g}
  // ---- props: the palace, staircase, ice-tinted guardians and braziers ----
  // 'ice': tinted cold; 'cut': see-through when a hero walks behind it (the castle)
  function remat(R,m,mode){return R.cached('fort-'+mode+'-'+m.uuid,()=>{const c=m.clone();if(mode==='cut'&&R.hi&&c.isMeshStandardMaterial){c.envMap=R.envTex;c.envMapIntensity=.75}if(mode==='ice'){if(c.color)c.color.multiply(new T.Color('#cfe6ff'));if('emissive' in c){c.emissive=new T.Color('#16324e');c.emissiveIntensity=.6}}
      return R.fow(c,mode==='cut'?{key:'fortmcut',cut:true}:{key:'forttint'})})}
  function place(R,key,list,fit,mode){if(!list.length||!loaded(key))return 0;const s=A().get(key).inspection.size,parts=R.celestialAsset(key);if(!parts)return 0;
    for(const p of parts){const mat=mode?(Array.isArray(p.mat)?p.mat.map(m=>remat(R,m,mode)):remat(R,p.mat,mode)):p.mat;
      R.instC(p.geo,mat,list,(q,add)=>{const f=fit(q,s);add(q.x,(q.y0!==undefined?q.y0:R.gY(q.x,q.y))+(q.dy||0),q.y,f[0],f[1],f[2],0,q.a,0,null)},true,null,2600)}
    return list.length}
  P.buildFort=function(){const F=WD&&WD.fort;if(!F)return;const R=this,face=Math.atan2(-F.ox,-F.oy),P2=(u,v)=>cityXY(F,u,v);
    // The models are authored at 1 m = 100 game units, aligned along the same valley axis.
    const metres=(q,size)=>size.map(d=>d*100);
    const C=Object.assign({},F.castle,{y0:FORT_P-FORT_FLOOR});
    if(place(this,'snow-castle',[C],metres,'cut'))this.fortModel='snow-castle';
    else{palaceFallback(R,F,face);this.fortModel='palace'}
    const start=FORT_SB,end=FORT_OF+10,steps=Object.assign(P2(0,(start+end)/2),{a:face,y0:0});
    if(place(this,'snow-stairs',[steps],metres,'cut'))this.fortStairModel='snow-stairs';
    else{
      this.fortStairModel='ramp';
      const n=28,dv=(end-start)/n,st=R.inst(R.G.box,stoneM(R),n,true);
      for(let i=0;i<n;i++){
        const q=P2(0,start+(i+.5)*dv),top=FORT_P*(i+1)/n;
        R.setI(st,i,q.x,top-20,q.y,2*FORT_SH,40,dv+.6,0,face,0);
      }
      st.instanceMatrix.needsUpdate=true;st.computeBoundingSphere();
    }
    const by=new Map();for(const q of F.props){if(q.k==='snow-castle')continue;if(!by.has(q.k))by.set(q.k,[]);by.get(q.k).push(q)}
    for(const [k,list] of by)place(this,k,list,(q,s)=>{const f=q.h?q.h/s[1]:1;return[s[0]*f,s[1]*f,s[2]*f]},list[0].ice?'ice':null);
    if(F.braziers.length){if(loaded('brazier'))place(this,'brazier',F.braziers.map(b=>Object.assign({},b,{a:face})),(q,s)=>{const f=90/s[1];return[s[0]*f,90,s[2]*f]},'ice');
      else this.instC(this.G.cylT,stoneM(this),F.braziers,(b,add)=>add(b.x,this.gY(b.x,b.y)+30,b.y,30,60,30,0,0,0,null),true);
      for(const b of F.braziers)this.glows.push([b.x,this.gY(b.x,b.y)+104,b.y,'#8fe6ff',230])}
    // ice crystal clusters: n faceted crystals leaning out of a common root
    {const geo=crystalGeo(),list=[];for(const c of F.crystals){const n=c.n,h0=hash(c.x,c.y);for(let i=0;i<n;i++){const hh=hash(c.x+i*7.1,c.y-i*3.3),a=c.a+i/n*Math.PI*2+hh,d=i?c.r*(.25+.45*hh):0;
        list.push({x:c.x+Math.cos(a)*d,y:c.y+Math.sin(a)*d,h:c.h*(i?.45+.5*hash(c.y+i,c.x):1),r:c.r*(i?.16+.12*hh:.24),tx:i?Math.cos(a)*(.25+.35*h0):0,tz:i?Math.sin(a)*(.25+.35*h0):0,ry:hh*6.28})}}
      this.instC(geo,iceM(this),list,(c,add)=>add(c.x,this.gY(c.x,c.y)-8,c.y,c.r,c.h,c.r,c.tz,c.ry,-c.tx,null),!!this.hi,null,2600)}};
  // built with the rest of the props
  const _bp=P.buildProps;P.buildProps=function(){const r=_bp.apply(this,arguments);try{this.buildFort()}catch(e){warn('build',e)}return r};
  // ---- per frame: the castle's name, the braziers' blue flames, Eternal Winter ----
  let frost=null;const frostDom=()=>{if(frost||typeof document==='undefined')return frost;frost=document.createElement('div');
    frost.style.cssText='position:fixed;inset:0;z-index:6;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,#ffffff00 38%,#d8f0ffcc 80%,#ffffffee 100%);mix-blend-mode:screen';
    document.body.appendChild(frost);return frost};
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r=_fx.apply(this,arguments);try{const F=WD&&WD.fort;if(!F||!L||typeof state==='undefined'||state!=='play')return r;
      const inF=fortIn(L.x,L.y,-120)&&fortBase(L.x,L.y)>FORT_P-1;if(inF&&!this._inFort&&typeof gameT!=='undefined'&&gameT>3)announce={txt:'❄️ '+F.name+' — ราชินีหิมะประทับอยู่ในท้องพระโรง',t:3.4};this._inFort=inF;
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
