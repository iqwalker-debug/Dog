// Level 6 — Dry limestone creek bed under a layered limestone bluff (painting 12). Boulder hopping.
import { runLevel, THREE, seeded, addDetail, TEX } from '../world.js';

const rnd = seeded(61);
// boulders are part of the ground, so dogs climb over them
const boulders = [];
for (let i = 0; i < 90; i++) {
  const big = rnd() < 0.18;
  boulders.push({ x: -40 + rnd() * 80, z: -20 + rnd() * 34, r: big ? 2.2 + rnd() * 2.5 : 0.4 + rnd() * 1.1, h: 0 });
  boulders[i].h = boulders[i].r * (big ? 0.35 : 0.55 + rnd() * 0.25);
}
// the big flat slab the dogs cross in the painting
boulders.push({ x: 0, z: -2, r: 6.5, h: 1.3, slab: true });

const base = (x, z) => 0.25 * Math.sin(x * 0.15) * Math.cos(z * 0.2) + 0.12 * Math.sin(x * 0.6 + z * 0.4)
  + THREE.MathUtils.smoothstep(-z, 22, 29) * 15 + THREE.MathUtils.smoothstep(-z, 29, 40) * 4 // the bluff
  + THREE.MathUtils.smoothstep(z, 14, 26) * 2.5;
function groundH(x, z) {
  let h = base(x, z);
  for (const b of boulders) {
    const d2 = ((x - b.x) ** 2 + (z - b.z) ** 2) / (b.r * b.r);
    if (d2 < 1) h = Math.max(h, base(b.x, b.z) + b.h * (b.slab ? Math.min(1, 1.6 * Math.sqrt(1 - d2)) : Math.sqrt(1 - d2)));
  }
  return h;
}

