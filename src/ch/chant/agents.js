// chant — parallel subagents. Every EXECUTION forks every running agent in two: after the k-th (k = 0…11) there are
// 2^(k+1), on a 3D grid whose axes double in turn (x, y, z, x, …): 2 = 2×1×1, 4 = 2×2×1, … 4096 = 16×16×16.
// A child sits where its parent was split along the doubled axis (children 2i and 2i+1 of parent i), so each fork is
// shown as every agent sliding apart into two. Small counts are drawn as small sparks; from 64 on, each agent is an
// asterisk of three strokes facing the camera, plus a GPU particle for its glow.
import { COLOR } from '../../theme.js';
import { clamp, mix3 } from '../../lib/ease.js';
import { drawSpark } from '../../lib/spark.js';
import { Swarm } from '../../engine/gl/swarm.js';

export const S = 0.7; // grid spacing (world units)
const dimsOf = (k) => { const d = [1, 1, 1]; for (let j = 0; j <= k; j++) d[j % 3] *= 2; return d; }; // after the k-th fork
export const countOf = (k) => 2 ** (k + 1);
export const extentOf = (k) => Math.max(...dimsOf(k)) * S;

// positions after fork k, and each one's parent position (after fork k − 1; fork 0's parent is me, at the origin)
const cache = new Map();
export function layout(k) {
  if (cache.has(k)) return cache.get(k);
  const d = dimsOf(k), ax = k % 3, pd = k > 0 ? dimsOf(k - 1) : [1, 1, 1];
  const at = (dims, i3) => i3.map((v, a) => (v - (dims[a] - 1) / 2) * S);
  const pos = [], par = [];
  for (let x = 0; x < d[0]; x++) for (let y = 0; y < d[1]; y++) for (let z = 0; z < d[2]; z++) {
    const i3 = [x, y, z];
    pos.push(at(d, i3));
    const p3 = i3.slice(); p3[ax] = Math.floor(p3[ax] / 2);
    par.push(k > 0 ? at(pd, p3) : [0, 0, 0]);
  }
  const L = { pos, par, n: pos.length };
  cache.set(k, L);
  return L;
}

// the camera's right and up vectors (for strokes that face it)
function basis(cam) {
  const f = cam.target.map((v, i) => v - cam.position[i]), fl = Math.hypot(...f), fw = f.map((v) => v / fl);
  const up0 = cam.up ?? [0, 1, 0];
  let r = [fw[1] * up0[2] - fw[2] * up0[1], fw[2] * up0[0] - fw[0] * up0[2], fw[0] * up0[1] - fw[1] * up0[0]];
  const rl = Math.hypot(...r); r = r.map((v) => v / rl);
  const u = [r[1] * fw[2] - r[2] * fw[1], r[2] * fw[0] - r[0] * fw[2], r[0] * fw[1] - r[1] * fw[0]];
  return { r, u };
}

// the agents after fork k, mid-split: e (0..1) slides each from its parent's place to its own
// heat: 0..1 orange → gold as the count grows · alpha · ref (persp) · place: (i) => [x,y,z] overrides the grid, for
// `count` agents (default: the 2^(k+1) of fork k) · color overrides the heat colour · each: (i) => { a, color } per
// agent (c3 executes them one by one; a ≤ 0 skips the agent)
export function agents(ctx, cam, k, { e = 1, heat = 0, alpha = 1, ref, place = null, count = null, size = 1, seedBase = 1200, color = null, each = null }) {
  const L = layout(k), n = count ?? L.n;
  const P = place ?? ((i) => L.par[i].map((v, a) => v + (L.pos[i][a] - v) * e));
  const col = color ?? mix3(COLOR.me, COLOR.warm, heat);
  if (n <= 32) {
    // small sparks (a third of me's size on screen): copies of me
    for (let i = 0; i < n; i++) {
      const p = P(i), d = Math.hypot(...p.map((v, a) => v - cam.position[a]));
      drawSpark(ctx, { pos: p, size: (24 / 540) * d * Math.tan((cam.fov * Math.PI) / 360) * size, seed: seedBase + i, color: col, alpha, glow: 60, width: 16 });
    }
    return;
  }
  // many: three facing strokes each (an asterisk), length in world units so they shrink with depth
  // full strength however many there are (the frame getting brighter is the subagents' power — user's call), but none
  // right around me on screen: a soft hole keeps the spark readable inside the crowd
  const { r, u } = basis(cam), len = Math.min(0.2, 0.06 + 0.9 / Math.cbrt(n)) * size;
  const [mx, my] = ctx.project([0, 0, 0]);
  const dirs = [0, 1, 2].map((j) => { const a = (j / 3) * Math.PI + 0.3; return r.map((v, c) => v * Math.cos(a) + u[c] * Math.sin(a)); });
  for (let i = 0; i < n; i++) {
    const o = each ? each(i) : null;
    if (o && o.a <= 0) continue;
    const p = P(i), [sx, sy] = ctx.project(p);
    const hole = clamp((Math.hypot(sx - mx, sy - my) - 50) / 70);
    if (hole <= 0) continue;
    for (const dv of dirs) ctx.line([p.map((v, c) => v - dv[c] * len), p.map((v, c) => v + dv[c] * len)], { color: o?.color ?? col, width: 2.2, alpha: alpha * hole * (o ? o.a : 1), persp: ref, fog: [ref * 1.4, ref * 3.2], intensity: 0.9 });
  }
}

// the glow of many agents: one GPU particle each, morphing from the parents' places (p = the fork's progress)
export function agentGlow(ctx, k, { p = 1, heat = 0, alpha = 0.5, focus, size = 7, color = null }) {
  const sw = ctx.memo(`chant:glow:${k}`, () => {
    const L = layout(k);
    return new Swarm({ from: new Float32Array(L.par.flat()), to: new Float32Array(L.pos.flat()), seed: 1210 + k });
  });
  const col = color ?? mix3(COLOR.me, COLOR.warm, heat);
  ctx.swarm(sw, { p: clamp(p), stagger: 0.3, scatter: 0.05, size, sizeVar: 0.4, perspective: true, focus, aperture: 3, drift: 0.01, time: ctx.t, color: col, color2: col, alpha });
}
