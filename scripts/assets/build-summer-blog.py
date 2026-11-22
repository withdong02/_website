"""Retain the summer paper world and replace its photo waypoints with blog modules."""
import bpy
import hashlib
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
(ROOT / ".tmp/assets").mkdir(parents=True, exist_ok=True)
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / "scripts/assets"))
from paper_parts import created, extract, parts_of

SOURCE = ROOT / "assets/source/models/Scene_3_Summer-transformed.glb"
EXPECTED = "f43c1f58f8544da08601301a32e05f02e179ef167b1a8027b44a28978e19ebd3"
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == EXPECTED
originals = [SOURCE, ROOT / "public/fonts/SlimeBox.woff"] + [(ROOT / ("assets/source" if i < 4 else "public") / f"textures/Scene_3_Summer_{i}.webp") for i in range(1, 5)]
hashes = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in originals}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
sources = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == "MESH"}
parts = {name: parts_of(obj) for name, obj in sources.items()}
wall_source = sources["Scene_3_Summer_3"]
assert len(parts[wall_source.name]) == 84

# Old ink planes and camera pieces are removed; the full 50-piece route stays intact.
REMOVE = {
    "Scene_3_Summer_1": set(range(1, 46)) - {15},
    "Scene_3_Summer_3": set(range(1, 10)) | {25, 40, 71, 72} | set(range(37, 58)),
    "Scene_3_Summer_4_Bike_Sign_Summer_3_2": {3, 24} | set(range(7, 22)),
}
PHOTOS = {"Scene_3_Summer_Shanghai", "Scene_3_Summer_Austin", "Scene_3_Summer_1_Cali", "Scene_3_Summer_1_Boston"}


def atlas_index(name):
    if name in {"Scene_3_Summer_1", *PHOTOS}: return 1
    if name.startswith("Scene_3_Summer_2"): return 2
    if name == "Scene_3_Summer_3": return 3
    return 4


for name, source in sources.items():
    if name in PHOTOS or any(word in name for word in ("Starbucks", "Figma", "Psychiatrist", "Blender_Sign")):
        continue
    keep = set(range(len(parts[name]))) - REMOVE.get(name, set())
    animated = "seaweed" if "seaweed" in name else "crab" if name.endswith("_Crab") else "umbrella" if name.endswith("_umbrella") else None
    obj = extract(source, parts[name], keep, name, pivot=source.location if animated else None)
    if animated:
        obj["motion"] = animated
    obj["atlas"] = atlas_index(name)
    obj["original_node"] = name
    obj["original_vertices"] = len(obj.data.vertices)

# Blender may suffix a duplicated source name; exported names are made explicit below.
for obj in created:
    obj.name = "summer-" + obj["original_node"]
wall = next(obj for obj in created if obj["original_node"] == "Scene_3_Summer_3")

COPY = {
    "intro-title": "My Blog",
    "intro": "I'm a student focused on\nbackend development.\n\nHere I share my notes,\nexperiments, and projects.",
    "topics": "AI Coding · Java · Spring\nMySQL · Algorithms · Security",
    "articles-title": "Articles", "articles-description": "Notes, experiments,\nand projects.",
    "tags-title": "Tags", "tags-description": "Explore by\nkeyword.",
    "categories-title": "Categories", "categories-description": "Browse by topic.",
    "archives-title": "Archives", "archives-description": "Browse by date.",
}

texture_jobs = []
for index in (1, 2, 3):
    # Masks follow original UV triangles, so unrelated shared-atlas props are untouched.
    mesh = sources[f"Scene_3_Summer_{index}"].data
    selection = {0, 15} if index == 1 else {0} if index == 3 else {2, 16}
    selected = {v for part in selection for v in parts[f"Scene_3_Summer_{index}"][part]["vertices"]}
    triangles = []
    mesh.calc_loop_triangles()
    for triangle in mesh.loop_triangles:
        if all(v in selected for v in triangle.vertices):
            triangles.append([list(mesh.uv_layers.active.data[i].uv) for i in triangle.loops])
    job = {"index": index, "triangles": triangles}
    if index == 2:
        water = {v for part in (0, 1, 3) for v in parts["Scene_3_Summer_2"][part]["vertices"]}
        job["wave_triangles"] = [[list(mesh.uv_layers.active.data[i].uv) for i in triangle.loops]
                                 for triangle in mesh.loop_triangles if all(v in water for v in triangle.vertices)]
    texture_jobs.append(job)

