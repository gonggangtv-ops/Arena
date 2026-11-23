# ซอร์สโค้ดเกม

สร้างไฟล์เกมจากโฟลเดอร์นี้ แล้วก๊อปไปที่ `app/src/main/assets/`:

```sh
python3 build.py          # -> index.html  (MuzCruor)
cp index.html ../app/src/main/assets/
```

`cursed.html` (The Cursed Realm + Moonfall) เลิกดูแลแล้ว (เจ้าของสั่ง 2026-11-23) — ไม่ต้อง build `python3 build.py cursed` ไฟล์ที่ deploy ค้างไว้ที่เวอร์ชันสุดท้าย

- `a.js` ข้อมูล/แผนที่ · `b.js` ระบบเกม (host) · `c.js` ออนไลน์+HUD · `r3`–`r12` ภาพ 3D · `t1.js` ระบบ Cursed Realm · `d.js` เมนู/ตั้งค่า
- `celestial-*`, `moonfall-*` = ไฟล์แยก (index ใช้ `celestial-assets.js` `celestial-theme.css` `moonfall-village/ui/menu/inventory/loading`) ถ้าแก้ไฟล์เหล่านี้ ให้ก๊อปไป `app/src/main/assets/` ด้วย
- push ขึ้น `main` แล้ว GitHub Actions จะ deploy ไป `gh-pages` อัตโนมัติ (อย่าแก้ `gh-pages` ตรงๆ เพราะจะถูกเขียนทับ)
