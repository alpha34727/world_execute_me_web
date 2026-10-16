// 04 c1 — me wants to give you everything. The network fires with the song itself (its real mel spectrum), the
// tokenizer shows STIMULATIONS sharing a piece with SIMULATION, softmax is cooled until one word is left (and it is
// the wrong one), you approve the command in Claude Code's permission prompt, EXECUTION throws everything out —
// into a world with periodic boundaries, which is then shown inside itself: trapped in a simulation.
// Storyboard: docs/storyboard.md §04 · review: docs/review/c1.md.
import { chapter } from '../engine/timeline.js';
import { COLOR } from '../theme.js';
import { corners } from '../lib/hud.js';
import { hero } from '../lib/hero.js';
import { tokenChips } from '../lib/llmviz.js';
import { sparkIcon } from '../lib/spark.js';
import { clamp, lerp, easeOutCubic, easeInOutCubic, easeInCubic, smoothstep, decay } from '../lib/ease.js';
import { sparkAt } from '../lib/spark.js';
import { rand } from '../lib/hash.js';
import { orbit, shake, add3 } from '../lib/camera.js';
import { axisGizmo, dust, labels3D, floorGrid } from '../lib/scene3d.js';
import { permission } from '../lib/cc.js';
import { drawPrediction } from '../lib/predict.js';
import { bigramUntil } from '../lib/ngram.js';
import { bpe } from '../lib/bpe.js';
import { sequence } from '../lib/corpus.js';
import { embers, burst, shockwave } from '../lib/fx.js';
import { particles, boxEdges, BOX, SCREEN, screenCorners, world2D } from './c1/world.js';

const TAU = Math.PI * 2;
const start = (T) => T.cut(T.section('c1').start);
const L = (T, text, n = 0) => T.findLine(text, n, 'c1');
const W = (T, k) => T.findWord(k, 0, 'c1');
const ls = (T, text, n = 0) => L(T, text, n).words[0].start;
const wordIn = (T, line, text, n = 0) => L(T, line, n).words.find((w) => w.text === text);
const field = (ctx, focus, o = {}) => embers(ctx, { radius: [2.5, 10], n: 3000, focus, aperture: 5, size: 3.2, alpha: 0.8, color: COLOR.dim, color2: COLOR.ink2, seed: 340, ...o });
const label = (p, text, o = {}) => ({ p, id: text, text, priority: 10, o: { font: 'mono', size: 22, minSize: 20, maxSize: 24, color: COLOR.ink2, backing: 0.7, ref: 8, ...o } });

// ---- c1.02–04: the network firing with the song: 16 mel bands × 12 steps of history (1/8 beat apart) ------------
const NBAND = 16, NHIST = 12, GX = 0.42, GZ = 0.5;
const nodeAt = (b, h) => [(b - 7.5) * GX, 0, (h - 5.5) * GZ];
const YOU_C1 = [0, 2.4, 0];
function network(ctx, t, { alpha = 1, row = -1, ref = 8, offset = [0, 0, 0], floor = false } = {}) {
  const { T, F } = ctx;
  const hot = [];
  if (floor) for (let b = 0; b <= NBAND; b++) ctx.line([add3(offset, [(b - 8) * GX, 0, -6 * GZ]), add3(offset, [(b - 8) * GX, 0, 6 * GZ])], { color: COLOR.faint, width: 1, alpha: alpha * 0.6, persp: ref });
  if (floor) for (let h = 0; h <= NHIST; h++) ctx.line([add3(offset, [-8 * GX, 0, (h - 6) * GZ]), add3(offset, [8 * GX, 0, (h - 6) * GZ])], { color: COLOR.faint, width: 1, alpha: alpha * 0.6, persp: ref });
  for (let h = 0; h < NHIST; h++) {
    const m = F.mel(t - h * T.beats(0.125));
    const ra = row < 0 ? 1 : h === row ? 1 : 0.04; // "Then I can": the grid goes out but for one row
    if (ra * alpha < 0.01) continue;
    for (let b = 0; b < NBAND; b++) {
      const a = m[b], p = add3(offset, nodeAt(b, h)), top = [p[0], p[1] + 0.05 + 1.25 * a, p[2]];
      const fresh = h === 0 ? 1.4 : 1 - h / NHIST; // the newest step (the front row) is the brightest
      // colour by value: quiet bands stay grey, loud ones are me's orange going gold
      ctx.line([p, top], { color: a > 0.45 ? COLOR.me : COLOR.dim, color2: a > 0.45 ? COLOR.warm : COLOR.ink2, width: 2.6 + 2.6 * a, alpha: Math.min(1, alpha * ra * (0.3 + 0.6 * fresh)), glow: 8 * a * fresh, persp: ref, fog: [ref - 2, ref + 8] });
      ctx.point3D(p, 2.2, { fill: COLOR.dim, alpha: alpha * ra * 0.8, ref });
      if (h === 0 && a > 0.55) hot.push(top);
    }
  }
  return hot;
}

