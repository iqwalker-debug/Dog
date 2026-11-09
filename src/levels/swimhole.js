// Level 1 prototype: spring-fed swimming hole, painted look, one swimmable husky.
import * as THREE from 'three';
import { createPainterlyRenderer, makeRiverbedMaterial } from '../painterly.js';
import { createDog } from '../dog.js';
import { BREED_ORDER } from '../breeds.js';
import { placeTree, updateTrees } from '../trees.js';
import { addDetail, TEX } from '../textures.js';

const canvas = document.getElementById('game');
const hud = document.getElementById('hud');
const R = createPainterlyRenderer(canvas);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#bfdcef', 60, 180);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 400);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// ---------- Light ----------
scene.add(new THREE.HemisphereLight('#bfe3ff', '#6b6a3a', 0.6));
const sun = new THREE.DirectionalLight('#fff1d0', 2.3);
sun.position.set(-30, 60, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 200 });
sun.shadow.bias = -0.0005;
scene.add(sun);

// ---------- Sky ----------
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(300, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP; void main(){ float h = clamp(vP.y,0.,1.);
      vec3 c = mix(vec3(0.72,0.86,0.96), vec3(0.16,0.45,0.85), pow(h,0.45)); gl_FragColor = vec4(c,1.); }`,
  })
);
scene.add(sky);

function softTexture(draw, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const cloudTex = softTexture((g, s) => {
  for (let i = 0; i < 14; i++) {
    const x = s * (0.2 + Math.random() * 0.6), y = s * (0.45 + Math.random() * 0.15), r = s * (0.08 + Math.random() * 0.12);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
});
for (let i = 0; i < 14; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, fog: false, depthWrite: false, transparent: true }));
  const a = Math.random() * Math.PI * 2;
  s.position.set(Math.cos(a) * 200, 50 + Math.random() * 60, Math.sin(a) * 200);
  s.scale.set(70 + Math.random() * 50, 35, 1);
  scene.add(s);
}

// ---------- Terrain: riverbed + banks ----------
const POOL = { x0: -45, x1: 40, z0: -26, z1: 30 };
function groundHeight(x, z) {
  // pool basin, rising bank on the right (+x) and a rocky beach front-left
  let h = -1.4 + Math.sin(x * 0.35) * 0.15 + Math.cos(z * 0.4 + x * 0.1) * 0.15;
  const bankR = THREE.MathUtils.smoothstep(x, 22, 40) * 6;
  const bankBack = THREE.MathUtils.smoothstep(-z, 22, 26) * 0.0;
  return h + bankR + bankBack;
}
const bedGeo = new THREE.PlaneGeometry(140, 120, 180, 160).rotateX(-Math.PI / 2);
{
  const p = bedGeo.attributes.position, col = [];
  const lime = new THREE.Color('#b8a456'), moss = new THREE.Color('#6f8a3a'), sand = new THREE.Color('#e3cf9a');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = groundHeight(x, z);
    p.setY(i, y);
    const c = lime.clone().lerp(moss, Math.max(0, Math.sin(x * 0.7) * Math.cos(z * 0.5)) * 0.5)
      .lerp(sand, THREE.MathUtils.clamp((y + 0.2) / 2, 0, 1));
    col.push(c.r, c.g, c.b);
  }
  bedGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  bedGeo.computeVertexNormals();
}
const bedMat = addDetail(makeRiverbedMaterial(new THREE.Color('#ffffff')), TEX.pebbles, { scale: 0.35, strength: 0.7 });
bedMat.vertexColors = true;
const bed = new THREE.Mesh(bedGeo, bedMat);
bed.receiveShadow = true;
scene.add(bed);

// submerged limestone slabs
const rockMat = addDetail(makeRiverbedMaterial(new THREE.Color('#c2ad62')), TEX.boulder, { scale: 0.5 });
const rocks = [];
for (let i = 0; i < 26; i++) {
  const g = new THREE.DodecahedronGeometry(1, 1);
  g.scale(2 + Math.random() * 4, 0.5 + Math.random() * 0.6, 1.5 + Math.random() * 3);
  const m = new THREE.Mesh(g, rockMat);
  const x = -35 + Math.random() * 55, z = -20 + Math.random() * 45;
  m.position.set(x, groundHeight(x, z) + 0.1, z);
  m.rotation.y = Math.random() * Math.PI;
  m.castShadow = m.receiveShadow = true;
  scene.add(m); rocks.push(m);
}

// ---------- Water ----------
const waterUniforms = { uTime: { value: 0 } };
const waterMat = new THREE.MeshStandardMaterial({
  color: '#138a80', transparent: true, opacity: 0.5, roughness: 0.08, metalness: 0.0, depthWrite: false,
});
waterMat.onBeforeCompile = (sh) => {
  sh.uniforms.uTime = waterUniforms.uTime;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uTime; varying vec3 vW;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      transformed.y += sin(position.x*0.8+uTime*1.3)*0.04 + cos(position.y*0.9+uTime)*0.04;`)
    .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix*vec4(transformed,1.)).xyz;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform float uTime; varying vec3 vW;')
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec2 q = vW.xz;
      float dx = cos(q.x*1.7+uTime*1.6)*0.5 + cos((q.x+q.y)*2.9-uTime*2.1)*0.3 + cos(q.y*0.6+q.x*4.1+uTime)*0.2;
      float dz = sin(q.y*1.9-uTime*1.4)*0.5 + sin((q.x-q.y)*3.3+uTime*1.8)*0.3 + sin(q.x*0.7+q.y*4.3-uTime)*0.2;
      normal = normalize(normal + (viewMatrix*vec4(dx*0.18,0.,dz*0.18,0.)).xyz);`)
    .replace('#include <opaque_fragment>', `
      vec3 V = normalize(cameraPosition - vW);
      float fres = pow(1.0 - max(dot(V, vec3(0.,1.,0.)), 0.0), 3.0);
      diffuseColor.a = mix(0.38, 0.9, fres);
      outgoingLight = mix(outgoingLight, vec3(0.35,0.62,0.78), fres*0.45);
      #include <opaque_fragment>`);
};
const water = new THREE.Mesh(new THREE.PlaneGeometry(140, 120, 140, 120).rotateX(-Math.PI / 2), waterMat);
water.position.y = 0;
water.renderOrder = 2; water.name = 'water';
scene.add(water);