config = {"copy": COPY, "jobs": texture_jobs}
config_path = ROOT / ".tmp/assets/summer-blog-build-input.json"
config_path.parent.mkdir(parents=True, exist_ok=True)
config_path.write_text(json.dumps(config), encoding="utf-8")
result = subprocess.run([shutil.which("python"), "-c", r'''
from PIL import Image, ImageChops, ImageFilter, ImageDraw, ImageFont, ImageStat
import json, math, sys
from pathlib import Path
root=Path(sys.argv[1]); config=json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
source=Image.open(root/'assets/source/textures/Scene_3_Summer_3.webp').convert('RGB')
donor=source.crop((480,1150,740,1330))
grain=ImageChops.subtract(donor,donor.filter(ImageFilter.GaussianBlur(7)),offset=128)
assert ImageStat.Stat(grain).stddev[0]>1

def repair(im, box):
    x0,y0,x1,y1=box
    x0,y0=max(0,x0-12),max(0,y0-12)
    x1,y1=min(im.width,x1+12),min(im.height,y1+12)
    old=im.crop((x0,y0,x1,y1)).convert('RGB'); w,h=old.size
    corners=[(0,0,8,8),(w-8,0,w,8),(0,h-8,8,h),(w-8,h-8,w,h)]
    tl,tr,bl,br=[ImageStat.Stat(old.crop(b)).mean for b in corners]
    grain_pixels=grain.load(); values=[]
    for y in range(h):
        v=y/max(h-1,1)
        for x in range(w):
            u=x/max(w-1,1); g=grain_pixels[x%grain.width,y%grain.height]
            values.append(tuple(max(0,min(255,round((1-v)*((1-u)*tl[c]+u*tr[c])+v*((1-u)*bl[c]+u*br[c])+g[c]-128))) for c in range(3)))
    patch=Image.new('RGB',(w,h)); patch.putdata(values)
    mask=Image.new('L',(w,h)); mask.putdata([min(255,min(x,y,w-1-x,h-1-y)*255//10) for y in range(h) for x in range(w)])
    patched=Image.composite(patch,old,mask)
    assert ImageStat.Stat(ImageChops.subtract(patched,patched.filter(ImageFilter.GaussianBlur(2)),offset=128)).stddev[0]>1
    im.paste(patched,(x0,y0))

for job in config['jobs']:
    index=job['index']; im=Image.open(root/'assets/source'/f'textures/Scene_3_Summer_{index}.webp').convert('RGB')
    if index==3:
        for box in [(85,1363,564,1509),(89,1526,495,1584),(1618,214,1748,652),(1278,926,1363,1045),
                    (304,1605,492,1744),(807,1239,912,1374),(1482,902,1585,1021),(1383,456,1541,667),
                    (756,1325,814,1363),(1590,951,1626,1046),(1523,486,1536,636),(347,1728,448,1742)]:
            repair(im,box)
    if index==1:
        # Six extruded letters leave shallow shadow ink on the retained paper plaque.
        old_grain=grain
        plaque=im.crop((2250,1980,2700,2380))
        grain=ImageChops.subtract(plaque,plaque.filter(ImageFilter.GaussianBlur(7)),offset=128)
        repair(im,(795,2105,2222,2447))
        grain=old_grain
    mask=Image.new('L',im.size); draw=ImageDraw.Draw(mask)
    for triangle in job['triangles']:
        draw.polygon([(round(u*(im.width-1)),round((1-v)*(im.height-1))) for u,v in triangle],fill=255)
    mask=mask.filter(ImageFilter.MaxFilter(5))
    if index in (2,3):
        original=im.copy(); pixels=[]
        for r,g,b in original.get_flattened_data():
            light=(r/177.31 if r>g*1.1 and g>b*1.12 else b/140) if index==2 else r/177.31
            pixels.append(tuple(max(0,min(255,round(light*c))) for c in (23,61,85)))
        recolored=Image.new('RGB',im.size); recolored.putdata(pixels)
        im=Image.composite(recolored,im,mask)
        if index==2:
            wave_mask=Image.new('L',im.size); wave_draw=ImageDraw.Draw(wave_mask)
            for triangle in job['wave_triangles']:
                wave_draw.polygon([(round(u*(im.width-1)),round((1-v)*(im.height-1))) for u,v in triangle],fill=255)
            wave_mask=wave_mask.filter(ImageFilter.MaxFilter(5))
            waves=Image.new('RGB',im.size)
            waves.putdata([tuple(max(0,min(255,round(b/140*c))) for c in (50,90,115)) for r,g,b in original.get_flattened_data()])
            im=Image.composite(waves,im,wave_mask)
    else:
        im=Image.composite(im,Image.new('RGB',im.size),mask)
    im.save(root/f'public/textures/summer-blog-{index}.webp',quality=97,method=6)

# Neutral fibre for independent paper pieces; colors are kept in vertex attributes.
neutral=grain.convert('L').resize((256,256))
neutral.putdata([max(0,min(255,244+(v-128)*2)) for v in neutral.get_flattened_data()])
neutral.convert('RGB').save(root/'public/textures/summer-blog-paper.webp',quality=97,method=6)
font_path=root/'public/fonts/SlimeBox.woff'
letters=Image.new('RGBA',(2048,2048)); draw=ImageDraw.Draw(letters)
x,y,row=16,16,0; regions={}
for name,body in config['copy'].items():
    font=ImageFont.truetype(str(font_path),80 if name.endswith('-title') else 64)
    box=draw.multiline_textbbox((0,0),body,font=font,spacing=18)
    w,h=box[2]-box[0],box[3]-box[1]
    assert w<2000
    if x+w+16>2048: x,y,row=16,y+row+32,0
    assert y+h+16<2048
    ink=(62,65,98,255) if name.endswith('-title') else (218,220,204,255)
    draw.multiline_text((x-box[0],y-box[1]),body,font=font,spacing=18,fill=ink)
    regions[name]=[x,y,w,h]; x+=w+32; row=max(row,h)
letters.save(root/'public/textures/summer-blog-text.webp',lossless=True,exact=True,method=6)
print(json.dumps(regions))
''', str(ROOT), str(config_path)], check=True, stdout=subprocess.PIPE, text=True)
regions = json.loads(result.stdout)


