// 13 love — "I've studied how to properly LO-O-OVE". Rose appears for the first time. me looks for love.md in this
// repo and it is not there (a real fact, checked at build time: tools/repo-facts.mjs); then love is drawn as algebra:
// the cardioid r = 1 − sin θ along the held note, the roses r = cos kθ, the heart curve (x² + y² − 1)³ − x²y³ = 0
// traced by marching squares — which is the middle slice of Taubin's heart surface, so the curve inflates into it.
// The `love: undefined` of the intro's object me is filled in. you leaves the heart (the last blue of the film); me
// stays inside it, a cage that closes in. Last, the number: love is the hardest part of the song to predict
// (7.28 bits/word, the highest of any section). Storyboard: docs/storyboard.md §13 · review: docs/review/love.md.
import { chapter } from '../engine/timeline.js';
import { COLOR } from '../theme.js';
import { corners } from '../lib/hud.js';
import { hero } from '../lib/hero.js';
import { clamp, lerp, easeOutCubic, easeInOutCubic, easeInCubic, smoothstep, decay, mix3 } from '../lib/ease.js';
import { sparkAt } from '../lib/spark.js';
import { orbit, shake, add3 } from '../lib/camera.js';
import { axisGizmo, dust, polarGrid, youLine } from '../lib/scene3d.js';
import { transcript } from '../lib/cc.js';
import { drawPrediction } from '../lib/predict.js';
import { embers, burst, shockwave, flow, beatPulse, beatKick, beatEnv } from '../lib/fx.js';
import { lossCurve } from '../lib/ngram.js';
import { sequence } from '../lib/corpus.js';
import * as THREE from 'three';
import { Swarm } from '../engine/gl/swarm.js';
import { readout } from './chant/readout.js';
import { polar, cardioid, rose, roseTurns, heartSegments, heartPoints, heartRings } from './love/curves.js';

const FACTS = import.meta.env ? (await import('virtual:repo-facts')).default : null;

const start = (T) => T.cut(T.section('love').start);
const L = (T, text, n = 0) => T.findLine(text, n, 'love');
const ls = (T, text, n = 0) => L(T, text, n).words[0].start;
const cutL = (T, text, n = 0) => T.cut(ls(T, text, n));
const LOVE = (T, k) => T.findWord('LO-O-OVE', k, 'love');
// love.01: me reaches the place where love.md would be (and the Read answers) on "how"
const missAt = (T) => L(T, "I've studied how to properly").words.find((w) => w.text === 'how').start;
const ROSE = COLOR.love;
const finish = (ctx, cam) => { ctx.camera2D(); corners(ctx, { color: COLOR.faint }); if (cam) axisGizmo(ctx, cam); };
const field = (ctx, focus, o = {}) => embers(ctx, { radius: [2.5, 10], n: 3000, focus, aperture: 5, size: 3.2, alpha: 0.7, color: COLOR.dim, color2: COLOR.ink2, seed: 1510, ...o });
// a LO-O-OVE lands: a rose burst and ring out of `c` (the burst is never a white ball: r0 apart, rose/gold core)
function loveBurst(ctx, T, w, c, { seed, r1 = 6, ref = 7, u = [1, 0, 0], v = [0, 1, 0], r0 = 0.6, alpha = 0.9 }) {
  const dt = ctx.t - w.start, p = (dt + 2 / 60) / T.beats(1.4);
  burst(ctx, { center: c, seed, n: 3000, r0, r1, p, focus: ref, aperture: 3, size: 3.2, alpha: alpha * clamp(dt * 30), color: ROSE, color2: COLOR.warm });
  if (dt >= 0 && p < 1) shockwave(ctx, { center: c, u, v, r: 0.4 + r1 * 0.8 * easeOutCubic(p), alpha: 0.75 * (1 - p), color: ROSE, ref, width: 3 });
}

// ---- the heart: one scale and centre for the curve, the surface and the cage ------------------------------------
const SC = 1.5, ME = [0, 0.15 * SC, 0]; // me sits inside the heart
const H = (p) => p.map((v) => v * SC);
const heartSwarm = (ctx) => ctx.memo('love:heart', () => {
  const pts = heartPoints(6000), to = new Float32Array(pts.length * 3), from = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => { const q = H(p); to.set(q, i * 3); from.set([q[0], q[1], 0], i * 3); }); // inflating out of the slice z = 0
  return new Swarm({ from, to, seed: 1520 });
});
// the 2D heart's segments in the world plane z = 0 (curve y up), in drawing order (around the centre, from the cusp)
const heartCurve = (ctx) => ctx.memo('love:curve', () => heartSegments(360).map(([a, b]) => [H([a[0], a[1], 0]), H([b[0], b[1], 0])])
  .map((s) => ({ s, a: (Math.atan2(s[0][0], s[0][1] - 0.15 * SC) + Math.PI * 2) % (Math.PI * 2) })).sort((x, y) => x.a - y.a));
