// 07 c2 — if I can feel your vibrations, then I can finally be completion. The chorus opens as c1 did; me flies
// low over the song's own mel spectrogram (the music still to come rolls toward it, VIBRATIONS arriving as a ridge).
// From VIBRATIONS to the end it is one square Chladni plate and one continuous camera: you sings above it, and every
// half beat its sand (me) jumps into the figure the loudest band of that half beat picks — until, on COMPLETION,
// the plate changes family and the sand closes into loops (a ring inside a square), which rise around you, me
// rising with them.
// Storyboard: docs/storyboard.md §07 · review: docs/review/c2.md.
import * as THREE from 'three';
import { chapter } from '../engine/timeline.js';
import { Swarm } from '../engine/gl/swarm.js';
import { COLOR } from '../theme.js';
import { corners } from '../lib/hud.js';
import { hero } from '../lib/hero.js';
import { clamp, lerp, easeOutCubic, easeInOutCubic, smoothstep, decay, mix3 } from '../lib/ease.js';
import { sparkAt } from '../lib/spark.js';
import { orbit, shake, add3 } from '../lib/camera.js';
import { axisGizmo, dust, labels3D } from '../lib/scene3d.js';
import { embers, burst, shockwave, flow } from '../lib/fx.js';
import { chorusOpen } from './c1/open.js';
import { S, CLOSED, chladni, modeOf, scatter, settle, toss, loops } from './c2/chladni.js';
import { SPEC, ridge, xOf, centroidX, terrain } from './c2/spectrum.js';
import { G, densityGrid, contour, cellX, lifted } from './c2/terrain.js';

const TAU = Math.PI * 2;
const start = (T) => T.cut(T.section('c2').start);
const L = (T, text, n = 0) => T.findLine(text, n, 'c2');
const W = (T, k) => T.findWord(k, 0, 'c2');
const ls = (T, text) => L(T, text).words[0].start;
const cutOf = (T, text) => T.cut(ls(T, text));
const field = (ctx, focus, o = {}) => embers(ctx, { radius: [2.5, 10], n: 3000, focus, aperture: 5, size: 3.2, alpha: 0.8, color: COLOR.dim, color2: COLOR.ink2, seed: 740, ...o });
const label = (p, text, o = {}) => ({ p, id: text, text, priority: 10, o: { font: 'mono', size: 22, minSize: 20, maxSize: 24, color: COLOR.ink2, backing: 0.7, ref: 7, ...o } });
const beatFrac = (T, t) => { const b = T.beatAt(t); return b - Math.floor(b); };
const finish = (ctx, cam) => { ctx.camera2D(); corners(ctx, { color: COLOR.faint }); axisGizmo(ctx, cam); };

// ---- c2.02: flying over the spectrogram ------------------------------------------------------------------------
// the spectral centroid, averaged over the last 1/4 beat so me glides instead of jittering
function glideX(T, F, t) {
  let s = 0;
  for (let i = 0; i < 8; i++) s += centroidX(F, t - (i / 8) * T.beats(0.25));
  return s / 8;
}
function nowHeight(F, t, x) {
  const h = ridge(F, t), f = ((x / SPEC.X + 1) / 2) * (SPEC.NX - 1), i = Math.max(0, Math.min(SPEC.NX - 2, Math.floor(f)));
  return 0.02 + SPEC.H * (h[i] + (h[i + 1] - h[i]) * (f - i));
}

