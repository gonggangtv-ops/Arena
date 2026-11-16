# Arena Royale Reborn — Phase 1

## สถานะส่งมอบ

แก้ซอร์สจริงให้เล่นฉาก **Moonfall แบบ procedural** ได้แล้ว พร้อมตัวโหลด GLB
และ adapter สำหรับ Warrior เมื่อมีไฟล์จริง ทั้ง 5 Meshy exports ยัง missing
ไม่มีการอ้างว่าดาวน์โหลดหรือเชื่อม Celestial Warrior จริงสำเร็จ
ภาพปัจจุบันเป็นฐาน Dark Celestial Fantasy สำหรับพัฒนาต่อ ไม่ใช่การรับรอง AAA
หรือ FPS บนอุปกรณ์จริง

## เปิดทดสอบ

```sh
cd /workspace/Arena
python3 -m http.server 8010
```

เปิด `http://localhost:8010/` หรือ `/cursed.html` แล้วเลือก **☽ สำรวจ Moonfall**
เพื่อเริ่ม Solo ตามระบบเดิมและวางผู้เล่นใกล้ประตูปราสาท ศัตรูยังโจมตีได้ตามปกติ
ปุ่ม Solo ปกติและออนไลน์ยังใช้จุดเกิดเดิม ปุ่มสำรวจใช้การตั้งค่า Solo เดิม
ถ้าเลือกแมพเล็ก ปราสาทอาจอยู่นอกวงตามกติกาเดิม

เลือก High เพื่อดู Bloom/AO/เงา หรือ Low สำหรับประหยัด เปิด
**สถานะโมเดล / Performance** เพื่อตรวจไฟล์และตัววัด เพิ่ม `?perf=1` ได้
มือถือใช้แนวนอนตาม flow เดิม โหมด 2D สำรองยังอยู่

## ผลตรวจโครงสร้างเดิม

| ส่วน | ตำแหน่ง / หน้าที่ |
| --- | --- |
| Entry | index.html / cursed.html; static ไม่มี build step |
| Three.js | engine.min.js รวม AR_GLTF.GLTFLoader, SkeletonUtils และ AR_POST |
| Assets เดิม | models2.js: embedded models/animations, models4.js: boss; ไม่ลบหรือทับ |
| โลก | genWorld → setupWorld → buildCollide/buildMini; R3.sync → R3.buildWorld สร้างภาพ |
| ตัวละคร | objFor เลือก qnHero/kkHero/hero; qnBuild/kkBuild clone skeleton และ AnimationMixer |
| อาวุธ | weapon, arm, qnArm, kkArm ใช้ u.wk/u.wt และระบบสลับเดิม |
| Combat/AI | basic, cast, dealDamage, hostUpdate, HP/MP, skill tables และ AI ใน inline script |
| Collision | WD.walls/solids, WD.cg, collideUnit, terrain SDF, buildNav/A* |
| Multiplayer | PeerJS/room transport, snapFor/heroRow/selfRow/applySnap และ interpolation |
| Rendering | R3.frame/draw, ACES/sRGB, shadow camera, composer/AO/UnrealBloomPass |

เทียบส่วนตั้งแต่ `const CURSED` จนก่อน `const R3` กับ HEAD เดิมแล้ว **ไม่เปลี่ยน**
รวม damage, skills, AI, collision, network และ HUD เดิม SHA-256:

```text
index.html  fb7ec7c88ceeadd1b6af0f3719669cc72fd822ce946cbdd4c350ef9bdd867e75
cursed.html ccc214cb556802de1339e546050311e75b4cf482e3346f2b71479c30d6a36ae4
```

## งานที่ทำ

