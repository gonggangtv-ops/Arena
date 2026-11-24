// The owner's Aurora Nexus Citadel for the game (after moonfall-docs/blender/aurora_citadel.py): no transmission (an extra full-scene
// pass in three.js), the ORM maps dropped for per-material roughness, textures shrunk to JPEG (the module atlas keeps 1024), geometry
// welded and quantized (positions 14 bits, normals 8, UVs 12: the game's GLTFLoader has no meshopt/draco decoder). Target <= ~1 MB.
//   node pack-aurora-citadel.mjs citadel_raw.glb app/src/main/assets/assets/meshy/aurora-citadel.glb
// (needs @gltf-transform/core, @gltf-transform/extensions, @gltf-transform/functions and sharp)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize, weld } from '@gltf-transform/functions';
import sharp from 'sharp';
import fs from 'fs';
const [,, inp, out] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const d = await io.read(inp); const r = d.getRoot();
for (const e of r.listExtensionsUsed()) if (/transmission|volume|KHR_materials_ior|KHR_materials_specular/.test(e.extensionName)) { console.log('drop', e.extensionName); e.dispose(); }
const ROUGH = { 'Glacial Module | Meshy PBR atlas': .58, 'Ice_Full': .24, 'Ice_Crystal': .12, 'Snow': .86, 'Glow': .3 };
const jpg = async (t, px, q) => { if (!t) return; const img = sharp(Buffer.from(t.getImage())); const m = await img.metadata(); const s = Math.min(px, m.width);
  t.setImage(await img.resize(s, s).jpeg({ quality: q, mozjpeg: true }).toBuffer()); t.setMimeType('image/jpeg'); if (t.getURI()) t.setURI(t.getURI().replace(/\.\w+$/, '.jpg')); };
const done = new Set();
for (const m of r.listMaterials()) {
  const n = m.getName(), atlas = /Glacial Module/.test(n);
  console.log('mat', n, 'base', m.getBaseColorFactor().map(v => +v.toFixed(3)), 'emis', m.getEmissiveFactor().map(v => +v.toFixed(3)), 'alpha', m.getAlphaMode());
  const base = m.getBaseColorTexture(), nt = m.getNormalTexture(), em = m.getEmissiveTexture();
  if (base && !done.has(base)) { done.add(base); await jpg(base, atlas ? 1024 : 512, 82); }
  if (nt && !done.has(nt)) { done.add(nt); await jpg(nt, atlas ? 512 : 256, 88); }
  if (em && !done.has(em)) { done.add(em); await jpg(em, 512, 82); }
  m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null); m.setMetallicFactor(0); m.setRoughnessFactor(ROUGH[n] ?? .6);
  m.setAlphaMode('OPAQUE'); m.setDoubleSided(false);
}
await d.transform(weld(), prune(), dedup(), quantize({ quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12 }));
let tris = 0; for (const me of r.listMeshes()) for (const p of me.listPrimitives()) tris += p.getIndices().getCount() / 3;
const b = await io.writeBinary(d); fs.writeFileSync(out, b);
console.log('tris', tris, 'textures', r.listTextures().map(t => t.getName() + ':' + Math.round(t.getImage().length / 1024) + 'KB').join(' '), (b.length / 1048576).toFixed(2), 'MB');
