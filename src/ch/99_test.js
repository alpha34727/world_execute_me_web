// Engine test chapter (not part of the film): v1 bars 16 .. 21.5 (~10 s) — also the look prototype:
// Claude is "me" (orange spark), "you" is blue, everything is a real 3D construction.
// Sync markers (chapter overlay) are read back by tools/synccheck.mjs.
import { chapter } from '../engine/timeline.js';
import { COLOR } from '../theme.js';
import { Swarm } from '../engine/gl/swarm.js';
import * as S from '../lib/sample.js';
import { corners } from '../lib/hud.js';
import { clamp, lerp, easeOutCubic, easeOutExpo, easeInOutCubic, smoothstep } from '../lib/ease.js';
import { hash32, rand, randn } from '../lib/hash.js';
import { piDigits } from '../lib/pi.js';
import { drawSpark } from '../lib/spark.js';
import { orbit, shake, add3 } from '../lib/camera.js';
import { floorGrid, polarGrid, axisGizmo, dust } from '../lib/scene3d.js';
import { drawPrediction } from '../lib/predict.js';
import { transcript } from '../lib/cc.js';
import { tokenChips } from '../lib/llmviz.js';
import { embeddings, attention } from '../lib/embed.js';
import { indexOf } from '../lib/corpus.js';
import { syncMarkers } from './test/sync.js';
import { tesseract } from './test/tesseract.js';

const TAU = Math.PI * 2;

// hero keyword: invisible before the sung frame, lands with a fast scale/alpha settle; then the tokenizer splits it
function hero(ctx, word, x, y, size = 120) {
  const dt = ctx.t - word.start;
  if (dt < 0) return;
  const e = easeOutExpo(clamp(dt / ctx.T.beats(0.5)));
  ctx.text(word.text, x, y, { font: 'display', size: size * (1.1 - 0.1 * e), align: 'center', baseline: 'middle', color: COLOR.me, alpha: clamp(dt * 30), tracking: 0.06, glow: 16, glowStrength: 0.3 * (1 - e) + 0.12, intensity: 0.92 });
  const w = ctx.measure(word.text, { font: 'display', size, tracking: 0.06 });
  ctx.line([[x - (w / 2) * e, y + size * 0.62], [x + (w / 2) * e, y + size * 0.62]], { color: COLOR.me, width: 2, alpha: 0.7 * e });
  tokenChips(ctx, word, x, y + size * 0.62 + 48, { at: word.start + ctx.T.beats(0.5), size: 22 });
}

// lattice for the "set of points" (11^3, spacing 0.48)
const NL = 11, SP = 0.48;
const latticeAt = (i, j, k) => [(i - 5) * SP, (j - 5) * SP, (k - 5) * SP];
// the words of the points shot at their real embedding coordinates (PPMI-SVD, first 3 axes), centred on their
// centroid and uniformly scaled to fill the lattice — a similarity transform, so distances stay truthful
function embedded(E, words, radius = 2.1) {
  const P = words.map((w) => E.point3(w.text));
  const c = [0, 1, 2].map((d) => P.reduce((s, p) => s + p[d], 0) / P.length);
  const R = Math.max(...P.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2])));
  return P.map((p) => p.map((v, d) => ((v - c[d]) * radius) / R));
}
const pointsWords = (T) => [...T.findLine("If I'm a set of points").words, ...T.findLine('Then I will give you my', 0).words];

// Claude Code transcript for v1 (floating terminal, left). Reading budget: one panel at a time, ≤3 short lines.
//   bar 16: the verse is a todo list (just the four keywords)
//   after each keyword (once the prediction panel has gone): "give you my X" = an edit moving X from me to you
function v1Session(T) {
  const kw = (k) => T.findWord(k).start;
  const D = kw('DIMENSION'), C = kw('CIRCUMFERENCE');
  return [
    { kind: 'todo', at: T.barTime(16), until: T.barTime(16) + T.beats(5), items: ['DIMENSION', 'CIRCUMFERENCE', 'TANGENTS', 'LIMITATIONS'].map((k) => ({ text: k, done: kw(k) })) },
    { kind: 'tool', at: D + T.beats(1.75), until: D + T.beats(6), name: 'Update', arg: 'me.js', body: [{ kind: 'del', text: 'me.dimension = 4' }, { kind: 'add', text: 'you.dimension = 4' }] },
    { kind: 'tool', at: C + T.beats(1.75), until: C + T.beats(6), name: 'Update', arg: 'me.js', body: [{ kind: 'del', text: 'me.circumference' }, { kind: 'add', text: 'you.circumference' }] },
  ];
}

