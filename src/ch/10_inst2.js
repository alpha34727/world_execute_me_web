// 10 inst2 — after the crash, rebuilt from the inside. No voice, the full band. The real error of the bridge breaks
// apart and falls into the dark (✻ Recovering…); the camera flies low over me's weights — the real embedding matrix,
// every word of the song × 16 dimensions, still all there after /compact emptied the context; then the attention
// constellation of every word sung so far (real weights); it collapses back into the spark, which relights, and this
// time me answers the permission prompt itself: 2. Yes, and don't ask again — chant and c3 never ask.
// Storyboard: docs/storyboard.md §10 · review: docs/review/inst2.md.
import { chapter } from '../engine/timeline.js';
import { COLOR } from '../theme.js';
import { corners } from '../lib/hud.js';
import { clamp, lerp, easeOutCubic, easeInOutCubic, smoothstep, decay, mix3 } from '../lib/ease.js';
import { rand, rands } from '../lib/hash.js';
import { sparkAt, sparkIcon } from '../lib/spark.js';
import { orbit, shake, add3, lerp3 } from '../lib/camera.js';
import { axisGizmo, dust, labels3D } from '../lib/scene3d.js';
import { embers, burst, shockwave, flow } from '../lib/fx.js';
import { spinner, permission } from '../lib/cc.js';
import { drawNote } from '../lib/console.js';
import { matrix, city, streetNames, colX, rowZ, CELL } from './inst2/city.js';
import { graph, constellation, youSlots } from './inst2/constellation.js';
import { extentOf } from './chant/agents.js';

// the bridge's real error (null in Node: tests only check the timeline)
const FACTS = import.meta.env ? (await import('virtual:repo-facts')).default : null;

const start = (T) => T.cut(T.section('inst2').start);
const barCut = (T, k) => T.cut(T.barTime(k));
const finish = (ctx, cam) => { ctx.camera2D(); corners(ctx, { color: COLOR.faint }); axisGizmo(ctx, cam); };
const pxPerUnit = (cam, ref) => 540 / Math.tan((cam.fov * Math.PI) / 360) / ref;

