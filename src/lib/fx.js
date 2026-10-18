// Energy layers (GPU particles), shared by all chapters. Every one is a pure function of t: static point sets built
// once (ctx.memo), animated only through the swarm uniforms (morph p, time, alpha, model matrix).
//   embers     a glowing field of particles around me with depth-of-field bokeh (the "look" of the film)
//   burst      an explosion: particles fly from a sphere of radius r0 out to r1 and fade
//   stream     particles fly out of a source point and settle on target points (things are built from my energy)
//   shockwave  an expanding ring of light in a plane
//   flow       energy sliding along a parametric curve f(u), once per beat (currents, gradients, rays)
//   beatPulse  the beat as energy: a ring and a burst out of a point on every beat, as loud as the drums
//   beatKick   the camera's push on every beat (a factor for the orbit distance), as loud as the drums
//   beatEnv    0..1: the current beat's envelope (decays over the beat), as loud as the drums (for glows, bloom)
import * as THREE from 'three';
import { COLOR } from '../theme.js';
import { Swarm } from '../engine/gl/swarm.js';
import { rand, randn } from './hash.js';
import { clamp, easeOutCubic, decay } from './ease.js';

const unitDir = (i, seed) => {
  const z = rand(i, seed, 1) * 2 - 1, a = rand(i, seed, 2) * Math.PI * 2, r = Math.sqrt(1 - z * z);
  return [r * Math.cos(a), z, r * Math.sin(a)];
};
const translate = (p) => new THREE.Matrix4().makeTranslation(p[0], p[1], p[2] ?? 0);

// o: { center, radius: [inner, outer], n, focus, aperture, size, alpha, seed, color, color2, drift, time, squash, upper }
//   upper: only the upper hemisphere (a sky of stars above a floor)
export function embers(ctx, o = {}) {
  const { n = 1800, seed = 71, radius = [1.6, 7], squash = 0.6, upper = false } = o;
  const sw = ctx.memo(`embers:${seed}:${n}:${radius}:${squash}:${upper}`, () => {
    const pts = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const d = unitDir(i, seed), r = radius[0] + (radius[1] - radius[0]) * Math.cbrt(rand(i, seed, 3));
      pts[i * 3] = d[0] * r; pts[i * 3 + 1] = (upper ? Math.abs(d[1]) : d[1]) * r * squash; pts[i * 3 + 2] = d[2] * r;
    }
    return new Swarm({ from: pts, seed });
  });
  ctx.swarm(sw, {
    p: 0, model: o.model ?? translate(o.center ?? [0, 0, 0]), size: o.size ?? 3, sizeVar: 0.7, perspective: o.perspective ?? true,
    focus: o.focus ?? 7, aperture: o.aperture ?? 10, drift: o.drift ?? 0.35, time: o.time ?? ctx.t * 0.5,
    color: o.color ?? COLOR.me, color2: o.color2 ?? o.color ?? COLOR.me, colorVar: 0.25, alpha: o.alpha ?? 0.75, fog: o.fog,
  });
}

// p: 0..1 progress of the explosion; alpha falls off as it expands
export function burst(ctx, o = {}) {
  const { n = 2400, seed = 83, r0 = 0.2, r1 = 4, p = 0 } = o;
  if (p <= 0 || p >= 1) return;
  const sw = ctx.memo(`burst:${seed}:${n}:${r0}:${r1}`, () => {
    const from = new Float32Array(n * 3), to = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const d = unitDir(i, seed), k = 0.35 + 0.65 * rand(i, seed, 4);
      for (let c = 0; c < 3; c++) { from[i * 3 + c] = d[c] * r0; to[i * 3 + c] = d[c] * r1 * k; }
    }
    return new Swarm({ from, to, seed });
  });
  const e = easeOutCubic(p);
  ctx.swarm(sw, {
    p: e, stagger: o.stagger ?? 0.15, model: translate(o.center ?? [0, 0, 0]), size: o.size ?? 3.4, sizeVar: 0.8,
    perspective: o.perspective ?? true, focus: o.focus ?? 0, aperture: o.aperture ?? 6, scatter: o.scatter ?? 0.25,
    // fade in over the first few % (no single-frame white-out where all particles still overlap), out as it expands
    color: o.color ?? COLOR.ink, color2: o.color2 ?? COLOR.me, alpha: (o.alpha ?? 1) * (1 - p) ** 1.4 * Math.min(1, p / 0.08), time: ctx.t,
  });
}

// targets: () => Float32Array (x,y,z per particle), built once under `key`; source: [x,y,z]; p: 0..1
export function stream(ctx, o) {
  const { key, targets, source = [0, 0, 0], p = 1, seed = 97 } = o;
  if (p <= 0) return;
  const sw = ctx.memo(`stream:${key}`, () => {
    const to = targets();
    const n = to.length / 3, from = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) from[i * 3 + c] = source[c] + randn(i, seed, c) * 0.08;
    return new Swarm({ from, to, seed });
  });
  ctx.swarm(sw, {
    p: clamp(p), stagger: o.stagger ?? 0.8, size: o.size ?? 2.6, sizeVar: 0.6, perspective: true, focus: o.focus ?? 0,
    aperture: o.aperture ?? 6, scatter: o.scatter ?? 0.6, drift: o.drift ?? 0.02, time: ctx.t,
    // birth: particles waiting on the source are invisible (otherwise they add up to a white blob)
    birth: true, color: o.color ?? COLOR.ink, color2: o.color2 ?? COLOR.me, alpha: o.alpha ?? 0.9, fog: o.fog,
  });
}

