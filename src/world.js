// Shared engine for dog-controlled outdoor levels: renderer, sky, sun, water, player dog
// (swim / wade / walk), buddy AI, treats to collect, and a fetch race. Levels only build scenery.
import * as THREE from 'three';
import { createPainterlyRenderer, makeRiverbedMaterial } from './painterly.js';
import { createDog } from './dog.js';
import { gaitFrameMs, OLD_GAIT } from './gait.js';
import { BREED_ORDER } from './breeds.js';
import { placeTree, updateTrees } from './trees.js';
import { addDetail, TEX } from './textures.js';
export { addDetail, TEX, placeTree };

export const LEVEL_ORDER = ['swimhole', 'trail', 'bluff', 'creek', 'river', 'station', 'swimstation'];
export const nextLevel = (cur) => LEVEL_ORDER[(LEVEL_ORDER.indexOf(cur) + 1) % LEVEL_ORDER.length];
export { THREE, makeRiverbedMaterial };

export function seeded(seed = 7) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

export function softTexture(draw, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Instanced scatter: place(i) -> { p: Vector3, s: Vector3|number, c?: Color, rot?: Euler } */
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), SV = new THREE.Vector3(), EU = new THREE.Euler();
export function scatter(scene, geo, mat, n, place, { cast = false, receive = true } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, n);
  for (let i = 0; i < n; i++) {
    const { p, s = 1, c, rot } = place(i);
    M.compose(p, Q.setFromEuler(rot || EU.set(0, Math.random() * 6.28, 0)), typeof s === 'number' ? SV.setScalar(s) : s);
    im.setMatrixAt(i, M); if (c) im.setColorAt(i, c);
  }
  im.castShadow = cast; im.receiveShadow = receive; scene.add(im); return im;
}

/** Ground mesh from a height function with per-vertex colors. */
export function terrain(scene, { w, d, cx = 0, cz = 0, seg = 1.6, height, color, material, detail = null }) {
  const g = new THREE.PlaneGeometry(w, d, Math.round(w * seg), Math.round(d * seg)).rotateX(-Math.PI / 2).translate(cx, 0, cz);
  const P = g.attributes.position, col = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), y = height(x, z);
    P.setY(i, y);
    const c = color(x, z, y); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mat = material || new THREE.MeshStandardMaterial({ roughness: 1 });
  mat.vertexColors = true;
  if (detail) addDetail(mat, detail, { scale: 0.3, strength: 0.75 });
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m); return m;
}

/** Live-oak style tree: curved trunk + clustered leaf blobs (instanced via a shared pool). */
export function makeForest(scene, rnd, max = 5000) {
  const blobs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9 }), max);
  blobs.castShadow = blobs.receiveShadow = true; blobs.count = 0; scene.add(blobs);
  const bark = new THREE.MeshStandardMaterial({ color: '#6d5a44', roughness: 1 });
  const cols = ['#b9d04a', '#94b83b', '#6e9a34', '#d8dc5c', '#5a8a30', '#c7d84f', '#e2c94a'].map((c) => new THREE.Color(c));
  const blob = (x, y, z, s, c) => {
    if (blobs.count >= max) return;
    M.compose(SV.set(x, y, z), Q.setFromEuler(EU.set(rnd() * 3, rnd() * 3, rnd() * 3)), new THREE.Vector3(s * (1 + rnd() * 0.4), s * (0.6 + rnd() * 0.3), s * (1 + rnd() * 0.4)));
    blobs.setMatrixAt(blobs.count, M); blobs.setColorAt(blobs.count, c); blobs.count++;
    blobs.instanceMatrix.needsUpdate = true; if (blobs.instanceColor) blobs.instanceColor.needsUpdate = true;
  };
  return {
    blob,
    /** Real branching tree (EZ-Tree). base Vector3, height m; yellow 0..1 picks golden aspens. */
    tree(base, h = 7, lean = null, spread = 3.6, yellow = 0) {
      return placeTree(scene, base, { height: h * 1.25, rnd, variant: rnd() < yellow ? 5 : (rnd() * 5) | 0 });
    },
    bush(base, h = 1.2) { return placeTree(scene, base, { height: h, bush: true, rnd }); },
  };
}

