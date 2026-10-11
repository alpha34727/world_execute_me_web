// 3D furniture drawn with the current 3D camera: floor grids, polar grids, axis gizmo.
import { COLOR } from '../theme.js';
import { Swarm } from '../engine/gl/swarm.js';
import * as S from './sample.js';

// square grid on the plane y = y0 (x/z from -half..half), fading with depth
export function floorGrid(ctx, { y0 = -2, half = 12, step = 1, color = COLOR.faint, alpha = 0.55, fog = [6, 22], width = 1.1 } = {}) {
  for (let v = -half; v <= half + 1e-6; v += step) {
    const major = Math.abs(v % (step * 4)) < 1e-6;
    const o = { color, alpha: alpha * (major ? 1 : 0.5), width: width * (major ? 1.3 : 1), persp: 6, fog };
    ctx.line([[v, y0, -half], [v, y0, half]], o);
    ctx.line([[-half, y0, v], [half, y0, v]], o);
  }
}

// concentric rings + radial spokes on a plane through `center` spanned by unit vectors u, v
export function polarGrid(ctx, { center = [0, 0, 0], u = [1, 0, 0], v = [0, 0, 1], rings = 5, step = 0.5, spokes = 12, color = COLOR.faint, alpha = 0.5, fog } = {}) {
  const P = (r, a) => [center[0] + r * (Math.cos(a) * u[0] + Math.sin(a) * v[0]), center[1] + r * (Math.cos(a) * u[1] + Math.sin(a) * v[1]), center[2] + r * (Math.cos(a) * u[2] + Math.sin(a) * v[2])];
  for (let i = 1; i <= rings; i++) {
    const pts = Array.from({ length: 97 }, (_, k) => P(i * step, (k / 96) * Math.PI * 2));
    ctx.line(pts, { color, alpha: alpha * (i === rings ? 1 : 0.6), width: 1, persp: 6, fog });
  }
  for (let k = 0; k < spokes; k++) ctx.line([center, P(rings * step, (k / spokes) * Math.PI * 2)], { color, alpha: alpha * 0.5, width: 1, persp: 6, fog });
}

// small screen-space axis triad showing the current camera orientation (x orange-ish ink, y ink2, z dim)
export function axisGizmo(ctx, cam, x = 1800, y = 960, len = 34) {
  const t = cam.target ?? [0, 0, 0], p = cam.position;
  const f = [t[0] - p[0], t[1] - p[1], t[2] - p[2]];
  const fl = Math.hypot(...f);
  ctx.camera3D(cam); // project with the scene camera, draw in design space
  const o = ctx.project(t);
  const Q = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((d) => ctx.project([t[0] + d[0] * 0.5, t[1] + d[1] * 0.5, t[2] + d[2] * 0.5]));
  ctx.camera2D();
  ctx.circle(x, y, 2.5, { fill: COLOR.dim });
  [[[1, 0, 0], 'x', COLOR.me], [[0, 1, 0], 'y', COLOR.ink2], [[0, 0, 1], 'z', COLOR.you]].forEach(([d, label, color], i) => {
    const q = Q[i];
    const dx = q[0] - o[0], dy = q[1] - o[1], L = Math.hypot(dx, dy);
    const along = (f[0] * d[0] + f[1] * d[1] + f[2] * d[2]) / fl;
    const k = len * Math.max(0.1, Math.sqrt(Math.max(0, 1 - along * along))); // foreshortened length
    if (L < 1e-6) return;
    const ex = x + (dx / L) * k, ey = y + (dy / L) * k;
    ctx.line([[x, y], [ex, ey]], { color, width: 2 });
    ctx.text(label, x + (dx / L) * (k + 12), y + (dy / L) * (k + 12), { font: 'mono', size: 13, align: 'center', baseline: 'middle', color });
  });
}

// floating dust in a large volume: out-of-focus particles become soft bokeh (depth of field)
export function dust(ctx, { focus = 7, n = 700, seed = 31, extent = [26, 14, 26], center = [0, 0, -2], alpha = 0.55, color = COLOR.ink2, size = 2.2 } = {}) {
  const sw = ctx.memo(`dust:${seed}:${n}`, () => {
    const pts = S.rect(-extent[0] / 2, -extent[1] / 2, extent[0], extent[1], n, { seed, zDepth: extent[2] });
    for (let i = 0; i < n; i++) { pts[i * 3] += center[0]; pts[i * 3 + 1] += center[1]; pts[i * 3 + 2] += center[2]; }
    return new Swarm({ from: pts, seed });
  });
  ctx.swarm(sw, { p: 0, size, perspective: true, focus, aperture: 16, drift: 0.25, time: ctx.t * 0.6, color, alpha, sizeVar: 0.6 });
}
