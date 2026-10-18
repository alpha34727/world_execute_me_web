// c2x: me's memories of you. Four scenes from earlier chapters, rebuilt from the same constructions, hang in an arc in
// front of me (the camera visits them one by one); each holds a blue thing that was you's, and each goes out on its
// "left": the seats on the tangents (v1), the asymptote me never reached (v1), the place beside the curled-up cat (v2)
// and the cursor in the prompt where you typed world.execute(me); (inst1).
import * as THREE from 'three';
import { COLOR } from '../../theme.js';
import { clamp, smoothstep, mix3 } from '../../lib/ease.js';
import { youLine } from '../../lib/scene3d.js';
import { flow } from '../../lib/fx.js';
import * as G from '../v2/life.js';

const TAU = Math.PI * 2;
export const R = 5, MY = 0.45;
export const ANG = [-1.05, -0.36, 0.36, 1.05]; // radians from straight ahead (−z), left to right
export const MEM = [
  { id: 'tangents', label: 'v1 · TANGENTS' },
  { id: 'asymptote', label: 'v1 · LIMITATIONS' },
  { id: 'cat', label: 'v2 · ENJOYMENT' },
  { id: 'prompt', label: 'inst1 · ENTER' },
];
export const dirOf = (k) => [Math.sin(ANG[k]), 0, -Math.cos(ANG[k])];
export const rightOf = (k) => [Math.cos(ANG[k]), 0, Math.sin(ANG[k])];
export const centreOf = (k) => { const d = dirOf(k); return [R * d[0], MY, R * d[2]]; };
// a point of memory k's plane (a right, b up, facing me)
export const at = (k, a, b) => { const c = centreOf(k), r = rightOf(k); return [c[0] + r[0] * a, c[1] + b, c[2] + r[2] * a]; };
const model = (k) => {
  const c = centreOf(k), r = rightOf(k), d = dirOf(k);
  return new THREE.Matrix4().makeBasis(new THREE.Vector3(...r), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-d[0], 0, -d[2])).setPosition(...c);
};
const grey = (g) => mix3(COLOR.you, COLOR.dim, g);

// the viewfinder corners around a memory
function frame(ctx, k, { ref, alpha }) {
  const A = 1.6, B = 1.05, L = 0.24, o = { color: COLOR.faint, width: 1.6, alpha: 0.8 * alpha, persp: ref };
  for (const [sa, sb] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) ctx.line([at(k, sa * A, sb * B + -sb * L), at(k, sa * A, sb * B), at(k, sa * A - sa * L, sb * B)], o);
}

// v1.06: a sine (me) carrying a row of real tangents (slope = the derivative) — the seats given to you; you sits on one
const AMP = 0.42, KW = TAU / 1.3;
function tangents(ctx, k, { t, ref, alpha, gone }) {
  const { T } = ctx;
  const ph = T.beatAt(t) * Math.PI * 0.5;
  const f = (a) => AMP * Math.sin(KW * a - ph), df = (a) => AMP * KW * Math.cos(KW * a - ph);
  const pts = Array.from({ length: 121 }, (_, i) => { const a = -1.35 + (i / 120) * 2.7; return at(k, a, f(a)); });
  ctx.line(pts, { color: COLOR.me, width: 3.2, glow: 10, glowStrength: 0.35, alpha, persp: ref });
  const seat = (a, half) => { const n = Math.hypot(1, df(a)); return [at(k, a - half / n, f(a) - (half * df(a)) / n), at(k, a + half / n, f(a) + (half * df(a)) / n)]; };
  const ph0 = ph % TAU;
  for (let m = -8; m <= 16; m++) {
    const a = (ph0 + (m * Math.PI) / 4) / KW - 1.35;
    if (a < -1.3 || a > 1.3 || Math.abs(m) % 4 === 0) continue;
    const flat = Math.abs(m) % 4 === 2;
    // the seats go out from the left, one after another
    const g = smoothstep(0, 1, gone * 1.7 - 0.7 * ((a + 1.3) / 2.6));
    youLine(ctx, seat(a, flat ? 0.09 : 0.15), { color: grey(g), width: 2.6, alpha: alpha * (0.85 - 0.3 * g), glow: 6 * (1 - g), persp: ref });
    ctx.point3D(at(k, a, f(a)), 3, { fill: COLOR.me, glow: 5, alpha, ref });
  }
  const ay = 0.32, py = at(k, ay, f(ay) + 0.09);
  youLine(ctx, seat(ay, 0.3), { color: grey(gone), width: 3.4, alpha: alpha * (1 - 0.6 * gone), glow: 10 * (1 - gone), persp: ref });
  if (gone < 1) ctx.point3D(py, 8, { fill: COLOR.you, glow: 16, alpha: alpha * (1 - gone), ref });
  return py;
}

