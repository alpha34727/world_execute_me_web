// 15 end — the task is done, and the session restarts. The last EXECUTION rings out into digital silence inside
// Claude Code's CLI (bottom of the frame, as in the bridge): the render's ● Bash entry, Claude's last message — the
// credits — and the turn's completion line `✻ Worked for 3m 11s` (the real time since you pressed Enter in inst1).
// The status line names the model: Opus 5.5. Then me types /clear: the transcript is gone, the welcome banner of a new
// session appears, the HUD goes (context 0), and the world restarts where the film began: the empty object me {} of
// intro.06 (uncoloured, no fields — not even love) grows back out of a spark that is now a single point of light. The
// prompt's cursor blinks: it could be run again. Storyboard: docs/storyboard.md §15 · review: docs/review/end.md.
import { chapter } from '../engine/timeline.js';
import { COLOR } from '../theme.js';
import { TOTAL_FRAMES, FPS, MASTER } from '../sections.js';
import { clamp, easeOutCubic, easeInCubic, smoothstep } from '../lib/ease.js';
import { orbit } from '../lib/camera.js';
import { dust } from '../lib/scene3d.js';
import { sparkAt, sparkIcon } from '../lib/spark.js';
import { bullet, elbow } from '../lib/cc.js';
import { embers, stream, shockwave, sampleSegments } from '../lib/fx.js';
import { CUBE } from './intro/stage.js';

// the model that made this film's visuals (credits, CLAUDE.md §7.6)
const MODEL = 'claude-opus-5-5', MODEL_NAME = 'Opus 5.5';
const t0 = (T) => T.section('end').start;
const start = (T) => T.cut(t0(T));
const msgAt = (T, k) => t0(T) + T.beats(0.5 + 0.5 * k); // Claude's last message, one line per half beat
const doneAt = (T) => t0(T) + T.beats(2.5);                // the turn ends: ✻ Worked for …
const clearAt = (T) => T.barTime(Math.round(T.barAt(t0(T)))) + T.beats(9); // me types /clear (~3.5 s after the signature: the film has a 4 s silent tail for this)
const enterAt = (T) => clearAt(T) + T.beats(0.75);         // … and presses Enter: a new session
const enterPressed = (T) => T.beatTime(36);                 // inst1: you pressed Enter on world.execute(me);
const worked = (T) => { const s = Math.floor(doneAt(T) - enterPressed(T)); return `${Math.floor(s / 60)}m ${s % 60}s`; };

// ---- 3D: me at rest, then the empty object me {} (intro.06's box) growing back out of one point of light -------------
const BOX = 1.05;
const cam = (T, t) => orbit({ target: [0, -0.8, 0], r: 9.6 - 0.06 * (t - t0(T)), az: 0.6 + 0.02 * (t - t0(T)), el: 0.24, fov: 38 });
function scene(ctx) {
  const { T, t } = ctx;
  const c = cam(T, t);
  ctx.camera3D(c);
  const e = enterAt(T);
  const fadeE = 1 - smoothstep(t0(T), t0(T) + T.beats(6), t); // the last energy dies with the sound
  dust(ctx, { focus: 9.6, time: 0, alpha: 0.4 });
  embers(ctx, { radius: [1.8, 7], n: 1600, focus: 9.6, aperture: 5, size: 3, alpha: 0.18 + 0.4 * fadeE, color: COLOR.dim, color2: COLOR.ink2, seed: 1501 });
  // the task is done: one soft ring as the turn ends
  const dd = (t - doneAt(T)) / T.beats(1.5);
  if (dd >= 0 && dd < 1) shockwave(ctx, { center: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], r: 0.25 + 0.5 * easeOutCubic(dd), alpha: 0.6 * (1 - dd), color: COLOR.me, ref: 9.6, width: 2.5 });
  // /clear: the spark folds into a point; the box grows back out of it (intro.06) and stays empty
  const shrink = easeInCubic(clamp((t - e) / T.beats(0.5)));
  if (shrink < 1) sparkAt(ctx, c, { pos: [0, 0, 0], px: 70 * (1 - shrink), rays: 0.25 * (1 - shrink), alpha: 1 - 0.5 * shrink });
  const grow = easeOutCubic(clamp((t - e - T.beats(0.25)) / T.beats(2)));
  if (grow > 0) {
    stream(ctx, { key: 'end:box', targets: () => sampleSegments(CUBE.map(([p, q]) => [p.map((v) => v * BOX), q.map((v) => v * BOX)]), 160, 15, 0.012), p: grow * 1.1, focus: 9.6, aperture: 5, size: 2.4, alpha: 0.6, color: COLOR.ink2, color2: COLOR.dim });
    const s = BOX * grow;
    for (const [a, b] of CUBE) ctx.line([a.map((v) => v * s), b.map((v) => v * s)], { color: COLOR.ink2, width: 2, alpha: 0.5, persp: 9.6, glow: 3, glowStrength: 0.15 });
    // no name, no tokens, no dim, no colour, no love: the braces close on nothing
    if (grow > 0.6) ctx.text3D('object me {', [-s, s + 0.22, s], { font: 'mono', size: 26, color: COLOR.ink2, ref: 9.6, alpha: smoothstep(0.6, 0.9, grow) });
    if (grow > 0.98) ctx.text3D('}', [BOX + 0.55, -BOX, BOX], { font: 'mono', size: 26, color: COLOR.ink2, ref: 9.6, baseline: 'middle' });
    const d = (t - e) / T.beats(1.5);
    if (d >= 0 && d < 1) shockwave(ctx, { center: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], r: 0.1 + 1.6 * easeOutCubic(d), alpha: 0.8 * (1 - d), color: COLOR.me, ref: 9.6, width: 2.5 });
  }
  if (shrink > 0) ctx.point3D([0, 0, 0], 3.8, { fill: COLOR.me, glow: 22, glowStrength: 0.8, ref: 9.6, alpha: shrink }); // the brightest thing left
}

