/* ---------- Mr.Doc 3D stage (Three.js + Mixamo clips) ----------
   Loads a single assets/mrdoc.glb built with Blender and drives it with
   six animation clips: idle, wave, think, talk_one, explain, reassure.
   Every switch is an AnimationAction.crossFadeTo() blend over 0.35 s.

   If the model is missing, WebGL is unavailable, or the file cannot be
   parsed, the original 2D sprite stage keeps running untouched.

   Dev override: add ?mrdoc=path/to/file.glb to try another export.
--------------------------------------------------------------- */

(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const MODEL_URL = params.get("mrdoc") || "assets/mrdoc.glb";
  const FADE_SECONDS = 0.35;
  const FALLBACK_CLIP = "idle";

  // Tweak these after the first export if the framing looks off.
  const LOOK = {
    fov: 28,
    margin: 1.08, // >1 leaves breathing room around the character
    yaw: 0, // Math.PI turns a backwards-facing Mixamo export around
    targetHeight: 0.53, // fraction of model height the camera aims at
  };

  const EXPRESSION_CLIPS = {
    happy: "idle",
    look: "idle",
    think: "think",
    speak: "talk_one",
    supportive: "reassure",
    puzzled: "think",
    away: "idle",
    idle: "idle",
    cheer: "reassure",
  };

  const CLIP_ALIASES = {
    idle: ["idle", "breathing idle", "breathingidle", "breathing", "breath idle"],
    wave: ["wave", "standing greeting", "standinggreeting", "greeting", "hello"],
    think: ["think", "thinking", "ponder", "thinking idle"],
    talk_one: ["talk one", "talkone", "talk", "talking", "talking one"],
    explain: ["explain", "explaining", "explaining arguing", "arguing", "explain both hands"],
    reassure: ["reassure", "thoughtful head nod", "thoughtfulheadnod", "head nod", "nod"],
  };

  const reduceMotion =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  const api = {
    ready: false,
    failed: false,
    clipNames: [],
    modelUrl: MODEL_URL,
    setExpression,
    speak,
    greet,
    trigger: playOnce,
    play: playOnce,
    debug: () => ({
      ready: api.ready,
      failed: api.failed,
      clips: api.clipNames,
      desired,
      speakClip,
      oneShot,
      current: currentAction ? currentAction.getClip().name : null,
      weight: currentAction ? currentAction.getEffectiveWeight() : 0,
      weights: Object.fromEntries(
        Object.entries(actions).map(([slot, action]) => [
          slot,
          Number(action.getEffectiveWeight().toFixed(3)),
        ]),
      ),
      time: currentAction ? currentAction.time : 0,
      canvas: renderer ? [renderer.domElement.width, renderer.domElement.height] : null,
    }),
  };
  window.MrDocStage = api;

  let desired = "idle";
  let speakClip = "talk_one";
  let oneShot = null;
  let three = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let mixer = null;
  let model = null;
  let actions = {};
  let currentAction = null;
  let frameId = 0;
  let oneShotTimer = 0;
  let lastTime = 0;
  let visible = true;
  let modelHeight = 1.8;
  let disposed = false;
  let pendingWave = false;

  function normalizeName(name) {
    return String(name || "")
      .split("|")
      .pop()
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^a-z0-9]+/gi, " ")
      .trim()
      .toLowerCase();
  }

  function matchClips(clips) {
    const found = {};
    const unused = clips.slice();
    for (const [slot, aliases] of Object.entries(CLIP_ALIASES)) {
      let index = unused.findIndex((clip) => aliases.includes(normalizeName(clip.name)));
      if (index < 0) {
        index = unused.findIndex((clip) => {
          const name = normalizeName(clip.name);
          return aliases.some((alias) => name.startsWith(alias) || name.endsWith(alias));
        });
      }
      if (index >= 0) found[slot] = unused.splice(index, 1)[0];
    }
    return found;
  }

  function playClip(name, fade = FADE_SECONDS, once = false) {
    const next = actions[name];
    if (!next) return false;
    if (next === currentAction && !once) return true;

    clearTimeout(oneShotTimer);
    next.reset();
    next.enabled = true;
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    next.setLoop(once ? three.LoopOnce : three.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.play();

    if (currentAction && currentAction !== next) {
      if (reduceMotion) {
        // Respect the OS setting: swap poses instead of blending motion.
        currentAction.stop();
        next.setEffectiveWeight(1);
      } else {
        currentAction.crossFadeTo(next, fade, false);
      }
    }
    currentAction = next;
    if (reduceMotion) {
      // The frame loop does not advance the mixer in reduced-motion mode, so
      // finish a one-shot (the wave) on a timer instead of the mixer event.
      if (mixer) mixer.update(0);
      draw();
      if (once) {
        oneShotTimer = setTimeout(() => {
          oneShot = null;
          fadeToDesired();
        }, Math.max(400, next.getClip().duration * 1000));
      }
    }
    return true;
  }

  function resolve(name) {
    if (actions[name]) return name;
    if (actions[FALLBACK_CLIP]) return FALLBACK_CLIP;
    return Object.keys(actions)[0] || null;
  }

  function fadeToDesired() {
    if (oneShot) return;
    const name = resolve(desired);
    if (name) playClip(name, FADE_SECONDS, false);
  }

  function setExpression(key) {
    desired = EXPRESSION_CLIPS[key] || "idle";
    if (desired === "talk_one") desired = speakClip;
    if (api.ready) fadeToDesired();
  }

  function speak(text) {
    const spoken = String(text || "").trim();
    // Short fragments like "Mr." or "Doc." should not count as sentences.
    const sentences = spoken
      .split(/[.!?。।॥]+/)
      .filter((part) => part.trim().length >= 8).length;
    const explaining = spoken.length >= 220 || (sentences >= 3 && spoken.length >= 150);
    speakClip = explaining ? "explain" : "talk_one";
    desired = speakClip;
    if (api.ready) fadeToDesired();
  }

  function playOnce(name) {
    if (!api.ready) {
      pendingWave = name === "wave" || pendingWave;
      return;
    }
    if (oneShot) return;
    const resolved = resolve(name);
    if (!resolved || !actions[name]) return;
    oneShot = name;
    playClip(resolved, 0.22, true);
  }

  function greet() {
    playOnce("wave");
  }

  function draw() {
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function startFrameLoop() {
    if (frameId) return;
    if (reduceMotion) {
      draw();
      return;
    }
    lastTime = performance.now();
    const tick = (now) => {
      frameId = requestAnimationFrame(tick);
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (!visible || document.visibilityState === "hidden") return;
      if (mixer) mixer.update(delta);
      draw();
    };
    frameId = requestAnimationFrame(tick);
  }

  function resize() {
    if (!renderer || !camera) return;
    const host = renderer.domElement.parentElement;
    if (!host) return;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    applyFraming();
    camera.updateProjectionMatrix();
    draw();
  }

  function applyFraming() {
    if (!camera) return;
    const halfV = Math.tan((LOOK.fov * Math.PI) / 360);
    const halfH = halfV * Math.max(camera.aspect, 0.35);
    const fitHeight = (modelHeight * 0.5 * LOOK.margin) / halfV;
    const fitWidth = (modelHeight * 0.32 * LOOK.margin) / halfH;
    const distance = Math.max(fitHeight, fitWidth);
    const targetY = modelHeight * LOOK.targetHeight;
    camera.position.set(0, targetY + modelHeight * 0.06, distance);
    camera.lookAt(0, targetY, 0);
    camera.near = Math.max(0.01, distance * 0.02);
    camera.far = distance * 12;
    camera.updateProjectionMatrix();
  }

  function createLights() {
    const hemi = new three.HemisphereLight(0xffffff, 0xcfe0e4, 1.5);
    scene.add(hemi);

    const key = new three.DirectionalLight(0xfff6ec, 2.4);
    key.position.set(modelHeight * 1.1, modelHeight * 1.9, modelHeight * 1.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 3;
    key.shadow.bias = -0.0005;
    const extent = modelHeight * 0.8;
    key.shadow.camera.left = -extent;
    key.shadow.camera.right = extent;
    key.shadow.camera.top = extent;
    key.shadow.camera.bottom = -extent;
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = modelHeight * 6;
    key.shadow.camera.updateProjectionMatrix();
    scene.add(key);

    const rim = new three.DirectionalLight(0xa9e3dc, 1.1);
    rim.position.set(-modelHeight, modelHeight * 1.2, -modelHeight * 1.4);
    scene.add(rim);
  }

  function createShadowCatcher() {
    const ground = new three.Mesh(
      new three.PlaneGeometry(modelHeight * 6, modelHeight * 6),
      new three.ShadowMaterial({ opacity: 0.16, transparent: true }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.002;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  function fallback(reason) {
    api.failed = true;
    api.ready = false;
    document.body.classList.remove("stage-3d");
    console.info("[Mr.Doc 3D] " + reason + " Keeping the 2D sprite stage.");
    teardown();
  }

  function teardown() {
    disposed = true;
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    clearTimeout(oneShotTimer);
    if (mixer) mixer.stopAllAction();
    if (scene) {
      scene.traverse((node) => {
        if (node.isMesh) {
          node.geometry?.dispose();
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          for (const material of materials) {
            if (!material) continue;
            for (const value of Object.values(material)) {
              if (value && value.isTexture) value.dispose();
            }
            material.dispose();
          }
        }
      });
      scene.clear();
    }
    renderer?.dispose();
    renderer = null;
  }

  function modelExists(url) {
    return fetch(url, { method: "HEAD", cache: "no-cache" })
      .then((response) => response.ok)
      .catch(() => false);
  }

  async function init() {
    if (disposed) return;
    const canvas = document.getElementById("mrdoc3d");
    if (!canvas) return;

    if (location.protocol === "file:") {
      fallback("The 3D model needs a local server (python server.py).");
      return;
    }

    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2") && !probe.getContext("webgl")) {
      fallback("WebGL is not available in this browser.");
      return;
    }

    if (!(await modelExists(MODEL_URL))) {
      fallback(
        "No 3D model found at " + MODEL_URL + ". Export it from Blender to enable the 3D stage.",
      );
      return;
    }

    try {
      three = await import("./assets/vendor/three/three.module.js");
      const [{ GLTFLoader }, { RoomEnvironment }] = await Promise.all([
        import("./assets/vendor/three/GLTFLoader.js"),
        import("./assets/vendor/three/RoomEnvironment.js"),
      ]);
      if (disposed) return;

      renderer = new three.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = three.SRGBColorSpace;
      renderer.toneMapping = three.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = three.PCFSoftShadowMap;

      scene = new three.Scene();
      camera = new three.PerspectiveCamera(LOOK.fov, 1, 0.1, 100);
      const pmrem = new three.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.55;
      pmrem.dispose();

      const gltf = await new Promise((resolve, reject) => {
        new GLTFLoader().load(MODEL_URL, resolve, undefined, reject);
      });
      if (disposed) return;

      model = gltf.scene;
      model.rotation.y = LOOK.yaw;
      model.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = false;
        node.frustumCulled = false;
      });

      const box = new three.Box3().setFromObject(model);
      const size = box.getSize(new three.Vector3());
      const center = box.getCenter(new three.Vector3());
      modelHeight = Math.max(size.y, 0.001);
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;
      scene.add(model);

      createLights();
      createShadowCatcher();
      applyFraming();

      mixer = new three.AnimationMixer(model);
      const clips = gltf.animations || [];
      const matched = matchClips(clips);
      actions = {};
      for (const [slot, clip] of Object.entries(matched)) {
        const action = mixer.clipAction(clip);
        action.setLoop(three.LoopRepeat, Infinity);
        action.enabled = true;
        action.setEffectiveWeight(0);
        actions[slot] = action;
      }
      api.clipNames = Object.keys(matched);

      const missing = Object.keys(CLIP_ALIASES).filter((slot) => !actions[slot]);
      if (missing.length) {
        console.warn(
          "[Mr.Doc 3D] Missing clips: " + missing.join(", ") + ". Found in file: " +
            (clips.map((clip) => clip.name).join(", ") || "none"),
        );
      }

      if (!actions[FALLBACK_CLIP]) {
        const first = clips[0];
        if (first) {
          actions[FALLBACK_CLIP] = mixer.clipAction(first);
          console.warn("[Mr.Doc 3D] No 'idle' clip; using '" + first.name + "' as the base loop.");
        }
      }
      if (!Object.keys(actions).length) {
        fallback("The GLB has no animation clips.");
        return;
      }

      mixer.addEventListener("finished", (event) => {
        if (!oneShot || event.action !== actions[oneShot]) return;
        oneShot = null;
        fadeToDesired();
      });

      const initial = document.getElementById("sb")?.dataset.mode || "idle";
      if (desired === "idle") setExpression(initial);
      playClip(resolve(desired), 0, false);
      api.ready = true;
      if (pendingWave) {
        pendingWave = false;
        playOnce("wave");
      }

      resize();
      new ResizeObserver(() => resize()).observe(canvas.parentElement || canvas);
      const stage = document.getElementById("stage");
      if (stage && "IntersectionObserver" in window) {
        new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          if (visible) resize();
        }).observe(stage);
      }
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          lastTime = performance.now();
          resize();
        }
      });
      canvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        fallback("The WebGL context was lost.");
      });

      startFrameLoop();
      document.body.classList.add("stage-3d");
      console.info(
        "[Mr.Doc 3D] Loaded " + MODEL_URL + " with clips: " + api.clipNames.join(", "),
      );
    } catch (error) {
      handleError(error);
    }
  }

  function handleError(error) {
    const message = error && error.message ? error.message : String(error);
    fallback("Could not load the 3D model (" + message + ").");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
