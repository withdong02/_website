"""Run with Blender --background --factory-startup --disable-autoexec --python."""
import bpy
import hashlib
import json
import struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/models/Moving_Characters-transformed.glb"
EXPECTED_SHA = "4f7290dc7b5033217906b43fccffc4071f3096002e4dad0a383541cabc504e30"
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == EXPECTED_SHA, "Recheck component selections when upstream changes"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
created = []


def parts_of(obj):
    mesh = obj.data
    keys = [tuple(round(c, 5) for c in v.co) for v in mesh.vertices]
    positions = {}
    for i, key in enumerate(keys):
        positions.setdefault(key, []).append(i)
    neighbors = {key: set() for key in positions}
    for edge in mesh.edges:
        a, b = (keys[i] for i in edge.vertices)
        neighbors[a].add(b)
        neighbors[b].add(a)
    unseen = set(neighbors)
    parts = []
    while unseen:
        key = min(unseen)
        unseen.remove(key)
        pending, vertices = [key], []
        while pending:
            key = pending.pop()
            vertices.extend(positions[key])
            for other in neighbors[key]:
                if other in unseen:
                    unseen.remove(other)
                    pending.append(other)
        points = [obj.matrix_world @ mesh.vertices[i].co for i in vertices]
        lo = [min(p[i] for p in points) for i in range(3)]
        hi = [max(p[i] for p in points) for i in range(3)]
        parts.append({"vertices": set(vertices), "min": lo, "max": hi})
    parts.sort(key=lambda p: (-p["max"][2], p["min"][0]))
    return parts


def extract(obj, parts, selected, name, mutate=None, pivot=None, solid_parts=()):
    membership = {v: i for i in selected for v in parts[i]["vertices"]}
    polygons = [p for p in obj.data.polygons if all(v in membership for v in p.vertices)]
    used = sorted({v for p in polygons for v in p.vertices})
    remap = {v: i for i, v in enumerate(used)}
    center = Vector(pivot or (0, 0, 0))
    points = []
    for vertex in used:
        point = obj.matrix_world @ obj.data.vertices[vertex].co
        if mutate:
            point = mutate(point, membership[vertex], parts[membership[vertex]])
        points.append(point - center)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points, [], [[remap[v] for v in p.vertices] for p in polygons])
    mesh.update()
    uv = mesh.uv_layers.new(name="UVMap")
    for target_face, source_face in zip(mesh.polygons, polygons):
        for target_loop, source_loop in zip(target_face.loop_indices, source_face.loop_indices):
            source_vertex = obj.data.loops[source_loop].vertex_index
            uv.data[target_loop].uv = ((0.65, 0.2) if membership[source_vertex] in solid_parts else obj.data.uv_layers.active.data[source_loop].uv)
    result = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(result)
    result.location = center
    created.append(result)
    return result


def paper_polygon(obj, outline, depth, atlas):
    rounded = []
    for i, point in enumerate(outline):
        previous, following = outline[i - 1], outline[(i + 1) % len(outline)]
        entry = tuple(.82 * point[j] + .18 * previous[j] for j in range(2))
        exit = tuple(.82 * point[j] + .18 * following[j] for j in range(2))
        for t in (0, .25, .5, .75, 1):
            rounded.append(tuple((1-t)**2 * entry[j] + 2*(1-t)*t*point[j] + t*t*exit[j] for j in range(2)))
    outline = rounded
    old = obj.data
    points = [tuple(v.co) for v in old.vertices]
    faces = [list(p.vertices) for p in old.polygons]
    old_uv = [tuple(loop.uv) for loop in old.uv_layers.active.data]
    offset = len(points)
    points.extend((x, depth, z) for x, z in outline)
    faces.append(list(range(offset, len(points))))
    mesh = bpy.data.meshes.new(obj.name + "-paper")
    mesh.from_pydata(points, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name="UVMap")
    for i, value in enumerate(old_uv):
        uv.data[i].uv = value
    lo_x, hi_x = min(p[0] for p in outline), max(p[0] for p in outline)
    lo_z, hi_z = min(p[1] for p in outline), max(p[1] for p in outline)
    for loop in mesh.polygons[-1].loop_indices:
        x, _, z = mesh.vertices[mesh.loops[loop].vertex_index].co
        uv.data[loop].uv = (atlas[0] + (x - lo_x) / (hi_x - lo_x) * (atlas[2] - atlas[0]),
                            atlas[1] + (z - lo_z) / (hi_z - lo_z) * (atlas[3] - atlas[1]))
    obj.data = mesh


HAIR = (0.203125, 0.65625, 0.25, 0.703125)
SHIRT = (0.484375, 0.21875, 0.53125, 0.265625)
PANTS = (0.9140625, 0.0234375, 0.9296875, 0.0390625)
SHOE = (0.65, 0.20, 0.655, 0.205)

front = bpy.data.objects["Moving_Characters_Spring_front"]
front_parts = parts_of(front)
assert len(front_parts) == 45
left_eye = {15, 19, 21, 23, 25, 27}
right_eye = {16, 20, 22, 24, 26, 28}


def front_shape(point, part, bounds):
    if part in {9, 10}:
        old_x = -0.21 if point.x < 0 else 0.21
        center_x = -0.18 if point.x < 0 else 0.18
        point.x = center_x + (point.x - old_x) * 0.62
        point.z = 1.392 + (point.z - 1.392) * 0.38
    elif part in {31, 32}:
        shoulder = -0.18 if point.x < 0 else 0.18
        point.x = shoulder + (point.x - shoulder) * 0.70
        point.z = 0.86 + (point.z - 0.86) * 0.80
    return point


