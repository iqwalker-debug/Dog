// Placeholder procedural swimming dog. Replace with rigged GLB + shell fur later (see CLAUDE.md).
import * as THREE from 'three';

export function createDog({ coat = '#1c1d22', belly = '#f2efe8', curly = false } = {}) {
  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);
  const coatMat = new THREE.MeshStandardMaterial({ color: coat, roughness: 0.75 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: belly, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: 0.4 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#5a3415', roughness: 0.15 });
  const add = (geo, mat, pos, rot, parent = rig) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); if (rot) m.rotation.set(...rot);
    m.castShadow = true; parent.add(m); return m;
  };

  // body (mostly submerged when swimming)
  add(new THREE.CapsuleGeometry(0.42, 1.1, 6, 12), coatMat, [0, -0.15, -0.2], [Math.PI / 2 - 0.15, 0, 0]);
  add(new THREE.CapsuleGeometry(0.34, 0.9, 6, 12), bellyMat, [0, -0.32, -0.15], [Math.PI / 2 - 0.15, 0, 0]);

  // head
  const head = new THREE.Group(); head.position.set(0, 0.32, 0.55); rig.add(head);
  add(new THREE.SphereGeometry(0.34, 20, 16), coatMat, [0, 0, 0], null, head);
  add(new THREE.CapsuleGeometry(0.15, 0.25, 6, 10), belly === coat ? coatMat : bellyMat, [0, -0.08, 0.3], [Math.PI / 2, 0, 0], head);
  add(new THREE.SphereGeometry(0.07, 10, 8), dark, [0, -0.04, 0.5], null, head);
  for (const s of [-1, 1]) {
    add(new THREE.SphereGeometry(0.045, 10, 8), eyeMat, [s * 0.13, 0.08, 0.27], null, head);
    if (curly) add(new THREE.SphereGeometry(0.17, 12, 10), coatMat, [s * 0.3, -0.08, 0], [0, 0, s * 0.3], head).scale.set(0.6, 1.3, 0.8);
    else add(new THREE.ConeGeometry(0.12, 0.3, 4), coatMat, [s * 0.17, 0.33, -0.02], [0, 0, -s * 0.2], head);
  }
  if (curly) {
    const fluff = new THREE.SphereGeometry(0.1, 8, 6);
    for (let i = 0; i < 40; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(0.33);
      if (v.z > 0.2) continue;
      add(fluff, coatMat, [v.x, v.y, v.z], null, head);
    }
  }

  // tail (plume) floating behind
  const tail = new THREE.Group(); tail.position.set(0, 0.05, -1.0); rig.add(tail);
  add(new THREE.CapsuleGeometry(0.11, 0.6, 4, 8), coatMat, [0, 0.15, -0.3], [-0.9, 0, 0], tail);
  if (!curly && belly !== coat) add(new THREE.SphereGeometry(0.12, 8, 6), bellyMat, [0, 0.38, -0.55], null, tail);

  // paddling front legs
  const legs = [-1, 1].map((s) => add(new THREE.CapsuleGeometry(0.09, 0.45, 4, 8), coatMat, [s * 0.25, -0.45, 0.35], [0.6, 0, 0]));

  let t = Math.random() * 10, splashT = 0;
  return {
    group,
    splash() { splashT = 0.6; },
    update(dt, speed) {
      t += dt * (2 + speed);
      rig.position.y = Math.sin(t * 1.3) * 0.05 + (splashT > 0 ? Math.sin(splashT * 10) * 0.12 : 0);
      rig.rotation.z = Math.sin(t * 0.9) * 0.04;
      head.rotation.x = -0.1 + Math.sin(t * 1.3 + 0.5) * 0.04;
      tail.rotation.y = Math.sin(t * 1.5) * 0.35;
      legs.forEach((l, i) => (l.rotation.x = 0.6 + Math.sin(t * 3 + i * Math.PI) * 0.6));
      splashT = Math.max(0, splashT - dt);
    },
  };
}
