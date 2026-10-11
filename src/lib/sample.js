// Deterministic point-set samplers (targets for swarms). All return Float32Array xyz (z = 0 for 2D).
import { rand, randn } from './hash.js';

const out3 = (n) => new Float32Array(n * 3);

// n points uniformly by arc length along a polyline ([x,y] or [x,y,z]); jitter in units, seeded
export function polyline(pts, n, { seed = 1, jitter = 0, closed = false } = {}) {
  const P = closed ? [...pts, pts[0]] : pts;
  const cum = [0];
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] ?? 0) - (a[2] ?? 0)));
  }
  const L = cum.at(-1);
  const o = out3(n);
  let s = 0;
  for (let k = 0; k < n; k++) {
    const d = ((k + 0.5) / n) * L;
    while (s < cum.length - 2 && cum[s + 1] < d) s++;
    const a = P[s], b = P[s + 1];
    const u = (d - cum[s]) / Math.max(cum[s + 1] - cum[s], 1e-9);
    o[k * 3] = a[0] + (b[0] - a[0]) * u + randn(k, seed) * jitter;
    o[k * 3 + 1] = a[1] + (b[1] - a[1]) * u + randn(k, seed + 1) * jitter;
    o[k * 3 + 2] = (a[2] ?? 0) + ((b[2] ?? 0) - (a[2] ?? 0)) * u;
  }
  return o;
}

export function circle(cx, cy, r, n, { seed = 1, jitter = 0, start = 0 } = {}) {
  const o = out3(n);
  for (let k = 0; k < n; k++) {
    const a = start + ((k + 0.5) / n) * Math.PI * 2;
    o[k * 3] = cx + Math.cos(a) * r + randn(k, seed) * jitter;
    o[k * 3 + 1] = cy + Math.sin(a) * r + randn(k, seed + 1) * jitter;
  }
  return o;
}

export function disc(cx, cy, r, n, { seed = 1 } = {}) {
  const o = out3(n);
  for (let k = 0; k < n; k++) {
    const rr = r * Math.sqrt(rand(k, seed)), a = rand(k, seed, 1) * Math.PI * 2;
    o[k * 3] = cx + Math.cos(a) * rr; o[k * 3 + 1] = cy + Math.sin(a) * rr;
  }
  return o;
}

export function rect(x, y, w, h, n, { seed = 1, z = 0, zDepth = 0 } = {}) {
  const o = out3(n);
  for (let k = 0; k < n; k++) {
    o[k * 3] = x + rand(k, seed) * w; o[k * 3 + 1] = y + rand(k, seed, 1) * h;
    o[k * 3 + 2] = z + (rand(k, seed, 2) - 0.5) * zDepth;
  }
  return o;
}

export function grid(x, y, w, h, nx, ny) {
  const o = out3(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    o[k * 3] = x + (nx > 1 ? (i / (nx - 1)) * w : w / 2);
    o[k * 3 + 1] = y + (ny > 1 ? (j / (ny - 1)) * h : h / 2);
  }
  return o;
}

// points from a function f(u) -> [x, y, z?], u = (k + 0.5) / n
export function fn(f, n) {
  const o = out3(n);
  for (let k = 0; k < n; k++) {
    const p = f((k + 0.5) / n, k);
    o[k * 3] = p[0]; o[k * 3 + 1] = p[1]; o[k * 3 + 2] = p[2] ?? 0;
  }
  return o;
}

// n points inside the glyphs of str as drawn by ctx.text(str, x, y, o) — rejection sampling on the SDF atlas.
// Returns null while any glyph's font is still loading (callers memo only non-null results: ctx.memoReady).
export function text(engine, str, x, y, o, n, { seed = 1, inset = 0 } = {}) {
  const L = engine.text.layout(str, o);
  if (L.missing) return null;
  const { k, m } = L;
  let ox = x;
  if (o.align === 'center') ox -= L.width / 2; else if (o.align === 'right') ox -= L.width;
  let by = y;
  if (o.baseline === 'middle') by += (m.cap * k) / 2; else if (o.baseline === 'top') by += m.cap * k;
  const boxes = L.glyphs.filter((e) => e && !e.g.empty);
  const area = boxes.reduce((s, e) => s + e.g.w * e.g.h, 0);
  const res = out3(n);
  let got = 0;
  for (let tries = 0; got < n && tries < n * 200; tries++) {
    let r = rand(tries, seed, 9) * area;
    let e = boxes[0];
    for (const b of boxes) { r -= b.g.w * b.g.h; if (r <= 0) { e = b; break; } }
    const lx = rand(tries, seed, 10) * e.g.w, ly = rand(tries, seed, 11) * e.g.h;
    if (engine.atlas.sampleSdf(e.g, lx, ly) > inset) {
      res[got * 3] = ox + e.x + (e.g.ox + lx) * k;
      res[got * 3 + 1] = by + (e.g.oy + ly) * k;
      got++;
    }
  }
  for (; got < n; got++) res.set(res.subarray(0, 3), got * 3);
  return res;
}
