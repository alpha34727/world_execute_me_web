// 00 intro — me is created: power on, a protective shell, the vocabulary laid down as pieces (you appears), the
// object me {} is created and its parameters filled, weights initialised, the world set up, the simulation begins.
// Storyboard: docs/storyboard.md §00 · review: docs/review/intro.md.
import { chapter } from '../engine/timeline.js';
import { COLOR, HEX } from '../theme.js';
import { corners } from '../lib/hud.js';
import { hero } from '../lib/hero.js';
import { clamp, lerp, mix3, easeOutCubic, easeInOutCubic, smoothstep, decay } from '../lib/ease.js';
import { randn, rand } from '../lib/hash.js';
import { drawSpark, sparkSize } from '../lib/spark.js';
import { orbit, shake, add3 } from '../lib/camera.js';
import { axisGizmo, dust } from '../lib/scene3d.js';
import { drawPrediction } from '../lib/predict.js';
import { transcript } from '../lib/cc.js';
import { bpe } from '../lib/bpe.js';
import { embeddings } from '../lib/embed.js';
import { Swarm } from '../engine/gl/swarm.js';
import { geodesic } from './intro/geodesic.js';
import { CUBE, NW, SIGMA, weight, Y0, world, atmosphere } from './intro/stage.js';
import { embers, burst, stream, shockwave, sampleSegments } from '../lib/fx.js';
import * as THREE from 'three';

const L = (T, text, n = 0) => T.findLine(text, n, 'intro').words[0].start;
const W = (T, text) => T.findWord(text, 0, 'intro');
const SPARK_PX = 70; // the spark's on-screen size is constant across the chapter (rays ≈ 70 design px)

// beat-quantised progress: how many 16th-note steps of [a, b) have started by t, as a fraction
function steps16(T, a, b, t) {
  const total = Math.max(1, Math.ceil((T.beatAt(b) - T.beatAt(a)) * 4 - 1e-6));
  const done = Math.floor((T.beatAt(t) - T.beatAt(a)) * 4 + 1e-6) + 1;
  return { k: clamp(done / total), done: clamp(done, 0, total), total };
}

// the spark at a constant screen size for the current camera, with light shafts from it
function spark(ctx, cam, { pos = [0, 0, 0], px = SPARK_PX, rays = 0.3 } = {}) {
  drawSpark(ctx, { pos, size: sparkSize(cam, px, pos) });
  if (rays > 0) { const sp = ctx.project(pos); ctx.post({ rays: [sp[0], sp[1], rays * 1.3], bloom: 0.72 }); }
}

// ---- intro.04/05: the BPE vocabulary as pieces on a board ----------------------------------------------------
const COLS = 13, SP = 0.7, TILE = 0.31;
const tileAt = (T, i) => { const R = Math.ceil(bpe(T).vocab.length / COLS); return [((i % COLS) - (COLS - 1) / 2) * SP, (Math.floor(i / COLS) - (R - 1) / 2) * SP]; };
const tilted = (tilt) => { const ca = Math.cos(tilt), sa = Math.sin(tilt); return (x, z, y = 0) => [x, y * ca - z * sa, z * ca + y * sa]; };
function board(ctx, { rows, tilt = 0, newest = -1, flash = 0, alpha = 1, textAlpha = 1, cursor = true, ref = 10 }) {
  const { T } = ctx;
  const vocab = bpe(T).vocab;
  const P = tilted(tilt);
  for (let i = 0; i < vocab.length; i++) {
    const r = Math.floor(i / COLS), c = i % COLS;
    if (r >= rows) break;
    const [x, z] = tileAt(T, i);
    const drop = r === newest ? 0.3 * (1 - flash) : 0;
    const sq = [[-TILE, -TILE], [TILE, -TILE], [TILE, TILE], [-TILE, TILE], [-TILE, -TILE]].map(([dx, dz]) => P(x + dx, z + dz, drop));
    const s = vocab[i];
    const merged = s.length > 1;
    const hot = r === newest ? flash : 0;
    ctx.line(sq, { color: merged ? COLOR.ink2 : COLOR.faint, width: 1.3, alpha: alpha * (0.55 + 0.45 * hot), persp: ref, fog: [ref - 2, ref + 10] });
    ctx.text3D(s, P(x, z, drop + 0.02), { font: merged ? 'monoBold' : 'mono', size: clamp((20 * 4) / Math.max(4, s.length), 12, 20), align: 'center', baseline: 'middle', color: merged ? COLOR.ink : COLOR.dim, alpha: alpha * textAlpha * (0.75 + 0.25 * hot), ref, fog: [ref - 1, ref + 10] });
    if (cursor && r === rows - 1 && (c === COLS - 1 || i === vocab.length - 1)) {
      // you, laying the pieces down: a blue caret around the newest tile
      const k = TILE + 0.07;
      ctx.line([[-k, -k], [k, -k], [k, k], [-k, k], [-k, -k]].map(([dx, dz]) => P(x + dx, z + dz, drop)), { color: COLOR.you, width: 2.4, alpha, persp: ref, glow: 8 });
      ctx.text3D('you', P(x + 0.55, z - 0.1, drop + 0.25), { font: 'mono', size: 20, color: COLOR.you, alpha, ref });
    }
  }
}

