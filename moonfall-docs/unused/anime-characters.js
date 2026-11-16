/* Anime character art. Keeps the game's original rigs, hitboxes and animation clips. */
window.installAnimeCharacters = function installAnimeCharacters(P) {
  if (P.animeCharacters) return;
  P.animeCharacters = true;
  const T = THREE;
  const palettes = [
    {hair:'#c9e9ff', shade:'#7794d1', eye:'#23bcdb', cloth:'#334a91'},
    {hair:'#f4badb', shade:'#ad629d', eye:'#946cff', cloth:'#663879'},
    {hair:'#f8dc99', shade:'#c79258', eye:'#3eaf96', cloth:'#386a66'},
    {hair:'#b6a5ed', shade:'#62538c', eye:'#dc8fef', cloth:'#46457d'},
    {hair:'#ef9d8f', shade:'#a65466', eye:'#e7a03d', cloth:'#7a3d5b'},
    {hair:'#e7f6ee', shade:'#79b3ab', eye:'#4a94e0', cloth:'#315a76'},
    {hair:'#6d81b3', shade:'#34395d', eye:'#65e4cf', cloth:'#2e4566'},
    {hair:'#d2b9ec', shade:'#8e67b0', eye:'#ef759e', cloth:'#57406f'}
  ];
  const geo = (renderer, key, make) => {
    const k = 'anime-character-' + key;
    let g = renderer.geoC.get(k);
    if (!g) { g = make(); renderer.geoC.set(k, g); renderer.cachedGeos.add(g); }
    return g;
  };
  // One shaped lock shared by every head: broad at its root, a curved tapered tip.
  function hairLock() {
    const vertices = [], indices = [];
    const rings = [[0,.65,0,.4,.22],[0,.32,.045,.5,.3],[.04,-.12,.12,.36,.26],[.1,-.65,.23,.018,.015]];
    for (const [x,y,z,w,d] of rings) {
      for (let i=0;i<6;i++) { const a=i*Math.PI/3; vertices.push(x+Math.cos(a)*w,y,z+Math.sin(a)*d); }
    }
    for (let r=0;r<3;r++) for (let i=0;i<6;i++) {
      const a=r*6+i,b=r*6+(i+1)%6,c=a+6,d=b+6; indices.push(a,b,c,b,d,c);
    }
    indices.push(0,2,1,0,3,2,0,4,3,0,5,4,18,19,20,18,20,21,18,21,22,18,22,23);
    const g = new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  function material(renderer,c,skin) {
    return renderer.cached('anime-char-mat-'+c+(skin?'skin':''),()=>renderer.fow(new T.MeshToonMaterial({color:c,emissive:skin?'#5e3442':'#15112c',emissiveIntensity:skin?.08:.055}),{key:'animechar'}));
  }
  function iris(renderer, colour) {
    return renderer.cached('anime-eye-'+colour,()=>{
      const c=document.createElement('canvas');c.width=128;c.height=160;const x=c.getContext('2d');
      x.clearRect(0,0,128,160);x.fillStyle='#221c3b';x.beginPath();x.ellipse(64,80,62,78,0,0,Math.PI*2);x.fill();
      x.fillStyle='#fff9f5';x.beginPath();x.ellipse(64,86,55,65,0,0,Math.PI*2);x.fill();
      const g=x.createLinearGradient(0,38,0,142);g.addColorStop(0,'#242342');g.addColorStop(.4,colour);g.addColorStop(1,'#d0fff1');x.fillStyle=g;x.beginPath();x.ellipse(66,91,31,53,0,0,Math.PI*2);x.fill();
      x.fillStyle='#1c2240';x.beginPath();x.ellipse(66,80,11,34,0,0,Math.PI*2);x.fill();
      x.fillStyle='#ffffff';x.beginPath();x.ellipse(51,55,13,19,.3,0,Math.PI*2);x.fill();x.beginPath();x.ellipse(82,114,6,9,.3,0,Math.PI*2);x.fill();
      x.strokeStyle='#211a35';x.lineWidth=13;x.lineCap='round';x.beginPath();x.moveTo(4,49);x.quadraticCurveTo(57,0,117,34);x.stroke();
      const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.minFilter=T.LinearFilter;
      return renderer.fow(new T.MeshBasicMaterial({map,transparent:true,alphaTest:.03,side:T.DoubleSide,depthWrite:false}),{key:'anime-eye'});
    });
  }
  P.animeHead = function(parent,u,scale) {
    const p=palettes[(u.look|0)%palettes.length],fem=!!(u.look%2),head=new T.Group();
    head.name='anime-head';head.userData.animeHead=true;head.scale.setScalar(scale);parent.add(head);
    const skin=material(this,SKIN[(u.id*3)%4]||'#f2ceb7',true),ink=material(this,'#362b4b'),hair=material(this,p.hair),shade=material(this,p.shade),gold=material(this,'#f7df9a');
    const sphere=geo(this,'sphere',()=>new T.SphereGeometry(1,16,12)),plane=geo(this,'eye-plane',()=>new T.PlaneGeometry(1,1)),lock=geo(this,'hair-lock',hairLock);
    const mesh=(g,m,x,y,z,sx,sy,sz,par)=>this.mesh(g,m,x,y,z,sx,sy,sz,par||head,true);
    mesh(sphere,skin,0,.105,.008,.132,.174,.115);
    const dome=geo(this,'hair-dome',()=>new T.SphereGeometry(1,18,12,0,Math.PI*2,0,Math.PI*.59));
    mesh(dome,shade,0,.123,-.006,.145,.18,.128);
    const hairGroup=new T.Group();hairGroup.name='anime-layered-hair';head.add(hairGroup);
    for (let i=0;i<5;i++) {
      const k=i-2, m=mesh(lock,i%2?shade:hair,k*.047,.225-Math.abs(k)*.012,.089,.078,.095+Math.abs(k)*.008,.09,hairGroup);
      m.rotation.z=k*-.22;m.rotation.y=k*-.14;
    }
    for(const s of [-1,1]) {
      const side=mesh(lock,hair,s*.133,.14,-.006,.068,.19,.105,hairGroup);side.rotation.z=s*.12;
      for(let i=0;i<2;i++) {const m=mesh(lock,i?hair:shade,s*(.074+i*.038),.147,-.104,.085,.19+i*.02,.09,hairGroup);m.rotation.z=-s*(.08+i*.12);}
      const e=mesh(plane,iris(this,p.eye),s*.052,.11,.119,.078,.082,1);e.name='anime-eye';e.castShadow=false;e.rotation.y=s*.2;
      mesh(sphere,skin,s*.132,.095,.005,.024,.04,.022);
    }
    if(fem) {
      for(const s of [-1,1]) {const tail=mesh(lock,hair,s*.151,.075,-.115,.12,.24,.11,hairGroup);tail.rotation.z=-s*.33;mesh(sphere,gold,s*.145,.225,-.1,.023,.019,.02);}
    } else {
      for(const s of [-1,1]) {const tuft=mesh(lock,hair,s*.1,.26,-.027,.075,.06,.085,hairGroup);tuft.rotation.z=s*1.6;}
    }
    mesh(sphere,skin,0,.055,.122,.012,.02,.018);
    const mouth=mesh(sphere,shade,0,.006,.111,.028,.004,.003);mouth.castShadow=false;
    // A small crystal replaces face-covering helmets, retaining a readable tier accent.
    const gem=mesh(geo(this,'gem',()=>new T.OctahedronGeometry(1)),gold,0,.218,.13,.016,.025,.012);gem.name='anime-circlet';
    // Static face and hair pieces share a handful of material batches. The two eye
    // planes stay separate for transparent sorting; the full head uses six draws.
    head.updateWorldMatrix(true,true);
    const inverse=new T.Matrix4().copy(head.matrixWorld).invert(),batches=new Map(),parts=[];
    head.traverse(m=>{if(m.isMesh&&m.name!=='anime-eye')parts.push(m);});
    for(const m of parts){
      const g=m.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,m.matrixWorld));
      if(!batches.has(m.material))batches.set(m.material,[]);
      batches.get(m.material).push(g);m.removeFromParent();
    }
    for(const [mat,list] of batches){
      const merged=this.merge(list),mesh=new T.Mesh(merged,mat);
      // Per-head batches are shared by all actors using this look. Registering the
      // geometry lets scene cleanup preserve it when a new world is generated.
      const key='anime-head-batch-'+(u.look|0)+'-'+(u.id*3%4)+'-'+mat.uuid;
      let cached=this.geoC.get(key);
      if(cached){merged.dispose();mesh.geometry=cached;}else{this.geoC.set(key,merged);this.cachedGeos.add(merged);}
      mesh.name='anime-head-surface';mesh.castShadow=true;head.add(mesh);
    }
    head.userData.drawCalls=batches.size+2;
    oMark(head,u);return head;
  };
  function oMark(head,u){head.userData.look=u.look|0;head.userData.style='cel-anime';}
  P.animeOutfit = function(o,u) {
    const parent=o.bones&&o.bones.spine_03||o.torso;if(!parent)return;
    const p=palettes[(u.look|0)%palettes.length],g=new T.Group();g.name='anime-outfit';g.userData.animeOutfit=true;parent.add(g);if(!o.bones){g.scale.setScalar(74);g.position.set(0,18,4);}
    const cloth=material(this,p.cloth),white=material(this,'#fff4e9'),gold=material(this,'#e9c784'),box=geo(this,'box',()=>new T.BoxGeometry(1,1,1));
    const add=(m,x,y,z,sx,sy,sz,rz)=>{const n=this.mesh(box,m,x,y,z,sx,sy,sz,g,true);n.rotation.z=rz||0;return n;};
    for(const s of [-1,1]) {add(white,s*.058,.137,.103,.065,.15,.024,-s*.35);add(gold,s*.116,.065,.105,.015,.21,.018,-s*.13);}
    add(cloth,0,.016,.107,.11,.22,.025);add(gold,0,-.15,.103,.29,.032,.04);
    const badge=this.mesh(geo(this,'gem',()=>new T.OctahedronGeometry(1)),material(this,p.eye),0,.105,.143,.026,.035,.018,g,true);badge.name='anime-vision-gem';
    o.animeOutfit=g;
  };
  const build=P.qnBuild;
  P.qnBuild=function(o,u) {
    build.call(this,o,u);
    for(const m of o.parts||[]) if(m.userData.part||/Head_Hood/i.test(m.name))m.visible=false;
    const bone=o.bones.Head||o.bones.head;
    if(bone){o.animeHead=this.animeHead(bone,u,1);this.animeOutfit(o,u);o.root.userData.animeCharacter=true;}
    if(this.outline)this.outline(o.root);
  };
  const gear=P.qnGear;
  if(gear)P.qnGear=function(o,u) {
    gear.call(this,o,u);
    const head=o.bones&&(o.bones.Head||o.bones.head||o.bones.neck_01);
    // The original high-tier helmet would cover the anime face and hair.
    for(const m of o.gear||[])if(m.parent===head)m.removeFromParent();
  };
  const hero=P.hero,dress=P.dress;
  P.hero=function(u) {
    const o=hero.call(this,u);
    for(const child of o.head.children)child.visible=false;
    o.animeHead=this.animeHead(o.head,u,74);o.animeHead.position.y=-8;
    this.animeOutfit(o,u);o.root.userData.animeCharacter=true;return o;
  };
  P.dress=function(o,at,look) {
    dress.call(this,o,at,look);
    if(o.animeHead){o.hair.visible=false;for(const m of o.armorParts||[])if(m.parent===o.head)m.visible=false;o.animeHead.visible=true;}
  };
};
