# Moonfall Nature Upgrade

เปลี่ยนพื้นดิน ต้นไม้ และหินในซอร์สเกมจริงบน `feat/moonfall-nature-upgrade`
ใช้โค้ด Phase 1/2 ที่ `05893b1` เพื่อรักษา GLB เดิมทั้ง 13 ชิ้น และอ่าน handoff
จาก `feat/moonfall-ground-vegetation-rocks` ที่ `90669e1` โดยนำเอกสารมารวมด้วย
Branch นี้ต่อจาก PR #2 ซึ่งยังไม่ merge; เมื่อ #2 merge diff ของ Nature จะเหลือเฉพาะรอบนี้
ไม่มีการ merge/deploy หน้าเว็บในงานนี้

เปิดทดสอบด้วย `python3 -m http.server 8010` จากโฟลเดอร์ repo แล้วเข้า
`http://localhost:8010/` หรือ `/cursed.html` เลือก Solo เพื่อเล่นโลกภายนอก
หรือกด **สำรวจ Moonfall** แล้วเดินออกนอกกำแพงวิหาร ฉากป่าจันทราเปิดเป็นค่าเริ่มต้น
และสลับกลับได้ในแผงสถานะโมเดล ภาพเปรียบเทียบอยู่ในลิงก์ผลทดสอบด้านล่าง

## โมเดลจริงที่นำเข้า

โหลด textured exports จากงานเดิม ตรวจ header/resources แล้วใช้ importer ของ repo
นำ GLB พร้อม embedded PBR maps เข้า `assets/meshy/` สำเร็จ 4/4 ไฟล์
รวม 33,562,116 bytes (32.01 MiB) ต้นฉบับไม่ถูกแก้ไข ไม่มีการสร้างโมเดลใหม่
หรือเรียก remesh/rig/animation/convert ที่ใช้เครดิต ยอดเครดิตไม่เปลี่ยนระหว่างดาวน์โหลด

| Asset | Task ID | Triangles | Maps |
| --- | --- | ---: | --- |
| Gnarled leafless moon tree | `01a1e5de-ff15-723e-8432-05aa2913190b` | 4,162 | 4 × 2048px embedded |
| Silver-leaf moon tree | `01a1e5df-10c3-7669-a8ad-db3b59a3e26a` | 5,252 | 4 × 2048px embedded |
| Rough dark basalt boulder | `01a1e5df-21c4-76b4-98f0-2115d5c09dad` | 3,110 | 4 × 2048px embedded |
| Moonstone rock cluster | `01a1e5df-5a17-76bf-bdc1-778215cc0611` | 3,504 | 4 × 2048px embedded |

ไฟล์และ SHA-256: [biome-assets.json](reports/biome-assets.json)
ภาพจาก GLB จริง: [asset catalog](reports/moonfall-biome/asset-catalog.png)

## พื้นและธรรมชาติ

`moonfall-biome.js` เป็น adapter ของระบบ Three.js เดิม ติดตั้งหลัง Phase 1/2
และใช้ระบบ `P.genTex`, `P.fow`, terrain splat และ `P.instC` ที่มีอยู่

- สร้าง texture tileable สามแบบ 256px: `moon-soil`, `moon-basalt`, `moon-dust`
  แล้วผสมใน terrain fragment shader ตาม path/cliff/height masks เดิม ไม่มีการปู
  GLB หลายพันชิ้นทั่วภูมิประเทศหรือสร้าง terrain geometry อีกชุด
- ดินน้ำตาลดำ หินชาร์โคลแตกร้าว และฝุ่นเงินเป็นหย่อม กระจายด้วย detail noise เดิม
  คงทาง cobblestone ตาม splat channel และเว้น rectangle ของวิหาร/dungeon
  ไม่เปลี่ยน terrain vertices, world height grid, SDF หรือ collision
- ต้นไม้ทั้งสองแบบใช้ตำแหน่ง `WD.trees` และ `WD.mtrees` เดิม หินทั้งสองแบบใช้
  `WD.rocks` ที่มี collider อยู่แล้ว ไม่เพิ่มต้นไม้/หินขนาดใหญ่ในเส้นทางใหม่