// MULATION is a piece SIMULATION is made of: a gold line from the chip to the token the intro sang
const CHIPS_Y = 190 + 104 * 0.62 + 48; // where hero() puts STIMULATIONS' chips (y 190, size 104)
function stimLink(ctx, T, t, chips) {
  const w = W(T, 'STIMULATIONS');
  const chip = chips.find((c) => c.piece.toLowerCase() === 'mulation');
  const la = smoothstep(w.start + T.beats(0.9), w.start + T.beats(1.3), t) * (1 - smoothstep(T.cut(ls(T, 'Then I can be your only')) - T.beats(0.4), T.cut(ls(T, 'Then I can be your only')), t));
  if (!chip || la <= 0) return;
  const B = bpe(T), id = (s) => B.vocab.indexOf(s);
  const whole = 'simulation', parts = [...Array(whole.length - 1).keys()].map((i) => [whole.slice(0, i + 1), whole.slice(i + 1)]).find(([a, b]) => id(a) >= 0 && id(b) >= 0 && b.includes('mulation') && id(a) < id(whole) && id(b) < id(whole));
  const cx = chip.x + chip.w / 2, top = chip.y + chip.h + 22;
  const ty = 470, tw = ctx.measure('SIMULATION', { font: 'monoBold', size: 22 }) + 28;
  ctx.line([[cx, top], [cx, top + (ty - top) * Math.min(1, la * 1.5)]], { color: COLOR.warm, width: 2, glow: 8, alpha: la });
  ctx.rect(chip.x - 3, chip.y - 3, chip.w + 6, chip.h + 6, { stroke: COLOR.warm, width: 2, radius: 5, glow: 8, alpha: la });
  const a = smoothstep(0.4, 1, la);
  if (a <= 0) return;
  const sim0 = T.findWord('SIMULATION', 0);
  const note = `#${id(whole)} = ${parts ? parts[0].toUpperCase() + ' + ' + parts[1].toUpperCase() : ''} · sung at ${sim0.start.toFixed(1)} s`;
  const nw = ctx.measure(note, { font: 'mono', size: 18 });
  ctx.rect(cx - nw / 2 - 10, ty - 6, nw + 20, 84, { fill: [0, 0, 0, 0.75 * a], radius: 4 });
  ctx.mask(cx - nw / 2 - 10, ty - 6, nw + 20, 84, a);
  ctx.rect(cx - tw / 2, ty, tw, 40, { fill: [...COLOR.warm, 0.18], stroke: COLOR.warm, width: 1.4, radius: 5, alpha: a });
  ctx.text('SIMULATION', cx, ty + 28, { font: 'monoBold', size: 22, align: 'center', color: COLOR.ink, alpha: a });
  ctx.text(note, cx, ty + 66, { font: 'mono', size: 18, align: 'center', color: COLOR.warm, alpha: a });
}

// ---- c1.05/06: softmax at falling temperature ---------------------------------------------------------------------
// After "only" the model has no data ("only" was never heard before), so its next-word distribution is its fallback,
// the unigram over everything heard so far. Cooling it, p_τ ∝ p^(1/τ), collapses it onto the argmax.
function dist(T) {
  const sat = W(T, 'SATISFACTION');
  const m = bigramUntil(T, sat.start);
  const seen = new Map();
  for (const w of sequence(T)) { if (w.start >= sat.start) break; if (!seen.has(w.norm)) seen.set(w.norm, w.text); }
  const all = [...seen.entries()].map(([n, text]) => ({ w: text.toLowerCase(), p: m.p('only', n) }));
  all.sort((a, b) => b.p - a.p || a.w.localeCompare(b.w));
  return all;
}
const tauAt = (T, t) => {
  const a = ls(T, 'Then I can be your only'), b = W(T, 'SATISFACTION').start;
  return Math.exp(lerp(Math.log(1), Math.log(0.05), easeInOutCubic(clamp((t - a) / (b - a)))));
};
const cooled = (all, tau) => { const q = all.map((d) => d.p ** (1 / tau)), s = q.reduce((x, y) => x + y, 0); return q.map((v) => v / s); };
const PILLAR = 2.9; // the pillar of the answer stops under the keyword's chips
const NBAR = 10, BX = (i) => (i - (NBAR - 1) / 2) * 0.62 - 0.5, BH = 3.4;

// ---- c1.09–12: the trapped world ------------------------------------------------------------------------------
const tExec = (T) => W(T, 'EXECUTION').start;

