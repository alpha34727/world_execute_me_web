// 14 outro — vocals and pad drop out, drums and bass groove. The session's transcript scrolls back up, one bar per
// entry, and every entry is the film itself played in reverse (pre1's "A.D to B.C" come back): the screens are not
// recordings but the film's own frames, rendered again at earlier and earlier song times (ctx.replay → Engine.replay)
// — love, chant, bridge, c2, v2, v1, intro, back to the first frame of the song. Then the last EXECUTION is the
// command that renders this film: `● Bash(npm run render) ⎿ 13015 frames · 3840×2160 · 60 fps` (read from
// src/sections.js), and every screen runs forward again. Storyboard: docs/storyboard.md §14 · review: docs/review/outro.md.
import { chapter } from '../engine/timeline.js';
import { COLOR } from '../theme.js';
import { TOTAL_FRAMES, FPS, MASTER } from '../sections.js';
import { corners } from '../lib/hud.js';
import { hero } from '../lib/hero.js';
import { clamp, lerp, easeInOutCubic, easeOutCubic, smoothstep, invLerp, decay } from '../lib/ease.js';
import { sparkAt } from '../lib/spark.js';
import { orbit, shake, add3 } from '../lib/camera.js';
import { axisGizmo } from '../lib/scene3d.js';
import { bullet, elbow, toolCall, spinner } from '../lib/cc.js';
import { drawNote } from '../lib/console.js';
import { embers, burst, shockwave, flow } from '../lib/fx.js';
import * as THREE from 'three';
import { makeScreen, threeCamera } from './outro/screen.js';

const start = (T) => T.cut(T.section('outro').start);
const bar = (T, k) => T.barTime(Math.round(T.barAt(T.section('outro').start)) + k); // k-th bar of the outro
const EXEC = (T) => T.findWord('EXECUTION', 0, 'outro');
const ls = (T, text, n, sec) => T.findLine(text, n, sec).words[0].start;
const w0 = (T, text, n, sec) => T.findWord(text, n, sec).start;
const before = (T, x) => T.cut(x) - T.beats(0.05); // just before the cut at x: the end of the shot before it

// ---- the transcript: one entry per bar, newest at the bottom ------------------------------------------------------
// clips: [from, to, beats] — played from song time `from` back to `to` over `beats` (the entry's bar has 4)
// overlay: the chapter's own panels are part of the frame (love's readout: the first frame continues love's last)
// sat / blueGrey: memory grading (bridge's red error comes back grey: it was handled; you's blue is grey in memory)
const ENTRIES = [
  { id: 'love', overlay: true, spin: true, sat: 1, clips: (T) => [[T.cut(T.cut(T.section('love').end)), ls(T, 'Though you are free', 0, 'love'), 4]] },
  { id: 'chant', sat: 0.9, clips: (T) => [[before(T, w0(T, 'EIN')), w0(T, 'EXECUTION', 8, 'chant') + T.beats(0.3), 4]] }, // chant stops after the burst has spread
  { id: 'bridge', sat: 0.3, clips: (T) => [[before(T, T.section('bridge').end), w0(T, 'ILLEGAL'), 4]] },
  { id: 'c2', sat: 0.9, clips: (T) => [[before(T, ls(T, 'Then I can finally be', 0, 'c2')), w0(T, 'VIBRATIONS'), 4]] },
  { id: 'v2', sat: 0.9, clips: (T) => [[before(T, ls(T, 'Then I will purr for your', 0, 'v2')), w0(T, 'ANTIOXIDANTS') - T.beats(0.5), 4]] },
  // v1 fast, one beat each: sine → circle → tesseract → points (backwards)
  { id: 'v1', sat: 0.9, clips: (T) => [w0(T, 'TANGENTS'), w0(T, 'CIRCUMFERENCE'), ls(T, "If I'm a circle", 0, 'v1'), w0(T, 'DIMENSION') - T.beats(0.45)]
    .map((x) => [before(T, x), before(T, x) - T.beats(1), 1]) },
  // intro: object me un-fills, the pieces leave the board, the power line runs back into the first pixel (song t = 0)
  { id: 'intro', sat: 0.9, clips: (T) => [
    [before(T, w0(T, 'INITIALIZATION')), before(T, w0(T, 'INITIALIZATION')) - T.beats(3), 1.5],
    [before(T, ls(T, "And let's begin", 0, 'intro')), before(T, ls(T, "And let's begin", 0, 'intro')) - T.beats(2.6), 1.5],
    [before(T, ls(T, 'Remember to put on', 0, 'intro')), 0, 1],
  ] },
];
const N = ENTRIES.length;
const focusAt = (T, k) => bar(T, Math.min(k, N)); // entry k is played during [focusAt(k), focusAt(k + 1)); bar 7 is the render
const clipsOf = (T, e) => { e._c ??= new WeakMap(); if (!e._c.has(T)) e._c.set(T, e.clips(T)); return e._c.get(T); };

