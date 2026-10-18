// The sand on the Chladni plate as a 3D contour map. The height of the terrain over each cell is how much sand lies
// there: the real grains of a settled figure, counted on a G × G grid and smoothed (Gaussian, σ = 3 cells), so the
// nodal lines become ridges. Contour lines (marching squares) are drawn at their own height, like a topographic map.
import { S } from './chladni.js';

export const G = 72;

// grains (x, 0, z per grain, plate coordinates) → smoothed density grid; heights are √density (so the strongest
// ridges do not tower over the rest), normalised so the 98th percentile is 1. Grains pressed against the rim (where
// the walk stops them) are left out: they would raise a wall around the whole plate.
export function densityGrid(P) {
  const N = P.length / 3, raw = new Float32Array(G * G);
  for (let i = 0; i < N; i++) {
    if (Math.max(Math.abs(P[i * 3]), Math.abs(P[i * 3 + 2])) > 0.985 * S) continue;
    const gx = Math.min(G - 1, Math.max(0, Math.floor(((P[i * 3] / S + 1) / 2) * G)));
    const gz = Math.min(G - 1, Math.max(0, Math.floor(((P[i * 3 + 2] / S + 1) / 2) * G)));
    raw[gz * G + gx]++;
  }
  const k = [], sig = 3, R = 7;
  for (let d = -R; d <= R; d++) k.push(Math.exp(-(d * d) / (2 * sig * sig)));
  const ks = k.reduce((a, b) => a + b, 0);
  const tmp = new Float32Array(G * G), out = new Float32Array(G * G);
  for (let z = 0; z < G; z++) for (let x = 0; x < G; x++) {
    let s = 0;
    for (let d = -R; d <= R; d++) { const xx = Math.min(G - 1, Math.max(0, x + d)); s += raw[z * G + xx] * k[d + R]; }
    tmp[z * G + x] = s / ks;
  }
  for (let z = 0; z < G; z++) for (let x = 0; x < G; x++) {
    let s = 0;
    for (let d = -R; d <= R; d++) { const zz = Math.min(G - 1, Math.max(0, z + d)); s += tmp[zz * G + x] * k[d + R]; }
    out[z * G + x] = s / ks;
  }
  for (let i = 0; i < out.length; i++) out[i] = Math.sqrt(out[i]);
  const sorted = Array.from(out).sort((a, b) => a - b), top = sorted[Math.floor(0.98 * (sorted.length - 1))] || 1;
  // the terrain falls to the plate over its outer 2 cells (nothing floats off the edge)
  for (let z = 0; z < G; z++) for (let x = 0; x < G; x++) {
    const e = Math.min(x, z, G - 1 - x, G - 1 - z), f = Math.min(1, e / 2);
    out[z * G + x] = Math.min(1.15, out[z * G + x] / top) * f;
  }
  return out;
}
// the height of the grid at plate point (x, z): bilinear
export function heightAt(h, x, z) {
  const fx = Math.min(G - 1.001, Math.max(0, ((x / S + 1) / 2) * G - 0.5)), fz = Math.min(G - 1.001, Math.max(0, ((z / S + 1) / 2) * G - 0.5));
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  const a = h[j * G + i], b = h[j * G + i + 1], c = h[(j + 1) * G + i], d = h[(j + 1) * G + i + 1];
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
// grains lifted onto the terrain (each at the height of the ground where it lies)
export function lifted(P, h, H) {
  const Q = new Float32Array(P);
  for (let i = 0; i < Q.length / 3; i++) Q[i * 3 + 1] = H * heightAt(h, Q[i * 3], Q[i * 3 + 2]);
  return Q;
}

export const cellX = (i) => ((i + 0.5) / G * 2 - 1) * S;

// marching squares: the polylines where the grid crosses `level` (grid coordinates, fractional), chained end to end
export function contour(h, level) {
  const segs = [];
  const at = (x, z) => h[z * G + x];
  const lerpE = (a, b) => (level - a) / (b - a);
  for (let z = 0; z < G - 1; z++) for (let x = 0; x < G - 1; x++) {
    const a = at(x, z), b = at(x + 1, z), c = at(x + 1, z + 1), d = at(x, z + 1);
    const pts = [];
    // edges: 0 top (a-b), 1 right (b-c), 2 bottom (d-c), 3 left (a-d); each crossing keyed by its edge
    if ((a < level) !== (b < level)) pts.push({ k: `h${x},${z}`, p: [x + lerpE(a, b), z] });
    if ((b < level) !== (c < level)) pts.push({ k: `v${x + 1},${z}`, p: [x + 1, z + lerpE(b, c)] });
    if ((d < level) !== (c < level)) pts.push({ k: `h${x},${z + 1}`, p: [x + lerpE(d, c), z + 1] });
    if ((a < level) !== (d < level)) pts.push({ k: `v${x},${z}`, p: [x, z + lerpE(a, d)] });
    if (pts.length === 2) segs.push([pts[0], pts[1]]);
    else if (pts.length === 4) { segs.push([pts[0], pts[3]]); segs.push([pts[1], pts[2]]); } // saddle: one choice, consistently
  }
  // chain the segments through their shared edge keys
  const by = new Map();
  segs.forEach((s, i) => { for (const e of s) { if (!by.has(e.k)) by.set(e.k, []); by.get(e.k).push(i); } });
  const used = new Uint8Array(segs.length), lines = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const line = [segs[i][0], segs[i][1]];
    for (const dir of [1, 0]) {
      for (;;) {
        const end = dir ? line[line.length - 1] : line[0];
        const next = (by.get(end.k) || []).find((j) => !used[j]);
        if (next === undefined) break;
        used[next] = 1;
        const s = segs[next], other = s[0].k === end.k ? s[1] : s[0];
        if (dir) line.push(other); else line.unshift(other);
      }
    }
    if (line.length >= 5) lines.push(line.map((e) => e.p)); // shorter pieces are noise, not ground
  }
  return lines;
}
