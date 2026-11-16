# โมเดล Meshy ที่ย่อแล้ว (v0.3)

ไฟล์ใน `app/src/main/assets/assets/meshy/` ถูกย่อจากต้นฉบับ (รวม 130 MB → ราว 4.6 MB)

- texture สีหลัก 1024px JPEG, normal 512px, ตัด metallic-roughness/occlusion map (ใช้ค่าคงที่แทน)
- quantize ตำแหน่ง/normal/UV (KHR_mesh_quantization) ไม่ลดจำนวนสามเหลี่ยม
- `moon-silver-tree.glb`: ตัดก้อนทรงกลมสีดำที่ยอดต้น, ปรับ normal ของพุ่มใบให้หันขึ้น,
  ปิด double-sided, เติมสีช่องดำใน texture และใส่ emissive อ่อนๆ — แก้ปัญหาใบมีรูดำ

คำสั่งที่ใช้ (ต้องมี @gltf-transform/core, functions, extensions และ sharp):

```sh
node scripts/optimize-glb.mjs original.glb out.glb            # ทั่วไป
DS=0 EM=.2 node scripts/fix-silver-tree.mjs moon-silver-tree.glb tmp.glb fix .105 0.016 0.405 0.015 0.12
node scripts/optimize-glb.mjs tmp.glb moon-silver-tree.glb fill
```

ต้นฉบับยังอยู่ใน Meshy (task ID ตาม `manifest.json`) และใน history ของ branch `gh-pages` เดิม (commit e12eca5)