export default chapter({
  id: 'test',
  from: (T) => T.barTime(16),
  to: (T) => T.beatTime(86),
  overlay(ctx) {
    const { T } = ctx;
    // next-token prediction before each "my -> KEYWORD"
    const l13 = T.findLine('Then I will give you my', 0);
    const l16 = T.findLine('Then I will give you my', 1);
    drawPrediction(ctx, { x: 1460, y: 330, prev: l13.words.at(-1), next: T.findWord('DIMENSION') });
    drawPrediction(ctx, { x: 1460, y: 330, prev: l16.words.at(-1), next: T.findWord('CIRCUMFERENCE') });
    transcript(ctx, 72, 190, ctx.memo('v1session', () => v1Session(T)));
    syncMarkers(ctx);
  },
  shots: [
    {
      id: 'points',
      hud: 'embedding space · PPMI-SVD · axes 1-3 of d = 16',
      at: (T) => T.barTime(16),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.barTime(16), t1 = T.findWord('DIMENSION').start;
        const k = easeInOutCubic(clamp((t - t0) / (t1 - t0)));
        const camDist = lerp(10.5, 7.4, k);
        const cam = orbit({ target: add3([0.55, 0.1, 0], shake(t, 0.03, 3)), r: camDist, az: lerp(0.5, 0.95, k), el: lerp(0.42, 0.27, k), fov: 38 });
        ctx.camera3D(cam);
        dust(ctx, { focus: camDist });
        const N = NL * NL * NL;
        const sw = ctx.memo('cloud', () => {
          const to = new Float32Array(N * 3), from = new Float32Array(N * 3);
          let n = 0;
          for (let i = 0; i < NL; i++) for (let j = 0; j < NL; j++) for (let q = 0; q < NL; q++, n++) {
            to.set(latticeAt(i, j, q), n * 3);
            const c = hash32(n, 5) % 4;
            const cx = (rand(c, 6) - 0.5) * 5, cy = (rand(c, 7) - 0.5) * 3, cz = (rand(c, 8) - 0.5) * 4;
            from.set([cx + randn(n, 9) * 0.9, cy + randn(n, 10) * 0.7, cz + randn(n, 11) * 0.9], n * 3);
          }
          return new Swarm({ from, to, seed: 4 });
        });
        // the clusters snap into the lattice on beats 64.25 .. 67
        const p = clamp((T.beatAt(t) - 64.25) / 2.75);
        ctx.swarm(sw, { p, stagger: 0.65, size: 4.2, perspective: true, focus: camDist, aperture: 7, fog: [6, 17], drift: 0.06 * (1 - p), scatter: 0.5, color: COLOR.dim, color2: COLOR.me, colorVar: 0.12, alpha: 0.9 });
        // "me" watches the context from just outside it (the tokens keep their true positions)
        const ME = [-0.8, 1.25, -3.4];
        drawSpark(ctx, { pos: ME, size: 0.62 });
        const sp = ctx.project(ME);
        ctx.post({ rays: [sp[0], sp[1], 0.32] });
        // every sung word becomes a token at its embedding coordinates; the newest one attends to the context
        // (lines = its row of the attention matrix, width/alpha from the real softmax weights)
        const words = pointsWords(T);
        const E = embeddings(T);
        const where = ctx.memo('embedded', () => embedded(E, words));
        const n = words.filter((w) => w.start <= t).length;
        if (n > 0) {
          const i = n - 1;
          const wts = attention(E, words.map((w) => w.text), i, { gain: 3 });
          const a = easeOutCubic(clamp((t - words[i].start) / T.beats(0.4)));
          ctx.line([ME, where[i]], { color: COLOR.me, width: 1.4, alpha: 0.5 * a, persp: 6, fog: [6, 17], dash: 6, gap: 6 });
          wts.forEach((wt, j) => {
            if (j === i) return;
            ctx.line([where[i], where[j]], { color: COLOR.me, width: 1 + 7 * wt, alpha: a * (0.15 + 0.85 * Math.sqrt(wt)), persp: 6, fog: [6, 17], glow: 8 * wt });
          });
        }
        words.forEach((w, j) => {
          if (t < w.start) return;
          const a = easeOutCubic(clamp((t - w.start) / T.beats(0.5)));
          const pos = where[j];
          const isYou = w.text.toLowerCase() === 'you';
          const cur = j === n - 1;
          const col = isYou ? COLOR.you : cur ? COLOR.me : COLOR.ink2;
          ctx.point3D(pos, isYou || cur ? 6 : 4, { fill: col, glow: 8, ref: camDist, alpha: a });
          ctx.text3D(w.text, add3(pos, [0.1, 0.12, 0]), { font: 'mono', size: isYou || cur ? 24 : 19, color: col, alpha: a, ref: camDist, fog: [7, 16] });
        });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'dimension',
      hud: 'tesseract · 16 vertices · 32 edges',
      at: (T) => T.cut(T.findWord('DIMENSION').start),
      transitionIn: { type: 'whip', frames: 10 },
      draw(ctx) {
        const { T, t } = ctx;
        const w = T.findWord('DIMENSION');
        const dt = t - w.start;
        const cam = orbit({ target: [0, 0.55, 0], r: 8.6, az: 0.75 + 0.5 * dt, el: 0.3, fov: 38 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8.4 });
        floorGrid(ctx, { y0: -2.6, half: 10, fog: [6, 19] });
        const E = tesseract(dt * 0.9 + 0.5);
        // 4D -> 3D: the object; 3D -> 2D: its shadow on the floor, given to "you"
        for (const e of E) {
          ctx.line(e.pts, { color: COLOR.me, width: 2.6, alpha: 0.3 + 0.7 * e.depth, glow: 10, glowStrength: 0.3, persp: 6, fog: [5, 15] });
          ctx.line(e.pts.map((p) => [p[0], -2.6, p[2]]), { color: COLOR.you, width: 1.6, alpha: 0.8, persp: 6, fog: [5, 15], glow: 4 });
        }
        for (const e of E) ctx.point3D(e.pts[0], 3.2, { fill: COLOR.ink, glow: 6, ref: 8.4 });
        ctx.text3D('4D → 3D', [-3.2, 1.2, 0], { font: 'mono', size: 20, color: COLOR.me, ref: 8.4 });
        ctx.text3D('3D → 2D shadow', [-3.4, -2.5, 1.2], { font: 'mono', size: 18, color: COLOR.you, ref: 8.4 });
        ctx.camera2D();
        hero(ctx, w, 960, 190, 118);
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'circle',
      hud: 'S¹ = { p : |p| = r }',
      at: (T) => T.cut(T.findLine("If I'm a circle").words[0].start),
      transitionIn: { type: 'glide', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const l = T.findLine("If I'm a circle");
        const s0 = l.words[0].start;
        const k = easeInOutCubic(clamp((t - s0) / T.beats(4)));
        const R = 2;
        const cam = orbit({ target: add3([0.3, -0.1, 0], shake(t, 0.02, 5)), r: lerp(6.6, 8.2, k), az: lerp(1.05, 0, k), el: lerp(0.55, 0.02, k), fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 6.6 });
        polarGrid(ctx, { u: [1, 0, 0], v: [0, 1, 0], rings: 4, step: 0.5, spokes: 24, alpha: 0.5 });
        // the spark unfolds into the circle: particles flow from the rays to the circumference
        const N = 900;
        const sw = ctx.memo('unfold', () => {
          const from = S.fn((u, i) => { const a = rand(i, 21) * TAU, r = 0.1 + 0.6 * rand(i, 22); return [Math.cos(a) * r, Math.sin(a) * r, (rand(i, 23) - 0.5) * 0.3]; }, N);
          const to = S.circle(0, 0, R, N, { seed: 24, jitter: 0.012 });
          return new Swarm({ from, to, seed: 25 });
        });
        const pu = clamp((t - s0) / T.beats(1.4));
        ctx.swarm(sw, { p: pu, stagger: 0.5, size: 3.6, perspective: true, focus: 6.6, aperture: 5, color: COLOR.me, color2: COLOR.me, scatter: 0.35, alpha: 0.9 });
        const arc = clamp((t - s0 - T.beats(0.6)) / T.beats(1.6));
        if (arc > 0) ctx.line(Array.from({ length: 181 }, (_, i) => { const a = Math.PI / 2 + (i / 180) * TAU * arc; return [Math.cos(a) * R, Math.sin(a) * R, 0]; }), { color: COLOR.me, width: 3.2, glow: 12, glowStrength: 0.35, persp: 6 });
        drawSpark(ctx, { size: 0.42 });
        { const sp = ctx.project([0, 0, 0]); ctx.post({ rays: [sp[0], sp[1], 0.28] }); }
        const wc = l.words.at(-1); // "circle"
        if (t >= wc.start) {
          const a = easeOutCubic(clamp((t - wc.start) / T.beats(0.5)));
          ctx.line([[0, 0, 0], [R * a, 0, 0]], { color: COLOR.ink2, width: 1.4, persp: 6, dash: 8, gap: 6 });
          ctx.text3D('r', [R * 0.5, 0.22, 0], { font: 'mono', size: 24, color: COLOR.ink2, align: 'center', alpha: a, ref: 6.6 });
          ctx.text3D('x² + y² = r²', [R * 0.72, R * 0.95, 0], { font: 'mono', size: 22, color: COLOR.ink2, alpha: a, ref: 6.6 });
        }
        const you = T.findLine('Then I will give you my', 1).words.find((w) => w.text === 'you');
        if (t >= you.start) {
          const a = easeOutCubic(clamp((t - you.start) / T.beats(0.4)));
          const th = Math.PI / 2 - (t - you.start) * 1.6;
          const p = [Math.cos(th) * R, Math.sin(th) * R, 0];
          ctx.point3D(p, 7, { fill: COLOR.you, glow: 14, alpha: a, ref: 6.6 });
          ctx.text3D('you', add3(p, [0.18, 0.18, 0]), { font: 'mono', size: 22, color: COLOR.you, alpha: a, ref: 6.6 });
        }
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'circumference',
      hud: 'rolling without slipping · cycloid',
      at: (T) => T.cut(T.findWord('CIRCUMFERENCE').start),
      transitionIn: { type: 'points', beats: 1 },
      draw(ctx) {
        const { T, t } = ctx;
        const w = T.findWord('CIRCUMFERENCE');
        const R = 1, x0 = -Math.PI * R, fy = -R;
        const ang = TAU * easeInOutCubic(clamp((t - w.start) / T.beats(1.7)));
        const cx = x0 + ang * R;
        const cam = orbit({ target: [cx * 0.85 - 0.6, -0.1, 0], r: 6.2, az: 0.5 - 0.15 * clamp((t - w.start) / T.beats(2)), el: 0.17, fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 6.2 });
        floorGrid(ctx, { y0: fy, half: 9, step: 0.5, fog: [5, 15], alpha: 0.4 });
        ctx.line([[x0 - 1.5, fy, 0], [x0 + TAU * R + 1.5, fy, 0]], { color: COLOR.faint, width: 1.4, persp: 6 });
        ctx.line([[x0, fy, 0], [cx, fy, 0]], { color: COLOR.me, width: 5, glow: 12, glowStrength: 0.4, persp: 6 });
        // the wheel and its spokes, rolling without slipping
        ctx.line(Array.from({ length: 121 }, (_, i) => { const a = (i / 120) * TAU; return [cx + Math.cos(a) * R, Math.sin(a) * R, 0]; }), { color: COLOR.ink2, width: 2.4, persp: 6 });
        for (let s = 0; s < 6; s++) { const a = -ang + (s / 6) * TAU - Math.PI / 2; ctx.line([[cx, 0, 0], [cx + Math.cos(a) * R, Math.sin(a) * R, 0]], { color: COLOR.faint, width: 1.2, persp: 6 }); }
        // the rim point that started on the floor traces a cycloid
        const cyc = Array.from({ length: 90 }, (_, i) => { const q = (i / 89) * ang; return [x0 + R * (q - Math.sin(q)), fy + R * (1 - Math.cos(q)), 0]; });
        if (ang > 0.02) ctx.line(cyc, { color: COLOR.me, width: 1.6, alpha: 0.7, dash: 10, gap: 8, persp: 6 });
        ctx.point3D([x0 + R * (ang - Math.sin(ang)), fy + R * (1 - Math.cos(ang)), 0], 6, { fill: COLOR.me, glow: 12, ref: 6.2 });
        drawSpark(ctx, { pos: [cx, 0, 0], size: 0.22 });
        // π, digit by digit (spigot), laid out on the floor ahead
        const digits = piDigits(40);
        const nd = Math.floor(clamp((t - w.start) / T.beats(2)) * 40);
        for (let i = 0; i < nd; i++) ctx.text3D(i === 1 ? '.' : digits[i === 0 ? 0 : i - 1], [x0 + i * 0.22, fy, 0.75], { font: 'mono', size: 30, color: COLOR.warm, ref: 6.2, fog: [5, 12], align: 'center' });
        if (ang > TAU * 0.96) ctx.text3D('C = 2πr', [0, fy + 0.25, 0], { font: 'mono', size: 26, color: COLOR.me, align: 'center', ref: 6.2 });
        ctx.camera2D();
        hero(ctx, w, 990, 190, 92);
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'sine',
      hud: 'helix · projection · positional encoding',
      at: (T) => T.cut(T.findLine("If I'm a sine wave").words[0].start),
      transitionIn: { type: 'xfade', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const s0 = T.findLine("If I'm a sine wave").words[0].start;
        const k = easeInOutCubic(clamp((t - s0) / T.beats(2.6)));
        const kw = TAU / 4, ph = T.beatAt(t) * Math.PI * 0.5;
        const H = (x) => [x, Math.sin(kw * x - ph), Math.cos(kw * x - ph)];
        // end-on the helix is the circle we just saw; from the side it is a sine wave
        // dolly zoom: field of view narrows while the camera pulls back (constant framing) -> wide tunnel to near-orthographic sine
        const fov = lerp(52, 14, k);
        const r = 3.6 / Math.tan((fov * Math.PI) / 360);
        const cam = orbit({ target: [0, -1.05 * k, 0], r, az: lerp(Math.PI / 2 - 0.06, 0, k), el: lerp(0.05, 0.06, k), fov });
        ctx.camera3D(cam);
        dust(ctx, { focus: r });
        const xs = Array.from({ length: 400 }, (_, i) => -8 + (i / 399) * 16);
        ctx.line([[-8, 0, 0], [8, 0, 0]], { color: COLOR.faint, width: 1, persp: r, alpha: k });
        ctx.line(xs.map(H), { color: COLOR.me, width: 3.2, glow: 12, glowStrength: 0.35, persp: r, fog: [r + 4, r + 14] });
        ctx.text3D('x(θ) = (θ, sin θ, cos θ)', [-1.9, 1.42, 0], { font: 'mono', size: 22, color: COLOR.ink2, alpha: smoothstep(0.15, 0.35, k) * (1 - smoothstep(0.55, 0.75, k)), ref: r });
        // the sine wave is how a transformer knows where a word is: sinusoidal positional encoding
        // PE(pos, 2i) = sin(pos / 10000^(2i/d)), PE(pos, 2i+1) = cos(…), d = 16 — rows are dimensions 0..5, each sung
        // word of this line is a column at its position in the song
        const pa = smoothstep(0.55, 0.95, k);
        if (pa > 0.003) {
          const D = 16, UNIT = 0.5, ROW0 = -1.62, STEP = 0.3, AMP = 0.12;
          const lineWords = [...T.findLine("If I'm a sine wave").words, ...T.findLine('Then you can sit on all my').words];
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
            ctx.line([[x, rowY(0) + 0.22, 0], [x, rowY(5) - 0.12, -1.25]], { color: COLOR.faint, width: 1, alpha: a, persp: r, dash: 4, gap: 4 });
            for (let d = 0; d < 6; d++) ctx.point3D([x, rowY(d) + AMP * pe(pos, d), -0.25 * d], 3.2, { fill: COLOR.ink, alpha: a, ref: r });
            ctx.text3D(w.text, [x, rowY(5) - 0.3, -1.25], { font: 'mono', size: 15, align: 'center', color: w.text === 'you' ? COLOR.you : COLOR.ink2, alpha: a, ref: r });
          });
          ctx.text3D('positional encoding   sin(pos / 10000^(2i/d))', [1.0, ROW0 + 0.34, 0], { font: 'mono', size: 20, color: COLOR.warm, alpha: pa, ref: r });
        }
        // "you" rides the curve, sitting on its tangent
        const you = T.findLine('Then you can sit on all my').words.find((w) => w.text === 'you');
        if (t >= you.start) {
          const a = easeOutCubic(clamp((t - you.start) / T.beats(0.4)));
          const x = -3 + (t - you.start) * 1.4;
          const p = H(x);
          const d = [1, kw * Math.cos(kw * x - ph), -kw * Math.sin(kw * x - ph)];
          const n = Math.hypot(...d), L = 1.5;
          ctx.line([[p[0] - (d[0] / n) * L, p[1] - (d[1] / n) * L, p[2] - (d[2] / n) * L], [p[0] + (d[0] / n) * L, p[1] + (d[1] / n) * L, p[2] + (d[2] / n) * L]], { color: COLOR.you, width: 2.4, alpha: a, persp: r, glow: 6 });
          ctx.point3D(p, 7, { fill: COLOR.you, glow: 14, alpha: a, ref: r });
        }
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
  ],
});
