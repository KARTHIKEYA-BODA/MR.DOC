# Mr.Doc 3D character pipeline (Mixamo → Blender → Three.js)

This document covers the switch from the 2D sprite stage (`#bd` / `#hw`) to a
rigged 3D doctor driven by six Mixamo clips.

**Already implemented in this repo (Step 4):** Three.js is vendored locally in
`assets/vendor/three/`, `mrdoc3d.js` loads a single `assets/mrdoc.glb`, and the
2D sprites stay in charge until that file exists. Nothing below breaks the app
while the model is still missing.

**Still needs you (Steps 1–3):** choosing/rigging a Mixamo doctor and downloading
clips requires an Adobe account and Blender. Until those files exist, the app
loads a skinned placeholder doctor at `assets/mrdoc.glb` (rebuild with
`node tools/make_placeholder_mrdoc.mjs`). Replace that file with the Mixamo
pack to swap in the real character. `tools/pack_mrdoc_glb.py` automates the
Blender half.

---

## Clip contract

The frontend matches clip names after stripping Blender's `Armature|` prefix,
lowercasing, and removing punctuation. Exact names are best; the aliases in
`mrdoc3d.js` cover the Mixamo search names too.

| Mixamo search name | Name in the GLB | When the 3D Mr.Doc plays it |
| --- | --- | --- |
| Breathing Idle | `idle` | Default loop (breathing, weight shift) |
| Standing Greeting | `wave` | User says "Hi"/"Hello", or a new chat opens |
| Thinking | `think` | While waiting for a reply or reading a report |
| Talking | `talk_one` | Short conversational replies |
| Explaining / Arguing | `explain` | Multi-sentence answers (≥ 220 chars, or 150+ chars across 3+ sentences) |
| Thoughtful Head Nod | `reassure` | Empathetic replies about out-of-range results |

`talk_one` vs `explain` is chosen in `speak()` from the reply text length;
everything else follows the existing expression state (`setExp`) in `app.js`.

---

## Step 1 — Get a humanoid doctor mesh

Either path works; the mesh only needs to be a humanoid so Mixamo's auto-rigger
can place its skeleton.

- **Ready-made:** download a free rigged/unrigged doctor from Sketchfab (FBX,
  OBJ, or GLB). T-pose or A-pose, single mesh, is easiest.
- **Custom chibi:** build the white coat + stethoscope + glasses look in VRoid
  Studio, export the mesh (`.vrm`/`.glb`), and convert to FBX if Mixamo refuses
  the file (OBJ/FBX are the safest uploads).

Keep polycount modest (under ~60k triangles) and export a **single character**
without floors, cameras, or lights.

## Step 2 — Auto-rig and download the six clips in Mixamo

1. Sign in at <https://www.mixamo.com> with a free Adobe account.
2. **Upload Character**, then place the six rings on chin, wrists, elbows, and
   groin. Use the preview to confirm the bind pose is not twisted.
3. Search **Breathing Idle**, open it, and download with:
   - Format: **FBX Binary (.fbx)**
   - Skin: **With Skin**
   - FPS: **30**
4. Download the five gestures with **Without Skin**:
   `Standing Greeting`, `Thinking`, `Talking`, `Explaining` (or `Arguing`),
   `Thoughtful Head Nod`.
5. Name the files so they are recognizable (`Breathing Idle.fbx`,
   `Standing Greeting.fbx`, …) and drop all six in `mixamo_fbx/` at the repo
   root. Do **not** commit that folder; only the packed GLB is needed.

## Step 3 — Pack everything into `assets/mrdoc.glb` in Blender

### Automated (recommended)

Blender 3.6+ / 4.x, either from the Scripting tab or headless:

```bash
blender --background --python tools/pack_mrdoc_glb.py -- \
    --input mixamo_fbx --output assets/mrdoc.glb
```

The script imports the skinned idle export as the base character, imports the
five gesture files, deletes their spare armatures, renames each action to the
contract name, stashes all six as NLA tracks with fake users, exports only the
character mesh + armature, and prints the clip names it finds in the GLB.

