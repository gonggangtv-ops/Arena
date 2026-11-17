# AGENTS.md — กติกาทำงานร่วมกัน (Codex + Claude)

โปรเจกต์นี้มี AI 2 ตัวทำงานใน repo เดียวกัน: **Codex** และ **Claude** เจ้าของโปรเจกต์คือผู้ตัดสินใจสุดท้าย
ทั้งสองตัวต้องอ่านไฟล์นี้และ `HANDOFF.md` ก่อนเริ่มงานทุกครั้ง ตอบผู้ใช้เป็นภาษาไทย

## โครงสร้าง
- `src/` — **ซอร์สจริง** แก้ที่นี่เท่านั้น
  - `a.js` ข้อมูล/แผนที่ · `b.js` ระบบเกม (host) · `c.js` ออนไลน์+HUD · `r3`–`r12.js` ภาพ 3D · `t1.js` ระบบ Cursed Realm · `d.js` เมนู/ตั้งค่า
  - `celestial-*`, `moonfall-*` = ชั้น Moonfall (โหลดเฉพาะ `cursed.html`)
  - `build.py` รวมไฟล์: `python3 build.py` → `index.html` (Arena Royale v2.5) · `python3 build.py cursed` → `cursed.html` (The Cursed Realm)
- `app/src/main/assets/` — ไฟล์ที่ deploy (HTML ที่ build แล้ว, lib, `assets/meshy/*.glb`, `assets/ui/*`, เพลง)
- `moonfall-docs/` — รายงาน สคริปต์ทดสอบ และวิธีย่อโมเดล
- `.github/workflows/pages.yml` — push ขึ้น `main` แล้ว deploy ไป branch `gh-pages` อัตโนมัติ (ก๊อปไฟล์ทีละชื่อ: เพิ่มไฟล์ใหม่ต้องเพิ่มในนี้ด้วย)

## กติกาสำคัญ
1. **ห้ามแก้หรือเปิด PR เข้า `gh-pages`** มันถูกเขียนทับทุกครั้งที่ deploy — PR ต้อง base = `main`
2. **ห้ามแก้ `index.html` / `cursed.html` ที่ build แล้วตรงๆ** แก้ใน `src/` แล้ว build ใหม่ และก๊อปไป `app/src/main/assets/`
3. `index.html` = เกมเดิม v2.5 — **ห้ามใส่ Moonfall** (เจ้าของสั่งให้แยก) ของใหม่ใส่ใน `cursed.html`
4. ทำงานใน branch ของตัวเอง: `codex/<เรื่อง>` หรือ `claude/<เรื่อง>` แล้วเปิด PR เข้า `main` · branch สั้น merge บ่อย
5. ก่อนเริ่ม: `git pull` main และดูว่าอีกตัวกำลังแก้ไฟล์ไหน (ดู `HANDOFF.md` ส่วน "กำลังทำ") — อย่าแก้ไฟล์เดียวกันพร้อมกัน
6. จบงาน: เขียนบันทึกใน `HANDOFF.md` (ทำอะไร, ไฟล์ที่แตะ, ทดสอบอะไร, อะไรค้าง) ในคอมมิตเดียวกัน
7. โมเดล Meshy ต้องย่อก่อนใส่ (ดู `moonfall-docs/OPTIMIZE.md`) — ไฟล์ละไม่เกิน ~1 MB ห้าม commit GLB ดิบ 5–10 MB
8. ไฟล์รูปรายงาน/สกรีนช็อตไม่ต้อง commit (เก็บแค่ .json/.txt/.md) เพื่อไม่ให้ repo บวม
9. การใช้เครดิต Meshy ต้องบอกเจ้าของก่อนทุกครั้ง

## การทดสอบขั้นต่ำก่อน merge
- `node --check` ไฟล์ JS ที่แก้ และ build ผ่านทั้ง 2 โหมด
- เปิด `cursed.html` ผ่าน http server (ไม่ใช่ file://) เริ่มเกมได้ ไม่มี error ใน console
- ถ้าแตะระบบเกม/ออนไลน์: เล่นจนจบ 1 แมตช์ (บอท) และทดสอบ 2 เครื่อง (host/client) ถ้าทำได้

## ข้อควรรู้
- เกมออนไลน์ใช้ PeerJS: host คำนวณทุกอย่าง client ส่งแค่ input — ข้อมูลโลก (WD) ต้องสร้างเหมือนกันทุกเครื่อง (ใช้ seed ห้ามใช้ Math.random ตอนสร้างโลก)
- ใน Cursed Realm ปุ่ม Shift = หลบ, V = สกิลพิเศษ, P = ร้านค้า, คลิกขวา = ป้องกัน
