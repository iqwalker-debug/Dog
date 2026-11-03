// Level 5 — Shaded oak trail pack walk (paintings 11 & 14).
// You are the walker: 4 dogs on verlet-rope leashes trot ahead, sniff, pull, and sit when you stop.
import * as THREE from 'three';
import { createPainterlyRenderer } from '../painterly.js';
import { createDog } from '../dog.js';

const canvas = document.getElementById('game');
const hud = document.getElementById('hud');
const help = document.getElementById('help');
help.textContent = 'W/S walk · A/D drift · Shift brisk · V camera · Space call dogs · 1 swimming hole';
const R = createPainterlyRenderer(canvas);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#d8e6c8', 25, 95);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 300);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// seeded random so the trail is the same every visit
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a) => a[(rnd() * a.length) | 0];

// ---------- light: high sun, shadows follow the walker so the canopy dapples the path ----------
scene.add(new THREE.HemisphereLight('#cfe8ff', '#7a7a45', 1.0));
const sun = new THREE.DirectionalLight('#fff1d0', 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);

// ---------- sky ----------
scene.add(new THREE.Mesh(new THREE.SphereGeometry(250, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'varying vec3 vP; void main(){ float h = clamp(vP.y,0.,1.); gl_FragColor = vec4(mix(vec3(0.78,0.89,0.96), vec3(0.2,0.5,0.86), pow(h,0.5)),1.); }',
})));

// ---------- path + terrain ----------
const pathPts = [];
for (let z = 14; z >= -150; z -= 6) pathPts.push(new THREE.Vector3(6 * Math.sin(z * 0.04) + 3 * Math.sin(z * 0.11), 0, z));
const path = new THREE.CatmullRomCurve3(pathPts);
const PATH_LEN = path.getLength();
const samples = path.getSpacedPoints(500);
function pathDist(x, z) {
  let best = 1e9;
  for (const p of samples) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < best) best = d; }
  return Math.sqrt(best);
}
const baseH = (x, z) => -z * 0.035 + 0.5 * Math.sin(x * 0.07) * Math.cos(z * 0.05) + 0.2 * Math.sin(x * 0.21 + z * 0.17);
const groundH = (x, z, d = pathDist(x, z)) => baseH(x, z) + THREE.MathUtils.smoothstep(d, 2.5, 14) * 1.8 + Math.sin(x * 1.3 + z * 0.9) * 0.04;

const ground = new THREE.PlaneGeometry(90, 180, 180, 360).rotateX(-Math.PI / 2).translate(0, 0, -68);
{
  const P = ground.attributes.position, col = [];
  const dirt = new THREE.Color('#c9a77c'), dirtLight = new THREE.Color('#e6cfa4'), litter = new THREE.Color('#b07d45'),
    moss = new THREE.Color('#6f8a3a'), under = new THREE.Color('#4d6b2c');
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), d = pathDist(x, z);
    P.setY(i, groundH(x, z, d));
    const n = Math.sin(x * 3.1) * Math.cos(z * 2.7) * 0.5 + 0.5;
    const c = dirt.clone().lerp(dirtLight, n * 0.6)
      .lerp(litter, THREE.MathUtils.smoothstep(d, 1.0, 2.2) * 0.8)
      .lerp(moss.clone().lerp(under, n), THREE.MathUtils.smoothstep(d, 2.0, 4.5));
    col.push(c.r, c.g, c.b);
  }
  ground.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  ground.computeVertexNormals();
}
const groundMesh = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// helper: place along path at arc length s with lateral offset
const tmpT = new THREE.Vector3();
function onPath(s, lateral = 0, out = new THREE.Vector3()) {
  const u = THREE.MathUtils.clamp(s / PATH_LEN, 0, 1);
  path.getPointAt(u, out); path.getTangentAt(u, tmpT);
  out.x += -tmpT.z * lateral; out.z += tmpT.x * lateral;
  out.y = groundH(out.x, out.z);
  return out;
}

