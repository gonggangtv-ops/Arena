"use strict";
const $=id=>document.getElementById(id);
const VER=9;
// ===================== DATA =====================
const TIERS=[{n:'ธรรมดา',c:'#dcdcdc',m:1,sa:0},{n:'หายาก',c:'#4aa8ff',m:1.22,sa:.1},{n:'มหากาพย์',c:'#b46bff',m:1.5,sa:.2},{n:'ตำนาน',c:'#ffb400',m:1.9,sa:.32},{n:'SSR',c:'#ff3d7f',m:2.4,sa:.46}];
const HB={hp:700,mp:290,hpR:2.2,mpR:1.5,dmg:45,armor:2,mr:.18,spd:205};
const HG={hp:100,mp:22,hpR:.18,mpR:.09,dmg:4.6,armor:.28,as:.028};
// basic attacks: every weapon swings faster, and landing hits back to back builds fury (faster and harder, up to FURY_MAX stacks)
const AS_K=.78,AS_MIN=.18,FURY_MAX=15,FURY_AS=.04,FURY_DMG=.02,FURY_T=3.2,CRIT_BASE=.08,CRIT_BONUS=.15,PVP_K=.47,SKILL_K=1.45;   // hero-vs-hero damage is damped so duels last; skills hit harder across the board
const FISTS={n:'มือเปล่า',ic:'✊',melee:1,range:70,atkT:.8,dmg:.55};
const WEAPONS={
  sword:{n:'ดาบและโล่',ic:'🗡️',melee:1,range:92,atkT:.9,dmg:1,hp:90,armor:3,mr:.05,col:'#cfd8e6',
    names:['ดาบเหล็กกับโล่ไม้','ดาบอัศวิน','ดาบจันทราเงิน','ดาบราชันย์มังกร','ดาบเทพสวรรค์ SSR'],desc:'ทนทาน พุ่งกระแทกสตัน โล่ดูดซับดาเมจ กระโดดฟาดพื้น'},
  axe:{n:'ขวานยักษ์',ic:'🪓',melee:1,range:108,atkT:1.1,dmg:1.3,hp:130,armor:1,ls:.15,cleave:.5,col:'#d8a070',
    names:['ขวานตัดไม้','ขวานศึก','ขวานอัสนี','ขวานไททัน','ขวานเทพอสูร SSR'],desc:'ฟันกวาดหลายตัว ดูดเลือด หมุนเป็นพายุ ผ่าแผ่นดิน'},
  dagger:{n:'มีดคู่',ic:'🔪',melee:1,range:80,atkT:.6,dmg:.72,hp:40,spd:.1,crit:.25,critM:1.8,col:'#b0f0c0',
    names:['มีดสั้นคู่','มีดเงาคู่','เขี้ยวอสรพิษ','มีดจันทร์เสี้ยว','มีดเงามรณะ SSR'],desc:'โจมตีไวคริแรง วาร์ปหลังศัตรู ล่องหน ระบำมรณะ'},
  bow:{n:'ธนูยาว',ic:'🏹',melee:0,range:520,atkT:.86,dmg:.95,pspd:1150,crit:.12,critM:1.6,col:'#e8d0a0',
    names:['ธนูไม้','ธนูพราน','ธนูเอลฟ์','ธนูเทพพฤกษา','ธนูสุริยัน SSR'],desc:'ยิงไกล ยิงกระจาย ถอยหลบพร้อมยิงตรึง ฝนธนู'},
  fire:{n:'คทาเพลิง',ic:'🔥',melee:0,range:470,atkT:.95,dmg:.86,hp:40,magic:1,pspd:760,mp:140,mpR:.6,col:'#ff8a3a',
    names:['คทาถ่านไฟ','คทาเปลวเพลิง','คทาฟีนิกซ์','คทาสุริยะ','คทาไฟนรก SSR'],desc:'ลูกไฟระเบิด ระเบิดเพลิงผลักศัตรู อุกกาบาต'},
  frost:{n:'คทาน้ำแข็ง',ic:'❄️',melee:0,range:470,atkT:1,dmg:.84,magic:1,pspd:820,mp:140,mpR:.6,chill:.2,col:'#9fe8ff',
    names:['คทาน้ำค้างแข็ง','คทาธารน้ำแข็ง','คทาพายุหิมะ','คทาราชินีหิมะ','คทานิรันดร์กาล SSR'],desc:'หอกน้ำแข็งทะลุ ตรึงศัตรู พายุหิมะแช่แข็ง'},
  gsword:{n:'ดาบใหญ่',ic:'⚔️',melee:1,range:112,atkT:1.12,dmg:1.42,hp:160,armor:4,cleave:.35,ls:.06,col:'#e0e6ff',
    names:['ดาบใหญ่ทหาร','ดาบใหญ่อัศวินดำ','ดาบใหญ่ไฟสวรรค์','ดาบใหญ่ผ่าภพ','ดาบใหญ่ทลายฟ้า SSR'],desc:'ฟันกวาดจันทร์เสี้ยว หมุนดาบกระแทกกระเด็น ปล่อยคลื่นดาบทะลุทุกสิ่ง'},
  xbow:{n:'หน้าไม้',ic:'🎯',melee:0,range:530,atkT:1.3,dmg:1.22,hp:0,pspd:1500,crit:.1,critM:1.8,col:'#d8b888',
    names:['หน้าไม้ไม้โอ๊ก','หน้าไม้พรานป่า','หน้าไม้เหล็กกล้า','หน้าไม้อัสนีบาต','หน้าไม้มังกรทมิฬ SSR'],desc:'ยิงหนักแม่นยำ ลูกดอกระเบิด ตาข่ายตรึง ระดมยิงถล่ม'},
  storm:{n:'คทาสายฟ้า',ic:'⚡',melee:0,range:480,atkT:.92,dmg:.84,hp:30,magic:1,pspd:900,mp:150,mpR:.65,col:'#b9a6ff',
    names:['คทาประกายไฟฟ้า','คทาฟ้าคะนอง','คทาเทพสายฟ้า','คทาราชาอัสนี','คทาเทพพายุ SSR'],desc:'สายฟ้าลูกโซ่กระโดดหลายเป้า สนามไฟฟ้าทำช้า อัสนีบาตฟาดลงมา'}
};
const WK=['sword','axe','dagger','bow','fire','frost','gsword','xbow','storm'];
const SK={
  sword:[{ic:'🛡️',n:'โล่กระแทก',cd:[12,11,10,9],mp:[55,60,65,70],range:[380,400,420,440]},
         {ic:'✨',n:'ป้อมปราการ',cd:[16,15,14,13],mp:[60,70,80,90],range:[0,0,0,0]},
         {ic:'⚔️',n:'ดาบพิพากษา',cd:[70,60,50],mp:[150,190,230],range:[600,650,700]}],
  axe:[{ic:'🌪️',n:'พายุขวาน',cd:[12,11,10,9],mp:[70,80,90,100],range:[190,190,190,190]},
       {ic:'📯',n:'คำรามศึก',cd:[16,15,14,13],mp:[50,55,60,65],range:[360,360,360,360]},
       {ic:'💥',n:'ผ่าปฐพี',cd:[65,55,45],mp:[150,200,250],range:[720,760,800]}],
  dagger:[{ic:'👤',n:'ก้าวเงา',cd:[10,9,8,7],mp:[50,55,60,65],range:[500,550,600,650]},
          {ic:'💨',n:'ม่านควัน',cd:[18,16,14,12],mp:[60,60,60,60],range:[0,0,0,0]},
          {ic:'🌸',n:'ระบำมรณะ',cd:[60,50,40],mp:[120,160,200],range:[320,330,340]}],
  bow:[{ic:'🎯',n:'ยิงกระจาย',cd:[8,7,6,5],mp:[60,65,70,75],range:[560,560,560,560]},
       {ic:'🪢',n:'ถอยยิงตรึง',cd:[14,13,12,11],mp:[60,65,70,75],range:[520,520,520,520]},
       {ic:'🌧️',n:'ฝนธนู',cd:[60,50,40],mp:[150,200,250],range:[680,680,680]}],
  fire:[{ic:'☄️',n:'ลูกไฟ',cd:[7,6.5,6,5.5],mp:[70,80,90,100],range:[680,680,680,680]},
        {ic:'💥',n:'ระเบิดเพลิง',cd:[13,12,11,10],mp:[80,90,100,110],range:[230,230,230,230]},
        {ic:'🌋',n:'อุกกาบาต',cd:[60,52,44],mp:[160,220,280],range:[720,720,720]}],
  frost:[{ic:'🧊',n:'หอกน้ำแข็ง',cd:[8,7.5,7,6.5],mp:[65,75,85,95],range:[700,700,700,700]},
         {ic:'❄️',n:'วงน้ำแข็ง',cd:[13,12,11,10],mp:[90,100,110,120],range:[240,240,240,240]},
         {ic:'🌨️',n:'พายุหิมะ',cd:[70,60,50],mp:[170,230,290],range:[650,650,650]}],
  gsword:[{ic:'🌙',n:'ฟันจันทร์เสี้ยว',cd:[9,8.5,8,7.5],mp:[60,65,70,75],range:[270,280,290,300]},
          {ic:'🌀',n:'หมุนกระแทก',cd:[14,13,12,11],mp:[60,65,70,75],range:[220,220,220,220]},
          {ic:'🌊',n:'คลื่นดาบสวรรค์',cd:[65,55,45],mp:[150,200,250],range:[900,950,1000]}],
  xbow:[{ic:'💣',n:'ลูกดอกระเบิด',cd:[8,7.5,7,6.5],mp:[60,65,70,75],range:[640,640,640,640]},
        {ic:'🕸️',n:'ตาข่ายดักจับ',cd:[14,13,12,11],mp:[60,65,70,75],range:[580,580,580,580]},
        {ic:'🎆',n:'ระดมยิงถล่ม',cd:[60,52,44],mp:[150,200,250],range:[700,700,700]}],
  storm:[{ic:'⚡',n:'สายฟ้าลูกโซ่',cd:[7,6.5,6,5.5],mp:[70,80,90,100],range:[560,580,600,620]},
         {ic:'🔋',n:'สนามไฟฟ้า',cd:[14,13,12,11],mp:[80,90,100,110],range:[250,250,250,250]},
         {ic:'🌩️',n:'อัสนีบาต',cd:[65,55,45],mp:[170,230,290],range:[680,680,680]}]
};
const SKV={
  sword:[{dmg:[60,105,150,195],stun:[.7,.85,1,1.15]},{sh:[90,150,210,270]},{dmg:[200,300,400],stun:[1.2,1.4,1.6],r:[250,270,290]}],
  axe:[{dmg:[22,34,46,58],n:7},{slow:[.3,.35,.4,.45],as:[.3,.4,.5,.6]},{dmg:[220,330,440],stun:[1,1.2,1.4],w:170}],
  dagger:[{dmg:[70,115,160,205]},{t:[3,3.5,4,4.5],spd:[.15,.2,.25,.3],bs:[70,115,160,205]},{dmg:[52,78,104],n:6}],
  bow:[{dmg:[60,95,130,165]},{dmg:[50,80,110,140],root:[1,1.25,1.5,1.75]},{dmg:[30,46,62]}],
  fire:[{dmg:[95,150,205,260]},{dmg:[65,100,135,170],burn:[9,13,17,21]},{dmg:[240,350,460],r:[220,240,260],burn:[26,38,50]}],
  frost:[{dmg:[85,140,195,250]},{dmg:[65,105,145,185],root:[.8,1,1.2,1.4]},{dmg:[27,40,53],stun:[.8,1,1.2]}],
  gsword:[{dmg:[85,135,185,235],slow:[.3,.35,.4,.45]},{dmg:[60,95,130,165],kb:900},{dmg:[260,380,500]}],
  xbow:[{dmg:[65,100,135,170]},{dmg:[25,40,55,70],root:[1,1.15,1.3,1.45]},{dmg:[36,54,72],stun:[.5,.65,.8]}],
  storm:[{dmg:[74,118,162,206],n:[3,3,4,4]},{dmg:[18,27,36,45]},{dmg:[46,70,94],stun:[.6,.8,1]}]
};
// ===================== WEAPON FUSION =====================
// Carry two different weapons; once the match clock passes 10:00 they fuse into one of these (new skills, better stats).
// Recipe = the two weapons' families: M melee · R ranged · S spell (the spell's element flavours the result).
const FUSE_AT=600;
const WCAT={sword:'M',axe:'M',dagger:'M',gsword:'M',bow:'R',xbow:'R',fire:'S',frost:'S',storm:'S'};
const CATN={M:'อาวุธประชิด',R:'อาวุธยิงไกล',S:'คทาเวท'};
const ELEM={fire:{c:'#ff7a2a',n:'เพลิง',ic:'🔥',k:2,aoe:'burn',big:'meteor'},frost:{c:'#8fe3ff',n:'เหมันต์',ic:'❄️',k:3,aoe:'blizz',big:'blizz'},storm:{c:'#b9a6ff',n:'อัสนี',ic:'⚡',k:10,aoe:'static',big:'thunder'}};
const FUSED={};const FK=[];
(()=>{const tierNames=b=>[b,b+'ชั้นสูง',b+'มหากาพย์',b+'ตำนาน',b+' SSR'];
  const add=(k,o)=>{o.names=tierNames(o.n);o.fused=1;WEAPONS[k]=o;FUSED[k]=o;FK.push(k)};
  add('fMM',{n:'ดาบคู่ราชันย์',ic:'👑',arch:'MM',base:'sword',melee:1,range:100,atkT:.84,dmg:1.1,hp:120,armor:3,ls:.08,cleave:.45,crit:.1,critM:1.8,col:'#ffcf6a',glow:'#ff5a3a',
    desc:'ดาบคู่โจมตีไวหนัก ดูดเลือด พุ่งทะลวงแนวศัตรู เลือดราชันย์บัฟตัวเอง กระโดดประหารฟันสองจังหวะ',rec:['M','M']});
  add('fMR',{n:'หอกล่าวิญญาณ',ic:'🔱',arch:'MR',base:'gsword',melee:1,range:150,atkT:.88,dmg:1.26,hp:100,spd:.06,crit:.18,critM:1.9,cleave:.3,col:'#7ff0d8',glow:'#3affc8',
    desc:'หอกระยะประชิดยาว ขว้างหอกทะลุ ก้าวลมพุ่งไปพร้อมคริ พายุวิญญาณหมุนรอบตัว',rec:['M','R']});
  for(const e of['fire','frost','storm']){const E=ELEM[e];
    add('fMS_'+e,{n:{fire:'ดาบเพลิงนรก',frost:'ดาบเหมันต์นิรันดร์',storm:'ดาบอัสนีบาต'}[e],ic:{fire:'🌋',frost:'🧊',storm:'🌩️'}[e],arch:'MS',el:e,base:'gsword',melee:1,range:112,atkT:.95,dmg:1.28,hp:130,armor:2,mp:120,mpR:.5,col:E.c,glow:E.c,
      desc:`ดาบธาตุ${E.n} ฟันติดธาตุ ปล่อยคลื่นดาบ${E.n} ออร่า${E.n}รอบตัว กระโดดถล่มธาตุใส่พื้นที่`,rec:['M','S'],re:e});
    add('fRS_'+e,{n:{fire:'ธนูสุริยันเพลิง',frost:'ธนูจันทร์เหมันต์',storm:'ธนูวายุอัสนี'}[e],ic:{fire:'☀️',frost:'🌙',storm:'🌪️'}[e],arch:'RS',el:e,base:'bow',melee:0,range:560,atkT:.86,dmg:1.02,pspd:1250,crit:.12,critM:1.7,mp:60,mpR:.3,col:E.c,glow:E.c,
      desc:`ธนูธาตุ${E.n} ศรติดธาตุ ยิงศรสามทาง บ่อ${E.n}ใส่พื้นที่ ฝนศร${E.n}`,rec:['R','S'],re:e})}
  add('fRR',{n:'หน้าไม้มังกรคู่',ic:'🐉',arch:'RR',base:'xbow',melee:0,range:580,atkT:.8,dmg:1.08,pspd:1500,crit:.15,critM:1.8,col:'#ffb46a',glow:'#ff7a2a',
    desc:'หน้าไม้คู่ยิงรัว กับดักระเบิดตรึง ศรมังกรทะลวงทุกสิ่งในแนวยาว',rec:['R','R']});
  for(const [k,a,b,n,ic] of[['fSS_steam','fire','frost','คทาสุริยันจันทรา','🌗'],['fSS_blaze','fire','storm','คทาพายุเพลิง','🌠'],['fSS_tempest','frost','storm','คทาพายุหิมะอัสนี','🌀']])
    add(k,{n,ic,arch:'SS',el:a,el2:b,base:a,melee:0,range:520,atkT:.9,dmg:.98,hp:40,magic:1,pspd:900,mp:220,mpR:.8,col:ELEM[a].c,glow:ELEM[b].c,
      desc:`คทาสองธาตุ ${ELEM[a].n}+${ELEM[b].n} ลูกแก้วคู่ธาตุ ระเบิดสองธาตุรอบตัว พายุสองธาตุถล่มพื้นที่`,rec:['S','S'],re:a+'+'+b});
  // skills (cd / mana / range per level; ults have 3 levels)
  const S4=(ic,n,cd,mp,rg)=>({ic,n,cd,mp,range:rg});
  SK.fMM=[S4('🌪️','พายุดาบคู่',[9,8.5,8,7.5],[60,65,70,75],[420,440,460,480]),S4('🩸','เลือดราชันย์',[16,15,14,13],[60,70,80,90],[0,0,0,0]),S4('👑','ราชันย์ประหาร',[65,55,45],[150,200,250],[600,650,700])];
  SKV.fMM=[{dmg:[60,95,130,165],slow:[.25,.3,.35,.4]},{sh:[100,160,220,280],as:[.25,.3,.35,.4]},{dmg:[220,330,440],dmg2:[70,105,140],stun:[1,1.2,1.4],r:[260,280,300]}];
  SK.fMR=[S4('🔱','ขว้างหอกทะลุ',[8,7.5,7,6.5],[55,60,65,70],[650,700,750,800]),S4('💨','ก้าวลม',[12,11,10,9],[50,55,60,65],[420,440,460,480]),S4('🌀','พายุวิญญาณ',[60,52,44],[140,190,240],[300,320,340])];
  SKV.fMR=[{dmg:[80,125,170,215]},{bs:[40,70,100,130]},{dmg:[30,44,58]}];
  for(const e of['fire','frost','storm']){const E=ELEM[e];
    SK['fMS_'+e]=[S4(E.ic,'คลื่นดาบ'+E.n,[8,7.5,7,6.5],[60,65,70,75],[600,620,640,660]),S4('✨','ออร่า'+E.n,[14,13,12,11],[60,70,80,90],[230,230,230,230]),S4({fire:'☄️',frost:'🌨️',storm:'🌩️'}[e],E.n+'ถล่มปฐพี',[65,55,45],[160,210,260],[620,660,700])];
    SKV['fMS_'+e]=[{dmg:[90,140,190,240]},{dmg:[10,15,20,25]},{dmg:[240,350,460],r:[260,280,300],stun:[.8,1,1.2]}];
    SK['fRS_'+e]=[S4('🏹','ศร'+E.n+'สามทาง',[7,6.5,6,5.5],[60,65,70,75],[620,620,620,620]),S4('🌀','บ่อ'+E.n,[13,12,11,10],[70,80,90,100],[600,600,600,600]),S4('🌧️','ฝนศร'+E.n,[60,52,44],[160,215,270],[700,700,700])];
    SKV['fRS_'+e]=[{dmg:[60,95,130,165]},{dmg:[10,15,20,25]},{dmg:[34,50,66],stun:[.6,.8,1]}]}
  SK.fRR=[S4('🎆','ยิงรัวมังกร',[8,7.5,7,6.5],[60,65,70,75],[600,600,600,600]),S4('💣','กับดักระเบิด',[12,11,10,9],[60,65,70,75],[600,600,600,600]),S4('🐉','ศรมังกรทะลวงฟ้า',[60,52,44],[150,200,250],[1300,1400,1500])];
  SKV.fRR=[{dmg:[22,34,46,58]},{dmg:[70,105,140,175],root:[1,1.2,1.4,1.6]},{dmg:[300,440,580]}];
  for(const k of['fSS_steam','fSS_blaze','fSS_tempest']){
    SK[k]=[S4('🔮','ลูกแก้วคู่ธาตุ',[6.5,6,5.5,5],[70,80,90,100],[700,700,700,700]),S4('💫','ระเบิดสองธาตุ',[12,11,10,9],[80,90,100,110],[260,260,260,260]),S4('🌪️','พายุสองธาตุ',[65,55,45],[180,240,300],[700,700,700])];
    SKV[k]=[{dmg:[45,70,95,120]},{dmg:[60,92,124,156]},{dmg:[30,44,58],stun:[.8,1,1.2]}]}})();
const AW=WK.concat(FK);   // every weapon key (network index)
function fuseKey(a,b){const ca=WCAT[a],cb=WCAT[b];if(!ca||!cb||a===b)return null;const c=[ca,cb].sort().join('');
  if(c==='MM')return'fMM';if(c==='MR')return'fMR';if(c==='RR')return'fRR';const sp=[a,b].filter(k=>WCAT[k]==='S');
  if(c==='MS')return'fMS_'+sp[0];if(c==='RS')return'fRS_'+sp[0];const s2=sp.sort().join('+');return s2==='fire+frost'?'fSS_steam':s2==='fire+storm'?'fSS_blaze':'fSS_tempest'}
const ARMORS=[
  {n:'ชุดผ้าเดินทาง',ic:'👕',c:'#e8e2d0',armor:2,hp:60,mr:.04},
  {n:'เกราะหนัง',ic:'🦺',c:'#6fd46f',armor:4,hp:130,mr:.07},
  {n:'เกราะโซ่',ic:'⛓️',c:'#4aa8ff',armor:6,hp:210,mr:.11,spd:-.02},
  {n:'เกราะเหล็ก',ic:'🛡️',c:'#b46bff',armor:8,hp:320,mr:.15,spd:-.04},
  {n:'เกราะมังกร',ic:'🐉',c:'#ffb400',armor:10.5,hp:460,mr:.22,regen:2.5}
];
const CREEPS={
  goblin:{name:'ก็อบลิน',hp:260,dmg:11,armor:1,spd:165,r:21,atkT:1,range:58,xp:40,col:'#7fb04a'},
  wolf:{name:'หมาป่าเงิน',hp:450,dmg:20,armor:2,spd:182,r:25,atkT:.9,range:60,xp:65,col:'#9aa0aa'},
  ogre:{name:'โทรลล์ภูเขา',hp:950,dmg:36,armor:3,spd:150,r:34,atkT:1.5,range:80,xp:130,col:'#7a8a9a',cleave:true},
  golem:{name:'โกเลมหินผา',hp:2100,dmg:55,armor:5,spd:120,r:40,atkT:1.6,range:84,xp:240,col:'#8a8478'},
  guardian:{name:'ผู้พิทักษ์คริสตัล',hp:2700,dmg:62,armor:5,spd:118,r:42,atkT:1.5,range:86,xp:320,col:'#6a7ab0',leash:220},
  // Arena Royale (owner 2026-11-21): the Magma Titan, the owner's fire golem, haunts the Ashen Wastes; its blows set heroes alight
  magma:{name:'ไททันลาวา',hp:2900,dmg:62,armor:5,spd:120,r:42,atkT:1.5,range:88,xp:340,col:'#c8461a',leash:320,fire:1},
  boss:{name:'มังกรเพลิง',hp:9500,dmg:110,armor:7,spd:150,r:66,atkT:1.6,range:122,xp:1100,col:'#a83a1a',leash:360,dragon:true},
  // night only: the dead rise and hunt every hero they can smell
  // (owner 2026-11-21: much tougher — more HP and bite, rotting bites, runners lunge, brutes slam, the king raises the dead)
  zombie:{name:'ซอมบี้',hp:640,dmg:34,armor:3,spd:162,r:24,atkT:1.05,range:62,xp:80,col:'#6f8f5a',zombie:1,kk:'Skeleton_Minion'},
  zrunner:{name:'ซอมบี้วิ่งไว',hp:460,dmg:28,armor:2,spd:222,r:22,atkT:.75,range:58,xp:70,col:'#8aa070',zombie:1,kk:'Skeleton_Rogue'},
  zbrute:{name:'ซอมบี้ยักษ์',hp:2200,dmg:70,armor:6,spd:138,r:34,atkT:1.45,range:84,xp:220,col:'#5a7048',zombie:1,kk:'Skeleton_Warrior',big:1},
  zlord:{name:'ราชาซอมบี้',hp:4600,dmg:88,armor:8,spd:146,r:38,atkT:1.35,range:92,xp:520,col:'#4a6a3a',zombie:1,kk:'Skeleton_Mage',big:1,lord:1}
};
const ZK=['zombie','zrunner','zbrute','zlord'];
const CAMP_KINDS={small:['goblin','goblin','goblin','goblin','goblin'],medium:['wolf','wolf','wolf'],large:['ogre','wolf','wolf'],ancient:['golem','ogre'],
  castle:['ogre','ogre','wolf'],keep:['golem','ogre','ogre'],dgA:['zombie','zombie','zrunner','zrunner'],dgB:['zbrute','zombie','zombie'],dgC:['golem','zrunner','zrunner'],dgD:['zbrute','zbrute','zrunner'],vault:['zlord','zbrute','zbrute']};
