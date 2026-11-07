"""Build paper autumn and winter outfits around the approved boy's head and rig."""
import bpy
import hashlib
import json
import math
import struct
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from paper_parts import created, parts_of, extract, paper_polygon

SOURCE = ROOT / "public/models/Moving_Characters-transformed.glb"
SPRING = ROOT / "public/models/spring-boy.glb"
SUMMER = ROOT / "public/models/summer-boy.glb"
SOURCE_SHA = "4f7290dc7b5033217906b43fccffc4071f3096002e4dad0a383541cabc504e30"
SPRING_SHA = "50881fd38e692ca166cd45459104fb8edeff7a6cd42566ced804dbff61350d6a"
FRONT_HEAD_SHA = "aa7fd67c92a3d40b4168aee68d27af08ff8bb843050e4c6d54b06a0485334f90"
summer_sha = hashlib.sha256(SUMMER.read_bytes()).hexdigest()
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SOURCE_SHA
assert hashlib.sha256(SPRING.read_bytes()).hexdigest() == SPRING_SHA
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
bpy.ops.import_scene.gltf(filepath=str(SPRING))

BLUE = (.24,.785,.32,.825)
RED = (.765,.705,.80,.75)
WHITE = (.070312,.984375,.085938,.996094)
PANTS = (.9140625,.0234375,.9296875,.0390625)
SHOE = (.03125,.083984,.0625,.115234)
SKIN = (.070312,.71875,.09375,.742188)
CREAM = (.96,.88,.70,1)
GOLD = (.82,.51,.14,1)


def original(suffix):
    return bpy.data.objects["Moving_Characters_" + suffix]


def plane(obj, part):
    points = [obj.matrix_world @ obj.data.vertices[v].co for v in part["vertices"]]
    left, right = min(points,key=lambda p:p.x), max(points,key=lambda p:p.x)
    tilt = (right.y-left.y)/(right.x-left.x)
    return tilt, left.y-tilt*left.x


spring_front_plane = plane(original("Spring_front"),parts_of(original("Spring_front"))[6])
spring_side_plane = plane(original("Spring_side"),parts_of(original("Spring_side"))[5])


def mapped(point, old_plane, new_plane, dx, dz):
    x = point.x
    point.x += dx
    point.z += dz
    point.y = new_plane[1]+new_plane[0]*point.x + point.y-old_plane[1]-old_plane[0]*x
    return point


def copy_piece(obj, selected, name, transform, pivot=None):
    return extract(obj,parts_of(obj),selected,name,
                   lambda p,part,bounds:transform(p),pivot=pivot)


def join(body, pieces):
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    for obj in pieces:
        # Blender fills missing vertex colors with black when joining tinted paper.
        if not obj.data.color_attributes.active_color:
            colors=obj.data.color_attributes.new(name="Color",type="FLOAT_COLOR",domain="CORNER")
            for color in colors.data:
                color.color=(1,1,1,1)
        obj.select_set(True)
    bpy.context.view_layer.objects.active=body
    bpy.ops.object.join()
    for obj in pieces:
        created.remove(obj)


def add_paper(obj, outline, patch, target_plane, depth, tint=(1,1,1,1)):
    start=len(obj.data.vertices)
    paper_polygon(obj,outline,target_plane[1]+depth,patch,smooth=.23,tint=tint)
    for vertex in list(obj.data.vertices)[start:]:
        vertex.co.y += target_plane[0]*vertex.co.x


def oval(cx,cz,rx,rz):
    return [(cx+rx*math.cos(i*math.tau/24),cz+rz*math.sin(i*math.tau/24)) for i in range(24)]


def front_head(body,prefix,target_plane,dx,dz):
    approved=bpy.data.objects["boy-front-body"]
    parts=parts_of(approved)
    selected={i for i,p in enumerate(parts) if p["min"][2]>.90}
    assert len(selected)==8, "Keep face, hair, ears, brows and mouth, not neck/clothes"
    transform=lambda p:mapped(p,spring_front_plane,target_plane,dx,dz)
    head=copy_piece(approved,selected,prefix+"-head-input",transform)
    join(body,[head])
    # The front head still matches its approved source; only the profile changed.
    body["approved_spring_sha256"]=FRONT_HEAD_SHA
    for side in ("left","right"):
        eye=bpy.data.objects["boy-front-eye-"+side]
        copy_piece(eye,set(range(len(parts_of(eye)))),prefix+"-eye-"+side,transform,
                   pivot=tuple(transform(eye.matrix_world.translation.copy())))