// ---- c2.03–06: one plate, one take ------------------------------------------------------------------------------
const NSAND = 20000;
const YOU = [0, 1.85, 0]; // you sings above the plate
// me holds the plate by the edge nearest the camera (it stays at the front while the plate turns) and feels it
const meAt = (cam) => {
  const x = cam.position[0], z = cam.position[2], k = (S + 0.22) / Math.max(Math.abs(x), Math.abs(z), 1e-6);
  return [x * k, 0.3, z * k];
};
const tV = (T) => W(T, 'VIBRATIONS').start;
const tC = (T) => W(T, 'COMPLETION').start;
// the steps the sand takes ({ t, dur, mode, band, onBeat }): from VIBRATIONS, one every half beat, the mode the
// loudest mel band of that half beat picks — never the one just played, and the last 3 count half (the figure keeps
// changing); from "finally"
// the figures grow simpler: the first may climb, then each step takes the loudest band below the last one, kept
// high enough that a band is left for every remaining step (the last reaches band 0); the sand lands in 0.3 beat; the last step (the closed family) ends exactly on COMPLETION's frame
function steps(T, F) {
  const out = [], last = tC(T) - T.beats(0.5), fin = ls(T, 'Then I can finally be') - T.beats(0.25);
  const h0 = Math.round(T.beatAt(tV(T)) * 2), h1 = Math.ceil(T.beatAt(last - 1e-6) * 2); // data steps h0 … h1 − 1
  const all = Array.from({ length: 16 }, (_, b) => b);
  let first = true;
  for (let h = h0; h < h1; h++) {
    const a = T.beatTime(h / 2), prev = out.at(-1), rest = h1 - 1 - h; // steps after this one
    let skip = prev ? [prev.band] : [];
    if (prev && a >= fin) {
      const lo = Math.min(rest, 15), hi = first ? 15 : Math.max(lo, prev.band - 1);
      skip = all.filter((b) => b < lo || b > hi || b === prev.band);
      if (skip.length === 16) skip = all.filter((b) => b !== Math.max(0, prev.band - 1));
      first = false;
    }
    const recent = a >= fin ? [] : out.slice(-3).map((s) => s.band);
    out.push({ t: Math.max(a, tV(T)), dur: T.beats(0.3), onBeat: h % 2 === 0, ...modeOf(F, a, T.beatTime((h + 1) / 2), skip, recent) });
  }
  out.push({ t: last, dur: T.beats(0.5), mode: CLOSED, onBeat: true });
  return out;
}
function sandOf(ctx) {
  const { T, F } = ctx;
  return ctx.memo('c2:sand', () => {
    const st = steps(T, F), sw = [];
    let P = scatter(NSAND, 771);
    const grids = [densityGrid(P)], tw = []; // grids[j + 1]: the sand once step j has settled; tw: the same on its terrain
    st.forEach((s, j) => {
      const Q = settle(j ? toss(P, s.onBeat ? 0.2 : 0.07, 776 + j) : P, s.mode, 772 + j);
      sw.push(new Swarm({ from: P, to: Q, seed: 790 + j }));
      grids.push(densityGrid(Q));
      tw.push(new Swarm({ from: lifted(P, grids[j], 1), to: lifted(Q, grids[j + 1], 1), seed: 790 + j }));
      P = Q;
    });
    return { st, sw, grids, tw };
  });
}
const stepAt = (st, t) => { let j = -1; st.forEach((s, i) => { if (t >= s.t) j = i; }); return j; };
// the figure on screen: a step counts once its sand is 60 % of the way
function shownStep(st, t) {
  const j = stepAt(st, t);
  if (j <= 0) return st[0];
  return (t - st[j].t) / st[j].dur >= 0.6 ? st[j] : st[j - 1];
}
const modeNow = (T, F, t) => shownStep(steps(T, F), t);
const modeHud = (T, t, F) => { const s = modeNow(T, F, t); return `chladni (n, m) = (${s.mode[0]}, ${s.mode[1]}) · loudest mel band ${s.band} · every 1/2 beat`; };

