// Transition compositor: blends shot layer A (outgoing) and B (incoming) at progress p.
//   xfade  — eased crossfade
//   whip   — both layers slide past each other with heavy velocity-scaled motion blur
//   glide  — eased slide with light blur (x or y axis)
//   points — A disintegrates into luminance-weighted particles that swirl and reassemble as B
import * as THREE from 'three';
import { rawMaterial, fullscreenMesh, FULLSCREEN_VERT, quadGeometry } from './common.js';
import { HASH_GLSL } from '../../lib/hash.js';

const TYPES = { cut: 0, xfade: 1, whip: 2, glide: 3, points: 4 };

const FRAG = /* glsl */ `
uniform sampler2D uA; uniform sampler2D uB;
uniform float uP; uniform int uType; uniform vec2 uDir; uniform float uRev; uniform float uHasB;
in vec2 vUv; out vec4 outColor;
float easeQuint(float t) { return t < 0.5 ? 16.0 * pow(t, 5.0) : 1.0 - pow(-2.0 * t + 2.0, 5.0) / 2.0; }
float easeCubic(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; }
vec3 strip(vec2 uv, float e) {
  // A occupies [0,1) along the axis and B follows it; the strip has scrolled by e (uRev mirrors the direction)
  float x = dot(uv, uDir);
  vec2 perp = uv - uDir * x;
  float s = (uRev > 0.5 ? 1.0 - x : x) + e;
  float local = s < 1.0 ? s : s - 1.0;
  if (uRev > 0.5) local = 1.0 - local;
  return s < 1.0 ? texture(uA, perp + uDir * local).rgb : texture(uB, perp + uDir * local).rgb;
}
void main() {
  vec3 a = texture(uA, vUv).rgb;
  if (uHasB < 0.5) { outColor = vec4(a, 1.0); return; }
  vec3 b = texture(uB, vUv).rgb;
  vec3 col;
  if (uType == 1) col = mix(a, b, smoothstep(0.0, 1.0, uP));
  else if (uType == 2 || uType == 3) {
    bool whip = uType == 2;
    float e = whip ? easeQuint(uP) : easeCubic(uP);
    float d = 0.002;
    float v = whip ? (easeQuint(min(uP + d, 1.0)) - easeQuint(max(uP - d, 0.0))) / (2.0 * d)
                   : (easeCubic(min(uP + d, 1.0)) - easeCubic(max(uP - d, 0.0))) / (2.0 * d);
    float L = v * (whip ? 0.045 : 0.012);
    vec3 acc = vec3(0.0);
    const int N = 24;
    for (int i = 0; i < N; i++) {
      float o = (float(i) / float(N - 1) - 0.5) * L;
      acc += strip(vUv, e + o);
    }
    col = acc / float(N);
  } else if (uType == 4) {
    col = a * (1.0 - smoothstep(0.0, 0.22, uP)) + b * smoothstep(0.78, 1.0, uP);
  } else col = b;
  outColor = vec4(col, 1.0);
}`;

const PTS_VERT = /* glsl */ `
${HASH_GLSL}
in vec2 position;
uniform sampler2D uA; uniform sampler2D uB;
uniform vec2 uGrid; uniform vec2 uRes; uniform float uP; uniform float uScale;
out vec2 vC; out vec4 vCol;
void main() {
  int id = gl_InstanceID;
  vec2 cell = vec2(float(id % int(uGrid.x)), float(id / int(uGrid.x)));
  vec2 uv = (cell + 0.5) / uGrid;
  vec3 ca = textureLod(uA, uv, 0.0).rgb, cb = textureLod(uB, uv, 0.0).rgb;
  float r0 = hash01(uint(id), 11u, 0u), r1 = hash01(uint(id), 12u, 0u), r2 = hash01(uint(id), 13u, 0u);
  // sweep left -> right with jitter
  float delay = uv.x * 0.45 + r0 * 0.15;
  float q = clamp((uP - delay) / 0.4, 0.0, 1.0);
  float bell = sin(3.14159265 * q);
  vec2 swirl = vec2(vnoise(uv * 6.0 + uP * 2.0, 5.0), vnoise(uv * 6.0 + 9.0 + uP * 2.0, 6.0));
  vec2 pos = uv * uRes + (swirl * 140.0 + vec2(r1 - 0.5, r2 - 0.5) * 60.0) * uScale * bell;
  vec3 col = mix(ca, cb, smoothstep(0.35, 0.65, q));
  float lum = max(col.r, max(col.g, col.b));
  float vis = smoothstep(0.03, 0.25, lum) * smoothstep(0.0, 0.08, uP) * (1.0 - smoothstep(0.9, 1.0, uP));
  float size = (uRes.x / uGrid.x) * (1.1 + 0.8 * bell);
  vec2 corner = vec2(position.x * 2.0 - 1.0, position.y) * size * 0.5;
  vC = vec2(position.x * 2.0 - 1.0, position.y);
  vCol = vec4(col * vis, vis);
  gl_Position = vec4((pos + corner) / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;

const PTS_FRAG = /* glsl */ `
in vec2 vC; in vec4 vCol; out vec4 outColor;
void main() { float r = length(vC); float a = 1.0 - smoothstep(0.5, 1.0, r); if (vCol.a * a < 0.003) discard; outColor = vCol * a; }`;

export class Compositor {
  constructor() {
    this.material = rawMaterial({
      vertex: FULLSCREEN_VERT, fragment: FRAG, blend: 'none',
      uniforms: { uA: { value: null }, uB: { value: null }, uP: { value: 0 }, uType: { value: 0 }, uDir: { value: new THREE.Vector2(1, 0) }, uRev: { value: 0 }, uHasB: { value: 0 } },
    });
    this.quad = fullscreenMesh(this.material);
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.ptsMaterial = rawMaterial({
      vertex: PTS_VERT, fragment: PTS_FRAG, blend: 'add',
      uniforms: { uA: { value: null }, uB: { value: null }, uGrid: { value: new THREE.Vector2(320, 180) }, uRes: { value: new THREE.Vector2() }, uP: { value: 0 }, uScale: { value: 1 } },
    });
    const g = quadGeometry();
    g.instanceCount = 320 * 180;
    this.pts = new THREE.Mesh(g, this.ptsMaterial);
    this.pts.frustumCulled = false;
    this.ptsScene = new THREE.Scene();
    this.ptsScene.add(this.pts);
  }

  render(renderer, camera, target, texA, texB, transition, p, res, scale) {
    const u = this.material.uniforms;
    u.uA.value = texA; u.uB.value = texB ?? texA; u.uHasB.value = texB ? 1 : 0;
    u.uP.value = p;
    u.uType.value = transition ? TYPES[transition.type] : 0;
    // axis 'x': dir 1 = content travels left (B enters from the right); axis 'y': dir 1 = content travels up
    if (transition?.axis === 'y') u.uDir.value.set(0, 1); else u.uDir.value.set(1, 0);
    u.uRev.value = (transition?.dir ?? 1) < 0 ? 1 : 0;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, camera);
    if (texB && transition?.type === 'points') {
      const q = this.ptsMaterial.uniforms;
      q.uA.value = texA; q.uB.value = texB; q.uP.value = p; q.uRes.value.set(res[0], res[1]); q.uScale.value = scale;
      renderer.render(this.ptsScene, camera);
    }
  }
}