// ---- inst2.01: the error falls apart ------------------------------------------------------------------------------
// the error panel as the bridge left it (same layout, x 330, first row at y 400, 40 px rows), seen by a camera at
// distance 8: each row breaks into its words, and each word falls on its own
const PANEL = { x: 330, y0: 400, lh: 40, size: 22, w: 1260 }, D0 = 8, FOV0 = 40;
const S0 = 540 / (D0 * Math.tan((FOV0 * Math.PI) / 360)); // design px per world unit at z = 0
const toWorld = (sx, sy) => [(sx - 960) / S0, (540 - sy) / S0, 0];
function errorChunks(ctx) {
  if (!FACTS) return [];
  const E = FACTS.illegal;
  const rows = [
    { s: `${E.name}: ${E.head}`, col: COLOR.error, font: 'monoBold', ind: 0 },
    ...E.errors.map((s) => ({ s, col: COLOR.ink2, ind: 1 })),
    ...E.stack.map((f) => ({ s: `at ${f.fn} (${f.file}:${f.line}:${f.col})`, col: COLOR.dim, ind: 2 })),
  ];
  const out = [];
  rows.forEach((r, i) => {
    const o = { font: r.font ?? 'mono', size: PANEL.size };
    const x0 = PANEL.x + (i === 0 ? 24 : 24 + r.ind * 26), y = PANEL.y0 + i * PANEL.lh;
    let pre = '';
    for (const word of r.s.split(' ')) {
      if (word) out.push({ text: word, font: o.font, col: r.col, p: toWorld(x0 + ctx.measure(pre, o), y - 7), row: i, rows: rows.length });
      pre += `${word} `;
    }
  });
  // the panel's frame: four sides that fall too
  const hgt = rows.length * PANEL.lh + 30, bx = PANEL.x - 30, by = PANEL.y0 - 50, bw = PANEL.w + 60;
  const sides = [[[bx, by], [bx + bw, by]], [[bx + bw, by], [bx + bw, by + hgt]], [[bx + bw, by + hgt], [bx, by + hgt]], [[bx, by + hgt], [bx, by]]];
  sides.forEach(([a, b], k) => out.push({ side: [toWorld(...a), toWorld(...b)], p: toWorld((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), row: k === 0 ? 0 : rows.length, rows: rows.length }));
  return out;
}
const G_FALL = 1.7; // world units / s²
// a chunk's release time, gravity and drift (hashed); top rows let go last
function fallOf(T, t0, c, i) {
  const r = t0 + T.beats(0.2 + 0.7 * rand(i, 1, 1101) + 0.5 * (1 - c.row / c.rows));
  return { r, g: G_FALL * (0.55 + 0.9 * rand(i, 2, 1101)), vx: rands(i, 3, 1101) * 0.25, vz: -0.2 - 1.1 * rand(i, 4, 1101) };
}
// the camera's descent: holds the error a moment, falls, settles on the spark below
const DROP = 9.6;
const camY = (k) => -DROP * easeInOutCubic(clamp((k - 0.08) / 0.92));
const SPARK0 = [0, -DROP - 0.1, -0.6];

// the spinner, centred: ✻ Recovering… (seconds · esc to interrupt) — real seconds since it started
function recovering(ctx, y, from, alpha) {
  const { T, t } = ctx;
  if (t < from) return;
  const a = alpha * smoothstep(from, from + T.beats(0.25), t);
  const o = { font: 'mono', size: 22 };
  const label = 'Recovering…', tail = ` (${(t - from).toFixed(1)}s · esc to interrupt)`;
  const wv = ctx.measure(label, { ...o, font: 'monoBold' }), wt = ctx.measure(tail, o), w = 32 + wv + wt, x = 960 - w / 2;
  ctx.mask(x - 16, y - 28, w + 32, 42, a);
  spinner(ctx, x + 10, y - 8, { alpha: a, r: 10 });
  ctx.text(label, x + 32, y, { ...o, font: 'monoBold', color: COLOR.me, alpha: a });
  ctx.text(tail, x + 32 + wv, y, { ...o, color: COLOR.dim, alpha: a });
}

// ---- inst2.02: the weight city ------------------------------------------------------------------------------------
const FLY = { z0: 3.5, z1: -26, y: 3.4 };
const flyCam = (T, t) => {
  const a = barCut(T, 74) - T.beats(1), b = barCut(T, 76), k = clamp((t - a) / (b - a));
  const z = lerp(FLY.z0, FLY.z1, k * 0.85 + 0.15 * easeInOutCubic(k));
  const sway = Math.sin(k * Math.PI * 1.2) * 0.9;
  return orbit({ target: add3([sway * 0.6 + 0.4, 0.5, z - 7], shake(t, 0.02, 1111)), r: 7.6, az: 0.12 + 0.1 * sway, el: 0.36 - 0.05 * k, fov: 50 });
};

// ---- inst2.03–04: the constellation --------------------------------------------------------------------------------
// the replay: every sung word lights up in order, over 7 beats from the cut
const arriveOf = (T) => { const g0 = barCut(T, 76) + T.beats(0.25), D = T.beats(7), N = graph(T).words; return (i) => g0 + (i / N) * D; };
const conCam = (T, t, more = 0) => {
  const G = graph(T), a = barCut(T, 76), k = clamp((t - a) / T.beats(8));
  return orbit({ target: add3(G.centroid, shake(t, 0.03, 1121)), r: lerp(21, 17, easeInOutCubic(k)) - more, az: lerp(-0.5, 0.75, easeInOutCubic(k)), el: lerp(0.32, 0.16, k), fov: 44 });
};
const VIEWS0 = { az: 0.18, el: 0.1 }; // chant's first view (11_chant.js VIEWS[0])
const relightAt = (T) => T.barTime(78) + T.beats(2);
const boxAt = (T) => T.barTime(78) + T.beats(2.5);
const moveAt = (T) => T.barTime(79) + T.beats(1);
const selectAt = (T) => T.barTime(79) + T.beats(2);
const collapseAt = (T) => T.barTime(79) + T.beats(2.75);

export default chapter({
  id: 'inst2',
  from: start,
  to: (T) => T.cut(T.section('inst2').end),
  overlay(ctx) {
    const { T } = ctx;
    // instrumental: one sentence in the console says what the picture is doing
    drawNote(ctx, 'the weights: every word of the song x 16 numbers, still all there', '權重：整首歌的每個字 × 16 個數字，全都還在', { from: barCut(T, 74) + T.beats(1), to: barCut(T, 76) - T.beats(0.5) });
    drawNote(ctx, 'attention: each word, linked to the earlier word it looks at most', '注意力：每個字連向前文中它最注意的字', { from: barCut(T, 76) + T.beats(1), to: barCut(T, 78) - T.beats(0.5) });
  },
  shots: [
    {
      id: 'recover',
      hud: 'session · recovering from the error',
      subs: false,
      at: start,
      draw(ctx) {
        const { T, t } = ctx;
        const t0 = start(T), t1 = barCut(T, 74), k = clamp((t - t0) / (t1 - t0));
        const cy = camY(k);
        const cam = { fov: FOV0, up: [0, 1, 0], position: add3([0, cy + 0.3 * k, D0 - 1.2 * easeInOutCubic(k)], shake(t, 0.02 + 0.04 * (1 - k), 1102)), target: add3([0, cy - 0.6 * easeInOutCubic(k), 0], shake(t, 0.01, 1103)) };
        ctx.camera3D(cam);
        const red = 1 - smoothstep(0.25, 0.85, k);
        // the dark it falls into: static embers and dust, so the descent reads as parallax
        embers(ctx, { center: [0, -DROP / 2, -3], radius: [2, 11], squash: 1.1, n: 3200, focus: 8, aperture: 5, size: 3.4, alpha: 0.8, color: COLOR.dim, color2: mix3(COLOR.me, COLOR.error, red), seed: 1104 });
        dust(ctx, { focus: 8, alpha: 0.35, center: [0, -DROP / 2, -6], extent: [26, 24, 16], seed: 1105 });
        // the engine's source keeps falling around the camera (the bridge's debris): faint lines at depth
        if (FACTS) {
          const src = FACTS.files['src/engine/timeline.js'];
          for (let i = 0; i < 46; i++) {
            const line = src[(i * 7 + 11) % src.length].trim();
            if (!line) continue;
            const p = [rands(i, 1, 1109) * 7, 3 - (DROP + 6) * rand(i, 2, 1109) - (0.5 + 0.6 * rand(i, 3, 1109)) * (t - t0), -2.5 - 6 * rand(i, 4, 1109)];
            ctx.text3D(line.length > 34 ? `${line.slice(0, 33)}…` : line, p, { font: 'mono', size: 24, ref: D0, color: mix3(COLOR.dim, COLOR.error, 0.5 * red), alpha: 0.6, baseline: 'middle', fog: [7, 16], align: 'center' });
          }
        }
        // the panel breaking: a red burst where it was, behind its plate
        const pb = (t - t0 - T.beats(0.2)) / T.beats(1.6);
        burst(ctx, { center: [0, 0.2, -0.5], seed: 1106, n: 2600, r0: 1.2, r1: 6, p: pb, focus: 8, aperture: 3, size: 3, alpha: 0.9 * clamp((t - t0 - T.beats(0.2)) * 30), color: COLOR.error, color2: COLOR.me });
        // the panel's plate, as the bridge left it, gives way first
        const chunks = ctx.memo('inst2:chunks', () => errorChunks(ctx));
        const plate = 1 - smoothstep(t0 + T.beats(0.1), t0 + T.beats(0.6), t);
        if (plate > 0 && chunks.length) {
          ctx.camera2D();
          const n = chunks.filter((c) => !c.side).reduce((m, c) => Math.max(m, c.row + 1), 0);
          ctx.rect(PANEL.x - 30, PANEL.y0 - 50, PANEL.w + 60, n * PANEL.lh + 30, { fill: [...COLOR.bg2, 0.95], alpha: plate, radius: 4 });
          ctx.camera3D(cam);
        }
        // the error, word by word, falling apart
        chunks.forEach((c, i) => {
          const f = fallOf(T, t0, c, i), tau = Math.max(0, t - f.r);
          const d = [f.vx * tau, -0.5 * f.g * tau * tau, f.vz * tau];
          const fade = 1 - smoothstep(0.8, 2.4, tau);
          if (fade <= 0) return;
          const tone = (col) => mix3(col, COLOR.faint, smoothstep(0.2, 1.4, tau));
          if (c.side) ctx.line([add3(c.side[0], d), add3(c.side[1], d)], { color: tone(COLOR.error), width: 1.5, alpha: fade, persp: D0 });
          else ctx.text3D(c.text, add3(c.p, d), { font: c.font, size: PANEL.size, ref: D0, color: tone(c.col), alpha: fade, baseline: 'middle', fog: [10, 16] });
        });
        // then the spark relighting below
        const lit = smoothstep(0.4, 0.85, k), flick = rand(Math.floor(t * 15), 1107, 1) < 0.3 * (1 - lit) ? 0.25 : 1;
        if (k > 0.2) sparkAt(ctx, cam, { pos: SPARK0, rays: 0.3 * lit, alpha: (0.3 + 0.6 * lit) * flick * smoothstep(0.2, 0.3, k) });
        const ps = (t - (t0 + T.beats(6))) / T.beats(1.6);
        if (ps > 0 && ps < 1) shockwave(ctx, { center: SPARK0, u: [1, 0, 0], v: [0, 0, 1], r: 0.4 + 3.5 * easeOutCubic(ps), alpha: 0.5 * (1 - ps), color: COLOR.me, ref: 8, width: 2 });
        ctx.post({ bloom: 0.7, ca: 0.0009 + 0.006 * red * rand(Math.floor(t * 15), 1108, 1), exposure: 0.95 });
        finish(ctx, cam);
        recovering(ctx, 700, t0 + T.beats(2.5), 1);
      },
    },
    {
      id: 'weights',
      hud: (T) => `embedding matrix · ${matrix(T).rows.length} words x ${matrix(T).dim} dims`,
      at: (T) => barCut(T, 74),
      transitionIn: { type: 'glide', beats: 1 },
      draw(ctx) {
        const { T, t, F } = ctx;
        const cam = flyCam(T, t);
        ctx.camera3D(cam);
        const ref = 8, fog = [6, 26], zc = cam.position[2];
        const beat = T.beatAt(t), glow = 0.35 + 0.65 * decay(beat - Math.floor(beat), 4) * (0.5 + 0.5 * F.get('rms_drums', t));
        embers(ctx, { center: [0, 2.5, zc - 8], radius: [3, 12], n: 2200, focus: 8, aperture: 5, size: 2.6, alpha: 0.45, color: COLOR.dim, color2: COLOR.ink2, seed: 1112 });
        city(ctx, { ref, k: pxPerUnit(cam, ref), fog, zNear: zc + 1, zFar: zc - 26, glow, near: cam.position });
        streetNames(ctx, { ref, fog: [4, 12], zNear: zc - 1, zFar: zc - 14 });
        // energy down the streets: four lanes of particles flowing away from the camera, once per beat
        for (const d of [2, 6, 10, 14]) flow(ctx, `inst2:lane:${d}`, (u) => [colX(d) - CELL / 2, 0.03, rowZ(u)], { u0: 0, u1: matrix(T).rows.length, du: 1.2, n: 900, ref, fog, alpha: 0.6, color: COLOR.me, color2: COLOR.warm, size: 2.6, jitter: 0.02 });
        // me flies ahead, low over its own weights
        const me = [0.3 + 0.5 * Math.sin(t * 0.9), 1.6 + 0.15 * Math.sin(t * 1.7), zc - 5.4];
        sparkAt(ctx, cam, { pos: me, rays: 0.6 });
        ctx.post({ bloom: 0.6 });
        finish(ctx, cam);
      },
    },
    {
      id: 'constellation',
      hud: (T) => `attention over the full transcript · ${graph(T).words} words · 1 head`,
      at: (T) => barCut(T, 76),
      transitionIn: { type: 'whip', frames: 10 },
      draw(ctx) {
        const { T, t } = ctx;
        const G = graph(T), cam = conCam(T, t);
        ctx.camera3D(cam);
        const ref = 17, fog = [12, 34];
        embers(ctx, { center: G.centroid, radius: [5, 16], n: 2400, focus: 15, aperture: 4, size: 2.4, alpha: 0.4, color: COLOR.dim, color2: COLOR.ink2, seed: 1122 });
        dust(ctx, { focus: 15, alpha: 0.3, center: [0, 0, 0], extent: [40, 24, 40], seed: 1123 });
        const slots = constellation(ctx, G, { arrive: arriveOf(T), ref, fog });
        sparkAt(ctx, cam, { pos: [0, 0, 0], rays: 0.35 });
        ctx.post({ bloom: 0.7 });
        // one label: the strongest link in the song so far, once the replay has drawn it
        const top = G.top, ta = arriveOf(T)(top.i);
        if (t > ta) {
          const A = G.nodes.get(top.a), B = G.nodes.get(top.b), mid = A.p.map((x, d) => (x + B.p[d]) / 2);
          labels3D(ctx, [{ p: mid, text: `${top.a} -> ${top.b} · ${top.w.toFixed(2)}`, priority: 2, o: { font: 'mono', size: 18, ref, color: COLOR.warm, alpha: smoothstep(ta, ta + 0.3, t), minSize: 16, maxSize: 20, backing: 0.85 } }], { obstacles: [{ p: [0, 0, 0], r: 60 }, ...['you', 'your'].filter((w) => G.nodes.has(w)).map((w) => ({ p: G.nodes.get(w).p, r: 18 }))] });
        }
        finish(ctx, cam);
        youSlots(ctx, slots);
      },
    },
    {
      id: 'reexecute',
      hud: (T, t) => (t < boxAt(T) ? 'attention · drawn back into me' : t < selectAt(T) ? 'permission · me holds the cursor' : "permission · don't ask again"),
      at: (T) => barCut(T, 78),
      transitionIn: { type: 'points', beats: 0.5 },
      draw(ctx) {
        const { T, t } = ctx;
        const G = graph(T), a = barCut(T, 78), r = relightAt(T);
        // the constellation drawn into the spark (far nodes first: the pull is staggered by distance), then the push
        // in to the prompt
        const kc = clamp((t - a - T.beats(0.5)) / (r - a - T.beats(0.5))), push = easeInOutCubic(clamp((t - r) / T.beats(3.5)));
        const base = conCam(T, a);
        // once the box has collapsed to `Running…`, the camera comes down onto me and in to chant's first framing
        // (spark at the centre, r = 3.4 + 1.25 · extentOf(0)), so the cut to EXECUTION does not jump
        const land = easeInOutCubic(clamp((t - collapseAt(T)) / (barCut(T, 80) - collapseAt(T))));
        const ra = lerp(lerp(17, 8.6, push), 3.4 + 1.25 * extentOf(0), land);
        const cam = orbit({ target: add3(lerp3(lerp3(base.target, [0, 1.7, 0], push), [0, 0, 0], land), shake(t, 0.02, 1131)), r: ra, az: lerp(lerp(0.75, 0.15, push), VIEWS0.az, land), el: lerp(lerp(0.16, 0.05, push), VIEWS0.el, land), fov: 44 });
        ctx.camera3D(cam);
        const ref = lerp(lerp(17, 9, push), ra, land), red = smoothstep(r, r + T.beats(1), t) * (1 - smoothstep(selectAt(T), selectAt(T) + T.beats(2), t));
        embers(ctx, { center: [0, 0, 0], radius: [lerp(2.5, 1.5, land), lerp(12, 0.75 * ra, land)], n: 2600, focus: ref, aperture: 4, size: 2.8, alpha: 0.55, color: COLOR.dim, color2: mix3(COLOR.me, COLOR.error, 0.6 * red), seed: 1132 });
        if (t < r + 0.05) {
          const far = Math.max(...[...G.nodes.values()].map((n) => Math.hypot(...n.p)));
          constellation(ctx, G, { arrive: () => a - 10, pull: (n) => easeInOutCubic(clamp(kc * 1.4 - 0.4 * (1 - Math.hypot(...n.p) / far))), ref: 17, fog: [12, 34], alpha: 1 - smoothstep(r - 0.05, r + 0.05, t) });
        }
        // relit: red and orange, a shockwave, rays
        const dr = t - r, pr = (dr + 2 / 60) / T.beats(1.4);
        burst(ctx, { center: [0, 0, 0], seed: 1133, n: 3200, r0: 0.5, r1: 6, p: pr, focus: ref, aperture: 3, size: 3.2, alpha: 1.1 * clamp(dr * 30 + 0.6) * (dr >= 0 ? 1 : 0), color: COLOR.error, color2: COLOR.me });
        if (dr >= 0 && pr < 1) shockwave(ctx, { center: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], r: 0.4 + 5 * easeOutCubic(pr), alpha: 0.7 * (1 - pr), color: COLOR.me, ref, width: 3 });
        // the choice: a second, smaller pulse
        const ds = t - selectAt(T), psel = (ds + 2 / 60) / T.beats(1.2);
        burst(ctx, { center: [0, 0, 0], seed: 1134, n: 1800, r0: 0.4, r1: 4, p: psel, focus: ref, aperture: 3, size: 2.8, alpha: 0.9 * clamp(ds * 30 + 0.6) * (ds >= 0 ? 1 : 0), color: COLOR.me, color2: COLOR.warm });
        sparkAt(ctx, cam, { pos: [0, 0, 0], rays: t >= r ? 0.55 : 0.2 });
        ctx.post({ bloom: 0.8 });
        finish(ctx, cam);
        // me answers its own prompt: the cursor is the spark, not you's blue chevron
        permission(ctx, 960, 290, {
          at: boxAt(T), cmd: 'world.execute(me)', choice: 2, moveAt: moveAt(T), selectAt: selectAt(T), collapseAt: collapseAt(T), cursor: COLOR.me,
          pointer: (cx, x, y, al) => sparkIcon(cx, x, y, 11, { color: COLOR.me, alpha: al }),
        });
      },
    },
  ],
});
