"""Snow Queen VFX assets (Arena Royale, Claude 2026-11-23) — run with Blender 4.2+ (or the `bpy` module):

    blender -b -P moonfall-docs/blender/queen_vfx.py -- app/src/main/assets/assets/meshy/queen-vfx.glb [--preview out.png]
    python3.11 moonfall-docs/blender/queen_vfx.py -- <out.glb> [--preview out.png]        (pip install bpy)

Everything is procedural and seeded: a rerun gives the same meshes (the two Cycles renders can differ by a little render noise). One GLB, read by src/queen-vfx.js by node name:

  QV_Spike   ice spike cluster: one tall hexagonal crystal and its lesser crystals (base at 0, tip at 1 m)
  QV_Spike2  twin spike cluster (two crystals leaning apart)
  QV_Shard   one crystal shard (long point up, centred on the origin, 1 m long)   debris, falling comets, the crown
  QV_Prison  ice tomb: tall crystals lean in from a ring until they meet over the middle, short ones lean out
  QV_Wing    a crystal wing: eight blades fanned out to +X and up from the shoulder at the origin (thin along Y)
  QV_Sigil   2 x 2 m plane; its texture is the frost sigil rendered here with Cycles (white lines on black, glow added)
  QV_Cracks  2 x 2 m plane; its texture: ice fractures running out from an impact, rendered here with Cycles

Blender is Z up; the glTF export turns it into Y up (the game's up). Crystals carry a plain ice material only for viewers;
the game shades them with its own ice shader. Textures are white on black (the game adds them, tinted).
"""
import bpy, bmesh, math, random, sys, os, tempfile
import numpy as np
from mathutils import Vector

TAU = math.pi * 2


def cli():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    out = os.path.abspath(a[0]) if a else os.path.abspath('queen-vfx.glb')
    prev = os.path.abspath(a[a.index('--preview') + 1]) if '--preview' in a else None
    return out, prev


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.use_denoising = False
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    w = bpy.data.worlds.new('W')
    sc.world = w
    try:
        w.use_nodes = True
    except Exception:
        pass
    bg = w.node_tree.nodes.get('Background')
    if bg:
        bg.inputs['Color'].default_value = (0, 0, 0, 1)
        bg.inputs['Strength'].default_value = 0
    return sc


def link(name, bm, mat=None):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if mat:
        me.materials.append(mat)
    return ob


def node_mat(name):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    return m, m.node_tree.nodes, m.node_tree.links


def emission(name, strength):
    m, N, L = node_mat(name)
    for n in list(N):
        N.remove(n)
    e = N.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = (1, 1, 1, 1)
    e.inputs['Strength'].default_value = strength
    o = N.new('ShaderNodeOutputMaterial')
    L.new(e.outputs[0], o.inputs['Surface'])
    return m


# ---------------------------------------------------------------- crystals
def frame(w, u=None):
    w = w.normalized()
    if u is None:
        t = Vector((0, 0, 1)) if abs(w.z) < .9 else Vector((1, 0, 0))
        u = w.cross(t).normalized()
    v = w.cross(u).normalized()
    return u, v, w


def prism(bm, rng, base, axis, h, rx, ry=None, sides=6, rings=((-.06, 1.0), (.5, .93), (.76, .78)), tip=1.0,
          jit=.12, twist=.3, bend=None, u=None, bottom=True):
    """A faceted crystal: rings of (fraction of h, radius factor) closed by a point at `tip`."""
    ry = rx if ry is None else ry
    u, v, w = frame(axis, u)
    o = rng.random() * TAU
    angs = [o + (i + (rng.random() - .5) * .35) / sides * TAU for i in range(sides)]
    loops = []
    for t, k in rings:
        tw = (rng.random() - .5) * twist
        c = base + w * (t * h) + (bend * max(t, 0) ** 2 if bend is not None else Vector())
        loops.append([bm.verts.new(c + u * (math.cos(a + tw) * rx * k * (1 + (rng.random() - .5) * 2 * jit))
                                   + v * (math.sin(a + tw) * ry * k * (1 + (rng.random() - .5) * 2 * jit))) for a in angs])
    tp = base + w * (tip * h) + (bend if bend is not None else Vector()) + u * ((rng.random() - .5) * rx * .25) + v * ((rng.random() - .5) * ry * .25)
    tv = bm.verts.new(tp)
    for a in range(len(loops) - 1):
        L0, L1 = loops[a], loops[a + 1]
        for i in range(sides):
            j = (i + 1) % sides
            bm.faces.new((L0[i], L0[j], L1[j], L1[i]))
    L = loops[-1]
    for i in range(sides):
        bm.faces.new((L[i], L[(i + 1) % sides], tv))
    L = loops[0]
    if bottom:
        bv = bm.verts.new(base + w * (rings[0][0] * h) - w * (rx * .6))
        for i in range(sides):
            bm.faces.new((L[(i + 1) % sides], L[i], bv))


