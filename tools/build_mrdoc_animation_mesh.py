import bpy
import os
import math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "white_mesh_smooth.blend")
OUTPUT = os.path.join(ROOT, "white_mesh_animation_ready.blend")

bpy.ops.wm.open_mainfile(filepath=SOURCE)
source = bpy.data.objects["MrDoc_Character"]
source_mesh = source.data

collection = bpy.data.collections.new("Mr.Doc Animation Mesh")
bpy.context.scene.collection.children.link(collection)

def part_for(center):
    x, _, z = center
    if z > 0.34:
        return "head"
    if z < -0.87:
        return "foot.L" if x > 0 else "foot.R"
    if z < -0.64:
        return "shin.L" if x > 0 else "shin.R"
    if z < -0.45:
        return "thigh.L" if x > 0 else "thigh.R"
    if abs(x) > 0.30 and z < -0.15:
        return "hand.L" if x > 0 else "hand.R"
    if abs(x) > 0.30 and z < 0.03:
        return "forearm.L" if x > 0 else "forearm.R"
    if abs(x) > 0.30 and z < 0.33:
        return "upper_arm.L" if x > 0 else "upper_arm.R"
    return "chest"

faces_by_part = {}
for polygon in source_mesh.polygons:
    center = polygon.center
    faces_by_part.setdefault(part_for(center), []).append(tuple(polygon.vertices))

def make_mesh(name, source_faces):
    used = sorted({vertex for face in source_faces for vertex in face})
    remap = {old: new for new, old in enumerate(used)}
    vertices = [source_mesh.vertices[index].co.copy() for index in used]
    faces = [tuple(remap[index] for index in face) for face in source_faces]
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.materials.append(source_mesh.materials[0])
    data.update()
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    obj.matrix_world = source.matrix_world.copy()
    for polygon in data.polygons:
        polygon.use_smooth = True
    return obj

parts = {name: make_mesh(name, faces) for name, faces in faces_by_part.items() if faces}
source.hide_set(True)
source.hide_render = True

# Reduce each independent piece; this preserves silhouette while making animation
# and the final GLB practical for the application.
for obj in parts.values():
    modifier = obj.modifiers.new("Mobile mesh reduction", "DECIMATE")
    modifier.ratio = 0.22
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)

bpy.ops.object.select_all(action="DESELECT")
bpy.ops.object.armature_add(enter_editmode=True)
rig = bpy.context.object
rig.name = "MrDoc_Animation_Rig"
rig.data.name = "MrDoc_Animation_Skeleton"
for item in list(rig.data.edit_bones):
    rig.data.edit_bones.remove(item)

def bone(name, head, tail, parent=None, deform=True):
    item = rig.data.edit_bones.new(name)
    item.head, item.tail, item.use_deform = head, tail, deform
    if parent:
        item.parent = rig.data.edit_bones[parent]
    return item

bone("root", (0, 0, -1.0), (0, 0, -0.78), deform=False)
bone("pelvis", (0, 0, -0.78), (0, 0, -0.48), "root")
bone("chest", (0, 0, -0.48), (0, 0, 0.30), "pelvis")
bone("neck", (0, 0, 0.30), (0, 0, 0.43), "chest")
bone("head", (0, 0, 0.43), (0, 0, 0.92), "neck")
for side, sign in (("L", 1), ("R", -1)):
    bone(f"upper_arm.{side}", (sign * 0.20, 0, 0.27), (sign * 0.36, 0, 0.04), "chest")
    bone(f"forearm.{side}", (sign * 0.36, 0, 0.04), (sign * 0.40, -0.01, -0.18), f"upper_arm.{side}")
    bone(f"hand.{side}", (sign * 0.40, -0.01, -0.18), (sign * 0.40, -0.10, -0.31), f"forearm.{side}")
    bone(f"thigh.{side}", (sign * 0.12, 0, -0.48), (sign * 0.12, 0, -0.70), "pelvis")
    bone(f"shin.{side}", (sign * 0.12, 0, -0.70), (sign * 0.12, 0, -0.91), f"thigh.{side}")
    bone(f"foot.{side}", (sign * 0.12, 0, -0.91), (sign * 0.12, -0.18, -0.98), f"shin.{side}")
bpy.ops.object.mode_set(mode="OBJECT")
rig.show_in_front = True

for name, obj in parts.items():
    group = obj.vertex_groups.new(name=name)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")
    modifier = obj.modifiers.new("Mr.Doc Armature", "ARMATURE")
    modifier.object = rig

rig.animation_data_create()
for name, frames in (("idle", 120), ("wave", 72), ("think", 96), ("talk_one", 96), ("explain", 120), ("reassure", 96)):
    action = bpy.data.actions.new(name)
    rig.animation_data.action = action
    for frame in range(1, frames + 1, 6):
        t = (frame - 1) / max(1, frames - 1)
        for pose_bone in rig.pose.bones:
            pose_bone.rotation_mode = "XYZ"
            pose_bone.rotation_euler = (0, 0, 0)
        rig.pose.bones["chest"].rotation_euler[0] = 0.012 * math.sin(t * math.tau)
        rig.pose.bones["head"].rotation_euler[1] = 0.018 * math.sin(t * math.tau)
        ease = math.sin(t * math.pi) ** 2
        if name == "wave":
            rig.pose.bones["upper_arm.R"].rotation_euler[1] = 1.0 * ease
            rig.pose.bones["forearm.R"].rotation_euler[0] = -0.45 * ease
            rig.pose.bones["hand.R"].rotation_euler[2] = 0.19 * math.sin(t * math.tau * 3) * ease
        elif name == "think":
            rig.pose.bones["forearm.R"].rotation_euler[0] = -0.70 * ease
            rig.pose.bones["head"].rotation_euler[1] = -0.09 * ease
        elif name in ("talk_one", "explain"):
            amount = 0.18 if name == "talk_one" else 0.35
            rig.pose.bones["forearm.L"].rotation_euler[0] = -amount * ease
            rig.pose.bones["forearm.R"].rotation_euler[0] = -amount * ease
        elif name == "reassure":
            rig.pose.bones["forearm.R"].rotation_euler[0] = -0.48 * ease
            rig.pose.bones["head"].rotation_euler[0] = 0.07 * ease
        for pose_bone in rig.pose.bones:
            pose_bone.keyframe_insert("rotation_euler", frame=frame)
    action.use_fake_user = True
rig.animation_data.action = None

bpy.context.view_layer.objects.active = rig
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT)
triangle_count = sum(len(obj.data.polygons) for obj in parts.values())
print(f"Saved {OUTPUT}; pieces: {len(parts)}; triangles: {triangle_count}")