/** Clear water plane with fresnel + ripple normals (same look as the swimming hole). */
export function makeWater(scene, { w, d, cx = 0, cz = 0, y = 0, color = '#138a80', clear = 0.38, opacity = 0.5 }) {
  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.08, depthWrite: false });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; varying vec3 vW;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.z += sin(position.x*0.8+uTime*1.3)*0.03 + cos(position.y*0.9+uTime)*0.03;`)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; varying vec3 vW;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec2 q = vW.xz;
        float dx = cos(q.x*1.7+uTime*1.6)*0.5 + cos((q.x+q.y)*2.9-uTime*2.1)*0.3 + cos(q.y*0.6+q.x*4.1+uTime)*0.2;
        float dz = sin(q.y*1.9-uTime*1.4)*0.5 + sin((q.x-q.y)*3.3+uTime*1.8)*0.3 + sin(q.x*0.7+q.y*4.3-uTime)*0.2;
        normal = normalize(normal + (viewMatrix*vec4(dx*0.2,0.,dz*0.2,0.)).xyz);`)
      .replace('#include <opaque_fragment>', `
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(V, vec3(0.,1.,0.)), 0.0), 3.0);
        diffuseColor.a = mix(${clear.toFixed(2)}, 0.9, fres);
        outgoingLight = mix(outgoingLight, vec3(0.35,0.62,0.78), fres*0.45);
        #include <opaque_fragment>`);
  };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 1, 1).rotateX(-Math.PI / 2), mat);
  m.position.set(cx, y, cz); m.renderOrder = 2; scene.add(m);
  return { mesh: m, uniforms };
}

function makeBone() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#f6e7c3', emissive: '#6b4a10', emissiveIntensity: 0.6, roughness: 0.5 });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10).rotateZ(Math.PI / 2), mat));
  for (const x of [-0.11, 0.11]) for (const z of [-0.035, 0.035]) {
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat); k.position.set(x, 0, z); g.add(k);
  }
  g.children.forEach((c) => (c.castShadow = true));
  return g;
}

/**
 * Run a level. cfg:
 *  name, helpExtra, fog [color, near, far], groundH(x,z), waterY (null = no water),
 *  bounds {x0,x1,z0,z1}, start {x,z,heading}, player breed, buddies [breed...],
 *  build(ctx) -> builds scenery (ctx: scene, rnd, groundH, ...), treatSpot(rnd) -> {x,z}
 */
