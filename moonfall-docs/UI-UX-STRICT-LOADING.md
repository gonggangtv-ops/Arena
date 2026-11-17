# Cursed Realm — Fusion / inventory art and strict loading

งานบน `codex/ui-ux` เริ่มจาก `main` ee8530e แล้ว rebase รวมงาน Claude #5 ที่ 31c85ab ตาม AGENTS.md และ HANDOFF.md ของ Claude
แก้ที่ src/ แล้ว build/copy ไป app/src/main/assets เท่านั้น ไม่มีการแก้ gh-pages
และ `index.html` ที่ build ใหม่ตรงกับ main เดิมทุก byte (ไม่มี Moonfall เพิ่ม)

## สิ่งที่เปลี่ยน

- สกิลหลอม 36 สกิลของ 12 อาวุธใช้ภาพใหม่ครบ รวม dual-element staff ทั้งสามแบบ
  ใช้ใน HUD และสูตรหลอม ไม่ใช้ GI glyph เป็นภาพสำรองระหว่างโหลด
- ขวดยาเลือด มานา ยาฟื้นฟูใหญ่ ยาเร่งฝีเท้า ปรับภาพทั้ง HUD และกระเป๋า
  คงจำนวน ช่องกด cooldown และเอฟเฟกต์จริงจาก BAG เดิม
- ภาพรายการร้านค้า: ยา, สมุดเลเวล, ตีอาวุธใหม่, สกิลพิเศษ 6 แบบ รวมเหรียญ
  และหัวร้าน ตัวอย่างหน้า UI ใช้ราคา/ทอง/เงื่อนไขจาก shopPrice/shopBuy เดิม
  ปุ่มซื้อเป็น native button และ disabled เมื่อซื้อไม่ได้ ปิดร้านได้ตามเดิม
- ภาพพิเศษใน HUD สำหรับเกราะ หลบ ช่อง V และกระเป๋าเข้าชุดเดียวกัน
- แปลง atlas เป็น WebP 3 ไฟล์ รวมประมาณ 1.1 MB (PNG เดิมไฟล์เดียว 2.4 MB)
  ใช้ cached canvases 144px ไม่สร้างภาพใหม่ทุก frame หรือใช้เครดิต Meshy
- แก้คำแนะนำ Shift เพื่ออัปสกิลเป็นปุ่ม + บนจอ เพราะ Shift ใน Cursed ใช้หลบ
- ลิงก์แกลเลอรีเก่าที่ไม่ได้ deploy เปลี่ยนเป็นปุ่มเปิดสูตรหลอมจริงในเกม

## โหลดครบก่อนเล่น

หน้าโหลดใช้ธีมจันทรา navy/gold พร้อม progress จากงานจริง 47 รายการในรุ่นนี้:
โมเดลฉาก 17, ข้อมูล character pack 18, atlas 3, เพลง 7, fonts และ renderer
ปุ่มเริ่มเล่นถูก disabled ตั้งแต่ HTML ก่อน JavaScript พร้อม และเมนูถูก inert
ระหว่างโหลด ไม่แสดงฉาก procedural แทนโมเดลที่โหลดไม่สำเร็จ

ตรวจ GLB ทุกไฟล์ผ่าน loader เดิม, ตรวจรายการ required models ไม่ให้หายจาก
manifest, ตรวจภาพทั้ง 81 ช่อง, ตรวจ character pack มีครบทุก key และ Rig/clip
พร้อม, ตรวจ MP3 response/header และ compile/render ฉากจริง ก่อนปลดล็อก
Celestial Warrior ที่เป็น static ยังไม่ได้รับ rig ใหม่ ตัวเล่นใช้ QN rig จริง
ที่เป็นชุดหลักใน main และต้องโหลดครบ ไม่ได้ใช้ procedural hero แทนไฟล์ที่เสีย
เสียง SFX/เพลงเล่นจริงหลัง user gesture ตามนโยบายเบราว์เซอร์

