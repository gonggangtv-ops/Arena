# Phase 5 — Celestial Armory · รายงาน (Claude, 2026-11-18)

เอกสารต้นทาง: `PHASE5-CHARACTER-RIG-HANDOFF.md`, `PHASE5-FIVE-CLASS-EXPORTS.md` (branch `feat/phase5-celestial-armory-rig-handoff`)
เจ้าของอนุมัติ: rig ครบ 5 อาชีพทีเดียว (~115 เครดิต) · โมเดลเปลี่ยนตามอาวุธที่ถือ · โฟกัส `index.html`
หมายเหตุ: เอกสารสั่ง PR เข้า `gh-pages` แต่ AGENTS.md ข้อ 1 ห้าม → PR เข้า `main`

## โมเดล + rig (Meshy, ใช้ 115 เครดิต: rig 5×5 + animation 6 clip × 3 × 5)
| อาชีพ | image-to-3d | rig task | animation task | clips (ตามลำดับ) | หลังย่อ |
|---|---|---|---|---|---|
| Warrior | 01a1ea26-0d4d-74da-8fa6-20180724290f | 01a1ea5f-67e7-73ae-b164-c05751c90298 | 01a1ea60-6c4e-7669-a817-c8743cd8d7ad | Combat_Stance, Run_02, Left_Slash, Charged_Ground_Slam, Roll_Dodge, Dead | 10.7k tris · 0.94 MB |
| Assassin | 01a1ea29-8ca6-7010-812c-6e3cc7d9889e | 01a1ea5f-7993-77ee-826c-ad25558fdcde | 01a1ea60-70a0-7558-9461-75e99810a682 | Combat_Stance, Run_02, Double_Combo_Attack, Double_Blade_Spin, Roll_Dodge, Dead | 9.5k · 0.81 MB |
| Archer | 01a1ea29-f264-7103-b4f9-07ea36446163 | 01a1ea5f-8a32-741d-97c5-20cf8bf6c0df | 01a1ea60-7583-74fd-9996-19ddea969cf4 | Combat_Stance, Run_02, Side_Shot, Charged_Spell_Cast, Roll_Dodge, Dead | 8.6k · 0.81 MB |
| Mage | 01a1ea2a-0241-7761-8195-5f7a3dfa8178 | 01a1ea5f-9c69-74c4-b2d3-e5131b4e0058 | 01a1ea60-79f4-76ca-873c-3d4d70f1e9fc | Combat_Stance, Run_02, mage_soell_cast, Charged_Spell_Cast, Roll_Dodge, Dead | 9.6k · 0.94 MB |
| Summoner | 01a1ea2a-111b-728b-944d-985f0250481a | 01a1ea5f-aebb-7272-8407-aa80112d5aed | 01a1ea60-7e3c-73f2-aee7-6f0237b9ba4a | Combat_Stance, Run_02, mage_soell_cast_2, Charged_Spell_Cast_1, Roll_Dodge, Dead | 8.7k · 0.83 MB |

- โครง 24 กระดูก (Meshy humanoid: Hips … RightHand/LeftHand) · ดิบ 20–24k tris 10–12 MB → simplify 0.4 (meshopt) + เท็กซ์เจอร์ 1024 + resample + quantize เฉพาะ normal/uv/weights
- Run ใช้ Run_02 (in-place 660 ถูกถอดจากคลังของ Meshy — คำสั่งแรกถูกปฏิเสธ ไม่เสียเครดิต) · โค้ดล็อกสะโพกที่ตำแหน่งของท่า idle ทุก clip (in-place)
- ไม่มีท่า "โดนตี" (ใช้การบีบตัวเดิมของเกม) · ชุดเกราะยังเป็นชิ้นเดียวกับตัว (ยังไม่ใช่ระบบเปลี่ยนชิ้นเกราะ)

## ในเกม (`src/p5-heroes.js`, เฉพาะ index — cursed ข้ามด้วย `CELESTIAL_SKIP`)
- อาชีพตามอาวุธ: sword/axe/gsword → Warrior · dagger → Assassin (ถือ 2 มือ) · bow/xbow → Archer (ธนูมือซ้าย) · fire/frost/storm → Mage · อาวุธหลอม → Summoner (ถือรูปทรงอาวุธฐาน)
- ใช้ hook ของฮีโร่ Quaternius (`o.qn`) จึงทำงานกับ frame loop / ท่าตาย / แถบเลือดเดิม · เปลี่ยนอาวุธข้ามสายแล้วสร้างตัวใหม่ · ไฟล์ยังไม่โหลด = ใช้ฮีโร่เดิม
- ท่า: idle↔run ตามความเร็ว · โจมตี (atkAnim) · สกิล (castAnim) · กลิ้งตอนพุ่ง (Shift) · หมุน (spin skills) · กระโดด (leap) · ตายเล่นจนจบ
- อาวุธของเกม (`R3.weapon`) ใส่ในกระดูกมือ: หมุนด้านยาวไปแกน +Z ของมือ (ธนู → +Y) · อาวุธในตำนานยังใช้ระบบเดิม (lgAttach) ได้
- สูตรต่อสู้ สกิล hitbox แพ็กเก็ตออนไลน์ ไม่เปลี่ยน

## ทดสอบ (Browser emulation: Chromium + SwiftShader — ไม่ใช่เครื่องจริง)
- 5 อาชีพ: เปลี่ยนตามอาวุธถูกต้อง, มี 6 ท่าครบ, อาวุธอยู่ในมือ (ภาพ idle/โจมตี), กลิ้งตอนพุ่ง, บอทตายแล้วเล่นท่าตาย, 0 JS error
- พบ/แก้: วัตถุฮีโร่ขาด `mvK/walk/rot` → กระดูก NaN มองไม่เห็นตัว · สะโพกของบาง clip เริ่มห่าง ~1 ม. → ล็อกที่ตำแหน่ง idle (แก้ให้ศัตรู Eclipse ด้วย)
- ยังไม่ได้วัด: FPS บนมือถือจริง (32 ฮีโร่ skinned ~9k tris) — ถ้าหนักให้ลด simplify เพิ่มหรือทำ LOD

## ค้าง
- ระบบชิ้นเกราะแยก (หมวก/อก/ถุงมือ/ขา/รองเท้า/ผ้าคลุม) ต้องแยก mesh + weight ใน Blender
- ท่ายิงธนูจริง (คลังมีแต่ walk-aim) · ท่าโดนตี · ท่าเฉพาะของ Summoner (เรียกสัตว์)
- วัด FPS บนอุปกรณ์จริง
