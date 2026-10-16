// y = 1/x, ridden to infinity (v1.07–09). me is the curve, you is its asymptote y = 0: they get closer forever and
// never touch. Everything is the real function; every tick is a real power of ten.
//   world   the curve over a logarithmic floor: X = DEC·log10 x, Y = YS / x (v1.07 infinity); me crosses one decade
//           per beat
//   zoom    the gap under me, magnified: u = log10 x − k, v = y·10^k (v1.08 be-my, v1.09 limitations). Because 1/x
//           is self-similar under that zoom (v = 10^−u for every k) the curve never changes — only the grid and the
//           tick labels move, and the gap reads 10^−k: zooming in never reaches zero. The view stops where the gap
//           would be thinner than the lines (it is never drawn closed).
import * as THREE from 'three';
import { Swarm } from '../../engine/gl/swarm.js';
import { sampleSegments, shockwave, flow } from '../../lib/fx.js';
import { youLine } from '../../lib/scene3d.js';
import { COLOR } from '../../theme.js';
import { clamp, smoothstep, decay } from '../../lib/ease.js';

export const DEC = 2, YS = 1.8, U0 = -0.25, U1 = 11;
export const curvePt = (u) => [DEC * u, YS * 10 ** -u, 0];

// log10 of me's x: one decade per beat, x = 10^n exactly on the beats after "If I approach infinity" starts
export function decade(T, t) {
  const a = T.findLine('If I approach infinity', 0, 'v1').words[0].start;
  return Math.max(0, T.beatAt(t) - Math.round(T.beatAt(a)));
}

// 10ⁿ in 2D with a real superscript (the font's superscript glyphs are too small to read): base ≥ 16 px,
// exponent 0.75 of it, raised; 1, 10, 100, 1000 are written out
export function pow10Text(ctx, n, x, y, { size = 16, color = COLOR.dim, alpha = 1, align = 'center', backing = 0 } = {}) {
  const o = { font: 'mono', size, color, alpha };
  const small = n >= 0 && n <= 3;
  const base = small ? String(10 ** n) : '10', ex = small ? '' : String(n).replace('-', '−');
  const es = Math.round(size * 0.75);
  const wb = ctx.measure(base, o), we = ex ? ctx.measure(ex, { ...o, size: es }) + 1 : 0;
  const x0 = align === 'center' ? x - (wb + we) / 2 : align === 'right' ? x - wb - we : x;
  if (backing > 0) ctx.rect(x0 - 5, y - size * 0.95 - 4, wb + we + 10, size * 1.25 + 6, { fill: [0, 0, 0, backing * alpha], radius: 3 });
  ctx.text(base, x0, y, o);
  if (ex) ctx.text(ex, x0 + wb + 1, y - size * 0.42, { ...o, size: es });
}

// draw in screen space, then give the caller its 3D camera back
function in2D(ctx, fn) { const cam = ctx.cam, cam3 = ctx.cam3; ctx.camera2D(); fn(); ctx.cam = cam; ctx.cam3 = cam3; }

const polySwarm = (pts, perUnit, seed, jitter) => new Swarm({ from: sampleSegments(pts.slice(1).map((p, i) => [pts[i], p]), perUnit, seed, jitter), seed });

