"""Run with Blender --background --factory-startup --disable-autoexec --python."""
import bpy
import hashlib
import json
import struct
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from paper_parts import created, parts_of, extract, paper_polygon
SOURCE = ROOT / "public/models/Moving_Characters-transformed.glb"
EXPECTED_SHA = "4f7290dc7b5033217906b43fccffc4071f3096002e4dad0a383541cabc504e30"
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == EXPECTED_SHA, "Recheck component selections when upstream changes"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))


# Sample the original brown paper and a wider area of the green garment.
# Face and eye UVs stay upstream-authored; hair tint matches the selected sheet.
SKIN = (0.070312, 0.718750, 0.093750, 0.742188)
HAIR = (0.195, 0.665, 0.275, 0.715)
HAIR_TINT = (.57, .57, .57, 1)
SHIRT = (0.482, 0.234, 0.560, 0.296)
PANTS = (0.9140625, 0.0234375, 0.9296875, 0.0390625)
SHOE = (0.031250, 0.083984, 0.062500, 0.115234)

front = bpy.data.objects["Moving_Characters_Spring_front"]
front_parts = parts_of(front)
assert len(front_parts) == 45
left_eye = {15, 19, 21, 23, 25, 27}
right_eye = {16, 20, 22, 24, 26, 28}
face_points = [front.matrix_world @ front.data.vertices[v].co for v in front_parts[6]["vertices"]]
face_left = min(face_points, key=lambda p: p.x)
face_right = max(face_points, key=lambda p: p.x)
face_tilt = (face_right.y - face_left.y) / (face_right.x - face_left.x)
face_depth = face_left.y - face_tilt * face_left.x


def front_shape(point, part, bounds):
    if part == 6:
        point.z = .914 + (point.z - .914) * .84
    elif part in {9, 10}:
        old_x = -0.21 if point.x < 0 else 0.21
        center_x = -0.165 if point.x < 0 else 0.165
        point.x = center_x + (point.x - old_x) * 0.60
        point.z = 1.310 + (point.z - 1.392) * 0.58
    elif part == 29:
        point.x *= 0.87
        point.z = 1.015 + (point.z - 1.024) * 1.10
    elif part in {31, 32}:
        shoulder = -0.18 if point.x < 0 else 0.18
        point.x = shoulder + (point.x - shoulder) * 0.70
        point.z = 0.86 + (point.z - 0.86) * 0.80
    return point


def front_eye_shape(point, part, bounds):
    old_x = -0.21 if point.x < 0 else 0.21
    center_x = -0.165 if point.x < 0 else 0.165
    if part in {15, 16}:
        point.z = 1.275 + (point.z - 1.275) * .60
    point.x = center_x + (point.x - old_x) * .80
    point.z = 1.17 + (point.z - 1.215) * .82
    return point


body = extract(front, front_parts, {6, 9, 10, 29, 30, 31, 32, 38}, "boy-front-body", front_shape)
# The selected front view has a wide, short head and small irregular tufts.
FRONT_HAIR_CROWN = [(x, 1.12 + (z - 1.12) * .82) for x, z in [
    (-.37,1.20),(-.43,1.30),(-.45,1.40),(-.435,1.47),(-.455,1.49),
    (-.445,1.55),(-.46,1.60),(-.42,1.64),(-.44,1.68),(-.37,1.71),
    (-.38,1.76),(-.28,1.79),(-.275,1.815),(-.19,1.82),(-.12,1.86),
    (-.055,1.87),(-.08,1.90),(.03,1.875),(.10,1.86),(.13,1.89),
    (.18,1.86),(.21,1.82),(.29,1.82),(.34,1.77),(.36,1.73),(.40,1.68),
    (.42,1.60),(.45,1.55),(.42,1.52),(.44,1.47),(.43,1.40),
    (.425,1.32),(.39,1.22),(.36,1.18),
]]
FRONT_HAIR = FRONT_HAIR_CROWN + [(x, 1.12 + (z - 1.12) * .82) for x, z in [
    (.335,1.28),(.32,1.40),(.28,1.48),(.26,1.43),(.22,1.46),(.19,1.49),
    (.14,1.455),(.095,1.43),(.105,1.49),(.05,1.46),(-.015,1.445),
    (-.06,1.455),(-.005,1.50),(-.09,1.475),(-.16,1.46),(-.215,1.46),
    (-.19,1.50),(-.26,1.475),(-.30,1.42),(-.325,1.30),(-.34,1.18),
]]
# Small paper ears sit behind the face rather than becoming modeled volumes.
for sign in (-1, 1):
    paper_polygon(body, [(sign*x, z) for x, z in [
        (.34,1.25),(.39,1.27),(.423,1.23),(.418,1.17),(.38,1.12),(.34,1.14),
    ]], face_depth + .001, SKIN, smooth=.28)
