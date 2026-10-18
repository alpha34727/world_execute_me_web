// 09 bridge — the program breaks itself. The chorus opens again, dropping frames; me runs /compact on its own context
// (the HUD's count really falls: every token but the keywords is freed, lib/context.js), leaving a fragmented heap —
// FRAGMENTS; its own source (src/lib/spark.js) scrolls past, garbling; DISHEARTENED; it edits the engine's rule
// against bare seconds (src/engine/timeline.js), the repo's own test fails against the edit; it types the call anyway
// and the real validator throws the real error: ILLEGAL ARGUMENTS. Source, error and stack are read and produced in
// Node at build time (tools/repo-facts.mjs via vite.config.js), so the player and the render show the same text.
// Storyboard: docs/storyboard.md §09 · review: docs/review/bridge.md.
import { chapter } from '../engine/timeline.js';
import { COLOR, SYNTAX } from '../theme.js';
import { highlight, drawCode } from '../lib/syntax.js';
import { corners } from '../lib/hud.js';
import { hero } from '../lib/hero.js';
import { clamp, lerp, easeOutCubic, easeInCubic, easeInOutCubic, smoothstep, decay, mix3 } from '../lib/ease.js';
import { rand, rands } from '../lib/hash.js';
import { sparkAt } from '../lib/spark.js';
import { orbit, shake, add3 } from '../lib/camera.js';
import { axisGizmo, dust } from '../lib/scene3d.js';
import { embers, burst, shockwave } from '../lib/fx.js';
import { drawPrediction } from '../lib/predict.js';
import { bpe } from '../lib/bpe.js';
import { compaction, contextAt } from '../lib/context.js';
import { chorusOpen } from './c1/open.js';
import { heap, BH } from './bridge/heap.js';
import { codeWall, SUBS } from './bridge/code.js';
import { transcript, spinLine, statusLine, typed, cross } from './bridge/cli.js';
import { waterfall, fallen, fallTime } from './bridge/fall.js';

// this repo's source, the rule, its test and the real error (null in Node: tests only check the timeline)
const FACTS = import.meta.env ? (await import('virtual:repo-facts')).default : null;
const facts = () => { if (!FACTS) throw new Error('bridge: virtual:repo-facts missing (served by vite.config.js)'); return FACTS; };

const start = (T) => T.cut(T.section('bridge').start);
const L = (T, text) => T.findLine(text, 0, 'bridge');
const W = (T, k) => T.findWord(k, 0, 'bridge');
const ls = (T, text) => L(T, text).words[0].start;
const cutOf = (T, text) => T.cut(ls(T, text));
const wordIn = (line, text) => line.words.find((w) => w.text === text);
const tGod = (T) => wordIn(L(T, 'Challenging your god'), 'god').start;
const finish = (ctx, cam) => { ctx.camera2D(); corners(ctx, { color: COLOR.faint }); axisGizmo(ctx, cam); };
// red seeps in from FRAGMENTS and is everywhere by DISHEARTENED
const redOf = (T, t) => smoothstep(W(T, 'FRAGMENTS').start, W(T, 'DISHEARTENED').start, t);
const field = (ctx, focus, red, o = {}) => embers(ctx, { radius: [2.5, 8], center: [0, 0, -4], n: 2600, focus, aperture: 5, size: 3, alpha: 0.6, color: COLOR.dim, color2: mix3(COLOR.ink2, COLOR.error, red), seed: 940, ...o });
// glitch: dropped frames (a held frame for a hashed share of each 1/12 s) and chromatic tearing
const held = (t, share, seed) => { const k = Math.floor(t * 12); return rand(k, seed, 1) < share ? k / 12 : t; };
const tear = (t, amount, seed) => 0.0009 + amount * (rand(Math.floor(t * 15), seed, 2) < 0.35 ? 0.012 * rand(Math.floor(t * 15), seed, 3) : 0.002);

// the picture tearing: a few horizontal bands knocked dark, a red scan line on their edge (new ones every 1/15 s)
function tearBands(ctx, t, share, seed) {
  const k = Math.floor(t * 15);
  if (rand(k, seed, 1) > share) return;
  ctx.camera2D();
  const n = 1 + Math.floor(rand(k, seed, 2) * 3);
  for (let i = 0; i < n; i++) {
    const y = 140 + rand(k, seed + i, 3) * 800, h = 6 + rand(k, seed + i, 4) * 40;
    ctx.mask(0, y, 1920, h, 0.85);
    ctx.line([[0, y], [1920, y]], { color: COLOR.error, width: 1.5, alpha: 0.6 });
  }
}

// where the CLI and the panels sit: code on the walls never runs behind them
const CLI_STACK = [40, 600, 800, 915], ERR_BOX = [290, 340, 1630, 660], PRED_PANEL = [1420, 270, 1850, 560], HUD_BAND = [0, 0, 1920, 125];