def export_model(filename,count):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in created:
        colors=obj.data.color_attributes.active_color
        assert not colors or all(min(c.color[:3])>.001 for c in colors.data), "Missing colors would blacken the shared atlas"
        obj.select_set(True)
    bpy.context.view_layer.objects.active=created[0]
    target=ROOT/"public/models"/filename
    bpy.ops.export_scene.gltf(filepath=str(target),export_format="GLB",use_selection=True,
        export_materials="NONE",export_texcoords=True,export_extras=True,
        export_vertex_color="ACTIVE",export_all_vertex_colors=False)
    data=target.read_bytes()
    doc=json.loads(data[20:20+struct.unpack_from("<I",data,12)[0]])
    assert len(doc["meshes"])==count and not doc.get("images")
    print(filename,len(data),"bytes;",count,"independent nodes")


# Autumn: short diagonal-front jacket, restrained gold fasteners, unchanged crane.
fall=original("Fall_character")
fall_parts=parts_of(fall)
assert len(fall_parts)==54
fall_plane=plane(fall,fall_parts[11])
kept={19,20,25,26,31,32,33}|set(range(34,54))


def fall_shape(p,part,bounds):
    if part==19:
        p.y+=.012
    return p


body=extract(fall,fall_parts,kept,"boy-autumn-body",fall_shape,
             solid_parts={41:SHOE,42:SHOE,43:SHOE,44:SHOE})
add_paper(body,[(-.18,.59),(.16,.59),(.16,.18),(.025,.18),(-.01,.36),(-.05,.18),(-.18,.18)],PANTS,fall_plane,-.002)
add_paper(body,[(-.11,.94),(.09,.94),(.20,.90),(.23,.53),(-.25,.53),(-.23,.90)],RED,fall_plane,-.012)
add_paper(body,[(-.10,.95),(-.01,.91),(.08,.95),(.07,.90),(-.01,.86),(-.11,.90)],WHITE,fall_plane,-.015,CREAM)
add_paper(body,[(.07,.91),(.09,.895),(-.055,.765),(-.055,.54),(-.073,.54),(-.073,.775)],WHITE,fall_plane,-.016,CREAM)
for x,z in ((-.05,.775),(-.064,.69)):
    add_paper(body,oval(x,z,.014,.008),WHITE,fall_plane,-.018,GOLD)
add_paper(body,[(.11,.79),(.13,.825),(.158,.83),(.15,.80)],WHITE,fall_plane,-.018,GOLD)
front_head(body,"boy-autumn",fall_plane,-.012,.042)
for suffix,sign in (("left_arm",1),("right_arm",-1)):
    source=original("Fall_"+suffix)
    arm=extract(source,parts_of(source),{1},"boy-autumn-"+suffix.replace("_","-"),
                pivot=tuple(source.matrix_world.translation),solid_parts={1:SKIN})
    center=-.024
    outline=[(center+sign*x,z) for x,z in [( .14,.93),(.25,.91),(.45,.66),(.38,.59),(.28,.65),(.14,.80)]]
    p=(0,source.matrix_world.translation.y-.003)
    # add_paper uses world outlines; convert arm-local points after construction.
    start=len(arm.data.vertices)
    paper_polygon(arm,outline,p[1],RED,smooth=.23)
    paper_polygon(arm,[(center+sign*x,z) for x,z in [(.325,.69),(.45,.65),(.42,.60),(.30,.645)]],p[1]-.002,WHITE,smooth=.2,tint=CREAM)
    for vertex in list(arm.data.vertices)[start:]:
        vertex.co-=arm.location
crane_points={tuple(round(c,5) for c in v.co) for v in body.data.vertices}
crane_parts={20,25,26,31,32}|set(range(34,41))|set(range(45,54))
assert all(tuple(round(c,5) for c in fall.matrix_world@fall.data.vertices[v].co) in crane_points
           for part in crane_parts for v in fall_parts[part]["vertices"]),"Crane geometry changed"
assert body.ray_cast(Vector((-.012,-1,.94)),Vector((0,1,0)))[0],"Autumn collar gap"
export_model("autumn-boy.glb",5)
created.clear()

