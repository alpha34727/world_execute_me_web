// Claude's context window over the song: the BPE tokens of every word sung so far (lib/bpe.js). The bridge's
// /compact ("If I can erase all the pointless") really compacts it: from "erase" to FRAGMENTS, every token of the
// words sung before "erase" that is not part of an uppercase keyword is dropped, oldest first, one after another; the
// keywords' tokens are kept. Words sung after that are added as before. aiHud's `context N / 617 tok` reads this.
import { sequence } from './corpus.js';
import { bpe } from './bpe.js';

// the film's uppercase keywords (PROTECTION … LO-O-OVE); AC / DC / AM / PM / A.D / B.C are lyrics, not keywords
export const isKeyword = (text) => /^[A-Z][A-Z-]{3,}$/.test(text);

const cache = new WeakMap();
// { t0, t1: the compaction window, tokens: [{ piece, id, word (index in the sung sequence), keyword, drop (time it is
// dropped, Infinity if kept) }] for the words sung before t0, kept, dropped }
export function compaction(T) {
  if (cache.has(T)) return cache.get(T);
  const B = bpe(T), seq = sequence(T);
  const t0 = T.findWord('erase', 0, 'bridge').start, t1 = T.findWord('FRAGMENTS', 0, 'bridge').start;
  const tokens = [];
  for (const w of seq) {
    if (w.start >= t0) break;
    for (const p of B.encode(w.text)) tokens.push({ ...p, word: w.n, keyword: isKeyword(w.text), drop: Infinity });
  }
  const gone = tokens.filter((k) => !k.keyword);
  gone.forEach((k, i) => { k.drop = t0 + ((i + 1) / gone.length) * (t1 - t0); });
  const c = { t0, t1, tokens, kept: tokens.length - gone.length, dropped: gone.length };
  cache.set(T, c);
  return c;
}

// tokens in the context at t
export function contextAt(T, t) {
  const n = bpe(T).tokensAt(t);
  const c = compaction(T);
  if (t < c.t0) return n;
  let d = 0;
  for (const k of c.tokens) if (k.drop <= t) d++;
  return n - d;
}
