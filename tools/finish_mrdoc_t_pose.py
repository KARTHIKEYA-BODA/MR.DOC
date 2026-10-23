import bpy, os
from mathutils import Matrix, Vector
root=r'C:\Users\BODA SHIVA KUMAR\OneDrive\Desktop\V2_MR.DOC'
src=os.path.join(root,'white_mesh_natural_rig.blend'); out=os.path.join(root,'white_mesh_t_pose.blend')
bpy.ops.wm.open_mainfile(filepath=src)
scene=bpy.context.scene; rig=bpy.data.objects['MrDoc_NaturalRig']; mesh=bpy.data.objects['MrDoc_Character']
# Reassign arm influences from the torso/coat region to the torso bones. The
# lateral sleeves and hands retain their original skin weights.
arm_names=[f'{part}.{side}' for side in ('L','R') for part in ('clavicle','upper_arm','forearm','hand','thumb')]
arm_groups={n:mesh.vertex_groups.get(n) for n in arm_names}
by_name={g.name:g for g in mesh.vertex_groups}; chest=by_name['chest']; pelvis=by_name['pelvis']; spine=by_name['spine']
changed=0
arm_indices={g.index for g in arm_groups.values() if g}
for v in mesh.data.vertices:
 x,y,z=v.co
 if abs(x) >= .22: continue
 memberships={a.group:a.weight for a in v.groups}
 moved=sum(w for gi,w in memberships.items() if gi in arm_indices)
 if moved:
  changed+=1
  for gi in arm_indices:
   if gi in memberships: mesh.vertex_groups[gi].remove([v.index])
  (pelvis if z < -.22 else spine if z < .02 else chest).add([v.index],moved,'ADD')# Build a reusable one-frame action with horizontally aligned arm chains.
for b in rig.pose.bones:
 b.rotation_mode='QUATERNION'; b.rotation_quaternion=(1,0,0,0); b.location=(0,0,0); b.scale=(1,1,1)
a=bpy.data.actions.new('T_Pose'); a.use_fake_user=True; a['mrdoc_clip_start']=1; a['mrdoc_clip_end']=2
rig.animation_data_create(); rig.animation_data.action=a
scene.frame_set(1); bpy.context.view_layer.update()
for side,direction in [('L',(1,0,0)),('R',(-1,0,0))]:
 for name in [f'clavicle.{side}',f'upper_arm.{side}',f'forearm.{side}',f'hand.{side}']:
  b=rig.pose.bones[name]; head=b.head.copy(); q=Vector(direction).to_track_quat('Y','Z')
  b.matrix=Matrix.Translation(head) @ q.to_matrix().to_4x4(); bpy.context.view_layer.update(); b.rotation_mode='QUATERNION'
  b.keyframe_insert(data_path='rotation_quaternion',frame=1,group=name); b.keyframe_insert(data_path='location',frame=1,group=name)
scene.frame_start=1; scene.frame_end=2; scene.frame_set(1); rig.data.pose_position='POSE'
bpy.ops.wm.save_as_mainfile(filepath=out)
print('SAVED',out,'ACTION',a.name,'CURVES',len(a.fcurves),'TORSO_VERTICES_REWEIGHTED',changed)


