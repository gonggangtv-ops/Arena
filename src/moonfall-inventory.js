/* Artwork adapter only: prices, purchases, potion effects and hit areas stay in
 * the original Cursed Realm inventory/shop code. */
window.installMoonfallInventory=function(){
  'use strict';
  const originalPot=drawPotions,originalRender=CUR.render,originalStep=CUR.step;
  const urls=new Map();
  const imageURL=key=>{if(!urls.has(key)){const art=MoonfallUI.item(key);if(!art)throw Error('Missing item artwork: '+key);urls.set(key,art.toDataURL('image/webp'));}return urls.get(key);};
  const imageHTML=(key,alt)=>'<img class="moonfall-item-art" src="'+imageURL(key)+'" alt="'+escapeHtml(alt)+'" width="44" height="44">';
  drawPotions=function(me,s,pr){
    const fill=ctx.fillText,mapping=new Map(BAG.map(p=>[p.ic,p.k]));mapping.set('🎒','bag');
    ctx.fillText=function(text,x,y,...rest){
      const key=mapping.get(text);if(!key)return fill.call(this,text,x,y,...rest);
      const art=MoonfallUI.item(key);if(!art)return;
      const size=parseFloat(this.font)*1.18,left=this.textAlign==='center'?x-size/2:x,top=this.textBaseline==='middle'?y-size/2:y-size;
      this.drawImage(art,left,top,size,size);
    };
    try{return originalPot(me,s,pr);}finally{ctx.fillText=fill;}
  };
  potBtn=function(B,b,me,s){
    const n=me.bag[b]|0,cd=Math.max(0,me.bcd[b]||0),p=BAG[b],pressed=UI.potP===b&&UI.potT>0;
    btnBase(B.x,B.y,B.r,pressed,'#b8a577','#172b43',!n||cd>0);
    ctx.save();ctx.beginPath();ctx.arc(B.x,B.y,B.r*.86,0,Math.PI*2);ctx.clip();ctx.globalAlpha=n>0?(cd>0?.5:1):.35;
    const art=MoonfallUI.item(p.k);if(art)ctx.drawImage(art,B.x-B.r*.85,B.y-B.r*.85,B.r*1.7,B.r*1.7);ctx.restore();
    if(cd>0&&n>0){ctx.fillStyle='#040a15b3';ctx.beginPath();ctx.moveTo(B.x,B.y);ctx.arc(B.x,B.y,B.r-1,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(cd/p.cd,0,1));ctx.fill();}
    ctx.fillStyle='#0b1423';ctx.beginPath();ctx.arc(B.x+B.r*.7,B.y+B.r*.7,8*s,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c9b27f';ctx.lineWidth=1.2;ctx.stroke();
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=n?'#f6e5bf':'#8995a9';ctx.font=`bold ${10*s}px system-ui`;ctx.fillText(n,B.x+B.r*.7,B.y+B.r*.72);
    // under attack: healing and mana potions work at half strength (b.js potK); the host knows the last hit, a client watches its HP drop
    if(n>0&&b<3&&typeof potFight==='function'&&(net.mode!=='client'&&me.lastDmgT!==undefined?potFight(me):gameT-(me._potHit===undefined?-99:me._potHit)<POT_FIGHT)){
      ctx.fillStyle='#5a1410e6';ctx.beginPath();ctx.arc(B.x-B.r*.7,B.y-B.r*.7,8.5*s,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ff8a70';ctx.lineWidth=1.2;ctx.stroke();
      ctx.fillStyle='#ffd8cc';ctx.font=`bold ${9.5*s}px system-ui`;ctx.fillText('½',B.x-B.r*.7,B.y-B.r*.68);}
    ctx.textBaseline='alphabetic';
  };
  // a client has no lastDmgT for its hero: remember when the HP last dropped
  const originalPotions=drawPotions;drawPotions=function(me,s,pr){if(me&&net.mode==='client'){if(me._potHp!==undefined&&me.hp<me._potHp-.5)me._potHit=gameT;me._potHp=me.hp;}return originalPotions.call(this,me,s,pr);};
  CUR.row=function(me,key,ic,name,description,own){
    const price=shopPrice(me,key),enabled=price!==null&&(me.gold|0)>=price;
    return '<div class="moonfall-shop-row">'+imageHTML(key,name)+'<div class="moonfall-shop-copy"><b>'+escapeHtml(name)+'</b>'+(own?' <span class="moonfall-owned">'+escapeHtml(own)+'</span>':'')+'<div>'+description+'</div></div>'+
      '<button type="button" data-k="'+key+'" '+(!enabled?'disabled ':'')+'aria-label="ซื้อ '+escapeHtml(name)+(price!==null?' ราคา '+price+' เหรียญ':' ซื้อไม่ได้')+'">'+(price===null?'เต็มแล้ว':price+' <span class="moonfall-currency">เหรียญ</span>')+'</button></div>';
  };
  CUR.render=function(me){
    originalRender.call(this,me);const shop=this.el.shop;shop.id='moonfallShop';shop.setAttribute('role','dialog');shop.setAttribute('aria-label','ร้านค้าแห่งแดนต้องสาป');
    const head=shop.firstElementChild;head.className='moonfall-shop-head';
    const title=head.children[0];title.textContent='ร้านค้าแห่งแดนต้องสาป';title.insertAdjacentHTML('afterbegin',imageHTML('shop',''));
    const gold=head.children[1];gold.innerHTML=imageHTML('coin','เหรียญ')+'<span>'+(me.gold|0)+'</span>';
    const old=head.querySelector('[data-k="close"]'),close=document.createElement('button');close.type='button';close.dataset.k='close';close.className='moonfall-shop-close';close.textContent='×';close.setAttribute('aria-label','ปิดร้านค้า');old.replaceWith(close);
  };
  CUR.step=function(dt){
    originalStep.call(this,dt);const me=ME(),E=this.el;if(!E||!me||state!=='play')return;
    const amount=me.gold|0;if(E.coin.dataset.artGold!==String(amount)){E.coin.dataset.artGold=String(amount);E.coin.innerHTML=imageHTML('coin','เหรียญ')+'<span>'+amount+'</span>'+imageHTML('shop','เปิดร้านค้า');}
    const special=me.xs?'x'+me.xs:'special';E.b3.style.backgroundImage='url("'+imageURL(special)+'")';E.b3.classList.add('moonfall-special-art');E.b3.firstChild.textContent=me.xcd>0?Math.ceil(me.xcd):'';
  };
  const refresh=()=>{
    for(const [j,key] of FK.entries()){
      const rows=document.getElementById('fuseGrid').children[j]?.querySelectorAll('.sks span');
      rows?.forEach((row,i)=>{const art=MoonfallUI.icon(key,i);if(!art)throw Error('Missing fusion artwork');row.replaceChildren();const image=document.createElement('img');image.src=art.toDataURL('image/webp');image.width=image.height=44;image.alt=SK[key][i].n;row.append(image,document.createTextNode('QER'[i]+' · '+SK[key][i].n));});
    }
    for(const [i,key] of ['block','dodge'].entries()){const button=CUR.el.pad.children[i];button.firstChild.textContent='';button.style.backgroundImage='url("'+imageURL(key)+'")';button.classList.add('moonfall-special-art');}
  };
  window.addEventListener('moonfallui:ready',refresh);
  if(MoonfallUI.snapshot().state==='loaded')refresh();
};
