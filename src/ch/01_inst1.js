// 01 inst1 — the title drop. you types world.execute(me); into Claude Code's prompt and presses Enter: the request
// runs forward through the network (schematic), out into the embedding space of every word of the song, and lands on
// the plan for verse 1. Instrumental: the full synth layer enters. Storyboard: docs/storyboard.md §01 ·
// review: docs/review/inst1.md.
import * as THREE from 'three';
import { chapter } from '../engine/timeline.js';
import { COLOR } from '../theme.js';
import { corners } from '../lib/hud.js';
import { clamp, lerp, easeOutCubic, easeInOutCubic, easeInCubic, smoothstep, decay } from '../lib/ease.js';
import { rand, randn } from '../lib/hash.js';
import { drawSpark, sparkSize } from '../lib/spark.js';
import { orbit, shake, add3, lerp3 } from '../lib/camera.js';
import { axisGizmo, dust, labels3D } from '../lib/scene3d.js';
import { transcript, spinner, thinking } from '../lib/cc.js';
import { drawNote } from '../lib/console.js';
import { bpe } from '../lib/bpe.js';
import { tokenChips } from '../lib/llmviz.js';
import { embeddings, attention } from '../lib/embed.js';
import { sequence } from '../lib/corpus.js';
import { embers, burst, shockwave, stream, sampleSegments } from '../lib/fx.js';
import { Swarm } from '../engine/gl/swarm.js';
import { world, atmosphere } from './intro/stage.js';
import { cloud, halo, v1Camera, ME_V1, YOU_V1, PLAN, planStart, planTimes } from './v1/cloud.js';
import { tesseract } from './v1/tesseract.js';

const SPARK_PX = 70;
const title = (T) => T.line(11); // world. execute (me);  — not sung; tokens on beats 32, 33, 34
const start = (T) => T.cut(T.section('inst1').start);

function spark(ctx, cam, { pos = [0, 0, 0], px = SPARK_PX, rays = 0.35 } = {}) {
  drawSpark(ctx, { pos, size: sparkSize(cam, px, pos) });
  if (rays > 0) { const sp = ctx.project(pos); ctx.post({ rays: [sp[0], sp[1], rays * 1.3], bloom: 0.72 }); }
}

// ---- inst1.01/02: the prompt ------------------------------------------------------------------------------------
const PROMPT = { x: 420, y: 520, w: 1080, h: 130, size: 54 };
function typedTitle(ctx, t) {
  let s = '';
  for (const w of title(ctx.T).words) {
    if (t < w.start) break;
    s += w.text.slice(0, Math.floor((t - w.start) * 60) + 1);
  }
  return s;
}
const tokenX = (ctx, j) => ctx.measure(title(ctx.T).words.slice(0, j).map((w) => w.text).join(''), { font: 'mono', size: PROMPT.size });

// the stage at the end of the intro, seen from further away; the spark sits above the prompt box
function stage(ctx, t, k, alpha) {
  const cam = orbit({ target: add3([0, -0.9, -0.6], shake(t, 0.02, 4)), r: lerp(10.6, 13, k), az: 2.3 + 0.25 * (t - start(ctx.T)), el: lerp(0.13, 0.2, k), fov: 40 });
  ctx.camera3D(cam);
  world(ctx, cam, { alpha });
  atmosphere(ctx, 12, { alpha });
  return cam;
}

// warp: streaks of light rushing past the camera down a tube (z = 0 is the spinner plane); each streak's position is
// (its hashed start + the distance travelled) modulo the tube length, and its length grows with the speed
function warp(ctx, travelled, speed, alpha, camZ) {
  const N = 260, LEN = 48;
  for (let i = 0; i < N; i++) {
    const a = rand(i, 1, 41) * Math.PI * 2, r = 1.2 + 4.5 * rand(i, 2, 41) ** 1.3;
    const z = camZ - LEN + ((rand(i, 3, 41) * LEN + travelled) % LEN);
    const L = 0.15 + speed * 0.05 * (0.6 + 0.8 * rand(i, 4, 41));
    const near = smoothstep(camZ - 0.3, camZ - 2, z) * (1 - smoothstep(camZ - LEN * 0.8, camZ - LEN, z));
    if (near <= 0.01) continue;
    ctx.line([[Math.cos(a) * r, Math.sin(a) * r, z], [Math.cos(a) * r, Math.sin(a) * r, z - L]], { color: rand(i, 5, 41) < 0.7 ? COLOR.me : COLOR.ink, width: 2.2, alpha: alpha * near, glow: 6, persp: 6 });
  }
}

