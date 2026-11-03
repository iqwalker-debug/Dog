// Sculpt smooth organic meshes from signed-distance shapes (blended ellipsoids/capsules),
// polygonized with three's MarchingCubes. Used for dog bodies and heads.
import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';

const V = new THREE.Vector3();

export const sdf = {
  sphere: (c, r) => (p) => V.copy(p).sub(c).length() - r,
  ellipsoid: (c, r) => (p) => {
    const x = (p.x - c.x) / r.x, y = (p.y - c.y) / r.y, z = (p.z - c.z) / r.z;
    const k0 = Math.hypot(x, y, z);
    const k1 = Math.hypot(x / r.x, y / r.y, z / r.z);
    return (k0 * (k0 - 1)) / Math.max(k1, 1e-6);
  },
  // tapered capsule a->b, radius ra at a, rb at b
  capsule: (a, b, ra, rb = ra) => {
    const ba = new THREE.Vector3().subVectors(b, a), l2 = ba.lengthSq();
    return (p) => {
      const pa = V.copy(p).sub(a);
      const h = THREE.MathUtils.clamp(pa.dot(ba) / l2, 0, 1);
      const r = ra + (rb - ra) * h;
      return Math.hypot(pa.x - ba.x * h, pa.y - ba.y * h, pa.z - ba.z * h) - r;
    };
  },
};

// polynomial smooth-min: blends shapes like clay
export function smoothUnion(shapes, k = 0.08) {
  return (p) => {
    let d = shapes[0](p);
    for (let i = 1; i < shapes.length; i++) {
      const b = shapes[i](p);
      const h = THREE.MathUtils.clamp(0.5 + (0.5 * (b - d)) / k, 0, 1);
      d = b + (d - b) * h - k * h * (1 - h);
    }
    return d;
  };
}

// carve shape b out of a (eye sockets, mouth line)
export function smoothSubtract(a, b, k = 0.02) {
  // smooth max(a, -b)
  return (p) => {
    const da = a(p), db = b(p);
    const h = THREE.MathUtils.clamp(0.5 + (0.5 * (da + db)) / k, 0, 1);
    return -db + (da + db) * h + k * h * (1 - h);
  };
}

/**
 * Polygonize `dist` inside a cube (center, half-size) at `res`^3.
 * colorFn(p) -> THREE.Color adds per-vertex colors (for coat markings).
 */
export function sculpt(dist, center, half, res = 40, colorFn = null) {
  const mc = new MarchingCubes(res, new THREE.MeshBasicMaterial(), false, false, 80000);
  const hs = mc.halfsize, p = new THREE.Vector3();
  for (let z = 0; z < res; z++) for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) {
    p.set(center.x + ((x - hs) / hs) * half, center.y + ((y - hs) / hs) * half, center.z + ((z - hs) / hs) * half);
    mc.field[x + y * res + z * res * res] = mc.isolation - dist(p) * (400 / half);
  }
  mc.update();
  const n = mc.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  const P = mc.geometry.attributes.position.array, N = mc.geometry.attributes.normal.array;
  for (let i = 0; i < n * 3; i += 3) {
    pos[i] = P[i] * half + center.x; pos[i + 1] = P[i + 1] * half + center.y; pos[i + 2] = P[i + 2] * half + center.z;
    const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1;
    nor[i] = N[i] / l; nor[i + 1] = N[i + 1] / l; nor[i + 2] = N[i + 2] / l;
  }
  // make winding agree with outward normals
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3();
  let agree = 0;
  for (let t = 0; t < Math.min(n, 900); t += 3) {
    a.fromArray(pos, t * 3); b.fromArray(pos, t * 3 + 3); c.fromArray(pos, t * 3 + 6);
    fn.subVectors(b, a).cross(c.sub(a));
    agree += Math.sign(fn.x * nor[t * 3] + fn.y * nor[t * 3 + 1] + fn.z * nor[t * 3 + 2]);
  }
  if (agree < 0) for (let t = 0; t < n; t += 3) for (let k = 0; k < 3; k++) {
    const i = (t + 1) * 3 + k, j = (t + 2) * 3 + k;
    [pos[i], pos[j]] = [pos[j], pos[i]]; [nor[i], nor[j]] = [nor[j], nor[i]];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (colorFn) {
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const cc = colorFn(p.fromArray(pos, i * 3)); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  mc.geometry.dispose();
  return geo;
}