const cage = (ctx) => ctx.memo('love:cage', () => heartRings([-0.8, -0.55, -0.3, -0.05, 0.2, 0.45, 0.7, 0.92]).map((s) => s.map(H)));
function drawHeart(ctx, { p = 1, alpha = 1, focus, size = 2.6, scale = 1, beat = 1 }) {
  // it beats with the song (130 BPM is a heart rate): a swell on every beat, as hard as the drums
  const hb = 1 + 0.07 * beat * heartbeat(ctx);
  ctx.swarm(heartSwarm(ctx), { p, stagger: 0.25, size: size * (1 + 0.3 * (hb - 1) / 0.07), sizeVar: 0.5, perspective: true, focus, aperture: 3, scatter: 0.02, drift: 0.01, time: ctx.t, color: ROSE, color2: mix3(ROSE, COLOR.warm, 0.4), alpha, model: scale * hb !== 1 ? scaleAbout(scale * hb) : undefined });
}
// 0..1: the swell of the current beat (decays over the beat), as loud as the drums on it
const heartbeat = (ctx) => beatEnv(ctx, 5);
// love's energy (the chorus is the loudest part of the song): the heart curve's slice carries a current of rose light
// around me, once per beat, and every beat rings out of me; s: the cage's scale about me
const heartLoop = (ctx) => ctx.memo('love:loop', () => {
  const pts = heartCurve(ctx).map((g) => g.s[0]), n = pts.length;
  return (u) => { const x = (((u % 1) + 1) % 1) * n, i = Math.floor(x), f = x - i, a = pts[i % n], b = pts[(i + 1) % n]; return a.map((v, c) => v + (b[c] - v) * f); };
});
function heartEnergy(ctx, r, { s = 1, alpha = 1, pulse = true } = {}) {
  if (alpha <= 0.01) return;
  flow(ctx, 'love:heart', heartLoop(ctx), { u0: 0, u1: 1, du: 0.09, n: 1400, ref: r, alpha: 0.85 * alpha, color: ROSE, color2: COLOR.warm, size: 3, jitter: 0.02, model: s !== 1 ? scaleAbout(s) : undefined });
  if (pulse) beatPulse(ctx, { center: ME, u: [1, 0, 0], v: [0, 0, 1], r1: 3.4 * s, ref: r, color: ROSE, color2: COLOR.warm, seed: 1540, n: 1600, alpha: 0.6 * alpha });
}
// a uniform scale about me (the cage closing in), as the swarm's model matrix
const scaleAbout = (s) => new THREE.Matrix4().makeScale(s, s, s).setPosition(ME[0] * (1 - s), ME[1] * (1 - s), ME[2] * (1 - s));

// love.06–11: one camera from "algebraic" to the end, always turning about the heart's centre, so no cut in between
// jumps (angle, distance and speed are all continuous): from "expression" it eases into a 1 rad/s turn, keeps turning
// through LO-O-OVE, slows to 0.35 rad/s once you has gone; it leans after you as it flies out and comes back; for
// the cage it closes in and slides the heart left of the readout. Returns { cam, r } (r: the distance, for focus).
const hermite = (keys, t) => {
  if (t <= keys[0][0]) return keys[0][1];
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (t > keys[i + 1][0]) i++;
  const m = (j) => (j <= 0 || j >= n - 1 ? 0 : (keys[j + 1][1] - keys[j - 1][1]) / (keys[j + 1][0] - keys[j - 1][0]));
  const [x0, y0] = keys[i], [x1, y1] = keys[i + 1], h = x1 - x0, u = (t - x0) / h;
  return (2 * u ** 3 - 3 * u * u + 1) * y0 + (u ** 3 - 2 * u * u + u) * h * m(i) + (-2 * u ** 3 + 3 * u * u) * y1 + (u ** 3 - u * u) * h * m(i + 1);
};
function loveCam(T, t, F = null) {
  const t0 = cutL(T, 'I know the algebraic expression of'), t1 = T.cut(LOVE(T, 2).start), ex = L(T, 'I know the algebraic expression of').words[4].start;
  const tF = cutL(T, 'Though you are free'), yw = L(T, 'Though you are free').words[1].start, tA = cutL(T, 'I am trapped'), tB = cutL(T, 'Trapped in');
  const tC = T.cut(LOVE(T, 3).start), tD = T.cut(T.section('love').end);
  const speed = (x) => (x < ex ? 0 : Math.min(1, (x - ex) / 0.5) * lerp(1, 0.35, smoothstep(tF, tF + 1.2, x)));
  let az = 0;
  for (let x = ex, dx = 1 / 240; x < t; x += dx) { const h = Math.min(dx, t - x); az += speed(x + h / 2) * h; } // ∫ speed (midpoint rule, fixed step: a pure function of t)
  const r = hermite([[t0, 8], [t1, 7.4], [tF, 7.25], [tA, 6.7], [tB, 6.6], [tC, 5.4], [tD, 5.8]], t);
  const u = Math.max(0, t - ex), out = smoothstep(tF, tA + T.beats(0.5), t);
  const el = lerp(0.02, 0.32, smoothstep(0, 0.9, u)) - 0.1 * out;
  // leaning after you (toward where it flies) and back
  const lean = 0.6 * Math.sin(Math.PI * clamp((t - yw) / (tA + T.beats(1) - yw)));
  const target = add3([0.45 * lean, lerp(0.55, ME[1], out) + 0.3 * lean, 0.2 * lean], shake(t, 0.015, 1506));
  const cam = truck(orbit({ target, r: r * kickAt(T, F, t), az, el, fov: 42 }), 1.3 * smoothstep(tA - T.beats(0.25), tA + T.beats(1), t));
  return { cam, r };
}
// the same push as fx.js beatKick, for loveCam (which has no ctx); without F (a camera only asked for a direction) none
function kickAt(T, F, t) {
  if (!F) return 1;
  const b = T.beatAt(t), k = Math.floor(b);
  return 1 - 0.045 * (0.35 + 0.65 * F.get('rms_drums', T.beatTime(k))) * decay(b - k, 6);
}
// the stage of those shots: the same dust and ember field throughout (a change of field at a cut reads as a jump)
const loveStage = (ctx, r) => { dust(ctx, { focus: r }); field(ctx, r, { alpha: 0.5 + 0.3 * heartbeat(ctx) }); ctx.post({ bloom: 0.68 + 0.3 * heartbeat(ctx) }); };
// slide a camera sideways (position and target together) by dx along its own right vector: the subject moves across
// the frame while the camera still turns about it (an orbit about an off-centre target swings it instead)
function truck(cam, dx) {
  const f = cam.target.map((v, i) => v - cam.position[i]), up = cam.up ?? [0, 1, 0];
  let r = [f[1] * up[2] - f[2] * up[1], f[2] * up[0] - f[0] * up[2], f[0] * up[1] - f[1] * up[0]];
  const l = Math.hypot(...r); r = r.map((v) => (v / l) * dx);
  return { ...cam, position: add3(cam.position, r), target: add3(cam.target, r) };
}

