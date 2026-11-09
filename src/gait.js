// Grounded land gait (step 8): paws plant on the ground and stay put while the body moves over them.
// Stride is driven by distance travelled (not time), so paws don't slide at any speed.
// Walk / trot / gallop footfall patterns blend by speed; each leg is solved with 2-bone IK
// (hip + knee, sagittal plane) to reach its planted or swinging paw. Body height and pitch follow
// the ground under the front and hind legs through critically damped springs.
// Idea borrowed from NVIDIA MotionBricks: target poses (footfalls) + spring smoothing, done procedurally.
// `?gait=old` turns it off for side-by-side comparison.
import * as THREE from 'three';

export const OLD_GAIT = typeof location !== 'undefined' && new URLSearchParams(location.search).get('gait') === 'old';
/** rolling cost of all gait solves per frame, in ms (shown in the F3 overlay) */
const gaitStats = { ms: 0, acc: 0 };
/** call once per frame from the HUD: smoothed ms spent in gait solves last frame */
export function gaitFrameMs() { gaitStats.ms += (gaitStats.acc - gaitStats.ms) * 0.05; gaitStats.acc = 0; return gaitStats.ms; }

// leg order matches dog.js: [left fore, right fore, left hind, right hind]
const PATTERNS = [
  { speed: 0.0, off: [0.25, 0.75, 0.0, 0.5], duty: 0.64 },  // walk: lateral 4-beat
  { speed: 2.4, off: [0.0, 0.5, 0.5, 0.0], duty: 0.46 },    // trot: diagonal pairs
  { speed: 5.2, off: [0.58, 0.68, 0.0, 0.1], duty: 0.34 },  // gallop: rotary, hinds then fores
];

const CROUCH = 0.13; // body sits this fraction of leg length lower so planted paws stay in reach
const frac = (x) => x - Math.floor(x);
const ease = (s) => s * s * (3 - 2 * s);

// critically damped spring toward target (no overshoot, no jitter)
function spring(st, target, dt, w = 12) {
  const x = st.x - target, a = w * w * x + 2 * w * st.v;
  st.v -= a * dt; st.x += st.v * dt;
  return st.x;
}

