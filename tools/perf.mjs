// Per-frame timing of render / GPU / readback inside the render page: node tools/perf.mjs [WxH]
import { openRenderPage } from './lib/browser.mjs';
const [w, h] = (process.argv[2] ?? '1920x1080').split('x').map(Number);
const { page, close } = await openRenderPage({ set: 'test' });
const r = await page.evaluate(async (w, h) => {
  const e = window.__wem._engine;
  e.setSize(w, h);
  const gl = e.renderer.getContext();
  const out = [];
  for (const f of [2100, 2101, 2102, 2290, 2291, 2520, 2521]) {
    const t0 = performance.now();
    e.renderFrame(f, { toScreen: false });
    const t1 = performance.now();
    gl.finish();
    const t2 = performance.now();
    e.readPixels();
    const t3 = performance.now();
    out.push({ f, js: +(t1 - t0).toFixed(1), gpu: +(t2 - t1).toFixed(1), read: +(t3 - t2).toFixed(1) });
  }
  return out;
}, w, h);
console.table(r);
await close();
