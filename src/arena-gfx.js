/* Arena Royale · image quality pass (Claude, 2026-11-18). Render only.
 * The "old game" look came from jagged edges (phones ran with no anti-aliasing at a 1.2 pixel ratio), faceted low-segment
 * primitives, flat-shaded pines, hard alpha-cut foliage, blocky shadow edges and blurry ground at grazing angles. This:
 *  - always asks for an MSAA canvas (mobile tiled GPUs resolve 4x cheaply) and raises the pixel-ratio caps,
 *  - rebuilds the shared primitives with more segments and the rock / canopy blobs one subdivision finer (desktop),
 *  - smooth-shades the scene, turns alpha-tested foliage into alpha-to-coverage, sharpens textures (anisotropy),
 *  - soft PCF shadows with a larger map on high quality. */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined')return;
  const P=R3,T=THREE,MOB=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const _init=P.init;
  P.init=function(){if(this.ok)return true;const WR=T.WebGLRenderer;
    // MSAA on every device: the stock renderer turned it off on phones
    function AAWebGLRenderer(o){return new WR(Object.assign({},o,{antialias:true}))}AAWebGLRenderer.prototype=WR.prototype;
    const I=T.IcosahedronGeometry,fine=!MOB;
    T.WebGLRenderer=AAWebGLRenderer;
    // rocks and leafy canopies are displaced icospheres: one level finer on desktop
    if(fine)T.IcosahedronGeometry=class extends I{constructor(r,d){super(r,d===2?3:d)}};
    let ok;try{ok=_init.call(this)}finally{T.WebGLRenderer=WR;T.IcosahedronGeometry=I}
    if(ok&&this.G){const G=this.G,old=[];const swap=(k,g)=>{if(G[k]){old.push(G[k]);this.cachedGeos.delete(G[k])}G[k]=g;this.cachedGeos.add(g)};
      const hs=fine?1:.7,n=v=>Math.max(6,Math.round(v*hs));
      swap('sph',new T.SphereGeometry(1,n(32),n(22)));swap('half',new T.SphereGeometry(1,n(30),n(12),0,Math.PI*2,0,Math.PI/2));
      swap('cyl',new T.CylinderGeometry(1,1,1,n(24)));swap('cylT',new T.CylinderGeometry(.62,1,1,n(18)));swap('cone',new T.ConeGeometry(1,1,n(24)));
      swap('torus',new T.TorusGeometry(1,.12,n(12),n(44)));swap('torusHalf',new T.TorusGeometry(1,.1,n(10),n(30),Math.PI));
      swap('hood',new T.SphereGeometry(1,n(28),n(18),Math.PI/2+.85,Math.PI*2-1.7,0,Math.PI*.78));swap('openCyl',new T.CylinderGeometry(1,1,1,n(40),1,true));
      for(const g of old)try{g.dispose()}catch(e){}}
    return ok};
  const _q=P.setQuality;
  P.setQuality=function(){const r=_q.apply(this,arguments);const R=this.renderer;if(!R)return r;
    const dpr=window.devicePixelRatio||1,cap=this.hi?(MOB?1.75:2):(MOB?1.45:1.35);R.setPixelRatio(Math.min(dpr,cap));R.setSize(W,H);
    if(this.composer){this.composer.setPixelRatio(R.getPixelRatio());this.composer.setSize(W,H)}
    R.shadowMap.type=T.PCFShadowMap;   // r186: PCF with a blur radius is the soft path (PCFSoftShadowMap was removed)
    this.shadowSize=this.hi&&!MOB?4096:this.hi?2048:1024;
    if(this.sun){this.sun.shadow.mapSize.set(this.shadowSize,this.shadowSize);this.sun.shadow.radius=this.hi?3:1;if(this.sun.shadow.map){this.sun.shadow.map.dispose();this.sun.shadow.map=null}}
    this._gfxSeen=new WeakSet();return r};
  // smooth shading, alpha-to-coverage foliage, sharper textures — once per material
  P.gfxPolish=function(){if(!this.scene||!this.renderer)return;const seen=this._gfxSeen||(this._gfxSeen=new WeakSet()),aniso=Math.min(this.renderer.capabilities.getMaxAnisotropy?this.renderer.capabilities.getMaxAnisotropy():4,this.hi?8:4);
    const fix=m=>{if(!m||seen.has(m))return;seen.add(m);let ch=false;
      if(m.flatShading){m.flatShading=false;ch=true}
      // only the game's own painted leaf cards: Meshy foliage textures are black where they are cut out, and wherever the
      // GPU does not turn alpha into coverage (seen on software GL) those cut-outs drew as black blots
      if(m.alphaTest>0&&!m.transparent&&!m.alphaToCoverage&&m.map&&m.map.isCanvasTexture){m.alphaToCoverage=true;ch=true}
      for(const k of['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap']){const t=m[k];if(t&&t.isTexture&&!(t.anisotropy>=aniso)&&!t.isRenderTargetTexture){t.anisotropy=aniso;t.needsUpdate=true}}
      if(ch)m.needsUpdate=true};
    this.scene.traverse(o=>{if(o.isMesh||o.isInstancedMesh||o.isSkinnedMesh){if(Array.isArray(o.material))o.material.forEach(fix);else fix(o.material)}})};
  const _bw=P.buildWorld;if(_bw)P.buildWorld=function(){const r=_bw.apply(this,arguments);try{this.gfxPolish()}catch(e){}return r};
  // characters, props and drops arrive after the world: sweep again every few seconds (cheap, materials are cached)
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r=_fx.call(this,Tm,dt,me,L);this._gfxT=(this._gfxT||0)-dt;if(this._gfxT<=0){this._gfxT=3;try{this.gfxPolish()}catch(e){}}return r};
})();
