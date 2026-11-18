# HANDOFF.md — บันทึกส่งต่องานระหว่าง Codex และ Claude

เขียนรายการใหม่ไว้บนสุด รูปแบบ: `## YYYY-MM-DD · ใคร · เรื่อง` แล้วตามด้วย ทำอะไร / ไฟล์ / ทดสอบ / ค้าง

## กำลังทำ (อัปเดตเมื่อเริ่ม/จบงาน)
- ไม่มี

---

## 2026-11-18 · Claude · ต้นไม้ล้มใช้ texture จริง, แม่น้ำ/สะพานกว้างขึ้น, ชั้นภาพ/VFX ระดับ AAA (index เท่านั้น)
- เจ้าของ: "ตอนต้นไม้พัง texture หายไปดูแปลก · ขยายแม่น้ำและสะพานให้กว้างขึ้น · ปรับบรรยากาศให้เหมือนเกม AAA · VFX ด้วย"
- `trees-break.js` (render): ต้นที่ล้มเดิมเป็นทรงเรขาคณิตสีพื้น → ตอนนี้ก๊อป instance จริงของต้นนั้นทุกชิ้น (`treeAll`: ลำต้น/พุ่มใบ/ใบการ์ด/กิ่ง) เป็น `InstancedMesh` ขนาด 1 ใช้ geometry + material + instanceColor เดิม (shader variant เดียวกัน, ลมยังทำงาน) · ล้มเร่งขึ้น + เด้งตอนกระแทก, นอนนิ่ง ~5 วิ แล้วจมหาย · เหลือ**ตอไม้** (pool `InstancedMesh` ต่อวัสดุเปลือก + หน้าตัดสีไม้อ่อน, อยู่จนจบแมตช์) · โดนตีแล้วต้น**โยก**ตามทิศที่โดน (`{t:'th',i,a}` มีมุมแล้ว)
- `a.js` (logic, เฉพาะ `!MOON`): แม่น้ำกว้าง `hw0/hw1` 88/138 → **150/226**, ร่องกลางลึกขึ้น (เดินลุยได้เหมือนเดิม), สะพาน `wid` 122 → **184** (ยาวตามแม่น้ำ `hw*2+150`) · cursed ไม่เปลี่ยน · ทดสอบ 40 seed: สะพาน ~9 ต่อแมป หัวสะพานบนบกทุกอัน ไม่มีบ้าน/จุดเกิด/ปราสาท/ของในน้ำ
- `arena-gfx.js`: alpha-to-coverage เฉพาะ texture ใบที่วาดเอง (CanvasTexture) — ใบไม้/ดอก Meshy มี RGB ดำตรงส่วนโปร่ง ถ้า GPU ไม่แปลง alpha เป็น coverage จะเห็นเป็นรอยดำ (เจอใน software GL)
- `src/arena-aaa.js` ใหม่ (render, index, คุณภาพสูง; ปิดทีละอย่างได้ด้วย localStorage `ar_fx_vol|dist|lens|ball|plight|rim|push = '0'`):
  - post pass แทรกก่อน bloom: **แสงลำ/หมอกแสง** (ray-march shadow map ของดวงอาทิตย์ผ่านชั้นหมอกบางสูง ~70 เหนือพื้น, noise ลอย, HG phase, ครึ่งความละเอียด ≤800px, เฉพาะ desktop) · **บิดอากาศ** (คลื่นกระแทกวงแหวน + ไอร้อนเหนือพื้นไฟไหม้/ลมหายใจไฟ, render offset ลง RT float เล็ก) · **เลนส์** (chromatic aberration ขอบจอ + กระตุกตอนระเบิดใกล้, film grain, contrast curve อ่อนๆ) · จับ depth ของฉากจาก RenderPass ทุกเฟรม (เพิ่ม DepthTexture ให้ถ้าปิด AO)
  - **ลูกไฟ/ระเบิดแบบปริมาตร**: กลุ่มทรงกลม noise-displaced (simplex) ขอบนุ่มตาม fresnel ร้อนขาว→ส้ม→ควัน (ไฟ) / หมอกน้ำแข็ง / ทอง / ม่วง · ผูกกับ `v3Pulse` style (fireball/explosive/meteor/dragon/iceburst/blizzard/judgment/shadow/element*) · instanced 72 ชิ้น
  - **ไฟติดกระสุน** PointLight 3 ดวงตามกระสุนสว่างที่ใกล้กล้อง (desktop) · **rim light** สีฟ้าบนฮีโร่ (`fow key 'p5'`) · **หญ้าแหวก**รอบตัวละคร 8 ตัวที่ใกล้กล้อง (`windMat` G/F/H)
