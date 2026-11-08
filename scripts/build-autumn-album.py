"""Build a separate golden-autumn sample; never save over upstream assets."""
import bpy
import hashlib
import json
import math
import random
import shutil
import struct
import subprocess
import sys
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from paper_parts import created, parts_of, extract

SOURCE = ROOT / "public/models/Scene_4_Fall-transformed.glb"
PAPER = ROOT / "public/textures/Scene_4_Fall_1.webp"
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == "a87f6c2cf3a14504325d8ee7040082080b52a69f8b8150cafc61f43e27349b4d"
source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
for obj in bpy.context.scene.objects:
    obj.hide_render = True

GOLD = "#c18424"
CREAM = "#ead9b8"
BROWN = "#694225"


def linear_color(hex_color):
    rgb = [int(hex_color[i:i+2], 16) / 255 for i in (1, 3, 5)]
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb) + (1,)


def finish(obj, color):
    obj.hide_render = False
    if not obj.data.uv_layers:
        obj.data.uv_layers.new(name="PaperUV")
    obj.data.uv_layers[0].name = "PaperUV"
    colors = obj.data.color_attributes.new(name="PaperColor", type="FLOAT_COLOR", domain="CORNER")
    for value in colors.data:
        value.color = linear_color(color)
    obj.data.materials.clear()
    obj.data.materials.append(material)
    obj["paper_color"] = color
    return obj


def source_part(suffix, ids, name, color):
    obj = bpy.data.objects["Scene_4_Fall_" + suffix]
    return finish(extract(obj, parts_of(obj), ids, name), color)


