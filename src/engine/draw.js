// DrawContext — what a shot's draw(ctx, t) receives. Immediate mode: draw calls are recorded as commands and
// flushed in order (consecutive calls of the same kind/blend/camera are batched into one GPU draw). Nothing is
// retained between frames except static resources the shot builds once through ctx.memo().
//
//   ctx.t, ctx.local, ctx.dur, ctx.p, ctx.frame        time (song s), time in shot, shot length, local/dur, film frame
//   ctx.T, ctx.F, ctx.C (colours), ctx.W, ctx.H, ctx.scale
//   ctx.bg(color) ctx.post({...}) ctx.subs(bool) ctx.mask(x, y, w, h) (knock out what is already drawn behind a text box)
//   ctx.camera2D() ctx.camera3D({ fov, position, target, up, near, far }) ctx.project([x,y,z]) -> [x, y, w]
//   ctx.line(pts, o) ctx.segments([[p,q],...], o) ctx.circle(x,y,r,o) ctx.ring(x,y,r,o) ctx.rect(x,y,w,h,o)
//   ctx.text(str, x, y, o) -> { width } ctx.measure(str, o) ctx.text3D(str, [x,y,z], o) ctx.point3D([x,y,z], r, o)
//   ctx.swarm(swarm, o) ctx.three(scene, camera) ctx.memo(key, () => value) ctx.sim(key, spec)
//   swarm o: p stagger drift scatter size sizeVar color color2 colorVar alpha perspective focus aperture fog model time birth
import * as THREE from 'three';
import { parseColor } from './gl/common.js';
import { COLOR } from '../theme.js';
import { simulate } from './sim.js';

const tmpCam = new THREE.PerspectiveCamera();

export class DrawContext {
  constructor(engine) {
    this.engine = engine;
    this.C = COLOR;
    this.W = 1920;
    this.H = 1080;
    this.memos = new Map(); // shot key -> Map
  }

  begin({ key, t, start, end, frame, scale }) {
    this.key = key;
    this.t = t;
    this.local = t - start;
    this.dur = end - start;
    this.p = this.dur > 0 ? Math.min(1, Math.max(0, this.local / this.dur)) : 0;
    this.frame = frame;
    this.scale = scale;
    this.T = this.engine.T;
    this.F = this.engine.F;
    this.cmds = [];
    this.bgColor = [0, 0, 0]; // layers are emissive on black; the background is added as post.lift
    this.postSettings = {};
    this.showSubs = true;
    this.cam = this.engine.cam2D;
    this.cam3 = null;
    this.missingGlyphs = 0;
  }

  // opaque background for this shot (e.g. paper); disables the default emissive lift
  bg(c) { this.bgColor = parseColor(c); this.postSettings.lift = [0, 0, 0]; }
  post(s) { Object.assign(this.postSettings, s); }
  // text sitting on the 3D scene knocks out its box first: lines and particles already drawn behind it are darkened
  // to ~15 % (four nested rects, a 16 px feather), so nothing strikes through a word (CLAUDE.md: a struck-through
  // word reads as a wrong guess). Call it after the 3D content and before the text.
  mask(x, y, w, h, strength = 1) {
    if (w <= 0 || h <= 0 || strength <= 0.01) return;
    for (let k = 0; k < 4; k++) { const g = (3 - k) * 4; this.rect(x - g, y - g, w + 2 * g, h + 2 * g, { fill: [0, 0, 0, 0.38 * strength], radius: 4 + g }); }
  }
  subs(on) { this.showSubs = on; }

  camera2D() { this.cam = this.engine.cam2D; this.cam3 = null; }
  camera3D({ fov = 40, position = [0, 0, 6], target = [0, 0, 0], up = [0, 1, 0], near = 0.05, far = 200 } = {}) {
    tmpCam.fov = fov; tmpCam.aspect = this.W / this.H; tmpCam.near = near; tmpCam.far = far;
    tmpCam.position.set(...position); tmpCam.up.set(...up); tmpCam.lookAt(...target);
    tmpCam.updateMatrixWorld(); tmpCam.updateProjectionMatrix();
    const vp = new THREE.Matrix4().multiplyMatrices(tmpCam.projectionMatrix, tmpCam.matrixWorldInverse);
    this.cam = vp; this.cam3 = vp;
  }
  // world point -> design px (+ clip w for depth sorting / culling)
  project(p) {
    const v = new THREE.Vector4(p[0], p[1], p[2] ?? 0, 1).applyMatrix4(this.cam);
    return [(v.x / v.w * 0.5 + 0.5) * this.W, (0.5 - v.y / v.w * 0.5) * this.H, v.w];
  }

  // text and shapes are always laid out in design space, whatever 3D camera is active
  _cmd(kind, blend, data) { this.cmds.push({ kind, blend, cam: kind === 'text' || kind === 'shapes' ? this.engine.cam2D : this.cam, data }); }

