"""Render the existing boy's head; run manually with Blender --background --python."""
import bpy
import bmesh
import shutil
import subprocess
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / "public/models/spring-boy.glb"))
head_names = {"boy-front-body", "boy-front-eye-left", "boy-front-eye-right"}
for obj in list(bpy.context.scene.objects):
    if obj.name not in head_names:
        bpy.data.objects.remove(obj, do_unlink=True)
head = bpy.data.objects["boy-front-body"]
mesh = bmesh.new()
mesh.from_mesh(head.data)
bmesh.ops.delete(mesh, geom=[v for v in mesh.verts if v.co.z < .90], context="VERTS")
mesh.to_mesh(head.data)
mesh.free()
assert len(head.data.polygons) > 0

atlas = bpy.data.images.load(str(ROOT / "public/textures/Moving_Characters_1.webp"))
for obj in bpy.context.scene.objects:
    material = bpy.data.materials.new(obj.name)
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = atlas
    color = texture.outputs["Color"]
    if obj.data.color_attributes.active_color:
        tint = nodes.new("ShaderNodeVertexColor")
        tint.layer_name = obj.data.color_attributes.active_color.name
        multiply = nodes.new("ShaderNodeMixRGB")
        multiply.blend_type = "MULTIPLY"
        multiply.inputs[0].default_value = 1
        links.new(color, multiply.inputs[1])
        links.new(tint.outputs["Color"], multiply.inputs[2])
        color = multiply.outputs[0]
    emission = nodes.new("ShaderNodeEmission")
    links.new(color, emission.inputs[0])
    output = nodes.new("ShaderNodeOutputMaterial")
    links.new(emission.outputs[0], output.inputs[0])
    obj.data.materials.clear()
    obj.data.materials.append(material)

bpy.ops.object.camera_add(location=(0, -4, 1.36))
camera = bpy.context.object
camera.rotation_euler = Vector((0, 1, 0)).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 1.04
scene = bpy.context.scene
scene.camera = camera
scene.render.engine = "CYCLES"
scene.cycles.samples = 8
scene.render.resolution_x = scene.render.resolution_y = 256
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "WEBP"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.quality = 95
scene.view_settings.view_transform = "Standard"
for smiling in (False, True):
    for name in ("boy-front-eye-left", "boy-front-eye-right"):
        bpy.data.objects[name].scale.z = .12 if smiling else 1
    scene.render.filepath = str(ROOT / f"public/images/loading-boy{'-smile' if smiling else ''}.webp")
    bpy.ops.render.render(write_still=True)

# Keep the loading screen's paper grain with the actual scene backdrop colors.
subprocess.run([shutil.which("python"), "-c", """
from PIL import Image, ImageStat
from pathlib import Path
import sys
root = Path(sys.argv[1])
paper = Image.open(root / 'public/images/white.webp').convert('L')
mean = ImageStat.Stat(paper).mean[0]
for season, color in [('summer', (23,61,85)), ('autumn', (193,132,36))]:
    channels = [paper.point([min(255,round(v*c/mean)) for v in range(256)]) for c in color]
    Image.merge('RGB', channels).save(root / f'public/images/loading-{season}.webp', quality=95, method=6)
for name in ('loading-boy', 'loading-boy-smile'):
    image = Image.open(root / f'public/images/{name}.webp')
    assert image.mode == 'RGBA' and image.getchannel('A').getextrema() == (0,255)
    assert image.getbbox() and image.getbbox()[0] > 0 and image.getbbox()[2] < 256
""", str(ROOT)], check=True)