def frame(center):
    center = Vector(center)
    normal = Vector((-center.x, -center.y, 0)).normalized()
    return center, Vector((-normal.y, normal.x, 0)), normal


def face(name, center, outline, color, depth=.10):
    center, right, normal = frame(center)
    vertices = [center+right*x+Vector((0,0,z))+normal*depth for x,z in outline]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], [tuple(range(len(vertices)))])
    mesh.update()
    obj = bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    uv=mesh.uv_layers.new(name="UVMap")
    lo_x,hi_x=min(x for x,z in outline),max(x for x,z in outline)
    lo_z,hi_z=min(z for x,z in outline),max(z for x,z in outline)
    for loop in mesh.loops:
        x,z=outline[loop.vertex_index]
        uv.data[loop.index].uv=((x-lo_x)/(hi_x-lo_x),(z-lo_z)/(hi_z-lo_z))
    obj["paper_color"]=color
    obj["atlas"]="paper"
    created.append(obj)
    return obj


def text(name, center, width, height, wall_text=False):
    x,y,pw,ph=regions[name]
    scale=min(width/pw,height/ph)
    w,h=pw*scale,ph*scale
    center,right,normal=frame(center)
    vertices=[]
    columns=24 if wall_text else 8
    for j in range(3):
        for i in range(columns+1):
            point=center+right*((i/columns-.5)*w)+Vector((0,0,(j/2-.5)*h))
            if wall_text:
                hit,surface,surface_normal,_=wall.ray_cast(point+normal*2,-normal)
                assert hit, f"Text outside wall: {name}"
                if surface_normal.dot(normal)<0: surface_normal.negate()
                point=surface+surface_normal*.035
            else: point+=normal*.15
            vertices.append(point)
    stride=columns+1
    faces=[]
    for j in range(2):
        for i in range(columns):
            a=j*stride+i
            faces.append((a,a+1,a+1+stride,a+stride))
    mesh=bpy.data.meshes.new("summer-"+name)
    mesh.from_pydata(vertices,[],faces); mesh.update()
    obj=bpy.data.objects.new("summer-"+name,mesh)
    bpy.context.collection.objects.link(obj)
    uv=mesh.uv_layers.new(name="UVMap")
    for loop in mesh.loops:
        i,j=loop.vertex_index%stride,loop.vertex_index//stride
        uv.data[loop.index].uv=((x+pw*i/columns)/2048,1-(y+ph*(1-j/2))/2048)
    obj["atlas"]="text"
    obj["text"]=COPY[name]
    created.append(obj)
    return obj