// ring of radius r around center in the plane spanned by u, v (unit vectors); alpha fades as it grows
export function shockwave(ctx, { center = [0, 0, 0], u = [1, 0, 0], v = [0, 0, 1], r = 1, alpha = 1, color = COLOR.me, width = 3, ref = 7 } = {}) {
  if (alpha <= 0.003) return;
  const pts = Array.from({ length: 129 }, (_, i) => {
    const a = (i / 128) * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r;
    return [center[0] + c * u[0] + s * v[0], center[1] + c * u[1] + s * v[1], center[2] + c * u[2] + s * v[2]];
  });
  ctx.line(pts, { color, width, alpha, glow: 14, glowStrength: 0.4, persp: ref });
}

// points sampled along line segments [[a, b], …] (for stream targets), n per unit length (≥ 2 per segment)
export function sampleSegments(segs, perUnit = 40, seed = 5, jitter = 0.01) {
  const out = [];
  segs.forEach(([a, b], s) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const m = Math.max(2, Math.round(L * perUnit));
    for (let i = 0; i < m; i++) {
      const k = rand(s, i, seed);
      for (let c = 0; c < 3; c++) out.push(a[c] + (b[c] - a[c]) * k + randn(s * 977 + i, c, seed) * jitter);
    }
  });
  return new Float32Array(out);
}

// energy flowing along a parametric curve f(u) toward +u: each particle slides from f(u) to f(u + du) once per beat
// (two interleaved sets half a beat apart, each fading in and out, so the flow never blinks)
// rate: trips per beat (du < 0 flows backward) · model: a matrix applied to the static curve (a moving object)
export function flow(ctx, key, f, { u0, u1, du = 0.5, n = 1600, ref, fog, alpha = 1, color = COLOR.me, color2 = COLOR.ink, size = 3, jitter = 0.03, rate = 1, model }) {
  const sw = ctx.memo(`flow:${key}`, () => {
    const from = new Float32Array(n * 3), to = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = u0 + rand(i, 7, 1) * (u1 - u0), a = f(u), b = f(u + du);
      for (let c = 0; c < 3; c++) { const j = randn(i, c, 9) * jitter; from[i * 3 + c] = a[c] + j; to[i * 3 + c] = b[c] + j; }
    }
    return new Swarm({ from, to, seed: 9 });
  });
  const beat = ctx.T.beatAt(ctx.t) * rate;
  for (const off of [0, 0.5]) {
    const p = (((beat + off) % 1) + 1) % 1;
    ctx.swarm(sw, { p, stagger: 0, scatter: 0, size, sizeVar: 0.7, perspective: true, focus: ref, aperture: 3, color, color2, colorVar: 0.3, alpha: alpha * Math.sin(Math.PI * p), fog, model });
  }
}

// the beat as energy: on every `every` beats a ring (in the plane u, v) and a burst out of `center`, scaled by how loud
// the drums are on that beat (features rms_drums). The last beat's ring is still fading when the next one starts.
// The burst starts at r0 = 0.25·r1 with a coloured core and fades in over 2 frames (never a white ball).
export function beatPulse(ctx, { center = [0, 0, 0], u = [1, 0, 0], v = [0, 0, 1], r1 = 3, ref = 7, color = COLOR.me, color2 = COLOR.warm, seed = 4000, every = 1, dur = 1, alpha = 0.6, n = 900, size = 2.8, ring = true, burst: withBurst = true, perspective = true } = {}) {
  const { T, F, t } = ctx;
  const k0 = Math.floor(T.beatAt(t) / every);
  for (let k = k0; k > k0 - 2; k--) {
    const tb = T.beatTime(k * every), dt = t - tb, p = (dt + 2 / 60) / T.beats(dur * every);
    if (dt < 0 || p >= 1) continue;
    const g = (0.35 + 0.65 * F.get('rms_drums', tb)) * alpha;
    if (ring) shockwave(ctx, { center, u, v, r: 0.25 * r1 + 0.75 * r1 * easeOutCubic(p), alpha: 0.8 * g * (1 - p) * clamp(dt * 30 + 0.5), color, ref, width: 2.4 });
    if (withBurst) burst(ctx, { center, seed: seed + (((k % 4) + 4) % 4), n, r0: 0.25 * r1, r1, p, focus: ref, aperture: 3, size, alpha: g * clamp(dt * 30), color, color2, perspective });
  }
}

// the camera's push on every beat: multiply an orbit distance by this (1 − up to `amount`, decaying over the beat)
export function beatKick(ctx, amount = 0.05) {
  return 1 - amount * beatEnv(ctx, 6);
}
export function beatEnv(ctx, k = 5) {
  const { T, F, t } = ctx;
  const b = T.beatAt(t), i = Math.floor(b);
  return (0.35 + 0.65 * F.get('rms_drums', T.beatTime(i))) * decay(b - i, k);
}
