# HANDOFF.md — บันทึกส่งต่องานระหว่าง Codex และ Claude

เขียนรายการใหม่ไว้บนสุด รูปแบบ: `## YYYY-MM-DD · ใคร · เรื่อง` แล้วตามด้วย ทำอะไร / ไฟล์ / ทดสอบ / ค้าง

## กำลังทำ (อัปเดตเมื่อเริ่ม/จบงาน)
- (ว่าง)

---

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
