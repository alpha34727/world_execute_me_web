// The trapped world of c1.09–12. EXECUTION throws the particles out of me; they keep flying in a box with periodic
// boundaries (a particle leaving one face enters through the opposite one: x ← ((x + L/2) mod L) − L/2), which is
// how simulations fake an infinite world — "trapped in this strange simulation".
// The same frame is then drawn again inside the frame (picture-in-picture: the same t drawn twice, never feedback),
// and recursively (Droste) for SIMULATION. Inner levels are the camera's projection of the same world mapped into
// the screen's rectangle, so every level is exactly the same picture.
import { rand, randn } from '../../lib/hash.js';
import { COLOR } from '../../theme.js';

export const BOX = 6; // edge length, centred at the origin
export const NP = 700;
const wrap = (x) => ((((x + BOX / 2) % BOX) + BOX) % BOX) - BOX / 2;
// particle i: starts in me (at the origin) at t0, constant velocity (hash directions, speeds 1.2–3.6 units/s)
function vel(i) {
  const z = rand(i, 1, 501) * 2 - 1, a = rand(i, 2, 501) * Math.PI * 2, r = Math.sqrt(1 - z * z), s = 1.2 + 2.4 * rand(i, 3, 501);
  return [r * Math.cos(a) * s, z * s, r * Math.sin(a) * s];
}
// each particle carries its wrap events of the last `win` seconds: where it left through one face and where it came
// back through the opposite one, at the same instant (the boundary is periodic)
export function particles(t, t0, { win = 0 } = {}) {
  const dt = Math.max(0, t - t0), out = new Array(NP);
  for (let i = 0; i < NP; i++) {
    const v = vel(i), p0 = [0, 1, 2].map((c) => randn(i, 4 + c, 501) * 0.05);
    const p = [0, 1, 2].map((c) => wrap(p0[c] + v[c] * dt));
    const wraps = [];
    if (win > 0) for (let c = 0; c < 3; c++) {
      const cell = (x) => Math.floor((x + BOX / 2) / BOX);
      const n1 = cell(p0[c] + v[c] * dt), n0 = cell(p0[c] + v[c] * Math.max(0, dt - win));
      if (n1 === n0) continue;
      const B = v[c] > 0 ? n1 * BOX - BOX / 2 : (n1 + 1) * BOX - BOX / 2; // the boundary crossed most recently
      const tc = (B - p0[c]) / v[c];
      const at = [0, 1, 2].map((d) => wrap(p0[d] + v[d] * tc));
      const exit = at.slice(), entry = at.slice();
      exit[c] = Math.sign(v[c]) * BOX / 2; entry[c] = -Math.sign(v[c]) * BOX / 2;
      wraps.push({ axis: c, exit, entry, age: dt - tc });
    }
    // the short trail behind it, unless it wrapped within the trail
    const q = [0, 1, 2].map((c) => p[c] - v[c] * 0.05);
    const wrapped = q.some((x) => Math.abs(x) > BOX / 2);
    out[i] = { p, q: wrapped ? null : q, hot: i % 12 === 0, wraps };
  }
  return out;
}
export const boxEdges = () => {
  const h = BOX / 2, V = [];
  for (let i = 0; i < 8; i++) V.push([i & 1 ? h : -h, i & 2 ? h : -h, i & 4 ? h : -h]);
  const E = [];
  for (let i = 0; i < 8; i++) for (let b = 0; b < 3; b++) { const j = i ^ (1 << b); if (j > i) E.push([V[i], V[j]]); }
  return E;
};

// the screen that shows the frame: a 16:9 quad in the world, beside the box, facing +z
export const SCREEN = { c: [5.6, -0.6, 0.4], w: 3.2, h: 1.8 };
export const screenCorners = () => { const { c, w, h } = SCREEN; return [[c[0] - w / 2, c[1] + h / 2, c[2]], [c[0] + w / 2, c[1] + h / 2, c[2]], [c[0] + w / 2, c[1] - h / 2, c[2]], [c[0] - w / 2, c[1] - h / 2, c[2]]]; };

