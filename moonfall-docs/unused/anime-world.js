/* Anime environment art. Visuals only: the seeded map and collision data stay authoritative. */
window.installAnimeWorld = function installAnimeWorld(P) {
  if (!P || P.animeWorldInstalled) return;
  P.animeWorldInstalled = true;
  const T = THREE;
  const sakura = ['#e58bb3', '#efb3ce', '#d970a0', '#e99abc'];
  const roofs = ['#399d9e', '#d46b7d', '#6588b4', '#608f9a'];
  const original = {
    genTex: P.genTex, instC: P.instC, vegetation: P.buildVegetation,
    buildings: P.buildBuildings, castle: P.buildCastle, tstd: P.tstd,
    water: P.buildWater, world: P.buildWorld, fx: P.fxExtra, menu: P.menuFrame, puff: P.puffGeo
  };

  // Broad, quiet brush marks replace photoreal grain so the colour planes read from the game camera.
  P.genTex = function (key) {
    if (key === 'anime-canopy') {
      const c = this.cvs(128), x = c.getContext('2d'), R = mulberry32(1834);
      x.fillStyle = '#eeeae7'; x.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 240; i++) {
        const px = R() * 128, py = R() * 128, r = 2 + R() * 6;
        x.fillStyle = ['#f6f1ed', '#d6d4d6', '#e2dbe1', '#fff9ef'][Math.floor(R() * 4)];
        this.wrapDraw(x, 128, 128, () => {
          x.beginPath(); x.ellipse(px, py, r, r * .42, -.65, 0, Math.PI * 2); x.fill();
        }, px, py, r);
      }
      return {c};
    }
    if (!['grass', 'dirt', 'cobble', 'plaster', 'tiles'].includes(key)) return original.genTex.call(this, key);
    const c = this.cvs(256), x = c.getContext('2d'), R = mulberry32(3107 + key.length * 31);
    if (key === 'grass' || key === 'dirt' || key === 'plaster') {
      const f = this.fbm(key === 'grass' ? 206 : 207, 5, 3);
      this.pix(c, (u, v) => {
        const n = f(u, v) - .5;
        if (key === 'grass') return [110 + n * 27, 153 + n * 32, 70 + n * 22];
        if (key === 'dirt') return [191 + n * 27, 167 + n * 27, 127 + n * 22];
        return [239 + n * 14, 230 + n * 13, 210 + n * 12];
      });
      for (let i = 0; i < (key === 'grass' ? 200 : 50); i++) {
        const px = R() * 256, py = R() * 256, w = 4 + R() * 16;
        x.fillStyle = key === 'grass' ? (R() < .5 ? 'rgba(220,233,143,.10)' : 'rgba(40,104,69,.09)') : 'rgba(255,255,240,.06)';
        this.wrapDraw(x, 256, 256, () => {
          x.beginPath(); x.ellipse(px, py, w, w * .18, -.6, 0, Math.PI * 2); x.fill();
        }, px, py, w);
      }
      return {c, norm: key === 'plaster' ? .1 : .3};
    }
    if (key === 'tiles') {
      x.fillStyle = '#a8b5b6'; x.fillRect(0, 0, 256, 256);
      for (let j = -1; j < 8; j++) for (let i = -1; i < 8; i++) {
        const px = i * 40 + (j % 2) * 20, py = j * 36;
        x.fillStyle = ['#d7e1df', '#c1d1d0', '#cbd8d5'][Math.floor(R() * 3)];
        x.fillRect(px + 1, py + 1, 38, 32);
        x.strokeStyle = 'rgba(252,255,242,.5)'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(px + 3, py + 29); x.lineTo(px + 36, py + 29); x.stroke();
      }
      return {c, norm: .65};
    }
    x.fillStyle = '#8c9d9d'; x.fillRect(0, 0, 256, 256);
    for (let j = -1; j < 7; j++) for (let i = -1; i < 7; i++) {
      const px = i * 48 + (j % 2) * 24, py = j * 44;
      x.fillStyle = ['#cad4cc', '#b8c7bf', '#d8d9c8', '#b5c5c4'][Math.floor(R() * 4)];
      x.beginPath(); x.moveTo(px + 4, py + 3); x.lineTo(px + 42, py + 2); x.lineTo(px + 46, py + 35); x.lineTo(px + 7, py + 40); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(249,247,219,.5)'; x.lineWidth = 2; x.stroke();
    }
    return {c, norm: .55};
  };

  // Reuse the original foliage instances and their registered fade/culling slots.
  P.instC = function (geo, mat, list, place, shadow, onInst, size) {
    if (!this._animeVegetation || !this.treeMats || !this.treeMats.includes(mat))
      return original.instC.call(this, geo, mat, list, place, shadow, onInst, size);
    return original.instC.call(this, geo, mat, list, (it, add) => {
      const bloom = it.v === 2 || (it.v === 1 && Math.floor(it.x * .13 + it.y * .07) % 3 !== 0);
      place(it, (x, y, z, sx, sy, sz, rx, ry, rz, color) => {
        if (bloom) {
          sx *= 1.04; sy *= .78; sz *= 1.04;
          color = sakura[Math.abs(Math.floor(x * .1 + z * .07 + y * .03)) % sakura.length];
          this.animeSakuraInstances++;
        }
        add(x, y, z, sx, sy, sz, rx, ry, rz, color);
      });
    }, shadow, onInst, size);
  };
  P.buildVegetation = function () {
    this._animeVegetation = true; this.animeSakuraInstances = 0;
    try { original.vegetation.call(this); }
    finally { this._animeVegetation = false; }
    for (const mat of this.treeMats.slice(0, 3)) {
      // Shared painted leaf pattern keeps clumps organic without per-tree materials.
      if (mat.vertexColors) { mat.map = this.tex('anime-canopy'); mat.needsUpdate = true; }
    }
    const selected = WD.trees.filter(t => t.v === 2 || (t.v === 1 && Math.floor(t.x * .13 + t.y * .07) % 3 !== 0));
    const up = new T.Vector3(0, 1, 0), dir = new T.Vector3(), rot = new T.Euler(), quat = new T.Quaternion();
    const reg = (t, im, i) => this.treeParts[t._i].push([im, i]);
    const branches = original.instC.call(this, this.G.cylT, this.tstd('bark', '#69445a', .9, 0), selected, (t, add) => {
      const ground = this.gY(t.x, t.y), h = (t.v === 2 ? 70 : 40) * t.h;
      const n = this.hi ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const angle = k / n * Math.PI * 2 + t.x * .11;
        const dx = Math.cos(angle) * t.cr * .48, dz = Math.sin(angle) * t.cr * .48;
        const dy = h * .28 + t.cr * (.28 + k * .08), len = Math.hypot(dx, dy, dz);
        dir.set(dx, dy, dz).normalize(); quat.setFromUnitVectors(up, dir); rot.setFromQuaternion(quat);
        add(t.x + dx * .5, ground + h * .72 + dy * .5, t.y + dz * .5,
          3.8, len, 3.8, rot.x, rot.y, rot.z, null);
      }
    }, true, reg);
    for (const mesh of branches) mesh.name = 'anime-sakura-branches';
  };
  // Uneven layered crowns with painted shadow masses replace the spherical toy silhouette.
  P.puffGeo = function (seed) {
    const g = original.puff.call(this, seed), p = g.attributes.position, colors = g.attributes.color;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), angle = Math.atan2(z, x);
      const lobes = 1 + Math.sin(angle * 7 + seed * 1.7) * .055 + Math.sin(angle * 11 + y * 6) * .025;
      p.setXYZ(i, x * lobes, y * (1 + Math.sin(angle * 5 + seed) * .06), z * lobes);
      const light = .58 + Math.max(0, Math.min(1, (y + 1) / 2)) * .39;
      const patch = .95 + .05 * Math.sin(angle * 5 + y * 7 + seed);
      colors.setXYZ(i, light * patch, light * patch, light * (1.03 - .04 * Math.max(0, y)));
    }
    g.computeVertexNormals(); this.weldNormals(g);
    return g;
  };

  P.tstd = function (tex, color, rough, metal, options, key) {
    if (this._animeArchitecture) {
      if (tex === 'plaster') color = '#fff4dc';
      else if (tex === 'bricks') color = color === '#6a6672' ? '#72849f' : '#e3e0d5';
      else if (tex === 'bark' || tex === 'logs') color = '#79576a';
      else if (tex === 'tiles') color = '#60a7b0';
    }
    return original.tstd.call(this, tex, color, rough, metal, options, key);
  };
  P.buildBuildings = function () {
    this._animeArchitecture = true;
    try { original.buildings.call(this); }
    finally { this._animeArchitecture = false; }
    for (const r of this.roofs) {
      const i = Math.abs(r.h.seed | 0) % roofs.length;
      r.mats[0].color.set(roofs[i]); r.mats[1].color.set('#fff4dc');
      r.g.name = 'anime-village-roof';
      this.curveAnimeRoof(r);
    }
    this.buildAnimeSanctuaries();
  };
  // A curved tiled hip profile with upturned eaves; reuse each roof's existing material
  // so interior fading and the original single-draw batching behaviour are retained.
  P.curveAnimeRoof = function (entry) {
    const h = entry.h, along = h.w >= h.h, roof = entry.g.children[0].children[0];
    const length = (along ? h.w : h.h) + 40, width = (along ? h.h : h.w) + 44;
    const height = h.style === 'witch' ? 120 : h.style === 'cabin' ? 70 : 95;
    const nx = 4, nz = this.hi ? 16 : 10, pos = [], uv = [], col = [], idx = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const u = i / nx, v = j / nz * 2 - 1, edge = Math.abs(v), tip = Math.pow(Math.abs(u * 2 - 1), 4);
      const y = height * (1 - edge) + 18 * Math.pow(edge, 5) + tip * edge * 7;
      pos.push((u - .5) * length, y, v * width * .5);
      uv.push(u * length / 90, (v + 1) * Math.hypot(width * .5, height) / 90);
      const shade = edge > .96 ? .53 : edge > .85 ? .8 : .96 + .04 * (1 - edge);
      col.push(shade, shade, shade);
      if (i < nx && j < nz) {const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1; idx.push(a, c, b, b, c, c + 1);}
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingSphere();
    roof.geometry.dispose(); roof.geometry = geo;
    roof.material.vertexColors = true; roof.material.needsUpdate = true;
    roof.name = 'anime-curved-tile-roof';
    // Close both gables against the curved profile, retaining the original plaster material.
    const gab = entry.g.children[0].children[1], gp = [], gu = [];
    for (const side of [-1, 1]) {
      const x = side * (length * .5 - 18), u = x / length + .5;
      const tip = Math.pow(Math.abs(u * 2 - 1), 4), half = width * .5 - 16;
      for (let j = 0; j < nz; j++) {
        const z0 = (j / nz * 2 - 1) * half, z1 = ((j + 1) / nz * 2 - 1) * half;
        const edge0 = Math.abs(z0 / (width * .5)), edge1 = Math.abs(z1 / (width * .5));
        const y0 = height * (1 - edge0) + 18 * Math.pow(edge0, 5) + tip * edge0 * 7;
        const y1 = height * (1 - edge1) + 18 * Math.pow(edge1, 5) + tip * edge1 * 7;
        gp.push(x, 0, z0, x, y0, z0, x, y1, z1, x, 0, z0, x, y1, z1, x, 0, z1);
        gu.push(z0 / 150, 0, z0 / 150, y0 / 70, z1 / 150, y1 / 70,
          z0 / 150, 0, z1 / 150, y1 / 70, z1 / 150, 0);
      }
    }
    const gable = new T.BufferGeometry();
    gable.setAttribute('position', new T.Float32BufferAttribute(gp, 3));
    gable.setAttribute('uv', new T.Float32BufferAttribute(gu, 2)); gable.computeVertexNormals();
    gab.geometry.dispose(); gab.geometry = gable;
  };
  P.buildCastle = function () {
    this._animeArchitecture = true;
    try { return original.castle.call(this); }
    finally { this._animeArchitecture = false; }
  };

  // Shrine portals sit on the existing stone ring. They are decorative overhead structures,
  // never new colliders or loot locations, and use the same fog-of-war shader as other props.
  P.buildAnimeSanctuaries = function () {
    const sites = WD.shrines || [], G = this.G;
    const red = this.std('#cb5676', .7, .05), dark = this.std('#45445f', .7, .05);
    const gold = this.std('#e8c984', .45, .35);
    const paper = this.std('#ffe7c4', .65, 0, {emissive:'#ffb67d', emissiveIntensity:.45});
    const mark = groups => groups.forEach(g => {g.name = 'anime-torii'; g.userData.animeLandmark = true;});
    mark(this.instC(G.box, red, sites, (s, add) => {
      const y = this.gY(s.x, s.y);
      for (const side of [-1, 1]) add(s.x + side * 87, y + 91, s.y - 34, 13, 182, 14, 0, 0, -side * .025, null);
      add(s.x, y + 150, s.y - 34, 204, 11, 19, 0, 0, 0, null);
      add(s.x, y + 183, s.y - 34, 236, 13, 24, 0, 0, 0, null);
      add(s.x, y + 166, s.y - 34, 11, 24, 14, 0, 0, 0, null);
    }, true));
    mark(this.instC(G.box, dark, sites, (s, add) => {
      const y = this.gY(s.x, s.y);
      add(s.x, y + 193, s.y - 34, 252, 7, 29, 0, 0, 0, null);
      for (const side of [-1, 1]) {
        add(s.x + side * 119, y + 197, s.y - 34, 27, 6, 29, 0, 0, side * .2, null);
        add(s.x + side * 87, y + 10, s.y - 34, 19, 20, 20, 0, 0, 0, null);
      }
    }, true));
    mark(this.instC(G.box, gold, sites, (s, add) => {
      const y = this.gY(s.x, s.y);
      for (const side of [-1, 1]) {
        add(s.x + side * 87, y + 131, s.y - 34, 15, 5, 16, 0, 0, 0, null);
        add(s.x + side * 57, y + 135, s.y - 34, 1.4, 26, 1.4, 0, 0, 0, null);
      }
      add(s.x, y + 170, s.y - 22, 24, 25, 2, 0, 0, 0, null);
    }, false));
    mark(this.instC(G.sph, paper, sites, (s, add) => {
      const y = this.gY(s.x, s.y);
      for (const side of [-1, 1]) add(s.x + side * 57, y + 112, s.y - 34, 9, 14, 9, 0, 0, 0, null);
    }, false));
    // Tall crystal obelisks give the familiar shrine a recognisable anime silhouette.
    mark(this.instC(G.oct, this.std('#8ae1eb', .3, .1, {emissive:'#52c5e2',emissiveIntensity:.45}), sites, (s, add) => {
      const y = this.gY(s.x, s.y);
      for (const side of [-1, 1]) add(s.x + side * 63, y + 50, s.y + 33, 7, 25, 7, 0, side * .4, side * .15, null);
    }, false));
    this.animeSanctuaryCount = sites.length;
  };

  P.buildWater = function () {
    original.water.call(this);
    const m = this.water && this.water.material;
    if (!m) return;
    const compile = m.onBeforeCompile, cache = m.customProgramCacheKey;
    m.onBeforeCompile = function (shader, renderer) {
      compile.call(this, shader, renderer);
      shader.fragmentShader = shader.fragmentShader.replace(
        'vec3 sh=vec3(.09,.3,.3),dc=vec3(.012,.06,.11)',
        'vec3 sh=vec3(.16,.62,.65),dc=vec3(.025,.23,.39)');
    };
    m.customProgramCacheKey = () => cache.call(m) + 'anime-water';
    this.water.name = 'anime-turquoise-water';
  };

  P.buildWorld = function () {
    this.animePetals = null;
    original.world.call(this);
    const shape = new T.Shape();
    shape.moveTo(0, -1); shape.bezierCurveTo(-.85, -.3, -.75, .7, -.15, 1);
    shape.lineTo(0, .76); shape.lineTo(.15, 1); shape.bezierCurveTo(.75, .7, .85, -.3, 0, -1);
    const geo = new T.ShapeGeometry(shape, 3);
    const mat = this.lam('#ffd0e4', {side:T.DoubleSide, emissive:'#cf85b8',emissiveIntensity:.13});
    const count = this.hi ? 80 : 28;
    const mesh = this.inst(geo, mat, count, false);
    mesh.name = 'anime-sakura-petals'; mesh.receiveShadow = false;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    const R = mulberry32(9217), seeds = [];
    for (let i = 0; i < count; i++) seeds.push([R(), R(), R(), R()]);
    this.animePetals = {mesh, seeds};
    this.animeWorldReady = true;
  };
  P.stepAnimePetals = function (time, x, z) {
    const petals = this.animePetals;
    if (!petals) return;
    const belowRoof = WD.caves.some(c => Math.hypot(x - c.x, z - c.y) < c.R) || (typeof inDG === 'function' && inDG({x, y:z}));
    petals.mesh.visible = !belowRoof;
    if (belowRoof) return;
    const ground = this.gY(x, z), span = 1400;
    petals.seeds.forEach((s, i) => {
      const px = x + ((s[0] * span + time * (13 + s[3] * 9)) % span) - span / 2;
      const pz = z + ((s[1] * span + time * 8) % span) - span / 2;
      const y = ground + 30 + ((s[2] * 350 - time * (10 + s[3] * 8)) % 350 + 350) % 350;
      const size = 3 + s[3] * 2.5;
      this.setI(petals.mesh, i, px, y, pz, size, size * 1.3, size,
        time * .8 + s[0] * 6, s[1] * 6 + time * .3, time + s[2] * 6);
    });
    petals.mesh.instanceMatrix.needsUpdate = true;
  };
  P.fxExtra = function (time, dt, me, listener) {
    original.fx.call(this, time, dt, me, listener);
    if (listener) this.stepAnimePetals(time, listener.x, listener.y);
  };
  P.menuFrame = function (dt) {
    if (this.menuReady && this.cam) this.stepAnimePetals(this.t, this.cam.position.x, this.cam.position.z - 600);
    return original.menu.call(this, dt);
  };
};