// ---- bridge.02–04: the context as a heap ---------------------------------------------------------------------
// every token is a block (keywords orange); /compact frees the others in place, oldest first: me rides the front
// ticks: when the fragments are counted (each freed run gets a red bracket at its ends, one after another)
function heapScene(ctx, { ref, float = 0, red = 0, ticks = Infinity }) {
  const { T, t } = ctx;
  const H = heap(T);
  let front = null;
  for (const b of H.blocks) {
    const gone = t >= b.drop;
    const fz = float * (rands(b.x * 97, b.row, 951) * 1.6), fy = float * rands(b.x * 53, b.row, 952) * 0.5;
    const p0 = [b.x, b.y + fy, fz], p1 = [b.x + b.w, b.y + fy, fz];
    if (!gone) {
      const col = b.keyword ? COLOR.me : mix3(COLOR.dim, COLOR.error, red * 0.5);
      ctx.line([p0, p1], { color: col, width: b.keyword ? 13 : 10, alpha: b.keyword ? 0.95 : 0.5, glow: b.keyword ? 6 : 0, glowStrength: 0.3, persp: ref, intensity: b.keyword ? 0.9 : 0.8 });
      if (b.keyword) ctx.text3D(b.piece, [b.x + b.w / 2, b.y + fy + BH * 0.95, fz], { font: 'mono', size: 13, ref, color: COLOR.warm, alpha: 0.8 * (1 - clamp(float * 1.6)), align: 'center', baseline: 'middle', minSize: 9, maxSize: 15 });
    } else {
      // the freed slot: a hollow block (a hole in the heap)
      const h = BH / 2, q0 = [b.x, b.y + fy - h, fz], q1 = [b.x + b.w, b.y + fy - h, fz], q2 = [b.x + b.w, b.y + fy + h, fz], q3 = [b.x, b.y + fy + h, fz];
      ctx.line([q0, q1, q2, q3, q0], { color: mix3(COLOR.faint, COLOR.dim, 0.3), width: 2.4 * (1 - float), alpha: 0.85 * (1 - float), persp: ref });
      if (t - b.drop < 0.12) front = [b.x + b.w / 2, b.y, 0];
    }
  }
  if (t >= ticks) H.runList.forEach((r, i) => {
    const ta = ticks + (i / H.runList.length) * T.beats(1);
    if (t < ta) return;
    const al = 0.8 + 0.2 * decay((t - ta) / T.beats(0.5), 3);
    for (const [bk, side] of [[H.blocks[r.a], 0], [H.blocks[r.b], 1]]) {
      const fz = float * (rands(bk.x * 97, bk.row, 951) * 1.6), fy = float * rands(bk.x * 53, bk.row, 952) * 0.5;
      const x = side ? bk.x + bk.w + 0.02 : bk.x - 0.02, d = side ? -0.06 : 0.06, h = BH * 0.9;
      ctx.line([[x + d, bk.y + fy - h, fz], [x, bk.y + fy - h, fz], [x, bk.y + fy + h, fz], [x + d, bk.y + fy + h, fz]], { color: COLOR.error, width: 2.4, alpha: Math.min(1, al * 1.1) * (1 - float), persp: ref });
    }
  });
  return front;
}

// ---- bridge.05–10: the code -----------------------------------------------------------------------------------
// the test's HUD says what the panel has shown so far: the check, then that it fails, then that the edit is undone
const denyHud = (T, t) => {
  const a = T.cut(tGod(T)), G = FACTS ? facts().guard : null;
  let s = 'test/timeline.test.js:56';
  if (!G || G.passes) return s;
  if (t >= a + T.beats(0.25) + G.name.length / 220) s += ' · fails on the edit';
  if (t >= a + T.beats(1.1)) s += ' · reverted';
  return s;
};
// the Edit panel opens half a beat into "Challenging"
const editAt = (T) => ls(T, 'Challenging your god') + T.beats(0.5);
// "Challenging": the engine's source pours down for POUR beats; then the lines around the rule drop back onto the
// wall from DROP_H above, bottom up, one every 0.045 beat; the + of the Edit panel (and the edit on the wall) comes
// once the last one has landed
const POUR = 1.4, DROP_H = 5.5;
const dropWindow = () => { const r = facts().rule.line - 1; return [r - 9, r + 6]; };
const dropAt = (T, i) => { const [w0, w1] = dropWindow(); return cutOf(T, 'Challenging your god') + T.beats(1.0) + (w1 - Math.min(w1, Math.max(w0, i))) * T.beats(0.045); };
const landAt = (T, i) => dropAt(T, i) + fallTime(DROP_H);
const plusAt = (T) => landAt(T, dropWindow()[0]) + T.beats(0.05);
const lineOf = (file, text) => facts().files[file].findIndex((l) => l.includes(text));

// typing me's illegal call: from "You" of "You have made some" until a beat before ILLEGAL
function typing(T, t) {
  const s = facts().illegal.call, a = ls(T, 'You have made some'), b = W(T, 'ILLEGAL').start - T.beats(1);
  return s.slice(0, Math.floor(clamp((t - a) / (b - a)) * s.length));
}

