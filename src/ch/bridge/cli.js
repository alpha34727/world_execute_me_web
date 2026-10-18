// The bridge happens inside a Claude Code session: the bottom of the frame is the CLI. From the bottom up —
//   status line   ? for shortcuts · · · Context left until auto-compact: NN%   (real: 1 − context / 617)
//   input box     the lyrics console (lib/console.js), unchanged
//   spinner line  ✻ <verb>… (seconds · ↑ context tokens · esc to interrupt) — me at work, real numbers
//   transcript    the session's last entries, newest just above the spinner, older ones dimmed and scrolled up
// Everything is drawn on the overlay (crisp, after post); the symbols are shapes (cc.js), not glyphs.
import { COLOR } from '../../theme.js';
import { clamp, smoothstep } from '../../lib/ease.js';
import { bullet, elbow, spinner, thinking } from '../../lib/cc.js';
import { bpe } from '../../lib/bpe.js';

export const LH = 32, X = 72;
export const SPIN_Y = 896, STACK_BOTTOM = 846;
const BODY = { font: 'mono', size: 19 };
const HEAD = { font: 'monoBold', size: 20 };
export const typed = (s, t, t0, cps = 60) => s.slice(0, Math.max(0, Math.floor((t - t0) * cps)));

// a red ✗, drawn
export const cross = (ctx, x, y, a) => { ctx.line([[x, y - 13], [x + 10, y - 3]], { color: COLOR.error, width: 2.2, alpha: a }); ctx.line([[x + 10, y - 13], [x, y - 3]], { color: COLOR.error, width: 2.2, alpha: a }); };

// status line under the input box
export function statusLine(ctx, n, { alpha = 1 } = {}) {
  const left = Math.max(0, Math.round(100 * (1 - n / bpe(ctx.T).total)));
  ctx.text('? for shortcuts', X, 1071, { font: 'mono', size: 14, color: COLOR.faint, alpha });
  ctx.text(`Context left until auto-compact: ${left}%`, 1848, 1071, { font: 'mono', size: 14, align: 'right', color: left < 30 ? COLOR.me : COLOR.dim, alpha });
}

// spinner line: me working (Claude Code's thinking line), or a named task (Compacting conversation…)
export function spinLine(ctx, { from, tokens, task = null, tail = null, alpha = 1 }) {
  const { t } = ctx;
  if (!task) { thinking(ctx, X, SPIN_Y, { from, tokens, alpha, seed: 9 }); return; }
  const o = { font: 'mono', size: 20 }, label = `${task}…`, rest = tail ?? '';
  const wv = ctx.measure(label, { ...o, font: 'monoBold' }), wt = ctx.measure(rest, o);
  ctx.rect(X - 14, SPIN_Y - 26, 30 + wv + wt + 28, 38, { fill: [...COLOR.bg, 0.78], radius: 6, alpha });
  spinner(ctx, X + 9, SPIN_Y - 7, { alpha });
  ctx.text(label, X + 30, SPIN_Y, { ...o, font: 'monoBold', color: COLOR.me, alpha });
  ctx.text(rest, X + 30 + wv, SPIN_Y, { ...o, color: COLOR.dim, alpha });
  void t;
}

// One transcript entry: rows from the top —
//   { kind: 'input', text }                         > text           (a command typed into the session)
//   { kind: 'head', name, arg, color }               ⏺ Name(arg)
//   { kind: 'body', segs: [[text, color]], at, bg, mark: 'x' }   ⎿ text  (first body row gets the elbow)
// at: when the entry appears; rows with their own `at` appear then. Returns the rows visible at t.
const visibleRows = (e, t) => e.rows.filter((r) => t >= (r.at ?? e.at));

// entries: [{ at, rows, width }] in time order. The newest visible entry sits just above the spinner line, full
// strength; the one before it dims to 0.3, scrolled up; older ones are gone.
// Returns the screen box of the whole stack (for 3D content to stay out from behind).
export function transcript(ctx, entries, { alpha = 1, width = 700 } = {}) {
  const { t } = ctx;
  const vis = entries.filter((e) => t >= e.at).slice(-2);
  if (!vis.length) return null;
  const heights = vis.map((e) => visibleRows(e, t).length * LH);
  const gap = 18;
  const total = heights.reduce((s, h) => s + h, 0) + gap * (vis.length - 1);
  const top = STACK_BOTTOM - total + LH;
  // the terminal's background behind the stack (no border: the CLI has none)
  const na = alpha * smoothstep(vis.at(-1).at, vis.at(-1).at + 0.06, t);
  // feathered: a few widening layers fade the box into the scene instead of a hard edge
  const ba = Math.max(na, vis.length > 1 ? alpha : 0);
  for (let f = 4; f >= 1; f--) ctx.rect(X - 22 - f * 10, top - 34 - f * 10, width + 44 + f * 20, total + 26 + f * 20, { fill: [...COLOR.bg, 0.22], radius: 6 + f * 10, alpha: ba });
  ctx.rect(X - 22, top - 34, width + 44, total + 26, { fill: [...COLOR.bg, 0.95], radius: 6, alpha: ba });
  let y = top;
  vis.forEach((e, k) => {
    const age = vis.length - 1 - k;
    const a = alpha * [1, 0.3][age] * smoothstep(e.at, e.at + 0.06, t);
    let firstBody = true;
    for (const r of visibleRows(e, t)) {
      if (r.kind === 'input') {
        ctx.text('>', X, y, { ...BODY, color: COLOR.dim, alpha: a });
        const tr = ctx.text(r.text, X + 22, y, { ...BODY, color: COLOR.ink2, alpha: a });
        if (r.cursor) ctx.rect(tr.x + tr.width + 3, y - 18, 11, 22, { fill: COLOR.me, alpha: a });
      } else if (r.kind === 'head') {
        bullet(ctx, X, y, { color: r.color ?? COLOR.me, alpha: a });
        const h = ctx.text(r.name, X + 22, y, { ...HEAD, color: COLOR.ink, alpha: a });
        ctx.text(`(${r.arg})`, h.x + h.width, y, { ...HEAD, font: 'mono', color: COLOR.dim, alpha: a });
      } else {
        if (firstBody) elbow(ctx, X + 10, y, { alpha: a });
        firstBody = false;
        let x = X + 42;
        if (r.bg) ctx.rect(x - 6, y - 22, r.bgW ?? width - 42, LH - 4, { fill: r.bg, alpha: a * (r.bgA ?? 0.24), radius: 2 });
        if (r.mark === 'x') { cross(ctx, x, y, a); x += 20; }
        if (r.draw) r.draw(ctx, x, y, a);
        else for (const [s, col] of r.segs) { const q = ctx.text(s, x, y, { ...BODY, color: col, alpha: a }); x += q.width; }
      }
      y += LH;
    }
    y += gap;
  });
  return [X - 22, top - 34, X + width + 22, top - 34 + total + 26];
}

export { clamp };