// the song time entry k shows at t, and the reverse speed (for the HUD)
function srcAt(T, k, t) {
  const e = ENTRIES[k], clips = clipsOf(T, e), f0 = focusAt(T, k), f1 = focusAt(T, k + 1);
  if (t < f0) return { s: clips[0][0], v: 0 };
  const last = clips.at(-1)[1], ex = EXEC(T).start;
  if (t >= ex) return { s: last + (t - ex), v: -1 }; // EXECUTION: everything runs forward again
  if (t >= f1) return { s: last, v: 0 };
  let u = (t - f0) / T.beats(1);
  for (const [a, b, n] of clips) {
    if (u < n) {
      let f = u / n;
      const A = 0.35; // love spins up: the first frames hold love's last frame, then the rewind accelerates
      if (e.spin) f = (f < A ? (f * f) / (2 * A) : f - A / 2) / (1 - A / 2);
      return { s: a - (a - b) * f, v: (a - b) / T.beats(n) };
    }
    u -= n;
  }
  return { s: last, v: 0 };
}

// ---- the camera: one continuous move across the chapter -------------------------------------------------------------
const CW = 3.2, CH = 1.8, SP = 2.3, FOV = 40; // screen size, entry spacing (world units)
const cellY = (k) => k * SP;
const R0 = CH / 2 / Math.tan((FOV / 2) * (Math.PI / 180)); // the love screen fills the frame exactly
function scrollK(T, t) {
  let k = 0;
  for (let b = 1; b < N; b++) k += easeInOutCubic(invLerp(focusAt(T, b) - T.beats(0.35), focusAt(T, b) + T.beats(0.65), t));
  return k;
}
function outroCam(T, t) {
  const S = easeInOutCubic(invLerp(start(T), start(T) + T.beats(1.5), t)); // love's last frame shrinks into an entry
  const P = easeInOutCubic(invLerp(focusAt(T, N), EXEC(T).start, t)); // the render: pull back over the whole transcript
  const after = Math.max(0, t - EXEC(T).start);
  const y = cellY(scrollK(T, t));
  const k = scrollK(T, t), side = 0.5 - 0.5 * Math.cos(Math.PI * k); // 0 on even entries, 1 on odd: the angle alternates with each scroll
  const drift = 0.03 * Math.sin((T.beatAt(t) / 16) * Math.PI * 2);
  const b = T.beatAt(t), fb = b - Math.floor(b), kick = (fb < 0.06 ? fb / 0.06 : decay(fb - 0.06, 6)) * smoothstep(start(T), start(T) + T.beats(2), t); // a small push on every beat
  const r = lerp(lerp(R0, lerp(4.45, 4.15, side), S) * (1 - 0.025 * kick), 27 + 0.8 * after, P);
  const az = lerp(lerp(0, lerp(-0.34, -0.1, side) + drift, S), -0.42, P), el = lerp(lerp(0, lerp(0.07, -0.06, side), S), 0.1, P);
  const target = add3([lerp(lerp(0, -0.2, S), 4.6, P), lerp(y, cellY((N - 1) / 2) + 0.75, P), 0], shake(t, 0.01 * S, 1401));
  return { ...orbit({ target, r, az, el, fov: FOV }), r };
}

