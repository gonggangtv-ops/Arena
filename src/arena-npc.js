// ===================== VILLAGE MERCHANTS · shop only at an NPC, dash beside the attack button (Arena Royale, owner 2026-11-23) =====================
// Owner: "เอาปุ่มกลิ้งออก แล้วก็ย้ายปุ่มพุ่งลงมาแถบข้างล่าง เอาปุ่มซื้อของออก จะซื้อของหรืออัพสกิลต้องไปซื้อที่ NPC ในแมพ ซึ่งจะมีอยู่ตามโซนหมู่บ้าน"
// (owner's answers: the dash goes right beside the attack button; only the shop's wares — potions, level book, special skills,
//  reforging — move to the merchants; skill points (+) still work anywhere; the merchants are the game's own villager model)
//  · one merchant per village (a.js world gen, seeded: WD.npcs) beside a market stall, facing the square, 🛒 on the minimap
//  · stand within NPC_R of one: the 🛒 prompt (or P) opens the shop, walking away closes it; the host refuses a purchase made
//    away from a merchant, bots included (arena-bots.js walks them over); balance sims on an empty LAB arena still shop anywhere
//  · the coin counter stays on screen but no longer opens the shop
//  · the 💨 dash button (CUR pad child 1, kept in the pad so t1.js keeps drawing its cooldown) is placed on the attack button's
//    upper right, or its lower left when a small screen has no room there
const NPC_R=190;
function npcNear(u,r){const N=WD&&WD.npcs;if(!u||!N)return null;let b=null,bd=r||NPC_R;for(const n of N){const d=Math.hypot(n.x-u.x,n.y-u.y);if(d<bd){bd=d;b=n}}return b}
const npcGate=()=>!!(WD&&WD.npcs&&WD.npcs.length);
if(typeof shopBuy==='function'){const _sb=shopBuy;
  shopBuy=function(u,k){if(u&&u.hero&&!u.dead&&npcGate()&&!npcNear(u,NPC_R+40)){if(isHuman(u))fxTextFor(u.x,u.y-84,'🛒 ซื้อได้ที่พ่อค้าในหมู่บ้าน','#ffb0a0',1.6,[u.id]);return false}return _sb(u,k)}}