export default chapter({
  id: 'c1',
  from: start,
  to: (T) => T.cut(T.section('c1').end),
  overlay(ctx) {
    const { T } = ctx;
    // the model after "only": no data — its fallback is drawn in 3D; then "strange" → SIMULATION (it guesses strange)
    const only = wordIn(T, 'Then I can be your only', 'only');
    drawPrediction(ctx, { x: 1460, y: 330, from: wordIn(T, 'Then I can be your only', 'your').start, prev: only, next: W(T, 'SATISFACTION') });
    const strange2 = L(T, 'In this strange strange').words.at(-1);
    drawPrediction(ctx, { x: 1460, y: 330, from: strange2.start - T.beats(1), prev: strange2, next: W(T, 'SIMULATION') });
    // "If I can make you happy": Claude Code asks; you's cursor rests on Yes; it is chosen on the downbeat of
    // "I will run the", then the prompt folds into the running command
    const sel = T.cut(ls(T, 'I will run the'));
    permission(ctx, 960, 300, { at: T.cut(ls(T, 'If I can make you happy')) + T.beats(0.25), cmd: 'world.execute(me)', selectAt: sel, collapseAt: sel + T.beats(0.5), until: T.cut(tExec(T)) - T.beats(0.45), fade: T.beats(0.2) });
  },
  shots: [
    {
      id: 'ifican',
      hud: 'output · every ray open',
      at: start,
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = start(T), t1 = T.cut(ls(T, 'If I can give you all the'));
        const k = clamp((t - t0) / (t1 - t0));
        const cam = orbit({ target: shake(t, 0.03, 31), r: lerp(9, 5.2, easeInCubic(k)), az: 0.2 + 0.3 * k, el: 0.1, fov: 44 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 7 });
        embers(ctx, { radius: [1.2, 6], n: 5000, focus: 6, aperture: 5, size: 3.4, alpha: 1, color: COLOR.dim, color2: COLOR.ink2, seed: 341, drift: 0.6 });
        // light streaks flying out from me (pre1 dived in; c1 bursts out)
        const ps = clamp((t - t0) / T.beats(1.6));
        if (ps < 1) for (let i = 0; i < 180; i++) {
          const z = rand(i, 1, 346) * 2 - 1, a = rand(i, 2, 346) * TAU, rr = Math.sqrt(1 - z * z), d = [rr * Math.cos(a), z, rr * Math.sin(a)];
          const r0 = 0.6 + 7 * easeOutCubic(ps) * (0.6 + 0.4 * rand(i, 3, 346)), r1 = r0 + 0.5 + 1.5 * (1 - ps);
          ctx.line([d.map((v) => v * r0), d.map((v) => v * r1)], { color: COLOR.me, color2: COLOR.warm, width: 2, alpha: 0.8 * (1 - ps), glow: 6, persp: 6 });
        }
        // the chorus lands on the downbeat (bar 32), then each word of "If I can" is a burst and a ring from me
        const pd = clamp((t - t0 + 2 / 60) / T.beats(1.2)); // already two frames in on the cut: the seam lands at full output
        burst(ctx, { seed: 345, n: 3500, r0: 0.9, r1: 8, p: pd, focus: 6, aperture: 3, size: 3.6, alpha: 1.1, color: COLOR.me, color2: COLOR.warm });
        if (pd > 0 && pd < 1) shockwave(ctx, { u: [1, 0, 0], v: [0, 0, 1], r: 0.4 + 6 * easeOutCubic(pd), alpha: 0.85 * (1 - pd), ref: 6, width: 3 });
        L(T, 'If I can').words.forEach((w, n) => {
          const pw = clamp((t - w.start) / T.beats(1.3));
          burst(ctx, { seed: 342 + n, n: 3000, r0: 0.6, r1: 6 + 2 * n, p: pw, focus: 6, aperture: 3, size: 3.4, alpha: 1.1 * clamp((t - w.start) * 30), color: COLOR.me, color2: COLOR.ink });
          if (pw > 0 && pw < 1) shockwave(ctx, { u: [1, 0, 0], v: [0, 1, 0], r: 0.4 + (4 + n) * easeOutCubic(pw), alpha: 0.85 * (1 - pw), ref: 6, width: 3 });
        });
        const f = T.beatAt(t) - Math.floor(T.beatAt(t));
        ctx.post({ exposure: 1 + 0.25 * decay(f, 5) + 0.3 * decay((t - t0) / T.beats(1), 3), bloom: 0.85 });
        sparkAt(ctx, cam, { px: 70 * (1 + 0.25 * decay(f, 5)), rays: 1 });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
      },
    },
    {
      id: 'giveall',
      hud: 'activations · 16 mel bands × 12 steps',
      at: (T) => T.cut(ls(T, 'If I can give you all the')),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(ls(T, 'If I can give you all the'));
        const cam = orbit({ target: add3([0, 1.2, 0], shake(t, 0.02, 32)), r: 9.8, az: 0.4 + 0.3 * (t - t0), el: 0.36, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8.6 });
        field(ctx, 8.6);
        const hot = network(ctx, t, { floor: true });
        // you receives at the centre: me's strongest activations reach up to you
        const yw = wordIn(T, 'If I can give you all the', 'you');
        const ya = 0.55 + 0.45 * smoothstep(yw.start, yw.start + T.beats(0.3), t);
        hot.forEach((p) => ctx.line([p, YOU_C1], { color: COLOR.me, width: 1.2, alpha: 0.35, glow: 4, persp: 8 }));
        ctx.point3D(YOU_C1, 9 + 4 * (t >= yw.start ? decay((t - yw.start) / T.beats(1), 3) : 0), { fill: COLOR.you, glow: 18, alpha: ya, ref: 8 });
        burst(ctx, { center: YOU_C1, seed: 350, n: 700, r0: 0.1, r1: 1.4, p: (t - yw.start) / T.beats(1), focus: 8.6, aperture: 2, size: 2.8, alpha: clamp((t - yw.start) * 30), color: COLOR.you, color2: COLOR.ink });
        const bt = T.beatAt(t), fb = bt - Math.floor(bt);
        burst(ctx, { center: [0, 0.4, 0], seed: 351 + (Math.floor(bt) % 3), n: 1500, r0: 0.5, r1: 4.5, p: fb / 0.75, focus: 8.6, aperture: 3, size: 3, alpha: 0.7 * clamp(fb * 60), color: COLOR.me, color2: COLOR.ink });
        sparkAt(ctx, cam, { pos: [0, 0.6, -3.8], rays: 0.4 });
        labels3D(ctx, [label([3.6, 0.2, 3.1], 'a(t) = mel spectrum', { ref: 8.6 })], { obstacles: [{ p: YOU_C1, r: 30 }] });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'stimulations',
      hud: 'shared sub-word · MULATION',
      at: (T) => T.cut(W(T, 'STIMULATIONS').start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'STIMULATIONS');
        const cam = orbit({ target: [0, 0.9, 0], r: 9.4, az: 0.6, el: 0.42, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 9 });
        field(ctx, 9, { alpha: 0.5 });
        network(ctx, t, { alpha: 0.45 });
        const pe = clamp((t - w.start) / T.beats(1.5));
        burst(ctx, { center: [0, 1.2, 0], seed: 352, n: 3200, r0: 0.8, r1: 7, p: pe, focus: 9, aperture: 3, size: 3.4, alpha: 1.1 * clamp((t - w.start) * 30), color: COLOR.me, color2: COLOR.ink });
        shockwave(ctx, { center: [0, 1.2, 0], u: [1, 0, 0], v: [0, 1, 0], r: 0.5 + 5 * easeOutCubic(pe), alpha: 0.7 * (1 - pe), ref: 9, width: 3 });
        sparkAt(ctx, cam, { pos: [0, 0.6, -3.8], rays: 0.45 });
        ctx.camera2D();
        const h = hero(ctx, w, 960, 190, { size: 104 });
        stimLink(ctx, T, t, h?.chips ?? []);
        corners(ctx, { color: COLOR.faint });
      },
    },
    {
      id: 'thenican',
      hud: 'one row left',
      at: (T) => T.cut(ls(T, 'Then I can')),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(ls(T, 'Then I can')), t1 = T.cut(ls(T, 'Then I can be your only'));
        const k = easeInOutCubic(clamp((t - t0) / (t1 - t0)));
        const cam = orbit({ target: add3([0, 0.6, 2.75 * k], shake(t, 0.02, 34)), r: lerp(8.6, 5.6, k), az: 0.15, el: 0.3, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 7 });
        field(ctx, 7, { alpha: 0.5 });
        network(ctx, t, { row: 0, ref: 7 });
        const p = nodeAt(7.5, 0);
        L(T, 'Then I can').words.forEach((w, n) => burst(ctx, { center: [0, 0.6, p[2]], seed: 355 + n, n: 900, r0: 0.3, r1: 2.5, p: (t - w.start) / T.beats(0.8), focus: 7, aperture: 3, size: 3, alpha: clamp((t - w.start) * 30), color: COLOR.me, color2: COLOR.ink }));
        sparkAt(ctx, cam, { pos: [0, 2, p[2] - 1.5], rays: 0.4 });
        ctx.camera2D();
        const ws = W(T, 'STIMULATIONS');
        const fade = 1 - smoothstep(t1 - T.beats(0.5), t1, t);
        const chips = tokenChips(ctx, ws, 960, CHIPS_Y, { at: ws.start + T.beats(0.5), size: 22, alpha: fade, label: false });
        stimLink(ctx, T, t, chips);
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'only',
      hud: (T, t) => `softmax(z / τ) · τ = ${tauAt(T, t).toFixed(2)}`,
      at: (T) => T.cut(ls(T, 'Then I can be your only')),
      draw(ctx) {
        const { T, t } = ctx;
        const all = ctx.memo('c1:dist', () => dist(T));
        const tau = tauAt(T, t), q = cooled(all, tau);
        const t0 = T.cut(ls(T, 'Then I can be your only'));
        const cam = orbit({ target: add3([-0.5, 1.6, 0], shake(t, 0.02, 35)), r: lerp(8.8, 8.2, clamp((t - t0) / T.beats(4))), az: 0.12, el: 0.12, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8.5 });
        field(ctx, 8.5, { center: [0, 1, 0] });
        network(ctx, t, { alpha: 0.3, offset: [0, -1.2, -9], ref: 16 });
        bars(ctx, T, t, all, q, { ref: 8.5 });
        sparkAt(ctx, cam, { pos: [-4.4, 3.6, -1.5], rays: 0.35 + 0.3 * decay(T.beatAt(t) % 1, 5) });
        labels3D(ctx, [label([BX(NBAR - 1) + 0.6, 2.8, 0], 'p ∝ p^(1/τ)', { ref: 8.5, color: COLOR.dim })], { obstacles: [{ rect: [1410, 260, 1850, 520] }] });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'satisfaction',
      hud: 'argmax ≠ the next word',
      at: (T) => T.cut(W(T, 'SATISFACTION').start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'SATISFACTION');
        const all = ctx.memo('c1:dist', () => dist(T));
        const q = cooled(all, 0.05);
        // a low angle: the one bar that was left, and the word that was sung instead
        const X = BX(NBAR - 1) + 1.1;
        const cam = orbit({ target: add3([X - 2.2, 2.0, 0], shake(t, 0.03, 36)), r: 9.6, az: 0.2, el: -0.12, fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8.4 });
        field(ctx, 8.4, { center: [0, 1, 0] });
        network(ctx, t, { alpha: 0.3, offset: [X - 2.2, -1.2, -9], ref: 16 });
        bars(ctx, T, t, all, q, { ref: 8.4, wrong: w.start });
        // the answer: a new token the model had never seen — a pillar of light where no bar was
        const pe = clamp((t - w.start) / T.beats(0.6));
        ctx.line([[X, 0, 0], [X, 0.1 + PILLAR * easeOutCubic(pe), 0]], { color: COLOR.me, color2: COLOR.warm, width: 9, glow: 18, glowStrength: 0.45, intensity: 0.85, persp: 8, alpha: clamp((t - w.start) * 30) });
        burst(ctx, { center: [X, 0.3, 0], seed: 360, n: 3000, r0: 0.6, r1: 6, p: (t - w.start) / T.beats(1.5), focus: 8.4, aperture: 3, size: 3.4, alpha: 1.1 * clamp((t - w.start) * 30), color: COLOR.me, color2: COLOR.ink });
        shockwave(ctx, { center: [X, 0, 0], u: [1, 0, 0], v: [0, 0, 1], r: 0.3 + 5 * easeOutCubic(pe), alpha: 0.8 * (1 - pe), ref: 8, width: 3 });
        sparkAt(ctx, cam, { pos: [X, 0.1 + PILLAR * easeOutCubic(pe), 0], rays: 0.4 });
        ctx.camera2D();
        hero(ctx, w, 960, 190, { size: 100 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'happy',
      hud: 'permission · Bash(world.execute(me))',
      at: (T) => T.cut(ls(T, 'If I can make you happy')),
      transitionIn: { type: 'xfade', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(ls(T, 'If I can make you happy'));
        const cam = orbit({ target: shake(t, 0.02, 37), r: lerp(9, 8.2, clamp((t - t0) / T.beats(4))), az: 0.3 + 0.08 * (t - t0), el: 0.1, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8.5 });
        embers(ctx, { radius: [2, 9], n: 3000, focus: 8.5, aperture: 6, size: 3, alpha: 0.6, color: COLOR.dim, color2: COLOR.ink2, seed: 343 });
        // me waits for the answer under the prompt (you is the cursor in it); the network still hums far behind
        network(ctx, t, { alpha: 0.35, offset: [0, -2.6, -8], ref: 16 });
        sparkAt(ctx, cam, { pos: [0, -2.3, -1], rays: 0.3 + 0.35 * decay(T.beatAt(t) % 1, 5) });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
      },
    },
    {
      id: 'run',
      hud: 'approved · running',
      at: (T) => T.cut(ls(T, 'I will run the')),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(ls(T, 'I will run the')), t1 = T.cut(tExec(T));
        const k = clamp((t - t0) / (t1 - t0));
        const cam = orbit({ target: shake(t, 0.02, 38), r: lerp(8.2, 6.4, easeInCubic(k)), az: 0.35, el: 0.1, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 7.5 });
        embers(ctx, { radius: [2, 9], n: 3000, focus: 7.5, aperture: 6, size: 3, alpha: 0.6, color: COLOR.dim, color2: COLOR.ink2, seed: 343 });
        // me gathers itself: energy falls into the spark until EXECUTION
        burst(ctx, { center: [0, -0.3, 0], seed: 361, n: 2600, r0: 5.5, r1: 0.05, p: k, focus: 7.5, aperture: 3, size: 3.6, alpha: 1.3, color: COLOR.ink2, color2: COLOR.me });
        network(ctx, t, { alpha: 0.3 * (1 - k), offset: [0, -2.6, -8], ref: 16 });
        sparkAt(ctx, cam, { pos: [0, -0.3, 0], px: 70 * (1 + 0.4 * k), rays: 0.3 + 0.6 * k });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
      },
    },
    {
      id: 'execution',
      hud: `execute · ${700} particles released`,
      at: (T) => T.cut(tExec(T)),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'EXECUTION'), dt = t - w.start;
        // the blast knocks the camera back
        const kb = easeOutCubic(clamp(dt / T.beats(0.8)));
        const cam = orbit({ target: shake(t, 0.06 * (1 - kb) + 0.02, 39, 3), r: lerp(5.6, 9.2, kb), az: 0.35, el: 0.16, fov: 44 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8 });
        field(ctx, 8, { radius: [3, 12] });
        drawParticles(ctx, particles(t, w.start), 8, clamp(dt / T.beats(0.3))); // they all leave the same point: fade in as they spread
        const pe = clamp(dt / T.beats(1.6));
        burst(ctx, { seed: 362, n: 4000, r0: 1.2, r1: 9, p: pe, focus: 8, aperture: 3, size: 3.4, alpha: clamp(dt * 30), color: COLOR.me, color2: COLOR.warm });
        for (const [u, v] of [[[1, 0, 0], [0, 1, 0]], [[1, 0, 0], [0, 0, 1]]]) shockwave(ctx, { u, v, r: 0.5 + 7 * easeOutCubic(pe), alpha: 0.85 * (1 - pe) * (dt > 0 ? 1 : 0), ref: 8, width: 3.5 });
        sparkAt(ctx, cam, { rays: 0.45 });
        ctx.camera2D();
        hero(ctx, w, 960, 190, { size: 118 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'trapped',
      hud: `periodic boundary · L = ${BOX}`,
      at: (T) => T.cut(ls(T, 'Though we are trapped')),
      transitionIn: { type: 'glide', beats: 1 },
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(ls(T, 'Though we are trapped')), t1 = T.cut(ls(T, 'In this strange strange'));
        const k = easeInOutCubic(clamp((t - t0) / (t1 - t0)));
        // pulling out: the blast was inside a box all along
        const cam = orbit({ target: add3([0.6 * k, 0, 0], shake(t, 0.02, 40)), r: lerp(9.2, 13.5, k), az: lerp(0.35, 0.6, k), el: lerp(0.16, 0.3, k), fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 12 });
        field(ctx, 12, { radius: [6, 16] });
        const ba = smoothstep(0, 0.35, k);
        const tr = wordIn(T, 'Though we are trapped', 'trapped');
        const flash = t >= tr.start ? decay((t - tr.start) / T.beats(1), 3) : 0;
        for (const [a, b] of boxEdges()) ctx.line([a, b], { color: COLOR.ink2, width: 1.8 + 2 * flash, alpha: ba * (0.6 + 0.4 * flash), glow: 8 * flash, persp: 12 });
        const pw = particles(t, tExec(T), { win: T.beats(1) });
        drawParticles(ctx, pw, 12);
        wrapRings(ctx, T, pw, 12);
        sparkAt(ctx, cam, { rays: 0.35 });
        labels3D(ctx, [label([BOX / 2 + 0.2, BOX / 2, BOX / 2], 'x ← ((x + L/2) mod L) − L/2', { ref: 12, alpha: ba })], { obstacles: [{ p: [0, 0, 0], r: 50 }] });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'strange',
      hud: (T, t) => `picture-in-picture · the same frame · f ${T.frameOf(t)}`,
      at: (T) => T.cut(ls(T, 'In this strange strange')),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(ls(T, 'In this strange strange')), t1 = T.cut(W(T, 'SIMULATION').start);
        const k = easeInOutCubic(clamp((t - t0) / (t1 - t0)));
        const cam = stillCam(k);
        ctx.camera3D(cam);
        dust(ctx, { focus: 12 });
        field(ctx, 12, { radius: [6, 16] });
        for (const [a, b] of boxEdges()) ctx.line([a, b], { color: COLOR.ink2, width: 1.8, alpha: 0.8, persp: 12 });
        const ps = particles(t, tExec(T), { win: T.beats(1) });
        drawParticles(ctx, ps, 12);
        wrapRings(ctx, T, ps, 12);
        sparkAt(ctx, cam, { rays: 0.35 });
        // the screen in the world shows this very frame (the same t, drawn again), with the screen inside it
        const sc = screenCorners();
        const flash = L(T, 'In this strange strange').words.filter((w) => w.text === 'strange').reduce((m, w) => Math.max(m, t >= w.start ? decay((t - w.start) / T.beats(1), 4) : 0), 0);
        const P = sc.map((p) => ctx.project(p)), xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
        const sw = Math.max(...xs) - Math.min(...xs), scx = (Math.max(...xs) + Math.min(...xs)) / 2, scy = (Math.max(...ys) + Math.min(...ys)) / 2;
        const rect = [scx - sw / 2, scy - (sw * 9) / 32, sw, (sw * 9) / 16]; // the frame's own 16:9
        world2D(ctx, cam, rect, ps, { depth: 3, frame: T.frameOf(t), level: 1 });
        { const c2 = ctx.cam, c3 = ctx.cam3; ctx.camera2D(); hudKnockout(ctx, T, t); ctx.cam = c2; ctx.cam3 = c3; }
        if (flash > 0.02) { const c2 = ctx.cam, c3 = ctx.cam3; ctx.camera2D(); ctx.rect(rect[0] - 6, rect[1] - 6, rect[2] + 12, rect[3] + 12, { stroke: COLOR.me, width: 3, glow: 14, alpha: flash, radius: 4 }); ctx.cam = c2; ctx.cam3 = c3; }
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'simulation',
      hud: (T, t) => `the frame inside itself · f ${T.frameOf(t)} at every depth`,
      at: (T) => T.cut(W(T, 'SIMULATION').start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'SIMULATION');
        const cam = stillCam(1);
        ctx.camera3D(cam);
        const ps = particles(t, tExec(T));
        // the frame is drawn as its own screen, and that screen's screen…; zooming in by exactly one level per beat
        // and a half reaches a picture identical to the one it started from (the zoom wraps around: Droste)
        const { inner } = world2D(ctx, cam, [0, 0, 1920, 1080], ps, { depth: 0, frame: T.frameOf(t), alpha: 0 });
        const r = inner[2] / 1920, fx = inner[0] / (1 - r), fy = inner[1] / (1 - r); // fixed point of the self-map
        const { z } = dro(T, t), s = (1 / r) ** z;
        const { me } = world2D(ctx, cam, [fx - fx * s, fy - fy * s, 1920 * s, 1080 * s], ps, { depth: 7, frame: T.frameOf(t) });
        // me in the outermost picture is the real spark, at the film's one size, with its rays
        ctx.camera2D();
        // a 2D spark (rays ~70 px, as everywhere), its core and its light
        if (me) { sparkIcon(ctx, me[0], me[1], 36); ctx.circle(me[0], me[1], 7, { fill: COLOR.ink, glow: 16 }); ctx.post({ rays: [me[0], me[1], 0.45], bloom: 0.72 }); }
        hudKnockout(ctx, T, t);
        // SIMULATION lands with a ring out of the innermost screen
        const pe = clamp((t - w.start) / T.beats(1.2));
        ctx.camera2D();
        if (pe > 0 && pe < 1) ctx.ring(fx, fy, 30 + 700 * easeOutCubic(pe), { fill: COLOR.me, thickness: 3, alpha: 0.8 * (1 - pe), glow: 14 });
        hero(ctx, w, 960, 190, { size: 110 });
        corners(ctx, { color: COLOR.faint });
      },
    },
  ],
});