runLevel({
  id: 'bluff', name: 'Limestone Bluff', seed: 62,
  fog: ['#d9e3d6', 45, 170], groundTint: '#9a9478',
  groundH, waterY: null,
  bounds: { x0: -42, x1: 42, z0: -22, z1: 22 },
  start: { x: -8, z: 8, heading: Math.PI * 0.85 },
  player: 'redGolden', buddies: ['doodle', 'collie', 'husky'],
  treatSpot: (r) => { const b = boulders[(r() * boulders.length) | 0]; return { x: b.x + (r() - 0.5) * b.r, z: b.z + (r() - 0.5) * b.r }; },
  build({ scene, terrain, scatter, forest, rnd }) {
    const lime = new THREE.Color('#cfc8b4'), limeWarm = new THREE.Color('#ddd0ae'), grey = new THREE.Color('#a9a596'), soil = new THREE.Color('#8f8458'), green = new THREE.Color('#7d9440');
    terrain({
      w: 110, d: 90, cz: -8, seg: 2.2, height: groundH, detail: TEX.riverbed,
      color: (x, z, y) => {
        const n = Math.sin(x * 2.3) * Math.cos(z * 1.9) * 0.5 + 0.5, n2 = Math.sin(x * 0.7 + z * 0.9) * 0.5 + 0.5;
        let c = lime.clone().lerp(grey, n * 0.45).lerp(limeWarm, n2 * 0.4);
        if (-z > 21 && -z < 23.5) c.lerp(soil, 0.6);          // talus at the cliff foot
        if (z > 13) c.lerp(green, THREE.MathUtils.smoothstep(z, 13, 18) * 0.7);
        return c.multiplyScalar(0.8);
      },
    });

    // boulder rocks (visual shells matching the height bumps)
    scatter(new THREE.DodecahedronGeometry(1, 2), addDetail(new THREE.MeshStandardMaterial({ roughness: 0.95 }), TEX.boulder, { scale: 0.45 }), boulders.length - 1, (i) => {
      const b = boulders[i];
      return { p: new THREE.Vector3(b.x, base(b.x, b.z) - b.h * 0.15, b.z), s: new THREE.Vector3(b.r * 1.02, b.h * 1.15, b.r * (0.8 + rnd() * 0.3)), c: [limeWarm, lime, new THREE.Color('#e9dcb8')][(rnd() * 3) | 0].clone().multiplyScalar(1.0 + rnd() * 0.12) };
    }, { cast: true });
    // pebbles across the bed
    scatter(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ roughness: 1 }), 900, () => {
      const x = -45 + rnd() * 90, z = -21 + rnd() * 36, r = 0.06 + rnd() * rnd() * 0.25;
      return { p: new THREE.Vector3(x, groundH(x, z), z), s: new THREE.Vector3(r * 1.3, r * 0.6, r), c: [lime, grey, limeWarm][(rnd() * 3) | 0] };
    });

    // layered bluff: stacked ledges with overhangs
    const ledgeMats = ['#e3d6b2', '#cfc0a0', '#efe2bf', '#c6b896', '#dccfa9'].map((c) => addDetail(new THREE.MeshStandardMaterial({ color: c, roughness: 1 }), TEX.boulder, { scale: 0.3 }));
    for (let layer = 0; layer < 7; layer++) {
      const y = 1.5 + layer * 2.1;
      for (let x = -60; x < 60; x += 2.4 + rnd() * 2) {
        const w = 2.4 + rnd() * 2.6, h = 1.4 + rnd() * 0.8;
        const z = -25.5 - layer * 0.55 + (rnd() - 0.5) * 0.6;
        const g = new THREE.BoxGeometry(w, h, 2.2, 3, 2, 1);
        const P = g.attributes.position; for (let i = 0; i < P.count; i++) P.setXYZ(i, P.getX(i) * (1 + (rnd() - 0.5) * 0.08), P.getY(i) + (rnd() - 0.5) * 0.15, P.getZ(i) + (rnd() - 0.5) * 0.25);
        g.computeVertexNormals();
        const m = new THREE.Mesh(g, ledgeMats[(rnd() * 5) | 0]);
        m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m);
      }
    }
    // vegetation on the bluff top and ledges, trees and yellow sumac in front
    for (let x = -60; x < 60; x += 2 + rnd() * 2) forest.blob(x, 17 + rnd() * 2, -31 - rnd() * 6, 1.2 + rnd() * 1.4, new THREE.Color(['#6e9a34', '#94b83b', '#5a8a30'][(rnd() * 3) | 0]));
    for (let i = 0; i < 40; i++) { const x = -55 + rnd() * 110, layer = (rnd() * 6) | 0; forest.blob(x, 2.6 + layer * 2.1, -24.8 - layer * 0.55, 0.4 + rnd() * 0.5, new THREE.Color('#7fa33a')); }
    for (let i = 0; i < 14; i++) { const x = -45 + rnd() * 90, z = -21 + rnd() * 3; forest.tree(new THREE.Vector3(x, groundH(x, z), z), 5 + rnd() * 4, new THREE.Vector3((rnd() - 0.5) * 2, 0, 1 + rnd() * 2), 2.6, 0.25); }
    for (let i = 0; i < 26; i++) { const x = -45 + rnd() * 90, z = rnd() < 0.5 ? -20 + rnd() * 4 : 12 + rnd() * 10; forest.bush(new THREE.Vector3(x, groundH(x, z), z), 1 + rnd() * 1.2); }
    for (let i = 0; i < 40; i++) {
      const x = -45 + rnd() * 90, z = rnd() < 0.5 ? -20 + rnd() * 4 : 12 + rnd() * 10;
      forest.blob(x, groundH(x, z) + 0.4 + rnd() * 0.8, z, 0.4 + rnd() * 0.7, new THREE.Color(['#c9cf3e', '#a7c23f', '#e0b640', '#8fb03a'][(rnd() * 4) | 0]));
    }
    for (let i = 0; i < 10; i++) { const x = -45 + rnd() * 90, z = 16 + rnd() * 8; forest.tree(new THREE.Vector3(x, groundH(x, z), z), 6 + rnd() * 3, new THREE.Vector3(0, 0, -1.5), 3.2, 0.3); }
    // dry grass tufts in rock cracks
    scatter(new THREE.ConeGeometry(0.12, 0.35, 5).translate(0, 0.17, 0), new THREE.MeshStandardMaterial({ color: '#b9a35c', roughness: 1 }), 400, () => {
      const x = -45 + rnd() * 90, z = -20 + rnd() * 34;
      return { p: new THREE.Vector3(x, groundH(x, z), z), s: new THREE.Vector3(1, 0.6 + rnd(), 1), c: new THREE.Color(rnd() < 0.5 ? '#c4ad62' : '#9aa64e') };
    });
  },
});
