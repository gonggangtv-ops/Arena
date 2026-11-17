// ===================== The Cursed Realm: five regions, weapon traits & runes, coins + shop, special skills, dodge / block =====================
// ---- regions of the Forsaken Continent: 0 Fallen Kingdom (centre) · 1 Cursed Forest (NW) · 2 Frozen Sanctuary (NE) · 3 Ashen Wastes (SE) · 4 The Abyss (SW) ----
const REG={N:['อาณาจักรล่มสลาย','ป่าต้องสาป','วิหารน้ำแข็ง','แดนเถ้าถ่าน','ห้วงอเวจี'],IC:['🏰','🌲','❄️','🌋','🕳️'],ADJ:['','ต้องสาป','น้ำแข็ง','เถ้าถ่าน','อเวจี'],
  TIP:['เหรียญจากมอนสเตอร์ +25%','มอนสเตอร์ว่องไวและมีพิษ','โดนตีแล้วช้าลง · ฟื้นมานาเร็วขึ้น','โดนตีแล้วติดไฟ · ระวังลาวาปะทุ','มอนสเตอร์แกร่งมาก · เหรียญ +60%'],
  G:[[1.5,1.3,.9,.5],[.6,1.02,.62,.45],[2.3,2.45,2.7,.93],[.82,.58,.5,.9],[1.1,.66,1.55,.85]],   // ground: tint of the grass's own brightness, how much
  OBJ:[['#b09868',.3],['#2a4a34',.4],['#e8f4ff',.6],['#3a2c28',.62],['#6a3aa8',.5]],MOB:['#c8b890','#6fbf6a','#bfe6ff','#ff7a4a','#b070ff'],
  FOG:['#2a2620','#0e1c14','#9fb8d0','#3a1c14','#1a0c2c'],HEMI:['#e8d8b0','#8ad0a0','#d8ecff','#ff9a70','#b08aff'],LUM:[1,.85,1.3,.95,.85],GLOW:[null,['#7dff9a',110],['#9fe0ff',150],['#ff5a1a',210],['#b060ff',190]],
  tw:[0,0,0,0,0],tq:[0,0,0,0],aw:null,cur:-1,mats:new Map(),
  w(x,y,o){if(!this.nz){this.nz=makeNoise(mulberry32(77),2400);this.nz2=makeNoise(mulberry32(91),1700)}
    const dx=x-CX,dy=y-CY,d=Math.hypot(dx,dy)+(this.nz(x,y)-.5)*1300,a=Math.atan2(dy,dx)+(this.nz2(x,y)-.5)*1.1,kc=clamp((3300-d)/700,0,1);let s=0;
    for(let i=0;i<4;i++){const c=Math.max(0,Math.cos(a+2.356-i*1.5708)),c2=c*c,v=c2*c2*c2*c2*c;o[i+1]=v;s+=v}s=s||1;for(let i=1;i<5;i++)o[i]=o[i]/s*(1-kc);o[0]=kc;return o},
  at(x,y){const o=this.w(x,y,this.tw);let b=0;for(let i=1;i<5;i++)if(o[i]>o[b])b=i;return b},
  mix(x,y,q){q=q||this.tq;const o=this.w(x,y,this.tw);q[0]=q[1]=q[2]=q[3]=0;for(let i=0;i<5;i++){const g=this.G[i],k=o[i];q[0]+=g[0]*k;q[1]+=g[1]*k;q[2]+=g[2]*k;q[3]+=g[3]*k}return q},
  objCol(c,x,z){if(!this.oc){this.oc=new THREE.Color();this.ot=this.OBJ.map(o=>new THREE.Color(o[0]))}const i=this.at(x,z);return this.oc.set(c).lerp(this.ot[i],this.OBJ[i][1])},
  GC:[[1.2,1.05,.7],[.7,.9,.7],[1.7,1.9,2.2],[.5,.4,.32],[1,.6,1.4]],
  gc(i){if(!this.gcc)this.gcc=this.GC.map(c=>new THREE.Color(c[0],c[1],c[2]));return this.gcc[i]},
  tree(x,y,v,roll){if(v===6)return v;const i=this.at(x,y),r=(roll*13.37)%1;
    if(i===0)return r<.35?-1:r<.7?1:2;if(i===1)return r<.5?4:r<.7?1:r<.88?5:3;if(i===2)return r<.45?2:r<.75?3:r<.87?5:0;if(i===3)return r<.55?-1:5;return r<.5?3:r<.85?5:4},
  glows(R){const rn=mulberry32(4242);for(let k=0;k<1700;k++){const x=1200+rn()*(WORLD-2400),y=1200+rn()*(WORLD-2400),s=rn();if(outsideD(x,y)>-80||inWater(x,y))continue;const g=this.GLOW[this.at(x,y)];if(!g)continue;
      R.glows.push([x,R.gY(x,y)+8+s*30,y,g[0],g[1]*(.6+s*.8)])}},
  // light and haze follow the region the hero is standing in
  atmo(R,L,dk,inCave){if(!MOON){if(L){const b=inDG(L)?this.cur:this.at(L.x,L.y);if(b!==this.cur&&state==='play'){if(this.cur>=0&&gameT>6)announce={txt:this.IC[b]+' '+this.N[b]+' — '+this.TIP[b],t:3.2};this.cur=b}}if(L){const n=clamp((.55-dk)/.35,0,1);this.motes(R,L,[lerp(5,9,n),lerp(3,5,n),lerp(.32,.95,n),lerp(1,.75,n),lerp(.93,1,n),lerp(.72,.35,n)]);if(this.mp){this.mp.material.size=lerp(10,15,n);this.mp.visible=this.mp.visible&&!inCave}}return}if(!this.fc){this.fc=this.FOG.map(c=>new THREE.Color(c));this.hc=this.HEMI.map(c=>new THREE.Color(c));this.aw=[1,0,0,0,0]}if(!L)return;
    const o=this.w(L.x,L.y,this.tw),a=this.aw;let b=0;for(let i=0;i<5;i++){a[i]+=(o[i]-a[i])*.04;if(a[i]>a[b])b=i}
    if(b!==this.cur&&state==='play'){if(this.cur>=0&&gameT>6&&!inDG(L))announce={txt:this.IC[b]+' '+this.N[b]+' — '+this.TIP[b],t:3.2};this.cur=b}
    this.motes(R,L);if(inCave)return;let fr=0,fg=0,fb=0,hr=0,hg=0,hb=0,lm=0;for(let i=0;i<5;i++){const k=a[i],f=this.fc[i],h=this.hc[i];fr+=f.r*k;fg+=f.g*k;fb+=f.b*k;hr+=h.r*k;hg+=h.g*k;hb+=h.b*k;lm+=this.LUM[i]*k}
    const nk=.35+.65*dk;R.scene.fog.color.lerp(R.c1.setRGB(fr*nk,fg*nk,fb*nk),.5);R.c1.setRGB(hr,hg,hb);R.hemi.color.lerp(R.c1,.5);R.sun.color.lerp(R.c1,.25);R.hemi.intensity*=lm;R.sun.intensity*=lm},
  // drifting motes around the hero: dust in the kingdom, spores in the forest, snow on the ice, embers over the ash, void sparks in the abyss
  MC:['#ffe2a0','#9dffb0','#ffffff','#ff8a3a','#c48aff'],MV:[[6,4,.5],[10,7,.6],[26,-70,1],[14,46,.8],[5,22,.7]],  // [sideways drift, vertical speed, opacity]
  motes(R,L,ov){const N=R.hi?300:140,W=1900,D=1500,H=460;
    if(!this.mp){const g=new THREE.BufferGeometry(),p=new Float32Array(N*3),s=new Float32Array(N);for(let i=0;i<N;i++){p[i*3]=L.x+(Math.random()-.5)*W;p[i*3+1]=Math.random()*H;p[i*3+2]=L.y+(Math.random()-.5)*D;s[i]=Math.random()*6.283}
      g.setAttribute('position',new THREE.BufferAttribute(p,3));const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d'),gr=x.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,32,32);
      const m=new THREE.PointsMaterial({size:13,map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true,fog:false});
      this.mp=new THREE.Points(g,m);this.mp.frustumCulled=false;this.mp.renderOrder=5;this.ms=s;this.mcol=this.MC.map(c=>new THREE.Color(c));this.mt=performance.now();this.mscene=null}
    if(this.mscene!==R.scene){R.scene.add(this.mp);this.mscene=R.scene}
    const now=performance.now(),dt=Math.min(.05,(now-this.mt)/1000);this.mt=now;const a=this.aw,p=this.mp.geometry.attributes.position.array,s=this.ms,T=now/1000;let vx=0,vy=0,op=0,r=0,g=0,b=0;
    if(ov){vx=ov[0];vy=ov[1];op=ov[2];r=ov[3];g=ov[4];b=ov[5]}else for(let i=0;i<5;i++){const k=a[i],v=this.MV[i],c=this.mcol[i];vx+=v[0]*k;vy+=v[1]*k;op+=v[2]*k;r+=c.r*k;g+=c.g*k;b+=c.b*k}
    this.mp.material.color.setRGB(r,g,b);this.mp.material.opacity=op;this.mp.visible=!inDG(L);
    for(let i=0;i<N;i++){const j=i*3,ph=s[i];p[j]+=(Math.sin(T*.7+ph)*vx+vx*.6)*dt;p[j+1]+=(vy*(.6+.4*Math.sin(ph*3))+Math.sin(T*1.3+ph)*6)*dt;p[j+2]+=Math.cos(T*.5+ph*2)*vx*dt;
      if(p[j+1]<0)p[j+1]+=H;else if(p[j+1]>H)p[j+1]-=H;let dx=p[j]-L.x,dz=p[j+2]-L.y;if(dx>W/2)p[j]-=W;else if(dx<-W/2)p[j]+=W;if(dz>D/2)p[j+2]-=D;else if(dz<-D/2)p[j+2]+=D}
    this.mp.geometry.attributes.position.needsUpdate=true},
  // Moonfall sets one moonlit look; shift it toward the region the hero is in (weights eased by atmo)
  blend(R,k){if(!this.aw||!this.fc)return;const a=this.aw;let fr=0,fg=0,fb=0,hr=0,hg=0,hb=0;for(let i=0;i<5;i++){const w=a[i],f=this.fc[i],h=this.hc[i];fr+=f.r*w;fg+=f.g*w;fb+=f.b*w;hr+=h.r*w;hg+=h.g*w;hb+=h.b*w}
    R.scene.fog.color.lerp(R.c1.setRGB(fr,fg,fb),k);R.scene.background&&R.scene.background.isColor&&R.scene.background.copy(R.scene.fog.color);R.c1.setRGB(hr,hg,hb);R.hemi.color.lerp(R.c1,k);R.sun.color.lerp(R.c1,k*.35)},
  mat(m,g,el){const k=m.uuid+'|'+g+(el?'e':'');let c=this.mats.get(k);if(!c){c=m.clone();c.onBeforeCompile=m.onBeforeCompile;c.customProgramCacheKey=m.customProgramCacheKey;if(!this.mc)this.mc=this.MOB.map(x=>new THREE.Color(x));
      if(g>0)c.color.lerp(this.mc[g],.55);if(el&&c.emissive){c.emissive.copy(this.mc[g]);c.emissiveIntensity=.4}this.mats.set(k,c)}return c},
  tintObj(o,u){const g=u.rg>0?u.rg:0;o.root.traverse(m=>{if(m.isMesh&&m.material&&m.material.color&&!m.material.transparent)m.material=this.mat(m.material,g,u.elite)});if(u.elite)o.root.scale.multiplyScalar(1.2)}};