def box(name, location, size, color, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new("Paper edge", "BEVEL")
    bevel.width = min(.025, min(size) * .2)
    bevel.segments = 2
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    created.append(obj)
    return finish(obj, color)


def face(name, points, color):
    if (Vector(points[1]) - Vector(points[0])).cross(Vector(points[2]) - Vector(points[0])).z < 0:
        points = list(reversed(points))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points, [], [list(range(len(points)))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    created.append(obj)
    return finish(obj, color)


material = bpy.data.materials.new("Golden paper source")
material.use_nodes = True
nodes, links = material.node_tree.nodes, material.node_tree.links
nodes.clear()
# Repeat a clean paper patch at physical scale rather than stretching it.
uv = nodes.new("ShaderNodeUVMap")
uv.uv_map = "PaperUV"
repeat = nodes.new("ShaderNodeVectorMath")
repeat.operation = "FRACTION"
links.new(uv.outputs[0], repeat.inputs[0])
scale = nodes.new("ShaderNodeVectorMath")
scale.operation = "SCALE"
scale.inputs[3].default_value = .10
links.new(repeat.outputs[0], scale.inputs[0])
offset = nodes.new("ShaderNodeVectorMath")
offset.operation = "ADD"
offset.inputs[1].default_value = (.8, .8, 0)
links.new(scale.outputs[0], offset.inputs[0])
paper = nodes.new("ShaderNodeTexImage")
paper.image = bpy.data.images.load(str(PAPER))
links.new(offset.outputs[0], paper.inputs[0])
channels = nodes.new("ShaderNodeSeparateColor")
links.new(paper.outputs["Color"], channels.inputs[0])
grain = nodes.new("ShaderNodeMath")
grain.operation = "MULTIPLY"
grain.inputs[1].default_value = 1 / .34908
links.new(channels.outputs["Red"], grain.inputs[0])
color = nodes.new("ShaderNodeVertexColor")
color.layer_name = "PaperColor"
multiply = nodes.new("ShaderNodeMixRGB")
multiply.blend_type = "MULTIPLY"
multiply.inputs[0].default_value = 1
links.new(grain.outputs[0], multiply.inputs[1])
links.new(color.outputs["Color"], multiply.inputs[2])
bump = nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = .28
bump.inputs["Distance"].default_value = .035
links.new(grain.outputs[0], bump.inputs["Height"])
light_direction = nodes.new("ShaderNodeVectorMath")
light_direction.operation = "DOT_PRODUCT"
light_direction.inputs[1].default_value = Vector((.45, -.65, .60)).normalized()
links.new(bump.outputs[0], light_direction.inputs[0])
soft_light = nodes.new("ShaderNodeMath")
soft_light.operation = "MULTIPLY_ADD"
soft_light.inputs[1].default_value = .16
soft_light.inputs[2].default_value = .88
links.new(light_direction.outputs["Value"], soft_light.inputs[0])
relief = nodes.new("ShaderNodeMixRGB")
relief.blend_type = "MULTIPLY"
relief.inputs[0].default_value = 1
links.new(multiply.outputs[0], relief.inputs[1])
links.new(soft_light.outputs[0], relief.inputs[2])
ao = nodes.new("ShaderNodeAmbientOcclusion")
ao.inputs["Distance"].default_value = .55
ao.samples = 16
shade = nodes.new("ShaderNodeMixRGB")
shade.blend_type = "MULTIPLY"
shade.inputs[0].default_value = .85
links.new(relief.outputs[0], shade.inputs[1])
links.new(ao.outputs["Color"], shade.inputs[2])
emission = nodes.new("ShaderNodeEmission")
links.new(shade.outputs[0], emission.inputs[0])
output = nodes.new("ShaderNodeOutputMaterial")
links.new(emission.outputs[0], output.inputs[0])

source_part("1_Baked", {0, 1, 2, 3}, "autumn-gold-backdrop", GOLD)
source_part("2_Baked", {0, 1, 2, 10, 68}, "autumn-gold-ground", GOLD)
source_part("3_Baked", {1, 3}, "autumn-moon-frame", "#945e24")
moon = source_part("3_Baked", {6}, "autumn-moon", "#f3d18c")
moon_center = sum((Vector(corner) for corner in moon.bound_box), Vector()) / 8
for vertex in moon.data.vertices:
    vertex.co = moon_center + (vertex.co - moon_center) * .85
for index, (part, yellow) in enumerate([(31, "#f2b51c"), (33, "#efbf2b"), (34, "#e9a515")]):
    source_part("3_Baked", {part}, f"autumn-tree-crown-{index}", yellow)
source_part("3_Baked", {37, 39, 43}, "autumn-tree-trunks", BROWN)

bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=2.35, depth=.03, location=(-2.22, 3.106, -1.1377))
inlay = bpy.context.object
inlay.name = "autumn-ground-inlay"
created.append(inlay)
finish(inlay, GOLD)

# Folded leaves share one mesh per bed, so density does not add runtime draw calls.
floor = next(obj for obj in created if obj.name == "autumn-gold-ground")
rng = random.Random(1108)
leaf_colors = ["#f3bf2c", "#e4a11b", "#cf8615", "#f6ce49", "#ad5e14"]


def leaf_bed(name, center, spread, count):
    vertices, polygons, shades = [], [], []
    accepted = 0
    for _ in range(count):
        x = rng.gauss(center[0], spread[0])
        y = rng.gauss(center[1], spread[1])
        if x > -.45 or y < .25 or x < -12.3 or y > 11.9:
            continue
        # Keep the album platform and its immediate viewing space clear.
        if math.hypot(x + 7, y - 3.5) < 2.05:
            continue
        hit, point, _, _ = floor.ray_cast(Vector((x, y, 2)), Vector((0, 0, -1)))
        if not hit:
            continue
        z = point.z
        if math.hypot(x + 2.22, y - 3.106) < 2.35:
            z = max(z, -1.1227)
        size, angle = rng.uniform(.16, .32), rng.uniform(0, math.tau)
        outline = [(0, -.75), (-.48, -.23), (-.56, .24), (-.28, .68), (0, 1), (.34, .63), (.53, .17), (.42, -.28)]
        leaf_vertices = []
        for u, v in [(0, 0), *outline]:
            leaf_vertices.append((x + size * (u * math.cos(angle) - v * math.sin(angle)),
                                  y + size * (u * math.sin(angle) + v * math.cos(angle)),
                                  z + .018 + (.025 if u == 0 and v == 0 else rng.uniform(0, .008))))
        # Reject leaves crossing a stair edge instead of suspending them over it.
        supported = True
        for px, py, _ in leaf_vertices[1:]:
            hit, surface, _, _ = floor.ray_cast(Vector((px, py, 2)), Vector((0, 0, -1)))
            if not hit or abs(surface.z - point.z) > .10:
                supported = False
                break
        if not supported:
            continue
        start = len(vertices)
        vertices.extend(leaf_vertices)
        color_code = rng.choice(leaf_colors)
        for i in range(8):
            polygons.append((start, start + 1 + (i + 1) % 8, start + 1 + i))
            shades.append(color_code if i < 4 else leaf_colors[max(0, leaf_colors.index(color_code) - 1)])
        accepted += 1
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], polygons)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    created.append(obj)
    finish(obj, leaf_colors[0])
    for polygon, shade_code in zip(mesh.polygons, shades):
        for loop in polygon.loop_indices:
            mesh.color_attributes["PaperColor"].data[loop].color = linear_color(shade_code)
    obj["leaf_count"] = accepted
    assert accepted >= 30, f"Not enough grounded leaves in {name}"


