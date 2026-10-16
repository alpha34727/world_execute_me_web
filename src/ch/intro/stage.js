// The intro's stage, shared with inst1 (the camera continues on it): the world floor with its horizon, beat ripples,
// rings and axes; the things built in the intro standing on it; the atmosphere of embers and stars.
import { COLOR } from '../../theme.js';
import { clamp, smoothstep, easeOutCubic } from '../../lib/ease.js';
import { randn } from '../../lib/hash.js';
import { add3 } from '../../lib/camera.js';
import { embers, shockwave } from '../../lib/fx.js';
import { geodesic } from './geodesic.js';

export const CUBE = [[[-1, -1, -1], [1, -1, -1]], [[1, -1, -1], [1, -1, 1]], [[1, -1, 1], [-1, -1, 1]], [[-1, -1, 1], [-1, -1, -1]],
  [[-1, -1, -1], [-1, 1, -1]], [[1, -1, -1], [1, 1, -1]], [[1, -1, 1], [1, 1, 1]], [[-1, -1, 1], [-1, 1, 1]],
  [[-1, 1, -1], [1, 1, -1]], [[1, 1, -1], [1, 1, 1]], [[1, 1, 1], [-1, 1, 1]], [[-1, 1, 1], [-1, 1, -1]]];

// the atmosphere of the world: warm embers around me with bokeh, and a sky of faint stars above the floor
export function atmosphere(ctx, focus, { alpha = 1, time = ctx.t * 0.5 } = {}) {
  embers(ctx, { center: [0, 0.3, 0], radius: [1.2, 9], squash: 0.45, n: 3200, focus, aperture: 5, size: 3.6, alpha: 0.95 * alpha, time, color: COLOR.me, color2: COLOR.warm, seed: 72 });
  embers(ctx, { center: [0, Y0 + 0.5, -10], radius: [30, 55], squash: 0.45, upper: true, n: 1600, focus: 0, size: 2.4, alpha: 0.8 * alpha, drift: 0.05, time, color: COLOR.ink2, seed: 73 });
}

// ---- intro.08: He-initialised 16×16 weight matrix --------------------------------------------------------------
export const NW = 16, SIGMA = Math.sqrt(2 / NW);
export const weight = (i, j) => randn(i, j, 808) * SIGMA;

