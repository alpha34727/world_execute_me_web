// c3.10 — "Though we are trapped / We are trapped": c1's picture-in-picture comes back as an infinite Droste spiral.
// The frame contains a screen that shows the frame itself, scaled by S and turned by ROT (the same t drawn again, a
// pure similarity map — never feedback). Zooming toward the map's fixed point by exactly one level per 1.5 beats while
// turning back by ROT lands on the identical picture: the zoom wraps around, a spiral with no bottom. Every level is
// one more call of execute(me) inside itself — `while (true)`.
// The world in the picture is c1's: the particles EXECUTION threw out, flying in a box with periodic boundaries
// (c1/world.js), released again by c3's third EXECUTION.
import { COLOR } from '../../theme.js';
import { boxEdges, wrapMarks } from '../c1/world.js';
import { sparkIcon } from '../../lib/spark.js';
import { mix3, smoothstep } from '../../lib/ease.js';

export const S = 0.4, ROT = 0.33;
const C0 = [960, 540], INNER = [1460, 600];

// similarity maps q → [a·x − b·y + tx, b·x + a·y + ty]
const sim = (s, th, tx = 0, ty = 0) => ({ a: s * Math.cos(th), b: s * Math.sin(th), tx, ty });
const ap = (m, [x, y]) => [m.a * x - m.b * y + m.tx, m.b * x + m.a * y + m.ty];
const comp = (m, n) => ({ a: m.a * n.a - m.b * n.b, b: m.a * n.b + m.b * n.a, tx: m.a * n.tx - m.b * n.ty + m.tx, ty: m.b * n.tx + m.a * n.ty + m.ty });
const scaleOf = (m) => Math.hypot(m.a, m.b), angleOf = (m) => Math.atan2(m.b, m.a);

// the self-map: the whole frame into its screen
const SELF = (() => { const m = sim(S, ROT); const c = ap(m, C0); return { ...m, tx: INNER[0] - c[0], ty: INNER[1] - c[1] }; })();
const INV = (() => { const d = SELF.a ** 2 + SELF.b ** 2, a = SELF.a / d, b = -SELF.b / d; return { a, b, tx: -(a * SELF.tx - b * SELF.ty), ty: -(b * SELF.tx + a * SELF.ty) }; })();
// its fixed point: (I − M) f = t
export const FIX = (() => { const a = SELF.a, b = SELF.b, d = (1 - a) ** 2 + b ** 2; return [((1 - a) * SELF.tx - b * SELF.ty) / d, (b * SELF.tx + (1 - a) * SELF.ty) / d]; })();
// the zoom by a fraction z of a level, about the fixed point
const zoomMap = (z) => { const m = sim(S ** -z, -ROT * z); const c = ap(m, FIX); return { ...m, tx: FIX[0] - c[0], ty: FIX[1] - c[1] }; };

// the frame's corners under m (a rotated rectangle)
const quad = (m) => [[0, 0], [1920, 0], [1920, 1080], [0, 1080], [0, 0]].map((q) => ap(m, q));

// draw the spiral: ps = the particles (c1/world.js particles()), life = wrap marks' lifetime, z = levels zoomed (any
// real ≥ 0), flash 0..1 (the frame borders light up on "trapped"). Call with the 3D camera active (it projects the
// world once), it draws in 2D. Returns { me: [x, y, k] of the level closest to full size, depth: whole levels zoomed }.
export function droste(ctx, ps, { life, z, flash = 0 }) {
  const P = (p) => { const s = ctx.project(p); return s[2] > 0.2 ? [s[0], s[1]] : null; };
  const edges = boxEdges().map(([a, b]) => [P(a), P(b)]);
  const pts = ps.map((o) => ({ p: P(o.p), q: o.q ? P(o.q) : null, hot: o.hot }));
  const marks = wrapMarks(ps, life).map((m) => ({ ...m, pts: m.pts.map(P) })).filter((m) => m.pts.every(Boolean));
  const me = P([0, 0, 0]);
  ctx.camera2D();
  const zf = z - Math.floor(z), Z = zoomMap(zf);
  // levels −2 … 7 around the view (outer ones only show at the corners while the picture turns)
  let M = comp(Z, comp(INV, INV)), best = null;
  for (let n = -2; n <= 7; n++) {
    const k = scaleOf(M), th = angleOf(M);
    if (k * 1920 < 6) break;
    if (k < 12) {
      const c = ap(M, C0);
      if (n > -2) ctx.rect(c[0] - 960 * k, c[1] - 540 * k, 1920 * k, 1080 * k, { fill: [0, 0, 0, 1], rotation: th }); // pure black: post lifts the background
      const map = (q) => ap(M, q), wl = (w) => Math.max(0.6, w * k);
      for (const [a, b] of edges) if (a && b) ctx.line([map(a), map(b)], { color: COLOR.dim, width: wl(1.6) });
      for (const o of pts) {
        if (!o.p) continue;
        const p = map(o.p);
        if (p[0] < -40 || p[0] > 1960 || p[1] < -40 || p[1] > 1120) continue;
        const col = o.hot ? COLOR.warm : COLOR.error;
        if (o.q) ctx.line([map(o.q), p], { color: col, width: wl(2), alpha: 0.75 });
        ctx.circle(p[0], p[1], Math.max(0.6, (o.hot ? 2.8 : 2) * k), { fill: col, glow: 4 * k, intensity: 0.85 });
      }
      if (k > 0.06) for (const m of marks) ctx.line(m.pts.map(map), { color: m.color, width: wl(1.6), alpha: m.alpha });
      // the picture's own edge, and the screen inside it (the next level's edge, a bezel)
      ctx.line(quad(M), { color: flash > 0 ? COLOR.me : COLOR.faint, width: wl(1.4 + 2 * flash), alpha: 0.7 + 0.3 * flash, glow: 10 * flash * k });
      const Mi = comp(M, SELF), ci = ap(Mi, C0), ki = scaleOf(Mi);
      ctx.rect(ci[0] - 960 * ki - 4 * k, ci[1] - 540 * ki - 4 * k, 1920 * ki + 8 * k, 1080 * ki + 8 * k, { stroke: COLOR.ink2, width: Math.max(0.8, 2 * k), radius: 4 * k, rotation: angleOf(Mi), alpha: 0.8 });
      // me, at every level: the same spark, at the level's scale
      if (me) {
        const m = map(me);
        // the white core only at (near) full size: the smaller copies' cores are gold (only the spark's core is white)
        if (k > 0.02) { sparkIcon(ctx, m[0], m[1], 36 * k); ctx.circle(m[0], m[1], Math.max(0.8, 7 * k), { fill: mix3(COLOR.warm, COLOR.ink, smoothstep(0.35, 0.8, k)), glow: 16 * k, intensity: 0.85 + 0.15 * smoothstep(0.35, 0.8, k) }); }
        if (!best || Math.abs(Math.log(k)) < Math.abs(Math.log(best[2]))) best = [m[0], m[1], k];
      }
    }
    M = comp(M, SELF);
  }
  return { me: best, depth: Math.floor(z) };
}
