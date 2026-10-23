import * as THREE from "./three.module.js";
import { GLTFLoader } from "./GLTFLoader.js";
import { RoomEnvironment } from "./RoomEnvironment.js";

(() => {
  "use strict";

  const canvas = document.createElement("canvas");
  canvas.className = "doctor-transition-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(27, 1, 0.01, 100);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfe5e2, 2.2));
  const key = new THREE.DirectionalLight(0xfff4e9, 2.6);
  key.position.set(2, 4, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xa8e4dd, 1.2);
  rim.position.set(-3, 2, -3);
  scene.add(rim);

  let model = null;
  let mixer = null;
  let action = null;
  let modelHeight = 1;
  let ready = false;
  let active = false;
  let frame = 0;
  let last = 0;
  let finishTimer = 0;
  let resolveReady;
  const whenReady = new Promise((resolve) => { resolveReady = resolve; });

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function frameModel(width, height) {
    if (!model) return;
    const aspect = Math.max(width / Math.max(height, 1), 0.25);
    camera.aspect = aspect;
    const halfV = Math.tan((camera.fov * Math.PI) / 360);
    const halfH = halfV * aspect;
    const distance = Math.max(
      (modelHeight * 0.55) / halfV,
      (modelHeight * 0.34) / halfH,
    );
    const targetY = modelHeight * 0.5;
    camera.position.set(0, targetY + modelHeight * 0.04, distance);
    camera.lookAt(0, targetY, 0);
    camera.near = Math.max(0.01, distance * 0.02);
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
  }

  function draw(now) {
    if (!active) {
      frame = 0;
      return;
    }
    frame = requestAnimationFrame(draw);
    const delta = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    mixer?.update(delta);
    renderer.render(scene, camera);
  }

  function stop(done) {
    active = false;
    cancelAnimationFrame(frame);
    frame = 0;
    clearTimeout(finishTimer);
    canvas.classList.remove("is-visible", "is-running");
    canvas.style.transform = "";
    canvas.style.opacity = "0";
    action?.stop();
    done?.();
  }

  function settle(done) {
    active = false;
    cancelAnimationFrame(frame);
    frame = 0;
    clearTimeout(finishTimer);
    canvas.classList.remove("is-running");
    canvas.style.transition = "filter 220ms ease";
    canvas.style.filter = "drop-shadow(0 10px 16px rgba(26,71,80,.12))";
    action.paused = true;
    renderer.render(scene, camera);
    done?.(true);
  }

  function play(fromElement, toElement, done, options = {}) {
    if (!ready || !fromElement || !toElement || reduceMotion) return false;
    const from = fromElement.getBoundingClientRect();
    const to = toElement.getBoundingClientRect();
    if (!from.width || !from.height || !to.width || !to.height) return false;

    stop();
    const width = Math.max(80, Math.round(to.width));
    const height = Math.max(120, Math.round(to.height));
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    frameModel(width, height);

    canvas.style.left = `${to.left}px`;
    canvas.style.top = `${to.top}px`;
    canvas.style.width = `${to.width}px`;
    canvas.style.height = `${to.height}px`;
    canvas.style.opacity = "1";
    canvas.style.transition = "none";
    canvas.style.transformOrigin = "0 0";
    canvas.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
    canvas.classList.add("is-visible");

    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.enabled = true;
    action.play();
    active = true;
    last = performance.now();
    frame = requestAnimationFrame(draw);
    renderer.render(scene, camera);

    void canvas.offsetWidth;
    canvas.style.transition = "transform 960ms cubic-bezier(.2,.72,.2,1), filter 960ms ease";
    canvas.classList.add("is-running");
    canvas.style.transform = "translate(0, 0) scale(1)";
    finishTimer = setTimeout(
      () => options.persist ? settle(done) : stop(() => done?.(false)),
      990,
    );
    return true;
  }

  window.MrDocTransition = {
    play,
    stop,
    whenReady,
    get ready() { return ready; },
  };

  new GLTFLoader().load(
    "assets/mrdoc-illustrated.glb?v=transition-20261023",
    (gltf) => {
      model = gltf.scene;
      model.traverse((node) => {
        if (node.isMesh) {
          node.frustumCulled = false;
          node.castShadow = false;
        }
      });
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      modelHeight = Math.max(size.y, 0.001);
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;
      scene.add(model);

      mixer = new THREE.AnimationMixer(model);
      // This textured app model is visually consistent with Mr.Doc. Its
      // explain cycle moves both arms and the upper body during travel.
      const clip = gltf.animations.find((item) =>
        /^explain$/i.test(item.name),
      ) || gltf.animations.find((item) => /wave|talk/i.test(item.name)) || gltf.animations[0];
      if (!clip) return;
      action = mixer.clipAction(clip);
      ready = true;
      resolveReady(true);
      document.documentElement.classList.add("mrdoc-transition-ready");
    },
    undefined,
    (error) => {
      resolveReady(false);
      console.warn("[Mr.Doc transition] 3D animation unavailable.", error);
    },
  );
})();
