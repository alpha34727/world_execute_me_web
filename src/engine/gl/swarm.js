// GPU particle swarm. A Swarm holds N particles with two target shapes (from / to, any point sets: sample them
// with src/lib/sample.js). Every particle position is a pure function of the uniforms (morph progress, time):
//   pos = mix(from, to, ease(stagger(p))) + hash-noise drift — no simulation state, so any frame renders directly.
import * as THREE from 'three';
import { rawMaterial, materialSet, quadGeometry } from './common.js';
import { HASH_GLSL, rand } from '../../lib/hash.js';

const VERT = /* glsl */ `
${HASH_GLSL}
in vec2 position;
in vec3 aFrom;
in vec3 aTo;
in vec4 aRand;
uniform mat4 uViewProj;
uniform vec2 uRes;
uniform float uScale;
uniform float uP;        // morph progress 0..1
uniform float uStagger;  // 0..1 portion of the morph used for per-particle delay
uniform float uTime;     // seconds, drives drift
uniform float uDrift;    // drift amplitude (world units)
uniform float uScatter;  // extra mid-morph scatter amplitude (world units)
uniform float uSize;     // design px
uniform float uSizeVar;
uniform float uPersp;    // > 0: size scales with uPersp / depth (reference distance)
uniform vec4 uColA; uniform vec4 uColB;
uniform float uColorVar;
uniform float uFocus;    // clip w of the focal plane (0 = no depth of field)
uniform float uAperture; // circle of confusion growth (design px per unit of defocus)
uniform vec2 uFog;       // fog near/far in clip w (far = 0: off)
uniform float uBirth;    // 1: a particle is invisible until its own morph starts, then fades in (streams from a point)
out vec2 vC; out vec4 vCol;
float easeIO(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; }
void main() {
  float delay = aRand.x * uStagger;
  float q = clamp((uP - delay) / max(1.0 - uStagger, 1e-4), 0.0, 1.0);
  float e = easeIO(q);
  vec3 p = mix(aFrom, aTo, e);
  float bell = sin(3.14159265 * e);
  vec2 sd = aRand.yz * 97.0;
  vec3 drift = vec3(vnoise(sd + uTime * 0.35, 1.0), vnoise(sd.yx + uTime * 0.35, 2.0), vnoise(sd + 7.0 + uTime * 0.35, 3.0));
  p += drift * (uDrift + uScatter * bell);
  vec4 c = uViewProj * vec4(p, 1.0);
  if (c.w <= 1e-4) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec2 s = (c.xy / c.w * 0.5 + 0.5) * uRes;
  float size = uSize * uScale * (1.0 + uSizeVar * (aRand.w - 0.5) * 2.0);
  if (uPersp > 0.0) size *= clamp(uPersp / c.w, 0.05, 8.0);
  float alphaK = 1.0;
  if (uFocus > 0.0) {
    float coc = uAperture * abs(c.w - uFocus) / max(c.w, 0.1) * uScale;
    float s2 = sqrt(size * size + coc * coc);
    alphaK = clamp((size * size) / (s2 * s2), 0.04, 1.0);
    size = s2;
  }
  if (uFog.y > 0.0) alphaK *= 1.0 - smoothstep(uFog.x, uFog.y, c.w);
  size = max(size, 1.0);
  vec2 corner = vec2(position.x * 2.0 - 1.0, position.y) * (size * 0.5 + 1.0);
  vC = corner / (size * 0.5);
  vec4 col = mix(uColA, uColB, e);
  col.rgb *= 1.0 + uColorVar * (aRand.y - 0.5) * 2.0;
  col.a *= alphaK * mix(1.0, smoothstep(0.0, 0.12, q), uBirth);
  vCol = col;
  gl_Position = vec4((s + corner) / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
in vec2 vC; in vec4 vCol;
out vec4 outColor;
void main() {
  float r = length(vC);
  float a = vCol.a * (1.0 - smoothstep(0.55, 1.0, r));
  if (a <= 0.002) discard;
  outColor = vec4(vCol.rgb * a, a);
}`;

const sharedMaterial = materialSet((blend) => rawMaterial({
  vertex: VERT, fragment: FRAG, blend,
  uniforms: {
    uViewProj: { value: new THREE.Matrix4() }, uRes: { value: new THREE.Vector2() }, uScale: { value: 1 },
    uP: { value: 0 }, uStagger: { value: 0.3 }, uTime: { value: 0 }, uDrift: { value: 0 }, uScatter: { value: 0 },
    uSize: { value: 3 }, uSizeVar: { value: 0.4 }, uPersp: { value: 0 },
    uColA: { value: new THREE.Vector4(1, 1, 1, 1) }, uColB: { value: new THREE.Vector4(1, 1, 1, 1) }, uColorVar: { value: 0 },
    uFocus: { value: 0 }, uAperture: { value: 0 }, uFog: { value: new THREE.Vector2(0, 0) }, uBirth: { value: 0 },
  },
}));

export class Swarm {
  // from / to: Float32Array (x,y,z per particle) or arrays of [x,y,(z)]; same count
  constructor({ from, to = from, seed = 1 }) {
    this.count = from instanceof Float32Array ? from.length / 3 : from.length;
    const flat = (src) => {
      if (src instanceof Float32Array) return src;
      const a = new Float32Array(this.count * 3);
      src.forEach((p, i) => { a[i * 3] = p[0]; a[i * 3 + 1] = p[1]; a[i * 3 + 2] = p[2] ?? 0; });
      return a;
    };
    const g = quadGeometry();
    g.setAttribute('aFrom', new THREE.InstancedBufferAttribute(flat(from), 3));
    g.setAttribute('aTo', new THREE.InstancedBufferAttribute(flat(to), 3));
    const r = new Float32Array(this.count * 4);
    for (let i = 0; i < this.count; i++) for (let k = 0; k < 4; k++) r[i * 4 + k] = rand(i, seed, k);
    g.setAttribute('aRand', new THREE.InstancedBufferAttribute(r, 4));
    g.instanceCount = this.count;
    this.geometry = g;
    this.mesh = new THREE.Mesh(g, sharedMaterial('add'));
    this.mesh.frustumCulled = false;
  }
  setTargets(from, to) {
    this.geometry.getAttribute('aFrom').array.set(from); this.geometry.getAttribute('aFrom').needsUpdate = true;
    this.geometry.getAttribute('aTo').array.set(to); this.geometry.getAttribute('aTo').needsUpdate = true;
  }
  dispose() { this.geometry.dispose(); }
}

export { sharedMaterial as swarmMaterial };
