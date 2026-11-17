// ===================== 3D: characters, equipment, effects, frame =====================
const SKIN=['#f0c8a8','#dcaa82','#b07a52','#7a4e32'],HAIR=['#2a1a10','#5a3a1a','#a86a2a','#d8b060','#1c1c1c','#8a2a1a'];
Object.assign(R3,{
  // ---------- equipment models ----------
  metalFor(t){return t>=4?this.std('#ff8ab8',.18,.95,{emissive:'#ff1a6a',emissiveIntensity:.7}):t>=3?this.std('#ffd36a',.28,.95,{emissive:'#a86a10',emissiveIntensity:.35}):t===2?this.std('#c8b8ff',.22,.9,{emissive:'#6a3ad8',emissiveIntensity:.45}):t===1?this.std('#dfe6f0',.25,.9):this.std('#b8bcc4',.42,.8)},
  shape(pts){const s=new THREE.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));return s},
  extr(key,pts,depth,bevel){let g=this.geoC.get('E'+key);if(!g){g=new THREE.ExtrudeGeometry(this.shape(pts),{depth,bevelEnabled:!!bevel,bevelThickness:bevel||0,bevelSize:bevel||0,bevelSegments:1});g.translate(0,0,-depth/2);g.computeVertexNormals();this.geoC.set('E'+key,g);this.cachedGeos.add(g)}return g},
  weapon(wk,tier){const G=this.G,g=new THREE.Group(),c=TIERS[Math.max(0,tier)].c,M=this.metalFor(tier),gold=this.std('#d8a840',.3,.95),wood=this.tstd('bark','#8a6040',.85,0),grip=this.tstd('leather','#5a3424',.8,0);g.userData.glow=tier>=2?c:null;
    if(wk==='sword'){this.mesh(this.cylg(1.6,1.8,11),grip,0,-5,0,1,1,1,g);this.mesh(G.sph,gold,0,-11.5,0,2.6,2.6,2.6,g);this.mesh(G.box,gold,0,1.6,0,15+tier*1.5,2.8,3.6,g,true);
      const L=36+tier*3;this.mesh(this.extr('blade'+tier,[[-2.6,0],[2.6,0],[2.2,L-7],[0,L],[-2.2,L-7]],1.3,.3),M,0,3,0,1,1,1,g,true);if(tier>=2)this.mesh(G.box,this.glowM(c,.7),0,3+L*.45,0,.9,L*.75,1.8,g)}
    else if(wk==='axe'){this.mesh(this.cylg(1.7,2,74),wood,0,22,0,1,1,1,g,true);this.mesh(this.cylg(2.2,2.2,6),grip,0,2,0,1,1,1,g);
      const hd=new THREE.Group();hd.position.y=52;g.add(hd);const bl=this.extr('axe'+(tier>1?2:0),[[0,-7],[9,-12],[20,-17],[26,-8],[27,0],[26,8],[20,17],[9,12],[0,7]],2.4,.4);
      this.mesh(bl,M,1.5,0,0,1,1,1,hd,true);if(tier>=1){const b2=this.mesh(bl,M,-1.5,0,0,1,1,1,hd,true);b2.rotation.y=Math.PI}this.mesh(this.cylg(3.2,3.2,12,8),gold,0,0,0,1,1,1,hd,true);
      if(tier>=2)this.mesh(G.box,this.glowM(c,.75),14,0,0,10,1.2,3,hd)}
    else if(wk==='dagger'){this.mesh(this.cylg(1.3,1.5,8),grip,0,-3,0,1,1,1,g);this.mesh(G.box,gold,0,1.4,0,8,2,2.4,g);this.mesh(this.extr('dag'+tier,[[-1.8,0],[1.8,0],[2.6,10],[1.6,18+tier*1.5],[0,22+tier*1.5],[-1,14]],1,.2),M,0,2,0,1,1,1,g,true);
      if(tier>=2)this.mesh(G.box,this.glowM(c,.7),0,11,0,.8,14,1.4,g)}
    else if(wk==='bow'){const bc=tier>=3?'#c8e078':tier===2?'#f0ecff':tier===1?'#c8ccd8':'#7a5032';const bm=tier>=1?this.std(bc,.35,tier>=2?.4:.6,tier>=2?{emissive:c,emissiveIntensity:.3}:undefined):wood;
      const crv=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,-34,0),new THREE.Vector3(0,0,-13),new THREE.Vector3(0,34,0));this.mesh(new THREE.TubeGeometry(crv,16,1.5,6),bm,0,0,0,1,1,1,g,true).userData.ownMat=0;
      this.mesh(G.cyl,this.bas('#f0ecd8'),0,0,.4,.35,68,.35,g);this.mesh(this.cylg(2,2,10),grip,0,0,-5.6,1,1,1,g);if(tier>=2)for(const s of[-1,1])this.mesh(G.oct,this.glowM(c,.8),0,s*30,-5,2.5,4,2.5,g)}
    else if(wk==='fire'||wk==='frost'){const fire=wk==='fire';const sm=fire?wood:this.std(tier>=2?'#e8f4ff':'#c0d0dc',.35,.4);this.mesh(this.cylg(1.5,2.2,92),sm,0,30,0,1,1,1,g,true);this.mesh(this.cylg(2.5,2.5,8),grip,0,8,0,1,1,1,g);
      const hd=new THREE.Group();hd.position.y=78;g.add(hd);g.userData.tip=hd;
      if(fire){for(let k=0;k<4;k++){const cl=this.mesh(G.cone,gold,Math.cos(k*1.57)*4,2,Math.sin(k*1.57)*4,1.4,12,1.4,hd);cl.rotation.z=-Math.cos(k*1.57)*.45;cl.rotation.x=Math.sin(k*1.57)*.45}
        this.mesh(G.sph,this.std('#ffb040',.2,0,{emissive:tier>=2?'#ff6a10':'#e85010',emissiveIntensity:1.6}),0,8,0,5.5+tier*.6,5.5+tier*.6,5.5+tier*.6,hd);g.userData.glow=tier>=1?'#ff8a2a':null}
      else{for(let k=0;k<5;k++){const cr=this.mesh(G.oct,this.std('#bff0ff',.05,.2,{emissive:'#4ab8ff',emissiveIntensity:.9,transparent:true,opacity:.92}),Math.cos(k*1.26)*3.5,6+k%2*3,Math.sin(k*1.26)*3.5,2.5,8+tier,2.5,hd);cr.rotation.z=Math.cos(k*1.26)*.4;cr.rotation.x=Math.sin(k*1.26)*.4}
        this.mesh(G.oct,this.std('#e8fbff',.05,.2,{emissive:'#7ad8ff',emissiveIntensity:1.2}),0,10,0,3.5,10+tier,3.5,hd);g.userData.glow=tier>=1?'#7fdcff':null}}
    else if(wk==='gsword'){this.mesh(this.cylg(1.8,2,20),grip,0,-9,0,1,1,1,g);this.mesh(G.sph,gold,0,-20,0,3,3,3,g);this.mesh(G.box,gold,0,1.8,0,24+tier*2,3.4,4.4,g,true);
      const L=60+tier*4;this.mesh(this.extr('gsw'+tier,[[-4,0],[4,0],[3.6,L-12],[0,L],[-3.6,L-12]],1.8,.4),M,0,3.5,0,1,1,1,g,true);this.mesh(G.box,this.std('#3a3a44',.5,.5),0,3.5+L*.4,0,1.4,L*.62,2.2,g);if(tier>=2)this.mesh(G.box,this.glowM(c,.75),0,3.5+L*.45,0,1.1,L*.78,2.6,g)}
    else if(wk==='xbow'){this.mesh(G.box,wood,0,8,0,5,48,6,g,true);this.mesh(G.box,grip,0,-12,2,4.6,12,7,g);this.mesh(G.box,M,0,20,-2.8,2,26,1.6,g);
      const bc=tier>=2?this.std('#e8eef8',.3,.7,{emissive:c,emissiveIntensity:.35}):M;const crv=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-26,24,0),new THREE.Vector3(0,34,0),new THREE.Vector3(26,24,0));
      this.mesh(new THREE.TubeGeometry(crv,14,1.7,6),bc,0,6,0,1,1,1,g,true).userData.ownMat=0;this.mesh(G.box,this.bas('#f0ecd8'),0,30,0,52,.6,.6,g);this.mesh(G.cyl,this.std('#c8b090',.6,0),0,22,-4.6,.9,22,.9,g);if(tier>=2)this.mesh(G.oct,this.glowM(c,.8),0,34,-4.6,2.4,4,2.4,g)}
    else if(wk==='storm'){this.mesh(this.cylg(1.4,2,92),this.std('#5a5470',.4,.6),0,30,0,1,1,1,g,true);this.mesh(this.cylg(2.5,2.5,8),grip,0,8,0,1,1,1,g);
      const hd=new THREE.Group();hd.position.y=80;g.add(hd);g.userData.tip=hd;for(const r of[0,1.1])this.mesh(new THREE.TorusGeometry(7,.8,6,18),gold,0,6,0,1,1,1,hd).rotation.set(r,r*.6,0);
      this.mesh(G.sph,this.std('#d8ccff',.15,0,{emissive:'#8a6aff',emissiveIntensity:1.5}),0,6,0,4.6+tier*.5,4.6+tier*.5,4.6+tier*.5,hd);g.userData.glow=tier>=1?'#b9a6ff':null}
    else{this.mesh(G.sph,this.std('#e8c0a0',.6,0),0,0,0,4,4,4,g)}
    return g},
  shield(tier,look){const g=new THREE.Group(),G=this.G;
    if(tier<=0){this.mesh(this.cylg(15,15,3,20),this.tstd('planks','#a07850',.85,0),0,0,0,1,1,1,g,true).rotation.x=Math.PI/2;const rim=this.mesh(G.torus,this.std('#6a6a70',.45,.8),0,0,0,15,15,15,g);this.mesh(G.half,this.std('#8a8a90',.4,.8),0,0,1.5,4,4,3,g).rotation.x=Math.PI/2}
    else{const sh=this.extr('kite',[[-14,10],[14,10],[13,-6],[0,-22],[-13,-6]],3,1.2);this.mesh(sh,this.std(LOOKS[look].c,.55,.2),0,0,0,1,1,1,g,true);this.mesh(sh,this.metalFor(tier),0,0,-.6,1.1,1.1,1,g);
      this.mesh(G.oct,tier>=3?this.std('#ffe080',.2,1,{emissive:'#a86a10',emissiveIntensity:.5}):this.std('#e8e0d0',.4,.6),0,-1,2.2,4,6,1.4,g)}
    return g},
  // ---------- humanoid rig ----------
  humanoid(o,m){const G=this.G;const root=o.root=new THREE.Group(),body=o.body=new THREE.Group();root.add(body);
    const hips=new THREE.Group();hips.position.y=48;body.add(hips);o.hips=hips;o.legs=[];
    for(const s of[-1,1]){const hip=new THREE.Group();hip.position.set(s*6.2,0,0);hips.add(hip);this.mesh(this.cap(5.6,13),m.leg,0,-10,0,1,1,1,hip,true);
      const knee=new THREE.Group();knee.position.y=-21;hip.add(knee);this.mesh(this.cap(4.7,13),m.leg2||m.leg,0,-10,0,1,1,1,knee,true);
      const ft=this.mesh(this.cap(4.4,8),m.boot,0,-21.2,2.6,1,1,1,knee,true);ft.rotation.x=Math.PI/2;o.legs.push({hip,knee})}
    const torso=new THREE.Group();torso.position.y=47;body.add(torso);o.torso=torso;
    o.chestM=this.mesh(this.lathe('chest',[[0,0],[10.4,0],[11.4,7],[12.8,17],[13.4,23],[12,28.5],[6,32],[0,32]],16),m.shirt,0,0,0,1,1,.78,torso,true);
    this.mesh(this.cylg(3.6,4.4,8),m.skin,0,33.5,0,1,1,1,torso,true);
    o.arms=[];for(const s of[-1,1]){const sh=new THREE.Group();sh.position.set(s*14.6,27.5,0);torso.add(sh);this.mesh(this.cap(4.3,11),m.sleeve||m.shirt,0,-8,0,1,1,1,sh,true);
      const el=new THREE.Group();el.position.y=-17.5;sh.add(el);this.mesh(this.cap(3.8,10),m.fore||m.skin,0,-7.5,0,1,1,1,el,true);
      const hand=new THREE.Group();hand.position.y=-16.2;el.add(hand);this.mesh(G.sph,m.skin,0,0,0,3.9,4.4,3.6,hand,true);o.arms.push({sh,el,hand,s})}
    const head=new THREE.Group();head.position.y=42.5;torso.add(head);o.head=head;o.headM=this.mesh(G.sph,m.skin,0,0,0,8,8.8,8.4,head,true);
    return o},
  face(o,eyeC){const G=this.G,H=o.head,e=this.bas(eyeC||'#1a1410');for(const s of[-1,1]){this.mesh(G.sph,e,s*3,1,7.3,1.15,1.35,.8,H);this.mesh(G.box,this.bas('#3a2418'),s*3,3.6,7.4,3.4,.9,.8,H)}
    this.mesh(G.cone,o.skinMat,0,-.8,8.6,1.3,3.6,1.3,H).rotation.x=Math.PI/2},
  hero(u){const id=u.id;const o={kind:'hero',u,armorParts:[],at:-9,wk:'?',wt:-9};const skin=this.std(SKIN[id*3%4],.6,0);o.skinMat=skin;
    this.humanoid(o,{leg:this.tstd('fabric','#5a4a3a',.95,0),boot:this.tstd('leather','#3a2618',.8,0),shirt:this.tstd('fabric','#d8cdb0',.95,0),skin,fore:skin});
    this.face(o);const H=o.head,hc=this.std(HAIR[id*7%6],.75,0),st=id%3;const hair=o.hair=new THREE.Group();H.add(hair);
    this.mesh(G_half(this),hc,0,1.2,-.6,8.9,7.6,9.2,hair,true);this.mesh(this.G.box,hc,0,4.6,6.2,12,3.5,3,hair);
    if(st===1)this.mesh(this.G.box,hc,0,-5,-6,14,14,3.5,hair,true);else if(st===2){const p=this.mesh(this.cap(2.6,12),hc,0,-3,-10,1,1,1,hair,true);p.rotation.x=.5}
    const cape=o.cape=new THREE.Group();cape.position.set(0,30.5,-9.5);o.torso.add(cape);o.capeM=this.mesh(this.G.cape,this.tstd('fabric',LOOKS[u.look].c,.9,0,{side:THREE.DoubleSide}),0,0,0,25,50,1,cape,true);
    o.root.scale.setScalar(1.06);return o},
  dress(o,at,look){for(const m of o.armorParts)m.parent&&m.parent.remove(m);o.armorParts=[];const G=this.G,T=o.torso,H=o.head;const P=(m)=>{o.armorParts.push(m);return m};
    const shell=(mat,sc,y)=>P(this.mesh(this.lathe('shell',[[0,-1],[11.6,-1],[12.6,7],[14.2,17],[14.6,23],[13.2,29],[6.6,33],[0,33]],16),mat,0,y||0,0,sc||1,sc||1,(sc||1)*.82,T,true));
    const onArms=(fn)=>{for(const a of o.arms)fn(a)};const onLegs=(fn)=>{for(const l of o.legs)fn(l)};
    o.hair.visible=true;
    if(at<0){P(this.mesh(G.torus,this.tstd('leather','#5a3a22',.8,0),0,3,0,11.2,11.2,9,T)).rotation.x=Math.PI/2;return}
    const belt=(c)=>{P(this.mesh(G.torus,this.tstd('leather',c||'#4a2e1a',.8,0),0,3,0,11.8,11.8,9.6,T)).rotation.x=Math.PI/2;P(this.mesh(G.box,this.std('#d8a840',.3,.9),0,3,10.4,4,3.4,1.4,T))};
    const tabard=(c)=>{const m=this.tstd('fabric',c,.9,0,{side:THREE.DoubleSide});P(this.mesh(G.cape,m,0,4,11.6,14,26,1,T,true));const b=P(this.mesh(G.cape,m,0,4,-10.8,14,24,1,T,true));};
    if(at===0){shell(this.tstd('fabric','#8a7a58',.95,0),1.0);belt();onArms(a=>P(this.mesh(this.cap(4.9,8),this.tstd('fabric','#8a7a58',.95,0),0,-6,0,1,1,1,a.sh,true)));
      const hd=P(this.mesh(G.hood,this.tstd('fabric','#6a5a40',.95,0,{side:THREE.DoubleSide}),0,1.4,-.8,10,10.6,10.8,H,true));o.hair.visible=false;return}
    if(at===1){const lt=this.tstd('leather','#8a5a34',.75,0);shell(lt,1.02);belt('#3a2414');onArms(a=>{P(this.mesh(G.half,lt,0,-1,0,6.4,5,6.4,a.sh,true));P(this.mesh(this.cylg(4.6,4.2,10),lt,0,-9,0,1,1,1,a.el,true))});
      onLegs(l=>P(this.mesh(this.cylg(5.4,5,10),lt,0,-17,0,1,1,1,l.knee,true)));return}
    const plate=at>=3,dragon=at===4;
    if(at===2){const ch=this.tstd('chain','#a8b0bc',.45,.7);shell(ch,1.03);onArms(a=>P(this.mesh(this.cap(5,9),ch,0,-6,0,1,1,1,a.sh,true)));P(this.mesh(this.cylg(12,14.5,16,16,true),ch,0,-6,0,1,1,.85,T,true));
      tabard(LOOKS[look].c);belt();P(this.mesh(G.hood,ch,0,1.2,-.6,9.8,10.4,10.6,H,true));o.hair.visible=false;
      onArms(a=>P(this.mesh(this.cylg(4.4,4,9),this.tstd('leather','#5a3a22',.8,0),0,-9,0,1,1,1,a.el,true)));return}
    const M=dragon?this.tstd('scales','#7a2a1c',.35,.75,{emissive:'#3a0800',emissiveIntensity:.4}):this.tstd('metal','#d8dde6',.28,.9),trim=dragon?this.std('#e0a840',.25,1):this.std('#b89a50',.3,.95);
    shell(M,1.05);P(this.mesh(G.torus,trim,0,30,0,10,10,8.5,T)).rotation.x=Math.PI/2;
    if(!dragon)tabard(LOOKS[look].c);belt(dragon?'#2a1010':'#4a2e1a');
    onArms(a=>{const pd=P(this.mesh(G.half,M,a.s*1.5,1,0,8.6,7.2,8.8,a.sh,true));P(this.mesh(G.torus,trim,a.s*1.5,-.2,0,8.4,8.4,8.4,a.sh)).rotation.x=Math.PI/2;
      P(this.mesh(this.cylg(4.8,4.4,11),M,0,-9,0,1,1,1,a.el,true));P(this.mesh(G.sph,M,0,0,0,4.6,5,4.4,a.hand,true));
      if(dragon){for(let k=0;k<2;k++){const sp=P(this.mesh(G.cone,trim,a.s*(3+k*3),6-k,-1,1.6,7,1.6,a.sh));sp.rotation.z=-a.s*.6}}});
    onLegs(l=>{P(this.mesh(this.cylg(6.2,5.6,14),M,0,-9,0,1,1,1,l.hip,true));P(this.mesh(this.cylg(5.4,5,15),M,0,-10,0,1,1,1,l.knee,true));P(this.mesh(G.sph,M,0,-1,2.5,4.5,4,3,l.knee,true))});
    P(this.mesh(this.cylg(12.5,15.5,12,16,true),M,0,-4,0,1,1,.85,T,true));
    const hm=P(this.mesh(G.sph,M,0,1.5,-.2,9.6,10,9.8,H,true));P(this.mesh(G.box,this.bas('#0a0806'),0,1.4,9.2,11,1.6,.8,H));P(this.mesh(G.box,trim,0,6,8,2,7,3,H));
    o.hair.visible=false;
    if(dragon){for(const s of[-1,1]){const h1=P(this.mesh(G.cone,this.std('#e8dcc0',.6,0),s*8,9,-1,2.4,14,2.4,H,true));h1.rotation.z=-s*.9;h1.rotation.x=-.5}
      for(const s of[-1,1])P(this.mesh(G.box,this.glowM('#ff7a1a',.9),s*3,1.4,9.7,3,1,.5,H));P(this.mesh(G.box,this.glowM('#ff6a10',.7),0,14,12.3,1.2,10,.6,T))}
    else{const pl=P(this.mesh(this.cylg(1.4,4,16),this.std(LOOKS[look].c,.8,0),0,11,-2,1,1,1,H,true));pl.rotation.x=-.75}},
  arm(o,u){if(o.wpnR){o.wpnR.parent.remove(o.wpnR);o.wpnR=null}if(o.wpnL){o.wpnL.parent.remove(o.wpnL);o.wpnL=null}if(o.quiver){o.quiver.parent.remove(o.quiver);o.quiver=null}
    const wk=u.wk,t=u.wt,R=o.arms[0].hand,Lh=o.arms[1].hand;o.style=wk||'fist';
    if(!wk)return;
    const w=this.weapon(wk,t);o.wpnR=w;o.wtip=w.userData.tip||null;o.wglow=w.userData.glow;
    if(wk==='bow'){w.rotation.set(Math.PI/2,0,0);w.position.set(0,-1,1.5);Lh.add(w);o.wpnL=w;o.wpnR=null;
      const q=o.quiver=new THREE.Group();q.position.set(5,20,-11);q.rotation.z=-.35;o.torso.add(q);this.mesh(this.cylg(4,4.6,24),this.tstd('leather','#6a4228',.8,0),0,0,0,1,1,1,q,true);
      for(let k=0;k<4;k++){this.mesh(this.G.cyl,this.std('#e8dcc0',.8,0),-2+k*1.4,14,(k%2)*1.5-.7,.5,8,.5,q);this.mesh(this.G.box,this.bas(k%2?'#c83a3a':'#f0f0f0'),-2+k*1.4,18,(k%2)*1.5-.7,1.6,3.4,.4,q)}}
    else{w.rotation.set(Math.PI/2,0,0);w.position.set(0,-1.5,2.2);R.add(w)}
    if(wk==='sword'){const s=this.shield(t,u.look);s.position.set(4.5,-2,3.5);s.rotation.set(0,Math.PI/2+.1,0);s.scale.setScalar(t<=0?1:1.05);Lh.add(s);o.wpnL=s}
    if(wk==='dagger'){const d=this.weapon('dagger',t);d.rotation.set(Math.PI/2,0,0);d.position.set(0,-1.5,2.2);Lh.add(d);o.wpnL=d}},
  // ---------- creeps (v1.1: meaner silhouettes, glowing eyes that turn blood-red at night) ----------
  eyes(o,list){o.eyes=(o.eyes||[]).concat(list)},
  goblin(u){const o={kind:'hero',style:u.id%2?'club':'spear'};const sk=this.tstd('scales','#5f8c34',.75,0);o.skinMat=sk;const G=this.G;
    this.humanoid(o,{leg:sk,boot:this.tstd('leather','#2e2014',.85,0),shirt:this.tstd('leather','#5a3c22',.9,0),skin:sk,fore:sk});
    o.root.scale.setScalar(.74);o.baseLean=.24;const H=o.head;H.scale.setScalar(1.28);
    // heavy brow, hooked nose, fangs, long torn ears, war paint
    this.mesh(G.box,sk,0,3.4,6.6,13,2.6,4,H);const ey=[];for(const s2 of[-1,1]){ey.push(this.mesh(G.sph,this.glowM('#ffcc22',1),s2*3.2,1.3,7.6,1.4,1.1,.7,H));
      const e=this.mesh(G.cone,sk,s2*11.5,3.5,-1,2.6,17,1.6,H);e.rotation.z=s2*1.25;e.rotation.y=s2*-.25;this.mesh(G.box,this.bas('#a8241a'),s2*4.2,-1.5,7.4,1.2,4.5,.5,H)}
    this.eyes(o,ey);this.mesh(G.cone,sk,0,-.5,10.2,2,7,2,H).rotation.x=Math.PI/2+.35;
    for(const s2 of[-1,1]){const f=this.mesh(G.cone,this.std('#f0e8d0',.5,0),s2*2.6,-4.6,7.6,.8,3,.8,H);f.rotation.x=Math.PI}
    // crude horned iron cap + spiked pauldron
    const iron=this.tstd('metal','#7a7670',.5,.7);this.mesh(G.half,iron,0,2.4,-.4,9,6,9.4,H,true);for(const s2 of[-1,1]){const h=this.mesh(G.cone,this.std('#e8dcc0',.6,0),s2*7,8,-1,1.8,9,1.8,H);h.rotation.z=-s2*.7}
    const pa=this.mesh(G.half,iron,0,1,0,7.4,5.4,7.4,o.arms[1].sh,true);for(let k=0;k<3;k++){const c=this.mesh(G.cone,iron,-2+k*2,5.5,0,1.3,6,1.3,o.arms[1].sh);c.rotation.z=.3}
    this.mesh(G.sph,this.std('#e8e0cc',.6,0),0,3,10.6,2.6,2.6,2,o.torso);   // skull buckle
    const wp=new THREE.Group();o.arms[0].hand.add(wp);wp.rotation.x=Math.PI/2;
    if(o.style==='spear'){this.mesh(this.G.cyl,this.tstd('bark','#5b3a22',.9,0),0,10,0,1.3,52,1.3,wp,true);this.mesh(this.G.cone4,this.std('#9aa0a8',.35,.8),0,40,0,3.2,13,3.2,wp,true);this.mesh(G.box,this.bas('#8a1a12'),0,33,0,4,2,4,wp)}
    else{this.mesh(this.cylg(1.6,2,14),this.tstd('leather','#3a2414',.8,0),0,2,0,1,1,1,wp);this.mesh(this.extr('cleaver',[[-1,0],[9,2],[11,16],[6,24],[8,30],[-1,30]],1.6,.3),this.std('#8a8a90',.4,.8),0,8,0,1,1,1,wp,true)}
    return o},
  troll(u){const o={kind:'hero',style:'club'};const sk=this.tstd('rock','#6c7c8a',.9,0);o.skinMat=sk;const G=this.G;this.humanoid(o,{leg:sk,boot:sk,shirt:sk,skin:sk,fore:sk});o.root.scale.setScalar(1.5);o.baseLean=.34;
    o.chestM.scale.set(1.42,1.12,1.16);this.mesh(this.cylg(12,15,12),this.tstd('leather','#4a2e1a',.9,0),0,2,0,1,1,1,o.torso,true);const H=o.head;H.position.y=37;H.position.z=6;
    this.mesh(G.box,sk,0,3.6,6.8,14,3.2,4,H);const ey=[];for(const s2 of[-1,1])ey.push(this.mesh(G.sph,this.glowM('#ff7a1a',1),s2*3.3,1.4,7.4,1.3,1,.7,H));this.eyes(o,ey);
    this.mesh(G.box,sk,0,-4,6.4,11,4.5,6,H,true);   // big underbite jaw
    for(const s2 of[-1,1]){const t=this.mesh(G.cone,this.std('#f2ead4',.5,0),s2*4,-1,9.2,1.6,7.5,1.6,H);t.rotation.x=-.15;t.rotation.z=s2*.18;
      const h=this.mesh(G.cone,this.std('#d8ccb0',.6,0),s2*7,8,-3,2.6,16,2.6,H,true);h.rotation.z=-s2*1.0;h.rotation.x=-.5}
    for(const a of o.arms){a.sh.scale.set(1.35,1.4,1.35);const pd=this.mesh(G.half,this.tstd('metal','#5a5a62',.45,.75),a.s*1.5,1,0,8.4,6.4,8.6,a.sh,true);for(let k=0;k<3;k++){const c=this.mesh(G.cone,this.std('#c8c0b0',.5,.3),a.s*(1+k*2.4),6.5-k*.6,0,1.5,7,1.5,a.sh);c.rotation.z=-a.s*.5}}
    for(let k=0;k<7;k++){const a=-1.2+k*.4;this.mesh(G.cone,this.std('#ece2c8',.6,0),Math.sin(a)*12,29,Math.cos(a)*9.5,1.1,4.5,1.1,o.torso).rotation.x=Math.PI}   // fang necklace
    for(let k=0;k<5;k++)this.mesh(G.half,this.std('#4a6a2a',.95,0),(k-2)*5,22+((k*7)%4),-11,4,3,3,o.torso);   // moss on the back
    const cl=new THREE.Group();o.arms[0].hand.add(cl);cl.rotation.x=Math.PI/2;this.mesh(this.cylg(3,8.5,50),this.tstd('bark','#5b3a22',.9,0),0,24,0,1,1,1,cl,true);
    for(const y of[30,40])this.mesh(this.cylg(8.6,8.8,2.4),this.tstd('metal','#6a6a70',.4,.8),0,y,0,1,1,1,cl);
    for(let k=0;k<7;k++){const s2=this.mesh(G.cone,this.std('#d8d0c0',.6,0),Math.cos(k*.9)*8,36+(k%3)*4,Math.sin(k*.9)*8,1.7,6,1.7,cl);s2.rotation.z=Math.cos(k*.9)*-1.5;s2.rotation.x=Math.sin(k*.9)*1.5}return o},
  wolf(u){const G=this.G,fur=this.tstd('fabric','#7a808a',.95,0),dfur=this.tstd('fabric','#3a3e48',.95,0),lf=this.tstd('fabric','#c8ccd2',.95,0),fang=this.std('#f4efe0',.4,0);
    const root=new THREE.Group(),body=new THREE.Group();root.add(body);const R={root,body,kind:'wolf',legs:[]};root.scale.setScalar(1.12);
    const tb=this.mesh(this.cap(10.5,25),fur,0,28,0,1,1,1,body,true);tb.rotation.x=Math.PI/2;this.mesh(G.sph,fur,0,32,10,13.5,12.5,12.5,body,true);this.mesh(G.sph,lf,0,25,12,9,8,9,body,true);
    // hackles: a ridge of spiky fur from the neck down the spine
    for(let k=0;k<9;k++){const z=16-k*4,y=40-Math.abs(k-2)*.9;const c=this.mesh(G.cone,dfur,0,y,z,2.6-k*.15,9-k*.5,2.6-k*.15,body);c.rotation.x=-.9}
    for(let k=0;k<8;k++){const a=k/8*Math.PI*2;const c=this.mesh(G.cone,fur,Math.cos(a)*10,32+Math.sin(a)*8,16,2.4,8,2.4,body);c.rotation.z=-Math.cos(a)*.9;c.rotation.x=-Math.sin(a)*.6-.5}
    const head=new THREE.Group();head.position.set(0,36,24);body.add(head);R.head=head;this.mesh(G.sph,fur,0,0,0,8.4,7.6,9,head,true);this.mesh(this.cylg(3.2,4.8,13,8),dfur,0,-1,9,1,1,1,head,true).rotation.x=Math.PI/2;this.mesh(G.sph,this.bas('#0c0c0c'),0,0,15.6,1.9,1.6,1.6,head);
    const jaw=new THREE.Group();jaw.position.set(0,-3.4,4);head.add(jaw);R.jaw=jaw;this.mesh(G.box,dfur,0,-1,6.5,5.4,2,11,jaw,true);
    for(const s2 of[-1,1]){this.mesh(G.cone,fang,s2*2.2,-3.2,13.2,.7,3.4,.7,head).rotation.x=Math.PI;this.mesh(G.cone,fang,s2*2,.6,10.5,.6,2.6,.6,jaw);
      const e=this.mesh(G.cone,dfur,s2*4.6,8,-1,2.6,7.5,2,head);e.rotation.z=-s2*.3;e.rotation.x=-.2}
    const ey=[];for(const s2 of[-1,1])ey.push(this.mesh(G.sph,this.glowM('#ffb020',1),s2*3.5,2.4,6.8,1.5,1.1,1,head));R.eyes=ey;
    for(const p of[[-6.5,12],[6.5,12],[-6.5,-12],[6.5,-12]]){const lg=new THREE.Group();lg.position.set(p[0],23,p[1]);body.add(lg);this.mesh(this.cap(3.4,12),dfur,0,-10,0,1,1,1,lg,true);
      for(let k=-1;k<=1;k++)this.mesh(G.cone,this.std('#1a1a1a',.4,0),k*1.4,-19.5,2.6,.5,2.4,.5,lg).rotation.x=Math.PI/2+.3;R.legs.push(lg)}
    const tail=new THREE.Group();tail.position.set(0,31,-17);body.add(tail);this.mesh(this.cylg(2,5,22),fur,0,9,0,1,1,1,tail,true);this.mesh(G.cone,dfur,0,22,0,4,9,4,tail);tail.rotation.x=-.9;R.tail=tail;return R},
  golem(u,guard){const G=this.G,rock=this.tstd('rock',guard?'#7a80a8':'#a8a294',.95,0),drock=this.tstd('rock',guard?'#5a6088':'#7a7468',.95,0),rc=guard?'#c58aff':'#7ff4ff',rune=this.glowM(rc,.95);
    const root=new THREE.Group(),body=new THREE.Group();root.add(body);const R={root,body,kind:'golem'};root.scale.setScalar(guard?1.2:1.06);
    this.mesh(G.rock[0],rock,0,48,0,29,27,24,body,true);this.mesh(G.rock[1],drock,0,85,5,17,15,16,body,true);
    // molten cracks running over the chest and a burning eye slit
    for(const q of[[0,52,22,12,2.4,2,0],[-6,44,21,2.4,12,2,.4],[7,58,20,2.2,10,2,-.5],[0,36,20,9,2,2,.2]]){const c=this.mesh(G.box,rune,q[0],q[1],q[2],q[3],q[4],q[5],body);c.rotation.z=q[6]}
    const ey=[this.mesh(G.box,this.glowM(rc,1),0,88,18,12,2.6,2,body)];R.eyes=ey;
    for(const s2 of[-1,1]){const a=new THREE.Group();a.position.set(s2*33,63,0);body.add(a);this.mesh(G.rock[2],drock,0,0,0,14,14,14,a,true);this.mesh(G.rock[3],rock,0,-27,4,15,17,15,a,true);
      this.mesh(G.box,rune,s2*2,-26,13,6,2,1.6,a);for(let k=0;k<3;k++){const sp=this.mesh(G.cone4,drock,s2*(4+k*3),8,-2+k*2,3.6,10,3.6,a);sp.rotation.z=-s2*.7}if(s2<0)R.armL=a;else R.armR=a;
      this.mesh(G.rock[1],drock,s2*12,12,0,12,14,12,body,true)}
    this.mesh(G.half,this.std('#4a6a2a',.9,0),0,64,-2,24,8,20,body);
    const cm=guard?this.std('#c8a8ff',.05,.2,{emissive:'#8a4ae8',emissiveIntensity:1.1,transparent:true,opacity:.92}):this.std('#9ff0ff',.05,.2,{emissive:'#2aa8c8',emissiveIntensity:.9,transparent:true,opacity:.92});
    for(let k=0;k<7;k++){const c=this.mesh(G.oct,cm,(k-3)*7.5,94+(3-Math.abs(k-3))*3,-12+Math.abs(k-3)*2,3.6,12+(3-Math.abs(k-3))*3,3.6,body);c.rotation.z=(k-3)*.28}
    return R},
  dragon(u){const G=this.G,sc=this.tstd('scales','#b0402a',.45,.35),belly=this.tstd('scales','#e0a868',.6,.1),horn=this.std('#e8dcc0',.6,0),wingM=this.fow(new THREE.MeshStandardMaterial({color:'#7a2418',roughness:.7,metalness:0,side:THREE.DoubleSide,transparent:true,opacity:.95}));
    const root=new THREE.Group(),body=new THREE.Group();root.add(body);const R={root,body,kind:'dragon',legs:[]};
    this.mesh(G.sph,sc,0,80,0,46,40,74,body,true);this.mesh(G.sph,belly,0,66,8,36,26,60,body,true);
    const neck=R.neck=new THREE.Group();neck.position.set(0,98,60);body.add(neck);let p=neck;const segs=[];for(let i=0;i<4;i++){const s=new THREE.Group();s.position.set(0,i?16:0,i?12:0);p.add(s);this.mesh(G.sph,sc,0,0,0,20-i*2.5,20-i*2.5,22-i*2,s,true);segs.push(s);p=s}R.nsegs=segs;
    const head=R.head=new THREE.Group();head.position.set(0,14,18);p.add(head);this.mesh(G.box,sc,0,4,10,24,18,34,head,true);this.mesh(G.box,sc,0,0,32,18,12,22,head,true);
    const jaw=R.jaw=new THREE.Group();jaw.position.set(0,-6,10);head.add(jaw);this.mesh(G.box,belly,0,-3,16,16,6,30,jaw,true);
    R.eyes=[];for(const s of[-1,1]){R.eyes.push(this.mesh(G.sph,this.glowM('#ffcc33',1),s*9,10,22,2.6,2,2.4,head));const h1=this.mesh(G.cone,horn,s*9,16,-2,3.6,26,3.6,head,true);h1.rotation.x=-1.1;h1.rotation.z=-s*.3;
      for(let k=0;k<3;k++)this.mesh(G.cone,horn,s*7,-2,24+k*8,1.3,5,1.3,jaw).rotation.x=Math.PI}
    for(let k=0;k<7;k++){const sp=this.mesh(G.cone,horn,0,118-k*4,40-k*16,4,16-k,4,body,true);sp.rotation.x=-.5}
    for(const p2 of[[-28,40],[28,40],[-26,-38],[26,-38]]){const lg=new THREE.Group();lg.position.set(p2[0],62,p2[1]);body.add(lg);this.mesh(this.cap(10,22),sc,0,-18,0,1,1,1,lg,true);this.mesh(this.cap(7,16),sc,0,-44,6,1,1,1,lg,true);
      for(let k=-1;k<=1;k++)this.mesh(G.cone,horn,k*5,-56,16,2,8,2,lg).rotation.x=Math.PI/2;R.legs.push(lg)}
    const tail=R.tail=new THREE.Group();tail.position.set(0,76,-66);body.add(tail);let tp=tail;R.tsegs=[];for(let i=0;i<6;i++){const s=new THREE.Group();s.position.set(0,0,i?-22:0);tp.add(s);this.mesh(G.sph,sc,0,0,-10,15-i*2.2,13-i*1.9,16,s,true);R.tsegs.push(s);tp=s}
    this.mesh(G.cone4,horn,0,0,-20,10,20,3,tp).rotation.x=-Math.PI/2;
    R.wings=[];for(const s of[-1,1]){const w=new THREE.Group();w.position.set(s*30,108,18);body.add(w);const arm=this.mesh(G.cyl,sc,s*50,10,0,4,100,4,w,true);arm.rotation.z=-s*1.25;
      const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(s*95,40);sh.lineTo(s*150,10);sh.lineTo(s*120,-30);sh.lineTo(s*80,-60);sh.lineTo(s*40,-50);sh.lineTo(0,-30);sh.lineTo(0,0);
      const wg=new THREE.ShapeGeometry(sh);wg.rotateX(Math.PI/2);const mem=new THREE.Mesh(wg,wingM);mem.castShadow=true;mem.userData.ownMat=0;w.add(mem);R.wings.push({w,s})}
    R.ember=this.mesh(G.sph,this.glowM('#ff6a1a',.55),0,70,40,22,16,30,body);root.scale.setScalar(1.15);return R},
  // fallback zombie when the KayKit models are not loaded: a hunched, rotting goblin-sized corpse
  zombieProc(u){const o={kind:'hero',style:'fist'};const sk=this.tstd('scales','#7a9068',.85,0);o.skinMat=sk;this.humanoid(o,{leg:this.tstd('fabric','#3a3a34',.95,0),boot:sk,shirt:this.tstd('fabric','#4a4a3e',.95,0),skin:sk,fore:sk});
    const d=CREEPS[u.kind]||CREEPS.zombie;o.root.scale.setScalar(u.lord?1.5:d.big?1.3:.95);o.baseLean=.3;const ey=[];for(const s2 of[-1,1])ey.push(this.mesh(this.G.sph,this.glowM('#7dff5a',1),s2*3,1,7.4,1.3,1.1,.7,o.head));o.eyes=ey;
    for(const a of o.arms)a.sh.rotation.x=-1.3;return o},
  objFor(u){let o=this.objs.get(u.id);if(o)return o;
    const qf=this.qn&&!this.qn.mobOnly;if(qf&&u.hero)o=this.qnHero(u);else if(qf&&(u.zombie||u.undead))o=this.qnZombie(u);else if(this.qn&&QN_MOB[u.kind]&&(o=this.qnMob(u))){}
    else if(u.hero&&this.kk&&!this.kk.qnOnly)o=this.kkHero(u);
    else if(u.hero){o=this.hero(u);this.dress(o,u.at,u.look);o.at=u.at;this.arm(o,u);o.wk=u.wk;o.wt=u.wt}
    else if(u.zombie||u.undead)o=(this.kk&&!this.kk.qnOnly&&this.kkZombie(u))||this.zombieProc(u);
    else if(u.kind==='goblin')o=this.goblin(u);else if(u.kind==='wolf')o=this.wolf(u);else if(u.kind==='ogre')o=this.troll(u);else if(u.boss)o=this.dragon(u);else o=this.golem(u,u.kind==='guardian');
    o.lx=u.x;o.ly=u.y;o.rot=Math.atan2(u.fx,u.fy);o.walk=0;o.mvK=0;o.atkPh=0;o.u=u;this.addStatus(o,u);this.scene.add(o.root);this.objs.set(u.id,o);return o},
  addStatus(o,u){const G=this.G,R=o.root,inv=1/(R.scale.x||1);
    o.ring=this.mesh(G.ring,this.bas('#46e046',{transparent:true,opacity:.85,depthWrite:false}),0,2,0,(u.r+12)*inv,1,(u.r+12)*inv,R);
    o.fxRing=this.mesh(G.ring,new THREE.MeshBasicMaterial({color:'#8fe3ff',transparent:true,opacity:.7,depthWrite:false}),0,2.4,0,(u.r+6)*inv,1,(u.r+6)*inv,R);o.fxRing.userData.ownMat=1;
    o.ice=this.mesh(G.ico1,new THREE.MeshStandardMaterial({color:'#bfeeff',transparent:true,opacity:.42,roughness:.05,metalness:.1,depthWrite:false,envMap:this.envTex}),0,22*inv,0,(u.r+6)*inv,34*inv,(u.r+6)*inv,R);o.ice.userData.ownMat=1;
    o.bubble=this.mesh(G.sph,new THREE.MeshBasicMaterial({color:'#ffe9a0',transparent:true,opacity:.18,depthWrite:false,blending:THREE.AdditiveBlending}),0,50*inv,0,(u.r+22)*inv,(u.hero?62:u.r*1.6)*inv,(u.r+22)*inv,R);o.bubble.userData.ownMat=1;
    const st=new THREE.Group();st.position.y=(u.hero?122:u.boss?250:u.r*3)*inv;for(let i=0;i<3;i++)this.mesh(G.oct,this.glowM('#ffe46a',.95),Math.cos(i*2.1)*14*inv,0,Math.sin(i*2.1)*14*inv,4*inv,4*inv,4*inv,st);R.add(st);o.stars=st},
  itemObj(it){const G=this.G,g=new THREE.Group();const col=itemColor(it);
    if(it.k==='c'){const base=it.gold?'#e6a817':'#9a6538',wood=this.tstd('planks',it.gold?'#d8a030':'#a07040',.8,it.gold?.4:0);this.mesh(this.boxUV(38,22,26,30),wood,0,11,0,1,1,1,g,true);const lid=this.mesh(this.cylg(13,13,38,14,false),wood,0,22,0,1,1,1,g,true);lid.rotation.z=Math.PI/2;lid.scale.set(1,1,1);
      for(const x of[-14,14])this.mesh(G.box,this.std('#6a6a70',.4,.8),x,16,0,3,25,27,g);this.mesh(G.box,this.std('#ffe080',.3,.9),0,16,13.8,6,8,1,g)}
    else if(it.k==='i'||it.k==='p'){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:this.emoji(it.k==='p'?BAG[it.b|0].ic:ITEM_BY[it.it].ic),transparent:true,depthWrite:false}));sp.scale.set(34,34,1);sp.position.y=28;sp.userData.ownMat=1;g.add(sp);g.userData.bob=sp;this.mesh(G.disc,this.glowM('#ffffff',.18),0,1,0,18,1,18,g)}
    else if(it.k==='a'){const sh=new THREE.Group();sh.position.y=34;g.add(sh);const d=this.mesh(this.cylg(16,16,3,24),this.std('#ffd35a',.25,1,{emissive:'#a87a10',emissiveIntensity:.6}),0,0,0,1,1,1,sh);d.rotation.x=Math.PI/2;this.mesh(G.oct,this.bas('#fff6c8'),0,0,3,5,7,2,sh);g.userData.spin=sh}
    else if(it.k==='w'){const w=this.weapon(it.wk,it.tier);w.position.y=30;w.rotation.z=1.25;const hold=new THREE.Group();hold.add(w);g.add(hold);g.userData.spin=hold;if(it.wk==='fire'||it.wk==='frost'||it.wk==='axe'){w.scale.setScalar(.75);w.position.y=24}}
    else if(it.k==='r'){const hold=new THREE.Group();hold.position.y=14;g.add(hold);g.userData.spin=hold;const dummy={torso:hold,head:new THREE.Group(),arms:[],legs:[],hair:new THREE.Group(),armorParts:[]};
      const c=['#8a7a58','#8a5a34','#a8b0bc','#d8dde6','#7a2a1c'][it.tier];const M=it.tier===2?this.tstd('chain',c,.45,.7):it.tier===4?this.tstd('scales',c,.35,.75,{emissive:'#3a0800',emissiveIntensity:.4}):it.tier===3?this.tstd('metal',c,.28,.9):this.tstd(it.tier===1?'leather':'fabric',c,.8,0);
      this.mesh(this.lathe('shell',[[0,-1],[11.6,-1],[12.6,7],[14.2,17],[14.6,23],[13.2,29],[6.6,33],[0,33]],16),M,0,0,0,1,1,.82,hold,true);if(it.tier>=3)for(const s of[-1,1])this.mesh(G.half,M,s*16,28,0,8,7,8,hold,true)}
    if(it.k==='w'||it.k==='r'||it.k==='a'){this.mesh(G.ring,this.glowM(col,.9),0,1.5,0,24,1,24,g);const tier=it.k==='a'?3:it.k==='w'?it.tier:it.tier-1;
      if(tier>=1){const b=this.mesh(G.openCyl,new THREE.MeshBasicMaterial({map:this.tex('beam'),color:col,transparent:true,opacity:.55+tier*.12,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}),0,90+tier*20,0,9,180+tier*40,9,g);b.userData.ownMat=1;g.userData.beam=b}}
    g.position.set(it.x,this.gY(it.x,it.y),it.y);this.scene.add(g);return g},
  dayK(){const t=gameT%(DAY+NIGHT);if(gameT<10)return 1;if(t<DAY-14)return 1;if(t<DAY)return(DAY-t)/14;if(t>DAY+NIGHT-14)return(t-(DAY+NIGHT-14))/14;return 0},
  duskK(){const t=gameT%(DAY+NIGHT);if(gameT<10)return 0;const a=Math.abs(t-DAY),b=Math.min(Math.abs(t-(DAY+NIGHT)),t);return clamp(1-Math.min(a,b)/22,0,1)},

  // ---------- particles (billboard instancing), decals, trails ----------
  initFX(){const N=this.hi?2600:1300;this.pN=N;
    const mk=add=>{const g=new THREE.InstancedBufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3));g.setIndex([0,1,2,0,2,3]);
      const P=new Float32Array(N*3),C=new Float32Array(N*4),Z=new Float32Array(N*3);const aP=new THREE.InstancedBufferAttribute(P,3),aC=new THREE.InstancedBufferAttribute(C,4),aZ=new THREE.InstancedBufferAttribute(Z,3);
      for(const a of[aP,aC,aZ])a.setUsage(THREE.DynamicDrawUsage);g.setAttribute('iP',aP);g.setAttribute('iC',aC);g.setAttribute('iZ',aZ);g.instanceCount=0;
      const m=new THREE.ShaderMaterial({uniforms:{map:{value:this.tex('atlas')}},transparent:true,depthWrite:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending,
        vertexShader:'attribute vec3 iP;attribute vec4 iC;attribute vec3 iZ;varying vec2 vU;varying vec4 vC;void main(){vC=iC;float r=iZ.z;vec2 c=position.xy;float cs=cos(r),sn=sin(r);c=vec2(c.x*cs-c.y*sn,c.x*sn+c.y*cs)*iZ.x;vec4 mv=modelViewMatrix*vec4(iP,1.0);mv.xy+=c;gl_Position=projectionMatrix*mv;vU=(position.xy+.5)*.25+vec2(mod(iZ.y,4.),3.-floor(iZ.y/4.))*.25;}',
        defines:this.post?{LIN:1}:{},fragmentShader:'uniform sampler2D map;varying vec2 vU;varying vec4 vC;void main(){vec4 t=texture2D(map,vU);vec3 c=vC.rgb;\n#ifdef LIN\nc=pow(c,vec3(2.2))*'+(add?'1.8':'1.0')+';\n#endif\n'+(add?'gl_FragColor=vec4(c*t.rgb*t.a*vC.a,1.0);':'gl_FragColor=vec4(c,t.a*vC.a);')+'}'});
      const mesh=new THREE.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=add?8:7;mesh.userData.ownMat=1;this.scene.add(mesh);return{mesh,g,P,C,Z,aP,aC,aZ,list:[]}};
    this.PA=mk(true);this.PB=mk(false);
    this.decalPool=[];for(let i=0;i<36;i++){const m=new THREE.Mesh(this.G.plane,new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));m.visible=false;m.renderOrder=1;m.userData.ownMat=1;this.scene.add(m);this.decalPool.push({m,on:false})}
    this.trailPool=[];for(let i=0;i<14;i++){const seg=16,pos=new Float32Array((seg+1)*2*3),uv=new Float32Array((seg+1)*2*2),idx=[];for(let s=0;s<seg;s++){const a=s*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex(idx);
      const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:this.tex('slash'),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));m.frustumCulled=false;m.visible=false;m.renderOrder=9;m.userData.ownMat=1;this.scene.add(m);this.trailPool.push({m,seg,on:false})}
    this.lastFx=0;this.emitAcc={}},
  sp(add,o){const L=add?this.PA:this.PB;if(L.list.length>=this.pN){L.list.shift()}const c=this.col.set(o.c||'#ffffff');const c2=o.c2?new THREE.Color(o.c2):null;
    L.list.push({x:o.x,y:o.y,z:o.z,vx:o.vx||0,vy:o.vy||0,vz:o.vz||0,l:o.l||.6,m:o.l||.6,s0:o.s||20,s1:o.s1===undefined?(o.s||20):o.s1,r:o.r||Math.random()*6.3,vr:o.vr||0,cr:c.r,cg:c.g,cb:c.b,c2,a:o.a===undefined?1:o.a,sp:o.sp||0,g:o.g||0,dr:o.dr===undefined?1.5:o.dr,fi:o.fi||0})},
  stepP(L,dt){let n=0;const P=L.P,C=L.C,Z=L.Z,keep=[];for(const p of L.list){p.l-=dt;if(p.l<=0)continue;keep.push(p);const k=1-p.l/p.m;const d=Math.exp(-p.dr*dt);p.vx*=d;p.vz*=d;p.vy=p.vy*d-p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.r+=p.vr*dt;
      if(n>=this.pN)continue;P[n*3]=p.x;P[n*3+1]=p.y;P[n*3+2]=p.z;let r=p.cr,g=p.cg,b=p.cb;if(p.c2){r=lerp(r,p.c2.r,k);g=lerp(g,p.c2.g,k);b=lerp(b,p.c2.b,k)}
      const a=p.a*(p.fi?Math.min(1,k/p.fi):1)*Math.min(1,(1-k)*3);C[n*4]=r;C[n*4+1]=g;C[n*4+2]=b;C[n*4+3]=a;Z[n*3]=lerp(p.s0,p.s1,k);Z[n*3+1]=p.sp;Z[n*3+2]=p.r;n++}
    L.list=keep;L.g.instanceCount=n;L.aP.needsUpdate=true;L.aC.needsUpdate=true;L.aZ.needsUpdate=true},
  decal(o){let d=this.decalPool.find(q=>!q.on);if(!d){d=this.decalPool.reduce((a,b)=>a.t/a.life>b.t/b.life?a:b)}d.on=true;Object.assign(d,{t:0,life:o.life||1,x:o.x,y:o.y,r:o.r,r1:o.r1===undefined?o.r:o.r1,a:o.a===undefined?1:o.a,spin:o.spin||0,rot:Math.random()*6.3,fade:o.fade===undefined?.3:o.fade,grow:o.grow||0,follow:o.follow||null});
    const m=d.m.material;m.map=this.tex(o.tex||'shock');m.color.set(o.c||'#ffffff');m.blending=o.normal?THREE.NormalBlending:THREE.AdditiveBlending;m.needsUpdate=true;d.m.visible=true;return d},
  stepDecals(dt){for(const d of this.decalPool){if(!d.on)continue;d.t+=dt;const k=d.t/d.life;if(k>=1){d.on=false;d.m.visible=false;continue}
    if(d.follow){const u=d.follow;if(u.dead){d.on=false;d.m.visible=false;continue}d.x=u.x;d.y=u.y}
    const r=lerp(d.r,d.r1,d.grow?Math.sqrt(k):k);d.rot+=d.spin*dt;d.m.position.set(d.x,this.gY(d.x,d.y)+2.5,d.y);d.m.rotation.y=d.rot;d.m.scale.set(r*2,1,r*2);d.m.material.opacity=d.a*(k>1-d.fade?(1-k)/d.fade:1)*Math.min(1,k*8+.2)}},
  trail(u,ang,r,col,k,life){const t=this.trailPool.find(q=>!q.on)||this.trailPool[0];t.on=true;Object.assign(t,{u,ang,r,k,t:0,life:life||.24});t.m.material.color.set(col);t.m.visible=true;t.flip=k===2&&(u.atkK||0)%2?-1:1},
  stepTrails(dt){for(const t of this.trailPool){if(!t.on)continue;t.t+=dt;const k=t.t/t.life;if(k>=1||!t.u||t.u.dead){t.on=false;t.m.visible=false;continue}
    const u=t.u,seg=t.seg,pos=t.m.geometry.attributes.position.array,uv=t.m.geometry.attributes.uv.array;const sweep=t.k===1?2.5:t.k===2?1.3:t.k===4?1.6:2.2,head=lerp(-sweep/2,sweep/2,Math.min(1,k*1.6))*t.flip,tail=head-t.flip*Math.min(sweep*.85,k*1.6*sweep);
    const w=t.k===1?30:t.k===2?12:t.k===4?18:22,R=t.r*.92,y=this.gY(u.x,u.y)+(t.k===1?34:t.k===4?26:40);
    for(let i=0;i<=seg;i++){const f=i/seg,a=t.ang+lerp(tail,head,f);const ca=Math.cos(a),sa=Math.sin(a);pos[i*6]=u.x+ca*(R-w);pos[i*6+1]=y+(t.k===1?(1-f)*30:0);pos[i*6+2]=u.y+sa*(R-w);pos[i*6+3]=u.x+ca*R;pos[i*6+4]=y+(t.k===1?(1-f)*30:4);pos[i*6+5]=u.y+sa*R;uv[i*4]=f;uv[i*4+1]=0;uv[i*4+2]=f;uv[i*4+3]=1}
    t.m.geometry.attributes.position.needsUpdate=true;t.m.geometry.attributes.uv.needsUpdate=true;t.m.material.opacity=1-k}},
  burstFX(x,y,z,c,n,sp,o){for(let i=0;i<n;i++){const a=Math.random()*6.283,e=Math.random()*1.2-.2,v=(sp||220)*(.4+Math.random()*.8);this.sp(true,Object.assign({x,y:z,z:y,vx:Math.cos(a)*Math.cos(e)*v,vy:Math.sin(e)*v+60,vz:Math.sin(a)*Math.cos(e)*v,l:.35+Math.random()*.45,s:10+Math.random()*12,s1:2,c,sp:Math.random()<.5?1:0,g:300,dr:2.5},o||{}))}},
  ring(x,y,r0,r1,c,life,tex){return this.decal({x,y,r:r0,r1,c,life,tex:tex||'shock',fade:.6})},
  doFx(e,me,L){const vis=(x,y,m)=>!L||Math.hypot(x-L.x,y-L.y)<visionR()+(m||200);if(e.x!==undefined&&!vis(e.x,e.y))return;const gy=(x,y)=>this.gY(x,y);
    const U=e.id!==undefined?UMAP.get(e.id):null;
    switch(e.t==='b'?'burst':e.k){
      case 'burst':this.burstFX(e.x,e.y,gy(e.x,e.y)+30,e.c,Math.min(26,e.n+4),200);break;
      case 'hit':this.burstFX(e.x,e.y,gy(e.x,e.y)+34,e.c||'#ffffff',8,160);this.sp(true,{x:e.x,y:gy(e.x,e.y)+34,z:e.y,l:.18,s:42,s1:10,c:e.c||'#ffffff',sp:1});break;
      case 'stab':this.sp(true,{x:e.x,y:gy(e.x,e.y)+40,z:e.y,l:.3,s:70,s1:20,c:'#ffd23a',sp:1,vr:4});this.burstFX(e.x,e.y,gy(e.x,e.y)+40,'#ff4a4a',12,200);break;
      case 'bash':this.ring(e.x,e.y,20,90,'#ffd28a',.35);this.burstFX(e.x,e.y,gy(e.x,e.y)+30,'#ffe0a0',14,240);break;
      case 'dash':for(let i=0;i<10;i++)this.sp(false,{x:e.x+rand(-14,14),y:gy(e.x,e.y)+8,z:e.y+rand(-14,14),vx:-Math.cos(e.a)*80+rand(-30,30),vy:rand(10,40),vz:-Math.sin(e.a)*80+rand(-30,30),l:.7,s:26,s1:60,c:'#c8b89a',a:.5,sp:2});break;
      case 'shield':this.ring(e.x,e.y,30,80,'#ffe9a0',.5);for(let i=0;i<16;i++){const a=i/16*6.283;this.sp(true,{x:e.x+Math.cos(a)*40,y:gy(e.x,e.y)+20,z:e.y+Math.sin(a)*40,vy:90,l:.7,s:14,s1:4,c:'#ffe9a0',sp:1})}break;
      case 'leap':this.decal({x:e.x,y:e.y,r:e.r,c:'#ffe27a',life:.6,tex:'rune',spin:2,a:.8});break;
      case 'spin':break;
      case 'cry':this.ring(e.x,e.y,30,e.r||360,'#ff9a5a',.55);this.ring(e.x,e.y,20,(e.r||360)*.7,'#ffd0a0',.4);for(let i=0;i<18;i++){const a=i/18*6.283;this.sp(false,{x:e.x,y:gy(e.x,e.y)+10,z:e.y,vx:Math.cos(a)*420,vz:Math.sin(a)*420,vy:20,l:.6,s:30,s1:70,c:'#b8a080',a:.45,sp:2})}break;
      case 'blink':for(const p of[[e.x,e.y],[e.x2,e.y2]]){for(let i=0;i<14;i++)this.sp(false,{x:p[0]+rand(-16,16),y:gy(p[0],p[1])+rand(10,70),z:p[1]+rand(-16,16),vy:rand(10,50),l:.6,s:24,s1:40,c:'#3a2a4a',a:.75,sp:2})}this.burstFX(e.x2,e.y2,gy(e.x2,e.y2)+40,'#c88aff',10,150);break;
      case 'smoke':for(let i=0;i<26;i++){const a=Math.random()*6.283,v=rand(20,110);this.sp(false,{x:e.x,y:gy(e.x,e.y)+rand(5,50),z:e.y,vx:Math.cos(a)*v,vz:Math.sin(a)*v,vy:rand(10,40),l:rand(.9,1.6),s:40,s1:110,c:'#6a6a78',a:.55,sp:2,dr:1.2})}break;
      case 'lotus':this.decal({x:e.x,y:e.y,r:e.r,c:'#ff7ad0',life:1.25,tex:'rune',spin:5,a:.7,follow:U});break;
      case 'lvl':{const y=gy(e.x,e.y);this.ring(e.x,e.y,10,120,'#ffd35a',.7);for(let i=0;i<30;i++){const a=Math.random()*6.283,r=rand(5,40);this.sp(true,{x:e.x+Math.cos(a)*r,y:y+rand(0,20),z:e.y+Math.sin(a)*r,vy:rand(120,300),l:rand(.6,1.1),s:12,s1:3,c:'#ffe27a',c2:'#ff9a2a',sp:1,dr:.5})}break}
      case 'equip':this.ring(e.x,e.y,20,70,e.c,.45);for(let i=0;i<14;i++){const a=i/14*6.283;this.sp(true,{x:e.x+Math.cos(a)*30,y:gy(e.x,e.y)+10,z:e.y+Math.sin(a)*30,vy:rand(80,180),l:.7,s:10,s1:2,c:e.c,sp:1})}break;
      case 'box':{const y=gy(e.x,e.y)+22;if(e.ok){this.burstFX(e.x,e.y,y,'#ffd35a',22,220,{g:200});this.ring(e.x,e.y,12,90,'#ffe27a',.6)}else for(let i=0;i<10;i++)this.sp(false,{x:e.x+rand(-14,14),y,z:e.y+rand(-10,10),vy:rand(20,60),l:.8,s:14,s1:30,c:'#b8a890',sp:1})}break;
      case 'chest':this.burstFX(e.x,e.y,gy(e.x,e.y)+24,e.c,16,180,{g:200});this.sp(true,{x:e.x,y:gy(e.x,e.y)+30,z:e.y,l:.4,s:90,s1:30,c:e.c,sp:0});break;
      case 'die':{for(let i=0;i<16;i++)this.sp(false,{x:e.x+rand(-20,20),y:gy(e.x,e.y)+rand(10,60),z:e.y+rand(-20,20),vy:rand(20,60),l:rand(.8,1.4),s:30,s1:70,c:'#5a5050',a:.55,sp:2});const o=this.objs.get(e.id);if(o&&o.root.visible){o.dieT=1.4}break}
      case 'snare':for(let i=0;i<10;i++){const a=i/10*6.283;this.sp(true,{x:e.x+Math.cos(a)*24,y:gy(e.x,e.y)+6,z:e.y+Math.sin(a)*24,vy:rand(30,80),l:.8,s:12,s1:4,c:'#8aff7a',sp:6,vr:3})}this.decal({x:e.x,y:e.y,r:34,c:'#7aff6a',life:1.3,tex:'rune',spin:3,a:.6,follow:U});break;
      case 'shatter':{const r=e.r||40;for(let i=0;i<(e.r?40:14);i++){const a=Math.random()*6.283,d=Math.random()*r;this.sp(true,{x:e.x+Math.cos(a)*d,y:gy(e.x,e.y)+rand(10,40),z:e.y+Math.sin(a)*d,vx:Math.cos(a)*rand(60,200),vy:rand(60,200),vz:Math.sin(a)*rand(60,200),l:rand(.4,.8),s:12,s1:4,c:'#dff8ff',sp:7,vr:6,g:500})}if(e.r)this.ring(e.x,e.y,20,e.r,'#bfeeff',.5);break}
      case 'freeze':break;
    }},
  aoeVis(a,T,dt,L){const gy=this.gY(a.x,a.y),col=AOE_COL[a.kind]||'#ffffff';const pre=a.t<a.delay;const key=a.x+'_'+a.y+'_'+a.kind;
    const pick=(o)=>{const d=this.get('ad',()=>{const m=new THREE.Mesh(this.G.plane,new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,blending:THREE.AdditiveBlending}));m.renderOrder=1;m.userData.ownMat=1;return m});
      d.material.map=this.tex(o.tex);d.material.color.set(o.c);d.material.opacity=o.a;d.position.set(o.x,gy+2.6+(this.pool.ad.used%6)*.25,o.y);d.rotation.y=o.rot||0;d.scale.set(o.sx,1,o.sz||o.sx);return d};
    if(a.shape==='line'){const L2=a.len||600,wd=a.w||160;const cx=a.x+Math.cos(a.ang)*L2/2,cy=a.y+Math.sin(a.ang)*L2/2;
      if(pre){pick({tex:'beam',c:col,a:.5+.3*Math.sin(T*20),x:cx,y:cy,sx:wd,sz:L2,rot:-a.ang+Math.PI/2})}
      else if(!a.fx){a.fx=1;for(let s=0;s<L2;s+=40){const px=a.x+Math.cos(a.ang)*s,py=a.y+Math.sin(a.ang)*s;this.sp(false,{x:px+rand(-30,30),y:this.gY(px,py)+10,z:py+rand(-30,30),vy:rand(60,160),l:rand(.6,1.1),s:40,s1:90,c:'#9a8468',a:.6,sp:2,g:100});
          this.sp(true,{x:px,y:this.gY(px,py)+20,z:py,vy:rand(100,250),l:.4,s:18,s1:6,c:'#ffb347',sp:1,g:400});if(s%80===0)this.spikes.push({x:px,y:py,t:0})}this.decal({x:cx,y:cy,r:L2/2,c:'#2a1a10',life:4,tex:'scorch',normal:1,a:.7,fade:.5})}
      return}
    if(a.shape==='cone'){if(Math.random()<dt*60){const dd=rand(40,a.len||420),aa=a.ang+rand(-a.arc,a.arc)*.85;const sx=a.x,sy=a.y;const v=dd*2.2;this.sp(true,{x:sx,y:gy+60,z:sy,vx:Math.cos(aa)*v,vz:Math.sin(aa)*v,vy:rand(-10,30),l:.45,s:30,s1:110,c:'#ffd070',c2:'#ff3a10',sp:3,dr:.4})}
      if(pre)pick({tex:'beam',c:'#ff5a1a',a:.45,x:a.x+Math.cos(a.ang)*(a.len||420)/2,y:a.y+Math.sin(a.ang)*(a.len||420)/2,sx:(a.len||420)*a.arc*1.5,sz:a.len||420,rot:-a.ang+Math.PI/2});return}
    if(pre){const k=a.t/a.delay;pick({tex:'rune',c:col,a:.85,x:a.x,y:a.y,sx:a.r*2,rot:T*1.5});pick({tex:'shock',c:col,a:.6,x:a.x,y:a.y,sx:a.r*2*k});
      if(a.kind==='meteor'){const m=this.get('meteor',()=>{const g=new THREE.Group();this.mesh(this.G.rock[3],this.std('#5a2a18',.9,0,{emissive:'#ff4a10',emissiveIntensity:.8}),0,0,0,30,30,30,g);this.mesh(this.G.sph,this.glowM('#ffb040',.7),0,0,0,42,42,42,g);return g});
        const hh=(1-k)*1100;m.position.set(a.x+hh*.35,gy+hh+30,a.y-hh*.3);m.rotation.set(T*3,T*2,0);for(let i=0;i<3;i++)this.sp(true,{x:m.position.x+rand(-14,14),y:m.position.y+rand(-14,14),z:m.position.z+rand(-14,14),vx:rand(-30,30),vy:rand(20,60),vz:rand(-30,30),l:.5,s:46,s1:12,c:'#ffd070',c2:'#ff3a10',sp:3});
        this.sp(false,{x:m.position.x,y:m.position.y+20,z:m.position.z,vy:30,l:1.2,s:40,s1:120,c:'#3a3030',a:.45,sp:2})}
      return}
    if(a.dot){const inR=()=>{const r=Math.sqrt(Math.random())*a.r,aa=Math.random()*6.283;return[a.x+Math.cos(aa)*r,a.y+Math.sin(aa)*r]};
      if(a.kind==='rain'){pick({tex:'rune',c:'#9dffc0',a:.35,x:a.x,y:a.y,sx:a.r*2,rot:T*.6});for(let i=0;i<Math.ceil(dt*90);i++){const p=inR();this.sp(true,{x:p[0],y:this.gY(p[0],p[1])+340,z:p[1],vy:-1400,l:.24,s:30,c:'#e8fff0',sp:10,dr:0});if(Math.random()<.4)this.sp(false,{x:p[0],y:this.gY(p[0],p[1])+6,z:p[1],vy:40,l:.3,s:10,s1:24,c:'#a89878',a:.6,sp:2})}}
      else if(a.kind==='blizz'){pick({tex:'frostp',c:'#ffffff',a:.55,x:a.x,y:a.y,sx:a.r*2.1,rot:0});pick({tex:'rune',c:'#bfefff',a:.4,x:a.x,y:a.y,sx:a.r*2,rot:-T});
        for(let i=0;i<Math.ceil(dt*70);i++){const p=inR();this.sp(true,{x:p[0],y:this.gY(p[0],p[1])+rand(40,260),z:p[1],vx:rand(-120,-40),vy:rand(-160,-80),vz:rand(-40,40),l:1.1,s:rand(8,16),c:'#ffffff',sp:4,vr:3,dr:.2})}
        if(Math.random()<dt*20){const p=inR();this.sp(false,{x:p[0],y:this.gY(p[0],p[1])+30,z:p[1],vx:-60,l:1.2,s:60,s1:140,c:'#dfefff',a:.3,sp:2})}}
      else if(a.kind==='burn'){pick({tex:'shock',c:'#ff6a1a',a:.25+.1*Math.sin(T*12),x:a.x,y:a.y,sx:a.r*2});
        for(let i=0;i<Math.ceil(dt*50);i++){const p=inR();this.sp(true,{x:p[0],y:this.gY(p[0],p[1])+5,z:p[1],vy:rand(60,140),l:rand(.4,.8),s:rand(20,36),s1:6,c:'#ffd070',c2:'#ff3a10',sp:3,dr:.5});if(Math.random()<.2)this.sp(false,{x:p[0],y:this.gY(p[0],p[1])+40,z:p[1],vy:60,l:1.2,s:30,s1:80,c:'#3a3230',a:.35,sp:2})}}
      else pick({tex:'shock',c:col,a:.3,x:a.x,y:a.y,sx:a.r*2});return}
    if(a.fx)return;a.fx=1;const y=gy;
    switch(a.kind){
      case 'boom':this.ring(a.x,a.y,20,a.r*1.2,'#ffb070',.4);for(let i=0;i<26;i++){const aa=Math.random()*6.283,v=rand(80,300);this.sp(true,{x:a.x,y:y+30,z:a.y,vx:Math.cos(aa)*v,vy:rand(40,220),vz:Math.sin(aa)*v,l:rand(.35,.6),s:40,s1:8,c:'#ffd070',c2:'#ff3a10',sp:3,dr:3})}
        for(let i=0;i<8;i++)this.sp(false,{x:a.x+rand(-30,30),y:y+40,z:a.y+rand(-30,30),vy:rand(30,80),l:1.4,s:40,s1:110,c:'#3a3230',a:.5,sp:2});this.decal({x:a.x,y:a.y,r:a.r*.8,c:'#ffffff',life:4,tex:'scorch',normal:1,a:.7,fade:.6});break;
      case 'meteor':this.ring(a.x,a.y,40,a.r*1.4,'#ff9a50',.6);this.ring(a.x,a.y,20,a.r*.9,'#fff0c0',.35);for(let i=0;i<60;i++){const aa=Math.random()*6.283,v=rand(100,520);this.sp(true,{x:a.x,y:y+20,z:a.y,vx:Math.cos(aa)*v,vy:rand(80,480),vz:Math.sin(aa)*v,l:rand(.5,1),s:rand(30,60),s1:6,c:'#ffd070',c2:'#ff2a00',sp:3,g:500,dr:1.2})}
        for(let i=0;i<20;i++)this.sp(false,{x:a.x+rand(-a.r*.5,a.r*.5),y:y+30,z:a.y+rand(-a.r*.5,a.r*.5),vy:rand(40,140),l:2,s:60,s1:180,c:'#2a2422',a:.6,sp:2,dr:.8});this.decal({x:a.x,y:a.y,r:a.r,c:'#ffffff',life:7,tex:'scorch',normal:1,a:.85,fade:.5});break;
      case 'frost':this.ring(a.x,a.y,30,a.r*1.15,'#bfeeff',.5);this.decal({x:a.x,y:a.y,r:a.r*1.05,c:'#ffffff',life:3.2,tex:'frostp',normal:1,a:.85,fade:.5});for(let i=0;i<14;i++){const aa=i/14*6.283,d=a.r*rand(.3,.9);this.spikes.push({x:a.x+Math.cos(aa)*d,y:a.y+Math.sin(aa)*d,t:0,ice:1})}
        for(let i=0;i<30;i++){const aa=Math.random()*6.283;this.sp(true,{x:a.x,y:y+20,z:a.y,vx:Math.cos(aa)*rand(200,420),vy:rand(20,90),vz:Math.sin(aa)*rand(200,420),l:.6,s:14,s1:4,c:'#dff8ff',sp:4,vr:5})}break;
      case 'nova':this.ring(a.x,a.y,30,a.r*1.25,'#ff7a2a',.45);for(let i=0;i<46;i++){const aa=i/46*6.283;this.sp(true,{x:a.x+Math.cos(aa)*30,y:y+14,z:a.y+Math.sin(aa)*30,vx:Math.cos(aa)*520,vy:rand(20,80),vz:Math.sin(aa)*520,l:.45,s:44,s1:16,c:'#ffd070',c2:'#ff3a10',sp:3,dr:2.5})}
        this.decal({x:a.x,y:a.y,r:a.r*.9,c:'#ffffff',life:3,tex:'scorch',normal:1,a:.6,fade:.6});break;
      case 'judg':this.ring(a.x,a.y,30,a.r*1.3,'#ffe27a',.55);this.ring(a.x,a.y,20,a.r*.8,'#ffffff',.35);this.sp(true,{x:a.x,y:y+120,z:a.y,l:.45,s:260,s1:60,c:'#fff2b0',sp:0});
        for(let i=0;i<30;i++){const aa=Math.random()*6.283;this.sp(false,{x:a.x+Math.cos(aa)*rand(20,a.r),y:y+10,z:a.y+Math.sin(aa)*rand(20,a.r),vy:rand(40,140),l:1,s:40,s1:90,c:'#a89878',a:.55,sp:2})}
        for(let i=0;i<8;i++){const aa=i/8*6.283;this.spikes.push({x:a.x+Math.cos(aa)*a.r*.6,y:a.y+Math.sin(aa)*a.r*.6,t:0})}this.decal({x:a.x,y:a.y,r:a.r*.75,c:'#ffffff',life:3,tex:'scorch',normal:1,a:.55,fade:.6});break;
      case 'slam':this.ring(a.x,a.y,30,a.r*1.2,'#ff6a4a',.5);for(let i=0;i<28;i++){const aa=Math.random()*6.283;this.sp(false,{x:a.x+Math.cos(aa)*rand(20,a.r),y:y+10,z:a.y+Math.sin(aa)*rand(20,a.r),vy:rand(40,160),l:1.1,s:46,s1:110,c:'#8a7a68',a:.6,sp:2})}break;
      case 'nova2':break;
      default:this.ring(a.x,a.y,20,a.r,col,.4)}},
  get(kind,make){const p=this.pool[kind]||(this.pool[kind]={list:[],used:0});if(p.used>=p.list.length){const o=make();this.scene.add(o);p.list.push(o)}const o=p.list[p.used++];o.visible=true;return o},
  resetPools(){for(const k in this.pool)this.pool[k].used=0},
  hideUnused(){for(const k in this.pool){const p=this.pool[k];for(let i=p.used;i<p.list.length;i++)p.list[i].visible=false}},
  effects(T,dt,me,L){this.resetPools();const G=this.G;const vr=visionR()+260;const near=p=>!L||Math.hypot(p.x-L.x,p.y-L.y)<vr;this.spikes=this.spikes||[];
    // consume event queue
    for(const e of fxq)this.doFx(e,me,L);fxq.length=0;
    for(const s of swings){if(!s.fresh){s.fresh=1;if(s.u&&!s.u.dead&&near(s.u))this.trail(s.u,s.ang,s.r,s.col,s.k,s.k===1?.3:s.k===2?.16:.24);this.moon(s.u.x,s.u.y,s.ang,s.r*(s.k===1?1.15:1),s.col,s.k===1?.32:.22,(s.u.atkK||0)%2?-1:1)}}
    for(const p of projs){if(!near(p))continue;const y=this.gY(p.x,p.y)+42,ang=Math.atan2(p.vx,p.vy);if(p.kind>=6){this.projNew(p,y,ang,T);continue}
      if(p.kind===0||p.kind===5){const a=this.get(p.kind===5?'snarr':'arrow',()=>{const g=new THREE.Group();const s=this.mesh(G.cyl,this.std('#d8c8a0',.7,0),0,0,0,1.3,34,1.3,g);s.rotation.x=Math.PI/2;const tp=this.mesh(G.cone4,this.std('#c8d0d8',.3,.8),0,0,19,3,8,3,g);tp.rotation.x=Math.PI/2;
          for(const r of[0,Math.PI/2])this.mesh(G.box,this.bas(p.kind===5?'#7aff6a':'#f0f0f0'),0,0,-14,r?.6:6,r?6:.6,6,g);return g});a.position.set(p.x,y,p.y);a.rotation.y=ang;
        if(Math.random()<.6)this.sp(true,{x:p.x,y,z:p.y,l:.18,s:8,s1:2,c:p.kind===5?'#8aff7a':'#ffffff',sp:0,a:.6})}
      else if(p.kind===1||p.kind===2){const big=p.kind===2;const b=this.get(big?'fball':'orb',()=>{const g=new THREE.Group();this.mesh(G.sph,this.glowM('#ff8a2a',.9),0,0,0,1,1,1,g);this.mesh(G.sph,this.bas('#fff4d8'),0,0,0,.55,.55,.55,g);return g});
        b.position.set(p.x,y,p.y);b.scale.setScalar((p.r||12)*(1+Math.sin(T*30)*.08));const n=big?3:1;for(let i=0;i<n;i++)this.sp(true,{x:p.x+rand(-6,6),y:y+rand(-6,6),z:p.y+rand(-6,6),vx:rand(-30,30),vy:rand(20,70),vz:rand(-30,30),l:big?.5:.3,s:big?40:22,s1:6,c:'#ffd070',c2:'#ff3a10',sp:3});
        if(big&&Math.random()<.5)this.sp(false,{x:p.x,y,z:p.y,vy:40,l:.9,s:24,s1:60,c:'#3a3230',a:.4,sp:2})}
      else{const lance=p.kind===4;const b=this.get(lance?'lance':'fbolt',()=>{const g=new THREE.Group();if(lance){const c=this.mesh(G.oct,this.std('#dff8ff',.05,.2,{emissive:'#6ad0ff',emissiveIntensity:1.1}),0,0,0,8,8,34,g);this.mesh(G.oct,this.glowM('#9fe8ff',.5),0,0,-8,12,12,40,g)}else{this.mesh(G.oct,this.glowM('#9fe8ff',.9),0,0,0,9,9,9,g);this.mesh(G.sph,this.bas('#ffffff'),0,0,0,4,4,4,g)}return g});
        b.position.set(p.x,y,p.y);b.rotation.y=ang;if(!lance)b.rotation.z=T*6;this.sp(true,{x:p.x+rand(-5,5),y:y+rand(-5,5),z:p.y+rand(-5,5),vy:rand(-20,20),l:.4,s:lance?16:10,s1:3,c:'#dff8ff',sp:lance?7:4,vr:4})}}
    for(const a of aoes){if(!near(a))continue;this.aoeVis(a,T,dt,L)}
    // ice / rock spikes popping out of the ground
    this.spikes=this.spikes.filter(s=>(s.t+=dt)<1.1);for(const s of this.spikes){const k=s.t<.12?s.t/.12:s.t>.8?(1.1-s.t)/.3:1;const m=this.get(s.ice?'ispike':'rspike',()=>s.ice?new THREE.Mesh(G.cone6,this.std('#dff8ff',.05,.2,{emissive:'#4aa8e8',emissiveIntensity:.6,transparent:true,opacity:.9})):new THREE.Mesh(G.cone6,this.tstd('rock','#a89a88',.9,0)));
      m.position.set(s.x,this.gY(s.x,s.y)+30*k-6,s.y);m.scale.set(14,60*k+1,14);m.rotation.set(Math.sin(s.x)*.25,s.y,Math.cos(s.y)*.25)}
    // waterfall mist, chimney smoke, torch fire, fountain spray (only near the camera)
    const acc=(k,r)=>{this.emitAcc[k]=(this.emitAcc[k]||0)+dt*r;const n=Math.floor(this.emitAcc[k]);this.emitAcc[k]-=n;return n};
    const F=this.fallsBase;if(F&&L&&Math.hypot(F.x-L.x,F.y-L.y)<1500){for(let i=acc('mist',22);i>0;i--){const s=rand(-70,70);this.sp(false,{x:F.x+F.px*s,y:WL+rand(0,20),z:F.y+F.py*s,vx:rand(-30,30),vy:rand(20,70),vz:rand(-30,30),l:rand(1.2,2),s:40,s1:120,c:'#f0f8ff',a:.35,sp:2,dr:.6})}}
    if(L){if(isNight()||true)for(const r of this.roofs){if(Math.abs(r.smoke.x-L.x)>1100||Math.abs(r.smoke.z-L.y)>800)continue;if(Math.random()<dt*2.5)this.sp(false,{x:r.smoke.x,y:r.smoke.y,z:r.smoke.z,vx:rand(10,30),vy:rand(30,50),vz:rand(-10,10),l:3,s:16,s1:70,c:'#c8c4c0',a:.3,sp:2,dr:.2})}
      for(const t of this.torches){if(Math.abs(t.x-L.x)>1100||Math.abs(t.z-L.y)>800)continue;if(Math.random()<dt*14)this.sp(true,{x:t.x+rand(-3,3),y:t.y,z:t.z+rand(-3,3),vy:rand(40,80),l:.45,s:18,s1:4,c:'#ffd070',c2:'#ff3a10',sp:3})}
      for(const f of this.fountains){if(Math.abs(f.x-L.x)>1100||Math.abs(f.y-L.y)>800)continue;for(let i=acc('ft'+f.x,30);i>0;i--){const a=Math.random()*6.283;this.sp(true,{x:f.x,y:86,z:f.y,vx:Math.cos(a)*rand(30,60),vy:rand(90,140),vz:Math.sin(a)*rand(30,60),l:1,s:6,s1:3,c:'#cfefff',a:.7,sp:11,g:260,dr:0})}}}
    this.fxExtra(T,dt,me,L);this.hideUnused()},

  // ---------- per-frame ----------
  updateGround(cx,cy){const hi=this.hi,cs=hi?34:46,gx=Math.floor(cx/cs),gy=Math.floor(cy/cs);const key=gx+'_'+gy;if(this.gGrass.userData.cell===key)return;this.gGrass.userData.cell=key;
    const tg=WD.tg,n=tg.n,d=this.dummy,im=this.gGrass,max=im.instanceMatrix.count;let c=0;const C1=new THREE.Color('#e0f0c0'),C2=new THREE.Color('#a8e0d8'),C=this.col;
    const ix0=gx-Math.round(1400/cs),ix1=gx+Math.round(1400/cs),iy0=gy-Math.round(1000/cs),iy1=gy+Math.round(760/cs);
    for(let j=iy0;j<=iy1&&c<max;j++)for(let i=ix0;i<=ix1&&c<max;i++){const h1=Math.sin(i*127.1+j*311.7)*43758.5453,h2=Math.sin(i*269.5+j*183.3)*43758.5453;const r1=h1-Math.floor(h1),r2=h2-Math.floor(h2);
      const x=(i+r1)*cs,y=(j+r2)*cs;const ti=Math.floor(x/tg.C),tj=Math.floor(y/tg.C);if(ti<0||tj<0||ti>=n||tj>=n)continue;const dn=this.gdens[tj*n+ti];if(!dn||r1*r2*255*(TOON?4.2:1.7)*(this.gThin||1)>dn)continue;let gi=-1;if(MOON){gi=REG.at(x,y);if((gi===2||gi===3)&&r2>.22)continue}
      const s=.7+r2*.8;d.position.set(x,tg.hg[tj*n+ti]-1,y);d.rotation.set(0,r1*6.28,0);d.scale.set(30*s,(20+r1*20)*s,30*s);d.updateMatrix();im.setMatrixAt(c,d.matrix);C.copy(C1).lerp(C2,direK(x,y)).multiplyScalar(TOON?.95+r1*.3:.6+r1*.42);if(this.gCool){const l=C.r*.3+C.g*.59+C.b*.11;C.setRGB(l*.78,l*.88,l)}if(gi>=0)C.multiply(REG.gc(gi));im.setColorAt(c,C);c++}
    im.count=c;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;
    const fm=this.gFlow,fmax=fm.instanceMatrix.count,fs=90;let f=0;const PAL=['#ffe36e','#ff9ac2','#ffffff','#c8a0ff','#ff7a5a','#8ac8ff'];
    for(let j=Math.floor((cy-1000)/fs);j<=Math.floor((cy+760)/fs)&&f<fmax;j++)for(let i=Math.floor((cx-1400)/fs);i<=Math.floor((cx+1400)/fs)&&f<fmax;i++){const h1=Math.sin(i*91.7+j*47.3)*43758.5453;const r=h1-Math.floor(h1);
      const x=(i+r)*fs,y=(j+(r*7.13)%1)*fs;const ti=Math.floor(x/tg.C),tj=Math.floor(y/tg.C);if(ti<0||tj<0||ti>=n||tj>=n)continue;const dn=this.gdens[tj*n+ti];if(dn<200)continue;const meadow=WD.noise(x,y)<.44;if(!meadow&&r>.25)continue;if(this.gThin&&(r*37.7)%1>1/this.gThin)continue;
      for(let k=0;k<3&&f<fmax;k++){const xx=x+Math.cos(k*2.1+r*9)*16,yy=y+Math.sin(k*2.1+r*9)*16;d.position.set(xx,tg.hg[tj*n+ti]+2+k*2,yy);d.rotation.set(0,r*6+k,0);d.scale.set(10,12,10);d.updateMatrix();fm.setMatrixAt(f,d.matrix);
        this.col.set(direK(x,y)>.5?(k%2?'#7ef9ff':'#e08aff'):PAL[Math.floor((r*13+k)%PAL.length)]);if(this.gCool){const q=this.col,l=q.r*.3+q.g*.59+q.b*.11;q.setRGB(l*.78,l*.88,l)}fm.setColorAt(f,this.col);f++}}
    fm.count=f;fm.instanceMatrix.needsUpdate=true;if(fm.instanceColor)fm.instanceColor.needsUpdate=true},
  updateTrees(L){const tr=this.trees,hid=this.treeHidden;const ch=new Set();
    for(let i=0;i<tr.length;i++){const t=tr[i];const dx=Math.abs(t.x-L.x),dy=t.y-L.y;
      const hide=(dx<t.cr+30&&dy>-t.cr*.5&&dy<t.cr*1.2+120)?1:0;
      if(hide!==hid[i]){hid[i]=hide;for(const [m,idx] of this.treeParts[i]){const a=m.instanceMatrix.array,b=m.userData.base,o=idx*16;if(hide){for(let j=0;j<16;j++)a[o+j]=0}else for(let j=0;j<16;j++)a[o+j]=b[o+j];ch.add(m)}}}
    for(const m of ch)m.instanceMatrix.needsUpdate=true},
  toScreen(x,y,z){const v=this.v.set(x,y,z).project(this.cam);return{x:(v.x+1)/2*W,y:(1-v.y)/2*H,ok:v.z<1}},
  // screen pixel -> point on the ground plane at the camera target's height (mouse aiming on PC)
  toGround(sx,sy){const o=this.cam.position,d=new THREE.Vector3(sx/W*2-1,1-sy/H*2,.5).unproject(this.cam).sub(o).normalize();const h=this.ly||0;if(Math.abs(d.y)<1e-4)return{x:this.tx,y:this.ty};const t=(h-o.y)/d.y;return{x:o.x+d.x*t,y:o.z+d.z*t}},
  menuFrame(dt){this.kkLoad();if(window.__noMenu)return;$('gl').style.visibility='visible';if(!this.menuReady){if(!this.menuQueued){this.menuQueued=1;this.menuSeed=Math.floor(Math.random()*1e9);setTimeout(()=>{if(state!=='menu'&&state!=='lobby')return;try{setupWorld(this.menuSeed);this.buildWorld();this.menuReady=1}catch(e){console.warn(e)}},700)}return}
    if(this.world!==WD){this.menuReady=0;this.menuQueued=0;return}
    this.t+=dt;const T=this.t;const V=WD.villages.find(v=>v.main)||{x:CX,y:CY};const a=T*.05;const px=V.x+Math.cos(a)*900,py=V.y+Math.sin(a)*500;
    this.U.fowC.value.set(px,py);this.U.fowR.value=99999;this.U.time.value=T;this.U.zone.value.set(CX,CY,99999);this.U.zoneN.value.z=-1;if(this.zoneWall)this.zoneWall.visible=false;this.U.cloud.value=1;
    this.cam.position.set(px,700,py+600);this.cam.lookAt(px,0,py);this.sun.position.set(px-600,1300,py+420);this.sun.target.position.set(px,0,py);
    this.updateGround(px,py);this.stepP(this.PA,dt);this.stepP(this.PB,dt);for(const m of this.mills)m.hub.rotation.z+=dt*m.sp;this.draw()},
  frame(dt){
    if(!this.ok)return draw2D();this.sync();this.kkLoad();
    ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
    if(H>W*1.05){ctx.fillStyle='#0a1214';ctx.fillRect(0,0,W,H);ctx.fillStyle='#ffd35a';ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.fillText('📱 หมุนมือถือเป็นแนวนอน',W/2,H/2);return}
    this.t+=dt;const T=this.t,me=ME(),L=listener()||me;if(!L)return;const G=this.G;
    const k=1-Math.pow(.0008,dt);this.tx=this.tx?lerp(this.tx,L.x,k):L.x;this.ty=this.ty?lerp(this.ty,L.y,k):L.y;if(Math.hypot(this.tx-L.x,this.ty-L.y)>900){this.tx=L.x;this.ty=L.y}
    const gyL=Math.max(this.gY(this.tx,this.ty),-8);this.ly=this.ly===undefined?gyL:lerp(this.ly,gyL,1-Math.pow(.02,dt));
    const D=(camNear?.76:1)*1060*(W/H<1.6?1.16:1),el=camNear?1.04:1.0;const sx=(Math.random()-.5)*shakeA,sy=(Math.random()-.5)*shakeA;
    this.cam.position.set(this.tx+sx,this.ly+Math.sin(el)*D+sy,this.ty+Math.cos(el)*D);this.cam.lookAt(this.tx+sx,this.ly,this.ty);
    // day / night / dusk
    const dk=this.dayK(),du=this.duskK(),inCave=WD.caves.some(c=>dist(L,c)<c.R+6)||inDG(L);
    this.sun.color.copy(this.c1.set('#8aa4ff')).lerp(this.c2.set('#fff0d8'),dk).lerp(this.c2.set('#ffb070'),du*.6);this.sun.intensity=lerp(inCave?.2:.8,inCave?.35:2.8,dk);
    this.hemi.color.copy(this.c1.set('#3a4a8a')).lerp(this.c2.set('#cfe4ff'),dk).lerp(this.c2.set('#ffc8a0'),du*.4);this.hemi.groundColor.copy(this.c1.set('#141020')).lerp(this.c2.set('#4a4030'),dk);this.hemi.intensity=inCave?.5:lerp(.9,1.25,dk);this.plight.intensity=(1-dk)*420+(inCave?260:0);this.plight.position.set(L.x,this.ly+150,L.y);
    if(TOON&&!inCave){this.hemi.color.lerp(this.c2.set('#b4bcff'),dk*.75);this.hemi.groundColor.lerp(this.c2.set('#9a90b8'),dk*.7);this.hemi.intensity*=1.12;this.sun.color.lerp(this.c2.set('#fff6e4'),dk*.6);this.sun.intensity*=.92}
    this.scene.fog.color.copy(this.c1.set('#0c1428')).lerp(this.c2.set('#a8c4dc'),dk).lerp(this.c2.set('#e8b890'),du*.5);if(moody){this.sun.intensity*=lerp(.8,.5,dk);this.hemi.intensity*=lerp(.85,.55,dk);this.scene.fog.color.lerp(this.c1.set('#14161a'),lerp(.35,.74,dk));if(!inCave)this.plight.intensity+=dk*170}
    this.scene.fog.density=moody?.00017:.000085;if(CURSED)REG.atmo(this,L,dk,inCave);this.scene.background.copy(this.scene.fog.color);
    this.sun.position.set(this.tx-560,this.ly+1300,this.ty+420);this.sun.target.position.set(this.tx,this.ly,this.ty);
    {const sr=Math.round(Math.min(1500,D/805*820*Math.max(1,W/H/1.78)*1.1+100)/50)*50,sc=this.sun.shadow.camera;if(sc.right!==sr){sc.left=sc.bottom=-sr;sc.right=sc.top=sr;sc.updateProjectionMatrix()}}   // shadow map hugs what the camera sees: sharper shadows
    this.staticGlow.material.uniforms.k.value=lerp(1.25,.45,dk);this.staticGlow.material.uniforms.scale.value=H*this.renderer.getPixelRatio()/2;
    const night=1-dk;this.winMat.emissiveIntensity=night*1.6+du*.6;this.lampMat.emissiveIntensity=.3+night*1.8;
    if(this.bloom)this.bloom.strength=lerp(.62,.22,dk);this.stepBoxes(dt);
    const U=this.U;U.fowC.value.set(L.x,L.y);U.fowR.value=visionR();U.fowDark.value=lerp(.3,.46,dk);U.zone.value.set(zone.x,zone.y,Math.max(1,zone.r));U.time.value=T;U.cloud.value=dk;
    for(const r of this.roofs){const h=r.h;const occ=L.x>h.x-60&&L.x<h.x+h.w+60&&L.y<h.y+40&&h.y-L.y<260;r.occ=lerp(r.occ===undefined?1:r.occ,occ?.18:1,Math.min(1,dt*6));const a=Math.min(h.roofA,r.occ);r.g.visible=a>.03;for(const m of r.mats){m.opacity=a;m.depthWrite=a>.95}}
    for(const d of this.domes){d.dm.visible=d.c.roofA>.5}
    for(const s of this.shrines){s.orb.position.y=58+Math.sin(T*2+s.s.x)*6;s.orb.rotation.y=T}
    for(const m of this.mills)m.hub.rotation.z+=dt*m.sp;for(const b of this.banners)b.cl.rotation.x=Math.sin(T*2.3+b.g.position.x)*.15;for(const f of this.flags)f.rotation.y=Math.sin(T*4+f.userData.ph)*.4;
    if(this.waterN)this.waterN.offset.set(T*.004,-T*.01);if(this.falls){this.falls.offset.y=-T*.9;this.falls2.offset.y=-T*1.5}
    this.updateTrees(L);this.updateGround(this.tx,this.ty);
    const zr=Math.max(1,zone.r);this.zoneWall.visible=true;this.zoneWall.position.set(zone.x,250,zone.y);this.zoneWall.scale.set(zr,1,zr);this.zoneWall.material.opacity=.11+.04*Math.sin(T*2);
    U.zoneN.value.set(zone.tx,zone.ty,zone.st!=='done'?Math.max(1,zone.tr):-1);
    // units
    const seen=new Set();
    for(const u of units){seen.add(u.id);let o=this.objs.get(u.id);const vis=!u.dead&&unitVisibleTo(u,me,L);
      if(o&&o.dieT>0&&o.celestial){this.celestialDie(o,dt);continue}if(o&&o.dieT>0&&o.qn){this.qnDie(o,dt);continue}if(o&&o.dieT>0&&(o.kind==='kk'||o.kind==='kkz')){this.kkDie(o,dt);continue}
      if(o&&o.dieT>0){o.dieT-=dt;const kk=1-o.dieT/1.4;o.root.visible=o.dieT>0;o.body.rotation.x=-Math.min(1.45,kk*3);o.root.position.y=o.gy-Math.max(0,kk-.6)*40;continue}
      if(!o){if(!vis)continue;o=this.objFor(u)}o.root.visible=vis;if(!vis){o.lx=u.x;o.ly=u.y;continue}
      const mv=Math.hypot(u.x-o.lx,u.y-o.ly)/Math.max(dt,.001);o.lx=u.x;o.ly=u.y;o.gy=this.gY(u.x,u.y);o.root.position.set(u.x,o.gy,u.y);
      const want=Math.atan2(u.fx,u.fy);let dr=want-o.rot;dr=Math.atan2(Math.sin(dr),Math.cos(dr));o.rot+=dr*Math.min(1,dt*14);o.root.rotation.y=o.rot;
      const moving=mv>25&&!u.dash&&!u.leap;o.walk+=dt*(moving?Math.min(16,mv/15):0);o.mvK=lerp(o.mvK,moving?1:0,Math.min(1,dt*10));
      if(u.hero&&o.kind!=='kk'&&!o.qn&&!o.celestial){if(o.at!==u.at){this.dress(o,u.at,u.look);o.at=u.at}if(o.wk!==u.wk||o.wt!==u.wt){this.arm(o,u);o.wk=u.wk;o.wt=u.wt}}
      o.body.rotation.x=0;if(o.celestial)this.celestialAnim(o,u,T,dt,mv);else if(o.qn)this.qnAnim(o,u,T,dt,mv);else if(o.kind==='kk')this.animKK(o,u,T,dt,mv);else if(o.kind==='kkz')this.animKKZ(o,u,T,dt,mv);else if(o.kind==='hero')this.animHum(o,u,T,dt);else if(o.kind==='wolf')this.animWolf(o,u,T);else if(o.kind==='dragon')this.animDragon(o,u,T,dt);else this.animBig(o,u,T);
      const sq=u.hurtT>0?.9:1;o.body.scale.set(1+(1-sq)*.5,sq,1+(1-sq)*.5);
      o.ring.visible=u===me||!!u.hero;if(o.ring.visible)o.ring.material=u===me?this.bas('#46e046',{transparent:true,opacity:.85,depthWrite:false}):allyOf(u,me)?this.bas('#3d9cff',{transparent:true,opacity:.8,depthWrite:false}):this.bas('#ff4a3a',{transparent:true,opacity:.5,depthWrite:false});
      if(o.eyes&&u.mob&&!u.zombie){const n=isNight();if(o.nightEye!==n){o.nightEye=n;for(const e of o.eyes){if(!e.userData.dayM)e.userData.dayM=e.material;e.material=n?this.glowM('#ff2a1a',1):e.userData.dayM;e.scale.multiplyScalar(n?1.35:1/1.35)}}}
      if(o.jaw&&o.kind==='wolf')o.jaw.rotation.x=u.atkAnim>0?.55:.12+Math.sin(T*2+u.id)*.06;if(o.ember)o.ember.material.opacity=.35+.25*Math.sin(T*3);
      o.fxRing.visible=!!(u.slowT>0||u.buffT>0||u.aegis);if(o.fxRing.visible){o.fxRing.material.color.set(u.aegis?'#ffd35a':u.slowT>0?'#8fe3ff':'#ffb070');o.fxRing.material.opacity=u.aegis?.6+.3*Math.sin(T*4):.7}
      o.ice.visible=u.rootT>0;o.stars.visible=u.stunT>0;o.stars.rotation.y=T*5;o.bubble.visible=u.shieldHp>0;if(o.bubble.visible)o.bubble.material.opacity=.14+.06*Math.sin(T*6);
      if(u.burnT>0&&Math.random()<dt*20)this.sp(true,{x:u.x+rand(-14,14),y:o.gy+rand(10,70),z:u.y+rand(-14,14),vy:rand(40,90),l:.45,s:20,s1:5,c:'#ffd070',c2:'#ff3a10',sp:3});
      if(u.slowT>0&&Math.random()<dt*6)this.sp(true,{x:u.x+rand(-16,16),y:o.gy+rand(20,80),z:u.y+rand(-16,16),vy:-20,l:.8,s:8,s1:3,c:'#dff8ff',sp:4});
      if(u.aegis&&Math.random()<dt*8)this.sp(true,{x:u.x+rand(-20,20),y:o.gy+rand(0,30),z:u.y+rand(-20,20),vy:rand(40,90),l:.8,s:8,s1:2,c:'#ffe27a',sp:1});
      if(u.hero&&o.wglow&&Math.random()<dt*(o.wt>=3?10:5)){const h=(o.wpnR||o.wpnL);if(h){h.getWorldPosition(this.v);this.sp(true,{x:this.v.x+rand(-6,6),y:this.v.y+rand(-4,14),z:this.v.z+rand(-6,6),vy:rand(10,40),l:.6,s:9,s1:2,c:o.wglow,sp:o.wk==='frost'?4:o.wk==='fire'?3:1})}}
      if(u.hero&&u.at===4&&Math.random()<dt*6)this.sp(true,{x:u.x+rand(-14,14),y:o.gy+rand(30,80),z:u.y+rand(-14,14),vy:40,l:.5,s:10,s1:2,c:'#ff8a2a',sp:3});
      if(u.spinT>0||u.lotusT>0){if(!o.spinTr||o.spinTr<=0){o.spinTr=.12;this.trail(u,o.rot*-1+Math.PI/2+T*20,u.spinT>0?200:u.r+90,u.spinT>0?'#ffe0b0':'#ff9ad8',u.spinT>0?1:2,.2)}o.spinTr-=dt;
        if(u.lotusT>0&&Math.random()<dt*40){const a=Math.random()*6.28,r=rand(40,300);this.sp(true,{x:u.x+Math.cos(a)*r,y:o.gy+40,z:u.y+Math.sin(a)*r,l:.25,s:36,s1:8,c:'#ff7ad0',sp:1,vr:9})}}
      if(u.invisT>0){o.root.visible=u===me||dist(u,L)<170;if(u===me)o.body.position.x=Math.sin(T*30)*.6}
      if(u.dash&&Math.random()<dt*30)this.sp(false,{x:u.x,y:o.gy+40,z:u.y,l:.3,s:50,s1:30,c:'#b8a888',a:.25,sp:2})}
    for(const [id,o] of this.objs)if(!seen.has(id)){this.scene.remove(o.root);this.objs.delete(id)}
    // items
    const live=new Set();
    for(const it of items){live.add(it.id);let g=this.itemObjs.get(it.id);if(!g){g=this.itemObj(it);this.itemObjs.set(it.id,g)}
      if(g.userData.spin){g.userData.spin.rotation.y=T*1.6;g.userData.spin.position.y=(it.k==='r'?14:it.k==='a'?34:0)+Math.sin(T*3+it.id)*4}if(g.userData.bob)g.userData.bob.position.y=28+Math.sin(T*3+it.id)*4;
      g.visible=!(it.cave!==undefined&&WD.caves[it.cave].roofA>.5)&&!(it.house!==undefined&&WD.houses[it.house].roofA>.6)&&Math.hypot(it.x-L.x,it.y-L.y)<visionR()+80;
      if(g.visible&&(it.k==='w'&&it.tier>=2||it.k==='a')&&Math.random()<dt*6)this.sp(true,{x:it.x+rand(-14,14),y:g.position.y+rand(10,50),z:it.y+rand(-14,14),vy:40,l:.8,s:8,s1:2,c:itemColor(it),sp:1})}
    for(const [id,g] of this.itemObjs)if(!live.has(id)){this.scene.remove(g);g.traverse(o=>{if(o.userData.ownMat&&o.material)o.material.dispose()});this.itemObjs.delete(id)}
    for(const f of flies){if(Math.random()<dt*1.5){const a=.45+.45*Math.sin(f.ph);this.sp(true,{x:f.x,y:this.gY(f.x,f.y)+40+Math.sin(f.ph*.7)*20,z:f.y,vx:f.vx,vz:f.vy,l:1.2,s:9,s1:9,c:f.c,a:a*(1-dk*.6),sp:0,fi:.3,dr:0})}}
    // atmosphere: drifting pollen and dust motes by day, low mist rolling over the ground at night
    {const gyL=this.ly||0;if(dk>.55){if(Math.random()<dt*14)this.sp(true,{x:L.x+rand(-1000,1000),y:gyL+rand(30,180),z:L.y+rand(-750,550),vx:rand(-14,14),vz:rand(-10,10),vy:rand(-4,8),l:rand(3,5),s:3.5,s1:3.5,c:Math.random()<.7?'#fff2c0':'#e8ffd0',a:.55*dk,sp:0,fi:.3,dr:0})}
      else if(this.hi&&Math.random()<dt*5)this.sp(false,{x:L.x+rand(-1200,1200),y:gyL+rand(10,34),z:L.y+rand(-900,650),vx:rand(-22,22),vz:rand(-12,12),vy:rand(0,3),l:rand(4.5,7),s:170,s1:290,c:'#a8bcd8',a:.09,sp:2,dr:.04})}
    if(isNight()&&this.graveFx)for(const g of this.graveFx){if(Math.abs(g.x-L.x)>1700||Math.abs(g.y-L.y)>1300)continue;if(Math.random()<dt*7)this.sp(false,{x:g.x+rand(-170,170),y:this.gY(g.x,g.y)+rand(5,25),z:g.y+rand(-170,170),vx:rand(-15,15),vz:rand(-15,15),vy:rand(2,8),l:rand(2,3.5),s:60,s1:150,c:'#8affa0',a:.16,sp:2,dr:.2})}
    this.effects(T,dt,me,L);this.stepP(this.PA,dt);this.stepP(this.PB,dt);this.stepDecals(dt);this.stepTrails(dt);
    this.draw();
    this.overlay(me,L);drawHUD();
  },
  animHum(o,u,T,dt){const k=o.mvK,ph=o.walk,s=Math.sin(ph);const A=o.arms;const R=A[0],Lh=A[1];
    if(o.legs&&o.legs.length){o.legs[0].hip.rotation.x=-s*.72*k;o.legs[1].hip.rotation.x=s*.72*k;o.legs[0].knee.rotation.x=Math.max(0,s)*1.0*k+.05;o.legs[1].knee.rotation.x=Math.max(0,-s)*1.0*k+.05}
    let by=Math.abs(Math.cos(ph))*2.4*k+Math.sin(T*2.2+u.id)*.4*(1-k);
    const st=o.style||'fist';const atk=clamp(u.atkAnim/.28,0,1),p=1-atk,cst=clamp(u.castAnim/.4,0,1);
    // rest poses [shoulderX, shoulderZ, elbow] for right(0) and left(1)
    const RP={sword:[[-.35,.12,-.55],[-.55,-.3,-1.15]],axe:[[-.62,.3,-.95],[-.78,-.48,-1.0]],dagger:[[-.35,.18,-1.05],[-.35,-.18,-1.05]],bow:[[.1,.08,-.2],[-.3,-.1,-.25]],fire:[[-.25,.12,-1.25],[.1,-.1,-.2]],frost:[[-.25,.12,-1.25],[.1,-.1,-.2]],fist:[[-.5,.2,-1.7],[-.5,-.2,-1.7]],spear:[[-.4,.1,-.9],[.1,-.1,-.2]],club:[[-.3,.15,-.6],[.15,-.1,-.3]]}[st]||[[0,0,-.3],[0,0,-.3]];
    let r=RP[0].slice(),l=RP[1].slice();const free=(a,sgn)=>{a[0]+=sgn*s*.55*k};
    if(st==='bow'||st==='fire'||st==='frost'||st==='spear'||st==='club')free(l,1);if(st==='bow')free(r,-1);
    let tw=0,lean=0;
    if(atk>0){
      if(st==='sword'||st==='club'||st==='spear'){if(p<.35){const q=p/.35;r=[lerp(r[0],-2.6,q),lerp(r[1],.6,q),lerp(r[2],-.6,q)];tw=-.35*q}else{const q=(p-.35)/.65;r=[lerp(-2.6,-.25,q),lerp(.6,-.5,q),-.3];tw=lerp(-.35,.55,q)}}
      else if(st==='axe'){if(p<.4){const q=p/.4;r=[lerp(r[0],-3,q),.2,-.3];l=[lerp(l[0],-3,q),-.2,-.3];lean=-.1*q}else{const q=(p-.4)/.6;r=[lerp(-3,-.5,q),.2,-.2];l=[lerp(-3,-.6,q),-.2,-.3];lean=lerp(-.1,.38,q)}}
      else if(st==='dagger'||st==='fist'){const left=(u.atkK||0)%2===1;const a=left?l:r;const q=Math.sin(p*Math.PI);a[0]=lerp(a[0],-1.55,q);a[2]=lerp(a[2],-.05,q);tw=(left?-1:1)*.3*q}
      else if(st==='bow'){l=[-1.5,-.05,-.05];r=[-1.45,.25,lerp(-1.7,-.4,p)]}
      else if(st==='fire'||st==='frost'){r=[lerp(r[0],-1.4,Math.sin(p*Math.PI)),.1,lerp(r[2],-.35,Math.sin(p*Math.PI))];l=[-1.1*Math.sin(p*Math.PI),-.2,-.4]}}
    else if(st==='bow'&&u.atkCd!==undefined&&(net.mode!=='client'?u.atkCd>-1.2:false)){l=[-1.5,-.05,-.05];r=[-1.45,.25,-1.65]}
    if(cst>0){const q=cst;if(st==='fire'||st==='frost'){r=[lerp(r[0],-2.9,q),r[1],lerp(r[2],-.15,q)];l=[lerp(l[0],-2.2,q),-.5*q,-.4]}else if(st==='sword'&&u.shieldHp>0){l=[lerp(l[0],-1.5,q),-.2,-.6]}else{r=[lerp(r[0],-2.7,q),.4*q,r[2]];l=[lerp(l[0],-2.7,q),-.4*q,l[2]]}}
    if(u.spinT>0){r=[-1.3,1.45,-.2];l=[-1.3,-1.45,-.2];o.body.rotation.y=(o.body.rotation.y+dt*22)%(Math.PI*2)}
    else if(u.lotusT>0){r=[-.4,1.5,-.1];l=[-.4,-1.5,-.1];o.body.rotation.y=(o.body.rotation.y+dt*26)%(Math.PI*2);by+=6}
    else o.body.rotation.y=0;
    if(u.leap){if(o.leapT===undefined||o.leapT<0)o.leapT=0;o.leapT+=dt;const q=Math.min(1,o.leapT/.55);by+=Math.sin(Math.PI*q)*140;r=[lerp(-3,-.3,q*q),.3,-.2];l=[-1.2,-.4,-1];lean=lerp(-.25,.4,q)}else o.leapT=-1;
    if(u.dash){lean=.42;r[0]=Math.max(r[0],.3);if(st==='sword'){l=[-1.4,-.1,-.5]}}
    if(u.kb)lean=-.35;
    R.sh.rotation.set(r[0],0,r[1]);R.el.rotation.x=r[2];Lh.sh.rotation.set(l[0],0,l[1]);Lh.el.rotation.x=l[2];
    o.torso.rotation.y=Math.sin(ph)*.08*k+tw;o.torso.rotation.x=(o.baseLean||0)+lean*.6+.06*k;o.body.position.y=by;
    if(o.cape){o.cape.rotation.x=.12+.55*k+Math.sin(T*3+u.id)*.06+(u.dash?.6:0);}
    if(o.head)o.head.rotation.z=u.stunT>0?Math.sin(T*6)*.25:0;
    if(o.wtip&&(u.castAnim>0||u.atkAnim>0)&&Math.random()<.5){o.wtip.getWorldPosition(this.v);this.sp(true,{x:this.v.x,y:this.v.y,z:this.v.z,vy:30,l:.35,s:22,s1:4,c:o.wk==='fire'?'#ffb050':'#bfefff',sp:o.wk==='fire'?3:4})}},
  animWolf(o,u,T){const k=o.mvK,ph=o.walk*1.3;o.legs.forEach((l,i)=>{l.rotation.x=Math.sin(ph+(i===0||i===3?0:Math.PI))*.75*k});o.body.position.y=Math.abs(Math.sin(ph))*2*k;o.tail.rotation.z=Math.sin(T*6)*.35;
    o.head.rotation.x=u.atkAnim>0?-.35:Math.sin(T*1.5+u.id)*.05;o.body.position.z=u.atkAnim>0?6:0},
  animBig(o,u,T){const k=o.mvK,ph=o.walk*.7;o.body.position.y=Math.abs(Math.sin(ph))*3*k+Math.sin(T*1.6+u.id)*1.2;o.body.rotation.z=Math.sin(ph)*.05*k;
    const atk=clamp(u.atkAnim/.3,0,1);if(o.armR){o.armR.rotation.x=-atk*2.2+Math.sin(ph)*.3*k;o.armL.rotation.x=-Math.sin(ph)*.3*k}},
  animDragon(o,u,T,dt){const k=o.mvK,ph=o.walk*.6;o.body.position.y=Math.sin(T*1.4)*3+Math.abs(Math.sin(ph))*4*k;o.legs.forEach((l,i)=>{l.rotation.x=Math.sin(ph+(i===0||i===3?0:Math.PI))*.5*k});
    const br=u.castAnim>.8,atk=clamp(u.atkAnim/.3,0,1);o.tsegs.forEach((s,i)=>{s.rotation.y=Math.sin(T*2-i*.6)*.18;s.rotation.x=-.06});
    o.nsegs.forEach((s,i)=>{s.rotation.x=(br?.12:-.08)+Math.sin(T*1.3+i)*.04+(atk>0?atk*.18:0)});o.head.rotation.x=br?.25:atk*.4;o.jaw.rotation.x=br?.6:atk*.5+Math.max(0,Math.sin(T*.7))*.08;
    const flap=u.castAnim>0&&!br?Math.sin(T*14)*.7:Math.sin(T*1.6)*.12;o.wings.forEach(w=>{w.w.rotation.z=w.s*(-.25+flap);w.w.rotation.y=w.s*-.2});
    if(br&&Math.random()<.9){o.head.getWorldPosition(this.v);const a=o.rot;const dx=Math.sin(a),dz=Math.cos(a);for(let i=0;i<4;i++)this.sp(true,{x:this.v.x+dx*30,y:this.v.y-6,z:this.v.z+dz*30,vx:dx*rand(500,800)+rand(-90,90),vy:rand(-120,-30),vz:dz*rand(500,800)+rand(-90,90),l:.6,s:30,s1:120,c:'#ffe08a',c2:'#ff2a00',sp:3,dr:1})}},
  overlay(me,L){
    for(const u of units){if(u.dead||!unitVisibleTo(u,me,L))continue;if(u.mob&&u.hp>=u.maxHp)continue;if(u.invisT>0&&u!==me&&dist(u,L)>170)continue;
      const top=u.hero?(this.qn?(camNear?158:146):camNear?162:138):u.boss?280:u.zombie||u.undead?(u.lord?170:u.big?150:112):u.kind==='ogre'?158:u.golem?(u.kind==='guardian'?172:146):u.kind==='wolf'?68:74;const o=this.objs.get(u.id);
      const p=this.toScreen(u.x,(o?o.gy:0)+top+(o&&o.body?o.body.position.y:0),u.y);if(!p.ok||p.x<-80||p.x>W+80||p.y<-40||p.y>H+40)continue;drawBars(p.x,p.y,u,me,clamp(UI.s*.95,.8,1.15))}
    ctx.textAlign='center';
    const ts=clamp(UI.s,.8,1.2);for(const h of hitFl){const p=this.toScreen(h.x,this.gY(h.x,h.y)+62,h.y);if(p.ok)drawHitFlash(h,p.x,p.y,ts)}
    for(const t of texts){const p=this.toScreen(t.x,this.gY(t.x,t.y)+100,t.y);if(p.ok)drawFloatText(t,p.x,p.y,ts)}
    ctx.globalAlpha=1;
    const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.45,W/2,H/2,Math.max(W,H)*.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.28)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    if(me&&!me.dead&&Math.hypot(me.x-zone.x,me.y-zone.y)>zone.r){const g2=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.7);g2.addColorStop(0,'rgba(140,40,220,0)');g2.addColorStop(1,'rgba(140,40,220,.45)');ctx.fillStyle=g2;ctx.fillRect(0,0,W,H)}
  }
});
function G_half(r){return r.G.half}
