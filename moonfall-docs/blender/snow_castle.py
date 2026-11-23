"""Build the Snow Queen's castle with Blender 4.2+ (or the bpy module).

blender -b -P moonfall-docs/blender/snow_castle.py -- snow-castle.glb [--preview preview.png]

Coordinates are in metres. The foundation is centred at (0, 0, 0), and
the gate faces -Y (+Z in the exported GLB).
"""

import argparse
import math
from pathlib import Path
import random
import sys
import tempfile

import bmesh
import bpy
from mathutils import Vector
import numpy as np


STONE, ICE, SNOW, GLOW, TRIM = range(5)
HALF_WIDTH, HALF_DEPTH = 4.5, 2.8
PLINTH = 0.40
SEED = 231126


def linear(hex_color):
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c < 0.04045 else ((c + .055) / 1.055) ** 2.4
                 for c in rgb) + (1,)


def material(name, color, roughness, metallic=0, emission=None, strength=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.use_backface_culling = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = linear(color)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = linear(emission)
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat


def stone_image(folder):
    """Bake periodic mottling into JPEG so Blender and the game use the same stone."""
    size = 512
    rng = np.random.default_rng(SEED)
    u, v = np.meshgrid(np.arange(size) * math.tau / size,
                       np.arange(size) * math.tau / size)
    tone = np.zeros_like(u)
    for frequency, amplitude in ((1, 6), (3, 4), (7, 2.6), (18, 1.2), (45, .7)):
        for _ in range(5):
            a, b = rng.integers(-frequency, frequency + 1, 2)
            tone += np.sin(a * u + b * v + rng.uniform(0, math.tau)) * amplitude
    tone += rng.normal(0, 1.6, tone.shape)
    rgb = np.clip((151 + tone[..., None] + np.array([0, 18, 32])) / 255, 0, 1)
    pixels = np.concatenate((rgb, np.ones((size, size, 1))), axis=2)
    image = bpy.data.images.new("Frosted limestone", size, size, alpha=False)
    image.pixels.foreach_set(pixels.astype(np.float32).ravel())
    path = folder / "frosted-limestone.jpg"
    image.filepath_raw = str(path)
    image.file_format = "JPEG"
    image.save()
    baked = bpy.data.images.load(str(path))
    baked.pack()
    bpy.data.images.remove(image)
    return baked


def materials(folder):
    mats = [
        material("Stone_Ice", "ffffff", .85),
        material("Ice_Crystal", "80bcef", .11, emission="2c6a9e", strength=.34),
        material("Snow", "e2eefb", .95),
        material("Glow", "113450", .48, emission="7fe4ff", strength=1.20),
        material("Trim", "48677d", .43, metallic=.67),
    ]
    for i in (STONE, ICE, TRIM):
        mat = mats[i]
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        base = nodes["Principled BSDF"].inputs["Base Color"]
        tint = nodes.new("ShaderNodeVertexColor")
        tint.layer_name = "Patina"
        multiply = nodes.new("ShaderNodeMix")
        multiply.data_type = "RGBA"
        multiply.blend_type = "MULTIPLY"
        multiply.inputs[0].default_value = 1
        multiply.inputs[6].default_value = base.default_value
        links.new(tint.outputs["Color"], multiply.inputs[7])
        links.new(multiply.outputs[2], base)
        if i == STONE:
            tex = nodes.new("ShaderNodeTexImage")
            tex.image = stone_image(folder)
            links.new(tex.outputs["Color"], multiply.inputs[6])
    return mats


class Castle:
    def __init__(self):
        self.meshes = [bmesh.new() for _ in range(5)]
        self.rng = random.Random(SEED)
        self.tints = {i: self.meshes[i].loops.layers.color.new("Patina")
                      for i in (STONE, ICE, TRIM)}
        self.uv = self.meshes[STONE].loops.layers.uv.new("Stone UV")

    def face(self, verts, mat, shade=1.0):
        face = self.meshes[mat].faces.new(verts)
        tint = self.tints.get(mat)
        if tint is not None:
            for loop in face.loops:
                loop[tint] = (shade, shade, shade, 1)
        return face

    def solid(self, profiles, mat, shade=1.0, smooth=False):
        """Bridge matching rings in order and close the two ends."""
        rings = [[self.meshes[mat].verts.new(p) for p in ring] for ring in profiles]
        sides = len(rings[0])
        self.face(rings[0][::-1], mat, shade)
        for lower, upper in zip(rings, rings[1:]):
            for i in range(sides):
                j = (i + 1) % sides
                self.face((lower[i], lower[j], upper[j], upper[i]), mat, shade).smooth = smooth
        self.face(rings[-1], mat, shade).smooth = smooth

    def box(self, x, y, low, w, d, high, mat=STONE, bevel=.025, shade=1.0, angle=0):
        b = min(bevel, w / 4, d / 4, (high - low) / 3)
        c, s = math.cos(angle), math.sin(angle)
        rings = []
        levels = ((low, b), (low + b, 0), (high - b, 0), (high, b)) if b else ((low, 0), (high, 0))
        for z, inset in levels:
            a, t = w / 2 - inset, d / 2 - inset
            rings.append([(x + c * u - s * v, y + s * u + c * v, z)
                          for u, v in ((-a, -t), (a, -t), (a, t), (-a, t))])
        self.solid(rings, mat, shade)

    def round(self, x, y, profiles, mat=STONE, sides=12, phase=math.pi / 12, shade=1.0):
        rings = [[(x + r * math.cos(phase + i * math.tau / sides),
                   y + r * math.sin(phase + i * math.tau / sides), z)
                  for i in range(sides)] for z, r in profiles]
        self.solid(rings, mat, shade)

    def relief(self, points, front, back, mat, shade=1.0):
        """Extrude a polygon in the XZ plane, toward the viewer at -Y."""
        self.solid([[(x, y, z) for x, z in points] for y in (front, back)], mat, shade)

    def crystal(self, base, axis, length, radius, *, roof=False, shade=.82, icicle=False):
        """Faceted hexagonal rings and a point, adapted from queen_vfx.py's prism."""
        rng = self.rng
        base, axis = Vector(base), Vector(axis).normalized()
        ref = Vector((1, 0, 0)) if abs(axis.z) > .9 else Vector((0, 0, 1))
        u = axis.cross(ref).normalized()
        v = axis.cross(u)
        phase = rng.uniform(0, math.tau)
        angles = [phase + i * math.tau / 6 + rng.uniform(-.11, .11) for i in range(6)]
        profile = ((0, 1), (.32, .69), (.68, .31)) if roof else ((0, 1), (.53, .93), (.76, .72))
        if icicle:
            profile = ((0, 1), (.34, .76))
        rings = []
        for t, r in profile:
            twist = rng.uniform(-.10, .10)
            ring = []
            for a in angles:
                offset = u * math.cos(a + twist) + v * math.sin(a + twist)
                ring.append(self.meshes[ICE].verts.new(base + axis * (length * t)
                            + offset * (radius * r * rng.uniform(.92, 1.08))))
            rings.append(ring)
        point = self.meshes[ICE].verts.new(base + axis * length)
        self.face(rings[0][::-1], ICE, shade)
        for i in range(6):
            j = (i + 1) % 6
            tint = shade * rng.uniform(.68, 1.12)
            for lower, upper in zip(rings, rings[1:]):
                self.face((lower[i], lower[j], upper[j], upper[i]), ICE, tint)
            self.face((rings[-1][i], rings[-1][j], point), ICE, min(1.0, tint * 1.1))

    def drift(self, x, y, z, w, d, height, angle=0):
        """A ragged snow lip with a rounded shoulder and a buried bottom."""
        c, s = math.cos(angle), math.sin(angle)
        outline = [(math.cos(i * math.tau / 8) * w / 2 * self.rng.uniform(.84, 1),
                    math.sin(i * math.tau / 8) * d / 2 * self.rng.uniform(.84, 1))
                   for i in range(8)]
        rings = [[(x + k * (c * u - s * v), y + k * (s * u + c * v), z + h * height)
                  for u, v in outline] for h, k in ((-.26, .83), (.20, 1), (1, .43))]
        self.solid(rings, SNOW, smooth=True)

    def cluster(self, x, y, z, dx, dy, scale=1):
        for i, (offset, height, radius) in enumerate(((-.17, .53, .12), (0, .83, .16),
                                                     (.18, .58, .13), (.32, .31, .09))):
            self.crystal((x - dy * offset * scale, y + dx * offset * scale, z),
                         (dx * (.28 + i * .04) - dy * offset,
                          dy * (.28 + i * .04) + dx * offset, 1),
                         height * scale, radius * scale, shade=.69 + i * .06)

    def icicles(self, x, y, z, n, spacing, angle=0):
        for i in range(n):
            t = (i - (n - 1) / 2) * spacing + self.rng.uniform(-.02, .02)
            self.crystal((x + math.cos(angle) * t, y + math.sin(angle) * t, z),
                         (self.rng.uniform(-.12, .12), .025, -1),
                         self.rng.uniform(.15, .38), self.rng.uniform(.025, .045),
                         icicle=True, shade=.81)

    def window(self, x, y, z, width, height, angle=0):
        # From wide stone reveal to a slim, pointed pane. Rotate around its sill.
        c, s = math.cos(angle), math.sin(angle)
        for w, h, bottom, depth, mat in (
            (width + .12, height + .12, -.055, -.030, TRIM),
            (width, height, 0, -.060, GLOW),
        ):
            left, right = -w / 2, w / 2
            points = ((left, bottom), (right, bottom), (right, h * .73),
                      (width * .27, h * .89), (0, h),
                      (-width * .27, h * .89), (left, h * .73))
            rings = [[(x + c * u - s * v, y + s * u + c * v, z + f)
                      for u, f in points] for v in (depth, .050)]
            self.solid(rings, mat)
        self.box(x, y, z - .086, width + .23, .17, z - .035, STONE, bevel=0, angle=angle)

    def foundation(self):
        self.box(0, 0, 0, 9, 5.6, .26, STONE, .035, .73)
        self.box(0, .05, .16, 8.91, 5.46, .31, TRIM, .025)
        self.box(0, .05, .29, 8.80, 5.42, PLINTH, STONE, .025, .96)
        for y, high, w, depth in ((-2.69, .31, 1.79, .22), (-2.60, .40, 1.66, .19),
                                  (-2.51, .49, 1.53, .19)):
            self.box(0, y, .18, w, depth, high, STONE, .017, .89)
        for x in (-2.98, 2.98):
            for y, width, depth in ((-.98, 1.38, .86), (.28, 1.44, 1.0), (1.64, 1.13, .91)):
                self.drift(x, y, PLINTH, width, depth, .11, self.rng.uniform(-.62, .62))
            self.cluster(x + .18, .35, PLINTH + .018, -.25, .51, 1.05)
        for x in (-1.58, 1.58):
            self.drift(x, -1.02, PLINTH, .89, .65, .08)

    def wall(self, x, y, length, angle):
        c, s = math.cos(angle), math.sin(angle)

        def block(u, v, low, width, depth, high, mat=STONE, shade=1, bevel=.023):
            self.box(x + u * c - v * s, y + u * s + v * c, low,
                     width, depth, high, mat, bevel, shade, angle)

        block(0, 0, PLINTH, length, .36, 1.98, shade=.66)
        block(0, 0, PLINTH, length, .47, .55, shade=.89)
        course = .278
        for row in range(5):
            low = .535 + row * course
            pitch = .61
            left = -length / 2
            cuts = [left] + [left + pitch * (i + (.5 if row % 2 else 1))
                             for i in range(math.ceil(length / pitch))]
            cuts = [p for p in cuts if p < length / 2 - .10] + [length / 2]
            for a, b in zip(cuts, cuts[1:]):
                block((a + b) / 2, 0, low, b - a - .012,
                      self.rng.uniform(.373, .402), low + course - .008,
                      shade=self.rng.uniform(.76, 1.04), bevel=0)
        block(0, 0, 1.90, length, .48, 1.98, TRIM)
        block(0, 0, 1.96, length, .51, 2.07, shade=.97)
        n = round(length / .53)
        for i in range(n):
            t = (i - (n - 1) / 2) * length / n
            block(t, 0, 2.03, .30, .43, 2.30, shade=.93)
            self.drift(x + t * c, y + t * s, 2.29, .33, .46,
                       self.rng.uniform(.04, .09), angle)
            if i % 3 == 0 and i + 1 < n:
                t += .23
                self.drift(x + t * c, y + t * s, 2.06, .31, .45, .065, angle)

    def turret(self, x, y, r, eave, peak, keep=False):
        self.round(x, y, [(PLINTH - .02, r * .99), (.51, r), (.63, r * .93),
                          (.72, r * .84), (eave - .21, r * .79),
                          (eave - .13, r * .92), (eave, r * .90)])
        for z, ratio in ((.75, .85), (eave - .80, .84), (eave - .23, .88)):
            self.round(x, y, [(z, r * (ratio - .05)), (z + .018, r * ratio),
                              (z + .078, r * ratio)],
                       TRIM, shade=.88)
        for i in range(6):
            a = i * math.tau / 6
            self.window(x + math.sin(a) * r * .783, y - math.cos(a) * r * .783,
                        eave - .75 + .07 * (i % 2), .105 if keep else .088, .39, a)
        self.round(x, y, [(eave - .08, r * .92), (eave + .02, r * .93),
                          (eave + .09, r * .78)], ICE, shade=.63)
        for i in range(6):
            a = i * math.tau / 6
            self.drift(x + math.sin(a) * r * .69, y - math.cos(a) * r * .69,
                       eave + .02, r * .61, r * .37, self.rng.uniform(.065, .13), a)
        lean = (-.12 if x < 0 else .095, .035 if y > 0 else -.02, 1)
        self.crystal((x, y, eave + .034), lean, peak - eave, r * .85, roof=True, shade=.78)
        for dx, dy, fraction in ((-.39, -.27, .61), (.36, .30, .47)):
            self.crystal((x + dx * r, y + dy * r, eave + .03),
                         (dx * .62, dy * .72, 1), (peak - eave) * fraction,
                         r * .30, roof=True, shade=.58)
        self.icicles(x, y - r * .81, eave - .06, 4, r * .20)

    def gatehouse(self):
        y = -1.97
        for sign in (-1, 1):
            x = sign * 1.10
            self.box(x, y, PLINTH, .88, 1.08, 2.75)
            self.box(x, y, PLINTH, 1.00, 1.17, .62, shade=.79)
            for z in (1.05, 2.53):
                self.box(x, y, z, .93, 1.13, z + .073, TRIM)
            for a in (-1, 1):
                self.box(x + a * .355, y - .533, .64, .124, .13, 2.57, shade=.88)
            self.window(x, y - .55, 1.55, .12, .64)
            self.box(x, y, 2.67, 1.04, 1.25, 2.78, STONE)
            for dx in (-.33, .33):
                self.drift(x + dx, y - .45, 2.78, .43, .29, .11)
            self.crystal((x, y, 2.72), (sign * .13, .09, 1), .91, .54, roof=True)
            self.crystal((x + sign * .26, y + .06, 2.76), (sign * .38, .02, 1),
                         .55, .22, roof=True, shade=.65)
            self.icicles(x, y - .587, 2.68, 5, .16)

        self.box(0, -2.15, .43, 1.64, .61, 2.32, STONE, shade=.81)
        self.box(0, -2.21, 2.20, 1.58, .69, 2.42, STONE)
        self.box(0, -2.24, 2.38, 1.44, .66, 2.48, TRIM)
        for x in (-.45, 0, .45):
            self.drift(x, -2.38, 2.47, .53, .36, .092)

        sill, spring = .47, 1.43
        steps = 12

        def arch(radius):
            return [(radius * math.cos(i * math.pi / steps),
                     spring + 1.07 * radius * math.sin(i * math.pi / steps))
                    for i in range(steps + 1)]

        inner, outer = arch(.64), arch(.80)
        for side in (-1, 1):
            for i in range(5):
                low = sill + i * (spring - sill) / 5
                self.box(side * .72, -2.476, low, .16, .19,
                         low + (spring - sill) / 5 - .008, STONE, .013, .91)
        for i in range(steps):
            self.relief((inner[i], outer[i], outer[i + 1], inner[i + 1]),
                        -2.584, -2.415, STONE, .80 if i % 2 == 0 else .96)
        self.relief([(-.64, sill), (.64, sill), *inner], -2.525, -2.41, TRIM, .57)
        for direction in (-1, 1):
            width = .589 * direction
            crown = arch(.589)
            mid = steps // 2
            half = crown[:mid + 1] if direction == 1 else crown[mid:]
            self.relief([(0, sill + .045), (width, sill + .045),
                         *(half if direction == 1 else reversed(half))],
                        -2.539, -2.526, ICE, .31)
        self.box(0, -2.549, sill + .047, .024, .023, 1.99, GLOW, .004)
        # Snowflake seal laid onto the two leaves, framed by cold iron.
        self.relief([(0, 1.76), (.32, 1.38), (0, 1.00), (-.32, 1.38)],
                    -2.577, -2.54, TRIM)
        self.relief([(0, 1.63), (.046, 1.44), (.215, 1.38), (.046, 1.32),
                     (0, 1.13), (-.046, 1.32), (-.215, 1.38), (-.046, 1.44)],
                    -2.591, -2.577, GLOW)
        for sign in (-1, 1):
            self.relief([(sign * x, z) for x, z in
                         ((.06, .76), (.47, 1.21), (.50, 1.34), (.41, 1.27))],
                        -2.555, -2.539, TRIM)
            self.cluster(sign * 1.77, -2.34, .45, sign * .75, -.40, .86)

    def keep(self):
        y = .91
        self.box(0, y, PLINTH, 3.22, 1.99, 3.86, shade=.92)
        self.box(0, y, .40, 3.43, 2.14, .65, shade=.77)
        for z in (1.20, 2.74, 3.50):
            self.box(0, y, z, 3.28, 2.04, z + .09, STONE, shade=.77)
        for sign in (-1, 1):
            self.box(sign * 1.66, 1.26, .58, .49, 1.28, 3.54, shade=.84)
            self.box(sign * 1.66, 1.26, 3.48, .57, 1.36, 3.62, TRIM)
            self.window(sign * 1.90, 1.13, 2.51, .16, .58, sign * math.pi / 2)
            self.crystal((sign * 1.64, 1.27, 3.60), (sign * .34, .13, 1),
                         1.35, .41, roof=True, shade=.59)
            self.drift(sign * 1.67, .96, 3.62, .55, .32, .11)
            self.turret(sign * 1.22, .015, .64, 4.04, 5.48 + sign * .12, keep=True)
            self.window(sign * .52, -.09, 2.94, .125, .51)
            self.box(sign * .72, -.085, 2.68, .10, .113, 3.83, shade=.71)

        self.box(0, y, 3.73, 3.27, 2.15, 3.93, STONE)
        self.box(0, .95, 3.89, 1.61, 1.63, 4.86, STONE, bevel=.08)
        self.box(0, .95, 4.74, 1.74, 1.72, 4.94, TRIM, bevel=.06)
        self.window(0, .125, 4.02, .21, .62)
        self.window(0, -.093, 1.52, .27, .91)
        for x in (-1.32, -.65, .65, 1.32):
            self.drift(x, 1.83, 3.92, .65, .40, .13)
        for x in (-.62, 0, .62):
            self.drift(x, .32, 4.94, .68, .42, .12)
        self.icicles(0, .10, 4.79, 7, .19)

        self.crystal((0, 1.03, 4.84), (.038, .06, 1), 2.81, .68, shade=.94)
        for x, cy, dx, dy, h, r in ((-.44, .89, -.48, -.08, 2.24, .39),
                                     (.42, .88, .52, -.11, 2.04, .38),
                                     (-.22, 1.31, -.24, .39, 2.06, .31),
                                     (.27, 1.40, .24, .35, 1.88, .31),
                                     (-.30, .44, -.41, -.25, 1.41, .28),
                                     (.28, .43, .40, -.31, 1.62, .28)):
            self.crystal((x, cy, 4.87), (dx, dy, 1), h, r, shade=.74)

    def build(self, mats):
        self.foundation()
        self.wall(0, 2.39, 7.40, math.pi)
        for side in (-1, 1):
            self.wall(side * 4.11, 0, 4.04, side * math.pi / 2)
            self.wall(side * 2.63, -2.39, 2.57, 0)
        # The circular tower feet sit tangent to both footprint edges.
        radius = .835
        extent = radius * math.cos(math.pi / 12)
        for sx in (-1, 1):
            for sy in (-1, 1):
                self.turret(sx * (HALF_WIDTH - extent), sy * (HALF_DEPTH - extent),
                            radius, 2.59 + .07 * sy, 3.89 + .07 * sy)
                self.cluster(sx * 3.37, sy * 1.39, .47, -sx * .32, -sy * .66)
            self.cluster(sx * 3.03, -2.30, 1.18, -sx * .26, -.52, .67)
            self.cluster(sx * 3.88, .57, 1.81, sx * .27, .49, .67)
            self.icicles(sx * 2.70, -2.64, 1.96, 6, .23)
            self.icicles(sx * 4.35, .36, 1.97, 6, .24, math.pi / 2)
        self.gatehouse()
        self.keep()

        objects = []
        for index, (bm, mat) in enumerate(zip(self.meshes, mats)):
            for vertex in bm.verts:
                x, y, z = vertex.co
                if abs(x) > HALF_WIDTH + 1e-6 or abs(y) > HALF_DEPTH + 1e-6 or z < 0:
                    raise ValueError(f"Vertex outside foundation bounds: {tuple(vertex.co)}")
            bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
            if index == STONE:
                self.unwrap_stone(bm)
            mesh = bpy.data.meshes.new(mat.name)
            bm.to_mesh(mesh)
            bm.free()
            mesh.materials.append(mat)
            obj = bpy.data.objects.new(f"Snow Castle - {mat.name}", mesh)
            bpy.context.scene.collection.objects.link(obj)
            mesh.calc_loop_triangles()
            objects.append(obj)
        return objects

    def unwrap_stone(self, bm):
        for face in bm.faces:
            n = face.normal
            for loop in face.loops:
                x, y, z = loop.vert.co
                if abs(n.z) > .65:
                    u, v = x, y
                elif abs(n.x) > abs(n.y):
                    u, v = y, z
                else:
                    u, v = x, z
                loop[self.uv].uv = (u / 1.7, v / 1.7)


def export(objects, path):
    before = sum(len(obj.data.loop_triangles) for obj in objects)
    if before > 30_000:
        raise ValueError(f"Triangle budget exceeded: {before}")
    path.parent.mkdir(parents=True, exist_ok=True)
    for obj in objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format="GLB", use_selection=True,
        export_apply=True, export_yup=True, export_image_format="JPEG",
        export_jpeg_quality=90, export_materials="EXPORT", export_vertex_color="MATERIAL",
        export_all_vertex_colors=False,
        export_animations=False, export_cameras=False, export_lights=False,
        export_draco_mesh_compression_enable=False,
    )
    size = path.stat().st_size
    if size > 1_500_000:
        raise ValueError(f"GLB byte budget exceeded: {size}")
    print(f"Snow Castle: {before:,} triangles, {size:,} bytes")


