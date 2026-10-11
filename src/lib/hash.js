// Deterministic hashing / pseudo-randomness. Every "random" value in the film comes from here (or the GLSL twin
// below) as a pure function of its inputs — never Math.random, never state carried between frames.

// 32-bit integer hash of up to three integers (murmur3 finaliser over a simple combine).
export function hash32(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77) ^ Math.imul(c | 0, 0xc2b2ae3d);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// uniform [0, 1)
export const rand = (i, seed = 0, k = 0) => hash32(i, seed, k) / 4294967296;
// uniform [-1, 1)
export const rands = (i, seed = 0, k = 0) => rand(i, seed, k) * 2 - 1;
export const randRange = (lo, hi, i, seed = 0, k = 0) => lo + (hi - lo) * rand(i, seed, k);
// approximately normal (Irwin–Hall, 4 terms), mean 0, sd 1
export const randn = (i, seed = 0) =>
  (rand(i, seed, 1) + rand(i, seed, 2) + rand(i, seed, 3) + rand(i, seed, 4) - 2) * 1.7320508;

// smooth 1D value noise in [-1, 1], period-free, integer lattice
export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return rands(i, seed, 7) * (1 - u) + rands(i + 1, seed, 7) * u;
}

// smooth 2D value noise in [-1, 1]
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = rands(ix, iy, seed), b = rands(ix + 1, iy, seed);
  const c = rands(ix, iy + 1, seed), d = rands(ix + 1, iy + 1, seed);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

// stable seed from a string (shot ids etc.)
export function seedOf(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

// GLSL ES 3.0 twin: uint hashing for shaders (same constants; used for grain, particles, glitches).
export const HASH_GLSL = /* glsl */ `
uint hash32u(uint a, uint b, uint c) {
  uint h = (a * 0x9e3779b1u) ^ (b * 0x85ebca77u) ^ (c * 0xc2b2ae3du);
  h ^= h >> 16; h *= 0x85ebca6bu; h ^= h >> 13; h *= 0xc2b2ae35u; h ^= h >> 16;
  return h;
}
float hash01(uint a, uint b, uint c) { return float(hash32u(a, b, c)) / 4294967296.0; }
float hash01(vec2 p, float s) { return hash01(uint(int(floor(p.x))), uint(int(floor(p.y))), uint(int(s))); }
float vnoise(vec2 x, float s) {
  vec2 i = floor(x), f = fract(x), u = f * f * (3.0 - 2.0 * f);
  float a = hash01(i, s), b = hash01(i + vec2(1, 0), s), c = hash01(i + vec2(0, 1), s), d = hash01(i + vec2(1, 1), s);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
}
`;
