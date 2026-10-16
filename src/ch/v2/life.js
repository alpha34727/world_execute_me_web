// The living things of verse 2, built for real: an eggplant as a surface of revolution, a tomato's five-locule
// cross-section in polar curves, the skeletal structures of delphinidin (the anthocyanin in eggplant skin) and
// lycopene (tomato red), and a tabby cat drawn by its own discrete Fourier transform. Pure geometry, no drawing.

const TAU = Math.PI * 2;

// ---- eggplant: a profile r(s), s = 0 (bottom) .. 1 (top), rotated about the y axis -----------------------------
export const EGG_H = 3.2;
export const eggR = (s) => 0.8 * Math.sin(Math.PI * Math.min(1, Math.max(0, s)) ** 0.7) ** 0.55 * (1 - 0.45 * s);
export const eggY = (s) => s * EGG_H - EGG_H / 2;
export const eggPt = (s, th) => { const r = eggR(s); return [r * Math.cos(th), eggY(s), r * Math.sin(th)]; };
export const EGG_TOP = 0.8; // the calyx covers the surface above this
// five sepals: pointed leaves lying on the surface, from the top down to s ≈ 0.68, alternating long and short
export function sepals() {
  return Array.from({ length: 5 }, (_, k) => {
    const c = (k / 5) * TAU + 0.3, s1 = k % 2 ? 0.72 : 0.66;
    const pts = [];
    for (let i = 0; i <= 24; i++) { const u = i / 24, s = 1 - (1 - s1) * u; pts.push(eggPt(s, c - 0.55 * Math.sin(Math.PI * u) ** 0.8 * (1 - 0.25 * u)).map((v, d) => (d === 1 ? v : v * 1.04))); }
    for (let i = 24; i >= 0; i--) { const u = i / 24, s = 1 - (1 - s1) * u; pts.push(eggPt(s, c + 0.55 * Math.sin(Math.PI * u) ** 0.8 * (1 - 0.25 * u)).map((v, d) => (d === 1 ? v : v * 1.04))); }
    return pts;
  });
}
// the stem: a short curved tube's centre line from the top
export const stem = () => Array.from({ length: 13 }, (_, i) => { const u = i / 12; return [0.18 * u * u, eggY(1) + 0.05 + 0.55 * u, 0]; });

// ---- tomato: axis along z (the stem faces the camera); radius with five shallow lobes ----------------------------
export const TOM_R = 1.35, TOM_Z = 0.82; // equatorial radius, polar half-height (oblate)
export const tomR = (th) => TOM_R * (1 + 0.04 * Math.cos(5 * th));
// a point of the whole fruit: φ from the stem pole (+z) to the far pole
export const tomPt = (phi, th) => { const r = tomR(th) * Math.sin(phi); return [r * Math.cos(th), r * Math.sin(th), TOM_Z * Math.cos(phi)]; };
// the cross-section (z = 0): skin, the inner wall of the pericarp, five locules between five septa (each a
// superellipse in (r, θ)), seeds on each locule's inner (placental) side
export const skin = (n = 160) => Array.from({ length: n + 1 }, (_, i) => { const th = (i / n) * TAU; return [tomR(th) * Math.cos(th), tomR(th) * Math.sin(th), 0]; });
export const wall = (n = 160) => skin(n).map((p) => [p[0] * 0.86, p[1] * 0.86, 0]);
export const loculeCentre = (k) => (k / 5) * TAU + TAU / 10;
export function locule(k, n = 96) {
  const c = loculeCentre(k), rm = 0.56 * TOM_R, h = 0.25 * TOM_R, w = 0.42;
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = (i / n) * TAU, cu = Math.cos(u), su = Math.sin(u);
    const th = c + w * Math.sign(cu) * Math.abs(cu) ** 0.6, r = rm + h * Math.sign(su) * Math.abs(su) ** 0.6;
    return [r * Math.cos(th), r * Math.sin(th), 0];
  });
}
// seeds: 4 per locule along its inner (placental) edge, each a small ellipse pointing at the centre
export function seeds() {
  const out = [];
  for (let k = 0; k < 5; k++) for (let j = 0; j < 4; j++) {
    const th = loculeCentre(k) + (j - 1.5) * 0.2, r = TOM_R * (0.42 + 0.05 * (j % 2));
    out.push({ c: [r * Math.cos(th), r * Math.sin(th), 0.01], a: th, k, j });
  }
  return out;
}
export const seedOutline = (s, len = 0.09, wid = 0.045) => Array.from({ length: 25 }, (_, i) => {
  const u = (i / 24) * TAU, x = Math.cos(u) * len, y = Math.sin(u) * wid * (1 - 0.3 * Math.cos(u));
  return [s.c[0] + x * Math.cos(s.a) - y * Math.sin(s.a), s.c[1] + x * Math.sin(s.a) + y * Math.cos(s.a), s.c[2]];
});
// the calyx on the stem pole: a five-pointed star of sepals lying on the fruit, pointing outward
export function tomCalyx() {
  return Array.from({ length: 5 }, (_, k) => {
    const c = (k / 5) * TAU + Math.PI / 2;
    const pts = [];
    for (let i = 0; i <= 16; i++) { const u = i / 16, phi = 0.08 + 0.62 * u, dth = 0.3 * Math.sin(Math.PI * u) ** 0.7 * (1 - 0.4 * u); pts.push(tomPt(phi, c - dth).map((v, d) => (d === 2 ? v + 0.03 : v))); }
    for (let i = 16; i >= 0; i--) { const u = i / 16, phi = 0.08 + 0.62 * u, dth = 0.3 * Math.sin(Math.PI * u) ** 0.7 * (1 - 0.4 * u); pts.push(tomPt(phi, c + dth).map((v, d) => (d === 2 ? v + 0.03 : v))); }
    return pts;
  });
}

