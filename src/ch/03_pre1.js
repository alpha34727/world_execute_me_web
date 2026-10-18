// 03 pre1 — every line is a part of a neural network, played as its literal physics: a switched current, a
// rectifier (ReLU is a diode), dropout blinding the vision, gradient descent with momentum going round and round,
// a forward pass in time and backpropagation as time running backward, a residual connection uniting x and f(x),
// and depth. Storyboard: docs/storyboard.md §03 · review: docs/review/pre1.md.
import * as THREE from 'three';
import { chapter } from '../engine/timeline.js';
import { COLOR } from '../theme.js';
import { editBody } from '../lib/edits.js';
import { Swarm } from '../engine/gl/swarm.js';
import { corners } from '../lib/hud.js';
import { clamp, lerp, easeOutCubic, easeInOutCubic, smoothstep, decay } from '../lib/ease.js';
import { rand, randn } from '../lib/hash.js';
import { sparkAt } from '../lib/spark.js';
import { orbit, shake, add3, lerp3 } from '../lib/camera.js';
import { axisGizmo, dust, labels3D, youLine } from '../lib/scene3d.js';
import { transcript } from '../lib/cc.js';
import { embers, burst, shockwave, flow } from '../lib/fx.js';
import { STAGES, dcLevel, heavyBall, loss, HB, chain, CHAIN_N } from './pre1/nets.js';

const TAU = Math.PI * 2;
const start = (T) => T.cut(T.section('pre1').start);
const L = (T, text, n = 0) => T.findLine(text, n, 'pre1');
const Wd = (T, line, text) => L(T, line).words.find((w) => w.text === text);
const lineStart = (T, text) => L(T, text).words[0].start;
const fb = (T, t) => { const b = T.beatAt(t); return b - Math.floor(b); };
// neutral background embers (orange belongs to me and its energy)
const field = (ctx, focus, o = {}) => embers(ctx, { radius: [2.5, 10], n: 3000, focus, aperture: 5, size: 3.2, alpha: 0.8, color: COLOR.dim, color2: COLOR.ink2, seed: 240, ...o });
const DIFF_END = (T) => T.cut(lineStart(T, 'To AC to DC')) + T.beats(1.25); // ~4 readable beats
const label = (p, text, o = {}) => ({ p, id: text, text, priority: 10, o: { font: 'mono', size: 22, minSize: 20, maxSize: 24, color: COLOR.ink2, backing: 0.7, ref: 8, ...o } });

// ---- pre1.01: the full-bridge rectifier ---------------------------------------------------------------------------
// me is an AC source, I = sin(π·beats): it reverses every beat. Four diodes switch its current: on the positive half
// D1 and D4 conduct, on the negative half D2 and D3 — and through the load it always flows the same way (C → A).
// The scope on the right shows the input sin and the output |sin|.
const acPhase = (T, t) => Math.PI * (T.beatAt(t) - T.beatAt(T.section('pre1').start));
const polarity = (T, t) => (Math.sin(acPhase(T, t)) >= 0 ? 1 : -1);
const BR = 1.5; // the diamond's half-diagonal
const NB = [0, BR, 0], ND = [0, -BR, 0], NA = [-BR, 0, 0], NC = [BR, 0, 0]; // AC in at B (top) and D (bottom); DC out: C (+), A (−)
const SRC = [-3.6, 0, 0]; // me: the AC source
const LOAD = [[NC, [3, 0, 0], [3, -2.5, 0.35]], [[3, -2.5, 0.35], [-2.3, -2.5, 0.35], [-2.3, 0, 0.35], NA]]; // out, through the load, back
// the two conducting loops (source + → … → source −), each a polyline
const LOOP_POS = [[SRC[0], 0.35, 0], [SRC[0], BR, 0], NB, NC, [3, 0, 0], [3, -2.5, 0.35], [-2.3, -2.5, 0.35], [-2.3, 0, 0.35], NA, ND, [SRC[0], -BR, 0], [SRC[0], -0.35, 0]];
const LOOP_NEG = [[SRC[0], -0.35, 0], [SRC[0], -BR, 0], ND, NC, [3, 0, 0], [3, -2.5, 0.35], [-2.3, -2.5, 0.35], [-2.3, 0, 0.35], NA, NB, [SRC[0], BR, 0], [SRC[0], 0.35, 0]];
// the diodes: [anode, cathode, which half conducts it]
const DIODES = [{ id: 'D1', a: NB, c: NC, on: 1 }, { id: 'D2', a: ND, c: NC, on: -1 }, { id: 'D3', a: NA, c: NB, on: -1 }, { id: 'D4', a: NA, c: ND, on: 1 }];
// a point at fraction u of a polyline's length
function polyAt(pts) {
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1], q[2] - pts[i][2]));
  const L = seg.reduce((a, b) => a + b, 0);
  return (u) => {
    let d = clamp(u, 0, 1) * L, i = 0;
    while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
    const k = seg[i] ? d / seg[i] : 0;
    return [0, 1, 2].map((c) => pts[i][c] + (pts[i + 1][c] - pts[i][c]) * k);
  };
}
// a diode symbol at the middle of edge a→c: a triangle pointing at the cathode and a bar across it
function diode(ctx, a, c, { color, alpha, width = 2.2, glow = 0 }) {
  const d = [c[0] - a[0], c[1] - a[1], 0], L = Math.hypot(d[0], d[1]), u = [d[0] / L, d[1] / L, 0], n = [-u[1], u[0], 0];
  const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, 0], s = 0.24;
  const P = (x, y) => [m[0] + u[0] * x + n[0] * y, m[1] + u[1] * x + n[1] * y, 0];
  ctx.line([a, P(-s, 0)], { color: COLOR.dim, width: 1.6, alpha: 0.8, persp: 8 });
  ctx.line([P(s, 0), c], { color: COLOR.dim, width: 1.6, alpha: 0.8, persp: 8 });
  ctx.line([P(-s, s), P(-s, -s), P(s, 0), P(-s, s)], { color, width, alpha, glow, persp: 8 });
  ctx.line([P(s, s), P(s, -s)], { color, width, alpha, glow, persp: 8 });
  return m;
}

// ---- pre1.02: the rectifier, one stage per step ------------------------------------------------------------------
const STAGE_X = (k) => k * 7, HALF_W = 2.6;
const stageTimes = (T) => {
  const ac = Wd(T, 'To AC to DC', 'AC'), dc = Wd(T, 'To AC to DC', 'DC');
  const B = Math.round(T.beatAt(ac.start));
  return [ac.start, T.beatTime(B + 1), T.beatTime(B + 1.5), dc.start];
};
const stagePt = (k) => (u) => { const x = STAGE_X(k) - HALF_W + u * 2 * HALF_W; return [x, STAGES[k].f((u * 2 * HALF_W * TAU) / (2 * HALF_W) * 2), 0]; };

// ---- pre1.03: dropout --------------------------------------------------------------------------------------------
const GN = 16, GS = 0.34;
const neuron = (i, j) => [(i - 7.5) * GS, 0, (j - 7.5) * GS];
const act = (i, j) => 0.3 + 0.7 * rand(i, j, 401);
// the Bernoulli(0.5) mask of beat q (hash, not a stateful RNG): true = dropped
const dropped = (i, j, q) => rand(i * GN + j, q, 403) < 0.5;