// monsters take after the land they live in (same on host and clients: it only depends on the mob's id and home)
function regMob(u){if(u.boss)return;const D=inDG(u.home),g=D?0:REG.at(u.home.x,u.home.y);u.rg=D?-1:g;let hp=1,dm=1,sp=1;
  if(g===1)sp=1.1;else if(g===2){hp=1.15;sp=.93}else if(g===3)dm=1.15;else if(g===4){hp=1.3;dm=1.25}
  u.elite=!u.golem&&!u.zombie&&!D&&(Math.imul(u.id+7,2654435761)>>>0)%100<9;if(u.elite){hp*=2.3;dm*=1.35;u.r*=1.18}
  u.maxHp=Math.round(u.maxHp*hp);u.hp=u.maxHp;u.atkDmg*=dm;u.spdBase*=sp;u.name=(u.elite?'★ ':'')+u.def.name+(g>0?' '+REG.ADJ[g]:'')}
// ---- coins ----
const COIN={goblin:6,wolf:10,ogre:22,golem:45,guardian:80,boss:400,zombie:8,zrunner:7,zbrute:22,zlord:70};
function coinKill(t,src){if(!src||!src.hero||src===t)return;let c;
  if(t.hero){if(!isEnemy(src,t))return;c=50+Math.round((t.gold||0)*.35);t.gold=Math.round((t.gold||0)*.65)}
  else{c=(COIN[t.kind]||6)*(.6+.4*(t.scale||1));if(t.elite)c*=3;if(t.rg===4)c*=1.6;else if(t.rg===0)c*=1.25;if(wvT(src.wv)===6)c*=1.25;c=Math.max(1,Math.round(c));if(t.elite)dropItem({k:'c',x:t.x,y:t.y,n:1})}
  src.gold=(src.gold||0)+c;if(isHuman(src))fxTextFor(t.x,t.y-t.r-44,'+'+c+' 🪙','#ffd35a',1.1,[src.id])}