- ทดสอบ: ภาพก่อน/หลัง (ป่า/สะพาน/หมู่บ้าน), ต้นไม้ล้มมองจากบน (texture ครบ 12 ชิ้น + ตอ), ลูกไฟไฟ/น้ำแข็ง 5 เฟส, อุกกาบาตจริง (ลูกไฟเกิดตรงจุดตก), ไม่มี error/shader error · แมตช์บอท index 3 + cursed 1 · ออนไลน์ host/client ต้นไม้ล้มตรงกัน · smoke test ของ Codex
- ค้าง: วัด FPS บนเครื่องจริง (ทดสอบด้วย SwiftShader) — ถ้ากระตุก ปิดแสงลำ (`ar_fx_vol`) ก่อน

## 2026-11-18 · Claude · ท่าถือ/ยิงธนูของ Archer (index เท่านั้น)
- เจ้าของ: "ท่าจับธนูมันแปลกๆ"
- สาเหตุ: (1) ธนูถูกหมุนแค่ให้แกนคันตรงแกนกำมือ — การบิดรอบแกนเป็นค่าสุ่มจาก `setFromUnitVectors` + `rotateY(π/2)` ทำให้หน้าคัน/สายหันมั่ว (2) `Combat_Stance` กำมือไว้หน้าท้อง ธนูจึงตั้งขวางลำตัว/หน้า (3) คลิป Meshy `Side_Shot` ถือธนูแนวนอนระดับสะโพกแล้วหันตัวออกจากเป้า
- `p5-heroes.js`:
  - `p5Fist(...,bow)` สร้างเฟรมเต็ม: แขนคันตามแกนกำมือ, หลังคัน (โมเดล −X หลัง `p5WModel` — วัดจาก GLB ทั้ง 3 คัน: ปลายคัน/สายอยู่ด้าน +X) ชี้ไปทางนิ้ว (hand +Y = ทางเป้า), สายหันเข้าหาผู้ยิง
  - `R.p5BowPose` (เรียกหลัง `mixer.update`, เฉพาะตระกูล `bow` รวมอาวุธหลอมที่ฐานเป็นธนู; หน้าไม้ยังใช้คลิปเดิม): ทำงานใน model space (หน้า +Z, ซ้าย +X)
    - ถือพัก (idle/run): แขนซ้ายลงข้างตัว ธนูเอียงหน้า ~23° สายเข้าหาตัว
    - ยิง/ใช้สกิลธนู (`o.bT=0` แทนการเล่นคลิป attack/cast): หมุนอกให้ไหล่ขนานแนวยิง (คำนวณจากท่าของคลิปทุกเฟรม เพราะ Combat_Stance หันข้างอยู่แล้วครึ่งหนึ่ง) แล้วหันหัวกลับมาที่เป้า · แขนซ้ายเหยียดตรงไปที่เป้า ธนูตั้ง · มือขวา two-bone IK ไปที่มุมกราม ข้อศอกไปข้างหลังระดับไหล่ · ปล่อยสาย (0.1 วิ) → ตามมือ → ง้างใหม่ถ้ายังยิงต่อ · ลูกธนูพาดสาย (`o.arrow`) ตอนง้าง · ไม่ยิง 1.15 วิ กลับท่าพัก
  - Hunter Bow (`b0`) มีสายแล้ว (`P5WS.str`, cylinder บางในพิกัด GLB)
