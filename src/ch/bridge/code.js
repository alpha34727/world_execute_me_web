// Real source code on a wall in 3D (the lines come from tools/repo-facts.mjs: this repo's files, read at build time),
// syntax-coloured (lib/syntax.js, theme SYNTAX). Line i is anchored at origin − up·(i − top)·lh and laid out in screen
// space at that point's depth (size·ref/depth), its number in a gutter to the left; lines fade at the window's ends.
import { COLOR, SYNTAX } from '../../theme.js';
import { clamp, mix3 } from '../../lib/ease.js';
import { rand } from '../../lib/hash.js';
import { highlight } from '../../lib/syntax.js';

const GLITCH = '#%&@$*+=?/<>{}[]';
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
// the subtitle box (bottom left): code never runs behind it
export const SUBS = [0, 890, 980, 1080];

// One line of source at a world point p (laid out in screen space at p's depth): its number, its syntax colours.
// o: { size, ref, alpha, tone(c), corrupt, seed, mark: { color, k, a }, avoid } — returns false when not drawn
export function codeLine(ctx, text, n, p, o) {
  const { size = 20, ref = 8, alpha = 1, tone = (c) => c, corrupt = 0, seed = 1, mark = null, avoid = [SUBS], number = true } = o;
  const [sx, sy, w] = ctx.project(p);
  if (w <= 0.2 || alpha < 0.01) return false;
  const px = (size * ref) / w;
  const src = text.replace(/\t/g, '  ');
  const step = Math.floor(ctx.t * 12);
  // runs of one colour: the lexer's classes, with garbled characters split out in red
  const runs = [];
  let j = 0;
  for (const seg of highlight(src)) {
    for (const ch of seg.text) {
      const g = corrupt > 0 && ch !== ' ' && rand(n * 997 + j, step, seed) < corrupt;
      const c = g ? GLITCH[Math.floor(rand(n, j, step + seed) * GLITCH.length)] : ch;
      const kind = g ? 'glitch' : seg.kind === 'space' ? 'punct' : seg.kind;
      const last = runs.at(-1);
      if (last && last.kind === kind) last.text += c; else runs.push({ text: c, kind });
      j++;
    }
  }
  const o2 = { font: 'mono', size: px, baseline: 'middle' };
  const tw = ctx.measure(src, o2);
  const box = [sx - 2.6 * px, sy - px * 0.7, sx + tw, sy + px * 0.7];
  const hidden = avoid.some((r) => box[0] < r[2] && box[2] > r[0] && box[1] < r[3] && box[3] > r[1]);
  const a = alpha * (hidden ? 0.07 : 1);
  if (a < 0.01) return false;
  const cam = ctx.cam, cam3 = ctx.cam3;
  ctx.camera2D();
  if (mark?.k > 0) ctx.rect(sx - px * 0.4, sy - px * 0.72, tw + px * 0.8, px * 1.44, { fill: mark.color, alpha: a * (mark.a ?? 0.3) * mark.k, radius: 2 });
  if (number) ctx.text(String(n + 1), sx - px * 1.1, sy, { ...o2, size: px * 0.8, color: COLOR.faint, alpha: a * 0.8, align: 'right' });
  let x = sx;
  for (const r of runs) {
    if (r.text.trim()) ctx.text(r.text, x, sy, { ...o2, color: r.kind === 'glitch' ? COLOR.error : tone(SYNTAX[r.kind]), alpha: a });
    x += ctx.measure(r.text, o2);
  }
  ctx.cam = cam; ctx.cam3 = cam3;
  return true;
}

// lines: the file's lines · top: first line shown (0-based, fractional = scrolling) · count: lines shown
// mark: { line (1-based), color, k (0..1), a (bar opacity, 0.3) } a highlighted line (its bar lies behind the text)
// replace: { line, text } the line as me has rewritten it · corrupt: 0..1 share of characters garbled (red; a new
// garbling every 1/12 s) · redden / fade: 0..1 every colour pulled toward red (breakdown) / toward faint (background)
// fall(i) → [dx, dy, dz] per line (debris, or a line still dropping into place) · visible(i) → 0..1 per line
// avoid: screen boxes [x0, y0, x1, y1] (panels, subtitles): a line that would run behind one is dimmed to a trace
export function codeWall(ctx, lines, o) {
  const { origin, up = [0, 1, 0], lh = 0.36, top = 0, count = 30, size = 20, ref = 8, alpha = 1, mark = null, replace = null,
    corrupt = 0, seed = 1, fall = null, visible = null, redden = 0, fade = 0, avoid = [SUBS] } = o;
  const tone = (c) => mix3(mix3(c, COLOR.error, redden), COLOR.faint, fade);
  const i0 = Math.max(0, Math.floor(top)), i1 = Math.min(lines.length, Math.ceil(top + count));
  for (let i = i0; i < i1; i++) {
    const u = i - top, edge = clamp(Math.min(u + 1, top + count - i) / 3);
    const vis = visible ? visible(i) : 1;
    if (edge <= 0 || vis <= 0) continue;
    let p = add(origin, up, -u * lh);
    if (fall) p = add(p, fall(i));
    const rep = replace && replace.line === i + 1 ? replace : null;
    const marked = mark && mark.line === i + 1 ? { ...mark } : null;
    codeLine(ctx, rep ? rep.text : lines[i], i, p, { size, ref, alpha: alpha * edge * vis, tone, corrupt, seed, mark: marked, avoid });
  }
}
