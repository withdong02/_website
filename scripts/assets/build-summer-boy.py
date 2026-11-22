"""Build the summer surfer with the approved spring head and original summer rig."""
import bpy
import hashlib
import json
import math
import struct
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / "scripts/assets"))
from paper_parts import created, parts_of, extract, paper_polygon

SOURCE = ROOT / "public/models/Moving_Characters-transformed.glb"
SPRING = ROOT / "public/models/spring-boy.glb"
SOURCE_SHA = "4f7290dc7b5033217906b43fccffc4071f3096002e4dad0a383541cabc504e30"
SPRING_SHA = "50881fd38e692ca166cd45459104fb8edeff7a6cd42566ced804dbff61350d6a"
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SOURCE_SHA
assert hashlib.sha256(SPRING.read_bytes()).hexdigest() == SPRING_SHA, "Recheck the approved head before rebuilding summer"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
bpy.ops.import_scene.gltf(filepath=str(SPRING))

summer = bpy.data.objects["Moving_Characters_Summer_character"]
summer_parts = parts_of(summer)
assert len(summer_parts) == 31
original_front = bpy.data.objects["Moving_Characters_Spring_front"]
front_parts = parts_of(original_front)


def face_plane(obj, part):
    points = [obj.matrix_world @ obj.data.vertices[v].co for v in part["vertices"]]
    left, right = min(points, key=lambda p: p.x), max(points, key=lambda p: p.x)
    tilt = (right.y - left.y) / (right.x - left.x)
    return tilt, left.y - tilt * left.x


front_tilt, front_depth = face_plane(original_front, front_parts[6])
summer_tilt, summer_depth = face_plane(summer, summer_parts[9])
angle = math.radians(3)


def summer_point(point):
    x, z = point.x, point.z
    point.x = .06 + math.cos(angle) * x + math.sin(angle) * (z - .914)
    point.z = 1.152 - math.sin(angle) * x + math.cos(angle) * (z - .914)
    point.y = summer_depth + summer_tilt * point.x + point.y - front_depth - front_tilt * x
    return point


def head_shape(point, part, bounds):
    return summer_point(point)


approved = bpy.data.objects["boy-front-body"]
approved_parts = parts_of(approved)
head_parts = {i for i, p in enumerate(approved_parts)
              if p["min"][2] > .90 and (p["max"][0] - p["min"][0] > .50 or
                  (p["min"][2] > 1.05 and abs((p["max"][0] + p["min"][0]) / 2) > .30))}
assert len(head_parts) == 5, "Expected face, two hair layers and two ears; do not copy the open eyes or clothes"
head = extract(approved, approved_parts, head_parts, "summer-approved-head", head_shape)


def body_shape(point, part, bounds):
    if part == 12:
        point.y += .012
    return point


body = extract(summer, summer_parts, {12, 27, 28, 29, 30}, "boy-summer-body", body_shape)
body["approved_spring_sha256"] = SPRING_SHA
BLUE = (.24, .785, .32, .825)
LIP = (.0625, .28125, .078125, .296875)
SKIN = (.070312, .718750, .093750, .742188)

neck_start = len(body.data.vertices)
paper_polygon(body, [(-.01,1.205),(.115,1.205),(.13,1.105),(-.02,1.105)],
              summer_depth + .004, SKIN, smooth=.22)
for vertex in list(body.data.vertices)[neck_start:]:
    vertex.co.y += summer_tilt * vertex.co.x


def clothing(outline, offset, tint=(1, 1, 1, 1)):
    start = len(body.data.vertices)
    paper_polygon(body, outline, summer_depth + offset, BLUE, smooth=.22, tint=tint)
    for vertex in list(body.data.vertices)[start:]:
        vertex.co.y += summer_tilt * vertex.co.x


clothing([(-.095,.925),(.23,.925),(.24,.70),(.105,.70),(.06,.79),(.015,.715),(-.12,.715)],
         -.007, tint=(.78,.82,.90,1))
