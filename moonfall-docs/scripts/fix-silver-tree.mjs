import { NodeIO } from '@gltf-transform/core';import { ALL_EXTENSIONS } from '@gltf-transform/extensions';import { dequantize, quantize, prune } from '@gltf-transform/functions';import fs from 'fs';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);const d=await io.read(process.argv[2]);await d.transform(dequantize());
const prim=d.getRoot().listMeshes()[0].listPrimitives()[0],P=prim.getAttribute('POSITION'),N=prim.getAttribute('NORMAL'),I=prim.getIndices();
const n=P.getCount(),v=[0,0,0];let ys=[];for(let i=0;i<n;i++){P.getElement(i,v);ys.push(v[1])}
const mode=process.argv[4]||'probe';
// sphere probe: vertices in top 12%
const top=[];for(let i=0;i<n;i++){P.getElement(i,v);if(v[1]>0.36)top.push([...v])}
let cx=0,cy=0,cz=0;for(const t of top){cx+=t[0];cy+=t[1];cz+=t[2]}cx/=top.length;cy/=top.length;cz/=top.length;
const rs=top.map(t=>Math.hypot(t[0]-cx,t[1]-cy,t[2]-cz)).sort((a,b)=>a-b);
console.log('top verts',top.length,'center',cx.toFixed(3),cy.toFixed(3),cz.toFixed(3),'r p50',rs[rs.length>>1].toFixed(3),'p90',rs[Math.floor(rs.length*.9)].toFixed(3),'max',rs[rs.length-1].toFixed(3));
const hist={};for(const y of ys){const k=(Math.floor(y*20)/20).toFixed(2);hist[k]=(hist[k]||0)+1}console.log(JSON.stringify(hist));
if(mode==='fix'){const R=+process.argv[5],C=[+process.argv[6],+process.argv[7],+process.argv[8]];
  const idx=I.getArray(),keep=[];let cut=0;const a=[0,0,0];
  for(let t=0;t<idx.length;t+=3){let inside=0;for(let k=0;k<3;k++){P.getElement(idx[t+k],a);if(Math.hypot(a[0]-C[0],a[1]-C[1],a[2]-C[2])<R)inside++}if(inside===3){cut++;continue}keep.push(idx[t],idx[t+1],idx[t+2])}
  I.setArray(new Uint32Array(keep));
  // foliage normals: point away from the canopy centre so leaves are lit from either side
  const cc=[0,+process.argv[9],0],nn=[0,0,0];for(let i=0;i<n;i++){P.getElement(i,a);if(a[1]<cc[1]-0.25)continue;N.getElement(i,nn);let dx=a[0]-cc[0],dy=(a[1]-cc[1])*.8+.25,dz=a[2]-cc[2];const l=Math.hypot(dx,dy,dz)||1;dx/=l;dy/=l;dz/=l;
    let mx=nn[0]*.15+dx*.45,my=Math.abs(nn[1])*.15+dy*.45+.55,mz=nn[2]*.15+dz*.45;const m=Math.hypot(mx,my,mz)||1;N.setElement(i,[mx/m,my/m,mz/m])}
  for(const m of d.getRoot().listMaterials()){m.setDoubleSided(process.env.DS==="1");if(process.env.EM){m.setEmissiveTexture(m.getBaseColorTexture());m.setEmissiveFactor([+process.env.EM,+process.env.EM,+process.env.EM])}}
  await d.transform(prune(),quantize({quantizePosition:14,quantizeNormal:10,quantizeTexcoord:12}));const b=await io.writeBinary(d);fs.writeFileSync(process.argv[3],b);console.log('cut tris',cut,'size',(b.length/1048576).toFixed(2))}