// rounded-rect perimeter as a polyline (design px), revealed up to fraction k
function roundRect(x, y, w, h, r, k) {
  const pts = [];
  const arc = (cx, cy, a0) => { for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  pts.push([x + r, y]); arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI); pts.push([x + r, y]);
  if (k >= 1) return pts;
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let left = seg.reduce((a, b) => a + b, 0) * k;
  const out = [pts[0]];
  for (let i = 0; i < seg.length && left > 0; i++) {
    const f = Math.min(1, left / seg[i]);
    out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]);
    left -= seg[i];
  }
  return out;
}

// ---- intro.06/07: object me { } — a wireframe box grown out of the spark; filling its fields changes it -------
const BOX = 1.05;
// scale: 0..1 grows the box out of its centre; color: 0 = uncoloured (ink), 1 = me; ticks: 0..1 (dim: 16)
function objectBox(ctx, { scale = 1, color = 0, ticks = 0, ref = 7.6, alpha = 1 } = {}) {
  const col = mix3(COLOR.ink2, COLOR.me, color);
  const s = BOX * scale;
  for (const [a, b] of CUBE) {
    const A = a.map((v) => v * s), B = b.map((v) => v * s);
    ctx.line([A, B], { color: col, width: 2, alpha: alpha * 0.85, persp: ref, glow: 4 + 6 * color, glowStrength: 0.25 });
    if (ticks > 0) {
      // dim: 16 — every edge divided into 16
      const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
      const n = a.map((v, j) => (v === b[j] ? v : 0)); // outward direction (the two fixed coordinates)
      for (let i = 1; i < 16; i++) {
        const p = [A[0] + (d[0] * i) / 16, A[1] + (d[1] * i) / 16, A[2] + (d[2] * i) / 16];
        const L = (i % 4 ? 0.04 : 0.08) * ticks;
        ctx.line([p, [p[0] + n[0] * L, p[1] + n[1] * L, p[2] + n[2] * L]], { color: col, width: 1.2, alpha: alpha * 0.8 * ticks, persp: ref });
      }
    }
  }
}

// camera shared by object/params: k = 0 frames the box under the headline, k = 1 pushes it back, right of the terminal
function boxCam(T, t, k) {
  const wo = W(T, 'OBJECT').start;
  return orbit({ target: [lerp(0, -1.5, k), lerp(0.55, 0.2, k), 0], r: lerp(7.6, 9.4, k), az: 0.55 + 0.15 * (t - wo), el: 0.24, fov: 38 });
}

