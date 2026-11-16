"""Keep the winter paper world; warm its cabin and add a lower-terrace mailbox."""
import bpy
import hashlib
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from paper_parts import created, extract, parts_of

SOURCE = ROOT / "public/models/Scene_1_Winter-transformed.glb"
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == "8153fb3039a434ec3f98d057b53ad42da19ba2c0f6c7467fa950d0225d42435b"
originals = [SOURCE] + [ROOT / f"public/textures/Scene_1_Winter_{i}.webp" for i in range(1, 5)]
hashes = {path: hashlib.sha256(path.read_bytes()).hexdigest() for path in originals}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
sources = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == "MESH"}
parts = {name: parts_of(obj) for name, obj in sources.items()}
scenery = sources["Scene_1_Winter_2_Baked"]
wood = {96, 97, 98, 99, 100, 109, 112, 113, 121, 126, 127, 128, 130, 131, 132}
motions = {
    "Deer_Head": "deer", "Fire_Inner_Most": "fire-inner",
    "Fire_Center": "fire-center", "Fire_Outer": "fire-outer",
    "Note_1": "note-1", "Note_2": "note-2", "Note_3": "note-3",
    "snowman-arm": "snowman-right", "Bird_Baked-snowman-arm-left": "snowman-left",
}
for name, source in sources.items():
    if any(word in name for word in ("Chat_Box", "Hello_Text", "Thanks_Baked", "Welcome_Baked", "Mail_box_stick", "mail_box_red", "Baked_mailbox")):
        continue
    keep = set(range(len(parts[name])))
    if source == scenery:
        # Remove old author lettering, its hanger, the icicles, and the cold window.
        keep -= set(range(12)) | set(range(15, 39)) | wood | {116}
    suffix = name.removeprefix("Scene_1_Winter_3_")
    motion = motions.get(suffix)
    obj = extract(source, parts[name], keep, "winter-" + name,
                  pivot=source.location if motion else None)
    obj["original_node"] = name
    obj["atlas"] = 1 if "_1_Baked" in name else 2 if "_2_Baked" in name else 4 if "_4_Baked" in name else 3
    if motion:
        obj["motion"] = motion
    if "_1_Baked" in name or "_4_Baked" in name:
        obj["surface_gain"] = [1, 1, 1] if "_1_Baked" in name else [1.3034, 1.47521, 1.36647]

cabin = extract(scenery, parts[scenery.name], wood, "winter-cabin-wood")
cabin["atlas"], cabin["warm_wood"] = 2, True
cabin["wood_gain"] = [2.3, 1.75, 1.05]
floor = next(obj for obj in created if obj.name == "winter-Scene_1_Winter_4_Baked")


def finish(obj, color):
    obj["atlas"], obj["paper_tint"] = 4, color
    uv = obj.data.uv_layers.new(name="UVMap")
    for loop in obj.data.loops:
        point = obj.data.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (.30 + point.x * .015 % .06, .60 + point.z * .015 % .06)
    created.append(obj)
    return obj


def box(name, center, size, color, transform):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.name, obj.scale = name, size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for uv in list(obj.data.uv_layers):
        obj.data.uv_layers.remove(uv)
    obj.matrix_world = transform @ obj.matrix_world
    return finish(obj, color)


