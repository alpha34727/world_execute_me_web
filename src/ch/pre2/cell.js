// The cell's story at the end of pre2: what SRY switches (a cell's fate), the cell cycle (S, then M), mitosis, and
// the first divisions of an embryo. Pure geometry and math, no drawing.

// ---- Waddington's epigenetic landscape: a cell rolls downhill (v: 0 → 1) on a surface whose single valley forks in
// two (a pitchfork bifurcation, V(u) = u⁴/4 − a(v)·u²/2 − tilt·c(v)·u). SRY tips it: the cell goes to the testis side.
export const wadA = (v) => -0.25 + 1.7 * v;
const ramp = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const wadTilt = (v) => 0.55 * ramp(0.1, 0.45, v);
export const wadV = (u, v, tilt) => 0.25 * u ** 4 - 0.5 * wadA(v) * u * u - tilt * wadTilt(v) * u;
export const wadGrad = (u, v, tilt) => u ** 3 - wadA(v) * u - tilt * wadTilt(v);
export const WAD = { U: 2.4, Y: 2.2, Z: 7.5, SLOPE: 1.6 };
// downhill comes toward the viewer (Waddington's own drawing: the cell rolls down at us, the valleys fan out)
export const wadPt = (u, v, tilt) => [u * WAD.U, -WAD.SLOPE * v + WAD.Y * wadV(u, v, tilt), (v - 0.5) * WAD.Z];
// the cell's lateral position: gradient flow from the ridge (u = 0 is an unstable balance until something tips it),
// integrated with a fixed step from the shot's start (a pure function of t)
export function wadBall(vOf, tiltOf, t0, t, { dt = 1 / 240, rate = 5, u0 = 0 } = {}) {
  let u = u0;
  for (let s = t0; s < t; s += dt) u -= rate * wadGrad(u, vOf(s), tiltOf(s)) * Math.min(dt, t - s);
  return u;
}

// ---- the cell cycle of a typical proliferating human cell (about 24 h): G1, S (DNA synthesis), G2, M (mitosis)
export const PHASES = [
  { id: 'G1', name: 'G1 · growth', h: 11 },
  { id: 'S', name: 'S · DNA synthesis', h: 8 },
  { id: 'G2', name: 'G2 · growth', h: 4 },
  { id: 'M', name: 'M · mitosis', h: 1 },
];
export const CYCLE_H = PHASES.reduce((s, p) => s + p.h, 0);
export const phaseStart = (id) => { let h = 0; for (const p of PHASES) { if (p.id === id) return h; h += p.h; } return h; };
export const phaseAt = (h) => { const hh = ((h % CYCLE_H) + CYCLE_H) % CYCLE_H; let a = 0; for (const p of PHASES) { if (hh < a + p.h) return p; a += p.h; } return PHASES[0]; };

// ---- the cell membrane dividing: Cassini ovals, |z − c|·|z + c| = b². One loop while c < b; at c = b it pinches
// (a lemniscate); past it, two loops — one cell becomes two. Returns closed polylines [[x, y], …].
export function cassini(c, b, n = 160) {
  const pts = (sign, th0, th1) => Array.from({ length: n + 1 }, (_, i) => {
    const th = th0 + ((th1 - th0) * i) / n, s2 = Math.sin(2 * th), disc = b ** 4 - c ** 4 * s2 * s2;
    const r2 = c * c * Math.cos(2 * th) + sign * Math.sqrt(Math.max(0, disc));
    const r = Math.sqrt(Math.max(0, r2));
    return [r * Math.cos(th), r * Math.sin(th)];
  });
  if (c < b * 0.999) return [pts(1, 0, Math.PI * 2)];
  const tm = 0.5 * Math.asin(Math.min(1, (b / c) ** 2)) - 1e-4;
  const loop = (off) => [...pts(1, off - tm, off + tm), ...pts(-1, off + tm, off - tm)];
  return [loop(0), loop(Math.PI)];
}

// ---- cleavage: the zygote divides without growing, so each division halves every cell's volume (radius × 2^(−1/3));
// the k-th division splits along x, y, z in turn. Returns { pos, r } for 2^n cells, mid-division at f ∈ [0, 1].
export function cleavage(n, f = 1, R0 = 1.5) {
  let cells = [[0, 0, 0]];
  const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let k = 0; k < n; k++) {
    const ax = axes[k % 3], d = R0 * 2 ** (-(k + 1) / 3) * 0.95 * (k === n - 1 ? f : 1);
    cells = cells.flatMap((p) => [p.map((v, i) => v - ax[i] * d), p.map((v, i) => v + ax[i] * d)]);
  }
  const r = R0 * 2 ** (-(n - 1 + f) / 3);
  // the cells pack into a ball (a morula), not a box: map the cube of positions onto the sphere
  const E = [0, 1, 2].map((c) => Math.max(1e-6, ...cells.map((p) => Math.abs(p[c]))));
  const Em = (E[0] + E[1] + E[2]) / 3;
  const pos = cells.map((p) => {
    const [x, y, z] = p.map((v, c) => v / E[c]);
    if (cells.length < 8) return p;
    return [x * Math.sqrt(1 - y * y / 2 - z * z / 2 + (y * y * z * z) / 3), y * Math.sqrt(1 - z * z / 2 - x * x / 2 + (z * z * x * x) / 3), z * Math.sqrt(1 - x * x / 2 - y * y / 2 + (x * x * y * y) / 3)].map((v) => v * Em * 1.15);
  });
  return { pos, r };
}

// a valley floor: the local minimum of V(u) on side sg (−1 ovary, +1 testis) — a root of the gradient between the
// inflection point and the wall, found by bisection; null where that valley does not exist (before the fork, or once
// the landscape is tipped so far that the ovary side has lost its minimum)
export function valleyU(v, tilt, sg) {
  const a = wadA(v);
  if (a <= 0) return null;
  const inf = Math.sqrt(a / 3);
  let lo = sg > 0 ? inf : -2.5, hi = sg > 0 ? 2.5 : -inf;
  const g = (u) => wadGrad(u, v, tilt);
  if (g(lo) > 0 || g(hi) < 0) return null;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (g(m) < 0) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