// one camera for the whole take: it keeps orbiting (fast on VIBRATIONS, then slowing), rises to look down on the
// figures, and on COMPLETION tilts down and pulls back to watch the loops rise to you
function plateCam(T, t) {
  const a = tV(T), th = cutOf(T, 'Then I can'), c = tC(T), u = t - a;
  const cr = easeInOutCubic(clamp((t - c) / T.beats(1.4)));
  const hs = 1 - smoothstep(th - 0.1, th + 0.6, t); // VIBRATIONS' hero is up: the plate sits lower
  const el = lerp(0.62, 1.2, smoothstep(th - 0.3, c - 0.4, t)) - 0.72 * cr;
  const r = lerp(8.8, 8.1, smoothstep(a, c, t)) + 2.2 * cr;
  const az = 0.3 + 0.9 * (1 - Math.exp(-u / 0.9)) + 0.22 * u;
  return orbit({ target: add3([0, 0.75 * hs + 1.55 * cr - 0.25, 0], shake(t, 0.02, 73)), r, az, el, fov: 42 });
}
const sandOpts = (ctx, p, ref, alpha = 1) => ({ p, stagger: 0.3, scatter: 0.12, drift: 0.003, time: ctx.t, size: 2.1, sizeVar: 0.5, perspective: true, focus: ref, aperture: 1.5, color: COLOR.warm, color2: COLOR.warm, colorVar: 0.2, alpha, blend: 'max' });
function sand(ctx, s, t, ref, alpha) {
  const j = stepAt(s.st, t);
  if (j < 0) ctx.swarm(s.sw[0], sandOpts(ctx, 0, ref, alpha));
  else ctx.swarm(s.sw[j], sandOpts(ctx, clamp((t - s.st[j].t) / s.st[j].dur), ref, alpha));
}
const circ = (r, y, n = 96) => Array.from({ length: n + 1 }, (_, i) => [r * Math.cos((i / n) * TAU), y, r * Math.sin((i / n) * TAU)]);
// the plate (a thin square slab) on its stand; the standing wave drawn on it (slow motion), amplitude = your voice
function plate(ctx, { ref, mode, amp = 0, phase = 0 }) {
  const sq = (y) => [[-S, y, -S], [S, y, -S], [S, y, S], [-S, y, S], [-S, y, -S]];
  ctx.line(sq(0), { color: COLOR.dim, width: 2, alpha: 0.75, persp: ref });
  ctx.line(sq(-0.07), { color: COLOR.faint, width: 1.4, alpha: 0.8, persp: ref });
  for (const [x, z] of [[-S, -S], [S, -S], [S, S], [-S, S]]) ctx.line([[x, 0, z], [x, -0.07, z]], { color: COLOR.faint, width: 1.4, alpha: 0.8, persp: ref });
  ctx.line([[0, -0.07, 0], [0, -1.6, 0]], { color: COLOR.faint, width: 3, alpha: 0.8, persp: ref });
  ctx.line(circ(0.35, -1.6, 32), { color: COLOR.faint, width: 1.4, alpha: 0.7, persp: ref });
  if (amp <= 0.002) return;
  const c = Math.cos(phase), o = { color: COLOR.dim, width: 1, alpha: 0.17, persp: ref };
  for (let dir = 0; dir < 2; dir++) for (let a = 1; a < 12; a++) {
    const q = (a / 12) * 2 * S - S, pts = [];
    for (let b = 0; b <= 40; b++) { const r = (b / 40) * 2 * S - S, x = dir ? q : r, z = dir ? r : q; pts.push([x, amp * chladni(mode, x, z) * c, z]); }
    ctx.line(pts, o);
  }
}
// you, and its voice reaching the plate: a square wavefront every half beat falls from you and spreads to the edges
function youSings(ctx, T, F, t, { ref, alpha = 1, flash = 0 }) {
  ctx.point3D(YOU, 12, { fill: COLOR.you, glow: 22 * (1 - 0.7 * flash), alpha: alpha * (1 - 0.3 * flash), ref });
  const v = 0.35 + 0.65 * F.get('rms_vocals', t);
  const b = T.beatAt(t) * 2;
  for (let k = Math.floor(b) - 1; k <= Math.floor(b); k++) {
    const q = b - k;
    if (q < 0 || q > 1) continue;
    const y = YOU[1] * (1 - q), r = 0.15 + (S - 0.15) * easeOutCubic(q);
    ctx.line([[-r, y, -r], [r, y, -r], [r, y, r], [-r, y, r], [-r, y, -r]], { color: COLOR.you, width: 2.4, alpha: alpha * Math.max(0.3, v * 0.6) * (1 - 0.5 * q), glow: 6, glowStrength: 0.3, persp: ref, intensity: 0.85 });
  }
  // where a ring lands, the plate answers: a square wavefront running in from the edges (0.6 beat)
  for (let k = Math.floor(b) - 2; k <= Math.floor(b); k++) {
    const q = (b - k - 1) / 1.2;
    if (q < 0 || q > 1) continue;
    const h = S * (1 - 0.55 * easeOutCubic(q));
    ctx.line([[-h, 0.012, -h], [h, 0.012, -h], [h, 0.012, h], [-h, 0.012, h], [-h, 0.012, -h]], { color: COLOR.you, width: 2, alpha: alpha * 0.35 * (1 - q), glow: 5, glowStrength: 0.3, persp: ref, intensity: 0.85 });
  }
}
// everything in the take but the hero and the labels (the same scene in all four shots: the cuts do not show)
function plateScene(ctx, cam, { ref = 8 } = {}) {
  const { T, F, t } = ctx;
  const s = sandOf(ctx), j = stepAt(s.st, t), c = tC(T);
  const cr = easeOutCubic(clamp((t - c) / T.beats(1.2)));
  dust(ctx, { focus: ref });
  field(ctx, ref, { alpha: 0.65 });
  const mode = s.st[Math.max(0, j)].mode;
  plate(ctx, { ref, mode, amp: (j < 0 ? 0 : 0.11) * (0.35 + 0.65 * F.get('rms_vocals', t)) * (1 - cr), phase: T.beatAt(t) * TAU * 2 });
  const flash = t >= c ? decay((t - c) / T.beats(1.5), 2.5) : 0;
  sand(ctx, s, t, ref, 1 - 0.5 * flash);
  youSings(ctx, T, F, t, { ref, alpha: 1 - cr * 0.3, flash });
  // each step throws the sand: a flash runs across the plate
  for (const st of s.st) {
    const q = (t - st.t) / T.beats(0.6);
    if (!st.onBeat || q <= 0 || q >= 1) continue;
    const h = 0.15 + S * 1.1 * easeOutCubic(q);
    ctx.line([[-h, 0.01, -h], [h, 0.01, -h], [h, 0.01, h], [-h, 0.01, h], [-h, 0.01, -h]], { color: COLOR.warm, width: 2.2, alpha: 0.45 * (1 - q), glow: 12, glowStrength: 0.35, persp: ref });
  }
  // COMPLETION: the sand has closed into loops; they rise from the plate around you, and me rises with them
  if (t >= c - 1 / 60) {
    const ls = ctx.memo('c2:loops', () => loops(CLOSED, 2));
    ls.forEach((loop, i) => {
      const y = YOU[1] * cr * (0.45 + 0.55 * i);
      ctx.line(loop.map(([x, , z]) => [x, y, z]), { color: COLOR.me, color2: COLOR.warm, width: 3.2, glow: 10, glowStrength: 0.3, persp: ref, intensity: 0.78, alpha: clamp((t - c) * 30 + 0.5) });
      const n = loop.length - 1;
      flow(ctx, `c2:rise${i}`, (u) => { const f = (((u % 1) + 1) % 1) * n, k = Math.floor(f), a = loop[k], b = loop[Math.min(n, k + 1)]; return [a[0] + (b[0] - a[0]) * (f - k), 0, a[2] + (b[2] - a[2]) * (f - k)]; }, { u0: 0, u1: 1, du: 0.04, n: 600 + 300 * i, ref, alpha: 0.6, color: COLOR.me, color2: COLOR.warm, size: 2.4, rate: 4, model: new THREE.Matrix4().makeTranslation(0, y, 0) });
    });
  }
  const k = easeInOutCubic(clamp((t - c - T.beats(0.1)) / T.beats(1.2)));
  const m0 = meAt(cam), me = [lerp(m0[0], -1.05, k), lerp(m0[1], YOU[1] - 0.15, k), lerp(m0[2], 0, k)]; // then up beside you
  sparkAt(ctx, cam, { pos: me, rays: (0.45 + 0.5 * cr) * (1 - 0.6 * smoothstep(0.6, 1, k)) });
  return { mode: shownStep(s.st, t).mode };
}