// ---- weapon traits (whole weapon) and runes (one per skill): two swords are rarely the same ----
const TRAITS=[null,{n:'เพลิง',ic:'🔥',d:'การโจมตีทำให้ติดไฟ'},{n:'เยือกแข็ง',ic:'❄️',d:'การโจมตีทำให้ศัตรูช้าลง'},{n:'อัสนี',ic:'⚡',d:'มีโอกาสปล่อยสายฟ้าลูกโซ่'},{n:'โลหิต',ic:'🩸',d:'ดูดเลือด 7% ของดาเมจ'},
  {n:'พิฆาต',ic:'💀',d:'แรงขึ้น 25% ใส่เป้าหมายที่เลือดต่ำกว่า 35%'},{n:'นักล่า',ic:'🏹',d:'แรงขึ้น 30% ใส่มอนสเตอร์ · เหรียญ +25%'},{n:'เปิดศึก',ic:'👑',d:'แรงขึ้น 18% ใส่เป้าหมายที่เลือดเกิน 80%'}];
const RUNES=[null,{n:'สะท้อน',ic:'🔁',d:'ร่ายซ้ำอีกครั้งด้วยพลัง 50%'},{n:'ว่องไว',ic:'⏱️',d:'คูลดาวน์ -28%'},{n:'หนักหน่วง',ic:'💥',d:'ดาเมจ +32% · คูลดาวน์ +18%'},{n:'ฟื้นฟู',ic:'💚',d:'ร่ายแล้วฟื้นเลือด 5%'},
  {n:'เกราะ',ic:'🛡️',d:'ร่ายแล้วได้โล่ 7% ของเลือด 3 วิ'},{n:'เร่ง',ic:'💨',d:'ร่ายแล้ววิ่งเร็วขึ้น 1.6 วิ'},{n:'เดือด',ic:'😡',d:'ร่ายแล้วได้ความเดือด +3'},{n:'ประหยัด',ic:'💧',d:'คืนมานา 60%'}];
const wvT=v=>(v|0)&7,wvR=(v,i)=>((v|0)>>(3+i*4))&15;
function wvRoll(tier,R){R=R||Math.random;tier=Math.max(0,tier|0);const nr=tier>=4?3:tier>=2?2:1,tr=R()<(tier>=3?1:tier>=1?.6:.4)?1+Math.floor(R()*7):0,r=[0,0,0],sl=[0,1,2];
  for(let k=2;k>0;k--){const j=Math.floor(R()*(k+1)),t=sl[k];sl[k]=sl[j];sl[j]=t}for(let k=0;k<nr;k++)r[sl[k]]=1+Math.floor(R()*8);return tr|r[0]<<3|r[1]<<7|r[2]<<11}