leaf_bed("autumn-leaves-left-tree", (-10.7, 4.9), (1.15, 1.5), 170)
leaf_bed("autumn-leaves-right-trees", (-2.7, 10.3), (1.6, .9), 200)
leaf_bed("autumn-leaves-foreground", (-3.7, 3.4), (2.0, 1.9), 230)

# A slatted paper bench and two small mushrooms anchor the right-hand foreground.
bench_matrix = Matrix.Translation(Vector((-2.7, 10.25, .33))) @ Matrix.Rotation(math.radians(7), 4, "Z")
for i in range(3):
    seat = box(f"autumn-bench-seat-{i}", (0, -.25 + i * .24, .56), (2.1, .19, .065), "#9b5e26")
    seat.matrix_world = bench_matrix @ seat.matrix_world
for i in range(2):
    back = box(f"autumn-bench-back-{i}", (0, .39, .91 + i * .24), (2.1, .06, .18), "#a9692b")
    back.matrix_world = bench_matrix @ back.matrix_world
for side in (-1, 1):
    for y in (-.24, .36):
        leg = box(f"autumn-bench-leg-{side}-{y}", (side * .82, y, .27), (.09, .09, .56), BROWN)
        leg.matrix_world = bench_matrix @ leg.matrix_world
    support = box(f"autumn-bench-support-{side}", (side * .82, .40, .83), (.07, .075, .84), BROWN)
    support.matrix_world = bench_matrix @ support.matrix_world
for i, (x, y, size) in enumerate([(-.95, 7.2, .45), (-1.6, 7.65, .32)]):
    hit, point, _, _ = floor.ray_cast(Vector((x, y, 2)), Vector((0, 0, -1)))
    assert hit
    transform = Matrix.Translation(Vector((x, y, point.z))) @ Matrix.Rotation(math.radians(18), 4, "Z")
    stem = box(f"autumn-mushroom-stem-{i}", (0, 0, size * .40), (size * .24, .035, size * .8), CREAM)
    stem.matrix_world = transform @ stem.matrix_world
    cap = face(f"autumn-mushroom-cap-{i}", [(size * u, -.03, size * v) for u, v in [(.75, .65), (.48, 1.03), (.1, 1.24), (-.29, 1.18), (-.6, .95), (-.75, .65)]], "#b97a32" if i == 0 else "#d79b3d")
    cap.matrix_world = transform

# A low album stand stays inside the original circular walking route.
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=1.85, depth=.28, location=(-7.0, 3.5, -1.0127))
stand = bpy.context.object
stand.name = "autumn-album-stand"
created.append(stand)
finish(stand, "#a97028")
tilt = math.radians(46)
album_matrix = Matrix.Translation(Vector((-7, 3.5, -.79))) @ Matrix.Rotation(math.radians(30), 4, "Z") @ Matrix.Rotation(tilt, 4, "X")
for side in (-1, 1):
    for layer, (z, color_code) in enumerate([(.02, BROWN), (.065, CREAM), (.09, "#f0e2c5"), (.115, "#f3e5c9")]):
        name = f"autumn-album-{'left' if side < 0 else 'right'}-{layer}"
        size = (1.49, 1.86, .035) if layer == 0 else (1.42, 1.78, .035)
        obj = box(name, (side * .72, 0, z), size, color_code, (0, side * math.radians(-5), 0))
        obj.matrix_world = album_matrix @ obj.matrix_world
    for x, y in [(side * .18, -.65), (side * 1.22, -.65), (side * .18, .65), (side * 1.22, .65)]:
        points = [(px, py, .135 - math.tan(side * math.radians(-5)) * (px - side * .72))
                  for px, py in [(x, y), (x + side * .16, y), (x, y - math.copysign(.16, y))]]
        obj = face(f"autumn-album-corner-{side}-{x}-{y}", points, "#c7a46d")
        obj.matrix_world = album_matrix
spine = box("autumn-album-spine", (0, 0, .07), (.08, 1.81, .09), "#a77b49")
spine.matrix_world = album_matrix @ spine.matrix_world

