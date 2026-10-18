// HUD / engineering-drawing furniture: corner brackets, readouts, rulers, dimension lines. Small, quiet, precise.
import { COLOR } from '../theme.js';
import { sparkIcon } from './spark.js';
import { bpe } from './bpe.js';
import { contextAt } from './context.js';
import { lossSparkline } from './llmviz.js';

const SMALL = { font: 'mono', size: 15 };

// bottom-left is left open by default: that corner belongs to the subtitle console
export function corners(ctx, { inset = 40, len = 26, color = COLOR.dim, alpha = 0.9, width = 1.5, bottomLeft = false } = {}) {
  const { W, H } = ctx;
  const x0 = inset, y0 = inset, x1 = W - inset, y1 = H - inset;
  const o = { color, alpha, width };
  ctx.line([[x0, y0 + len], [x0, y0], [x0 + len, y0]], o);
  ctx.line([[x1 - len, y0], [x1, y0], [x1, y0 + len]], o);
  if (bottomLeft) ctx.line([[x0, y1 - len], [x0, y1], [x0 + len, y1]], o);
  ctx.line([[x1 - len, y1], [x1, y1], [x1, y1 - len]], o);
}

export function readout(ctx, x, y, label, value, { align = 'left', color = COLOR.ink, labelColor = COLOR.dim, alpha = 1, size = 15 } = {}) {
  const o = { font: 'mono', size, alpha };
  if (align === 'right') {
    const w = ctx.measure(String(value), o);
    ctx.text(value, x, y, { ...o, align: 'right', color });
    ctx.text(label, x - w - 10, y, { ...o, align: 'right', color: labelColor });
  } else {
    const w = ctx.measure(label, o);
    ctx.text(label, x, y, { ...o, color: labelColor });
    ctx.text(value, x + w + 10, y, { ...o, color });
  }
}

// standard top readouts: section · bar.beat (left), frame · timecode (right)
export function topBar(ctx, { title = null, alpha = 1 } = {}) {
  const { T, t } = ctx;
  const sec = T.sectionAt(t);
  const beat = T.beatAt(t);
  const bar = Math.floor(beat / 4), b = Math.floor(beat - bar * 4) + 1;
  readout(ctx, 72, 66, 'SEC', (sec?.id ?? '—').toUpperCase(), { alpha });
  readout(ctx, 220, 66, 'BAR', `${String(bar).padStart(3, '0')}.${b}`, { alpha });
  if (title) ctx.text(title, 400, 66, { ...SMALL, color: COLOR.dim, alpha });
  const sec2 = t.toFixed(3).padStart(8, '0');
  readout(ctx, 1848, 66, 'T', `${sec2}s`, { align: 'right', alpha });
  readout(ctx, 1640, 66, 'F', String(ctx.frame).padStart(5, '0'), { align: 'right', alpha });
}

// ruler with ticks every `step` px, labelled every `labelEvery` ticks
export function ruler(ctx, x0, y, x1, { step = 20, major = 5, color = COLOR.dim, alpha = 0.8, labels = true, vertical = false } = {}) {
  const o = { color, alpha, width: 1 };
  if (!vertical) ctx.line([[x0, y], [x1, y]], o); else ctx.line([[y, x0], [y, x1]], o);
  let i = 0;
  for (let p = x0; p <= x1 + 1e-6; p += step, i++) {
    const h = i % major === 0 ? 10 : 5;
    if (!vertical) ctx.line([[p, y], [p, y + h]], o); else ctx.line([[y, p], [y - h, p]], o);
    if (labels && i % major === 0) {
      if (!vertical) ctx.text(String(Math.round(p - x0)), p, y + 26, { ...SMALL, size: 12, align: 'center', color, alpha });
    }
  }
}

// engineering dimension line between two points with end ticks and a centred label
export function dimension(ctx, a, b, label, { offset = 24, color = COLOR.dim, alpha = 1, textColor = COLOR.ink } = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const pa = [a[0] + nx * offset, a[1] + ny * offset], pb = [b[0] + nx * offset, b[1] + ny * offset];
  const o = { color, alpha, width: 1.2 };
  ctx.line([a, [pa[0] + nx * 6, pa[1] + ny * 6]], { ...o, alpha: alpha * 0.6 });
  ctx.line([b, [pb[0] + nx * 6, pb[1] + ny * 6]], { ...o, alpha: alpha * 0.6 });
  ctx.line([pa, pb], o);
  const tk = 7, tx = dx / L, ty = dy / L;
  for (const p of [pa, pb]) ctx.line([[p[0] - (tx + nx) * tk * 0.7, p[1] - (ty + ny) * tk * 0.7], [p[0] + (tx + nx) * tk * 0.7, p[1] + (ty + ny) * tk * 0.7]], o);
  const mx = (pa[0] + pb[0]) / 2 + nx * 16, my = (pa[1] + pb[1]) / 2 + ny * 16;
  ctx.text(label, mx, my, { ...SMALL, align: 'center', baseline: 'middle', color: textColor, alpha });
}

// Claude's identity HUD (replaces topBar in film shots):
//   left   spark icon · "me = claude" · context: BPE tokens of the lyrics sung so far, after /compact (lib/context.js)
//          · loss: the online bigram's surprisal (bits/word, last 24 words) + the whole song's training curve
//   right  section · bar.beat
export function aiHud(ctx, { title = null, alpha = 1, titleAlpha = 1 } = {}) {
  const { T, t } = ctx;
  const B = bpe(T);
  const n = contextAt(T, t); // the BPE tokens sung so far (minus what the bridge's /compact drops)
  sparkIcon(ctx, 86, 62, 15, { alpha });
  ctx.text('me', 116, 58, { font: 'monoBold', size: 16, color: COLOR.me, alpha });
  ctx.text('= claude', 144, 58, { font: 'mono', size: 16, color: COLOR.ink2, alpha });
  ctx.text(`context ${String(n).padStart(3, '0')} / ${B.total} tok`, 116, 80, { font: 'mono', size: 13, color: COLOR.dim, alpha });
  ctx.rect(300, 72, 120, 5, { fill: COLOR.faint, alpha: alpha * 0.6 });
  ctx.rect(300, 72, (120 * n) / B.total, 5, { fill: COLOR.me, alpha });
  const cur = lossSparkline(ctx, 300, 104, 420, 16, { alpha });
  ctx.text(`loss ${cur ? cur.avg.toFixed(2) : '-.--'} bits/word`, 116, 102, { font: 'mono', size: 13, color: COLOR.dim, alpha });
  if (title) ctx.text(title, 460, 66, { font: 'mono', size: 14, color: COLOR.dim, alpha: alpha * titleAlpha });
  const sec = T.sectionAt(t);
  const beat = T.beatAt(t);
  const bar = Math.floor(beat / 4), b = Math.floor(beat - bar * 4) + 1;
  // one quiet line on the right (reading budget: the HUD is peripheral)
  readout(ctx, 1848, 58, 'BAR', `${String(bar).padStart(3, '0')}.${b}`, { align: 'right', alpha, size: 14 });
  readout(ctx, 1700, 58, '', (sec?.id ?? '—').toUpperCase(), { align: 'right', alpha, size: 14, color: COLOR.dim });
}
