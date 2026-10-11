// Shared GPU helpers. Everything is drawn with RawShaderMaterial (GLSL 3) so no Three.js default material,
// lighting or colour-space conversion ever touches a pixel. Colours are display-referred values (theme.js).
import * as THREE from 'three';

export const BLEND = {
  // premultiplied alpha
  alpha: { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor },
  add: { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor },
  // light on dark: overlapping strokes do not accumulate (seamless polyline joints)
  max: { blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor },
  // ink on paper
  min: { blending: THREE.CustomBlending, blendEquation: THREE.MinEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor },
  none: { blending: THREE.NoBlending },
};

export function rawMaterial({ vertex, fragment, uniforms = {}, blend = 'alpha', defines = {} }) {
  const m = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: `precision highp float;\nprecision highp int;\n${vertex}`,
    fragmentShader: `precision highp float;\nprecision highp int;\n${fragment}`,
    uniforms,
    defines,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide, // the y-down design projection flips winding
    ...BLEND[blend],
  });
  return m;
}

// Materials keyed by blend mode share one program per shader source.
export function materialSet(make) {
  const cache = new Map();
  return (blend) => {
    if (!cache.has(blend)) cache.set(blend, make(blend));
    return cache.get(blend);
  };
}

const INFINITE_SPHERE = new THREE.Sphere(new THREE.Vector3(), Infinity);

export function quadGeometry() {
  // unit quad corners (x in 0..1, y in -1..1) for instanced strips; 2 triangles
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 1, -1, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.boundingSphere = INFINITE_SPHERE; // positions are 2D corners; never cull / sort by bounds
  return g;
}

// Growable instanced attributes. layout: { name: itemSize }
export class InstanceBuffer {
  constructor(layout, capacity = 1024) {
    this.layout = layout;
    this.geometry = quadGeometry();
    this.capacity = 0;
    this.count = 0;
    this.arrays = {};
    this.grow(capacity);
  }
  grow(cap) {
    const old = this.arrays;
    this.capacity = cap;
    for (const [name, size] of Object.entries(this.layout)) {
      const arr = new Float32Array(cap * size);
      if (old[name]) arr.set(old[name].subarray(0, Math.min(old[name].length, arr.length)));
      this.arrays[name] = arr;
      const attr = new THREE.InstancedBufferAttribute(arr, size);
      attr.setUsage(THREE.DynamicDrawUsage);
      this.geometry.setAttribute(name, attr);
    }
  }
  reset() { this.count = 0; }
  // returns base index of n reserved instances
  reserve(n) {
    if (this.count + n > this.capacity) {
      let cap = this.capacity;
      while (cap < this.count + n) cap *= 2;
      this.grow(cap);
    }
    const i = this.count;
    this.count += n;
    return i;
  }
  upload(from = 0, to = this.count) {
    for (const [name, size] of Object.entries(this.layout)) {
      const attr = this.geometry.getAttribute(name);
      attr.clearUpdateRanges();
      attr.addUpdateRange(from * size, (to - from) * size);
      attr.needsUpdate = true;
    }
  }
}

// one fullscreen triangle
export function fullscreenMesh(material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 3, -1, -1, 3], 2));
  g.boundingSphere = INFINITE_SPHERE;
  const m = new THREE.Mesh(g, material);
  m.frustumCulled = false;
  return m;
}

export const FULLSCREEN_VERT = /* glsl */ `
in vec2 position;
out vec2 vUv;
void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }
`;

// 2D design-space camera: x 0..1920 → -1..1, y 0..1080 (down) → 1..-1
export function designViewProj(W, H) {
  return new THREE.Matrix4().set(
    2 / W, 0, 0, -1,
    0, -2 / H, 0, 1,
    0, 0, -1, 0,
    0, 0, 0, 1,
  );
}

export function parseColor(c, alpha = 1) {
  if (Array.isArray(c)) return [c[0], c[1], c[2], c[3] ?? alpha];
  if (c && c.isColor) return [c.r, c.g, c.b, alpha];
  if (typeof c === 'number') return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255, alpha];
  throw new Error(`bad colour ${c}`);
}
