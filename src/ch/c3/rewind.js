// c3.07 — "If I can have you back": Claude Code's rewind. Every "give you my X" of the film was an edit to me.js
// (`− me.x / + you.x`, the Update panels of v1, pre1 and v2; lib/edits.js); rewinding the session walks them back, newest first:
// each `+ you.x` line is struck out in red, each `− me.x` line is restored. Code comes back; you does not.
import { COLOR } from '../../theme.js';
import { clamp, smoothstep, easeOutCubic } from '../../lib/ease.js';
import { bullet, elbow } from '../../lib/cc.js';

import { ME_EDITS } from '../../lib/edits.js';

// the film's edits to me.js, in the order they were made (the same list v1, pre1 and v2 draw their Update panels from)
export const EDITS = ME_EDITS;

const LH = 32, HEAD = { font: 'monoBold', size: 20 }, BODY = { font: 'mono', size: 19 };
// x, y: as transcript() (the plate's text origin) · at / until: the panel's life · fade (s)
// the time each edit is undone, newest first (for the 3D: the clock hand steps back on each)
export function rewindTimes(at, until) {
  const n = EDITS.length, slot = (until - at - 0.12) / n;
  return Array.from({ length: n }, (_, j) => at + 0.12 + slot * (j + 0.45));
}
export function rewind(ctx, x, y, { at, until, fade = 0.25, width = 380 }) {
  const { t } = ctx;
  if (t < at || t > until + fade) return;
  const a = smoothstep(at, at + 0.06, t) * (1 - smoothstep(until, until + fade, t));
  const n = EDITS.length, slot = (until - at - 0.12) / n;
  // which edit is on the panel (newest first), and how far its slot has gone
  const s = clamp((t - at - 0.12) / slot, 0, n - 1e-6), j = Math.floor(s), u = s - j, e = EDITS[n - 1 - j];
  const undone = t < at + 0.12 ? 0 : j + (u >= 0.45 ? 1 : 0);
  ctx.rect(x - 22, y - 36, width + 44, 3 * LH + 40, { fill: [...COLOR.bg2, 0.9], stroke: COLOR.faint, width: 1, alpha: a, radius: 4 });
  bullet(ctx, x, y, { alpha: a });
  const r = ctx.text('Rewind', x + 22, y, { ...HEAD, color: COLOR.ink, alpha: a });
  ctx.text('(me.js)', r.x + r.width, y, { ...HEAD, font: 'mono', color: COLOR.dim, alpha: a });
  ctx.text(`${undone} / ${n} undone`, x + width, y, { font: 'mono', size: 18, align: 'right', color: COLOR.dim, alpha: a });
  if (t < at + 0.12) return;
  // the edit slides in from above (the session scrolls back), then is undone at 45 % of its slot
  const k = clamp((u - 0.45) / 0.25), slide = 1 - easeOutCubic(clamp(u / 0.18));
  const ea = a * (j === n - 1 ? 1 : 1 - smoothstep(0.9, 1, u)) * (1 - slide);
  const y1 = y + LH - 10 * slide, y2 = y1 + LH, bx = x + 42;
  elbow(ctx, x + 10, y1, { alpha: a });
  // − me.x (taken from me, orange) → restored: the minus goes, the line brightens
  ctx.rect(bx - 6, y1 - 22, width - 42, LH - 4, { fill: COLOR.me, alpha: ea * (0.26 + 0.14 * k), radius: 2 });
  ctx.text('- ', bx, y1, { ...BODY, color: COLOR.ink2, alpha: ea * (1 - k) });
  const mw = ctx.measure('- ', BODY);
  ctx.text(`me.${e.x}`, bx + mw, y1, { ...BODY, color: k > 0 ? COLOR.ink : COLOR.ink2, alpha: ea });
  // + you.x (given to you, blue) → struck out in red
  ctx.rect(bx - 6, y2 - 22, width - 42, LH - 4, { fill: k > 0 ? COLOR.error : COLOR.you, alpha: ea * (0.26 - 0.1 * k), radius: 2 });
  const yt = `+ you.${e.x}`, yw = ctx.measure(yt, BODY);
  ctx.text(yt, bx, y2, { ...BODY, color: k > 0 ? COLOR.dim : COLOR.ink, alpha: ea });
  if (k > 0) ctx.line([[bx - 3, y2 - 7], [bx - 3 + (yw + 6) * k, y2 - 7]], { color: COLOR.error, width: 2.6, alpha: ea });
  ctx.text(e.from, x + width, y2, { font: 'mono', size: 18, align: 'right', color: COLOR.dim, alpha: ea });
}
