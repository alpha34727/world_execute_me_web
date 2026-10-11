// SDF shapes in design space: rect (rounded), ellipse/circle, ring. Fill + stroke + glow, 1-px AA at any size.
import * as THREE from 'three';
import { InstanceBuffer, rawMaterial, materialSet } from './common.js';

const VERT = /* glsl */ `
in vec2 position;
in vec4 aRect;   // cx, cy, half w, half h (design px)
in vec4 aP;      // type (0 rect, 1 ellipse, 2 ring), corner radius / ring inner ratio, stroke width, rotation
in vec4 aFill;
in vec4 aStroke;
in vec4 aQ;      // glow radius, glow strength, intensity, -
uniform mat4 uViewProj;
uniform vec2 uRes;
uniform float uScale;
out vec2 vLocal; out vec2 vHalf; out vec4 vP; out vec4 vFill; out vec4 vStroke; out vec4 vQ;
void main() {
  float pad = (aP.z * 0.5 + aQ.x * 2.5) + 2.0 / uScale;
  vec2 half_ = aRect.zw + pad;
  vec2 corner = vec2(position.x * 2.0 - 1.0, position.y) * half_;
  float c = cos(aP.w), s = sin(aP.w);
  vec2 world = aRect.xy + vec2(c * corner.x - s * corner.y, s * corner.x + c * corner.y);
  vLocal = corner * uScale; vHalf = aRect.zw * uScale;
  vP = vec4(aP.x, aP.y * uScale, aP.z * uScale, aP.y);
  vFill = aFill; vStroke = aStroke; vQ = vec4(aQ.x * uScale, aQ.y, aQ.z, 0.0);
  gl_Position = uViewProj * vec4(world, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
in vec2 vLocal; in vec2 vHalf; in vec4 vP; in vec4 vFill; in vec4 vStroke; in vec4 vQ;
out vec4 outColor;
float sdRoundRect(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float sdEllipse(vec2 p, vec2 ab) { // good approximation, exact for circles
  float k1 = length(p / ab); float k2 = length(p / (ab * ab)); return k1 < 1e-5 ? -min(ab.x, ab.y) : k1 * (k1 - 1.0) / k2; }
void main() {
  float d;
  if (vP.x < 0.5) d = sdRoundRect(vLocal, vHalf, min(vP.y, min(vHalf.x, vHalf.y)));
  else d = sdEllipse(vLocal, vHalf);
  if (vP.x > 1.5) { float inner = min(vHalf.x, vHalf.y) * vP.w; d = abs(d + inner * 0.5 + 0.0) - inner * 0.5; }
  float fill = 1.0 - smoothstep(-0.5, 0.5, d);
  // straight colour in, premultiplied out
  vec3 rgb = (vFill.rgb * vFill.a * fill);
  float a = vFill.a * fill;
  if (vP.z > 0.0) {
    float sw = vP.z * 0.5;
    float stroke = (1.0 - smoothstep(sw - 0.5, sw + 0.5, abs(d))) * vStroke.a;
    rgb = rgb * (1.0 - stroke) + vStroke.rgb * stroke; a = a * (1.0 - stroke) + stroke;
  }
  if (vQ.y > 0.0) {
    vec4 gc = vStroke.a > 0.0 ? vStroke : vFill;
    float g = vQ.y * exp(-pow(max(d, 0.0) / max(vQ.x, 1e-3), 2.0)) * gc.a * (1.0 - a);
    rgb += gc.rgb * g; a += g;
  }
  if (a <= 0.0005) discard;
  outColor = vec4(rgb * vQ.z, a);
}`;

export class ShapeBatch {
  constructor() {
    this.buf = new InstanceBuffer({ aRect: 4, aP: 4, aFill: 4, aStroke: 4, aQ: 4 }, 1024);
    this.uniforms = {
      uViewProj: { value: new THREE.Matrix4() },
      uRes: { value: new THREE.Vector2(1920, 1080) },
      uScale: { value: 1 },
    };
    this.material = materialSet((blend) => rawMaterial({ vertex: VERT, fragment: FRAG, uniforms: this.uniforms, blend }));
    this.mesh = new THREE.Mesh(this.buf.geometry, this.material('alpha'));
    this.mesh.frustumCulled = false;
  }
  // s: { type: 0|1|2, x, y, hw, hh, radius (corner) | inner (ring ratio), stroke, rotation, fill, strokeColor, glow, glowStrength, intensity }
  push(s) {
    const i = this.buf.reserve(1);
    const A = this.buf.arrays;
    A.aRect.set([s.x, s.y, s.hw, s.hh], i * 4);
    A.aP.set([s.type, s.type === 2 ? (s.inner ?? 0.2) : (s.radius ?? 0), s.stroke ?? 0, s.rotation ?? 0], i * 4);
    A.aFill.set(s.fill ?? [0, 0, 0, 0], i * 4);
    A.aStroke.set(s.strokeColor ?? [0, 0, 0, 0], i * 4);
    A.aQ.set([s.glow ?? 0, s.glow ? (s.glowStrength ?? 0.5) : 0, s.intensity ?? 1, 0], i * 4);
  }
}
