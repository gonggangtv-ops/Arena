// ===================== FX 3: weapon fusion — fused weapon models, the fusing ritual, new projectiles and skill effects =====================
Object.assign(AOE_COL,{spirit:'#7ff0d8'});Object.assign(FX_COL,{spirit:'#7ff0d8'});
Object.assign(R3,{
  fusings:[],fuseIcons:[],
  // fused weapon as a procedural model (ground drops + the fallback humanoid): the base shape, always at least epic, wrapped in the fused glow
  fusedWeapon(wk,tier,F,base){const G=this.G;let g;
    if(F.arch==='MR'){g=new THREE.Group();const M=this.metalFor(Math.max(2,tier));
      this.mesh(this.cylg(1.5,1.9,112),this.tstd('bark','#5a4030',.8,0),0,34,0,1,1,1,g,true);this.mesh(this.cylg(2.6,2.6,6),this.std('#d8a840',.3,.95),0,88,0,1,1,1,g);
      this.mesh(this.extr('spear',[[-3.2,0],[3.2,0],[1.6,22],[0,30],[-1.6,22]],1.4,.3),M,0,90,0,1,1,1,g,true);for(const s of[-1,1]){const w=this.mesh(G.cone4,M,s*5,90,0,1.6,9,1,g);w.rotation.z=s*1.2}
      const hd=new THREE.Group();hd.position.y=118;g.add(hd);g.userData.tip=hd}
    else g=base(F.arch==='MM'?'sword':F.arch==='MS'?'gsword':F.arch==='RS'?'bow':F.arch==='RR'?'xbow':F.el,Math.max(2,tier));
    const h=this.mesh(G.sph,this.glowM(F.glow,.28),0,F.arch==='RS'?0:30,0,9,F.arch==='RS'?30:34,9,g);h.userData.ownMat=0;
    if(F.el2){const o=this.mesh(G.sph,this.glowM(ELEM[F.el2].c,.9),0,86,5,4.5,4.5,4.5,g);o.userData.ownMat=0}
    g.userData.glow=F.glow;return g},
  // ---- the fusing ritual: both weapons orbit the hero, spiral in, then flash into the new one ----
  stepFusings(dt){const G=this.G;this.fusings=this.fusings.filter(f=>(f.t+=dt)<f.T&&f.u&&!f.u.dead);
    for(const f of this.fusings){const u=f.u,k=f.t/f.T,gy=this.gY(u.x,u.y),r=lerp(130,10,k*k),h=gy+105+k*45,sp=4+k*16;
      for(let j=0;j<2;j++){const ic=j?f.b:f.a;if(!ic)continue;const s=this.get('fuseIc',()=>{const m=new THREE.Sprite(new THREE.SpriteMaterial({map:this.emoji(ic),transparent:true,depthWrite:false,depthTest:false}));m.userData.ownMat=1;m.renderOrder=6;return m});
        if(s.material.map!==this.emoji(ic)){s.material.map=this.emoji(ic);s.material.needsUpdate=true}const a=f.t*sp+j*Math.PI;s.position.set(u.x+Math.cos(a)*r,h+Math.sin(f.t*9+j)*8,u.y+Math.sin(a)*r);s.scale.setScalar(84*(1-k*.3));s.material.opacity=Math.min(1,f.t*6);
        if(Math.random()<.8)this.sp(true,{x:s.position.x,y:s.position.y,z:s.position.z,l:.4,s:16,s1:3,c:j?f.cb:f.ca,sp:1})}
      if(Math.random()<dt*40){const a=Math.random()*6.283,d=rand(30,140);this.sp(true,{x:u.x+Math.cos(a)*d,y:gy+6,z:u.y+Math.sin(a)*d,vx:-Math.cos(a)*d*1.6,vz:-Math.sin(a)*d*1.6,vy:rand(60,160),l:.55,s:10,s1:2,c:Math.random()<.5?'#ffd27a':'#fff2c0',sp:7,dr:.6})}
      f.fl=(f.fl||0)-dt;if(f.fl<=0){f.fl=.18;this.flash(u.x,gy+90,u.y,'#ffcf6a',1400+2600*k,420,.2)}
      if(Math.random()<dt*6)this.decal({x:u.x,y:u.y,r:90+60*k,c:'#ffcf6a',life:.5,tex:'rune',spin:4,a:.6})}
    // the new weapon's icon rising above the hero after the fusion
    this.fuseIcons=this.fuseIcons.filter(f=>(f.t+=dt)<1.8);
    for(const f of this.fuseIcons){const s=this.get('fuseBig',()=>{const m=new THREE.Sprite(new THREE.SpriteMaterial({map:this.emoji(f.ic),transparent:true,depthWrite:false,depthTest:false}));m.userData.ownMat=1;m.renderOrder=7;return m});
      if(s.material.map!==this.emoji(f.ic)){s.material.map=this.emoji(f.ic);s.material.needsUpdate=true}const k=f.t/1.8,u=f.u;const x=u?u.x:f.x,y=u?u.y:f.y;
      s.position.set(x,this.gY(x,y)+160+k*90,y);s.scale.setScalar(96+40*Math.sin(Math.min(1,k*4)*Math.PI/2));s.material.opacity=k<.7?1:(1-k)/.3}},
  fx3(e){const gy=e.x!==undefined?this.gY(e.x,e.y):0;const U=e.id!==undefined?UMAP.get(e.id):null;
    switch(e.k){
      case 'fusing':{const A=AW[e.a],B=AW[e.b];if(!U)break;this.fusings=this.fusings.filter(f=>f.u!==U);
        this.fusings.push({u:U,t:0,T:1.25,a:A&&WEAPONS[A].ic,b:B&&WEAPONS[B].ic,ca:A&&WEAPONS[A].col||'#ffffff',cb:B&&WEAPONS[B].col||'#ffffff'});
        this.ring(e.x,e.y,20,160,'#ffcf6a',.9);this.decal({x:e.x,y:e.y,r:150,c:'#ffcf6a',life:1.3,tex:'rune',spin:-3,a:.75,follow:U});break}
      case 'fuse':{const k=AW[e.w],F=k&&WEAPONS[k];if(!F)break;const c=F.col,c2=F.glow;this.fusings=this.fusings.filter(f=>f.u!==U);
        this.flash(e.x,gy+120,e.y,c2,7000,900,.9);this.shakeNear(e.x,e.y,9);
        for(const [r,col,l] of[[260,'#ffffff',.5],[200,c,.8],[140,c2,1.1]])this.ring(e.x,e.y,10,r,col,l);
        this.decal({x:e.x,y:e.y,r:170,c:c2,life:2.2,tex:'rune',spin:2.5,a:.85,follow:U});
        this.sp(true,{x:e.x,y:gy+140,z:e.y,l:.45,s:320,s1:80,c:'#ffffff',sp:0,a:.7});
        for(let i=0;i<26;i++)this.sp(true,{x:e.x+rand(-14,14),y:gy+rand(0,30),z:e.y+rand(-14,14),vy:rand(500,900),l:rand(.5,.9),s:rand(20,34),s1:4,c:i%2?c:c2,sp:1,dr:.5});   // light pillar
        for(let i=0;i<60;i++){const a=Math.random()*6.283,v=rand(150,520);this.sp(true,{x:e.x,y:gy+60,z:e.y,vx:Math.cos(a)*v,vz:Math.sin(a)*v,vy:rand(100,420),l:rand(.6,1.2),s:rand(10,18),s1:2,c:i%3?c2:'#fff2c0',sp:7,g:500})}
        if(F.el)for(let i=0;i<24;i++){const a=i/24*6.283;this.sp(true,{x:e.x+Math.cos(a)*40,y:gy+20,z:e.y+Math.sin(a)*40,vx:Math.cos(a)*340,vz:Math.sin(a)*340,vy:rand(20,90),l:.7,s:26,s1:6,c:ELEM[F.el].c,c2:F.el==='fire'?'#ff3a10':undefined,sp:F.el==='fire'?3:F.el==='frost'?4:7})}
        this.fuseIcons.push({u:U,x:e.x,y:e.y,ic:F.ic,t:0});break}
      case 'royal':{this.flash(e.x,gy+70,e.y,'#ff5a3a',3200,420,.45);this.ring(e.x,e.y,20,170,'#ffcf6a',.6);this.ring(e.x,e.y,10,120,'#ff3a3a',.5);
        for(let i=0;i<24;i++){const a=i/24*6.283;this.sp(true,{x:e.x+Math.cos(a)*36,y:gy+rand(10,60),z:e.y+Math.sin(a)*36,vy:rand(80,200),vx:Math.cos(a)*40,vz:Math.sin(a)*40,l:.8,s:12,s1:3,c:i%2?'#ffcf6a':'#ff4a3a',sp:1})}break}
      case 'xcut':{const a=e.a||0;for(const d of[-.7,.7])this.slash(e.x,e.y,a+d,70,.9,'#ffe2a0',.3);this.sparks(e.x,gy+40,e.y,'#fff0c0',10,320,.35,true);this.flash(e.x,gy+50,e.y,'#ffcf6a',1600,260,.18);break}
      case 'gust':{const a=e.a||0;for(let i=0;i<22;i++){const s=rand(-30,30);this.sp(false,{x:e.x-Math.sin(a)*s,y:gy+rand(10,60),z:e.y+Math.cos(a)*s,vx:Math.cos(a)*rand(300,700),vz:Math.sin(a)*rand(300,700),vy:rand(0,30),l:.45,s:18,s1:46,c:'#d8fff4',a:.45,sp:2,dr:2})}break}
      case 'trap':{this.ring(e.x,e.y,10,90,'#ffb46a',.5);this.decal({x:e.x,y:e.y,r:60,c:'#ff9a4a',life:.9,tex:'rune',spin:6,a:.8});this.sparks(e.x,gy+10,e.y,'#ffd27a',8,200,.3,true);break}}},
  // ---- projectiles 11-15 ----
  projF(p,y,ang,T){const G=this.G,ec=p.el?ELEM[p.el].c:null;
    if(p.kind===11){const s=this.get('spearP',()=>{const g=new THREE.Group();const sh=this.mesh(G.cyl,this.std('#3a5a50',.6,.2,{emissive:'#1a6a58',emissiveIntensity:.6}),0,0,-10,1.6,70,1.6,g);sh.rotation.x=Math.PI/2;
        const tp=this.mesh(G.cone4,this.std('#e8fff8',.1,.9,{emissive:'#3affc8',emissiveIntensity:1.3}),0,0,32,4.2,20,2.2,g);tp.rotation.x=Math.PI/2;const gl=this.mesh(G.sph,this.glowM('#7ff0d8',.4),0,0,10,7,7,46,g);return g});
      s.position.set(p.x,y,p.y);s.rotation.y=ang;
      for(let i=0;i<2;i++)this.sp(true,{x:p.x+rand(-6,6),y:y+rand(-6,6),z:p.y+rand(-6,6),vy:rand(-10,30),l:.45,s:14,s1:3,c:i?'#c8fff0':'#3affc8',sp:1});
      if(Math.random()<.4)this.sp(false,{x:p.x,y,z:p.y,vy:20,l:.7,s:18,s1:40,c:'#b8fff0',a:.25,sp:2});return}
    if(p.kind===12){const w=this.get('ewave',()=>{const g=new THREE.Group();const m=new THREE.Mesh(new THREE.TorusGeometry(1,.1,6,28,2.3),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));m.userData.ownMat=1;m.rotation.z=Math.PI/2-1.15;
        const m2=new THREE.Mesh(new THREE.TorusGeometry(1,.26,6,28,2.3),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));m2.userData.ownMat=1;m2.rotation.z=Math.PI/2-1.15;g.add(m,m2);
        const pv=new THREE.Group();pv.add(g);g.rotation.y=Math.PI/2;return pv});
      w.children[0].children[1].material.color.set(ec||'#ffffff');if(this.post)w.children[0].children[0].material.color.set(ec||'#ffffff').lerp(this.col.set('#ffffff'),.6).multiplyScalar(2);
      w.position.set(p.x,y-6,p.y);w.rotation.set(0,ang+Math.PI/2,0);w.scale.setScalar(p.r||56);
      for(let i=0;i<3;i++){const s=rand(-1,1);this.sp(true,{x:p.x+Math.cos(ang)*s*p.r*.8,y:y+rand(-10,24),z:p.y-Math.sin(ang)*s*p.r*.8,vy:rand(20,80),l:.5,s:p.el==='fire'?28:18,s1:4,c:ec,c2:p.el==='fire'?'#ff3a10':undefined,sp:p.el==='fire'?3:p.el==='frost'?4:7})}
      if(p.el==='storm'&&Math.random()<.4)this.bolt(p.x,y,p.y,p.x+rand(-60,60),y+rand(-30,30),p.y+rand(-60,60),'#c8b4ff',.07,2);
      if(Math.random()<.3)this.decal({x:p.x,y:p.y,r:p.r*.7,c:ec,life:.8,tex:p.el==='fire'?'scorch':'shock',a:.45,fade:.9,normal:p.el==='fire'?1:0});return}
    if(p.kind===13){const a=this.get('earrow',()=>{const g=new THREE.Group();const s=this.mesh(G.cyl,this.std('#e8dcc0',.6,0),0,0,0,1.4,36,1.4,g);s.rotation.x=Math.PI/2;
        const tp=this.mesh(G.cone4,this.bas('#ffffff'),0,0,20,3.4,9,3.4,g);tp.rotation.x=Math.PI/2;const gl=this.mesh(G.sph,this.glowM('#ffffff',.6),0,0,16,6,6,10,g);gl.userData.ownMat=1;gl.material=gl.material.clone();g.userData.gl=gl;return g});
      a.userData.gl.material.color.set(ec||'#ffffff');a.position.set(p.x,y,p.y);a.rotation.y=ang;
      this.sp(true,{x:p.x,y,z:p.y,l:.3,s:14,s1:3,c:ec,c2:p.el==='fire'?'#ff3a10':undefined,sp:p.el==='fire'?3:1,a:.85});if(p.el==='storm'&&Math.random()<.25)this.bolt(p.x,y,p.y,p.x+rand(-30,30),y+rand(-14,14),p.y+rand(-30,30),'#c8b4ff',.05,1.4);return}
    if(p.kind===14){const d=this.get('dragonP',()=>{const g=new THREE.Group();this.mesh(G.sph,this.glowM('#ff8a2a',.85),0,0,0,1,1,1.5,g);this.mesh(G.sph,this.bas('#fff2c8'),0,0,.2,.45,.45,.7,g);
        for(const s of[-1,1]){const h=this.mesh(G.cone,this.std('#5a2a18',.6,0,{emissive:'#ff4a10',emissiveIntensity:.8}),s*.45,.45,-.4,.12,.8,.12,g);h.rotation.x=-1.9;h.rotation.z=s*.35}
        for(const s of[-1,1])this.mesh(G.sph,this.glowM('#ffee6a',1),s*.3,.25,.95,.1,.1,.1,g);return g});
      d.position.set(p.x,y+6,p.y);d.rotation.y=ang;d.scale.setScalar((p.r||46)*(1+Math.sin(T*24)*.06));
      for(let i=0;i<4;i++)this.sp(true,{x:p.x+rand(-14,14),y:y+rand(-12,12),z:p.y+rand(-14,14),vx:rand(-60,60),vy:rand(20,90),vz:rand(-60,60),l:.6,s:rand(40,70),s1:8,c:'#ffd070',c2:'#ff2a00',sp:3,dr:1});
      if(Math.random()<.6)this.sp(false,{x:p.x,y:y+10,z:p.y,vy:50,l:1.1,s:40,s1:110,c:'#3a2a26',a:.4,sp:2});
      if(Math.random()<.5)this.decal({x:p.x,y:p.y,r:50,c:'#ffffff',life:3,tex:'scorch',normal:1,a:.6,fade:.6});this.flashT=(this.flashT||0)-.016;if(this.flashT<=0){this.flashT=.12;this.flash(p.x,y+40,p.y,'#ff7a2a',2400,500,.14)}return}
    if(p.kind===15){const o=this.get('eorb',()=>{const g=new THREE.Group();const m=this.mesh(G.sph,this.glowM('#ffffff',.9),0,0,0,1,1,1,g);m.material=m.material.clone();m.userData.ownMat=1;g.userData.m=m;
        this.mesh(G.sph,this.bas('#ffffff'),0,0,0,.5,.5,.5,g);for(const r of[0,1.2]){const t=this.mesh(G.torus,this.glowM('#ffffff',.5),0,0,0,1.5,1.5,1.5,g);t.rotation.set(r,r*.7,0)}return g});
      o.userData.m.material.color.set(ec||'#ffffff');o.position.set(p.x,y,p.y);o.rotation.set(T*5,T*3,0);o.scale.setScalar((p.r||16)*(1+Math.sin(T*30)*.1));
      for(let i=0;i<2;i++)this.sp(true,{x:p.x+rand(-6,6),y:y+rand(-6,6),z:p.y+rand(-6,6),vx:rand(-40,40),vy:rand(10,60),vz:rand(-40,40),l:.4,s:p.el==='fire'?30:16,s1:4,c:ec,c2:p.el==='fire'?'#ff3a10':undefined,sp:p.el==='fire'?3:p.el==='frost'?4:7});
      if(p.el==='storm'&&Math.random()<.4)this.bolt(p.x,y,p.y,p.x+rand(-40,40),y+rand(-20,20),p.y+rand(-40,40),'#b9a6ff',.06,1.6);return}},
  // the soul storm: ghost wisps circling at the spear's reach
  spiritAoe(a,T,dt){const gy=this.gY(a.x,a.y);this.decal({x:a.x,y:a.y,r:a.r,c:'#7ff0d8',life:.05,tex:'rune',a:.42+.15*Math.sin(T*10)});
    for(let i=0;i<Math.ceil(dt*40);i++){const an=Math.random()*6.283,r=a.r*rand(.55,1);this.sp(true,{x:a.x+Math.cos(an)*r,y:gy+rand(20,90),z:a.y+Math.sin(an)*r,vx:-Math.sin(an)*420,vz:Math.cos(an)*420,vy:rand(10,40),l:.5,s:rand(16,30),s1:4,c:Math.random()<.5?'#7ff0d8':'#e0fff8',sp:1,dr:1.2})}
    a.fl=(a.fl||0)-dt;if(a.fl<=0){a.fl=.25;this.flash(a.x,gy+80,a.y,'#5affd0',1600,a.r*2.2,.22)}}
});
// hook into the earlier layers
(()=>{const P=R3,_w=P.weapon,_arm=P.arm,_pn=P.projNew,_isN=P.isNewAoe,_an=P.aoeNew,_fx2=P.fx2,_ex=P.fxExtra;
  P.weapon=function(wk,tier){const F=FUSED[wk];if(!F)return _w.call(this,wk,tier);return this.fusedWeapon(wk,tier,F,(k,t)=>_w.call(this,k,t))};
  P.arm=function(o,u){_arm.call(this,o,u);const F=u.wk&&FUSED[u.wk];if(!F||!o.arms)return;const Lh=o.arms[1].hand;
    if(F.arch==='MM'||F.arch==='RR'){const w=this.weapon(u.wk,u.wt);w.rotation.set(Math.PI/2,0,0);w.position.set(0,-1.5,2.2);Lh.add(w);o.wpnL=w}};
  P.projNew=function(p,y,ang,T){if(p.kind>=11)return this.projF(p,y,ang,T);return _pn.call(this,p,y,ang,T)};
  P.isNewAoe=function(k){return k==='spirit'||_isN.call(this,k)};
  P.aoeNew=function(a,T,dt){if(a.kind==='spirit')return this.spiritAoe(a,T,dt);return _an.call(this,a,T,dt)};
  P.fx2=function(e){_fx2.call(this,e);try{this.fx3(e)}catch(err){}};
  P.fxExtra=function(T,dt,me,L){_ex.call(this,T,dt,me,L);this.stepFusings(dt)}})();