// ---- pre1.04: the loss surface -----------------------------------------------------------------------------------
const H = (x, z) => 0.16 * loss(x, z);
const STEP_BEATS = 0.125; // one optimiser step per 32nd note

// ---- pre1.05/06: the chain -------------------------------------------------------------------------------------
const NODE = (k) => [k * 2.6, 0, 0];
const NODE_NAMES = ['x', 'h1', 'h2', 'h3', 'h4', 'h5', 'L'];
const fwdTimes = (T) => { const B = Math.round(T.beatAt(lineStart(T, 'Oh we can travel'))); return Array.from({ length: CHAIN_N }, (_, k) => T.beatTime(B + 0.5 * k)); };
const bwdTimes = (T) => {
  const ad = Wd(T, 'To A.D to B.C', 'A.D').start, bc = Wd(T, 'To A.D to B.C', 'B.C').start;
  return Array.from({ length: CHAIN_N }, (_, k) => lerp(ad, bc, (CHAIN_N - 1 - k) / (CHAIN_N - 1))); // node k's gradient arrives
};
// position along the chain at time t for arrival times arr[k] (forward: increasing k; backward: decreasing)
function along(arr, t, backward = false) {
  const n = arr.length;
  const order = backward ? arr.map((_, i) => n - 1 - i) : arr.map((_, i) => i);
  if (t <= arr[order[0]]) return order[0];
  for (let q = 0; q < n - 1; q++) {
    const a = arr[order[q]], b = arr[order[q + 1]];
    if (t < b) return lerp(order[q], order[q + 1], easeInOutCubic((t - a) / (b - a)));
  }
  return order[n - 1];
}
const nodeAt = (s) => [s * 2.6, 0, 0];
// a node's name, placed off its ring (the ring's extent is an obstacle, so the name is never struck through)
const nodeLabel = (k, rad, color = COLOR.dim) => ({ p: [NODE(k)[0], -rad - 0.12, 0], id: `n${k}`, text: `${NODE_NAMES[k]} · t=${k}`, priority: k, o: { font: 'mono', size: 14, minSize: 13, maxSize: 15, color, ref: 8 } });
const ringObstacles = (rad) => Array.from({ length: CHAIN_N }, (_, k) => [{ a: [NODE(k)[0], -rad(k), 0], b: [NODE(k)[0], rad(k), 0], r: 10 }, { a: [NODE(k)[0], 0, -rad(k)], b: [NODE(k)[0], 0, rad(k)], r: 10 }]).flat();
const gradR = (g) => 0.14 + 0.09 * clamp(Math.log10(Math.abs(g)) + 4, 0, 4); // log scale: 1e-4 .. 1

// ---- pre1.07: the residual connection ------------------------------------------------------------------------------
// x (you, blue) enters, splits at S: the skip path runs straight to ⊕; me computes f(x) through the block (orange
// arc); at ⊕ they add, y = x + f(x), and leave braided together
const SPLIT = -4, PLUS = 2.2;
const skipPt = (u) => [lerp(-8, PLUS, u), 0, 0];
const fPt = (u) => { const x = lerp(SPLIT, PLUS, u); return [x, 1.9 * Math.sin(Math.PI * u) ** 1.2, 0]; };
const braid = (ph) => (u) => { const x = lerp(PLUS, PLUS + 9, u), th = u * 9 * TAU / 4 + ph; return [x, 0.22 * Math.sin(th), 0.22 * Math.cos(th)]; };

// ---- pre1.08: depth ---------------------------------------------------------------------------------------------
const DEPTH = 2.4;
// layers passed: 1 on the beat of "deeply", then 2, 4, 8 per beat — 15 by the downbeat of the chorus
function layerTimes(T) {
  const B = Math.round(T.beatAt(Wd(T, 'So deeply so deeply', 'deeply').start));
  const out = [];
  [1, 2, 4, 8].forEach((n, i) => { for (let q = 0; q < n; q++) out.push(T.beatTime(B + i + q / n)); });
  return out;
}
const Wl = (l, i, j) => randn(i, j, 808 + l); // the intro's He-init hash (layer l = seed 808 + l)

// light-streaks the camera flies through: static in the world (they streak because the camera moves), wrapped
// into a window of length len around the camera's coordinate `base` along the axis
function streaks(ctx, base, axis, { n = 220, len = 40, r0 = 1.5, r1 = 7, speed = 1, alpha = 1, seed = 41 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = rand(i, 1, seed) * TAU, r = r0 + (r1 - r0) * rand(i, 2, seed) ** 1.3;
    const s = (((rand(i, 3, seed) * len - base) % len) + len) % len - len / 2 + base;
    const L0 = 0.15 + 0.05 * speed * (0.6 + 0.8 * rand(i, 4, seed));
    const p = axis === 'y' ? [Math.cos(a) * r, s, Math.sin(a) * r] : [s, Math.cos(a) * r, Math.sin(a) * r];
    const q = axis === 'y' ? [p[0], p[1] + L0, p[2]] : [p[0] + L0, p[1], p[2]];
    ctx.line([p, q], { color: COLOR.me, color2: COLOR.warm, width: 1.8, alpha: alpha * (0.3 + 0.5 * rand(i, 6, seed)), glow: 6, persp: 6 });
  }
}