def panel(name, outline, color, transform):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([(x, 0, z) for x, z in outline], [], [list(range(len(outline)))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.matrix_world = transform
    return finish(obj, color)


def facade(part):
    points = [scenery.matrix_world @ scenery.data.vertices[i].co for i in parts[scenery.name][part]["vertices"]]
    # A window/door is a thin vertical paper plane; its longest XY edge gives its width.
    pairs = [(a, b) for a in points for b in points if abs(a.z-b.z) < .01]
    a, b = max(pairs, key=lambda pair: (pair[1]-pair[0]).length_squared)
    tangent = (b-a).normalized()
    normal = Vector((tangent.y, -tangent.x, 0)).normalized()
    center = sum(points, Vector()) / len(points)
    if normal.dot(center) > 0:
        tangent, normal = -tangent, -normal
    front = max(point.dot(normal) for point in points)
    center += normal * (front-center.dot(normal)+.018)
    angle = math.atan2(tangent.y, tangent.x)
    return center, Matrix.Rotation(angle, 4, "Z")


# Warm window replaces the old pane at its real facade, without a bloom halo.
window_center, window_rotation = facade(116)
window_matrix = Matrix.Translation(window_center) @ window_rotation
box("winter-cabin-window-light", (0, 0, 0), (.64, .025, .64), "#ffd28c", window_matrix)
for side in (-1, 1):
    box(f"winter-cabin-window-side-{side}", (side*.36, -.025, 0), (.07, .05, .78), "#955f38", window_matrix)
    box(f"winter-cabin-window-rail-{side}", (0, -.025, side*.36), (.78, .05, .07), "#955f38", window_matrix)
box("winter-cabin-window-cross-x", (0, -.042, 0), (.045, .035, .67), "#a36c3d", window_matrix)
box("winter-cabin-window-cross-z", (0, -.042, 0), (.67, .035, .045), "#a36c3d", window_matrix)
box("winter-cabin-window-sill", (0, -.09, -.41), (.88, .22, .07), "#bb8550", window_matrix)

door_center, door_rotation = facade(121)
lamp_matrix = Matrix.Translation(door_center) @ door_rotation @ Matrix.Translation((.46, -.14, .56))
box("winter-cabin-lamp-back", (0, 0, 0), (.29, .06, .40), "#745032", lamp_matrix)
box("winter-cabin-lamp-light", (0, -.04, 0), (.20, .035, .29), "#ffdb99", lamp_matrix)
box("winter-cabin-lamp-cap", (0, -.04, .24), (.35, .15, .07), "#815238", lamp_matrix)
box("winter-cabin-lamp-bracket", (0, .06, .28), (.05, .25, .055), "#815238", lamp_matrix)

# The mailbox stands on the lowest terrace, inside the character's outer route.
hit, mailbox_root, _, _ = floor.ray_cast(Vector((4.0, 7.0, 10)), Vector((0, 0, -1)))
assert hit and mailbox_root.z < -1.1, "Mailbox must sit below the stairs"
mail_matrix = Matrix.Translation(mailbox_root) @ Matrix.Rotation(-math.atan2(4.0, 7.0), 4, "Z") @ Matrix.Diagonal((1.4,1.4,1.4,1))
post = box("winter-mailbox-post", (0, .02, .35), (.13, .10, .70), "#9c7049", mail_matrix)
post["grounded"] = True
for vertex in post.data.vertices:
    point = post.matrix_world @ vertex.co
    hit, support, _, _ = floor.ray_cast(Vector((point.x,point.y,10)),Vector((0,0,-1)))
    assert hit and abs(support.z-mailbox_root.z) < .02, "Keep the post clear of stair edges"
outline = [(-.70,.55),(.70,.55)] + [(.70*math.cos(i*math.pi/16),1.20+.48*math.sin(i*math.pi/16)) for i in range(17)]
body = panel("winter-mailbox-body", outline, "#a65643", mail_matrix)
body["mailbox_root"] = [mailbox_root.x, mailbox_root.z, -mailbox_root.y]
box("winter-mailbox-slot", (0, -.025, 1.33), (.77, .04, .065), "#613a2d", mail_matrix)
label = panel("winter-contact-label", [(-.62,.70),(.62,.70),(.62,1.09),(-.62,1.09)], "#ead9b8",
              mail_matrix @ Matrix.Translation((0,-.035,0)))
label["atlas"], label["text"] = "contact", "contact me"
for loop in label.data.loops:
    label.data.uv_layers[0].data[loop.index].uv = [(0,0),(1,0),(1,1),(0,1)][loop.vertex_index]
letter = panel("winter-mailbox-envelope", [(-.21,0),(.21,0),(.21,.25),(-.21,.25)], "#f1dfba",
               mail_matrix @ Matrix.Translation((.04,-.055,1.29)) @ Matrix.Rotation(math.radians(-7),4,"Y"))
panel("winter-mailbox-envelope-flap", [(-.21,.25),(0,.11),(.21,.25)], "#d4b791", letter.matrix_world @ Matrix.Translation((0,-.008,0)))

label_path = ROOT / "public/textures/winter-contact-label.webp"
subprocess.run([shutil.which("python"), "-c", "from PIL import Image,ImageDraw,ImageFont; import sys; im=Image.new('RGB',(1024,320),'#ead9b8'); d=ImageDraw.Draw(im); f=ImageFont.truetype(sys.argv[1],174); d.text((512,160),'contact me',font=f,fill='#593c2c',anchor='mm'); im.save(sys.argv[2],lossless=True,method=6)", str(ROOT/"public/fonts/SlimeBox.woff"), str(label_path)], check=True)

# Bake one world-space paper material across all existing wall UV islands.
for source in sources.values():
    source.hide_render = True
wall = next(obj for obj in created if obj.name == "winter-Scene_1_Winter_1_Baked")
wall.data.materials.clear()
material = bpy.data.materials.new("Continuous snow-white winter paper")
material.use_nodes = True
wall.data.materials.append(material)
nodes, links = material.node_tree.nodes, material.node_tree.links
nodes.clear()
geometry = nodes.new("ShaderNodeNewGeometry")
noise = nodes.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 85
noise.inputs["Detail"].default_value = 2
links.new(geometry.outputs["Position"], noise.inputs["Vector"])
grain = nodes.new("ShaderNodeMapRange")
grain.inputs["To Min"].default_value = .97
grain.inputs["To Max"].default_value = 1.03
links.new(noise.outputs["Fac"], grain.inputs["Value"])
ao = nodes.new("ShaderNodeAmbientOcclusion")
ao.inputs["Distance"].default_value = .8
ao.samples = 32
shade = nodes.new("ShaderNodeMapRange")
shade.inputs["To Min"].default_value = .82
links.new(ao.outputs["AO"], shade.inputs["Value"])
factor = nodes.new("ShaderNodeMath")
factor.operation = "MULTIPLY"
links.new(grain.outputs["Result"], factor.inputs[0])
links.new(shade.outputs["Result"], factor.inputs[1])
paper = nodes.new("ShaderNodeMixRGB")
paper.blend_type = "MULTIPLY"
paper.inputs[0].default_value = 1
white = tuple(((value/255+.055)/1.055)**2.4 for value in (230,233,236))
paper.inputs[1].default_value = (*white,1)
links.new(factor.outputs[0], paper.inputs[2])
emission = nodes.new("ShaderNodeEmission")
links.new(paper.outputs[0], emission.inputs["Color"])
output = nodes.new("ShaderNodeOutputMaterial")
links.new(emission.outputs[0], output.inputs["Surface"])
atlas = bpy.data.images.new("Winter snow-white wall",width=2048,height=2048,alpha=False)
atlas.generated_color = (*white,1)
texture_node = nodes.new("ShaderNodeTexImage")
texture_node.image = atlas
nodes.active = texture_node
bpy.ops.object.select_all(action="DESELECT")
wall.select_set(True)
bpy.context.view_layer.objects.active = wall
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 32
scene.render.bake.use_clear = False
bpy.ops.object.bake(type="EMIT",margin=8)
bake_path = ROOT / ".tmp/winter-snow-wall-bake.png"
bake_path.parent.mkdir(parents=True,exist_ok=True)
atlas.filepath_raw = str(bake_path)
atlas.file_format = "PNG"
atlas.save()

# Sample both sides of shared vertical edges where the atlas has a UV split.
edges = {}
uv = wall.data.uv_layers[0].data
for polygon in wall.data.polygons:
    loops = list(polygon.loop_indices)
    center = sum((uv[i].uv for i in loops),Vector((0,0))) / len(loops)
    for a,b in zip(loops,loops[1:]+loops[:1]):
        pa,pb = [wall.data.vertices[wall.data.loops[i].vertex_index].co for i in (a,b)]
        if abs(pa.z-pb.z)<3 or math.hypot(pa.x-pb.x,pa.y-pb.y)>.02:
            continue
        key = tuple(sorted(tuple(round(v,4) for v in point) for point in (pa,pb)))
        middle = (uv[a].uv+uv[b].uv)/2
        inside = middle + (center-middle).normalized() * (4/2048)
        edges.setdefault(key,[]).append(tuple(inside))
seams = [sides for sides in edges.values() if len(sides)==2 and (Vector(sides[0])-Vector(sides[1])).length>.05]
assert seams, "Keep a real UV seam in the color continuity check"
seam_path = ROOT / ".tmp/winter-wall-seams.json"
seam_path.write_text(json.dumps(seams),encoding="utf-8")
subprocess.run([shutil.which("python"),"-c",r'''
from PIL import Image,ImageStat
import json,sys
image=Image.open(sys.argv[1]).convert('RGB')
image.save(sys.argv[2],lossless=True,method=6)
image=Image.open(sys.argv[2]).convert('RGB')
def sample(uv):
    x,y=round(uv[0]*(image.width-1)),round((1-uv[1])*(image.height-1))
    return ImageStat.Stat(image.crop((x-1,y-1,x+2,y+2))).mean
delta=max(max(abs(a-b) for a,b in zip(sample(left),sample(right))) for left,right in json.load(open(sys.argv[3])))
assert delta<6,f'Wall UV seam remains visible: RGB difference {delta:.2f}'
print(f'Winter wall seam check: max RGB difference {delta:.2f}/255')
''',str(bake_path),str(ROOT/"public/textures/winter-snow-wall.webp"),str(seam_path)],check=True)

bpy.ops.object.select_all(action="DESELECT")
for obj in created:
    obj.select_set(True)
    obj.data.materials.clear()
bpy.context.view_layer.objects.active = created[0]
target = ROOT / "public/models/winter-letters.glb"
bpy.ops.export_scene.gltf(filepath=str(target), export_format="GLB", use_selection=True,
                          export_materials="NONE", export_extras=True, export_vertex_color="NONE",
                          export_draco_mesh_compression_enable=True,
                          export_draco_position_quantization=16,
                          export_draco_texcoord_quantization=14)
assert hashes == {path: hashlib.sha256(path.read_bytes()).hexdigest() for path in originals}
print(f"Winter letters: {len(created)} meshes, {target.stat().st_size} bytes; originals unchanged")
