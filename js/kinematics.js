// Kinematics: smoothing, 3D joint angles, range of motion, angular velocity,
// and short-horizon extrapolation.
//
// Angles use the models' WORLD landmarks (metres, 3D, depth estimated from a
// single camera). They are unvalidated estimates: no comparison against a
// goniometer or motion capture has been run for this build (see gate V1 in
// docs/ANATOMY_LAB_PLAN.md).

// One Euro filter (Casiez, Roussel & Vogel, CHI 2012): adaptive low-pass that
// cuts jitter at rest and lag during fast motion.
export class OneEuro {
  constructor(minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff;
    this.x = null; this.dx = 0; this.t = null;
  }
  static alpha(cutoff, dt) { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); }
  filter(value, tSec) {
    if (this.t === null || !Number.isFinite(this.x)) { this.x = value; this.t = tSec; this.dx = 0; return value; }
    const dt = Math.max(1e-3, tSec - this.t); this.t = tSec;
    const rawDx = (value - this.x) / dt;
    this.dx += OneEuro.alpha(this.dCutoff, dt) * (rawDx - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += OneEuro.alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }
  reset() { this.x = null; this.t = null; this.dx = 0; }
}

// Smooths a whole landmark list (x, y, z per point) and exposes velocity.
export class LandmarkSmoother {
  constructor(n, minCutoff = 1.5, beta = 8.0) {
    this.f = Array.from({ length: n }, () => [new OneEuro(minCutoff, beta), new OneEuro(minCutoff, beta), new OneEuro(minCutoff, beta)]);
    this.lastSeen = -1;
  }
  apply(points, tSec) {
    if (this.lastSeen >= 0 && tSec - this.lastSeen > 0.5) this.f.forEach((a) => a.forEach((g) => g.reset()));
    this.lastSeen = tSec;
    this.last = points.map((p, i) => ({
      x: this.f[i][0].filter(p.x, tSec), y: this.f[i][1].filter(p.y, tSec), z: this.f[i][2].filter(p.z ?? 0, tSec),
      vx: this.f[i][0].dx, vy: this.f[i][1].dx, visibility: p.visibility,
    }));
    return this.last;
  }
  // display-only frames between two detections: the last smoothed points moved on by their filtered velocity,
  // at most `maxH` seconds ahead (constant-velocity guess; never fed back into the filters or the angles)
  predict(tSec, maxH = 0.08) {
    if (!this.last) return null;
    const h = Math.max(0, Math.min(maxH, tSec - this.lastSeen));
    return this.last.map((p) => ({ ...p, x: p.x + p.vx * h, y: p.y + p.vy * h }));
  }
}

// Linear extrapolation of smoothed points `horizon` seconds ahead. This is a
// constant-velocity guess, not a learned or validated motion prediction.
export function extrapolate(points, horizon) {
  return points.map((p) => ({ ...p, x: p.x + p.vx * horizon, y: p.y + p.vy * horizon }));
}

const sub = (a, b) => [a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => Math.hypot(a[0], a[1], a[2]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const n = norm(a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };

export function angleDeg(a, b, c) {
  const u = sub(a, b), v = sub(c, b); const nu = norm(u), nv = norm(v);
  if (!nu || !nv) return NaN;
  return (Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (nu * nv)))) * 180) / Math.PI;
}

// Flexion of a hinge joint: 0 = straight, grows as the joint bends.
export const hingeFlexion = (p, j, n) => 180 - angleDeg(p, j, n);

// One trunk frame for both sides (built on the world landmarks; MediaPipe world axes: x right, y DOWN, z toward
// the camera negative). up = mid-hip -> mid-shoulder; right = left shoulder -> right shoulder, made perpendicular to
// up; fwd = up x right (pointing out of the chest). Using one frame for both sides removes the left/right handedness
// flip of the earlier per-side frame, so mirror-image movements give the same numbers.
export function trunkFrame(w) {
  const ls = w[11], rs = w[12], lh = w[23], rh = w[24];
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });
  const mS = mid(ls, rs), mH = mid(lh, rh);
  const up = unit(sub(mS, mH));
  const r0 = sub(rs, ls);
  const right = unit([r0[0] - dot(r0, up) * up[0], r0[1] - dot(r0, up) * up[1], r0[2] - dot(r0, up) * up[2]]);
  let fwd = unit(cross(up, right));
  // the chest faces the camera when the trunk is not turned away: world z of a point in front of the chest is
  // more negative; flip if the cross product points backwards (keeps "forward" anatomical for any handedness)
  const nose = w[0];
  if (nose && dot(sub(nose, mS), fwd) < 0) fwd = [-fwd[0], -fwd[1], -fwd[2]];
  return { mS, mH, up, right, fwd };
}

