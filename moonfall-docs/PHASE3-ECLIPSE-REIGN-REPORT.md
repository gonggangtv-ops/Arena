# Phase 3 — Eclipse Reign · รายงานการพัฒนา (Claude, 2026-11-17)

Branch `claude/eclipse-reign-p3` → PR #15 เข้า `main` (เจ้าของอนุมัติให้ rig + merge 2026-11-17)
หมายเหตุ: เอกสาร handoff สั่งให้เปิด PR เข้า `gh-pages` แต่ `AGENTS.md` ข้อ 1 ห้าม (gh-pages ถูกเขียนทับทุกครั้งที่ deploy) จึงเปิดเข้า `main` แทน — การไม่ merge = ไม่ deploy

## 1. โมเดล Meshy (ไม่ใช้เครดิตเพิ่ม)
ดาวน์โหลดจาก task เดิมทั้ง 6 ตัวผ่าน Meshy MCP (ฟรี) → เจ้าของแนบไฟล์ → ย่อด้วย `mfpack` (base 1024 JPEG, normal/emission 512, ตัด MR/AO, quantize)

| key | ดิบ | หลังย่อ | สามเหลี่ยม | skinned | clips | ใช้เป็น |
|---|---|---|---|---|---|---|
| celestial-overlord | 10.3 MB | 0.93 MB | 24,573 | ไม่ | 0 | บอส (สูง 300) |
| dark-sentinel | 7.3 MB | 0.51 MB | 14,269 | ไม่ | 0 | ศัตรูประชิด (สูง 152) |
| lunar-construct | 10.4 MB | 0.52 MB | 14,769 | ไม่ | 0 | โกเลมหนัก (สูง 205) |
| lunar-greatsword | 6.4 MB | 0.28 MB | 4,820 | ไม่ | 0 | อาวุธในตำนาน (gsword) |
| eclipse-scythe | 9.5 MB | 0.33 MB | 5,117 | ไม่ | 0 | อาวุธในตำนาน (axe) |
| moon-staff | 8.2 MB | 0.30 MB | 4,510 | ไม่ | 0 | อาวุธในตำนาน (frost) |

- ทุกตัวเป็น **static mesh ไม่มี rig และไม่มี animation clip** · manifest ระบุ `rigged:false, animations:[]`
- ทิศ: หน้าหัน +Z ตรงกับระบบเกม · pivot ปรับเป็นฐานกลางโดย `celestialAsset` · อาวุธหมุน/ตั้ง grip ใน `eclipse-fx.js` (`LGW`)

### Rig + animation (เจ้าของอนุมัติเครดิต · ใช้ 69 เครดิต: rig 5×3 + animation 3×6×3)
| ตัว | rig task | animation task | clips (เรียงตามที่สั่ง) | ไฟล์ |
|---|---|---|---|---|
| celestial-overlord | 01a1e9f7-65d4-7039-a329-8e4671097bac | 01a1e9f9-5727-7183-8eb0-1510c9fae885 | Combat_Stance, Slow_Orc_Walk_inplace, Sword_Judgment, Charged_Spell_Cast, Charged_Ground_Slam, Dead | 1.57 MB |
| dark-sentinel | 01a1e9f7-3549-74b9-a788-e2da9f9d0bb8 | 01a1e9f9-4dfc-7175-b249-47b946d06bc6 | Combat_Stance, Casual_Walk_inplace, Triple_Combo_Attack, Sword_Parry, Hit_Reaction, Dead | 0.94 MB |
| lunar-construct | 01a1e9f7-5230-775c-9b95-708193aa4eed | 01a1e9f9-528b-7511-b930-e1c0d88360b9 | Combat_Stance, Slow_Orc_Walk_inplace, Heavy_Hammer_Swing, Charged_Ground_Slam, Hit_Reaction, Knock_Down | 0.89 MB |
- โครง 24 กระดูก (Meshy humanoid) · ย่อด้วย `skpack2.mjs`: เท็กซ์เจอร์ 1024, resample animation, quantize เฉพาะ normal/uv/weights (ไม่แตะ position เพื่อไม่ให้ skin เพี้ยน)
- `celestial-assets.js` ยอม skinned สำหรับ 3 key นี้ · `eclipse-fx.js`: SkeletonUtils.clone + AnimationMixer, จับคู่ clip ตามชื่อ (fallback ตามลำดับ), สะโพกล็อก x/z (in-place), idle↔walk blend, ท่าโจมตี/ร่าย/ทุบเล่นตาม event `ec cast` ปรับความเร็วให้จบตรงจังหวะ telegraph, Sentinel ยกโล่/เซ, ท่าตายเล่นจนจบก่อนหาย
- โมเดล static เดิมยังเป็น fallback ถ้าไฟล์ rig โหลดไม่ได้
- ศัตรูถืออาวุธในตำนานที่กระดูก RightHand (`ECW` ใน eclipse-fx.js): Overlord = Lunar Greatsword, Sentinel = Eclipse Scythe, Construct = Moon Staff · แกนใบมีด = +Z ของกระดูกมือ (ตรวจด้วยภาพ preview 5 ทิศ)