function itWV(it){if(it.wv==null)it.wv=wvRoll(it.tier,mulberry32(Math.imul(it.id+11,2654435761)>>>0));return it.wv}
function wvIcons(v){let s=TRAITS[wvT(v)]?TRAITS[wvT(v)].ic:'';for(let i=0;i<3;i++){const r=RUNES[wvR(v,i)];if(r)s+=r.ic}return s}
function wvText(v){const a=[];const t=TRAITS[wvT(v)];if(t)a.push(t.ic+t.n);for(let i=0;i<3;i++){const r=RUNES[wvR(v,i)];if(r)a.push('QER'[i]+r.ic+r.n)}return a.join(' · ')}
function castX(u,i,ap){const rn=u.hero?wvR(u.wv,i):0,mp0=u.mp,a0=u.atkDmg,d0=u.dmgB;let k=rn===3?1.32:1;if(u._echo)k*=.5;
  if(k!==1){const base=spellAmp(u)-u.dmgB;u.atkDmg*=k;u.dmgB=(1+base+d0)*k-1-base}
  const ok=cast0(u,i,ap);u.atkDmg=a0;u.dmgB=d0;if(!ok||u._echo||!rn)return ok;
  if(rn===1)u.echoQ={i,ap:ap?{x:ap.x,y:ap.y}:null,t:.55};else if(rn===2)u.cd[i]*=.72;else if(rn===3)u.cd[i]*=1.18;else if(rn===4)heal(u,u.maxHp*.05);
  else if(rn===5){u.shieldHp=Math.max(u.shieldHp,u.maxHp*.07);u.shieldT=Math.max(u.shieldT,3)}else if(rn===6)u.spdPT=Math.max(u.spdPT,1.6);else if(rn===7){addFury(u);addFury(u);addFury(u)}
  else if(rn===8)u.mp=Math.min(u.maxMp,u.mp+Math.max(0,mp0-u.mp)*.6);return ok}
// ---- every hit passes through here: dodge / block first, then weapon traits and what the local monsters do ----
function curDmg(t,amt,type,src,quiet){amt=tpsGuard(t,amt,src);if(amt<=0)return 0;if(!src||src===t)return amt;
  if(src.hero){const tr=wvT(src.wv);if(tr===5&&t.hp<t.maxHp*.35)amt*=1.25;else if(tr===6&&t.mob)amt*=1.3;else if(tr===7&&t.hp>t.maxHp*.8)amt*=1.18;if(src.rageT>0)amt*=1.15;
    if(!quiet&&tr&&tr<=4&&!CUR.busy&&isEnemy(src,t)){CUR.busy=1;if(tr===4)heal(src,amt*.07);else if(gameT-(t._et||-9)>.45||t._es!==src.id){t._et=gameT;t._es=src.id;elemHit(src,t,EL[tr-1],.6)}CUR.busy=0}}
  else if(src.mob&&t.hero&&!quiet&&src.rg>0){const g=src.rg;if(g===2){t.slowAmt=Math.max(t.slowT>1.5?t.slowAmt:0,.3);t.slowT=Math.max(t.slowT,1.5)}else if(g===4)t.mp=Math.max(0,t.mp-(8+src.atkDmg*.12));
    else{const dps=g===3?6+src.atkDmg*.2:4+src.atkDmg*.12;if(t.burnT<=0||t.burnDps<dps){t.burnDps=dps;t.burnSrc=null}t.burnT=Math.max(t.burnT,g===3?2.5:3)}}
  return amt}
// ---- special skills bought with coins (one slot, key V) ----
const SPX=[null,{k:'blink',n:'วาร์ปเงา',ic:'🌀',cd:[13,11,9],p:160,d:'วาร์ปไปยังจุดที่เล็งทันที'},{k:'heal',n:'แสงฟื้นฟู',ic:'✨',cd:[26,24,22],p:160,d:'ฟื้นเลือด 28/36/44% ใน 3 วิ และล้างสถานะช้า'},
  {k:'rage',n:'บ้าคลั่ง',ic:'👹',cd:[26,24,22],p:180,d:'6 วิ: ตีเร็วขึ้น 35/45/55% และดาเมจ +15%'},{k:'meteor',n:'อุกกาบาต',ic:'☄️',cd:[20,18,16],p:200,d:'เรียกอุกกาบาตใส่จุดที่เล็ง เผาศัตรู'},
  {k:'ward',n:'โล่วิญญาณ',ic:'🔰',cd:[24,22,20],p:160,d:'โล่ 22/30/38% ของเลือด นาน 5 วิ'},{k:'nova',n:'คลื่นเยือกแข็ง',ic:'💠',cd:[18,16,14],p:180,d:'ระเบิดรอบตัว ตรึงศัตรู 1.2 วิ'}];
