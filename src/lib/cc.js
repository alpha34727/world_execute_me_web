// Claude Code's terminal vocabulary — Claude at work, on screen. Tool calls (● Update(me.js) ⎿ diff), the todo list
// (☐ / ☒ with strikethrough), the ✻ spinner, the prompt box. The symbols are drawn procedurally (no glyph fonts):
// ● bullet, ⎿ elbow, ☐/☒ boxes and the spinner asterisk are shapes and lines, so they look identical everywhere.
// Everything is a function of t: an entry appears at its `at` time and types itself out at one character per frame.
import { COLOR } from '../theme.js';
import { clamp, smoothstep } from './ease.js';

const LH = 32;                        // line height
const HEAD = { font: 'monoBold', size: 20 };
const BODY = { font: 'mono', size: 19 };
const CPS = 90;                       // typing speed, characters per second

const typed = (s, t, t0) => s.slice(0, Math.max(0, Math.floor((t - t0) * CPS)));

export function bullet(ctx, x, y, { color = COLOR.growth, alpha = 1, r = 5 } = {}) {
  ctx.circle(x + r, y - 7, r, { fill: color, alpha });
}
// ⎿ — the result elbow under a tool call
export function elbow(ctx, x, y, { color = COLOR.faint, alpha = 1 } = {}) {
  ctx.line([[x, y - 22], [x, y - 8], [x + 12, y - 8]], { color, width: 1.6, alpha });
}
export function checkbox(ctx, x, y, done, { color = COLOR.dim, alpha = 1, s = 14 } = {}) {
  ctx.rect(x, y - 6 - s * 0.85, s, s, { stroke: color, width: 1.5, alpha, radius: 2 });
  if (done) {
    const a = x + 3.5, b = x + s - 3.5, c = y - 6 - s * 0.85 + 3.5, d = c + s - 7;
    ctx.line([[a, c], [b, d]], { color, width: 1.6, alpha });
    ctx.line([[a, d], [b, c]], { color, width: 1.6, alpha });
  }
}

// ✻ — the spinner: an asterisk whose arm count and size cycle on 16th notes (Claude Code cycles · ✢ ✳ ✶ ✻ ✽)
export function spinner(ctx, x, y, { r = 9, color = COLOR.me, alpha = 1 } = {}) {
  const { T, t } = ctx;
  const steps = [[0, 0.25], [4, 0.75], [6, 0.85], [6, 1], [8, 1], [10, 0.9]];
  const k = Math.floor(T.beatAt(t) * 4);
  const ph = k % 10, [arms, size] = steps[ph < 6 ? ph : 10 - ph];
  if (!arms) { ctx.circle(x, y, 2.2, { fill: color, alpha }); return; }
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2 + k * 0.05;
    ctx.line([[x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2], [x + Math.cos(a) * r * size, y + Math.sin(a) * r * size]], { color, width: 2.2, alpha });
  }
}

// ● Name(arg)
//   ⎿  body lines: { text, kind: 'add' | 'del' | 'out' | 'dim', n?: line number }
// returns the height used
export function toolCall(ctx, x, y, { at, name, arg = '', body = [], status = 'ok', alpha = 1, width = 470 }) {
  const { t } = ctx;
  if (t < at) return 0;
  const a = alpha * smoothstep(at, at + 0.06, t);
  const head = `${name}(${arg})`;
  bullet(ctx, x, y, { color: status === 'ok' ? COLOR.growth : status === 'error' ? COLOR.error : COLOR.dim, alpha: a });
  const r = ctx.text(typed(name, t, at), x + 22, y, { ...HEAD, color: COLOR.ink, alpha: a });
  if (head.length > name.length) ctx.text(typed(head, t, at).slice(name.length), r.x + r.width, y, { ...HEAD, font: 'mono', color: COLOR.dim, alpha: a });
  let yy = y + LH;
  body.forEach((b, i) => {
    const t0 = at + (head.length + i * 8) / CPS;
    if (t < t0) return;
    if (i === 0) elbow(ctx, x + 10, yy, { alpha: a });
    const bx = x + 42;
    const prefix = b.kind === 'add' ? '+ ' : b.kind === 'del' ? '- ' : '';
    const num = b.n !== undefined ? String(b.n).padStart(3, ' ') + ' ' : '';
    if (b.kind === 'add' || b.kind === 'del') {
      ctx.rect(bx - 6, yy - 22, width - 42, LH - 4, { fill: b.kind === 'add' ? COLOR.growth : COLOR.error, alpha: a * 0.28, radius: 2 });
    }
    const col = b.kind === 'add' ? COLOR.ink : b.kind === 'del' ? COLOR.ink2 : b.kind === 'dim' ? COLOR.faint : COLOR.dim;
    const nw = num ? ctx.text(num, bx, yy, { ...BODY, color: COLOR.faint, alpha: a }).width : 0;
    ctx.text(typed(prefix + b.text, t, t0), bx + nw, yy, { ...BODY, color: col, alpha: a });
    yy += LH;
  });
  return yy - y;
}