// Set-up check: how much the trunk is turned (yaw) and leaning (roll) relative to the camera. Depth from one camera
// is the least certain axis, so a turned trunk makes the far side read differently from the near side.
export function trunkPose(w) {
  const F = trunkFrame(w);
  let yaw = (Math.atan2(F.right[2], F.right[0]) * 180) / Math.PI; // shoulder line vs the image x axis
  if (yaw > 90) yaw -= 180; else if (yaw < -90) yaw += 180; // 0 = shoulders square to the camera, either handedness
  const roll = (Math.atan2(F.up[0], -F.up[1]) * 180) / Math.PI; // 0 = trunk upright (y is down)
  return { yaw, roll };
}

// Elevation of a limb segment from the trunk and the PLANE it is raised in, both sides on the same conventions:
//   elevation  angle between the segment and "down the trunk" (0 = hanging by the side)
//   planeDeg   direction of elevation around the trunk axis, measured from the frontal plane:
//              0 = abduction (frontal plane), ~30-45 = scaption (scapular plane), 90 = flexion (sagittal plane),
//              negative = behind the frontal plane (extension side), beyond 90 = crossing the body
// The lateral axis is mirrored for the left side, so "outward" is positive on both sides.
export function segmentAngles(w, side, proximal, distal) {
  const F = trunkFrame(w);
  const out = side === 'l' ? [-F.right[0], -F.right[1], -F.right[2]] : F.right;
  const down = [-F.up[0], -F.up[1], -F.up[2]];
  const seg = unit(sub(w[distal], w[proximal]));
  const elevation = (Math.acos(Math.max(-1, Math.min(1, dot(seg, down)))) * 180) / Math.PI;
  const f = dot(seg, F.fwd), l = dot(seg, out);
  const planeDeg = (Math.atan2(f, l) * 180) / Math.PI;
  return { elevation, planeDeg, sagittal: (Math.atan2(f, dot(seg, down)) * 180) / Math.PI, frontal: (Math.atan2(l, dot(seg, down)) * 180) / Math.PI };
}
export function planeName(planeDeg, elevation) {
  if (elevation < 15) return 'neutral';
  if (planeDeg < -20) return 'extension';
  if (planeDeg < 20) return 'abduction';
  if (planeDeg < 60) return 'scaption';
  if (planeDeg <= 120) return 'flexion';
  return 'horizontal adduction';
}
export function shoulderAngles(w, side) {
  const a = segmentAngles(w, side, side === 'l' ? 11 : 12, side === 'l' ? 13 : 14);
  return { ...a, plane: planeName(a.planeDeg, a.elevation) };
}
export function hipAngles(w, side) {
  const a = segmentAngles(w, side, side === 'l' ? 23 : 24, side === 'l' ? 25 : 26);
  return { ...a, plane: planeName(a.planeDeg, a.elevation) };
}

// Per-joint live state: smoothed angle, angular velocity, session ROM, history.
export class JointTrack {
  constructor(id, label, zone) {
    this.id = id; this.label = label; this.zone = zone;
    this.f = new OneEuro(0.5, 0.04, 1.0); // lower cutoff at rest (steadier holds), speed term keeps fast moves responsive
    this.angle = NaN; this.vel = 0; this.min = Infinity; this.max = -Infinity;
    this.hist = []; this.extra = ''; this.raw5 = []; this.sd = NaN; this.planeDeg = NaN;
    this.lastT = -1;
  }
  update(raw, tSec, extra = '', planeDeg = NaN) {
    if (!Number.isFinite(raw)) return;
    if (this.lastT >= 0 && tSec - this.lastT > 0.5) { this.f.reset(); this.raw5 = []; }
    this.lastT = tSec;
    // median of the last 5 detections removes single-frame landmark jumps before the adaptive filter
    this.raw5.push(raw); if (this.raw5.length > 5) this.raw5.shift();
    const med = [...this.raw5].sort((a, b) => a - b)[this.raw5.length >> 1];
    this.angle = this.f.filter(med, tSec); this.vel = this.f.dx; this.extra = extra;
    if (Number.isFinite(planeDeg)) this.planeDeg = Number.isFinite(this.planeDeg) ? this.planeDeg + 0.3 * (planeDeg - this.planeDeg) : planeDeg;
    this.min = Math.min(this.min, this.angle); this.max = Math.max(this.max, this.angle);
    this.hist.push([tSec, this.angle]);
    while (this.hist.length && tSec - this.hist[0][0] > 10) this.hist.shift();
    const last1 = this.hist.filter((h) => tSec - h[0] <= 1).map((h) => h[1]);
    const m = last1.reduce((a, b) => a + b, 0) / (last1.length || 1);
    this.sd = last1.length > 4 ? Math.sqrt(last1.reduce((a, b) => a + (b - m) ** 2, 0) / last1.length) : NaN; // stability over the last second
  }
  fresh(tSec) { return this.lastT >= 0 && tSec - this.lastT < 0.5; }
  resetRom() { this.min = Infinity; this.max = -Infinity; }
}

// Movement phase from angular velocity (deg/s). Threshold keeps jitter quiet.
export function phaseOf(vel, threshold = 35) {
  if (vel > threshold) return 'flexing';
  if (vel < -threshold) return 'extending';
  return 'holding';
}