function castSpecial(u,ap){if(!u)return false;const S=SPX[u.xs|0];if(!S||u.dead||u.stunT>0||u.xcd>0||u.fuseT>0)return false;if(ap&&!(Number.isFinite(ap.x)&&Number.isFinite(ap.y)))ap=null;const L=clamp(u.xl||1,1,3)-1,M=[1,1.25,1.5][L];
  let p=ap||(S.k==='meteor'?aim(u,650):{x:u.x+u.fx*460,y:u.y+u.fy*460});
  switch(S.k){
    case 'blink':{const q=landSpot(u,clampTo(u,p,520));burstE(u.x,u.y,'#b08aff',18);fxE('dash',{id:u.id,x:u.x|0,y:u.y|0,a:+Math.atan2(q.y-u.y,q.x-u.x).toFixed(2)});u.x=q.x;u.y=q.y;u.dash=null;burstE(u.x,u.y,'#b08aff',18);sndAt('dash',u.x,u.y);break}
    case 'heal':u.hotT=3;u.hotV=u.maxHp*[.28,.36,.44][L]/3;u.slowT=0;fxE('potion',{id:u.id,x:u.x|0,y:u.y|0,c:'#9dffb0'});sndAt('potion',u.x,u.y);break;
    case 'rage':u.asT=6;u.asAmt=Math.max(u.asAmt||0,[.35,.45,.55][L]);u.rageT=6;u.buffT=Math.max(u.buffT||0,6);sndAt('cry',u.x,u.y);fxE('cry',{id:u.id,x:u.x|0,y:u.y|0,r:200});break;
    case 'meteor':{p=clampTo(u,p,700);aoe({x:p.x,y:p.y,r:230,dmg:(120+24*u.lvl)*M*(1+spellAmp(u)),type:'m',owner:u,delay:.85,kind:'meteor',big:true,burn:(8+u.lvl)*M});sndAt('meteor',p.x,p.y);u.castAnim=.4;break}
    case 'ward':u.shieldHp=Math.max(u.shieldHp,u.maxHp*[.22,.3,.38][L]);u.shieldT=5;sndAt('shield',u.x,u.y);fxE('shield',{id:u.id,x:u.x|0,y:u.y|0});break;
    case 'nova':aoe({x:u.x,y:u.y,r:300,dmg:(70+16*u.lvl)*M*(1+spellAmp(u)),type:'m',owner:u,delay:.12,kind:'nova',root:1.2,slow:2.2,slowAmt:.4});sndAt('boom',u.x,u.y);u.castAnim=.4;break}
  u.xcd=S.cd[L];u.revealT=Math.max(u.revealT||0,1);if(isHuman(u))fxTextFor(u.x,u.y-92,S.ic+' '+S.n,'#e8d8a0',1.1,[u.id]);return true}
// ---- shop: open anywhere, pay with coins ----
function shopPrice(u,k){if(k==='hp')return 25;if(k==='mp')return 20;if(k==='big')return 70;if(k==='lv')return u.lvl>=MAXL?null:100+60*(u.lvl-1);if(k==='rf')return u.wk?50+25*Math.max(0,u.wt):null;
  if(k[0]==='x'){const S=SPX[+k[1]];if(!S)return null;if((u.xs|0)===+k[1])return (u.xl||1)>=3?null:Math.round(S.p*.6*(u.xl||1));return S.p}return null}
function shopBuy(u,k){if(!u||!u.hero||u.dead)return false;const pr=shopPrice(u,k),H=isHuman(u)?[u.id]:null,no=s=>{if(H)fxTextFor(u.x,u.y-84,s,'#ffb0a0',1.2,H);return false};
  if(pr==null)return no('ซื้อไม่ได้');if((u.gold||0)<pr)return no('เหรียญไม่พอ');let msg='';
  if(k==='hp'||k==='mp'||k==='big'){const b=k==='hp'?0:k==='mp'?1:2;if(!bagAdd(u,b))return no('🎒 กระเป๋าเต็ม');msg='🎒 +'+BAG[b].ic+' '+BAG[b].n}
  else if(k==='lv'){u.gold-=pr;gainXp(u,needXp(u.lvl)-u.xp+.01);sndAt('chest',u.x,u.y);return true}
  else if(k==='rf'){let v=u.wv|0;for(let n=0;n<8&&v===(u.wv|0);n++)v=wvRoll(u.wt);u.wv=v;msg='⚒️ '+(wvText(v)||'ไม่มีความสามารถพิเศษ');sndAt('anvil',u.x,u.y);fxE('equip',{id:u.id,x:u.x|0,y:u.y|0,c:'#ffd27a'})}
  else{const id=+k[1],S=SPX[id];if((u.xs|0)===id)u.xl=(u.xl||1)+1;else{u.xs=id;u.xl=1;u.xcd=Math.min(u.xcd||0,3)}msg=S.ic+' '+S.n+' Lv.'+u.xl}
  u.gold-=pr;if(k!=='rf')sndAt('chest',u.x,u.y);if(H&&msg)fxTextFor(u.x,u.y-84,msg,'#ffe9a8',1.8,H);return true}
