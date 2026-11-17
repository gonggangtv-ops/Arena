# HANDOFF.md — บันทึกส่งต่องานระหว่าง Codex และ Claude

เขียนรายการใหม่ไว้บนสุด รูปแบบ: `## YYYY-MM-DD · ใคร · เรื่อง` แล้วตามด้วย ทำอะไร / ไฟล์ / ทดสอบ / ค้าง

## กำลังทำ (อัปเดตเมื่อเริ่ม/จบงาน)
- (ว่าง)

---

## 2026-11-17 · Codex · สกิลหลอม ขวดยา/ร้านค้า และ strict loading (`codex/ui-ux`)
- ทำอะไร: ภาพสกิลหลอมครบ 36 สกิล + item/UI 18 ภาพ; รวมกับ base 27 เป็น 81 ภาพ
  ใช้ใน HUD/กระเป๋า/สูตรหลอม/ร้านค้า เปลี่ยน atlas เป็น WebP รวม ~1.1 MB
- หน้าโหลดจันทราใหม่ ล็อกปุ่มและ start APIs จนฉาก 17/QN pack 18/atlas 3/เพลง 7/
  font/render พร้อม (47 งาน) ไฟล์เสียหรือขาดแสดง error + โหลดใหม่ ไม่ใช้ภาพ/ฉากสำรอง
  client ที่มาถึงก่อน ready รอและรักษา pending snapshots ก่อนเข้าเกม
