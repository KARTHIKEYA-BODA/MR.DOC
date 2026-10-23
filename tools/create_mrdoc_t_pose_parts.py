import bpy
import math
import os
from mathutils import Matrix, Vector


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "white_mesh_natural_rig.blend")
OUTPUT = os.path.join(ROOT, "white_mesh_t_pose.blend")
PREVIEW = os.path.join(ROOT, "assets", "rig-preview", "t-pose.png")


def arm_side(face, mesh):
    center = face.center
    x, z = center.x, center.z
    ax = abs(x)
    if not (-0.44 <= z <= 0.24):
        return None
    # Keep collar/lapel faces with the torso while taking the narrow hanging
    # hands and forearms out of the coat at lower heights.
    cutoff = 0.225 if z >= 0.04 else 0.16
    if ax < cutoff:
        return None
    return "L" if x > 0 else "R"


def mesh_from_faces(name, source_mesh, faces):
    used = sorted({index for face in faces for index in face.vertices})
    remap = {old: new for new, old in enumerate(used)}
    vertices = [source_mesh.vertices[index].co.copy() for index in used]
    polygons = [[remap[index] for index in face.vertices] for face in faces]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], polygons)
    mesh.update()
    return mesh


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.wm.open_mainfile(filepath=SOURCE)
scene = bpy.context.scene
source = bpy.data.objects["MrDoc_Character"]
source_mesh = source.data
materials = list(source.data.materials)

face_sets = {"BODY": [], "L": [], "R": []}
for face in source_mesh.polygons:
    side = arm_side(face, source_mesh)
    face_sets[side or "BODY"].append(face)

created = []
for key, object_name in (("BODY", "MrDoc_Body"), ("L", "MrDoc_Arm.L"), ("R", "MrDoc_Arm.R")):
    mesh = mesh_from_faces(object_name, source_mesh, face_sets[key])
    obj = bpy.data.objects.new(object_name, mesh)
    bpy.context.collection.objects.link(obj)
    for material in materials:
        obj.data.materials.append(material)
    created.append(obj)

body, arm_l, arm_r = created
for arm, shoulder, angle in (
    (arm_l, Vector((0.18, 0.0, 0.17)), -70.0),
    (arm_r, Vector((-0.18, 0.0, 0.17)), 70.0),
):
    rotation = Matrix.Rotation(math.radians(angle), 4, "Y")
    for vertex in arm.data.vertices:
        vertex.co = shoulder + rotation @ (vertex.co - shoulder)

# Rounded shoulder caps conceal the deliberately separated sleeve cuts.
for side, x in (("L", 0.23), ("R", -0.23)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.065, location=(x, 0.0, 0.17))
    cap = bpy.context.object
    cap.name = f"MrDoc_ShoulderCap.{side}"
    cap.scale = (1.08, 0.88, 1.0)
    if materials:
        cap.data.materials.append(materials[0])
    created.append(cap)

for obj in list(bpy.data.objects):
    if obj not in created and obj.type in {"MESH", "ARMATURE", "EMPTY"}:
        bpy.data.objects.remove(obj, do_unlink=True)

for obj in created:
    obj.select_set(False)
body.select_set(True)
bpy.context.view_layer.objects.active = body
scene.frame_start = 1
scene.frame_end = 1
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT)

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
camera.location = (0.0, -4.25, 0.0)
camera.data.lens = 58
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

scene.render.filepath = PREVIEW
bpy.ops.render.render(write_still=True)
print("OUTPUT", OUTPUT)
print("BODY_FACES", len(face_sets["BODY"]))
print("LEFT_ARM_FACES", len(face_sets["L"]))
print("RIGHT_ARM_FACES", len(face_sets["R"]))
print("PREVIEW", PREVIEW)
