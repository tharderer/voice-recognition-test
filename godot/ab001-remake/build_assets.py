"""Run with Blender's bpy Python module or blender -b -P build_assets.py."""
import bpy, math, os
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(ROOT,'assets');os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
M={}
for name,color in {'teal':(.05,.36,.41,1),'mint':(.37,.94,.66,1),'cream':(1,.82,.43,1),'dark':(.035,.07,.14,1),'white':(1,1,.96,1),'pink':(.99,.25,.40,1),'purple':(.32,.15,.63,1),'gold':(1,.57,.10,1),'stone':(.35,.29,.24,1),'grass':(.13,.47,.39,1),'wood':(.28,.16,.20,1),'blue':(.12,.28,.58,1),'skin':(.56,.32,.18,1),'beard':(.20,.16,.14,1),'sand':(.65,.43,.23,1),'ivory':(.92,.82,.62,1),'clay':(.60,.34,.20,1),'red':(.62,.18,.16,1),'leaf':(.15,.36,.22,1),'gray':(.43,.40,.33,1)}.items():
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
 col=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(col)
 for o in objs:
  for old in list(o.users_collection):old.objects.unlink(o)
  col.objects.link(o);o.hide_set(True)
 print('ASSET',name,len(objs),flush=True)

def person(name,robe,scarf,elder=False,female=False,staff=False):
 b=start()
 cone('Robe',(0,0,.85),.40,.26,1.45,robe,16)
 ball('Shoulders',(0,0,1.46),(.39,.21,.25),robe)
 ball('Head',(0,-.01,1.90),(.245,.21,.31),'skin')
 ball('Nose',(0,-.22,1.9),(.065,.09,.095),'skin')
 for side in [-1,1]:
  ball('Eye white',(side*.096,-.201,1.97),(.052,.028,.036),'ivory')
  ball('Eye',(side*.096,-.226,1.97),(.024,.014,.027),'dark')
  box('Brow',(side*.096,-.225,2.035),(.09,.025,.022),'beard',.01)
  ball('Arm'+('L' if side<0 else 'R'),(side*.4,0,1.2),(.14,.14,.37),robe)
  ball('Hand',(side*.43,-.06,.91),(.10,.09,.14),'skin')
  ball('Foot'+('L' if side<0 else 'R'),(side*.19,-.08,.10),(.14,.24,.095),'wood')
 if not female:
  ball('Beard',(0,-.145,1.70),(.22,.14,.28),'beard')
  if elder:
   for x in [-.15,0,.15]:ball('Gray streak',(x,-.252,1.66),(.035,.018,.19),'gray')
 else:
  ball('Head veil',(0,.03,1.94),(.28,.23,.36),scarf)
  # Face remains open; veil drapes at the back and sides.
  ball('Face',(0,-.14,1.90),(.20,.12,.27),'skin')
  for side in [-1,1]:
   ball('Eye',(side*.085,-.248,1.97),(.023,.014,.025),'dark')
  box('Veil fall',(0,.19,1.48),(.52,.12,.73),scarf,.06)
 if not female:
  ball('Head cloth',(0,.02,2.14),(.27,.225,.16),scarf)
  box('Cloth tail',(.19,.13,1.89),(.13,.12,.62),scarf,.04)
 box('Sash',(0,-.27,1.12),(.49,.075,.12),scarf,.015)
 for z in [.42,.68,.94]:box('Robe fold',(.18,-.27,z),(.02,.02,.20),scarf,.005)
 if staff:
  o=cone('Staff',(.63,-.12,1.08),.028,.026,2.16,'wood',8);o.rotation_euler[1]=-.08
  ball('Staff grip',(.57,-.12,1.36),(.055,.05,.12),'skin')
 export(name,b)
person('abram','blue','ivory',True,False,True)
person('sarai','teal','ivory',False,True)
person('lot','red','sand')
person('worker','sand','teal')
b=start()
ball('Wool body',(0,0,.67),(.36,.55,.36),'ivory')
for x in [-.20,.20]:
 for y in [-.31,.31]:cone('Leg',(x,y,.27),.065,.075,.5,'beard',8)
ball('Sheep head',(0,-.55,.78),(.19,.26,.19),'beard')
for x in [-.22,.22]:ball('Ear',(x,-.49,.82),(.14,.055,.065),'ivory')
for x in [-.075,.075]:ball('Eye',(x,-.76,.84),(.025,.018,.025),'white')
ball('Tail',(0,.55,.70),(.12,.16,.12),'ivory');export('sheep',b)
b=start()
ball('Donkey body',(0,0,.99),(.41,.70,.45),'gray')
for x in [-.26,.26]:
 for y in [-.44,.44]:cone('Leg',(x,y,.42),.075,.11,.84,'stone',8)
neck=ball('Neck',(0,-.57,1.4),(.24,.29,.50),'gray');neck.rotation_euler[0]=-.35
ball('Head',(0,-.78,1.87),(.25,.32,.24),'gray');ball('Muzzle',(0,-1.01,1.78),(.22,.23,.16),'ivory')
for x in [-.14,.14]:
 ball('Ear',(x,-.59,2.19),(.09,.095,.30),'gray');ball('Eye',(x,-1.045,1.94),(.026,.022,.03),'dark')
