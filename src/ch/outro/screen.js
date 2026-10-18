// outro — a replay on a screen in the 3D scene: a plane of w×h world units showing a texture from ctx.replay (the
// film's own frame at another time), with rounded corners. Memory grading: `sat` desaturates, `blueGrey` turns the
// blue of you grey (in the outro you are gone: in memories your blue is grey), `dim` darkens a screen out of focus.
import * as THREE from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `
uniform sampler2D map; uniform float alpha; uniform float sat; uniform float blueGrey; uniform float dim;
uniform vec2 size; uniform float radius;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(map, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float blue = clamp((c.b - max(c.r, c.g)) / max(c.b, 1e-3) * 3.0, 0.0, 1.0); // how much of the colour is you's blue
  c = mix(c, vec3(l), blue * blueGrey);
  c = mix(vec3(l), c, sat);
  vec2 p = (vUv - 0.5) * size, q = abs(p) - (size * 0.5 - radius);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  float m = clamp(0.5 - d / fwidth(d), 0.0, 1.0);
  gl_FragColor = vec4(c * dim, alpha * m);
}`;

export function makeScreen(w, h, radius = 0.06) {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthTest: false, depthWrite: false,
    uniforms: { map: { value: null }, alpha: { value: 1 }, sat: { value: 1 }, blueGrey: { value: 0 }, dim: { value: 1 }, size: { value: new THREE.Vector2(w, h) }, radius: { value: radius } },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  return { scene, mesh, material };
}

// a THREE camera equal to ctx.camera3D(cam) (same defaults), for ctx.three
const tmp = new THREE.PerspectiveCamera();
export function threeCamera(cam, out = tmp) {
  out.fov = cam.fov ?? 40; out.aspect = 16 / 9; out.near = cam.near ?? 0.05; out.far = cam.far ?? 200;
  out.position.set(...cam.position); out.up.set(...(cam.up ?? [0, 1, 0])); out.lookAt(...(cam.target ?? [0, 0, 0]));
  out.updateMatrixWorld(); out.updateProjectionMatrix();
  return out;
}