- คงหิน prop, ผนังถ้ำ และวัตถุภายในวิหาร/dungeon เดิม แทนเฉพาะธรรมชาติภายนอก
  สัดส่วนโมเดลอิง bounds จริง หมุน/ปรับขนาดตาม seeded variation ของตำแหน่ง
- หินใหม่มี projected bounding rectangle อยู่ภายในวง collider เดิม ต้นไม้ใช้
  camera occlusion เดิม และมีราก/ตอที่มองเห็นได้เมื่อซ่อนส่วนบนของโมเดล
- คงพุ่มไม้และหญ้าสูงที่ใช้ซ่อนตัว ปรับเฉพาะสี/texture ให้เข้ากับป่า ลดความหนาแน่น
  เฉพาะ cosmetic grass/flowers ไม่เปลี่ยนข้อมูล hiding volume
- เสริมแสงจันทร์สีน้ำเงินเงินและหมอกภายนอก วิหารและถ้ำยังใช้บรรยากาศเดิม
- เลือก **สถานะโมเดล / Performance → ธรรมชาติภายนอกสนาม** ในเมนูเพื่อสลับ
  Moonfall/ฉากธรรมชาติเดิม การเลือกเป็น visual preference ในเครื่อง ไม่ส่งผลต่อ
  world seed, AI, Combat, Inventory, Skills หรือ Multiplayer

## PC / Mobile

โมเดลซ้ำใช้ shared PBR geometry/material และ InstancedMesh แบ่ง chunk 800 units
พร้อม frustum/distance culling ระยะรายละเอียด High 2900 / Low 1800 units บวก
bounding sphere ของ chunk คงต้นไม้และหินที่มี collision ให้มีตัวแทนทั้ง Low/High
ลดเฉพาะต้นไม้ภูเขาที่ไม่มี collision เหลือประมาณ 38% High / 13% Low
และ cosmetic ground cover เหลือประมาณครึ่งหนึ่ง High / หนึ่งในสาม Low

GLB source มี maps 2K แต่ก่อน GPU upload จำกัด 1024px desktop / 512px mobile
ใช้ texture caps, DPR และ Low/High เดิม ไม่เพิ่ม transparent foliage หรือลำแสง
ราคาแพง ชุดใหม่มีหนึ่ง mesh/material ต่อ GLB และไม่เกิน 8K triangles ต่อต้นไม้
หรือ 6K ต่อหิน

16 maps เพิ่มเติมคิดแบบ RGBA8+mipmaps ประมาณ 85 MiB desktop / 21 MiB mobile
ไม่ใช่ VRAM ที่วัดจริง ตัวเกมทั้งหมด 17 GLBs ยังต้องดาวน์โหลดราว 129.5 MiB
ครั้งแรก จึงยังมีงาน texture compression/streaming และ profiling อุปกรณ์จริง
FPS/CPU submit ในผลทดสอบใช้ SwiftShader software GPU บนเครื่อง Cloud ที่รัน
งานทดสอบร่วมกัน ไม่ใช่เกณฑ์รับรอง FPS ของ PC หรือมือถือจริง

## การทดสอบ

```sh
python3 scripts/check-meshy-assets.py --scope biome --require-complete
python3 scripts/check-meshy-assets.py --require-complete
python3 scripts/check-moonfall-layout.py
python3 scripts/bake-moonfall-surfaces.py --check
python3 scripts/smoke-celestial.py
python3 scripts/smoke-real-meshy.py
python3 scripts/smoke-moonfall-biome.py
```

ชุด Nature ทดสอบ `index.html`, `cursed.html` และมือถือจำลอง 844×390 ด้วย GLB จริง:
ตรวจการโหลด/maps, terrain vertex/height hashes และข้อมูลโลกไม่เปลี่ยนหลังสลับ
biome/quality เจ็ดรอบ, cobblestone texture เดิม, density High/Low, หินตรง collider,
การทำงาน AI, เมนูเลือก biome, native touch attack/joystick และ page/GLSL errors
รวมภาพ Low/High และภาพฉากเดิมที่ seed/ตำแหน่งเดียวกันเพื่อเทียบภาพ

