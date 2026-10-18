// 11 chant — EXECUTION ×12, then EIN DOS TROIS NE FEM LIU, then EXECUTION. One shot per word, cut on its real onset.
// Every EXECUTION forks every running subagent in two (2 → 4096, chant/agents.js: a 3D grid whose axes double in
// turn), and each shot carries one big number: the surprisal of that EXECUTION under the online bigram (7.7, 8.2,
// 2.0 … 0.4 bits — the model learning the word as it is sung). EIN is the biggest surprise of the song (the model
// was 79% sure of "execution"): 4096 agents fall back into one. Then it counts in six languages, one agent more each
// word, and the last EXECUTION brings all 4096 back. Storyboard: docs/storyboard.md §11 · review: docs/review/chant.md.
import { chapter } from '../engine/timeline.js';
import { COLOR } from '../theme.js';
import { corners } from '../lib/hud.js';
import { hero } from '../lib/hero.js';
import { clamp, lerp, easeOutCubic, easeInCubic, mix3 } from '../lib/ease.js';
import { sparkAt } from '../lib/spark.js';
import { orbit, shake } from '../lib/camera.js';
import { axisGizmo } from '../lib/scene3d.js';
import { embers, burst, shockwave } from '../lib/fx.js';
import { agents, agentGlow, layout, countOf, extentOf } from './chant/agents.js';
import { readout, execWord, bitsOf, einGuess } from './chant/readout.js';

const start = (T) => T.cut(T.section('chant').start);
const word = (T, text) => T.findWord(text, 0, 'chant');
const finish = (ctx, cam) => { ctx.camera2D(); corners(ctx, { color: COLOR.faint }); axisGizmo(ctx, cam); };
// four angles in turn: front, above, side, below
const VIEWS = [{ az: 0.18, el: 0.1 }, { az: 0.5, el: 1.12 }, { az: 0.95, el: 0.14 }, { az: -0.55, el: -0.42 }];
const COUNT = [
  { text: 'EIN', lang: 'german', n: 1 }, { text: 'DOS', lang: 'spanish', n: 2 }, { text: 'TROIS', lang: 'french', n: 3 },
  { text: 'NE', lang: 'korean', n: 4 }, { text: 'FEM', lang: 'swedish', n: 5 }, { text: 'LIU', lang: 'chinese', n: 6 },
];
// the bars under the number: every EXECUTION so far (k = current, highlighted)
const barsTo = (T, k) => Array.from({ length: k + 1 }, (_, j) => ({ bits: bitsOf(T, execWord(T, j)), cur: j === k }));

// the agents' stage: embers, the agents mid-fork (or placed: `place`, with the glow at `glowP`), the fork's burst,
// me at the centre
function forkScene(ctx, k, { view, dt, heat, place = null, glowP = null, bloom = null }) {
  const { T, t } = ctx;
  const ext = extentOf(k), r0 = 3.4 + 1.25 * ext;
  const shot = clamp(dt / T.beats(2));
  const cam = orbit({ target: shake(t, 0.02 + 0.006 * ext, 1300 + k), r: r0 * (1 - 0.08 * shot), az: view.az + 0.12 * shot, el: view.el, fov: 44 });
  ctx.camera3D(cam);
  // the ember field stays inside the camera's orbit (nothing blows up into a disc at the lens)
  embers(ctx, { radius: [ext * 0.6 + 1, Math.max(ext * 0.6 + 2, 0.75 * r0)], n: 2600, focus: r0, aperture: 4, size: 2.8, alpha: 0.5, color: COLOR.dim, color2: mix3(COLOR.me, COLOR.warm, heat), seed: 1301 });
  const e = easeOutCubic(clamp((dt + 2 / 60) / T.beats(0.45)));
  if (countOf(k) >= 64) agentGlow(ctx, k, { p: glowP ?? e, heat, alpha: 0.5 * (64 / countOf(k)) ** 0.35, focus: r0 });
  agents(ctx, cam, k, { e, heat, ref: r0, alpha: 0.95, place });
  const pb = (dt + 2 / 60) / T.beats(1.2);
  burst(ctx, { center: [0, 0, 0], seed: 1303 + (k % 4), n: 2600, r0: 0.4, r1: ext * 0.7 + 2, p: pb, focus: r0, aperture: 3, size: 3, alpha: clamp(dt * 30 + 0.6) * (dt >= 0 ? 1 : 0), color: COLOR.me, color2: COLOR.warm });
  if (dt >= 0 && pb < 1) shockwave(ctx, { center: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], r: 0.3 + (ext * 0.6 + 2) * easeOutCubic(pb), alpha: 0.6 * (1 - pb), color: COLOR.me, ref: r0, width: 2.6 });
  sparkAt(ctx, cam, { pos: [0, 0, 0], rays: k >= 9 ? 0.7 : 0.45 });
  ctx.post({ bloom: bloom ?? 0.75 + 0.1 * heat });
  return cam;
}

