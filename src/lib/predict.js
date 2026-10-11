// Next-token prediction panel. When `prev` is sung, Claude's online bigram model (lib/ngram.js — trained only on
// the words heard so far) shows what it expects next. When the real word is sung it is revealed with its
// probability and surprisal (−log2 p): early in the song the model is usually wrong — it is learning the world.
import { COLOR } from '../theme.js';
import { bigramUntil } from './ngram.js';
import { clamp, easeOutCubic, smoothstep } from './ease.js';
import { spinner } from './cc.js';

const memo = new Map();

// Compact on purpose (reading budget, CLAUDE.md §4): a header, ≤3 candidates with bars, one status line.
// The sung word itself is not repeated here (the hero keyword already shows it) — only the verdict.
// o: { x, y (top-left), prev: word object, next: word object, width }
export function drawPrediction(ctx, { x, y, prev, next, width = 340, k = 3 }) {
  const { T, t } = ctx;
  if (t < prev.start) return;
  const key = `${prev.start}`;
  if (!memo.has(key)) {
    const m = bigramUntil(T, next.start);
    memo.set(key, { cands: m.next(prev.text, k), pNext: m.p(prev.text, next.text), seen: m.seen(next.text) });
  }
  const { cands, pNext, seen } = memo.get(key);
  const fadeOut = 1 - smoothstep(next.start + T.beats(1.25), next.start + T.beats(1.75), t);
  const a = smoothstep(prev.start, prev.start + T.beats(0.2), t) * fadeOut;
  if (a <= 0.003) return;
  const locked = t >= next.start;
  const lockE = easeOutCubic(clamp((t - next.start) / T.beats(0.3)));
  const rows = Math.max(cands.length, 1);
  const RH = 40;
  ctx.rect(x - 24, y - 46, width + 48, 66 + rows * RH + 58, { fill: [...COLOR.bg2, 0.9], stroke: COLOR.faint, width: 1, alpha: a, radius: 4 });
  const hr = ctx.text('next token after ', x, y - 10, { font: 'mono', size: 18, color: COLOR.dim, alpha: a });
  ctx.text(`"${prev.text.toLowerCase()}"`, hr.x + hr.width, y - 10, { font: 'monoBold', size: 18, color: COLOR.ink, alpha: a });
  const barX = x + 190, barW = width - 250;
  if (!cands.length) ctx.text('no data yet', x, y + 40, { font: 'mono', size: 20, color: COLOR.dim, alpha: a });
  cands.forEach((c, i) => {
    const yy = y + 40 + i * RH;
    const grow = easeOutCubic(clamp((t - prev.start - i * T.beats(0.05)) / T.beats(0.3)));
    const hit = c.word.toUpperCase() === next.text.toUpperCase();
    const fade = locked && !hit ? 1 - 0.5 * lockE : 1;
    const col = locked ? (hit ? COLOR.me : COLOR.error) : COLOR.ink;
    ctx.text(c.word.toLowerCase(), x, yy, { font: 'mono', size: 22, color: col, alpha: a * fade });
    ctx.rect(barX, yy - 15, Math.max(3, barW * c.p * grow), 16, { fill: col, alpha: a * fade * 0.85 });
    ctx.text(`${Math.round(c.p * 100)}%`, x + width, yy, { font: 'mono', size: 18, align: 'right', color: COLOR.dim, alpha: a * fade });
    if (locked && !hit) ctx.line([[x - 4, yy - 8], [x + ctx.measure(c.word, { font: 'mono', size: 22 }) + 4, yy - 8]], { color: COLOR.error, width: 2.4, alpha: a * lockE });
  });
  const yy = y + 40 + rows * RH + 14;
  ctx.line([[x, yy - 30], [x + width, yy - 30]], { color: COLOR.faint, width: 1, alpha: a });
  if (locked) {
    const bits = -Math.log2(pNext);
    ctx.text(seen ? `p ${Math.round(pNext * 100)}% · ${bits.toFixed(1)} bits` : `new token · ${bits.toFixed(1)} bits`, x, yy, { font: 'monoBold', size: 20, color: seen ? COLOR.me : COLOR.error, alpha: a * lockE });
  } else {
    // Claude Code's spinner while the next token is pending
    spinner(ctx, x + 9, yy - 7, { alpha: a });
    ctx.text('Predicting…', x + 30, yy, { font: 'mono', size: 20, color: COLOR.me, alpha: a });
  }
}