def lean(a, k):
    return Vector((math.cos(a) * k, math.sin(a) * k, 1.0))


def spike_cluster(rng, twin=False):
    bm = bmesh.new()
    if twin:
        prism(bm, rng, Vector((-.03, 0, 0)), Vector((-.26, .04, 1)), 1.0, .11)
        prism(bm, rng, Vector((.04, .01, 0)), Vector((.3, -.05, 1)), .82, .1)
        sec = [(1.7, .3, .5, .07), (4.0, .45, .4, .065), (5.3, .4, .36, .06)]
    else:
        prism(bm, rng, Vector((0, 0, 0)), Vector((.05, .03, 1)), 1.0, .125, twist=.25)
        sec = [(.7, .5, .6, .085), (2.75, .55, .5, .075), (4.85, .5, .45, .07)]
    for a, k, h, r in sec:
        a += (rng.random() - .5) * .5
        prism(bm, rng, Vector((math.cos(a) * .085, math.sin(a) * .085, 0)), lean(a, k), h, r)
    for i in range(4 if not twin else 3):
        a = (i + .5) / (4 if not twin else 3) * TAU + rng.random() * .6
        d = .15 + rng.random() * .05
        prism(bm, rng, Vector((math.cos(a) * d, math.sin(a) * d, 0)), lean(a, .9 + rng.random() * .3),
              .13 + rng.random() * .1, .038 + rng.random() * .014, sides=5)
    return bm


def shard(rng):
    bm = bmesh.new()
    prism(bm, rng, Vector((0, 0, -.5)), Vector((0, 0, 1)), 1.0, .12, sides=6,
          rings=((.12, .7), (.3, 1.0), (.62, .86)), tip=1.0, jit=.15, bottom=False)
    bmesh.ops.contextual_create(bm, geom=[v for v in bm.verts if v.co.z < -.4])   # close the short end
    return bm


def prison(rng):
    bm = bmesh.new()
    n = 8
    for i in range(n):
        a = i / n * TAU + (rng.random() - .5) * .25
        h = 1.05 + rng.random() * .3
        prism(bm, rng, Vector((math.cos(a) * .4, math.sin(a) * .4, 0)), lean(a, -.3 - rng.random() * .05), h,
              .1 + rng.random() * .035, rings=((-.06, 1.0), (.45, .95), (.8, .8)), tip=1.0)
    for i in range(7):
        a = (i + .5) / 7 * TAU + (rng.random() - .5) * .4
        d = .5 + rng.random() * .08
        prism(bm, rng, Vector((math.cos(a) * d, math.sin(a) * d, 0)), lean(a, .55 + rng.random() * .3),
              .3 + rng.random() * .26, .06 + rng.random() * .03, sides=5)
    # the frozen ground the tomb grows out of: a low ragged disc
    m = 26
    top = [bm.verts.new((math.cos(i / m * TAU) * (.56 + rng.random() * .1), math.sin(i / m * TAU) * (.56 + rng.random() * .1),
                         .03 + rng.random() * .035)) for i in range(m)]
    bot = [bm.verts.new((v.co.x * 1.06, v.co.y * 1.06, -.04)) for v in top]
    c = bm.verts.new((0, 0, .07))
    for i in range(m):
        j = (i + 1) % m
        bm.faces.new((top[i], top[j], c))
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    return bm