// the world drawn flat into `rect` ([x, y, w, h] design px) for camera `cam` — call with the 3D camera active
// (projection), it draws in 2D. depth > 0 draws the screen inside, recursively. Returns the screen's rect.
// level: 0 = the outermost picture (its me is drawn by the caller as the real spark), > 0 = a picture inside it
export function world2D(ctx, cam, rect, ps, { depth = 0, frame, alpha = 1, minW = 10, level = 0 } = {}) {
  const depthOf = level;
  const [rx, ry, rw, rh] = rect;
  const M = ([x, y]) => [rx + (x / 1920) * rw, ry + (y / 1080) * rh];
  const k = rw / 1920;
  // project everything first (3D camera), then draw in 2D
  const P = (p) => { const s = ctx.project(p); return s[2] > 0.2 ? M(s) : null; };
  const edges = boxEdges().map(([a, b]) => [P(a), P(b)]);
  const pts = ps.map((o) => ({ p: P(o.p), q: o.q ? P(o.q) : null, hot: o.hot }));
  const sc = screenCorners().map(P);
  const me = P([0, 0, 0]);
  const cam3 = ctx.cam3, cam2 = ctx.cam;
  ctx.camera2D();
  ctx.rect(rx, ry, rw, rh, { fill: [0, 0, 0, 1], alpha }); // pure black: the background is added back in post (lift)
  for (const [a, b] of edges) if (a && b) ctx.line([a, b], { color: COLOR.dim, width: Math.max(1, 1.6 * k), alpha });
  for (const o of pts) {
    if (!o.p) continue;
    if (o.q) ctx.line([o.q, o.p], { color: o.hot ? COLOR.ink : COLOR.me, width: Math.max(0.8, 2 * k), alpha: alpha * 0.8 });
    ctx.circle(o.p[0], o.p[1], Math.max(0.6, (o.hot ? 2.6 : 1.8) * k), { fill: o.hot ? COLOR.ink : COLOR.me, glow: 4 * k, alpha });
  }
  if (me && depthOf > 0) { ctx.circle(me[0], me[1], Math.max(1, 6 * k), { fill: COLOR.ink, glow: 10 * k, alpha }); ctx.circle(me[0], me[1], Math.max(1.5, 14 * k), { fill: COLOR.me, alpha: alpha * 0.35 }); }
  // the frame counter, as the HUD shows it: the same frame at every level
  const inside = rx >= -1 && ry >= -1 && rx + rw <= 1921 && ry + rh <= 1081; // a counter cut by the frame edge would read as an error
  if (rw > 160 && inside) ctx.text(`f ${frame}`, rx + rw - 12 * k - 4, ry + 26 * k + 8, { font: 'mono', size: Math.max(9, 16 * k), align: 'right', color: COLOR.dim, alpha });
  ctx.rect(rx, ry, rw, rh, { stroke: COLOR.faint, width: Math.max(1, 1.4 * k), alpha });
  // the screen inside: its bounding rect, and the same picture again
  let inner = null;
  if (sc.every(Boolean)) {
    // the screen shows the frame at the frame's own 16:9, centred on the quad's projection
    const xs = sc.map((p) => p[0]), ys = sc.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs), cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    inner = [cx - w / 2, cy - (w * 9) / 32, w, (w * 9) / 16];
    ctx.rect(inner[0] - 3 * k, inner[1] - 3 * k, inner[2] + 6 * k, inner[3] + 6 * k, { stroke: COLOR.ink2, width: Math.max(1, 2 * k), radius: 3 * k, alpha });
  }
  ctx.cam = cam2; ctx.cam3 = cam3;
  if (inner && depth > 0 && inner[2] > minW) world2D(ctx, cam, inner, ps, { depth: depth - 1, frame, alpha, minW, level: level + 1 });
  return { inner, me };
}
