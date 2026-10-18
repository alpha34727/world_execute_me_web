// Engine: renders film frame f as a pure function of t = f/60 - PREROLL.
//   t < 0          photosensitivity warning card
//   otherwise      timeline.at(t) -> shot A (+ shot B during a transition) -> compositor -> post (+ subtitle overlay)
import * as THREE from 'three';
import { FPS, PREROLL, DESIGN } from '../sections.js';
import { designViewProj, rawMaterial, fullscreenMesh, FULLSCREEN_VERT } from './gl/common.js';
import { LineBatch } from './gl/lines.js';
import { ShapeBatch } from './gl/shapes.js';
import { FontAtlas, TextBatch } from './gl/text.js';
import { swarmMaterial } from './gl/swarm.js';
import { Compositor } from './gl/composite.js';
import { Post, POST_DEFAULTS } from './gl/post.js';
import { DrawContext } from './draw.js';
import { drawWarning } from '../lib/warning.js';
import { drawSubtitles } from '../lib/console.js';
import { aiHud } from '../lib/hud.js';

export class Engine {
  constructor({ canvas, T, F, timeline, zh = null }) {
    this.T = T;
    this.F = F;
    this.timeline = timeline;
    this.zh = zh;
    this.showZh = true;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); // unused by raw shaders, required by three
    this.cam2D = designViewProj(DESIGN.W, DESIGN.H);
    this.lines = new LineBatch();
    this.shapes = new ShapeBatch();
    this.atlas = new FontAtlas();
    this.text = new TextBatch(this.atlas);
    this.compositor = new Compositor();
    this.post = new Post();
    this.ctx = new DrawContext(this);
    this.scratch = new THREE.Scene();
    this.width = 0;
    this.height = 0;
    this.lastInfo = null;
  }

  setSize(w, h) {
    if (w === this.width && h === this.height) return;
    this.width = w; this.height = h;
    this.scale = w / DESIGN.W;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h, false);
    const mk = (opts) => new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, ...opts });
    for (const k of ['rtA', 'rtB', 'rtScene', 'rtOverlay', 'rtFinal']) this[k]?.dispose();
    for (const s of this.replays?.values() ?? []) s.rt.dispose();
    this.replays?.clear();
    this.rtA = mk({ type: THREE.HalfFloatType, samples: 4 });
    this.rtB = mk({ type: THREE.HalfFloatType, samples: 4 });
    this.rtScene = mk({ type: THREE.HalfFloatType });
    this.rtOverlay = mk({ type: THREE.HalfFloatType });
    this.rtFinal = mk({ type: THREE.UnsignedByteType });
    this.post.setSize(w, h);
    this.pixels = new Uint8Array(w * h * 4);
  }

  // Draw one layer: run fn(ctx) then flush its commands into rt.
  drawLayer(rt, meta, fn, clearAlpha = 1) {
    const ctx = this.ctx;
    ctx.begin({ ...meta, scale: this.scale });
    fn(ctx);
    this.flush(ctx, rt, clearAlpha);
    return ctx;
  }

  flush(ctx, rt, clearAlpha, res = [this.width, this.height], scale = this.scale) {
    const r = this.renderer;
    r.setRenderTarget(rt);
    r.setClearColor(new THREE.Color(ctx.bgColor[0], ctx.bgColor[1], ctx.bgColor[2]), clearAlpha);
    r.clear(true, false, false);
    const cmds = ctx.cmds;
    this.atlas.flush();
    let i = 0;
    while (i < cmds.length) {
      const c0 = cmds[i];
      let j = i + 1;
      if (c0.kind === 'lines' || c0.kind === 'shapes' || c0.kind === 'text') {
        while (j < cmds.length && cmds[j].kind === c0.kind && cmds[j].blend === c0.blend && cmds[j].cam === c0.cam) j++;
      }
      const run = cmds.slice(i, j);
      if (c0.kind === 'lines') this.drawBatch(this.lines, run, (b, c) => b.push(c.data.pts, c.data.o), c0, res, scale);
      else if (c0.kind === 'shapes') this.drawBatch(this.shapes, run, (b, c) => b.push(c.data), c0, res, scale);
      else if (c0.kind === 'text') {
        this.drawBatch(this.text, run, (b, c) => b.push(c.data.str, c.data.x, c.data.y, c.data.o), c0, res, scale);
      } else if (c0.kind === 'swarm') {
        const { sw, o } = c0.data;
        const m = swarmMaterial(c0.blend);
        const u = m.uniforms;
        u.uViewProj.value.copy(c0.cam); if (o.model) u.uViewProj.value.multiply(o.model);
        u.uRes.value.set(res[0], res[1]); u.uScale.value = scale;
        u.uP.value = o.p ?? 0; u.uStagger.value = o.stagger ?? 0.3; u.uTime.value = o.time ?? ctx.t;
        u.uDrift.value = o.drift ?? 0; u.uScatter.value = o.scatter ?? 0; u.uSize.value = o.size ?? 3;
        u.uSizeVar.value = o.sizeVar ?? 0.4; u.uPersp.value = o.perspective === true ? 6 : (o.perspective || 0); u.uColorVar.value = o.colorVar ?? 0;
        u.uFocus.value = o.focus ?? 0; u.uAperture.value = o.aperture ?? 0; u.uFog.value.set(o.fog?.[0] ?? 0, o.fog?.[1] ?? 0); u.uBirth.value = o.birth ? 1 : 0;
        const ca = o.color ?? [1, 1, 1], cb = o.color2 ?? ca, al = o.alpha ?? 1;
        u.uColA.value.set(ca[0], ca[1], ca[2], (ca[3] ?? 1) * al); u.uColB.value.set(cb[0], cb[1], cb[2], (cb[3] ?? 1) * al);
        sw.mesh.material = m;
        this.scratch.add(sw.mesh);
        r.render(this.scratch, this.camera);
        this.scratch.remove(sw.mesh);
      } else if (c0.kind === 'three') {
        r.render(c0.data.scene, c0.data.camera ?? this.camera);
      }
      i = j;
    }
  }

  drawBatch(batch, run, push, c0, res, scale) {
    batch.buf.reset();
    for (const c of run) push(batch, c);
    const n = batch.buf.count;
    if (!n) return;
    batch.buf.upload();
    batch.buf.geometry.instanceCount = n;
    const u = batch.uniforms;
    u.uViewProj.value.copy(c0.cam);
    if (u.uRes) u.uRes.value.set(res[0], res[1]);
    u.uScale.value = scale;
    batch.mesh.material = batch.material(c0.blend);
    this.scratch.add(batch.mesh);
    this.renderer.render(this.scratch, this.camera);
    this.scratch.remove(batch.mesh);
  }

  // Replay (outro): the film's own frame at song time t2 — its shot layer(s) and transition, without HUD, subtitles,
  // chapter overlay or post — rendered into a w×h texture owned by `id`. A pure function of (t2, w, h), so a slot
  // that already holds exactly that frame is reused (unless glyphs were still loading). -> { texture, missing }
  // overlay: also draw the chapter's overlay (its panels and readouts) on top of the shot
  replay(id, t2, w, h, frame, { overlay = false } = {}) {
    if (this.replaying) throw new Error('replay inside a replay');
    w = Math.max(4, Math.round(w)); h = Math.max(4, Math.round(h));
    this.replays ??= new Map();
    const tmp = (opts) => new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: THREE.HalfFloatType, ...opts });
    let slot = this.replays.get(id);
    if (!slot || slot.w !== w || slot.h !== h) { slot?.rt.dispose(); slot = { rt: tmp(), w, h, key: null }; this.replays.set(id, slot); }
    const key = `${t2}|${overlay}`;
    if (slot.key === key) return { texture: slot.rt.texture, missing: 0 };
    const sk = `${w}x${h}`;
    if (this.replayMS?.key !== sk) { for (const k of ['a', 'b', 'c']) this.replayMS?.[k].dispose(); this.replayMS = { key: sk, a: tmp({ samples: 4 }), b: tmp({ samples: 4 }), c: tmp() }; }
    this.replayCtx ??= new DrawContext(this);
    const ctx = this.replayCtx;
    ctx.memos = this.ctx.memos; // the shots' static resources are shared with the film
    const scale = w / DESIGN.W, res = [w, h];
    const ch = overlay ? this.timeline.chapters.find((x) => t2 >= x.from && t2 < x.to) : null;
    let lift = null;
    const layer = (entry, rt, p) => {
      ctx.begin({ key: entry.key, t: t2, start: entry.start, end: entry.end, frame, scale });
      entry.shot.draw(ctx, t2);
      this.flush(ctx, rt, 1, res, scale);
      const l = ctx.postSettings.lift ?? POST_DEFAULTS.lift;
      lift = lift ? lift.map((x, i) => x + (l[i] - x) * p) : l;
      return ctx.missingGlyphs;
    };
    this.replaying = true;
    let missing = 0;
    try {
      const st = this.timeline.at(t2);
      missing += layer(st.a, this.replayMS.a, 0);
      if (st.b) missing += layer(st.b, this.replayMS.b, st.p);
      const out = ch?.overlay ? this.replayMS.c : slot.rt;
      this.compositor.render(this.renderer, this.camera, out, this.replayMS.a.texture, st.b ? this.replayMS.b.texture : null, st.transition, st.p, res, scale);
      if (ch?.overlay) {
        // the chapter overlay sits on top of the lifted, tonemapped film (a panel's dark backing is darker than the
        // background); the replay has no lift, so the overlay goes over the scene minus the lift it covers, and the
        // replaying shot's post adds the lift back (it lets the scene go down to -lift)
        ctx.begin({ key: '__overlay', t: t2, start: 0, end: this.T.songEnd, frame, scale });
        ctx.bg([0, 0, 0]);
        ch.overlay(ctx, t2);
        this.flush(ctx, this.replayMS.b, 0, res, scale);
        missing += ctx.missingGlyphs;
        this.replayOver ??= this.makeReplayOver();
        const u = this.replayOver.material.uniforms;
        u.uScene.value = this.replayMS.c.texture; u.uOverlay.value = this.replayMS.b.texture; u.uLift.value.set(lift[0], lift[1], lift[2]);
        this.renderer.setRenderTarget(slot.rt);
        this.renderer.render(this.replayOver.scene, this.camera);
      }
    } finally { this.replaying = false; }
    slot.key = missing ? null : key;
    return { texture: slot.rt.texture, missing };
  }

  makeReplayOver() {
    const material = rawMaterial({
      vertex: FULLSCREEN_VERT, blend: 'none',
      fragment: /* glsl */ `uniform sampler2D uScene; uniform sampler2D uOverlay; uniform vec3 uLift; in vec2 vUv; out vec4 outColor;
void main() { vec4 ov = texture(uOverlay, vUv); outColor = vec4(texture(uScene, vUv).rgb * (1.0 - ov.a) + ov.rgb - uLift * ov.a, 1.0); }`,
      uniforms: { uScene: { value: null }, uOverlay: { value: null }, uLift: { value: new THREE.Vector3() } },
    });
    const scene = new THREE.Scene();
    scene.add(fullscreenMesh(material));
    return { scene, material };
  }

  renderShot(entry, t, frame, rt) {
    const s = entry.shot;
    return this.drawLayer(rt, { key: entry.key, t, start: entry.start, end: entry.end, frame }, (ctx) => s.draw(ctx, t));
  }

  // film frame -> final image in rtFinal (and on the canvas). Returns info for tools.
  renderFrame(frame, { toScreen = true } = {}) {
    const t = frame / FPS - PREROLL;
    let post = { ...POST_DEFAULTS };
    let subs = true;
    let hud = null; // { title, alpha } — shots declare `hud: 'title'` (or (T, t) => 'title'); drawn once on the overlay, titles cross-dissolve
    let info;
    let missing = 0;
    if (t < 0) {
      const ctx = this.drawLayer(this.rtA, { key: '__warning', t, start: -PREROLL, end: 0, frame }, (c) => drawWarning(c, t + PREROLL));
      Object.assign(post, ctx.postSettings);
      missing += ctx.missingGlyphs;
      subs = false;
      this.compositor.render(this.renderer, this.camera, this.rtScene, this.rtA.texture, null, null, 0, [this.width, this.height], this.scale);
      info = { t, frame, shot: '__warning', section: null };
    } else {
      const st = this.timeline.at(t);
      const ca = this.renderShot(st.a, t, frame, this.rtA);
      const pa = { ...ca.postSettings };
      subs = ca.showSubs && st.a.shot.subs !== false;
      const ha = st.a.shot.hud, hb = st.b?.shot.hud;
      if (!st.b) hud = ha != null ? { title: ha, alpha: 1, titleAlpha: 1 } : null;
      else if (ha != null || hb != null) {
        const pick = st.p < 0.5 ? ha : hb;
        hud = { title: pick ?? null, alpha: ha != null && hb != null ? 1 : ha != null ? 1 - st.p : st.p, titleAlpha: Math.abs(1 - 2 * st.p) };
      }
      missing += ca.missingGlyphs;
      let texB = null;
      if (st.b) {
        const cb = this.renderShot(st.b, t, frame, this.rtB);
        missing += cb.missingGlyphs;
        texB = this.rtB.texture;
        const pb = cb.postSettings;
        for (const k of Object.keys(POST_DEFAULTS)) {
          const a = pa[k] ?? POST_DEFAULTS[k], b = pb[k] ?? POST_DEFAULTS[k];
          post[k] = Array.isArray(a) ? a.map((x, i) => x + (b[i] - x) * st.p) : a + (b - a) * st.p;
        }
        if (st.p > 0.5) subs = cb.showSubs && st.b.shot.subs !== false;
      } else Object.assign(post, pa);
      if (hud) post.hudGuard = hud.alpha;
      this.compositor.render(this.renderer, this.camera, this.rtScene, this.rtA.texture, texB, st.transition, st.p, [this.width, this.height], this.scale);
      info = { t, frame, shot: st.b && st.p > 0.5 ? st.b.key : st.a.key, a: st.a.key, b: st.b?.key ?? null, p: st.p, transition: st.transition?.type ?? null, section: this.T.sectionAt(t)?.id ?? null };
    }
    const ov = this.drawLayer(this.rtOverlay, { key: '__overlay', t, start: 0, end: this.T.songEnd, frame }, (c) => {
      c.bg([0, 0, 0]);
      if (hud && t >= 0) {
        const title = typeof hud.title === 'function' ? hud.title(this.T, t, this.F) : hud.title;
        aiHud(c, { ...hud, title });
        post.hudTitle = title ? c.measure(title, { font: 'mono', size: 14 }) : 0; // the guard fits the title
      }
      if (subs && t >= 0) drawSubtitles(c, t, this.T, this.showZh ? this.zh : null);
      const ch = t >= 0 ? this.timeline.chapters.find((x) => t >= x.from && t < x.to) : null;
      if (ch?.overlay) ch.overlay(c, t);
    }, 0);
    missing += ov.missingGlyphs;
    this.post.render(this.renderer, this.camera, this.rtScene.texture, this.rtOverlay.texture, this.rtFinal, post, frame, this.scale);
    if (toScreen) this.post.toScreen(this.renderer, this.camera, this.rtFinal.texture);
    info.pendingFonts = this.atlas.pending.size + missing;
    this.lastInfo = info;
    return info;
  }

  // Render until every glyph used by the frame is available (fonts load lazily by unicode range).
  async renderFrameComplete(frame, opts) {
    for (let i = 0; i < 20; i++) {
      const info = this.renderFrame(frame, opts);
      if (!info.pendingFonts) return info;
      await Promise.all([...this.atlas.pending]);
      await document.fonts.ready;
    }
    throw new Error(`frame ${frame}: fonts never became ready`);
  }

  // final frame as a yuv420p byte stream (W*H*3/2 bytes, top-down) for ffmpeg; W must be divisible by 4, H by 2
  readYuv() {
    const w = this.width, h = this.height;
    if (w % 4 || h % 2) throw new Error(`yuv readback needs W%4==0 and H%2==0 (got ${w}x${h})`);
    if (!this.rtYuv || this.rtYuv.width !== w / 4) {
      this.rtYuv?.dispose();
      this.rtYuv = new THREE.WebGLRenderTarget(w / 4, (h * 3) / 2, { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
      this.yuvBytes = new Uint8Array(w * h * 1.5);
    }
    this.post.toYuv(this.renderer, this.camera, this.rtFinal.texture, this.rtYuv, w, h);
    this.renderer.readRenderTargetPixels(this.rtYuv, 0, 0, w / 4, (h * 3) / 2, this.yuvBytes);
    return this.yuvBytes;
  }

  readPixels() {
    this.renderer.readRenderTargetPixels(this.rtFinal, 0, 0, this.width, this.height, this.pixels);
    return this.pixels;
  }
}
