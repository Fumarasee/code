/**
 * HuskyHub 3D viewer (three.js).
 *
 * - Builds a stylised low-poly husky from the dog's coat + eye colors, so every
 *   profile has a 3D model before real models exist.
 * - If `dog.model` points to a .glb/.gltf file, that model is loaded instead
 *   (auto-centred, scaled to fit and its first animation clip played).
 * - Scene: aurora curtain shader, falling snow, glowing ground ring, orbiting
 *   aurora rim lights. The husky turns its head to follow the camera/cursor.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mix } from '../lib/color.js';

const DEFAULT_POS = new THREE.Vector3(3.7, 2.2, 4.7);
const TARGET = new THREE.Vector3(0, 0.95, 0);
const MIN_DIST = 3.4;
const MAX_DIST = 8.5;

function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.55, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function dotTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------------------------------------------------------------- aurora -- */

function createAuroraCurtain(colorA, colorB) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uBoost: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uBoost;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying vec2 vUv;
      const float TAU = 6.2831853;
      void main() {
        float a = vUv.x * TAU;
        float wave = sin(a * 3.0 + uTime * 0.22) * 0.06
                   + sin(a * 7.0 - uTime * 0.35) * 0.03
                   + sin(a * 13.0 + uTime * 0.5) * 0.015;
        float d = vUv.y - 0.3 - wave;
        float band = smoothstep(0.0, 0.05, d) * (1.0 - smoothstep(0.05, 0.36, d));
        float rays = 0.55 + 0.45 * sin(a * 48.0 + sin(a * 5.0 + uTime * 0.6) * 3.0);
        rays *= 0.75 + 0.25 * sin(a * 17.0 - uTime * 0.8);
        vec3 col = mix(uColorA, uColorB, smoothstep(0.02, 0.3, d));
        float alpha = band * rays * (0.55 + uBoost * 0.6);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 8, 128, 1, true), material);
  mesh.position.y = 3;
  return mesh;
}

/* ----------------------------------------------------------------- husky -- */

