// c3.11 — "We are trapped ah … I've studied": the chorus is a loop. The song runs it three times (c1, c2 — a half,
// c3) and the online bigram (lib/ngram.js lossCurve: the surprisal of each word, −log2 p, under a model trained only
// on the words heard before it) gets better at it every pass. Each pass is one layer: x = the word's beat within
// its chorus (the three line up, it is the same melody), height = its surprisal, the dashed line = the pass's mean.
// The numbers are the real ones: 5.69 → 4.48 → 3.90 bits/word.
import { COLOR } from '../../theme.js';
import { clamp, smoothstep, mix3 } from '../../lib/ease.js';
import { lossCurve } from '../../lib/ngram.js';
import { sequence } from '../../lib/corpus.js';

export const PASSES = ['c1', 'c2', 'c3'];
export const XS = 0.3, YS = 0.18, DZ = 2.4; // world units per beat, per bit; layer spacing (c3 in front at z = 0)
export const zOf = (j) => -(PASSES.length - 1 - j) * DZ;

const cache = new WeakMap();
// [{ id, words: [{ x (beats into the chorus), bits, start, text }], mean }]
export function passes(T) {
  if (cache.has(T)) return cache.get(T);
  const seq = sequence(T), L = lossCurve(T);
  const out = PASSES.map((id) => {
    const s = T.section(id), b0 = T.beatAt(s.start);
    // the words sung in the section (by time, as the HUD and the storyboard count them)
    const words = seq.map((w, i) => ({ w, l: L[i] })).filter(({ w }) => w.start >= s.start && w.start < s.end)
      .map(({ w, l }) => ({ x: T.beatAt(w.start) - b0, bits: l.bits, start: w.start, text: w.text }));
    return { id, words, mean: words.reduce((a, w) => a + w.bits, 0) / words.length };
  });
  cache.set(T, out);
  return out;
}

const colorOf = (j) => [COLOR.faint, COLOR.dim, mix3(COLOR.me, COLOR.error, 0.45)][j];
// draws the three layers as of time t (words not yet sung are not drawn); ref: persp distance
// returns the head of the current pass (the latest word sung) in world coordinates, and the means' anchor points
export function loops(ctx, T, t, { ref = 9, alpha = 1 } = {}) {
  const P = passes(T);
  let head = null;
  const anchors = [], segs = [];
  P.forEach((pass, j) => {
    const z = zOf(j), col = colorOf(j), cur = j === P.length - 1;
    const ws = pass.words.filter((w) => w.start <= t);
    const xEnd = (pass.id === 'c2' ? 16 : 32) * XS;
    // the layer's floor: a baseline and a tick every bar
    ctx.line([[0, 0, z], [xEnd, 0, z]], { color: COLOR.faint, width: 1.2, alpha: alpha * 0.8, persp: ref });
    for (let b = 0; b <= xEnd / XS / 4 + 1e-6; b++) ctx.line([[b * 4 * XS, 0, z], [b * 4 * XS, -0.12, z]], { color: COLOR.faint, width: 1, alpha: alpha * 0.6, persp: ref });
    if (!ws.length) return;
    const pts = ws.map((w) => [w.x * XS, w.bits * YS, z]);
    // stems from the floor, the curve through the words, a point on each
    for (const p of pts) ctx.line([[p[0], 0, z], p], { color: col, width: 1, alpha: alpha * 0.35, persp: ref });
    ctx.line(pts, { color: col, width: cur ? 2.4 : 1.5, alpha: alpha * (cur ? 0.95 : 0.7), glow: cur ? 5 : 0, persp: ref, intensity: cur ? 0.9 : 1 });
    for (const p of pts) ctx.point3D(p, cur ? 3 : 2.2, { fill: col, alpha: alpha * 0.9, ref });
    // the pass's mean (over the words sung so far: c3 is still being sung)
    const mean = ws.reduce((a, w) => a + w.bits, 0) / ws.length;
    const ma = alpha * (cur ? smoothstep(0, 1, ws.length / 8) : 1);
    ctx.line([[0, mean * YS, z], [xEnd, mean * YS, z]], { color: cur ? COLOR.warm : COLOR.ink2, width: cur ? 3 : 2, alpha: ma * (cur ? 0.95 : 0.6), dash: 12, gap: 8, persp: ref });
    anchors.push({ id: pass.id, p: [xEnd + 0.2, mean * YS, z], mean, cur });
    segs.push({ a: [0, mean * YS, z], b: [xEnd, mean * YS, z], r: 8 });
    if (cur) for (let i = 1; i < pts.length; i++) segs.push({ a: pts[i - 1], b: pts[i], r: 6 });
    if (cur) head = pts.at(-1);
  });
  return { head, anchors, segs };
}