// ---------- oaks arching over the trail ----------
const leafCols = ['#b9d04a', '#94b83b', '#6e9a34', '#d8dc5c', '#5a8a30', '#c7d84f'].map((c) => new THREE.Color(c));
const blobGeo = new THREE.IcosahedronGeometry(1, 1);
const leafMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
const MAX_BLOBS = 4200;
const leaves = new THREE.InstancedMesh(blobGeo, leafMat, MAX_BLOBS);
const barkMat = new THREE.MeshStandardMaterial({ color: '#6d5a44', roughness: 1 });
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S3 = new THREE.Vector3(), P3 = new THREE.Vector3(), E = new THREE.Euler();
let nb = 0;
function blob(x, y, z, s, c) {
  if (nb >= MAX_BLOBS) return;
  M.compose(P3.set(x, y, z), Q.setFromEuler(E.set(rnd() * 3, rnd() * 3, rnd() * 3)), S3.set(s * (1 + rnd() * 0.4), s * (0.6 + rnd() * 0.3), s * (1 + rnd() * 0.4)));
  leaves.setMatrixAt(nb, M); leaves.setColorAt(nb, c); nb++;
}
for (let s = -10; s < PATH_LEN + 10; s += 3.2 + rnd() * 2.5) {
  for (const side of [-1, 1]) {
    if (rnd() < 0.25) continue;
    const off = side * (3 + rnd() * 6);
    const base = onPath(s, off);
    const h = 6 + rnd() * 4, lean = -side * (1.5 + rnd() * 2.5); // lean toward the path
    const top = onPath(s + (rnd() - 0.5) * 3, off + lean); top.y = base.y + h;
    const mid = base.clone().lerp(top, 0.5); mid.x += (rnd() - 0.5) * 1.2; mid.z += (rnd() - 0.5) * 1.2;
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([base.clone().setY(base.y - 0.3), mid, top]), 10, 0.14 + rnd() * 0.12, 6), barkMat);
    trunk.castShadow = true; scene.add(trunk);
    // canopy: many small blobs, sunlit tops lighter
    for (let k = 0; k < 30; k++) { // clumps with gaps so sun dapples through
      const a = rnd() * Math.PI * 2, r = 1 + Math.sqrt(rnd()) * 3.4;
      const y = top.y + (rnd() - 0.3) * 1.8;
      const c = leafCols[(rnd() * leafCols.length) | 0].clone().multiplyScalar(0.8 + (y - top.y) * 0.15 + rnd() * 0.15);
      blob(top.x + Math.cos(a) * r, y, top.z + Math.sin(a) * r, 0.5 + rnd() * 0.6, c);
    }
    // understory shrubs
    for (let k = 0; k < 4; k++) {
      const p = onPath(s + (rnd() - 0.5) * 4, side * (2.4 + rnd() * 3));
      blob(p.x, p.y + 0.3 + rnd() * 0.6, p.z, 0.4 + rnd() * 0.5, pick(leafCols).clone().multiplyScalar(0.75));
    }
  }
}
leaves.count = nb;
leaves.castShadow = true; leaves.receiveShadow = true;
scene.add(leaves);

// ---------- limestone rocks, leaf litter, wildflowers ----------
function scatter(geo, mat, n, place, shadow = false) {
  const im = new THREE.InstancedMesh(geo, mat, n);
  for (let i = 0; i < n; i++) { const { p, s, c, rot } = place(i); M.compose(p, Q.setFromEuler(rot || E.set(0, rnd() * 6, 0)), s); im.setMatrixAt(i, M); if (c) im.setColorAt(i, c); }
  im.castShadow = shadow; im.receiveShadow = true; scene.add(im); return im;
}
const rockCols = ['#cfc8b6', '#b9b3a3', '#d9d2bf', '#a9a596'].map((c) => new THREE.Color(c));
scatter(new THREE.DodecahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.95 }), 160, () => {
  const p = onPath(rnd() * PATH_LEN, (rnd() < 0.5 ? -1 : 1) * (1.2 + rnd() * 3.5) * (rnd() < 0.15 ? 0.4 : 1));
  const r = 0.12 + rnd() * rnd() * 0.7;
  return { p: p.setY(p.y + r * 0.2), s: S3.set(r * 1.4, r * 0.7, r), c: pick(rockCols) };
}, true);
const litterCols = ['#c4772f', '#9b5b2a', '#d8a33c', '#7d5530', '#e0b850'].map((c) => new THREE.Color(c));
scatter(new THREE.PlaneGeometry(0.07, 0.045).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 1 }), 2500, () => {
  const p = onPath(rnd() * PATH_LEN, (rnd() - 0.5) * 5.5);
  return { p: p.setY(p.y + 0.02), s: S3.set(1, 1, 1).multiplyScalar(0.7 + rnd()), c: pick(litterCols), rot: E.set((rnd() - 0.5) * 0.4, rnd() * 6, (rnd() - 0.5) * 0.4) };
});
const flowerSpots = [];
for (let i = 0; i < 520; i++) {
  const p = onPath(rnd() * PATH_LEN, (rnd() < 0.5 ? -1 : 1) * (1.6 + rnd() * 2.5));
  flowerSpots.push({ p: p.setY(p.y + 0.2 + rnd() * 0.25), yellow: rnd() < 0.7 });
}
scatter(new THREE.CylinderGeometry(0.006, 0.008, 1, 4).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ color: '#5f7d2e' }), flowerSpots.length,
  (i) => ({ p: flowerSpots[i].p.clone(), s: S3.set(1, flowerSpots[i].p.y - groundH(flowerSpots[i].p.x, flowerSpots[i].p.z), 1) }));
