// Still-frame regression: one frame (the middle) of every shot, plus the warning card, rendered headless on the GPU
// at 480x270 and compared with test/baseline/*.png. A missing baseline is created (and reported). Shots listed in
// test/regression.exempt (one "chapter/shot" per line, # comments) are re-baselined instead of compared.
// UPDATE_BASELINE=1 npm test  rewrites every baseline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
import { openRenderPage } from '../tools/lib/browser.mjs';

const W = 480, H = 270;
const MEAN_TOL = 1.5; // mean |Δ| per channel (0..255)
const PIX_TOL = 0.002; // fraction of pixels allowed to differ by > 48
const exempt = new Set(existsSync('test/regression.exempt')
  ? readFileSync('test/regression.exempt', 'utf8').split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean) : []);
const update = !!process.env.UPDATE_BASELINE;
const hasFilm = readdirSync('src/ch').some((f) => /^\d\d_/.test(f) && !f.startsWith('99_'));

function diff(a, b) {
  if (a.width !== b.width || a.height !== b.height) return { mean: Infinity, frac: 1 };
  let sum = 0, big = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    let m = 0;
    for (let c = 0; c < 3; c++) { const d = Math.abs(a.data[i + c] - b.data[i + c]); sum += d; m = Math.max(m, d); }
    if (m > 48) big++;
  }
  const n = a.width * a.height;
  return { mean: sum / (n * 3), frac: big / n };
}

test('still-frame regression (mid frame of every shot + warning card)', { timeout: 600000 }, async (t) => {
  const { page, info, close } = await openRenderPage({ set: hasFilm ? 'film' : 'test' });
  try {
    await page.evaluate((w, h) => window.__wem.setSize(w, h), W, H);
    const cases = [{ key: 'warning/card', f: 150 }, ...info.shots.map((s) => ({ key: s.key, f: Math.round((s.firstFrame + s.lastFrame) / 2) }))];
    const failures = [], created = [];
    for (const c of cases) {
      const url = await page.evaluate((f) => window.__wem.png(f), c.f);
      const buf = Buffer.from(url.split(',')[1], 'base64');
      const file = `test/baseline/${c.key.replace('/', '__')}.png`;
      if (update || exempt.has(c.key) || !existsSync(file)) {
        writeFileSync(file, buf);
        created.push(c.key);
        continue;
      }
      const d = diff(PNG.sync.read(buf), PNG.sync.read(readFileSync(file)));
      if (d.mean > MEAN_TOL || d.frac > PIX_TOL) failures.push(`${c.key} (f${c.f}): mean Δ ${d.mean.toFixed(2)}, ${(d.frac * 100).toFixed(2)}% pixels changed`);
    }
    if (created.length) t.diagnostic(`baseline written: ${created.join(', ')}`);
    assert.deepEqual(failures, [], `regressions:\n${failures.join('\n')}\n(intended? add to test/regression.exempt or run UPDATE_BASELINE=1)`);
  } finally {
    await close();
  }
});