def shifted(center, u=0, z=0):
    center,right,normal=frame(center)
    return center+right*u+Vector((0,0,z))


def rectangle(w,h,fold=False):
    points=[(-w/2,-h/2),(w/2,-h/2),(w/2,h/2-.15 if fold else h/2)]
    if fold: points.append((w/2-.15,h/2))
    return points+[(-w/2,h/2)]


placements=[
    ("articles","Scene_3_Summer_Shanghai",1.8,.90),
    ("tags","Scene_3_Summer_Austin",1.25,.85),
    ("categories","Scene_3_Summer_1_Cali",1.70,.78),
    ("archives","Scene_3_Summer_1_Boston",1.85,1.20),
]
for slug,source_name,w,h in placements:
    center=Vector(sources[source_name].location)
    center.z+=.38 if slug=="articles" else .08
    if slug=="tags":
        outline=[(-w*.5,-h*.38),(w*.3,-h*.5),(w*.5,-h*.15),(w*.5,h*.35),(w*.3,h*.5),(-w*.5,h*.4)]
        face("summer-tags-underlay",shifted(center,.16,.06),outline,"#c48379",.075)
    elif slug=="categories":
        outline=[(-w/2,-h/2),(w/2,-h/2),(w/2,h*.34),(w*.06,h*.34),(-w*.03,h/2),(-w*.37,h/2),(-w*.44,h*.34),(-w/2,h*.34)]
        face("summer-categories-underlay",shifted(center,.10,.10),outline,"#be9e76",.075)
    else: outline=rectangle(w,h,True)
    face(f"summer-{slug}-shadow",shifted(center,.025,-.025),outline,"#112c3f",.065)
    paper=face(f"summer-{slug}-paper",center,outline,"#ddc49e",.10)
    paper["module"]=slug
    paper["source_waypoint"]=source_name
    if slug in ("articles","archives"):
        face(f"summer-{slug}-fold",shifted(center,w/2-.075,h/2-.075),[(-.075,.075),(.075,-.075),(-.075,-.075)],"#b99b73",.115)
    if slug=="archives":
        for side in (-1,1):
            face(f"summer-archives-binding-{side}",shifted(center,side*.53,h/2),rectangle(.09,.26),"#777c9f",.12)
    if slug=="tags":
        ring=shifted(center,-w*.32,h*.18)
        face("summer-tags-hole",ring,[(.055*math.cos(i*math.tau/16),.055*math.sin(i*math.tau/16)) for i in range(16)],"#5b5d78",.13)
    text(f"{slug}-title",shifted(center,0,-.02),w*.88,h*.5)
    if slug=="tags":
        label_center=shifted(center,-1.35,-.10)
        text(f"{slug}-description",label_center,1.55,.60,True)
    else:
        text(f"{slug}-description",shifted(center,0,-h/2-.30),w*1.22,.48 if slug!="articles" else .65,True)

def group_center(source, selected):
    points=[source.matrix_world@source.data.vertices[i].co for part in selected for i in parts[source.name][part]["vertices"]]
    return sum(points,Vector())/len(points)

text("intro-title",group_center(sources["Scene_3_Summer_1"],{0}),2.15,.35)
intro=group_center(wall_source,{25,40})
intro.z=4.14
text("intro",intro,4.15,2.2,True)
topics=group_center(wall_source,{72}); topics.z=2.1
text("topics",topics,4.35,1.0,True)

