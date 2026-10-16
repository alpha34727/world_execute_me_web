// The real computations behind pre1: every line is a part of a neural network played as its literal physics.
//   rectifier   AC → half-wave (= ReLU) → full-wave |x| → capacitor-input RC filter → DC (steady-state ripple)
//   heavyBall   gradient descent with momentum on an anisotropic quadratic bowl (it circles: "so dizzy")
//   chain       a tiny tanh chain run forward, then its gradients by the chain rule, run backward ("A.D to B.C")
import { randn } from '../../lib/hash.js';

// ---- the rectifier -------------------------------------------------------------------------------------------
export const STAGES = [
  { id: 'ac', f: (th) => Math.sin(th) },
  { id: 'half', f: (th) => Math.max(0, Math.sin(th)) }, // a diode: max(0, x), which is ReLU
  { id: 'full', f: (th) => Math.abs(Math.sin(th)) }, // a bridge: |x|
  { id: 'rc', f: (th) => ripple(th) }, // a capacitor holds the peaks, discharging through R between them
];
// steady-state output of a peak-detector RC filter fed by |sin θ|: y = max(|sin θ|, y·e^(−Δθ/τ)), τ = 6 rad
// (simulated over many periods, then one period π is kept; ripple(θ) is periodic in π)
const TAU_RC = 6, NR = 720;
let RIP = null;
function ripple(th) {
  if (!RIP) {
    RIP = new Float32Array(NR);
    let y = 0;
    const d = Math.PI / NR, k = Math.exp(-d / TAU_RC);
    for (let p = 0; p < 30; p++) for (let i = 0; i < NR; i++) { y = Math.max(Math.abs(Math.sin(i * d)), y * k); if (p === 29) RIP[i] = y; }
  }
  const q = ((th % Math.PI) + Math.PI) % Math.PI;
  return RIP[Math.min(NR - 1, Math.floor((q / Math.PI) * NR))];
}
export const dcLevel = () => { ripple(0); return RIP.reduce((s, v) => s + v, 0) / NR; };

// ---- heavy-ball descent ----------------------------------------------------------------------------------------
// L(x, z) = ½(u² + 4v²), (u, v) = (x, z) rotated by 0.5 rad; v ← βv − η∇L, p ← p + v, β = 0.9, η = 0.1
export const HB = { beta: 0.9, eta: 0.1, start: [2.6, -1.8] };
const C = Math.cos(0.5), S = Math.sin(0.5);
export const loss = (x, z) => { const u = C * x + S * z, v = -S * x + C * z; return 0.5 * (u * u + 4 * v * v); };
const grad = (x, z) => { const u = C * x + S * z, v = -S * x + C * z, gu = u, gv = 4 * v; return [C * gu - S * gv, S * gu + C * gv]; };
let PATH = null;
export function heavyBall(n = 64) {
  if (PATH && PATH.length >= n + 1) return PATH;
  let [x, z] = HB.start, vx = 0, vz = 0;
  PATH = [[x, z]];
  for (let i = 0; i < n; i++) {
    const [gx, gz] = grad(x, z);
    vx = HB.beta * vx - HB.eta * gx; vz = HB.beta * vz - HB.eta * gz;
    x += vx; z += vz;
    PATH.push([x, z]);
  }
  return PATH;
}

// ---- the chain rule --------------------------------------------------------------------------------------------
// h₀ = x = 0.9, h_k = tanh(w_k h_(k−1) + b_k) for k = 1..6 (hashed weights), L = (h₆ − 0.5)²
// backward: g₆ = ∂L/∂h₆ = 2(h₆ − 0.5), g_(k−1) = g_k · w_k · (1 − h_k²)
export const CHAIN_N = 7; // nodes: x, h1..h5, L (the last node holds h6 and the loss)
let CH = null;
export function chain() {
  if (CH) return CH;
  const w = [0], b = [0], h = [0.9];
  for (let k = 1; k < CHAIN_N; k++) {
    w.push(1.5 * randn(k, 0, 411) + (k % 2 ? 0.8 : -0.8));
    b.push(0.3 * randn(k, 1, 411));
    h.push(Math.tanh(w[k] * h[k - 1] + b[k]));
  }
  const L = (h[CHAIN_N - 1] - 0.5) ** 2;
  const g = new Array(CHAIN_N).fill(0);
  g[CHAIN_N - 1] = 2 * (h[CHAIN_N - 1] - 0.5);
  for (let k = CHAIN_N - 1; k > 0; k--) g[k - 1] = g[k] * w[k] * (1 - h[k] * h[k]);
  CH = { w, b, h, g, L };
  return CH;
}