- ทดสอบ: harness Node (`scratchpad/kkb/posetest.mjs` — โครงกระดูก p5-archer + โค้ดท่าจริงจากไฟล์) ตรวจตำแหน่งมือ/ข้อศอก/ไหล่ทุกเฟส + ภาพในเบราว์เซอร์ (ธนู 3 ระดับ, ท่าพัก 3 มุม, ยิง 4 เฟส 2 มุม), แมตช์บอท index/cursed

## 2026-11-18 · Codex · ปรับภาพในสนามและเมนู Arena (`codex/arena-visual-refresh`)
- เริ่มจาก `main` รุ่นเผยแพร่ `0ca9925` แล้วรวม `e455f6d` ก่อนส่ง PR เก็บการจับอาวุธ โมเดลอาวุธบนพื้น และต้นไม้หักได้จาก #22
- `src/arena-atmosphere.js` เพิ่มวัสดุพื้นแบบ PBR ในกราฟิกสูง ลายหินผุ ดินและหญ้าแบบสองสเกล
  ระลอกน้ำตามความลึก แสงอุ่นตัดกับเงาเย็น และกล้องโทนซิเนมาติกที่ยังใช้พิกัดเดียวกับการเล็ง
  โทนซิเนมาติกเป็นค่าเริ่มต้นเมื่อยังไม่มีค่าที่บันทึก เปลี่ยนเป็นโทนเป็นกลางได้ในตั้งค่า
- `src/arena-menu.js/css` ปรับปุ่มเข้าสู่สนาม จับคู่ด่วน และห้องออนไลน์ จัดตั้งค่าเป็นแท็บกราฟิก
  การควบคุม และเสียง ใช้ปุ่มและค่าเดิม พร้อมรองรับทัชและการวนโฟกัสใน dialog
- `arena-citadel.webp` ภาพประกอบใหม่ 1672×941 ขนาด 195,416 ไบต์ ใช้ในหน้าโหลดและเมนู
  ปุ่มเล่นเปิดเมื่อโหลดภาพและทรัพยากรจริงครบเท่านั้น `build.py` รวม CSS/JS ชุดใหม่เฉพาะ index
- ทดสอบ node และ build index/cursed ผ่าน Chrome Desktop และมือถือจำลองเข้า Solo ได้จริง
  ทดสอบรีโหลดค่าตั้งค่า เปลี่ยนคุณภาพ/เงา/มุมมอง 2D–3D คีย์บอร์ด ทัช และไฟล์ภาพเสียพร้อม Retry
  ตรวจฉากหมู่บ้านและแม่น้ำโหมดซิเนมาติก และพิกัดฉายภาพกลับเป็นจุดเล็ง ไม่มี JS หรือ shader errors
- `cursed.html` ตรงกับ `main` ที่ `e455f6d` ทุกไบต์และเปิด Solo ได้ ทดสอบด้วย GLB จริง 39 ชิ้นใน Arena
  ผลอยู่ใน `moonfall-docs/reports/arena-refresh/` และชุดทดสอบ `src/tests/smoke-arena-refresh.py`
- ค้างวัด FPS และภาพบนโทรศัพท์จริง การทดสอบรอบนี้ใช้ Chromium และ WebGL แบบซอฟต์แวร์