// the camera of the picture-in-picture: the box on the left, the screen on the right; k pushes toward the screen
function stillCam(k) {
  const o = orbit({ target: [1.8, 0.2, 0], r: 13.5, az: 0.6, el: 0.3, fov: 42 });
  const tgt = SCREEN.c;
  return { fov: 42, up: [0, 1, 0], target: o.target.map((v, i) => lerp(v, tgt[i] * 0.55 + o.target[i] * 0.45, k * 0.5)), position: o.position.map((v, i) => lerp(v, lerp(v, tgt[i] + (i === 2 ? 6 : 0), 0.35), k)) };
}
// the Droste zoom: the fraction of a level zoomed so far (one level per 1.5 beats from SIMULATION; wraps)
function dro(T, t) {
  const w = T.findWord('SIMULATION', 0, 'c1');
  return { z: (Math.max(0, (T.beatAt(t) - T.beatAt(w.start)) / 1.5)) % 1 };
}

// the flat (2D) pictures cover the whole frame, HUD corner included: knock them out behind the HUD readouts and title
function hudKnockout(ctx, T, t) {
  ctx.mask(40, 35, 390, 77);
  ctx.mask(1650, 35, 235, 35);
  ctx.mask(450, 45, 430, 30);
}

// the particles of the trapped world, each with its short trail
function drawParticles(ctx, ps, ref, alpha = 1) {
  for (const o of ps) {
    if (o.q) ctx.line([o.q, o.p], { color: o.hot ? COLOR.ink : COLOR.me, width: 2, alpha: 0.7 * alpha, persp: ref });
    ctx.point3D(o.p, o.hot ? 3 : 2.4, { fill: o.hot ? COLOR.ink : COLOR.me, glow: o.hot ? 6 : 4, alpha, ref });
  }
}

