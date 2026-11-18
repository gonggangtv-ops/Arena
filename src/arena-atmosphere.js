/* Arena Royale lighting and materials. Installed only in the Arena build. */
(() => {
  const look = { value: 1 };
  const prepareTerrain = R3.buildTerrain;
  const prepareWater = R3.buildWater;
  const draw = R3.draw;
  const setupPost = R3.setupPost;
  const disposeScene = R3.disposeScene;

  function shadeMaterial(material, name, edit) {
    const compile = material.onBeforeCompile;
    const cacheKey = material.customProgramCacheKey;
    material.onBeforeCompile = function (shader, renderer) {
      compile.call(this, shader, renderer);
      shader.uniforms.arenaLook = look;
      shader.fragmentShader = 'uniform float arenaLook;\n' + edit(shader.fragmentShader, shader.uniforms);
    };
    material.customProgramCacheKey = () => cacheKey.call(material) + ':' + name;
    material.needsUpdate = true;
  }

  R3.buildTerrain = function () {
    prepareTerrain.call(this);
    const terrain = this.terrain;
    if (this.hi) {
      const old = terrain.material;
      const surface = new THREE.MeshStandardMaterial({
        name: 'Arena layered terrain', vertexColors: true,
        roughness: 0.94, metalness: 0, envMapIntensity: 0.22
      });
      surface.onBeforeCompile = old.onBeforeCompile;
      surface.customProgramCacheKey = old.customProgramCacheKey;
      terrain.material = surface;
      old.dispose();
    }
    const detailed = this.hi;
    shadeMaterial(terrain.material, 'arena-terrain', (source, uniforms) => {
      terrain.userData.arenaSplat = uniforms.uSplat?.value;
      return source.replace('vec3 tBump=vec3(0.);', 'vec3 tBump=vec3(0.); float arenaRoughness=1.;')
        .replace('diffuseColor.rgb=c;}', `
          // Two scales of gravel and soil break up the large repeating ground tile.
          vec2 af=vec2(w.x*.91-w.y*.41,w.x*.41+w.y*.91);
          float fine=texture2D(uDetail,af*.024).r;
          float groundVariation=texture2D(uDetail,w*.00105+vec2(.29,.61)).r;
          float grass=(1.-wt)*(1.-k)*(1.-sp.g)*(1.-clamp(sp.r+sp.b,0.,1.))*(1.-sn);
          float stone=clamp(sp.g+k,0.,1.)*(1.-wt);
          float gl=dot(c,vec3(.2126,.7152,.0722));
          vec3 moss=mix(c,vec3(gl)*vec3(.93,1.01,.76),.30);
          moss*=mix(vec3(.70,.77,.66),vec3(1.13,1.11,.92),groundVariation);
          c=mix(c,moss,grass*(.57+.32*arenaLook));
          c*=mix(.89,1.10,fine);
          float weathering=smoothstep(.23,.79,groundVariation);
          vec3 wornStone=c*mix(vec3(.58,.55,.50),vec3(.91,.81,.67),weathering);
          c=mix(c,wornStone,stone*arenaLook*.84);
          arenaRoughness=mix(.99,.61,stone*(.4+.6*fine));
          ${detailed ? `float grit=(fine-.5)*.28 + (groundVariation-.5)*.07;
          tBump+=vec3(-dFdx(grit),0.,dFdy(grit))*4.2;` : ''}
          diffuseColor.rgb=c;}`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor *= arenaRoughness;');
    });
  };

  R3.buildWater = function () {
    prepareWater.call(this);
    const water = this.water;
    shadeMaterial(water.material, 'arena-river', (source, uniforms) => {
      water.userData.arenaDepth = uniforms.uWD?.value;
      return source.replace('float fm=(1.-smoothstep', `
        // Narrow wavelets and silty edges follow water depth rather than a screen overlay.
        float drift=texture2D(uDetail,vFowW*.006+vec2(uTime*.018,-uTime*.009)).r;
        float rip=sin(vFowW.x*.065+vFowW.y*.117+drift*9.-uTime*2.3);
        float bright=pow(max(0.,rip),8.)*smoothstep(.56,.8,drift);
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.72,.92,1.07),arenaLook*.56);
        diffuseColor.rgb+=vec3(.075,.16,.17)*bright*smoothstep(.02,.16,dp);
        float fm=(1.-smoothstep`);
    });
  };

  R3.disposeScene = function () {
    this.terrain?.userData.arenaSplat?.dispose();
    this.water?.userData.arenaDepth?.dispose();
    this.waterN?.dispose();
    this.sun?.shadow.dispose();
    disposeScene.call(this);
  };

  R3.setupPost = function () {
    // EffectComposer.dispose releases its targets and copy pass. Scene passes
    // own separate targets/materials and need disposal when settings change.
    for (const pass of this.composer?.passes || []) pass.dispose?.();
    this.ao = this.grade = null;
    setupPost.call(this);
  };

  const savedSunColor = new THREE.Color();
  const savedHemiColor = new THREE.Color();
  const savedFog = new THREE.Color();
  const savedBackground = new THREE.Color();
  const amber = new THREE.Color('#ffbd82');
  const skylight = new THREE.Color('#b1c7de');
  const haze = new THREE.Color('#5e7a8a');
  const sunPosition = new THREE.Vector3();

  R3.draw = function () {
    look.value = moody ? 1 : 0;
    this.renderer.toneMappingExposure = moody ? 1.20 : 1.05;
    if (this.grade) this.grade.grade.value = moody ? 0.78 : 0.28;
    if (!moody || !this.sun || !this.hemi || !this.scene.fog) return draw.call(this);

    const sun = this.sun, hemi = this.hemi, fog = this.scene.fog;
    const outdoors = sun.intensity > 0.4;
    const day = state === 'play' ? this.dayK() : 1;
    if (state === 'play' && camNear) {
      // Keep the same camera for the render, HUD projection, and aim rays.
      const camera = this.cam;
      camera.position.y = this.ly + (camera.position.y - this.ly) * .94;
      camera.position.z = this.ty + (camera.position.z - this.ty) * 1.16;
      camera.lookAt(camera.position.x, this.ly + 14, this.ty);
    }
    const sunPower = sun.intensity, hemiPower = hemi.intensity, density = fog.density;
    const bloomStrength = this.bloom?.strength;
    savedSunColor.copy(sun.color);
    savedHemiColor.copy(hemi.color);
    savedFog.copy(fog.color);
    savedBackground.copy(this.scene.background);
    sunPosition.copy(sun.position);

    // Warm sidelight in daytime, cooler sky fill and longer, softer shadows.
    // Exposure/grade are renderer settings, while light changes are scoped to the draw.
    sun.color.lerp(amber, day * .69);
    sun.intensity *= outdoors ? 1 + day * .26 : 1;
    hemi.color.lerp(skylight, .45);
    hemi.intensity *= 1.12;
    if (outdoors && day > 0.01) {
      sun.position.x -= day * 310;
      sun.position.y -= day * 170;
      sun.position.z += day * 140;
    }
    fog.color.lerp(haze, day * .32);
    fog.density = Math.min(density * 1.28, .00023);
    this.scene.background.copy(fog.color);
    sun.shadow.radius = this.hi ? 3 : 1;
    if (this.bloom) this.bloom.strength = Math.min(bloomStrength, .34);
    try {
      return draw.call(this);
    } finally {
      sun.color.copy(savedSunColor);
      sun.position.copy(sunPosition);
      sun.intensity = sunPower;
      hemi.color.copy(savedHemiColor);
      hemi.intensity = hemiPower;
      fog.color.copy(savedFog);
      fog.density = density;
      this.scene.background.copy(savedBackground);
      if (this.bloom) this.bloom.strength = bloomStrength;
    }
  };
})();
