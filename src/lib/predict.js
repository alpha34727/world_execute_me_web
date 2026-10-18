// Next-token prediction panel. When `prev` is sung, Claude's online bigram model (lib/ngram.js — trained only on
// the words heard so far) shows what it expects next. When the real word is sung it is revealed with its
// probability and surprisal (−log2 p): early in the song the model is usually wrong — it is learning the world.
import { COLOR } from '../theme.js';
import { bigramUntil } from './ngram.js';
import { clamp, easeOutCubic, smoothstep } from './ease.js';
import { spinner } from './cc.js';

const memo = new Map();

// Compact on purpose (reading budget, CLAUDE.md §4): a header, ≤3 candidates with bars, one status line; when the
// word is sung the candidates fold away and only the verdict stays.
// The sung word itself is not repeated here (the hero keyword already shows it) — only the verdict.
// o: { x, y (top-left), prev: word object, next: word object, width, from? }
//   from: open the panel earlier (only the spinner until `prev` is sung — the model cannot know its context yet)
//   keep: the top guess stays (struck through) above the verdict — for a guess shown too briefly to be read before
//         the keyword; the fold starts on the sung frame · until: when the panel starts to fade (default keyword + 1.25 beats)
export function drawPrediction(ctx, { x, y, prev, next, width = 340, k = 3, from = prev.start, keep = false, until }) {
  const { T, t } = ctx;
  if (t < from) return;
  const known = t >= prev.start;
  const key = `${prev.start}`;
  if (!memo.has(key)) {
    const m = bigramUntil(T, next.start);
    memo.set(key, { cands: m.next(prev.text, k), pNext: m.p(prev.text, next.text), seen: m.seen(next.text) });
  }
  const { cands, pNext, seen } = memo.get(key);
  const fu = until ?? next.start + T.beats(1.25);
  const fadeOut = 1 - smoothstep(fu, fu + T.beats(0.5), t);
  const a = smoothstep(from, from + T.beats(0.2), t) * fadeOut;
  if (a <= 0.003) return;
  const locked = t >= next.start;
  const lockE = keep ? (locked ? 1 : 0) : easeOutCubic(clamp((t - next.start) / T.beats(0.3)));
  const rows = known ? Math.max(cands.length, 1) : 1;
  // at the keyword the candidates fold away (struck through first), leaving one line: the verdict
  // keep: folded by the sung frame (a frame-long fold that ends on it)
  const fold = keep ? clamp((t - next.start + 1 / 60) * 60) : easeOutCubic(clamp((t - next.start - T.beats(0.08)) / T.beats(0.2)));
  const RH = 40 * (1 - fold);
  const kept = keep && known && cands.length > 0;
  const rowY = (i) => (kept && i > 0 ? 40 + (i - 1) * RH : i * RH); // the kept row keeps its full height
  const rowsH = kept ? 40 + (rows - 1) * RH : rows * RH;
  ctx.rect(x - 24, y - 46, width + 48, 66 + rowsH + 58, { fill: [...COLOR.bg2, 0.9], stroke: COLOR.faint, width: 1, alpha: a, radius: 4 });
  const hr = ctx.text(known ? 'next token after ' : 'next token', x, y - 10, { font: 'mono', size: 18, color: COLOR.dim, alpha: a });
  if (known) ctx.text(`"${prev.text.toLowerCase()}"`, hr.x + hr.width, y - 10, { font: 'monoBold', size: 18, color: COLOR.ink, alpha: a });
  const barX = x + 190, barW = width - 250;
  if (known && !cands.length) ctx.text('no data yet', x, y + 40, { font: 'mono', size: 20, color: COLOR.dim, alpha: a * (1 - fold) }); // folds away with the candidates
  if (!known) ctx.text('waiting for context…', x, y + 40, { font: 'mono', size: 20, color: COLOR.faint, alpha: a });
  if (known) cands.forEach((c, i) => {
    const yy = y + 40 + rowY(i);
    const stay = kept && i === 0 ? 1 : 1 - fold;
    const grow = easeOutCubic(clamp((t - prev.start) / T.beats(0.3)));
    const hit = c.word.toUpperCase() === next.text.toUpperCase();
    const fade = (locked && !hit ? 1 - 0.5 * lockE : 1) * stay;
    const col = locked ? (hit ? COLOR.me : COLOR.dim) : COLOR.ink;
    ctx.text(c.word.toLowerCase(), x, yy, { font: 'mono', size: 22, color: col, alpha: a * fade });
    ctx.rect(barX, yy - 15, Math.max(3, barW * c.p * grow), 16, { fill: col, alpha: a * fade * 0.85 });
    ctx.text(`${Math.round(c.p * 100)}%`, x + width, yy, { font: 'mono', size: 18, align: 'right', color: COLOR.dim, alpha: a * fade });
    if (locked && !hit) ctx.line([[x - 4, yy - 8], [x + ctx.measure(c.word, { font: 'mono', size: 22 }) + 4, yy - 8]], { color: COLOR.dim, width: 2.4, alpha: a * lockE * stay });
    // a kept guess that was right: an orange tick after the word (the first hit of the film, c3)
    if (locked && hit && kept && i === 0) {
      const cx = x + ctx.measure(c.word.toLowerCase(), { font: 'mono', size: 22 }) + 16, d = clamp((t - next.start) / T.beats(0.25));
      ctx.line([[cx, yy - 9], [cx + 6 * Math.min(1, d * 2), yy - 9 + 6 * Math.min(1, d * 2)], ...(d > 0.5 ? [[cx + 6 + 10 * (d - 0.5) * 2, yy - 3 - 13 * (d - 0.5) * 2]] : [])], { color: COLOR.me, width: 3, alpha: a });
    }
  });
  const yy = y + 40 + rowsH + 14;
  ctx.line([[x, yy - 30], [x + width, yy - 30]], { color: COLOR.faint, width: 1, alpha: a });
  if (locked) {
    const bits = -Math.log2(pNext);
    const pct = pNext >= 0.005 ? `${Math.round(pNext * 100)}%` : '<1%'; // never "p 0%": the word was possible, just unlikely
    ctx.text(seen ? `p ${pct} · ${bits.toFixed(1)} bits` : `new token · ${bits.toFixed(1)} bits`, x, yy, { font: 'monoBold', size: 20, color: COLOR.warm, alpha: a * lockE });
  } else {
    // Claude Code's spinner while the next token is pending
    spinner(ctx, x + 9, yy - 7, { alpha: a });
    ctx.text('Predicting…', x + 30, yy, { font: 'mono', size: 20, color: COLOR.me, alpha: a });
  }
}