# A rear scalp fills fringe openings outside the face's curved boundary.
for outline, offset in ((FRONT_HAIR_CROWN, .003), (FRONT_HAIR, -.004)):
    hair_start = len(body.data.vertices)
    paper_polygon(body, outline, face_depth + offset, HAIR, smooth=.28, tint=HAIR_TINT)
    for vertex in list(body.data.vertices)[hair_start:]:
        vertex.co.y += face_tilt * vertex.co.x
for x, z in ((-.285, 1.595), (.315, 1.565)):
    assert body.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)))[0], "Open scalp at fringe/face junction"
FRONT_SHIRT = [
    (-.09,.89),(-.21,.89),(-.31,.75),(-.24,.70),(-.19,.76),
    (-.22,.51),(.22,.51),(.19,.76),(.24,.70),(.31,.75),
    (.21,.89),(.09,.89),(.05,.885),(0,.88),(-.05,.885),
]
paper_polygon(body, FRONT_SHIRT, .020, SHIRT, smooth=.16)
for sign in (-1, 1):
    paper_polygon(body, [(sign*x, z) for x, z in [
        (.20,.775),(.28,.795),(.405,.61),(.415,.575),(.398,.54),
        (.365,.53),(.335,.548),(.20,.70),
    ]], .028, SKIN, smooth=.28)
paper_polygon(body, [(-.165,.51),(.165,.51),(.16,.17),(.025,.17),(0,.34),(-.025,.17),(-.16,.17)], .036, PANTS, smooth=.10)
paper_polygon(body, [(-.16,.19),(-.02,.19),(-.01,.10),(-.035,.08),(-.14,.08),(-.17,.10)], .030, SHOE, smooth=.20)
paper_polygon(body, [(.02,.19),(.16,.19),(.17,.10),(.14,.08),(.035,.08),(.01,.10)], .030, SHOE, smooth=.20)
left_eye_obj = extract(front, front_parts, left_eye, "boy-front-eye-left", front_eye_shape, pivot=(-0.165, 0, 1.17))
right_eye_obj = extract(front, front_parts, right_eye, "boy-front-eye-right", front_eye_shape, pivot=(0.165, 0, 1.17))

side = bpy.data.objects["Moving_Characters_Spring_side"]
side_parts = parts_of(side)
assert len(side_parts) == 43
side_head_points = [side.matrix_world @ side.data.vertices[v].co for v in side_parts[5]["vertices"]]
side_left = min(side_head_points, key=lambda p: p.x)
side_right = max(side_head_points, key=lambda p: p.x)
side_tilt = (side_right.y - side_left.y) / (side_right.x - side_left.x)
side_depth = side_left.y - side_tilt * side_left.x


def side_body_shape(point, part, bounds):
    if part == 5:
        point.z = 1.071 + (point.z - 1.071) * .84
        if point.x > .36:
            point.x = .36 + (point.x - .36) * .65
    elif part == 27:
        point.z = .46 + (point.z - .46) * 1.15
    return point


def fit_side_detail(point):
    # Refit features onto the reshaped head without flattening their layer order.
    hit, location, _, _ = body.ray_cast(Vector((point.x, -1, point.z)), Vector((0, 1, 0)))
    assert hit, "Side facial detail left the head silhouette"
    point.y = location.y - .004 + (point.y + .05) * .10
    return point


def side_face_shape(point, part, bounds):
    if part == 0:
        point.x = .235 + (point.x - .235) * .80
        point.z = 1.470 + (point.z - 1.592) * .60
    elif part == 10:
        point.z += .005
    elif part != 10:
        if part in {1, 4, 7}:
            point.x = .22 + (point.x - .22) * .55
        point.x = .26 + (point.x - .265) * .80
        point.z = 1.33 + (point.z - 1.41) * .68
    return fit_side_detail(point)


body = extract(side, side_parts, {5, 9} | set(range(13,43)), "boy-side-body", side_body_shape,
               solid_parts={27: PANTS, 32: PANTS, 33: SHOE, 34: SHOE, 35: SHOE, 36: SHOE})
