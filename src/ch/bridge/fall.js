// "Challenging your god": the engine's source (src/engine/timeline.js) pours down like a waterfall. Each line leaves
// the lip (above the frame) with a small speed and falls under gravity — so the stream stretches as it falls, as water
// does — trailing threads of light and a motion smear, and splashes into a pool below. The pour is already running when
// the shot cuts in (lines released before the cut are mid-fall). Then the lines around the rule drop back onto the
// wall, bottom up (09_bridge.js).
import { COLOR } from '../../theme.js';
import { clamp, smoothstep, mix3 } from '../../lib/ease.js';
import { rand } from '../../lib/hash.js';
import { burst } from '../../lib/fx.js';
import { codeLine } from './code.js';

export const G = 30, V0 = 4; // world units / s², initial downward speed (units / s)
export const fallen = (tau) => V0 * tau + 0.5 * G * tau * tau;
export const fallTime = (h) => (-V0 + Math.sqrt(V0 * V0 + 2 * G * h)) / G;
const MAXC = 30; // a falling line is cut to its first characters (the streams sit side by side)
const cut = (s) => { const v = s.trim(); return v.length > MAXC ? `${v.slice(0, MAXC - 1)}…` : v; };

// streams: [{ x, z, first (first line, 0-based), rate (lines / s) }] · t0..t1: lines are released while t ∈ [t0, t1)
// top / pool: world heights of the lip and the pool · cw: world width of one character · avoid: screen boxes
// fadeOut: how long after t1 the lines still in the air fade away (the pour is over)
export function waterfall(ctx, lines, { streams, t0, t1, top, pool, size, ref, avoid, cw = 0.078, seed = 1300, fadeOut = 0.15 }) {
  const { t } = ctx;
  if (t < t0) return;
  const T_FALL = fallTime(top - pool);
  const over = 1 - smoothstep(t1, t1 + fadeOut, t);
  if (over <= 0) return;
  streams.forEach((st, s) => {
    const dt = 1 / st.rate;
    const jMax = Math.floor((Math.min(t, t1 - 1e-6) - t0) / dt);
    const jMin = Math.max(0, Math.ceil((t - t0 - T_FALL - 0.4) / dt));
    for (let j = jMin; j <= jMax; j++) {
      const tr = t0 + j * dt, tau = t - tr, n = (st.first + j) % lines.length;
      const text = cut(lines[n]);
      if (!text) continue;
      if (tau >= T_FALL) {
        // the splash where the line hit the pool (fine grey spray)
        const ps = (tau - T_FALL) / 0.4;
        burst(ctx, { center: [st.x + 0.4 + 0.6 * rand(n, s, seed), pool, st.z], seed: seed + s * 16 + (j % 16), n: 160, r0: 0.04, r1: 0.9, p: ps, focus: ref, aperture: 2, size: 2, alpha: 0.4 * over * clamp((tau - T_FALL) * 30), color: COLOR.dim, color2: COLOR.faint });
        continue;
      }
      const y = top - fallen(tau), v = V0 + G * tau;
      const sink = (1 - smoothstep(pool + 0.9, pool, y)) * over;
      // threads of falling light behind the line, longer as it speeds up
      const w = text.length * cw;
      for (let q = 0; q < 3; q++) {
        const x = st.x + w * (0.1 + 0.8 * rand(n, q, seed + 7)), len = v * (0.03 + 0.03 * rand(n, q, seed + 8));
        ctx.line([[x, y + 0.12, st.z], [x, y + 0.12 + len, st.z]], { color: COLOR.dim, color2: COLOR.faint, width: 1.6, alpha: 0.35 * clamp(v / 12) * sink, persp: ref });
      }
      // motion smear: a faint copy up the line's path
      codeLine(ctx, text, n, [st.x, y + v * 0.018, st.z], { size, ref, alpha: 0.22 * clamp(v / 14) * sink, avoid, number: false, tone: (c) => mix3(c, COLOR.faint, 0.45) });
      codeLine(ctx, text, n, [st.x, y, st.z], { size, ref, alpha: sink, avoid, number: false });
    }
  });
}