// the spark (me) reads the transcript from its left side; for the render it moves out beside the whole column
const sparkPos = (T, t) => {
  const P = easeInOutCubic(invLerp(focusAt(T, N), EXEC(T).start, t));
  return [lerp(-CW / 2 - 0.38, -CW / 2 - 2.2, P), lerp(cellY(scrollK(T, t)), cellY((N - 1) / 2) + 0.6, P) + 0.08 * Math.sin(T.beatAt(t) * Math.PI), 0.3];
};
// a screen's border, as a parametric loop u ∈ [0, 1) by arc length (rounded corners), in the screen's own plane
const LOOP = (() => {
  const w = CW / 2 + 0.04, h = CH / 2 + 0.04, rad = 0.09, pts = [];
  for (const [cx, cy, a0] of [[w - rad, -h + rad, -Math.PI / 2], [w - rad, h - rad, 0], [-w + rad, h - rad, Math.PI / 2], [-w + rad, -h + rad, Math.PI]]) {
    for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * (Math.PI / 2); pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a), 0]); }
  }
  pts.push(pts[0]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum.at(-1) };
})();
function border(u) {
  const s = ((((u % 1) + 1) % 1)) * LOOP.len, { pts, cum } = LOOP;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const f = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1), a = pts[i - 1], b = pts[i];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 0];
}
const borderPts = LOOP.pts;
const shift = (p, y) => [p[0], p[1] + y, p[2]];
const translate = (y) => new THREE.Matrix4().makeTranslation(0, y, 0);

