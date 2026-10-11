// T — the only source of times for shots. Built from analysis/out/timing.json + onsets.json.
// Shots never contain bare seconds: every time is derived from the beat grid, sections, words or onsets.
import { LEAD, PREROLL, FPS } from '../sections.js';

export function makeTiming(timing, onsets) {
  const { t0, period } = timing.grid;
  // section bounds recomputed exactly from the grid (timing.json stores them rounded to 10 µs)
  const sections = timing.sections.map((s) => ({
    ...s,
    start: s.bar_start === 0 ? 0 : t0 + 4 * s.bar_start * period,
    end: s.bar_end == null ? timing.film.song_end : t0 + 4 * s.bar_end * period,
  }));
  const byId = new Map(sections.map((s) => [s.id, s]));
  const lines = timing.lines;
  const stems = {
    drums: onsets.drums.map((o) => o.t),
    vocals: onsets.vocals.map((o) => o.t),
  };
  const strength = { drums: onsets.drums.map((o) => o.s), vocals: onsets.vocals.map((o) => o.s) };

  const fail = (msg) => { throw new Error(`T: ${msg}`); };

  // first index with arr[i] >= x
  const lowerBound = (arr, x) => {
    let lo = 0, hi = arr.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < x) lo = m + 1; else hi = m; }
    return lo;
  };

  const T = {
    timing,
    bpm: timing.grid.bpm,
    period,
    t0,
    LEAD,
    FPS,
    PREROLL,
    songEnd: timing.film.song_end,
    sections,
    lines,

    // --- grid (k may be fractional or negative) ---
    beatTime: (k) => t0 + k * period,
    barTime: (b) => t0 + 4 * b * period,
    beatAt: (t) => (t - t0) / period,
    barAt: (t) => (t - t0) / (4 * period),
    beats: (n) => n * period, // duration of n beats
    bars: (n) => 4 * n * period,
    nextBeat: (t, div = 1) => t0 + Math.ceil(((t - t0) / period) * div - 1e-9) * (period / div),
    prevBeat: (t, div = 1) => t0 + Math.floor(((t - t0) / period) * div + 1e-9) * (period / div),
    snap: (t, div = 1) => t0 + Math.round(((t - t0) / period) * div) * (period / div),

    // --- structure ---
    section(id) {
      const s = byId.get(id);
      if (!s) fail(`unknown section "${id}"`);
      return s;
    },
    sectionAt(t) {
      for (const s of sections) if (t >= s.start && t < s.end) return s;
      return t < 0 ? null : sections.at(-1);
    },
    line(i) {
      const l = lines[i];
      if (!l) fail(`no line ${i}`);
      return l;
    },
    // exact text match first, then substring; nth = 0-based occurrence; optional section filter
    findLine(text, nth = 0, section = null) {
      const pool = section ? lines.filter((l) => l.section === section) : lines;
      let hits = pool.filter((l) => l.text === text);
      if (!hits.length) hits = pool.filter((l) => l.text.includes(text));
      if (nth >= hits.length) fail(`line "${text}" occurrence ${nth} not found (${hits.length} matches)`);
      return hits[nth];
    },
    // a word object {text, start, end, attack?, g16, ...}; nth counts occurrences across the song (or section)
    findWord(text, nth = 0, section = null) {
      const hits = [];
      for (const l of lines) {
        if (section && l.section !== section) continue;
        for (const w of l.words) if (w.text === text) hits.push(w);
      }
      if (nth >= hits.length) fail(`word "${text}" occurrence ${nth} not found (${hits.length} matches)`);
      return hits[nth];
    },
    // the currently sung / most recent line at t (null before the first line)
    lineAt(t) {
      let cur = null;
      for (const l of lines) { if (l.start <= t) cur = l; else break; }
      return cur;
    },

    // --- onsets ---
    onsets(stem, a = -Infinity, b = Infinity, minStrength = 0) {
      const ts = stems[stem] ?? fail(`unknown stem "${stem}"`);
      const out = [];
      for (let i = lowerBound(ts, a); i < ts.length && ts[i] < b; i++) {
        if (strength[stem][i] >= minStrength) out.push({ t: ts[i], s: strength[stem][i] });
      }
      return out;
    },
    // nearest onset time within ±tol of t (optionally above a strength), else null
    onsetNear(stem, t, tol = 0.06, minStrength = 0) {
      const ts = stems[stem] ?? fail(`unknown stem "${stem}"`);
      let best = null, bd = Infinity;
      for (let i = Math.max(0, lowerBound(ts, t - tol)); i < ts.length && ts[i] <= t + tol; i++) {
        const d = Math.abs(ts[i] - t);
        if (d < bd && strength[stem][i] >= minStrength) { bd = d; best = ts[i]; }
      }
      return best;
    },

    // --- editing ---
    cut: (t) => t - LEAD, // a cut lands one frame before the hit
    // film frame index showing song time t (first frame at or after t)
    frameOf: (t) => Math.ceil((t + PREROLL) * FPS - 1e-6),
    timeOfFrame: (f) => f / FPS - PREROLL,
  };
  return T;
}