# One independent insert demonstrates photo replacement without rebaking the set.
angle = math.radians(22)
frame_matrix = Matrix.Translation(Vector((-4.9, 11.55, 4.35))) @ Matrix.Rotation(angle, 4, "Z")
frame = box("autumn-photo-frame", (0, .05, 0), (2.25, .09, 1.64), CREAM)
frame.matrix_world = frame_matrix @ frame.matrix_world
insert = face("autumn-photo-insert", [(-.97, -.01, -.62), (.97, -.01, -.62), (.97, -.01, .62), (-.97, -.01, .62)], "#ded5c5")
insert.matrix_world = frame_matrix
insert["placeholder"] = True
insert["replaceable_photo"] = True
photo_uv = [(0, 0), (1, 0), (1, 1), (0, 1)]
clip = box("autumn-photo-clip", (0, -.08, .86), (.19, .08, .31), "#b78a4c")
clip.matrix_world = frame_matrix @ clip.matrix_world

# A small folded camera mark makes the blank insert read as a placeholder.
mark = box("autumn-photo-placeholder-body", (0, -.027, -.01), (.50, .012, .30), "#b3a183")
mark.matrix_world = frame_matrix @ mark.matrix_world
top = box("autumn-photo-placeholder-top", (-.10, -.028, .17), (.17, .012, .08), "#b3a183")
top.matrix_world = frame_matrix @ top.matrix_world
bpy.ops.mesh.primitive_circle_add(vertices=32, radius=.105, fill_type="NGON", location=(0, -.04, -.01), rotation=(math.pi/2, 0, 0))
lens = bpy.context.object
lens.name = "autumn-photo-placeholder-lens"
lens.matrix_world = frame_matrix @ lens.matrix_world
created.append(lens)
finish(lens, "#ded5c5")

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 16
scene.world = bpy.data.worlds.new("Autumn bake world")
bpy.ops.object.select_all(action="DESELECT")
for obj in created:
    obj.select_set(True)
    obj.data.uv_layers.active_index = 0
bpy.context.view_layer.objects.active = created[0]
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.cube_project(cube_size=1.5, correct_aspect=False, clip_to_bounds=False, scale_to_bounds=False)
bpy.ops.object.mode_set(mode="OBJECT")
for obj in created:
    obj.data.uv_layers.new(name="BakedUV")
    obj.data.uv_layers.active_index = 1
bpy.context.view_layer.objects.active = created[0]
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.006)
bpy.ops.object.mode_set(mode="OBJECT")
atlas = bpy.data.images.new("autumn-album-sample", width=2048, height=2048, alpha=False)
bake = nodes.new("ShaderNodeTexImage")
bake.image = atlas
nodes.active = bake
scene.render.bake.use_clear = True
bpy.ops.object.bake(type="EMIT", margin=6)
png = ROOT / ".tmp/autumn-album-bake.png"
png.parent.mkdir(parents=True, exist_ok=True)
atlas.filepath_raw = str(png)
atlas.file_format = "PNG"
atlas.save()
texture = ROOT / "public/textures/autumn-album-sample.webp"
subprocess.run([shutil.which("python"), "-c", "from PIL import Image; import sys; Image.open(sys.argv[1]).save(sys.argv[2],quality=94,method=6)", str(png), str(texture)], check=True)
for obj in created:
    obj.data.uv_layers.remove(obj.data.uv_layers["PaperUV"])
    obj.data.uv_layers[0].name = "UVMap"
    if obj == insert:
        uv = obj.data.uv_layers.new(name="PhotoUV")
        for loop in obj.data.loops:
            uv.data[loop.index].uv = photo_uv[loop.vertex_index]
        obj["photo_uv_channel"] = 1
    obj.data.uv_layers.active_index = 0
    obj.data.uv_layers[0].active_render = True
    obj.data.materials.clear()
bpy.ops.export_scene.gltf(filepath=str(ROOT / "public/models/autumn-album-sample.glb"), export_format="GLB", use_selection=True, export_materials="NONE", export_texcoords=True, export_extras=True, export_vertex_color="NONE")
data = (ROOT / "public/models/autumn-album-sample.glb").read_bytes()
doc = json.loads(data[20:20 + struct.unpack_from("<I", data, 12)[0]])
assert len(doc["meshes"]) == len(created) and not doc.get("images")
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == source_hash
print(f"Autumn sample: {len(created)} independent meshes, {len(data)} model bytes, {texture.stat().st_size} texture bytes; originals unchanged")