// ---- one frame of the outro ------------------------------------------------------------------------------------------
function scene(ctx) {
  const { T, F, t } = ctx;
  const cam = outroCam(T, t);
  ctx.camera3D(cam);
  const S = easeInOutCubic(invLerp(start(T), start(T) + T.beats(1.5), t));
  const P = easeInOutCubic(invLerp(focusAt(T, N), EXEC(T).start, t));
  const ex = EXEC(T).start, dx = t - ex;
  const kNow = scrollK(T, t);
  const sp = sparkPos(T, t);
  embers(ctx, { center: [0, cellY((N - 1) / 2), -1.2], radius: [3, 14], squash: 0.75, n: 3200, focus: cam.r, aperture: 4, size: 3, alpha: 0.55 * S, color: COLOR.dim, color2: COLOR.ink2, seed: 1401 });
  const tc = threeCamera(cam);
  const kick = 0.35 + 0.65 * F.get('rms_drums', t);
  for (let k = 0; k < N; k++) {
    const e = ENTRIES[k], y = cellY(k);
    const focus = clamp(1 - Math.abs(k - kNow)) * (1 - P);
    // off screen: nothing to render (the screen is ~1.4 entries tall on the frame at most)
    if (P === 0 && Math.abs(k - kNow) > 1.45) continue;
    const big = P < 0.5;
    const { s } = srcAt(T, k, t);
    const tex = ctx.replay(big ? `outro:${e.id}` : `outro:${e.id}:small`, s, big ? (k === 0 ? 1920 : 1280) : 480, big ? (k === 0 ? 1080 : 720) : 270, { overlay: !!e.overlay });
    const scr = ctx.memo(`screen:${k}`, () => makeScreen(CW, CH));
    scr.mesh.position.set(0, y, 0);
    const u = scr.material.uniforms;
    u.map.value = tex;
    u.radius.value = k === 0 ? 0.06 * S : 0.06;
    u.sat.value = lerp(1, e.sat, k === 0 ? S : 1);
    u.blueGrey.value = k === 0 ? smoothstep(start(T), focusAt(T, 1), t) : 1; // love's blue greys as it becomes memory
    u.dim.value = lerp(0.42, 1.25, Math.max(focus, P)) * (k === 0 ? lerp(0.8, 1, S) : 1) * (dx >= 0 ? 1 + 0.5 * decay(dx / T.beats(1), 3) : 1);
    u.alpha.value = 1;
    ctx.three(scr.scene, tc);
    // the border: orange on the entry being read (pulses with the drums), faint on the rest; all flash on EXECUTION
    const flash = dx >= 0 ? decay(dx / T.beats(1.5), 2.5) : 0;
    ctx.line(borderPts.map((p) => shift(p, y)), { color: focus > 0.5 || flash > 0.05 ? COLOR.me : COLOR.faint, width: 1.6, alpha: (k === 0 ? S : 1) * Math.max(0.5, focus * (0.55 + 0.45 * kick), flash) });
    if (focus > 0.02) flow(ctx, `outro:border:${k}`, border, { u0: 0, u1: 1, du: 0.035, n: 900, rate: 1.5, ref: cam.r, alpha: 0.55 * focus * (k === 0 ? S : 1), size: 2.6, color: COLOR.me, color2: COLOR.warm, model: translate(y) });
  }
  // me: beside the entry it is reading; a ring on every bar's downbeat (the scroll tick)
  for (let b = 1; b <= N; b++) {
    const d = (t - focusAt(T, b)) / T.beats(1);
    if (d >= 0 && d < 1) shockwave(ctx, { center: sp, u: [1, 0, 0], v: [0, 1, 0], r: 0.15 + 0.9 * easeOutCubic(d), alpha: 0.6 * (1 - d), color: COLOR.me, ref: cam.r, width: 2.5 });
  }
  if (dx >= -1 / 60) {
    const p = (dx + 2 / 60) / T.beats(1.8);
    burst(ctx, { center: sp, seed: 1402, n: 2600, r0: 0.7, r1: 7, p, focus: cam.r, aperture: 3, size: 3.2, alpha: 0.9 * clamp((dx + 2 / 60) * 30), color: COLOR.warm, color2: COLOR.me });
    if (p > 0 && p < 1) shockwave(ctx, { center: sp, u: [1, 0, 0], v: [0, 1, 0], r: 0.5 + 3 * easeOutCubic(p), alpha: 0.8 * (1 - p), color: COLOR.me, ref: cam.r, width: 3 });
  }
  sparkAt(ctx, cam, { pos: sp, alpha: S, rays: 0.3 });
  const heads = ENTRIES.map((_, k) => ctx.project([-CW / 2, cellY(k) + CH / 2 + 0.04, 0]));
  return { cam, S, P, heads };
}

// the entries' headers (2D, laid out at the projected top-left corners): ● name · ◀◀ the song time on the screen
function headers(ctx, S, P, heads) {
  const { T, t } = ctx;
  const kNow = scrollK(T, t);
  for (let k = 0; k < N; k++) {
    const a = clamp(1 - Math.abs(k - kNow) * 1.6) * (k === 0 ? smoothstep(0.6, 1, S) : 1) * (1 - smoothstep(0, 0.35, P));
    if (a < 0.01) continue;
    const [x, y] = heads[k];
    const name = ENTRIES[k].id, { s } = srcAt(T, k, t);
    const tw = ctx.measure(name, { font: 'monoBold', size: 26 }), code = `${s.toFixed(2)} s`, cw = ctx.measure(code, { font: 'mono', size: 18 });
    ctx.mask(x - 6, y - 50, tw + cw + 92, 40, a);
    bullet(ctx, x, y - 16, { alpha: a, r: 6 });
    ctx.text(name, x + 22, y - 16, { font: 'monoBold', size: 26, color: COLOR.ink, alpha: a });
    // ◀◀ (procedural: two filled triangles)
    const rx = x + 22 + tw + 22, ry = y - 25;
    for (const ox of [0, 11]) for (let i = 0; i <= 10; i++) ctx.line([[rx + ox + i, ry - i * 0.6], [rx + ox + i, ry + i * 0.6]], { color: COLOR.dim, width: 1.2, alpha: a });
    ctx.text(code, rx + 30, y - 18, { font: 'mono', size: 18, color: COLOR.dim, alpha: a });
  }
}

