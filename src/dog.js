// Sculpted dog: one smooth body + head (blended shapes), breed markings in the fur,
// two-segment legs, breed ears/tails, collar or harness. Gaits: swim, walk/trot/run, shake.
import * as THREE from 'three';
import { makeFur } from './fur.js';
import { sculpt, sdf, smoothUnion, smoothSubtract } from './sculpt.js';
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
  const tongueMat = new THREE.MeshStandardMaterial({ color: '#e46f7c', roughness: 0.3 });
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

  // ---- head: skull + upper muzzle + brows + cheeks + lips, eye sockets carved; separate opening jaw ----
  const neck = new THREE.Group(); neck.position.set(0, 0.4, 0.64); rig.add(neck);
  const head = new THREE.Group(); neck.add(head);
  const sn = B.snout, frenchie = key === 'frenchie';
  const skullR = frenchie ? v3(0.165, 0.15, 0.145) : v3(0.13 * W, 0.13, 0.15);
  const muzzleR = frenchie ? 0.095 : 0.072;
  const muzzleEnd = 0.06 + sn;
  const eyeX = (frenchie ? 0.085 : 0.065) * W, eyeY = frenchie ? 0.035 : 0.05, eyeZ = frenchie ? 0.115 : 0.105;
  const parts = [
    sdf.ellipsoid(v3(0, 0.04, -0.02), skullR),
    sdf.capsule(v3(0, -0.02, 0.05), v3(0, -0.035, muzzleEnd), muzzleR, muzzleR * 0.82),         // upper muzzle
    sdf.ellipsoid(v3(eyeX, eyeY + 0.03, eyeZ - 0.02), v3(0.035, 0.018, 0.03)),                // brows
    sdf.ellipsoid(v3(-eyeX, eyeY + 0.03, eyeZ - 0.02), v3(0.035, 0.018, 0.03)),
    sdf.ellipsoid(v3(0.075 * W, -0.03, 0.03), v3(0.065, 0.065, 0.075)),                         // cheeks
    sdf.ellipsoid(v3(-0.075 * W, -0.03, 0.03), v3(0.065, 0.065, 0.075)),
    sdf.ellipsoid(v3(0.045, -0.07, 0.04 + sn * 0.6), v3(0.03, 0.035, Math.max(0.05, sn * 0.5))),  // lips / flews
    sdf.ellipsoid(v3(-0.045, -0.07, 0.04 + sn * 0.6), v3(0.03, 0.035, Math.max(0.05, sn * 0.5))),
  ];
  if (frenchie) { // nose-roll and forehead wrinkles
    parts.push(sdf.capsule(v3(-0.06, 0.005, 0.15), v3(0.06, 0.005, 0.15), 0.022));
    parts.push(sdf.capsule(v3(-0.05, 0.11, 0.11), v3(0.05, 0.11, 0.11), 0.014));
    parts.push(sdf.capsule(v3(-0.04, 0.14, 0.09), v3(0.04, 0.14, 0.09), 0.012));
  }
  let headSdf = smoothUnion(parts, 0.04);
  headSdf = smoothSubtract(headSdf, sdf.sphere(v3(eyeX, eyeY, eyeZ + 0.015), 0.03), 0.02);
  headSdf = smoothSubtract(headSdf, sdf.sphere(v3(-eyeX, eyeY, eyeZ + 0.015), 0.03), 0.02);

  // fur is short on the muzzle and around the eyes, longer on skull and cheeks
  const faceLen = (p) => {
    const muzzle = THREE.MathUtils.smoothstep(p.z, 0.04, 0.1);
    const nearEye = Math.min(Math.hypot(Math.abs(p.x) - eyeX, p.y - eyeY, p.z - eyeZ), 0.1) / 0.1;
    return Math.max(0.15, (1 - 0.8 * muzzle) * (0.3 + 0.7 * nearEye));
  };
  const withLen = (geo, fn) => {
    const P = geo.attributes.position, a = new Float32Array(P.count), v = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) a[i] = fn(v.fromBufferAttribute(P, i));
    geo.setAttribute('aLen', new THREE.BufferAttribute(a, 1)); return geo;
  };
  const headFur = 0.75;
  furred(withLen(sculpt(headSdf, v3(0, 0, 0.08), 0.34, 40, (p) => tint('head', p)), faceLen), head, headFur);

  // nose: wide leather pad with nostrils
  const noseZ = muzzleEnd + muzzleR * 0.82 - 0.012;
  const nose = new THREE.Group(); nose.position.set(0, -0.02, noseZ); head.add(nose);
  const noseW = frenchie ? 0.05 : 0.034;
  plain(new THREE.SphereGeometry(1, 18, 12), dark, v3(0, 0, 0), nose).scale.set(noseW, noseW * 0.72, noseW * 0.7);
  const nostril = new THREE.MeshBasicMaterial({ color: '#050404' });
  for (const s of [-1, 1]) plain(new THREE.SphereGeometry(noseW * 0.28, 8, 6), nostril, v3(s * noseW * 0.42, -noseW * 0.2, noseW * 0.52), nose);

  // eyes: brown iris, pupil, catch-light; lids = vertical squash
  const eyes = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * eyeX, eyeY, eyeZ + 0.004); head.add(g);
    const r = frenchie ? 0.03 : 0.022;
    plain(new THREE.SphereGeometry(r, 16, 12), eyeMat, v3(0, 0, 0), g);
    plain(new THREE.SphereGeometry(r * 0.55, 12, 8), new THREE.MeshStandardMaterial({ color: '#050403', roughness: 0.05 }), v3(0, 0, r * 0.62), g);
    plain(new THREE.SphereGeometry(r * 0.18, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), v3(-s * r * 0.3, r * 0.35, r * 0.9), g);
    const lid = plain(new THREE.SphereGeometry(r * 1.12, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), skinMat, v3(0, 0, 0), g);
    lid.material = new THREE.MeshStandardMaterial({ color: tint('head', v3(s * eyeX, eyeY + 0.03, eyeZ)).multiplyScalar(0.8), roughness: 0.9 });
    return { g, lid };
  });

  // jaw hinges open for panting; mouth interior + tongue ride on it
  const jaw = new THREE.Group(); jaw.position.set(0, -0.065, 0.02); head.add(jaw);
  const jawSdf = smoothUnion([
    sdf.capsule(v3(0, -0.01, 0.0), v3(0, -0.012, sn * 0.85 + 0.03), frenchie ? 0.06 : 0.045, frenchie ? 0.055 : 0.04),
    sdf.ellipsoid(v3(0, -0.03, 0.0), v3(0.06, 0.04, 0.06)),
  ], 0.04);
  furred(withLen(sculpt(jawSdf, v3(0, -0.02, 0.07), 0.2, 28, (p) => tint('head', v3(p.x, p.y - 0.065, p.z + 0.04))), () => 0.35), jaw, headFur);
  const mouthMat = new THREE.MeshStandardMaterial({ color: '#5b2329', roughness: 0.5 });
  const mouth = plain(new THREE.SphereGeometry(1, 14, 10), mouthMat, v3(0, 0.02, sn * 0.45 + 0.02), jaw);
  mouth.scale.set(0.05, 0.022, Math.max(0.06, sn * 0.5));
  const tongue = new THREE.Group(); tongue.position.set(0, 0.012, sn * 0.5); jaw.add(tongue);
  const tg = new THREE.CapsuleGeometry(0.03, 0.11, 6, 10).rotateX(Math.PI / 2).translate(0, 0, 0.07);
  plain(tg, tongueMat, v3(0, 0, 0), tongue).scale.set(frenchie ? 1.7 : 1.4, 0.35, 1);

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
      for (const [z, r] of [[0.38, 0.24], [0.08, 0.22]]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 32), gm);
        band.scale.set(r * W * (0.6 + 0.4 * D) + off * 0.6, 0.29 * D + off * 0.6, 1); band.position.set(0, 0.03, z); band.rotation.x = z > 0.2 ? -0.35 : 0;
        rig.add(band);
      }
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2 * W, 0.04, 0.34), gm);
      plate.position.set(0, 0.29 * D + 0.03 + off * 0.6, 0.22); rig.add(plate);
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
  let prevY = 0, prevVy = 0, mode = 'swim', mouthOpen = 0, idle = 0, blinkT = 2;
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
        tongue.visible = false; mouthOpen = 0.04;
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
        tongue.visible = true;
        mouthOpen = 0.32 + run * 0.12 + Math.sin(t * 9) * 0.05; // panting
        idle = Math.abs(speed) < 0.2 ? idle + dt : 0;
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
      // jaw, tongue, blink, happy squint
      jaw.rotation.x = THREE.MathUtils.lerp(jaw.rotation.x, mouthOpen, 1 - Math.exp(-dt * 10));
      tongue.rotation.x = 0.35 + jaw.rotation.x * 0.8;
      tongue.scale.z = 1 + Math.sin(t * 9) * 0.08;
      blinkT -= dt; if (blinkT < -0.14) blinkT = 2.5 + Math.random() * 3;
      const bliss = !inWater && idle > 2.5 ? THREE.MathUtils.smoothstep(Math.sin(idle * 0.6), 0.2, 0.6) : 0; // eyes-closed contentment
      const shut = Math.max(blinkT < 0 ? 1 : 0, bliss, inWater ? 0 : 0.12, shakeT > 0 ? 0.9 : 0);
      eyes.forEach((e) => (e.lid.rotation.x = THREE.MathUtils.lerp(e.lid.rotation.x, -0.9 + shut * 1.85, 1 - Math.exp(-dt * 25))));
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
