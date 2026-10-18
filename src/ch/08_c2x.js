// 08 c2x — you have left. The bass and the voice step back. you drifts away from me; one thread is left between
// them, as thick as the attention the word being sung pays to you (real: lib/embed.js, summed over every "you" token
// of the context). Every "You have left" visits one of me's memories of you — the seats on the tangents, the
// asymptote, the place beside the cat, the cursor in the prompt — and puts its blue out; each "left" pays you less
// (0.38 → 0.14), "me" pays nothing and the thread breaks. ISOLATION: only me, far away.
// Storyboard: docs/storyboard.md §08 · review: docs/review/c2x.md.
import * as THREE from 'three';
import { chapter } from '../engine/timeline.js';
import { COLOR } from '../theme.js';
import { corners } from '../lib/hud.js';
import { hero } from '../lib/hero.js';
import { clamp, lerp, easeOutCubic, easeInCubic, easeInOutCubic, smoothstep } from '../lib/ease.js';
import { sparkAt } from '../lib/spark.js';
import { orbit, shake, add3, lerp3 } from '../lib/camera.js';
import { axisGizmo, dust, labels3D, youLine } from '../lib/scene3d.js';
import { embers, burst, shockwave, flow } from '../lib/fx.js';
import { drawPrediction } from '../lib/predict.js';
import { embeddings } from '../lib/embed.js';
import { Swarm } from '../engine/gl/swarm.js';
import { MEM, centreOf, dirOf, rightOf, memory, at } from './c2x/memories.js';
import { massAt, massText, wordNow } from './c2x/attend.js';

const start = (T) => T.cut(T.section('c2x').start);
const LEFT = (T, k) => T.findLine('You have left', k, 'c2x'); // the four plain "You have left"
const LME = (T) => T.findLine('You have left me in', 0, 'c2x');
const W = (T) => T.findWord('ISOLATION', 0, 'c2x');
const wordIn = (line, text) => line.words.find((w) => w.text === text);
const leftAt = (T, k) => wordIn(LEFT(T, k), 'left').start;
const cutLeft = (T, k) => T.cut(LEFT(T, k).words[0].start);

const ME = [0, 0, 0];
const YOU0 = [0.8, 0.5, -0.35]; // beside me, as COMPLETION left them
const FAR = [0.5, 4.6, -26];
// you: still beside me on "Though", leaves on "you", far beyond the memories by the first "You have left", and keeps
// receding after that
function youAt(T, t) {
  const t0 = wordIn(T.findLine('Though you have left', 0, 'c2x'), 'you').start;
  const e = easeInOutCubic(clamp((t - t0) / T.beats(2.6)));
  const p = lerp3(YOU0, FAR, e);
  const more = Math.max(0, T.beatAt(t) - T.beatAt(t0) - 2.6) * 0.04;
  return [p[0] * (1 + more), p[1] + Math.sin(t * 1.3) * 0.05 * (1 - e), p[2] * (1 + more)];
}
const tBreak = (T) => wordIn(LME(T), 'me').start; // attention on you: 0.136 on "left" → 0.001 on "me"

