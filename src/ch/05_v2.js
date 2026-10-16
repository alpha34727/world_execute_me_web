// 05 v2 — me learns the world: life. The drums come back and green (growth) appears for the first time. Each
// "If I'm a …" is built for real: an eggplant as a surface of revolution, the anthocyanin in its skin (delphinidin),
// a tomato's five locules in polar curves, lycopene's eleven conjugated double bonds and the electron they give away,
// a tabby cat drawn by its own Fourier series (64 epicycles), its purr, and a proof in free logic that me exists
// because you talk to it. Storyboard: docs/storyboard.md §05 · review: docs/review/v2.md.
import * as THREE from 'three';
import { chapter } from '../engine/timeline.js';
import { COLOR } from '../theme.js';
import { Swarm } from '../engine/gl/swarm.js';
import { corners } from '../lib/hud.js';
import { hero } from '../lib/hero.js';
import { clamp, lerp, easeOutCubic, easeInOutCubic, easeInCubic, easeOutBack, smoothstep, decay } from '../lib/ease.js';
import { rand, randn } from '../lib/hash.js';
import { sparkAt } from '../lib/spark.js';
import { orbit, shake, add3, lerp3 } from '../lib/camera.js';
import { axisGizmo, dust, labels3D, floorGrid, polarGrid, youLine } from '../lib/scene3d.js';
import { transcript } from '../lib/cc.js';
import { drawPrediction } from '../lib/predict.js';
import { embers, burst, shockwave, stream, flow, sampleSegments } from '../lib/fx.js';
import * as G from './v2/life.js';
import { PLAN } from './v2/plan.js';

const TAU = Math.PI * 2;
const start = (T) => T.cut(T.section('v2').start);
const L = (T, text, n = 0) => T.findLine(text, n, 'v2');
const W = (T, k) => T.findWord(k, 0, 'v2');
const ls = (T, text, n = 0) => L(T, text, n).words[0].start;
const wordIn = (T, line, text) => L(T, line).words.find((w) => w.text === text);
const field = (ctx, focus, o = {}) => embers(ctx, { radius: [2.5, 10], n: 3000, focus, aperture: 5, size: 3.2, alpha: 0.8, color: COLOR.dim, color2: COLOR.ink2, seed: 440, ...o });
const label = (p, text, o = {}) => ({ p, id: text, text, priority: 10, o: { font: 'mono', size: 22, minSize: 20, maxSize: 24, color: COLOR.ink2, backing: 0.7, ref: 7, ...o } });
const beatFrac = (T, t) => { const b = T.beatAt(t); return b - Math.floor(b); };
const rotX = ([x, y, z], a) => { const c = Math.cos(a), s = Math.sin(a); return [x, c * y - s * z, s * y + c * z]; };
const rotY = ([x, y, z], a) => { const c = Math.cos(a), s = Math.sin(a); return [c * x + s * z, y, -s * x + c * z]; };
const polyline = (n, f) => Array.from({ length: n + 1 }, (_, i) => f(i / n));
const finish = (ctx, cam) => { ctx.camera2D(); corners(ctx, { color: COLOR.faint }); axisGizmo(ctx, cam); };

// ---- the session (left): the plan for this verse, then one diff; the plan comes back complete in pre2 -------------
// (reading budget: each panel is gone before the next opens; the prediction keeps its wrong guess on screen)
const cutOf = (T, text) => T.cut(ls(T, text));
const todoUntil = (T) => cutOf(T, 'Then I will give you my') + T.beats(1);
const diffUntil = (T) => cutOf(T, 'Then I will give you') + T.beats(0.5);
const predFrom = (T) => diffUntil(T) + 0.3; // the diff has faded out (transcript fade 0.25 s)
function session(T) {
  const kw = (k) => W(T, k).start, t0 = start(T);
  return [
    { kind: 'todo', at: t0, until: todoUntil(T), items: PLAN.map((k, i) => ({ text: k, done: kw(k), at: t0 + T.beats(0.25 + 0.5 * i) })) },
    { kind: 'tool', at: kw('NUTRIENTS') + T.beats(1.75), until: diffUntil(T), name: 'Update', arg: 'me.js', body: [{ kind: 'del', text: 'me.nutrients' }, { kind: 'add', text: 'you.nutrients' }] },
  ];
}

// ---- v2.01: the eggplant ---------------------------------------------------------------------------------------
const EGG_TH0 = (az) => Math.PI - az; // the profile starts side-on to the opening camera (its plane faces the lens)
function eggplant(ctx, { sweep, th0, ref, alpha = 1, calyx = 0 }) {
  const fog = [ref + 2, ref + 12];
  ctx.line([[0, -2.2, 0], [0, 2.5, 0]], { color: COLOR.faint, width: 1.2, alpha: alpha * 0.8, persp: ref, dash: 8, gap: 6 }); // the axis
  for (let k = 0; k < 24; k++) {
    const th = th0 + (k / 24) * TAU;
    if ((k / 24) * TAU > sweep + 1e-6) break;
    ctx.line(polyline(40, (u) => G.eggPt(u * 0.97, th)), { color: COLOR.me, width: 1.6, alpha: alpha * 0.7, persp: ref, fog });
  }
  if (sweep > 0.01) for (let j = 1; j <= 11; j++) {
    const s = j / 12;
    ctx.line(polyline(Math.max(2, Math.ceil(48 * sweep / TAU)), (u) => G.eggPt(s, th0 + u * sweep)), { color: COLOR.me, width: 1.2, alpha: alpha * 0.45, persp: ref, fog });
  }
  if (calyx > 0) {
    // the calyx and the stem: green, growth — the colour's first appearance in the film
    for (const sp of G.sepals()) ctx.line(sp.map((p) => [p[0], G.eggY(1) + (p[1] - G.eggY(1)) * calyx, p[2]]), { color: COLOR.growth, width: 2.6, alpha: alpha * clamp(calyx * 3), glow: 10, glowStrength: 0.4, persp: ref, fog });
    const st = G.stem();
    ctx.line(st.slice(0, 1 + Math.round(12 * calyx)), { color: COLOR.growth, width: 6, alpha, glow: 8, persp: ref });
  }
}

// ---- v2.02/03: delphinidin, the anthocyanin in eggplant skin ----------------------------------------------------
const MOL_S = 0.52, MOL_C = [0.3, 0.15, 0], ME_MOL = [-3.4, 0.35, -0.8];
const molAngles = (T, t) => [-0.28, -0.42 + 0.09 * (t - ls(T, 'Then I will give you my'))];
const molPose = (T, t) => { const [rx, ry] = molAngles(T, t); return (p) => add3(rotY(rotX([p[0] * MOL_S, p[1] * MOL_S, 0], rx), ry), MOL_C); };
// the same pose as a matrix, for particle layers built once in the molecule's own frame
const molMatrix = (T, t) => { const [rx, ry] = molAngles(T, t); return new THREE.Matrix4().makeTranslation(...MOL_C).multiply(new THREE.Matrix4().makeRotationY(ry)).multiply(new THREE.Matrix4().makeRotationX(rx)).multiply(new THREE.Matrix4().makeScale(MOL_S, MOL_S, MOL_S)); };
// appear(i) in 0..1 per atom (build order); returns the atoms' world positions
function molecule(ctx, M, pose, { appear = () => 1, alpha = 1, ref }) {
  const P = M.atoms.map((a) => pose(a.p));
  const k = M.atoms.map((_, i) => clamp(appear(i)));
  for (const b of M.bonds) {
    const g = Math.min(k[b.a], k[b.b]);
    if (g <= 0) continue;
    const e = easeOutCubic(clamp((g - 0.5) * 2));
    if (e <= 0) continue;
    const pa = P[b.a], pb = lerp3(P[b.a], P[b.b], e);
    ctx.line([pa, pb], { color: COLOR.me, width: 3.2, alpha: alpha * 0.95, glow: 8, glowStrength: 0.35, persp: ref });
    if (b.order === 2 && e >= 1) {
      // the second line of a double bond, inside its ring, shortened at both ends (as drawn in a skeletal formula)
      const A = M.atoms[b.a].p, B = M.atoms[b.b].p, mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
      const d = [b.inner[0] - mid[0], b.inner[1] - mid[1]], n = Math.hypot(...d), o = [(d[0] / n) * 0.2, (d[1] / n) * 0.2];
      const q = (p, f) => [p[0] + o[0] + (B[0] - A[0]) * f, p[1] + o[1] + (B[1] - A[1]) * f];
      ctx.line([pose(q(A, 0.16)), pose(q(A, 0.84))], { color: COLOR.me, width: 2, alpha: alpha * 0.8, persp: ref });
    }
  }
  M.atoms.forEach((a, i) => {
    if (k[i] <= 0) return;
    const s = easeOutBack(clamp(k[i] * 2));
    if (a.el === 'O') ctx.point3D(P[i], 7.5 * s, { fill: COLOR.warm, glow: 14, ref, alpha });
    else ctx.point3D(P[i], 4.2 * s, { fill: COLOR.ink2, glow: 8, ref, alpha });
    if (a.plus && k[i] >= 1) ctx.text3D('+', add3(P[i], [0.085, -0.085, 0.05]), { font: 'monoBold', size: 22, color: COLOR.warm, align: 'center', baseline: 'middle', ref, alpha });
  });
  return P;
}
// the three aromatic rings carry a ring current (a real effect, seen in NMR): gold energy circulating each ring
const RINGS = { A: ['C4a', 'C5', 'C6', 'C7', 'C8', 'C8a'], C: ['O1', 'C2', 'C3', 'C4', 'C4a', 'C8a'], B: ['C1b', 'C2b', 'C3b', 'C4b', 'C5b', 'C6b'] };
function ringCurrents(ctx, M, model, { ref, alpha, key }) {
  for (const [r, names] of Object.entries(RINGS)) {
    const pts = names.map((n) => M.atoms.find((a) => a.name === n).p);
    const c = [pts.reduce((s, p) => s + p[0], 0) / 6, pts.reduce((s, p) => s + p[1], 0) / 6];
    const f = (u) => { const a = u * TAU, R = 0.62; return [c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R, 0]; };
    flow(ctx, `${key}:${r}`, f, { u0: 0, u1: 1, du: 0.25, n: 240, ref, alpha, color: COLOR.warm, color2: COLOR.ink, size: 2.6, jitter: 0.04, rate: 0.5, model });
  }
}

