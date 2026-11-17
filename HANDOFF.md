# HANDOFF.md — บันทึกส่งต่องานระหว่าง Codex และ Claude

เขียนรายการใหม่ไว้บนสุด รูปแบบ: `## YYYY-MM-DD · ใคร · เรื่อง` แล้วตามด้วย ทำอะไร / ไฟล์ / ทดสอบ / ค้าง

## กำลังทำ (อัปเดตเมื่อเริ่ม/จบงาน)
- Claude · PR `claude/eclipse-reign-p3` รอเจ้าของอนุมัติ (ยังไม่ merge) — `src/eclipse.js` `src/eclipse-fx.js` ใหม่ · แตะ `src/c.js` `src/r4.js` `src/build.py` เล็กน้อย

---

## 2026-11-17 · Claude · Phase 3 Eclipse Reign: Celestial Overlord + Dark Sentinel + Lunar Construct + อาวุธในตำนาน + VFX (branch claude/eclipse-reign-p3, PR รออนุมัติ)
- รายงานเต็ม: `moonfall-docs/PHASE3-ECLIPSE-REIGN-REPORT.md`
- `src/eclipse.js` (host logic, CURSED): ห่อ `genWorld` (แท่น + เปลี่ยนชนิดค่าย ไม่เปลี่ยน id/ตำแหน่ง), `mkMob`, `setMobStats`, `mobThink`, `dealDamage` (block/weak point/poise), `hitArea` (`a.safe`), `kill` (ดรอป), `basic` (proc), `equipWeapon`, `applyEvent` (event `{t:'ec'}`) · aoe kind ใหม่ต่อท้าย `AOE_KINDS` (ห้ามแทรกกลาง — index ใช้ในแพ็กเก็ต)
- `src/eclipse-fx.js` (render): ห่อ `R3.objFor/animBig/aoeVis/effects`, `drawTarget` (แถบบอสแทนกรอบศัตรูเดิมเมื่อเป็น Overlord)
- อาวุธในตำนาน = `wv` bit 15–16 (1 greatsword/gsword, 2 scythe/axe, 3 staff/frost) · `heroRow` ช่อง 16 ส่ง id นี้ · `mobRow` ของบริวารต่อท้าย `-1, EK index`
- โมเดล 6 ตัว static (ไม่มี rig) — การเคลื่อนไหวเป็น procedural · rig ต้องใช้เครดิต Meshy (ยังไม่ขอ)
- ทดสอบ (emulation): ครบทุกเฟส/ท่า/วงปลอดภัย/ดรอป/ติดอาวุธ/proc/ศัตรู ทั้ง index (low) และ cursed (high) · บอท 4 แมตช์ · ออนไลน์ 2 เครื่อง · ยังไม่ทดสอบเครื่องจริง

## 2026-11-17 · Codex · Arena skill VFX (`codex/arena-skill-vfx`)
- เป้าหมายตามคำสั่งล่าสุดของเจ้าของ: พัฒนา `index.html` ก่อน เพิ่ม VFX อาวุธ 63 สกิล
  (base 27 + fusion 36) ด้วยวงร่าย คมพลัง ผลึกน้ำแข็ง สายฟ้าแตกแขนง เสาพลัง/โดม
  และสีธาตุคู่ เชื่อม events/projectiles/AOE/status จริงโดยไม่แก้กติกาต่อสู้
- ใหม่: `src/arena-vfx-runtime.js`, `src/arena-vfx-skills.js`; `src/build.py` ใส่โมดูล
  ก่อน d.js เฉพาะ Arena; build/copy `app/src/main/assets/index.html` แล้ว
  Cursed HTML และ src/a,b,c,t1,r3-r12,d เท่ากับ main `ddfb113` ทุก byte
