# HANDOFF.md — บันทึกส่งต่องานระหว่าง Codex และ Claude

เขียนรายการใหม่ไว้บนสุด รูปแบบ: `## YYYY-MM-DD · ใคร · เรื่อง` แล้วตามด้วย ทำอะไร / ไฟล์ / ทดสอบ / ค้าง

## กำลังทำ (อัปเดตเมื่อเริ่ม/จบงาน)
- ไม่มี

---

## 2026-11-17 · Claude · แก้จอดำเมื่อปิดเงาลึก + ลดต้นไม้ + ของตกแต่งหมู่บ้านจาก Meshy (branch claude/aaa-village)
- **จอดำเมื่อปิด "เงาลึก" (เกิดใน cursed.html):** พิกเซล NaN/ค่าติดลบจาก shader บางตัวหลุดเข้า UnrealBloomPass แล้วลามทั้งจอ — ตอนเปิด AO มันถูกกรองโดยบังเอิญ
  แก้: `R3.cleanPass()` ใน `r10.js` (กรอง NaN/Inf + clamp) ใส่ใน composer เสมอ หลัง AO ก่อน bloom · pass เดียวกันทำ color grade อ่อนๆ (saturation, เงาเย็น/แสงอุ่น, vignette) ปรับด้วย `R3.grade.value` (0–1)
- ต้นไม้ลดลง: `a.js` ทิ้ง 50% (เดิม 22%) เมื่อ CURSED
- ลายพื้นหิน (`tex('cobble')` ใน r3.js) วาดใหม่เป็นก้อนหินเหลี่ยมมนมีร่อง แทนวงรีลายจุด — ใช้กับลานหมู่บ้าน/ถนนทุกเกม
- index.html: ละอองลอยรอบตัว (เกสรกลางวัน หิ่งห้อยกลางคืน) ผ่าน `REG.motes(R,L,ov)`
- Meshy ใหม่ (ย่อ+simplify แล้ว, ใน manifest + `VILLAGE` ใน build.py): `village-well` (สร้างรอบ 2 — รอบแรกหลังคาเป็นรู), `street-lantern`, `stone-bridge`, `plaza-fountain`
  - `moonfall-village.js`: บ่อน้ำ/น้ำพุเป็นโมเดลเดี่ยว · โคมไฟถนน (ไม่รวม torch/small) เป็น instanced · สะพานข้ามแม่น้ำ = บล็อกโค้ง Meshy ต่อกันหลายช่วง แล้วดัดตามความโค้งของ `bridgeY` (ต้องแปลง position เป็น Float32 เพราะไฟล์ quantized)
  - `r3.js` ถาม `this.mfProp(key)` ก่อนวาดของเดิม (well/fountain/lantern/bridge/stall) จะได้ไม่ซ้อน · แก้ warning สีของแผงตลาด (`a.js` ใส่ `c`)
- เครดิต Meshy รอบนี้: ~75 · ดึงไฟล์จากเครื่องเจ้าของผ่าน bridge ยังพัง ต้องให้เจ้าของแนบไฟล์ในแชต

## 2026-11-17 · Claude · รวมระบบ Cursed Realm เข้า index.html (branch claude/index-systems)
- เจ้าของสั่ง: index.html ใช้ระบบทุกอย่างของ cursed.html ยกเว้นฉาก (ใช้ฉากเดิมของ index) แต่บ้านใช้โมเดล Meshy
- เพิ่มตัวแปร `MOON` คู่กับ `CURSED`: index = CURSED true / MOON false, cursed = ทั้งคู่ true · จุดที่เปลี่ยนจาก CURSED เป็น MOON (ฉาก): ต้นไม้/เห็ด/คริสตัลตามภูมิภาค, สีพื้นและมินิแมปตามภูมิภาค, ย้อมสีวัตถุ, แสงหมอกละอองตามภูมิภาค (`REG.atmo` ใน index แค่ประกาศชื่อภูมิภาค), หญ้าย้อมสี, บอสมังกร (index ใช้บอส Meshy จิบิเดิม), โทนมืดบังคับ
- index โหลดเฉพาะ `celestial-assets.js` + `moonfall-village.js` + UI/เมนู/คลังของ/หน้าโหลด · ไม่โหลด celestial-render / moonfall-environment / biome / collision-data
  - `window.CELESTIAL_KEYS` (ตั้งใน index) จำกัด CelestialAssets ให้โหลดแค่บ้าน 3 แบบ + แผงตลาด และหน้าโหลดรอเฉพาะชุดนี้
  - `moonfall-village.js` มี `celestialAsset()` สำรองเมื่อไม่มี celestial-render