# Winter front: the same face under a knitted beanie, cropped coat and scarf.
winter_front=original("Winter_front_character")
front_body_parts=parts_of(winter_front)
winter_head=original("Winter_head_front")
winter_head_parts=parts_of(winter_head)
winter_front_plane=plane(winter_head,winter_head_parts[5])
body=extract(winter_front,front_body_parts,set(range(1,8)),"boy-winter-front-body",
             solid_parts={2:PANTS,3:PANTS,4:WHITE,5:WHITE,6:SHOE,7:SHOE})
add_paper(body,[(-.09,.97),(.08,.97),(.10,.82),(-.11,.82)],SKIN,winter_front_plane,.003)
add_paper(body,[(-.13,.89),(.12,.89),(.21,.82),(.22,.39),(-.24,.39),(-.23,.82)],BLUE,winter_front_plane,-.005,(.80,.85,.96,1))
add_paper(body,[(-.02,.83),(.012,.83),(.012,.40),(-.02,.40)],BLUE,winter_front_plane,-.008,(.55,.63,.80,1))
for x in (-.16,.10):
    add_paper(body,[(x,.57),(x+.07,.57),(x+.07,.554),(x,.554)],WHITE,winter_front_plane,-.009,CREAM)
add_paper(body,[(-.14,.915),(.13,.915),(.15,.865),(.08,.84),(-.15,.87)],WHITE,winter_front_plane,-.012,CREAM)
add_paper(body,[(.035,.88),(.115,.86),(.105,.63),(.035,.66)],WHITE,winter_front_plane,-.013,CREAM)
front_head(body,"boy-winter-front",winter_front_plane,-.007,-.025)


def front_hat(p,part,bounds):
    old_x=p.x
    p.x=-.01+(p.x+.01)*1.10
    p.z-=.16
    # Retain the folded band's front/back depth so its rear UV faces stay hidden.
    p.y+=winter_front_plane[0]*(p.x-old_x)-.015
    return p


hat=extract(winter_head,winter_head_parts,{0,1,4},"winter-front-hat-input",front_hat)
join(body,[hat])
for suffix,sign in (("arm_left_front",1),("arm_right_front",-1)):
    source=original("Winter_"+suffix)
    arm=extract(source,parts_of(source),{1},"boy-winter-front-"+("left-arm" if sign==1 else "right-arm"),
                pivot=tuple(source.matrix_world.translation),solid_parts={1:WHITE})
    start=len(arm.data.vertices)
    depth=source.matrix_world.translation.y-.003
    paper_polygon(arm,[(sign*x,z) for x,z in [(.17,.84),(.25,.84),(.43,.52),(.36,.455),(.30,.50),(.17,.70)]],depth,BLUE,smooth=.25,tint=(.80,.85,.96,1))
    paper_polygon(arm,[(sign*x,z) for x,z in [(.335,.54),(.43,.50),(.40,.45),(.31,.49)]],depth-.002,WHITE,smooth=.22,tint=CREAM)
    for vertex in list(arm.data.vertices)[start:]:
        vertex.co-=arm.location
assert body.ray_cast(Vector((-.007,-1,.88)),Vector((0,1,0)))[0],"Winter front neck gap"

# Walking profile: keep original limb pivots and separate normal/smile visibility.
side=original("Winter_side")
side_parts=parts_of(side)
winter_side_plane=plane(side,side_parts[7])
side_body=extract(side,side_parts,{10},"boy-winter-side-body")
side_body["approved_spring_sha256"]=SPRING_SHA
add_paper(side_body,[(-.16,1.23),(-.015,1.23),(-.005,1.08),(-.18,1.08)],SKIN,winter_side_plane,.003)
add_paper(side_body,[(-.17,1.16),(.01,1.16),(.10,1.03),(.13,.61),(.08,.54),(-.26,.54),(-.28,.65),(-.24,1.02)],BLUE,winter_side_plane,-.005,(.80,.85,.96,1))
add_paper(side_body,[(-.24,1.17),(.05,1.17),(.07,1.11),(-.02,1.08),(-.25,1.12)],WHITE,winter_side_plane,-.010,CREAM)
add_paper(side_body,[(-.06,1.13),(.015,1.12),(.005,.88),(-.07,.90)],WHITE,winter_side_plane,-.012,CREAM)
add_paper(side_body,[(-.025,.76),(.055,.76),(.055,.744),(-.025,.744)],WHITE,winter_side_plane,-.009,CREAM)
approved_side=bpy.data.objects["boy-side-body"]
approved_side_parts=parts_of(approved_side)
head_ids={i for i,p in enumerate(approved_side_parts) if p["min"][2]>1.05}
assert len(head_ids)==4,"Expected side face, two hair layers and ear"
side_transform=lambda p:mapped(p,spring_side_plane,winter_side_plane,-.18,.045)
head=copy_piece(approved_side,head_ids,"winter-side-head-input",side_transform)
for vertex in head.data.vertices:
    # Tuck the raised front tufts inside the cap; keep the visible fringe unchanged.
    old_x=vertex.co.x
    if vertex.co.x>.04 and vertex.co.z>1.82:
        vertex.co.x=.04+(vertex.co.x-.04)*.60
        vertex.co.z=1.82+(vertex.co.z-1.82)*.65
    if vertex.co.x<-.43 and vertex.co.z>1.74:
        vertex.co.x=-.43+(vertex.co.x+.43)*.40
    vertex.co.y+=winter_side_plane[0]*(vertex.co.x-old_x)
