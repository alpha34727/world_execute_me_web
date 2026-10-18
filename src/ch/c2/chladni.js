// Chladni figures on a square plate (side 2S), in the classic approximation of its standing waves
//   f(u, v) = cos(nπu)·cos(mπv) ± cos(mπu)·cos(nπv),  u, v ∈ [0, 1],  n < m
// Sand thrown off the moving parts collects where the plate stands still, f = 0. Two families:
//   −  antisymmetric in u ↔ v: the diagonal and the centre are always nodes (crosses, stars, waves) — the song picks
//      one every half beat: the loudest of the 16 mel bands over that half beat, among the bands the chapter allows
//      (`skip` excluded: never the one just played; on "finally" only lower ones; bands in `recent` count half) → the
//      16 lowest modes (n² + m²);
//   +  symmetric: its nodal lines close into loops — +(2, 4) is a ring inside a square turned 45°, both closed. It is
//      kept for COMPLETION.
import { rand, randn } from '../../lib/hash.js';

export const S = 2; // half side (world units)
export const MODES = (() => {
  const all = [];
  for (let n = 1; n < 9; n++) for (let m = n + 1; m < 9; m++) all.push([n, m, -1]);
  return all.sort((a, b) => a[0] ** 2 + a[1] ** 2 - (b[0] ** 2 + b[1] ** 2) || a[0] - b[0]).slice(0, 16);
})();
export const CLOSED = [2, 4, 1];

const PI = Math.PI;
// x, z in plate coordinates [-S, S]; mode [n, m, sign]
export function chladni([n, m, s], x, z) {
  const u = (x / S + 1) / 2, v = (z / S + 1) / 2;
  return Math.cos(n * PI * u) * Math.cos(m * PI * v) + s * Math.cos(m * PI * u) * Math.cos(n * PI * v);
}
function grad([n, m, s], x, z) {
  const u = (x / S + 1) / 2, v = (z / S + 1) / 2, k = 1 / (2 * S);
  const fu = -n * PI * Math.sin(n * PI * u) * Math.cos(m * PI * v) - s * m * PI * Math.sin(m * PI * u) * Math.cos(n * PI * v);
  const fv = -m * PI * Math.cos(n * PI * u) * Math.sin(m * PI * v) - s * n * PI * Math.cos(m * PI * u) * Math.sin(n * PI * v);
  return [fu * k, fv * k];
}

// the loudest mel band averaged over [a, b) (60 samples a second, the features' own rate) → its mode; bands in `skip`
// are not allowed, bands in `recent` count half (so two strong bands do not take turns forever)
export function modeOf(F, a, b, skip = [], recent = []) {
  const acc = new Array(16).fill(0);
  for (let t = a; t < b; t += 1 / 60) { const m = F.mel(t); for (let j = 0; j < 16; j++) acc[j] += m[j]; }
  const score = (j) => acc[j] * (recent.includes(j) ? 0.5 : 1);
  let best = -1;
  for (let j = 0; j < 16; j++) if (!skip.includes(j) && (best < 0 || score(j) > score(best))) best = j;
  return { band: best, mode: MODES[best] };
}

const clampS = (v) => Math.min(S, Math.max(-S, v));
// sand: N grains, uniformly scattered on the plate (y = 0 plane, as [x, 0, z])
export function scatter(N, seed) {
  const P = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { P[i * 3] = (rand(i, 1, seed) * 2 - 1) * S; P[i * 3 + 2] = (rand(i, 2, seed) * 2 - 1) * S; }
  return P;
}
// the plate throws every grain: a jump of about `r` (in units of S) from where it lay (a grain left on an old nodal
// line would otherwise only slide along it)
export function toss(P0, r, seed) {
  const N = P0.length / 3, P = new Float32Array(P0);
  for (let i = 0; i < N; i++) { P[i * 3] = clampS(P[i * 3] + randn(i * 2, seed) * r * S); P[i * 3 + 2] = clampS(P[i * 3 + 2] + randn(i * 2 + 1, seed) * r * S); }
  return P;
}
// every grain walks to the nearest nodal line of `mode` (damped Newton steps on f, at most 0.05 S per step), then
// settles with a little spread (grains have a size)
export function settle(P0, mode, seed, { iters = 60, spread = 0.013 } = {}) {
  const N = P0.length / 3, P = new Float32Array(P0);
  for (let i = 0; i < N; i++) {
    let x = P[i * 3], z = P[i * 3 + 2];
    for (let it = 0; it < iters; it++) {
      const f = chladni(mode, x, z), [gx, gz] = grad(mode, x, z), g2 = gx * gx + gz * gz + 1e-6;
      let dx = (-f * gx) / g2, dz = (-f * gz) / g2;
      const L = Math.hypot(dx, dz), lim = 0.05 * S;
      if (L > lim) { dx *= lim / L; dz *= lim / L; }
      x = clampS(x + dx); z = clampS(z + dz);
      if (Math.abs(f) < 1e-4) break;
    }
    P[i * 3] = clampS(x + randn(i * 2, seed) * spread * S);
    P[i * 3 + 2] = clampS(z + randn(i * 2 + 1, seed) * spread * S);
  }
  return P;
}

// the closed nodal loops around the centre (star-shaped): along each ray from the centre, the k-th sign change of
// f (bisected) — one polyline per loop, in plate coordinates [x, 0, z]
export function loops(mode, count = 2, rays = 160) {
  const out = Array.from({ length: count }, () => []);
  for (let a = 0; a <= rays; a++) {
    const th = (a / rays) * 2 * PI, dx = Math.cos(th), dz = Math.sin(th);
    const rmax = S / Math.max(Math.abs(dx), Math.abs(dz));
    let k = 0, r0 = 0, f0 = chladni(mode, 0, 0);
    for (let i = 1; i <= 400 && k < count; i++) {
      const r1 = (i / 400) * rmax, f1 = chladni(mode, r1 * dx, r1 * dz);
      if (f0 * f1 < 0) {
        let lo = r0, hi = r1;
        for (let b = 0; b < 30; b++) { const mid = (lo + hi) / 2; if (chladni(mode, mid * dx, mid * dz) * f0 > 0) lo = mid; else hi = mid; }
        out[k++].push([lo * dx, 0, lo * dz]);
      }
      r0 = r1; f0 = f1;
    }
    for (; k < count; k++) out[k].push([rmax * dx, 0, rmax * dz]); // the loop touches the edge here (no sign change)
  }
  return out.filter((l) => l.length === rays + 1);
}