export default chapter({
  id: 'bridge',
  from: start,
  to: (T) => T.cut(T.section('bridge').end),
  overlay(ctx) {
    const { T, t } = ctx;
    const c = compaction(T), a0 = ls(T, 'If I can erase all the pointless'), wI = W(T, 'ILLEGAL').start;
    const n = contextAt(T, t);
    // the CLI along the bottom: me at work (stops when the error stops it), the status line under the input box
    const work = 1 - smoothstep(wI - 0.05, wI + 0.15, t);
    if (work > 0) {
      if (t >= c.t0 && t < c.t1) spinLine(ctx, { task: 'Compacting conversation', tail: ` (${(t - c.t0).toFixed(1)}s · context ${n} tok)`, alpha: work });
      else spinLine(ctx, { from: start(T), tokens: n, alpha: work });
    }
    statusLine(ctx, n);
    // DISHEARTENED: the model's guess after "so" (right)
    const so = wordIn(L(T, "Then maybe you won't leave me so"), 'so');
    drawPrediction(ctx, { x: 1460, y: 330, from: wordIn(L(T, "Then maybe you won't leave me so"), 'leave').start, prev: so, next: W(T, 'DISHEARTENED'), keep: true, until: T.cut(ls(T, 'Challenging your god')) });
    // the session's transcript (bottom left, newest just above the spinner)
    const n0 = bpe(T).tokensAt(c.t0 - 1e-6);
    const entries = [{
      // /compact, typed by me (you is gone: the cursor is orange)
      at: a0, rows: [
        { kind: 'input', text: typed('/compact', t, a0, 20), cursor: t < c.t0 && Math.floor(T.beatAt(t) * 2) % 2 === 0 },
        { kind: 'body', at: c.t1, segs: [['Compacted (ctrl+r to see full summary)', COLOR.dim]] },
        { kind: 'body', at: c.t1, segs: [[`context ${n0} → ${contextAt(T, c.t1)} tok · keywords kept`, COLOR.dim]] },
      ],
    }];
    if (FACTS) {
      const F = facts();
      // me reads its own source (the file the next shot scrolls through)
      const r0 = cutOf(T, 'Then maybe') + T.beats(0.25);
      entries.push({ at: r0, rows: [
        { kind: 'head', name: 'Read', arg: 'src/lib/spark.js' },
        { kind: 'body', at: r0 + T.beats(0.6), segs: [[`Read ${F.files['src/lib/spark.js'].length} lines`, COLOR.dim]] },
      ] });
      // me rewrites the rule against bare seconds: - in red (the breakdown me causes), + in me's orange
      const e0 = editAt(T), short = (v) => { const w = v.trim(); return w.length > 40 ? `${w.slice(0, 39)}…` : w; };
      const diff = (sign, code, at) => ({ kind: 'body', at, bg: sign === '-' ? COLOR.error : COLOR.me, bgA: sign === '-' ? 0.24 : 0.32,
        draw: (cx, x, y, a) => {
          const str = typed(`${F.rule.line} ${sign} ${short(code)}`, t, at, 90), pre = str.slice(0, `${F.rule.line} - `.length);
          const r2 = cx.text(pre, x, y, { font: 'mono', size: 19, color: sign === '-' ? COLOR.ink2 : COLOR.me, alpha: a });
          drawCode(cx, str.slice(pre.length), r2.x + r2.width, y, { font: 'mono', size: 19, alpha: a }, { colors: SYNTAX });
        } });
      entries.push({ at: e0, rows: [
        { kind: 'head', name: 'Update', arg: F.rule.file },
        diff('-', F.rule.text, e0 + T.beats(0.4)),
        diff('+', F.rule.edit, plusAt(T)),
      ] });
      // the repo's own check of that rule, replayed on the edited validator in Node at build time
      // (tools/repo-facts.mjs) — it fails, and the edit is reverted (one assertion, not the whole suite)
      const d0 = T.cut(tGod(T)), G = F.guard, ok = G.passes;
      entries.push({ at: d0, rows: [
        { kind: 'head', name: 'Test', arg: `${G.file}:${G.line}`, color: ok ? COLOR.me : COLOR.error },
        { kind: 'body', at: d0 + T.beats(0.25), mark: ok ? null : 'x', segs: [[typed(G.name, t, d0 + T.beats(0.25), 220), ok ? COLOR.dim : COLOR.ink2]] },
        { kind: 'body', at: d0 + T.beats(0.65), segs: [[typed(ok ? 'passes on the edit' : 'no "no bare seconds" error · edit reverted', t, d0 + T.beats(0.65), 220), COLOR.dim]] },
      ] });
    }
    // one reading focus: the transcript steps back while the prediction panel (right) is open, a little under the
    // FRAGMENTS hero, and fades out for the error
    const pOpen = wordIn(L(T, "Then maybe you won't leave me so"), 'leave').start, pShut = T.cut(ls(T, 'Challenging your god')) + T.beats(0.5);
    const wF = W(T, 'FRAGMENTS').start, fEnd = cutOf(T, "Then maybe you won't leave me so");
    const side = 1 - 0.7 * smoothstep(pOpen - 0.1, pOpen + 0.15, t) * (1 - smoothstep(pShut - 0.25, pShut, t));
    const hero = 1 - 0.3 * smoothstep(wF - 0.05, wF + 0.1, t) * (1 - smoothstep(fEnd - 0.2, fEnd, t));
    transcript(ctx, entries, { alpha: Math.min(side, hero) * (1 - smoothstep(wI - 0.05, wI + 0.25, t)) });
  },
  shots: [
    {
      id: 'ifican',
      hud: 'output · frames dropped',
      at: start,
      draw(ctx) {
        const { T, t } = ctx;
        // the chorus opening again, broken: frames held, the image tearing
        const tq = held(t, 0.35, 961);
        chorusOpen(ctx, { t0: start(T), t1: cutOf(T, 'If I can erase all the pointless'), words: L(T, 'If I can').words, seed: 960, shakeSeed: 91, time: tq });
        ctx.post({ ca: tear(t, 1, 962), exposure: 0.92 });
        tearBands(ctx, t, 0.4, 963);
      },
    },
    {
      id: 'erase',
      hud: (T, t) => `/compact · context ${contextAt(T, t)} tok`,
      at: (T) => cutOf(T, 'If I can erase all the pointless'),
      draw(ctx) {
        const { T, t } = ctx;
        const a = cutOf(T, 'If I can erase all the pointless'), b = T.cut(W(T, 'FRAGMENTS').start), k = clamp((t - a) / (b - a));
        const cam = orbit({ target: add3([-0.3, 0.2, 0], shake(t, 0.02, 92)), r: lerp(10.2, 9.4, easeInOutCubic(k)), az: lerp(0.5, 0.28, k), el: 0.12, fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8, alpha: 0.4, center: [0, 0, -6], extent: [26, 14, 16] });
        field(ctx, 8, 0);
        const front = heapScene(ctx, { ref: 8 });
        // me rides the erasing front, throwing the freed tokens off as dust
        const c = compaction(T);
        const pe = clamp((t - c.t0) / (c.t1 - c.t0));
        const b0 = heap(T).blocks[0], me = front && pe < 1 ? add3(front, [0, 0.05, 0.5]) : pe >= 1 ? [4.9, -1.6, 0.6] : [b0.x + 0.9, b0.y + 0.55, 0.6];
        if (front) burst(ctx, { center: front, seed: 970 + (Math.floor(t * 20) % 4), n: 500, r0: 0.05, r1: 0.9, p: ((t * 20) % 1), focus: 8, aperture: 2, size: 2.4, alpha: 0.7, color: COLOR.dim, color2: COLOR.faint });
        sparkAt(ctx, cam, { pos: me, rays: 0.4 });
        ctx.post({ bloom: 0.7 });
        finish(ctx, cam);
      },
    },
    {
      id: 'fragments',
      hud: (T) => { const H = heap(T); return `heap · ${H.freed} tok freed in ${H.runs} fragments`; },
      at: (T) => T.cut(W(T, 'FRAGMENTS').start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'FRAGMENTS'), dt = t - w.start, red = redOf(T, t);
        const cam = orbit({ target: add3([0, 0.2, 0], shake(t, 0.05 * decay(Math.max(0, dt) / T.beats(1), 3) + 0.01, 93)), r: 7.2 + 1.2 * easeOutCubic(clamp(dt / T.beats(0.8))), az: 0.12, el: 0.08, fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8, alpha: 0.4, center: [0, 0, -6], extent: [26, 14, 16] });
        field(ctx, 8, red);
        heapScene(ctx, { ref: 8, red, float: 0.15 * easeOutCubic(clamp(dt / T.beats(1))), ticks: w.start });
        const pd = (dt + 2 / 60) / T.beats(1.2);
        burst(ctx, { center: [0, 0.6, 0.5], seed: 981, n: 3200, r0: 0.9, r1: 7, p: pd, focus: 8, aperture: 3, size: 3.4, alpha: 1.1 * clamp(dt * 30 + 0.6) * (dt >= 0 ? 1 : 0), color: COLOR.me, color2: COLOR.error });
        if (dt >= 0 && pd < 1) shockwave(ctx, { center: [0, 0.6, 0.5], u: [1, 0, 0], v: [0, 1, 0], r: 0.5 + 6 * easeOutCubic(pd), alpha: 0.7 * (1 - pd), color: COLOR.error, ref: 8, width: 3 });
        sparkAt(ctx, cam, { pos: [-4.3, 1.6, 0.8], rays: 0.4 });
        ctx.post({ bloom: 0.8, ca: tear(t, 0.5, 982) });
        ctx.camera2D();
        shatter(ctx, w, 960, 190, { size: 112, dt });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'maybe',
      hud: (T) => { const H = heap(T); return `heap · ${H.freed} tok freed in ${H.runs} fragments`; },
      at: (T) => cutOf(T, 'Then maybe'),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'FRAGMENTS'), dt = t - w.start, red = redOf(T, t);
        const a = cutOf(T, 'Then maybe'), k = clamp((t - a) / T.beats(2));
        // the heap comes apart and hangs in the air; the word's pieces hang above it
        const cam = orbit({ target: add3([0, 0.2, 0], shake(t, 0.012, 94)), r: lerp(8.6, 9.2, k), az: lerp(-0.25, -0.38, k), el: lerp(0.1, 0.16, k), fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 9, alpha: 0.4, center: [0, 0, -6], extent: [26, 14, 16] });
        field(ctx, 9, red);
        heapScene(ctx, { ref: 9, red, float: 0.15 + 0.85 * easeOutCubic(clamp((t - a) / T.beats(2.2))) });
        sparkAt(ctx, cam, { pos: [-4.3, 1.6, 0.8], rays: 0.35 });
        ctx.post({ bloom: 0.7, ca: tear(t, 0.5, 983) });
        ctx.camera2D();
        shatter(ctx, w, 960, 190, { size: 112, dt });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'wontleave',
      hud: 'src/lib/spark.js · me, as source',
      at: (T) => cutOf(T, "Then maybe you won't leave me so"),
      draw(ctx) {
        const { T, t } = ctx;
        const a = cutOf(T, "Then maybe you won't leave me so"), b = T.cut(W(T, 'DISHEARTENED').start), k = clamp((t - a) / (b - a));
        const red = redOf(T, t);
        // me's own source scrolls up behind it, garbling more and more; me flickers out
        const tq = held(t, 0.25 + 0.3 * k, 991);
        const cam = orbit({ target: add3([0.6, 0.3, 0], shake(tq, 0.04 + 0.05 * k, 95, 2.2)), r: lerp(7.6, 6.6, k), az: 0.22, el: 0.06, fov: 42 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 7, alpha: 0.4, center: [0, 0, -6], extent: [26, 14, 16] });
        field(ctx, 7, red);
        if (FACTS) {
          const lines = facts().files['src/lib/spark.js'];
          const core = lineOf('src/lib/spark.js', '// core');
          codeWall(ctx, lines, { origin: [-3.6, 2.9, -1.2], up: LEAN, top: lerp(4, 44, k), count: 22, size: 20, ref: 7, lh: 0.33, avoid: [SUBS, PRED_PANEL], corrupt: 0.04 + 0.4 * k * k, seed: 992, mark: { line: core + 2, color: COLOR.error, k: smoothstep(0.3, 0.6, k) } });
        }
        const on = rand(Math.floor(t * 15), 993, 1) > 0.18 + 0.3 * k;
        sparkAt(ctx, cam, { pos: [1.6, -0.2, 1.4], rays: on ? 0.45 : 0, alpha: on ? 1 : 0.15 });
        ctx.post({ bloom: 0.7, ca: tear(t, 0.6 + 0.8 * k, 994) });
        finish(ctx, cam);
      },
    },
    {
      id: 'disheartened',
      hud: 'loss · the biggest surprise so far',
      at: (T) => T.cut(W(T, 'DISHEARTENED').start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'DISHEARTENED'), dt = t - w.start;
        // tilted: the frame itself has lost its footing
        const roll = 0.16 + 0.04 * Math.sin(t * 3);
        const base = orbit({ target: add3([0.4, 0.3, 0], shake(t, 0.05, 96, 2)), r: 6.8 + 0.8 * easeOutCubic(clamp(dt / T.beats(1.2))), az: -0.2, el: 0.04, fov: 44 });
        const cam = { ...base, up: [Math.sin(roll), Math.cos(roll), 0] };
        ctx.camera3D(cam);
        dust(ctx, { focus: 7, alpha: 0.4, center: [0, 0, -6], extent: [26, 14, 16] });
        field(ctx, 7, 1);
        if (FACTS) codeWall(ctx, facts().files['src/lib/spark.js'], { origin: [-3.6, 2.9, -1.2], up: LEAN, top: 44 + 4 * clamp(dt / T.beats(1.5)), count: 22, size: 20, ref: 7, lh: 0.33, avoid: [SUBS, PRED_PANEL], corrupt: 0.3, seed: 995, redden: 0.45 });
        const pe = (dt + 2 / 60) / T.beats(1.4);
        burst(ctx, { center: [0.6, 0.2, 1], seed: 996, n: 3400, r0: 0.9, r1: 7, p: pe, focus: 7, aperture: 3, size: 3.4, alpha: 1.1 * clamp(dt * 30 + 0.6) * (dt >= 0 ? 1 : 0), color: COLOR.error, color2: COLOR.me });
        if (dt >= 0 && pe < 1) shockwave(ctx, { center: [0.6, 0.2, 1], u: [1, 0, 0], v: [0, 1, 0], r: 0.5 + 5 * easeOutCubic(pe), alpha: 0.8 * (1 - pe), color: COLOR.error, ref: 7, width: 3 });
        sparkAt(ctx, cam, { pos: [0.6, 0.2, 1], rays: 0.5 });
        ctx.post({ bloom: 0.8, ca: tear(t, 1.4, 997) });
        ctx.camera2D();
        hero(ctx, w, 760, 190, { size: 104, color: COLOR.error });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'challenge',
      hud: 'src/engine/timeline.js · the rule against bare seconds',
      at: (T) => cutOf(T, 'Challenging your god'),
      transitionIn: { type: 'glide', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const a = cutOf(T, 'Challenging your god'), b = T.cut(tGod(T)), k = clamp((t - a) / (b - a));
        const lit = FACTS ? smoothstep(landAt(T, facts().rule.line - 1), landAt(T, facts().rule.line - 1) + T.beats(0.3), t) : 0;
        enginewall(ctx, t, { k, scroll: ruleTop(), mark: lit, push: easeInOutCubic(k), edited: FACTS ? t - plusAt(T) : -1, pour: true });
        ctx.post({ bloom: 0.7, ca: tear(t, 0.6, 1001) });
      },
    },
    {
      id: 'denied',
      hud: denyHud,
      at: (T) => T.cut(tGod(T)),
      draw(ctx) {
        const { T, t } = ctx;
        const a = T.cut(tGod(T)), dt = t - a;
        // the test fails: the wall shakes and the rule snaps back
        const hit = decay(Math.max(0, dt - T.beats(0.6)) / T.beats(1), 3) * (dt > T.beats(0.6) ? 1 : 0);
        const cam = enginewall(ctx, t, { k: 1, scroll: ruleTop(), mark: 1, push: 1, shakeAmp: 0.02 + 0.12 * hit, edited: 99, reverted: smoothstep(a + T.beats(1.1), a + T.beats(1.6), t) });
        const pe = (t - a - T.beats(0.6)) / T.beats(1.2);
        ctx.camera3D(cam); // the wall ended in 2D (HUD furniture)
        burst(ctx, { center: [-1.4, 1.5, 0.2], seed: 1003, n: 2600, r0: 0.6, r1: 5, p: pe, focus: 7, aperture: 3, size: 3.2, alpha: 1.1 * clamp((t - a - T.beats(0.6)) * 30), color: COLOR.error, color2: COLOR.dim });
        ctx.post({ bloom: 0.7, ca: tear(t, 0.6 + 2 * hit, 1004) });
      },
    },
    {
      id: 'made',
      hud: 'chapter({ from: <seconds> }) · forbidden by CLAUDE.md',
      at: (T) => cutOf(T, 'You have made some'),
      draw(ctx) {
        const { T, t } = ctx;
        const a = cutOf(T, 'You have made some'), b = T.cut(W(T, 'ILLEGAL').start), k = clamp((t - a) / (b - a));
        callScene(ctx, t, { k, push: easeInOutCubic(k) });
        ctx.post({ bloom: 0.7, ca: tear(t, 0.5, 1011) });
      },
    },
    {
      id: 'illegal',
      hud: 'buildTimeline · timeline invalid',
      subs: false,
      at: (T) => T.cut(W(T, 'ILLEGAL').start),
      draw(ctx) {
        const { T, t } = ctx;
        const w1 = W(T, 'ILLEGAL'), w2 = W(T, 'ARGUMENTS'), dt = t - w1.start;
        // everything behind falls apart, in pieces, until only the error is left
        const cam = callScene(ctx, t, { k: 1, push: 1, fall: Math.max(0, dt) });
        ctx.camera3D(cam);
        const pe = (dt + 2 / 60) / T.beats(1.4);
        burst(ctx, { center: [0, 0, -0.6], seed: 1021, n: 3600, r0: 1, r1: 3.5, p: pe, focus: 6, aperture: 3, size: 3.4, alpha: 1.1 * clamp(dt * 30 + 0.6) * (dt >= 0 ? 1 : 0), color: COLOR.error, color2: COLOR.me });
        const d2 = t - w2.start, p2 = (d2 + 2 / 60) / T.beats(1.4);
        burst(ctx, { center: [0, -0.6, -0.6], seed: 1022, n: 3000, r0: 1, r1: 3.5, p: p2, focus: 6, aperture: 3, size: 3.2, alpha: 1.1 * clamp(d2 * 30 + 0.6) * (d2 >= 0 ? 1 : 0), color: COLOR.error, color2: COLOR.dim });
        ctx.post({ bloom: 0.75, ca: tear(t, 1.2, 1023) });
        ctx.camera2D();
        if (FACTS) errorPanel(ctx, t, w1.start);
        hero(ctx, w1, 960, 170, { size: 104, color: COLOR.error });
        hero(ctx, w2, 960, 860, { size: 92, color: COLOR.error, chips: true });
        corners(ctx, { color: COLOR.faint });
      },
    },
  ],
});

