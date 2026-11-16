# ซอร์สโค้ดเกม

สร้างไฟล์เกมจากโฟลเดอร์นี้ แล้วก๊อปไปที่ `app/src/main/assets/`:

```sh
python3 build.py          # -> index.html  (Arena Royale v2.5)
python3 build.py cursed   # -> cursed.html (The Cursed Realm + Moonfall)
cp index.html cursed.html ../app/src/main/assets/
```

- `a.js` ข้อมูล/แผนที่ · `b.js` ระบบเกม (host) · `c.js` ออนไลน์+HUD · `r3`–`r12` ภาพ 3D · `t1.js` ระบบ Cursed Realm · `d.js` เมนู/ตั้งค่า
- `celestial-*.js`, `moonfall-*.js` = Moonfall (โหลดเฉพาะ cursed.html) ถ้าแก้ไฟล์เหล่านี้ ให้ก๊อปไป `app/src/main/assets/` ด้วย
- push ขึ้น `main` แล้ว GitHub Actions จะ deploy ไป `gh-pages` อัตโนมัติ (อย่าแก้ `gh-pages` ตรงๆ เพราะจะถูกเขียนทับ)