// ---------- Graffiti retaining wall + dam ----------
const graffitiTex = softTexture((g, s) => {
  g.fillStyle = '#9aa3a6'; g.fillRect(0, 0, s * 4, s);
  const cols = ['#ff5fa2', '#32d3c2', '#ffd23f', '#6c5ce7', '#ff7b39', '#3dbbf5', '#2a2f45', '#b5f25a'];
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = cols[i % cols.length]; g.lineWidth = 6 + Math.random() * 18; g.lineCap = 'round';
    g.beginPath(); let x = Math.random() * s * 4, y = s * (0.25 + Math.random() * 0.5); g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (Math.random() - 0.3) * 60; y += (Math.random() - 0.5) * 50; g.lineTo(x, y); }
    g.stroke();
  }
}, 512);
graffitiTex.wrapS = THREE.RepeatWrapping; graffitiTex.repeat.set(3, 1);
const wallMat = new THREE.MeshStandardMaterial({ map: graffitiTex, roughness: 0.9 });
const wall = new THREE.Mesh(new THREE.BoxGeometry(90, 4, 1.2), wallMat);
wall.position.set(-5, 0.6, -26); wall.receiveShadow = true; scene.add(wall);
const deck = new THREE.Mesh(new THREE.BoxGeometry(90, 0.4, 6), new THREE.MeshStandardMaterial({ color: '#cfc6b0' }));
deck.position.set(-5, 2.7, -29); deck.receiveShadow = true; scene.add(deck);

// railing
const railMat = new THREE.MeshStandardMaterial({ color: '#2b2f33', metalness: 0.4, roughness: 0.5 });
const rail = new THREE.Mesh(new THREE.BoxGeometry(90, 0.12, 0.12), railMat);
rail.position.set(-5, 4.2, -26.3); scene.add(rail);
for (let x = -50; x <= 40; x += 3) {
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), railMat);
  post.position.set(x, 3.45, -26.3); scene.add(post);
}
// light poles
for (const x of [-22, 18]) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 14), railMat);
  pole.position.set(x, 9, -29); scene.add(pole);
}
// pavilion
const pav = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 7), new THREE.MeshStandardMaterial({ color: '#e8e2d2' }));
pav.position.set(10, 7, -36); scene.add(pav);

// dam waterfall at back-left
const fallMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, roughness: 0.2 });
fallMat.onBeforeCompile = (sh) => {
  sh.uniforms.uTime = waterUniforms.uTime;
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform float uTime;')
    .replace('#include <opaque_fragment>', `
      float streak = fract(vUv.y*6.0 + uTime*1.8 + sin(vUv.x*60.0)*0.3);
      diffuseColor.a *= 0.4 + 0.6*smoothstep(0.2,0.9,streak);
      #include <opaque_fragment>`);
};
fallMat.defines = { USE_UV: '' };
const fall = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2, 1, 1), fallMat);
fall.position.set(-42, 0.9, -25.2); fall.rotation.x = -0.25; scene.add(fall);