// ---- c2.04/05: the same sand as a contour map (height = grains per cell) ------------------------------------------
const HT = 1.15; // terrain height at density 1
const LEVELS = [0.15, 0.32, 0.5, 0.68, 0.86];
// the density now: the grid of the last settled figure, eased toward the next one as its sand moves
function densityNow(s, t) {
  const j = stepAt(s.st, t);
  if (j < 0) return s.grids[0];
  const a = s.grids[j], b = s.grids[j + 1], e = easeInOutCubic(clamp((t - s.st[j].t) / s.st[j].dur));
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] + (b[i] - a[i]) * e;
  return out;
}
const gridPt = ([gx, gz], y) => [cellX(gx), y, cellX(gz)];
// height: terrain scale (world units at density 1); rise: 0 → 1 lifts it from the flat plate; mesh: wire mesh on
function terrainScene(ctx, cam, { ref, height = HT, rise = 1, mesh = false, far = false, size = 2.1, sandAlpha = 1 }) {
  const { T, F, t } = ctx;
  const s = sandOf(ctx), h = densityNow(s, t), Hy = height * rise;
  dust(ctx, { focus: ref });
  field(ctx, ref, { alpha: 0.6 });
  ctx.line([[-S, 0, -S], [S, 0, -S], [S, 0, S], [-S, 0, S], [-S, 0, -S]], { color: COLOR.dim, width: 1.6, alpha: 0.6, persp: ref });
  if (mesh) {
    const o = { color: COLOR.faint, width: 1, alpha: 0.4, persp: ref };
    for (let a = 2; a < G; a += 5) {
      ctx.line(Array.from({ length: G }, (_, b) => [cellX(b), h[a * G + b] * Hy, cellX(a)]), o);
      ctx.line(Array.from({ length: G }, (_, b) => [cellX(a), h[b * G + a] * Hy, cellX(b)]), o);
    }
  }
  // the contour lines, helpers to read the ground: grey at the foot, gold up the slopes, me's orange on the crests
  LEVELS.forEach((lv, i) => {
    const k = i / (LEVELS.length - 1);
    const col = k < 0.34 ? mix3(COLOR.faint, COLOR.warm, k / 0.34) : mix3(COLOR.warm, COLOR.me, (k - 0.34) / 0.66);
    for (const line of contour(h, lv)) ctx.line(line.map((q) => gridPt(q, lv * Hy)), { color: col, width: 1.3 + 1.2 * k, alpha: 0.5, glow: k > 0.6 ? 6 : 0, glowStrength: 0.25, persp: ref, intensity: 0.85 });
  });
  // the sand itself, every grain on the ground where it lies (the same grains, moving as on the plate)
  const j = stepAt(s.st, t);
  if (j >= 0) ctx.swarm(s.tw[j], { ...sandOpts(ctx, clamp((t - s.st[j].t) / s.st[j].dur), ref, sandAlpha), size, model: new THREE.Matrix4().makeScale(1, Hy, 1) });
  youSings(ctx, T, F, t, { ref });
  // far: me holds the far edge (in the close, wide shot the near edge is right at the lens)
  const m = meAt(cam);
  sparkAt(ctx, cam, { pos: far ? [-m[0], m[1], -m[2]] : m, rays: 0.45 });
}
const terrainHud = (T, t, F) => { const s = modeNow(T, F, t); return `contour map · height = sand per cell · (n, m) = (${s.mode[0]}, ${s.mode[1]})`; };

