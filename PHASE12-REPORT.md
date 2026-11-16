# Arena Royale Reborn — Phase 1 & 2

## สถานะ: ยังไม่ครบตามเงื่อนไขส่งมอบ

แก้ซอร์สจริงบน branch `feat/moonfall-phase-1-2` แล้ว แต่ **ยังไม่มี GLB จริงทั้ง
13 ชิ้นใน checkout** จึงยังไม่ผ่านการรับรอง Phase 1/2 และไม่ควร merge งานนี้
เป็นการส่งมอบโมเดลสมบูรณ์

Meshy MCP เชื่อมบัญชีและอ่านข้อมูลได้ ตรวจ Task IDs ทั้ง 13 แล้วได้ `SUCCEEDED`
ทั้งหมด แต่ `meshy_download_model` ดาวน์โหลดจาก `assets.meshy.ai` ไม่ได้ HTTP 403
ผลตอบกลับเป็น URL fallback ไม่ใช่ไฟล์ GLB จึงคง `available: false` ทุกชิ้น
ดูสถานะที่ตรวจจริงใน [reports/phase12-assets.json](reports/phase12-assets.json)

สิทธิ์เครือข่ายในสภาพแวดล้อมที่กำลังรันอนุญาต `api.meshy.ai` แต่ยังไม่อนุญาต
`assets.meshy.ai` และ `api.github.com` การตรวจ GitHub API สำหรับ PR ก็ถูกบล็อก 403
เตรียมสองโดเมนนี้ในฉบับร่างการตั้งค่าแล้ว ต้องให้ผู้ใช้บันทึก/เผยแพร่เพื่อมีผล
ไม่มีการสร้าง แก้ rig หรือสั่งงาน Meshy ที่ใช้เครดิตในรอบนี้

## โค้ดที่เพิ่มแล้ว

- `moonfall-environment.js`: ฉาก Phase 2 จากตำแหน่งที่กำหนดโดย seed เดียวกัน
  ทั้ง host/client เพิ่มข้อมูลก่อน grid collision และ A* ของระบบเดิมสร้างเสร็จ
- กำแพงมุมใช้ volume ของเสาปราสาทเดิม ประตูใช้เสาประตูเดิม ซุ้มและพอร์ทัล
  มี collider แยกเสาสองข้างโดยเว้นทางเดินตรงกลาง
- รูปปั้น เศษหิน และกระถางไฟมี collider; ตำแหน่งหลบกำแพง เสา และของ/มอนสเตอร์
  ที่เกิดอยู่แล้ว พร้อมสงวนพื้นที่บันไดก่อนจัดวางวัตถุอื่น
- บันไดมีพื้นลาดต่อเนื่องเชื่อม landing ยกสูงและราวกั้นที่มองเห็นได้ พื้นลาน
  เดิมยังราบอยู่ใต้บันได ไม่ยก tile พื้นลานตามความสูงของผู้เล่น
- Portal Shader แบบโปร่งใส/additive หมุนตามเวลา พร้อมขอบวงเรืองแสงและการซ่อน
  ตามระยะ fog of war; ไม่เพิ่มความสามารถ teleport ใหม่
- เปลวไฟกระถางใช้ shader บน quad ไขว้ ไม่เพิ่ม texture หรือ dynamic light
  ใหม่ ใช้ Bloom เดิมเมื่อเลือก High
- ใช้ InstancedMesh สำหรับวัตถุซ้ำ; material/geometry caches และ resource cleanup
  ของ Phase 1 ยังทำงาน ลดการ rebuild ระหว่างโหลด GLB หลายชิ้นให้รอชุดโหลดจบ
- `manifest.json` เวอร์ชัน 2 รวม Task ID ทั้ง 13 พร้อมเฟสและสถานะจาก API
  ชื่อไฟล์ GLB จะใช้งานจริงต่อเมื่อ import สำเร็จ ไม่สร้างไฟล์ปลอมแทน Meshy
- Inventory, HP, damage, skills, AI และรูปแบบ snapshot เดิมคงไว้ การเปลี่ยนแปลง
  ใน core ก่อน R3 มีเพียง `VER=10` เพื่อใช้ version handshake เดิมป้องกัน client
  แผนที่เก่าเข้าห้องใหม่ที่มี collider เพิ่ม ไม่มีการเปลี่ยนกติกาการต่อสู้
- เพิ่ม guard ในตัวเรนเดอร์อาคารให้ข้ามราวบันไดที่ไม่มี house ID ป้องกัน JS error
  จากการตีความ collider ใหม่ว่าเป็นผนังบ้าน
- ไม่แก้ assets/ระบบบอส มอนสเตอร์ หรืออาวุธ และไม่เริ่ม Phase 3

## ตัวละคร

ยังตรวจ skeleton/animation ของ **Celestial Warrior จริงไม่ได้เพราะไม่มี GLB**
จึงยังสรุปว่าไม่มี rig ไม่ได้ ตัว adapter และ original hero fallback ยังคงอยู่
เมื่อได้รับไฟล์ต้องตรวจ skin, bones, idle/walk/attack/cast/hit/death และ hand sockets
ถ้าไม่มี rig/animation ให้รายงานและคง fallback ตามที่ผู้ใช้กำหนด ห้ามสั่ง paid rigging

## เปิดทดสอบใน workspace

```sh
cd /workspace/Arena
python3 -m http.server 8010
```

