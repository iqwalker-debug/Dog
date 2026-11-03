// Shell-texture fur: N copies of a mesh pushed out along normals; a 3D strand
// pattern discards everything that isn't a hair. Supports curl, droop and wetness.
import * as THREE from 'three';

export function makeFur(geometry, {
  color = '#222', length = 0.08, density = 38, shells = 24, curl = 0, droop = 0.25,
} = {}) {
  const base = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  base.computeVertexNormals();
  const P = base.attributes.position.array, N = base.attributes.normal.array;
  const n = P.length / 3;
  const C = base.attributes.color ? base.attributes.color.array : null;
  const A = base.attributes.aLen ? base.attributes.aLen.array : null; // per-vertex fur length multiplier
  const pos = new Float32Array(P.length * shells), nor = new Float32Array(N.length * shells), sh = new Float32Array(n * shells);
  const col = C ? new Float32Array(C.length * shells) : null;
  const len = new Float32Array(n * shells).fill(1);
  for (let s = 0; s < shells; s++) {
    pos.set(P, s * P.length); nor.set(N, s * N.length); if (col) col.set(C, s * C.length); if (A) len.set(A, s * n);
    sh.fill((s + 1) / shells, s * n, (s + 1) * n);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('aShell', new THREE.BufferAttribute(sh, 1));
  if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aLen', new THREE.BufferAttribute(len, 1));

  const uniforms = {
    uLen: { value: length }, uDensity: { value: density }, uWet: { value: 0 },
    uCurl: { value: curl }, uDroop: { value: droop },
  };
  const mat = new THREE.MeshStandardMaterial({ color: col ? '#ffffff' : color, roughness: 0.85, vertexColors: !!col });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aShell; attribute float aLen;
        uniform float uLen, uWet, uCurl, uDroop;
        varying float vShell; varying vec3 vBase; varying vec3 vN;`)
      .replace('#include <begin_vertex>', `
        vec3 transformed = vec3(position);
        vBase = position; vN = normal; vShell = aShell;
        float L = uLen * aLen * (1.0 - uWet * 0.55);
        vec3 g = normalize(transpose(mat3(modelMatrix)) * vec3(0.0, -1.0, 0.0));
        transformed += normal * aShell * L;
        transformed += g * aShell * aShell * L * (uDroop + uWet * 0.9);
        transformed += uCurl * L * aShell * vec3(
          sin(aShell * 9.0 + position.y * 30.0),
          cos(aShell * 9.0 + position.x * 30.0),
          sin(aShell * 7.0 + position.z * 30.0));`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uDensity, uWet;
        varying float vShell; varying vec3 vBase; varying vec3 vN;
        float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 q = vBase * uDensity * mix(1.0, 0.45, uWet); // wet fur clumps
        vec3 cell = floor(q); vec3 l = fract(q) - 0.5;
        vec3 nn = normalize(vN); vec3 lp = l - dot(l, nn) * nn;
        float r = h3(cell);
        float strand = 0.5 + 0.5 * r;
        if (vShell > strand) discard;
        if (length(lp) > (1.0 - vShell / strand) * 0.6) discard;
        diffuseColor.rgb *= mix(0.6, 1.1, vShell) * (1.0 - uWet * 0.35) * (0.85 + 0.3 * r);`);
  };

  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.fur = {
    uniforms, mat, vertsPerShell: n, shells,
    setShells(k) { geo.setDrawRange(0, n * Math.max(1, Math.min(shells, k))); },
    setWet(w) { uniforms.uWet.value = w; mat.roughness = 0.85 - w * 0.5; },
  };
  return mesh;
}