// ---- inst1.03: the forward pass (schematic): the intro's words as residual streams through 8 layers ---------------
const RING = 3, LAYERS = 8, GAP = 3.2, HALF = 4.1;
function fwdData(ctx) {
  const { T } = ctx;
  return ctx.memo('fwd', () => {
    const E = embeddings(T);
    const words = sequence(T).filter((w) => w.start < T.section('inst1').start);
    const texts = words.map((w) => w.text);
    // the real attention rows (one untrained head, embed.js): row i = weights over words 0..i
    const rows = words.map((_, i) => attention(E, texts, i, { gain: 3 }));
    const top = rows.map((r, i) => { if (!i) return null; let j = 0; for (let k = 1; k < i; k++) if (r[k] > r[j]) j = k; return { j, w: r[j] }; });
    return { words, rows, top, n: words.length };
  });
}
const ringPos = (n, i, z) => { const a = (i / n) * Math.PI * 2 + Math.PI / 2; return [Math.cos(a) * RING, Math.sin(a) * RING, z]; };
const arc = (A, B, z) => {
  const mid = [(A[0] + B[0]) * 0.3, (A[1] + B[1]) * 0.3, z];
  return Array.from({ length: 13 }, (_, q) => { const u = q / 12, v = 1 - u; return [v * v * A[0] + 2 * v * u * mid[0] + u * u * B[0], v * v * A[1] + 2 * v * u * mid[1] + u * u * B[1], z]; });
};
// the MLP of each layer, with the He-initialised weights of the intro (layer 0 = the INITIALIZATION matrix, seed 808):
// h_l = ReLU(W_l h_(l-1)), h_(-1) = the query word's 16-d embedding. Real activations of an untrained network.
const W = (l, i, j) => randn(i, j, 808 + l) * Math.sqrt(2 / 16);
function activations(ctx, query) {
  return ctx.memo(`act:${query}`, () => {
    const { words } = fwdData(ctx);
    const e = embeddings(ctx.T).vector(words[query].text);
    let h = e.map((x) => x / (Math.hypot(...e) || 1));
    const out = [];
    for (let l = 0; l < LAYERS; l++) {
      h = Array.from({ length: 16 }, (_, i) => Math.max(0, h.reduce((s, x, j) => s + W(l, i, j) * x, 0)));
      const m = Math.max(...h) || 1;
      out.push(h.map((x) => x / m));
    }
    return out;
  });
}
// focusLayer: the layer just ahead of the camera, where the beat's query word shows its full attention row
function forward(ctx, cam, t, { alpha = 1, focusLayer = 0, query = 1 } = {}) {
  const { words, rows, top, n } = fwdData(ctx);
  const act = activations(ctx, query);
  const cz = cam.position[2];
  const fade = (z) => smoothstep(2.5, 6.5, cz - z); // a layer fades out well before the camera reaches it
  const zEnd = -(LAYERS - 1) * GAP;
  const fog = [3, 30];
  for (let i = 0; i < n; i++) ctx.line([ringPos(n, i, 6), ringPos(n, i, zEnd - 6)], { color: COLOR.me, width: 1.3, alpha: alpha * 0.4, persp: 7, fog });
  for (let l = 0; l < LAYERS; l++) {
    const z = -l * GAP;
    const la = alpha * fade(z);
    if (la <= 0.003) continue;
    const hot = l === focusLayer;
    // the layer: a square plane with the ring of words
    ctx.line([[-HALF, -HALF, z], [HALF, -HALF, z], [HALF, HALF, z], [-HALF, HALF, z], [-HALF, -HALF, z]], { color: hot ? COLOR.ink : COLOR.ink2, width: hot ? 2.2 : 1.4, alpha: la * (hot ? 0.8 : 0.45), persp: 7, fog });
    if (hot) ctx.text3D(`L${l}`, [-HALF + 0.2, -HALF + 0.3, z], { font: 'monoBold', size: 22, color: COLOR.ink2, alpha: la, ref: 7, fog }); // only the layer ahead is named
    // the plane is the layer's weight matrix: one dot per weight (|w| > 0.6σ), orange positive, gold negative
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const w = W(l, i, j) / Math.sqrt(2 / 16);
      if (Math.abs(w) < 0.6) continue;
      ctx.point3D([(i - 7.5) * 0.46, (j - 7.5) * 0.46, z - 0.02], 1 + 0.9 * Math.abs(w), { fill: w > 0 ? COLOR.me : COLOR.warm, alpha: la * (hot ? 0.5 : 0.28), ref: 7, fog });
    }
    // and beside it, the layer's 16 neurons firing for the query word: bars = ReLU activations
    // (only for the layer ahead and the next two: nearer layers would sweep across the frame)
    if (l >= focusLayer && l <= focusLayer + 2) act[l].forEach((h, i) => {
      const y = (i - 7.5) * 0.46, x0 = -HALF - 0.35; // on the far side of the plane (the camera is on +x)
      ctx.line([[x0, y, z], [x0 - 0.08 - 1.6 * h, y, z]], { color: h > 0 ? COLOR.me : COLOR.faint, width: 5, alpha: la * (hot ? 1 : 0.55), persp: 7, fog, glow: hot ? 8 * h : 0 });
    });
    if (hot) ctx.text3D('ReLU(W·h)', [-HALF - 2.1, -HALF - 0.25, z], { font: 'mono', size: 18, color: COLOR.dim, alpha: la, ref: 7, fog });
    if (hot) {
      // the query word attends to every earlier word: its real weights (width / brightness)
      const r = rows[query];
      for (let j = 0; j < query; j++) {
        const w = r[j];
        ctx.line(arc(ringPos(n, query, z), ringPos(n, j, z), z), { color: COLOR.warm, width: 0.8 + 7 * w, alpha: la * (0.12 + 0.88 * Math.sqrt(w)), persp: 7, fog, glow: 10 * w });
      }
      const j = top[query].j;
      ctx.point3D(ringPos(n, j, z), 6, { fill: COLOR.warm, glow: 12, alpha: la, ref: 7, fog });
    } else {
      // other layers: each word's strongest link only, dimmed
      for (let i = 1; i < n; i++) {
        const { j, w } = top[i];
        if (i - j < 2) continue;
        ctx.line(arc(ringPos(n, i, z), ringPos(n, j, z), z), { color: COLOR.warm, width: 0.8 + 3 * w, alpha: la * 0.15, persp: 7, fog });
      }
    }
    for (let i = 0; i < n; i++) ctx.point3D(ringPos(n, i, z), i === query && hot ? 5 : 3, { fill: COLOR.me, glow: 6, alpha: la, ref: 7, fog });
  }
  // the residual streams flow: 150 particles per stream, moving one layer gap per beat
  const sw = ctx.memo('fwdFlow', () => {
    const per = 150, pts = new Float32Array(n * per * 3);
    for (let i = 0; i < n; i++) for (let q = 0; q < per; q++) {
      const p = ringPos(n, i, 6 - (q / per) * (LAYERS + 4) * GAP);
      pts.set([p[0] + randn(i, q, 46) * 0.06, p[1] + randn(i, q, 47) * 0.06, p[2] + rand(i, q, 43) * 0.25], (i * per + q) * 3);
    }
    return new Swarm({ from: pts, seed: 44 });
  });
  const flow = -((ctx.T.beatAt(t) % 1) * GAP);
  ctx.swarm(sw, { p: 0, model: new THREE.Matrix4().makeTranslation(0, 0, flow), size: 2.6, sizeVar: 0.6, perspective: 7, focus: 0, color: COLOR.ink, color2: COLOR.ink, alpha: alpha * 0.85, fog });
  return { zEnd, query: words[query].text, key: words[top[query].j].text, w: top[query].w };
}