scatter(new THREE.CircleGeometry(0.055, 10).rotateX(-Math.PI / 2.6), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, emissive: '#3a2a00', roughness: 0.7 }), flowerSpots.length,
  (i) => ({ p: flowerSpots[i].p.clone(), s: S3.set(1, 1, 1).multiplyScalar(flowerSpots[i].yellow ? 1 : 0.6), c: new THREE.Color(flowerSpots[i].yellow ? '#f2c218' : '#f4f1e6') }));
scatter(new THREE.SphereGeometry(0.02, 6, 4), new THREE.MeshStandardMaterial({ color: '#3a2412' }), flowerSpots.length,
  (i) => ({ p: flowerSpots[i].p.clone().setY(flowerSpots[i].p.y + 0.01), s: S3.set(1, 1, 1).multiplyScalar(flowerSpots[i].yellow ? 1 : 0.5) }));

// ---------- people ----------
function makePerson({ shirt = '#f2f0ea', bottoms = '#d9caa6', skin = '#d7a27c', hair = '#3b2a1e', long = false } = {}) {
  const g = new THREE.Group(), mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
  const add = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  add(new THREE.CapsuleGeometry(0.17, 0.45, 4, 10), mat(shirt), 0, 1.25, 0).scale.set(1.05, 1, 0.7);
  add(new THREE.SphereGeometry(0.12, 14, 10), mat(skin), 0, 1.72, 0);
  add(new THREE.SphereGeometry(0.125, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(hair), 0, 1.74, -0.01);
  if (long) add(new THREE.SphereGeometry(0.06, 8, 6), mat(hair), 0, 1.84, -0.08); // bun
  const limbs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.1, 0.95, 0); g.add(hip);
    add(new THREE.CapsuleGeometry(0.07, 0.75, 4, 8), mat(long ? bottoms : skin), 0, -0.45, 0, hip);
    if (!long) add(new THREE.CapsuleGeometry(0.085, 0.25, 4, 8), mat(bottoms), 0, -0.12, 0, hip);
    add(new THREE.BoxGeometry(0.1, 0.06, 0.24), mat('#e8e6e0'), 0, -0.9, 0.04, hip);
    const sh = new THREE.Group(); sh.position.set(s * 0.24, 1.48, 0); g.add(sh);
    add(new THREE.CapsuleGeometry(0.05, 0.55, 4, 8), mat(skin), 0, -0.32, 0, sh);
    limbs.push({ hip, sh, s });
  }
  let ph = 0;
  return {
    group: g,
    hand: (side, out = new THREE.Vector3()) => limbs[side > 0 ? 1 : 0].sh.localToWorld(out.set(0, -0.62, 0.05)),
    update(dt, speed, holdLeashes = false) {
      ph += dt * speed * 4.2;
      const a = Math.min(1, speed) * 0.45;
      limbs.forEach((l) => {
        l.hip.rotation.x = Math.sin(ph + (l.s > 0 ? Math.PI : 0)) * a;
        l.sh.rotation.x = holdLeashes ? -0.55 : Math.sin(ph + (l.s > 0 ? 0 : Math.PI)) * a * 0.8;
      });
      g.children[0].position.y = 1.25 + Math.abs(Math.sin(ph)) * 0.03;
    },
  };
}
const walker = makePerson({ shirt: '#f4f2ec', bottoms: '#d6c7a3', hair: '#4a3324' });
scene.add(walker.group);
const npcs = [
  { p: makePerson({ shirt: '#9fb58a', bottoms: '#3f5f8f', hair: '#1c1714', long: true }), s: 16, lat: 0.2, v: 1.05 },
  { p: makePerson({ shirt: '#3f5e86', bottoms: '#2d3346', hair: '#c9a46a' }), s: 34, lat: 0.5, v: 1.15 },
  { p: makePerson({ shirt: '#f0eee6', bottoms: '#33415a', hair: '#e6d4ae', long: true }), s: 36, lat: -0.3, v: 1.15 },
];
npcs.forEach((n) => scene.add(n.p.group));

