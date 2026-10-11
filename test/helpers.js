// Node-side loaders shared by tests (the browser uses src/engine/assets.js).
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { makeTiming } from '../src/engine/timing.js';

export function loadT() {
  const timing = JSON.parse(readFileSync('analysis/out/timing.json', 'utf8'));
  const onsets = JSON.parse(readFileSync('analysis/out/onsets.json', 'utf8'));
  return makeTiming(timing, onsets);
}

// 'film' = src/ch/00..15, 'test' = src/ch/99_*
export async function loadChapterSet(set) {
  const files = readdirSync('src/ch').filter((f) => /^\d\d_[a-z0-9]+\.js$/.test(f)).sort()
    .filter((f) => (set === 'test' ? f.startsWith('99_') : !f.startsWith('99_')));
  const defs = [];
  for (const f of files) defs.push((await import(pathToFileURL(`src/ch/${f}`).href)).default);
  return defs;
}

// span a chapter set must cover: film = whole song, test = its own declared range
export function spanOf(set, T, defs) {
  if (set === 'film') return { start: 0, end: T.songEnd };
  const fr = (v) => (typeof v === 'function' ? v(T) : T.section(v).start);
  const to = (v) => (typeof v === 'function' ? v(T) : T.section(v).end);
  return { start: Math.min(...defs.map((d) => fr(d.from))), end: Math.max(...defs.map((d) => to(d.to))) };
}
