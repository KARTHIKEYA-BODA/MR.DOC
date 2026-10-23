import bpy
import math
import os
from mathutils import Vector


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "white_mesh_smooth.blend")
OUTPUT = os.path.join(ROOT, "white_mesh_natural_rig.blend")
GLB_OUTPUT = os.path.join(ROOT, "assets", "mrdoc-v2.glb")


def clear_animation(obj):
    obj.animation_data_clear()
    if obj.type == "ARMATURE":
        for bone in obj.pose.bones:
            bone.rotation_mode = "XYZ"
            bone.rotation_euler = (0.0, 0.0, 0.0)
            bone.location = (0.0, 0.0, 0.0)
            bone.scale = (1.0, 1.0, 1.0)


def add_bone(edit_bones, name, head, tail, parent=None, connected=False, deform=True):
    bone = edit_bones.new(name)
    bone.head = head
    bone.tail = tail
    bone.parent = parent
    bone.use_connect = connected
    bone.use_deform = deform
    return bone


def key_rotation(pose_bone, frame, degrees):
    pose_bone.rotation_mode = "XYZ"
    pose_bone.rotation_euler = tuple(math.radians(value) for value in degrees)
    pose_bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=pose_bone.name)


def key_location(pose_bone, frame, value):
    pose_bone.location = value
    pose_bone.keyframe_insert(data_path="location", frame=frame, group=pose_bone.name)


def make_action(rig, name, end_frame, poses):
    clear_animation(rig)
    action = bpy.data.actions.new(name=name)
    rig.animation_data_create()
    rig.animation_data.action = action
    for frame, entries in poses.items():
        for bone_name, transform in entries.items():
            bone = rig.pose.bones.get(bone_name)
            if not bone:
                continue
            if "rotation" in transform:
                key_rotation(bone, frame, transform["rotation"])
            if "location" in transform:
                key_location(bone, frame, transform["location"])
    action.use_fake_user = True
    action["mrdoc_clip_start"] = 1
    action["mrdoc_clip_end"] = end_frame
    return action


bpy.ops.wm.open_mainfile(filepath=SOURCE)
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 96
scene.render.fps = 24

mesh_obj = bpy.data.objects.get("MrDoc_Character")
if not mesh_obj or mesh_obj.type != "MESH":
    raise RuntimeError("MrDoc_Character mesh was not found")

# Remove any stale rig data if the source was edited before this script is rerun.
for modifier in list(mesh_obj.modifiers):
    if modifier.type == "ARMATURE":
        mesh_obj.modifiers.remove(modifier)
for group in list(mesh_obj.vertex_groups):
    mesh_obj.vertex_groups.remove(group)
for obj in list(bpy.data.objects):
    if obj.type == "ARMATURE":
        bpy.data.objects.remove(obj, do_unlink=True)

# The scan is dense. Reduce it enough for smooth viewport playback while preserving
# the silhouette and facial forms.
bpy.context.view_layer.objects.active = mesh_obj
mesh_obj.select_set(True)
decimate = mesh_obj.modifiers.new("WebFriendlyGeometry", "DECIMATE")
decimate.ratio = 0.19
decimate.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier=decimate.name)

armature_data = bpy.data.armatures.new("MrDoc_NaturalRig")
rig = bpy.data.objects.new("MrDoc_NaturalRig", armature_data)
bpy.context.collection.objects.link(rig)
rig.show_in_front = True
rig.display_type = "WIRE"
rig["rig_purpose"] = "Natural chibi body rig with reusable gestures"
rig["animation_names"] = "idle,wave,think,talk_one,explain,reassure"

bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
eb = armature_data.edit_bones

root = add_bone(eb, "root", (0, 0, -0.98), (0, 0, -0.86), deform=False)
pelvis = add_bone(eb, "pelvis", (0, 0, -0.35), (0, 0, -0.20), root)
spine = add_bone(eb, "spine", (0, 0, -0.20), (0, 0, 0.02), pelvis, True)
chest = add_bone(eb, "chest", (0, 0, 0.02), (0, 0, 0.22), spine, True)
neck = add_bone(eb, "neck", (0, 0, 0.22), (0, 0, 0.34), chest, True)
head = add_bone(eb, "head", (0, 0, 0.34), (0, 0, 0.73), neck, True)

