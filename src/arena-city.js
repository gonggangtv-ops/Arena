/* Arena Royale · the Old Town above the waterfall (Claude, 2026-11-21 · index only). Render only.
 * World gen (a.js WD.city) lays the town out on the plateau one step above the valley's north edge: the falls pouring off the cliff
 * into the pool (drawn by arena-falls.js, framed here by the owner's wide rock), a stairway either side climbing to a temple gate, the town wall along the cliff top with corner
 * towers, streets of cobble from the gates to a plaza (the moon circle, four knight statues on plinths), guardian statues on the
 * temple approach, a broken colonnade at the head of the town and two ruined halls, the owner's lamp pillars along every street,
 * cottages in the quarters. Every piece is one of the owner's models (old_towe.zip), instanced through the same path as the rest
 * of the scenery (R3.celestialAsset / instC), lit and shadowed like it. (Round 2: the waterfall GLB read as a faceted blob from the
 * game's camera; the falls are procedural now, arena-falls.js.)
 * Entering the town shows its name once per visit. Collision, loot and the garrison are world gen's (a.js). */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined'||(typeof MOON!=='undefined'&&MOON))return;
  const P=R3,T=THREE,A=()=>window.CelestialAssets;
  const warn=(k,e)=>{if(!P['_cityE'+k]){P['_cityE'+k]=1;console.warn('city',k,e)}};
  const loaded=k=>{const a=A()&&A().get(k);return !!(a&&a.state==='loaded'&&a.inspection&&a.inspection.size)};
  // one model over its pieces: size from the piece (h = height, w = width, d = depth; the rest keeps the model's proportions)
  function place(R,key,list,o){if(!list.length||!loaded(key))return 0;const s=A().get(key).inspection.size,parts=R.celestialAsset(key);if(!parts)return 0;
    for(const p of parts){
      R.instC(p.geo,p.mat,list,(q,add)=>{const k=q.h?q.h/s[1]:q.w?q.w/s[0]:1,sx=q.w||s[0]*k,sy=q.h||s[1]*k,sz=q.d||s[2]*k;
        const y=q.y0!==undefined?q.y0:R.gY(q.x,q.y)+(q.dy||0)+(q.plinth?34:0);add(q.x,y,q.y,sx,sy,sz,0,q.a,0,null)},o&&o.shadow!==false,null,o&&o.csz)}
    return list.length}
  P.buildCity=function(){const C=WD&&WD.city;if(!C)return;const by=new Map();
    for(const q of C.props){if(!by.has(q.k))by.set(q.k,[]);by.get(q.k).push(q)}
    const n={};for(const [k,list] of by)n[k]=place(this,k,list,{csz:2600});
    // stone plinths under the knight statues
    const kn=by.get('city-knight')||[];if(kn.length){const m=this.tstd('rock','#8f8a84',.92,0);this.instC(this.G.box,m,kn,(q,add)=>{const g=this.gY(q.x,q.y);add(q.x,g+15,q.y,92,34,92,0,q.a,0,null)},true)}
    // the rocks framing the falls (world gen's places; the owner's wide rock, mossy boulders until it loads)
    if(C.rocks&&C.rocks.length&&this.natInst){const k=this.mfProp('wide-rock')?'wide-rock':'mossy-boulder';
      this.natInst(k,C.rocks,(q,s)=>{const W=q.r*2.25,f=W/Math.max(s[0],s[2]);return[s[0]*f,s[1]*f*(q.hy||1.1),s[2]*f]})}
    // the lamp pillars' glowing stones
    for(const q of C.lamps)this.glows.push([q.x,this.gY(q.x,q.y)+182,q.y,'#ffd27a',210]);
    // the moon circle glows faintly at night like the rest of the lamps
    {const pz=(by.get('moon-arena')||[])[0];if(pz)this.glows.push([pz.x,this.gY(pz.x,pz.y)+30,pz.y,'#7ff0ff',420])}
    this.cityN=n};
  // the town is built with the rest of the props, before the static glow set is made
  const _bp=P.buildProps;P.buildProps=function(){const r=_bp.apply(this,arguments);try{this.buildCity()}catch(e){warn('build',e)}return r};
  // the town's name, once per visit
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r=_fx.apply(this,arguments);try{const C=WD&&WD.city;if(!C||!L||typeof state==='undefined'||state!=='play')return r;
      const inC=townIn(L.x,L.y,-120)&&townBase(L.x,L.y)>CITY_P-1;if(inC&&!this._inCity&&typeof gameT!=='undefined'&&gameT>3)announce={txt:'🏛️ '+C.name+' — ซากเมืองหลวงของอาณาจักร · ผู้เฝ้ายามทมิฬเฝ้าวิหาร',t:3.4};
      this._inCity=inC}catch(e){warn('fx',e)}return r};
})();
