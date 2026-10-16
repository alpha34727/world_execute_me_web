// The v1 "set of points": 4 hashed clusters (1331 particles) that snap into an 11³ lattice (spacing 0.48).
// Shared by inst1 (which hands over to v1 on this cloud) and v1.points, with the rest of the hand-over: where me and
// you are, the plan's todo times, the camera.
import { Swarm } from '../../engine/gl/swarm.js';
import { hash32, rand, randn } from '../../lib/hash.js';
import { orbit } from '../../lib/camera.js';
import { embers } from '../../lib/fx.js';
import { COLOR } from '../../theme.js';

export const NL = 11, SP = 0.48;
export const latticeAt = (i, j, k) => [(i - 5) * SP, (j - 5) * SP, (k - 5) * SP];
// the 4 cluster centres the cloud starts from (same hash as in cloud())
export const clusterCentres = () => [0, 1, 2, 3].map((c) => [(rand(c, 6) - 0.5) * 5, (rand(c, 7) - 0.5) * 3, (rand(c, 8) - 0.5) * 4]);

export function cloud(ctx) {
  return ctx.memo('v1cloud', () => {
    const N = NL * NL * NL;
    const to = new Float32Array(N * 3), from = new Float32Array(N * 3);
    let n = 0;
    for (let i = 0; i < NL; i++) for (let j = 0; j < NL; j++) for (let q = 0; q < NL; q++, n++) {
      to.set(latticeAt(i, j, q), n * 3);
      const c = hash32(n, 5) % 4;
      const cx = (rand(c, 6) - 0.5) * 5, cy = (rand(c, 7) - 0.5) * 3, cz = (rand(c, 8) - 0.5) * 4;
      from.set([cx + randn(n, 9) * 0.9, cy + randn(n, 10) * 0.7, cz + randn(n, 11) * 0.9], n * 3);
    }
    return new Swarm({ from, to, seed: 4 });
  });
}

// the cloud's colour at p = 0 (v1.points morphs it toward me as the points snap into the lattice)
export const CLOUD_COLOR = COLOR.ink2;

// v1.points opens on this camera (k = 0 of its push-in); inst1 lands on it
export const v1Camera = (k = 0) => orbit({ target: [0.55, 0.1, 0], r: 10.5 + (7.4 - 10.5) * k, az: 0.5 + 0.45 * k, el: 0.42 - 0.15 * k, fov: 38 });

// where me watches verse 1 from, and where you waits beside the cloud (blue point, from inst1 bar 15)
export const ME_V1 = [-0.8, 1.25, -3.4];
export const YOU_V1 = [3.6, -1.1, 1.8];

// the plan for verse 1 (inst1's todo list, carried into v1): items appear one per beat after bar 14 + 1 beat
export const PLAN = ['DIMENSION', 'CIRCUMFERENCE', 'TANGENTS', 'LIMITATIONS'];
export const planStart = (T) => T.cut(T.barTime(14)) + T.beats(1);
export const planTimes = (T) => PLAN.map((_, i) => planStart(T) + T.beats(0.5 + i));

// the neutral halo of fine particles around the cloud (the cloud is the space, not me: no orange here)
export function halo(ctx, { alpha = 1, focus = 10.5, time = ctx.t * 0.4 } = {}) {
  embers(ctx, { center: [0, 0, 0], radius: [2.4, 9], squash: 0.75, n: 6000, focus, aperture: 5, size: 2.8, alpha: 0.85 * alpha, time, drift: 0.25, color: COLOR.dim, color2: COLOR.ink2, seed: 78 });
}