- 8 InstancedMesh batches / shader program ร่วมกัน; High 774, Low/Mobile 310 instances,
  reduced motion ลดลงอีก; สูงสุด 8 draw calls เพิ่มใน pass วาดฉาก ไม่มีภาพ/โมเดลใหม่
  ใช้ PRNG ของภาพแยก รวมช่วง Three.js สร้าง UUID; dispose/reset ตาม scene/quality/rebind
  พร้อม fog fade และหยุด follow เมื่อยูนิตซ่อน
- ทดสอบผ่าน: node syntax; build index/cursed/web; 63 cast จริงเทียบ baseline ทั้ง desktop-high,
  mobile-low และ reduced motion — Damage/HP/MP/CD/status/position/network rows ตรงกัน
  พร้อม keyboard/touch, shader errors 0, RNG purity และ memory เท่ากันหลัง stress/3 dispose cycles
  HTTP Cursed โหลดครบตาม manifest และเริ่มเกมจริงได้ ไม่มีโมดูลใหม่/JS error
- Host/Client สอง browser contexts ผ่าน production start/snapshot, VFX remote, AOE object
  ถูกแทน 72 snapshots ไม่เล่นปะทะซ้ำ, hidden follow, budgets และ payload/state immutability
- รายงาน: `moonfall-docs/ARENA-SKILL-VFX.md`, `moonfall-docs/reports/arena-vfx/*.json`;
  tests `src/tests/smoke-arena-vfx*.py`; screenshots อยู่ /tmp ไม่ commit
