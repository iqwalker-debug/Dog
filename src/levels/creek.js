// Level 7 — Hill-country creek (painting 15): oak canopy, prickly pear, black-eyed susans,
// limestone stepping slabs, a dirt path along the bank, and a swimmable pool.
import { runLevel, THREE, seeded, makeRiverbedMaterial, addDetail, TEX } from '../world.js';

const rnd = seeded(71);
const cx = (z) => 7 * Math.sin(z * 0.045) + 2 * Math.sin(z * 0.13);   // creek centerline
const pathX = (z) => cx(z) - 11 + Math.sin(z * 0.08) * 1.5;

// limestone stepping slabs (flat tops, part of the ground)
const slabs = [];
for (let z = -50; z < 40; z += 2.2 + rnd() * 3) {
  const n = 1 + ((rnd() * 3) | 0);
  for (let k = 0; k < n; k++) slabs.push({ x: cx(z) + (rnd() - 0.5) * 9, z: z + (rnd() - 0.5) * 1.5, w: 0.8 + rnd() * 1.6, d: 0.6 + rnd() * 1.0, top: 0.08 + rnd() * 0.25, rot: rnd() * 3 });
}
// bank ledges
for (let z = -50; z < 40; z += 3 + rnd() * 4) for (const s of [-1, 1]) slabs.push({ x: cx(z) + s * (5.2 + rnd()), z, w: 1.6 + rnd() * 2, d: 1 + rnd(), top: 0.35 + rnd() * 0.4, rot: rnd() * 0.5 });

function base(x, z) {
  const d = Math.abs(x - cx(z));
  const pool = Math.exp(-((z + 6) ** 2) / 40) * 0.7;                 // deep swimming pool
  const bed = -0.55 - pool + Math.sin(x * 1.1 + z * 0.7) * 0.05;
  let h = THREE.MathUtils.lerp(bed, 0.55, THREE.MathUtils.smoothstep(d, 3.5, 6.5));
  h += THREE.MathUtils.smoothstep(d, 8, 30) * 2.5 + 0.2 * Math.sin(x * 0.2) * Math.cos(z * 0.15);
  return h;
}
function groundH(x, z) {
  let h = base(x, z);
  for (const s of slabs) {
    const c = Math.cos(s.rot), sn = Math.sin(s.rot), lx = (x - s.x) * c - (z - s.z) * sn, lz = (x - s.x) * sn + (z - s.z) * c;
    if (Math.abs(lx) < s.w / 2 && Math.abs(lz) < s.d / 2) h = Math.max(h, s.top);
  }
  return h;
}