def front_eye_shape(point, part, bounds):
    old_x = -0.21 if point.x < 0 else 0.21
    center_x = -0.18 if point.x < 0 else 0.18
    point.x = center_x + (point.x - old_x) * 0.62
    point.z = 1.24 + (point.z - 1.24) * 0.64
    return point


body = extract(front, front_parts, {6, 9, 10, 29, 30, 31, 32, 38}, "boy-front-body", front_shape)
# Author flat silhouettes instead of squeezing the original dress and long hair.
paper_polygon(body, [(-.39,1.43),(-.40,1.61),(-.33,1.72),(-.37,1.75),(-.22,1.78),(-.24,1.83),(-.07,1.80),(.04,1.85),(.10,1.80),(.23,1.81),(.30,1.74),(.35,1.71),(.33,1.65),(.39,1.58),(.37,1.43),(.28,1.51),(.24,1.46),(.18,1.58),(.11,1.50),(.10,1.60),(-.04,1.49),(-.01,1.59),(-.17,1.51),(-.13,1.61),(-.29,1.51),(-.30,1.42)], .018, HAIR)
paper_polygon(body, [(-.10,.88),(-.22,.88),(-.29,.74),(-.24,.69),(-.20,.72),(-.20,.57),(.20,.57),(.20,.72),(.24,.69),(.29,.74),(.22,.88),(.10,.88),(.08,.82),(-.08,.82)], .026, SHIRT)
paper_polygon(body, [(-.19,.60),(.19,.60),(.17,.22),(.03,.22),(0,.46),(-.03,.22),(-.17,.22)], .036, PANTS)
paper_polygon(body, [(-.17,.23),(-.03,.23),(-.01,.15),(-.02,.12),(-.19,.12),(-.20,.15)], .030, SHOE)
paper_polygon(body, [(.03,.23),(.17,.23),(.20,.15),(.19,.12),(.02,.12),(.01,.15)], .030, SHOE)
extract(front, front_parts, left_eye, "boy-front-eye-left", front_eye_shape, pivot=(-0.18, 0, 1.24))
extract(front, front_parts, right_eye, "boy-front-eye-right", front_eye_shape, pivot=(0.18, 0, 1.24))

side = bpy.data.objects["Moving_Characters_Spring_side"]
side_parts = parts_of(side)
assert len(side_parts) == 43


def side_face_shape(point, part, bounds):
    if part == 0:
        point.x = .235 + (point.x - .235) * .62
        point.z = 1.592 + (point.z - 1.592) * .38
    elif part != 10:
        point.x = .24 + (point.x - .24) * .62
        point.z = 1.43 + (point.z - 1.43) * .64
    return point


body = extract(side, side_parts, {5, 9} | set(range(13,43)), "boy-side-body", solid_parts={27,32,33,35})
paper_polygon(body, [(-.29,1.40),(-.31,1.64),(-.24,1.83),(-.15,1.88),(-.17,1.94),(-.02,1.91),(.09,1.96),(.12,1.91),(.27,1.90),(.37,1.82),(.42,1.70),(.38,1.59),(.31,1.63),(.27,1.52),(.23,1.62),(.16,1.53),(.15,1.65),(.05,1.55),(0,1.66),(-.09,1.56),(-.13,1.40)], -.092, HAIR)
paper_polygon(body, [(-.06,1.03),(.09,1.02),(.24,.92),(.20,.84),(.10,.87),(.16,.65),(-.17,.65),(-.18,.85),(-.14,1.0)], -.085, SHIRT)
face = bpy.data.objects["Moving_Characters_Spring_side_face"]
face_parts = parts_of(face)
assert len(face_parts) == 11
extract(face, face_parts, {0, 10}, "boy-side-face-details", side_face_shape)
extract(face, face_parts, set(range(1, 10)), "boy-side-eye", side_face_shape, pivot=(0.24, 0, 1.43))
smile = bpy.data.objects["Moving_Characters_Spring_side_face_smile"]
smile_parts = parts_of(smile)
assert len(smile_parts) == 6


def smile_shape(point, part, bounds):
    if part == 0:
        point.x = .2635 + (point.x - .2635) * .62
        point.z = 1.558 + (point.z - 1.558) * .38
    elif part != 5:
        point.x = .276 + (point.x - .276) * .62
        point.z = 1.411 + (point.z - 1.411) * .64
    return point


extract(smile, smile_parts, set(range(6)), "boy-side-smile", smile_shape)

bpy.ops.object.select_all(action="DESELECT")
for obj in created:
    obj.select_set(True)
bpy.context.view_layer.objects.active = created[0]
target = ROOT / "public/models/spring-boy.glb"
bpy.ops.export_scene.gltf(filepath=str(target), export_format="GLB", use_selection=True, export_materials="NONE", export_texcoords=True)
data = target.read_bytes()
length = struct.unpack_from("<I", data, 12)[0]
document = json.loads(data[20:20 + length])
assert len(document["meshes"]) == 7
assert not document.get("images")
assert all("TEXCOORD_0" in primitive["attributes"] for mesh in document["meshes"] for primitive in mesh["primitives"])
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == EXPECTED_SHA
print(f"Spring boy: {len(document['meshes'])} separate meshes, shared-atlas UVs, {len(data)} bytes; source preserved")