def wing(rng):
    """Eight crystal blades fanned out from the shoulder: +X outward, +Z up, thin along Y."""
    bm = bmesh.new()
    blades = [(84, 1.0), (70, .96), (56, .9), (43, .82), (31, .72), (19, .62), (8, .52), (-3, .43)]
    for i, (deg, L) in enumerate(blades):
        t = math.radians(deg + (rng.random() - .5) * 4)
        w = Vector((math.cos(t), 0, math.sin(t)))
        u = Vector((-math.sin(t), 0, math.cos(t)))
        base = w * (.05 + .02 * i)
        prism(bm, rng, base, w, L, .055 * (.75 + .5 * L), .016, sides=4, u=u,
              rings=((0, .35), (.18, 1.0), (.7, .8)), tip=1.0, jit=.08, twist=.05,
              bend=u * (-.05 * L))
        if i % 2 == 0:   # barbs along the bigger blades
            for f in (.42, .66):
                b = base + w * (L * f)
                t2 = t - .55
                w2 = Vector((math.cos(t2), 0, math.sin(t2)))
                prism(bm, rng, b, w2, L * .22, .02, .012, sides=4, u=Vector((-math.sin(t2), 0, math.cos(t2))),
                      rings=((0, .5), (.3, 1.0)), tip=1.0, jit=.05, twist=.02)
    for k in range(3):   # crystals at the shoulder hide the root
        a = k * 1.9
        prism(bm, rng, Vector((.02, 0, -.02)), Vector((math.cos(a) * .4 + .3, math.sin(a) * .25, .8)), .16, .045, sides=5)
    return bm


def ice_material():
    m, N, L = node_mat('QV_Ice')
    b = N.get('Principled BSDF')
    if b:
        b.inputs['Base Color'].default_value = (.72, .87, 1.0, 1)
        b.inputs['Roughness'].default_value = .06
        for k, v in (('Transmission Weight', .85), ('IOR', 1.31), ('Emission Color', (.25, .55, .9, 1)), ('Emission Strength', .25)):
            if k in b.inputs:
                b.inputs[k].default_value = v
    return m


# ---------------------------------------------------------------- textures (lines as thin emissive strips, rendered from above)
def strip(bm, pts, w0, w1=None, closed=False, z=0.0):
    w1 = w0 if w1 is None else w1
    n = len(pts)
    P = [Vector((p[0], p[1], 0)) for p in pts]
    L, R = [], []
    for i in range(n):
        a = P[i - 1] if (closed or i > 0) else P[i]
        b = P[(i + 1) % n] if (closed or i < n - 1) else P[i]
        d = (b - a)
        d = d.normalized() if d.length > 1e-9 else Vector((1, 0, 0))
        nrm = Vector((-d.y, d.x, 0))
        w = (w0 + (w1 - w0) * (i / max(1, n - 1))) / 2
        L.append(bm.verts.new((P[i].x + nrm.x * w, P[i].y + nrm.y * w, z)))
        R.append(bm.verts.new((P[i].x - nrm.x * w, P[i].y - nrm.y * w, z)))
    for i in range(n if closed else n - 1):
        j = (i + 1) % n
        bm.faces.new((R[i], R[j], L[j], L[i]))


def circle(r, n=None, a0=0.0, a1=TAU):
    n = n or max(24, int(r * 260))
    return [(math.cos(a0 + (a1 - a0) * i / n) * r, math.sin(a0 + (a1 - a0) * i / n) * r) for i in range(n + (0 if a1 - a0 >= TAU - 1e-6 else 1))]


def ngon(bm, cx, cy, r, n, a0=0.0, z=0.0):
    vs = [bm.verts.new((cx + math.cos(a0 + i / n * TAU) * r, cy + math.sin(a0 + i / n * TAU) * r, z)) for i in range(n)]
    bm.faces.new(vs)


def rot(p, a):
    c, s = math.cos(a), math.sin(a)
    return (p[0] * c - p[1] * s, p[0] * s + p[1] * c)