export function createGait({ legs, rig, group, B, S, segLen, pawR }) {
  const L1 = segLen, L2 = segLen + pawR;               // rig units (hip->knee, knee->sole)
  const reach = (L1 + L2) * 0.97;                       // keep a little bend in the leg
  const span = Math.abs(legs[0].hip.position.z - legs[2].hip.position.z) * S; // fore-hind distance (world)
  const state = legs.map(() => ({ planted: null, swing: null, p: 0 }));
  const lastPos = new THREE.Vector3(), tmp = new THREE.Vector3(), hipW = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  let phase = 0, init = false, lastYaw = 0, weight = 0;
  const pitch = { x: 0, v: 0 }, lift = { x: 0, v: 0 }, bank = { x: 0, v: 0 };

  function hipGround(i, ground) {
    rig.localToWorld(hipW.copy(legs[i].hip.position));
    hipW.y = ground(hipW.x, hipW.z);
    return hipW;
  }

  function solve(l, foot, w) {
    // foot (world) -> rig local -> relative to hip, sagittal plane only
    rig.worldToLocal(tmp.copy(foot));
    const dz = tmp.z - l.hip.position.z, dy = tmp.y - l.hip.position.y;
    const d = THREE.MathUtils.clamp(Math.hypot(dy, dz), Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
    const phi = Math.atan2(-dz, -dy);
    const alpha = Math.acos(THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const beta = Math.PI - Math.acos(THREE.MathUtils.clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    // fore legs bend at the elbow one way, hind legs at the hock the other (matches dog.js rest pose)
    const t1 = l.front ? phi - alpha : phi + alpha, t2 = l.front ? beta : -beta;
    l.hip.rotation.x = THREE.MathUtils.lerp(l.hip.rotation.x, t1, w);
    l.knee.rotation.x = THREE.MathUtils.lerp(l.knee.rotation.x, t2, w);
  }

  const api = {
    bank: 0,
    /** call after dog.js has set the old sine pose; blends IK over it by `want` (0..1) */
    update(dt, speed, ground, want, posing) {
      const t0 = performance.now();
      weight = THREE.MathUtils.lerp(weight, OLD_GAIT ? 0 : want, 1 - Math.exp(-dt * 5));
      const pos = group.position, yaw = group.rotation.y;
      if (!init) { lastPos.copy(pos); lastYaw = yaw; init = true; }
      const moved = Math.hypot(pos.x - lastPos.x, pos.z - lastPos.z);
      const yawRate = THREE.MathUtils.euclideanModulo(yaw - lastYaw + Math.PI, Math.PI * 2) - Math.PI;
      lastPos.copy(pos); lastYaw = yaw;

      if (weight < 0.01) { state.forEach((s) => { s.planted = null; s.swing = null; }); api.bank = 0; record(t0); return; }

      // body: crouch slightly so legs never lock straight; pitch + height from fore/hind ground
      group.updateMatrixWorld();
      fwd.set(Math.sin(yaw), 0, Math.cos(yaw));
      const fx = pos.x + fwd.x * span * 0.5, fz = pos.z + fwd.z * span * 0.5;
      const hx = pos.x - fwd.x * span * 0.5, hz = pos.z - fwd.z * span * 0.5;
      const gF = ground(fx, fz), gH = ground(hx, hz), gC = ground(pos.x, pos.z);
      const targetPitch = THREE.MathUtils.clamp(-Math.atan2(gF - gH, span), -0.5, 0.5);
      rig.rotation.x += spring(pitch, targetPitch, dt, 10) * weight;
      rig.position.y += (spring(lift, (gF + gH) / 2 - gC, dt, 14) - (L1 + L2) * S * CROUCH) * weight;
      const v = Math.abs(speed);
      api.bank = spring(bank, THREE.MathUtils.clamp(-yawRate / Math.max(dt, 1e-4) * v * 0.012, -0.12, 0.12), dt, 8) * weight;
      rig.updateMatrixWorld(true);

      // pattern blend by speed (circular average of footfall offsets)
      let wsum = 0, duty = 0; const ox = [0, 0, 0, 0], oy = [0, 0, 0, 0];
      PATTERNS.forEach((pt, k) => {
        const next = PATTERNS[k + 1], prev = PATTERNS[k - 1];
        let w = 1;
        if (next && v > pt.speed) w = THREE.MathUtils.clamp(1 - (v - pt.speed) / (next.speed - pt.speed), 0, 1);
        if (prev && v < pt.speed) w = THREE.MathUtils.clamp(1 - (pt.speed - v) / (pt.speed - prev.speed), 0, 1);
        if (w <= 0) return;
        wsum += w; duty += pt.duty * w;
        pt.off.forEach((o, i) => { ox[i] += Math.cos(o * Math.PI * 2) * w; oy[i] += Math.sin(o * Math.PI * 2) * w; });
      });
      duty /= wsum;
      const run = Math.min(v / 5, 1);
      const stride = B.legH * (1.1 + 1.5 * run);           // world metres per full cycle
      const cycleT = v > 0.05 ? stride / v : 1;
      const moving = v > 0.15 && moved > 1e-4;
      if (moving) phase += moved / stride;
      const stepH = B.legH * (0.18 + 0.12 * run);
      let swinging = state.filter((s) => s.swing).length;

      legs.forEach((l, i) => {
        const s = state[i];
        const home = hipGround(i, ground);
        if (!s.planted) s.planted = home.clone();
        const p = frac(phase + frac(Math.atan2(oy[i], ox[i]) / (Math.PI * 2)));
        // start a swing when the leg's phase crosses out of stance, or (standing) when the paw has drifted
        const crossed = moving && s.p < duty && p >= duty;
        const drift = Math.hypot(s.planted.x - home.x, s.planted.z - home.z);
        const fidget = !moving && !posing && drift > B.legH * 0.28 && swinging === 0;
        if (!s.swing && (crossed || fidget)) {
          s.swing = { from: s.planted.clone(), t: 0, dur: moving ? THREE.MathUtils.clamp((1 - duty) * cycleT, 0.1, 0.45) : 0.2 };
          swinging++;
        }
        s.p = p;
        let foot = s.planted;
        if (s.swing) {
          const sw = s.swing;
          sw.t = Math.min(1, sw.t + dt / sw.dur);
          // land ahead of the hip by half a stance so the paw passes under the hip mid-stance
          const lead = moving ? stride * duty * 0.5 * Math.sign(speed || 1) : 0;
          const tx = home.x + fwd.x * lead, tz = home.z + fwd.z * lead;
          const e = ease(sw.t);
          foot = tmp.set(THREE.MathUtils.lerp(sw.from.x, tx, e), 0, THREE.MathUtils.lerp(sw.from.z, tz, e));
          foot.y = THREE.MathUtils.lerp(sw.from.y, ground(tx, tz), e) + Math.sin(sw.t * Math.PI) * stepH;
          if (sw.t >= 1) { s.planted.set(tx, ground(tx, tz), tz); s.swing = null; swinging--; }
          foot = foot.clone();
        }
        // a paw left too far behind (sharp turn, teleport) gets picked up next frame
        if (!s.swing && Math.hypot(s.planted.x - home.x, s.planted.z - home.z) > stride * 1.2) s.planted.copy(home);
        // keep the solve inside reach: pull the target toward the hip if it is out of range
        rig.worldToLocal(tmp.copy(foot));
        const dz = tmp.z - l.hip.position.z, dy = tmp.y - l.hip.position.y, d = Math.hypot(dz, dy);
        if (d > reach) { tmp.z = l.hip.position.z + dz * reach / d; tmp.y = l.hip.position.y + dy * reach / d; rig.localToWorld(tmp); foot = tmp.clone(); }
        solve(l, foot, weight);
      });
      record(t0);
    },
    reset() { state.forEach((s) => { s.planted = null; s.swing = null; }); init = false; },
  };
  return api;
}

function record(t0) { gaitStats.acc += performance.now() - t0; }