// ---------- Trees (instanced live oaks) ----------
const trunkGeo = new THREE.CylinderGeometry(0.4, 0.7, 7, 6);
const trunkMat = new THREE.MeshStandardMaterial({ color: '#5a4630', roughness: 1 });
const leafGeo = new THREE.IcosahedronGeometry(3, 1);
const leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, vertexColors: false });
const treeSpots = [];
for (let i = 0; i < 26; i++) {
  const x = 26 + Math.random() * 22, z = -30 + Math.random() * 60;
  if (x < 44 && z > -8 && z < 18) continue; // keep a sunny landing beach clear for the dogs
  treeSpots.push([x, z]);
}
for (let i = 0; i < 18; i++) treeSpots.push([-60 + Math.random() * 100, -34 - Math.random() * 14]);
treeSpots.forEach(([x, z]) => {
  const y = z < -28 ? 2.7 : groundHeight(x, z);
  placeTree(scene, new THREE.Vector3(x, y, z), { height: 9 + Math.random() * 5 });
});
for (let i = 0; i < 12; i++) { const x = 24 + Math.random() * 20, z = -24 + Math.random() * 48; if (!(x < 44 && z > -8 && z < 18)) placeTree(scene, new THREE.Vector3(x, groundHeight(x, z), z), { height: 1 + Math.random(), bush: true }); }

// ---------- Dog ----------
let dog = createDog('golden'); dog.setGround(groundHeight);
dog.group.position.set(-6, 0, 14);
scene.add(dog.group, dog.drops);

// number keys 1-0 swap the player's breed
function swapBreed(key) {
  const old = dog; dog = createDog(key); dog.setGround(groundHeight);
  dog.group.position.copy(old.group.position);
  scene.remove(old.group); old.dispose(); scene.add(dog.group, dog.drops);
  document.getElementById('help').textContent = `${dog.name} · WASD / drag · Shift run · Space splash · E shake · 1-0 breeds`;
}

// a couple of AI swimmers (doodle + lab) for life
const buddies = [
  createDog('doodle'),
  createDog('lab'),
];
buddies.forEach((b, i) => { b.group.position.set(-10 + i * 12, 0, -4 - i * 6); b.phase = i * 2; scene.add(b.group, b.drops); });

// ---------- Ripples ----------
const ripples = [];
const rippleGeo = new THREE.RingGeometry(0.9, 1.0, 48).rotateX(-Math.PI / 2);
function spawnRipple(x, z, strength = 1) {
  const m = new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 * strength, depthWrite: false }));
  m.position.set(x, 0.06, z); m.renderOrder = 3; scene.add(m);
  ripples.push({ m, t: 0, s: strength });
}

// ---------- Input ----------
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'F3') { e.preventDefault(); hud.style.display = hud.style.display === 'block' ? 'none' : 'block'; }
  if (e.code === 'Space' && dog.mode === 'swim') { for (let i = 0; i < 3; i++) spawnRipple(dog.group.position.x, dog.group.position.z, 1.6); dog.splash(); }
  if (e.code === 'KeyE') dog.shake();
  if (e.code === 'KeyC') dog.setPose(dog.pose === 'sit' ? 'lie' : dog.pose === 'lie' ? 'auto' : 'sit');
  if (e.code === 'KeyT') location.search = '?level=trail';
  if (e.code === 'KeyL') location.search = '?level=trail';
  const dn = e.code.match(/^Digit(\d)$/); if (dn) swapBreed(BREED_ORDER[(+dn[1] + 9) % 10]);
});
addEventListener('keyup', (e) => (keys[e.code] = false));
let drag = null;
canvas.addEventListener('pointerdown', (e) => (drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 }));
addEventListener('pointermove', (e) => { if (drag) { drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y; } });
addEventListener('pointerup', () => (drag = null));

// ---------- Showroom (?showroom): every breed lined up on the beach ----------
const SHOWROOM = new URLSearchParams(location.search).has('showroom');
const SOLO = new URLSearchParams(location.search).get('showroom'); // ?showroom=husky for a close-up
const FACE = new URLSearchParams(location.search).has('face');     // add &face for a portrait
const lineup = [];
if (SHOWROOM) {
  (BREED_ORDER.includes(SOLO) ? [SOLO] : BREED_ORDER).forEach((k, i) => {
    const d = createDog(k); d.setGround(groundHeight);
    const x = 30 + (i % 5) * 2.2, z = 6 + Math.floor(i / 5) * 3;
    d.group.position.set(x, groundHeight(x, z) + 0.6, z); d.group.rotation.y = -Math.PI / 2 + 0.5;
    const pz = new URLSearchParams(location.search).get('pose'); if (pz) d.setPose(pz); // &pose=sit|lie
    scene.add(d.group, d.drops); lineup.push(d);
  });
  dog.group.visible = false;
}

// ---------- Loop ----------
R.setup(scene, camera);
const clock = new THREE.Clock();
let heading = Math.PI, speed = 0, rippleTimer = 0, t = 0;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

