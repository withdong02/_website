"""Raise the original hanging butterfly and add three small paper companions."""
import bpy
import hashlib
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
sys.dont_write_bytecode = True
sys.path.insert(0,str(ROOT / "scripts/assets"))
from paper_parts import created, extract, parts_of

source = ROOT / "public/models/Scene_2_Spring-transformed.glb"
expected = "07d82fc3bbde38755325dbb97c77689a7e938c7179f92b0c124acefddcce65d7"
assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
props = bpy.data.objects["Scene_2_Spring_2_Baked"]
parts = parts_of(props)
assert len(parts) == 94 and len(parts[0]["vertices"]) == 944
extract(props,parts,set(range(1,94)),"spring-butterfly-surroundings")
butterfly = bpy.data.objects["Scene_2_Spring_2_Baked_Butterfly"]
butterfly_parts = parts_of(butterfly)
assert len(butterfly_parts) == 3
origin = Vector(tuple((a+b)/2 for a,b in zip(butterfly_parts[0]["min"],butterfly_parts[0]["max"])))
x_min,x_max = min(p["min"][0] for p in butterfly_parts),max(p["max"][0] for p in butterfly_parts)
y_min,y_max = min(p["min"][1] for p in butterfly_parts),max(p["max"][1] for p in butterfly_parts)
main_height = 3.85
thread_bottom,thread_top = parts[0]["min"][2],parts[0]["max"][2]
raised_bottom = thread_bottom+main_height-origin.z


def shorten_thread(point, part, bounds):
    point.z = raised_bottom+(point.z-thread_bottom)*(thread_top-raised_bottom)/(thread_top-thread_bottom)
    return point


thread = extract(props,parts,{0},"spring-butterfly-thread",shorten_thread)
thread["original_top"] = thread_top
thread["raised_bottom"] = raised_bottom
assert abs(max(v.co.z for v in thread.data.vertices)-thread_top) < 1e-5

placements = [
    ("main",(origin.x,origin.y,main_height),1,60,None),
    ("apricot",(6.9,-11.0,3.35),.78,55,"#ddbd80"),
    ("lilac",(9.6,-9.0,3.75),.85,65,"#b5a2c2"),
    ("blue",(10.3,-7.0,2.8),.65,50,"#86b8be"),
]
for name,position,size,tilt,color in placements:
    target = Vector(position)
    phi = math.atan2(target.y,target.x)
    tangent = Vector((math.sin(phi),-math.cos(phi),0))
    rotation = Matrix.Rotation(math.radians(tilt),3,tangent)
    inverse = rotation.transposed()

    def place(point, part, bounds):
        return target+rotation@((point-origin)*size)

    for suffix,selected in [("body",{0}),("wings",{1,2})]:
        obj = extract(butterfly,butterfly_parts,selected,f"spring-butterfly-{name}-{suffix}",place,pivot=target)
        obj["butterfly"] = name
        obj["size"] = size
        if color and suffix == "wings":
            obj["paper_color"] = color
            for loop in obj.data.loops:
                old = origin+inverse@obj.data.vertices[loop.vertex_index].co/size
                obj.data.uv_layers.active.data[loop.index].uv = (.02+.96*(old.x-x_min)/(x_max-x_min),.02+.96*(old.y-y_min)/(y_max-y_min))

texture = ROOT / "public/textures/spring-butterfly-paper.webp"
subprocess.run([shutil.which("python"),"-c",r'''
from PIL import Image,ImageChops,ImageFilter,ImageStat
import sys
paper=Image.open(sys.argv[1]).crop((420,420,548,548)).convert('L')
grain=ImageChops.subtract(paper,paper.filter(ImageFilter.GaussianBlur(8)),offset=128)
assert ImageStat.Stat(grain).stddev[0]>1
paper.putdata([max(0,min(255,244+(v-128)*2)) for v in grain.get_flattened_data()])
paper.convert('RGB').save(sys.argv[2],quality=97,method=6)
''',str(ROOT / "assets/source/textures/Scene_2_Spring_1.webp"),str(texture)],check=True)
bpy.ops.object.select_all(action="DESELECT")
for obj in created:
    obj.data.materials.clear()
    obj.select_set(True)
output = ROOT / "public/models/spring-butterflies.glb"
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",use_selection=True,
    export_materials="NONE",export_texcoords=True,export_extras=True,export_vertex_color="NONE",
    export_draco_mesh_compression_enable=True,export_draco_position_quantization=20,
    export_draco_normal_quantization=16,export_draco_texcoord_quantization=16)
assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
assert len(created) == 10 and output.stat().st_size < 600000
print(json.dumps({"meshes":len(created),"model_bytes":output.stat().st_size,"paper_bytes":texture.stat().st_size,
    "main_height":main_height,"original_height":origin.z,"thread_top_unchanged":True}))