const CREEP_REQ={goblin:1,wolf:3,ogre:6,golem:9,guardian:10,magma:10,boss:13};
const ITEMS=[
  {id:'potion',ic:'🧪',name:'ยาฟื้นพลัง',w:4},
  {id:'mana',ic:'💧',name:'ยามานา',w:3},
  {id:'whet',ic:'💎',name:'หินลับคม +10% ดาเมจ',w:3},
  {id:'boots',ic:'👢',name:'รองเท้าเร็ว +7% ความเร็ว',w:2},
  {id:'heart',ic:'❤️',name:'หัวใจยักษ์ +12% เลือด',w:2},
  {id:'cloak',ic:'🧥',name:'ผ้าคลุมเวท +10% ต้านเวท',w:2},
  {id:'fairy',ic:'🧚',name:'ภูตพิทักษ์ เกราะ +3',w:1.5},
  {id:'tome',ic:'📘',name:'คัมภีร์ปัญญา +320 XP',w:1.5}
];
const ITEM_BY={};ITEMS.forEach(i=>ITEM_BY[i.id]=i);
// backpack: potions are stored and drunk with the HUD buttons (or from the bag panel)
const BAG=[{k:'hp',ic:'🧪',n:'ยาเลือด',d:'ฟื้นเลือด 40% ใน 3 วิ (โดนตีอยู่ ½)',max:9,cd:4},{k:'mp',ic:'💧',n:'ยามานา',d:'ฟื้นมานา 50% ใน 2 วิ (โดนตีอยู่ ½)',max:9,cd:4},
  {k:'big',ic:'⚗️',n:'ยาฟื้นฟูใหญ่',d:'ฟื้นเลือดและมานาเต็ม (โดนตีอยู่ ½)',max:3,cd:10},{k:'spd',ic:'🍃',n:'ยาเร่งฝีเท้า',d:'วิ่งเร็วขึ้น 35% นาน 6 วิ',max:3,cd:12}];
const BAG_BY={};BAG.forEach((b,i)=>{b.i=i;BAG_BY[b.k]=b});
const LOOKS=[{n:'แดง',c:'#b8322e'},{n:'น้ำเงิน',c:'#2e5cb8'},{n:'เขียว',c:'#2f8a46'},{n:'ม่วง',c:'#7a3ab8'},{n:'ทอง',c:'#c8961e'},{n:'ดำ',c:'#2c2c34'},{n:'ขาว',c:'#e4e0d4'},{n:'ชมพู',c:'#d0507a'}];
// map is four times the area of v0.7 (MS = side scale) and holds 32 heroes
// Arena Royale (owner 2026-11-21, ARX = index only): the map grows north by one step, an old town on a plateau above the waterfall.
// The world square is 22000 there with the valley moved 2000 south (CY) to make room; The Cursed Realm and classic keep 20000.
const ARX=CURSED&&!MOON;
const MS=2,WORLD=ARX?22000:20000,CX=WORLD/2,CY=ARX?12000:10000,MAXL=18,TOTAL_HEROES=32,MAX_HUMANS=32,DAY=150,NIGHT=100,WL=-5;
const PHASES=[{w:165,s:84,r:6600},{w:110,s:70,r:4900},{w:88,s:62,r:3500},{w:72,s:55,r:2400},{w:60,s:47,r:1520},{w:50,s:39,r:840},{w:38,s:30,r:360},{w:28,s:28,r:0}];
const BOT_NAMES=['พายุ','ไฟป่า','เงามืด','สายฟ้า','หมาป่า','นินจา','ทอร์นาโด','เพชฌฆาต','มังกร','ฟีนิกซ์','อสุรา','กระทิง','พยัคฆ์','ราชสีห์','ภูตพราย','นาคา','อัศวินดำ','จิ้งจอก','เหยี่ยว','พรานป่า',
  'ครุฑ','หนุมาน','ยักษ์ทมิฬ','เทพธิดา','จอมขมังเวทย์','นักดาบเงา','ราชันย์','อินทรี','เสือดำ','สิงห์ทอง','วายุ','อัคนี','ธารา','ปฐพี','จันทรา','สุริยา','เพลิงนรก','น้ำแข็ง','ม้าศึก','แมงป่อง'];
const AOE_KINDS=['spin','judg','cry','line','lotus','rain','boom','nova','meteor','burn','frost','blizz','slam','breath','quake','smoke','crescent','whirl','net','volley','static','thunder','spirit'];
const AOE_COL={spin:'#ffcf8a',judg:'#ffe27a',cry:'#ff9a5a',line:'#ffb347',lotus:'#ff7ad0',rain:'#9dffc0',boom:'#ff7a2a',nova:'#ff6a1a',meteor:'#ff5a2a',burn:'#ff8a2a',frost:'#8fe3ff',blizz:'#cfefff',slam:'#ff4a4a',breath:'#ff6a1a',quake:'#ffb347',smoke:'#b8b8c8'};

// ===================== UTIL =====================
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const lerp=(a,b,k)=>a+(b-a)*k;
const smooth01=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
function pickW(list,r){r=r||Math.random;let t=0;for(const i of list)t+=i.w;let x=r()*t;for(const i of list){if((x-=i.w)<0)return i}return list[0]}
function pickTier(ws,r){r=r||Math.random;let t=ws.reduce((a,b)=>a+b,0),x=r()*t;for(let i=0;i<ws.length;i++){if((x-=ws[i])<0)return i}return 0}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let SR=Math.random;const sr=(a,b)=>a+SR()*(b-a);
// numbers on screen are shown x10 (damage, health) for punchier totals; the simulation keeps its own scale
const DS=10,fmtN=n=>Math.round(n*DS).toLocaleString('en-US');
function hexA(h,a){const n=parseInt(h.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}
function lsGet(k,d){try{const v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function makeNoise(rng,scale){const P=new Float32Array(4096);for(let i=0;i<4096;i++)P[i]=rng();
  return (x,y)=>{x/=scale;y/=scale;const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
    const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);const a=P[((xi&63)<<6)|(yi&63)],b=P[(((xi+1)&63)<<6)|(yi&63)],c=P[((xi&63)<<6)|((yi+1)&63)],d=P[(((xi+1)&63)<<6)|((yi+1)&63)];
    return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}}
function segDist(p,s){const x1=s[0],y1=s[1],dx=s[2]-x1,dy=s[3]-y1,l=dx*dx+dy*dy||1;const t=clamp(((p.x-x1)*dx+(p.y-y1)*dy)/l,0,1);return Math.hypot(p.x-(x1+dx*t),p.y-(y1+dy*t))}
function circRect(cx,cy,r,q){const nx=clamp(cx,q.x,q.x+q.w),ny=clamp(cy,q.y,q.y+q.h);return (cx-nx)**2+(cy-ny)**2<r*r}
function inRect(p,r,m=0){return p.x>r.x-m&&p.x<r.x+r.w+m&&p.y>r.y-m&&p.y<r.y+r.h+m}
const fmtT=t=>{t=Math.max(0,Math.floor(t));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')};
const randId=n=>{const A='abcdefghijkmnpqrstuvwxyz23456789';let s='';for(let i=0;i<n;i++)s+=A[Math.floor(Math.random()*A.length)];return s};

// ===================== AUDIO =====================
// ===================== AUDIO =====================
// Recorded CC0 / CC BY sound bank (sfx.js, see CREDITS-AUDIO.md) + streamed music tracks (music/*.mp3).
// Per-sound mix: v volume, r playback-rate range, rv reverb send, max voices, duck = dip the music;
// use = play another bank entry, combo = timed layers [name, delay, volume], synth = also play the procedural voice.
const SND={
  swing:{v:.5,r:[.95,1.12]},stab:{use:'swing',v:.45,r:[1.18,1.36]},heavy:{v:.62,r:[.9,1.06]},
  hit:{v:.5,r:[.88,1.1],max:5},hitm:{v:.4,r:[.92,1.1],max:4},crit:{v:.62,r:[.95,1.05],max:3},
  shoot:{v:.5,r:[.95,1.1],max:4},bowdraw:{v:.45},ahit:{v:.48,max:4},
  orb:{v:.42,r:[.95,1.12],max:3,rv:.15},fhit:{v:.4,r:[1.05,1.25],max:3,rv:.1},ice:{v:.4,max:3,rv:.12},ihit:{v:.4,max:3,rv:.1},
  zap:{v:.36,max:3,rv:.12},ehit:{v:.4,max:3,rv:.1},lance:{v:.6,rv:.15},
  boom:{v:.85,r:[.9,1.08],max:3,rv:.3,duck:1},nova:{v:.75,rv:.25,duck:1},frost:{v:.7,rv:.25},freeze:{v:.65,rv:.2},
  thunder:{v:.8,rv:.3,duck:1},quake:{v:.85,r:[.85,1],rv:.3,duck:1},slam:{use:'quake'},meteor:{v:.7,rv:.3},breath:{v:.7,rv:.2},
  shield:{v:.55,rv:.2},blink:{v:.5,rv:.2},invis:{use:'blink',v:.42,r:[.8,.9]},wind:{v:.45},dash:{use:'wind',v:.45,r:[1.1,1.3]},leap:{use:'wind',v:.5,r:[.82,.95]},
  trap:{v:.6},buff:{v:.5,rv:.2},heal:{v:.5,rv:.2},speed:{v:.5},charge:{v:.6,rv:.2},revive:{v:.6,rv:.3},aegis:{v:.6,rv:.3},
  cry:{v:.7,rv:.25,max:2},hurt:{v:.5,max:1},death:{v:.6,rv:.2,max:2},roar:{v:.85,r:[.9,1.05],rv:.3,max:2,duck:1},
  mdie:{v:.5,max:3},mob:{use:'mdie'},mhurt:{v:.4,max:2},zdie:{v:.55,max:3},groan:{v:.5,r:[.85,1.05],max:2,rv:.15},howl:{v:.55,rv:.45},rubble:{v:.6},
  step:{v:.16,r:[.85,1.15],max:2,rv:0},pick:{v:.5},gem:{v:.45},armor:{v:.55},weapon:{v:.6},lock:{v:.55},coins:{v:.45},bubble:{v:.45},glass:{v:.35},bag:{v:.45},
  anvil:{v:.8,rv:.35},bell:{v:.55,rv:.5},lvl:{v:.55,rv:.2},learn:{v:.45,rv:0},click:{v:.4,max:2,rv:0},nomana:{v:.45,rv:0},win:{v:.7,rv:.1},achieve:{v:.6},
  rain:{combo:[['bowdraw',0,.8],['shoot',.12,.9],['shoot',.19,.8],['shoot',.27,.8],['shoot',.36,.7]]},
  spin:{combo:[['heavy',0,1],['wind',.04,.7],['heavy',.3,.9],['heavy',.6,.8],['heavy',.9,.7]]},
  lotus:{combo:[0,1,2,3,4,5].flatMap(i=>[['swing',i*.17,.9],['hitm',i*.17+.06,.7]])},
  potion:{combo:[['glass',0,.8],['bubble',.1,1],['heal',.32,.8]]},
  chest:{combo:[['lock',0,1],['coins',.18,1]]},
  rise:{combo:[['rubble',0,1],['groan',.35,1]]},
  fusing:{combo:[['charge',0,1]]},
  fuse:{combo:[['anvil',0,1],['bell',.04,.8],['buff',.12,.7],['lvl',.3,.6]]},
  fusewarn:{combo:[['bell',0,1],['bell',.65,.9]]},
  night:{combo:[['howl',.5,1]],synth:1},zone:{combo:[['bell',0,.6]],synth:1},
};
const MUS_VOL={menu:.85,day:.75,night:.85,battle:.8,final:.85},AMB_VOL={wind:.32,cave:.7};
const AU={ctx:null,mode:lsGet('ar_mute','0')==='1'?2:(+lsGet('ar_snd','0')||0),   // 0 all on · 1 music off · 2 silent
  get muted(){return this.mode===2},
  buf:{},voices:{},lastI:{},nv:0,ready:false,trk:{},musCur:null,ambCur:null,musOk:false,combatT:-99,inCave:false,
  init(){
    if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();this.gesture();return}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    const c=this.ctx=new AC();
    const comp=c.createDynamicsCompressor();comp.threshold.value=-12;comp.knee.value=10;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.22;comp.connect(c.destination);
    this.master=c.createGain();this.master.gain.value=this.mode===2?0:.9;this.master.connect(comp);
    this.sfx=c.createGain();this.sfx.connect(this.master);
    this.amb=c.createGain();this.amb.gain.value=.9;this.amb.connect(this.sfx);
    this.mus=c.createGain();this.mus.gain.value=this.mode===0?.42:0;this.mus.connect(this.master);
    this.duckG=c.createGain();this.duckG.connect(this.mus);
    this.rev=c.createConvolver();this.rev.buffer=this.ir(1.9);this.revG=c.createGain();this.revG.gain.value=.8;this.rev.connect(this.revG);this.revG.connect(this.master);
    const dl=c.createDelay();dl.delayTime.value=.375;const fb=c.createGain();fb.gain.value=.38;const wet=c.createGain();wet.gain.value=.35;
    dl.connect(fb);fb.connect(dl);dl.connect(wet);wet.connect(this.mus);this.echo=dl;
    const len=c.sampleRate;const b=c.createBuffer(1,len,c.sampleRate);const d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;this.noiseBuf=b;
    this.beat=0;this.nextT=c.currentTime+.1;this.timer=setInterval(()=>this.schedule(),120);
    this.loadPack();this.pickMusic();
  },
  // a hall-like impulse response, darker towards the tail
  ir(sec){const c=this.ctx,n=Math.floor(c.sampleRate*sec),b=c.createBuffer(2,n,c.sampleRate);
    for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let y=0;for(let i=0;i<n;i++){const t=i/n,k=.25+.7*t;y=y*k+(Math.random()*2-1)*(1-k);d[i]=i<c.sampleRate*.012?0:y*Math.pow(1-t,2.6)*2.2}}return b},
  loadPack(){const P=window.SFX_PACK;if(!P){window.__sfxReady=()=>this.loadPack();return}if(this.loading||!this.ctx)return;this.loading=true;
    const c=this.ctx,b64=s=>{const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer};let left=0;
    for(const k in P){this.buf[k]=this.buf[k]||[];for(const s of P[k]){left++;const done=()=>{if(--left===0)this.ready=true};
      try{const pr=c.decodeAudioData(b64(s),bb=>{this.buf[k].push(bb);done()},()=>done());if(pr&&pr.catch)pr.catch(()=>{})}catch(e){done()}}}},
  toggle(){this.mode=(this.mode+1)%3;lsSet('ar_snd',String(this.mode));lsSet('ar_mute','0');
    if(this.ctx){const t=this.ctx.currentTime;this.master.gain.setTargetAtTime(this.mode===2?0:.9,t,.05);this.mus.gain.setTargetAtTime(this.mode===0?.42:0,t,.2);this.pickMusic()}
    return this.mode},
  modeName(){return['เสียง: เปิดทั้งหมด','เสียง: ปิดเพลง','เสียง: ปิด'][this.mode]},
  play(n,v,pan,far){if(!this.ctx||this.mode===2)return;v=v===undefined?1:v;if(v<.03)return;const d=SND[n];
    if(d&&d.combo){let any=false;for(const [m,t,vv] of d.combo)any=this.smp(m,v*(vv==null?1:vv),pan,far,t)||any;if(d.synth||!any)this.synth(n,v);return}
    if(!this.smp(n,v,pan,far,0))this.synth(n,v)},
  smp(n,v,pan,far,delay){const d=SND[n]||{},key=d.use||n,L=this.buf[key];if(!L||!L.length)return false;const B=SND[key]||{};
    const cap=d.max||B.max||4;if((this.voices[key]||0)>=cap||this.nv>=30)return true;
    const c=this.ctx,t=c.currentTime+(delay||0);let i=Math.floor(Math.random()*L.length);if(L.length>1&&i===this.lastI[key])i=(i+1)%L.length;this.lastI[key]=i;
    const src=c.createBufferSource();src.buffer=L[i];const r=d.r||B.r||[.96,1.04];src.playbackRate.value=r[0]+Math.random()*(r[1]-r[0]);
    const g=c.createGain();g.gain.value=v*(d.v!=null?d.v:B.v!=null?B.v:.6);src.connect(g);let out=g;
    if(pan&&c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=clamp(pan,-1,1);out.connect(p);out=p}
    if(far>.25){const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=16000*Math.pow(1-far*.82,2)+500;out.connect(f);out=f}
    out.connect(this.sfx);const rv=d.rv!=null?d.rv:B.rv!=null?B.rv:.08;if(rv>.01){const s=c.createGain();s.gain.value=rv*(1+(far||0)*.6);g.connect(s);s.connect(this.rev)}
    this.voices[key]=(this.voices[key]||0)+1;this.nv++;src.onended=()=>{this.voices[key]--;this.nv--;try{g.disconnect();out.disconnect()}catch(e){}};src.start(t);
    if((d.duck||B.duck)&&v>.45)this.duck(.5,1.3);return true},
  duck(to,sec){const g=this.duckG.gain,t=this.ctx.currentTime;g.cancelScheduledValues(t);g.setTargetAtTime(to,t,.04);g.setTargetAtTime(1,t+sec*.35,sec*.45)},
  // positioned sound: quieter + more muffled with distance, panned left/right of the listener
  playAt(n,x,y){const L=listener();if(!L)return this.play(n,.6);const dx=x-L.x,d=Math.hypot(dx,y-L.y);const v=Math.pow(clamp(1-d/1500,0,1),1.35);if(v<.03)return;
    this.play(n,v,clamp(dx/650,-1,1)*.7,clamp((d-320)/1100,0,1))},
  // ---- music + ambience: streamed tracks, crossfaded ----
  track(name){let T=this.trk[name];if(T)return T;const el=new Audio();el.src='music/'+name+'.mp3';el.loop=true;el.preload='auto';
    const g=this.ctx.createGain();g.gain.value=0;g.connect(name in AMB_VOL?this.amb:this.duckG);T=this.trk[name]={el,g,ok:true,pend:false};
    try{this.ctx.createMediaElementSource(el).connect(g)}catch(e){T.ok=false}
    el.addEventListener('error',()=>{T.ok=false});el.addEventListener('playing',()=>{if(!(name in AMB_VOL))this.musOk=true});return T},
  fade(name,vol){const T=this.track(name);if(!T.ok)return;const t=this.ctx.currentTime;T.g.gain.cancelScheduledValues(t);
    if(vol>0){clearTimeout(T.to);if(T.el.paused){const p=T.el.play();if(p&&p.catch)p.catch(()=>{T.pend=true})}T.g.gain.setTargetAtTime(vol,t,.8)}
    else{T.g.gain.setTargetAtTime(0,t,.7);clearTimeout(T.to);T.to=setTimeout(()=>{if(this.musCur!==name&&this.ambCur!==name)T.el.pause()},3500)}},
  setMusic(m){if(this.mode!==0)m=null;if(m===this.musCur)return;if(this.musCur)this.fade(this.musCur,0);this.musCur=m;if(m)this.fade(m,MUS_VOL[m]||.8)},
  setAmb(a){if(a===this.ambCur)return;if(this.ambCur)this.fade(this.ambCur,0);this.ambCur=a;if(a)this.fade(a,AMB_VOL[a]||.5)},
  gesture(){for(const k in this.trk){const T=this.trk[k];if(T.pend&&(k===this.musCur||k===this.ambCur)){T.pend=false;const p=T.el.play();if(p&&p.catch)p.catch(()=>{T.pend=true})}}},
  pickMusic(){if(!this.ctx)return;let m='menu',a=null;
    if(state==='play'&&WD){const me=ME(),L=listener();
      if(me&&!me.dead&&L){for(const u of units){if(!u.hero||u===me||u.dead||!isEnemy(me,u)||Math.abs(u.x-me.x)>700||Math.abs(u.y-me.y)>700)continue;if(dist(u,me)<650){this.combatT=gameT;break}}}
      const fin=zone&&(zone.ph>=6||alive<=4),hot=gameT-this.combatT<10||battleHeat()>=1;
      m=gameOver?null:fin?'final':isNight()?'night':hot?'battle':'day';
      if(this.inCave){a='cave';if(m==='day')m=null}else a=isNight()||gameOver?null:'wind'}
    this.setMusic(m);this.setAmb(this.mode===2?null:a)},
  // per frame: footsteps, hurt grunts, zombies groaning at night, cave reverb, music state
  tick(dt){if(!this.ctx)return;this.mt=(this.mt||0)-dt;if(this.mt<=0){this.mt=.5;this.pickMusic()}
    if(state!=='play'||!WD)return;const me=ME(),L=listener();
    if(me&&!me.dead){const lx=this.lx==null?me.x:this.lx,ly=this.ly==null?me.y:this.ly,sp=Math.hypot(me.x-lx,me.y-ly)/Math.max(dt,1e-3);this.lx=me.x;this.ly=me.y;
      if(sp>60&&sp<900&&!me.dash&&!me.leap){this.stepT=(this.stepT||0)-dt*sp/300;if(this.stepT<=0){this.stepT=.36;this.play('step',1)}}
      if(this.lhp!=null&&me.hp<this.lhp-Math.max(6,me.maxHp*.035)){this.combatT=gameT;if(gameT-(this.hurtT||-9)>1.4&&Math.random()<.6){this.hurtT=gameT;this.play('hurt',.75)}}
      this.lhp=me.hp}else{this.lhp=null;this.lx=null}
    if(L&&isNight()){this.gT=(this.gT||2)-dt;if(this.gT<=0){this.gT=1.4+Math.random()*2.4;let best=null,bd=1100;
      for(const u of units){if(!u.zombie||u.dead)continue;const d=Math.abs(u.x-L.x)+Math.abs(u.y-L.y);if(d<bd){bd=d;best=u}}if(best)this.playAt('groan',best.x,best.y)}}
    let cave=!!(L&&inDG(L));if(L&&!cave)for(const c of WD.caves)if(Math.abs(L.x-c.x)<c.R+6&&dist(L,c)<c.R+6){cave=true;break}
    if(cave!==this.inCave){this.inCave=cave;this.revG.gain.setTargetAtTime(cave?2.4:.8,this.ctx.currentTime,.4);this.mt=0}},
  tone(f,dur,type,vol,f2,delay,dest){const c=this.ctx;if(!c)return;const t=c.currentTime+(delay||0);const o=c.createOscillator(),g=c.createGain();
    o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+dur);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(dest||this.sfx);o.start(t);o.stop(t+dur+.05)},
  noise(dur,vol,ftype,freq,q,delay,f2,dest){const c=this.ctx;if(!c)return;const t=c.currentTime+(delay||0);const s=c.createBufferSource();s.buffer=this.noiseBuf;
    const f=c.createBiquadFilter();f.type=ftype||'lowpass';f.frequency.setValueAtTime(freq||1000,t);if(f2)f.frequency.exponentialRampToValueAtTime(f2,t+dur);f.Q.value=q||1;
    const g=c.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(f);f.connect(g);g.connect(dest||this.sfx);s.start(t,Math.random()*.5);s.stop(t+dur+.05)},
  // procedural fallback voices (used until the sample bank is decoded, and for the musical stingers)
  synth(n,v){v=v===undefined?1:v;
    switch(n){
      case 'swing':this.noise(.12,.28*v,'bandpass',2200,2,0,700);break;
      case 'heavy':this.noise(.22,.32*v,'bandpass',900,1.5,0,300);break;
      case 'stab':this.noise(.07,.22*v,'bandpass',3600,3,0,1600);break;
      case 'shoot':this.tone(1000,.09,'triangle',.12*v,350);this.noise(.08,.08*v,'highpass',2500);break;
      case 'orb':this.tone(520,.16,'sine',.14*v,900);this.tone(780,.12,'triangle',.05*v,1200);break;
      case 'ice':this.tone(1500,.14,'sine',.1*v,2400);this.noise(.1,.06*v,'highpass',6000);break;
      case 'hit':this.tone(190,.11,'square',.09*v,60);this.noise(.06,.12*v,'lowpass',1800);break;
      case 'crit':this.tone(1400,.12,'square',.07*v,700);this.noise(.08,.14*v,'highpass',3000);break;
      case 'boom':this.noise(.55,.5*v,'lowpass',900,1,0,120);this.tone(95,.45,'sine',.4*v,35);break;
      case 'frost':this.tone(1300,.35,'sine',.1*v,1900);this.tone(1950,.3,'sine',.06*v,2600,.05);this.noise(.3,.08*v,'highpass',5000);break;
      case 'dash':this.noise(.22,.22*v,'bandpass',900,1,0,3000);break;
      case 'quake':case 'slam':this.noise(.8,.55*v,'lowpass',380,1,0,80);this.tone(62,.7,'sine',.45*v,28);break;
      case 'rain':this.noise(.35,.12*v,'highpass',3500);break;
      case 'meteor':this.tone(300,.9,'sawtooth',.05*v,90);this.noise(.9,.1*v,'bandpass',600,1,0,200);break;
      case 'shield':[660,880,1100].forEach((f,i)=>this.tone(f,.3,'sine',.07*v,0,i*.05));break;
      case 'blink':this.tone(1400,.15,'sine',.08*v,300);this.noise(.12,.1*v,'highpass',4000);break;
      case 'spin':this.noise(.6,.2*v,'bandpass',700,2,0,1800);break;
      case 'cry':this.tone(180,.6,'sawtooth',.12*v,120);this.noise(.5,.15*v,'lowpass',600);break;
      case 'invis':this.tone(900,.35,'sine',.06*v,200);break;
      case 'lotus':for(let i=0;i<6;i++)this.noise(.06,.15*v,'bandpass',3000,3,i*.18);break;
      case 'leap':this.noise(.3,.18*v,'bandpass',600,1,0,2000);break;
      case 'lance':this.tone(2000,.25,'triangle',.08*v,800);this.noise(.2,.1*v,'highpass',6000);break;
      case 'nova':this.noise(.5,.35*v,'lowpass',1200,1,0,200);this.tone(140,.4,'sine',.25*v,50);break;
      case 'freeze':this.tone(2400,.5,'sine',.06*v,3200);this.noise(.4,.1*v,'highpass',7000);break;
      case 'breath':this.noise(1.2,.35*v,'lowpass',800,1,0,300);break;
      case 'roar':this.tone(110,1.1,'sawtooth',.16*v,60);this.noise(1,.2*v,'lowpass',500);break;
      case 'armor':this.tone(300,.12,'square',.06*v,200);this.noise(.12,.12*v,'bandpass',2500,2);this.tone(500,.15,'triangle',.05*v,0,.08);break;
      case 'pick':this.tone(660,.08,'square',.07*v);this.tone(990,.12,'square',.07*v,0,.07);break;
      case 'potion':this.noise(.18,.1*v,'bandpass',1400,4,0,600);this.tone(520,.12,'sine',.08*v,880,.05);this.tone(780,.16,'sine',.06*v,1240,.12);break;
      case 'rise':this.noise(.45,.22*v,'lowpass',500,1,0,120);this.tone(90,.6,'sawtooth',.07*v,55,.05);this.tone(140,.5,'sawtooth',.04*v,90,.2);break;
      case 'chest':this.tone(330,.12,'square',.06*v,660);this.tone(784,.16,'triangle',.08*v,0,.1);this.tone(1175,.2,'triangle',.07*v,0,.18);break;
      case 'weapon':[440,554,659,880].forEach((f,i)=>this.tone(f,.22,'sawtooth',.045*v,0,i*.06));break;
      case 'lvl':[523,659,784,1047].forEach((f,i)=>this.tone(f,.25,'triangle',.09*v,0,i*.08));break;
      case 'learn':this.tone(880,.12,'triangle',.08);this.tone(1320,.18,'triangle',.07,0,.08);break;
      case 'zone':this.tone(280,.7,'sawtooth',.06*v,420);this.tone(280,.7,'sawtooth',.06*v,420,.75);break;
      case 'death':this.tone(420,.7,'sawtooth',.12*v,70);break;
      case 'cave':[220,277,330,415].forEach((f,i)=>this.tone(f,1.6,'sine',.05,0,i*.18,this.echo));break;
      case 'night':[196,233,294].forEach((f,i)=>this.tone(f,2,'sine',.05,0,i*.25,this.echo));break;
      case 'day':[392,494,587,784].forEach((f,i)=>this.tone(f,1.2,'triangle',.04,0,i*.15,this.echo));break;
      case 'revive':[330,440,554,659,880].forEach((f,i)=>this.tone(f,.4,'sine',.09,0,i*.1));break;
      case 'aegis':[523,784,1047].forEach((f,i)=>this.tone(f,.6,'triangle',.08,0,i*.12));break;
      case 'win':[523,659,784,1047,1319].forEach((f,i)=>this.tone(f,.4,'triangle',.1,0,i*.12));break;
      case 'click':this.tone(800,.04,'square',.05);break;
      case 'mob':this.noise(.1,.15*v,'lowpass',500);break;
      case 'mdie':this.tone(190,.3,'triangle',.15*v,55);this.noise(.22,.19*v,'lowpass',650);break;
      case 'zdie':this.tone(92,.42,'sawtooth',.1*v,35);this.noise(.32,.18*v,'bandpass',450,1,0,180);break;
      case 'nomana':this.tone(220,.12,'square',.05);break;
      // weapon fusion: a rising shimmer, then an anvil strike + bright chord
      case 'fusing':this.tone(220,1.1,'sawtooth',.05*v,880);this.tone(330,1.1,'triangle',.05*v,1320,.1);this.noise(1.1,.08*v,'bandpass',800,3,0,5000);break;
      case 'fuse':this.noise(.25,.4*v,'bandpass',2600,6);this.tone(1760,.5,'square',.05*v,1700);this.tone(110,.6,'sine',.35*v,55);[523,659,784,1047,1319].forEach((f,i)=>this.tone(f,.7,'triangle',.06*v,0,.08+i*.06,this.echo));break;
      case 'fusewarn':[784,0,784].forEach((f,i)=>f&&this.tone(f,.5,'sine',.08,0,i*.22,this.echo));this.tone(392,1.2,'triangle',.05,0,.1,this.echo);break;
    }},
  // procedural music: only plays when the music files could not be loaded (offline / missing)
  schedule(){const c=this.ctx;if(!c||c.state!=='running')return;if(this.musOk||this.mode!==0){this.nextT=c.currentTime+.1;return}
    const spb=60/76/2;const night=typeof isNight==='function'&&state==='play'&&isNight();
    const chords=night?[[57,60,64],[53,57,60],[50,53,57],[52,56,59]]:[[55,59,62],[52,55,59],[48,52,55],[50,54,57]];
    while(this.nextT<c.currentTime+.6){
      const b=this.beat,bar=Math.floor(b/8)%4,ch=chords[bar],t=this.nextT-c.currentTime;const mf=n=>440*Math.pow(2,(n-69)/12);
      if(b%8===0)ch.forEach(n=>this.pad(mf(n),spb*8,t));
      if(b%4===0)this.tone(mf(ch[0]-24),spb*3.5,'sine',.07,0,t,this.mus);
      if(Math.random()<.6){const n=ch[Math.floor(Math.random()*3)]+12*(Math.random()<.5?1:2);this.tone(mf(n),spb*1.6,'triangle',.026,0,t,this.echo);this.tone(mf(n),spb*1.2,'triangle',.018,0,t,this.mus)}
      const h=battleHeat();if(h>0&&b%2===0)this.noiseM(.09,.05*h*(b%4===0?1.6:.6),t);
      if(state==='play'&&!this.muted){if(!night&&Math.random()<.035){const f=rand(2600,4200);for(let k=0;k<3;k++)this.tone(f*(1+k*.08),.07,'sine',.012,f*1.25,t+k*.09,this.mus)}
        if(night&&Math.random()<.18)this.noise(.05,.008,'bandpass',4800,8,t,0,this.mus)}
      this.beat++;this.nextT+=spb;
    }},
  pad(f,dur,delay){const c=this.ctx,t=c.currentTime+delay;const o=c.createOscillator(),g=c.createGain(),fl=c.createBiquadFilter();
    o.type='sawtooth';o.frequency.value=f;o.detune.value=rand(-8,8);fl.type='lowpass';fl.frequency.value=900;
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.02,t+dur*.35);g.gain.linearRampToValueAtTime(.0001,t+dur);
    o.connect(fl);fl.connect(g);g.connect(this.mus);o.start(t);o.stop(t+dur+.1)},
  noiseM(dur,vol,delay){const c=this.ctx,t=c.currentTime+delay;const s=c.createBufferSource();s.buffer=this.noiseBuf;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=160;
    const g=c.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(this.mus);s.start(t);s.stop(t+dur+.05)}
};
function battleHeat(){if(state!=='play'||!zone)return 0;return zone.st==='shrink'?1:zone.ph>=4?.6:0}