// ---------- the pack (painting 14 order) ----------
const pack = [
  { breed: 'creamGolden', leash: '#d8364a', slot: -0.8, ahead: 2.4 },
  { breed: 'bernedoodle', leash: '#7fd6b8', slot: -0.28, ahead: 3.6 },
  { breed: 'husky', leash: '#e8822e', slot: 0.28, ahead: 3.9 },
  { breed: 'redGolden', leash: '#1d1d20', slot: 0.8, ahead: 2.5 },
].map((d, i) => {
  const dog = createDog(d.breed);
  const start = onPath(6 + d.ahead, d.slot);
  dog.group.position.copy(start);
  scene.add(dog.group, dog.drops);
  // verlet leash
  const N = 16, pts = [], prev = [];
  for (let k = 0; k < N; k++) { pts.push(start.clone()); prev.push(start.clone()); }
  const leashMat = new THREE.MeshStandardMaterial({ color: d.leash, roughness: 0.6 });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), leashMat); mesh.castShadow = true; scene.add(mesh);
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.09, 4, 8), leashMat); scene.add(handle);
  return { ...d, dog, pts, prev, mesh, handle, heading: Math.PI, vel: new THREE.Vector3(), sniffT: 3 + rnd() * 8 + i * 2, sniffing: 0, wander: rnd() * 10 };
});

const LEASH_LEN = 3.6, LINKS = 15;
function stepLeash(L, hand, collar, dt) {
  const { pts, prev } = L, g = -9.8 * dt * dt, seg = LEASH_LEN / LINKS;
  for (let k = 1; k < pts.length - 1; k++) {
    const p = pts[k], v = p.clone().sub(prev[k]).multiplyScalar(0.96);
    prev[k].copy(p); p.add(v); p.y += g;
    const floor = groundH(p.x, p.z, 0.5) + 0.01; if (p.y < floor) p.y = floor;
  }
  pts[0].copy(hand); pts[pts.length - 1].copy(collar);
  for (let it = 0; it < 18; it++) {
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1], d = b.clone().sub(a), len = d.length() || 1e-6;
      const diff = (len - seg) / len;
      if (len < seg) continue; // rope: only resists stretching
      const wA = k === 0 ? 0 : 0.5, wB = k + 1 === pts.length - 1 ? 0 : 0.5;
      a.addScaledVector(d, diff * wA); b.addScaledVector(d, -diff * wB);
    }
  }
  L.mesh.geometry.dispose();
  L.mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.011, 5);
}

// ---------- input ----------
const keys = {};
let thirdPerson = false;
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyV') thirdPerson = !thirdPerson;
  if (e.code === 'F3') { e.preventDefault(); hud.style.display = hud.style.display === 'block' ? 'none' : 'block'; }
  if (e.code === 'Space') pack.forEach((d) => { d.sniffing = 0; d.dog.sniff(false); });
  if (e.code === 'Digit1') location.search = '';
});
addEventListener('keyup', (e) => (keys[e.code] = false));
let drag = null;
canvas.addEventListener('pointerdown', (e) => (drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 }));
addEventListener('pointermove', (e) => { if (drag) { drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y; } });
addEventListener('pointerup', () => (drag = null));