def sigil_strokes(rng):
    hi, lo = bmesh.new(), bmesh.new()
    strip(hi, circle(.965, 400), .014, closed=True)
    strip(lo, circle(.925, 380), .006, closed=True)
    for i in range(96):   # tick marks between the outer rings
        a = i / 96 * TAU
        r0 = .932 if i % 4 else .928
        strip(lo if i % 4 else hi, [(math.cos(a) * r0, math.sin(a) * r0), (math.cos(a) * .958, math.sin(a) * .958)], .005 if i % 4 else .008)
    # 24 ice runes around the band (stem along the radius, branches like frost ferns)
    for i in range(24):
        a = (i + .5) / 24 * TAU
        r0, r1 = .795, .895
        stem = [(r0, 0), (r1, 0)]
        G = [stem]
        kind = rng.randrange(5)
        if kind == 0:
            G += [[(.84, 0), (.875, .028)], [(.84, 0), (.875, -.028)], [(.81, 0), (.83, .02)], [(.81, 0), (.83, -.02)]]
        elif kind == 1:
            G += [[(.82, .03), (.87, 0), (.82, -.03)], [(.8, .022), (.8, -.022)]]
        elif kind == 2:
            G += [[(.85, 0), (.89, .03)], [(.83, 0), (.8, .025)], [(.87, -.026), (.84, 0)]]
        elif kind == 3:
            G = [[(r0, -.02), (r1, -.02)], [(r0, .02), (r1, .02)], [(.82, -.02), (.86, .02)], [(.86, -.02), (.82, .02)]]
        else:
            G += [[(.845, -.03), (.845, .03)], [(.87, -.018), (.87, .018)], [(.815, 0), (.8, .02)]]
        for g in G:
            strip(hi, [rot(p, a) for p in g], .0065)
        ngon(hi, *rot((.775, 0), a), .007, 4, a)
    strip(hi, circle(.765, 360), .011, closed=True)
    strip(lo, circle(.738, 340), .005, closed=True)
    # hexagram on the inner ring and its six knots
    for s in (0, 1):
        tri = [(math.cos(s * math.pi / 3 + k * TAU / 3 + math.pi / 2) * .738, math.sin(s * math.pi / 3 + k * TAU / 3 + math.pi / 2) * .738) for k in range(3)]
        strip(hi, tri, .008, closed=True)
    for k in range(6):
        a = k * TAU / 6 + math.pi / 2
        ring = [(math.cos(a) * .738 + math.cos(j / 20 * TAU) * .028, math.sin(a) * .738 + math.sin(j / 20 * TAU) * .028) for j in range(20)]
        strip(hi, ring, .006, closed=True)
        ngon(hi, math.cos(a) * .738, math.sin(a) * .738, .012, 6, a)
    strip(lo, [(math.cos(k * TAU / 6) * .42, math.sin(k * TAU / 6) * .42) for k in range(6)], .006, closed=True)
    strip(lo, circle(.2, 120), .007, closed=True)
    # the snowflake: six arms with fern branches, a diamond at each tip, small arms between
    for k in range(6):
        a = k * TAU / 6 + math.pi / 2
        strip(hi, [rot((.07, 0), a), rot((.66, 0), a)], .016, .008)
        for f, L in ((.24, .15), (.38, .12), (.5, .085), (.58, .05)):
            for sgn in (1, -1):
                strip(hi, [rot((f, 0), a), rot((f + L * .55, sgn * L * .82), a)], .009, .004)
                if L > .1:
                    q = (f + L * .3, sgn * L * .45)
                    strip(lo, [rot(q, a), rot((q[0] + .04, q[1] + sgn * .005), a)], .005, .003)
        strip(hi, [rot(p, a) for p in ((.62, 0), (.665, .03), (.71, 0), (.665, -.03))], .007, closed=True)
        b = a + math.pi / 6
        strip(lo, [rot((.09, 0), b), rot((.3, 0), b)], .008, .004)
        for f in (.17, .24):
            for sgn in (1, -1):
                strip(lo, [rot((f, 0), b), rot((f + .035, sgn * .045), b)], .005, .003)
    ngon(hi, 0, 0, .055, 6, math.pi / 2)
    strip(hi, [(math.cos(k * TAU / 6 + math.pi / 2) * .085, math.sin(k * TAU / 6 + math.pi / 2) * .085) for k in range(6)], .006, closed=True)
    return hi, lo


def crack_strokes(rng):
    hi, lo = bmesh.new(), bmesh.new()

    def walk(x, y, a, length, w0, depth):
        pts = [(x, y)]
        seg = .045
        n = max(3, int(length / seg))
        for i in range(n):
            a += (rng.random() - .5) * .55
            x += math.cos(a) * seg
            y += math.sin(a) * seg
            if math.hypot(x, y) > .97:
                break
            pts.append((x, y))
        if len(pts) > 1:
            strip(hi if depth == 0 else lo, pts, w0, w0 * .2)
        if depth < 2:
            for i in range(1, len(pts) - 2):
                if rng.random() < (.16 if depth == 0 else .1):
                    px, py = pts[i]
                    walk(px, py, a + (rng.random() - .5) * 2.2, length * (.35 + rng.random() * .3), w0 * .55, depth + 1)
    n = 11
    for i in range(n):
        a = i / n * TAU + (rng.random() - .5) * .4
        walk(math.cos(a) * .05, math.sin(a) * .05, a, .75 + rng.random() * .22, .016, 0)
    for r in (.3, .52, .74):   # broken rings between the cracks
        a = rng.random() * TAU
        while a < TAU + 1:
            span = .25 + rng.random() * .5
            pts = [(math.cos(a + span * j / 8) * r * (1 + (rng.random() - .5) * .06), math.sin(a + span * j / 8) * r * (1 + (rng.random() - .5) * .06)) for j in range(9)]
            strip(lo, pts, .005, .003)
            a += span + .2 + rng.random() * .5
    ngon(hi, 0, 0, .06, 7)
    return hi, lo


