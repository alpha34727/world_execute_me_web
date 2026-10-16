// Lyrics console, bottom-left:   > English line typed token by token (each word appears at its sung start)
//                                // 中文翻譯 typed in proportion
// One line of faded history above. Drawn on the overlay layer (after post, so it stays crisp).
import { COLOR } from '../theme.js';
import { clamp, smoothstep } from './ease.js';

const X = 72, Y_EN = 992, Y_ZH = 1030, Y_HIST = 952;
const EN = { font: 'mono', size: 24 };
const ZH = { font: 'zh', size: 22 };
const HIST = { ...EN, size: 19 };
const CURSOR_W = 12;
const CHAR_DT = 1 / 60; // typing speed within a word: one character per frame

function visibleChars(line, t) {
  // number of characters of "word word word" visible at t
  let n = 0;
  for (let j = 0; j < line.words.length; j++) {
    const w = line.words[j];
    const sep = j ? 1 : 0;
    if (t < w.start) break;
    const typed = Math.min(w.text.length, Math.floor((t - w.start) / CHAR_DT) + 1);
    n += sep + typed;
    if (typed < w.text.length) break;
  }
  return n;
}

export function drawSubtitles(ctx, t, T, zh) {
  const lines = T.lines;
  let i = -1;
  // unsung lines (the title world.execute(me);) are shown by their chapter, not as subtitles
  for (let k = 0; k < lines.length; k++) { if (lines[k].words[0].start > t) break; if (lines[k].sung !== false) i = k; }
  if (i < 0) return;
  const line = lines[i];
  const next = lines[i + 1];
  const hold = Math.min(next ? next.words[0].start : Infinity, line.end + T.beats(3));
  const out = 1 - smoothstep(hold - 0.05, hold + 0.25, t);
  if (out <= 0) return;

  const text = line.words.map((w) => w.text).join(' ');
  const n = visibleChars(line, t);
  const zhText = zh?.lines?.[line.i]?.zh ?? null;
  let pi = i - 1;
  while (pi >= 0 && lines[pi].sung === false) pi--;
  const prev = pi >= 0 ? lines[pi] : null;
  const prevAge = prev ? t - prev.end : Infinity;
  const showHist = prev && prevAge < 6 && prev.end > line.start - T.bars(2);

  // plate
  // the plate fits every line it holds: current (+ cursor), translation, and the faded previous line
  const histText = showHist ? `> ${prev.words.map((x) => x.text).join(' ')}` : '';
  const wEn = ctx.measure(`> ${text}`, EN) + 4 + CURSOR_W;
  const wZh = zhText ? ctx.measure(`// ${zhText}`, ZH) : 0;
  const wHist = showHist ? ctx.measure(histText, HIST) : 0;
  const w = Math.max(wEn, wZh, wHist) + 44;
  const top = showHist ? Y_HIST - 32 : Y_EN - 36;
  // the plate is Claude Code's prompt box: rounded, hairline border; nearly opaque, so 3D content (lines, bokeh)
  // never runs through the text
  ctx.rect(X - 20, top, w, 1080 - 26 - top, { fill: [0, 0, 0, 0.86], stroke: COLOR.faint, width: 1.2, alpha: out, radius: 10 });

  if (showHist) {
    const pa = clamp(1 - prevAge / 6) * 0.45 * out;
    ctx.text(histText, X, Y_HIST, { ...HIST, color: COLOR.dim, alpha: pa });
  }
  ctx.text('>', X, Y_EN, { ...EN, color: COLOR.me, alpha: out });
  const body = text.slice(0, n);
  const r = ctx.text(body, X + ctx.measure('> ', EN), Y_EN, { ...EN, color: COLOR.ink, alpha: out });
  // block cursor, blinking on half beats while the line is typing / holding
  const typing = n < text.length;
  const blink = typing || Math.floor(T.beatAt(t) * 2) % 2 === 0;
  if (blink) ctx.rect(r.x + r.width + 4, Y_EN - 20, CURSOR_W, 24, { fill: COLOR.me, alpha: 0.85 * out });
  if (zhText) {
    const chars = [...zhText];
    const k = Math.ceil(chars.length * (n / text.length));
    ctx.text(`// ${chars.slice(0, k).join('')}`, X, Y_ZH, { ...ZH, color: COLOR.dim, alpha: out });
  }
}

// A note in the console when nothing is sung (instrumentals): same plate and two lines as the subtitles, typed in.
//   > english
//   // 中文
export function drawNote(ctx, en, zh, { from, to, alpha = 1 } = {}) {
  const { t } = ctx;
  if (t < from || t > to + 0.3) return;
  const a = alpha * smoothstep(from, from + 0.15, t) * (1 - smoothstep(to, to + 0.3, t));
  const n = Math.floor((t - from) * 60 * 1.5);
  const w = Math.max(ctx.measure(`> ${en}`, EN), ctx.measure(`// ${zh}`, ZH)) + 44;
  ctx.rect(X - 20, Y_EN - 36, w, 1080 - 26 - (Y_EN - 36), { fill: [0, 0, 0, 0.86], stroke: COLOR.faint, width: 1.2, alpha: a, radius: 10 });
  ctx.text('>', X, Y_EN, { ...EN, color: COLOR.me, alpha: a });
  ctx.text(en.slice(0, n), X + ctx.measure('> ', EN), Y_EN, { ...EN, color: COLOR.ink2, alpha: a });
  const chars = [...zh];
  ctx.text(`// ${chars.slice(0, Math.ceil((chars.length * Math.min(n, en.length)) / en.length)).join('')}`, X, Y_ZH, { ...ZH, color: COLOR.dim, alpha: a });
}