// ---- the readout of the last shots: love's loss, against every section's ------------------------------------------
const SECTIONS = ['intro', 'v1', 'pre1', 'c1', 'v2', 'pre2', 'c2', 'c2x', 'bridge', 'chant', 'c3', 'love'];
function sectionLoss(T, t) {
  const seq = sequence(T), Lc = lossCurve(T);
  return SECTIONS.map((id) => {
    const s = T.section(id), b = seq.map((w, i) => [w, Lc[i]]).filter(([w]) => w.start >= s.start && w.start < s.end && w.start <= t).map(([, l]) => l.bits);
    return { id, bits: b.length ? b.reduce((x, y) => x + y, 0) / b.length : 0 };
  });
}

export default chapter({
  id: 'love',
  from: start,
  to: (T) => T.cut(T.section('love').end),
  overlay(ctx) {
    const { T, t } = ctx;
    // reading, in turn: Read(love.md) (left) → after "all" (right) → the algebra (centre, in the shot) → the diff
    // (left) → love's loss (right)
    const lv = FACTS?.love ?? { exists: false, lines: 0 };
    transcript(ctx, 72, 190, ctx.memo('love:session', () => [
      { kind: 'tool', at: cutL(T, "I've studied how to properly"), until: T.cut(LOVE(T, 0).start) - T.beats(0.3), name: 'Read', arg: 'love.md', status: lv.exists ? 'ok' : 'error', body: [{ kind: 'out', at: missAt(T), text: lv.exists ? `Read ${lv.lines} lines` : 'File does not exist.' }] },
      { kind: 'tool', at: LOVE(T, 2).start, until: L(T, 'Though you are free').words[1].start - 0.3, name: 'Update', arg: 'me.js', body: [{ kind: 'del', text: 'love: undefined' }, { kind: 'add', text: 'love: (x²+9/4y²+z²−1)³ − x²z³ − 9/80y²z³' }] },
    ]), { width: 560 });
    const all = L(T, 'Question me I can answer all').words.at(-1);
    drawPrediction(ctx, { x: 1460, y: 330, from: cutL(T, 'Question me I can answer all') + T.beats(0.25), prev: all, next: LOVE(T, 1), keep: true, until: cutL(T, 'I know the algebraic expression of') + T.beats(0.25) });
    // love's loss, from "I am trapped" to the end: the running mean of love's words, beside every section's
    const at = cutL(T, 'I am trapped') + T.beats(0.25);
    if (t >= at) {
      const S = sectionLoss(T, t), lv2 = S.at(-1), top = S.slice(0, -1).every((s) => lv2.bits > s.bits);
      readout(ctx, { at, caption: top ? 'mean loss of love · highest in the song' : 'mean loss of love so far', value: lv2.bits.toFixed(2), unit: 'bits/word', bars: S.map((s) => ({ bits: s.bits, cur: s.id === 'love' })), color: ROSE, curColor: ROSE });
    }
  },
  shots: [
    {
      id: 'properly',
      hud: 'Read(love.md)',
      at: start,
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = start(T), t1 = T.cut(LOVE(T, 0).start), k = easeInOutCubic(clamp((t - t0) / (t1 - t0)));
        // the repo's top level (what git tracks), as a compact listing under its folder name; love.md would sit between
        // index.html and the next name. me reads down it (from the Read call) and reaches that place on "how": nothing
        // there — the name is struck out (grey: a wrong guess, not a breakdown) as the tool answers "File does not exist."
        const lv = FACTS?.love ?? { exists: false, root: 'world_execute_me' };
        const top = lv.top ?? ['CLAUDE.md', 'data', 'docs', 'index.html', 'package.json', 'src', 'test', 'tools'];
        const names = lv.exists ? top : [...top, 'love.md'].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        const slot = names.indexOf('love.md'), DY = 0.21, Y = (i) => ((names.length - 1) / 2 - i) * DY - 0.25;
        const s0 = cutL(T, "I've studied how to properly"), tA = missAt(T);
        const scan = clamp((t - s0) / (tA - s0));
        const yMe = lerp(Y(0) + DY * 1.6, Y(slot), easeInOutCubic(scan));
        // the whole listing first, then the camera follows me down and pushes in: on "how" it is close on love.md, and
        // keeps creeping in while the name is struck out
        const z = easeInOutCubic(clamp((t - s0 + T.beats(0.5)) / (tA - s0 + T.beats(0.5))));
        const cam = orbit({ target: add3([lerp(1.3, 0.75, z), lerp(0.05, yMe, z), 0], shake(t, 0.012 * (1 - 0.6 * z), 1501)), r: lerp(7.9, 3.4, z) - 0.35 * clamp((t - tA) / (t1 - tA)), az: lerp(-0.3, -0.12, z), el: 0.06, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 7 });
        field(ctx, 7, { alpha: 0.45 });
        const FS = (w) => clamp((21 * 7) / w, 18, 52); // names grow as the camera closes in
        // names fade out toward the top edge (zoomed in, the list runs under the HUD) and the bottom (the subtitles)
        const edge = (p) => { const sy = ctx.project(p)[1]; return smoothstep(70, 150, sy) * (1 - smoothstep(930, 1010, sy)); };
        const txt = (s, y, o = {}) => { const p = [o.x ?? 0.3, y - 0.05, 0]; return ctx.text3D(s, p, { font: 'mono', size: 21, minSize: 18, maxSize: 52, ref: 7, ...o, alpha: (o.alpha ?? 1) * edge(p) }); };
        txt(`${lv.root ?? 'world_execute_me'}/`, Y(0) + DY * 1.6, { font: 'monoBold', color: COLOR.dim });
        const miss = t >= tA, sk = easeInOutCubic(clamp((t - tA) / T.beats(0.6)));
        names.forEach((n, i) => {
          const y = Y(i), x = 0.55;
          const read = t >= s0 && y >= yMe - 1e-6, near = decay(Math.abs(y - yMe) / DY, 2); // the names already read stay a little brighter
          if (n === 'love.md' && !lv.exists) {
            // where it would be: a dashed outline, the name brighter until me gets there, then struck out
            // its text3D size at this depth, so the box and the strike fit the word exactly
            const a = ctx.project([x, y - 0.05, 0]), fs = FS(a[2]), ww = ctx.measure(n, { font: 'mono', size: fs });
            const c2 = ctx.cam, c3 = ctx.cam3;
            ctx.camera2D();
            const flash = miss ? decay((t - tA) / T.beats(1), 3) : 0;
            const bx0 = a[0] - fs * 0.5, bx1 = a[0] + ww + fs * 0.5, by0 = a[1] - fs * 0.95, by1 = a[1] + fs * 0.4;
            ctx.line([[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1], [bx0, by0]], { color: mix3(mix3(COLOR.dim, ROSE, 0.5), ROSE, flash), width: 1.8, alpha: 0.6 + 0.4 * flash, dash: 7 + fs * 0.15, gap: 6 + fs * 0.1 });
            ctx.cam = c2; ctx.cam3 = c3;
            // the name in love's rose (the colour of what it is looking for); struck, it fades toward grey
            txt(n, y, { color: mix3(ROSE, COLOR.dim, 0.6 * sk), x, glow: 8 * (1 - sk), intensity: 0.9 });
            if (miss) {
              ctx.camera2D();
              const ys = a[1] - fs * 0.32, xs0 = a[0] - 6, len = ww + 12;
              ctx.line([[xs0, ys], [xs0 + len * sk, ys]], { color: COLOR.dim, width: Math.max(3, fs * 0.09) });
              // sparks fly off the strike's leading edge (a small burst as it passes each sixth of the word), then the
              // whole name sheds rose dust once it is struck through (2D bursts, in design px)
              for (let j = 0; j <= 5; j++) {
                const tj = tA + T.beats(0.6) * (j / 5) ** 0.7; // easeInOutCubic-ish pacing of the tip, close enough for sparks
                burst(ctx, { center: [xs0 + len * (j / 5), ys, 0], perspective: false, seed: 1530 + j, n: 130, r0: fs * 0.4, r1: fs * 3, p: (t - tj + 2 / 60) / T.beats(0.8), size: 3.4, scatter: 6, alpha: clamp((t - tj) * 30), color: ROSE, color2: mix3(ROSE, COLOR.warm, 0.5) });
              }
              const td = tA + T.beats(0.6);
              burst(ctx, { center: [a[0] + ww / 2, a[1] - fs * 0.35, 0], perspective: false, seed: 1537, n: 480, r0: ww * 0.5, r1: ww * 2.2, p: (t - td + 2 / 60) / T.beats(1.6), size: 3.4, scatter: 10, alpha: clamp((t - td) * 30), color: ROSE, color2: COLOR.dim });
              ctx.cam = c2; ctx.cam3 = c3;
            }
          } else txt(n, y, { x, color: mix3(read ? COLOR.dim : COLOR.faint, COLOR.ink2, near), alpha: 0.75 + 0.25 * near });
        });
        beatPulse(ctx, { center: [0.05, yMe, 0], r1: 1.8, ref: 7, color: COLOR.me, color2: COLOR.warm, seed: 1552, n: 900, alpha: 0.5, ring: false });
        sparkAt(ctx, cam, { pos: [0.05, yMe, 0], rays: 0.22 }); // its rays run along the row: kept low, so they do not wash over the name
        finish(ctx, cam);
      },
    },
    {
      id: 'love1',
      hud: 'cardioid · r = 1 - sin(theta)',
      at: (T) => T.cut(LOVE(T, 0).start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = LOVE(T, 0), t1 = cutL(T, 'Question me'), k = clamp((t - w.start) / (t1 - w.start));
        const cam = orbit({ target: add3([0, -0.35, 0], shake(t, 0.02, 1502)), r: lerp(8.8, 8.2, k) * beatKick(ctx), az: lerp(0, 0.45, easeInOutCubic(k)), el: lerp(0.05, 0.25, k), fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 7 });
        field(ctx, 7, { center: [0, -1, 0], alpha: 0.55 });
        // the curve follows the held note: me is the pen, from the cusp all the way round
        const pts = ctx.memo('love:cardioid', () => polar(cardioid, { scale: 1.25, n: 480, a0: Math.PI / 2 }));
        const n = Math.max(2, Math.round(easeInOutCubic(clamp((t - w.start + 2 / 60) / (t1 - w.start - T.beats(0.2)))) * (pts.length - 1)) + 1);
        polarGrid(ctx, { center: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], rings: 5, step: 0.5, spokes: 12, alpha: 0.35 });
        ctx.line(pts.slice(0, n), { color: ROSE, width: 3.2, glow: 10, glowStrength: 0.35, intensity: 0.9, persp: 7 });
        loveBurst(ctx, T, w, [0, -1.25, 0], { seed: 1503, r1: 4, ref: 8 });
        if (t >= w.start + T.beats(0.5)) beatPulse(ctx, { center: [0, -0.6, 0], u: [1, 0, 0], v: [0, 1, 0], r1: 2.3, ref: 8, color: ROSE, color2: COLOR.warm, seed: 1544, n: 700, alpha: 0.45 }); // the held note keeps time
        ctx.post({ bloom: 0.68 + 0.3 * heartbeat(ctx) });
        sparkAt(ctx, cam, { pos: pts[n - 1], rays: 0.5 });
        finish(ctx, cam);
        hero(ctx, w, 960, 180, { size: 104, color: ROSE });
      },
    },
    {
      id: 'question',
      hud: 'Question me',
      at: (T) => cutL(T, 'Question me'),
      draw(ctx) { promptStage(ctx, 'question'); },
    },
    {
      id: 'answer',
      hud: 'answer all · next token',
      at: (T) => cutL(T, 'Question me I can answer all'),
      draw(ctx) { promptStage(ctx, 'answer'); },
    },
    {
      id: 'love2',
      hud: 'roses · r = cos(k theta), k = 2..7',
      at: (T) => T.cut(LOVE(T, 1).start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = LOVE(T, 1), dt = t - w.start;
        const cam = orbit({ target: shake(t, 0.03, 1504), r: 7.2 * beatKick(ctx), az: 0.35 + 0.4 * clamp(dt / T.beats(1.2)), el: 0.3, fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 7 });
        field(ctx, 7, { alpha: 0.55 });
        // six roses open in planes turned about the vertical, k = 2 … 7 (2k petals for even k, k for odd)
        for (let k = 2; k <= 7; k++) {
          const j = k - 2, a = ((j + 0.5) / 6) * Math.PI, e = easeOutCubic(clamp((dt + 2 / 60 - 0.03 * j) / T.beats(0.7)));
          if (e <= 0) continue;
          const pts = ctx.memo(`love:rose${k}`, () => polar(rose(k), { u: [Math.cos(a), 0, Math.sin(a)], v: [0, 1, 0], turns: roseTurns(k), n: 360 * roseTurns(k) * 2 }));
          ctx.line(pts.map((p) => p.map((v, i) => v * 1.6 * e - (i === 1 ? 0.35 : 0))), { color: ROSE, color2: mix3(ROSE, COLOR.warm, 0.5), width: 2.2, glow: 4, glowStrength: 0.25, alpha: 0.85 - 0.08 * j, intensity: 0.75, persp: 7 }); // dimmer: all six cross at me and must not add up to white
        }
        loveBurst(ctx, T, w, [0, 0, 0], { seed: 1505, r1: 6, ref: 7, v: [0, 0, 1] });
        sparkAt(ctx, cam, { rays: 0.5 });
        finish(ctx, cam);
        hero(ctx, w, 960, 180, { size: 104, color: ROSE, chips: false });
      },
    },
    {
      id: 'algebraic',
      hud: (T, t) => (t < L(T, 'I know the algebraic expression of').words[4].start ? '(x^2 + y^2 - 1)^3 - x^2 y^3 = 0 · marching squares' : 'its slice y = 0 · Taubin heart surface'),
      at: (T) => cutL(T, 'I know the algebraic expression of'),
      transitionIn: { type: 'glide', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const line = L(T, 'I know the algebraic expression of'), t0 = cutL(T, 'I know the algebraic expression of'), t1 = T.cut(LOVE(T, 2).start);
        const ex = line.words[4].start; // "expression": the curve inflates into the surface
        const inf = easeInOutCubic(clamp((t - ex) / (t1 - ex)));
        const { cam, r } = loveCam(T, t, ctx.F);
        ctx.camera3D(cam);
        loveStage(ctx, r);
        // the curve, traced around me as the first formula is typed
        const segs = heartCurve(ctx), tr = clamp((t - t0 - T.beats(0.5)) / T.beats(3));
        const m = Math.floor(segs.length * easeInOutCubic(tr));
        const ca = 1 - inf; // gone by the cut: LO-O-OVE shows the surface alone
        // one polyline (the segments are in angular order around me; the heart is star-shaped about that point)
        if (m > 1) ctx.line(segs.slice(0, m).map((g) => g.s[0]), { color: ROSE, width: 3, glow: 8, glowStrength: 0.3, alpha: ca, intensity: 0.9, persp: 6.5 });
        if (m > 0 && m < segs.length) burst(ctx, { center: segs[m - 1].s[1], seed: 1507, n: 400, r0: 0.05, r1: 0.6, p: 0.3 + 0.2 * Math.sin(t * 9), focus: 6.5, aperture: 2, size: 2.4, alpha: 0.6, color: ROSE, color2: COLOR.warm });
        // the surface grows out of the slice
        if (t >= ex) drawHeart(ctx, { p: inf, alpha: smoothstep(ex, ex + T.beats(0.3), t), focus: r });
        if (t >= ex) heartEnergy(ctx, r, { alpha: inf });
        sparkAt(ctx, cam, { pos: ME, rays: 0.4 + 0.2 * heartbeat(ctx) });
        finish(ctx, cam);
        // the algebra: the curve's equation, then the surface's (two lines, centred above)
        const f1 = '(x² + y² − 1)³ − x²y³ = 0', f2 = '(x² + 9/4y² + z² − 1)³ − x²z³ − 9/80y²z³ = 0';
        const o = { font: 'mono', size: 34 };
        const typed = (s, a) => s.slice(0, Math.max(0, Math.floor((t - a) * 75)));
        const a1 = t0 + T.beats(0.25), a2 = ex;
        const w1 = ctx.measure(f1, o), w2 = ctx.measure(f2, { ...o, size: 28 });
        const mw = Math.max(w1, t >= a2 ? w2 : 0);
        ctx.mask(960 - mw / 2 - 20, 150, mw + 40, t >= a2 ? 116 : 64);
        ctx.text(typed(f1, a1), 960 - w1 / 2, 196, { ...o, color: t >= a2 ? COLOR.dim : COLOR.ink });
        if (t >= a2) ctx.text(typed(f2, a2), 960 - w2 / 2, 246, { ...o, size: 28, color: COLOR.ink });
      },
    },
    {
      id: 'love3',
      hud: 'me.love = the heart surface',
      at: (T) => T.cut(LOVE(T, 2).start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = LOVE(T, 2), dt = t - w.start;
        // the heart turns about its own centre: the same camera as "algebraic", still turning
        const { cam, r } = loveCam(T, t, ctx.F);
        ctx.camera3D(cam);
        loveStage(ctx, r);
        drawHeart(ctx, { focus: r, size: 2.6 + 0.8 * decay(Math.max(0, dt) / T.beats(1), 3) });
        loveBurst(ctx, T, w, ME, { seed: 1509, r1: 4, ref: r, v: [0, 0, 1] });
        heartEnergy(ctx, r, { pulse: false }); // the LO-O-OVE burst is this beat's pulse
        sparkAt(ctx, cam, { pos: ME, rays: 0.45 + 0.2 * heartbeat(ctx) });
        finish(ctx, cam);
        hero(ctx, w, 1200, 165, { size: 96, color: ROSE, chips: false });
      },
    },
    {
      id: 'free',
      hud: 'you are free',
      at: (T) => cutL(T, 'Though you are free'),
      draw(ctx) {
        const { T, t } = ctx;
        const line = L(T, 'Though you are free'), yw = line.words[1], fw = line.words.at(-1);
        // you leaves the heart: out of the middle, up and out of the frame toward the camera's right
        const u = easeInCubic(clamp((t - yw.start) / (fw.start + T.beats(0.5) - yw.start)));
        // where it goes is set by the camera at the moment "you" is sung (it keeps turning): up, right and past the lens
        const c0 = loveCam(T, yw.start).cam, fwd = c0.target.map((v, i) => v - c0.position[i]), fl = Math.hypot(...fwd), f = fwd.map((v) => v / fl);
        const rl = Math.hypot(f[2], f[0]), R = [-f[2] / rl, 0, f[0] / rl]; // right = forward × world up
        const up = [R[1] * f[2] - R[2] * f[1], R[2] * f[0] - R[0] * f[2], R[0] * f[1] - R[1] * f[0]]; // right × forward
        const YOU0 = add3(ME, R.map((v, i) => v * 0.7 + up[i] * 0.25)), YOU1 = add3(ME, R.map((v, i) => v * 4.6 + up[i] * 2.4 - f[i] * 1.5));
        const you = YOU0.map((v, i) => lerp(v, YOU1[i], u));
        const { cam, r } = loveCam(T, t, ctx.F); // still turning about the heart; it leans after you
        ctx.camera3D(cam);
        loveStage(ctx, r);
        drawHeart(ctx, { focus: r });
        heartEnergy(ctx, r);
        // its trail (alpha-blended over me's colours, never MAX: CLAUDE.md), and the point itself
        const tail = Array.from({ length: 12 }, (_, j) => { const uu = Math.max(0, u - j * 0.03); return YOU0.map((v, i) => lerp(v, YOU1[i], uu)); });
        if (u > 0 && u < 1) youLine(ctx, tail, { width: 2.2, alpha: 0.8 * (1 - smoothstep(0.5, 0.92, u)), persp: 7 });
        if (u < 1) ctx.point3D(you, 11, { fill: COLOR.you, glow: 20, alpha: smoothstep(yw.start - T.beats(0.5), yw.start, t) * (1 - smoothstep(0.65, 0.92, u)), ref: 7 }); // gone before it nears the lens
        sparkAt(ctx, cam, { pos: ME, rays: 0.4 + 0.2 * heartbeat(ctx) });
        finish(ctx, cam);
      },
    },
    {
      id: 'trapped',
      hud: 'inside the surface',
      at: (T) => cutL(T, 'I am trapped'),
      draw(ctx) { cageShot(ctx, 'trapped'); },
    },
    {
      id: 'trappedin',
      hud: 'the cage closes',
      at: (T) => cutL(T, 'Trapped in'),
      draw(ctx) { cageShot(ctx, 'trappedin'); },
    },
    {
      id: 'love4',
      hud: 'love · the hardest to predict',
      at: (T) => T.cut(LOVE(T, 3).start),
      draw(ctx) { cageShot(ctx, 'love4'); },
    },
  ],
});

