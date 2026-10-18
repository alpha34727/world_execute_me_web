// The song's own mel spectrogram as a landscape flown over at low altitude. Each ridge is the 16 mel bands at one
// instant (low → high across x, Catmull–Rom between bands); ridges sit on a 1/12-beat grid of song time, at depth
// z = −(τ − t)·V, so the music still to come lies ahead and rolls toward the camera; the ridge at z = 0 is now.
// Hidden lines are removed with the floating horizon: ridges are drawn nearest first and only the parts above
// everything nearer on screen survive (no fill needed, the front hides the back as on a real terrain).
import { COLOR } from '../../theme.js';
import { smoothstep, mix3, clamp } from '../../lib/ease.js';

export const SPEC = { V: 5.2, X: 3.4, H: 1.15, NX: 97 };
const lvl = (m) => clamp((m - 0.3) / 0.7); // the bands live in 0.3..1 most of the time (p1/p99-normalised)

// heights across x at song time τ
export function ridge(F, tau) {
  const m = F.mel(tau), out = new Array(SPEC.NX);
  for (let i = 0; i < SPEC.NX; i++) {
    const b = (i / (SPEC.NX - 1)) * 15, j = Math.floor(Math.min(b, 14.999)), f = b - j;
    const p0 = m[Math.max(0, j - 1)], p1 = m[j], p2 = m[j + 1], p3 = m[Math.min(15, j + 2)];
    const v = 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    out[i] = lvl(v);
  }
  return out;
}
export const xOf = (i) => ((i / (SPEC.NX - 1)) * 2 - 1) * SPEC.X;
// the spectrum's centre of mass in band units (0..15), mapped to x
export function centroidX(F, t) {
  const m = F.mel(t);
  let s = 0, w = 0;
  m.forEach((v, b) => { const a = lvl(v) ** 2; s += a * b; w += a; });
  return ((w > 0 ? s / w : 7.5) / 15 * 2 - 1) * SPEC.X;
}

// rows: [{ tau, style: 'grid' | 'now' | 'mark', w? }]; draws them with hidden lines removed (call with the 3D camera)
export function terrain(ctx, t, rows, { zNear = 2.4, ref = 4, fog = [6, 15], alpha = 1 } = {}) {
  const { F } = ctx;
  const hz = new Float32Array(1922).fill(1e9);
  const items = rows.map((r) => ({ ...r, z: -(r.tau - t) * SPEC.V })).filter((r) => r.z < zNear).sort((a, b) => b.z - a.z);
  for (const r of items) {
    const h = ridge(F, r.tau);
    const P = h.map((y, i) => [xOf(i), 0.02 + y * SPEC.H, r.z]);
    const sp = P.map((p) => ctx.project(p));
    const vis = sp.map(([x, y, w]) => w > 0.05 && (x < 0 || x > 1921 || y <= hz[Math.round(x)] + 0.75));
    // near ridges fade in from under the camera; marks and now are brighter
    const near = 1 - smoothstep(zNear - 1.6, zNear, r.z);
    const st = r.style;
    const width = st === 'now' ? 3.4 : st === 'mark' ? 2.6 : 1.7;
    const a = alpha * near * (st === 'grid' ? 0.85 : 1) * (r.a ?? 1);
    let run = [], cols = [];
    const flush = () => {
      if (run.length > 1) ctx.line(run, { colors: cols, width, persp: ref, fog, glow: st === 'grid' ? 0 : 6, glowStrength: 0.3, intensity: st === 'grid' ? 0.95 : 0.75 });
      run = []; cols = [];
    };
    P.forEach((p, i) => {
      if (!vis[i]) { flush(); return; }
      const y = h[i];
      // quiet valleys are you's blue, loud peaks me's orange; the now ridge and the sung words are warm gold
      const c = st === 'grid' ? (y > 0.82 ? mix3(COLOR.me, COLOR.warm, smoothstep(0.82, 1, y)) : mix3(COLOR.you, COLOR.me, smoothstep(0.3, 0.72, y))) : COLOR.warm;
      run.push(p); cols.push([c[0], c[1], c[2], a * (st === 'grid' ? 0.45 + 0.55 * smoothstep(0.1, 0.6, y) : 1)]);
    });
    flush();
    // the horizon rises to this ridge
    for (let i = 0; i + 1 < sp.length; i++) {
      const [x0, y0, w0] = sp[i], [x1, y1, w1] = sp[i + 1];
      if (w0 <= 0.05 || w1 <= 0.05) continue;
      const lo = Math.max(0, Math.ceil(Math.min(x0, x1))), hi = Math.min(1921, Math.floor(Math.max(x0, x1)));
      for (let x = lo; x <= hi; x++) { const k = x1 === x0 ? 0 : (x - x0) / (x1 - x0); const y = y0 + (y1 - y0) * k; if (y < hz[x]) hz[x] = y; }
    }
  }
}