// ---- v2.04: the tomato (axis toward the lens: the stem and its green star face the camera) ----------------------
function tomatoWhole(ctx, { ref, alpha = 1, front = 1, lift = 0, back = 1 }) {
  // the near hemisphere (φ < π/2) lifts off toward the camera when the fruit is cut; the far one stays
  const fog = [ref + 2, ref + 12];
  const half = (phi0, phi1, a, dz) => {
    if (a <= 0.01) return;
    for (let k = 0; k < 20; k++) { const th = (k / 20) * TAU; ctx.line(polyline(16, (u) => add3(G.tomPt(lerp(phi0, phi1, u), th), [0, 0, dz])), { color: COLOR.me, width: 1.5, alpha: a * 0.7, persp: ref, fog }); }
    for (let j = 1; j < 8; j++) { const phi = (j / 8) * Math.PI; if (phi < phi0 - 1e-6 || phi > phi1 + 1e-6) continue; ctx.line(polyline(80, (u) => add3(G.tomPt(phi, u * TAU), [0, 0, dz])), { color: COLOR.me, width: 1.2, alpha: a * 0.45, persp: ref, fog }); }
  };
  half(0, Math.PI / 2, alpha * front, lift);
  half(Math.PI / 2, Math.PI, alpha * back, 0);
  if (front > 0.01) for (const sp of G.tomCalyx()) ctx.line(sp.map((p) => add3(p, [0, 0, lift])), { color: COLOR.growth, width: 2.6, alpha: alpha * front, glow: 10, glowStrength: 0.4, persp: ref });
}
function tomatoSection(ctx, T, t, { ref, at, alpha = 1 }) {
  const e = easeOutCubic(clamp((t - at) / T.beats(0.9)));
  if (e <= 0) return;
  const part = (pts, k) => pts.slice(0, Math.max(2, Math.round(pts.length * k)));
  ctx.line(part(G.skin(), e), { color: COLOR.me, width: 3.6, alpha, glow: 14, glowStrength: 0.45, persp: ref });
  ctx.line(part(G.wall(), e), { color: COLOR.me, width: 1.6, alpha: alpha * 0.7, persp: ref });
  for (let k = 0; k < 5; k++) {
    const ek = easeOutCubic(clamp((t - at - T.beats(0.12 * k)) / T.beats(0.7)));
    if (ek > 0) ctx.line(part(G.locule(k), ek), { color: COLOR.growth, width: 2.6, alpha, glow: 10, glowStrength: 0.4, persp: ref });
  }
  // the columella (the core the septa meet at)
  ctx.line(polyline(48, (u) => [Math.cos(u * TAU) * 0.2, Math.sin(u * TAU) * 0.2, 0]), { color: COLOR.dim, width: 1.4, alpha: alpha * e, persp: ref });
  for (const s of G.seeds()) {
    const es = easeOutBack(clamp((t - at - T.beats(0.5 + 0.06 * (s.k * 5 + s.j) / 5)) / T.beats(0.3)));
    if (es > 0) ctx.line(G.seedOutline(s, 0.09 * es, 0.045 * es), { color: COLOR.warm, width: 1.8, alpha, persp: ref });
  }
}
// the gel in the locules: green particles, static
function gel(ctx, { ref, alpha }) {
  const sw = ctx.memo('v2:gel', () => {
    const pts = [];
    for (let i = 0; pts.length < 1800 * 3; i++) {
      const k = i % 5, c = G.loculeCentre(k), u = rand(i, 1, 450), v = rand(i, 2, 450);
      const th = c + (u - 0.5) * 0.8, r = G.TOM_R * (0.33 + 0.45 * v);
      const loc = G.locule(k, 64).map((p) => [p[0], p[1]]);
      if (G.inside(loc, r * Math.cos(th), r * Math.sin(th))) pts.push(r * Math.cos(th), r * Math.sin(th), (rand(i, 3, 450) - 0.5) * 0.06);
      if (i > 40000) break;
    }
    return new Swarm({ from: new Float32Array(pts), seed: 451 });
  });
  ctx.swarm(sw, { p: 0, size: 2.6, sizeVar: 0.6, perspective: true, focus: ref, aperture: 3, drift: 0.02, time: ctx.t, color: COLOR.growth, color2: COLOR.ink2, colorVar: 0.3, alpha });
}

