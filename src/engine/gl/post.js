// Post: bloom (soft-threshold prefilter + 6-level mip chain, tent upsample), then the final pass:
// chromatic aberration, bloom add, exposure, soft-shoulder tonemap, overlay (subtitles), vignette,
// film grain (hash of pixel cell + frame → deterministic), 1/255 dither. Output RGBA8, display-referred.
import * as THREE from 'three';
import { rawMaterial, fullscreenMesh, FULLSCREEN_VERT } from './common.js';
import { HASH_GLSL } from '../../lib/hash.js';

import { COLOR } from '../../theme.js';

export const POST_DEFAULTS = {
  lift: COLOR.bg,      // background added under the emissive scene (Claude dark); [0,0,0] for opaque shots
  rays: [0.5, 0.5, 0], // light shafts: [x, y (design px, y down) of the source, strength]; 0 = off
  hudGuard: 0,         // 0..1: darken the scene behind the HUD text blocks (set by the renderer when a HUD is shown)
  hudTitle: 0,         // width (design px) of the HUD title at x = 460: its guard fits the text, not a fixed box
  bloom: 0.55,        // strength
  threshold: 0.62,    // soft threshold on max channel
  knee: 0.35,
  exposure: 1.0,
  vignette: 0.35,
  grain: 0.045,
  ca: 0.0009,         // chromatic aberration strength (≈ 3 px at 4K corners)
};

const DOWN = /* glsl */ `
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uPrefilter; uniform float uThreshold; uniform float uKnee;
in vec2 vUv; out vec4 outColor;
vec3 pre(vec3 c) {
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-5);
  float w = max(soft, br - uThreshold) / max(br, 1e-5);
  return c * w;
}
void main() {
  // 13-tap downsample (Jimenez 2014)
  vec2 t = uTexel;
  vec3 a = texture(uSrc, vUv + t * vec2(-2, 2)).rgb, b = texture(uSrc, vUv + t * vec2(0, 2)).rgb, c = texture(uSrc, vUv + t * vec2(2, 2)).rgb;
  vec3 d = texture(uSrc, vUv + t * vec2(-2, 0)).rgb, e = texture(uSrc, vUv).rgb, f = texture(uSrc, vUv + t * vec2(2, 0)).rgb;
  vec3 g = texture(uSrc, vUv + t * vec2(-2, -2)).rgb, h = texture(uSrc, vUv + t * vec2(0, -2)).rgb, i = texture(uSrc, vUv + t * vec2(2, -2)).rgb;
  vec3 j = texture(uSrc, vUv + t * vec2(-1, 1)).rgb, k = texture(uSrc, vUv + t * vec2(1, 1)).rgb;
  vec3 l = texture(uSrc, vUv + t * vec2(-1, -1)).rgb, m = texture(uSrc, vUv + t * vec2(1, -1)).rgb;
  vec3 col = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  if (uPrefilter > 0.5) col = pre(col);
  outColor = vec4(col, 1.0);
}`;

const UP = /* glsl */ `
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uRadius;
in vec2 vUv; out vec4 outColor;
void main() {
  vec2 t = uTexel * uRadius;
  vec3 s = texture(uSrc, vUv).rgb * 4.0;
  s += (texture(uSrc, vUv + vec2(-t.x, 0)).rgb + texture(uSrc, vUv + vec2(t.x, 0)).rgb + texture(uSrc, vUv + vec2(0, -t.y)).rgb + texture(uSrc, vUv + vec2(0, t.y)).rgb) * 2.0;
  s += texture(uSrc, vUv + vec2(-t.x, -t.y)).rgb + texture(uSrc, vUv + vec2(t.x, -t.y)).rgb + texture(uSrc, vUv + vec2(-t.x, t.y)).rgb + texture(uSrc, vUv + vec2(t.x, t.y)).rgb;
  outColor = vec4(s / 16.0, 1.0);
}`;

