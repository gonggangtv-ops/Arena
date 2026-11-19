/* Arena Royale · VFX texture library (Claude, 2026-11-19 · index only). Render only.
 * The skill effects used to be pure shader shapes with flat gradients, which is what made them read as old-generation.
 * This builds ONE tileable noise texture in code at load (no image files) that every effect shader samples to flow,
 * swirl, flicker and burn away:
 *   R = fbm (soft clouds: fire licks, smoke, energy flow)   G = cell walls (0 on the walls: cracks, shield hexes, crystal facets)
 *   B = ridged veins (lightning-like filaments, runes)      A = a second, decorrelated fbm (domain warping, double flow)
 * 256² RGBA on desktop, 128² on phones; deterministic, with its own random stream (the simulation's stream is untouched,
 * Math.random included: three's UUIDs are drawn from this stream too).
 * Shaders get the GLSL helpers in window.VFXN_GLSL and two uniforms: vxN (the texture) and vxT (seconds, wraps at 600). */
(()=>{
  'use strict';
  if(typeof THREE==='undefined')return;
  const T=THREE,MOB=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent),N=MOB?128:256;
  let s=0x6d2b79f5;const rnd=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296};
  const perm=new Uint8Array(512),GX=new Float32Array(256),GY=new Float32Array(256);
  {const a=Array.from({length:256},(_,i)=>i);for(let i=255;i>0;i--){const j=Math.floor(rnd()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}
    for(let i=0;i<512;i++)perm[i]=a[i&255];for(let i=0;i<256;i++){const t=rnd()*Math.PI*2;GX[i]=Math.cos(t);GY[i]=Math.sin(t)}}
  // periodic gradient noise: x,y in lattice units, period P lattice cells, 'off' picks a different gradient field
  const wrap=(i,P)=>((i%P)+P)%P;
  function pn(x,y,P,off){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
    const g=(i,j,dx,dy)=>{const k=perm[((wrap(i,P)+off)&255)+perm[wrap(j,P)&255]];return GX[k]*dx+GY[k]*dy};
    const u=xf*xf*xf*(xf*(xf*6-15)+10),v=yf*yf*yf*(yf*(yf*6-15)+10);
    const a=g(xi,yi,xf,yf),b=g(xi+1,yi,xf-1,yf),c=g(xi,yi+1,xf,yf-1),d=g(xi+1,yi+1,xf-1,yf-1);
    return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
  function fbm(u,v,base,oct,off){let t=0,a=.5,f=base,n=0;for(let o=0;o<oct;o++){t+=a*pn(u*f,v*f,f,off+o*37);n+=a;a*=.5;f*=2}return t/n}
  function ridged(u,v,base,oct,off){let t=0,a=.5,f=base,n=0;for(let o=0;o<oct;o++){const r=1-Math.abs(pn(u*f,v*f,f,off+o*53))*1.6;t+=a*r*r;n+=a;a*=.55;f*=2}return t/n}
  // tileable Worley: distance between the two nearest feature points (0 on a cell wall)
  function cellsField(G,off){const pts=new Float32Array(G*G*2);for(let i=0;i<pts.length;i++)pts[i]=.12+.76*rnd();
    return(u,v)=>{const x=u*G,y=v*G,cx=Math.floor(x),cy=Math.floor(y);let f1=9,f2=9;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const ix=cx+dx,iy=cy+dy,k=(wrap(iy,G)*G+wrap(ix,G))*2,px=ix+pts[k],py=iy+pts[k+1],d=Math.hypot(x-px,y-py);
        if(d<f1){f2=f1;f1=d}else if(d<f2)f2=d}return f2-f1}}
  function build(){const R=new Float32Array(N*N),G=new Float32Array(N*N),B=new Float32Array(N*N),A=new Float32Array(N*N);
    const c1=cellsField(7,0),c2=cellsField(15,1);
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){const u=i/N,v=j/N,k=j*N+i;
      R[k]=fbm(u,v,4,MOB?4:5,0);A[k]=fbm(u+.31,v+.67,3,MOB?4:5,101);B[k]=ridged(u,v,3,4,203);G[k]=c1(u,v)*.68+c2(u,v)*.32}
    // spread each channel over 0..1 (fbm clusters round the middle); the cell channel keeps its walls at 0
    const norm=(F,lo,hi,gam)=>{let a=1e9,b=-1e9;for(const x of F){if(x<a)a=x;if(x>b)b=x}const out=new Uint8Array(N*N);
      for(let k=0;k<F.length;k++){let t=(F[k]-a)/Math.max(1e-6,b-a);t=Math.min(1,Math.max(0,(t-lo)/(hi-lo)));out[k]=Math.round(Math.pow(t,gam)*255)}return out};
    const r=norm(R,.08,.92,1),g=norm(G,0,.62,.8),b=norm(B,.05,1,1.6),a=norm(A,.08,.92,1),px=new Uint8Array(N*N*4);
    for(let k=0;k<N*N;k++){px[k*4]=r[k];px[k*4+1]=g[k];px[k*4+2]=b[k];px[k*4+3]=a[k]}
    return px}
  const t0=performance.now(),data=build(),prev=Math.random;let tex;
  try{Math.random=rnd;tex=new T.DataTexture(data,N,N,T.RGBAFormat,T.UnsignedByteType)}finally{Math.random=prev}
  tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;
  if('colorSpace' in tex)tex.colorSpace=T.NoColorSpace||'';tex.anisotropy=4;tex.needsUpdate=true;tex.name='arena-vfx-noise';
  const clock={value:0};
  // GLSL helpers (paste after the precision line; the material must carry vxN and vxT uniforms)
  window.VFXN_GLSL=`
    uniform sampler2D vxN;uniform float vxT;
    float vxF(vec2 u){return texture2D(vxN,u).r;}
    float vxC(vec2 u){return texture2D(vxN,u).g;}
    float vxR(vec2 u){return texture2D(vxN,u).b;}
    float vxA(vec2 u){return texture2D(vxN,u).a;}
    // two layers drifting at different speeds: flowing detail with no visible repeat
    float vxFlow(vec2 u,vec2 v){return vxF(u+v*vxT)*.62+vxA(u*1.93-v*vxT*1.37+.37)*.38;}
    // burn-away dissolve: 1 where the noise is above the rising threshold, soft over w
    float vxBurn(float n,float th,float w){return smoothstep(th-w,th+w,n);}
    // the glowing rim right at the burning edge (0 before the dissolve starts)
    float vxRim(float n,float th,float w){float d=(n-th)/w;return exp(-d*d*2.2)*smoothstep(0.0,.04,th);}
    // a hotter, whiter version of a colour (keeps any premultiplied opacity)
    vec3 vxHot(vec3 c){float m=max(c.r,max(c.g,c.b));return mix(c,vec3(m),.62)*1.12;}
  `;
  window.ArenaVFXTex={texture:tex,size:N,ms:Math.round(performance.now()-t0),
    uniforms(){return{vxN:{value:tex},vxT:clock}},
    tick(){clock.value=(performance.now()/1000)%600}};
  // The base game's additive ground rings (r4 decal) and flash lights (r6 flash) were drawn for the old, darker look; under the new
  // layers they bleached the screen. Arena only: additive decals at 55% strength, flash lights at 50%.
  if(typeof R3!=='undefined'&&(typeof MOON==='undefined'||!MOON)){
    const _decal=R3.decal;if(_decal)R3.decal=function(o){if(o&&!o.normal)o=Object.assign({},o,{a:(o.a===undefined?1:o.a)*.55});return _decal.call(this,o)};
    const _flash=R3.flash;if(_flash)R3.flash=function(x,y,z,c,I,d,T){return _flash.call(this,x,y,z,c,(I||0)*.5,d,T)};
    // big additive glow sprites (the old 'everything goes white' bursts) at half strength
    const _sp=R3.sp;if(_sp)R3.sp=function(add,o){if(add&&o&&(o.s||0)>=150)o=Object.assign({},o,{a:(o.a===undefined?1:o.a)*.5});return _sp.call(this,add,o)};
    // the old impact layer: no bleaching white shock ring and no screen-sized white sprite (the new layers carry the burst)
    const _imp=R3.impact;if(_imp)R3.impact=function(a){const ring=this.ring,sp=this.sp;
      this.ring=function(x,y,r0,r1,c,life,tex){return c==='#ffffff'?null:ring.call(this,x,y,r0,r1,c,life,tex)};
      this.sp=function(add,o){return add&&o&&o.c==='#ffffff'&&(o.s||0)>150?undefined:sp.call(this,add,o)};
      try{return _imp.call(this,a)}finally{this.ring=ring;this.sp=sp}};
    // the camera-facing flare sprites (r10) reach r*2.3 on big hits (over 1000 units for the axe line): capped and halved
    const _flare=R3.flare;if(_flare)R3.flare=function(x,h,y,size,c,life){return _flare.call(this,x,h,y,Math.min(380,(size||100)*.55),c,life)}}
  if(typeof R3!=='undefined'&&typeof R3.draw==='function'){const _draw=R3.draw;R3.draw=function(){clock.value=(performance.now()/1000)%600;return _draw.apply(this,arguments)}}
})();