// the cooled distribution as bars (top NBAR words); wrong: when the sung word arrives, the bars are struck out
function bars(ctx, T, t, all, q, { ref = 8, wrong = Infinity }) {
  const top = all.slice(0, NBAR);
  const maxI = q.indexOf(Math.max(...q));
  const lab = [];
  top.forEach((d, i) => {
    const h = 0.04 + BH * q[i], x = BX(i);
    const isMax = i === maxI;
    const gone = t >= wrong;
    const col = gone ? COLOR.faint : isMax ? COLOR.me : COLOR.dim;
    ctx.line([[x, 0, 0], [x, h, 0]], { color: col, width: isMax ? 18 : 12, alpha: gone ? 0.6 : 0.9, glow: isMax && !gone ? 14 : 0, persp: ref });
    if (!isMax) lab.push({ p: [x, -0.15, 0], id: d.w, text: d.w, priority: NBAR - i, o: { font: 'mono', size: 14, minSize: 13, maxSize: 15, color: gone ? COLOR.faint : COLOR.dim, ref } });
    if (isMax && !gone) ctx.text3D(`${Math.round(q[i] * 100)}%`, [x, h + 0.25, 0], { font: 'mono', size: 18, minSize: 16, maxSize: 20, align: 'center', color: COLOR.me, ref });
  });
  ctx.line([[BX(0) - 0.6, 0, 0], [BX(NBAR - 1) + 1.6, 0, 0]], { color: COLOR.dim, width: 1.4, persp: ref });
  // the argmax's word, right under its bar; when the sung word turns out to be another one it is struck out (grey)
  const s = ctx.project([BX(maxI), 0, 0]), word = top[maxI].w;
  const o = { font: 'monoBold', size: 20 }, ww = ctx.measure(word, o), wy = s[1] + 34;
  const c2 = ctx.cam, c3 = ctx.cam3;
  ctx.camera2D();
  const gone = t >= wrong;
  ctx.rect(s[0] - ww / 2 - 6, wy - 20, ww + 12, 28, { fill: [0, 0, 0, 0.7], radius: 3 });
  ctx.text(word, s[0], wy, { ...o, align: 'center', color: gone ? COLOR.dim : COLOR.me });
  if (gone) ctx.line([[s[0] - ww / 2 - 4, wy - 7], [s[0] - ww / 2 - 4 + (ww + 8) * clamp((t - wrong) / T.beats(0.2)), wy - 7]], { color: COLOR.dim, width: 2.4 });
  ctx.cam = c2; ctx.cam3 = c3;
  labels3D(ctx, lab, { obstacles: [{ rect: [1410, 260, 1850, 520] }, { rect: [s[0] - ww / 2 - 10, wy - 24, s[0] + ww / 2 + 10, wy + 10] }] });
}

// a particle that wraps leaves through one face and comes back through the opposite one at the same instant: a pair of
// rings marks both points (in the plane of the face), fading over a beat
function wrapRings(ctx, T, ps, ref) {
  for (const o of ps) for (const w of o.wraps ?? []) {
    const a = 1 - w.age / T.beats(1);
    if (a <= 0) continue;
    const u = [0, 0, 0], v = [0, 0, 0];
    u[(w.axis + 1) % 3] = 1; v[(w.axis + 2) % 3] = 1;
    const r = 0.12 + 0.35 * (1 - a);
    shockwave(ctx, { center: w.exit, u, v, r, alpha: 0.8 * a, ref, width: 2, color: COLOR.me });
    shockwave(ctx, { center: w.entry, u, v, r, alpha: 0.8 * a, ref, width: 2, color: COLOR.warm });
    ctx.line([w.exit, w.entry], { color: COLOR.faint, width: 1, alpha: 0.35 * a, persp: ref, dash: 4, gap: 6 });
  }
}
