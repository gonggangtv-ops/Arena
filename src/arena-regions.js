/* Arena Royale · five lands, five atmospheres (Claude, 2026-11-20 · index only). Render and audio only.
 * The map's five regions (t1.js REG: 0 Fallen Kingdom in the centre · 1 Cursed Forest NW · 2 Frozen Sanctuary NE · 3 Ashen Wastes SE
 * · 4 The Abyss SW) changed gameplay in the Arena but all looked like the same green valley. Each land now has its own shaders,
 * light, weather and music, blended across the borders from one baked weight map (REG.w, 256², the dungeon masked out):
 *  - KINGDOM: warm late light, golden dust in the air.
 *  - CURSED FOREST: the grass dies back to bare earth and leaf litter, black rot spreads, dark roots run over everything (some
 *    carrying a sick glow), bile pools in the hollows; foliage withers to grey-brown; thick low mist, dim grey-green light,
 *    washed-out colours, heavy vignette, spores drifting, and at night pairs of eyes blink in the dark.
 *  - FROZEN SANCTUARY: the ground is a sheet of ice (deep blue where thick, pale where thin, white fractures, trapped air, the sky
 *    sliding over it) between drifts of packed snow; snow settles on the tops of trees, rocks and roofs, grass shrinks to frosted
 *    stubble, rivers freeze over, cold bright light, snow falling.
 *  - ASHEN WASTES: grey-black ash, fields of cooled basalt plates with magma glowing in the seams, embers in the ash, charred
 *    trees, ash falling and embers rising, smoky red-brown haze.
 *  - THE ABYSS: black-violet obsidian in glassy plates, void veins pulsing light, rifts where a starfield shows through,
 *    violet-black foliage, deep shadows, motes rising.
 * World materials are reached through R3.fow (terrain, trees and rocks, grass, water, props); heroes are left alone.
 * The colour grade is its own pass before bloom (high quality); ground mist and aerial haze ride on the depth-grade pass.
 * Music: each land has its own exploration track and ambience bed (music/reg-*.mp3, amb-*.mp3), crossfaded by the audio engine;
 * battle and final-circle music stay as they were.
 * The environment-map light is tinted per land too (a blue sky glow is wrong over ash or void).
 * localStorage ar_regions='0' turns the module off; ar_regmusic='0' keeps the old day/night music and wind. */
