// The chorus opening (c1.01, and c2.01 as its motif): the camera rushes in on me, light streaks fly out of the
// spark, the downbeat lands at full output and each word of "If I can" is a burst and a ring.
import { COLOR } from '../../theme.js';
import { corners } from '../../lib/hud.js';
import { clamp, lerp, easeOutCubic, easeInCubic, decay } from '../../lib/ease.js';
import { sparkAt } from '../../lib/spark.js';
import { rand } from '../../lib/hash.js';
import { orbit, shake } from '../../lib/camera.js';
import { dust } from '../../lib/scene3d.js';
import { embers, burst, shockwave } from '../../lib/fx.js';

const TAU = Math.PI * 2;

// t0: the cut onto the shot; t1: the next shot; words: the sung words of "If I can"; seed: 340 for c1
// time: draw the shot as of another moment (the bridge's broken version holds frames)
// color/color2: the light flying out (c3 opens in red: color = error, color2 = me)
export function chorusOpen(ctx, { t0, t1, words, seed = 340, shakeSeed = 31, time, color = COLOR.me, color2 = COLOR.warm, wordColor2 = COLOR.ink }) {
  const { T } = ctx;
  const t = time ?? ctx.t;
  const k = clamp((t - t0) / (t1 - t0));
  const cam = orbit({ target: shake(t, 0.03, shakeSeed), r: lerp(9, 5.2, easeInCubic(k)), az: 0.2 + 0.3 * k, el: 0.1, fov: 44 });
  ctx.camera3D(cam);
  dust(ctx, { focus: 7 });
  embers(ctx, { radius: [1.2, 6], n: 5000, focus: 6, aperture: 5, size: 3.4, alpha: 1, color: COLOR.dim, color2: COLOR.ink2, seed: seed + 1, drift: 0.6 });
  // light streaks flying out from me (pre1 dived in; c1 bursts out)
  const ps = clamp((t - t0) / T.beats(1.6));
  if (ps < 1) for (let i = 0; i < 180; i++) {
    const z = rand(i, 1, seed + 6) * 2 - 1, a = rand(i, 2, seed + 6) * TAU, rr = Math.sqrt(1 - z * z), d = [rr * Math.cos(a), z, rr * Math.sin(a)];
    const r0 = 0.6 + 7 * easeOutCubic(ps) * (0.6 + 0.4 * rand(i, 3, seed + 6)), r1 = r0 + 0.5 + 1.5 * (1 - ps);
    ctx.line([d.map((v) => v * r0), d.map((v) => v * r1)], { color, color2, width: 2, alpha: 0.8 * (1 - ps), glow: 6, persp: 6 });
  }
  // the chorus lands on the downbeat, then each word of "If I can" is a burst and a ring from me
  const pd = clamp((t - t0 + 2 / 60) / T.beats(1.2)); // already two frames in on the cut: the seam lands at full output
  burst(ctx, { seed: seed + 5, n: 3500, r0: 0.9, r1: 8, p: pd, focus: 6, aperture: 3, size: 3.6, alpha: 1.1, color, color2 });
  if (pd > 0 && pd < 1) shockwave(ctx, { u: [1, 0, 0], v: [0, 0, 1], r: 0.4 + 6 * easeOutCubic(pd), alpha: 0.85 * (1 - pd), ref: 6, width: 3, color });
  words.forEach((w, n) => {
    const pw = clamp((t - w.start) / T.beats(1.3));
    burst(ctx, { seed: seed + 2 + n, n: 3000, r0: 0.6, r1: 6 + 2 * n, p: pw, focus: 6, aperture: 3, size: 3.4, alpha: 1.1 * clamp((t - w.start) * 30), color, color2: wordColor2 });
    if (pw > 0 && pw < 1) shockwave(ctx, { u: [1, 0, 0], v: [0, 1, 0], r: 0.4 + (4 + n) * easeOutCubic(pw), alpha: 0.85 * (1 - pw), ref: 6, width: 3, color });
  });
  const f = T.beatAt(t) - Math.floor(T.beatAt(t));
  ctx.post({ exposure: 1 + 0.25 * decay(f, 5) + 0.3 * decay((t - t0) / T.beats(1), 3), bloom: 0.85 });
  sparkAt(ctx, cam, { px: 70 * (1 + 0.25 * decay(f, 5)), rays: 1 });
  ctx.camera2D();
  corners(ctx, { color: COLOR.faint });
}
