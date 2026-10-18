// c3.05–06 — c1's softmax returns. After "only" the model now has data: c1 sang "only SATISFACTION" and v2 "the
// only god", once each, so the online bigram (Witten–Bell) gives god 25 % and satisfaction 25 % (the rest is the
// back-off over everything heard). Cooling it, p_τ ∝ p^(1/τ), no longer leaves one bar: the two promises are tied and
// both survive (52 / 48 at τ = 0.05). Then the word sung is neither: EXECUTION.
import { COLOR } from '../../theme.js';
import { clamp, lerp, easeInOutCubic, mix3 } from '../../lib/ease.js';
import { bigramUntil } from '../../lib/ngram.js';
import { sequence } from '../../lib/corpus.js';
import { labels3D } from '../../lib/scene3d.js';

export const NBAR = 10, BH = 3.4;
export const BX = (i) => (i - (NBAR - 1) / 2) * 0.62 - 0.5;
const W = (T, k, n = 0) => T.findWord(k, n, 'c3');
const onlyLine = (T) => T.findLine('Then I can be your only', 0, 'c3');

// the next-word distribution after "only", as the model had it just before the second EXECUTION of c3
export function dist(T) {
  const at = W(T, 'EXECUTION', 1).start;
  const m = bigramUntil(T, at);
  const seen = new Map();
  for (const w of sequence(T)) { if (w.start >= at) break; if (!seen.has(w.norm)) seen.set(w.norm, w.text); }
  const all = [...seen.entries()].map(([n, text]) => ({ w: text.toLowerCase(), p: m.p('only', n) }));
  all.sort((a, b) => b.p - a.p || a.w.localeCompare(b.w));
  return all;
}
export const tauAt = (T, t) => {
  const a = onlyLine(T).words[0].start, b = W(T, 'EXECUTION', 1).start;
  return Math.exp(lerp(Math.log(1), Math.log(0.05), easeInOutCubic(clamp((t - a) / (b - a)))));
};
export const cooled = (all, tau) => { const q = all.map((d) => d.p ** (1 / tau)), s = q.reduce((x, y) => x + y, 0); return q.map((v) => v / s); };

// the cooled distribution as bars (top NBAR words). The two leaders (the promises of v2 and c1) are lit; when
// the sung word arrives (`wrong`) both are struck out in grey. Their words sit under them in 2D (struck through then).
const RED = mix3(COLOR.me, COLOR.error, 0.55);
export function bars(ctx, T, t, all, q, { ref = 8, wrong = Infinity, obstacles = [] }) {
  const top = all.slice(0, NBAR);
  const gone = t >= wrong;
  const lab = [], leaders = [0, 1];
  top.forEach((d, i) => {
    const h = 0.04 + BH * q[i], x = BX(i), lead = i < 2;
    const col = gone ? COLOR.faint : lead ? RED : COLOR.dim;
    ctx.line([[x, 0, 0], [x, h, 0]], { color: col, width: lead ? 18 : 12, alpha: gone ? 0.6 : 0.9, glow: lead && !gone ? 12 : 0, persp: ref, intensity: 0.9 });
    if (!lead) lab.push({ p: [x, -0.15, 0], id: d.w, text: d.w, priority: NBAR - i, o: { font: 'mono', size: 14, minSize: 13, maxSize: 15, color: gone ? COLOR.faint : COLOR.dim, ref, backing: 0.85 } });
    if (lead && !gone) ctx.text3D(`${Math.round(q[i] * 100)}%`, [x, h + 0.25, 0], { font: 'mono', size: 18, minSize: 16, maxSize: 20, align: 'center', color: RED, ref });
  });
  ctx.line([[BX(0) - 0.6, 0, 0], [BX(NBAR - 1) + 1.6, 0, 0]], { color: COLOR.dim, width: 1.4, persp: ref });
  // the two leaders' words under their bars, back to back: god ends under its bar, satisfaction starts under its own
  // (struck through when the sung word turns out to be another)
  const c2 = ctx.cam, c3 = ctx.cam3;
  const o = { font: 'monoBold', size: 20 };
  const boxes = leaders.map((i) => {
    const s = ctx.project([BX(i), 0, 0]), word = top[i].w, ww = ctx.measure(word, o);
    return { s: [s[0] + (i === 0 ? 10 - ww / 2 : ww / 2 - 10), s[1]], word, ww, wy: s[1] + 34 };
  });
  ctx.camera2D();
  for (const { s, word, ww, wy } of boxes) {
    ctx.rect(s[0] - ww / 2 - 6, wy - 20, ww + 12, 28, { fill: [0, 0, 0, 0.7], radius: 3 });
    ctx.text(word, s[0], wy, { ...o, align: 'center', color: gone ? COLOR.dim : RED });
    if (gone) ctx.line([[s[0] - ww / 2 - 4, wy - 7], [s[0] - ww / 2 - 4 + (ww + 8) * clamp((t - wrong) / T.beats(0.2)), wy - 7]], { color: COLOR.dim, width: 2.4 });
  }
  ctx.cam = c2; ctx.cam3 = c3;
  labels3D(ctx, lab, { obstacles: [...obstacles, ...boxes.map(({ s, ww, wy }) => ({ rect: [s[0] - ww / 2 - 10, wy - 24, s[0] + ww / 2 + 10, wy + 10] }))] });
}
