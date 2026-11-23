// ===================== SMARTER BOTS (Arena Royale, owner 2026-11-23) =====================
// Owner: "ปรับบอทให้ฉลาดขึ้นคือบางทีบอทมันไม่โจมตีกันเอง หรือแม้แต่ผู้เล่นถ้าผู้เล่นไม่โจมตีก่อน
//         แล้วก็การโจมตีใกล้กันทำไมผู้เล่นโดนบอทชนถอยหลังแม้จะกดเดินหน้า"
// Wraps b.js botThink; its own decision tick still runs first, then:
//  · heroes: an armed bot hunts the enemy hero it sees (nearer, weaker, lower on health first) instead of waiting to be hit
//    (b.js only went for heroes after 2:30 and then with a 3–30% roll); once it commits it keeps the hunt until the target dies, leaves
//    its sight or the storm, or the bot drops under 30% health (then b.js's own flee takes over)
//  · melee spacing: a melee bot stops walking INTO its target once in reach and circles a little instead — b.js kept pushing,
//    which shoved the player backwards even while walking forward (and b.js pushMass now gives a player 10 to a bot's 3)
//  · dodging: u.ai.dodge (set by arena-feel.js when a creep winds up on the bot, a blast is telegraphed under it, or a bolt flies at it)
//    steers it out for a moment
//  · unarmed with nothing to pick up: it goes to open the nearest closed chest
//  · shopping: with coins to spend and no fight on, it walks to the nearest village merchant (arena-npc.js) and buys there
const BOTX={grace:20,near:560,engage:.9,far:.4,huntMax:28,shopGold:130,shopEvery:70,chestR:2600};
if(typeof botThink==='function'){
{const _bt=botThink;botThink=function(u,dt){const ai=u.ai,dec=ai.t-dt<=0;let m=_bt(u,dt);
  try{if(dec)botxDecide(u);m=botxSteer(u,m,dt)}catch(e){if(!BOTX.err){BOTX.err=1;console.warn('bots',e)}}return m}}
const inZone=p=>Math.hypot(p.x-zone.x,p.y-zone.y)<zone.r-60;
function botxHuntOk(u,h,sight){return h&&h.hero&&!h.dead&&isEnemy(u,h)&&(!h.hidden||dist(u,h)<170)&&dist(u,h)<sight*1.35&&inZone(h)}
function botxDecide(u){const ai=u.ai,hpR=u.hp/u.maxHp,sight=Math.min(visionR(),420+90*zone.ph);
  // 1) heroes
  if(ai.hunt){const h=UMAP.get(ai.hunt.id);if(!botxHuntOk(u,h,sight)||hpR<.3||!u.wk||gameT>ai.hunt.until)ai.hunt=null;else{ai.tgt=h;ai.goal=null;ai.flee=false}}
  if(!ai.hunt&&u.wk&&gameT>=BOTX.grace&&hpR>.35&&!(ai.flee&&ai.tgt&&ai.tgt.hero)){
    let best=null,bs=-1e9;
    for(const h of units){if(!h.hero||h.dead||h===u||!isEnemy(u,h)||h.hidden&&dist(u,h)>=170)continue;const d=dist(u,h);if(d>sight||!inZone(h))continue;
      const sc=-d/300+(1-h.hp/h.maxHp)*2.2+(power(u)-power(h))*.25+(isHuman(h)?.15:0);if(sc>bs){bs=sc;best=h}}
    if(best){const d=dist(u,best),hr=best.hp/best.maxHp,edge=power(u)-power(best),cur=ai.tgt;
      const want=edge>-2.5||hr<.35||hpR>.8&&edge>-4,take=!cur||cur.dead||cur.mob&&(d<BOTX.near||ai.threat!==cur);
      if(want&&take&&Math.random()<(d<BOTX.near?BOTX.engage:BOTX.far*(.6+(ai.agg||.5)*.6))){ai.hunt={id:best.id,until:gameT+BOTX.huntMax};ai.tgt=best;ai.goal=null;ai.flee=false}}}
  if(ai.tgt&&ai.tgt.hero)return;
  // 2) unarmed and nothing to pick up: the nearest closed chest
  if(!u.wk&&!ai.goal){let b=null,bd=BOTX.chestR;for(const x of boxes){if(x.open)continue;const d=dist(u,x);if(d<bd&&Math.hypot(x.x-zone.tx,x.y-zone.ty)<zone.tr+zone.r*.25){bd=d;b=x}}if(b)ai.goal={x:b.x,y:b.y,box:b.id}}
  // 3) a shopping trip
  if(typeof npcNear==='function'&&npcGate()&&!ai.flee&&gameT-(ai.shopT||-99)>BOTX.shopEvery){const g=u.gold|0;
    if(g>=BOTX.shopGold||(u.bag[0]|0)===0&&g>=40){const n=npcNear(u,4200);
      if(n&&Math.hypot(n.x-zone.tx,n.y-zone.ty)<zone.tr+zone.r*.3&&inZone(n)){if(!ai.tgt||ai.tgt.mob&&ai.threat!==ai.tgt){ai.tgt=null;ai.goal={x:n.x,y:n.y,npc:n.id}}}}}}
function botxShop(u){const g=()=>u.gold|0;let n=0;
  while((u.bag[0]|0)<2&&g()>=(shopPrice(u,'hp')||99)+10&&n++<3)if(!shopBuy(u,'hp'))break;
  if((u.bag[1]|0)<1&&g()>=60)shopBuy(u,'mp');
  if(!u.xs&&g()>=210)shopBuy(u,'x'+(1+u.id%6));else if(u.xs&&(u.xl||1)<3&&g()>=(shopPrice(u,'x'+u.xs)||9999)+40)shopBuy(u,'x'+u.xs);
  const lv=shopPrice(u,'lv');if(lv!=null&&g()>=lv+30)shopBuy(u,'lv');u.ai.shopT=gameT}
function botxSteer(u,m,dt){const ai=u.ai;
  if(ai.dodge&&ai.dodge.t>0){ai.dodge.t-=dt;const k=ai.dodge;m={mx:k.x+m.mx*.15,my:k.y+m.my*.15}}
  else{const t=ai.tgt;
    if(t&&!t.dead&&!ai.flee&&u.melee){const d=dist(u,t)||1,R=u.range+t.r;if(d<R-4){const nx=(t.x-u.x)/d,ny=(t.y-u.y)/d,dot=m.mx*nx+m.my*ny;if(dot>0)m={mx:m.mx-dot*nx,my:m.my-dot*ny};
      if(t.hero){const s=ai.strafe||1;m={mx:m.mx-ny*.32*s,my:m.my+nx*.32*s}}}}
    const G=ai.goal;
    if(G&&G.npc!==undefined){const n=WD.npcs&&WD.npcs[G.npc];if(!n)ai.goal=null;else if(Math.hypot(n.x-u.x,n.y-u.y)<NPC_R-30){botxShop(u);ai.goal=null}}
    else if(G&&G.box!==undefined){const b=boxes[G.box];if(!b||b.open)ai.goal=null;else if(dist(u,b)<u.r+62)openBox(u,b.id)}}
  const l=Math.hypot(m.mx,m.my);if(l>1){m.mx/=l;m.my/=l}return m}
}