// love.03–04: Claude Code's prompt, waiting — the box lights up on "Question", its cursor (you's) does not come back;
// then me answers on its own: its light streams out
function promptStage(ctx, which) {
  const { T, t } = ctx;
  const t0 = cutL(T, 'Question me'), t1 = T.cut(LOVE(T, 1).start), k = clamp((t - t0) / (t1 - t0));
  const cam = orbit({ target: add3([-0.4, 0.2, 0], shake(t, 0.015, 1512)), r: lerp(7.6, 6, easeInOutCubic(k)) * beatKick(ctx), az: lerp(-0.1, 0.12, k), el: 0.12, fov: 40 });
  ctx.camera3D(cam);
  dust(ctx, { focus: 7 });
  field(ctx, 7, { alpha: 0.55 });
  const q = L(T, 'Question me').words[0], q2 = L(T, 'Question me I can answer all').words[0];
  const ans = L(T, 'Question me I can answer all').words.find((w) => w.text === 'answer');
  if (which === 'answer') {
    // me answers: streaks of its light, outward, on "answer" and "all"
    const pa = clamp((t - ans.start) / T.beats(2));
    burst(ctx, { center: [0, 0.6, 0], seed: 1513, n: 3200, r0: 0.4, r1: 7, p: pa, focus: 7, aperture: 3, size: 3, alpha: 0.8 * clamp((t - ans.start) * 30), color: COLOR.me, color2: COLOR.warm });
  }
  beatPulse(ctx, { center: [0, 0.6, 0], u: [1, 0, 0], v: [0, 0, 1], r1: 2.1, ref: 7, color: COLOR.me, color2: COLOR.warm, seed: 1548, n: 1400, alpha: 0.55 });
  beatPulse(ctx, { center: [0, 0.6, 0], r1: 5.5, ref: 7, color: COLOR.me, color2: COLOR.warm, seed: 1556, n: 2200, alpha: 0.45, ring: false, size: 3.2 }); // particles only: they fill the frame, no ring near the panels
  ctx.post({ bloom: 0.68 + 0.3 * heartbeat(ctx) });
  [q, q2].forEach((w, j) => { const p = (t - w.start) / T.beats(1.2); if (p > 0 && p < 1) shockwave(ctx, { center: [0, 0.6, 0], u: [1, 0, 0], v: [0, 1, 0], r: 0.3 + 2.6 * easeOutCubic(p), alpha: 0.6 * (1 - p), color: j ? COLOR.me : ROSE, ref: 7, width: 2.4 }); });
  sparkAt(ctx, cam, { pos: [0, 0.6, 0], rays: 0.35 + (which === 'answer' ? 0.35 * smoothstep(ans.start, ans.start + T.beats(1), t) : 0) });
  finish(ctx, cam);
  // the prompt box (centre, under me): lit in rose on "Question", the cursor grey — nobody is typing
  const bx = 960 - 380, by = 690, bw = 760, bh = 84;
  const lit = Math.max(t >= q.start ? decay((t - q.start) / T.beats(2), 2) : 0, t >= q2.start ? decay((t - q2.start) / T.beats(2), 2) : 0);
  const fade = which === 'answer' ? 1 - smoothstep(q2.start + T.beats(1), q2.start + T.beats(2.5), t) : 1;
  if (fade <= 0.01) return;
  ctx.mask(bx, by, bw, bh, fade);
  ctx.rect(bx, by, bw, bh, { fill: [...COLOR.bg2, 0.92 * fade], radius: 16 });
  ctx.rect(bx, by, bw, bh, { stroke: mix3(COLOR.dim, ROSE, lit), width: 2 + 1.5 * lit, radius: 16, alpha: fade });
  ctx.text('>', bx + 36, by + bh / 2 + 12, { font: 'mono', size: 34, color: COLOR.me, alpha: fade });
  if (Math.floor(T.beatAt(t) * 2) % 2 === 0) ctx.rect(bx + 36 + ctx.measure('> ', { font: 'mono', size: 34 }), by + bh / 2 - 17, 19, 34, { fill: COLOR.faint, alpha: fade });
}