## 2. สิ่งที่ทำ (ไฟล์)
- `src/eclipse.js` (ใหม่, ตรรกะ host): CREEPS 3 ตัว · แท่นบูชา 1 จุด (ancient camp ที่ใกล้กลางแผนที่สุด) · ค่าย Sentinel/Construct (ห่างแท่น ≥1600) · AI · ท่าบอส 3 เฟส · block/weak point/stagger ผ่าน `dealDamage` · ดรอปอาวุธในตำนาน · proc อาวุธ
- `src/eclipse-fx.js` (ใหม่, ภาพ): สร้างตัวจาก GLB + การเคลื่อนไหวแบบ procedural · แถบเลือดบอส (DOM, ไม่บังการแตะ) · ท้องฟ้ามืดตอน Ultimate · แท่นบูชา · VFX 11 แบบ · ติดอาวุธ Meshy ในมือ (KayKit/Quaternius/procedural hero) · ลด bloom เมื่อเอฟเฟกต์เยอะ
- `src/c.js`: แถว hero ส่ง id อาวุธในตำนาน · แถว mob ส่งชนิดของบริวารที่บอสเรียก (client สร้างตัวเอง) · ลบบริวารที่หายจาก snapshot เหมือนซอมบี้
- `src/r4.js`: ความสูงแถบเลือดเหนือหัวของ 3 ตัวใหม่ · `src/build.py`: รวม 2 ไฟล์ใหม่ (เฉพาะ CURSED) + key โมเดล
- `app/src/main/assets/assets/meshy/`: GLB 6 ไฟล์ + manifest

ไม่เปลี่ยน: สูตรดาเมจอาวุธ, สกิลเดิม, การควบคุม/ปุ่มสัมผัส, collision/nav เดิม, สถาปัตยกรรม host-authoritative

## 3. ระบบ
**Celestial Overlord** (HP 16,000 ×scale, armor 8, r 64, leash 900, ไม่เกิดใหม่)
- เฟส A (100–70%): ตีธรรมดา · Moon Slash (กรวย 560, เตือน .75 วิ) · Heavy Strike (วง 175 ที่ตัวเป้า, เตือน 1 วิ, สตัน .5)
- เฟส B (70–35%): + Eclipse Burst (วง 440 รอบตัว, ผลัก) · เรียก Sentinel 2 ตัว (สูงสุด 4) · คูลดาวน์เร็วขึ้น ×0.86
- เฟส C (<35%): + Celestial Rain (8–11 จุดตกทยอย) · Void Cage (วง 220 + เสา 8 ต้น, ตรึง 1.4 วิ — ออกจากวงทัน) · Ultimate Eclipse (ชาร์จ 3.2 วิ วง 1050 ยกเว้น "วงแสงจันทร์" 170 = จุดปลอดภัย) · คูลดาวน์ ×0.72
- เปลี่ยนเฟส: ประกาศ + สั่นจอ + คลื่นผลัก · ทุกท่ามี telegraph (aoe delay) · เป้าหนีออกนอกแท่น → เปลี่ยนไปตีคนที่ยังอยู่ · ไม่มีเป้า 4 วิ → ฟื้นเลือด
- ตาย: อาวุธในตำนานร่วง 3 ชิ้น (tier SSR) + บริวารตายตาม
**Dark Sentinel**: ลาดตระเวนรอบค่าย · เห็นผู้เล่นในระยะ 400 · คอมโบ 3 จังหวะ · ยกโล่ (ลดดาเมจด้านหน้า 75%) · สะสมแรงกระแทก → เซ (stagger)
**Lunar Construct**: ช้า (92) · Heavy Strike กรวยเตือน .85 วิ · Ground Slam วง 270 สตัน · armor 10 · **จุดอ่อนด้านหลัง ดาเมจ ×1.6** (มีแสงที่หลัง)
**อาวุธในตำนาน** (เก็บ id ไว้ในบิต 15–16 ของ `wv` จึงผ่านระบบดรอป/สลับอาวุธ/ออนไลน์เดิมได้):
- Lunar Greatsword (gsword): ทุก 3 ครั้ง → Moonlight Slash กรวย 330 · Eclipse Scythe (axe): ทุก 4 ครั้ง → Spinning Slash วง 200 · Moon Staff (frost): ทุก 3 ครั้ง → Eclipse Burst ที่เป้า
- โมเดล Meshy แทนโมเดลอาวุธเดิมใน hand socket เดิม (วัดแกน/ความยาวจากอาวุธเดิมอัตโนมัติ) + ประกายจากปลายอาวุธ
**คุณภาพภาพ**: Low (`ar_q` low/มือถือ auto) อนุภาค ×0.35 · Medium (high ไม่มี post) ×0.7 · High เต็ม · ลด bloom 45% เมื่อมี eclipse aoe > 6

