"""Pack the six Mixamo clips into one assets/mrdoc.glb inside Blender.

Blender GUI use
---------------
1. Put the six .fbx exports in a folder (default: mixamo_fbx/ next to this repo).
2. Open this file in Blender's Scripting tab and press Run Script.
   Or run headless:
     blender --background --python tools/pack_mrdoc_glb.py -- \
         --input mixamo_fbx --output assets/mrdoc.glb

The script imports the character (the file that maps to "idle"), imports the
five gesture clips, deletes their spare armatures, renames every action to one
of idle/wave/think/talk_one/explain/reassure, stashes each action on its own
NLA track (so Blender keeps all six), and exports a single GLB containing only
the character mesh + armature.

File naming is matched against the Mixamo search names; if the names are not
recognisable, exactly six .fbx files are assigned in the order below.
"""

import argparse
import json
import os
import struct
import sys
from pathlib import Path

SLOTS = ["idle", "wave", "think", "talk_one", "explain", "reassure"]

ALIASES = {
    "idle": ["idle", "breathingidle", "breathing", "breathidle"],
    "wave": ["wave", "standinggreeting", "greeting", "hello"],
    "think": ["think", "thinking", "ponder"],
    "talk_one": ["talkone", "talk", "talking", "talkingone"],
    "explain": ["explain", "explaining", "explainingarguing", "arguing"],
    "reassure": ["reassure", "thoughtfulheadnod", "headnod", "nod"],
}


def normalize(value):
    return "".join(ch for ch in os.path.splitext(Path(value).name)[0].lower() if ch.isalnum())


def slot_for_filename(filename):
    name = normalize(filename)
    for slot, aliases in ALIASES.items():
        if name in aliases:
            return slot
    for slot, aliases in ALIASES.items():
        if any(name.startswith(alias) or name.endswith(alias) for alias in aliases):
            return slot
    return None


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description="Pack Mixamo FBX clips into one GLB.")
    parser.add_argument("--input", default="mixamo_fbx", help="Folder with the six .fbx files.")
    parser.add_argument("--output", default="assets/mrdoc.glb", help="Destination .glb path.")
    return parser.parse_args(argv)


def plan_files(folder, explicit=None):
    if explicit:
        files = [Path(item) for item in explicit]
    else:
        root = Path(folder)
        if not root.is_dir():
            raise SystemExit(
                f"Input folder not found: {root}\n"
                "Create it and put Breathing Idle.fbx plus the five gesture .fbx files inside."
            )
        files = sorted(
            [p for p in root.rglob("*") if p.suffix.lower() == ".fbx"],
            key=lambda p: p.name.lower(),
        )
    if not files:
        raise SystemExit("No .fbx files found. Export them from Mixamo first.")

    planned = {}
    unmatched = []
    for path in files:
        slot = slot_for_filename(path.name)
        if slot and slot not in planned:
            planned[slot] = path
        else:
            unmatched.append(path)

    if unmatched and len(files) == len(SLOTS):
        print("[pack] Unrecognised filenames; assigning in order:", [p.name for p in files])
        planned = dict(zip(SLOTS, files))
        unmatched = []

    missing = [slot for slot in SLOTS if slot not in planned]
    if missing:
        raise SystemExit(
            "Missing clips: " + ", ".join(missing) + "\n"
            "Found: " + ", ".join(p.name for p in files) + "\n"
            "Rename the files to the Mixamo names or pass exactly six .fbx paths."
        )
    extra = [p.name for p in files if p not in planned.values()]
    if extra:
        print("[pack] Ignoring extra files:", ", ".join(extra))
    return planned


def clear_scene(bpy):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.actions, bpy.data.armatures, bpy.data.meshes):
        for datablock in list(collection):
            if datablock.users == 0:
                try:
                    collection.remove(datablock)
                except RuntimeError:
                    pass


def import_fbx(bpy, path):
    kwargs = {"filepath": str(path), "use_anim": True, "automatic_bone_orientation": False}
    try:
        bpy.ops.import_scene.fbx(**kwargs)
    except TypeError:
        kwargs.pop("use_anim", None)
        kwargs.pop("automatic_bone_orientation", None)
        bpy.ops.import_scene.fbx(**kwargs)
    return set(bpy.context.scene.objects)


def action_of(bpy, candidates):
    if not candidates:
        return None
    return max(candidates, key=lambda action: action.frame_range[1] - action.frame_range[0])


def stash_action(bpy, armature, action, slot):
    animation_data = armature.animation_data or armature.animation_data_create()
    track = animation_data.nla_tracks.new()
    track.name = slot
    start = int(round(action.frame_range[0]))
    strip = track.strips.new(slot, start, action)
    strip.name = slot
    # Leave tracks unmuted: Blender 3.x's NLA export skips muted tracks, and
    # Blender 4.x's ACTIONS mode exports every stashed action regardless.
    track.mute = False
    action.use_fake_user = True


