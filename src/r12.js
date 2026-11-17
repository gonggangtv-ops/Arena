// ===================== Custom boss model (Meshy AI, models4.js): replaces the procedural dragon when loaded =====================
(()=>{const P=R3,_drag=P.dragon,_anim=P.animDragon,BOSS_H=300;
  P.bossLoad=function(){if(this.bossG||this.bossBusy||!window.AR_BOSS||!window.AR_GLTF)return;this.bossBusy=1;
    try{const b=atob(AR_BOSS),u8=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u8[i]=b.charCodeAt(i);
      new AR_GLTF.GLTFLoader().parse(u8.buffer,'',g=>{const s=g.scene;s.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(s),sz=bb.getSize(new THREE.Vector3()),k=BOSS_H/sz.y;
        s.traverse(m=>{if(m.isMesh){m.castShadow=this.hi;m.receiveShadow=false;const mt=m.material;if(mt&&mt.isMeshStandardMaterial){mt.envMap=this.envTex||null;mt.envMapIntensity=.5;if(mt.emissiveMap){mt.emissive.set('#ffffff');mt.emissiveIntensity=.6}m.material=this.fow(mt)}}});
        this.bossG={s,k,cx:(bb.min.x+bb.max.x)/2,cz:(bb.min.z+bb.max.z)/2,y0:bb.min.y};
        for(const [id,o] of this.objs)if(o.u&&o.u.boss){this.scene.remove(o.root);this.objs.delete(id)}},e=>{console.warn('boss model',e)})}catch(e){console.warn('boss model',e)}};
  P.dragon=function(u){if(MOON)return _drag.call(this,u);if(!this.bossG){this.bossLoad();return _drag.call(this,u)}const B=this.bossG;
    const root=new THREE.Group(),body=new THREE.Group();root.add(body);const m=B.s.clone(true);m.scale.setScalar(B.k);m.position.set(-B.cx*B.k,-B.y0*B.k,-B.cz*B.k);m.rotation.x=-.2;body.add(m);
    const head=new THREE.Group();head.position.set(0,BOSS_H*.78,30);body.add(head);const jaw=new THREE.Group();head.add(jaw);
    return{root,body,kind:'dragon',mshy:1,model:m,legs:[],tsegs:[],nsegs:[],wings:[],eyes:[],head,jaw}};
  // idle breathing, a lunge on attacks, a crouch-and-rise when breathing fire
  P.animDragon=function(o,u,T,dt){if(!o.mshy)return _anim.call(this,o,u,T,dt);_anim.call(this,o,u,T,dt);const atk=clamp(u.atkAnim/.3,0,1),br=u.castAnim>.8,k=o.mvK||0;
    const s=1+Math.sin(T*2.2)*.025;o.model.scale.setScalar(this.bossG.k);o.body.scale.set(1/Math.sqrt(s),s,1/Math.sqrt(s));
    o.body.rotation.x=atk*.28+(br?.12:0);o.body.position.z=atk*26;o.body.rotation.z=Math.sin(o.walk*.6||0)*.06*k;o.head.rotation.x=0};
})();