- ห้องออนไลน์ index เปลี่ยน prefix เป็น `arenaroyale6-` (โปรโตคอลไม่เข้ากับ v2.5 แล้ว)
- ทดสอบ (http): index เข้าเกมได้ ภาพหมู่บ้าน/ป่า ฉากเดิม+บ้าน Meshy, แมตช์บอท 2 รอบจบ, ออนไลน์ 2 เครื่อง ซื้อของ/สกิลพิเศษ/หลบ ตรงกัน · cursed แมตช์บอท 1 รอบ
- ค้าง: การ์ดเกมใน claude.ai (artifact.html / cursed_artifact.html) ยังเป็นเวอร์ชันเก่า

## 2026-11-17 · Codex · ภาพหน้าโหลดและเมนู Moonfall (`codex/moonfall-cinematic-ui`)
- ทำอะไร: ภาพอัศวินเงินทอง/จันทราใหม่เข้าชุดกับไอคอนสกิล ใช้ร่วมกันทั้งหน้าโหลด
  เตรียมแมตช์ และเมนูพร้อมเล่น; จัด Solo เป็นปุ่มหลัก เก็บชื่อ/ผ้าคลุม/ตั้งค่า/คู่มือเดิมครบ
- ภาพ WebP 1672×941 ขนาด 197,706 bytes; ต้อง load + decode สำเร็จก่อนปลดล็อก
  รวม strict boot 52 งานหลังรวมโมเดลหมู่บ้าน ภาพเสีย/ขาด/หมดเวลายังล็อกเกมและโหลดใหม่ ไม่มีการใช้โมเดลสำรอง
- ไฟล์: src/moonfall-loading.html/css/js, src/moonfall-menu.js/css,
  src/tests/smoke-cinematic-ui.py; ภาพและสำเนา deploy ใน app/src/main/assets;
  cursed_artifact.html, moonfall-docs/CINEMATIC-LOADING-UI.md และผลทดสอบ JSON
- ทดสอบ: node --check, build index/cursed/web; index byte-identical กับ origin/main;
  Chrome desktop/มือถือจำลองแนวตั้ง+แนวนอน, reduced motion, key-art delayed/invalid/retry;
  ชุด UI เดิมผ่านจริง: 21 GLB, QN rig, 81 icons, ซื้อของ/ยา/สกิลด้วยคีย์บอร์ดและทัช,
  queued client snapshot, model/art/music/character/manifest/code/CSS/WebGL failure guards
- ไม่แตะ HP/Damage/Skills/AI/Inventory/Collision/Multiplayer transport หรือไฟล์โลกของ Claude;
  ไม่เรียก Meshy/ไม่ใช้เครดิต; ภาพประกอบเมนูไม่ได้เปลี่ยนโมเดลตัวละครในเกม
- ก่อน merge PR #8 ตามคำสั่งเจ้าของ: รวม main ล่าสุด `a4a3cec` (#7/#9 ของ Claude)
  รักษาโค้ดหมู่บ้าน/โมเดลบ้านและตลาดทั้ง 4 ชิ้น; build cursed และ web artifact ใหม่
  ระบบนับ manifest อัตโนมัติเป็น 21 GLB / 52 งาน; ปรับ test ให้ตามจำนวน manifest
  แทน 17/48 เดิม และตรวจ vanilla เท่ากับ main ล่าสุดทุก byte
- เจ้าของอนุมัติ merge PR #8 เข้า main; ค้างตรวจ hardware PC/mobile, Android WebView
  และ PeerJS สองเครื่องจริง

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