function buildHusky(dog) {
  const std = (color, opts = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, flatShading: true, ...opts });

  const dark = std(dog.coat.primary);
  const light = std(dog.coat.secondary);
  const earInner = std(mix(dog.coat.secondary, '#e39aa5', 0.4));
  const black = new THREE.MeshStandardMaterial({ color: '#0d0e12', roughness: 0.35 });
  const tongueMat = new THREE.MeshStandardMaterial({ color: '#e9859c', roughness: 0.5 });
  const eyeMat = (hex) =>
    new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.45, roughness: 0.15 });
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });

  const blob = (r, mat, [sx, sy, sz], [x, y, z], detail = 2) => {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // Torso
  const body = blob(0.5, dark, [0.78, 0.62, 1.3], [0, 1.02, 0]);
  const belly = blob(0.5, light, [0.66, 0.44, 1.1], [0, 0.9, 0.04]);
  const chest = blob(0.36, light, [0.85, 1.0, 0.75], [0, 1.0, 0.52]);
  const neck = blob(0.3, dark, [0.95, 1.15, 0.95], [0, 1.3, 0.55]);
  const throat = blob(0.24, light, [0.9, 1.1, 0.8], [0, 1.24, 0.7]);
  bodyGroup.add(body, belly, chest, neck, throat);

  // Head
  const head = new THREE.Group();
  head.position.set(0, 1.62, 0.8);
  head.rotation.order = 'YXZ'; // yaw first, then pitch — natural "look at"
  bodyGroup.add(head);
  head.add(
    blob(0.3, dark, [1, 0.9, 1.05], [0, 0, 0]),
    blob(0.27, light, [1.02, 0.7, 0.9], [0, -0.08, 0.1]),
    blob(0.16, light, [0.95, 0.72, 1.35], [0, -0.1, 0.3]),
    blob(0.12, light, [0.9, 0.5, 1.2], [0, -0.2, 0.26]),
    blob(0.055, black, [1.2, 0.85, 1], [0, -0.05, 0.51], 1),
  );
  const tongue = blob(0.06, tongueMat, [1, 0.35, 1.5], [0, -0.25, 0.4], 1);
  tongue.visible = false;
  head.add(tongue);

  const addEye = (side, hex, partiHex) => {
    const g = new THREE.Group();
    g.position.set(0.12 * side, 0.06, 0.265);
    g.rotation.z = -0.25 * side;
    const rim = blob(0.062, black, [1.25, 0.8, 0.55], [0, 0, -0.01], 1);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.046, 20, 14), eyeMat(hex));
    iris.position.z = 0.012;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), black);
    pupil.position.z = 0.046;
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), shine);
    glint.position.set(-0.014, 0.016, 0.056);
    g.add(rim, iris, pupil, glint);
    if (partiHex) {
      const wedge = new THREE.Mesh(new THREE.SphereGeometry(0.047, 20, 14, 0, Math.PI / 2.5, 0, Math.PI / 2), eyeMat(partiHex));
      wedge.position.z = 0.012;
      wedge.rotation.set(0, Math.PI / 2, -0.3);
      g.add(wedge);
    }
    head.add(g);
    head.add(blob(0.035, light, [1.35, 0.7, 0.6], [0.11 * side, 0.155, 0.245], 1)); // eyebrow dot
  };
  addEye(-1, dog.eyes.left, dog.eyes.leftParti);
  addEye(1, dog.eyes.right, dog.eyes.rightParti);

  const ears = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.15 * side, 0.2, -0.02);
    pivot.rotation.set(-0.12, 0, -0.24 * side);
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.28, 4), dark);
    outer.rotation.y = Math.PI / 4;
    outer.scale.set(1, 1, 0.55);
    outer.position.y = 0.13;
    outer.castShadow = true;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.18, 4), earInner);
    inner.rotation.y = Math.PI / 4;
    inner.scale.set(1, 1, 0.4);
    inner.position.set(0, 0.1, 0.03);
    pivot.add(outer, inner);
    head.add(pivot);
    return pivot;
  });

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.085, 0.068, 0.7, 10);
  [-1, 1].forEach((side) => {
    const front = new THREE.Mesh(legGeo, light);
    front.position.set(0.2 * side, 0.37, 0.42);
    front.castShadow = true;
    bodyGroup.add(front, blob(0.085, light, [1, 0.55, 1.35], [0.2 * side, 0.035, 0.46], 1));

    bodyGroup.add(blob(0.22, dark, [0.65, 1.05, 1.0], [0.22 * side, 0.86, -0.42]));
    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.064, 0.64, 10), light);
    back.position.set(0.22 * side, 0.34, -0.5);
    back.rotation.x = 0.12;
    back.castShadow = true;
    bodyGroup.add(back, blob(0.085, light, [1, 0.55, 1.35], [0.22 * side, 0.035, -0.44], 1));
  });

  // Curled sickle tail
  const tail = new THREE.Group();
  tail.position.set(0, 1.18, -0.6);
  bodyGroup.add(tail);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0.22, -0.2),
    new THREE.Vector3(0, 0.48, -0.17),
    new THREE.Vector3(0, 0.6, 0.04),
    new THREE.Vector3(0, 0.52, 0.22),
  ]);
  const SEGMENTS = 12;
  for (let i = 0; i < SEGMENTS; i++) {
    const t = i / (SEGMENTS - 1);
    const p = curve.getPoint(t);
    const r = 0.13 - t * 0.055;
    tail.add(blob(r, i >= SEGMENTS - 2 ? light : dark, [1, 1, 1], [p.x, p.y, p.z], 1));
  }

  return { root, bodyGroup, body, chest, head, tail, ears, tongue };
}

/* ---------------------------------------------------------------- viewer -- */

