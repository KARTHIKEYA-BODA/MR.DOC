import bpy, math, os
from mathutils import Quaternion
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Keep the rejected draft available in its own saved file; build a new scene.
scene=bpy.data.scenes.new('Mr.Doc • illustrated reference rig');bpy.context.window.scene=scene
img=bpy.data.images.load(os.path.join(ROOT,'assets/mrdoc-reference/approved-turnaround.png'),check_existing=True);img.pack()
w,h=img.size
mat=bpy.data.materials.new('Original artwork • unlit');mat.use_nodes=True
ns=mat.node_tree.nodes;ns.clear();tex=ns.new('ShaderNodeTexImage');tex.image=img;em=ns.new('ShaderNodeEmission');out=ns.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(tex.outputs['Color'],em.inputs['Color']);mat.node_tree.links.new(em.outputs[0],out.inputs['Surface'])
def co(x,y):return ((x-191)/260,0,(711-y)/260)
bpy.ops.object.armature_add();rig=bpy.context.object;rig.name='MrDoc_Illustrated_Rig';bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones.remove(rig.data.edit_bones[0])
def bone(n,a,b,parent=None):
 q=rig.data.edit_bones.new(n);q.head=co(*a);q.tail=co(*b)
 if parent:q.parent=rig.data.edit_bones[parent]
bone('Root',(191,711),(191,640));bone('Body',(191,640),(191,378),'Root');bone('Head',(191,374),(191,230),'Body');bone('GreetingArm',(125,407),(99,560),'Body')
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
parts=[]
def piece(name,points,bone_name,depth=0):
 me=bpy.data.meshes.new(name);v=[(co(x,y)[0],depth,co(x,y)[2]) for x,y in points];me.from_pydata(v,[],[tuple(range(len(v)))]);me.update();uv=me.uv_layers.new()
 for loop in me.loops:
  x,y=points[loop.vertex_index];uv.data[loop.index].uv=(x/w,1-y/h)
 ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob);me.materials.append(mat);vg=ob.vertex_groups.new(name=bone_name);vg.add(list(range(len(v))),1,'REPLACE');mod=ob.modifiers.new('Illustration deformation','ARMATURE');mod.object=rig;ob.parent=rig;parts.append(ob)
# Trace the approved front view; texture coordinates preserve every painted detail.
piece('Coat trousers and shoes',[(159,366),(219,367),(245,389),(270,427),(295,469),(288,516),(272,529),(267,579),(278,642),(242,650),(247,687),(257,701),(250,710),(207,710),(196,694),(194,652),(181,652),(179,692),(183,703),(175,711),(135,711),(133,702),(144,686),(142,648),(112,640),(117,569),(110,530),(99,514),(112,464),(123,411),(141,389)],'Body')
piece('Left sleeve and hand',[(126,407),(145,416),(127,473),(117,517),(116,547),(109,569),(101,577),(94,566),(89,546),(90,521),(98,481),(108,440)],'GreetingArm',-.002)
piece('Exact reference face hair glasses',[(176,374),(148,367),(122,355),(110,342),(93,339),(78,329),(71,309),(76,293),(68,273),(55,242),(53,220),(55,195),(48,186),(62,180),(66,156),(82,131),(109,111),(138,103),(158,103),(168,88),(183,84),(178,96),(199,91),(231,96),(259,108),(280,127),(297,156),(315,177),(329,181),(311,190),(319,215),(316,247),(306,271),(300,290),(312,300),(309,321),(296,337),(282,342),(272,355),(246,368),(215,376)],'Head',-.008)
rig.animation_data_create()
for name,seconds,amp in [('idle',5,.008),('wave',3,.025),('think',5,-.04),('talk_one',4,.018),('explain',5,.022),('reassure',4,.013)]:
 a=bpy.data.actions.new(name);rig.animation_data.action=a
 for frame in range(1,seconds*24+2,3):
  phase=(frame-1)/(seconds*24);pulse=math.sin(math.pi*phase)**2
  for p in rig.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0)
  rig.pose.bones['Head'].rotation_euler[1]=amp*math.sin(phase*math.tau)
  rig.pose.bones['Body'].scale=(1,1,1+.002*math.sin(phase*math.tau))
  if name=='wave':rig.pose.bones['GreetingArm'].rotation_euler[1]=.16*pulse
  if name=='think':rig.pose.bones['Head'].rotation_euler[1]=-.035*pulse
  for p in rig.pose.bones:p.keyframe_insert('rotation_euler',frame=frame);p.keyframe_insert('scale',frame=frame)
 a.use_fake_user=True
rig.animation_data.action=None
for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.scale=(1,1,1)
bpy.ops.object.camera_add(location=(0,-8,1.22));cam=bpy.context.object;cam.rotation_euler=(math.pi/2,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=2.75;scene.camera=cam
scene.world=bpy.data.worlds.new('Paper white');scene.world.color=(1,1,1);scene.render.resolution_x=700;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard';scene.render.film_transparent=True;scene.render.fps=24;scene.frame_end=120
for area in bpy.context.screen.areas:
 if area.type=='VIEW_3D':
  area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.type='MATERIAL';area.spaces.active.overlay.show_overlays=False
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for ob in parts:ob.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets/mrdoc-source/mrdoc-illustrated.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'assets/mrdoc-illustrated.glb'),use_selection=True,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS')
print('Saved illustrated rig using the approved image directly.')
