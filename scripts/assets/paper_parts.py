"""Blender mesh extraction and thin-paper silhouettes shared by character builders."""
import bpy
from mathutils import Vector

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
    source_colors = obj.data.color_attributes.active_color
    colors = mesh.color_attributes.new(name="Color", type="FLOAT_COLOR", domain="CORNER") if source_colors else None
    for target_face, source_face in zip(mesh.polygons, polygons):
        for target_loop, source_loop in zip(target_face.loop_indices, source_face.loop_indices):
            if colors:
                colors.data[target_loop].color = source_colors.data[source_loop].color
            source_vertex = obj.data.loops[source_loop].vertex_index
            part = membership[source_vertex]
            if part in solid_parts:
                patch = solid_parts[part]
                uv.data[target_loop].uv = ((patch[0] + patch[2]) / 2, (patch[1] + patch[3]) / 2)
            else:
                uv.data[target_loop].uv = obj.data.uv_layers.active.data[source_loop].uv
    result = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(result)
    result.location = center
    # Record which original components this node still carries, so the check
    # can prove that redrawing added layers instead of deleting source parts.
    result["source_parts"] = ",".join(str(i) for i in sorted(selected))
    result["source_faces"] = len(polygons)
    created.append(result)
    return result


def paper_polygon(obj, outline, depth, atlas, smooth=.18, tint=(1, 1, 1, 1)):
    """Add a flat, softly rounded silhouette in front of the extracted geometry.

    smooth controls how much each corner is rounded: hair keeps small, crisp
    tufts (.18) while clothing uses a softer cut (.28-.35).
    """
    rounded = []
    for i, point in enumerate(outline):
        previous, following = outline[i - 1], outline[(i + 1) % len(outline)]
        entry = tuple((1 - smooth) * point[j] + smooth * previous[j] for j in range(2))
        exit = tuple((1 - smooth) * point[j] + smooth * following[j] for j in range(2))
        for t in (0, .25, .5, .75, 1):
            rounded.append(tuple((1-t)**2 * entry[j] + 2*(1-t)*t*point[j] + t*t*exit[j] for j in range(2)))
    outline = rounded
    old = obj.data
    points = [tuple(v.co) for v in old.vertices]
    faces = [list(p.vertices) for p in old.polygons]
    old_uv = [tuple(loop.uv) for loop in old.uv_layers.active.data]
    old_colors = ([tuple(c.color) for c in old.color_attributes.active_color.data]
                  if old.color_attributes.active_color else [(1, 1, 1, 1)] * len(old.loops))
    offset = len(points)
    points.extend((x, depth, z) for x, z in outline)
    faces.append(list(range(offset, len(points))))
    mesh = bpy.data.meshes.new(obj.name + "-paper")
    mesh.from_pydata(points, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name="UVMap")
    colors = mesh.color_attributes.new(name="Color", type="FLOAT_COLOR", domain="CORNER")
    for i, color in enumerate(colors.data):
        color.color = old_colors[i] if i < len(old_colors) else tint
    for i, value in enumerate(old_uv):
        uv.data[i].uv = value
    lo_x, hi_x = min(p[0] for p in outline), max(p[0] for p in outline)
    lo_z, hi_z = min(p[1] for p in outline), max(p[1] for p in outline)
    for loop in mesh.polygons[-1].loop_indices:
        x, _, z = mesh.vertices[mesh.loops[loop].vertex_index].co
        uv.data[loop].uv = (atlas[0] + (x - lo_x) / (hi_x - lo_x) * (atlas[2] - atlas[0]),
                            atlas[1] + (z - lo_z) / (hi_z - lo_z) * (atlas[3] - atlas[1]))
    obj.data = mesh
