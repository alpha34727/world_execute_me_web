// 13 love — the algebra of love, computed: polar curves (the cardioid r = 1 − sin θ, the roses r = cos kθ), the heart
// curve (x² + y² − 1)³ − x²y³ = 0 traced by marching squares, and Taubin's heart surface
// (x² + 9/4·y² + z² − 1)³ − x²z³ − 9/80·y²z³ = 0 with points solved on it (bisection along rays from the origin).
// Its slice y = 0 is (x² + z² − 1)³ − x²z³ = 0: the 2D heart is the surface's middle cross-section, so the flat
// curve can inflate into the surface. World axes: the heart's z (up) is the world's y.
import { rand } from '../../lib/hash.js';

const TAU = Math.PI * 2;
// polar curve r(θ) in the plane spanned by u, v (unit) around c, θ ∈ [0, k·2π]; n samples
export function polar(r, { c = [0, 0, 0], u = [1, 0, 0], v = [0, 1, 0], turns = 1, n = 400, scale = 1, a0 = 0 } = {}) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const th = a0 + (i / n) * TAU * turns, rr = r(th) * scale, x = rr * Math.cos(th), y = rr * Math.sin(th);
    return [c[0] + x * u[0] + y * v[0], c[1] + x * u[1] + y * v[1], c[2] + x * u[2] + y * v[2]];
  });
}
export const cardioid = (th) => 1 - Math.sin(th);
// r = cos kθ closes after π for odd k, 2π for even k (k petals for odd, 2k for even)
export const rose = (k) => (th) => Math.cos(k * th);
export const roseTurns = (k) => (k % 2 ? 0.5 : 1);

// the heart curve: f(x, y) = (x² + y² − 1)³ − x²y³ = 0, marching squares on an N×N grid over [−1.5, 1.5]²;
// returns segments [[x, y], [x, y]] (curve coordinates)
export const heart2 = (x, y) => (x * x + y * y - 1) ** 3 - x * x * y ** 3;
// N = 360: the field is flat (cubic) near the curve, so linear interpolation can be off by half a cell — a fine grid
// keeps that under a pixel
export function heartSegments(N = 360, R = 1.5) {
  const h = (2 * R) / N, X = (i) => -R + i * h;
  const f = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) f.push(heart2(X(i), X(j)));
  const at = (i, j) => f[j * (N + 1) + i];
  const lerpE = (x0, y0, f0, x1, y1, f1) => { const s = f0 / (f0 - f1); return [x0 + (x1 - x0) * s, y0 + (y1 - y0) * s]; };
  const segs = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x0 = X(i), y0 = X(j), x1 = X(i + 1), y1 = X(j + 1);
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    const e = [];
    if ((a < 0) !== (b < 0)) e.push(lerpE(x0, y0, a, x1, y0, b));
    if ((b < 0) !== (c < 0)) e.push(lerpE(x1, y0, b, x1, y1, c));
    if ((c < 0) !== (d < 0)) e.push(lerpE(x1, y1, c, x0, y1, d));
    if ((d < 0) !== (a < 0)) e.push(lerpE(x0, y1, d, x0, y0, a));
    if (e.length === 2) segs.push(e);
    else if (e.length === 4) segs.push([e[0], e[1]], [e[2], e[3]]);
  }
  return segs;
}

// Taubin's heart surface in its own axes (z up)
export const heart3 = (x, y, z) => (x * x + 2.25 * y * y + z * z - 1) ** 3 - x * x * z ** 3 - (9 / 80) * y * y * z ** 3;
// n points on the surface: Fibonacci directions from the origin (inside: f(0) = −1), the first sign change along the
// ray, refined by bisection. Returned in world axes [x, z, y] (the heart's z is up).
export function heartPoints(n = 6000, seed = 1500) {
  const out = [];
  const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const zz = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - zz * zz), a = i * g + 0.3 * rand(i, 1, seed);
    const d = [rr * Math.cos(a), rr * Math.sin(a), zz];
    let lo = 0, hi = 0;
    for (let r = 0.02; r <= 2; r += 0.02) { if (heart3(d[0] * r, d[1] * r, d[2] * r) >= 0) { hi = r; break; } lo = r; }
    if (!hi) continue;
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (heart3(d[0] * m, d[1] * m, d[2] * m) >= 0) hi = m; else lo = m; }
    const r = (lo + hi) / 2;
    out.push([d[0] * r, d[2] * r, d[1] * r]);
  }
  return out;
}

// the cage (love.09–10): horizontal cross-sections of the heart surface at heights h (the heart's z), each traced by
// marching squares in its own (x, y) plane; returns world segments [[x, h, y], [x, h, y]]
export function heartRings(levels, N = 72) {
  const segs = [];
  const R = 1.3, h = (2 * R) / N, X = (i) => -R + i * h;
  for (const zc of levels) {
    const at = (i, j) => Math.cbrt(heart3(X(i), X(j), zc)); // cube root: see heartSegments
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x0 = X(i), y0 = X(j), x1 = X(i + 1), y1 = X(j + 1);
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      const e = [];
      const cut = (xa, ya, fa, xb, yb, fb) => { const s = fa / (fa - fb); e.push([xa + (xb - xa) * s, zc, ya + (yb - ya) * s]); };
      if ((a < 0) !== (b < 0)) cut(x0, y0, a, x1, y0, b);
      if ((b < 0) !== (c < 0)) cut(x1, y0, b, x1, y1, c);
      if ((c < 0) !== (d < 0)) cut(x1, y1, c, x0, y1, d);
      if ((d < 0) !== (a < 0)) cut(x0, y1, d, x0, y0, a);
      if (e.length === 2) segs.push(e); else if (e.length === 4) segs.push([e[0], e[1]], [e[2], e[3]]);
    }
  }
  return segs;
}
