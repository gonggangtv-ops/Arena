/* Arena Royale · the Old Town above the waterfall (Claude, 2026-11-21 · index only). Render only.
 * World gen (a.js WD.city) lays the town out on the plateau one step above the valley's north edge: the owner's waterfall pouring
 * off the cliff into the pool, a stairway either side climbing to a temple gate, the town wall along the cliff top with corner
 * towers, streets of cobble from the gates to a plaza (the moon circle, four knight statues on plinths), guardian statues on the
 * temple approach, a broken colonnade at the head of the town and two ruined halls, the owner's lamp pillars along every street,
 * cottages in the quarters. Every piece is one of the owner's models (old_towe.zip, the waterfall GLB), instanced through the
 * same path as the rest of the scenery (R3.celestialAsset / instC), lit and shadowed like it.
 * The waterfall model's painted water is brought to life here: its blue and white texels get falling streaks and a little glow.
 * Entering the town shows its name once per visit. Collision, loot and the garrison are world gen's (a.js). */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined'||(typeof MOON!=='undefined'&&MOON))return;
  const P=R3,T=THREE,A=()=>window.CelestialAssets;
  const warn=(k,e)=>{if(!P['_cityE'+k]){P['_cityE'+k]=1;console.warn('city',k,e)}};
  const loaded=k=>{const a=A()&&A().get(k);return !!(a&&a.state==='loaded'&&a.inspection&&a.inspection.size)};
  // the waterfall model's water: blue and white texels fall in streaks (world height scrolls the shared noise downward)
  function waterfall(m){if(!m||m.userData.cityWf)return;m.userData.cityWf=1;const ob=m.onBeforeCompile,ck=m.customProgramCacheKey;
    const U={uWfN:{value:window.ArenaVFXTex?ArenaVFXTex.texture:null},uWfT:P.U.time};
    m.onBeforeCompile=function(sh,rd){if(ob)ob.call(this,sh,rd);try{if(!U.uWfN.value)return;Object.assign(sh.uniforms,U);let f=sh.fragmentShader;
        if(f.indexOf('#include <map_fragment>')<0||f.indexOf('vFowW')<0)return;
        f=f.replace('void main() {','uniform sampler2D uWfN;uniform float uWfT;\nvoid main() {\n  float wfG=0.;');
        f=f.replace('#include <map_fragment>',`#include <map_fragment>
  {vec3 c0=diffuseColor.rgb;float bl=smoothstep(.03,.15,c0.b-max(c0.r,c0.g*.94)),wh=smoothstep(.7,.88,min(c0.r,min(c0.g,c0.b)))*smoothstep(-.02,.05,c0.b-c0.r);
   float wa=clamp(bl+wh,0.,1.);if(wa>.01){vec2 q=vec2((vFowW.x+vFowW.y)*.011,vWY*.0065+uWfT*.9);
     float n=texture2D(uWfN,q).r*.6+texture2D(uWfN,q*vec2(1.9,1.4)+vec2(.31,uWfT*.55)).a*.4,st=smoothstep(.42,.78,n),fo=smoothstep(.62,.9,texture2D(uWfN,q*vec2(3.1,2.2)+vec2(.7,uWfT*1.3)).r);
     diffuseColor.rgb=mix(c0,c0*.8+vec3(.22,.3,.34)*st+vec3(.28)*fo,wa*.75);wfG=wa*(st*.18+fo*.22);}}`);
        f=f.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n  totalEmissiveRadiance+=vec3(.5,.62,.7)*wfG;');
        sh.fragmentShader=f}catch(e){warn('wf',e)}};
    m.customProgramCacheKey=function(){return (ck?ck.call(this):'')+'|cwf'};m.needsUpdate=true}
  // one model over its pieces: size from the piece (h = height, w = width, d = depth; the rest keeps the model's proportions)
  function place(R,key,list,o){if(!list.length||!loaded(key))return 0;const s=A().get(key).inspection.size,parts=R.celestialAsset(key);if(!parts)return 0;
    for(const p of parts){if(key==='city-waterfall')for(const m of Array.isArray(p.mat)?p.mat:[p.mat])waterfall(m);
      R.instC(p.geo,p.mat,list,(q,add)=>{const k=q.h?q.h/s[1]:q.w?q.w/s[0]:1,sx=q.w||s[0]*k,sy=q.h||s[1]*k,sz=q.d||s[2]*k;
        const y=q.y0!==undefined?q.y0:R.gY(q.x,q.y)+(q.dy||0)+(q.plinth?34:0);add(q.x,y,q.y,sx,sy,sz,0,q.a,0,null)},o&&o.shadow!==false,null,o&&o.csz)}
    return list.length}
  P.buildCity=function(){const C=WD&&WD.city;if(!C)return;const by=new Map();
    for(const q of C.props){if(!by.has(q.k))by.set(q.k,[]);by.get(q.k).push(q)}
    const n={};for(const [k,list] of by)n[k]=place(this,k,list,{csz:2600});
    // stone plinths under the knight statues
    const kn=by.get('city-knight')||[];if(kn.length){const m=this.tstd('rock','#8f8a84',.92,0);this.instC(this.G.box,m,kn,(q,add)=>{const g=this.gY(q.x,q.y);add(q.x,g+15,q.y,92,34,92,0,q.a,0,null)},true)}
    // the lamp pillars' glowing stones
    for(const q of C.lamps)this.glows.push([q.x,this.gY(q.x,q.y)+182,q.y,'#ffd27a',210]);
    // the moon circle glows faintly at night like the rest of the lamps
    {const pz=(by.get('moon-arena')||[])[0];if(pz)this.glows.push([pz.x,this.gY(pz.x,pz.y)+30,pz.y,'#7ff0ff',420])}
    this.cityN=n};
  // the town is built with the rest of the props, before the static glow set is made
  const _bp=P.buildProps;P.buildProps=function(){const r=_bp.apply(this,arguments);try{this.buildCity()}catch(e){warn('build',e)}return r};
  // the town's name, once per visit
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r=_fx.apply(this,arguments);try{const C=WD&&WD.city;if(!C||!L||typeof state==='undefined'||state!=='play')return r;
      const inC=cityIn(L.x,L.y,-120)&&cityBase(L.x,L.y)>CITY_P-1;if(inC&&!this._inCity&&typeof gameT!=='undefined'&&gameT>3)announce={txt:'🏛️ '+C.name+' — ซากเมืองหลวงของอาณาจักร · ผู้เฝ้ายามทมิฬเฝ้าวิหาร',t:3.4};
      this._inCity=inC}catch(e){warn('fx',e)}return r};
})();
