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

wall = source_part("1_Baked", {3}, "autumn-gold-backdrop", GOLD)
# The original wall and ceiling shell are one connected part; keep the shell.
roof_faces = [list(p.vertices) for p in wall.data.polygons
              if all(wall.data.vertices[i].co.z > 6.35 for i in p.vertices)
              and (abs(p.normal.z) > .4 or all(wall.data.vertices[i].co.z > 7 for i in p.vertices))]
roof_mesh = bpy.data.meshes.new("Retained autumn ceiling shell")
roof_mesh.from_pydata([tuple(v.co) for v in wall.data.vertices],[],roof_faces)
roof_mesh.update()
roof = bpy.data.objects.new("autumn-gold-ceiling-shell",roof_mesh)
bpy.context.collection.objects.link(roof)
assert roof_faces
created.append(roof)
finish(roof,GOLD)
# Sample the original wall's foot so the replacement keeps its curved footprint,
# while removing the circular recess built into the old wall topology.
wall_vertices, wall_faces = [], []
foot_angles = [math.atan2(v.co.y+.457284,-v.co.x-.035392)
               for v in wall.data.vertices if v.co.z < .45 and v.co.length > 10]
for i in range(97):
    angle = min(foot_angles)+.00001 + (max(foot_angles)-min(foot_angles)-.00002)*i/96
    direction = Vector((-math.cos(angle),math.sin(angle),0))
    hit, point, _, _ = wall.ray_cast(Vector((-.035392,-.457284,.36)),direction)
    assert hit, f"Missing original wall footprint at {angle}"
    wall_vertices.extend([(point.x,point.y,.311036),(point.x,point.y,7.52703)])
    if i:
        a = 2*(i-1)
        wall_faces.append((a,a+2,a+3,a+1))
wall_mesh = bpy.data.meshes.new("Unbroken courtyard wall")
wall_mesh.from_pydata(wall_vertices,[],wall_faces)
wall_mesh.update()
wall.data = wall_mesh
finish(wall,GOLD)
source_part("2_Baked", {0, 1, 2, 10, 68}, "autumn-gold-ground", GOLD)

bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=2.35, depth=.03, location=(-2.22, 3.106, -1.1377))
inlay = bpy.context.object
inlay.name = "autumn-ground-inlay"
created.append(inlay)
finish(inlay, GOLD)

# Folded leaves share one mesh per bed, so density does not add runtime draw calls.
floor = next(obj for obj in created if obj.name == "autumn-gold-ground")
wall = next(obj for obj in created if obj.name == "autumn-gold-backdrop")
rng = random.Random(1108)
leaf_colors = ["#f3bf2c", "#e4a11b", "#cf8615", "#f6ce49", "#ad5e14"]


def grounded(x, y):
    hit, point, _, _ = floor.ray_cast(Vector((x, y, 3)), Vector((0, 0, -1)))
    assert hit, f"Courtyard prop outside the floor: {x}, {y}"
    return point


def paper_frame(center, angle):
    return Matrix.Translation(Vector(center)) @ Matrix.Rotation(angle, 4, "Z")


def panel(name, outline, color, transform):
    if sum(x*z1-x1*z for (x,z),(x1,z1) in zip(outline,outline[1:]+outline[:1])) < 0:
        outline = list(reversed(outline))
    obj = face(name, [(x, 0, z) for x, z in outline], color)
    obj.matrix_world = transform
    return obj


def rectangle(name, width, height, color, transform):
    return panel(name, [(-width/2, -height/2), (width/2, -height/2),
                        (width/2, height/2), (-width/2, height/2)], color, transform)