// ---------- loop ----------
R.setup(scene, camera);
const clock = new THREE.Clock();
let s = 6, lateral = 0, speed = 0, t = 0;
const wp = new THREE.Vector3(), tan = new THREE.Vector3(), hand = new THREE.Vector3(), collar = new THREE.Vector3(), tgt = new THREE.Vector3(), look = new THREE.Vector3();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05); t += dt;

  // walker
  let fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  let side = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  if (drag) { fwd = THREE.MathUtils.clamp(-drag.dy / 100 + 0.5, -1, 1); side = THREE.MathUtils.clamp(drag.dx / 100, -1, 1); }
  const top = keys.ShiftLeft || keys.ShiftRight ? 2.4 : 1.4;
  speed = THREE.MathUtils.lerp(speed, fwd * top, 1 - Math.exp(-dt * 3));
  // dogs that are sniffing hold you back a little
  const holding = pack.filter((d) => d.sniffing > 0).length;
  s = THREE.MathUtils.clamp(s + speed * dt * (1 - holding * 0.12), 0, PATH_LEN - 12);
  lateral = THREE.MathUtils.clamp(lateral + side * dt * 1.2, -1.1, 1.1);
  onPath(s, lateral, wp);
  path.getTangentAt(s / PATH_LEN, tan);
  const yaw = Math.atan2(tan.x, tan.z);
  walker.group.position.copy(wp); walker.group.rotation.y = yaw;
  walker.update(dt, Math.abs(speed), true);

  // NPC walkers ahead, looping
  npcs.forEach((n) => {
    n.s += n.v * dt; if (n.s > s + 60) n.s = s + 14 + rnd() * 6;
    if (n.s < s + 8) n.s = s + 8;
    onPath(n.s, n.lat, n.p.group.position);
    path.getTangentAt(n.s / PATH_LEN, tmpT); n.p.group.rotation.y = Math.atan2(tmpT.x, tmpT.z);
    n.p.update(dt, n.v);
  });

  // camera: POV holding leashes, or 3rd-person behind
  if (thirdPerson) {
    camera.position.lerp(tgt.copy(wp).addScaledVector(tan, -4.2).setY(wp.y + 2.6), 1 - Math.exp(-dt * 4));
    look.copy(wp).addScaledVector(tan, 3).setY(wp.y + 0.6);
  } else {
    camera.position.copy(wp).addScaledVector(tan, -0.05).setY(wp.y + 1.62);
    look.copy(wp).addScaledVector(tan, 7).setY(groundH(wp.x + tan.x * 7, wp.z + tan.z * 7) + 0.25);
  }
  camera.lookAt(look);
  walker.group.visible = thirdPerson;

  // dogs
  pack.forEach((d, i) => {
    const dog = d.dog, p = dog.group.position;
    // hand: in POV the leashes gather just below the camera; in 3rd person, the walker's hands
    if (thirdPerson) walker.hand(i < 2 ? -1 : 1, hand);
    else hand.copy(camera.position).addScaledVector(tan, 0.42).add(tmpT.set(-tan.z, 0, tan.x).multiplyScalar((i - 1.5) * 0.04)).setY(camera.position.y - 0.55);
    d.handle.position.copy(hand); d.handle.rotation.set(0.4, yaw, 0);

    // sniff breaks
    d.sniffT -= dt;
    if (d.sniffT < 0 && d.sniffing <= 0) { d.sniffing = 1.5 + rnd() * 2.5; d.sniffT = 6 + rnd() * 10; d.wander = rnd() * 10; }
    if (d.sniffing > 0) d.sniffing -= dt;
    dog.sniff(d.sniffing > 0);

    // target slot ahead on the path, with a little weave
    const lat = d.slot + Math.sin(t * 0.4 + d.wander) * 0.35 + (d.sniffing > 0 ? Math.sign(d.slot) * 0.6 : 0);
    onPath(s + d.ahead + Math.sin(t * 0.3 + i) * 0.4, lat, tgt);
    const want = tgt.sub(p).setY(0);
    const dist = want.length();
    const maxV = d.sniffing > 0 ? 0 : Math.max(0.2, Math.abs(speed) * 1.15 + dist * 0.8);
    d.vel.lerp(want.normalize().multiplyScalar(Math.min(maxV, dist * 2.2)), 1 - Math.exp(-dt * 3));
    // personal space
    pack.forEach((o) => { if (o !== d) { const away = p.clone().sub(o.dog.group.position).setY(0); const l = away.length(); if (l < 0.7) d.vel.addScaledVector(away.normalize(), (0.7 - l) * 3 * dt * 20); } });
    p.x += d.vel.x * dt; p.z += d.vel.z * dt;
    // leash keeps them within reach
    const fromHand = p.clone().sub(hand).setY(0), reach = LEASH_LEN * 0.9;
    if (fromHand.length() > reach) p.copy(hand).add(fromHand.setLength(reach)).setY(p.y);

    const v = Math.hypot(d.vel.x, d.vel.z);
    if (v > 0.15) d.heading = Math.atan2(d.vel.x, d.vel.z);
    else if (d.sniffing <= 0) d.heading = THREE.MathUtils.lerp(d.heading, yaw, dt);
    dog.group.rotation.y = d.heading;
    dog.update(dt, v, false, groundH(p.x, p.z, 0.5));
    dog.setFurDetail(camera.position.distanceTo(p) < 6 ? 24 : 12);

    stepLeash(d, hand, dog.collarWorld(collar), dt);
  });

  // shadows follow the walker
  sun.position.copy(wp).add(tgt.set(-8, 34, 6));
  sun.target.position.copy(wp);

  R.render(dt);
  if (hud.style.display === 'block') hud.textContent = `${(1 / dt).toFixed(0)} fps · ${s.toFixed(0)}/${PATH_LEN.toFixed(0)} m`;
  requestAnimationFrame(tick);
}
tick();
window.__game = { scene, camera, R, pack, walker, setThirdPerson: (v) => (thirdPerson = v), walk: (v) => (keys.KeyW = v) };