- เปลี่ยน art layer จาก Sakura เป็น Celestial โดยเก็บไฟล์ anime เดิมไว้
- UI กรมท่า เงิน ทองหม่น; ปิด global toon shader/outline ให้ใช้แสงต่อเนื่อง
- พื้น 208 ชิ้น กำแพงตาม collider เดิม เสาวิหาร 6 ตำแหน่ง คอลัมน์ dungeon
- PBR แผ่นหินมีลาย/normal map ขอบทอง ร่องเสา รูน แสงจันทร์ ดาว และหมอก
- InstancedMesh แยก geometry/material สำหรับวัตถุซ้ำ; fog of war/วงพายุยังอยู่
- High: DPR สูงสุด 1.5 + Bloom/AO/เงา; Low: DPR สูงสุด 1 และปิด composer
- Auto เลือก Low บน mobile; คืน pass/shadow/instance buffers เมื่อ rebuild
- Diagnostics: FPS, CPU submit ms, draw calls รวม pass, triangles, geometries,
  textures และ JS heap ถ้ารองรับ; ไม่อ้างว่าเป็น VRAM
- GLB gateway ตรวจ header/embedded resources/budgets และ skeleton/clip จริง
- Warrior adapter ใช้ unit เดิม, AnimationMixer แยกตัว, อาวุธ/สถานะ/ตาย/ฟื้น
  ใช้ fallback เดิมจนกว่าจะมีไฟล์และ rig ผ่าน admission

## ไฟล์เพิ่ม / แก้ไข

| ไฟล์ | งาน |
| --- | --- |
| index.html, cursed.html | โหลด layer ใหม่, UI hooks, TOON=false, dispatch warrior animation/death, กัน dress/arm ของ rig เดิม |
| celestial-render.js | ฉาก PBR/instancing, post/quality/lifecycle, warrior adapter, สำรวจและ diagnostics |
| celestial-assets.js | local GLB gateway, inspection, budgets, missing/error reporting |
| celestial-theme.css | responsive Dark Celestial UI, control IDs เดิม |
| assets/meshy/manifest.json | Task IDs, paths, availability และ rig/clip mapping |
| assets/meshy/README.md | รายการ GLB ขาด วิธี import และข้อจำกัด |
| scripts/import-meshy.py | import/scan GLB ที่ export มาแล้ว ไม่มีการสร้างไฟล์ปลอม |
| scripts/smoke-celestial.py | Chromium regression suite และ synthetic GLB fixtures |
| ART-DIRECTION.md | เอกสาร art layer ที่ใช้งานปัจจุบัน |
| PHASE1-REPORT.md | รายงานนี้ |
| reports/phase1-results.json, reports/phase1-test-log.txt | ผลทดสอบจริงและค่า resource counts |

## การทดสอบ

รัน `python3 scripts/smoke-celestial.py` โดยใช้ Python Playwright และ Chromium
ผลล่าสุด **ผ่านครบ** วันที่ 2026-11-16:

| กรณี | ผล |
| --- | --- |
| index.html และ cursed.html | เปิดฉาก, Low → High → Low → High → Low, Bloom/AO, ภาพกลางคืน ผ่าน |
| ระบบเดิม | ผู้เล่น 32 คน, real loop/AI ทำงาน, damage 123 ตรงค่า, basic attack, สกิล shield/MP/cooldown ผ่าน |
| Collision | ข้อมูลโลกไม่ถูก renderer แก้, ขอบเขตโลกและการดันออกจากกำแพงผ่าน |
| Multiplayer | serialize/apply snapshot roundtrip ผ่าน; ยังไม่ใช่การเชื่อมต่อข้ามเครื่อง |
| Mobile emulation | 844×390, DPR อุปกรณ์ 3 → render DPR 1, Auto เลือก Low; native touch โจมตี/ปล่อยและจอยเดิน/ปล่อยผ่าน |
| Synthetic GLB มี rig | loader, static normalization/instancing, unit reference, animation, เปลี่ยนอาวุธ, death/revive และ render ผ่าน |
| Synthetic GLB ไม่มี rig / เสีย | รายงานไม่พร้อมและรักษา fallback ผ่าน; ไม่บันทึก fixture เป็น production asset |
| Native menu | สร้างฉาก background จริงและเรนเดอร์ได้ ไม่มี page error |
| Importer | รับ GLB fixture ถูกต้อง และปฏิเสธไฟล์ว่าง/เสีย/ตัดขาด |
| Syntax / diff | node --check, Python syntax และ git diff --check ผ่าน |