def export_glb(bpy, output, keep_objects, armature):
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in keep_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature

    common = {
        "filepath": str(output),
        "export_format": "GLB",
        "use_selection": True,
        "export_apply": False,
        "export_animations": True,
        "export_frame_range": False,
        "export_force_sampling": True,
        "export_yup": True,
        "export_skins": True,
        "export_morph": False,
    }
    attempts = [
        {**common, "export_animation_mode": "ACTIONS"},
        {**common, "export_nla_strips": True},
        common,
    ]
    last_error = None
    for kwargs in attempts:
        try:
            bpy.ops.export_scene.gltf(**kwargs)
            return
        except TypeError as error:
            last_error = error
    raise SystemExit(f"glTF export failed: {last_error}")


def glb_animation_names(path):
    with open(path, "rb") as handle:
        magic, version, length = struct.unpack("<III", handle.read(12))
        if magic != 0x46546C67:
            raise ValueError("not a GLB file")
        chunk_length, chunk_type = struct.unpack("<II", handle.read(8))
        if chunk_type != 0x4E4F534A:
            raise ValueError("first chunk is not JSON")
        document = json.loads(handle.read(chunk_length).decode("utf-8"))
    return document, [animation.get("name", "") for animation in document.get("animations", [])]


def main():
    import bpy

    args = parse_args()
    repo_root = Path(__file__).resolve().parent.parent
    folder = Path(args.input)
    if not folder.is_absolute():
        folder = repo_root / folder
    output = Path(args.output)
    if not output.is_absolute():
        output = repo_root / output

    planned = plan_files(folder)

    clear_scene(bpy)
    bpy.context.scene.render.fps = 30
    bpy.context.scene.render.fps_base = 1.0

    base_path = planned["idle"]
    before_actions = set(bpy.data.actions)
    before_objects = set(bpy.context.scene.objects)
    import_fbx(bpy, base_path)
    new_objects = set(bpy.context.scene.objects) - before_objects
    armatures = [obj for obj in new_objects if obj.type == "ARMATURE"]
    if not armatures:
        raise SystemExit(
            f"{base_path.name} has no armature. Download the idle clip with Skin: With Skin."
        )
    main_armature = max(armatures, key=lambda obj: len(obj.data.bones))
    base_action = action_of(bpy, set(bpy.data.actions) - before_actions)

    kept = {obj for obj in new_objects if obj.type == "ARMATURE" or obj.type == "MESH"}
    for child in main_armature.children:
        kept.add(child)
    main_mesh = [obj for obj in kept if obj.type == "MESH"]

    if not main_mesh:
        raise SystemExit("No mesh found in the skinned idle export.")

    print(f"[pack] Base character: {base_path.name} -> idle ({len(main_armature.data.bones)} bones)")
    for obj in new_objects:
        if obj.type == "ARMATURE" and obj is not main_armature:
            bpy.data.objects.remove(obj, do_unlink=True)

    assignments = {}
    if base_action:
        assignments["idle"] = base_action
    else:
        print("[pack] Warning: the idle export contained no action; idle will fall back to the first clip.")

    for slot in SLOTS[1:]:
        path = planned[slot]
        before_actions = set(bpy.data.actions)
        before_objects = set(bpy.context.scene.objects)
        import_fbx(bpy, path)
        new_actions = list(set(bpy.data.actions) - before_actions)
        action = action_of(bpy, new_actions)
        if not action:
            raise SystemExit(f"{path.name} did not contain an animation action.")
        assignments[slot] = action
        for obj in list(bpy.context.scene.objects):
            if obj not in before_objects and obj not in kept and obj.type in {"ARMATURE", "MESH", "EMPTY"}:
                bpy.data.objects.remove(obj, do_unlink=True)
        for extra_action in new_actions:
            if extra_action is not action:
                bpy.data.actions.remove(extra_action)
        print(f"[pack] {path.name} -> {slot} ({action.frame_range[1] - action.frame_range[0]:.0f} frames)")

    animation_data = main_armature.animation_data or main_armature.animation_data_create()
    animation_data.action = None
    for track in list(animation_data.nla_tracks):
        animation_data.nla_tracks.remove(track)

    for slot in SLOTS:
        action = assignments.get(slot)
        if action is None:
            continue
        action.name = slot
        action.use_fake_user = True
        stash_action(bpy, main_armature, action, slot)

    bpy.context.view_layer.update()
    export_glb(bpy, output, kept, main_armature)

    document, names = glb_animation_names(output)
    size_mib = output.stat().st_size / 1024 / 1024
    print(f"[pack] Wrote {output} ({size_mib:.2f} MiB)")
    print("[pack] Animations in GLB:", ", ".join(names) if names else "(none)")
    missing = [slot for slot in SLOTS if not any(slot in name for name in names)]
    if missing:
        print("[pack] WARNING: missing clips after export:", ", ".join(missing))
        sys.exit(1)
    print("[pack] Done. Reload the app with python server.py.")


if __name__ == "__main__":
    main()
