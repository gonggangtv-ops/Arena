// Arena skill cards use the same level tables and hit formulas as the host.
const arenaSkillTime=n=>Number(n.toFixed(2))+' วิ';
const arenaSkillPercent=n=>Math.round(n*100)+'%';
const arenaSkillNumber=fmtN;
const arenaSkillNotes={
  sword:[
    (v,l)=>'พุ่งกระแทกเป้าหมายแรกและทำให้มึน '+arenaSkillTime(v.stun[l]),
    (v,l,a,h)=>'ได้โล่ '+arenaSkillNumber(v.sh[l]+.08*h)+' นาน 4 วิ',
    (v,l)=>'กระโดดฟันพื้นที่และทำให้ศัตรูมึน '+arenaSkillTime(v.stun[l])],
  axe:[
    ()=>'หมุนรอบตัวนาน 1.75 วิ โดนทุก 0.25 วิ และฟื้นเลือด 15% ของความเสียหาย',
    (v,l)=>'ลดความเร็วศัตรู '+arenaSkillPercent(v.slow[l])+' นาน 2.5 วิ · ตีเร็วขึ้น '+arenaSkillPercent(v.as[l])+' นาน 5 วิ · วิ่งเร็วขึ้น 30% นาน 3 วิ',
    (v,l)=>'ฟาดพื้นเป็นแนวหลัง 0.45 วิ และทำให้มึน '+arenaSkillTime(v.stun[l])],
  dagger:[
    ()=>'วาร์ปประชิดเป้าหมาย การโจมตีปกติครั้งถัดไปติดคริติคอล',
    (v,l)=>'ล่องหน '+arenaSkillTime(v.t[l])+' วิ่งเร็วขึ้น '+arenaSkillPercent(v.spd[l])+' และฟันจากเงาแรงขึ้น '+arenaSkillNumber(v.bs[l]),
    ()=>'หมุนฟันศัตรูใกล้ตัวทุก 0.2 วิ นาน 1.2 วิ ลดความเร็วศัตรู 20% และล้างสถานะช้ากับตรึงของผู้ใช้'],
  bow:[
    ()=>'ยิงศร 5 ทิศ เป้าหมายหนึ่งตัวรับความเสียหายได้ครั้งเดียว',
    (v,l)=>'ถอยจากจุดยิงและยิงศรตรึง '+arenaSkillTime(v.root[l]),
    ()=>'ศรตกทุก 0.3 วิ นาน 3 วิ และลดความเร็ว 30%'],
  fire:[
    ()=>'ยิงลูกไฟที่ระเบิดเป็นวงและสะสมสถานะเพลิง',
    (v,l,a,h,amp)=>'ผลักศัตรูรอบตัวและเผา '+arenaSkillNumber(v.burn[l]*amp)+' ต่อวิ นาน 3 วิ',
    (v,l,a,h,amp)=>'อุกกาบาตตกหลัง 0.85 วิ และเผา '+arenaSkillNumber(v.burn[l]*amp)+' ต่อวิ'],
  frost:[
    ()=>'หอกทะลุเป้าหมาย ลดความเร็ว 40% นาน 2 วิ และสะสมเย็นจัด',
    (v,l)=>'ตรึงรอบตัว '+arenaSkillTime(v.root[l])+' ลดความเร็ว 40% และสะสมเย็นจัด',
    (v,l)=>'พายุโจมตีทุก 0.4 วิ นาน 4 วิ ลดความเร็วและทำให้มึน '+arenaSkillTime(v.stun[l])+' ตอนจบ'],
  gsword:[
    (v,l)=>'ฟันเป็นกรวย ลดความเร็ว '+arenaSkillPercent(v.slow[l])+' นาน 1.6 วิ',
    ()=>'หมุนผลักศัตรูรอบตัวและทำให้มึน 0.5 วิ',
    ()=>'ปล่อยคลื่นทะลุศัตรู ลดความเร็ว 45% นาน 2 วิ'],
  xbow:[
    ()=>'ลูกดอกระเบิดเมื่อกระทบเป้าหมายหรือสุดระยะ',
    (v,l)=>'ยิงตาข่ายเป็นวง ตรึงศัตรู '+arenaSkillTime(v.root[l])+' และลดความเร็ว 40%',
    (v,l)=>'กระหน่ำยิงทุก 0.3 วิ นาน 1.8 วิ ลดความเร็วและทำให้มึน '+arenaSkillTime(v.stun[l])+' ตอนจบ'],
  storm:[
    (v,l)=>'ชิ่งได้สูงสุด '+v.n[l]+' เป้าหมาย ความเสียหายลด 20% ต่อการชิ่ง ทำให้มึน 0.18 วิ และสะสมประจุ',
    ()=>'สนามไฟฟ้าตามตัว โจมตีทุก 0.5 วิ นาน 3 วิ ลดความเร็วและสะสมประจุ',
    (v,l)=>'สายฟ้าฟาดทุก 0.32 วิ นาน 1.6 วิ ทำให้มึน '+arenaSkillTime(v.stun[l])+' ตอนจบ'],
  MM:[
    (v,l)=>'พุ่งฟันผ่านศัตรู ลดความเร็ว '+arenaSkillPercent(v.slow[l]),
    (v,l,a,h)=>'ได้โล่ '+arenaSkillNumber(v.sh[l]+.06*h)+' นาน 4 วิ · วิ่งเร็วขึ้น 30% นาน 3 วิ · ตีเร็วขึ้น '+arenaSkillPercent(v.as[l])+' และดูดเลือด 10% นาน 5 วิ',
    (v,l,a)=>'กระโดดฟัน ทำให้มึน '+arenaSkillTime(v.stun[l])+' แล้วฟันซ้ำ '+arenaSkillNumber(skillRoyalFollowup(v,l,a))],
  MR:[
    ()=>'ขว้างหอกทะลุศัตรู ลดความเร็ว 35% นาน 1.5 วิ',
    (v,l,a)=>'พุ่งและวิ่งเร็วขึ้น 30% นาน 2 วิ การโจมตีถัดไปติดคริติคอลและแรงขึ้น '+arenaSkillNumber(v.bs[l]+.3*a),
    ()=>'พายุรอบตัวโจมตีทุก 0.25 วิ นาน 2.2 วิ และฟื้นเลือด 15% ของความเสียหาย'],
  MS:[
    ()=>'ปล่อยคลื่นดาบทะลุศัตรูและสะสมสถานะธาตุ',
    ()=>'ออร่าธาตุตามตัว โจมตีทุก 0.5 วิ นาน 4 วิ',
    (v,l)=>'กระโดดลงกลางวงระเบิดธาตุ และทำให้มึน '+arenaSkillTime(v.stun[l])],
  RS:[
    ()=>'ศรธาตุสามทิศ เป้าหมายหนึ่งตัวรับความเสียหายได้ครั้งเดียว',
    ()=>'สร้างบ่อธาตุ โจมตีทุก 0.5 วิ นาน 4 วิ และลดความเร็ว 25%',
    (v,l)=>'ฝนศรธาตุทุก 0.3 วิ นาน 3 วิ ทำให้มึน '+arenaSkillTime(v.stun[l])+' ตอนจบ'],
  RR:[
    ()=>'ยิงรัว 6 นัดไปที่เป้าหมาย ลูกดอกแต่ละนัดระเบิดเมื่อกระทบ',
    (v,l)=>'กับดักระเบิดหลัง 0.9 วิ ตรึง '+arenaSkillTime(v.root[l])+' แล้วลดความเร็ว 40%',
    ()=>'ศรยักษ์ทะลุเป้าหมาย ผลักศัตรูและสะสมสถานะเพลิง'],
  SS:[
    ()=>'ปล่อยลูกแก้วสองธาตุแยกทิศ แต่ละลูกระเบิดเมื่อกระทบ',
    ()=>'ระเบิดรอบตัว ผลักศัตรูและสะสมสถานะทั้งสองธาตุ',
    (v,l)=>'พายุสองธาตุซ้อนกัน โจมตีทุก 0.35 วิ นาน 3.5 วิ ทำให้มึน '+arenaSkillTime(v.stun[l])+' ตอนจบ'],
};
const arenaTickSkills=new Set(['axe0','dagger2','bow2','frost2','xbow2','storm1','storm2','MR2','MS1','RS1','RS2','SS2','fOR2']);