หลักฐาน:

- [ผล Nature](reports/moonfall-biome/results.json), [test log](reports/moonfall-biome/test-log.txt)
- [เกมจริง High](reports/moonfall-biome/index-moonfall-high.png),
  [Low](reports/moonfall-biome/index-moonfall-low.png),
  [ฉากเดิม](reports/moonfall-biome/index-classic-low.png)
- [มือถือจำลอง](reports/moonfall-biome/mobile-moonfall-low.png)
- [Gameplay regression](reports/moonfall-biome/gameplay-regression.json): damage 123,
  basic attack, skill/MP/cooldown, inventory, bounds, AI through real loop,
  snapshot serialize/apply และ version guard รวม missing/corrupt/rig fallbacks
- [17 GLB compatibility](reports/moonfall-biome/phase12-compatibility.json):
  ฉาก Phase 1/2 และทางผ่านประตู/ซุ้ม/พอร์ทัลยังผ่าน
- [Layout หกกรณี](reports/moonfall-biome/layout-log.txt) และ
  [height grids ของวิหาร](reports/moonfall-biome/surface-check-log.txt) ยังตรงต้นฉบับ

## ผลรอบสุดท้าย

ผ่าน Nature ทั้งหน้าเกมหลัก หน้า Cursed และมือถือจำลอง ไม่พบ page/GLSL error
ในชุดทดสอบ ตรวจหินใหม่ 1,500 instances ต่อหน้า ทุกชิ้นอ้างอิง collider เดิม
และขนาด footprint ไม่เกินวง collision รวมตรวจการเคลื่อนที่ของ AI ผ่าน host loop

| กรณี | Low สองรอบท้าย (geometry / texture) | High รอบ 1 → 2 | Draw calls Low / High |
| --- | --- | --- | ---: |
| index.html | 82/66 → 82/66 | 84/82 → 84/82 | 370 / 463 |
| cursed.html | 77/64 → 77/64 | 79/80 → 79/80 | 188 / 282 |
| Mobile emulation | 82/56 → 82/56 | 84/72 → 84/72 | 308 / 405 |

จำนวน resource ไม่เพิ่มต่อเนื่องหลังอุ่น cache ในการสลับรอบนี้ ค่าการวาดนับทั้ง
scene ณจุดทดสอบ ไม่ใช่เฉพาะ Nature และไม่ใช่ผลรับรอง FPS/VRAM อุปกรณ์จริง
Snapshot/handshake ทดสอบแบบ local roundtrip ยังไม่ได้เชื่อมผู้เล่นสองเครื่อง

## ไฟล์ที่เปลี่ยนและงานค้าง

เพิ่ม `moonfall-biome.js`, GLB สี่ไฟล์, handoff/report นี้,
`scripts/smoke-moonfall-biome.py` และหลักฐานใน `reports/moonfall-biome/`
แก้ manifest, loader budgets, จุดติดตั้งใน HTML สองหน้าและ atmosphere hook
เพิ่ม scope ใน offline inspector และแก้ชุดทดสอบเดิมให้รองรับ manifest ที่มีมากกว่า 13 ชิ้น
ตัว gameplay core ก่อน `const R3=` เหมือน Phase 1/2 ทุกบรรทัด ไม่มีการเพิ่ม network
version เพราะข้อมูล collision/navigation และกติกาไม่เปลี่ยน

งานที่ยังต้องทำคือทดสอบ PC/มือถือจริงแบบต่อเนื่อง, GPU/thermal/heap/VRAM,
multiplayer ข้ามเครื่อง และลด cold download/terrain/actor cost เดิมเพิ่มเติม
การตรวจ resource counts กันการเติบโตในชุด rebuild นี้ ยังไม่ใช่การรับรองว่าไม่มี
memory leak ระยะยาว Celestial Warrior เดิมยังใช้ animated fallback เพราะ export
ไม่มี rig/animation ตามรายงาน Phase 1/2 ไม่ได้สั่ง rigging ใหม่ในรอบ Nature