// ● Update Todos
//   ⎿  ☒ done (struck through)   ☐ in progress (bright)   ☐ pending (dim)
// items: [{ text, done: time it gets ticked }]
export function todoList(ctx, x, y, { at, items, alpha = 1 }) {
  const { t } = ctx;
  if (t < at) return 0;
  const a = alpha * smoothstep(at, at + 0.06, t);
  bullet(ctx, x, y, { alpha: a });
  ctx.text(typed('Update Todos', t, at), x + 22, y, { ...HEAD, color: COLOR.ink, alpha: a });
  const active = items.findIndex((it) => t < it.done);
  let yy = y + LH;
  items.forEach((it, i) => {
    const t0 = at + (12 + i * 6) / CPS;
    if (t < t0) return;
    if (i === 0) elbow(ctx, x + 10, yy, { alpha: a });
    const done = t >= it.done;
    const flash = done ? 1 - clamp((t - it.done) / 0.4) : 0;
    const col = done ? COLOR.faint : i === active ? COLOR.ink : COLOR.dim;
    checkbox(ctx, x + 42, yy, done, { color: done ? COLOR.dim : col, alpha: a });
    const r = ctx.text(typed(it.text, t, t0), x + 66, yy, { font: i === active ? 'monoBold' : 'mono', size: 19, color: flash > 0 ? COLOR.growth : col, alpha: a });
    if (done) ctx.line([[x + 64, yy - 6], [x + 66 + r.width * clamp((t - it.done) / 0.15), yy - 6]], { color: COLOR.dim, width: 1.5, alpha: a });
    yy += LH;
  });
  return yy - y;
}

// A floating Claude Code terminal: the entries visible at t ({ kind: 'todo' | 'tool', at, until, ... }) stacked on one
// plate (same plate as the prediction panel). Entries fade out over `fade` s after `until`.
export function transcript(ctx, x, y, entries, { gap = 16, width = 380, alpha = 1, fade = 0.25 } = {}) {
  const { t } = ctx;
  const vis = entries.filter((e) => t >= e.at && t < (e.until ?? Infinity) + fade);
  if (!vis.length) return y;
  const lines = (e) => 1 + (e.kind === 'todo' ? e.items.length : e.body.length);
  const H = vis.reduce((s, e) => s + lines(e) * LH, 0) + gap * (vis.length - 1);
  const ea = (e) => alpha * smoothstep(e.at, e.at + 0.06, t) * (1 - smoothstep(e.until ?? Infinity, (e.until ?? Infinity) + fade, t));
  const pa = Math.max(...vis.map(ea));
  ctx.rect(x - 22, y - 36, width + 44, H + 40, { fill: [...COLOR.bg2, 0.9], stroke: COLOR.faint, width: 1, alpha: pa, radius: 4 });
  let yy = y;
  for (const e of vis) {
    if (e.kind === 'todo') todoList(ctx, x, yy, { ...e, alpha: ea(e) }); else toolCall(ctx, x, yy, { ...e, alpha: ea(e), width });
    yy += lines(e) * LH + gap;
  }
  return yy;
}
