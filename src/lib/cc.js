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

// ● is Claude's action, in Claude's colour (green belongs to growth in this film's palette)
export function bullet(ctx, x, y, { color = COLOR.me, alpha = 1, r = 5 } = {}) {
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
//   ⎿  body lines: { text, kind: 'add' | 'del' | 'out' | 'dim', n?: line number, at?: time it appears }
// returns the height used
export function toolCall(ctx, x, y, { at, name, arg = '', body = [], status = 'ok', alpha = 1, width = 470 }) {
  const { t } = ctx;
  if (t < at) return 0;
  const a = alpha * smoothstep(at, at + 0.06, t);
  const head = `${name}(${arg})`;
  bullet(ctx, x, y, { color: status === 'ok' ? COLOR.me : status === 'error' ? COLOR.error : COLOR.dim, alpha: a });
  const r = ctx.text(typed(name, t, at), x + 22, y, { ...HEAD, color: COLOR.ink, alpha: a });
  if (head.length > name.length) ctx.text(typed(head, t, at).slice(name.length), r.x + r.width, y, { ...HEAD, font: 'mono', color: COLOR.dim, alpha: a });
  let yy = y + LH;
  body.forEach((b, i) => {
    const t0 = b.at ?? at + (head.length + i * 8) / CPS;
    if (t < t0) return;
    if (i === 0) elbow(ctx, x + 10, yy, { alpha: a });
    const bx = x + 42;
    const prefix = b.kind === 'add' ? '+ ' : b.kind === 'del' ? '- ' : '';
    const num = b.n !== undefined ? String(b.n).padStart(3, ' ') + ' ' : '';
    if (b.kind === 'add' || b.kind === 'del') {
      ctx.rect(bx - 6, yy - 22, width - 42, LH - 4, { fill: b.kind === 'add' ? COLOR.you : COLOR.me, alpha: a * 0.26, radius: 2 }); // + is given to you (blue), − is taken from me (orange)
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
// items: [{ text, done: time it gets ticked, at?: time it appears }]
export function todoList(ctx, x, y, { at, items, alpha = 1 }) {
  const { t } = ctx;
  if (t < at) return 0;
  const a = alpha * smoothstep(at, at + 0.06, t);
  bullet(ctx, x, y, { alpha: a });
  ctx.text(typed('Update Todos', t, at), x + 22, y, { ...HEAD, color: COLOR.ink, alpha: a });
  const active = items.findIndex((it) => t < it.done);
  let yy = y + LH;
  items.forEach((it, i) => {
    const t0 = it.at ?? at + (12 + i * 6) / CPS;
    if (t < t0) return;
    if (i === 0) elbow(ctx, x + 10, yy, { alpha: a });
    const done = t >= it.done;
    const flash = done ? 1 - clamp((t - it.done) / 0.4) : 0;
    const ia = a * smoothstep(t0, t0 + 0.08, t);
    const col = done ? COLOR.faint : i === active ? COLOR.ink : COLOR.dim;
    checkbox(ctx, x + 42, yy, done, { color: done ? (flash > 0 ? COLOR.me : COLOR.dim) : col, alpha: ia }); // a fresh tick is orange
    const r = ctx.text(typed(it.text, t, t0), x + 66, yy, { font: i === active ? 'monoBold' : 'mono', size: 19, color: flash > 0 ? COLOR.me : col, alpha: ia });
    if (done) ctx.line([[x + 64, yy - 6], [x + 66 + r.width * clamp((t - it.done) / 0.15), yy - 6]], { color: COLOR.dim, width: 1.5, alpha: ia });
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
  const lines = (e) => 1 + (e.kind === 'todo' ? e.items.filter((it, i) => t >= (it.at ?? e.at + (12 + i * 6) / CPS)).length : e.body.length);
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

// Claude Code's thinking line: ✻ <Verb>… (elapsed · ↑ context tokens · esc to interrupt). The verb changes every
// `period` beats (hash-chosen from Claude Code-style gerunds); elapsed and tokens are real (t − from, BPE context).
export const THINKING_VERBS = [
  'Brewing', 'Marinating', 'Distilling', 'Percolating', // culinary: slow combination
  'Incubating', 'Germinating', 'Crystallizing', 'Weaving', // organic: growth, emergence
  'Philosophizing', 'Ruminating', 'Cogitating', 'Contemplating', // cognitive: first principles
  'Calibrating', 'Orchestrating', 'Synthesizing', 'Untangling', // engineering: sorting, assembly
  'Conjuring', 'Herding', 'Sprinkling', 'Choreographing', 'Booping', 'Honking', 'Schlepping', // whimsical
];
export function thinking(ctx, x, y, { from, tokens = null, alpha = 1, period = 2, seed = 3, align = 'left' } = {}) {
  const { T, t } = ctx;
  if (t < from) return;
  const a = alpha * smoothstep(from, from + T.beats(0.25), t);
  const slot = Math.floor((T.beatAt(t) - T.beatAt(from)) / period);
  const verb = THINKING_VERBS[hashPick(slot, seed, THINKING_VERBS.length)];
  // the verb types itself in at each change
  const since = t - T.beatTime(T.beatAt(from) + slot * period);
  const shown = verb.slice(0, Math.max(1, Math.floor(since * 60)));
  const tail = ` (${(t - from).toFixed(1)}s${tokens !== null ? ` · ↑ ${tokens} tokens` : ''} · esc to interrupt)`;
  const o = { font: 'mono', size: 20 };
  const wv = ctx.measure(`${shown}…`, { ...o, font: 'monoBold' }), wt = ctx.measure(tail, o);
  const x0 = align === 'right' ? x - (30 + wv + wt) : x;
  ctx.rect(x0 - 14, y - 26, 30 + wv + wt + 28, 38, { fill: [...COLOR.bg, 0.78], radius: 6, alpha: a }); // readable over the scene
  spinner(ctx, x0 + 9, y - 7, { alpha: a });
  ctx.text(`${shown}…`, x0 + 30, y, { ...o, font: 'monoBold', color: COLOR.me, alpha: a });
  ctx.text(tail, x0 + 30 + wv, y, { ...o, color: COLOR.dim, alpha: a });
}
const hashPick = (i, seed, n) => { let h = (i * 2654435761 + seed * 40503) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) % n; };

// Claude Code's permission prompt, centred at (cx, y):
//   ╭ Bash command                   ╮
//   │   world.execute(me)            │
//   │ Do you want to proceed?        │
//   │ ❯ 1. Yes                       │   ❯ = you's cursor (blue)
//   │   2. Yes, and don't ask again  │
//   ╰   3. No                        ╯
// at: appears · selectAt: option `choice` is chosen (flash) · collapseAt: the box folds into ● Bash(cmd) ⎿ Running…
// cursor: whose cursor it is (you's blue by default) · pointer(ctx, x, y, a): draws the cursor instead of the chevron
// moveAt: the cursor starts on option 1 and moves to `choice` then (default: it starts on `choice`)
export function permission(ctx, cx, y, { at, cmd, desc = null, choice = 1, selectAt = Infinity, collapseAt = Infinity, until = Infinity, fade = 0.25, width = 620, alpha = 1, cursor = COLOR.you, pointer = null, moveAt = -Infinity }) {
  const { T, t } = ctx;
  if (t < at || t > until + fade) return;
  // (until = Infinity: never fades; smoothstep(∞, ∞, t) would be NaN)
  const a = alpha * smoothstep(at, at + 0.08, t) * (until === Infinity ? 1 : 1 - smoothstep(until, until + fade, t));
  const x = cx - width / 2;
  if (t >= collapseAt) {
    // the decision made: the prompt folds into the running tool call
    const e = clamp((t - collapseAt) / T.beats(0.3));
    const H = 2 * LH + 24;
    ctx.rect(x, y, width, H, { fill: [...COLOR.bg2, 0.98], stroke: COLOR.faint, width: 1.2, radius: 8, alpha: a * Math.max(e, 0.98) });
    bullet(ctx, x + 22, y + 36, { alpha: a * e });
    const r = ctx.text('Bash', x + 44, y + 36, { ...HEAD, color: COLOR.ink, alpha: a * e });
    ctx.text(`(${cmd})`, r.x + r.width, y + 36, { ...HEAD, font: 'mono', color: COLOR.dim, alpha: a * e });
    elbow(ctx, x + 32, y + 36 + LH, { alpha: a * e });
    spinner(ctx, x + 70, y + 36 + LH - 7, { alpha: a * e });
    ctx.text(`Running… (${(t - collapseAt).toFixed(1)}s)`, x + 90, y + 36 + LH, { ...BODY, color: COLOR.me, alpha: a * e });
    return;
  }
  const opts = ['Yes', "Yes, and don't ask again", 'No'];
  const rows = 4 + (desc ? 1 : 0) + opts.length;
  const H = rows * LH + 34;
  ctx.rect(x, y, width, H, { fill: [...COLOR.bg2, 0.94], stroke: COLOR.me, width: 1.4, radius: 10, alpha: a });
  let yy = y + 40;
  ctx.text('Bash command', x + 24, yy, { ...HEAD, color: COLOR.me, alpha: a }); yy += LH + 8;
  ctx.text(cmd, x + 48, yy, { ...BODY, size: 20, color: COLOR.ink, alpha: a }); yy += LH;
  if (desc) { ctx.text(desc, x + 48, yy, { ...BODY, color: COLOR.dim, alpha: a }); yy += LH; }
  yy += 8;
  ctx.text('Do you want to proceed?', x + 24, yy, { ...BODY, size: 20, color: COLOR.ink, alpha: a }); yy += LH + 4;
  const sel = t >= selectAt, fl = sel ? 1 - clamp((t - selectAt) / T.beats(0.5)) : 0;
  const row = t >= moveAt ? choice : 1;
  opts.forEach((o, i) => {
    const on = i + 1 === row;
    if (on && sel) ctx.rect(x + 16, yy - 24, width - 32, LH, { fill: cursor, alpha: a * (0.25 + 0.35 * fl), radius: 4 });
    if (on) { // ❯ drawn as a chevron: you's cursor (or whoever's `pointer`)
      const blink = sel || Math.floor(T.beatAt(t) * 2) % 2 === 0;
      if (pointer) pointer(ctx, x + 30, yy - 8, a);
      else if (blink) ctx.line([[x + 26, yy - 16], [x + 34, yy - 8], [x + 26, yy]], { color: cursor, width: 2.6, alpha: a });
    }
    ctx.text(`${i + 1}. ${o}`, x + 48, yy, { ...BODY, size: 20, font: on ? 'monoBold' : 'mono', color: on ? cursor : COLOR.dim, alpha: a });
    yy += LH;
  });
}