export function createHuskyViewer(container, dog, { onStatus = () => {} } = {}) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [accentA, accentB] = dog.accent || ['#3cf2a4', '#a86bff'];
  let disposed = false;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'viewer__gl';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.copy(DEFAULT_POS);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.enableZoom = false; // zoom with the toolbar so page scrolling stays natural
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = Math.PI / 2 - 0.06;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 1.1;
  controls.update();

  // Lights
  scene.add(new THREE.HemisphereLight('#bfe3ff', '#1a1030', 1.2));
  const key = new THREE.DirectionalLight('#ffffff', 2.3);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { near: 0.5, far: 20, left: -3, right: 3, top: 3, bottom: -3 });
  key.shadow.bias = -0.0005;
  key.shadow.radius = 4;
  scene.add(key);
  const rimA = new THREE.PointLight(accentA, 16, 9, 2);
  const rimB = new THREE.PointLight(accentB, 16, 9, 2);
  scene.add(rimA, rimB);

  // Ground: snowy disc fading at the edges + glowing rings
  const groundMat = new THREE.MeshStandardMaterial({
    color: '#6f82a3', // moonlit snow — stays readable under the key light
    roughness: 1,
    transparent: true,
    alphaMap: radialTexture('#ffffff', '#000000'),
  });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(3.6, 72), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const ringMat = (color, opacity) =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  const ringA = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.4, 128), ringMat(accentA, 0.55));
  const ringB = new THREE.Mesh(new THREE.RingGeometry(1.75, 1.77, 128), ringMat(accentB, 0.35));
  [ringA, ringB].forEach((r) => {
    r.rotation.x = -Math.PI / 2;
    r.position.y = 0.006;
    scene.add(r);
  });

  // Howl "sound waves"
  const waves = Array.from({ length: 3 }, () => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 8, 64), ringMat(accentA, 0));
    m.visible = false;
    scene.add(m);
    return m;
  });

  const aurora = createAuroraCurtain(accentA, accentB);
  scene.add(aurora);

  // Snow
  const SNOW = reduced ? 0 : 650;
  const snowPos = new Float32Array(SNOW * 3);
  const snowSpeed = new Float32Array(SNOW);
  for (let i = 0; i < SNOW; i++) {
    const r = Math.sqrt(Math.random()) * 5;
    const a = Math.random() * Math.PI * 2;
    snowPos[i * 3] = Math.cos(a) * r;
    snowPos[i * 3 + 1] = Math.random() * 5.5;
    snowPos[i * 3 + 2] = Math.sin(a) * r;
    snowSpeed[i] = 0.15 + Math.random() * 0.35;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(
    snowGeo,
    new THREE.PointsMaterial({
      size: 0.05,
      map: dotTexture(),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  scene.add(snow);

  // Model: procedural husky, optionally replaced by a real GLB
  const husky = buildHusky(dog);
  scene.add(husky.root);
  let custom = null; // { root, mixer, clips }

  if (dog.model) {
    onStatus({ state: 'loading', message: 'Loading 3D model…' });
    const url = /^(https?:|\/)/.test(dog.model) ? dog.model : `${import.meta.env.BASE_URL}${dog.model}`;
    new GLTFLoader().load(
      url,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const scale = 1.9 / Math.max(size.y, size.x * 0.8, size.z * 0.55);
        model.scale.setScalar(scale);
        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box.min.y;
        model.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        const mixer = new THREE.AnimationMixer(model);
        if (gltf.animations[0]) mixer.clipAction(gltf.animations[0]).play();
        custom = { root: model, mixer, clips: gltf.animations };
        husky.root.visible = false;
        scene.add(model);
        onStatus({ state: 'ready', custom: true });
      },
      undefined,
      () => onStatus({ state: 'ready', custom: false, message: 'Could not load the model — showing the placeholder.' }),
    );
  } else {
    onStatus({ state: 'ready', custom: false });
  }

  // Interaction state
  const pointer = new THREE.Vector2();
  let pointerInside = false;
  let desiredDist = DEFAULT_POS.distanceTo(TARGET);
  let resetting = false;
  let action = null; // { name, start, duration }

  const onPointerMove = (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    pointerInside = true;
  };
  const onPointerLeave = () => {
    pointerInside = false;
  };
  const onDoubleClick = () => reset();
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);
  renderer.domElement.addEventListener('dblclick', onDoubleClick);
  controls.addEventListener('start', () => {
    resetting = false;
  });

  // Sizing
  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // Animation loop
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const headWorld = new THREE.Vector3();
  const headQuat = new THREE.Quaternion();
  let headYaw = 0;
  let headPitch = 0;
  let nextTwitch = 2;
  let twitch = { ear: 0, until: 0 };

  const ease = (x) => x * x * (3 - 2 * x);
  const envelope = (u) => (u < 0.18 ? ease(u / 0.18) : u > 0.78 ? ease((1 - u) / 0.22) : 1);

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    let wagSpeed = 5;
    let wagAmp = 0.22;
    let bounce = 0;
    let howl = 0;
    if (action) {
      const u = (t - action.start) / action.duration;
      if (u >= 1) {
        action = null;
        husky.tongue.visible = false;
      } else {
        const k = envelope(u);
        if (action.name === 'wag') {
          wagSpeed = 5 + 13 * k;
          wagAmp = 0.22 + 0.4 * k;
          bounce = Math.abs(Math.sin(t * 9)) * 0.045 * k;
          husky.tongue.visible = k > 0.2;
        } else if (action.name === 'howl') {
          howl = k;
          husky.head.getWorldQuaternion(headQuat);
          waves.forEach((w, i) => {
            // Rings travel out of the muzzle, growing and fading
            const p = (u * 2.4 + i / waves.length) % 1;
            w.visible = husky.root.visible && u > 0.15 && u < 0.88;
            w.position.copy(husky.head.localToWorld(tmp.set(0, -0.05, 0.55 + p * 0.9)));
            w.quaternion.copy(headQuat);
            w.scale.setScalar(0.35 + p * 1.3);
            w.material.opacity = (1 - p) * 0.9 * k;
          });
        }
      }
    }
    if (!action || action.name !== 'howl') waves.forEach((w) => (w.visible = false));

    // Procedural husky idle
    if (husky.root.visible) {
      const breath = 1 + Math.sin(t * 2.2) * 0.018;
      husky.body.scale.y = 0.62 * breath;
      husky.chest.scale.y = 1.0 * breath;
      husky.bodyGroup.position.y = bounce;
      husky.tail.rotation.y = Math.sin(t * wagSpeed) * wagAmp;
      husky.tail.rotation.x = -0.05 + Math.sin(t * 1.3) * 0.04;

      // Head follows the camera (and the cursor, a little)
      husky.head.getWorldPosition(headWorld);
      tmp.copy(camera.position).sub(headWorld);
      let yaw = Math.atan2(tmp.x, tmp.z);
      yaw = THREE.MathUtils.clamp(yaw, -0.85, 0.85);
      let pitch = -Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z)) * 0.5;
      if (pointerInside) {
        yaw += pointer.x * 0.25;
        pitch -= pointer.y * 0.15;
      }
      yaw += Math.sin(t * 0.45) * 0.08;
      pitch = THREE.MathUtils.lerp(pitch, -0.8, howl);
      yaw = THREE.MathUtils.lerp(yaw, 0, howl * 0.7);
      const s = 1 - Math.exp(-dt * 4);
      headYaw += (yaw - headYaw) * s;
      headPitch += (pitch - headPitch) * s;
      husky.head.rotation.set(headPitch, headYaw, 0);

      // Occasional ear twitch
      if (t > nextTwitch) {
        twitch = { ear: Math.random() < 0.5 ? 0 : 1, until: t + 0.25 };
        nextTwitch = t + 2 + Math.random() * 4;
      }
      husky.ears.forEach((ear, i) => {
        const side = i === 0 ? -1 : 1;
        const flick = twitch.ear === i && t < twitch.until ? Math.sin(((twitch.until - t) / 0.25) * Math.PI) * 0.35 : 0;
        ear.rotation.z = -0.24 * side - flick * side;
        ear.rotation.x = -0.12 - (action?.name === 'wag' ? 0.25 : 0);
      });
    }

    if (custom) {
      custom.mixer.update(dt);
      custom.root.position.y = bounce;
      custom.root.rotation.x = -0.25 * howl;
    }

    // Environment
    rimA.position.set(Math.cos(t * 0.3) * 2.6, 2.3, Math.sin(t * 0.3) * 2.6);
    rimB.position.set(Math.cos(t * 0.3 + Math.PI) * 2.6, 1.6, Math.sin(t * 0.3 + Math.PI) * 2.6);
    rimA.intensity = 16 + howl * 6;
    rimB.intensity = 16 + howl * 6;
    aurora.material.uniforms.uTime.value = t;
    aurora.material.uniforms.uBoost.value = howl;
    ringA.material.opacity = 0.4 + Math.sin(t * 1.6) * 0.15;
    ringB.material.opacity = 0.25 + Math.sin(t * 1.6 + 1.5) * 0.1;
    ringA.scale.setScalar(1 + Math.sin(t * 1.6) * 0.015);

    for (let i = 0; i < SNOW; i++) {
      const iy = i * 3 + 1;
      snowPos[iy] -= snowSpeed[i] * dt;
      snowPos[i * 3] += Math.sin(t * 0.8 + i) * 0.0015;
      if (snowPos[iy] < 0) snowPos[iy] = 5.5;
    }
    if (SNOW) snowGeo.attributes.position.needsUpdate = true;

    // Smooth zoom / reset
    tmp.copy(camera.position).sub(controls.target);
    const len = tmp.length();
    if (Math.abs(len - desiredDist) > 1e-3) {
      tmp.setLength(len + (desiredDist - len) * (1 - Math.exp(-dt * 7)));
      camera.position.copy(controls.target).add(tmp);
    }
    if (resetting) {
      camera.position.lerp(DEFAULT_POS, 1 - Math.exp(-dt * 4));
      if (camera.position.distanceTo(DEFAULT_POS) < 0.01) resetting = false;
    }

    controls.update();
    renderer.render(scene, camera);
  }

  // Only render while visible
  let visible = true;
  let running = false;
  const updateLoop = () => {
    const shouldRun = visible && !document.hidden && !disposed;
    if (shouldRun === running) return;
    running = shouldRun;
    if (running) clock.getDelta();
    renderer.setAnimationLoop(running ? tick : null);
  };
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateLoop();
  });
  io.observe(container);
  document.addEventListener('visibilitychange', updateLoop);
  updateLoop();

  function reset() {
    resetting = true;
    desiredDist = DEFAULT_POS.distanceTo(TARGET);
  }

  return {
    get autoRotate() {
      return controls.autoRotate;
    },
    setAutoRotate(on) {
      controls.autoRotate = on;
    },
    zoom(direction) {
      desiredDist = THREE.MathUtils.clamp(desiredDist * (direction > 0 ? 0.85 : 1.18), MIN_DIST, MAX_DIST);
      resetting = false;
    },
    reset,
    play(name) {
      action = { name, start: clock.elapsedTime, duration: name === 'howl' ? 3.2 : 2.6 };
      if (custom) {
        const clip = custom.clips.find((c) => c.name.toLowerCase().includes(name));
        if (clip) custom.mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce, 1).play();
      }
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', updateLoop);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('dblclick', onDoubleClick);
      controls.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => {
          Object.values(m).forEach((v) => v?.isTexture && v.dispose());
          m.dispose();
        });
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