export default chapter({
  id: 'pre1',
  from: start,
  to: (T) => T.cut(T.section('pre1').end),
  overlay(ctx) {
    const { T } = ctx;
    // the last diff of verse 1 ("give you my LIMITATIONS"), deferred from v1: it fell after the verse's last frame.
    // One panel, then the chapter reads only through its single 3D label per shot.
    transcript(ctx, 72, 190, ctx.memo('pre1session', () => [
      { kind: 'tool', at: start(T), until: DIFF_END(T), name: 'Update', arg: 'me.js', body: editBody('limits', { at: start(T) + T.beats(0.25) }, { at: start(T) + T.beats(0.4) }) },
    ]));
  },
  shots: [
    {
      id: 'current',
      hud: (T, t) => `full-bridge rectifier · ${polarity(T, t) > 0 ? 'D1 D4' : 'D2 D3'} conducting`,
      at: start,
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = start(T), t1 = T.cut(lineStart(T, 'To AC to DC'));
        const k = easeInOutCubic(clamp((t - t0) / (t1 - t0)));
        const cam = orbit({ target: add3([2.1, 0.15, 0], shake(t, 0.02, 21)), r: lerp(12.6, 11.8, k), az: lerp(0.2, 0.3, k), el: 0.14, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 10.5 });
        field(ctx, 10.5, { center: [1.5, -0.5, 0], radius: [4, 12] });
        const ph = acPhase(T, t), I = Math.sin(ph), mag = Math.abs(I), sgn = I >= 0 ? 1 : -1;
        const f = fb(T, t);
        // the circuit: source leads, the bridge's diodes, the load loop (a resistor on the right-hand leg)
        const wire = { color: COLOR.dim, width: 1.6, alpha: 0.8, persp: 8 };
        ctx.line([[SRC[0], 0.35, 0], [SRC[0], BR, 0], NB], wire);
        ctx.line([[SRC[0], -0.35, 0], [SRC[0], -BR, 0], ND], wire);
        LOAD.forEach((pl) => ctx.line(pl, wire));
        const zig = Array.from({ length: 9 }, (_, q) => [3 + (q % 2 ? 0.16 : -0.16) * (q > 0 && q < 8 ? 1 : 0), -0.7 - q * 0.14, 0.18]);
        ctx.line(zig, { color: COLOR.ink2, width: 2.2, persp: 8 });
        DIODES.forEach((D) => {
          const on = D.on === sgn ? mag : 0;
          const m = diode(ctx, D.a, D.c, { color: on > 0.05 ? COLOR.me : COLOR.dim, alpha: 0.55 + 0.45 * on, width: 2.2 + 2 * on, glow: 14 * on });
          ctx.text3D(D.id, [m[0] * 1.5, m[1] * 1.5, 0], // outside the diamond, by its diode
             { font: 'mono', size: 14, minSize: 13, maxSize: 15, align: 'center', baseline: 'middle', color: on > 0.05 ? COLOR.me : COLOR.faint, ref: 10 });
        });
        for (const [p, sym] of [[NC, '+'], [NA, '−']]) { ctx.point3D(p, 5, { fill: COLOR.ink2, ref: 10 }); ctx.text3D(sym, [p[0] + (p[0] > 0 ? 0.3 : -0.3), p[1] + 0.3, 0], { font: 'monoBold', size: 18, minSize: 16, maxSize: 20, align: 'center', baseline: 'middle', color: COLOR.ink2, ref: 10 }); }
        ctx.point3D(NB, 4, { fill: COLOR.dim, ref: 10 });
        ctx.point3D(ND, 4, { fill: COLOR.dim, ref: 10 });
        // the current: electrons run around whichever loop is conducting, as bright as |I|; through the load (C → A)
        // both loops run the same way — that is the rectifier
        const pos = polyAt(LOOP_POS), neg = polyAt(LOOP_NEG);
        flow(ctx, 'pre1:bridge+', pos, { u0: 0, u1: 0.98, du: 0.02, n: 2200, ref: 10.5, alpha: sgn > 0 ? mag : 0, rate: 3, jitter: 0.03, size: 3.2 });
        flow(ctx, 'pre1:bridge-', neg, { u0: 0, u1: 0.98, du: 0.02, n: 2200, ref: 10.5, alpha: sgn < 0 ? mag : 0, rate: 3, jitter: 0.03, size: 3.2 });
        const loop = sgn > 0 ? LOOP_POS : LOOP_NEG;
        ctx.line(loop, { color: COLOR.me, width: 2.4, alpha: 0.35 + 0.5 * mag, glow: 10 * mag, persp: 8 });
        // each reversal (zero crossing, on the beat) throws sparks at the diodes that take over
        const q = Math.floor(T.beatAt(t));
        DIODES.filter((D) => D.on === sgn).forEach((D, n) => burst(ctx, { center: [(D.a[0] + D.c[0]) / 2, (D.a[1] + D.c[1]) / 2, 0], seed: 233 + n + 2 * (q % 2), n: 500, r0: 0.15, r1: 1, p: f / 0.6, focus: 10.5, aperture: 2, size: 2.8, alpha: clamp(f * 60), color: COLOR.me, color2: COLOR.ink }));
        sparkAt(ctx, cam, { pos: SRC, rays: 0.3 + 0.35 * mag });
        // the scope: input sin (me's AC) and output |sin| over the last 4 beats, newest at the right
        const X0 = 4.2, X1 = 6.9, A = 0.5, YI = 0.95, YO = -0.85, Wb = 4;
        const bNow = T.beatAt(t), bS = T.beatAt(T.section('pre1').start);
        const tin = [], tout = [];
        for (let i = 0; i <= 200; i++) {
          const b = bNow - Wb + (i / 200) * Wb, x = lerp(X0, X1, i / 200);
          const v = b < bS ? 0 : Math.sin(Math.PI * (b - bS));
          tin.push([x, YI + A * v, 0]);
          tout.push([x, YO + A * Math.abs(v), 0]);
        }
        for (const Y of [YI, YO]) ctx.line([[X0, Y, 0], [X1, Y, 0]], { color: COLOR.faint, width: 1, persp: 8 });
        ctx.line(tin, { color: COLOR.me, width: 2.4, glow: 8, persp: 8 });
        ctx.line(tout, { color: COLOR.warm, width: 2.8, glow: 10, glowStrength: 0.35, persp: 8 });
        // one label: what came out (small while the LIMITATIONS diff is up)
        const diffUp = t < DIFF_END(T);
        const la = smoothstep(T.section('pre1').start + T.beats(1), T.section('pre1').start + T.beats(1.4), t);
        labels3D(ctx, [label([X1 + 0.2, YO + A * 0.5, 0], 'I_out = |I_in|', diffUp ? { color: COLOR.warm, size: 16, minSize: 16, maxSize: 16, alpha: 0.8 * la } : { color: COLOR.warm, alpha: la })], { obstacles: [{ rect: [40, 140, 520, 330] }, { p: SRC, r: 50 }] });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'acdc',
      hud: (T, t) => { const st = stageTimes(T); const k = st.filter((s) => t >= s).length - 1; return ['AC · sin', 'half-wave · a diode', 'full-wave · a bridge', 'RC filter · DC'][Math.max(0, k)]; },
      at: (T) => T.cut(lineStart(T, 'To AC to DC')),
      transitionIn: { type: 'glide', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const st = stageTimes(T);
        const k = Math.max(0, st.filter((s) => t >= s).length - 1);
        // the camera trucks one stage to the right each time a stage begins
        let cx = STAGE_X(0);
        st.forEach((s, i) => { if (i > 0) cx = lerp(cx, STAGE_X(i), easeOutCubic(clamp((t - s) / T.beats(0.4)))); });
        const cam = orbit({ target: add3([cx + 0.3, 0.55, 0], shake(t, 0.02, 22)), r: 8.4, az: 0.3, el: 0.16, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8.4, center: [cx, 0, -2] });
        field(ctx, 8.4, { center: [cx, 0.5, 0] });
        const dc = dcLevel();
        STAGES.forEach((S, i) => {
          const a = smoothstep(st[i] - T.beats(0.5), st[i], t);
          if (a <= 0.003) return;
          const on = i === k ? (i === 3 ? 1 - 0.55 * smoothstep(st[3], st[3] + T.beats(0.6), t) : 1) : 0.5;
          const f = stagePt(i);
          const pts = Array.from({ length: 161 }, (_, q) => f(q / 160));
          const rev = clamp((t - st[i] + T.beats(0.5)) / T.beats(0.6)); // drawn in left to right
          ctx.line([[STAGE_X(i) - HALF_W, 0, 0], [STAGE_X(i) + HALF_W, 0, 0]], { color: COLOR.faint, width: 1, alpha: a, persp: 8 });
          ctx.line(pts.slice(0, Math.max(2, Math.ceil(161 * rev))), { color: i === 3 ? COLOR.warm : COLOR.me, width: 3.2, alpha: a * on, glow: 12, glowStrength: 0.4, persp: 8 });
          flow(ctx, `pre1:stage${i}`, f, { u0: 0, u1: 0.95, du: 0.05, n: 900, ref: 8.4, alpha: a * on * rev, color: i === 3 ? COLOR.warm : COLOR.me, rate: 2, jitter: 0.02 });
          burst(ctx, { center: [STAGE_X(i), 0.5, 0], seed: 240 + i, n: 1600, r0: 0.4, r1: 3.5, p: (t - st[i]) / T.beats(1), focus: 8.4, aperture: 3, size: 3.2, alpha: clamp((t - st[i]) * 30), color: COLOR.me, color2: COLOR.ink });
          // the component between this stage and the next (drawn in grey: diode, bridge, RC)
          const X = STAGE_X(i) + 3.5, ca = a * 0.9;
          if (i === 0) { ctx.line([[X - 0.25, 0.28, 0], [X - 0.25, -0.28, 0], [X + 0.22, 0, 0], [X - 0.25, 0.28, 0]], { color: COLOR.ink2, width: 2, alpha: ca, persp: 8 }); ctx.line([[X + 0.22, 0.28, 0], [X + 0.22, -0.28, 0]], { color: COLOR.ink2, width: 2, alpha: ca, persp: 8 }); }
          if (i === 1) ctx.line([[X - 0.4, 0, 0], [X, 0.4, 0], [X + 0.4, 0, 0], [X, -0.4, 0], [X - 0.4, 0, 0]], { color: COLOR.ink2, width: 2, alpha: ca, persp: 8 });
          if (i === 2) { ctx.line([[X - 0.5, 0, 0], [X - 0.4, 0.15, 0], [X - 0.3, -0.15, 0], [X - 0.2, 0.15, 0], [X - 0.1, -0.15, 0], [X, 0, 0]], { color: COLOR.ink2, width: 2, alpha: ca, persp: 8 }); for (const dx of [0.2, 0.32]) ctx.line([[X + dx, 0.32, 0], [X + dx, -0.32, 0]], { color: COLOR.ink2, width: 2.4, alpha: ca, persp: 8 }); }
          if (i < 3) ctx.line([[STAGE_X(i) + HALF_W, 0, 0], [X - 0.45, 0, 0]], { color: COLOR.faint, width: 1, alpha: ca, persp: 8 });
          if (i < 3) ctx.line([[X + 0.45, 0, 0], [STAGE_X(i + 1) - HALF_W, 0, 0]], { color: COLOR.faint, width: 1, alpha: ca, persp: 8 });
        });
        // DC: a steady gold line at the filter's mean level, running on
        const pd = clamp((t - st[3]) / T.beats(0.8));
        if (pd > 0) {
          const dcLine = (u) => [STAGE_X(3) - HALF_W + u * 12, dc, 0];
          ctx.line([dcLine(0), dcLine(pd)], { color: COLOR.warm, width: 3.2, glow: 10, glowStrength: 0.3, intensity: 0.8, persp: 8 });
          flow(ctx, 'pre1:dc', dcLine, { u0: 0, u1: pd * 0.95, du: 0.04, n: 700, ref: 8.4, color: COLOR.warm, color2: COLOR.ink, rate: 2, jitter: 0.02 });
          shockwave(ctx, { center: [STAGE_X(3), dc, 0], u: [1, 0, 0], v: [0, 1, 0], r: 0.3 + 3 * easeOutCubic(pd), alpha: 0.8 * (1 - pd), ref: 8.4, width: 3, color: COLOR.warm });
        }
        // me rides the signal of the active stage, over its peak; on DC it rests on the level
        const sy = k === 3 ? dc + 0.3 : 1.3;
        sparkAt(ctx, cam, { pos: [cx, sy, 0], rays: 0.4 });
        const r0 = Math.max(st[1], DIFF_END(T) + 0.25); // after the diff panel has gone (one reading focus)
        const ra = smoothstep(r0, r0 + T.beats(0.3), t);
        labels3D(ctx, [label([STAGE_X(1) - 1.2, -0.75, 0], 'ReLU(x) = max(0, x)', { color: COLOR.ink, size: 24, minSize: 22, maxSize: 26, alpha: ra })], { obstacles: [{ p: [cx, sy, 0], r: 50 }] });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'blind',
      hud: (T, t) => {
        const bl = Wd(T, 'And then blind my vision', 'blind').start;
        if (t < bl) return 'vision · 256 neurons';
        const q = Math.floor(T.beatAt(t));
        let kept = 0; for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) if (!dropped(i, j, q)) kept++;
        return `dropout · ${kept} / 256 kept · ×2`;
      },
      at: (T) => T.cut(lineStart(T, 'And then blind my vision')),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(lineStart(T, 'And then blind my vision')), t1 = T.cut(lineStart(T, 'So dizzy so dizzy'));
        const k = easeInOutCubic(clamp((t - t0) / (t1 - t0)));
        const cam = orbit({ target: add3([0.2, 0.9, 0.35], shake(t, 0.02, 23)), r: lerp(12.4, 11.9, k), az: lerp(0.55, 0.8, k), el: 0.88, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8 });
        field(ctx, 8, { radius: [3, 10], squash: 0.5 });
        const bl = Wd(T, 'And then blind my vision', 'blind').start;
        const blind = t >= bl;
        const q = Math.floor(T.beatAt(t)), f = fb(T, t);
        const EYE = [-2.4, 2.6, -2.6]; // me looks at the world through these neurons
        // the grid is there from the cut (30 %), then wakes from the centre out over half a beat
        const wake = (i, j) => 0.3 + 0.7 * smoothstep(0, 1, (t - t0) / T.beats(0.5) * 3 - Math.hypot(i - 7.5, j - 7.5) / 7.5);
        const kept = [];
        for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) {
          const p = neuron(i, j), a = act(i, j) * wake(i, j);
          if (a <= 0.003) continue;
          const off = blind && dropped(i, j, q);
          if (off) { ctx.point3D(p, 3, { stroke: COLOR.faint, width: 1.2, alpha: 0.7, ref: 8 }); continue; }
          const s = blind ? 2 : 1; // inverted dropout: the survivors are scaled by 1/(1 − p) = 2
          const flash = blind ? decay(f, 6) : 0;
          ctx.point3D(p, 2.5 + 1.6 * a * s, { fill: COLOR.me, glow: 5 + 5 * a * s, alpha: Math.min(1, 0.5 + 0.2 * a * s + 0.3 * flash), ref: 8 });
          kept.push(p);
        }
        // the vision: rays from the surviving neurons to me
        const vi = Wd(T, 'And then blind my vision', 'vision').start;
        const va = 0.3 + 0.1 * decay(f, 5) + (t >= vi ? 0.5 * decay((t - vi) / T.beats(1), 3) : 0);
        kept.forEach((p, n) => { if (n % 2 === 0) ctx.line([p, EYE], { color: COLOR.me, width: 1, alpha: va, glow: t >= vi ? 4 : 0, persp: 8 }); });
        // each beat the newly dropped neurons go out in a puff of dark sparks
        if (blind) {
          const pd = ctx.memo(`pre1:drop:${q}`, () => {
            const pts = []; for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) if (dropped(i, j, q)) pts.push(neuron(i, j));
            const n = pts.length * 6, from = new Float32Array(n * 3), to = new Float32Array(n * 3);
            for (let m = 0; m < n; m++) { const p = pts[m % pts.length]; from.set(p, m * 3); to.set([p[0] + randn(m, 1, 405) * 0.25, 0.4 + rand(m, 2, 405) * 0.9, p[2] + randn(m, 3, 405) * 0.25], m * 3); }
            return new Swarm({ from, to, seed: 406 });
          });
          ctx.swarm(pd, { p: easeOutCubic(clamp(f / 0.7)), stagger: 0.2, size: 2.8, perspective: true, focus: 8, aperture: 3, color: COLOR.ink2, color2: COLOR.dim, alpha: (1 - f) * Math.min(1, f / 0.05), time: t });
        }
        burst(ctx, { center: EYE, seed: 244, n: 1600, r0: 0.2, r1: 3, p: (t - bl) / T.beats(1), focus: 8, aperture: 3, size: 3, alpha: clamp((t - bl) * 30), color: COLOR.me, color2: COLOR.ink });
        sparkAt(ctx, cam, { pos: EYE, rays: 0.35 + 0.2 * decay(f, 5), alpha: blind ? 0.6 + 0.4 * (t >= vi ? decay((t - vi) / T.beats(1), 3) : 0) : 1 });
        labels3D(ctx, [label([2.9, 0, 3.0], 'dropout  p = 0.5', { alpha: smoothstep(bl, bl + T.beats(0.3), t), ref: 8 })], { obstacles: [{ p: EYE, r: 50 }] });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'dizzy',
      hud: (T, t) => { const n = Math.max(0, Math.floor((T.beatAt(t) - T.beatAt(lineStart(T, 'So dizzy so dizzy'))) / STEP_BEATS)); const [x, z] = heavyBall(64)[Math.min(64, n)]; return `heavy-ball · β = ${HB.beta} · step ${n} · L = ${loss(x, z).toFixed(2)}`; },
      at: (T) => T.cut(lineStart(T, 'So dizzy so dizzy')),
      transitionIn: { type: 'whip', frames: 10 },
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = lineStart(T, 'So dizzy so dizzy');
        const s = Math.max(0, (T.beatAt(t) - T.beatAt(t0)) / STEP_BEATS);
        const P = heavyBall(64);
        const i0 = Math.min(63, Math.floor(s)), e = easeInOutCubic(s - Math.floor(s));
        const at = (i, ee) => { const a = P[i], b = P[Math.min(64, i + 1)]; const x = lerp(a[0], b[0], ee), z = lerp(a[1], b[1], ee); return [x, H(x, z) + 0.18, z]; };
        const ball = at(i0, s >= 64 ? 1 : e);
        // dizzy: the camera circles fast and rolls
        const roll = 0.16 * Math.sin(T.beatAt(t) * Math.PI);
        const cam = orbit({ target: add3([0, 0.5, 0], shake(t, 0.03, 24)), r: 8.4, az: 0.3 + 1.4 * (t - t0), el: 0.62 + 0.1 * Math.sin(T.beatAt(t) * Math.PI * 0.5), fov: 42, up: [Math.sin(roll), Math.cos(roll), 0] });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8.4 });
        field(ctx, 8.4, { radius: [4, 11], squash: 0.6 });
        // the loss surface: a wire grid, and its particles for volume
        const R = 3.6, N = 14;
        for (let a = 0; a <= N; a++) {
          const u = -R + (a / N) * 2 * R;
          ctx.line(Array.from({ length: 41 }, (_, b) => { const v = -R + (b / 40) * 2 * R; return [u, H(u, v), v]; }), { color: COLOR.faint, width: 1, alpha: 0.6, persp: 8, fog: [6, 16] });
          ctx.line(Array.from({ length: 41 }, (_, b) => { const v = -R + (b / 40) * 2 * R; return [v, H(v, u), u]; }), { color: COLOR.faint, width: 1, alpha: 0.6, persp: 8, fog: [6, 16] });
        }
        const surf = ctx.memo('pre1:surface', () => { const n = 4000, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const x = (rand(i, 1, 251) * 2 - 1) * R, z = (rand(i, 2, 251) * 2 - 1) * R; p.set([x, H(x, z) + randn(i, 3, 251) * 0.03, z], i * 3); } return new Swarm({ from: p, seed: 252 }); });
        ctx.swarm(surf, { p: 0, size: 2.4, sizeVar: 0.6, perspective: true, focus: 8.4, aperture: 4, drift: 0.02, time: t, color: COLOR.dim, color2: COLOR.ink2, alpha: 0.7, fog: [6, 16] });
        ctx.point3D([0, 0.02, 0], 4, { fill: COLOR.warm, glow: 10, ref: 8 }); // the minimum
        // the path so far: the steps (gold dots) and the trail
        const trail = [];
        for (let i = 0; i <= Math.min(64, Math.floor(s)); i++) trail.push(at(i, 0));
        trail.push(ball);
        if (trail.length > 1) ctx.line(trail, { color: COLOR.faint, color2: COLOR.me, width: 2.6, glow: 10, glowStrength: 0.4, persp: 8 });
        trail.slice(0, -1).forEach((p) => ctx.point3D(p, 2.6, { fill: COLOR.warm, ref: 8 }));
        // on each "dizzy": a burst and a ring on the surface
        L(T, 'So dizzy so dizzy').words.filter((w) => w.text === 'dizzy').forEach((w, n) => {
          const pw = clamp((t - w.start) / T.beats(1.2));
          burst(ctx, { center: ball, seed: 253 + n, n: 1800, r0: 0.3, r1: 3, p: pw, focus: 8.4, aperture: 3, size: 3.2, alpha: clamp((t - w.start) * 30), color: COLOR.me, color2: COLOR.ink });
          if (pw > 0 && pw < 1) shockwave(ctx, { center: ball, u: [1, 0, 0], v: [0, 0, 1], r: 0.2 + 2 * easeOutCubic(pw), alpha: 0.7 * (1 - pw), ref: 8, width: 2.5 });
        });
        sparkAt(ctx, cam, { pos: ball, rays: 0.4 });
        labels3D(ctx, [label([-R, H(-R, R) + 0.4, R], 'v ← βv − η∇L', { alpha: smoothstep(t0, t0 + T.beats(0.4), t) })], { obstacles: [{ p: ball, r: 50 }] });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'travel',
      hud: (T, t) => `forward pass · t = ${Math.floor(clamp(along(fwdTimes(T), t), 0, CHAIN_N - 1))}`,
      at: (T) => T.cut(lineStart(T, 'Oh we can travel')),
      transitionIn: { type: 'glide', beats: 1 },
      draw(ctx) {
        const { T, t } = ctx;
        const ft = fwdTimes(T), { h } = chain();
        const sp = along(ft, t), me = nodeAt(sp);
        // follow-cam: the active node sits a little left of centre, the nodes still to come fill the right
        const cam = orbit({ target: add3([me[0] + 1.1, 0.45, 0], shake(t, 0.02, 25)), r: 7.2, az: 0.42, el: 0.2, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8, center: [me[0], 0, -2] });
        field(ctx, 8, { center: [me[0] + 2, 0, 0], radius: [3, 11], squash: 0.5 });
        // the time axis: nodes in order; the forward pulse lights each one with its real value h
        ctx.line([[-2, 0, 0], [NODE(CHAIN_N - 1)[0] + 3, 0, 0]], { color: COLOR.dim, width: 1.6, persp: 8 });
        const names = [];
        for (let k = 0; k < CHAIN_N; k++) {
          const p = NODE(k), lit = t >= ft[k];
          const fl = lit ? decay((t - ft[k]) / T.beats(1), 4) : 0;
          ctx.point3D(p, 5, { fill: lit ? COLOR.me : COLOR.dim, glow: lit ? 10 : 0, ref: 8 });
          if (lit) ctx.line(Array.from({ length: 49 }, (_, q) => { const a = (q / 48) * TAU, r = 0.15 + 0.35 * Math.abs(h[k]); return [p[0], Math.sin(a) * r, Math.cos(a) * r]; }), { color: COLOR.me, width: 2.4 + 3 * fl, glow: 10 * (0.4 + fl), persp: 8 });
          burst(ctx, { center: p, seed: 262 + k, n: 900, r0: 0.1, r1: 1.6, p: (t - ft[k]) / T.beats(0.8), focus: 8, aperture: 3, size: 3, alpha: clamp((t - ft[k]) * 30), color: COLOR.me, color2: COLOR.ink });
          // forward arrows between nodes
          if (k < CHAIN_N - 1 && lit) { const m = lerp(p[0], NODE(k + 1)[0], 0.5); ctx.line([[m - 0.15, 0.13, 0], [m + 0.1, 0, 0], [m - 0.15, -0.13, 0]], { color: COLOR.me, width: 2.2, alpha: 0.8, persp: 8 }); }
          names.push(nodeLabel(k, 0.15 + 0.35 * Math.abs(h[k])));
        }
        // the signal is a packet of particles hopping node to node, trailing half a beat of its path
        const pk = ctx.memo('pre1:packet', () => { const n = 320, q = new Float32Array(n * 3); for (let i = 0; i < n; i++) q.set([randn(i, 1, 265) * 0.16, randn(i, 2, 265) * 0.16, randn(i, 3, 265) * 0.16], i * 3); return new Swarm({ from: q, seed: 266 }); });
        ctx.swarm(pk, { p: 0, model: new THREE.Matrix4().makeTranslation(me[0], 0, 0), size: 3.6, sizeVar: 0.6, perspective: true, focus: 7.2, aperture: 2, drift: 0.05, time: t, color: COLOR.me, color2: COLOR.ink, alpha: 1 });
        const back = nodeAt(along(ft, t - T.beats(0.5)));
        if (me[0] - back[0] > 0.05) ctx.line([back, me], { color: COLOR.ink, color2: COLOR.me, width: 6, alpha: 0.7, glow: 16, glowStrength: 0.5, persp: 8 });
        flow(ctx, 'pre1:fwd', (u) => [u * NODE(CHAIN_N - 1)[0], 0, 0], { u0: 0, u1: clamp(sp / (CHAIN_N - 1)) * 0.98, du: 0.03, n: 1800, ref: 8, rate: 2, jitter: 0.07, size: 3.2 });
        sparkAt(ctx, cam, { pos: [me[0], 0.75, 0], rays: 0.4 });
        const t0 = lineStart(T, 'Oh we can travel');
        labels3D(ctx, [label([me[0] + 0.6, 1.5, 0], 'h(t+1) = tanh(w·h(t) + b)', { alpha: smoothstep(t0, t0 + T.beats(0.4), t) }), ...names], { obstacles: [{ p: [me[0], 0.75, 0], r: 50 }, { a: [-2, 0, 0], b: [20, 0, 0], r: 6 }, ...ringObstacles((k) => 0.15 + 0.35 * Math.abs(h[k]))] });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'adbc',
      hud: (T, t) => { const s = along(bwdTimes(T), t, true); return `backward · ∂L/∂${NODE_NAMES[Math.round(s)]} · t = ${Math.round(s)}`; },
      at: (T) => T.cut(lineStart(T, 'To A.D to B.C')),
      draw(ctx) {
        const { T, t } = ctx;
        const bt = bwdTimes(T), { h, g } = chain();
        const ad = Wd(T, 'To A.D to B.C', 'A.D').start, bc = Wd(T, 'To A.D to B.C', 'B.C').start;
        const s = along(bt, t, true), me = nodeAt(s);
        // the camera turns around on "To" and backs down the axis with the gradient
        const turn = easeInOutCubic(clamp((t - T.cut(lineStart(T, 'To A.D to B.C'))) / (ad - lineStart(T, 'To A.D to B.C'))));
        const cam = orbit({ target: add3([me[0] + 1.1 * (1 - turn) + 0.9 * turn, 0.5, 0], shake(t, 0.02, 26)), r: 7.6, az: lerp(0.42, -0.42, turn), el: 0.2, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8, center: [me[0], 0, -2] });
        field(ctx, 8, { center: [me[0] - 2, 0, 0], radius: [3, 11], squash: 0.5 });
        ctx.line([[-2, 0, 0], [NODE(CHAIN_N - 1)[0] + 3, 0, 0]], { color: COLOR.dim, width: 1.6, persp: 8 });
        const names = [];
        for (let k = 0; k < CHAIN_N; k++) {
          const p = NODE(k);
          // the forward values stay as dim orange rings; the gradient arrives in gold, its ring = |∂L/∂h| (log scale)
          ctx.line(Array.from({ length: 49 }, (_, q) => { const a = (q / 48) * TAU, r = 0.15 + 0.35 * Math.abs(h[k]); return [p[0], Math.sin(a) * r, Math.cos(a) * r]; }), { color: COLOR.me, width: 1.6, alpha: 0.45, persp: 8 });
          const got = t >= bt[k];
          ctx.point3D(p, 5, { fill: got ? COLOR.warm : COLOR.me, glow: 10, ref: 8 });
          if (got) {
            const fl = decay((t - bt[k]) / T.beats(1), 4);
            ctx.line(Array.from({ length: 49 }, (_, q) => { const a = (q / 48) * TAU, r = gradR(g[k]) * (1 + 0.3 * fl); return [p[0], Math.sin(a) * r, Math.cos(a) * r]; }), { color: COLOR.warm, width: 2.6 + 3 * fl, glow: 12 * (0.4 + fl), persp: 8 });
            burst(ctx, { center: p, seed: 270 + k, n: 900, r0: 0.1, r1: 1.6, p: (t - bt[k]) / T.beats(0.8), focus: 8, aperture: 3, size: 3, alpha: clamp((t - bt[k]) * 30), color: COLOR.warm, color2: COLOR.ink });
            if (k > 0) { const m = lerp(p[0], NODE(k - 1)[0], 0.5); ctx.line([[m + 0.15, 0.13, 0], [m - 0.1, 0, 0], [m + 0.15, -0.13, 0]], { color: COLOR.warm, width: 2.2, alpha: 0.9, persp: 8 }); }
          } else if (k < CHAIN_N - 1) { const m = lerp(p[0], NODE(k + 1)[0], 0.5); ctx.line([[m - 0.15, 0.13, 0], [m + 0.1, 0, 0], [m - 0.15, -0.13, 0]], { color: COLOR.me, width: 2.2, alpha: 0.5, persp: 8 }); }
          names.push(nodeLabel(k, Math.max(0.15 + 0.35 * Math.abs(h[k]), got ? gradR(g[k]) * 1.3 : 0), got ? COLOR.warm : COLOR.dim));
        }
        // before A.D the loss gathers itself: a gold charge grows at L, released as the backward pass
        const tTo = lineStart(T, 'To A.D to B.C');
        if (t < ad) {
          const c = clamp((t - tTo) / (ad - tTo));
          const Lp = NODE(CHAIN_N - 1);
          ctx.line(Array.from({ length: 49 }, (_, q) => { const a = (q / 48) * TAU, r = 0.2 + 0.5 * c; return [Lp[0], Math.sin(a) * r, Math.cos(a) * r]; }), { color: COLOR.warm, width: 2 + 4 * c, glow: 10 + 20 * c, alpha: 0.4 + 0.6 * c, persp: 8 });
          const ch = ctx.memo('pre1:charge', () => { const n = 900, from = new Float32Array(n * 3), to = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const d = [randn(i, 1, 275), randn(i, 2, 275), randn(i, 3, 275)], m = Math.hypot(...d) || 1; from.set(d.map((v) => (v / m) * 2.4), i * 3); to.set(d.map((v) => (v / m) * 0.15), i * 3); } return new Swarm({ from, to, seed: 276 }); });
          ctx.swarm(ch, { p: c, stagger: 0.4, model: new THREE.Matrix4().makeTranslation(Lp[0], 0, 0), size: 3, perspective: true, focus: 8, aperture: 2, color: COLOR.warm, color2: COLOR.ink, alpha: c, time: t });
        }
        if (t >= ad) flow(ctx, 'pre1:bwd', (u) => [u * NODE(CHAIN_N - 1)[0], 0, 0], { u0: clamp(s / (CHAIN_N - 1)) + 0.02, u1: 1, du: -0.03, n: 1800, ref: 8, rate: 2, jitter: 0.07, size: 3.2, color: COLOR.warm, color2: COLOR.ink });
        // B.C: the gradient reaches the input two orders of magnitude smaller than it left the loss (vanishing): the
        // ring it makes there is small and dim, scaled by log|∂L/∂x| like every gradient ring
        const pb = clamp((t - bc) / T.beats(0.5));
        if (pb > 0 && pb < 1) shockwave(ctx, { center: NODE(0), u: [0, 1, 0], v: [0, 0, 1], r: gradR(g[0]) + 0.6 * easeOutCubic(pb), alpha: 0.4 * (1 - pb), ref: 8, width: 2, color: COLOR.warm });
        sparkAt(ctx, cam, { pos: [me[0], 0.75, 0], rays: 0.4 });
        // one label at a time: the chain rule while the gradient runs, then the number it arrives with
        const main = t < bc
          ? label([me[0] - 0.4, 1.5, 0], '∂L/∂h = ∂L/∂h′ · w · (1 − h′²)', { alpha: smoothstep(ad, ad + T.beats(0.4), t), color: COLOR.warm })
          : label([NODE(0)[0] + 0.3, 1.1, 0], `|∂L/∂x| = ${Math.abs(g[0]).toExponential(1)}`, { alpha: smoothstep(bc, bc + T.beats(0.25), t), color: COLOR.warm, size: 18, minSize: 18, maxSize: 20 });
        labels3D(ctx, [main, ...names], { obstacles: [{ p: [me[0], 0.75, 0], r: 50 }, { a: [-2, 0, 0], b: [20, 0, 0], r: 6 }, ...ringObstacles((k) => Math.max(0.15 + 0.35 * Math.abs(h[k]), t >= bt[k] ? gradR(g[k]) * 1.3 : 0))] });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'unite',
      hud: 'residual block · skip connection',
      at: (T) => T.cut(lineStart(T, 'And we can unite')),
      transitionIn: { type: 'glide', beats: 1 },
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(lineStart(T, 'And we can unite')), t1 = T.cut(lineStart(T, 'So deeply so deeply'));
        const k = easeInOutCubic(clamp((t - t0) / (t1 - t0)));
        const un = Wd(T, 'And we can unite', 'unite').start;
        // the camera flies along between the two paths
        const cam = orbit({ target: add3([lerp(-3.5, 4.2, k), 1.0, 0], shake(t, 0.02, 27)), r: 7.4, az: lerp(-0.75, -0.35, k), el: 0.16, fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 7 });
        field(ctx, 7, { center: [0, 0.5, 0], radius: [3, 12], squash: 0.5 });
        // x: you's stream; the skip connection runs straight to ⊕
        youLine(ctx, [skipPt(0), skipPt(1)], { width: 2, alpha: 0.5, persp: 7 });
        flow(ctx, 'pre1:skip', skipPt, { u0: 0, u1: 0.97, du: 0.04, n: 1400, ref: 7, rate: 1.5, jitter: 0.05, color: COLOR.you, color2: COLOR.ink, size: 3 });
        // f(x): me's computation through the block — an orange arc through a small weight lattice
        ctx.line(Array.from({ length: 61 }, (_, q) => fPt(q / 60)), { color: COLOR.me, width: 2, alpha: 0.6, glow: 8, persp: 7 });
        flow(ctx, 'pre1:f', fPt, { u0: 0, u1: 0.97, du: 0.04, n: 1400, ref: 7, rate: 1.5, jitter: 0.05, color: COLOR.me, color2: COLOR.ink, size: 3 });
        const BX = lerp(SPLIT, PLUS, 0.5), BY = 1.9;
        const ba = 1 - smoothstep(0.55, 0.85, k);
        for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { const w = randn(i, j, 281); ctx.point3D([BX - 0.75 + i * 0.3, BY - 0.75 + j * 0.3, 0], 1.5 + 1.4 * Math.abs(w), { fill: w > 0 ? COLOR.me : COLOR.warm, alpha: 0.7 * ba, ref: 7 }); }
        ctx.line([[BX - 1, BY - 1, 0], [BX + 1, BY - 1, 0], [BX + 1, BY + 1, 0], [BX - 1, BY + 1, 0], [BX - 1, BY - 1, 0]], { color: COLOR.ink2, width: 1.6, alpha: ba, persp: 7 });
        ctx.point3D([SPLIT, 0, 0], 5, { fill: COLOR.ink2, ref: 7 });
        // ⊕
        const pu = clamp((t - un) / T.beats(1.5));
        const P = [PLUS, 0, 0];
        ctx.line(Array.from({ length: 49 }, (_, q) => { const a = (q / 48) * TAU; return [PLUS + Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0]; }), { color: COLOR.ink, width: 2.4 + 3 * decay(pu, 4) * (pu > 0 ? 1 : 0), glow: 8 + 14 * (pu > 0 ? decay(pu, 4) : 0), persp: 7 });
        ctx.line([[PLUS - 0.2, 0, 0], [PLUS + 0.2, 0, 0]], { color: COLOR.ink, width: 2.4, persp: 7 });
        ctx.line([[PLUS, -0.2, 0], [PLUS, 0.2, 0]], { color: COLOR.ink, width: 2.4, persp: 7 });
        // "unite": y = x + f(x) leaves ⊕, the two strands braided (never blended into one colour)
        if (pu > 0) {
          const reach = easeOutCubic(pu);
          youLine(ctx, Array.from({ length: 61 }, (_, q) => braid(0)((q / 60) * reach)), { width: 2.4, alpha: 0.85, glow: 8, persp: 7 });
          ctx.line(Array.from({ length: 61 }, (_, q) => braid(Math.PI)((q / 60) * reach)), { color: COLOR.me, width: 2.4, alpha: 0.85, glow: 8, persp: 7 });
          flow(ctx, 'pre1:braidY', braid(0), { u0: 0, u1: reach * 0.95, du: 0.04, n: 700, ref: 7, rate: 1.5, jitter: 0.03, color: COLOR.you, color2: COLOR.ink, size: 2.8 });
          flow(ctx, 'pre1:braidM', braid(Math.PI), { u0: 0, u1: reach * 0.95, du: 0.04, n: 700, ref: 7, rate: 1.5, jitter: 0.03, color: COLOR.me, color2: COLOR.ink, size: 2.8 });
          burst(ctx, { center: P, seed: 282, n: 2600, r0: 0.7, r1: 4, p: pu, focus: 7, aperture: 3, size: 3.2, alpha: 0.9 * clamp((t - un) * 30), color: COLOR.warm, color2: COLOR.ink });
          shockwave(ctx, { center: P, u: [0, 1, 0], v: [0, 0, 1], r: 0.3 + 3 * easeOutCubic(pu), alpha: 0.8 * (1 - pu), ref: 7, width: 3, color: COLOR.warm });
        }
        sparkAt(ctx, cam, { pos: [BX, BY + 1.25, 0], rays: 0.25 });
        labels3D(ctx, [label([PLUS + 0.2, 0.95, 0], 'y = x + f(x)', { alpha: smoothstep(t0, t0 + T.beats(0.4), t), ref: 7 })], { obstacles: [{ p: [BX, BY + 1.25, 0], r: 50 }, { p: P, r: 24 }] });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'deeply',
      hud: (T, t) => { const n = layerTimes(T).filter((x) => t >= x).length; return `depth · ${n} layer${n === 1 ? '' : 's'}`; },
      at: (T) => T.cut(lineStart(T, 'So deeply so deeply')),
      draw(ctx) {
        const { T, t } = ctx;
        const lt = layerTimes(T);
        const t0 = T.cut(lineStart(T, 'So deeply so deeply'));
        // depth: the camera reaches layer n exactly at its time (piecewise linear between the passing times)
        const knots = [[t0, DEPTH * 0.6], ...lt.map((x, n) => [x, -(n + 1) * DEPTH])];
        let y = knots[0][1];
        for (let q = 0; q < knots.length - 1; q++) if (t >= knots[q][0]) y = lerp(knots[q][1], knots[q + 1][1], clamp((t - knots[q][0]) / (knots[q + 1][0] - knots[q][0])));
        if (t >= knots.at(-1)[0]) y = knots.at(-1)[1] - DEPTH * 2 * (t - knots.at(-1)[0]) / T.beats(1);
        const passed = lt.filter((x) => t >= x).length;
        // the last two beats before the chorus: everything brightens toward the drop
        const glowUp = smoothstep(T.section('pre1').end - T.beats(2), T.section('pre1').end, t);
        ctx.post({ exposure: 1 + 0.25 * glowUp });
        const cam = { fov: 60, position: [0.5, y + 3.2, 0.6], target: [0, y - 6, 0], up: [Math.sin(t * 0.8), 0, -Math.cos(t * 0.8)] };
        ctx.camera3D(cam);
        const speed = clamp(passed / 4, 0.5, 4);
        streaks(ctx, y, 'y', { r0: 2.4, r1: 7, len: 30, speed: speed * 4 * (1 + 2 * glowUp), alpha: 0.7 + 0.3 * glowUp, seed: 291 });
        // the layers: weight matrices, brighter the deeper they are; each flashes and rings as it is passed
        for (let n = 1; n <= lt.length + 3; n++) {
          const Y = -n * DEPTH, d = y + 3.2 - Y;
          if (d < 0.4 || d > 22) continue;
          const deep = clamp(n / 15), hot = n <= lt.length && t >= lt[n - 1] ? decay((t - lt[n - 1]) / T.beats(0.5), 4) : 0;
          const S2 = 3.2;
          ctx.line([[-S2, Y, -S2], [S2, Y, -S2], [S2, Y, S2], [-S2, Y, S2], [-S2, Y, -S2]], { color: COLOR.me, width: (1.6 + 2 * hot) * (1 + 0.5 * glowUp), alpha: 0.35 + 0.5 * deep + 0.4 * hot, glow: 6 + 14 * hot + 10 * glowUp, persp: 6 });
          // each layer is an 8×8 weight matrix, He-initialised from the same hash as intro's INITIALIZATION
          // (a layer about to be passed hides its weights: perspective would blow its dots up into discs)
          const near = smoothstep(2.5, 4.5, d);
          if (near > 0.01) for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const w = Wl(n, i, j); if (Math.abs(w) < 0.5) continue; ctx.point3D([(i - 3.5) * 0.72, Y, (j - 3.5) * 0.72], 2.4 + 2 * Math.abs(w), { fill: w > 0 ? COLOR.me : COLOR.warm, glow: 4, alpha: near * Math.min(1, (0.35 + 0.5 * deep) * (1 + hot)), ref: 6 }); }
          if (hot > 0) shockwave(ctx, { center: [0, Y, 0], u: [1, 0, 0], v: [0, 0, 1], r: 3.2 + 3 * (1 - hot), alpha: 0.8 * hot, ref: 6, width: 3 });
        }
        const me = [0, y - 3.4, 0];
        burst(ctx, { center: me, seed: 292 + (passed % 3), n: 1400, r0: 0.1, r1: 2.5, p: passed ? (t - lt[passed - 1]) / T.beats(0.5) : 0, focus: 6, aperture: 3, size: 3, alpha: 0.8, color: COLOR.me, color2: COLOR.ink });
        sparkAt(ctx, cam, { pos: me, px: 70 * (1 + 0.6 * glowUp), rays: 0.45 + 0.4 * clamp(passed / 15) + 0.4 * glowUp });
        // the layer just passed is named (one label at a time)
        if (passed) {
          const Y = -passed * DEPTH;
          labels3D(ctx, [label([2.2, Y, -2.2], `L${passed}`, { font: 'monoBold', size: 22, ref: 6, alpha: smoothstep(0, 0.08, t - lt[passed - 1]) })], { obstacles: [{ p: me, r: 50 }] });
        }
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
      },
    },
  ],
});