export function runLevel(cfg) {
  const canvas = document.getElementById('game');
  const hud = document.getElementById('hud');
  const help = document.getElementById('help');
  const R = createPainterlyRenderer(canvas);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(...(cfg.fog || ['#cfe0e8', 40, 160]));
  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 400);
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  const rnd = seeded(cfg.seed || 11);
  const groundH = cfg.groundH, waterY = cfg.waterY ?? null;

  // light
  scene.add(new THREE.HemisphereLight('#cfe8ff', cfg.groundTint || '#7a7a45', 0.95));
  const sun = new THREE.DirectionalLight('#fff1d0', 2.5);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 });
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);

  // sky + clouds
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = clamp(vP.y,0.,1.); gl_FragColor = vec4(mix(vec3(0.76,0.88,0.97), vec3(0.17,0.47,0.86), pow(h,0.45)),1.); }',
  })));
  const cloudTex = softTexture((g, s) => {
    for (let i = 0; i < 16; i++) {
      const x = s * (0.15 + Math.random() * 0.7), y = s * (0.45 + Math.random() * 0.15), r = s * (0.07 + Math.random() * 0.12);
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,0.95)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill();
    }
  });
  for (let i = 0; i < 16; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, fog: false, depthWrite: false }));
    const a = rnd() * 6.28; sp.position.set(Math.cos(a) * 220, 45 + rnd() * 60, Math.sin(a) * 220);
    sp.scale.set(80 + rnd() * 60, 38, 1); scene.add(sp);
  }

  // ---- painted station (step 9): fixed camera, a painting as the backdrop, a shadow-only floor ----
  const st = cfg.station;
  let stationTick = null;
  if (st) {
    // step 11: the painting lives in world space as two layers (far: everything; near: ground below the horizon,
    // faded in over a soft band) so a gently drifting camera gets parallax; sun is a spotlight with an animated
    // leaf-dapple cookie; time of day (?hour=) sets sun height and warmth; FOV pushes in when the dog runs.
    const basePos = new THREE.Vector3(...st.pos), baseLook = new THREE.Vector3(...st.look);
    const dir = baseLook.clone().sub(basePos).normalize();
    camera.fov = st.fov; camera.near = 0.1; camera.far = 500; camera.updateProjectionMatrix();
    camera.position.copy(basePos); camera.lookAt(baseLook);
    const tex = new THREE.TextureLoader().load(st.image); tex.colorSpace = THREE.SRGBColorSpace;
    const horizon = st.horizon ?? 0.43, band = st.band ?? 0.1;
    const alphaTex = softTexture((g, size) => { // 0 above the horizon, 1 below it (canvas y runs top->bottom like the image)
      const grd = g.createLinearGradient(0, size * (horizon - band / 2), 0, size * (horizon + band / 2));
      grd.addColorStop(0, '#000'); grd.addColorStop(1, '#fff'); g.fillStyle = grd; g.fillRect(0, 0, size, size);
    });
    alphaTex.colorSpace = THREE.NoColorSpace;
    const layers = [
      { d: st.farDist ?? 150, mesh: new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false })) },
      { d: st.nearDist ?? 40, mesh: new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, alphaMap: alphaTex, transparent: true, fog: false, toneMapped: false, depthWrite: false })) },
    ];
    const fitBackdrop = () => { // each layer covers the viewport from the base camera, with margin for the drift
      const margin = 1.12;
      layers.forEach((L, i) => {
        const h = 2 * L.d * Math.tan(THREE.MathUtils.degToRad(st.fov) / 2), w = h * camera.aspect;
        const k = Math.max(w / st.aspect, h) * margin;
        L.mesh.scale.set(k * st.aspect, k, 1);
        L.mesh.position.copy(basePos).addScaledVector(dir, L.d); L.mesh.lookAt(basePos); L.mesh.renderOrder = -10 + i;
        // cropY: which row of the painting sits at screen centre (0.5 = middle). Lets a portrait painting show its upper band.
        if (st.cropY !== undefined) L.mesh.position.addScaledVector(camera.up, -(0.5 - st.cropY) * k * (L.d / L.d));
      });
    };
    layers.forEach((L) => scene.add(L.mesh)); fitBackdrop(); addEventListener('resize', fitBackdrop);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ color: '#2b2416', opacity: st.shadow ?? 0.4 }));
    floor.position.y = st.floorY ?? 0; floor.receiveShadow = true; scene.add(floor);
    scene.add(new THREE.HemisphereLight('#fff6e0', '#d8c79a', st.fill ?? 0.9)); // paintings are high-key: lift the dogs to match
    R.painterly.uniforms.saturation.value = st.saturation ?? 1.0; // the painting already carries the palette
    R.painterly.uniforms.bleed.value = st.bleed ?? 0.7;         // soften the seam where 3D dogs meet the painting

    // time of day: ?hour= (default from the level). Noon = high white-gold sun; 17-18 = low, long, orange.
    const hour = parseFloat(new URLSearchParams(location.search).get('hour')) || st.hour || 12;
    const elev = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(78 - Math.abs(hour - 12.5) * 11, 8, 78));
    const warm = THREE.MathUtils.clamp((Math.abs(hour - 12.5) - 2.5) / 3.5, 0, 1); // 0 at midday -> 1 at golden hour
    const sunColor = new THREE.Color('#fff1d0').lerp(new THREE.Color('#ffb466'), warm);
    const [sx, , sz] = st.sun; const horiz = Math.hypot(sx, sz) || 1;
    const sunDir = new THREE.Vector3(sx / horiz * Math.cos(elev), Math.sin(elev), sz / horiz * Math.cos(elev));
    sun.castShadow = false; sun.intensity = 0.7; sun.color.copy(sunColor); sun.position.copy(sunDir).multiplyScalar(30).add(new THREE.Vector3(0, 0, 8)); sun.target.position.set(0, 0, 8);

    // leaf dapple: a spotlight cookie, slowly turning
    const dapple = softTexture((g, size) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, size, size);
      for (let i = 0; i < 90; i++) {
        const x = Math.random() * size, y = Math.random() * size, r = size * (0.03 + Math.random() * 0.07);
        const grd = g.createRadialGradient(x, y, 0, x, y, r); grd.addColorStop(0, 'rgba(60,45,20,0.55)'); grd.addColorStop(1, 'rgba(60,45,20,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill();
      }
    });
    dapple.center.set(0.5, 0.5); dapple.wrapS = dapple.wrapT = THREE.RepeatWrapping;
    const spot = new THREE.SpotLight(sunColor, 2.4 * (1 - warm * 0.25), 0, 0.42, 0.7, 0);
    spot.position.copy(sunDir).multiplyScalar(26).add(new THREE.Vector3(0, 0, 8)); spot.target.position.set(0, 0, 7);
    spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0006; spot.shadow.camera.near = 4; spot.shadow.camera.far = 70;
    spot.map = st.dapple === false ? null : dapple; scene.add(spot, spot.target);

    let fovK = 0;
    stationTick = (dt, t, run) => {
      camera.position.set(basePos.x + Math.sin(t * 0.13) * 0.12, basePos.y + Math.sin(t * 0.21) * 0.04, basePos.z + Math.sin(t * 0.09) * 0.06);
      tmp.copy(baseLook); tmp.x += Math.sin(t * 0.07) * 0.18; camera.lookAt(tmp);
      fovK = THREE.MathUtils.lerp(fovK, run, 1 - Math.exp(-dt * 1.5));
      camera.fov = st.fov - 2.5 * fovK; camera.updateProjectionMatrix();
      dapple.rotation = t * 0.012; dapple.offset.set(Math.sin(t * 0.25) * 0.008, Math.cos(t * 0.19) * 0.006);
    };
  }

  const ctx = { scene, rnd, groundH, waterY, THREE, scatter: (...a) => scatter(scene, ...a), terrain: (o) => terrain(scene, o), forest: makeForest(scene, rnd), makeRiverbedMaterial };
  const water = waterY !== null && cfg.water !== false ? makeWater(scene, { y: waterY, ...(cfg.waterOpts || { w: 400, d: 400 }) }) : null;
  const animated = cfg.build(ctx) || [];

  // ---- dogs ----
  let dog = createDog(cfg.player || 'golden'); dog.setGround(groundH);
  dog.group.position.set(cfg.start.x, groundH(cfg.start.x, cfg.start.z), cfg.start.z);
  scene.add(dog.group, dog.drops);
  const buddies = (cfg.buddies || []).map((b, i) => {
    const d = createDog(b); d.setGround(groundH);
    d.group.position.set(cfg.start.x + (i + 1) * 1.6, groundH(cfg.start.x + (i + 1) * 1.6, cfg.start.z + 1), cfg.start.z + 1);
    scene.add(d.group, d.drops);
    return { dog: d, heading: cfg.start.heading, vel: new THREE.Vector3(), off: new THREE.Vector3((i % 2 ? 1 : -1) * (1.4 + i * 0.6), 0, -1.2 - i * 0.8), wanderT: rnd() * 5, sniff: 0 };
  });

  // ---- ripples ----
  const ripples = [], rippleGeo = new THREE.RingGeometry(0.9, 1.0, 40).rotateX(-Math.PI / 2);
  function ripple(x, z, k = 1) {
    if (waterY === null) return;
    const m = new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 * k, depthWrite: false }));
    m.position.set(x, waterY + 0.03, z); m.renderOrder = 3; scene.add(m); ripples.push({ m, t: 0, k });
  }

  // ---- treats ----
  const TREATS = cfg.treats ?? 12;
  const treats = [];
  for (let i = 0; i < TREATS; i++) {
    const { x, z } = cfg.treatSpot(rnd);
    const b = makeBone();
    const gy = groundH(x, z), y = waterY !== null && gy < waterY ? waterY + 0.05 : gy + 0.25;
    b.position.set(x, y, z); b.userData.y = y; scene.add(b); treats.push(b);
  }
  let got = 0, fetchScore = 0;

  // ---- fetch ball ----
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), new THREE.MeshStandardMaterial({ color: '#d4ef3a', roughness: 0.7 }));
  ball.castShadow = true; ball.visible = false; scene.add(ball);
  const ballV = new THREE.Vector3();
  let ballState = 'idle', carrier = null; // idle | flying | down | carried

  const toastEl = Object.assign(document.createElement('div'), { style: 'position:fixed;top:14px;right:14px;font:600 15px system-ui;color:#fff;text-shadow:0 1px 3px #0009;text-align:right' });
  document.body.appendChild(toastEl);
  let toastMsg = '', toastT = 0;
  const toast = (m) => { toastMsg = m; toastT = 2.5; };

  // ---- input ----
  const keys = {};
  help.textContent = `${cfg.name} · WASD/drag · Shift run · F throw ball · E shake · C sit · L next level · 1-0 breeds${cfg.helpExtra ? ' · ' + cfg.helpExtra : ''}`;
  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'F3') { e.preventDefault(); hud.style.display = hud.style.display === 'block' ? 'none' : 'block'; }
    if (e.code === 'KeyE') dog.shake();
    if (e.code === 'KeyC') dog.setPose(dog.pose === 'sit' ? 'lie' : dog.pose === 'lie' ? 'auto' : 'sit');
    if (e.code === 'KeyL') location.search = '?level=' + nextLevel(cfg.id);
    if (e.code === 'KeyF') throwBall();
    const dn = e.code.match(/^Digit(\d)$/);
    if (dn) {
      const old = dog; dog = createDog(BREED_ORDER[(+dn[1] + 9) % 10]); dog.setGround(groundH);
      dog.group.position.copy(old.group.position); scene.remove(old.group); old.dispose(); scene.add(dog.group, dog.drops);
      if (carrier === old) carrier = dog;
      toast(dog.name);
    }
  });
  addEventListener('keyup', (e) => (keys[e.code] = false));
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => (drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 }));
  addEventListener('pointermove', (e) => { if (drag) { drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y; } });
  addEventListener('pointerup', () => (drag = null));
  canvas.addEventListener('dblclick', () => throwBall());

  function throwBall() {
    if (ballState === 'flying') return;
    if (carrier === dog) fetchScore++;
    carrier = null; ballState = 'flying'; ball.visible = true;
    const p = dog.group.position;
    ball.position.set(p.x, p.y + 1.2, p.z);
    const dist = 9 + Math.random() * 6, a = heading + (Math.random() - 0.5) * 0.5;
    ballV.set(Math.sin(a) * dist * 0.55, 6, Math.cos(a) * dist * 0.55);
    toast('Fetch! 🎾');
  }

  // ---- loop ----
  R.setup(scene, camera);
  const clock = new THREE.Clock();
  let heading = cfg.start.heading, speed = 0, t = 0, rippleT = 0;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmp = new THREE.Vector3(), mouth = new THREE.Vector3();
  const inBounds = (x, z) => x > cfg.bounds.x0 && x < cfg.bounds.x1 && z > cfg.bounds.z0 && z < cfg.bounds.z1 && (!cfg.blocked || !cfg.blocked(x, z));

  // swim if deeper than ~80% of leg height; wade otherwise
  function stepDog(d, dt, spd) {
    const p = d.group.position, gy = groundH(p.x, p.z);
    const depth = waterY === null ? 0 : waterY - gy;
    const swim = depth > 0.8 * (d === dog ? 0.66 : 0.6);
    if (!swim && depth > 0.05) {
      d.wetten(dt * 0.6);
      if (Math.abs(spd) > 0.3 && Math.random() < dt * 4) ripple(p.x, p.z, 0.6);
    }
    d.update(dt, spd, swim, gy, waterY ?? 0);
    if (swim && Math.random() < dt * (1 + Math.abs(spd))) ripple(p.x, p.z, 0.7);
    return swim;
  }

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05); t += dt;
    water && (water.uniforms.uTime.value = t);
    updateTrees(t);
    animated.forEach((a) => a(t, dt));

    // player
    let turn = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
    let thrust = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 0.5 : 0);
    if (drag) { turn = THREE.MathUtils.clamp(-drag.dx / 120, -1, 1); thrust = THREE.MathUtils.clamp(-drag.dy / 120 + 0.6, -0.5, 1); }
    const swimming = dog.mode === 'swim';
    const top = swimming ? 2.6 : keys.ShiftLeft || keys.ShiftRight ? 7 : 3.2;
    heading += turn * dt * 2;
    speed = THREE.MathUtils.lerp(speed, thrust * top, 1 - Math.exp(-dt * (swimming ? 2 : 4)));
    const p = dog.group.position;
    const nx = p.x + Math.sin(heading) * speed * dt, nz = p.z + Math.cos(heading) * speed * dt;
    // can't climb walls steeper than ~1:1 (keeps you off the bluff face)
    const rise = groundH(nx, nz) - groundH(p.x, p.z);
    if (inBounds(nx, nz) && rise < Math.abs(speed * dt) * 1.2 + 0.05) { p.x = nx; p.z = nz; } else speed *= 0.4;
    dog.group.rotation.y = heading;
    stepDog(dog, dt, speed);
    rippleT += dt;

    // buddies: follow, wander, chase the ball
    buddies.forEach((b, i) => {
      const bp = b.dog.group.position;
      let target;
      if (ballState === 'down' || (ballState === 'flying' && ballV.y < 0)) target = tmp.copy(ball.position);
      else if (carrier === b.dog) target = tmp.copy(p).addScaledVector(new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading)), 1.2);
      else {
        b.wanderT -= dt;
        if (b.wanderT < 0) { b.wanderT = 4 + rnd() * 6; b.off.set((rnd() - 0.5) * 6, 0, (rnd() - 0.5) * 6); b.sniff = rnd() < 0.4 ? 2 + rnd() * 2 : 0; }
        target = tmp.copy(p).add(b.off);
      }
      b.sniff = Math.max(0, b.sniff - dt); b.dog.sniff(b.sniff > 0 && ballState !== 'down');
      const want = target.sub(bp).setY(0), dist = want.length();
      const chasing = ballState === 'down' || carrier === b.dog;
      const maxV = b.sniff > 0 && !chasing ? 0 : chasing ? 5.5 : Math.min(4, dist * 0.9);
      b.vel.lerp(dist > 0.6 ? want.normalize().multiplyScalar(maxV) : tmp.set(0, 0, 0), 1 - Math.exp(-dt * 3));
      const bx = bp.x + b.vel.x * dt, bz = bp.z + b.vel.z * dt;
      if (inBounds(bx, bz) && groundH(bx, bz) - groundH(bp.x, bp.z) < 0.25) { bp.x = bx; bp.z = bz; } else b.vel.multiplyScalar(-0.3);
      const v = Math.hypot(b.vel.x, b.vel.z);
      if (v > 0.2) b.heading = Math.atan2(b.vel.x, b.vel.z);
      b.dog.group.rotation.y = b.heading;
      stepDog(b.dog, dt, v);
      // buddy drops the ball at your feet
      if (carrier === b.dog && dist < 1.4) { carrier = null; ballState = 'down'; ball.position.copy(bp).setY(groundH(bp.x, bp.z) + 0.06); ballState = 'atFeet'; toast(`${b.dog.name} brought it back!`); }
    });

    // ball physics + pickup
    if (ballState === 'flying') {
      ballV.y -= 9.8 * dt; ball.position.addScaledVector(ballV, dt);
      const floor = Math.max(groundH(ball.position.x, ball.position.z), waterY ?? -1e9) + 0.06;
      if (ball.position.y < floor) { ball.position.y = floor; ballState = 'down'; ripple(ball.position.x, ball.position.z, 1.2); }
    }
    if (ballState === 'down' || ballState === 'atFeet') {
      if (waterY !== null && groundH(ball.position.x, ball.position.z) < waterY) ball.position.y = waterY + 0.04 + Math.sin(t * 3) * 0.01;
      for (const d of [dog, ...buddies.map((b) => b.dog)]) {
        if (ballState === 'atFeet' && d !== dog) continue;
        if (d.group.position.distanceTo(ball.position) < 0.9) { carrier = d; ballState = 'carried'; if (d === dog) toast('Got it! Press F to throw again'); break; }
      }
    }
    if (ballState === 'carried' && carrier) ball.position.copy(carrier.mouthWorld(mouth));

    // treats
    treats.forEach((b) => {
      if (!b.visible) return;
      b.rotation.y += dt * 1.5; b.position.y = b.userData.y + Math.sin(t * 2 + b.position.x) * 0.05;
      if (b.position.distanceTo(p) < 1.0) { b.visible = false; got++; toast(got === TREATS ? 'All treats found! 🏆 Press L for the next level' : `Treat! ${got}/${TREATS}`); }
    });

    // ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]; r.t += dt; const s = 0.3 + r.t * 2 * r.k;
      r.m.scale.set(s, 1, s); r.m.material.opacity = Math.max(0, 0.45 * r.k * (1 - r.t / 2));
      if (r.t > 2) { scene.remove(r.m); r.m.material.dispose(); ripples.splice(i, 1); }
    }

    if (stationTick) stationTick(dt, t, Math.min(1, Math.max(0, Math.abs(speed) - 3.4) / 3.6));
    if (!st) {
      // chase camera, low like the paintings
      const base = Math.max(p.y, waterY ?? -1e9);
      camPos.set(p.x - Math.sin(heading) * 4.6, base + 1.5, p.z - Math.cos(heading) * 4.6);
      if (groundH(camPos.x, camPos.z) + 0.6 > camPos.y) camPos.y = groundH(camPos.x, camPos.z) + 0.6;
      camLook.set(p.x + Math.sin(heading) * 8, base + 0.3, p.z + Math.cos(heading) * 8);
      camera.position.lerp(camPos, 1 - Math.exp(-dt * 4));
      camera.lookAt(camLook);
      sun.position.copy(p).add(tmp.set(-16, 34, 12)); sun.target.position.copy(p);
    }
    for (const d of [dog, ...buddies.map((b) => b.dog)]) { const dist = d.group.position.distanceTo(camera.position); d.setFurDetail(dist < 10 ? 24 : dist < 25 ? 12 : 6); }
    R.render(dt);

    toastT -= dt;
    toastEl.textContent = `🦴 ${got}/${TREATS}  ·  🎾 ${fetchScore}` + (toastT > 0 ? `\n${toastMsg}` : '');
    toastEl.style.whiteSpace = 'pre';
    if (hud.style.display === 'block') hud.textContent = `${(1 / dt).toFixed(0)} fps · ${dog.mode} · wet ${dog.wet.toFixed(2)} · gait ${OLD_GAIT ? 'old' : gaitFrameMs().toFixed(2) + 'ms'}`;
    requestAnimationFrame(tick);
  }
  tick();
  window.__game = { scene, camera, R, get dog() { return dog; }, buddies, keys, throwBall, setHeading: (h) => (heading = h) };
}
