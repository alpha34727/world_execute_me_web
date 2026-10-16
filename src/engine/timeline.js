// Chapters and shots.
//   src/ch/NN_<section>.js:  export default chapter({ id, from?, to?, overlay?(ctx, t), shots: [{ id, at: T => s, draw(ctx, t), transitionIn? }] })
//   shot extras: hud?: 'title' | (T, t) => 'title' (Claude's HUD on the overlay; titles cross-dissolve in transitions;
//                the scene is darkened behind the HUD text — post.hudGuard), subs?: false
// overlay (optional) draws on the overlay layer for the whole chapter — unaffected by transitions and post.
// from/to default to the section's boundaries; they may be a section id or T => seconds.
// A shot lasts until the next shot's `at` (across chapters). buildTimeline() validates everything up front.
import { resolveTransition } from './transitions.js';

const registry = [];
export function chapter(def) {
  if (!def || !def.id || !Array.isArray(def.shots)) throw new Error('chapter({ id, shots }) required');
  registry.push(def);
  return def;
}
export const registeredChapters = () => registry.slice();

const EPS = 1e-6;

function bound(v, T, id, which) {
  if (v === undefined) {
    if (which === 'from') return T.section(id).start;
    return T.section(id).end;
  }
  if (typeof v === 'function') return v(T);
  if (typeof v === 'string') return which === 'from' ? T.section(v).start : T.section(v).end;
  if (typeof v === 'number') throw new Error(`chapter ${id}: ${which} must come from T (no bare seconds)`);
  throw new Error(`chapter ${id}: bad ${which}`);
}

// The span a chapter set must cover exactly.
//   film: 0 .. end of the last chapter present. During production (phase 4) chapters are added in order, so the film
//         is a growing prefix of the song; test/timeline.test.js requires the full song once all 16 exist.
//   test: the chapters' own declared range.
export function spanOf(set, T, defs) {
  const v = (x, w) => (typeof x === 'function' ? x(T) : T.section(x)[w]);
  if (set === 'film') return { start: 0, end: Math.max(...defs.map((d) => v(d.to ?? d.id, 'end'))) };
  return { start: Math.min(...defs.map((d) => v(d.from ?? d.id, 'start'))), end: Math.max(...defs.map((d) => v(d.to ?? d.id, 'end'))) };
}

