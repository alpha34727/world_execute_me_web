// Browser-side loading of analysis results, translation and chapter modules.
import { makeTiming } from './timing.js';
import { makeFeatures } from './features.js';

const base = import.meta.env?.BASE_URL ?? '/';

async function json(path) {
  const r = await fetch(base + path);
  if (!r.ok) throw new Error(`load ${path}: ${r.status}`);
  return r.json();
}

export async function loadData() {
  const [timing, onsets, fmeta, zh] = await Promise.all([
    json('analysis/out/timing.json'),
    json('analysis/out/onsets.json'),
    json('analysis/out/features.json'),
    json('data/zh.json').catch(() => null),
  ]);
  const fbuf = await (await fetch(base + 'analysis/out/' + fmeta.file)).arrayBuffer();
  return { T: makeTiming(timing, onsets), F: makeFeatures(fbuf, fmeta), zh };
}

// 'film' = src/ch/00..15, 'test' = src/ch/99_*
const modules = import.meta.glob('../ch/[0-9][0-9]_*.js');
export async function loadChapters(set = 'film') {
  const paths = Object.keys(modules).sort().filter((p) => (set === 'test' ? /\/99_/.test(p) : !/\/99_/.test(p)));
  const defs = [];
  for (const p of paths) defs.push((await modules[p]()).default);
  return defs;
}
export const hasFilmChapters = () => Object.keys(modules).some((p) => !/\/99_/.test(p));