## 2026-11-18 · Claude · จับอาวุธจริง, อาวุธบนพื้น Meshy, ต้นไม้พังได้ (index เท่านั้น)
- เจ้าของ: "อาวุธที่ถือดูลอย เช่นดาบ · ขวานยังไม่มีโมเดล ใช้อันเดิม · เปลี่ยนโมเดลอาวุธที่ตกบนพื้น · โจมตี/สกิลโดนต้นไม้ให้พัง"
- `p5-heroes.js`:
  - `P5GRIP` จุดกลางฝ่ามือ + แกนกำมือ (ด้านนิ้วโป้ง) ใน hand-bone space ต่ออาชีพ/มือ — คำนวณจาก skin weight ของ `p5-*.glb` (PCA ของ vertex ที่ผูกกับ RightHand/LeftHand ≥ .55, แกนที่ 2 = ขวางฝ่ามือ, เครื่องหมายตามทิศหน้า +Z) · เดิมใบดาบชี้ไปแกน +Z ของมือ (ทะลุหลังมือ) → ดูลอย
  - `P5FAM`/`p5WKeyFor(wk,tier)` เลือกโมเดลตามตระกูลอาวุธ (อาวุธหลอมใช้ `base`) · **axe, xbow → โมเดลเดิมของเกม** (ยังไม่มี Meshy) แต่จับด้วยแกนกำมือเดียวกัน
  - `itemObj` ของอาวุธบนพื้นใช้ `p5WDrop` (โมเดล Meshy กลางไอเทม ยาวไม่เกิน 84)
- `src/trees-break.js` (logic + render, host-authoritative): ต้นไม้ 3 แต้ม · ฟัน 1 · กระสุนผ่านลำต้น 1 · หมุน 1.5/tick · skill aoe 3 (dot 1.5/tick) · event `{t:'th',i}` / `{t:'tb',i,a}` · collider ย้ายออก, `t.x/y` ย้ายไป -99999 (ตำแหน่งเดิม `ox/oy`), host เปิด NAV รอบต้นใหม่ · renderer ซ่อน instance ทั้งหมดของต้น (wrap `instC` ระหว่าง `buildWorld`) + ต้นจำลองล้มตามทิศที่โดน + เศษไม้/ใบ/ฝุ่น
  - แมตช์บอท 32 คน: ล้มราว 560–700 จาก 2400 ต้น (ปรับ HP ได้ที่ `HP`)
- ทดสอบ: ภาพจับอาวุธ 7 ชนิด, อาวุธบนพื้น 6 ชิ้น, ฟันต้นไม้ 3 ครั้งล้ม, อุกกาบาตล้ม 9–11 ต้น, ออนไลน์ host/client ต้นไม้ล้มตรงกัน + เดินผ่านได้, แมตช์บอท index/cursed, 0 error

## 2026-11-18 · Claude · ภาพคม + VFX อนุภาค/แถบอาวุธ + บอส Lava Titan (index เท่านั้น)
- เจ้าของ: "VFX 3D สวยขึ้น 300%, ภาพยังเหลี่ยมเหมือนเกมยุคเก่า, เปลี่ยนบอสมังกรเป็นโมเดลใน Meshy" · เครดิต Meshy = 0 → ใช้โมเดล rigged ที่มีแล้ว
- `src/arena-gfx.js`: บังคับ MSAA ทุกเครื่อง (เดิมมือถือปิด) · pixel ratio high 2 (มือถือ 1.75) / low 1.35–1.45 · primitive ใน `R3.G` เพิ่ม segment, icosphere ของหิน/พุ่มไม้ละเอียดขึ้น 1 ระดับ (desktop) · ปิด flatShading · alphaTest → alphaToCoverage · anisotropy 8/4 · shadow 4096 + radius (r186 ไม่มี PCFSoftShadowMap แล้ว)
- `src/arena-vfx-particles.js`: GPU particles (คำนวณใน vertex shader: glow/spark ยืดตามความเร็ว/ember/smoke-mist แบบ alpha/shard/star, 7000+700 high · 2400+400 low) · ribbon trail ตามคมอาวุธ (ฮีโร่ p5 `wtip+handR`, สัตว์ Eclipse `wpnTip+hand`) · หางกระสุน · afterimage ตอนพุ่ง · รอยไหม้ · wrap `v3Pulse`/`soulFx`/`hitVfx`/`doFx('die')`
- `src/boss-titan.js`: บอสปราสาท (`kind:'boss'`) แสดงเป็น Lunar Construct rigged สูง 390 ทาสีหินดำ+ลาวา (`titanForge`) ใช้กลไก `eclSkModel`/`eclAnim` ของ eclipse-fx (ไม่ตั้ง `u.ecl` บนยูนิต → ไม่แตะ AI) · พ่นไฟ = ท่าทุบ + สายไฟจากหัว · slam = Ground_Slam · ชื่อ/ข้อความ "มังกรเพลิง" → "ไททันลาวาบรรพกาล" · `r4.js` HP bar ใช้ `R3.bossTop` ถ้ามี · เปลี่ยนเป็นโมเดลใหม่ภายหลัง: แก้ `TITAN.key`
- cursed.html ไม่ได้รับไฟล์ใหม่ (arena-only) ยกเว้นบรรทัด HP bar ใน r4 (fallback 280 เหมือนเดิม)

