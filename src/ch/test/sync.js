// Sync markers for the engine test (read back by tools/synccheck.mjs):
//   BEAT square (x 1820..1860, y 96..136): white on exactly the first frame at/after every beat
//   WORD square (x 1760..1800): white on exactly the first frame at/after every verified keyword start
import { COLOR } from '../../theme.js';

export const SYNC = { beat: [1820, 96, 40, 40], word: [1760, 96, 40, 40] };

const onFrame = (ctx, time) => ctx.t >= time - 1e-9 && ctx.t < time + 1 / ctx.T.FPS - 1e-9;

export function syncMarkers(ctx) {
  const { T, t } = ctx;
  const k = Math.round(T.beatAt(t));
  const beatOn = onFrame(ctx, T.beatTime(k)) || onFrame(ctx, T.beatTime(k - 1));
  let wordOn = false;
  for (const l of T.lines) {
    if (Math.abs(l.start - t) > 3) continue;
    for (const w of l.words) if (w.verified && onFrame(ctx, w.start)) wordOn = true;
  }
  const [bx, by, bw, bh] = SYNC.beat, [wx, wy, ww, wh] = SYNC.word;
  ctx.rect(bx, by, bw, bh, beatOn ? { fill: [1, 1, 1] } : { fill: [0, 0, 0], stroke: COLOR.dim, width: 1 }); // opaque when off: scene must not show through
  ctx.rect(wx, wy, ww, wh, wordOn ? { fill: [1, 1, 1] } : { fill: [0, 0, 0], stroke: COLOR.dim, width: 1 });
  ctx.text('BEAT', bx + bw / 2, by + bh + 18, { font: 'mono', size: 12, align: 'center', color: COLOR.dim });
  ctx.text('WORD', wx + ww / 2, wy + wh + 18, { font: 'mono', size: 12, align: 'center', color: COLOR.dim });
}