- แก้คำแนะนำ Shift อัปสกิลเป็นปุ่ม + เพราะ Shift ใช้หลบ; ลิงก์แกลเลอรีเก่าเปลี่ยนเป็นเปิดสูตรหลอม
- ไฟล์: src/moonfall-ui.js, moonfall-menu.js/css, moonfall-inventory.*, moonfall-loading.*,
  build.py, src/tests/smoke-ui-ux.py; assets/ui/* และสำเนา deploy ใน app/src/main/assets;
  เพิ่มชื่อไฟล์ใน .github/workflows/pages.yml; รายงาน moonfall-docs/UI-UX-STRICT-LOADING.md
- ทดสอบ: node --check; build index/cursed; index byte-identical กับ main; Chrome desktop/mobile
  เล่นด้วย GLB จริงทั้งหมด, ซื้อ/ใช้ยา/ร่ายสกิล, delayed file/start guards, local client snapshot queue,
  model/art/music/character/manifest/script/CSS/WebGL failure + retry ผ่าน; Solo bots จนจบ 630 วิจำลอง
- รวม main ล่าสุด 31c85ab (Claude #5) แล้ว build/test ซ้ำ รักษา r4.js/t1.js/biome ของ Claude ทุก byte
- ไม่แตะ GLB/QN models และ balance/ราคา/transport schema; ไม่มี Meshy calls/credits
- ค้าง: hardware PC/mobile, Android WebView และ PeerJS สองเครื่องจริง ยังไม่ได้รับรอง FPS/VRAM
- commit แล้ว push branch codex/ui-ux และเปิด PR เข้า main (ไม่ merge/deploy)
## 2026-11-17 · Claude · ผสมธรรมชาติเกมเดิม + หมู่บ้านใหญ่ขึ้น + บ้าน Meshy (branch claude/village-nature)
- `moonfall-biome.js`: ใน Cursed Realm เก็บต้นไม้เดิมไว้บางส่วนตามภูมิภาค (KEEP=[.5,.65,.3,0,.25]) ไม่ย้อมเทา · พื้นหญ้าเดิมโผล่เป็นหย่อมบนพื้นจันทรา · ยอดเนิน/หน้าผา (vWY>26) ใช้หินแตกแทนสีเทาเรียบ (**ยังไม่ได้ดูภาพยืนยัน**)
- `a.js` (เฉพาะ CURSED): หมู่บ้าน r×1.5, จำนวนบ้าน×1.8 (รวม ~125 หลัง), เพิ่ม `WD.stalls` (แผงตลาด มี collision)
- `moonfall-village.js` (ใหม่): เปลี่ยนหลังคา/ตัวบ้านเป็นโมเดล Meshy (`house-cottage`, `house-long`, `house-witch`) และ `market-stall` — ถ้าไม่มี asset จะใช้บ้านเดิม + แผงตลาดกล่องไม้
- **บ้าน Meshy ใส่แล้ว (claude/meshy-houses):** `house-cottage/long/witch.glb`, `market-stall.glb` ย่อเหลือ ~0.3–0.4 MB ต่อไฟล์ เพิ่มใน `manifest.json` (doorAngle=π/2 = ประตูหัน +z) · ดูภาพหมู่บ้านแล้ว บ้านและแผงตลาดขึ้นครบ
  - ข้อสังเกต: ผนังปูนของบ้านเดิมยังโผล่ใต้ชายคาบางหลัง · การ์ดเกมใน claude.ai (cursed_artifact) ยังไม่ได้อัปเดตตาม PR #6 และบ้านใหม่
- ทดสอบ: smoke 2 เกม, แมตช์บอท 2 รอบ, ออนไลน์ 2 เครื่อง (โลกตรงกัน)

## 2026-11-17 · Claude · หญ้ากระพริบ + บรรยากาศ (branch claude/atmosphere-grass)
- **หญ้ากระพริบตอนเดิน:** สาเหตุคือ `moonfall-biome.js` ลดจำนวนหญ้าด้วยการเก็บทุกอันที่ 2/3 ตามลำดับ index ทุกครั้งที่ฮีโร่ข้ามช่อง ลำดับเลื่อน → หญ้าคนละชุดโผล่/หาย
  แก้: ย้ายการลดจำนวนและการย้อมสีไปทำต่อกอใน `r4.js updateGround` (ใช้ `this.gThin` / `this.gCool`, ตัดสินจากตำแหน่งกอ) — ทดสอบเดิน 6 ช่อง หญ้าในจอหาย 0 กอ
- หญ้าไม่ดำเป็นหนามแล้ว: normal ของการ์ดหญ้าชี้ขึ้น + สีสว่างขึ้น และย้อมตามภูมิภาค (`REG.gc`)
- เพิ่มละอองลอยรอบตัวตามภูมิภาค (`REG.motes` ใน `t1.js`): ฝุ่นทอง / สปอร์เขียว / หิมะตก / สะเก็ดไฟ / ประกายม่วง (hi 300 จุด, low 140)
- ไฟล์: `src/r4.js`, `src/t1.js`, `src/moonfall-biome.js` · ทดสอบ: smoke 2 เกม, แมตช์บอท 1 รอบ, สกรีนช็อต 3 ภูมิภาค
- ค้าง: ต้นสนในโมเดลเดิม/บ้านหลังคาฟางยังเป็นโทนอุ่น ไม่เข้ากับโทนจันทรา · ยังไม่มีพื้นผิวเฉพาะภูมิภาค (ใช้การย้อมสี)


## 2026-11-17 · Claude · รวม PR #4 (Moonfall HUD/เมนู) เข้า main + ตั้งกติกาทำงานร่วมกัน
- ย้ายงานจาก `feat/moonfall-ui-skill-icons` (PR #4 ของ Codex ที่ base = gh-pages) เข้า `main`:
  `src/moonfall-ui.*`, `src/moonfall-menu.*`, `app/src/main/assets/assets/ui/*`, รายงานไปที่ `moonfall-docs/`
- ใส่เฉพาะใน `cursed.html` (ไม่ใส่ index.html ตามกติกาข้อ 3) · build.py เพิ่มไฟล์ใน `MOON`/`MOONCSS`
- PR #4 ปิดได้แล้ว (งานอยู่ใน main)
- ค้าง/ข้อสังเกต:
  - ข้อความช่วยเหลือใน moonfall-ui.js บอก "กด Shift พร้อมปุ่มสกิลเพื่ออัปสกิล" แต่ใน Cursed Realm Shift = หลบ → ควรเปลี่ยนเป็นปุ่ม + บนจอ หรือ Alt
  - `assets/ui/moonfall-skills.png` 2.4 MB ย่อเป็น WebP ได้

## 2026-11-17 · Claude · Cursed Realm 0.3 (cbe18e6)
- รวม Moonfall (PR #1–#3) เข้าซอร์ส `src/` · ย่อ GLB 17 ไฟล์ 130 MB → 4.5 MB · แก้ใบไม้รูดำของ moon-silver-tree
- 5 ภูมิภาคกลับมาต่างกัน (`moonfall-biome.js` อ่าน `REG` จาก `t1.js`) · index.html กลับเป็น v2.5