# Two small flat clouds leave the route and text as the wall's structure.
for index,(angle,z,size) in enumerate([(-137,6.25,.75),(-167,5.95,.52)]):
    phi=math.radians(angle)
    center=Vector((13.95*math.cos(phi),13.95*math.sin(phi),z))
    _,_,normal=frame(center)
    hit,surface,_,_=wall.ray_cast(center+normal*2,-normal)
    assert hit, "Cloud must sit on the actual backdrop"
    center=surface
    outline=[(-.65,-.13),(-.78,.0),(-.73,.16),(-.55,.24),(-.40,.21),(-.32,.42),(-.12,.48),(.07,.40),(.15,.25),(.32,.31),(.51,.24),(.59,.07),(.48,-.12)]
    outline=[(x*size,y*size) for x,y in outline]
    face(f"summer-cloud-{index}-shadow",shifted(center,.025,-.025),outline,"#17384c",.02)
    face(f"summer-cloud-{index}",center,outline,"#a9b6ce",.055)

# A single light paper chime hangs from the actual ceiling, above the wall copy.
hit,anchor,_,_=wall.ray_cast(Vector((-8.15,-8.0,5.0)),Vector((0,0,1)))
assert hit and anchor.z>7, "Wind chime must hang from the original ceiling"
chime=[]


def chime_piece(name, outline, color, depth=.10):
    obj=face("summer-chime-"+name,anchor,outline,color,depth)
    for vertex in obj.data.vertices:
        vertex.co-=anchor
    obj.location=anchor
    obj["wind_chime"]=True
    chime.append(obj)
    return obj


def chime_line(name, start, end, width, color, depth=.10):
    dx,dz=end[0]-start[0],end[1]-start[1]
    length=math.hypot(dx,dz)
    assert length>0
    x,z=-dz*width/(2*length),dx*width/(2*length)
    return chime_piece(name,[(start[0]-x,start[1]-z),(end[0]-x,end[1]-z),
        (end[0]+x,end[1]+z),(start[0]+x,start[1]+z)],color,depth)


chime_line("hanger",(0,0),(0,-.20),.014,"#c9c0a8")
chime_line("bar",(-.75,-.20),(.75,-.20),.045,"#b49d7f")
shell_outline=[(-.14,-.26),(-.48,.08),(-.47,.25),(-.34,.29),(-.28,.40),
    (-.16,.39),(-.07,.46),(.05,.46),(.15,.38),(.29,.39),(.36,.28),(.48,.24),(.49,.08),(.14,-.26)]
for index,(x,length,size,color,ink) in enumerate([
    (-.55,.28,.62,"#e5d2ae","#b69d7e"),
    (0,.48,.72,"#d7a48f","#ad7d6f"),
    (.55,.33,.56,"#b5c7d5","#8da3b8"),
]):
    top=-.20-length
    center=top-.46*size
    chime_line(f"thread-{index}",(x,-.20),(x,top),.011,"#c9c0a8")
    shell=chime_piece(f"shell-{index}",[(x+u*size,center+v*size) for u,v in shell_outline],color)
    shell["shell"]=index
    for rib,u in enumerate((-.32,-.16,0,.16,.32)):
        chime_line(f"rib-{index}-{rib}",(x,center-.18*size),
            (x+u*size,center+(.31 if abs(u)>.2 else .36)*size),.008,ink,.106)
assert len(chime)==23
assert min(v.co.z for obj in chime for v in obj.data.vertices)>-1.3

bpy.ops.object.select_all(action="DESELECT")
for obj in created:
    assert all(math.isfinite(c) for v in obj.data.vertices for c in v.co)
    obj.data.materials.clear()
    obj.select_set(True)
output=ROOT/"public/models/summer-blog.glb"
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",use_selection=True,
    export_materials="NONE",export_texcoords=True,export_extras=True,export_vertex_color="NONE",
    export_draco_mesh_compression_enable=True,export_draco_position_quantization=20,
    export_draco_normal_quantization=16,export_draco_texcoord_quantization=16)
for path,digest in hashes.items():
    assert hashlib.sha256(path.read_bytes()).hexdigest()==digest,f"Original changed: {path}"
assert output.stat().st_size<1200000
print(json.dumps({"meshes":len(created),"model_bytes":output.stat().st_size,"originals_unchanged":True}))