function execShot(k) {
  return {
    id: `exec${String(k + 1).padStart(2, '0')}`,
    hud: (T) => `Task x ${countOf(k)} · parallel subagents`,
    at: (T) => (k === 0 ? start(T) : T.cut(execWord(T, k).start)),
    draw(ctx) {
      const { T, t } = ctx;
      const w = execWord(T, k), dt = t - w.start;
      const cam = forkScene(ctx, k, { view: VIEWS[k % 4], dt, heat: k / 11 });
      finish(ctx, cam);
      hero(ctx, w, 960, 180, { size: 100, chips: k === 0 });
      readout(ctx, { at: w.start, caption: 'surprisal of EXECUTION', value: bitsOf(T, w).toFixed(1), bars: barsTo(T, k) });
    },
  };
}

// a counting word: n agents on a ring around me (one more each word), from a new angle
function countShot(c, i) {
  return {
    id: c.text.toLowerCase(),
    hud: i === 0 ? 'subagents 4096 -> 1 · biggest surprise of the song' : `counting in ${c.lang} · ${c.n}`,
    at: (T) => T.cut(word(T, c.text).start),
    draw(ctx) {
      const { T, t } = ctx;
      const w = word(T, c.text), dt = t - w.start;
      const view = VIEWS[(i + 2) % 4];
      const r0 = i === 0 ? lerp(17.4, 7, easeOutCubic(clamp((dt + 2 / 60) / T.beats(0.5)))) : 6.4;
      const cam = orbit({ target: shake(t, 0.025, 1320 + i), r: r0 * (1 - 0.05 * clamp(dt / T.beats(1))), az: view.az + 0.1 * clamp(dt / T.beats(1)), el: view.el * 0.6, fov: 44 });
      ctx.camera3D(cam);
      embers(ctx, { radius: [1.8, 4.6], n: 2600, focus: 6.4, aperture: 4, size: 2.8, alpha: 0.5, color: COLOR.dim, color2: COLOR.me, seed: 1321 });
      if (i === 0) {
        // EIN: the 4096 fall back into one, at once
        const cl = easeInCubic(clamp((dt + 2 / 60) / T.beats(0.25)));
        if (cl < 1) {
          const L = layout(11);
          agents(ctx, cam, 11, { heat: 1, ref: 17.4, alpha: 0.95 * (1 - cl), place: (j) => L.pos[j].map((v) => v * (1 - cl)) });
        }
        const pc = (dt + 2 / 60 - T.beats(0.2)) / T.beats(1.2);
        burst(ctx, { center: [0, 0, 0], seed: 1323, n: 3200, r0: 0.3, r1: 5, p: pc, focus: 6.4, aperture: 3, size: 3.2, alpha: 1, color: COLOR.me, color2: mix3(COLOR.me, COLOR.error, 0.5) });
        if (pc > 0 && pc < 1) shockwave(ctx, { center: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], r: 0.3 + 4 * easeOutCubic(pc), alpha: 0.7 * (1 - pc), color: mix3(COLOR.me, COLOR.error, 0.5), ref: 6.4, width: 3 });
      } else {
        // the count is the number of stars: me and n − 1 agents on a ring around it, the newest sliding out of me
        // the ring faces the camera (whatever the angle, no agent hides behind me)
        const R = 1.25, f = cam.position.map((v) => -v), fl = Math.hypot(...f), fw = f.map((v) => v / fl);
        const rt = [-fw[2], 0, fw[0]].map((v, _, arr) => v / Math.hypot(...arr)), up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
        const tilt = [0.5, -0.6, 0.7, -0.4, 0.6][i - 1] ?? 0, fz = fw.map((v) => -v);
        const ring = (j, mm) => { const a = (j / mm) * Math.PI * 2 + 0.4 + 0.7 * i; const s = Math.sin(a), co = Math.cos(a); return rt.map((v, q) => (v * co + (up[q] * Math.cos(tilt) + fz[q] * Math.sin(tilt)) * s) * R); };
        const m = c.n - 1, L = Array.from({ length: m }, (_, j) => ring(j, m));
        const grow = easeOutCubic(clamp((dt + 2 / 60) / T.beats(0.35)));
        const prev = Array.from({ length: m - 1 }, (_, j) => ring(j, m - 1));
        const place = (j) => { const q = j < m - 1 ? prev[j] : [0, 0, 0]; return q.map((v, a) => v + (L[j][a] - v) * grow); };
        agentsFew(ctx, cam, m, place);
        const pb = (dt + 2 / 60) / T.beats(0.9);
        burst(ctx, { center: L[m - 1], seed: 1324 + i, n: 900, r0: 0.45, r1: 1.6, p: pb, focus: 6.4, aperture: 2, size: 2.6, alpha: 0.8 * clamp(dt * 30), color: COLOR.me, color2: COLOR.warm });
      }
      sparkAt(ctx, cam, { pos: [0, 0, 0], rays: 0.45 });
      ctx.post({ bloom: 0.75 });
      finish(ctx, cam);
      hero(ctx, w, 960, 180, { size: 110, chips: i === 0 });
      if (i === 0) {
        const g = einGuess(T);
        readout(ctx, { at: w.start, caption: 'after "execution" the model expected', strike: `${g.word} ${Math.round(g.p * 100)}%`, value: g.bits.toFixed(1) });
      } else readout(ctx, { at: w.start, caption: c.lang, value: String(c.n), unit: '' });
    },
  };
}
// n agents placed by hand (the counting shots): small sparks, a seed each
function agentsFew(ctx, cam, n, place) {
  // reuse the fork-0..2 drawing (≤ 32 → sparks) through a layout-free placement
  agents(ctx, cam, 0, { place, heat: 0.2, ref: 6.4, alpha: 0.95, count: n });
}