runLevel({
  id: 'creek', name: 'Hill-Country Creek', seed: 72,
  fog: ['#dbe8e4', 40, 150],
  groundH, waterY: 0,
  bounds: { x0: -40, x1: 40, z0: -48, z1: 38 },
  start: { x: pathX(28) + 3, z: 28, heading: Math.PI * 0.82 },
  player: 'golden', buddies: ['doodle', 'frenchie'],
  treatSpot: (r) => { const z = -45 + r() * 80; return { x: cx(z) + (r() - 0.5) * 22, z }; },
  build({ scene, terrain, scatter, forest, rnd: R }) {
    const bedGold = new THREE.Color('#b9a056'), bedDeep = new THREE.Color('#6f8a55'), grass = new THREE.Color('#8fae42'),
      grassDry = new THREE.Color('#c5bf62'), dirt = new THREE.Color('#d9bf8c'), lime = new THREE.Color('#e7dcc0');
    const bedMesh = terrain({
      w: 100, d: 110, cz: -5, seg: 2, height: groundH, material: makeRiverbedMaterial(new THREE.Color('#ffffff')), detail: TEX.forest,
      color: (x, z, y) => {
        const n = Math.sin(x * 2.1) * Math.cos(z * 1.7) * 0.5 + 0.5;
        if (y < 0.05) return bedGold.clone().lerp(bedDeep, THREE.MathUtils.clamp(-y - 0.4, 0, 1) * 0.8).multiplyScalar(0.9 + n * 0.2);
        const c = grass.clone().lerp(grassDry, n * 0.6);
        if (Math.abs(x - pathX(z)) < 1.1) c.lerp(dirt, 0.85);
        if (y < 0.4) c.lerp(lime, 0.5);
        return c;
      },
    });

    // slabs
    scatter(new THREE.BoxGeometry(1, 1, 1, 2, 1, 2), addDetail(new THREE.MeshStandardMaterial({ roughness: 1 }), TEX.boulder, { scale: 0.5 }), slabs.length, (i) => {
      const s = slabs[i];
      return { p: new THREE.Vector3(s.x, s.top - 0.4, s.z), s: new THREE.Vector3(s.w, 0.8, s.d), rot: new THREE.Euler(0, s.rot, 0), c: new THREE.Color(['#eadfc3', '#d8cba8', '#f1e7cf'][(R() * 3) | 0]) };
    }, { cast: true });

    // the big framing oak + groves on both banks, distant hills
    forest.tree(new THREE.Vector3(pathX(10) - 5, groundH(pathX(10) - 5, 10), 10), 8, new THREE.Vector3(6, 0, -2), 5, 0.2);
    for (let i = 0; i < 34; i++) {
      const z = -55 + R() * 100, side = R() < 0.5 ? -1 : 1, x = cx(z) + side * (9 + R() * 18);
      forest.tree(new THREE.Vector3(x, groundH(x, z), z), 5 + R() * 4, new THREE.Vector3(-side * (1 + R() * 2), 0, 0), 3 + R(), 0.25);
    }
    for (let i = 0; i < 30; i++) { const z = -48 + R() * 86, s = R() < 0.5 ? -1 : 1, x = cx(z) + s * (7 + R() * 14); forest.bush(new THREE.Vector3(x, groundH(x, z), z), 0.9 + R()); }
    for (let i = 0; i < 260; i++) {
      const a = -0.6 + R() * 1.2, r = 70 + R() * 30, x = Math.sin(a) * r, z = -Math.cos(a) * r - 20;
      forest.blob(x, 3 + R() * 9 + Math.cos(a * 4) * 3, z, 3 + R() * 3, new THREE.Color(['#6f9a62', '#86a95c', '#5d8a5c', '#a3b85a'][(R() * 4) | 0]));
    }

    // prickly pear clumps, grass tufts, black-eyed susans, white wild carrot
    const bank = (minD, maxD) => { const z = -48 + R() * 86, s = R() < 0.6 ? -1 : 1, x = cx(z) + s * (minD + R() * (maxD - minD)); return new THREE.Vector3(x, groundH(x, z), z); };
    const pads = [];
    for (let c = 0; c < 26; c++) { const b = bank(6.5, 16); for (let k = 0; k < 7; k++) pads.push(b.clone().add(new THREE.Vector3((R() - 0.5) * 0.7, 0.15 + R() * 0.6, (R() - 0.5) * 0.7))); }
    scatter(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#6f9a55', roughness: 0.8 }), pads.length,
      (i) => ({ p: pads[i], s: new THREE.Vector3(0.18, 0.22, 0.05), rot: new THREE.Euler(R() - 0.5, R() * 6, R() - 0.5), c: new THREE.Color(R() < 0.5 ? '#78a35b' : '#8ab565') }), { cast: true });
    scatter(new THREE.ConeGeometry(0.035, 0.45, 4).translate(0, 0.22, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), 3000,
      () => ({ p: bank(5.5, 22), s: new THREE.Vector3(1, 0.6 + R() * 1.2, 1), rot: new THREE.Euler((R() - 0.5) * 0.5, R() * 6, (R() - 0.5) * 0.5), c: new THREE.Color(['#8fb045', '#a6bd4f', '#c9c46a', '#71953b'][(R() * 4) | 0]) }));
    const flowers = []; for (let i = 0; i < 700; i++) { const p = bank(5.5, 18); flowers.push({ p: p.setY(p.y + 0.3 + R() * 0.4), y: R() < 0.65 }); }
    scatter(new THREE.CircleGeometry(0.06, 10).rotateX(-Math.PI / 2.6), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, emissive: '#3a2a00', roughness: 0.7 }), flowers.length,
      (i) => ({ p: flowers[i].p, s: flowers[i].y ? 1 : 0.7, c: new THREE.Color(flowers[i].y ? '#f2b818' : '#f6f3e8') }));
    scatter(new THREE.SphereGeometry(0.022, 6, 4), new THREE.MeshStandardMaterial({ color: '#3a2412' }), flowers.length,
      (i) => ({ p: flowers[i].p.clone().setY(flowers[i].p.y + 0.012), s: flowers[i].y ? 1 : 0.4 }));
    scatter(new THREE.CylinderGeometry(0.006, 0.008, 1, 4).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ color: '#5f7d2e' }), flowers.length,
      (i) => ({ p: flowers[i].p, s: new THREE.Vector3(1, flowers[i].p.y - groundH(flowers[i].p.x, flowers[i].p.z), 1) }));

    // riffle foam where water spills over slabs
    const foam = scatter(new THREE.CircleGeometry(0.35, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }), 60, () => {
      const s = slabs[(R() * slabs.length) | 0]; return { p: new THREE.Vector3(s.x + (R() - 0.5), 0.03, s.z + 0.6), s: new THREE.Vector3(1 + R(), 1, 0.5) };
    });
    foam.renderOrder = 3;

    return [(t) => { bedMesh.material.userData.uniforms.uTime.value = t; foam.material.opacity = 0.28 + Math.sin(t * 5) * 0.08; }];
  },
});
