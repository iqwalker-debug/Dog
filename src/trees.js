// Real branching trees from EZ-Tree (github.com/dgreenheck/ez-tree, MIT).
// A handful of variants are generated once and shared (geometry + material) by every placed tree.
// EZ-Tree's leaf wind shader doesn't support InstancedMesh, so each placement is a light Mesh clone.
import * as THREE from 'three';
import { Tree } from '@dgreenheck/ez-tree';

// live-oak palette (yellow-green, like the paintings)
const LEAF_TINTS = [0xfff7b8, 0xf4ffb0, 0xfff0a0, 0xeaffc0, 0xffe890]; // multiplied onto the leaf texture
const VARIANTS = [
  { preset: 'Oak Medium', seed: 101 }, { preset: 'Oak Large', seed: 202 }, { preset: 'Oak Medium', seed: 303 },
  { preset: 'Oak Large', seed: 404 }, { preset: 'Oak Small', seed: 505 }, { preset: 'Aspen Medium', seed: 606, yellow: true },
];
const BUSHES = [{ preset: 'Bush 2', seed: 22 }, { preset: 'Bush 2', seed: 44 }, { preset: 'Oak Small', seed: 55 }];

const cache = new Map();
const leafMaterials = new Set();

function build(v, i) {
  const key = v.preset + v.seed;
  if (cache.has(key)) return cache.get(key);
  const t = new Tree();
  t.loadPreset(v.preset);
  t.options.seed = v.seed;
  t.options.leaves.tint = v.yellow ? 0xffd860 : LEAF_TINTS[i % LEAF_TINTS.length];
  t.options.bark.tint = 0xd9c8b0;
  // fuller, broader canopies like Texas live oaks
  t.options.leaves.size *= 1.35;
  t.options.leaves.count = Math.round(t.options.leaves.count * 1.4);
  t.generate();
  const box = new THREE.Box3().setFromObject(t);
  const out = { branches: t.branchesMesh, leaves: t.leavesMesh, height: box.max.y - box.min.y, baseY: box.min.y };
  // dappled shadows: leaf cards cast cut-out shadows, not squares
  const lm = t.leavesMesh.material;
  out.leafDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: lm.map, alphaTest: lm.alphaTest, side: THREE.DoubleSide });
  lm.emissive = new THREE.Color('#2e3a08'); // sunlit translucency so canopies glow yellow-green
  leafMaterials.add(lm);
  cache.set(key, out);
  return out;
}

/** Place a tree. opts: height (m), variant index, bush, rotation */
export function placeTree(scene, pos, { height = 8, variant, bush = false, rot = Math.random() * 6.28, rnd = Math.random } = {}) {
  const list = bush ? BUSHES : VARIANTS;
  const i = variant ?? (rnd() * list.length) | 0;
  const v = build(list[i % list.length], i);
  const g = new THREE.Group();
  const b = new THREE.Mesh(v.branches.geometry, v.branches.material);
  const l = new THREE.Mesh(v.leaves.geometry, v.leaves.material);
  b.castShadow = l.castShadow = true; b.receiveShadow = l.receiveShadow = true;
  l.customDepthMaterial = v.leafDepth;
  g.add(b, l);
  const s = height / v.height;
  g.scale.setScalar(s);
  g.position.set(pos.x, pos.y - v.baseY * s - 0.1, pos.z);
  g.rotation.y = rot;
  scene.add(g);
  return g;
}

/** Call every frame so leaves sway in the breeze. */
export function updateTrees(t) {
  leafMaterials.forEach((m) => { const sh = m.userData.shader; if (sh) sh.uniforms.uTime.value = t; });
}

// debug hook: window.__trees.placeTree(scene, pos, opts)
if (typeof window !== 'undefined') window.__trees = { placeTree, VARIANTS, BUSHES };
