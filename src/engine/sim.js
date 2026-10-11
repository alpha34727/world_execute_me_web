// Deterministic fixed-step simulation for shots that need state (physics, growth...). The state at local time t is
// always step^n(init) with n = floor(t / dt), computed from the shot start; checkpoints only cache intermediate
// states, so the result is identical whether frames are rendered in order, backwards or at random.
//   spec: { init: () => state, step: (state, i, dt) => state (must not mutate input), dt, t, every = 60 }
export function simulate(cache, { init, step, dt, t, every = 60 }) {
  const n = Math.max(0, Math.floor(t / dt + 1e-9));
  const cps = cache.checkpoints;
  if (!cps.has(0)) cps.set(0, init());
  let k = Math.floor(n / every) * every;
  while (k > 0 && !cps.has(k)) k -= every;
  let state = cps.get(k);
  for (let i = k; i < n; i++) {
    state = step(state, i, dt);
    if ((i + 1) % every === 0 && !cps.has(i + 1)) cps.set(i + 1, state);
  }
  return { state, n, frac: t / dt - n };
}
