// node tools/frames.mjs [--set film|test] [--res 1080|2160|WxH] [--out renders/check] <frame | t=seconds | b=beat> ...
// Full-resolution PNGs of single film frames -> <out>/f<frame>.png (for close inspection of a frame).
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs, fail } from './lib/cli.mjs';
import { openRenderPage, parseRes } from './lib/browser.mjs';
import { loadT } from '../test/helpers.js';

const { pos, opt } = parseArgs(process.argv.slice(2));
if (!pos.length) fail('usage: node tools/frames.mjs [--set test] [--res 1080] <frame | t=sec | b=beat> ...');
const T = loadT();
const frames = pos.map((a) => (a.startsWith('t=') ? T.frameOf(+a.slice(2)) : a.startsWith('b=') ? T.frameOf(T.beatTime(+a.slice(2))) : +a));
const [w, h] = parseRes(opt.res);
const out = opt.out ?? 'renders/check';
mkdirSync(out, { recursive: true });
const { page, close } = await openRenderPage({ set: opt.set ?? 'film' });
try {
  await page.evaluate((w, h) => window.__wem.setSize(w, h), w, h);
  for (const f of frames) {
    const url = await page.evaluate((f) => window.__wem.png(f), f);
    const file = `${out}/f${f}.png`;
    writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log(file, `t=${T.timeOfFrame(f).toFixed(3)}`);
  }
} finally { await close(); }
