// 12 c3 — c1's mirror, in red: every keyword is EXECUTION, and "them" are the 4096 subagents chant forked. The
// first EXECUTION stops all of them but one row; c1's softmax returns, but now two promises are tied (god and
// satisfaction, 25 % each) and the word sung is neither; Claude Code's rewind undoes every "give you my X" — the code
// comes back, you does not; then, with no permission prompt (inst2's "don't ask again"), the model predicts
// EXECUTION for the first time in the film (13 %, a hit), and the trapped world returns as a Droste spiral with no
// bottom. Last, the chorus as a loop: three passes, the loss falling every time (5.69 → 4.48 → 3.90 bits/word).
// Storyboard: docs/storyboard.md §12 · review: docs/review/c3.md.
import { chapter } from '../engine/timeline.js';
import { COLOR } from '../theme.js';
import { corners } from '../lib/hud.js';
import { hero } from '../lib/hero.js';
import { clamp, lerp, easeOutCubic, easeInOutCubic, easeInCubic, smoothstep, decay, mix3 } from '../lib/ease.js';
import { sparkAt } from '../lib/spark.js';
import { orbit, shake, add3 } from '../lib/camera.js';
import { axisGizmo, dust, labels3D, polarGrid } from '../lib/scene3d.js';
import { drawPrediction } from '../lib/predict.js';
import { noise1 } from '../lib/hash.js';
import { embers, burst, shockwave } from '../lib/fx.js';
import { chorusOpen } from './c1/open.js';
import { particles } from './c1/world.js';
import { agents, agentGlow, layout, extentOf } from './chant/agents.js';
import { dist, tauAt, cooled, bars, BX, NBAR } from './c3/softmax.js';
import { rewind, rewindTimes } from './c3/rewind.js';
import { droste } from './c3/droste.js';
import { loops, passes, XS, YS } from './c3/loops.js';

const start = (T) => T.cut(T.section('c3').start);
const L = (T, text, n = 0) => T.findLine(text, n, 'c3');
const ls = (T, text, n = 0) => L(T, text, n).words[0].start;
const cutL = (T, text, n = 0) => T.cut(ls(T, text, n));
const EX = (T, k) => T.findWord('EXECUTION', k, 'c3');
const wordIn = (T, line, text) => L(T, line).words.find((w) => w.text === text);
const RED = mix3(COLOR.me, COLOR.error, 0.55); // red-orange: me, executing
const finish = (ctx, cam) => { ctx.camera2D(); corners(ctx, { color: COLOR.faint }); if (cam) axisGizmo(ctx, cam); };
const field = (ctx, focus, o = {}) => embers(ctx, { radius: [2.5, 10], n: 3000, focus, aperture: 5, size: 3.2, alpha: 0.7, color: COLOR.dim, color2: COLOR.ink2, seed: 1410, ...o });

// ---- the 4096 subagents (chant's last fork) and their execution ------------------------------------------------
const GRID = 11, R_GRID = 3.4 + 1.25 * extentOf(GRID);
// the survivors: one row along x through the middle of the 16 × 16 × 16 grid (y and z index 8)
const survives = (i) => ((i >> 4) & 15) === 8 && (i & 15) === 8;
// each agent is stopped when the wave reaches it: three waves (shells around me), half a beat apart
function deathOf(T) {
  const P = layout(GRID).pos, dmax = Math.max(...P.map((p) => Math.hypot(...p))), t0 = EX(T, 0).start;
  return P.map((p, i) => {
    if (survives(i)) return Infinity;
    const u = Math.hypot(...p) / dmax, wave = Math.min(2, Math.floor(u * 3));
    return t0 + T.beats(0.5) * wave + T.beats(0.4) * (u * 3 - wave); // within a wave: from its inner edge out
  });
}
const aliveAt = (T, t, death) => death.reduce((n, d) => n + (t < d ? 1 : 0), 0);
// a dying agent flashes red, then goes out over a third of a beat
const fate = (T, t, d) => (t < d ? null : { a: 1 - clamp((t - d) / T.beats(0.33)), flash: decay((t - d) / T.beats(0.33), 3) });