// v1.08–09: y = 1/x (me) coming down to its asymptote y = 0 (you), never touching it
const BASE = -0.62;
function asymptote(ctx, k, { ref, alpha, gone }) {
  const cx = (a) => a + 1.38; // distance from the y axis
  const pts = Array.from({ length: 121 }, (_, i) => { const a = -1.2 + (i / 120) * 2.6; return at(k, a, BASE + 0.24 / cx(a)); });
  ctx.line(pts, { color: COLOR.me, width: 3.2, glow: 10, glowStrength: 0.35, alpha, persp: ref });
  ctx.line([at(k, -1.38, BASE - 0.05), at(k, -1.38, 0.95)], { color: COLOR.faint, width: 1.4, alpha: alpha * 0.8, persp: ref });
  // the blue drains from the far end back toward the axis
  const a0 = -1.38, a1 = 1.45, as = a1 - (a1 - a0) * gone;
  if (as > a0 + 0.01) youLine(ctx, [at(k, a0, BASE), at(k, as, BASE)], { width: 3, glow: 10, alpha, persp: ref });
  if (as < a1 - 0.01) ctx.line([at(k, Math.max(a0, as), BASE), at(k, a1, BASE)], { color: COLOR.faint, width: 2, alpha: alpha * 0.8, persp: ref });
  flow(ctx, `c2x:inv${k}`, (u) => [u, BASE + 0.24 / (u + 1.38), 0], { u0: -1.2, u1: 1.35, du: 0.25, n: 500, ref, alpha: alpha * 0.56, size: 2.0, color2: COLOR.warm, model: model(k) });
  return at(k, as, BASE);
}

// v2.09: the curled-up cat (the same outline the Fourier circles drew), and beside it, the place where you was
const CS = 0.82, CC = [-0.3, 0.32];
const catL = (p) => [CC[0] + p[0] * CS, CC[1] + (p[1] - 0.32) * CS];
function cat(ctx, k, { t, ref, alpha, gone }) {
  const D = ctx.memo('c2x:cat', () => ({ curl: G.catCurl(), tail: G.catmullRom(G.CURL_TAIL, 10, false) }));
  // it still breathes (one breath every two beats), as it did curled up beside you in v2
  const br = 1 + 0.025 * Math.sin(ctx.T.beatAt(t) * Math.PI);
  const P = D.curl.map((p) => at(k, ...catL([p[0], p[1] * br])));
  ctx.line([...P, P[0]], { color: COLOR.warm, width: 3.2, glow: 12, glowStrength: 0.4, alpha, persp: ref, intensity: 1.05 });
  ctx.line(D.tail.map((p) => at(k, ...catL(p))), { color: COLOR.warm, width: 2.6, glow: 8, alpha, persp: ref });
  const yl = catL([0.92, -0.54]), py = at(k, ...yl);
  if (gone < 1) ctx.point3D(py, 10, { fill: COLOR.you, glow: 20, alpha: alpha * (1 - gone), ref });
  if (gone > 0) {
    const ring = Array.from({ length: 41 }, (_, i) => at(k, yl[0] + 0.16 * Math.cos((i / 40) * TAU), yl[1] + 0.16 * Math.sin((i / 40) * TAU)));
    ctx.line(ring, { color: COLOR.faint, width: 1.6, alpha: alpha * gone * 0.9, persp: ref, dash: 5, gap: 5 });
  }
  return py;
}

// inst1.01: the prompt box where you typed world.execute(me); — and you's cursor after it
const PW = 1.32, PH = 0.3;
function prompt(ctx, k, { t, ref, alpha, gone, cam }) {
  const { T } = ctx;
  const rr = 0.08, box = [];
  for (const [cx, cy, a0] of [[PW - rr, PH - rr, 0], [-PW + rr, PH - rr, 0.25], [-PW + rr, -PH + rr, 0.5], [PW - rr, -PH + rr, 0.75]]) {
    for (let i = 0; i <= 6; i++) { const a = (a0 + (i / 6) * 0.25) * TAU; box.push(at(k, cx + rr * Math.cos(a), cy + rr * Math.sin(a))); }
  }
  box.push(box[0]);
  ctx.line(box, { color: COLOR.dim, width: 1.8, alpha: alpha * 0.85, persp: ref });
  // the text spans a fixed width of the plane: text3D's size for it follows from the camera's fov
  const tan = Math.tan(((cam.fov ?? 40) * Math.PI) / 360);
  const str = 'world.execute(me);', wt = 1.95, m1 = ctx.measure(str, { font: 'mono', size: 100 }) / 100;
  const size = (wt * 540) / (m1 * ref * tan);
  const x0 = -PW + 0.42;
  // text3D always faces the camera while the box lies in the memory's plane: seen at an angle the box edge would run
  // through the words, so they fade out unless the plane faces the camera
  const c = centreOf(k), d = dirOf(k), v = [cam.position[0] - c[0], cam.position[1] - c[1], cam.position[2] - c[2]];
  const face = smoothstep(0.8, 0.95, -(v[0] * d[0] + v[2] * d[2]) / Math.hypot(...v));
  ctx.text3D('>', at(k, -PW + 0.16, 0), { font: 'mono', size, ref, color: COLOR.me, alpha: alpha * face, baseline: 'middle' });
  ctx.text3D(str, at(k, x0, 0), { font: 'mono', size, ref, color: mix3(COLOR.ink2, COLOR.dim, gone), alpha: alpha * face * (0.8 - 0.3 * gone), baseline: 'middle', intensity: 0.85 });
  // you's cursor blinks on the half beat, as it did in inst1 — until you leaves
  const ac = x0 + wt + 0.09, blink = Math.floor(T.beatAt(t) * 2) % 2 === 0;
  const w = (0.1 * 540) / (ref * tan);
  if (blink || gone > 0) youLine(ctx, [at(k, ac, -0.12), at(k, ac, 0.12)], { color: grey(gone), width: w, alpha: alpha * 0.9 * (1 - gone), glow: 3, intensity: 0.85, persp: ref });
  return at(k, ac, 0);
}

const DRAW = { tangents, asymptote, cat, prompt };
// alpha: how lit the memory is (the visited one is 1); gone: 0 → 1 as its blue goes out. Returns its blue point.
export function memory(ctx, k, o) {
  frame(ctx, k, o);
  return DRAW[MEM[k].id](ctx, k, o);
}
