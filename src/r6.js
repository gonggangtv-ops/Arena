// ===================== FX 2: flash lights, lightning, bigger impacts, visuals for the new weapons =====================
// Layers on top of the base effects (r4): every skill impact gets a light flash, a second shockwave,
// bright sparks that bloom, ground glow and camera shake near the viewer.
const FX_COL={crescent:'#dfe8ff',whirl:'#f2f6ff',net:'#e8d8a8',volley:'#ffd27a',static:'#b9a6ff',thunder:'#d8ccff',
  spin:'#ffcf8a',judg:'#ffe27a',cry:'#ff9a5a',line:'#ffb347',lotus:'#ff7ad0',rain:'#9dffc0',boom:'#ff7a2a',nova:'#ff6a1a',meteor:'#ff5a2a',frost:'#8fe3ff',blizz:'#cfefff',slam:'#ff4a4a'};
Object.assign(AOE_COL,{crescent:'#dfe8ff',whirl:'#f2f6ff',net:'#e8d8a8',volley:'#ffd27a',static:'#b9a6ff',thunder:'#d8ccff'});
Object.assign(R3,{
  fxInit(){this.flashL=[];this.bolts=[];this.slashes=[];this.moons=[];
    if(this.hi)for(let i=0;i<4;i++){const l=new THREE.PointLight('#ffffff',0,700,1.2);l.userData={t:0,T:1,I:0};this.scene.add(l);this.flashL.push(l)}},
  // short light burst (high quality only; light count stays constant so shaders never recompile)
  flash(x,y,z,c,I,d,T){if(!this.flashL||!this.flashL.length)return;let l=this.flashL[0];for(const q of this.flashL)if(q.userData.t>=q.userData.T||q.userData.I*(1-q.userData.t/q.userData.T)<l.userData.I*(1-l.userData.t/l.userData.T))l=q;
    l.position.set(x,y,z);l.color.set(c);l.distance=d;l.userData={t:0,T:T||.4,I}},
  shakeNear(x,y,a){const L=listener&&listener();if(!L)return;const d=Math.hypot(L.x-x,L.y-y);if(d<900)shakeA=Math.max(shakeA,a*(1-d/900))},
  // jagged lightning path between ground points (a,b in world x/z, heights ya/yb)
  bolt(ax,ay,az,bx,by,bz,c,life,w){const n=9,pts=[];for(let i=0;i<=n;i++){const t=i/n,j=i&&i<n?1:0;pts.push([lerp(ax,bx,t)+rand(-26,26)*j,lerp(ay,by,t)+rand(-18,18)*j,lerp(az,bz,t)+rand(-26,26)*j])}
    this.bolts.push({pts,c,t:0,life:life||.22,w:w||5})},
  drawBolts(dt){const G=this.G;this.bolts=this.bolts.filter(b=>(b.t+=dt)<b.life);
    for(const b of this.bolts){const k=1-b.t/b.life,flick=Math.random()<.25?.4:1;
      for(let i=0;i<b.pts.length-1;i++){const p=b.pts[i],q=b.pts[i+1];const dx=q[0]-p[0],dy=q[1]-p[1],dz=q[2]-p[2],L=Math.hypot(dx,dy,dz)||1;
        for(const [w,col,a] of[[b.w*3.2,b.c,.35],[b.w,'#ffffff',1]]){const m=this.get(w>b.w?'boltG':'boltC',()=>{const mm=new THREE.Mesh(G.box,new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));mm.userData.ownMat=1;return mm});
          m.material.color.set(col).multiplyScalar(this.post?2.2:1);m.material.opacity=a*k*flick;m.position.set((p[0]+q[0])/2,(p[1]+q[1])/2,(p[2]+q[2])/2);m.scale.set(w*k+.5,w*k+.5,L);m.lookAt(q[0],q[1],q[2])}}}},
  // big glowing crescent arc drawn on the ground for slashes
  slash(x,y,ang,r,arc,c,life){this.slashes.push({x,y,ang,r,arc,c,t:0,life:life||.35})},
  drawSlashes(dt){this.slashes=this.slashes.filter(s=>(s.t+=dt)<s.life);
    for(const s of this.slashes){const k=s.t/s.life,gy=this.gY(s.x,s.y);const d=this.get('slashD',()=>{const m=new THREE.Mesh(new THREE.RingGeometry(.72,1,40,1,0,1),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false}));m.rotation.order='YXZ';m.userData.ownMat=1;return m});
      if(d.userData.arc!==s.arc){d.geometry.dispose();d.geometry=new THREE.RingGeometry(.72,1,40,1,-s.arc,s.arc*2);d.userData.arc=s.arc}
      d.material.color.set(s.c).multiplyScalar(this.post?2:1);d.material.opacity=(1-k)*.95;d.position.set(s.x,gy+18+k*10,s.y);d.rotation.set(-Math.PI/2,0,0);d.rotation.y=-s.ang;d.rotation.x=-Math.PI/2;
      const sc=s.r*(.75+k*.35);d.scale.set(sc,sc,sc)}},
  stepFlash(dt){if(!this.flashL)return;for(const l of this.flashL){const u=l.userData;u.t+=dt;const k=Math.max(0,1-u.t/u.T);l.intensity=u.I*k*k}},
  // bright crescent that sweeps through the air on every melee swing
  moon(x,y,ang,r,c,life,flip){if(this.moons.length<16)this.moons.push({x,y,ang,r,c,t:0,life:life||.22,flip:flip||1})},
  moonGeo(){if(this.moonG)return this.moonG;const n=26,A=1.2,p=[],col=[],idx=[];for(let i=0;i<=n;i++){const a=-A+2*A*i/n,e=Math.cos(a/A*Math.PI/2),w=.24*Math.pow(e,.8),b=.2+.8*e*e;
      p.push(Math.cos(a),0,Math.sin(a),Math.cos(a)*(1-w),0,Math.sin(a)*(1-w));col.push(b,b,b,0,0,0);if(i<n){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);return this.moonG=g},
  drawMoons(dt){this.moons=this.moons.filter(s=>(s.t+=dt)<s.life);
    for(const s of this.moons){const k=s.t/s.life,gy=this.gY(s.x,s.y);const d=this.get('moon',()=>{const m=new THREE.Mesh(this.moonGeo(),new THREE.MeshBasicMaterial({color:'#ffffff',vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false}));m.rotation.order='YXZ';m.renderOrder=9;m.frustumCulled=false;m.userData.ownMat=1;return m});
      d.material.color.set(s.c).lerp(this.c2.set('#ffffff'),.5).multiplyScalar(this.post?1.25:.9);d.material.opacity=.85*Math.pow(1-k,1.3);d.position.set(s.x,gy+58+k*8,s.y);
      d.rotation.set(0,-(s.ang+s.flip*(k-.45)*1.5),s.flip*.22);const sc=s.r*(.8+k*.35);d.scale.set(sc,sc,sc)}},
  fxExtra(T,dt,me,L){this.stepFlash(dt);this.drawBolts(dt);this.drawSlashes(dt);this.drawMoons(dt)},
  sparks(x,y,z,c,n,v,life,up){for(let i=0;i<n;i++){const a=Math.random()*6.283,s=rand(v*.35,v);this.sp(true,{x,y,z,vx:Math.cos(a)*s,vy:rand(up?.4:.1,up?1.2:.6)*v,vz:Math.sin(a)*s,l:rand(life*.6,life),s:rand(10,22),s1:2,c,sp:7,g:500})}},
  // one-shot extra layer when any skill area goes off
  impact(a){const gy=this.gY(a.x,a.y),c=FX_COL[a.kind]||AOE_COL[a.kind]||'#ffffff',r=a.r||200,big=r>=230||a.kind==='meteor'||a.kind==='judg'||a.kind==='line';
    this.flash(a.x,gy+90,a.y,c,big?5200:2600,r*2.6,big?.55:.32);this.ring(a.x,a.y,10,r*1.55,'#ffffff',.3);this.ring(a.x,a.y,20,r*1.15,c,.55);
    this.sparks(a.x,gy+20,a.y,c,big?46:24,big?620:420,.7,true);this.decal({x:a.x,y:a.y,r:r*.95,c,life:1.2,tex:'shock',a:.6,fade:.8});
    if(big){this.sp(true,{x:a.x,y:gy+60,z:a.y,l:.3,s:r*2.2,s1:r*.6,c:'#ffffff',sp:0,a:.55});for(let i=0;i<14;i++){const aa=i/14*6.283;this.sp(false,{x:a.x+Math.cos(aa)*r*.5,y:gy+8,z:a.y+Math.sin(aa)*r*.5,vx:Math.cos(aa)*260,vz:Math.sin(aa)*260,vy:rand(20,60),l:1.1,s:50,s1:150,c:'#a89880',a:.45,sp:2,dr:.6})}}
    this.shakeNear(a.x,a.y,big?14:6)},
  // continuous extras while a damage-over-time area is active
  dotExtra(a,T,dt){const gy=this.gY(a.x,a.y),c=FX_COL[a.kind]||'#ffffff';a.fl=(a.fl||0)-dt;
    if(a.fl<=0){a.fl=.32;this.flash(a.x,gy+120,a.y,c,a.kind==='blizz'?1400:1800,a.r*2.2,.26)}
    if(a.kind==='rain'||a.kind==='volley'){if(Math.random()<dt*14){const r=Math.sqrt(Math.random())*a.r,aa=Math.random()*6.283;const x=a.x+Math.cos(aa)*r,y=a.y+Math.sin(aa)*r;this.ring(x,y,4,40,c,.5);this.sparks(x,this.gY(x,y)+6,y,c,5,220,.35,true)}}},
  // ---- visuals for the new weapons ----
  projNew(p,y,ang,T){const G=this.G;
    if(p.kind===6){const w=this.get('swave',()=>{const g=new THREE.Group();const m=new THREE.Mesh(new THREE.TorusGeometry(1,.09,6,28,2.3),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));m.userData.ownMat=1;m.rotation.z=Math.PI/2-1.15;
        const m2=new THREE.Mesh(new THREE.TorusGeometry(1,.22,6,28,2.3),new THREE.MeshBasicMaterial({color:'#8ab4ff',transparent:true,opacity:.45,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));m2.userData.ownMat=1;m2.rotation.z=Math.PI/2-1.15;g.add(m,m2);
        const pv=new THREE.Group();pv.add(g);g.rotation.y=Math.PI/2;return pv});
      w.position.set(p.x,y-6,p.y);w.rotation.set(0,ang+Math.PI/2,0);w.scale.setScalar(p.r||60);if(this.post)w.children[0].children[0].material.color.set('#ffffff').multiplyScalar(2.2);
      for(let i=0;i<3;i++){const s=rand(-1,1);this.sp(true,{x:p.x+Math.cos(ang)*s*p.r*.8,y:y+rand(-10,20),z:p.y-Math.sin(ang)*s*p.r*.8,vy:rand(10,60),l:.45,s:22,s1:4,c:i?'#cfe0ff':'#ffffff',sp:7})}
      if(Math.random()<.3)this.decal({x:p.x,y:p.y,r:p.r*.7,c:'#9ab8ff',life:.8,tex:'shock',a:.4,fade:.9});return}
    if(p.kind===7||p.kind===8){const ex=p.kind===8;const a=this.get(ex?'xbolt':'bolt',()=>{const g=new THREE.Group();const s=this.mesh(G.cyl,this.std('#6a5038',.7,0),0,0,0,1.8,30,1.8,g);s.rotation.x=Math.PI/2;
        const tp=this.mesh(G.cone4,ex?this.std('#ff6a2a',.3,.2,{emissive:'#ff4a10',emissiveIntensity:1.4}):this.std('#9aa4b0',.3,.85),0,0,17,ex?5:3.6,10,ex?5:3.6,g);tp.rotation.x=Math.PI/2;
        for(const r of[0,Math.PI/2])this.mesh(G.box,this.bas('#3a3a3a'),0,0,-12,r?.6:7,r?7:.6,6,g);return g});a.position.set(p.x,y,p.y);a.rotation.y=ang;
      this.sp(true,{x:p.x,y,z:p.y,l:ex?.35:.16,s:ex?14:7,s1:2,c:ex?'#ffb060':'#e8e0d0',sp:ex?3:0,a:.7});return}
    if(p.kind===9){const n=this.get('netp',()=>{const m=new THREE.Mesh(this.G.plane,new THREE.MeshBasicMaterial({map:this.tex('net'),transparent:true,depthWrite:false,side:THREE.DoubleSide}));m.userData.ownMat=1;return m});
      n.position.set(p.x,y,p.y);n.rotation.set(-Math.PI/2+.3,T*9,0);n.scale.set(44,1,44);if(Math.random()<.5)this.sp(false,{x:p.x,y,z:p.y,l:.3,s:10,s1:2,c:'#e8d8a8',a:.6,sp:1});return}
    if(p.kind===10){const o=this.get('spark',()=>{const g=new THREE.Group();this.mesh(G.sph,this.glowM('#a88aff',.9),0,0,0,1,1,1,g);this.mesh(G.sph,this.bas('#ffffff'),0,0,0,.5,.5,.5,g);return g});
      o.position.set(p.x,y,p.y);o.scale.setScalar(11*(1+Math.sin(T*40)*.2));if(Math.random()<.35)this.bolt(p.x,y,p.y,p.x+rand(-30,30),y+rand(-20,20),p.y+rand(-30,30),'#b9a6ff',.06,1.6);
      this.sp(true,{x:p.x+rand(-4,4),y:y+rand(-4,4),z:p.y+rand(-4,4),l:.25,s:12,s1:3,c:'#d8ccff',sp:7});return}},
  aoeNew(a,T,dt){const gy=this.gY(a.x,a.y),c=FX_COL[a.kind];const pre=a.t<a.delay;
    if(a.kind==='crescent'){if(a.fx)return;a.fx=1;this.slash(a.x,a.y,a.ang,a.len||a.r,a.arc||1,'#dfe8ff',.38);this.slash(a.x,a.y,a.ang,(a.len||a.r)*.78,(a.arc||1)*.9,'#7aa8ff',.3);
      for(let i=0;i<34;i++){const aa=a.ang+rand(-a.arc,a.arc),d=rand(.3,1)*(a.len||a.r);this.sp(true,{x:a.x+Math.cos(aa)*d,y:gy+rand(10,50),z:a.y+Math.sin(aa)*d,vx:Math.cos(aa)*220,vz:Math.sin(aa)*220,vy:rand(20,90),l:.45,s:16,s1:3,c:i%3?'#dfe8ff':'#ffffff',sp:7})}
      this.flash(a.x+Math.cos(a.ang)*120,gy+70,a.y+Math.sin(a.ang)*120,'#cfdcff',3000,500,.3);this.shakeNear(a.x,a.y,7);return}
    if(a.kind==='whirl'){if(a.fx||a.t<a.delay)return;a.fx=1;this.slash(a.x,a.y,0,a.r,Math.PI,'#f2f6ff',.4);this.ring(a.x,a.y,20,a.r*1.4,'#ffffff',.6);this.ring(a.x,a.y,10,a.r*1.05,'#b8c8ff',.45);
      for(let i=0;i<30;i++){const aa=i/30*6.283;this.sp(false,{x:a.x+Math.cos(aa)*a.r*.6,y:gy+10,z:a.y+Math.sin(aa)*a.r*.6,vx:Math.cos(aa)*380,vz:Math.sin(aa)*380,vy:rand(20,80),l:.9,s:40,s1:120,c:'#b8a888',a:.5,sp:2,dr:.6})}
      this.sparks(a.x,gy+30,a.y,'#ffffff',26,520,.5,true);this.flash(a.x,gy+60,a.y,'#e0e8ff',3600,600,.35);this.shakeNear(a.x,a.y,10);return}
    if(a.kind==='net'){if(!a.fx){a.fx=1;this.ring(a.x,a.y,10,a.r*1.2,'#e8d8a8',.5);this.decal({x:a.x,y:a.y,r:a.r,c:'#ffffff',life:1.8,tex:'net',a:.95,fade:.3})}return}
    if(a.kind==='volley'){this.decal({x:a.x,y:a.y,r:a.r,c:'#ffd27a',life:.05,tex:'rune',a:pre?.75:.45});if(pre){this.ring(a.x,a.y,a.r*.9,a.r,'#ffd27a',.3);return}
      for(let i=0;i<Math.ceil(dt*55);i++){const r=Math.sqrt(Math.random())*a.r,aa=Math.random()*6.283;const x=a.x+Math.cos(aa)*r,y=a.y+Math.sin(aa)*r;this.sp(true,{x:x-110,y:this.gY(x,y)+300,z:y-55,vx:680,vy:-1850,vz:340,l:.17,s:16,s1:6,c:'#fff4d0',sp:10})}
      a.vt=(a.vt||0)-dt;if(a.vt<=0){a.vt=.07;const r=Math.sqrt(Math.random())*a.r,aa=Math.random()*6.283;const x=a.x+Math.cos(aa)*r,y=a.y+Math.sin(aa)*r,yy=this.gY(x,y);
        this.ring(x,y,6,70,'#ffd27a',.6);this.sparks(x,yy+8,y,'#ffe8a0',9,300,.4,true);this.sp(false,{x,y:yy+12,z:y,vy:rand(30,70),l:.9,s:30,s1:80,c:'#a89880',a:.45,sp:2});this.decal({x,y,r:26,c:'#ffffff',life:2,tex:'scorch',normal:1,a:.5,fade:.5})}
      this.dotExtra(a,T,dt);return}
    if(a.kind==='static'){const k=.5+.5*Math.sin(T*18);this.decal({x:a.x,y:a.y,r:a.r,c:'#b9a6ff',life:.05,tex:'rune',a:.35+.25*k});
      if(Math.random()<dt*16){const aa=Math.random()*6.283,r=a.r*rand(.4,1);const x=a.x+Math.cos(aa)*r,y=a.y+Math.sin(aa)*r;this.bolt(a.x,gy+40,a.y,x,this.gY(x,y)+8,y,'#a88aff',.12,2.5)}
      if(Math.random()<dt*30)this.sparks(a.x+rand(-a.r,a.r)*.7,gy+10,a.y+rand(-a.r,a.r)*.7,'#d8ccff',3,200,.3,true);a.fl=(a.fl||0)-dt;if(a.fl<=0){a.fl=.2;this.flash(a.x,gy+80,a.y,'#a88aff',1200*(.6+k*.4),a.r*2.4,.2)}return}
    if(a.kind==='thunder'){if(pre){this.decal({x:a.x,y:a.y,r:a.r,c:'#d8ccff',life:.05,tex:'rune',a:.7});this.sp(false,{x:a.x+rand(-a.r,a.r)*.6,y:gy+420,z:a.y+rand(-a.r,a.r)*.6,l:1.2,s:120,s1:260,c:'#3a3450',a:.35,sp:2});return}
      a.st=(a.st||0)-dt;if(a.st<=0){a.st=.16;const r=Math.sqrt(Math.random())*a.r,aa=Math.random()*6.283;const x=a.x+Math.cos(aa)*r,y=a.y+Math.sin(aa)*r,yy=this.gY(x,y);
        this.bolt(x+rand(-60,60),yy+700,y+rand(-60,60),x,yy,y,'#c8b4ff',.18,7);this.flash(x,yy+60,y,'#cdbaff',5200,700,.25);this.ring(x,y,6,90,'#ffffff',.5);this.sparks(x,yy+8,y,'#e8e0ff',10,320,.4,true);
        this.decal({x,y,r:50,c:'#ffffff',life:2.5,tex:'scorch',normal:1,a:.6,fade:.5});this.shakeNear(x,y,6)}return}},
  isNewAoe(k){return k==='crescent'||k==='whirl'||k==='net'||k==='volley'||k==='static'||k==='thunder'},
  // extra layers for the fx events of every existing skill
  fx2(e){const gy=e.x!==undefined?this.gY(e.x,e.y):0;
    switch(e.k){
      case 'chain':{const P=e.p||[];for(let i=0;i<P.length-1;i++){const p=P[i],q=P[i+1];this.bolt(p[0],this.gY(p[0],p[1])+60,p[1],q[0],this.gY(q[0],q[1])+45,q[1],'#b9a6ff',.28,5);
          if(i>0||P.length===2){this.flash(q[0],this.gY(q[0],q[1])+60,q[1],'#c8b4ff',3600,500,.3);this.sparks(q[0],this.gY(q[0],q[1])+45,q[1],'#e8e0ff',14,380,.4,true);this.ring(q[0],q[1],6,70,'#d8ccff',.5)}}
        const last=P[P.length-1];if(last)this.shakeNear(last[0],last[1],5);break}
      case 'dash':this.flash(e.x,gy+50,e.y,'#cfe0ff',2000,420,.25);for(let i=0;i<16;i++)this.sp(true,{x:e.x+rand(-20,20),y:gy+rand(20,60),z:e.y+rand(-20,20),vx:-Math.cos(e.a||0)*rand(200,500),vz:-Math.sin(e.a||0)*rand(200,500),l:.35,s:14,s1:2,c:'#e8f0ff',sp:7});break;
      case 'shield':this.flash(e.x,gy+60,e.y,'#ffe8a0',2600,450,.45);this.ring(e.x,e.y,10,120,'#ffe27a',.6);this.sparks(e.x,gy+40,e.y,'#fff2b0',22,260,.6,true);break;
      case 'leap':this.flash(e.x,gy+100,e.y,'#ffe27a',1800,(e.r||250)*2,.6);break;
      case 'cry':this.flash(e.x,gy+60,e.y,'#ff8a4a',3200,(e.r||360)*1.8,.4);this.shakeNear(e.x,e.y,7);this.ring(e.x,e.y,10,(e.r||360)*1.2,'#ffffff',.3);break;
      case 'blink':this.flash(e.x2||e.x,gy+50,e.y2||e.y,'#b48aff',2400,400,.3);this.sparks(e.x2||e.x,gy+40,e.y2||e.y,'#d8b8ff',16,300,.4,true);break;
      case 'smoke':this.flash(e.x,gy+40,e.y,'#8a8aa8',900,300,.3);break;
      case 'lotus':this.flash(e.x,gy+50,e.y,'#ff7ad0',3000,(e.r||330)*2,.5);for(let i=0;i<40;i++){const a=Math.random()*6.283,r=rand(20,e.r||300);this.sp(true,{x:e.x+Math.cos(a)*r,y:gy+rand(10,80),z:e.y+Math.sin(a)*r,vx:-Math.sin(a)*240,vz:Math.cos(a)*240,vy:rand(10,50),l:.9,s:12,s1:4,c:i%2?'#ffb0e0':'#ffffff',sp:7})}break;
      case 'snare':this.flash(e.x,gy+40,e.y,'#8aff7a',1400,260,.3);break;
      case 'box':if(e.ok)this.flash(e.x,gy+40,e.y,'#ffd35a',2600,320,.5);break;
      case 'lvl':this.flash(e.x,gy+60,e.y,'#ffd35a',2400,380,.6);break;
      case 'equip':this.flash(e.x,gy+40,e.y,e.c||'#ffffff',1400,260,.35);break;
      // night: the dead claw out of the ground / crumble at dawn
      case 'rise':{const n=e.big?34:22;for(let i=0;i<n;i++){const a=Math.random()*6.283,v=rand(40,180);this.sp(false,{x:e.x+Math.cos(a)*10,y:gy+4,z:e.y+Math.sin(a)*10,vx:Math.cos(a)*v,vz:Math.sin(a)*v,vy:rand(120,320),l:rand(.5,1),s:10,s1:22,c:'#5a4632',a:.85,sp:2,g:600})}
        this.flash(e.x,gy+30,e.y,'#7dff5a',1600,260,.45);this.ring(e.x,e.y,8,e.big?110:80,'#7dff5a',.55);this.decal({x:e.x,y:e.y,r:e.big?70:50,c:'#3a2a18',life:6,tex:'scorch',spin:0,a:.7});break}
      case 'dust':for(let i=0;i<26;i++){const a=Math.random()*6.283,r=rand(0,26);this.sp(i%3===0,{x:e.x+Math.cos(a)*r,y:gy+rand(10,90),z:e.y+Math.sin(a)*r,vy:rand(30,90),vx:rand(-30,30),vz:rand(-30,30),l:rand(.9,1.8),s:i%3?26:8,s1:i%3?60:2,c:i%3?'#b8a888':'#ffd27a',a:.6,sp:2,dr:.8})}break;
      case 'potion':{const c=e.c||'#ff6a7a';this.flash(e.x,gy+50,e.y,c,1300,200,.3);for(let i=0;i<18;i++){const a=i/18*6.283;this.sp(true,{x:e.x+Math.cos(a)*24,y:gy+rand(5,30),z:e.y+Math.sin(a)*24,vx:-Math.sin(a)*60,vz:Math.cos(a)*60,vy:rand(70,160),l:.8,s:9,s1:2,c,sp:1})}break}
      case 'ssr':{const C=['#ff3d7f','#ffb400','#7dff5a','#4ac8ff','#b46bff'];this.flash(e.x,gy+120,e.y,'#ff7ad0',5200,700,1);this.shakeNear(e.x,e.y,6);
        for(let i=0;i<70;i++){const a=Math.random()*6.283,r=rand(0,40);this.sp(true,{x:e.x+Math.cos(a)*r,y:gy+rand(0,40),z:e.y+Math.sin(a)*r,vx:Math.cos(a)*rand(20,90),vz:Math.sin(a)*rand(20,90),vy:rand(260,620),l:rand(.8,1.6),s:14,s1:3,c:C[i%5],sp:1,dr:.4})}
        for(let k=0;k<3;k++)this.ring(e.x,e.y,10,140+k*70,C[k],.6);break}}},
});
// hook into the base renderer
(()=>{const P=R3,_doFx=P.doFx,_aoe=P.aoeVis,_init=P.initFX;
  P.doFx=function(e,me,L){_doFx.call(this,e,me,L);try{this.fx2(e)}catch(err){}};
  P.initFX=function(){_init.call(this);this.fxInit()};
  P.aoeVis=function(a,T,dt,L){if(this.isNewAoe(a.kind)){this.aoeNew(a,T,dt);return}const had=a.fx;_aoe.call(this,a,T,dt,L);
    if(!had&&a.fx&&!a.dot)this.impact(a);else if(a.dot&&a.t>=a.delay)this.dotExtra(a,T,dt)}})();
