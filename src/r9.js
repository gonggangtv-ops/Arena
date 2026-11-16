// ===================== Hand weapons sized for the realistic-proportion heroes =====================
// Built in code (metres, +Y = out of the fist, origin = grip centre) so blades are slim, steel reads as steel and the grip sits in the hand.
// QW.make(kind,M,P): M(colour,roughness,metalness,[emissive,intensity]) returns a material; P = palette / options.
const QW={g:null,bl:{},
  init(){if(this.g)return;const T=THREE,arc=(R,tube,a)=>new T.TorusGeometry(R,tube,5,14,a).rotateZ(-a/2).translate(-R,0,0);
    this.g={cyl:new T.CylinderGeometry(1,1,1,10),cylT:new T.CylinderGeometry(.55,1,1,10),box:new T.BoxGeometry(1,1,1),sph:new T.SphereGeometry(1,12,8),oct:new T.OctahedronGeometry(1),cone:new T.ConeGeometry(1,1,8),
      disc:new T.CylinderGeometry(1,1,1,20),dome:new T.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2),ring:new T.TorusGeometry(1,.1,6,20),rim:new T.TorusGeometry(1,.045,6,24),
      bow:arc(.62,.02,1.9),prod:arc(.5,.016,1.1)}},
  // a flat blade from a counter-clockwise outline: thick along the spine, sharp at the rim
  blade(key,pts,th,kx,ky){if(this.bl[key])return this.bl[key];let cx=0,cy=0;for(const p of pts){cx+=p[0];cy+=p[1]}cx/=pts.length;cy/=pts.length;
    const inn=pts.map(p=>[cx+(p[0]-cx)*kx,cy+(p[1]-cy)*ky]),v=[],n=pts.length,h=th/2,tri=(a,b,c)=>v.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);
    for(let i=0;i<n;i++){const j=(i+1)%n,o1=[pts[i][0],pts[i][1],0],o2=[pts[j][0],pts[j][1],0];
      for(const s of[1,-1]){const a=[inn[i][0],inn[i][1],s*h],b=[inn[j][0],inn[j][1],s*h],c=[cx,cy,s*h];
        if(s>0){tri(c,a,b);tri(a,o1,o2);tri(a,o2,b)}else{tri(c,b,a);tri(a,o2,o1);tri(a,b,o2)}}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();return this.bl[key]=g},
  add(p,geo,mat,x,y,z,sx,sy,sz,rx,ry,rz){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);if(rx||ry||rz)m.rotation.set(rx||0,ry||0,rz||0);p.add(m);return m},
  tip(g,y,x){const t=new THREE.Object3D();t.position.set(x||0,y,0);g.add(t);g.userData.tip=t;return g},
  pal(M,P){P=P||{};const t=P.t|0,rust=P.rust,em=P.em||null;return{
      steel:M(rust?'#6f665c':P.steel||'#cfd6de',rust?.7:.26,rust?.55:.95,em),dark:M(rust?'#3a3530':'#5a6068',.45,.85),
      trim:M(rust?'#5a4a3a':P.trim||['#8a9099','#aab4c0','#c79a4a','#e8b838','#ffd060'][Math.min(4,t)],rust?.7:.32,.9),
      grip:M(rust?'#2e241c':P.grip||'#4a2f1e',.85,0),wood:M(rust?'#3a2e24':P.wood||'#6a4a2e',.8,0),gem:(c,k)=>M(c,.25,.1,[c,k===undefined?1.6:k])}},
  sword(M,P,L,w,gl,gw){const g=new THREE.Group(),G=this.g,p=this.pal(M,P),y0=gl/2+.012;
    this.add(g,this.blade('s'+L+w,[[-w,y0],[w,y0],[w*.86,y0+L*.86],[0,y0+L],[-w*.86,y0+L*.86]],w*.42,.1,.985),p.steel,0,0,0,1,1,1);
    this.add(g,G.box,p.trim,0,y0-.004,0,gw,.022,.034);for(const s of[-1,1])this.add(g,G.sph,p.trim,s*gw/2,y0-.004,0,.017,.017,.02);
    this.add(g,G.cyl,p.grip,0,0,0,.0155,gl,.0185);this.add(g,G.sph,p.trim,0,-gl/2-.018,0,.026,.024,.026);
    if(P&&P.gem)this.add(g,G.oct,p.gem(P.gem),0,y0-.004,0,.02,.02,.026);return this.tip(g,y0+L)},
  make(kind,M,P){this.init();P=P||{};const G=this.g,g=new THREE.Group(),p=this.pal(M,P),A=this.add.bind(this);
    if(kind==='sword')return this.sword(M,P,.74,.03,.15,.2);
    if(kind==='gsword')return this.sword(M,P,1.22,.043,.3,.34);
    if(kind==='dagger')return this.sword(M,P,.3,.021,.11,.09);
    if(kind==='axe'){A(g,G.cylT,p.wood,0,.27,0,.019,1.22,.019,Math.PI);A(g,G.cyl,p.dark,0,.76,0,.03,.2,.03);A(g,G.cyl,p.trim,0,-.33,0,.024,.05,.024);
      A(g,this.blade('axe',[[.02,.67],[.09,.685],[.25,.55],[.292,.76],[.25,.97],[.09,.835],[.02,.85]],.036,.8,.62),p.steel,0,0,0,1,1,1);
      A(g,this.blade('axeb',[[-.02,.71],[-.02,.81],[-.13,.76]],.03,.5,.5),p.steel,0,0,0,1,1,1);A(g,G.cone,p.trim,0,.9,0,.02,.08,.02);return this.tip(g,.76,.26)}
    if(kind==='spear'){A(g,G.cyl,p.wood,0,.32,0,.016,1.85,.016);A(g,G.cyl,p.trim,0,1.24,0,.024,.07,.024);A(g,G.cyl,p.trim,0,-.6,0,.02,.06,.02);
      A(g,this.blade('spear',[[-.02,1.27],[.02,1.27],[.052,1.4],[0,1.66],[-.052,1.4]],.02,.12,.97),p.steel,0,0,0,1,1,1);
      for(const s of[-1,1])A(g,this.blade('spw',[[0,1.2],[.09,1.26],[.02,1.3]],.012,.5,.5),p.trim,0,0,0,s,1,1);if(P.glow)A(g,G.oct,p.gem(P.glow,1.2),0,1.24,0,.03,.045,.03);return this.tip(g,1.6)}
    if(kind==='bow'){const wd=M(P.rust?'#3a2e24':'#7a4e2a',.7,0,P.em);A(g,G.bow,wd,0,0,0,1,1,1.5);A(g,G.cyl,p.grip,0,0,0,.026,.15,.03);
      const tx=-.62+.62*Math.cos(.95),ty=.62*Math.sin(.95);for(const s of[-1,1]){A(g,G.sph,p.trim,tx,s*ty,0,.022,.03,.022);A(g,G.cyl,p.trim,-.004,s*.09,0,.027,.012,.031)}
      A(g,G.cyl,M('#e8e0c8',.9,0),tx,0,0,.0035,ty*2,.0035);return this.tip(g,0,.1)}
    if(kind==='xbow'){A(g,G.box,p.wood,0,.16,0,.05,.62,.05);A(g,G.box,p.wood,0,-.1,-.04,.045,.16,.07,-.5);A(g,G.box,p.dark,0,.2,.03,.02,.5,.012);
      const pr=A(g,G.prod,p.steel,0,.44,.02,1,1,1.4,0,0,-Math.PI/2);const tx=.5*Math.sin(.55),ty=.44-(.5-.5*Math.cos(.55));
      A(g,G.cyl,M('#e8e0c8',.9,0),0,ty,.02,.003,tx*2,.003,0,0,Math.PI/2);A(g,G.ring,p.trim,0,.5,0,.04,.04,.04,Math.PI/2);
      A(g,G.cyl,p.steel,0,.3,.045,.006,.34,.006);A(g,G.cone,p.steel,0,.49,.045,.012,.05,.012);if(P.glow)A(g,G.oct,p.gem(P.glow,1.3),0,.5,.045,.018,.03,.018);return this.tip(g,.52)}
    if(kind==='staff'||kind==='zstaff'){const c=P.gemC||'#ff8a30',ring=P.head==='ring';A(g,G.cylT,p.wood,0,.1,0,.021,1.6,.021,Math.PI);
      for(const y of[.72,.3,-.25])A(g,G.cyl,p.trim,0,y,0,.024,.03,.024);A(g,G.sph,p.trim,0,-.71,0,.026,.03,.026);
      if(ring){A(g,G.ring,p.trim,0,1.03,0,.1,.1,.1);A(g,G.sph,p.gem(c,1.8),0,1.03,0,.05,.05,.05);A(g,G.cone,p.trim,0,1.16,0,.018,.07,.018)}
      else{for(let i=0;i<3;i++){const a=i*2.094,pr=A(g,G.box,p.trim,Math.sin(a)*.05,.98,Math.cos(a)*.05,.014,.2,.02);pr.rotation.set(Math.cos(a)*.32,0,-Math.sin(a)*.32)}
        A(g,G.oct,p.gem(c,1.8),0,1.04,0,.055,.085,.055)}
      return this.tip(g,1.04)}
    if(kind==='wand'){const c=P.gemC||'#9fe8ff';A(g,G.cylT,p.wood,0,.13,0,.014,.36,.014);A(g,G.cyl,p.trim,0,-.03,0,.019,.025,.019);A(g,G.sph,p.trim,0,-.06,0,.02,.02,.02);
      A(g,G.oct,p.gem(c,1.8),0,.36,0,.03,.06,.03);return this.tip(g,.38)}
    if(kind==='book'){const c=P.gemC||'#9fe8ff',cov=M(P.cover||'#3a2a5a',.7,0),pg=M('#d8cfb4',.9,0);
      if(P.open){for(const s of[-1,1]){const h=new THREE.Group();h.rotation.z=s*.22;g.add(h);A(h,G.box,cov,s*.085,0,0,.17,.012,.24);A(h,G.box,pg,s*.082,.014,0,.15,.02,.22)}
        A(g,G.box,p.trim,0,-.004,0,.02,.016,.245);A(g,G.oct,p.gem(c,1.6),0,.1,0,.022,.032,.022)}
      else{A(g,G.box,cov,0,0,0,.17,.055,.24);A(g,G.box,pg,.008,0,0,.165,.04,.225);A(g,G.box,p.trim,-.082,0,0,.012,.06,.245);A(g,G.oct,p.gem(c,1.4),0,.03,0,.03,.01,.04)}
      return g}
    if(kind==='shield'){const face=M(P.face||'#8a2a2a',.7,.05,P.em),R=.3;A(g,G.disc,p.wood,0,-.012,0,R,.02,R);A(g,G.disc,face,0,.004,0,R*.93,.02,R*.93);
      A(g,G.rim,p.trim,0,.008,0,R,R,R*.9,Math.PI/2);A(g,G.dome,p.trim,0,.012,0,.075,.06,.075);
      for(let i=0;i<4;i++){const a=i*Math.PI/2+.785;A(g,G.sph,p.trim,Math.cos(a)*R*.72,.014,Math.sin(a)*R*.72,.016,.01,.016)}
      A(g,G.box,p.trim,0,.012,0,R*1.7,.008,.03);A(g,G.box,p.trim,0,.012,0,.03,.008,R*1.7);return g}
    return g}};