const FINAL = /* glsl */ `
${HASH_GLSL}
uniform sampler2D uScene; uniform sampler2D uBloom; uniform sampler2D uOverlay;
uniform float uBloomStrength; uniform float uExposure; uniform float uVignette; uniform float uGrain; uniform float uCA;
uniform float uFrame; uniform float uScale; uniform vec3 uLift; uniform vec3 uRays; uniform float uHudGuard; uniform float uHudTitle;
in vec2 vUv; out vec4 outColor;
// soft mask of a design-space rect (centre c, half size h), feathered over f px
float softRect(vec2 p, vec2 c, vec2 h, float f) { return 1.0 - smoothstep(0.0, f, length(max(abs(p - c) - h, 0.0))); }
vec3 shoulder(vec3 c) {
  const float s = 0.82;
  vec3 over = max(c - s, 0.0);
  return min(c, vec3(s)) + (1.0 - s) * (1.0 - exp(-over / (1.0 - s)));
}
void main() {
  vec2 dc = vUv - 0.5;
  float r2 = dot(dc, dc);
  vec2 off = dc * uCA * r2 * 4.0;
  vec3 col = vec3(texture(uScene, vUv - off).r, texture(uScene, vUv).g, texture(uScene, vUv + off).b);
  col += texture(uBloom, vUv).rgb * uBloomStrength;
  if (uRays.z > 0.0) {
    // light shafts: bloom energy radially blurred toward the source (pure function of the frame)
    vec2 c = uRays.xy, d = (c - vUv) * 0.62 / 28.0;
    vec3 acc = vec3(0.0); float w = 1.0, wsum = 0.0;
    vec2 q = vUv + d * hash01(gl_FragCoord.xy, uFrame);
    for (int i = 0; i < 28; i++) { acc += texture(uBloom, q).rgb * w; wsum += w; w *= 0.93; q += d; }
    col += acc / wsum * uRays.z;
  }
  if (uHudGuard > 0.0) {
    // keep 3D content from running behind the HUD readouts (top-left identity block, top-right bar/section)
    vec2 p = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
    // the masks cover the HUD blocks and feather out over 24 px; at most 82 % darker (no hard black boxes)
    float m = max(softRect(p, vec2(235.0, 73.0), vec2(195.0, 39.0), 24.0), softRect(p, vec2(1767.0, 52.0), vec2(118.0, 18.0), 24.0));
    if (uHudTitle > 0.0) m = max(m, softRect(p, vec2(460.0 + uHudTitle * 0.5, 61.0), vec2(uHudTitle * 0.5 + 16.0, 12.0), 24.0));
    col *= 1.0 - 0.82 * m * uHudGuard;
  }
  col = shoulder(max(col * uExposure, -uLift) + uLift); // a replayed panel backing may sit below the background (renderer.replay)
  vec4 ov = texture(uOverlay, vUv);
  col = col * (1.0 - ov.a) + ov.rgb;
  float vig = smoothstep(0.95, 0.25, length(dc * vec2(1.0, 0.82)));
  col *= mix(1.0, vig, uVignette);
  vec2 cell = floor(gl_FragCoord.xy / max(uScale, 1.0));
  float g = hash01(uint(int(cell.x)), uint(int(cell.y)), uint(int(uFrame))) - 0.5;
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col += g * uGrain * (0.55 + 0.45 * (1.0 - luma));
  col += (hash01(uint(int(gl_FragCoord.x)), uint(int(gl_FragCoord.y)), uint(int(uFrame)) + 7919u) - 0.5) / 255.0;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

// Packs the final RGBA8 image into the exact yuv420p byte stream ffmpeg reads (top-down Y plane, then U, then V),
// BT.709 limited range, chroma = 2x2 average. Target: RGBA8 of (W/4) x (H*3/2) texels = 4 stream bytes each.
const YUV = /* glsl */ `
uniform sampler2D uSrc; uniform ivec2 uSize;
out vec4 outColor;
vec3 px(int x, int y) { return texelFetch(uSrc, ivec2(x, uSize.y - 1 - y), 0).rgb; } // y top-down
float lumaOf(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float byteAt(int k, int col) {
  int W = uSize.x, H = uSize.y;
  if (k < H) return floor(16.0 + 219.0 * lumaOf(px(col, k)) + 0.5);
  int q = k - H;
  bool isV = q >= H / 4;
  if (isV) q -= H / 4;
  int half_ = W / 2;
  int row = q * 2 + (col >= half_ ? 1 : 0);
  int c = col % half_;
  vec3 m = (px(2 * c, 2 * row) + px(2 * c + 1, 2 * row) + px(2 * c, 2 * row + 1) + px(2 * c + 1, 2 * row + 1)) * 0.25;
  float y = lumaOf(m);
  float v = isV ? (m.r - y) / 1.5748 : (m.b - y) / 1.8556;
  return floor(128.0 + 224.0 * v + 0.5);
}
void main() {
  int k = int(gl_FragCoord.y), x = int(gl_FragCoord.x) * 4;
  outColor = vec4(byteAt(k, x), byteAt(k, x + 1), byteAt(k, x + 2), byteAt(k, x + 3)) / 255.0;
}`;

const BLIT = /* glsl */ `
uniform sampler2D uSrc; in vec2 vUv; out vec4 outColor;
void main() { outColor = vec4(texture(uSrc, vUv).rgb, 1.0); }`;

export class Post {
  constructor() {
    this.down = rawMaterial({ vertex: FULLSCREEN_VERT, fragment: DOWN, blend: 'none', uniforms: { uSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uPrefilter: { value: 0 }, uThreshold: { value: 1 }, uKnee: { value: 0.3 } } });
    this.up = rawMaterial({ vertex: FULLSCREEN_VERT, fragment: UP, blend: 'add', uniforms: { uSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 1 } } });
    this.final = rawMaterial({
      vertex: FULLSCREEN_VERT, fragment: FINAL, blend: 'none',
      uniforms: {
        uScene: { value: null }, uBloom: { value: null }, uOverlay: { value: null }, uBloomStrength: { value: 0.5 }, uExposure: { value: 1 },
        uVignette: { value: 0.3 }, uGrain: { value: 0.04 }, uCA: { value: 0.003 }, uFrame: { value: 0 }, uScale: { value: 1 }, uLift: { value: new THREE.Vector3() }, uRays: { value: new THREE.Vector3() }, uHudGuard: { value: 0 }, uHudTitle: { value: 0 },
      },
    });
    this.yuv = rawMaterial({ vertex: FULLSCREEN_VERT, fragment: YUV, blend: 'none', uniforms: { uSrc: { value: null }, uSize: { value: new THREE.Vector2() } } });
    this.blit = rawMaterial({ vertex: FULLSCREEN_VERT, fragment: BLIT, blend: 'none', uniforms: { uSrc: { value: null } } });
    this.quad = fullscreenMesh(this.down);
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.levels = [];
  }

  setSize(w, h) {
    for (const l of this.levels) l.dispose();
    this.levels = [];
    let lw = w, lh = h;
    for (let i = 0; i < 6; i++) {
      lw = Math.max(1, Math.floor(lw / 2)); lh = Math.max(1, Math.floor(lh / 2));
      this.levels.push(new THREE.WebGLRenderTarget(lw, lh, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }));
    }
  }

  pass(renderer, camera, material, target) {
    this.quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, camera);
  }

  render(renderer, camera, sceneTex, overlayTex, target, s, frame, scale) {
    // bloom
    let src = sceneTex;
    const d = this.down.uniforms;
    d.uThreshold.value = s.threshold; d.uKnee.value = s.knee;
    for (let i = 0; i < this.levels.length; i++) {
      const L = this.levels[i];
      d.uSrc.value = src;
      d.uTexel.value.set(1 / (src.image?.width ?? L.width * 2), 1 / (src.image?.height ?? L.height * 2));
      d.uPrefilter.value = i === 0 ? 1 : 0;
      this.pass(renderer, camera, this.down, L);
      src = L.texture;
    }
    const u = this.up.uniforms;
    for (let i = this.levels.length - 1; i > 0; i--) {
      const from = this.levels[i], to = this.levels[i - 1];
      u.uSrc.value = from.texture;
      u.uTexel.value.set(1 / from.width, 1 / from.height);
      this.pass(renderer, camera, this.up, to);
    }
    const f = this.final.uniforms;
    f.uScene.value = sceneTex; f.uBloom.value = this.levels[0].texture; f.uOverlay.value = overlayTex;
    f.uBloomStrength.value = s.bloom; f.uExposure.value = s.exposure; f.uVignette.value = s.vignette;
    f.uGrain.value = s.grain; f.uCA.value = s.ca; f.uFrame.value = frame; f.uScale.value = scale;
    f.uLift.value.set(s.lift[0], s.lift[1], s.lift[2]);
    f.uRays.value.set(s.rays[0] / 1920, 1 - s.rays[1] / 1080, s.rays[2]);
    f.uHudGuard.value = s.hudGuard ?? 0;
    f.uHudTitle.value = s.hudTitle ?? 0;
    this.pass(renderer, camera, this.final, target);
  }

  toYuv(renderer, camera, tex, target, w, h) {
    this.yuv.uniforms.uSrc.value = tex;
    this.yuv.uniforms.uSize.value.set(w, h);
    this.pass(renderer, camera, this.yuv, target);
  }

  toScreen(renderer, camera, tex) {
    this.blit.uniforms.uSrc.value = tex;
    this.pass(renderer, camera, this.blit, null);
  }
}
