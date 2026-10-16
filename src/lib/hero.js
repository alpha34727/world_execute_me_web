// Hero keyword (the uppercase lyrics are the main typography): invisible before the sung frame (word.start), lands
// with a fast scale/alpha settle and an underline; then the song's BPE tokenizer splits it (tokenChips).
import { COLOR } from '../theme.js';
import { clamp, easeOutExpo } from './ease.js';
import { tokenChips } from './llmviz.js';

// o: { size, color, chips (true), align ('center' | 'left' | 'right'), alpha }
export function hero(ctx, word, x, y, { size = 120, color = COLOR.me, chips = true, align = 'center', alpha = 1 } = {}) {
  const dt = ctx.t - word.start;
  if (dt < 0) return null;
  const e = easeOutExpo(clamp(dt / ctx.T.beats(0.5)));
  const o = { font: 'display', size, tracking: 0.06 };
  const w = ctx.measure(word.text, o);
  const cx = align === 'center' ? x : align === 'left' ? x + w / 2 : x - w / 2;
  ctx.mask(cx - w / 2 - 14, y - size * 0.62, w + 28, size * 1.3, alpha * clamp(0.6 + dt * 30)); // nothing behind the word strikes it through
  ctx.text(word.text, cx, y, { ...o, size: size * (1.1 - 0.1 * e), align: 'center', baseline: 'middle', color, alpha: alpha * clamp(0.6 + dt * 30), glow: 16, glowStrength: 0.3 * (1 - e) + 0.12, intensity: 0.92 });
  ctx.line([[cx - (w / 2) * e, y + size * 0.62], [cx + (w / 2) * e, y + size * 0.62]], { color, width: 2, alpha: alpha * 0.7 * e });
  const boxes = chips ? tokenChips(ctx, word, cx, y + size * 0.62 + 48, { at: word.start + ctx.T.beats(0.5), size: 22, alpha }) : [];
  return { x: cx - w / 2, width: w, chips: boxes };
}
