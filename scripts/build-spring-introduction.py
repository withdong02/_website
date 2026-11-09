"""Replace only the spring introduction, retaining all upstream assets."""
import bpy
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from paper_parts import created, extract, parts_of

source = ROOT / "public/models/Scene_2_Spring-transformed.glb"
atlas = ROOT / "public/textures/Scene_2_Spring_1.webp"
font_path = ROOT / "public/fonts/SlimeBox.woff"
original_hashes = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in (source, atlas, font_path)}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
obj = bpy.data.objects["Scene_2_Spring_1_Baked"]
parts = parts_of(obj)
assert len(parts) == 4 and len(parts[0]["vertices"]) == 250
backdrop = extract(obj, parts, {0}, "spring-introduction-backdrop")

texture = ROOT / "public/textures/spring-introduction.webp"
text_texture = ROOT / "public/textures/spring-introduction-text.webp"
copy = ["Hi, I'm withdong02.\nYou can call me ddd.\n\nI'm an information security\nstudent at HDU.\n\nGlad to meet you here.", "A little corner for\nthings I learn,\nmoments I want to remember,\nand music I enjoy.\n\nTake your time\nand wander around."]
# Erase only baked letter shadows, using the surrounding paper at each pixel.
result = subprocess.run([shutil.which("python"), "-c", r'''
from PIL import Image, ImageFilter, ImageDraw, ImageFont
import sys, json
im = Image.open(sys.argv[1]).convert('RGBA')
for box in [(475,1490,900,1780),(1160,1510,1615,1800)]:
    patch = im.crop(box)
    paper = patch.filter(ImageFilter.MedianFilter(31))
    mask = Image.new('L',patch.size)
    before = patch.convert('L')
    local = paper.convert('L')
    mask.putdata([255 if a < b - 7 else 0 for a,b in zip(before.get_flattened_data(),local.get_flattened_data())])
    mask = mask.filter(ImageFilter.MaxFilter(5))
    pixels, unknown = patch.load(), mask.load()
    pending = {(x,y) for y in range(mask.height) for x in range(mask.width) if unknown[x,y]}
    for _ in range(40):
        if not pending: break
        updates = {}
        for x,y in pending:
            neighbors = [pixels[a,b] for a,b in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)] if 0<=a<mask.width and 0<=b<mask.height and not unknown[a,b]]
            if neighbors: updates[x,y] = tuple(round(sum(v[c] for v in neighbors)/len(neighbors)) for c in range(4))
        for point,color in updates.items(): pixels[point] = color; unknown[point] = 0
        pending.difference_update(updates)
    assert not pending
    repaired = patch
    old_dark = sum(v<35 for v in before.get_flattened_data())
    new_dark = sum(v<35 for v in repaired.convert('L').get_flattened_data())
    assert old_dark>100 and new_dark<old_dark*.05,(old_dark,new_dark)
    im.paste(repaired,box)
im.save(sys.argv[2],quality=94,exact=True,method=6)
font = ImageFont.truetype(sys.argv[3],64)
letters = Image.new('RGBA',(2048,1024))
draw = ImageDraw.Draw(letters)
sizes = []
for i,body in enumerate(json.loads(sys.argv[5])):
    box = draw.multiline_textbbox((0,0),body,font=font,spacing=18)
    width,height = box[2]-box[0],box[3]-box[1]
    assert width<990 and height<990
    draw.multiline_text((16+i*1024-box[0],16-box[1]),body,font=font,spacing=18,fill=(223,223,201,255))
    sizes.append([width,height])
letters.save(sys.argv[4],lossless=True,exact=True,method=6)
print(json.dumps(sizes))
''', str(atlas), str(texture), str(font_path), str(text_texture), json.dumps(copy)], check=True, stdout=subprocess.PIPE, text=True)
sizes = json.loads(result.stdout)
up = Vector((0, 0, 1))


def introduction(index, name, selected, height):
    vertices = {i for part in selected for i in parts[part]["vertices"]}
    points = [obj.matrix_world @ obj.data.vertices[i].co for i in vertices]
    polygons = [p for p in obj.data.polygons if all(i in vertices for i in p.vertices)]
    normal = obj.matrix_world.to_3x3() @ max(polygons, key=lambda p: p.area).normal
    normal.z = 0
    normal.normalize()
    center = sum(points, Vector()) / len(points)
    if normal.dot(Vector((-center.x, -center.y, 0))) < 0:
        normal.negate()
    right = Vector((-normal.y, normal.x, 0))
    lo, hi = min(p.dot(right) for p in points), max(p.dot(right) for p in points)
    origin = center + right * (lo - center.dot(right))
    origin.z = max(p.z for p in points)
    origin += normal * .018
    width, pixel_height = sizes[index]
    scale = min((hi - lo) * .98 / width, height / pixel_height)
    w, h = width * scale, pixel_height * scale
    # The backdrop curves horizontally; conform the paper so letters stay in front.
    columns, rows = 24, 2
    points, faces = [], []
    for j in range(rows+1):
        for i in range(columns+1):
            point = origin + right*w*i/columns - up*h*(1-j/rows)
            hit, surface, surface_normal, _ = backdrop.ray_cast(point+normal*2,-normal)
            assert hit and (surface-point).length < .75, f"Text outside backdrop: {name}"
            if surface_normal.dot(normal)<0: surface_normal.negate()
            points.append(surface+surface_normal*.025)
    stride = columns+1
    for j in range(rows):
        for i in range(columns):
            a=j*stride+i
            faces.append((a,a+1,a+1+stride,a+stride))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points,[],faces)
    mesh.update()
    text = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(text)
    uv = mesh.uv_layers.new(name="UVMap")
    x0,x1 = (16+index*1024)/2048,(16+index*1024+width)/2048
    y0,y1 = 1-(16+pixel_height)/1024,1-16/1024
    for loop in mesh.loops:
        i,j = loop.vertex_index%stride,loop.vertex_index//stride
        uv.data[loop.index].uv = (x0+(x1-x0)*i/columns,y0+(y1-y0)*j/rows)
    text["text"] = copy[index]
    text["source_parts"] = ",".join(map(str, sorted(selected)))
    text["max_width"] = hi - lo
    text["max_height"] = height
    created.append(text)


introduction(0, "spring-introduction-left", {2, 3}, 2.8)
introduction(1, "spring-introduction-right", {1}, 1.88)
bpy.ops.object.select_all(action="DESELECT")
for item in created:
    item.data.materials.clear()
    item.select_set(True)
output = ROOT / "public/models/spring-introduction.glb"
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", use_selection=True, export_materials="NONE", export_texcoords=True, export_extras=True, export_vertex_color="NONE")
for path, expected in original_hashes.items():
    assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, f"Original changed: {path}"
assert output.stat().st_size < 100000
print(json.dumps({"meshes": len(created), "model_bytes": output.stat().st_size, "texture_bytes": texture.stat().st_size, "text_texture_bytes": text_texture.stat().st_size, "originals_unchanged": True}))