// ===================== CANVAS / LAYOUT =====================
const cv=$('c'),ctx=cv.getContext('2d');
window.ArenaLanguage?.canvas(ctx);
let W=0,H=0,DPR=1,Z=1;const SAFE={l:0,r:0,t:0,b:0};
const UI={atk:{},sk:[{},{},{}],learn:[{},{},{}],joyHome:{},b:40,mute:{},s:1,swap:null,pot:null,bagBtn:null,bagOpen:false,bagRows:null,mouse:null,potP:-1,potT:0,cancel:null,wsw:null,wsw2:null,wswT:0};
const LC=document.createElement('canvas'),lctx=LC.getContext('2d');
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cv.style.width=W+'px';cv.style.height=H+'px';
  const cs=getComputedStyle($('safe'));SAFE.l=parseFloat(cs.paddingLeft)||0;SAFE.r=parseFloat(cs.paddingRight)||0;SAFE.t=parseFloat(cs.paddingTop)||0;SAFE.b=parseFloat(cs.paddingBottom)||0;
  Z=Math.max(W,H)/1520;
  const b=Math.min(W,H)*0.112;UI.b=b;UI.s=clamp(Math.min(W,H)/400,.8,1.3);
  UI.atk={x:W-SAFE.r-b*1.45,y:H-SAFE.b-b*1.35,r:b};
  const angs=[190,232,275];
  for(let i=0;i<3;i++){const a=angs[i]*Math.PI/180;const B={x:UI.atk.x+Math.cos(a)*b*2.1,y:UI.atk.y+Math.sin(a)*b*2.1,r:b*.64};UI.sk[i]=B;UI.learn[i]={x:B.x-B.r*.78,y:B.y-B.r*.78,r:B.r*.42}}
  UI.joyHome={x:SAFE.l+b*2.1,y:H-SAFE.b-b*2.1};
  UI.cancel={x:UI.atk.x+b*.15,y:UI.atk.y-b*4.3,r:b*.42};
  UI.mute={x:W-SAFE.r-24,y:24};
  LC.width=Math.ceil(W/2);LC.height=Math.ceil(H/2);
}
addEventListener('resize',()=>{resize();if(typeof R3!=='undefined')R3.resize()});resize();

// ===================== WORLD: a fairy-tale valley ringed by mountains (seeded; same on host and clients) =====================
let WD=null,GROUND=null,GROUND2D=null,MINI=null,BND=null,RIV=null;
function bndR(a){let f=a/(Math.PI*2)*720;f=((f%720)+720)%720;const i=Math.floor(f),k=f-i;return BND[i]+(BND[(i+1)%720]-BND[i])*k}
function outsideD(x,y){const dx=x-CX,dy=y-CY;return Math.hypot(dx,dy)-bndR(Math.atan2(dy,dx))}
function riverD(x,y){const R=RIV;if(!R||y<R.y0-160||y>R.y1+40)return 1e5;let i=Math.round((y-R.y0)/R.st);if(i<0)i=0;else if(i>=R.n)i=R.n-1;return(x-R.xs[i])*R.il[i]}
function riverHW(y){const R=RIV;if(!R)return 0;return R.hw0+(R.hw1-R.hw0)*clamp((y-R.y0)/(R.y1-R.y0),0,1)}
function riverX(y){const R=RIV;if(!R)return -1e5;let i=Math.round((y-R.y0)/R.st);i=clamp(i,0,R.n-1);return R.xs[i]}
function lakeD(x,y){const L=WD.lake;const dx=x-L.x,dy=y-L.y;const a=Math.atan2(dy,dx);return Math.hypot(dx,dy)-(L.R+80*Math.sin(2*a+L.p1)+55*Math.sin(3*a+L.p2))}
function poolD(x,y){const P=WD.pool;return Math.hypot(x-P.x,y-P.y)-P.R}
function direK(x,y){const R=RIV;if(!R)return 0;let d;if(y<R.y0)d=x-WD.pool.x;else if(y>R.y1)d=x-WD.lake.x-150;else{d=riverD(x,y);if(y>R.y1-500){const k=(y-(R.y1-500))/500;d=lerp(d,x-WD.lake.x-150,smooth01(k))}}return smooth01(.5+d/700)}
function isDire(x,y){const R=RIV;if(!R)return false;if(y<R.y0)return x>WD.pool.x;if(y>R.y1)return x>WD.lake.x+150;return riverD(x,y)>0}
function onBridge(x,y){for(const br of WD.bridges){const dx=x-br.x,dy=y-br.y;const al=dx*br.ax+dy*br.ay,ac=-dx*br.ay+dy*br.ax;if(Math.abs(al)<br.len/2&&Math.abs(ac)<br.wid/2)return br}return null}
function inWater(x,y){if(onBridge(x,y))return false;return Math.abs(riverD(x,y))<riverHW(y)||lakeD(x,y)<0||poolD(x,y)<0||cityWater(x,y)}
function cliffH(x,y){const g=WD.cg2;if(!g)return 0;const i=Math.floor(x/g.C),j=Math.floor(y/g.C);if(i<0||j<0||i>=g.n||j>=g.n)return 0;let h=0;
  for(const c of g.cells[j*g.n+i]){const dx=x-c.x,dy=y-c.y,d2=dx*dx+dy*dy;if(d2>=c.r*c.r)continue;const d=Math.sqrt(d2)/c.r;const k=d<.5?1:1-smooth01((d-.5)/.5);const v=c.h*k*(.9+.2*WD.nD(x,y));if(v>h)h=v}return h}
function caveK(x,y){let k=0;for(const c of WD.caves){if(Math.abs(x-c.x)>c.R+340||Math.abs(y-c.y)>c.R+340)continue;
  const d=Math.min(Math.hypot(x-c.x,y-c.y)-c.R,segDist({x,y},[c.mx,c.my,c.x,c.y])-c.w);if(d<34){const kk=d<=0?1:1-d/34;if(kk>k)k=kk}}return k}
// ===================== Arena Royale: the Old Town above the waterfall (owner 2026-11-21 · index only, WD.city) =====================
// The valley climbs one step past the waterfall: a cliff CITY_P high runs along the valley's north edge (the edge is one smooth arc
// there), the owner's waterfall pours off it into the pool, and a stairway on each side climbs to a walled old town on the plateau.
// Frame: x,y = the waterfall on the valley's edge, u across (lx,ly), v outward (ox,oy); o = outsideD (distance past the edge).
// Walking: plateau and stair ramps are walkable at their own height (cityBase); the rule elsewhere is unchanged (above 22 = rock).
const CITY_P=210,CITY_OF=60,CITY_SU=640,CITY_SH=105,CITY_SB=-380;
// signed distance to the plateau's sides and back (< 0 inside), rounded back corners
function citySB(C,u,v){const hw=C.hw+C.sw*Math.sin(v*.0026+C.p3),vb=C.dep+110*Math.sin(u*.0019+C.p1)+60*Math.sin(u*.0043+C.p2),R=520,au=Math.abs(u);
  const du=au-(hw-R),dv=v-(vb-R);return du>0&&dv>0?Math.hypot(du,dv)-R:Math.max(au-hw,v-vb)}
// the two stairways (u = ±CITY_SU): 0..1 up a ramp, -2 on a ramp's side wall, -1 elsewhere
function cityStair(u,o){if(o<CITY_SB-10||o>CITY_OF+30)return -1;const du=Math.abs(Math.abs(u)-CITY_SU);
  if(du<=CITY_SH)return clamp((o-CITY_SB)/(CITY_OF+10-CITY_SB),0,1);return du<=CITY_SH+40&&o>CITY_SB+50?-2:-1}
// the town's ground (h0 = the valley / mountain height already there); null where the town changes nothing
function cityH(C,x,y,o,h0){const dx=x-C.x,dy=y-C.y;if(dx*dx+dy*dy>C.R2||o<CITY_SB-60)return null;
  const u=dx*C.lx+dy*C.ly,v=dx*C.ox+dy*C.oy,e=citySB(C,u,v);if(e>1300)return null;
  const s=cityStair(u,o),ramp=CITY_P*clamp((o-CITY_SB)/(CITY_OF+10-CITY_SB),0,1);if(s>=0)return ramp;
  const fr=CITY_P*smooth01((o+50)/(CITY_OF+50));   // the cliff face: 0 at its foot, CITY_P at its top
  if(e<=0){if(o>=CITY_OF){const p=CITY_P+(C.nz(x,y)-.5)*4;return cityPondU(u,v)<18?Math.min(p,cityPondBed(u,v)):p}
    // behind the falls the face is steeper and set back, the channel runs on over the brink; the plunge basin at its foot
    let f=fr;const kl=1-smooth01((Math.abs(u)-CITY_FW/2-10)/70);if(kl>0){f=lerp(fr,CITY_P*smooth01((o+10)/60),kl);if(cityPondU(u,v)<18)f=Math.min(f,cityPondBed(u,v))}
    let r=Math.max(h0,f,s===-2?ramp+50:0);const b=cityBasin(u,v);if(b<0)r=Math.min(r,WL-3-11*smooth01(-b/30));return r}
  // the rim: rock rising from the plateau's edge into the mountains, its spurs running a little way into the valley
  const k=o<-50?smooth01((o+420)/370):1,rim=(o<CITY_OF?fr:CITY_P)*(1-smooth01((e-650)/550))+(560+260*C.nr(x,y))*smooth01(e/320)*(1-smooth01((e-760)/540));
  return Math.max(h0,rim*k)}
// the height a hero walks at here (0 = the valley rule)
function townBase(x,y){const C=WD&&WD.city;if(!C)return 0;const dx=x-C.x,dy=y-C.y;if(dx*dx+dy*dy>C.R2)return 0;
  const u=dx*C.lx+dy*C.ly,v=dx*C.ox+dy*C.oy,o=outsideD(x,y),s=cityStair(u,o);if(s>=0)return CITY_P*s;
  return o>=CITY_OF&&citySB(C,u,v)<=0?CITY_P:0}
// on the town (plateau, stairways or the waterfall's foot), m = extra margin; world gen keeps its scatter out of here
function townIn(x,y,m){const C=WD&&WD.city;if(!C)return false;m=m||0;const dx=x-C.x,dy=y-C.y;if(dx*dx+dy*dy>C.R2)return false;
  const u=dx*C.lx+dy*C.ly,v=dx*C.ox+dy*C.oy,o=outsideD(x,y);
  if(o>=CITY_OF-m-40&&citySB(C,u,v)<=m)return true;
  if(o>CITY_SB-40-m&&o<CITY_OF+40&&Math.abs(Math.abs(u)-CITY_SU)<CITY_SH+40+m)return true;
  return o>-280-m&&o<CITY_OF+40&&Math.abs(u)<240+m}
// how much the ground here is the town's rock (the cliff face, the stairways' side walls, the rim), 0..1, for the terrain shader
function townRock(x,y){const C=WD&&WD.city;if(!C)return 0;const dx=x-C.x,dy=y-C.y;if(dx*dx+dy*dy>C.R2)return 0;
  const u=dx*C.lx+dy*C.ly,v=dx*C.ox+dy*C.oy,o=outsideD(x,y),s=cityStair(u,o);if(s>=0)return 0;if(s===-2)return 1;const e=citySB(C,u,v);
  if(e<=0)return o<CITY_OF+5&&o>-70?smooth01((o+70)/40)*(1-smooth01((o-CITY_OF+5)/10)):0;return smooth01(e/60)*(o>-420?1:0)}
// the stairways and the waterfall's foot only (rocks may line the rest of the cliff's foot)
function townPath(x,y,m){const C=WD&&WD.city;if(!C)return false;m=m||0;const dx=x-C.x,dy=y-C.y;if(dx*dx+dy*dy>C.R2)return false;
  const u=dx*C.lx+dy*C.ly,o=outsideD(x,y);if(o>CITY_SB-40-m&&o<CITY_OF+40&&Math.abs(Math.abs(u)-CITY_SU)<CITY_SH+40+m)return true;return o>-280-m&&o<CITY_OF+40&&Math.abs(u)<240+m}
// town frame -> world
function cityXY(C,u,v){return{x:C.x+u*C.lx+v*C.ox,y:C.y+u*C.ly+v*C.oy}}
// Arena Royale (owner 2026-11-22): the Snow Queen's castle on a plateau one step up out of the Frozen Sanctuary, east of the Old
// Town; one wide stairway climbs to it from the valley. Fort frame like the town's (u along the cliff, v out of the valley, cityXY
// works on it). The castle stands at the back (FORT_VC), the queen's court in front of it (FORT_VA). arena-frost.js draws it,
// snow-queen.js is the boss.
const FORT_P=240,FORT_OF=60,FORT_SH=150,FORT_SB=-430,FORT_VA=640,FORT_VC=1380,FORT_CW=900,FORT_CD=560;
// signed distance to the plateau's sides and back (< 0 inside), rounded back corners
function fortSB(F,u,v){const hw=F.hw+F.sw*Math.sin(v*.003+F.p3),vb=F.dep+90*Math.sin(u*.0021+F.p1),R=420,au=Math.abs(u);
  const du=au-(hw-R),dv=v-(vb-R);return du>0&&dv>0?Math.hypot(du,dv)-R:Math.max(au-hw,v-vb)}
// the stairway (u = 0): 0..1 up its ramp, -2 on its side walls, -1 elsewhere
function fortStair(u,o){if(o<FORT_SB-10||o>FORT_OF+30)return -1;const du=Math.abs(u);
  if(du<=FORT_SH)return clamp((o-FORT_SB)/(FORT_OF+10-FORT_SB),0,1);return du<=FORT_SH+40&&o>FORT_SB+50?-2:-1}
// the fort's ground (h0 = what is already there: the valley, the mountains, the Old Town's rim); null where it changes nothing
function fortH(F,x,y,o,h0){const dx=x-F.x,dy=y-F.y;if(dx*dx+dy*dy>F.R2||o<FORT_SB-60)return null;
  const u=dx*F.lx+dy*F.ly,v=dx*F.ox+dy*F.oy,e=fortSB(F,u,v);if(e>1100)return null;
  // Grade the shoulders under the rails too. The surrounding 50-unit terrain cells
  // then meet the steps without cutting through their treads.
  if(Math.abs(u)<=FORT_SH+80&&v>=FORT_SB-70&&v<=FORT_OF+80)
    return FORT_P*clamp((v-FORT_SB)/(FORT_OF+10-FORT_SB),0,1);
  const fr=FORT_P*smooth01((o+50)/(FORT_OF+50));
  if(e<=0){if(o>=FORT_OF)return FORT_P+(F.nz(x,y)-.5)*5;return Math.max(h0,fr)}
  const k=o<-50?smooth01((o+420)/370):1,rim=(o<FORT_OF?fr:FORT_P)*(1-smooth01((e-600)/500))+(620+300*F.nr(x,y))*smooth01(e/300)*(1-smooth01((e-700)/400));
  return Math.max(h0,rim*k)}
const fortUV=(F,x,y)=>{const dx=x-F.x,dy=y-F.y;return dx*dx+dy*dy>F.R2?null:[dx*F.lx+dy*F.ly,dx*F.ox+dy*F.oy]};
function fortBase(x,y){const F=WD&&WD.fort;if(!F)return 0;const q=fortUV(F,x,y);if(!q)return 0;const o=outsideD(x,y),s=fortStair(q[0],o);if(s>=0)return FORT_P*s;
  return o>=FORT_OF&&fortSB(F,q[0],q[1])<=0?FORT_P:0}
function fortIn(x,y,m){const F=WD&&WD.fort;if(!F)return false;m=m||0;const q=fortUV(F,x,y);if(!q)return false;const o=outsideD(x,y);
  if(o>=FORT_OF-m-40&&fortSB(F,q[0],q[1])<=m)return true;return o>FORT_SB-40-m&&o<FORT_OF+40&&Math.abs(q[0])<FORT_SH+40+m}
function fortRock(x,y){const F=WD&&WD.fort;if(!F)return 0;const q=fortUV(F,x,y);if(!q)return 0;const o=outsideD(x,y),s=fortStair(q[0],o);if(s>=0)return 0;if(s===-2)return 1;
  const e=fortSB(F,q[0],q[1]);if(e<=0)return o<FORT_OF+5&&o>-70?smooth01((o+70)/40)*(1-smooth01((o-FORT_OF+5)/10)):0;return smooth01(e/60)*(o>-420?1:0)}
function fortPath(x,y,m){const F=WD&&WD.fort;if(!F)return false;m=m||0;const q=fortUV(F,x,y);if(!q)return false;const o=outsideD(x,y);
  return o>FORT_SB-40-m&&o<FORT_OF+40&&Math.abs(q[0])<FORT_SH+40+m}
// the raised places (the Old Town, the Snow Queen's fort): the walking height, on it (world gen keeps its scatter off), rock, paths
function cityBase(x,y){return townBase(x,y)||fortBase(x,y)}
function cityIn(x,y,m){return townIn(x,y,m)||fortIn(x,y,m)}
function cityRock(x,y){return Math.max(townRock(x,y),fortRock(x,y))}
function cityPath(x,y,m){return townPath(x,y,m)||fortPath(x,y,m)}
// the falls (owner 2026-11-21, round 2): a spring pool on the plateau feeds a channel to the brink (CITY_FB, CITY_FW wide); the water
// leaves the brink at the pool's level CITY_PW, falls in a parabola clear of a recessed rock face and lands in a plunge basin that
// joins the valley's pool. Town frame (u along the cliff, v out of the valley). arena-falls.js draws it from these.
const CITY_PW=CITY_P-5,CITY_PV=215,CITY_PRU=230,CITY_PRV=140,CITY_FW=190,CITY_FB=44;
// the spring pool and its channel to the brink, < 0 on the water
function cityPondU(u,v){const e=(Math.hypot(u/CITY_PRU,(v-CITY_PV)/CITY_PRV)-1)*CITY_PRV,ch=Math.max(Math.abs(u)-CITY_FW/2,CITY_FB-v,v-CITY_PV);return Math.min(e,ch)}
// its bed: shelving banks round the pool, a flat-bottomed channel running on over the brink (the cliff takes over as it drops)
function cityPondBed(u,v){const e=(Math.hypot(u/CITY_PRU,(v-CITY_PV)/CITY_PRV)-1)*CITY_PRV,cs=Math.abs(u)-CITY_FW/2;
  const bank=CITY_PW+3-15*smooth01((12-e)/70);return v>CITY_FB-30&&v<CITY_PV?Math.min(bank,CITY_PW-6+9*smooth01((cs+14)/14)):bank}
