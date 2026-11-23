"""Build the Snow Queen's castle with Blender 4.2+ (or the bpy module).

blender -b -P moonfall-docs/blender/snow_castle.py -- snow-castle.glb [--stairs snow-stairs.glb] [--preview preview.png] [--blend scene.blend]

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


GLACIER, ICE, SNOW, GLOW, TRIM = range(5)
HALF_WIDTH, HALF_DEPTH = 7.8, 5.5
FLOOR = 0.306
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


def glacier_image(folder):
    """Bake layered blue ice, flow bands and white stress fractures into a tileable JPEG."""
    size = 512
    rng = np.random.default_rng(SEED)
    u, v = np.meshgrid(np.arange(size) * math.tau / size,
                       np.arange(size) * math.tau / size)
    flow = v + .54 * np.sin(2 * u + v) + .24 * np.sin(5 * u - 2 * v)
    bend = u + .43 * np.sin(2 * v - u) + .08 * np.sin(9 * u + v)
    veins = np.maximum(0, np.cos(5 * flow + u)) ** 16
    mist = .50 * np.sin(flow + u) + .39 * np.sin(3 * u - flow * 3)
    hairline = np.maximum(0, np.cos(3 * bend - 2 * v + .47 * np.sin(flow * 5))) ** 48
    density = (.5 + .5 * np.cos(u * 2 + flow * 2)) ** 1.5
    detail = np.sin(23 * u + 7 * flow) * 1.5 + rng.normal(0, 1, u.shape)
    tone = 22 * mist + 13 * veins + 30 * hairline * density + detail
    rgb = np.clip((tone[..., None] + np.array([42, 114, 175])) / 255, 0, 1)
    pixels = np.concatenate((rgb, np.ones((size, size, 1))), axis=2)
    image = bpy.data.images.new("Glacier ice", size, size, alpha=False)
    image.pixels.foreach_set(pixels.astype(np.float32).ravel())
    path = folder / "glacier-ice.jpg"
    image.filepath_raw = str(path)
    image.file_format = "JPEG"
    image.save()
    baked = bpy.data.images.load(str(path))
    baked.pack()
    bpy.data.images.remove(image)
    return baked


def materials(folder):
    mats = [
        material("Glacier_Ice", "ffffff", .26, emission="153d66", strength=.19),
        material("Ice_Crystal", "55b4f9", .12, emission="1766a9", strength=.32),
        material("Snow", "e2eefb", .95),
        material("Glow", "113450", .48, emission="7fe4ff", strength=1.20),
        material("Deep_Ice", "294f80", .24, emission="172f50", strength=.14),
    ]
    for i in (GLACIER, ICE, TRIM):
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
        if i == GLACIER:
            tex = nodes.new("ShaderNodeTexImage")
            tex.image = glacier_image(folder)
            links.new(tex.outputs["Color"], multiply.inputs[6])
    return mats


class Castle:
    def __init__(self):
        self.meshes = [bmesh.new() for _ in range(5)]
        self.rng = random.Random(SEED)
        self.tints = {i: self.meshes[i].loops.layers.color.new("Patina")
                      for i in (GLACIER, ICE, TRIM)}
        self.uv = self.meshes[GLACIER].loops.layers.uv.new("Glacier UV")

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

    def box(self, x, y, low, w, d, high, mat=GLACIER, bevel=.025, shade=1.0, angle=0):
        b = min(bevel, w / 4, d / 4, (high - low) / 3)
        c, s = math.cos(angle), math.sin(angle)
        rings = []
        levels = ((low, b), (low + b, 0), (high - b, 0), (high, b)) if b else ((low, 0), (high, 0))
        for z, inset in levels:
            a, t = w / 2 - inset, d / 2 - inset
            rings.append([(x + c * u - s * v, y + s * u + c * v, z)
                          for u, v in ((-a, -t), (a, -t), (a, t), (-a, t))])
        self.solid(rings, mat, shade)

    def round(self, x, y, profiles, mat=GLACIER, sides=12, phase=math.pi / 12, shade=1.0):
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
        self.box(x, y, z - .086, width + .23, .17, z - .035, GLACIER, bevel=0, angle=angle)

    def foundation(self):
        # Chamfered ice slab. The top sits just above the terrain collision plane.
        def perimeter(w, d, chamfer, z):
            return [(x, y, z) for x, y in (
                (-w + chamfer, -d), (w - chamfer, -d), (w, -d + chamfer),
                (w, d - chamfer), (w - chamfer, d), (-w + chamfer, d),
                (-w, d - chamfer), (-w, -d + chamfer),
            )]

        self.solid([perimeter(w, d, c, z) for w, d, c, z in
                    ((7.65, 5.37, .56, 0), (7.80, 5.50, .50, .12),
                     (7.67, 5.36, .55, .28), (7.54, 5.24, .60, FLOOR))], GLACIER, .97)
        # Cracks and the floor's engraved six-point court seal are flush inlays.
        self.sigil(0, -.24, 2.42, .034, GLACIER, .53)
        for sign in (-1, 1):
            self.sigil(sign * 3.75, -.55, 1.55, .027, ICE, .44)
            for y in (-4.37, -3.89, -3.38):
                self.floor_line((sign * 1.62, y), (sign * 1.62, y + .27), .046, ICE)
        for x, y, angle in ((-6, -3.7, .4), (5.82, -3.05, 2.4), (-5.61, 2.54, -.9), (5.82, 2.33, 3.6)):
            for i in range(4):
                length = self.rng.uniform(.49, 1.04)
                end = x + math.cos(angle) * length, y + math.sin(angle) * length
                self.floor_line((x, y), end, .025 - i * .004, TRIM)
                x, y = end
                angle += self.rng.uniform(-.7, .7)

    def floor_line(self, a, b, width, mat, shade=.74):
        dx, dy = b[0] - a[0], b[1] - a[1]
        self.box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, FLOOR - .003,
                 math.hypot(dx, dy) + width * .40, width, FLOOR + .005,
                 mat, 0, shade, math.atan2(dy, dx))

    def sigil(self, x, y, radius, width, mat, shade):
        def polar(angle, r):
            return x + math.cos(angle) * r, y + math.sin(angle) * r

        for i in range(24):
            a, b = ((i + k) * math.tau / 24 for k in (0, 1))
            self.floor_line(polar(a, radius), polar(b, radius), width, mat, shade)
        for i in range(6):
            a = i * math.tau / 6
            self.floor_line(polar(a, radius * .21), polar(a, radius * .9), width * 1.55, mat, shade)
            for off in (-.29, .29):
                self.floor_line(polar(a, radius * .57), polar(a + off, radius * .74), width, mat, shade)

    def wall(self, a, b, width, height):
        """A continuous glacial slab with stepped ice ribs and an irregular crown."""
        dx, dy = b[0] - a[0], b[1] - a[1]
        length, angle = math.hypot(dx, dy), math.atan2(dy, dx)
        x, y = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        self.box(x, y, FLOOR - .10, length, width, height, GLACIER, .12, .83, angle)
        self.box(x, y, FLOOR, length, width + .14, .66, TRIM, .075, .82, angle)
        self.box(x, y, height - .24, length, width + .08, height - .10, ICE, .05, .69, angle)
        n = max(3, round(length / .84))
        c, s = math.cos(angle), math.sin(angle)
        for i in range(n):
            along = (i - (n - 1) / 2) * length / n
            cx, cy = x + c * along, y + s * along
            h = self.rng.uniform(.36, .79)
            self.crystal((cx, cy, height - .20), (-s * .12, c * .12, 1),
                         h, width * .43, roof=True, shade=self.rng.uniform(.61, .99))
            self.box(cx, cy, .64, .16, width + .04, height - .25, ICE, .035, .67, angle)
            if i % 3 == 1:
                self.drift(cx, cy, height - .08, .55, width * .89, .09, angle)
                self.icicles(cx + s * width * .57, cy - c * width * .57, height - .16, 2, .18, angle)

    def tower(self, x, y, radius, eave, peak):
        self.round(x, y, [(FLOOR, radius * 1.02), (.74, radius), (1.03, radius * .79),
                          (eave - .30, radius * .64), (eave, radius * .72)],
                   GLACIER, sides=8, phase=math.pi / 8, shade=.77)
        self.round(x, y, [(eave - .31, radius * .67), (eave - .17, radius * .82),
                          (eave + .09, radius * .76)], ICE, sides=8, shade=.81)
        for i in range(4):
            angle = i * math.pi / 2
            dx, dy = math.sin(angle), -math.cos(angle)
            self.crystal((x + dx * radius * .60, y + dy * radius * .60, .67),
                         (-dx * .07, -dy * .07, 1), eave - .67, radius * .29, shade=.78)
            self.window(x + dx * radius * .62, y + dy * radius * .62, eave - 1.15, .13, .54, angle)
        self.crystal((x, y, eave - .04), (math.copysign(.11, x), .045, 1),
                     peak - eave, radius * .72, roof=True)
        self.crystal((x - .28, y + .09, eave), (-.21, .14, 1),
                     (peak - eave) * .67, radius * .32, shade=.64)
        self.drift(x, y - radius * .45, eave, radius * 1.03, radius * .54, .13)
        self.icicles(x, y - radius * .68, eave - .12, 4, radius * .24)

    def gatehouse(self):
        front, back = -5.14, -4.39
        spring, opening, rise = 1.64, 2.11, 2.30
        for sign in (-1, 1):
            x = sign * 2.59
            self.box(x, -4.76, FLOOR, .93, 1.18, 3.57, GLACIER, .16, .92)
            self.box(x, -4.76, FLOOR, 1.08, 1.31, .77, TRIM, .11)
            self.crystal((x, -4.64, 3.33), (sign * .17, .10, 1), 2.38, .60, roof=True, shade=.97)
            self.crystal((x + sign * .27, -4.65, 3.01), (sign * .34, .02, 1),
                         1.88, .39, shade=.71)
            self.window(x, -5.32, 1.91, .24, .85)
            self.icicles(x, -5.25, 3.50, 5, .15)
            self.cluster(sign * 3.28, -4.94, .40, sign * .4, -.22, 1.23)

            def point(t, outer=0):
                # The two curves meet at a Gothic point above the open path.
                return (sign * (opening * (1 - t ** 1.55) + outer * (1 - t)),
                        spring + rise * t + outer * t)

            for i in range(9):
                a, b = i / 9, (i + 1) / 9
                self.relief((point(a), point(a, .55), point(b, .55), point(b)),
                            front, back, GLACIER, .90 if i % 2 else 1)
                self.relief((point(a, .026), point(a, .071), point(b, .071), point(b, .026)),
                            front - .026, front + .023, ICE)
            self.box(sign * 2.115, -4.77, FLOOR, .125, .72, spring + .09, ICE, .018, .82)
        # Suspended crystal crest clears the opening below.
        self.relief([(0, 4.52), (.40, 4.13), (0, 3.80), (-.40, 4.13)], -5.27, -4.91, TRIM)
        self.relief([(0, 4.44), (.13, 4.14), (0, 3.92), (-.13, 4.14)], -5.289, -5.25, GLOW)
        self.crystal((0, -4.73, 4.31), (0, .04, 1), 1.07, .25, shade=.91)

    def keep(self):
        # Rear wall and crystal crown are the backdrop for the playable throne hall.
        self.box(0, 4.90, FLOOR, 8.84, .85, 4.44, GLACIER, .23, .74)
        self.box(0, 4.27, 4.21, 8.45, 1.72, 4.58, ICE, .11, .57)
        self.relief([(-1.71, 3.04), (0, 3.83), (1.71, 3.04), (1.71, 4.39), (-1.71, 4.39)],
                    3.92, 4.62, GLACIER, .89)
        for sign in (-1, 1):
            self.box(sign * 3.06, 4.44, FLOOR, 2.72, 1.78, 4.41, GLACIER, .23, .88)
            self.box(sign * 3.10, 4.30, .40, 2.94, 1.44, .83, TRIM, .105)
            for x, h, r in ((1.93, 4.66, .52), (2.95, 4.24, .66), (4.08, 3.73, .64)):
                x *= sign
                self.crystal((x, 3.87, .54), (sign * .017, .064, 1), h, r, shade=.65)
                self.window(x, 3.45, 2.47, .15, 1.09)
            self.tower(sign * 4.91, 4.32, .85, 4.64, 7.21)
            self.crystal((sign * 2.65, 4.31, 4.32), (sign * .35, .08, 1), 3.63, .67, shade=.75)
            self.crystal((sign * 1.24, 4.15, 4.58), (sign * .31, -.09, 1), 4.42, .80, shade=.83)
            self.crystal((sign * .65, 4.40, 4.58), (sign * .09, .04, 1), 3.49, .53, shade=.58)
        self.crystal((0, 4.28, 4.39), (.023, .05, 1), 5.29, 1.08, shade=.92)
        self.icicles(0, 3.94, 4.28, 11, .36)

        # The throne seat and fan stay behind the boss spawn and off the combat floor.
        self.box(0, 3.42, FLOOR, 2.98, .70, .62, TRIM, .085)
        self.box(0, 3.53, .54, 2.31, .69, .80, GLACIER, .10, .95)
        self.box(0, 3.63, .74, 1.40, .65, 1.23, ICE, .13, .81)
        self.box(0, 3.96, 1.01, 1.48, .42, 2.18, TRIM, .09)
        for sign in (-1, 1):
            self.box(sign * .77, 3.64, .85, .31, .60, 1.58, ICE, .09)
            for off, tilt, h, r in ((.34, .28, 2.49, .28), (.58, .60, 1.88, .27),
                                     (.75, .78, 1.36, .24)):
                self.crystal((sign * off, 3.92, .94), (sign * tilt, .09, 1), h, r, shade=.81)
        self.crystal((0, 3.95, 1.11), (.04, .18, 1), 2.40, .38, shade=.97)
        self.relief([(0, 2.54), (.15, 2.21), (0, 1.88), (-.15, 2.21)], 3.687, 3.75, GLOW)
        for sign in (-1, 1):
            self.drift(sign * 4.00, 4.53, 4.56, .90, .60, .11)

    def architecture(self):
        self.foundation()
        for sign in (-1, 1):
            self.wall((sign * 2.63, -4.77), (sign * 6.72, -4.77), .62, 2.17)
            self.wall((sign * 6.72, -4.77), (sign * 6.72, 4.09), .57, 2.08)
            self.wall((sign * 6.72, 4.15), (sign * 4.11, 4.15), .72, 2.78)
            for y, eave, peak in ((-4.17, 3.20, 5.21), (4.11, 4.08, 6.33)):
                self.tower(sign * 6.70, y, .91, eave, peak)
            # Split pillars with low, snow-dusted connecting ice on the outer walls.
            for y in (-2.28, .48, 2.66):
                self.crystal((sign * 6.94, y, .46), (-sign * .09, .13, 1),
                             self.rng.uniform(1.85, 2.57), .56, shade=.63)
                self.drift(sign * 7.12, y, FLOOR, .87, .86, .16)
        self.gatehouse()
        self.keep()

    def stairway(self):
        # 5 m of run and 2.40 m of rise matching fortStair. -Y is the valley.
        n, run, rise = 28, 5.0, 2.40
        for i in range(n):
            y0, y1 = -run / 2 + i * run / n, -run / 2 + (i + 1) * run / n
            top = rise * (i + 1) / n
            self.box(0, (y0 + y1) / 2, 0, 2.99, y1 - y0,
                     top, GLACIER, .007, .65 + .30 * self.rng.random())
            self.box(0, y0 + .023, top - .031, 2.95, .043, top + .006, ICE, .008, .59)
            for sign in (-1, 1):
                if i % 4 == 1:
                    self.box(sign * 1.13, y0 + .049, top - .008, .224, .037, top + .009, ICE, .006)
        for sign in (-1, 1):
            x, half = sign * 1.40, .17
            for mat, lower, upper in ((TRIM, -.02, .27), (GLACIER, .24, .47), (ICE, .45, .53)):
                self.solid([[(x - half, y, max(0, h + lower)), (x + half, y, max(0, h + lower)),
                             (x + half, y, h + upper), (x - half, y, h + upper)]
                            for y, h in ((-2.5, 0), (2.5, rise))], mat)
            for i, y in enumerate((-2.22, -1.19, 0, 1.16, 2.28)):
                z = (y + 2.5) * rise / run
                self.box(x, y, z + .10, .42, .38, z + .61, GLACIER, .05)
                self.crystal((x, y, z + .50), (sign * .10, .07, 1),
                             .60 if i in (0, 4) else .39, .18, shade=.87)
                if i in (0, 4):
                    self.window(x, y - .188, z + .24, .085, .25)
                else:
                    self.drift(x, y + .13, z + .59, .38, .37, .075)

    def build(self, mats, *, stairs=False):
        if stairs:
            self.stairway()
        else:
            self.architecture()
        width, depth = (1.65, 2.5) if stairs else (HALF_WIDTH, HALF_DEPTH)
        objects = []
        for index, (bm, mat) in enumerate(zip(self.meshes, mats)):
            for vertex in bm.verts:
                x, y, z = vertex.co
                if abs(x) > width + 1e-6 or abs(y) > depth + 1e-6 or z < 0:
                    raise ValueError(f"Vertex outside foundation bounds: {tuple(vertex.co)}")
            bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
            if index == GLACIER:
                self.unwrap_glacier(bm)
            mesh = bpy.data.meshes.new(mat.name)
            bm.to_mesh(mesh)
            bm.free()
            mesh.materials.append(mat)
            name = "Frozen Stair" if stairs else "Snow Castle"
            obj = bpy.data.objects.new(f"{name} - {mat.name}", mesh)
            bpy.context.scene.collection.objects.link(obj)
            mesh.calc_loop_triangles()
            objects.append(obj)
        return objects

    def unwrap_glacier(self, bm):
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
                tile = 5.8 if abs(n.z) > .65 else 3.7
                loop[self.uv].uv = (u / tile, v / tile)


def export(objects, path):
    before = sum(len(obj.data.loop_triangles) for obj in objects)
    if before > 30_000:
        raise ValueError(f"Triangle budget exceeded: {before}")
    path.parent.mkdir(parents=True, exist_ok=True)
    for obj in bpy.context.scene.objects:
        obj.select_set(obj in objects)
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
    print(f"{path.name}: {before:,} triangles, {size:,} bytes")


def stage(castle, stairs):
    """Position the two exports for an editable scene or a combined preview."""
    if not stairs:
        return
    for obj in castle:
        obj.location.z = 2.10
    for obj in stairs:
        obj.location.y = -12.40
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -1.2, 1.17))
    cliff = bpy.context.object
    cliff.name = "Preview plateau"
    cliff.dimensions = (17.25, 17.4, 2.34)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = cliff.modifiers.new("Plateau edge", "BEVEL")
    bevel.width = .28
    bevel.segments = 2
    cliff.data.materials.append(material("Preview cliff", "254669", .76))


def preview(path, *, stairs=False):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = False
    scene.view_settings.view_transform = "AgX"
    scene.render.resolution_x, scene.render.resolution_y = (1430, 1480) if stairs else (1430, 1160)
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
    cam.type, cam.ortho_scale = "ORTHO", 24.9 if stairs else 20.3
    obj = bpy.data.objects.new(cam.name, cam)
    scene.collection.objects.link(obj)
    target = Vector((0, -3.45 if stairs else -.70, 1.72 if stairs else 2.95))
    elevation, yaw = math.radians(57), math.radians(14)
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
    parser.add_argument("--stairs", type=Path, help="also export the separate valley staircase GLB")
    parser.add_argument("--preview", type=Path)
    parser.add_argument("--blend", type=Path, help="save an editable Blender scene")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    with tempfile.TemporaryDirectory(prefix="snow-castle-") as folder:
        mats = materials(Path(folder))
        castle = Castle().build(mats)
        export(castle, args.output.resolve())
        steps = Castle().build(mats, stairs=True) if args.stairs else []
        if steps:
            export(steps, args.stairs.resolve())
        if args.preview or args.blend:
            stage(castle, steps)
        if args.preview:
            preview(args.preview.resolve(), stairs=bool(steps))
        if args.blend:
            bpy.context.preferences.filepaths.save_version = 0
            args.blend.resolve().parent.mkdir(parents=True, exist_ok=True)
            if bpy.context.scene.camera:
                for screen in bpy.data.screens:
                    for area in screen.areas:
                        if area.type == "VIEW_3D":
                            area.spaces.active.region_3d.view_perspective = "CAMERA"
            bpy.ops.wm.save_as_mainfile(filepath=str(args.blend.resolve()))


if __name__ == "__main__":
    main()