// ---- molecules: skeletal structures (heavy atoms only, as chemists draw them), unit bond length -----------------
// delphinidin, the flavylium cation C15H11O7+: rings A (benzo) and C (pyrylium, O1+) fused, ring B at C2;
// OH on 3, 5, 7, 3', 4', 5'. Kekulé bonds. (C: 15, O: 7, the 11 H are 5 on the rings + 6 hydroxyl.)
export function delphinidin() {
  const s3 = Math.sqrt(3) / 2;
  const A = {
    O1: [s3, -1], C2: [2 * s3, -0.5], C3: [2 * s3, 0.5], C4: [s3, 1], C4a: [0, 0.5], C8a: [0, -0.5],
    C5: [-s3, 1], C6: [-2 * s3, 0.5], C7: [-2 * s3, -0.5], C8: [-s3, -1],
    C1b: [3 * s3, -1], C2b: [4 * s3, -0.5], C3b: [5 * s3, -1], C4b: [5 * s3, -2], C5b: [4 * s3, -2.5], C6b: [3 * s3, -2],
    O3: [3 * s3, 1], O5: [-s3, 2], O7: [-3 * s3, -1], O3b: [6 * s3, -0.5], O4b: [6 * s3, -2.5], O5b: [4 * s3, -3.5],
  };
  const names = Object.keys(A);
  const bonds = [
    ['O1', 'C2', 2], ['C2', 'C3', 1], ['C3', 'C4', 2], ['C4', 'C4a', 1], ['C4a', 'C8a', 2], ['C8a', 'O1', 1],
    ['C4a', 'C5', 1], ['C5', 'C6', 2], ['C6', 'C7', 1], ['C7', 'C8', 2], ['C8', 'C8a', 1],
    ['C2', 'C1b', 1], ['C1b', 'C2b', 2], ['C2b', 'C3b', 1], ['C3b', 'C4b', 2], ['C4b', 'C5b', 1], ['C5b', 'C6b', 2], ['C6b', 'C1b', 1],
    ['C3', 'O3', 1], ['C5', 'O5', 1], ['C7', 'O7', 1], ['C3b', 'O3b', 1], ['C4b', 'O4b', 1], ['C5b', 'O5b', 1],
  ];
  const ring = { O1: 'C', C2: 'C', C3: 'C', C4: 'C', C4a: 'C', C8a: 'C', C5: 'A', C6: 'A', C7: 'A', C8: 'A', C1b: 'B', C2b: 'B', C3b: 'B', C4b: 'B', C5b: 'B', C6b: 'B' };
  const centre = { A: [-s3, 0], C: [s3, 0], B: [4 * s3, -1.5] };
  // centre the drawing on its bounding box
  const xs = names.map((n) => A[n][0]), ys = names.map((n) => A[n][1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const atoms = names.map((n) => ({ name: n, el: n[0], p: [A[n][0] - cx, A[n][1] - cy], plus: n === 'O1' }));
  const idx = Object.fromEntries(names.map((n, i) => [n, i]));
  // a double bond's second line is drawn inside its ring (or beside it, offset toward the molecule's centre)
  const ringC = (n) => (ring[n] ? centre[ring[n]].map((v, d) => v - (d ? cy : cx)) : null);
  return {
    atoms,
    bonds: bonds.map(([a, b, o]) => ({ a: idx[a], b: idx[b], order: o, inner: ring[a] && ring[a] === ring[b] ? ringC(a) : ring[a] === 'C' && ring[b] === 'A' ? ringC(b) : ringC(a) ?? ringC(b) })),
    // a build order that grows the skeleton outward from the charged oxygen
    order: ['O1', 'C2', 'C8a', 'C3', 'C4a', 'C4', 'C8', 'C5', 'C7', 'C6', 'C1b', 'O3', 'O5', 'O7', 'C2b', 'C6b', 'C3b', 'C5b', 'C4b', 'O3b', 'O5b', 'O4b'].map((n) => idx[n]),
  };
}

// lycopene C40H56, all-trans: a 32-carbon main chain (a 120° zig-zag) with 8 methyl branches; 13 C=C, of which the
// 11 between C6 and C27 (main-chain numbering from one end) are conjugated. Centrosymmetric.
export const LYC_N = 32;
export const LYC_DOUBLE = [[2, 3], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 21], [22, 23], [24, 25], [26, 27], [30, 31]];
export const LYC_METHYL = [2, 6, 10, 14, 19, 23, 27, 31];
export const LYC_CONJ = [6, 27]; // the conjugated stretch (inclusive)
export function lycopene(b = 1) {
  const dx = b * Math.cos(Math.PI / 6), dy = b * Math.sin(Math.PI / 6);
  const chain = Array.from({ length: LYC_N }, (_, i) => [(i - (LYC_N - 1) / 2) * dx, (i % 2 ? dy : 0) - dy / 2]);
  // a methyl points away from the zig-zag on its vertex's side
  const methyls = LYC_METHYL.map((i) => { const k = i - 1; const up = k % 2 ? 1 : -1; return { on: k, p: [chain[k][0], chain[k][1] + up * b] }; });
  const bonds = [];
  for (let i = 0; i < LYC_N - 1; i++) bonds.push({ a: i, b: i + 1, order: LYC_DOUBLE.some(([p, q]) => p === i + 1 && q === i + 2) ? 2 : 1 });
  return { chain, methyls, bonds, conj: LYC_CONJ.map((i) => i - 1) };
}

// ---- the cat: a sitting tabby and a curled-up one, closed Catmull–Rom curves through hand-placed points --------
export const SIT = [[-0.58, -1.00], [-0.60, -0.90], [-0.54, -0.70], [-0.55, -0.40], [-0.61, -0.12], [-0.60, 0.12], [-0.55, 0.30], [-0.66, 0.40], [-0.80, 0.48], [-0.89, 0.58], [-0.86, 0.70], [-0.76, 0.80], [-0.68, 0.90], [-0.655, 1.06], [-0.635, 1.16], [-0.60, 1.07], [-0.52, 0.96], [-0.42, 0.97], [-0.36, 1.04], [-0.325, 1.12], [-0.30, 1.02], [-0.26, 0.86], [-0.22, 0.66], [-0.05, 0.48], [0.22, 0.30], [0.45, 0.08], [0.60, -0.20], [0.64, -0.52], [0.60, -0.80], [0.78, -0.86], [0.98, -0.74], [1.08, -0.48], [1.06, -0.22], [0.98, -0.12], [0.94, -0.20], [0.98, -0.46], [0.90, -0.66], [0.72, -0.76], [0.62, -0.92], [0.50, -1.00], [0.10, -1.00], [-0.30, -1.00], [-0.40, -0.93], [-0.46, -1.00]];
export const CURL = [[-0.62, -0.62], [-0.82, -0.50], [-0.92, -0.30], [-0.90, -0.10], [-0.84, 0.02], [-0.83, 0.16], [-0.81, 0.27], [-0.74, 0.17], [-0.66, 0.12], [-0.58, 0.17], [-0.54, 0.24], [-0.52, 0.12], [-0.48, 0.06], [-0.30, 0.20], [0.00, 0.28], [0.30, 0.25], [0.56, 0.12], [0.72, -0.08], [0.76, -0.32], [0.68, -0.52], [0.50, -0.64], [0.20, -0.68], [-0.15, -0.68], [-0.45, -0.66]];
// the curled cat's tail, lying along its front
export const CURL_TAIL = [[0.62, -0.52], [0.35, -0.6], [0.0, -0.6], [-0.35, -0.57], [-0.55, -0.5], [-0.6, -0.4], [-0.52, -0.38]];
export function catmullRom(P, per = 16, closed = true) {
  const N = P.length, out = [];
  const at = (i) => P[closed ? ((i % N) + N) % N : Math.max(0, Math.min(N - 1, i))];
  for (let i = 0; i < (closed ? N : N - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  if (!closed) out.push(P[N - 1]);
  return out;
}
// n points equally spaced by arc length around a closed curve
export function resample(pts, n) {
  const P = [...pts, pts[0]], cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = cum.at(-1), out = [];
  let s = 0;
  for (let k = 0; k < n; k++) {
    const d = (k / n) * L;
    while (s < cum.length - 2 && cum[s + 1] < d) s++;
    const u = (d - cum[s]) / Math.max(1e-9, cum[s + 1] - cum[s]);
    out.push([P[s][0] + (P[s + 1][0] - P[s][0]) * u, P[s][1] + (P[s + 1][1] - P[s][1]) * u]);
  }
  return out;
}
export const CAT_N = 256;
export const catSit = () => resample(catmullRom(SIT), CAT_N);
export const catCurl = () => resample(catmullRom(CURL), CAT_N);

// discrete Fourier transform of the closed curve as complex samples z_n = x_n + i y_n:
//   c_k = (1/N) Σ z_n e^(−2πi kn/N),  z(φ) = Σ c_k e^(2πi kφ)
// keep the `keep` largest terms (c_0, the centroid, first), ordered by amplitude: an epicycle chain
export function dft(pts, keep = 64) {
  const N = pts.length, out = [];
  for (let k = -N / 2; k < N / 2; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) { const a = (-TAU * k * n) / N, x = pts[n][0], y = pts[n][1]; re += x * Math.cos(a) - y * Math.sin(a); im += x * Math.sin(a) + y * Math.cos(a); }
    out.push({ k, re: re / N, im: im / N, amp: Math.hypot(re, im) / N });
  }
  const c0 = out.find((c) => c.k === 0);
  return [c0, ...out.filter((c) => c.k !== 0).sort((a, b) => b.amp - a.amp || a.k - b.k).slice(0, keep - 1)];
}
// the chain at phase φ: the centre of every circle, then the pen (the last point)
export function chainAt(coefs, phi) {
  const pts = [[0, 0]];
  let x = 0, y = 0;
  for (const c of coefs) {
    const a = TAU * c.k * phi, ca = Math.cos(a), sa = Math.sin(a);
    x += c.re * ca - c.im * sa; y += c.re * sa + c.im * ca;
    pts.push([x, y]);
  }
  return pts.slice(1); // pts[0] = c_0 (the centroid): circles are centred on pts[i], radius coefs[i + 1].amp
}
export const penAt = (coefs, phi) => chainAt(coefs, phi).at(-1);

export function inside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// tabby stripes: the curves x = x0 + a·sin(k·y + ψ) clipped to the inside of the cat (a mackerel tabby is a row of
// sine waves); returns polylines
export function stripes(poly, { x0 = -1.1, x1 = 1.1, step = 0.13, a = 0.05, k = 9, psi = 0, y0 = -1, y1 = 1.2, n = 90 } = {}) {
  const out = [];
  for (let xc = x0; xc <= x1; xc += step) {
    let cur = [];
    for (let i = 0; i <= n; i++) {
      const y = y0 + ((y1 - y0) * i) / n, x = xc + a * Math.sin(k * y + psi + xc * 3);
      if (inside(poly, x, y)) cur.push([x, y]); else if (cur.length) { if (cur.length > 2) out.push(cur); cur = []; }
    }
    if (cur.length > 2) out.push(cur);
  }
  return out;
}