กรณีไฟล์หาย เสีย manifest ไม่ครบ library script หาย หรือไม่มี WebGL จะแสดง
ข้อผิดพลาดและปุ่มโหลดใหม่ ไม่มีปุ่มข้าม และไม่เริ่มเกมด้วย 2D fallback โดยอัตโนมัติ
การเลือกโหมด 2D โดยผู้ใช้หลังโหลดข้อมูลครบยังเป็นตัวเลือกเดิมของเกม

Guard ครอบคลุม start/quick match/host/join/enterPlay และการเข้า client จาก
ข้อความออนไลน์ที่มาถึงระหว่างโหลด ต้องรอ ready และรักษา pending snapshots
ตอนเริ่มแมตช์แสดงหน้าเตรียมสนามจน compile/render พร้อมอีกครั้ง
ไม่เปลี่ยนรูปแบบ network payload หรือกติกาการต่อสู้

## การทดสอบ

```sh
python3 src/build.py
python3 src/build.py cursed
python3 src/tests/smoke-ui-ux.py
```

- Chrome desktop และ mobile emulation 844×390 ใช้ GLB ที่ย่อแล้วจริง 17/17
  และ QN 18/18 เริ่มเกมได้ ตัวเล่นมี qn rig ไม่มี page error ในเคสสำเร็จ
- หน่วงโมเดลจริงแล้วทดสอบ native button/programmatic click/start APIs:
  state ยังเป็น menu และเข้าเกมไม่ได้จนปล่อยไฟล์จริงให้โหลดครบ
- ภาพครบ 63 skills + 18 item/UI; ซื้อยาเลือดหัก 25 เหรียญ ได้ของหนึ่งชิ้น
  กดใช้ยาด้วยคีย์/Touch และร่ายสกิลหลอมด้วยคีย์ E/Touch ผ่าน MP/CD เดิม
- Client start ที่มาถึงก่อน ready และ production snapshot ที่ค้างไว้ถูกใช้ต่อครบ
  เป็น local browser contexts ไม่มีการเปิดห้องสาธารณะหรือส่งข้อความถึงผู้อื่น
- ทดสอบ model 503, ภาพเสีย, เพลง 503, character ไม่ครบ, manifest ขาดโมเดล,
  script/CSS 503 และ WebGL ใช้ไม่ได้: ทุกกรณีปิดทางเข้าเกม
- กดโหลดใหม่หลังภาพโหลดผิดพลาด แล้วเริ่มจากไฟล์จริงที่กลับมาใช้ได้สำเร็จ
- แข่งขัน Solo กับบอทจน gameOver=true เหลือผู้เล่น 1 คน ที่เวลาจำลอง 630 วิ
  ใช้กติกา AI/combat/storm เดิม เร่งด้วย __game.sim ครั้งละ 30 วิ ไม่ใช่ FPS test
- node --check, build สองโหมด, source/deploy copies และ index byte equality ผ่าน

ผล: `moonfall-docs/reports/ui-ux/results.json`, `test-log.txt`, `bot-match.json`
และ `bot-match-log.txt` ภาพทดสอบเก็บใน /tmp ไม่ commit ตาม AGENTS.md

## ไฟล์และข้อจำกัด

src/moonfall-ui.js, moonfall-menu.js/css, moonfall-inventory.js/css,
moonfall-loading.js/css/html, build.py และ src/tests/smoke-ui-ux.py
พร้อม generated cursed.html, สำเนา deploy ของ modules และ assets/ui/*
เพิ่มไฟล์ใหม่ใน pages.yml แล้ว; HANDOFF.md อัปเดตใน commit เดียวกัน
ไม่แตะ models2/GLBs ที่ Claude ย่อไว้ ไม่สร้างโมเดลใหม่ และไม่แก้เกม index

ยังไม่ได้ทดสอบสองอุปกรณ์จริงผ่าน PeerJS, Android WebView หรือ FPS/thermal/VRAM
บนมือถือจริง ผลปัจจุบันใช้ Chromium/SwiftShader และ touch emulation
PR เข้า main เพื่อ review เท่านั้น ไม่มีการ merge/deploy ในงานนี้