scalp_points=[v.co.copy() for v in head.data.vertices if v.co.z>=1.82]
join(side_body,[head])


def side_hat(p,part,bounds):
    old_x=p.x
    p.x=-.10+(p.x+.10)*1.10
    p.z-=.22
    # Enclose the boy's wider crown while retaining the folded brim and its depth.
    rear=max(0,min(1,(-p.x-.22)/.20))
    if part==1:
        p.x-=.14*rear*max(0,min(1,(2.09-p.z)/.16))
        p.z=1.81+(p.z-1.81)*1.35
    elif part==2:
        p.x-=.055*rear
        p.z=1.666+(p.z-1.666)*1.15
    elif part==0:
        p.z+=.10
    if p.x<-.12:
        p.x=-.12+(p.x+.12)*.75
    p.y+=winter_side_plane[0]*(p.x-old_x)-.018
    return p


hat=extract(side,side_parts,{0,1,2},"winter-side-hat-input",side_hat)
for point in scalp_points:
    hit,location,_,_=hat.ray_cast(Vector((point.x,-1,point.z)),Vector((0,1,0)))
    assert hit and location.y<point.y-.001, f"Winter hat leaves upper scalp exposed: {tuple(point)}, hit={hit}, depth={location.y}"
join(side_body,[hat])
for old,new in (("boy-side-face-details","boy-winter-side-face"),("boy-side-eye","boy-winter-side-eye"),("boy-side-smile","boy-winter-side-smile")):
    obj=bpy.data.objects[old]
    pivot=tuple(side_transform(obj.matrix_world.translation.copy()))
    copy_piece(obj,set(range(len(parts_of(obj)))),new,side_transform,pivot=pivot)
for suffix in ("left_arm","right_arm"):
    obj=original("Winter_"+suffix)
    arm=extract(obj,parts_of(obj),{1},"boy-winter-side-"+suffix.replace("_","-"),
                pivot=tuple(obj.matrix_world.translation),solid_parts={1:WHITE})
    start=len(arm.data.vertices)
    depth=obj.matrix_world.translation.y-.002
    paper_polygon(arm,[(-.16,1.13),(.00,1.12),(.005,.75),(-.02,.69),(-.15,.69),(-.19,.78)],depth,BLUE,smooth=.24,tint=(.80,.85,.96,1))
    paper_polygon(arm,[(-.15,.755),(.005,.755),(.00,.70),(-.15,.70)],depth-.002,WHITE,smooth=.2,tint=CREAM)
    for vertex in list(arm.data.vertices)[start:]:
        vertex.co-=arm.location
for suffix in ("left_foot","right_foot"):
    obj=original("Winter_"+suffix)
    extract(obj,parts_of(obj),{0,1,2},"boy-winter-side-"+suffix.replace("_","-"),
            pivot=tuple(obj.matrix_world.translation),solid_parts={0:PANTS,1:WHITE,2:SHOE})
assert side_body.ray_cast(Vector((-.10,-1,1.13)),Vector((0,1,0)))[0],"Winter side scarf gap"
export_model("winter-boy.glb",13)
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==SOURCE_SHA
assert hashlib.sha256(SPRING.read_bytes()).hexdigest()==SPRING_SHA
assert hashlib.sha256(SUMMER.read_bytes()).hexdigest()==summer_sha
print("Approved spring/summer and original assets unchanged; crane retained; all four walking pivots retained")