// ---- inst1.04: the embedding space of every word in the song ----------------------------------------------------
// what it shows: every word as a 16-d vector learned from where it is used in the lyrics; close = used alike.
// Two real nearest-neighbour searches (cosine): "me" (orange) and "you" (blue).
const GSCALE = 1.7;
function nearest(E, q, k) {
  const v = E.vector(q), nv = Math.hypot(...v);
  return E.vocab.filter((w) => w !== q).map((w) => { const u = E.vector(w); return { w, c: u.reduce((s, x, d) => s + x * v[d], 0) / (nv * Math.hypot(...u) || 1) }; })
    .sort((a, b) => b.c - a.c || a.w.localeCompare(b.w)).slice(0, k);
}
function galaxyData(ctx) {
  const { T } = ctx;
  return ctx.memo('gal', () => {
    const E = embeddings(T);
    const P = (w) => E.point3(w).map((v) => v * GSCALE);
    const heard = [...new Set(sequence(T).filter((w) => w.start < T.section('inst1').start).map((w) => w.norm))];
    return { E, P, heard, near: { me: nearest(E, 'me', 5), you: nearest(E, 'you', 5) }, pm: P('me'), py: P('you') };
  });
}
// the two searches of the galaxy shot: when each starts (one result per half beat)
const searches = (T) => { const a = T.cut(T.barTime(12)); return [{ q: 'me', from: a + T.beats(2.75), color: COLOR.me }, { q: 'you', from: a + T.beats(5.25), color: COLOR.you }]; };
function galaxy(ctx, t, { alpha = 1, labels: la = 1, search = [] } = {}) {
  const { T } = ctx;
  const { E, P, heard, near } = galaxyData(ctx);
  const isYou = (w) => w === 'you' || w === 'your';
  // every word of the song: unheard words are dim points (the future)
  const sw = ctx.memo('galaxyPts', () => new Swarm({ from: E.vocab.map(P), seed: 45 }));
  ctx.swarm(sw, { p: 0, size: 5, sizeVar: 0.4, perspective: true, focus: 13, aperture: 3, color: COLOR.dim, alpha });
  // heard words: bright, each in a small nebula of particles
  const neb = ctx.memo('nebula', () => {
    const per = 45, pts = new Float32Array(heard.length * per * 3);
    heard.forEach((w, i) => { const c = P(w); for (let q = 0; q < per; q++) pts.set([c[0] + randn(i, q, 48) * 0.28, c[1] + randn(i, q, 49) * 0.28, c[2] + randn(i, q, 50) * 0.28], (i * per + q) * 3); });
    return new Swarm({ from: pts, seed: 51 });
  });
  ctx.swarm(neb, { p: 0, size: 3, sizeVar: 0.6, perspective: true, focus: 13, aperture: 3, drift: 0.08, time: t * 0.5, color: COLOR.ink2, color2: COLOR.ink2, colorVar: 0.2, alpha: alpha * 0.85 });
  const labels = [];
  for (const w of heard) {
    const p = P(w);
    ctx.point3D(p, 4, { fill: isYou(w) ? COLOR.you : COLOR.ink, glow: 6, alpha, ref: 13 });
    labels.push({ p, id: w, text: w, priority: isYou(w) ? 50 : w.length, o: { font: 'mono', size: 14, maxSize: 14, minSize: 12, color: isYou(w) ? COLOR.you : COLOR.dim, alpha: alpha * la * 0.6, ref: 13, fog: [10, 22] } });
  }
  const obstacles = heard.map((w) => ({ p: P(w), r: 10, id: w }));
  // the searches: the query word lights up, then its nearest words link to it one per half beat (real cosines)
  search.forEach(({ q, from, color }, si) => {
    if (t < from) return;
    const active = si === search.length - 1 || t < search[si + 1].from;
    const pq = P(q);
    const shown = (T.beatAt(t) - T.beatAt(from)) * 2;
    ctx.point3D(pq, 8, { fill: color, glow: 18, alpha, ref: 13 });
    labels.push({ p: pq, id: q, text: q, priority: 200, o: { font: 'monoBold', size: 24, minSize: 22, maxSize: 26, color, alpha, ref: 13 } });
    obstacles.push({ p: pq, r: 30, id: q });
    near[q].forEach(({ w }, k) => {
      const a = alpha * clamp(shown - k) * (active ? 1 : 0.45);
      if (a <= 0.003) return;
      ctx.line([pq, P(w)], { color, width: 1.6, alpha: a * 0.8, persp: 13, glow: 8 });
      obstacles.push({ a: pq, b: P(w), r: 5 }, { p: P(w), r: 10, id: w });
      ctx.point3D(P(w), 5, { fill: color, glow: 10, alpha: a, ref: 13 });
      labels.push({ p: P(w), id: w, text: w, priority: 150 - k, o: { font: active ? 'monoBold' : 'mono', size: active ? 20 : 14, minSize: active ? 18 : 12, maxSize: active ? 22 : 14, color: active ? color : COLOR.dim, alpha: a * la, ref: 13 } });
    });
    // the link is made of particles
    const fil = ctx.memo(`fil:${q}`, () => new Swarm({ from: sampleSegments(near[q].map(({ w }) => [pq, P(w)]), 90, 52 + si, 0.04), seed: 53 + si }));
    ctx.swarm(fil, { p: 0, size: 2.4, perspective: true, focus: 13, aperture: 3, drift: 0.05, time: t, color, color2: color, alpha: alpha * clamp(shown / 5) * (active ? 0.8 : 0.35) });
  });
  labels3D(ctx, labels, { obstacles });
  return P('me');
}