function arenaSpiritSkillNote(me,i,V,level,attack,amp){
  const {soKit,soEl,spiritAttackDamage,spiritGuardianDamage}=SUMMONER;
  const kit=soKit(me.wk),el=soEl(me.wk),element=el?'ธาตุ'+ELEM[el].n:'';
  if(i===0){
    const hit=spiritAttackDamage(V,level,attack,amp,kit);
    const n=V.n[level],wolf=V.wolf?.[level]||0;
    const kind=kit==='M'?'อัศวินวิญญาณ':kit==='R'?'ภูติพราน':'ภูติ'+element;
    const health=V.hp[level]+me.maxHp*(kit==='M'?.07:kit==='R'?.04:.05);
    return 'เรียก'+kind+' '+n+' ตน นาน '+arenaSkillTime(V.t[level])+' · เลือด '+arenaSkillNumber(health)+
      ' · โจมตี '+arenaSkillNumber(hit)+(wolf?' · หมาป่า '+wolf+' ตัว โจมตี '+arenaSkillNumber(hit*1.35)+' · เลือด '+arenaSkillNumber(health*1.8):'');
  }
  if(i===1){
    const common='สั่งวิญญาณรุมเป้าหมายและฟื้นเลือดให้พวกมัน 25%';
    if(kit==='M')return common+' · อัศวินพุ่งชนด้วย 120% ของพลังโจมตี ทำให้มึน '+arenaSkillTime(V.stun[level]);
    if(kit==='R')return common+' · วิญญาณยิง 3 นัด นัดละ 80% ของพลังโจมตี และตีตราให้วิญญาณตีแรงขึ้น '+arenaSkillPercent(V.mark[level])+' นาน '+arenaSkillTime(V.t);
    return common+' · เพิ่มความเสียหายของวิญญาณ '+arenaSkillPercent(V.buff[level])+' นาน '+arenaSkillTime(V.t)+(el?' · หอกสะสมสถานะ'+element:'');
  }
  if(kit==='R')return 'ฝนศรทุก 0.3 วิ นาน 3 วิ พร้อมเรียกภูติพราน '+V.n[level]+' ตน นาน '+arenaSkillTime(V.t[level])+
    ' · โจมตี '+arenaSkillNumber(spiritAttackDamage(SKV.fOR[0],Math.min(3,level+1),attack,amp,kit));
  return 'เรียก'+(kit==='M'?'ขุนพลวิญญาณ':'ผู้พิทักษ์'+element)+' กระแทกพื้นที่ ทำให้มึน '+arenaSkillTime(V.stun[level])+
    ' · อยู่ '+arenaSkillTime(V.t[level])+' · เลือด '+arenaSkillNumber(V.hp[level]+.12*me.maxHp)+
    ' · โจมตี '+arenaSkillNumber(spiritGuardianDamage(V,level,attack,amp))+(kit==='M'?' · ผู้ใช้รับความเสียหายลดลง '+arenaSkillPercent(V.dr):'');
}

