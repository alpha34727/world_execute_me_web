// Word embeddings learned from the full lyrics with a real (classical) method: positive pointwise mutual information
// over a ±2 word window (context-distribution smoothing 0.75), factorised by eigendecomposition (cyclic Jacobi) —
// E = U·√Λ for the top `dim` positive eigenvalues (Levy & Goldberg 2014: the count-based twin of word2vec).
// Plus scaled dot-product attention over those vectors. Deterministic: fixed sweep order, sign-fixed eigenvectors.
import { norm, sequence } from './corpus.js';

const cache = new WeakMap();

function jacobi(A, n, sweeps = 12) {
  const V = new Float64Array(n * n);
  for (let i = 0; i < n; i++) V[i * n + i] = 1;
  for (let s = 0; s < sweeps; s++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p * n + q] * A[p * n + q];
    if (off < 1e-18) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      const apq = A[p * n + q];
      if (Math.abs(apq) < 1e-15) continue;
      const theta = (A[q * n + q] - A[p * n + p]) / (2 * apq);
      const tt = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(tt * tt + 1), sn = tt * c;
      for (let k = 0; k < n; k++) {
        const akp = A[k * n + p], akq = A[k * n + q];
        A[k * n + p] = c * akp - sn * akq; A[k * n + q] = sn * akp + c * akq;
      }
      for (let k = 0; k < n; k++) {
        const apk = A[p * n + k], aqk = A[q * n + k];
        A[p * n + k] = c * apk - sn * aqk; A[q * n + k] = sn * apk + c * aqk;
      }
      for (let k = 0; k < n; k++) {
        const vkp = V[k * n + p], vkq = V[k * n + q];
        V[k * n + p] = c * vkp - sn * vkq; V[k * n + q] = sn * vkp + c * vkq;
      }
    }
  }
  return { values: Array.from({ length: n }, (_, i) => A[i * n + i]), V };
}

export function embeddings(T, { dim = 16, window = 2 } = {}) {
  if (cache.has(T)) return cache.get(T);
  const seq = sequence(T).map((w) => w.norm);
  const vocab = [...new Set(seq)].sort();
  const index = new Map(vocab.map((w, i) => [w, i]));
  const n = vocab.length;
  const C = new Float64Array(n * n);
  for (let i = 0; i < seq.length; i++) for (let d = 1; d <= window; d++) {
    if (i + d >= seq.length) break;
    const a = index.get(seq[i]), b = index.get(seq[i + d]);
    C[a * n + b] += 1; C[b * n + a] += 1;
  }
  const row = new Float64Array(n), col = new Float64Array(n);
  let total = 0;
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) { row[a] += C[a * n + b]; total += C[a * n + b]; }
  let ctot = 0;
  for (let b = 0; b < n; b++) { col[b] = Math.pow(row[b], 0.75); ctot += col[b]; }
  const M = new Float64Array(n * n);
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
    const c = C[a * n + b];
    if (c > 0) M[a * n + b] = Math.max(0, Math.log((c / total) / ((row[a] / total) * (col[b] / ctot))));
  }
  // symmetrise (the smoothing makes PPMI slightly asymmetric) and factorise
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { const m = (M[a * n + b] + M[b * n + a]) / 2; M[a * n + b] = m; M[b * n + a] = m; }
  const { values, V } = jacobi(M, n);
  const order = values.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]).slice(0, dim);
  const vec = new Float64Array(n * dim);
  order.forEach(([lam, j], d) => {
    let big = 0;
    for (let a = 0; a < n; a++) if (Math.abs(V[a * n + j]) > Math.abs(big)) big = V[a * n + j];
    const s = Math.sign(big) * Math.sqrt(Math.max(0, lam));
    for (let a = 0; a < n; a++) vec[a * dim + d] = V[a * n + j] * s;
  });
  // per-dimension standard deviation over the vocabulary (for whitened display coordinates)
  const mean = Array.from({ length: dim }, (_, d) => { let m = 0; for (let a = 0; a < n; a++) m += vec[a * dim + d]; return m / n; });
  const sd = Array.from({ length: dim }, (_, d) => {
    let v = 0;
    for (let a = 0; a < n; a++) v += (vec[a * dim + d] - mean[d]) ** 2;
    return Math.sqrt(v / n) || 1;
  });
  const model = {
    vocab, dim, values: order.map((o) => o[0]),
    vector(word) { const i = index.get(norm(word)); return i === undefined ? null : Array.from(vec.subarray(i * dim, (i + 1) * dim)); },
    // first three principal axes, whitened: a real linear projection of the embedding to 3D
    point3(word, scale = 1) { const v = this.vector(word); return v ? [0, 1, 2].map((d) => ((v[d] - mean[d]) / sd[d]) * scale) : [0, 0, 0]; },
  };
  cache.set(T, model);
  return model;
}

// Causal scaled dot-product attention of the last token over words[0..i]: softmax(q·kᵀ/√d), with q = k = the
// L2-normalised embedding times `gain` (W_Q = W_K = gain·I — a single, untrained head). Returns weights (sum 1).
export function attention(E, words, i, { gain = 8 } = {}) {
  const unit = (w) => { const v = E.vector(w) ?? new Array(E.dim).fill(0); const l = Math.hypot(...v) || 1; return v.map((x) => (x / l) * gain); };
  const q = unit(words[i]);
  const s = words.slice(0, i + 1).map((w) => unit(w).reduce((acc, k, d) => acc + k * q[d], 0) / Math.sqrt(E.dim));
  const mx = Math.max(...s);
  const e = s.map((x) => Math.exp(x - mx));
  const Z = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / Z);
}