### Manual equivalent

1. Open Blender, delete the default cube.
2. **File → Import → FBX** → `Breathing Idle.fbx` (With Skin). Keep that
   mesh + armature; remember its name.
3. Import the five `Without Skin` files. Delete each extra armature and any
   empty objects they create.
4. Select the main armature, open **Dope Sheet → Action Editor**, and for each
   action: rename it to `idle`, `wave`, `think`, `talk_one`, `explain`,
   `reassure` and press the shield icon (**Fake User**).
5. Select the character mesh and armature only, then
   **File → Export → glTF 2.0 (.glb/.gltf)**.
   Enable **Animation**, use **Actions** mode, and save to
   `assets/mrdoc.glb`.

### Verify the export before touching the frontend

```bash
node tools/validate_mrdoc_glb.mjs assets/mrdoc.glb
```

Exit code 0 means all six clips and a skin/joint hierarchy were found. The
script lists every animation name, mesh/skin/material counts, and file size.
The same validator runs on any GLB:

```bash
node tools/validate_mrdoc_glb.mjs tests/fixtures/mrdoc.test.glb
```

## Step 4 — How the frontend consumes it

- `mrdoc3d.js` probes for the model first (HEAD request). If it is missing,
  WebGL is unavailable, or the file fails to parse, the module logs one
  `[Mr.Doc 3D]` message and the 2D sprite stage keeps running. The app never
  shows a broken canvas.
- When the model is ready, `body.stage-3d` is added: the canvas fades in and
  `#bd` / `#hw` are hidden.
- Every expression change in `app.js` calls `MrDocStage.setExpression()`;
  speech calls `MrDocStage.speak(text)`; greetings and new chats call
  `MrDocStage.greet()`. Internally each switch is
  `AnimationAction.crossFadeTo(next, 0.35)`, and the `wave` one-shot fades
  back to whatever state the conversation is already in.
- The renderer only draws while the stage is on screen, uses a capped pixel
  ratio, and respects `prefers-reduced-motion` (poses swap instead of blending).
- The `.figure` box keeps the original 2D footprint, so the layout does not
  shift when the 3D model appears.

### Dev override

Test another export without replacing the real file (the path must stay under
`assets/`, which is what the local server exposes):

```
http://localhost:8000/?mrdoc=assets/mrdoc.glb
```

### Framing knobs

If the character is cropped, facing away, or too small, adjust `LOOK` at the
top of `mrdoc3d.js`:

```js
const LOOK = {
  fov: 28,
  margin: 1.08,      // larger = more space around the body
  yaw: 0,            // Math.PI if the export faces backwards
  targetHeight: 0.53, // fraction of model height the camera aims at
};
```

The camera fits the model automatically from its bounding box, so millimetre
or centimetre exports do not need manual scaling.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Console says "No 3D model found" after exporting | Ensure the file is exactly `assets/mrdoc.glb` and reload; check `node tools/validate_mrdoc_glb.mjs` |
| Model loads but is a T-pose | The GLB has no clips, or names did not match. Export with Actions mode and all six fake-user actions |
| Only `idle` appears | Blender exported just the active action; stash the other five on NLA tracks (the packing script does this) |
| Character faces away | Set `LOOK.yaw = Math.PI` |
| Character is tiny or cropped | Check the validator's bounds are sane, then tweak `LOOK.margin` / `targetHeight` |
| 3D never appears and console shows a MIME/module error | Run through `python server.py` (not `file://`); ES modules need a server |
| Blender export is 50+ MB | Remove textures you do not use, keep a single 1024px texture set, re-export GLB |

## Performance notes

- Three.js and GLTFLoader are lazy-loaded only after a model is confirmed, so
  the sprite-only experience keeps its current payload.
- Aim for a GLB under ~15 MB; a 1024px albedo atlas is plenty for the stage
  size (max ~560px tall).
- The scene uses one 1024px shadow map, a capped device pixel ratio, and pauses
  rendering when the stage scrolls out of view or the tab is hidden.