// ---- per-frame host work: echoes, cooldowns, region effects, lava, bots that shop ----
const HAZ={id:-5,team:-5,x:0,y:0,lvl:1},ERUPT=[];
function curTick(dt){for(let k=ERUPT.length-1;k>=0;k--){const e=ERUPT[k];e.t-=dt;if(e.t>0)continue;ERUPT.splice(k,1);
    for(const u of units){if(!u.hero||u.dead||Math.hypot(u.x-e.x,u.y-e.y)>e.r+u.r*.5)continue;dealDamage(u,e.dmg,'m',null);if(!u.dead){u.burnDps=Math.max(u.burnT>0?u.burnDps:0,e.dmg*.12);u.burnSrc=null;u.burnT=Math.max(u.burnT,2.5)}}}
  for(const u of units){if(!u.hero||u.dead)continue;if(u.gold===undefined){u.gold=0;u.sta=100;u.blkT=0;u.rollT=0;u.xcd=0;u.erT=6+Math.random()*6}
    if(u.wk&&u.wv===undefined)u.wv=0;if(u.xcd>0)u.xcd-=dt;if(u.rageT>0)u.rageT-=dt;
    if(u.echoQ){u.echoQ.t-=dt;if(u.echoQ.t<=0){const q=u.echoQ,cd=u.cd[q.i],mp=u.mp;u.echoQ=null;u.cd[q.i]=0;u.mp=1e6;u._echo=1;try{castX(u,q.i,q.ap)}finally{u._echo=0;u.mp=mp;u.cd[q.i]=cd}}}
    if(inDG(u))continue;const g=REG.at(u.x,u.y);
    if(g===2)u.mp=Math.min(u.maxMp,u.mp+u.mpRegen*.5*dt);
    else if(g===3){u.erT-=dt;if(u.erT<=0){u.erT=7+Math.random()*6;const a=Math.random()*6.283,d=Math.random()*190,x=u.x+(u.mvx||0)*speedOf(u)*.7+Math.cos(a)*d,y=u.y+(u.mvy||0)*speedOf(u)*.7+Math.sin(a)*d;
        if(!houseAt({x,y})){ERUPT.push({x,y,r:175,t:1.15,dmg:34+7*u.lvl});aoe({x,y,r:175,dmg:0,type:'m',owner:HAZ,delay:1.15,kind:'meteor'});sndAt('meteor',x,y)}}}
    if(isHuman(u))continue;
    // bots: stay stocked, buy a special skill, then books; use the special when it helps
    if((frameN+u.id*37)%200===0){if(u.bag[0]<2)shopBuy(u,'hp');if(!u.xs&&u.gold>=210)shopBuy(u,'x'+(1+u.id%6));else if(u.xs&&shopPrice(u,'lv')!=null&&u.gold>=shopPrice(u,'lv')+30)shopBuy(u,'lv')}
    if(u.xs&&!(u.xcd>0)&&(frameN+u.id)%20===0){const k=SPX[u.xs].k,t=u.ai&&u.ai.tgt&&!u.ai.tgt.dead?u.ai.tgt:null,hurt=u.hp<u.maxHp*.5&&gameT-u.lastDmgT<3,d=t?dist(u,t):1e9;
      if(k==='heal'||k==='ward'){if(hurt)castSpecial(u)}else if(k==='blink'){if(hurt&&t&&u.hp<u.maxHp*.3)castSpecial(u,{x:u.x+(u.x-t.x)/(d||1)*500,y:u.y+(u.y-t.y)/(d||1)*500})}
      else if(t&&d<(k==='nova'?250:k==='rage'?320:620))castSpecial(u,{x:t.x,y:t.y})}}}
// ---- dodge / block / stamina (host) ----
function tpsHost(u,inp,dt){if(u.sta===undefined){u.sta=100;u.blkT=0;u.rollT=0}const b=!!inp.blk&&u.sta>1&&!u.dash&&!(u.stunT>0);if(b&&!u.blk)u.blkT=0;u.blk=b;if(b)u.blkT+=dt;
  if(u.rollT>0)u.rollT-=dt;else if(!b)u.sta=Math.min(100,u.sta+dt*(u.atkAnim>0?9:22))}
function tpsDodge(u,dx,dy){if(!u||u.dead||u.stunT>0||u.dash||u.leap||u.kb||u.fuseT>0||u.rootT>0)return;if(u.sta===undefined)u.sta=100;if(u.sta<28)return;u.sta-=28;
  let l=Math.hypot(dx,dy);if(l<.2){dx=-u.fx;dy=-u.fy;l=Math.hypot(dx,dy)||1}dx/=l;dy/=l;u.dash={vx:dx*1050,vy:dy*1050,t:.25,hit:null};u.rollT=.36;u.pdg=0;u.blk=false;
  sndAt('dash',u.x,u.y);fxE('dash',{id:u.id,x:u.x|0,y:u.y|0,a:+Math.atan2(dy,dx).toFixed(2)})}
// rolling ignores a hit (a perfect dodge makes the next strike a critical); blocking from the front cuts damage, a just-in-time block parries
function tpsGuard(t,amt,src){if(!t.hero||!src||src===t)return amt;
  if(t.rollT>0){if(!t.pdg){t.pdg=1;t.critNext=true;fxE('shield',{id:t.id,x:t.x|0,y:t.y|0})}return 0}
  if(t.blk){const dx=src.x-t.x,dy=src.y-t.y,l=Math.hypot(dx,dy)||1;if((dx*t.fx+dy*t.fy)/l>-.2){sndAt('shield',t.x,t.y);
      if(t.blkT<.25){if(!src.boss&&!src.golem&&l<280)src.stunT=Math.max(src.stunT||0,1.2);fxE('bash',{x:t.x|0,y:t.y|0,a:+Math.atan2(dy,dx).toFixed(2)});return 0}
      t.sta=Math.max(0,t.sta-14);return amt*.3}}
  return amt}
