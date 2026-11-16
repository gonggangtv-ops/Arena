// ===================== Toon look: stepped (cel) light, blue-violet shade, ink outlines on characters =====================
const TOON=false;   // toon look (v2.3/v2.4) is kept in the code but switched off: the game is back on the v2.2 look
if(TOON&&window.THREE&&THREE.ShaderChunk){const C=THREE.ShaderChunk,L='float dotNL = saturate( dot( geometryNormal, directLight.direction ) );';
  // two hard bands: lit and shade, with a thin soft edge so it does not shimmer
  const R='float dotNL = arToon( saturate( dot( geometryNormal, directLight.direction ) ) );';const F='float arToon(float x){return .18*smoothstep(0.,.06,x)+.82*smoothstep(.2,.3,x);}\n';
  for(const k in C){const s=C[k];if(typeof s==='string'&&s.indexOf(L)>=0)C[k]=F+s.split(L).join(R)}}
(()=>{const P=R3,_of=P.objFor,_arm=P.kkArm,_light=P.frame;
  const olMat=(th)=>{const m=new THREE.MeshBasicMaterial({color:'#24182e',side:THREE.BackSide,toneMapped:false});m.userData.th=th;
    m.onBeforeCompile=s=>{s.uniforms.uTh={value:th};s.vertexShader='uniform float uTh;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed+=normalize(normal)*uTh;')};m.customProgramCacheKey=()=>'arOutline';return m};
  // inverted hull: a back-face copy pushed out along the normals, about 1.6 world units thick whatever the mesh scale
  P.outline=function(root){if(!TOON||!root)return;root.updateMatrixWorld(true);const v=new THREE.Vector3(),list=[];
    root.traverse(m=>{if(!m.isMesh||m.userData.olDone||m.userData.isOl||!m.visible)return;const mt=m.material;if(!mt||Array.isArray(mt)||mt.transparent||mt.blending===THREE.AdditiveBlending||m.isSprite)return;list.push(m)});
    for(const m of list){m.userData.olDone=1;m.getWorldScale(v);const s=Math.max(1e-4,(Math.abs(v.x)+Math.abs(v.y)+Math.abs(v.z))/3),th=Math.min(.12,3.2/s);
      const mat=olMat(th);let o;if(m.isSkinnedMesh){o=new THREE.SkinnedMesh(m.geometry,mat);o.bind(m.skeleton,m.bindMatrix)}else if(m.isInstancedMesh)continue;else o=new THREE.Mesh(m.geometry,mat);
      o.userData.isOl=1;o.frustumCulled=false;o.castShadow=false;o.receiveShadow=false;o.renderOrder=m.renderOrder;m.add(o);if(m.isSkinnedMesh){o.position.set(0,0,0);o.quaternion.identity();o.scale.set(1,1,1);m.remove(o);m.parent.add(o);o.position.copy(m.position);o.quaternion.copy(m.quaternion);o.scale.copy(m.scale)}}};
  P.objFor=function(u){const had=this.objs.get(u.id);const o=_of.call(this,u);if(!had&&o&&(u.hero||u.mob||u.zombie))this.outline(o.root);return o};
  const _kb=P.kkBuild;if(_kb)P.kkBuild=function(o,u){const r=_kb.apply(this,arguments);if(o&&o.root&&this.objs.get(u.id)===o)this.outline(o.root);return r};
  if(_arm)P.kkArm=function(o,u){const r=_arm.apply(this,arguments);if(o&&o.root)this.outline(o.root);return r};
})();
