// Claude on screen — "me". An original procedural spark: a bright core with round-capped rays of irregular,
// hashed lengths radiating in 3D. It rotates slowly, breathes with the vocal energy (F) and pulses on beats.
// Drawn with the current camera (call ctx.camera3D first for 3D; works with the 2D camera too, z ignored).
import { COLOR } from '../theme.js';
import { rand, rands } from './hash.js';
import { decay } from './ease.js';

const RAYS = 12;

// unit ray directions, mostly in the screen plane with some depth, irregular angles
function rays(seed) {
  const out = [];
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * Math.PI * 2 + rands(i, seed, 1) * 0.16;
    const tilt = rands(i, seed, 2) * 0.55;
    const len = 0.62 + 0.38 * rand(i, seed, 3);
    out.push({ dir: [Math.cos(a) * Math.cos(tilt), Math.sin(a) * Math.cos(tilt), Math.sin(tilt)], len, w: 0.75 + 0.5 * rand(i, seed, 4) });
  }
  return out;
}

function rotY([x, y, z], a) { const c = Math.cos(a), s = Math.sin(a); return [c * x + s * z, y, -s * x + c * z]; }
function rotX([x, y, z], a) { const c = Math.cos(a), s = Math.sin(a); return [x, c * y - s * z, s * y + c * z]; }

// o: { pos [x,y,z], size (world units), t, energy 0..1, color, seed, spin, alpha, width (design px), glow, unfold 0..1 }
export function drawSpark(ctx, o = {}) {
  const { T, F, t } = ctx;
  const pos = o.pos ?? [0, 0, 0];
  const size = o.size ?? 1;
  const seed = o.seed ?? 7;
  const color = o.color ?? COLOR.me;
  const alpha = o.alpha ?? 1;
  const unfold = o.unfold ?? 1;
  const beat = T.beatAt(t);
  const pulse = decay(beat - Math.floor(beat), 5);
  const voice = o.energy ?? F.get('rms_vocals', t);
  const spin = (o.spin ?? 0.35) * t;
  const W = o.width ?? 6;
  const R = rays(seed);
  for (let i = 0; i < R.length; i++) {
    const r = R[i];
    const breathe = 1 + 0.18 * voice * Math.sin(t * 2.1 + i * 1.7) + 0.12 * pulse;
    const L = size * r.len * breathe * unfold;
    const d = rotY(rotX(r.dir, 0.25 * Math.sin(spin * 0.7)), spin);
    // taper: three stacked strokes, thinner toward the tip (round caps make the joins seamless)
    const seg = [[0.18, 1.0], [0.55, 0.78], [0.85, 0.5], [1.0, 0.32]];
    let prev = 0.08;
    for (const [f, wk] of seg) {
      const a = [pos[0] + d[0] * L * prev, pos[1] + d[1] * L * prev, pos[2] + d[2] * L * prev];
      const b = [pos[0] + d[0] * L * f, pos[1] + d[1] * L * f, pos[2] + d[2] * L * f];
      ctx.line([a, b], { color, width: W * r.w * wk * size, alpha, glow: (o.glow ?? 14) * size, glowStrength: 0.22, persp: o.persp ?? 6, intensity: 1.15 });
      prev = f;
    }
  }
  // core
  ctx.line([pos, pos], { color: COLOR.ink, width: W * 2.4 * size * (1 + 0.25 * pulse), alpha, glow: 24 * size, glowStrength: 0.5, persp: o.persp ?? 6, intensity: 1.3 });
}

// flat 2D icon for HUDs (x, y design px, radius px)
export function sparkIcon(ctx, x, y, r, { t = ctx.t, color = COLOR.me, alpha = 1, seed = 7 } = {}) {
  const R = rays(seed);
  const spin = 0.35 * t;
  for (let i = 0; i < R.length; i++) {
    const a = Math.atan2(R[i].dir[1], R[i].dir[0]) + spin;
    const L = r * R[i].len;
    ctx.line([[x + Math.cos(a) * r * 0.12, y + Math.sin(a) * r * 0.12], [x + Math.cos(a) * L, y + Math.sin(a) * L]], { color, width: Math.max(1.4, r * 0.16 * R[i].w), alpha });
  }
}

// world-space size that makes the spark's rays ~px design pixels long for a camera (orbit()/camera3D options)
export function sparkSize(cam, px, pos = [0, 0, 0]) {
  const d = Math.hypot(cam.position[0] - pos[0], cam.position[1] - pos[1], cam.position[2] - pos[2]);
  return (px / 540) * d * Math.tan(((cam.fov ?? 40) * Math.PI) / 360);
}

// me in a 3D shot: constant on-screen size (px ≈ ray length in design px), a white core that reads even when the
// rays are seen edge-on, and light shafts from it (post rays). The film uses px = 70 throughout.
// color: only for pre2's role swap (me wears you's blue for four beats)
export function sparkAt(ctx, cam, { pos = [0, 0, 0], px = 70, rays = 0.35, alpha = 1, color = COLOR.me } = {}) {
  drawSpark(ctx, { pos, size: sparkSize(cam, px, pos), alpha, color });
  // the core scales with distance like any 3D point, but only within 0.8–1.3× (a very close or very long lens would
  // otherwise blow it up into a white ball or shrink it to a dot: the film has one spark size)
  const w = ctx.project(pos)[2];
  if (w > 0.2) ctx.point3D(pos, 7, { fill: COLOR.ink, glow: 16, alpha, ref: w * Math.min(1.3, Math.max(0.8, 6 / w)) });
  if (rays > 0) { const sp = ctx.project(pos); ctx.post({ rays: [sp[0], sp[1], rays * 1.3 * alpha], bloom: 0.72 }); }
}