// FRAGMENTS splits into its own BPE pieces, which drift apart and hang (lands whole on the sung frame, as a hero)
function shatter(ctx, word, x, y, { size, dt }) {
  const { T } = ctx;
  if (dt < 0) return;
  const o = { font: 'display', size, tracking: 0.06 };
  const pieces = bpe(T).encode(word.text);
  const full = ctx.measure(word.text, o);
  const land = easeOutCubic(clamp(dt / T.beats(0.5)));
  const split = easeOutCubic(clamp((dt - T.beats(0.35)) / T.beats(1.6)));
  let pre = '';
  pieces.forEach((p, i) => {
    const w0 = ctx.measure(pre, o), w = ctx.measure(p.piece, o);
    pre += p.piece;
    const cx = x - full / 2 + w0 + w / 2;
    const dx = (i - (pieces.length - 1) / 2) * 70 * split + rands(i, 1, 985) * 30 * split;
    const dy = rands(i, 2, 985) * 70 * split + Math.sin(ctx.t * 1.3 + i * 1.7) * 6 * split;
    const col = mix3(COLOR.me, COLOR.error, smoothstep(0.2, 1, split) * (i % 2 ? 0.8 : 0.5));
    const px = cx + dx, py = y + dy;
    ctx.mask(px - w / 2 - 10, py - size * 0.62, w + 20, size * 1.3, clamp(0.6 + dt * 30));
    ctx.text(p.piece, px, py, { ...o, size: size * (1.1 - 0.1 * land), align: 'center', baseline: 'middle', color: col, alpha: clamp(0.6 + dt * 30), glow: 14, glowStrength: 0.25, intensity: 0.92 });
    // the token id under each piece
    const iw = ctx.measure(String(p.id), { font: 'mono', size: 15 });
    ctx.mask(px - iw / 2 - 6, py + size * 0.62 + 18, iw + 12, 26, split);
    ctx.text(String(p.id), px, py + size * 0.62 + 36, { font: 'mono', size: 15, align: 'center', color: COLOR.dim, alpha: split });
  });
}