SIDE_HAIR_CROWN = [
    (-.18,1.32),(-.235,1.40),(-.255,1.44),(-.285,1.47),
    (-.270,1.50),(-.310,1.57),(-.315,1.64),(-.300,1.72),
    (-.280,1.75),(-.285,1.785),(-.250,1.81),(-.225,1.85),
    (-.160,1.89),(-.090,1.92),(-.010,1.94),(.018,1.935),
    (.040,1.95),(.070,1.93),(.150,1.925),(.220,1.91),
    (.265,1.88),(.282,1.875),(.277,1.85),(.320,1.80),
    (.350,1.75),(.380,1.71),(.398,1.69),(.385,1.67),
    (.400,1.63),(.435,1.585),(.405,1.585),(.400,1.55),(.370,1.52),
]
SIDE_HAIR = SIDE_HAIR_CROWN + [(.06+(x-.06)*.75 if x<.06 else x,z) for x,z in [
    (.31,1.50),(.315,1.56),(.26,1.54),(.22,1.51),(.19,1.515),(.22,1.58),
    (.14,1.55),(.105,1.52),(.075,1.53),(.11,1.60),(.025,1.55),(-.035,1.49),
    (-.07,1.405),(-.11,1.43),(-.16,1.41),(-.165,1.335),(-.21,1.30),
]]
for outline, offset in ((SIDE_HAIR_CROWN, .003), (SIDE_HAIR, -.006)):
    hair_start = len(body.data.vertices)
    paper_polygon(body, outline, side_depth + offset, HAIR, smooth=.30, tint=HAIR_TINT)
    for vertex in list(body.data.vertices)[hair_start:]:
        vertex.co.y += side_tilt * vertex.co.x
ear_start = len(body.data.vertices)
paper_polygon(body, [(-.16,1.41),(-.095,1.42),(-.055,1.385),(-.065,1.33),(-.10,1.30),(-.15,1.32)],
              side_depth - .008, SKIN, smooth=.28, tint=(.93,.90,.90,1))
for vertex in list(body.data.vertices)[ear_start:]:
    vertex.co.y += side_tilt * vertex.co.x
# Follow the upper arm's downward angle; the cuff overlaps both skin layers.
SIDE_SHIRT = [
    (-.06,1.055),(-.015,1.045),(.035,1.045),(.06,1.05),(.14,.97),(.285,.87),(.25,.775),
    (.13,.82),(.15,.66),(-.18,.66),(-.18,.85),(-.14,1.0),
]
paper_polygon(body, SIDE_SHIRT, -.085, SHIRT, smooth=.16)
face = bpy.data.objects["Moving_Characters_Spring_side_face"]
face_parts = parts_of(face)
assert len(face_parts) == 11
side_face_obj = extract(face, face_parts, {0, 10}, "boy-side-face-details", side_face_shape)
side_eye_obj = extract(face, face_parts, set(range(1, 10)), "boy-side-eye", side_face_shape, pivot=(0.26, 0, 1.33))
smile = bpy.data.objects["Moving_Characters_Spring_side_face_smile"]
smile_parts = parts_of(smile)
assert len(smile_parts) == 6


def smile_shape(point, part, bounds):
    if part == 0:
        point.x = .235 + (point.x - .2635) * .80
        point.z = 1.455 + (point.z - 1.558) * .60
    elif part == 5:
        point.x = .279 + (point.x - .292) * .85
        point.z = 1.172 + (point.z - 1.169) * .85
    elif part != 5:
        point.x = .26 + (point.x - .276) * .80
        point.z = 1.33 + (point.z - 1.411) * .68
    return fit_side_detail(point)


smile_obj = extract(smile, smile_parts, set(range(6)), "boy-side-smile", smile_shape)

bpy.ops.object.select_all(action="DESELECT")
for obj in created:
    obj.select_set(True)
bpy.context.view_layer.objects.active = created[0]
target = ROOT / "public/models/spring-boy.glb"
bpy.ops.export_scene.gltf(filepath=str(target), export_format="GLB", use_selection=True,
                          export_materials="NONE", export_texcoords=True, export_extras=True,
                          export_vertex_color="ACTIVE", export_all_vertex_colors=False)
data = target.read_bytes()
length = struct.unpack_from("<I", data, 12)[0]
document = json.loads(data[20:20 + length])
assert len(document["meshes"]) == 7
assert not document.get("images")
assert all("TEXCOORD_0" in primitive["attributes"] for mesh in document["meshes"] for primitive in mesh["primitives"])
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == EXPECTED_SHA
# Every node must still declare the upstream components it was built from.
for name in ("boy-front-body", "boy-front-eye-left", "boy-front-eye-right",
             "boy-side-body", "boy-side-eye", "boy-side-face-details", "boy-side-smile"):
    node = next(n for n in document["nodes"] if n.get("name") == name)
    assert node["extras"]["source_parts"] and node["extras"]["source_faces"] > 0, name
print(f"Spring boy: {len(document['meshes'])} separate meshes, shared-atlas UVs, {len(data)} bytes; source preserved")