// ---- intro.09–11: the world: a floor unrolling to the horizon, the things built so far, axes around me ----------
export const Y0 = -1.2;
export function world(ctx, cam, { reveal = 1, half = 20, alpha = 1, axes = 1, props = 1, labels = false, links = 0, spark: sp = [0, 0.3, 0] }) {
  const zr = half - reveal * 2 * half; // floor lines exist for z in [zr, half]
  for (let v = -half; v <= half + 1e-6; v += 1) {
    const major = Math.abs(v % 4) < 1e-6;
    const o = { color: major ? COLOR.dim : COLOR.faint, alpha: alpha * (major ? 0.5 : 0.6), width: major ? 1.5 : 1.15, persp: 6, fog: [8, 34] };
    if (v >= zr) ctx.line([[-half, Y0, v], [half, Y0, v]], o);
    if (zr < half) ctx.line([[v, Y0, Math.max(zr, -half)], [v, Y0, half]], o);
  }
  // the horizon: where the floor plane vanishes
  if (reveal > 0.6) {
    const hy = ctx.project([0, Y0, -2000])[1];
    const ha = alpha * smoothstep(0.6, 1, reveal);
    ctx.camera2D();
    ctx.line([[960, hy], [0, hy]], { color: COLOR.dim, color2: [0, 0, 0], width: 1.2, alpha: ha * 0.5 });
    ctx.line([[960, hy], [1920, hy]], { color: COLOR.dim, color2: [0, 0, 0], width: 1.2, alpha: ha * 0.5 });
    for (let i = 1; i <= 6; i++) ctx.line([[0, hy - i * 3], [1920, hy - i * 3]], { color: COLOR.faint, width: 3, alpha: ha * 0.08 * (7 - i) / 6 });
    ctx.camera3D(cam);
  }
  // on every beat a ripple runs out across the floor from under me
  if (reveal >= 1) {
    const bt = ctx.T.beatAt(ctx.t), f = bt - Math.floor(bt);
    for (const [lag, w] of [[0, 1], [1, 0.45]]) {
      const q = f + lag;
      shockwave(ctx, { center: [0, Y0 + 0.01, 0], r: 0.6 + 4.2 * easeOutCubic(q / 2), alpha: alpha * w * 0.55 * (1 - q / 2), width: 2.4, ref: 9 });
    }
  }
  // rings on the floor under the spark
  for (let r = 1; r <= 3; r++) {
    if (zr > r) continue;
    const pts = Array.from({ length: 97 }, (_, i) => { const a = (i / 96) * Math.PI * 2; return [Math.cos(a) * r, Y0, Math.sin(a) * r]; });
    ctx.line(pts, { color: COLOR.dim, alpha: alpha * 0.4, width: 1.3, persp: 6, fog: [8, 24] });
  }
  // what has been built so far stands on the floor: the shell, the object box, the weights
  if (props > 0) {
    const pa = alpha * props;
    if (links > 0) for (const c of [[-3.4, Y0 + 0.55, -1.8], [3.2, Y0 + 0.45, -1.2], [-0.13, Y0 + 0.3, -4.43]]) ctx.line([sp, c], { color: COLOR.me, width: 1.6, alpha: links, persp: 6, glow: 8 * links, dash: 10, gap: 6 });
    if (zr < -1.8) {
      const g = ctx.memo('geo1', () => geodesic(1, 0.55));
      for (const [p, q] of g.edges) ctx.line([add3(g.verts[p], [-3.4, Y0 + 0.55, -1.8]), add3(g.verts[q], [-3.4, Y0 + 0.55, -1.8])], { color: COLOR.ink2, width: 1.1, alpha: pa * 0.6, persp: 6, fog: [8, 22] });
    }
    if (zr < -1.2) {
      const c = [3.2, Y0 + 0.45, -1.2];
      for (const [a, b] of CUBE) ctx.line([add3(c, a.map((v) => v * 0.45)), add3(c, b.map((v) => v * 0.45))], { color: COLOR.me, width: 1.4, alpha: pa * 0.75, persp: 6, fog: [8, 22] });
    }
    if (zr < -4) {
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
        const v = weight(i, j);
        const x = -0.9 + i * 0.22, z = -5.2 + j * 0.22;
        ctx.line([[x, Y0, z], [x, Y0 + 0.4 + v * 0.7, z]], { color: v >= 0 ? COLOR.me : COLOR.warm, width: 3, alpha: pa * 0.7, persp: 6, fog: [8, 22] });
      }
    }
  }
  if (axes <= 0) return;
  // world axes through the spark (short, so they never cross the headline)
  const ext = { x: [-2.5, 2.5], y: [Y0, 1.0], z: [-2.5, 2.5] };
  for (const [d, label] of [[[1, 0, 0], 'x'], [[0, 1, 0], 'y'], [[0, 0, 1], 'z']]) {
    const [lo, hi] = ext[label].map((v) => v * axes);
    ctx.line([d.map((c) => c * lo), d.map((c) => c * hi)], { color: COLOR.ink2, alpha: alpha * 0.5, width: 1.2, persp: 6, fog: [8, 22] });
    for (let k = Math.ceil(lo); k <= Math.floor(hi); k++) if (k) {
      const p = d.map((c) => c * k), q = d[1] ? [0.08, k, 0] : [p[0], 0.08, p[2]];
      ctx.line([p, q], { color: COLOR.ink2, alpha: alpha * 0.5, width: 1.2, persp: 6, fog: [8, 22] });
    }
    if (labels) ctx.text3D(label, d.map((c) => c * (hi + 0.25)), { font: 'mono', size: 20, color: COLOR.dim, alpha: alpha * axes, ref: 7, fog: [8, 22] });
  }
}