def frost_field_material():
    """Frost on the ice between the cracks: voronoi cell walls, fading out from the impact."""
    m, N, L = node_mat('QV_Frost')
    for n in list(N):
        N.remove(n)
    tc = N.new('ShaderNodeTexCoord')
    vor = N.new('ShaderNodeTexVoronoi')
    vor.feature = 'DISTANCE_TO_EDGE'
    vor.inputs['Scale'].default_value = 9.0
    noi = N.new('ShaderNodeTexNoise')
    noi.inputs['Scale'].default_value = 6.0
    mix = N.new('ShaderNodeVectorMath')
    mix.operation = 'MULTIPLY_ADD'
    mix.inputs[1].default_value = (.08, .08, .08)
    L.new(noi.outputs['Color'], mix.inputs[0])
    L.new(tc.outputs['Object'], mix.inputs[2])
    L.new(mix.outputs[0], vor.inputs['Vector'])
    edge = N.new('ShaderNodeMapRange')
    edge.inputs['From Min'].default_value = 0.0
    edge.inputs['From Max'].default_value = .035
    edge.inputs['To Min'].default_value = 1.0
    edge.inputs['To Max'].default_value = 0.0
    L.new(vor.outputs['Distance'], edge.inputs['Value'])
    ln = N.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    L.new(tc.outputs['Object'], ln.inputs[0])
    fall = N.new('ShaderNodeMapRange')
    fall.inputs['From Min'].default_value = .15
    fall.inputs['From Max'].default_value = .95
    fall.inputs['To Min'].default_value = .55
    fall.inputs['To Max'].default_value = 0.0
    L.new(ln.outputs['Value'], fall.inputs['Value'])
    mul = N.new('ShaderNodeMath')
    mul.operation = 'MULTIPLY'
    L.new(edge.outputs[0], mul.inputs[0])
    L.new(fall.outputs[0], mul.inputs[1])
    e = N.new('ShaderNodeEmission')
    L.new(mul.outputs[0], e.inputs['Strength'])
    o = N.new('ShaderNodeOutputMaterial')
    L.new(e.outputs[0], o.inputs['Surface'])
    return m


def blur(img, s):
    h, w = img.shape
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    k = np.exp(-2 * (math.pi * s) ** 2 * (fx * fx + fy * fy))
    return np.fft.irfft2(np.fft.rfft2(img) * k, s=(h, w))


def render_texture(build, path, res, glow):
    sc = reset()
    rng = random.Random(build.__name__)
    hi, lo = build(rng)
    link('hi', hi, emission('E_hi', 1.0))
    link('lo', lo, emission('E_lo', .55))
    if build is crack_strokes:
        bpy.ops.mesh.primitive_plane_add(size=2.0, location=(0, 0, -.01))
        bpy.context.object.data.materials.append(frost_field_material())
    cam = bpy.data.cameras.new('C')
    cam.type = 'ORTHO'
    cam.ortho_scale = 2.0
    co = bpy.data.objects.new('C', cam)
    sc.collection.objects.link(co)
    co.location = (0, 0, 5)
    sc.camera = co
    sc.render.resolution_x = sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.cycles.samples = 24
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    sc.render.image_settings.color_depth = '16'
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(path)
    px = np.empty(res * res * 4, np.float32)
    im.pixels.foreach_get(px)
    core = px.reshape(res, res, 4)[:, :, 0].astype(np.float64)
    out = core.copy()
    for s, k in glow:
        out += k * blur(core, s)
    out = np.clip(out, 0, 1)
    rgba = np.stack([out, out, out, np.ones_like(out)], -1).astype(np.float32)
    im.pixels.foreach_set(rgba.ravel())
    im.filepath_raw = path
    im.file_format = 'PNG'
    im.save()
    return path


def textured_plane(name, path):
    bpy.ops.mesh.primitive_plane_add(size=2.0)
    ob = bpy.context.object
    ob.name = name
    ob.data.name = name
    m, N, L = node_mat(name + '_Mat')
    b = N.get('Principled BSDF')
    t = N.new('ShaderNodeTexImage')
    t.image = bpy.data.images.load(path)
    if b:
        b.inputs['Base Color'].default_value = (0, 0, 0, 1)
        L.new(t.outputs['Color'], b.inputs['Emission Color'] if 'Emission Color' in b.inputs else b.inputs['Base Color'])
        if 'Emission Strength' in b.inputs:
            b.inputs['Emission Strength'].default_value = 1.0
    ob.data.materials.append(m)
    return ob


