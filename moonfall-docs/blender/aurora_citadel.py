"""Blender (bpy 4.x/5.x): the owner's Aurora Nexus Citadel (2026-11-24) for the game.
Opens the .blend WITHOUT running its scripts, removes everything that is not a mesh plus the 'Preview*' floor, joins every mesh into one
object (one part per material in the game: 'Glacial Module | Meshy PBR atlas', Ice_Full, Snow, Ice_Crystal, Glow) and exports GLB,
+Y up, the gate toward +Z in glTF (-Y in Blender) = the valley side. Then pack it with moonfall-docs/scripts/pack-aurora-citadel.mjs.

  blender -b --python-exit-code 1 -P moonfall-docs/blender/aurora_citadel.py -- Aurora-Nexus-Citadel.blend citadel_raw.glb
  (or with the bpy module: python3 moonfall-docs/blender/aurora_citadel.py -- in.blend out.glb)"""
import sys
import bpy
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
src, out = argv[0], argv[1]
bpy.context.preferences.filepaths.use_scripts_auto_execute = False
bpy.ops.wm.open_mainfile(filepath=src, load_ui=False, use_scripts=False)
D = bpy.data
for o in list(D.objects):
    if o.type != 'MESH' or o.name.startswith('Preview'):
        D.objects.remove(o, do_unlink=True)
meshes = [o for o in D.objects if o.type == 'MESH']
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
o = bpy.context.view_layer.objects.active
o.name = 'Aurora Nexus Citadel'
print('joined', len(meshes), 'meshes:', len(o.data.polygons), 'polygons,', [m.name for m in o.data.materials])
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True, export_lights=False,
                          export_cameras=False, export_image_format='AUTO', export_draco_mesh_compression_enable=False, use_selection=False)
print('exported', out)