// the plunge basin at the cliff's foot under the falls, < 0 inside
function cityBasin(u,v){return (Math.hypot(u/(CITY_FW/2+70),(v+40)/55)-1)*55}
// on the town's water (the spring pool, its channel, the plunge basin): heroes wade there, nothing grows
function cityWater(x,y){const C=WD&&WD.city;if(!C)return false;const dx=x-C.x,dy=y-C.y;if(dx*dx+dy*dy>C.R2)return false;
  const u=dx*C.lx+dy*C.ly,v=dx*C.ox+dy*C.oy;return cityPondU(u,v)<-4||cityBasin(u,v)<-8}
function terrH(x,y,noCave){
  let h=0;const o=outsideD(x,y);
  if(o>-90){const k=clamp((o+90)/1750,0,1);h=Math.pow(k,1.25)*(1050+950*WD.nM(x,y))+(o>0?Math.min(1,o/350)*230*(1-Math.abs(2*WD.nR(x,y)-1)):0)}
  const Cy=WD.city,F=Cy?null:WD.wf;if(F){const dx=x-F.x,dy=y-F.y;const lat=Math.abs(-dx*F.ny+dy*F.nx),out=-(dx*F.nx+dy*F.ny);
    if(lat<320&&out>-70&&out<420){const lk=1-smooth01((lat-160)/160);const v=lk*(330*smooth01((out+45)/60))+lk*Math.max(0,out-20)*.5;if(v>h)h=v}}
  const ch=cliffH(x,y);if(ch>h)h=ch;
  if(Cy){const c=cityH(Cy,x,y,o,h);if(c!==null)h=c}
  const Fo=WD.fort;if(Fo){const c=fortH(Fo,x,y,o,h);if(c!==null)h=c}
  if(!noCave){const ck=caveK(x,y);if(ck>0)h*=1-ck}
  const D=WD.dg;if(D){const ex=Math.max(D.x-x,x-(D.x+D.w),0),ey=Math.max(D.y-y,y-(D.y+D.h),0),dd=Math.hypot(ex,ey);if(dd<=0)return 0;if(dd<1100){const k=smooth01(dd/1100);h=Math.max(190,lerp(190,h,k))}}
  if(h<60){const rd=Math.abs(riverD(x,y));if(rd<400){const hw=riverHW(y);if(rd<hw+34){const bed=-14*smooth01((hw+30-rd)/70)-6*smooth01((hw-40-rd)/Math.max(30,hw-40))-(MOON?0:12*smooth01((hw-80-rd)/Math.max(40,hw-80)));if(bed<h)h=bed}}
    const ld=lakeD(x,y);if(ld<50){const bed=ld>0?-6*smooth01((50-ld)/50):-6-10*smooth01(-ld/150)-26*smooth01((-ld-130)/180);if(bed<h)h=bed}
    const pd=poolD(x,y);if(pd<40){const bed=pd>0?-6*smooth01((40-pd)/40):-6-9*smooth01(-pd/70)-20*smooth01((-pd-60)/60);if(bed<h)h=bed}}
  return h}
// terrain grid: heights, walk-blocked mask, solid mask (blocks projectiles) and a signed distance field for collision
function edt1(f,d,v,z,n){let k=0;v[0]=0;z[0]=-1e20;z[1]=1e20;
  for(let q=1;q<n;q++){let s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*q-2*v[k]);while(s<=z[k]){k--;s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*q-2*v[k])}k++;v[k]=q;z[k]=s;z[k+1]=1e20}
  k=0;for(let q=0;q<n;q++){while(z[k+1]<q)k++;d[q]=(q-v[k])*(q-v[k])+f[v[k]]}}
function edt2(g,n){const f=new Float64Array(n),d=new Float64Array(n),v=new Int32Array(n),z=new Float64Array(n+1);
  for(let x=0;x<n;x++){for(let y=0;y<n;y++)f[y]=g[y*n+x];edt1(f,d,v,z,n);for(let y=0;y<n;y++)g[y*n+x]=d[y]}
  for(let y=0;y<n;y++){const o=y*n;for(let x=0;x<n;x++)f[x]=g[o+x];edt1(f,d,v,z,n);for(let x=0;x<n;x++)g[o+x]=d[x]}}
function buildTerrain(w){const C=25,n=Math.round(WORLD/C),N=n*n;const hg=new Float32Array(N),blk=new Uint8Array(N),sol=new Uint8Array(N);
  for(let j=0;j<n;j++){const y=(j+.5)*C;for(let i=0;i<n;i++){const x=(i+.5)*C,k=j*n+i;const h=terrH(x,y);hg[k]=h;const s=h>(w.city?cityBase(x,y):0)+22;sol[k]=s?1:0;blk[k]=(s||(h<-12&&(lakeD(x,y)<-150||poolD(x,y)<-70)))?1:0}}
  const a=new Float64Array(N),b=new Float64Array(N);for(let k=0;k<N;k++){a[k]=blk[k]?0:1e20;b[k]=blk[k]?1e20:0}
  edt2(a,n);edt2(b,n);const sdf=new Float32Array(N);for(let k=0;k<N;k++)sdf[k]=blk[k]?-(Math.sqrt(b[k])-.5)*C:(Math.sqrt(a[k])-.5)*C;
  w.tg={C,n,hg,blk,sol,sdf}}
function gridS(arr,x,y,out){const g=WD.tg,n=g.n;const fx=x/g.C-.5,fy=y/g.C-.5;let i=Math.floor(fx),j=Math.floor(fy);if(i<0||j<0||i>=n-1||j>=n-1)return out;
  const tx=fx-i,ty=fy-j,k=j*n+i;const a=arr[k],b=arr[k+1],c=arr[k+n],d=arr[k+n+1];return a+(b-a)*tx+(c-a)*ty+(a-b-c+d)*tx*ty}
const sdfAt=(x,y)=>gridS(WD.tg.sdf,x,y,-400);
function heightAt(x,y){const g=WD.tg;if(x<0||y<0||x>WORLD||y>WORLD)return terrH(x,y);return gridS(g.hg,x,y,0)}
function solidAt(x,y){const g=WD.tg;const i=Math.floor(x/g.C),j=Math.floor(y/g.C);if(i<0||j<0||i>=g.n||j>=g.n)return true;return g.sol[j*g.n+i]===1}
function walkable(x,y,m){return sdfAt(x,y)>(m||0)}

// Arena Royale (index): one house model per land, the owner's (2026-11-20; REG lands: kingdom, cursed, frost, ash, abyss).
// moonfall-village.js stretches the model over the picked footprint + 56 with its door turned to the doorway; the house's walls,
// doorway, loot and chests then follow the model's own walls ("body": where the walls sit in the model's box, from cross-sections
// at 15-30% of its height, x0,x1,z0,z1 as fractions of the box) and its door (middle of the door along the front, fraction of the
// width; the door faces +z). The picked footprint stays as h.al, so spacing, trees, grass and spawn spots keep clear of the
// whole model (eaves, porch, dead trees). Pure function of the footprint, door side and REG (fixed seeds): same on every machine.
const HOUSEFIT={land:['house-timber','house-candle','house-timber','house-timber','house-potion'],
  'house-timber':{body:[-.441,.421,-.387,.346],door:-.178},'house-candle':{body:[-.261,.301,-.433,.221],door:.02},'house-potion':{body:[-.36,.35,-.382,.302],door:.003}};
const HOUSE_WANT={r:0,b:Math.PI/2,l:Math.PI,t:-Math.PI/2};
function houseFit(h,side){if(typeof REG==='undefined'||!REG.at)return null;
  const cx=h.x+h.w/2,cy=h.y+h.h/2,key=HOUSEFIT.land[REG.at(cx,cy)]||HOUSEFIT.land[0],F=HOUSEFIT[key],b=F.body;
  const rot=Math.PI/2-HOUSE_WANT[side],sw=Math.abs(Math.sin(rot))>.5,sx=(sw?h.h:h.w)+56,sz=(sw?h.w:h.h)+56;   // what model x and z are stretched over
  const bw=(b[1]-b[0])*sx,bd=(b[3]-b[2])*sz,W=Math.round(sw?bd:bw),H=Math.round(sw?bw:bd);
  const off=(F.door-(b[0]+b[1])/2)*sx;   // the door's offset from the middle of the walls along the front (model +x), turned like the model
  return {key,x:Math.round(cx-W/2),y:Math.round(cy-H/2),w:W,h:H,dl:side==='b'||side==='l'?off:-off}}