box('Saddle blanket',(0,0,1.42),(.80,.78,.08),'red')
for x in [-.44,.44]:box('Packed pannier',(x,0,1.18),(.32,.65,.45),'wood')
ball('Bedroll',(0,.2,1.65),(.30,.23,.17),'ivory');export('donkey',b)
b=start()
ball('Wolf body',(0,.1,.64),(.25,.54,.26),'stone',True)
for x in [-.17,.17]:
 for y in [-.27,.40]:cone('Leg',(x,y,.30),.045,.07,.6,'stone',8)
ball('Neck',(0,-.35,.83),(.23,.27,.32),'gray',True);ball('Head',(0,-.55,.98),(.23,.23,.23),'gray',True)
ball('Muzzle',(0,-.78,.90),(.13,.25,.13),'ivory');ball('Nose',(0,-.98,.91),(.08,.065,.075),'dark')
for x in [-.15,.15]:cone('Ear',(x,-.42,1.20),.105,0,.30,'stone',6);ball('Eye',(x,-.69,1.03),(.028,.021,.027),'gold')
tail=ball('Tail',(0,.69,.68),(.12,.43,.12),'stone',True);tail.rotation_euler[0]=-.6;export('wolf',b)
b=start();box('Mudbrick house',(0,0,1.45),(4.2,3.8,2.9),'sand');box('Roof',(0,0,2.96),(4.55,4.1,.25),'ivory')
box('Door',(0,-1.91,.9),(1.1,.05,1.8),'wood',.03)
for x in [-1.4,1.4]:box('Window',(x,-1.925,1.85),(.50,.035,.65),'beard',.025)
for i in range(6):box('Roof beam',(-1.9+i*.75,-2.10,2.78),(.16,.45,.15),'wood')
export('house',b)
b=start()
for x in [-1.8,1.8]:
 for y in [-1.2,1.2]:box('Post',(x,y,1.35),(.13,.13,2.7),'wood')
for i in range(6):box('Striped canopy',(-1.6+i*.64,0,2.66),(.65,2.8,.09),'red' if i%2 else 'ivory',.015)
box('Market counter',(0,-.25,.75),(3.4,1.1,.30),'wood')
for x in [-1,0,1]:ball('Grain sack',(x,-.2,1.08),(.28,.29,.31),'ivory')
export('market',b)
b=start()
for x in [-2.6,2.6]:box('Gate pillar',(x,0,2),(1.3,1.5,4),'sand');box('Cap',(x,0,4.1),(1.5,1.7,.25),'ivory')
box('Lintel',(0,0,3.65),(4.5,1.35,.65),'ivory');export('gate',b)
b=start()
for i in range(12):
 a=i*math.tau/12;o=box('Well stone',(math.cos(a)*.9,math.sin(a)*.9,.47),(.48,.38,.30),'ivory');o.rotation_euler[2]=a
 o=box('Well stone',(math.cos(a+.12)*.9,math.sin(a+.12)*.9,.17),(.48,.38,.30),'sand');o.rotation_euler[2]=a+.12
cone('Water',(0,0,.19),.75,.75,.03,'blue',24)
for x in [-1.18,1.18]:box('Well post',(x,0,1.18),(.16,.16,2.36),'wood')
box('Well crossbar',(0,0,2.37),(2.5,.16,.16),'wood');cone('Rope',(0,0,1.42),.012,.012,1.9,'ivory',6);export('well',b)
b=start();ball('Rock',(0,0,.75),(1.15,.9,.92),'stone',True);ball('Rock face',(.30,-.15,.95),(.78,.7,.72),'gray',True);export('rock',b)
b=start();trunk=cone('Palm trunk',(0,0,1.7),.24,.13,3.4,'wood',10)
for i in range(8):
 a=i*math.tau/8
 vs=[(0,0,3.45),(math.cos(a-.2)*.7,math.sin(a-.2)*.7,3.75),(math.cos(a)*2.3,math.sin(a)*2.3,2.8),(math.cos(a+.2)*.7,math.sin(a+.2)*.7,3.75)]
 mesh('Palm leaf',vs,[(0,1,2),(0,2,3)],'leaf')
export('palm',b)
b=start();ball('Travel sack',(0,0,.35),(.45,.34,.40),'ivory');box('Sack tie',(0,0,.70),(.22,.12,.06),'wood');cone('Clay jar',(.45,.10,.33),.23,.16,.65,'clay',12);cone('Jar neck',(.45,.10,.70),.12,.12,.13,'clay',12);export('supplies',b)
b=start()
for i in range(3):box('Plank',((i-1)*.18,0,.14+i*.08),(.30,1.9,.12),'wood',.025)
export('wood',b)
b=start()
for i in range(18):box('Bridge plank',(0,-4.3+i*.5,.07),(4.6,.44,.15),'wood',.02)
for x in [-2.1,2.1]:box('Bridge runner',(x,0,-.08),(.16,9.3,.25),'sand')
export('bridge',b)
b=start();cone('Firewood',(0,0,.15),.48,.3,.3,'wood',8)
for x,y in [(-.1,0),(.2,.2),(0,-.1)]:cone('Flame',(x,y,.5),.15,0,.8,'gold',6)
export('camp',b)
source=os.path.join(ROOT,'../../art/ab001-remake');os.makedirs(source,exist_ok=True)
# Models stay in named collections in the editable library.
for o in bpy.data.objects:o.hide_set(False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(source,'ab001-assets.blend'))
print('Created actual AB001 models with Blender',bpy.app.version_string,flush=True)
