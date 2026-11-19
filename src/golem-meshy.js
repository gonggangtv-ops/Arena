/* Arena Royale · rigged Meshy golems (Claude, 2026-11-19 · index only).
 * The owner swapped the two stone camp monsters for their own animated Meshy models:
 *   โกเลมหินผา (kind 'golem')            → Stone Guardian  (Meshy auto-rig: stance, walk, reaping swing, ground stomp, hit, death)
 *   ผู้พิทักษ์คริสตัล (kind 'guardian')  → Magma Titan     (Mixamo rig: walk, attack, flying fist kick, hit, death)
 * Rendering only: HP, damage, speed and AI are unchanged. The skinned path is the Eclipse one (eclSkModel/eclAnimSk):
 * the clip map is filled here before the first build, with each attack cut down to the swing that lands, so the blow
 * reads on the frame the server deals the damage. Every third swing plays the heavy move instead. Until the GLB loads
 * the old procedural golem is drawn, then swapped on the next frame. */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof MOON==='undefined'||MOON)return;
  const R=R3,T=THREE,CA=()=>window.CelestialAssets;
  // win: [start,end] seconds kept from a long clip; still: a one-frame pose taken at that time
  const GM={
    golem:{key:'stone-guardian',H:170,idle:{c:/Combat_Stance/},walk:{c:/^Walking/},attack:{c:/Reaping_Swing/,win:[2,3.05]},slam:{c:/Angry_Ground_Stomp/},hit:{c:/^Hit_Reaction/},death:{c:/dying/i},atk:.75,slam:1},
    guardian:{key:'magma-titan',H:188,idle:{c:/^Attack/,still:0},walk:{c:/^Walking/},attack:{c:/^Attack/,win:[.5,1.85]},slam:{c:/Flying_Fist_Kick/,win:[1.1,2.95]},hit:{c:/^Hit_Reaction$/},death:{c:/dying/i},atk:.75,slam:1.1}};
  const ready=kind=>{const g=GM[kind],A=CA(),a=g&&A&&A.get(g.key);return !!(a&&a.state==='loaded'&&a.inspection&&a.inspection.skinned&&a.gltf&&a.gltf.animations&&a.gltf.animations.length>=2&&window.AR_GLTF&&AR_GLTF.SkeletonUtils&&R.eclSkModel)};
  const hipT=c=>c.tracks.find(t=>/\.position$/.test(t.name)&&/hips|pelvis/i.test(t.name));
  // keep [a,b] of a clip, times shifted to start at 0
  const cut=(c,a,b,name)=>{const tr=c.tracks.map(t=>{const n=t.getValueSize(),tt=[],vv=[];
      for(let i=0;i<t.times.length;i++){const x=t.times[i];if(x<a-1e-4||x>b+1e-4)continue;tt.push(x-a);for(let j=0;j<n;j++)vv.push(t.values[i*n+j])}
      if(!tt.length){tt.push(0);for(let j=0;j<n;j++)vv.push(t.values[j])}
      return new t.constructor(t.name,tt,vv)});return new T.AnimationClip(name,-1,tr)};
  // a held pose: the frame nearest time s, two keys one second apart
  const still=(c,s,name)=>{const tr=c.tracks.map(t=>{const n=t.getValueSize();let i=0;while(i<t.times.length-1&&t.times[i+1]<=s)i++;const v=Array.from(t.values.slice(i*n,i*n+n));
      return new t.constructor(t.name,[0,1],v.concat(v))});return new T.AnimationClip(name,1,tr)};
  const clipsFor=kind=>{const g=GM[kind],a=CA().get(g.key);if(a._gmClips)return a._gmClips;const list=a.gltf.animations,out={};
    for(const k of['idle','walk','attack','slam','hit','death']){const s=g[k],c=list.find(c=>s.c.test(c.name));if(!c)continue;
      out[k]=s.still!==undefined?still(c,s.still,k):s.win?cut(c,s.win[0],s.win[1],k):c.clone()}
    // in place: the game moves the unit, so the hips keep the idle pose's ground spot
    const ref=out.idle&&hipT(out.idle),rx=ref?ref.values[0]:0,rz=ref?ref.values[2]:0;
    for(const k in out){const t=hipT(out[k]);if(t){const v=t.values;for(let i=0;i<v.length;i+=3){v[i]=rx;v[i+2]=rz}}}
    a._eclClips=out;return a._gmClips=out};
  R.gmObj=function(u){const g=GM[u.kind],root=new T.Group(),body=new T.Group();root.add(body);
    const o={kind:'ecl',gm:1,root,body,u,lx:u.x,ly:u.y,rot:Math.atan2(u.fx,u.fy),walk:0,mvK:0,atkPh:0,H:g.H};const pose=new T.Group();root.add(pose);o.pose=pose;
    clipsFor(u.kind);pose.add(this.eclSkModel(o,{ecl:'construct'},{key:g.key,H:g.H}));o.body=new T.Group();o.ecl='construct';   // set after the model: no weapon in its hand
    this.addStatus(o,u);this.scene.add(root);this.objs.set(u.id,o);(this._eclSet||(this._eclSet=new Set())).add(o);return o};
  const _of=R.objFor;R.objFor=function(u){if(u&&u.golem&&GM[u.kind]&&!this.objs.get(u.id)&&ready(u.kind))try{return this.gmObj(u)}catch(e){if(!this._gmErr){this._gmErr=1;console.warn('golem model',e)}}return _of.call(this,u)};
  // the procedural golem drawn before the GLB finished loading is replaced on the next frame
  const _ab=R.animBig;R.animBig=function(o,u,Tm){if(!o.gm&&u&&u.golem&&GM[u.kind]&&!u.dead&&ready(u.kind)){this.scene.remove(o.root);this.objs.delete(u.id);return}return _ab.apply(this,arguments)};
  R.golemTop=u=>GM[u.kind]&&ready(u.kind)?GM[u.kind].H+36:u.kind==='guardian'?172:146;
  // swing cues (atkAnim rises on the host and on clients alike)
  const _fx=R.fxExtra;R.fxExtra=function(Tm,dt,me,L){const r=_fx.call(this,Tm,dt,me,L);try{if(typeof units==='undefined')return r;
    for(const u of units){if(!u.golem||!GM[u.kind])continue;const o=this.objs.get(u.id);if(!o||!o.gm)continue;const g=GM[u.kind],atk=u.atkAnim>0;
      if(atk&&!o.wasAtk){o.nAtk=(o.nAtk||0)+1;u.ecA=o.nAtk%3===0?{n:'slam',t:g.slam,d:g.slam}:{n:'basic',t:g.atk,d:g.atk}}
      o.wasAtk=atk}}catch(e){if(!this._gmFxErr){this._gmFxErr=1;console.warn('golem fx',e)}}return r};
  window.GOLEM_MODELS=GM;
})();