def build_assets(tex):
    reset()
    ice = ice_material()
    rng = random.Random(7)
    objs = [link('QV_Spike', spike_cluster(rng), ice), link('QV_Spike2', spike_cluster(rng, twin=True), ice),
            link('QV_Shard', shard(rng), ice), link('QV_Prison', prison(rng), ice), link('QV_Wing', wing(rng), ice),
            textured_plane('QV_Sigil', tex['sigil']), textured_plane('QV_Cracks', tex['cracks'])]
    for o in objs:
        o.data.polygons.foreach_set('use_smooth', [False] * len(o.data.polygons))
    return objs


def export(objs, out):
    for o in bpy.context.scene.objects:
        o.select_set(o in objs)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    kw = dict(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
              export_image_format='JPEG', export_materials='EXPORT', export_animations=False, export_cameras=False,
              export_lights=False)
    try:
        bpy.ops.export_scene.gltf(export_jpeg_quality=90, **kw)
    except TypeError:
        bpy.ops.export_scene.gltf(**kw)
    tris = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs}
    print('queen-vfx', out, os.path.getsize(out), 'bytes', tris, 'tris', sum(tris.values()))


def preview(objs, path, tex):
    """A lineup of the crystals on dark ice, for the report (not used by the game)."""
    sc = bpy.context.scene
    lay = {'QV_Spike': (-2.2, 0, 0, 1.5), 'QV_Spike2': (-1.1, .4, 0, 1.3), 'QV_Prison': (.4, .2, 0, 1.25),
           'QV_Wing': (1.9, .3, .1, 1.3), 'QV_Shard': (-.3, -.9, .45, .6)}
    for o in objs:
        if o.name in lay:
            x, y, z, s = lay[o.name]
            o.location = (x, y, z)
            o.scale = (s, s, s)
            if o.name == 'QV_Shard':
                o.rotation_euler = (.5, .9, .3)
        else:
            o.hide_render = True
    bpy.ops.mesh.primitive_plane_add(size=14, location=(0, 0, -.001))
    g = bpy.context.object
    m, N, L = node_mat('Ground')
    b = N.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (.03, .06, .1, 1)
    b.inputs['Roughness'].default_value = .25
    g.data.materials.append(m)
    sg = textured_plane('SigilPreview', tex['sigil'])
    sg.location = (.4, .2, .002)
    sg.scale = (1.5, 1.5, 1)
    w = sc.world.node_tree.nodes.get('Background')
    if w:
        w.inputs['Color'].default_value = (.05, .09, .16, 1)
        w.inputs['Strength'].default_value = .6
    for loc, e, c in (((-3, -4, 5), 600, (.85, .93, 1)), ((4, 3, 3), 300, (.4, .7, 1))):
        ld = bpy.data.lights.new('L', 'AREA')
        ld.energy = e
        ld.size = 3
        ld.color = c
        lo = bpy.data.objects.new('L', ld)
        sc.collection.objects.link(lo)
        lo.location = loc
        lo.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    cam = bpy.data.cameras.new('C')
    cam.lens = 40
    co = bpy.data.objects.new('C', cam)
    sc.collection.objects.link(co)
    co.location = (0, -6.2, 3.6)
    co.rotation_euler = (Vector((0, 0, .8)) - Vector(co.location)).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = co
    sc.render.resolution_x, sc.render.resolution_y = 1280, 640
    sc.cycles.samples = 48
    sc.cycles.use_denoising = False
    sc.view_settings.view_transform = 'AgX' if 'AgX' in [i.identifier for i in sc.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Filmic'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    sc.render.image_settings.color_depth = '8'
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    out, prev = cli()
    tmp = tempfile.mkdtemp(prefix='queen-vfx-')
    tex = {'sigil': render_texture(sigil_strokes, os.path.join(tmp, 'qv-sigil.png'), 1024, ((2.5, .5), (9, .45), (28, .25))),
           'cracks': render_texture(crack_strokes, os.path.join(tmp, 'qv-cracks.png'), 1024, ((2.5, .45), (10, .35)))}
    objs = build_assets(tex)
    export(objs, out)
    if prev:
        preview(objs, prev, tex)


main()
