import bpy
import os
import math
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "white_mesh_smooth.blend")
OUTPUT = os.path.join(ROOT, "white_mesh_custom_rig.blend")

bpy.ops.wm.open_mainfile(filepath=SOURCE)
mesh = bpy.data.objects.get("MrDoc_Character")
if mesh is None or mesh.type != "MESH":
    raise RuntimeError("MrDoc_Character mesh not found")

rig_collection = bpy.data.collections.new("Mr.Doc Custom Rig")
bpy.context.scene.collection.children.link(rig_collection)
rig_mesh = mesh.copy()
rig_mesh.data = mesh.data.copy()
rig_mesh.name = "MrDoc_Rigged"
rig_collection.objects.link(rig_mesh)
for collection in list(rig_mesh.users_collection):
    if collection != rig_collection:
        collection.objects.unlink(rig_mesh)
mesh.hide_set(True)
mesh.hide_render = True

# Keep the visible silhouette while reducing the dense sculpt to a practical
# mobile-animation budget before assigning any rig weights.
bpy.context.view_layer.objects.active = rig_mesh
reduction = rig_mesh.modifiers.new("Mobile mesh reduction", "DECIMATE")
reduction.ratio = 0.19
bpy.ops.object.modifier_apply(modifier=reduction.name)

bpy.ops.object.select_all(action="DESELECT")
bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
rig = bpy.context.object
rig.name = "MrDoc_Custom_Rig"
rig.data.name = "MrDoc_Custom_Skeleton"
for item in list(rig.data.edit_bones):
    rig.data.edit_bones.remove(item)

def bone(name, head, tail, parent=None, deform=True):
    item = rig.data.edit_bones.new(name)
    item.head, item.tail, item.use_deform = head, tail, deform
    if parent:
        item.parent = rig.data.edit_bones[parent]
        item.use_connect = False
    return item

bone("root", (0, 0, -1.0), (0, 0, -0.78), deform=False)
bone("pelvis", (0, 0, -0.78), (0, 0, -0.48), "root")
bone("spine", (0, 0, -0.48), (0, 0, -0.08), "pelvis")
bone("chest", (0, 0, -0.08), (0, 0, 0.28), "spine")
bone("neck", (0, 0, 0.28), (0, 0, 0.43), "chest")
bone("head", (0, 0, 0.43), (0, 0, 0.92), "neck")
for side, sign in (("L", 1), ("R", -1)):
    bone(f"clavicle.{side}", (0, 0, 0.24), (sign * 0.19, 0, 0.28), "chest")
    bone(f"upper_arm.{side}", (sign * 0.19, 0, 0.28), (sign * 0.36, 0, 0.04), f"clavicle.{side}")
    bone(f"forearm.{side}", (sign * 0.36, 0, 0.04), (sign * 0.40, -0.01, -0.23), f"upper_arm.{side}")
    bone(f"hand.{side}", (sign * 0.40, -0.01, -0.23), (sign * 0.40, -0.10, -0.34), f"forearm.{side}")
    bone(f"thigh.{side}", (sign * 0.12, 0, -0.52), (sign * 0.12, 0, -0.76), "pelvis")
    bone(f"shin.{side}", (sign * 0.12, 0, -0.76), (sign * 0.12, 0, -0.95), f"thigh.{side}")
    bone(f"foot.{side}", (sign * 0.12, 0, -0.95), (sign * 0.12, -0.17, -0.98), f"shin.{side}")

bpy.ops.object.mode_set(mode="OBJECT")
rig.show_in_front = True
bpy.ops.object.select_all(action="DESELECT")
rig_mesh.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
try:
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    binding = "automatic weights"
except RuntimeError as error:
    rig_mesh.parent = rig
    mod = rig_mesh.modifiers.new("Armature", "ARMATURE")
    mod.object = rig
    binding = f"empty groups fallback: {error}"

# This imported sculpt has a dense triangulated shell, for which Blender's heat
# solver can produce empty groups.  Use deliberate body regions instead: the
# outer sleeves must not borrow the coat's front panels when an arm raises.
if not any(vertex.groups for vertex in rig_mesh.data.vertices):
    rig_mesh.vertex_groups.clear()
    deform_bones = [item for item in rig.data.bones if item.use_deform]
    groups = {item.name: rig_mesh.vertex_groups.new(name=item.name) for item in deform_bones}
    for vertex in rig_mesh.data.vertices:
        point = vertex.co
        x, z = point.x, point.z
        side = "L" if x > 0 else "R"
        if z > 0.36:
            name = "head"
        elif z < -0.87:
            name = f"foot.{side}"
        elif z < -0.63:
            name = f"shin.{side}"
        elif z < -0.46:
            name = f"thigh.{side}"
        elif abs(x) > 0.285 and z < -0.17:
            name = f"hand.{side}"
        elif abs(x) > 0.285 and z < 0.04:
            name = f"forearm.{side}"
        elif abs(x) > 0.265 and z < 0.31:
            name = f"upper_arm.{side}"
        elif z > 0.24:
            name = "neck"
        elif z > 0.02:
            name = "chest"
        elif z > -0.30:
            name = "spine"
        else:
            name = "pelvis"
        groups[name].add([vertex.index], 1.0, "REPLACE")
    binding += "; repaired with sleeve-safe custom weights"

rig.animation_data_create()
for name, frames in (("idle", 120), ("wave", 72), ("think", 96), ("talk_one", 96), ("explain", 120), ("reassure", 96)):
    action = bpy.data.actions.new(name)
    rig.animation_data.action = action
    for frame in range(1, frames + 1, 6):
        t = (frame - 1) / max(1, frames - 1)
        for pose_bone in rig.pose.bones:
            pose_bone.rotation_mode = "XYZ"
            pose_bone.rotation_euler = (0, 0, 0)
        rig.pose.bones["chest"].rotation_euler[0] = 0.015 * math.sin(t * math.tau)
        rig.pose.bones["head"].rotation_euler[1] = 0.02 * math.sin(t * math.tau)
        ease = math.sin(t * math.pi) ** 2
        if name == "wave":
            rig.pose.bones["upper_arm.R"].rotation_euler[1] = 0.16 * ease
            rig.pose.bones["forearm.R"].rotation_euler[0] = -0.10 * ease
            rig.pose.bones["hand.R"].rotation_euler[2] = 0.08 * math.sin(t * math.tau * 3) * ease
        elif name == "think":
            rig.pose.bones["forearm.R"].rotation_euler[0] = -1.05 * ease
            rig.pose.bones["head"].rotation_euler[1] = -0.10 * ease
        elif name in ("talk_one", "explain"):
            amount = 0.30 if name == "talk_one" else 0.55
            rig.pose.bones["forearm.L"].rotation_euler[0] = -amount * ease
            rig.pose.bones["forearm.R"].rotation_euler[0] = -amount * ease
        elif name == "reassure":
            rig.pose.bones["forearm.R"].rotation_euler[0] = -0.75 * ease
            rig.pose.bones["head"].rotation_euler[0] = 0.08 * ease
        for pose_bone in rig.pose.bones:
            pose_bone.keyframe_insert("rotation_euler", frame=frame)
    action.use_fake_user = True
rig.animation_data.action = None

bpy.context.view_layer.objects.active = rig
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT)
print(f"Saved {OUTPUT}; binding: {binding}; triangles: {len(rig_mesh.data.polygons)}")