## 2026-11-18 · Claude · อาชีพที่ 5: Summoner / คัมภีร์วิญญาณ (index เท่านั้น)
- เจ้าของเลือก "ทำเป็นอาชีพจริง" — อาวุธชนิดใหม่ `soul` (📖 คัมภีร์วิญญาณ) ใน `WK`/`AW` (ต่อท้ายอาวุธพื้นฐาน ก่อนอาวุธหลอม) · ไม่หลอมกับอาวุธอื่น (ไม่มีใน `WCAT`)
- `src/summoner.js` (ตรรกะ, host-authoritative): Q อัญเชิญภูติ 2 ตัว (เลเวล 3+ + หมาป่าวิญญาณ, สูงสุด 4) · E บัญชาวิญญาณ (หอกวิญญาณ kind 16 + วิญญาณทุกตัวล็อกเป้า แรง/เร็วขึ้น ฟื้นเลือด 25%) · R ผู้พิทักษ์จันทรา (aoe slam + stun, ยักษ์สู้ข้างตัว 18–22 วิ, slam ทุก 7 วิ)
  - วิญญาณ = mob unit `pet:1, summon:1, owner, team=owner.team` · AI `petThink` (ตามเจ้าของ, เลือกเป้า: เป้าของบอท → คนที่เพิ่งตีเจ้าของ → ฮีโร่ศัตรู → มอนที่ aggro เจ้าของ) · ตายเมื่อหมดเวลา/เจ้าของตาย/เปลี่ยนอาวุธ
  - ดาเมจของวิญญาณนับเป็นของเจ้าของ (wrap `dealDamage`) → kill credit, PvP damping, trait/rune ใช้ได้ · ฆ่าวิญญาณไม่ได้รางวัล (wrap `kill`) · บอทไม่ฟาร์มวิญญาณ (`bestCreep`) · บอทใช้สกิลเป็น (`aiSkills`/`aiEscape`)
  - เน็ต: mobRow ของวิญญาณ `[..., -2, PK index, owner id]` → client สร้างใน `applySnap` wrapper · ลบตามกติกา summon เดิม
- `src/summoner-fx.js` (ภาพ): ภูติ = ลูกแก้ววิญญาณเรืองแสง · หมาป่า/ผู้พิทักษ์ = โมเดล wolf / Lunar Construct (rigged) ทำเป็นวิญญาณโปร่งแสง (คง fog-of-war shader) · projectile kind 16 · fx `soulsum/soulcmd/soulgd/soulgone` ใช้ชั้น VFX 3D
- `p5-heroes.js`: `soul` → Summoner (ลูกแก้ว/คัมภีร์ Meshy ตามระดับ) · อาวุธหลอมใช้อาชีพของ `FUSED[k].base` (เดิมเป็น Summoner)
- ไอคอนสกิล: `assets/ui/moonfall-soul.webp` (เรนเดอร์จากโมเดล Meshy ที่มี) + `skill-atlas.json` `sheets.soul`/`fusionSkills.soul` — **ทุกคีย์ใน `AW` ต้องมีไอคอน ไม่งั้น `moonfall-ui.js` โยน 'Missing skill artwork' แล้วหน้าโหลดค้าง** · `moonfall-menu.js` นับจำนวนอาวุธจาก `WK.length`
- ทดสอบ: แมตช์บอท Summoner 10 ตัว ×3 + แมตช์ปกติ ×3 + cursed ×1, ภาพ 3D ทั้ง 3 สกิล, ออนไลน์ host/client, 0 error

