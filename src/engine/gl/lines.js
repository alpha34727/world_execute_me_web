// Glow lines: each segment is an instanced capsule expanded in screen space; coverage is an analytic SDF
// (1 output pixel of anti-aliasing at any resolution) plus an exponential glow falloff. 2D or 3D points
// (projected by the current camera). Widths are design px and scale with the output resolution.
import * as THREE from 'three';
import { InstanceBuffer, rawMaterial, materialSet } from './common.js';

const VERT = /* glsl */ `
in vec2 position;
in vec4 aA;      // xyz, cumulative length at A (design px)
in vec4 aB;
in vec4 aColA;   // rgb, alpha
in vec4 aColB;
in vec4 aP;      // width, glow radius, dash, gap (design px)
in vec4 aQ;      // glow strength, intensity, dash offset, -
in vec4 aR;      // perspective reference distance (0 = constant width), fog near, fog far (clip w), -
uniform mat4 uViewProj;
uniform vec2 uRes;
uniform float uScale;
out vec2 vPix; out vec2 vSA; out vec2 vSB;
out vec4 vColA; out vec4 vColB; out vec4 vP; out vec4 vQ; out vec2 vDist;
void main() {
  vec4 ca = uViewProj * vec4(aA.xyz, 1.0);
  vec4 cb = uViewProj * vec4(aB.xyz, 1.0);
  if (ca.w <= 1e-4 || cb.w <= 1e-4) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec2 sa = (ca.xy / ca.w * 0.5 + 0.5) * uRes;
  vec2 sb = (cb.xy / cb.w * 0.5 + 0.5) * uRes;
  vec2 d = sb - sa;
  float len = length(d);
  vec2 t = len > 1e-4 ? d / len : vec2(1.0, 0.0);
  vec2 n = vec2(-t.y, t.x);
  float wscale = aR.x > 0.0 ? clamp(aR.x / (0.5 * (ca.w + cb.w)), 0.05, 6.0) : 1.0;
  float hw = max(0.5 * aP.x * uScale * wscale, 0.5);
  float glowR = aP.y * uScale * wscale;
  float fogA = aR.z > 0.0 ? 1.0 - smoothstep(aR.y, aR.z, ca.w) : 1.0;
  float fogB = aR.z > 0.0 ? 1.0 - smoothstep(aR.y, aR.z, cb.w) : 1.0;
  float R = hw + (aQ.x > 0.0 ? glowR * 2.5 : 0.0) + 1.5;
  vec2 p = mix(sa - t * R, sb + t * R, position.x) + n * R * position.y;
  vPix = p; vSA = sa; vSB = sb;
  vColA = vec4(aColA.rgb, aColA.a * fogA); vColB = vec4(aColB.rgb, aColB.a * fogB);
  vP = vec4(hw, glowR, aP.z * uScale, aP.w * uScale); vQ = aQ;
  vQ.w = min(1.0, aP.x * uScale * wscale); // thin-line coverage factor
  vDist = vec2(aA.w, aB.w) * uScale;
  gl_Position = vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
in vec2 vPix; in vec2 vSA; in vec2 vSB;
in vec4 vColA; in vec4 vColB; in vec4 vP; in vec4 vQ; in vec2 vDist;
out vec4 outColor;
void main() {
  vec2 pa = vPix - vSA, ba = vSB - vSA;
  float bb = dot(ba, ba);
  float h = bb > 1e-6 ? clamp(dot(pa, ba) / bb, 0.0, 1.0) : 0.0;
  float d = length(pa - ba * h);
  float hw = vP.x;
  float core = (1.0 - smoothstep(hw - 0.5, hw + 0.5, d)) * vQ.w;
  float glow = vQ.x > 0.0 ? vQ.x * exp(-pow(max(d - hw, 0.0) / max(vP.y, 1e-3), 2.0)) : 0.0;
  vec4 col = mix(vColA, vColB, h);
  float a = col.a * clamp(core + glow * (1.0 - core), 0.0, 1.0);
  if (vP.z > 0.0) {
    float dist = mix(vDist.x, vDist.y, h) + vQ.z;
    float period = vP.z + vP.w;
    float m = mod(dist, period);
    a *= smoothstep(0.0, 1.0, m) * (1.0 - smoothstep(vP.z - 1.0, vP.z, m));
  }
  if (a <= 0.0005) discard;
  outColor = vec4(col.rgb * vQ.y * a, a);
}`;

export class LineBatch {
  constructor() {
    this.buf = new InstanceBuffer({ aA: 4, aB: 4, aColA: 4, aColB: 4, aP: 4, aQ: 4, aR: 4 }, 4096);
    this.uniforms = {
      uViewProj: { value: new THREE.Matrix4() },
      uRes: { value: new THREE.Vector2(1920, 1080) },
      uScale: { value: 1 },
    };
    this.material = materialSet((blend) => rawMaterial({ vertex: VERT, fragment: FRAG, uniforms: this.uniforms, blend }));
    this.mesh = new THREE.Mesh(this.buf.geometry, this.material('max'));
    this.mesh.frustumCulled = false;
  }

  // pts: array of [x, y] / [x, y, z]; o: { color, color2, alpha, width, glow, glowStrength, intensity, dash, gap,
  // dashOffset, closed, colors (per-vertex rgba arrays), persp (reference distance or true), fog [near, far] }
  push(pts, o) {
    const n = pts.length;
    if (n < 2) return;
    const segs = o.closed ? n : n - 1;
    const base = this.buf.reserve(segs);
    const A = this.buf.arrays;
    const c0 = o.color, c1 = o.color2 ?? o.color;
    let dist = 0;
    for (let s = 0; s < segs; s++) {
      const p = pts[s], q = pts[(s + 1) % n];
      const z0 = p[2] ?? 0, z1 = q[2] ?? 0;
      const seg = Math.hypot(q[0] - p[0], q[1] - p[1], z1 - z0);
      const i = base + s;
      A.aA.set([p[0], p[1], z0, dist], i * 4);
      A.aB.set([q[0], q[1], z1, dist + seg], i * 4);
      let ca, cb;
      if (o.colors) { ca = o.colors[s]; cb = o.colors[(s + 1) % n]; }
      else {
        const u0 = s / segs, u1 = (s + 1) / segs;
        ca = [c0[0] + (c1[0] - c0[0]) * u0, c0[1] + (c1[1] - c0[1]) * u0, c0[2] + (c1[2] - c0[2]) * u0, (c0[3] ?? 1)];
        cb = [c0[0] + (c1[0] - c0[0]) * u1, c0[1] + (c1[1] - c0[1]) * u1, c0[2] + (c1[2] - c0[2]) * u1, (c0[3] ?? 1)];
      }
      const al = o.alpha ?? 1;
      A.aColA.set([ca[0], ca[1], ca[2], (ca[3] ?? 1) * al], i * 4);
      A.aColB.set([cb[0], cb[1], cb[2], (cb[3] ?? 1) * al], i * 4);
      A.aP.set([o.width ?? 2, o.glow ?? 0, o.dash ?? 0, o.gap ?? 0], i * 4);
      A.aQ.set([o.glow ? (o.glowStrength ?? 0.45) : 0, o.intensity ?? 1, o.dashOffset ?? 0, 0], i * 4);
      A.aR.set([o.persp === true ? 6 : (o.persp || 0), o.fog?.[0] ?? 0, o.fog?.[1] ?? 0, 0], i * 4);
      dist += seg;
    }
  }
}