## 4. ผลทดสอบ — Browser Emulation เท่านั้น (Chromium headless + SwiftShader, ไม่ใช่เครื่องจริง)
| รายการ | cursed.html (high) | index.html (low) |
|---|---|---|
| โหลด GLB 6 ตัว ผ่านงบ loader | ✅ | ✅ |
| แท่น + บอส + Sentinel 24 + Construct 6 (สร้างเหมือนกันทุกเครื่อง) | ✅ | ✅ |
| บอสเห็นผู้เล่น/telegraph/ตี (เฟส A dmg ~1,100 ใน 10 วิ) | ✅ | ✅ |
| เฟส B: Eclipse Burst + เรียกบริวาร 4 | ✅ | ✅ |
| เฟส C: Rain, Void Cage, Ultimate + วงปลอดภัย | ✅ | ✅ (ในวง 0 dmg / นอกวง 504) |
| ตาย → ดรอป 3 อาวุธ → สวม → โมเดลติดมือ + proc | ✅ | ✅ |
| Sentinel: detect/combo/block (400→100)/stagger | ✅ | ✅ |
| Construct: หน้า 500 / หลัง 800 | ✅ | ✅ |
| JS errors | 0 | 0 |

- แมตช์บอทเต็มเกม: index 2 รอบ, cursed 2 รอบ จบไม่มี error (พบและแก้ 1 บั๊ก: เอฟเฟกต์ถูกเรียกตอน sim ก่อนระบบอนุภาคพร้อม)
- ออนไลน์ 2 เครื่อง (PeerJS local, cursed): โลกเหมือนกัน · client เห็นเฟส/aoe/บริวาร · อาวุธในตำนานของ client ซิงก์ · บอสตายฝั่ง client · แถบบอสขึ้น/หายใน 2D · regression เดิม (พุ่ง/ร้าน/wv) ผ่าน
- **ยังไม่ได้ทดสอบ**: อุปกรณ์จริง (PC GPU, Android, iOS), FPS จริง, การแตะจริงบนมือถือ, memory profiling ระยะยาว — ตัวเลข FPS จาก SwiftShader ไม่มีความหมาย

## 5. งานค้าง / ข้อจำกัด
1. ~~ไม่มี rig~~ → rig แล้วทั้ง 3 ตัว (ดูหัวข้อ Rig) · ข้อจำกัด: ปีกของ Overlord ไม่มีกระดูกแยก (ขยับตามลำตัว) · ท่าตีของ Overlord ใช้ Sword Judgment (มือเปล่า)
2. hitbox เป็นวงกลม (r 64/28/50) ตามระบบเดิม ไม่ใช่ตามรูปปีก
3. 2D mode ใช้ telegraph สีของ aoe เดิม (ไม่มี VFX 3D) แต่มีแถบบอส
4. Medium quality ไม่มีตัวเลือกแยกในเมนู (= high ที่ไม่มี post)
5. ยังไม่ได้ทดสอบบนอุปกรณ์จริง
