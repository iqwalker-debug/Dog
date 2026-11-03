// Sculpted dog: one smooth body + head (blended shapes), breed markings in the fur,
// two-segment legs, breed ears/tails, collar or harness. Gaits: swim, walk/trot/run, shake.
import * as THREE from 'three';
import { makeFur } from './fur.js';
import { sculpt, sdf, smoothUnion } from './sculpt.js';
import { BREEDS } from './breeds.js';

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

function colorize(geo, fn) {
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { const c = fn(v.fromBufferAttribute(p, i)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

export function createDog(opts = {}) {
  const key = typeof opts === 'string' ? opts : opts.breed || 'golden';
  const B = BREEDS[key];
  const W = B.width, S = B.size, D = B.depth ?? 0.82; // D = torso depth (vertical)
  const coat = new THREE.Color(B.coat), second = new THREE.Color(B.second);
  const tint = (part, p) => coat.clone().lerp(second, THREE.MathUtils.clamp(B.mark(p, part), 0, 1));

  const group = new THREE.Group();
  const rig = new THREE.Group(); rig.scale.setScalar(S); group.add(rig);
  const furs = [];
  const skinMat = new THREE.MeshStandardMaterial({ color: '#b8b8b8', vertexColors: true, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1a1412', roughness: 0.3 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#3b2210', roughness: 0.05 });
  const tongueMat = new THREE.MeshStandardMaterial({ color: '#e5747f', roughness: 0.35 });
  const fl = B.furLen;

  function furred(geo, parent, furScale = 1, extra = {}) {
    const holder = new THREE.Group();
    const skin = new THREE.Mesh(geo, skinMat); skin.castShadow = true; holder.add(skin);
    const f = makeFur(geo, { length: fl * furScale, curl: B.curl, shells: B.shells, density: B.curl > 0.5 ? 30 : 42, ...extra });
    holder.add(f); furs.push(f); parent.add(holder);
    return holder;
  }
  const plain = (geo, mat, pos, parent) => { const m = new THREE.Mesh(geo, mat); m.position.copy(pos); m.castShadow = true; parent.add(m); return m; };

  // ---- body: chest, ribs, hips, neck, shoulders, thighs blended like clay ----
  const body = smoothUnion([
    sdf.ellipsoid(v3(0, 0.0, 0.3), v3(0.23 * W, 0.29 * D, 0.28)),
    sdf.capsule(v3(0, 0.03, 0.3), v3(0, 0.06, -0.32), 0.215 * W * D, 0.17 * W * D),
    sdf.ellipsoid(v3(0, 0.06, -0.42), v3(0.2 * W, 0.21 * D, 0.23)),
    sdf.capsule(v3(0, 0.12, 0.38), v3(0, 0.36, 0.6), 0.16 * W, 0.12 * W),
    sdf.ellipsoid(v3(0.15 * W, -0.04, 0.3), v3(0.09, 0.2, 0.13)),
    sdf.ellipsoid(v3(-0.15 * W, -0.04, 0.3), v3(0.09, 0.2, 0.13)),
    sdf.ellipsoid(v3(0.13 * W, -0.06, -0.42), v3(0.1, 0.21, 0.16)),
    sdf.ellipsoid(v3(-0.13 * W, -0.06, -0.42), v3(0.1, 0.21, 0.16)),
  ], 0.1);
  furred(sculpt(body, v3(0, 0.08, 0.05), 0.85, 44, (p) => tint('body', p)), rig);

  // ---- head ----
  const neck = new THREE.Group(); neck.position.set(0, 0.4, 0.64); rig.add(neck);
  const head = new THREE.Group(); neck.add(head);
  const sn = B.snout, frenchie = key === 'frenchie';
  const skullR = frenchie ? v3(0.17, 0.15, 0.15) : v3(0.135 * W, 0.135, 0.15);
  const muzzleR = frenchie ? 0.1 : 0.08;
  const headSdf = smoothUnion([
    sdf.ellipsoid(v3(0, 0.04, -0.02), skullR),
    sdf.capsule(v3(0, -0.025, 0.06), v3(0, -0.04, 0.06 + sn), muzzleR, muzzleR * 0.85),
    sdf.capsule(v3(0, -0.075, 0.04), v3(0, -0.08, 0.03 + sn * 0.85), 0.05, 0.045),
    sdf.ellipsoid(v3(0.075 * W, -0.02, 0.04), v3(0.06, 0.06, 0.07)),
    sdf.ellipsoid(v3(-0.075 * W, -0.02, 0.04), v3(0.06, 0.06, 0.07)),
  ], 0.05);
  const headFur = 0.45;
  furred(sculpt(headSdf, v3(0, 0, 0.08), 0.34, 34, (p) => tint('head', p)), head, headFur);
  const tipZ = 0.06 + sn + muzzleR * 0.85 + fl * headFur * 0.6;
  plain(new THREE.SphereGeometry(frenchie ? 0.045 : 0.036, 14, 10), dark, v3(0, -0.03, tipZ - 0.01), head).scale.set(1.2, 0.85, 0.9);
  for (const s of [-1, 1]) {
    const eye = plain(new THREE.SphereGeometry(0.024, 14, 10), eyeMat, v3(s * 0.068 * W, 0.045, 0.1 + fl * headFur * 0.7), head);
    if (frenchie) eye.scale.setScalar(1.3);
  }
  const tongue = plain(new THREE.CapsuleGeometry(0.035, 0.09, 4, 8), tongueMat, v3(0, -0.11, 0.06 + sn * 0.8), head);
  tongue.rotation.x = 1.1; tongue.scale.set(1.4, 1, 0.5);

  // ---- ears ----
  const ears = [-1, 1].map((s) => {
    const pivot = new THREE.Group(); head.add(pivot);
    let geo;
    if (B.ears === 'flop') {
      pivot.position.set(s * 0.15 * W, 0.09, -0.01);
      geo = new THREE.SphereGeometry(1, 14, 10).scale(0.03, 0.105, 0.07).rotateZ(s * 0.18).translate(s * 0.04, -0.07, 0);
    } else if (B.ears === 'erect') {
      pivot.position.set(s * 0.075, 0.15, -0.04);
      geo = new THREE.ConeGeometry(0.055, 0.13, 8).scale(1, 1, 0.45).rotateZ(-s * 0.25).translate(s * 0.015, 0.06, 0);
    } else { // bat
      pivot.position.set(s * 0.1, 0.14, -0.03);
      geo = new THREE.ConeGeometry(0.07, 0.15, 10).scale(1, 1, 0.4).rotateZ(-s * 0.35).translate(s * 0.03, 0.06, 0);
    }
    furred(colorize(geo, (p) => tint('ear', p)), pivot, B.ears === 'flop' ? 1.1 : 0.4);
    return { pivot, s, ang: 0, vel: 0 };
  });

  // ---- tail: chain of segments ----
  const T = {
    feather: { n: 5, len: 0.1, r0: 0.045, r1: 0.025, root: -0.55, bend: -0.12, fur: 2.0 },
    plume: { n: 5, len: 0.1, r0: 0.05, r1: 0.035, root: 0.9, bend: 0.5, fur: 1.8 },
    otter: { n: 4, len: 0.11, r0: 0.06, r1: 0.022, root: -0.35, bend: -0.06, fur: 1 },
    pom: { n: 4, len: 0.1, r0: 0.045, r1: 0.04, root: 0.6, bend: 0.22, fur: 1.1 },
    stub: { n: 1, len: 0.05, r0: 0.04, r1: 0.03, root: 0.3, bend: 0, fur: 1 },
  }[B.tail];
  const tailRoot = new THREE.Group(); tailRoot.position.set(0, 0.14, -0.6); tailRoot.rotation.x = T.root; rig.add(tailRoot);
  const tailSegs = [];
  let parent = tailRoot;
  for (let i = 0; i < T.n; i++) {
    const seg = new THREE.Group(); if (i) { seg.position.z = -T.len; seg.rotation.x = T.bend; }
    parent.add(seg); tailSegs.push(seg);
    const r = THREE.MathUtils.lerp(T.r0, T.r1, i / Math.max(1, T.n - 1));
    const part = i >= T.n - 2 && T.n > 2 ? 'tailTip' : 'tail';
    const geo = new THREE.CapsuleGeometry(r, T.len, 4, 8).rotateX(Math.PI / 2).translate(0, 0, -T.len / 2);
    furred(colorize(geo, (p) => tint(part, p)), seg, T.fur, { droop: 0.6 });
    parent = seg;
  }

  // ---- legs: upper + lower + paw, pivots at shoulder/hip and elbow/knee ----
  const top = 0.12, pawR = 0.045;
  const segLen = (B.legH / S - top - pawR) / 2;
  const legs = [[-1, 0.3, true], [1, 0.3, true], [-1, -0.42, false], [1, -0.42, false]].map(([s, z, front], i) => {
    const hip = new THREE.Group(); hip.position.set(s * 0.13 * W, -top, z); rig.add(hip);
    const knee = new THREE.Group(); knee.position.y = -segLen; hip.add(knee);
    const rU = front ? 0.07 : 0.085, rL = 0.05;
    furred(colorize(new THREE.CapsuleGeometry(rU, segLen, 4, 10).translate(0, -segLen / 2, 0), (p) => tint('leg', p)), hip, 0.7);
    furred(colorize(new THREE.CapsuleGeometry(rL, segLen, 4, 10).translate(0, -segLen / 2, 0), (p) => tint('paw', p)), knee, 0.5);
    furred(colorize(new THREE.SphereGeometry(1, 12, 8).scale(0.055, pawR, 0.075).translate(0, -segLen, 0.025), (p) => tint('paw', p)), knee, 0.4);
    return {
      hip, knee, front, restU: front ? -0.04 : 0.32, restK: front ? 0.06 : -0.62,
      phase: [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5][i],
    };
  });

  // ---- gear ----
  if (B.gear) {
    const gm = new THREE.MeshStandardMaterial({ color: B.gear.color, roughness: 0.6 });
    const off = fl * 0.7;
    const collar = new THREE.Mesh(new THREE.TorusGeometry(1, 0.09, 8, 28), gm);
    collar.scale.set(0.15 * W + off, 0.15 + off, 0.15);
    collar.position.set(0, 0.3, 0.53); collar.rotation.x = -0.75; rig.add(collar);
    if (B.gear.type === 'harness') {
      for (const [z, r] of [[0.38, 0.27], [0.08, 0.255]]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 32), gm);
        band.scale.set(r * W + off * 0.6, 0.29 + off * 0.6, 1); band.position.set(0, 0.03, z); band.rotation.x = z > 0.2 ? -0.35 : 0;
        rig.add(band);
      }
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2 * W, 0.04, 0.34), gm);
      plate.position.set(0, 0.31 + off * 0.6, 0.22); rig.add(plate);
    }
  }

  // ---- droplets ----
  const DROPS = 160;
  const dropGeo = new THREE.BufferGeometry();
  const dPos = new Float32Array(DROPS * 3).fill(-999), dVel = new Float32Array(DROPS * 3), dLife = new Float32Array(DROPS);
  dropGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const drops = new THREE.Points(dropGeo, new THREE.PointsMaterial({ color: '#e8f6ff', size: 0.06, transparent: true, opacity: 0.85, depthWrite: false }));
  drops.frustumCulled = false;
  let dropIdx = 0;
  function emitDrops(count, spread) {
    const wp = new THREE.Vector3(); rig.getWorldPosition(wp);
    for (let k = 0; k < count; k++) {
      const i = dropIdx++ % DROPS, a = Math.random() * Math.PI * 2;
      dPos[i * 3] = wp.x + Math.cos(a) * 0.4 * S; dPos[i * 3 + 1] = wp.y + 0.1 + Math.random() * 0.3; dPos[i * 3 + 2] = wp.z + Math.sin(a) * 0.4 * S;
      dVel[i * 3] = Math.cos(a) * spread * (0.5 + Math.random()); dVel[i * 3 + 1] = 1 + Math.random() * 2.5; dVel[i * 3 + 2] = Math.sin(a) * spread * (0.5 + Math.random());
      dLife[i] = 1;
    }
  }

  let t = Math.random() * 10, gait = 0, splashT = 0, shakeT = 0, wet = 0, landTime = 0;
  let prevY = 0, prevVy = 0, mode = 'swim';
  const wagBase = tailRoot.rotation.x;

  const api = {
    group, drops, breed: key, name: B.name,
    get wet() { return wet; },
    get mode() { return mode; },
    splash() { splashT = 0.6; },
    shake() { if (shakeT <= 0) shakeT = 1.1; },
    setFurDetail(k) { furs.forEach((f) => f.userData.fur.setShells(Math.ceil((k / 24) * B.shells))); },
    dispose() {
      group.traverse((o) => { o.geometry?.dispose(); });
      drops.geometry.dispose(); drops.removeFromParent();
    },
    update(dt, speed, inWater = true, groundY = -1.4) {
      t += dt;
      const run = Math.min(Math.abs(speed) / 5, 1);
      mode = inWater ? 'swim' : 'land';
      let wagSpeed = 2, wagAmp = 0.3, tailLift = 0;

      if (inWater) {
        wet = Math.min(1, wet + dt * 2);
        landTime = 0;
        group.position.y = THREE.MathUtils.lerp(group.position.y, 0, 1 - Math.exp(-dt * 6));
        gait += dt * (4 + Math.abs(speed) * 1.5);
        rig.position.y = -0.1 * S + Math.sin(t * 2.6) * 0.035 + (splashT > 0 ? Math.sin(splashT * 10) * 0.12 : 0);
        rig.rotation.x = -0.2;
        legs.forEach((l) => {
          const ph = gait + l.phase;
          l.hip.rotation.x = (l.front ? -0.9 : 0.1) + Math.sin(ph) * 0.7;
          l.knee.rotation.x = (l.front ? 0.9 : -0.6) + Math.max(0, Math.sin(ph + 1.3)) * 0.8 * (l.front ? 1 : -1);
        });
        tailLift = -0.4; wagAmp = 0.25;
        tongue.visible = false;
      } else {
        landTime += dt;
        if (landTime > 0.5 && landTime < 0.6 && wet > 0.6) api.shake();
        wet = Math.max(0, wet - dt * (shakeT > 0 ? 0.6 : 0.02));
        group.position.y = THREE.MathUtils.lerp(group.position.y, groundY + B.legH, 1 - Math.exp(-dt * 10));
        gait += dt * (3 + Math.abs(speed) * 2.6 / Math.max(S, 0.6));
        const move = Math.min(1, Math.abs(speed) * 2), swing = (0.25 + run * 0.55) * move;
        legs.forEach((l) => {
          const ph = gait + l.phase;
          l.hip.rotation.x = l.restU + Math.sin(ph) * swing;
          const lift = Math.max(0, Math.sin(ph + 1.2)) * (0.5 + run * 0.6) * move;
          l.knee.rotation.x = l.restK + (l.front ? lift : -lift);
        });
        rig.position.y = Math.abs(Math.sin(gait)) * 0.04 * run;
        rig.rotation.x = Math.sin(gait * 2) * 0.03 * run;
        wagSpeed = 8 + run * 6; wagAmp = 0.55; tailLift = 0.15;
        tongue.visible = true; tongue.scale.y = 1 + Math.sin(t * 9) * 0.25;
      }

      // tail wag travels down the chain
      tailRoot.rotation.x = wagBase + tailLift;
      tailRoot.rotation.y = Math.sin(t * wagSpeed) * wagAmp;
      tailSegs.forEach((s, i) => { if (i) s.rotation.y = Math.sin(t * wagSpeed - i * 0.7) * wagAmp * 0.35; });

      if (shakeT > 0) {
        const env = Math.sin(Math.min(shakeT / 1.1, 1) * Math.PI);
        rig.rotation.z = Math.sin(t * 42) * 0.45 * env;
        neck.rotation.z = Math.sin(t * 42 - 0.8) * 0.6 * env;
        tailRoot.rotation.z = Math.sin(t * 42 - 1.6) * 0.8 * env;
        if (wet > 0.05) emitDrops(Math.ceil(dt * 220 * env * wet), 3.5);
        shakeT -= dt;
      } else {
        rig.rotation.z = inWater ? Math.sin(t * 1.7) * 0.04 : 0;
        neck.rotation.z = 0; tailRoot.rotation.z = 0;
      }
      head.rotation.x = inWater ? 0.15 + Math.sin(t * 2.6 + 0.5) * 0.04 : 0.05 + Math.sin(gait * 2) * 0.04 * run;
      splashT = Math.max(0, splashT - dt);

      // ear springs
      const y = group.position.y + rig.position.y, vy = (y - prevY) / Math.max(dt, 1e-4), ay = (vy - prevVy) / Math.max(dt, 1e-4);
      prevY = y; prevVy = vy;
      const flop = B.ears === 'flop';
      ears.forEach((e) => {
        const force = -60 * e.ang - 6 * e.vel - THREE.MathUtils.clamp(ay, -60, 60) * 0.02 + rig.rotation.z * e.s * 8;
        e.vel += force * dt; e.ang = THREE.MathUtils.clamp(e.ang + e.vel * dt, -0.8, 0.8);
        e.pivot.rotation.z = e.s * e.ang * (flop ? 1.4 : 0.4);
        e.pivot.rotation.x = flop ? e.ang * 0.4 + (inWater ? -0.3 : 0) : 0;
      });

      furs.forEach((f) => f.userData.fur.setWet(wet));

      for (let i = 0; i < DROPS; i++) {
        if (dLife[i] <= 0) continue;
        dVel[i * 3 + 1] -= 9.8 * dt;
        dPos[i * 3] += dVel[i * 3] * dt; dPos[i * 3 + 1] += dVel[i * 3 + 1] * dt; dPos[i * 3 + 2] += dVel[i * 3 + 2] * dt;
        dLife[i] -= dt * 1.2;
        if (dLife[i] <= 0) dPos[i * 3 + 1] = -999;
      }
      dropGeo.attributes.position.needsUpdate = true;
    },
  };
  return api;
}
