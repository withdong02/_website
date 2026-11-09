"""Build a thin paper Echo from the copied original SVG; retain upstream assets."""
import bpy
import hashlib
import json
import math
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "public/models/Scene_2_Spring-transformed.glb"
atlas = ROOT / "public/textures/Scene_2_Spring_1.webp"
originals = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in (source, atlas)}
svg = ET.parse(ROOT / "public/images/spring-echo.svg").getroot()
path = svg.find("{*}path")
eyes = svg.findall("{*}circle")
assert len(eyes) == 2
tokens = re.findall(r"[A-Za-z]|-?\d+(?:\.\d+)?", path.attrib["d"])
assert tokens[:1] == ["M"] and tokens[-1] == "Z"
point = (float(tokens[1]), float(tokens[2]))
outline = [point]
i = 3
while i < len(tokens)-1:
    assert tokens[i] == "C", "Recheck SVG conversion if the original commands change"
    x1,y1,x2,y2,x3,y3 = map(float,tokens[i+1:i+7])
    x0,y0 = point
    for step in range(1,17):
        t = step/16
        outline.append(((1-t)**3*x0+3*(1-t)**2*t*x1+3*(1-t)*t*t*x2+t**3*x3,
                        (1-t)**3*y0+3*(1-t)**2*t*y1+3*(1-t)*t*t*y2+t**3*y3))
    point = (x3,y3)
    i += 7
assert point == outline[0]
outline.pop()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
slime = bpy.data.objects["Scene_2_Spring_2_Baked_Slime"]
points = [v.co for v in slime.data.vertices]
normal = max(slime.data.polygons,key=lambda p:p.area).normal.copy()
normal.z = 0
normal.normalize()
assert normal.dot(-slime.location) > 0, "Echo must face the scene"
right = Vector((-normal.y,normal.x,0))
lo_x,hi_x = min(x for x,y in outline),max(x for x,y in outline)
lo_y,hi_y = min(y for x,y in outline),max(y for x,y in outline)
bottom,top = min(p.z for p in points),max(p.z for p in points)
scale = (top-bottom)/(hi_y-lo_y)
center = right * ((min(p.dot(right) for p in points)+max(p.dot(right) for p in points))/2)
depth = max(p.dot(normal) for p in points)
created = []


def paper(name, contour, front, color, tile):
    # Keep the SVG proportions and a very thin edge, rather than a rounded toy.
    verts = [center + right*((x-(lo_x+hi_x)/2)*scale) + normal*d + Vector((0,0,bottom+(hi_y-y)*scale))
             for d in (front-.018,front) for x,y in contour]
    n = len(contour)
    faces = [list(range(n)),list(range(2*n-1,n-1,-1))]
    faces += [(a,a+n,(a+1)%n+n,(a+1)%n) for a in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj = bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    uv = mesh.uv_layers.new(name="PaperUV")
    for loop in mesh.loops:
        x,y = contour[loop.vertex_index%n]
        uv.data[loop.index].uv = ((tile*256+8+(x-lo_x)/(hi_x-lo_x)*240)/512,
                                (8+(hi_y-y)/(hi_y-lo_y)*240)/256)
    obj["paper_color"] = color
    obj["source_outline"] = path.attrib["d"]
    created.append(obj)
    return obj


paper("spring-echo-body",outline,depth,path.attrib["fill"],0)
for index,eye in enumerate(eyes):
    x,y,r = (float(eye.attrib[k]) for k in ("cx","cy","r"))
    circle = [(x+r*math.cos(t*math.tau/48),y+r*math.sin(t*math.tau/48)) for t in range(48)]
    obj = paper("spring-echo-eye-"+str(index+1),circle,depth+.022,eye.attrib["fill"],1)
    obj["source_eye"] = [x,y,r]

texture = ROOT / "public/textures/spring-echo.webp"
subprocess.run([shutil.which("python"),"-c",r'''
from PIL import Image,ImageChops,ImageFilter,ImageStat
import sys
paper=Image.open(sys.argv[1]).crop((420,420,676,676)).convert('L')
grain=ImageChops.subtract(paper,paper.filter(ImageFilter.GaussianBlur(8)),offset=128)
out=Image.new('RGB',(512,256))
for index,color in enumerate(sys.argv[3:]):
    rgb=tuple(bytes.fromhex(color.lstrip('#')))
    tile=Image.new('RGB',(256,256))
    tile.putdata([tuple(max(0,min(255,round(c*(1+(v-128)/128)))) for c in rgb) for v in grain.get_flattened_data()])
    out.paste(tile,(index*256,0))
out.save(sys.argv[2],quality=97,method=6)
assert ImageStat.Stat(grain).stddev[0]>1,'Paper grain missing'
''',str(atlas),str(texture),path.attrib["fill"],eyes[0].attrib["fill"]],check=True)
bpy.ops.object.select_all(action="DESELECT")
for obj in created:
    obj.select_set(True)
output = ROOT / "public/models/spring-echo.glb"
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",use_selection=True,
    export_materials="NONE",export_texcoords=True,export_extras=True)
for p,expected in originals.items():
    assert hashlib.sha256(p.read_bytes()).hexdigest() == expected, f"Original changed: {p}"
assert len(created)==3 and output.stat().st_size<100000
print(json.dumps({"meshes":3,"model_bytes":output.stat().st_size,"texture_bytes":texture.stat().st_size,
    "body_color":path.attrib["fill"],"originals_unchanged":True}))