for side, sign in (("L", 1), ("R", -1)):
    clavicle = add_bone(eb, f"clavicle.{side}", (0.02 * sign, 0, 0.19), (0.20 * sign, 0, 0.18), chest)
    upper = add_bone(eb, f"upper_arm.{side}", (0.20 * sign, 0, 0.18), (0.275 * sign, 0, -0.035), clavicle, True)
    fore = add_bone(eb, f"forearm.{side}", (0.275 * sign, 0, -0.035), (0.292 * sign, -0.003, -0.265), upper, True)
    hand = add_bone(eb, f"hand.{side}", (0.292 * sign, -0.003, -0.265), (0.30 * sign, -0.025, -0.405), fore, True)
    thumb = add_bone(eb, f"thumb.{side}", (0.29 * sign, -0.035, -0.315), (0.335 * sign, -0.07, -0.36), hand)

    thigh = add_bone(eb, f"thigh.{side}", (0.13 * sign, 0, -0.33), (0.13 * sign, 0, -0.62), pelvis)
    shin = add_bone(eb, f"shin.{side}", (0.13 * sign, 0, -0.62), (0.13 * sign, 0, -0.875), thigh, True)
    foot = add_bone(eb, f"foot.{side}", (0.13 * sign, 0, -0.875), (0.13 * sign, -0.18, -0.93), shin)

    add_bone(eb, f"coat.{side}", (0.13 * sign, 0.06, -0.14), (0.24 * sign, 0.08, -0.40), pelvis)
    add_bone(eb, f"hand_ctrl.{side}", (0.38 * sign, -0.02, -0.31), (0.38 * sign, -0.02, -0.21), root, deform=False)
    add_bone(eb, f"foot_ctrl.{side}", (0.13 * sign, -0.20, -0.96), (0.13 * sign, -0.20, -0.84), root, deform=False)

add_bone(eb, "coat.back", (0, 0.09, -0.13), (0, 0.18, -0.42), pelvis)
bpy.ops.object.mode_set(mode="OBJECT")

# The character is one connected scan, and automatic heat weighting lets the
# oversized chibi head and wide coat steal weights from the arms. Assign broad
# anatomical regions instead, with two-bone blends only around joints. This
# keeps the surface continuous while preventing a raised hand from dragging the
# face or the opposite half of the coat.
mesh_obj.parent = rig
deform = mesh_obj.modifiers.new("MrDoc Natural Deform", "ARMATURE")
deform.object = rig
deform.use_deform_preserve_volume = True

deform_names = [bone.name for bone in rig.data.bones if bone.use_deform]
groups = {name: mesh_obj.vertex_groups.new(name=name) for name in deform_names}


def put(index, weighted_names):
    total = sum(weight for _, weight in weighted_names)
    for name, weight in weighted_names:
        if name in groups and weight > 0:
            groups[name].add([index], weight / total, "REPLACE")


for vertex in mesh_obj.data.vertices:
    x, y, z = vertex.co
    side = "L" if x >= 0 else "R"
    ax = abs(x)

    if z >= 0.32:
        put(vertex.index, [("head", 1.0)])
    elif z >= 0.24:
        t = (z - 0.24) / 0.08
        put(vertex.index, [("neck", 1.0 - t), ("head", t)])
    elif ax >= 0.14 and z >= 0.05:
        # A wide, soft shoulder blend prevents a visible crease where the
        # sleeve grows out of the coat.
        shoulder = min(1.0, max(0.0, (ax - 0.14) / 0.10))
        put(vertex.index, [("chest", 1.0 - shoulder), (f"clavicle.{side}", 0.30 * shoulder), (f"upper_arm.{side}", 0.70 * shoulder)])
    elif ax >= 0.215 and z >= -0.43:
        # Arms hang beside the coat in the neutral scan.
        if z >= 0.12:
            put(vertex.index, [(f"clavicle.{side}", 0.35), (f"upper_arm.{side}", 0.65)])
        elif z >= -0.07:
            t = (0.12 - z) / 0.19
            put(vertex.index, [(f"upper_arm.{side}", 1.0 - 0.35 * t), (f"forearm.{side}", 0.35 * t)])
        elif z >= -0.27:
            t = (-0.07 - z) / 0.20
            put(vertex.index, [(f"upper_arm.{side}", 0.25 * (1.0 - t)), (f"forearm.{side}", 0.75), (f"hand.{side}", 0.25 * t)])
        else:
            put(vertex.index, [(f"forearm.{side}", 0.2), (f"hand.{side}", 0.8)])
    elif z <= -0.34:
        # Coat tails near the centre stay with the pelvis; separated lower
        # limbs follow their own side of the skeleton.
        if ax < 0.075 and z > -0.50:
            put(vertex.index, [("pelvis", 1.0)])
        elif z >= -0.61:
            put(vertex.index, [("pelvis", 0.18), (f"thigh.{side}", 0.82)])
        elif z >= -0.84:
            t = (-0.61 - z) / 0.23
            put(vertex.index, [(f"thigh.{side}", max(0.0, 0.35 * (1.0 - t))), (f"shin.{side}", 0.65 + 0.25 * t), (f"foot.{side}", 0.1 * t)])
        else:
            put(vertex.index, [(f"shin.{side}", 0.2), (f"foot.{side}", 0.8)])
    elif z >= 0.10:
        put(vertex.index, [("chest", 1.0)])
    elif z >= -0.10:
        t = (0.10 - z) / 0.20
        put(vertex.index, [("chest", 1.0 - 0.55 * t), ("spine", 0.55 * t)])
    elif z >= -0.27:
        t = (-0.10 - z) / 0.17
        put(vertex.index, [("spine", 1.0 - 0.55 * t), ("pelvis", 0.55 * t)])
    else:
        put(vertex.index, [("pelvis", 1.0)])