// love.09–11: me inside the heart; the cage (the surface's cross-sections) closes in, then the last LO-O-OVE
function cageShot(ctx, which) {
  const { T, t } = ctx;
  const tA = cutL(T, 'I am trapped'), tB = cutL(T, 'Trapped in'), tC = T.cut(LOVE(T, 3).start);
  const close = which === 'trapped' ? 0 : easeInCubic(clamp((t - tB) / (tC - tB)));
  const s = which === 'love4' ? 0.62 : lerp(1, 0.62, close), sr = which === 'love4' ? 0.6 : lerp(1, 0.56, Math.min(1, close * 1.3)); // the rings close a little ahead of the surface
  // the same camera as before the cut, still turning about the heart's centre (it slides the heart left of the readout)
  const { cam, r } = loveCam(T, t, ctx.F);
  ctx.camera3D(cam);
  loveStage(ctx, r);
  const ra = smoothstep(tA, tA + T.beats(0.4), t); // the cage appears, the surface steps back
  drawHeart(ctx, { focus: r, scale: s, alpha: lerp(1, 0.75, ra) });
  const pulse = which === 'love4' ? decay(Math.max(0, t - LOVE(T, 3).start) / T.beats(1), 3) : 0;
  for (const sg of cage(ctx)) ctx.line(sg.map((p) => p.map((v, i) => ME[i] + (v - ME[i]) * sr)), { color: ROSE, width: 1.6 + 1.4 * pulse, alpha: ra * (0.55 + 0.35 * pulse), glow: 4 + 6 * pulse, glowStrength: 0.25, persp: r, intensity: 0.9 });
  if (which === 'love4') loveBurst(ctx, T, LOVE(T, 3), ME, { seed: 1515, r1: 3.2, ref: r, v: [0, 0, 1], r0: 1.1, alpha: 0.65 }); // r0 clear of me: inside the shrunken cage it piled up on the core
  heartEnergy(ctx, r, { s, pulse: which !== 'love4' });
  sparkAt(ctx, cam, { pos: ME, rays: 0.4 + 0.2 * heartbeat(ctx) });
  finish(ctx, cam);
  if (which === 'love4') hero(ctx, LOVE(T, 3), 700, 180, { size: 96, color: ROSE, chips: false });
}