  line(pts, o = {}) {
    if (!pts || pts.length < 2) return;
    this._cmd('lines', o.blend ?? 'max', { pts, o: { ...o, color: parseColor(o.color ?? COLOR.ink), color2: o.color2 ? parseColor(o.color2) : undefined } });
  }
  segments(list, o = {}) { for (const s of list) this.line(s, o); }
  circle(x, y, r, o = {}) { this._shape({ type: 1, x, y, hw: r, hh: r }, o); }
  ellipse(x, y, rx, ry, o = {}) { this._shape({ type: 1, x, y, hw: rx, hh: ry }, o); }
  ring(x, y, r, o = {}) { this._shape({ type: 2, x, y, hw: r, hh: r, inner: o.thickness ? o.thickness / r : 0.1 }, o); }
  rect(x, y, w, h, o = {}) { this._shape({ type: 0, x: x + w / 2, y: y + h / 2, hw: w / 2, hh: h / 2, radius: o.radius ?? 0 }, o); }
  _shape(s, o) {
    const mul = o.alpha ?? 1;
    const fill = o.fill !== undefined ? parseColor(o.fill) : [0, 0, 0, 0];
    const strokeColor = o.stroke !== undefined ? parseColor(o.stroke) : [0, 0, 0, 0];
    fill[3] *= mul;
    strokeColor[3] *= mul;
    this._cmd('shapes', o.blend ?? 'alpha', { ...s, fill, strokeColor, stroke: o.stroke !== undefined ? (o.width ?? 2) : 0, rotation: o.rotation ?? 0, glow: o.glow, glowStrength: o.glowStrength, intensity: o.intensity });
  }

  measure(str, o = {}) { return this.engine.text.layout(String(str), o).width; }
  text(str, x, y, o = {}) {
    str = String(str);
    const L = this.engine.text.layout(str, o);
    this.missingGlyphs += L.missing;
    const opts = { ...o, color: parseColor(o.color ?? COLOR.ink) };
    this._cmd('text', o.blend ?? 'alpha', { str, x, y, o: opts });
    let ox = x;
    if (o.align === 'center') ox -= L.width / 2; else if (o.align === 'right') ox -= L.width;
    return { width: L.width, x: ox };
  }

  // text anchored at a 3D point: projected, size scales with ref / depth, optional fog [near, far]
  text3D(str, p, o = {}) {
    const [x, y, w] = this.project(p);
    if (w <= (o.near ?? 0.2)) return null;
    const k = (o.ref ?? 6) / w;
    let alpha = o.alpha ?? 1;
    if (o.fog) alpha *= 1 - Math.min(1, Math.max(0, (w - o.fog[0]) / (o.fog[1] - o.fog[0])));
    if (alpha <= 0.003) return null;
    // minSize / maxSize (design px) keep perspective from shrinking or blowing up a label
    const size = Math.min(o.maxSize ?? Infinity, Math.max(o.minSize ?? 0, (o.size ?? 24) * k));
    return this.text(str, x, y, { ...o, size, alpha });
  }
  point3D(p, r, o = {}) {
    const [x, y, w] = this.project(p);
    if (w <= (o.near ?? 0.2)) return null;
    const k = (o.ref ?? 6) / w;
    let alpha = o.alpha ?? 1;
    if (o.fog) alpha *= 1 - Math.min(1, Math.max(0, (w - o.fog[0]) / (o.fog[1] - o.fog[0])));
    this.circle(x, y, r * k, { ...o, alpha, glow: o.glow ? o.glow * k : undefined });
    return [x, y, w];
  }

  swarm(sw, o = {}) { this._cmd('swarm', o.blend ?? 'add', { sw, o }); }
  three(scene, camera) { this._cmd('three', 'alpha', { scene, camera }); }

  memo(key, fn) {
    let m = this.memos.get(this.key);
    if (!m) { m = new Map(); this.memos.set(this.key, m); }
    if (!m.has(key)) m.set(key, fn());
    return m.get(key);
  }
  // like memo, but a null/undefined result (e.g. fonts still loading) is not cached and counts as pending
  memoReady(key, fn) {
    let m = this.memos.get(this.key);
    if (!m) { m = new Map(); this.memos.set(this.key, m); }
    if (m.has(key)) return m.get(key);
    const v = fn();
    if (v == null) { this.missingGlyphs++; return null; }
    m.set(key, v);
    return v;
  }
  // deterministic fixed-step simulation from the shot start (see sim.js)
  sim(key, spec) {
    const cache = this.memo(`sim:${key}`, () => ({ checkpoints: new Map() }));
    return simulate(cache, { ...spec, t: spec.t ?? this.local });
  }
}