- ก่อนส่งรวม main ล่าสุด `ddfb113` (#11–13): เก็บพุ่ง 45 วิ, ตัวกรองภาพก่อน bloom,
  น้ำ/พื้นหมู่บ้าน/ธรรมชาติ Meshy ของ Claude ทั้งหมด แล้ว build และทดสอบเทียบ baseline ใหม่
- ข้อจำกัด: payload client ไม่ส่ง AOE owner/element จึงใช้ kind palette เมื่อไม่ทราบเจ้าของ;
  purchased special skills ใช้ตระกูล VFX เดิม ไม่รวมใน 63 profiles; ต้องตรวจ hardware FPS/VRAM,
  Android WebView และ live PeerJS เพิ่ม ไม่ใช้ Meshy/เครดิต และไม่เริ่ม Phase 3
- พบงานเดิมค้าง: baseline main ที่ยังไม่มี VFX ใหม่มี texture count เพิ่ม 109→148→202→245
  เมื่อสลับคุณภาพ/สร้างโลกใหม่ ต้องตรวจ renderer lifecycle แยก; VFX ใหม่ไม่สร้าง texture
  และ pool ของชั้นใหม่นิ่งทุก stress/dispose cycle (ดู baseline-quality.json)
- Commit/push branch และเปิด PR เข้า main ให้ตรวจสอบก่อน merge/เผยแพร่

## 2026-11-17 · Claude · ของตกแต่งธรรมชาติจาก Meshy + ลายหินปูหมู่บ้านจาก Meshy (branch claude/meshy-nature)
- เพิ่ม GLB 5 ชิ้นใน `assets/meshy/` + manifest: `mossy-boulder` `lupine-clump` `flower-cushion` `tall-grass` `river-stones` (Meshy text-to-3d, ย่อด้วย mfpack: เท็กซ์เจอร์ 1024, ~0.2 MB/ชิ้น)
  - index โหลดผ่าน `CELESTIAL_KEYS` (build.py รวม `NATURE` อัตโนมัติเมื่ออยู่ใน manifest) → `moonfall-village.js buildNature()` วางตามริมน้ำ/ทุ่งหญ้า/ท้องน้ำ และหินมอสแทนหินเรียบเดิม
  - cursed ไม่ใช้ของพวกนี้: build.py ใส่ `window.CELESTIAL_SKIP=NATURE` และ `celestial-assets.js` ข้าม key ใน SKIP (ไม่ต้องดาวน์โหลด ไม่บล็อกหน้าโหลด)
- ลายหินปูหมู่บ้าน: `assets/tex/cobble-meshy.jpg` อบจากโมเดล cobblestone-ground ของ Meshy (1.2 ล้านสามเหลี่ยม ไม่มีเท็กซ์เจอร์ → แปลงเป็น heightmap → ต่อลายไร้รอยต่อทีละก้อนหิน → ใส่สี/เงา) · `r3.js tex('cobble')` ใช้ลายวาดเดิมก่อนแล้วสลับเป็นรูปนี้เมื่อโหลดเสร็จ (เฉพาะ CURSED)

## 2026-11-17 · Claude · พุ่ง 45 วิ แทนป้องกัน + หมู่บ้านปูหินทั้งโซน + น้ำใส + โครงของตกแต่งธรรมชาติ (branch claude/dash-water)
- **พุ่ง (เจ้าของสั่ง):** `t1.js` Shift = `tpsDodge` พุ่ง 1700×0.3 วิ อมตะระหว่างพุ่ง คูลดาวน์ `DASH_CD=45` เก็บใน `u.dgcd` · เอาระบบป้องกัน (คลิกขวา/ปุ่ม 🛡) และสตามิน่าออก (`CUR.input` ส่ง `blk:false` เสมอ, ปุ่ม b1 ซ่อน, แถบสตามิน่าซ่อน) · ปุ่มพุ่งมีตัวเลขนับถอยหลัง `.dcd`
  - `c.js` ช่อง 33 ของแถวผู้เล่นตัวเอง (เดิม sta) ตอนนี้ส่ง `dgcd` · ข้อความสอนเล่นใน `moonfall-ui.js` แก้แล้ว
- **หมู่บ้านปูหินทั้งโซน:** `a.js paintMasks` เมื่อ CURSED ใช้รัศมีหมู่บ้าน `v.r*.97` ทึบถึง 86% แล้วค่อยจาง → พื้นหิน + ไม่มีหญ้าในหมู่บ้าน
- **น้ำใส (index/cursed ที่ไม่ใช่ TOON):** `r3.js` พื้นใต้น้ำผสมลายหิน (`tRock`) + แสงระยิบ caustics จาก `uDetail` สองชั้นเลื่อนสวนกัน · น้ำตื้นใสขึ้น (alpha .34→.92 ตามความลึก) สะท้อนฟ้าน้อยลง (`envMapIntensity` .34)
- ต้นหลิว (v===6) ม่านใบย้อม `#8f9c80` (เดิมขาว = เขียวมะนาวจ้ามากเมื่อมองจากบน)
- **ของตกแต่งธรรมชาติจาก Meshy (โค้ดพร้อม รอไฟล์):** `moonfall-village.js buildNature()` (เฉพาะ index) วางหินมอส ดอกลูพิน กอดอกไม้ หญ้าสูง หินท้องน้ำ ตามริมน้ำ/ทุ่งหญ้า ไม่มี collision · `plainRock()` ให้ r3 ข้ามหินเรียบเมื่อมีหินมอส
  - `build.py` มีรายการ `NATURE` — key จะถูกเพิ่มเข้า `CELESTIAL_KEYS` อัตโนมัติเมื่ออยู่ใน manifest แล้วเท่านั้น (หน้าโหลดเข้ม: ห้ามใส่ manifest ก่อนมีไฟล์ GLB)
  - สร้างใน Meshy แล้ว 5 ชิ้น (mossy-boulder, lupine-clump, flower-cushion, tall-grass, river-stones) รอเจ้าของแนบไฟล์
- ทดสอบ (http): พุ่งได้ระยะ ~350 กดซ้ำระหว่างคูลดาวน์ไม่พุ่ง ครบ 45 วิพุ่งได้อีก ตัวเลขบนปุ่มขึ้น · ออนไลน์ 2 เครื่อง client กดพุ่ง host ได้ dgcd≈44 client เห็นตรงกัน กดซ้ำไม่รีเซ็ต · แมตช์บอท index 2 รอบ / cursed 2 รอบ จบไม่มี error · ภาพแม่น้ำ/หมู่บ้าน

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