function genWorld(seed){
  SR=mulberry32(seed);
  const w={seed,houses:[],walls:[],trees:[],mtrees:[],rocks:[],solids:[],bushes:[],caves:[],lanterns:[],mush:[],crystals:[],grass:[],flowers:[],villages:[],items:[],mobs:[],camps:[],paths:[],
    wells:[],bridges:[],shrines:[],props:[],boxes:[],cliffs:[],windmills:[],fountains:[],stalls:[],fields:[],fences:[],hay:[],logs:[],reeds:[],lilies:[],spawns:[],banners:[],tgrass:[],graves:[],castle:null,lake:null,pool:null,wf:null,cg2:null};
  WD=w;let iid=1000,mid=100;
  const N1=makeNoise(SR,720),N2=makeNoise(SR,280);w.noise=(x,y)=>.62*N1(x,y)+.38*N2(x,y);
  w.nM=makeNoise(SR,1500);w.nR=makeNoise(SR,430);w.nD=makeNoise(SR,140);
  // ---- valley boundary ----
  const bp=[sr(0,6.3),sr(0,6.3),sr(0,6.3),sr(0,6.3)];BND=new Float32Array(720);
  for(let i=0;i<720;i++){const a=i/720*Math.PI*2;BND[i]=8100+400*Math.sin(3*a+bp[0])+260*Math.sin(5*a+bp[1])+140*Math.sin(9*a+bp[2])+60*Math.sin(14*a+bp[3])}
  // ---- waterfall pool, river and lake ----
  const aw=-Math.PI/2+sr(-.22,.22),rbw=bndR(aw);const Pb={x:CX+Math.cos(aw)*rbw,y:CY+Math.sin(aw)*rbw};const inw={x:-Math.cos(aw),y:-Math.sin(aw)};
  w.wf={x:Pb.x,y:Pb.y,a:aw,nx:inw.x,ny:inw.y};w.pool={x:Pb.x+inw.x*175,y:Pb.y+inw.y*175,R:150};
  // Arena Royale (owner 2026-11-21): the Old Town above the waterfall. The valley's edge becomes one smooth arc across the town's front
  if(ARX){for(let i=0;i<720;i++){const a=i/720*Math.PI*2,da=Math.abs(Math.atan2(Math.sin(a-aw),Math.cos(a-aw))),k=1-smooth01((da-.26)/.14);if(k>0)BND[i]=lerp(BND[i],rbw,k)}
    const ox=Math.cos(aw),oy=Math.sin(aw);
    w.city={x:Pb.x,y:Pb.y,a:aw,ox,oy,lx:-oy,ly:ox,rb:rbw,hw:sr(1780,1920),dep:sr(1800,1960),sw:sr(40,90),p1:sr(0,6.3),p2:sr(0,6.3),p3:sr(0,6.3),
      nz:makeNoise(SR,340),nr:makeNoise(SR,520),R2:4700*4700,props:[],lamps:[],paint:[],name:'นครเก่าเหนือน้ำตก'};
    // the Snow Queen's fort (owner 2026-11-22): a step up out of the Frozen Sanctuary 29-32 degrees east of the town (its rim has faded
    // out by then), the valley's edge one smooth arc across its front too
    const af=aw+sr(.5,.55),rf0=bndR(af);for(let i=0;i<720;i++){const a=i/720*Math.PI*2,da=Math.abs(Math.atan2(Math.sin(a-af),Math.cos(a-af))),k=1-smooth01((da-.17)/.1);if(k>0)BND[i]=lerp(BND[i],rf0,k)}
    const rf=bndR(af),fx=Math.cos(af),fy=Math.sin(af);
    w.fort={x:CX+fx*rf,y:CY+fy*rf,a:af,ox:fx,oy:fy,lx:-fy,ly:fx,rb:rf,hw:sr(900,980),dep:sr(1790,1900),sw:sr(30,60),p1:sr(0,6.3),p3:sr(0,6.3),
      nz:makeNoise(SR,300),nr:makeNoise(SR,480),R2:3700*3700,props:[],crystals:[],braziers:[],paint:[],name:'ปราสาทราชินีหิมะ'}}
  const Lk={x:CX+sr(-1895,-700),y:CY+sr(3500,4400),R:sr(740,840),p1:sr(0,6.3),p2:sr(0,6.3)};w.lake=Lk;
  {const P0=w.pool,y0=P0.y,y1=Lk.y,st=4,n=Math.ceil((y1-y0)/st)+1;const xs=new Float32Array(n),il=new Float32Array(n);
    const A1=sr(540,700),A2=sr(140,210),f1=sr(1.7,2.4),f2=sr(3.6,4.8),q1=sr(0,6.3),q2=sr(0,6.3);
    for(let i=0;i<n;i++){const t=i/(n-1);const tp=smooth01(t/.13)*smooth01((1-t)/.16);xs[i]=lerp(P0.x,Lk.x,t)+(A1*Math.sin(2*Math.PI*t*f1+q1)+A2*Math.sin(2*Math.PI*t*f2+q2))*tp}
    for(let i=0;i<n;i++){const a=xs[Math.max(0,i-1)],b=xs[Math.min(n-1,i+1)];const s=(b-a)/((Math.min(n-1,i+1)-Math.max(0,i-1))*st);il[i]=1/Math.sqrt(1+s*s)}
    RIV={y0,y1,st,n,xs,il,hw0:MOON?88:150,hw1:MOON?138:226}}   // Arena Royale: a wider river (owner 2026-11-18)
  w.river=[];for(let y=RIV.y0;y<=RIV.y1;y+=40){const i=clamp(Math.round((y-RIV.y0)/RIV.st),0,RIV.n-1);const a=RIV.xs[Math.max(0,i-10)],b=RIV.xs[Math.min(RIV.n-1,i+10)];const s=(b-a)/80,L=Math.sqrt(1+s*s);w.river.push({x:RIV.xs[i],y,nx:1/L,ny:-s/L,hw:riverHW(y)})}
  // ---- secret caves dug into the mountain walls (never on the camera-facing south side) ----
  const wfCave=false,nCave=0,caveAng=[];
  for(let t=0;t<1500&&caveAng.length<nCave;t++){const a=sr(-Math.PI,Math.PI);if(a>.62&&a<2.52)continue;if(caveAng.some(b=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))<(t<800?.66:.5)))continue;if(!wfCave&&Math.abs(Math.atan2(Math.sin(a-aw),Math.cos(a-aw)))<.35)continue;caveAng.push(a)}
  caveAng.forEach((a,ci)=>{const rb=bndR(a),dx=Math.cos(a),dy=Math.sin(a);const isWf=wfCave&&ci===0;const c={id:ci,x:CX+dx*(rb+235),y:CY+dy*(rb+235),R:205,w:62,roofA:1,dire:false,wf:isWf};
    const m=isWf?{x:w.pool.x+Math.cos(aw+Math.PI/2)*120,y:w.pool.y+Math.sin(aw+Math.PI/2)*120}:{x:CX+dx*(rb-60),y:CY+dy*(rb-60)};c.mx=m.x;c.my=m.y;
    c.gap=Math.atan2(m.y-c.y,m.x-c.x);c.mouth={x:c.x+Math.cos(c.gap)*(c.R-30),y:c.y+Math.sin(c.gap)*(c.R-30)};w.caves.push(c)});
  // ---- castle (dragon lair) on the east bank ----
  for(let t=0;t<2400&&!w.castle;t++){const a=t<1400?sr(-1.35,-.2):sr(-1.6,.35),r=sr(2700,5200);const K={x:CX+Math.cos(a)*r,y:CY+Math.sin(a)*r};const cw=1340,chh=1080;
    const R={x:K.x-cw/2,y:K.y-chh/2,w:cw,h:chh};const cs=[[R.x,R.y],[R.x+cw,R.y],[R.x,R.y+chh],[R.x+cw,R.y+chh],[K.x,K.y]];
    if(cs.some(q=>outsideD(q[0],q[1])>-320))continue;if(cs.some(q=>riverD(q[0],q[1])<riverHW(q[1])+260))continue;if(Math.hypot(K.x-w.pool.x,K.y-w.pool.y)<1500)continue;if(w.caves.some(c=>Math.hypot(c.mx-K.x,c.my-K.y)<1100))continue;
    w.castle=Object.assign(R,{cx:K.x,cy:K.y})}
  if(!w.castle){const K={x:CX+2200,y:CY-2000};w.castle={x:K.x-670,y:K.y-540,w:1340,h:1080,cx:K.x,cy:K.y}}
  const CS=w.castle;
  {const T=40,G=170,x=CS.x,y=CS.y,cw=CS.w,ch=CS.h;const toC={x:CX-CS.cx,y:CY-CS.cy};
    const side=Math.abs(toC.x)*.8>Math.abs(toC.y)?(toC.x>0?'r':'l'):(toC.y>0?'b':'t');CS.side=side;
    const sides={t:[x,y,cw,T],b:[x,y+ch-T,cw,T],l:[x,y,T,ch],r:[x+cw-T,y,T,ch]};
    for(const s of['t','b','l','r']){const [qx,qy,qw,qh]=sides[s];
      if(s!==side){w.walls.push({x:qx,y:qy,w:qw,h:qh,castle:1});continue}
      if(s==='t'||s==='b'){const m=qx+qw/2;w.walls.push({x:qx,y:qy,w:m-G/2-qx,h:qh,castle:1},{x:m+G/2,y:qy,w:qx+qw-(m+G/2),h:qh,castle:1});CS.gate={x:m,y:qy+qh/2}}
      else{const m=qy+qh/2;w.walls.push({x:qx,y:qy,w:qw,h:m-G/2-qy,castle:1},{x:qx,y:m+G/2,w:qw,h:qy+qh-(m+G/2),castle:1});CS.gate={x:qx+qw/2,y:m}}}
    const nx=side==='r'?1:side==='l'?-1:0,ny=side==='b'?1:side==='t'?-1:0;CS.gn={x:nx,y:ny};CS.out={x:CS.gate.x+nx*120,y:CS.gate.y+ny*120};
    CS.towers=[[x,y],[x+cw,y],[x,y+ch],[x+cw,y+ch]].map(q=>({x:q[0],y:q[1],r:74,h:300}));
    const gp={x:-ny,y:nx};CS.gtowers=[1,-1].map(s=>({x:CS.gate.x+gp.x*s*(G/2+28),y:CS.gate.y+gp.y*s*(G/2+28),r:44,h:230}));
    for(const t of[...CS.towers,...CS.gtowers])w.solids.push({x:t.x,y:t.y,r:t.r,t:'tower'});
    // keep against the back wall
    const kw=440,kd=250;let K;if(side==='b')K={x:CS.cx-kw/2,y:y+T,w:kw,h:kd};else if(side==='t')K={x:CS.cx-kw/2,y:y+ch-T-kd,w:kw,h:kd};else if(side==='r')K={x:x+T,y:CS.cy-kw/2,w:kd,h:kw};else K={x:x+cw-T-kd,y:CS.cy-kw/2,w:kd,h:kw};
    CS.keep=K;w.walls.push({x:K.x,y:K.y,w:K.w,h:K.h,castle:2});
    const kcx=K.x+K.w/2,kcy=K.y+K.h/2;CS.lair={x:lerp(kcx,CS.gate.x,.5),y:lerp(kcy,CS.gate.y,.5)};
    // inner walls split the yard into a central hall (dragon) and two wings (treasury, barracks); local a = across the gate, b = depth from the gate
    const LH=side==='t'||side==='b'?cw/2:ch/2,DP=side==='t'||side==='b'?ch:cw;CS.LH=LH;CS.DP=DP;
    const loc=(a,b)=>side==='b'?{x:CS.cx+a,y:y+ch-b}:side==='t'?{x:CS.cx+a,y:y+b}:side==='r'?{x:x+cw-b,y:CS.cy+a}:{x:x+b,y:CS.cy+a};CS.loc=loc;
    const seg=(a,b0,b1)=>{const p=loc(a,b0),q=loc(a,b1);w.walls.push({x:Math.min(p.x,q.x)-(p.x===q.x?20:0),y:Math.min(p.y,q.y)-(p.y===q.y?20:0),w:Math.abs(q.x-p.x)||40,h:Math.abs(q.y-p.y)||40,castle:1})};
    for(const s2 of[-1,1]){const a=s2*LH*.36;seg(a,DP*.14,DP*.3-85);seg(a,DP*.3+85,DP*.56-85);seg(a,DP*.56+85,DP-T-kd-30)}
    CS.wings=[-1,1].map(s2=>({a0:s2*LH*.36,a1:s2*(LH-T),b0:T+30,b1:DP-T-30}));
    for(const s2 of[-1,1])for(const f of[.25,.5,.75]){const p=loc(s2*LH*.68,DP*f);w.lanterns.push({x:p.x,y:p.y,torch:1})}
    for(let k=0;k<6;k++){const a=k/6*Math.PI*2;w.lanterns.push({x:CS.lair.x+Math.cos(a)*230,y:CS.lair.y+Math.sin(a)*190,torch:1,dire:true})}
    w.lanterns.push({x:CS.out.x+gp.x*110,y:CS.out.y+gp.y*110,torch:1},{x:CS.out.x-gp.x*110,y:CS.out.y-gp.y*110,torch:1});
    const bossId=mid++;w.mobs.push({id:bossId,x:CS.lair.x,y:CS.lair.y,kind:'boss',camp:w.camps.length});w.camps.push({id:w.camps.length,x:CS.lair.x,y:CS.lair.y,tier:'boss',mem:[bossId],maxRespawn:1})}
  // ---- underground dungeon: a walled 3x3 warren of rooms cut into the far north-west mountains, reached through portal stairs ----
  {const D={x:450,y:450,w:3000,h:2400,cols:3,rows:3,T:44,rooms:[],ports:[],ents:[],pillars:[]};w.dg=D;const cw=D.w/D.cols,ch=D.h/D.rows,T=D.T,G=230;
    const W=(x,y,ww,hh)=>{if(ww>4&&hh>4)w.walls.push({x,y,w:ww,h:hh,castle:3})};
    W(D.x,D.y,D.w,T);W(D.x,D.y+D.h-T,D.w,T);W(D.x,D.y,T,D.h);W(D.x+D.w-T,D.y,T,D.h);
    for(let c=1;c<D.cols;c++){const x=D.x+c*cw-T/2;for(let r=0;r<D.rows;r++){const y0=D.y+r*ch,y1=y0+ch;const m=lerp(y0+G/2+110,y1-G/2-110,SR());W(x,y0,T,m-G/2-y0);W(x,m+G/2,T,y1-(m+G/2))}}
    for(let r=1;r<D.rows;r++){const y=D.y+r*ch-T/2;for(let c=0;c<D.cols;c++){const x0=D.x+c*cw,x1=x0+cw;const m=lerp(x0+G/2+130,x1-G/2-130,SR());W(x0,y,m-G/2-x0,T);W(m+G/2,y,x1-(m+G/2),T)}}
    const roles=['dgA','vault','dgB','dgC','dgD','dgA','dgB','entry','dgC'];
    for(let r=0;r<D.rows;r++)for(let c=0;c<D.cols;c++){const R={x:D.x+c*cw,y:D.y+r*ch,w:cw,h:ch,cx:D.x+(c+.5)*cw,cy:D.y+(r+.5)*ch,role:roles[r*D.cols+c],id:D.rooms.length};D.rooms.push(R);
      for(const [fx,fy] of[[-.3,-.28],[.3,-.28],[-.3,.28],[.3,.28]]){if(R.role==='entry'&&fy>0)continue;const p={x:R.cx+fx*cw,y:R.cy+fy*ch,r:34};D.pillars.push(p);w.solids.push({x:p.x,y:p.y,r:p.r,t:'pillar'})}
      for(const [fx,fy] of[[-.44,0],[.44,0],[0,-.43]])w.lanterns.push({x:R.cx+fx*cw,y:R.cy+fy*ch,torch:1});
      for(const [fx,fy] of[[-.42,-.4],[.42,.4],[.42,-.4]]){if(SR()<.35)continue;const p={x:R.cx+fx*cw,y:R.cy+fy*ch,t:SR()<.5?'barrel':'crate'};w.props.push(p);w.rocks.push({x:p.x,y:p.y,r:15,prop:1})}}
    const E=D.rooms.find(q=>q.role==='entry');D.arrive={x:E.cx,y:E.cy-40};D.entry=E}
  // ---- outcrops (rocky hills) ----
  const nearPOI=(p,m)=>Math.hypot(p.x-CS.cx,p.y-CS.cy)<500+m||poolD(p.x,p.y)<m+200||lakeD(p.x,p.y)<m||Math.abs(riverD(p.x,p.y))<riverHW(p.y)+m||w.caves.some(c=>Math.hypot(c.mx-p.x,c.my-p.y)<m+250);
  // ---- villages ----
  const specs=[
    {key:'town',name:'เมืองน้ำพุ',side:-1,r:720,n:9,style:'tudor',plaza:1,main:1,a:Math.PI+sr(-.4,.4),d:sr(1800,3000)},
    {key:'farm',name:'ฟาร์มกังหันลม',side:-1,r:430,n:5,style:'tudor',a:-Math.PI*.72+sr(-.3,.3),d:sr(4400,5400)},
    {key:'lake',name:'หมู่บ้านริมทะเลสาบ',side:-1,r:420,n:5,style:'lake',near:'lake'},
    {key:'witch',name:'หมู่บ้านแม่มด',side:1,r:430,n:5,style:'witch',a:sr(-.1,.45),d:sr(3400,4800)},
    {key:'wood',name:'ค่ายคนตัดไม้',side:1,r:380,n:4,style:'cabin',a:sr(.75,1.2),d:sr(4600,5800)},
    {key:'south',name:'หมู่บ้านปลายหุบ',side:0,r:430,n:5,style:'stone',a:Math.PI/2+sr(-.25,.15),d:sr(5600,6300)},
    {key:'hill',name:'หมู่บ้านเนินดอกไม้',side:-1,r:420,n:5,style:'tudor',a:-Math.PI*.4+sr(-.3,.3),d:sr(3700,5200)},
    {key:'pine',name:'หมู่บ้านสนเขา',side:1,r:400,n:5,style:'cabin',a:-Math.PI*.15+sr(-.3,.3),d:sr(5400,6500)},
    {key:'moon',name:'หมู่บ้านจันทร์เสี้ยว',side:1,r:420,n:5,style:'witch',a:Math.PI*.42+sr(-.3,.3),d:sr(2400,3800)},
    {key:'mist',name:'หมู่บ้านหุบหมอก',side:1,r:420,n:5,style:'witch',a:-Math.PI*.55+sr(-.3,.3),d:sr(4200,5600)},
    {key:'red',name:'หมู่บ้านผาแดง',side:-1,r:420,n:5,style:'stone',a:Math.PI*.8+sr(-.3,.3),d:sr(4500,6000)},
    {key:'fish',name:'หมู่บ้านชาวประมง',side:1,r:400,n:5,style:'lake',a:Math.PI*.62+sr(-.3,.3),d:sr(3200,4600)},
    {key:'hunt',name:'ค่ายนักล่า',side:1,r:380,n:4,style:'cabin',a:sr(-.9,-.4),d:sr(5200,6400)},
    {key:'bloom',name:'หมู่บ้านทุ่งดอกไม้',side:-1,r:420,n:5,style:'tudor',a:-Math.PI*.95+sr(-.3,.3),d:sr(3800,5400)},
    {key:'grave',name:'หมู่บ้านร้าง',side:0,r:400,n:4,style:'stone',a:Math.PI*.28+sr(-.3,.3),d:sr(5000,6400)}];
  for(const s of specs){let V=null;if(CURSED){s.r=Math.round(s.r*1.5);s.n=Math.round(s.n*1.8)}
    for(let t=0;t<1500&&!V;t++){let p;const j=Math.min(1,t/300);if(t===900&&s.r>400){s.r=Math.round(s.r*.82);s.n=Math.max(4,s.n-1)}
      if(s.near==='lake'&&t<700){const a=Math.PI*sr(.55,1.35);const d=Lk.R+s.r+sr(200,420)+j*300;p={x:Lk.x+Math.cos(a)*d,y:Lk.y+Math.sin(a)*d}}
      else if(t<600){const a=s.a+sr(-.5,.5)*j,d=s.d*(1+sr(-.25,.25)*j);p={x:CX+Math.cos(a)*d,y:CY+Math.sin(a)*d}}
      else{const a=sr(0,6.283),d=sr(1000,6600);p={x:CX+Math.cos(a)*d,y:CY+Math.sin(a)*d}}
      if(outsideD(p.x,p.y)>-(s.r+380))continue;const rd=riverD(p.x,p.y);if(Math.abs(rd)<riverHW(p.y)+s.r+140)continue;if(s.side&&t<1100&&Math.sign(rd)!==s.side&&Math.abs(rd)<1e4)continue;
      if(lakeD(p.x,p.y)<s.r+(s.near==='lake'?120:260))continue;if(poolD(p.x,p.y)<s.r+400)continue;
      if(p.x>CS.x-s.r-380&&p.x<CS.x+CS.w+s.r+380&&p.y>CS.y-s.r-380&&p.y<CS.y+CS.h+s.r+380)continue;
      if(w.villages.some(v=>dist(v,p)<v.r+s.r+520))continue;if(w.caves.some(c=>Math.hypot(c.mx-p.x,c.my-p.y)<s.r+420))continue;
      V=Object.assign({x:p.x,y:p.y},s)}
    if(V){V.dire=isDire(V.x,V.y);V.id=w.villages.length;w.villages.push(V)}}
  const ROOF={tudor:['#a8462e','#8a3a2a','#3e5f8a','#9a6a32','#6e4a2a','#a85a3a'],lake:['#3a6a8a','#2e5a7a','#4a7a9a'],witch:['#4a2f6e','#3a2a54','#5e2a4a','#2e3a5a'],cabin:['#5a4a32','#6a5236','#4a3a26'],stone:['#6a4a3a','#7a5a4a','#4a5a6a']};
  // one house: walls with a doorway on the side facing its street, loot, chests and crates (villages and the Old Town)
  const addHouse=(h,side,V,vi)=>{
    h.side=side;h.dire=V.dire;h.v=vi;h.style=V.style;const pal=ROOF[V.style];h.roof=pal[Math.floor(SR()*pal.length)];h.roofA=1;h.id=w.houses.length;h.seed=Math.floor(SR()*1e6);
    if(CURSED&&!MOON){const f=houseFit(h,side);if(f){h.al={x:h.x,y:h.y,w:h.w,h:h.h};h.mk=f.key;h.x=f.x;h.y=f.y;h.w=f.w;h.h=f.h;h.dl=f.dl}}
    const T=16,G=86;const sides={t:[h.x,h.y,h.w,T],b:[h.x,h.y+h.h-T,h.w,T],l:[h.x,h.y,T,h.h],r:[h.x+h.w-T,h.y,T,h.h]};
    for(const s of['t','b','l','r']){const [x,y,ww,hh2]=sides[s];
      if(s!==side){w.walls.push({x,y,w:ww,h:hh2,house:h.id});continue}
      const dm=(lo,len)=>clamp(lo+len/2+(h.dl||0),lo+T+G/2+6,lo+len-T-G/2-6);
      if(s==='t'||s==='b'){const m=dm(x,ww);w.walls.push({x,y,w:m-G/2-x,h:hh2,house:h.id},{x:m+G/2,y,w:x+ww-(m+G/2),h:hh2,house:h.id});h.door={x:m,y:y+hh2/2}}
      else{const m=dm(y,hh2);w.walls.push({x,y,w:ww,h:m-G/2-y,house:h.id},{x,y:m+G/2,w:ww,h:y+hh2-(m+G/2),house:h.id});h.door={x:x+ww/2,y:m}}}
    const nx=side==='r'?1:side==='l'?-1:0,ny=side==='b'?1:side==='t'?-1:0;
    h.out={x:h.door.x+nx*55,y:h.door.y+ny*55};h.inn={x:h.door.x-nx*55,y:h.door.y-ny*55};
    w.lanterns.push({x:h.out.x+(ny?52:0),y:h.out.y+(nx?52:0),dire:V.dire,small:1});
    const ip=()=>({x:sr(h.x+45,h.x+h.w-45),y:sr(h.y+45,h.y+h.h-45)});
    const p1=ip();w.items.push({id:iid++,k:'w',x:p1.x,y:p1.y,wk:WK[Math.floor(SR()*WK.length)],tier:pickTier([42,36,19,3],SR),house:h.id});
    if(SR()<.5){const p2=ip();w.items.push({id:iid++,k:'c',x:p2.x,y:p2.y,n:1+(SR()<.3?1:0),house:h.id})}
    if(SR()<.35){const p5=ip();w.items.push({id:iid++,k:'w',x:p5.x,y:p5.y,wk:WK[Math.floor(SR()*WK.length)],tier:pickTier([30,40,24,6],SR),house:h.id})}   // owner 2026-11-23: loot lives in houses
    if(SR()<.65){const p3=ip();w.items.push({id:iid++,k:'r',x:p3.x,y:p3.y,tier:pickTier([34,34,22,10,0],SR),house:h.id})}
    if(SR()<.3){const p4=ip();w.items.push({id:iid++,k:'i',x:p4.x,y:p4.y,it:pickW(ITEMS,SR).id,house:h.id})}
    {const back=side==='t'?'b':side==='b'?'t':side==='l'?'r':'l',nb=h.w*h.h>62000&&SR()<.5?2:1;
      for(let q=0;q<nb;q++){const f=nb===1?sr(.3,.7):q?sr(.68,.85):sr(.15,.32);let bx,by;
        if(back==='t'||back==='b'){bx=lerp(h.x+60,h.x+h.w-60,f);by=back==='t'?h.y+T+26:h.y+h.h-T-26}else{by=lerp(h.y+60,h.y+h.h-60,f);bx=back==='l'?h.x+T+26:h.x+h.w-T-26}
        w.boxes.push({id:w.boxes.length,x:bx,y:by,a:Math.atan2(h.door.y-by,h.door.x-bx),house:h.id});w.rocks.push({x:bx,y:by,r:26,prop:1})}}
    const HA=h.al||h,corners=[[HA.x-24,HA.y+26],[HA.x+HA.w+24,HA.y+26],[HA.x-24,HA.y+HA.h-26],[HA.x+HA.w+24,HA.y+HA.h-26]];
    let np=0;for(const c of corners){if(np>=2)break;if(Math.hypot(c[0]-h.out.x,c[1]-h.out.y)<90||SR()<.35)continue;const t=SR()<.5?'barrel':'crate';w.props.push({x:c[0],y:c[1],t});w.rocks.push({x:c[0],y:c[1],r:15,prop:1});np++}

    w.houses.push(h)};
  w.villages.forEach((V,vi)=>{
    if(V.plaza){w.fountains.push({x:V.x,y:V.y,r:62});w.solids.push({x:V.x,y:V.y,r:62,t:'fountain'})}
    else{w.wells.push({x:V.x,y:V.y,r:34});w.solids.push({x:V.x,y:V.y,r:34,t:'well'})}
    for(let k=0;k<(V.plaza?8:5);k++){const a=k/(V.plaza?8:5)*Math.PI*2+.3;const rr=V.plaza?178:118;w.lanterns.push({x:V.x+Math.cos(a)*rr,y:V.y+Math.sin(a)*rr,dire:V.dire})}
    if(CURSED){w.stalls=w.stalls||[];for(let k=0;k<(V.plaza?3:2);k++){const a=k/(V.plaza?3:2)*Math.PI*2+1.3+vi,rr=V.plaza?232:186,x=V.x+Math.cos(a)*rr,y=V.y+Math.sin(a)*rr;w.stalls.push({x,y,a,c:['#5a6f8c','#8c5a5a','#6f8c5a'][k%3]});w.rocks.push({x,y,r:44,prop:1})}}
    let placed=0;
    for(let tries=0;tries<(CURSED?1600:700)&&placed<V.n;tries++){
      const a=placed/V.n*Math.PI*2+sr(-.25,.25)+(tries>120?sr(0,6):0),d=sr(V.r*(CURSED?.36:.5),V.r*(tries>300?.98:.9));
      const hw=sr(230,320),hh=sr(190,250);const cx=V.x+Math.cos(a)*d,cy=V.y+Math.sin(a)*d;const h={x:cx-hw/2,y:cy-hh/2,w:hw,h:hh};
      const cs=[[h.x,h.y],[h.x+h.w,h.y],[h.x,h.y+h.h],[h.x+h.w,h.y+h.h],[cx,cy]];
      if(cs.some(q=>outsideD(q[0],q[1])>-140||Math.abs(riverD(q[0],q[1]))<riverHW(q[1])+80||lakeD(q[0],q[1])<70||poolD(q[0],q[1])<80))continue;
      if(w.houses.some(o=>{const q=o.al||o;return !(h.x>q.x+q.w+70||h.x+h.w<q.x-70||h.y>q.y+q.h+70||h.y+h.h<q.y-70)}))continue;
      if(Math.hypot(cx-V.x,cy-V.y)<(V.plaza?210:170)+(CURSED?70:0)+Math.max(hw,hh)/2)continue;
      const dx=V.x-cx,dy=V.y-cy;const side=Math.abs(dx)>Math.abs(dy)?(dx>0?'r':'l'):(dy>0?'b':'t');
      addHouse(h,side,V,vi);placed++}
    // village extras
    if(V.plaza){for(let k=0;k<4;k++){const a=k/4*Math.PI*2+.78+sr(-.2,.2);const p={x:V.x+Math.cos(a)*250,y:V.y+Math.sin(a)*250};if(w.houses.some(h=>inRect(p,h.al||h,50)))continue;
      const st={x:p.x,y:p.y,a:a+Math.PI/2,c:['#c83a3a','#3a6ac8','#e0a020','#3a9a5a'][k]};w.stalls.push(st);w.solids.push({x:p.x,y:p.y,r:34,t:'stall'})}
      for(let k=0;k<6;k++){const a=k/6*Math.PI*2;w.banners.push({x:V.x+Math.cos(a)*205,y:V.y+Math.sin(a)*205,c:LOOKS[k].c})}}
    if(V.key==='farm'){for(let k=0;k<2;k++){for(let t=0;t<60;t++){const a=sr(0,6.3),d=V.r+sr(110,260);const p={x:V.x+Math.cos(a)*d,y:V.y+Math.sin(a)*d};
        if(outsideD(p.x,p.y)>-200||Math.abs(riverD(p.x,p.y))<riverHW(p.y)+120||w.windmills.some(m=>dist(m,p)<400))continue;w.windmills.push({x:p.x,y:p.y,r:50,a:sr(0,6.3)});w.solids.push({x:p.x,y:p.y,r:50,t:'mill'});break}}
      for(let k=0;k<4;k++){for(let t=0;t<80;t++){const a=sr(0,6.3),d=V.r+sr(260,520);const p={x:V.x+Math.cos(a)*d,y:V.y+Math.sin(a)*d};const f={x:p.x,y:p.y,w:sr(320,420),h:sr(210,280),a:sr(-.5,.5),crop:k%2?'wheat':'cabbage'};
        const R=Math.hypot(f.w,f.h)/2;if(outsideD(p.x,p.y)>-R-140||Math.abs(riverD(p.x,p.y))<riverHW(p.y)+R+60||lakeD(p.x,p.y)<R+60)continue;
        if(w.fields.some(o=>dist(o,f)<R+Math.hypot(o.w,o.h)/2+40)||w.windmills.some(m=>dist(m,f)<R+90)||w.villages.some(v=>dist(v,f)<v.r+R*.8))continue;w.fields.push(f);break}}
      for(let k=0;k<8;k++){const a=sr(0,6.3),d=V.r+sr(60,200);const p={x:V.x+Math.cos(a)*d,y:V.y+Math.sin(a)*d};w.hay.push({x:p.x,y:p.y,r:22,a:sr(0,3)});w.rocks.push({x:p.x,y:p.y,r:22,prop:1})}}
    if(V.key==='wood'){for(let k=0;k<5;k++){const a=sr(0,6.3),d=V.r*sr(.2,.45);const p={x:V.x+Math.cos(a)*d,y:V.y+Math.sin(a)*d};if(w.houses.some(h=>inRect(p,h.al||h,40))||dist(p,V)<90)continue;w.logs.push({x:p.x,y:p.y,a:sr(0,3.1)});w.rocks.push({x:p.x,y:p.y,r:30,prop:1})}}
    if(V.key==='lake'){const a=Math.atan2(V.y-Lk.y,V.x-Lk.x);let sh=null;for(let d=Lk.R+300;d>Lk.R-300;d-=10){const p={x:Lk.x+Math.cos(a)*d,y:Lk.y+Math.sin(a)*d};if(lakeD(p.x,p.y)<0){sh=p;break}}
      if(sh){const ax=-Math.cos(a),ay=-Math.sin(a);const len=260;w.bridges.push({x:sh.x+ax*(len/2-50),y:sh.y+ay*(len/2-50),ax,ay,len,wid:54,dock:1})}}
  });
  // ---- bridges across the river ----
  const addBridge=y=>{const i=clamp(Math.round((y-RIV.y0)/RIV.st),0,RIV.n-1);const x=RIV.xs[i];const a=RIV.xs[Math.max(0,i-8)],b=RIV.xs[Math.min(RIV.n-1,i+8)];const s=(b-a)/64,L=Math.sqrt(1+s*s);
    const ax=1/L,ay=-s/L;const hw=riverHW(y);const br={x,y,ax,ay,len:hw*2+150,wid:MOON?122:184};const e=br.len/2+40;br.r={x:x-ax*e,y:y-ay*e};br.d={x:x+ax*e,y:y+ay*e};
    if(outsideD(br.r.x,br.r.y)>-200||outsideD(br.d.x,br.d.y)>-200||lakeD(x,y)<120||poolD(x,y)<120)return null;if(w.bridges.some(o=>!o.dock&&Math.hypot(o.x-x,o.y-y)<700))return null;w.bridges.push(br);return br};
  const town=w.villages.find(v=>v.main);if(town){let by=null,bd=1e9;for(let y=RIV.y0+300;y<RIV.y1-300;y+=20){const d=Math.hypot(riverX(y)-town.x,y-town.y);if(d<bd){bd=d;by=y}}if(by!==null){const b=addBridge(by);if(b)b.big=1}}
  for(const f of[.08,.18,.28,.38,.48,.58,.68,.78,.88,.95])addBridge(lerp(RIV.y0,RIV.y1,f));
  // ---- outcrops: rocky hills inside the valley ----
  for(let k=0,t=0;k<34&&t<2800;t++){const p={x:sr(1000,WORLD-1000),y:sr(1000,WORLD-1000)};if(outsideD(p.x,p.y)>-520||nearPOI(p,380)||fortIn(p.x,p.y,420))continue;
    if(w.villages.some(v=>dist(p,v)<v.r+520)||w.cliffs.some(c=>dist(p,c)<900)||(Math.abs(p.x-CS.cx)<CS.w/2+700&&Math.abs(p.y-CS.cy)<CS.h/2+700))continue;
    const cl={x:p.x,y:p.y,parts:[]};const nb=3+Math.floor(SR()*3);for(let i=0;i<nb;i++){const a=sr(0,6.3),d=i?sr(80,170):0;cl.parts.push({x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,r:sr(95,175),h:sr(150,260)})}
    w.cliffs.push(cl);k++}
  {const C=400,n=Math.ceil(WORLD/C);const cells=Array.from({length:n*n},()=>[]);for(const cl of w.cliffs)for(const c of cl.parts){for(let j=Math.max(0,Math.floor((c.y-c.r)/C));j<=Math.min(n-1,Math.floor((c.y+c.r)/C));j++)for(let i=Math.max(0,Math.floor((c.x-c.r)/C));i<=Math.min(n-1,Math.floor((c.x+c.r)/C));i++)cells[j*n+i].push(c)}w.cg2={C,n,cells}}
  buildTerrain(w);
  // ---- Arena Royale: the Old Town (owner 2026-11-21). Pieces (rendered by arena-city.js from WD.city.props), streets (cobble paint),
  // lamps, collision, loot and its garrison. Models face the valley (+z toward it); sizes are world units (h = height, w = width) ----
  if(w.city){const C=w.city,P=(u,v)=>cityXY(C,u,v),face=Math.atan2(-C.ox,-C.oy),VP=C.dep*.44,VT=C.dep-340;
    const vAt=o=>Math.sqrt(Math.max(0,(C.rb+o)**2-CITY_SU**2))-C.rb;   // v of a stairway's centre line at distance o past the edge
    const prop=(k,u,v,o)=>{const q=Object.assign(P(u,v),{k,a:face},o||{});C.props.push(q);return q};
    const solid=(q,r)=>w.solids.push({x:q.x,y:q.y,r,t:'city'});
    const line=(u0,v0,u1,v1,wd)=>{const a=P(u0,v0),b=P(u1,v1);C.paint.push([a.x,a.y,b.x,b.y,wd]);return[a.x,a.y,b.x,b.y,wd]};
    const disc=(u,v,r)=>{const q=P(u,v);C.paint.push([q.x,q.y,r])};
    // the waterfall, its rocky foot either side of the pool
    // the falls (drawn by arena-falls.js): rocks frame the brink, the face and the basin; the ones on walkable ground are solid
    C.rocks=[];for(const sg of[-1,1]){const rk=(u,v,r,o)=>{const q=Object.assign(P(sg*u,v),{r,a:sr(0,6.3)},o||{});C.rocks.push(q);return q};
      solid(rk(CITY_FW/2+42,54,44,{dy:-16,hy:1.05}),38);rk(CITY_FW/2+60,6,56,{hy:1.15,dy:-18});
      solid(rk(CITY_FW/2+90,-58,48,{dy:-14,hy:.95}),40);solid(rk(150,-160,48,{dy:-12,hy:.9}),46);rk(sr(40,80),sr(-92,-72),sr(15,20),{dy:-9,hy:.8})}
    // the rest of the cliff face is rock too: boulders set into it along the town's front (not on the stairways, decor only)
    for(let u=-C.hw+240;u<C.hw-240;u+=sr(105,150)){if(Math.abs(u)<CITY_FW/2+160||Math.abs(Math.abs(u)-CITY_SU)<CITY_SH+95)continue;
      const o=sr(-18,24),an=C.a+u/C.rb,R=C.rb+o,r=sr(44,66);C.rocks.push({x:CX+Math.cos(an)*R,y:CY+Math.sin(an)*R,r,a:sr(0,6.3),hy:sr(1.05,1.45),dy:-r*.32})}
    // two stairways and a temple gate at the top of each (the arch is the way in)
    const v0=vAt(CITY_SB),v1=vAt(CITY_OF+10),gv=v1+125;C.gates=[];
    for(const sg of[-1,1]){prop('moon-stairs',sg*CITY_SU,(v0+v1)/2,{w:2*CITY_SH+28,h:CITY_P+6,d:v1-v0,y0:-3});
      prop('temple-gate',sg*CITY_SU,gv,{w:440});C.gates.push(P(sg*CITY_SU,gv));
      for(const [du,r] of[[112,36],[160,40],[204,26]])for(const s2 of[-1,1])solid(P(sg*CITY_SU+s2*du,gv),r)}
    // the town wall along the cliff top (gaps for the gates and the waterfall), corner towers at its ends
    {const rw=C.rb+CITY_OF+42;for(const [s0,s1] of[[-C.hw+270,-CITY_SU-255],[-CITY_SU+255,-210],[210,CITY_SU-255],[CITY_SU+255,C.hw-270]]){const L=s1-s0;if(L<120)continue;
      const n=Math.max(1,Math.round(L/270)),st=L/n;
      for(let i=0;i<n;i++){const sm=s0+(i+.5)*st,an=C.a+sm/rw,x=CX+Math.cos(an)*rw,y=CY+Math.sin(an)*rw,tx=-Math.sin(an),ty=Math.cos(an);
        C.props.push({k:'modular-wall',x,y,a:Math.atan2(-Math.cos(an),-Math.sin(an)),w:st+8,h:150,d:44});
        for(let t=-st/2+20;t<=st/2-19;t+=38)solid({x:x+tx*t,y:y+ty*t},23)}}
      for(const sg of[-1,1]){const an=C.a+sg*(C.hw-270)/rw,x=CX+Math.cos(an)*rw,y=CY+Math.sin(an)*rw;C.props.push({k:'wall-corner',x,y,a:Math.atan2(-Math.cos(an),-Math.sin(an))+(sg<0?-Math.PI/2:0),w:170,h:150,d:170});solid({x,y},70)}}
    // streets: gate -> plaza (two), plaza -> temple, the cross street, the plaza, the temple court, the gate aprons
    const ST=[line(-CITY_SU,gv+90,-120,VP-200,170),line(CITY_SU,gv+90,120,VP-200,170),line(0,VP,0,VT-140,170),line(-C.hw+420,VP+40,C.hw-420,VP+40,130)];
    disc(0,VP,410);disc(0,VT-150,300);for(const sg of[-1,1]){disc(sg*CITY_SU,gv+40,190);line(sg*CITY_SU,v0+20,sg*CITY_SU,v1+20,2*CITY_SH+10)}   // stone under the stairs too
    // the plaza: the moon circle, knight statues on plinths round it; guardian statues on the temple approach and north of the plaza
    prop('moon-arena',0,VP,{w:600,h:13,d:582,dy:-4});
    for(const th of[1.13,2.01,4.27,5.15]){const q=prop('city-knight',Math.cos(th)*470,VP+Math.sin(th)*470,{h:176,plinth:1});q.a=Math.atan2(Math.cos(th)*C.lx+Math.sin(th)*C.ox,Math.cos(th)*C.ly+Math.sin(th)*C.oy);solid(q,40)}
    for(const [u,v] of[[-270,VT-320],[270,VT-320],[-330,240],[330,240]])solid(prop('guardian-statue',u,v,{h:250}),56);   // the temple approach, and over the falls looking out on the valley
    // the old temple: a broken colonnade at the head of the town, two smaller ruined halls in the north quarters
    const ruin=(u,v,W,turn)=>{const q=prop('ruin-arch',u,v,{w:W});q.a+=turn||0;const cx=Math.cos(q.a),cy=-Math.sin(q.a);
      for(const [f,r] of[[.46,32],[.36,22],[.2,22]])for(const s2 of[-1,1])solid({x:q.x+cx*W*f*s2,y:q.y+cy*W*f*s2},r)};
    ruin(0,VT,560);ruin(-C.hw*.58,C.dep-640,450,.45);ruin(C.hw*.58,C.dep-640,450,-.45);
    // street lamps (the owner's lamp pillars), never on a statue, a gate or another lamp
    const pondNear=(q,m)=>{const dx=q.x-C.x,dy=q.y-C.y;return cityPondU(dx*C.lx+dy*C.ly,dx*C.ox+dy*C.oy)<m};
    const taken=q=>w.solids.some(o=>Math.hypot(o.x-q.x,o.y-q.y)<o.r+70)||C.gates.some(g=>Math.hypot(g.x-q.x,g.y-q.y)<260)||pondNear(q,60);
    const lamp=q=>{if(!cityIn(q.x,q.y,-40)||taken(q))return;C.lamps.push(q);C.props.push({k:'city-pillar',x:q.x,y:q.y,a:face,h:190});solid(q,24)};
    for(const sg of ST){const L=Math.hypot(sg[2]-sg[0],sg[3]-sg[1]),ux=(sg[2]-sg[0])/L,uy=(sg[3]-sg[1])/L,n=Math.floor(L/240);
      for(let i=1;i<n;i++){const t=i*240,off=(i%2?1:-1)*(sg[4]/2+40);lamp({x:sg[0]+ux*t-uy*off,y:sg[1]+uy*t+ux*off})}}
    for(let k=0;k<8;k++){const th=k/8*Math.PI*2+.39,q=P(Math.cos(th)*470,VP+Math.sin(th)*470);lamp(q)}
    // houses in the four quarters (the Fallen Kingdom's cottage), doors toward the plaza, a path to the nearest street
    {const pz=P(0,VP),V={x:pz.x,y:pz.y,dire:false,style:'stone'},spots=[[-C.hw*.62,VP*.62],[C.hw*.62,VP*.62],[-C.hw*.6,VP+430],[C.hw*.6,VP+430],[-C.hw*.3,VP+560],[C.hw*.3,VP+560],[-C.hw*.84,VP+120],[C.hw*.84,VP+120],[-C.hw*.36,VP*.5],[C.hw*.36,VP*.5]];
      const segD=(q,sg)=>segDist(q,sg);let n=0;
      for(const [su,sv] of spots){for(let t=0;t<40;t++){const c=P(su+sr(-170,170),sv+sr(-140,140)),hw=sr(240,300),hh=sr(200,240),h={x:c.x-hw/2,y:c.y-hh/2,w:hw,h:hh};
        const cs=[[h.x,h.y],[h.x+hw,h.y],[h.x,h.y+hh],[h.x+hw,h.y+hh]];if(cs.some(q=>!cityIn(q[0],q[1],-110)||cityBase(q[0],q[1])<CITY_P-1)||pondNear(c,Math.max(hw,hh)/2+90))continue;
        if(ST.some(sg=>segD(c,sg)<sg[4]/2+Math.max(hw,hh)/2+40)||Math.hypot(c.x-pz.x,c.y-pz.y)<560)continue;
        if(w.solids.some(o=>o.x>h.x-o.r-60&&o.x<h.x+hw+o.r+60&&o.y>h.y-o.r-60&&o.y<h.y+hh+o.r+60))continue;
        if(w.houses.some(o=>{const q=o.al||o;return !(h.x>q.x+q.w+90||h.x+hw<q.x-90||h.y>q.y+q.h+90||h.y+hh<q.y-90)}))continue;
        const dx=pz.x-c.x,dy=pz.y-c.y,side=Math.abs(dx)>Math.abs(dy)?(dx>0?'r':'l'):(dy>0?'b':'t');addHouse(h,side,V,-1);
        const hs=w.houses[w.houses.length-1];let best=null,bd=1e9;for(const sg of ST){const L2=(sg[2]-sg[0])**2+(sg[3]-sg[1])**2,t2=clamp(((hs.out.x-sg[0])*(sg[2]-sg[0])+(hs.out.y-sg[1])*(sg[3]-sg[1]))/L2,0,1),q={x:sg[0]+(sg[2]-sg[0])*t2,y:sg[1]+(sg[3]-sg[1])*t2},d=dist(q,hs.out);if(d<bd){bd=d;best=q}}
        if(best)C.paint.push([hs.out.x,hs.out.y,best.x,best.y,70]);n++;break}}C.houses=n;
      // free ground in the quarters: off the streets, clear of houses, statues, lamps and each other
      const open=(q,m)=>cityIn(q.x,q.y,-m)&&cityBase(q.x,q.y)>=CITY_P-1&&!pondNear(q,m+40)&&!ST.some(sg=>segD(q,sg)<sg[4]/2+m)&&Math.hypot(q.x-pz.x,q.y-pz.y)>480+m&&
        !w.solids.some(o=>Math.hypot(o.x-q.x,o.y-q.y)<o.r+m)&&!w.houses.some(h=>inRect(q,h.al||h,m))&&!w.trees.some(t=>Math.hypot(t.x-q.x,t.y-q.y)<t.r+m);
      // broken stretches of old wall standing about the quarters (cover)
      for(let k=0,t=0;k<7&&t<400;t++){const q=P(sr(-C.hw+300,C.hw-300),sr(260,C.dep-260));if(!open(q,170))continue;const an=sr(0,Math.PI),len=sr(200,280),tx=Math.cos(an),ty=Math.sin(an);
        if(!open({x:q.x+tx*len/2,y:q.y+ty*len/2},60)||!open({x:q.x-tx*len/2,y:q.y-ty*len/2},60))continue;
        C.props.push({k:'modular-wall',x:q.x,y:q.y,a:Math.atan2(-ty,tx),w:len,h:sr(110,150),d:40});for(let d=-len/2+20;d<=len/2-19;d+=38)solid({x:q.x+tx*d,y:q.y+ty*d},22);k++}
      // garden trees (the Fallen Kingdom's tree, felling works; owner 2026-11-23: 40% fewer trees in every zone, 9 -> 5)
      for(let k=0,t=0;k<5&&t<500;t++){const q=P(sr(-C.hw+260,C.hw-260),sr(240,C.dep-220));if(!open(q,130))continue;w.trees.push({x:q.x,y:q.y,r:20,cr:sr(58,76),v:2,ph:sr(0,6),h:sr(.85,1.1)});k++}}
    // reeds along the spring pool's banks (not by the channel), lily pads on its still north half
    for(let k=0,t=0;k<26&&t<300;t++){const an=sr(0,Math.PI*2),q=P(Math.cos(an)*(CITY_PRU-sr(4,22)),CITY_PV+Math.sin(an)*(CITY_PRV-sr(4,20)));
      const dx=q.x-C.x,dy=q.y-C.y,u=dx*C.lx+dy*C.ly,v=dx*C.ox+dy*C.oy;if(v<CITY_PV-70&&Math.abs(u)<CITY_FW/2+60)continue;w.reeds.push({x:q.x,y:q.y,s:sr(.85,1.3)});k++}C.nReed=w.reeds.length;
    for(let k=0,t=0;k<5&&t<200;t++){const q=P(sr(-CITY_PRU+60,CITY_PRU-60),sr(CITY_PV+5,CITY_PV+CITY_PRV-35));const dx=q.x-C.x,dy=q.y-C.y;
      if(cityPondU(dx*C.lx+dy*C.ly,dx*C.ox+dy*C.oy)>-38||w.lilies.some(l=>Math.hypot(l.x-q.x,l.y-q.y)<44))continue;w.lilies.push({x:q.x,y:q.y,s:sr(.6,.9),a:sr(0,6.3),f:SR()<.4,wl:CITY_PW});k++}C.nLily=w.lilies.length;
    // loot: chests on the plaza and behind the temple, the temple's relics, potions at the gates and on the plaza
    const box=(u,v)=>{const q=P(u,v);w.boxes.push({id:w.boxes.length,x:q.x,y:q.y,a:face+Math.PI/2});w.rocks.push({x:q.x,y:q.y,r:26,prop:1})};
    box(-150,VP);box(150,VP);box(-150,VT+150);box(150,VT+150);
    // the temple's relics (a legendary weapon and a rune the Dark Sentinel guards) are gilded treasure chests too (vault:3), same rule
    SR();SR();for(const v of[VT+120,VT+200]){const q=P(0,v);w.boxes.push({id:w.boxes.length,x:q.x,y:q.y,a:face+Math.PI/2,vault:3});w.rocks.push({x:q.x,y:q.y,r:26,prop:1})}
    for(const [u,v,it] of[[-60,VP-120,'potion'],[60,VP-120,'potion'],[0,VP+130,'mana'],[-CITY_SU,gv+150,'potion'],[CITY_SU,gv+150,'potion']]){const q=P(u,v);w.items.push({id:iid++,k:'i',x:q.x,y:q.y,it})}
    for(const [u,v] of[[-C.hw*.45,VP+40],[C.hw*.45,VP+40],[0,VT-60]]){const q=P(u,v);w.items.push({id:iid++,k:'c',x:q.x,y:q.y,n:2,gold:SR()<.5})}
    // the garrison: three Dark Sentinels hold the temple court (eclipse.js kind, rich loot)
    {const g=P(0,VT-230),camp={id:w.camps.length,x:g.x,y:g.y,tier:'citywatch',mem:[],maxRespawn:2,sc:1.15,rich:1};
      for(let i=0;i<3;i++){const q=P((i-1)*95,VT-230+(i===1?-50:0)),m={id:mid++,x:q.x,y:q.y,kind:'sentinel',camp:camp.id,sc:1.15,rich:1};w.mobs.push(m);camp.mem.push(m.id)}w.camps.push(camp)}
    // how far the town reaches from the valley's centre (the storm's first circle covers it)
    C.far=0;for(const [u,v] of[[-C.hw,C.dep],[C.hw,C.dep],[0,C.dep+120],[-C.hw,0],[C.hw,0]]){const q=P(u,v);C.far=Math.max(C.far,Math.hypot(q.x-CX,q.y-CY))}}
  // ---- Frozen Sanctuary: the closed palace, the Queen's front court, and the stairway ----
  if(w.fort){const F=w.fort,P=(u,v)=>cityXY(F,u,v),face=Math.atan2(-F.ox,-F.oy);
    const prop=(k,u,v,o)=>{const q=Object.assign(P(u,v),{k,a:face},o||{});F.props.push(q);return q};
    const solid=(q,r)=>w.solids.push({x:q.x,y:q.y,r,t:'fort'});
    // Match the Blender rails, leaving the centre of the stairway clear.
    const railStart=FORT_SB+20,railEnd=FORT_OF+4,railRadius=15;
    const steps=Math.ceil((railEnd-railStart)/railRadius);
    for(const s of[-1,1])for(let i=0;i<=steps;i++)solid(P(s*140,lerp(railStart,railEnd,i/steps)),railRadius);
    // paving (the court, the way from the stair head, the castle's apron): no grass or meadow dressing there
    {const d=(u,v,r)=>{const q=P(u,v);F.paint.push([q.x,q.y,r])},l=(u0,v0,u1,v1,wd)=>{const a=P(u0,v0),b=P(u1,v1);F.paint.push([a.x,a.y,b.x,b.y,wd])};
      l(0,FORT_SB-25,0,FORT_OF+10,445);d(0,FORT_VA,500);d(0,FORT_VC-FORT_CD/2-40,330);l(0,FORT_OF,0,FORT_VA-300,330);l(-FORT_CW/2,FORT_VC-FORT_CD/2-60,FORT_CW/2,FORT_VC-FORT_CD/2-60,160)}
    // the castle: solid over its whole footprint (towers at the four corners)
    F.castle=prop('snow-castle',0,FORT_VC,{w:FORT_CW,d:FORT_CD});
    for(let u=-FORT_CW/2+70;u<=FORT_CW/2-70+1;u+=(FORT_CW-140)/6)for(let v=FORT_VC-FORT_CD/2+70;v<=FORT_VC+FORT_CD/2-70+1;v+=(FORT_CD-140)/4)solid(P(u,v),82);
    for(const su of[-1,1])for(const sv of[-1,1])solid(P(su*FORT_CW/2,FORT_VC+sv*FORT_CD/2),92);
    // guardians at the head of the stairway and either side of the gate, braziers round the court
    for(const sg of[-1,1]){solid(prop('guardian-statue',sg*250,150,{h:230,ice:1}),52);solid(prop('guardian-statue',sg*210,FORT_VC-FORT_CD/2-90,{h:250,ice:1}),52)}
    for(let i=0;i<4;i++){const a=(i+.5)/4*Math.PI*2,q=P(Math.cos(a)*470,FORT_VA+Math.sin(a)*400);F.braziers.push(q);solid(q,26)}
    // ice crystal clusters along the plateau's sides and back corners and either side of the stair head (the big ones are solid)
    for(let k=0,t=0;k<16&&t<400;t++){const u=sr(-F.hw+90,F.hw-90),v=sr(120,F.dep-80),au=Math.abs(u);
      if(au<F.hw-330&&v<FORT_VC+FORT_CD/2+60)continue;if(Math.abs(u)<FORT_CW/2+120&&Math.abs(v-FORT_VC)<FORT_CD/2+120)continue;
      const q=P(u,v);if(fortSB(F,u,v)>-70||F.crystals.some(c=>Math.hypot(c.x-q.x,c.y-q.y)<220))continue;
      const c=Object.assign(q,{r:sr(46,82),n:4+Math.floor(SR()*4),a:sr(0,6.3),h:sr(150,260)});F.crystals.push(c);if(c.r>60)solid(c,c.r*.7);k++}
    for(const sg of[-1,1]){const q=Object.assign(P(sg*(FORT_SH+60),FORT_OF+8),{r:44,n:4,a:sr(0,6.3),h:sr(130,170)});F.crystals.push(q)}
    // snow pines on the plateau's flanks, behind the castle (owner 2026-11-23: 14 -> 8)
    for(let k=0,t=0;k<8&&t<300;t++){const u=sr(-F.hw+120,F.hw-120),v=sr(220,F.dep-120),au=Math.abs(u);if(au<F.hw-300&&v<F.dep-260)continue;
      if(Math.abs(u)<FORT_CW/2+90&&Math.abs(v-FORT_VC)<FORT_CD/2+90)continue;const q=P(u,v);if(fortSB(F,u,v)>-90)continue;
      if(F.crystals.some(c=>Math.hypot(c.x-q.x,c.y-q.y)<c.r+70)||w.trees.some(t=>Math.abs(t.x-q.x)<120&&Math.abs(t.y-q.y)<120))continue;
      w.trees.push({x:q.x,y:q.y,r:20,cr:sr(58,78),v:2,ph:sr(0,6),h:sr(.9,1.15)});k++}
    // loot: two chests and gold by the castle gate, a tier-3 weapon and a rune behind the queen, potions at the stair head
    for(const sg of[-1,1]){const q=P(sg*330,FORT_VC-FORT_CD/2-110);w.boxes.push({id:w.boxes.length,x:q.x,y:q.y,a:face+Math.PI/2});w.rocks.push({x:q.x,y:q.y,r:26,prop:1});
      const c=P(sg*420,FORT_VC-FORT_CD/2-150);w.items.push({id:iid++,k:'c',x:c.x,y:c.y,n:2,gold:true})}
    // owner 2026-11-23 "ตรงบอสราชินีน้ำแข็ง ไอเทมระดับตำนานยังมีอยู่เลย": the legendary weapon and rune behind the queen are two of the
    // gilded treasure chests now (vault:2, rolled when opened, b.js openBox); the two draws they used are still taken, so the rest
    // of the world grows exactly as before
    SR();SR();for(const u of[-70,70]){const q=P(u,FORT_VA+330);w.boxes.push({id:w.boxes.length,x:q.x,y:q.y,a:face+Math.PI/2,vault:2});w.rocks.push({x:q.x,y:q.y,r:26,prop:1})}
    for(const [u,it] of[[-90,'potion'],[90,'mana']]){const q=P(u,190);w.items.push({id:iid++,k:'i',x:q.x,y:q.y,it})}
    // the Snow Queen (snow-queen.js): alone on her court, no respawn
    {const g=P(0,FORT_VA+170),camp={id:w.camps.length,x:g.x,y:g.y,tier:'icethrone',mem:[],maxRespawn:0,sc:1,rich:1};
      const m={id:mid++,x:g.x,y:g.y,kind:'snowqueen',camp:camp.id,sc:1,rich:1};w.mobs.push(m);camp.mem.push(m.id);w.camps.push(camp);F.queen=m.id;F.home={x:g.x,y:g.y}}
    F.far=0;for(const [u,v] of[[-F.hw,F.dep],[F.hw,F.dep],[0,F.dep+120]]){const q=P(u,v);F.far=Math.max(F.far,Math.hypot(q.x-CX,q.y-CY))}}
  // ---- shrines ----
  const inCastle=(p,m)=>p.x>CS.x-m&&p.x<CS.x+CS.w+m&&p.y>CS.y-m&&p.y<CS.y+CS.h+m;
  const caveNear=(p,m)=>w.caves.some(c=>Math.hypot(p.x-c.x,p.y-c.y)<c.R+m||segDist(p,[c.mx,c.my,c.x,c.y])<c.w+m);
  for(let tries=0;tries<4000&&w.shrines.length<10;tries++){const wantDire=w.shrines.length%2===1;const p={x:sr(800,WORLD-800),y:sr(800,WORLD-800)};
    if(isDire(p.x,p.y)!==wantDire||inDG(p,300)||!walkable(p.x,p.y,200)||nearPOI(p,300)||inCastle(p,500)||caveNear(p,300)||cityIn(p.x,p.y,300))continue;if(w.villages.some(v=>dist(p,v)<v.r+450))continue;
    if(w.shrines.some(s=>dist(p,s)<2200))continue;w.shrines.push({x:p.x,y:p.y,r:150,dire:wantDire})}
  // ---- roads ----
  const crosses=(a,b)=>{const s1=Math.sign(riverD(a.x,a.y)),s2=Math.sign(riverD(b.x,b.y));if(Math.abs(riverD(a.x,a.y))<1e4&&Math.abs(riverD(b.x,b.y))<1e4&&s1!==s2)return true;
    for(let k=1;k<12;k++){const t=k/12,x=lerp(a.x,b.x,t),y=lerp(a.y,b.y,t);if(!walkable(x,y,10)||Math.abs(riverD(x,y))<riverHW(y)+10)return true}return false};
  const road=(a,b,wd)=>{const L=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(1,Math.round(L/260));const nx=-(b.y-a.y)/(L||1),ny=(b.x-a.x)/(L||1);const pts=[[a.x,a.y]];
    for(let k=1;k<n;k++){const t=k/n,j=Math.sin(t*Math.PI)*sr(-70,70);pts.push([lerp(a.x,b.x,t)+nx*j,lerp(a.y,b.y,t)+ny*j])}pts.push([b.x,b.y]);
    for(let k=0;k<pts.length-1;k++)w.paths.push([pts[k][0],pts[k][1],pts[k+1][0],pts[k+1][1],wd||64])};
  const ends=w.bridges.filter(b=>!b.dock);const nearestOn=(p,list)=>list.reduce((a,v)=>!a||dist(p,v)<dist(p,a)?v:a,null);
  for(const br of ends){const W1=w.villages.filter(v=>!crosses(v,br.r)),E1=w.villages.filter(v=>!crosses(v,br.d));const v1=nearestOn(br.r,W1),v2=nearestOn(br.d,E1);
    if(v1&&dist(v1,br.r)<4500)road(br.r,v1);if(v2&&dist(v2,br.d)<4500)road(br.d,v2);w.lanterns.push({x:br.r.x+br.ay*72,y:br.r.y-br.ax*72},{x:br.d.x-br.ay*72,y:br.d.y+br.ax*72})}
  for(let i=0;i<w.villages.length;i++){const a=w.villages[i];const others=w.villages.filter(b=>b!==a&&!crosses(a,b)).sort((p,q)=>dist(a,p)-dist(a,q));if(others[0]&&dist(a,others[0])<7200)road(a,others[0])}
  {const vs=w.villages.filter(v=>!crosses(v,CS.out));const v=nearestOn(CS.out,vs.length?vs:ends.map(b=>b.d));if(v)road(CS.out,v,70)}
  for(const s of w.shrines){const vs=w.villages.filter(v=>!crosses(v,s));const v=nearestOn(s,vs);if(v&&dist(v,s)<6300)road(s,v,46)}
  for(const c of w.caves){const vs=w.villages.filter(v=>!crosses(v,{x:c.mx,y:c.my}));const v=nearestOn({x:c.mx,y:c.my},vs);if(v&&dist(v,{x:c.mx,y:c.my})<5200&&SR()<.6)road({x:c.mx,y:c.my},v,40)}
  for(const h of w.houses){const v=w.villages[h.v];if(v)w.paths.push([v.x,v.y,h.out.x,h.out.y,44])}   // Old Town houses (v -1) open onto its own streets
  const pathNear=(p,m)=>{for(const q of w.paths)if(segDist(p,q)<m+q[4]/2)return true;return false};
  const free=(p,m)=>{if(inDG(p,m+60))return false;if(!walkable(p.x,p.y,m+12))return false;if(cityIn(p.x,p.y,m+60))return false;if(Math.abs(riverD(p.x,p.y))<riverHW(p.y)+m)return false;if(lakeD(p.x,p.y)<m||poolD(p.x,p.y)<m+40)return false;
    for(const v of w.villages)if(dist(p,v)<v.r+m)return false;if(caveNear(p,m))return false;if(inCastle(p,m+30))return false;for(const s of w.shrines)if(dist(p,s)<s.r+m)return false;
    for(const f of w.fields)if(Math.abs(p.x-f.x)<f.w*.6+m&&Math.abs(p.y-f.y)<f.h*.6+m)return false;return true};
  // ---- rocks: scattered boulders, mountain foot, cave walls, cliff edges ----
  for(let k=0,t=0;k<220&&t<3600;t++){const p={x:sr(400,WORLD-400),y:sr(400,WORLD-400),r:sr(28,60)};if(!free(p,60)||pathNear(p,55)||w.rocks.some(r=>dist(r,p)<r.r+p.r+60))continue;w.rocks.push(p);k++}
  for(let a=0;a<Math.PI*2;a+=.0085){if(SR()<.55)continue;const rb=bndR(a);const d=rb-sr(-10,40);const p={x:CX+Math.cos(a)*d,y:CY+Math.sin(a)*d,r:sr(40,90),edge:1};if(caveNear(p,40)||poolD(p.x,p.y)<60||cityPath(p.x,p.y,70))continue;w.rocks.push(p)}
  for(const cl of w.cliffs)for(const c of cl.parts)for(let a=0;a<6.28;a+=.5){if(SR()<.4)continue;const p={x:c.x+Math.cos(a)*c.r*.72,y:c.y+Math.sin(a)*c.r*.72,r:sr(30,55),cliff:1};if(sdfAt(p.x,p.y)>p.r*.6)continue;w.rocks.push(p)}
  for(const c of w.caves){for(let a=0;a<6.28;a+=.32){const p={x:c.x+Math.cos(a)*(c.R+10),y:c.y+Math.sin(a)*(c.R+10),r:sr(36,58),cave:c.id};const da=Math.abs(Math.atan2(Math.sin(a-c.gap),Math.cos(a-c.gap)));if(da<.42)continue;w.rocks.push(p)}
    const px=-Math.sin(c.gap),py=Math.cos(c.gap);
    for(let k=0;k<4;k++)w.crystals.push({x:c.x+sr(-c.R*.6,c.R*.6),y:c.y+sr(-c.R*.6,c.R*.6),c:SR()<.5?'#7ff3ff':'#ff8ae0',s:sr(10,16)});
    const back={x:c.x-Math.cos(c.gap)*c.R*.55,y:c.y-Math.sin(c.gap)*c.R*.55};
    w.items.push({id:iid++,k:'w',x:back.x+px*55,y:back.y+py*55,wk:WK[Math.floor(SR()*WK.length)],tier:3,cave:c.id});
    w.items.push({id:iid++,k:'r',x:back.x-px*55,y:back.y-py*55,tier:3,cave:c.id});
    w.items.push({id:iid++,k:'c',x:back.x,y:back.y,n:3,gold:true,cave:c.id});
    w.items.push({id:iid++,k:'i',x:back.x+Math.cos(c.gap)*70,y:back.y+Math.sin(c.gap)*70,it:'tome',cave:c.id});
    const gid=mid++;w.mobs.push({id:gid,x:c.x,y:c.y,kind:'guardian',camp:w.camps.length});w.camps.push({id:w.camps.length,x:c.x,y:c.y,tier:'guardian',mem:[gid],maxRespawn:0})}
  // ---- trees: forests from noise, a pine belt at the mountain foot, magic woods on the east bank ----
  const TS=100,gw=Math.ceil(WORLD/TS);const tgrid=Array.from({length:gw*gw},()=>[]);
  const tFree=(p,m)=>{const gx=Math.floor(p.x/TS),gy=Math.floor(p.y/TS);for(let y=gy-1;y<=gy+1;y++)for(let x=gx-1;x<=gx+1;x++){if(x<0||y<0||x>=gw||y>=gw)continue;for(const t of tgrid[y*gw+x])if(dist(t,p)<m)return false}return true};
  const rockNear=(p,m)=>{for(const r of w.rocks)if(Math.abs(r.x-p.x)<r.r+m&&dist(p,r)<r.r+m)return true;return false};
  // Arena Royale (owner 2026-11-23): "ลดต้นไม้ทุกโซนลง 40%". Every forest keeps its shape and spacing, 40% of its trees are left out:
  // a cut tree still holds its spot in the spacing grid until the mango trees are placed (so the gaps stay open ground instead of
  // filling up again), then leaves. Integer hash of the spot, no extra SR draws
  const cutH=(x,y,s)=>{let h=Math.imul(Math.floor(x),0x9E3779B1)^Math.imul(Math.floor(y)+0x7F4A7C15,0x85EBCA77)^Math.imul(s+1,0xC2B2AE3D);h^=h>>>16;h=Math.imul(h,0x7FEB352D);h^=h>>>15;h=Math.imul(h,0x846CA68B);h^=h>>>16;return(h>>>0)/4294967296};
  const cut40=[];
  for(let gy=0;gy<gw;gy++)for(let gx=0;gx<gw;gx++){
    const p={x:gx*TS+sr(10,TS-10),y:gy*TS+sr(10,TS-10)};const o=outsideD(p.x,p.y);if(o>-30)continue;
    const nz=w.noise(p.x,p.y),foot=o>-420;const dire=isDire(p.x,p.y);const rdist=Math.abs(riverD(p.x,p.y))-riverHW(p.y);
    let want=nz>.53||(foot&&nz>.43)||(dire&&nz>.5);if(!want&&rdist>0&&rdist<170&&SR()<.12)want=true;if(!want)continue;if(SR()<(CURSED?.5:.22))continue;
    if(!free(p,42)||pathNear(p,45)||rockNear(p,44)||w.houses.some(h=>inRect(p,h.al||h,52))||!tFree(p,104))continue;
    const roll=SR();let v;
    if(rdist>0&&rdist<170&&!foot)v=6;else if(foot)v=dire?(roll<.6?4:0):(roll<.75?0:2);else if(dire)v=roll<.32?3:roll<.62?4:roll<.8?5:1;else v=roll<.42?1:roll<.62?2:roll<.9?0:6;
    if(MOON){v=REG.tree(p.x,p.y,v,roll);if(v<0)continue}
    else{if(v===6)v=2;else if(v===5)v=4;else if(v===1)v=roll<.5?2:0;else if(v===3)v=roll<.5?4:2}
    if(!MOON&&(v===0||v===4)&&((roll*7919.37)%1)<.69)continue;   // owner 2026-11-18: 60% fewer pines   // Arena Royale (owner 2026-11-18): no willow / dead / round-crowned / crystal trees, pines + birches instead
    const t={x:p.x,y:p.y,r:18,cr:sr(52,76)*(v===6?1.15:1),v,ph:sr(0,6),h:sr(.85,1.2)};tgrid[gy*gw+gx].push(t);if(!MOON&&cutH(p.x,p.y,1)<.4){cut40.push(t);continue}w.trees.push(t)}
  // Arena Royale (owner 2026-11-19): Big Mango Trees, 10% more trees, scattered over the open ground between the woods. They are
  // ordinary birch-class trees (collision, felling) flagged mg; the renderer swaps in the owner's model
  if(!MOON){const nM=Math.round(w.trees.length*.10);let mN=0;for(let k=0;k<nM*60&&mN<nM;k++){const p={x:sr(200,WORLD-200),y:sr(200,WORLD-200)};
    if(outsideD(p.x,p.y)>-140||w.noise(p.x,p.y)>.5)continue;if(!free(p,48)||pathNear(p,60)||rockNear(p,56)||w.houses.some(h=>inRect(p,h.al||h,70))||!tFree(p,170))continue;
    const t={x:p.x,y:p.y,r:22,cr:sr(72,96),v:2,mg:1,ph:sr(0,6),h:sr(.9,1.15)};w.trees.push(t);tgrid[Math.floor(p.y/TS)*gw+Math.floor(p.x/TS)].push(t);mN++}}
  for(const t of cut40){const c=tgrid[Math.floor(t.y/TS)*gw+Math.floor(t.x/TS)],i=c.indexOf(t);if(i>=0)c.splice(i,1)}
  // Arena Royale (owner 2026-11-23): "ปรับต้นกล้วยให้ล้มได้". The banana plants were render-only decor (moonfall-village.js buildNature);
  // they are trees now, flagged bn (birch-class for the fallback look; the renderer draws the owner's banana model), one blow fells
  // one (trees-break.js), a slim trunk collides. Same spread as the decor (thick on the river and lake banks, a few in the meadows),
  // 40% fewer like every other tree. Integer hash per terrain cell, no SR draws
  if(!MOON&&w.tg&&w.tg.hg){const tg=w.tg,n=tg.n,C=tg.C,hg=tg.hg;
    const wet=(i,j,R)=>{for(let b=-R;b<=R;b++)for(let a=-R;a<=R;a++){const ii=i+a,jj=j+b;if(ii>=0&&jj>=0&&ii<n&&jj<n&&hg[jj*n+ii]<WL-1)return true}return false};
    for(let j=2;j<n-2;j+=2)for(let i=2;i<n-2;i+=2){const h=hg[j*n+i];if(h<WL+3)continue;const r=cutH(i,j,4);if(r>.34*.28*.6)continue;   // cheap reject first
      const nearW=h<WL+28&&wet(i,j,5),pr=(nearW?.34:w.noise((i+.5)*C,(j+.5)*C)<.44?.035:.012)*.28*.6;if(r>pr)continue;
      const p={x:(i+cutH(i,j,2))*C,y:(j+cutH(i,j,3))*C};
      if(!free(p,22)||pathNear(p,34)||rockNear(p,30)||w.houses.some(q=>inRect(p,q.al||q,34))||!tFree(p,64))continue;
      const sz=.75+cutH(i,j,9)*.6,t={x:p.x,y:p.y,r:13,cr:36*sz,v:2,bn:1,ph:cutH(i,j,8)*6.283,h:sz};w.trees.push(t);tgrid[Math.floor(p.y/TS)*gw+Math.floor(p.x/TS)].push(t)}}
  // decorative pines on the mountain slopes (no collision)
  for(let k=0;k<33000&&w.mtrees.length<5200;k++){const a=sr(0,6.283),d=bndR(a)+sr(20,1000);const x=CX+Math.cos(a)*d,y=CY+Math.sin(a)*d;const o=d-bndR(a);
    const hh=terrH(x,y);if(hh>720||hh<20)continue;if(caveK(x,y)>0||inDG({x,y},1150)||cityIn(x,y,240))continue;if(w.noise(x,y)<.38&&SR()<.6)continue;if(SR()<o/1300)continue;
    w.mtrees.push({x,y,h:hh,s:sr(.9,1.5)*(1-hh/1600),v:SR()<.25?4:0,ph:sr(0,6)})}
  // bushes
  for(let k=0;k<9600&&w.bushes.length<(MOON?620:0);k++){   // Arena Royale: no berry bushes (owner 2026-11-18), tall grass still hides
  const p={x:sr(300,WORLD-300),y:sr(300,WORLD-300),r:sr(44,66)};
    if(!free(p,30)||pathNear(p,25)||w.houses.some(h=>inRect(p,h.al||h,p.r+20))||!tFree(p,p.r+14)||rockNear(p,p.r)||w.bushes.some(b=>dist(b,p)<b.r+p.r+50))continue;w.bushes.push(p)}
  if(MOON)for(const c of w.caves){const ex=c.mx,ey=c.my,px=-Math.sin(c.gap),py=Math.cos(c.gap);for(const s of[1,-1]){const p={x:ex+px*s*95+Math.cos(c.gap)*30,y:ey+py*s*95+Math.sin(c.gap)*30,r:54};if(walkable(p.x,p.y,10))w.bushes.push(p)}}
  // tall-grass meadows: big patches to hide in (inside one you are hidden, like in a bush)
  {const ring=(p,r)=>{for(let a=0;a<6.28;a+=1.05){const x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;if(!walkable(x,y,6)||inWater(x,y))return false}return true};
   for(let k=0;k<14000&&w.tgrass.length<280;k++){const p={x:sr(400,WORLD-400),y:sr(400,WORLD-400),r:sr(85,150)};
    if(!free(p,40)||cityIn(p.x,p.y,p.r)||!ring(p,p.r*.85)||pathNear(p,p.r*.55)||w.houses.some(h=>inRect(p,h.al||h,p.r+30))||rockNear(p,p.r*.6)||!tFree(p,p.r*.5))continue;
    if(w.bushes.some(b=>dist(b,p)<b.r+p.r+20)||w.tgrass.some(b=>dist(b,p)<b.r+p.r+160))continue;p.s=SR();w.tgrass.push(p)}}
  // glowing mushrooms, crystals, grass, flowers, reeds, lilies
  for(let k=0;k<5600&&w.mush.length<880;k++){const p={x:sr(300,WORLD-300),y:sr(300,WORLD-300)};if(!free(p,0))continue;const rg=MOON?REG.at(p.x,p.y):-1,dire=MOON?rg===1||rg===4:isDire(p.x,p.y);if(!dire&&SR()<.85)continue;
    const near=w.trees.length?tFree(p,20):true;if(!near)continue;w.mush.push({x:p.x,y:p.y,c:rg===1?(SR()<.55?'#8dff7a':'#e8ff7a'):SR()<.55?'#6ff7ff':'#ff7ae6',s:sr(5,9)})}
  for(let k=0;k<3600&&w.crystals.length<20+180;k++){const p={x:sr(300,WORLD-300),y:sr(300,WORLD-300)};const rg=MOON?REG.at(p.x,p.y):-1;if(!free(p,40)||(MOON?rg<2:!isDire(p.x,p.y)))continue;w.crystals.push({x:p.x,y:p.y,c:rg===3?(SR()<.5?'#ff7a2a':'#ffb347'):rg===2?(SR()<.5?'#9fe8ff':'#dff6ff'):rg===4?(SR()<.5?'#c58aff':'#8a5aff'):SR()<.5?'#7ff3ff':'#c58aff',s:sr(9,14)})}
  for(let k=0;k<64000&&w.grass.length<20800;k++){const p={x:sr(200,WORLD-200),y:sr(200,WORLD-200)};if(inDG(p,40)||!walkable(p.x,p.y,8)||inWater(p.x,p.y)||heightAt(p.x,p.y)<-3||cityIn(p.x,p.y,0))continue;
    if(w.villages.some(v=>v.plaza&&dist(p,v)<220))continue;if(w.houses.some(h=>inRect(p,h.al||h,4)))continue;if(inCastle(p,-30))continue;if(pathNear(p,-6))continue;
    w.grass.push({x:p.x,y:p.y,s:sr(.7,1.35),c:SR(),d:isDire(p.x,p.y)?1:0})}
  for(let k=0;k<28000&&w.flowers.length<6000;k++){const p={x:sr(200,WORLD-200),y:sr(200,WORLD-200)};if(inDG(p,40)||!walkable(p.x,p.y,6)||inWater(p.x,p.y)||cityIn(p.x,p.y,0))continue;const meadow=w.noise(p.x,p.y)<.42||w.villages.some(v=>dist(p,v)<v.r);if(!meadow&&SR()<.7)continue;
    if(w.houses.some(h=>inRect(p,h.al||h,2))||pathNear(p,-4)||inCastle(p,0))continue;w.flowers.push({x:p.x,y:p.y,c:SR(),d:isDire(p.x,p.y)?1:0})}
  for(let k=0;k<9900&&w.reeds.length-(w.city&&w.city.nReed||0)<1400;k++){const y=sr(RIV.y0,RIV.y1);const hw=riverHW(y);const side=SR()<.5?-1:1;const off=hw+sr(-14,28);const i=clamp(Math.round((y-RIV.y0)/RIV.st),0,RIV.n-1);const x=RIV.xs[i]+side*off/RIV.il[i];
    if(onBridge(x,y)||!walkable(x,y,0))continue;w.reeds.push({x,y,s:sr(.8,1.3)})}
  for(let k=0;k<400;k++){const a=sr(0,6.3),d=Lk.R+sr(-120,30);const x=Lk.x+Math.cos(a)*d,y=Lk.y+Math.sin(a)*d;const ld=lakeD(x,y);if(ld>-20&&ld<20)w.reeds.push({x,y,s:sr(.8,1.3)});else if(ld<-60&&w.lilies.length-(w.city&&w.city.nLily||0)<70)w.lilies.push({x,y,s:sr(.8,1.3),a:sr(0,6.3),f:SR()<.3})}
  // fences around fields
  for(const f of w.fields){const ca=Math.cos(f.a),sa=Math.sin(f.a);const cs=[[-1,-1],[1,-1],[1,1],[-1,1]].map(q=>({x:f.x+(q[0]*f.w/2+q[0]*20)*ca-(q[1]*f.h/2+q[1]*20)*sa,y:f.y+(q[0]*f.w/2+q[0]*20)*sa+(q[1]*f.h/2+q[1]*20)*ca}));
    for(let i=0;i<4;i++){if(i===2)continue;w.fences.push([cs[i].x,cs[i].y,cs[(i+1)%4].x,cs[(i+1)%4].y])}}
  // ---- loot outside ----
  const blockedGen=(p,r)=>{for(const o of w.rocks)if(Math.abs(o.x-p.x)<o.r+r&&dist(p,o)<o.r+r)return true;for(const o of w.solids)if(dist(p,o)<o.r+r)return true;for(const t of w.trees)if(Math.abs(t.x-p.x)<t.r+r&&dist(p,t)<t.r+r)return true;for(const q of w.walls)if(circRect(p.x,p.y,r,q))return true;return false};
  const outSpot=m=>{for(let k=0;k<120;k++){const p={x:sr(m,WORLD-m),y:sr(m,WORLD-m)};if(!free(p,0)||blockedGen(p,30)||w.houses.some(h=>inRect(p,h.al||h,10)))continue;return p}return{x:town?town.x+sr(-120,120):CX,y:town?town.y+sr(160,240):CY}};
  for(let k=0;k<176;k++){const p=outSpot(300);w.items.push({id:iid++,k:'c',x:p.x,y:p.y,n:1+(SR()<.25?1:0)})}
  // ---- village merchants (owner 2026-11-23: buying — potions, level books, special skills, reforging — happens only at an NPC in a
  // village): one per village, beside a market stall and facing the square; arena-npc.js draws them and gates the shop ----
  w.npcs=[];for(const V of w.villages){let pos=null;const ok=p=>walkable(p.x,p.y,14)&&!cityIn(p.x,p.y,40)&&Math.abs(riverD(p.x,p.y))>riverHW(p.y)+20&&lakeD(p.x,p.y)>20&&poolD(p.x,p.y)>50&&!blockedGen(p,34)&&!w.houses.some(h=>inRect(p,h.al||h,24));   // free() keeps out of villages, so not that
    for(const st of(w.stalls||[]).filter(q=>Math.hypot(q.x-V.x,q.y-V.y)<V.r)){for(const sd of[1,-1]){const p={x:st.x-Math.sin(st.a)*sd*82,y:st.y+Math.cos(st.a)*sd*82};if(ok(p)){pos=p;break}}if(pos)break}
    for(let k=0;k<80&&!pos;k++){const a=sr(0,6.283),d=sr(130,340);const p={x:V.x+Math.cos(a)*d,y:V.y+Math.sin(a)*d};if(ok(p))pos=p}
    if(pos)w.npcs.push({id:w.npcs.length,x:Math.round(pos.x),y:Math.round(pos.y),a:Math.atan2(V.y-pos.y,V.x-pos.x),v:V.id,name:V.name})}
  // owner 2026-11-23: weapons and armour rarely lie on the open ground (was 104 + 120) — search the houses, kill monsters, open chests
  for(let k=0;k<28;k++){const p=outSpot(300);w.items.push({id:iid++,k:'w',x:p.x,y:p.y,wk:WK[Math.floor(SR()*WK.length)],tier:pickTier([64,28,8,0],SR)})}
  for(let k=0;k<30;k++){const p=outSpot(300);w.items.push({id:iid++,k:'r',x:p.x,y:p.y,tier:pickTier([50,32,14,4,0],SR)})}
  for(let k=0;k<136;k++){const p=outSpot(300);w.items.push({id:iid++,k:'i',x:p.x,y:p.y,it:pickW(ITEMS,SR).id})}
  for(const V of w.villages)for(const it of['potion','potion','mana']){const a=sr(0,6.3),rr=V.plaza?120:82;w.items.push({id:iid++,k:'i',x:V.x+Math.cos(a)*rr,y:V.y+Math.sin(a)*rr,it})}
  // ---- neutral creep camps ----
  const tiers=[...Array(18).fill('ancient'),...Array(34).fill('large'),...Array(56).fill('medium'),...Array(64).fill('small')];
  for(const tier of tiers){for(let tries=0;tries<500;tries++){const p={x:sr(500,WORLD-500),y:sr(500,WORLD-500)};
      if(!free(p,230)||pathNear(p,105)||blockedGen(p,75)||inCastle(p,250))continue;if(w.camps.some(c=>dist(c,p)<600))continue;
      if(tier==='ancient'&&w.villages.some(v=>v.main&&dist(p,v)<1900))continue;
      const camp={id:w.camps.length,x:p.x,y:p.y,tier,mem:[],maxRespawn:99};const kinds=CAMP_KINDS[tier];
      kinds.forEach((kd,i)=>{const a=i/kinds.length*6.28+sr(0,1);const m={id:mid++,x:p.x+Math.cos(a)*(kinds.length>1?58:0),y:p.y+Math.sin(a)*(kinds.length>1?58:0),kind:kd,camp:camp.id};w.mobs.push(m);camp.mem.push(m.id)});
      w.camps.push(camp);break}}
  // ---- Arena Royale (owner 2026-11-21): lone Magma Titans in the Ashen Wastes (REG land 3), far apart, away from roads and villages ----
  if(CURSED&&!MOON){let n=0;for(let t=0;t<4000&&n<4;t++){const a=sr(.15,1.45),d=sr(3400,7200),p={x:CX+Math.cos(a)*d,y:CY+Math.sin(a)*d};
      if(REG.at(p.x,p.y)!==3||!free(p,240)||pathNear(p,110)||blockedGen(p,90)||inCastle(p,320)||w.villages.some(v=>dist(v,p)<v.r+520))continue;
      if(w.camps.some(c=>dist(c,p)<(c.tier==='magma'?2000:640)))continue;
      const camp={id:w.camps.length,x:p.x,y:p.y,tier:'magma',mem:[],maxRespawn:99},m={id:mid++,x:p.x,y:p.y,kind:'magma',camp:camp.id};w.mobs.push(m);camp.mem.push(m.id);w.camps.push(camp);n++}}
  // ---- graveyards: tombstones where the dead rise first when night falls ----
  {const gv=w.villages.find(v=>v.key==='grave');const tryG=p=>{if(!free(p,170)||pathNear(p,80)||w.graves.some(g=>dist(g,p)<2000)||w.camps.some(c=>dist(c,p)<520)||blockedGen(p,120))return false;
      const g={x:p.x,y:p.y,r:180,st:[]};for(let i=0;i<14&&g.st.length<9;i++){const a=sr(0,6.3),d=sr(40,150);const q={x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d};if(g.st.some(o=>dist(o,q)<52))continue;g.st.push({x:q.x,y:q.y,a:sr(-.35,.35),t:Math.floor(SR()*3)});w.rocks.push({x:q.x,y:q.y,r:13,prop:1})}
      w.graves.push(g);return true};
    if(gv)for(let t=0;t<80;t++){const a=sr(0,6.3),d=gv.r+sr(160,420);if(tryG({x:gv.x+Math.cos(a)*d,y:gv.y+Math.sin(a)*d}))break}
    for(let k=0;k<5000&&w.graves.length<10;k++)tryG({x:sr(900,WORLD-900),y:sr(900,WORLD-900)})}
  // ---- castle: guards in every wing, treasury loot that is worth the dragon's attention ----
  {const C=CS,L=C.loc,spot=(a0,a1,b0,b1)=>{for(let k=0;k<60;k++){const p=L(sr(Math.min(a0,a1),Math.max(a0,a1)),sr(b0,b1));if(!blockedGen(p,34)&&dist(p,C.lair)>200)return p}return L((a0+a1)/2,(b0+b1)/2)};
    const camp=(p,tier,sc)=>{const c={id:w.camps.length,x:p.x,y:p.y,tier,mem:[],maxRespawn:99,sc,rich:1};CAMP_KINDS[tier].forEach((kd,i)=>{const a=i/3*6.28;const m={id:mid++,x:p.x+Math.cos(a)*60,y:p.y+Math.sin(a)*60,kind:kd,camp:c.id,sc,rich:1};w.mobs.push(m);c.mem.push(m.id)});w.camps.push(c)};
    for(const g of C.wings){const lo=g.a0,hi=g.a1;camp(spot(lo,hi,C.DP*.18,C.DP*.4),'castle',1.25);camp(spot(lo,hi,C.DP*.6,C.DP*.85),'keep',1.3);
      for(let k=0;k<4;k++){const p=spot(lo,hi,g.b0,g.b1);w.items.push({id:iid++,k:'c',x:p.x,y:p.y,n:1+(SR()<.5?1:0),gold:SR()<.3})}
      for(let k=0;k<3;k++){const p=spot(lo,hi,g.b0,g.b1);w.items.push({id:iid++,k:'w',x:p.x,y:p.y,wk:WK[Math.floor(SR()*WK.length)],tier:pickTier([0,35,45,20],SR)})}
      for(let k=0;k<2;k++){const p=spot(lo,hi,g.b0,g.b1);w.items.push({id:iid++,k:'r',x:p.x,y:p.y,tier:pickTier([0,25,45,27,3],SR)})}
      for(let k=0;k<2;k++){const p=spot(lo,hi,g.b0,g.b1);w.items.push({id:iid++,k:'i',x:p.x,y:p.y,it:pickW(ITEMS,SR).id})}
      for(let k=0;k<3;k++){const p=spot(lo,hi,g.b0,g.b1);w.boxes.push({id:w.boxes.length,x:p.x,y:p.y,a:sr(0,6.3)});w.rocks.push({x:p.x,y:p.y,r:26,prop:1})}}
    camp(spot(-C.LH*.3,C.LH*.3,C.DP*.12,C.DP*.24),'castle',1.2);
    for(let k=0;k<3;k++){const p=spot(-C.LH*.3,C.LH*.3,C.DP*.12,C.DP*.4);w.items.push({id:iid++,k:'i',x:p.x,y:p.y,it:k?'potion':'mana'})}}
  // ---- dungeon contents: undead camps that come back, loot in every room, a vault behind the warden ----
  {const D=w.dg,spot=(R,m)=>{for(let k=0;k<60;k++){const p={x:sr(R.x+m,R.x+R.w-m),y:sr(R.y+m,R.y+R.h-m)};if(!blockedGen(p,36))return p}return{x:R.cx,y:R.cy}};
    const camp=(R,tier,sc)=>{const c={id:w.camps.length,x:R.cx,y:R.cy,tier,mem:[],maxRespawn:99,sc,rich:2,dg:1};CAMP_KINDS[tier].forEach((kd,i)=>{const a=i/CAMP_KINDS[tier].length*6.28;const m={id:mid++,x:R.cx+Math.cos(a)*90,y:R.cy+Math.sin(a)*90,kind:kd,camp:c.id,sc,rich:2,undead:/^z/.test(kd)?1:0};w.mobs.push(m);c.mem.push(m.id)});w.camps.push(c)};
    for(const R of D.rooms){
      if(R.role==='entry'){for(const it of['potion','potion','mana']){const p=spot(R,140);w.items.push({id:iid++,k:'i',x:p.x,y:p.y,it})}continue}
      if(R.role==='vault'){camp(R,'vault',1.7);
        for(let k=0;k<3;k++){const p=spot(R,120);w.items.push({id:iid++,k:'c',x:p.x,y:p.y,n:3,gold:true})}
        // owner 2026-11-23: "ปรับของหายากที่อยู่หลังบอส ในคุกเอาออกไป ให้เอาไปอยู่ในกล่องสุ่มสมบัติแทน" — the tier 3-4 weapons, runes and
        // the tome no longer lie on the vault floor; six gilded treasure chests (vault:1) hold them, rolled when opened (b.js openBox)
        for(let k=0;k<6;k++){const p=spot(R,90);w.boxes.push({id:w.boxes.length,x:p.x,y:p.y,a:sr(0,6.3),vault:1});w.rocks.push({x:p.x,y:p.y,r:26,prop:1})}
        continue}
      camp(R,R.role,1.35);
      for(let k=0;k<2;k++){const p=spot(R,110);w.items.push({id:iid++,k:'c',x:p.x,y:p.y,n:1+(SR()<.5?1:0)})}
      {const p=spot(R,110);w.items.push({id:iid++,k:'w',x:p.x,y:p.y,wk:WK[Math.floor(SR()*WK.length)],tier:pickTier([0,30,50,20],SR)})}
      {const p=spot(R,110);w.items.push({id:iid++,k:'r',x:p.x,y:p.y,tier:pickTier([0,25,45,27,3],SR)})}
      {const p=spot(R,110);w.items.push({id:iid++,k:'i',x:p.x,y:p.y,it:pickW(ITEMS,SR).id})}
      for(let k=0;k<2;k++){const p=spot(R,90);w.boxes.push({id:w.boxes.length,x:p.x,y:p.y,a:sr(0,6.3)});w.rocks.push({x:p.x,y:p.y,r:26,prop:1})}}
    // two stairways down, far apart in the valley; each has a way back in the entry hall
    for(let t=0;t<6000&&D.ents.length<2;t++){const p={x:sr(1500,WORLD-1500),y:sr(1500,WORLD-1500)};if(outsideD(p.x,p.y)>-900||!free(p,150)||blockedGen(p,110)||pathNear(p,70)||inCastle(p,450))continue;
      if(w.villages.some(v=>dist(p,v)<v.r+300)||w.camps.some(c=>dist(c,p)<450)||w.shrines.some(s=>dist(s,p)<500)||w.graves.some(g=>dist(g,p)<400))continue;if(D.ents.some(e=>dist(e,p)<(t<3000?7000:4500)))continue;
      const e={id:D.ents.length,x:p.x,y:p.y,r:62};D.ents.push(e);for(let k=0;k<4;k++){const a=k/4*6.283+.785;w.solids.push({x:p.x+Math.cos(a)*96,y:p.y+Math.sin(a)*96,r:20,t:'pillar'})}w.lanterns.push({x:p.x+96,y:p.y-130,torch:1},{x:p.x-96,y:p.y-130,torch:1})}
    if(!D.ents.length){const v=w.villages.find(q=>q.main)||{x:CX,y:CY};D.ents.push({id:0,x:v.x+420,y:v.y+420,r:62})}
    {const nearE=g=>D.ents.some(e=>Math.abs(e.x-g.x)<170&&dist(e,g)<170);w.grass=w.grass.filter(g=>!nearE(g));w.flowers=w.flowers.filter(g=>!nearE(g));w.mush=w.mush.filter(g=>!nearE(g));w.bushes=w.bushes.filter(g=>!D.ents.some(e=>dist(e,g)<170+g.r));w.tgrass=w.tgrass.filter(g=>!D.ents.some(e=>dist(e,g)<170+g.r))}
    const E=D.entry;D.ents.forEach((e,i)=>{const n=D.ents.length,px=E.cx+(n>1?(i?260:-260):0),py=E.cy+170;D.ports.push({x:px,y:py,r:62,to:{x:e.x,y:e.y+150},ent:i});e.to={x:D.arrive.x+(n>1?(i?80:-80):0),y:D.arrive.y}})}
  // ---- spawn points (where bots stand in balance sims; a real match drops everyone in from the sky, arena-drop.js) ----
  for(let i=0;i<TOTAL_HEROES;i++){let best=null,bs=-1e9;const a0=i/TOTAL_HEROES*Math.PI*2+sr(-.15,.15);
    for(let k=0;k<160;k++){const a=a0+sr(-.25,.25)*(1+k/60),f=sr(.42,.82);const rb=bndR(a);const p={x:CX+Math.cos(a)*rb*f,y:CY+Math.sin(a)*rb*f};
      if(!free(p,60)||blockedGen(p,40)||w.houses.some(h=>inRect(p,h.al||h,40)))continue;let sc=1e9;for(const s of w.spawns)sc=Math.min(sc,dist(p,s)-1000);for(const c of w.camps)if(dist(p,c)<450)sc-=600;for(const g of w.graves)if(dist(p,g)<520)sc-=600;
      if(sc>=0){best=p;break}if(sc>bs){bs=sc;best=p}}
    if(!best)best={x:CX+sr(-300,300),y:CY+sr(-300,300)};w.spawns.push(best);
    }   // owner 2026-11-23: no starter weapons by the spawn points — everyone drops in from the sky and searches houses (arena-drop.js)
  // ---- the Cursed Forest's dead (owner 2026-11-23): heaps of bones (decor) and fallen knights on their tombs, which a hero can
  // search for loot (arena-tombs.js: the longer the search, the better the find). Integer hash per cell, no SR draws; REG.at reads
  // this world (its Old Town), not the one before, so every machine places them alike ----
  if(!MOON&&typeof REG!=='undefined'&&REG.at){const W0=WD;WD=w;try{w.tombs=[];w.bones=[];const CS2=420,n2=Math.floor(WORLD/CS2),cells=[];
    for(let j=1;j<n2-1;j++)for(let i=1;i<n2-1;i++)cells.push([cutH(i,j,31),i,j]);cells.sort((a,b)=>a[0]-b[0]);
    for(const [h,i,j] of cells){if(w.tombs.length>=10&&w.bones.length>=20)break;
      const p={x:(i+.15+cutH(i,j,32)*.7)*CS2,y:(j+.15+cutH(i,j,33)*.7)*CS2};if(REG.at(p.x,p.y)!==1)continue;
      const tomb=h<.45&&w.tombs.length<10,r=tomb?64:46;
      if(!free(p,r+40)||pathNear(p,r+30)||rockNear(p,r+24)||!tFree(p,r+20)||w.houses.some(q=>inRect(p,q.al||q,r+50))||w.camps.some(c=>dist(c,p)<300)||w.graves.some(g=>dist(g,p)<300)||
        w.boxes.some(b=>dist(b,p)<200)||(w.dg&&w.dg.ents.some(e=>dist(e,p)<320)))continue;
      if(w.tombs.some(t=>dist(t,p)<(tomb?1100:380))||w.bones.some(b=>dist(b,p)<(tomb?380:520)))continue;
      const a=cutH(i,j,34)*6.2832;
      if(tomb){w.tombs.push({id:w.tombs.length,x:Math.round(p.x),y:Math.round(p.y),a});const dx=Math.sin(a)*24,dy=Math.cos(a)*24;
        w.rocks.push({x:p.x+dx,y:p.y+dy,r:36,prop:1},{x:p.x-dx,y:p.y-dy,r:36,prop:1})}
      else if(w.bones.length<20){const sc=.85+cutH(i,j,35)*.4;w.bones.push({x:Math.round(p.x),y:Math.round(p.y),a,s:sc});w.rocks.push({x:p.x,y:p.y,r:30*sc,prop:1})}}}
    finally{WD=W0}}
  SR=Math.random;
  return w;
}
// ---- match setup: how many heroes and how big the playable circle is.
// Rebuilt from the seed on host and clients alike, so the extra spawn points and starter weapons match everywhere.
const SIZE_F={S:.27,M:.52,L:1},SIZE_N={S:'เล็ก',M:'กลาง',L:'ใหญ่'};
let MC={n:TOTAL_HEROES,size:'L',ts:1},ARENA={x:CX,y:CY,r:9400,f:1},ASP=null;
const autoSize=n=>n<=6?'S':n<=16?'M':'L';
// ts = team size (1 free-for-all, 2 duo, 4 squad); n is rounded up to whole teams
function normCfg(c){c=c||{};const ts=[1,2,4].indexOf(c.ts|0)>=0?c.ts|0:1;let n=clamp((c.n|0)||TOTAL_HEROES,2,TOTAL_HEROES);n=Math.min(TOTAL_HEROES,Math.ceil(n/ts)*ts);if(n/ts<2)n=ts*2;
  return{n,size:SIZE_F[c.size]?c.size:autoSize(n),ts}}