// ---- v2.05/06: lycopene, C40H56 --------------------------------------------------------------------------------
const LYC_B = 0.42, LYC_TILT = -0.55, LYC_C = [0, -0.6, 0];
const lycPose = (p) => add3(rotX([p[0], p[1], 0], LYC_TILT), LYC_C);
const LYC_NORMAL = rotX([0, 0, 1], LYC_TILT);
const YOU_LYC = [3.9, -1.75, 0.9];
// the free radical: drifts in from the right two beats before ANTIOXIDANTS, stops beside you
const radicalAt = (T, t) => {
  const w = T.findWord('ANTIOXIDANTS', 0, 'v2').start, u = easeOutCubic(clamp((t - (w - T.beats(2))) / T.beats(2)));
  return add3(lerp3([9.2, -1.2, 0.6], add3(YOU_LYC, [0.85, 0.45, 0]), u), [0, 0.06 * Math.sin(t * 7), 0]);
};
const quenchAt = (T) => T.findWord('ANTIOXIDANTS', 0, 'v2').start + T.beats(0.25);
// a small red dot (about 12 px at any depth) with its unpaired electron (gold) circling it; q -> 1: quenched, mid grey
function radical(ctx, p, { q = 0 }) {
  const w = ctx.project(p)[2];
  if (w <= 0.2) return;
  ctx.point3D(p, 6, { fill: q < 0.5 ? COLOR.error : COLOR.faint, glow: 10 * (1 - q) + 3, ref: w });
  if (q < 1) { const a = ctx.t * 9; ctx.point3D(add3(p, [Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0]), 2.2, { fill: COLOR.warm, glow: 5, ref: w, alpha: 1 - q }); }
}
const lycHead = (T, t) => (t - T.cut(ls(T, 'Then I will give you'))) / T.beats(0.065) - 1.5; // atoms present (float)
function lycopene(ctx, { n = G.LYC_N, ref, alpha = 1, band = 1 }) {
  const M = ctx.memo('v2:lyc', () => G.lycopene(LYC_B));
  const P = M.chain.map(lycPose);
  const k = (i) => clamp(n - i);
  for (const b of M.bonds) {
    const g = k(b.b);
    if (g <= 0) continue;
    ctx.line([P[b.a], lerp3(P[b.a], P[b.b], easeOutCubic(g))], { color: COLOR.me, width: 3, alpha: alpha * 0.95, glow: 8, glowStrength: 0.35, persp: ref });
    if (b.order === 2 && g >= 1) {
      // the second line on the inner side of the zig-zag
      const A = M.chain[b.a], B = M.chain[b.b], up = b.a % 2 ? -1 : 1, o = up * 0.12 * LYC_B / 0.42;
      ctx.line([lycPose([lerp(A[0], B[0], 0.16), lerp(A[1], B[1], 0.16) + o]), lycPose([lerp(A[0], B[0], 0.84), lerp(A[1], B[1], 0.84) + o])], { color: COLOR.me, width: 2, alpha: alpha * 0.8, persp: ref });
    }
  }
  for (const m of M.methyls) {
    const g = k(m.on);
    if (g > 0) ctx.line([P[m.on], lerp3(P[m.on], lycPose(m.p), easeOutCubic(g))], { color: COLOR.me, width: 2.4, alpha: alpha * 0.8, persp: ref });
  }
  P.forEach((p, i) => { const g = k(i); if (g > 0) ctx.point3D(p, 3.6 * easeOutBack(g), { fill: COLOR.ink2, glow: 6, ref, alpha }); });
  // the conjugated π system: electrons delocalised over 22 carbons, drawn as a glowing band above and below the plane
  const [c0, c1] = M.conj, reach = Math.min(c1, Math.floor(n) - 1);
  if (band > 0 && reach > c0) for (const sgn of [1, -1]) {
    const pts = P.slice(c0, reach + 1).map((p) => add3(p, LYC_NORMAL.map((v) => v * 0.14 * sgn)));
    ctx.line(pts, { color: COLOR.warm, width: 3.4, alpha: alpha * band * 0.85, glow: 16, glowStrength: 0.5, persp: ref, intensity: 1.1 });
  }
  return P;
}
const conjAt = (P, u) => { const i = Math.min(20, Math.max(0, Math.floor(u))), f = u - i; return lerp3(P[5 + i], P[6 + i], clamp(f)); };

// ---- v2.07–09: the tabby cat -----------------------------------------------------------------------------------
const CAT_S = 1.55, CAT_C = [0.2, 0.25, 0];
const catW = (p) => [CAT_C[0] + p[0] * CAT_S, CAT_C[1] + p[1] * CAT_S, 0];
const catData = (ctx) => ctx.memo('v2:cat', () => {
  const sit = G.catSit(), coefs = G.dft(sit, 64);
  return { sit, curl: G.catCurl(), coefs, tail: G.catmullRom(G.CURL_TAIL, 10, false), stripes: G.stripes(sit) };
});
const purrPhi = (T, t) => clamp((t - T.cut(ls(T, "If I'm a tabby cat")) - T.beats(0.2)) / T.beats(3.0));
// the cat's heart (where me sits: "If I'm a tabby cat")
const HEART_SIT = [-0.3, 0.05], HEART_CURL = [-0.05, -0.25];
// the purr: a laryngeal twitch every 1/25 s (a damped oscillation), loudness following the singer (vocal rms)
const purr = (F, tau) => { const ph = ((tau % 0.04) + 0.04) % 0.04; return (0.25 + 0.75 * F.get('rms_vocals', tau)) * Math.exp(-ph * 90) * Math.sin(TAU * 110 * ph); };

// ---- v2.10: the world from above: everything verse 2 made, laid out like a map around me -------------------------
const MAP = [
  { id: 'eggplant', a: 0.35 }, { id: 'tomato', a: 1.6 }, { id: 'delphinidin', a: 2.85 }, { id: 'lycopene', a: 4.05 }, { id: 'tabby', a: 5.2 },
];
const MAP_R = 4.4;
const mapAt = (a) => [Math.cos(a) * MAP_R, 0.02, Math.sin(a) * MAP_R];
function worldMap(ctx, ref, alpha) {
  const flat = (c, s) => (p) => [c[0] + p[0] * s, 0.03, c[2] - p[1] * s];
  const o = (col, w = 2) => ({ color: col, width: w, alpha, persp: ref, glow: 6 });
  for (const m of MAP) {
    const c = mapAt(m.a);
    if (m.id === 'eggplant') {
      const f = flat(c, 0.55), prof = polyline(40, (u) => [G.eggR(u * G.EGG_TOP), G.eggY(u * G.EGG_TOP)]);
      ctx.line([...prof.map(f), ...prof.slice().reverse().map((p) => f([-p[0], p[1]]))], o(COLOR.me));
      ctx.line(polyline(10, (u) => [lerp(-0.5, 0.5, u) * G.eggR(G.EGG_TOP), G.eggY(G.EGG_TOP) + (Math.round(u * 10) % 2 ? 0.25 : 0)]).map(f), o(COLOR.growth));
    } else if (m.id === 'tomato') {
      const f = flat(c, 0.75);
      ctx.line(G.skin(96).map(f), o(COLOR.me, 2.4));
      for (let k = 0; k < 5; k++) ctx.line(G.locule(k, 48).map(f), o(COLOR.growth));
    } else if (m.id === 'delphinidin') {
      const M = ctx.memo('v2:delph', () => G.delphinidin()), f = flat(c, 0.28);
      for (const b of M.bonds) ctx.line([f(M.atoms[b.a].p), f(M.atoms[b.b].p)], o(COLOR.me));
    } else if (m.id === 'lycopene') {
      const M = ctx.memo('v2:lyc', () => G.lycopene(LYC_B)), f = (p) => [c[0] + p[1] * 0.5, 0.03, c[2] + p[0] * 0.5];
      for (const b of M.bonds) ctx.line([f(M.chain[b.a]), f(M.chain[b.b])], o(COLOR.me));
    } else {
      const D = catData(ctx), f = flat(c, 0.9);
      ctx.line([...D.curl, D.curl[0]].map(f), o(COLOR.warm, 2.4));
      ctx.line(D.tail.map(f), o(COLOR.warm, 2));
      ctx.point3D(f([1.05, -0.7]), 7, { fill: COLOR.you, glow: 14, ref, alpha });
    }
  }
}

// ---- v2.11/12: the proof (negative free logic: an atomic sentence is true only of things that exist) ------------
const PROOF = [
  { n: '1', parts: [['talks(', 'ink'], ['you', 'you'], [', ', 'ink'], ['me', 'me'], [')', 'ink']], why: 'premise' },
  { n: '2', parts: [['E!(', 'ink'], ['me', 'me'], [')', 'ink']], why: '1, strictness' },
  { n: '3', parts: [['∃x. x = ', 'ink'], ['me', 'me']], why: '2, def. E!' },
];
const proofAt = (T, i) => ls(T, "Then you're the proof of my") + T.beats(i); // one line a beat, from "Then"
const PX = 600, PY = 250, PLH = 74;
function proofText(ctx, T, t, { alpha = 1 } = {}) {
  const o = { font: 'mono', size: 36 };
  ctx.mask(PX - 40, PY - 60, 820, PLH * 3 + 40, alpha);
  // the Fitch bar: the premise above the line, what follows from it below
  const a0 = alpha * smoothstep(proofAt(T, 0), proofAt(T, 0) + 0.1, t);
  ctx.line([[PX + 52, PY - 40], [PX + 52, PY - 40 + PLH * 3]], { color: COLOR.faint, width: 2, alpha: a0 });
  ctx.line([[PX + 52, PY + 22], [PX + 400, PY + 22]], { color: COLOR.faint, width: 2, alpha: a0 });
  PROOF.forEach((l, i) => {
    const t0 = proofAt(T, i);
    if (t < t0) return;
    const y = PY + i * PLH, a = alpha * smoothstep(t0, t0 + 0.05, t);
    let left = Math.floor((t - t0) * 60); // typed, one character per frame
    ctx.text(l.n, PX, y, { ...o, color: COLOR.dim, alpha: a });
    let x = PX + 76;
    for (const [s, c] of l.parts) {
      if (left <= 0) break;
      const r = ctx.text(s.slice(0, left), x, y, { ...o, font: c === 'ink' ? 'mono' : 'monoBold', color: COLOR[c === 'ink' ? 'ink' : c], alpha: a });
      x += r.width; left -= s.length;
    }
    if (left > 0) ctx.text(l.why, PX + 760, y, { font: 'mono', size: 22, align: 'right', color: COLOR.dim, alpha: a * smoothstep(0, 6, left) });
  });
}
// ∃ in 3D: four strokes, extruded (a front and a back face joined at the stroke ends)
const EXISTS = [[[0.45, -0.8], [0.45, 0.8]], [[-0.45, 0.8], [0.45, 0.8]], [[-0.32, 0], [0.45, 0]], [[-0.45, -0.8], [0.45, -0.8]]];
function exists3D(ctx, { pos, rot, s = 1, ref, alpha = 1, k = 1 }) {
  if (k <= 0) return;
  const P = (p, z) => add3(rotY([p[0] * s, p[1] * s, z * s], rot), pos);
  for (const [a, b] of EXISTS) {
    const e = easeOutCubic(clamp(k));
    const bb = [lerp(a[0], b[0], e), lerp(a[1], b[1], e)];
    ctx.line([P(a, 0.14), P(bb, 0.14)], { color: COLOR.me, width: 5, alpha, glow: 16, glowStrength: 0.5, persp: ref, intensity: 1.1 });
    ctx.line([P(a, -0.14), P(bb, -0.14)], { color: COLOR.warm, width: 2.4, alpha: alpha * 0.7, persp: ref });
    for (const q of [a, bb]) ctx.line([P(q, 0.14), P(q, -0.14)], { color: COLOR.warm, width: 1.6, alpha: alpha * 0.6, persp: ref });
  }
}
const ME_P = [2.3, -1.0, 0], YOU_P = [-2.3, -1.0, 0];