## 2026-11-18 · Claude · อาวุธ Celestial Armory 15 ชิ้น + VFX สกิล 3D (index เท่านั้น)
- **อาวุธ:** เจ้าของสร้างใน Meshy เอง (text-to-3d refine, ไม่ใช้เครดิตเพิ่มในงานนี้) → ย่อเหลือ 0.12–0.28 MB/ชิ้น (`p5w-*.glb`, manifest + `build.py` `P5W` → CELESTIAL_KEYS ของ index, CELESTIAL_SKIP ของ cursed)
  - แก้โมเดล: Lunar Longbow ตัดลูกธนูที่ลอยแยก + หมุน −29° · Spirit Orb/Genesis Grimoire ตัดแท่นวาง · Hunter Bow ไม่มีสาย (ปล่อยไว้)
  - `src/p5-heroes.js`: `P5W/P5WS` (แกนด้าม→ปลาย, จุดจับ, ความยาว) · ระดับ 0–1 → ธรรมดา, 2 → มหากาพย์, 3–4 → ตำนาน · ธนูถือแบบด้าม (แกน +Z ของมือ) · Summoner = ของลอยข้างมือซ้าย · ยังไม่โหลด = ใช้อาวุธเดิมแล้วสลับเมื่อโหลดเสร็จ
  - `eclipse-fx.js`: อาวุธในตำนาน Eclipse บนฮีโร่ p5 ใช้ขนาด ×1.05 ของอาวุธ Meshy
- **VFX 3D:** `src/arena-vfx-3d.js` (ใหม่, index เท่านั้น, ต่อจาก `arena-vfx-skills.js` ของ Codex) — 8 instanced batch (vortex/shock/blade/orb/beam/spike/crack/flare) + เศษหินมีแสงเงา + ใช้ `R3.flash` (เฉพาะ high) และ `R3.shakeNear`
  - แตะไฟล์ Codex 1 บรรทัด: `arena-vfx-skills.js` `pulse()` เรียก `P.v3Pulse(style,...)` หลัง `claim` — ใช้ style ที่ choreography ตัดสินแล้ว ไม่ wrap ระบบเกม
  - คุณภาพ: high ~360 instance + debris 140 / low ราวครึ่ง / reduced-motion ลดอีก · มีงบต่อเฟรม · ซ่อนนอกระยะมองเห็น (fow)
- ทดสอบ (emulation): อาวุธ 5 อาชีพ × 3 ระดับในมือ (ภาพ), 18 สกิลพรีวิว high, เล่นบอทเรนเดอร์ high/low, แมตช์บอท, 0 error
- ค้าง: FPS มือถือจริง · Hunter Bow ไม่มีสาย · ท่ายิงธนูจริง