function genArena(seed,cfg,items){MC=cfg;const f=SIZE_F[cfg.size];ASP=null;ARENA={x:CX,y:CY,r:(cfg.size==='L'&&WD&&WD.city?Math.max(9400,WD.city.far+250,WD.fort?WD.fort.far+250:0):9400)*f,f};   // a full match's first circle covers the Old Town and the Snow Queen's fort (index)if(cfg.size==='L')return;   // no squad starter kits either (2026-11-23)
  let s=((seed|0)^0x5bd1e995^(cfg.n*7919))>>>0;const R=()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
  const r0=ARENA.r,ok=(p,m)=>walkable(p.x,p.y,m)&&!inWater(p.x,p.y)&&!WD.houses.some(h=>inRect(p,h.al||h,30))&&!inCastleYard(p);
  // centre somewhere in the walkable heart of the valley, so the whole start circle is playable
  for(let k=0;k<120;k++){const a=R()*6.2832,d=R()*Math.max(0,6080-r0*.9);const p={x:CX+Math.cos(a)*d,y:CY+Math.sin(a)*d};if(ok(p,90)){ARENA.x=p.x;ARENA.y=p.y;break}}
  // one spawn point per team (per hero in free-for-all), each with enough starter weapons for the whole team
  const c=ARENA,n=Math.round(cfg.n/cfg.ts),nw=cfg.ts===1?2:cfg.ts+1,gap=Math.min(900,r0*.55);ASP=[];let iid=4000;
  for(let i=0;i<n;i++){const a0=i/n*6.2832+R()*.5;let best=null;
    for(let k=0;k<220&&!best;k++){const a=a0+(R()-.5)*(.4+k/40),d=r0*(.45+R()*.3);const p={x:c.x+Math.cos(a)*d,y:c.y+Math.sin(a)*d};if(ok(p,60)&&!ASP.some(q=>dist(p,q)<gap*(k<120?1:.5)))best=p}
    for(let k=0;k<300&&!best;k++){const p={x:c.x+(R()-.5)*r0*1.2,y:c.y+(R()-.5)*r0*1.2};if(ok(p,40))best=p}
    if(!best)best={x:c.x,y:c.y};ASP.push(best);
    const k1=Math.floor(R()*WK.length);let k2=Math.floor(R()*(WK.length-1));if(k2>=k1)k2++;const a1=R()*6.3;const kit=[[WK[k1],a1],[WK[k2],a1+Math.PI]];
    for(let q=2;q<nw;q++)kit.push([WK[Math.floor(R()*WK.length)],a1+q*1.9]);
    for(const [wk,ang] of kit)for(let t=0;t<40;t++){const a=ang+t*.7,d=120+R()*70+(nw>2?40:0);const p={x:best.x+Math.cos(a)*d,y:best.y+Math.sin(a)*d};if(ok(p,26)){items.push({id:iid++,k:'w',x:p.x,y:p.y,wk,tier:0});break}}}}
