// ===================== SETTINGS: view + graphics quality =====================
if(typeof installCelestialRender==='function'){installCelestialRender(R3);installMoonfallEnvironment(R3);installMoonfallBiome(R3)}
if(typeof installMoonfallVillage==='function')installMoonfallVillage(R3);if(typeof installMoonfallUI==='function')installMoonfallUI();if(typeof installMoonfallMenuUX==='function')installMoonfallMenuUX();
let view3D=lsGet('ar_view','3d')!=='2d',gfxQ=lsGet('ar_q','auto'),camNear=lsGet('ar_cam','near')!=='far',moody=lsGet('ar_tone2','bright')==='dark';
if(MOON)moody=true;
const has3D=()=>typeof R3!=='undefined';
const QN={auto:'อัตโนมัติ',high:'สูง',low:'ประหยัด'};
function syncViewBtn(){$('viewBtn').textContent=view3D&&has3D()&&R3.ok?'มุมมอง: 3D':'มุมมอง: 2D';$('qBtn').textContent='กราฟิก: '+QN[gfxQ];$('qBtn').classList.toggle('hidden',!(view3D&&has3D()&&R3.ok))}
if(view3D&&!(has3D()&&R3.init()))view3D=false;syncViewBtn();
$('viewBtn').onclick=()=>{AU.init();AU.play('click');if(!view3D){if(has3D()&&R3.init())view3D=true;else menuMsg('เครื่องนี้ไม่รองรับ 3D')}else view3D=false;lsSet('ar_view',view3D?'3d':'2d');syncViewBtn()};
const syncCam=()=>{$('camBtn').textContent='กล้อง: '+(camNear?'ใกล้':'ไกล')};syncCam();
$('camBtn').onclick=()=>{AU.init();AU.play('click');camNear=!camNear;lsSet('ar_cam',camNear?'near':'far');syncCam()};
const syncTone=()=>{$('toneBtn').textContent='โทนภาพ: '+(moody?'มืดสมจริง':'สดใส');document.body.classList.toggle('moody',moody)};syncTone();
$('toneBtn').onclick=()=>{AU.init();AU.play('click');moody=!moody;lsSet('ar_tone2',moody?'dark':'bright');syncTone()};
const syncAo=()=>{$('aoBtn').textContent='เงาลึก: '+(lsGet('ar_ao','1')!=='0'?'เปิด':'ปิด')};syncAo();
$('aoBtn').onclick=()=>{AU.init();AU.play('click');lsSet('ar_ao',lsGet('ar_ao','1')!=='0'?'0':'1');syncAo();if(has3D()&&R3.ok)R3.setQuality()};
const syncSnd=()=>{$('sndBtn').textContent=AU.modeName()};syncSnd();
$('sndBtn').onclick=()=>{AU.init();AU.toggle();syncSnd();AU.play('click')};
$('qBtn').onclick=()=>{AU.init();AU.play('click');gfxQ=gfxQ==='auto'?'high':gfxQ==='high'?'low':'auto';lsSet('ar_q',gfxQ);if(has3D()&&R3.ok)R3.setQuality();syncViewBtn()};

// ===================== LOOP =====================
let last=performance.now(),perfHost=0;
function loop(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(ARX&&state==='editor')ArenaEditor.frame(dt);
  else if(state==='play'&&WD){
    if(!window.__pause&&(!(H>W*1.05)||net.mode!=='solo')){
      const t0=performance.now();
      if(net.mode==='client')clientUpdate(dt);else hostUpdate(dt);
      perfHost=perfHost*.95+(performance.now()-t0)*.05;
      fxUpdate(dt);
      if(net.mode==='host'&&net.tr&&Object.keys(net.cl).length){net.snapT-=dt;if(net.snapT<=0){const n=Object.keys(net.cl).length;net.snapT=1/(net.tr.kind==='room'?clamp(34/n,5,12):15);broadcastSnaps()}}
    }
    if(view3D&&has3D()&&R3.ok){$('gl').style.visibility='visible';R3.frame(dt)}else draw2D();
  }else{ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);if(has3D()&&R3.ok&&view3D&&state!=='play')R3.menuFrame(dt)}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ===================== TEST / BALANCE LAB =====================
