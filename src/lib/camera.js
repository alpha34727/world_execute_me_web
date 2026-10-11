// Camera helpers (pure functions of t). Return option objects for ctx.camera3D.
import { noise1 } from './hash.js';

// orbit around target: azimuth / elevation in radians, distance r
export function orbit({ target = [0, 0, 0], r = 6, az = 0, el = 0, fov = 40, up = [0, 1, 0] } = {}) {
  const ce = Math.cos(el);
  return {
    fov, up, target,
    position: [target[0] + r * ce * Math.sin(az), target[1] + r * Math.sin(el), target[2] + r * ce * Math.cos(az)],
  };
}

// deterministic handheld micro-motion (world units / radians), seed per shot
export function shake(t, amp = 0.02, seed = 1, freq = 0.9) {
  return [noise1(t * freq, seed) * amp, noise1(t * freq, seed + 11) * amp, noise1(t * freq, seed + 23) * amp];
}

export const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