// ---- minimap: merchants ----
if(typeof drawMinimap==='function'){const _mm=drawMinimap;
  drawMinimap=function(me,s,my0){const b=_mm(me,s,my0);try{const N=WD&&WD.npcs;if(N&&b){const k=b.w/WORLD;ctx.save();ctx.beginPath();ctx.rect(b.x,b.y,b.w,b.h);ctx.clip();
      ctx.font=`${10*s}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';for(const n of N)ctx.fillText('🛒',b.x+n.x*k,b.y+n.y*k);ctx.restore()}}catch(e){}return b}}
// ---- HUD: merchant prompt, gated shop, dash placement ----
if(typeof CUR!=='undefined'&&CUR.el){const E=CUR.el;
  const css=document.createElement('style');css.textContent=`
#arenaNpcPrompt{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 96px);transform:translateX(-50%);z-index:7;display:none;align-items:center;gap:9px;padding:8px 16px 8px 11px;
  border:1px solid #d6b45e;border-radius:26px;background:linear-gradient(180deg,#2c2312f5,#120d07f5);color:#ffe9a8;font:700 15px/1 system-ui,sans-serif;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;
  box-shadow:0 4px 14px #000a,0 0 0 1px #000;animation:arenaNpcPulse 1.6s ease-in-out infinite}
#arenaNpcPrompt b{font-size:23px;line-height:1}#arenaNpcPrompt small{font:600 11px system-ui,sans-serif;color:#e8d49a;border:1px solid #c9a94a88;border-radius:4px;padding:2px 5px}
#arenaNpcPrompt i{font:500 12px system-ui,sans-serif;color:#cdbb8a;font-style:normal}
@keyframes arenaNpcPulse{0%,100%{box-shadow:0 4px 14px #000a,0 0 0 1px #000,0 0 0 0 #ffd35a00}50%{box-shadow:0 4px 14px #000a,0 0 0 1px #000,0 0 18px 4px #ffd35a66}}
#arenaGold{pointer-events:none!important;cursor:default!important}#arenaGold img[alt="เปิดร้านค้า"]{display:none!important}
.arena-combat-hud #arenaCombatPad #arenaDash .arena-pad-caption{bottom:auto!important;top:-17px!important}
@media(max-height:420px){.arena-combat-hud #arenaCombatPad #arenaDash .arena-pad-caption{display:none!important}}`;document.head.appendChild(css);
  const pr=document.createElement('div');pr.id='arenaNpcPrompt';pr.setAttribute('role','button');pr.innerHTML='<b>🛒</b><span>ร้านค้า</span><i></i><small>P</small>';document.body.appendChild(pr);
  for(const k of['pointerup','pointermove','touchstart','wheel'])pr.addEventListener(k,e=>e.stopPropagation());
  pr.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();CUR.toggle(true)});
  const _tg=CUR.toggle;
  CUR.toggle=function(v){const open=v===undefined?!this.open:!!v;if(open){const me=ME();if(!me||me.dead||!npcNear(me,NPC_R+20)&&npcGate()){
      E.hint.textContent='🛒 ร้านค้าอยู่กับพ่อค้าในหมู่บ้าน · ดูไอคอน 🛒 บนแผนที่ แล้วเดินไปคุย';this.hintT=3.5;return}}return _tg.call(this,v)};
  E.hint.textContent='ฆ่ามอนสเตอร์ เปิดกล่อง ค้นบ้านหาอาวุธ · เหรียญ 🪙 ใช้ซื้อของกับพ่อค้า 🛒 ในหมู่บ้าน · Shift พุ่ง (45 วิ) · V สกิลพิเศษ';
  let near0=null,dashW=0;
  // the dash: a free spot hugging the attack button, upper right first (owner's pick), else lower left; never over a skill button
  // (a small phone has no room at full size: the button then shrinks a step at a time until it fits without covering a skill)
  function npcPlaceDash(){const d=E.pad.children[1];if(!d||!UI.atk||!UI.atk.r||E.pad.style.display==='none')return;const a=UI.atk;
    if(!dashW||Math.random()<.02)dashW=d.offsetWidth||60;const px=parseFloat(E.pad.style.left)||0,py=parseFloat(E.pad.style.top)||0;
    let best=null,sc=1;
    for(const k of[1,.84,.72]){const rd=dashW/2*k;
      const ok=(x,y)=>x-rd>=SAFE.l+2&&x+rd<=W-SAFE.r-3&&y-rd>=SAFE.t+2&&y+rd<=H-SAFE.b-3&&UI.sk.every(b=>!b.r||Math.hypot(x-b.x,y-b.y)>=b.r+rd+2);
      const at=(deg,ex)=>{const dd=a.r+rd+ex,q=deg*Math.PI/180;return{x:a.x+Math.cos(q)*dd,y:a.y+Math.sin(q)*dd}};
      for(const set of[[318,326,310,334,302,342],[160,150,170,142,178]]){for(const deg of set){for(const ex of[2,7,13,20]){const p=at(deg,ex);if(ok(p.x,p.y)){best=p;break}}if(best)break}if(best)break}
      if(best){sc=k;break}}
    if(!best){sc=.72;const rd=dashW/2*sc,q=150*Math.PI/180;best={x:a.x+Math.cos(q)*(a.r+rd+2),y:Math.min(H-SAFE.b-rd-3,a.y+Math.sin(q)*(a.r+rd+2))}}
    const l=(best.x-dashW/2-px).toFixed(1)+'px',t=(best.y-dashW/2-py).toFixed(1)+'px',tf=sc<1?'scale('+sc+')':'';
    if(d.style.left!==l)d.style.left=l;if(d.style.top!==t)d.style.top=t;if(d.style.transform!==tf){d.style.transform=tf;d.style.transformOrigin='50% 50%'}}
  function npcHudStep(){const me=ME(),sky=typeof DROP!=='undefined'&&DROP.sky&&DROP.sky(),on=state==='play'&&me&&!me.dead&&!sky;
    const n=on?npcNear(me,NPC_R):null;if(n!==near0){near0=n;pr.querySelector('i').textContent=n?'· '+n.name:''}
    const show=!!n&&!CUR.open;if((pr.style.display==='flex')!==show)pr.style.display=show?'flex':'none';
    if(CUR.open&&(!on||npcGate()&&!npcNear(me,NPC_R+90)))_tg.call(CUR,false);
    npcPlaceDash()}
  // installed after the HUD installers (installMoonfallInventory / installArenaCombatControls run later in the same script)
  setTimeout(()=>{const st=CUR.step;CUR.step=function(dt){const r=st.call(this,dt);try{npcHudStep()}catch(e){}return r};
    const rd=CUR.render;CUR.render=function(me){rd.call(this,me);try{const n=npcNear(me,NPC_R+90),h=this.el.shop.querySelector('.moonfall-shop-head')||this.el.shop.firstElementChild;
      if(n&&h&&!h.querySelector('.arena-npc-name')){const sp=document.createElement('small');sp.className='arena-npc-name';sp.style.cssText='display:block;font:500 12px system-ui,sans-serif;color:#cdbb8a;margin-top:2px';sp.textContent='พ่อค้า · '+n.name;(h.children[0]||h).appendChild(sp)}}catch(e){}}},0);
}
// ---- 3D: the merchants (Quaternius villagers, r8.js), a sign and a warm ring on the ground ----
if(typeof R3!=='undefined'&&typeof THREE!=='undefined'){const R=R3,T=THREE;
  const _sb=R.stepBoxes;R.stepBoxes=function(dt,force){_sb.call(this,dt,force);try{this.stepNpcs(dt||0)}catch(e){if(!this._npcErr){this._npcErr=1;console.warn('npc',e)}}};
  R.npcSign=function(name){return this.cached('npcsign',()=>{const c=document.createElement('canvas');c.width=256;c.height=96;const x=c.getContext('2d');
      const g=x.createLinearGradient(0,0,0,96);g.addColorStop(0,'#3a2c12');g.addColorStop(1,'#140e06');x.fillStyle=g;x.strokeStyle='#e2c06a';x.lineWidth=4;
      x.beginPath();x.roundRect?x.roundRect(6,10,244,60,18):x.rect(6,10,244,60);x.fill();x.stroke();x.fillStyle='#e2c06a';x.beginPath();x.moveTo(116,70);x.lineTo(128,88);x.lineTo(140,70);x.fill();
      x.font='bold 34px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#ffe9a8';x.fillText('🛒 ร้านค้า',128,41);
      const t=new T.CanvasTexture(c);if(T.SRGBColorSpace)t.colorSpace=T.SRGBColorSpace;const m=new T.SpriteMaterial({map:t,transparent:true,depthWrite:false});m.userData.ownMat=1;return m})};
  R.clearNpcs=function(){if(this.npcO)for(const o of this.npcO){if(o.root.parent)o.root.parent.remove(o.root);try{o.mixer.stopAllAction()}catch(e){}}this.npcO=null};
  R.buildNpcs=function(N){this.npcO=[];const ringM=new T.MeshBasicMaterial({map:this.tex('wglow'),color:'#ffcf6a',transparent:true,opacity:.5,depthWrite:false,blending:T.AdditiveBlending});ringM.userData.ownMat=1;
    const ringG=new T.PlaneGeometry(170,170);ringG.rotateX(-Math.PI/2);
    for(const n of N){const fem=n.id%3===1,ch='c_'+(fem?'F':'M')+'P',parts=[fem?'h_F':'h_M',fem?(n.id%2?'x_Long':'x_Buns'):(n.id%2?'x_SimpleParted':'x_Buzzed'),fem?'x_BrowFemale':'x_BrowRegular'];
      if(!fem&&n.id%2===0)parts.push('x_Beard');if(!this.qn.g[ch])continue;
      const tint=['#c08a3a','#8a5a2a','#6f8040','#8a3f2e','#3f5f8a'][n.id%5],hair=QN_HAIR[(n.id*3+1)%QN_HAIR.length];
      const A=this.qnAssemble(ch,parts,src=>{const k=this.qnKind(src);return k==='cloth'?this.qnMat(src,{tint,k:.55}):k==='hair'?this.qnMat(src,{tint:hair,k:.9}):this.qnMat(src)});
      const m=A.m;m.scale.setScalar(QN_S);m.traverse(q=>{if(q.isMesh){q.castShadow=!!this.hi;q.receiveShadow=true;q.frustumCulled=false}});
      const root=new T.Group(),body=new T.Group();root.add(body);body.add(m);const gy=this.gY(n.x,n.y);root.position.set(n.x,gy,n.y);
      const rot0=Math.atan2(Math.cos(n.a),Math.sin(n.a));root.rotation.y=rot0;
      const sign=new T.Sprite(this.npcSign());sign.scale.set(118,44,1);sign.position.set(n.x,gy+182,n.y);sign.renderOrder=12;
      const ring=new T.Mesh(ringG,ringM);ring.position.set(n.x,gy+1.5,n.y);ring.renderOrder=2;
      const o={n,root,sign,ring,mixer:new T.AnimationMixer(m),rot:rot0,rot0,gy};const c=this.qnClip('hero',A.bones,'Idle_Loop');if(c){const a=o.mixer.clipAction(c);a.play();a.time=(n.id*.37)%c.duration}
      this.scene.add(root);this.scene.add(sign);this.scene.add(ring);this.npcO.push(o)}
    this.npcRing=ringM};
  R.stepNpcs=function(dt){const N=WD&&WD.npcs;if(!N||!N.length){if(this.npcO)this.clearNpcs();return}
    if(this.npcO&&(this.npcWD!==WD||this.npcO.length&&this.npcO[0].root.parent!==this.scene))this.clearNpcs();
    if(!this.npcO){if(!this.qn||this.qn.mobOnly||!window.AR_GLTF||!this.scene)return;this.npcWD=WD;this.buildNpcs(N)}
    const me=ME(),L=listener()||me,t=this.t||0;if(this.npcRing)this.npcRing.opacity=.38+.14*Math.sin(t*2.2);
    for(const o of this.npcO){const n=o.n,far=!L||Math.abs(n.x-L.x)>2600||Math.abs(n.y-L.y)>2000;o.root.visible=o.sign.visible=o.ring.visible=!far;if(far)continue;
      o.mixer.update(dt);let want=o.rot0;if(me&&!me.dead){const d=Math.hypot(me.x-n.x,me.y-n.y);if(d<NPC_R+220)want=Math.atan2(me.x-n.x,me.y-n.y)}
      let dr=want-o.rot;dr=Math.atan2(Math.sin(dr),Math.cos(dr));o.rot+=dr*Math.min(1,dt*4);o.root.rotation.y=o.rot;o.sign.position.y=o.gy+182+Math.sin(t*2+n.id)*5}};
}