## 2026-11-18 · Claude · Phase 5 Celestial Armory: ฮีโร่ 5 อาชีพ rig แล้ว เปลี่ยนตามอาวุธ (index เท่านั้น)
- รายงาน: `moonfall-docs/PHASE5-CELESTIAL-ARMORY-REPORT.md` · เจ้าของอนุมัติ 115 เครดิต (rig 5 อาชีพ + 6 ท่า/อาชีพ)
- `src/p5-heroes.js` (ใหม่, render): ห่อ `R3.objFor/qnAnim/qnDie/effects` · ฮีโร่เป็นวัตถุ `qn:1,p5:1` · อาชีพจาก `u.wk` · อาวุธเกมติดกระดูก RightHand/LeftHand
- `build.py`: key `p5-*` เข้า CELESTIAL_KEYS ของ index และ `CELESTIAL_SKIP` ของ cursed · `celestial-assets.js` ยอม skinned สำหรับ p5-*
- แก้ร่วม: `eclipse-fx.js` ล็อกสะโพกที่ตำแหน่งท่า idle (เดิมใช้เฟรมแรกของแต่ละ clip ทำให้ตัวเลื่อนตอนโจมตี)
- ทดสอบ: 5 อาชีพ × อาวุธ, ท่าครบ, ตาย, พุ่ง, บอท/ออนไลน์ regression

## 2026-11-17 · Claude · ศัตรู Eclipse ถืออาวุธ
- เจ้าของชี้ว่ามีไฟล์อาวุธอยู่แล้ว: Overlord ถือ Lunar Greatsword · Sentinel ถือ Eclipse Scythe · Construct ถือ Moon Staff ที่กระดูก RightHand (`ECW`/`eclArm` ใน `src/eclipse-fx.js`) + ประกายที่ปลายอาวุธ · ตัด halo วงแหวนที่ลอยแยกออกเมื่อเป็นโมเดล rig (โมเดลมี halo ของตัวเอง)
- ทดสอบ: ภาพ idle/โจมตีทั้ง 3 ตัว, แมตช์บอท index 1 รอบ, 0 error

## 2026-11-17 · Claude · เปลี่ยนโฟกัส
- เจ้าของสั่ง: หยุดพัฒนา `cursed.html` ก่อน เน้น `index.html` (เพิ่มเป็นกติกาข้อ 0 ใน AGENTS.md)
## 2026-11-17 · Claude · Phase 3 Eclipse Reign: Celestial Overlord + Dark Sentinel + Lunar Construct + อาวุธในตำนาน + VFX (PR #15, merge ตามที่เจ้าของสั่ง)
- รายงานเต็ม: `moonfall-docs/PHASE3-ECLIPSE-REIGN-REPORT.md`
- `src/eclipse.js` (host logic, CURSED): ห่อ `genWorld` (แท่น + เปลี่ยนชนิดค่าย ไม่เปลี่ยน id/ตำแหน่ง), `mkMob`, `setMobStats`, `mobThink`, `dealDamage` (block/weak point/poise), `hitArea` (`a.safe`), `kill` (ดรอป), `basic` (proc), `equipWeapon`, `applyEvent` (event `{t:'ec'}`) · aoe kind ใหม่ต่อท้าย `AOE_KINDS` (ห้ามแทรกกลาง — index ใช้ในแพ็กเก็ต)
- `src/eclipse-fx.js` (render): ห่อ `R3.objFor/animBig/aoeVis/effects`, `drawTarget` (แถบบอสแทนกรอบศัตรูเดิมเมื่อเป็น Overlord)
- อาวุธในตำนาน = `wv` bit 15–16 (1 greatsword/gsword, 2 scythe/axe, 3 staff/frost) · `heroRow` ช่อง 16 ส่ง id นี้ · `mobRow` ของบริวารต่อท้าย `-1, EK index`
- เจ้าของอนุมัติ rig + merge: Overlord/Sentinel/Construct rig ด้วย Meshy (69 เครดิต) 6 clips/ตัว → `eclipse-fx.js` เล่นด้วย AnimationMixer (static mesh เป็น fallback) · loader ยอม skinned เฉพาะ 3 key นี้
- พบปัญหาเดิมของเกม: unit loop ซ่อน mob ที่ตายก่อน event 'die' ถึง doFx ทำให้ mob ทั่วไปไม่มีท่าตาย — แก้เฉพาะตัว Eclipse (เริ่มท่าตายใน hook ของ eclipse-fx) ตัวอื่นยังเหมือนเดิม
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