// ---- local player: input, HUD chips, shop window ----
const CUR={blk:false,rmb:false,busy:0,open:false,sig:'',hintT:14,
  input(mx,my){return{mx,my,atk:atkHeld||!!keys.Space||!!keys.KeyJ,blk:this.blk||this.rmb||!!keys.ControlLeft}},
  sta(me){return me&&me.sta!==undefined?me.sta:100},
  dodge(){const me=ME();if(!me||me.dead||state!=='play')return;const i=localInput();if(this.sta(me)<28)return;if(net.mode==='client')netSend({t:'dg',x:+i.mx.toFixed(2),y:+i.my.toFixed(2)});else tpsDodge(me,i.mx,i.my)},
  special(){const me=ME();if(!me||me.dead||state!=='play'||!me.xs)return;const S=SPX[me.xs],p=(S.k==='blink'||S.k==='meteor')&&UI.mouse&&!this.touch?screenToWorld(UI.mouse.x,UI.mouse.y):null;
    if(net.mode==='client')netSend(p?{t:'xs',x:Math.round(p.x),y:Math.round(p.y)}:{t:'xs'});else castSpecial(me,p)},
  buy(k){const me=ME();if(!me||me.dead||state!=='play')return;if(net.mode==='client')netSend({t:'buy',k});else shopBuy(me,k);this.sig=''},
  toggle(v){this.open=v===undefined?!this.open:v;this.el.shop.style.display=this.open?'block':'none';this.sig=''},
  mk(css,html){const d=document.createElement('div');d.style.cssText=css;d.innerHTML=html||'';document.body.appendChild(d);return d},
  ui(){const G='rgba(190,160,90,.6)',BG='rgba(12,9,18,.82)',stop=d=>{for(const k of['pointerdown','pointerup','pointermove','wheel','touchstart'])d.addEventListener(k,e=>e.stopPropagation())};
    const bar=this.mk('position:fixed;left:50%;bottom:54px;width:200px;height:7px;margin-left:-100px;background:rgba(10,8,14,.7);border:1px solid '+G+';border-radius:4px;z-index:5;pointer-events:none;display:none','<div style="height:100%;width:100%;background:linear-gradient(90deg,#6d8f3a,#c9b458);border-radius:3px"></div>');
    const hint=this.mk('position:fixed;left:50%;top:64px;transform:translateX(-50%);padding:7px 14px;background:'+BG+';border:1px solid '+G+';border-radius:8px;color:#e6dcc6;font:13px sans-serif;z-index:5;pointer-events:none;display:none;text-align:center;max-width:92vw');
    const coin=this.mk('position:fixed;right:10px;top:46px;padding:6px 12px;background:'+BG+';border:1px solid '+G+';border-radius:16px;color:#ffd35a;font:bold 15px sans-serif;z-index:6;display:none;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none');
    coin.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();this.toggle()});
    const reg=this.mk('position:fixed;right:10px;top:82px;padding:3px 10px;background:'+BG+';border-radius:12px;color:#d8cfb8;font:12px sans-serif;z-index:5;display:none;pointer-events:none');
    const pad=this.mk('position:fixed;z-index:6;display:none;touch-action:none;user-select:none;-webkit-user-select:none');
    const B=(t,x,dn,up)=>{const b=document.createElement('div');b.style.cssText='position:absolute;top:0;left:'+x+'px;width:56px;height:56px;border-radius:50%;background:rgba(14,10,20,.74);border:2px solid '+G+';color:#e6dcc6;font:25px/54px sans-serif;text-align:center;touch-action:none;cursor:pointer';
      b.innerHTML=t+'<span style="position:absolute;left:0;right:0;bottom:-15px;font:10px sans-serif;color:#b8ad94;line-height:12px"></span>';b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();dn()});if(up)for(const k of['pointerup','pointercancel','pointerleave'])b.addEventListener(k,up);pad.appendChild(b);return b};
    const b1=B('🛡',0,()=>{this.blk=true},()=>{this.blk=false}),b2=B('💨',66,()=>this.dodge()),b3=B('✦',132,()=>{const me=ME();if(me&&me.xs)this.special();else this.toggle(true)});
    b1.lastChild.textContent='คลิกขวา';b2.lastChild.textContent='Shift';b3.lastChild.textContent='V';
    const tags=[0,1,2,3].map(()=>this.mk('position:fixed;z-index:5;display:none;pointer-events:none;font:15px sans-serif;text-shadow:0 0 4px #000,0 0 4px #000;transform:translate(-50%,-50%)'));
    const shop=this.mk('position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,94vw);max-height:88vh;overflow:auto;background:rgba(14,10,20,.96);border:1px solid '+G+';border-radius:12px;color:#e6dcc6;font:13px sans-serif;z-index:20;display:none;padding:12px 14px;box-sizing:border-box;touch-action:pan-y');
    stop(shop);shop.addEventListener('click',e=>{const t=e.target.closest('[data-k]');if(!t)return;const k=t.getAttribute('data-k');if(k==='close')this.toggle(false);else this.buy(k)});
    this.el={bar,fill:bar.firstChild,hint,coin,reg,pad,b3,tags,shop}},
  row(me,k,ic,n,d,own){const p=shopPrice(me,k),ok=p!=null&&(me.gold|0)>=p;
    return '<div style="display:flex;align-items:center;gap:10px;padding:7px 4px;border-top:1px solid rgba(190,160,90,.18)"><div style="font-size:22px;width:30px;text-align:center">'+ic+'</div><div style="flex:1;min-width:0"><b>'+n+'</b>'+(own?' <span style="color:#9dffb0">'+own+'</span>':'')+'<div style="color:#a89f8a;font-size:12px">'+d+'</div></div>'+
      '<div data-k="'+k+'" style="min-width:74px;text-align:center;padding:7px 8px;border-radius:8px;cursor:pointer;font-weight:bold;'+(p==null?'background:#2a2630;color:#777':ok?'background:#6b5a1e;color:#ffe9a8;border:1px solid #c9a94a':'background:#2a2630;color:#8a8070')+'">'+(p==null?'—':p+' 🪙')+'</div></div>'},
  render(me){const v=me.wv|0,W=me.wk?WEAPONS[me.wk]:null;let h='<div style="display:flex;align-items:center;margin-bottom:6px"><b style="font-size:16px;flex:1">🛒 ร้านค้าแห่งแดนต้องสาป</b><b style="color:#ffd35a;font-size:15px;margin-right:12px">🪙 '+(me.gold|0)+'</b><div data-k="close" style="cursor:pointer;padding:4px 10px;border:1px solid rgba(190,160,90,.5);border-radius:8px">✕</div></div>';
    h+='<div style="color:#c9b458;margin-top:4px">เสบียง</div>'+this.row(me,'hp','🧪','ยาเลือด','ฟื้นเลือด 40% ใน 3 วิ','×'+me.bag[0])+this.row(me,'mp','💧','ยามานา','ฟื้นมานา 50% ใน 2 วิ','×'+me.bag[1])+this.row(me,'big','⚗️','ยาฟื้นฟูใหญ่','ฟื้นเลือดและมานาเต็ม','×'+me.bag[2])+this.row(me,'lv','📘','สมุดเลเวล','เลื่อนเป็นเลเวล '+Math.min(MAXL,me.lvl+1)+' ทันที (ได้แต้มสกิล +1)');
    h+='<div style="color:#c9b458;margin-top:10px">อาวุธในมือ</div>';
    if(W){const t=TRAITS[wvT(v)];let d=t?t.ic+' <b>'+t.n+'</b>: '+t.d:'ไม่มีลักษณะพิเศษ';for(let i=0;i<3;i++){const r=RUNES[wvR(v,i)];if(r)d+='<br>สกิล '+'QER'[i]+' '+r.ic+' <b>'+r.n+'</b>: '+r.d}h+=this.row(me,'rf','⚒️','ตี '+W.ic+' '+W.names[Math.max(0,me.wt)]+' ใหม่',d+'<br><i>จ่ายเพื่อสุ่มความสามารถของอาวุธชิ้นนี้ใหม่</i>')}
    else h+='<div style="padding:6px 4px;color:#a89f8a">ยังไม่มีอาวุธ</div>';
    h+='<div style="color:#c9b458;margin-top:10px">สกิลพิเศษ (กด V หรือปุ่ม ✦ · ถือได้ 1 สกิล ซื้อซ้ำเพื่ออัปเลเวล สูงสุด 3)</div>';
    for(let i=1;i<SPX.length;i++){const S=SPX[i];h+=this.row(me,'x'+i,S.ic,S.n,S.d+' · คูลดาวน์ '+S.cd.join('/')+' วิ',(me.xs|0)===i?'Lv.'+(me.xl||1):'')}
    this.el.shop.innerHTML=h},
  step(dt){const me=ME(),E=this.el;if(!E)return;const on=state==='play'&&me&&!me.dead;for(const k of['bar','coin','pad','reg'])E[k].style.display=on?'block':'none';
    if(!on){if(this.open)this.toggle(false);E.hint.style.display='none';for(const t of E.tags)t.style.display='none';return}
    E.fill.style.width=clamp(this.sta(me),0,100)+'%';const g=me.gold|0;if(g!==this.g0){this.g0=g;E.coin.textContent='🪙 '+g+'  🛒'}
    const r=inDG(me)?-1:REG.at(me.x,me.y);if(r!==this.r0){this.r0=r;E.reg.textContent=r<0?'⛓️ คุกใต้ดิน':REG.IC[r]+' '+REG.N[r]}
    if(this.hintT>0){this.hintT-=dt;E.hint.style.display=this.hintT>0?'block':'none'}
    if(UI.atk&&UI.atk.r){const a=UI.atk;E.pad.style.left=(a.x-a.r*2.25)+'px';E.pad.style.top=(a.y-a.r*4.55)+'px'}
    const S=SPX[me.xs|0],cd=me.xcd>0?Math.ceil(me.xcd):0,s3=(S?S.ic:'✦')+'|'+cd;if(s3!==this.s3){this.s3=s3;E.b3.firstChild.textContent=cd?cd:S?S.ic:'✦';E.b3.style.opacity=cd?.55:1;E.b3.style.borderColor=S?'#c9a94a':'rgba(190,160,90,.35)'}
    const v=me.wv|0;for(let i=0;i<4;i++){const t=E.tags[i],b=i<3?UI.sk[i]:UI.atk,ic=i<3?(RUNES[wvR(v,i)]||{}).ic:(TRAITS[wvT(v)]||{}).ic;if(!ic||!b||!b.r||!me.wk){t.style.display='none';continue}
      t.style.display='block';t.textContent=ic;t.style.left=(b.x+b.r*.72)+'px';t.style.top=(b.y-b.r*.72)+'px'}
    if(this.open){const sig=g+'|'+me.lvl+'|'+v+'|'+me.xs+'|'+me.xl+'|'+me.bag.join()+'|'+me.wk+me.wt;if(sig!==this.sig){this.sig=sig;this.render(me)}}}};