// ---- inst1.05: the plan for verse 1 as a roadmap ----------------------------------------------------------------
// one 3D preview per todo item, drawn by a beam from me when the item appears, joined by a route in verse order:
//   DIMENSION: a rotating tesseract · CIRCUMFERENCE: a circle and its radius · TANGENTS: sin with tangent lines ·
//   LIMITATIONS: 1/x approaching its asymptote. All curves are the real functions, sampled.
// placed by unprojecting the final camera (v1Camera(0)) at depth 9.5: a route down the right, clear of me and the terminal
const SLOTS = [[2.31, 2.38, -0.43], [3.78, 2.28, -0.75], [4.94, 1.71, -0.7], [5.2, 0.75, -0.36]];
const SLOT = (i) => SLOTS[i];
// polylines of preview i (local coordinates, ~1.4 units across), revealed to fraction k
function preview(i, t, k) {
  const sub = (pts) => { const n = Math.max(2, Math.ceil(pts.length * k)); return pts.slice(0, n); };
  const N = 64;
  if (i === 0) {
    const E = tesseract(t * 0.9 + 0.4);
    return E.slice(0, Math.ceil(E.length * k)).map((e) => e.pts.map((q) => q.map((v) => v * 0.3)));
  }
  if (i === 1) {
    const a = t * 2;
    return [sub(Array.from({ length: N + 1 }, (_, q) => { const th = (q / N) * Math.PI * 2; return [Math.cos(th) * 0.55, Math.sin(th) * 0.55, 0]; })),
      k > 0.6 ? [[0, 0, 0], [Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0]] : null].filter(Boolean);
  }
  if (i === 2) {
    const f = (x) => 0.32 * Math.sin(x * 4.4), df = (x) => 0.32 * 4.4 * Math.cos(x * 4.4);
    const out = [sub(Array.from({ length: N + 1 }, (_, q) => { const x = -0.75 + (q / N) * 1.5; return [x, f(x), 0]; }))];
    if (k > 0.6) [-0.45, 0, 0.45].forEach((x0) => { const d = df(x0), L = 0.22 / Math.hypot(1, d); out.push([[x0 - L, f(x0) - d * L, 0], [x0 + L, f(x0) + d * L, 0]]); });
    return out;
  }
  const out = [sub(Array.from({ length: N + 1 }, (_, q) => { const x = 0.1 + (q / N) * 1.3; return [x - 0.7, 0.08 / x - 0.45, 0]; }))];
  if (k > 0.6) out.push([[-0.7, -0.45, 0], [0.75, -0.45, 0]]);
  return out;
}
function roadmap(ctx, t, { alpha = 1 } = {}) {
  const { T } = ctx;
  const times = planTimes(T);
  const labels = [];
  times.forEach((ti, i) => {
    if (t < ti) return;
    const c = SLOT(i);
    const k = easeOutCubic(clamp((t - ti) / T.beats(0.75)));
    // the beam from me, for one beat, energy flowing along it
    const beam = 1 - clamp((t - ti - T.beats(0.5)) / T.beats(0.5));
    if (beam > 0) {
      const m = [(ME_V1[0] + c[0]) / 2, Math.max(ME_V1[1], c[1]) + 1, (ME_V1[2] + c[2]) / 2];
      const pts = Array.from({ length: 33 }, (_, q) => { const u = q / 32, v = 1 - u; return [0, 1, 2].map((d) => v * v * ME_V1[d] + 2 * v * u * m[d] + u * u * c[d]); });
      const head = Math.max(2, Math.ceil(33 * clamp((t - ti) / T.beats(0.25))));
      ctx.line(pts.slice(0, head), { color: COLOR.me, color2: COLOR.ink, width: 3, alpha: alpha * beam, glow: 14, glowStrength: 0.5, persp: 10.5, dash: 16, gap: 10, dashOffset: -(t - ti) * 500 });
    }
    burst(ctx, { center: c, seed: 130 + i, n: 900, r0: 0.1, r1: 1.6, p: (t - ti - T.beats(0.25)) / T.beats(1.2), focus: 10.5, aperture: 3, size: 3, color: COLOR.ink, color2: COLOR.warm });
    // the preview: drawn in, glowing gold, slowly turning toward the camera
    for (const pl of preview(i, t - ti, k)) {
      ctx.line(pl.map((q) => add3(q.map((v) => v * 0.7), c)), { color: COLOR.warm, width: 2.4, alpha: alpha * (0.6 + 0.4 * (1 - k)), glow: 10, glowStrength: 0.35, persp: 10.5 });
    }
    ctx.point3D(add3(c, [0, -0.66, 0]), 3.2, { fill: COLOR.warm, glow: 8, alpha: alpha * k, ref: 10.5 });
    labels.push({ p: add3(c, [0, -0.66, 0]), id: PLAN[i], text: PLAN[i], priority: 10 - i, o: { font: 'monoBold', size: 18, minSize: 16, maxSize: 20, color: COLOR.warm, alpha: alpha * k, ref: 10.5 } });
    // the route to the next step, drawn as it appears
    if (i > 0) {
      const p0 = add3(SLOT(i - 1), [0, -0.66, 0]), p1 = add3(c, [0, -0.66, 0]);
      const e = k;
      ctx.line([p0, [p0[0] + (p1[0] - p0[0]) * e, p0[1] + (p1[1] - p0[1]) * e, p0[2] + (p1[2] - p0[2]) * e]], { color: COLOR.dim, width: 1.4, alpha: alpha * 0.7, persp: 10.5, dash: 8, gap: 7 });
    }
  });
  labels3D(ctx, labels, { obstacles: times.map((_, i) => ({ p: SLOT(i), r: 60 })) });
}

