// Procedural dog with shell fur, wet fur, ear springs and four gaits:
// swim (paddle), walk/trot/run on land, and shake-off with water droplets.
import * as THREE from 'three';
import { makeFur } from './fur.js';

const LEG = 0.55; // hip-to-paw length

export function createDog({ coat = '#1c1d22', belly = '#f2efe8', curly = false, furLen = curly ? 0.1 : 0.07 } = {}) {
  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);
  const furs = [];
  const skin = (c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(0.72), roughness: 0.9 });
  const coatSkin = skin(coat), bellySkin = skin(belly);
  const dark = new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: 0.35 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#5a3415', roughness: 0.1 });
  const tongueMat = new THREE.MeshStandardMaterial({ color: '#e0707a', roughness: 0.4 });

  // a body part = dark skin mesh + fur shells around it
  function part(geo, color, skinMat, pos, rot, parent = rig, furOpts = {}) {
    const holder = new THREE.Group();
    holder.position.set(...pos); if (rot) holder.rotation.set(...rot);
    const m = new THREE.Mesh(geo, skinMat); m.castShadow = true; holder.add(m);
    const f = makeFur(geo, { color, length: furLen, curl: curly ? 0.6 : 0, ...furOpts });
    holder.add(f); furs.push(f);
    parent.add(holder);
    return holder;
  }
  const plain = (geo, mat, pos, rot, parent) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); if (rot) m.rotation.set(...rot);
    m.castShadow = true; parent.add(m); return m;
  };

  // torso
  part(new THREE.CapsuleGeometry(0.4, 1.0, 6, 14), coat, coatSkin, [0, 0, -0.15], [Math.PI / 2, 0, 0]);
  part(new THREE.CapsuleGeometry(0.3, 0.85, 6, 12), belly, bellySkin, [0, -0.14, -0.1], [Math.PI / 2, 0, 0], rig, { length: furLen * 1.2 });

  // chest bib (husky / aussie white front)
  if (belly !== coat) part(new THREE.SphereGeometry(0.3, 14, 12), belly, bellySkin, [0, 0.02, 0.42], null, rig, { length: furLen * 1.3 }).scale.set(0.9, 1.0, 0.7);

  // head
  const neck = new THREE.Group(); neck.position.set(0, 0.25, 0.55); rig.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.2, 0.15); neck.add(head);
  part(new THREE.SphereGeometry(0.3, 18, 14), coat, coatSkin, [0, 0, 0], null, head, { length: furLen * 0.8 });
  part(new THREE.CapsuleGeometry(0.13, 0.22, 6, 10), belly === coat ? coat : belly, belly === coat ? coatSkin : bellySkin,
    [0, -0.08, 0.28], [Math.PI / 2, 0, 0], head, { length: furLen * 0.4 });
  plain(new THREE.SphereGeometry(0.065, 10, 8), dark, [0, -0.03, 0.47], null, head);
  const tongue = plain(new THREE.CapsuleGeometry(0.05, 0.12, 4, 8), tongueMat, [0, -0.19, 0.36], [1.2, 0, 0], head);
  const ears = [-1, 1].map((s) => {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.17, curly ? 0.05 : 0.22, -0.02); head.add(pivot);
    if (curly) part(new THREE.SphereGeometry(0.13, 12, 10), coat, coatSkin, [s * 0.08, -0.15, 0], [0, 0, s * 0.3], pivot).scale.set(0.6, 1.4, 0.8);
    else part(new THREE.ConeGeometry(0.11, 0.26, 6), coat, coatSkin, [0, 0.12, 0], [0, 0, -s * 0.15], pivot, { length: furLen * 0.4 });
    plain(new THREE.SphereGeometry(0.04, 10, 8), eyeMat, [s * 0.12, 0.07, 0.25], null, head);
    return { pivot, s, ang: 0, vel: 0 };
  });

  // tail
  const tail = new THREE.Group(); tail.position.set(0, 0.15, -0.85); rig.add(tail);
  part(new THREE.CapsuleGeometry(0.08, 0.55, 4, 8), coat, coatSkin, [0, 0.2, -0.22], [-0.8, 0, 0], tail, { length: furLen * 2.2, droop: 0.5 });

  // legs: pivot at hip/shoulder, swing about x
  const legs = [[-1, 0.42], [1, 0.42], [-1, -0.62], [1, -0.62]].map(([s, z], i) => {
    const hip = new THREE.Group(); hip.position.set(s * 0.22, -0.18, z); rig.add(hip);
    part(new THREE.CapsuleGeometry(0.085, LEG - 0.17, 4, 8), i < 2 ? (belly !== coat ? belly : coat) : coat,
      i < 2 && belly !== coat ? bellySkin : coatSkin, [0, -LEG / 2, 0], null, hip, { length: furLen * 0.6 });
    return { hip, phase: i === 0 ? 0 : i === 1 ? Math.PI : i === 2 ? Math.PI * 0.5 : Math.PI * 1.5 };
  });

  // droplets for shaking / climbing out
  const DROPS = 160;
  const dropGeo = new THREE.BufferGeometry();
  const dPos = new Float32Array(DROPS * 3).fill(-999), dVel = new Float32Array(DROPS * 3), dLife = new Float32Array(DROPS);
  dropGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const drops = new THREE.Points(dropGeo, new THREE.PointsMaterial({ color: '#e8f6ff', size: 0.07, transparent: true, opacity: 0.85, depthWrite: false }));
  drops.frustumCulled = false;
  let dropIdx = 0;
  function emitDrops(count, spread) {
    const wp = new THREE.Vector3(); rig.getWorldPosition(wp);
    for (let k = 0; k < count; k++) {
      const i = dropIdx++ % DROPS, a = Math.random() * Math.PI * 2;
      dPos[i * 3] = wp.x + Math.cos(a) * 0.4; dPos[i * 3 + 1] = wp.y + 0.1 + Math.random() * 0.3; dPos[i * 3 + 2] = wp.z + Math.sin(a) * 0.4;
      dVel[i * 3] = Math.cos(a) * spread * (0.5 + Math.random()); dVel[i * 3 + 1] = 1 + Math.random() * 2.5; dVel[i * 3 + 2] = Math.sin(a) * spread * (0.5 + Math.random());
      dLife[i] = 1;
    }
  }

  let t = Math.random() * 10, gait = 0, splashT = 0, shakeT = 0, wet = 0, landTime = 0;
  let prevY = 0, prevVy = 0, mode = 'swim';

  const api = {
    group, drops,
    get wet() { return wet; },
    get mode() { return mode; },
    splash() { splashT = 0.6; },
    shake() { if (shakeT <= 0) shakeT = 1.1; },
    setFurDetail(k) { furs.forEach((f) => f.userData.fur.setShells(k)); },
    /** speed: m/s along heading; inWater: bool; groundY: ground height under dog */
    update(dt, speed, inWater = true, groundY = -1.4) {
      t += dt;
      const run = Math.min(Math.abs(speed) / 5, 1);
      mode = inWater ? 'swim' : 'land';

      if (inWater) {
        wet = Math.min(1, wet + dt * 2);
        landTime = 0;
        // float with body at the waterline
        group.position.y = THREE.MathUtils.lerp(group.position.y, 0, 1 - Math.exp(-dt * 6));
        gait += dt * (4 + Math.abs(speed) * 1.5);
        rig.position.y = Math.sin(t * 2.6) * 0.04 + (splashT > 0 ? Math.sin(splashT * 10) * 0.12 : 0) - 0.12;
        rig.rotation.x = -0.18; // nose up
        legs.forEach((l, i) => (l.hip.rotation.x = (i < 2 ? 0.9 : 0.5) + Math.sin(gait + l.phase) * 0.7));
        tail.rotation.set(-0.3, Math.sin(t * 2) * 0.3, 0);
        tongue.visible = false;
      } else {
        landTime += dt;
        // auto shake right after climbing out
        if (landTime > 0.5 && landTime < 0.6 && wet > 0.6) api.shake();
        wet = Math.max(0, wet - dt * (shakeT > 0 ? 0.6 : 0.02));
        group.position.y = THREE.MathUtils.lerp(group.position.y, groundY + LEG + 0.15, 1 - Math.exp(-dt * 10));
        gait += dt * (3 + Math.abs(speed) * 2.4);
        const swing = 0.15 + run * 0.65;
        legs.forEach((l) => (l.hip.rotation.x = Math.sin(gait + l.phase) * swing * Math.min(1, Math.abs(speed) * 2)));
        rig.position.y = Math.abs(Math.sin(gait)) * 0.05 * run;
        rig.rotation.x = Math.sin(gait * 2) * 0.03 * run;
        tail.rotation.set(0.5, Math.sin(t * (8 + run * 6)) * 0.55, 0);
        tongue.visible = true; tongue.scale.y = 1 + Math.sin(t * 9) * 0.25;
      }

      // shake-off: fast roll that travels head -> body -> tail
      if (shakeT > 0) {
        const env = Math.sin(Math.min(shakeT / 1.1, 1) * Math.PI);
        rig.rotation.z = Math.sin(t * 42) * 0.45 * env;
        neck.rotation.z = Math.sin(t * 42 - 0.8) * 0.6 * env;
        tail.rotation.z = Math.sin(t * 42 - 1.6) * 0.8 * env;
        if (wet > 0.05) emitDrops(Math.ceil(dt * 220 * env * wet), 3.5);
        shakeT -= dt;
      } else {
        rig.rotation.z = Math.sin(t * 1.7) * (inWater ? 0.04 : 0.0);
        neck.rotation.z = 0; tail.rotation.z = 0;
      }
      if (inWater) head.rotation.x = -0.05 + Math.sin(t * 2.6 + 0.5) * 0.04;
      else head.rotation.x = 0.1 + Math.sin(gait * 2) * 0.04 * run;
      splashT = Math.max(0, splashT - dt);

      // ear springs driven by vertical acceleration + shake
      const y = group.position.y + rig.position.y, vy = (y - prevY) / Math.max(dt, 1e-4), ay = (vy - prevVy) / Math.max(dt, 1e-4);
      prevY = y; prevVy = vy;
      ears.forEach((e) => {
        const force = -60 * e.ang - 6 * e.vel - THREE.MathUtils.clamp(ay, -60, 60) * 0.02 + rig.rotation.z * e.s * 8;
        e.vel += force * dt; e.ang += e.vel * dt;
        e.ang = THREE.MathUtils.clamp(e.ang, -0.8, 0.8);
        e.pivot.rotation.z = e.s * e.ang * (curly ? 1.5 : 0.6);
        e.pivot.rotation.x = curly ? e.ang * 0.5 : 0;
      });

      furs.forEach((f) => f.userData.fur.setWet(wet));

      // droplets
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
