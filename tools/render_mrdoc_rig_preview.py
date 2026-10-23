import bpy
import os
from mathutils import Vector


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "white_mesh_natural_rig.blend")
OUT_DIR = os.path.join(ROOT, "assets", "rig-preview")


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.wm.open_mainfile(filepath=SOURCE)
os.makedirs(OUT_DIR, exist_ok=True)
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 640
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.image_settings.color_depth = "8"
scene.render.image_settings.compression = 35
scene.render.film_transparent = False
if scene.world is None:
    scene.world = bpy.data.worlds.new("RigPreviewWorld")
scene.world.color = (0.92, 0.95, 1.0)

camera_data = bpy.data.cameras.new("RigPreviewCamera")
camera = bpy.data.objects.new("RigPreviewCamera", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (0.0, -4.1, 0.02)
camera.data.lens = 58
point_at(camera, (0.0, 0.0, -0.02))
scene.camera = camera

for name, location, energy, size in (
    ("Key", (-2.2, -2.5, 3.0), 900, 4.0),
    ("Fill", (2.4, -1.5, 1.4), 650, 3.0),
    ("Rim", (0.0, 2.0, 2.5), 800, 3.0),
):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = location
    point_at(light, (0.0, 0.0, 0.0))

rig = bpy.data.objects["MrDoc_NaturalRig"]
rig.hide_render = True
previews = (("idle", 1), ("wave", 36), ("think", 36), ("explain", 28), ("reassure", 40))
for action_name, frame in previews:
    rig.animation_data.action = bpy.data.actions[action_name]
    scene.frame_set(frame)
    scene.render.filepath = os.path.join(OUT_DIR, f"{action_name}.png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", action_name, frame, scene.render.filepath)
