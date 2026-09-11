"""Run with Blender's bpy Python module or blender -b -P build_assets.py."""
import bpy, math, os
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(ROOT,'assets');os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
M={}
for name,color in {'teal':(.06,.65,.51,1),'mint':(.37,.94,.66,1),'cream':(1,.82,.43,1),'dark':(.035,.07,.14,1),'white':(1,1,.96,1),'pink':(.99,.25,.40,1),'purple':(.32,.15,.63,1),'gold':(1,.57,.10,1),'stone':(.18,.25,.38,1),'grass':(.13,.47,.39,1),'wood':(.28,.16,.20,1),'blue':(.13,.55,1,1)}.items():
 m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=color;bs.inputs['Roughness'].default_value=.62
 M[name]=m

def ball(name,p,s,mat,ico=False):
 if ico:bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=p)
 else:bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=p)
 o=bpy.context.object;o.name=name;o.scale=s;o.data.materials.append(M[mat])
 if not ico:
  for f in o.data.polygons:f.use_smooth=True
 return o

def cone(name,p,r1,r2,depth,mat,verts=10):
 bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=r1,radius2=r2,depth=depth,location=p)
 o=bpy.context.object;o.name=name;o.data.materials.append(M[mat]);return o

def box(name,p,s,mat,bevel=.08):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.scale=s
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(M[mat])
 if bevel:
  b=o.modifiers.new('Soft edges','BEVEL');b.width=bevel;b.segments=2
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=b.name)
 return o

def mesh(name,vs,faces,mat):
 d=bpy.data.meshes.new(name);d.from_pydata(vs,[],faces);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.data.materials.append(M[mat]);return o

def start():
 bpy.ops.object.select_all(action='DESELECT');return set(bpy.data.objects)
def export(name,before):
 objs=set(bpy.data.objects)-before
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.glb'),export_format='GLB',use_selection=True,export_animations=False)
 for o in objs:o.hide_set(True)
 print('ASSET',name,len(objs),flush=True)

b=start()
ball('Round dragon body',(0,0,.9),(.58,.78,.65),'teal');ball('Belly',(0,-.56,.8),(.43,.22,.42),'cream')
ball('Big head',(0,-.42,1.51),(.63,.58,.55),'mint');ball('Muzzle',(0,-.89,1.38),(.43,.28,.25),'cream')
for side in [-1,1]:
 ball('Eye',(side*.35,-.85,1.66),(.18,.085,.23),'white');ball('Pupil',(side*.35,-.923,1.67),(.092,.04,.145),'dark');ball('Eye glint',(side*.32,-.956,1.73),(.03,.02,.04),'white')
 ear=cone('Horn',(side*.42,-.1,2.04),.15,0,.43,'gold');ear.rotation_euler[1]=side*.35
 ball('Foot',(side*.40,-.3,.27),(.23,.38,.22),'teal');ball('Hand',(side*.60,-.1,.92),(.18,.30,.23),'mint')
 for toe in [-1,0,1]:ball('Toe',(side*.40+toe*.07,-.60,.25),(.055,.09,.06),'cream')
tail=cone('Tail',(0,.83,.70),.23,.04,.9,'teal');tail.rotation_euler[0]=-.9
for i in range(3):cone('Spine',(0,.1+i*.3,1.45-i*.14),.15,0,.25,'gold')
export('beast',b)
b=start();ball('Shell',(0,.2,1.08),(.67,.73,.53),'purple')
for x,y in [(0,.1),(-.34,.3),(.34,.3),(0,.60)]:ball('Shell plate',(x,y,1.5),(.26,.27,.10),'gold',True)
export('shell',b)
b=start()
for side in [-1,1]:
 vs=[(side*.3,.2,1.1),(side*1.6,.2,2.05),(side*1.35,.8,1.10),(side*.95,.95,1.4),(side*.55,1.0,1.1)]
 mesh('Wing',vs,[(0,1,2),(0,2,3),(0,3,4)],'pink')
 box('Wing bone',(side*.85,.22,1.58),(.10,.10,1.40),'cream').rotation_euler[1]=side*.9
export('wings',b)
b=start();box('Cannon mount',(0,.2,1.9),(.45,.6,.3),'gold')
o=cone('Watermelon cannon',(0,-.12,2.14),.25,.20,.95,'teal');o.rotation_euler[0]=math.pi/2
ball('Cannon muzzle',(0,-.60,2.14),(.20,.05,.20),'dark');export('cannon',b)
b=start();ball('Robot body',(0,0,.8),(.58,.48,.62),'purple',True);box('Visor',(0,-.44,.99),(.7,.09,.21),'dark')
for x in [-.20,.20]:ball('Robot eye',(x,-.51,1),(.085,.06,.07),'pink')
for x in [-.38,.38]:ball('Wheel',(x,0,.3),(.2,.30,.3),'stone');box('Arm',(x*1.7,0,.75),(.25,.25,.55),'gold')
cone('Antenna',(0,0,1.55),.05,.03,.4,'gold');ball('Antenna lamp',(0,0,1.8),(.12,.12,.12),'pink');export('robot',b)
b=start();cone('Crystal lower',(0,0,.24),0,.30,.50,'blue',6);cone('Crystal upper',(0,0,.73),.30,0,.50,'mint',6);export('crystal',b)
b=start();cone('Island rock',(0,0,-1.0),6.0,10,2.5,'stone',16);cone('Grass rim',(0,0,.1),10,10,.35,'grass',16)
for i in range(12):
 a=i*math.tau/12
 ball('Cliff', (math.cos(a)*8.8,math.sin(a)*8.8,-.7),(1.5,1.4,1.5),'stone',True)
export('island',b)
b=start();cone('Trunk',(0,0,.8),.18,.12,1.6,'wood');ball('Canopy',(0,0,2),(.9,.9,1.1),'teal',True);ball('Canopy light',(.3,-.3,2.4),(.7,.7,.7),'mint',True);export('tree',b)
b=start();cone('Pedestal',(0,0,.25),.8,.8,.5,'stone');cone('Gold rim',(0,0,.52),.83,.83,.09,'gold');ball('Upgrade orb',(0,0,1.2),(.42,.42,.42),'gold',True);export('shrine',b)
# Preserve the editable Blender source, with all library models in collections.
for o in bpy.data.objects:o.hide_set(False)
source=os.path.join(ROOT,'../../art/beast');os.makedirs(source,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(source,'beast-assets.blend'))
print('BLENDER VERSION',bpy.app.version_string,flush=True)