// the engine's source (src/engine/timeline.js) on a wall, the camera travelling up it to the rule against bare
// seconds; mark: how lit the rule is; reverted: the edit snapping back (red → grey)
const WALL_Y = 3.3, WALL_LH = 0.36, LEAN = [0, 0.8, -0.6], LEAN_E = [0, 0.92, -0.39]; // the wall leans back: higher lines are further away
// the scroll that brings the rule (the bare-seconds check in timeline.js) level with the camera
const ruleTop = () => (FACTS ? facts().rule.line - 1 : 0) - (WALL_Y - 1.3) / (WALL_LH * LEAN_E[1]);
// pour: the waterfall, and the wall's lines dropping back into place (challenge)
function enginewall(ctx, t, { k, scroll, mark, push, shakeAmp = 0.02, reverted = 0, edited = -1, pour = false }) {
  const { T } = ctx;
  const cam = orbit({ target: add3([1.1, 0.3, -2.2], shake(t, shakeAmp, 97, 1.6)), r: lerp(11.5, 9.6, push), az: lerp(-0.6, -0.42, push), el: 0.1, fov: 42 });
  ctx.camera3D(cam);
  dust(ctx, { focus: 7, alpha: 0.4, center: [0, 0, -6], extent: [26, 14, 16] });
  field(ctx, 7, 1);
  if (FACTS) {
    const F = facts();
    // me's edit is typed into the line itself (after the + of the Edit panel); the failed test snaps it back
    const ed = edited >= 0 && reverted < 0.5 ? { line: F.rule.line, text: F.rule.edit.slice(0, Math.floor(edited * 90)) || ' ', color: COLOR.me } : null;
    const lines = F.files['src/engine/timeline.js'];
    // a line dropping back: falls from DROP_H above its place, lands, bounces a little
    const drop = (i) => { const tau = t - dropAt(T, i), tl = tau - fallTime(DROP_H); return [0, tl < 0 ? DROP_H - fallen(tau) : 0.12 * Math.exp(-tl * 9) * Math.abs(Math.sin(tl * 22)), 0]; };
    codeWall(ctx, lines, { origin: [-3.6, WALL_Y, -3.2], up: LEAN_E, top: scroll, count: 15, size: 26, ref: 7, lh: WALL_LH, mark: { line: F.rule.line, color: ed ? COLOR.me : COLOR.error, k: mark * (1 - reverted), a: ed ? 0.14 : 0.3 }, replace: ed, avoid: [SUBS, CLI_STACK],
      visible: pour ? (i) => (t >= dropAt(T, i) ? smoothstep(DROP_H * 0.85, DROP_H * 0.6, drop(i)[1]) : 0) : null, fall: pour ? drop : null });
    if (pour) {
      const a = cutOf(T, 'Challenging your god');
            const n = lines.length;
      // five streams side by side at different depths, together the whole file; already pouring when the shot cuts in
      const streams = [-5.4, -2.9, -0.4, 2.1, 4.6].map((x, q) => ({ x, z: [-3.0, -4.6, -2.2, -3.8, -2.8][q], first: Math.round((q * n) / 5), rate: [30, 27, 32, 28, 31][q] }));
      waterfall(ctx, lines, { streams, t0: a - 0.7, t1: a + T.beats(POUR), top: 5.8, pool: -2.6, size: 26, ref: 7, avoid: [SUBS, CLI_STACK, HUD_BAND], fadeOut: T.beats(0.9) });
      // where each line lands back on the wall, a puff
      const [w0, w1] = dropWindow();
      for (let i = w0; i <= w1; i++) {
        const tl = t - landAt(T, i);
        if (tl < 0 || tl > 0.4) continue;
        const u = i - scroll, c = [-3.6 + 1.6, WALL_Y - LEAN_E[1] * u * WALL_LH, -3.2 - LEAN_E[2] * u * WALL_LH];
        burst(ctx, { center: c, seed: 1400 + (i % 16), n: 140, r0: 0.05, r1: 0.7, p: tl / 0.4, focus: 7, aperture: 2, size: 2, alpha: 0.45 * clamp(tl * 30), color: COLOR.dim, color2: COLOR.faint });
      }
    }
  }
  sparkAt(ctx, cam, { pos: [3.4, -1.4, 1.2], rays: 0.4 });
  finish(ctx, cam);
  return cam;
}