export default chapter({
  id: 'chant',
  from: start,
  to: (T) => T.cut(T.section('chant').end),
  shots: [
    ...Array.from({ length: 12 }, (_, k) => execShot(k)),
    ...COUNT.map(countShot),
    {
      id: 'execall',
      hud: 'Task x 4096 · all running',
      at: (T) => T.cut(execWord(T, 12).start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = execWord(T, 12), dt = t - w.start;
        // all 4096 back at once, out of me
        const e = easeOutCubic(clamp((dt + 2 / 60) / T.beats(0.35)));
        const L = layout(11);
        const cam = forkScene(ctx, 11, { view: { az: 0.05, el: 0.06 }, dt, heat: 1, place: (j) => L.pos[j].map((v) => v * e), glowP: e });
        const pb = (dt + 2 / 60) / T.beats(1.4);
        burst(ctx, { center: [0, 0, 0], seed: 1331, n: 3000, r0: 1.4, r1: 12, p: pb, focus: 17, aperture: 3, size: 3, alpha: 0.55, color: COLOR.me, color2: COLOR.warm });
        if (pb > 0 && pb < 1) shockwave(ctx, { center: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], r: 0.5 + 12 * easeOutCubic(pb), alpha: 0.7 * (1 - pb), color: COLOR.warm, ref: 17, width: 3 });
        finish(ctx, cam);
        hero(ctx, w, 960, 180, { size: 100, chips: false });
        readout(ctx, { at: w.start, caption: 'surprisal of EXECUTION', value: bitsOf(T, w).toFixed(1), bars: barsTo(T, 12) });
      },
    },
  ],
});