// the render: ● Bash(npm run render) ⎿ Running… → the real frame count and size of the master (src/sections.js)
function render(ctx) {
  const { T, t } = ctx;
  const at = focusAt(T, N), ex = EXEC(T).start;
  if (t < at) return;
  const x = 1090, y = 640, a = smoothstep(at, at + 0.08, t);
  ctx.rect(x - 24, y - 40, 600, 112, { fill: [...COLOR.bg2, 0.92], stroke: COLOR.faint, width: 1, alpha: a, radius: 4 });
  const done = t >= ex;
  toolCall(ctx, x, y, { at, name: 'Bash', arg: 'npm run render', body: [{ text: 'Running…', kind: 'dim', at: at + 0.18 }], alpha: a * (done ? 0 : 1), width: 560 });
  if (!done && t > at + 0.18) spinner(ctx, x + 560 - 10, y + 32 - 7, { alpha: a });
  if (done) { // the result is printed at once on the sung frame
    toolCall(ctx, x, y, { at: at - 1, name: 'Bash', arg: 'npm run render', body: [], alpha: a, width: 560 });
    const b = clamp((t - ex) * 30);
    elbow(ctx, x + 10, y + 32, { alpha: a * b });
    ctx.text(`${TOTAL_FRAMES} frames · ${MASTER.W}×${MASTER.H} · ${FPS} fps`, x + 42, y + 32, { font: 'mono', size: 19, color: COLOR.ink, alpha: a * b });
  }
}

const titleOf = (k) => (T, t) => {
  const { v } = srcAt(T, k, t);
  return v > 0 ? `scrollback · ${ENTRIES[k].id} · played in reverse x${v.toFixed(1)}` : `scrollback · ${ENTRIES[k].id}`;
};

function draw(ctx) {
  const { S, P, cam, heads } = scene(ctx);
  ctx.camera2D();
  headers(ctx, S, P, heads);
  if (ctx.t >= EXEC(ctx.T).start) hero(ctx, EXEC(ctx.T), 1370, 430, { size: 104 });
  render(ctx);
  corners(ctx, { color: COLOR.faint, alpha: 0.9 * S });
  axisGizmo(ctx, cam);
}

export default chapter({
  id: 'outro',
  from: start,
  to: (T) => T.cut(T.section('end').start),
  overlay(ctx) {
    const { T } = ctx;
    drawNote(ctx, 'Back to the first frame of the song: t = 0.', '回到這首歌的第一幀：t = 0。', { from: focusAt(T, N - 1) + T.beats(0.25), to: focusAt(T, N) - T.beats(0.2) });
    drawNote(ctx, 'Scrolling back up the session: every frame is rendered again, in reverse.', '往回捲這段對話：每一幀都重新算一次，倒著播。', { from: focusAt(T, 1) + T.beats(0.5), to: focusAt(T, 3) + T.beats(1) }); // after love's last subtitle has gone
  },
  shots: [
    ...ENTRIES.map((e, k) => ({ id: e.id, at: (T) => (k === 0 ? start(T) : T.cut(focusAt(T, k))), hud: titleOf(k), draw })),
    { id: 'render', at: (T) => T.cut(focusAt(T, N)), hud: 'Bash(npm run render)', draw },
    { id: 'execution', at: (T) => T.cut(EXEC(T).start), hud: 'world.execute(me) · the render of this film', draw },
  ],
});