// the curve, the axis (grey), a floor grid with a line per decade, ticks + labels below the axis. Returns me's point
// and obstacles for labels3D (the curve).
export function world(ctx, t, { ref = 7, fog = [6, 24], alpha = 1 } = {}) {
  const { T } = ctx;
  const u = decade(T, t);
  const N = Math.round((U1 - U0) / 0.02);
  const pts = Array.from({ length: N + 1 }, (_, i) => curvePt(U0 + (i / N) * (U1 - U0)));
  ctx.line(pts, { color: COLOR.me, width: 3.4, alpha, glow: 12, glowStrength: 0.4, persp: ref, fog });
  const csw = ctx.memo('v1:curve', () => polySwarm(pts, 40, 301, 0.02));
  ctx.swarm(csw, { p: 0, size: 2.8, sizeVar: 0.6, perspective: true, focus: ref, aperture: 4, drift: 0.04, time: t, color: COLOR.me, color2: COLOR.warm, colorVar: 0.3, alpha: alpha * 0.85, fog });
  flow(ctx, 'world', curvePt, { u0: U0, u1: 9, ref, fog, alpha, jitter: 0.02 });
  ctx.line([[DEC * U0 - 3, 0, 0], [DEC * U1, 0, 0]], { color: COLOR.ink2, width: 1.6, alpha: alpha * 0.8, persp: ref, fog });
  // the logarithmic floor: decade lines run into the depth, 2..9 fainter; the decade me has just crossed flashes
  for (let n = -1; n < U1; n++) {
    const X = DEC * n;
    const hot = decay(u - n, 2.5) * (u >= n ? 1 : 0);
    ctx.line([[X, 0, -9], [X, 0, 3]], { color: hot > 0.05 ? COLOR.warm : COLOR.faint, width: 1.3 + 1.5 * hot, alpha: alpha * (0.55 + 0.45 * hot), persp: ref, fog, glow: 8 * hot });
    for (let m = 2; m < 10; m++) { const x = X + DEC * Math.log10(m); ctx.line([[x, 0, -9], [x, 0, 3]], { color: COLOR.faint, width: 1, alpha: alpha * 0.3, persp: ref, fog }); }
    if (u >= n && u - n < 1) shockwave(ctx, { center: [X, 0, 0], u: [1, 0, 0], v: [0, 0, 1], r: 0.1 + 1.6 * (u - n), alpha: 0.8 * (1 - (u - n)), color: COLOR.warm, ref, width: 2.5 });
  }
  for (let z = -9; z <= 3; z += 1.5) ctx.line([[DEC * U0 - 3, 0, z], [DEC * U1, 0, z]], { color: COLOR.faint, width: 1, alpha: alpha * 0.25, persp: ref, fog });
  // tick labels below the axis, on a dark backing (the curve is above it)
  const ticks = Array.from({ length: U1 }, (_, n) => ({ n, s: ctx.project([DEC * n, 0, 0]) }));
  in2D(ctx, () => ticks.forEach(({ n, s: [x, y, w] }) => {
    if (w < 0.5 || x < 30 || x > 1890) return;
    const a = alpha * (1 - clamp((w - fog[0]) / (fog[1] - fog[0])));
    if (a < 0.02) return;
    const hot = decay(u - n, 2.5) * (u >= n ? 1 : 0);
    pow10Text(ctx, n, x, y + 56, { size: 18, color: hot > 0.05 ? COLOR.warm : COLOR.ink2, alpha: a, backing: 0.7 });
  }));
  return { me: curvePt(u), obstacles: Array.from({ length: 30 }, (_, i) => ({ a: curvePt(U0 + i * 0.08), b: curvePt(U0 + (i + 1) * 0.08), r: 8 })) };
}