export default chapter({
  id: 'c2',
  from: start,
  to: (T) => T.cut(T.section('c2').end),
  shots: [
    {
      id: 'ifican',
      hud: 'output · every ray open',
      at: start,
      draw(ctx) {
        const { T } = ctx;
        chorusOpen(ctx, { t0: start(T), t1: cutOf(T, 'If I can feel your'), words: L(T, 'If I can').words, seed: 740, shakeSeed: 71 });
      },
    },
    {
      id: 'feel',
      hud: 'mel spectrogram · now -> 6 beats ahead',
      at: (T) => cutOf(T, 'If I can feel your'),
      draw(ctx) {
        const { T, F, t } = ctx;
        const x = glideX(T, F, t), y = nowHeight(F, t, x);
        const sh = shake(t, 0.03, 72);
        const cam = { fov: 52, up: [0, 1, 0], position: add3([x * 0.25, 2.2, 4.4], sh), target: [x * 0.1, -0.1, -5] };
        ctx.camera3D(cam);
        embers(ctx, { center: [0, 0.4, -6], radius: [3, 13], upper: true, squash: 0.5, n: 2600, focus: 6, aperture: 5, size: 3, alpha: 0.7, color: COLOR.dim, color2: COLOR.ink2, seed: 741 });
        // the ridges: a 1/12-beat grid of song time from just behind the camera to six beats ahead; the sung
        // words and VIBRATIONS are marked where they will be heard
        const rows = [];
        for (let j = Math.floor(T.beatAt(t - 0.8) * 12); j <= Math.ceil(T.beatAt(t + T.beats(6)) * 12); j++) rows.push({ tau: T.beatTime(j / 12), style: 'grid' });
        const marks = [...L(T, 'If I can feel your').words, W(T, 'VIBRATIONS')];
        for (const w of marks) rows.push({ tau: w.start, style: 'mark', a: 0.55 + 0.45 * decay(Math.abs(t - w.start) / T.beats(0.5), 3) });
        rows.push({ tau: t, style: 'now' });
        terrain(ctx, t, rows, { ref: 5, fog: [8, 19], zNear: 3.2 });
        // me rides the now ridge at the spectrum's centre of mass; every word is a burst
        const me = [x, y + 0.14, 0];
        for (const [n, w] of L(T, 'If I can feel your').words.entries()) {
          const pw = (t - w.start) / T.beats(1.1);
          burst(ctx, { center: me, seed: 744 + n, n: 700, r0: 1.5, r1: 3.4, p: pw + 2 / 60 / T.beats(1.1), focus: 5, aperture: 3, size: 2.2, alpha: clamp((t - w.start) * 30), color: COLOR.me, color2: COLOR.warm });
          if (pw > 0 && pw < 1) shockwave(ctx, { center: me, u: [1, 0, 0], v: [0, 1, 0], r: 0.15 + 0.55 * easeOutCubic(pw), alpha: 0.6 * (1 - pw), ref: 5, width: 2.5 });
        }
        sparkAt(ctx, cam, { pos: me, rays: 0.5 + 0.3 * decay(beatFrac(T, t), 5) });
        const v = W(T, 'VIBRATIONS'), zv = -(v.start - t) * SPEC.V;
        labels3D(ctx, [
          label([xOf(SPEC.NX - 1) + 0.15, 0.25, 0], 'now', { ref: 5, color: COLOR.warm, size: 18, minSize: 16, maxSize: 20 }),
          ...(zv < -1.2 ? [label([xOf(SPEC.NX - 1) + 0.2, 0.3, zv], `VIBRATIONS · ${v.start.toFixed(2)} s`, { ref: 5, color: COLOR.warm, size: 18, minSize: 15, maxSize: 20, priority: 9 })] : []),
        ], { obstacles: [{ p: me, r: 50 }] });
        ctx.post({ bloom: 0.8, exposure: 1 + 0.15 * decay(beatFrac(T, t), 5) });
        finish(ctx, cam);
      },
    },
    {
      id: 'vibrations',
      hud: modeHud,
      at: (T) => T.cut(tV(T)),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'VIBRATIONS'), dt = t - w.start;
        const cam = plateCam(T, t);
        ctx.camera3D(cam);
        plateScene(ctx, cam);
        // the strike: your voice reaches the plate
        burst(ctx, { center: [0, 0.2, 0], seed: 750, n: 3200, r0: 0.8, r1: 6, p: (dt + 2 / 60) / T.beats(1.4), focus: 8, aperture: 3, size: 3.4, alpha: 1.1 * clamp(dt * 30), color: COLOR.me, color2: COLOR.warm });
        ctx.post({ bloom: 0.8, exposure: 1 + 0.18 * decay(beatFrac(T, t), 5) });
        ctx.camera2D();
        hero(ctx, w, 960, 175, { size: 104 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'thenican',
      hud: terrainHud,
      at: (T) => cutOf(T, 'Then I can'),
      draw(ctx) {
        const { T, t } = ctx;
        // montage 1: low and wide (fov 64), close, turning clockwise fast
        const t0 = cutOf(T, 'Then I can'), t1 = cutOf(T, 'Then I can finally be'), k = clamp((t - t0) / (t1 - t0));
        const b0 = T.beatAt(t0), nb = T.beatAt(t1) - b0, bt = Math.max(0, T.beatAt(t) - b0);
        const step = (Math.floor(bt) + easeOutCubic(clamp((bt % 1) / 0.35))) / nb; // one turn per beat, landing on it
        const cam = orbit({ target: add3([0, 0.2, 0], shake(t, 0.02, 76)), r: lerp(5.4, 4.8, easeOutCubic(k)), az: 2.4 - 1.5 * step, el: lerp(0.32, 0.4, k), fov: 64 });
        ctx.camera3D(cam);
        terrainScene(ctx, cam, { ref: 5, far: true, size: 1.5, sandAlpha: 0.7, height: HT * 0.5, rise: easeOutCubic(clamp((t - t0) / T.beats(0.5))) });
        ctx.post({ bloom: 0.8, exposure: 1 + 0.12 * decay(beatFrac(T, t), 5) });
        finish(ctx, cam);
      },
    },
    {
      id: 'finally',
      hud: terrainHud,
      at: (T) => cutOf(T, 'Then I can finally be'),
      draw(ctx) {
        const { T, t } = ctx;
        // montage 2: high and long (fov 24 → 19), far away and pushing in, turning the other way, slowly
        const t0 = cutOf(T, 'Then I can finally be'), t1 = T.cut(tC(T)), k = easeInOutCubic(clamp((t - t0) / (t1 - t0)));
        const cam = orbit({ target: add3([0, 0.3, 0], shake(t, 0.015, 77)), r: lerp(17, 14, k), az: 4.1 + 0.55 * k, el: lerp(0.98, 0.78, k), fov: lerp(24, 19, k) });
        ctx.camera3D(cam);
        terrainScene(ctx, cam, { ref: 15, mesh: true, size: 3.2 });
        ctx.post({ bloom: 0.8, exposure: 1 + 0.1 * decay(beatFrac(T, t), 5) });
        finish(ctx, cam);
      },
    },
    {
      id: 'completion',
      hud: 'chladni (2, 4) with + : closed loops',
      at: (T) => T.cut(tC(T)),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'COMPLETION'), dt = t - w.start;
        const cam = plateCam(T, t);
        ctx.camera3D(cam);
        plateScene(ctx, cam);
        // the brightest moment of the film: every colour me gave, out of you
        const pe = (dt + 2 / 60) / T.beats(1.5), flash = decay(dt / T.beats(1.5), 2.5) * clamp(dt * 30 + 0.6) * (dt >= 0 ? 1 : 0);
        [[COLOR.me, COLOR.warm], [COLOR.you, COLOR.you], [COLOR.growth, COLOR.growth], [COLOR.warm, COLOR.me]].forEach(([c1, c2], n) =>
          burst(ctx, { center: YOU, seed: 760 + n, n: 5000, r0: 1.6 + 0.3 * n, r1: 7 + n, p: pe, focus: 8, aperture: 3, size: 3.8, alpha: 1.15 * clamp(dt * 30 + 0.6) * (dt >= 0 ? 1 : 0), color: c1, color2: c2 }));
        if (dt >= 0 && pe > 0 && pe < 1) shockwave(ctx, { center: YOU, u: [1, 0, 0], v: [0, 0, 1], r: S + 5 * easeOutCubic(pe), alpha: 0.85 * (1 - pe), ref: 8, width: 3.5, color: COLOR.warm });
        ctx.post({ bloom: 0.85, exposure: 1 + 0.17 * flash });
        ctx.camera2D();
        hero(ctx, w, 960, 175, { size: 112 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
  ],
});
