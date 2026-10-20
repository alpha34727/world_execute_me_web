// Web player + headless render API (same engine, same frames).
//   /?t=32.5        start at song time 32.5 s (negative = inside the warning card)
//   /?res=720&fps=30  render resolution (auto | 540…2160) and fps cap while playing (60 | 30 | 24 | 15)
//   /?ch=test       chapter set (film | test); default film if any film chapter exists
//   /?render=1      no UI / audio; exposes window.__wem for tools/render.mjs, stills.mjs, tests
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/noto-sans-tc/400.css';
import '@fontsource/noto-sans-tc/700.css';
import '@fontsource/newsreader/500.css';
import { loadData, loadChapters, hasFilmChapters } from '../engine/assets.js';
import { buildTimeline, spanOf } from '../engine/timeline.js';
import { Engine } from '../engine/renderer.js';
import { FPS, PREROLL, TOTAL_FRAMES } from '../sections.js';
import { FONT } from '../theme.js';
import { installRenderApi } from './render-api.js';
import { installUi } from './ui.js';

const params = new URLSearchParams(location.search);
const status = document.getElementById('status');
const canvas = document.getElementById('stage');

async function boot() {
  const set = params.get('ch') ?? (hasFilmChapters() ? 'film' : 'test');
  const { T, F, zh } = await loadData();
  const defs = await loadChapters(set);
  const span = spanOf(set, T, defs);
  const timeline = buildTimeline(T, defs, span);
  // load every face's Latin slice up front (CJK slices load lazily per glyph)
  const latin = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join(''); // printable ASCII
  await Promise.all(Object.values(FONT).map((f) => document.fonts.load(`${f.weight} ${f.base}px "${f.family}"`, latin)));
  await document.fonts.ready;
  const engine = new Engine({ canvas, T, F, timeline, zh });
  const frames = {
    first: set === 'film' ? 0 : T.frameOf(span.start),
    end: set === 'film' && span.end >= T.songEnd ? TOTAL_FRAMES : T.frameOf(span.end),
  };
  const ctx = { set, T, F, zh, timeline, engine, span, frames, FPS, PREROLL };
  if (params.has('render')) installRenderApi(ctx);
  else installUi(ctx, params);
}

boot().catch((e) => {
  console.error(e);
  status.textContent = `error: ${e.message}`;
  status.style.whiteSpace = 'pre-wrap';
  window.__wem = { error: e.message };
});