const LAB={
  arena(){RIV=null;const n=Math.round(WORLD/25),N=n*n;const sdf=new Float32Array(N).fill(1000);
    WD={houses:[],walls:[],trees:[],mtrees:[],rocks:[],solids:[],bushes:[],caves:[],lanterns:[],mush:[],crystals:[],grass:[],flowers:[],villages:[],items:[],mobs:[],camps:[],paths:[],wells:[],bridges:[],shrines:[],props:[],
      cliffs:[],windmills:[],fountains:[],stalls:[],fields:[],fences:[],hay:[],logs:[],reeds:[],lilies:[],spawns:[],banners:[],tgrass:[],graves:[],castle:{x:-9e4,y:-9e4,w:1,h:1,cx:-9e4,cy:-9e4,keep:{x:-9e4,y:-9e4,w:1,h:1},towers:[],gtowers:[]},
      lake:{x:-9e4,y:-9e4,R:1,p1:0,p2:0},pool:{x:-9e4,y:-9e4,R:1},noise:()=>0,tg:{C:25,n,hg:new Float32Array(N),blk:new Uint8Array(N),sol:new Uint8Array(N),sdf}};
    buildCollide(WD);NAV=null;HIDE=null;units=[];UMAP=new Map();projs=[];aoes=[];items=[];parts=[];texts=[];swings=[];feedList=[];fxq=[];
    zone={x:CX,y:CY,r:99999,tx:CX,ty:CY,tr:99999,ph:2,st:'done',t:0};gameT=300;gameOver=false;alive=2;simMode=true;myId=0},
  mk(id,wk,lvl,tier,at){const u=mkHero(id,'B'+id,null,id%8);u.bot=true;u.ai.pref=wk;u.lvl=lvl;u.pts=lvl;u.wk=wk||null;u.wt=wk?tier:-1;u.at=at===undefined?-1:at;recalc(u,true);botLearn(u);recalc(u,true);return u},
  duel(a,b,lvl,tier,gap,at){gap=gap||700;this.arena();const A=this.mk(1,a,lvl,tier,at),B=this.mk(2,b,lvl,tier,at);A.x=CX-gap/2;A.y=CY;B.x=CX+gap/2;B.y=CY;addUnit(A);addUnit(B);A.ai.agg=1;B.ai.agg=1;
    let t=0;while(t<90&&!A.dead&&!B.dead){A.ai.threat=B;B.ai.threat=A;hostUpdate(1/30);t+=1/30}
    const w=A.dead&&!B.dead?b:B.dead&&!A.dead?a:(A.hp/A.maxHp>B.hp/B.maxHp?a:b);return{w,t:Math.round(t),draw:!A.dead&&!B.dead,hpA:Math.round(A.hp),hpB:Math.round(B.hp)}},
  match(maxT){simMode=true;hostNewGame([]);let t=0;const step=1/30;while(t<(maxT||1500)&&!gameOver){hostUpdate(step);t+=step}
    const hs=units.filter(u=>u.hero);const w=hs.find(u=>!u.dead)||hs.find(u=>u.rank===1);
    return{t:Math.round(t),winner:w?(w.wk||'none'):'none',wlvl:w?w.lvl:0,ranks:hs.map(u=>[u.wk||'none',u.rank||1,u.lvl,u.kills,u.wt,u.at,u.ai.pref]),avgLvl:+(hs.reduce((a,u)=>a+u.lvl,0)/hs.length).toFixed(1),
      armed:hs.filter(u=>u.wk).length}}
};
if($('animeHelp'))$('animeHelp').onclick=()=>{const open=$('animeHelp').getAttribute('aria-expanded')!=='true';$('animeHelp').setAttribute('aria-expanded',String(open));$('animeGuide').classList.toggle('anime-help-collapsed',!open);$('animeHelp').textContent=open?'ซ่อนวิธีเล่น ▴':'วิธีเล่นและการควบคุม ▾'};
window.__game={sim:(s)=>{for(let i=0;i<s*30;i++){if(state!=='play')break;hostUpdate(1/30);fxUpdate(1/30)}},feed:()=>feedList.map(f=>f.txt),
  get state(){return state},get me(){return ME()},get alive(){return alive},get net(){return net},get perf(){return perfHost},units:()=>units,items:()=>items,world:()=>WD,
  tp:(x,y)=>{const m=ME();m.x=x;m.y=y},hurt:(id,a)=>{const u=UMAP.get(id);if(u)dealDamage(u,a,'pure',null)},lab:LAB,setT:t=>{gameT=t},klog:()=>KLOG,
  give:(wk,t,at)=>{const m=ME();if(!m)return;m.wk=wk;m.wt=t;if(at!==undefined)m.at=at;recalc(m,true)},lvl:n=>{const m=ME();if(!m)return;m.lvl=n;m.pts=n;recalc(m,true)},R3:()=>typeof R3!=='undefined'?R3:null};
