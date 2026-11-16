# Arena Royale Reborn — Phase 1 & 2

## สถานะปัจจุบัน

นำ **GLB จริงจาก Meshy ครบ 13/13 ชิ้น** เข้า repository และโหลดผ่าน GLTFLoader
สำเร็จแล้ว รวม 102,253,232 bytes (97.52 MiB) ไฟล์ต้นฉบับไม่ถูกแก้ไข
ใช้ 12 ชิ้นประกอบฉาก Moonfall ที่เปิดเล่นได้ ส่วน Celestial Warrior โหลดและตรวจแล้ว
พบ **0 skins / 0 bones / 0 animation clips** จึงคงตัวละครเดิมที่มี animation
ในการต่อสู้ตามเงื่อนไขผู้ใช้ ไม่อ้างว่า Warrior แบบ static เล่นท่าต่อสู้ได้

งานนี้อยู่บน branch `feat/moonfall-real-glbs` จาก `gh-pages` ล่าสุดหลัง PR #1
ไม่มีการสร้างโมเดลใหม่หรือเรียกงาน Meshy ที่ใช้เครดิต ตรวจการเชื่อมต่อและเครดิตได้สำเร็จ
ไม่มี API key, signed URL หรือ private MCP metadata ในเว็บหรือ Git
ไม่เริ่ม Phase 3 และไม่เพิ่ม/แก้ระบบบอส มอนสเตอร์ หรืออาวุธ

## เปิดเล่นและดูภาพ

```sh
cd /workspace/Arena
python3 -m http.server 8010
```

เปิด `http://localhost:8010/` หรือ `/cursed.html` แล้วกด **☽ สำรวจ Moonfall**
เพื่อเริ่ม solo ใกล้สนามใหม่ ปุ่ม Solo/Multiplayer ปกติยังใช้กติกาและจุดเกิดเดิม
แผง **สถานะโมเดล / Performance** แสดงสถานะโหลดจริงและข้อมูล rig
รอโหลดครบ 13/13 สำหรับตรวจฉากทั้งหมด; ระหว่างโหลดมี fallback และ rebuild
ครั้งเดียวเมื่อชุดโมเดลพร้อม การ merge PR เป็นขั้นตอนแยกจากการเปิดทดสอบนี้

- [ภาพโมเดลจริงทั้ง 13 ชิ้น](reports/real-meshy/asset-catalog.png)
- [พอร์ทัลและลานจริง](reports/real-meshy/index-portal-frame.png)
- [บันไดและราวกั้น](reports/real-meshy/index-moon-stairs.png)
- [เกมบนมือถือจำลอง](reports/real-meshy/mobile-moon-stairs.png)

## สิ่งที่เปลี่ยนในเกม

- Moon Arena เป็นแท่นวงกลมเตี้ยที่เดินบนได้ในโถงกลาง ใช้ตำแหน่งเดิมของลาน
  ไม่ยืดโมเดลแบนให้กลายเป็นยอดอาคารสูง
- Modular Floor ปรับเป็นแผ่นปูพื้นบาง ใช้ 56 instances ใน Low / 208 ใน High;
  Modular Wall แบ่งชิ้นตามความยาวกำแพงและหมุนแกนให้ตรงรูปทรงจริง
- Ancient Pillar รักษาสัดส่วนจริงให้ฐานอยู่ในวง collision เสาเดิม ตัดเครื่องประดับ
  สำรองที่ซ้อนกับ gem ของ GLB เมื่อโหลดโมเดลจริงแล้ว
- Temple Gate ขยายความกว้างให้ช่องประตูจริงตรงกับทางเข้าเดิม; Wall Corner
  อยู่ใน envelope ของเสามุมเดิม Ruin Arch ใช้ collider สี่เสาตาม GLB
- Portal Frame ฝังฐานทึบลงใต้พื้นเพื่อเว้นช่องเดิน พร้อม Portal Shader ที่เคลื่อนไหว
  ตามเวลา เป็นเอฟเฟกต์ภาพ ไม่เพิ่มความสามารถ teleport ใหม่
- Guardian Statue, Rubble และ Brazier หลบตำแหน่งกำแพง/เสา/ของ/มอนสเตอร์เดิม
  เปลวไฟใช้ shader บน quad ไขว้ ไม่เพิ่ม texture หรือ dynamic light
- Moon Stairs เชื่อม landing และราวกั้น ระดับพื้นของบันได/แท่น/ธรณีประตูใช้
  height grid 33×33 ที่ bake จากสาม GLB จริง พร้อม SHA-256 อ้างอิงต้นฉบับ
- ข้อมูล layout/collider/height สร้างก่อนระบบ collision และ nav เดิม ทำซ้ำได้
  ด้วย seed เดียวกันทั้ง host/client ไม่ขึ้นกับความเร็วในการโหลดโมเดล
- Layout revision 3 และ network version 11 ใช้ handshake เดิมป้องกันแผนที่ต่างรุ่น
  ไม่มีการเปลี่ยน payload หรือกติกาการต่อสู้
- PBR, Moonlight, Fog, Shadows, AO และ Bloom ใช้ระบบ renderer/quality เดิม
  Low ปิดเงาและ postprocessing; High เปิดตามคุณภาพที่เลือก

## Performance และข้อจำกัด

วัตถุซ้ำใช้ InstancedMesh และ cache geometry/material เดิม แผนที่ embedded 2K
ถูก resize ก่อน upload เป็น desktop ≤1024px / mobile ≤512px พร้อมจำกัด DPR
Low 1 / High 1.5 การ resize ไม่เปลี่ยน bytes ของต้นฉบับ GLB