export default chapter({
  id: 'intro',
  to: (T) => T.cut(T.section('inst1').start), // chapter cuts land 1 frame before the downbeat, like shot cuts
  overlay(ctx) {
    const { T } = ctx;
    const s = L(T, 'Fill in my data parameters');
    const b = (n) => s + T.beats(n);
    transcript(ctx, 72, 190, ctx.memo('session', () => [{
      kind: 'tool', at: T.cut(s), until: T.cut(W(T, 'INITIALIZATION').start), name: 'Write', arg: 'me.js', body: [
        { kind: 'out', text: 'object me {', at: T.cut(s) },
        { kind: 'out', text: '  name: "claude",', at: b(0.5) },
        { kind: 'out', text: `  tokens: ${bpe(T).total},`, at: b(1.5) },
        { kind: 'out', text: `  dim: ${embeddings(T).dim},`, at: b(2.5) },
        { kind: 'out', text: `  color: "${HEX.me}",`, at: b(3.5) },
        { kind: 'dim', text: '  love: undefined', at: b(4.25) },
        { kind: 'out', text: '}', at: b(4.75) },
      ],
    }]));
    // the first prediction of the film: open while "And let's begin the" is sung, the context arrives on "the"
    drawPrediction(ctx, { x: 1460, y: 330, from: T.cut(L(T, "And let's begin the")), prev: T.line(9).words.at(-1), next: W(T, 'SIMULATION') });
  },
  shots: [
    {
      id: 'power',
      hud: 'power on · RC step response',
      at: (T) => T.section('intro').start,
      draw(ctx) {
        const { T, t } = ctx;
        const tOn = T.line(0).words[0].start; // the switch closes on "Switch"
        const RC = T.beats(1.1);
        const end = T.cut(L(T, 'Remember to put on'));
        const k = easeInOutCubic(clamp(t / end));
        // the oscilloscope is a plane in space (1 unit = 100 design px), seen slightly from the side, slowly pushed in
        const cam = orbit({ target: add3([0.3 * k, 0.2, 0], shake(t, 0.015, 2)), r: lerp(13.4, 12.2, k), az: lerp(0.34, 0.14, k), el: lerp(0.12, 0.05, k), fov: 40 });
        ctx.camera3D(cam);
        const P = ([x, y]) => [(x - 960) / 100, (540 - y) / 100, 0];
        dust(ctx, { focus: 11, time: t * 0.3, alpha: 0.7 });
        embers(ctx, { center: [0, 0, -4], radius: [3, 10], squash: 0.6, n: 1800, focus: 11, aperture: 6, size: 3, alpha: 0.5 * smoothstep(tOn, tOn + T.beats(2), t), seed: 74 });
        const X0 = 360, X1 = 1560, Y0s = 290, Y1s = 890, base = 760, amp = 380;
        const g = { color: COLOR.faint, width: 1, persp: 11 };
        // graticule: 10 × 8 divisions, centre axes with minor ticks
        for (let i = 0; i <= 10; i++) ctx.line([P([X0 + i * 120, Y0s]), P([X0 + i * 120, Y1s])], { ...g, alpha: i % 5 ? 0.4 : 0.7 });
        for (let j = 0; j <= 8; j++) ctx.line([P([X0, Y0s + j * 75]), P([X1, Y0s + j * 75])], { ...g, alpha: j % 4 ? 0.4 : 0.7 });
        for (let i = 0; i <= 50; i++) ctx.line([P([X0 + i * 24, 590 - 5]), P([X0 + i * 24, 590 + 5])], { ...g, alpha: 0.55 });
        // the trace: the time base sweeps across over the shot; V(t) = 1 - e^(-t/RC) after the switch
        const V = (u) => (u < tOn ? 0 : 1 - Math.exp(-(u - tOn) / RC));
        const sx = (u) => X0 + ((X1 - X0) * u) / end;
        const n = 240, pts = [];
        for (let i = 0; i <= n; i++) { const u = (t * i) / n; pts.push(P([sx(u), base - amp * V(u)])); }
        ctx.line(pts, { color: COLOR.me, width: 18, alpha: 0.16, glow: 30, glowStrength: 0.5, persp: 11 }); // phosphor bloom
        ctx.line(pts, { color: COLOR.me, width: 3.4, glow: 12, glowStrength: 0.4, persp: 11 });
        const head = P([sx(t), base - amp * V(t)]);
        const charge = V(t);
        ctx.point3D(head, 4 + 3 * charge, { fill: COLOR.ink, glow: 18 + 20 * charge, glowStrength: 0.6, intensity: 1.2, ref: 11 });
        // on every beat after the switch the head throws sparks; light shafts radiate from it
        const hp = ctx.project(head);
        if (t >= tOn) {
          const bt = T.beatAt(t), pb = bt - Math.floor(bt);
          burst(ctx, { center: head, seed: 83 + (Math.floor(bt) % 3), n: 700, r0: 0.04, r1: 1.4 + 1.2 * charge, p: pb, focus: 11, aperture: 3, size: 3.2, alpha: 0.7 + 0.5 * charge, scatter: 0.08 });
          ctx.post({ rays: [hp[0], hp[1], 0.45 * charge], bloom: 0.72 });
        }
        ctx.text3D('V(t) = 1 − e^(−t/RC)', P([X0, Y0s - 26]), { font: 'mono', size: 20, color: COLOR.dim, alpha: smoothstep(tOn, tOn + T.beats(0.5), t), ref: 11 });
        // the head becomes the seed of the spark
        const seed = smoothstep(end - T.beats(1.5), end, t);
        if (seed > 0) drawSpark(ctx, { pos: head, size: sparkSize(cam, 34 * seed, head) });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
      },
    },
    {
      id: 'shield',
      hud: 'geodesic shell · 162 vertices · 480 edges',
      at: (T) => T.cut(L(T, 'Remember to put on')),
      transitionIn: { type: 'glide', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const a = T.cut(L(T, 'Remember to put on')), b = W(T, 'PROTECTION').start;
        const g = ctx.memo('geo', () => geodesic(2, 1.55));
        const cam = orbit({ target: add3([0, 0, 0], shake(t, 0.02, 3)), r: 5.6, az: 0.3 + 0.25 * (t - a), el: 0.35, fov: 38 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 5.6, time: 0 });
        // edges join from the base upward, one batch per 16th note; the newest batch flashes
        const st = steps16(T, a, b, t);
        const n = Math.round((g.edges.length * st.done) / st.total);
        const nPrev = Math.round((g.edges.length * (st.done - 1)) / st.total);
        const fresh = 1 - clamp(((T.beatAt(t) * 4) % 1) / 0.8);
        const used = new Set();
        for (let i = 0; i < n; i++) {
          const [p, q] = g.edges[i];
          used.add(p); used.add(q);
          const hot = i >= nPrev ? fresh : 0;
          ctx.line([g.verts[p], g.verts[q]], { color: hot > 0 ? COLOR.me : COLOR.ink2, width: 1.4 + hot, alpha: 0.5 + 0.5 * hot, persp: 5.6, fog: [4, 8], glow: 6 * hot });
        }
        for (const v of used) ctx.point3D(g.verts[v], 2.2, { fill: COLOR.ink2, ref: 5.6, fog: [4, 8], alpha: 0.8 });
        // the shell's material streams out of the spark and settles on its edges
        stream(ctx, { key: 'shell', targets: () => sampleSegments(g.edges.map(([p, q]) => [g.verts[p], g.verts[q]]), 14, 7, 0.015), p: st.k * 1.15, focus: 5.6, aperture: 5, size: 2.6, color: COLOR.ink, color2: COLOR.me });
        embers(ctx, { radius: [2.2, 6], n: 2200, focus: 5.6, aperture: 5, size: 3.2, alpha: 0.85 });
        // the seed grows into the spark inside its shell
        spark(ctx, cam, { px: lerp(30, SPARK_PX, clamp((t - a) / (b - a))), rays: 0.35 });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'protection',
      hud: 'sandbox: on',
      at: (T) => T.cut(W(T, 'PROTECTION').start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'PROTECTION');
        const dt = t - w.start;
        const g = ctx.memo('geo', () => geodesic(2, 1.55));
        const cam = orbit({ target: [0, 0.75, 0], r: 8, az: 0.75 + 0.25 * dt + 0.5 * easeOutCubic(clamp(dt / T.beats(1))), el: 0.3, fov: 38 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8, time: 0 });
        const flash = decay(dt / T.beats(1), 3);
        for (const [p, q] of g.edges) ctx.line([g.verts[p], g.verts[q]], { color: flash > 0.05 ? COLOR.me : COLOR.ink2, width: 1.4 + flash, alpha: 0.55 + 0.45 * flash, persp: 8, fog: [6, 11], glow: 10 * flash, glowStrength: 0.3 });
        const pe = clamp(dt / T.beats(2.2));
        burst(ctx, { seed: 84, n: 3600, r0: 1.5, r1: 7, p: pe, focus: 8, aperture: 3, size: 3.6, alpha: 1.2 });
        shockwave(ctx, { r: 1.55 + 5 * easeOutCubic(pe), alpha: 0.9 * (1 - pe), ref: 8 });
        shockwave(ctx, { r: 1.55 + 3.4 * easeOutCubic(pe), u: [1, 0, 0], v: [0, 1, 0], alpha: 0.6 * (1 - pe), color: COLOR.warm, width: 2, ref: 8 });
        embers(ctx, { radius: [2.2, 7], n: 2200, focus: 8, aperture: 5, size: 3.4, alpha: 0.85 });
        spark(ctx, cam, { px: SPARK_PX * (1 + 0.3 * flash), rays: 0.35 + 0.3 * flash });
        ctx.camera2D();
        hero(ctx, w, 960, 175, { size: 112 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'pieces',
      hud: 'vocabulary · BPE · 173 tokens',
      at: (T) => T.cut(L(T, 'Lay down your pieces')),
      transitionIn: { type: 'points', beats: 1 },
      draw(ctx) {
        const { T, t } = ctx;
        const a = T.cut(L(T, 'Lay down your pieces')), b = T.cut(L(T, "And let's begin"));
        const k = easeInOutCubic(clamp((t - a) / (b - a)));
        const cam = orbit({ target: add3([0, 0, -0.5], shake(t, 0.02, 7)), r: 12.4, az: 0.2 + 0.1 * k, el: lerp(1.15, 0.86, k), fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 12, time: 0 });
        // one row of 13 pieces lands per 16th note
        const R = Math.ceil(bpe(T).vocab.length / COLS);
        const st = steps16(T, a, b - T.beats(0.25), t);
        const rows = Math.max(1, Math.round(R * st.k));
        board(ctx, { rows, newest: rows - 1, flash: 1 - clamp(((T.beatAt(t) * 4) % 1) / 0.6), ref: 12 });
        embers(ctx, { center: [0, 1.2, 0], radius: [1, 9], squash: 0.3, n: 1800, focus: 12, aperture: 14, alpha: 0.55, color2: COLOR.warm });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'begin',
      hud: "let's begin",
      at: (T) => T.cut(L(T, "And let's begin")),
      transitionIn: { type: 'xfade', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const a = T.cut(L(T, "And let's begin")), b = T.cut(W(T, 'OBJECT').start);
        const k = easeOutCubic(clamp((t - a) / T.beats(1)));
        // the board stands up into a wall while the camera pulls back to keep it inside the frame
        const tilt = (Math.PI / 2) * 0.94 * k;
        const cam = orbit({ target: [0, 0, -0.5 * (1 - k)], r: lerp(12.4, 17, k), az: 0.3 * (1 - k), el: lerp(0.86, 0.06, k), fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 15, time: 0 });
        board(ctx, { rows: 99, tilt, alpha: 1 - 0.35 * k, textAlpha: lerp(1, 0.3, k), cursor: false, ref: 15 });
        embers(ctx, { center: [0, 0, 2], radius: [1, 10], squash: 0.6, n: 1800, focus: 15, aperture: 14, alpha: 0.5, color2: COLOR.warm });
        // you's caret leaves the board and flies into the prompt box
        const vocab = bpe(T).vocab;
        const [cx, cz] = tileAt(T, vocab.length - 1);
        const p0 = ctx.project(tilted(tilt)(cx, cz));
        ctx.camera2D();
        const kb = easeInOutCubic(clamp((t - a - T.beats(0.1)) / T.beats(1.2)));
        ctx.rect(560, 470, 800, 120, { fill: COLOR.bg2, radius: 16 });
        ctx.line(roundRect(560, 470, 800, 120, 16, kb), { color: COLOR.dim, width: 1.6 });
        if (kb > 0.6) ctx.text('>', 596, 542, { font: 'mono', size: 34, color: COLOR.me, alpha: smoothstep(0.6, 1, kb) });
        const kc = easeInOutCubic(clamp((t - a) / (b - a - T.beats(0.2))));
        const cw = lerp(44, 16, kc), ch = lerp(44, 36, kc);
        const cxs = lerp(p0[0], 640, kc), cys = lerp(p0[1], 530, kc);
        ctx.rect(cxs - cw / 2, cys - ch / 2, cw, ch, { stroke: COLOR.you, width: 2.4, fill: [...COLOR.you, kc], glow: 8, radius: 3 });
        corners(ctx, { color: COLOR.faint });
      },
    },
    {
      id: 'object',
      hud: 'object me {}',
      at: (T) => T.cut(W(T, 'OBJECT').start),
      draw(ctx) {
        const { T, t } = ctx;
        const wo = W(T, 'OBJECT'), wc = W(T, 'CREATION');
        const cam = boxCam(T, t, 0);
        ctx.camera3D(cam);
        dust(ctx, { focus: 7.6, time: 0 });
        // the box grows out of the spark between OBJECT and CREATION — uncoloured: no parameters yet
        const grow = easeOutCubic(clamp((t - wo.start) / (wc.start + T.beats(0.5) - wo.start)));
        objectBox(ctx, { scale: grow });
        stream(ctx, { key: 'box', targets: () => sampleSegments(CUBE.map(([p, q]) => [p.map((v) => v * BOX), q.map((v) => v * BOX)]), 160, 9, 0.012), p: grow * 1.1, focus: 7.6, aperture: 5, size: 2.4 });
        embers(ctx, { radius: [1.8, 7], n: 2200, focus: 7.6, aperture: 5, size: 3.4, alpha: 0.85 });
        spark(ctx, cam, { rays: 0.35 });
        const code = 'object me {';
        const t60 = wo.start + (1 - Math.cbrt(0.4)) * (wc.start + T.beats(0.5) - wo.start); // grow = 0.6
        const nc = Math.floor((t - t60) * 40);
        if (nc > 0) ctx.text3D(code.slice(0, nc), [-BOX * grow, BOX * grow + 0.22, BOX * grow], { font: 'mono', size: 26, color: COLOR.ink2, ref: 7.6 });
        if (grow > 0.98) ctx.text3D('}', [BOX + 0.55, -BOX, BOX], { font: 'mono', size: 26, color: COLOR.ink2, ref: 7.6, baseline: 'middle' });
        ctx.camera2D();
        // OBJECT CREATION set as one line; each word lands on its own sung frame
        const o = { font: 'display', size: 104, tracking: 0.06 };
        const w1 = ctx.measure(wo.text, o), w2 = ctx.measure(wc.text, o), gap = 44;
        const x0 = 960 - (w1 + gap + w2) / 2;
        hero(ctx, wo, x0, 175, { size: 104, align: 'left', chips: false });
        hero(ctx, wc, x0 + w1 + gap, 175, { size: 104, align: 'left', chips: false });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'params',
      hud: 'Write(me.js)',
      at: (T) => T.cut(L(T, 'Fill in my data parameters')),
      transitionIn: { type: 'xfade', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const s = L(T, 'Fill in my data parameters');
        const f = (n) => s + T.beats(n); // the field times (same as the terminal in the overlay)
        // continues the object shot's camera (one spark through the cross-fade), then pushes the box back
        const cam = boxCam(T, t, easeInOutCubic(clamp((t - s) / T.beats(2))));
        ctx.camera3D(cam);
        dust(ctx, { focus: 9, time: 0 });
        // each field changes the object: name -> a label, tokens -> 617 points inside, dim -> 16 ticks per edge,
        // color -> the edges turn orange; love stays undefined
        const on = (n) => easeOutCubic(clamp((t - f(n)) / T.beats(0.5)));
        objectBox(ctx, { color: on(3.8), ticks: on(2.5), ref: 9, alpha: 0.85 });
        const N = bpe(T).total;
        const sw = ctx.memo('tokens', () => {
          const pts = new Float32Array(N * 3);
          for (let i = 0; i < N; i++) for (let d = 0; d < 3; d++) pts[i * 3 + d] = (rand(i, d, 61) * 2 - 1) * BOX * 0.92;
          return new Swarm({ from: pts, seed: 62 });
        });
        if (on(1.5) > 0) ctx.swarm(sw, { p: 0, size: 2.6, perspective: true, focus: 9, aperture: 3, color: mix3(COLOR.ink2, COLOR.me, on(3.8)), alpha: 0.85 * on(1.5), drift: 0.03, time: t * 0.3, model: new THREE.Matrix4().makeRotationY(0.6 * (t - f(1.5))) });
        embers(ctx, { radius: [2, 8], n: 2400, focus: 9, aperture: 5, size: 3.4, alpha: 0.85 });
        if (on(0.5) > 0) ctx.text3D('claude', [-BOX, BOX + 0.24, BOX], { font: 'monoBold', size: 26, color: mix3(COLOR.ink2, COLOR.me, on(3.8)), alpha: on(0.5), ref: 9 });
        const pulse = decay((T.beatAt(t) - T.beatAt(s) - 0.5) % 1, 6);
        spark(ctx, cam, { px: SPARK_PX * (1 + 0.15 * pulse), rays: 0.35 });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'init',
      hud: 'He init · N(0, 2/16) · 16 × 16',
      at: (T) => T.cut(W(T, 'INITIALIZATION').start),
      transitionIn: { type: 'points', beats: 1 },
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'INITIALIZATION');
        const dt = t - w.start;
        const cam = orbit({ target: [0, 0.85, 0], r: 9.4, az: 0.55 + 0.22 * dt, el: 0.36, fov: 38 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 9.4, time: 0 });
        // weights grow in a diagonal wave; positive up in orange, negative down in gold; tops joined into a surface
        const gs = 0.3, H = 1.3;
        const appear = (i, j) => w.start - T.beats(0.25) + ((i + j) / (2 * NW - 2)) * T.beats(1.2);
        const top = (i, j) => { const e = easeOutCubic(clamp((t - appear(i, j)) / T.beats(0.35))); return [(i - (NW - 1) / 2) * gs, weight(i, j) * H * e, (j - (NW - 1) / 2) * gs, e]; };
        let shown = 0;
        for (let i = 0; i < NW; i++) for (let j = 0; j < NW; j++) {
          const [x, y, z, e] = top(i, j);
          if (e <= 0) continue;
          shown++;
          ctx.line([[x, 0, z], [x, y, z]], { color: y >= 0 ? COLOR.me : COLOR.warm, width: 4.5, alpha: 0.8, persp: 9.4, fog: [7, 13], glow: 6, glowStrength: 0.3 });
        }
        const mesh = { color: COLOR.ink2, width: 1, alpha: 0.36, persp: 9.4, fog: [7, 13] };
        for (let i = 0; i < NW; i++) {
          const row = [], col = [];
          for (let j = 0; j < NW; j++) { const a = top(i, j), b = top(j, i); if (a[3] > 0) row.push(a.slice(0, 3)); if (b[3] > 0) col.push(b.slice(0, 3)); }
          if (row.length > 1) ctx.line(row, mesh);
          if (col.length > 1) ctx.line(col, mesh);
        }
        ctx.line([[-2.4, 0, -2.4], [2.4, 0, -2.4], [2.4, 0, 2.4], [-2.4, 0, 2.4], [-2.4, 0, -2.4]], { color: COLOR.faint, width: 1.2, persp: 9.4 });
        burst(ctx, { seed: 85, n: 3000, r0: 0.4, r1: 6, p: clamp(dt / T.beats(2)), focus: 9.4, aperture: 3, size: 3.6, alpha: 1.2, color2: COLOR.warm });
        embers(ctx, { radius: [3, 9], squash: 0.45, n: 2400, focus: 9.4, aperture: 5, size: 3.4, alpha: 0.85, color2: COLOR.warm });
        ctx.camera2D();
        // histogram of the values shown so far, against the N(0, σ²) density it is sampled from
        const bins = 18, lo = -3 * SIGMA, hi = 3 * SIGMA, cnt = new Array(bins).fill(0);
        for (let i = 0; i < NW; i++) for (let j = 0; j < NW; j++) {
          if (t < appear(i, j)) continue;
          const b = Math.floor(((weight(i, j) - lo) / (hi - lo)) * bins);
          if (b >= 0 && b < bins) cnt[b]++;
        }
        const hx = 1440, hy = 820, hw = 340, hh = 150, bw = hw / bins;
        const ha = smoothstep(w.start, w.start + T.beats(0.3), t);
        ctx.line([[hx, hy], [hx + hw, hy]], { color: COLOR.faint, width: 1, alpha: ha });
        const scale = ((hh / (NW * NW)) * bins) / 2.3;
        cnt.forEach((c, b) => { if (c) ctx.rect(hx + b * bw + 1, hy - c * scale, bw - 2, c * scale, { fill: COLOR.me, alpha: ha * 0.75 }); });
        const pdf = Array.from({ length: 61 }, (_, i) => { const x = lo + ((hi - lo) * i) / 60; return [hx + (hw * i) / 60, hy - NW * NW * ((hi - lo) / bins) * scale * Math.exp(-(x * x) / (2 * SIGMA * SIGMA)) / (SIGMA * Math.sqrt(2 * Math.PI))]; });
        ctx.line(pdf, { color: COLOR.ink2, width: 1.6, alpha: ha * 0.9 });
        ctx.text(`n = ${shown}`, hx, hy + 30, { font: 'mono', size: 18, color: COLOR.dim, alpha: ha });
        hero(ctx, w, 960, 175, { size: 104 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'world',
      hud: 'world · floor y = −1.2',
      at: (T) => T.cut(L(T, 'Set up our new world')),
      transitionIn: { type: 'xfade', beats: 1 },
      draw(ctx) {
        const { T, t } = ctx;
        const a = T.cut(L(T, 'Set up our new world')), b = T.cut(L(T, "And let's begin the"));
        const k = easeInOutCubic(clamp((t - a) / (b - a)));
        // crane up: from the floor to a view over the new world
        const cam = orbit({ target: add3([0, lerp(-0.6, -0.1, k), 0], shake(t, 0.02, 9)), r: lerp(8.5, 11, k), az: 0.3 + 0.1 * k, el: lerp(0.02, 0.12, easeOutCubic(clamp((t - a) / (b - a)))), fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 9, time: 0, alpha: 0.85 * k, size: 2.8 });
        atmosphere(ctx, 10, { alpha: smoothstep(0, 0.6, k), time: 0 });
        world(ctx, cam, { reveal: easeOutCubic(clamp((t - a) / T.beats(2.4))), axes: easeOutCubic(clamp((t - a - T.beats(1)) / T.beats(1.5))), labels: true });
        spark(ctx, cam, { pos: [0, 0.3, 0], rays: 0.3 });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'begin-the',
      hud: 'world · floor y = −1.2',
      at: (T) => T.cut(L(T, "And let's begin the")),
      draw(ctx) {
        const { T, t } = ctx;
        const a = T.cut(L(T, "And let's begin the")), b = W(T, 'SIMULATION').start;
        const k = easeInOutCubic(clamp((t - a) / (b - a)));
        // a new angle: low across the floor from the other side, the built things behind me
        const cam = orbit({ target: [0, -0.1, -0.6], r: lerp(10, 9.2, k), az: 1.75 + 0.12 * k, el: lerp(0.1, 0.12, k), fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 8.8, time: 0, alpha: 0.85, size: 2.8 });
        atmosphere(ctx, 9, { time: 0 });
        world(ctx, cam, {});
        spark(ctx, cam, { pos: [0, 0.3, 0], rays: 0.3 });
        ctx.camera2D();
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
    {
      id: 'simulation',
      hud: (T, t) => `simulation · t = ${Math.max(0, t - W(T, 'SIMULATION').start).toFixed(2)} s`,
      at: (T) => T.cut(W(T, 'SIMULATION').start),
      draw(ctx) {
        const { T, t } = ctx;
        const w = W(T, 'SIMULATION');
        const dt = t - w.start;
        // the simulation clock starts: the dust drifts and the camera starts to orbit
        const cam = orbit({ target: [0, 0.35, -0.6], r: 10.6, az: 1.9 + 0.45 * Math.max(0, dt), el: 0.13, fov: 40 });
        ctx.camera3D(cam);
        dust(ctx, { focus: 9, time: Math.max(0, dt) * 0.6, alpha: 0.85, size: 2.8 });
        atmosphere(ctx, 10.5, { time: Math.max(0, dt) * 0.8 });
        const flash = decay(dt / T.beats(1), 3);
        world(ctx, cam, { links: 0.9 * flash });
        const pe = clamp(dt / T.beats(2.4));
        burst(ctx, { center: [0, 0.3, 0], seed: 86, n: 5000, r0: 0.5, r1: 9, p: pe, focus: 10.5, aperture: 3, size: 4, alpha: 1.1 });
        shockwave(ctx, { center: [0, Y0, 0], r: 0.4 + 12 * easeOutCubic(pe), alpha: 0.9 * (1 - pe), ref: 10, width: 3.5 });
        spark(ctx, cam, { pos: [0, 0.3, 0], px: SPARK_PX * (1 + 0.35 * flash), rays: 0.35 + 0.35 * flash });
        ctx.camera2D();
        hero(ctx, w, 960, 175, { size: 120 });
        corners(ctx, { color: COLOR.faint });
        axisGizmo(ctx, cam);
      },
    },
  ],
});