# Keep support trunks outside the whole crane's swept volume, not only its rider.
tree_angles = [.46, 1.11, .22]
tree_tops = [5.10, 5.10, 3.10]
tree_roots = []
for i, (angle, top) in enumerate(zip(tree_angles, tree_tops)):
    radius = 13.16 if i < 2 else 12.9
    root = grounded(-.035392 - radius * math.cos(angle), -.457284 + radius * math.sin(angle))
    tree_roots.append(root)
    transform = paper_frame(root, math.pi/2 - angle)
    h = top - root.z
    outline = [(-.12, 0), (.12, 0), (.10, h*.59), (.75, h*.77),
               (.81, h*.91), (.67, h*.86), (.59, h*.78), (.09, h*.64),
               (.07, h), (-.07, h), (-.09, h*.78), (-.65, h*.91),
               (-.72, h*.99), (-.83, h*.98), (-.75, h*.86), (-.10, h*.70)]
    trunk = panel(f"autumn-tree-trunk-{i}", outline, BROWN, transform)
    trunk["grounded"] = True
    crown = source_part("3_Baked", {31 if i != 1 else 34}, f"autumn-tree-crown-{i}", ["#f2b51c", "#efbf2b", "#e9a515"][i])
    lo = Vector(tuple(min(v.co[a] for v in crown.data.vertices) for a in range(3)))
    hi = Vector(tuple(max(v.co[a] for v in crown.data.vertices) for a in range(3)))
    center = (lo + hi) / 2
    # Preserve the original paper outline while varying its proportions and depth.
    for vertex in crown.data.vertices:
        p = vertex.co - center
        vertex.co = Vector((p.x / (hi.x-lo.x) * (3.55 if i < 2 else 2.20),
                            .015 - .10 * (2*p.x/(hi.x-lo.x))**4 + p.y / max(.01, hi.y-lo.y) * .010,
                            h - .55 + p.z / (hi.z-lo.z) * (2.20 if i == 0 else 1.80 if i == 1 else 1.40)))
    crown.matrix_world = transform
    for vertex in crown.data.vertices:
        point = crown.matrix_world @ vertex.co
        origin = Vector((-.035392,-.457284,point.z))
        hit, surface, _, _ = wall.ray_cast(origin,(point-origin).normalized())
        assert hit and (point-origin).length < (surface-origin).length-.02, "Tree crown must remain in front of the curved wall"


# A small square daytime window sits on the curved wall, clear of the photo ropes.
window_angle = 1.36
outward = Vector((-math.cos(window_angle), math.sin(window_angle), 0))
hit, window_center, _, _ = wall.ray_cast(Vector((0, 0, 4.85)), outward)
assert hit
window_center -= outward * .22
window_matrix = paper_frame(window_center, math.pi/2-window_angle)
sky = rectangle("autumn-window-sky", 1.88, 1.88, "#b6c8cd", window_matrix)
sky["window_shape"] = "square"
for side in (-1, 1):
    for axis in (0, 2):
        pos, size = [0, -.045, 0], [.11, .10, .11]
        pos[axis], size[2-axis] = side * 1.0, 2.1
        obj = box(f"autumn-window-frame-{axis}-{side}", pos, size, "#a66d31")
        obj.matrix_world = window_matrix @ obj.matrix_world
for axis in (0, 2):
    size = [.045, .055, .045]
    size[2-axis] = 1.9
    obj = box(f"autumn-window-crossbar-{axis}", (0, -.075, 0), size, "#c69b5e")
    obj.matrix_world = window_matrix @ obj.matrix_world
sill = box("autumn-window-sill", (0, -.13, -1.04), (2.25, .28, .10), "#b98748")
sill.matrix_world = window_matrix @ sill.matrix_world
for i, (outline, color) in enumerate([
    ([(-.94,-.94),(.94,-.94),(.94,-.38),(.5,-.05),(.15,-.35),(-.3,.08),(-.94,-.28)], "#8fa5ad"),
    ([(-.94,-.94),(.94,-.94),(.94,-.65),(.3,-.38),(-.2,-.65),(-.65,-.36),(-.94,-.55)], "#d6d7c2"),
]):
    obj = panel(f"autumn-window-landscape-{i}", outline, color, window_matrix @ Matrix.Translation((0,-.015-i*.015,0)))


def rope_point(t, row):
    point = tree_roots[0].lerp(tree_roots[1], t)
    point.z = (4.95 if row == 0 else 3.10) - (0.26 if row == 0 else .18) * 4*t*(1-t)
    return point


