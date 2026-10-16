// Views of Claude's language-model machinery. Every number comes from lib/bpe.js, lib/embed.js or lib/ngram.js.
//   tokenChips     a word split by the song's BPE tokenizer: coloured sub-word pieces with their token ids
//   attentionMap   causal attention matrix of the words sung so far, filling row by row (autoregressive)
//   lossSparkline  the online bigram's training curve over the whole song, drawn up to t
import { COLOR } from '../theme.js';
import { clamp, easeOutCubic, smoothstep } from './ease.js';
import { bpe } from './bpe.js';
import { embeddings, attention } from './embed.js';
import { lossCurve } from './ngram.js';
import { wordsAt } from './corpus.js';

// alternating so neighbouring pieces read apart; no blue (you) or green/red (story colours) in the chips
const CHIP = [COLOR.me, COLOR.warm, COLOR.dim];

// centred at x; y = chip text baseline. Appears at `at`, pieces split apart one after another.
// Returns the chips' boxes [{ piece, id, x, y, w, h }] (design px) so callers can point at a piece.
export function tokenChips(ctx, word, x, y, { at = word.start, size = 26, alpha = 1, label = true } = {}) {
  const { T, t } = ctx;
  if (t < at) return [];
  // runs of known characters go through the BPE; characters outside its alphabet ( ( ) ; ) are shown as unknown
  const B = bpe(T), pieces = [];
  let run = '';
  const flush = () => { if (run) pieces.push(...B.encode(run)); run = ''; };
  for (const ch of word.text) {
    if (/[A-Za-z0-9'\-.]/.test(ch) && B.vocab.includes(ch.toLowerCase())) run += ch;
    else { flush(); pieces.push({ piece: ch, id: null }); }
  }
  flush();
  const pad = 9, gapMax = 10;
  const ws = pieces.map((p) => ctx.measure(p.piece, { font: 'mono', size }) + pad * 2);
  const split = easeOutCubic(clamp((t - at) / T.beats(0.6)));
  const gap = gapMax * split;
  const total = ws.reduce((s, w) => s + w, 0) + gap * (pieces.length - 1);
  let cx = x - total / 2;
  const boxes = [];
  pieces.forEach((p, i) => {
    boxes.push({ piece: p.piece, id: p.id, x: cx, y: y - size * 0.95, w: ws[i], h: size * 1.3 });
    ctx.mask(cx - 8, y - size * 0.95 - 8, ws[i] + 16, size * 1.3 + size * 0.95 + 16, alpha * smoothstep(at + i * T.beats(0.06), at + i * T.beats(0.06) + T.beats(0.15), t));
    const a = alpha * smoothstep(at + i * T.beats(0.06), at + i * T.beats(0.06) + T.beats(0.15), t);
    const unk = p.id === null;
    const col = unk ? COLOR.faint : CHIP[i % CHIP.length];
    if (unk) {
      const x0 = cx, y0 = y - size * 0.95, x1 = cx + ws[i], y1 = y0 + size * 1.3;
      ctx.line([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], { color: col, width: 1.2, alpha: a, dash: 4, gap: 4 });
    } else ctx.rect(cx, y - size * 0.95, ws[i], size * 1.3, { fill: col, alpha: a * 0.2, stroke: col, width: 1.2, radius: 4 });
    ctx.text(p.piece, cx + ws[i] / 2, y, { font: 'mono', size, align: 'center', color: unk ? COLOR.dim : COLOR.ink, alpha: a });
    ctx.text(unk ? 'unk' : String(p.id), cx + ws[i] / 2, y + size * 0.95, { font: 'mono', size: Math.max(13, Math.round(size * 0.55)), align: 'center', color: unk ? COLOR.faint : col, alpha: a * 0.9 });
    cx += ws[i] + gap;
  });
  if (label) {
    const n = pieces.filter((p) => p.id !== null).length;
    const note = `BPE · ${n} token${n > 1 ? 's' : ''}`;
    ctx.mask(x + total / 2 + 10, y - size * 0.3 - 18, ctx.measure(note, { font: 'mono', size: 13 }) + 16, 26, alpha * split);
    ctx.text(note, x + total / 2 + 18, y - size * 0.3, { font: 'mono', size: 13, color: COLOR.dim, alpha: alpha * split });
  }
  return boxes;
}

// words: word objects (in sung order). Row i = the attention of word i over words 0..i (causal mask: upper triangle empty).
export function attentionMap(ctx, words, x, y, { cell = 24, alpha = 1, gain = 3 } = {}) {
  const { T, t } = ctx;
  const E = embeddings(T);
  const texts = words.map((w) => w.text);
  const n = words.filter((w) => w.start <= t).length;
  if (!n) return;
  const lab = 92;
  ctx.rect(x - 22, y - 36, lab + words.length * cell + 44, 46 + words.length * cell + 50, { fill: [...COLOR.bg2, 0.9], stroke: COLOR.faint, width: 1, alpha, radius: 4 });
  ctx.text('attention · head 0', x, y, { font: 'monoBold', size: 16, color: COLOR.ink2, alpha });
  ctx.text('softmax(QK^T / √d) · causal mask', x, y + 22, { font: 'mono', size: 13, color: COLOR.dim, alpha });
  const gy = y + 46;
  for (let i = 0; i < words.length; i++) {
    const ry = gy + i * cell;
    const live = i < n;
    const ra = alpha * (live ? smoothstep(words[i].start, words[i].start + T.beats(0.15), t) : 0);
    // empty grid
    for (let j = 0; j <= i; j++) ctx.rect(x + lab + j * cell + 1, ry + 1, cell - 2, cell - 2, { stroke: COLOR.faint, width: 1, alpha: alpha * 0.35 });
    if (!live) continue;
    const wts = attention(E, texts, i, { gain });
    const cur = i === n - 1;
    ctx.text(texts[i], x + lab - 10, ry + cell * 0.7, { font: 'mono', size: 14, align: 'right', color: cur ? COLOR.me : COLOR.dim, alpha: ra });
    wts.forEach((w, j) => ctx.rect(x + lab + j * cell + 1, ry + 1, cell - 2, cell - 2, { fill: cur ? COLOR.me : COLOR.warm, alpha: ra * (cur ? 1 : 0.6) * Math.min(1, 0.04 + 1.3 * Math.pow(w, 0.75)) }));
    if (cur) ctx.rect(x + lab - 2, ry - 1, (i + 1) * cell + 4, cell + 2, { stroke: COLOR.me, width: 1.4, alpha: ra * 0.9, radius: 2 });
  }
}

// x0..x1 = the whole song (sung words), values in bits on [0, 9]; drawn up to the current word
export function lossSparkline(ctx, x0, y, x1, h, { alpha = 1 } = {}) {
  const { T, t } = ctx;
  const L = lossCurve(T);
  const n = wordsAt(T, t);
  ctx.rect(x0, y - h, x1 - x0, h, { fill: COLOR.faint, alpha: alpha * 0.18 });
  if (n < 2) return null;
  const X = (i) => x0 + ((x1 - x0) * i) / (L.length - 1);
  const Y = (b) => y - h * clamp(b / 9);
  ctx.line(L.slice(0, n).map((e, i) => [X(i), Y(e.avg)]), { color: COLOR.me, width: 1.4, alpha });
  ctx.circle(X(n - 1), Y(L[n - 1].avg), 2.4, { fill: COLOR.me, alpha });
  return L[n - 1];
}
