// 3D furniture drawn with the current 3D camera: floor grids, polar grids, axis gizmo.
import { COLOR } from '../theme.js';
import { clamp } from './ease.js';
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

// small screen-space axis triad showing the current camera orientation (x orange, y ink2, z dim — blue is you's)
export function axisGizmo(ctx, cam, x = 1800, y = 960, len = 34) {
  const t = cam.target ?? [0, 0, 0], p = cam.position;
  const f = [t[0] - p[0], t[1] - p[1], t[2] - p[2]];
  const fl = Math.hypot(...f);
  ctx.camera3D(cam); // project with the scene camera, draw in design space
  const o = ctx.project(t);
  const Q = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((d) => ctx.project([t[0] + d[0] * 0.5, t[1] + d[1] * 0.5, t[2] + d[2] * 0.5]));
  ctx.camera2D();
  ctx.circle(x, y, 2.5, { fill: COLOR.dim });
  const placed = [];
  [[[1, 0, 0], 'x', COLOR.me], [[0, 1, 0], 'y', COLOR.ink2], [[0, 0, 1], 'z', COLOR.dim]].forEach(([d, label, color], i) => {
    const q = Q[i];
    const dx = q[0] - o[0], dy = q[1] - o[1], L = Math.hypot(dx, dy);
    const along = (f[0] * d[0] + f[1] * d[1] + f[2] * d[2]) / fl;
    const k = len * Math.max(0.1, Math.sqrt(Math.max(0, 1 - along * along))); // foreshortened length
    if (L < 1e-6) return;
    const ex = x + (dx / L) * k, ey = y + (dy / L) * k;
    ctx.line([[x, y], [ex, ey]], { color, width: 2 });
    // labels only for axes that are not end-on, and never on top of another label
    const lx = x + (dx / L) * (k + 12), ly = y + (dy / L) * (k + 12);
    if (k < len * 0.35 || placed.some(([px, py]) => Math.hypot(px - lx, py - ly) < 16)) return;
    placed.push([lx, ly]);
    ctx.text(label, lx, ly, { font: 'mono', size: 13, align: 'center', baseline: 'middle', color });
  });
}

// floating dust in a large volume: out-of-focus particles become soft bokeh (depth of field)
// time: drift clock (default ctx.t · 0.6; pass a frozen value to hold the dust still)
export function dust(ctx, { focus = 7, n = 700, seed = 31, extent = [26, 14, 26], center = [0, 0, -2], alpha = 0.55, color = COLOR.ink2, size = 2.2, time = ctx.t * 0.6 } = {}) {
  const sw = ctx.memo(`dust:${seed}:${n}`, () => {
    const pts = S.rect(-extent[0] / 2, -extent[1] / 2, extent[0], extent[1], n, { seed, zDepth: extent[2] });
    for (let i = 0; i < n; i++) { pts[i * 3] += center[0]; pts[i * 3 + 1] += center[1]; pts[i * 3 + 2] += center[2]; }
    return new Swarm({ from: pts, seed });
  });
  ctx.swarm(sw, { p: 0, size, perspective: true, focus, aperture: 16, drift: 0.25, time, color, alpha, sizeVar: 0.6 });
}