// team games: two extra starter weapons by every spawn point so a whole squad can arm up where it lands
function teamKit(seed,items){let s=((seed|0)^0x2c1b3c6d)>>>0;const R=()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
  let iid=4600;const ok=p=>walkable(p.x,p.y,26)&&!inWater(p.x,p.y)&&!WD.houses.some(h=>inRect(p,h.al||h,10));
  for(const sp of WD.spawns){const a0=R()*6.3;for(let k=0;k<2;k++){const wk=WK[Math.floor(R()*WK.length)];for(let t=0;t<30;t++){const a=a0+k*Math.PI+Math.PI/2+t*.6,d=150+R()*80;const p={x:sp.x+Math.cos(a)*d,y:sp.y+Math.sin(a)*d};if(ok(p)){items.push({id:iid++,k:'w',x:p.x,y:p.y,wk,tier:0});break}}}}}
// ---- static collision grid (rocks, trees, solids, walls) ----
function buildCollide(w){const C=200,n=Math.ceil(WORLD/C);const cells=Array.from({length:n*n},()=>[]);
  const add=(o,x0,y0,x1,y1)=>{for(let cy=Math.max(0,Math.floor(y0/C));cy<=Math.min(n-1,Math.floor(y1/C));cy++)for(let cx=Math.max(0,Math.floor(x0/C));cx<=Math.min(n-1,Math.floor(x1/C));cx++)cells[cy*n+cx].push(o)};
  for(const r of w.rocks)add({c:1,x:r.x,y:r.y,r:r.r},r.x-r.r,r.y-r.r,r.x+r.r,r.y+r.r);
  for(const r of w.solids)add({c:1,x:r.x,y:r.y,r:r.r},r.x-r.r,r.y-r.r,r.x+r.r,r.y+r.r);
  for(const t of w.trees)add({c:1,x:t.x,y:t.y,r:t.r},t.x-t.r,t.y-t.r,t.x+t.r,t.y+t.r);
  for(const q of w.walls)add({c:0,x:q.x,y:q.y,w:q.w,h:q.h},q.x,q.y,q.x+q.w,q.y+q.h);
  w.cg={C,n,cells}}
