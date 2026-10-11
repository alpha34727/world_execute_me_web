// 5-second photosensitivity warning card shown before the song (film time 0..5 s). ft = film time in seconds.
import { COLOR } from '../theme.js';
import { clamp, smoothstep, easeOutCubic } from './ease.js';
import { PREROLL } from '../sections.js';

const ZH_TITLE = '光敏性癲癇警告';
const EN_TITLE = 'PHOTOSENSITIVE SEIZURE WARNING';
const ZH_BODY = [
  '本影片含有快速剪接、閃爍的光線與高對比的圖形，',
  '可能誘發光敏性癲癇。觀看時若感到頭暈、視覺異常或不適，請立即停止觀看。',
];
const EN_BODY = [
  'This video contains rapid cuts, flashing lights and high-contrast patterns that may trigger',
  'seizures in people with photosensitive epilepsy. Stop watching immediately if you feel unwell.',
];

export function drawWarning(ctx, ft) {
  const fade = smoothstep(0, 0.45, ft) * (1 - smoothstep(PREROLL - 0.55, PREROLL - 0.05, ft));
  const a = (x) => clamp(x) * fade;
  const cx = 960;
  ctx.bg(COLOR.bg);
  ctx.post({ bloom: 0.35, grain: 0.035, ca: 0.002 });

  // frame brackets
  const ink = COLOR.dim;
  const L = 36, x0 = 240, x1 = 1680, y0 = 210, y1 = 870;
  const br = [[[x0, y0 + L], [x0, y0], [x0 + L, y0]], [[x1 - L, y0], [x1, y0], [x1, y0 + L]],
    [[x0, y1 - L], [x0, y1], [x0 + L, y1]], [[x1 - L, y1], [x1, y1], [x1, y1 - L]]];
  for (const b of br) ctx.line(b, { color: ink, width: 2, alpha: a(1) });

  // warning triangle
  const s = easeOutCubic(clamp(ft / 0.6));
  const ty = 330, tr = 54 * (0.85 + 0.15 * s);
  const tri = [-90, 30, 150].map((d) => [cx + tr * Math.cos((d * Math.PI) / 180), ty + tr * Math.sin((d * Math.PI) / 180)]);
  ctx.line(tri, { color: COLOR.warm, width: 5, closed: true, glow: 10, glowStrength: 0.35, alpha: a(1) });
  ctx.line([[cx, ty - tr * 0.45], [cx, ty + tr * 0.18]], { color: COLOR.warm, width: 7, alpha: a(1) });
  ctx.circle(cx, ty + tr * 0.38, 4.5, { fill: COLOR.warm, alpha: a(1) });

  ctx.text(ZH_TITLE, cx, 480, { font: 'zhBold', size: 58, align: 'center', color: COLOR.ink, alpha: a(1), tracking: 0.12 });
  ctx.text(EN_TITLE, cx, 536, { font: 'displayMed', size: 28, align: 'center', color: COLOR.warm, alpha: a(1), tracking: 0.18 });
  ZH_BODY.forEach((l, i) => ctx.text(l, cx, 620 + i * 42, { font: 'zh', size: 25, align: 'center', color: COLOR.ink, alpha: a(0.92) }));
  EN_BODY.forEach((l, i) => ctx.text(l, cx, 718 + i * 32, { font: 'mono', size: 18, align: 'center', color: [0.6, 0.66, 0.72], alpha: a(1) }));

  // countdown bar
  const p = clamp(ft / PREROLL);
  ctx.line([[x0, 820], [x1, 820]], { color: COLOR.dim, width: 1, alpha: a(0.5) });
  ctx.line([[x0, 820], [x0 + (x1 - x0) * p, 820]], { color: COLOR.me, width: 2, alpha: a(1), glow: 6 });
  ctx.text(`T-${(PREROLL - ft).toFixed(2)}s`, x1, 806, { font: 'mono', size: 16, align: 'right', color: COLOR.me, alpha: a(1) });
  ctx.text('// SYSTEM NOTICE', x0, 806, { font: 'mono', size: 16, color: COLOR.dim, alpha: a(1) });

  ctx.text('world.execute (me) ;   unofficial fan-made music video · music © Mili', cx, 930, { font: 'mono', size: 16, align: 'center', color: COLOR.dim, alpha: a(0.8) });
}