// ---- the CLI (overlay: crisp, after post) ----------------------------------------------------------------------------
const X = 72, R = 1848, LH = 34, BODY = { font: 'mono', size: 20 }, HEAD = { font: 'monoBold', size: 21 };
const IN_Y = 952, IN_H = 74, STATUS_Y = 1064, BOTTOM = 918; // input box, status line, last transcript row
const typed = (s, t, at, cps = 120) => s.slice(0, Math.max(0, Math.floor((t - at) * cps)));
// a still ✻ (the spinner's 8-arm frame: the turn is over, it no longer turns)
const star = (ctx, x, y, { r = 9, color = COLOR.me, alpha = 1 } = {}) => {
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.line([[x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2], [x + Math.cos(a) * r, y + Math.sin(a) * r]], { color, width: 2.2, alpha }); }
};

function input(ctx, a) {
  const { T, t } = ctx;
  const c = clearAt(T), e = enterAt(T);
  ctx.rect(X - 20, IN_Y, R - X + 40, IN_H, { fill: [0, 0, 0, 0.86], stroke: COLOR.faint, width: 1.2, alpha: a, radius: 10 });
  const y = IN_Y + IN_H / 2 + 8;
  ctx.text('>', X, y, { font: 'mono', size: 24, color: COLOR.me, alpha: a });
  const typing = t >= c && t < e;
  const r = ctx.text(typing ? typed('/clear', t, c, 24) : '', X + ctx.measure('> ', { font: 'mono', size: 24 }), y, { font: 'mono', size: 24, color: COLOR.ink, alpha: a });
  // me types /clear (orange cursor, as it typed /compact in the bridge); otherwise grey: nobody typing — but it blinks,
  // it could be run again (the last half beat holds it on)
  if (typing || Math.floor(T.beatAt(t) * 2) % 2 === 0 || t > T.section('end').end - T.beats(0.5)) ctx.rect(r.x + r.width + 4, y - 20, 12, 24, { fill: typing ? COLOR.me : COLOR.dim, alpha: 0.85 * a });
  // the status line names the model
  ctx.text('? for shortcuts', X, STATUS_Y, { font: 'mono', size: 16, color: COLOR.faint, alpha: a });
  const m = ctx.measure(` · ${MODEL}`, { font: 'mono', size: 16 });
  ctx.text(MODEL_NAME, R - m, STATUS_Y, { font: 'monoBold', size: 16, color: COLOR.me, alpha: a, align: 'right' });
  ctx.text(` · ${MODEL}`, R, STATUS_Y, { font: 'mono', size: 16, color: COLOR.dim, alpha: a, align: 'right' });
}