52 maps รวม mipmaps แบบ RGBA8 คำนวณได้ราว 277 MiB desktop / 69 MiB mobile
เฉพาะ maps ชุดนี้ ไม่ใช่ VRAM ที่วัดจริงและยังไม่รวม targets/geometry/เกมเดิม
Cold download ยังประมาณ 97.5 MiB และ actor/draw calls ของโลกเดิมยังสูง
จึงยังไม่รับรอง 60 FPS หรือ AAA บนมือถือจริง การทดสอบใช้ Chromium/SwiftShader
และ mobile emulation เท่านั้น

ผล resource count ที่ตำแหน่งทดสอบ หลัง cache อุ่นและสลับ quality ห้ารอบ:

| ฉาก | Low รอบ 2 → 3 (geometry / texture) | High รอบ 1 → 2 | Draw calls Low / High |
| --- | --- | --- | ---: |
| index.html | 103/84 → 103/84 | 105/100 → 105/100 | 1204 / 1317 |
| cursed.html | 102/85 → 102/85 | 104/101 → 104/101 | 1286 / 1392 |
| Mobile emulation | 103/83 → 103/83 | 105/99 → 105/99 | 1208 / 1323 |

ไม่พบการเพิ่มต่อเนื่องของจำนวน resource ในการทดสอบนี้; ยังไม่ใช่ผลทดสอบ
heap/VRAM ระยะยาว Draw calls เป็นทั้ง scene รวมตัวละครและโลกเดิม

## การทดสอบและหลักฐาน

- `python3 scripts/check-meshy-assets.py --require-complete`: ผ่าน 13/13 GLB จริง
  ตรวจ header, embedded resources, bytes, triangles, skin/clip และ SHA-256
- `python3 scripts/bake-moonfall-surfaces.py --check`: ผ่าน height grids ทั้งสาม
  ตรงกับ GLB ต้นฉบับและ rotation ที่ใช้จริง
- `python3 scripts/check-moonfall-layout.py`: ผ่านทั้งสองหน้า × สาม seed
  (20261116, 42, 1900) รวม 6 กรณี layout เหมือนกัน มี Phase 2 ครบแปดชนิด
  พร้อมบันไดและทางเดิน/นำทางผ่านพอร์ทัล
- `python3 scripts/smoke-real-meshy.py`: ผ่าน desktop สองหน้าและมือถือจำลอง
  โหลด 13/13, ใช้ฉาก 12 ชนิด, raycast ช่องประตู/ซุ้ม/พอร์ทัลที่ระดับตัวละคร
  ผ่านทั้ง collision และ nav; เทียบระดับพื้นกับ triangle จริงคลาดเคลื่อน <1.5
  world units; ตรวจ texture limits, 32 heroes, hero fallback, quality rebuilds,
  native touch attack/joystick และไม่พบ page/GLSL error
- `python3 scripts/smoke-celestial.py`: รายงาน regression แยกใน
  [phase12-test-log.txt](reports/phase12-test-log.txt) และ
  [phase12-results.json](reports/phase12-results.json) ครอบคลุม damage/basic attack,
  skills/MP/cooldown, inventory, AI ผ่าน real loop, snapshot roundtrip,
  version guard, bounds/collision, mobile input และ missing/corrupt/rig fixtures
  fixtures เป็นข้อมูลสังเคราะห์ใน test routes ไม่ใช่ไฟล์ production
- ตรวจ JS/Python syntax และ diff whitespace; core ใน HTML ก่อน `const R3=`
  เหมือน `origin/gh-pages` เมื่อยกเว้นค่า network version 10 → 11

ข้อมูลจริง: [asset inspection](reports/phase12-assets.json),
[runtime results](reports/real-meshy/results.json),
[real test log](reports/real-meshy/test-log.txt),
[layout log](reports/phase12-layout-log.txt)

## ไฟล์ที่เพิ่มหรือแก้ไข

- เพิ่ม `assets/meshy/*.glb` 13 ไฟล์; เปิด availability ใน `manifest.json`
- แก้ `celestial-assets.js`: จำกัดขนาด decoded maps ตามอุปกรณ์
- แก้ `celestial-render.js`: calibration ของพื้น กำแพง เสา และแท่น Moon Arena
- แก้ `moonfall-environment.js`: สัดส่วน/ตำแหน่ง/เสาซุ้มและพื้นตามโมเดลจริง
- เพิ่ม `moonfall-collision-data.js` และ `scripts/bake-moonfall-surfaces.py`
- แก้ `index.html`, `cursed.html`: โหลด collider data ก่อน world และปรับ handshake
- เพิ่ม `scripts/smoke-real-meshy.py`; ปรับ regression expectations ตาม layout
- อัปเดต `ART-DIRECTION.md`, asset README/handoff และรายงานพร้อมภาพจริง
- เพิ่ม `.gitignore` สำหรับ Python cache ของ scripts

## งานค้าง

1. รับ Warrior ที่มี rig และหก animation clips พร้อม hand sockets แล้วตรวจ grips,
   animation transitions และ root motion กับเกมเดิม ปัจจุบัน fallback ทำงานตามที่ขอ
2. ทดสอบมือถือ/PC จริง, FPS/thermal/VRAM ระยะยาว, เพิ่ม LOD/texture compression
   และลด cold download/draw calls ของ scene โดยไม่เปลี่ยนกติกา
3. ทดสอบ multiplayer สองเครื่องผ่าน network จริง การทดสอบรอบนี้ครอบคลุม
   deterministic layout, snapshot local roundtrip และ version mismatch เท่านั้น
4. ตรวจ PR และ merge ไป `gh-pages` เมื่อพร้อมเผยแพร่ งานนี้ยังไม่ merge/deploy
