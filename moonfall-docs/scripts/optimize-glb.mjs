// usage: node mfpack.mjs in.glb out.glb [fill]
import { NodeIO } from '@gltf-transform/core';import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize, weld } from '@gltf-transform/functions';import sharp from 'sharp';import fs from 'fs';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);const d=await io.read(process.argv[2]);const r=d.getRoot();const fill=process.argv[4]==='fill';
// fill near-black texels (holes Meshy baked into foliage) from their neighbours
async function holeFill(buf,size){const {data,info}=await sharp(buf).resize(size,size).removeAlpha().raw().toBuffer({resolveWithObject:true});const W=info.width,H=info.height,n=W*H,px=new Float32Array(n*3),ok=new Uint8Array(n);
  for(let i=0;i<n;i++){const a=data[i*3],b=data[i*3+1],c=data[i*3+2];px[i*3]=a;px[i*3+1]=b;px[i*3+2]=c;ok[i]=Math.max(a,b,c)>34?1:0}
  let holes=0;for(let i=0;i<n;i++)if(!ok[i])holes++;const h0=holes;
  for(let it=0;it<700&&holes>0;it++){const nw=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(ok[i])continue;let s0=0,s1=0,s2=0,k=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const j=yy*W+xx;if(!ok[j])continue;s0+=px[j*3];s1+=px[j*3+1];s2+=px[j*3+2];k++}
      if(k>=2)nw.push(i,s0/k,s1/k,s2/k)}
    for(let q=0;q<nw.length;q+=4){const i=nw[q];px[i*3]=nw[q+1];px[i*3+1]=nw[q+2];px[i*3+2]=nw[q+3];ok[i]=1;holes--}}
  const out=Buffer.alloc(n*3);for(let i=0;i<n*3;i++)out[i]=Math.max(0,Math.min(255,Math.round(px[i])));console.log('  holes filled',h0,'->',holes);
  return sharp(out,{raw:{width:W,height:H,channels:3}}).jpeg({quality:80,mozjpeg:true}).toBuffer()}
for(const m of r.listMaterials()){const base=m.getBaseColorTexture(),nrm=m.getNormalTexture(),mr=m.getMetallicRoughnessTexture(),em=m.getEmissiveTexture(),oc=m.getOcclusionTexture();
  if(base){base.setImage(fill?await holeFill(Buffer.from(base.getImage()),1024):await sharp(Buffer.from(base.getImage())).resize(1024,1024).jpeg({quality:80,mozjpeg:true}).toBuffer());base.setMimeType('image/jpeg')}
  if(nrm){nrm.setImage(await sharp(Buffer.from(nrm.getImage())).resize(512,512).jpeg({quality:85}).toBuffer());nrm.setMimeType('image/jpeg')}
  if(mr){m.setMetallicRoughnessTexture(null);m.setMetallicFactor(0.02);m.setRoughnessFactor(.82)}
  if(oc)m.setOcclusionTexture(null);
  if(em){em.setImage(await sharp(Buffer.from(em.getImage())).resize(512,512).jpeg({quality:80}).toBuffer());em.setMimeType('image/jpeg')}}
await d.transform(prune(),dedup(),quantize({quantizePosition:14,quantizeNormal:10,quantizeTexcoord:12}));
const b=await io.writeBinary(d);fs.writeFileSync(process.argv[3],b);console.log(process.argv[3].split('/').pop(),(b.length/1048576).toFixed(2),'MB')