for row in range(2):
    curve = bpy.data.curves.new(f"autumn-photo-rope-{row}", "CURVE")
    curve.dimensions, curve.bevel_depth, curve.bevel_resolution = "3D", .017, 2
    spline = curve.splines.new("POLY")
    spline.points.add(40)
    for i, point in enumerate(spline.points):
        point.co = (*rope_point(i/40, row), 1)
    obj = bpy.data.objects.new(curve.name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    created.append(obj)
    finish(obj, "#ead9b8")
    obj["rope_row"] = row

photo_inserts = []
rope_angle = math.atan2(tree_roots[1].y-tree_roots[0].y, tree_roots[1].x-tree_roots[0].x)
for i, (row, t, lean) in enumerate([(0,.30,-4),(0,.70,3),(1,.16,4),(1,.50,-3),(1,.84,-4)]):
    anchor = rope_point(t, row)
    transform = paper_frame(anchor, rope_angle) @ Matrix.Rotation(math.radians(lean),4,"Y")
    width, height = (2.30, 1.62) if row == 0 else (2.15, 1.50)
    frame = box(f"autumn-photo-frame-{i}", (0,.035,-height/2-.04), (width,.045,height), CREAM)
    frame.matrix_world = transform @ frame.matrix_world
    insert = rectangle(f"autumn-photo-insert-{i}", width-.20, height-.26, "#ded5c5",
                       transform @ Matrix.Translation((0,-.003,-height/2)))
    insert["replaceable_photo"] = True
    insert["demo_photo"] = True
    insert["photo_index"] = i
    photo_inserts.append(insert)
    clip = box(f"autumn-photo-clip-{i}", (0,-.035,-.02), (.13,.07,.30), "#a97843")
    clip.matrix_world = transform @ clip.matrix_world
    # Store the true attachment in world coordinates for geometry checks.
    frame["rope_row"], frame["rope_t"] = row, t
    frame["rope_anchor"] = [anchor.x, anchor.z, -anchor.y]


def leaf_bed(name, center, spread, count):
    vertices, polygons, shades = [], [], []
    accepted = 0
    for _ in range(count):
        x = rng.gauss(center[0], spread[0])
        y = rng.gauss(center[1], spread[1])
        if x > -.45 or y < .25 or x < -12.3 or y > 11.9:
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


leaf_bed("autumn-leaves-left-tree", (-10.8, 5.5), (1.1, 1.3), 330)
leaf_bed("autumn-leaves-right-trees", (-4.0, 10.8), (2.0, .8), 360)
leaf_bed("autumn-leaves-foreground", (-5.7, 4.0), (2.8, 1.7), 420)

# Keep the bench on the outer terrace, outside the crane's route.
bench_angle = 1.45
bench_root = grounded(-.035392-12.7*math.cos(bench_angle), -.457284+12.7*math.sin(bench_angle))
bench_matrix = paper_frame(bench_root, math.pi/2-bench_angle)
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
# Low folded foliage gives the foreground depth without another entrance.
for i, (x, y, angle) in enumerate([(-10.3,3.5,.8),(-2.0,8.1,.2),(-7.6,3.0,.6)]):
    root = grounded(x,y)
    for j in range(5):
        spread, height = (j-2)*.22, .48 + .12*(2-abs(j-2))
        outline = [(0,0),(spread-.10,height*.45),(spread-.07,height),
                   (spread+.12,height*.63),(.03,0)]
        panel(f"autumn-plant-{i}-{j}",outline,["#8c9d83","#b6ae70","#c6b86d"][i],
              paper_frame(root+Vector((0,j*.035,0)),angle))

# Restore the open paper book, resting its lower cover edge on the terrace.
book_root = grounded(-6.3, 2.6)
book_matrix = paper_frame(book_root, math.radians(45)) @ Matrix.Rotation(math.radians(48), 4, "X")
book_pages = []
for page, side in enumerate((-1, 1)):
    page_matrix = book_matrix @ Matrix.Translation((side*.72, 0, 0)) @ Matrix.Rotation(side*math.radians(-5), 4, "Y")
    for layer, (z, color_code) in enumerate([(.02, BROWN), (.065, CREAM), (.09, "#f0e2c5"), (.115, "#f3e5c9")]):
        obj = box(f"autumn-book-page-{page}-{layer}", (0, 0, z),
                  (1.49, 1.86, .035) if layer == 0 else (1.42, 1.78, .035), color_code)
        obj.matrix_world = page_matrix @ obj.matrix_world
    text = face(f"autumn-book-text-{page}", [(-.64,-.78,.155),(.64,-.78,.155),(.64,.78,.155),(-.64,.78,.155)], CREAM)
    text.matrix_world = page_matrix
    text["book_page"] = page
    text["text"] = ["Golden leaves, quiet days.", "Little moments, kept here."][page]
    book_pages.append(text)
spine = box("autumn-book-spine", (0,0,.07), (.08,1.81,.09), "#a77b49")
spine.matrix_world = book_matrix @ spine.matrix_world
book_parts = [obj for obj in created if obj.name.startswith("autumn-book-")]
cover_points = [obj.matrix_world @ v.co for obj in book_parts if obj not in book_pages for v in obj.data.vertices]
supports = [grounded(p.x,p.y).z for p in cover_points]
assert max(supports)-min(supports) < .06, "Keep the open book on one terrace, clear of stair edges"
lift = max(z-p.z for z,p in zip(supports,cover_points)) + .012
for obj in book_parts:
    obj.location.z += lift
book_text_path = ROOT / "public/textures/autumn-book-text.webp"
subprocess.run([shutil.which("python"), "-c", "from PIL import Image,ImageDraw,ImageFont; import sys; im=Image.new('RGBA',(1024,640)); d=ImageDraw.Draw(im); f=ImageFont.truetype(sys.argv[1],84); lines=[['Golden','leaves,','quiet days.'],['Little','moments,','kept here.']]; [(d.text((256+512*p,180+112*i),line,font=f,fill='#694225',anchor='mm')) for p,page in enumerate(lines) for i,line in enumerate(page)]; [d.line((130+512*p,510,382+512*p,510),fill='#ac8859',width=3) for p in range(2)]; im.save(sys.argv[2],lossless=True,method=6)", str(ROOT/"public/fonts/SlimeBox.woff"), str(book_text_path)], check=True)

# Small flat woodland animals keep the same cut-paper language as the boy.
squirrel_outline = [(-.16,0),(.45,0),(.49,.08),(.31,.12),(.32,.25),(.48,.34),(.61,.38),(.55,.46),(.45,.49),(.46,.67),(.34,.60),(.24,.49),(.10,.42),(.02,.26),(-.02,.35),(-.13,.47),(-.29,.61),(-.31,.79),(-.23,.87),(-.17,.85),(-.23,.77),(-.17,.67),(-.07,.67),(.02,.77),(.02,.91),(-.12,1.02),(-.32,.98),(-.43,.80),(-.42,.55),(-.27,.34),(-.12,.21),(-.02,.15),(-.16,.10)]
for i, (x, y, size, angle) in enumerate([(-8.7,.9,.95,.60),(-3.1,10.9,.78,.25)]):
    transform = paper_frame(grounded(x,y), angle) @ Matrix.Diagonal((size,size,size,1))
    animal = panel(f"autumn-squirrel-{i}", squirrel_outline, ["#a4612c","#b77b3d"][i], transform)
    animal["grounded"] = True
    panel(f"autumn-squirrel-belly-{i}",[(.08,.08),(.29,.09),(.29,.23),(.21,.37),(.14,.35),(.07,.23)],"#e5c18a",transform @ Matrix.Translation((0,-.012,0)))
    panel(f"autumn-squirrel-eye-{i}",[(.409+.023*math.cos(a*math.tau/12),.454+.023*math.sin(a*math.tau/12)) for a in range(12)],"#493323",transform @ Matrix.Translation((0,-.018,0)))

for cluster, (x,y) in enumerate([(-9.8,5.7),(-2.1,9.4)]):
    for i, size in enumerate((.48,.32)):
        transform = paper_frame(grounded(x+i*.43,y+i*.14), .40)
        stem = box(f"autumn-mushroom-stem-{cluster}-{i}",(0,0,size*.40),(size*.24,.035,size*.8),CREAM)
        stem.matrix_world = transform @ stem.matrix_world
        panel(f"autumn-mushroom-cap-{cluster}-{i}",[(size*u,size*v) for u,v in [(-.75,.65),(-.6,.95),(-.29,1.18),(.1,1.24),(.48,1.03),(.75,.65)]], ["#af6c36","#d59b4c"][i],transform @ Matrix.Translation((0,-.03,0)))

# Replace all old lantern wires with three attached, folded-paper cranes.
for i, (x,y,z,size,angle,color_code) in enumerate([(-7.8,5.0,6.20,.86,.55,"#efdfba"),(-6.2,7.0,5.90,.98,.82,"#d9c29c"),(-4.5,8.7,6.40,.76,1.05,"#e9cf89")]):
    hit, anchor, _, _ = roof.ray_cast(Vector((x,y,5)),Vector((0,0,1)))
    assert hit, "Paper crane needs an actual ceiling attachment"
    center = Vector((x,y,z))
    transform = paper_frame(center,angle) @ Matrix.Diagonal((size,size,size,1))
    # Creased wing triangles sit on both sides of the central body plane.
    vertices = [(-.18,0,0),(.18,0,.05),(.38,0,.42),(.54,0,.38),(.36,0,.53),(.24,0,.45),(.08,0,.16),(-.70,0,.25),(-.12,.36,.72),(-.04,-.36,.60),(.02,0,-.12)]
    polygons = [(0,1,6),(1,2,5,6),(2,3,4,5),(0,7,6),(0,6,8),(0,9,6),(0,10,1)]
    mesh = bpy.data.meshes.new(f"autumn-paper-crane-{i}")
    mesh.from_pydata(vertices,[],polygons)
    mesh.update()
    crane = bpy.data.objects.new(mesh.name,mesh)
    bpy.context.collection.objects.link(crane)
    created.append(crane)
    finish(crane,color_code)
    crane.matrix_world = transform
    for polygon in mesh.polygons:
        if polygon.index in (4,6):
            for loop in polygon.loop_indices:
                mesh.color_attributes["PaperColor"].data[loop].color = linear_color("#c4ad86")
    attachment = transform @ Vector(vertices[8])
    hit, top, _, _ = roof.ray_cast(Vector((attachment.x,attachment.y,5)),Vector((0,0,1)))
    assert hit, "Crane thread must meet the ceiling at its actual position"
    line = box(f"autumn-crane-thread-{i}",(top+attachment)/2,(.012,.012,top.z-attachment.z),"#dfca9e")
    line["ceiling_anchor"] = [top.x,top.z,-top.y]

# Keep the original SlimeBox label on its own full-image UVs, like the photographs.
label_path = ROOT / "public/textures/autumn-gallery-label.webp"
subprocess.run([shutil.which("python"), "-c", "from PIL import Image,ImageDraw,ImageFont; import sys; im=Image.new('RGB',(768,300),'#ead9b8'); d=ImageDraw.Draw(im); f=sys.argv[1]; d.text((384,15),'Photos',font=ImageFont.truetype(f,110),fill='#694225',anchor='mt'); d.text((384,180),'View gallery',font=ImageFont.truetype(f,49),fill='#694225',anchor='mt'); im.save(sys.argv[2],quality=94,method=6)", str(ROOT/"public/fonts/SlimeBox.woff"), str(label_path)], check=True)
sign_matrix = paper_frame(grounded(-8.8,8.6)+Vector((0,0,.45)), .77)
sign = box("autumn-gallery-sign", (0,0,0),(2.30,.06,.90),CREAM)
sign.matrix_world = sign_matrix
label = rectangle("autumn-gallery-title",2.05,.80,CREAM,sign_matrix @ Matrix.Translation((0,-.045,0)))
label["text"] = "Photos / View gallery"

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
    obj.data.uv_layers.active_index = len(obj.data.uv_layers)-1
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
for obj in book_pages:
    obj.hide_render = True
    obj.select_set(False)
bpy.ops.object.bake(type="EMIT", margin=6)
for obj in book_pages:
    obj.hide_render = False
    obj.select_set(True)
png = ROOT / ".tmp/autumn-album-bake.png"
png.parent.mkdir(parents=True, exist_ok=True)
atlas.filepath_raw = str(png)
atlas.file_format = "PNG"
atlas.save()
texture = ROOT / "public/textures/autumn-album-sample.webp"
subprocess.run([shutil.which("python"), "-c", "from PIL import Image; import sys; Image.open(sys.argv[1]).save(sys.argv[2],quality=94,method=6)", str(png), str(texture)], check=True)
for obj in created:
    obj.data.uv_layers.remove(obj.data.uv_layers["PaperUV"])
    if "LabelUV" in obj.data.uv_layers:
        obj.data.uv_layers.remove(obj.data.uv_layers["LabelUV"])
    obj.data.uv_layers[0].name = "UVMap"
    if obj in photo_inserts or obj in book_pages or obj == label:
        uv = obj.data.uv_layers.new(name="PhotoUV")
        photo_uv = [(0, 0), (1, 0), (1, 1), (0, 1)]
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
