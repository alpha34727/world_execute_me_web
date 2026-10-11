// SDF text: lazily-built glyph atlas (canvas 2D raster of the OFL fonts → EDT) + instanced glyph quads.
// Glyphs whose font slice is not loaded yet are never cached; the engine reports them as pending so the
// frame can be re-rendered once fonts arrive (render mode awaits this, so no fallback glyph is ever captured).
import * as THREE from 'three';
import { InstanceBuffer, rawMaterial, materialSet } from './common.js';
import { coverageToSdf } from './sdf.js';
import { FONT } from '../../theme.js';

const ATLAS = 4096;

export class FontAtlas {
  constructor() {
    this.data = new Uint8Array(ATLAS * ATLAS);
    this.texture = new THREE.DataTexture(this.data, ATLAS, ATLAS, THREE.RedFormat, THREE.UnsignedByteType);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
    this.glyphs = new Map(); // `${fontKey}\u0000${ch}` -> glyph
    this.metrics = new Map();
    this.shelfX = 0; this.shelfY = 0; this.shelfH = 0;
    this.dirty = false;
    this.pending = new Set();
    this.canvas = document.createElement('canvas'); // a document canvas resolves @font-face fonts reliably
    this.canvas.width = 256; this.canvas.height = 256;
    this.c2d = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  fontSpec(key) {
    const f = FONT[key];
    if (!f) throw new Error(`unknown font "${key}"`);
    return f;
  }
  cssFont(f, px) { return `${f.weight} ${px}px "${f.family}"`; }

  metricsOf(key) {
    if (this.metrics.has(key)) return this.metrics.get(key);
    const f = this.fontSpec(key);
    const c = this.c2d;
    c.font = this.cssFont(f, f.base);
    const m = c.measureText('H');
    const mg = c.measureText('Hgjpqy');
    const r = { base: f.base, cap: m.actualBoundingBoxAscent, ascent: mg.fontBoundingBoxAscent ?? f.base * 0.9, descent: mg.fontBoundingBoxDescent ?? f.base * 0.25, spread: f.base / 8 };
    if (document.fonts.check(this.cssFont(f, f.base), 'H')) this.metrics.set(key, r);
    return r;
  }

  ready(key, ch) {
    const f = this.fontSpec(key);
    const css = this.cssFont(f, f.base);
    if (document.fonts.check(css, ch) && this.verified(key, f, css)) return true;
    const p = document.fonts.load(css, ch).then(() => this.pending.delete(p));
    this.pending.add(p);
    return false;
  }

  // guard against canvas rasterising with a fallback face: monospace faces must have equal advances
  verified(key, f, css) {
    if (this.okFonts?.has(key)) return true;
    this.okFonts ??= new Set();
    const c = this.c2d;
    c.font = css;
    if (/Mono/.test(f.family) && Math.abs(c.measureText('i').width - c.measureText('M').width) > 0.01) return false;
    this.okFonts.add(key);
    return true;
  }

  glyph(key, ch) {
    const id = `${key}\u0000${ch}`;
    const hit = this.glyphs.get(id);
    if (hit) return hit;
    if (!this.ready(key, ch)) return null;
    const f = this.fontSpec(key);
    const spread = f.base / 8;
    const pad = Math.ceil(spread) + 2;
    const c = this.c2d;
    c.font = this.cssFont(f, f.base);
    const m = c.measureText(ch);
    const adv = m.width;
    const left = Math.ceil(m.actualBoundingBoxLeft), right = Math.ceil(m.actualBoundingBoxRight);
    const asc = Math.ceil(m.actualBoundingBoxAscent), desc = Math.ceil(m.actualBoundingBoxDescent);
    const gw = left + right, gh = asc + desc;
    let g;
    if (gw <= 0 || gh <= 0 || /\s/.test(ch)) {
      g = { adv, empty: true };
    } else {
      const w = gw + 2 * pad, h = gh + 2 * pad;
      if (this.canvas.width < w || this.canvas.height < h) {
        this.canvas.width = Math.max(this.canvas.width, w); this.canvas.height = Math.max(this.canvas.height, h);
      }
      c.font = this.cssFont(f, f.base);
      c.clearRect(0, 0, w, h);
      c.fillStyle = '#fff';
      c.textBaseline = 'alphabetic';
      c.fillText(ch, pad + left, pad + asc);
      const img = c.getImageData(0, 0, w, h).data;
      const alpha = new Uint8ClampedArray(w * h);
      for (let i = 0; i < w * h; i++) alpha[i] = img[i * 4 + 3];
      const sdf = coverageToSdf(alpha, w, h, spread);
      if (this.shelfX + w > ATLAS) { this.shelfX = 0; this.shelfY += this.shelfH + 1; this.shelfH = 0; }
      if (this.shelfY + h > ATLAS) throw new Error('glyph atlas full');
      const x0 = this.shelfX, y0 = this.shelfY;
      for (let y = 0; y < h; y++) this.data.set(sdf.subarray(y * w, (y + 1) * w), (y0 + y) * ATLAS + x0);
      this.shelfX += w + 1; this.shelfH = Math.max(this.shelfH, h);
      this.dirty = true;
      g = {
        adv, w, h, ox: -(pad + left), oy: -(pad + asc), // quad top-left relative to pen/baseline, base px
        u0: x0 / ATLAS, v0: y0 / ATLAS, u1: (x0 + w) / ATLAS, v1: (y0 + h) / ATLAS, x0, y0, spread,
      };
    }
    this.glyphs.set(id, g);
    return g;
  }

  flush() {
    if (this.dirty) { this.texture.needsUpdate = true; this.dirty = false; }
  }

  // signed distance (base px, + inside) of a glyph cell at local base-px coords; for particle sampling
  sampleSdf(g, lx, ly) {
    const x = Math.floor(lx), y = Math.floor(ly);
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) return -g.spread;
    return (this.data[(g.y0 + y) * ATLAS + g.x0 + x] / 255 - 0.5) * 2 * g.spread;
  }
}