// walkable area: the pool plus the right-hand bank (dog climbs out where ground rises above the water)
function walkable(x, z) { return x > POOL.x0 && x < 46 && z > -24 && z < POOL.z1; }
const WATERLINE = -0.35; // ground below this = swimming

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05); t += dt;
  waterUniforms.uTime.value = t;
  bedMat.userData.uniforms.uTime.value = t;
  rockMat.userData.uniforms.uTime.value = t;

  // control
  let turn = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
  let thrust = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 0.5 : 0);
  if (drag) { turn = THREE.MathUtils.clamp(-drag.dx / 120, -1, 1); thrust = THREE.MathUtils.clamp(-drag.dy / 120 + 0.6, -0.5, 1); }
  heading += turn * dt * 1.8;
  const onLand = dog.mode === 'land';
  const top = onLand ? (keys.ShiftLeft || keys.ShiftRight ? 7 : 3.2) : 4.5;
  speed = THREE.MathUtils.lerp(speed, thrust * top, dt * (onLand ? 4 : 2));
  const p = dog.group.position;
  const nx = p.x + Math.sin(heading) * speed * dt, nz = p.z + Math.cos(heading) * speed * dt;
  if (walkable(nx, nz)) { p.x = nx; p.z = nz; } else speed *= 0.5;
  dog.group.rotation.y = heading;
  const gy = groundHeight(p.x, p.z);
  const inWater = gy < WATERLINE;
  dog.update(dt, speed, inWater, gy);

  rippleTimer += dt * (0.6 + Math.abs(speed) * 0.5);
  if (inWater && rippleTimer > 0.5) { rippleTimer = 0; spawnRipple(p.x, p.z, 0.6 + Math.abs(speed) * 0.1); }

  buddies.forEach((b, i) => {
    b.phase += dt * 0.25;
    const r = 7 + i * 3;
    b.group.position.set(-8 + i * 10 + Math.cos(b.phase) * r, 0, -2 - i * 5 + Math.sin(b.phase) * r * 0.6);
    b.group.rotation.y = -b.phase + (i ? 0 : Math.PI);
    b.update(dt, 2.5, true);
    if (Math.random() < dt * 1.5) spawnRipple(b.group.position.x, b.group.position.z, 0.6);
  });

  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i]; r.t += dt;
    const s = 0.4 + r.t * 2.2 * r.s; r.m.scale.set(s, 1, s);
    r.m.material.opacity = Math.max(0, 0.45 * r.s * (1 - r.t / 2));
    if (r.t > 2) { scene.remove(r.m); r.m.material.dispose(); ripples.splice(i, 1); }
  }

  // low, dog's-eye chase camera
  const camBase = Math.max(0, p.y);
  camPos.set(p.x - Math.sin(heading) * 5.0, camBase + 1.6, p.z - Math.cos(heading) * 5.0);
  camLook.set(p.x + Math.sin(heading) * 8, camBase + 0.2, p.z + Math.cos(heading) * 8);

  // fur LOD: fewer shells further from camera
  for (const d of [dog, ...buddies]) {
    const dist = d.group.position.distanceTo(camera.position);
    d.setFurDetail(dist < 12 ? 24 : dist < 30 ? 12 : 6);
  }
  camera.position.lerp(camPos, 1 - Math.exp(-dt * 4));
  camera.lookAt(camLook);

  if (SHOWROOM) {
    lineup.forEach((d) => { d.update(dt, 0, false, groundHeight(d.group.position.x, d.group.position.z)); d.setFurDetail(24); });
    if (lineup.length === 1) {
      const g = lineup[0].group, d = g.position, ry = g.rotation.y;
      if (FACE) { // 3/4 portrait of the face, like the close-up paintings
        const hp = new THREE.Vector3(); g.children[0].children.find((c) => c.position.z > 0.6).getWorldPosition(hp);
        camera.position.set(hp.x + Math.sin(ry + 0.55) * 0.95, hp.y + 0.08, hp.z + Math.cos(ry + 0.55) * 0.95);
        camera.lookAt(hp.x, hp.y - 0.02, hp.z);
      } else {
        camera.position.set(d.x - 1.2, d.y + 0.35, d.z + 2.0);
        camera.lookAt(d.x, d.y - 0.05, d.z);
      }
    } else {
      camera.position.set(34.4, groundHeight(34, 13) + 1.6, 13.5);
      camera.lookAt(34.4, groundHeight(34, 7) + 0.3, 6.8);
    }
  }
  updateTrees(t);
  R.render(dt);
  if (hud.style.display === 'block') {
    const px = R.renderer.getPixelRatio();
    hud.textContent = `${(1 / dt).toFixed(0)} fps · internal ${Math.round(innerWidth * px)}×${Math.round(innerHeight * px)} · ${dog.mode} · wet ${dog.wet.toFixed(2)}`;
  }
  requestAnimationFrame(tick);
}
tick();
window.__game = { scene, camera, dog, R };