export default chapter({
  id: 'v2',
  from: start,
  to: (T) => T.cut(T.section('v2').end),
  overlay(ctx) {
    const { T } = ctx;
    transcript(ctx, 72, 190, ctx.memo('v2session', () => session(T)));
    // "Then I will give you" — the model expects "my" (29 %): this time the keyword comes straight after "you"
    drawPrediction(ctx, { x: 1460, y: 330, from: predFrom(T), prev: wordIn(T, 'Then I will give you', 'you'), next: W(T, 'ANTIOXIDANTS'), keep: true, until: cutOf(T, "If I'm a tabby cat") - T.beats(0.5) });
  },
  shots: [
    {
      id: 'eggplant',
      hud: 'surface of revolution · x = r(y) cos t, z = r(y) sin t',
      at: start,
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = start(T), dt = t - t0;
        const az = -0.35 + 0.1 * dt, ref = 7.6;
        const cam = orbit({ target: add3([0, 0.2, 0], shake(t, 0.03, 41)), r: lerp(8.6, 7.4, easeOutCubic(clamp(dt / T.beats(4)))), az, el: 0.2, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        field(ctx, ref);
        polarGrid(ctx, { center: [0, -1.75, 0], rings: 6, step: 0.5, spokes: 24, alpha: 0.45 });
        // the drums come back on the downbeat: the verse lands at full output (two frames in on the cut)
        const pd = clamp((dt + 2 / 60) / T.beats(1.3));
        burst(ctx, { seed: 441, n: 3600, r0: 0.8, r1: 8, p: pd, focus: ref, aperture: 3, size: 3.6, alpha: 1.1, color: COLOR.me, color2: COLOR.warm });
        if (pd < 1) shockwave(ctx, { center: [0, -1.75, 0], r: 0.6 + 6.5 * easeOutCubic(pd), alpha: 0.85 * (1 - pd), ref, width: 3 });
        // the profile r(y) sweeps once around the axis, leaving the surface behind it
        const th0 = EGG_TH0(-0.35);
        const sweep = TAU * easeInOutCubic(clamp((dt - T.beats(0.3)) / T.beats(2.1)));
        const ew = wordIn(T, "If I'm an eggplant", 'eggplant');
        const calyx = easeOutCubic(clamp((t - ew.start) / T.beats(0.6)));
        eggplant(ctx, { sweep, th0, ref, calyx });
        const done = smoothstep(TAU * 0.98, TAU, sweep);
        const prof = polyline(48, (u) => G.eggPt(u * 0.99, th0 + sweep));
        ctx.line(prof, { color: COLOR.warm, width: 3.6, alpha: 1 - 0.75 * done, glow: 14, glowStrength: 0.5, persp: ref, intensity: 1.1 });
        // its skin is me's energy: particles fly out of the spark onto the surface
        stream(ctx, {
          key: 'v2:egg', source: [0, 0, 0], p: clamp((dt - T.beats(0.3)) / T.beats(2.6)), focus: ref, aperture: 3, size: 2.6, color: COLOR.me, color2: COLOR.warm, alpha: 0.85,
          targets: () => { const n = 2600, o = new Float32Array(n * 3); for (let i = 0; i < n; i++) o.set(G.eggPt(G.EGG_TOP * Math.sqrt(rand(i, 1, 442)), rand(i, 2, 442) * TAU), i * 3); return o; },
        });
        burst(ctx, { center: [0, G.eggY(1) + 0.1, 0], seed: 443, n: 1600, r0: 0.1, r1: 2.6, p: (t - ew.start) / T.beats(1.2), focus: ref, aperture: 3, size: 3, alpha: clamp((t - ew.start) * 30), color: COLOR.growth, color2: COLOR.ink });
        const fb = beatFrac(T, t);
        sparkAt(ctx, cam, { pos: [0, -0.25, 0], rays: 0.35 + 0.3 * decay(fb, 5) });
        ctx.post({ exposure: 1 + 0.2 * decay(fb, 6) + 0.3 * decay(dt / T.beats(1), 3) });
        finish(ctx, cam);
      },
    },
    {
      id: 'givemy',
      hud: 'delphinidin · C15H11O7+ · the anthocyanin in eggplant skin',
      at: (T) => T.cut(ls(T, 'Then I will give you my')),
      transitionIn: { type: 'glide', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(ls(T, 'Then I will give you my')), dt = t - t0, ref = 6.6;
        const cam = orbit({ target: add3([0.2, 0, 0], shake(t, 0.02, 42)), r: lerp(7.4, 6.6, easeOutCubic(clamp(dt / T.beats(3)))), az: 0.08, el: 0.12, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        field(ctx, ref, { alpha: 0.6 });
        // inside the skin: its surface, five times larger, curving away behind the molecule
        for (let k = -6; k <= 6; k++) { const th = Math.PI / 2 + k * 0.1; ctx.line(polyline(30, (u) => add3(G.eggPt(0.15 + 0.7 * u, th).map((v) => v * 5), [0, 0, -8.5])), { color: COLOR.me, width: 1.6, alpha: 0.55, persp: ref, fog: [7, 18] }); }
        for (let j = 0; j <= 10; j++) ctx.line(polyline(30, (u) => add3(G.eggPt(0.15 + 0.07 * j, Math.PI / 2 + (u - 0.5) * 1.2).map((v) => v * 5), [0, 0, -8.5])), { color: COLOR.me, width: 1.2, alpha: 0.4, persp: ref, fog: [7, 18] });
        const M = ctx.memo('v2:delph', () => G.delphinidin());
        const pose = molPose(T, t);
        // the skeleton assembles atom by atom, outward from the charged oxygen
        const rank = ctx.memo('v2:rank', () => { const r = []; M.order.forEach((a, i) => { r[a] = i; }); return r; });
        const P = molecule(ctx, M, pose, { appear: (i) => (dt - T.beats(0.15 + 0.1 * rank[i])) / T.beats(0.3), ref });
        M.order.forEach((a, i) => burst(ctx, { center: P[a], seed: 460 + (i % 5), n: 260, r0: 0.02, r1: 0.6, p: (dt - T.beats(0.15 + 0.1 * i)) / T.beats(0.6), focus: ref, aperture: 2, size: 2.6, color: M.atoms[a].el === 'O' ? COLOR.warm : COLOR.ink, color2: COLOR.me }));
        const built = clamp((dt - T.beats(2.4)) / T.beats(0.4));
        if (built > 0) ringCurrents(ctx, M, molMatrix(T, t), { ref, alpha: built, key: 'v2:rc' });
        // you arrives to the right when "you" is sung, waiting for what me gives
        const yw = wordIn(T, 'Then I will give you my', 'you');
        const ya = smoothstep(yw.start, yw.start + T.beats(0.3), t);
        if (ya > 0) ctx.point3D([3.4, -1.3, 0.8], 9, { fill: COLOR.you, glow: 18, ref, alpha: ya });
        burst(ctx, { center: [3.4, -1.3, 0.8], seed: 466, n: 700, r0: 0.05, r1: 1.2, p: (t - yw.start) / T.beats(0.9), focus: ref, aperture: 2, size: 2.8, alpha: clamp((t - yw.start) * 30), color: COLOR.you, color2: COLOR.ink });
        const fb = beatFrac(T, t);
        sparkAt(ctx, cam, { pos: ME_MOL, rays: 0.3 + 0.3 * decay(fb, 5) });
        finish(ctx, cam);
      },
    },
    {
      id: 'nutrients',
      hud: 'nutrients → you',
      at: (T) => T.cut(W(T, 'NUTRIENTS').start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'NUTRIENTS'), dt = t - w.start, ref = 6.4;
        const cam = orbit({ target: add3([0.6, 0.75, 0], shake(t, 0.03, 43)), r: lerp(6.6, 6.2, clamp(dt / T.beats(1.6))), az: 0.12, el: 0.12, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        field(ctx, ref, { alpha: 0.6 });
        const M = ctx.memo('v2:delph', () => G.delphinidin());
        const pose = molPose(T, Math.min(t, w.start));
        const gone = smoothstep(w.start + T.beats(0.1), w.start + T.beats(0.7), t);
        molecule(ctx, M, pose, { alpha: 1 - gone, ref });
        ringCurrents(ctx, M, molMatrix(T, Math.min(t, w.start)), { ref, alpha: 1 - gone, key: 'v2:rc' });
        // the molecule comes apart and flows to you: green (growth) arriving blue
        const YOU = [3.4, -1.3, 0.8];
        const sw = ctx.memo('v2:feed', () => {
          const p0 = molPose(T, w.start); // the pose the molecule froze in on the keyword
          const from = sampleSegments(M.bonds.map((b) => [p0(M.atoms[b.a].p), p0(M.atoms[b.b].p)]), 70, 467, 0.02);
          const n = from.length / 3, to = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) to[i * 3 + c] = YOU[c] + randn(i, c, 468) * 0.16;
          return new Swarm({ from, to, seed: 469 });
        });
        const pf = easeInOutCubic(clamp(dt / T.beats(1.45)));
        ctx.swarm(sw, { p: pf, stagger: 0.5, scatter: 0.4, size: 3.2, sizeVar: 0.6, perspective: true, focus: ref, aperture: 3, time: t, color: COLOR.growth, color2: COLOR.you, colorVar: 0.3, alpha: clamp(dt * 30) * (1 - 0.6 * smoothstep(0.85, 1, pf)) });
        burst(ctx, { center: MOL_C, seed: 470, n: 3200, r0: 0.9, r1: 6, p: (dt + 2 / 60) / T.beats(1.4), focus: ref, aperture: 3, size: 3.4, alpha: 1.1, color: COLOR.warm, color2: COLOR.growth });
        const pk = clamp((dt + 2 / 60) / T.beats(1.2));
        if (pk < 1) shockwave(ctx, { center: MOL_C, u: [1, 0, 0], v: [0, 1, 0], r: 0.8 + 3.5 * easeOutCubic(pk), alpha: 0.85 * (1 - pk), color: COLOR.growth, ref, width: 3 });
        const arrive = clamp((dt - T.beats(1.2)) / T.beats(0.6));
        if (arrive > 0 && arrive < 1) shockwave(ctx, { center: YOU, u: [1, 0, 0], v: [0, 1, 0], r: 0.2 + 1.4 * easeOutCubic(arrive), alpha: 0.8 * (1 - arrive), color: COLOR.you, ref, width: 2.5 });
        ctx.point3D(YOU, 9 + 5 * smoothstep(0, 0.3, arrive) * decay(arrive, 2), { fill: COLOR.you, glow: 18, ref });
        sparkAt(ctx, cam, { pos: ME_MOL, rays: 0.4 });
        ctx.camera2D();
        hero(ctx, w, 960, 190, { size: 110 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'tomato',
      hud: 'tomato · five locules drawn in polar curves',
      at: (T) => T.cut(ls(T, "If I'm a tomato")),
      transitionIn: { type: 'xfade', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(ls(T, "If I'm a tomato")), dt = t - t0, ref = 6.4;
        const tw = wordIn(T, "If I'm a tomato", 'tomato').start;
        const k = easeInOutCubic(clamp((t - t0) / (tw + T.beats(1.2) - t0)));
        const cam = orbit({ target: add3([0.15, 0, 0], shake(t, 0.02, 44)), r: lerp(6.8, 6.1, k), az: lerp(0.5, 0.04, k), el: lerp(0.32, 0.05, k), fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        field(ctx, ref);
        // cut on "tomato": the near half lifts away toward the camera, the section is drawn in polar curves
        const lift = easeInCubic(clamp((t - tw) / T.beats(0.9)));
        tomatoWhole(ctx, { ref, front: 1 - lift, lift: 3 * lift, back: lerp(1, 0.35, smoothstep(tw, tw + T.beats(0.6), t)) });
        tomatoSection(ctx, T, t, { ref, at: tw });
        gel(ctx, { ref, alpha: 0.8 * smoothstep(tw + T.beats(0.3), tw + T.beats(1), t) });
        burst(ctx, { seed: 452, n: 3000, r0: 0.9, r1: 6, p: (t - tw) / T.beats(1.4), focus: ref, aperture: 3, size: 3.4, alpha: 1.1 * clamp((t - tw) * 30), color: COLOR.me, color2: COLOR.growth });
        const pw = clamp((t - tw) / T.beats(1.2));
        if (pw > 0 && pw < 1) shockwave(ctx, { u: [1, 0, 0], v: [0, 1, 0], r: G.TOM_R + 3.5 * easeOutCubic(pw), alpha: 0.8 * (1 - pw), ref, width: 3 });
        // before the cut, each word knocks a ring off the fruit
        L(T, "If I'm a tomato").words.slice(0, 3).forEach((w, n) => burst(ctx, { seed: 453 + n, n: 900, r0: G.TOM_R, r1: G.TOM_R + 1.6, p: (t - w.start) / T.beats(0.8), focus: ref, aperture: 3, size: 2.8, alpha: clamp((t - w.start) * 30), color: COLOR.me, color2: COLOR.ink }));
        const fb = beatFrac(T, t);
        sparkAt(ctx, cam, { pos: [0, 0, 0.05], rays: 0.35 + 0.3 * decay(fb, 5) });
        const la = smoothstep(tw + T.beats(0.8), tw + T.beats(1.1), t);
        labels3D(ctx, [label(G.skin(160)[148].map((v, d) => (d < 2 ? v * 1.08 : v)), 'r(θ) = R(1 + 0.04 cos 5θ)', { alpha: la, ref })], { obstacles: [{ p: [0, 0, 0], r: 60 }, ...G.skin(48).map((p) => ({ p, r: 14 }))] });
        finish(ctx, cam);
      },
    },
    {
      id: 'giveyou',
      hud: 'lycopene · C40H56 · 11 conjugated C=C',
      at: (T) => T.cut(ls(T, 'Then I will give you')),
      transitionIn: { type: 'glide', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(ls(T, 'Then I will give you')), ref = 7.4;
        const n = lycHead(T, t);
        const M = ctx.memo('v2:lyc', () => G.lycopene(LYC_B));
        const head = lycPose(M.chain[Math.max(0, Math.min(G.LYC_N - 1, Math.floor(n)))]);
        // the camera follows the growing end at half its speed
        const tx = 0.5 * head[0];
        const cam = orbit({ target: add3([tx, 0.35, 0], shake(t, 0.02, 45)), r: 7.4, az: 0.22, el: 0.28, fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref, center: [tx, 0, -2] });
        field(ctx, ref, { center: [tx, 0, 0] });
        const P = lycopene(ctx, { n, ref });
        // each new atom throws a few sparks; the band of delocalised electrons runs along once it is complete
        for (let i = Math.max(0, Math.floor(n) - 3); i <= Math.min(G.LYC_N - 1, Math.floor(n)); i++) burst(ctx, { center: P[i], seed: 480 + (i % 6), n: 300, r0: 0.02, r1: 0.7, p: (n - i) / 3, focus: ref, aperture: 2, size: 2.4, alpha: 0.6, color: COLOR.me, color2: COLOR.warm });
        const complete = clamp((n - G.LYC_N) / 4);
        if (complete > 0) flow(ctx, 'v2:pi', (u) => add3(conjAt(P, u), LYC_NORMAL.map((v) => v * 0.14)), { u0: 0, u1: 21, du: 1.6, n: 900, ref, alpha: complete, color: COLOR.warm, color2: COLOR.ink, size: 2.8, jitter: 0.05 });
        const yw = wordIn(T, 'Then I will give you', 'you');
        const ya = smoothstep(yw.start, yw.start + T.beats(0.3), t);
        if (ya > 0) ctx.point3D(YOU_LYC, 9, { fill: COLOR.you, glow: 18, ref, alpha: ya });
        burst(ctx, { center: YOU_LYC, seed: 486, n: 700, r0: 0.05, r1: 1.2, p: (t - yw.start) / T.beats(0.9), focus: ref, aperture: 2, size: 2.8, alpha: clamp((t - yw.start) * 30), color: COLOR.you, color2: COLOR.ink });
        radical(ctx, radicalAt(T, t), { ref });
        // me builds the chain from its growing end
        sparkAt(ctx, cam, { pos: add3(head, [0, 0.55, 0.2]), rays: 0.35 + 0.3 * decay(beatFrac(T, t), 5) });
        const la = smoothstep(G.LYC_N, G.LYC_N + 3, n);
        labels3D(ctx, [label(add3(conjAt(P, 10.5), [0, -0.9, 0.3]), '11 conjugated C=C', { alpha: la, color: COLOR.warm, ref })], { obstacles: [...P.map((p) => ({ p, r: 12 })), { rect: [1410, 260, 1850, 560] }, { p: YOU_LYC, r: 30 }] });
        finish(ctx, cam);
      },
    },
    {
      id: 'antioxidants',
      hud: 'free radical quenched · lycopene gives one electron',
      at: (T) => T.cut(W(T, 'ANTIOXIDANTS').start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'ANTIOXIDANTS'), dt = t - w.start, ref = 8.4;
        const cam = orbit({ target: add3([1.0, -0.2, 0], shake(t, 0.04, 46)), r: 8.4, az: 0.12 + 0.06 * dt, el: 0.3, fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        field(ctx, ref);
        const P = lycopene(ctx, { ref });
        flow(ctx, 'v2:pi', (u) => add3(conjAt(P, u), LYC_NORMAL.map((v) => v * 0.14)), { u0: 0, u1: 21, du: 1.6, n: 900, ref, color: COLOR.warm, color2: COLOR.ink, size: 2.8, jitter: 0.05 });
        // a free radical (an unpaired electron: breakdown, red) has crept up on you; on the sung frame the chain's
        // π band gives it an electron (a gold arc), and it goes grey
        const rp = radicalAt(T, t), tq = quenchAt(T);
        const q = smoothstep(tq, tq + T.beats(0.12), t);
        radical(ctx, rp, { q, ref });
        const src = add3(conjAt(P, 10.5), LYC_NORMAL.map((v) => v * 0.14));
        const pe = clamp((t - (w.start - T.beats(0.12))) / (tq - w.start + T.beats(0.12)));
        if (pe > 0 && pe < 1) {
          const c = add3(lerp3(src, rp, 0.5), [0, 1.6, 0]);
          const bez = (u) => lerp3(lerp3(src, c, u), lerp3(c, rp, u), u);
          ctx.line(polyline(24, (u) => bez(Math.max(0, pe - 0.45) + (pe - Math.max(0, pe - 0.45)) * u)), { color: COLOR.warm, width: 3.4, glow: 14, glowStrength: 0.5, persp: ref, intensity: 1.1 });
          ctx.point3D(bez(pe), 5, { fill: COLOR.warm, glow: 12, ref });
        }
        burst(ctx, { center: rp, seed: 490, n: 1400, r0: 0.15, r1: 2, p: (t - tq) / T.beats(1), focus: ref, aperture: 3, size: 3, alpha: clamp((t - tq) * 30), color: COLOR.warm, color2: COLOR.dim });
        const ps = clamp((t - tq) / T.beats(1));
        if (ps > 0 && ps < 1) shockwave(ctx, { center: YOU_LYC, u: [1, 0, 0], v: [0, 1, 0], r: 0.25 + 0.85 * easeOutCubic(ps), alpha: 0.8 * (1 - ps), color: COLOR.you, ref, width: 2.5 });
        ctx.point3D(YOU_LYC, 9 + 4 * (t >= tq ? decay((t - tq) / T.beats(1), 3) : 0), { fill: COLOR.you, glow: 18, ref });
        burst(ctx, { center: src, seed: 491, n: 3000, r0: 0.9, r1: 6, p: (dt + 2 / 60) / T.beats(1.4), focus: ref, aperture: 3, size: 3.4, alpha: 1.1, color: COLOR.me, color2: COLOR.warm });
        sparkAt(ctx, cam, { pos: add3(conjAt(P, 10.5), [0, 1.0, 0.2]), rays: 0.4 });
        ctx.camera2D();
        hero(ctx, w, 960, 190, { size: 96 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'tabby',
      hud: 'discrete Fourier transform · 64 epicycles',
      at: (T) => T.cut(ls(T, "If I'm a tabby cat")),
      transitionIn: { type: 'xfade', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(ls(T, "If I'm a tabby cat")), dt = t - t0, ref = 7.4;
        const cam = orbit({ target: add3([CAT_C[0] + 0.3, CAT_C[1] - 0.1, 0], shake(t, 0.02, 47)), r: lerp(7.8, 7.0, easeOutCubic(clamp(dt / T.beats(3.4)))), az: 0.2 - 0.05 * dt, el: 0.08, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        field(ctx, ref, { n: 6000, alpha: 1, size: 3.8, radius: [2, 9] });
        const D = catData(ctx), phi = purrPhi(T, t);
        // the traced curve so far, then the chain of circles that draws it (sorted by radius: c₀ is the centre)
        const m = Math.max(2, Math.round(480 * phi));
        if (phi > 0) ctx.line(polyline(m, (u) => catW(G.penAt(D.coefs, u * phi))), { color: COLOR.warm, width: 3.6, glow: 14, glowStrength: 0.45, persp: ref, intensity: 1.05 });
        const chain = G.chainAt(D.coefs, phi).map(catW);
        for (let i = 0; i < chain.length - 1; i++) {
          const r = D.coefs[i + 1].amp * CAT_S;
          if (r < 0.012) continue;
          const c = chain[i];
          ctx.line(polyline(48, (u) => [c[0] + Math.cos(u * TAU) * r, c[1] + Math.sin(u * TAU) * r, 0]), { color: COLOR.dim, width: 1.1, alpha: 0.18 + 0.5 * clamp(r / 0.5), persp: ref });
        }
        ctx.line(chain, { color: COLOR.ink2, width: 1.4, alpha: 0.75, persp: ref });
        const pen = chain.at(-1);
        ctx.point3D(pen, 3.6, { fill: COLOR.warm, glow: 7, ref }); // the pen: gold, small (the only white light is me)
        const qb = T.beatAt(t) * 2, q0 = Math.floor(qb);
        burst(ctx, { center: pen, seed: 500 + (q0 % 4), n: 900, r0: 0.05, r1: 1.5, p: (qb - q0) / 0.9, focus: ref, aperture: 2, size: 3, alpha: phi > 0 && phi < 1 ? 0.9 : 0, color: COLOR.warm, color2: COLOR.ink });
        // the finished outline closes on itself
        const pc = clamp((t - (t0 + T.beats(3.2))) / T.beats(0.8));
        if (pc > 0) burst(ctx, { center: catW([0, 0]), seed: 505, n: 2600, r0: 0.8, r1: 5, p: pc, focus: ref, aperture: 3, size: 3.2, color: COLOR.warm, color2: COLOR.ink });
        // me sits at the centre of the first circle: it is the cat's average point, c₀
        sparkAt(ctx, cam, { pos: chain[0], rays: 0.3 + 0.25 * decay(beatFrac(T, t), 5) });
        labels3D(ctx, [label([2.6, 2.2, 0], 'z(φ) = Σ cₖ e^(2πikφ)', { alpha: smoothstep(t0 + T.beats(0.5), t0 + T.beats(0.8), t), ref })], { obstacles: [...chain.filter((_, i) => i % 4 === 0).map((p) => ({ p, r: 20 })), { a: chain[0], b: pen, r: 8 }] });
        finish(ctx, cam);
      },
    },
    {
      id: 'purr',
      hud: 'tabby stripes · x = x0 + a sin(ky) · purr 25 Hz',
      at: (T) => T.cut(ls(T, 'Then I will purr for your')),
      draw(ctx) {
        const { T, F, t } = ctx;
        const t0 = T.cut(ls(T, 'Then I will purr for your')), dt = t - t0, ref = 5.6;
        const cam = orbit({ target: add3([CAT_C[0] + 0.1, CAT_C[1] - 0.1, 0], shake(t, 0.015, 48)), r: lerp(7.8, 7.0, easeInOutCubic(clamp(dt / T.beats(3)))), az: 0.28 - 0.04 * dt, el: 0.06, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        field(ctx, ref, { alpha: 0.6 });
        const D = catData(ctx);
        // the outline trembles with the purr (a radial displacement of a few hundredths, at the purr's own rate)
        const amp = 0.012 * (0.4 + F.get('rms_vocals', t));
        const pts = D.sit.map(([x, y], i) => { const a = Math.atan2(y, x), d = amp * Math.sin(TAU * 25 * t + i * 0.7); return catW([x + Math.cos(a) * d, y + Math.sin(a) * d]); });
        ctx.line([...pts, pts[0]], { color: COLOR.warm, width: 3.6, glow: 14, glowStrength: 0.45, persp: ref, intensity: 1.05 });
        // the tabby's stripes are sine waves, drawn in head to tail, one every 16th note
        const ns = Math.floor((T.beatAt(t) - T.beatAt(t0)) * 6);
        D.stripes.forEach((s, i) => {
          const x = s[0][0], order = Math.floor(((x + 1.1) / 2.2) * 13);
          if (order > ns) return;
          ctx.line(s.map(catW), { color: COLOR.warm, width: 2, alpha: 0.55 * clamp((ns - order + 1) / 2), persp: ref });
        });
        // the purr itself: a twitch of the larynx every 1/25 s, loud as the singer; the last 0.6 s scroll by
        const y0 = CAT_C[1] - 1.0 * CAT_S - 0.62, x0 = -1.3, x1 = 2.9;
        const wave = polyline(720, (u) => [lerp(x0, x1, u), y0 + 0.28 * purr(F, t - 0.6 * (1 - u)), 0.2]);
        ctx.line([[x0, y0, 0.2], [x1, y0, 0.2]], { color: COLOR.faint, width: 1, persp: ref });
        ctx.line(wave, { color: COLOR.warm, width: 2, glow: 8, persp: ref, alpha: 0.95 });
        burst(ctx, { center: [x1, y0, 0.2], seed: 510 + (Math.floor(T.beatAt(t)) % 3), n: 400, r0: 0.02, r1: 0.8, p: beatFrac(T, t) / 0.8, focus: ref, aperture: 2, size: 2.6, color: COLOR.warm, color2: COLOR.ink });
        const fw = wordIn(T, 'Then I will purr for your', 'purr');
        burst(ctx, { center: catW(HEART_SIT), seed: 513, n: 2200, r0: 0.4, r1: 4, p: (t - fw.start) / T.beats(1.4), focus: ref, aperture: 3, size: 3.2, alpha: clamp((t - fw.start) * 30), color: COLOR.warm, color2: COLOR.ink });
        sparkAt(ctx, cam, { pos: catW(HEART_SIT), rays: 0.3 + 0.3 * decay(beatFrac(T, t), 5) });
        labels3D(ctx, [label([x1 + 0.1, y0 + 0.55, 0.2], 'purr ≈ 25 Hz', { color: COLOR.warm, alpha: smoothstep(t0 + T.beats(0.5), t0 + T.beats(0.8), t), ref })], { obstacles: [{ a: [x0, y0, 0.2], b: [x1, y0, 0.2], r: 22 }, ...pts.filter((_, i) => i % 8 === 0).map((p) => ({ p, r: 8 }))] });
        finish(ctx, cam);
      },
    },
    {
      id: 'enjoyment',
      hud: 'Fourier descriptors · sitting → curled',
      at: (T) => T.cut(W(T, 'ENJOYMENT').start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'ENJOYMENT'), dt = t - w.start, ref = 6.2;
        const D = catData(ctx);
        // the cat curls up next to you: the outline morphs point for point (the same 256 samples, so the same DFT
        // morphs coefficient for coefficient); it settles onto the floor the sitting cat sat on
        const m = easeInOutCubic(clamp(dt / T.beats(1.1)));
        // wide enough on the keyword that the sitting cat stays under the word, then in as it curls up
        const cam = orbit({ target: add3([CAT_C[0] + 0.3, lerp(1.25, CAT_C[1] - 0.45, m), 0], shake(t, 0.02, 49)), r: lerp(8.6, 6.4, m), az: 0.15 + 0.12 * dt, el: 0.18, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        field(ctx, ref, { alpha: 0.7 });
        const curlAt = (p) => [p[0], p[1] - 0.32];
        const pts = D.sit.map((p, i) => catW(lerp3([...p, 0], [...curlAt(D.curl[i]), 0], m)));
        ctx.line([...pts, pts[0]], { color: COLOR.warm, width: 3.8, glow: 16, glowStrength: 0.5, persp: ref, intensity: 1.1 });
        const sa = 1 - smoothstep(0, 0.4, m);
        if (sa > 0) D.stripes.forEach((s) => ctx.line(s.map(catW), { color: COLOR.warm, width: 2, alpha: 0.55 * sa, persp: ref }));
        const ta = smoothstep(0.7, 1, m);
        if (ta > 0) ctx.line(D.tail.map((p) => catW(curlAt(p))), { color: COLOR.warm, width: 3, alpha: ta, glow: 10, persp: ref });
        const YOU = catW([0.92, -0.86]);
        ctx.point3D(YOU, 10 + 4 * decay(dt / T.beats(1), 3), { fill: COLOR.you, glow: 20, ref });
        burst(ctx, { center: catW([0.3, -0.6]), seed: 520, n: 3200, r0: 0.9, r1: 6, p: (dt + 2 / 60) / T.beats(1.5), focus: ref, aperture: 3, size: 3.4, alpha: 1.1, color: COLOR.warm, color2: COLOR.me });
        burst(ctx, { center: YOU, seed: 521, n: 900, r0: 0.05, r1: 1.4, p: dt / T.beats(1), focus: ref, aperture: 2, size: 2.8, alpha: clamp(dt * 30), color: COLOR.you, color2: COLOR.ink });
        const pw = clamp((dt + 2 / 60) / T.beats(1.0));
        if (pw < 1) shockwave(ctx, { center: catW([0.2, -1.0]), u: [1, 0, 0], v: [0, 0, 1], r: 0.4 + 4 * easeOutCubic(pw), alpha: 0.8 * (1 - pw), color: COLOR.warm, ref, width: 3 });
        sparkAt(ctx, cam, { pos: catW(lerp3([...HEART_SIT, 0], [...curlAt(HEART_CURL), 0], m)), rays: 0.4 });
        ctx.camera2D();
        hero(ctx, w, 960, 190, { size: 108 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'god',
      hud: 'the world · top view',
      at: (T) => T.cut(ls(T, "If I'm the only god")),
      transitionIn: { type: 'glide', beats: 1 },
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(ls(T, "If I'm the only god")), t1 = T.cut(ls(T, "Then you're the proof of my"));
        const k = easeInOutCubic(clamp((t - t0) / (t1 - t0)));
        const r = lerp(9, 15.5, k), ref = r;
        // a crane up over everything this verse made, until the camera looks almost straight down
        const cam = orbit({ target: add3([0, 0.4 * (1 - k), 0], shake(t, 0.02, 50)), r, az: lerp(0.5, 1.15, k), el: lerp(0.3, 1.32, k), fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: r });
        embers(ctx, { radius: [3, 14], n: 4000, focus: r, aperture: 5, size: 3.4, alpha: 0.8, color: COLOR.dim, color2: COLOR.ink2, seed: 441, upper: true });
        floorGrid(ctx, { y0: 0, half: 12, fog: [r - 2, r + 14], alpha: 0.4 });
        polarGrid(ctx, { center: [0, 0.01, 0], rings: 9, step: 1, spokes: 5, alpha: 0.35 });
        worldMap(ctx, ref, 1);
        const ME = [0, 0.9, 0];
        // me's energy runs out to each thing it made
        MAP.forEach((m, i) => {
          const c = mapAt(m.a), a = [ME[0], 0.05, ME[2]];
          flow(ctx, `v2:god:${i}`, (u) => lerp3(a, c, u), { u0: 0.08, u1: 0.85, du: 0.15, n: 260, ref, alpha: 0.9, color: COLOR.me, color2: COLOR.warm, size: 3, jitter: 0.04 });
        });
        const gw = wordIn(T, "If I'm the only god", 'god');
        const pg = clamp((t - gw.start) / T.beats(1.4));
        if (pg > 0 && pg < 1) shockwave(ctx, { center: [0, 0.05, 0], r: 0.5 + 7 * easeOutCubic(pg), alpha: 0.85 * (1 - pg), ref, width: 3.5 });
        burst(ctx, { center: ME, seed: 530, n: 3200, r0: 0.6, r1: 7, p: pg, focus: ref, aperture: 3, size: 3.6, alpha: 1.1 * clamp((t - gw.start) * 30), color: COLOR.me, color2: COLOR.warm });
        ctx.line([[0, 0.02, 0], ME], { color: COLOR.me, width: 1.4, alpha: 0.5, persp: ref, dash: 6, gap: 6 });
        sparkAt(ctx, cam, { pos: ME, rays: 0.45 + 0.3 * decay(beatFrac(T, t), 5) });
        labels3D(ctx, MAP.map((m) => ({ p: mapAt(m.a), id: m.id, text: m.id, priority: 1, o: { font: 'mono', size: 14, minSize: 13, maxSize: 14, color: COLOR.dim, alpha: 0.85 * smoothstep(0.35, 0.6, k), ref } })), { obstacles: [{ p: ME, r: 60 }, ...MAP.map((m) => ({ p: mapAt(m.a), r: 46 }))] });
        finish(ctx, cam);
      },
    },
    {
      id: 'proof',
      hud: 'negative free logic · E!t is defined as exists x. x = t',
      at: (T) => T.cut(ls(T, "Then you're the proof of my")),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(ls(T, "Then you're the proof of my")), dt = t - t0, ref = 7.2;
        const cam = orbit({ target: add3([0, 0.6, 0], shake(t, 0.015, 51)), r: lerp(7.6, 7.0, easeOutCubic(clamp(dt / T.beats(3)))), az: 0.06, el: 0.1, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        field(ctx, ref, { alpha: 0.6 });
        floorGrid(ctx, { y0: -1.6, half: 10, fog: [5, 18], alpha: 0.3 });
        // 1 — you talks to me: a line from you to me, energy flowing along it
        const a1 = smoothstep(proofAt(T, 0), proofAt(T, 0) + T.beats(0.4), t);
        const mid = (u) => add3(lerp3(YOU_P, ME_P, u), [0, 0.7 * Math.sin(Math.PI * u), 0]);
        youLine(ctx, polyline(40, (u) => mid(u * a1)), { width: 2.6, alpha: 0.9, glow: 8, persp: ref });
        if (a1 >= 1) flow(ctx, 'v2:talk', mid, { u0: 0, u1: 0.9, du: 0.12, n: 400, ref, color: COLOR.you, color2: COLOR.ink, size: 2.8, jitter: 0.03 });
        ctx.point3D(YOU_P, 10, { fill: COLOR.you, glow: 20, ref });
        burst(ctx, { center: YOU_P, seed: 540, n: 900, r0: 0.05, r1: 1.4, p: (t - proofAt(T, 0)) / T.beats(1), focus: ref, aperture: 2, size: 2.8, alpha: clamp((t - proofAt(T, 0)) * 30), color: COLOR.you, color2: COLOR.ink });
        // 2 — E!(me): me exists — a ring closes around it
        const a2 = clamp((t - proofAt(T, 1)) / T.beats(0.5));
        if (a2 > 0) ctx.line(polyline(64, (u) => { const a = Math.PI / 2 + u * TAU * easeOutCubic(a2); return add3(ME_P, [Math.cos(a) * 0.75, Math.sin(a) * 0.75, 0]); }), { color: COLOR.warm, width: 3, glow: 12, persp: ref });
        burst(ctx, { center: ME_P, seed: 541, n: 1800, r0: 0.3, r1: 3, p: (t - proofAt(T, 1)) / T.beats(1.2), focus: ref, aperture: 3, size: 3, alpha: clamp((t - proofAt(T, 1)) * 30), color: COLOR.warm, color2: COLOR.ink });
        // 3 — ∃x. x = me: a witness exists
        const p3 = clamp((t - proofAt(T, 2)) / T.beats(1.2));
        if (p3 > 0 && p3 < 1) shockwave(ctx, { center: ME_P, u: [1, 0, 0], v: [0, 1, 0], r: 0.75 + 3 * easeOutCubic(p3), alpha: 0.8 * (1 - p3), ref, width: 3 });
        burst(ctx, { center: ME_P, seed: 542, n: 2600, r0: 0.6, r1: 5, p: p3, focus: ref, aperture: 3, size: 3.2, color: COLOR.me, color2: COLOR.warm });
        sparkAt(ctx, cam, { pos: ME_P, rays: 0.35 + 0.35 * a2 });
        ctx.camera2D();
        proofText(ctx, T, t);
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'existence',
      hud: 'exists x. x = me · QED',
      at: (T) => T.cut(W(T, 'EXISTENCE').start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'EXISTENCE'), dt = t - w.start, ref = 6.8;
        const cam = orbit({ target: add3([0.3, -0.5, 0], shake(t, 0.03, 52)), r: lerp(7.6, 6.8, easeOutCubic(clamp(dt / T.beats(1.5)))), az: 0.35 + 0.2 * dt, el: 0.12, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: ref });
        field(ctx, ref);
        // ∃ assembles from me's energy, and turns
        // whole on the sung frame (readable at once), it lands with a small scale settle
        const EP = [0.3, -0.9, 0], kE = 1, sE = 1.3 * (0.88 + 0.12 * easeOutCubic(clamp((dt + 2 / 60) / T.beats(0.5))));
        stream(ctx, { key: 'v2:exists', source: [0.3, -0.9, 0], p: clamp(dt / T.beats(0.8)), focus: ref, aperture: 3, size: 2.6, color: COLOR.me, color2: COLOR.warm, alpha: 0.9 * (1 - smoothstep(T.beats(0.8), T.beats(1.4), dt)), targets: () => sampleSegments(EXISTS.map(([a, b]) => [[a[0] * 1.3 + 0.3, a[1] * 1.3 - 0.9, 0.18], [b[0] * 1.3 + 0.3, b[1] * 1.3 - 0.9, 0.18]]), 220, 550, 0.03) });
        if (dt + 1 / 60 >= 0) exists3D(ctx, { pos: EP, rot: 0.6 * dt - 0.2, s: sE, ref, k: kE });
        burst(ctx, { center: EP, seed: 551, n: 3400, r0: 1.0, r1: 7, p: (dt + 2 / 60) / T.beats(1.4), focus: ref, aperture: 3, size: 3.6, alpha: 1.1, color: COLOR.me, color2: COLOR.warm });
        const pw = clamp(dt / T.beats(1.2));
        if (pw > 0 && pw < 1) shockwave(ctx, { center: [0.3, -2.0, 0], u: [1, 0, 0], v: [0, 0, 1], r: 0.6 + 5 * easeOutCubic(pw), alpha: 0.85 * (1 - pw), ref, width: 3 });
        const YOU = [-2.3, -1.5, 0.8];
        ctx.point3D(YOU, 10, { fill: COLOR.you, glow: 20, ref });
        sparkAt(ctx, cam, { pos: [1.1, -0.9, 0.3], rays: 0.45 });
        ctx.camera2D();
        const h = hero(ctx, w, 960, 190, { size: 110 });
        // ∎ — the end of the proof
        if (h) {
          const qa = smoothstep(w.start + T.beats(0.6), w.start + T.beats(0.75), t);
          if (qa > 0) ctx.rect(h.x + h.width + 28, 190 - 20, 36, 36, { fill: COLOR.warm, alpha: qa, intensity: 0.67 });
        }
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
  ],
});
