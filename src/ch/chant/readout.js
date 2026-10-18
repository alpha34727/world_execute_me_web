// chant — the one number each shot gives the eye: the surprisal of the word just sung (−log2 p under the online
// bigram, lib/ngram.js lossCurve — the same numbers as the HUD's loss), big, with a small bar for every EXECUTION so
// far underneath, so the fall 7.7 → 0.4 bits (the model learning EXECUTION) reads at a glance.
import { COLOR } from '../../theme.js';
import { clamp, easeOutCubic, smoothstep } from '../../lib/ease.js';
import { lossCurve, bigramUntil } from '../../lib/ngram.js';
import { indexOf } from '../../lib/corpus.js';

export const execWord = (T, k) => T.findWord('EXECUTION', k, 'chant');
export const bitsOf = (T, word) => lossCurve(T)[indexOf(T, word)].bits;

const X = 1840, Y = 560; // right edge, baseline of the big number
// caption above, the number, "bits", and the bars (values: [{ bits, cur }])
// color: the number's colour · curColor: the current bar's (love uses rose)
export function readout(ctx, { at, caption, value, unit = 'bits', bars = [], alpha = 1, strike = null, color = COLOR.warm, curColor = COLOR.me }) {
  const { T, t } = ctx;
  if (t < at) return;
  const a = alpha * clamp((t - at) * 30 + 0.6);
  const land = easeOutCubic(clamp((t - at) / T.beats(0.4)));
  const big = { font: 'display', size: 132, tracking: 0.02 }, un = { font: 'mono', size: 28 };
  const wu = ctx.measure(` ${unit}`, un), wn = ctx.measure(value, big);
  const top = Y - 150 - (strike ? 56 : 0), barsH = bars.length ? 96 : 0;
  const wc = Math.max(wn + wu, 340, ctx.measure(caption, { font: 'mono', size: 18 }), strike ? ctx.measure(strike, { font: 'mono', size: 34 }) + 12 : 0);
  ctx.mask(X - wc - 24, top - 20, wc + 48, Y - top + 40 + barsH, a);
  ctx.text(caption, X, Y - 128 - (strike ? 56 : 0), { font: 'mono', size: 18, align: 'right', color: COLOR.dim, alpha: a });
  if (strike) {
    // the model's guess, struck through (grey: wrong guesses are grey, red belongs to breakdown)
    const o = { font: 'mono', size: 34 };
    const w = ctx.measure(strike, o);
    ctx.text(strike, X, Y - 120, { ...o, align: 'right', color: COLOR.dim, alpha: a });
    ctx.line([[X - w - 6, Y - 131], [X - w - 6 + (w + 12) * smoothstep(at + T.beats(0.1), at + T.beats(0.35), t), Y - 131]], { color: COLOR.dim, width: 3, alpha: a });
  }
  ctx.text(unit ? ` ${unit}` : '', X, Y, { ...un, align: 'right', color: COLOR.dim, alpha: a });
  ctx.text(value, X - wu, Y + 6 * (1 - land), { ...big, align: 'right', color, alpha: a, intensity: 0.9 });
  if (!bars.length) return;
  const bw = 14, gap = 8, x0 = X - bars.length * (bw + gap) + gap, base = Y + 92, max = Math.max(8.2, ...bars.map((b) => b.bits));
  bars.forEach((b, i) => {
    const h = Math.max(2, (b.bits / max) * 64) * (b.cur ? land : 1);
    ctx.rect(x0 + i * (bw + gap), base - h, bw, h, { fill: b.cur ? curColor : COLOR.dim, alpha: a * (b.cur ? 1 : 0.6) });
  });
  ctx.line([[x0 - 4, base + 1], [X, base + 1]], { color: COLOR.faint, width: 1, alpha: a });
}

// EIN: what the model expected after the last EXECUTION (top guess, p), from the model trained before EIN
export function einGuess(T) {
  const ein = T.findWord('EIN', 0, 'chant');
  const m = bigramUntil(T, ein.start);
  const top = m.next('EXECUTION', 1)[0];
  return { word: top.word.toLowerCase(), p: top.p, bits: bitsOf(T, ein) };
}