clothing([(-.05,1.155),(.015,1.155),(.06,1.125),(.11,1.15),(.17,1.155),
          (.29,1.04),(.245,.98),(.21,1.015),(.235,.90),(-.105,.90),
          (-.075,1.045),(-.125,1.02),(-.18,1.07)], -.013)

# Join the approved head into the body while retaining its UVs and hair colors.
bpy.ops.object.select_all(action="DESELECT")
head.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
created.remove(head)
body_points = {tuple(round(c, 5) for c in v.co) for v in body.data.vertices}
assert all(tuple(round(c, 5) for c in summer.matrix_world @ summer.data.vertices[v].co) in body_points
           for v in summer_parts[29]["vertices"]), "Surfboard geometry must stay unchanged"
assert body.ray_cast(Vector((.06, -1, 1.14)), Vector((0, 1, 0)))[0], "Gap between neck and collar"

face = bpy.data.objects["Moving_Characters_Summer_happy_face"]
face_parts = parts_of(face)
assert len(face_parts) == 10


def face_shape(point, part, bounds):
    if part in {0, 1}:
        old_x, old_z = ((-.1018, 1.5922) if part == 0 else (.2583, 1.5730))
        new_x = -.165 if part == 0 else .165
        point.x = new_x + (point.x - old_x) * .65
        point.z = 1.31 + (point.z - old_z) * .60
    else:
        left = part in {2, 3, 6, 7}
        old_x, old_z = ((-.096, 1.444) if left else (.237, 1.428))
        if part not in {7, 8}:
            point.z = old_z + (point.z - old_z) * .35
        point.x = (-.165 if left else .165) + (point.x - old_x) * .82
        point.z = 1.17 + (point.z - old_z) * .65
    # Place expression layers on the copied face, preserving their fine depth order.
    point.y = front_depth + front_tilt * point.x - .005 + (point.y + .02) * .06
    return summer_point(point)


expression = extract(face, face_parts, set(range(10)), "boy-summer-face", face_shape,
                     pivot=tuple(face.matrix_world.translation))
mouth_start = len(expression.data.vertices)
paper_polygon(expression, [(-.09,1.025),(-.04,1.04),(.04,1.04),(.09,1.025),
                           (.08,.99),(.04,.96),(0,.95),(-.04,.96),(-.08,.99)],
              front_depth - .006, LIP, smooth=.28)
for vertex in list(expression.data.vertices)[mouth_start:]:
    # Convert this approved-head outline into the expression's local coordinates.
    point = vertex.co.copy()
    point.y += front_tilt * point.x
    vertex.co = summer_point(point) - expression.location

for suffix in ("left_arm", "right_arm"):
    arm = bpy.data.objects["Moving_Characters_Summer_" + suffix]
    arm_parts = parts_of(arm)
    assert len(arm_parts) == 1
    extract(arm, arm_parts, {0}, "boy-summer-" + suffix.replace("_", "-"),
            pivot=tuple(arm.matrix_world.translation))

bpy.ops.object.select_all(action="DESELECT")
for obj in created:
    obj.select_set(True)
bpy.context.view_layer.objects.active = body
target = ROOT / "public/models/summer-boy.glb"
bpy.ops.export_scene.gltf(filepath=str(target), export_format="GLB", use_selection=True,
                          export_materials="NONE", export_texcoords=True, export_extras=True,
                          export_vertex_color="ACTIVE", export_all_vertex_colors=False)
data = target.read_bytes()
document = json.loads(data[20:20 + struct.unpack_from("<I", data, 12)[0]])
assert len(document["meshes"]) == 4 and not document.get("images")
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SOURCE_SHA
assert hashlib.sha256(SPRING.read_bytes()).hexdigest() == SPRING_SHA
print(f"Summer boy: four separate body/face/arm nodes, approved head, original board/feet/pivots; {len(data)} bytes")
