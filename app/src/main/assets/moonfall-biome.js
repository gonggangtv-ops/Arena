/* Moonfall nature is a visual adapter. World generation, heights, collision,
 * hiding bushes, navigation, combat and network state remain authoritative. */
window.installMoonfallBiome=function(P){
  'use strict';
  if(P.moonfallBiomeInstalled)return;
  P.moonfallBiomeInstalled=true;
  const T=THREE,A=CelestialAssets;
  const base={texture:P.genTex,fow:P.fow,vegetation:P.buildVegetation,rocks:P.buildRocks,ground:P.updateGround,draw:P.draw};
  let enabled=lsGet('ar_biome','moonfall')!=='classic';
  const random=p=>mulberry32(Math.floor(p.x*71+p.y*137+WD.seed));
  const protectedArea=p=>{
    const c=WD.castle;
    return(c&&p.x>c.x-35&&p.x<c.x+c.w+35&&p.y>c.y-35&&p.y<c.y+c.h+35)||inDG(p,80);
  };
  P.moonfallBiomeEnabled=()=>enabled;
  P.setMoonfallBiome=function(value){
    enabled=value==='moonfall';lsSet('ar_biome',enabled?'moonfall':'classic');
    // Rebuild visual resources only; retain the exact world and live units.
    this.world=null;if(this.ok&&WD?.tg)this.buildWorld();
  };
  P.genTex=function(key){
    if(['moon-blades','moon-leaves'].includes(key)){
      const result=base.texture.call(this,key==='moon-blades'?'blades':'leaves'),c=result.c||result,ctx=c.getContext('2d');
      const image=ctx.getImageData(0,0,c.width,c.height),d=image.data;
      for(let i=0;i<d.length;i+=4){const l=d[i]*.3+d[i+1]*.59+d[i+2]*.11;d[i]=l*.84;d[i+1]=l*.92;d[i+2]=l;}
      ctx.putImageData(image,0,0);return result;
    }
    if(!['moon-soil','moon-basalt','moon-dust'].includes(key))return base.texture.call(this,key);
    const c=this.cvs(256),f=this.fbm(421,8,4),grain=this.fbm(422,48,2),warp=this.fbm(423,4,3);
    this.pix(c,(u,v)=>{
      const n=f(u,v),g=grain(u,v),w=warp(u,v);
      if(key==='moon-soil'){const b=56+n*61+g*16;return[b*1.08,b*.87,b*.76];}
      if(key==='moon-dust'){const b=115+n*54+g*14;return[b*.89,b*.96,b*1.08];}
      // Periodic warped cells and grains produce fractured charcoal rock.
      const a=Math.abs(Math.sin((u*7+(w-.5)*.65)*Math.PI)),b=Math.abs(Math.sin((v*6+(w-.5)*.6)*Math.PI));
      const edge=Math.min(a,b),crack=1-clamp(edge/.09,0,1),l=72+n*56+g*20-crack*38;
      return[l*.88,l*.91,l];
    });
    return{c,norm:key==='moon-basalt'?2.2:1.1};
  };
  P.fow=function(material,options){
    if(enabled&&options?.key?.startsWith('terr')){
      const original=options.frag,c=WD.castle,d=WD.dg;
      const bounds=q=>q?new T.Vector4(q.x,q.y,q.x+q.w,q.y+q.h):new T.Vector4(-1,-1,-1,-1);
      const uniforms={...options.uniforms,tMoonSoil:{value:this.tex('moon-soil')},tMoonRock:{value:this.tex('moon-basalt')},
        tMoonDust:{value:this.tex('moon-dust')},uMoonTemple:{value:bounds(c)},uMoonDungeon:{value:bounds(d)}};
      options={...options,key:options.key+'-moonfall-nature',uniforms,frag:shader=>{
        shader=original(shader);
        return 'uniform sampler2D tMoonSoil,tMoonRock,tMoonDust;uniform vec4 uMoonTemple,uMoonDungeon;\n'+shader.replace('diffuseColor.rgb=c;',`
          float temple=step(uMoonTemple.x,w.x)*step(w.x,uMoonTemple.z)*step(uMoonTemple.y,w.y)*step(w.y,uMoonTemple.w);
          float dungeon=step(uMoonDungeon.x,w.x)*step(w.x,uMoonDungeon.z)*step(uMoonDungeon.y,w.y)*step(w.y,uMoonDungeon.w);
          vec3 soil=texture2D(tMoonSoil,w*.0058).rgb;
          vec3 basalt=texture2D(tMoonRock,w*.0035).rgb;
          float fracture=clamp(k+sp.r*.65+smoothstep(.53,.76,texture2D(uDetail,w*.0013).r)*.5,0.,1.);
          vec3 lunar=mix(soil,basalt,fracture);
          float dust=smoothstep(.58,.8,texture2D(uDetail,w*.00075+.23).r)*(1.-k)*.55;
          lunar=mix(lunar,texture2D(tMoonDust,w*.0062).rgb,dust);
          float nature=(1.-sp.g)*(1.-wt)*(1.-temple)*(1.-dungeon);
          ${typeof CURSED!=='undefined'&&CURSED?'{float ll=dot(lunar,vec3(.3,.59,.11));lunar=mix(lunar,vec3(ll)*vReg.rgb*1.15,vReg.a*.85);}':''}
          diffuseColor.rgb=mix(c,lunar,nature);`);
      }};
      material.userData.moonfallNature=true;
    }
    return base.fow.call(this,material,options);
  };
  function batch(renderer,key,items,place,register){
    const parts=renderer.celestialAsset(key);if(!parts||!items.length)return;
    renderer.biomeCounts.byAsset[key]=(renderer.biomeCounts.byAsset[key]||0)+items.length;
    for(const part of parts){
      const meshes=renderer.instC(part.geo,part.mat,items,place,renderer.hi,register,800);
      for(const m of meshes){if(key==='moon-silver-tree')m.receiveShadow=false;m.name='moonfall-'+key;m.userData.moonfallBiome=true;m.userData.biomeAsset=key;
        renderer.biomeBatches.push(m);}
    }
  }
  function coolColors(mesh,stride=1){
    const colors=mesh.instanceColor?.array,matrices=mesh.instanceMatrix.array,n=mesh.count;
    let count=0;
    for(let i=0;i<n;i+=stride){
      if(i!==count)matrices.copyWithin(count*16,i*16,(i+1)*16);
      if(colors){const l=colors[i*3]*.3+colors[i*3+1]*.59+colors[i*3+2]*.11;
        colors[count*3]=l*.78;colors[count*3+1]=l*.88;colors[count*3+2]=l;}
      count++;
    }
    mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  }
  P.buildVegetation=function(){
    this.biomeBatches=[];this.biomeCounts={trees:0,mountainTrees:0,rocks:0,byAsset:{}};
    if(!enabled)return base.vegetation.call(this);
    const RG=typeof REG!=='undefined'&&typeof CURSED!=='undefined'&&CURSED?REG:null,TS=[.55,.5,0,1,.9];
    const keyFor=t=>random(t)()<(RG?TS[RG.at(t.x,t.y)]:.52)?'moon-dead-tree':'moon-silver-tree';
    const tint=p=>RG?'#ffffff':null;
    const replacements=new Set(WD.trees.filter(t=>!protectedArea(t)&&this.celestialAsset(keyFor(t))));
    const mountain=new Set(WD.mtrees.filter(t=>!protectedArea(t)&&this.celestialAsset(keyFor(t))));
    const inst=this.instC,tex=this.tex;
    this.tex=function(key){return tex.call(this,key==='blades'?'moon-blades':key==='leaves'?'moon-leaves':key);};
    this.instC=function(geo,mat,items,...args){
      const meshes=inst.call(this,geo,mat,items.filter(p=>!replacements.has(p)&&!mountain.has(p)),...args);
      if(this.treeMats?.includes(mat)||mat.map===this.texC.get('moon-blades'))for(const m of meshes)coolColors(m);
      return meshes;
    };
    try{base.vegetation.call(this);}finally{this.instC=inst;this.tex=tex;}
    // Preserve gameplay hiding vegetation; only its color changes in this biome.
    for(const m of this.treeMats||[])m.color.set('#8b9aab');
    const register=(t,m,i)=>this.treeParts[t._i].push([m,i]);
    for(const key of ['moon-dead-tree','moon-silver-tree']){
      const items=[...replacements].filter(t=>keyFor(t)===key),size=A.get(key)?.inspection?.size;
      if(!size)continue;
      batch(this,key,items,(t,add)=>{
        const R=random(t),height=(t.cr*2+58)*t.h*(.9+R()*.18),s=height/size[1];
        add(t.x,this.gY(t.x,t.y)-2,t.y,size[0]*s,height,size[2]*s,0,R()*Math.PI*2,0,tint(t));
      },register);
      this.biomeCounts.trees+=items.length;
      // Mountain trees have no collision: reduce density on low quality.
      const distant=[...mountain].filter(t=>keyFor(t)===key&&(()=>{const R=random(t);R();return R()<(this.hi?.38:.13);})());
      batch(this,key,distant,(t,add)=>{const R=random(t),s=175*t.s/size[1];
        add(t.x,this.gY(t.x,t.y)-2,t.y,size[0]*s,size[1]*s,size[2]*s,0,R()*6.283,0,tint(t));});
      this.biomeCounts.mountainTrees+=distant.length;
    }
    // A visible root/stump always marks the authoritative trunk collision when
    // the original camera-occlusion logic hides a whole authored tree mesh.
    this.instC(this.G.cylT,this.std('#514a49',.96,0),[...replacements],(t,add)=>
      add(t.x,this.gY(t.x,t.y)+13,t.y,t.r,26,t.r,0,t.ph,0,null),this.hi);
    this.biomeCounts.treeCollidersRepresented=replacements.size;
    // Upright grass cards catch almost no light from above and read as black spikes: light them like the ground they stand on.
    if(this.gGrass){this.gGrass.material.color.set('#c9d2de');const nm=this.gGrass.geometry.attributes.normal;if(nm){for(let i=0;i<nm.count;i++)nm.setXYZ(i,0,1,0);nm.needsUpdate=true}}
    if(this.gFlow)this.gFlow.material.color.set('#a7b6c8');
  };
  P.updateGround=function(x,y){
    // Sparse, cool-toned ground cover. Thinning and tinting are done per tuft inside the base loop
    // (deterministic by tuft position) so the same tufts stay put while the hero walks.
    this.gThin=enabled?(this.hi?2:3):0;this.gCool=enabled;
    return base.ground.call(this,x,y);
  };
  P.buildRocks=function(){
    if(!enabled)return base.rocks.call(this);
    const RG=typeof REG!=='undefined'&&typeof CURSED!=='undefined'&&CURSED?REG:null;
    const keyFor=r=>random(r)()<(RG&&RG.at(r.x,r.y)===2?.75:.35)?'moon-rock-cluster':'moon-boulder';
    const replacements=new Set(WD.rocks.filter(r=>!r.prop&&r.cave===undefined&&!protectedArea(r)&&this.celestialAsset(keyFor(r))));
    const inst=this.instC;
    this.instC=function(geo,mat,items,...args){return inst.call(this,geo,mat,items.filter(p=>!replacements.has(p)),...args);};
    try{base.rocks.call(this);}finally{this.instC=inst;}
    for(const key of ['moon-boulder','moon-rock-cluster']){
      const items=[...replacements].filter(r=>keyFor(r)===key),size=A.get(key)?.inspection?.size;
      if(!size)continue;
      batch(this,key,items,(r,add)=>{
        const R=random(r),s=2*r.r/Math.hypot(size[0],size[2]);
        add(r.x,this.gY(r.x,r.y)-r.r*.1,r.y,size[0]*s,size[1]*s,size[2]*s,0,R()*6.283,0,RG?'#ffffff':null);
      });
      this.biomeCounts.rocks+=items.length;
    }
  };
  P.applyMoonfallBiomeAtmosphere=function(cave){
    if(!enabled||cave)return;
    const L=state==='play'?(listener()||ME()):null;
    if(L&&protectedArea(L))return;
    this.scene.fog.color.set('#283548');this.scene.background.copy(this.scene.fog.color);
    this.scene.fog.density=this.hi?.00020:.00018;
    this.sun.color.set('#bdcfee');this.sun.intensity=moody?1.55:2.15;
    this.hemi.color.set('#a6b9d2');this.hemi.groundColor.set('#3b3231');this.hemi.intensity=1.25;
    if(typeof REG!=='undefined'&&REG.blend)REG.blend(this,.55);
  };
  P.draw=function(){
    const L=state==='play'?(listener()||ME()):{x:this.cam?.position.x||0,y:this.cam?.position.z||0};
    const range=this.hi?2900:1800;
    for(const m of this.biomeBatches||[]){const c=m.boundingSphere.center;
      m.visible=Math.hypot(c.x-L.x,c.z-L.y)<range+m.boundingSphere.radius;}
    return base.draw.call(this);
  };
  setTimeout(()=>{
    const panel=document.getElementById('celestialPanel');if(!panel)return;
    const label=document.createElement('label');label.textContent='ธรรมชาติภายนอกสนาม ';
    const select=document.createElement('select');select.id='moonfallBiomeSelect';select.setAttribute('aria-label','รูปแบบธรรมชาติ');
    for(const [value,text] of [['moonfall','Moonfall · ป่าจันทรา'],['classic','ฉากธรรมชาติเดิม']]){
      const option=document.createElement('option');option.value=value;option.textContent=text;select.appendChild(option);}
    select.value=enabled?'moonfall':'classic';select.onchange=()=>P.setMoonfallBiome(select.value);label.appendChild(select);panel.insertBefore(label,document.getElementById('celestialPerfToggle').closest('label'));
  },0);
};
