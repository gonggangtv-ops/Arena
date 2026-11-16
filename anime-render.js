/* Sakura frontier art direction. Shared by both static game entry points. */
window.installAnimeRender = function (P) {
  'use strict';
  if (P.animeRender) return;
  P.animeRender = true;

  const init = P.init, draw = P.draw, setupPost = P.setupPost;
  P.init = function () {
    const ok = init.call(this);
    if (ok) this.renderer.toneMappingExposure = 1.12;
    return ok;
  };
  P.setupPost = function () {
    setupPost.call(this);
    // Soft contact shading lets cel-painted surfaces retain their clean colors.
    if (this.ao) {
      this.ao.ao.uniforms.uK.value = 1.5;
      this.ao.ao.uniforms.uR.value = 48;
    }
    if (this.bloom) {
      // Preserve painted eyes, hair and fabric at high quality. Screen-wide bloom
      // washes out these small silhouettes; authored emissive accents stay intact.
      this.bloom.enabled = false;
    }
  };
  const skyDay = new THREE.Color('#bddfe9'), skyNight = new THREE.Color('#202d57');
  const skyDusk = new THREE.Color('#d4b4dc');
  const sunlight = new THREE.Color('#fff2d7'), moonlight = new THREE.Color('#a9b9ff');
  const bounce = new THREE.Color('#8d9eaf'), shade = new THREE.Color('#353c66');
  P.draw = function () {
    if (this.scene && this.sun && this.hemi) {
      const L = state === 'play' ? (listener() || ME()) : null;
      const cave = L && (inDG(L) || WD.caves.some(c => dist(L, c) < c.R + 6));
      if (!cave) {
        const day = state === 'play' ? this.dayK() : 1;
        const dusk = state === 'play' ? this.duskK() : 0;
        this.sun.color.copy(moonlight).lerp(sunlight, day);
        this.sun.intensity = lerp(.72, 1.9, day) * (moody ? .7 : 1);
        this.hemi.color.set('#adbfff');
        this.hemi.groundColor.copy(shade).lerp(bounce, day);
        this.hemi.intensity = lerp(.9, 1.12, day) * (moody ? .78 : 1);
        this.sun.shadow.intensity = .64;
        this.scene.fog.color.copy(skyNight).lerp(skyDay, day).lerp(skyDusk, dusk * .5);
        if (CURSED && L) this.scene.fog.color.lerp(this.c1.set(REG.FOG[REG.at(L.x,L.y)]), .3);
        if (moody) this.scene.fog.color.multiplyScalar(.68);
        this.scene.background.copy(this.scene.fog.color);
        this.scene.fog.density = moody ? .00014 : .000075;
      }
    }
    return draw.call(this);
  };
};