export default chapter({
  id: 'inst1',
  from: start,
  to: (T) => T.cut(T.section('inst1').end),
  overlay(ctx) {
    const { T } = ctx;
    // the plan for verse 1 appears once the words have gone, one item per beat
    const at = planStart(T);
    const S = searches(T);
    transcript(ctx, 72, 190, ctx.memo('todo', () => {
      const { near } = galaxyData(ctx);
      const res = (q, from) => near[q].slice(0, 3).map(({ w, c }, k) => ({ kind: 'out', text: `${w.padEnd(13)}cos ${c.toFixed(2)}`, at: from + T.beats(0.5 * k + 0.25) }));
      return [
        { kind: 'tool', at: S[0].from, until: S[1].from - T.beats(0.25), name: 'Search', arg: 'nearest("me")', body: res('me', S[0].from) },
        { kind: 'tool', at: S[1].from, until: T.cut(T.barTime(14)), name: 'Search', arg: 'nearest("you")', body: res('you', S[1].from) },
        { kind: 'todo', at, until: T.section('inst1').end, items: PLAN.map((k, i) => ({ text: k, done: T.findWord(k).start, at: planTimes(T)[i] })) },
      ];
    }));
    // Claude thinking while the request runs: from the dive into the network until the plan
    const b10 = T.cut(T.barTime(10)), b12 = T.cut(T.barTime(12)), b14 = T.cut(T.barTime(14));
    if (ctx.t < b14 + T.beats(0.25)) thinking(ctx, 1848, 148, { from: b10, tokens: bpe(T).tokensAt(ctx.t), align: 'right', alpha: 1 - smoothstep(b14, b14 + T.beats(0.25), ctx.t) });
    // what the instrumental shots show, in the console (nothing is sung here)
    drawNote(ctx, 'forward pass: every word flows through 8 layers of weights', '前向傳播：每個字依序流過 8 層權重', { from: b10 + T.beats(1.5), to: b12 - T.beats(0.5) });
    drawNote(ctx, 'embedding space: words used alike sit close together', '詞向量空間：用法相近的字，彼此靠得近', { from: b12 + T.beats(1), to: b14 - T.beats(0.25) });
  },
  shots: [
    {
      id: 'prompt',
      hud: 'you › prompt',
      subs: false,
      at: start,
      draw(ctx) {
        const { T, t } = ctx;
        const k = easeInOutCubic(clamp((t - start(T)) / T.beats(4)));
        const cam = stage(ctx, t, k, 0.6);
        // me, above the prompt, pulses on each typed token
        const words = title(T).words;
        const lastTok = words.reduce((m, w) => (t >= w.start ? w : m), null);
        const pulse = lastTok ? decay((t - lastTok.start) / T.beats(1), 4) : 0;
        spark(ctx, cam, { pos: [0, 0.3, 0], px: SPARK_PX * (1 + 0.4 * pulse), rays: 0.35 + 0.3 * pulse });
        words.forEach((w, j) => burst(ctx, { center: [0, 0.3, 0], seed: 60 + j, n: 1600, r0: 0.2, r1: 4, p: (t - w.start) / T.beats(2), focus: 13, aperture: 2, size: 3.8, alpha: 1.3 }));
        ctx.camera2D();
        // the prompt box; one character per frame from each token's beat
        const { x, y, w, h, size } = PROMPT;
        const pop = easeOutCubic(clamp((t - start(T)) / T.beats(0.5)));
        const tx = x + 44 + ctx.measure('> ', { font: 'mono', size });
        // every token lands with a spray of you's sparks — drawn first, so the box keeps the text clear of them
        words.forEach((wd, j) => {
          const cx = tx + tokenX(ctx, j) + ctx.measure(wd.text, { font: 'mono', size }) / 2;
          burst(ctx, { center: [cx, y + h / 2, 0], seed: 50 + j, n: 500, r0: 40, r1: 300, p: (t - wd.start) / T.beats(1.2), perspective: false, size: 3.4, color: COLOR.ink, color2: COLOR.you, scatter: 10 });
        });
        ctx.rect(x, y, w, h, { fill: [...COLOR.bg2, 0.96], radius: 18 }); // opaque from the first frame (the first token lands one frame in)
        ctx.rect(x, y, w, h, { stroke: COLOR.dim, width: 2, radius: 18, alpha: pop });
        ctx.text('>', x + 44, y + h / 2 + size * 0.35, { font: 'mono', size, color: COLOR.me, alpha: pop });
        const r = ctx.text(typedTitle(ctx, t), tx, y + h / 2 + size * 0.35, { font: 'mono', size, color: COLOR.ink });
        const blink = Math.floor(T.beatAt(t) * 2) % 2 === 0;
        if (blink || t < words.at(-1).start + T.beats(1)) ctx.rect(r.x + r.width + 6, y + h / 2 - size * 0.5, size * 0.55, size, { fill: COLOR.you, glow: 10 });
        // the song's tokenizer splits every token underneath
        words.forEach((wd, j) => {
          const cx = tx + tokenX(ctx, j) + ctx.measure(wd.text, { font: 'mono', size }) / 2;
          tokenChips(ctx, wd, cx, y + h + 64, { at: wd.start, size: 24, label: false });
        });
        corners(ctx, { color: COLOR.faint });
      },
    },
    {
      id: 'enter',
      hud: 'Executing',
      subs: false,
      at: (T) => T.cut(T.beatTime(36)),
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = T.beatTime(36), t1 = T.cut(T.barTime(10));
        // the dive: the camera flies at the spinner and through it
        const k = clamp((t - t0 - T.beats(0.5)) / (t1 - t0 - T.beats(0.5)));
        const dist = lerp(9, 1.6, easeInCubic(k));
        const cam = { fov: 46, position: [0, 0, dist], target: [0, 0, dist - 10], up: [Math.sin(k * 1.2), Math.cos(k * 1.2), 0] };
        ctx.camera3D(cam);
        // speed ramps up with the dive; travelled = ∫ speed dt (closed form for speed = 4 + 26·k³)
        const tk = t1 - t0 - T.beats(0.5);
        const travelled = 4 * (t - t0) + (26 * tk * k ** 4) / 4;
        warp(ctx, travelled, 4 + 26 * k ** 3, smoothstep(0, 0.2, (t - t0) / (t1 - t0)), dist);
        // ✻ in 3D: arms cycle like Claude Code's spinner; near the end they open out of the frame and fade
        const steps = [[6, 0.85], [6, 1], [8, 1], [10, 0.9], [8, 1], [6, 0.9]]; // never 4 arms: it would read as an ×
        const q = Math.floor(T.beatAt(t) * 4), [arms, sz] = steps[q % steps.length];
        const open = 1 + 5 * easeInCubic(smoothstep(0.55, 1, k)), fadeArms = 1 - smoothstep(0.75, 1, k);
        for (let i = 0; i < arms; i++) {
          const a = (i / arms) * Math.PI * 2 + q * 0.05 + k * 2;
          ctx.line([[Math.cos(a) * 0.12 * open, Math.sin(a) * 0.12 * open, 0], [Math.cos(a) * 1.1 * sz * open, Math.sin(a) * 1.1 * sz * open, 0]], { color: COLOR.me, width: 9, alpha: fadeArms, glow: 22, glowStrength: 0.5, persp: 6, intensity: 1.2 });
        }
        const pe = clamp((t - t0) / T.beats(1.5));
        shockwave(ctx, { center: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], r: 1.2 + 6 * easeOutCubic(pe), alpha: 0.9 * (1 - pe), ref: 6, width: 4 });
        { const sp = ctx.project([0, 0, 0]); ctx.post({ rays: [sp[0], sp[1], 0.5 + 0.4 * k], bloom: 0.75 }); }
        ctx.camera2D();
        // Enter: the prompt text slides up into the transcript as the user's message (you's blue bar), and the spinner
        // reports the real elapsed time
        const e = easeOutCubic(clamp((t - t0) / T.beats(0.6)));
        const size = lerp(PROMPT.size, 30, e);
        const ty = lerp(PROMPT.y + PROMPT.h / 2 + PROMPT.size * 0.35, 230, e), tx = lerp(PROMPT.x + 44, 120, e);
        const fade = 1 - smoothstep(0.55, 0.85, k);
        ctx.rect(PROMPT.x, PROMPT.y, PROMPT.w, PROMPT.h, { fill: [...COLOR.bg2, 0.94], stroke: COLOR.dim, width: 2, radius: 18, alpha: 1 - e });
        ctx.rect(96, 186, 620, 140, { fill: [...COLOR.bg, 0.8], radius: 8, alpha: e * fade }); // keeps the streaks off the text
        ctx.rect(100, 204, 4, 34, { fill: COLOR.you, alpha: e * fade });
        ctx.text('>', tx, ty, { font: 'mono', size, color: COLOR.me, alpha: fade });
        ctx.text('world.execute(me);', tx + ctx.measure('> ', { font: 'mono', size }), ty, { font: 'mono', size, color: COLOR.ink, alpha: fade });
        spinner(ctx, 128, 300, { r: 12, alpha: e * fade });
        ctx.text(`Executing… (${Math.max(0, t - t0).toFixed(1)}s · esc to interrupt)`, 152, 308, { font: 'mono', size: 24, color: COLOR.me, alpha: e * fade });
        corners(ctx, { color: COLOR.faint });
      },
    },
    {
      id: 'forward',
      hud: 'forward pass · schematic · 1 untrained head',
      at: (T) => T.cut(T.barTime(10)),
      transitionIn: { type: 'glide', beats: 1 },
      draw(ctx) {
        const { T, t } = ctx;
        const a = T.cut(T.barTime(10)), b = T.cut(T.barTime(12));
        const k = clamp((t - a) / (b - a));
        // one layer per beat: the camera advances a whole layer gap each beat (eased within the beat), 33° off-axis
        const bt = Math.max(0, T.beatAt(t) - T.beatAt(T.barTime(10)));
        const step = Math.floor(bt) + easeInOutCubic(bt % 1);
        const z = 8.5 - GAP * Math.min(step, LAYERS - 0.5);
        const cam = { fov: 50, position: [4.6, 2.4, z], target: [0, 0, z - 7.5], up: [0, 1, 0] };
        ctx.camera3D(cam);
        dust(ctx, { focus: 7, time: t * 0.6, alpha: 0.6 });
        // the warp of the dive runs on and slows down as we enter the network
        const dec = easeOutCubic(clamp((t - a) / T.beats(1.5)));
        if (dec < 1) warp(ctx, 30 * (t - a) * (1 - 0.5 * dec), 30 * (1 - dec), 1 - dec, z);
        // each beat a different (later) word is the query in the layer ahead
        const { n } = fwdData(ctx);
        const beat = Math.floor(bt);
        const fa = smoothstep(0, 0.6, dec + 0.15);
        const { zEnd, query, key, w } = forward(ctx, cam, t, { alpha: fa, focusLayer: Math.min(LAYERS - 1, beat + 1), query: Math.max(2, n - 1 - beat * 4) });
        // a pulse runs down the network on every beat
        const f = (T.beatAt(t) % 1);
        const zp = 6 - f * (6 - zEnd);
        ctx.line([[-HALF, -HALF, zp], [HALF, -HALF, zp], [HALF, HALF, zp], [-HALF, HALF, zp], [-HALF, -HALF, zp]], { color: COLOR.me, width: 3, alpha: 0.7 * (1 - f), glow: 12, persp: 7 });
        spark(ctx, cam, { pos: [0, 0, zEnd - 14], px: lerp(50, 170, easeInCubic(k)), rays: 0.55 + 0.4 * k });
        ctx.camera2D();
        // this beat's query and the word it attends to most (real weight), one line, bottom right
        const qa = fa * (beat ? 1 : smoothstep(0, 0.12, bt % 1));
        const cap = `→ ${key} · ${Math.round(w * 100)}%`;
        const capW = ctx.measure(cap, { font: 'mono', size: 24 });
        ctx.text(cap, 1840, 990, { font: 'mono', size: 24, align: 'right', color: COLOR.warm, alpha: qa });
        ctx.text(query, 1840 - capW - 16, 990, { font: 'monoBold', size: 24, align: 'right', color: COLOR.me, alpha: qa });
        ctx.text('attention', 1840, 950, { font: 'mono', size: 16, align: 'right', color: COLOR.dim, alpha: qa });
        corners(ctx, { color: COLOR.faint });
      },
    },
    {
      id: 'galaxy',
      hud: 'embedding space · 145 words · PPMI-SVD',
      at: (T) => T.cut(T.barTime(12)),
      transitionIn: { type: 'xfade', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const a = T.cut(T.barTime(12)), b = T.cut(T.barTime(14));
        const k = clamp((t - a) / (b - a));
        const cam = orbit({ target: add3([0.4, -0.5, 0], shake(t, 0.03, 6)), r: lerp(15, 13.5, easeInOutCubic(k)), az: -0.4 + 1.1 * easeInOutCubic(k), el: lerp(0.4, 0.25, k), fov: 40 });
        ctx.camera3D(cam);
        embers(ctx, { radius: [3, 12], squash: 0.6, n: 2600, focus: 13, aperture: 5, size: 3, alpha: 0.6, color: COLOR.dim, color2: COLOR.ink2, seed: 76 });
        embers(ctx, { radius: [35, 60], squash: 0.8, n: 1800, focus: 0, size: 2.2, alpha: 0.7, drift: 0.05, color: COLOR.ink2, seed: 77 });
        // me arrives from the end of the network (out of the camera) to its place among the words
        const arrive = easeOutCubic(clamp((t - a) / T.beats(2.5)));
        const pm = galaxy(ctx, t, { search: searches(T) });
        spark(ctx, cam, { pos: lerp3(add3(cam.position, [0, -0.4, -1.5]), pm, arrive), rays: 0.4 });
        burst(ctx, { center: pm, seed: 55, n: 1800, r0: 0.2, r1: 3.5, p: (t - a - T.beats(2.5)) / T.beats(2), focus: 13, aperture: 3, size: 3.2 });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'plan',
      hud: 'embedding space · plan',
      at: (T) => T.cut(T.barTime(14)),
      draw(ctx) {
        const { T, t } = ctx;
        const a = T.cut(T.barTime(14)), b = T.cut(T.section('inst1').end);
        const k = easeInOutCubic(clamp((t - a) / (b - a)));
        // hard cut on the downbeat: the words fall silent (no labels), a shockwave leaves me, and me builds the cloud
        // of verse 1 while moving to where it watches it from; the camera lands where v1.points begins
        const from = orbit({ target: [0, 0.3, 0], r: 13.5, az: 0.7, el: 0.25, fov: 40 });
        const to = v1Camera(0);
        const cam = { fov: lerp(from.fov, to.fov, k), position: lerp3(from.position, to.position, k), target: lerp3(from.target, to.target, k), up: [0, 1, 0] };
        ctx.camera3D(cam);
        dust(ctx, { focus: 10.5, alpha: k });
        halo(ctx, { alpha: smoothstep(0.2, 0.9, k) });
        galaxy(ctx, t, { alpha: 1 - smoothstep(0, 0.45, k), labels: 0 }); // the searches end in the shockwave
        const { pm } = galaxyData(ctx);
        const sp = lerp3(pm, ME_V1, easeInOutCubic(clamp((t - a) / T.beats(1.5)))); // me moves first, then builds
        const pe = clamp((t - a) / T.beats(2));
        shockwave(ctx, { center: pm, r: 0.3 + 7 * easeOutCubic(pe), alpha: 0.9 * (1 - pe), ref: 12, width: 3.5 });
        shockwave(ctx, { center: pm, u: [1, 0, 0], v: [0, 1, 0], r: 0.3 + 5 * easeOutCubic(pe), alpha: 0.6 * (1 - pe), ref: 12, width: 2.5, color: COLOR.warm });
        // the jet: particles leave me, fly out and land on the cloud's start positions (v1.points begins on them)
        const kb = clamp((t - a - T.beats(1.5)) / (b - a - T.beats(2.5)));
        stream(ctx, { key: 'cloud', source: ME_V1, targets: () => cloud(ctx).geometry.getAttribute('aFrom').array.slice(), p: kb * 1.1, stagger: 0.85, size: 5, focus: 10.5, aperture: 6, scatter: 1.4, color: COLOR.me, color2: COLOR.ink2, alpha: 1, fog: [6, 17] });
        // the plan for verse 1: a roadmap of four previews, one per todo item (fades out into verse 1)
        roadmap(ctx, t, { alpha: 1 - smoothstep(b - T.beats(1), b, t) });
        // a fountain that never stops: three phased jets of 450 particles, always some in flight
        for (let jx = 0; jx < 3; jx++) {
          const fr = (T.beatAt(t) / 2 + jx / 3) % 1;
          const jetTargets = () => {
            const c = cloud(ctx).geometry.getAttribute('aFrom').array, m = c.length / 3, out = new Float32Array(450 * 3);
            for (let i = 0; i < 450; i++) { const s0 = (i * 3 + jx * 7) % m; out.set([c[s0 * 3], c[s0 * 3 + 1], c[s0 * 3 + 2]], i * 3); }
            return out;
          };
          stream(ctx, { key: 'jet' + jx, seed: 120 + jx, source: ME_V1, targets: jetTargets, p: fr * 1.05, stagger: 0.7, size: 5, focus: 10.5, aperture: 4, scatter: 1.8, color: COLOR.me, color2: COLOR.warm, alpha: smoothstep(0, 0.4, kb) * (1 - smoothstep(0.82, 1, fr)), fog: [6, 17] });
        }
        // and on every beat a burst of sparks from me (decaying over 3/4 of a beat)
        const bt = T.beatAt(t), f = bt - Math.floor(bt);
        burst(ctx, { center: sp, seed: 90 + (Math.floor(bt) % 3), n: 1600, r0: 0.1, r1: 3, p: f / 0.75, focus: 10.5, aperture: 3, size: 3, color: COLOR.ink, color2: COLOR.me });
        // the last beat into verse 1: a flare from me
        const last = clamp((t - (b - T.beats(1))) / T.beats(1));
        burst(ctx, { center: sp, seed: 95, n: 2600, r0: 0.2, r1: 5, p: last, focus: 10.5, aperture: 3, size: 3.6, alpha: 1.2 });
        // you is out there: a blue point beside the cloud, from bar 15
        const ya = smoothstep(T.barTime(15), T.barTime(15) + T.beats(1), t);
        if (ya > 0) ctx.point3D(YOU_V1, 6 + 2 * decay(f, 4), { fill: COLOR.you, glow: 16, alpha: ya, ref: 10.5 });
        spark(ctx, cam, { pos: sp, rays: 0.4 + 0.5 * last });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
  ],
});