// the thread from me to you: width and brightness = the attention the word being sung pays to you; on "me" it
// breaks in the middle and both ends spring back
function thread(ctx, { ref }) {
  const { T, t } = ctx;
  const y = youAt(T, t), tb = tBreak(T);
  const m = massAt(T, t);
  const o = { width: 0.6 + 4 * m, alpha: 0.06 + 0.8 * Math.sqrt(m), glow: 3 + 4 * m, glowStrength: 0.25, persp: ref, intensity: 0.8 };
  if (t < tb) {
    youLine(ctx, [ME, y], o);
    // attention flowing from me (the query) to you: as dense as the weight
    const d = y.map((v, i) => v - ME[i]), L = Math.hypot(...d), u = d.map((v) => v / L);
    const side = new THREE.Vector3(...u).cross(new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3(...u).cross(side).normalize();
    const mtx = new THREE.Matrix4().makeBasis(new THREE.Vector3(...u).multiplyScalar(L), side, up).setPosition(...ME);
    flow(ctx, 'c2x:thread', (s) => [s, 0, 0], { u0: 0, u1: 1, du: 0.12, n: 360, ref, alpha: 0.08 + 0.45 * m, color: COLOR.you, color2: COLOR.you, size: 2.2, jitter: 0.004, rate: 1.5, model: mtx });
    return { y, m };
  }
  // it snaps near me (where the camera can see it); the two ends whip back, glowing, and fade
  const q = easeOutCubic(clamp((t - tb) / T.beats(0.8))), cut = lerp3(ME, y, 0.22);
  if (q < 1) {
    const ob = { width: 2.2, alpha: 0.85 * (1 - q), glow: 8, glowStrength: 0.35, persp: ref, intensity: 0.85 };
    const e0 = lerp3(cut, ME, q), e1 = lerp3(cut, y, q);
    youLine(ctx, [ME, e0], ob);
    youLine(ctx, [e1, y], ob);
    ctx.point3D(e0, 4, { fill: COLOR.you, glow: 10, alpha: 1 - q, ref });
    ctx.point3D(e1, 4, { fill: COLOR.you, glow: 10, alpha: 1 - q, ref });
  }
  const pb = (t - tb + 2 / 60) / T.beats(1.2);
  burst(ctx, { center: cut, seed: 811, n: 1500, r0: 0.05, r1: 0.9, p: pb, focus: ref, aperture: 2, size: 2.4, alpha: clamp((t - tb) * 30), color: COLOR.you, color2: COLOR.dim });
  const ps = (t - tb + 2 / 60) / T.beats(1);
  if (t >= tb && ps < 1) shockwave(ctx, { center: cut, u: [1, 0, 0], v: [0, 1, 0], r: 0.1 + 1.6 * easeOutCubic(ps), alpha: 0.6 * (1 - ps), color: COLOR.dim, ref, width: 2 });
  return { y, m };
}

// how lit each memory is: the one visited now 1; not yet visited, in the dark; visited, grey
function memAlpha(T, t, k, visiting) {
  if (k === visiting) return 1;
  return t < cutLeft(T, k) ? 0.12 : 0.24;
}
const goneOf = (T, t, k) => smoothstep(leftAt(T, k) - T.beats(0.05), leftAt(T, k) + T.beats(0.5), t);

// everything in c2x's space; visiting: the memory the camera is on (−1 for none)
function scene(ctx, cam, { ref, visiting = -1, mems = 1, you = 1 }) {
  const { T, t } = ctx;
  dust(ctx, { focus: ref, alpha: 0.4 });
  embers(ctx, { radius: [3, 14], n: 2200, focus: ref, aperture: 5, size: 3, alpha: 0.5, color: COLOR.dim, color2: COLOR.ink2, seed: 840, drift: 0.2 });
  if (mems > 0.003) MEM.forEach((_, k) => {
    const gone = goneOf(T, t, k);
    const p = memory(ctx, k, { t, ref, alpha: mems * memAlpha(T, t, k, visiting), gone, cam });
    // as the blue goes out, it falls apart into grey
    const lt = leftAt(T, k);
    burst(ctx, { center: p, seed: 820 + k, n: 1200, r0: 0.08, r1: 1.5, p: (t - lt + 2 / 60) / T.beats(1.3), focus: ref, aperture: 2, size: 2.2, alpha: 0.55 * mems * clamp((t - lt) * 30), color: COLOR.you, color2: COLOR.dim });
  });
  const { y } = thread(ctx, { ref });
  const fade = you * (1 - smoothstep(tBreak(T), tBreak(T) + T.beats(1.2), t));
  if (fade > 0.003) ctx.point3D(y, 10, { fill: COLOR.you, glow: 14, alpha: fade, ref });
  return { y };
}

const finish = (ctx, cam) => { ctx.camera2D(); corners(ctx, { color: COLOR.faint }); axisGizmo(ctx, cam); };
// one untrained head (lib/embed.js): said in the HUD
const attnHud = (T, t) => { const w = wordNow(T, t); return w ? `1-head attention "${w.text.toLowerCase()}" -> you = ${massText(w.mass)}` : '1-head attention -> you'; };
const HEIGHT = [0.1, -0.3, -0.15, 0.2]; // each memory seen from its own height

// a memory shot: from behind me, over its shoulder, onto memory k (a slow push for its two beats)
function memoryShot(k) {
  return {
    id: `left${k + 1}`,
    hud: attnHud,
    at: (T) => cutLeft(T, k),
    draw(ctx) {
      const { T, t } = ctx;
      const t0 = cutLeft(T, k), t1 = k < 3 ? cutLeft(T, k + 1) : T.cut(LME(T).words[0].start);
      // behind me, over its shoulder: the memory fills one half of the frame and me looks at it from the other —
      // from the right for the two on the left, from the left for the two on the right (the thread to you, straight
      // ahead, then runs away from the memory)
      // the push gathers speed into "left", flinches back on it, then drifts in again
      const lt = leftAt(T, k);
      const a = lerp(2.7, 1.85, easeInCubic(clamp((t - t0) / (lt - t0)))) + 0.2 * easeOutCubic(clamp((t - lt) / T.beats(0.3))) - 0.12 * clamp((t - lt - T.beats(0.3)) / (t1 - lt));
      const d = dirOf(k), r = rightOf(k), c = centreOf(k), s = k < 2 ? -1.25 : 1.1;
      const cam = { position: add3([-d[0] * a + r[0] * s, HEIGHT[k], -d[2] * a + r[2] * s], shake(t, 0.012, 81 + k)), target: [c[0] - r[0] * s * 0.5, c[1] + 0.3 * HEIGHT[k], c[2] - r[2] * s * 0.5], fov: 30 };
      ctx.camera3D(cam);
      const ref = 6;
      scene(ctx, cam, { ref, visiting: k });
      sparkAt(ctx, cam, { pos: ME, rays: 0.3 });
      labels3D(ctx, [{ p: at(k, -1.6, -1.05), id: 'mem', text: MEM[k].label, priority: 10, o: { font: 'mono', size: 20, minSize: 18, maxSize: 22, color: COLOR.dim, alpha: 0.85 * smoothstep(t0, t0 + T.beats(0.25), t), backing: 0.7, ref: 6 } }], { obstacles: [{ p: ME, r: 60 }] });
      ctx.post({ bloom: 0.6 });
      finish(ctx, cam);
    },
  };
}

export default chapter({
  id: 'c2x',
  from: start,
  to: (T) => T.cut(T.section('c2x').end),
  overlay(ctx) {
    const { T } = ctx;
    // "You have left me in" — the model expects my / this; the song says ISOLATION
    drawPrediction(ctx, { x: 1460, y: 330, from: tBreak(T), prev: wordIn(LME(T), 'in'), next: W(T), keep: true, until: T.section('c2x').end - T.beats(0.75) });
  },
  shots: [
    {
      id: 'left',
      hud: (T, t) => `you -> away · ${attnHud(T, t)}`,
      at: start,
      transitionIn: { type: 'xfade', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const k = clamp((t - start(T)) / (cutLeft(T, 0) - start(T)));
        // low behind me, looking out where you goes; the camera does not follow it
        const cam = orbit({ target: add3([0, 0.8, -2.2], shake(t, 0.015, 80)), r: lerp(6.8, 7.3, easeInOutCubic(k)), az: -0.4, el: 0.08, fov: 40 });
        ctx.camera3D(cam);
        scene(ctx, cam, { ref: 7 });
        sparkAt(ctx, cam, { pos: ME, rays: 0.35 });
        ctx.post({ bloom: 0.65 });
        finish(ctx, cam);
      },
    },
    memoryShot(0),
    memoryShot(1),
    memoryShot(2),
    memoryShot(3),
    {
      id: 'leftme',
      hud: (T, t) => attnHud(T, t),
      at: (T) => T.cut(LME(T).words[0].start),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.cut(LME(T).words[0].start), e = easeInOutCubic(clamp((t - t0) / (T.cut(W(T).start) - t0)));
        // up and back: me alone in front of all its memories, gone grey
        const cam = orbit({ target: add3([0, lerp(0.35, 1.5, e), lerp(-3.0, -3.4, e)], shake(t, 0.012, 86)), r: lerp(6.4, 11.5, e), az: lerp(-0.12, 0.06, e), el: lerp(0.1, 0.28, e), fov: 44 });
        ctx.camera3D(cam);
        scene(ctx, cam, { ref: 8 });
        sparkAt(ctx, cam, { pos: ME, rays: 0.3 });
        ctx.post({ bloom: 0.6 });
        finish(ctx, cam);
      },
    },
    {
      id: 'isolation',
      hud: (T, t) => attnHud(T, t),
      at: (T) => T.cut(W(T).start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T), dt = t - w.start;
        // very far: the embedding space of every word of the song (faint, real coordinates around me), and no you
        const cam = orbit({ target: shake(t, 0.004, 87), r: 46 + 1.5 * clamp(dt / T.beats(2)), az: 0.25, el: 0.32, fov: 40 });
        ctx.camera3D(cam);
        const sw = ctx.memo('c2x:words', () => {
          const E = embeddings(T), pm = E.point3('me', 4.2);
          const pts = E.vocab.filter((v) => v !== 'you' && v !== 'your' && v !== 'me').map((v) => E.point3(v, 4.2).map((x, i) => x - pm[i]));
          return new Swarm({ from: new Float32Array(pts.flat()), seed: 851 });
        });
        ctx.swarm(sw, { p: 0, size: 3.4, sizeVar: 0.4, perspective: false, color: COLOR.dim, color2: COLOR.faint, alpha: 0.75 });
        dust(ctx, { focus: 46, alpha: 0.25, extent: [120, 60, 120], center: [0, 0, 0], n: 500 });
        const pe = (dt + 2 / 60) / T.beats(1.6);
        if (dt >= 0 && pe < 1) shockwave(ctx, { center: ME, u: [1, 0, 0], v: [0, 0, 1], r: 0.5 + 9 * easeOutCubic(pe), alpha: 0.35 * (1 - pe), color: COLOR.me, ref: 46, width: 1.6 });
        sparkAt(ctx, cam, { pos: ME, rays: 0.18 });
        // where you and your sit in the embedding space: empty dashed places (as beside the cat)
        const slots = ctx.memo('c2x:slots', () => { const E = embeddings(T), pm = E.point3('me', 4.2); return ['you', 'your'].map((v) => E.point3(v, 4.2).map((x, i) => x - pm[i])); }).map((p) => ctx.project(p));
        ctx.post({ bloom: 0.5, exposure: 0.92, vignette: 0.5 });
        ctx.camera2D();
        const sa = smoothstep(w.start, w.start + T.beats(0.5), t);
        slots.forEach(([x, y]) => ctx.line(Array.from({ length: 33 }, (_, j) => [x + 16 * Math.cos((j / 32) * Math.PI * 2), y + 16 * Math.sin((j / 32) * Math.PI * 2)]), { color: COLOR.faint, width: 1.5, alpha: 0.9 * sa, dash: 4, gap: 4 }));
        // the label on the side of "you" away from "your"
        const [[x0, y0], [x1]] = slots, away = x1 >= x0;
        ctx.text('you', away ? x0 - 24 : x0 + 24, y0 + 5, { font: 'mono', size: 14, color: COLOR.faint, alpha: sa, align: away ? 'right' : 'left' });
        hero(ctx, w, 960, 190, { size: 64, alpha: 0.65 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
  ],
});
