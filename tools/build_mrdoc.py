import bpy, math, os
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
parts=[]
def mat(n,c,metal=0):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True
 p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=.72;p.inputs['Metallic'].default_value=metal
 return m
skin=mat('Warm peach',(.78,.49,.32));white=mat('Ivory coat',(.91,.93,.93));dark=mat('Charcoal',(.035,.043,.052));hair=mat('Soft black',(.012,.015,.019));gold=mat('Gold frames',(.55,.38,.10),.5);brown=mat('Brown eyes',(.12,.065,.035));ivory=mat('Eye whites',(.97,.95,.90));pink=mat('Ear and lips',(.48,.20,.15))
def finish(o,n,m,b):
 o.name=n;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 parts.append((o,b));return o
def ell(n,p,s,m,b='Head',seg=24,rings=16):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=p);o=bpy.context.object;o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,n,m,b)
def tube(n,pts,r,m,b='Head'):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2;c.resolution_u=8
 sp=c.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
 for q,p in zip(sp.bezier_points,pts):q.co=p;q.handle_left_type='AUTO';q.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return finish(o,n,m,b)
def limb(n,a,b,r,m,bone):
 o=ell(n,(Vector(a)+Vector(b))/2,(r,r,(Vector(b)-Vector(a)).length/2+r*.3),m,bone);o.rotation_euler=(Vector(b)-Vector(a)).to_track_quat('Z','Y').to_euler();return o
ell('Face',(0,0,2.05),(.49,.35,.46),skin,seg=40,rings=28)
ell('Neck',(0,0,1.57),(.11,.11,.16),skin,'Neck')
ell('Shirt',(0,0,1.12),(.25,.17,.43),dark,'Chest')
# Coat shell with open front.
verts=[];faces=[]
for z,rx,ry in [(.48,.32,.205),(.75,.30,.19),(1.16,.26,.18),(1.48,.235,.16)]:
 for j in range(29):
  a=.30+(2*math.pi-.60)*j/28;verts.append((rx*math.sin(a),-ry*math.cos(a),z))
for k in range(3):
 for j in range(28):a=k*29+j;faces.append((a,a+1,a+30,a+29))
me=bpy.data.meshes.new('Coat');me.from_pydata(verts,[],faces);o=bpy.data.objects.new('Tailored coat',me);bpy.context.collection.objects.link(o);finish(o,o.name,white,'Spine');mod=o.modifiers.new('Fabric thickness','SOLIDIFY');mod.thickness=.012
for s in [-1,1]:
 ell('Ear',(s*.485,0,1.98),(.095,.065,.125),skin)
 ell('Ear inset',(s*.495,-.055,1.99),(.052,.018,.072),pink)
 ell('Eye white',(s*.205,-.312,2.075),(.151,.055,.148),ivory)
 ell('Iris',(s*.205,-.361,2.075),(.092,.023,.119),brown,'Eye'+str(s))
 ell('Pupil',(s*.205,-.381,2.09),(.056,.012,.082),hair,'Eye'+str(s))
 ell('Eye sparkle',(s*.205-.028,-.395,2.13),(.025,.009,.032),ivory,'Eye'+str(s))
 pts=[(s*.205+.174*math.cos(a),-.395,2.075+.151*math.sin(a)) for a in [i*math.tau/32 for i in range(33)]]
 tube('Spectacle rim',pts,.012,gold)
 tube('Glasses temple',[(s*.37,-.39,2.10),(s*.48,-.19,2.11),(s*.50,.02,2.04)],.011,gold)
 tube('Eyebrow',[(s*.09,-.325,2.27),(s*.20,-.34,2.30),(s*.32,-.30,2.27)],.018,hair)
 ell('Trouser',(s*.14,0,.36),(.105,.125,.30),dark,'Leg'+str(s))
 ell('Shoe',(s*.14,-.055,.09),(.123,.20,.09),dark,'Foot'+str(s))
 limb('Sleeve',(s*.24,0,1.42),(s*.36,-.015,1.12),.105,white,'Arm'+str(s))
 limb('Fore sleeve',(s*.36,-.015,1.12),(s*.40,-.05,.88),.088,white,'ForeArm'+str(s))
 ell('Palm',(s*.40,-.05,.80),(.07,.045,.095),skin,'Hand'+str(s))
 for i in range(4):limb('Finger',(s*(.35+i*.031),-.05,.77),(s*(.35+i*.031),-.06,.69+abs(i-1.5)*.014),.016,skin,'Finger'+str(s)+str(i))
 limb('Thumb',(s*.35,-.05,.82),(s*.32,-.09,.75),.023,skin,'Hand'+str(s))
 tube('Lapel',[(s*.10,-.18,1.49),(s*.21,-.195,1.35),(s*.14,-.207,1.27),(s*.19,-.20,1.22),(s*.09,-.20,1.04)],.033,white,'Chest')
 ell('Pocket',(s*.23,-.178,.77),(.075,.023,.095),white,'Spine')
 tube('Pocket seam',[(s*.16,-.203,.82),(s*.23,-.211,.81),(s*.29,-.19,.82)],.006,dark,'Spine')
