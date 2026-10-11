// Signed distance field from an anti-aliased coverage bitmap.
// Exact squared Euclidean distance transform (Felzenszwalb & Huttenlocher), run separately for the inside and the
// outside, seeded with sub-pixel distances from the coverage value so edges stay smooth.
const INF = 1e20;

function edt1d(f, d, v, z, n) {
  v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1, k = 0; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

function edt2d(grid, w, h) {
  const n = Math.max(w, h);
  const f = new Float64Array(n), d = new Float64Array(n), z = new Float64Array(n + 1);
  const v = new Int32Array(n);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, d, v, z, h);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, d, v, z, w);
    for (let x = 0; x < w; x++) grid[y * w + x] = Math.sqrt(d[x]);
  }
}

// alpha: Uint8ClampedArray coverage (0..255) of size w*h. Returns Uint8Array where 128 ≈ edge,
// value = 0.5 + signedDist / (2 * radius) (inside positive).
export function coverageToSdf(alpha, w, h, radius) {
  const outer = new Float64Array(w * h), inner = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = alpha[i] / 255;
    if (a >= 1) { outer[i] = 0; inner[i] = INF; }
    else if (a <= 0) { outer[i] = INF; inner[i] = 0; }
    else { const o = Math.max(0, 0.5 - a); const n = Math.max(0, a - 0.5); outer[i] = o * o; inner[i] = n * n; }
  }
  edt2d(outer, w, h);
  edt2d(inner, w, h);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const dist = inner[i] - outer[i]; // positive inside
    out[i] = Math.max(0, Math.min(255, Math.round((0.5 + dist / (2 * radius)) * 255)));
  }
  return out;
}
