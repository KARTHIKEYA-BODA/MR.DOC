/* Interactive anatomy viewer for the Full Body Check page. */
(() => {
  "use strict";

  const viewers = new Map();

  function dispose() {
    viewers.forEach((viewer) => viewer.dispose());
    viewers.clear();
  }

  async function mount({ canvas, status, modelUrl, modelPart = "all" }) {
    if (!canvas) return null;
    viewers.get(canvas)?.dispose();
    let renderer, scene, camera, model, resizeObserver, frameId = 0;
    let three, disposed = false, dragging = false, moved = false;
    let lastX = 0, fitDistance = 34, pivot, modelBounds;
    const activePointers = new Map();
    let pinchDistance = null;


    const setStatus = (message, hidden = false) => {
      if (!status) return;
      status.textContent = message;
      status.hidden = hidden;
    };

    const owner = {
      dispose() {
        disposed = true;
        if (frameId) cancelAnimationFrame(frameId);
        resizeObserver?.disconnect();
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerUp);
        canvas.removeEventListener("wheel", onWheel);
        canvas.removeEventListener("dblclick", reset);
        canvas.removeEventListener("keydown", onKeyDown);
        if (scene) scene.traverse((node) => {
          if (node.geometry) node.geometry.dispose();
          if (node.material) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach((material) => {
              if (material.map) material.map.dispose();
              material.dispose();
            });
          }
        });
        renderer?.dispose();
        renderer = null;
      },
      resize,
      reset,
    };
    viewers.set(canvas, owner);

    function render() {
      if (!disposed && renderer && scene && camera) {
        updateAnatomyConnectors();
        renderer.render(scene, camera);
      }
    }

    function updateAnatomyConnectors() {
      if (!model || !modelBounds || !camera || !canvas.parentElement || !three) return;
      const stage = canvas.parentElement;
      const labels = stage.querySelector(".body-part-labels");
      const svg = labels?.querySelector(".body-label-connectors");
      if (!svg) return;
      const width = stage.clientWidth, height = stage.clientHeight;
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("width", width); svg.setAttribute("height", height);
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      const size = modelBounds.getSize(new three.Vector3());
      const anchors = {
        head: [0.50, 0.91], shoulder: [0.64, 0.77], chest: [0.53, 0.70],
        arm: [0.28, 0.68], hand: [0.08, 0.52], abdomen: [0.53, 0.57],
        hip: [0.45, 0.47], thigh: [0.59, 0.34], knee: [0.45, 0.20],
        leg: [0.58, 0.10], foot: [0.46, 0.025],
        skull: [0.50, 0.91], clavicle: [0.64, 0.78], "chest-bones": [0.55, 0.70],
        spine: [0.50, 0.60], humerus: [0.28, 0.68], forearm: [0.16, 0.56],
        "hand-bones": [0.08, 0.51], pelvis: [0.50, 0.47], femur: [0.59, 0.35],
        patella: [0.55, 0.20], tibia: [0.58, 0.10], "foot-bones": [0.46, 0.025],
      };
      for (const [name, [fx, fy]] of Object.entries(anchors)) {
        const label = labels.querySelector(`[data-anatomy-label="${name}"]`);
        const line = labels.querySelector(`[data-anatomy-line="${name}"]`);
        if (!label || !line) continue;
        const local = new three.Vector3(
          modelBounds.min.x + size.x * fx,
          modelBounds.min.y + size.y * fy,
          modelBounds.max.z - size.z * 0.035,
        ).applyMatrix4(model.matrixWorld).project(camera);
        const targetX = (local.x * 0.5 + 0.5) * width;
        const targetY = (-local.y * 0.5 + 0.5) * height;
        const rect = label.getBoundingClientRect(), stageRect = stage.getBoundingClientRect();
        const isLeft = label.classList.contains("label-left");
        const startX = (isLeft ? rect.right : rect.left) - stageRect.left;
        const startY = rect.top + rect.height / 2 - stageRect.top;
        line.setAttribute("x1", startX); line.setAttribute("y1", startY);
        line.setAttribute("x2", targetX); line.setAttribute("y2", targetY);
      }
    }

    function resize() {
      if (!renderer || !canvas.parentElement) return;
      const width = Math.max(1, canvas.parentElement.clientWidth);
      const height = Math.max(1, canvas.parentElement.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      if (model) updateFitDistance();
      const currentDistance = camera.position.length();
      camera.position.set(0, 0, Math.max(fitDistance, Math.min(fitDistance * 1.45, currentDistance || fitDistance)));
      camera.far = Math.max(camera.far, fitDistance * 4);
      camera.updateProjectionMatrix();
      render();
    }

    function updateFitDistance() {
      if (!camera || !pivot || !three) return;
      const bounds = new three.Box3().setFromObject(model);
      const size = bounds.getSize(new three.Vector3());
      const halfFov = three.MathUtils.degToRad(camera.fov * 0.5);
      const verticalFit = size.y * 0.5 / Math.tan(halfFov);
      const horizontalFov = 2 * Math.atan(Math.tan(three.MathUtils.degToRad(camera.fov * 0.5)) * Math.max(camera.aspect, 0.01));
      const rotationEnvelopeWidth = Math.hypot(size.x, size.z);
      const horizontalFit = rotationEnvelopeWidth * 0.5 / Math.tan(horizontalFov * 0.5);
      fitDistance = Math.max(verticalFit, horizontalFit) * 1.1;
    }

    function reset() {
      if (!model || !camera) return;
      pivot.rotation.set(0, 0, 0);
      camera.position.set(0, 0, fitDistance);
      camera.lookAt(0, 0, 0);
      render();
    }

    function onPointerDown(event) {
      if (!model) return;
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (activePointers.size > 1) {
        dragging = false;
        moved = true;
        pinchDistance = pointerDistance();
        canvas.setPointerCapture?.(event.pointerId);
        return;
      }
      dragging = true;
      moved = false;
      lastX = event.clientX;
      canvas.setPointerCapture?.(event.pointerId);
    }

    function onPointerMove(event) {
      if (!model) return;
      if (activePointers.has(event.pointerId)) activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (activePointers.size > 1) {
        const nextDistance = pointerDistance();
        if (pinchDistance && nextDistance > 0) zoomBy(pinchDistance / nextDistance);
        pinchDistance = nextDistance;
        moved = true;
        render();
        return;
      }
      if (!dragging) return;
      const dx = event.clientX - lastX;
      if (Math.abs(dx) > 2) moved = true;
      pivot.rotation.y += dx * 0.009;
      lastX = event.clientX;
      render();
    }

    function onPointerUp(event) {
      if (!activePointers.has(event.pointerId)) return;
      activePointers.delete(event.pointerId);
      if (activePointers.size > 1) {
        pinchDistance = pointerDistance();
        return;
      }
      if (activePointers.size === 1) {
        const remaining = activePointers.values().next().value;
        dragging = true;
        lastX = remaining.x;
        pinchDistance = null;
        return;
      }
      dragging = false;
    }
    function onWheel(event) {
      if (!camera) return;
      event.preventDefault();
      zoomBy(Math.exp(event.deltaY * 0.001));
    }

    function zoomBy(factor) {
      if (!camera || !three) return;
      const target = new three.Vector3(0, 0, 0);
      const direction = camera.position.clone().sub(target);
      const distance = Math.max(fitDistance, Math.min(fitDistance * 1.45, direction.length() * factor));
      direction.setLength(distance);
      camera.position.copy(target.add(direction));
      render();
    }

    function pointerDistance() {
      const points = [...activePointers.values()];
      if (points.length < 2) return null;
      return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    }

    function onKeyDown(event) {
      if (!model) return;
      const step = 0.12;
      if (event.key === "ArrowLeft") pivot.rotation.y -= step;
      else if (event.key === "ArrowRight") pivot.rotation.y += step;
      else if (event.key === "ArrowUp" || event.key === "ArrowDown") return;
      else if (event.key === "Home") reset();
      else return;
      event.preventDefault();
      render();
    }

    try {
      if (location.protocol === "file:") throw new Error("Open Mr.Doc through python server.py to use the 3D viewer.");
      if (!canvas.getContext("webgl2") && !canvas.getContext("webgl")) throw new Error("WebGL is unavailable in this browser.");
      setStatus("Loading 3D anatomy…");
      three = await import("./assets/vendor/three/three.module.js");
      const { GLTFLoader } = await import("./assets/vendor/three/GLTFLoader.js");
      if (disposed) return owner;

      renderer = new three.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = three.SRGBColorSpace;
      renderer.toneMapping = three.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      scene = new three.Scene();
      camera = new three.PerspectiveCamera(30, 1, 0.05, 1000);
      scene.add(new three.HemisphereLight(0xdff5ff, 0x23394a, 2.2));
      const key = new three.DirectionalLight(0xffffff, 2.3);
      key.position.set(5, 12, 10); scene.add(key);
      const rim = new three.DirectionalLight(0x57c8ff, 1.3);
      rim.position.set(-7, 8, -6); scene.add(rim);

      const gltf = await new Promise((resolve, reject) => new GLTFLoader().load(modelUrl, resolve, undefined, reject));
      if (disposed) return owner;
      model = gltf.scene;
      let visibleMeshes = 0;
      model.traverse((node) => {
        if (!node.isMesh) return;
        const isBones = node.name === "Object_2";
        const isBody = node.name === "Human_BaseMesh_Male_Base_Mesh_mat_0";
        if (modelPart === "bones") node.visible = isBones;
        else if (modelPart === "body") node.visible = isBody;
        if (node.visible) visibleMeshes++;
      });
      if (!visibleMeshes) throw new Error("The selected anatomy model part is unavailable.");
      model.updateMatrixWorld(true);
      const box = new three.Box3().setFromObject(model);
      modelBounds = box.clone();
      const size = box.getSize(new three.Vector3());
      const center = box.getCenter(new three.Vector3());
      pivot = new three.Group();
      // Center the model under a fixed pivot at the origin. Offsetting the pivot
      // itself makes an off-origin GLTF orbit away from the center as it rotates.
      model.position.sub(center);
      pivot.add(model);
      scene.add(pivot);
      updateFitDistance();
      pivot.rotation.y = 0;
      model.traverse((node) => {
        if (!node.isMesh) return;
        node.frustumCulled = false;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => { if (material) material.side = three.DoubleSide; });
      });
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
      canvas.addEventListener("wheel", onWheel, { passive: false });
      canvas.addEventListener("dblclick", reset);
      canvas.addEventListener("keydown", onKeyDown);
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas.parentElement || canvas);
      resize(); reset();
      setStatus("Drag to rotate · scroll or pinch to zoom · double-click to reset", true);
      const animate = () => { if (disposed) return; frameId = requestAnimationFrame(animate); render(); };
      animate();
    } catch (error) {
      if (!disposed) setStatus(error?.message || "Could not load the 3D anatomy model.");
      console.warn("[Mr.Doc anatomy]", error);
    }
    return owner;
  }

  window.MrDocAnatomy = {
    mount,
    dispose,
    resize: (canvas) => canvas ? viewers.get(canvas)?.resize() : viewers.forEach((viewer) => viewer.resize()),
    reset: (canvas) => canvas ? viewers.get(canvas)?.reset() : viewers.forEach((viewer) => viewer.reset()),
  };
})();
