// F — audio features at 60 rows/s from analysis/out/features.f32 (see features.json). The only source of
// audio-reactive values. get() interpolates linearly between rows; all channels are 0..1.
export function makeFeatures(buffer, meta) {
  const data = buffer instanceof Float32Array ? buffer : new Float32Array(buffer);
  const C = meta.channels.length;
  const rows = meta.rows;
  const fps = meta.fps;
  if (data.length !== rows * C) throw new Error(`features: expected ${rows * C} floats, got ${data.length}`);
  const index = new Map(meta.channels.map((n, i) => [n, i]));
  const ch = (name) => {
    const c = index.get(name);
    if (c === undefined) throw new Error(`features: unknown channel "${name}"`);
    return c;
  };
  const at = (c, r) => data[Math.min(rows - 1, Math.max(0, r)) * C + c];

  return {
    channels: meta.channels,
    fps,
    rows,
    get(name, t) {
      const c = ch(name);
      const x = t * fps;
      const r = Math.floor(x);
      const f = x - r;
      return at(c, r) * (1 - f) + at(c, r + 1) * f;
    },
    // mean over [t - win, t] (causal smoothing, e.g. for meters)
    avg(name, t, win = 0.1) {
      const c = ch(name);
      const r1 = Math.round(t * fps), r0 = Math.round((t - win) * fps);
      let s = 0;
      for (let r = r0; r <= r1; r++) s += at(c, r);
      return s / (r1 - r0 + 1);
    },
    // max over [t - win, t]
    peak(name, t, win = 0.1) {
      const c = ch(name);
      let m = 0;
      for (let r = Math.round((t - win) * fps); r <= Math.round(t * fps); r++) m = Math.max(m, at(c, r));
      return m;
    },
    // 16 mel bands at t (low -> high)
    mel(t) {
      const out = new Array(16);
      for (let b = 0; b < 16; b++) out[b] = this.get(`mel_${String(b).padStart(2, '0')}`, t);
      return out;
    },
  };
}