เปิดหน้า `/` หรือ `/cursed.html` แล้วกด **☽ สำรวจ Moonfall**
สิ่งที่เห็นขณะนี้ยังเป็น procedural proxies เนื่องจาก GLB จริงถูกบล็อก
Shader และการเดินสามารถทดสอบได้ แต่รูปทรง/ช่องเปิดของ GLB จริงยังไม่ผ่าน visual acceptance

## การทดสอบ

- `python3 scripts/check-moonfall-layout.py`: layout สร้างซ้ำตรงกัน ทดสอบทั้งสอง
  entry points ใน seed 20261116, 42, 1900 รวม 6 กรณี แต่ละกรณีมีวัตถุ Phase 2
  ครบ 8 ชนิด บันไดมีความสูงต่อเนื่อง และทางผ่านพอร์ทัลเดิน/หาเส้นทางผ่านได้
- `python3 scripts/smoke-celestial.py`: ใช้ manifest ที่บังคับ missing สำหรับ
  fallback tests และ GLB สังเคราะห์ที่ส่งผ่าน test route สำหรับ loader/rig tests
  แยกจากการตรวจไฟล์จริง ไม่บันทึก fixtures เป็นโมเดล production
- `python3 scripts/check-meshy-assets.py --require-complete`: ต้องผ่าน 13/13
  จึงจะอ้างว่า import ครบ ปัจจุบัน **ไม่ผ่านเพราะขาดไฟล์ทั้ง 13 ชิ้น**
- ตรวจ JavaScript/Python syntax และ diff whitespace; เปรียบเทียบ core กับ
  `origin/gh-pages` แล้วตรงกันทั้งหมดเมื่อยกเว้น version constant ของ handshake
ผลรอบสุดท้ายผ่านทั้งสองหน้าเกม:

| กรณี | ผล |
| --- | --- |
| Desktop 3D Low/High และ shader ที่มองเห็นจริง | ผ่าน ไม่มี page/GLSL error ที่ชุดทดสอบตรวจพบ |
| Damage 123 / basic attack / skill shield, MP, cooldown | ผ่าน |
| Inventory potion count, regeneration, cooldown | ผ่าน |
| Snapshot serialize/apply และ version guard ปฏิเสธ client เก่า | ผ่าน |
| ทางเข้าประตู / collider / nav / บันได | ผ่าน |
| Mobile emulation 844×390: native touch attack/joystick | ผ่าน Auto Low / DPR 1 |
| Synthetic GLB rigged, unrigged, corrupt | ผ่าน loader/adapter/fallback checks |
| Real GLB acceptance | ไม่ผ่านเงื่อนไขไฟล์: 0/13 ยังดาวน์โหลดไม่ได้ |

GPU resource counts ใน fallback scene หลังอุ่น cache:

| หน้า | Low รอบ 2 → Low รอบ 3 | High รอบ 1 → High รอบ 2 |
| --- | --- | --- |
| index.html | 91 geometry / 42 texture → 91 geometry / 42 texture | 93 geometry / 58 texture → 93 geometry / 58 texture |
| cursed.html | 90 geometry / 44 texture → 90 geometry / 44 texture | 92 geometry / 60 texture → 92 geometry / 60 texture |

ชุดทดสอบมี assertion กัน resource counts เพิ่มซ้ำใน quality rebuild ชุดนี้
ไม่ได้ยืนยันว่า JS heap/VRAM คงที่ระยะยาว และยังไม่ผ่านการทดสอบด้วย GLB จริง

ผลดิบ: [phase12-results.json](reports/phase12-results.json),
[smoke log](reports/phase12-test-log.txt), [layout log](reports/phase12-layout-log.txt)
ภาพจากรอบนี้: `/tmp/arena-celestial-ap5fuzlk`; ภาพ portal ถูกเปิดดูยืนยัน shader/บันได/ทางเดินแล้ว
ภาพทั้งหมดเป็นฉาก proxies ไม่ใช่ผลตรวจโมเดล Meshy จริง

ทดสอบบน Chromium/SwiftShader software GPU ไม่ใช่ผลรับรอง FPS หรือ VRAM ของ PC
หรือมือถือจริง การทดสอบ snapshot เป็น local roundtrip ไม่ใช่ multiplayer ข้ามเครื่อง

## งานค้างที่ขวางการจบ Phase 1/2

1. ใช้สิทธิ์เครือข่ายใหม่ให้มีผล แล้วดาวน์โหลด GLB เดิมทั้ง 13 ผ่าน Meshy MCP
   ขั้นตอนและ Task IDs: [assets/meshy/PHASE2-HANDOFF.md](assets/meshy/PHASE2-HANDOFF.md)
2. Import และตรวจไฟล์จริงด้วย importer/inspector; ถ้าจำเป็นให้ optimize แบบ local
   โดยไม่ใช้เครดิต API จากนั้นปรับ scale/facing/PBR/collider masks ให้ตรงรูปทรงจริง
3. ตรวจ Warrior rig/animations จริงและท่าจับอาวุธเดิม; คง fallback หากไม่พร้อม
4. ทดสอบ collision/nav/touch/JavaScript errors/resource leaks ซ้ำด้วย GLB จริง
   ทดสอบ hardware PC/Mobile และ multiplayer สองเครื่องก่อนรับรอง production
5. เปิด PR ไป `gh-pages` ผ่าน GitHub API เมื่อสิทธิ์เครือข่ายพร้อม ปัจจุบัน API ถูกบล็อก
   ห้ามอ้างว่าลิงก์ compare/create เป็น PR ที่เปิดสำเร็จแล้ว