// before /clear: the render's entry (older, dimmed), Claude's last message (the credits), the completion line
function session(ctx, a) {
  const { T, t } = ctx;
  if (a <= 0.003) return;
  const res = `${TOTAL_FRAMES} frames · ${MASTER.W}×${MASTER.H} · ${FPS} fps`;
  // segments [text, colour]: the names are brighter
  const lines = [
    [['Done — world.execute (me) ; is rendered.', COLOR.ink]],
    [['Music — ', COLOR.dim], ['Mili', COLOR.ink], [' · Visuals — ', COLOR.dim], [`Claude ${MODEL_NAME}`, COLOR.ink], [` (${MODEL})`, COLOR.dim]],
    [['中文翻譯為非官方翻譯 · unofficial fan work', COLOR.ink2]],
  ];
  // rows bottom-up: ✻ line, gap, message ×3, gap, Bash ⎿ result, Bash head
  const yDone = BOTTOM, yMsg = yDone - LH - 14 - 2 * LH, yBash = yMsg - 14 - 2 * LH;
  const w = 980, top = yBash - 34;
  for (let f = 4; f >= 1; f--) ctx.rect(X - 22 - f * 10, top - f * 10, w + 44 + f * 20, BOTTOM + 18 - top + f * 20, { fill: [...COLOR.bg, 0.22], radius: 6 + f * 10, alpha: a });
  ctx.rect(X - 22, top, w + 44, BOTTOM + 18 - top, { fill: [...COLOR.bg, 0.95], radius: 6, alpha: a });
  const old = 0.35 * a;
  bullet(ctx, X, yBash, { alpha: old });
  const h = ctx.text('Bash', X + 22, yBash, { ...HEAD, color: COLOR.ink, alpha: old });
  ctx.text('(npm run render)', h.x + h.width, yBash, { ...HEAD, font: 'mono', color: COLOR.dim, alpha: old });
  elbow(ctx, X + 10, yBash + LH, { alpha: old });
  ctx.text(res, X + 42, yBash + LH, { ...BODY, color: COLOR.ink2, alpha: old });
  lines.forEach((segs, k) => {
    const at = msgAt(T, k);
    if (t < at) return;
    const y = yMsg + k * LH, la = a * smoothstep(at, at + 0.04, t);
    if (k === 0) bullet(ctx, X, y, { alpha: la });
    let n = typed(segs.map(([x]) => x).join(''), t, at).length, x = X + 22;
    for (const [str, col] of segs) {
      if (n <= 0) break;
      const q = ctx.text(str.slice(0, n), x, y, { ...BODY, font: k === 2 ? 'zh' : 'mono', size: k === 2 ? 19 : 20, color: col, alpha: la });
      x += q.width; n -= str.length;
    }
  });
  if (t >= doneAt(T)) {
    const fl = 1 - clamp((t - doneAt(T)) / T.beats(2));
    const da = a * smoothstep(doneAt(T), doneAt(T) + 0.05, t);
    star(ctx, X + 7, yDone - 7, { alpha: da });
    ctx.text(`Worked for ${worked(T)}`, X + 26, yDone, { ...BODY, color: fl > 0 ? COLOR.me : COLOR.dim, alpha: da });
  }
}

// after /clear: the welcome banner of a new session
function banner(ctx, a) {
  if (a <= 0.003) return;
  const top = 790, w = 720, h = 128;
  ctx.rect(X - 20, top, w, h, { fill: [0, 0, 0, 0.86], stroke: COLOR.me, width: 1.4, alpha: a, radius: 10 });
  star(ctx, X + 8, top + 38, { alpha: a });
  ctx.text('Welcome to Claude Code!', X + 30, top + 45, { font: 'monoBold', size: 22, color: COLOR.ink, alpha: a });
  ctx.text('/help for help · cwd: ~/world_execute_me', X + 30, top + 80, { font: 'mono', size: 18, color: COLOR.dim, alpha: a });
  const r = ctx.text('model: ', X + 30, top + 110, { font: 'mono', size: 18, color: COLOR.dim, alpha: a });
  ctx.text(`${MODEL_NAME} (${MODEL})`, r.x + r.width, top + 110, { font: 'mono', size: 18, color: COLOR.ink2, alpha: a });
}

// under me, once the task is done: "by ✳ Claude Opus 5.5" — the film's own spark icon (the HUD's, not Claude's logo)
// and the name set in Newsreader (SIL OFL), a serif close to the Claude wordmark, as a product lockup; gone with /clear
function signature(ctx, a) {
  if (a <= 0.003) return;
  const { T, t } = ctx;
  ctx.camera3D(cam(T, t));
  const [cx, cy] = ctx.project([0, 0, 0]);
  ctx.camera2D();
  const BY = { font: 'mono', size: 22 }, NAME = { font: 'serif', size: 52 };
  const name = `Claude ${MODEL_NAME}`, r = 17, gap = 14;
  const wBy = ctx.measure('by', BY), wName = ctx.measure(name, NAME);
  const w = wBy + gap + 2 * r + gap * 0.8 + wName, x = cx - w / 2, y = cy + 168;
  ctx.text('by', x, y, { ...BY, color: COLOR.dim, alpha: a });
  sparkIcon(ctx, x + wBy + gap + r, y - 14, r, { alpha: a });
  ctx.text(name, x + wBy + gap + 2 * r + gap * 0.8, y, { ...NAME, color: COLOR.ink, alpha: a });
}

function cli(ctx) {
  const { T, t } = ctx;
  const a = smoothstep(start(T), start(T) + T.beats(1), t);
  const e = enterAt(T);
  signature(ctx, smoothstep(doneAt(T), doneAt(T) + T.beats(0.5), t) * (1 - smoothstep(e, e + 0.15, t)));
  session(ctx, a * (1 - smoothstep(e, e + 0.15, t)));
  banner(ctx, smoothstep(e + 0.1, e + 0.3, t));
  input(ctx, a);
}

export default chapter({
  id: 'end',
  from: start,
  overlay: cli,
  shots: [
    // the outro's EXECUTION stays whole until the cut (align 0): the cross-fade happens inside the CLI's last turn
    { id: 'done', at: start, hud: 'world.execute(me) · done', subs: false, transitionIn: { type: 'xfade', beats: 2, align: 0 }, draw: scene },
    // Enter on /clear: a new session — no HUD (its context is empty)
    { id: 'clear', at: (T) => T.cut(enterAt(T)), subs: false, draw: scene },
  ],
});
