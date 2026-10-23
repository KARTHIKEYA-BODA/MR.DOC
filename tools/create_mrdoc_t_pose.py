import bpy
import os
from mathutils import Matrix, Vector


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "white_mesh_natural_rig.blend")
OUTPUT = os.path.join(ROOT, "white_mesh_t_pose.blend")
PREVIEW = os.path.join(ROOT, "assets", "rig-preview", "t-pose.png")


def aim_bone(rig, name, direction):
    bone = rig.pose.bones[name]
    direction = Vector(direction).normalized()
    head = bone.head.copy()
    rotation = direction.to_track_quat("Y", "Z").to_matrix().to_4x4()
    bone.matrix = Matrix.Translation(head) @ rotation
    bpy.context.view_layer.update()
    bone.rotation_mode = "QUATERNION"
    bone.keyframe_insert(data_path="rotation_quaternion", frame=1, group=name)
    bone.keyframe_insert(data_path="location", frame=1, group=name)


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.wm.open_mainfile(filepath=SOURCE)
scene = bpy.context.scene
rig = bpy.data.objects["MrDoc_NaturalRig"]

for bone in rig.pose.bones:
    bone.rotation_mode = "QUATERNION"
    bone.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
    bone.location = (0.0, 0.0, 0.0)
    bone.scale = (1.0, 1.0, 1.0)

action = bpy.data.actions.get("T_Pose") or bpy.data.actions.new("T_Pose")
action.use_fake_user = True
action["mrdoc_clip_start"] = 1
action["mrdoc_clip_end"] = 2
rig.animation_data_create()
rig.animation_data.action = action

# Aim the complete arm chains horizontally in armature space. Assigning pose
# matrices avoids guessing each bone's local Euler axes and produces a truly
# level, symmetrical T-pose.
aim_bone(rig, "upper_arm.L", (1.0, 0.0, 0.0))
aim_bone(rig, "forearm.L", (1.0, 0.0, 0.0))
aim_bone(rig, "hand.L", (1.0, 0.0, 0.0))
aim_bone(rig, "upper_arm.R", (-1.0, 0.0, 0.0))
aim_bone(rig, "forearm.R", (-1.0, 0.0, 0.0))
aim_bone(rig, "hand.R", (-1.0, 0.0, 0.0))

scene.frame_start = 1
scene.frame_end = 2
scene.frame_set(1)
rig.data.pose_position = "POSE"
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT)

# Render a quick front preview for deformation inspection.
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 720
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
if scene.world is None:
    scene.world = bpy.data.worlds.new("TPosePreviewWorld")
scene.world.color = (0.92, 0.95, 1.0)

camera_data = bpy.data.cameras.new("TPosePreviewCamera")
camera = bpy.data.objects.new("TPosePreviewCamera", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (0.0, -4.3, 0.0)
camera.data.lens = 56
point_at(camera, (0.0, 0.0, -0.03))
scene.camera = camera

for name, location, energy, size in (
    ("TPoseKey", (-2.0, -2.5, 3.0), 900, 4.0),
    ("TPoseFill", (2.3, -1.5, 1.5), 600, 3.0),
    ("TPoseRim", (0.0, 2.0, 2.5), 750, 3.0),
):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.size = size
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = location
    point_at(light, (0.0, 0.0, 0.0))

rig.hide_render = True
scene.render.filepath = PREVIEW
bpy.ops.render.render(write_still=True)
print("OUTPUT", OUTPUT)
print("PREVIEW", PREVIEW)
print("ACTION", rig.animation_data.action.name)
