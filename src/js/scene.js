import * as THREE from 'three';

/**
 * Hero scene: a golden sun sinking toward a wireframe ocean of rolling
 * waves, with drifting dust particles. Built for cheap rendering — one
 * plane, one sprite, one points cloud.
 */
export function initHeroScene(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0a08, 0.028);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(0, 3.2, 14);
  camera.lookAt(0, 2.2, -30);

  // --- wireframe wave terrain ---
  const SEG = 110;
  const geo = new THREE.PlaneGeometry(120, 70, SEG, Math.round(SEG * 0.6));
  geo.rotateX(-Math.PI / 2);
  const basePos = geo.attributes.position.array.slice();
  const terrain = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      color: 0xe8b44a,
      wireframe: true,
      transparent: true,
      opacity: 0.32,
    })
  );
  terrain.position.set(0, 0, -20);
  scene.add(terrain);

  // --- sun sprite (radial gradient texture) ---
  const sunCanvas = document.createElement('canvas');
  sunCanvas.width = sunCanvas.height = 256;
  const ctx = sunCanvas.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255, 243, 208, 1)');
  grad.addColorStop(0.25, 'rgba(247, 213, 126, 0.95)');
  grad.addColorStop(0.5, 'rgba(232, 180, 74, 0.45)');
  grad.addColorStop(1, 'rgba(232, 180, 74, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const sun = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(sunCanvas),
      transparent: true,
      depthWrite: false,
    })
  );
  sun.scale.set(26, 26, 1);
  sun.position.set(0, 6.5, -55);
  scene.add(sun);

  // --- floating dust particles ---
  const COUNT = 350;
  const pPos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 90;
    pPos[i * 3 + 1] = Math.random() * 26 + 1;
    pPos[i * 3 + 2] = -Math.random() * 70 + 5;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: 0xf7d57e,
      size: 0.14,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
      depthWrite: false,
    })
  );
  scene.add(particles);

  // --- pointer parallax ---
  const pointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const pos = geo.attributes.position;
  function deform(t) {
    for (let i = 0; i < pos.count; i++) {
      const x = basePos[i * 3];
      const z = basePos[i * 3 + 2];
      pos.array[i * 3 + 1] =
        Math.sin(x * 0.22 + t * 0.7) * Math.cos(z * 0.18 + t * 0.45) * 1.15 +
        Math.sin(x * 0.05 + t * 0.3) * 1.6;
    }
    pos.needsUpdate = true;
  }

  let raf;
  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    deform(t);
    particles.rotation.y = t * 0.012;
    sun.position.y = 6.5 + Math.sin(t * 0.25) * 0.6;
    camera.position.x += (pointer.x * 1.6 - camera.position.x) * 0.04;
    camera.position.y += (3.2 - pointer.y * 0.9 - camera.position.y) * 0.04;
    camera.lookAt(0, 2.2, -30);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  if (reducedMotion) {
    deform(0);
    renderer.render(scene, camera);
  } else {
    tick();
    // Spare the GPU when the tab is hidden.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        clock.start();
        tick();
      }
    });
  }
}
