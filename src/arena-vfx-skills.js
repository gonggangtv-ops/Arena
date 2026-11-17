/* Arena Royale skill choreography. Observes the existing visual events, projectiles
 * and AOEs; never wraps cast/damage/emit or changes a network/gameplay object.
 * Client snapshots omit AOE owner/element: those use honest kind-based visuals. */
(()=>{
  'use strict';
  if(typeof R3.avEmit!=='function')return;
  const P=R3,TAU=Math.PI*2,PI=Math.PI;
  const palette={sword:['#ffe6a0','#fff9e0'],axe:['#ff963f','#fff0a8'],dagger:['#dc75ff','#ffb0df'],bow:['#84f6ba','#fff2bd'],fire:['#ff661f','#ffe791'],frost:['#6bd4ff','#e6fcff'],gsword:['#adc9ff','#f0f7ff'],xbow:['#ffb45d','#fff0cb'],storm:['#ae7dff','#e4d8ff']};
  const baseStyles={sword:['dash','ward','judgment'],axe:['cyclone','warcry','fissure'],dagger:['shadow','veil','lotus'],bow:['arrowfan','snare','arrowrain'],fire:['fireball','fireburst','meteor'],frost:['icelance','iceburst','blizzard'],gsword:['crescent','cyclone','bladewave'],xbow:['explosive','snare','barrage'],storm:['chain','stormfield','thunder']};
  const fusedStyles={MM:['dash','royal','judgment'],MR:['spear','dash','spirit'],MS:['bladewave','elementfield','elementslam'],RS:['arrowfan','elementfield','arrowrain'],RR:['barrage','trap','dragon'],SS:['duality','elementburst','elementstorm']};
  const profiles={};
  for(const key of AW){const f=FUSED[key],colors=f?(f.el?[ELEM[f.el].c,f.el2?ELEM[f.el2].c:'#fff5cf']:[f.col,f.glow]):palette[key];
    profiles[key]=Object.freeze(SK[key].map((s,i)=>Object.freeze({name:s.n,style:(f?fusedStyles[f.arch]:baseStyles[key])[i],c:colors[0],c2:colors[1],element:f&&f.el||(['fire','frost','storm'].includes(key)?key:null),element2:f&&f.el2||null})));}
  let clock=0,seenProjectiles=new WeakSet(),unitStates=new WeakMap(),areas=[],debounce=new Map();
  const rnd=()=>P.avRand(),between=(a,b)=>a+(b-a)*rnd();
  const count=(hi,lo)=>P.avReduced?Math.max(3,Math.floor(lo*.65)):P.avHi?hi:lo;
  function near(x,y){const L=listener();return !L||Math.hypot(x-L.x,y-L.y)<visionR()+180;}
  function visible(u){const L=listener(),me=ME();return !!u&&!u.dead&&near(u.x,u.y)&&unitVisibleTo(u,me,L)&&!(u.invisT>0&&u!==me&&L&&Math.hypot(u.x-L.x,u.y-L.y)>170);}
  function send(type,at,o){return P.avEmit(type,Object.assign({x:at.x,y:at.y,height:5,a:.8},o));}
  function claim(key,slot,u){const id=key+'#'+slot,k=id+':'+(u?u.id:'event');if(clock-(debounce.get(k)??-99)<.24)return false;
    if(debounce.size>=192)debounce.delete(debounce.keys().next().value);debounce.set(k,clock);P.avMark(id);return true;}
  function ring(at,r,c,c2,life=.65){send('ring',at,{r:r*.18,r1:r,c,c2,life,width:.026,a:.85});}
  function rune(at,r,c,c2,life=1,spin=.6){send('rune',at,{r:r*.8,r1:r,c,c2,life,spin,height:7,a:.6});}
  function jets(at,r,c,c2,n,life=.8){for(let j=0;j<n;j++){const a=j/n*TAU,d=r*between(.35,.85);send('ember',at,{x:at.x+Math.cos(a)*d,y:at.y+Math.sin(a)*d,height:between(12,50),r:between(8,18),r1:2,c,c2,life:life*between(.7,1.15),vx:Math.cos(a)*between(40,110),vz:Math.sin(a)*between(40,110),vy:between(50,170),a:.75});}}
  function ice(at,r,c,c2,n,life=1.1){for(let j=0;j<n;j++){const a=j/n*TAU,d=r*between(.58,.87);send('shard',at,{x:at.x+Math.cos(a)*d,y:at.y+Math.sin(a)*d,height:between(18,38),r:between(7,13),r1:between(35,85),c,c2,life,angle:a,spin:.45,a:.8});}}
  function lightningSegment(p,q,c,c2,life,width){
    const dx=q.x-p.x,dy=q.h-p.h,dz=q.y-p.y,length=Math.hypot(dx,dy,dz);
    send('streak',{x:(p.x+q.x)*.5,y:(p.y+q.y)*.5},{height:(p.h+q.h)*.5,
      r:length*.55,width,angle:Math.atan2(dz,dx),tilt:Math.atan2(dy,Math.hypot(dx,dz)),c,c2,life,a:.8});
  }
  function strikes(at,r,c,c2,n,life=.5){for(let j=0;j<n;j++){
    const a=j/n*TAU+between(-.2,.2),d=r*between(.3,.85),x=at.x+Math.cos(a)*d,y=at.y+Math.sin(a)*d;
    const height=between(340,510),segments=P.avReduced?3:P.avHi?7:5,T=life*between(.7,1.2);
    let p={x:x+between(-30,30),y:y+between(-30,30),h:height};
    for(let k=1;k<=segments;k++){
      const f=k/segments,jitter=k===segments?0:24,q={x:x+between(-jitter,jitter),y:y+between(-jitter,jitter),h:height*(1-f)+8};
      lightningSegment(p,q,c,c2,T,P.avHi?4:3);
      if(!P.avReduced&&j%2===0&&k===Math.ceil(segments*.55)){
        const fork={x:q.x+Math.cos(a)*65,y:q.y+Math.sin(a)*65,h:q.h-65};
        lightningSegment(q,fork,c,c2,T*.75,2);
      }
      p=q;
    }
    send('ring',{x,y},{r:8,r1:38,height:5,c,c2,life:.4,width:.03,a:.7});
  }}
  function petals(at,r,c,c2,n,life=.7){for(let j=0;j<n;j++){const a=j/n*TAU;send('arc',at,{x:at.x+Math.cos(a)*r*.45,y:at.y+Math.sin(a)*r*.45,r:r*.12,r1:r*.3,height:between(15,65),arc:1.3,angle:a+PI/2,spin:2,c,c2,life,a:.85});}}
  function element(at,r,el,c,c2,sustain=false){
    if(el==='frost'){ice(at,r,c,c2,count(sustain?5:12,sustain?3:7),sustain?.65:1);if(!sustain)send('dome',at,{r:r*.12,r1:r*.92,height:5,c,c2,life:.8,a:.23});}
    else if(el==='storm'){strikes(at,r,c,c2,count(sustain?3:7,sustain?1:4),sustain?.28:.5);}
    else {const n=count(sustain?4:9,sustain?2:5);for(let j=0;j<n;j++){const a=j/n*TAU,d=r*between(.25,.78);send('pillar',at,{x:at.x+Math.cos(a)*d,y:at.y+Math.sin(a)*d,r:r*between(.035,.075),r1:r*between(.4,.85),height:5,c,c2,life:sustain?.5:.85,spin:between(-2,2),a:.62});}}
  }
  // A profile changes silhouette, not the authoritative radius/timing. Clear
  // footprint rings stay within the actual AOE; tall fragments supply spectacle.
  function pulse(key,slot,at,o={}){
    const p=profiles[key]?.[slot];if(!p||!near(at.x,at.y))return;
    const style=p.style,r=Math.max(20,o.r||90),c=o.c||p.c,c2=o.c2||p.c2,a=o.angle||0,life=o.life||.8;
    if(o.mark!==false)claim(key,slot,o.u);
    if(o.phase==='windup'){rune(at,r,c,c2,Math.max(.2,o.delay||.5),-.45);send('ring',at,{r:r*.94,r1:r,height:4,c,c2,life:o.delay||.5,width:.015,a:.38});return;}
    if(style==='dash'||style==='spear'||style==='bladewave'||style==='icelance'){
      for(let j=0;j<count(7,4);j++){const side=(j%2?1:-1)*(15+Math.floor(j/2)*13);send('streak',at,{x:at.x-Math.sin(a)*side,y:at.y+Math.cos(a)*side,height:35+j*4,r:r*between(.65,1.2),width:j<2?9:4,angle:a,tilt:.04,c,c2,life:.4,a:.8});}
      send('arc',at,{r:r*.4,r1:r,height:38,angle:a,arc:1.8,c,c2,life:.45,width:.035,a:.75});
    }else if(style==='ward'||style==='royal'){
      send('dome',at,{r:42,r1:85,height:3,c,c2,life:1.1,follow:o.u,a:.38});rune(at,82,c,c2,1.2,.7);ring(at,100,c,c2,.65);
      for(let j=0;j<count(8,5);j++){const an=j/8*TAU;send('shard',at,{x:at.x+Math.cos(an)*60,y:at.y+Math.sin(an)*60,r:6,r1:21,height:75,c,c2,life:1,vy:35,spin:1,a:.7});}
    }else if(style==='judgment'||style==='elementslam'||style==='meteor'){
      ring(at,r,c,c2,.75);rune(at,r*.94,c,c2,1.25,-.4);send('pillar',at,{r:r*.11,r1:r*2,height:5,c,c2,life:.7,a:.6});
      send('dome',at,{r:r*.16,r1:r*.91,c,c2,life:.65,height:7,a:.22});
      if(style==='elementslam'||style==='meteor')element(at,r,p.element||'fire',c,c2);else{ice(at,r,c,c2,count(10,6),.9);for(let j=0;j<3;j++)send('arc',at,{r:r*.5,r1:r*.95,height:24+j*18,angle:a+j*TAU/3,arc:1.8,c,c2,life:.55,width:.025,spin:j%2?2:-2});}
      jets(at,r*.8,c,c2,count(22,10),.95);
    }else if(style==='cyclone'||style==='spirit'){
      ring(at,r,c,c2,.55);for(let j=0;j<count(5,3);j++)send('arc',at,{r:r*(.5+j*.075),r1:r*.95,height:12+j*28,angle:j*TAU/3,arc:PI*1.35,spin:j%2?5:-4,c,c2,life:.9,a:.6,width:.035});jets(at,r*.7,c,c2,count(14,7));
    }else if(style==='warcry'){
      for(let j=0;j<3;j++)send('ring',at,{r:r*(.1+j*.1),r1:r,height:8+j*27,c,c2,life:.6+j*.14,width:.025,a:.7});rune(at,r*.45,c,c2,.9,-.6);jets(at,r*.35,c,c2,count(15,8));
    }else if(style==='fissure'){
      const length=o.len||r,n=count(11,7);for(let j=0;j<n;j++){const d=(j+.5)/n*length,q={x:at.x+Math.cos(a)*d,y:at.y+Math.sin(a)*d};send('shard',q,{height:between(10,32),r:between(10,18),r1:between(42,105),c,c2,life:.7+j/n*.4,angle:a,a:.7});send('streak',q,{r:length/n*1.35,width:5,height:8,angle:a,c,c2,life:.9,a:.8});}
    }else if(style==='shadow'||style==='veil'){
      ring(at,style==='veil'?110:75,c,c2,.65);petals(at,110,c,c2,count(8,5),.7);send('dome',at,{r:25,r1:100,height:12,c,c2,life:.6,a:.17});jets(at,70,c,c2,count(16,7),.9);
    }else if(style==='lotus'){
      rune(at,r*.9,c,c2,1,-1.1);petals(at,r,c,c2,count(16,9),1);for(let j=0;j<3;j++)send('arc',at,{r:r*.45,r1:r*.92,height:30+j*15,angle:a+j*TAU/3,arc:2.5,spin:4.5,c,c2,life:.9,a:.75});
    }else if(style==='arrowfan'||style==='barrage'){
      const n=style==='arrowfan'?5:6;for(let j=0;j<n;j++){const heading=a+(j-(n-1)/2)*.13;send('streak',at,{x:at.x+Math.cos(heading)*45,y:at.y+Math.sin(heading)*45,height:45,r:90,width:5,angle:heading,c,c2,life:.33,a:.9});}send('arc',at,{r:38,r1:85,height:30,angle:a,arc:1.6,c,c2,life:.4,width:.02});
    }else if(style==='snare'||style==='trap'){
      rune(at,r,c,c2,life,1);send('ring',at,{r:r*.8,r1:r,height:4,c,c2,life,width:.025,a:.75});for(let j=0;j<6;j++){const an=j/6*TAU;send('streak',at,{r:r*1.7,width:2,height:6,angle:an,c,c2,life:.8,a:.35});}
    }else if(style==='crescent'){
      for(let j=0;j<3;j++)send('arc',at,{r:r*(.68+j*.07),r1:r,height:18+j*19,angle:a,arc:(o.arc||.95)*2,spin:j?.2:-.35,c,c2,life:.55-j*.07,width:.035,a:j?.6:.9});jets(at,r*.65,c,c2,count(13,6),.5);
    }else if(style==='arrowrain'){
      rune(at,r,c,c2,.85,.4);const n=count(16,8);for(let j=0;j<n;j++){const an=j/n*TAU,d=r*Math.sqrt(rnd())*.88;send('streak',at,{x:at.x+Math.cos(an)*d,y:at.y+Math.sin(an)*d,height:between(170,320),r:120,width:4,angle:-.5,tilt:-1.35,vy:-420,c,c2,life:.65,a:.8});}if(p.element)element(at,r,p.element,c,c2,true);
    }else if(style==='fireball'||style==='explosive'||style==='fireburst'||style==='iceburst'||style==='blizzard'||style==='chain'||style==='stormfield'||style==='thunder'){
      ring(at,r,c,c2,.65);rune(at,r*.94,c,c2,style==='blizzard'?1.2:.8,-.65);
      const el=style==='iceburst'||style==='blizzard'?'frost':style==='chain'||style==='stormfield'||style==='thunder'?'storm':'fire';element(at,r,el,c,c2);jets(at,r*.5,c,c2,count(16,7),.65);
    }else if(style==='duality'||style==='elementburst'||style==='elementstorm'||style==='elementfield'){
      rune(at,r,c,c2,1.1,.7);send('rune',at,{r:r*.68,r1:r*.93,height:10,c:c2,c2:c,life:1.1,spin:-.9,a:.4});ring(at,r,c,c2,.7);element(at,r,p.element||'fire',c,c2);
      if(p.element2)element(at,r,p.element2,c2,c);send('dome',at,{r:r*.15,r1:r*.88,height:5,c,c2,life:.7,a:.18});
    }else if(style==='dragon'){
      for(let j=0;j<count(6,4);j++)send('arc',at,{r:30+j*9,r1:45+j*10,height:35+j*8,angle:a,arc:2,spin:j%2?.8:-.8,c,c2,life:.6,a:.7});send('pillar',at,{r:16,r1:170,c,c2,life:.55,a:.65});jets(at,65,c,c2,count(20,10));
    }
  }
  function areaProfile(a){const u=a.owner,key=u&&u.wk,f=key&&FUSED[key];let slot=-1;
    if(f){if(f.arch==='MM')slot=2;else if(f.arch==='MR')slot=2;else if(f.arch==='MS')slot=a.dot?1:2;else if(f.arch==='RS')slot=a.kind==='rain'||a.dot===3?2:1;else if(f.arch==='RR')slot=a.delay>0?1:0;else if(f.arch==='SS')slot=a.dot?2:1;}
    else if(key==='axe'&&a.kind==='line')slot=2;else if(key==='sword'&&a.kind==='judg')slot=2;else if(key==='bow'&&a.kind==='rain')slot=2;else if(key==='fire')slot=a.kind==='nova'?1:a.kind==='meteor'||a.kind==='burn'?2:0;else if(key==='frost')slot=a.kind==='frost'?1:2;else if(key==='gsword')slot=a.kind==='crescent'?0:1;else if(key==='xbow')slot=a.kind==='net'?1:a.kind==='volley'?2:0;else if(key==='storm')slot=a.kind==='static'?1:2;
    if(slot>=0&&profiles[key])return{key,slot,u,known:true};
    const generic={judg:['sword',2],line:['axe',2],rain:['bow',2],boom:['xbow',0],nova:['fire',1],meteor:['fire',2],burn:['fire',2],frost:['frost',1],blizz:['frost',2],crescent:['gsword',0],whirl:['gsword',1],net:['xbow',1],volley:['xbow',2],static:['storm',1],thunder:['storm',2],spirit:['fMR',2]};const g=generic[a.kind];return g?{key:g[0],slot:g[1],u:null,known:false}:null;
  }
  function areaRecord(a){const birth=gameT-a.t,owner=a.owner?.id??null;let q=areas.find(q=>q.kind===a.kind&&q.owner===owner&&Math.abs(q.birth-birth)<.32&&Math.abs(q.r-a.r)<4&&Math.hypot(q.x-a.x,q.y-a.y)<Math.max(65,a.r*.36));
    if(!q){if(areas.length>=96)areas.shift();q={kind:a.kind,owner,birth,r:a.r,x:a.x,y:a.y,last:clock,pre:false,hit:false,tick:0};areas.push(q);}q.x=a.x;q.y=a.y;q.last=clock;return q;}
  function areaFX(a,dt){if(!near(a.x,a.y))return;const p=areaProfile(a);if(!p)return;const q=areaRecord(a),o={r:a.r,len:a.len,angle:a.ang||0,arc:a.arc,u:p.u,mark:p.known};
    if(a.t<a.delay){if(!q.pre){q.pre=true;pulse(p.key,p.slot,a,Object.assign({},o,{phase:'windup',delay:Math.max(.1,a.delay-a.t)}));}return;}
    if(!q.hit){q.hit=true;pulse(p.key,p.slot,a,o);q.tick=clock+.25;}
    if(a.dot&&clock>=q.tick){q.tick=clock+(P.avReduced?.4:.22);const profile=profiles[p.key][p.slot],c=profile.c,c2=profile.c2;
      if(a.kind==='rain'||a.kind==='volley'){const n=count(5,3);for(let j=0;j<n;j++){const an=rnd()*TAU,d=Math.sqrt(rnd())*a.r*.9;send('streak',a,{x:a.x+Math.cos(an)*d,y:a.y+Math.sin(an)*d,height:240,r:105,width:3,tilt:-1.4,angle:-.5,vy:-430,c,c2,life:.58,a:.75});}}
      else if(a.kind==='spirit'){petals(a,a.r,c,c2,count(4,3),.65);}
      else {const el=a.el||(a.kind==='blizz'?'frost':a.kind==='static'||a.kind==='thunder'?'storm':'fire');element(a,a.r,el,c,c2,true);}
    }
  }
  function eventFX(e){if(e.x===undefined||!near(e.x,e.y))return;const u=e.id!==undefined?UMAP.get(e.id):null,key=u?.wk,a=e.a??Math.atan2(u?.fy||0,u?.fx||1);let k=null,i=0,r=e.r||90;
    switch(e.k){case'dash':if(key==='sword'){k=key;i=0;}else if(key==='bow'){k=key;i=1;}else if(key==='fMM'){k=key;i=0;}else if(key==='fMR'){k=key;i=1;}break;
      case'shield':k='sword';i=1;break;case'leap':if(key&&profiles[key]){k=key;i=2;}break;case'spin':if(key==='axe'){k=key;i=0;r=190;}break;
      case'cry':k='axe';i=1;break;case'blink':k='dagger';i=0;break;case'smoke':k='dagger';i=1;break;case'lotus':k='dagger';i=2;break;
      case'chain':k='storm';i=0;r=85;break;case'royal':k='fMM';i=1;break;case'gust':k='fMR';i=1;break;case'trap':k='fRR';i=1;r=170;break;}
    if(k){const opts={r,angle:a,u:u&&visible(u)?u:null};if(e.k==='leap'){opts.phase='windup';opts.delay=.5;}
      pulse(k,i,e,opts);if(e.k==='blink'&&e.x2!==undefined)pulse(k,i,{x:e.x2,y:e.y2},{r:90,mark:false});
      if(e.k==='chain'&&e.p){for(let j=1;j<e.p.length;j++)strikes({x:e.p[j][0],y:e.p[j][1]},45,palette.storm[0],palette.storm[1],count(2,1),.28);}
    }
  }
  function projectileSkill(p){const u=p.owner,key=u?.wk;if(!u||!profiles[key])return null;let i=-1;
    if(p.kind===0&&key==='bow'&&u.castAnim>0)i=0;else if(p.kind===2&&key==='fire')i=0;else if(p.kind===4&&key==='frost')i=0;else if(p.kind===5&&key==='bow')i=1;else if(p.kind===6&&key==='gsword')i=2;else if(p.kind===8)i=key==='fRR'?0:key==='xbow'?0:-1;else if(p.kind===9&&key==='xbow')i=1;else if(p.kind===11&&key==='fMR')i=0;else if(p.kind===12&&FUSED[key]?.arch==='MS')i=0;else if(p.kind===13&&FUSED[key]?.arch==='RS')i=0;else if(p.kind===14&&key==='fRR')i=2;else if(p.kind===15&&FUSED[key]?.arch==='SS')i=0;
    return i<0?null:{key,slot:i,u};}
  function frameFX(T,dt){clock+=Math.min(.1,Math.max(0,dt));areas=areas.filter(q=>clock-q.last<1.1);for(const [k,t]of debounce)if(clock-t>3)debounce.delete(k);
    for(const p of projs){if(!near(p.x,p.y))continue;const skill=projectileSkill(p);
      if(!seenProjectiles.has(p)){seenProjectiles.add(p);if(skill&&visible(skill.u))pulse(skill.key,skill.slot,skill.u,{u:skill.u,r:p.kind===14?100:75,angle:Math.atan2(p.vy,p.vx)});}
    }
    // One clocked trail pass, independent of display refresh and object identity
    // (the client replaces projectile objects on each incoming snapshot).
    if(clock>=(P._avTrailAt||0)){P._avTrailAt=clock+(P.avReduced?.1:P.avHi?.035:.065);
      let n=0;for(const p of projs){if(n++>=48)break;if(!near(p.x,p.y))continue;const el=p.el||(p.kind===1||p.kind===2||p.kind===8||p.kind===14?'fire':p.kind===3||p.kind===4?'frost':p.kind===10?'storm':null),c=el?ELEM[el].c:p.kind===11?'#7ff0d8':'#c9efef',c2=el==='fire'?'#ffe5a0':el==='storm'?'#f1dcff':'#efffff',a=Math.atan2(p.vy,p.vx),big=[2,4,6,11,12,14,15].includes(p.kind);
        send('streak',p,{height:42,r:big?75:34,width:big?5:2.5,angle:a,c,c2,life:.18,a:.7});
        if(big)send('ember',p,{height:42,r:p.kind===14?36:14,r1:2,c,c2,life:.25,a:.45});
        if(p.kind===4||p.kind===12&&p.el==='frost')send('shard',p,{height:40,r:4,r1:13,c,c2,life:.3,vy:-20,angle:a,a:.7});
      }
    }
    for(const u of units){if(!u.hero||!visible(u))continue;let s=unitStates.get(u);if(!s){s={at:0,rapid:false,spin:false};unitStates.set(u,s);}
      const rapid=!!u.rapid,spin=u.spinT>0;if(rapid&&!s.rapid&&u.wk==='fRR')pulse('fRR',0,u,{r:80,u,angle:Math.atan2(u.fy,u.fx)});if(spin&&!s.spin&&u.wk==='axe')pulse('axe',0,u,{r:190,u});s.rapid=rapid;s.spin=spin;
      if(clock<s.at)continue;s.at=clock+(P.avReduced?.35:.18);
      if(u.spinT>0&&(u.wk==='axe'||u.wk==='fMR')){const c=u.wk==='axe'?palette.axe[0]:'#7ff0d8',r=u.spinR||190;send('arc',u,{r:r*.72,r1:r,height:30,arc:4.2,spin:5,angle:T*4,c,c2:'#fff0ce',life:.4,follow:u,width:.028,a:.65});}
      if(u.lotusT>0){petals(u,u.lotusR||300,palette.dagger[0],palette.dagger[1],count(5,3),.5);}
      if(u.shieldHp>0&&u.shieldT>0)send('rune',u,{r:65,r1:74,height:7,c:u.wk==='fMM'?'#ff7a60':'#ffe4a4',c2:'#fff5df',life:.4,follow:u,spin:.5,a:.28});
    }
  }
  P.avRecipeReset=function(){clock=0;seenProjectiles=new WeakSet();unitStates=new WeakMap();areas=[];debounce.clear();P._avTrailAt=0;};
  const event=P.doFx,area=P.aoeVis,extra=P.fxExtra;
  P.doFx=function(e,me,L){const result=event.call(this,e,me,L);eventFX(e);return result;};
  P.aoeVis=function(a,T,dt,L){const result=area.call(this,a,T,dt,L);areaFX(a,dt);return result;};
  P.fxExtra=function(T,dt,me,L){frameFX(T,dt);return extra.call(this,T,dt,me,L);};
  window.ArenaVFX.profiles=Object.freeze(profiles);
  window.ArenaVFX.preview=function(key,slot,position){const at=position||listener();if(at)pulse(key,slot,at,{r:180,mark:false,angle:0});};
})();