// 3D labels that never overlap: project every label with the current 3D camera, then place them greedily in priority
// order (higher first; ties: nearer first). Each label tries 8 positions around its point and takes the first whose
// screen box touches neither a placed label nor an obstacle (projected points / line segments); otherwise it is dropped.
// items: [{ p: [x,y,z] (the point labelled), text, priority?, id?, o: text options + ref, fog, minSize?, maxSize?, backing? }]
// obstacles: [{ p: [x,y,z], r: px, id? } | { a: [x,y,z], b: [x,y,z], r: px } | { rect: [x0, y0, x1, y1] }] — rect is a
// screen box in design px (a hero keyword, a panel); an item ignores obstacles with its own id
export function labels3D(ctx, items, { pad = 4, obstacles = [] } = {}) {
  const rects = obstacles.filter((o) => o.rect).map((o) => o.rect);
  const obs = obstacles.filter((o) => !o.rect).map((o) => (o.a ? { a: ctx.project(o.a), b: ctx.project(o.b), r: o.r ?? 6 } : { c: ctx.project(o.p), r: o.r ?? 10, id: o.id }))
    .filter((o) => (o.c ? o.c[2] > 0.2 : o.a[2] > 0.2 && o.b[2] > 0.2));
  const circBox = (c, r, b) => { const dx = Math.max(b[0] - c[0], 0, c[0] - b[2]), dy = Math.max(b[1] - c[1], 0, c[1] - b[3]); return dx * dx + dy * dy < r * r; };
  const segBox = (a, q, r, b0) => {
    // Liang–Barsky against the box grown by r
    const b = [b0[0] - r, b0[1] - r, b0[2] + r, b0[3] + r];
    let t0 = 0, t1 = 1;
    const dx = q[0] - a[0], dy = q[1] - a[1];
    for (const [pp, qq] of [[-dx, a[0] - b[0]], [dx, b[2] - a[0]], [-dy, a[1] - b[1]], [dy, b[3] - a[1]]]) {
      if (pp === 0) { if (qq < 0) return false; continue; }
      const u = qq / pp;
      if (pp < 0) { if (u > t1) return false; if (u > t0) t0 = u; } else { if (u < t0) return false; if (u < t1) t1 = u; }
    }
    return true;
  };
  const placed = [];
  const cam = ctx.cam, cam3 = ctx.cam3; // restored at the end: the caller may keep drawing in 3D
  const cand = items.map((it) => { const [x, y, w] = ctx.project(it.p); return { ...it, x, y, w }; })
    .filter((c) => c.w > 0.2).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.w - b.w);
  for (const c of cand) {
    const o = c.o;
    const size = clamp((o.size ?? 24) * ((o.ref ?? 6) / c.w), o.minSize ?? 0, o.maxSize ?? Infinity);
    let alpha = o.alpha ?? 1;
    if (o.fog) alpha *= 1 - clamp((c.w - o.fog[0]) / (o.fog[1] - o.fog[0]));
    if (alpha <= 0.01) continue;
    const wpx = ctx.measure(c.text, { ...o, size }), hpx = size * 0.8, g = 9;
    const spots = [[g, -g], [g, hpx + g], [-wpx - g, -g], [-wpx - g, hpx + g], [-wpx / 2, -g - 4], [-wpx / 2, hpx + g + 6], [g + 4, hpx / 2], [-wpx - g - 4, hpx / 2]];
    for (const [dx, dy] of spots) {
      const bx = [c.x + dx - pad, c.y + dy - hpx - pad, c.x + dx + wpx + pad, c.y + dy + pad];
      if (bx[0] < 30 || bx[2] > 1890 || bx[1] < 120 || bx[3] > 1050) continue;
      if ([...placed, ...rects].some((b) => bx[0] < b[2] && bx[2] > b[0] && bx[1] < b[3] && bx[3] > b[1])) continue;
      if (obs.some((ob) => (ob.c ? (ob.id === undefined || ob.id !== c.id) && circBox(ob.c, ob.r, bx) : segBox(ob.a, ob.b, ob.r, bx)))) continue;
      ctx.camera2D();
      // backing: darken whatever 3D content runs behind the label (grid lines, rays) so nothing strikes it through
      if (o.backing) ctx.mask(bx[0] - 2, bx[1] - 2, bx[2] - bx[0] + 4, bx[3] - bx[1] + 6, alpha * Math.max(o.backing, 0.85));
      ctx.text(c.text, c.x + dx, c.y + dy, { ...o, size, alpha });
      placed.push(bx);
      break;
    }
  }
  ctx.cam = cam; ctx.cam3 = cam3;
  return placed.length;
}

// you's lines are composited OVER me's (alpha blending on a 6 px dark knock-out), never MAX-blended: orange and blue
// under MAX make a rose that belongs to love (CLAUDE.md colour semantics). Same options as ctx.line.
export function youLine(ctx, pts, o = {}) {
  const a = o.alpha ?? 1;
  ctx.line(pts, { ...o, color: [0, 0, 0], color2: undefined, width: (o.width ?? 2) + 6, glow: 0, alpha: 0.8 * a, blend: 'alpha' });
  ctx.line(pts, { color: COLOR.you, ...o, blend: 'alpha' });
}