function forObstacles(x,y,r,fn){const g=WD.cg,C=g.C,n=g.n;
  const x0=Math.max(0,Math.floor((x-r)/C)),x1=Math.min(n-1,Math.floor((x+r)/C)),y0=Math.max(0,Math.floor((y-r)/C)),y1=Math.min(n-1,Math.floor((y+r)/C));
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){const L=g.cells[cy*n+cx];for(let i=0;i<L.length;i++)if(fn(L[i])===true)return true}return false}
function blockedAt(p,r){if(sdfAt(p.x,p.y)<r)return true;return forObstacles(p.x,p.y,r,o=>o.c===1?((p.x-o.x)**2+(p.y-o.y)**2<(o.r+r)**2):circRect(p.x,p.y,r,o))}
function houseAt(p){for(const h of WD.houses)if(inRect(p,h))return h;return null}
function inDG(p,m){const D=WD&&WD.dg;m=m||0;return !!D&&p.x>D.x-m&&p.x<D.x+D.w+m&&p.y>D.y-m&&p.y<D.y+D.h+m}
function caveAt(p){for(const c of WD.caves)if(dist(p,c)<c.R-8)return c;return null}
function inCastleYard(p){const C=WD.castle;return C&&p.x>C.x&&p.x<C.x+C.w&&p.y>C.y&&p.y<C.y+C.h}
// ---- navigation grid + A* (host only) ----
let NAV=null;
function buildNav(){const C=60,n=Math.ceil(WORLD/C),g=new Uint8Array(n*n);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=i*C+C/2,y=j*C+C/2;let b=0;
    if(sdfAt(x,y)<24)b=1;
    else if(forObstacles(x,y,22,o=>o.c===1?((x-o.x)**2+(y-o.y)**2<(o.r+22)**2):circRect(x,y,22,o)))b=1;
    else for(const h of WD.houses)if(inRect({x,y},h.al||h,20)){b=1;break}
    g[j*n+i]=b}
  NAV={C,n,g,gs:new Float32Array(n*n),fs:new Float32Array(n*n),came:new Int32Array(n*n),gen:new Uint32Array(n*n),closed:new Uint32Array(n*n),heap:new Int32Array(n*n*8),stamp:0}}
function navBlocked(x,y){const N=NAV;const i=Math.floor(x/N.C),j=Math.floor(y/N.C);if(i<0||j<0||i>=N.n||j>=N.n)return true;return N.g[j*N.n+i]===1}
function losClear(x0,y0,x1,y1){const d=Math.hypot(x1-x0,y1-y0),st=Math.max(1,Math.ceil(d/28));for(let k=1;k<=st;k++){const t=k/st;if(navBlocked(x0+(x1-x0)*t,y0+(y1-y0)*t))return false}return true}
// path searches are rationed per frame (undefined = try again next frame) so a crowd re-pathing at once can't stall the host
let PATHB=1e9;
function findPath(sx,sy,tx,ty){
  const N=NAV;if(!N)return null;if(PATHB<=0)return undefined;PATHB--;const C=N.C,n=N.n,g=N.g;
  const cellOf=(x,y)=>clamp(Math.floor(y/C),0,n-1)*n+clamp(Math.floor(x/C),0,n-1);
  const freeNear=c=>{if(!g[c])return c;const cx=c%n,cy=(c/n)|0;for(let r=1;r<=6;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=n||y>=n)continue;if(!g[y*n+x])return y*n+x}return -1};
  const s=freeNear(cellOf(sx,sy)),t=freeNear(cellOf(tx,ty));if(s<0||t<0)return null;if(s===t)return[{x:tx,y:ty}];
  const st=++N.stamp,gs=N.gs,fs=N.fs,came=N.came,gen=N.gen,closed=N.closed,heap=N.heap;let hl=0;
  const tx0=t%n,ty0=(t/n)|0;const hh=i=>{const dx=Math.abs(i%n-tx0),dy=Math.abs(((i/n)|0)-ty0);return dx+dy-.5858*Math.min(dx,dy)};
  const push=i=>{if(hl>=heap.length)return;let k=hl++;heap[k]=i;while(k>0){const p=(k-1)>>1;if(fs[heap[p]]<=fs[heap[k]])break;const tmp=heap[p];heap[p]=heap[k];heap[k]=tmp;k=p}};
  const pop=()=>{const top=heap[0];const last=heap[--hl];if(hl>0){heap[0]=last;let k=0;for(;;){const l=2*k+1,r=l+1;let m=k;if(l<hl&&fs[heap[l]]<fs[heap[m]])m=l;if(r<hl&&fs[heap[r]]<fs[heap[m]])m=r;if(m===k)break;const tmp=heap[m];heap[m]=heap[k];heap[k]=tmp;k=m}}return top};
  gen[s]=st;gs[s]=0;fs[s]=hh(s);came[s]=-1;push(s);let found=false,exp=0;
  while(hl>0&&exp<14000){const c=pop();if(closed[c]===st)continue;closed[c]=st;exp++;if(c===t){found=true;break}
    const cx=c%n,cy=(c/n)|0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=n||ny>=n)continue;const ni=ny*n+nx;if(g[ni]||closed[ni]===st)continue;
      if(dx&&dy&&(g[cy*n+nx]||g[ny*n+cx]))continue;const cost=gs[c]+(dx&&dy?1.4142:1);
      if(gen[ni]!==st||cost<gs[ni]){gen[ni]=st;gs[ni]=cost;came[ni]=c;fs[ni]=cost+hh(ni)*1.15;push(ni)}}}
  if(!found)return null;
  const cells=[];for(let c=t;c!==-1;c=came[c])cells.push(c);cells.reverse();
  const pts=cells.map(c=>({x:(c%n)*C+C/2,y:((c/n)|0)*C+C/2}));pts[pts.length-1]={x:tx,y:ty};
  const out=[];let cur={x:sx,y:sy},i=0;
  while(i<pts.length-1){let k=i+1;while(k+1<pts.length&&k-i<14&&losClear(cur.x,cur.y,pts[k+1].x,pts[k+1].y))k++;out.push(pts[k]);cur=pts[k];i=k}
  if(!out.length)out.push(pts[pts.length-1]);return out;
}
// ---- masks: R = dirt roads, G = cobble (plazas, castle, bridges), B = farm fields ----
function paintMasks(S){const n=Math.round(WORLD*S),m=document.createElement('canvas');m.width=m.height=n;const c=m.getContext('2d',{willReadFrequently:true});c.fillStyle='#000';c.fillRect(0,0,n,n);
  c.globalCompositeOperation='lighter';c.lineCap='round';c.lineJoin='round';
  for(const p of WD.paths){const w=p[4]||64;c.strokeStyle='rgba(255,0,0,.45)';c.lineWidth=w*1.45*S;c.beginPath();c.moveTo(p[0]*S,p[1]*S);c.lineTo(p[2]*S,p[3]*S);c.stroke();c.strokeStyle='rgba(255,0,0,.6)';c.lineWidth=w*.9*S;c.stroke()}
  for(const v of WD.villages){const R=(CURSED&&v.r?v.r*.97:v.plaza?235:140)*S;const g=c.createRadialGradient(v.x*S,v.y*S,R*.6,v.x*S,v.y*S,R);g.addColorStop(0,'rgba(0,255,0,1)');if(CURSED)g.addColorStop(.86,'rgba(0,255,0,1)');g.addColorStop(1,'rgba(0,255,0,0)');c.fillStyle=g;c.fillRect((v.x*S-R),(v.y*S-R),R*2,R*2)}
  if(WD.dg){const D=WD.dg;c.fillStyle='rgb(0,255,0)';c.fillRect(D.x*S,D.y*S,D.w*S,D.h*S)}
  for(const P0 of[WD.city,WD.fort])if(P0&&P0.paint)for(const q of P0.paint){if(q.length===3){const g=c.createRadialGradient(q[0]*S,q[1]*S,q[2]*S*.75,q[0]*S,q[1]*S,q[2]*S);g.addColorStop(0,'rgba(0,255,0,1)');g.addColorStop(1,'rgba(0,255,0,0)');c.fillStyle=g;c.fillRect((q[0]-q[2])*S,(q[1]-q[2])*S,q[2]*2*S,q[2]*2*S)}
    else{c.strokeStyle='rgba(0,255,0,.95)';c.lineWidth=q[4]*S;c.beginPath();c.moveTo(q[0]*S,q[1]*S);c.lineTo(q[2]*S,q[3]*S);c.stroke()}}
  {const C=WD.castle;c.fillStyle='rgb(0,255,0)';c.fillRect(C.x*S,C.y*S,C.w*S,C.h*S);c.strokeStyle='rgba(0,255,0,.9)';c.lineWidth=150*S;c.beginPath();c.moveTo(C.gate.x*S,C.gate.y*S);c.lineTo(C.out.x*S,C.out.y*S);c.stroke()}
  for(const s of WD.shrines){c.fillStyle='rgba(0,255,0,.85)';c.beginPath();c.arc(s.x*S,s.y*S,92*S,0,7);c.fill()}
  for(const cv of WD.caves){c.fillStyle='rgba(255,0,0,.9)';c.beginPath();c.arc(cv.x*S,cv.y*S,(cv.R+30)*S,0,7);c.fill();c.strokeStyle='rgba(255,0,0,.9)';c.lineWidth=(cv.w*2+40)*S;c.beginPath();c.moveTo(cv.mx*S,cv.my*S);c.lineTo(cv.x*S,cv.y*S);c.stroke()}
  for(const f of WD.fields){c.save();c.translate(f.x*S,f.y*S);c.rotate(f.a);c.fillStyle='rgba(0,0,255,1)';const st=26;for(let x=-f.w/2;x<f.w/2;x+=st){c.fillRect(x*S,-f.h/2*S,st*.55*S,f.h*S)}c.fillStyle='rgba(255,0,0,.35)';c.fillRect(-f.w/2*S,-f.h/2*S,f.w*S,f.h*S);c.restore()}
  return m}
// ---- ground painting (2D map / minimap) ----
function buildGround(S){
  const n=Math.round(WORLD*S),g=document.createElement('canvas');g.width=g.height=n;const c=g.getContext('2d',{willReadFrequently:true});
  const md=paintMasks(S).getContext('2d').getImageData(0,0,n,n).data;
  const img=c.createImageData(n,n),D=img.data;const Nb=makeNoise(mulberry32(91),240),Nd=makeNoise(mulberry32(17),55);const nz=WD.noise,e=Math.max(30,1/S);
  for(let py=0;py<n;py++){const y=(py+.5)/S;for(let px=0;px<n;px++){const x=(px+.5)/S,i=(py*n+px)*4;
    const h=heightAt(x,y)-(WD.city?cityBase(x,y):0);const k=Nb(x,y)*.65+Nd(x,y)*.35;let r,gg,b;
    if(h>18){const hx=heightAt(x+e,y)-heightAt(x-e,y),hy=heightAt(x,y+e)-heightAt(x,y-e);const sh=clamp(1-(hx+hy)/e*.22,.5,1.4);
      const rk=clamp((h-60)/380,0,1);r=lerp(70,118,rk)+k*22;gg=lerp(104,112,rk)+k*20;b=lerp(54,106,rk)+k*18;
      if(h>1000){const s=clamp((h-1000)/180,0,1);r=lerp(r,236,s);gg=lerp(gg,240,s);b=lerp(b,248,s)}r*=sh;gg*=sh;b*=sh}
    else{const dk=direK(x,y);const fo=clamp((nz(x,y)-.47)/.1,0,1);
      r=lerp(72+k*40,52+k*26,dk);gg=lerp(112+k*46,92+k*34,dk);b=lerp(48+k*20,82+k*30,dk);r*=1-.25*fo;gg*=1-.2*fo;b*=1-.22*fo;
      const ri=(py*n+px)*4;const mr=md[ri]/255,mg=md[ri+1]/255,mb=md[ri+2]/255;
      if(mb>0){r=lerp(r,150,mb*.55);gg=lerp(gg,128,mb*.55);b=lerp(b,60,mb*.55)}
      if(mr>0){const t=Math.min(1,mr*1.3);r=lerp(r,142+k*20,t);gg=lerp(gg,118+k*16,t);b=lerp(b,82+k*12,t)}
      if(mg>0){const t=Math.min(1,mg);r=lerp(r,150+k*30,t);gg=lerp(gg,146+k*28,t);b=lerp(b,138+k*24,t)}
      if(MOON){const q=REG.mix(x,y),L=(r*.3+gg*.59+b*.11)*q[3];r=r*(1-q[3])+L*q[0];gg=gg*(1-q[3])+L*q[1];b=b*(1-q[3])+L*q[2]}
      if(h<-1){const wd=clamp((-h-1)/18,0,1);r=lerp(150,26,wd);gg=lerp(140,86,wd);b=lerp(96,122,wd)}}
    D[i]=r;D[i+1]=gg;D[i+2]=b;D[i+3]=255}}
  c.putImageData(img,0,0);
  return g;
}
function buildMini(){GROUND=buildGround(.031);const m=document.createElement('canvas');m.width=m.height=240;const c=m.getContext('2d');c.drawImage(GROUND,0,0,240,240);const k=240/WORLD;
  c.fillStyle='rgba(20,50,24,.45)';for(const t of WD.trees)c.fillRect(t.x*k-1,t.y*k-1,2,2);
  for(const h of WD.houses){c.fillStyle=h.dire?'#9a7ab8':'#e0b080';c.fillRect(h.x*k,h.y*k,Math.max(2,h.w*k),Math.max(2,h.h*k))}
  const C=WD.castle;c.fillStyle='#b8b0a0';c.fillRect(C.x*k,C.y*k,C.w*k,C.h*k);c.fillStyle='#6a6458';c.fillRect(C.x*k+2,C.y*k+2,C.w*k-4,C.h*k-4);
  c.fillStyle='#c8a46a';for(const b of WD.bridges)c.fillRect(b.x*k-2,b.y*k-2,4,4);
  MINI=m}