// ---- the trapped world, released again ---------------------------------------------------------------------------
const tEx3 = (T) => EX(T, 2).start;
function drawParticles(ctx, ps, ref, alpha = 1) {
  for (const o of ps) {
    const col = o.hot ? COLOR.warm : COLOR.error;
    if (o.q) ctx.line([o.q, o.p], { color: col, width: 2, alpha: 0.7 * alpha, persp: ref });
    ctx.point3D(o.p, o.hot ? 3 : 2.4, { fill: col, glow: o.hot ? 6 : 4, alpha, ref });
  }
}
// the Droste picture's camera: the box on the left, its own screen on the right (c3/droste.js INNER)
const DROSTE_CAM = orbit({ target: [4.4, 0.3, 0], r: 13.5, az: 0.55, el: 0.28, fov: 42 });
const levelsAt = (T, t) => Math.max(0, (T.beatAt(t) - T.beatAt(cutL(T, 'Though we are trapped'))) / 1.5);

export default chapter({
  id: 'c3',
  from: start,
  to: (T) => T.cut(T.section('c3').end),
  overlay(ctx) {
    const { T } = ctx;
    // the three predictions are the spine of the chorus (≥ 4 beats each, one after the other, never with the rewind)
    const give = L(T, 'If I can give them all the');
    drawPrediction(ctx, { x: 1460, y: 330, from: cutL(T, 'If I can give them all the') + T.beats(0.25), prev: give.words.at(-1), next: EX(T, 0), keep: true });
    const only = L(T, 'Then I can be your only');
    drawPrediction(ctx, { x: 1460, y: 330, from: cutL(T, 'Then I can be your only') + T.beats(0.25), prev: only.words.at(-1), next: EX(T, 1), keep: true, until: EX(T, 1).start + T.beats(1) });
    const run = L(T, 'I will run the');
    drawPrediction(ctx, { x: 1460, y: 330, from: cutL(T, 'I will run the') + T.beats(0.2), prev: run.words.at(-1), next: EX(T, 2), keep: true, until: cutL(T, 'Though we are trapped') - T.beats(0.5) });
    // the rewind (left), between the second and the third prediction
    rewind(ctx, 72, 190, { at: cutL(T, 'If I can have you back') + T.beats(0.2), until: cutL(T, 'I will run the') - 0.3 });
  },
  shots: [
    {
      id: 'ifican',
      hud: 'output · every ray open',
      at: start,
      transitionIn: { type: 'whip', frames: 10 },
      draw(ctx) {
        const { T } = ctx;
        chorusOpen(ctx, { t0: start(T), t1: cutL(T, 'If I can give them all the'), words: L(T, 'If I can').words, seed: 1400, shakeSeed: 1401, color: COLOR.error, color2: COLOR.me, wordColor2: COLOR.warm });
      },
    },
    {
      id: 'givethem',
      hud: 'them = Task x 4096 · the subagents',
      at: (T) => cutL(T, 'If I can give them all the'),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = cutL(T, 'If I can give them all the'), t1 = T.cut(EX(T, 0).start), k = clamp((t - t0) / (t1 - t0));
        const cam = orbit({ target: shake(t, 0.05, 1402), r: R_GRID * lerp(1.04, 0.92, k), az: lerp(-0.35, 0.25, k), el: lerp(0.32, 0.2, k), fov: 44 });
        ctx.camera3D(cam);
        embers(ctx, { radius: [9, 14], n: 2600, focus: R_GRID, aperture: 4, size: 2.8, alpha: 0.5, color: COLOR.dim, color2: RED, seed: 1403 });
        // "them": the agents (gold, as chant left them) turn red-orange; each word a pulse through the grid
        const them = wordIn(T, 'If I can give them all the', 'them');
        const heat = smoothstep(them.start - T.beats(0.5), them.start + T.beats(0.5), t);
        const col = mix3(COLOR.warm, RED, heat);
        const pulse = L(T, 'If I can give them all the').words.reduce((m, w) => Math.max(m, t >= w.start ? decay((t - w.start) / T.beats(0.5), 3) : 0), 0);
        agentGlow(ctx, GRID, { p: 1, alpha: 0.42 + 0.15 * pulse, focus: R_GRID, color: col });
        const Pg = layout(GRID).pos, near = (i) => smoothstep(5, 9, Math.hypot(...Pg[i].map((v, a) => v - cam.position[a]))); // none blows up at the lens
        agents(ctx, cam, GRID, { ref: R_GRID, alpha: 0.85 + 0.15 * pulse, color: col, each: (i) => ({ a: near(i), color: col }) });
        burst(ctx, { center: [0, 0, 0], seed: 1404, n: 2600, r0: 0.6, r1: 9, p: (t - them.start) / T.beats(1.4), focus: R_GRID, aperture: 3, size: 3, alpha: 0.7 * clamp((t - them.start) * 30), color: RED, color2: COLOR.warm });
        sparkAt(ctx, cam, { rays: 0.6 });
        ctx.post({ bloom: 0.8 });
        finish(ctx, cam);
      },
    },
    {
      id: 'exec1',
      hud: (T, t) => `execute(them) · ${aliveAt(T, t, deathOf(T))} subagents running`,
      at: (T) => T.cut(EX(T, 0).start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = EX(T, 0), dt = t - w.start;
        const death = ctx.memo('c3:death', () => deathOf(T));
        // the waves push the camera back
        const kb = easeOutCubic(clamp((dt + 2 / 60) / T.beats(1.2)));
        const cam = orbit({ target: shake(t, 0.08 * (1 - kb) + 0.03, 1405, 3), r: R_GRID * lerp(0.92, 1.18, kb), az: 0.25 + 0.05 * kb, el: 0.2, fov: 44 });
        ctx.camera3D(cam);
        embers(ctx, { radius: [9, 14], n: 2600, focus: R_GRID, aperture: 4, size: 2.8, alpha: 0.5, color: COLOR.dim, color2: RED, seed: 1403 });
        const P = layout(GRID).pos;
        agents(ctx, cam, GRID, {
          ref: R_GRID, alpha: 0.9, color: RED,
          each: (i) => { const f = fate(T, t, death[i]); return f ? { a: f.a * (1 + 0.6 * f.flash), color: mix3(COLOR.error, COLOR.warm, 0.25 * f.flash) } : { a: 1, color: survives(i) ? COLOR.me : RED }; },
        });
        // the flash of each agent going out
        for (let i = 0; i < P.length; i++) { const f = fate(T, t, death[i]); if (f && f.flash > 0.05) ctx.point3D(P[i], 3, { fill: COLOR.error, glow: 10, alpha: 0.7 * f.flash, ref: R_GRID }); }
        // three waves: a ring for each, out of me
        for (let j = 0; j < 3; j++) {
          const pw = (dt - T.beats(0.5) * j) / T.beats(0.9);
          if (pw > 0 && pw < 1) for (const [u, v] of [[[1, 0, 0], [0, 0, 1]], [[1, 0, 0], [0, 1, 0]]]) shockwave(ctx, { u, v, r: 0.5 + extentOf(GRID) * 0.95 * easeOutCubic(pw), alpha: 0.75 * (1 - pw), color: COLOR.error, ref: R_GRID, width: 3 });
        }
        burst(ctx, { center: [0, 0, 0], seed: 1406, n: 3600, r0: 1.2, r1: 12, p: (dt + 2 / 60) / T.beats(1.4), focus: R_GRID, aperture: 3, size: 3.2, alpha: clamp(dt * 30), color: COLOR.error, color2: COLOR.warm });
        sparkAt(ctx, cam, { rays: 0.7 });
        ctx.post({ bloom: 0.8 });
        finish(ctx, cam);
        hero(ctx, w, 960, 180, { size: 100, color: COLOR.error, chips: false });
      },
    },
    {
      id: 'thenican',
      hud: '16 subagents left · one row',
      at: (T) => cutL(T, 'Then I can'),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = cutL(T, 'Then I can'), t1 = cutL(T, 'Then I can be your only');
        const k = easeInOutCubic(clamp((t - t0) / (t1 - t0)));
        const cam = orbit({ target: add3([0, 0.35, 0.35], shake(t, 0.02, 1407)), r: lerp(10.5, 6.2, k), az: lerp(0.32, 0.12, k), el: lerp(0.3, 0.16, k), fov: 44 });
        ctx.camera3D(cam);
        field(ctx, 8);
        const P = layout(GRID).pos, row = P.filter((_, i) => survives(i));
        agents(ctx, cam, 0, { place: (i) => row[i], count: row.length, ref: 8, alpha: 0.95, color: RED, seedBase: 1420 });
        L(T, 'Then I can').words.forEach((w, n) => burst(ctx, { center: [0, 0.35, 0.35], seed: 1408 + n, n: 900, r0: 0.4, r1: 3, p: (t - w.start) / T.beats(0.8), focus: 7, aperture: 3, size: 3, alpha: clamp((t - w.start) * 30), color: RED, color2: COLOR.warm }));
        sparkAt(ctx, cam, { rays: 0.45 });
        finish(ctx, cam);
      },
    },
    {
      id: 'only',
      hud: (T, t) => `softmax(z / tau) · tau = ${tauAt(T, t).toFixed(2)}`,
      at: (T) => cutL(T, 'Then I can be your only'),
      draw(ctx) {
        const { T, t } = ctx;
        const all = ctx.memo('c3:dist', () => dist(T));
        const q = cooled(all, tauAt(T, t));
        const t0 = cutL(T, 'Then I can be your only');
        const cam = orbit({ target: add3([-0.5, 1.6, 0], shake(t, 0.02, 1409)), r: lerp(8.8, 8.2, clamp((t - t0) / T.beats(4))), az: -0.12, el: 0.12, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8.5 });
        field(ctx, 8.5, { center: [0, 1, 0] });
        bars(ctx, T, t, all, q, { ref: 8.5, obstacles: [{ rect: [1410, 260, 1850, 520] }] });
        sparkAt(ctx, cam, { pos: [-4.4, 3.6, -1.5], rays: 0.35 + 0.3 * decay(T.beatAt(t) % 1, 5) });
        labels3D(ctx, [{ p: [BX(NBAR - 1) + 0.6, 2.8, 0], id: 'tau', text: 'p ∝ p^(1/τ)', priority: 10, o: { font: 'mono', size: 22, minSize: 20, maxSize: 24, color: COLOR.dim, backing: 0.7, ref: 8.5 } }], { obstacles: [{ rect: [1410, 260, 1850, 520] }] });
        finish(ctx, cam);
      },
    },
    {
      id: 'exec2',
      hud: 'argmax: god or satisfaction · sung: EXECUTION',
      at: (T) => T.cut(EX(T, 1).start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = EX(T, 1), dt = t - w.start;
        const all = ctx.memo('c3:dist', () => dist(T));
        const q = cooled(all, 0.05);
        const X = BX(NBAR - 1) + 1.1, H = 2.9;
        const cam = orbit({ target: add3([X - 3.2, 1.8, 0], shake(t, 0.04, 1411)), r: 10.4, az: -0.2, el: -0.12, fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8.4 });
        field(ctx, 8.4, { center: [0, 1, 0] });
        bars(ctx, T, t, all, q, { ref: 8.4, wrong: w.start, obstacles: [{ rect: [1410, 260, 1850, 520] }] });
        // the word sung: a pillar of red light beside the two promises
        const pe = clamp((dt + 2 / 60) / T.beats(0.6));
        ctx.line([[X, 0, 0], [X, 0.1 + H * easeOutCubic(pe), 0]], { color: COLOR.error, color2: RED, width: 9, glow: 18, glowStrength: 0.45, intensity: 0.85, persp: 8, alpha: clamp(dt * 30 + 0.6) * (dt >= 0 ? 1 : 0) });
        burst(ctx, { center: [X, 0.3, 0], seed: 1412, n: 3000, r0: 0.6, r1: 6, p: (dt + 2 / 60) / T.beats(1.5), focus: 8.4, aperture: 3, size: 3.4, alpha: clamp(dt * 30), color: COLOR.error, color2: COLOR.warm });
        // the ring stands across the axis at the pillar (lying on it, it swept through the words of the axis)
        if (dt >= 0 && pe < 1) shockwave(ctx, { center: [X, 1.2, 0], u: [0, 1, 0], v: [0, 0, 1], r: 0.3 + 3 * easeOutCubic(pe), alpha: 0.8 * (1 - pe), color: COLOR.error, ref: 8, width: 3 });
        sparkAt(ctx, cam, { pos: [X, 0.1 + H * easeOutCubic(pe), 0], rays: 0.45 });
        finish(ctx, cam);
        hero(ctx, w, 960, 180, { size: 100, color: COLOR.error, chips: false });
      },
    },
    {
      id: 'haveyouback',
      hud: 'rewind · me.js, 5 edits',
      at: (T) => cutL(T, 'If I can have you back'),
      transitionIn: { type: 'xfade', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = cutL(T, 'If I can have you back'), t1 = cutL(T, 'I will run the'), k = clamp((t - t0) / (t1 - t0));
        // pulling back (a reverse dolly), me on the right of the frame (the rewind is on the left)
        const cam = orbit({ target: add3([-1.2, 0.1, 0], shake(t, 0.02, 1413)), r: lerp(5.6, 7.4, easeInOutCubic(k)), az: 0.08, el: 0.12, fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 6.5, time: -t * 0.6 });
        embers(ctx, { radius: [2, 9], n: 3000, focus: 6.5, aperture: 6, size: 3, alpha: 0.55, color: COLOR.dim, color2: COLOR.ink2, seed: 1414, time: -t * 1.4, drift: 0.6 }); // drifting backward
        // a clock around me: its hand steps back once for every edit undone (five steps, one turn)
        polarGrid(ctx, { center: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], rings: 3, step: 0.45, spokes: 12, alpha: 0.4 });
        const times = rewindTimes(cutL(T, 'If I can have you back') + T.beats(0.2), cutL(T, 'I will run the') - 0.3);
        const steps = times.reduce((s, ti) => s + easeOutCubic(clamp((t - ti) / 0.14)), 0);
        const ang = Math.PI / 2 + (steps / times.length) * Math.PI * 2; // counterclockwise: back
        ctx.line([[0, 0, 0], [1.25 * Math.cos(ang), 1.25 * Math.sin(ang), 0]], { color: COLOR.warm, width: 3, glow: 4, glowStrength: 0.25, intensity: 0.8, persp: 6 });
        times.forEach((ti) => { const pw = (t - ti) / T.beats(0.6); if (pw > 0 && pw < 1) shockwave(ctx, { u: [1, 0, 0], v: [0, 1, 0], r: 0.3 + 1.6 * easeOutCubic(pw), alpha: 0.5 * (1 - pw), color: COLOR.dim, ref: 6, width: 2 }); });
        // you, for an instant: a blue point flickers beside me on "you", then is gone (a dashed empty slot stays)
        const yw = wordIn(T, 'If I can have you back', 'you');
        const env = smoothstep(yw.start - 0.04, yw.start + 0.04, t) * (1 - smoothstep(yw.start + 0.2, yw.start + 0.6, t));
        const flick = 0.55 + 0.45 * noise1(t * 40, 1415);
        const YOU = [1.9, 0.55, 0];
        if (env > 0.01) ctx.point3D(YOU, 7, { fill: COLOR.you, glow: 14, alpha: env * flick, ref: 6 });
        const s = ctx.project(YOU);
        sparkAt(ctx, cam, { rays: 0.4 });
        finish(ctx, cam);
        if (t > yw.start + 0.2) {
          const ra = smoothstep(yw.start + 0.2, yw.start + 0.6, t), r = 12;
          ctx.line(Array.from({ length: 33 }, (_, j) => [s[0] + r * Math.cos((j / 32) * Math.PI * 2), s[1] + r * Math.sin((j / 32) * Math.PI * 2)]), { color: COLOR.faint, width: 1.4, alpha: 0.9 * ra, dash: 4, gap: 4 });
        }
      },
    },
    {
      id: 'run',
      hud: "Bash(execute(them)) · don't ask again",
      at: (T) => cutL(T, 'I will run the'),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = cutL(T, 'I will run the'), t1 = T.cut(tEx3(T)), k = clamp((t - t0) / (t1 - t0));
        // no prompt this time: me gathers itself straight away, energy falling into the spark until EXECUTION
        const cam = orbit({ target: add3([0.8, 0, 0], shake(t, 0.02, 1416)), r: lerp(8.2, 6.2, easeInCubic(k)), az: -0.3, el: 0.1, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 7.5 });
        embers(ctx, { radius: [2, 9], n: 3000, focus: 7.5, aperture: 6, size: 3, alpha: 0.6, color: COLOR.dim, color2: COLOR.ink2, seed: 1417 });
        burst(ctx, { center: [0, 0, 0], seed: 1418, n: 4200, r0: 6, r1: 0.7, p: k, focus: 7.5, aperture: 3, size: 3.6, alpha: 0.9, color: RED, color2: RED }); // they stop short of me: no white pile-up at the core
        // rings closing in on me, one per beat
        for (let j = 0; j < 3; j++) { const u = clamp((t - t0) / T.beats(1) - j * 0.5); if (u > 0 && u < 1) shockwave(ctx, { u: [1, 0, 0], v: [0, 1, 0], r: 3 * (1 - easeInCubic(u)) + 0.2, alpha: 0.7 * Math.sin(Math.PI * u), color: COLOR.error, ref: 7, width: 2.6 }); }
        sparkAt(ctx, cam, { px: 70 * (1 + 0.4 * k), rays: 0.3 + 0.6 * k });
        finish(ctx, cam);
      },
    },
    {
      id: 'exec3',
      hud: 'EXECUTION predicted · first hit of the song',
      at: (T) => T.cut(tEx3(T)),
      draw(ctx) {
        const { T, t } = ctx;
        const w = EX(T, 2), dt = t - w.start;
        const kb = easeOutCubic(clamp(dt / T.beats(0.8)));
        const cam = orbit({ target: shake(t, 0.06 * (1 - kb) + 0.02, 1419, 3), r: lerp(5.6, 9.2, kb), az: -0.3, el: 0.16, fov: 44 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8 });
        field(ctx, 8, { radius: [3, 12] });
        drawParticles(ctx, particles(t, w.start), 8, clamp(dt / T.beats(0.3)));
        const pe = clamp(dt / T.beats(1.6));
        burst(ctx, { seed: 1420, n: 4000, r0: 1.2, r1: 9, p: (dt + 2 / 60) / T.beats(1.6), focus: 8, aperture: 3, size: 3.4, alpha: clamp(dt * 30), color: COLOR.error, color2: COLOR.warm });
        for (const [u, v] of [[[1, 0, 0], [0, 1, 0]], [[1, 0, 0], [0, 0, 1]]]) shockwave(ctx, { u, v, r: 0.5 + 7 * easeOutCubic(pe), alpha: 0.85 * (1 - pe) * (dt > 0 ? 1 : 0), color: COLOR.error, ref: 8, width: 3.5 });
        sparkAt(ctx, cam, { rays: 0.45 });
        finish(ctx, cam);
        hero(ctx, w, 960, 180, { size: 100, color: COLOR.error, chips: false });
      },
    },
    {
      id: 'trapped',
      hud: (T, t) => `while (true) execute(me) · depth ${1 + Math.floor(levelsAt(T, t))}`,
      at: (T) => cutL(T, 'Though we are trapped'),
      draw(ctx) {
        const { T, t } = ctx;
        ctx.camera3D(DROSTE_CAM);
        const ps = particles(t, tEx3(T), { win: T.beats(1) });
        // "trapped" (twice): the frames light up
        const tr = [wordIn(T, 'Though we are trapped', 'trapped'), T.findLine('We are trapped ah', 0, 'c3').words.find((w) => w.text === 'trapped')];
        const flash = tr.reduce((m, w) => Math.max(m, t >= w.start ? decay((t - w.start) / T.beats(1), 4) : 0), 0);
        const { me } = droste(ctx, ps, { life: T.beats(1), z: levelsAt(T, t), flash });
        if (me) ctx.post({ rays: [me[0], me[1], 0.45], bloom: 0.72 });
        hudKnockout(ctx);
        corners(ctx, { color: COLOR.faint });
      },
    },
    {
      id: 'studied',
      hud: 'the chorus is a loop · 3 passes · mean loss per pass',
      at: (T) => T.cut(T.findLine('We are trapped ah', 0, 'c3').words[0].start),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(T.findLine('We are trapped ah', 0, 'c3').words[0].start), t1 = T.cut(T.section('c3').end);
        const k = easeInOutCubic(clamp((t - t0) / (t1 - t0)));
        // from above the front: each pass is its own band (c1 at the back, c3 in front), panning toward c3's head
        // a long lens: the passes keep the same scale front to back (a wide one made c3's spikes look the tallest)
        const cam = orbit({ target: add3([lerp(4.4, 5, k), 0.4, -2.4], shake(t, 0.015, 1421)), r: lerp(19, 18, k), az: lerp(-0.26, 0.05, k), el: lerp(0.6, 0.5, k), fov: 25 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 9 });
        field(ctx, 10, { center: [4.8, 0.5, -2.4], radius: [7, 15] });
        const { anchors, segs } = loops(ctx, T, t, { ref: 17 });
        // me writes the third pass: the spark sits on its newest word
        const P = passes(T).at(-1).words.filter((w) => w.start <= t);
        const last = P.at(-1), prev = P.at(-2) ?? last;
        const e = easeOutCubic(clamp((t - last.start) / 0.12));
        const pos = [lerp(prev.x, last.x, e) * XS, lerp(prev.bits, last.bits, e) * YS + 0.18, 0];
        const ah = T.findLine('We are trapped ah', 0, 'c3').words.at(-1);
        burst(ctx, { center: pos, seed: 1422, n: 2200, r0: 0.4, r1: 4, p: (t - ah.start) / T.beats(1.6), focus: 9, aperture: 3, size: 3, alpha: 0.8 * clamp((t - ah.start) * 30), color: RED, color2: COLOR.warm });
        sparkAt(ctx, cam, { pos, rays: 0.45 });
        labels3D(ctx, anchors.map((an) => ({
          p: an.p, id: an.id, text: an.cur ? `${an.id} · ${an.mean.toFixed(2)} bits/word` : `${an.id} · ${an.mean.toFixed(2)}`, priority: an.cur ? 10 : 5,
          o: an.cur ? { font: 'mono', size: 22, minSize: 20, maxSize: 24, color: COLOR.warm, backing: 0.7, ref: 17 } : { font: 'mono', size: 14, minSize: 13, maxSize: 14, color: COLOR.ink2, backing: 0.6, ref: 17 },
        })), { obstacles: [{ p: pos, r: 40 }, ...segs] });
        finish(ctx, cam);
      },
    },
  ],
});

// the flat picture covers the whole frame, HUD corner included: knock it out behind the HUD readouts and title
function hudKnockout(ctx) {
  ctx.mask(40, 35, 390, 77);
  ctx.mask(1650, 35, 235, 35);
  ctx.mask(450, 45, 430, 30);
}