const VERT = /* glsl */ `
in vec2 position;
in vec4 aRect;   // x, y (top-left), w, h — design px
in vec4 aUV;
in vec4 aColor;
in vec4 aP;      // spread (design px at this size), weight offset, glow radius, glow strength
in vec4 aQ;      // intensity, -, -, -
uniform mat4 uViewProj;
uniform float uScale;
out vec2 vUv; out vec4 vColor; out vec4 vP; out vec4 vQ;
void main() {
  vec2 c = vec2(position.x, position.y * 0.5 + 0.5);
  vUv = mix(aUV.xy, aUV.zw, c);
  vColor = aColor; vP = vec4(aP.x * uScale, aP.y, aP.z * uScale, aP.w); vQ = aQ;
  gl_Position = uViewProj * vec4(aRect.xy + c * aRect.zw, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D uAtlas;
in vec2 vUv; in vec4 vColor; in vec4 vP; in vec4 vQ;
out vec4 outColor;
void main() {
  float v = texture(uAtlas, vUv).r;
  float dist = (v - 0.5) * 2.0 * vP.x + vP.y * vP.x; // output px, + inside
  float a = clamp(dist + 0.5, 0.0, 1.0);
  float g = 0.0;
  // glow must reach 0 before the SDF's encoded range ends (|dist| = spread), or the quad edge shows
  if (vP.w > 0.0) g = vP.w * exp(-pow(max(-dist, 0.0) / max(vP.z, 1e-3), 2.0)) * (1.0 - a) * smoothstep(-vP.x, -0.45 * vP.x, dist);
  float alpha = vColor.a * clamp(a + g, 0.0, 1.0);
  if (alpha <= 0.002) discard;
  outColor = vec4(vColor.rgb * vQ.x * alpha, alpha);
}`;

export class TextBatch {
  constructor(atlas) {
    this.atlas = atlas;
    this.buf = new InstanceBuffer({ aRect: 4, aUV: 4, aColor: 4, aP: 4, aQ: 4 }, 2048);
    this.uniforms = {
      uViewProj: { value: new THREE.Matrix4() },
      uScale: { value: 1 },
      uAtlas: { value: atlas.texture },
    };
    this.material = materialSet((blend) => rawMaterial({ vertex: VERT, fragment: FRAG, uniforms: this.uniforms, blend }));
    this.mesh = new THREE.Mesh(this.buf.geometry, this.material('alpha'));
    this.mesh.frustumCulled = false;
  }

  // layout without drawing: { width, glyphs: [{g, x}], k, m }
  layout(str, o) {
    const key = o.font ?? 'mono';
    const m = this.atlas.metricsOf(key);
    const k = (o.size ?? 32) / m.base;
    const track = (o.tracking ?? 0) * (o.size ?? 32);
    const out = [];
    let x = 0, missing = 0;
    for (const ch of str) {
      const g = this.atlas.glyph(key, ch);
      if (!g) { missing++; x += (o.size ?? 32) * 0.6 + track; out.push(null); continue; }
      out.push({ g, x, ch });
      x += g.adv * k + track;
    }
    if (out.length) x -= track;
    return { width: x, glyphs: out, k, m, missing };
  }

  // o: { font, size, color [r,g,b,a], align 'left'|'center'|'right', baseline 'alphabetic'|'middle'|'top'|'bottom',
  //      tracking (em), reveal (chars, may be fractional), weight (-0.3..0.3), glow, glowStrength, intensity, alpha }
  push(str, x, y, o) {
    const L = this.layout(str, o);
    const { k, m } = L;
    let ox = x;
    if (o.align === 'center') ox -= L.width / 2;
    else if (o.align === 'right') ox -= L.width;
    let by = y;
    const bl = o.baseline ?? 'alphabetic';
    if (bl === 'middle') by += (m.cap * k) / 2;
    else if (bl === 'top') by += m.cap * k;
    else if (bl === 'bottom') by -= m.descent * k;
    const col = o.color;
    const reveal = o.reveal ?? Infinity;
    let n = 0;
    for (let i = 0; i < L.glyphs.length; i++) {
      const e = L.glyphs[i];
      if (i >= reveal) break;
      if (!e || e.g.empty) continue;
      const frac = Math.min(1, reveal - i);
      const g = e.g;
      const j = this.buf.reserve(1);
      const A = this.buf.arrays;
      A.aRect.set([ox + e.x + g.ox * k, by + g.oy * k, g.w * k, g.h * k], j * 4);
      A.aUV.set([g.u0, g.v0, g.u1, g.v1], j * 4);
      A.aColor.set([col[0], col[1], col[2], (col[3] ?? 1) * (o.alpha ?? 1) * frac], j * 4);
      A.aP.set([g.spread * k, o.weight ?? 0, o.glow ?? 0, o.glow ? (o.glowStrength ?? 0.5) : 0], j * 4);
      A.aQ.set([o.intensity ?? 1, 0, 0, 0], j * 4);
      n++;
    }
    return { width: L.width, x: ox, y: by, missing: L.missing, count: n };
  }
}