for z in [.91,.78,.65]:ell('Coat button',(-.085,-.212,z),(.017,.01,.017),gold,'Spine',12,8)
tube('Bridge',[(-.045,-.397,2.10),(0,-.415,2.12),(.045,-.397,2.10)],.01,gold)
ell('Nose',(0,-.35,1.99),(.036,.04,.045),skin)
tube('Smile',[(-.085,-.321,1.88),(0,-.35,1.86),(.085,-.321,1.88)],.009,pink)
ell('MouthOpen',(0,-.342,1.865),(.055,.012,.004),pink,'Jaw')
# Layered sculptural hair, individual tapered curved locks.
ell('Hair crown',(0,.065,2.34),(.51,.36,.36),hair)
for s in [-1,1]:
 for i in range(5):
  x=s*(.07+i*.087)
  o=ell('Swept fringe',(x,-.215+i*.016,2.37-i*.018),(.09,.14,.24-i*.012),hair)
  o.rotation_euler[1]=s*(-.35-i*.11)
 for i in range(3):ell('Side locks',(s*(.43+i*.012),.01+i*.08,2.20-i*.06),(.085,.17,.20),hair)
tube('Cowlick',[(0,.02,2.62),(.035,.015,2.73),(.11,.02,2.76)],.032,hair)
tube('Stethoscope',[(-.105,-.18,1.51),(-.16,-.235,1.32),(-.12,-.24,1.12),(0,-.245,1.07),(.12,-.24,1.18),(.11,-.20,1.49)],.018,dark,'Chest')
ell('Chestpiece',(.12,-.255,1.16),(.047,.015,.047),gold,'Chest')
# Skeleton, with every visible component skinned to a named joint.
bpy.ops.object.armature_add();rig=bpy.context.object;rig.name='MrDocRig';bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones.remove(rig.data.edit_bones[0])
def bone(n,h,t,parent=None):
 b=rig.data.edit_bones.new(n);b.head=h;b.tail=t
 if parent:b.parent=rig.data.edit_bones[parent]
bone('Hips',(0,0,.60),(0,0,.85));bone('Spine',(0,0,.85),(0,0,1.15),'Hips');bone('Chest',(0,0,1.15),(0,0,1.45),'Spine');bone('Neck',(0,0,1.45),(0,0,1.65),'Chest');bone('Head',(0,0,1.65),(0,0,2.35),'Neck');bone('Jaw',(0,-.3,1.89),(0,-.3,1.82),'Head')
for s in [-1,1]:
 bone('Eye'+str(s),(s*.205,-.32,2.075),(s*.205,-.42,2.075),'Head')
 bone('Arm'+str(s),(s*.24,0,1.42),(s*.36,-.015,1.12),'Chest');bone('ForeArm'+str(s),(s*.36,-.015,1.12),(s*.40,-.05,.88),'Arm'+str(s));bone('Hand'+str(s),(s*.40,-.05,.88),(s*.40,-.05,.76),'ForeArm'+str(s))
 bone('Leg'+str(s),(s*.14,0,.61),(s*.14,0,.25),'Hips');bone('Foot'+str(s),(s*.14,0,.25),(s*.14,-.13,.08),'Leg'+str(s))
 for i in range(4):bone('Finger'+str(s)+str(i),(s*(.35+i*.031),-.05,.77),(s*(.35+i*.031),-.06,.69),'Hand'+str(s))
bpy.ops.object.mode_set(mode='OBJECT')
for o,b in parts:
 vg=o.vertex_groups.new(name=b);vg.add(list(range(len(o.data.vertices))),1,'REPLACE');mod=o.modifiers.new('Character skeleton','ARMATURE');mod.object=rig;o.parent=rig
rig.animation_data_create()
for name,duration in [('idle',120),('wave',72),('think',120),('talk_one',96),('explain',120),('reassure',96)]:
 action=bpy.data.actions.new(name);rig.animation_data.action=action
 for f in range(1,duration+2,6):
  t=(f-1)/duration;w=math.sin(t*math.tau);en=math.sin(math.pi*t)**2
  for p in rig.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0)
  rig.pose.bones['Chest'].rotation_euler[0]=.018*w
  rig.pose.bones['Head'].rotation_euler[1]=.025*w
  if name=='wave':
   rig.pose.bones['Arm-1'].rotation_euler[1]=-1.9*en;rig.pose.bones['ForeArm-1'].rotation_euler[0]=-.6*en;rig.pose.bones['Hand-1'].rotation_euler[2]=.25*math.sin(t*math.tau*3)*en
  if name=='think':rig.pose.bones['ForeArm1'].rotation_euler[0]=-1.9*en;rig.pose.bones['Head'].rotation_euler[1]=-.12*en
  if name in ['talk_one','explain']:
   for s in [-1,1]:rig.pose.bones['ForeArm'+str(s)].rotation_euler[0]=-(.45 if name=='talk_one' else .85)*en;rig.pose.bones['Arm'+str(s)].rotation_euler[1]=s*.2*en
  if name=='reassure':rig.pose.bones['ForeArm-1'].rotation_euler[0]=-1.5*en;rig.pose.bones['Head'].rotation_euler[0]=.10*en
  for p in rig.pose.bones:p.keyframe_insert('rotation_euler',frame=f,group=p.name)
 action.use_fake_user=True
rig.animation_data.action=None
for p in rig.pose.bones:p.rotation_euler=(0,0,0)
bpy.context.scene.render.fps=24
bpy.ops.object.select_all(action='SELECT')
os.makedirs(os.path.join(ROOT,'assets','mrdoc-source'),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets','mrdoc-source','mrdoc.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'assets','mrdoc-v2.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS')
print('MRDOC COMPLETE',len(parts))
