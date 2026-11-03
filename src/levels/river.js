// Level 8 — Shallow golden-bottom river wading with heavy sun sparkle (painting 16).
import { runLevel, THREE, seeded, makeRiverbedMaterial } from '../world.js';

const rnd = seeded(81);
const bankL = (z) => -14 + Math.sin(z * 0.04) * 3;   // rocky beach side
const bankR = (z) => 26 + Math.sin(z * 0.03 + 1) * 2; // retaining wall side

function groundH(x, z) {
  const l = bankL(z), r = bankR(z);
  // shallow golden shelf on the near side, deeper channel toward the far bank
  const across = THREE.MathUtils.clamp((x - l) / (r - l), 0, 1);
  let h = -0.25 - THREE.MathUtils.smoothstep(across, 0.45, 0.75) * 1.0 + Math.sin(x * 1.3 + z * 0.8) * 0.04 + Math.sin(x * 0.3 - z * 0.2) * 0.06;
  h = THREE.MathUtils.lerp(h, 0.5 + (l - x) * 0.12, THREE.MathUtils.smoothstep(l - x, -1.5, 1.5));
  h = THREE.MathUtils.lerp(h, 1.6, THREE.MathUtils.smoothstep(x - r, -0.5, 0.5));
  return h;
}

runLevel({
  id: 'river', name: 'Golden River', seed: 82,
  fog: ['#cfe3ea', 50, 220], groundTint: '#a39556',
  groundH, waterY: 0, waterOpts: { w: 400, d: 400, color: '#2a9c8c', clear: 0.14 },
  bounds: { x0: -26, x1: 25, z0: -70, z1: 40 },
  start: { x: -9, z: 24, heading: Math.PI * 0.92 },
  player: 'lab', buddies: ['whiteDoodle', 'doodle'],
  treatSpot: (r) => { const z = -60 + r() * 90; return { x: bankL(z) - 3 + r() * 22, z }; },
  build({ scene, terrain, scatter, forest, rnd: R }) {
    const gold = new THREE.Color('#c9a64e'), ochre = new THREE.Color('#a8873e'), teal = new THREE.Color('#4f8d78'), beach = new THREE.Color('#e3d6b6'), grass = new THREE.Color('#9fb54a');
    const bedMat = makeRiverbedMaterial(new THREE.Color('#ffffff'));
    terrain({
      w: 120, d: 180, cx: 5, cz: -20, seg: 1.6, height: groundH, material: bedMat,
      color: (x, z, y) => {
        const n = Math.sin(x * 3.1) * Math.cos(z * 2.6) * 0.5 + 0.5;
        if (y < 0) return gold.clone().lerp(ochre, n * 0.6).lerp(teal, THREE.MathUtils.clamp(-y - 0.6, 0, 1) * 0.6);
        if (x < 0) return beach.clone().lerp(grass, THREE.MathUtils.smoothstep(bankL(z) - x, 3, 9) * 0.8);
        return grass;
      },
    });
    // mottled stones on the bed + bank rocks
    scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.9 }), 1600, () => {
      const z = -80 + R() * 130, x = bankL(z) - 4 + R() * 30, r = 0.08 + R() * R() * 0.35;
      return { p: new THREE.Vector3(x, groundH(x, z) - r * 0.2, z), s: new THREE.Vector3(r * 1.4, r * 0.5, r), c: new THREE.Color(['#d6b55e', '#b89448', '#c9c0a2', '#9e8a52', '#e2c877'][(R() * 5) | 0]) };
    });
    scatter(new THREE.DodecahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 1 }), 120, () => {
      const z = -80 + R() * 130, x = bankL(z) - R() * 3, r = 0.3 + R() * 0.6;
      return { p: new THREE.Vector3(x, groundH(x, z), z), s: new THREE.Vector3(r * 1.3, r * 0.6, r), c: new THREE.Color(['#e6dcc4', '#d4c8aa'][(R() * 2) | 0]) };
    }, { cast: true });
    // stone retaining wall on the far bank
    for (let z = -90; z < 50; z += 2.5) {
      const x = bankR(z) + 0.6;
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1.8, 2.6), new THREE.MeshStandardMaterial({ color: R() < 0.5 ? '#d8d2c2' : '#c7c0ad', roughness: 1 }));
      m.position.set(x, 0.7, z); m.receiveShadow = true; scene.add(m);
    }
    // trees: golden-yellow cottonwoods on the near bank, deep green on the far bank
    for (let i = 0; i < 26; i++) { const z = -85 + R() * 125, x = bankL(z) - 4 - R() * 10; forest.tree(new THREE.Vector3(x, groundH(x, z), z), 7 + R() * 4, new THREE.Vector3(2 + R() * 2, 0, 0), 4, 0.65); }
    for (let i = 0; i < 26; i++) { const z = -85 + R() * 125, x = bankR(z) + 3 + R() * 10; forest.tree(new THREE.Vector3(x, 1.6, z), 7 + R() * 5, new THREE.Vector3(-1.5, 0, 0), 4, 0.05); }
    // distant downtown skyline beyond the bend
    for (let i = 0; i < 6; i++) {
      const h = 18 + R() * 30;
      const b = new THREE.Mesh(new THREE.BoxGeometry(6 + R() * 6, h, 6), new THREE.MeshStandardMaterial({ color: '#8fa3b3', roughness: 1 }));
      b.position.set(-10 + i * 7 + R() * 4, h / 2, -150 - R() * 20); scene.add(b);
    }
    for (let i = 0; i < 160; i++) forest.blob(-50 + R() * 100, 2 + R() * 6, -120 - R() * 15, 3 + R() * 3, new THREE.Color(['#7fa65a', '#99b45a', '#6a9a5f'][(R() * 3) | 0]));
    return [(t) => (bedMat.userData.uniforms.uTime.value = t)];
  },
});

// heavier sun sparkle on this river
requestAnimationFrame(() => { const g = window.__game; if (g) g.R.painterly.uniforms.glint.value = 2.2; });