ตรวจพบและแก้ resource leak ระหว่าง quality rebuild: actor ที่ถูกถอดจาก scene,
instance/skeleton buffers, shadow/pass targets และ texture ของ terrain splat / water depth/normal
ที่ถูกเก็บใน shader closure ปัจจุบันคืนเมื่อเลิกใช้ โดยรักษา caches และ GLB prototypes

Resource counts หลังอุ่น cache ในช่วง deterministic rebuild test:

| หน้า | Low รอบ 2 → Low รอบ 3 | High รอบ 1 → High รอบ 2 |
| --- | --- | --- |
| index | geometry 90 → 90, texture 42 → 42 | geometry 92 → 92, texture 58 → 58 |
| cursed | geometry 89 → 89, texture 44 → 44 | geometry 91 → 91, texture 60 → 60 |

มี regression assertions กันการเพิ่ม resource counts ในรอบนี้แล้ว
หลังปล่อย loop จริง จำนวนเปลี่ยนได้เพราะ model pack เดิมโหลดแบบ async
ยังต้องทำ long soak test / GC profiling เพิ่ม ไม่อ้างว่า JS heap คงที่ตลอดเกม

เครื่องทดสอบเป็น **Chromium + SwiftShader software GPU** ตัวอย่าง runtime sample:
index 1 FPS / 290 draw calls / ~1.13M triangles / JS heap 282 MiB;
cursed 1 FPS / 407 draw calls / ~1.16M triangles / JS heap 271 MiB
ค่าดังกล่าวใช้แสดงข้อจำกัดเครื่องนี้ ไม่ใช่ผล benchmark Desktop GPU หรือมือถือจริง
CPU submit ที่แสดงใน UI ไม่รวม GPU execution time และยังไม่สามารถวัด VRAM ได้
ยังไม่ผ่านการรับรองเป้าหมาย 30/60 FPS บนอุปกรณ์จริง

ผลดิบ: [phase1-results.json](reports/phase1-results.json),
[log ชุดทดสอบ](reports/phase1-test-log.txt)
ภาพทดสอบรอบล่าสุดอยู่ที่ `/tmp/arena-celestial-0c6cak6a/`
และภาพเมนูจริง `/tmp/moonfall-live-menu.png`

## ข้อจำกัด / งานต่อ

1. นำ GLB ทั้ง 5 จาก Task IDs ใน assets/meshy/README.md มา import
   การ probe Meshy API ถูก proxy ปฏิเสธ HTTP 403 และไม่มีบัญชี/API credential
2. ตรวจ rig จริง; ถ้าไม่มี skin/rig ต้อง rig ก่อน พร้อม idle/walk/attack/cast/hit/death
3. Calibrate pivot/facing/scale และ hand sockets/ท่าจับอาวุธสองมือ โล่ ธนู
   การทดสอบ synthetic ตรวจ adapter ได้แต่ไม่ยืนยันคุณภาพท่าใน asset จริง
4. Moon Arena อยู่บน keep เป็นมงกุฎวิหาร ใช้ collider เดิมเพื่อรักษา AI/การเดิน
   การเปลี่ยนทั้งสนามต้อง author collider/nav และ version map ให้ Multiplayer
5. ทำ LOD ลด material slots/bake textures และทดสอบ FPS/memory ระยะยาว
   บน Desktop GPU และ Android/iOS จริง; software GPU ไม่ใช่ผลรับรอง hardware
6. ทดสอบ Multiplayer ข้ามเครื่องกับ signaling/TURN จริง; snapshot roundtrip
   ไม่ครอบคลุม latency/reconnect หรือบริการภายนอก
7. Boss/NPC เดิมยังอยู่และอาจต่าง art style จนกว่าจะมี replacement เหมาะสม