(()=>{
  'use strict';
  if(typeof R3==='undefined'||typeof THREE==='undefined'||typeof REG==='undefined'||typeof REG.w!=='function'||(typeof MOON!=='undefined'&&MOON))return;
  try{if(localStorage.getItem('ar_regions')==='0')return}catch(e){}
  const P=R3,T=THREE,W=typeof WORLD!=='undefined'?WORLD:20000,INV=1/W;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,k)=>a+(b-a)*k;
  const warn=(k,e)=>{if(!P['_regE'+k]){P['_regE'+k]=1;console.warn('regions',k,e)}};

  // ---------------- the region weight map ----------------
  const RM={tex:null,N:256};
  function regionMap(){if(RM.tex)return RM.tex;const N=RM.N,data=new Uint8Array(N*N*4),o=[0,0,0,0,0],dg=typeof WD!=='undefined'&&WD?WD.dg:null;
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=(i+.5)/N*W,y=(j+.5)/N*W,k=(j*N+i)*4;
      if(dg&&x>dg.x-260&&x<dg.x+dg.w+260&&y>dg.y-260&&y<dg.y+dg.h+260)continue;   // the dungeon keeps its own look
      REG.w(x,y,o);data[k]=Math.round(o[1]*255);data[k+1]=Math.round(o[2]*255);data[k+2]=Math.round(o[3]*255);data[k+3]=Math.round(o[4]*255)}
    const t=new T.DataTexture(data,N,N,T.RGBAFormat,T.UnsignedByteType);t.magFilter=t.minFilter=T.LinearFilter;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;
    t.generateMipmaps=false;t.needsUpdate=true;t.name='arena-regions';RM.tex=t;return t}
  const U={uRegMap:{value:null},uRegP:{value:new T.Vector4(0,0,1,0)},vxN:{value:null}};
  const bind=sh=>{if(!U.uRegMap.value)U.uRegMap.value=regionMap();if(!U.vxN.value&&window.ArenaVFXTex)U.vxN.value=ArenaVFXTex.texture;Object.assign(sh.uniforms,U)};
  const DECL='uniform sampler2D uRegMap,vxN;uniform vec4 uRegP;\n';
  // crisp cell walls for plates and fractures: F2−F1 of a jittered grid (0 on a wall, ~0.5 inside a cell)
  const CELLS=`vec2 regH2(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.103,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}
float regCell(vec2 x){vec2 n=floor(x),f=fract(x);float f1=8.,f2=8.;
 for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(float(i),float(j)),o=g+regH2(n+g)*.8+.1-f;float d=dot(o,o);if(d<f1){f2=f1;f1=d;}else if(d<f2)f2=d;}
 return sqrt(f2)-sqrt(f1);}
`;

  // ---------------- world materials ----------------
  // flora / props: snow settles on what faces the sky, the cursed land withers, the ashen land chars, the abyss stains violet
  const FLORA=(K,SNOW)=>`
vec3 regEm=vec3(0.);vec3 regEmK=vec3(1.);vec3 regIbl=vec3(1.);
{vec4 rg=texture2D(uRegMap,vFowW*${INV.toExponential(6)});float wC=rg.r,wI=rg.g,wA=rg.b,wV=rg.a,w0=clamp(1.-wC-wI-wA-wV,0.,1.);
 regIbl=vec3(1.)*w0+vec3(.55,.68,.55)*wC+vec3(.95,1.,1.1)*wI+vec3(.95,.55,.38)*wA+vec3(.64,.5,.82)*wV;
 vec3 wn=normalize((vec4(normal,0.)*viewMatrix).xyz);
 vec4 nz=texture2D(vxN,vFowW*.011+vec2(vWY*.006,0.));
 vec3 c=diffuseColor.rgb;float l=dot(c,vec3(.3,.59,.11));
 float upr=smoothstep(.32,.72,wn.y+(nz.r-.5)*.5),up=upr*${SNOW};
 vec3 fr=mix(c*vec3(.7,.8,.96)+vec3(.05,.07,.1),vec3(.9,.94,1.)*(.9+.1*nz.a),up);
 vec3 wi=mix(vec3(l)*vec3(.72,.66,.52),c*vec3(.5,.4,.28),.3)*.64;wi=mix(wi,wi*vec3(.42,.44,.38),smoothstep(.5,.8,nz.g)*.6);
 wi=mix(wi,vec3(l)*vec3(.46,.58,.28)*.66,smoothstep(.62,.86,nz.a)*.4);
 vec3 ch=mix(vec3(l)*vec3(.42,.38,.36)*.36,vec3(.3,.29,.28)*(.8+.2*nz.r),upr*.55);
 vec3 vo=vec3(l)*vec3(.44,.31,.68)*.6;
 vec3 b=mix(c,c*vec3(1.05,1.,.88),.6)*w0+wi*wC+fr*wI+ch*wA+vo*wV;
 diffuseColor.rgb=mix(c,b,${K});
 regEmK=mix(vec3(1.),vec3(1.)*w0+vec3(.25,.3,.2)*wC+vec3(.9,.95,1.05)*wI+vec3(.2,.12,.08)*wA+vec3(.28,.16,.45)*wV,${K});   // leaf self-glow takes the land's colour
 regEm+=vec3(1.,.36,.08)*smoothstep(.86,.97,nz.b)*wA*(1.-upr)*.35*${K};
 regEm+=vec3(.5,.2,1.)*smoothstep(.84,.97,nz.b)*wV*(.3+.7*uRegP.y)*.3*${K};}
`;
  const WATER=`
float regIce=0.;vec3 regIbl=vec3(1.);
{vec4 rg=texture2D(uRegMap,vFowW*${INV.toExponential(6)});float wC=rg.r,wI=rg.g,wA=rg.b,wV=rg.a,w0=clamp(1.-wC-wI-wA-wV,0.,1.);
 regIbl=vec3(1.)*w0+vec3(.55,.68,.55)*wC+vec3(.95,1.,1.1)*wI+vec3(.95,.55,.38)*wA+vec3(.64,.5,.82)*wV;
 if(wI>.01){vec4 nz=texture2D(vxN,vFowW*.004);float cr=1.-smoothstep(.015,.05,texture2D(vxN,vFowW*.009).g);
   vec3 ice=mix(vec3(.55,.72,.84),vec3(.82,.9,.97),nz.r)+cr*.22;
   diffuseColor.rgb=mix(diffuseColor.rgb,ice,wI*.94);diffuseColor.a=mix(diffuseColor.a,.97,wI);
   normal=normalize(mix(normal,normalize((viewMatrix*vec4(0.,1.,0.,0.)).xyz),wI*.88));regIce=wI;}
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.03,.06,.035),wC*.75);diffuseColor.a=mix(diffuseColor.a,.95,wC*.5);
 diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.35+vec3(.04,.035,.03),wA*.85);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.07,.025,.13),wV*.75);}
`;
  // ground cover shrinks where the land is frozen or burnt (snow and ash cover it)
  const GRASSV=`#include <begin_vertex>
{vec3 rp=vec3(0.);
#ifdef USE_INSTANCING
rp=instanceMatrix[3].xyz;
#endif
rp=(modelMatrix*vec4(rp,1.)).xyz;vec4 rg=texture2D(uRegMap,rp.xz*${INV.toExponential(6)});
transformed.y*=max(1.-.8*rg.g-.62*rg.b-.32*rg.a+.08*rg.r,.1);}
`;
  // the sky light reflected from the environment map takes the land's colour too (a blue sky glow is wrong over ash or void)
  // man-made things (village houses, stalls, wells: the Meshy 'moon-asset' shells) keep their texture: a frosting that grows
  // smoothly with how much a face looks at the sky (so planks and shingles never stripe), grime in the cursed land, soot in
  // the ash, dusk violet in the abyss; lit windows keep their glow
  const BUILD=`
vec3 regEm=vec3(0.);vec3 regEmK=vec3(1.);vec3 regIbl=vec3(1.);
{vec4 rg=texture2D(uRegMap,vFowW*${INV.toExponential(6)});float wC=rg.r,wI=rg.g,wA=rg.b,wV=rg.a,w0=clamp(1.-wC-wI-wA-wV,0.,1.);
 regIbl=vec3(1.)*w0+vec3(.55,.68,.55)*wC+vec3(.95,1.,1.1)*wI+vec3(.95,.55,.38)*wA+vec3(.64,.5,.82)*wV;
 vec3 wn=normalize((vec4(normal,0.)*viewMatrix).xyz);
 vec3 c=diffuseColor.rgb;vec3 g=mix(vec3(dot(c,vec3(.3,.59,.11))),c,.5);
 float fz=.12+.45*smoothstep(.15,.95,wn.y);
 vec3 fr=mix(c*vec3(.86,.92,1.03)+vec3(.02,.03,.05),vec3(.84,.89,.95),fz);
 diffuseColor.rgb=c*vec3(1.03,1.,.95)*w0+g*vec3(.74,.75,.66)*wC+fr*wI+g*vec3(.62,.58,.54)*wA+g*vec3(.7,.62,.84)*wV;}
`;
  const IBLK=`#include <lights_fragment_maps>
#if defined( RE_IndirectDiffuse )
iblIrradiance*=regIbl;
#endif
#if defined( RE_IndirectSpecular )
radiance*=regIbl;
#endif
`;
  function classify(key,m){if(/^terr/.test(key)||key==='p5'||key==='moon-warrior'||key==='ecl-sk'||key==='win')return null;
    if(!(m&&(m.isMeshStandardMaterial||m.isMeshLambertMaterial||m.isMeshPhongMaterial)))return null;
    if(key==='water')return'water';if(/^wind[GFTH]$/.test(key))return'grass';
    if(key==='moon-asset')return'build';if(/^wind/.test(key)||key==='stumpcut')return'flora';return'tint'}
  function regionEdit(sh,kind){if(sh.skinning&&kind!=='flora')return;bind(sh);const F=sh.fragmentShader;if(F.indexOf('#include <normal_fragment_maps>')<0||F.indexOf('vFowW')<0)return;
    let code=kind==='water'?WATER:kind==='build'?BUILD:kind==='grass'?FLORA('.92','.25'):kind==='flora'?FLORA('.9','1.0'):FLORA('.55','.6');
    let f=DECL+F.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+code).replace('#include <lights_fragment_maps>',IBLK);
    if(kind!=='water')f=f.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance=totalEmissiveRadiance*regEmK+regEm;');
    else if(f.indexOf('#include <roughnessmap_fragment>')>=0)f=f.replace('#include <lights_physical_fragment>','roughnessFactor=mix(roughnessFactor,.32,regIce);\n#include <lights_physical_fragment>');
    sh.fragmentShader=f;
    if(kind==='grass'&&sh.vertexShader.indexOf('#include <begin_vertex>')>=0)sh.vertexShader='uniform sampler2D uRegMap;\n'+sh.vertexShader.replace('#include <begin_vertex>',GRASSV)}
  const chain=(m,kind)=>{const ob=m.onBeforeCompile,ck=m.customProgramCacheKey;
    m.onBeforeCompile=function(sh,rd){if(ob)ob.call(this,sh,rd);try{regionEdit(sh,kind)}catch(e){warn('edit',e)}};
    m.customProgramCacheKey=()=>(ck?ck.call(m):'')+'|reg2'+kind;return m};
  const _fow=P.fow;P.fow=function(m,o){const r=_fow.call(this,m,o);try{const k=classify((o&&o.key)||'',r);if(k)chain(r,k)}catch(e){warn('fow',e)}return r};

  // ---------------- the ground of each land ----------------
  const TERR=`
{vec4 rg=texture2D(uRegMap,w*${INV.toExponential(6)});float wC=rg.r,wI=rg.g,wA=rg.b,wV=rg.a,w0=clamp(1.-wC-wI-wA-wV,0.,1.);
 regIbl=vec3(1.)*w0+vec3(.55,.68,.55)*wC+vec3(.95,1.,1.1)*wI+vec3(.95,.55,.38)*wA+vec3(.64,.5,.82)*wV;
 float tp=uRegP.x,nt=uRegP.y,fl=smoothstep(.78,.95,vWN.y);
 // FROZEN: the ground is a sheet of ice (deep blue where thick, pale where thin, white fractures at two scales, trapped air,
 // the sky sliding over it as the camera moves) with packed snow drifted around it, over the slopes and on the rock
 if(wI>.004){vec4 nz=texture2D(vxN,w*.0021),nz2=texture2D(vxN,w*.00105+vec2(.3)),nz3=texture2D(vxN,w*.0049+vec2(.17,.61));
   float s0=nz2.r+(nz.a-.5)*.18,sheet=smoothstep(.41,.45,s0)*fl*(1.-k*.9),rim=smoothstep(.34,.41,s0)*(1.-smoothstep(.41,.45,s0));
   float th=clamp(nz.a*.65+nz3.r*.35,0.,1.);vec3 ice=mix(vec3(.07,.22,.38),vec3(.3,.55,.72),th);
   ice=mix(ice,vec3(.03,.1,.2),smoothstep(.6,.88,nz2.a)*.6);
   vec2 wq=w+(nz.rg-.5)*60.;float cr1=1.-smoothstep(.0,.045,regCell(wq*(1./150.)));
   float cr2=(1.-smoothstep(.0,.035,regCell(wq*(1./48.)+7.3)))*smoothstep(.35,.6,nz3.a);
   float bub=smoothstep(.78,.9,texture2D(vxN,w*.043).r)*smoothstep(.4,.7,nz.r);
   ice=mix(ice,vec3(.78,.86,.92),cr1*.85);ice+=cr2*vec3(.3,.35,.38)+bub*vec3(.22,.26,.3);
   vec2 ws=vec2(w.x*.91+w.y*.41,w.y*.91-w.x*.41);float streak=smoothstep(.52,.82,texture2D(vxN,vec2(ws.x*.0011,ws.y*.0072)).r);
   vec3 snow=vec3(.8,.85,.92)*(.88+.12*nz.r);snow=mix(snow,snow*vec3(.88,.93,1.03),smoothstep(.4,.7,nz3.g)*.45);
   float ic=sheet*(1.-streak*.35);vec3 fz=mix(snow*(1.+rim*.06),ice,ic);
   fz=mix(fz,c*vec3(.66,.76,.92)+vec3(.16,.19,.24),k*(1.-smoothstep(.5,.78,vWN.y))*.8);
   fz=mix(fz,mix(ice,vec3(.62,.8,.92),.35),wt*.9);
   c=mix(c,fz,wI);float gl=max(ic,wt*.8)*wI;regGloss=max(regGloss,gl);
   regEm+=vec3(.42,.56,.7)*smoothstep(.5,.85,texture2D(vxN,gl_FragCoord.xy*.0011+w*.00009).r)*gl*.22*(1.-nt*.7);
   regEm+=vec3(.75,.88,1.)*pow(clamp((texture2D(vxN,w*.05).b-.8)*5.,0.,1.),3.)*step(.6,fract(dot(floor(w*.31),vec2(.13,.71))+tp*.35))*(1.-ic)*wI*.5;}
 // CURSED: the grass dies back to bare earth and leaf litter, black rot spreads, dark roots run over everything (some carrying
 // a sick glow), bile pools in the hollows; the glow wakes at night
 if(wC>.004){vec4 cn=texture2D(vxN,w*.0016+vec2(.7)),cn2=texture2D(vxN,w*.0045+vec2(.2,.4));float l=dot(c,vec3(.3,.59,.11));
   vec3 dead=mix(vec3(l)*vec3(.64,.58,.48),c*vec3(.46,.4,.28),.22)*.86;
   dead=mix(dead,vec3(.2,.16,.11)*(.8+.4*cn2.r),smoothstep(.45,.7,cn2.a)*.55*(1.-k));
   dead=mix(dead,vec3(.045,.05,.04),smoothstep(.5,.78,cn.r)*.7);
   float rv=smoothstep(.5,.8,texture2D(vxN,w*.0019+vec2(.2)).b),glow=rv*smoothstep(.35,.7,texture2D(vxN,w*.0008).a)*(1.-k);
   float pv_=1.-clamp(sp.g*1.3+sp.r,0.,1.);rv*=1.-sp.g*.6;glow*=1.-sp.g*.6;
   dead=mix(dead,vec3(.05,.035,.05),rv*.55);
   float pa=texture2D(vxN,w*.0016+vec2(.5,.1)).a,pool=smoothstep(.76,.81,pa)*fl*(1.-k)*pv_,prim=pool*(1.-smoothstep(.81,.88,pa));
   dead=mix(dead,vec3(.025,.035,.01),pool*.92);
   c=mix(c,dead,wC);regGloss=max(regGloss,pool*wC*.45);float pulse=.65+.35*sin(tp*1.3+w.x*.004+w.y*.003);
   regEm+=(vec3(.32,.66,.12)*glow*(.12+.88*nt)*pulse+(vec3(.3,.5,.06)*prim*(.08+.4*nt)+vec3(.04,.07,.01)*pool*nt)*(.8+.2*pulse))*wC;}
 // ASHEN: grey-black ash, fields of cooled basalt plates with magma glowing in the seams, embers settled in the ash
 if(wA>.004){vec4 an=texture2D(vxN,w*.0018),an2=texture2D(vxN,w*.0052+vec2(.3,.8));
   vec3 ash=mix(vec3(.07,.065,.063),vec3(.24,.225,.21),an.r*.75+an2.r*.25)*mix(1.,.75,k);
   ash=mix(ash,c*vec3(.55,.52,.5),clamp(sp.g*1.3,0.,1.)*.8);
   float field=smoothstep(.46,.58,texture2D(vxN,w*.0011+vec2(.1)).r)*(1.-wt)*(1.-clamp(sp.g*1.3+sp.r*.9,0.,1.)),seam=regCell((w+(an.rg-.5)*70.)*(1./170.));
   float core=1.-smoothstep(.0,.03,seam),halo=1.-smoothstep(.0,.12,seam);
   ash=mix(ash,vec3(.05,.042,.038)*(.8+.4*an2.r),field*.85);ash=mix(ash,vec3(.09,.03,.015),halo*field);
   float spark=pow(clamp((texture2D(vxN,w*.047).b-.84)*6.,0.,1.),2.)*(1.-field);
   c=mix(c,ash,wA);float heat=1.1+.45*sin(tp*2.1+w.y*.01+w.x*.006);
   regEm+=((vec3(1.,.3,.05)*halo*.5+vec3(1.,.62,.2)*core*1.4)*field*heat*(.55+.45*nt)+vec3(1.,.4,.08)*spark*(.5+.5*sin(tp*5.+w.x*.03))*.6)*wA;}
 // ABYSS: black-violet obsidian in glassy plates, veins of void light pulsing, rifts where the starfield shows through
 if(wV>.004){vec4 vn=texture2D(vxN,w*.0017+vec2(.9)),vn2=texture2D(vxN,w*.0056+vec2(.1,.3));float l=dot(c,vec3(.3,.59,.11));
   vec3 vs=mix(vec3(.04,.03,.04),vec3(.15,.115,.15),clamp(l*1.1+vn.r*.25,0.,1.));vs=mix(vs,vec3(.022,.016,.026),smoothstep(.55,.8,vn2.a)*.6);
   float plate=1.-smoothstep(.0,.03,regCell((w+(vn.rg-.5)*50.)*(1./210.)+3.1)),vein=smoothstep(.62,.88,texture2D(vxN,w*.0013+vec2(.9)).b);
   vs=mix(vs,c*vec3(.56,.5,.56),clamp(sp.g*1.3,0.,1.)*.8);vein*=1.-sp.g*.5;
   float rift=smoothstep(.66,.74,vn.a)*fl*(1.-k)*(1.-clamp(sp.g*1.3+sp.r,0.,1.)),pulse=.5+.5*sin(tp*1.7+dot(w,vec2(.0031,.0022)));
   float star=pow(clamp((texture2D(vxN,w*.04).b-.86)*7.,0.,1.),2.);
   vs=mix(vs,vec3(.01,.005,.02),rift);c=mix(c,vs,wV);regGloss=max(regGloss,(1.-k)*wV*.45);
   regEm+=(vec3(.55,.18,1.)*vein*(.3+.7*pulse)*1.1+vec3(.75,.35,1.)*plate*.08+vec3(.8,.6,1.)*star*(.25+.75*rift)*.8+vec3(.35,.1,.6)*rift*(.2+.3*pulse))*wV*(.45+.55*nt);}
 // KINGDOM: warm late light on the old stone and grass
 c=mix(c,c*vec3(1.06,1.,.9),w0*.45);}
`;
  const _bt=P.buildTerrain;if(_bt)P.buildTerrain=function(){const r=_bt.apply(this,arguments);
    try{const m=this.terrain&&this.terrain.material;if(m&&!m.userData.reg2){m.userData.reg2=1;const ob=m.onBeforeCompile,ck=m.customProgramCacheKey;
        m.onBeforeCompile=function(sh,rd){if(ob)ob.call(this,sh,rd);try{const F=sh.fragmentShader,end='diffuseColor.rgb=c;}',at=F.lastIndexOf(end);
            if(at<0||F.indexOf('vec3 tBump=vec3(0.);')<0)return;bind(sh);
            let f=F.slice(0,at)+TERR+F.slice(at);f=DECL+CELLS+f.replace('vec3 tBump=vec3(0.);','vec3 tBump=vec3(0.);vec3 regEm=vec3(0.);float regGloss=0.;vec3 regIbl=vec3(1.);');f=f.replace('#include <lights_fragment_maps>',IBLK);
            f=f.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=regEm;');
            if(f.indexOf('#include <roughnessmap_fragment>')>=0)f=f.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.14,regGloss);');
            sh.fragmentShader=f}catch(e){warn('terrain',e)}};
        m.customProgramCacheKey=()=>(ck?ck.call(m):'')+'|reg2t';m.needsUpdate=true}}catch(e){warn('terrain',e)}return r};

  // ---------------- light, haze and grade of each land ----------------
  // per land: fog colour and density (absolute; the kingdom keeps the base), sky light colour / how far it pulls / ×,
  // sun colour / ×, ground mist ×, aerial haze ×, bloom ×, grade: saturation, contrast, vignette, lift (shadows), gain (highlights)
  const ATM=[
    {fog:null,fogD:0,hemi:'#ffe8c8',hl:.3,hemiK:1.03,sun:'#ffdcae',sunK:1.04,mist:1,ap:1,bloom:1,sat:1.06,con:1.03,vig:.14,lift:[.004,.0,-.006],gain:[1.04,1.,.93]},
    {fog:'#262924',fogD:.00032,hemi:'#808a7c',hl:.7,hemiK:.74,sun:'#b0b294',sunK:.52,mist:2.2,ap:1.7,bloom:.9,sat:.5,con:1.12,vig:.5,lift:[-.002,.008,-.002],gain:[.94,.97,.84]},
    {fog:'#a3bacf',fogD:.00018,hemi:'#d6e6ff',hl:.6,hemiK:1.05,sun:'#eef4ff',sunK:1.05,mist:1.05,ap:1.2,bloom:1.1,sat:.9,con:1.07,vig:.2,lift:[0,.006,.02],gain:[.95,1.,1.06]},
    {fog:'#2a1d18',fogD:.00027,hemi:'#9c8f88',hl:.6,hemiK:.8,sun:'#ffb886',sunK:.82,mist:1.5,ap:1.7,bloom:1.25,sat:.92,con:1.12,vig:.38,lift:[.006,.002,0],gain:[1.03,.98,.92]},
    {fog:'#1c1620',fogD:.00022,hemi:'#6a5e78',hl:.75,hemiK:.7,sun:'#a898d0',sunK:.62,mist:1.1,ap:1.2,bloom:1.25,sat:.85,con:1.05,vig:.45,lift:[.006,.002,.01],gain:[1.,.95,1.02]}];
  const AC=ATM.map(a=>({fog:a.fog?new T.Color(a.fog):null,hemi:new T.Color(a.hemi),sun:new T.Color(a.sun)}));
  const S={w:[1,0,0,0,0],o:[0,0,0,0,0],dom:0,domT:0,aud:0,grade:{sat:1,con:1,vig:0,lift:new T.Vector3(),gain:new T.Vector3(1,1,1)},mist:1,ap:1,t:0,fresh:1,
    at:{on:false,dk:1,fog:new T.Color(),dens:0,hemi:new T.Color(),hl:0,hk:1,sun:new T.Color(),sk:1,bl:1},frame:0,done:-1};
  const C1=new T.Color(),C2=new T.Color();
  // once a frame (fxExtra): where the camera stands, blended over ~0.6 s, and what that land asks of the light
  function atmosphere(R,L,dt){const o=REG.w(L.x,L.y,S.o),under=typeof inDG==='function'&&inDG(L),k=S.fresh?1:1-Math.exp(-dt*1.6);
    for(let i=0;i<5;i++)S.w[i]+=((under?(i===0?1:0):o[i])-S.w[i])*k;
    const w=S.w,A=S.at,dk=typeof R.dayK==='function'&&typeof gameT!=='undefined'?R.dayK():1,nk=.35+.65*dk;
    A.fog.setRGB(0,0,0);A.dens=0;A.hemi.setRGB(0,0,0);A.sun.setRGB(0,0,0);A.hl=0;A.hk=0;A.sk=0;A.bl=0;
    for(let i=0;i<5;i++){const a=ATM[i],x=w[i];if(i)A.fog.add(C2.copy(AC[i].fog).multiplyScalar(x*nk)),A.dens+=x*a.fogD;
      A.hemi.add(C2.copy(AC[i].hemi).multiplyScalar(x));A.sun.add(C2.copy(AC[i].sun).multiplyScalar(x));A.hl+=x*a.hl;A.hk+=x*a.hemiK;A.sk+=x*a.sunK;A.bl+=x*a.bloom}
    A.hl*=.35+.65*dk;A.dk=dk;A.on=!under;const nd=1-(1-dk)*w[2]*.55;A.hk*=nd;A.sk*=nd;   // snow is bright: the frozen land dims a little more at night
    let mi=0,ap=0,sa=0,co=0,vi=0;const G=S.grade;G.lift.set(0,0,0);G.gain.set(0,0,0);
    for(let i=0;i<5;i++){const a=ATM[i],x=w[i];mi+=a.mist*x;ap+=a.ap*x;sa+=a.sat*x;co+=a.con*x;vi+=a.vig*x;G.lift.x+=a.lift[0]*x;G.lift.y+=a.lift[1]*x;G.lift.z+=a.lift[2]*x;G.gain.x+=a.gain[0]*x;G.gain.y+=a.gain[1]*x;G.gain.z+=a.gain[2]*x}
    S.mist=under?1:mi;S.ap=under?1:ap;G.sat=sa;G.con=co;G.vig=vi;S.frame++;
    U.uRegP.value.set(S.t,1-dk,1,0);hookScene(R)}
  // applied as the scene starts to render (once a frame), so it lands after every other light tweak of the frame,
  // the darker tone's draw-time grade included; the frame code sets these lights afresh every frame
  function applyLight(R){const A=S.at,w=S.w;if(!A.on)return;const fog=R.scene&&R.scene.fog;
    if(fog){const w0=w[0];C1.copy(fog.color).multiplyScalar(w0).add(A.fog);fog.color.copy(C1);fog.density=fog.density*w0+A.dens;
      if(R.scene.background&&R.scene.background.isColor)R.scene.background.copy(fog.color)}
    if(R.hemi){R.hemi.color.lerp(A.hemi,A.hl);R.hemi.intensity*=A.hk}
    if(R.sun){R.sun.color.lerp(A.sun,.32*(.35+.65*A.dk));R.sun.intensity*=A.sk}
    if(R.bloom)R.bloom.strength*=A.bl}
  function hookScene(R){const sc=R.scene;if(!sc||sc._reg)return;sc._reg=1;const ob=sc.onBeforeRender;
    sc.onBeforeRender=function(){if(S.done!==S.frame&&typeof state!=='undefined'&&state==='play'){S.done=S.frame;try{applyLight(R)}catch(e){warn('light',e)}}
      if(ob)return ob.apply(this,arguments)}}
  // ground mist and aerial haze of the depth grade follow the land (the pass resets them every frame: read through a getter)
  function hookGrade(R){const g=R.dgrade,u=g&&g.mat&&g.mat.uniforms;if(!u||u._reg)return;u._reg=1;
    const wrap=(name,f)=>{const q=u[name];if(!q)return;let base=q.value;Object.defineProperty(q,'value',{configurable:true,get(){return base*f()},set(v){base=v}})};
    wrap('uMist',()=>playing()?S.mist:1);wrap('uAP',()=>playing()?S.ap:1)}
  const playing=()=>typeof state!=='undefined'&&state==='play';
  // the colour grade itself: saturation, contrast, lift/gain tints and a vignette, right before bloom (high quality post only)
  const GVS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const GFS=`precision highp float;varying vec2 vUv;uniform sampler2D tColor;uniform vec4 uG;uniform vec3 uLift,uGain;uniform vec2 uAsp;
void main(){vec3 c=texture2D(tColor,vUv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));
  c=max(mix(vec3(l),c,uG.x),0.);c=(c-.18)*uG.y+.18;c=max(c,0.);
  float hk=smoothstep(.02,.6,l);c=c*mix(vec3(1.),uGain,hk)+uLift*(1.-hk);
  vec2 d=(vUv-.5)*uAsp;float v=1.-uG.z*smoothstep(.35,1.05,length(d)*1.25);c*=v;
  gl_FragColor=vec4(c,1.);}`;
  const CAM2=new T.OrthographicCamera(-1,1,1,-1,0,1);
  function gradePass(){const tri=new T.BufferGeometry();tri.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));tri.setAttribute('uv',new T.Float32BufferAttribute([0,0,2,0,0,2],2));
    const m=new T.ShaderMaterial({uniforms:{tColor:{value:null},uG:{value:new T.Vector4(1,1,0,0)},uLift:{value:new T.Vector3()},uGain:{value:new T.Vector3(1,1,1)},uAsp:{value:new T.Vector2(1,1)}},
      vertexShader:GVS,fragmentShader:GFS,depthTest:false,depthWrite:false}),quad=new T.Mesh(tri,m),Uu=m.uniforms;quad.frustumCulled=false;
    return{enabled:true,needsSwap:true,clear:false,renderToScreen:false,isPass:true,mat:m,setSize(w,h){Uu.uAsp.value.set(Math.max(1,w/Math.max(1,h)),1)},dispose(){m.dispose();tri.dispose()},
      render(renderer,writeBuffer,readBuffer){const G=S.grade,on=playing();Uu.tColor.value=readBuffer.texture;
        if(on){Uu.uG.value.set(G.sat,G.con,G.vig,0);Uu.uLift.value.copy(G.lift);Uu.uGain.value.copy(G.gain)}else{Uu.uG.value.set(1,1,0,0);Uu.uLift.value.set(0,0,0);Uu.uGain.value.set(1,1,1)}
        Uu.uAsp.value.set(Math.max(1,readBuffer.width/Math.max(1,readBuffer.height)),1);const ac=renderer.autoClear;renderer.autoClear=false;renderer.setRenderTarget(writeBuffer);renderer.render(quad,CAM2);renderer.autoClear=ac}}}
  const _sp=P.setupPost;if(_sp)P.setupPost=function(){const r=_sp.apply(this,arguments);this.regGrade=null;const c=this.composer;if(!c||this.mobile)return r;
    try{const pass=gradePass();let at=c.passes.indexOf(this.bloom);if(at<0)at=Math.max(1,c.passes.length-1);c.insertPass(pass,at);this.regGrade=pass;hookGrade(this)}catch(e){warn('grade',e)}return r};

  // ---------------- weather ----------------
  // stateless GPU particles anchored in the world and wrapped in a box around the camera; each layer fades in where its land is
  const PVS=`attribute vec4 aS;uniform vec3 uC,uBox;uniform float uT,uScale;uniform vec4 uMove,uLook;uniform sampler2D uRegMap;uniform vec4 uCh;
varying float vA;varying float vK;
void main(){vec3 q=aS.xyz*uBox+vec3(uMove.x,-uMove.y,uMove.z)*uT*(.65+.7*aS.w);
  vec3 p=uC+mod(q-uC+uBox*.5,uBox)-uBox*.5;
  p.x+=sin(uT*1.3+aS.w*31.)*uMove.w;p.z+=cos(uT*1.1+aS.w*17.)*uMove.w*.7;
  vec4 rg=texture2D(uRegMap,p.xz*${INV.toExponential(6)});float w0=clamp(1.-rg.r-rg.g-rg.b-rg.a,0.,1.);
  float wr=dot(rg,uCh)+w0*uLook.w;
  float edge=1.-smoothstep(.36,.5,max(abs(p.x-uC.x)/uBox.x,abs(p.z-uC.z)/uBox.z));
  float yv=smoothstep(0.,.08,(p.y-(uC.y-uBox.y*.5))/uBox.y)*(1.-smoothstep(.85,1.,(p.y-(uC.y-uBox.y*.5))/uBox.y));
  vA=wr*edge*yv*uLook.y*(.6+.4*fract(aS.w*7.3));vK=aS.w;
  vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=uLook.x*(.6+.8*fract(aS.w*13.7))*uScale/max(1.,-mv.z);}`;
  const PFS=`varying float vA;varying float vK;uniform vec3 uCol,uCol2;uniform float uT,uAdd;
void main(){vec2 d=gl_PointCoord-.5;float r=length(d)*2.;if(r>1.)discard;float a=(1.-r*r);a*=a;
  if(uAdd>1.5){vec2 q=d;q.x=abs(q.x)-.17;float e=1.-smoothstep(.05,.09,length(q*vec2(1.,1.7)));   // a pair of eyes, blinking now and then
    float al=e*vA*step(.05,fract(uT*.23+vK*11.3))*smoothstep(.55,.85,sin(uT*.11+vK*43.));if(al<.002)discard;
    gl_FragColor=vec4(mix(uCol,uCol2,step(.6,fract(vK*3.7)))*1.6,al);return;}
  float tw=uAdd>.5?.55+.45*sin(uT*(3.+vK*6.)+vK*40.):1.;vec3 c=mix(uCol,uCol2,fract(vK*5.1));
  float al=a*vA*tw;gl_FragColor=uAdd>.5?vec4(c,al):vec4(c*al,al);}`;
  // [count hi, count lo, box w,h,d, move (wind x, fall, wind z, flutter), size, alpha, channel(r cursed,g frost,b ash,a abyss), kingdom share, colour, colour2, additive]
  const LAYERS=[
    {n:'snow',hi:2600,lo:900,box:[2400,950,1900],move:[38,95,14,9],size:8.5,alpha:.9,ch:[0,1,0,0],k0:0,c:'#ffffff',c2:'#dceaff',add:0},
    {n:'ash',hi:1300,lo:450,box:[2300,900,1800],move:[16,26,8,12],size:5.5,alpha:.75,ch:[0,0,1,0],k0:0,c:'#5a5450',c2:'#8a8480',add:0},
    {n:'ember',hi:420,lo:160,box:[2200,700,1700],move:[10,-58,6,14],size:5,alpha:.95,ch:[0,0,1,0],k0:0,c:'#ff7a26',c2:'#ffc070',add:1},
    {n:'spore',hi:800,lo:300,box:[2200,500,1700],move:[8,-6,5,22],size:5,alpha:.55,ch:[1,0,0,0],k0:0,c:'#a8d070',c2:'#5a7a4a',add:1},
    {n:'void',hi:700,lo:260,box:[2200,700,1700],move:[3,-24,3,10],size:5.5,alpha:.85,ch:[0,0,0,1],k0:0,c:'#b678ff',c2:'#ff8ae0',add:1},
    {n:'dust',hi:420,lo:180,box:[2000,420,1600],move:[6,-3,4,16],size:4,alpha:.42,ch:[0,0,0,0],k0:1,c:'#ffe2a0',c2:'#fff4d8',add:1},
    {n:'eyes',hi:46,lo:20,box:[2400,130,1900],move:[0,0,0,0],size:22,alpha:1,ch:[1,0,0,0],k0:0,c:'#ffb020',c2:'#c8ff40',add:2,night:1}];
  function makeLayers(R){const hi=R.hi&&!R.mobile,out=[];let s=0x51ed27;const rnd=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296};
    for(const L of LAYERS){const n=hi?L.hi:L.lo,a=new Float32Array(n*4),pos=new Float32Array(n*3);for(let i=0;i<n*4;i++)a[i]=rnd();
      const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('aS',new T.BufferAttribute(a,4));
      const m=new T.ShaderMaterial({uniforms:{uC:{value:new T.Vector3()},uBox:{value:new T.Vector3(...L.box)},uT:{value:0},uScale:{value:600},uMove:{value:new T.Vector4(...L.move)},
          uLook:{value:new T.Vector4(L.size,L.alpha,0,L.k0)},uCh:{value:new T.Vector4(...L.ch)},uRegMap:U.uRegMap,uCol:{value:new T.Color(L.c)},uCol2:{value:new T.Color(L.c2)},uAdd:{value:L.add}},
        vertexShader:PVS,fragmentShader:PFS,transparent:true,depthWrite:false,blending:L.add?T.AdditiveBlending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor});const pts=new T.Points(g,m);pts.frustumCulled=false;pts.renderOrder=6;pts.visible=false;pts.raycast=()=>{};pts.name='arena-weather-'+L.n;R.scene.add(pts);
      out.push({L,pts,m,base:new T.Color(L.c),base2:new T.Color(L.c2)})}
    return out}
  const PROBE=[[0,0],[1000,700],[-1000,700],[1000,-700],[-1000,-700]],PW=[0,0,0,0,0];
  function weather(R,L,dt){if(!R.scene)return;if(!S.lay||S.layScene!==R.scene){if(S.lay)for(const l of S.lay){if(l.pts.parent)l.pts.parent.remove(l.pts);l.pts.geometry.dispose();l.m.dispose()}
      if(!U.uRegMap.value)U.uRegMap.value=regionMap();S.lay=makeLayers(R);S.layScene=R.scene}
    // which lands are on screen at all
    const mx=[0,0,0,0,0];for(const p of PROBE){REG.w(L.x+p[0],L.y+p[1],PW);for(let i=0;i<5;i++)mx[i]=Math.max(mx[i],PW[i])}
    const under=typeof inDG==='function'&&inDG(L),dk=typeof R.dayK==='function'&&typeof gameT!=='undefined'?R.dayK():1,lit=.3+.7*dk,cam=R.cam;
    const scale=(R.renderer&&R.renderer.domElement?R.renderer.domElement.height:700)*(cam?cam.projectionMatrix.elements[5]:1.6)*.5;
    for(const l of S.lay){const L2=l.L,ch=L2.ch;let wv=L2.k0*mx[0];for(let i=0;i<4;i++)wv=Math.max(wv,ch[i]*mx[i+1]);const on=!under&&wv>.02&&!(L2.night&&dk>.85);l.pts.visible=on;if(!on)continue;
      const u=l.m.uniforms;u.uC.value.set(R.tx||L.x,(R.ly||0)+L2.box[1]*.42,R.ty||L.y);u.uT.value=S.t;u.uScale.value=scale;
      if(!L2.add){u.uCol.value.copy(l.base).multiplyScalar(lit);u.uCol2.value.copy(l.base2).multiplyScalar(lit)}
      else if(L2.n==='dust'){u.uLook.value.y=L2.alpha*dk}
      else if(L2.night){u.uLook.value.y=L2.alpha*clamp((1-dk)*1.6-.1,0,1)}}}

  // ---------------- music and ambience of each land ----------------
  const TRK=['reg-kingdom','reg-cursed','reg-frost','reg-ash','reg-abyss'],AMB=['wind','amb-cursed','amb-frost','amb-ash','amb-abyss'];
  let MUS=true;try{MUS=localStorage.getItem('ar_regmusic')!=='0'}catch(e){}
  if(typeof MUS_VOL!=='undefined')Object.assign(MUS_VOL,{'reg-kingdom':.78,'reg-cursed':.9,'reg-frost':.92,'reg-ash':.72,'reg-abyss':.9});
  if(typeof AMB_VOL!=='undefined')Object.assign(AMB_VOL,{'amb-cursed':.55,'amb-frost':.5,'amb-ash':.45,'amb-abyss':.48});
  const failed=n=>{try{const t=AU.trk&&AU.trk[n];return !!(t&&t.ok===false)}catch(e){return false}};
  // the menu's sound credits: these tracks are original, made in code for this game (src/tools/region-music.py)
  try{const cl=document.getElementById('credList');if(cl&&MUS)cl.insertAdjacentHTML('beforeend','<h4>เพลงประจำดินแดน</h4><div><b>Fallen Kingdom · Cursed Forest · Frozen Sanctuary · Ashen Wastes · The Abyss และเสียงบรรยากาศของแต่ละดินแดน</b> — แต่งและสังเคราะห์ด้วยโค้ดสำหรับเกมนี้ <small>(ต้นฉบับ)</small></div>')}catch(e){}
  if(MUS&&typeof AU!=='undefined'&&AU.setMusic&&AU.setAmb){
    const _sm=AU.setMusic,_sa=AU.setAmb;
    AU.setMusic=function(m){try{if(state==='play'&&!this.inCave&&(m==='day'||(m==='night'&&S.aud!==0))){const r=TRK[S.aud];if(r&&!failed(r))m=r}}catch(e){}return _sm.call(this,m)};
    AU.setAmb=function(a){try{if(state==='play'&&this.mode!==2&&(a==='wind'||(a===null&&!this.inCave&&!gameOver&&S.aud!==0))){const r=AMB[S.aud];if(r&&!failed(r))a=r}}catch(e){}return _sa.call(this,a)};}
  // which land the music follows: the one clearly underfoot for a moment (no flapping on the borders)
  function audioLand(L,dt){let b=0;for(let i=1;i<5;i++)if(S.w[i]>S.w[b])b=i;
    if(S.fresh){S.fresh=0;if(b!==S.aud){S.aud=b;S.domT=0;if(typeof AU!=='undefined')AU.mt=0}}   // a new match: start on the land underfoot
    else if(typeof inDG==='function'&&inDG(L))return;
    else if(b!==S.aud&&S.w[b]>.55){S.domT+=dt;if(S.domT>1.5){S.aud=b;S.domT=0;if(typeof AU!=='undefined')AU.mt=0}}else S.domT=0;
    // start loading a land's music while still crossing its border (each track streams only once it is near)
    if(MUS&&typeof AU!=='undefined'&&AU.ctx){S.warm=S.warm||[0,0,0,0,0];for(let i=0;i<5;i++)if(!S.warm[i]&&(S.w[i]>.12||i===S.aud)){S.warm[i]=1;try{AU.track(TRK[i]);if(i)AU.track(AMB[i])}catch(e){}}}}

  // ---------------- per frame ----------------
  const _fx=P.fxExtra;P.fxExtra=function(Tm,dt,me,L){const r=_fx.apply(this,arguments);
    try{if(L&&typeof state!=='undefined'&&state==='play'){dt=Math.min(.1,Math.max(0,dt||0));S.t=(S.t+dt)%3600;atmosphere(this,L,dt);weather(this,L,dt);audioLand(L,dt)}}catch(e){warn('frame',e)}return r};
  const _ds=P.disposeScene;if(_ds)P.disposeScene=function(){S.fresh=1;try{if(S.lay)for(const l of S.lay){if(l.pts.parent)l.pts.parent.remove(l.pts);l.pts.geometry.dispose();l.m.dispose()}S.lay=null;
      if(RM.tex){RM.tex.dispose();RM.tex=null;U.uRegMap.value=null}}catch(e){}return _ds.apply(this,arguments)};
  window.ArenaRegions={state:S,weights:()=>S.w.slice(),land:()=>S.aud,map:()=>regionMap()};
})();