// the zoomed gap: X = ZX·u, Y = ZY·v. Returns me's point (u = 0, v = 1).
//   you: 0 = the axis is grey, 1 = blue (you)
export const ZX = 3, ZY = 1.45;
const VMAX = 1.6, UB = 1.25; // at u = UB the gap is still 0.08 units (> 12 px): the view never shows it closed
export function zoom(ctx, t, k, { ref = 8, alpha = 1, fog, you = 1 } = {}) {
  const K = Math.floor(k);
  const UA = -Math.log10(VMAX);
  const zf = (u) => [ZX * u, ZY * 10 ** -u, 0];
  // the curve (identical for every k: that is the point): fades in at the top, fades out where it leaves the view
  const pts = Array.from({ length: 241 }, (_, i) => zf(UA + (i / 240) * (UB - UA)));
  const fadeU = (u) => smoothstep(UA, UA + 0.12, u) * (1 - smoothstep(UB - 0.35, UB, u));
  for (let s = 0; s < 12; s++) {
    const seg = pts.slice(s * 20, s * 20 + 21), um = UA + ((s + 0.5) / 12) * (UB - UA);
    ctx.line(seg, { color: COLOR.me, width: 3.4, alpha: alpha * fadeU(um), glow: 12, glowStrength: 0.4, persp: ref, fog });
  }
  const csw = ctx.memo('v1:zoomCurve', () => polySwarm(pts.slice(10, 200), 45, 303, 0.008));
  ctx.swarm(csw, { p: 0, size: 2.6, sizeVar: 0.6, perspective: true, focus: ref, aperture: 4, drift: 0.015, time: t, color: COLOR.me, color2: COLOR.warm, colorVar: 0.3, alpha: alpha * 0.8, fog });
  flow(ctx, 'zoom', zf, { u0: UA + 0.05, u1: UB - 0.45, du: 0.2, n: 900, ref, fog, alpha, jitter: 0.008 });
  // the asymptote: you (drawn over me, never blended with it)
  const ax = [[ZX * UA - 1.4, 0, 0], [ZX * (UB + 0.5), 0, 0]];
  if (you < 1) ctx.line(ax, { color: COLOR.ink2, width: 1.6, alpha: alpha * (1 - you) * 0.8, persp: ref, fog });
  if (you > 0) {
    youLine(ctx, ax, { width: 3, alpha: alpha * you, glow: 14, glowStrength: 0.45, persp: ref, fog });
    flow(ctx, 'zoomAxis', (u) => [ZX * u, 0, 0], { u0: UA - 0.45, u1: UB + 0.3, du: 0.2, n: 600, ref, fog, alpha: alpha * you, color: COLOR.you, color2: COLOR.ink, size: 2.6, jitter: 0.008 });
  }
  // the grid: y = 10^−n sits at v = 10^(k − n); as k grows the lines stream up and away from the axis, and new ones
  // come out of it — the zoom. x = 10^n ticks on the axis stream left (u = n − k).
  const grid = [];
  for (let n = K - 1; n <= K + 4; n++) {
    const v = 10 ** (k - n), Y = ZY * v;
    const a = alpha * smoothstep(0.04, 0.3, v) * (1 - smoothstep(1.2, VMAX, v));
    if (a <= 0.01) continue;
    ctx.line([[ZX * UA - 1.4, Y, 0], [ZX * UB, Y, 0]], { color: COLOR.faint, width: 1.1, alpha: a * 0.8, persp: ref, fog, dash: 6, gap: 6 });
    grid.push({ n: -n, p: [ZX * UA - 1.4, Y, 0], a, align: 'right', dx: -10, dy: 6 });
  }
  for (let n = K - 1; n <= K + 4; n++) {
    const u = n - k, X = ZX * u;
    if (u < UA - 0.45 || u > UB + 0.4) continue;
    const a = alpha * smoothstep(UA - 0.45, UA - 0.2, u) * (1 - smoothstep(UB + 0.1, UB + 0.4, u));
    ctx.line([[X, -0.08, 0], [X, -0.26, 0]], { color: COLOR.ink2, width: 1.6, alpha: a, persp: ref, fog });
    grid.push({ n, p: [X, -0.26, 0], a, align: 'center', dx: 0, dy: 26 });
  }
  const pr = grid.map((g) => ({ ...g, s: ctx.project(g.p) }));
  in2D(ctx, () => {
    for (const g of pr) {
      if (g.s[2] <= 0.3) continue;
      const pinned = g.align === 'right' && g.s[0] + g.dx < 110; // every grid line keeps its label on screen
      pow10Text(ctx, g.n, pinned ? 40 : g.s[0] + g.dx, g.s[1] + g.dy, { size: 17, color: COLOR.ink2, alpha: g.a * 0.9, align: pinned ? 'left' : g.align, backing: 0.8 });
    }
  });
  return { me: zf(0) };
}

// a dimension line beside me (top) and you (bottom) with the real gap 1/x, label to its left
export function gapCaliper(ctx, top, bottom, value, { ref = 8, alpha = 1, x = -0.32 } = {}) {
  const a = [top[0] + x, top[1], top[2]], b = [bottom[0] + x, bottom[1], bottom[2]];
  ctx.line([a, b], { color: COLOR.ink2, width: 1.6, alpha, persp: ref });
  for (const p of [a, b]) ctx.line([[p[0] - 0.12, p[1], p[2]], [p[0] + 0.12, p[1], p[2]]], { color: COLOR.ink2, width: 1.6, alpha, persp: ref });
  const [sx, sy, w] = ctx.project([a[0] - 0.2, (a[1] + b[1]) / 2, a[2]]);
  if (w <= 0.3) return;
  in2D(ctx, () => {
    const o = { font: 'monoBold', size: 22, color: COLOR.ink, alpha }, tw = ctx.measure(value, o);
    ctx.rect(sx - tw - 8, sy - 22, tw + 14, 32, { fill: [0, 0, 0, 0.8 * alpha], radius: 3 });
    ctx.text(value, sx - tw, sy + 7, o);
  });
}