weight_method = "controlled anatomical regions"

# Controls are intentionally simple: animators can pose the FK bones directly,
# while the named controls give clear hand and foot targets for future IK work.
for bone in rig.pose.bones:
    bone.rotation_mode = "XYZ"

idle = {
    1: {"root": {"location": (0, 0, 0)}, "chest": {"rotation": (0, 0, -1)}, "head": {"rotation": (1, 0, 0)}},
    36: {"root": {"location": (0, 0, 0.008)}, "chest": {"rotation": (-1.5, 0, 1)}, "head": {"rotation": (-1, 1, 0)}},
    72: {"root": {"location": (0, 0, 0)}, "chest": {"rotation": (0, 0, -1)}, "head": {"rotation": (1, 0, 0)}},
}
wave = {
    1: {"upper_arm.R": {"rotation": (0, 0, 0)}, "forearm.R": {"rotation": (0, 0, 0)}, "hand.R": {"rotation": (0, 0, 0)}},
    12: {"upper_arm.R": {"rotation": (1, -2, -4)}, "forearm.R": {"rotation": (0, 1, -18)}, "hand.R": {"rotation": (0, 0, 12)}, "head": {"rotation": (0, 0, -4)}},
    24: {"upper_arm.R": {"rotation": (1, -2, -4)}, "forearm.R": {"rotation": (0, 1, -18)}, "hand.R": {"rotation": (0, 0, -24)}},
    36: {"upper_arm.R": {"rotation": (1, -2, -4)}, "forearm.R": {"rotation": (0, 1, -18)}, "hand.R": {"rotation": (0, 0, 24)}},
    48: {"upper_arm.R": {"rotation": (1, -2, -4)}, "forearm.R": {"rotation": (0, 1, -18)}, "hand.R": {"rotation": (0, 0, -20)}},
    64: {"upper_arm.R": {"rotation": (0, 0, 0)}, "forearm.R": {"rotation": (0, 0, 0)}, "hand.R": {"rotation": (0, 0, 0)}, "head": {"rotation": (0, 0, 0)}},
}
think = {
    1: {"upper_arm.R": {"rotation": (0, 0, 0)}, "forearm.R": {"rotation": (0, 0, 0)}},
    18: {"upper_arm.R": {"rotation": (-2, -2, -4)}, "forearm.R": {"rotation": (2, 1, -28)}, "hand.R": {"rotation": (5, 0, -5)}, "head": {"rotation": (7, 0, 5)}},
    54: {"upper_arm.R": {"rotation": (-2, -2, -4)}, "forearm.R": {"rotation": (2, 1, -28)}, "hand.R": {"rotation": (5, 0, -5)}, "head": {"rotation": (9, 2, 5)}},
    72: {"upper_arm.R": {"rotation": (0, 0, 0)}, "forearm.R": {"rotation": (0, 0, 0)}, "hand.R": {"rotation": (0, 0, 0)}, "head": {"rotation": (0, 0, 0)}},
}
talk = {
    1: {"upper_arm.L": {"rotation": (0, 0, 0)}, "upper_arm.R": {"rotation": (0, 0, 0)}},
    20: {"upper_arm.L": {"rotation": (2, -5, 28)}, "forearm.L": {"rotation": (0, 0, 22)}, "upper_arm.R": {"rotation": (-2, 4, -18)}, "forearm.R": {"rotation": (0, 0, -20)}, "head": {"rotation": (-2, 0, -2)}},
    40: {"upper_arm.L": {"rotation": (-2, 4, 15)}, "forearm.L": {"rotation": (0, 0, 12)}, "upper_arm.R": {"rotation": (2, -5, -30)}, "forearm.R": {"rotation": (0, 0, -24)}, "head": {"rotation": (2, 0, 2)}},
    60: {"upper_arm.L": {"rotation": (0, 0, 0)}, "upper_arm.R": {"rotation": (0, 0, 0)}, "forearm.L": {"rotation": (0, 0, 0)}, "forearm.R": {"rotation": (0, 0, 0)}, "head": {"rotation": (0, 0, 0)}},
}
explain = {
    1: {"upper_arm.L": {"rotation": (0, 0, 0)}, "upper_arm.R": {"rotation": (0, 0, 0)}},
    18: {"upper_arm.L": {"rotation": (-4, -3, 24)}, "forearm.L": {"rotation": (1, 0, -16)}, "hand.L": {"rotation": (0, 10, 0)}, "upper_arm.R": {"rotation": (-4, 3, -24)}, "forearm.R": {"rotation": (1, 0, 16)}, "hand.R": {"rotation": (0, -10, 0)}},
    52: {"upper_arm.L": {"rotation": (-3, 2, 18)}, "forearm.L": {"rotation": (0, 0, -10)}, "upper_arm.R": {"rotation": (-3, -2, -18)}, "forearm.R": {"rotation": (0, 0, 10)}, "head": {"rotation": (-3, 0, 0)}},
    76: {"upper_arm.L": {"rotation": (0, 0, 0)}, "upper_arm.R": {"rotation": (0, 0, 0)}, "forearm.L": {"rotation": (0, 0, 0)}, "forearm.R": {"rotation": (0, 0, 0)}, "head": {"rotation": (0, 0, 0)}},
}
reassure = {
    1: {"upper_arm.R": {"rotation": (0, 0, 0)}, "forearm.R": {"rotation": (0, 0, 0)}},
    20: {"upper_arm.R": {"rotation": (-2, -3, -5)}, "forearm.R": {"rotation": (3, 2, -24)}, "hand.R": {"rotation": (0, 8, 5)}, "head": {"rotation": (4, 0, 0)}},
    40: {"upper_arm.R": {"rotation": (-2, -3, -5)}, "forearm.R": {"rotation": (3, 2, -24)}, "hand.R": {"rotation": (0, 8, 5)}, "head": {"rotation": (-5, 0, 0)}},
    58: {"upper_arm.R": {"rotation": (-2, -3, -5)}, "forearm.R": {"rotation": (3, 2, -24)}, "hand.R": {"rotation": (0, 8, 5)}, "head": {"rotation": (3, 0, 0)}},
    78: {"upper_arm.R": {"rotation": (0, 0, 0)}, "forearm.R": {"rotation": (0, 0, 0)}, "hand.R": {"rotation": (0, 0, 0)}, "head": {"rotation": (0, 0, 0)}},
}

actions = [
    make_action(rig, "idle", 72, idle),
    make_action(rig, "wave", 64, wave),
    make_action(rig, "think", 72, think),
    make_action(rig, "talk_one", 60, talk),
    make_action(rig, "explain", 76, explain),
    make_action(rig, "reassure", 78, reassure),
]

# Return to the neutral pose and leave idle selected for immediate preview.
clear_animation(rig)
rig.animation_data_create()
rig.animation_data.action = bpy.data.actions["idle"]
scene.frame_start = 1
scene.frame_end = 72
scene.frame_set(1)

# Friendly viewport presentation.
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
rig.data.display_type = "BBONE"

bpy.ops.wm.save_as_mainfile(filepath=OUTPUT)
bpy.ops.object.select_all(action="DESELECT")
mesh_obj.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(
    filepath=GLB_OUTPUT,
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_skins=True,
    export_morph=False,
)
print("OUTPUT", OUTPUT)
print("GLB", GLB_OUTPUT)
print("WEIGHTS", weight_method)
print("MESH", len(mesh_obj.data.vertices), len(mesh_obj.data.polygons))
print("BONES", len(rig.data.bones))
print("ACTIONS", [(action.name, action.get("mrdoc_clip_end")) for action in actions])