// opts.start / opts.end: the span the chapters must cover exactly (see spanOf)
export function buildTimeline(T, chapters, opts = {}) {
  const errors = [];
  const err = (m) => errors.push(m);
  const chs = chapters.map((def) => {
    let from = NaN, to = NaN;
    try { from = bound(def.from, T, def.id, 'from'); to = bound(def.to, T, def.id, 'to'); } catch (e) { err(e.message); }
    return { def, id: def.id, from, to };
  }).sort((a, b) => a.from - b.from);

  const shots = [];
  const ids = new Set();
  for (const ch of chs) {
    if (!(ch.to > ch.from)) err(`chapter ${ch.id}: empty or inverted range ${ch.from}..${ch.to}`);
    if (!ch.def.shots.length) err(`chapter ${ch.id}: no shots`);
    let prev = -Infinity;
    for (const s of ch.def.shots) {
      const key = `${ch.id}/${s.id}`;
      if (!s.id) err(`chapter ${ch.id}: shot without id`);
      if (ids.has(key)) err(`duplicate shot id ${key}`);
      ids.add(key);
      if (typeof s.at !== 'function') { err(`${key}: at must be T => seconds`); continue; }
      if (typeof s.draw !== 'function') err(`${key}: draw(ctx, t) missing`);
      let at;
      try { at = s.at(T); } catch (e) { err(`${key}: ${e.message}`); continue; }
      if (!Number.isFinite(at)) { err(`${key}: at(T) is not a number`); continue; }
      if (at <= prev + EPS) err(`${key}: starts at ${at.toFixed(4)}, not after the previous shot (${prev.toFixed(4)}) — overlap`);
      if (at < ch.from - EPS || at >= ch.to - EPS) err(`${key}: at ${at.toFixed(4)} outside chapter ${ch.from.toFixed(4)}..${ch.to.toFixed(4)}`);
      prev = at;
      let tr;
      try { tr = resolveTransition(s.transitionIn, T); } catch (e) { err(`${key}: ${e.message}`); tr = resolveTransition(null, T); }
      shots.push({ shot: s, id: s.id, key, chapter: ch.id, start: at, end: NaN, transition: tr, index: shots.length });
    }
    const first = ch.def.shots.length && shots.find((x) => x.chapter === ch.id);
    if (first && Math.abs(first.start - ch.from) > EPS) err(`chapter ${ch.id}: first shot starts at ${first.start.toFixed(4)}, chapter at ${ch.from.toFixed(4)}`);
  }
  for (let i = 1; i < chs.length; i++) {
    if (Math.abs(chs[i].from - chs[i - 1].to) > EPS) err(`chapters ${chs[i - 1].id} -> ${chs[i].id} not contiguous (${chs[i - 1].to.toFixed(4)} vs ${chs[i].from.toFixed(4)})`);
  }
  const start = opts.start ?? 0;
  const end = opts.end ?? T.songEnd;
  if (chs.length) {
    if (Math.abs(chs[0].from - start) > EPS) err(`timeline starts at ${chs[0].from.toFixed(4)}, expected ${start.toFixed(4)}`);
    if (Math.abs(chs.at(-1).to - end) > EPS) err(`timeline ends at ${chs.at(-1).to.toFixed(4)}, expected ${end.toFixed(4)}`);
  } else err('no chapters');

  for (let i = 0; i < shots.length; i++) {
    shots[i].end = i + 1 < shots.length ? shots[i + 1].start : chs.at(-1)?.to;
  }
  // transition windows: [start - align*dur, start + (1-align)*dur], inside both neighbours, no overlap
  let lastWinEnd = -Infinity;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    const tr = s.transition;
    s.winStart = s.start - tr.align * tr.dur;
    s.winEnd = s.start + (1 - tr.align) * tr.dur;
    if (tr.dur > 0) {
      if (i === 0) err(`${s.key}: first shot cannot have a transition`);
      else {
        if (s.winStart < shots[i - 1].start + EPS) err(`${s.key}: ${tr.type} window starts before the previous shot begins`);
        if (s.winStart < lastWinEnd - EPS) err(`${s.key}: ${tr.type} window overlaps the previous transition`);
        if (s.winEnd > s.end + EPS) err(`${s.key}: ${tr.type} window longer than the shot`);
      }
      lastWinEnd = s.winEnd;
    }
  }
  if (errors.length) {
    const e = new Error(`timeline invalid:\n  ${errors.join('\n  ')}`);
    e.errors = errors;
    throw e;
  }

  const findIndex = (t) => {
    let lo = 0, hi = shots.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (shots[m].start <= t) lo = m; else hi = m - 1; }
    return lo;
  };

  return {
    T,
    start,
    end,
    chapters: chs.map(({ id, from, to, def }) => ({ id, from, to, overlay: def.overlay ?? null, shots: shots.filter((s) => s.chapter === id) })),
    shots,
    // which shot(s) to draw at t: { a, b|null, p (transition progress), transition|null }
    at(t) {
      const i = findIndex(t);
      const cur = shots[i];
      const next = shots[i + 1];
      if (next && next.transition.dur > 0 && t >= next.winStart) {
        return { a: cur, b: next, p: (t - next.winStart) / (next.winEnd - next.winStart), transition: next.transition };
      }
      if (cur.transition.dur > 0 && t < cur.winEnd && i > 0 && t >= cur.winStart) {
        return { a: shots[i - 1], b: cur, p: (t - cur.winStart) / (cur.winEnd - cur.winStart), transition: cur.transition };
      }
      return { a: cur, b: null, p: 0, transition: null };
    },
    shotAt(t) { return shots[findIndex(t)]; },
  };
}