def preview(path):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = False
    scene.view_settings.view_transform = "AgX"
    scene.render.resolution_x, scene.render.resolution_y = 1400, 1120
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    world = bpy.data.worlds.new("Winter sky")
    scene.world = world
    world.use_nodes = True
    sky = world.node_tree.nodes["Background"]
    sky.inputs["Color"].default_value = (.30, .42, .63, 1)
    sky.inputs["Strength"].default_value = .38

    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.015))
    bpy.context.object.data.materials.append(material("Preview ground", "385371", .44))

    for name, location, power, color, size in (
        ("Overcast key", (-5, -6, 10), 2050, (.83, .91, 1), 6),
        ("Pale rim", (3, 6, 9), 2450, (.59, .84, 1), 5),
        ("Front fill", (5, -7, 4), 710, (.78, .95, 1), 5),
    ):
        light = bpy.data.lights.new(name, "AREA")
        light.energy, light.color, light.size = power, color, size
        obj = bpy.data.objects.new(name, light)
        scene.collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (-obj.location).to_track_quat("-Z", "Y").to_euler()

    cam = bpy.data.cameras.new("57 degree preview")
    cam.type, cam.ortho_scale = "ORTHO", 11.9
    obj = bpy.data.objects.new(cam.name, cam)
    scene.collection.objects.link(obj)
    target = Vector((0, 0, 2.53))
    elevation, yaw = math.radians(57), math.radians(9)
    offset = Vector((math.cos(elevation) * math.sin(yaw),
                     -math.cos(elevation) * math.cos(yaw), math.sin(elevation))) * 18
    obj.location = target + offset
    obj.rotation_euler = (-offset).to_track_quat("-Z", "Y").to_euler()
    scene.camera = obj
    path.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    with tempfile.TemporaryDirectory(prefix="snow-castle-") as folder:
        castle = Castle().build(materials(Path(folder)))
        export(castle, args.output.resolve())
        if args.preview:
            preview(args.preview.resolve())


if __name__ == "__main__":
    main()