function arenaSkillDetails(me,i){
  if(i===3){
    const S=SPX[me.xs|0];
    if(!S)return {name:'สกิลพิเศษ',state:'ซื้อสกิลจากพ่อค้าในหมู่บ้าน'};
    const level=specialLevel(me),hit=S.k==='meteor'||S.k==='nova'?specialHitDamage(me,S.k):null;
    const notes={
      blink:'วาร์ปทันทีในระยะ '+SPECIAL_BY.blink.reach+' หน่วย',
      heal:'ฟื้นเลือด '+Math.round(SPECIAL_BY.heal.heal[level]*100)+'% ใน '+SPECIAL_BY.heal.duration+' วิ และล้างสถานะช้า',
      rage:'ตีเร็วขึ้น '+Math.round(SPECIAL_BY.rage.haste[level]*100)+'% วิ่งเร็วขึ้น 30% และเพิ่มความเสียหาย '+Math.round(SPECIAL_BY.rage.damageBonus*100)+'% นาน '+SPECIAL_BY.rage.duration+' วิ',
      meteor:'อุกกาบาตตกหลัง '+arenaSkillTime(METEOR.delay)+' และเผาศัตรู '+arenaSkillNumber((METEOR.burn+me.lvl)*specialScale(level))+' ต่อวิ',
      ward:'ได้โล่ '+Math.round(SPECIAL_BY.ward.shield[level]*100)+'% ของเลือดสูงสุด นาน '+SPECIAL_BY.ward.duration+' วิ',
      nova:'ระเบิดรอบตัว ตรึงศัตรู '+SPECIAL_BY.nova.root+' วิ และลดความเร็ว '+Math.round(SPECIAL_BY.nova.slowAmt*100)+'% นาน '+SPECIAL_BY.nova.slow+' วิ'
    };
    return {name:S.n,level:level+1,state:me.xcd>0?'ฟื้นฟู '+arenaSkillTime(Math.ceil(me.xcd)):'พร้อมใช้',
      cooldown:S.cd[level],damage:hit==null?null:'เวท '+arenaSkillNumber(hit),note:notes[S.k]};
  }
  const W=me.wk,skill=W&&SK[W]?.[i];
  if(!skill)return {name:'ช่องสกิล',state:'เก็บอาวุธเพื่อปลดล็อกสกิล'};
  const rank=me.skl[i]||0,level=Math.max(0,rank-1),V=SKV[W][i];
  const rune=wvR(me.wv,i),power=skillRunePower(rune),attack=me.atkDmg*power;
  const amp=(1+spellAmp(me))*power,spell=amp*SKILL_K,arch=WEAPONS[W].arch||W;
  const spirit=SUMMONER.SO(W),key=spirit&&W==='fOR'&&i===2?'fOR2':(spirit?'SO':arch)+i;
  const hit=skillHitDamage(key,V,level,attack,spell);
  const magic=['fire','frost','storm','SS'].includes(arch)||spirit||key==='MS1'||key==='RS1';
  const suffix=key==='SS2'?' ต่อธาตุต่อจังหวะ':arenaTickSkills.has(key)?' ต่อจังหวะ':key==='RR0'?' ต่อนัด':key==='SS0'?' ต่อลูก':'';
  const note=spirit?arenaSpiritSkillNote(me,i,V,level,attack,amp):arenaSkillNotes[arch][i](V,level,attack,me.maxHp,spell);
  const cost=skill.mp[level];
  const state=!rank?'ยังไม่ปลดล็อก · ค่าของเลเวล 1':me.cd[i]>0?'ฟื้นฟู '+arenaSkillTime(Math.ceil(me.cd[i])):
    me.mp<cost?'มานาไม่พอ':me.stunT>0?'ติดสถานะมึน':'พร้อมใช้';
  return {
    name:skill.n,level:level+1,state,
    cost,cooldown:skill.cd[level]*cdMul(me)*skillRuneCooldown(rune),
    damage:hit==null?null:(magic?'เวท ':'กายภาพ ')+arenaSkillNumber(hit)+suffix,
    note,rune:RUNES[rune]?.d,
  };
}
