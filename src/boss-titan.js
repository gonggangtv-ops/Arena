/* Arena Royale · the castle boss becomes the Primordial Lava Titan (Claude, 2026-11-18 · index only). Render + names.
 * The owner asked for a new boss model picked from Meshy instead of the dragon. With no credits left for a new rig, this uses
 * the rigged Lunar Construct already in the project (Meshy rig + Hammer/Ground_Slam/Death clips), scaled to 390 and re-forged
 * in obsidian and magma: dark charred plates, glowing lava seams, a molten core, rising embers and smoke.
 * The fight itself is unchanged (same HP, melee, fire breath cone, slam). Breath plays the hammer swing with a stream of
 * fire from the chest; the slam plays Ground_Slam. Swap the model later by pointing TITAN.key at a new rigged asset. */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof CREEPS==='undefined'||!CREEPS.boss)return;
  const R=R3,T=THREE,NAME='ไททันลาวาบรรพกาล',TITAN={key:'lunar-construct',H:390,ecl:'construct'};
  CREEPS.boss.name=NAME;CREEPS.boss.col='#5a2a1a';
  // feed / announcements still say "dragon" in the shared code: say Titan here
  const fixTxt=e=>e&&typeof e.s==='string'&&e.s.indexOf('มังกรเพลิง')>=0?Object.assign({},e,{s:e.s.replace(/🐉/g,'🌋').replace(/มังกรเพลิง/g,NAME)}):e;
  const _ae=applyEvent;applyEvent=function(e){return _ae.call(this,fixTxt(e))};   // clients get the host's text
  const ready=()=>typeof R.eclSkReady==='function'&&R.eclSkReady(TITAN.ecl);
  // obsidian + magma: darken the albedo, let the crystal seams (emissive map) burn orange
  R.titanForge=function(root){const dark=new T.Color('#9a7468'),lava=new T.Color('#ff4a10');root.traverse(n=>{if(!n.isMesh)return;
    const f=m=>this.cached('titan-'+m.uuid,()=>{const c=m.clone();c.onBeforeCompile=m.onBeforeCompile;c.customProgramCacheKey=m.customProgramCacheKey;
      if(c.color)c.color=c.color.clone().multiply(dark);if(c.emissive){c.emissive=lava.clone();c.emissiveIntensity=c.emissiveMap?2.2:.5}if('roughness'in c)c.roughness=Math.min(1,(c.roughness||.8)+.1);return c});
    n.material=Array.isArray(n.material)?n.material.map(f):f(n.material)})};
  R.titanObj=function(u){const M={key:TITAN.key,H:TITAN.H},root=new T.Group(),body=new T.Group();root.add(body);
    const o={kind:'ecl',titan:1,root,body,u,lx:u.x,ly:u.y,rot:Math.atan2(u.fx,u.fy),walk:0,mvK:0,atkPh:0,H:M.H};const pose=new T.Group();root.add(pose);o.pose=pose;
    pose.add(this.eclSkModel(o,{ecl:TITAN.ecl},M));o.body=new T.Group();o.ecl=TITAN.ecl;   // set after the model: no staff in its hand
    this.titanForge(pose);o.head=null;o.chest=null;pose.traverse(n=>{if(n.isBone){if(/Head$/i.test(n.name))o.head=n;else if(/Spine2|Chest|Spine1$/i.test(n.name)&&!o.chest)o.chest=n}});
    o.core=this.mesh(this.G.sph,this.glowM('#ff7a1a',.85).clone(),0,M.H*.6,26,16,16,16,pose);o.core.userData.ownMat=1;o.coreHalo=this.mesh(this.G.sph,this.glowM('#ff3a0a',.3).clone(),0,M.H*.6,26,34,34,34,pose);o.coreHalo.userData.ownMat=1;
    this.addStatus(o,u);this.scene.add(root);this.objs.set(u.id,o);(this._eclSet||(this._eclSet=new Set())).add(o);return o};
  const _of=R.objFor;R.objFor=function(u){if(u&&u.boss&&u.kind==='boss'&&!this.objs.get(u.id)&&ready())try{return this.titanObj(u)}catch(e){console.warn('titan',e)}return _of.call(this,u)};
  R.bossTop=u=>u.kind==='boss'&&ready()?TITAN.H+40:280;
  // animation cues + lava life
  const _fx=R.fxExtra;R.fxExtra=function(Tm,dt,me,L){const r=_fx.call(this,Tm,dt,me,L);try{if(typeof units==='undefined')return r;
    for(const u of units){if(!u.boss||u.kind!=='boss')continue;const o=this.objs.get(u.id);if(!o||!o.titan)continue;
      // the castle boss was drawn by the old dragon code before the rig loaded: rebuild once
      const cast=u.castAnim>0,atk=u.atkAnim>0;
      if(cast&&!o.wasCast){let breath=false;if(typeof aoes!=='undefined')for(const a of aoes)if(a.kind==='breath'&&Math.hypot(a.x-u.x,a.y-u.y)<260){breath=true;break}
        u.ecA=breath?{n:'heavy',t:1.4,d:1.4}:{n:'slam',t:1,d:1};if(breath)o.breathT=1.6}
      else if(atk&&!o.wasAtk&&!(u.ecA&&u.ecA.t>0))u.ecA={n:'basic',t:.75,d:.75};
      o.wasCast=cast;o.wasAtk=atk;
      if(o.core){const k=.75+.25*Math.sin(Tm*5);o.core.scale.setScalar(16*k);o.coreHalo.scale.setScalar(34*(.9+.2*Math.sin(Tm*3)))}
      if(u.dead||!o.root.visible||!this.pe||!this.pfxApi)continue;const A=this.pfxApi,gy=this.gY(u.x,u.y);dt=Math.min(.1,dt||0);
      if(Math.random()<dt*14)A.embers({x:u.x,y:gy+TITAN.H*.35,z:u.y},2,'#ffb050','#ff3a0a',50,{up:1.4});
      if(Math.random()<dt*3)A.smoke({x:u.x+A.rr(-40,40),y:gy+TITAN.H*.8,z:u.y+A.rr(-40,40)},1,'#2a221e',20,{a:.35,size:1.2});
      if(o.breathT>0){o.breathT-=dt;const src=new T.Vector3();(o.head||o.core).getWorldPosition(src);const fx=u.fx,fz=u.fy;
        for(let i=0;i<(this._pfx&&this._pfx.q.high?7:3);i++){const sp=A.rr(500,900),s=A.rr(-.35,.35),c=Math.cos(s),sn=Math.sin(s),dx=fx*c-fz*sn,dz=fx*sn+fz*c;
          this.pe({x:src.x+dx*30,y:src.y-20,z:src.z+dz*30,vx:dx*sp,vy:A.rr(-160,-20),vz:dz*sp,drag:1.6,g:-30,life:A.rr(.5,.8),s0:A.rr(26,40),s1:A.rr(70,110),kind:0,c:'#ffd27a',c2:'#ff3a0a',a:.8})}
        if(Math.random()<.5)A.smoke({x:src.x+fx*120,y:src.y-30,z:src.z+fz*120},1,'#2a1e18',30,{a:.4,size:1.4})}}}catch(e){if(!this._titanErr){this._titanErr=1;console.warn('titan fx',e)}}return r};
  // the old dragon object (built before the rig finished loading) is replaced on the next frame
  const _ad=R.animDragon;if(_ad)R.animDragon=function(o,u,Tm,dt){if(u&&u.boss&&u.kind==='boss'&&ready()&&!o.titan){this.scene.remove(o.root);this.objs.delete(u.id);return}return _ad.apply(this,arguments)};
  window.TITAN=TITAN;
})();
