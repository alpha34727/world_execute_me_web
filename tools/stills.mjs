// npm run stills -- <chapter> [--w 640] [--h 360]
// Contact sheet: one row per shot, cells = first / middle / last frame of the shot -> renders/stills/<chapter>.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs, requireChapter, fail } from './lib/cli.mjs';
import { openRenderPage } from './lib/browser.mjs';
import { loadT } from '../test/helpers.js';

const { pos, opt } = parseArgs(process.argv.slice(2));
const id = requireChapter('stills', pos[0]);
const w = +(opt.w ?? 640), h = +(opt.h ?? 360);
const T = loadT();
const t0 = Date.now();
const { page, info, close } = await openRenderPage({ set: id === 'test' || id === 'warning' ? 'test' : 'film' });
try {
  if (id === 'warning') {
    const cells = [0, 30, 150, 270, 296].map((f) => ({ f, label: `f${f}  ft=${(f / 60).toFixed(2)}` }));
    const url = await page.evaluate((rows, o) => window.__wem.sheet(rows, o), [{ label: 'warning', sub: ['film 0–5 s'], cells: cells.slice(0, 3) }, { label: '', sub: [], cells: cells.slice(3) }], { w, h, title: 'photosensitivity warning card (preroll)' });
    mkdirSync('renders/stills', { recursive: true });
    writeFileSync('renders/stills/warning.png', Buffer.from(url.split(',')[1], 'base64'));
    console.log('renders/stills/warning.png');
    process.exit(0);
  }
  const ch = info.chapters.find((c) => c.id === id);
  if (!ch) fail(`chapter "${id}" has no shots yet`);
  const shots = info.shots.filter((s) => s.chapter === id);
  const bb = (t) => { const b = T.beatAt(t); const bar = Math.floor(b / 4); return `${bar}.${(b - bar * 4 + 1).toFixed(2)}`; };
  const rows = shots.map((s) => {
    const mid = Math.round((s.firstFrame + s.lastFrame) / 2);
    const cell = (f, tag) => ({ f, label: `${tag} f${f}  t=${T.timeOfFrame(f).toFixed(3)}` });
    return {
      label: s.id,
      sub: [`at  ${s.start.toFixed(3)} s`, `bar ${bb(s.start)}`, `len ${(s.end - s.start).toFixed(2)} s  ${s.lastFrame - s.firstFrame + 1} fr`, `in  ${s.transition}`],
      cells: [cell(s.firstFrame, 'start'), cell(mid, 'mid'), cell(s.lastFrame, 'end')],
    };
  });
  const title = `${id} · ${shots.length} shots · ${ch.from.toFixed(3)}–${ch.to.toFixed(3)} s · ${info.renderer.replace(/^ANGLE \(|\)$/g, '')}`;
  const url = await page.evaluate((rows, o) => window.__wem.sheet(rows, o), rows, { w, h, title });
  mkdirSync('renders/stills', { recursive: true });
  const out = `renders/stills/${id}.png`;
  writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`${out}  (${shots.length} shots, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
} finally {
  await close();
}