// me's illegal call, typed on a line of its own in front of the engine; fall: seconds since ILLEGAL (debris)
function callScene(ctx, t, { k, push, fall = 0 }) {
  const { T } = ctx;
  // after ILLEGAL the camera sinks with the debris
  const cam = orbit({ target: add3([0.2, -1.2 * easeInCubic(clamp(fall / 1.6)), 0], shake(t, 0.015 + 0.06 * clamp(fall * 2), 98, 1.5)), r: lerp(7.8, 6.6, push), az: lerp(0.25, 0.1, push), el: 0.04, fov: 40 });
  ctx.camera3D(cam);
  dust(ctx, { focus: 7, alpha: 0.35, center: [0, 0, -6], extent: [26, 14, 16] });
  field(ctx, 7, 1, { alpha: 0.5 });
  // gravity on each line once its hashed release time has passed
  const drop = (i) => { const r = 0.12 * rand(i, 1, 1031) * 8; const u = Math.max(0, fall - r); return [rands(i, 2, 1031) * 0.6 * u, -4.9 * u * u, rands(i, 3, 1031) * 0.8 * u]; };
  if (FACTS) {
    const F = facts();
    codeWall(ctx, F.files['src/engine/timeline.js'], { origin: [-4.6, 3.1, -2.6], up: LEAN, top: 18, count: 24, size: 20, ref: 7, lh: 0.33, alpha: 0.55, fade: 0.6, fall: fall > 0 ? drop : null, avoid: fall > 0 ? [SUBS, ERR_BOX] : [SUBS] });
  }
  // the line being typed (laid out in screen space at its projected depth): the bare seconds are red
  const s = FACTS ? typing(T, t) : '', num = FACTS ? facts().illegal.call.match(/from: ([\d.]+)/)[1] : '';
  const fy = fall > 0 ? -4.9 * Math.max(0, fall - 0.35) ** 2 : 0;
  const p0 = [-3.1, fy, 0.4];
  ctx.line([[-3.4, fy, 0.4], [3.4, fy, 0.4]], { color: COLOR.faint, width: 46, alpha: 0.35, persp: 6 });
  const [sx, sy, w] = ctx.project(p0);
  const size = (30 * 6) / w, o = { font: 'mono', size };
  const tan = Math.tan((cam.fov * Math.PI) / 360);
  const cw = ctx.measure(s, o);
  // the spark hovers over the cursor
  const f = [cam.target[0] - cam.position[0], cam.target[1] - cam.position[1], cam.target[2] - cam.position[2]], fl = Math.hypot(...f);
  const rgt = [-f[2] / fl, 0, f[0] / fl], rl = Math.hypot(...rgt), du = (cw * w * tan) / 540;
  sparkAt(ctx, cam, { pos: [p0[0] + (rgt[0] / rl) * du, 0.7 + fy, p0[2] + (rgt[2] / rl) * du], rays: 0.4 });
  ctx.camera2D();
  if (w > 0.2) {
    ctx.text('>', sx - size * 0.9, sy, { ...o, color: COLOR.me, baseline: 'middle' });
    // syntax colours as typed; the bare seconds red from their first digit
    const n0 = FACTS ? facts().illegal.call.indexOf(num) : -1;
    let x = sx, c0 = 0;
    for (const seg of highlight(s)) {
      const parts = [];
      for (let q = 0; q < seg.text.length; q++) {
        const red = n0 >= 0 && c0 + q >= n0 && c0 + q < n0 + num.length;
        const last = parts.at(-1);
        if (last && last.red === red) last.text += seg.text[q]; else parts.push({ text: seg.text[q], red });
      }
      for (const pt of parts) {
        if (pt.text.trim()) ctx.text(pt.text, x, sy, { ...o, color: pt.red ? COLOR.error : SYNTAX[seg.kind === 'space' ? 'punct' : seg.kind], alpha: 0.9, baseline: 'middle' });
        x += ctx.measure(pt.text, o);
      }
      c0 += seg.text.length;
    }
    if (fall === 0 && (Math.floor(T.beatAt(t) * 2) % 2 === 0 || k < 0.98)) ctx.rect(x + 3, sy - size * 0.5, size * 0.5, size, { fill: COLOR.me });
  }
  corners(ctx, { color: COLOR.faint });
  axisGizmo(ctx, cam);
  return cam;
}

