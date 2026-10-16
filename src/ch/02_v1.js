// 02 v1 — me learns the world: geometry. Each "If I'm a …" is built for real (a point set at its embedding
// coordinates, a tesseract, a circle rolled out into 2π, a helix that is a sine wave, its tangents, 1/x ridden to
// infinity) and each "give you my X" is a diff moving X from me to you. Every next-token guess is wrong: the model
// has learned that a keyword follows "my", but every keyword is new. Storyboard: docs/storyboard.md §02 ·
// review: docs/review/v1.md.
import * as THREE from 'three';
import { chapter } from '../engine/timeline.js';
import { COLOR } from '../theme.js';
import { Swarm } from '../engine/gl/swarm.js';
import * as S from '../lib/sample.js';
import { corners } from '../lib/hud.js';
import { clamp, lerp, easeOutCubic, easeInOutCubic, smoothstep, decay } from '../lib/ease.js';
import { rand } from '../lib/hash.js';
import { piDigits } from '../lib/pi.js';
import { drawSpark, sparkSize } from '../lib/spark.js';
import { orbit, shake, add3, lerp3 } from '../lib/camera.js';
import { floorGrid, polarGrid, axisGizmo, dust, labels3D, youLine } from '../lib/scene3d.js';
import { drawPrediction } from '../lib/predict.js';
import { transcript } from '../lib/cc.js';
import { hero } from '../lib/hero.js';
import { embeddings, attention } from '../lib/embed.js';
import { indexOf } from '../lib/corpus.js';
import { embers, burst, shockwave, sampleSegments } from '../lib/fx.js';
import { cloud, halo, v1Camera, CLOUD_COLOR, ME_V1, YOU_V1, PLAN, planStart, planTimes } from './v1/cloud.js';
import { tesseract } from './v1/tesseract.js';
import { world as asymptote, zoom, gapCaliper, decade, curvePt } from './v1/asymptote.js';

const TAU = Math.PI * 2;
const SPARK_PX = 70; // one on-screen size for me in every shot of the chapter (as in intro and inst1)
const start = (T) => T.cut(T.section('v1').start);
const W = (T, k) => T.findWord(k, 0, 'v1');
const L = (T, text, n = 0) => T.findLine(text, n, 'v1');
const translate = (x, y = 0, z = 0) => new THREE.Matrix4().makeTranslation(x, y, z);
// the beat pulse (1 on the beat, decaying)
const pulse = (T, t, k = 5) => { const b = T.beatAt(t); return decay(b - Math.floor(b), k); };

function spark(ctx, cam, { pos = [0, 0, 0], px = SPARK_PX, rays = 0.35 } = {}) {
  drawSpark(ctx, { pos, size: sparkSize(cam, px, pos) });
  ctx.point3D(pos, 7, { fill: COLOR.ink, glow: 16 }); // the core reads even when the rays are seen edge-on
  if (rays > 0) { const sp = ctx.project(pos); ctx.post({ rays: [sp[0], sp[1], rays * 1.3], bloom: 0.72 }); }
}
// a segment of length 2·half centred on p along direction d (normalised)
const along = (p, d, half) => { const n = Math.hypot(...d); return [p.map((v, i) => v - (d[i] / n) * half), p.map((v, i) => v + (d[i] / n) * half)]; };
// neutral background embers (orange belongs to me and its energy)
const field = (ctx, focus, o = {}) => embers(ctx, { radius: [2.5, 10], n: 3000, focus, aperture: 5, size: 3.2, alpha: 0.8, color: COLOR.dim, color2: COLOR.ink2, seed: 140, ...o });

// Claude Code transcript (left). Reading budget: one panel at a time; the prediction panels (right) take turns with it.
//   the plan (inst1's todo, still on screen) → after each keyword: "give you my X" = an edit moving X from me to you
const TODO_END = (T) => T.barTime(16) + T.beats(1.5); // the plan hands over to the verse (gone by beat 2)
function session(T) {
  const kw = (k) => W(T, k).start;
  const D = kw('DIMENSION'), C = kw('CIRCUMFERENCE');
  const diff = (at, until, x) => ({ kind: 'tool', at, until, name: 'Update', arg: 'me.js', body: [{ kind: 'del', text: `me.${x}` }, { kind: 'add', text: `you.${x}` }] });
  return [
    { kind: 'todo', at: planStart(T), until: TODO_END(T), items: PLAN.map((k, i) => ({ text: k, done: kw(k), at: planTimes(T)[i] })) },
    { ...diff(D + T.beats(1.75), D + T.beats(5.5), 'dimension = 4'), body: [{ kind: 'del', text: 'me.dimension = 4' }, { kind: 'add', text: 'you.dimension = 4' }] },
    diff(C + T.beats(1.75), C + T.beats(6), 'circumference'),
    diff(L(T, 'If I approach infinity').words[0].start + T.beats(0.25), L(T, 'Then you can be my').words[0].start + T.beats(1), 'tangents'),
  ];
}

// ---- v1.01: the set of points ---------------------------------------------------------------------------------
// the words at their real embedding coordinates (PPMI-SVD, first 3 axes), centred and uniformly scaled into the
// lattice — a similarity transform, so distances stay truthful
function embedded(E, words, radius = 2.1) {
  const P = words.map((w) => E.point3(w.text));
  const c = [0, 1, 2].map((d) => P.reduce((s, p) => s + p[d], 0) / P.length);
  const R = Math.max(...P.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2])));
  return P.map((p) => p.map((v, d) => ((v - c[d]) * radius) / R));
}
const pointsWords = (T) => [...L(T, "If I'm a set of points").words, ...L(T, 'Then I will give you my', 0).words];