if(CURSED){CUR.ui();CUR.el.hint.textContent='ฆ่ามอนสเตอร์เก็บ 🪙 แล้วกด 🛒 (P) ซื้อยา สมุดเลเวล สกิลพิเศษ · Shift หลบ · คลิกขวา ป้องกัน · V สกิลพิเศษ';
  const _of=R3.objFor;R3.objFor=function(u){const o=_of.call(this,u);if(o&&u.mob&&!o._rg){o._rg=1;if(u.rg>0||u.elite)REG.tintObj(o,u)}return o};
  const _fr=R3.frame;R3.frame=function(dt){const r=_fr.call(this,dt);CUR.step(dt||.016);CUR.f3=performance.now();return r};setInterval(()=>{if(performance.now()-(CUR.f3||0)>500)CUR.step(.2)},200);
  addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')CUR.touch=true;if(e.pointerType==='mouse'&&e.button===2&&e.target===cv&&state==='play'){CUR.rmb=true;e.stopPropagation();e.preventDefault()}},true);
  addEventListener('pointerup',e=>{if(e.pointerType==='mouse'&&CUR.rmb&&!(e.buttons&2))CUR.rmb=false},true);
  addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||state!=='play'||e.repeat)return;if(e.code==='ShiftLeft'||e.code==='ShiftRight')CUR.dodge();else if(e.code==='KeyV')CUR.special();else if(e.code==='KeyP')CUR.toggle();else if(e.code==='Escape'&&CUR.open)CUR.toggle(false)});
}