// the real error and stack, line by line from ILLEGAL (repo-relative paths, only this repo's frames)
function errorPanel(ctx, t, t0) {
  const { T } = ctx;
  const E = facts().illegal;
  const rows = [
    { s: `${E.name}: ${E.head}`, col: COLOR.error, font: 'monoBold', ind: 0 },
    ...E.errors.map((s) => ({ s, col: COLOR.ink2, ind: 1 })),
    ...E.stack.map((f) => ({ s: `at ${f.fn} (${f.file}:${f.line}:${f.col})`, col: COLOR.dim, ind: 2 })),
  ];
  const x = 330, y0 = 400, lh = 40, w = 1260;
  const a = smoothstep(t0, t0 + 0.06, t);
  const rowAt = (i) => t0 + T.beats(0.15 + 0.3 * i);
  // the panel grows with the rows as they arrive
  const shown = rows.filter((_, i) => t >= rowAt(i)).length, hgt = Math.max(1, shown) * lh + 30;
  ctx.mask(x - 30, y0 - 50, w + 60, hgt, a);
  ctx.rect(x - 30, y0 - 50, w + 60, hgt, { fill: [...COLOR.bg2, 0.95], stroke: COLOR.error, width: 1.5, alpha: a, radius: 4 });
  rows.forEach((r, i) => {
    const ta = rowAt(i);
    if (t < ta) return;
    if (i === 0) cross(ctx, x, y0 + 4, a);
    ctx.text(typed(r.s, t, ta, 120), x + (i === 0 ? 24 : 24 + r.ind * 26), y0 + i * lh, { font: r.font ?? 'mono', size: 22, color: r.col, alpha: a });
  });
}