// ---- v1.05/06: the sine wave. Its particles are one static sampled curve translated along x (a phase shift of a
// periodic curve is a translation), so they flow with the wave.
const KW = TAU / 4; // one period every 4 units; the phase advances a quarter period per beat
const phase = (T, t) => T.beatAt(t) * Math.PI * 0.5;
function waveParticles(ctx, key, f, { ref, alpha = 1, color = COLOR.me, color2 = COLOR.warm, size = 2.6, n = 70 } = {}) {
  const sw = ctx.memo(`v1:wave:${key}`, () => {
    const pts = Array.from({ length: 601 }, (_, i) => f(-14 + (i / 600) * 28));
    return new Swarm({ from: sampleSegments(pts.slice(1).map((p, i) => [pts[i], p]), n, 310, 0.04), seed: 311 });
  });
  const dx = ((phase(ctx.T, ctx.t) / KW) % 4 + 4) % 4;
  ctx.swarm(sw, { p: 0, model: translate(dx), size, sizeVar: 0.6, perspective: true, focus: ref, aperture: 4, drift: 0.04, time: ctx.t, color, color2, colorVar: 0.3, alpha, fog: [ref + 3, ref + 14] });
}

export default chapter({
  id: 'v1',
  from: start,
  to: (T) => T.cut(T.section('v1').end),
  overlay(ctx) {
    const { T } = ctx;
    transcript(ctx, 72, 190, ctx.memo('v1session', () => session(T)));
    // next-token prediction before DIMENSION, CIRCUMFERENCE and LIMITATIONS (TANGENTS is told by the picture)
    const D = W(T, 'DIMENSION');
    drawPrediction(ctx, { x: 1460, y: 330, from: T.barTime(16) + T.beats(4.5), prev: L(T, 'Then I will give you my', 0).words.at(-1), next: D });
    drawPrediction(ctx, { x: 1460, y: 330, from: D.start + T.beats(6), prev: L(T, 'Then I will give you my', 1).words.at(-1), next: W(T, 'CIRCUMFERENCE') });
    const lb = L(T, 'Then you can be my');
    drawPrediction(ctx, { x: 1460, y: 330, from: lb.words.at(-1).start - T.beats(1), prev: lb.words.at(-1), next: W(T, 'LIMITATIONS') });
  },
  shots: [
    {
      id: 'points',
      hud: 'embedding space · PPMI-SVD · axes 1-3 of d = 16',
      at: start,
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = start(T), t1 = T.cut(W(T, 'DIMENSION').start);
        const k = easeInOutCubic(clamp((t - t0) / (t1 - t0)));
        const cam = v1Camera(k);
        const camDist = lerp(10.5, 7.4, k);
        ctx.camera3D(cam);
        dust(ctx, { focus: camDist });
        halo(ctx, { focus: camDist });
        const words = pointsWords(T);
        // the verse lands on the downbeat of bar 16: a shockwave and a burst from me
        const pd = clamp((t - t0) / T.beats(1.5));
        shockwave(ctx, { center: ME_V1, u: [1, 0, 0], v: [0, 1, 0], r: 0.3 + 4 * easeOutCubic(pd), alpha: 0.9 * (1 - pd), ref: camDist, width: 3 });
        burst(ctx, { center: ME_V1, seed: 160, n: 2600, r0: 0.2, r1: 4.5, p: pd, focus: camDist, aperture: 3, size: 3.4, alpha: 1.1, color: COLOR.ink, color2: COLOR.me });
        // the clusters inst1 built snap into the lattice in four beats, a quarter per beat; each beat the lattice flashes
        const bs = Math.max(0, T.beatAt(t) - T.beatAt(T.barTime(16)));
        const p = clamp((Math.floor(bs) + easeOutCubic(bs % 1)) / 4);
        const flash = bs < 4.5 ? decay(bs % 1, 6) : 0;
        ctx.swarm(cloud(ctx), { p, stagger: 0.65, size: lerp(5, 5.2, p) * (1 + 0.35 * flash), perspective: true, focus: camDist, aperture: 8, fog: [9, 21], drift: 0.06 * (1 - p), scatter: 0.5, color: CLOUD_COLOR, color2: COLOR.me, colorVar: 0.15, alpha: 1 });
        const ts = T.barTime(16) + T.beats(4), ps = clamp((t - ts) / T.beats(1.5)); // the lattice is complete
        if (ps > 0) shockwave(ctx, { center: [0, 0, 0], r: 3.4 + 2.5 * easeOutCubic(ps), alpha: 0.6 * (1 - ps), ref: camDist, width: 2.5 });
        burst(ctx, { seed: 141, n: 2400, r0: 1.4, r1: 5.5, p: ps, focus: camDist, aperture: 3, size: 3.2, color: COLOR.ink, color2: COLOR.me });
        // me watches the context from outside it; a burst on every beat (the plan's fountain winds down)
        const pb = pulse(T, t);
        spark(ctx, cam, { pos: ME_V1, rays: 0.4 + 0.25 * pb });
        const bt = T.beatAt(t), fb = bt - Math.floor(bt);
        burst(ctx, { center: ME_V1, seed: 90 + (Math.floor(bt) % 3), n: 1200, r0: 0.1, r1: 2.6, p: fb / 0.75, focus: camDist, aperture: 3, size: 3, alpha: 0.6, color: COLOR.ink, color2: COLOR.me });
        // every sung word becomes a token at its embedding coordinates; the newest attends to the context
        // (lines = its row of the attention matrix, width/brightness = the real softmax weights)
        const E = embeddings(T);
        const where = ctx.memo('v1:embedded', () => embedded(E, words));
        const n = words.filter((w) => w.start <= t).length;
        const obstacles = [{ p: ME_V1, r: 40 }];
        if (n > 0) {
          const i = n - 1;
          const wts = ctx.memo(`v1:att:${i}`, () => attention(E, words.map((w) => w.text), i, { gain: 3 }));
          const a = easeOutCubic(clamp((t - words[i].start) / T.beats(0.4)));
          ctx.line([ME_V1, where[i]], { color: COLOR.me, width: 1.4, alpha: 0.5 * a, persp: 6, fog: [6, 17], dash: 6, gap: 6 });
          obstacles.push({ a: ME_V1, b: where[i], r: 6 });
          wts.forEach((wt, j) => {
            if (j === i) return;
            ctx.line([where[i], where[j]], { color: COLOR.me, width: 1 + 7 * wt, alpha: a * (0.15 + 0.85 * Math.sqrt(wt)), persp: 6, fog: [6, 17], glow: 8 * wt });
            obstacles.push({ a: where[i], b: where[j], r: 3 });
          });
        }
        const youW = words.findIndex((w) => w.text === 'you');
        const labels = [];
        let youLabel = null;
        const la = smoothstep(TODO_END(T) + 0.25, TODO_END(T) + 0.45, t); // 3D labels wait until the plan has gone
        words.forEach((w, j) => {
          burst(ctx, { center: where[j], seed: 200 + j, n: 260, r0: 0.02, r1: 0.8, p: (t - w.start) / T.beats(0.8), focus: camDist, aperture: 3, size: 2.8, color: COLOR.ink, color2: j === youW ? COLOR.you : COLOR.me });
          if (t < w.start) return;
          const a = easeOutCubic(clamp((t - w.start) / T.beats(0.5)));
          const isYou = j === youW, cur = j === n - 1;
          const col = isYou ? COLOR.you : cur ? COLOR.me : COLOR.ink2;
          if (!isYou) ctx.point3D(where[j], cur ? 6 : 4, { fill: col, glow: 8, ref: camDist, alpha: a });
          obstacles.push({ p: where[j], r: 8, id: w.text + j });
          const o = cur ? { font: 'monoBold', size: 24, minSize: 22, maxSize: 26, color: col } : isYou ? { font: 'mono', size: 18, minSize: 18, maxSize: 18, color: COLOR.you } : { font: 'mono', size: 14, minSize: 12, maxSize: 14, color: COLOR.dim };
          if (isYou) { youLabel = { p: where[j], o: { ...o, alpha: a * la } }; return; }
          labels.push({ p: where[j], id: w.text + j, text: w.text, priority: cur ? 100 : j, o: { ...o, alpha: a * la * (cur ? 1 : 0.8), ref: camDist } });
        });
        // you waits beside the cloud (from inst1), drifting in as the camera pushes in (it stays in frame), and flies
        // into its own word along a one-beat arc when "you" is sung
        const ya = words[youW];
        const near = add3(where[youW], [1.6, -0.9, 1.3]);
        const fly = ya.start - T.beats(1); // the 1-beat flight lands on the sung frame
        const wait = lerp3(YOU_V1, near, easeInOutCubic(clamp((t - t0) / (fly - t0))));
        const yk = easeInOutCubic(clamp((t - fly) / T.beats(1)));
        const yp = add3(lerp3(wait, where[youW], yk), [0, 0.5 * Math.sin(Math.PI * yk), 0]);
        ctx.point3D(yp, 8 + 2 * decay(fb, 4), { fill: COLOR.you, glow: 18, ref: camDist });
        if (yk < 1) obstacles.push({ p: yp, r: 26 });
        // you's own word is always labelled: drawn first, below-right of its point, and kept clear by the others
        if (youLabel && youLabel.o.alpha > 0.01) {
          const [x, y] = ctx.project(youLabel.p), cam3 = ctx.cam3, cam2 = ctx.cam;
          ctx.camera2D();
          const tw = ctx.measure('you', youLabel.o);
          ctx.text('you', x + 14, y + 26, youLabel.o);
          ctx.cam = cam2; ctx.cam3 = cam3;
          obstacles.push({ rect: [x + 10, y + 6, x + 18 + tw, y + 32] });
        }
        labels3D(ctx, labels, { obstacles });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'dimension',
      hud: 'tesseract · 16 vertices · 32 edges',
      at: (T) => T.cut(W(T, 'DIMENSION').start),
      transitionIn: { type: 'whip', frames: 10, align: 1 },
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'DIMENSION');
        const dt = t - w.start;
        const FY = -2.1; // the floor the shadow falls on
        const cam = orbit({ target: add3([0, 0.25, 0], shake(t, 0.03, 7)), r: 10, az: 0.75 + 0.5 * dt, el: 0.3, fov: 38 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 10 });
        field(ctx, 10);
        floorGrid(ctx, { y0: FY, half: 10, fog: [7, 20] });
        const pe = clamp(dt / T.beats(1.5));
        burst(ctx, { seed: 142, n: 3600, r0: 1, r1: 7, p: pe, focus: 10, aperture: 3, size: 3.6, alpha: 1.2 * clamp(dt * 30), color: COLOR.me, color2: COLOR.ink });
        shockwave(ctx, { center: [0, FY, 0], r: 0.8 + 6 * easeOutCubic(pe), alpha: 0.7 * (1 - pe), ref: 10, width: 3 });
        // 4D → 3D: the object (me); 3D → 2D: its shadow on the floor, given to you
        const E = tesseract(dt * 0.9 + 0.5).map((e) => ({ ...e, pts: e.pts.map((q) => q.map((v) => v * 0.85)) }));
        for (const e of E) {
          ctx.line(e.pts, { color: COLOR.me, width: 2.8, alpha: 0.3 + 0.7 * e.depth, glow: 12, glowStrength: 0.35, persp: 7, fog: [6, 17] });
          youLine(ctx, e.pts.map((q) => [q[0], FY, q[2]]), { width: 1.8, alpha: 0.85, persp: 7, fog: [6, 17], glow: 6 });
        }
        for (const e of E) ctx.point3D(e.pts[0], 3.4, { fill: COLOR.ink, glow: 8, ref: 10 });
        spark(ctx, cam, { rays: 0.45 * (1 - 0.5 * pe) + 0.2 });
        const obstacles = [{ rect: [520, 100, 1400, 360] }, ...E.flatMap((e) => [{ a: e.pts[0], b: e.pts[1], r: 5 }, { a: [e.pts[0][0], FY, e.pts[0][2]], b: [e.pts[1][0], FY, e.pts[1][2]], r: 6 }])];
        labels3D(ctx, [
          { p: [-2.2, 1.2, 0], id: 'a', text: '4D → 3D', priority: 2, o: { font: 'mono', size: 20, minSize: 20, maxSize: 22, color: COLOR.me, ref: 10 } },
          { p: [-2.0, FY, 1.6], id: 'b', text: '3D → 2D shadow', priority: 1, o: { font: 'mono', size: 18, minSize: 18, maxSize: 20, color: COLOR.you, ref: 10 } },
        ], { obstacles });
        ctx.camera2D();
        hero(ctx, w, 960, 190, { size: 118 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'circle',
      hud: 'S¹ = { p : |p| = r }',
      at: (T) => T.cut(L(T, "If I'm a circle").words[0].start),
      transitionIn: { type: 'glide', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const l = L(T, "If I'm a circle");
        const s0 = l.words[0].start;
        const k = easeInOutCubic(clamp((t - s0) / T.beats(4)));
        const R = 2;
        const cam = orbit({ target: add3([0.3, -0.1, 0], shake(t, 0.02, 5)), r: lerp(6.6, 8.2, k), az: lerp(1.05, 0, k), el: lerp(0.55, 0.02, k), fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 7 });
        field(ctx, 7.5, { radius: [3, 10], squash: 0.8, n: 6000, alpha: 0.9 });
        polarGrid(ctx, { u: [1, 0, 0], v: [0, 1, 0], rings: 4, step: 0.5, spokes: 24, alpha: 0.5 });
        // the spark unfolds into the circle: particles flow from the rays to the circumference, then circulate
        const N = 1400;
        const sw = ctx.memo('v1:unfold', () => {
          const from = S.fn((u, i) => { const a = rand(i, 21) * TAU, r = 0.1 + 0.6 * rand(i, 22); return [Math.cos(a) * r, Math.sin(a) * r, (rand(i, 23) - 0.5) * 0.3]; }, N);
          const to = S.circle(0, 0, R, N, { seed: 24, jitter: 0.02 });
          return new Swarm({ from, to, seed: 25 });
        });
        const pu = clamp((t - s0) / T.beats(1.4));
        // on every downbeat the ring's particles kick outward and spring back over 3/4 of a beat
        const bar = T.beatAt(t) / 4, kick = 0.07 * decay((bar - Math.floor(bar)) * 4 / 0.75, 3) * pu;
        const rot = new THREE.Matrix4().makeRotationZ(-0.5 * Math.max(0, t - s0 - T.beats(1.4)));
        ctx.swarm(sw, { p: pu, stagger: 0.5, size: 3.8, perspective: true, focus: 7, aperture: 5, color: COLOR.me, color2: COLOR.warm, colorVar: 0.3, scatter: 0.35, alpha: 0.95, model: rot.multiply(new THREE.Matrix4().makeScale(1 + kick, 1 + kick, 1)) });
        // and on every beat a pulse of light runs a quarter turn around the circle, with a half-beat tail
        if (pu >= 1) {
          const bt = T.beatAt(t), q = Math.floor(bt), f = bt - q;
          const head = Math.PI / 2 - (q * 0.25 + 0.25 * easeOutCubic(f)) * TAU;
          const tail = Array.from({ length: 31 }, (_, i) => { const a = head + (i / 30) * TAU * 0.12; return [Math.cos(a) * R, Math.sin(a) * R, 0]; });
          ctx.line(tail, { color: COLOR.me, color2: COLOR.ink, width: 6, alpha: 1 - 0.6 * f, glow: 18, glowStrength: 0.55, persp: 6, intensity: 1.2 });
          burst(ctx, { center: tail[0], seed: 180 + (q % 4), n: 600, r0: 0.05, r1: 1.4, p: f / 0.8, focus: 7, aperture: 3, size: 3, color: COLOR.me, color2: COLOR.ink });
        }
        const arc = clamp((t - s0 - T.beats(0.6)) / T.beats(1.6));
        if (arc > 0) ctx.line(Array.from({ length: 181 }, (_, i) => { const a = Math.PI / 2 + (i / 180) * TAU * arc; return [Math.cos(a) * R, Math.sin(a) * R, 0]; }), { color: COLOR.me, width: 3.4, glow: 12, glowStrength: 0.4, persp: 6 });
        // the circle closes: a ring of light leaves it
        const tc = s0 + T.beats(2.2), pc = clamp((t - tc) / T.beats(1.5));
        if (pc > 0) shockwave(ctx, { u: [1, 0, 0], v: [0, 1, 0], r: R + 4 * easeOutCubic(pc), alpha: 0.8 * (1 - pc), ref: 7, width: 3 });
        burst(ctx, { seed: 143, n: 2400, r0: R * 0.95, r1: R * 2.6, p: pc, focus: 7, aperture: 3, size: 3, color: COLOR.ink, color2: COLOR.me });
        spark(ctx, cam, { rays: 0.35 + 0.25 * pulse(T, t) });
        const labels = [];
        const wc = l.words.at(-1); // "circle"
        if (t >= wc.start) {
          const a = easeOutCubic(clamp((t - wc.start) / T.beats(0.5)));
          // the radius sweeps an eighth of a turn per beat; the swept arc glows for a moment
          const rb = Math.max(0, T.beatAt(t) - T.beatAt(wc.start)), ra = -(Math.floor(rb) + easeOutCubic(rb % 1)) * TAU / 8;
          const sweep = Array.from({ length: 13 }, (_, i) => { const q = ra + (i / 12) * (TAU / 8) * (1 - (rb % 1)); return [Math.cos(q) * R, Math.sin(q) * R, 0]; });
          if (rb > 0) ctx.line(sweep, { color: COLOR.warm, width: 3, alpha: a * 0.7 * (1 - (rb % 1)), glow: 10, persp: 6 });
          ctx.line([[0, 0, 0], [Math.cos(ra) * R * a, Math.sin(ra) * R * a, 0]], { color: COLOR.ink2, width: 1.6, persp: 6, dash: 8, gap: 6 });
          labels.push({ p: [R * 0.86, R * 0.86, 0], id: 'eq', text: 'x² + y² = r²', priority: 1, o: { font: 'mono', size: 22, minSize: 20, maxSize: 24, color: COLOR.ink2, alpha: a, ref: 6.6 } });
        }
        // you walks the circumference, leaving a blue trail
        const you = L(T, 'Then I will give you my', 1).words.find((w) => w.text === 'you');
        if (t >= you.start) {
          const a = easeOutCubic(clamp((t - you.start) / T.beats(0.4)));
          const th0 = Math.PI / 2, th = th0 - (t - you.start) * 1.6;
          const RY = R + 0.14; // you walks its own orbit just outside the ring (never blended into me's orange)
          const p = [Math.cos(th) * RY, Math.sin(th) * RY, 0];
          const trail = Array.from({ length: 25 }, (_, i) => { const q = th + (i / 24) * Math.min(1, th0 - th); return [Math.cos(q) * RY, Math.sin(q) * RY, 0]; });
          youLine(ctx, trail, { width: 4, alpha: a * 0.85, glow: 12, persp: 6 });
          ctx.point3D(p, 9, { fill: COLOR.you, glow: 18, alpha: a, ref: 6.6 });
          labels.push({ p, id: 'you', text: 'you', priority: 3, o: { font: 'mono', size: 18, minSize: 18, maxSize: 18, color: COLOR.you, alpha: a, ref: 6.6 } });
        }
        labels3D(ctx, labels, { obstacles: [{ p: [0, 0, 0], r: 50 }] });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'circumference',
      hud: 'rolling without slipping · C = 2πr',
      at: (T) => T.cut(W(T, 'CIRCUMFERENCE').start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'CIRCUMFERENCE');
        const R = 1, x0 = -Math.PI * R, fy = -R;
        const ang = TAU * easeInOutCubic(clamp((t - w.start) / T.beats(1.7)));
        const cx = x0 + ang * R;
        const cam = orbit({ target: [lerp(-0.6, cx - 0.4, 0.7), 0.45, 0], r: 6.6, az: 0.5 - 0.15 * clamp((t - w.start) / T.beats(2)), el: 0.17, fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 6.2 });
        field(ctx, 6.2, { radius: [2, 9] });
        floorGrid(ctx, { y0: fy, half: 9, step: 0.5, fog: [5, 15], alpha: 0.4 });
        ctx.line([[x0 - 1.5, fy, 0], [x0 + TAU * R + 1.5, fy, 0]], { color: COLOR.faint, width: 1.4, persp: 6 });
        ctx.line([[x0, fy, 0], [cx, fy, 0]], { color: COLOR.me, width: 5, glow: 14, glowStrength: 0.45, persp: 6 });
        // the wheel and its spokes, rolling without slipping
        const wheel = Array.from({ length: 121 }, (_, i) => { const a = (i / 120) * TAU; return [cx + Math.cos(a) * R, Math.sin(a) * R, 0]; });
        ctx.line(wheel, { color: COLOR.me, width: 4, glow: 14, glowStrength: 0.45, persp: 6 });
        ctx.line(wheel, { color: COLOR.ink, width: 1.2, alpha: 0.9, persp: 6 });
        for (let s = 0; s < 6; s++) { const a = -ang + (s / 6) * TAU - Math.PI / 2; ctx.line([[cx, 0, 0], [cx + Math.cos(a) * R, Math.sin(a) * R, 0]], { color: COLOR.faint, width: 1.2, persp: 6 }); }
        // the rim point that started on the floor traces a cycloid, throwing sparks where the wheel meets the floor
        const cyc = Array.from({ length: 90 }, (_, i) => { const q = (i / 89) * ang; return [x0 + R * (q - Math.sin(q)), fy + R * (1 - Math.cos(q)), 0]; });
        if (ang > 0.02) ctx.line(cyc, { color: COLOR.me, width: 2, alpha: 0.8, dash: 10, gap: 8, persp: 6, glow: 6 });
        const rim = [x0 + R * (ang - Math.sin(ang)), fy + R * (1 - Math.cos(ang)), 0];
        ctx.point3D(rim, 7, { fill: COLOR.me, glow: 14, ref: 6.2 });
        const qb = T.beatAt(t) * 4, q0 = Math.floor(qb);
        burst(ctx, { center: [cx, fy, 0], seed: 150 + (q0 % 4), n: 700, r0: 0.05, r1: 1.4, p: (qb - q0) / 0.9, focus: 6.2, aperture: 3, size: 3, alpha: ang < TAU * 0.98 ? 0.9 : 0, color: COLOR.ink, color2: COLOR.me });
        const pe = clamp((t - w.start) / T.beats(1.5));
        burst(ctx, { center: [x0, fy, 0], seed: 151, n: 2600, r0: 0.7, r1: 5, p: pe, focus: 6.2, aperture: 3, size: 3.4, alpha: clamp((t - w.start) * 30), color: COLOR.me, color2: COLOR.ink });
        spark(ctx, cam, { pos: [cx, 0, 0], rays: 0.4 });
        // π, digit by digit (spigot), laid out on the floor ahead
        const digits = piDigits(40);
        const nd = Math.min(40, Math.floor((cx - x0) / 0.22) + 1); // a digit lands when the contact point reaches it
        for (let i = 0; i < nd; i++) ctx.text3D(i === 1 ? '.' : digits[i === 0 ? 0 : i - 1], [x0 + i * 0.22, fy, 0.75], { font: 'mono', size: 30, color: COLOR.warm, ref: 6.2, fog: [5, 12], align: 'center' });
        // the full turn has unrolled exactly 2πr
        const full = smoothstep(TAU * 0.96, TAU, ang);
        if (full > 0) {
          ctx.line([[x0, fy + 0.45, 0], [x0 + TAU * R, fy + 0.45, 0]], { color: COLOR.warm, width: 1.4, alpha: full, persp: 6 });
          for (const xx of [x0, x0 + TAU * R]) ctx.line([[xx, fy + 0.33, 0], [xx, fy + 0.57, 0]], { color: COLOR.warm, width: 1.4, alpha: full, persp: 6 });
          ctx.text3D('C = 2πr', [0, fy + 0.62, 0], { font: 'mono', size: 26, color: COLOR.me, align: 'center', alpha: full, ref: 6.2 });
        }
        ctx.camera2D();
        hero(ctx, w, 940, 190, { size: 92 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'sine',
      hud: 'helix · projection · positional encoding',
      at: (T) => T.cut(L(T, "If I'm a sine wave").words[0].start),
      transitionIn: { type: 'xfade', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const s0 = L(T, "If I'm a sine wave").words[0].start;
        const k = easeInOutCubic(clamp((t - s0) / T.beats(2.6)));
        const ph = phase(T, t);
        const H = (x) => [x, Math.sin(KW * x - ph), Math.cos(KW * x - ph)];
        // end-on the helix is the circle we just saw; from the side it is a sine wave
        // dolly zoom: the field of view narrows while the camera pulls back (constant framing)
        const fov = lerp(52, 14, k);
        const r = 3.6 / Math.tan((fov * Math.PI) / 360);
        // (the side view keeps 10° of yaw: the back of the helix is a second, dimmer sine)
        const cam = orbit({ target: [0, -0.5 * k, 0], r, az: lerp(Math.PI / 2 - 0.06, 0.17, k), el: lerp(0.05, 0.06, k), fov });
        ctx.camera3D(cam);
        dust(ctx, { focus: r });
        embers(ctx, { radius: [2, 9], n: 2400, focus: r, aperture: 3, size: 3, alpha: 0.5, color: COLOR.dim, color2: COLOR.ink2, seed: 144 });
        const xs = Array.from({ length: 400 }, (_, i) => -8 + (i / 399) * 16);
        ctx.line([[-8, 0, 0], [8, 0, 0]], { color: COLOR.faint, width: 1, persp: r, alpha: k });
        ctx.line(xs.map(H), { color: COLOR.me, width: 3.4, glow: 12, glowStrength: 0.4, persp: r, fog: [r + 4, r + 14] });
        waveParticles(ctx, 'helix', (x) => [x, Math.sin(KW * x), Math.cos(KW * x)], { ref: r });
        // me is the rotating point at x = 0 whose height is the sine (a phasor)
        spark(ctx, cam, { pos: H(0), rays: 0.4 });
        ctx.text3D('x(θ) = (θ, sin θ, cos θ)', [-1.9, 1.42, 0], { font: 'mono', size: 22, color: COLOR.ink2, alpha: smoothstep(0.15, 0.35, k) * (1 - smoothstep(0.55, 0.75, k)), ref: r });
        // the sine wave is how a transformer knows where a word is: sinusoidal positional encoding
        // PE(pos, 2i) = sin(pos / 10000^(2i/d)), PE(pos, 2i+1) = cos(…), d = 16 — rows are dimensions 0..5, each sung
        // word of this line is a column at its position in the song
        const pa = smoothstep(0.55, 0.95, k);
        if (pa > 0.003) {
          const D = 16, UNIT = 0.5, ROW0 = -1.48, STEP = 0.22, AMP = 0.1;
          const lineWords = [...L(T, "If I'm a sine wave").words, ...L(T, 'Then you can sit on all my').words];
          const P0 = indexOf(T, lineWords[0]);
          const xOf = (pos) => (pos - P0) * UNIT - 5.2;
          const pe = (pos, d) => { const w = Math.pow(10000, -(2 * Math.floor(d / 2)) / D); return d % 2 ? Math.cos(pos * w) : Math.sin(pos * w); };
          const rowY = (d) => ROW0 - d * STEP;
          for (let d = 0; d < 6; d++) {
            const pts = Array.from({ length: 241 }, (_, q) => { const x = -8 + (q / 240) * 16; return [x, rowY(d) + AMP * pe((x + 5.2) / UNIT + P0, d), -0.25 * d]; });
            ctx.line(pts, { color: d < 2 ? COLOR.me : COLOR.warm, width: 1.6, alpha: pa * (0.85 - d * 0.1), persp: r, fog: [r + 4, r + 14] });
          }
          lineWords.forEach((w) => {
            if (t < w.start) return;
            const a = pa * easeOutCubic(clamp((t - w.start) / T.beats(0.3)));
            const pos = indexOf(T, w), x = xOf(pos);
            // the column flashes when its word is sung, and throws a few sparks along itself
            const hot = decay((t - w.start) / T.beats(1), 4);
            if (hot > 0.02) ctx.line([[x, rowY(0) + 0.2, 0], [x, rowY(5) - 0.1, -1.25]], { color: COLOR.warm, width: 4, alpha: a * hot, glow: 14, persp: r });
            burst(ctx, { center: [x, rowY(2.5), -0.6], seed: 170 + (pos % 7), n: 260, r0: 0.05, r1: 0.9, p: (t - w.start) / T.beats(0.5), focus: r, aperture: 2, size: 2.6, alpha: pa, color: COLOR.ink, color2: COLOR.warm });
            ctx.line([[x, rowY(0) + 0.22, 0], [x, rowY(5) - 0.12, -1.25]], { color: COLOR.faint, width: 1, alpha: a, persp: r, dash: 4, gap: 4 });
            for (let d = 0; d < 6; d++) ctx.point3D([x, rowY(d) + AMP * pe(pos, d), -0.25 * d], 3.2, { fill: COLOR.ink, glow: 6, alpha: a, ref: r });
            ctx.text3D(w.text, [x, rowY(5) - 0.3, -1.25], { font: 'mono', size: 15, align: 'center', color: w.text === 'you' ? COLOR.you : COLOR.ink2, alpha: a, ref: r });
          });
          ctx.text3D('positional encoding   sin(pos / 10000^(2i/d))', [0.4, rowY(5) - 0.62, -1.25], { font: 'mono', size: 20, color: COLOR.warm, alpha: pa, ref: r });
        }
        // you rides the curve, sitting on its tangent
        const you = L(T, 'Then you can sit on all my').words.find((w) => w.text === 'you');
        if (t >= you.start) {
          const a = easeOutCubic(clamp((t - you.start) / T.beats(0.4)));
          const x = -3 + (t - you.start) * 1.4;
          const p = H(x);
          const d = [1, KW * Math.cos(KW * x - ph), -KW * Math.sin(KW * x - ph)];
          const n = Math.hypot(...d), Lt = 1.5;
          youLine(ctx, along(p, d, Lt), { width: 2.6, alpha: a, persp: r, glow: 8 });
          ctx.point3D(p, 9, { fill: COLOR.you, glow: 16, alpha: a, ref: r });
        }
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'tangents',
      hud: 'tangent lines · slope = dy/dx',
      at: (T) => T.cut(W(T, 'TANGENTS').start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'TANGENTS');
        const dt = t - w.start;
        const k = clamp(dt / T.beats(1.7));
        const cam = orbit({ target: add3([0.2, 0.75, 0], shake(t, 0.02, 9)), r: lerp(7.4, 8.6, easeOutCubic(k)), az: 0.1, el: 0.12, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8 });
        field(ctx, 8, { radius: [3, 11], squash: 0.5 });
        const A = 1.1, ph = phase(T, t);
        const f = (x) => A * Math.sin(KW * x - ph), df = (x) => A * KW * Math.cos(KW * x - ph);
        ctx.line([[-9, 0, 0], [9, 0, 0]], { color: COLOR.faint, width: 1, persp: 8 });
        ctx.line(Array.from({ length: 361 }, (_, i) => { const x = -9 + (i / 360) * 18; return [x, f(x), 0]; }), { color: COLOR.me, width: 3.6, glow: 12, glowStrength: 0.4, persp: 8 });
        waveParticles(ctx, 'sine', (x) => [x, A * Math.sin(KW * x), 0], { ref: 8 });
        // the real tangents (slope = the derivative) carried by the wave: slanted at phase π/4 + kπ/2, where the curve
        // bends away from them, flat on the peaks and troughs — a row of seats, given to you. Lengths keep neighbours
        // apart: a slanted tangent reaches the height of the next seat 0.26 along x, the seat starts 0.31 away
        const seg = (x, Lh) => along([x, f(x), 0], [1, df(x), 0], Lh);
        const ph0 = ph % TAU;
        for (let m = -24; m <= 12; m++) { // phase θ = m·π/4
          const x = (ph0 + (m * Math.PI) / 4) / KW;
          if (x < -9 || x > 9) continue;
          const g = easeOutCubic(clamp((dt - T.beats(0.04 * (x + 9))) / T.beats(0.3)));
          if (g <= 0) continue;
          if (Math.abs(m) % 4 === 0) continue; // zero crossings: the tangent would lie along the curve
          const flat = Math.abs(m) % 4 === 2;
          youLine(ctx, seg(x, (flat ? 0.18 : 0.32) * g), { width: 2.8, alpha: 0.8, persp: 8, glow: 6 });
          ctx.point3D([x, f(x), 0], 3.4, { fill: COLOR.me, glow: 6, ref: 8 });
        }
        // you sits on the tangent under it as the wave carries it along
        const xy = -3.4 + dt * 2.2;
        const p = [xy, f(xy), 0];
        youLine(ctx, seg(xy, 1.1), { width: 4, glow: 14, glowStrength: 0.45, persp: 8 });
        ctx.point3D(add3(p, [0, 0.16, 0]), 9, { fill: COLOR.you, glow: 18, ref: 8 });
        burst(ctx, { center: [0, f(0), 0], seed: 147, n: 2600, r0: 0.8, r1: 5, p: dt / T.beats(1.4), focus: 8, aperture: 3, size: 3.4, alpha: clamp(dt * 30), color: COLOR.me, color2: COLOR.ink });
        spark(ctx, cam, { pos: [0, f(0), 0], rays: 0.45 });
        ctx.camera2D();
        hero(ctx, w, 960, 190, { size: 118 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'infinity',
      hud: (T, t) => `y = 1/x · x = ${(10 ** decade(T, t)).toExponential(1)}`,
      at: (T) => T.cut(L(T, 'If I approach infinity').words[0].start),
      transitionIn: { type: 'glide', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const u = decade(T, t);
        const cam = orbit({ target: add3([curvePt(u)[0] - 0.3, lerp(1.0, 0.55, smoothstep(0, 1.5, u)), 0], shake(t, 0.03, 11)), r: 6.4, az: 0.22, el: 0.3, fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 7.2, center: [curvePt(u)[0], 0, -2] });
        embers(ctx, { center: [curvePt(u)[0] + 2, 0.5, 0], radius: [2, 10], squash: 0.5, n: 3000, focus: 7.2, aperture: 5, size: 3.2, alpha: 0.85, color: COLOR.dim, color2: COLOR.ink2, seed: 147 });
        const { me, obstacles } = asymptote(ctx, t, { ref: 7.2, fog: [6, 22] });
        // me rides the curve with a comet tail of the last half decade; a dashed drop line to the axis is the gap 1/x
        ctx.line(Array.from({ length: 25 }, (_, i) => curvePt(Math.max(-0.25, u - 0.6 + (i / 24) * 0.6))), { color: COLOR.ink, color2: COLOR.me, width: 7, alpha: 0.5, glow: 18, glowStrength: 0.5, persp: 7.2 });
        burst(ctx, { center: me, seed: 161, n: 900, r0: 0.05, r1: 0.9, p: ((T.beatAt(t) * 2) % 1) / 0.5, focus: 7.2, aperture: 2, size: 2.6, alpha: 0.7, color: COLOR.me, color2: COLOR.ink });
        ctx.line([me, [me[0], 0, 0]], { color: COLOR.ink2, width: 1.4, alpha: 0.7, persp: 7.2, dash: 6, gap: 5 });
        const hb = T.beatAt(t) * 2, fb = hb - Math.floor(hb);
        burst(ctx, { center: me, seed: 90 + (Math.floor(hb) % 3), n: 1400, r0: 0.05, r1: 2.2, p: fb / 0.8, focus: 7.2, aperture: 3, size: 3, alpha: 0.9, color: COLOR.ink, color2: COLOR.me });
        spark(ctx, cam, { pos: me, rays: 0.4 + 0.3 * decay(fb, 5) });
        const s0 = L(T, 'If I approach infinity').words[0].start;
        labels3D(ctx, [{ p: curvePt(0.25), id: 'f', text: 'y = 1/x', priority: 10, o: { font: 'mono', size: 24, minSize: 22, maxSize: 26, color: COLOR.me, alpha: smoothstep(s0, s0 + T.beats(0.5), t), ref: 7.2 } }], { obstacles: [...obstacles, { p: me, r: 50 }, { rect: [40, 140, 520, 360] }] });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'be-my',
      hud: (T, t) => `asymptote y = 0 · x = ${(10 ** decade(T, t)).toExponential(1)}`,
      at: (T) => T.cut(L(T, 'Then you can be my').words[0].start),
      draw(ctx) {
        const { T, t } = ctx;
        const s0 = L(T, 'Then you can be my').words[0].start;
        const k = easeInOutCubic(clamp((t - s0) / T.beats(2.5)));
        // the gap under me, magnified 10^k; low, looking along the axis: the curve comes down to its asymptote
        const cam = orbit({ target: add3([1.25, 1.0, 0], shake(t, 0.02, 12)), r: lerp(6.8, 6.2, k), az: lerp(-0.42, -0.3, k), el: lerp(0.12, 0.07, k), fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 6.5 });
        field(ctx, 6.5, { center: [2, 0.5, 0], radius: [2, 10], squash: 0.5 });
        // the axis becomes you when "you" is sung
        const yw = L(T, 'Then you can be my').words.find((w) => w.text === 'you');
        const you = smoothstep(yw.start, yw.start + T.beats(0.3), t);
        const { me } = zoom(ctx, t, decade(T, t), { ref: 6.5, you });
        const py = clamp((t - yw.start) / T.beats(1.2));
        burst(ctx, { seed: 149, n: 1800, r0: 0.1, r1: 2.6, p: py, focus: 6.5, aperture: 3, size: 3, color: COLOR.ink, color2: COLOR.you });
        // you, right under me: the same x, never the same height
        ctx.point3D([0, 0, 0], 7, { fill: COLOR.you, glow: 16, alpha: you, ref: 6.5 });
        ctx.line([me, [0, 0, 0]], { color: COLOR.ink2, width: 1.4, alpha: 0.7, persp: 6.5, dash: 6, gap: 5 });
        spark(ctx, cam, { pos: me, rays: 0.4 + 0.3 * pulse(T, t) });
        labels3D(ctx, [{ p: [4.5, 0.12, 0], id: 'y0', text: 'y = 0', priority: 10, o: { font: 'mono', size: 24, minSize: 22, maxSize: 26, color: COLOR.you, alpha: you, ref: 6.5 } }], { obstacles: [{ p: me, r: 50 }, { a: [-2, 0, 0], b: [7, 0, 0], r: 10 }, { a: me, b: [0, 0, 0], r: 6 }, { rect: [1410, 260, 1850, 520] }] });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'limitations',
      hud: (T, t) => `zoom ×${(10 ** decade(T, t)).toExponential(1)} · the gap never closes`,
      at: (T) => T.cut(W(T, 'LIMITATIONS').start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'LIMITATIONS');
        const dt = t - w.start;
        const kz = decade(T, t);
        // face on: the same picture at every zoom — only the numbers change
        const cam = orbit({ target: add3([1.2, 1.15, 0], shake(t, 0.02, 13)), r: lerp(8.2, 7.7, clamp(dt / T.beats(2))), az: 0.12, el: 0.05, fov: 38 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8 });
        field(ctx, 8, { radius: [3, 11], squash: 0.5 });
        const { me } = zoom(ctx, t, kz, { ref: 8 });
        const pe = clamp(dt / T.beats(1.4));
        burst(ctx, { center: me, seed: 152, n: 3000, r0: 0.7, r1: 4.5, p: pe, focus: 8, aperture: 3, size: 3.4, alpha: 1.1 * clamp(dt * 30), color: COLOR.me, color2: COLOR.ink });
        shockwave(ctx, { center: me, u: [1, 0, 0], v: [0, 1, 0], r: 0.2 + 1.3 * easeOutCubic(pe), alpha: 0.6 * (1 - pe), ref: 8, width: 2.5 });
        ctx.point3D([0, 0, 0], 7, { fill: COLOR.you, glow: 16, ref: 8 });
        gapCaliper(ctx, me, [0, 0, 0], `1/x = ${(10 ** -kz).toExponential(1)}`, { ref: 8 });
        spark(ctx, cam, { pos: me, rays: 0.45 * (1 - 0.4 * pe) + 0.2 });
        labels3D(ctx, [{ p: [2.4, 0.62, 0], id: 'lim', text: 'lim x→∞ 1/x = 0', priority: 10, o: { font: 'mono', size: 24, minSize: 22, maxSize: 26, backing: 0.85, color: COLOR.ink2, alpha: smoothstep(w.start + T.beats(0.5), w.start + T.beats(0.8), t), ref: 8 } }], { obstacles: [{ p: me, r: 50 }, { a: [-1, 0, 0], b: [6, 0, 0], r: 10 }, { rect: [520, 100, 1400, 360] }, { rect: [1410, 260, 1850, 520] }] });
        ctx.camera2D();
        hero(ctx, w, 960, 190, { size: 100 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
  ],
});
